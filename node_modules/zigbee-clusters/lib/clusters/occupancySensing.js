'use strict';

const Cluster = require('../Cluster');
const { ZCLDataTypes } = require('../zclTypes');

const ATTRIBUTES = {
  occupancy: { id: 0, type: ZCLDataTypes.map8('occupied') }, // TODO: verify this bitmap
  occupancySensorType: {
    id: 1,
    type: ZCLDataTypes.enum8({
      pir: 0, // 0x00 PIR
      ultrasonic: 1, // 0x01 Ultrasonic
      pirAndUltrasonic: 2, // 0x02 PIR and ultrasonic
    }),
  },
  pirOccupiedToUnoccupiedDelay: { id: 16, type: ZCLDataTypes.uint16 },
  pirUnoccupiedToOccupiedDelay: { id: 17, type: ZCLDataTypes.uint16 },
  pirUnoccupiedToOccupiedThreshold: { id: 18, type: ZCLDataTypes.uint8 },
  ultrasonicOccupiedToUnoccupiedDelay: { id: 32, type: ZCLDataTypes.uint16 },
  ultrasonicUnoccupiedToOccupiedDelay: { id: 33, type: ZCLDataTypes.uint16 },
  ultrasonicUnoccupiedToOccupiedThreshold: { id: 34, type: ZCLDataTypes.uint8 },
};

const COMMANDS = {};

class OccupancySensing extends Cluster {

  static get ID() {
    return 1030; // 0x0406
  }

  static get NAME() {
    return 'occupancySensing';
  }

  static get ATTRIBUTES() {
    return ATTRIBUTES;
  }

  static get COMMANDS() {
    return COMMANDS;
  }

}

Cluster.addCluster(OccupancySensing);

module.exports = OccupancySensing;
