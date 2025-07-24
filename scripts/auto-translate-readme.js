// scripts/auto-translate-readme.js
const fs = require('fs');
const path = require('path');

const readme = fs.readFileSync('README.md', 'utf8');
const langs = [
  { code: 'de', name: 'German', flag: '🇩🇪' },
  { code: 'es', name: 'Spanish', flag: '🇪🇸' },
  { code: 'it', name: 'Italian', flag: '🇮🇹' },
  { code: 'nl', name: 'Dutch', flag: '🇳🇱' }
];

// Placeholder: à remplacer par un appel API DeepL, GPT, etc.
function fakeTranslate(text, lang) {
  return `# ${lang.flag} [${lang.name}]\n\n(Traduction automatique à compléter)\n\n` + text;
}

let log = [];
langs.forEach(lang => {
  const translated = fakeTranslate(readme, lang);
  const outPath = path.join('locales', `${lang.code}.md`);
  fs.writeFileSync(outPath, translated);
  log.push({ lang: lang.code, file: outPath, status: 'ok' });
});
fs.writeFileSync('logs/auto_translate.log', JSON.stringify(log, null, 2));
console.log('Traductions automatiques générées. Voir locales/ et logs/auto_translate.log'); 