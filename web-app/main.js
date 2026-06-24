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
    const status = document.getElementById("status");
    if (gameState.winner) {
        status.textContent = "Player " + gameState.winner + " wins!";
    } else {
        status.textContent = "Player " + gameState.currentPlayer + "'s turn";
    }
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
            messageEl.textContent = "Player " + winner + " wins!";
        } else {
            endTurn(success);
        }
    };

    gameState = game.movePlayer(gameState, gameState.currentPlayer, spaces);
    render();

    const landedAt = game.getPosition(gameState, gameState.currentPlayer);

    if ([3, 5, 8].indexOf(landedAt) !== -1) {
        if (landedAt === 5) {
            messageEl.className = "success";
            messageEl.textContent = "Bonus! Jump ahead!";
        } else {
            messageEl.className = "warning";
            messageEl.textContent = "Oh no! Setback square!";
        }
        setTimeout(function () {
            gameState = game.applySpecialSquare(gameState, gameState.currentPlayer);
            render();
            setTimeout(finaliseJudge, 600);
        }, 1500);
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

// --- SECTION 4: Event listeners ---

// Difficulty buttons — only respond when waiting between turns
document.querySelectorAll(".difficulty-btn").forEach(function (button) {
    button.addEventListener("click", function () {
        if (phase === "waitingForDifficulty") {
            startTurn(Number(button.dataset.difficulty));
        }
    });
});

// Keyboard input for gesture entry
document.addEventListener("keydown", function (event) {
    handleKeypress(event.key.toLowerCase());
});

// Draw the initial board state
render();
