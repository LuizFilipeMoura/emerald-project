import React from 'react';

function Tower({ x, y, health, team, isPlayerTeam }) {
    const color = isPlayerTeam ? 'blue' : 'red';

    const style = {
        position: 'absolute',
        left: x,
        top: y,
        width: '30px',
        height: '30px',
        backgroundColor: color,
        borderRadius: '50%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#fff',
        fontSize: '12px'
    };

    return (
        <div style={style}>
            {health}
        </div>
    );
}

export default Tower;
