import { Router } from 'express';

const router = Router();

// Stubbed login endpoint
router.post('/login', (req, res) => {
    const { username, password } = req.body;
    // Validate user (placeholder)
    if (username === 'test' && password === 'test') {
        return res.json({ success: true, token: 'fake-jwt-token' });
    }
    return res.status(401).json({ success: false, message: 'Invalid credentials' });
});

export default router;
