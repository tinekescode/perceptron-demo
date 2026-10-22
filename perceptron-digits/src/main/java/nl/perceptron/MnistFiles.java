package nl.perceptron;

import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;

/**
 * Downloads the four MNIST files (~11 MB in total) on first use and keeps them in a data directory.
 */
final class MnistFiles {

    /**
     * Google's mirror of the original MNIST files; the original site often refuses downloads.
     */
    static final URI MIRROR = URI.create("https://storage.googleapis.com/cvdf-datasets/mnist/");

    private MnistFiles() {
    }

    /**
     * The 60,000 training images.
     */
    static Mnist loadTrain(Path dir) throws IOException, InterruptedException {
        return Mnist.load(ensure(dir, "train-images-idx3-ubyte.gz"), ensure(dir, "train-labels-idx1-ubyte.gz"));
    }

    /**
     * The 10,000 test images, written by different people than the training images.
     */
    static Mnist loadTest(Path dir) throws IOException, InterruptedException {
        return Mnist.load(ensure(dir, "t10k-images-idx3-ubyte.gz"), ensure(dir, "t10k-labels-idx1-ubyte.gz"));
    }

    private static Path ensure(Path dir, String name) throws IOException, InterruptedException {
        Path file = dir.resolve(name);
        if (Files.exists(file)) {
            return file;
        }
        Files.createDirectories(dir);
        // Download to a temporary name first, so an interrupted download is not mistaken for a complete file
        Path partial = dir.resolve(name + ".part");
        try (HttpClient client = HttpClient.newBuilder().followRedirects(HttpClient.Redirect.NORMAL).build()) {
            HttpRequest request = HttpRequest.newBuilder(MIRROR.resolve(name)).build();
            HttpResponse<Path> response = client.send(request, HttpResponse.BodyHandlers.ofFile(partial));
            if (response.statusCode() != 200) {
                Files.deleteIfExists(partial);
                throw new IOException("Downloading " + request.uri() + " failed: HTTP " + response.statusCode());
            }
        }
        Files.move(partial, file, StandardCopyOption.REPLACE_EXISTING);
        return file;
    }
}
