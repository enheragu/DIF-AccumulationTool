const App = (() => {
  let chartPluginsRegistered = false;

  const state = {
    lang: 'en',
    theme: localStorage.getItem('theme') || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'),
    items: [],
    categories: 5,
    miniCharts: [],
    modalChart: null,
    modalItemIndex: null,
    modalTapStamp: 0,
    viewMode: 'category',
    modalViewMode: 'category',
    lastScoresA: null,
    lastScoresB: null,
    simHistChart: null,
    modalIsHistogram: false,
    modalDefaults: null,
    lastSimulation: null,
  };

  const chartAreaBackgroundPlugin = {
    id: 'chartAreaBackground',
    beforeDraw(chart, _args, options) {
      const { ctx, chartArea } = chart;
      if (!chartArea || !options?.color) return;
      ctx.save();
      ctx.fillStyle = options.color;
      ctx.fillRect(chartArea.left, chartArea.top, chartArea.right - chartArea.left, chartArea.bottom - chartArea.top);
      ctx.restore();
    },
  };

  const i18n = {
    en: {
      introTitle: 'About this tool',
      introText: 'Simulate how small per-item DIF effects accumulate into a systematic total-score difference between two groups in ordered polytomous tests modelled with the GRM.',
      methodTitle: 'How the simulation works',
      methodText: 'Both groups draw θ ~ N(0,1). For each person and item, a response category is sampled from GRM probabilities. In items with DIF, Group B uses different a and/or b parameters, so its response curves differ from Group A\'s even at the same θ. Total score is the sum of item responses. The simulation shows whether these per-item differences accumulate into a detectable group difference in total score.',
      cfgTitle: 'Test setup',
      cfgHint: 'Configure items, categories, and DIF parameters per item.',
      lblItems: 'Number of items',
      lblCats: 'Response categories',
      lblGroupA: 'Group A sample size',
      lblGroupB: 'Group B sample size',
      build: 'Build item parameter forms',
      simulate: 'Run base simulation',
      itemsTitle: 'Item parameters (GRM)',
      itemsHint: 'Each card defines one item. Enable DIF to set Group B curves.',
      viewCategory: 'Category',
      viewCumulative: 'Cumulative',
      chartClickExpand: 'Click to expand',
      close: 'Close',
      difToggle: 'Enable DIF for Group B',
      aA: 'a (Group A)',
      bA: 'b thresholds (A)',
      aB: 'a (Group B)',
      bB: 'b thresholds (B)',
      simSummary: 'Simulation done — Mean total score: Group A = {a}, Group B = {b}, Δ = {d}.',
      simGroupA: 'Group A',
      simGroupB: 'Group B',
      simOutputTitle: 'Simulation output',
      simOutputHint: 'Means and score distribution for the current configuration.',
      simMeanA: 'Mean · Group A',
      simMeanB: 'Mean · Group B',
      simDelta: 'Δ total score',
      simHistTitle: 'Score distribution',
      simNormalA: 'Normal fit · Group A',
      simNormalB: 'Normal fit · Group B',
      simHistX: 'Total score',
      simHistY: 'Proportion',
      simHistExpand: 'Click to expand',
      histModalTitle: 'Score distribution',
      presetTitle: 'Load example',
      presetNoDIF: 'No DIF',
      presetDIF: 'Uniform DIF',
      presetConfirm: 'This will replace the current configuration. Continue?',
      yCategory: 'P(category | θ)',
      yCumulative: 'P(Y ≥ k | θ)',
    },
    es: {
      introTitle: 'Sobre esta herramienta',
      introText: 'Simula cómo pequeños efectos DIF por ítem se acumulan en una diferencia sistemática de puntuación total entre dos grupos en tests politómicos ordenados con el MRG.',
      methodTitle: 'Cómo funciona la simulación',
      methodText: 'Ambos grupos generan θ ~ N(0,1). Para cada persona e ítem se muestrea una categoría a partir de las probabilidades del MRG. En los ítems con DIF, el Grupo B usa parámetros a y/o b distintos, de modo que sus curvas de respuesta difieren de las del Grupo A incluso con el mismo θ. La puntuación total es la suma de las respuestas a los ítems. La simulación muestra si esas diferencias por ítem se acumulan hasta producir una diferencia detectable entre grupos en la puntuación total.',
      cfgTitle: 'Configuración del test',
      cfgHint: 'Configura ítems, categorías y parámetros DIF por ítem.',
      lblItems: 'Número de ítems',
      lblCats: 'Categorías de respuesta',
      lblGroupA: 'Tamaño muestral Grupo A',
      lblGroupB: 'Tamaño muestral Grupo B',
      build: 'Generar formularios de ítems',
      simulate: 'Ejecutar simulación base',
      itemsTitle: 'Parámetros por ítem (GRM)',
      itemsHint: 'Cada tarjeta define un ítem. Activa DIF para fijar curvas del Grupo B.',
      viewCategory: 'Categoría',
      viewCumulative: 'Acumulada',
      chartClickExpand: 'Clic para ampliar',
      close: 'Cerrar',
      difToggle: 'Activar DIF para Grupo B',
      aA: 'a (Grupo A)',
      bA: 'umbrales b (A)',
      aB: 'a (Grupo B)',
      bB: 'umbrales b (B)',
      simSummary: 'Simulación lista — Media total: Grupo A = {a}, Grupo B = {b}, Δ = {d}.',
      simGroupA: 'Grupo A',
      simGroupB: 'Grupo B',
      simOutputTitle: 'Salida de la simulación',
      simOutputHint: 'Medias y distribución de puntuaciones para la configuración actual.',
      simMeanA: 'Media · Grupo A',
      simMeanB: 'Media · Grupo B',
      simDelta: 'Δ puntuación total',
      simHistTitle: 'Distribución de puntuaciones',
      simNormalA: 'Ajuste normal · Grupo A',
      simNormalB: 'Ajuste normal · Grupo B',
      simHistX: 'Puntuación total',
      simHistY: 'Proporción',
      simHistExpand: 'Clic para ampliar',
      histModalTitle: 'Distribución de puntuaciones',
      presetTitle: 'Cargar ejemplo',
      presetNoDIF: 'Sin DIF',
      presetDIF: 'DIF uniforme',
      presetConfirm: '¿Reemplazar la configuración actual?',
      yCategory: 'P(categoría | θ)',
      yCumulative: 'P(Y ≥ k | θ)',
    },
  };

  const PRESETS = {
    nodif: {
      numItems: 8, categories: 5,
      items: [
        { aA:1.8, bA:[-1.7,-0.8, 0.15,1.05], hasDIF:false, aB:1.8, bB:[-1.7,-0.8, 0.15,1.05] },
        { aA:1.4, bA:[-1.05,-0.15, 0.35,1.45], hasDIF:false, aB:1.4, bB:[-1.05,-0.15, 0.35,1.45] },
        { aA:2.0, bA:[-1.95,-1.05,-0.05,0.95], hasDIF:false, aB:2.0, bB:[-1.95,-1.05,-0.05,0.95] },
        { aA:1.6, bA:[-0.9,-0.1, 0.9,1.7], hasDIF:false, aB:1.6, bB:[-0.9,-0.1, 0.9,1.7] },
        { aA:1.3, bA:[-1.55,-0.55, 0.25,1.35], hasDIF:false, aB:1.3, bB:[-1.55,-0.55, 0.25,1.35] },
        { aA:1.9, bA:[-1.45,-0.95, 0.45,1.05], hasDIF:false, aB:1.9, bB:[-1.45,-0.95, 0.45,1.05] },
        { aA:1.5, bA:[-1.25,-0.35, 0.65,1.55], hasDIF:false, aB:1.5, bB:[-1.25,-0.35, 0.65,1.55] },
        { aA:1.7, bA:[-1.0,-0.45, 0.75,1.6], hasDIF:false, aB:1.7, bB:[-1.0,-0.45, 0.75,1.6] },
      ],
    },
    dif: {
      numItems: 8, categories: 5,
      items: [
        { aA:1.8, bA:[-1.7,-0.8, 0.15,1.05], hasDIF:false, aB:1.8, bB:[-1.7,-0.8, 0.15,1.05] },
        { aA:1.4, bA:[-1.05,-0.15, 0.35,1.45], hasDIF:true,  aB:1.15, bB:[-0.35, 0.55, 1.15,2.15] },
        { aA:2.0, bA:[-1.95,-1.05,-0.05,0.95], hasDIF:false, aB:2.0, bB:[-1.95,-1.05,-0.05,0.95] },
        { aA:1.6, bA:[-0.9,-0.1, 0.9,1.7], hasDIF:true,  aB:1.35, bB:[-0.2, 0.65, 1.55,2.45] },
        { aA:1.3, bA:[-1.55,-0.55, 0.25,1.35], hasDIF:false, aB:1.3, bB:[-1.55,-0.55, 0.25,1.35] },
        { aA:1.9, bA:[-1.45,-0.95, 0.45,1.05], hasDIF:true,  aB:1.65, bB:[-0.55, 0.05, 1.2,1.95] },
        { aA:1.5, bA:[-1.25,-0.35, 0.65,1.55], hasDIF:false, aB:1.5, bB:[-1.25,-0.35, 0.65,1.55] },
        { aA:1.7, bA:[-1.0,-0.45, 0.75,1.6], hasDIF:true,  aB:1.25, bB:[-0.15, 0.55, 1.45,2.25] },
      ],
    },
  };

  function t(key, vars = {}) {
    let text = i18n[state.lang][key] || key;
    Object.entries(vars).forEach(([k, v]) => {
      text = text.replace(`{${k}}`, v);
    });
    return text;
  }

  function init() {
    const urlLang = readLangFromUrl();
    if (urlLang) state.lang = urlLang;
    ensureChartPlugins();
    bindControls();
    applyTheme();
    document.getElementById('btn-en').classList.toggle('active', state.lang === 'en');
    document.getElementById('btn-es').classList.toggle('active', state.lang === 'es');
    document.querySelector('.lang-switcher').classList.toggle('lang-es', state.lang === 'es');
    applyLang();
    renderRelatedWork();
    buildItemForms();
    renderItemCharts();
  }

  function readLangFromUrl() {
    const params = new URLSearchParams(window.location.search || '');
    const lang = (params.get('lang') || '').toLowerCase();
    return (lang === 'en' || lang === 'es') ? lang : null;
  }

  function bindControls() {
    document.getElementById('btn-theme').addEventListener('click', toggleTheme);
    const langSwitcher = document.querySelector('.lang-switcher');
    if (langSwitcher) {
      langSwitcher.addEventListener('click', () => {
        setLang(state.lang === 'en' ? 'es' : 'en');
      });
    }

    document.querySelectorAll('[data-step-target]').forEach(btn => {
      btn.addEventListener('click', () => {
        const target = document.getElementById(btn.dataset.stepTarget);
        const step = Number(btn.dataset.step || 0);
        const min = Number(target.min || 0);
        const max = Number(target.max || Number.MAX_SAFE_INTEGER);
        const next = Math.max(min, Math.min(max, Number(target.value || 0) + step));
        target.value = next;
        if (target.id === 'num-items' || target.id === 'num-cats') {
          buildItemForms();
          renderItemCharts();
        }
      });
    });

    ['num-items', 'num-cats'].forEach(id => {
      document.getElementById(id).addEventListener('input', () => {
        buildItemForms();
        renderItemCharts();
      });
    });

    document.getElementById('btn-simulate').addEventListener('click', runSimulation);
    document.getElementById('btn-preset-nodif').addEventListener('click', () => loadPreset('nodif'));
    document.getElementById('btn-preset-dif').addEventListener('click', () => loadPreset('dif'));
    document.getElementById('sim-hist-head').addEventListener('click', openHistModal);

    document.getElementById('btn-view-category').addEventListener('click', () => setViewMode('category'));
    document.getElementById('btn-view-cumulative').addEventListener('click', () => setViewMode('cumulative'));

    document.getElementById('btn-modal-view-category').addEventListener('click', () => setModalViewMode('category'));
    document.getElementById('btn-modal-view-cumulative').addEventListener('click', () => setModalViewMode('cumulative'));

    const modalOverlay = document.getElementById('chart-modal-overlay');
    document.getElementById('btn-close-modal').addEventListener('click', closeModal);
    modalOverlay.addEventListener('click', e => {
      if (e.target === modalOverlay) closeModal();
    });
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape') closeModal();
    });
  }

  function toggleTheme() {
    state.theme = state.theme === 'dark' ? 'light' : 'dark';
    localStorage.setItem('theme', state.theme);
    const button = document.getElementById('btn-theme');
    if (button) {
      button.classList.remove('is-animating');
      void button.offsetWidth;
      button.classList.add('is-animating');
      window.setTimeout(() => button.classList.remove('is-animating'), 280);
    }
    applyTheme();
  }

  function applyTheme() {
    document.body.classList.toggle('dark', state.theme === 'dark');
    const button = document.getElementById('btn-theme');
    button.setAttribute('aria-pressed', String(state.theme === 'dark'));
    renderItemCharts();
    if (state.modalIsHistogram) {
      const mc = document.getElementById('chart-modal-canvas');
      if (state.modalChart) { state.modalChart.destroy(); state.modalChart = null; }
      state.modalChart = renderSimHistogram(state.lastScoresA, state.lastScoresB, mc);
      attachChartInteractions({ canvas: mc, getChart: () => state.modalChart, defaults: state.modalDefaults });
    } else if (state.modalItemIndex !== null) {
      renderModalChart(state.modalItemIndex);
    }
    if (state.lastScoresA) renderSimHistogram(state.lastScoresA, state.lastScoresB);
  }

  function setLang(lang) {
    state.lang = lang;
    document.getElementById('btn-en').classList.toggle('active', lang === 'en');
    document.getElementById('btn-es').classList.toggle('active', lang === 'es');
    document.querySelector('.lang-switcher').classList.toggle('lang-es', lang === 'es');

    const url = new URL(window.location.href);
    url.searchParams.set('lang', lang);
    window.history.replaceState({}, '', url.toString());

    applyLang();
    renderRelatedWork();
    buildItemForms();
    renderItemCharts();
    if (state.lastScoresA) renderSimHistogram(state.lastScoresA, state.lastScoresB);
  }

  function setViewMode(mode) {
    state.viewMode = mode;
    document.getElementById('btn-view-category').classList.toggle('active', mode === 'category');
    document.getElementById('btn-view-cumulative').classList.toggle('active', mode === 'cumulative');
    renderItemCharts();
  }

  function setModalViewMode(mode) {
    state.modalViewMode = mode;
    document.getElementById('btn-modal-view-category').classList.toggle('active', mode === 'category');
    document.getElementById('btn-modal-view-cumulative').classList.toggle('active', mode === 'cumulative');
    if (!state.modalIsHistogram && state.modalItemIndex !== null) {
      renderModalChart(state.modalItemIndex);
    }
  }

  function applyLang() {
    document.getElementById('intro-title').textContent = t('introTitle');
    document.getElementById('intro-text').textContent = t('introText');
    document.getElementById('cfg-title').textContent = t('cfgTitle');
    document.getElementById('cfg-hint').textContent = t('cfgHint');
    document.getElementById('lbl-items').textContent = t('lblItems');
    document.getElementById('lbl-cats').textContent = t('lblCats');
    document.getElementById('lbl-group-a').textContent = t('lblGroupA');
    document.getElementById('lbl-group-b').textContent = t('lblGroupB');
    document.getElementById('btn-simulate').textContent = t('simulate');
    document.getElementById('method-title').textContent = t('methodTitle');
    document.getElementById('method-text').textContent = t('methodText');
    document.getElementById('sim-output-title').textContent = t('simOutputTitle');
    document.getElementById('sim-output-hint').textContent = t('simOutputHint');
    document.getElementById('sim-hist-title').textContent = t('simHistTitle');
    document.getElementById('sim-hist-expand').textContent = t('simHistExpand');
    document.getElementById('lbl-preset').textContent = t('presetTitle');
    document.getElementById('btn-preset-nodif').textContent = t('presetNoDIF');
    document.getElementById('btn-preset-dif').textContent = t('presetDIF');
    document.getElementById('items-title').textContent = t('itemsTitle');
    document.getElementById('items-hint').textContent = t('itemsHint');
    document.getElementById('btn-view-category').textContent = t('viewCategory');
    document.getElementById('btn-view-cumulative').textContent = t('viewCumulative');
    document.getElementById('btn-modal-view-category').textContent = t('viewCategory');
    document.getElementById('btn-modal-view-cumulative').textContent = t('viewCumulative');
    document.getElementById('btn-close-modal').textContent = t('close');
    if (state.lastSimulation) renderSimulationSummary(state.lastSimulation);
  }

  function renderRelatedWork() {
    const root = document.getElementById('related-work-root');
    if (!root || !window.SharedRelatedWork?.init) return;
    window.SharedRelatedWork.init({
      container: root,
      toolId: 'DIF-AccumulationTool',
      lang: state.lang,
    });
  }

  function buildItemForms() {
    const itemCount = clampInt(document.getElementById('num-items').value, 1, 80);
    const categories = clampInt(document.getElementById('num-cats').value, 2, 8);
    state.categories = categories;

    const oldById = new Map(state.items.map(i => [i.id, i]));
    state.items = [];

    const container = document.getElementById('item-forms');
    container.innerHTML = '';

    for (let i = 1; i <= itemCount; i++) {
      const prev = oldById.get(i);
      const item = prev || createDefaultItem(i, categories);
      item.bA = normalizeThresholds(item.bA, categories, item.id, 'A');
      item.bB = normalizeThresholds(item.bB, categories, item.id, 'B');
      state.items.push(item);

      const card = document.createElement('article');
      card.className = 'item-card';
      card.innerHTML = `
        <h3>Item ${i}</h3>
        <div class="item-row">
          <div>
            <label>${t('aA')}</label>
            <input type="number" step="0.01" min="0.2" max="4" data-item="${i}" data-field="aA" value="${item.aA}">
          </div>
          <div>
            <label>${t('bA')}</label>
            <input type="text" data-item="${i}" data-field="bA" value="${item.bA.join(', ')}">
          </div>
        </div>
        <label class="checkbox-row">
          <input type="checkbox" data-item="${i}" data-field="hasDIF" ${item.hasDIF ? 'checked' : ''}>
          <span>${t('difToggle')}</span>
        </label>
        <div class="item-row ${item.hasDIF ? '' : 'hidden'}" data-item-b="${i}">
          <div>
            <label>${t('aB')}</label>
            <input type="number" step="0.01" min="0.2" max="4" data-item="${i}" data-field="aB" value="${item.aB}">
          </div>
          <div>
            <label>${t('bB')}</label>
            <input type="text" data-item="${i}" data-field="bB" value="${item.bB.join(', ')}">
          </div>
        </div>
        <div class="item-chart-wrap" data-open-item="${i}" role="button" tabindex="0" aria-label="Open item ${i} chart">
          <div class="item-chart-head">
            <span>${item.hasDIF ? 'DIF' : 'No DIF'}</span>
            <span>${t('chartClickExpand')}</span>
          </div>
          <div class="item-chart-canvas">
            <canvas id="mini-chart-${i}"></canvas>
          </div>
        </div>
      `;
      container.appendChild(card);
    }

    container.querySelectorAll('input').forEach(input => {
      input.addEventListener('input', onItemInputChange);
      input.addEventListener('change', onItemInputChange);
    });

    container.querySelectorAll('[data-open-item]').forEach(el => {
      const itemId = Number(el.dataset.openItem);
      const open = () => openModal(itemId - 1);
      el.addEventListener('click', open);
      el.addEventListener('keydown', evt => {
        if (evt.key === 'Enter' || evt.key === ' ') {
          evt.preventDefault();
          open();
        }
      });
    });
  }

  function createDefaultItem(id, categories) {
    const aA = Number((0.9 + ((id * 17) % 9) * 0.11).toFixed(2));
    return {
      id,
      aA,
      bA: defaultThresholds(categories, id, 'A'),
      hasDIF: false,
      aB: Number((aA + 0.08).toFixed(2)),
      bB: defaultThresholds(categories, id, 'B'),
    };
  }

  function defaultThresholds(categories, itemId = 1, group = 'A') {
    const n = categories - 1;
    const baseStart = -1.25;
    const baseStep = 2.55 / Math.max(1, n - 1);
    const itemShift = Math.sin(itemId * 1.37) * 0.34;
    const spread = 1 + Math.cos(itemId * 0.83) * 0.12;
    const groupShift = group === 'B' ? 0.18 + Math.sin(itemId * 0.61) * 0.05 : 0;
    const values = Array.from({ length: n }, (_, i) => {
      const wiggle = Math.sin((itemId + i + 1) * 1.11) * 0.08 + Math.cos((itemId - i + 2) * 0.73) * 0.05;
      return Number((baseStart + i * baseStep * spread + itemShift + groupShift + wiggle).toFixed(2));
    });
    return sortThresholds(values);
  }

  function normalizeThresholds(values, categories, itemId = 1, group = 'A') {
    const needed = Math.max(1, categories - 1);
    const parsed = Array.isArray(values)
      ? values.map(Number).filter(Number.isFinite)
      : [];

    if (parsed.length === needed) return sortThresholds(parsed);

    if (parsed.length > needed) {
      return sortThresholds(parsed.slice(0, needed));
    }

    const fallback = defaultThresholds(categories, itemId, group);
    if (!parsed.length) return fallback;

    const merged = parsed.slice();
    for (let i = parsed.length; i < needed; i++) {
      merged.push(fallback[i]);
    }
    return sortThresholds(merged);
  }

  function onItemInputChange(e) {
    const input = e.target;
    const itemId = Number(input.dataset.item);
    const field = input.dataset.field;
    if (!itemId || !field) return;

    const item = state.items.find(x => x.id === itemId);
    if (!item) return;

    if (field === 'hasDIF') {
      item.hasDIF = input.checked;
      const row = document.querySelector(`[data-item-b="${itemId}"]`);
      if (row) row.classList.toggle('hidden', !item.hasDIF);
    } else if (field === 'bA' || field === 'bB') {
      item[field] = parseThresholdCsv(input.value, state.categories, itemId, field === 'bA' ? 'A' : 'B', item[field]);
    } else {
      item[field] = Number(input.value);
    }

    renderItemCharts();
  }

  function parseThresholdCsv(raw, categories, itemId, group, fallback) {
    const needed = Math.max(1, categories - 1);
    const parsed = String(raw || '')
      .split(',')
      .map(x => Number(x.trim()))
      .filter(Number.isFinite)
      .slice(0, needed);

    if (parsed.length === needed) return sortThresholds(parsed);
    return normalizeThresholds(parsed.length ? parsed : fallback, categories, itemId, group);
  }

  function renderItemCharts() {
    state.miniCharts.forEach(c => c.destroy());
    state.miniCharts = [];

    state.items.forEach(item => {
      const canvas = document.getElementById(`mini-chart-${item.id}`);
      if (!canvas) return;
      const chart = buildItemChart(canvas, item, state.viewMode, false);
      state.miniCharts.push(chart);
    });
  }

  function openModal(index) {
    state.modalIsHistogram = false;
    state.modalItemIndex = index;
    const item = state.items[index];
    if (!item) return;

    document.getElementById('chart-modal-title').textContent = `Item ${item.id} curves`;
    document.getElementById('chart-modal-overlay').classList.remove('hidden');
    document.body.style.overflow = 'hidden';
    document.querySelector('.chart-modal-actions .view-toggle').classList.remove('hidden');
    state.modalDefaults = { xMin: -3, xMax: 3, yMin: 0, yMax: 1, mode: 'xy' };

    setModalViewMode(state.viewMode);
  }

  function openHistModal() {
    if (!state.lastScoresA) return;
    state.modalIsHistogram = true;
    state.modalItemIndex = null;
    document.getElementById('chart-modal-title').textContent = t('histModalTitle');
    document.getElementById('chart-modal-overlay').classList.remove('hidden');
    document.body.style.overflow = 'hidden';
    document.querySelector('.chart-modal-actions .view-toggle').classList.add('hidden');
    const canvas = document.getElementById('chart-modal-canvas');
    if (state.modalChart) { state.modalChart.destroy(); state.modalChart = null; }
    const maxScore = state.items.length * (state.categories - 1);
    state.modalDefaults = { xMin: -0.5, xMax: maxScore + 0.5, yMin: 0, yMax: 1, mode: 'x' };
    state.modalChart = renderSimHistogram(state.lastScoresA, state.lastScoresB, canvas);
    attachChartInteractions({ canvas, getChart: () => state.modalChart, defaults: state.modalDefaults });
  }

  function renderModalChart(index) {
    const item = state.items[index];
    if (!item) return;
    if (state.modalChart) state.modalChart.destroy();
    const canvas = document.getElementById('chart-modal-canvas');
    state.modalChart = buildItemChart(canvas, item, state.modalViewMode, true);
    attachChartInteractions({ canvas, getChart: () => state.modalChart, defaults: state.modalDefaults });
  }

  function closeModal() {
    const overlay = document.getElementById('chart-modal-overlay');
    if (overlay.classList.contains('hidden')) return;
    overlay.classList.add('hidden');
    document.body.style.overflow = '';
    if (state.modalChart) {
      state.modalChart.destroy();
      state.modalChart = null;
    }
    detachChartInteractions(document.getElementById('chart-modal-canvas'));
    state.modalItemIndex = null;
    state.modalTapStamp = 0;
    state.modalDefaults = null;
    if (state.modalIsHistogram) {
      state.modalIsHistogram = false;
      document.querySelector('.chart-modal-actions .view-toggle').classList.remove('hidden');
    }
  }

  function buildItemChart(canvas, item, mode, showLegend) {
    const theta = Array.from({ length: 121 }, (_, i) => -3 + i * 0.05);
    const datasets = [];
    const chartTheme = getChartTheme();
    const bA = normalizeThresholds(item.bA, state.categories, item.id, 'A');
    const bB = normalizeThresholds(item.bB, state.categories, item.id, 'B');

    const addGroup = (labelPrefix, a, b, dashed = false) => {
      const curves = mode === 'cumulative'
        ? cumulativeProbabilities(theta, a, b)
        : categoryProbabilities(theta, a, b);

      curves.forEach((vals, c) => {
        datasets.push({
          label: `${labelPrefix} · ${mode === 'cumulative' ? `P≥${c + 1}` : `Cat ${c + 1}`}`,
          data: theta.map((x, i) => ({ x, y: vals[i] })),
          borderColor: palette(c),
          borderWidth: 1.9,
          borderDash: dashed ? [6, 4] : undefined,
          pointRadius: 0,
          tension: .24,
        });
      });
    };

    addGroup('A', item.aA, bA, false);
    if (item.hasDIF) addGroup('B', item.aB, bB, true);

    return new Chart(canvas.getContext('2d'), {
      type: 'line',
      data: { datasets },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: false,
        parsing: false,
        color: chartTheme.text,
        interaction: { mode: 'nearest', intersect: false },
        scales: {
          x: {
            type: 'linear',
            min: -3,
            max: 3,
            title: { display: true, text: 'θ', color: chartTheme.text },
            ticks: { maxTicksLimit: 7, color: chartTheme.text },
            grid: { color: chartTheme.grid },
          },
          y: {
            min: 0,
            max: 1,
            title: { display: true, text: mode === 'cumulative' ? t('yCumulative') : t('yCategory'), color: chartTheme.text },
            ticks: { maxTicksLimit: 5, color: chartTheme.text },
            grid: { color: chartTheme.grid },
          },
        },
        plugins: {
          chartAreaBackground: { color: chartTheme.area },
          legend: { display: showLegend, labels: { boxWidth: 12, font: { size: 11 }, color: chartTheme.text } },
          tooltip: { enabled: showLegend },
        },
      },
    });
  }

  function ensureChartPlugins() {
    if (chartPluginsRegistered || typeof Chart === 'undefined') return;
    Chart.register(chartAreaBackgroundPlugin);
    if (window.ChartZoom) {
      Chart.register(window.ChartZoom);
    }
    chartPluginsRegistered = true;
  }

  function getChartTheme() {
    return state.theme === 'dark'
      ? { text: '#f0f6fc', grid: 'rgba(230, 237, 243, 0.22)', area: '#1b2129' }
      : { text: '#334155', grid: 'rgba(148, 163, 184, 0.28)', area: '#ffffff' };
  }

  function sortThresholds(values) {
    return values.slice().sort((a, b) => a - b).map(v => Number(v.toFixed(2)));
  }

  function attachChartInteractions({ canvas, getChart, defaults, onActivate }) {
    if (!window.SharedChartInteractions?.attach) return;
    window.SharedChartInteractions.attach({ canvas, getChart, defaults, onActivate });
  }

  function detachChartInteractions(canvas) {
    window.SharedChartInteractions?.detach?.(canvas);
  }

  function categoryProbabilities(thetaArray, a, thresholds) {
    const nCats = thresholds.length + 1;
    const probs = Array.from({ length: nCats }, () => []);

    for (const theta of thetaArray) {
      const pStar = [1];
      thresholds.forEach(b => {
        pStar.push(sigmoid(a * (theta - b)));
      });
      pStar.push(0);

      for (let k = 0; k < nCats; k++) {
        probs[k].push(Math.max(0, pStar[k] - pStar[k + 1]));
      }
    }

    return probs;
  }

  function cumulativeProbabilities(thetaArray, a, thresholds) {
    const curves = Array.from({ length: thresholds.length }, () => []);
    for (const theta of thetaArray) {
      for (let k = 0; k < thresholds.length; k++) {
        curves[k].push(sigmoid(a * (theta - thresholds[k])));
      }
    }
    return curves;
  }

  function sigmoid(x) {
    if (x >= 0) {
      const z = Math.exp(-x);
      return 1 / (1 + z);
    }
    const z = Math.exp(x);
    return z / (1 + z);
  }

  function runSimulation() {
    const nA = clampInt(document.getElementById('n-group-a').value, 100, 50000);
    const nB = clampInt(document.getElementById('n-group-b').value, 100, 50000);

    const scoresA = simulateGroupScores(nA, 'A');
    const scoresB = simulateGroupScores(nB, 'B');

    const meanA = mean(scoresA);
    const meanB = mean(scoresB);
    const delta = meanB - meanA;

    state.lastSimulation = { meanA, meanB, delta };
    renderSimulationSummary(state.lastSimulation);
    document.getElementById('sim-results').classList.remove('hidden');
    state.lastScoresA = scoresA;
    state.lastScoresB = scoresB;
    renderSimHistogram(scoresA, scoresB);
  }

  function renderSimulationSummary({ meanA, meanB, delta }) {
    document.getElementById('sim-summary').innerHTML = `
      <div class="sim-badge">
        <span class="sim-badge-label">${t('simMeanA')}</span>
        <span class="sim-badge-value">${meanA.toFixed(3)}</span>
      </div>
      <div class="sim-badge">
        <span class="sim-badge-label">${t('simMeanB')}</span>
        <span class="sim-badge-value">${meanB.toFixed(3)}</span>
      </div>
      <div class="sim-badge delta">
        <span class="sim-badge-label">${t('simDelta')}</span>
        <span class="sim-badge-value">${delta.toFixed(3)}</span>
      </div>`;
  }

  function renderSimHistogram(scoresA, scoresB, targetCanvas) {
    const maxScore = state.items.length * (state.categories - 1);
    const numBins = maxScore + 1;
    const freqA = new Array(numBins).fill(0);
    const freqB = new Array(numBins).fill(0);
    scoresA.forEach(s => { if (s >= 0 && s <= maxScore) freqA[s]++; });
    scoresB.forEach(s => { if (s >= 0 && s <= maxScore) freqB[s]++; });
    const propA = freqA.map(f => f / scoresA.length);
    const propB = freqB.map(f => f / scoresB.length);
    const labels = Array.from({ length: numBins }, (_, i) => i);
    const meanA = mean(scoresA);
    const meanB = mean(scoresB);
    const sdA = stdDev(scoresA, meanA);
    const sdB = stdDev(scoresB, meanB);
    const normA = labels.map(x => normalPdf(x, meanA, sdA));
    const normB = labels.map(x => normalPdf(x, meanB, sdB));

    if (!targetCanvas) {
      const block = document.getElementById('sim-hist-block');
      block.classList.remove('hidden');
    }

    const canvas = targetCanvas || document.getElementById('sim-hist-canvas');
    if (!targetCanvas) {
      if (state.simHistChart) { state.simHistChart.destroy(); state.simHistChart = null; }
    }

    const theme = getChartTheme();
    const chart = new Chart(canvas.getContext('2d'), {
      type: 'bar',
      data: {
        labels,
        datasets: [
          {
            label: t('simGroupA'),
            data: propA,
            backgroundColor: 'rgba(88,166,255,0.55)',
            borderColor: '#58a6ff',
            borderWidth: 1,
            barPercentage: 1.0,
            categoryPercentage: 1.0,
          },
          {
            label: t('simGroupB'),
            data: propB,
            backgroundColor: 'rgba(248,81,73,0.40)',
            borderColor: '#f85149',
            borderWidth: 1,
            barPercentage: 1.0,
            categoryPercentage: 1.0,
          },
          {
            type: 'line',
            label: t('simNormalA'),
            data: normA,
            borderColor: '#58a6ff',
            borderWidth: 2,
            borderDash: [7, 4],
            pointRadius: 0,
            pointHoverRadius: 0,
            tension: 0.22,
          },
          {
            type: 'line',
            label: t('simNormalB'),
            data: normB,
            borderColor: '#f85149',
            borderWidth: 2,
            borderDash: [7, 4],
            pointRadius: 0,
            pointHoverRadius: 0,
            tension: 0.22,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: false,
        plugins: {
          chartAreaBackground: { color: theme.area },
          legend: {
            labels: {
              color: theme.text,
              boxWidth: 12,
              padding: 18,
              usePointStyle: true,
              pointStyleWidth: 14,
            },
          },
          tooltip: {
            callbacks: {
              label: ctx => `${ctx.dataset.label}: ${(ctx.parsed.y * 100).toFixed(1)} %`,
            },
          },
        },
        scales: {
          x: {
            title: { display: true, text: t('simHistX'), color: theme.text },
            ticks: { color: theme.text, maxTicksLimit: 14 },
            grid: { color: theme.grid },
          },
          y: {
            title: { display: true, text: t('simHistY'), color: theme.text },
            ticks: { color: theme.text, callback: v => `${(v * 100).toFixed(0)} %` },
            grid: { color: theme.grid },
          },
        },
      },
    });

    const defaults = { xMin: -0.5, xMax: maxScore + 0.5, yMin: 0, yMax: 1, mode: 'x' };
    if (!targetCanvas) state.simHistChart = chart;
    attachChartInteractions({
      canvas,
      getChart: () => targetCanvas ? state.modalChart : state.simHistChart,
      defaults,
      onActivate: targetCanvas ? null : openHistModal,
    });
    return chart;
  }

  function clearSimHistogram() {
    if (state.simHistChart) { state.simHistChart.destroy(); state.simHistChart = null; }
    document.getElementById('sim-hist-block')?.classList.add('hidden');
    document.getElementById('sim-results')?.classList.add('hidden');
    document.getElementById('sim-summary').innerHTML = '';
    state.lastScoresA = null;
    state.lastScoresB = null;
    state.lastSimulation = null;
  }

  function simulateGroupScores(n, group) {
    const out = [];
    for (let i = 0; i < n; i++) {
      const theta = randn();
      let total = 0;
      for (const item of state.items) {
        const useB = group === 'B' && item.hasDIF;
        const a = useB ? item.aB : item.aA;
        const b = normalizeThresholds(useB ? item.bB : item.bA, state.categories, item.id, useB ? 'B' : 'A');
        const probs = categoryProbabilities([theta], a, b).map(arr => arr[0]);
        total += sampleCategory(probs);
      }
      out.push(total);
    }
    return out;
  }

  function sampleCategory(probabilities) {
    const r = Math.random();
    let acc = 0;
    for (let i = 0; i < probabilities.length; i++) {
      acc += probabilities[i];
      if (r <= acc) return i;
    }
    return probabilities.length - 1;
  }

  function randn() {
    let u = 0, v = 0;
    while (u === 0) u = Math.random();
    while (v === 0) v = Math.random();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  }

  function mean(values) {
    if (!values.length) return 0;
    return values.reduce((sum, value) => sum + value, 0) / values.length;
  }

  function stdDev(values, meanValue = mean(values)) {
    if (values.length < 2) return 0;
    const variance = values.reduce((acc, value) => acc + ((value - meanValue) ** 2), 0) / values.length;
    return Math.sqrt(Math.max(variance, 0));
  }

  function normalPdf(x, mu, sigma) {
    if (!(sigma > 0)) return 0;
    const z = (x - mu) / sigma;
    return Math.exp(-0.5 * z * z) / (sigma * Math.sqrt(2 * Math.PI));
  }

  function palette(idx) {
    const colors = ['#58a6ff', '#3fb950', '#bc8cff', '#d29922', '#f85149', '#6e7681', '#79c0ff'];
    return colors[idx % colors.length];
  }

  function clampInt(value, min, max) {
    const n = Math.round(Number(value));
    if (!Number.isFinite(n)) return min;
    return Math.max(min, Math.min(max, n));
  }

  function loadPreset(presetId) {
    if (!window.confirm(t('presetConfirm'))) return;
    const preset = PRESETS[presetId];
    if (!preset) return;
    document.getElementById('num-items').value = preset.numItems;
    document.getElementById('num-cats').value = preset.categories;
    buildItemForms();
    preset.items.forEach((pi, i) => {
      const item = state.items[i];
      if (!item) return;
      const idx = item.id;
      item.aA = pi.aA;  item.bA = pi.bA.slice();
      item.hasDIF = pi.hasDIF;
      item.aB = pi.aB;  item.bB = pi.bB.slice();
      document.querySelector(`input[data-item="${idx}"][data-field="aA"]`).value = pi.aA;
      document.querySelector(`input[data-item="${idx}"][data-field="bA"]`).value = pi.bA.join(', ');
      const chk = document.querySelector(`input[data-item="${idx}"][data-field="hasDIF"]`);
      chk.checked = pi.hasDIF;
      const bRow = document.querySelector(`[data-item-b="${idx}"]`);
      if (bRow) bRow.classList.toggle('hidden', !pi.hasDIF);
      const wrap = document.querySelector(`[data-open-item="${idx}"] .item-chart-head span:first-child`);
      if (wrap) wrap.textContent = pi.hasDIF ? 'DIF' : 'No DIF';
      document.querySelector(`input[data-item="${idx}"][data-field="aB"]`).value = pi.aB;
      document.querySelector(`input[data-item="${idx}"][data-field="bB"]`).value = pi.bB.join(', ');
    });
    renderItemCharts();
    document.getElementById('sim-summary').innerHTML = '';
    closeModal();
    clearSimHistogram();
  }

  document.addEventListener('DOMContentLoaded', init);
  return { setLang, toggleTheme };
})();
