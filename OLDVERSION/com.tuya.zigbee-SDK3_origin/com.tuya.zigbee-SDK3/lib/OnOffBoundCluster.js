'use strict';

const { BoundCluster } = require('zigbee-clusters');

class OnOffBoundCluster extends BoundCluster {

  constructor({
    onSetOff, onSetOn, onWithTimedOff, onToggle, offWithEffect
  }) {
    super();
    this._onToggle = onToggle;
    this._onWithTimedOff = onWithTimedOff;
    this._onSetOff = onSetOff;
    this._onSetOn = onSetOn;
    this._offWithEffect = offWithEffect;
  }

  toggle() {
    if (typeof this._onToggle === 'function') {
      this._onToggle();
    }
  }

  onWithTimedOff({ onOffControl, onTime, offWaitTime }) {
    if (typeof this._onWithTimedOff === 'function') {
      this._onWithTimedOff({ onOffControl, onTime, offWaitTime });
    }
  }

  setOn() {
    if (typeof this._onSetOn === 'function') {
      this._onSetOn();
    }
  }

  setOff() {
    if (typeof this._onSetOff === 'function') {
      this._onSetOff();
    }
  }

  offWithEffect() {
    if (typeof this._offWithEffect === 'function') {
      this._offWithEffect();
    }
  }

}

module.exports = OnOffBoundCluster;