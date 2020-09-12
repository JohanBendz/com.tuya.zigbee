'use strict';

const Cluster = require('../Cluster');
const { ZCLDataTypes } = require('../zclTypes');

const ATTRIBUTES = {
  description: { id: 28, type: ZCLDataTypes.string },
  maxPresentValue: { id: 65, type: ZCLDataTypes.single },
  minPresentValue: { id: 69, type: ZCLDataTypes.single },
  outOfService: { id: 81, type: ZCLDataTypes.bool },
  presentValue: { id: 85, type: ZCLDataTypes.single },
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
  relinquishDefault: { id: 104, type: ZCLDataTypes.single },
  resolution: { id: 106, type: ZCLDataTypes.single },
  statusFlags: { id: 111, type: ZCLDataTypes.map8('inAlarm', 'fault', 'overridden', 'outOfService') },
  applicationType: { id: 256, type: ZCLDataTypes.uint32 },
};

const COMMANDS = {};

class AnalogOutputCluster extends Cluster {

  static get ID() {
    return 13;
  }

  static get NAME() {
    return 'analogOutput';
  }

  static get ATTRIBUTES() {
    return ATTRIBUTES;
  }

  static get COMMANDS() {
    return COMMANDS;
  }

}

Cluster.addCluster(AnalogOutputCluster);

module.exports = AnalogOutputCluster;
