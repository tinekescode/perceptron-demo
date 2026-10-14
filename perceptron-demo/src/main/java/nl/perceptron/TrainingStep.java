package nl.perceptron;

import java.util.List;

/**
 * One application of the perceptron learning rule: a training example is presented,
 * and {@code weights}/{@code bias} are the values after the (possible) update.
 */
public record TrainingStep(
        int epoch,
        int example,
        List<Double> inputs,
        int target,
        int predicted,
        int error,
        List<Double> weights,
        double bias
) {
}
