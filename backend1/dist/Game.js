"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Game = void 0;
const chess_js_1 = require("chess.js");
const message_1 = require("./message");
class Game {
    constructor(player1, player2) {
        this.player1 = player1;
        this.player2 = player2;
        this.board = new chess_js_1.Chess();
        this.startTime = new Date();
        console.log("Game started between:", player1.url, "and", player2.url);
    }
    makeMove(socket, move) {
        // Check if it's the correct player's turn
        const isPlayer1Turn = this.board.move.length % 2 === 0;
        if ((isPlayer1Turn && socket !== this.player1) ||
            (!isPlayer1Turn && socket !== this.player2)) {
            socket.send(JSON.stringify({ type: "ERROR", message: "Not your turn" }));
            return;
        }
        try {
            const result = this.board.move(move);
            if (!result) {
                socket.send(JSON.stringify({ type: "ERROR", message: "Invalid move" }));
                return;
            }
        }
        catch (err) {
            console.log("Move error:", err);
            socket.send(JSON.stringify({ type: "ERROR", message: "Invalid move" }));
            return;
        }
        // Notify both players about the move
        const moveMessage = JSON.stringify({
            type: message_1.MOVE,
            payload: move,
            fen: this.board.fen(), // Send the current board state
        });
        this.player1.send(moveMessage);
        this.player2.send(moveMessage);
        if (this.board.isGameOver()) {
            const gameOverMessage = JSON.stringify({
                type: message_1.GAME_OVER,
                winner: this.board.turn() === "w" ? "black" : "white",
                result: this.board.isCheckmate()
                    ? "checkmate"
                    : this.board.isDraw()
                        ? "draw"
                        : this.board.isStalemate()
                            ? "stalemate"
                            : "unknown",
            });
            this.player1.send(gameOverMessage);
            this.player2.send(gameOverMessage);
        }
    }
}
exports.Game = Game;
