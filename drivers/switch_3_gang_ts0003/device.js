'use strict';

// Four exact TS0003 identities (#795, #1353, #1338, #1500) share three standard OnOff endpoints.
// Reuse the existing three-gang implementation; do not add E000/E001 writes.
module.exports = require('../switch_3_gang/device');
