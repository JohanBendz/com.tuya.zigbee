'use strict';

const Homey = require('homey');

class SirenDriver extends Homey.Driver {

  async onInit() {
    this.homey.flow
      .getActionCard('siren_alarm_state')
      .registerRunListener(async ({ device, siren_alarm_state }) => {
        await device.setAlarmState(siren_alarm_state !== 'off/disable');
        return true;
      });

    this.homey.flow
      .getActionCard('siren_volume_setting')
      .registerRunListener(async ({ device, siren_volume }) => {
        await device.sendAlarmVolume(siren_volume);
        return true;
      });

    this.homey.flow
      .getActionCard('siren_alarm_duration')
      .registerRunListener(async ({ device, duration }) => {
        await device.sendAlarmDuration(duration);
        return true;
      });

    this.homey.flow
      .getActionCard('siren_alarm_tune')
      .registerRunListener(async ({ device, siren_alarm_tune }) => {
        await device.sendAlarmTune(siren_alarm_tune);
        return true;
      });
  }

}

module.exports = SirenDriver;
