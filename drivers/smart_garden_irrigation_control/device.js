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
      this.log("value "+value);
      this.log("options "+options.duration);
      if (value && options.duration != undefined ){
        await zclNode.endpoints[1].clusters['onOff'].setOn();
        this._onOffTimeout = this.homey.setTimeout(async () => {
          await zclNode.endpoints[1].clusters['onOff'].setOff();
        }, options.duration);
      } else if(value && options.duration === undefined){
        await zclNode.endpoints[1].clusters['onOff'].setOn();
      } else if(!value && options.duration === undefined){
        await zclNode.endpoints[1].clusters['onOff'].setOff();
      }
    });
  
    // measure_battery // alarm_battery
		zclNode.endpoints[1].clusters[CLUSTER.POWER_CONFIGURATION.NAME].on('attr.batteryPercentageRemaining', this.onBatteryPercentageRemainingAttributeReport.bind(this));

  }

  async onDeleted() {
    this.log('Smart irrigation controller removed');
  }

  onUninit() {
    if (this._onOffTimeout) {
      this.homey.clearTimeout(this._onOffTimeout);
    }
  }

  onBatteryPercentageRemainingAttributeReport(batteryPercentageRemaining) {
		const batteryThreshold = this.getSetting('batteryThreshold') || 20;
		this.log("measure_battery | powerConfiguration - batteryPercentageRemaining (%): ", batteryPercentageRemaining/2);
		this.setCapabilityValue('measure_battery', batteryPercentageRemaining/2).catch(this.error);
		this.setCapabilityValue('alarm_battery', (batteryPercentageRemaining/2 < batteryThreshold) ? true : false).catch(this.error);
	}

}

module.exports = IrrigationController;
