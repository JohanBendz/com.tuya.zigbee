'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

class FingerBotDriver extends ZigBeeDriver {

  async onInit() {
    this.log('FingerBot driver initialized');

    this._registerActionFlowCards();
  }

  _registerActionFlowCards() {
    const pushCard = this.homey.flow.getActionCard('fingerbot_push');

    pushCard.registerRunListener(async args => {
      await args.device.triggerFingerBotPress();
      return true;
    });
  }
}

module.exports = FingerBotDriver;