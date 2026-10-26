const { defineConfig } = require("cypress");
const fs = require("fs");
const path = require("path");

function ensureArtifactsDir() {
  const dir = path.join(__dirname, "artifacts", "runs");
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

function safeRunId(value) {
  return String(value || "run")
    .replace(/[^a-zA-Z0-9._-]/g, "_")
    .slice(0, 120);
}

module.exports = defineConfig({
  projectId: "7afdkj",
  defaultCommandTimeout: 120000,

  e2e: {
    setupNodeEvents(on, config) {
      on("task", {
        log(message) {
          console.log(message + "\n\n");
          return null;
        },

        appendRunEvent(payload) {
          const dir = ensureArtifactsDir();
          const runId = safeRunId(payload.run_id);
          const event = {
            observed_at: new Date().toISOString(),
            ...payload
          };

          fs.appendFileSync(
            path.join(dir, runId + ".events.jsonl"),
            JSON.stringify(event) + "\n"
          );

          return null;
        },

        writeRunResult(payload) {
          const dir = ensureArtifactsDir();
          const runId = safeRunId(payload.run_id);
          const result = {
            observed_at: new Date().toISOString(),
            ...payload
          };

          fs.writeFileSync(
            path.join(dir, runId + ".result.json"),
            JSON.stringify(result, null, 2) + "\n"
          );

          fs.writeFileSync(
            path.join(__dirname, "artifacts", "run-result.json"),
            JSON.stringify(result, null, 2) + "\n"
          );

          return result;
        }
      });
    },

    chromeWebSecurity: false,
    experimentalModifyObstructiveThirdPartyCode: true
  }
});
