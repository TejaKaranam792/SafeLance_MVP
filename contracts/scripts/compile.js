const fs = require("fs");
const path = require("path");

const logFile = path.join(__dirname, "../compile_error.log");
fs.writeFileSync(logFile, "Starting compilation test...\n");

function log(msg) {
  fs.appendFileSync(logFile, msg + "\n");
}

process.on("uncaughtException", (err) => {
  log("UNCAUGHT EXCEPTION:\n" + err.stack);
  process.exit(1);
});

process.on("unhandledRejection", (err) => {
  log("UNHANDLED REJECTION:\n" + (err && err.stack ? err.stack : err));
  process.exit(1);
});

try {
  log("Requiring hardhat...");
  const hre = require("hardhat");
  
  log("Running compile...");
  hre.run("compile").then(() => {
    log("Compile finished successfully!");
  }).catch((err) => {
    log("Compile failed with promise rejection:\n" + err.stack);
  });
} catch (e) {
  log("Compile failed synchronously:\n" + e.stack);
}
