/**
 * File: device.js - Zemismart 4-Gang Wall Switch
 * Version: 1.3.0 - SIMPLIFIED (Clean Logs, No Complex Tracking)
 * 
 */

'use strict';

const { Cluster } = require('zigbee-clusters');
const TuyaSpecificCluster = require('../../lib/TuyaSpecificCluster');
const TuyaSpecificClusterDevice = require('../../lib/TuyaSpecificClusterDevice');

// Register Tuya cluster
Cluster.addCluster(TuyaSpecificCluster);

class ZemismartWallSwitch4Gang extends TuyaSpecificClusterDevice {

    // ============ DEVICE INITIALIZATION ============

    async onNodeInit(props) {
        await super.onNodeInit(props);
        
        // Debug and device info
        this.printNode();
        const { subDeviceId } = this.getData();
        this._gangName = this._getGangName(subDeviceId);
        this._myDp = this._getMyDp(subDeviceId);
        
        this.log(`${this._gangName} v7.3.0 initialized - DP${this._myDp} (Simplified)`);

        // SIMPLIFIED: No complex tracking objects
        // Removed: this._pendingCommands, this._lastValues, this._debugLevel
        
        // Power recovery (only for main device)
        if (!this._isSubDevice()) {
            this._powerRecovery = {
                active: false,
                startTime: null,
                expectedDPs: [1, 2, 3, 4],
                receivedDPs: new Set(),
                timeout: 10000
            };
        }

        // Setup listeners
        this._setupTuyaListeners(props.zclNode);

        // Setup capability listener
        this.registerCapabilityListener('onoff', this._onCapabilityOnOff.bind(this));

        // Setup settings listener (only main device handles power-on behavior)
        if (!this._isSubDevice()) {
            this.registerMultipleCapabilityListener(['power_on_behavior'], this._onSettings.bind(this));
        }

        // Initial power recovery
        if (!this._isSubDevice()) {
            setTimeout(() => {
                this._startPowerRecovery();
            }, 1000);
        }

        this.log(`${this._gangName} initialization complete!`);
    }

    // ============ DEVICE HELPERS ============

    _getMyDp(subDeviceId) {
        switch(subDeviceId) {
            case 'secondGang': return 2;
            case 'thirdGang': return 3;
            case 'fourthGang': return 4;
            default: return 1; // Main device = Gang 1
        }
    }

    _isMyDp(dp) {
        if (this._isSubDevice()) {
            return dp === this._myDp;
        } else {
            // Main device handles Gang 1 + power-on behavior
            return dp === 1 || dp === 14;
        }
    }

    _getGangName(subDeviceId) {
        switch(subDeviceId) {
            case 'secondGang': return 'Gang 2';
            case 'thirdGang': return 'Gang 3';
            case 'fourthGang': return 'Gang 4';
            default: return 'Gang 1';
        }
    }

    _isSubDevice() {
        const { subDeviceId } = this.getData();
        return ['secondGang', 'thirdGang', 'fourthGang'].includes(subDeviceId);
    }

    // ============ SIMPLIFIED LISTENERS ============

    _setupTuyaListeners(zclNode) {
        this.log(`${this._gangName} - Setting up listeners...`);
        
        // Reporting listener (device-initiated events like physical buttons)
        zclNode.endpoints[1].clusters.tuya.on("reporting", async (data) => {
            try {
                await this._processDatapoint(data, 'PHYSICAL');
            } catch (err) {
                this.error('Error processing reporting datapoint:', err);
            }
        });

        // Response listener (responses to our commands)
        zclNode.endpoints[1].clusters.tuya.on("response", async (data) => {
            try {
                await this._processDatapoint(data, 'APP');
            } catch (err) {
                this.error('Error processing response datapoint:', err);
            }
        });

        // Network event listeners
        zclNode.on('online', () => {
            this.log(`${this._gangName} - Device online`);
            if (!this._isSubDevice()) {
                this._startPowerRecovery();
            }
        });

        zclNode.on('offline', () => {
            this.log(`${this._gangName} - Device offline`);
        });
    }

    // ============ SIMPLIFIED DATAPOINT PROCESSING ============

    async _processDatapoint(data, source) {
        const dp = data.dp;
        const value = this._getDataValue(data);
        
        // Check if this DP belongs to this device
        if (!this._isMyDp(dp)) {
            return; // Silent ignore
        }

        // Handle different DPs
        switch (dp) {
            case 1:
            case 2:
            case 3:
            case 4:
                await this._handleSwitchState(dp, value, source);
                break;

            case 14:
                await this._handlePowerOnBehavior(value);
                break;

            default:
                this.log(`UNHANDLED: ${this._gangName} - DP${dp} = ${value}`);
        }

        // Mark as received for power recovery
        if (!this._isSubDevice() && this._powerRecovery.active) {
            this._powerRecovery.receivedDPs.add(dp);
            this._checkPowerRecoveryComplete();
        }
    }

    // SIMPLIFIED: Anti-flicker inspired by v1.3.0 success
    async _handleSwitchState(dp, value, source) {
        // Simple anti-flicker check (v1.3.0 style)
        const currentState = this.getCapabilityValue('onoff');
        if (currentState === value) {
            return; // Silent return - no logs for same state
        }
        
        // Simple update without complex tracking
        await this.setCapabilityValue('onoff', value);
        this.log(`${this._gangName} DP${dp}: ${value} (${source})`);
    }

    async _handlePowerOnBehavior(value) {
        if (this._isSubDevice()) return; // Only main device handles this

        let mode;
        switch (value) {
            case 0: mode = 'off'; break;
            case 1: mode = 'on'; break;
            case 2: mode = 'memory'; break;
            default: 
                this.error(`Invalid power-on behavior value: ${value}`);
                return;
        }
        
        this.log(`POWER-ON MODE: ${this._gangName} - ${mode}`);
        
        // Update setting if different
        const currentSetting = this.getSetting('power_on_behavior');
        if (currentSetting !== mode) {
            try {
                await this.setSettings({ power_on_behavior: mode });
                this.log(`POWER-ON SETTING UPDATED: ${this._gangName} - ${mode}`);
            } catch (error) {
                this.error(`POWER-ON SETTING FAILED: ${this._gangName}:`, error);
            }
        }
    }

    // ============ SIMPLIFIED CAPABILITY HANDLERS ============

    // SIMPLIFIED: Inspired by v1.3.0+Retry success
    async _onCapabilityOnOff(value) {
        const dp = this._myDp;
        
        // Simple anti-flicker check (v1.3.0 style)
        const currentState = this.getCapabilityValue('onoff');
        if (currentState === value) {
            return true; // Silent return
        }
        
        this.log(`${this._gangName} command: DP${dp} = ${value}`);
        
        try {
            // Use existing TuyaSpecificClusterDevice retry (keep what works)
            await this.writeBool(dp, value);
            return true;
        } catch (err) {
            this.error(`${this._gangName} command failed:`, err);
            throw err;
        }
    }

    // ============ SETTINGS HANDLER ============

    async _onSettings({ newSettings, changedKeys }) {
        if (this._isSubDevice()) return; // Only main device handles settings

        if (changedKeys.includes('power_on_behavior')) {
            const powerOnBehavior = newSettings.power_on_behavior;
            
            this.log(`SETTINGS CHANGE: ${this._gangName} - power_on_behavior: ${powerOnBehavior}`);
            
            let enumValue;
            switch (powerOnBehavior) {
                case 'off': enumValue = 0; break;
                case 'on': enumValue = 1; break;
                case 'memory': enumValue = 2; break;
                default: 
                    throw new Error(`Invalid power-on behavior: ${powerOnBehavior}`);
            }

            try {
                await this.writeEnum(14, enumValue);
                this.log(`SETTINGS SUCCESS: ${this._gangName} - power_on_behavior = ${powerOnBehavior}`);
            } catch (error) {
                this.error(`SETTINGS FAILED: ${this._gangName}:`, error);
                throw error;
            }
        }
    }

    // ============ POWER RECOVERY ============

    _startPowerRecovery() {
        if (this._isSubDevice()) return;

        this.log(`${this._gangName} - Starting power recovery...`);
        this._powerRecovery.active = true;
        this._powerRecovery.startTime = Date.now();
        this._powerRecovery.receivedDPs.clear();

        // Set timeout to finish power recovery
        setTimeout(() => {
            if (this._powerRecovery.active) {
                this._finishPowerRecovery();
            }
        }, this._powerRecovery.timeout);
    }

    _checkPowerRecoveryComplete() {
        if (!this._powerRecovery.active) return;

        const receivedAll = this._powerRecovery.expectedDPs.every(dp => 
            this._powerRecovery.receivedDPs.has(dp)
        );

        if (receivedAll) {
            this._finishPowerRecovery();
        }
    }

    _finishPowerRecovery() {
        if (!this._powerRecovery.active) return;

        const duration = Date.now() - this._powerRecovery.startTime;
        const received = Array.from(this._powerRecovery.receivedDPs);
        
        this.log(`POWER RECOVERY COMPLETE: ${this._gangName} - ${duration}ms, DPs: ${received.join(',')}`);
        this._powerRecovery.active = false;
    }

    // ============ UTILITIES ============

    _getDataValue(dpValue) {
        switch (dpValue.datatype) {
            case 0: // raw
                return dpValue.data;
            case 1: // bool
                return dpValue.data[0] === 1;
            case 2: // value (4-byte integer)
                return this._convertMultiByteToDecimal(dpValue.data);
            case 3: // string
                return String.fromCharCode(...dpValue.data);
            case 4: // enum
                return dpValue.data[0];
            case 5: // bitmap
                return this._convertMultiByteToDecimal(dpValue.data);
            default:
                throw new Error(`Unsupported datatype: ${dpValue.datatype}`);
        }
    }

    _convertMultiByteToDecimal(chunks) {
        let value = 0;
        for (let i = 0; i < chunks.length; i++) {
            value = value << 8;
            value += chunks[i];
        }
        return value;
    }

    // ============ DEVICE LIFECYCLE ============

    onDeleted() {
        this.log(`DELETED: ${this._gangName} - 4 Gang Wall Switch v7.3.0 removed`);
    }

}

module.exports = ZemismartWallSwitch4Gang;