import GameEngine from './game/GameEngine.js';

const waitingPlayers = [];
const activeGames = new Map(); // gameId -> gameInstance
const playerToGame = new Map(); // playerId -> gameInstance

function addPlayer(socket, io) {
    waitingPlayers.push({ socket, io });

    if (waitingPlayers.length >= 2) {
        const p1 = waitingPlayers.shift();
        const p2 = waitingPlayers.shift();

        const game = new GameEngine([p1.socket, p2.socket], p1.io);
        activeGames.set(game.id, game);
        playerToGame.set(p1.socket.id, game);
        playerToGame.set(p2.socket.id, game);

        game.start();
    }
}

function removePlayer(playerId) {
    // If player is in waiting queue, remove them
    const idx = waitingPlayers.findIndex(p => p.socket.id === playerId);
    if (idx >= 0) {
        waitingPlayers.splice(idx, 1);
        return;
    }

    // If in a game, handle that
    const game = playerToGame.get(playerId);
    if (game) {
        game.handlePlayerDisconnect(playerId);
    }
}

function getPlayerGame(playerId) {
    return playerToGame.get(playerId);
}

export default {
    addPlayer,
    removePlayer,
    getPlayerGame
};
