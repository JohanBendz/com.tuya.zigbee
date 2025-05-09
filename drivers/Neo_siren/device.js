'use strict';

const { Cluster, debug } = require('zigbee-clusters');
const TuyaSpecificCluster = require('../../lib/TuyaSpecificCluster');
const TuyaSpecificClusterDevice = require('../../lib/TuyaSpecificClusterDevice');
const { V1_SIREN_TEMPHUMID_SENSOR_DATA_POINTS: dataPoints } = require('../../lib/TuyaDataPoints');

Cluster.addCluster(TuyaSpecificCluster);

const volumeMapping = new Map([
  [2, 'High'],   // No dispositivo: 2 = Low (que toca alto)
  [1, 'Medium'], // No dispositivo: 1 = Medium
  [0, 'Low']     // No dispositivo: 0 = High (que toca baixo)
]);

const volumeToDevice = {
  '0': 2,  // High no Homey = 2 no dispositivo (que toca baixo)
  '1': 1,  // Medium no Homey = 1 no dispositivo
  '2': 0   // Low no Homey = 0 no dispositivo (que toca alto)
};

const melodiesMapping = new Map([
  [0, 'Doorbell Chime'],
  [1, 'Fur Elise'],
  [2, 'Westminster Chimes'],
  [3, 'Fast double door bell'],
  [4, 'William Tell Overture'],
  [5, 'Turkish March'],
  [6, 'Security Alarm'],
  [7, 'Chemical Spill Alert'],
  [8, 'Piercing Alarm Clock'],
  [9, 'Smoke Alarm'],
  [10, 'Dog Barking'],
  [11, 'Police Siren'],
  [12, 'Doorbell Chime (reverb)'],
  [13, 'Mechanical Telephone'],
  [14, 'Fire/Ambulance'],
  [15, '3/1 Elevator'],
  [16, 'Buzzing Alarm Clock'],
  [17, 'School Bell']
]);

const dataTypes = {
  raw: 0,
  bool: 1,
  value: 2,
  string: 3,
  enum: 4,
  bitmap: 5,
};

const convertMultiByteNumberPayloadToSingleDecimalNumber = (chunks) => {
  return chunks.reduce((acc, byte) => (acc << 8) + byte, 0);
};

const getDataValue = (dpValue) => {
  switch (dpValue.datatype) {
    case dataTypes.raw: return dpValue.data;
    case dataTypes.bool: return dpValue.data[0] === 1;
    case dataTypes.value: return convertMultiByteNumberPayloadToSingleDecimalNumber(dpValue.data);
    case dataTypes.string: return String.fromCharCode(...dpValue.data);
    case dataTypes.enum: return dpValue.data[0];
    case dataTypes.bitmap: return convertMultiByteNumberPayloadToSingleDecimalNumber(dpValue.data);
  }
};

class siren extends TuyaSpecificClusterDevice {
  async onNodeInit({ zclNode }) {
    this.printNode();
    
    // Garantir que a capability de bateria está adicionada
    if (!this.hasCapability('measure_battery')) {
      await this.addCapability('measure_battery').catch(this.error);
    }
    
    // Adicionar capability de bateria baixa se não existir
    if (!this.hasCapability('alarm_battery')) {
      await this.addCapability('alarm_battery').catch(this.error);
    }
    
    // Definir valor inicial da bateria como 100% se não estiver definido
    const currentBattery = await this.getCapabilityValue('measure_battery');
    if (currentBattery === null || currentBattery === undefined) {
      await this.setCapabilityValue('measure_battery', 100).catch(this.error);
    }
    
    // Definir alarme de bateria como false inicialmente
    const currentBatteryAlarm = await this.getCapabilityValue('alarm_battery');
    if (currentBatteryAlarm === null || currentBatteryAlarm === undefined) {
      await this.setCapabilityValue('alarm_battery', false).catch(this.error);
    }

    // Consultar o valor da bateria ao iniciar
    setTimeout(() => {
      this.log('Querying battery status...');
      this.readDatapoint(dataPoints.battery).catch(this.error);
    }, 5000);

    // Configurar consulta periódica da bateria (a cada 4 horas)
    this.batteryInterval = setInterval(() => {
      this.log('Periodic battery query...');
      this.readDatapoint(dataPoints.battery).catch(this.error);
    }, 4 * 60 * 60 * 1000);

    this.registerCapabilityListener('onoff', async (value) => {
      this.log('onoff: ', value);
      
      if (value) {
        // Ensure sound is configured before turning on
        const currentTune = await this.getSettings().alarmtune || '1';
        const currentVolume = await this.getSettings().alarmvolume || '0';
        const currentDuration = await this.getSettings().alarmsoundtime || 10;
        
        // Set all parameters before turning on
        await this.writeEnum(dataPoints.melody, Number(currentTune));
        await this.writeEnum(dataPoints.volume, volumeToDevice[currentVolume]);
        await this.writeData32(dataPoints.duration, Number(currentDuration));
        
        // Small delay to ensure settings are applied
        await new Promise(resolve => setTimeout(resolve, 200));
      }
      
      await this.writeBool(dataPoints.alarm, value);
    });

    zclNode.endpoints[1].clusters.tuya.on("response", v => this.processResponse(v));
    zclNode.endpoints[1].clusters.tuya.on("reporting", v => this.processReporting(v));
    zclNode.endpoints[1].clusters.tuya.on("datapoint", v => this.processDatapoint(v));

    const actionAlarmState = this.homey.flow.getActionCard('siren_alarm_state');
    actionAlarmState.registerRunListener(async (args, state) => {
      try {
        this.log('FlowCardAction Set Alarm state to:', args.siren_alarm_state);
        const alarmState = args.siren_alarm_state !== 'off/disable';
        
        if (alarmState) {
          // Ensure sound is configured before turning on
          const currentTune = await this.getSettings().alarmtune || '1';
          const currentVolume = await this.getSettings().alarmvolume || '0';
          const currentDuration = await this.getSettings().alarmsoundtime || 10;
          
          await this.writeEnum(dataPoints.melody, Number(currentTune));
          await this.writeEnum(dataPoints.volume, volumeToDevice[currentVolume]);
          await this.writeData32(dataPoints.duration, Number(currentDuration));
          
          await new Promise(resolve => setTimeout(resolve, 200));
        }
        
        await this.writeBool(dataPoints.alarm, alarmState);
        return true;
      } catch (error) {
        this.error(error);
        return false;
      }
    });

    this.homey.flow.getActionCard('siren_volume_setting')
      .registerRunListener(async (args) => {
        this.log('Set Alarm volume to:', args.siren_volume_setting);
        await this.sendAlarmVolume(args.siren_volume_setting);
      });

    this.homey.flow.getActionCard('siren_alarm_duration')
      .registerRunListener(async (args) => {
        this.log('Set Alarm Duration to:', args.duration);
        await this.sendAlarmDuration(args.duration);
      });

    this.homey.flow.getActionCard('siren_alarm_tune')
      .registerRunListener(async (args) => {
        this.log('Set Alarm Tune to:', args.siren_alarm_tune);
        await this.sendAlarmTune(args.siren_alarm_tune);
      });

    this.homey.flow.getActionCard('siren_beep')
      .registerRunListener(async () => {
        this.log('FlowCardAction: Beep triggered');
        await this.beep();
        return true;
      });
  }

  async processResponse(data) {
    this.log('Response:', data);
    this.log('Parsed value:', getDataValue(data));
  }

  async processReporting(data) {
    const parsedValue = getDataValue(data);
    this.log(`Reporting - DP ${data.dp}:`, parsedValue);

    switch (data.dp) {
      case dataPoints.alarm:
      case 13: // DP 13
        this.setCapabilityValue('onoff', parsedValue).catch(this.error);
        if (parsedValue) {
          // Emit trigger for alarm activation
          const trigger = this.homey.flow.getTriggerCard('siren_alarm');
          trigger.trigger(this, {}, {})
            .then(() => this.log('Triggered siren_alarm'))
            .catch(err => this.error('Error triggering siren_alarm:', err));
        }
        break;
      case dataPoints.volume:
      case 5: // DP 5
        // Converter o valor do dispositivo para o valor do Homey
        // No dispositivo: 0 = High (toca alto), 1 = Medium, 2 = Low (toca baixo)
        // No Homey: 0 = High (toca baixo), 1 = Medium, 2 = Low (toca alto)
        const homeyVolume = Object.keys(volumeToDevice).find(key => volumeToDevice[key] === parsedValue);
        this.setSettings({ alarmvolume: homeyVolume }).catch(this.error);
        break;
      case dataPoints.duration:
      case 7: // DP 7
        this.setSettings({ alarmsoundtime: parsedValue }).catch(this.error);
        break;
      case dataPoints.melody:
      case 21: // DP 21
        this.setSettings({ alarmtune: String(parsedValue) }).catch(this.error);
        break;
      case dataPoints.battery:
      case 15: // DP 15
        // O valor já vem em porcentagem (0-100)
        const batteryValue = Number(parsedValue);
        if (!isNaN(batteryValue) && batteryValue >= 0 && batteryValue <= 100) {
          this.setCapabilityValue('measure_battery', batteryValue)
            .then(() => {
              this.log('Battery value updated to:', batteryValue);
              
              // Atualizar alarme de bateria baixa (considerar abaixo de 20%)
              const lowBattery = batteryValue < 20;
              this.setCapabilityValue('alarm_battery', lowBattery)
                .then(() => this.log('Battery alarm status:', lowBattery ? 'LOW' : 'OK'))
                .catch(err => this.error('Error updating battery alarm:', err));
            })
            .catch(err => this.error('Error updating battery value:', err));
        } else {
          this.error('Invalid battery value received:', parsedValue);
        }
        break;
      default:
        this.log('Unhandled datapoint:', data);
    }
  }

  async processDatapoint(data) {
    this.log('Datapoint:', data);
    this.log('Parsed value:', getDataValue(data));
  }

  onDeleted() {
    this.log('Zigbee Siren removed');
    // Limpar o intervalo de consulta da bateria
    if (this.batteryInterval) {
      clearInterval(this.batteryInterval);
    }
  }

  async onSettings({ oldSettings, newSettings, changedKeys }) {
    for (const key of changedKeys) {
      this.log('Updated setting:', key, '=>', newSettings[key]);
      switch (key) {
        case 'alarmvolume':
          await this.sendAlarmVolume(newSettings[key]);
          break;
        case 'alarmsoundtime':
          await this.sendAlarmDuration(newSettings[key]);
          break;
        case 'alarmtune':
          await this.sendAlarmTune(newSettings[key]);
          break;
        default:
          this.log('Unknown setting:', key);
      }
    }
  }

  async sendAlarmVolume(volume) {
    const deviceVolume = volumeToDevice[volume];
    this.log('Sending alarm volume:', volumeMapping.get(deviceVolume), '=> device value:', deviceVolume);
    return this.writeEnum(dataPoints.volume, deviceVolume);
  }

  async sendAlarmDuration(duration) {
    this.log('Sending alarm duration:', duration);
    return this.writeData32(dataPoints.duration, Number(duration));
  }

  async sendAlarmTune(tune) {
    this.log('Sending alarm tune:', melodiesMapping.get(Number(tune)), '(', tune, ')');
    return this.writeEnum(dataPoints.melody, Number(tune));
  }

  async readDatapoint(dp) {
    this.log('Reading datapoint:', dp);
    try {
      // Enviar comando para ler datapoint específico
      await this.zclNode.endpoints[1].clusters.tuya.datapoint({
        status: 0,
        transid: this.transactionID++,
        dp,
        datatype: 0,
        length: 0,
        data: Buffer.alloc(0)
      });
    } catch (err) {
      this.error('Error reading datapoint:', err);
    }
  }

  async refresh() {
    this.log('Refreshing device...');
    
    // Ler todos os datapoints importantes
    await this.readDatapoint(dataPoints.battery);
    await this.readDatapoint(dataPoints.volume);
    await this.readDatapoint(dataPoints.duration);
    await this.readDatapoint(dataPoints.melody);
  }

  async beep() {
    this.log('Beep command triggered');
    
    // Configure all sound parameters before turning on
    await this.writeEnum(dataPoints.volume, 2); // High (2 no dispositivo que toca baixo)
    await this.writeEnum(dataPoints.melody, 1); // Fur Elise
    await this.writeData32(dataPoints.duration, 2); // 2 seconds for beep
    
    // Small delay to ensure settings are applied
    await new Promise(resolve => setTimeout(resolve, 200));
    
    // Activate alarm
    await this.writeBool(dataPoints.alarm, true);
    
    // Turn off after the beep duration
    setTimeout(async () => {
      await this.writeBool(dataPoints.alarm, false);
    }, 2000);
  }
}

module.exports = siren;