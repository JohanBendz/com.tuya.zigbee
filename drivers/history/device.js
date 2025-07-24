'use strict';

const Homey = require('homey');
const { ZigbeeDevice } = require('homey-meshdriver');

class history extends ZigbeeDevice {
  async onInit({zclNode}) {
    this.printNode();
    // Ajoutez ici l'enregistrement des capacités si besoin
  }
}

module.exports = history; 