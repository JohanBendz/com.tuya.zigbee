'use strict';

const Homey = require('homey');
const { ZigbeeDevice } = require('homey-meshdriver');

class Lot1 extends ZigbeeDevice {
  async onInit({zclNode}) {
    this.printNode();
    // Enregistrement automatique de la capacité onoff
    this.registerCapability('onoff', 'genOnOff', {
      getOpts: {
        getOnStart: true,
        pollInterval: 60000
      }
    });
  }
}

module.exports = Lot1; 