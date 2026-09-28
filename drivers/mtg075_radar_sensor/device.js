'use strict';

const { Cluster } = require('zigbee-clusters');
const TuyaSpecificCluster = require('../../lib/TuyaSpecificCluster');
const TuyaSpecificClusterDevice = require('../../lib/TuyaSpecificClusterDevice');
const { getDataValue } = require('../../lib/TuyaHelpers');

Cluster.addCluster(TuyaSpecificCluster);

const dataPoints = {
  presence: 1,
  radarSensitivity: 2,
  shieldRange: 3,
  detectionRange: 4,
  targetDistance: 9,
  entryFilterTime: 101,
  departureDelay: 102,
  illuminance: 104,
  entrySensitivity: 105,
  entryDistanceIndentation: 106,
  breakerMode: 107,
  breakerStatus: 108,
  statusIndication: 109,
  illuminanceThreshold: 110,
  blockTime: 112,
  sensor: 115,
};

const relayModes = { standard: 0, local: 1 };
const indicationStates = { OFF: 0, ON: 1 };
const sensorStates = { on: 0, off: 1, occupied: 2, unoccupied: 3 };

class Mtg075RadarSensor extends TuyaSpecificClusterDevice {
  async onNodeInit({ zclNode }) {
    this.printNode();

    this.registerCapabilityListener('onoff', async value => {
      await this.writeEnum(dataPoints.breakerStatus, value ? 1 : 0);
    });

    zclNode.endpoints[1].clusters.tuya.on('reporting', value => this.processDatapoint(value));
    zclNode.endpoints[1].clusters.tuya.on('response', value => this.processDatapoint(value));
  }

  async processDatapoint(data) {
    const value = getDataValue(data);

    switch (data.dp) {
      case dataPoints.presence:
        await this.setCapabilityValue('alarm_motion', value === true || value === 1).catch(this.error);
        break;
      case dataPoints.targetDistance:
        await this.setCapabilityValue('target_distance', value / 100).catch(this.error);
        break;
      case dataPoints.illuminance:
        await this.setCapabilityValue('measure_luminance', value / 10).catch(this.error);
        break;
      case dataPoints.breakerStatus:
        await this.setCapabilityValue('onoff', value === 1).catch(this.error);
        break;
      default:
        this.log(`Unhandled datapoint detected. DP: ${data.dp}, Value: ${value}, DataType: ${data.datatype}`);
    }
  }

  async onSettings({ newSettings, changedKeys }) {
    if (changedKeys.includes('radar_sensitivity')) {
      await this.writeData32(dataPoints.radarSensitivity, newSettings.radar_sensitivity);
    }
    if (changedKeys.includes('shield_range')) {
      await this.writeData32(dataPoints.shieldRange, newSettings.shield_range * 100);
    }
    if (changedKeys.includes('detection_range')) {
      await this.writeData32(dataPoints.detectionRange, newSettings.detection_range * 100);
    }
    if (changedKeys.includes('entry_sensitivity')) {
      await this.writeData32(dataPoints.entrySensitivity, newSettings.entry_sensitivity);
    }
    if (changedKeys.includes('entry_filter_time')) {
      await this.writeData32(dataPoints.entryFilterTime, newSettings.entry_filter_time * 10);
    }
    if (changedKeys.includes('departure_delay')) {
      await this.writeData32(dataPoints.departureDelay, newSettings.departure_delay);
    }
    if (changedKeys.includes('entry_distance_indentation')) {
      await this.writeData32(dataPoints.entryDistanceIndentation, newSettings.entry_distance_indentation * 100);
    }
    if (changedKeys.includes('block_time')) {
      await this.writeData32(dataPoints.blockTime, newSettings.block_time * 10);
    }
    if (changedKeys.includes('breaker_mode')) {
      await this.writeEnum(dataPoints.breakerMode, relayModes[newSettings.breaker_mode]);
    }
    if (changedKeys.includes('illuminance_threshold')) {
      await this.writeData32(dataPoints.illuminanceThreshold, newSettings.illuminance_threshold * 10);
    }
    if (changedKeys.includes('status_indication')) {
      await this.writeEnum(dataPoints.statusIndication, indicationStates[newSettings.status_indication]);
    }
    if (changedKeys.includes('sensor')) {
      await this.writeEnum(dataPoints.sensor, sensorStates[newSettings.sensor]);
    }
  }
}

module.exports = Mtg075RadarSensor;