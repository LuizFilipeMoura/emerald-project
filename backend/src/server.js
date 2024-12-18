import express from 'express';
import { createServer } from 'http';
import { Server as SocketIO } from 'socket.io';
import { PrismaClient } from '@prisma/client';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';
import GameEngine from "./game/GameEngine.js";

const prisma = new PrismaClient();

const app = express();
app.use(express.json());
app.use(cors());

class Tower {
    constructor(x, y, health, team) {
        this.x = x;
        this.y = y;
        this.health = health;
        this.team = team;
    }
    serialize() {
        return { x: this.x, y: this.y, health: this.health, team: this.team };
    }
}


const TICK_RATE = 20;

// Basic in-memory matchmaking
const waitingPlayers = [];
const activeGames = new Map();
const playerToGame = new Map();

async function addPlayerToMatchmaking(socket, io) {
    waitingPlayers.push(socket);

    if (waitingPlayers.length >= 2) {
        const p1 = waitingPlayers.shift();
        const p2 = waitingPlayers.shift();

        const game = new GameEngine([p1, p2], io);
        activeGames.set(game.id, game);
        playerToGame.set(p1.id, game);
        playerToGame.set(p2.id, game);

        await game.start();
    }
}

function removePlayerFromMatchmaking(playerId) {
    const idx = waitingPlayers.findIndex(s => s.id === playerId);
    if (idx >= 0) {
        waitingPlayers.splice(idx, 1);
        return;
    }

    const game = playerToGame.get(playerId);
    if (game) {
        game.handlePlayerDisconnect(playerId);
    }
}

// REST Endpoints

// Mock login: if player not found, create them
app.post('/auth/login', async (req, res) => {
    const { username } = req.body;
    if (!username) return res.status(400).json({ error: 'Username required' });

    let player = await prisma.player.findUnique({ where: { username } });
    if (!player) {
        player = await prisma.player.create({
            data: { username }
        });
    }
    res.json({ success: true, playerId: player.id });
});

app.get('/profile/:id', async (req, res) => {
    const player = await prisma.player.findUnique({ where: { id: req.params.id } });
    if (!player) return res.status(404).json({ error: 'Player not found' });
    res.json(player);
});

app.get('/decks/:playerId', async (req, res) => {
    const decks = await prisma.deck.findMany({
        where: { playerId: req.params.playerId }
    });
    return res.json(decks);
});

app.post('/decks/:playerId', async (req, res) => {
    const { cards } = req.body; // array of cards
    const deck = await prisma.deck.create({
        data: {
            playerId: req.params.playerId,
            cards: JSON.stringify(cards)
        }
    });
    res.json(deck);
});

// Set up server and Socket.IO
const httpServer = createServer(app);
const io = new SocketIO(httpServer, {
    cors: {
        origin: "*"
    }
});

// Integrate playerId into socket upon login in frontend
io.on('connection', (socket) => {
    console.log(`Player connected: ${socket.id}`);

    // Expect the frontend to send their playerId after authentication
    socket.on('identify', (playerId) => {
        socket.playerId = playerId;
    });

    socket.on('join_queue', () => {
        if (!socket.playerId) {
            socket.emit('error', 'Must identify first with a playerId');
            return;
        }
        addPlayerToMatchmaking(socket, io);
    });

    socket.on('play_card', (cardData) => {
        console.log("card", cardData)
        const game = playerToGame.get(socket.id);
        if (game) {
            game.playCard(socket.id, cardData);
        }
    });

    socket.on('disconnect', () => {
        console.log(`Player disconnected: ${socket.id}`);
        removePlayerFromMatchmaking(socket.id);
    });
});

httpServer.listen(4000, () => {
    console.log('Server running on port 4000');
});
