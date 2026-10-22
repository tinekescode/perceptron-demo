package nl.perceptron;

import java.io.BufferedInputStream;
import java.io.DataInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.zip.GZIPInputStream;

/**
 * A set of MNIST images: 28 × 28 grayscale handwritten digits with their labels (0–9).
 * Pixels are kept as bytes (0 = background, 255 = ink) to save memory.
 */
public record Mnist(byte[][] images, int[] labels) {

    public static final int SIDE = 28;
    public static final int PIXELS = SIDE * SIDE;

    private static final int IMAGES_MAGIC = 2051;
    private static final int LABELS_MAGIC = 2049;

    public int size() {
        return labels.length;
    }

    public int label(int index) {
        return labels[index];
    }

    /**
     * The image as network input: pixel values scaled from 0–255 to 0–1, row by row.
     */
    public double[] pixels(int index) {
        byte[] image = images[index];
        double[] pixels = new double[PIXELS];
        for (int i = 0; i < PIXELS; i++) {
            pixels[i] = (image[i] & 0xFF) / 255.0;
        }
        return pixels;
    }

    /**
     * The image as 0–255 values, row by row.
     */
    public int[] rawPixels(int index) {
        byte[] image = images[index];
        int[] pixels = new int[PIXELS];
        for (int i = 0; i < PIXELS; i++) {
            pixels[i] = image[i] & 0xFF;
        }
        return pixels;
    }

    /**
     * Loads a pair of gzipped MNIST files, such as {@code train-images-idx3-ubyte.gz} and
     * {@code train-labels-idx1-ubyte.gz}.
     */
    public static Mnist load(Path imagesGz, Path labelsGz) throws IOException {
        try (InputStream images = new GZIPInputStream(new BufferedInputStream(Files.newInputStream(imagesGz)));
             InputStream labels = new GZIPInputStream(new BufferedInputStream(Files.newInputStream(labelsGz)))) {
            return read(images, labels);
        }
    }

    /**
     * Reads the IDX format of the MNIST files: a magic number, the dimensions, then one
     * unsigned byte per pixel or label.
     */
    static Mnist read(InputStream imagesIn, InputStream labelsIn) throws IOException {
        DataInputStream images = new DataInputStream(imagesIn);
        DataInputStream labels = new DataInputStream(labelsIn);

        expectMagic(images.readInt(), IMAGES_MAGIC, "images");
        int count = images.readInt();
        int rows = images.readInt();
        int columns = images.readInt();
        if (rows != SIDE || columns != SIDE) {
            throw new IOException("Expected " + SIDE + " × " + SIDE + " images, got " + rows + " × " + columns);
        }

        expectMagic(labels.readInt(), LABELS_MAGIC, "labels");
        int labelCount = labels.readInt();
        if (labelCount != count) {
            throw new IOException(count + " images but " + labelCount + " labels");
        }

        byte[][] pixels = new byte[count][PIXELS];
        for (byte[] image : pixels) {
            images.readFully(image);
        }
        byte[] rawLabels = new byte[count];
        labels.readFully(rawLabels);
        int[] digits = new int[count];
        for (int n = 0; n < count; n++) {
            digits[n] = rawLabels[n] & 0xFF;
        }
        return new Mnist(pixels, digits);
    }

    private static void expectMagic(int actual, int expected, String what) throws IOException {
        if (actual != expected) {
            throw new IOException("Not an MNIST " + what + " file (magic number " + actual + ", expected " + expected + ")");
        }
    }
}
