const fs = require("fs");
const { nextAttempt } = require("../lib/booking/plan-engine");

const planPath = process.argv[2] || "booking-plan.json";
const resultPath = process.argv[3] || "artifacts/run-result.json";

if (!fs.existsSync(planPath)) {
  console.error("Plan not found:", planPath);
  process.exit(1);
}

if (!fs.existsSync(resultPath)) {
  console.error("Result not found:", resultPath);
  process.exit(1);
}

const plan = JSON.parse(fs.readFileSync(planPath, "utf8"));
const result = JSON.parse(fs.readFileSync(resultPath, "utf8"));
const currentPriority = Number(result.attempt_priority || 0);
const decision = nextAttempt(plan, currentPriority, result);

console.log(JSON.stringify(decision, null, 2));

if (decision.action === "next_attempt") {
  fs.mkdirSync("artifacts", { recursive: true });
  fs.writeFileSync(
    "artifacts/next-attempt.json",
    JSON.stringify(decision.attempt, null, 2) + "\n"
  );
}
