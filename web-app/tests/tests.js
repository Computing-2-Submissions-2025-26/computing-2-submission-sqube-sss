/*jslint node*/

var assert = require("assert");
var game = require("../game.js");

describe("calculateMove", function () {
    it("returns the difficulty value when success is true", function () {
        assert.strictEqual(game.calculateMove(3, true), 3);
        assert.strictEqual(game.calculateMove(5, true), 5);
    });

    it("returns 0 when success is false", function () {
        assert.strictEqual(game.calculateMove(3, false), 0);
        assert.strictEqual(game.calculateMove(5, false), 0);
    });
});

describe("checkSequence", function () {
    it("returns true when two identical arrays are passed", function () {
        assert.strictEqual(game.checkSequence(["fist", "palm"], ["fist", "palm"]), true);
    });

    it("returns false when arrays differ in content", function () {
        assert.strictEqual(game.checkSequence(["fist", "palm"], ["fist", "point"]), false);
    });

    it("returns false when arrays differ in length", function () {
        assert.strictEqual(game.checkSequence(["fist", "palm"], ["fist"]), false);
    });
});

describe("createGame", function () {
    it("returns an object with player1Position of 0", function () {
        assert.strictEqual(game.createGame().player1Position, 0);
    });

    it("returns an object with player2Position of 0", function () {
        assert.strictEqual(game.createGame().player2Position, 0);
    });

    it("returns an object with currentPlayer of 1", function () {
        assert.strictEqual(game.createGame().currentPlayer, 1);
    });

    it("returns an object with winner of null", function () {
        assert.strictEqual(game.createGame().winner, null);
    });

    it("returns an object with a specialSquares property containing exactly 3 entries", function () {
        assert.strictEqual(Object.keys(game.createGame().specialSquares).length, 3);
    });

    it("returns an object with an empty revealedSquares array", function () {
        assert.deepStrictEqual(game.createGame().revealedSquares, []);
    });
});

describe("getPosition", function () {
    it("returns the correct position for player 1", function () {
        var state = {player1Position: 4, player2Position: 7, currentPlayer: 1, winner: null};
        assert.strictEqual(game.getPosition(state, 1), 4);
    });

    it("returns the correct position for player 2", function () {
        var state = {player1Position: 4, player2Position: 7, currentPlayer: 1, winner: null};
        assert.strictEqual(game.getPosition(state, 2), 7);
    });
});

describe("getCurrentPlayer", function () {
    it("returns the correct currentPlayer value from a given state", function () {
        var state1 = {player1Position: 0, player2Position: 0, currentPlayer: 1, winner: null};
        var state2 = {player1Position: 0, player2Position: 0, currentPlayer: 2, winner: null};
        assert.strictEqual(game.getCurrentPlayer(state1), 1);
        assert.strictEqual(game.getCurrentPlayer(state2), 2);
    });
});

describe("checkWinner", function () {
    it("returns 1 when player1Position is 10", function () {
        var state = {player1Position: 10, player2Position: 0, currentPlayer: 1, winner: null};
        assert.strictEqual(game.checkWinner(state), 1);
    });

    it("returns 2 when player2Position is 10", function () {
        var state = {player1Position: 0, player2Position: 10, currentPlayer: 2, winner: null};
        assert.strictEqual(game.checkWinner(state), 2);
    });

    it("returns null when neither player has reached 10", function () {
        var state = {player1Position: 5, player2Position: 8, currentPlayer: 1, winner: null};
        assert.strictEqual(game.checkWinner(state), null);
    });
});

describe("movePlayer", function () {
    it("increases player 1's position by the given spaces", function () {
        var state = {player1Position: 2, player2Position: 0, currentPlayer: 1, winner: null};
        var newState = game.movePlayer(state, 1, 3);
        assert.strictEqual(newState.player1Position, 5);
    });

    it("increases player 2's position by the given spaces", function () {
        var state = {player1Position: 0, player2Position: 4, currentPlayer: 2, winner: null};
        var newState = game.movePlayer(state, 2, 2);
        assert.strictEqual(newState.player2Position, 6);
    });

    it("does not modify the original state", function () {
        var state = {player1Position: 2, player2Position: 0, currentPlayer: 1, winner: null};
        game.movePlayer(state, 1, 3);
        assert.strictEqual(state.player1Position, 2);
    });
});

describe("switchPlayer", function () {
    it("switches currentPlayer from 1 to 2", function () {
        var state = {player1Position: 0, player2Position: 0, currentPlayer: 1, winner: null};
        assert.strictEqual(game.switchPlayer(state).currentPlayer, 2);
    });

    it("switches currentPlayer from 2 to 1", function () {
        var state = {player1Position: 0, player2Position: 0, currentPlayer: 2, winner: null};
        assert.strictEqual(game.switchPlayer(state).currentPlayer, 1);
    });
});

describe("generateSpecialSquares", function () {
    it("returns exactly 3 special squares", function () {
        var specials = game.generateSpecialSquares();
        assert.strictEqual(Object.keys(specials).length, 3);
    });

    it("places all specials at positions between 1 and 9 inclusive", function () {
        var specials = game.generateSpecialSquares();
        Object.keys(specials).forEach(function (key) {
            var pos = Number(key);
            assert.ok(pos >= 1 && pos <= 9, "position " + pos + " out of range 1–9");
        });
    });

    it("ensures no destination collides with another special square's position", function () {
        var specials = game.generateSpecialSquares();
        var positions = Object.keys(specials).map(Number);
        positions.forEach(function (pos) {
            var destination = pos + specials[pos];
            positions.forEach(function (other) {
                if (other !== pos) {
                    assert.notStrictEqual(
                        destination,
                        other,
                        "destination " + destination + " from pos " + pos + " collides with special at " + other
                    );
                }
            });
        });
    });

    it("caps all destinations to minimum 0 and maximum 9", function () {
        var specials = game.generateSpecialSquares();
        Object.keys(specials).forEach(function (key) {
            var pos = Number(key);
            var destination = pos + specials[key];
            assert.ok(
                destination >= 0 && destination <= 9,
                "destination " + destination + " out of range 0–9"
            );
        });
    });
});

describe("applySpecialSquare", function () {
    it("moves the player by the special effect when one exists", function () {
        var state = {
            player1Position: 5,
            player2Position: 0,
            currentPlayer: 1,
            winner: null,
            specialSquares: {5: 2},
            revealedSquares: []
        };
        var newState = game.applySpecialSquare(state, 1);
        assert.strictEqual(newState.player1Position, 7);
    });

    it("moves player 2 by a setback effect", function () {
        var state = {
            player1Position: 0,
            player2Position: 3,
            currentPlayer: 2,
            winner: null,
            specialSquares: {3: -2},
            revealedSquares: []
        };
        var newState = game.applySpecialSquare(state, 2);
        assert.strictEqual(newState.player2Position, 1);
    });

    it("adds the landed position to revealedSquares", function () {
        var state = {
            player1Position: 5,
            player2Position: 0,
            currentPlayer: 1,
            winner: null,
            specialSquares: {5: 2},
            revealedSquares: []
        };
        var newState = game.applySpecialSquare(state, 1);
        assert.ok(newState.revealedSquares.indexOf(5) !== -1);
    });

    it("appends to an already-populated revealedSquares", function () {
        var state = {
            player1Position: 5,
            player2Position: 0,
            currentPlayer: 1,
            winner: null,
            specialSquares: {5: 2},
            revealedSquares: [3]
        };
        var newState = game.applySpecialSquare(state, 1);
        assert.ok(newState.revealedSquares.indexOf(3) !== -1);
        assert.ok(newState.revealedSquares.indexOf(5) !== -1);
    });

    it("returns the state unchanged when no special at the current position", function () {
        var state = {
            player1Position: 4,
            player2Position: 0,
            currentPlayer: 1,
            winner: null,
            specialSquares: {5: 2},
            revealedSquares: []
        };
        var newState = game.applySpecialSquare(state, 1);
        assert.strictEqual(newState, state);
    });

    it("does not modify the original state", function () {
        var state = {
            player1Position: 5,
            player2Position: 0,
            currentPlayer: 1,
            winner: null,
            specialSquares: {5: 2},
            revealedSquares: []
        };
        game.applySpecialSquare(state, 1);
        assert.strictEqual(state.player1Position, 5);
        assert.deepStrictEqual(state.revealedSquares, []);
    });
});

describe("isSquareRevealed", function () {
    it("returns false when revealedSquares is empty", function () {
        var state = {revealedSquares: [], specialSquares: {}};
        assert.strictEqual(game.isSquareRevealed(state, 5), false);
    });

    it("returns true when the position is in revealedSquares", function () {
        var state = {revealedSquares: [3, 5], specialSquares: {}};
        assert.strictEqual(game.isSquareRevealed(state, 5), true);
    });

    it("returns false when the position is not in revealedSquares", function () {
        var state = {revealedSquares: [3, 5], specialSquares: {}};
        assert.strictEqual(game.isSquareRevealed(state, 8), false);
    });
});

describe("generateSequence", function () {
    it("returns an array of the requested length", function () {
        assert.strictEqual(game.generateSequence(3).length, 3);
        assert.strictEqual(game.generateSequence(5).length, 5);
    });

    it("never produces two of the same gesture in a row", function () {
        var iterations = 200;
        var i;
        for (i = 0; i < iterations; i += 1) {
            var seq = game.generateSequence(5);
            var j;
            for (j = 1; j < seq.length; j += 1) {
                assert.notStrictEqual(
                    seq[j],
                    seq[j - 1],
                    "back-to-back repeat at index " + j + " in " + JSON.stringify(seq)
                );
            }
        }
    });

    it("only uses gestures from the fixed pool", function () {
        var pool = ["fist", "palm", "thumbsUp", "peace", "point"];
        var seq = game.generateSequence(5);
        seq.forEach(function (g) {
            assert.ok(pool.indexOf(g) !== -1, "unexpected gesture: " + g);
        });
    });
});

describe("getSpecialEffect", function () {
    it("returns the effect at a known special position", function () {
        var state = {specialSquares: {5: 2, 3: -2}, revealedSquares: []};
        assert.strictEqual(game.getSpecialEffect(state, 5), 2);
        assert.strictEqual(game.getSpecialEffect(state, 3), -2);
    });

    it("returns undefined for a non-special position", function () {
        var state = {specialSquares: {5: 2}, revealedSquares: []};
        assert.strictEqual(game.getSpecialEffect(state, 7), undefined);
    });
});
