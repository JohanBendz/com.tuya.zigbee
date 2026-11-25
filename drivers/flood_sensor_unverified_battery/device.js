'use strict';

// #1041 / #1032 / #952: identical interviewed standard IAS waterSensor layout.
// Reuse the unchanged existing flood_sensor runtime. Battery cell type/count is
// deliberately not inferred from the 3.0 V interview; verify each in public Test.
module.exports = require('../flood_sensor/device');
