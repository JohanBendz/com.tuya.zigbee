'use strict';

const Cluster = require('../Cluster');
const { ZCLDataTypes } = require('../zclTypes');

const ATTRIBUTES = {
  activeText: { id: 4, type: ZCLDataTypes.string },
  description: { id: 28, type: ZCLDataTypes.string },
  inactiveText: { id: 46, type: ZCLDataTypes.string },
  minimumOffTime: { id: 66, type: ZCLDataTypes.uint32 },
  minimumOnTime: { id: 67, type: ZCLDataTypes.uint32 },
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
      overRange: 2, // OVER-RANGE (2)
      underRange: 3, // UNDER-RANGE (3)
      openLoop: 4, // OPEN-LOOP (4)
      shortedLoop: 5, // SHORTED-LOOP (5)
      unreliableOther: 7, // UNRELIABLE-OTHER (7)
      processError: 8, // PROCESS-ERROR (8)
      configurationError: 10, // CONFIGURATION-ERROR (10)
    }),
  },
  relinquishDefault: { id: 104, type: ZCLDataTypes.bool },
  statusFlags: { id: 111, type: ZCLDataTypes.map8('inAlarm', 'fault', 'overridden', 'outOfService') },
  applicationType: { id: 256, type: ZCLDataTypes.uint32 },
};

const COMMANDS = {};

class BinaryOutputCluster extends Cluster {

  static get ID() {
    return 16;
  }

  static get NAME() {
    return 'binaryOutput';
  }

  static get ATTRIBUTES() {
    return ATTRIBUTES;
  }

  static get COMMANDS() {
    return COMMANDS;
  }

}

Cluster.addCluster(BinaryOutputCluster);

module.exports = BinaryOutputCluster;
