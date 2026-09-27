'use strict';

const { ZigBeeDevice } = require('homey-zigbeedriver');
// const { CLUSTER } = require('zigbee-clusters');

class wall_remote_3_gang extends ZigBeeDevice {

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
              this.buttonCommandParser(endpointId, frame);
            } else {
              debounce=0;
            }
          }
        };
      
    }
  
      buttonCommandParser(ep, frame) {
        var button = ep === 1 ? 'left' : ep === 3 ? 'right' : 'center';
        var action = frame.data[3] === 0 ? 'oneClick' : 'twoClicks';
        return this.driver.buttonTrigger.trigger(this, {}, { action: `${button}-${action}` })
        .then(() => this.log(`Triggered Wall Remote 3 Gang, action=${button}-${action}`))
        .catch(err => this.error('Error triggering Wall Remote 3 Gang', err));
      }


    onDeleted(){
		this.log("3 Gang Wall Remote removed")
	}

}

module.exports = wall_remote_3_gang;


