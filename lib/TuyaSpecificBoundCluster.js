'use strict';

const { BoundCluster } = require('zigbee-clusters');

class TuyaSpecificBoundCluster extends BoundCluster {

  constructor({
    onData,
  }) {
    super();
    this._onData = onData;
  }

  data() {
    if (typeof this._onData === 'function') {
      this._onData();
    }
  }


}

module.exports = TuyaSpecificBoundCluster;