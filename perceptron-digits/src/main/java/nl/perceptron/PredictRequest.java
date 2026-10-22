package nl.perceptron;

import java.util.List;

/**
 * A 28 × 28 image, row by row, with pixel values from 0 (background) to 1 (ink).
 */
public record PredictRequest(List<Double> pixels) {
}
