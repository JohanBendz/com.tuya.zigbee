'use strict';

const { ZigBeeDevice } = require('homey-zigbeedriver');
// const { CLUSTER } = require('zigbee-clusters');

class wall_remote_4_gang_2 extends ZigBeeDevice {

    async onNodeInit({zclNode}) {

      var debounce = 0;
      this.printNode();

      const node = await this.homey.zigbee.getNode(this);
      node.handleFrame = (endpointId, clusterId, frame, meta) => {
        if (clusterId === 6 || clusterId === 8) {
          this.log("endpointId:", endpointId,", clusterId:", clusterId,", frame:", frame, ", meta:", meta);
          this.log("Frame JSON data:", frame.toJSON());
          frame = frame.toJSON();
          this.buttonCommandParser(clusterId, frame);
        }
      };

      this._buttonPressedTriggerDevice = this.homey.flow.getDeviceTriggerCard('wall_remote_4_gang_buttons_2')
      .registerRunListener(async (args, state) => {
        return (null, args.button === state.button);
      });
    
    }

    buttonCommandParser(cl, frame) {
      var side = cl === 6 ? 'left' : 'right';
      var button = frame.data[2] === 0 ? side+'Down' : frame.data[2] === 1 ? side+'Up' : frame.data[3] === 1 ? side+'Down' : side+'Up';
      return this._buttonPressedTriggerDevice.trigger(this, {}, { button: `${button}` })
      .then(() => this.log(`Triggered 4 Gang Wall Remote, button=${button}`))
      .catch(err => this.error('Error triggering 4 Gang Wall Remote', err));
    }

    onDeleted(){
		this.log("4 Gang Wall Remote removed")
	}

}

module.exports = wall_remote_4_gang_2;




  