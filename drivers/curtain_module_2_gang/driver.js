'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

class CurtainModule2GangDriver extends ZigBeeDriver {

  async onInit() {
    this.homey.flow
      .getActionCard('move_open_2gang')
      .registerRunListener(async ({ device }) => {
        await device.moveOpen();
        return true;
      });

    this.homey.flow
      .getActionCard('move_close_2gang')
      .registerRunListener(async ({ device }) => {
        await device.moveClose();
        return true;
      });
  }

}

module.exports = CurtainModule2GangDriver;
