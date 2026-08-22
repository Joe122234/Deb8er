document.addEventListener('DOMContentLoaded', () => {

  const quizQuestions = [
    {
      q: "Your opponent makes a passionate but logically flawed argument. Your first move?",
      options: [
        { text: "Match their energy and shout them down.", points: 1 },
        { text: "Calmly point out the logical fallacy.", points: 3 },
        { text: "Ignore their point and stick to your script.", points: 2 }
      ]
    },
    {
      q: "During a MUN session, a global crisis breaks out. You represent a neutral country. Do you...",
      options: [
        { text: "Stay quiet to avoid making enemies.", points: 1 },
        { text: "Propose a moderate compromise resolution.", points: 3 },
        { text: "Secretly sell weapons to both sides.", points: 2 }
      ]
    },
    {
      q: "What is the most effective way to start a debate speech?",
      options: [
        { text: '"According to the Oxford Dictionary..."', points: 1 },
        { text: "A shocking statistic or powerful anecdote.", points: 3 },
        { text: '"I disagree with my opponent..."', points: 2 }
      ]
    },
    {
      q: "Your partner forgets their line during a team debate. What do you do?",
      options: [
        { text: "Interrupt them and finish their sentence.", points: 1 },
        { text: "Pass them a note with a key bullet point.", points: 3 },
        { text: "Let them figure it out on their own.", points: 2 }
      ]
    },
    {
      q: "How do you handle a Point of Information you don't know the answer to?",
      options: [
        { text: '"That\'s completely irrelevant!"', points: 1 },
        { text: '"I\'ll address that later." (and then don\'t).', points: 2 },
        { text: "Acknowledge it gracefully and pivot slightly.", points: 3 }
      ]
    }
  ];

  let currentQ = 0;
  let score = 0;

  const quizWidgetHTML = `
    <button id="quizWidgetBtn" class="quiz-widget-btn" aria-label="Take the quiz">
      <i class="fas fa-brain"></i>
      <span>Master Debater Quiz</span>
    </button>

    <div id="quizModal" class="quiz-modal" role="dialog" aria-modal="true" aria-label="Debater Skill Assessment">
      <div class="quiz-card">
        <div class="quiz-card-header">
          <div class="quiz-header-left">
            <div class="quiz-header-icon"><i class="fas fa-gavel"></i></div>
            <div class="quiz-header-text">
              <span class="quiz-header-label">Skill Assessment</span>
              <h3>Are You a Master Debater?</h3>
            </div>
          </div>
          <button id="quizCloseBtn" class="quiz-close" aria-label="Close quiz">
            <i class="fas fa-times"></i>
          </button>
        </div>
        <div class="quiz-card-body" id="quizContent"></div>
        <div class="quiz-card-footer" id="quizFooter">
          <div class="quiz-progress-bar-wrap">
            <div class="quiz-progress-bar" id="quizProgressBar"></div>
          </div>
          <span class="quiz-progress-text" id="quizProgress">Question 1 of 5</span>
        </div>
      </div>
    </div>
  `;

  document.body.insertAdjacentHTML('beforeend', quizWidgetHTML);

  const widgetBtn = document.getElementById('quizWidgetBtn');
  const modal = document.getElementById('quizModal');
  const closeBtn = document.getElementById('quizCloseBtn');
  const content = document.getElementById('quizContent');
  const progress = document.getElementById('quizProgress');
  const progressBar = document.getElementById('quizProgressBar');
  const footer = document.getElementById('quizFooter');

  function updateProgress() {
    const pct = (currentQ / quizQuestions.length) * 100;
    progressBar.style.width = pct + '%';
    progress.textContent = 'Question ' + (currentQ + 1) + ' of ' + quizQuestions.length;
  }

  function renderQuestion() {
    if (currentQ >= quizQuestions.length) {
      renderResult();
      return;
    }

    const qData = quizQuestions[currentQ];
    let optionsHtml = '';
    qData.options.forEach((opt, idx) => {
      const letter = String.fromCharCode(65 + idx);
      optionsHtml += '<button class="quiz-option" data-points="' + opt.points + '">' + opt.text + '</button>';
    });

    content.innerHTML = `
      <div class="quiz-question-number">Question ${currentQ + 1}</div>
      <div class="quiz-question-text">${qData.q}</div>
      <div class="quiz-options">${optionsHtml}</div>
    `;

    footer.style.display = 'flex';
    updateProgress();

    content.querySelectorAll('.quiz-option').forEach(btn => {
      btn.addEventListener('click', (e) => {
        score += parseInt(e.target.getAttribute('data-points'));
        currentQ++;
        renderQuestion();
      });
    });
  }

  function renderResult() {
    footer.style.display = 'none';

    let icon = 'fa-fire';
    let title = '';
    let desc = '';

    if (score <= 7) {
      icon = 'fa-bolt';
      title = 'The Loose Cannon';
      desc = 'Raw energy, zero structure. You have the spirit — now sharpen it into unstoppable logic with Deb8er.';
    } else if (score <= 12) {
      icon = 'fa-chess-knight';
      title = 'The Rising Strategist';
      desc = 'You know your way around a debate floor. A few more战术 tweaks and you\'ll be in the elite league.';
    } else {
      icon = 'fa-crown';
      title = 'The Master Diplomat';
      desc = 'Cool, calculated, and razor-sharp. Your logic is flawless. The global stage is waiting for you.';
    }

    content.innerHTML = `
      <div class="quiz-result">
        <div class="quiz-result-badge-wrap">
          <i class="fas ${icon}"></i>
        </div>
        <div class="quiz-result-title">${title}</div>
        <div class="quiz-result-desc">${desc}</div>
        <a href="auth.html" class="quiz-join-btn">
          <span>Join Deb8er</span>
          <i class="fas fa-arrow-right"></i>
        </a>
      </div>
    `;
  }

  widgetBtn.addEventListener('click', () => {
    if (currentQ >= quizQuestions.length) {
      currentQ = 0;
      score = 0;
      footer.style.display = 'flex';
      renderQuestion();
    } else if (currentQ === 0) {
      renderQuestion();
    }
    modal.classList.add('active');
    widgetBtn.style.transform = 'scale(0)';
  });

  closeBtn.addEventListener('click', () => {
    modal.classList.remove('active');
    widgetBtn.style.transform = '';
  });

});
