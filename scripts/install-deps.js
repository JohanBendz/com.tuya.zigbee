// scripts/install-deps.js
const { execSync } = require('child_process');
const fs = require('fs');

const deps = [
  { name: 'npm', cmd: 'npm --version', install: 'npm install', optional: false },
  { name: 'python3', cmd: 'python3 --version', install: 'echo "Installer Python3 manuellement si absent"', optional: false },
  { name: 'rclone', cmd: 'rclone version', install: 'curl https://rclone.org/install.sh | bash', optional: true },
  { name: 'eslint', cmd: 'npx eslint --version', install: 'npm install eslint', optional: true },
  { name: 'mocha', cmd: 'npx mocha --version', install: 'npm install mocha', optional: true },
  { name: 'ts-node', cmd: 'npx ts-node --version', install: 'npm install ts-node', optional: true },
  { name: 'jest', cmd: 'npx jest --version', install: 'npm install jest', optional: true },
  { name: 'axios', cmd: 'npm list axios', install: 'npm install axios', optional: true },
  { name: 'express', cmd: 'npm list express', install: 'npm install express', optional: true }
];

let log = [];

for (const dep of deps) {
  try {
    execSync(dep.cmd, { stdio: 'ignore' });
    log.push({ dep: dep.name, status: 'ok' });
  } catch (e) {
    try {
      execSync(dep.install, { stdio: 'inherit' });
      log.push({ dep: dep.name, status: 'installed' });
    } catch (err) {
      log.push({ dep: dep.name, status: dep.optional ? 'optional-missing' : 'fail', error: err.message });
      if (!dep.optional) {
        console.error(`❌ Dépendance critique manquante : ${dep.name}`);
        process.exit(1);
      } else {
        console.warn(`⚠️ Dépendance optionnelle non installée : ${dep.name}`);
      }
    }
  }
}

fs.writeFileSync('logs/install_deps.log', JSON.stringify(log, null, 2));
console.log('Vérification/installation des dépendances terminée. Voir logs/install_deps.log'); 