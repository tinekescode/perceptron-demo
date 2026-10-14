package nl.perceptron;

import org.junit.jupiter.api.Test;

import java.util.Random;

import static org.junit.jupiter.api.Assertions.assertTrue;

class RandomStartTest {

    private static final double[][] CORNERS = {
            {0, 0},
            {0, 1},
            {1, 0},
            {1, 1}
    };

    private static final int[] AND_TARGETS = {0, 0, 0, 1};

    @Test
    void startingLineCrossesUnitSquareAndHasSomethingToLearn() {
        Random random = new Random(1);
        for (int run = 0; run < 1_000; run++) {
            Perceptron perceptron = PerceptronResource.randomStart(random);

            boolean anyZero = false;
            boolean anyOne = false;
            boolean anyWrong = false;
            for (int i = 0; i < CORNERS.length; i++) {
                int predicted = perceptron.predict(CORNERS[i]);
                anyZero |= predicted == 0;
                anyOne |= predicted == 1;
                anyWrong |= predicted != AND_TARGETS[i];
            }
            assertTrue(anyZero && anyOne, "line should separate the corners in run " + run);
            assertTrue(anyWrong, "start should not already solve AND in run " + run);
        }
    }
}
