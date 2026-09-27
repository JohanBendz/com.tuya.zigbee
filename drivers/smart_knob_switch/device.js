'use strict';

const { ZigBeeDevice } = require('homey-zigbeedriver');
// const { CLUSTER } = require('zigbee-clusters');

class smart_knob_switch extends ZigBeeDevice {

  async onNodeInit({ zclNode }) {

    var debounce = 0;
    if (!this.hasCapability('dim')) {
      await this.addCapability('dim');
    }

    const node = await this.homey.zigbee.getNode(this);

    node.handleFrame = (endpointId, clusterId, frame, meta) => {
      if ([8, 6, 768].includes(clusterId)) {
        frame = frame.toJSON();
        this.buttonCommandParser(clusterId, frame);
      } else {
      }
    };
  }


  buttonCommandParser(cl, frame) {
    const duration = frame.data[4] ?? false;
    var btn = 'unknown'
    var left = false;

    switch (cl) {
      case 8: left = frame.data[3] == 1; btn = left ? 'left' : 'right'; break; // Scroll
      case 768: left = frame.data[3] === 3; btn = `hold-${left ? 'left' : 'right'}`; break; // Holding
      case 6:
      default: btn = 'press'; break; // Button
    };

    this.log('Processed action: ', btn === false ? 'unknown' : btn);

    if (duration !== false) {
      this.setCapabilityValue('dim', duration/500).catch(this.error);
      this.log('Dimming to: ', duration/500);
    }

    return this.driver.buttonTrigger.trigger(this, {}, { button: `${btn}` })
      .then(() => this.log(`Triggered Smart Knob Switch, button=${btn}`, duration !== false ? `duration=${duration}` : ''))
      .catch(err => this.error('Error triggering Smart Knob Switch', err));
  }

  onDeleted() {
    this.log("Smart Knob Switch removed")
  }

}

module.exports = smart_knob_switch;