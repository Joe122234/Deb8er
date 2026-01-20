document.addEventListener("DOMContentLoaded", () => {

  /* ================= MUN REGION TABS ================= */
  const munTabs = document.querySelectorAll(
    ".region-tabs:not(.debate-tabs) .region-tab"
  );
  const munTimeText = document.getElementById("region-time");

  const regionTimes = {
    asia: "Asia — January 20, 2026 — MDT 2:30 AM",
    europe: "Europe — January 20, 2026 — MDT 8:00 AM – 1:00 PM",
    americas: "Americas — January 20, 2026 — MDT 8:00 AM – 1:00 PM",
    "africa-oceania": "Africa–Oceania — January 20, 2026 — MDT 12:30 AM"
  };

  munTabs.forEach(tab => {
    tab.addEventListener("click", () => {
      munTabs.forEach(t => t.classList.remove("active"));
      tab.classList.add("active");

      const region = tab.dataset.region;
      if (regionTimes[region]) {
        munTimeText.textContent = regionTimes[region];
      }
    });
  });

  /* ================= DEBATE REGION TABS ================= */
  const debateTabs = document.querySelectorAll(".debate-tabs .region-tab");
  const debateTimeText = document.getElementById("debate-region-time");

  const debateTimes = {
    asia: "Asia — February 15, 2026 — MDT 3:00 AM",
    europe: "Europe — February 15, 2026 — MDT 9:00 AM",
    americas: "Americas — February 15, 2026 — MDT 5:30 AM",
    "africa-oceania": "Africa–Oceania — February 15, 2026 — MDT 11:30 PM"
  };

  debateTabs.forEach(tab => {
    tab.addEventListener("click", () => {
      debateTabs.forEach(t => t.classList.remove("active"));
      tab.classList.add("active");

      const region = tab.dataset.debateRegion;
      if (debateTimes[region]) {
        debateTimeText.textContent = debateTimes[region];
      }
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
      emailLink.style.color = "var(--cyan)";

      setTimeout(() => {
        emailLink.textContent = original;
        emailLink.style.color = "";
      }, 1500);
    });
  }

});
