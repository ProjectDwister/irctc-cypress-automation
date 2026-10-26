# IRCTC Booking Planner & Cypress Harness

This branch rebuilds the original Cypress project around a safer, more maintainable booking workflow: local-only credentials and passenger data, ranked train/class plans, structured run results, PNR capture, and guarded fallback decisions.

> Use browser automation only where permitted by IRCTC's terms. The hardened flow requires manual completion of protected verification steps such as CAPTCHA and does not improve anti-bot bypass mechanisms.

## What is implemented

- Journey planner with ranked train/class fallbacks.
- Responsive browser UI in `planner/`.
- Local passenger profiles separated from Git.
- Local IRCTC credentials separated from Git.
- Booking configuration validation.
- Attempt materialization into the existing Cypress fixture.
- Structured run telemetry under `artifacts/`.
- Final-page outcome classification.
- PNR extraction when a 10-digit PNR is returned with PNR context.
- Safe fallback decision engine.
- Hard stop after payment starts or whenever the transaction outcome is uncertain.
- Preflight-only GitHub Actions workflow.

## Architecture

```text
Planner UI
   |
   v
booking-plan.json + passenger-profiles.json
   |
   v
prepare-attempt
   |
   v
cypress/fixtures/passenger_data.json
   |
   v
Cypress booking harness
   |
   +--> protected verification completed manually
   |
   v
artifacts/run-result.json
   |
   v
safe fallback engine
   |
   +--> next ranked attempt, only for pre-payment availability failure
   |
   +--> stop and review for payment/booking uncertainty
```

## Local setup

Install dependencies:

```bash
npm ci
```

Create local-only files from the sanitized templates:

```bash
cp cypress.env.example.json cypress.env.json
cp passenger-profiles.example.json passenger-profiles.json
cp booking-plan.example.json booking-plan.json
```

Keep `MANUAL_CAPTCHA` set to `true` in `cypress.env.json`.

The following files are ignored by Git:

- `cypress.env.json`
- `passenger-profiles.json`
- `booking-plan.json`
- `cypress/fixtures/passenger_data.json`
- `artifacts/`

## Planner UI

Open:

```text
planner/index.html
```

The planner can:

- set source, destination, date and quota;
- set fare and confirmation rules;
- rank multiple train/class fallbacks;
- save the plan locally in the browser;
- import/export `booking-plan.json`;
- import `artifacts/run-result.json` and show the next safe action.

Passenger names and IRCTC credentials are intentionally not stored in the planner.

## Prepare an attempt

To materialize priority 1 from the plan:

```bash
npm run prepare-attempt -- booking-plan.json passenger-profiles.json 1
```

Validate the generated local fixture:

```bash
npm run validate-config
```

Run the supported local flow:

```bash
npm run start-booking
```

## Run results

Every local run writes:

```text
artifacts/run-result.json
artifacts/runs/<run-id>.result.json
artifacts/runs/<run-id>.events.jsonl
```

Result statuses include:

- `booked`
- `booked_unverified_pnr`
- `no_availability`
- `payment_pending_or_uncertain`
- `payment_failed`
- `transaction_error`
- `unknown`

See `docs/run-results.md` for the complete fallback policy.

## Decide the next attempt

After a run:

```bash
npm run next-attempt -- booking-plan.json artifacts/run-result.json
```

The engine allows progression only for clearly pre-payment availability outcomes such as `no_availability`.

If payment has started, success is uncertain, or a booking may already exist, the engine returns `stop_and_review`. This is deliberate protection against duplicate bookings.

## Preflight

Run:

```bash
npm run preflight
```

This validates the sanitized example configuration and runs the booking-engine self-test.

GitHub Actions performs this preflight only. It does not accept IRCTC credentials or initiate live bookings.

## Security

Older history of this repository contained live-looking credentials and passenger data. Removing them from the latest tree does not remove them from Git history.

Rotate any credentials that were previously committed before using the repository again.

## Legacy code

The repository still contains portions of the upstream OCR/CAPTCHA implementation for historical compatibility. The hardened workflow does not use or enhance that path; `MANUAL_CAPTCHA=true` is required by the global Cypress support hook.
