'use strict';

const { BoundCluster } = require('zigbee-clusters');

class WindowCoveringBoundCluster extends BoundCluster {

  constructor({
    onUpOpen,
    onDownClose,
  }) {
    super();
    this._onUpOpen = onUpOpen;
    this._onDownClose = onDownClose;
  }

  async upOpen() {
    if (typeof this._onUpOpen === 'function') {
      this._onUpOpen();
    }
  }

  async downClose() {
    if (typeof this._onDownClose === 'function') {
      this._onDownClose();
    }
  }

}

module.exports = WindowCoveringBoundCluster;