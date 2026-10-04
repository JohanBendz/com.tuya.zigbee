'use strict';

const { BoundCluster } = require('zigbee-clusters');

class TuyaRemoteOnOffBoundCluster extends BoundCluster {

  constructor({ onSingle, onDouble, onHold }) {
    super();
    this._onSingle = onSingle;
    this._onDouble = onDouble;
    this._onHold = onHold;
  }

  setOn() {
    return this._onSingle?.('setOn');
  }

  setOff() {
    return this._onSingle?.('setOff');
  }

  toggle() {
    return this._onSingle?.('toggle');
  }

  tuyaAction({ value }) {
    if (value === 0) return this._onSingle?.('tuyaAction');
    if (value === 1) return this._onDouble?.('tuyaAction');
    if (value === 2) return this._onHold?.('tuyaAction');
    return undefined;
  }

}

module.exports = TuyaRemoteOnOffBoundCluster;
