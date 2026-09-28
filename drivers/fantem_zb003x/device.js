'use strict';

const { Cluster, CLUSTER } = require('zigbee-clusters');
const TuyaSpecificCluster = require('../../lib/TuyaSpecificCluster');
const TuyaSpecificClusterDevice = require('../../lib/TuyaSpecificClusterDevice');
const { getDataValue } = require('../../lib/TuyaHelpers');

Cluster.addCluster(TuyaSpecificCluster);

const DP_REPORTING_TIME = 102;
const DP_TEMPERATURE = 107;
const DP_HUMIDITY = 108;
const DP_PIR_ENABLE = 109;
const DP_SECONDARY_BATTERY = 110;
const DP_LED_ENABLE = 111;
const DP_REPORTING_ENABLE = 112;

class FantemZB003X extends TuyaSpecificClusterDevice {

  async onNodeInit({ zclNode }) {
    // The exact ZB003-X profile is a hybrid:
    // IAS Zone for motion/tamper, Tuya DPs for temperature/humidity,
    // standard ZCL for illuminance and primary battery.
    zclNode.endpoints[1].clusters[CLUSTER.IAS_ZONE.NAME]
      .onZoneStatusChangeNotification = payload => {
        this.onIASZoneStatusChangeNotification(payload);
      };

    zclNode.endpoints[1].clusters[CLUSTER.POWER_CONFIGURATION.NAME]
      .on('attr.batteryPercentageRemaining', this.onBatteryPercentageRemainingAttributeReport.bind(this));

    // Endpoint 2 exposes standard temperature/humidity clusters on the physical
    // Homey interview. Keep them as a passive fallback; the proven Tuya DPs
    // remain the primary cross-platform source.
    zclNode.endpoints[2].clusters[CLUSTER.TEMPERATURE_MEASUREMENT.NAME]
      .on('attr.measuredValue', this.onTemperatureMeasuredAttributeReport.bind(this));
    zclNode.endpoints[2].clusters[CLUSTER.RELATIVE_HUMIDITY_MEASUREMENT.NAME]
      .on('attr.measuredValue', this.onRelativeHumidityMeasuredAttributeReport.bind(this));

    zclNode.endpoints[3].clusters[CLUSTER.ILLUMINANCE_MEASUREMENT.NAME]
      .on('attr.measuredValue', this.onIlluminanceMeasuredAttributeReport.bind(this));

    const tuyaCluster = zclNode.endpoints[1].clusters.tuya;
    const handleDatapoint = async data => {
      try {
        await this.processDatapoint(data);
      } catch (error) {
        this.error('Failed to process ZB003-X Tuya datapoint', error);
      }
    };

    tuyaCluster.on('reporting', handleDatapoint);
    tuyaCluster.on('response', handleDatapoint);
    tuyaCluster.on('reportingConfiguration', handleDatapoint);

    if (this.isFirstInit()) {
      const reporting = [
        {
          endpointId: 1,
          cluster: CLUSTER.POWER_CONFIGURATION,
          attributeName: 'batteryPercentageRemaining',
          minInterval: 60,
          maxInterval: 21600,
          minChange: 1,
        },
        {
          endpointId: 2,
          cluster: CLUSTER.TEMPERATURE_MEASUREMENT,
          attributeName: 'measuredValue',
          minInterval: 60,
          maxInterval: 3600,
          minChange: 10,
        },
        {
          endpointId: 2,
          cluster: CLUSTER.RELATIVE_HUMIDITY_MEASUREMENT,
          attributeName: 'measuredValue',
          minInterval: 60,
          maxInterval: 3600,
          minChange: 100,
        },
        {
          endpointId: 3,
          cluster: CLUSTER.ILLUMINANCE_MEASUREMENT,
          attributeName: 'measuredValue',
          minInterval: 60,
          maxInterval: 3600,
          minChange: 100,
        },
      ];

      for (const entry of reporting) {
        await this.configureAttributeReporting([entry])
          .catch(error => this.log('Optional ZCL reporting configuration skipped:', error.message));
      }
    }

    // Best effort only. Battery-powered units can be asleep; proactive reports
    // still update every capability if the query is not answered.
    if (typeof tuyaCluster.dataQuery === 'function') {
      tuyaCluster.dataQuery({})
        .catch(error => this.log('Tuya dataQuery skipped/failed:', error.message));
    }
  }

  onIASZoneStatusChangeNotification({ zoneStatus }) {
    // Exact ZB003-X implementations use alarm1 as occupancy even though some
    // firmware revisions advertise IAS zoneType=contactSwitch.
    this.setCapabilityValue('alarm_motion', Boolean(zoneStatus.alarm1)).catch(this.error);
    this.setCapabilityValue('alarm_tamper', Boolean(zoneStatus.tamper)).catch(this.error);

    if (typeof zoneStatus.battery === 'boolean') {
      this.setCapabilityValue('alarm_battery', zoneStatus.battery).catch(this.error);
    }
  }

  onBatteryPercentageRemainingAttributeReport(value) {
    const percentage = Math.max(0, Math.min(100, value / 2));
    this.log('ZB003-X primary battery (%):', percentage);
    this.setCapabilityValue('measure_battery', percentage).catch(this.error);
    this.setCapabilityValue('alarm_battery', percentage < 20).catch(this.error);
  }

  onTemperatureMeasuredAttributeReport(value) {
    const temperature = value / 100;
    this.log('ZB003-X standard-ZCL temperature (°C):', temperature);
    this.setCapabilityValue('measure_temperature', temperature).catch(this.error);
  }

  onRelativeHumidityMeasuredAttributeReport(value) {
    const humidity = value / 100;
    this.log('ZB003-X standard-ZCL humidity (%):', humidity);
    this.setCapabilityValue('measure_humidity', humidity).catch(this.error);
  }

  onIlluminanceMeasuredAttributeReport(value) {
    if (value === 0xffff) return;
    const lux = value === 0 ? 0 : Math.round((10 ** ((value - 1) / 10000)) * 100) / 100;
    this.log('ZB003-X illuminance (lux):', lux);
    this.setCapabilityValue('measure_luminance', lux).catch(this.error);
  }

  async processDatapoint(data) {
    const rawValue = getDataValue(data);

    switch (data.dp) {
      case DP_TEMPERATURE: {
        const unsigned = Number(rawValue);
        const signed = unsigned > 0x7fffffff ? unsigned - 0x100000000 : unsigned;
        const temperature = signed / 10;
        this.log('ZB003-X Tuya temperature (°C):', temperature);
        await this.setCapabilityValue('measure_temperature', temperature);
        return;
      }

      case DP_HUMIDITY: {
        const humidity = Number(rawValue);
        this.log('ZB003-X Tuya humidity (%):', humidity);
        await this.setCapabilityValue('measure_humidity', humidity);
        return;
      }

      case DP_SECONDARY_BATTERY:
        // The device can run on one or two CR123A cells. Homey's single
        // measure_battery capability tracks the primary battery; retain the
        // second cell in logs until physical Homey validation tells us how
        // best to present it without producing a false 0% on single-cell use.
        this.log('ZB003-X secondary battery (%):', Number(rawValue));
        return;

      case DP_REPORTING_TIME:
        this.log('ZB003-X reporting interval (min):', Number(rawValue));
        return;
      case DP_PIR_ENABLE:
        this.log('ZB003-X PIR enabled:', Boolean(rawValue));
        return;
      case DP_LED_ENABLE:
        this.log('ZB003-X LED raw state:', rawValue);
        return;
      case DP_REPORTING_ENABLE:
        this.log('ZB003-X reporting enabled:', Boolean(rawValue));
        return;
      default:
        this.log('Unhandled ZB003-X Tuya datapoint:', data.dp, 'value=', rawValue);
    }
  }

  onDeleted() {
    this.log('Fantem ZB003-X removed');
  }

}

module.exports = FantemZB003X;
