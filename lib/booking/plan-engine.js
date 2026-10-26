const RETRYABLE_STATUSES = new Set([
  "no_availability",
  "train_not_found",
  "class_unavailable",
  "fare_exceeded"
]);

const STOP_STATUSES = new Set([
  "booked",
  "booked_unverified_pnr",
  "payment_pending_or_uncertain",
  "payment_failed",
  "transaction_error",
  "unknown"
]);

function sortedAttempts(plan) {
  return [...(plan.attempts || [])].sort(
    (a, b) => Number(a.priority) - Number(b.priority)
  );
}

function findAttempt(plan, priority) {
  return sortedAttempts(plan).find(
    attempt => Number(attempt.priority) === Number(priority)
  ) || null;
}

function nextAttempt(plan, currentPriority, result) {
  const attempts = sortedAttempts(plan);
  const status = result?.status || "unknown";

  if (STOP_STATUSES.has(status)) {
    return {
      action: "stop_and_review",
      reason: status,
      attempt: null
    };
  }

  if (!RETRYABLE_STATUSES.has(status)) {
    return {
      action: "stop_and_review",
      reason: "unclassified_result",
      attempt: null
    };
  }

  const next = attempts.find(
    attempt => Number(attempt.priority) > Number(currentPriority)
  );

  if (!next) {
    return {
      action: "exhausted",
      reason: "no_more_attempts",
      attempt: null
    };
  }

  return {
    action: "next_attempt",
    reason: status,
    attempt: next
  };
}

module.exports = {
  RETRYABLE_STATUSES,
  STOP_STATUSES,
  sortedAttempts,
  findAttempt,
  nextAttempt
};
