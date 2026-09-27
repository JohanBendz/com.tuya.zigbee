'use strict';

const Homey = require('homey');

class SirenTempHumidityDriver extends Homey.Driver {

  async onInit() {
    this.homey.flow
      .getActionCard('alarm_state')
      .registerRunListener(async ({ device, alarm_state }) => {
        await device.setAlarmState(alarm_state !== 'off/disable');
        return true;
      });

    this.homey.flow
      .getActionCard('siren_volume')
      .registerRunListener(async ({ device, siren_volume }) => {
        await device.sendAlarmVolume(Number(siren_volume));
        return true;
      });

    this.homey.flow
      .getActionCard('alarm_duration')
      .registerRunListener(async ({ device, duration }) => {
        await device.sendAlarmDuration(Number(duration));
        return true;
      });

    this.homey.flow
      .getActionCard('alarm_tune')
      .registerRunListener(async ({ device, alarm_tune }) => {
        await device.sendAlarmTune(Number(alarm_tune));
        return true;
      });
  }

}

module.exports = SirenTempHumidityDriver;
