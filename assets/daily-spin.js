let _confettiReady;
function loadConfetti() {
  if (!_confettiReady) _confettiReady = import('https://cdn.jsdelivr.net/npm/canvas-confetti@1').then(m => {
    if (typeof m.default === 'function') return m.default;
    if (typeof m === 'function') return m;
    return m.default || m.confetti || Object.values(m).find(v => typeof v === 'function') || null;
  });
  return _confettiReady;
}

const SEGMENTS = [
  { label: '5 Gems',    color: '#7C3AED', light: '#a68af9', gems: 5 },
  { label: '10 Gems',   color: '#6366F1', light: '#818CF8', gems: 10 },
  { label: '15 Gems',   color: '#4F46E5', light: '#a68af9', gems: 15 },
  { label: '20 Gems',   color: '#0891B2', light: '#22D3EE', gems: 20 },
  { label: '25 Gems',   color: '#0E7490', light: '#22D3EE', gems: 25 },
  { label: 'Freeze',    color: '#0D9488', light: '#22D3EE', gems: 0, freeze: true },
  { label: 'Shard',     color: '#4338CA', light: '#a68af9', gems: 0, shard: true },
  { label: 'Mystery',   color: '#155E75', light: '#3ABEFF', gems: 0, mystery: true },
];

const SEG_DEG = 360 / SEGMENTS.length;
let spinning = false;

export function getSegments() { return SEGMENTS; }

export function getDailySpinStatus(userData) {
  const lastSpin = userData.lastSpinDate || '';
  const today = new Date().toISOString().split('T')[0];
  const extraSpin = userData.extraSpinAvailable === true;
  return {
    canSpin: lastSpin !== today || extraSpin,
    alreadySpun: lastSpin === today && !extraSpin,
    hasExtra: extraSpin,
    spinsLeft: extraSpin ? 2 : (lastSpin !== today ? 1 : 0)
  };
}

export function getSpinCountdown() {
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(0, 0, 0, 0);
  const diff = tomorrow - now;
  if (diff <= 0) return 'Available now';
  const h = Math.floor(diff / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

export function openSpinWheel(userData, onSave) {
  const existing = document.getElementById('spin-modal');
  if (existing) existing.remove();

  const { alreadySpun, hasExtra } = getDailySpinStatus(userData);
  const cannotSpin = alreadySpun && !hasExtra;

  const modal = document.createElement('div');
  modal.id = 'spin-modal';
  modal.innerHTML = `
    <div class="spin-backdrop" id="spin-backdrop"></div>
    <div class="spin-modal">
      <button class="spin-modal-close" id="spin-close-btn">&times;</button>
      <div class="spin-header">
        <div class="spin-header-icon"><i class="fas fa-gem"></i></div>
        <div class="spin-header-title">Daily Spin</div>
        <div class="spin-header-sub">${cannotSpin ? 'Come back in <span id="spin-countdown-modal">' + getSpinCountdown() + '</span>' : hasExtra ? 'Bonus spin — you earned it!' : 'Spin for a chance to win Gems!'}</div>
      </div>
      <div class="spin-wheel-wrap">
        <div class="spin-pointer"><i class="fas fa-caret-down"></i></div>
        <div class="spin-wheel-rotator" id="spin-rotator">
          <canvas id="spin-canvas" width="320" height="320"></canvas>
        </div>
        <button class="spin-btn" id="spin-btn" ${cannotSpin ? 'disabled' : ''}>
          ${cannotSpin ? '<i class="fas fa-check"></i> Done' : '<i class="fas fa-play"></i> SPIN'}
        </button>
      </div>
      <div class="spin-result" id="spin-result"></div>
    </div>
  `;
  document.body.appendChild(modal);
  requestAnimationFrame(() => modal.classList.add('open'));

  drawWheel();

  document.getElementById('spin-backdrop').addEventListener('click', closeSpin);
  document.getElementById('spin-close-btn').addEventListener('click', closeSpin);

  if (cannotSpin) {
    const interval = setInterval(() => {
      const el = document.getElementById('spin-countdown-modal');
      if (el) el.textContent = getSpinCountdown();
      else clearInterval(interval);
    }, 10000);
    modal._countdownInterval = interval;
    // Clean up interval on close
    const origClose = modal.querySelector('.spin-modal-close').onclick;
    document.getElementById('spin-backdrop').addEventListener('click', () => {
      clearInterval(interval);
      closeSpin();
    }, { once: true });
    document.getElementById('spin-close-btn').addEventListener('click', () => {
      clearInterval(interval);
      closeSpin();
    }, { once: true });
  }

  if (!cannotSpin) {
    document.getElementById('spin-btn').addEventListener('click', () => doSpin(userData, onSave));
  }
}

function closeSpin() {
  const modal = document.getElementById('spin-modal');
  if (!modal) return;
  modal.classList.remove('open');
  setTimeout(() => modal.remove(), 300);
}

function drawWheel() {
  const canvas = document.getElementById('spin-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const w = canvas.width;
  const cx = w / 2;
  const r = w / 2 - 6;

  SEGMENTS.forEach((seg, i) => {
    const aStart = (i * SEG_DEG - 90) * Math.PI / 180;
    const aEnd = ((i + 1) * SEG_DEG - 90) * Math.PI / 180;

    ctx.beginPath();
    ctx.moveTo(cx, cx);
    ctx.arc(cx, cx, r, aStart, aEnd);
    ctx.closePath();

    const grad = ctx.createRadialGradient(cx, cx, 0, cx, cx, r);
    grad.addColorStop(0, seg.light);
    grad.addColorStop(1, seg.color);
    ctx.fillStyle = grad;
    ctx.fill();

    ctx.strokeStyle = 'rgba(255,255,255,0.12)';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    const mid = (aStart + aEnd) / 2;
    const tr = r * 0.62;
    const tx = cx + Math.cos(mid) * tr;
    const ty = cx + Math.sin(mid) * tr;

    ctx.save();
    ctx.translate(tx, ty);
    ctx.rotate(mid + Math.PI / 2);
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 12px Inter, Montserrat, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = 'rgba(0,0,0,0.35)';
    ctx.shadowBlur = 4;
    ctx.fillText(seg.label, 0, 0);
    ctx.restore();
  });

  ctx.beginPath();
  ctx.arc(cx, cx, 26, 0, Math.PI * 2);
  const cGrad = ctx.createRadialGradient(cx - 3, cx - 3, 0, cx, cx, 26);
  cGrad.addColorStop(0, '#374151');
  cGrad.addColorStop(1, '#111827');
  ctx.fillStyle = cGrad;
  ctx.fill();
  ctx.strokeStyle = '#4B5563';
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(cx, cx, 22, 0, Math.PI * 2);
  const innerGrad = ctx.createRadialGradient(cx, cx, 0, cx, cx, 22);
  innerGrad.addColorStop(0, '#6366F1');
  innerGrad.addColorStop(1, '#4F46E5');
  ctx.fillStyle = innerGrad;
  ctx.fill();
}

function doSpin(userData, onSave) {
  if (spinning) return;
  spinning = true;

  const btn = document.getElementById('spin-btn');
  btn.disabled = true;
  btn.innerHTML = '<i class="fas fa-spinner fa-pulse"></i>';

  const rotator = document.getElementById('spin-rotator');
  const resultEl = document.getElementById('spin-result');
  resultEl.innerHTML = '';

  const targetSeg = Math.floor(Math.random() * SEGMENTS.length);
  const targetDeg = 360 * 5 + (360 - targetSeg * SEG_DEG - SEG_DEG / 2);

  rotator.style.transition = 'transform 4.5s cubic-bezier(0.17, 0.67, 0.12, 0.99)';
  rotator.style.transform = `rotate(${targetDeg}deg)`;

  setTimeout(() => {
    rotator.style.transition = 'none';
    rotator.style.transform = `rotate(${targetDeg % 360}deg)`;
    spinning = false;
    const seg = SEGMENTS[targetSeg];
    handleResult(seg, userData, onSave, btn, resultEl);
  }, 4700);
}

async function handleResult(seg, userData, onSave, btn, resultEl) {
  const prize = prizeLabel(seg);
  resultEl.innerHTML = `
    <div class="spin-result-inner" style="--prize-color:${seg.color}">
      <div class="spin-result-icon"><i class="fas fa-gift"></i></div>
      <div class="spin-result-label">You won</div>
      <div class="spin-result-prize">${prize}</div>
    </div>
  `;

  btn.innerHTML = '<i class="fas fa-spinner fa-pulse"></i> Saving...';

  loadConfetti().then(fn => {
    if (typeof fn !== 'function') return;
    fn({
      particleCount: 120,
      spread: 100,
      origin: { x: 0.5, y: 0.35 },
      colors: [seg.color, seg.light, '#FBBF24', '#fff'],
    });
    setTimeout(() => fn({
      particleCount: 60,
      spread: 140,
      origin: { x: 0.5, y: 0.3 },
      colors: ['#FBBF24', '#fff'],
    }), 300);
  });

  try {
    if (typeof onSave === 'function') {
      await onSave(seg, userData);
    }
    const desc = prize.replace(/<[^>]*>/g, '').trim();
    resultEl.innerHTML = `
      <div class="spin-result-inner" style="--prize-color:${seg.color}">
        <div class="spin-result-icon"><i class="fas fa-check-circle" style="font-size:28px;"></i></div>
        <div class="spin-result-label">Collected!</div>
        <div class="spin-result-prize">${desc}</div>
      </div>
    `;
    btn.textContent = 'Claimed';
    btn.disabled = true;
  } catch (e) {
    console.error('Daily Spin save failed:', e);
    resultEl.innerHTML = `
      <div class="spin-result-inner" style="--prize-color:#EF4444">
        <div class="spin-result-icon"><i class="fas fa-exclamation-circle" style="font-size:28px;"></i></div>
        <div class="spin-result-label">Save failed</div>
        <div class="spin-result-prize" style="font-size:0.8rem;">Check console or try again</div>
      </div>
    `;
    btn.innerHTML = '<i class="fas fa-redo"></i> Retry';
    btn.disabled = false;
    btn.onclick = () => handleResult(seg, userData, onSave, btn, resultEl);
  }
}

function prizeLabel(seg) {
  if (seg.gems) return `<span class="gem-icon gem-icon--sm"></span> ${seg.gems} Gems`;
  if (seg.freeze) return '❄️ Streak Freeze';
  if (seg.mystery) return '🎁 Mystery Box';
  if (seg.shard) return '⚔️ Badge Shard';
  return seg.label;
}
