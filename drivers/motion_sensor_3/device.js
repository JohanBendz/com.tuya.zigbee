'use strict';

const { Cluster } = require('zigbee-clusters');
const TuyaSpecificCluster = require('../../lib/TuyaSpecificCluster');
const TuyaSpecificClusterDevice = require('../../lib/TuyaSpecificClusterDevice');
const { getDataValue } = require('../../lib/TuyaHelpers');

Cluster.addCluster(TuyaSpecificCluster);

const DP_MOTION = 1;
const DP_BATTERY = 4;
const DP_TAMPER = 5;

class MotionSensor3 extends TuyaSpecificClusterDevice {

  async onNodeInit({ zclNode }) {
    const tuyaCluster = zclNode.endpoints[1].clusters.tuya;

    const handleDatapoint = async data => {
      try {
        await this.processDatapoint(data);
      } catch (error) {
        this.error('Failed to process _TZE200_mgxy2d9f Tuya datapoint', error);
      }
    };

    tuyaCluster.on('reporting', handleDatapoint);
    tuyaCluster.on('response', handleDatapoint);

    if (this.isFirstInit()) {
      await this.setCapabilityValue('alarm_motion', false).catch(this.error);
      await this.setCapabilityValue('alarm_tamper', false).catch(this.error);
    }
  }

  async processDatapoint(data) {
    const value = getDataValue(data);
    const numericValue = typeof value === 'boolean' ? Number(value) : Number(value);

    if (!Number.isFinite(numericValue)) {
      this.log('Ignoring non-numeric Tuya datapoint:', data.dp, value);
      return;
    }

    switch (data.dp) {
      case DP_MOTION: {
        // Verified on Homey and independently by Zigbee2MQTT:
        // 0 = occupancy/motion active, 1 = clear.
        const motionActive = numericValue === 0;
        this.log('Motion alarm:', motionActive);
        await this.setCapabilityValue('alarm_motion', motionActive);
        return;
      }

      case DP_BATTERY: {
        const battery = Math.max(0, Math.min(100, numericValue));
        this.log('Battery (%):', battery);
        await this.setCapabilityValue('measure_battery', battery);
        return;
      }

      case DP_TAMPER: {
        const tamperActive = numericValue === 1;
        this.log('Tamper alarm:', tamperActive);
        await this.setCapabilityValue('alarm_tamper', tamperActive);
        return;
      }

      default:
        this.log('Unhandled _TZE200_mgxy2d9f Tuya datapoint:', data.dp, value);
    }
  }

  onDeleted() {
    this.log('Motion Sensor removed');
  }

}

module.exports = MotionSensor3;
