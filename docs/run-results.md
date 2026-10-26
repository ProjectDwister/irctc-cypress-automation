# Run results and fallback policy

Each local Cypress run writes structured files under `artifacts/`.

- `artifacts/run-result.json`: latest observed result.
- `artifacts/runs/<run-id>.result.json`: immutable result for that run.
- `artifacts/runs/<run-id>.events.jsonl`: lightweight run events.

Possible result statuses:

- `booked`: a 10-digit PNR was observed. Do not retry.
- `booked_unverified_pnr`: success language was observed but no PNR was parsed. Review manually; do not retry.
- `no_availability`: safe to move to the next ranked train/class attempt.
- `payment_pending_or_uncertain`: stop and review. Never automatically retry after payment has started.
- `payment_failed`: stop and review. A failed-looking payment can still have delayed or ambiguous settlement.
- `transaction_error`: stop and review.
- `unknown`: stop and review.

The fallback engine intentionally permits automatic progression only for pre-payment availability failures. This avoids duplicate bookings when payment or confirmation is delayed.

## Ranked attempts

`booking-plan.json` contains the journey and ranked train/class choices.

`passenger-profiles.json` contains local passenger profiles and must not be committed.

Prepare a local Cypress fixture for priority 1:

```
node scripts/materialize-attempt.js booking-plan.json passenger-profiles.json 1
```

After a run, inspect the next safe action:

```
node scripts/next-attempt.js booking-plan.json artifacts/run-result.json
```

If the decision is `next_attempt`, materialize that priority and run again. If the decision is `stop_and_review`, do not start another booking until the first transaction is resolved.
