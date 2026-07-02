const express = require('express');
const router = express.Router();
const webhookController = require('../controllers/webhookController');

// Razorpay webhook — MUST use raw body for HMAC signature verification.
// This router is intentionally mounted BEFORE the global express.json() in server.js.
router.post(
  '/razorpay',
  express.raw({ type: 'application/json', limit: '1mb' }),
  webhookController.razorpayWebhook
);

module.exports = router;
