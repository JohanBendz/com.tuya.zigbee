'use strict';

const { ZigBeeDevice } = require('homey-zigbeedriver');
// const { CLUSTER } = require('zigbee-clusters');

class wall_remote_1_gang extends ZigBeeDevice {

    async onNodeInit({zclNode}) {

        var debounce = 0;
        this.printNode();

        const node = await this.homey.zigbee.getNode(this);
        node.handleFrame = (endpointId, clusterId, frame, meta) => {
          if (clusterId === 6) {
            this.log("endpointId:", endpointId,", clusterId:", clusterId,", frame:", frame, ", meta:", meta);
            this.log("Frame JSON data:", frame.toJSON());
            frame = frame.toJSON();
            debounce = debounce+1;
            if (debounce===1){
              this.buttonCommandParser(frame);
            } else {
              debounce=0;
            }
          }
        };
  
        this._buttonPressedTriggerDevice = this.homey.flow.getDeviceTriggerCard('wall_remote_1_gang_buttons')
        .registerRunListener(async (args, state) => {
          return (null, args.action === state.action);
        });
      
    }
  
      buttonCommandParser(frame) {
        var action = frame.data[3] === 0 ? 'oneClick' : 'twoClicks';
        return this._buttonPressedTriggerDevice.trigger(this, {}, { action: `${action}` })
        .then(() => this.log(`Triggered 1 Gang Wall Remote, action=${action}`))
        .catch(err => this.error('Error triggering 1 Gang Wall Remote', err));
      }


    onDeleted(){
		this.log("1 Gang Wall Remote removed")
	}

}

module.exports = wall_remote_1_gang;