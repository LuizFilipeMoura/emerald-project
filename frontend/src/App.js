import React, { useEffect, useState } from 'react';
import io from 'socket.io-client';
import Battlefield from './components/Battlefield';
import CardBar from './components/CardBar';

const socket = io('http://localhost:4000');

function App() {
    const [playerId, setPlayerId] = useState(null);
    const [inGame, setInGame] = useState(false);
    const [gameState, setGameState] = useState(null);
    const [playerIndex, setPlayerIndex] = useState(null);

    useEffect(() => {
        async function authenticate() {
            // Prompt for username
            const username = prompt("Enter a username:", "alice");
            if (!username) return;

            // Call backend to get playerId
            const res = await fetch('http://localhost:4000/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username })
            });

            const data = await res.json();
            if (data.success) {
                setPlayerId(data.playerId);
            } else {
                alert('Failed to login');
            }
        }

        authenticate();
    }, []);

    useEffect(() => {
        if (playerId) {
            // Once we have a playerId, identify the socket
            socket.emit('identify', playerId);

            // Join queue to start a match
            socket.emit('join_queue');

            socket.on('game_start', (data) => {
                setInGame(true);
                setPlayerIndex(data.playerIndex);
            });

            socket.on('game_state', (state) => {
                setGameState(state);
            });

            socket.on('game_end', (result) => {
                setInGame(false);
                alert(`Game ended. Winner is Player ${result.winner}`);
            });

            return () => {
                socket.off('game_start');
                socket.off('game_state');
                socket.off('game_end');
            };
        }
    }, [playerId]);

    const handlePlayCard = (cardData) => {
        socket.emit('play_card', cardData);
    };

    return (
        <div>
            <h1>Clash Royale Clone (POC)</h1>
            {!playerId && <div>Logging in...</div>}
            {playerId && !inGame && <div>Waiting for match...</div>}
            {inGame && (
                <>
                    <Battlefield gameState={gameState} playerIndex={playerIndex} />
                    <CardBar onCardClick={handlePlayCard} />
                </>
            )}
        </div>
    );
}

export default App;
