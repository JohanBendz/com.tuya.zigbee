'use strict';

const { ZigBeeDevice } = require('homey-zigbeedriver');

const actions = ['oneClick', 'twoClicks', 'longPress'];

function getButtonAction(frame) {
  const data = Buffer.isBuffer(frame)
    ? frame
    : frame?.type === 'Buffer' && Array.isArray(frame.data) ? frame.data : null;

  // #1026 captures contain a standard three-byte ZCL header and one action
  // byte. The following OnOff command is a separate frame, not another gesture.
  if (!data || data.length !== 4) return null;
  for (let i = 0; i < data.length; i++) {
    if (!Number.isInteger(data[i]) || data[i] < 0 || data[i] > 255) return null;
  }
  // Cluster-specific, no manufacturer header, Tuya action command 0xFD.
  if ((data[0] & 0x07) !== 0x01 || data[2] !== 0xfd) return null;
  return actions[data[3]] || null;
}

class smart_remote_1b_2 extends ZigBeeDevice {
  async onNodeInit() {
    const node = await this.homey.zigbee.getNode(this);
    this._restoreFrameHandler();
    const originalHandleFrame = node.handleFrame;

    this._frameNode = node;
    this._originalHandleFrame = originalHandleFrame;
    this._frameHandler = (endpointId, clusterId, frame, meta) => {
      if (endpointId === 1 && clusterId === 6) {
        const handled = this.buttonCommandParser(frame);
        if (handled !== null) return handled;
      }
      // Keep normal ZCL dispatch for reports, standard follow-ups and all
      // unrelated traffic. Never replace the SDK's handler for those frames.
      if (typeof originalHandleFrame === 'function') {
        return originalHandleFrame.call(node, endpointId, clusterId, frame, meta);
      }
    };
    node.handleFrame = this._frameHandler;
  }

  buttonCommandParser(frame) {
    const action = getButtonAction(frame);
    if (action === null) return null;
    return this.driver.buttonTrigger.trigger(this, {}, { action })
      .then(() => this.log(`Triggered 1 button Smart Remote, action=${action}`))
      .catch(err => this.error('Error triggering 1 button Smart Remote', err));
  }

  _restoreFrameHandler() {
    if (this._frameNode && this._frameNode.handleFrame === this._frameHandler) {
      this._frameNode.handleFrame = this._originalHandleFrame;
    }
    this._frameNode = null;
    this._originalHandleFrame = null;
    this._frameHandler = null;
  }

  onDeleted() {
    this._restoreFrameHandler();
    this.log('1 button Smart Remote Controller has been removed');
    return super.onDeleted();
  }
}

module.exports = smart_remote_1b_2;
