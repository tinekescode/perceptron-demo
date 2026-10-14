import { fmt, sub } from './format.js';

const HEIGHT = 320;
const CENTER_Y = 175;
const R = 26;

const clamp01 = (v) => Math.max(0, Math.min(1, v));

function layout(hiddenSize) {
  const inputs = [
    { x: 70, y: CENTER_Y - 45 },
    { x: 70, y: CENTER_Y + 45 },
  ];
  const gap = hiddenSize > 1 ? Math.min(78, (HEIGHT - 110) / (hiddenSize - 1)) : 0;
  const hidden = Array.from({ length: hiddenSize }, (_, j) => ({
    x: 265,
    y: CENTER_Y + (j - (hiddenSize - 1) / 2) * gap,
  }));
  const output = { x: hiddenSize ? 430 : 320, y: CENTER_Y };
  return { inputs, hidden, output };
}

function edgeSvg({ a, b, w, activity, title, label, at, changed }, maxAbs) {
  const width = 1 + 6 * (Math.abs(w) / maxAbs);
  const opacity = 0.15 + 0.85 * activity;
  let svg = `<line class="edge ${w >= 0 ? 'pos' : 'neg'}" x1="${a.x}" y1="${a.y}" x2="${b.x}" y2="${b.y}"
      stroke-width="${width.toFixed(2)}" stroke-opacity="${opacity.toFixed(2)}"><title>${title}</title></line>`;
  if (label) {
    const lx = a.x + (b.x - a.x) * at;
    const ly = a.y + (b.y - a.y) * at;
    svg += `<text class="edge-label${changed ? ' changed' : ''}" x="${lx}" y="${ly + 4}">${label}</text>`;
  }
  return svg;
}

function nodeSvg(p, name, value, activation, { select, selected, title } = {}) {
  const attrs = select !== undefined ? ` data-select="${select}" tabindex="0" role="button"` : '';
  return `<g class="node${select !== undefined ? ' selectable' : ''}${selected ? ' selected' : ''}"${attrs}>
      ${title ? `<title>${title}</title>` : ''}
      <circle class="node-bg" cx="${p.x}" cy="${p.y}" r="${R}"/>
      <circle class="node-fill" cx="${p.x}" cy="${p.y}" r="${R}" fill-opacity="${(0.06 + 0.8 * clamp01(activation)).toFixed(2)}"/>
      <text class="node-name" x="${p.x}" y="${p.y - 6}">${name}</text>
      <text class="node-value" x="${p.x}" y="${p.y + 12}">${value}</text>
    </g>`;
}

/**
 * Draws the network for the current input. Edge colour = sign of the weight,
 * thickness = size of the weight, opacity = how much signal flows in (source activation).
 * Node fill = activation.
 *
 * `weights` holds the weights of the frame being shown; for AND, values that differ
 * from `previous` (the frame before) are highlighted.
 */
export function renderNetwork(svg, { kind, weights, previous, model, x, mapSource, onSelect }) {
  const result = model.forward(x);
  const pos = layout(model.hiddenSize);
  const edges = [];

  if (kind === 'and') {
    weights.weights.forEach((w, i) =>
      edges.push({
        a: pos.inputs[i], b: pos.output, w, activity: clamp01(x[i]),
        title: `w${sub(i + 1)} = ${fmt(w)}`, label: `w${sub(i + 1)} = ${fmt(w)}`, at: 0.5,
        changed: previous && previous.weights[i] !== w,
      }),
    );
  } else {
    weights.weightsInputHidden.forEach((row, j) =>
      row.forEach((w, i) =>
        edges.push({
          a: pos.inputs[i], b: pos.hidden[j], w, activity: clamp01(x[i]),
          title: `x${sub(i + 1)} → h${sub(j + 1)}: w = ${fmt(w)}`,
        }),
      ),
    );
    weights.weightsHiddenOutput.forEach((w, j) =>
      edges.push({
        a: pos.hidden[j], b: pos.output, w, activity: result.hidden[j].a,
        title: `h${sub(j + 1)} → output: w = ${fmt(w)}`, label: fmt(w, 2), at: 0.3,
      }),
    );
  }
  const maxAbs = Math.max(...edges.map((e) => Math.abs(e.w)), 1e-9);

  const bias = kind === 'and' ? weights.bias : weights.biasOutput;
  const biasChanged = kind === 'and' && previous && previous.bias !== bias;
  const out = pos.output;
  const outputValue = kind === 'and' ? String(result.y) : fmt(result.y, 2);

  svg.innerHTML = `
    <defs>
      <marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto">
        <path class="arrow-head" d="M0,0 L10,5 L0,10 z"/>
      </marker>
    </defs>
    <text class="col-label" x="${pos.inputs[0].x}" y="24">inputs</text>
    ${model.hiddenSize ? `<text class="col-label" x="${pos.hidden[0].x}" y="24">hidden layer · σ</text>` : ''}
    <text class="col-label" x="${out.x}" y="24">output · ${kind === 'and' ? 'step' : 'σ'}</text>
    ${edges.map((e) => edgeSvg(e, maxAbs)).join('')}
    ${pos.inputs.map((p, i) => nodeSvg(p, `x${sub(i + 1)}`, fmt(x[i], 2), x[i])).join('')}
    ${pos.hidden
      .map((p, j) =>
        nodeSvg(p, `h${sub(j + 1)}`, fmt(result.hidden[j].a, 2), result.hidden[j].a, {
          select: j,
          selected: mapSource === j,
          title: `h${sub(j + 1)}: b = ${fmt(weights.biasHidden[j])}, z = ${fmt(result.hidden[j].z)} — click to show its line in the input space`,
        }),
      )
      .join('')}
    ${nodeSvg(out, 'out', outputValue, result.y, kind === 'xor' ? { select: 'out', selected: mapSource === 'out' } : {})}
    <text class="node-note" x="${out.x}" y="${out.y + R + 18}">z = ${fmt(result.z)}</text>
    <text class="node-note${biasChanged ? ' changed' : ''}" x="${out.x}" y="${out.y + R + 34}">b = ${fmt(bias)}</text>
    <line class="arrow" x1="${out.x + R + 4}" y1="${out.y}" x2="${out.x + R + 38}" y2="${out.y}" marker-end="url(#arrow)"/>
    <text class="prediction cls${result.predicted}" x="${out.x + R + 46}" y="${out.y + 5}">ŷ = ${result.predicted}</text>
  `;

  svg.onclick = (e) => {
    const target = e.target.closest('[data-select]');
    if (target) onSelect(target.dataset.select === 'out' ? 'out' : Number(target.dataset.select));
  };
  svg.onkeydown = (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      svg.onclick(e);
    }
  };
}
