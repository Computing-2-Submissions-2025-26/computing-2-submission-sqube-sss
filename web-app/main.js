/*jslint browser */
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
const MEMORISE_MS_PER_GESTURE = 1000;
const PERFORM_MS_PER_GESTURE = 2000;
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
    startCountdown(MEMORISE_MS_PER_GESTURE * targetSequence.length, "MEMORISE");
    const display = document.getElementById("sequence-display");
    display.textContent = targetSequence.map(function (g) {
        return GESTURE_TO_EMOJI[g];
    }).join(" → ");
    setTimeout(function () {
        display.textContent = "";
        beginPerformPhase();
    }, MEMORISE_MS_PER_GESTURE * targetSequence.length);
}

// Show "Go!" and start the timer for the player's performance window
function beginPerformPhase() {
    startCountdown(PERFORM_MS_PER_GESTURE * targetSequence.length, "GO");
    document.getElementById("message").textContent = "Go!";
    phase = "performing";
    performTimer = setTimeout(function () {
        judgeAttempt();
    }, PERFORM_MS_PER_GESTURE * targetSequence.length);
}

// Register a gesture keypress during the perform phase
function handleKeypress(key) {
    if (phase !== "performing") {
        return;
    }
    const gesture = KEY_TO_GESTURE[key];
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
    stopCountdown();
    const success = game.checkSequence(targetSequence, playerAttempt);
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

// Draw the initial board state with mystery squares marked
updateSquareClasses();
render();
