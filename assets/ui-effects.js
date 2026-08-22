/**
 * ui-effects.js — animated stat counters & card tilt on hover
 */

document.addEventListener("DOMContentLoaded", () => {

// ── ANIMATED STAT COUNTERS ──

document.querySelectorAll("[data-counter-group] [data-count]").forEach(el => {
  el.dataset.target = el.textContent.trim();
  const match = el.dataset.target.match(/^([\d.]+)([^]*)$/);
  el.textContent = match ? "0" + (match[2] || "") : el.dataset.target;
});

function animateCounter(el) {
  const raw = el.dataset.target;
  const match = raw.match(/^([\d.]+)([^]*)$/);
  if (!match) return;
  const target = parseFloat(match[1]);
  const suffix = match[2] || "";
  const duration = 1200;
  const start = performance.now();

  function tick(now) {
    const t = Math.min((now - start) / duration, 1);
    const ease = 1 - Math.pow(1 - t, 3);
    const current = Math.round(ease * target);
    el.textContent = current + suffix;
    if (t < 1) requestAnimationFrame(tick);
    else el.textContent = target + suffix;
  }
  requestAnimationFrame(tick);
}

const counterObserver = new IntersectionObserver((entries, obs) => {
  entries.forEach(entry => {
    if (!entry.isIntersecting) return;
    entry.target.querySelectorAll("[data-count]").forEach(animateCounter);
    obs.unobserve(entry.target);
  });
}, { threshold: 0.4 });

document.querySelectorAll("[data-counter-group]").forEach(group => counterObserver.observe(group));

document.querySelectorAll("[data-count]:not([data-counter-group] *)").forEach(el => {
  el.dataset.target = el.textContent.trim();
  const match = el.dataset.target.match(/^([\d.]+)([^]*)$/);
  el.textContent = match ? "0" + (match[2] || "") : el.dataset.target;
  const obs = new IntersectionObserver(([entry], o) => {
    if (!entry.isIntersecting) return;
    animateCounter(el);
    o.unobserve(el);
  }, { threshold: 0.5 });
  obs.observe(el);
});

// ── CARD TILT ON HOVER ──

document.querySelectorAll("[data-tilt]").forEach(card => {
  card.addEventListener("mousemove", e => {
    const rect = card.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    card.style.transform = `perspective(800px) rotateX(${-((y - 0.5) * 12)}deg) rotateY(${((x - 0.5) * 12)}deg)`;
    card.style.transition = "transform 0.08s ease-out";
  });
  card.addEventListener("mouseleave", () => {
    card.style.transform = "perspective(800px) rotateX(0deg) rotateY(0deg)";
    card.style.transition = "transform 0.3s ease-out";
  });
});

});
