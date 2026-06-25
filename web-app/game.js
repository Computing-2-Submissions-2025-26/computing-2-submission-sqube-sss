/*jslint node: true, browser: true, devel: true */
var R = (typeof require !== "undefined") ? require("ramda") : window.R; // JSLint flags this, but it's the safest way to make game.js work in both Node and the browser

var GESTURES = ["fist", "palm", "thumbsUp", "peace", "point"];

/**
 * Generates 3 random special squares at distinct positions between 1 and 9.
 * Each one has a positive (reward, +1 to +3) or negative (setback, -1 to -4)
 * effect. Destinations are capped to [0, 9], and no destination is allowed to
 * land on another special square's position - if it does, the effect is rolled again.
 * @returns {object} A map of position → signed effect, e.g. {3: -2, 5: 2, 8: -3}.
 */
function generateSpecialSquares() {
    "use strict";
    var positions, specials, i, pos, effect, destination, valid;

    positions = [];
    while (positions.length < 3) {
        pos = Math.floor(Math.random() * 9) + 1;
        if (positions.indexOf(pos) === -1) {
            positions.push(pos);
        }
    }

    specials = {};
    i = 0;
    while (i < 3) {
        valid = false;
        while (!valid) {
            if (Math.random() < 0.5) {
                effect = Math.floor(Math.random() * 3) + 1;
            } else {
                effect = -(Math.floor(Math.random() * 4) + 1);
            }
            destination = Math.min(9, Math.max(0, positions[i] + effect));
            effect = destination - positions[i];
            valid = !R.includes(destination, R.without([positions[i]], positions));
        }
        specials[positions[i]] = effect;
        i += 1;
    }

    return specials;
}

/**
 * Creates the initial game state for a two-player Memory Sprint race.
 * Both players start at position 0, Player 1 goes first, and there's no winner yet.
 * The special squares are randomly generated each game.
 * @returns {object} The initial game state with positions, turn, winner,
 *     specialSquares map, and an empty revealedSquares array.
 */
function createGame() {
    "use strict";
    return {
        player1Position: 0,
        player2Position: 0,
        currentPlayer: 1,
        winner: null,
        specialSquares: generateSpecialSquares(),
        revealedSquares: []
    };
}

/**
 * Generates a random gesture sequence for a given difficulty level.
 * Gestures are drawn from a fixed pool of 5, and the sequence length matches
 * the difficulty value. No gesture is allowed to repeat back-to-back.
 * @param {number} difficulty - A number from 1 to 5 representing how many
 *     gestures should be in the sequence.
 * @returns {Array} An array of gesture strings of length equal to difficulty.
 */
function generateSequence(difficulty) {
    "use strict";
    var sequence, lastGesture, available, i;
    sequence = [];
    lastGesture = null;
    i = 0;
    while (i < difficulty) {
        available = (lastGesture === null)
            ? GESTURES
            : GESTURES.filter(function (g) {
                return g !== lastGesture;
            });
        lastGesture = available[Math.floor(Math.random() * available.length)];
        sequence.push(lastGesture);
        i += 1;
    }
    return sequence;
}

/**
 * Checks whether the player's attempted sequence matches the target exactly,
 * both in content and order.
 * @param {Array} target - The correct sequence of gestures the player must match.
 * @param {Array} attempt - The sequence of gestures the player actually entered.
 * @returns {boolean} true if every element matches and both arrays are the same length.
 */
function checkSequence(target, attempt) {
    "use strict";
    return target.join(",") === attempt.join(",");
}

/**
 * Works out how many spaces a player moves based on difficulty and success.
 * A correct attempt moves forward by the difficulty value, a wrong one moves 0.
 * @param {number} difficulty - The difficulty level (1–5).
 * @param {boolean} success - true if the player matched the sequence.
 * @returns {number} The number of spaces to move forward.
 */
function calculateMove(difficulty, success) {
    "use strict";
    if (success) {
        return difficulty;
    }
    return 0;
}

/**
 * Moves the specified player by a given number of spaces and returns the
 * updated state. The original state isn't modified.
 * @param {object} state - The current game state.
 * @param {number} player - The player number (1 or 2).
 * @param {number} spaces - The number of spaces to move (may be negative).
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
 * Returns the current board position of the specified player.
 * @param {object} state - The current game state.
 * @param {number} player - The player number (1 or 2).
 * @returns {number} The board position of the specified player.
 */
function getPosition(state, player) {
    "use strict";
    if (player === 1) {
        return state.player1Position;
    }
    return state.player2Position;
}

/**
 * Applies the special square effect at the player's current position, if there is one.
 * Reads the effect from state.specialSquares, moves the player accordingly, and
 * adds the position to state.revealedSquares. The original state isn't modified.
 * @param {object} state - The current game state.
 * @param {number} player - The player number (1 or 2).
 * @returns {object} A new game state after applying the effect, or the unchanged
 *     state if no special square is at this position.
 */
function applySpecialSquare(state, player) {
    "use strict";
    var position, effect, newState;
    position = getPosition(state, player);
    effect = state.specialSquares[position];
    if (effect === undefined) {
        return state;
    }
    newState = movePlayer(state, player, effect);
    newState = R.assoc("revealedSquares", R.append(position, state.revealedSquares), newState);
    return newState;
}

/**
 * Returns true if the given position has already been revealed this game.
 * @param {object} state - The current game state.
 * @param {number} position - The board position to check.
 * @returns {boolean} true if the position is in state.revealedSquares.
 */
function isSquareRevealed(state, position) {
    "use strict";
    return R.includes(position, state.revealedSquares);
}

/**
 * Returns the effect at the given position, or undefined if there's nothing special there.
 * @param {object} state - The current game state.
 * @param {number} position - The board position to query.
 * @returns {number|undefined} The signed effect value, or undefined.
 */
function getSpecialEffect(state, position) {
    "use strict";
    return state.specialSquares[position];
}

/**
 * Checks whether either player has reached or passed the final square.
 * @param {object} state - The current game state.
 * @returns {number|null} 1 if Player 1 has won, 2 if Player 2 has won, else null.
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
 * @param {object} state - The current game state.
 * @returns {number} 1 or 2.
 */
function getCurrentPlayer(state) {
    "use strict";
    return state.currentPlayer;
}

/**
 * Switches the current player from 1 to 2 or from 2 to 1.
 * @param {object} state - The current game state.
 * @returns {object} A new game state with currentPlayer set to the other player.
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
        switchPlayer: switchPlayer,
        generateSpecialSquares: generateSpecialSquares,
        isSquareRevealed: isSquareRevealed,
        getSpecialEffect: getSpecialEffect
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
        switchPlayer: switchPlayer,
        generateSpecialSquares: generateSpecialSquares,
        isSquareRevealed: isSquareRevealed,
        getSpecialEffect: getSpecialEffect
    };
}
