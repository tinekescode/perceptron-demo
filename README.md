# Perceptron Demo

From one neuron to a small neural network, in plain Java.

These are the demos from the talk **How AI Lost the Thread: The Strange Path from Neurons to LLMs**. The slides are in [`how-ai-lost-the-thread`](how-ai-lost-the-thread): open `index.html` in a browser.

| Project | What it does | Port |
|---|---|---|
| [`perceptron-demo`](perceptron-demo) | A single perceptron learns **AND** | 8080 |
| [`perceptron-mlp`](perceptron-mlp) | A 2-4-1 network with backpropagation learns **XOR**, which one perceptron cannot | 8081 |
| [`perceptron-frontend`](perceptron-frontend) | Browser visualizer that replays the training of AND and XOR | 5173 |
| [`perceptron-digits`](perceptron-digits) | A 784-64-10 network learns handwritten digits (MNIST); watch it learn and draw digits for it | 8082 |

The AND and XOR backends are Quarkus apps with one endpoint, `POST /perceptron/run`, which trains a fresh network and returns the weights, the predictions and the training history. `perceptron-digits` is a Quarkus app with its own page; it downloads MNIST (~11 MB) on its first start.

## Requirements

- Java 25+ and Maven (backends)
- Node.js 20.19+ or 22.12+ (frontend only)

## Run

Each in its own terminal:

```shell
cd perceptron-demo && mvn quarkus:dev
```

```shell
cd perceptron-mlp && mvn quarkus:dev
```

```shell
cd perceptron-frontend && npm install && npm run dev
```

Then open http://localhost:5173, or call a backend directly:

```shell
curl -X POST http://localhost:8080/perceptron/run
```

For the digits demo: `cd perceptron-digits && mvn quarkus:dev`, then open http://localhost:8082.

Run `mvn test` in any backend folder to run its tests.

## Presenting

Each backend has a `DEMO.md` with a 5–10 minute presentation guide:

1. [`perceptron-demo/DEMO.md`](perceptron-demo/DEMO.md): AND with one node
2. [`perceptron-mlp/DEMO.md`](perceptron-mlp/DEMO.md): XOR with a hidden layer, and the code differences from the one-node version
3. [`perceptron-digits/DEMO.md`](perceptron-digits/DEMO.md): handwritten digits, the same ideas at full size
