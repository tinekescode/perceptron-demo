package nl.perceptron;

/**
 * @param side    width and height of each weight image (28)
 * @param neurons per hidden neuron its input weights, row by row, scaled to −127…127
 */
public record HiddenWeights(int side, int[][] neurons) {
}
