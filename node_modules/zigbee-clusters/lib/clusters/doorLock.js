'use strict';

const Cluster = require('../Cluster');

const ATTRIBUTES = {
};

const COMMANDS = {};

class DoorLockCluster extends Cluster {

  static get ID() {
    return 257;
  }

  static get NAME() {
    return 'doorLock';
  }

  static get ATTRIBUTES() {
    return ATTRIBUTES;
  }

  static get COMMANDS() {
    return COMMANDS;
  }

}

Cluster.addCluster(DoorLockCluster);

module.exports = DoorLockCluster;
