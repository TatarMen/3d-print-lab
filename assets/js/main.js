(() => {
  'use strict';
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const event = (name, params = {}) => window.SiteAnalytics?.emit(name, params);
  const navToggle = $('#nav-toggle');
  const nav = $('#site-nav');
  navToggle?.addEventListener('click', () => {
    const open = nav?.classList.toggle('open') || false;
    navToggle.setAttribute('aria-expanded', String(open));
    navToggle.setAttribute('aria-label', open ? 'Закрыть меню' : 'Открыть меню');
  });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && nav?.classList.contains('open')) {
      nav.classList.remove('open');
      navToggle?.setAttribute('aria-expanded', 'false');
      navToggle?.focus();
    }
  });
  $$('#site-nav a').forEach(a => a.addEventListener('click', () => nav?.classList.remove('open')));
  $$('[data-track]').forEach(element => element.addEventListener('click', () => {
    event(element.dataset.track, { destination: element.getAttribute('href') || element.dataset.destination || '' });
  }));

  // Фильтрация каталога материалов.
  const materialGrid = $('#materials-grid');
  if (materialGrid) {
    const cards = $$('[data-material]', materialGrid);
    const buttons = $$('[data-filter]');
    const search = $('#material-search');
    let current = 'all';
    function filter(trigger) {
      const term = (search?.value || '').toLocaleLowerCase('ru-RU').trim();
      let visible = 0;
      cards.forEach(card => {
        const matchesCategory = current === 'all' || card.dataset.category.split(' ').includes(current);
        const matchesTerm = card.textContent.toLocaleLowerCase('ru-RU').includes(term);
        const show = matchesCategory && matchesTerm;
        card.hidden = !show;
        if (show) visible++;
      });
      $('#material-count').textContent = `Найдено материалов: ${visible}`;
      $('#material-empty').hidden = visible !== 0;
      if (trigger === 'click') event('material_filter', { category: current, visible });
      if (trigger === 'search' && term.length >= 2) event('material_search', { query_length: term.length, visible });
    }
    buttons.forEach(btn => btn.addEventListener('click', () => {
      current = btn.dataset.filter;
      buttons.forEach(b => b.setAttribute('aria-pressed', String(b === btn)));
      filter('click');
    }));
    let searchDelay;
    search?.addEventListener('input', () => {
      filter('input');
      clearTimeout(searchDelay);
      searchDelay = setTimeout(() => filter('search'), 650);
    });
    filter('input');
  }

  // Калькулятор FDM: расход с учётом поддержек задаётся пользователем.
  const calcForm = $('#calculator-form');
  if (calcForm) {
    const n = name => Number(calcForm.elements.namedItem(name)?.value);
    const rub = value => new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'RUB', maximumFractionDigits: 2 }).format(value);
    calcForm.addEventListener('submit', e => {
      e.preventDefault();
      const mass = n('mass'), spool = n('spool'), price = n('price'), energy = n('energy'), hours = n('hours'), electricity = n('electricity'), extra = n('extra'), margin = n('margin');
      if (![mass, spool, price, energy, hours, electricity, extra, margin].every(Number.isFinite) ||
          mass <= 0 || spool <= 0 || price < 0 || hours < 0 || electricity < 0 || energy < 0 || energy > 5 || extra < 0 || margin < 0 || margin > 500) {
        $('#calculator-error').hidden = false; $('#calculator-result').hidden = true;
        return;
      }
      $('#calculator-error').hidden = true;
      const plastic = mass / spool * price;
      const power = energy * hours * electricity;
      const cost = plastic + power + extra;
      const total = cost * (1 + margin / 100);
      $('#result-total').textContent = rub(total);
      $('#result-plastic').textContent = rub(plastic);
      $('#result-power').textContent = rub(power);
      $('#result-other').textContent = rub(extra);
      $('#result-base').textContent = rub(cost);
      $('#calculator-result').hidden = false;
      $('#calculator-result').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      event('calculator_result', { material: calcForm.elements.namedItem('material').value, mass_grams: mass, estimated_rub: Number(total.toFixed(2)) });
    });
    calcForm.elements.namedItem('material')?.addEventListener('change', e => {
      const price = { pla: 1500, petg: 1700, abs: 1900, tpu: 2800 }[e.target.value];
      if (price) calcForm.elements.namedItem('price').value = price;
      event('calculator_material', { material: e.target.value });
    });
  }

  // Мини-тест с настоящей проверкой ответов без серверной регистрации.
  const quizRoot = $('#quiz-root');
  if (quizRoot) {
    const questions = [
      { q: 'Какая технология чаще всего использует пластиковую нить на катушке?', options: ['SLA', 'FDM', 'SLS'], correct: 1, reason: 'FDM/FFF формирует объект, подавая расплавленный термопластик через сопло.' },
      { q: 'Какой материал обычно легче всего освоить новичку?', options: ['PLA', 'Нейлон', 'Поликарбонат'], correct: 0, reason: 'PLA обычно печатается при сравнительно умеренных температурах и меньше склонен к короблению.' },
      { q: 'Что помогает первой линии лучше прилипать к столу?', options: ['Настройка первого слоя и чистая поверхность', 'Ускорение вентилятора до 100%', 'Случайное изменение G-code'], correct: 0, reason: 'Правильная высота сопла, подготовка поверхности и температура стола особенно важны для первого слоя.' },
      { q: 'Какой файл обычно отправляют в слайсер для FDM-печати?', options: ['MP3', 'STL или 3MF', 'TXT с паролем'], correct: 1, reason: 'Слайсер преобразует 3D-геометрию из STL/3MF и других форматов в команды для принтера.' },
      { q: 'Зачем нужны поддержки (supports)?', options: ['Для удержания значительных нависающих частей модели', 'Чтобы заменить нагрев сопла', 'Чтобы увеличить разрешение монитора'], correct: 0, reason: 'Поддержки временно поддерживают нависающие элементы, которые нельзя надёжно напечатать в воздухе.' },
      { q: 'Какое действие безопаснее после завершения печати?', options: ['Достать горячую деталь без защиты', 'Дождаться охлаждения стола и аккуратно снять модель', 'Потрогать нагретое сопло'], correct: 1, reason: 'Горячее сопло и платформа способны вызвать ожоги — дайте им остыть.' }
    ];
    let index = 0, picks = Array(questions.length).fill(null);
    function render() {
      const finished = index >= questions.length;
      $('#quiz-progress-bar').style.width = `${(finished ? 1 : index / questions.length) * 100}%`;
      $('#quiz-step').textContent = finished ? 'Результат' : `Вопрос ${index + 1} из ${questions.length}`;
      if (finished) {
        const correct = picks.reduce((sum, pick, i) => sum + Number(pick === questions[i].correct), 0);
        $('#quiz-question').textContent = `Ваш результат: ${correct} из ${questions.length}`;
        $('#quiz-answers').replaceChildren();
        const feedback = document.createElement('p'); feedback.className = 'lead';
        feedback.textContent = correct === questions.length ? 'Отлично! Вы уверенно ориентируетесь в основах 3D-печати.' : correct >= 4 ? 'Хороший результат! Есть пара тем, которые можно повторить.' : 'Хорошее начало. Изучите наши инструкции и попробуйте ещё раз.';
        $('#quiz-answers').append(feedback);
        const details = document.createElement('div'); details.className = 'faq';
        questions.forEach((item, i) => {
          const d = document.createElement('details'); const s = document.createElement('summary');
          s.textContent = `${picks[i] === item.correct ? '✓' : '✕'} ${item.q}`; const p = document.createElement('p'); p.textContent = item.reason;
          d.append(s, p); details.append(d);
        });
        $('#quiz-answers').append(details);
        $('#quiz-next').textContent = 'Пройти ещё раз';
        event('quiz_completed', { score: correct, questions: questions.length });
        return;
      }
      const item = questions[index];
      $('#quiz-question').textContent = item.q;
      const answers = $('#quiz-answers'); answers.replaceChildren();
      item.options.forEach((answer, i) => {
        const b = document.createElement('button'); b.type = 'button'; b.className = 'quiz-option';
        b.textContent = answer; b.setAttribute('aria-pressed', String(picks[index] === i));
        b.addEventListener('click', () => {
          picks[index] = i;
          $$('.quiz-option', answers).forEach((option, j) => option.setAttribute('aria-pressed', String(i === j)));
          $('#quiz-next').disabled = false;
          event('quiz_answer', { question_index: index + 1 });
        });
        answers.append(b);
      });
      $('#quiz-next').textContent = index === questions.length - 1 ? 'Узнать результат' : 'Следующий вопрос →';
      $('#quiz-next').disabled = picks[index] === null;
    }
    $('#quiz-next')?.addEventListener('click', () => {
      if (index >= questions.length) { index = 0; picks = Array(questions.length).fill(null); event('quiz_restart'); }
      else if (picks[index] !== null) index++;
      render();
    });
    event('quiz_started'); render();
  }

  // Кнопки печати чек-листа и скачивания файла.
  $$('[data-print-guide]').forEach(button => button.addEventListener('click', () => {
    event('guide_print'); window.print();
  }));
  // Создание текста вопроса без сбора личных данных и фиктивной отправки.
  const contact = $('#contact-form');
  contact?.addEventListener('submit', async e => {
    e.preventDefault();
    if (!contact.reportValidity()) return;
    const topic = contact.elements.namedItem('topic').value;
    const message = contact.elements.namedItem('message').value.slice(0, 1500);
    const draft = `${topic}\n\n${message}`;
    const result = $('#contact-result');
    if (result) result.hidden = false;
    try {
      await navigator.clipboard.writeText(draft);
      result.textContent = 'Текст скопирован в буфер обмена. Это черновик: сообщение никуда не отправлялось.';
    } catch (_) {
      const area = document.createElement('textarea');
      area.className = 'field'; area.rows = 5; area.readOnly = true; area.value = draft;
      result?.replaceChildren(document.createTextNode('Скопируйте подготовленный текст:'), area);
      area.select();
    }
    event('contact_draft', { topic });
  });
})();
