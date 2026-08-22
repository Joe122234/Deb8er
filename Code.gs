const ADMIN_TOKEN = "d8r_7xK9mP2qR4vW8zL1nB5";
const FIREBASE_API_KEY = "AIzaSyDGEGLVwVQfi8YgG0oZthSTr7YNbfW5wwo";

/**
 * requireAdminToken — checks TWO methods:
 * 1. Legacy static adminToken (still supported for backward compatibility)
 * 2. Firebase ID token (firebaseToken) verified against admin UIDs in ScriptProperties
 */
function requireAdminToken(e) {
  // Legacy token
  const token = e && e.parameter && e.parameter.adminToken;
  if (token && token === ADMIN_TOKEN) return true;

  // Firebase ID token
  const firebaseToken = e && e.parameter && e.parameter.firebaseToken;
  if (firebaseToken) return verifyFirebaseAdmin(firebaseToken);

  return false;
}

function verifyFirebaseAdmin(idToken) {
  try {
    const url = "https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=" + FIREBASE_API_KEY;
    const options = {
      method: "post",
      contentType: "application/json",
      payload: JSON.stringify({ idToken: idToken }),
      muteHttpExceptions: true
    };
    const response = UrlFetchApp.fetch(url, options);
    if (response.getResponseCode() !== 200) return false;
    const data = JSON.parse(response.getContentText());
    if (!data.users || !data.users[0]) return false;
    const uid = data.users[0].localId;

    // Check admin UIDs stored in script properties
    var adminUidsJson = PropertiesService.getScriptProperties().getProperty("ADMIN_UIDS");
    if (!adminUidsJson) return false;
    var adminUids = JSON.parse(adminUidsJson);
    return adminUids.indexOf(uid) !== -1;
  } catch (e) {
    console.error("Firebase admin verification failed: " + e);
    return false;
  }
}

/**
 * Run this from the Apps Script editor once to grant admin access:
 *   grantAdminAccess("USER_FIREBASE_UID");
 * Get the UID from: auth.currentUser.uid in the browser console.
 */
function grantAdminAccess(uid) {
  var list = JSON.parse(PropertiesService.getScriptProperties().getProperty("ADMIN_UIDS") || "[]");
  if (list.indexOf(uid) === -1) {
    list.push(uid);
    PropertiesService.getScriptProperties().setProperty("ADMIN_UIDS", JSON.stringify(list));
  }
}

function revokeAdminAccess(uid) {
  var list = JSON.parse(PropertiesService.getScriptProperties().getProperty("ADMIN_UIDS") || "[]");
  var filtered = list.filter(function(u) { return u !== uid; });
  PropertiesService.getScriptProperties().setProperty("ADMIN_UIDS", JSON.stringify(filtered));
}

function doPost(e) {
  if (e.parameter.action === "addAward") return handleAddAward(e);
  if (e.parameter.action === "updateConference") return handleUpdateConference(e);
  if (e.parameter.action === "deleteSheetRow") return handleDeleteSheetRow(e);
  if (e.parameter.action === "deleteUserRows") return handleDeleteUserRows(e);
  if (e.parameter.action === "lookupCertificate") return handleVerification(e);
  if (e.parameter.action === "sendOtp") return handleSendOtp(e);
  if (e.parameter.action === "getCertIds") return handleGetCertIds(e);
  return handleFormSubmission(e);
}

/**
 * doGet handles:
 * - checkEmail — duplicate check (used by join-conference form)
 * - getProfile — fallback award lookup for dashboard
 * - addAward  — admin page writes award to sheet for AutoCrat
 * - certificateId param — certificate verification
 */
function doGet(e) {
  const action = e.parameter.action;

  if (action === "checkEmail") return handleCheckEmail(e);
  if (action === "getProfile") return handleGetProfile(e);
  if (action === "addAward") return handleAddAward(e);
  if (action === "checkHeaders") return handleCheckHeaders(e);
  if (action === "getCertIds")   return handleGetCertIds(e);
  if (action === "downloadCertificate") return handleDownloadCertificate(e);

  return handleVerification(e);
}

// ====================== CHECK EMAIL ======================
function handleCheckEmail(e) {
  const emailToCheck = (e.parameter.email || "").trim().toLowerCase();
  if (!emailToCheck) return jsonResponse({ exists: false, error: "No email provided" });

  // Optional conferenceId: when supplied, only flag as duplicate if the SAME
  // email already registered for THIS session. Without it, fall back to the
  // legacy all-time check (backward compatible for existing callers).
  const conferenceId = (e.parameter.conferenceId || "").trim().toLowerCase();
  const sessionScoped = conferenceId.length > 0;

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheets = ["Sheet1", "Sheet2"];
  let isDuplicate = false;

  for (const name of sheets) {
    const sheet = ss.getSheetByName(name);
    if (!sheet) continue;

    const data = sheet.getDataRange().getValues();
    const headers = data[0].map(h => h.toString().toLowerCase().trim());
    const emailCol = headers.indexOf("email");
    if (emailCol === -1) continue;

    // Only needed when scoping to a session
    const confCol = sessionScoped ? headers.indexOf("conference id") : -1;
    if (sessionScoped && confCol === -1) continue; // sheet has no session column — skip

    for (let i = 1; i < data.length; i++) {
      const rowEmail = data[i][emailCol] ? data[i][emailCol].toString().trim().toLowerCase() : "";
      if (rowEmail !== emailToCheck) continue;
      if (sessionScoped) {
        const rowConf = data[i][confCol] ? data[i][confCol].toString().trim().toLowerCase() : "";
        if (rowConf !== conferenceId) continue; // different session — not a duplicate
      }
      isDuplicate = true;
      break;
    }
    if (isDuplicate) break;
  }

  return jsonResponse({
    exists: isDuplicate,
    message: isDuplicate
      ? "Records indicate you've already joined the ranks! No need to sign up again—we've already got your back."
      : "Email available"
  });
}

// ====================== PROFILE LOOKUP (fallback, dashboard award sync) ======================
function handleGetProfile(e) {
  const emailToFind = (e.parameter.email || "").trim().toLowerCase();
  if (!emailToFind) return jsonResponse({ success: false, error: "No email provided" });

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheets = [
    { name: "Sheet1", type: "MUN" },
    { name: "Sheet2", type: "Debate" }
  ];

  const awards = [];
  const conferences = [];

  for (const s of sheets) {
    const sheet = ss.getSheetByName(s.name);
    if (!sheet) continue;

    const data = sheet.getDataRange().getValues();
    const lowerHeaders = data[0].map(h => h.toString().toLowerCase().trim());

    const emailCol = lowerHeaders.indexOf("email");
    const awardCol = lowerHeaders.indexOf("award");
    const certCol  = lowerHeaders.indexOf("certificate id");
    const confCol  = lowerHeaders.indexOf("conference id");
    const eventDateCol = lowerHeaders.indexOf("event date");
    const committeeCol = lowerHeaders.indexOf("committee");
    const regionCol    = lowerHeaders.indexOf("region");
    const portfolioCol = lowerHeaders.indexOf("portfolio");

    // Find merge URL column for certificate link
    const mergeUrlCol = lowerHeaders.findIndex(h =>
      h.includes("merged doc url") || h.includes("merge url")
    );
    const mergeLinkCol = lowerHeaders.findIndex(h =>
      h.includes("link to merged doc") || h === "link"
    );
    const mergeDocUrlCol = mergeUrlCol !== -1 ? mergeUrlCol : mergeLinkCol;

    if (emailCol === -1) continue;

    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      const rowEmail = row[emailCol] ? row[emailCol].toString().trim().toLowerCase() : "";
      if (rowEmail !== emailToFind) continue;

      const award  = awardCol !== -1 ? (row[awardCol] || "").toString().trim() : "";
      const certId = certCol  !== -1 ? (row[certCol]  || "").toString().trim() : "";

      if (award) {
        const awardObj = {
          title: award,
          conference: s.type === "MUN" ? "MUN Conference" : "Debate Conference",
          certificateId: certId
        };
        // Include certificate download URL from sheet if available
        if (mergeDocUrlCol !== -1 && certId) {
          const rawLink = (row[mergeDocUrlCol] || "").toString().trim();
          if (rawLink && (rawLink.includes("http") || rawLink.length > 15)) {
            const fileId = rawLink.match(/[-\w]{25,}/);
            awardObj.certificateUrl = fileId
              ? `https://drive.google.com/uc?export=download&id=${fileId[0]}&confirm=t`
              : rawLink;
          }
        }
        console.log(`[getProfile] Award for ${rowEmail}: certId=${certId}, mergeDocUrlCol=${mergeDocUrlCol}, rawLink=${mergeDocUrlCol !== -1 ? (row[mergeDocUrlCol] || "").toString().trim() : "N/A"}, certificateUrl=${awardObj.certificateUrl || "N/A"}`);
        awards.push(awardObj);
      }

      // Conference attendance row (type inferred from sheet name)
      if (certId || confCol !== -1 || eventDateCol !== -1) {
        const confObj = {
          type: s.type === "MUN" ? "mun" : "debate",
          name: s.type === "MUN" ? "MUN Conference" : "Debate Conference",
          certificateId: certId || ""
        };
        if (confCol !== -1) confObj.conferenceId = (row[confCol] || "").toString().trim();
        if (committeeCol !== -1) confObj.committee = (row[committeeCol] || "").toString().trim();
        if (regionCol !== -1) confObj.region = (row[regionCol] || "").toString().trim();
        if (portfolioCol !== -1) confObj.portfolio = (row[portfolioCol] || "").toString().trim();
        if (eventDateCol !== -1) confObj.date = (row[eventDateCol] || "").toString().trim();
        conferences.push(confObj);
      }
    }
  }

  return jsonResponse({ success: true, awards: awards, conferences: conferences });
}

// ====================== ADD AWARD (admin → update existing sheet row by Certificate ID, fallback email) ======================
function handleAddAward(e) {
  if (!requireAdminToken(e)) return jsonResponse({ success: false, error: "Unauthorized" });
  try {
    const d = e.parameter;
    const ss = SpreadsheetApp.getActiveSpreadsheet();

    const email = (d.email || "").trim().toLowerCase();
    const award = (d.award || "").trim();
    const certificateId = (d.certificateId || "").trim();
    const isDebate = d.eventType === "debate";

    if (!email || !award) {
      return jsonResponse({ success: false, error: "Email and award are required" });
    }

    // Try Sheet1 first, then Sheet2
    for (const sheetName of ["Sheet1", "Sheet2"]) {
      const sheet = ss.getSheetByName(sheetName);
      if (!sheet) continue;

      const data = sheet.getDataRange().getValues();
      const headers = data[0];
      const lowerHeaders = headers.map(h => h.toString().toLowerCase().trim());

      const certCol  = lowerHeaders.indexOf("certificate id");
      const emailCol = lowerHeaders.indexOf("email");
      const awardCol = lowerHeaders.indexOf("award");

      if (awardCol === -1) continue;

      let foundRow = -1;

      // Strategy 1: Find by Certificate ID (most precise)
      if (certificateId && certCol !== -1) {
        for (let i = data.length - 1; i >= 1; i--) {
          const rowCert = (data[i][certCol] || "").toString().trim();
          if (rowCert === certificateId) {
            foundRow = i;
            break;
          }
        }
      }

      // Strategy 2: Fallback to email
      if (foundRow === -1 && emailCol !== -1) {
        for (let i = data.length - 1; i >= 1; i--) {
          const rowEmail = (data[i][emailCol] || "").toString().trim().toLowerCase();
          if (rowEmail === email) {
            foundRow = i;
            break;
          }
        }
      }

      if (foundRow !== -1) {
        // Update the award on the found row
        sheet.getRange(foundRow + 1, awardCol + 1).setValue(award);
        if (certificateId && certCol !== -1) {
          sheet.getRange(foundRow + 1, certCol + 1).setValue(certificateId);
        }
        const eventDateCol = lowerHeaders.indexOf("event date");
        if (eventDateCol !== -1 && d.eventDate) {
          sheet.getRange(foundRow + 1, eventDateCol + 1).setValue(d.eventDate);
        }
        const portfolioCol = lowerHeaders.indexOf("portfolio");
        if (portfolioCol !== -1 && d.portfolio) {
          sheet.getRange(foundRow + 1, portfolioCol + 1).setValue(d.portfolio);
        }
        const committeeCol = lowerHeaders.indexOf("committee");
        if (committeeCol !== -1 && d.committee) {
          sheet.getRange(foundRow + 1, committeeCol + 1).setValue(d.committee);
        }
        return jsonResponse({ success: true, certificateId: certificateId, method: "updated" });
      }
    }

    // Not found in either sheet — append a new row (try Sheet1)
    const sheet = ss.getSheetByName("Sheet1");
    if (!sheet) return jsonResponse({ success: false, message: "Sheet not found" });

    const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    const newRow = new Array(headers.length).fill("");

    const mapping = {
      "timestamp":       new Date(),
      "full name":       d.fullName || "",
      "nick name":       d.nickName || "",
      "email":           email,
      "phone number":    d.phoneNumber || "",
      "age":             d.age || "",
      "country":         d.country || "",
      "region":          d.region || "",
      "certificate id":  certificateId,
      "award":           award,
      "portfolio":       !isDebate ? (d.portfolio || "") : "",
      "committee":       !isDebate ? (d.committee || "") : "",
      "event date":      d.eventDate || "",
      "mode":            "Online"
    };

    headers.forEach((header, index) => {
      const key = header.toString().trim().toLowerCase();
      if (mapping[key] !== undefined) {
        newRow[index] = mapping[key];
      }
    });

    sheet.appendRow(newRow);

    return jsonResponse({ success: true, certificateId: certificateId, method: "appended" });
  } catch (err) {
    return jsonResponse({ success: false, error: err.toString() });
  }
}

// ====================== UPDATE CONFERENCE (admin → update sheet row by Certificate ID, fallback email+committee) ======================
function handleUpdateConference(e) {
  if (!requireAdminToken(e)) return jsonResponse({ success: false, error: "Unauthorized" });
  try {
    const d = e.parameter;
    const certificateId = (d.certificateId || "").trim();
    const email = (d.email || "").trim().toLowerCase();

    const ss = SpreadsheetApp.getActiveSpreadsheet();

    for (const sheetName of ["Sheet1", "Sheet2"]) {
      const sheet = ss.getSheetByName(sheetName);
      if (!sheet) continue;

      const data = sheet.getDataRange().getValues();
      const lowerHeaders = data[0].map(h => h.toString().toLowerCase().trim());
      const certCol = lowerHeaders.indexOf("certificate id");
      const emailCol = lowerHeaders.indexOf("email");
      const committeeCol = lowerHeaders.indexOf("committee");

      if (emailCol === -1) continue;

      let foundRow = -1;

      // Strategy 1: Find by Certificate ID
      if (certificateId && certCol !== -1) {
        for (let i = data.length - 1; i >= 1; i--) {
          const rowCert = (data[i][certCol] || "").toString().trim();
          if (rowCert === certificateId) {
            foundRow = i;
            break;
          }
        }
      }

      // Strategy 2: Fallback to email + original committee
      if (foundRow === -1 && email && committeeCol !== -1) {
        const origCommittee = (d.origCommittee || "").trim();
        if (origCommittee) {
          for (let i = data.length - 1; i >= 1; i--) {
            const rowEmail = (data[i][emailCol] || "").toString().trim().toLowerCase();
            const rowCommittee = (data[i][committeeCol] || "").toString().trim().toLowerCase();
            if (rowEmail === email && rowCommittee === origCommittee.toLowerCase()) {
              foundRow = i;
              break;
            }
          }
        }
      }

      if (foundRow !== -1) {
        const portfolioCol = lowerHeaders.indexOf("portfolio");
        const regionCol = lowerHeaders.indexOf("region");
        const eventDateCol = lowerHeaders.indexOf("event date");

        if (portfolioCol !== -1)
          sheet.getRange(foundRow + 1, portfolioCol + 1).setValue(d.portfolio || "");
        if (committeeCol !== -1)
          sheet.getRange(foundRow + 1, committeeCol + 1).setValue(d.committee || "");
        if (regionCol !== -1)
          sheet.getRange(foundRow + 1, regionCol + 1).setValue(d.region || "");
        if (eventDateCol !== -1 && d.eventDate !== undefined)
          sheet.getRange(foundRow + 1, eventDateCol + 1).setValue(d.eventDate);

        return jsonResponse({ success: true, method: "updated" });
      }
    }

    return jsonResponse({ success: false, error: "Row not found" });
  } catch (err) {
    return jsonResponse({ success: false, error: err.toString() });
  }
}

// ====================== DELETE SHEET ROW (match all fields) ======================
function handleDeleteSheetRow(e) {
  if (!requireAdminToken(e)) return jsonResponse({ success: false, error: "Unauthorized" });
  try {
    const d = e.parameter;
    const ss = SpreadsheetApp.getActiveSpreadsheet();

    // Fields to match (all required)
    const matchFields = [
      { key: "fullName",   header: "full name" },
      { key: "nickName",   header: "nick name" },
      { key: "email",      header: "email" },
      { key: "phoneNumber",header: "phone number" },
      { key: "age",        header: "age" },
      { key: "country",    header: "country" },
      { key: "portfolio",  header: "portfolio" },
      { key: "committee",  header: "committee" },
      { key: "region",     header: "region" },
      { key: "certificateId", header: "certificate id" }
    ];

    for (const sheetName of ["Sheet1", "Sheet2"]) {
      const sheet = ss.getSheetByName(sheetName);
      if (!sheet) continue;

      const data = sheet.getDataRange().getValues();
      const lowerHeaders = data[0].map(h => h.toString().trim().toLowerCase());

      // Build column index map
      const colMap = {};
      for (const f of matchFields) {
        colMap[f.key] = lowerHeaders.indexOf(f.header);
      }

      for (let i = data.length - 1; i >= 1; i--) {
        let allMatch = true;
        for (const f of matchFields) {
          const col = colMap[f.key];
          if (col === -1) { allMatch = false; break; }
          let cellVal = (data[i][col] || "").toString().trim();
          const paramVal = (d[f.key] || "").toString().trim();
          // Strip leading apostrophe that Apps Script adds to phone numbers
          if (f.key === "phoneNumber") cellVal = cellVal.replace(/^'/, "");
          if (cellVal.toLowerCase() !== paramVal.toLowerCase()) { allMatch = false; break; }
        }
        if (allMatch) {
          sheet.deleteRow(i + 1);
          return jsonResponse({ success: true, method: "deleted" });
        }
      }
    }

    return jsonResponse({ success: false, error: "No matching row found" });
  } catch (err) {
    return jsonResponse({ success: false, error: err.toString() });
  }
}

// ====================== DELETE ALL USER ROWS (by email) ======================
function handleDeleteUserRows(e) {
  if (!requireAdminToken(e)) return jsonResponse({ success: false, error: "Unauthorized" });
  try {
    const email = (e.parameter.email || "").trim().toLowerCase();
    if (!email) return jsonResponse({ success: false, error: "No email" });

    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let deletedCount = 0;

    for (const sheetName of ["Sheet1", "Sheet2"]) {
      const sheet = ss.getSheetByName(sheetName);
      if (!sheet) continue;

      const data = sheet.getDataRange().getValues();
      const lowerHeaders = data[0].map(h => h.toString().trim().toLowerCase());
      const emailCol = lowerHeaders.indexOf("email");
      if (emailCol === -1) continue;

      // Collect rows to delete (iterate bottom-up to preserve indices)
      const rowsToDelete = [];
      for (let i = data.length - 1; i >= 1; i--) {
        const rowEmail = (data[i][emailCol] || "").toString().trim().toLowerCase();
        if (rowEmail === email) {
          rowsToDelete.push(i + 1); // 1-indexed for sheet
        }
      }

      // Delete from bottom to top so indices stay valid
      rowsToDelete.sort((a, b) => b - a);
      for (const row of rowsToDelete) {
        sheet.deleteRow(row);
        deletedCount++;
      }
    }

    return jsonResponse({ success: true, deleted: deletedCount });
  } catch (err) {
    return jsonResponse({ success: false, error: err.toString() });
  }
}

// ====================== DIAGNOSTIC: CHECK SHEET HEADERS ======================
function handleCheckHeaders(e) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const result = {};
  for (const name of ["Sheet1", "Sheet2"]) {
    const sheet = ss.getSheetByName(name);
    if (!sheet) { result[name] = "not found"; continue; }
    const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    result[name] = headers.map(h => h.toString().trim());
  }
  return jsonResponse(result);
}

// ====================== GET CERTIFICATE IDS BY EMAIL ======================
function handleGetCertIds(e) {
  if (!requireAdminToken(e)) return jsonResponse({ success: false, error: "Unauthorized" });
  const email = (e.parameter.email || "").trim().toLowerCase();
  if (!email) return jsonResponse({ success: false, error: "No email provided" });

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const certIds = [];

  for (const sheetName of ["Sheet1", "Sheet2"]) {
    const sheet = ss.getSheetByName(sheetName);
    if (!sheet) continue;

    const data = sheet.getDataRange().getValues();
    const lowerHeaders = data[0].map(h => h.toString().toLowerCase().trim());
    const emailCol = lowerHeaders.indexOf("email");
    const certCol  = lowerHeaders.indexOf("certificate id");
    const awardCol = lowerHeaders.indexOf("award");

    if (emailCol === -1 || certCol === -1) continue;

    for (let i = 1; i < data.length; i++) {
      const rowEmail = (data[i][emailCol] || "").toString().trim().toLowerCase();
      if (rowEmail !== email) continue;

      const certId = (data[i][certCol] || "").toString().trim();
      const award  = awardCol !== -1 ? (data[i][awardCol] || "").toString().trim() : "";
      if (certId) {
        certIds.push({ certificateId: certId, award: award, sheet: sheetName });
      }
    }
  }

  return jsonResponse({ success: true, certIds: certIds });
}

// ====================== HELPERS ======================
function capitalize(str) {
  if (!str) return "";
  const trimmed = str.toString().trim();
  if (!trimmed) return "";
  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1).toLowerCase();
}

// ====================== SEND OTP EMAIL ======================
function handleSendOtp(e) {
  try {
    const email = (e.parameter.email || "").trim();
    const otp = (e.parameter.otp || "").trim();
    if (!email || !otp) return jsonResponse({ success: false, error: "Missing email or OTP" });

    try {
      GmailApp.sendEmail(
        email,
        "Your Deb8er Verification Code",
        "Your verification code is: " + otp,
        {
          htmlBody:
            '<div style="font-family: \'Montserrat\', Helvetica, Arial, sans-serif; max-width: 480px; margin: 0 auto; background: #0B0E14; color: #E5E7EB; padding: 40px 32px; border-radius: 16px;">' +
            '<div style="text-align:center;margin-bottom:24px;">' +
            '<img src="https://deb8erglobal.com/assets/images/Deb9erfinallogo.webp" alt="Deb8er" style="height:40px;">' +
            '</div>' +
            '<h2 style="font-family: \'Unbounded\', sans-serif; font-size:18px; text-align:center; color:#E5E7EB; margin:0 0 4px;">Verify your email</h2>' +
            '<p style="text-align:center; color:#9CA3AF; font-size:13px; margin:0 0 24px;">Enter this code to activate your Deb8er account</p>' +
            '<div style="background:#111827; border:1px solid #1F2937; border-radius:12px; padding:24px; text-align:center;">' +
            '<div style="font-size:36px; font-weight:700; letter-spacing:12px; color:#3ABEFF; font-family:monospace;">' + otp + '</div>' +
            '</div>' +
            '<p style="color:#9CA3AF; font-size:12px; text-align:center; margin:20px 0 0;">This code expires in <strong style="color:#E5E7EB;">15 minutes</strong></p>' +
            '<p style="color:#6B7280; font-size:11px; text-align:center; margin:16px 0 0;">If you didn\'t create an account on Deb8er, ignore this email.</p>' +
            '</div>'
        }
      );
    } catch (mailErr) {
      return jsonResponse({ success: false, error: "Email error: " + mailErr.message });
    }

    return jsonResponse({ success: true });
  } catch (err) {
    return jsonResponse({ success: false, error: "sendOtp error: " + err.toString() });
  }
}

function jsonResponse(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

// ====================== CERTIFICATE VERIFICATION ======================
function handleVerification(e) {
  const certificateId = (e && e.parameter && e.parameter.certificateId)
    ? e.parameter.certificateId.trim() : null;

  if (!certificateId) return jsonResponse({ success: false, status: "invalid" });

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheets = [
    { name: "Sheet1", type: "Model United Nations (MUN)" },
    { name: "Sheet2", type: "Debate Conference" }
  ];

  for (const s of sheets) {
    const sheet = ss.getSheetByName(s.name);
    if (!sheet) continue;

    const data = sheet.getDataRange().getValues();
    const rawHeaders = data[0].map(h => h.toString().trim());
    const lowerHeaders = rawHeaders.map(h => h.toLowerCase());

    const idIdx     = lowerHeaders.indexOf("certificate id");
    const awardIdx  = lowerHeaders.indexOf("award");
    const nameIdx   = lowerHeaders.indexOf("full name");
    const emailIdx  = lowerHeaders.indexOf("email");
    const countryIdx = lowerHeaders.indexOf("country");
    const phoneIdx  = lowerHeaders.indexOf("phone number");

    // Find merge URL and merge ID columns by explicit name patterns
    function findMergeUrlCol(headers) {
      const priority = [
        'merged doc url',
        'link to merged doc',
        'document merge link',
        'merge url',
        'merge link'
      ];
      for (const p of priority) {
        const idx = headers.findIndex(h => h.toLowerCase().includes(p));
        if (idx !== -1) return idx;
      }
      // Last resort: first column with "merge" + ("url" or "link") or just "url" + "merge"
      const mergeIdx = headers.findIndex(h => /merge/i.test(h));
      const urlIdx = headers.findIndex(h => /url/i.test(h));
      const linkIdx2 = headers.findIndex(h => /link/i.test(h));
      // Prefer url column over id column — pick the later one if merge matches both
      const candidates = [];
      if (mergeIdx !== -1) candidates.push(mergeIdx);
      if (urlIdx !== -1 && urlIdx !== mergeIdx) candidates.push(urlIdx);
      if (linkIdx2 !== -1 && linkIdx2 !== mergeIdx && linkIdx2 !== urlIdx) candidates.push(linkIdx2);
      return candidates.length > 0 ? Math.max(...candidates) : -1;
    }

    const mergeDocUrlCol = findMergeUrlCol(rawHeaders);
    // Also find the merge doc ID column (for fallback)
    const mergeDocIdCol = lowerHeaders.findIndex(h =>
      h.includes('merged doc id') || h.includes('merge doc') || h === 'document merge status'
    );

    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      const rowId = row[idIdx] ? row[idIdx].toString().trim() : "";
      if (rowId !== certificateId) continue;

      const awardValue = row[awardIdx] ? row[awardIdx].toString().trim() : "";
      const rawLink    = mergeDocUrlCol !== -1
        ? (row[mergeDocUrlCol] || "").toString().trim()
        : (mergeDocIdCol !== -1 ? (row[mergeDocIdCol] || "").toString().trim() : "");

      const response = {
        success: true,
        name: row[nameIdx],
        email: row[emailIdx],
        phoneNumber: row[phoneIdx] ? row[phoneIdx].toString() : "—",
        country: row[countryIdx],
        eventType: s.type,
        award: awardValue || null
      };

      if (!awardValue) {
        response.status = "pending";
        response.message = "Results not yet released.";
      } else if (rawLink && (rawLink.includes("http") || rawLink.length > 15)) {
        response.status = "awarded";
        const fileId = rawLink.match(/[-\w]{25,}/);
        response.downloadUrl = fileId
          ? `https://drive.google.com/uc?export=download&id=${fileId[0]}&confirm=t`
          : rawLink;
      } else {
        response.status = "processing";
        response.message = "Certificate is being generated. Please refresh in 30 seconds.";
      }

      return jsonResponse(response);
    }
  }

  return jsonResponse({ success: false, status: "invalid" });
}

// ====================== FORM SUBMISSION + EMAIL ======================
function handleFormSubmission(e) {
  try {
    const d = (e && e.parameter) ? e.parameter : {};
    const ss = SpreadsheetApp.getActiveSpreadsheet();

    const email = (d.email || "").trim().toLowerCase();
    const conferenceId = (d.conferenceId || "").trim();
    const certificateId = (d.certificateId || "").trim() || "DEB8-" + Math.random().toString(36).substr(2, 6).toUpperCase();
    const isDebate = d.eventType === "debate";

    let sheetName = isDebate ? "Sheet2" : "Sheet1";
    let sheet = ss.getSheetByName(sheetName);
    if (!sheet) return jsonResponse({ success: false, message: "Sheet not found" });

    // Server-side dedup: one registration per (email, conference) per sheet.
    // Only applies when a conferenceId was supplied — legacy rows without one never block.
    if (email && conferenceId) {
      const data = sheet.getDataRange().getValues();
      const headers0 = data[0].map(h => h.toString().trim().toLowerCase());
      const emailCol = headers0.indexOf("email");
      const confCol  = headers0.indexOf("conference id");
      if (emailCol !== -1 && confCol !== -1) {
        for (let i = 1; i < data.length; i++) {
          const rowEmail = (data[i][emailCol] || "").toString().trim().toLowerCase();
          const rowConf  = (data[i][confCol] || "").toString().trim().toLowerCase();
          if (rowEmail === email && rowConf === conferenceId.toLowerCase()) {
            return jsonResponse({ success: false, exists: true, message: "Already registered for this conference session." });
          }
        }
      }
    }

    const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];

    // Auto-create the "Conference ID" column header if missing (idempotent — no-op if present).
    const lowerHeadersNow = headers.map(h => h.toString().trim().toLowerCase());
    if (lowerHeadersNow.indexOf("conference id") === -1) {
      sheet.getRange(1, headers.length + 1).setValue("Conference ID");
      headers.push("Conference ID");
    }
    const newRow = new Array(headers.length).fill("");

    // Log headers so user can verify column names (view in Apps Script Executions log)
    console.log("Sheet headers: " + JSON.stringify(headers));

    const mapping = {
      "Timestamp":        new Date(),
      "Full Name":        d.fullName || "",
      "Nick Name":        d.nickName || "",
      "Email":            d.email || "",
      "Phone Number":     d.phoneNumber ? "'" + d.phoneNumber : "",
      "Age":              d.age || "",
      "Country":          capitalize(d.country || ""),
      "Region":           capitalize(d.region || ""),
      "Certificate ID":   certificateId,
      "Mode":             "Online",
      "Conference ID":    conferenceId,
      "Event Date":       d.eventDate || "",
      "Event Name":       d.eventName || "",
      "Portfolio":        !isDebate ? (d.preferredCountry || "") : "",
      "Committee":        !isDebate ? (d.committee || "").toUpperCase() : "",
      "award":            ""
    };

    // Case-insensitive header matching
    const lowerHeaders = headers.map(h => h.toString().trim().toLowerCase());
    for (const [header, value] of Object.entries(mapping)) {
      const idx = lowerHeaders.indexOf(header.toLowerCase());
      if (idx !== -1) newRow[idx] = value;
    }

    sheet.appendRow(newRow);

    if (d.email) {
      try {
        MailApp.sendEmail({
          to: d.email,
          subject: "Deb8er Registration Confirmation",
          body:
            `Hi ${d.fullName},\n\n` +
            `Welcome to Deb8er!\n\n` +
            `Your Verification ID: ${certificateId}\n\n` +
            `Keep this safe!`
        });
      } catch (err) {
        console.log("Email failed: " + err);
      }
    }

    return jsonResponse({ success: true, certificateId: certificateId });
  } catch (globalErr) {
    return jsonResponse({ success: false, error: globalErr.toString() });
  }
}

// ====================== CERTIFICATE GENERATION (replaces AutoCrat) ======================

const CERT_TEMPLATE_ID = "1X_1Lf0TkPT390XCgdlCSJBij7hayCUiCs0ntVz0rN1Q";

/**
 * Run this from the Apps Script editor to generate certificates for rows
 * that have awards but no merge links yet. Writes to the CORRECT row.
 */
function GENERATE_CERTIFICATES() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheets = ["Sheet1", "Sheet2"];

  function formatCellDate(val) {
    const s = (val || "").toString().trim();
    return s;
  }

  // Discover tag formats ONCE from the original template
  // Supports << >> and « » bracket styles, case-insensitive matching,
  // and common name variations (e.g. "Fall Name" → "Full Name")
  function discoverTagsFromTemplate_(templateId) {
    const pres = SlidesApp.openById(templateId);
    const map = {};
    const variations = { 'fall name': 'full name' };
    for (const slide of pres.getSlides()) {
      for (const el of slide.getPageElements()) {
        if (el.getPageElementType() === SlidesApp.PageElementType.SHAPE) {
          const shape = el.asShape();
          try {
            const text = shape.getText().asString();
            const matches = text.match(/<<.+?>>|«.+?»/g);
            if (matches) {
              for (const m of matches) {
                let key = m
                  .replace(/<</g, '').replace(/>>/g, '')
                  .replace(/«/g, '').replace(/»/g, '')
                  .trim().replace(/\s+/g, ' ');
                if (key) {
                  const lower = key.toLowerCase();
                  const resolved = variations[lower] || lower;
                  if (!map[resolved]) map[resolved] = [];
                  map[resolved].push(m);
                }
              }
            }
          } catch (e) {}
        }
      }
    }
    // Build final map: normalized-key → original-tag (pick first)
    const result = {};
    for (const [key, tags] of Object.entries(map)) {
      result[key] = tags[0];
    }
    console.log(`[Tag discovery] Found ${Object.keys(result).length} unique tags: ${JSON.stringify(Object.keys(result))}`);
    return result;
  }

  const TAG_FORMATS = discoverTagsFromTemplate_(CERT_TEMPLATE_ID);
  const templateFile = DriveApp.getFileById(CERT_TEMPLATE_ID);
  const token = ScriptApp.getOAuthToken();

  for (const sheetName of sheets) {
    const sheet = ss.getSheetByName(sheetName);
    if (!sheet) continue;

    const data = sheet.getDataRange().getDisplayValues();
    const headers = data[0].map(h => h.toString().trim());
    const lower = headers.map(h => h.toLowerCase());

    function findCol(name, alternatives) {
      let i = lower.indexOf(name);
      if (i === -1 && alternatives) {
        for (const alt of alternatives) {
          i = lower.indexOf(alt);
          if (i !== -1) break;
        }
      }
      return i !== -1 ? i : -1;
    }

    const fullNameCol  = findCol("full name", ["fullname"]);
    const nickNameCol  = findCol("nick name", ["nickname", "nick"]);
    const emailCol     = findCol("email");
    const phoneCol     = findCol("phone number", ["phone", "telephone"]);
    const ageCol       = findCol("age");
    const countryCol   = findCol("country");
    const portfolioCol = findCol("portfolio", ["portfolios"]);
    const committeeCol = findCol("committee", ["committees"]);
    const regionCol    = findCol("region");
    const certIdCol    = findCol("certificate id", ["certificateid", "cert id", "certid", "certificate"]);
    const awardCol     = findCol("award");
    const eventDateCol = findCol("event date", ["eventdate", "date"]);

    const mergeIdCol    = lower.findIndex(h => h.includes("merged doc id") || h === "merge id");
    const mergeUrlCol   = lower.findIndex(h => h.includes("merged doc url") || h.includes("merge url"));
    const mergeLinkCol  = lower.findIndex(h => h.includes("link to merged doc") || h === "link" || h.includes("merge link"));
    const mergeStatusCol = lower.findIndex(h => h.includes("document merge status") || h.includes("merge status"));

    // Log detected columns for debugging
    const colNames = ["fullNameCol","nickNameCol","emailCol","phoneCol","ageCol","countryCol","portfolioCol","committeeCol","regionCol","certIdCol","awardCol","eventDateCol","mergeIdCol","mergeUrlCol","mergeLinkCol","mergeStatusCol"];
    const colVals = [fullNameCol,nickNameCol,emailCol,phoneCol,ageCol,countryCol,portfolioCol,committeeCol,regionCol,certIdCol,awardCol,eventDateCol,mergeIdCol,mergeUrlCol,mergeLinkCol,mergeStatusCol];
    console.log(`[${sheetName}] Headers: ${JSON.stringify(headers)}`);
    console.log(`[${sheetName}] Column indices: ${colNames.map((n,i)=>`${n}=${colVals[i]}`).join(", ")}`);
    console.log(`[${sheetName}] Data rows: ${data.length - 1}`);
    if (data.length > 1) {
      console.log(`[${sheetName}] Row 2 values: ${JSON.stringify(data[1])}`);
      if (awardCol !== -1) console.log(`[${sheetName}] Row 2 award: "${data[1][awardCol]}"`);
      if (certIdCol !== -1) console.log(`[${sheetName}] Row 2 certId: "${data[1][certIdCol]}"`);
      if (fullNameCol !== -1) console.log(`[${sheetName}] Row 2 name: "${data[1][fullNameCol]}"`);
    }

    let generated = 0;

    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      const award  = awardCol !== -1 ? (row[awardCol] || "").toString().trim() : "";
      const certId = certIdCol !== -1 ? (row[certIdCol] || "").toString().trim() : "";
      const name   = fullNameCol !== -1 ? (row[fullNameCol] || "").toString().trim() : "";

      if (!award) { console.log(`[${sheetName}] Row ${i+1} skipped (no award)`); continue; }
      if (!certId) { console.log(`[${sheetName}] Row ${i+1} skipped (no certId)`); continue; }

      // Skip rows that already have any merge data (whether Slides or PDF)
      const hasMerge = (mergeUrlCol !== -1 && (row[mergeUrlCol] || "").toString().trim())
        || (mergeIdCol !== -1 && (row[mergeIdCol] || "").toString().trim())
        || (mergeLinkCol !== -1 && (row[mergeLinkCol] || "").toString().trim());
      if (hasMerge) {
        const mergeVals = {};
        if (mergeUrlCol !== -1) mergeVals.mergeUrl = row[mergeUrlCol];
        if (mergeIdCol !== -1) mergeVals.mergeId = row[mergeIdCol];
        if (mergeLinkCol !== -1) mergeVals.mergeLink = row[mergeLinkCol];
        console.log(`[${sheetName}] Row ${i+1} skipped (merge exists): ${JSON.stringify(mergeVals)}`);
        continue;
      }

      try {
        const fileName = `Certificate - ${name} - ${certId}`;

        // 1. Copy template (Drive API, fast)
        const copy = templateFile.makeCopy(fileName);
        const copyId = copy.getId();
        copy.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

        // 2. Batch-replace all tags via Slides REST API (single HTTP call, no openById)
        const vals = {
          'Full Name':      name,
          'Nick Name':      (row[nickNameCol] || "").toString().trim(),
          'Email':          (row[emailCol] || "").toString().trim(),
          'Phone Number':   (row[phoneCol] || "").toString().trim(),
          'Age':            (row[ageCol] || "").toString().trim(),
          'Country':        (row[countryCol] || "").toString().trim(),
          'Portfolio':      (row[portfolioCol] || "").toString().trim(),
          'Committee':      (row[committeeCol] || "").toString().trim(),
          'Region':         (row[regionCol] || "").toString().trim(),
          'Certificate ID': certId,
          'award':          award,
          'Event Date':     formatCellDate(row[eventDateCol]),
        };
        const requests = [];
        for (const [key, value] of Object.entries(vals)) {
          const exactTag = TAG_FORMATS[key.toLowerCase()];
          if (exactTag) {
            requests.push({ tag: exactTag, value: value });
          } else {
            console.log(`[Row ${i+1}] No tag match for "${key}" (lower="${key.toLowerCase()}") — tag not found in template`);
          }
        }
        console.log(`[Row ${i+1}] Built ${requests.length} replace requests for ${name}`);
        if (requests.length > 0) {
          // Use SlidesApp service (avoids needing the Slides REST API enabled)
          const copyPres = SlidesApp.openById(copyId);
          for (const r of requests) {
            copyPres.replaceAllText(r.tag, r.value, true);
          }
          copyPres.saveAndClose();
          console.log(`[Row ${i+1}] SlidesApp replacements done`);
        }

        // 3. Export as PDF via Drive export URL
        const pdfResp = UrlFetchApp.fetch(
          `https://docs.google.com/presentation/d/${copyId}/export?format=pdf`,
          {
            headers: { Authorization: 'Bearer ' + token },
            muteHttpExceptions: true
          }
        );
        if (pdfResp.getResponseCode() !== 200) {
          throw new Error(`PDF export failed (HTTP ${pdfResp.getResponseCode()}): ${pdfResp.getContentText().substring(0, 200)}`);
        }
        const pdfFile = DriveApp.createFile(pdfResp.getBlob().setName(`${fileName}.pdf`));
        pdfFile.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
        const pdfId = pdfFile.getId();

        // Remove the Slides copy
        copy.setTrashed(true);

        // 4. Write back to sheet
        const sheetRow = i + 1;
        if (mergeIdCol !== -1)
          sheet.getRange(sheetRow, mergeIdCol + 1).setValue(pdfId);
        if (mergeUrlCol !== -1)
          sheet.getRange(sheetRow, mergeUrlCol + 1).setValue(`https://drive.google.com/file/d/${pdfId}/view`);
        if (mergeLinkCol !== -1)
          sheet.getRange(sheetRow, mergeLinkCol + 1).setValue(`${fileName}.pdf`);
        if (mergeStatusCol !== -1)
          sheet.getRange(sheetRow, mergeStatusCol + 1).setValue(
            `Document successfully created; Generated by Deb8er script; Timestamp: ${new Date().toLocaleString()}`
          );

        generated++;
      } catch (err) {
        console.error(`Failed row ${i + 1} (${name} / ${certId}): ${err}`);
      }
    }

    SpreadsheetApp.getUi().alert(`Generated ${generated} certificates in ${sheetName}`);
  }
}

/**
 * Run this to fix AutoCrat's misaligned merge output.
 * It reads the merge columns, extracts the Certificate ID from the
 * filename, and moves the merge data to the correct row.
 */
function FIX_MERGE_ALIGNMENT() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheets = ["Sheet1", "Sheet2"];
  let fixed = 0;

  for (const sheetName of sheets) {
    const sheet = ss.getSheetByName(sheetName);
    if (!sheet) continue;

    const data = sheet.getDataRange().getValues();
    const headers = data[0].map(h => h.toString().trim());
    const lower = headers.map(h => h.toLowerCase());

    const certIdCol = lower.indexOf("certificate id");
    const mergeIdCol = lower.findIndex(h => h.includes("merged doc id"));
    const mergeUrlCol = lower.findIndex(h => h.includes("merged doc url"));
    const mergeLinkCol = lower.findIndex(h => h.includes("link to merged doc") || h === "link");
    const mergeStatusCol = lower.findIndex(h => h.includes("document merge status") || h.includes("merge status"));

    if (certIdCol === -1) continue;

    // Collect all merge data with their target Certificate IDs
    const merges = [];

    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      const linkColVal = mergeLinkCol !== -1 ? (row[mergeLinkCol] || "").toString().trim() : "";
      const urlColVal  = mergeUrlCol !== -1 ? (row[mergeUrlCol] || "").toString().trim() : "";
      const idColVal   = mergeIdCol !== -1 ? (row[mergeIdCol] || "").toString().trim() : "";

      if (!linkColVal && !urlColVal && !idColVal) continue;

      // Extract Certificate ID from filename "Certificate - Name - CERTID"
      let targetCertId = "";
      const match = linkColVal.match(/DEB8-[A-Z0-9]+/);
      if (match) targetCertId = match[0];

      if (targetCertId) {
        merges.push({
          fromRow: i + 1,
          targetCertId: targetCertId,
          mergeId: idColVal,
          mergeUrl: urlColVal,
          mergeLink: linkColVal,
          mergeStatus: mergeStatusCol !== -1 ? (row[mergeStatusCol] || "").toString().trim() : ""
        });
      }
    }

    // Now find the correct row for each merge and move data
    for (const m of merges) {
      // Find target row
      let targetRow = -1;
      for (let i = 1; i < data.length; i++) {
        const rowCertId = (data[i][certIdCol] || "").toString().trim();
        if (rowCertId === m.targetCertId) {
          targetRow = i + 1;
          break;
        }
      }

      if (targetRow === -1 || targetRow === m.fromRow) continue;

      // Write merge data to correct row
      if (mergeIdCol !== -1)
        sheet.getRange(targetRow, mergeIdCol + 1).setValue(m.mergeId);
      if (mergeUrlCol !== -1)
        sheet.getRange(targetRow, mergeUrlCol + 1).setValue(m.mergeUrl);
      if (mergeLinkCol !== -1)
        sheet.getRange(targetRow, mergeLinkCol + 1).setValue(m.mergeLink);
      if (mergeStatusCol !== -1)
        sheet.getRange(targetRow, mergeStatusCol + 1).setValue(m.mergeStatus);

      // Clear the wrong row
      if (mergeIdCol !== -1)
        sheet.getRange(m.fromRow, mergeIdCol + 1).clearContent();
      if (mergeUrlCol !== -1)
        sheet.getRange(m.fromRow, mergeUrlCol + 1).clearContent();
      if (mergeLinkCol !== -1)
        sheet.getRange(m.fromRow, mergeLinkCol + 1).clearContent();
      if (mergeStatusCol !== -1)
        sheet.getRange(m.fromRow, mergeStatusCol + 1).clearContent();

      fixed++;
    }
  }

  SpreadsheetApp.getUi().alert(`Fixed ${fixed} misaligned certificate links`);
}

/**
 * Adds a custom menu to run certificate functions from the sheet.
 */
function onOpen() {
  const ui = SpreadsheetApp.getUi();
  ui.createMenu('🔐 Deb8er Certs')
    .addItem('Generate Certificates', 'GENERATE_CERTIFICATES')
    .addItem('Fix Merge Alignment', 'FIX_MERGE_ALIGNMENT')
    .addToUi();
}
