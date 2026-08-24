(() => {
  const REVIEW_KEY = 'deb8er_lesson_review';
  const container = document.getElementById('reviewContent');
  const loading = document.getElementById('reviewLoading');

  const TYPE_LABELS = {
    'quiz': 'Quiz',
    'practice': 'Practice',
    'true-false': 'True / False',
    'scenario': 'Scenario',
    'spot-mistake': 'Spot the Mistake',
    'highlight': 'Highlight',
    'fill-blank': 'Fill in the Blank',
    'match': 'Match Pairs',
    'order': 'Order Steps',
    'build-argument': 'Build Argument',
    'recap': 'Recap'
  };

  function esc(s) {
    const d = document.createElement('div');
    d.textContent = s;
    return d.innerHTML;
  }

  function render() {
    let raw;
    try { raw = localStorage.getItem(REVIEW_KEY); } catch (_) {}
    if (!raw) {
      loading.innerHTML = `
        <div class="review-empty">
          <i class="fas fa-clipboard-question"></i>
          <p>No review data found. Complete a lesson first.</p>
          <a href="learn.html" class="review-back-btn"><i class="fas fa-arrow-left"></i> Back to Learn</a>
        </div>
      `;
      return;
    }

    let data;
    try { data = JSON.parse(raw); } catch (_) {
      loading.innerHTML = `
        <div class="review-empty">
          <i class="fas fa-triangle-exclamation"></i>
          <p>Review data is corrupted.</p>
          <a href="learn.html" class="review-back-btn"><i class="fas fa-arrow-left"></i> Back to Learn</a>
        </div>
      `;
      return;
    }

    const { lessonTitle, correct, total, xpEarned, wrongAnswers, timestamp } = data;
    const pct = total > 0 ? Math.round(correct / total * 100) : 100;

    let scoreColor;
    if (pct === 100) scoreColor = '#FBBF24';
    else if (pct >= 80) scoreColor = '#34D399';
    else if (pct >= 60) scoreColor = '#3ABEFF';
    else scoreColor = '#F87171';

    const dateStr = timestamp ? new Date(timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '';

    container.innerHTML = `
      <a href="learn.html" class="review-page-back"><i class="fas fa-arrow-left"></i> Back to Learn</a>

      <div class="review-page-header">
        <div class="review-page-icon" style="color:${scoreColor}">
          <i class="fas ${pct === 100 ? 'fa-star' : pct >= 80 ? 'fa-thumbs-up' : pct >= 60 ? 'fa-check' : 'fa-book'}"></i>
        </div>
        <h1 class="review-page-title">Lesson Review</h1>
        <p class="review-page-subtitle">${esc(lessonTitle)}</p>
      </div>

      <div class="review-page-score-bar">
        <div class="review-score-ring">
          <svg viewBox="0 0 80 80">
            <circle cx="40" cy="40" r="34" fill="none" stroke="rgba(255,255,255,0.06)" stroke-width="5"/>
            <circle cx="40" cy="40" r="34" fill="none" stroke="${scoreColor}" stroke-width="5"
              stroke-dasharray="${2 * Math.PI * 34}"
              stroke-dashoffset="${2 * Math.PI * 34}"
              stroke-linecap="round" transform="rotate(-90 40 40)"
              class="review-ring-fill"/>
          </svg>
          <span class="review-score-pct" style="color:${scoreColor}">${pct}%</span>
        </div>
        <div class="review-score-details">
          <div class="review-score-correct">${correct} <span>/ ${total}</span> correct</div>
          <div class="review-score-xp">${xpEarned} XP earned</div>
          ${dateStr ? `<div class="review-score-date">${dateStr}</div>` : ''}
        </div>
      </div>

      ${wrongAnswers.length === 0 ? `
        <div class="review-all-correct">
          <i class="fas fa-trophy"></i>
          <h2>Perfect Score!</h2>
          <p>You didn't miss anything. Great job!</p>
          <a href="learn.html" class="review-back-btn"><i class="fas fa-arrow-left"></i> Back to Learn</a>
        </div>
      ` : `
        <div class="review-page-section-header">
          <h2><i class="fas fa-clipboard-list"></i> Questions You Missed</h2>
          <span class="review-count-badge">${wrongAnswers.length}</span>
        </div>

        <div class="review-page-cards">
          ${wrongAnswers.map((w, i) => `
            <div class="review-page-card" style="animation-delay: ${i * 0.06}s">
              <div class="review-page-card-head">
                <span class="review-page-type">${esc(TYPE_LABELS[w.type] || w.type)}</span>
                <span class="review-page-qnum">Q${i + 1}</span>
              </div>
              <div class="review-page-question">${esc(w.questionText)}</div>
              <div class="review-page-answers">
                <div class="review-page-wrong">
                  <i class="fas fa-times-circle"></i>
                  <span>Your answer: <strong>${esc(w.userAnswerText)}</strong></span>
                </div>
                <div class="review-page-correct">
                  <i class="fas fa-check-circle"></i>
                  <span>Correct: <strong>${esc(w.correctAnswerText)}</strong></span>
                </div>
              </div>
              ${w.explanation ? `
                <div class="review-page-explain">
                  <i class="fas fa-lightbulb"></i>
                  <span>${esc(w.explanation)}</span>
                </div>
              ` : ''}
            </div>
          `).join('')}
        </div>

        <div class="review-page-actions">
          <a href="learn.html" class="review-page-btn primary"><i class="fas fa-book-open"></i> Continue Learning</a>
        </div>
      `}
    `;

    loading.remove();

    // animate ring
    requestAnimationFrame(() => {
      const ring = container.querySelector('.review-ring-fill');
      if (ring) {
        const circ = 2 * Math.PI * 34;
        ring.style.strokeDashoffset = circ - (pct / 100) * circ;
      }
    });
  }

  render();
})();
