/**
 * File: device.js
 * Device: Zemismart Wall Switch 1 Gang
 * Version: 1.3.0 + RETRY - Based on proven 2/3-gang formula
 * Date: 2025-07-12
 * Author: Final version using winning v1.3.0+Retry recipe
 *
 * Description:
 * - EXACT same approach as working 2/3-gang v1.3.0+Retry
 * - Simple registerCapability + simple retry
 * - Single endpoint [1], no sub-devices
 * - Clean and reliable
 */
'use strict';

const { ZigBeeDevice } = require('homey-zigbeedriver');
const { CLUSTER, Cluster } = require('zigbee-clusters');
const TuyaOnOffCluster = require('../../lib/TuyaOnOffCluster');
const OnOffBoundCluster = require('../../lib/OnOffBoundCluster');

// Register custom cluster
Cluster.addCluster(TuyaOnOffCluster);

class ZemismartWallSwitch1Gang extends ZigBeeDevice {

  constructor(...args) {
    super(...args);
    
    // SAME retry config as working 2/3-gang
    this.retryConfig = {
      maxRetries: 2,
      baseDelay: 300
    };
  }

  async onNodeInit({zclNode}) {
    this.printNode();
    
    // 1-gang specific: always endpoint 1, always main device
    this._endpoint = 1;
    this._isMainDevice = true;
    
    this.log(`Zemismart 1-Gang v1.3.0+Retry - Endpoint: ${this._endpoint}`);

    // EXACT same registerCapability as working 2/3-gang
    this.registerCapability('onoff', CLUSTER.ON_OFF, {
      endpoint: this._endpoint,
    });

    // EXACT same BoundCluster as working 2/3-gang
    this._setupBoundCluster();

    // EXACT same device info reading as working 2/3-gang
    await zclNode.endpoints[1].clusters.basic.readAttributes([
      'manufacturerName',
      'zclVersion',
      'appVersion',
      'modelId',
      'powerSource',
      'attributeReportingStatus'
    ]).catch(err => {
      this.error('Error when reading device attributes:', err);
    });
  }

  /**
   * EXACT same onCapabilityOnoff with retry as working 2/3-gang
   */
  async onCapabilityOnoff(value, opts) {
    this.log(`Command EP${this._endpoint}: ${value ? 'ON' : 'OFF'} (with retry)`);
    
    for (let attempt = 1; attempt <= this.retryConfig.maxRetries; attempt++) {
      try {
        if (value) {
          await this.zclNode.endpoints[this._endpoint].clusters.onOff.setOn();
        } else {
          await this.zclNode.endpoints[this._endpoint].clusters.onOff.setOff();
        }
        
        // Success - log only if retry was needed
        if (attempt > 1) {
          this.log(`Command succeeded on attempt ${attempt} EP${this._endpoint}`);
        }
        return true;
        
      } catch (error) {
        if (attempt < this.retryConfig.maxRetries) {
          this.log(`Attempt ${attempt} failed EP${this._endpoint}, retrying in ${this.retryConfig.baseDelay}ms`);
          await new Promise(resolve => setTimeout(resolve, this.retryConfig.baseDelay));
        } else {
          this.error(`Command failed after ${this.retryConfig.maxRetries} attempts EP${this._endpoint}:`, error);
          throw error;
        }
      }
    }
  }

  /**
   * EXACT same BoundCluster setup as working 2/3-gang
   */
  _setupBoundCluster() {
    try {
      const boundCluster = new OnOffBoundCluster({
        onSetOn: () => this._handlePhysicalCommand('on'),
        onSetOff: () => this._handlePhysicalCommand('off'),
        onToggle: () => this._handlePhysicalCommand('toggle')
      });

      // Bind to endpoint 1
      this.zclNode.endpoints[this._endpoint].bind(CLUSTER.ON_OFF.NAME, boundCluster);
      this.log(`BoundCluster registered for endpoint ${this._endpoint}`);
      
    } catch (error) {
      this.error(`Failed to register BoundCluster for endpoint ${this._endpoint}:`, error.message);
    }
  }

  /**
   * EXACT same physical command handling as working 2/3-gang
   */
  _handlePhysicalCommand(command) {
    this.log(`Physical command received on EP${this._endpoint}: ${command}`);
    
    try {
      if (command === 'toggle') {
        const currentState = this.getCapabilityValue('onoff');
        this.setCapabilityValue('onoff', !currentState);
      } else if (command === 'on') {
        this.setCapabilityValue('onoff', true);
      } else if (command === 'off') {
        this.setCapabilityValue('onoff', false);
      }
    } catch (error) {
      this.error(`Failed to handle physical command ${command}:`, error);
    }
  }

  /**
   * 1-gang specific: no sub-devices
   */
  isSubDevice() {
    return false; // 1-gang never has sub-devices
  }

  /**
   * EXACT same cleanup as working 2/3-gang
   */
  onDeleted() {
    this.log("Zemismart Wall Switch 1 Gang v1.3.0+Retry removed");
  }
}

module.exports = ZemismartWallSwitch1Gang;