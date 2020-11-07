'use strict';

const Cluster = require('../Cluster');

const ATTRIBUTES = {};

const COMMANDS = {};

class OnOffSwitchCluster extends Cluster {

  static get ID() {
    return 7;
  }

  static get NAME() {
    return 'onOffSwitch';
  }

  static get ATTRIBUTES() {
    return ATTRIBUTES;
  }

  static get COMMANDS() {
    return COMMANDS;
  }

}

Cluster.addCluster(OnOffSwitchCluster);

module.exports = OnOffSwitchCluster;
