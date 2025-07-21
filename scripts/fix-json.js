const fs = require('fs');
const path = require('path');
const { glob } = require('glob');

glob('drivers/**/*.compose.json').then(files => {
  files.forEach(file => {
    let content = fs.readFileSync(file, 'utf-8');
    content = content.replace(/\\/g, '');
    if (content.charCodeAt(0) === 0xFEFF) {
      content = content.slice(1);
    }
    fs.writeFileSync(file, content);
  });
});
