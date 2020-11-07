'use strict';

const Cluster = require('../Cluster');
const { ZCLDataTypes } = require('../zclTypes');

const ZONE_STATUS_DATA_TYPE = ZCLDataTypes.map16('alarm1', 'alarm2', 'tamper', 'battery', 'supervisionReports', 'restoreReports', 'trouble', 'acMains', 'test', 'batteryDefect');

const ATTRIBUTES = {
  zoneState: {
    id: 0,
    type: ZCLDataTypes.enum8({
      notEnrolled: 0,
      enrolled: 1,
    }),
  },
  zoneType: {
    id: 1,
    type: ZCLDataTypes.enum16({
      standardCIE: 0,
      motionSensor: 13,
      contactSwitch: 21,
      fireSensor: 40,
      waterSensor: 42,
      cabonMonoxideSensor: 43,
      personalEmergencyDevice: 44,
      vibrationMovementSensor: 45,
      remoteControl: 271,
      keyfob: 277,
      keypad: 541,
      standardWarningDevice: 549,
      glassBreakSensor: 550,
      securityRepeater: 553,
      invalidZoneType: 65535,
    }),
  },
  zoneStatus: {
    id: 2,
    type: ZONE_STATUS_DATA_TYPE,
  },
  iasCIEAddress: {
    id: 16,
    type: ZCLDataTypes.EUI64,
  },
  zoneId: {
    id: 17,
    type: ZCLDataTypes.uint8,
  },
};

const COMMANDS = {
  zoneStatusChangeNotification: {
    id: 0,
    args: {
      zoneStatus: ZONE_STATUS_DATA_TYPE,
      extendedStatus: ZCLDataTypes.uint8,
      zoneId: ZCLDataTypes.uint8,
      delay: ZCLDataTypes.uint16,
    },
  },
};

class IASZoneCluster extends Cluster {

  static get ID() {
    return 1280;
  }

  static get NAME() {
    return 'iasZone';
  }

  static get ATTRIBUTES() {
    return ATTRIBUTES;
  }

  static get COMMANDS() {
    return COMMANDS;
  }

}

Cluster.addCluster(IASZoneCluster);

module.exports = IASZoneCluster;
