'use strict';

const Cluster = require('../Cluster');

const ATTRIBUTES = {
};

const COMMANDS = {};

class IASWDCluster extends Cluster {

  static get ID() {
    return 1282;
  }

  static get NAME() {
    return 'iasWD';
  }

  static get ATTRIBUTES() {
    return ATTRIBUTES;
  }

  static get COMMANDS() {
    return COMMANDS;
  }

}

Cluster.addCluster(IASWDCluster);

module.exports = IASWDCluster;
