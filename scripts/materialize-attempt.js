const fs = require("fs");
const path = require("path");
const { findAttempt } = require("../lib/booking/plan-engine");

const planPath = process.argv[2] || "booking-plan.json";
const profilesPath = process.argv[3] || "passenger-profiles.json";
const requestedPriority = Number(process.argv[4] || 1);
const outputPath = "cypress/fixtures/passenger_data.json";

function readJson(filePath) {
  if (!fs.existsSync(filePath)) {
    console.error("File not found:", filePath);
    process.exit(1);
  }
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

const plan = readJson(planPath);
const profiles = readJson(profilesPath);
const attempt = findAttempt(plan, requestedPriority);

if (!attempt) {
  console.error("Attempt priority not found:", requestedPriority);
  process.exit(1);
}

const profile = profiles[plan.passenger_profile];
if (!Array.isArray(profile) || profile.length === 0) {
  console.error("Passenger profile not found or empty:", plan.passenger_profile);
  process.exit(1);
}

const quota = String(plan.journey.quota || "GENERAL").toUpperCase();

const fixture = {
  TRAIN_NO: String(attempt.train_no),
  TRAIN_COACH: attempt.class,
  TRAVEL_DATE: plan.journey.date,
  SOURCE_STATION: plan.journey.source,
  BOARDING_STATION: plan.journey.boarding_station || null,
  DESTINATION_STATION: plan.journey.destination,
  TATKAL: quota === "TATKAL",
  PREMIUM_TATKAL: quota === "PREMIUM_TATKAL",
  UPI_ID_CONFIG: "",
  BOOK_ONLY_IF_CONFIRMED: Boolean(plan.rules?.book_only_if_confirmed),
  AUTO_UPGRADE: Boolean(plan.rules?.auto_upgrade),
  PASSENGER_DETAILS: profile,
  ATTEMPT_PRIORITY: requestedPriority
};

fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, JSON.stringify(fixture, null, 2) + "\n");

console.log("Prepared local attempt:");
console.log(
  "#" + requestedPriority + " " +
  fixture.TRAIN_NO + " / " +
  fixture.TRAIN_COACH + " / " +
  fixture.TRAVEL_DATE
);
console.log("Wrote:", outputPath);
