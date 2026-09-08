"use strict";

const { recordStorePayouts, recordDeliveryPayout } = require("./razorpay-route");

function deliveryPlanForOrder(order, env) {
  const total = order.totals?.totalPaise || order.total_paise || 0;
  const lane = total >= 200000 ? "assisted-handoff" : "standard-local";
  return {
    id: `DEL-${Date.now()}`,
    order_id: order.id,
    provider: process.env.DELIVERY_PROVIDER || "manual_ops",
    lane,
    status: "ready_for_assignment",
    pickup_type: "store_handoff",
    customer_otp_required: true,
    estimated_minutes: lane === "assisted-handoff" ? 75 : 45,
    created_at: new Date().toISOString()
  };
}

function decrementStock(db, lineItems) {
  for (const line of lineItems || []) {
    const product = (db.products || []).find((p) => String(p.id) === String(line.product_id));
    if (!product) continue;
    product.stock_qty = Math.max(0, Number(product.stock_qty || 0) - Number(line.qty || 1));
    product.updated_at = new Date().toISOString();
    db.stock_events = [{
      id: `stock-${Date.now()}-${line.product_id}`,
      store_id: String(line.store_id || product.store_id || ""),
      product_id: String(line.product_id),
      event_type: "order_sale",
      qty_delta: -Number(line.qty || 1),
      stock_after: Number(product.stock_qty || 0),
      reason: "order_paid",
      created_at: new Date().toISOString()
    }, ...(db.stock_events || [])];
  }
}

function markOrderPaid(order, db, paymentId) {
  if (order.payment_status === "paid" || order.payment_status === "mock_paid") {
    return { order, delivery: (db.delivery_jobs || []).find((j) => j.order_id === order.id) || null, alreadyPaid: true };
  }
  const orderType = String(order.order_type || "delivery").toLowerCase();
  order.status = orderType === "reserve" ? "reserved" : "paid";
  order.payment_status = paymentId?.startsWith("pay_mock_") ? "mock_paid" : "paid";
  order.razorpay_payment_id = paymentId || order.razorpay_payment_id || "";
  order.paid_at = new Date().toISOString();
  decrementStock(db, order.items || order.totals?.lineItems || []);
  let delivery = null;
  if (orderType !== "reserve" && !(db.delivery_jobs || []).some((j) => j.order_id === order.id)) {
    delivery = deliveryPlanForOrder(order);
    db.delivery_jobs = [delivery, ...(db.delivery_jobs || [])];
  }
  if (Array.isArray(order.payout_splits) && order.payout_splits.length) {
    recordDeliveryPayout(db, order, { mock: paymentId?.startsWith("pay_mock_") });
    recordStorePayouts(db, order, order.payout_splits, {
      mock: paymentId?.startsWith("pay_mock_"),
      transfers: order.payout_transfers || []
    });
  }
  return { order, delivery, alreadyPaid: false };
}

module.exports = { markOrderPaid, decrementStock, deliveryPlanForOrder };
