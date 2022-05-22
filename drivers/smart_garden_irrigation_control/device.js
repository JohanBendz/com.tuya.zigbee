'use strict';

const Homey = require('homey');
const { ZigBeeDevice } = require('homey-zigbeedriver');
const { debug, CLUSTER } = require('zigbee-clusters');
//const DeviceApi = require('device-api');

const DEFAULT_ONOFF_DURATION = 1000

class IrrigationController extends ZigBeeDevice {

  async onNodeInit({zclNode}) {

    this.printNode();

    this.registerCapability('onoff', CLUSTER.ON_OFF);
    this.registerCapabilityListener("onoff", async (value, options) =>{
      this.log("value "+value);
      this.log("options "+options.duration);
      await zclNode.endpoints[1].clusters['onOff'].toggle();
      await new Promise(resolve => setTimeout(resolve, options.duration));
      await zclNode.endpoints[1].clusters['onOff'].toggle();
    });
    // measure_battery // alarm_battery
		zclNode.endpoints[1].clusters[CLUSTER.POWER_CONFIGURATION.NAME].on('attr.batteryPercentageRemaining', this.onBatteryPercentageRemainingAttributeReport.bind(this));

  }

  async onDeleted() {
    this.log('Smart irrigation controller removed');
  }

  onBatteryPercentageRemainingAttributeReport(batteryPercentageRemaining) {
		const batteryThreshold = this.getSetting('batteryThreshold') || 20;
		this.log("measure_battery | powerConfiguration - batteryPercentageRemaining (%): ", batteryPercentageRemaining/2);
		this.setCapabilityValue('measure_battery', batteryPercentageRemaining/2);
		this.setCapabilityValue('alarm_battery', (batteryPercentageRemaining/2 < batteryThreshold) ? true : false)
	}

}

module.exports = IrrigationController;
