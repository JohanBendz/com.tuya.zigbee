'use strict';

const { debug, CLUSTER, Cluster } = require('zigbee-clusters');
const TuyaSpecificCluster = require('../../lib/TuyaSpecificCluster');
const TuyaSpecificClusterDevice = require("../../lib/TuyaSpecificClusterDevice");
const { getDataValue } = require('../../lib/TuyaHelpers');
const { V1_RAIN_SENSOR_DATA_POINTS } = require('../../lib/TuyaDataPoints');

Cluster.addCluster(TuyaSpecificCluster);

class RainSensor extends TuyaSpecificClusterDevice {

  async onNodeInit({ zclNode }) {

    this.printNode();

    if (this.isFirstInit()) {
      await this.configureAttributeReporting([
        {
          endpointId: 1,
          cluster: CLUSTER.POWER_CONFIGURATION,
          attributeName: 'batteryPercentageRemaining',
          minInterval: 60, // Minimum interval (1 minute)
          maxInterval: 21600, // Maximum interval (6 hours)
          minChange: 2, // Report changes greater than 1%
        }
      ]).catch(this.error);
    }

    // alarm_water
    zclNode.endpoints[1].clusters[CLUSTER.IAS_ZONE.NAME].onZoneStatusChangeNotification = payload => {
      this.onIASZoneStatusChangeNotification(payload);
    }

    // measure_battery // alarm_battery
    zclNode.endpoints[1].clusters[CLUSTER.POWER_CONFIGURATION.NAME]
      .on('attr.batteryPercentageRemaining', this.onBatteryPercentageRemainingAttributeReport.bind(this));

    // Attach event listeners to handle incoming data from Tuya clusters
    zclNode.endpoints[1].clusters.tuya.on("reporting", this.processDatapoint.bind(this));
    zclNode.endpoints[1].clusters.tuya.on("response", this.processDatapoint.bind(this));
    zclNode.endpoints[1].clusters.tuya.on("reportingConfiguration", this.processDatapoint.bind(this));
  }

  onIASZoneStatusChangeNotification({ zoneStatus, extendedStatus, zoneId, delay, }) {
    this.log('IASZoneStatusChangeNotification received:', zoneStatus, extendedStatus, zoneId, delay);
    this.setCapabilityValue('alarm_water', zoneStatus.alarm1).catch(this.error);
  }

  onBatteryPercentageRemainingAttributeReport(batteryPercentageRemaining) {
    const batteryThreshold = this.getSetting('batteryThreshold') || 20;
    this.log("measure_battery | powerConfiguration - batteryPercentageRemaining (%): ", batteryPercentageRemaining / 2);
    this.setCapabilityValue('measure_battery', batteryPercentageRemaining / 2).catch(this.error);
    this.setCapabilityValue('alarm_battery', (batteryPercentageRemaining / 2 < batteryThreshold) ? true : false).catch(this.error);
  }

  async processDatapoint(data) {
    const dp = data.dp;
    const parsedValue = getDataValue(data);
    const dataType = data.datatype;
    this.log(`Processing DP ${dp}, Data Type: ${dataType}, Parsed Value:`, parsedValue);

    switch (dp) {
      case V1_RAIN_SENSOR_DATA_POINTS.illuminance:
        this.log('Received illuminance:', parsedValue);
        this.setCapabilityValue('measure_luminance', parsedValue).catch(this.error);
        break;

      case V1_RAIN_SENSOR_DATA_POINTS.illuminance_average_20min:
        this.log('Received illuminance (20 min avg.):', parsedValue);
        this.setCapabilityValue('measure_luminance.20min', parsedValue).catch(this.error);
        break;

      case V1_RAIN_SENSOR_DATA_POINTS.illuminance_maximum_today:
        this.log('Received illuminance (max. today):', parsedValue);
        this.setCapabilityValue('measure_luminance.daily_max', parsedValue).catch(this.error);
        break;

      case V1_RAIN_SENSOR_DATA_POINTS.cleaning_reminder:
        this.log('Received cleaning reminder:', parsedValue);
        this.setCapabilityValue('alarm_cleaning', parsedValue !== 0).catch(this.error);
        break;

      case V1_RAIN_SENSOR_DATA_POINTS.rain_intensity:
        this.log('Received rain intensity:', parsedValue);
        this.setCapabilityValue('measure_voltage.rain', parsedValue / 1000).catch(this.error);
        break;

      default:
        this.log('Unhandled DP:', dp, 'with value:', parsedValue);
    }
  }

  onDeleted() {
    this.log("Rain sensor removed")
  }

}

module.exports = RainSensor;
