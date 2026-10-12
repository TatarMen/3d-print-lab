/* 3D Print Lab · Аналитика. Реальные счетчики активируются ТОЛЬКО после согласия.
   LiveInternet и Rambler загружаются здесь; MyTracker запускается из HEAD после согласия. */
(() => {
  'use strict';
  const KEY = '3dpl.analyticsConsent.v1';
  const valid = new Set(['accepted', 'declined']);
  let installed = false;
  let consent = null;
  const banner = document.getElementById('consent-banner');
  const integrations = ['liveinternet', 'rambler'];
  const asset = name => `./integrations/${name}.html`;

  function makeExecutable(fragment, target) {
    // Коды предоставляются самим владельцем сайта. Не загружать пользовательский HTML.
    const sandbox = document.createElement('div');
    sandbox.innerHTML = fragment;
    // Сначала отображаем картинки/ссылки видимого счётчика, затем исполняем скрипты:
    // это нужно, например, для LiveInternet, который ссылается на id <img>.
    const scripts = [...sandbox.querySelectorAll('script')];
    scripts.forEach(script => script.remove());
    target.append(...sandbox.childNodes);
    scripts.forEach(script => {
      const live = document.createElement('script');
      [...script.attributes].forEach(attr => live.setAttribute(attr.name, attr.value));
      if (!script.hasAttribute('src')) live.textContent = script.textContent;
      target.append(live);
    });
  }

  async function installCounters() {
    if (installed || consent !== 'accepted') return;
    installed = true;
    const slot = document.getElementById('analytics-counter-slot') || document.body;
    for (const provider of integrations) {
      try {
        const response = await fetch(asset(provider), { cache: 'no-store' });
        if (!response.ok) continue;
        const snippet = await response.text();
        if (!snippet.includes('<!-- COUNTER_INSTALLED -->')) continue;
        const mount = document.createElement('span');
        mount.className = 'analytics-provider';
        mount.dataset.provider = provider;
        slot.appendChild(mount);
        makeExecutable(snippet, mount);
      } catch (err) { console.warn('Не удалось загрузить счетчик:', provider, err); }
    }
  }

  function setConsent(state) {
    if (!valid.has(state)) return;
    try { localStorage.setItem(KEY, state); } catch (_) { /* Хранилище может быть недоступно */ }
    const previousConsent = consent;
    consent = state;
    if (banner) banner.hidden = true;
    if (state === 'accepted') {
      // После первого согласия перезагружаем страницу: MyTracker должен стартовать в HEAD.
      if (previousConsent !== 'accepted') { location.reload(); return; }
      installCounters();
    } else if (installed || previousConsent === 'accepted') {
      location.reload(); // Полностью прекращаем работу ранее загруженных счётчиков.
    }
  }

  function emit(name, params = {}) {
    // Названия событий латиницей; ничего не уходит во внешние сервисы до согласия.
    if (!/^[a-z][a-z0-9_]{1,49}$/.test(name)) return;
    const safe = {};
    Object.entries(params).slice(0, 10).forEach(([key, value]) => {
      if (/^[a-z][a-z0-9_]*$/.test(key) && ['string', 'number', 'boolean'].includes(typeof value)) {
        safe[key] = typeof value === 'string' ? value.slice(0, 150) : value;
      }
    });
    window.dispatchEvent(new CustomEvent('3dpl:event', { detail: { name, params: safe } }));
    if (new URLSearchParams(location.search).has('analytics_debug')) {
      console.info('[3D Print Lab] событие:', name, safe, '| согласие:', consent);
    }
    if (consent !== 'accepted') return;
    // MyTracker: https://docs.tracker.my.com/ru/sdk/web/api
    // Задайте СВОЙ id в integrations/mytracker-config.js (не секретный ключ!).
    const id = window.__MYTRACKER_COUNTER_ID__;
    if (id && Array.isArray(window._tmr)) {
      // MyTracker custom goal names may contain only Latin letters and digits.
      const myTrackerGoal = name.replace(/_([a-z0-9])/g, (_, c) => c.toUpperCase());
      window._tmr.push({ id: String(id), type: 'reachGoal', goal: myTrackerGoal, params: safe });
    }
    // Рамблер/Топ-100: параметры визитов (документация help.rambler.ru/top100/poleznye_materialy/1713).
    // Параметр отражает ДЕЙСТВИТЕЛЬНО выполненное действие на странице.
    if (window.top100Counter && typeof window.top100Counter.sendCustomVars === 'function') {
      window.top100Counter.sendCustomVars({ ['3dprintlab::' + name]: 1 });
    }
    // LiveInternet: учитывает посещения через собственный счетчик; это не универсальный API событий.
  }

  document.querySelectorAll('[data-consent]').forEach(button => {
    button.addEventListener('click', () => setConsent(button.dataset.consent));
  });
  document.querySelectorAll('[data-open-consent]').forEach(button => {
    button.addEventListener('click', () => {
      if (banner) { banner.hidden = false; document.getElementById('consent-accept')?.focus(); }
    });
  });
  try { const stored = localStorage.getItem(KEY); if (valid.has(stored)) consent = stored; } catch (_) { }
  if (banner) banner.hidden = consent !== null;
  if (consent === 'accepted') installCounters();
  window.SiteAnalytics = Object.freeze({ emit, getConsent: () => consent, setConsent });
})();
