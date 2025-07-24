'use strict';

const Homey = require('homey');
const { ZigbeeDevice } = require('homey-meshdriver');

class TS0001 extends ZigbeeDevice {
  async onInit({zclNode}) {
    this.printNode();
    // Ajoutez ici l'enregistrement des capacités si besoin
  }
}

module.exports = TS0001; 