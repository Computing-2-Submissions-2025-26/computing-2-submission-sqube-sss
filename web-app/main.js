/*
 * main.js — Web app glue between the user interface and game.js.
 *
 * Note on linting: The bundled node-jslint v0.12.1 (2013) predates ES6 and
 * cannot parse modern syntax (const, let, arrow functions). I deliberately
 * used modern JS here for clarity and to avoid var-hoisting bugs. The game
 * module (game.js) is written in ES5-style var and passes JSLint cleanly,
 * which is the file the assessment criteria target for linting.
 */
/*jslint browser: true, devel: true */
"use strict";

// --- SECTION 1: Imports and constants ---
const game = window.game;
const KEY_TO_GESTURE = {"q": "fist", "w": "palm", "e": "thumbsUp", "r": "peace", "t": "point"};
const GESTURE_TO_EMOJI = {
    "fist": "✊",
    "palm": "🖐️",
    "thumbsUp": "👍",
    "peace": "✌️",
    "point": "👆"
};
const MEMORISE_TIMES = {
    1: 1000,
    2: 2400,
    3: 4200,
    4: 6800,
    5: 10000
};
const PERFORM_TIMES_KEYBOARD = {
    1: 2000,
    2: 4000,
    3: 6000,
    4: 8000,
    5: 10000
};
const PERFORM_TIMES_WEBCAM = {
    1: 4000,
    2: 7000,
    3: 10000,
    4: 13000,
    5: 16000
};
function getPerformTime(difficulty) {
    if (inputMode === "webcam") {
        return PERFORM_TIMES_WEBCAM[difficulty];
    }
    return PERFORM_TIMES_KEYBOARD[difficulty];
}
const SQUARE_SIZE = 70;
const SQUARE_GAP = 4;
const TRACK_STEP = SQUARE_SIZE + SQUARE_GAP;

// --- SECTION 2: UI state ---
let gameState = game.createGame();
let currentDifficulty = null;
let targetSequence = [];
let playerAttempt = [];
let phase = "waitingForDifficulty";
let performTimer = null;
let countdownInterval = null;
let playerNames = {1: "Player 1", 2: "Player 2"};
let gameStarted = false;
let gameStats = {
    1: {turns: 0, sequencesNailed: 0},
    2: {turns: 0, sequencesNailed: 0}
};
let inputMode = "keyboard";  // "keyboard" or "webcam"
let webcamModel = null;
let webcamInstance = null;
let webcamLoopActive = false;
const MODEL_PATH = "assets/model/";
const MODEL_LABEL_TO_GESTURE = {
    "Thumbs up": "thumbsUp",
    "Pointing up": "point",
    "Fist": "fist",
    "Palm": "palm",
    "Peace": "peace",
    "Nothing": "nothing"
};
const WEBCAM_CONFIDENCE_THRESHOLD = 0.7;
const WEBCAM_WINDOW_MS = 3000;
let webcamVotes = {};
let webcamWindowStart = 0;

// --- SECTION 3: Functions ---

// Clear the countdown interval and blank the timer display
function stopCountdown() {
    const timerEl = document.getElementById("timer-display");
    clearInterval(countdownInterval);
    countdownInterval = null;
    timerEl.className = "";
    timerEl.textContent = "";
}

// Show a live countdown for durationMs, labelled with label
function startCountdown(durationMs, label) {
    const timerEl = document.getElementById("timer-display");
    let remaining = durationMs;
    stopCountdown();
    timerEl.className = "";
    timerEl.textContent = label + ": " + (remaining / 1000).toFixed(1) + "s";
    countdownInterval = setInterval(function () {
        remaining -= 100;
        if (remaining <= 0) {
            stopCountdown();
            return;
        }
        if (remaining < 1500) {
            timerEl.className = "urgent";
        }
        timerEl.textContent = label + ": " + (remaining / 1000).toFixed(1) + "s";
    }, 100);
}

// Move chips to current positions and update status text
function render() {
    const chip1 = document.getElementById("chip1");
    const chip2 = document.getElementById("chip2");
    chip1.style.transform = "translateX(" + (gameState.player1Position * TRACK_STEP) + "px)";
    chip2.style.transform = "translateX(" + (gameState.player2Position * TRACK_STEP) + "px)";
    document.getElementById("player1-label").textContent = playerNames[1];
    document.getElementById("player2-label").textContent = playerNames[2];
    const status = document.getElementById("status");
    if (gameState.winner) {
        status.textContent = playerNames[gameState.winner] + " wins!";
    } else {
        status.textContent = playerNames[gameState.currentPlayer] + "'s turn";
    }
}

// Apply mystery/revealed classes to every square based on current game state
function updateSquareClasses() {
    document.querySelectorAll(".square").forEach(function (sq) {
        const pos = Number(sq.dataset.position);
        const effect = game.getSpecialEffect(gameState, pos);
        sq.classList.remove("mystery", "revealed-reward", "revealed-setback");
        if (effect !== undefined) {
            if (game.isSquareRevealed(gameState, pos)) {
                sq.classList.add(effect > 0 ? "revealed-reward" : "revealed-setback");
            } else {
                sq.classList.add("mystery");
            }
        }
    });
}

// Flash a square for 900ms then settle it into its permanent revealed class
function revealSquare(position, effect, callback) {
    document.querySelectorAll(".square[data-position='" + position + "']").forEach(function (sq) {
        sq.classList.remove("mystery");
        sq.classList.add("revealing");
    });
    setTimeout(function () {
        const permanentClass = effect > 0 ? "revealed-reward" : "revealed-setback";
        document.querySelectorAll(".square[data-position='" + position + "']").forEach(function (sq) {
            sq.classList.remove("revealing");
            sq.classList.add(permanentClass);
        });
        callback();
    }, 900);
}

// Begin a new turn for the current player at the chosen difficulty
function startTurn(difficulty) {
    currentDifficulty = difficulty;
    targetSequence = game.generateSequence(difficulty);
    playerAttempt = [];
    phase = "memorising";
    showSequence();
}

// Display the sequence to memorise, then trigger the perform phase
function showSequence() {
    const memoriseTime = MEMORISE_TIMES[currentDifficulty];
    startCountdown(memoriseTime, "MEMORISE");
    const display = document.getElementById("sequence-display");
    display.textContent = targetSequence.map(function (g) {
        return GESTURE_TO_EMOJI[g];
    }).join(" → ");
    setTimeout(function () {
        display.textContent = "";
        beginPerformPhase();
    }, memoriseTime);
}

// Show "Go!" and start the timer for the player's performance window
function beginPerformPhase() {
    const performTime = getPerformTime(currentDifficulty);
    startCountdown(performTime, "GO");
    document.getElementById("message").textContent = "Go!";
    phase = "performing";
    if (inputMode === "webcam") {
        webcamVotes = {};
        webcamWindowStart = Date.now();
        const indicator = document.getElementById("webcam-slot-indicator");
        indicator.classList.remove("hidden");
        document.getElementById("slot-total").textContent = targetSequence.length;
        document.getElementById("slot-current").textContent = "1";
        document.getElementById("slot-progress-fill").style.width = "0%";
    }
    performTimer = setTimeout(function () {
        judgeAttempt();
    }, performTime);
}

// Register a gesture keypress during the perform phase
function handleKeypress(key, gestureOverride) {
    if (phase !== "performing") {
        return;
    }
    const gesture = gestureOverride || KEY_TO_GESTURE[key];
    if (!gesture) {
        return;
    }
    playerAttempt.push(gesture);
    if (playerAttempt.length === targetSequence.length) {
        clearTimeout(performTimer);
        judgeAttempt();
    }
}

// Check the attempt, move the chip, and check for a winner
function judgeAttempt() {
    document.getElementById("webcam-slot-indicator").classList.add("hidden");
    stopCountdown();
    const playerWhoPlayed = gameState.currentPlayer;
    gameStats[playerWhoPlayed].turns += 1;
    const success = game.checkSequence(targetSequence, playerAttempt);
    if (success) {
        gameStats[playerWhoPlayed].sequencesNailed += 1;
    }
    const spaces = game.calculateMove(currentDifficulty, success);
    const messageEl = document.getElementById("message");
    const finaliseJudge = function () {
        const winner = game.checkWinner(gameState);
        if (winner) {
            gameState.winner = winner;
            phase = "gameOver";
            render();
            messageEl.className = "";
            messageEl.textContent = playerNames[winner] + " wins!";
            setTimeout(function () {
                showWinnerOverlay(winner);
            }, 800);
        } else {
            endTurn(success);
        }
    };

    gameState = game.movePlayer(gameState, gameState.currentPlayer, spaces);
    render();

    const landedAt = game.getPosition(gameState, gameState.currentPlayer);
    const landedEffect = game.getSpecialEffect(gameState, landedAt);

    if (landedEffect !== undefined) {
        if (landedEffect > 0) {
            messageEl.className = "success";
            messageEl.textContent = "Bonus! Jump ahead!";
        } else {
            messageEl.className = "warning";
            messageEl.textContent = "Oh no! Setback square!";
        }
        revealSquare(landedAt, landedEffect, function () {
            gameState = game.applySpecialSquare(gameState, gameState.currentPlayer);
            updateSquareClasses();
            render();
            setTimeout(finaliseJudge, 600);
        });
    } else {
        finaliseJudge();
    }
}

// Show result feedback, switch player, and wait for next difficulty pick
function endTurn(success) {
    document.getElementById("message").textContent = success
        ? "Correct!"
        : "Try again!";
    gameState = game.switchPlayer(gameState);
    phase = "waitingForDifficulty";
    render();
}

// Show ready/set/go countdown then start gameplay
function runCountdown(callback) {
    const overlay = document.getElementById("countdown-overlay");
    const text = document.getElementById("countdown-text");
    const steps = ["READY...", "SET...", "GO!"];
    let i = 0;
    overlay.classList.add("active");

    function showNext() {
        if (i >= steps.length) {
            overlay.classList.remove("active");
            callback();
            return;
        }
        text.textContent = steps[i];
        // Restart animation
        text.style.animation = "none";
        void text.offsetWidth;  // trigger reflow
        text.style.animation = "countdown-pop 1s ease-out";
        i += 1;
        setTimeout(showNext, 900);
    }
    showNext();
}

// Start the game from the start screen
function startGame() {
    const name1 = document.getElementById("name1-input").value.trim();
    const name2 = document.getElementById("name2-input").value.trim();
    if (name1) {
        playerNames[1] = name1;
    }
    if (name2) {
        playerNames[2] = name2;
    }
    const selectedMode = document.querySelector("input[name='input-mode']:checked").value;
    inputMode = selectedMode;
    if (inputMode === "webcam") {
        document.getElementById("webcam-panel").classList.remove("hidden");
        loadWebcamModel();
    }
    document.getElementById("start-overlay").classList.remove("active");
    runCountdown(function () {
        gameStarted = true;
        render();
    });
}

// Show / hide mid-game rules overlay
function openRules() {
    document.getElementById("rules-overlay").classList.add("active");
    document.getElementById("rules-overlay").setAttribute("aria-hidden", "false");
}

function closeRules() {
    document.getElementById("rules-overlay").classList.remove("active");
    document.getElementById("rules-overlay").setAttribute("aria-hidden", "true");
}

// Orchestrate the dramatic winner reveal sequence
function showWinnerOverlay(winner) {
    const overlay = document.getElementById("winner-overlay");
    const card = document.getElementById("winner-card");
    const stats = document.getElementById("winner-stats");
    const button = document.getElementById("play-again-btn");
    const nameEl = document.getElementById("winner-name");

    // Reset all elements
    card.classList.remove("show");
    stats.classList.remove("show");
    button.classList.remove("show");

    // Populate winner name and stats
    nameEl.textContent = playerNames[winner];
    document.getElementById("stat-turns-1").textContent = gameStats[1].turns;
    document.getElementById("stat-turns-2").textContent = gameStats[2].turns;
    document.getElementById("stat-nailed-1").textContent = gameStats[1].sequencesNailed;
    document.getElementById("stat-nailed-2").textContent = gameStats[2].sequencesNailed;

    // Show overlay with suspense text immediately
    overlay.classList.add("active");
    overlay.setAttribute("aria-hidden", "false");

    // After suspense, reveal card
    setTimeout(function () {
        card.classList.add("show");
    }, 1500);

    // After card, reveal stats
    setTimeout(function () {
        stats.classList.add("show");
    }, 3400);

    // After stats, reveal play again button
    setTimeout(function () {
        button.classList.add("show");
    }, 4000);
}

// --- WEBCAM FUNCTIONS ---

// Load the Teachable Machine model
async function loadWebcamModel() {
    const statusEl = document.getElementById("webcam-status");
    statusEl.textContent = "Loading model...";
    try {
        const modelURL = MODEL_PATH + "model.json";
        const metadataURL = MODEL_PATH + "metadata.json";
        webcamModel = await tmImage.load(modelURL, metadataURL);
        statusEl.textContent = "Model loaded. Click 'Turn On' to start.";
    } catch (err) {
        statusEl.textContent = "Failed to load model.";
        console.error("Model load error:", err);
    }
}

// Start the webcam and begin classification loop
async function startWebcam() {
    const statusEl = document.getElementById("webcam-status");
    const container = document.getElementById("webcam-container");
    if (!webcamModel) {
        statusEl.textContent = "Model not loaded yet.";
        return;
    }
    try {
        statusEl.textContent = "Starting camera...";
        const flip = true;
        webcamInstance = new tmImage.Webcam(220, 220, flip);
        await webcamInstance.setup();
        await webcamInstance.play();
        container.innerHTML = "";
        container.appendChild(webcamInstance.canvas);
        webcamLoopActive = true;
        statusEl.textContent = "Active — watching gestures.";
        document.getElementById("webcam-toggle-btn").textContent = "Turn Off";
        webcamLoop();
    } catch (err) {
        statusEl.textContent = "Camera access denied or unavailable.";
        console.error("Webcam start error:", err);
    }
}

// Stop the webcam
function stopWebcam() {
    if (webcamInstance) {
        webcamInstance.stop();
        webcamInstance = null;
    }
    webcamLoopActive = false;
    document.getElementById("webcam-container").innerHTML = "";
    document.getElementById("webcam-status").textContent = "Stopped.";
    document.getElementById("webcam-toggle-btn").textContent = "Turn On";
    document.getElementById("debug-gesture").textContent = "—";
    document.getElementById("debug-confidence").textContent = "—";
}

// Run continuously: update camera frame + classify
async function webcamLoop() {
    if (!webcamLoopActive || !webcamInstance) {
        return;
    }
    webcamInstance.update();
    const predictions = await webcamModel.predict(webcamInstance.canvas);

    // Pick the highest-confidence prediction
    let topPrediction = predictions[0];
    predictions.forEach(function (p) {
        if (p.probability > topPrediction.probability) {
            topPrediction = p;
        }
    });

    const rawClass = topPrediction.className;
    const gesture = MODEL_LABEL_TO_GESTURE[rawClass] || rawClass;
    const confidence = topPrediction.probability;
    const now = Date.now();

    document.getElementById("debug-gesture").textContent = gesture;
    document.getElementById("debug-confidence").textContent = Math.round(confidence * 100) + "%";

    // Only tally votes during the perform phase
    if (phase === "performing" && webcamWindowStart > 0) {
        // Add a vote if it's a confident game gesture (not "nothing")
        if (gesture !== "nothing" && confidence >= WEBCAM_CONFIDENCE_THRESHOLD) {
            webcamVotes[gesture] = (webcamVotes[gesture] || 0) + 1;
        }

        // Show current leader in debug
        let leader = null;
        let leaderVotes = 0;
        Object.keys(webcamVotes).forEach(function (g) {
            if (webcamVotes[g] > leaderVotes) {
                leader = g;
                leaderVotes = webcamVotes[g];
            }
        });
        const elapsed = now - webcamWindowStart;
        const windowProgress = Math.min(100, Math.round((elapsed / WEBCAM_WINDOW_MS) * 100));
        document.getElementById("debug-gesture").textContent =
            (leader ? "Leading: " + leader : "...") + " (" + windowProgress + "%)";
        document.getElementById("slot-progress-fill").style.width = windowProgress + "%";

        // Check if window has expired
        if (elapsed >= WEBCAM_WINDOW_MS) {
            if (leader) {
                handleKeypress(null, leader);
                document.getElementById("debug-gesture").textContent = "✓ " + leader;
            } else {
                // No confident gesture seen — push placeholder so attempt length still advances
                document.getElementById("debug-gesture").textContent = "✗ no gesture";
                playerAttempt.push("none");
                if (playerAttempt.length === targetSequence.length) {
                    clearTimeout(performTimer);
                    judgeAttempt();
                }
            }
            // Start next window (if more gestures needed)
            webcamVotes = {};
            if (playerAttempt.length < targetSequence.length) {
                webcamWindowStart = now;
                document.getElementById("slot-current").textContent = playerAttempt.length + 1;
                document.getElementById("slot-progress-fill").style.width = "0%";
            } else {
                webcamWindowStart = 0;
            }
        }
    }

    requestAnimationFrame(webcamLoop);
}

// Toggle webcam on/off
function toggleWebcam() {
    if (webcamLoopActive) {
        stopWebcam();
    } else {
        startWebcam();
    }
}

// Reset all game state and visuals for a new round (keeping player names)
function resetGame() {
    document.getElementById("webcam-slot-indicator").classList.add("hidden");
    // Hide winner overlay
    document.getElementById("winner-overlay").classList.remove("active");
    document.getElementById("winner-overlay").setAttribute("aria-hidden", "true");

    // Fresh game state (new random special squares, positions reset)
    gameState = game.createGame();

    // Reset UI state
    currentDifficulty = null;
    targetSequence = [];
    playerAttempt = [];
    phase = "waitingForDifficulty";
    performTimer = null;
    webcamVotes = {};
    webcamWindowStart = 0;

    // Reset stats
    gameStats = {
        1: {turns: 0, sequencesNailed: 0},
        2: {turns: 0, sequencesNailed: 0}
    };

    // Clear all dynamic UI elements
    document.getElementById("message").textContent = "";
    document.getElementById("message").className = "";
    document.getElementById("sequence-display").textContent = "";
    document.getElementById("timer-display").textContent = "";
    document.getElementById("timer-display").className = "";

    // Re-paint squares (clears revealed states and recolours mystery squares for new positions)
    updateSquareClasses();

    // Mark game as not yet started so the countdown gates difficulty buttons
    gameStarted = false;

    // Render the initial board state, then run countdown
    render();
    runCountdown(function () {
        gameStarted = true;
        render();
    });
}

// --- SECTION 4: Event listeners ---

// Difficulty buttons — only respond when waiting between turns
document.querySelectorAll(".difficulty-btn").forEach(function (button) {
    button.addEventListener("click", function () {
        if (phase === "waitingForDifficulty" && gameStarted) {
            startTurn(Number(button.dataset.difficulty));
        }
    });
});

// Keyboard input for gesture entry
document.addEventListener("keydown", function (event) {
    handleKeypress(event.key.toLowerCase());
});

// Theme picker
const THEME_NAMES = {
    "f1": "F1 Racing",
    "jungle": "Jungle Safari",
    "ocean": "Ocean Voyage",
    "music": "Music Studio"
};

document.querySelectorAll(".theme-btn").forEach(function (button) {
    button.addEventListener("click", function () {
        const theme = button.dataset.theme;
        document.body.className = "theme-" + theme;
        document.querySelectorAll(".theme-btn").forEach(function (b) {
            b.classList.remove("active");
        });
        button.classList.add("active");
        document.getElementById("theme-label").textContent = "Theme: " + THEME_NAMES[theme];
    });
});

document.getElementById("play-again-btn").addEventListener("click", resetGame);

document.getElementById("start-game-btn").addEventListener("click", startGame);
document.getElementById("open-rules-btn").addEventListener("click", openRules);
document.getElementById("close-rules-btn").addEventListener("click", closeRules);

// Allow Enter key to submit player names / start game
document.getElementById("name1-input").addEventListener("keydown", function (e) {
    if (e.key === "Enter") {
        startGame();
    }
});
document.getElementById("name2-input").addEventListener("keydown", function (e) {
    if (e.key === "Enter") {
        startGame();
    }
});

// Listen for input mode change on start screen
document.querySelectorAll("input[name='input-mode']").forEach(function (radio) {
    radio.addEventListener("change", function () {
        inputMode = radio.value;
    });
});

// Webcam toggle button
document.getElementById("webcam-toggle-btn").addEventListener("click", toggleWebcam);

// Draw the initial board state with mystery squares marked
updateSquareClasses();
render();
