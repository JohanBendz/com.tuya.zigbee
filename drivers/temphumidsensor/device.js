'use strict';

const { ZigBeeDevice } = require('homey-meshdriver');

class temphumidsensor extends ZigBeeDevice {

	async onMeshInit() {

		// Developer tools
		// this.enableDebug();
		this.printNode();
			
		// Register capabilities and listeners

		// Temperature
		if (this.hasCapability('measure_temperature')) {
		 this.registerCapability('measure_temperature', 'msTemperatureMeasurement');
		 this.registerAttrReportListener('msTemperatureMeasurement', 'measuredValue', 10, 300, null,
			this.measure_temperature_Report.bind(this))
			.catch(err => {
				this.error('failed to register report listener msTemperatureMeasurement', err);
			});
		}

		// Battery
		if (this.hasCapability('measure_battery')) {
		 this.registerCapability('measure_battery', 'genPowerCfg');
		 this.registerAttrReportListener('genPowerCfg', 'batteryPercentageRemaining', 10, 300, null,
			this.measure_battery_Report.bind(this))
			.catch(err => {
			this.error('failed to register report listener genPowerCfg', err);
			});
		}

		// Humidity
		if (this.hasCapability('measure_humidity')) {
			this.registerCapability('measure_humidity', 'msRelativeHumidity');
			await this.registerAttrReportListener('msRelativeHumidity', 'measuredValue', 10, 300, null,
				this.measure_humidity_Report.bind(this))
				.catch(err => {
				this.error('failed to register report listener msRelativeHumidity', err);
				});
			}

		// end Register capabilities and listeners

		this.log('Temperature & Humidity Sensor Driver has been inited');

	}

		// Handle reports
		measure_temperature_Report(value) {
			const parsedValue = this.getSetting('temperature_decimals') === '2' ? Math.round((value / 100) * 100) / 100 : Math.round((value / 100) * 10) / 10;
			const temperatureOffset = this.getSetting('temperature_offset') || 0;
			this.log('msTemperatureMeasurement - measuredValue (temperature):', parsedValue, '+ temperature offset', temperatureOffset);
			this.setCapabilityValue('measure_temperature', parsedValue + temperatureOffset);
		}
		
		measure_battery_Report(value) {
			const parsedValue = (value/2);
			this.log('Battery level, genPowerCfg', value, parsedValue);
			this.setCapabilityValue('measure_battery', parsedValue);
			this.setCapabilityValue('alarm_battery', parsedValue < (this.getSetting('battery_threshold') || 20));
		}

		measure_humidity_Report(value) {
			const parsedValue = this.getSetting('humidity_decimals') === '2' ? Math.round((value / 100) * 100) / 100 : Math.round((value / 100) * 10) / 10;
			this.log('msRelativeHumidity - measuredValue (humidity):', parsedValue);
			this.setCapabilityValue('measure_humidity', parsedValue);
		}
		
		// end Handle reports

}

module.exports = temphumidsensor;

/*
2020-05-05 13:25:19 [log] [ManagerDrivers] [temphumidsensor] [0] ZigBeeDevice has been inited
2020-05-05 13:25:19 [log] [ManagerDrivers] [temphumidsensor] [0] ------------------------------------------
2020-05-05 13:25:19 [log] [ManagerDrivers] [temphumidsensor] [0] Node: 968e2194-4fd1-462d-882d-56578e27d0d5
2020-05-05 13:25:19 [log] [ManagerDrivers] [temphumidsensor] [0] - Battery: true
2020-05-05 13:25:19 [log] [ManagerDrivers] [temphumidsensor] [0] - Endpoints: 0
2020-05-05 13:25:19 [log] [ManagerDrivers] [temphumidsensor] [0] -- Clusters:
2020-05-05 13:25:19 [log] [ManagerDrivers] [temphumidsensor] [0] --- zapp
2020-05-05 13:25:19 [log] [ManagerDrivers] [temphumidsensor] [0] --- genBasic
2020-05-05 13:25:19 [log] [ManagerDrivers] [temphumidsensor] [0] ---- 65533 : 1
2020-05-05 13:25:19 [log] [ManagerDrivers] [temphumidsensor] [0] ---- cid : genBasic
2020-05-05 13:25:19 [log] [ManagerDrivers] [temphumidsensor] [0] ---- sid : attrs
2020-05-05 13:25:19 [log] [ManagerDrivers] [temphumidsensor] [0] ---- zclVersion : 3
2020-05-05 13:25:19 [log] [ManagerDrivers] [temphumidsensor] [0] ---- appVersion : 73
2020-05-05 13:25:19 [log] [ManagerDrivers] [temphumidsensor] [0] ---- stackVersion : 0
2020-05-05 13:25:19 [log] [ManagerDrivers] [temphumidsensor] [0] ---- hwVersion : 1
2020-05-05 13:25:19 [log] [ManagerDrivers] [temphumidsensor] [0] ---- manufacturerName : TUYATEC-g3gl6cgy
2020-05-05 13:25:19 [log] [ManagerDrivers] [temphumidsensor] [0] ---- modelId : RH3052
2020-05-05 13:25:19 [log] [ManagerDrivers] [temphumidsensor] [0] ---- dateCode : 20180608
2020-05-05 13:25:19 [log] [ManagerDrivers] [temphumidsensor] [0] ---- powerSource : 3
2020-05-05 13:25:19 [log] [ManagerDrivers] [temphumidsensor] [0] --- genPowerCfg
2020-05-05 13:25:19 [log] [ManagerDrivers] [temphumidsensor] [0] ---- cid : genPowerCfg
2020-05-05 13:25:19 [log] [ManagerDrivers] [temphumidsensor] [0] ---- sid : attrs
2020-05-05 13:25:19 [log] [ManagerDrivers] [temphumidsensor] [0] --- genIdentify
2020-05-05 13:25:19 [log] [ManagerDrivers] [temphumidsensor] [0] ---- cid : genIdentify
2020-05-05 13:25:19 [log] [ManagerDrivers] [temphumidsensor] [0] ---- sid : attrs
2020-05-05 13:25:19 [log] [ManagerDrivers] [temphumidsensor] [0] --- msTemperatureMeasurement
2020-05-05 13:25:19 [log] [ManagerDrivers] [temphumidsensor] [0] ---- 65533 : 1
2020-05-05 13:25:19 [log] [ManagerDrivers] [temphumidsensor] [0] ---- cid : msTemperatureMeasurement
2020-05-05 13:25:19 [log] [ManagerDrivers] [temphumidsensor] [0] ---- sid : attrs
2020-05-05 13:25:19 [log] [ManagerDrivers] [temphumidsensor] [0] ---- measuredValue : 2609
2020-05-05 13:25:19 [log] [ManagerDrivers] [temphumidsensor] [0] ---- minMeasuredValue : 0
2020-05-05 13:25:19 [log] [ManagerDrivers] [temphumidsensor] [0] ---- maxMeasuredValue : 0
2020-05-05 13:25:19 [log] [ManagerDrivers] [temphumidsensor] [0] --- msRelativeHumidity
2020-05-05 13:25:19 [log] [ManagerDrivers] [temphumidsensor] [0] ---- 65533 : 1
2020-05-05 13:25:19 [log] [ManagerDrivers] [temphumidsensor] [0] ---- cid : msRelativeHumidity
2020-05-05 13:25:19 [log] [ManagerDrivers] [temphumidsensor] [0] ---- sid : attrs
2020-05-05 13:25:19 [log] [ManagerDrivers] [temphumidsensor] [0] ---- measuredValue : 3575
2020-05-05 13:25:19 [log] [ManagerDrivers] [temphumidsensor] [0] ---- minMeasuredValue : 0
2020-05-05 13:25:19 [log] [ManagerDrivers] [temphumidsensor] [0] ---- maxMeasuredValue : 0
2020-05-05 13:25:19 [log] [ManagerDrivers] [temphumidsensor] [0] ------------------------------------------
2020-05-05 13:25:20 [log] [ManagerDrivers] [temphumidsensor] [0] [dbg] report {
  token: '968e2194-4fd1-462d-882d-56578e27d0d5',
  device: '0x14b457fffe3c53a9',
  endpoint: '1',
  cluster: 'genBasic',
  attr: 'appVersion',
  value: 73,
  event: 'report'
}
2020-05-05 13:25:20 [log] [ManagerDrivers] [temphumidsensor] [0] [dbg] report {
  token: '968e2194-4fd1-462d-882d-56578e27d0d5',
  device: '0x14b457fffe3c53a9',
  endpoint: '1',
  cluster: 'genPowerCfg',
  attr: 'batteryVoltage',
  value: 29,
  event: 'report'
}
2020-05-05 13:25:20 [log] [ManagerDrivers] [temphumidsensor] [0] [dbg] report {
  token: '968e2194-4fd1-462d-882d-56578e27d0d5',
  device: '0x14b457fffe3c53a9',
  endpoint: '1',
  cluster: 'genPowerCfg',
  attr: 'batteryPercentageRemaining',
  value: 196,
  event: 'report'
}

2020-02-25 00:05:31 [log] [ManagerDrivers] [Sensor9919046] [0] [dbg] report { token: 'ce8208e1-143d-4c77-a1bc-26bc954b8c11',
  device: '0x14b457fffe3c53a9',
  endpoint: '1',
  cluster: 'msTemperatureMeasurement',
  attr: 'measuredValue',
  value: 2601,
  event: 'report' }
2020-02-25 00:05:31 [log] [ManagerDrivers] [Sensor9919046] [0] [dbg] report { token: 'ce8208e1-143d-4c77-a1bc-26bc954b8c11',
  device: '0x14b457fffe3c53a9',
  endpoint: '1',
  cluster: 'msRelativeHumidity',
  attr: 'measuredValue',
  value: 2583,
  event: 'report' }
*/