import express from 'express';
import { createServer } from 'http';
import { Server as SocketIO } from 'socket.io';
import { PrismaClient } from '@prisma/client';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';

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

class Unit {
    constructor({ id, x, y, team, health, damage, speed }) {
        this.id = id;
        this.x = x;
        this.y = y;
        this.team = team;
        this.health = health;
        this.damage = damage;
        this.speed = speed;
    }

    update() {
        // Move units toward enemy territory
        this.y += this.team === 0 ? -this.speed : this.speed;
    }

    serialize() {
        return { id: this.id, x: this.x, y: this.y, team: this.team, health: this.health };
    }
}

const TICK_RATE = 20;

class GameEngine {
    constructor(players, io) {
        this.id = uuidv4();
        this.io = io;
        this.players = players; // array of 2 sockets
        this.interval = null;
        this.towers = {
            leftKing: new Tower(150, 700, 3000, 0),
            rightKing: new Tower(450, 100, 3000, 1)
        };
        this.units = [];
        this.elixir = [5, 5]; // Player 0 and Player 1 elixir
        this.roomName = `game_${this.id}`;
        // Store player DB IDs for match record
        this.playerIds = []; // Will be filled at game start
    }

    async start() {
        // Assume each socket has playerId (from login)
        this.playerIds = this.players.map(s => s.playerId);
        // Create a match record
        await prisma.match.create({
            data: {
                player1Id: this.playerIds[0],
                player2Id: this.playerIds[1]
            }
        });

        this.players.forEach((socket, index) => {
            socket.join(this.roomName);
            socket.emit('game_start', { gameId: this.id, playerIndex: index });
        });

        this.interval = setInterval(() => this.tick(), 1000 / TICK_RATE);
    }

    tick() {
        this.updateUnits();
        this.regenerateElixir();
        this.checkCollisions();
        this.checkGameOver();

        const serializedState = this.serializeGameState();
        this.io.to(this.roomName).emit('game_state', serializedState);
    }

    playCard(playerId, cardData) {
        const playerIndex = this.players.findIndex(p => p.id === playerId);
        if (playerIndex === -1) return;

        if (this.elixir[playerIndex] < cardData.cost) return;
        this.elixir[playerIndex] -= cardData.cost;

        const x = playerIndex === 0 ? 150 : 450;
        const y = playerIndex === 0 ? 600 : 200;

        const newUnit = new Unit({
            id: uuidv4(),
            x,
            y,
            team: playerIndex,
            health: 500,
            damage: 50,
            speed: 1
        });
        this.units.push(newUnit);
    }

    updateUnits() {
        for (let unit of this.units) {
            unit.update();
        }
        this.units = this.units.filter(u => u.health > 0);
    }

    regenerateElixir() {
        for (let i = 0; i < this.elixir.length; i++) {
            if (this.elixir[i] < 10) {
                this.elixir[i] += 0.1;
            }
        }
    }

    checkCollisions() {
        for (let unit of this.units) {
            for (let towerName in this.towers) {
                const tower = this.towers[towerName];
                if (tower.team !== unit.team) {
                    const dx = tower.x - unit.x;
                    const dy = tower.y - unit.y;
                    const dist = Math.sqrt(dx * dx + dy * dy);
                    if (dist < 30) {
                        // Unit attacks tower
                        tower.health -= unit.damage;
                    }
                }
            }
        }
    }

    async checkGameOver() {
        const leftKing = this.towers.leftKing;
        const rightKing = this.towers.rightKing;

        if (leftKing.health <= 0 || rightKing.health <= 0) {
            const winnerIndex = leftKing.health <= 0 ? 1 : 0;
            const winnerId = this.playerIds[winnerIndex];

            await prisma.match.updateMany({
                where: {
                    player1Id: this.playerIds[0],
                    player2Id: this.playerIds[1],
                    winnerId: null
                },
                data: {
                    winnerId
                }
            });

            this.endGame(winnerIndex);
        }
    }

    endGame(winnerIndex) {
        clearInterval(this.interval);
        this.io.to(this.roomName).emit('game_end', { winner: winnerIndex });
        // Cleanup logic...
    }

    handlePlayerDisconnect(playerId) {
        const disconnectedPlayerIndex = this.players.findIndex(p => p.id === playerId);
        const winnerIndex = disconnectedPlayerIndex === 0 ? 1 : 0;
        const winnerId = this.playerIds[winnerIndex];

        prisma.match.updateMany({
            where: {
                player1Id: this.playerIds[0],
                player2Id: this.playerIds[1],
                winnerId: null
            },
            data: {
                winnerId
            }
        }).catch(console.error);

        this.endGame(winnerIndex);
    }

    serializeGameState() {
        return {
            towers: {
                leftKing: this.towers.leftKing.serialize(),
                rightKing: this.towers.rightKing.serialize()
            },
            units: this.units.map(u => u.serialize()),
            elixir: this.elixir
        };
    }
}

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
