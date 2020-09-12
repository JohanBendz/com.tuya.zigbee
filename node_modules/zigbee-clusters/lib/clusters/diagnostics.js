'use strict';

const Cluster = require('../Cluster');

const ATTRIBUTES = {};

const COMMANDS = {};

class DiagnosticsCluster extends Cluster {

  static get ID() {
    return 2821; // 0x0b05
  }

  static get NAME() {
    return 'diagnostics';
  }

  static get ATTRIBUTES() {
    return ATTRIBUTES;
  }

  static get COMMANDS() {
    return COMMANDS;
  }

}

Cluster.addCluster(DiagnosticsCluster);

module.exports = DiagnosticsCluster;
