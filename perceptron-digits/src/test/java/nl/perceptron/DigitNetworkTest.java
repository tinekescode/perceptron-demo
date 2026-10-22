package nl.perceptron;

import org.junit.jupiter.api.Test;

import java.util.Arrays;
import java.util.Random;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

class DigitNetworkTest {

    /**
     * Three "images" of four pixels, one per class, plus noisy copies.
     */
    private static final double[][] INPUTS = {
            {1, 1, 0, 0}, {0.9, 0.8, 0.1, 0},
            {0, 0, 1, 1}, {0.1, 0, 0.9, 0.8},
            {1, 0, 0, 1}, {0.8, 0.1, 0, 0.9},
    };
    private static final int[] LABELS = {0, 0, 1, 1, 2, 2};

    @Test
    void probabilitiesAddUpToOne() {
        DigitNetwork network = new DigitNetwork(4, 5, 3, 0.5, new Random(1));
        double[] probabilities = network.forward(INPUTS[0]).probabilities();

        assertEquals(3, probabilities.length);
        assertEquals(1.0, Arrays.stream(probabilities).sum(), 1e-9);
        assertEquals(DigitNetwork.argmax(probabilities), network.predict(INPUTS[0]));
    }

    @Test
    void learnsToSeparateThreeClasses() {
        DigitNetwork network = new DigitNetwork(4, 5, 3, 0.5, new Random(1));

        double firstLoss = epoch(network);
        double lastLoss = firstLoss;
        for (int epoch = 0; epoch < 500; epoch++) {
            lastLoss = epoch(network);
        }

        assertTrue(lastLoss < firstLoss / 10, "loss should drop, was " + firstLoss + " → " + lastLoss);
        for (int n = 0; n < INPUTS.length; n++) {
            assertEquals(LABELS[n], network.predict(INPUTS[n]), "example " + n);
        }
    }

    @Test
    void rejectsWrongInputSize() {
        DigitNetwork network = new DigitNetwork(4, 5, 3, 0.5, new Random(1));

        assertThrows(IllegalArgumentException.class, () -> network.predict(new double[3]));
    }

    private static double epoch(DigitNetwork network) {
        double total = 0;
        for (int n = 0; n < INPUTS.length; n++) {
            total += network.trainExample(INPUTS[n], LABELS[n]);
        }
        return total / INPUTS.length;
    }
}
