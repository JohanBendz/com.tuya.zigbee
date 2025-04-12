'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

class Dimmer3GangTuyaDriver extends ZigBeeDriver {
  async onInit() {
    this.log('Tuya 3 Gang Controller Driver started');
  }

  async onPairListDevices() {
    return this.zigbee.getDevices()
      .filter(device => 
        device.getData().manufacturerName === '_TZE204_1v1dxkck' && 
        device.getData().modelId === 'TS0601'
      )
      .map(device => {
        return [
          {
            name: 'Tuya 3 Gang Controller',
            data: {
              id: device.getData().id,
            },
            capabilities: ['onoff', 'dim'],
            store: { gang: 'firstGang' },
          },
          {
            name: 'Tuya 3 Gang Controller - Second',
            data: {
              id: device.getData().id,
              subDeviceId: 'secondGang',
            },
            capabilities: ['onoff', 'dim'],
            store: { gang: 'secondGang' },
          },
          {
            name: 'Tuya 3 Gang Controller - Third',
            data: {
              id: device.getData().id,
              subDeviceId: 'thirdGang',
            },
            capabilities: ['onoff', 'dim'],
            store: { gang: 'thirdGang' },
          },
        ];
      })
      .flat();
  }
}

module.exports = Dimmer3GangTuyaDriver;