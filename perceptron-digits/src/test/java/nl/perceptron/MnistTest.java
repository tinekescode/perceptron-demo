package nl.perceptron;

import org.junit.jupiter.api.Test;

import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.DataOutputStream;
import java.io.IOException;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

class MnistTest {

    @Test
    void readsImagesAndLabels() throws IOException {
        byte[] first = new byte[Mnist.PIXELS];
        byte[] second = new byte[Mnist.PIXELS];
        first[0] = (byte) 255;
        second[Mnist.PIXELS - 1] = (byte) 128;

        Mnist mnist = Mnist.read(images(2051, first, second), labels(2049, 7, 3));

        assertEquals(2, mnist.size());
        assertEquals(7, mnist.label(0));
        assertEquals(3, mnist.label(1));
        assertEquals(1.0, mnist.pixels(0)[0]);
        assertEquals(128 / 255.0, mnist.pixels(1)[Mnist.PIXELS - 1]);
        assertEquals(255, mnist.rawPixels(0)[0]);
    }

    @Test
    void rejectsWrongMagicNumber() {
        assertThrows(IOException.class, () -> Mnist.read(images(1234, new byte[Mnist.PIXELS]), labels(2049, 1)));
    }

    @Test
    void rejectsMismatchedCounts() {
        assertThrows(IOException.class, () -> Mnist.read(images(2051, new byte[Mnist.PIXELS]), labels(2049, 1, 2)));
    }

    private static ByteArrayInputStream images(int magic, byte[]... images) throws IOException {
        ByteArrayOutputStream bytes = new ByteArrayOutputStream();
        DataOutputStream out = new DataOutputStream(bytes);
        out.writeInt(magic);
        out.writeInt(images.length);
        out.writeInt(Mnist.SIDE);
        out.writeInt(Mnist.SIDE);
        for (byte[] image : images) {
            out.write(image);
        }
        return new ByteArrayInputStream(bytes.toByteArray());
    }

    private static ByteArrayInputStream labels(int magic, int... labels) throws IOException {
        ByteArrayOutputStream bytes = new ByteArrayOutputStream();
        DataOutputStream out = new DataOutputStream(bytes);
        out.writeInt(magic);
        out.writeInt(labels.length);
        for (int label : labels) {
            out.writeByte(label);
        }
        return new ByteArrayInputStream(bytes.toByteArray());
    }
}
