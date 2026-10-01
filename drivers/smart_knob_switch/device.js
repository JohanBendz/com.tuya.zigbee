'use strict';

const { ZigBeeDevice } = require('homey-zigbeedriver');
const { CLUSTER } = require('zigbee-clusters');
const TuyaRemoteOnOffBoundCluster = require('../../lib/TuyaRemoteOnOffBoundCluster');
const LevelControlBoundCluster = require('../../lib/LevelControlBoundCluster');

class SmartKnobSwitch extends ZigBeeDevice {

  async onNodeInit({ zclNode }) {
    // Keep the legacy dim capability for installed devices/Flows for now.
    // The knob is a remote; rotation is emitted as Flow trigger events.
    if (!this.hasCapability('dim')) {
      await this.addCapability('dim');
    }

    const triggerPress = source => this.triggerButton('press', source);
    const triggerRotation = (payload, source) => {
      const mode = payload?.mode;
      const button = mode === 'down' ? 'left' : 'right';
      return this.triggerButton(button, source);
    };

    zclNode.endpoints[1].bind(
      CLUSTER.ON_OFF.NAME,
      new TuyaRemoteOnOffBoundCluster({
        onSingle: triggerPress,
        onDouble: triggerPress,
        onHold: triggerPress,
      })
    );

    zclNode.endpoints[1].bind(
      CLUSTER.LEVEL_CONTROL.NAME,
      new LevelControlBoundCluster({
        onStep: payload => triggerRotation(payload, 'step'),
        onStepWithOnOff: payload => triggerRotation(payload, 'stepWithOnOff'),
        onMove: payload => triggerRotation(payload, 'move'),
        onMoveWithOnOff: payload => triggerRotation(payload, 'moveWithOnOff'),
        onStop: () => this.log('Smart Knob level-control stop'),
        onStopWithOnOff: () => this.log('Smart Knob level-control stopWithOnOff'),
      })
    );

    // Keep the legacy Color Control frame parsing isolated to cluster 0x0300.
    // We do not have enough physical frame evidence yet to replace the
    // hold-left/hold-right interpretation safely.
    const node = await this.homey.zigbee.getNode(this);
    node.handleFrame = (endpointId, clusterId, frame) => {
      if (clusterId !== CLUSTER.COLOR_CONTROL.ID) return;

      const parsedFrame = frame.toJSON();
      const left = parsedFrame.data?.[3] === 3;
      const button = `hold-${left ? 'left' : 'right'}`;
      this.triggerButton(button, 'colorControlLegacy');
    };
  }

  triggerButton(button, source) {
    const now = Date.now();

    // A physical press should be one toggle event. Suppress only identical
    // press duplicates arriving in a very short window; never debounce
    // rotation because each step can represent real knob movement.
    if (
      button === 'press'
      && this._lastPressAt
      && now - this._lastPressAt < 250
    ) {
      this.log('Ignoring duplicate Smart Knob press:', source);
      return Promise.resolve();
    }

    if (button === 'press') {
      this._lastPressAt = now;
    }

    this.log('Processed Smart Knob action:', button, 'source:', source);

    return this.driver.buttonTrigger
      .trigger(this, {}, { button })
      .then(() => this.log('Triggered Smart Knob Switch:', button, 'source:', source))
      .catch(error => this.error('Error triggering Smart Knob Switch', error));
  }

  onDeleted() {
    this.log('Smart Knob Switch removed');
  }

}

module.exports = SmartKnobSwitch;
