const fs = require("fs");

const path = process.argv[2] || "booking-plan.example.json";
if (!fs.existsSync(path)) {
  console.error("Plan not found:", path);
  process.exit(1);
}

const plan = JSON.parse(fs.readFileSync(path, "utf8"));
const attempts = Array.isArray(plan.attempts) ? [...plan.attempts] : [];

attempts.sort((a, b) => Number(a.priority) - Number(b.priority));

console.log(
  plan.journey.source + " -> " +
  plan.journey.destination + " | " +
  plan.journey.date + " | " +
  plan.journey.quota
);

console.log("Fallback order:");
for (const attempt of attempts) {
  console.log(
    String(attempt.priority).padStart(2, "0") + ". " +
    attempt.train_no + " / " + attempt.class
  );
}

if (plan.rules?.book_only_if_confirmed) {
  console.log("Rule: confirmed berths only");
}
if (plan.rules?.max_total_fare) {
  console.log("Max total fare:", plan.rules.max_total_fare);
}
