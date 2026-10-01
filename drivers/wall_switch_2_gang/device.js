'use strict';

const { ZigBeeDevice } = require('homey-zigbeedriver');
const { CLUSTER, Cluster, ZCLDataTypes } = require('zigbee-clusters');
const TuyaOnOffCluster = require('../../lib/TuyaOnOffCluster');

Cluster.addCluster(TuyaOnOffCluster);

class wall_switch_2_gang extends ZigBeeDevice {

    async onNodeInit({ zclNode }) {
        const { subDeviceId } = this.getData();
        const endpoint = subDeviceId === 'secondSwitch' ? 2 : 1;
        this.log('Device data:', subDeviceId, 'endpoint:', endpoint);

        let manufacturerName = zclNode.endpoints[1].clusters.basic?.attributes?.manufacturerName;

        if (!manufacturerName) {
            try {
                ({ manufacturerName } = await zclNode.endpoints[1].clusters.basic.readAttributes(['manufacturerName']));
            } catch (error) {
                this.error('Failed to read manufacturerName', error);
            }
        }

        this.registerCapability('onoff', CLUSTER.ON_OFF, {
            endpoint,
        });

        // _TZ3000_18ejxno0 historically did not keep Homey's capability state
        // synchronized after Flow actions. Configure standard Zigbee OnOff
        // reporting once per Homey tile/endpoint; bindings are declared in Compose.
        if (
            manufacturerName === '_TZ3000_18ejxno0'
            && this.getStoreValue('onoff_reporting_configured') !== true
        ) {
            try {
                await this.configureAttributeReporting([{
                    endpointId: endpoint,
                    cluster: CLUSTER.ON_OFF,
                    attributeName: 'onOff',
                    minInterval: 0,
                    maxInterval: 300,
                    minChange: 1,
                }]);
                await this.setStoreValue('onoff_reporting_configured', true);
                this.log('Configured OnOff reporting for _TZ3000_18ejxno0 endpoint', endpoint);
            } catch (error) {
                this.error(
                    'Failed to configure OnOff reporting for _TZ3000_18ejxno0 endpoint',
                    endpoint,
                    error
                );
            }
        }

        if (!this.isSubDevice()) {
            try {
                const indicatorMode = await zclNode.endpoints[1].clusters.onOff.readAttributes(['indicatorMode']);
                this.log('Indicator Mode supported by device');
                await this.setSettings({
                    indicator_mode: ZCLDataTypes.enum8IndicatorMode.args[0][indicatorMode.indicatorMode].toString(),
                });
            } catch (error) {
                this.log('This device does not support Indicator Mode', error);
            }

            await zclNode.endpoints[1].clusters.basic.readAttributes([
                'manufacturerName',
                'zclVersion',
                'appVersion',
                'modelId',
                'powerSource',
                'attributeReportingStatus',
            ]).catch(err => {
                this.error('Error when reading device attributes', err);
            });
        }
    }

    onDeleted(){
		const { subDeviceId } = this.getData();
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