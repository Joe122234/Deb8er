/* ============================================================
   CONFERENCE_CONFIG — the single source of truth for the
   current monthly conference session(s).

   EDIT THIS FILE EACH MONTH (dates, times, committees, motions,
   open/closed). Everything reads from here:
     - conferences.html display page (region times, committees, motions)
     - join-conference.html (form, dedup, sheet tagging)
     - form.html (standalone form, dedup, sheet tagging)

   Region keys: asia / europe / america / africa (unified everywhere).
   Region start/end are 24h times in that region's own timezone.
   Full conference IDs = CONFERENCE_CONFIG.id + "-" + eventType
   (e.g. conf-2026-08-mun, conf-2026-08-debate).
============================================================ */
window.CONFERENCE_CONFIG = {
  id: "conf-2026-09",

  mun: {
    name: "August 2026 MUN Conference",
    eventDate: "2026-08-29",
    registrationOpen: false,
    regions: {
      asia:    { label: "Asia",           timezone: "Asia/Kolkata", start: "14:00", end: "19:00" },
      europe:  { label: "Europe",         timezone: "Asia/Kolkata", start: "19:30", end: "00:30" },
      america: { label: "Americas",       timezone: "Asia/Kolkata", start: "19:30", end: "00:30" },
      africa:  { label: "Africa–Oceania", timezone: "Asia/Kolkata", start: "12:00", end: "17:00" }
    },
    committees: [
      { name: "UNGA",   topic: "Protecting the Freedom of Religion or Belief",                                    ageGroup: "10-14" },
      { name: "DISEC",  topic: "The threat of nuclear weapons to global peace and stability",                     ageGroup: "10-14" },
      { name: "UNICEF", topic: "Ensuring Digital Safety for Children Worldwide",                                  ageGroup: "10-14" },
      { name: "UNHRC",  topic: "Ensuring access to education as a basic human right",                             ageGroup: "10-14" },
      { name: "UNSC",   topic: "Preventing Conflicts over Shared Water Resources",                                ageGroup: "10-14" },
      { name: "UNGA",   topic: "Strengthening International Cooperation in Counter-Terrorism Efforts",           ageGroup: "15-18" },
      { name: "DISEC",  topic: "Impact of Private Military Security Contractors on Global Security",             ageGroup: "15-18" },
      { name: "UNCSW",  topic: "Rethinking the Legalization of Prostitution",                                    ageGroup: "15-18" },
      { name: "UNHRC",  topic: "Protecting the Rights and Improving the Living Conditions of Refugees and Migrants", ageGroup: "15-18" },
      { name: "UNSC",   topic: "Addressing Arctic Militarization and Resource Claims",                           ageGroup: "15-18" }
    ]
  },

  debate: {
    name: "September 2026 Debate Conference",
    eventDate: "2026-09-06",
    registrationOpen: true,
    regions: {
      asia:    { label: "Asia",           timezone: "Asia/Kolkata",        start: "14:30", end: "17:30" },
      europe:  { label: "Europe",         timezone: "Europe/London",       start: "10:00", end: "13:00" },
      america: { label: "Americas",       timezone: "America/New_York",    start: "05:00", end: "08:00" },
      africa:  { label: "Africa–Oceania", timezone: "Africa/Johannesburg", start: "11:00", end: "14:00" }
    },
    motions: [
      { ageGroup: "10-14", text: "Should unpaid domestic work be formally recognized?" },
      { ageGroup: "15-18", text: "Should institutions or the government be allowed to regulate the usage of religious symbols?" }
    ]
  }
};

document.addEventListener("DOMContentLoaded", () => {

  /* ============================================================
     HELPERS (REGION TZ -> USER LOCAL TIME)
     Each region declares its own IANA timezone in CONFERENCE_CONFIG.
  ============================================================ */

  // "2026-08-29" + "14:00" + "Asia/Kolkata" -> real Date at that wall time in that tz.
  // Uses Intl's formatToParts to discover the zone offset (DST-safe, two-pass).
  function zonedWallTimeToDate(isoDate, time24, tz) {
    const m = String(time24).match(/^(\d{1,2}):(\d{2})$/);
    const [y, mo, d] = String(isoDate).split("-").map(Number);
    if (!m || isNaN(y) || isNaN(mo) || isNaN(d)) return new Date(NaN);
    const h = parseInt(m[1], 10);
    const min = parseInt(m[2], 10);
    if (h > 23 || min > 59) return new Date(NaN);

    const guess = new Date(Date.UTC(y, mo - 1, d, h, min));
    let dtf;
    try {
      dtf = new Intl.DateTimeFormat("en-US", {
        timeZone: tz,
        year: "numeric", month: "numeric", day: "numeric",
        hour: "numeric", minute: "numeric", hour12: false
      });
    } catch (e) {
      return new Date(NaN); // invalid tz -> "Time TBD"
    }
    const parts = dtf.formatToParts(guess);
    const p = {};
    for (const part of parts) p[part.type] = part.value;
    const hour = p.hour === "24" ? 0 : parseInt(p.hour, 10);
    const asUTC = Date.UTC(parseInt(p.year, 10), parseInt(p.month, 10) - 1, parseInt(p.day, 10), hour, parseInt(p.minute, 10));
    return new Date(guess.getTime() - (asUTC - guess.getTime()));
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

  // IANA name -> short abbreviation (e.g. "Asia/Kolkata" -> "IST") at the event instant.
  function tzAbbrev(isoDate, time24, tz) {
    try {
      const dt = zonedWallTimeToDate(isoDate, time24, tz);
      const abbr = new Intl.DateTimeFormat("en-US", { timeZone: tz, timeZoneName: "short" })
        .formatToParts(dt).find(p => p.type === "timeZoneName")?.value;
      return abbr || tz;
    } catch (e) {
      return tz;
    }
  }

  /**
   * Converts a region-wall-clock session into the user's local time.
   * Fixes midnight crossing (end < start => end + 1 day).
   */
  function getSessionLocalTimes(isoDate, startStr, endStr, tz) {
    const start = zonedWallTimeToDate(isoDate, startStr, tz);
    let end = zonedWallTimeToDate(isoDate, endStr, tz);

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

  /* ============================================================
     CONFIG HELPERS
  ============================================================ */

  // "14:00" -> "2:00 PM", "00:30" -> "12:30 AM"
  function to12h(time24) {
    if (!time24) return "";
    const m = String(time24).match(/^(\d{1,2}):(\d{2})$/);
    if (!m) return time24;
    let h = parseInt(m[1], 10);
    const min = m[2];
    const ap = h >= 12 ? "PM" : "AM";
    h = h % 12 || 12;
    return `${h}:${min} ${ap}`;
  }

  // "2026-08-29" -> "August 29, 2026"
  function toHumanDate(isoDate) {
    if (!isoDate) return "";
    const d = new Date(isoDate + "T00:00:00");
    if (isNaN(d.getTime())) return isoDate;
    return d.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
  }

  function esc(str) {
    return String(str == null ? "" : str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  /* ================= MUN DATA ================= */
  const munConf = window.CONFERENCE_CONFIG && window.CONFERENCE_CONFIG.mun;
  const munOpen = munConf && munConf.registrationOpen !== false;

  if (munOpen) {
    const munRegions = (munConf && munConf.regions) || {};
    const munData = {};
    for (const [key, r] of Object.entries(munRegions)) {
      munData[key] = {
        isoDate: munConf.eventDate,
        date: toHumanDate(munConf.eventDate),
        start24: r.start,
        end24: r.end,
        start: to12h(r.start),
        end: to12h(r.end),
        tz: r.timezone || "Asia/Kolkata",
        label: r.label
      };
    }

    const munTabs = document.querySelectorAll(".region-tabs:not(.debate-tabs) .region-tab");
    const munTimeText = document.getElementById("region-time");

    function updateMUNTime(region) {
      if (!munData[region] || !munTimeText) return;
      const d = munData[region];
      const abbr = tzAbbrev(d.isoDate, d.start24, d.tz);

      const {
        localStart,
        localEnd,
        localStartDate,
        localEndDate
      } = getSessionLocalTimes(d.isoDate, d.start24, d.end24, d.tz);

      const endDateNote =
        localEndDate && localStartDate && localEndDate !== localStartDate
          ? ` <span style="opacity:.7;">(${localEndDate})</span>`
          : "";

      munTimeText.innerHTML = `
        ${d.label} — ${d.date} — ${abbr} ${d.start} to ${d.end}
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
        localStorage.setItem("confMUNRegion", tab.dataset.region);
      });
    });

    const savedMUN = localStorage.getItem("confMUNRegion");
    if (savedMUN) {
      const match = [...munTabs].find(t => t.dataset.region === savedMUN);
      if (match) {
        munTabs.forEach(t => t.classList.remove("active"));
        match.classList.add("active");
        updateMUNTime(savedMUN);
      }
    }
  }

  /* ================= DEBATE DATA ================= */
  const debateConf = window.CONFERENCE_CONFIG && window.CONFERENCE_CONFIG.debate;
  const debateRegions = (debateConf && debateConf.regions) || {};
  const debateData = {};
  for (const [key, r] of Object.entries(debateRegions)) {
    debateData[key] = {
      isoDate: debateConf.eventDate,
      date: toHumanDate(debateConf.eventDate),
      start24: r.start,
      end24: r.end,
      start: to12h(r.start),
      end: to12h(r.end),
      tz: r.timezone || "Asia/Kolkata",
      label: r.label
    };
  }

  const debateTabs = document.querySelectorAll(".debate-tabs .region-tab");
  const debateTimeText = document.getElementById("debate-region-time");

  function updateDebateTime(region) {
    // Safety check for data and DOM element
    if (!debateData[region] || !debateTimeText) return;
    const d = debateData[region];
    const abbr = tzAbbrev(d.isoDate, d.start24, d.tz);

    const {
      localStart,
      localEnd,
      localStartDate,
      localEndDate
    } = getSessionLocalTimes(d.isoDate, d.start24, d.end24, d.tz);

    const endDateNote =
      localEndDate && localStartDate && localEndDate !== localStartDate
        ? ` <span style="opacity:.7;">(${localEndDate})</span>`
        : "";

    debateTimeText.innerHTML = `
      ${d.label} — ${d.date} — ${abbr} ${d.start} to ${d.end}
      <br><span style="color: #9CA3AF; font-size: 0.85rem; font-style: normal; font-weight: 500;">
        <i class="fa-solid fa-clock-rotate-left"></i> Your Time: ${localStart} - ${localEnd}${endDateNote}
      </span>
    `;
  }

  debateTabs.forEach(tab => {
    tab.addEventListener("click", () => {
      debateTabs.forEach(t => t.classList.remove("active"));
      tab.classList.add("active");

      // Use the correct dataset key for debate tabs
      const region = tab.dataset.debateRegion || tab.dataset.region;
      updateDebateTime(region);
      localStorage.setItem("confDebateRegion", region);
    });
  });

  // Restore saved debate region
  const savedDebate = localStorage.getItem("confDebateRegion");
  if (savedDebate) {
    const match = [...debateTabs].find(t => (t.dataset.debateRegion || t.dataset.region) === savedDebate);
    if (match) {
      debateTabs.forEach(t => t.classList.remove("active"));
      match.classList.add("active");
      updateDebateTime(savedDebate);
    }
  }

  /* ================= RENDER DISPLAY PAGE FROM CONFIG ================= */
  const conf = window.CONFERENCE_CONFIG;

  // MUN committees grouped by age group (only if MUN is open)
  if (munOpen && conf && conf.mun && conf.mun.committees) {
    document.querySelectorAll(".committee-list").forEach((listEl, listIdx) => {
      const ageGroup = listIdx === 0 ? "10-14" : "15-18";
      const items = conf.mun.committees.filter(c => c.ageGroup === ageGroup);
      if (!items.length) return;
      listEl.innerHTML = items.map(c => `
        <div class="committee-item">
          <strong>${esc(c.name)}</strong>
          <span>${esc(c.topic)}</span>
        </div>
      `).join("");
    });
  }

  // Debate motions grouped by age group
  if (conf && conf.debate && conf.debate.motions) {
    const debateSections = document.querySelectorAll(".debate-section");
    debateSections.forEach((sec, idx) => {
      const ageGroup = idx === 0 ? "10-14" : "15-18";
      const motion = conf.debate.motions.find(m => m.ageGroup === ageGroup);
      const item = sec.querySelector(".committee-item");
      if (item && motion) item.innerHTML = `<span>${esc(motion.text)}</span>`;
    });
  }

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
  if (munOpen) updateMUNTime("asia");
  updateDebateTime("asia");

});
