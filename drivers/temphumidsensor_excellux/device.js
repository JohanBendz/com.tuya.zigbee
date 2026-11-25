'use strict';

// Physical probe reported over standard Zigbee temperature, RH and Power Configuration.
// The interview exposes EF00 as an output/client cluster only; no Tuya DP handler is needed.
module.exports = require('../temphumidsensor3/device');
