'use strict';

const { ZigBeeDevice } = require('homey-zigbeedriver');
const { debug, CLUSTER } = require('zigbee-clusters');

class wall_remote_2_gang extends ZigBeeDevice {

    async onNodeInit({zclNode}) {

        var debounce = 0;
        // debug(true);
        this.printNode();

        const node = await this.homey.zigbee.getNode(this);
        node.handleFrame = (endpointId, clusterId, frame, meta) => {
          if (clusterId === 6) {
            this.log("endpointId:", endpointId,", clusterId:", clusterId,", frame:", frame, ", meta:", meta);
            this.log("Frame JSON data:", frame.toJSON());
            debounce = debounce+1;
            if (debounce===1){
              this.buttonCommandParser(endpointId, frame);
            } else {
              debounce=0;
            }
          }
        };
  
        this._buttonPressedTriggerDevice = this.homey.flow.getDeviceTriggerCard('wall_remote_2_gang_buttons')
        .registerRunListener(async (args, state) => {
          return (null, args.action === state.action);
        });
      
    }

    buttonCommandParser(ep, frame) {
      var button = ep === 1 ? 'left' : 'right';
      var action = frame[3] === 0 ? 'oneClick' : frame[3] === 1 ? 'twoClicks' : 'longPress';
      return this._buttonPressedTriggerDevice.trigger(this, {}, { action: `${button}-${action}` })
      .then(() => this.log(`Triggered 2 Gang Smart Switch, action=${button}-${action}`))
      .catch(err => this.error('Error triggering 2 Gang Smart Switch', err));
    }

    onDeleted(){
		this.log("2 Gang Wall Remote removed")
	}

}

module.exports = wall_remote_2_gang;