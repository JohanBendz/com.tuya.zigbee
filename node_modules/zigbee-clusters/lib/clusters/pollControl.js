'use strict';

const Cluster = require('../Cluster');

const ATTRIBUTES = {};

const COMMANDS = {};

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
