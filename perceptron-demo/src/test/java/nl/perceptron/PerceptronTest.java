package nl.perceptron;

import org.junit.jupiter.api.Test;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertArrayEquals;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

class PerceptronTest {

    private static final double[][] AND_INPUTS = {
            {0, 0},
            {0, 1},
            {1, 0},
            {1, 1}
    };

    private static final int[] AND_TARGETS = {0, 0, 0, 1};

    @Test
    void learnsLogicalAnd() {
        Perceptron perceptron = new Perceptron(2, 0.1);
        int epochs = perceptron.train(AND_INPUTS, AND_TARGETS, 100);

        assertTrue(epochs > 0);
        assertTrue(epochs <= 100);

        for (int i = 0; i < AND_INPUTS.length; i++) {
            assertEquals(AND_TARGETS[i], perceptron.predict(AND_INPUTS[i]),
                    "Failed for inputs " + AND_INPUTS[i][0] + "," + AND_INPUTS[i][1]);
        }
    }

    @Test
    void reportsEveryTrainingStep() {
        Perceptron perceptron = new Perceptron(2, 0.1);
        List<int[]> steps = new ArrayList<>();
        int epochs = perceptron.train(AND_INPUTS, AND_TARGETS, 100,
                (epoch, example, predicted, error) -> steps.add(new int[]{epoch, example, predicted, error}));

        assertEquals(epochs * AND_INPUTS.length, steps.size());
        assertArrayEquals(new int[]{1, 0}, Arrays.copyOf(steps.getFirst(), 2));
        int[] last = steps.getLast();
        assertEquals(epochs, last[0]);
        assertEquals(AND_INPUTS.length - 1, last[1]);
        for (int[] step : steps) {
            assertEquals(AND_TARGETS[step[1]] - step[2], step[3]);
        }
    }
}
