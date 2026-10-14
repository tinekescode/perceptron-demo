package nl.perceptron;

import java.util.Arrays;
import java.util.Random;

/**
 * A single-node perceptron with a step activation function.
 * Learns linearly separable problems such as logical AND via the classic
 * perceptron learning rule.
 */
public class Perceptron {

    /**
     * Called after every training example, once the weights have (possibly) been updated.
     * {@code epoch} is 1-based, {@code example} is the index into the training inputs.
     */
    @FunctionalInterface
    public interface StepListener {
        void onStep(int epoch, int example, int predicted, int error);
    }

    private final double[] weights;
    private double bias;
    private final double learningRate;
    private int epochsTrained;

    public Perceptron(int inputSize, double learningRate) {
        this(inputSize, learningRate, new Random(42));
    }

    public Perceptron(int inputSize, double learningRate, Random random) {
        if (inputSize < 1) {
            throw new IllegalArgumentException("inputSize must be at least 1");
        }
        this.learningRate = learningRate;
        this.weights = new double[inputSize];
        for (int i = 0; i < inputSize; i++) {
            this.weights[i] = random.nextDouble() * 2 - 1;
        }
        this.bias = random.nextDouble() * 2 - 1;
        this.epochsTrained = 0;
    }

    /**
     * Starts from the given weights and bias instead of random ones.
     */
    public Perceptron(double[] initialWeights, double initialBias, double learningRate) {
        if (initialWeights.length < 1) {
            throw new IllegalArgumentException("initialWeights must have at least 1 element");
        }
        this.learningRate = learningRate;
        this.weights = Arrays.copyOf(initialWeights, initialWeights.length);
        this.bias = initialBias;
        this.epochsTrained = 0;
    }

    /**
     * Predicts 0 or 1 for the given inputs using a step activation.
     */
    public int predict(double[] inputs) {
        if (inputs.length != weights.length) {
            throw new IllegalArgumentException(
                    "Expected " + weights.length + " inputs, got " + inputs.length);
        }
        double sum = bias;
        for (int i = 0; i < weights.length; i++) {
            sum += weights[i] * inputs[i];
        }
        return sum >= 0 ? 1 : 0;
    }

    /**
     * Trains on the given examples until all are classified correctly or
     * {@code maxEpochs} is reached.
     *
     * @return number of epochs actually run
     */
    public int train(double[][] inputs, int[] targets, int maxEpochs) {
        return train(inputs, targets, maxEpochs, (epoch, example, predicted, error) -> {
        });
    }

    /**
     * Same as {@link #train(double[][], int[], int)}, reporting every step to {@code listener}.
     */
    public int train(double[][] inputs, int[] targets, int maxEpochs, StepListener listener) {
        if (inputs.length != targets.length) {
            throw new IllegalArgumentException("inputs and targets must have the same length");
        }

        for (int epoch = 0; epoch < maxEpochs; epoch++) {
            boolean errorOccurred = false;
            for (int i = 0; i < inputs.length; i++) {
                int prediction = predict(inputs[i]);
                int error = targets[i] - prediction;
                if (error != 0) {
                    errorOccurred = true;
                    for (int w = 0; w < weights.length; w++) {
                        weights[w] += learningRate * error * inputs[i][w];
                    }
                    // Bias updated as if there were a constant input of 1
                    bias += learningRate * error;
                }
                listener.onStep(epoch + 1, i, prediction, error);
            }
            epochsTrained = epoch + 1;
            if (!errorOccurred) {
                return epochsTrained;
            }
        }
        return epochsTrained;
    }

    public double[] getWeights() {
        return Arrays.copyOf(weights, weights.length);
    }

    public double getBias() {
        return bias;
    }

    public int getEpochsTrained() {
        return epochsTrained;
    }

    public double getLearningRate() {
        return learningRate;
    }
}
