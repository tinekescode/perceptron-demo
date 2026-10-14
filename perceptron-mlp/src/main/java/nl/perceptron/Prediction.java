package nl.perceptron;

import java.util.List;

public record Prediction(
        List<Double> inputs,
        int expected,
        int predicted,
        double rawOutput,
        boolean correct
) {
}
