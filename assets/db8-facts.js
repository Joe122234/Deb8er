/* Deb8er Assistant — ground-truth facts.
 * Loaded on index/about/conferences/team BEFORE chat-widget.js.
 * Exposes window.DB8_FACTS = { constants, conference, lessons }.
 *
 * - conference is read from window.CONFERENCE_CONFIG when present (Conferences
 *   page loads conferences.js which defines it) and null otherwise.
 * - lessons are fetched from assets/lessons/index.json (same-origin, allowed by
 *   the pages' CSP connect-src 'self'), cached after first fetch.
 * - constants mirror assets/leaderboard-sync.js + assets/gamification.js.
 * - team mirrors team.html.
 */
(function () {
  "use strict";

  var LESSONS_URL = "assets/lessons/index.json";

  var constants = {
    pointsPerConference: 15,
    awardPoints: {
      participation: 20,
      "high commendation": 30,
      "best beginner": 40,
      "special mention": 50,
      "best position paper": 50,
      "best diplomat": 40,
      "runner up": 50,
      "best delegate": 100,
      "best deb8er": 100
    },
    defaultAwardPoints: 20,
    levels: {
      1: "Beginner",
      5: "Bronze Speaker",
      10: "Silver Speaker",
      20: "Gold Speaker",
      25: "Advanced Speaker",
      35: "Diamond Speaker",
      50: "Debate Legend"
    },
    xpPerLevel: 100,
    referralBonus: 50,
    referrerBonus: 100
  };

  var team = [
    { name: "Sadhana S", nickname: "Sana", role: "CEO & Co-Founder", country: "India" },
    { name: "Avyukta Jaggi", nickname: "Avu", role: "Founder & Co-Founder", country: "India" },
    { name: "Soe Aung Myint Myat", nickname: "Henry", role: "CTO & Co-Founder", country: "Myanmar" }
  ];

  var lessonsCache = null;
  var lessonsPromise = null;

  function fetchLessons() {
    if (lessonsPromise) return lessonsPromise;
    lessonsPromise = fetch(LESSONS_URL, { method: "GET", cache: "no-store" })
      .then(function (r) {
        if (!r.ok) throw new Error("lessons index " + r.status);
        return r.json();
      })
      .then(function (index) {
        var summary = {
          count: 0,
          tracks: []
        };
        (index.tracks || []).forEach(function (track) {
          var t = {
            title: track.title || track.id,
            units: []
          };
          (track.units || []).forEach(function (unit) {
            var lessons = (unit.lessons || []).map(function (l) {
              return l.title || l.id;
            });
            t.units.push({ title: unit.title || unit.id, lessons: lessons });
            summary.count += lessons.length;
          });
          summary.tracks.push(t);
        });
        lessonsCache = summary;
        return summary;
      })
      .catch(function () {
        lessonsCache = null;
        return null;
      });
    return lessonsPromise;
  }

  function conferenceFacts() {
    var c = window.CONFERENCE_CONFIG;
    if (!c || !c.mun) return null;
    var mun = c.mun;
    var debate = c.debate || {};
    return {
      id: c.id,
      mun: {
        name: mun.name,
        eventDate: mun.eventDate,
        registrationOpen: !!mun.registrationOpen,
        regions: mun.regions
          ? Object.keys(mun.regions).map(function (k) {
              var r = mun.regions[k];
              return { key: k, label: r.label, timezone: r.timezone, start: r.start, end: r.end };
            })
          : [],
        committees: (mun.committees || []).map(function (cm) {
          return { committee: cm.name, topic: cm.topic, ageGroup: cm.ageGroup };
        })
      },
      debate: {
        name: debate.name,
        eventDate: debate.eventDate,
        registrationOpen: !!debate.registrationOpen,
        motions: (debate.motions || []).map(function (m) {
          return { ageGroup: m.ageGroup, motion: m.text };
        })
      }
    };
  }

  function buildFacts() {
    return {
      constants: constants,
      team: team,
      conference: conferenceFacts(),
      lessons: lessonsCache
    };
  }

  window.DB8_FACTS = {
    build: buildFacts,
    fetchLessons: fetchLessons
  };
})();
