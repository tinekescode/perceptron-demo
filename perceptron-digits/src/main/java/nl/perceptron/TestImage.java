package nl.perceptron;

/**
 * An MNIST test image with the network's current answer.
 *
 * @param pixels 784 values from 0 (background) to 255 (ink), row by row
 */
public record TestImage(int index, int label, int predicted, double confidence, int[] pixels) {
}
