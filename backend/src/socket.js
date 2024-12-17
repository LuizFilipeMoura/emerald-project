import express from 'express';
import { createServer } from 'http';
import { Server as SocketIO } from 'socket.io';
import cors from 'cors';

import authRoutes from './routes/auth.js';
import profileRoutes from './routes/profile.js';
import decksRoutes from './routes/decks.js';

import matchmaking from './matchmaking.js';

const app = express();
app.use(cors());
app.use(express.json()); // For JSON request bodies

// REST Endpoints
app.use('/auth', authRoutes);
app.use('/profile', profileRoutes);
app.use('/decks', decksRoutes);

app.get('/health', (req, res) => res.json({ status: 'ok' }));

const httpServer = createServer(app);
const io = new SocketIO(httpServer, {
    cors: {
        origin: "*"
    }
});

// Handle socket connections
io.on('connection', (socket) => {
    console.log(`Player connected: ${socket.id}`);

    socket.on('join_queue', () => {
        // Player wants to find a match
        matchmaking.addPlayer(socket, io);
    });

    socket.on('play_card', (cardData) => {
        const game = matchmaking.getPlayerGame(socket.id);
        if (game) {
            game.playCard(socket.id, cardData);
        }
    });

    socket.on('disconnect', () => {
        console.log(`Player disconnected: ${socket.id}`);
        matchmaking.removePlayer(socket.id);
    });
});

httpServer.listen(4000, () => console.log('Backend server running on port 4000'));
