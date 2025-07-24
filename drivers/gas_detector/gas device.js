/**
 * ZigBee Gas Detector Device Driver - Ultra Clean Version
 * File: device.js
 * Version: 1.0
 */

'use strict';

const { ZigBeeDevice } = require('homey-zigbeedriver');
const { CLUSTER } = require('zigbee-clusters');

class GasSensorDevice extends ZigBeeDevice {

    async onNodeInit({ zclNode }) {
        this.log('Gas Detector ');
        this.printNode();

        // Store for future use
        this.zclNode = zclNode;
        
        // Device configuration
        this.zoneId = 1;
        this.lastHeartbeat = new Date();

        // Log available endpoints for debugging
        this.logAvailableEndpoints();

        // Ensure capabilities exist
        await this.ensureCapabilities();

        // Setup device
        await this.setupIASZone();

        // Start passive health monitoring
        this.startHealthCheck();

        this.log('AC powered gas detector ready');
    }

    logAvailableEndpoints() {
        if (this.zclNode && this.zclNode.endpoints) {
            this.log('Available endpoints:');
            Object.keys(this.zclNode.endpoints).forEach(endpointId => {
                const endpoint = this.zclNode.endpoints[endpointId];
                const clusterNames = Object.keys(endpoint.clusters || {});
                this.log(`  Endpoint ${endpointId}: clusters [${clusterNames.join(', ')}]`);
            });
        }
    }

    async ensureCapabilities() {
        const capabilities = ['alarm_gas', 'alarm_problem'];
        for (const cap of capabilities) {
            if (!this.hasCapability(cap)) {
                await this.addCapability(cap).catch(err => 
                    this.error(`Failed to add ${cap} capability:`, err));
            }
        }
    }

    async setupIASZone() {
        const iasZone = this.zclNode.endpoints[1].clusters[CLUSTER.IAS_ZONE.NAME];
        if (!iasZone) {
            return this.error('IAS Zone cluster missing!');
        }

        this.log('Setting up IAS Zone cluster...');

        // Setup event handlers
        iasZone.onZoneStatusChangeNotification = this.onZoneStatusChange.bind(this);
        iasZone.onZoneEnrollRequest = this.onZoneEnrollRequest.bind(this);

        // Process current state and ensure enrollment
        try {
            const attrs = await iasZone.readAttributes(['zoneState', 'zoneStatus', 'iasCIEAddress']);
            this.log('Initial zone status:', attrs);
            
            if (attrs.iasCIEAddress) {
                this.log('CIE Address (managed by Homey):', attrs.iasCIEAddress);
            }
            
            if (attrs.zoneStatus) {
                this.processZoneStatus(attrs.zoneStatus, true);
            }

            // Always ensure enrollment
            this.log('Ensuring device enrollment...');
            await this.handleEnrollment(iasZone, attrs.iasCIEAddress);
            
        } catch (err) {
            this.error('Setup failed:', err);
        }
    }

    async handleEnrollment(iasZone, cieAddress) {
        try {
            if (cieAddress) {
                this.log('Using existing CIE address:', cieAddress);
            }
            
            await iasZone.zoneEnrollResponse({
                enrollResponseCode: 0x00,
                zoneId: this.zoneId,
            });
            this.log('Zone enroll response sent successfully');
            
            // Verify enrollment after delay
            setTimeout(async () => {
                try {
                    const attrs = await iasZone.readAttributes(['zoneState']);
                    this.log('Post-enrollment check - zoneState:', attrs.zoneState);
                    if (attrs.zoneState === 'enrolled') {
                        this.log('Device successfully enrolled!');
                    }
                } catch (err) {
                    this.log('Could not verify enrollment status:', err.message);
                }
            }, 3000);
            
        } catch (err) {
            this.error('Enrollment failed:', err);
        }
    }

    onZoneStatusChange({ zoneStatus, extendedStatus, zoneId, delay }) {
        this.log('Zone status change notification received!');
        this.log('Raw data:', { zoneStatus, extendedStatus, zoneId, delay });
        
        this.processZoneStatus(zoneStatus);
    }

    processZoneStatus(zoneStatus, isInitial = false) {
        this.log('Processing zone status:', zoneStatus);
        
        // Parse zone status into readable format
        const status = this.parseZoneStatus(zoneStatus);
        this.log('Parsed status:', status);

        // Handle the parsed status
        this.handleStatus(status, isInitial);

        // Update heartbeat and check connectivity
        this.lastHeartbeat = new Date();
        this.checkConnectivityPassive();
    }

    parseZoneStatus(zoneStatus) {
        return {
            gasDetected: zoneStatus.alarm1 || false,
            malfunction: zoneStatus.trouble || false,
            isTest: zoneStatus.test || false,
            isRestore: zoneStatus.restoreReports || false,
            isSupervision: zoneStatus.supervisionReports || false
        };
    }

    handleStatus(status, isInitial = false) {
        // Update capabilities - Homey handles native flows automatically
        this.safeSetCapability('alarm_gas', status.gasDetected);
        this.safeSetCapability('alarm_problem', status.malfunction);
    }

    safeSetCapability(capability, value) {
        if (this.getCapabilityValue(capability) !== value) {
            this.setCapabilityValue(capability, value)
                .then(() => this.log(`Updated ${capability} to:`, value))
                .catch(err => this.error(`Set ${capability} failed:`, err));
        }
    }

    onZoneEnrollRequest(payload) {
        this.log('Zone enroll request received:', payload);
        
        const iasZone = this.zclNode.endpoints[1].clusters[CLUSTER.IAS_ZONE.NAME];
        if (!iasZone) return;

        iasZone.zoneEnrollResponse({
            enrollResponseCode: 0,
            zoneId: this.zoneId,
        }).then(() => {
            this.log('Zone enroll response sent');
        }).catch(err => {
            this.error('Zone enroll response failed:', err);
        });
    }

    startHealthCheck() {
        this.log('Passive health monitoring enabled - no periodic checks');
    }

    checkConnectivityPassive() {
        const now = new Date();
        const timeSinceLastHeartbeat = now - this.lastHeartbeat;
        
        // Log if device was offline for a while
        if (timeSinceLastHeartbeat > 30 * 60 * 1000) { // 30 minutes
            this.log('Device back online after', Math.round(timeSinceLastHeartbeat / 60000), 'minutes');
        }
        
        this.lastHeartbeat = now;
    }

    // Helper methods for conditions
    async isGasAlarmOn() {
        return this.getCapabilityValue('alarm_gas') === true;
    }

    async isDeviceMalfunction() {
        return this.getCapabilityValue('alarm_problem') === true;
    }

    onDeleted() {
        this.log('Gas Detector removed');
    }

}

module.exports = GasSensorDevice;