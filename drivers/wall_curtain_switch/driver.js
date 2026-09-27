'use strict';

const Homey = require('homey');

class WallCurtainSwitchDriver extends Homey.Driver {

  async onInit() {
    this.homey.flow
      .getActionCard('wall_move_open')
      .registerRunListener(async ({ device }) => {
        await device.moveOpen();
        return true;
      });

    this.homey.flow
      .getActionCard('wall_move_close')
      .registerRunListener(async ({ device }) => {
        await device.moveClose();
        return true;
      });
  }

}

module.exports = WallCurtainSwitchDriver;
