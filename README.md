# Memory Sprint

A two-player gesture-memory racing game built in JavaScript for the Computing 2: Applications module.

Two players take turns racing along a 10-square track. On your turn you pick a difficulty from 1 to 5, watch a sequence of hand gestures flash on screen, then perform it from memory using the keyboard (or your webcam, if you're brave). Nail it and your chip moves forward by your chosen difficulty. Some squares are mystery squares that turn out to be either bonuses or setbacks, you don't know which until someone lands on one. First chip to the finish line wins.

The game ships with four themes (F1, Jungle, Ocean, Music) and an experimental webcam mode powered by a Teachable Machine model.

---

## ⚠️ About webcam mode (please read this first)

I trained the webcam model on my own hands, in my own lighting, in my own room. Image classifiers are notoriously fussy about that sort of thing, so it might not work as smoothly when you try it. **Keyboard mode is the recommended primary input** and works perfectly on any setup, so please use that to evaluate the game itself.

**[Demo video of the webcam mode working (OneDrive)](https://imperiallondon-my.sharepoint.com/:f:/g/personal/ss5423_ic_ac_uk/IgC6At5nHfK3RocHXjNNXTywAXCgx-Ip2qtSu2EeCFu3CZY?e=a2Yb11)**

The webcam integration code is all there and documented, even if the model itself doesn't generalise cleanly.

The thing I'm most proud of: the keyboard and webcam versions share the **exact same game module**. I didn't change a single line of game logic when I added webcam support. The webcam just calls the same `handleKeypress` function that the keyboard does, only with a translated gesture name. That separation is the whole reason I could bolt webcam mode on in a few hours rather than spending days unpicking the codebase.

---

## Project documentation

### How to play

1. On the start screen, enter player names (or leave them blank) and pick an input mode.
2. Click **Start Game** and wait for the Ready/Set/Go countdown.
3. On your turn, pick a difficulty between 1 and 5. The number is how many squares you'll move if you get it right.
4. A sequence of hand-gesture emojis flashes on screen. Memorise the order.
5. When "Go!" appears, perform the sequence using the keys **Q, W, E, R, T** (Q=✊ W=🖐 E=👍 R=✌ T=👆). In webcam mode, hold each gesture in front of the camera for around 3 seconds per slot.
6. Land on a ❓ mystery square and it reveals itself as either a bonus (jump forward) or a setback (slide back). Once it's revealed, both players can see what it does.
7. First chip to reach the final square wins. There's a small dramatic reveal at the end.

There's also a **? Rules** button at the top-left that opens the rules mid-game in case you forget anything.

### Getting started

```bash
git clone https://github.com/Computing-2-Submissions-2025-26/computing-2-submission-sqube-sss.git
cd computing-2-submission-sqube-sss
npm install
npm test
```

To play the game, open `web-app/index.html` in **Firefox Developer Edition** (which is what the module recommends).

### Architecture

web-app/

├── game.js              ← game module (pure logic, no UI)

├── main.js              ← web app (handles input, updates the page)

├── index.html           ← page structure

├── default.css          ← styling (one stylesheet, four themes via CSS variables)

├── tests/

│   └── tests.js         ← Mocha unit tests for game.js

└── assets/

└── model/           ← Teachable Machine model files

`game.js` is the brain. It knows the rules, holds the state, decides legal moves, and never touches the DOM. `main.js` is the face. It listens for keypresses and camera input, asks `game.js` what should happen, and updates the page. The two halves only talk to each other through the game module's API.

This separation was easily the most important design decision in the whole project. It's why the game module has 40 unit tests sitting on top of it without needing a browser, and why I could add webcam input on the last day without breaking anything.

### How the game evolved

The first idea was a *Pictureka*-style spotting game. Then a keyboard-Twister thing. Both got cut because they were reaction-based rather than turn-based, and neither really gave the game module anything interesting to compute. The breakthrough was thinking of gestures as *inputs to a strategy game* rather than the game itself: a Snakes-and-Ladders-style race where you earn movement by performing a memorised gesture sequence. That gave me clean turns, a real decision each turn (how greedy to be with difficulty), and memory as the actual skill being tested.

### Key decisions and roadblocks

**Special squares were avoidable.** The first version had fixed special squares at known positions, but a player could just count and dodge the setbacks. Fix: randomise the special squares per game and hide them under ❓ until someone lands on one. Now you have to gamble.

**Special squares could chain.** Square 5 sent you to square 7, which was itself a setback.  Fix: no special square's destination can be another special square. The game module's generator re-rolls until that's true.

**Difficulty 4 and 5 felt very hard.** Memorising 5 items isn't 5x harder than memorising 1, it's more like 8–10x harder. Fix: memorise time scales non-linearly with difficulty, and back-to-back gesture repeats are forbidden so the same difficulty always feels the same.

**Winning was anticlimactic.** Originally the game just changed the status text to "Player 1 wins!" and stopped, which felt flat. Fix: a multi-step reveal with a suspense overlay, a trophy card, a stats panel, and a play-again button, all timed to play out over about four seconds.

---

## Webcam extension

### How it works

When webcam mode is picked on the start screen, the page loads a Teachable Machine model from `web-app/assets/model/`. The model classifies six things: Fist, Palm, Thumbs Up, Peace, Pointing Up, and Nothing. Classification runs at full frame rate during the perform phase.

For each gesture slot, the system uses a **majority-vote window**. It tallies which gesture was seen most often over a 3-second window and registers whichever one wins. There's a visible progress bar that shows the player which slot they're on ("Gesture 2 of 3") and how much window time is left.

### Challenges and how I got here

The first attempt classified per-frame and tried to detect when a gesture had been "held long enough." That was a nightmare. Intermediate frames (hand transitioning between gestures) get classified as random things, the confidence flickers, and the player can't tell when their gesture is actually registering.

I tried adding a "show nothing first" gate, the player had to drop their hand back to neutral before each gesture. Logically that made sense, but in practice it was unusable. The rhythm was unintuitive and gestures still felt like they weren't being heard.

The fix was the majority-vote system. Instead of trying to be precise about *when* a gesture starts, you sample the whole window and pick whichever gesture was seen most often. Flicker, noise, and brief misclassifications all average out. That was the moment webcam mode went from broken to actually playable.

Two smaller lessons along the way:

- **My model's class names didn't match the game's gesture names.** The model emits "Thumbs up" but the game expects "thumbsUp". Rather than retraining, I added a translation map in `main.js` (`MODEL_LABEL_TO_GESTURE`) that converts at the input boundary.
- **The model really needed a Nothing class.** Without it, the classifier always picks one of the five gestures even when no hand is in frame. Adding Nothing as an explicit class meant the system can just ignore frames where nothing's happening.

The integration touched zero lines of `game.js`. The webcam loop calls the same `handleKeypress(null, gestureName)` function the keyboard uses.

---

## Tech stack

- **Vanilla JavaScript** (no frameworks)
- **Ramda** for functional patterns (`R.range`, `R.assoc`, `R.append`, `R.includes`)
- **Mocha** for unit tests (40 tests, all passing)
- **JSLint** for linting. `game.js` passes clean apart from one documented exception (the dual Node/browser require check). `main.js` was written in modern ES6+ JavaScript and falls outside the scope of the bundled `node-jslint v0.12.1` (from 2013, predates ES6), so it's not linted by that tool. The rubric's linting requirement applies to the game module, which passes.
- **JSDoc** for API documentation
- **Teachable Machine + TensorFlow.js** for webcam gesture classification

---

## Acknowledgements

Built on the GitHub Classroom template from `fourier-space/Computing-2-Applications`.

I used Claude Code as a coding assistant during development, not as a primary builder but to help with more complex integrations (the webcam classification pipeline, some of the CSS variable setup) and to make some code more efficient amnd to structure it. All design decisions, the game concept, and the direction of the project are mine.

---

## License

Submitted as coursework for the Computing 2: Applications module at Imperial College London (2025/26).
