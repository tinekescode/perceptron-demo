const SIDE = 28;
const PIXELS = SIDE * SIDE;
const POLL_MS = 400; // while loading or training
const IDLE_POLL_MS = 2000;
const HIDDEN_EVERY_MS = 1000; // weight images are larger, so refresh them less often

const $ = (id) => document.getElementById(id);
const pad = $('pad');
const padCtx = pad.getContext('2d', { willReadFrequently: true });

const state = {
  input: new Float64Array(PIXELS), // 0–1 per pixel, row by row
  hasInput: false,
  label: null, // known label when a test image is loaded
  status: null,
  hiddenAt: -Infinity,
  predictSeq: 0,
};

async function api(path, options = {}) {
  const res = await fetch(`/digits${path}`, options);
  const body = await res.json().catch(() => null);
  if (!res.ok) throw new Error(body?.error ?? `HTTP ${res.status}`);
  return body;
}

const percent = (value, digits = 0) => `${(value * 100).toFixed(digits)}%`;

/** A colour custom property as [r, g, b]. */
function cssRgb(name) {
  const hex = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
}

/** Draws 0–1 values as white ink on black, like the MNIST images. */
function drawGray(canvas, values) {
  const ctx = canvas.getContext('2d');
  const image = ctx.createImageData(SIDE, SIDE);
  values.forEach((v, i) => {
    const c = Math.round(v * 255);
    image.data.set([c, c, c, 255], i * 4);
  });
  ctx.putImageData(image, 0, 0);
}

// ---------------------------------------------------------------------------
// Drawing pad

function clearPad() {
  padCtx.fillStyle = '#000';
  padCtx.fillRect(0, 0, pad.width, pad.height);
}

function setInput(values, hasInput, label, caption) {
  state.input = values;
  state.hasInput = hasInput;
  state.label = label;
  $('input-label').textContent = caption;
  drawGray($('seen'), values);
  if (hasInput) {
    predict();
  } else {
    renderPrediction(null);
  }
}

function clearInput() {
  clearPad();
  setInput(new Float64Array(PIXELS), false, null, 'Draw with the mouse, or load a test image.');
}

let drawing = false;
let last = null;
let lastUpdate = 0;

function padPoint(event) {
  const rect = pad.getBoundingClientRect();
  return [(event.clientX - rect.left) * (pad.width / rect.width), (event.clientY - rect.top) * (pad.height / rect.height)];
}

function stroke(from, to) {
  padCtx.strokeStyle = '#fff';
  padCtx.lineWidth = 22;
  padCtx.lineCap = 'round';
  padCtx.lineJoin = 'round';
  padCtx.beginPath();
  padCtx.moveTo(...from);
  padCtx.lineTo(...to);
  padCtx.stroke();
}

pad.addEventListener('pointerdown', (event) => {
  drawing = true;
  pad.setPointerCapture(event.pointerId);
  last = padPoint(event);
  stroke(last, last);
});

pad.addEventListener('pointermove', (event) => {
  if (!drawing) return;
  const point = padPoint(event);
  stroke(last, point);
  last = point;
  if (performance.now() - lastUpdate > 150) updateFromPad();
});

for (const type of ['pointerup', 'pointercancel']) {
  pad.addEventListener(type, () => {
    if (!drawing) return;
    drawing = false;
    updateFromPad();
  });
}

function updateFromPad() {
  lastUpdate = performance.now();
  const values = toNetworkInput();
  if (values) {
    setInput(values, true, null, 'Your drawing');
  } else {
    setInput(new Float64Array(PIXELS), false, null, 'Draw with the mouse, or load a test image.');
  }
}

/**
 * Turns the drawing into 28 × 28 inputs the way the MNIST images were made: the digit is
 * scaled to fit a 20 × 20 box, then shifted so its centre of mass is in the middle.
 * Without this, a digit drawn small or in a corner looks nothing like the training images.
 */
function toNetworkInput() {
  const { data, width, height } = padCtx.getImageData(0, 0, pad.width, pad.height);
  let minX = width, minY = height, maxX = -1, maxY = -1;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (data[(y * width + x) * 4] > 0) {
        minX = Math.min(minX, x);
        maxX = Math.max(maxX, x);
        minY = Math.min(minY, y);
        maxY = Math.max(maxY, y);
      }
    }
  }
  if (maxX < 0) return null;

  const w = maxX - minX + 1;
  const h = maxY - minY + 1;
  const scale = 20 / Math.max(w, h);
  const small = document.createElement('canvas');
  small.width = small.height = SIDE;
  const ctx = small.getContext('2d', { willReadFrequently: true });
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, SIDE, SIDE);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(pad, minX, minY, w, h, (SIDE - w * scale) / 2, (SIDE - h * scale) / 2, w * scale, h * scale);
  const pixels = ctx.getImageData(0, 0, SIDE, SIDE).data;

  const gray = new Float64Array(PIXELS);
  let total = 0, cx = 0, cy = 0;
  for (let i = 0; i < PIXELS; i++) {
    const v = pixels[i * 4] / 255;
    gray[i] = v;
    total += v;
    cx += v * (i % SIDE);
    cy += v * Math.floor(i / SIDE);
  }
  const dx = Math.round((SIDE - 1) / 2 - cx / total);
  const dy = Math.round((SIDE - 1) / 2 - cy / total);
  const centred = new Float64Array(PIXELS);
  for (let y = 0; y < SIDE; y++) {
    for (let x = 0; x < SIDE; x++) {
      const sx = x - dx;
      const sy = y - dy;
      if (sx >= 0 && sx < SIDE && sy >= 0 && sy < SIDE) centred[y * SIDE + x] = gray[sy * SIDE + sx];
    }
  }
  return centred;
}

/** Shows a test image on the pad and uses its pixels as input as they are. */
function loadTestImage(image) {
  const values = Float64Array.from(image.pixels, (v) => v / 255);
  const small = document.createElement('canvas');
  small.width = small.height = SIDE;
  drawGray(small, values);
  clearPad();
  padCtx.imageSmoothingEnabled = true;
  padCtx.drawImage(small, 0, 0, pad.width, pad.height);
  setInput(values, true, image.label, `Test image #${image.index}, labelled ${image.label}`);
}

// ---------------------------------------------------------------------------
// Prediction

async function predict() {
  const seq = ++state.predictSeq;
  try {
    const result = await api('/predict', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pixels: Array.from(state.input, (v) => Math.round(v * 1000) / 1000) }),
    });
    if (seq === state.predictSeq) renderPrediction(result);
  } catch (err) {
    $('answer').textContent = `Prediction failed: ${err.message}`;
  }
}

function renderPrediction(result) {
  const probabilities = result?.probabilities ?? new Array(10).fill(0);
  $('bars').innerHTML = probabilities
    .map(
      (p, digit) => `
        <div class="bar-row ${result && digit === result.predicted ? 'best' : ''}">
          <span class="digit">${digit}</span>
          <div class="bar"><div style="width:${p * 100}%"></div></div>
          <span class="pct">${result ? percent(p, p < 0.1 ? 1 : 0) : ''}</span>
        </div>`,
    )
    .join('');

  if (!result) {
    $('answer').textContent = '';
  } else {
    const sure = percent(result.probabilities[result.predicted]);
    let verdict = '';
    if (state.label !== null) {
      verdict = result.predicted === state.label
        ? ' <span class="ok">✓ correct</span>'
        : ` <span class="bad">✗ it is a ${state.label}</span>`;
    }
    $('answer').innerHTML = `It thinks this is a <b>${result.predicted}</b> (${sure} sure).${verdict}`;
  }
  renderActivations(result?.hidden ?? null);
}

// ---------------------------------------------------------------------------
// Hidden neurons

function renderHidden({ side, neurons }) {
  const container = $('neurons');
  if (container.children.length !== neurons.length) {
    container.innerHTML = neurons
      .map((_, h) => `<canvas width="${side}" height="${side}" title="h${h + 1}"></canvas>`)
      .join('');
  }
  const background = cssRgb('--card');
  const positive = cssRgb('--pos');
  const negative = cssRgb('--neg');
  neurons.forEach((weights, h) => {
    const canvas = container.children[h];
    const ctx = canvas.getContext('2d');
    const image = ctx.createImageData(side, side);
    weights.forEach((w, i) => {
      // Mix from the card colour towards green (positive) or red (negative) by the weight's size
      const colour = w >= 0 ? positive : negative;
      const amount = Math.abs(w) / 127;
      const rgb = background.map((b, c) => Math.round(b + (colour[c] - b) * amount));
      image.data.set([...rgb, 255], i * 4);
    });
    ctx.putImageData(image, 0, 0);
  });
  renderActivations(state.lastHidden ?? null);
}

function renderActivations(hidden) {
  state.lastHidden = hidden;
  [...$('neurons').children].forEach((canvas, h) => {
    const activation = hidden ? hidden[h] : 0;
    canvas.style.setProperty('--act', activation.toFixed(2));
    canvas.title = hidden ? `h${h + 1}: activation ${activation.toFixed(2)}` : `h${h + 1}`;
  });
}

async function refreshHidden() {
  state.hiddenAt = performance.now();
  renderHidden(await api('/hidden'));
}

// ---------------------------------------------------------------------------
// Accuracy chart

function renderChart(status) {
  const W = 520, H = 240, L = 40, R = 16, T = 12, B = 30;
  const total = Math.max(1, status.examplesPerEpoch * Math.max(1, status.epochs));
  const x = (examples) => L + (examples / total) * (W - L - R);
  const y = (accuracy) => T + (1 - accuracy) * (H - T - B);

  let svg = '';
  for (const a of [0, 0.25, 0.5, 0.75, 1]) {
    svg += `<line class="grid-line" x1="${L}" x2="${W - R}" y1="${y(a)}" y2="${y(a)}"/>`;
    svg += `<text class="tick" x="${L - 6}" y="${y(a) + 4}" text-anchor="end">${percent(a)}</text>`;
  }
  // One tick per epoch when training several, otherwise every 20,000 examples
  const step = status.epochs > 1 ? status.examplesPerEpoch : 20_000;
  for (let v = 0; v <= total; v += step) {
    const label = status.epochs > 1 ? (v === 0 ? '0' : `epoch ${v / step}`) : `${v / 1000}k`;
    svg += `<text class="tick" x="${x(v)}" y="${H - 8}" text-anchor="middle">${label}</text>`;
  }

  const points = status.history;
  if (points.length === 0) {
    svg += `<text class="empty" x="${(L + W - R) / 2}" y="${H / 2}" text-anchor="middle">Press Train to start</text>`;
  } else {
    svg += `<polyline class="line" points="${points.map((p) => `${x(p.examplesSeen)},${y(p.accuracy)}`).join(' ')}"/>`;
    const lastPoint = points[points.length - 1];
    const lx = x(lastPoint.examplesSeen);
    const ly = y(lastPoint.accuracy);
    svg += `<circle class="dot" cx="${lx}" cy="${ly}" r="4"/>`;
    const anchor = lx > W - 80 ? 'end' : 'start';
    svg += `<text class="value" x="${lx + (anchor === 'end' ? -8 : 8)}" y="${ly + (ly < T + 20 ? 18 : -8)}" text-anchor="${anchor}">${percent(lastPoint.accuracy, 1)}</text>`;
  }
  $('chart').innerHTML = svg;
}

// ---------------------------------------------------------------------------
// Status and training

function renderStatus(status) {
  const el = $('status');
  const states = {
    loading: ['busy', 'Loading MNIST… (the first run downloads ~11 MB)'],
    error: ['error', `Could not load MNIST: ${status.dataError}`],
    disabled: ['error', 'MNIST loading is switched off'],
  };
  const [cls, text] = states[status.dataStatus] ?? (status.training ? ['busy', 'Training…'] : ['ok', 'Ready']);
  el.className = `status ${cls}`;
  el.textContent = text;

  const ready = status.dataStatus === 'ready';
  $('train').disabled = !ready;
  $('train').textContent = status.examplesSeen > 0 ? 'Train again' : 'Train';
  $('sample').disabled = !ready;
  $('stop').disabled = !status.training;

  const latest = status.history[status.history.length - 1];
  const stats = [
    ['Network', status.architecture],
    ['Epoch', status.epochs ? `${status.epoch} of ${status.epochs}` : '–'],
    ['Examples seen', status.examplesSeen.toLocaleString('en')],
    ['Accuracy', latest ? percent(latest.accuracy, 1) : '–'],
  ];
  if (status.testAccuracy !== null) stats.push(['All 10,000 test images', percent(status.testAccuracy, 1)]);
  $('stats').innerHTML = stats.map(([k, v]) => `<div><dt>${k}</dt><dd>${v}</dd></div>`).join('');
}

async function loadMistakes() {
  const mistakes = await api('/mistakes?count=16');
  const container = $('mistakes');
  container.innerHTML = mistakes
    .map(
      (m) => `
        <button class="mistake" title="Test image #${m.index}: labelled ${m.label}, network says ${m.predicted} (${percent(m.confidence)} sure)">
          <canvas width="${SIDE}" height="${SIDE}"></canvas>
          ${m.label} → <span class="wrong">${m.predicted}</span>
        </button>`,
    )
    .join('');
  mistakes.forEach((m, i) => {
    const button = container.children[i];
    drawGray(button.querySelector('canvas'), m.pixels.map((v) => v / 255));
    button.addEventListener('click', () => loadTestImage(m));
  });
  $('mistakes-hint').textContent =
    'Test images the network gets wrong, as label → answer. Click one to load it. Would you have got them all right?';
}

function clearMistakes() {
  $('mistakes').innerHTML = '';
  $('mistakes-hint').textContent = 'After training: test images the network gets wrong. Click one to load it.';
}

/** Polls the backend: fast while loading or training, slowly otherwise. */
async function poll() {
  let delay = IDLE_POLL_MS;
  try {
    const previous = state.status;
    const status = await api('/status');
    state.status = status;
    renderStatus(status);
    renderChart(status);

    const busy = status.training || status.dataStatus === 'loading';
    const justFinished = previous?.training && !status.training;
    if (busy) delay = POLL_MS;

    if (status.training || justFinished) {
      if (justFinished || performance.now() - state.hiddenAt > HIDDEN_EVERY_MS) await refreshHidden();
      if (state.hasInput) predict(); // the same input, through the network as it is now
    }
    // Also on the first poll after a page reload, when the network was trained before
    const firstReady = !previous?.dataStatus || previous.dataStatus !== 'ready';
    const trained = status.dataStatus === 'ready' && !status.training && status.examplesSeen > 0;
    if (trained && (justFinished || firstReady)) await loadMistakes();
  } catch (err) {
    $('status').className = 'status error';
    $('status').textContent = `Backend not reachable (${err.message})`;
  }
  setTimeout(poll, delay);
}

$('train').addEventListener('click', async () => {
  clearMistakes();
  try {
    await api(`/train?epochs=${$('epochs').value}&slow=${$('slow').checked}`, { method: 'POST' });
  } catch (err) {
    alert(err.message);
  }
  state.status = { ...state.status, training: true }; // so the next poll notices when it ends
});

$('stop').addEventListener('click', () => api('/stop', { method: 'POST' }));

$('reset').addEventListener('click', async () => {
  const status = await api('/reset', { method: 'POST' });
  state.status = status;
  renderStatus(status);
  renderChart(status);
  clearMistakes();
  await refreshHidden();
  if (state.hasInput) predict();
});

$('clear').addEventListener('click', clearInput);

$('sample').addEventListener('click', async () => {
  try {
    loadTestImage(await api('/sample'));
  } catch (err) {
    alert(err.message);
  }
});

clearInput();
refreshHidden().catch(() => {});
poll();
