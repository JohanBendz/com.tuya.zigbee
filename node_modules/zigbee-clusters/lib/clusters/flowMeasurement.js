'use strict';

const Cluster = require('../Cluster');
const { ZCLDataTypes } = require('../zclTypes');

const ATTRIBUTES = {
  measuredValue: { id: 0, type: ZCLDataTypes.uint16 },
  minMeasuredValue: { id: 1, type: ZCLDataTypes.uint16 },
  maxMeasuredValue: { id: 2, type: ZCLDataTypes.uint16 },
  tolerance: { id: 3, type: ZCLDataTypes.uint16 },
};

const COMMANDS = {};

class FlowMeasurementCluster extends Cluster {

  static get ID() {
    return 1028;
  }

  static get NAME() {
    return 'flowMeasurement';
  }

  static get ATTRIBUTES() {
    return ATTRIBUTES;
  }

  static get COMMANDS() {
    return COMMANDS;
  }

}

Cluster.addCluster(FlowMeasurementCluster);

module.exports = FlowMeasurementCluster;
