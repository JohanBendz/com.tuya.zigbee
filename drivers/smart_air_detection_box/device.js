'use strict';

const { Cluster } = require('zigbee-clusters');
const TuyaSpecificCluster = require('../../lib/TuyaSpecificCluster');
const TuyaSpecificClusterDevice = require('../../lib/TuyaSpecificClusterDevice');
const { getDataValue } = require('../../lib/TuyaHelpers');

Cluster.addCluster(TuyaSpecificCluster);

const dataPoints = {
  co2OrFormaldehyde: 2,
  temperature: 18,
  humidity: 19,
  pm25: 20,
  voc: 21,
  formaldehydeOrCo2: 22,
};

const PROFILE_DEFAULT = 'default';
const PROFILE_FORMALDEHYDE_DP2 = 'formaldehyde-dp2';
const PROFILE_RYFMQ5RL = 'ryfmq5rl';

class SmartAirDetectionBox extends TuyaSpecificClusterDevice {

  async onNodeInit({ zclNode }) {
    this.manufacturerName = await this.getManufacturerName(zclNode);
    this.profile = this.getProfile(this.manufacturerName);

    if (this.profile === PROFILE_DEFAULT && !this.hasCapability('measure_pm25')) {
      await this.addCapability('measure_pm25');
    }

    this.log('Smart Air Detection Box profile:', this.manufacturerName, this.profile);

    const handleDatapoint = async data => {
      try {
        await this.handleDataPoint(data);
      } catch (error) {
        this.error('Failed to process Smart Air Detection Box datapoint', error);
      }
    };

    zclNode.endpoints[1].clusters.tuya.on('reporting', handleDatapoint);
    zclNode.endpoints[1].clusters.tuya.on('response', handleDatapoint);
  }

  async getManufacturerName(zclNode) {
    const basicCluster = zclNode.endpoints[1].clusters.basic;
    const cachedManufacturerName = basicCluster?.attributes?.manufacturerName;

    if (cachedManufacturerName) {
      return cachedManufacturerName;
    }

    if (!basicCluster || typeof basicCluster.readAttributes !== 'function') {
      this.log('Basic cluster manufacturerName is unavailable; using default air-quality profile');
      return undefined;
    }

    try {
      const { manufacturerName } = await basicCluster.readAttributes(['manufacturerName']);
      return manufacturerName;
    } catch (error) {
      this.error('Failed to read manufacturerName; using default air-quality profile', error);
      return undefined;
    }
  }

  getProfile(manufacturerName) {
    if (manufacturerName === '_TZE200_ryfmq5rl') {
      return PROFILE_RYFMQ5RL;
    }

    if (manufacturerName === '_TZE200_mja3fuja') {
      return PROFILE_FORMALDEHYDE_DP2;
    }

    return PROFILE_DEFAULT;
  }

  async handleDataPoint(data) {
    const value = getDataValue(data);

    if (typeof value !== 'number' || !Number.isFinite(value)) {
      this.log('Ignoring non-numeric Smart Air Detection Box datapoint:', data.dp, value);
      return;
    }

    switch (data.dp) {
      case dataPoints.temperature:
        await this.setCapabilityValue('measure_temperature', value / 10);
        return;

      case dataPoints.humidity:
        await this.setCapabilityValue('measure_humidity', value / 10);
        return;

      case dataPoints.co2OrFormaldehyde:
        if (this.profile === PROFILE_RYFMQ5RL) {
          await this.setCapabilityValue('measure_formaldehyde', value / 100);
        } else if (this.profile === PROFILE_FORMALDEHYDE_DP2) {
          await this.setCapabilityValue('measure_formaldehyde', value);
        } else {
          await this.setCapabilityValue('measure_co2', value);
        }
        return;

      case dataPoints.pm25:
        if (this.profile === PROFILE_DEFAULT && this.hasCapability('measure_pm25')) {
          await this.setCapabilityValue('measure_pm25', value);
        }
        return;

      case dataPoints.voc:
        await this.setCapabilityValue(
          'measure_voc',
          this.profile === PROFILE_RYFMQ5RL ? value / 10 : value
        );
        return;

      case dataPoints.formaldehydeOrCo2:
        if (this.profile === PROFILE_DEFAULT) {
          await this.setCapabilityValue('measure_formaldehyde', value);
        } else {
          await this.setCapabilityValue('measure_co2', value);
        }
        return;

      default:
        this.log('Unhandled Smart Air Detection Box datapoint:', data.dp, value);
    }
  }

  onDeleted() {
    this.log('Smart Air Detection Box removed');
  }

}

module.exports = SmartAirDetectionBox;
