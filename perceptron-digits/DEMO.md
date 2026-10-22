# Demo Guide — Perceptron Digits

A **5–10 minute** live demo, the finale after `perceptron-demo` (AND) and `perceptron-mlp` (XOR). Do not rebuild it on stage.

---

## What you are showing

A Quarkus app with its own page on http://localhost:8082. A **784 → 64 → 10** network learns to read handwritten digits (MNIST: 60,000 training images, 10,000 test images) while the audience watches, and then reads digits you draw live.

**Takeaway:** nothing new was invented since XOR. The same neurons, the same backprop. Only the numbers got bigger: 784 inputs instead of 2, 64 hidden neurons instead of 4, 10 outputs instead of 1.

---

## Before you start

- [ ] `cd perceptron-digits && mvn quarkus:dev` running, and the log says `MNIST ready` (the first run downloads ~11 MB, so do it before the talk, on a working network)
- [ ] Browser on http://localhost:8082, zoomed so **Draw**, **Prediction** and **Accuracy** fit on the screen
- [ ] Click **Reset weights**, so the network starts untrained
- [ ] **Epochs: 1**, **Slow** ticked (one epoch takes ~45 s)
- [ ] Optional: `DigitNetwork.java` and `perceptron-mlp/.../MultiLayerPerceptron.java` open side by side

---

## 5-minute flow

1. **The problem (1 min)**: click **Random test image** a few times.
   “28 × 28 pixels = 784 numbers. That's the input: 784 inputs instead of A and B. The output: 10 neurons, one per digit.”
   Point at the small image: “This is literally what the network gets.”

2. **Before training (30 s)**: draw a digit, say a **3**.
   The bars are all around 10%: “It's guessing. The weights are random.” Point at **Hidden neurons**: noise.

3. **Train (1.5 min)**: leave your 3 on the pad and press **Train**. Talk while it runs:
   - **Accuracy**: shoots from 10% to ~75% within the first 1,000 examples, then creeps up to ~95%.
   - **Prediction**: the bars for *your* 3 change as it learns; the 3 bar takes over.
   - **Hidden neurons**: the noise turns into strokes and blobs. “Each tile is one perceptron, looking at the whole image. Nobody told it what to look for.”

4. **Try it (1.5 min)**: when it's done (~95%), **Clear** and draw digits. Let someone from the audience draw one.
   Draw a sloppy one (a 4 that looks like a 9, a 7 with a bar) and look at the second-highest bar: “It's not sure, and it tells you.”

5. **Mistakes (30 s)**: point at the **Mistakes** panel. “Would you have got these all right?” Usually not: many are ugly. Click one to show how sure it was.

---

## If you have ~10 minutes

Do the 5-minute flow, then **one** of these:

### Code diff with XOR (~3 min)

Open `DigitNetwork.java` next to `MultiLayerPerceptron.java`. The point: **it's the same code**. Three differences:

1. **Shape**: `weightsHiddenOutput` becomes `[10][64]` instead of `[4]`: 10 output neurons, not 1.
2. **Output: softmax instead of sigmoid** (`softmax`): turns 10 sums into 10 probabilities that add up to 1. That's the bars.
3. **The error** (`trainExample`): `outputDelta[o] = probability − target`, where the target is 1 for the right digit and 0 for the other nine. The `hiddenDelta` loop is the same backprop as XOR, just summed over 10 outputs.

Two small extras to point at if asked:
- `randomWeights` scales by `1/√784`. With weights in ±1 like XOR, 784 inputs would push every neuron into the flat end of the sigmoid and nothing would learn.
- In `trainExample`, background pixels (0) are skipped: their weights wouldn't change anyway, and ~80% of every image is background.

### Draw what it hasn't seen (~2 min)

Draw something that's not a digit (a letter, a smiley). It still answers, often confidently: “It can only choose between 0 and 9. It has no 'I don't know'.” A good closing thought about what these networks can and can't do.

---

## Cheat sheet

| | XOR (`perceptron-mlp`) | Digits |
|---|---|---|
| Inputs | 2 | 784 (28 × 28 pixels, 0–1) |
| Hidden | 4 sigmoid | 64 sigmoid |
| Outputs | 1 sigmoid | 10 softmax |
| Error | (y − t) · y(1 − y) | p − t (cross-entropy) |
| Training data | 4 rows | 60,000 images |
| Learning rate | 0.5 | 0.1 |
| Result | 4/4 after 961 epochs | ~95% after 1 epoch, ~96% after 3 |
| Weights | 17 | ~51,000 |

---

## Pitfalls

| Pitfall | Mitigation |
|---------|------------|
| Status stays “Loading MNIST…” | First run downloads 11 MB; do it before the talk. Files are kept in `perceptron-digits/data/` |
| Network already trained when you start | **Reset weights** |
| Drawn digit recognised badly | Draw large and in the middle with one thick stroke; MNIST digits are written that way. Some 1s, 7s and 9s are hard for it: that's an honest result |
| Port 8082 in use | Stop the other process (AND is 8080, XOR 8081) |
| Clock running out | Skip the mistakes and the code; drawing a digit after training is the demo |

---

## Commands

```shell
cd perceptron-digits
mvn quarkus:dev     # http://localhost:8082
mvn test
```

Files: `DigitNetwork.java` (`forward`, `softmax`, `trainExample`), `DigitTrainer.java` (training loop).
Compare with: `perceptron-mlp/.../MultiLayerPerceptron.java`.
