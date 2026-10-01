'use strict';

const { Cluster, CLUSTER } = require('zigbee-clusters');
const TuyaSpecificCluster = require('../../lib/TuyaSpecificCluster');
const TuyaSpecificClusterDevice = require('../../lib/TuyaSpecificClusterDevice');
const { getDataValue } = require('../../lib/TuyaHelpers');

Cluster.addCluster(TuyaSpecificCluster);

const DP_ACTION = 101;
const DP_LIGHT = 102;
const ACTIONS = new Map([
  [0, 'single'],
  [1, 'double'],
  [2, 'hold'],
]);
const DUPLICATE_ACTION_WINDOW_MS = 5000;

class MotionSceneSwitch extends TuyaSpecificClusterDevice {

  async onNodeInit({ zclNode }) {
    if (this.isFirstInit()) {
      await this.configureAttributeReporting([
        {
          endpointId: 1,
          cluster: CLUSTER.POWER_CONFIGURATION,
          attributeName: 'batteryPercentageRemaining',
          minInterval: 60,
          maxInterval: 21600,
          minChange: 1,
        },
      ]).catch(this.error);
    }

    zclNode.endpoints[1].clusters[CLUSTER.IAS_ZONE.NAME]
      .onZoneStatusChangeNotification = payload => {
        this.onIASZoneStatusChangeNotification(payload);
      };

    zclNode.endpoints[1].clusters[CLUSTER.POWER_CONFIGURATION.NAME]
      .on('attr.batteryPercentageRemaining', this.onBatteryPercentageRemainingAttributeReport.bind(this));

    const tuyaCluster = zclNode.endpoints[1].clusters.tuya;
    const handleDatapoint = async data => {
      try {
        await this.processDatapoint(data);
      } catch (error) {
        this.error('Failed to process Tuya datapoint', error);
      }
    };

    tuyaCluster.on('reporting', handleDatapoint);
    tuyaCluster.on('response', handleDatapoint);
    tuyaCluster.on('reportingConfiguration', handleDatapoint);

    // Best-effort state query. The device is sleepy, so a failure here is harmless;
    // state changes and button actions are still reported proactively.
    if (typeof tuyaCluster.dataQuery === 'function') {
      tuyaCluster.dataQuery({}).catch(error => this.log('Tuya dataQuery skipped/failed:', error.message));
    }
  }

  onIASZoneStatusChangeNotification({ zoneStatus }) {
    this.log('IAS motion status:', zoneStatus.alarm1);
    this.setCapabilityValue('alarm_motion', Boolean(zoneStatus.alarm1)).catch(this.error);

    if (typeof zoneStatus.battery === 'boolean') {
      this.setCapabilityValue('alarm_battery', zoneStatus.battery).catch(this.error);
    }
  }

  onBatteryPercentageRemainingAttributeReport(batteryPercentageRemaining) {
    const batteryPercentage = batteryPercentageRemaining / 2;
    this.log('Battery level (%):', batteryPercentage);
    this.setCapabilityValue('measure_battery', batteryPercentage).catch(this.error);
    this.setCapabilityValue('alarm_battery', batteryPercentage < 20).catch(this.error);
  }

  async processDatapoint(data) {
    const value = getDataValue(data);

    switch (data.dp) {
      case DP_ACTION: {
        const action = ACTIONS.get(Number(value));
        if (!action) {
          this.log('Unknown scene-button action:', value);
          return;
        }

        if (this.isDuplicateAction(data.transid, value)) {
          this.log('Ignoring duplicate scene-button action:', action, 'transid=', data.transid);
          return;
        }

        this.log('Scene-button action:', action, 'transid=', data.transid);
        await this.driver.buttonTrigger.trigger(this, {}, { action });
        return;
      }

      case DP_LIGHT: {
        const numericValue = typeof value === 'boolean' ? (value ? 1 : 0) : Number(value);
        if (numericValue !== 0 && numericValue !== 1) {
          this.log('Unknown light-state value:', value);
          return;
        }

        const lightStatus = numericValue === 0 ? 'dark' : 'bright';
        this.log('Light status:', lightStatus);
        await this.setCapabilityValue('light_status', lightStatus);
        return;
      }

      default:
        this.log('Unhandled Tuya datapoint:', data.dp, 'value=', value);
    }
  }

  isDuplicateAction(transid, value) {
    // Physical captures show each button datapoint can be transmitted twice with
    // the same Tuya transaction id. Only deduplicate when a transaction id exists.
    if (transid === undefined || transid === null) return false;

    const now = Date.now();
    const key = `${transid}:${value}`;
    const previous = this._lastButtonAction;

    this._lastButtonAction = { key, timestamp: now };
    return Boolean(previous
      && previous.key === key
      && (now - previous.timestamp) < DUPLICATE_ACTION_WINDOW_MS);
  }

  onDeleted() {
    this.log('Motion Sensor & Scene Switch removed');
  }

}

module.exports = MotionSceneSwitch;
