'use strict';

const Cluster = require('../Cluster');
const { ZCLDataTypes } = require('../zclTypes');

const ATTRIBUTES = {
  currentSummationDelivered: { id: 0, type: ZCLDataTypes.uint48 },
  currentSummationReceived: { id: 1, type: ZCLDataTypes.uint48 },
  currentMaxDemandDelivered: { id: 2, type: ZCLDataTypes.uint48 },
  currentMaxDemandReceived: { id: 3, type: ZCLDataTypes.uint48 },
  powerFactor: { id: 6, type: ZCLDataTypes.int8 },
  multiplier: { id: 769, type: ZCLDataTypes.uint24 },
  divisor: { id: 770, type: ZCLDataTypes.uint24 },
  instantaneousDemand: { id: 1024, type: ZCLDataTypes.int24 },
};

const COMMANDS = {};

class MeteringCluster extends Cluster {

  static get ID() {
    return 1794; // 0x0702
  }

  static get NAME() {
    return 'metering';
  }

  static get ATTRIBUTES() {
    return ATTRIBUTES;
  }

  static get COMMANDS() {
    return COMMANDS;
  }

}

Cluster.addCluster(MeteringCluster);

module.exports = MeteringCluster;
