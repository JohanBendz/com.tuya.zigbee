'use strict';

const Cluster = require('../Cluster');

const ATTRIBUTES = {};

const COMMANDS = {};

class ScenesCluster extends Cluster {

  static get ID() {
    return 5;
  }

  static get NAME() {
    return 'scenes';
  }

  static get ATTRIBUTES() {
    return ATTRIBUTES;
  }

  static get COMMANDS() {
    return COMMANDS;
  }

}

Cluster.addCluster(ScenesCluster);

module.exports = ScenesCluster;
