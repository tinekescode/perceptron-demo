package nl.perceptron;

import jakarta.ws.rs.POST;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.core.MediaType;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;

@Path("/perceptron")
public class PerceptronResource {

    /**
     * XOR is not linearly separable — a single perceptron cannot learn it.
     * A network with one hidden layer can.
     */
    private static final double[][] XOR_INPUTS = {
            {0, 0},
            {0, 1},
            {1, 0},
            {1, 1}
    };

    private static final double[] XOR_TARGETS = {0, 1, 1, 0};

    private static final int HIDDEN_SIZE = 4;
    private static final double LEARNING_RATE = 0.5;
    private static final int MAX_EPOCHS = 10_000;

    /**
     * Trains a multi-layer perceptron on XOR with backpropagation and returns
     * the learned weights, predictions for every truth-table row, and a weight
     * snapshot per epoch so the learning process can be replayed.
     */
    @POST
    @Path("/run")
    @Produces(MediaType.APPLICATION_JSON)
    public PerceptronRunResponse run() {
        MultiLayerPerceptron network = new MultiLayerPerceptron(2, HIDDEN_SIZE, LEARNING_RATE);

        List<EpochSnapshot> history = new ArrayList<>();
        history.add(snapshot(network, 0, initialLoss(network)));
        network.train(XOR_INPUTS, XOR_TARGETS, MAX_EPOCHS, epoch ->
                history.add(snapshot(network, epoch, network.getLastAverageLoss())));

        List<Prediction> predictions = new ArrayList<>();
        boolean learned = true;
        for (int i = 0; i < XOR_INPUTS.length; i++) {
            double raw = network.predictRaw(XOR_INPUTS[i]);
            int predicted = raw >= 0.5 ? 1 : 0;
            int expected = (int) XOR_TARGETS[i];
            boolean correct = predicted == expected;
            learned &= correct;
            predictions.add(new Prediction(
                    toList(XOR_INPUTS[i]),
                    expected,
                    predicted,
                    raw,
                    correct
            ));
        }

        return new PerceptronRunResponse(
                "XOR",
                "2-" + HIDDEN_SIZE + "-1",
                network.getEpochsTrained(),
                network.getLearningRate(),
                network.getLastAverageLoss(),
                learned,
                toLists(network.getWeightsInputHidden()),
                toList(network.getBiasHidden()),
                toList(network.getWeightsHiddenOutput()),
                network.getBiasOutput(),
                predictions,
                history
        );
    }

    private static EpochSnapshot snapshot(MultiLayerPerceptron network, int epoch, double averageLoss) {
        return new EpochSnapshot(
                epoch,
                averageLoss,
                toLists(network.getWeightsInputHidden()),
                toList(network.getBiasHidden()),
                toList(network.getWeightsHiddenOutput()),
                network.getBiasOutput()
        );
    }

    /**
     * Average loss (½·error², as in training) of the untrained network, so the loss curve
     * has a starting point. Training epochs report the loss accumulated while updating.
     */
    private static double initialLoss(MultiLayerPerceptron network) {
        double total = 0;
        for (int i = 0; i < XOR_INPUTS.length; i++) {
            double error = network.predictRaw(XOR_INPUTS[i]) - XOR_TARGETS[i];
            total += 0.5 * error * error;
        }
        return total / XOR_INPUTS.length;
    }

    private static List<Double> toList(double[] values) {
        return Arrays.stream(values).boxed().toList();
    }

    private static List<List<Double>> toLists(double[][] values) {
        return Arrays.stream(values).map(PerceptronResource::toList).toList();
    }
}
