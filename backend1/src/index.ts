import WebSocket from "ws";

import { WebSocketServer } from "ws";
import { GameManager } from "./GameManager";

const PORT = 8080;
console.log("🚀 Starting WebSocket server...");

const wss = new WebSocketServer({ port: PORT });

console.log(`✅ WebSocket server is running on ws://localhost:${PORT}`);

const gameManager = new GameManager();

// Add a unique ID to each connection
let connectionId = 0;

wss.on("connection", function connection(ws, req) {
	const id = ++connectionId;
	const clientInfo = {
		id,
		address: req.socket.remoteAddress,
		url: req.url,
	};

	// Add the client info to the WebSocket object
	(ws as any).clientInfo = clientInfo;

	console.log(`🔵 New connection #${id} from:`, req.socket.remoteAddress);
	gameManager.addUser(ws);

	ws.on("close", () => {
		console.log(`🔴 Connection #${id} closed from:`, req.socket.remoteAddress);
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
