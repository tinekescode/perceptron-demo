# Demo Guide — Perceptron Demo

A **5–10 minute** live demo of the finished app, shown in the **visualizer** (`perceptron-frontend`). Do not rebuild it on stage.

---

## What you are showing

A Quarkus app with one REST endpoint: `POST /perceptron/run`.
It trains a **single-node perceptron** on logical **AND** and returns the weights, the predictions and **every training step**.
The visualizer replays those steps one per second, so the audience watches the line move until it separates the points.

**Takeaway:** a perceptron is a tiny trainable classifier: weighted sum, threshold, nudge when wrong. AND is linearly separable, so one node (one straight line) is enough.

---

## Before you start

- [ ] Backend running: `cd perceptron-demo && mvn quarkus:dev` (http://localhost:8080)
- [ ] Frontend running: `cd perceptron-frontend && npm run dev` (run `npm install` first, once)
- [ ] Browser open on http://localhost:5173, **AND** tab, zoomed so all four panels fit on the screen
- [ ] Toolbar says **Connected to :8080** and **Learned: Yes ✓**
- [ ] Optional: `Perceptron.java` and `PerceptronResource.java` open in the IDE
- [ ] Optional: `perceptron-mlp` running on 8081, if you'll tease XOR at the end

The AND tab trains and starts playing as soon as the page opens. Press **⏮** to go back to the start before you begin.

---

## The screen (what to point at)

| Panel | What it shows for AND |
|---|---|
| **Toolbar** | **Train again**, epochs, learning rate, learned ✓/✗ |
| **Player** | Play/pause, step **⏴ ⏵**, scrub, speed. The label says which example is being trained on and whether it was right |
| **Step strip** | One cell per training step, grouped by epoch: **red** = wrong (weights updated), **green** = correct (no change) |
| **Network** | x₁, x₂ → one node. Line thickness/colour = weight. Changed weights are highlighted |
| **Input space** | The four points, coloured by the output, with the decision line. The current example is circled; after an update the old line is dashed |
| **Calculation** | `z = w₁·x₁ + w₂·x₂ + b`, the step, and the learning rule, **with the real numbers** |
| **Truth table** | Expected vs predicted for the four inputs. Click a row to select it |

---

## 5-minute flow

1. **Problem (1 min)**: point at the **Truth table**.

   | A | B | AND |
   |---|---|-----|
   | 0 | 0 | 0   |
   | 0 | 1 | 0   |
   | 1 | 0 | 0   |
   | 1 | 1 | 1   |

   In **Input space**: “Only the top-right corner is 1. Can we draw one straight line to cut it off? Yes.”

2. **The neuron (1 min)**: at the start frame (**⏮**), point at **Network** and **Calculation**:
   two inputs → weighted sum + bias → step (`z ≥ 0` → 1, else 0). The weights are random, so the line is in a random place and some answers are wrong.

3. **Watch it learn (2 min)**: press **▶ Play** (1 step per second).
   - Green step: “Right, so leave it.”
   - Red step: the player **stops on the mistake** for one frame, then shows the update. **The line jumps; the dashed line is where it was.** Pause here once and read the update in **Calculation**: `w += η · error · x`.
   - Point at the **step strip**: red early, an all-green epoch at the end. That clean epoch is why training stops.

4. **Result (1 min)**: toolbar says **Learned: Yes ✓**; the truth table is all correct. Click **Train again**: a new random start, a different path, and the same result.

---

## If you have ~10 minutes

Do the 5-minute flow, then **one** of these (not both):

- **Code peek** (~3 min): open the two files below, say these four points, stop
- **Live tweak** (~3 min): see below

### Code peek (in this order)

Stay in `Perceptron.java` except the first stop. Each stop maps to something they've just seen on screen.

1. **`PerceptronResource`: AND table**
   `AND_INPUTS` / `AND_TARGETS` is the truth table as data. The endpoint creates a perceptron, trains, then predicts those four rows. That is the whole API.

2. **`predict`: the neuron** (= the **Calculation** panel)
   `sum = bias + w1·x1 + w2·x2`, then `sum >= 0 ? 1 : 0`. No hidden layer. `sum = 0` is the line in **Input space**.

3. **`train`: the learning rule** (= every **red** cell)
   For each example: predict, `error = target − prediction`. If `error != 0`,
   `w += η · error · x` and `bias += η · error`. If a whole epoch is clean (all green), stop.

4. **Stop here**
   “Wrong → nudge. Right → leave it. Repeat until AND is solved.”
   `StepListener` and `randomStart` only exist to feed the visualizer: every step is recorded, and the start line always crosses the square so you can see it move. Skip them unless asked.

### Live tweak

In `PerceptronResource.java` set `LEARNING_RATE = 1.0`, save, click **Train again**. The line takes bigger jumps (it may overshoot). Set it to `0.01`: tiny moves, many more epochs. Revert to `0.1`.

Don't change `AND_TARGETS`: the visualizer computes the expected AND values itself, so the truth table and calculation would disagree with the backend.

### Closing teaser (30 s)

Switch to the **XOR** tab (needs `perceptron-mlp` on 8081): “Now the 1s are on opposite corners. No single line can do this.” That leads into the MLP demo (`perceptron-mlp/DEMO.md`).

---

## Cheat sheet

```text
output = step(bias + w1·x1 + w2·x2)

if wrong:
  w    += η · (target − output) · x
  bias += η · (target − output)
```

- **η** = `0.1`
- AND: one straight line separates `(1,1)` from the other three points
- XOR (if asked): not linearly separable → one perceptron cannot learn it (that is the MLP demo)

---

## Pitfalls

| Pitfall | Mitigation |
|---------|------------|
| Red box “Can't reach perceptron-demo on port 8080” | Backend not running: `cd perceptron-demo && mvn quarkus:dev`, then click **Train** |
| Port 8080 in use | Stop the other process (`perceptron-mlp` is 8081, the frontend 5173) |
| Animation already finished when you start talking | **⏮** back to the start, then **▶ Play** |
| A run that's too short (solved in 1–2 updates) | Click **Train again** until there are a few red steps |
| Too slow for the time you have | Set speed to 2× or 4×, or scrub to the end |
| Audience loses the maths | Point at the line in **Input space**, not the numbers |
| Clock running out | Skip the code peek / tweak; watching the line move is the demo |

---

## Commands

```shell
# terminal 1
cd perceptron-demo
mvn quarkus:dev

# terminal 2
cd perceptron-frontend
npm install   # first time only
npm run dev   # http://localhost:5173

# without the frontend
curl -X POST http://localhost:8080/perceptron/run
```

Files: `PerceptronResource.java`, `Perceptron.java` (`predict`, then `train`).
