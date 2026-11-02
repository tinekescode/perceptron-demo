# How AI Lost the Thread

*The Strange Path from Neurons to LLMs*: the slides of the talk, as a single web page.

Open `index.html` in a browser. Keep the `assets` folder next to it.

| Key | Action |
|---|---|
| → / Space / Page Down | Next slide |
| ← / Page Up | Previous slide |
| N | Show or hide the speaker notes (from the local `speaker-notes.js`, see below) |
| F | Fullscreen |
| T | Rehearsal timer: off → 35-min plan → 50-min plan → off |
| Shift+T | Restart the rehearsal clock |

Each slide has its own link: `index.html#5` opens slide 5.

## Versions

This folder is the full English talk. There are two copies next to it. A change here does not carry over to them, so edit each one you want to change.

| Folder | Talk |
|---|---|
| [`2026-11-12-how-ai-lost-the-thread`](.) | November 12: full talk in English (35 or 50 minutes) |
| [`2026-11-02-how-ai-lost-the-thread-10-min`](../2026-11-02-how-ai-lost-the-thread-10-min) | November 2: 10 minutes, up to the backpropagation slide |
| [`2026-11-03-how-ai-lost-the-thread-nl`](../2026-11-03-how-ai-lost-the-thread-nl) | November 3: full talk in Dutch |

## Rehearsing

The same deck, with a timer for practice. It's off unless you turn it on, so on stage you just open the deck as usual.

| Open | For |
|---|---|
| http://localhost:8090/ | The talk: no timer |
| http://localhost:8090/?rehearse=35 | Practising for the 35-minute slot |
| http://localhost:8090/?rehearse=50 | Practising for the 50-minute slot |

The timer (top right) shows the elapsed time, whether you're **ahead** (too fast: slow down), **on time** or **behind**, and how long you've been on the current slide against its budget. With **N** the speaker notes also show when each slide should start.

The plans: the talk slides get their seconds from `data-secs` on the slide, stretched to fill the slot; the demos get a fixed budget; the last slide is the Q&A.

## Speaker notes

The speaker notes are not in this repo. Each deck folder has two local files, kept out of git by `.gitignore`:

- `speaker-notes.js`: what **N** shows, one entry per slide in slide order. Without it, **N** says the file is missing; everything else works.
- `speaker-notes.docx`: the same notes to read or print.

They are separate copies: a change in one doesn't update the other.

| Slot | AND demo | XOR demo | Digits demo | Talk slides | Q&A |
|---|---|---|---|---|---|
| 35 min | 5 min | 5 min | 6 min | ~16 min | 3 min |
| 50 min | 8 min | 9 min | 10 min | ~18 min | 5 min |

To change the budgets, edit `SLOTS` in `index.html`.

## Live demos on the slides

The three "Demo" slides show the demos from this repo live, inside the slide:

| Slide | Demo | Needs running |
|---|---|---|
| AND | [`perceptron-demo`](../../perceptron-demo) in [`perceptron-frontend`](../../perceptron-frontend) | `perceptron-demo` (:8080) and `perceptron-frontend` (:5180) |
| XOR | [`perceptron-mlp`](../../perceptron-mlp) in `perceptron-frontend` | `perceptron-mlp` (:8081) and `perceptron-frontend` (:5180) |
| Digits | [`perceptron-digits`](../../perceptron-digits) | `perceptron-digits` (:8082) |

Start them before the talk. A demo loads the first time you reach its slide and then stays loaded, so going back and forth keeps its state. If a demo isn't running yet, its slide shows how to start it and keeps checking, so it appears as soon as it's up; **Load anyway** skips the check.

Click into a demo to use it. While it has the keyboard:

- **Page Up / Page Down** (what a presenter clicker sends) still change slides; so do **N** and **F**
- **Esc** gives the arrow keys back to the slides
- In the AND/XOR demos, ← → and Space control the player; on the digits slide they change slides

The demo pages have an embed mode for this (`?embed`, plus `&tab=and` or `&tab=xor` for the visualizer) that leaves out their page header and fits them on a slide.

Tested with the deck served over http (for example `npx http-server presentations/2026-11-12-how-ai-lost-the-thread -p 8090`). When `index.html` is opened from disk instead, the browser may block the check whether a demo is running; then use **Load anyway**.
