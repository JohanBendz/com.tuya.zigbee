'use strict';

const Cluster = require('../Cluster');
const { ZCLDataTypes } = require('../zclTypes');

const ATTRIBUTES = {
  activeText: { id: 4, type: ZCLDataTypes.string },
  description: { id: 28, type: ZCLDataTypes.string },
  inactiveText: { id: 46, type: ZCLDataTypes.string },
  outOfService: { id: 81, type: ZCLDataTypes.bool },
  polarity: {
    id: 84,
    type: ZCLDataTypes.enum8({
      normal: 0,
      reverse: 1,
    }),
  },
  presentValue: { id: 85, type: ZCLDataTypes.bool },
  reliability: {
    id: 103,
    type: ZCLDataTypes.enum8({
      noFaultDetected: 0, // NO-FAULT-DETECTED (0)
      noSensor: 1, // NO-SENSOR (1) - for input clusters only
      overRange: 2, // OVER-RANGE (2)
      underRange: 3, // UNDER-RANGE (3)
      openLoop: 4, // OPEN-LOOP (4)
      shortedLoop: 5, // SHORTED-LOOP (5)
      noOutput: 6, // NO-OUTPUT (6) - for input clusters only
      unreliableOther: 7, // UNRELIABLE-OTHER (7)
      processError: 8, // PROCESS-ERROR (8)
      configurationError: 10, // CONFIGURATION-ERROR (10)
    }),
  },
  statusFlags: { id: 111, type: ZCLDataTypes.map8('inAlarm', 'fault', 'overridden', 'outOfService') },
  applicationType: { id: 256, type: ZCLDataTypes.uint32 },
};

const COMMANDS = {};

class BinaryInputCluster extends Cluster {

  static get ID() {
    return 15;
  }

  static get NAME() {
    return 'binaryInput';
  }

  static get ATTRIBUTES() {
    return ATTRIBUTES;
  }

  static get COMMANDS() {
    return COMMANDS;
  }

}

Cluster.addCluster(BinaryInputCluster);

module.exports = BinaryInputCluster;
