'use strict';

const Cluster = require('../Cluster');
const { ZCLDataTypes, ZCLStruct } = require('../zclTypes');

const ATTRIBUTES = {};

const COMMANDS = {
  getGroups: {
    id: 0x41,
    args: {
      startIdx: ZCLDataTypes.uint8,
    },
    response: {
      id: 0x41,
      args: {
        total: ZCLDataTypes.uint8,
        startIndex: ZCLDataTypes.uint8,
        groups: ZCLDataTypes.Array8(ZCLStruct('TLLGroupResponse', {
          groupId: ZCLDataTypes.uint16,
          groupType: ZCLDataTypes.uint8,
        })),
      },
    },
  },
};

class TouchlinkCluster extends Cluster {

  static get ID() {
    return 4096; // 0x1000
  }

  static get NAME() {
    return 'touchlink';
  }

  static get ATTRIBUTES() {
    return ATTRIBUTES;
  }

  static get COMMANDS() {
    return COMMANDS;
  }

}

Cluster.addCluster(TouchlinkCluster);

module.exports = TouchlinkCluster;
