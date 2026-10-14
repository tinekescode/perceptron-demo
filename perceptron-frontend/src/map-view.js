// Input-space view: x₁ horizontally, x₂ vertically, coloured by the network's output.

export const SIZE = 320; // overlay viewBox units
export const MIN = -0.25;
export const MAX = 1.25;

const CLASS_RGB = [
  [232, 113, 10], // output 0 — keep in sync with --class0
  [26, 115, 232], // output 1 — keep in sync with --class1
];

const toPx = (v) => ((v - MIN) / (MAX - MIN)) * SIZE;
const gx = (x1) => toPx(x1);
const gy = (x2) => SIZE - toPx(x2);

/** Converts a pointer position (0..1 of the element's width/height) to input coordinates. */
export function fromFraction(fx, fy) {
  return [MIN + fx * (MAX - MIN), MAX - fy * (MAX - MIN)];
}

/**
 * Paints valueAt(x1, x2) ∈ [0, 1] as a colour gradient, and draws the 0.5 contour
 * (the decision boundary) as a dark line. A resolution below 1 draws fewer pixels,
 * which keeps fast playback smooth.
 */
export function drawMap(canvas, valueAt, resolution = 1) {
  const dpr = window.devicePixelRatio || 1;
  const n = Math.max(1, Math.round((canvas.clientWidth || SIZE) * dpr * resolution));
  canvas.width = n;
  canvas.height = n;

  const values = new Float32Array(n * n);
  for (let py = 0; py < n; py++) {
    const x2 = MAX - ((py + 0.5) / n) * (MAX - MIN);
    for (let px = 0; px < n; px++) {
      const x1 = MIN + ((px + 0.5) / n) * (MAX - MIN);
      values[py * n + px] = valueAt(x1, x2);
    }
  }

  const dark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  const lineRgb = dark ? [235, 235, 235] : [32, 33, 36];
  const ctx = canvas.getContext('2d');
  const img = ctx.createImageData(n, n);
  const differs = (i, above) => (values[i] >= 0.5) !== above;

  for (let py = 0; py < n; py++) {
    for (let px = 0; px < n; px++) {
      const i = py * n + px;
      const p = values[i];
      const above = p >= 0.5;
      const onBoundary =
        (px > 0 && differs(i - 1, above)) ||
        (px < n - 1 && differs(i + 1, above)) ||
        (py > 0 && differs(i - n, above)) ||
        (py < n - 1 && differs(i + n, above));

      let rgb;
      let alpha;
      if (onBoundary) {
        rgb = lineRgb;
        alpha = 255;
      } else {
        rgb = CLASS_RGB[0].map((c, k) => c + (CLASS_RGB[1][k] - c) * p);
        alpha = 255 * (0.12 + 0.4 * Math.abs(p - 0.5) * 2); // stronger colour = more confident
      }
      const o = i * 4;
      img.data[o] = rgb[0];
      img.data[o + 1] = rgb[1];
      img.data[o + 2] = rgb[2];
      img.data[o + 3] = alpha;
    }
  }
  ctx.putImageData(img, 0, 0);
}

/**
 * The part of the line w₁·x₁ + w₂·x₂ + b = 0 inside the visible area, as two end points,
 * or null when it doesn't cross it.
 */
function visibleLine([w1, w2], b) {
  const points = [];
  const add = (x1, x2) => {
    const inside = (v) => v >= MIN - 1e-9 && v <= MAX + 1e-9;
    if (inside(x1) && inside(x2) && !points.some(([p, q]) => Math.hypot(p - x1, q - x2) < 1e-9)) points.push([x1, x2]);
  };
  for (const edge of [MIN, MAX]) {
    if (w2 !== 0) add(edge, -(w1 * edge + b) / w2); // left and right edges
    if (w1 !== 0) add(-(w2 * edge + b) / w1, edge); // bottom and top edges
  }
  return points.length >= 2 ? points.slice(0, 2) : null;
}

/**
 * Axes, the four training points, the example being trained on (if any), the selected input,
 * and optionally `ghost`: earlier weights whose decision line is drawn dashed.
 */
export function renderOverlay(svg, { predictions, x, active, ghost }) {
  const ghostLine = ghost && visibleLine(ghost.weights, ghost.bias);
  const ghostSvg = ghostLine
    ? `<line class="ghost" x1="${gx(ghostLine[0][0])}" y1="${gy(ghostLine[0][1])}" x2="${gx(ghostLine[1][0])}" y2="${gy(ghostLine[1][1])}">
        <title>decision line before the update</title></line>`
    : '';

  const grid = [0, 1]
    .map(
      (v) => `
      <line class="gridline" x1="${gx(v)}" y1="0" x2="${gx(v)}" y2="${SIZE}"/>
      <line class="gridline" x1="0" y1="${gy(v)}" x2="${SIZE}" y2="${gy(v)}"/>
      <text class="tick" x="${gx(v)}" y="${SIZE - 6}">${v}</text>
      <text class="tick" x="9" y="${gy(v) + 4}">${v}</text>`,
    )
    .join('');

  const points = predictions
    .map(({ inputs: [a, b], expected, correct }) => {
      const cx = gx(a);
      const cy = gy(b);
      const training = active && active[0] === a && active[1] === b;
      return `
        ${training ? `<circle class="training" cx="${cx}" cy="${cy}" r="20"><title>example being trained on</title></circle>` : ''}
        ${correct ? '' : `<circle class="wrong" cx="${cx}" cy="${cy}" r="15"><title>predicted wrongly</title></circle>`}
        <circle class="point cls${expected}" cx="${cx}" cy="${cy}" r="9"><title>(${a}, ${b}) → expected ${expected}</title></circle>
        <text class="point-label" x="${cx}" y="${b === 0 ? cy + 26 : cy - 17}">(${a}, ${b})</text>`;
    })
    .join('');

  svg.innerHTML = `
    ${grid}
    <text class="axis" x="${SIZE - 8}" y="${SIZE - 22}">x₁ →</text>
    <text class="axis" x="22" y="16">x₂ ↑</text>
    ${ghostSvg}
    ${points}
    <circle class="probe" cx="${gx(x[0])}" cy="${gy(x[1])}" r="7"/>
    <circle class="probe-dot" cx="${gx(x[0])}" cy="${gy(x[1])}" r="2"/>
  `;
}
