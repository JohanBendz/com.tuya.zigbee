'use strict';

const { Cluster } = require('zigbee-clusters');
const TuyaRelayInputCluster = require('./TuyaRelayInputCluster');

Cluster.addCluster(TuyaRelayInputCluster);
const MODES = new Set(['toggle', 'state', 'momentary']);

function withInputType(BaseDevice, channels) {
  return class TuyaRelayModule extends BaseDevice {
    async onNodeInit(args) {
      const session = {};
      this._inputModeSession = session;
      await super.onNodeInit(args);
      if (this.isSubDevice()) return;
      try {
        const clusters = args.zclNode.endpoints[1].clusters;
        const identity = await clusters.basic.readAttributes(['manufacturerName', 'modelId']);
        const allowed = [].concat(this.driver.manifest.zigbee.manufacturerName);
        if (!allowed.includes(identity.manufacturerName) || identity.modelId !== `TS000${channels}`) return;
        session.cluster = clusters.tuyaRelayInput;
        const mode = await this._readInputMode(session);
        this._requireInputCluster(session);
        await this.setSettings({ input_mode: mode });
      } catch (error) {
        // Preserve OnOff operation and saved preferences if optional reads fail.
        this.log('Input type could not be synchronized:', error.message);
      }
    }

    onUninit() {
      this._inputModeSession = null;
      return super.onUninit?.();
    }

    onDeleted() {
      this._inputModeSession = null;
      return super.onDeleted?.();
    }

    _requireInputCluster(session) {
      if (!session || this._inputModeSession !== session) throw new Error('Relay module connection has changed.');
      if (!session.cluster) throw new Error('Input type requires a matching relay-module identity and a reachable configuration cluster.');
      return session.cluster;
    }

    async _readInputMode(session) {
      const result = await this._requireInputCluster(session).readAttributes(['switchType']);
      this._requireInputCluster(session);
      if (!MODES.has(result.switchType)) throw new Error('Device did not return a supported input type.');
      return result.switchType;
    }

    async onSettings({ newSettings, changedKeys }) {
      if (!changedKeys.includes('input_mode')) return;
      const requested = newSettings.input_mode;
      if (requested === 'keep') return;
      if (!MODES.has(requested)) throw new Error('Unsupported input type.');
      if (this.isSubDevice()) throw new Error('Change the shared input type on Relay 1.');
      // Serialize settings requests so read/write/readback/rollback cannot overlap.
      const session = this._inputModeSession;
      const apply = async () => {
        const previous = await this._readInputMode(session);
        if (previous === requested) return;
        try {
          await this._requireInputCluster(session).writeAttributes({ switchType: requested });
          if (await this._readInputMode(session) !== requested) throw new Error('Input type readback did not match.');
        } catch (error) {
          this._requireInputCluster(session);
          try {
            await this._requireInputCluster(session).writeAttributes({ switchType: previous });
            if (await this._readInputMode(session) !== previous) throw new Error('Restore readback did not match.');
          } catch (restoreError) {
            throw new Error(`Input type update failed; previous mode could not be confirmed. Refresh the device before retrying. ${error.message} ${restoreError.message}`);
          }
          throw new Error(`Input type update failed; previous mode restored. ${error.message}`);
        }
      };
      const result = (this._inputModeQueue || Promise.resolve()).then(apply);
      this._inputModeQueue = result.catch(() => {});
      return result;
    }
  };
}

module.exports = withInputType;
