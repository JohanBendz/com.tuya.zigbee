'use strict';

const { ZigBeeDevice } = require('homey-zigbeedriver');
const { CLUSTER } = require('zigbee-clusters');
const OnOffBoundCluster = require('../../lib/OnOffBoundCluster');

class wall_remote_2_gang extends ZigBeeDevice {

    async onNodeInit({zclNode}) {

        this.printNode();

        zclNode.endpoints[1].bind(CLUSTER.ON_OFF.NAME, new OnOffBoundCluster({
            onToggle: this._leftToggleCommandParser.bind(this),
            onSetOn: this._leftOnCommandParser.bind(this),
            onSetOff: this._leftOffCommandParser.bind(this),
            onWithTimedOff: this._leftOnWithTimedOffCommandParser.bind(this),
            offWithEffect: this._leftOffWithEffectCommandParser.bind(this)
        }));

        zclNode.endpoints[2].bind(CLUSTER.ON_OFF.NAME, new OnOffBoundCluster({
            onToggle: this._middleToggleCommandParser.bind(this),
            onSetOn: this._middleOnCommandParser.bind(this),
            onSetOff: this._middleOffCommandParser.bind(this),
            onWithTimedOff: this._middleOnWithTimedOffCommandParser.bind(this),
            offWithEffect: this._middleOffWithEffectCommandParser.bind(this)
        }));

        this._buttonPressedTriggerDevice = this.homey.flow.getDeviceTriggerCard('wall_remote_2_gang_buttons')
        .registerRunListener(async (args, state) => {
            return (null, args.action === state.action);
          });
 
        // alarm_battery
        if (this.hasCapability('alarm_battery')) {				
            this.batteryThreshold = 20;
            this.registerCapability('alarm_battery', CLUSTER.POWER_CONFIGURATION, {
                getOpts: {
                },
                endpoints: 2,
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
        let button = 'left-oneClick';
        this._buttonPressedTriggerDevice.trigger(this, {}, { action: button })
        .then(() => this.log('Wall Remote 2 Gang - button='+button))
        .catch(err => this.error('Error triggering Wall Remote 2 Gang button', err));
    }
    _rightToggleCommandParser() {
        let button = 'right-oneClick';
        this._buttonPressedTriggerDevice.trigger(this, {}, { action: button })
        .then(() => this.log('Wall Remote 2 Gang - button='+button))
        .catch(err => this.error('Error triggering Wall Remote 2 Gang button', err));
    }

    _leftOnCommandParser() {
        let button = 'left-twoClicks';
        this._buttonPressedTriggerDevice.trigger(this, {}, { action: button })
        .then(() => this.log('Wall Remote 2 Gang - button='+button))
        .catch(err => this.error('Error triggering Wall Remote 2 Gang button', err));
    }
    _rightOnCommandParser() {
        let button = 'right-twoClicks';
        this._buttonPressedTriggerDevice.trigger(this, {}, { action: button })
        .then(() => this.log('Wall Remote 2 Gang - button='+button))
        .catch(err => this.error('Error triggering Wall Remote 2 Gang button', err));
    }

    _leftOffCommandParser() {
        let button = 'left-longPress';
        this._buttonPressedTriggerDevice.trigger(this, {}, { action: button })
        .then(() => this.log('Wall Remote 2 Gang - button='+button))
        .catch(err => this.error('Error triggering Wall Remote 2 Gang button', err));
    }
    _rightOffCommandParser() {
        let button = 'right-longPress';
        this._buttonPressedTriggerDevice.trigger(this, {}, { action: button })
        .then(() => this.log('Wall Remote 2 Gang - button='+button))
        .catch(err => this.error('Error triggering Wall Remote 2 Gang button', err));
    }

    _leftOnWithTimedOffCommandParser() {
        let button = 'left-shortRelease';
        this._buttonPressedTriggerDevice.trigger(this, {}, { action: button })
        .then(() => this.log('Wall Remote 2 Gang - button='+button))
        .catch(err => this.error('Error triggering Wall Remote 2 Gang button', err));
    }
    _rightOnWithTimedOffCommandParser() {
        let button = 'right-shortRelease';
        this._buttonPressedTriggerDevice.trigger(this, {}, { action: button })
        .then(() => this.log('Wall Remote 2 Gang - button='+button))
        .catch(err => this.error('Error triggering Wall Remote 2 Gang button', err));
    }

    _leftOffWithEffectCommandParser() {
        let button = 'left-longRelease';
        this._buttonPressedTriggerDevice.trigger(this, {}, { action: button })
        .then(() => this.log('Wall Remote 2 Gang - button='+button))
        .catch(err => this.error('Error triggering Wall Remote 2 Gang button', err));
    }
    _rightOffWithEffectCommandParser() {
        let button = 'right-longRelease';
        this._buttonPressedTriggerDevice.trigger(this, {}, { action: button })
        .then(() => this.log('Wall Remote 2 Gang - button='+button))
        .catch(err => this.error('Error triggering Wall Remote 2 Gang button', err));
    }


    onDeleted(){
		this.log("2 Gang Wall Remote removed")
	}

}

module.exports = wall_remote_2_gang;