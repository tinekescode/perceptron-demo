package nl.perceptron;

import java.util.List;

/**
 * @param dataStatus       {@code loading}, {@code ready}, {@code error} or {@code disabled}
 * @param testAccuracy     accuracy on all 10,000 test images after the last finished epoch, or null
 * @param history          accuracy on the first 2,000 test images, measured while training
 */
public record TrainingStatus(
        String dataStatus,
        String dataError,
        boolean training,
        int epoch,
        int epochs,
        int examplesSeen,
        int examplesPerEpoch,
        Double testAccuracy,
        List<AccuracyPoint> history,
        String architecture,
        double learningRate
) {
}
