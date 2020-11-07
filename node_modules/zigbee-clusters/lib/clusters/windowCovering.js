'use strict';

const Cluster = require('../Cluster');
const { ZCLDataTypes } = require('../zclTypes');

const ATTRIBUTES = {
  windowCoveringType: {
    id: 0,
    type: ZCLDataTypes.enum8({
      rollershade: 0,
      rollershade2Motor: 1,
      rollershadeExterior: 2,
      rollershadeExterior2Motor: 3,
      drapery: 4,
      awning: 5,
      shutter: 6,
      tiltBlindTiltOnly: 7,
      tiltBlindLiftAndTilt: 8,
      projectorScreen: 9,
    }),
  },
  physicalClosedLimitLift: { id: 1, type: ZCLDataTypes.uint16 },
  physicalClosedLimitTilt: { id: 2, type: ZCLDataTypes.uint16 },
  currentPositionLift: { id: 3, type: ZCLDataTypes.uint16 },
  currentPositionTilt: { id: 4, type: ZCLDataTypes.uint16 },
  numberofActuationsLift: { id: 5, type: ZCLDataTypes.uint16 },
  numberofActuationsTilt: { id: 6, type: ZCLDataTypes.uint16 },
  configStatus: { id: 7, type: ZCLDataTypes.map8('operational', 'online', 'reversalLiftCommands', 'controlLift', 'controlTilt', 'encoderLift', 'encoderTilt', 'reserved') },
  currentPositionLiftPercentage: { id: 8, type: ZCLDataTypes.uint8 },
  currentPositionTiltPercentage: { id: 9, type: ZCLDataTypes.uint8 },
};

const COMMANDS = {
  upOpen: { id: 0 },
  downClose: { id: 1 },
  stop: { id: 2 },
  goToLiftValue: {
    id: 4,
    args: {
      liftValue: ZCLDataTypes.uint16,
    },
  },
  goToLiftPercentage: {
    id: 5,
    args: {
      percentageLiftValue: ZCLDataTypes.uint8,
    },
  },
  goToTiltValue: {
    id: 7,
    args: {
      tiltValue: ZCLDataTypes.uint16,
    },
  },
  goToTiltPercentage: {
    id: 8,
    args: {
      percentageTiltValue: ZCLDataTypes.uint8,
    },
  },
};

class WindowCovering extends Cluster {

  static get ID() {
    return 258; // 0x0102
  }

  static get NAME() {
    return 'windowCovering';
  }

  static get ATTRIBUTES() {
    return ATTRIBUTES;
  }

  static get COMMANDS() {
    return COMMANDS;
  }

}

Cluster.addCluster(WindowCovering);

module.exports = WindowCovering;
