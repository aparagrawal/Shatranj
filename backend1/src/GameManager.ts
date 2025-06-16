import WebSocket from "ws";
import { INIT_GAME, MOVE } from "./message";
import { Game } from "./Game";

export class GameManager {
	private games: Game[];
	private pendingusers: WebSocket | null;
	private users: WebSocket[];

	constructor() {
		this.pendingusers = null;
		this.games = [];
		this.users = [];
	}

	addUser(socket: WebSocket) {
		const clientInfo = (socket as any).clientInfo || { id: "unknown" };
		console.log(`🔵 New user connected: #${clientInfo.id}`);
		console.log("Current users count:", this.users.length + 1);
		console.log("Current pending users:", this.pendingusers ? "1" : "0");
		console.log("Current active games:", this.games.length);

		this.users.push(socket);

		// Send immediate connection confirmation
		socket.send(
			JSON.stringify({
				type: "CONNECTED",
				message: "Successfully connected to game server",
				timestamp: new Date().toISOString(),
				clientId: clientInfo.id,
			}),
		);

		this.addHandler(socket);
	}

	removeUser(socket: WebSocket) {
		console.log("User disconnected:", socket.url);
		this.users = this.users.filter((user) => user !== socket);

		// If the disconnected user was waiting for a game
		if (this.pendingusers === socket) {
			this.pendingusers = null;
		}

		// Find and handle any games the user was part of
		const userGames = this.games.filter(
			(game) => game.player1 === socket || game.player2 === socket,
		);

		userGames.forEach((game) => {
			const otherPlayer = game.player1 === socket ? game.player2 : game.player1;
			if (otherPlayer) {
				otherPlayer.send(
					JSON.stringify({
						type: "OPPONENT_DISCONNECTED",
						message: "Your opponent has disconnected",
					}),
				);
			}
		});

		// Remove the games
		this.games = this.games.filter(
			(game) => game.player1 !== socket && game.player2 !== socket,
		);
	}

	private addHandler(socket: WebSocket) {
		const clientInfo = (socket as any).clientInfo || { id: "unknown" };

		socket.on("message", (data) => {
			try {
				const message = JSON.parse(data.toString());
				console.log(`📨 Received message from client #${clientInfo.id}`);
				console.log("Message type:", message.type);
				console.log("Message content:", JSON.stringify(message, null, 2));

				if (message.type === INIT_GAME) {
					console.log(`🎮 INIT_GAME request from client #${clientInfo.id}`);
					console.log("Current pending users:", this.pendingusers ? "1" : "0");

					if (!this.pendingusers) {
						console.log(
							`⏳ First player (client #${clientInfo.id}) waiting for opponent`,
						);
						this.pendingusers = socket;
						socket.send(
							JSON.stringify({
								type: "WAITING_FOR_PLAYER",
								message: "Waiting for an opponent to join...",
								timestamp: new Date().toISOString(),
								clientId: clientInfo.id,
							}),
						);
					} else {
						const pendingClientInfo = (this.pendingusers as any).clientInfo || {
							id: "unknown",
						};
						console.log("🎯 Starting new game between players");
						console.log(`Player 1: client #${pendingClientInfo.id}`);
						console.log(`Player 2: client #${clientInfo.id}`);

						const game = new Game(this.pendingusers, socket);
						this.games.push(game);

						// Notify both players
						const gameStartTime = new Date().toISOString();

						this.pendingusers.send(
							JSON.stringify({
								type: "GAME_STARTED",
								role: "player1",
								message: "Game started! You are playing as white.",
								timestamp: gameStartTime,
								clientId: pendingClientInfo.id,
								opponentId: clientInfo.id,
							}),
						);

						socket.send(
							JSON.stringify({
								type: "GAME_STARTED",
								role: "player2",
								message: "Game started! You are playing as black.",
								timestamp: gameStartTime,
								clientId: clientInfo.id,
								opponentId: pendingClientInfo.id,
							}),
						);

						console.log("✅ Game created and players notified");
						this.pendingusers = null;
					}
				}

				if (message.type === MOVE) {
					console.log(`♟️ Move request from client #${clientInfo.id}`);
					const game = this.games.find(
						(game) => game.player1 === socket || game.player2 === socket,
					);

					if (game) {
						console.log(`Found active game for client #${clientInfo.id}`);
						game.makeMove(socket, message.move);
					} else {
						console.log(`❌ No active game found for client #${clientInfo.id}`);
						socket.send(
							JSON.stringify({
								type: "ERROR",
								message: "No active game found",
								timestamp: new Date().toISOString(),
								clientId: clientInfo.id,
							}),
						);
					}
				}
			} catch (error) {
				console.error(
					`❌ Error processing message from client #${clientInfo.id}:`,
					error,
				);
				socket.send(
					JSON.stringify({
						type: "ERROR",
						message: "Invalid message format",
						timestamp: new Date().toISOString(),
						clientId: clientInfo.id,
					}),
				);
			}
		});

		socket.on("error", (error) => {
			console.error(`❌ WebSocket error for client #${clientInfo.id}:`, error);
			this.removeUser(socket);
		});

		socket.on("close", () => {
			console.log(`🔴 Connection closed for client #${clientInfo.id}`);
			this.removeUser(socket);
		});
	}
}
