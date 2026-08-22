// --- 1. DEFINE VARIABLES ---
const verifyBtn = document.getElementById("verifyBtn");
const input = document.getElementById("certificateInput");
const resultBox = document.getElementById("verificationResult");

// Ensure this URL is your latest DEPLOYED Web App URL
const API_URL = "https://script.google.com/macros/s/AKfycbz17qsli87dWnVAQRba9eefZLTwb3guJlB74Ooex0rpXaf-jn_S5MIiRmuSRcfYnAGP/exec";

// --- XSS-SAFE HELPER ---
function esc(str) {
  if (str == null) return "";
  const d = document.createElement("div");
  d.appendChild(document.createTextNode(String(str)));
  return d.innerHTML;
}
function isValidUrl(s) {
  try { const u = new URL(s); return u.protocol === "https:" || u.protocol === "http:"; } catch { return false; }
}

// --- 2. THE LOGIC ---
const DEBUG = false;

verifyBtn.addEventListener("click", async () => {
  const id = input.value.trim();

  // Reset UI
  while (resultBox.firstChild) resultBox.removeChild(resultBox.firstChild);
  resultBox.classList.remove("hidden");
  resultBox.className = "result";
  const spinner = document.createTextNode("\u23F3 Verifying...");
  resultBox.appendChild(spinner);

  if (!id) {
    resultBox.className = "result invalid";
    while (resultBox.firstChild) resultBox.removeChild(resultBox.firstChild);
    resultBox.appendChild(document.createTextNode("\u274C Please enter a Certificate ID"));
    return;
  }

  try {
    const response = await fetch(`${API_URL}?certificateId=${encodeURIComponent(id)}`, {
      method: "GET",
      mode: "cors",
      redirect: "follow"
    });

    const data = await response.json();
    if (DEBUG) console.log("Verification Response:", data);

    if (!data || !data.success) {
      resultBox.className = "result invalid";
      while (resultBox.firstChild) resultBox.removeChild(resultBox.firstChild);
      resultBox.appendChild(document.createTextNode("\u274C Invalid Certificate ID"));
      return;
    }

    // --- Build result DOM safely ---
    while (resultBox.firstChild) resultBox.removeChild(resultBox.firstChild);

    // Info section
    const header = document.createElement("div");
    header.className = "result-header";
    header.innerHTML = '<i class="fas fa-check-circle verified-icon"></i> <span>Verified Participant</span>';
    resultBox.appendChild(header);

    const details = document.createElement("div");
    details.className = "result-details";
    const fields = [
      { label: "Name", icon: "fa-user-circle", val: data.name },
      { label: "Email", icon: "fa-envelope", val: data.email },
      { label: "Phone", icon: "fa-phone", val: data.phoneNumber || data["Phone Number"] || data.phone_number || data.phone || data["phone number"] },
      { label: "Country", icon: "fa-globe", val: data.country },
      { label: "Conference", icon: "fa-gavel", val: data.eventType },
    ];
    fields.forEach(f => {
      const row = document.createElement("div");
      row.className = "detail-row";
      row.innerHTML = `<span class="detail-label"><i class="fas ${f.icon}"></i> ${esc(f.label)}</span>`;
      const valSpan = document.createElement("span");
      valSpan.className = "detail-value";
      valSpan.textContent = f.val || "\u2014";
      row.appendChild(valSpan);
      details.appendChild(row);
    });
    resultBox.appendChild(details);

    if (data.status === "pending") {
      resultBox.className = "result valid";
      const alert = document.createElement("div");
      alert.className = "info-alert info-pending";
      alert.innerHTML = '<i class="fas fa-info-circle"></i>';
      const msgSpan = document.createElement("span");
      msgSpan.textContent = data.message || "";
      alert.appendChild(msgSpan);
      resultBox.appendChild(alert);

    } else if (data.status === "processing") {
      resultBox.className = "result valid";
      const plate = document.createElement("div");
      plate.className = "award-plate";
      plate.innerHTML = '<i class="fas fa-trophy"></i>';
      const awardSpan = document.createElement("span");
      awardSpan.textContent = data.award || "";
      plate.appendChild(awardSpan);
      resultBox.appendChild(plate);

      const alert = document.createElement("div");
      alert.className = "info-alert info-warn";
      alert.innerHTML = '<i class="fas fa-hourglass-half"></i>';
      const msgSpan = document.createElement("span");
      msgSpan.textContent = data.message || "";
      alert.appendChild(msgSpan);
      resultBox.appendChild(alert);

    } else if (data.status === "awarded") {
      resultBox.className = "result valid";
      const plate = document.createElement("div");
      plate.className = "award-plate";
      plate.innerHTML = '<i class="fas fa-trophy"></i>';
      const awardSpan = document.createElement("span");
      awardSpan.textContent = data.award || "";
      plate.appendChild(awardSpan);
      resultBox.appendChild(plate);

      const link = document.createElement("a");
      link.className = "download-btn full-width";
      link.target = "_blank";
      if (isValidUrl(data.downloadUrl)) {
        link.href = data.downloadUrl;
      } else {
        link.href = "#";
        link.style.opacity = "0.5";
      }
      link.innerHTML = '<i class="fas fa-file-pdf"></i> Download Certificate (PDF)';
      resultBox.appendChild(link);
    }

  } catch (err) {
    if (DEBUG) console.error("Fetch Error:", err);
    resultBox.className = "result invalid";
    while (resultBox.firstChild) resultBox.removeChild(resultBox.firstChild);
    resultBox.appendChild(document.createTextNode("\u274C Verification failed. Please check your internet or try again later."));
  }
});