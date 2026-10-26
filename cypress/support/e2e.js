// Global Cypress support hooks.
import "./commands";

const {
  classifyBookingOutcome
} = require("../../lib/booking/result-parser");

function makeRunId() {
  const now = new Date().toISOString().replace(/[:.]/g, "-");
  return "irctc-" + now;
}

beforeEach(function () {
  const runId = Cypress.env("RUN_ID") || makeRunId();
  Cypress.env("RUN_ID", runId);

  cy.task("readCurrentAttempt", null, { log: false }).then((attempt) => {
    const priority = Number(attempt?.priority || Cypress.env("ATTEMPT_PRIORITY") || 1);
    Cypress.env("ATTEMPT_PRIORITY", priority);

    return cy.task("appendRunEvent", {
      run_id: runId,
      event: "run_started",
      attempt_priority: priority,
      train_no: attempt?.train_no || null,
      class: attempt?.class || null,
      spec: Cypress.spec.name
    }, { log: false });
  });
});

afterEach(function () {
  const runId = Cypress.env("RUN_ID");
  const attemptPriority = Number(Cypress.env("ATTEMPT_PRIORITY") || 1);
  const testState = this.currentTest && this.currentTest.state
    ? this.currentTest.state
    : "unknown";

  cy.get("body", { log: false, timeout: 10000 }).then(($body) => {
    const bodyText = $body.text();
    const outcome = classifyBookingOutcome(bodyText, "");

    const result = {
      run_id: runId,
      attempt_priority: attemptPriority,
      test_state: testState,
      status: outcome.status,
      pnr: outcome.pnr,
      confidence: outcome.confidence,
      retry_safe: outcome.retry_safe
    };

    return cy.task("writeRunResult", result, { log: false })
      .then(() => cy.task("appendRunEvent", {
        run_id: runId,
        event: "run_finished",
        attempt_priority: attemptPriority,
        test_state: testState,
        status: outcome.status,
        confidence: outcome.confidence,
        retry_safe: outcome.retry_safe
      }, { log: false }));
  });
});
