# How AI Lost the Thread: November 2 (10 minutes)

The short version of the talk, for the feedback session: 10 minutes, 15 at most. The full talk is in [`how-ai-lost-the-thread`](../how-ai-lost-the-thread).

It stops at the moment AI and biology part ways:

| Slide | | Time |
|---|---|---|
| 1 | Title | 0:10 |
| 2–3 | What we ask it + "Where did you come from?" | 1:00 |
| 4 | About me | 0:30 |
| 5–6 | Neuron + how a neuron learns | 1:50 |
| 7 | Perceptron | 0:45 |
| 8 | AND demo, live on the slide | 4:00 |
| 9 | Backpropagation | 0:45 |
| 10 | XOR demo, a quick look: 961 epochs against a handful for AND | 1:00 |
| 11 | Thank you + QR codes | |

Compared with the full talk: slide 3 promises only the first stretch of the road, the XOR demo is only played once to show how long it takes, and the speaker notes of the demo, backprop and thank-you slides are adapted.

## Run

Needs four things running, each in its own terminal, from the repo folder:

```shell
cd perceptron-demo && mvn quarkus:dev
```

```shell
cd perceptron-mlp && mvn quarkus:dev
```

```shell
cd perceptron-frontend && npm run dev
```

```shell
npx --yes http-server@14.1.1 how-ai-lost-the-thread-november-2 -p 8091 -c-1 -s
```

| Open | For |
|---|---|
| http://localhost:8091/ | The talk |
| http://localhost:8091/?rehearse=10 | Practising for 10 minutes (4 of them AND, 1 XOR) |
| http://localhost:8091/?rehearse=15 | Practising for 15 minutes (8 of them AND, 1 XOR) |

Slide 4 builds up: it starts with just the name, and each press of next reveals one stop on the path (four presses). To add this to another slide, put `data-step="1"`, `"2"`, and so on on its elements.

The keys are the same as in the full talk, see its [README](../how-ai-lost-the-thread/README.md). **T** cycles off → 10 → 15 → off here.
