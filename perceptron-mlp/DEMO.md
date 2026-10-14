# Demo Guide — Perceptron MLP

A **5–10 minute** live demo of the finished app, as the follow-up to `perceptron-demo` (AND, one node). Do not rebuild it on stage.

---

## What you are showing

A Quarkus app with the same endpoint as the AND demo: `POST /perceptron/run`.
It trains a **2-4-1 network** (2 inputs → 4 hidden sigmoid nodes → 1 sigmoid output) on logical **XOR** with **backpropagation**.

**Takeaway:** one node draws one straight line, and XOR needs two. Add a hidden layer and you need a smarter learning rule (backprop) to train it.

---

## Before you start

- [ ] `cd perceptron-demo && mvn quarkus:dev` running (http://localhost:8080), for the contrast
- [ ] `cd perceptron-mlp && mvn quarkus:dev` running (http://localhost:8081)
- [ ] Optional: frontend running (`npm --prefix perceptron-frontend run dev`, http://localhost:5173)
- [ ] Open in the IDE, side by side: `perceptron-demo/.../Perceptron.java` (left) and `perceptron-mlp/.../MultiLayerPerceptron.java` (right)
- [ ] XOR truth table visible (slide or whiteboard)

---

## 5-minute flow

1. **Problem (1 min)** — XOR truth table:

   | A | B | XOR |
   |---|---|-----|
   | 0 | 0 | 0   |
   | 0 | 1 | 1   |
   | 1 | 0 | 1   |
   | 1 | 1 | 0   |

   Draw the four points on a square. `(0,1)` and `(1,0)` are 1, the corners `(0,0)` and `(1,1)` are 0.
   “Draw one straight line that separates them.” You can't. That is the whole problem.

2. **Sketch (1 min)** — 2 inputs → 4 hidden nodes → 1 output. Each hidden node draws its own line; the output node combines them into a curved region.

3. **Run (1 min)** — open the visualizer's **XOR tab** (best), or curl:

   ```shell
   curl -s -X POST http://localhost:8081/perceptron/run | jq 'del(.history)'
   ```

   `history` has one snapshot per epoch (~960), so leave it out. No `jq`? Use the visualizer.

4. **JSON (2 min)** — `architecture: "2-4-1"`, `learned: true`, then the predictions: `rawOutput` is a number between 0 and 1, not a hard 0/1; `predicted` rounds it at `0.5`.
   The raw values are close calls (≈ `0.40 / 0.50 / 0.79 / 0.28`): training stops as soon as all four are on the right side of 0.5, just like the AND demo stops as soon as all four are right.
   Then `epochsTrained`: **961**, against a handful for AND. The task is harder, and the steps are smaller.
   (The seed is fixed at 42, so unlike the AND demo every call gives the same result.)

---

## If you have ~10 minutes: the code diff (~4 min)

Use the 5-minute flow, then this. **The point is not backprop maths; it is “what had to change compared to the one-node version”.** Four stops, left file vs right file.

### 1. The weights: one list → a layer

```java
// Perceptron (AND)                    // MultiLayerPerceptron (XOR)
private final double[] weights;        private final double[][] weightsInputHidden;  // 4 × 2
private double bias;                   private final double[]   biasHidden;          // 4
                                       private final double[]   weightsHiddenOutput; // 4
                                       private double           biasOutput;
```

Say: “Same building block, there's just more of them. Each row of `weightsInputHidden` is one perceptron.”

### 2. The activation: step → sigmoid

```java
// Perceptron.predict                  // MultiLayerPerceptron
return sum >= 0 ? 1 : 0;               private static double sigmoid(double x) {
                                           return 1.0 / (1.0 + Math.exp(-x));
                                       }
```

Say: “A step is flat everywhere, so it gives no hint *how much* to change a hidden weight. Sigmoid is smooth, so we can take a slope (`y · (1 − y)`). That slope is what makes backprop possible.” This is also why `predictRaw` exists and `predict` only rounds it.

### 3. The forward pass: one sum → two layers (`forward`)

```java
// Perceptron.predict                  // MultiLayerPerceptron.forward
double sum = bias;                     for each hidden node h:
for (w...) sum += weights[i]*inputs[i];    hidden[h] = sigmoid(biasHidden[h] + Σ weightsInputHidden[h][i] · inputs[i])
                                       output = sigmoid(biasOutput + Σ weightsHiddenOutput[h] · hidden[h])
```

Say: “The first loop is four AND-style perceptrons. The second is one more perceptron, whose inputs are the hidden nodes instead of A and B.”

### 4. The learning rule: “nudge if wrong” → backprop (`trainExample`)

```java
// Perceptron.train                    // MultiLayerPerceptron.trainExample
int error = target - prediction;       double error = output - target;
if (error != 0) {                      double outputDelta = error * output * (1 - output);
    w    += η · error · x;             hiddenDelta[h] = outputDelta * weightsHiddenOutput[h]
    bias += η · error;                                  * hidden[h] * (1 - hidden[h]);
}                                      weightsHiddenOutput[h] -= η · outputDelta · hidden[h];
                                       weightsInputHidden[h][i] -= η · hiddenDelta[h] · inputs[i];
```

Say: “The output layer is almost the old rule: error times input. The new part is `hiddenDelta`. A hidden node has no target of its own, so we pass the output error **backwards** through the weight that connects them. That is *back*-propagation.”
Also point out: the AND rule only updates when wrong; this one **always** updates a little, so it keeps going until all four outputs are on the right side of 0.5.

### Stop here

Skip the getters, `IntConsumer onEpochEnd`, `EpochSnapshot` and `initialLoss` (they feed the visualizer, not the idea).

---

## Optional live tweak (~2 min, instead of part of the code diff)

In `PerceptronResource.java` set `HIDDEN_SIZE = 1`, save (dev mode reloads), run again → `learned: false` after all 10 000 epochs.
One hidden node is one line again, so you are back to the AND situation.
Then try `2`: it learns, but needs ~6 500 epochs. Two lines is the minimum for XOR, and extra nodes make it easier. Revert to `4`.

---

## Cheat sheet

| | `perceptron-demo` | `perceptron-mlp` |
|---|---|---|
| Problem | AND (linearly separable) | XOR (not linearly separable) |
| Shape | 2 → 1 | 2 → 4 → 1 |
| Activation | step (`≥ 0`) | sigmoid |
| Output | 0 or 1 | number in (0, 1), threshold 0.5 |
| Learning | update only when wrong | backprop, update every example |
| η | `0.1` | `0.5` |
| Epochs | a handful | 961 (max `10_000`) |
| Port | 8080 | 8081 |

```text
h = σ(W_ih · x + b_h)
y = σ(W_ho · h + b_o)

δ_o = (y − t) · y · (1 − y)
δ_h = W_ho · δ_o · h · (1 − h)
W  ← W − η · δ · input_to_that_layer
```

---

## Pitfalls

| Pitfall | Mitigation |
|---------|------------|
| curl output floods the terminal | `jq 'del(.history)'`, or use the visualizer |
| Port 8081 in use | Stop the other process (`perceptron-demo` is 8080) |
| Audience gets lost in the maths | Stay on “what changed”; the visualizer's hidden-node lines (h₁…h₄) show it better than formulas |
| Someone asks “why sigmoid?” | Step has no slope, so there is nothing to propagate back |
| Clock running out | Skip the code diff; the XOR drawing + `learned: true` is the demo |

---

## Commands

```shell
cd perceptron-mlp
mvn quarkus:dev
curl -s -X POST http://localhost:8081/perceptron/run | jq 'del(.history)'
mvn test
```

Files: `MultiLayerPerceptron.java` (`sigmoid`, `forward`, `trainExample`), `PerceptronResource.java` (`XOR_INPUTS`, `HIDDEN_SIZE`).
Compare with: `perceptron-demo/.../Perceptron.java` (`predict`, `train`).
