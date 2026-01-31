// --- 1. DEFINE VARIABLES ---
const verifyBtn = document.getElementById("verifyBtn");
const input = document.getElementById("certificateInput");
const resultBox = document.getElementById("verificationResult");

// Ensure this URL is your latest DEPLOYED Web App URL
const API_URL = "https://script.google.com/macros/s/AKfycby-EUMArruQllL51xArnNiECiiIcF2D3GUk_SnlJFUmq4csk4pEkGS64B1nc86fSoy0/exec";

// --- 2. THE LOGIC ---
verifyBtn.addEventListener("click", async () => {
  const id = input.value.trim();

  // Reset UI
  resultBox.classList.remove("hidden");
  resultBox.className = "result";
  resultBox.innerHTML = "⏳ Verifying...";

  if (!id) {
    resultBox.className = "result invalid";
    resultBox.innerHTML = "❌ Please enter a Certificate ID";
    return;
  }

  try {
    // FIXED FETCH: Added redirect follow and cors mode to prevent ERR_FAILED
    const response = await fetch(`${API_URL}?certificateId=${encodeURIComponent(id)}`, {
      method: "GET",
      mode: "cors", 
      redirect: "follow"
    });

    const data = await response.json();

    if (!data || !data.success) {
      resultBox.className = "result invalid";
      resultBox.innerHTML = "❌ Invalid Certificate ID";
      return;
    }

    // Common Info Template
    const infoHtml = `
      ✅ <strong>Verified Participant</strong><br><br>
      <strong>Name:</strong> ${data.name || "—"}<br>
      <strong>Email:</strong> ${data.email || "—"}<br>
      <strong>Country:</strong> ${data.country || "—"}<br>
      <strong>Conference:</strong> ${data.eventType || "—"}<br>
    `;

    /* SCENARIO 1: Result not ready */
    if (data.status === "pending") {
      resultBox.className = "result valid";
      resultBox.innerHTML = infoHtml + `
        <div class="info" style="margin-top:15px; padding: 10px; border-left: 4px solid #3ABEFF; background: rgba(34, 211, 238, 0.1);">
          ℹ️ ${data.message}
        </div>
      `;
    } 
    /* SCENARIO 2: Award entered but AutoCrat hasn't run yet */
    else if (data.status === "processing") {
      resultBox.className = "result valid";
      resultBox.innerHTML = infoHtml + `
        <div class="award" style="margin-top:10px; font-weight:bold; color:#3ABEFF;">🏆 ${data.award}</div>
        <div class="info" style="margin-top:10px; padding: 10px; border-left: 4px solid #f1c40f; background: rgba(241, 196, 15, 0.1);">
          ⏳ ${data.message}
        </div>
      `;
    } 
    /* SCENARIO 3: SUCCESS (AutoCrat link is there) */
    else if (data.status === "awarded") {
      resultBox.className = "result valid";
      resultBox.innerHTML = infoHtml + `
        <div class="award" style="margin-top:10px; font-weight:bold; color:#3ABEFF; font-size: 1.2rem;">🏆 ${data.award}</div>
        <br>
        <a class="download-btn" href="${data.downloadUrl}" target="_blank" style="display:inline-block; padding:12px 24px; background: linear-gradient(90deg, #a68af9, #3ABEFF);; text-decoration:none; border-radius:5px; font-weight:bold; transition: 0.3s;">
          <i class="fas fa-download"></i> Download Certificate (PDF)
        </a>
      `;
    }

  } catch (err) {
    console.error("Fetch Error:", err);
    resultBox.className = "result invalid";
    resultBox.innerHTML = "❌ Verification failed. Please check your internet or try again later.";
  }
});