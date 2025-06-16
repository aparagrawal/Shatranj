"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GameManager = void 0;
const message_1 = require("./message");
const Game_1 = require("./Game");
class GameManager {
    constructor() {
        this.pendingusers = null;
        this.games = [];
        this.users = [];
    }
    addUser(socket) {
        const userUrl = socket.url || "unknown";
        console.log("🔵 New user connected:", userUrl);
        console.log("Current users count:", this.users.length + 1);
        console.log("Current pending users:", this.pendingusers ? "1" : "0");
        console.log("Current active games:", this.games.length);
        this.users.push(socket);
        // Send immediate connection confirmation
        socket.send(JSON.stringify({
            type: "CONNECTED",
            message: "Successfully connected to game server",
            timestamp: new Date().toISOString(),
        }));
        this.addHandler(socket);
    }
    removeUser(socket) {
        console.log("User disconnected:", socket.url);
        this.users = this.users.filter((user) => user !== socket);
        // If the disconnected user was waiting for a game
        if (this.pendingusers === socket) {
            this.pendingusers = null;
        }
        // Find and handle any games the user was part of
        const userGames = this.games.filter((game) => game.player1 === socket || game.player2 === socket);
        userGames.forEach((game) => {
            const otherPlayer = game.player1 === socket ? game.player2 : game.player1;
            if (otherPlayer) {
                otherPlayer.send(JSON.stringify({
                    type: "OPPONENT_DISCONNECTED",
                    message: "Your opponent has disconnected",
                }));
            }
        });
        // Remove the games
        this.games = this.games.filter((game) => game.player1 !== socket && game.player2 !== socket);
    }
    addHandler(socket) {
        const userUrl = socket.url || "unknown";
        socket.on("message", (data) => {
            try {
                const message = JSON.parse(data.toString());
                console.log("📨 Received message from", userUrl);
                console.log("Message type:", message.type);
                console.log("Message content:", JSON.stringify(message, null, 2));
                if (message.type === message_1.INIT_GAME) {
                    console.log("🎮 INIT_GAME request from", userUrl);
                    console.log("Current pending users:", this.pendingusers ? "1" : "0");
                    if (!this.pendingusers) {
                        console.log("⏳ First player waiting for opponent:", userUrl);
                        this.pendingusers = socket;
                        socket.send(JSON.stringify({
                            type: "WAITING_FOR_PLAYER",
                            message: "Waiting for an opponent to join...",
                            timestamp: new Date().toISOString(),
                        }));
                    }
                    else {
                        console.log("🎯 Starting new game between players");
                        console.log("Player 1:", this.pendingusers.url);
                        console.log("Player 2:", userUrl);
                        const game = new Game_1.Game(this.pendingusers, socket);
                        this.games.push(game);
                        // Notify both players
                        const gameStartTime = new Date().toISOString();
                        this.pendingusers.send(JSON.stringify({
                            type: "GAME_STARTED",
                            role: "player1",
                            message: "Game started! You are playing as white.",
                            timestamp: gameStartTime,
                            opponent: userUrl,
                        }));
                        socket.send(JSON.stringify({
                            type: "GAME_STARTED",
                            role: "player2",
                            message: "Game started! You are playing as black.",
                            timestamp: gameStartTime,
                            opponent: this.pendingusers.url,
                        }));
                        console.log("✅ Game created and players notified");
                        this.pendingusers = null;
                    }
                }
                if (message.type === message_1.MOVE) {
                    console.log("♟️ Move request from", userUrl);
                    const game = this.games.find((game) => game.player1 === socket || game.player2 === socket);
                    if (game) {
                        console.log("Found active game for player");
                        game.makeMove(socket, message.move);
                    }
                    else {
                        console.log("❌ No active game found for player:", userUrl);
                        socket.send(JSON.stringify({
                            type: "ERROR",
                            message: "No active game found",
                            timestamp: new Date().toISOString(),
                        }));
                    }
                }
            }
            catch (error) {
                console.error("❌ Error processing message from", userUrl, ":", error);
                socket.send(JSON.stringify({
                    type: "ERROR",
                    message: "Invalid message format",
                    timestamp: new Date().toISOString(),
                }));
            }
        });
        socket.on("error", (error) => {
            console.error("❌ WebSocket error for", userUrl, ":", error);
            this.removeUser(socket);
        });
        socket.on("close", () => {
            console.log("🔴 Connection closed for", userUrl);
            this.removeUser(socket);
        });
    }
}
exports.GameManager = GameManager;
