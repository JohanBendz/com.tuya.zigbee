'use strict';

const Cluster = require('../Cluster');

const ATTRIBUTES = {};

const COMMANDS = {};

class OTACluster extends Cluster {

  static get ID() {
    return 25; // 0x19
  }

  static get NAME() {
    return 'ota';
  }

  static get ATTRIBUTES() {
    return ATTRIBUTES;
  }

  static get COMMANDS() {
    return COMMANDS;
  }

}

Cluster.addCluster(OTACluster);

module.exports = OTACluster;
