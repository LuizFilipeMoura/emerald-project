import { v4 as uuidv4 } from 'uuid';
import { TICK_RATE } from './constants.js';
import Tower from './Tower.js';
import Unit from './Unit.js';

class GameEngine {
    constructor(players, io) {
        this.id = uuidv4();
        this.io = io;
        this.players = players; // array of sockets
        this.state = {
            towers: {
                leftKing: new Tower({ x: 150, y: 700, health: 3000, team: 0 }),
                leftPrincess1: new Tower({ x: 50, y: 500, health: 1500, team: 0 }),
                leftPrincess2: new Tower({ x: 250, y: 500, health: 1500, team: 0 }),
                rightKing: new Tower({ x: 450, y: 100, health: 3000, team: 1 }),
                rightPrincess1: new Tower({ x: 350, y: 300, health: 1500, team: 1 }),
                rightPrincess2: new Tower({ x: 550, y: 300, health: 1500, team: 1 }),
            },
            units: [],
            elixir: [5, 5] // Elixir for player 0 and player 1
        };

        this.roomName = `game_${this.id}`;
        this.interval = null;
    }

    start() {
        // Join both players to a room for isolated broadcasting
        this.players.forEach((playerSocket, index) => {
            playerSocket.join(this.roomName);
            playerSocket.emit('game_start', { gameId: this.id, playerIndex: index });
        });

        this.interval = setInterval(() => this.tick(), 1000 / TICK_RATE);
    }

    tick() {
        this.updateUnits();
        this.regenerateElixir();
        this.checkCollisions();
        this.checkGameOver();

        const serializedState = this.serializeGameState();
        // Broadcast state to room
        this.io.to(this.roomName).emit('game_state', serializedState);
    }

    playCard(playerId, cardData) {

        const playerIndex = this.players.findIndex(p => p.id === playerId);
        if (playerIndex === -1) return;

        const { cost, position, unitType } = cardData;
        if (this.state.elixir[playerIndex] < cost) return;
        this.state.elixir[playerIndex] -= cost;

        const newUnit = new Unit({
            id: uuidv4(),
            x: position.x,
            y: position.y,
            team: playerIndex,
            health: 500,
            damage: 50,
            speed: 1,
        });
        this.state.units.push(newUnit);
    }

    updateUnits() {
        for (let unit of this.state.units) {
            unit.update();
            // Move units towards enemy side or perform some AI logic
            if (unit.team === 0) {
                unit.y -= unit.speed; // Move upwards for player0 units
            } else {
                unit.y += unit.speed; // Move downwards for player1 units
            }
        }

        // Filter out dead units
        this.state.units = this.state.units.filter(u => u.health > 0);
    }

    regenerateElixir() {
        // Increment elixir slowly
        for (let i = 0; i < this.state.elixir.length; i++) {
            if (this.state.elixir[i] < 10) {
                this.state.elixir[i] += 0.1; // Slowly regenerate
            }
        }
    }

    checkCollisions() {
        // Check if units are in range of enemy towers or units
        // Simple logic: if a unit's position is near an enemy tower, deal damage
        for (let unit of this.state.units) {
            for (let towerName in this.state.towers) {
                const tower = this.state.towers[towerName];
                if (tower.team !== unit.team) {
                    const dx = tower.x - unit.x;
                    const dy = tower.y - unit.y;
                    const dist = Math.sqrt(dx * dx + dy * dy);
                    if (dist < 30) {
                        // Collision! Unit attacks tower
                        tower.health -= unit.damage;
                        // Unit might also take retaliatory damage or just keep going
                    }
                }
            }
        }
    }

    checkGameOver() {
        // If any king tower is destroyed, the other player wins
        const { leftKing, rightKing } = this.state.towers;
        if (leftKing.health <= 0 || rightKing.health <= 0) {
            const winner = leftKing.health <= 0 ? 1 : 0;
            this.endGame(winner);
        }
    }

    handlePlayerDisconnect(playerId) {
        // If a player leaves, end the game and declare the other player winner
        const disconnectedPlayerIndex = this.players.findIndex(p => p.id === playerId);
        const winner = disconnectedPlayerIndex === 0 ? 1 : 0;
        this.endGame(winner);
    }

    endGame(winner) {
        clearInterval(this.interval);
        this.io.to(this.roomName).emit('game_end', { winner });
        // Cleanup: remove players from room, remove from matchmaking
    }

    serializeGameState() {
        return {
            towers: Object.fromEntries(Object.entries(this.state.towers).map(([key, t]) => [key, t.serialize()])),
            units: this.state.units.map(u => u.serialize()),
            elixir: this.state.elixir
        };
    }
}

export default GameEngine;
