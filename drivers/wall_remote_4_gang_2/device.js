'use strict';

const { ZigBeeDevice } = require('homey-zigbeedriver');
// const { CLUSTER } = require('zigbee-clusters');

class wall_remote_4_gang_2 extends ZigBeeDevice {

    async onNodeInit({ zclNode }) {
      let manufacturerName = zclNode.endpoints[1].clusters.basic?.attributes?.manufacturerName;

      if (!manufacturerName) {
        try {
          ({ manufacturerName } = await zclNode.endpoints[1].clusters.basic.readAttributes(['manufacturerName']));
        } catch (error) {
          this.error('Failed to read 4-gang TS004F manufacturerName', error);
        }
      }

      this.useXabckq1vButtonMap = manufacturerName === '_TZ3000_xabckq1v';

      const node = await this.homey.zigbee.getNode(this);
      node.handleFrame = (endpointId, clusterId, frame) => {
        if (clusterId === 6 || clusterId === 8) {
          this.buttonCommandParser(clusterId, frame.toJSON());
        }
      };
    }

    buttonCommandParser(cl, frame) {
      const side = cl === 6 ? 'left' : 'right';
      let button = frame.data[2] === 0
        ? `${side}Down`
        : frame.data[2] === 1
          ? `${side}Up`
          : frame.data[3] === 1
            ? `${side}Down`
            : `${side}Up`;

      if (this.useXabckq1vButtonMap) {
        const correctedButtons = {
          leftDown: 'leftUp',
          rightDown: 'rightUp',
          rightUp: 'leftDown',
          leftUp: 'rightDown',
        };

        button = correctedButtons[button] || button;
      }

      return this.driver.buttonTrigger.trigger(this, {}, { button })
        .then(() => this.log(`Triggered 4 Gang Wall Remote, button=${button}`))
        .catch(err => this.error('Error triggering 4 Gang Wall Remote', err));
    }

    onDeleted(){
		this.log("4 Gang Wall Remote removed")
	}

}

module.exports = wall_remote_4_gang_2;




  