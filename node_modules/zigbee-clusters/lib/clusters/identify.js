'use strict';

const Cluster = require('../Cluster');
const { ZCLDataTypes } = require('../zclTypes');

const ATTRIBUTES = {
  identifyTime: { id: 0, type: ZCLDataTypes.uint16 },
};

const COMMANDS = {
  identify: {
    id: 0,
    args: {
      identifyTime: ZCLDataTypes.uint16,
    },
  },
  identifyQuery: {
    id: 1,
    response: {
      id: 0,
      args: {
        timeout: ZCLDataTypes.uint16,
      },
    },
  },
  triggerEffect: {
    id: 64,
    args: {
      effectIdentifier: ZCLDataTypes.enum8({
        blink: 0,
        breathe: 1,
        okay: 2,
        channelChange: 11,
        finish: 254,
        stop: 255,
      }),
      effectVariant: ZCLDataTypes.uint16,
    },
  },
};

class IdentifyCluster extends Cluster {

  static get ID() {
    return 3;
  }

  static get NAME() {
    return 'identify';
  }

  static get ATTRIBUTES() {
    return ATTRIBUTES;
  }

  static get COMMANDS() {
    return COMMANDS;
  }

}

Cluster.addCluster(IdentifyCluster);

module.exports = IdentifyCluster;
