'use strict';

// Two exact TS0003 interviews (#795 and #1353): three standard OnOff endpoints.
// Reuse the existing three-gang implementation; do not add E000/E001 writes.
module.exports = require('../switch_3_gang/device');
