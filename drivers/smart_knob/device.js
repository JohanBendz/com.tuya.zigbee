'use strict';

const { ZigBeeDevice } = require('homey-zigbeedriver');
const { CLUSTER } = require('zigbee-clusters');

class smart_knob extends ZigBeeDevice {

    async onNodeInit({zclNode}) {

      this.printNode();

  		if (this.isFirstInit()){
  			await this.configureAttributeReporting([
  				{
  					endpointId: 1,
  					cluster: CLUSTER.POWER_CONFIGURATION,
  					attributeName: 'batteryPercentageRemaining',
  					minInterval: 65535,
  					maxInterval: 0,
  					minChange: 1,
  				}
  			]);
  		}

      // measure_battery // alarm_battery
      zclNode.endpoints[1].clusters[CLUSTER.POWER_CONFIGURATION.NAME]
      .on('attr.batteryPercentageRemaining', this.onBatteryPercentageRemainingAttributeReport.bind(this));

      var debounce = 0;
      const node = await this.homey.zigbee.getNode(this);
      node.handleFrame = (endpointId, clusterId, frame, meta) => {
        if (clusterId === 6) {
          this.buttonCommandParser();
        }

        if (clusterId === 768) {
          debounce = debounce+1;
          if (debounce===1){
            this.buttonLongCommandParser();
          }
        } else {
          debounce=0;
        }

        if (clusterId === 8) {
          this.turnCommandParser(frame);
        }

        if (clusterId !== 6 && clusterId !== 8 && clusterId !== 768) {
          this.log("endpointId:", endpointId,", clusterId:", clusterId,", frame:", frame, ", meta:", meta);
          this.log("Frame JSON data:", frame.toJSON());
        }
      };

      this._buttonPressedTriggerDevice = this.homey.flow.getDeviceTriggerCard('smart_knob')
      .registerRunListener(async (args, state) => {
        return (null, args.action === state.action);
      });
    }

    buttonCommandParser() {
      var action = 'oneClick';
      return this._buttonPressedTriggerDevice.trigger(this, {}, { action: `${action}` })
      .then(() => this.log(`Triggered Smart Knob, action=${action}`))
      .catch(err => this.error('Error triggering Smart Knob', err));
    }

    buttonLongCommandParser() {
      var action = 'longClick';
      return this._buttonPressedTriggerDevice.trigger(this, {}, { action: `${action}` })
      .then(() => this.log(`Triggered Smart Knob, action=${action}`))
      .catch(err => this.error('Error triggering Smart Knob', err));
    }

    turnCommandParser(frame) {
      var action = frame[3] === 0 ? 'turnRight' : 'turnLeft';
      return this._buttonPressedTriggerDevice.trigger(this, {}, { action: `${action}` })
      .then(() => this.log(`Triggered Smart Knob, action=${action}`))
      .catch(err => this.error('Error triggering Smart Knob', err));
    }

    onBatteryPercentageRemainingAttributeReport(batteryPercentageRemaining) {
    	const batteryThreshold = this.getSetting('batteryThreshold') || 20;
    	this.log("measure_battery | powerConfiguration - batteryPercentageRemaining (%): ", batteryPercentageRemaining/2);
    	this.setCapabilityValue('measure_battery', batteryPercentageRemaining/2);
    	this.setCapabilityValue('alarm_battery', (batteryPercentageRemaining/2 < batteryThreshold) ? true : false)
    }

    onDeleted(){
		this.log("Smart Knob removed")
	}

}

module.exports = smart_knob;
