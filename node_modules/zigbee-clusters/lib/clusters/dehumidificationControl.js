'use strict';

const Cluster = require('../Cluster');

const ATTRIBUTES = {
};

const COMMANDS = {};

class DehumidificationControlCluster extends Cluster {

  static get ID() {
    return 515;
  }

  static get NAME() {
    return 'dehumidificationControl';
  }

  static get ATTRIBUTES() {
    return ATTRIBUTES;
  }

  static get COMMANDS() {
    return COMMANDS;
  }

}

Cluster.addCluster(DehumidificationControlCluster);

module.exports = DehumidificationControlCluster;
