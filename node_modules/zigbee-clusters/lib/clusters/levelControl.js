'use strict';

const Cluster = require('../Cluster');
const { ZCLDataTypes } = require('../zclTypes');

const ATTRIBUTES = {
  currentLevel: { id: 0, type: ZCLDataTypes.uint8 },
  remainingTime: { id: 1, type: ZCLDataTypes.uint16 },
  onOffTransitionTime: { id: 16, type: ZCLDataTypes.uint16 },
  onLevel: { id: 17, type: ZCLDataTypes.uint8 },
  onTransitionTime: { id: 18, type: ZCLDataTypes.uint16 },
  offTransitionTime: { id: 19, type: ZCLDataTypes.uint16 },
  defaultMoveRate: { id: 20, type: ZCLDataTypes.uint16 },
};

const COMMANDS = {
  moveToLevel: {
    id: 0,
    args: {
      level: ZCLDataTypes.uint8,
      transitionTime: ZCLDataTypes.uint16,
    },
  },
  move: {
    id: 1,
    args: {
      moveMode: ZCLDataTypes.enum8({
        up: 0,
        down: 1,
      }),
      rate: ZCLDataTypes.uint8,
    },
  },
  step: {
    id: 2,
    args: {
      mode: ZCLDataTypes.enum8({
        up: 0,
        down: 1,
      }),
      stepSize: ZCLDataTypes.uint8,
      transitionTime: ZCLDataTypes.uint16,
    },
  },
  stop: { id: 3 },
  moveToLevelWithOnOff: {
    id: 4,
    args: {
      level: ZCLDataTypes.uint8,
      transitionTime: ZCLDataTypes.uint16,
    },
  },
  moveWithOnOff: {
    id: 5,
    args: {
      moveMode: ZCLDataTypes.enum8({
        up: 0,
        down: 1,
      }),
      rate: ZCLDataTypes.uint8,
    },
  },
  stepWithOnOff: {
    id: 6,
    args: {
      mode: ZCLDataTypes.enum8({
        up: 0,
        down: 1,
      }),
      stepSize: ZCLDataTypes.uint8,
      transitionTime: ZCLDataTypes.uint16,
    },
  },
  stopWithOnOff: { id: 7 },
};

class LevelControlCluster extends Cluster {

  static get ID() {
    return 8;
  }

  static get NAME() {
    return 'levelControl';
  }

  static get ATTRIBUTES() {
    return ATTRIBUTES;
  }

  static get COMMANDS() {
    return COMMANDS;
  }

}

Cluster.addCluster(LevelControlCluster);

module.exports = LevelControlCluster;
