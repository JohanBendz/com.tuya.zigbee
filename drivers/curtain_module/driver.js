'use strict';

const Homey = require('homey');

class CurtainModuleDriver extends Homey.Driver {

  async onInit() {
    this.homey.flow
      .getActionCard('move_open')
      .registerRunListener(async ({ device }) => {
        await device.moveOpen();
        return true;
      });

    this.homey.flow
      .getActionCard('move_close')
      .registerRunListener(async ({ device }) => {
        await device.moveClose();
        return true;
      });
  }

}

module.exports = CurtainModuleDriver;
