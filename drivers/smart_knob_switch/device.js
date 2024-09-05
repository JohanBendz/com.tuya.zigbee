'use strict';

const { ZigBeeDevice } = require('homey-zigbeedriver');
// const { CLUSTER } = require('zigbee-clusters');

class smart_knob_switch extends ZigBeeDevice {

    async onNodeInit({zclNode}) {

      var debounce = 0;
      this.printNode();

      const node = await this.homey.zigbee.getNode(this);
      
      node.handleFrame = (endpointId, clusterId, frame, meta) => {
        this._buttonPressedTriggerDevice = this.homey.flow.getDeviceTriggerCard('smart_knob_switch_button')
        .registerRunListener(async (args, state) => {
          this.log("FLOW - args:", args, ", state:", state);
          return (null, args.button === state.button);
        });

        if ([8, 6, 768].includes(clusterId)) {
          //this.log("endpointId:", endpointId,", clusterId:", clusterId,", frame:", frame, ", meta:", meta);
          frame = frame.toJSON();
          this.log("Frame JSON data:", frame);
          this.buttonCommandParser(clusterId, frame);
        } else {
          this.log("[Uknown] endpointId:", endpointId,", clusterId:", clusterId,", frame:", frame, ", meta:", meta);
          this.log("[--]Frame JSON data:", frame.toJSON)
        }
      };




    
    }


    buttonCommandParser(cl, frame) {
      const duration = frame.data[4] ?? false;
      var btn = 'unknown'

      switch (cl){
        case 8: btn = frame.data[3] === 1 ? 'left' : 'right'; break; // Scroll
        case 768: btn = `hold-${frame.data[3] === 3 ? 'left' : 'right'}`; break; // Holding
        case 6: 
        default: btn = 'press'; break; // Button
      };

    
      this.log('Processed action: ', btn === false ? 'unknown' : btn);
      
     return this._buttonPressedTriggerDevice.trigger(this, {}, { button: `${btn}` })
        .then(() => this.log(`Triggered Smart Knob Switch, button=${btn}`, duration !== false ? `duration=${duration}` : ''))
        .catch(err => this.error('Error triggering Smart Knob Switch', err));
    }

    onDeleted(){
		this.log("Smart Knob Switch removed")
	}

}

module.exports = smart_knob_switch;




  