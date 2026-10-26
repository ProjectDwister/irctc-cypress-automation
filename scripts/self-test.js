const assert = require("assert");
const { extractPnr, classifyBookingOutcome } = require("../lib/booking/result-parser");
const { nextAttempt } = require("../lib/booking/plan-engine");

assert.strictEqual(
  extractPnr("PNR Number: 1234567890"),
  "1234567890"
);

assert.deepStrictEqual(
  classifyBookingOutcome("PNR No: 1234567890", "https://www.irctc.co.in").status,
  "booked"
);

assert.deepStrictEqual(
  classifyBookingOutcome("No seats available", "https://www.irctc.co.in").retry_safe,
  true
);

assert.deepStrictEqual(
  classifyBookingOutcome("UPI payment pending", "https://secure.example/payment").retry_safe,
  false
);

assert.deepStrictEqual(
  classifyBookingOutcome("Payment successful", "https://secure.example/payment").status,
  "payment_success_unverified"
);

const plan = {
  attempts: [
    { priority: 1, train_no: "12951", class: "2A" },
    { priority: 2, train_no: "12953", class: "2A" }
  ]
};

assert.strictEqual(
  nextAttempt(plan, 1, { status: "no_availability" }).action,
  "next_attempt"
);

assert.strictEqual(
  nextAttempt(plan, 1, { status: "payment_pending_or_uncertain" }).action,
  "stop_and_review"
);

console.log("Self-test passed");
