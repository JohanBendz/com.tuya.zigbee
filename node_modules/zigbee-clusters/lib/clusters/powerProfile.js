'use strict';

const Cluster = require('../Cluster');

const ATTRIBUTES = {
};

const COMMANDS = {};

class PowerProfileCluster extends Cluster {

  static get ID() {
    return 26;
  }

  static get NAME() {
    return 'powerProfile';
  }

  static get ATTRIBUTES() {
    return ATTRIBUTES;
  }

  static get COMMANDS() {
    return COMMANDS;
  }

}

Cluster.addCluster(PowerProfileCluster);

module.exports = PowerProfileCluster;
