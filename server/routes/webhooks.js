import express from 'express';
const router = express.Router();


// Stubs for future: receive HubSpot or Gmail push notifications
router.post('/hubspot', (req, res) => { res.json({ ok: true }); });
router.post('/gmail', (req, res) => { res.json({ ok: true }); });


export default router;