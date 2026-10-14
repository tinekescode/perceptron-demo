// Client-side forward passes using the weights returned by the backends.
// They mirror Perceptron.predict and MultiLayerPerceptron.forward, so the browser
// can show what the trained network does for *any* input, not just the 4 truth-table rows.

export const sigmoid = (z) => 1 / (1 + Math.exp(-z));

/** Single perceptron with a step activation (perceptron-demo, AND). */
export function andModel(response) {
  const [w1, w2] = response.weights;
  const b = response.bias;
  return {
    hiddenSize: 0,
    forward([x1, x2]) {
      const z = b + w1 * x1 + w2 * x2;
      const y = z >= 0 ? 1 : 0;
      return { hidden: [], z, y, predicted: y };
    },
  };
}

/** 2-N-1 network with sigmoid activations (perceptron-mlp, XOR). */
export function xorModel(response) {
  const { weightsInputHidden, biasHidden, weightsHiddenOutput, biasOutput } = response;
  return {
    hiddenSize: biasHidden.length,
    forward([x1, x2]) {
      const hidden = weightsInputHidden.map(([w1, w2], j) => {
        const z = biasHidden[j] + w1 * x1 + w2 * x2;
        return { z, a: sigmoid(z) };
      });
      const z = hidden.reduce((sum, h, j) => sum + weightsHiddenOutput[j] * h.a, biasOutput);
      const y = sigmoid(z);
      return { hidden, z, y, predicted: y >= 0.5 ? 1 : 0 };
    },
  };
}
