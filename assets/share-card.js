/* ══════════════════════════════════════════════
   Deb8er Share Cards — Premium 600×600 badge generator
   Each badge gets a unique visual identity
   ══════════════════════════════════════════════ */

const BADGE_ART = {
  'perfect-score': {
    category: 'Excellence',
    colors: ['#06B6D4', '#67E8F9', '#A5F3FC'],
    bg: ['#001F25', '#0B0E14'],
    accent: '#67E8F9',
    pattern: 'circles'
  },
  'lesson-master': {
    category: 'Mastery',
    colors: ['#F59E0B', '#FCD34D', '#FFF3C4'],
    bg: ['#1A1100', '#0B0E14'],
    accent: '#FCD34D',
    pattern: 'stripes'
  },
  'first-lesson': {
    category: 'Milestone',
    colors: ['#10B981', '#34D399', '#6EE7B7'],
    bg: ['#001A0F', '#0B0E14'],
    accent: '#34D399',
    pattern: 'rays'
  },
  'first-steps': {
    category: 'Onboarding',
    colors: ['#3B82F6', '#60A5FA', '#93C5FD'],
    bg: ['#001133', '#0B0E14'],
    accent: '#60A5FA',
    pattern: 'dots'
  },
  'streak-7': {
    category: 'Dedication',
    colors: ['#FF4500', '#FF6B35', '#FFB347'],
    bg: ['#1C0500', '#0B0E14'],
    accent: '#FF6B35',
    pattern: 'flame'
  },
  'streak-30': {
    category: 'Discipline',
    colors: ['#DC2626', '#F87171', '#FCA5A5'],
    bg: ['#1A0000', '#0B0E14'],
    accent: '#F87171',
    pattern: 'rings'
  },
  'debate-beginner': {
    category: 'Debate',
    colors: ['#7C3AED', '#A78BFA', '#C4B5FD'],
    bg: ['#0F0520', '#0B0E14'],
    accent: '#A78BFA',
    pattern: 'chevron'
  },
  'rebuttal-master': {
    category: 'Argument',
    colors: ['#DB2777', '#F472B6', '#FBCFE8'],
    bg: ['#1C0015', '#0B0E14'],
    accent: '#F472B6',
    pattern: 'zigzag'
  },
  'logic-master': {
    category: 'Reasoning',
    colors: ['#2563EB', '#60A5FA', '#93C5FD'],
    bg: ['#001133', '#0B0E14'],
    accent: '#60A5FA',
    pattern: 'grid'
  },
  'quick-thinker': {
    category: 'Speed',
    colors: ['#D97706', '#FBBF24', '#FDE68A'],
    bg: ['#1A0F00', '#0B0E14'],
    accent: '#FBBF24',
    pattern: 'lightning'
  },
  'accuracy-ace': {
    category: 'Precision',
    colors: ['#059669', '#34D399', '#6EE7B7'],
    bg: ['#001A0F', '#0B0E14'],
    accent: '#34D399',
    pattern: 'target'
  },
  'research-expert': {
    category: 'Knowledge',
    colors: ['#8B5CF6', '#A78BFA', '#C4B5FD'],
    bg: ['#0F0520', '#0B0E14'],
    accent: '#A78BFA',
    pattern: 'lines'
  },
  'quiz-conqueror': {
    category: 'Endurance',
    colors: ['#EC4899', '#F472B6', '#FBCFE8'],
    bg: ['#1C0015', '#0B0E14'],
    accent: '#F472B6',
    pattern: 'diamond'
  },
  'global-debater': {
    category: 'Diplomacy',
    colors: ['#0891B2', '#22D3EE', '#67E8F9'],
    bg: ['#001F25', '#0B0E14'],
    accent: '#22D3EE',
    pattern: 'globe'
  },
  'top-10': {
    category: 'Rank',
    colors: ['#D97706', '#FBBF24', '#FDE68A'],
    bg: ['#1A0F00', '#0B0E14'],
    accent: '#FBBF24',
    pattern: 'steps'
  },
  'top-1': {
    category: 'Elite',
    colors: ['#DC2626', '#F87171', '#FCA5A5'],
    bg: ['#1A0000', '#0B0E14'],
    accent: '#F87171',
    pattern: 'crown'
  },
  'coin-collector': {
    category: 'Wealth',
    colors: ['#F59E0B', '#FCD34D', '#FFF3C4'],
    bg: ['#1A1100', '#0B0E14'],
    accent: '#FCD34D',
    pattern: 'coins'
  },
  'speed-demon': {
    category: 'Velocity',
    colors: ['#EF4444', '#F87171', '#FCA5A5'],
    bg: ['#1A0000', '#0B0E14'],
    accent: '#F87171',
    pattern: 'speed'
  },
  'referral-star': {
    category: 'Community',
    colors: ['#10B981', '#34D399', '#6EE7B7'],
    bg: ['#001A0F', '#0B0E14'],
    accent: '#34D399',
    pattern: 'stars'
  },
  'viral-ambassador': {
    category: 'Influence',
    colors: ['#3B82F6', '#60A5FA', '#93C5FD'],
    bg: ['#001133', '#0B0E14'],
    accent: '#60A5FA',
    pattern: 'wave'
  },
  'level-25': {
    category: 'Progress',
    colors: ['#7C3AED', '#A78BFA', '#C4B5FD'],
    bg: ['#0F0520', '#0B0E14'],
    accent: '#A78BFA',
    pattern: 'arrow'
  }
};

function getArt(badge) {
  return BADGE_ART[badge.id] || BADGE_ART['first-lesson'];
}

/* ─── Background pattern drawers ─── */
function drawPattern_circles(ctx, art, w, h) {
  ctx.strokeStyle = 'rgba(255,255,255,0.02)';
  ctx.lineWidth = 1;
  for (let r = 60; r < Math.max(w, h) * 1.5; r += 80) {
    ctx.beginPath();
    ctx.arc(w / 2, h * 0.45, r, 0, Math.PI * 2);
    ctx.stroke();
  }
}

function drawPattern_stripes(ctx, art, w, h) {
  ctx.strokeStyle = 'rgba(255,255,255,0.02)';
  ctx.lineWidth = 1;
  for (let x = -50; x < w + 50; x += 30) {
    ctx.beginPath();
    ctx.moveTo(x, 0); ctx.lineTo(x + h * 0.3, h);
    ctx.stroke();
  }
}

function drawPattern_rays(ctx, art, w, h) {
  ctx.strokeStyle = 'rgba(255,255,255,0.015)';
  ctx.lineWidth = 1;
  for (let a = 0; a < 360; a += 20) {
    const rad = a * Math.PI / 180;
    ctx.beginPath();
    ctx.moveTo(w / 2, h * 0.45);
    ctx.lineTo(w / 2 + Math.cos(rad) * 400, h * 0.45 + Math.sin(rad) * 400);
    ctx.stroke();
  }
}

function drawPattern_dots(ctx, art, w, h) {
  ctx.fillStyle = 'rgba(255,255,255,0.025)';
  for (let x = 20; x < w; x += 40) {
    for (let y = 20; y < h; y += 40) {
      ctx.beginPath();
      ctx.arc(x, y, 2, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

function drawPattern_flame(ctx, art, w, h) {
  ctx.fillStyle = 'rgba(255,100,50,0.03)';
  for (let i = 0; i < 12; i++) {
    const x = 40 + (i * 47) % w;
    const y = 30 + (i * 83) % h;
    ctx.beginPath();
    ctx.moveTo(x, y - 12 - (i % 3) * 6);
    ctx.bezierCurveTo(x + 8, y - 3, x + 6, y + 6, x, y + 3);
    ctx.bezierCurveTo(x - 6, y + 6, x - 8, y - 3, x, y - 12 - (i % 3) * 6);
    ctx.fill();
  }
}

function drawPattern_rings(ctx, art, w, h) {
  ctx.strokeStyle = 'rgba(255,255,255,0.02)';
  ctx.lineWidth = 1;
  for (let r = 30; r < 350; r += 40) {
    ctx.beginPath();
    ctx.arc(w / 2, h / 2, r, 0, Math.PI * 2);
    ctx.stroke();
  }
}

function drawPattern_chevron(ctx, art, w, h) {
  ctx.strokeStyle = 'rgba(255,255,255,0.02)';
  ctx.lineWidth = 1;
  for (let y = -20; y < h + 20; y += 35) {
    ctx.beginPath();
    ctx.moveTo(0, y + 10);
    ctx.lineTo(w / 2, y);
    ctx.lineTo(w, y + 10);
    ctx.stroke();
  }
}

function drawPattern_zigzag(ctx, art, w, h) {
  ctx.strokeStyle = 'rgba(255,255,255,0.02)';
  ctx.lineWidth = 1;
  for (let y = -20; y < h + 20; y += 30) {
    ctx.beginPath();
    for (let x = 0; x < w; x += 20) {
      ctx.lineTo(x, y + (Math.floor(x / 20) % 2 === 0 ? 10 : -10));
    }
    ctx.stroke();
  }
}

function drawPattern_grid(ctx, art, w, h) {
  ctx.strokeStyle = 'rgba(255,255,255,0.015)';
  ctx.lineWidth = 0.5;
  for (let x = 0; x < w; x += 25) {
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke();
  }
  for (let y = 0; y < h; y += 25) {
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
  }
}

function drawPattern_lightning(ctx, art, w, h) {
  ctx.fillStyle = 'rgba(255,200,50,0.03)';
  for (let i = 0; i < 8; i++) {
    const x = 30 + (i * 73) % w;
    const y = 40 + (i * 59) % h;
    const s = 8 + (i % 3) * 4;
    ctx.beginPath();
    ctx.moveTo(x - s, y - s);
    ctx.lineTo(x + s * 0.3, y - s * 0.2);
    ctx.lineTo(x, y);
    ctx.lineTo(x + s, y);
    ctx.lineTo(x - s * 0.3, y + s * 0.4);
    ctx.lineTo(x, y + s * 0.2);
    ctx.closePath();
    ctx.fill();
  }
}

function drawPattern_target(ctx, art, w, h) {
  ctx.strokeStyle = 'rgba(255,255,255,0.02)';
  ctx.lineWidth = 1;
  for (let r = 30; r < 350; r += 35) {
    ctx.beginPath();
    ctx.arc(w / 2, h * 0.45, r, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.strokeStyle = 'rgba(255,255,255,0.015)';
  ctx.beginPath(); ctx.moveTo(0, h * 0.45); ctx.lineTo(w, h * 0.45); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(w / 2, 0); ctx.lineTo(w / 2, h); ctx.stroke();
}

function drawPattern_lines(ctx, art, w, h) {
  ctx.strokeStyle = 'rgba(255,255,255,0.015)';
  ctx.lineWidth = 1;
  for (let y = 0; y < h; y += 18) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(w, y);
    ctx.stroke();
  }
}

function drawPattern_diamond(ctx, art, w, h) {
  ctx.strokeStyle = 'rgba(255,255,255,0.015)';
  ctx.lineWidth = 1;
  const d = 35;
  for (let x = -d; x < w + d; x += d) {
    for (let y = -d; y < h + d; y += d) {
      ctx.beginPath();
      ctx.moveTo(x, y - d / 2);
      ctx.lineTo(x + d / 2, y);
      ctx.lineTo(x, y + d / 2);
      ctx.lineTo(x - d / 2, y);
      ctx.closePath();
      ctx.stroke();
    }
  }
}

function drawPattern_globe(ctx, art, w, h) {
  ctx.strokeStyle = 'rgba(255,255,255,0.02)';
  ctx.lineWidth = 0.5;
  for (let lon = -90; lon <= 90; lon += 30) {
    const rad = lon * Math.PI / 180;
    const ry = Math.abs(Math.cos(rad)) * h * 0.4;
    ctx.beginPath();
    ctx.ellipse(w / 2, h * 0.45, w * 0.4, ry, 0, 0, Math.PI * 2);
    ctx.stroke();
  }
  for (let lat = 0; lat < 360; lat += 30) {
    const rad = lat * Math.PI / 180;
    ctx.beginPath();
    ctx.ellipse(w / 2, h * 0.45, Math.abs(Math.cos(rad)) * w * 0.4, h * 0.16, 0, 0, Math.PI * 2);
    ctx.stroke();
  }
}

function drawPattern_steps(ctx, art, w, h) {
  ctx.strokeStyle = 'rgba(255,255,255,0.015)';
  ctx.lineWidth = 1;
  for (let i = 0; i < 10; i++) {
    const yy = 30 + i * 40;
    const lw = 60 + i * 18;
    ctx.beginPath();
    ctx.moveTo(w / 2 - lw / 2, yy);
    ctx.lineTo(w / 2 + lw / 2, yy);
    ctx.stroke();
  }
}

function drawPattern_crown(ctx, art, w, h) {
  ctx.fillStyle = 'rgba(255,200,50,0.02)';
  for (let i = 0; i < 10; i++) {
    const x = 30 + (i * 65) % w;
    const y = 30 + (i * 47) % h;
    const s = 8 + (i % 4) * 3;
    ctx.beginPath();
    ctx.moveTo(x - s * 0.9, y + s * 0.6);
    ctx.lineTo(x - s * 0.9, y - s * 0.4);
    ctx.lineTo(x - s * 0.55, y - s * 0.1);
    ctx.lineTo(x - s * 0.2, y - s * 0.8);
    ctx.lineTo(x, y - s * 0.35);
    ctx.lineTo(x + s * 0.2, y - s * 0.8);
    ctx.lineTo(x + s * 0.55, y - s * 0.1);
    ctx.lineTo(x + s * 0.9, y - s * 0.4);
    ctx.lineTo(x + s * 0.9, y + s * 0.6);
    ctx.closePath();
    ctx.fill();
  }
}

function drawPattern_coins(ctx, art, w, h) {
  ctx.strokeStyle = 'rgba(255,200,50,0.03)';
  ctx.lineWidth = 1;
  for (let i = 0; i < 15; i++) {
    const x = 20 + (i * 41) % w;
    const y = 20 + (i * 67) % h;
    ctx.beginPath();
    ctx.arc(x, y, 8, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.ellipse(x, y + 1, 8, 3, 0, 0, Math.PI * 2);
    ctx.stroke();
  }
}

function drawPattern_speed(ctx, art, w, h) {
  ctx.strokeStyle = 'rgba(255,100,100,0.02)';
  ctx.lineWidth = 1;
  for (let i = 0; i < 20; i++) {
    const y = 10 + (i * 31) % h;
    const startX = (i * 43) % w;
    ctx.beginPath();
    ctx.moveTo(startX, y);
    ctx.lineTo(startX + 60 + (i % 5) * 12, y - 8 + (i % 3) * 4);
    ctx.stroke();
  }
}

function drawPattern_stars(ctx, art, w, h) {
  ctx.fillStyle = 'rgba(255,255,255,0.02)';
  for (let i = 0; i < 20; i++) {
    const x = 15 + (i * 53) % w;
    const y = 20 + (i * 71) % h;
    const r = 3 + (i % 3);
    ctx.beginPath();
    for (let j = 0; j < 5; j++) {
      const a1 = (j * 2 * Math.PI) / 5 - Math.PI / 2;
      const a2 = a1 + Math.PI / 5;
      const ox = x + r * Math.cos(a1);
      const oy = y + r * Math.sin(a1);
      const ix = x + r * 0.4 * Math.cos(a2);
      const iy = y + r * 0.4 * Math.sin(a2);
      j === 0 ? ctx.moveTo(ox, oy) : ctx.lineTo(ox, oy);
      ctx.lineTo(ix, iy);
    }
    ctx.closePath();
    ctx.fill();
  }
}

function drawPattern_wave(ctx, art, w, h) {
  ctx.strokeStyle = 'rgba(255,255,255,0.015)';
  ctx.lineWidth = 1;
  for (let row = 0; row < 8; row++) {
    ctx.beginPath();
    const baseY = 30 + row * 50;
    for (let x = 0; x <= w; x += 10) {
      const yy = baseY + Math.sin((x + row * 30) * 0.02) * 15;
      x === 0 ? ctx.moveTo(x, yy) : ctx.lineTo(x, yy);
    }
    ctx.stroke();
  }
}

function drawPattern_arrow(ctx, art, w, h) {
  ctx.strokeStyle = 'rgba(255,255,255,0.015)';
  ctx.lineWidth = 1;
  for (let i = 0; i < 15; i++) {
    const y = 20 + i * 28;
    const x = 30 + (i * 37) % (w - 100);
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + 40, y);
    ctx.lineTo(x + 35, y - 5);
    ctx.moveTo(x + 40, y);
    ctx.lineTo(x + 35, y + 5);
    ctx.stroke();
  }
}

const PATTERN_DRAWERS = {
  circles: drawPattern_circles, stripes: drawPattern_stripes, rays: drawPattern_rays,
  dots: drawPattern_dots, flame: drawPattern_flame, rings: drawPattern_rings,
  chevron: drawPattern_chevron, zigzag: drawPattern_zigzag, grid: drawPattern_grid,
  lightning: drawPattern_lightning, target: drawPattern_target, lines: drawPattern_lines,
  diamond: drawPattern_diamond, globe: drawPattern_globe, steps: drawPattern_steps,
  crown: drawPattern_crown, coins: drawPattern_coins, speed: drawPattern_speed,
  stars: drawPattern_stars, wave: drawPattern_wave, arrow: drawPattern_arrow
};

/* ─── Icon drawers for each badge ─── */
function drawIcon_perfectScore(ctx, cx, cy, s) {
  ctx.beginPath(); ctx.arc(cx, cy, s, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#0B0E14';
  ctx.beginPath(); ctx.moveTo(cx - s * 0.35, cy + s * 0.05);
  ctx.lineTo(cx - s * 0.12, cy + s * 0.3);
  ctx.lineTo(cx + s * 0.4, cy - s * 0.25);
  ctx.lineWidth = 4; ctx.strokeStyle = '#0B0E14';
  ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.stroke();
}
function drawIcon_lessonMaster(ctx, cx, cy, s) {
  ctx.beginPath();
  ctx.moveTo(cx - s * 0.9, cy + s * 0.6); ctx.lineTo(cx - s * 0.9, cy - s * 0.4);
  ctx.lineTo(cx - s * 0.55, cy - s * 0.1); ctx.lineTo(cx - s * 0.2, cy - s * 0.8);
  ctx.lineTo(cx, cy - s * 0.35); ctx.lineTo(cx + s * 0.2, cy - s * 0.8);
  ctx.lineTo(cx + s * 0.55, cy - s * 0.1); ctx.lineTo(cx + s * 0.9, cy - s * 0.4);
  ctx.lineTo(cx + s * 0.9, cy + s * 0.6); ctx.closePath(); ctx.fill();
}
function drawIcon_star(ctx, cx, cy, s) {
  ctx.beginPath();
  for (let i = 0; i < 5; i++) {
    const a1 = (i * 2 * Math.PI) / 5 - Math.PI / 2;
    const a2 = a1 + Math.PI / 5;
    const ox = cx + s * Math.cos(a1), oy = cy + s * Math.sin(a1);
    const ix = cx + s * 0.4 * Math.cos(a2), iy = cy + s * 0.4 * Math.sin(a2);
    i === 0 ? ctx.moveTo(ox, oy) : ctx.lineTo(ox, oy);
    ctx.lineTo(ix, iy);
  }
  ctx.closePath(); ctx.fill();
}
function drawIcon_flag(ctx, cx, cy, s) {
  ctx.fillRect(cx - s * 0.08, cy - s * 1.1, s * 0.16, s * 2.2);
  ctx.beginPath(); ctx.moveTo(cx + s * 0.1, cy - s * 0.9);
  ctx.lineTo(cx + s * 0.9, cy - s * 0.5); ctx.lineTo(cx + s * 0.1, cy - s * 0.1);
  ctx.closePath(); ctx.fill();
}
function drawIcon_streak7(ctx, cx, cy, s) {
  ctx.beginPath();
  ctx.moveTo(cx, cy - s * 1.6);
  ctx.bezierCurveTo(cx + s * 1.1, cy - s * 0.4, cx + s * 0.8, cy + s * 0.8, cx, cy + s * 0.4);
  ctx.bezierCurveTo(cx - s * 0.8, cy + s * 0.8, cx - s * 1.1, cy - s * 0.4, cx, cy - s * 1.6);
  ctx.closePath(); ctx.fill();
}
function drawIcon_streak30(ctx, cx, cy, s) {
  drawIcon_crown(ctx, cx, cy, s);
}
function drawIcon_crown(ctx, cx, cy, s) {
  ctx.beginPath();
  ctx.moveTo(cx - s * 0.9, cy + s * 0.6); ctx.lineTo(cx - s * 0.9, cy - s * 0.4);
  ctx.lineTo(cx - s * 0.55, cy - s * 0.1); ctx.lineTo(cx - s * 0.2, cy - s * 0.8);
  ctx.lineTo(cx, cy - s * 0.35); ctx.lineTo(cx + s * 0.2, cy - s * 0.8);
  ctx.lineTo(cx + s * 0.55, cy - s * 0.1); ctx.lineTo(cx + s * 0.9, cy - s * 0.4);
  ctx.lineTo(cx + s * 0.9, cy + s * 0.6); ctx.closePath(); ctx.fill();
}
function drawIcon_gavel(ctx, cx, cy, s) {
  ctx.fillRect(cx - s * 0.06, cy - s * 0.2, s * 0.12, s * 1.2);
  ctx.beginPath(); ctx.arc(cx, cy - s * 0.35, s * 0.3, 0, Math.PI * 2); ctx.fill();
}
function drawIcon_fist(ctx, cx, cy, s) {
  ctx.beginPath();
  ctx.arc(cx - s * 0.2, cy + s * 0.3, s * 0.35, 0, Math.PI * 2);
  ctx.arc(cx + s * 0.2, cy + s * 0.3, s * 0.35, 0, Math.PI * 2);
  ctx.arc(cx - s * 0.35, cy - s * 0.1, s * 0.3, 0, Math.PI * 2);
  ctx.arc(cx + s * 0.35, cy - s * 0.1, s * 0.3, 0, Math.PI * 2);
  ctx.arc(cx, cy - s * 0.3, s * 0.35, 0, Math.PI * 2);
  ctx.fill();
}
function drawIcon_brain(ctx, cx, cy, s) {
  ctx.beginPath();
  ctx.arc(cx - s * 0.3, cy - s * 0.1, s * 0.5, 0, Math.PI * 2);
  ctx.arc(cx + s * 0.3, cy - s * 0.1, s * 0.5, 0, Math.PI * 2);
  ctx.arc(cx, cy + s * 0.2, s * 0.6, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#0B0E14';
  ctx.beginPath();
  ctx.arc(cx - s * 0.15, cy - s * 0.05, s * 0.15, 0, Math.PI * 2);
  ctx.arc(cx + s * 0.15, cy - s * 0.05, s * 0.15, 0, Math.PI * 2);
  ctx.fill();
}
function drawIcon_bolt(ctx, cx, cy, s) {
  ctx.beginPath();
  ctx.moveTo(cx - s * 0.3, cy - s);
  ctx.lineTo(cx + s * 0.1, cy - s * 0.1);
  ctx.lineTo(cx, cy + s * 0.1);
  ctx.lineTo(cx + s * 0.4, cy);
  ctx.lineTo(cx + s * 0.1, cy + s);
  ctx.lineTo(cx - s * 0.1, cy + s * 0.1);
  ctx.closePath(); ctx.fill();
}
function drawIcon_bullseye(ctx, cx, cy, s) {
  ctx.beginPath(); ctx.arc(cx, cy, s, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#0B0E14';
  ctx.beginPath(); ctx.arc(cx, cy, s * 0.65, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = ctx.fillStyle2;
  ctx.beginPath(); ctx.arc(cx, cy, s * 0.35, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#0B0E14';
  ctx.beginPath(); ctx.arc(cx, cy, s * 0.12, 0, Math.PI * 2); ctx.fill();
}
function drawIcon_book(ctx, cx, cy, s) {
  ctx.beginPath();
  ctx.moveTo(cx - s * 0.7, cy - s);
  ctx.lineTo(cx + s * 0.7, cy - s);
  ctx.quadraticCurveTo(cx + s * 0.9, cy - s * 0.5, cx + s * 0.7, cy);
  ctx.lineTo(cx - s * 0.5, cy);
  ctx.lineTo(cx - s * 0.7, cy + s * 0.8);
  ctx.lineTo(cx + s * 0.7, cy + s * 0.8);
  ctx.quadraticCurveTo(cx + s * 0.9, cy + s * 0.3, cx + s * 0.7, cy - s * 0.2);
  ctx.lineTo(cx + s * 0.7, cy - s);
  ctx.fill();
  ctx.fillStyle = '#0B0E14';
  ctx.beginPath();
  ctx.arc(cx - s * 0.25, cy - s * 0.2, s * 0.35, 0, Math.PI * 2);
  ctx.fill();
}
function drawIcon_layers(ctx, cx, cy, s) {
  for (let i = 0; i < 3; i++) {
    const yy = cy + s * 0.5 - i * s * 0.35;
    ctx.beginPath();
    ctx.moveTo(cx - s * 0.8, yy - s * 0.05);
    ctx.lineTo(cx, yy - s * 0.3);
    ctx.lineTo(cx + s * 0.8, yy - s * 0.05);
    ctx.lineTo(cx + s * 0.8, yy + s * 0.15);
    ctx.lineTo(cx, yy + s * 0.3);
    ctx.lineTo(cx - s * 0.8, yy + s * 0.15);
    ctx.closePath(); ctx.fill();
  }
}
function drawIcon_globe(ctx, cx, cy, s) {
  ctx.strokeStyle = ctx.fillStyle; ctx.lineWidth = 2.5;
  ctx.beginPath(); ctx.arc(cx, cy, s, 0, Math.PI * 2); ctx.stroke();
  ctx.beginPath(); ctx.ellipse(cx, cy, s, s * 0.35, 0, 0, Math.PI * 2); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(cx, cy - s);
  ctx.quadraticCurveTo(cx + s * 0.5, cy, cx, cy + s); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(cx, cy - s);
  ctx.quadraticCurveTo(cx - s * 0.5, cy, cx, cy + s); ctx.stroke();
  ctx.fillStyle = '#0B0E14';
  ctx.beginPath(); ctx.arc(cx, cy, s * 0.25, 0, Math.PI * 2); ctx.fill();
}
function drawIcon_medal(ctx, cx, cy, s) {
  ctx.beginPath();
  ctx.arc(cx, cy + s * 0.1, s * 0.55, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#0B0E14';
  ctx.font = `bold ${s * 0.5}px sans-serif`;
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText('10', cx, cy + s * 0.15);
  ctx.fillRect(cx - s * 0.06, cy - s * 0.35, s * 0.12, -s * 0.65);
  ctx.beginPath();
  ctx.moveTo(cx - s * 0.08, cy - s);
  ctx.lineTo(cx, cy - s * 0.7);
  ctx.lineTo(cx + s * 0.08, cy - s);
  ctx.closePath(); ctx.fill();
}
function drawIcon_trophy(ctx, cx, cy, s) {
  ctx.beginPath();
  ctx.moveTo(cx - s * 0.5, cy + s * 0.4);
  ctx.quadraticCurveTo(cx - s * 0.7, cy - s * 0.2, cx - s * 0.4, cy - s * 0.3);
  ctx.lineTo(cx - s * 0.2, cy - s * 0.6);
  ctx.lineTo(cx + s * 0.2, cy - s * 0.6);
  ctx.lineTo(cx + s * 0.4, cy - s * 0.3);
  ctx.quadraticCurveTo(cx + s * 0.7, cy - s * 0.2, cx + s * 0.5, cy + s * 0.4);
  ctx.closePath(); ctx.fill();
  ctx.fillRect(cx - s * 0.06, cy + s * 0.35, s * 0.12, s * 0.35);
  ctx.beginPath();
  ctx.moveTo(cx - s * 0.25, cy + s * 0.7);
  ctx.quadraticCurveTo(cx, cy + s * 0.9, cx + s * 0.25, cy + s * 0.7);
  ctx.strokeStyle = ctx.fillStyle; ctx.lineWidth = 2.5; ctx.stroke();
}
function drawIcon_gem(ctx, cx, cy, s) {
  ctx.beginPath();
  ctx.moveTo(cx, cy - s);
  ctx.lineTo(cx + s * 0.7, cy);
  ctx.lineTo(cx, cy + s);
  ctx.lineTo(cx - s * 0.7, cy);
  ctx.closePath(); ctx.fill();
  ctx.beginPath();
  ctx.moveTo(cx, cy - s * 0.5);
  ctx.lineTo(cx + s * 0.35, cy);
  ctx.lineTo(cx, cy + s * 0.5);
  ctx.lineTo(cx - s * 0.35, cy);
  ctx.closePath();
  ctx.fillStyle = '#0B0E14'; ctx.fill();
}
function drawIcon_rocket(ctx, cx, cy, s) {
  ctx.fillStyle2 = ctx.fillStyle;
  ctx.beginPath();
  ctx.moveTo(cx, cy - s * 1.2);
  ctx.lineTo(cx + s * 0.4, cy + s * 0.6);
  ctx.quadraticCurveTo(cx, cy + s * 0.3, cx, cy + s * 0.3);
  ctx.quadraticCurveTo(cx, cy + s * 0.3, cx - s * 0.4, cy + s * 0.6);
  ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#0B0E14';
  ctx.beginPath(); ctx.arc(cx, cy - s * 0.1, s * 0.15, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = ctx.fillStyle2;
  ctx.beginPath();
  ctx.moveTo(cx - s * 0.15, cy + s * 0.55);
  ctx.lineTo(cx, cy + s);
  ctx.lineTo(cx + s * 0.15, cy + s * 0.55);
  ctx.closePath(); ctx.fill();
}
function drawIcon_users(ctx, cx, cy, s) {
  ctx.beginPath();
  ctx.arc(cx - s * 0.25, cy - s * 0.25, s * 0.3, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath();
  ctx.arc(cx + s * 0.35, cy - s * 0.3, s * 0.25, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath();
  ctx.ellipse(cx - s * 0.25, cy + s * 0.55, s * 0.5, s * 0.3, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(cx + s * 0.35, cy + s * 0.55, s * 0.4, s * 0.25, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(cx - s * 0.15, cy + s * 0.3);
  ctx.lineTo(cx + s * 0.25, cy + s * 0.1);
  ctx.lineTo(cx + s * 0.3, cy + s * 0.35);
  ctx.closePath(); ctx.fill();
}
function drawIcon_share(ctx, cx, cy, s) {
  ctx.beginPath();
  ctx.moveTo(cx + s * 0.1, cy - s * 0.5);
  ctx.lineTo(cx + s * 0.7, cy - s * 0.15);
  ctx.lineTo(cx + s * 0.1, cy + s * 0.2);
  ctx.lineTo(cx + s * 0.1, cy - s * 0.05);
  ctx.lineTo(cx - s * 0.6, cy - s * 0.05);
  ctx.lineTo(cx - s * 0.6, cy + s * 0.35);
  ctx.lineTo(cx + s * 0.1, cy + s * 0.35);
  ctx.lineTo(cx + s * 0.1, cy + s * 0.1);
  ctx.lineTo(cx + s * 0.7, cy - s * 0.15);
  ctx.lineTo(cx + s * 0.1, cy - s * 0.5);
  ctx.fill();
}
function drawIcon_arrowup(ctx, cx, cy, s) {
  ctx.beginPath();
  ctx.moveTo(cx, cy - s * 0.9);
  ctx.lineTo(cx + s * 0.4, cy - s * 0.2);
  ctx.lineTo(cx + s * 0.1, cy - s * 0.2);
  ctx.lineTo(cx + s * 0.1, cy + s * 0.9);
  ctx.lineTo(cx - s * 0.1, cy + s * 0.9);
  ctx.lineTo(cx - s * 0.1, cy - s * 0.2);
  ctx.lineTo(cx - s * 0.4, cy - s * 0.2);
  ctx.closePath(); ctx.fill();
}

const ICON_DRAWERS = {
  'perfect-score': drawIcon_perfectScore,
  'lesson-master': drawIcon_lessonMaster,
  'first-lesson': drawIcon_star,
  'first-steps': drawIcon_flag,
  'streak-7': drawIcon_streak7,
  'streak-30': drawIcon_streak30,
  'debate-beginner': drawIcon_gavel,
  'rebuttal-master': drawIcon_fist,
  'logic-master': drawIcon_brain,
  'quick-thinker': drawIcon_bolt,
  'accuracy-ace': drawIcon_bullseye,
  'research-expert': drawIcon_book,
  'quiz-conqueror': drawIcon_layers,
  'global-debater': drawIcon_globe,
  'top-10': drawIcon_medal,
  'top-1': drawIcon_trophy,
  'coin-collector': drawIcon_gem,
  'speed-demon': drawIcon_rocket,
  'referral-star': drawIcon_users,
  'viral-ambassador': drawIcon_share,
  'level-25': drawIcon_arrowup
};

function generateShareCard(badge, userName) {
  const SIZE = 600;
  const canvas = document.createElement('canvas');
  canvas.width = SIZE;
  canvas.height = SIZE;
  const ctx = canvas.getContext('2d');

  const art = getArt(badge);
  const c1 = art.colors[0], c2 = art.colors[1], c3 = art.colors[2];

  // Background gradient
  const bgGrad = ctx.createRadialGradient(300, 280, 50, 300, 280, 450);
  bgGrad.addColorStop(0, art.bg[0]);
  bgGrad.addColorStop(0.6, art.bg[1]);
  bgGrad.addColorStop(1, '#05070a');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, SIZE, SIZE);

  // Core glow
  const coreGlow = ctx.createRadialGradient(300, 220, 20, 300, 220, 200);
  coreGlow.addColorStop(0, `rgba(${parseInt(art.accent.slice(1,3),16)},${parseInt(art.accent.slice(3,5),16)},${parseInt(art.accent.slice(5,7),16)},0.2)`);
  coreGlow.addColorStop(1, 'transparent');
  ctx.fillStyle = coreGlow;
  ctx.fillRect(0, 0, SIZE, SIZE);

  // Pattern
  const patternDrawer = PATTERN_DRAWERS[art.pattern];
  if (patternDrawer) patternDrawer(ctx, art, SIZE, SIZE);

  // Brand
  ctx.fillStyle = 'rgba(255,255,255,0.08)';
  ctx.font = '600 11px "Montserrat", "Helvetica Neue", system-ui, sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  const brand = 'DEB8ER';
  const letterSpacing = 6;
  let bx = 32;
  for (const ch of brand) {
    ctx.fillText(ch, bx, 32);
    bx += ctx.measureText(ch).width + letterSpacing;
  }

  // Icon area
  const cx = 300;
  const iconSize = 68;

  // Outer glow ring
  const ringGrad = ctx.createRadialGradient(cx, 210, iconSize - 5, cx, 210, iconSize + 25);
  ringGrad.addColorStop(0, `rgba(${parseInt(art.accent.slice(1,3),16)},${parseInt(art.accent.slice(3,5),16)},${parseInt(art.accent.slice(5,7),16)},0.25)`);
  ringGrad.addColorStop(0.5, `rgba(${parseInt(art.accent.slice(1,3),16)},${parseInt(art.accent.slice(3,5),16)},${parseInt(art.accent.slice(5,7),16)},0.08)`);
  ringGrad.addColorStop(1, 'transparent');
  ctx.fillStyle = ringGrad;
  ctx.beginPath();
  ctx.arc(cx, 210, iconSize + 25, 0, Math.PI * 2);
  ctx.fill();

  // Icon circle background
  ctx.shadowColor = art.accent;
  ctx.shadowBlur = 20;
  ctx.fillStyle = art.accent;
  ctx.globalAlpha = 0.15;
  ctx.beginPath();
  ctx.arc(cx, 210, iconSize + 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.globalAlpha = 1;

  ctx.fillStyle = '#111827';
  ctx.beginPath();
  ctx.arc(cx, 210, iconSize, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = art.accent;
  ctx.lineWidth = 2.5;
  ctx.globalAlpha = 0.6;
  ctx.beginPath();
  ctx.arc(cx, 210, iconSize, 0, Math.PI * 2);
  ctx.stroke();
  ctx.globalAlpha = 1;

  // Icon
  const drawer = ICON_DRAWERS[badge.id] || drawIcon_star;
  const gradFill = ctx.createLinearGradient(cx - iconSize, 0, cx + iconSize, 0);
  gradFill.addColorStop(0, c1);
  gradFill.addColorStop(0.5, c2);
  gradFill.addColorStop(1, c3);
  ctx.fillStyle = gradFill;
  ctx.shadowColor = art.accent;
  ctx.shadowBlur = 12;
  if (badge.id === 'accuracy-ace') {
    ctx.fillStyle2 = gradFill;
    drawIcon_bullseye(ctx, cx, 210, iconSize * 0.55);
  } else if (badge.id === 'speed-demon') {
    ctx.fillStyle2 = gradFill;
    drawIcon_rocket(ctx, cx, 210, iconSize * 0.55);
  } else if (badge.id === 'book') {
    ctx.fillStyle2 = gradFill;
    drawIcon_book(ctx, cx, 210, iconSize * 0.55);
  } else {
    drawer(ctx, cx, 210, iconSize * 0.55);
  }
  ctx.shadowBlur = 0;

  // Category label
  ctx.fillStyle = 'rgba(255,255,255,0.15)';
  ctx.font = '500 9px "Montserrat", "Helvetica Neue", system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.fillText('— ' + art.category.toUpperCase() + ' —', 300, 278);

  // Badge name
  ctx.textBaseline = 'top';
  const nameX = 300;
  const nameY = 296;

  ctx.shadowColor = art.accent;
  ctx.shadowBlur = 15;
  ctx.globalAlpha = 0.12;
  ctx.fillStyle = art.accent;
  ctx.font = 'bold 38px "Montserrat", "Helvetica Neue", system-ui, sans-serif';
  ctx.fillText(badge.label, nameX, nameY);
  ctx.shadowBlur = 0;
  ctx.globalAlpha = 1;

  const nameGrad = ctx.createLinearGradient(100, 0, 500, 0);
  nameGrad.addColorStop(0, '#FFFFFF');
  nameGrad.addColorStop(0.5, art.accent);
  nameGrad.addColorStop(1, '#FFFFFF');
  ctx.fillStyle = nameGrad;
  ctx.font = 'bold 38px "Montserrat", "Helvetica Neue", system-ui, sans-serif';
  ctx.fillText(badge.label, nameX, nameY);

  // Description
  const descY = 352;
  ctx.fillStyle = 'rgba(255,255,255,0.12)';
  ctx.font = '400 9px "Montserrat", "Helvetica Neue", system-ui, sans-serif';
  ctx.fillText(badge.label.toUpperCase(), 300, descY);

  ctx.fillStyle = 'rgba(255,255,255,0.55)';
  ctx.font = '400 13px "Montserrat", "Helvetica Neue", system-ui, sans-serif';
  ctx.fillText(badge.desc, 300, descY + 16);

  // Divider
  const dividerY = 408;
  const divGrad = ctx.createLinearGradient(140, 0, 460, 0);
  divGrad.addColorStop(0, 'transparent');
  divGrad.addColorStop(0.3, `rgba(${parseInt(art.accent.slice(1,3),16)},${parseInt(art.accent.slice(3,5),16)},${parseInt(art.accent.slice(5,7),16)},0.12)`);
  divGrad.addColorStop(0.5, `rgba(${parseInt(art.accent.slice(1,3),16)},${parseInt(art.accent.slice(3,5),16)},${parseInt(art.accent.slice(5,7),16)},0.25)`);
  divGrad.addColorStop(0.7, `rgba(${parseInt(art.accent.slice(1,3),16)},${parseInt(art.accent.slice(3,5),16)},${parseInt(art.accent.slice(5,7),16)},0.12)`);
  divGrad.addColorStop(1, 'transparent');
  ctx.strokeStyle = divGrad;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(140, dividerY);
  ctx.lineTo(460, dividerY);
  ctx.stroke();

  if (userName) {
    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    ctx.font = '400 14px "Montserrat", "Helvetica Neue", system-ui, sans-serif';
    ctx.fillText('@' + userName, 300, dividerY + 20);
  }

  ctx.fillStyle = 'rgba(255,255,255,0.08)';
  ctx.font = '400 10px "Montserrat", "Helvetica Neue", system-ui, sans-serif';
  ctx.fillText('deb8erglobal.com', 300, 568);

  return canvas.toDataURL('image/png');
}

function shareBadgeCard(badge, userName) {
  const dataUrl = generateShareCard(badge, userName);

  const img = new Image();
  img.onload = () => {
    const c = document.createElement('canvas');
    c.width = img.width;
    c.height = img.height;
    const ctx = c.getContext('2d');
    ctx.drawImage(img, 0, 0);
    c.toBlob((blob) => {
      const file = new File([blob], 'deb8er-badge.png', { type: 'image/png' });
      if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
        navigator.share({
          title: badge.label + ' — Deb8er',
          text: 'I just earned the "' + badge.label + '" badge on Deb8er!',
          files: [file]
        }).catch(function () {});
      } else {
        const link = document.createElement('a');
        link.download = 'deb8er-badge.png';
        link.href = dataUrl;
        link.click();
      }
    }, 'image/png');
  };
  img.src = dataUrl;
}

function showBadgeShareModal(badge, userName) {
  const overlay = document.createElement('div');
  overlay.className = 'badge-modal-overlay';
  overlay.innerHTML =
    '<div class="badge-modal">' +
      '<button class="badge-modal-close"><i class="fas fa-times"></i></button>' +
      '<div class="badge-modal-preview">' +
        '<img src="' + generateShareCard(badge, userName) + '" alt="' + badge.label + '">' +
      '</div>' +
      '<div class="badge-modal-info">' +
        '<div class="badge-modal-name"><i class="' + badge.icon + '"></i> ' + badge.label + '</div>' +
        '<div class="badge-modal-desc">' + badge.desc + '</div>' +
      '</div>' +
      '<button class="badge-modal-share"><i class="fas fa-share-alt"></i> Share</button>' +
    '</div>';

  document.body.appendChild(overlay);
  requestAnimationFrame(function () { overlay.classList.add('open'); });

  overlay.querySelector('.badge-modal-close').addEventListener('click', function () {
    overlay.classList.remove('open');
    setTimeout(function () { overlay.remove(); }, 300);
  });
  overlay.addEventListener('click', function (e) {
    if (e.target === overlay) {
      overlay.classList.remove('open');
      setTimeout(function () { overlay.remove(); }, 300);
    }
  });

  overlay.querySelector('.badge-modal-share').addEventListener('click', function () {
    shareBadgeCard(badge, userName);
  });
}

/* ═══════════════════════════════════════════════
   REFERRAL SHARE CARD
   ═══════════════════════════════════════════════ */

function qrDraw(ctx, link, x, y, size) {
  var qr = qrcode(0, 'L');
  qr.addData(link);
  qr.make();
  var count = qr.getModuleCount();
  var cell = size / count;
  for (var row = 0; row < count; row++) {
    for (var col = 0; col < count; col++) {
      if (qr.isDark(row, col)) {
        ctx.fillStyle = '#1E1B4B';
        ctx.fillRect(x + col * cell, y + row * cell, cell, cell);
      }
    }
  }
}

function generateReferralCard(userName, referralLink) {
  var SIZE = 600;
  var c = document.createElement('canvas');
  c.width = SIZE; c.height = SIZE;
  var ctx = c.getContext('2d');
  var cx = 300;

  var bgGrad = ctx.createRadialGradient(cx, 280, 50, cx, 280, 450);
  bgGrad.addColorStop(0, '#1E1B4B');
  bgGrad.addColorStop(0.6, '#111827');
  bgGrad.addColorStop(1, '#05070a');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, SIZE, SIZE);

  var coreGlow = ctx.createRadialGradient(cx, 220, 20, cx, 220, 200);
  coreGlow.addColorStop(0, 'rgba(166,138,249,0.18)');
  coreGlow.addColorStop(1, 'transparent');
  ctx.fillStyle = coreGlow;
  ctx.fillRect(0, 0, SIZE, SIZE);

  for (var i = 0; i < 8; i++) {
    var angle = (i / 8) * Math.PI * 2;
    ctx.strokeStyle = 'rgba(166,138,249,0.04)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(cx + Math.cos(angle) * 100, 210 + Math.sin(angle) * 100, 70, 0, Math.PI * 2);
    ctx.stroke();
  }

  ctx.fillStyle = 'rgba(255,255,255,0.07)';
  ctx.font = '600 11px "Montserrat", sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  var brand = 'DEB8ER';
  var letterSpacing = 6;
  var bx = 32;
  for (var b = 0; b < brand.length; b++) {
    ctx.fillText(brand[b], bx, 32);
    bx += ctx.measureText(brand[b]).width + letterSpacing;
  }

  var iconSize = 52;
  ctx.shadowColor = '#a68af9';
  ctx.shadowBlur = 20;
  ctx.fillStyle = '#a68af9';
  ctx.globalAlpha = 0.15;
  ctx.beginPath();
  ctx.arc(cx, 180, iconSize + 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.globalAlpha = 1;

  ctx.fillStyle = '#111827';
  ctx.beginPath();
  ctx.arc(cx, 180, iconSize, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = '#a68af9';
  ctx.lineWidth = 2;
  ctx.globalAlpha = 0.5;
  ctx.beginPath();
  ctx.arc(cx, 180, iconSize, 0, Math.PI * 2);
  ctx.stroke();
  ctx.globalAlpha = 1;

  var gradFill = ctx.createLinearGradient(cx - iconSize, 0, cx + iconSize, 0);
  gradFill.addColorStop(0, '#a68af9');
  gradFill.addColorStop(0.5, '#3ABEFF');
  gradFill.addColorStop(1, '#22d3ee');
  ctx.fillStyle = gradFill;
  ctx.shadowColor = '#a68af9';
  ctx.shadowBlur = 12;
  ctx.font = '30px "Font Awesome 6 Free", "FontAwesome", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('\uf06b', cx, 180);
  ctx.shadowBlur = 0;

  ctx.fillStyle = 'rgba(255,255,255,0.15)';
  ctx.font = '500 9px "Montserrat", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.fillText('— INVITE A FRIEND —', cx, 238);

  ctx.shadowColor = '#a68af9';
  ctx.shadowBlur = 15;
  ctx.globalAlpha = 0.12;
  ctx.fillStyle = '#a68af9';
  ctx.font = 'bold 32px "Montserrat", sans-serif';
  ctx.textBaseline = 'top';
  ctx.fillText(userName, cx, 254);
  ctx.shadowBlur = 0;
  ctx.globalAlpha = 1;

  var nameGrad = ctx.createLinearGradient(100, 0, 500, 0);
  nameGrad.addColorStop(0, '#FFFFFF');
  nameGrad.addColorStop(0.5, '#a68af9');
  nameGrad.addColorStop(1, '#FFFFFF');
  ctx.fillStyle = nameGrad;
  ctx.font = 'bold 32px "Montserrat", sans-serif';
  ctx.fillText(userName, cx, 254);

  var qrSize = 170;
  var qrX = cx - qrSize / 2;
  var qrY = 312;
  var qrPad = 8;

  ctx.shadowColor = 'rgba(166,138,249,0.15)';
  ctx.shadowBlur = 20;
  ctx.fillStyle = '#fff';
  roundRect(ctx, qrX - qrPad, qrY - qrPad, qrSize + qrPad * 2, qrSize + qrPad * 2, 12);
  ctx.fill();
  ctx.shadowBlur = 0;

  ctx.strokeStyle = 'rgba(166,138,249,0.15)';
  ctx.lineWidth = 1;
  roundRect(ctx, qrX - qrPad, qrY - qrPad, qrSize + qrPad * 2, qrSize + qrPad * 2, 12);
  ctx.stroke();

  qrDraw(ctx, referralLink, qrX, qrY, qrSize);

  ctx.fillStyle = 'rgba(255,255,255,0.5)';
  ctx.font = '400 12px "Montserrat", sans-serif';
  ctx.textBaseline = 'top';
  ctx.fillText('Scan to join me on Deb8er', cx, qrY + qrSize + 18);

  ctx.fillStyle = 'rgba(255,255,255,0.08)';
  ctx.font = '400 9px "Montserrat", sans-serif';
  ctx.textBaseline = 'top';
  ctx.fillText('deb8erglobal.com', cx, 572);

  return c.toDataURL('image/png');
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function showReferralShareModal(userName, referralCode) {
  var base = window.location.origin;
  var link = base + '/auth.html?ref=' + referralCode;
  var dataUrl = generateReferralCard(userName, link);

  var overlay = document.createElement('div');
  overlay.className = 'badge-modal-overlay';
  overlay.innerHTML =
    '<div class="badge-modal">' +
      '<button class="badge-modal-close"><i class="fas fa-times"></i></button>' +
      '<div class="badge-modal-preview">' +
        '<img src="' + dataUrl + '" alt="Referral QR">' +
      '</div>' +
      '<div class="badge-modal-info">' +
        '<div class="badge-modal-name"><i class="fas fa-gift"></i> Invite a Friend</div>' +
        '<div class="badge-modal-desc">Share this QR code — earn 100 <span class="gem-icon gem-icon--sm"></span> when they join!</div>' +
      '</div>' +
      '<button class="badge-modal-share"><i class="fas fa-share-alt"></i> Share</button>' +
    '</div>';

  document.body.appendChild(overlay);
  requestAnimationFrame(function () { overlay.classList.add('open'); });

  overlay.querySelector('.badge-modal-close').addEventListener('click', function () {
    overlay.classList.remove('open');
    setTimeout(function () { overlay.remove(); }, 300);
  });
  overlay.addEventListener('click', function (e) {
    if (e.target === overlay) {
      overlay.classList.remove('open');
      setTimeout(function () { overlay.remove(); }, 300);
    }
  });

  overlay.querySelector('.badge-modal-share').addEventListener('click', function () {
    canvasToBlob(dataUrl, function (blob) {
      var file = new File([blob], 'deb8er-invite.png', { type: 'image/png' });
      if (navigator.share && navigator.canShare({ files: [file] })) {
        navigator.share({
          title: 'Join me on Deb8er',
          text: 'Learn to debate & master MUN!',
          files: [file]
        }).catch(function () {});
      } else {
        var a = document.createElement('a');
        a.href = dataUrl;
        a.download = 'deb8er-invite.png';
        a.click();
      }
    });
  });
}

function canvasToBlob(dataUrl, cb) {
  var img = new Image();
  img.onload = function () {
    var c = document.createElement('canvas');
    c.width = img.naturalWidth;
    c.height = img.naturalHeight;
    var ctx = c.getContext('2d');
    ctx.drawImage(img, 0, 0);
    c.toBlob(cb, 'image/png');
  };
  img.src = dataUrl;
}
