document.addEventListener("DOMContentLoaded", () => {

  /**
   * Helper: Converts MDT (UTC-6) to User's Local Time
   * @param {string} dateStr - e.g., "January 20, 2026"
   * @param {string} mdtTimeStr - e.g., "02:30 AM"
   */
  function getLocalTimeString(dateStr, mdtTimeStr) {
    try {
      // Normalize noon/midnight for the Date constructor
      let timePart = mdtTimeStr.replace(' noon', ':00 PM').replace(' AM', ':00 AM').replace(' PM', ':00 PM');
      
      // MDT is UTC-6. We create the date string specifically in that offset.
      const date = new Date(`${dateStr} ${timePart} GMT-0600`);
      
      return date.toLocaleTimeString([], { 
        hour: '2-digit', 
        minute: '2-digit', 
        timeZoneName: 'short' 
      });
    } catch (e) {
      return "Local time unavailable";
    }
  }

  /* ================= MUN REGION TABS ================= */
  const munTabs = document.querySelectorAll(".region-tabs:not(.debate-tabs) .region-tab");
  const munTimeText = document.getElementById("region-time");

  const munData = {
    asia: { date: "March 7, 2026", start: "2:30 AM", end: "7:30 AM", label: "Asia" },
    europe: { date: "March 7, 2026", start: "8:00 AM", end: "1:00 PM", label: "Europe" },
    americas: { date: "March 7, 2026", start: "8:00 AM", end: "1:00 PM", label: "America" },
    "africa-oceania": { date: "March 7, 2026", start: "12:30 AM", end: "5:30 AM", label: "Africa–Oceania" }
  };

  function updateMUNTime(region) {
    if (!munData[region] || !munTimeText) return;
    const d = munData[region];
    const localStart = getLocalTimeString(d.date, d.start);
    const localEnd = getLocalTimeString(d.date, d.end);
    
    munTimeText.innerHTML = `
      ${d.label} — ${d.date} — MDT ${d.start} to ${d.end}
      <br><span style="color: #9CA3AF; font-size: 0.85rem; font-style: normal; font-weight: 500;">
        <i class="fa-solid fa-clock-rotate-left"></i> Your Time: ${localStart} - ${localEnd}
      </span>
    `;
  }

  munTabs.forEach(tab => {
    tab.addEventListener("click", () => {
      munTabs.forEach(t => t.classList.remove("active"));
      tab.classList.add("active");
      updateMUNTime(tab.dataset.region);
    });
  });

  /* ================= DEBATE REGION TABS ================= */
  const debateTabs = document.querySelectorAll(".debate-tabs .region-tab");
  const debateTimeText = document.getElementById("debate-region-time");

  const debateData = {
    asia: { date: "February 7, 2026", start: "3:00 AM", end: "6:00 AM", label: "Asia" },
    europe: { date: "February 6, 2026", start: "9:00 AM", end: "12:00 PM", label: "Europe" },
    americas: { date: "February 6, 2026", start: "4:00 PM", end: "7:00 PM", label: "Americas" },
    "africa-oceania": { date: "February 8, 2026", start: "11:30 PM", end: "2:30 AM", label: "Africa–Oceania" }
  };

  function updateDebateTime(region) {
    if (!debateData[region] || !debateTimeText) return;
    const d = debateData[region];
    const localStart = getLocalTimeString(d.date, d.start);
    const localEnd = getLocalTimeString(d.date, d.end);
    
    debateTimeText.innerHTML = `
      ${d.label} — ${d.date} — MDT ${d.start} to ${d.end}
      <br><span style="color: #9CA3AF; font-size: 0.85rem; font-style: normal; font-weight: 500;">
        <i class="fa-solid fa-clock-rotate-left"></i> Your Time: ${localStart} - ${localEnd}
      </span>
    `;
  }

  debateTabs.forEach(tab => {
    tab.addEventListener("click", () => {
      debateTabs.forEach(t => t.classList.remove("active"));
      tab.classList.add("active");
      updateDebateTime(tab.dataset.debateRegion);
    });
  });

  /* ================= COPY EMAIL ================= */
  const emailLink = document.getElementById("copy-email");
  if (emailLink) {
    emailLink.addEventListener("click", (e) => {
      e.preventDefault();
      navigator.clipboard.writeText("hello.deb8er@gmail.com");
      const original = emailLink.textContent;
      emailLink.textContent = "Copied!";
      emailLink.style.color = "var(--button-2)";
      setTimeout(() => {
        emailLink.textContent = original;
        emailLink.style.color = "";
      }, 1500);
    });
  }

  /* ================= INITIALIZE DEFAULT VIEWS ================= */
  updateMUNTime('asia');
  updateDebateTime('asia');

});

/* ================= SCROLL INDICATOR LOGIC ================= */
// This part is outside DOMContentLoaded to be accessible by the HTML onclick attribute
const scrollIndicator = document.getElementById('floating-scroll');
const debateSection = document.querySelector('.debate-wrapper');

function handleScrollClick() {
    if (debateSection) {
        debateSection.scrollIntoView({ behavior: 'smooth' });
    }
    // Hide immediately when clicked
    if (scrollIndicator) {
        scrollIndicator.classList.add('hidden');
    }
}

window.addEventListener('scroll', () => {
    if (!scrollIndicator || !debateSection) return;

    const debateTop = debateSection.getBoundingClientRect().top;

    // Disappear if user scrolls past the middle of the screen into the debate section
    if (debateTop < window.innerHeight / 2) {
        scrollIndicator.classList.add('hidden');
    } else {
        scrollIndicator.classList.remove('hidden');
    }
});