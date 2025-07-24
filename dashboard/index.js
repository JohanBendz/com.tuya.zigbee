
const express = require('express');
const app = express();
app.use(express.static(__dirname + '/public'));
app.get('/', (req, res) => res.send('Dashboard Tuya Zigbee'));
app.listen(3000, () => console.log('Dashboard running on http://localhost:3000'));
