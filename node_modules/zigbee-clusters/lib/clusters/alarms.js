'use strict';

const Cluster = require('../Cluster');

const ATTRIBUTES = {};

const COMMANDS = {
  resetAllAlarms: {
    id: 1,
    args: {},
  },
  getAlarm: {
    id: 2,
    args: {},
  },
  resetAlarmLog: {
    id: 3,
    args: {},
  },
};

class AlarmsCluster extends Cluster {

  static get ID() {
    return 9; // 0x9
  }

  static get NAME() {
    return 'alarms';
  }

  static get ATTRIBUTES() {
    return ATTRIBUTES;
  }

  static get COMMANDS() {
    return COMMANDS;
  }

}

Cluster.addCluster(AlarmsCluster);

module.exports = AlarmsCluster;
