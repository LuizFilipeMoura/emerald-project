import React from 'react';

function CardBar({ onCardClick }) {
    const cards = [
        { unitType: 'knight', cost: 3 },
        { unitType: 'archer', cost: 2 },
        { unitType: 'goblin', cost: 2 },
        { unitType: 'wizard', cost: 5 }
    ];

    return (
        <div style={{ display: 'flex', gap: '10px', marginTop: '20px', justifyContent: 'center' }}>
            {cards.map((card, idx) => (
                <div
                    key={idx}
                    onClick={() => onCardClick(card)}
                    style={{
                        width: '60px',
                        height: '90px',
                        border: '1px solid black',
                        background: '#fff',
                        cursor: 'pointer',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'center',
                        alignItems: 'center'
                    }}
                >
                    <div>{card.unitType}</div>
                    <div>({card.cost})</div>
                </div>
            ))}
        </div>
    );
}

export default CardBar;
