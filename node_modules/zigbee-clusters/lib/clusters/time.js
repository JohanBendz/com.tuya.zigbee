'use strict';

const Cluster = require('../Cluster');

const ATTRIBUTES = {
};

const COMMANDS = {};

class TimeCluster extends Cluster {

  static get ID() {
    return 10; // 0xA
  }

  static get NAME() {
    return 'time';
  }

  static get ATTRIBUTES() {
    return ATTRIBUTES;
  }

  static get COMMANDS() {
    return COMMANDS;
  }

}

Cluster.addCluster(TimeCluster);

module.exports = TimeCluster;
