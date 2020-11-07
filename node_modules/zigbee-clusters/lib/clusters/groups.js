'use strict';

const Cluster = require('../Cluster');
const { ZCLDataTypes } = require('../zclTypes');

const ATTRIBUTES = {
  nameSupport: { id: 0, type: ZCLDataTypes.map8(null, null, null, null, null, null, null, 'groupNames') },
};

const COMMANDS = {
  addGroup: {
    id: 0,
    args: {
      groupId: ZCLDataTypes.uint16,
      groupName: ZCLDataTypes.string,
    },
    response: {
      id: 0,
      args: {
        status: ZCLDataTypes.enum8Status,
        groupId: ZCLDataTypes.uint16,
      },
    },
  },
  viewGroup: {
    id: 1,
    args: {
      groupId: ZCLDataTypes.uint16,
    },
    response: {
      id: 1,
      args: {
        status: ZCLDataTypes.enum8Status,
        groupId: ZCLDataTypes.uint16,
        groupNames: ZCLDataTypes.string,
      },
    },
  },
  getGroupMembership: {
    id: 2,
    args: {
      groupIds: ZCLDataTypes.Array8(ZCLDataTypes.uint16),
    },
    response: {
      id: 2,
      args: {
        capacity: ZCLDataTypes.uint8,
        groups: ZCLDataTypes.Array8(ZCLDataTypes.uint16),
      },
    },
  },
  removeGroup: {
    id: 3,
    args: {
      groupId: ZCLDataTypes.uint16,
    },
    response: {
      id: 3,
      args: {
        status: ZCLDataTypes.enum8Status,
        groupId: ZCLDataTypes.uint16,
      },
    },
  },
  removeAllGroups: { id: 4 },
  addGroupIfIdentify: {
    id: 5,
    args: {
      groupId: ZCLDataTypes.uint16,
      groupName: ZCLDataTypes.string,
    },
  },
};

class GroupsCluster extends Cluster {

  static get ID() {
    return 4;
  }

  static get NAME() {
    return 'groups';
  }

  static get ATTRIBUTES() {
    return ATTRIBUTES;
  }

  static get COMMANDS() {
    return COMMANDS;
  }

}

Cluster.addCluster(GroupsCluster);

module.exports = GroupsCluster;
