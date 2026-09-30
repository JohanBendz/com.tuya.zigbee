'use strict';

const { ZigBeeDevice } = require('homey-zigbeedriver');
const { CLUSTER, Cluster } = require('zigbee-clusters');
const TuyaOnOffCluster = require('../../lib/TuyaOnOffCluster');
const TuyaRemoteOnOffBoundCluster = require('../../lib/TuyaRemoteOnOffBoundCluster');

Cluster.addCluster(TuyaOnOffCluster);

class SmartRemoteOneButton extends ZigBeeDevice {

  async onNodeInit({ zclNode }) {
    let manufacturerName = zclNode.endpoints[1].clusters.basic?.attributes?.manufacturerName;

    if (!manufacturerName) {
      try {
        ({ manufacturerName } = await zclNode.endpoints[1].clusters.basic.readAttributes(['manufacturerName']));
      } catch (error) {
        this.error('Failed to read remote manufacturerName', error);
      }
    }

    // The Silvercrest HG08164 supports Tuya operation mode:
    // 0 = command mode, 1 = event mode. Event mode emits 0xFD tuyaAction
    // with value 0/1/2 for single/double/hold.
    if (
      manufacturerName === '_TZ3000_rco1yzb1'
      && this.getStoreValue('tuya_event_mode_configured') !== true
    ) {
      try {
        await zclNode.endpoints[1].clusters.onOff.writeAttributes({
          tuyaOperationMode: 1,
        });
        await this.setStoreValue('tuya_event_mode_configured', true);
        this.log('Configured Silvercrest smart button for Tuya event mode');
      } catch (error) {
        this.error('Failed to configure Tuya event mode; command-mode fallback remains active', error);
      }
    }

    zclNode.endpoints[1].bind(
      CLUSTER.ON_OFF.NAME,
      new TuyaRemoteOnOffBoundCluster({
        onSingle: source => this.triggerAction('oneClick', source),
        onDouble: source => this.triggerAction('twoClicks', source),
        onHold: source => this.log('Hold action received but no Homey Flow option is defined yet', source),
      })
    );

    await this.configureAttributeReporting([{
      endpointId: 1,
      cluster: CLUSTER.POWER_CONFIGURATION,
      attributeName: 'batteryPercentageRemaining',
      minInterval: 60,
      maxInterval: 21600,
      minChange: 1,
    }]).catch(error => {
      this.error('Failed to configure smart-button battery reporting', error);
    });

    zclNode.endpoints[1].clusters[CLUSTER.POWER_CONFIGURATION.NAME]
      .on('attr.batteryPercentageRemaining', batteryPercentageRemaining => {
        const batteryPercentage = batteryPercentageRemaining / 2;
        this.log('Battery percentage received:', batteryPercentage);
        this.setCapabilityValue('measure_battery', batteryPercentage).catch(this.error);
      });
  }

  triggerAction(action, source) {
    const now = Date.now();

    // A few firmwares can emit both a standard OnOff command and a Tuya
    // action for the same physical click. Suppress exact duplicates only.
    if (
      this._lastAction === action
      && this._lastActionAt
      && now - this._lastActionAt < 250
    ) {
      this.log('Ignoring duplicate remote action:', action, source);
      return Promise.resolve();
    }

    this._lastAction = action;
    this._lastActionAt = now;

    return this.driver.buttonTrigger
      .trigger(this, {}, { action })
      .then(() => this.log('Triggered 1 button Smart Remote:', action, 'source:', source))
      .catch(error => this.error('Error triggering 1 button Smart Remote', error));
  }

  onDeleted() {
    this.log('1 button Smart Remote Controller has been removed');
  }

}

module.exports = SmartRemoteOneButton;
