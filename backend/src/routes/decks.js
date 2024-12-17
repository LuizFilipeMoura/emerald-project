import { Router } from 'express';

const router = Router();

// Mock decks
const mockDecks = {
    "player1": [
        { unitType: 'knight', cost: 3 },
        { unitType: 'archer', cost: 2 },
        { unitType: 'giant', cost: 5 }
    ],
    "player2": [
        { unitType: 'goblin', cost: 2 },
        { unitType: 'wizard', cost: 5 },
        { unitType: 'hog_rider', cost: 4 }
    ]
};

router.get('/:playerId', (req, res) => {
    const playerId = req.params.playerId;
    const deck = mockDecks[playerId];
    if (!deck) return res.status(404).json({ error: 'Deck not found' });
    res.json(deck);
});

export default router;
