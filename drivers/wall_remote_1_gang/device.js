'use strict';

const { ZigBeeDevice } = require('homey-zigbeedriver');
const { CLUSTER } = require('zigbee-clusters');
const OnOffBoundCluster = require('../../lib/OnOffBoundCluster');

class wall_remote_1_gang extends ZigBeeDevice {

    async onNodeInit({zclNode}) {

        this.printNode();

        zclNode.endpoints[1].bind(CLUSTER.ON_OFF.NAME, new OnOffBoundCluster({
            onToggle: this._toggleCommandParser.bind(this),
            onSetOn: this._onCommandParser.bind(this),
            onSetOff: this._offCommandParser.bind(this),
            onWithTimedOff: this._onWithTimedOffCommandParser.bind(this),
            offWithEffect: this._offWithEffectCommandParser.bind(this)
        }));

        this._buttonPressedTriggerDevice = this.homey.flow.getDeviceTriggerCard('wall_remote_1_gang_buttons')
        .registerRunListener(async (args, state) => {
            return (null, args.action === state.action);
          });
 
        // alarm_battery
        if (this.hasCapability('alarm_battery')) {				
            this.batteryThreshold = 20;
            this.registerCapability('alarm_battery', CLUSTER.POWER_CONFIGURATION, {
                getOpts: {
                },
                endpoints: 1,
                reportOpts: {
                    configureAttributeReporting: {
                        minInterval: 0, // No minimum reporting interval
                        maxInterval: 60000, // Maximally every ~16 hours
                        minChange: 10, // Report when value changed by 10
                    },
                },
            });
        }


    }

    _leftToggleCommandParser() {
        let button = 'oneClick';
        this._buttonPressedTriggerDevice.trigger(this, {}, { action: button })
        .then(() => this.log('Wall Remote 1 Gang - button='+button))
        .catch(err => this.error('Error triggering Wall Remote 1 Gang button', err));
    }

    _leftOnCommandParser() {
        let button = 'twoClicks';
        this._buttonPressedTriggerDevice.trigger(this, {}, { action: button })
        .then(() => this.log('Wall Remote 1 Gang - button='+button))
        .catch(err => this.error('Error triggering Wall Remote 1 Gang button', err));
    }

    _leftOffCommandParser() {
        let button = 'longPress';
        this._buttonPressedTriggerDevice.trigger(this, {}, { action: button })
        .then(() => this.log('Wall Remote 1 Gang - button='+button))
        .catch(err => this.error('Error triggering Wall Remote 1 Gang button', err));
    }

    _leftOnWithTimedOffCommandParser() {
        let button = 'shortRelease';
        this._buttonPressedTriggerDevice.trigger(this, {}, { action: button })
        .then(() => this.log('Wall Remote 1 Gang - button='+button))
        .catch(err => this.error('Error triggering Wall Remote 1 Gang button', err));
    }

    _leftOffWithEffectCommandParser() {
        let button = 'longRelease';
        this._buttonPressedTriggerDevice.trigger(this, {}, { action: button })
        .then(() => this.log('Wall Remote 1 Gang - button='+button))
        .catch(err => this.error('Error triggering Wall Remote 1 Gang button', err));
    }

    onDeleted(){
		this.log("1 Gang Wall Remote removed")
	}

}

module.exports = wall_remote_1_gang;