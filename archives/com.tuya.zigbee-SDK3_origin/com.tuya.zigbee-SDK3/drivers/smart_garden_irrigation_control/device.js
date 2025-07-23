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
  
    await this.configureAttributeReporting([
      {
          endpointId: 1,
          cluster: CLUSTER.POWER_CONFIGURATION,
          attributeName: 'batteryPercentageRemaining',
          minInterval: 60, // Minimum interval (1 minute)
          maxInterval: 21600, // Maximum interval (6 hours)
          minChange: 1, // Report changes greater than 1%
      }
    ]);

    zclNode.endpoints[1].clusters[CLUSTER.POWER_CONFIGURATION].on('report', (report) => {
      if (report.batteryPercentageRemaining !== undefined) {
        const batteryPercentage = report.batteryPercentageRemaining / 2; // Convert to percentage
        const batteryThreshold = this.getSetting('batteryThreshold') || 20;
        this.log('Battery percentage received:', batteryPercentage);

        this.setCapabilityValue('measure_battery', batteryPercentage).catch((err) => {
          this.error('Failed to update battery level', err);
        });

        this.setCapabilityValue('alarm_battery', (batteryPercentageRemaining/2 < batteryThreshold) ? true : false).catch(this.error);

      }
    });

  }

  async onDeleted() {
    this.log('Smart irrigation controller removed');
  }

  onUninit() {
    if (this._onOffTimeout) {
      this.homey.clearTimeout(this._onOffTimeout);
    }
  }

}

module.exports = IrrigationController;
