const crypto = require('crypto');
const Order = require('../models/Order');
const Payment = require('../models/Payment');
const orderController = require('./orderController');

/**
 * Razorpay webhook receiver.
 *
 * IMPORTANT: The route mounting this handler MUST use
 *   express.raw({ type: 'application/json' })
 * because HMAC signature verification requires the exact bytes Razorpay sent.
 * Any JSON re-serialization would break the signature.
 *
 * Configure the webhook in Razorpay Dashboard → Settings → Webhooks:
 *   URL:     https://<your-public-host>/api/webhooks/razorpay
 *   Secret:  same value as RAZORPAY_WEBHOOK_SECRET in .env
 *   Events:  payment.captured, payment.failed, order.paid,
 *            refund.processed, refund.failed
 */
exports.razorpayWebhook = async (req, res) => {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  const signature = req.headers['x-razorpay-signature'];

  // Raw body is a Buffer thanks to express.raw() — keep it as-is for HMAC
  const rawBody = Buffer.isBuffer(req.body) ? req.body : Buffer.from(req.body || '');

  if (!secret || secret === 'change_me_to_match_razorpay_dashboard') {
    console.error('Razorpay webhook: RAZORPAY_WEBHOOK_SECRET is not configured');
    return res.status(500).json({ success: false, message: 'Webhook secret not configured' });
  }

  if (!signature) {
    return res.status(400).json({ success: false, message: 'Missing X-Razorpay-Signature header' });
  }

  // Verify HMAC-SHA256
  const expected = crypto
    .createHmac('sha256', secret)
    .update(rawBody)
    .digest('hex');

  // timingSafeEqual guards against timing attacks on signature comparison
  let sigValid = false;
  try {
    sigValid = crypto.timingSafeEqual(
      Buffer.from(expected, 'utf8'),
      Buffer.from(signature, 'utf8')
    );
  } catch (_) {
    sigValid = false;
  }

  if (!sigValid) {
    console.error('Razorpay webhook: signature mismatch');
    return res.status(400).json({ success: false, message: 'Invalid signature' });
  }

  // Parse the JSON now that we've verified authenticity
  let payload;
  try {
    payload = JSON.parse(rawBody.toString('utf8'));
  } catch (err) {
    return res.status(400).json({ success: false, message: 'Invalid JSON payload' });
  }

  const event = payload.event;
  console.log(`Razorpay webhook received: ${event}`);

  // ACK Razorpay fast — they retry on non-2xx or slow responses.
  // We do the actual work after responding.
  res.json({ success: true, received: true });

  // Fire-and-forget event handling
  try {
    switch (event) {
      case 'payment.captured':
      case 'order.paid':
        await handlePaymentSuccess(payload, req.app.get('io'));
        break;

      case 'payment.failed':
        await handlePaymentFailed(payload);
        break;

      case 'refund.processed':
      case 'refund.failed':
        await handleRefundEvent(payload);
        break;

      default:
        console.log(`Razorpay webhook: ignoring unhandled event "${event}"`);
    }
  } catch (err) {
    console.error(`Razorpay webhook: handler for ${event} threw:`, err);
  }
};

async function handlePaymentSuccess(payload, io) {
  // payment.captured → payload.payload.payment.entity
  // order.paid      → payload.payload.payment.entity + payload.payload.order.entity
  const paymentEntity = payload.payload?.payment?.entity;
  if (!paymentEntity) {
    console.warn('handlePaymentSuccess: no payment entity in payload');
    return;
  }

  const { id: razorpayPaymentId, order_id: razorpayOrderId } = paymentEntity;

  // Locate our internal Order by the gateway's order id
  const order = await Order.findOne({ gatewayOrderId: razorpayOrderId })
    .populate('userId', 'name email phone');

  if (!order) {
    console.warn(`handlePaymentSuccess: no order matching gatewayOrderId=${razorpayOrderId}`);
    return;
  }

  await orderController.finalizePaidOrder(order, {
    gatewayPaymentId: razorpayPaymentId,
    gatewayResponse: { source: 'webhook', event: payload.event, entity: paymentEntity },
    io
  });
}

async function handlePaymentFailed(payload) {
  const paymentEntity = payload.payload?.payment?.entity;
  if (!paymentEntity) return;

  const { id: razorpayPaymentId, order_id: razorpayOrderId, error_description } = paymentEntity;

  const order = await Order.findOne({ gatewayOrderId: razorpayOrderId });
  if (!order) {
    console.warn(`handlePaymentFailed: no order matching gatewayOrderId=${razorpayOrderId}`);
    return;
  }

  // Only downgrade to failed if we haven't already recorded success
  if (order.paymentStatus !== 'completed') {
    order.paymentStatus = 'failed';
    await order.save();
  }

  // Record the failed attempt (idempotent via gatewayTxnId upsert)
  await Payment.findOneAndUpdate(
    { gatewayTxnId: razorpayPaymentId },
    {
      $setOnInsert: {
        orderId: order._id,
        userId: order.userId,
        amountPaise: order.totalPaise,
        method: order.paymentMethod,
        gateway: 'razorpay',
        gatewayOrderId: razorpayOrderId,
        gatewayTxnId: razorpayPaymentId
      },
      $set: {
        status: 'failed',
        failureReason: error_description || 'Payment failed at gateway',
        gatewayResponse: paymentEntity
      }
    },
    { upsert: true, new: true }
  );
}

async function handleRefundEvent(payload) {
  const refundEntity = payload.payload?.refund?.entity;
  if (!refundEntity) return;

  const { payment_id: razorpayPaymentId, amount, status } = refundEntity;

  // Find our Payment record by the original transaction id
  const payment = await Payment.findOne({ gatewayTxnId: razorpayPaymentId });
  if (!payment) {
    console.warn(`handleRefundEvent: no Payment matching gatewayTxnId=${razorpayPaymentId}`);
    return;
  }

  if (payload.event === 'refund.processed') {
    // Refund fully settled — mark the payment refunded
    payment.status = amount >= payment.amountPaise ? 'refunded' : 'partially_refunded';
    payment.refundedAt = new Date();
    // Only increment if we haven't seen this refund event yet — the refundOrder
    // endpoint may have already recorded it. We use $inc when the endpoint didn't
    // yet fire (the webhook can beat it), keyed off refundEntity.id in gatewayResponse.
    if (!payment.refundAmountPaise || payment.refundAmountPaise < amount) {
      payment.refundAmountPaise = amount;
    }
    payment.gatewayResponse = refundEntity;
    await payment.save();
  } else if (payload.event === 'refund.failed') {
    console.error(`Razorpay refund failed for payment ${razorpayPaymentId}:`, refundEntity);
    // Don't flip payment status — the money is still with us, admin can retry
  }
}
