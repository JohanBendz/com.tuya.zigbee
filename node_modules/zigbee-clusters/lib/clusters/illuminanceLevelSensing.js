'use strict';

const Cluster = require('../Cluster');
const { ZCLDataTypes } = require('../zclTypes');

const ATTRIBUTES = {
  levelStatus: {
    id: 0,
    type: ZCLDataTypes.enum8({
      illuminanceOnTarget: 0, // 0x00 Illuminance on target
      illuminanceBelowTarget: 1, // 0x01 Illuminance below target
      illuminanceAboveTarget: 2, // 0x02 Illuminance above target
    }),
  },
  lightSensorType: {
    id: 1,
    type: ZCLDataTypes.enum8({
      photodiode: 0, // 0x00 Photodiode
      cmos: 1, // 0x01 CMOS
      // 0x40 – 0xfe Reserved for manufacturer specific light sensor types
      unknown: 255, // 0xff Unknown
    }),
  },
  illuminanceTargetLevel: { id: 16, type: ZCLDataTypes.uint16 },
};

const COMMANDS = {};

class IlluminanceLevelSensingCluster extends Cluster {

  static get ID() {
    return 1025;
  }

  static get NAME() {
    return 'illuminanceLevelSensing';
  }

  static get ATTRIBUTES() {
    return ATTRIBUTES;
  }

  static get COMMANDS() {
    return COMMANDS;
  }

}

Cluster.addCluster(IlluminanceLevelSensingCluster);

module.exports = IlluminanceLevelSensingCluster;
