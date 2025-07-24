'use strict';

const Homey = require('homey');
const { ZigbeeDevice } = require('homey-meshdriver');

class remote_control extends ZigbeeDevice {
  async onInit({zclNode}) {
    this.printNode();
    // Ajoutez ici l'enregistrement des capacités si besoin
  }
}

module.exports = remote_control;

