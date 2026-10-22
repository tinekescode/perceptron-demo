package nl.perceptron;

/**
 * Accuracy on test images after the network has trained on {@code examplesSeen} images.
 */
public record AccuracyPoint(int examplesSeen, double accuracy) {
}
