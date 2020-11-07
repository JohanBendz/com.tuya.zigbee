'use strict';

const Cluster = require('../Cluster');

const ATTRIBUTES = {
};

const COMMANDS = {};

class PumpConfigurationAndControlCluster extends Cluster {

  static get ID() {
    return 512;
  }

  static get NAME() {
    return 'pumpConfigurationAndControl';
  }

  static get ATTRIBUTES() {
    return ATTRIBUTES;
  }

  static get COMMANDS() {
    return COMMANDS;
  }

}

Cluster.addCluster(PumpConfigurationAndControlCluster);

module.exports = PumpConfigurationAndControlCluster;
