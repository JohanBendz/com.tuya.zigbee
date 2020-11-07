'use strict';

const Cluster = require('../Cluster');
const { ZCLDataTypes } = require('../zclTypes');

const ATTRIBUTES = {
  measuredValue: { id: 0, type: ZCLDataTypes.uint16 },
  minMeasuredValue: { id: 1, type: ZCLDataTypes.uint16 },
  maxMeasuredValue: { id: 2, type: ZCLDataTypes.uint16 },
  tolerance: { id: 3, type: ZCLDataTypes.uint16 },
  scaledValue: { id: 16, type: ZCLDataTypes.int16 },
  minScaledValue: { id: 17, type: ZCLDataTypes.int16 },
  maxScaledValue: { id: 18, type: ZCLDataTypes.int16 },
  scaledTolerance: { id: 19, type: ZCLDataTypes.uint16 },
  scale: { id: 20, type: ZCLDataTypes.int8 },
};

const COMMANDS = {};

class PressureMeasurementCluster extends Cluster {

  static get ID() {
    return 1027;
  }

  static get NAME() {
    return 'pressureMeasurement';
  }

  static get ATTRIBUTES() {
    return ATTRIBUTES;
  }

  static get COMMANDS() {
    return COMMANDS;
  }

}

Cluster.addCluster(PressureMeasurementCluster);

module.exports = PressureMeasurementCluster;
