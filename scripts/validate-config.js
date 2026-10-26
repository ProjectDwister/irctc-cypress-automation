const fs = require("fs");

const path = process.argv[2] || "cypress/fixtures/passenger_data.json";

function fail(message) {
  console.error("CONFIG ERROR:", message);
  process.exit(1);
}

if (!fs.existsSync(path)) {
  fail(`${path} not found. Copy cypress/fixtures/passenger_data.example.json to cypress/fixtures/passenger_data.json and edit it locally.`);
}

let config;
try {
  config = JSON.parse(fs.readFileSync(path, "utf8"));
} catch (error) {
  fail(`Invalid JSON in ${path}: ${error.message}`);
}

const required = [
  "TRAIN_NO",
  "TRAIN_COACH",
  "TRAVEL_DATE",
  "SOURCE_STATION",
  "DESTINATION_STATION",
  "PASSENGER_DETAILS"
];

for (const key of required) {
  if (config[key] === undefined || config[key] === null || config[key] === "") {
    fail(`Missing required field: ${key}`);
  }
}

if (config.TATKAL && config.PREMIUM_TATKAL) {
  fail("TATKAL and PREMIUM_TATKAL cannot both be true.");
}

const coaches = new Set(["SL", "2A", "3A", "3E", "1A", "CC", "EC", "2S"]);
if (!coaches.has(config.TRAIN_COACH)) {
  fail(`Unsupported TRAIN_COACH: ${config.TRAIN_COACH}`);
}

if (!/^\d{5}$/.test(String(config.TRAIN_NO))) {
  fail("TRAIN_NO must be a 5-digit train number.");
}

if (!/^\d{2}\/\d{2}\/\d{4}$/.test(config.TRAVEL_DATE)) {
  fail("TRAVEL_DATE must use DD/MM/YYYY.");
}

if (!Array.isArray(config.PASSENGER_DETAILS) || config.PASSENGER_DETAILS.length === 0) {
  fail("PASSENGER_DETAILS must contain at least one passenger.");
}

const genders = new Set(["Male", "Female", "Transgender"]);
const seats = new Set(["Lower", "Middle", "Upper", "Side Lower", "Side Upper", "Window Side", "No Preference"]);
const food = new Set(["Veg", "Non Veg", "No Food"]);

config.PASSENGER_DETAILS.forEach((p, i) => {
  const n = i + 1;
  if (!p.NAME || typeof p.NAME !== "string") fail(`Passenger ${n}: NAME is required.`);
  if (!Number.isInteger(Number(p.AGE)) || Number(p.AGE) < 1 || Number(p.AGE) > 125) fail(`Passenger ${n}: AGE is invalid.`);
  if (!genders.has(p.GENDER)) fail(`Passenger ${n}: GENDER is invalid.`);
  if (!seats.has(p.SEAT)) fail(`Passenger ${n}: SEAT is invalid.`);
  if (!food.has(p.FOOD)) fail(`Passenger ${n}: FOOD is invalid.`);
});

console.log(`Configuration OK: ${path}`);
console.log(`Train ${config.TRAIN_NO} | ${config.TRAIN_COACH} | ${config.TRAVEL_DATE} | passengers: ${config.PASSENGER_DETAILS.length}`);
