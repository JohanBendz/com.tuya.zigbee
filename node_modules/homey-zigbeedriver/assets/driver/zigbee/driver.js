'use strict';

const { ZigBeeDevice } = require('homey-zigbeedriver');

class MyZigBeeDevice extends ZigBeeDevice {

  onNodeInit({ zclNode, node }) {
    this.log('MyZigBeeDevice has been initialized');
  }

}

module.exports = MyZigBeeDevice;
