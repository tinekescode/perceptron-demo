import { fmt, signed, sub, term } from './format.js';

const isTrainingInput = (x) => x.every((v) => v === 0 || v === 1);

function verdict(kind, x, predicted) {
  if (!isTrainingInput(x)) {
    return `<p class="note">This is not one of the four training inputs. The result is the network's guess for a point in between.</p>`;
  }
  const expected = kind === 'and' ? x[0] & x[1] : x[0] ^ x[1];
  const ok = expected === predicted;
  return `<p class="verdict ${ok ? 'ok' : 'bad'}">
      Expected ${kind.toUpperCase()}(${x[0]}, ${x[1]}) = ${expected}: ${ok ? '✓ correct' : '✗ wrong'}
    </p>`;
}

/** The perceptron learning rule applied to the current training example, with the numbers filled in. */
function trainingStep(frame, learningRate) {
  if (!frame.step) {
    return `<div class="train-step">
        <span class="step-title">Start</span>
        The weights below are random. Press <b>Play</b> to feed the training examples one by one:
        after each one the perceptron nudges its weights if it got the example wrong.
      </div>`;
  }
  const { epoch, example, inputs: [a, b], target, predicted, error } = frame.step;
  const [pw1, pw2] = frame.before.weights;
  const pb = frame.before.bias;
  const z = pb + pw1 * a + pw2 * b;
  const eta = learningRate;
  const update = (name, old, x, value) =>
    `<code>${name} ← ${name} + η·error${x === null ? '' : `·${name === 'w₁' ? 'x₁' : 'x₂'}`} = ${fmt(old)} + ${eta} × ${term(error, 0)}${x === null ? '' : ` × ${x}`} = <b>${fmt(value)}</b></code>`;

  return `<div class="train-step ${error ? 'bad' : 'ok'}">
      <span class="step-title">Training step · epoch ${epoch}, example ${example + 1} of 4</span>
      <ol class="steps">
        <li>Predict with the current weights:
          <code>z = ${term(pb)} + ${term(pw1)} × ${a} + ${term(pw2)} × ${b} = ${fmt(z)}  →  ŷ = <b>${predicted}</b></code>
        </li>
        <li>Compare with the target:
          <code>error = target − ŷ = ${target} − ${predicted} = <b>${fmt(error, 0)}</b></code>
        </li>
        <li>${
          !error
            ? 'Correct, so the weights stay the same.'
            : frame.phase === 'predict'
              ? `<b>Wrong</b>, so the weights will be updated. Press <b>⏵</b> (or wait) to see the update and the line move.`
              : `Wrong, so move each weight in the direction of the error (η = ${eta}):
              ${update('w₁', pw1, a, frame.snapshot.weights[0])}
              ${update('w₂', pw2, b, frame.snapshot.weights[1])}
              ${update('b', pb, null, frame.snapshot.bias)}
              ${a === 0 || b === 0 ? '<span class="note">A weight whose input is 0 stays the same: that input did not contribute to the mistake.</span>' : ''}`
        }</li>
      </ol>
    </div>`;
}

function andCalc(weights, model, x, frame, learningRate) {
  const [w1, w2] = weights.weights;
  const b = weights.bias;
  const { z, predicted } = model.forward(x);
  const heading = {
    start: 'With the random starting weights',
    check: 'With the (unchanged) weights',
    predict: 'With the current weights (not updated yet)',
    update: 'With the updated weights',
  }[frame.phase];
  return `
    ${trainingStep(frame, learningRate)}
    <h3 class="calc-sub">${heading}</h3>
    <ol class="steps">
      <li>
        <span class="step-title">Weighted sum</span>
        <code>z = b + w₁·x₁ + w₂·x₂</code>
        <code>z = ${term(b)} + ${term(w1)} × ${term(x[0], 2)} + ${term(w2)} × ${term(x[1], 2)} = <b>${fmt(z)}</b></code>
      </li>
      <li>
        <span class="step-title">Step activation</span>
        <code>ŷ = step(z) = <b>${predicted}</b>   because z ${z >= 0 ? '≥' : '<'} 0</code>
      </li>
    </ol>
    ${verdict('and', x, predicted)}
    <p class="note">
      The decision boundary is where z = 0:
      <code>${fmt(w1)}·x₁${signed(w2)}·x₂${signed(b)} = 0</code>.
      That is a straight line. Every input on one side gives 1, on the other side 0.
    </p>`;
}

function xorCalc(weights, model, x, mapSource, frame) {
  const { weightsInputHidden, biasHidden, weightsHiddenOutput, biasOutput } = weights;
  const { hidden, z, y, predicted } = model.forward(x);
  const source =
    frame.epoch === 0
      ? 'Using the <b>random starting weights</b>. Press <b>Play</b> to watch backpropagation adjust them.'
      : `Using the weights <b>after epoch ${frame.epoch.toLocaleString('en')}</b>. In every epoch the network saw
         all four examples and, after each one, nudged every weight a little to reduce its error (backpropagation).`;

  const rows = hidden
    .map(
      (h, j) => `
      <tr class="${mapSource === j ? 'selected' : ''}">
        <th>h${sub(j + 1)}</th>
        <td>${fmt(biasHidden[j])}${signed(weightsInputHidden[j][0])} × ${term(x[0], 2)}${signed(weightsInputHidden[j][1])} × ${term(x[1], 2)} = <b>${fmt(h.z)}</b></td>
        <td><b>${fmt(h.a)}</b></td>
      </tr>`,
    )
    .join('');

  const outputTerms = weightsHiddenOutput
    .map((w, j) => `${signed(w)} × ${fmt(hidden[j].a)}`)
    .join('');

  return `
    <p class="note frame-source">${source}</p>
    <ol class="steps">
      <li>
        <span class="step-title">Hidden layer</span>
        Each hidden neuron computes its own weighted sum z and squashes it into (0, 1) with
        <code>σ(z) = 1 / (1 + e<sup>−z</sup>)</code>
        <table class="calc-table">
          <thead><tr><th></th><th>z = b + w₁·x₁ + w₂·x₂</th><th>h = σ(z)</th></tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </li>
      <li>
        <span class="step-title">Output neuron</span>
        Combines the hidden activations the same way:
        <code>z = b + Σ wⱼ·hⱼ</code>
        <code>z = ${fmt(biasOutput)}${outputTerms} = <b>${fmt(z)}</b></code>
        <code>σ(z) = <b>${fmt(y)}</b></code>
      </li>
      <li>
        <span class="step-title">Threshold</span>
        <code>ŷ = <b>${predicted}</b>   because ${fmt(y)} ${y >= 0.5 ? '≥' : '<'} 0.5</code>
      </li>
    </ol>
    ${verdict('xor', x, predicted)}`;
}

/** `weights` are the weights of the current frame. */
export function renderCalc(el, { kind, weights, frame, learningRate, model, x, mapSource }) {
  el.innerHTML =
    kind === 'and' ? andCalc(weights, model, x, frame, learningRate) : xorCalc(weights, model, x, mapSource, frame);
}
