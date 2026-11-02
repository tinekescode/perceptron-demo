package nl.perceptron;

import jakarta.ws.rs.BadRequestException;
import jakarta.ws.rs.POST;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.QueryParam;
import jakarta.ws.rs.core.MediaType;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.Random;

@Path("/perceptron")
public class PerceptronResource {

    private static final double[][] AND_INPUTS = {
            {0, 0},
            {0, 1},
            {1, 0},
            {1, 1}
    };

    private static final int[] AND_TARGETS = {0, 0, 0, 1};

    static final double LEARNING_RATE = 0.1;
    static final double MAX_LEARNING_RATE = 2;
    private static final int MAX_EPOCHS = 100;

    /**
     * Trains a single-node perceptron on the logical AND function and returns
     * the learned weights, predictions for every truth-table row, and every
     * training step so the learning process can be replayed.
     *
     * @param learningRate defaults to {@value #LEARNING_RATE}
     * @param seed         picks the random start; pass the {@code seed} of an earlier run to start
     *                     from the same weights again, for example with a different learning rate
     */
    @POST
    @Path("/run")
    @Produces(MediaType.APPLICATION_JSON)
    public PerceptronRunResponse run(@QueryParam("learningRate") Double learningRate,
                                     @QueryParam("seed") Integer seed) {
        double rate = learningRate != null ? learningRate : LEARNING_RATE;
        if (!(rate > 0 && rate <= MAX_LEARNING_RATE)) {
            throw new BadRequestException("learningRate must be greater than 0 and at most " + MAX_LEARNING_RATE);
        }
        // An int, not a long: the seed goes to the browser and back, and JavaScript numbers
        // can't hold every long exactly
        int usedSeed = seed != null ? seed : new Random().nextInt(Integer.MAX_VALUE);
        Perceptron perceptron = randomStart(new Random(usedSeed), rate);
        List<Double> initialWeights = toList(perceptron.getWeights());
        double initialBias = perceptron.getBias();

        List<TrainingStep> history = new ArrayList<>();
        perceptron.train(AND_INPUTS, AND_TARGETS, MAX_EPOCHS, (epoch, example, predicted, error) ->
                history.add(new TrainingStep(
                        epoch,
                        example,
                        toList(AND_INPUTS[example]),
                        AND_TARGETS[example],
                        predicted,
                        error,
                        toList(perceptron.getWeights()),
                        perceptron.getBias()
                )));

        List<Prediction> predictions = new ArrayList<>();
        boolean learned = true;
        for (int i = 0; i < AND_INPUTS.length; i++) {
            int predicted = perceptron.predict(AND_INPUTS[i]);
            boolean correct = predicted == AND_TARGETS[i];
            learned &= correct;
            predictions.add(new Prediction(
                    toList(AND_INPUTS[i]),
                    AND_TARGETS[i],
                    predicted,
                    correct
            ));
        }

        return new PerceptronRunResponse(
                "AND",
                perceptron.getEpochsTrained(),
                perceptron.getLearningRate(),
                toList(perceptron.getWeights()),
                perceptron.getBias(),
                learned,
                predictions,
                initialWeights,
                initialBias,
                history,
                usedSeed
        );
    }

    /**
     * A perceptron with random weights whose decision line (z = 0) passes through a random
     * point of the unit square, so it is visible in the frontend from the first step.
     * With fully random weights and bias the line often lies far outside the square, and the
     * first examples are "correct" only because every input gets the same answer.
     * Starts that already solve AND are drawn again, so there is always something to learn.
     */
    static Perceptron randomStart(Random random, double learningRate) {
        while (true) {
            double[] weights = {random.nextDouble() * 2 - 1, random.nextDouble() * 2 - 1};
            double px = random.nextDouble();
            double py = random.nextDouble();
            double bias = -(weights[0] * px + weights[1] * py);

            Perceptron perceptron = new Perceptron(weights, bias, learningRate);
            for (int i = 0; i < AND_INPUTS.length; i++) {
                if (perceptron.predict(AND_INPUTS[i]) != AND_TARGETS[i]) {
                    return perceptron;
                }
            }
        }
    }

    private static List<Double> toList(double[] values) {
        return Arrays.stream(values).boxed().toList();
    }
}
