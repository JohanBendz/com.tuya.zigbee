'use strict';

const Cluster = require('../Cluster');

const ATTRIBUTES = {
};

const COMMANDS = {};

class ShadeConfigurationCluster extends Cluster {

  static get ID() {
    return 256;
  }

  static get NAME() {
    return 'shadeConfiguration';
  }

  static get ATTRIBUTES() {
    return ATTRIBUTES;
  }

  static get COMMANDS() {
    return COMMANDS;
  }

}

Cluster.addCluster(ShadeConfigurationCluster);

module.exports = ShadeConfigurationCluster;
