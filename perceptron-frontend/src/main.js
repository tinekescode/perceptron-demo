import './style.css';
import { andModel, xorModel } from './models.js';
import { renderNetwork } from './network-view.js';
import { drawMap, fromFraction, renderOverlay, MIN, MAX } from './map-view.js';
import { renderCalc } from './calc-view.js';
import { baseRate, buildFrames, frameLabel, predictCorners, renderTimeline, updateTimeline } from './playback.js';
import { fmt, sub } from './format.js';

const CONFIGS = {
  and: {
    label: 'AND',
    subtitle: 'single perceptron',
    project: 'perceptron-demo',
    port: 8080,
    endpoint: '/api/and/perceptron/run',
    build: andModel,
    intro: `A single perceptron multiplies each input by a weight, adds a bias, and outputs 1 when that
      sum <i>z</i> is at least 0. The inputs where <i>z</i> = 0 form a straight line, so a perceptron can only
      separate the classes with one straight line. That's enough for AND: (1, 1) is on one side and the other three points are on the other.
      Press <b>Play</b> to watch it learn, one training example at a time.`,
  },
  xor: {
    label: 'XOR',
    subtitle: 'multi-layer perceptron',
    project: 'perceptron-mlp',
    port: 8081,
    endpoint: '/api/xor/perceptron/run',
    build: xorModel,
    intro: `For XOR, the 1s are on opposite corners, so no single straight line can separate them.
      Each hidden neuron draws its own soft line (click one in the network to see it). The output neuron
      combines these into a curved region that does separate the classes. The network learns all of the weights with backpropagation.
      Press <b>Play</b> to watch it learn, one epoch at a time.`,
  },
};

const SPEEDS = [0.25, 0.5, 1, 2, 4];

const state = {
  active: 'and',
  runs: { and: null, xor: null }, // { response, frames, index, playing, speed }
  status: { and: 'idle', xor: 'idle' }, // idle | loading | ok | error
  error: { and: null, xor: null },
  input: { and: [0, 0], xor: [0, 1] },
  mapSource: { and: 'out', xor: 'out' }, // 'out' or index of a hidden neuron
};

const app = document.querySelector('#app');
app.innerHTML = `
  <header class="top">
    <div>
      <h1>Perceptron Visualizer</h1>
      <p class="subtitle">See how a single perceptron learns AND, and why XOR needs a hidden layer.</p>
    </div>
    <nav class="tabs" role="tablist">
      ${Object.entries(CONFIGS)
        .map(
          ([kind, c]) => `
          <button role="tab" data-kind="${kind}">
            ${c.label} <small>${c.subtitle} · :${c.port}</small>
          </button>`,
        )
        .join('')}
    </nav>
  </header>
  <main id="view"></main>
`;
const view = document.querySelector('#view');

app.querySelectorAll('[role=tab]').forEach((tab) =>
  tab.addEventListener('click', () => activate(tab.dataset.kind)),
);

function activate(kind) {
  if (state.runs[state.active]) pause();
  state.active = kind;
  app.querySelectorAll('[role=tab]').forEach((tab) =>
    tab.setAttribute('aria-selected', String(tab.dataset.kind === kind)),
  );
  renderView();
  if (state.status[kind] === 'idle') train(kind);
}

async function train(kind) {
  if (state.runs[kind]) state.runs[kind].playing = false;
  state.status[kind] = 'loading';
  state.error[kind] = null;
  if (kind === state.active) renderView();
  try {
    const res = await fetch(CONFIGS[kind].endpoint, { method: 'POST' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const response = await res.json();
    const speed = state.runs[kind]?.speed ?? 1;
    state.runs[kind] = { response, frames: buildFrames(kind, response), index: 0, playing: false, speed };
    state.status[kind] = 'ok';
  } catch (err) {
    state.status[kind] = 'error';
    state.error[kind] = err.message;
  }
  if (kind !== state.active) return;
  renderView();
  if (state.status[kind] === 'ok') play();
}

// ---------------------------------------------------------------------------
// Frames and playback

/** The forward-pass model for a frame, built once and cached on the frame. */
function modelAt(run, index) {
  const frame = run.frames[index];
  frame.model ??= CONFIGS[state.active].build(frame.snapshot);
  return frame.model;
}

const currentRun = () => state.runs[state.active];
const framesPerSecond = (run) => baseRate(state.active, run.frames.length) * run.speed;

let rafId = 0;
let lastTime = 0;
let pending = 0; // fractional frames carried over between animation frames

function play() {
  const run = currentRun();
  if (!run) return;
  if (run.index >= run.frames.length - 1) run.index = 0; // replay from the start
  run.playing = true;
  lastTime = performance.now();
  pending = 0;
  cancelAnimationFrame(rafId);
  rafId = requestAnimationFrame(tick);
  updateFrame();
}

function pause() {
  const run = currentRun();
  cancelAnimationFrame(rafId);
  if (!run || !run.playing) return;
  run.playing = false;
  updateFrame(); // repaints the map at full resolution
}

function tick(now) {
  const run = currentRun();
  if (!run || !run.playing) return;
  pending += ((now - lastTime) / 1000) * framesPerSecond(run);
  lastTime = now;
  const advance = Math.floor(pending);
  if (advance > 0) {
    pending -= advance;
    run.index = Math.min(run.frames.length - 1, run.index + advance);
    if (run.index === run.frames.length - 1) run.playing = false;
    updateFrame();
  }
  if (run.playing) rafId = requestAnimationFrame(tick);
}

/** Jumps to a frame. Any manual navigation pauses playback. */
function seek(index) {
  const run = currentRun();
  run.playing = false;
  cancelAnimationFrame(rafId);
  run.index = Math.max(0, Math.min(run.frames.length - 1, index));
  updateFrame();
}

// ---------------------------------------------------------------------------
// Rendering

function statsHtml(kind, r) {
  const items =
    kind === 'and'
      ? [['Epochs', r.epochsTrained], ['Learning rate', r.learningRate]]
      : [
          ['Architecture', r.architecture],
          ['Epochs', r.epochsTrained.toLocaleString('en')],
          ['Learning rate', r.learningRate],
          ['Final loss', r.averageLoss.toPrecision(3)],
        ];
  items.push(['Learned', r.learned ? '<span class="ok">Yes ✓</span>' : '<span class="bad">No ✗</span>']);
  return items.map(([k, v]) => `<div><dt>${k}</dt><dd>${v}</dd></div>`).join('');
}

function statusHtml(kind) {
  const { port } = CONFIGS[kind];
  switch (state.status[kind]) {
    case 'loading':
      return `<span class="status loading">Training…</span>`;
    case 'ok':
      return `<span class="status ok">Connected to :${port}</span>`;
    case 'error':
      return `<span class="status error">Backend not reachable</span>`;
    default:
      return '';
  }
}

function playerHtml(kind, run) {
  const unit = kind === 'and' ? 'training step' : 'epoch';
  return `
    <section class="card player" aria-label="Training playback">
      <div class="player-controls">
        <button class="icon" data-act="start" title="Back to the start" aria-label="Back to the start">⏮</button>
        <button class="icon" data-act="prev" title="Previous ${unit} (←)" aria-label="Previous ${unit}">⏴</button>
        <button class="primary play" data-act="play" id="play"></button>
        <button class="icon" data-act="next" title="Next ${unit} (→)" aria-label="Next ${unit}">⏵</button>
        <button class="icon" data-act="end" title="Jump to the trained network" aria-label="Jump to the end">⏭</button>
        <input type="range" id="scrub" min="0" max="${run.frames.length - 1}" step="1" aria-label="Training progress">
        <label class="speed">Speed
          <select id="speed">
            ${SPEEDS.map((s) => `<option value="${s}" ${s === run.speed ? 'selected' : ''}>${s}×</option>`).join('')}
          </select>
        </label>
      </div>
      <p class="frame-label" id="frame-label" aria-live="polite"></p>
      <div id="timeline"></div>
    </section>`;
}

function renderView() {
  const kind = state.active;
  const cfg = CONFIGS[kind];
  const run = state.runs[kind];

  const error =
    state.status[kind] === 'error'
      ? `<div class="error-box">
          <strong>Can't reach <code>${cfg.project}</code> on port ${cfg.port}</strong> (${state.error[kind]}).
          Start it in a terminal, then click <b>Train</b>:
          <pre>cd ${cfg.project}\nmvn quarkus:dev</pre>
        </div>`
      : '';

  const sourceSwitch =
    kind === 'xor' && run
      ? `<div class="segmented" role="group" aria-label="Show in input space">
          <button data-source="out">Output</button>
          ${Array.from({ length: modelAt(run, 0).hiddenSize }, (_, j) => `<button data-source="${j}">h${sub(j + 1)}</button>`).join('')}
        </div>`
      : '';

  view.innerHTML = `
    <section class="toolbar">
      <button class="primary" id="train" ${state.status[kind] === 'loading' ? 'disabled' : ''}>
        ${run ? 'Train again' : 'Train'}
      </button>
      ${statusHtml(kind)}
      ${run ? `<dl class="stats">${statsHtml(kind, run.response)}</dl>` : ''}
    </section>
    <p class="intro">${cfg.intro}</p>
    ${error}
    ${
      run
        ? `${playerHtml(kind, run)}
          <div class="grid">
            <article class="card">
              <h2>Network</h2>
              <svg id="net" viewBox="0 0 560 320" role="img" aria-label="Network diagram"></svg>
              <ul class="legend">
                <li><span class="swatch line pos"></span>positive weight</li>
                <li><span class="swatch line neg"></span>negative weight</li>
                <li>thicker = larger weight</li>
                <li>faded = little signal flowing in</li>
                <li><span class="swatch node"></span>fill = activation</li>
                ${kind === 'and' ? '<li><span class="swatch changed"></span>just changed</li>' : ''}
              </ul>
            </article>
            <article class="card">
              <h2>Input space</h2>
              ${sourceSwitch}
              <div class="map">
                <canvas id="map"></canvas>
                <svg id="overlay" viewBox="0 0 320 320" role="img" aria-label="Input space"></svg>
              </div>
              <ul class="legend">
                <li><span class="swatch cls0"></span><span id="legend0"></span></li>
                <li><span class="swatch cls1"></span><span id="legend1"></span></li>
                <li><span class="swatch line boundary"></span><span id="legend-line"></span></li>
                ${kind === 'and' ? '<li><span class="swatch training"></span>example being trained on</li><li><span class="swatch line ghost"></span>line before the update</li>' : ''}
              </ul>
              <p class="hint">Click or drag anywhere to feed that input through the network.</p>
            </article>
            <article class="card">
              <h2 id="calc-title"></h2>
              <div id="calc"></div>
            </article>
            <article class="card">
              <h2>Truth table</h2>
              <table class="truth" id="table"></table>
              <p class="hint">${
                kind === 'and'
                  ? 'Every training run starts from new random weights. Click <b>Train again</b> for a different run.'
                  : 'The random seed is fixed (42), so every training run learns the same weights.'
              }</p>
            </article>
          </div>`
        : ''
    }
  `;

  view.querySelector('#train').addEventListener('click', () => train(kind));
  mapResizeObserver.disconnect();
  if (!run) return;

  bindPlayer(run);
  view.querySelectorAll('[data-source]').forEach((btn) =>
    btn.addEventListener('click', () => {
      const v = btn.dataset.source;
      selectMapSource(v === 'out' ? 'out' : Number(v));
    }),
  );
  bindMapPointer(view.querySelector('#overlay'));
  updateFrame();
  mapResizeObserver.observe(view.querySelector('#map'));
}

function bindPlayer(run) {
  const actions = {
    start: () => seek(0),
    prev: () => seek(run.index - 1),
    play: () => (run.playing ? pause() : play()),
    next: () => seek(run.index + 1),
    end: () => seek(run.frames.length - 1),
  };
  view.querySelectorAll('[data-act]').forEach((btn) => btn.addEventListener('click', actions[btn.dataset.act]));
  view.querySelector('#scrub').addEventListener('input', (e) => seek(Number(e.target.value)));
  view.querySelector('#speed').addEventListener('change', (e) => {
    run.speed = Number(e.target.value);
  });
  renderTimeline(view.querySelector('#timeline'), state.active, run.frames, seek);
}

// Space plays/pauses, arrow keys step, unless the user is typing in or operating a control
document.addEventListener('keydown', (e) => {
  const run = currentRun();
  if (!run || e.ctrlKey || e.metaKey || e.altKey) return;
  if (e.target.closest('input, select, textarea, button, [tabindex]')) return;
  if (e.key === ' ') {
    e.preventDefault();
    run.playing ? pause() : play();
  } else if (e.key === 'ArrowLeft') {
    seek(run.index - 1);
  } else if (e.key === 'ArrowRight') {
    seek(run.index + 1);
  }
});

// Repaint the input space at full resolution when its on-screen size changes
const mapResizeObserver = new ResizeObserver(([entry]) => {
  const canvas = entry.target;
  if (canvas.width !== Math.round(canvas.clientWidth * (window.devicePixelRatio || 1))) updateMap();
});

/** Everything that depends on the current frame. */
function updateFrame() {
  const kind = state.active;
  const run = currentRun();
  const frame = run.frames[run.index];

  // In AND, follow the example being trained on so the calculation shows that step
  if (frame.step) state.input[kind] = frame.step.inputs;

  const predictions = predictCorners(kind, modelAt(run, run.index));
  const last = run.frames.length - 1;
  view.querySelector('#play').textContent = run.playing ? '⏸ Pause' : run.index === last ? '↻ Replay' : '▶ Play';
  view.querySelector('#scrub').value = run.index;
  view.querySelector('[data-act=prev]').disabled = run.index === 0;
  view.querySelector('[data-act=start]').disabled = run.index === 0;
  view.querySelector('[data-act=next]').disabled = run.index === last;
  view.querySelector('[data-act=end]').disabled = run.index === last;
  view.querySelector('#frame-label').innerHTML = frameLabel(kind, run.frames, run.index, predictions);
  updateTimeline(view.querySelector('#timeline'), kind, run.frames, run.index);

  updateMap();
  updateDynamic(predictions);
}

function selectMapSource(source) {
  state.mapSource[state.active] = source;
  updateMap();
  updateDynamic();
}

/** Repaints the input-space background. Only needed when the weights or the shown neuron change. */
function updateMap() {
  const kind = state.active;
  const run = currentRun();
  const model = modelAt(run, run.index);
  const source = state.mapSource[kind];
  const valueAt =
    source === 'out' ? (x1, x2) => model.forward([x1, x2]).y : (x1, x2) => model.forward([x1, x2]).hidden[source].a;
  // Fast playback redraws many times per second, so use fewer pixels until it stops
  const resolution = run.playing && kind === 'xor' && framesPerSecond(run) > 10 ? 0.5 : 1;
  drawMap(view.querySelector('#map'), valueAt, resolution);

  const name = source === 'out' ? 'output' : `h${sub(source + 1)}`;
  const boundary =
    kind === 'and' ? 'decision boundary (z = 0)' : source === 'out' ? 'decision boundary (output = 0.5)' : `line where ${name} = 0.5 (its z = 0)`;
  view.querySelector('#legend0').textContent = `${name} near 0`;
  view.querySelector('#legend1').textContent = `${name} near 1`;
  view.querySelector('#legend-line').textContent = boundary;
  view.querySelectorAll('[data-source]').forEach((btn) =>
    btn.setAttribute('aria-pressed', String(btn.dataset.source === String(source))),
  );
}

/** Everything that depends on the selected input. Cheap enough to run on every pointer move. */
function updateDynamic(predictions) {
  const kind = state.active;
  const run = currentRun();
  const frame = run.frames[run.index];
  const model = modelAt(run, run.index);
  const previous = run.index > 0 ? run.frames[run.index - 1].snapshot : null;
  const x = state.input[kind];
  const mapSource = state.mapSource[kind];
  const active = frame.step?.inputs;
  predictions ??= predictCorners(kind, model);

  renderNetwork(view.querySelector('#net'), {
    kind, weights: frame.snapshot, previous, model, x, mapSource, onSelect: selectMapSource,
  });
  const ghost = frame.phase === 'update' ? frame.before : null;
  renderOverlay(view.querySelector('#overlay'), { predictions, x, active, ghost });
  view.querySelector('#calc-title').textContent = `Calculation for x = (${fmt(x[0], 2)}, ${fmt(x[1], 2)})`;
  renderCalc(view.querySelector('#calc'), {
    kind, weights: frame.snapshot, frame, learningRate: run.response.learningRate, model, x, mapSource,
  });
  renderTable(view.querySelector('#table'), kind, predictions, x, active);
}

function renderTable(table, kind, predictions, x, active) {
  const xor = kind === 'xor';
  table.innerHTML = `
    <thead><tr>
      <th>x₁</th><th>x₂</th><th>expected</th>${xor ? '<th>raw output</th>' : ''}<th>predicted</th><th></th>
    </tr></thead>
    <tbody>
      ${predictions
        .map(({ inputs: [a, b], expected, predicted, rawOutput, correct }) => {
          const selected = a === x[0] && b === x[1];
          const training = active && active[0] === a && active[1] === b;
          return `<tr data-input="${a},${b}" tabindex="0" class="${selected ? 'selected' : ''}">
            <td>${a}</td><td>${b}</td>
            <td><span class="pill cls${expected}">${expected}</span></td>
            ${xor ? `<td><span class="bar"><span style="width:${(rawOutput * 100).toFixed(1)}%"></span></span>${fmt(rawOutput)}</td>` : ''}
            <td><span class="pill cls${predicted}">${predicted}</span></td>
            <td class="${correct ? 'ok' : 'bad'}">${correct ? '✓' : '✗'}${training ? ' <span class="tag">training</span>' : ''}</td>
          </tr>`;
        })
        .join('')}
    </tbody>`;

  const pick = (row) => setInput(row.dataset.input.split(',').map(Number));
  table.querySelectorAll('tr[data-input]').forEach((row) => {
    row.addEventListener('click', () => pick(row));
    row.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        pick(row);
      }
    });
  });
}

function setInput(x) {
  state.input[state.active] = x;
  updateDynamic();
}

function bindMapPointer(overlay) {
  let dragging = false;
  const fromEvent = (e) => {
    const rect = overlay.getBoundingClientRect();
    let x = fromFraction((e.clientX - rect.left) / rect.width, (e.clientY - rect.top) / rect.height);
    x = x.map((v) => Math.min(MAX, Math.max(MIN, v)));
    // Snap to a training point when close, so clicking a corner gives exactly 0 or 1
    const corner = x.map(Math.round);
    if (corner.every((c) => c === 0 || c === 1) && Math.hypot(x[0] - corner[0], x[1] - corner[1]) < 0.07) {
      return corner;
    }
    return x.map((v) => Math.round(v * 100) / 100);
  };
  overlay.addEventListener('pointerdown', (e) => {
    dragging = true;
    overlay.setPointerCapture(e.pointerId);
    setInput(fromEvent(e));
  });
  overlay.addEventListener('pointermove', (e) => dragging && setInput(fromEvent(e)));
  overlay.addEventListener('pointerup', () => (dragging = false));
  overlay.addEventListener('pointercancel', () => (dragging = false));
}

activate('and');
