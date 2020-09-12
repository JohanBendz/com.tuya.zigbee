'use strict';

const Cluster = require('../Cluster');
const { ZCLDataTypes } = require('../zclTypes');

const ATTRIBUTES = {
  currentTemperature: { id: 0, type: ZCLDataTypes.int16 },
  minTempExperienced: { id: 1, type: ZCLDataTypes.int16 },
  maxTempExperienced: { id: 2, type: ZCLDataTypes.int16 },
  overTempTotalDwell: { id: 3, type: ZCLDataTypes.uint16 },
  deviceTempAlarmMask: { id: 16, type: ZCLDataTypes.map8('deviceTemperatureTooLow', 'deviceTemperatureTooHigh') },
  lowTempThreshold: { id: 17, type: ZCLDataTypes.int16 },
  highTempThreshold: { id: 18, type: ZCLDataTypes.int16 },
  lowTempDwellTripPoint: { id: 19, type: ZCLDataTypes.uint24 },
  highTempDwellTripPoint: { id: 20, type: ZCLDataTypes.uint24 },
};

const COMMANDS = {};

class DeviceTemperatureCluster extends Cluster {

  static get ID() {
    return 2;
  }

  static get NAME() {
    return 'deviceTemperature';
  }

  static get ATTRIBUTES() {
    return ATTRIBUTES;
  }

  static get COMMANDS() {
    return COMMANDS;
  }

}

Cluster.addCluster(DeviceTemperatureCluster);

module.exports = DeviceTemperatureCluster;
