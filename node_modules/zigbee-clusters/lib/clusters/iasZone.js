'use strict';

const Cluster = require('../Cluster');

const ATTRIBUTES = {
};

const COMMANDS = {};

class IASZoneCluster extends Cluster {

  static get ID() {
    return 1280;
  }

  static get NAME() {
    return 'iasZone';
  }

  static get ATTRIBUTES() {
    return ATTRIBUTES;
  }

  static get COMMANDS() {
    return COMMANDS;
  }

}

Cluster.addCluster(IASZoneCluster);

module.exports = IASZoneCluster;
