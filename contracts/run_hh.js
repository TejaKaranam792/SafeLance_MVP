const { execSync } = require('child_process');
try {
  const out = execSync('npx hardhat compile', { encoding: 'utf8', stdio: 'pipe' });
  console.log("SUCCESS:", out);
} catch (e) {
  console.error("STDOUT:", e.stdout);
  console.error("STDERR:", e.stderr);
}
