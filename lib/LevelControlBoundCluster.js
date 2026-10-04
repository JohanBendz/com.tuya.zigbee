'use strict';

const { BoundCluster } = require('zigbee-clusters');

class LevelControlBoundCluster extends BoundCluster {

  constructor({
    onStep,
    onStepWithOnOff,
    onMove,
    onStopWithOnOff,
    onStop,
    onMoveWithOnOff,
  }) {
    super();
    this._onStep = onStep;
    this._onStepWithOnOff = onStepWithOnOff;
    this._onMove = onMove;
    this._onStopWithOnOff = onStopWithOnOff;
    this._onStop = onStop;
    this._onMoveWithOnOff = onMoveWithOnOff;
  }

  step(payload) {
    return this._onStep?.(payload);
  }

  stepWithOnOff(payload) {
    return this._onStepWithOnOff?.(payload);
  }

  move(payload) {
    return this._onMove?.(payload);
  }

  moveWithOnOff(payload) {
    return this._onMoveWithOnOff?.(payload);
  }

  stop() {
    return this._onStop?.();
  }

  stopWithOnOff() {
    return this._onStopWithOnOff?.();
  }

}

module.exports = LevelControlBoundCluster;
