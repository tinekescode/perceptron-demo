package nl.perceptron;

import java.util.List;

public record PerceptronRunResponse(
        String gate,
        String architecture,
        int epochsTrained,
        double learningRate,
        double averageLoss,
        boolean learned,
        List<List<Double>> weightsInputHidden,
        List<Double> biasHidden,
        List<Double> weightsHiddenOutput,
        double biasOutput,
        List<Prediction> predictions,
        List<EpochSnapshot> history
) {
}
