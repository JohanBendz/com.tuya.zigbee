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
    id: 0x00,
    // Add direction property as "zoneEnrollResponse" has same command id.
    direction: Cluster.DIRECTION_SERVER_TO_CLIENT,
    args: {
      zoneStatus: ZONE_STATUS_DATA_TYPE,
      extendedStatus: ZCLDataTypes.uint8,
      zoneId: ZCLDataTypes.uint8,
      delay: ZCLDataTypes.uint16,
    },
  },
  zoneEnrollResponse: {
    id: 0x00,
    // Add direction property as "zoneStatusChangeNotification" has same command id.
    direction: Cluster.DIRECTION_CLIENT_TO_SERVER,
    args: {
      enrollResponseCode: ZCLDataTypes.enum8({
        success: 0x00,
        notSupported: 0x01,
        noEnrollPermit: 0x02,
        tooManyZones: 0x03,
      }),
      zoneId: ZCLDataTypes.uint8,
    },
  },
  zoneEnrollRequest: {
    id: 0x01,
    // Add direction property as "initiateNormalOperationMode" has same command id.
    direction: Cluster.DIRECTION_SERVER_TO_CLIENT,
    args: {
      zoneType: ZCLDataTypes.enum16({
        standard: 0x0000,
        motionSensor: 0x000d,
        contactSwitch: 0x0015,
        fireSensor: 0x0028,
        waterSensor: 0x002a,
        carbonMonoxideSensor: 0x002b,
        personalEmergencyDevice: 0x002c,
        vibrationMovementSensor: 0x002d,
        remoteControl: 0x010f,
        keyFob: 0x0115,
        keyPad: 0x021d,
        standardWarningDevice: 0x0225,
        glassBreakSensor: 0x0226,
        securityRepeater: 0x0229,
        invalid: 0xffff,
      }),
      manufacturerCode: ZCLDataTypes.uint16,
    },
  },
  initiateNormalOperationMode: {
    id: 0x01,
    // Add direction property as "zoneEnrollRequest" has same command id.
    direction: Cluster.DIRECTION_CLIENT_TO_SERVER,
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
