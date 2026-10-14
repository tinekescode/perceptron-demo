package nl.perceptron;

import org.junit.jupiter.api.Test;

import java.util.ArrayList;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

class MultiLayerPerceptronTest {

    private static final double[][] XOR_INPUTS = {
            {0, 0},
            {0, 1},
            {1, 0},
            {1, 1}
    };

    private static final double[] XOR_TARGETS = {0, 1, 1, 0};

    @Test
    void learnsLogicalXor() {
        MultiLayerPerceptron network = new MultiLayerPerceptron(2, 4, 0.5);
        int epochs = network.train(XOR_INPUTS, XOR_TARGETS, 10_000);

        assertTrue(epochs > 0);
        assertTrue(epochs <= 10_000);

        for (int i = 0; i < XOR_INPUTS.length; i++) {
            int expected = (int) XOR_TARGETS[i];
            assertEquals(expected, network.predict(XOR_INPUTS[i]),
                    "Failed for inputs " + XOR_INPUTS[i][0] + "," + XOR_INPUTS[i][1]);
        }
    }

    @Test
    void reportsEveryEpoch() {
        MultiLayerPerceptron network = new MultiLayerPerceptron(2, 4, 0.5);
        List<Integer> epochs = new ArrayList<>();
        int trained = network.train(XOR_INPUTS, XOR_TARGETS, 10_000, epochs::add);

        assertEquals(trained, epochs.size());
        for (int i = 0; i < epochs.size(); i++) {
            assertEquals(i + 1, epochs.get(i));
        }
    }
}
