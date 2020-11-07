'use strict';

const Cluster = require('../Cluster');

const ATTRIBUTES = {
};

const COMMANDS = {};

class IASACECluster extends Cluster {

  static get ID() {
    return 1281;
  }

  static get NAME() {
    return 'iasACE';
  }

  static get ATTRIBUTES() {
    return ATTRIBUTES;
  }

  static get COMMANDS() {
    return COMMANDS;
  }

}

Cluster.addCluster(IASACECluster);

module.exports = IASACECluster;
