# Perceptron Digits

A 784-64-10 network that learns to read handwritten digits (**MNIST**) with backpropagation, with a page to watch it learn and to draw digits for it. Java 25+, Maven.

Sibling of `perceptron-demo` (AND, one node) and `perceptron-mlp` (XOR, one hidden layer): the same building blocks, but 784 inputs and 10 outputs.

```shell
mvn quarkus:dev
```

Open http://localhost:8082. The first start downloads MNIST (~11 MB) into `data/`; after that it loads in a few seconds.

`mvn test` to run tests (they don't need MNIST).

## What's on the page

| Panel | Shows |
|---|---|
| **Draw a digit** | Draw with the mouse. Next to it: the 28 × 28 image the network actually gets (scaled and centred like MNIST). **Random test image** loads a real MNIST digit |
| **Prediction** | The 10 output probabilities. Updates live while training |
| **Accuracy** | Accuracy on 2,000 test images while training. Starts at ~10% (guessing) |
| **Mistakes** | After training: test images it gets wrong. Click one to load it |
| **Hidden neurons** | Each hidden neuron's 784 weights as a 28 × 28 image (green = ink here pushes it up, red = down). Outline = how active it is for the current input |

**Slow** mode pauses between batches, so one epoch takes ~45 s instead of ~15 s. One epoch reaches ~95% on the 10,000 test images.

## REST API

| Endpoint | |
|---|---|
| `GET /digits/status` | Data and training state, accuracy history |
| `POST /digits/train?epochs=1&slow=true` | Start training a fresh network in the background |
| `POST /digits/stop` / `POST /digits/reset` | Stop training / back to random weights |
| `POST /digits/predict` | `{"pixels": [784 values 0–1]}` → probabilities and hidden activations |
| `GET /digits/hidden` | Hidden weights, scaled to −127…127 per neuron |
| `GET /digits/sample` | A random test image with the network's answer |
| `GET /digits/mistakes?count=16` | Test images the network gets wrong |

## Files

| File | Purpose |
|---|---|
| `DigitNetwork.java` | The network: sigmoid hidden layer, softmax output, backprop (compare with `MultiLayerPerceptron` in perceptron-mlp) |
| `DigitTrainer.java` | Loads MNIST, trains in the background, answers the page while training |
| `Mnist.java`, `MnistFiles.java` | Reading and downloading the MNIST files |
| `DigitsResource.java` | REST endpoints |
| `src/main/resources/META-INF/resources/` | The page (plain HTML/JS/CSS, served by Quarkus) |
