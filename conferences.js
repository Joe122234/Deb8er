document.addEventListener("DOMContentLoaded", () => {

  /* ============================================================
     HELPERS (IST -> USER LOCAL TIME)
     IST = UTC + 5:30
  ============================================================ */

  function parseISTDate(dateStr, timeStr) {
    let t = timeStr.trim();

    // Allow "noon"
    t = t.replace(/noon/i, "12:00 PM");

    // If user wrote "2 PM" or "2 AM" -> make "2:00 PM"
    if (/^\d{1,2}\s?(AM|PM)$/i.test(t)) {
      t = t.replace(/\s?(AM|PM)$/i, ":00 $1");
    }

    // If timeStr includes date already (ex: "March 8, 2026 12:30 AM")
    // we will just parse that directly.
    if (/[A-Za-z]+\s+\d{1,2},\s+\d{4}/.test(t)) {
      const dt = new Date(`${t} GMT+0530`);
      return dt;
    }

    // Normal parse: "March 7, 2026" + "2:00 PM"
    const dt = new Date(`${dateStr} ${t} GMT+0530`);
    return dt;
  }

  function formatLocalTime(dateObj) {
    return dateObj.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
      timeZoneName: "short"
    });
  }

  function formatLocalDate(dateObj) {
    return dateObj.toLocaleDateString([], {
      year: "numeric",
      month: "short",
      day: "numeric"
    });
  }

  /**
   * Converts an IST session into user's local time
   * Fixes midnight crossing (end < start => end + 1 day)
   */
  function getSessionLocalTimesIST(dateStr, startStr, endStr) {
    const start = parseISTDate(dateStr, startStr);
    let end = parseISTDate(dateStr, endStr);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return {
        localStart: "Time TBD",
        localEnd: "Time TBD",
        localStartDate: "",
        localEndDate: ""
      };
    }

    // If end is earlier than start, assume it ends next day
    if (end < start) {
      end.setDate(end.getDate() + 1);
    }

    return {
      localStart: formatLocalTime(start),
      localEnd: formatLocalTime(end),
      localStartDate: formatLocalDate(start),
      localEndDate: formatLocalDate(end)
    };
  }

  /* ================= MUN DATA (IST) ================= */
  const munData = {
    asia: { date: "March 7, 2026", start: "2:00 PM", end: "7:00 PM", label: "Asia" },
    europe: { date: "March 7, 2026", start: "7:30 PM", end: "12:30 AM", label: "Europe" },
    americas: { date: "March 7, 2026", start: "7:30 PM", end: "12:30 AM", label: "America" },
    "africa-oceania": { date: "March 7, 2026", start: "12:00 PM", end: "5:00 PM", label: "Africa–Oceania" }
  };

  const munTabs = document.querySelectorAll(".region-tabs:not(.debate-tabs) .region-tab");
  const munTimeText = document.getElementById("region-time");

  function updateMUNTime(region) {
    if (!munData[region] || !munTimeText) return;
    const d = munData[region];

    const {
      localStart,
      localEnd,
      localStartDate,
      localEndDate
    } = getSessionLocalTimesIST(d.date, d.start, d.end);

    // show date note if local end date differs
    const endDateNote =
      localEndDate && localStartDate && localEndDate !== localStartDate
        ? ` <span style="opacity:.7;">(${localEndDate})</span>`
        : "";

    munTimeText.innerHTML = `
      ${d.label} — ${d.date} — IST ${d.start} to ${d.end}
      <br><span style="color: #9CA3AF; font-size: 0.85rem; font-style: normal; font-weight: 500;">
        <i class="fa-solid fa-clock-rotate-left"></i> Your Time: ${localStart} - ${localEnd}${endDateNote}
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

  /* ================= DEBATE DATA (IST) ================= */
  const debateData = {
    asia: { date: "February 7, 2026", start: "2:30 PM", end: "5:30 PM", label: "Asia" },
    europe: { date: "February 6, 2026", start: "8:30 PM", end: "11:30 PM", label: "Europe" },
    americas: { date: "February 7, 2026", start: "3:30 AM", end: "6:30 AM", label: "Americas" },
    "africa-oceania": { date: "February 9, 2026", start: "11:00 AM", end: "2:00 PM", label: "Africa–Oceania" }
  };

  const debateTabs = document.querySelectorAll(".debate-tabs .region-tab");
  const debateTimeText = document.getElementById("debate-region-time");

  function updateDebateTime(region) {
    if (!debateData[region] || !debateTimeText) return;
    const d = debateData[region];

    const {
      localStart,
      localEnd,
      localStartDate,
      localEndDate
    } = getSessionLocalTimesIST(d.date, d.start, d.end);

    const endDateNote =
      localEndDate && localStartDate && localEndDate !== localStartDate
        ? ` <span style="opacity:.7;">(${localEndDate})</span>`
        : "";

    debateTimeText.innerHTML = `
      ${d.label} — ${d.date} — IST ${d.start} to ${d.end}
      <br><span style="color: #9CA3AF; font-size: 0.85rem; font-style: normal; font-weight: 500;">
        <i class="fa-solid fa-clock-rotate-left"></i> Your Time: ${localStart} - ${localEnd}${endDateNote}
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

  /* ================= INITIALIZE ================= */
  updateMUNTime("asia");
  updateDebateTime("asia");

});


/* ================= SCROLL INDICATOR ================= */
const scrollIndicator = document.getElementById("floating-scroll");
const debateSection = document.querySelector(".debate-wrapper");

function handleScrollClick() {
  if (debateSection) {
    debateSection.scrollIntoView({ behavior: "smooth" });
  }
  if (scrollIndicator) {
    scrollIndicator.classList.add("hidden");
  }
}

window.addEventListener("scroll", () => {
  if (!scrollIndicator || !debateSection) return;
  const debateTop = debateSection.getBoundingClientRect().top;
  if (debateTop < window.innerHeight / 2) {
    scrollIndicator.classList.add("hidden");
  } else {
    scrollIndicator.classList.remove("hidden");
  }
});
