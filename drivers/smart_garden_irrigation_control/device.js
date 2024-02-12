'use strict';

const Homey = require('homey');
const { ZigBeeDevice } = require('homey-zigbeedriver');
const { Cluster, debug, CLUSTER } = require('zigbee-clusters');
const TuyaSpecificCluster = require('../../lib/TuyaSpecificCluster');

Cluster.addCluster(TuyaSpecificCluster);

const DEFAULT_ONOFF_DURATION = 1000

class IrrigationController extends ZigBeeDevice {

  async onNodeInit({zclNode}) {

    this.printNode();

    this.registerCapability('onoff', CLUSTER.ON_OFF);

    this.registerCapabilityListener("onoff", async (value, options) => {
      this.log("value " + value);
      this.log("options " + options.duration);
      if (value && options.duration != undefined) {
        await zclNode.endpoints[1].clusters['onOff'].setOn();
        await new Promise(resolve => setTimeout(resolve, options.duration));
        await zclNode.endpoints[1].clusters['onOff'].setOff();
      } else if (value && options.duration === undefined) {
        await zclNode.endpoints[1].clusters['onOff'].setOn();
      } else if (!value && options.duration === undefined) {
        await zclNode.endpoints[1].clusters['onOff'].setOff();
      }
    });
  
    // measure_battery // alarm_battery
		zclNode.endpoints[1].clusters[CLUSTER.POWER_CONFIGURATION.NAME].on('attr.batteryPercentageRemaining', this.onBatteryPercentageRemainingAttributeReport.bind(this));

  }

  onBatteryPercentageRemainingAttributeReport(batteryPercentageRemaining) {
    // Convert the received battery percentage value
    const batteryLevel = batteryPercentageRemaining / 2;
    this.log("measure_battery | Battery Level (%): ", batteryLevel);

    // Get the battery low threshold setting or use default
    const batteryThreshold = this.getSetting('batteryThreshold') || 20;

    // Update the measure_battery capability
    this.setCapabilityValue('measure_battery', batteryLevel).catch(this.error);

    // Update the alarm_battery capability based on the threshold
    this.setCapabilityValue('alarm_battery', batteryLevel < batteryThreshold).catch(this.error);
  }

  async onDeleted() {
    this.log('Smart irrigation controller removed');
  }

}

module.exports = IrrigationController;