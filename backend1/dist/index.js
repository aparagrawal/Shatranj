"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const ws_1 = require("ws");
const GameManager_1 = require("./GameManager");
const PORT = 8080;
console.log("🚀 Starting WebSocket server...");
const wss = new ws_1.WebSocketServer({ port: PORT });
console.log(`✅ WebSocket server is running on ws://localhost:${PORT}`);
const gameManager = new GameManager_1.GameManager();
wss.on("connection", function connection(ws, req) {
    console.log("🔵 New connection from:", req.socket.remoteAddress);
    gameManager.addUser(ws);
    ws.on("close", () => {
        console.log("🔴 Connection closed from:", req.socket.remoteAddress);
        gameManager.removeUser(ws);
    });
});
// Add error handling for the server
wss.on("error", (error) => {
    console.error("❌ WebSocket server error:", error);
});
// Handle process termination
process.on("SIGINT", () => {
    console.log("🛑 Shutting down server...");
    wss.close(() => {
        console.log("✅ Server closed");
        process.exit(0);
    });
});
