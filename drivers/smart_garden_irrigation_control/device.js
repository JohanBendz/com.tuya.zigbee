'use strict';

const Homey = require('homey');
const { ZigBeeDevice } = require('homey-zigbeedriver');
const { debug, CLUSTER } = require('zigbee-clusters');

class IrrigationController extends ZigBeeDevice {

  async onNodeInit({zclNode}) {

    this.printNode();

    this.registerCapability('onoff', CLUSTER.ON_OFF);
  
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
