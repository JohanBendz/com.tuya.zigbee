'use strict';

const TuyaDevice = require('./TuyaSpecificClusterDevice');
require('./TuyaSpecificCluster');

const transactions = new WeakMap();

// Homey tiles on one Tuya endpoint share the physical transaction sequence.
class TuyaSharedEndpointDevice extends TuyaDevice {
  get transactionID() { return transactions.get(this.zclNode) || 0; }
  set transactionID(next) { transactions.set(this.zclNode, next % 256); }

  listenForReports(tuya, onReport) {
    this.detachReports?.();
    tuya.on('reporting', onReport);
    tuya.on('response', onReport);
    this.detachReports = () => {
      tuya.removeListener('reporting', onReport);
      tuya.removeListener('response', onReport);
    };
  }

  onDeleted() {
    // The SDK default removes every cluster listener, including sibling tiles.
    this.detachReports?.();
  }
}

module.exports = TuyaSharedEndpointDevice;
