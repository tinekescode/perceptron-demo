package nl.perceptron;

import java.util.List;

/**
 * @param probabilities one per digit 0–9, adding up to 1
 * @param hidden        activation (0–1) of every hidden neuron for this input
 */
public record PredictionResult(int predicted, List<Double> probabilities, List<Double> hidden) {
}
