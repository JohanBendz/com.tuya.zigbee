'use strict';

const { Cluster } = require('zigbee-clusters');
const TuyaSpecificCluster = require('../../lib/TuyaSpecificCluster');
const TuyaSpecificClusterDevice = require('../../lib/TuyaSpecificClusterDevice');
const { getDataValue } = require('../../lib/TuyaHelpers');

Cluster.addCluster(TuyaSpecificCluster);

class motion_sensor_3 extends TuyaSpecificClusterDevice {

  async onNodeInit({ zclNode }) {
    this.log('Setting up listeners for endpoint 1, tuya cluster...');

    const handleReport = data => {
      try {
        this.onReport(data);
      } catch (err) {
        this.error('Failed to process Tuya motion sensor report:', err);
      }
    };

    zclNode.endpoints[1].clusters.tuya.on('response', handleReport);
    zclNode.endpoints[1].clusters.tuya.on('reporting', handleReport);
    this.log('Listeners have been set up.');

    // Reset motion alarm on first init to false
    if (this.isFirstInit()) {
      await this.setCapabilityValue('alarm_motion', false).catch(this.error);
    }

    await zclNode.endpoints[1].clusters.basic.readAttributes([
      'manufacturerName',
      'zclVersion',
      'appVersion',
      'modelId',
      'powerSource',
      'attributeReportingStatus'
    ]).catch(err => {
      this.error('Error when reading device attributes:', err);
    });
  }

  onReport(data) {
    const value = getDataValue(data);
    this.log(`Received Tuya report - DP: ${data.dp}, Datatype: ${data.datatype}, Value:`, value);

    if (data.dp === 1) {
      // DP1: Motion alarm (Raw byte 0 = motion active, 1 = normal)
      const rawByte = data.data && data.data.length ? data.data.readUInt8(0) : (value ? 1 : 0);
      const motionActive = rawByte === 0;

      this.setCapabilityValue('alarm_motion', motionActive).catch(this.error);
      this.log(`Motion alarm updated: ${motionActive} (raw byte: ${rawByte})`);
    } else if (data.dp === 4) {
      // DP4: Battery percentage (0-100)
      this.setCapabilityValue('measure_battery', value).catch(this.error);
      this.log(`Battery percentage updated: ${value}%`);
    } else if (data.dp === 5) {
      // DP5: Tamper alarm (Raw byte 1 = tamper active, 0 = normal)
      if (this.hasCapability('alarm_tamper')) {
        const rawByte = data.data && data.data.length ? data.data.readUInt8(0) : (value ? 1 : 0);
        const tamperActive = rawByte === 1;

        this.setCapabilityValue('alarm_tamper', tamperActive).catch(this.error);
        this.log(`Tamper alarm updated: ${tamperActive} (raw byte: ${rawByte})`);
      }
    } else {
      this.log('Received unhandled Tuya report:', data);
    }
  }

  onDeleted() {
    this.log('Motion Sensor removed');
  }
}

module.exports = motion_sensor_3;
