/*jslint node*/

var assert = require("assert");
var game = require("../game.js");

describe("calculateMove", function () {
    it("returns the difficulty value when success is true", function () {
        assert.strictEqual(game.calculateMove(3, true), 3);
        assert.strictEqual(game.calculateMove(5, true), 5);
    });

    it("returns 1 when success is false", function () {
        assert.strictEqual(game.calculateMove(3, false), 1);
        assert.strictEqual(game.calculateMove(5, false), 1);
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
