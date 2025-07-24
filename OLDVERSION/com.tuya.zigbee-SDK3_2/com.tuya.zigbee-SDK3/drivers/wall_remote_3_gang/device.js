'use strict';

const { ZigBeeDevice } = require('homey-zigbeedriver');
const { CLUSTER } = require('zigbee-clusters');

class wall_remote_4_gang extends ZigBeeDevice {

  async onNodeInit({ zclNode }) {
    this.printNode();

    // Détection de la source d'alimentation
    try {
      const { powerSource } = await zclNode.endpoints[1].clusters.basic.readAttributes(['powerSource']);
      this.setStoreValue('powerSource', powerSource);
    } catch (error) {
      this.error('Erreur lecture powerSource:', error);
    }

    // Gestion des boutons
    for (let endpoint = 1; endpoint <= 4; endpoint++) {
      zclNode.endpoints[endpoint].clusters.onOff.on('commandOn', () => this._handleButtonPress(`button${endpoint}`));
    }

    // Capacités batterie
    if (this.getStoreValue('powerSource') === 'battery') {
      this.registerCapability('measure_battery', CLUSTER.POWER_CONFIGURATION, { endpoint: 1 });
      this.registerCapability('alarm_battery', CLUSTER.POWER_CONFIGURATION, { endpoint: 1 });
    }
  }

  _handleButtonPress(buttonId) {
    this.triggerFlow('button_pressed', { button: buttonId });
    this.log(`Bouton ${buttonId} pressé`);
  }
}

module.exports = wall_remote_4_gang;
