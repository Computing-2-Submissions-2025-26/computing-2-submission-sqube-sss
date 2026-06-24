/*jslint node: true, browser: true, devel: true */
var R = (typeof require !== "undefined") ? require("ramda") : window.R; // JSLint warns on typeof, but direct `require !== undefined` throws ReferenceError in browsers

var GESTURES = ["fist", "palm", "thumbsUp", "peace", "point"];

var SPECIAL_SQUARES = {
    3: -2,
    5: 2,
    8: -4
};

/**
 * Creates the initial game state for a two-player Lego brick-stacking race.
 * Both players start at position 0, Player 1 goes first, and there is no winner.
 * @returns {object} The initial game state with positions for both players,
 *     the current player's turn. No winner to start with.
 */
function createGame() {
    "use strict";
    return {
        player1Position: 0,
        player2Position: 0,
        currentPlayer: 1,
        winner: null
    };
}

/**
 * Generates a random sequence of gestures for a given difficulty level.
 * The gestures are drawn from a fixed pool of exactly 5 distinct gestures.
 * The length of the returned sequence equals the difficulty value.
 * @param {number} difficulty - A number from 1 to 5 representing how many
 *     gestures should be in the sequence.
 * @returns {Array} An array of gesture strings of length equal to difficulty,
 *     each element randomly chosen from the fixed gesture pool.
 */
function generateSequence(difficulty) {
    "use strict";
    return R.range(0, difficulty).map(function () {
        return GESTURES[Math.floor(Math.random() * GESTURES.length)];
    });
}

/**
 * Checks whether a player's attempted gesture sequence exactly matches
 * the target sequence, both in content and order.
 * @param {Array} target - The correct sequence of gestures the player must match.
 * @param {Array} attempt - The sequence of gestures the player actually entered.
 * @returns {boolean} true if every element of attempt matches the corresponding
 *     element of target and both arrays have the same length; false otherwise.
 */
function checkSequence(target, attempt) {
    "use strict";
    return target.join(",") === attempt.join(",");
}

/**
 * Calculates how many spaces a player moves based on the challenge difficulty
 * and whether they successfully completed the gesture sequence.
 * A successful attempt moves the player forward by the difficulty value;
 * a failed attempt moves them forward by 1 regardless of difficulty.
 * @param {number} difficulty - The difficulty level (1–5) of the challenge just attempted.
 * @param {boolean} success - true if the player matched the sequence, false otherwise.
 * @returns {number} The number of spaces the player should move forward.
 */
function calculateMove(difficulty, success) {
    "use strict";
    if (success) {
        return difficulty;
    }
    return 0;
}

/**
 * Moves a specified player forward by a given number of spaces and returns
 * the updated game state. The original state is not changed.
 * @param {object} state - The current game state containing both players' positions
 *     and other game information.
 * @param {number} player - The player number (1 or 2) whose position should be updated.
 * @param {number} spaces - The number of spaces to move the player forward.
 * @returns {object} A new game state object reflecting the player's updated position.
 */
function movePlayer(state, player, spaces) {
    "use strict";
    var field, newPosition;
    field = (player === 1)
        ? "player1Position"
        : "player2Position";
    newPosition = Math.max(0, state[field] + spaces);
    return R.assoc(field, newPosition, state);
}

/**
 * Retrieves the current board position of a specified player.
 * @param {object} state - The current game state containing both players' positions.
 * @param {number} player - The player number (1 or 2) whose position is requested.
 * @returns {number} The board position (square number) of the specified player.
 */
function getPosition(state, player) {
    "use strict";
    if (player === 1) {
        return state.player1Position;
    }
    return state.player2Position;
}

/**
 * Applies any special square effect at the current position of the given player.
 * Special squares may send players forward or back, skip turns, or do nothing.
 * The original state is not changed.
 * @param {object} state - The current game state containing both players' positions
 *     and any other relevant game information.
 * @param {number} player - The player number (1 or 2) who has just landed on a square.
 * @returns {object} A new game state object after applying the special square's effect,
 *     or the unchanged state if the square is a normal one.
 */
function applySpecialSquare(state, player) {
    "use strict";
    var position, effect;
    position = getPosition(state, player);
    effect = SPECIAL_SQUARES[position];
    if (effect === undefined) {
        return state;
    }
    return movePlayer(state, player, effect);
}

/**
 * Determines whether either player has reached or passed the final square
 * and therefore won the game.
 * @param {object} state - The current game state containing both players' positions.
 * @returns {number|null} 1 if Player 1 has won, 2 if Player 2 has won,
 *     or null if neither player has won yet.
 */
function checkWinner(state) {
    "use strict";
    if (state.player1Position >= 10) {
        return 1;
    }
    if (state.player2Position >= 10) {
        return 2;
    }
    return null;
}

/**
 * Returns the player number whose turn it currently is.
 * @param {object} state - The current game state, which tracks whose turn it is.
 * @returns {number} 1 if it is Player 1's turn, or 2 if it is Player 2's turn.
 */
function getCurrentPlayer(state) {
    "use strict";
    return state.currentPlayer;
}

/**
 * Switches the current player from 1 to 2 or from 2 to 1.
 * @param {object} state - The current game state, which tracks whose turn it is.
 * @returns {object} A new game state object with currentPlayer set to the other player.
 */
function switchPlayer(state) {
    "use strict";
    var newState = Object.assign({}, state);
    newState.currentPlayer = (state.currentPlayer === 1)
        ? 2
        : 1;
    return newState;
}

if (typeof module === "object" && module.exports) {
    module.exports = {
        createGame: createGame,
        generateSequence: generateSequence,
        checkSequence: checkSequence,
        calculateMove: calculateMove,
        movePlayer: movePlayer,
        applySpecialSquare: applySpecialSquare,
        checkWinner: checkWinner,
        getPosition: getPosition,
        getCurrentPlayer: getCurrentPlayer,
        switchPlayer: switchPlayer
    };
} else {
    window.game = {
        createGame: createGame,
        generateSequence: generateSequence,
        checkSequence: checkSequence,
        calculateMove: calculateMove,
        movePlayer: movePlayer,
        applySpecialSquare: applySpecialSquare,
        checkWinner: checkWinner,
        getPosition: getPosition,
        getCurrentPlayer: getCurrentPlayer,
        switchPlayer: switchPlayer
    };
}
