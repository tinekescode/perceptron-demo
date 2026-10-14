# Perceptron Visualizer (frontend)

A small browser app that trains both demo backends and shows what the trained networks do:

- **AND tab** calls `perceptron-demo` (single perceptron, port **8080**)
- **XOR tab** calls `perceptron-mlp` (multi-layer perceptron, port **8081**)

Plain JavaScript + [Vite](https://vite.dev). Needs Node.js 20.19+ or 22.12+.

## Run

Start both backends, each in its own Git Bash tab:

```shell
cd perceptron-demo && mvn quarkus:dev
```

```shell
cd perceptron-mlp && mvn quarkus:dev
```

Then start the frontend in a third tab:

```shell
cd perceptron-frontend
npm install   # first time only
npm run dev
```

Open http://localhost:5173. Each tab trains its network as soon as you open it and then replays the training. If a backend isn't running, the page tells you which one to start.

Vite forwards `/api/and/*` to `localhost:8080` and `/api/xor/*` to `localhost:8081` (see `vite.config.js`), so the backends need no CORS settings.

## What you see

Both backends return their whole training history, and the page plays it back slowly so you can watch the network learn:

- **AND**: one frame per training step (one example), at 1 step per second. A wrong prediction takes two frames: first the mistake with the old weights and the old line, then the update, with the new line and the old one dashed. The calculation panel shows the perceptron learning rule with the real numbers. The example being trained on is circled in the input space, and the weights that just changed are highlighted. The strip under the controls shows every step: red = wrong (weights updated), green = correct (no change).
- **XOR**: one frame per epoch. Playback always takes about 20 seconds, however many epochs training needed. The loss chart under the controls shows how the error drops. Click or drag on it to jump.

Use the controls to play/pause (or <kbd>Space</kbd>), step (<kbd>←</kbd>/<kbd>→</kbd>), scrub, or change the speed (0.25× to 4×). Every panel below always shows the network as it was at the current frame.

| Panel | Shows |
|---|---|
| **Network** | Every weight as a line: green = positive, red = negative, thicker = larger. Lines fade when little signal flows through them for the current input. Node fill = activation. |
| **Input space** | Every possible input (x₁, x₂), coloured by the network's output, with the decision boundary as a dark line. AND gives a straight line; XOR gives a curved region. Click or drag to pick an input. For XOR, click a hidden neuron (or use the h₁…h₄ buttons) to see the single straight line that neuron draws. |
| **Calculation** | The forward pass for the selected input, step by step, with the real numbers. |
| **Truth table** | Expected vs predicted output for the four training inputs. Click a row to select that input. |

The backends return weights, not outputs for every point. The browser repeats the forward pass itself (`src/models.js`, same maths as `Perceptron.predict` and `MultiLayerPerceptron.forward`) so it can show the output for any point, not just the four training inputs.

## Files

| File | Purpose |
|---|---|
| `src/main.js` | Page layout, state, calling the backends, playback loop |
| `src/playback.js` | Turns the training history into frames; step strip and loss chart |
| `src/models.js` | Forward pass for both networks |
| `src/network-view.js` | Network diagram (SVG) |
| `src/map-view.js` | Input-space colouring (canvas) and points (SVG) |
| `src/calc-view.js` | Step-by-step calculation |
