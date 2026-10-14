// Turns the training history from a backend into frames that can be replayed,
// and draws the timeline under the playback controls.
import { fmt } from './format.js';

export const CORNERS = [
  [0, 0],
  [0, 1],
  [1, 0],
  [1, 1],
];

export const TARGET = {
  and: ([a, b]) => a & b,
  xor: ([a, b]) => a ^ b,
};

/**
 * AND: frame 0 holds the random starting weights. A correctly predicted example is one frame
 * (phase 'check'). A wrong one is two: 'predict' still shows the old weights, so you see the
 * mistake first, then 'update' shows the weights after the learning rule.
 * `before` is always the weights the step started from, `snapshot` the weights shown.
 * XOR: one frame per epoch (frame 0 = starting weights), from the backend's snapshots.
 */
export function buildFrames(kind, response) {
  if (kind === 'and') {
    const initial = { weights: response.initialWeights, bias: response.initialBias };
    const frames = [{ epoch: 0, step: null, stepIndex: -1, phase: 'start', before: initial, snapshot: initial }];
    let before = initial;
    response.history.forEach((step, stepIndex) => {
      const base = { epoch: step.epoch, step, stepIndex, before };
      if (step.error) frames.push({ ...base, phase: 'predict', snapshot: before });
      frames.push({ ...base, phase: step.error ? 'update' : 'check', snapshot: step });
      before = step;
    });
    return frames;
  }
  return response.history.map((s) => ({ epoch: s.epoch, loss: s.averageLoss, snapshot: s }));
}

/** Frames per second at 1× speed. XOR always takes about 20 seconds, however many epochs it needs. */
export function baseRate(kind, frameCount) {
  return kind === 'and' ? 1 : Math.max(10, (frameCount - 1) / 20);
}

/** The network's result for the four training inputs, using the given model. */
export function predictCorners(kind, model) {
  return CORNERS.map((inputs) => {
    const { y, predicted } = model.forward(inputs);
    const expected = TARGET[kind](inputs);
    return { inputs, expected, predicted, rawOutput: y, correct: predicted === expected };
  });
}

export function frameLabel(kind, frames, index, predictions) {
  const frame = frames[index];
  const correct = predictions.filter((p) => p.correct).length;
  if (kind === 'and') {
    if (!frame.step) {
      return `<b>Start:</b> random weights, before seeing any example · ${correct}/4 correct`;
    }
    const { epoch, example, inputs, target, predicted, error } = frame.step;
    const lastEpoch = frames[frames.length - 1].epoch;
    const outcome = {
      check: '<span class="ok">correct → no change</span>',
      predict: '<span class="bad">wrong!</span> Next: update the weights',
      update: '<span class="bad">wrong</span> → weights updated, the line moves (dashed = where it was)',
    }[frame.phase];
    return `<b>Epoch ${epoch} of ${lastEpoch}</b> · example ${example + 1} of 4:
      x = (${inputs.join(', ')}), target ${target}, predicted ${predicted} · ${outcome}`;
  }
  const lastEpoch = frames[frames.length - 1].epoch;
  const head = frame.epoch === 0 ? '<b>Start:</b> random weights' : `<b>Epoch ${frame.epoch.toLocaleString('en')}</b> of ${lastEpoch.toLocaleString('en')}`;
  return `${head} · avg. loss ${frame.loss.toPrecision(3)} · ${correct}/4 correct`;
}

/** AND: one cell per training step, grouped by epoch. Red = wrong (weights updated), green = correct. */
function stepStrip(frames) {
  // One cell per training step, pointing at the step's first frame
  const epochs = new Map();
  frames.forEach((f, i) => {
    if (!f.step || frames[i - 1].stepIndex === f.stepIndex) return;
    if (!epochs.has(f.epoch)) epochs.set(f.epoch, []);
    epochs.get(f.epoch).push(i);
  });
  const cell = (i) => {
    const { step: s, stepIndex } = frames[i];
    const title = `Epoch ${s.epoch}, (${s.inputs.join(', ')}): ${s.error ? 'wrong, weights updated' : 'correct, no change'}`;
    return `<button class="cell ${s.error ? 'update' : 'correct'}" data-frame="${i}" data-step="${stepIndex}" title="${title}">${s.inputs.join(',')}</button>`;
  };
  return `
    <div class="strip">
      <div class="strip-group">
        <span class="strip-label">start</span>
        <div class="cells"><button class="cell start" data-frame="0" data-step="-1" title="Random starting weights">·</button></div>
      </div>
      ${[...epochs]
        .map(
          ([epoch, indices]) => `
          <div class="strip-group">
            <span class="strip-label">epoch ${epoch}</span>
            <div class="cells">${indices.map(cell).join('')}</div>
          </div>`,
        )
        .join('')}
    </div>
    <ul class="legend">
      <li><span class="swatch update"></span>wrong → weights updated</li>
      <li><span class="swatch correct"></span>correct → no change</li>
    </ul>`;
}

const CHART = { w: 600, h: 130, left: 44, right: 10, top: 10, bottom: 22 };

function lossChart(frames) {
  const { w, h, left, right, top, bottom } = CHART;
  const n = frames.length;
  const maxLoss = Math.max(...frames.map((f) => f.loss), 1e-9);
  const px = (i) => left + (i / Math.max(1, n - 1)) * (w - left - right);
  const py = (loss) => top + (1 - loss / maxLoss) * (h - top - bottom);

  // At most ~1000 points; the chart isn't wider than that anyway
  const stride = Math.max(1, Math.ceil(n / 1000));
  const points = [];
  for (let i = 0; i < n; i += stride) points.push(`${px(i).toFixed(1)},${py(frames[i].loss).toFixed(1)}`);
  points.push(`${px(n - 1).toFixed(1)},${py(frames[n - 1].loss).toFixed(1)}`);

  return `
    <svg class="loss-chart" viewBox="0 0 ${w} ${h}" role="img" aria-label="Average loss per epoch">
      <line class="axis-line" x1="${left}" y1="${h - bottom}" x2="${w - right}" y2="${h - bottom}"/>
      <line class="axis-line" x1="${left}" y1="${top}" x2="${left}" y2="${h - bottom}"/>
      <text class="tick" x="${left - 6}" y="${top + 4}" text-anchor="end">${maxLoss.toPrecision(2)}</text>
      <text class="tick" x="${left - 6}" y="${h - bottom + 4}" text-anchor="end">0</text>
      <text class="tick" x="${left}" y="${h - 6}">0</text>
      <text class="tick" x="${w - right}" y="${h - 6}" text-anchor="end">epoch ${frames[n - 1].epoch.toLocaleString('en')}</text>
      <text class="tick" x="${(left + w - right) / 2}" y="${h - 6}" text-anchor="middle">avg. loss per epoch (click to jump)</text>
      <polyline class="loss-line" points="${points.join(' ')}"/>
      <line class="cursor" id="loss-cursor" y1="${top}" y2="${h - bottom}"/>
      <circle class="cursor-dot" id="loss-dot" r="4"/>
      <rect class="hit" x="${left}" y="0" width="${w - left - right}" height="${h}"/>
    </svg>`;
}

export function renderTimeline(el, kind, frames, onSeek) {
  el.innerHTML = kind === 'and' ? stepStrip(frames) : lossChart(frames);

  if (kind === 'and') {
    el.querySelectorAll('[data-frame]').forEach((btn) =>
      btn.addEventListener('click', () => onSeek(Number(btn.dataset.frame))),
    );
    return;
  }

  const svg = el.querySelector('svg');
  const hit = svg.querySelector('.hit');
  let dragging = false;
  const seek = (e) => {
    const rect = hit.getBoundingClientRect();
    const f = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
    onSeek(Math.round(f * (frames.length - 1)));
  };
  hit.addEventListener('pointerdown', (e) => {
    dragging = true;
    hit.setPointerCapture(e.pointerId);
    seek(e);
  });
  hit.addEventListener('pointermove', (e) => dragging && seek(e));
  hit.addEventListener('pointerup', () => (dragging = false));
  hit.addEventListener('pointercancel', () => (dragging = false));
}

export function updateTimeline(el, kind, frames, index) {
  if (kind === 'and') {
    const { stepIndex } = frames[index];
    el.querySelectorAll('[data-step]').forEach((btn) => {
      const step = Number(btn.dataset.step);
      btn.classList.toggle('current', step === stepIndex);
      btn.classList.toggle('done', step < stepIndex);
    });
    return;
  }
  const { w, h, left, right, top, bottom } = CHART;
  const maxLoss = Math.max(...frames.map((f) => f.loss), 1e-9);
  const x = left + (index / Math.max(1, frames.length - 1)) * (w - left - right);
  const y = top + (1 - frames[index].loss / maxLoss) * (h - top - bottom);
  const cursor = el.querySelector('#loss-cursor');
  cursor.setAttribute('x1', x);
  cursor.setAttribute('x2', x);
  const dot = el.querySelector('#loss-dot');
  dot.setAttribute('cx', x);
  dot.setAttribute('cy', y);
  dot.innerHTML = `<title>epoch ${frames[index].epoch}: ${fmt(frames[index].loss, 4)}</title>`;
}
