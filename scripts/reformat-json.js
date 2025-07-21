const fs = require('fs');
const path = require('path');
const { glob } = require('glob');

glob('drivers/**/*.compose.json').then(files => {
  files.slice(0, 100).forEach(file => {
    const content = fs.readFileSync(file, 'utf-8');
    try {
      const json = JSON.parse(content);
      fs.writeFileSync(file, JSON.stringify(json, null, 2));
    } catch (e) {
      // ignore
    }
  });
});
