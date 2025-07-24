'use strict';

const Homey = require('homey');
const { ZigbeeDevice } = require('homey-meshdriver');

class smart_plug extends ZigbeeDevice {
  async onInit({zclNode}) {
    this.printNode();
    // Ajoutez ici l'enregistrement des capacités si besoin
  }
}

module.exports = smart_plug;

