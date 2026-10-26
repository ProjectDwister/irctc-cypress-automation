function normalizeText(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function extractPnr(text) {
  const normalized = normalizeText(text);
  const patterns = [
    /PNR(?:\s*(?:No\.?|Number))?\s*[:#-]?\s*(\d{10})/i,
    /(\d{10})\s*(?:PNR|Passenger Name Record)/i
  ];

  for (const pattern of patterns) {
    const match = normalized.match(pattern);
    if (match) return match[1];
  }

  return null;
}

function classifyBookingOutcome(text, url) {
  const normalized = normalizeText(text);
  const upper = normalized.toUpperCase();
  const pnr = extractPnr(normalized);

  if (pnr) {
    return { status: "booked", pnr, confidence: "high", retry_safe: false };
  }

  if (
    upper.includes("BOOKING CONFIRMED") ||
    upper.includes("TICKET BOOKED") ||
    upper.includes("BOOKING SUCCESSFUL")
  ) {
    return { status: "booked_unverified_pnr", pnr: null, confidence: "medium", retry_safe: false };
  }

  if (
    upper.includes("NO SEATS AVAILABLE") ||
    upper.includes("REGRET") ||
    upper.includes("NOT AVAILABLE")
  ) {
    return { status: "no_availability", pnr: null, confidence: "medium", retry_safe: true };
  }

  if (
    upper.includes("PAYMENT FAILED") ||
    upper.includes("TRANSACTION FAILED") ||
    upper.includes("PAYMENT UNSUCCESSFUL")
  ) {
    return { status: "payment_failed", pnr: null, confidence: "medium", retry_safe: false };
  }

  const urlText = String(url || "").toLowerCase();
  const paymentWords = ["payment", "paytm", "upi", "processTransaction", "bank"];
  if (
    paymentWords.some(word => urlText.includes(word.toLowerCase())) ||
    upper.includes("PAYMENT METHOD") ||
    upper.includes("PAY AND BOOK") ||
    upper.includes("UPI")
  ) {
    return { status: "payment_pending_or_uncertain", pnr: null, confidence: "medium", retry_safe: false };
  }

  if (
    upper.includes("UNABLE TO PROCESS CURRENT TRANSACTION") ||
    upper.includes("PLEASE TRY AGAIN")
  ) {
    return { status: "transaction_error", pnr: null, confidence: "medium", retry_safe: false };
  }

  return { status: "unknown", pnr: null, confidence: "low", retry_safe: false };
}

module.exports = {
  normalizeText,
  extractPnr,
  classifyBookingOutcome
};
