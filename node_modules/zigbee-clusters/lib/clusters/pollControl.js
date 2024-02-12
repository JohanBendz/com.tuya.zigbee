'use strict';

const { ZCLDataTypes } = require('../zclTypes');
const Cluster = require('../Cluster');

const ATTRIBUTES = {
  checkInInterval: { id: 0, type: ZCLDataTypes.uint32 },
  longPollInterval: { id: 1, type: ZCLDataTypes.uint32 },
  shortPollInterval: { id: 2, type: ZCLDataTypes.uint16 },
  fastPollTimeout: { id: 3, type: ZCLDataTypes.uint16 },
  checkInIntervalMin: { id: 4, type: ZCLDataTypes.uint32 },
  longPollIntervalMin: { id: 5, type: ZCLDataTypes.uint32 },
  fastPollTimeoutMax: { id: 6, type: ZCLDataTypes.uint16 },
};

const COMMANDS = {
  fastPollStop: { id: 1 },
  setLongPollInterval: {
    id: 2,
    args: {
      newLongPollInterval: ZCLDataTypes.uint32,
    },
  },
  setShortPollInterval: {
    id: 3,
    args: {
      newShortPollInterval: ZCLDataTypes.uint16,
    },
  },
};

class PollControlCluster extends Cluster {

  static get ID() {
    return 32; // 0x0020
  }

  static get NAME() {
    return 'pollControl';
  }

  static get ATTRIBUTES() {
    return ATTRIBUTES;
  }

  static get COMMANDS() {
    return COMMANDS;
  }

}

Cluster.addCluster(PollControlCluster);

module.exports = PollControlCluster;
