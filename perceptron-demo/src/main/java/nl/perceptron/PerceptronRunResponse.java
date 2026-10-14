package nl.perceptron;

import java.util.List;

public record PerceptronRunResponse(
        String gate,
        int epochsTrained,
        double learningRate,
        List<Double> weights,
        double bias,
        boolean learned,
        List<Prediction> predictions,
        List<Double> initialWeights,
        double initialBias,
        List<TrainingStep> history
) {
}
