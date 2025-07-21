const fs = require('fs');
const path = require('path');

const driversPath = path.join(__dirname, '..', 'drivers');
const templatePath = path.join(__dirname, '..', 'templates', 'driver.compose.json');

const template = JSON.parse(fs.readFileSync(templatePath, 'utf-8'));

fs.readdirSync(driversPath).forEach(driverName => {
  const driverPath = path.join(driversPath, driverName);
  if (fs.statSync(driverPath).isDirectory()) {
    const driverComposeFile = path.join(driverPath, 'driver.compose.json');
    if (!fs.existsSync(driverComposeFile)) {
      console.log(`Creating ${driverComposeFile} from template...`);
      const customTemplate = JSON.parse(JSON.stringify(template));
      customTemplate.id = driverName;
      customTemplate.name.en = driverName.replace(/_/g, ' ').replace(/([a-z])([A-Z])/g, '$1 $2');
      fs.writeFileSync(driverComposeFile, JSON.stringify(customTemplate, null, 2));
      console.log('Created!');
    }
  }
});
