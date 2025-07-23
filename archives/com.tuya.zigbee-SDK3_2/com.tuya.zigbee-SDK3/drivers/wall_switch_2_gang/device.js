'use strict';

const Homey = require('homey');
const { ZigBeeDevice } = require('homey-zigbeedriver');
const { debug, CLUSTER } = require('zigbee-clusters');

class wall_switch_2_gang extends ZigBeeDevice {

    async onNodeInit({zclNode}) {

        this.printNode();

        const { subDeviceId } = this.getData();
        this.log("Device data: ", subDeviceId);

        this.registerCapability('onoff', CLUSTER.ON_OFF, {
            endpoint: subDeviceId === 'secondSwitch' ? 2 : 1,
        });

        try {
            const indicatorMode = await this.zclNode.endpoints[1].clusters.onOff.readAttributes(['indicatorMode']);     
            this.log("Indicator Mode supported by device");
            await this.setSettings({
              indicator_mode: ZCLDataTypes.enum8IndicatorMode.args[0][indicatorMode.indicatorMode].toString()
            });
        } catch (error) {
        this.log("This device does not support Indicator Mode", error);
        }

        if (!this.isSubDevice()) {
            await zclNode.endpoints[1].clusters.basic.readAttributes(['manufacturerName', 'zclVersion', 'appVersion', 'modelId', 'powerSource', 'attributeReportingStatus'])
            .catch(err => {
                this.error('Error when reading device attributes ', err);
            });
        }

    }

    onDeleted(){
		this.log("2 Gang Wall Switch, channel ", subDeviceId, " removed")
	}

    async onSettings({oldSettings, newSettings, changedKeys}) {
        let parsedValue = 0;
        if (changedKeys.includes('indicator_mode')) {
          parsedValue = parseInt(newSettings.indicator_mode);
          await this.zclNode.endpoints[1].clusters.onOff.writeAttributes({ indicatorMode: parsedValue });
        }
    }

}

module.exports = wall_switch_2_gang;