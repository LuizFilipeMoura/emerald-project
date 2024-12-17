import React from 'react';

function Unit({ x, y, health, team, isPlayerTeam }) {
    const color = isPlayerTeam ? 'blue' : 'red';

    const style = {
        position: 'absolute',
        left: x,
        top: y,
        width: '20px',
        height: '20px',
        backgroundColor: color,
        borderRadius: '50%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#fff',
        fontSize: '10px'
    };

    return (
        <div style={style}>
            {health}
        </div>
    );
}

export default Unit;
