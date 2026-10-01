'use strict';

// Five exact TS0002 identities share the existing dual-endpoint standard OnOff runtime.
// E000/E001 cluster layouts differ but need no manufacturer-specific writes for basic switching.
module.exports = require('../switch_2_gang/device');
