package nl.perceptron;

import java.util.Arrays;
import java.util.Random;

/**
 * A multi-layer perceptron for classification: input → hidden (sigmoid) → output (softmax),
 * trained with backpropagation. The same structure as {@code MultiLayerPerceptron} in
 * perceptron-mlp, but with one output per class instead of a single yes/no output.
 */
public class DigitNetwork {

    private final double[][] weightsInputHidden;  // [hidden][input]
    private final double[] biasHidden;
    private final double[][] weightsHiddenOutput; // [output][hidden]
    private final double[] biasOutput;
    private final double learningRate;

    public DigitNetwork(int inputSize, int hiddenSize, int outputSize, double learningRate, Random random) {
        if (inputSize < 1 || hiddenSize < 1 || outputSize < 2) {
            throw new IllegalArgumentException("Need at least 1 input, 1 hidden neuron and 2 outputs");
        }
        this.learningRate = learningRate;
        this.weightsInputHidden = randomWeights(hiddenSize, inputSize, random);
        this.biasHidden = new double[hiddenSize];
        this.weightsHiddenOutput = randomWeights(outputSize, hiddenSize, random);
        this.biasOutput = new double[outputSize];
    }

    /**
     * Random weights in ±1/√(inputs per neuron). With 784 inputs, weights in ±1 (as in the
     * XOR network) would push every hidden sum far into the flat ends of the sigmoid.
     */
    private static double[][] randomWeights(int neurons, int inputsPerNeuron, Random random) {
        double scale = 1.0 / Math.sqrt(inputsPerNeuron);
        double[][] weights = new double[neurons][inputsPerNeuron];
        for (double[] row : weights) {
            for (int i = 0; i < row.length; i++) {
                row[i] = (random.nextDouble() * 2 - 1) * scale;
            }
        }
        return weights;
    }

    private static double sigmoid(double x) {
        return 1.0 / (1.0 + Math.exp(-x));
    }

    /**
     * Turns the output sums into probabilities that add up to 1.
     */
    private static double[] softmax(double[] sums) {
        // Subtracting the largest sum doesn't change the result, but keeps exp() from overflowing
        double max = Arrays.stream(sums).max().orElse(0);
        double[] probabilities = new double[sums.length];
        double total = 0;
        for (int o = 0; o < sums.length; o++) {
            probabilities[o] = Math.exp(sums[o] - max);
            total += probabilities[o];
        }
        for (int o = 0; o < sums.length; o++) {
            probabilities[o] /= total;
        }
        return probabilities;
    }

    /**
     * Hidden activations and output probabilities for the given inputs.
     */
    public Forward forward(double[] inputs) {
        if (inputs.length != getInputSize()) {
            throw new IllegalArgumentException("Expected " + getInputSize() + " inputs, got " + inputs.length);
        }
        double[] hidden = new double[biasHidden.length];
        for (int h = 0; h < hidden.length; h++) {
            double sum = biasHidden[h];
            double[] weights = weightsInputHidden[h];
            for (int i = 0; i < inputs.length; i++) {
                sum += weights[i] * inputs[i];
            }
            hidden[h] = sigmoid(sum);
        }
        double[] outputSums = new double[biasOutput.length];
        for (int o = 0; o < outputSums.length; o++) {
            double sum = biasOutput[o];
            for (int h = 0; h < hidden.length; h++) {
                sum += weightsHiddenOutput[o][h] * hidden[h];
            }
            outputSums[o] = sum;
        }
        return new Forward(hidden, softmax(outputSums));
    }

    /**
     * The class with the highest probability.
     */
    public int predict(double[] inputs) {
        return argmax(forward(inputs).probabilities());
    }

    static int argmax(double[] values) {
        int best = 0;
        for (int i = 1; i < values.length; i++) {
            if (values[i] > values[best]) {
                best = i;
            }
        }
        return best;
    }

    /**
     * One step of stochastic gradient descent on a single example.
     *
     * @return the cross-entropy loss −ln(p[label]) before the update
     */
    public double trainExample(double[] inputs, int label) {
        Forward forward = forward(inputs);
        double[] hidden = forward.hidden();
        double[] probabilities = forward.probabilities();

        // Softmax + cross-entropy: the output error is simply probability − target,
        // where the target is 1 for the correct digit and 0 for the other nine
        double[] outputDelta = new double[probabilities.length];
        for (int o = 0; o < outputDelta.length; o++) {
            outputDelta[o] = probabilities[o] - (o == label ? 1 : 0);
        }

        // Each hidden neuron collects the error of all outputs, through the weights that connect them
        double[] hiddenDelta = new double[hidden.length];
        for (int h = 0; h < hidden.length; h++) {
            double sum = 0;
            for (int o = 0; o < outputDelta.length; o++) {
                sum += outputDelta[o] * weightsHiddenOutput[o][h];
            }
            hiddenDelta[h] = sum * hidden[h] * (1.0 - hidden[h]);
        }

        for (int o = 0; o < outputDelta.length; o++) {
            for (int h = 0; h < hidden.length; h++) {
                weightsHiddenOutput[o][h] -= learningRate * outputDelta[o] * hidden[h];
            }
            biasOutput[o] -= learningRate * outputDelta[o];
        }

        for (int h = 0; h < hidden.length; h++) {
            double[] weights = weightsInputHidden[h];
            double step = learningRate * hiddenDelta[h];
            for (int i = 0; i < inputs.length; i++) {
                // Most pixels are background (0), and their weights wouldn't change anyway
                if (inputs[i] != 0) {
                    weights[i] -= step * inputs[i];
                }
            }
            biasHidden[h] -= step;
        }

        return -Math.log(Math.max(probabilities[label], 1e-12));
    }

    public int getInputSize() {
        return weightsInputHidden[0].length;
    }

    public int getHiddenSize() {
        return biasHidden.length;
    }

    public int getOutputSize() {
        return biasOutput.length;
    }

    public double getLearningRate() {
        return learningRate;
    }

    public double[][] getWeightsInputHidden() {
        double[][] copy = new double[weightsInputHidden.length][];
        for (int h = 0; h < weightsInputHidden.length; h++) {
            copy[h] = Arrays.copyOf(weightsInputHidden[h], weightsInputHidden[h].length);
        }
        return copy;
    }

    public record Forward(double[] hidden, double[] probabilities) {
    }
}
