package nl.perceptron;

import java.util.Arrays;
import java.util.Random;
import java.util.function.IntConsumer;

/**
 * A small multi-layer perceptron: input → hidden (sigmoid) → output (sigmoid),
 * trained with backpropagation. Used here to learn logical XOR, which a
 * single-node perceptron cannot learn.
 */
public class MultiLayerPerceptron {

    private final double[][] weightsInputHidden;
    private final double[] biasHidden;
    private final double[] weightsHiddenOutput;
    private double biasOutput;
    private final double learningRate;
    private int epochsTrained;
    private double lastAverageLoss;

    public MultiLayerPerceptron(int inputSize, int hiddenSize, double learningRate) {
        this(inputSize, hiddenSize, learningRate, new Random(42));
    }

    public MultiLayerPerceptron(int inputSize, int hiddenSize, double learningRate, Random random) {
        if (inputSize < 1 || hiddenSize < 1) {
            throw new IllegalArgumentException("inputSize and hiddenSize must be at least 1");
        }
        this.learningRate = learningRate;
        this.weightsInputHidden = new double[hiddenSize][inputSize];
        this.biasHidden = new double[hiddenSize];
        this.weightsHiddenOutput = new double[hiddenSize];
        for (int h = 0; h < hiddenSize; h++) {
            for (int i = 0; i < inputSize; i++) {
                weightsInputHidden[h][i] = random.nextDouble() * 2 - 1;
            }
            biasHidden[h] = random.nextDouble() * 2 - 1;
            weightsHiddenOutput[h] = random.nextDouble() * 2 - 1;
        }
        this.biasOutput = random.nextDouble() * 2 - 1;
        this.epochsTrained = 0;
        this.lastAverageLoss = Double.NaN;
    }

    private static double sigmoid(double x) {
        return 1.0 / (1.0 + Math.exp(-x));
    }

    /**
     * Continuous prediction in {@code (0, 1)}.
     */
    public double predictRaw(double[] inputs) {
        return forward(inputs).output;
    }

    /**
     * Binary prediction using a 0.5 threshold.
     */
    public int predict(double[] inputs) {
        return predictRaw(inputs) >= 0.5 ? 1 : 0;
    }

    /**
     * Trains with stochastic gradient descent and backpropagation for up to
     * {@code maxEpochs} epochs.
     *
     * @return number of epochs run
     */
    public int train(double[][] inputs, double[] targets, int maxEpochs) {
        return train(inputs, targets, maxEpochs, epoch -> {
        });
    }

    /**
     * Same as {@link #train(double[][], double[], int)}, calling {@code onEpochEnd} with the
     * 1-based epoch number after every epoch, when the weights and
     * {@link #getLastAverageLoss()} reflect that epoch.
     */
    public int train(double[][] inputs, double[] targets, int maxEpochs, IntConsumer onEpochEnd) {
        if (inputs.length != targets.length) {
            throw new IllegalArgumentException("inputs and targets must have the same length");
        }

        for (int epoch = 0; epoch < maxEpochs; epoch++) {
            double totalLoss = 0;
            for (int n = 0; n < inputs.length; n++) {
                totalLoss += trainExample(inputs[n], targets[n]);
            }
            epochsTrained = epoch + 1;
            lastAverageLoss = totalLoss / inputs.length;
            onEpochEnd.accept(epochsTrained);

            if (allCorrect(inputs, targets)) {
                return epochsTrained;
            }
        }
        return epochsTrained;
    }

    private boolean allCorrect(double[][] inputs, double[] targets) {
        for (int i = 0; i < inputs.length; i++) {
            int expected = targets[i] >= 0.5 ? 1 : 0;
            if (predict(inputs[i]) != expected) {
                return false;
            }
        }
        return true;
    }

    private double trainExample(double[] inputs, double target) {
        ForwardResult forward = forward(inputs);
        double output = forward.output;
        double[] hidden = forward.hidden;

        // Mean squared error for reporting; gradient uses (output - target) * σ'(output)
        double error = output - target;
        double loss = 0.5 * error * error;
        double outputDelta = error * output * (1.0 - output);

        double[] hiddenDelta = new double[hidden.length];
        for (int h = 0; h < hidden.length; h++) {
            hiddenDelta[h] = outputDelta * weightsHiddenOutput[h] * hidden[h] * (1.0 - hidden[h]);
        }

        for (int h = 0; h < hidden.length; h++) {
            weightsHiddenOutput[h] -= learningRate * outputDelta * hidden[h];
        }
        biasOutput -= learningRate * outputDelta;

        for (int h = 0; h < hidden.length; h++) {
            for (int i = 0; i < inputs.length; i++) {
                weightsInputHidden[h][i] -= learningRate * hiddenDelta[h] * inputs[i];
            }
            biasHidden[h] -= learningRate * hiddenDelta[h];
        }

        return loss;
    }

    private ForwardResult forward(double[] inputs) {
        if (inputs.length != weightsInputHidden[0].length) {
            throw new IllegalArgumentException(
                    "Expected " + weightsInputHidden[0].length + " inputs, got " + inputs.length);
        }
        double[] hidden = new double[weightsInputHidden.length];
        for (int h = 0; h < hidden.length; h++) {
            double sum = biasHidden[h];
            for (int i = 0; i < inputs.length; i++) {
                sum += weightsInputHidden[h][i] * inputs[i];
            }
            hidden[h] = sigmoid(sum);
        }
        double outputSum = biasOutput;
        for (int h = 0; h < hidden.length; h++) {
            outputSum += weightsHiddenOutput[h] * hidden[h];
        }
        return new ForwardResult(hidden, sigmoid(outputSum));
    }

    public int getHiddenSize() {
        return biasHidden.length;
    }

    public int getInputSize() {
        return weightsInputHidden[0].length;
    }

    public double getLearningRate() {
        return learningRate;
    }

    public int getEpochsTrained() {
        return epochsTrained;
    }

    public double getLastAverageLoss() {
        return lastAverageLoss;
    }

    public double[][] getWeightsInputHidden() {
        double[][] copy = new double[weightsInputHidden.length][];
        for (int i = 0; i < weightsInputHidden.length; i++) {
            copy[i] = Arrays.copyOf(weightsInputHidden[i], weightsInputHidden[i].length);
        }
        return copy;
    }

    public double[] getBiasHidden() {
        return Arrays.copyOf(biasHidden, biasHidden.length);
    }

    public double[] getWeightsHiddenOutput() {
        return Arrays.copyOf(weightsHiddenOutput, weightsHiddenOutput.length);
    }

    public double getBiasOutput() {
        return biasOutput;
    }

    private record ForwardResult(double[] hidden, double output) {
    }
}
