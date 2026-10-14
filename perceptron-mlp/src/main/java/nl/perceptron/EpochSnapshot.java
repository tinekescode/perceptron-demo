package nl.perceptron;

import java.util.List;

/**
 * All network weights after a training epoch. Epoch 0 holds the random starting weights.
 */
public record EpochSnapshot(
        int epoch,
        double averageLoss,
        List<List<Double>> weightsInputHidden,
        List<Double> biasHidden,
        List<Double> weightsHiddenOutput,
        double biasOutput
) {
}
