package nl.perceptron;

import io.quarkus.runtime.StartupEvent;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.enterprise.event.Observes;
import org.eclipse.microprofile.config.inject.ConfigProperty;
import org.jboss.logging.Logger;

import java.nio.file.Path;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.Random;
import java.util.stream.IntStream;

/**
 * Holds the one digit network of this app, trains it in the background and answers questions
 * about it while it learns.
 * <p>
 * The network is guarded by {@code this}: training takes the lock for {@value #CHUNK} examples
 * at a time, so predictions from the page can slip in between and show the network mid-training.
 */
@ApplicationScoped
public class DigitTrainer {

    static final int HIDDEN_SIZE = 64;
    static final int OUTPUT_SIZE = 10;
    static final double LEARNING_RATE = 0.1;

    /** Examples trained per lock. */
    static final int CHUNK = 100;
    /** Test images used for the live accuracy curve; the full 10,000 are used after each epoch. */
    static final int CURVE_SAMPLES = 2_000;
    /** Pause after every chunk in slow mode: about 45 seconds per epoch instead of 15. */
    static final long SLOW_PAUSE_MS = 50;

    private static final Logger LOG = Logger.getLogger(DigitTrainer.class);

    @ConfigProperty(name = "digits.data-dir", defaultValue = "data")
    String dataDir;

    @ConfigProperty(name = "digits.load-on-startup", defaultValue = "true")
    boolean loadOnStartup;

    private volatile Mnist train;
    private volatile Mnist test;
    private volatile String dataStatus = "loading";
    private volatile String dataError;

    // Guarded by this
    private DigitNetwork network;
    private final List<AccuracyPoint> history = new ArrayList<>();
    private int epoch;
    private int epochs;
    private int examplesSeen;
    private Double testAccuracy;
    private boolean training;

    // Guarded by control, which start/stop/reset hold while waiting for the training thread
    private final Object control = new Object();
    private Thread trainingThread;
    private volatile boolean stopRequested;

    void onStart(@Observes StartupEvent event) {
        synchronized (this) {
            newNetwork();
        }
        if (!loadOnStartup) {
            dataStatus = "disabled";
            return;
        }
        Thread.ofPlatform().daemon().name("mnist-loader").start(this::loadData);
    }

    private void loadData() {
        Path dir = Path.of(dataDir);
        try {
            LOG.infof("Loading MNIST from %s (downloaded on the first run)", dir.toAbsolutePath());
            train = MnistFiles.loadTrain(dir);
            test = MnistFiles.loadTest(dir);
            dataStatus = "ready";
            LOG.infof("MNIST ready: %d training and %d test images", train.size(), test.size());
        } catch (Exception e) {
            if (e instanceof InterruptedException) {
                Thread.currentThread().interrupt();
            }
            dataError = e.getMessage();
            dataStatus = "error";
            LOG.error("Could not load MNIST", e);
        }
    }

    /**
     * Starts training a fresh network for the given number of epochs, in the background.
     *
     * @throws IllegalStateException if MNIST is not loaded (yet)
     */
    public void start(int epochs, boolean slow) {
        Mnist data = requireData();
        synchronized (control) {
            stopTraining();
            synchronized (this) {
                newNetwork();
                this.epochs = epochs;
                training = true;
                recordAccuracy();
            }
            stopRequested = false;
            trainingThread = Thread.ofPlatform().daemon().name("digit-training")
                    .start(() -> runTraining(data, epochs, slow));
        }
    }

    public void stop() {
        synchronized (control) {
            stopTraining();
        }
    }

    /**
     * Stops training and goes back to random weights.
     */
    public void reset() {
        synchronized (control) {
            stopTraining();
            synchronized (this) {
                newNetwork();
            }
        }
    }

    private void stopTraining() {
        if (trainingThread == null) {
            return;
        }
        stopRequested = true;
        try {
            trainingThread.join();
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
        }
        trainingThread = null;
    }

    private void newNetwork() {
        network = new DigitNetwork(Mnist.PIXELS, HIDDEN_SIZE, OUTPUT_SIZE, LEARNING_RATE, new Random(42));
        history.clear();
        epoch = 0;
        epochs = 0;
        examplesSeen = 0;
        testAccuracy = null;
        training = false;
    }

    private void runTraining(Mnist data, int epochs, boolean slow) {
        Random random = new Random(42);
        int[] order = IntStream.range(0, data.size()).toArray();
        try {
            for (int e = 1; e <= epochs && !stopRequested; e++) {
                shuffle(order, random);
                synchronized (this) {
                    epoch = e;
                }
                for (int start = 0; start < order.length && !stopRequested; start += CHUNK) {
                    synchronized (this) {
                        int end = Math.min(start + CHUNK, order.length);
                        for (int n = start; n < end; n++) {
                            network.trainExample(data.pixels(order[n]), data.label(order[n]));
                        }
                        examplesSeen += end - start;
                        // Most of the learning happens in the first few hundred examples, so measure more often there
                        if (examplesSeen <= 1_000 || examplesSeen % 1_000 == 0) {
                            recordAccuracy();
                        }
                    }
                    if (slow) {
                        Thread.sleep(SLOW_PAUSE_MS);
                    }
                }
                if (!stopRequested) {
                    synchronized (this) {
                        testAccuracy = accuracy(test.size());
                    }
                }
            }
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
        } finally {
            synchronized (this) {
                training = false;
            }
        }
    }

    private static void shuffle(int[] values, Random random) {
        for (int i = values.length - 1; i > 0; i--) {
            int j = random.nextInt(i + 1);
            int swap = values[i];
            values[i] = values[j];
            values[j] = swap;
        }
    }

    private void recordAccuracy() {
        history.add(new AccuracyPoint(examplesSeen, accuracy(CURVE_SAMPLES)));
    }

    /**
     * Fraction of the first {@code count} test images the network classifies correctly.
     */
    private double accuracy(int count) {
        int correct = 0;
        for (int n = 0; n < count; n++) {
            if (network.predict(test.pixels(n)) == test.label(n)) {
                correct++;
            }
        }
        return (double) correct / count;
    }

    public synchronized TrainingStatus status() {
        return new TrainingStatus(
                dataStatus,
                dataError,
                training,
                epoch,
                epochs,
                examplesSeen,
                train == null ? 0 : train.size(),
                testAccuracy,
                List.copyOf(history),
                Mnist.PIXELS + "-" + HIDDEN_SIZE + "-" + OUTPUT_SIZE,
                LEARNING_RATE
        );
    }

    public synchronized PredictionResult predict(double[] pixels) {
        DigitNetwork.Forward forward = network.forward(pixels);
        return new PredictionResult(
                DigitNetwork.argmax(forward.probabilities()),
                toList(forward.probabilities()),
                toList(forward.hidden())
        );
    }

    /**
     * Every hidden neuron's 784 input weights, scaled per neuron to −127…127 so they can be
     * drawn as an image and sent compactly.
     */
    public HiddenWeights hiddenWeights() {
        double[][] weights;
        synchronized (this) {
            weights = network.getWeightsInputHidden();
        }
        int[][] scaled = new int[weights.length][];
        for (int h = 0; h < weights.length; h++) {
            double max = Arrays.stream(weights[h]).map(Math::abs).max().orElse(0);
            double factor = max == 0 ? 0 : 127 / max;
            scaled[h] = Arrays.stream(weights[h]).mapToInt(w -> (int) Math.round(w * factor)).toArray();
        }
        return new HiddenWeights(Mnist.SIDE, scaled);
    }

    /**
     * A test image with the network's current answer; a random one when {@code index} is null.
     */
    public TestImage sample(Integer index) {
        requireData();
        int n = index != null ? index : new Random().nextInt(test.size());
        if (n < 0 || n >= test.size()) {
            throw new IllegalArgumentException("index must be between 0 and " + (test.size() - 1));
        }
        return testImage(n);
    }

    /**
     * The first {@code count} test images the network gets wrong.
     */
    public synchronized List<TestImage> mistakes(int count) {
        requireData();
        List<TestImage> mistakes = new ArrayList<>();
        for (int n = 0; n < test.size() && mistakes.size() < count; n++) {
            if (network.predict(test.pixels(n)) != test.label(n)) {
                mistakes.add(testImage(n));
            }
        }
        return mistakes;
    }

    private synchronized TestImage testImage(int n) {
        double[] probabilities = network.forward(test.pixels(n)).probabilities();
        int predicted = DigitNetwork.argmax(probabilities);
        return new TestImage(n, test.label(n), predicted, probabilities[predicted], test.rawPixels(n));
    }

    private Mnist requireData() {
        if (!"ready".equals(dataStatus)) {
            throw new IllegalStateException("MNIST is not loaded (" + dataStatus + ")");
        }
        return train;
    }

    private static List<Double> toList(double[] values) {
        return Arrays.stream(values).boxed().toList();
    }
}
