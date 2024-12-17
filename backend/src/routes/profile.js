import { Router } from 'express';

const router = Router();

// Mock data
const mockPlayers = {
    "player1": { id: "player1", name: "Alice", trophies: 1200 },
    "player2": { id: "player2", name: "Bob", trophies: 900 }
};

router.get('/:id', (req, res) => {
    const playerId = req.params.id;
    const player = mockPlayers[playerId];
    if (!player) return res.status(404).json({ error: 'Player not found' });
    res.json(player);
});

export default router;
