'use strict';

const Cluster = require('../Cluster');

const ATTRIBUTES = {
};

const COMMANDS = {};

class FanControlCluster extends Cluster {

  static get ID() {
    return 514;
  }

  static get NAME() {
    return 'fanControl';
  }

  static get ATTRIBUTES() {
    return ATTRIBUTES;
  }

  static get COMMANDS() {
    return COMMANDS;
  }

}

Cluster.addCluster(FanControlCluster);

module.exports = FanControlCluster;
