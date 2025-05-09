'use strict';

const { ZigBeeDevice } = require('homey-zigbeedriver');
const { CLUSTER, Cluster, ZCLDataTypes } = require('zigbee-clusters');
const TuyaOnOffCluster = require('../../lib/TuyaOnOffCluster');

// Register custom cluster
Cluster.addCluster(TuyaOnOffCluster);

class wall_switch_1_gang extends ZigBeeDevice {

  async onNodeInit({zclNode}) {
    // Print node information for debugging
    this.printNode();
    
    this.log('Initializing Tuya 1 Gang Wall Switch...');

    // Register the standard on/off capability
    this.registerCapability('onoff', CLUSTER.ON_OFF);
    
    try {
      // Check if the device supports Indicator Mode
      const indicatorMode = await this.zclNode.endpoints[1].clusters.onOff.readAttributes(['indicatorMode']);     
      this.log("Indicator Mode supported by device:", indicatorMode);
      
      let indicatorModeValue = '1'; // Default value
      
      // Convert value to settings format if needed
      if (typeof indicatorMode.indicatorMode === 'string') {
        // Map string to numeric value
        const modeMap = { 'Off': '0', 'Status': '1', 'Position': '2' };
        indicatorModeValue = modeMap[indicatorMode.indicatorMode] || '1';
      } else if (indicatorMode.indicatorMode !== undefined) {
        // Use numeric value directly
        indicatorModeValue = indicatorMode.indicatorMode.toString();
      }
      
      this.log(`Mapped Indicator Mode value: ${indicatorModeValue}`);
      
      await this.setSettings({
        indicator_mode: indicatorModeValue
      });
      this.log("Indicator Mode configured in settings");
    } catch (error) {
      this.log("This device does not support Indicator Mode", error);
    }

    // Try to read relayStatus only - this is the only method that works based on logs
    try {
      this.log("Trying to read relayStatus attribute...");
      const relayStatus = await this.zclNode.endpoints[1].clusters.onOff.readAttributes(['relayStatus']);
      
      if (relayStatus && relayStatus.relayStatus !== undefined) {
        this.log("relayStatus found:", relayStatus);
        
        // Convert value to expected format
        let powerOnValue = '2'; // Default value (restore)
        
        if (typeof relayStatus.relayStatus === 'string') {
          // Map string to numeric value
          const stateMap = { 'Off': '0', 'On': '1', 'Remember': '2' };
          powerOnValue = stateMap[relayStatus.relayStatus] || '2';
          this.log(`relayStatus received as string: ${relayStatus.relayStatus}, mapped to: ${powerOnValue}`);
        } else {
          // Use numeric value directly
          powerOnValue = relayStatus.relayStatus.toString();
          this.log(`relayStatus received as number: ${relayStatus.relayStatus}, converted to: ${powerOnValue}`);
        }
        
        await this.setSettings({
          power_on_behavior: powerOnValue
        });
        
        // Save reference to method that worked
        this._powerOnMethod = 'relayStatus';
        this.log("PowerOnBehavior configured in settings using relayStatus:", powerOnValue);
      } else {
        throw new Error('relayStatus received but invalid or empty value');
      }
    } catch (error) {
      this.error("Failed to read or configure relayStatus:", error);
      
      // Set default method and default value
      this._powerOnMethod = 'relayStatus'; // Still try to use relayStatus as last resort
      try {
        await this.setSettings({
          power_on_behavior: '2' // Default value for "Restore" (remember previous state)
        });
        this.log("PowerOnBehavior set with default value (2)");
      } catch (settingsError) {
        this.error("Error setting default value for PowerOnBehavior", settingsError);
      }
    }
  
    try {
      // Read basic device attributes for better debugging
      await zclNode.endpoints[1].clusters.basic.readAttributes([
        'manufacturerName', 
        'zclVersion', 
        'appVersion', 
        'modelId', 
        'powerSource', 
        'attributeReportingStatus'
      ]);
      this.log("Basic attributes read successfully");
    } catch (err) {
      this.error('Error reading device attributes', err);
    }

    this.log('Tuya 1 Gang Wall Switch initialized');
  }

  /**
   * Settings were changed by the user
   */
  async onSettings({oldSettings, newSettings, changedKeys}) {
    this.log('Settings changed by user');
    this.log('Changed keys:', changedKeys);
    
    try {
      // Handle indicator mode changes
      if (changedKeys.includes('indicator_mode')) {
        const parsedValue = parseInt(newSettings.indicator_mode);
        this.log(`Changing indicator mode to: ${parsedValue}`);
        try {
          await this.zclNode.endpoints[1].clusters.onOff.writeAttributes({ indicatorMode: parsedValue });
          this.log('Indicator mode changed successfully');
        } catch (error) {
          this.error('Failed to change indicator mode:', error);
          throw error;
        }
      }
      
      // Handle power on behavior changes
      if (changedKeys.includes('power_on_behavior')) {
        const parsedValue = parseInt(newSettings.power_on_behavior);
        this.log(`Changing PowerOn behavior to: ${parsedValue} using relayStatus attribute`);
        
        try {
          // Only use relayStatus attribute that we know works
          const result = await this.zclNode.endpoints[1].clusters.onOff.writeAttributes({ relayStatus: parsedValue });
          this.log('Result of relayStatus change:', result);
          this.log('PowerOn behavior successfully changed via relayStatus');
        } catch (error) {
          this.error('Failed to change relayStatus:', error);
          throw new Error('Failed to apply PowerOnBehavior configuration: ' + error.message);
        }
      }
    } catch (error) {
      this.error('Failed to apply settings', error);
      throw new Error(`Failed to apply settings: ${error.message}`);
    }
  }

  /**
   * Device was deleted
   */
  onDeleted() {
    this.log("1 Gang Wall Switch removed");
  }
}

module.exports = wall_switch_1_gang;