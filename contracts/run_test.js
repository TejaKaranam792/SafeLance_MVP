const cp = require('child_process');
const fs = require('fs');
try {
  const stdout = cp.execSync('npx hardhat test test/MilestoneEscrow.test.ts', { encoding: 'utf8' });
  fs.writeFileSync('out.log', "STDOUT:\n" + stdout);
} catch(e) {
  fs.writeFileSync('out.log', "ERR:\n" + e.message + "\nSTDOUT:\n" + (e.stdout || '') + "\nSTDERR:\n" + (e.stderr || ''));
}
