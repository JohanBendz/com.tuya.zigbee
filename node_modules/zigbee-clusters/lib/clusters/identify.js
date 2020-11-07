'use strict';

const Cluster = require('../Cluster');

const ATTRIBUTES = {};

const COMMANDS = {};

class IdentifyCluster extends Cluster {

  static get ID() {
    return 3;
  }

  static get NAME() {
    return 'identify';
  }

  static get ATTRIBUTES() {
    return ATTRIBUTES;
  }

  static get COMMANDS() {
    return COMMANDS;
  }

}

Cluster.addCluster(IdentifyCluster);

module.exports = IdentifyCluster;
