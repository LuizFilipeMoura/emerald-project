import React, { useRef, useEffect } from 'react';
import Tower from './Tower';
import Unit from './Unit';

function Battlefield({ gameState, playerIndex, selectedCard, onPlayCardAtPosition }) {
    const battlefieldRef = useRef(null);

    if (!gameState) return <div>Loading game state...</div>;

    const { towers, units, elixir } = gameState;


    const handleBattlefieldClick = (e) => {
        console.log(e)
        if (selectedCard) {
            // Calculate click position relative to battlefield
            const rect = battlefieldRef.current.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            console.log("x: ", x, "y: ", y)

            // Emit event through parent handler
            onPlayCardAtPosition(selectedCard, { x, y });
        }
    };

    return (
        <div
            ref={battlefieldRef}
            onClick={handleBattlefieldClick}
            style={{ position: 'relative', width: '600px', height: '800px', background: '#4AA96C', margin: '20px auto' }}
        >
            {Object.keys(towers).map((towerKey) => {
                const t = towers[towerKey];
                return (
                    <Tower
                        key={towerKey}
                        x={t.x}
                        y={t.y}
                        health={t.health}
                        team={t.team}
                        isPlayerTeam={t.team === playerIndex}
                    />
                );
            })}

            {units.map(u => (
                <Unit
                    key={u.id}
                    x={u.x}
                    y={u.y}
                    health={u.health}
                    team={u.team}
                    isPlayerTeam={u.team === playerIndex}
                />
            ))}

            {/* Elixir Bar */}
            <div style={{ position: 'absolute', bottom: '20px', left: '50%', transform: 'translateX(-50%)', color: '#000' }}>
                Elixir: {elixir && elixir[playerIndex] ? elixir[playerIndex].toFixed(1) : 'N/A'}
            </div>
        </div>
    );
}

export default Battlefield;
