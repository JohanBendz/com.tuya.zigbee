'use strict';

const { ZigBeeDevice} = require('homey-zigbeedriver');
const { CLUSTER, Cluster } = require('zigbee-clusters');
const TuyaColorControlCluster = require('./TuyaColorControlCluster');

Cluster.addCluster(TuyaColorControlCluster);

const {
    limitValue,
    calculateLevelControlTransitionTime,
    calculateColorControlTransitionTime,
    wrapAsyncWithRetry,
    wait
} = require('./util');

const MAX_HUE = 254;
const MAX_DIM = 254;
const MAX_SATURATION = 254;
const MAX_COLORTEMPERATURE = 254;

const CURRENT_LEVEL = 'currentLevel';

const onoffCapabilityDefinition = {
    capabilityId: 'onoff',
    cluster: CLUSTER.ON_OFF,
    userOpts: {
        getOpts: {
            getOnStart: true,
            getOnOnline: true // When the light is powered off, and powered on again it often issues
            // an end device announce, this is a good moment to update the capability value in Homey
        }
    }
};

const dimCapabilityDefinition = {
    capabilityId: 'dim',
    cluster: CLUSTER.LEVEL_CONTROL,
    userOpts: {
        getOpts: {
            getOnStart: true,
            getOnOnline: true // When the light is powered off, and powered on again it often issues
            // an end device announce, this is a good moment to update the capability value in Homey
        }
    }
};

const lightHueCapabilityDefinition = {
    capabilityId: 'light_hue',
    cluster: CLUSTER.COLOR_CONTROL
};

const lightSaturationCapabilityDefinition = {
    capabilityId: 'light_saturation',
    cluster: CLUSTER.COLOR_CONTROL
};

const lightTemperatureCapabilityDefinition = {
    capabilityId: 'light_temperature',
    cluster: CLUSTER.COLOR_CONTROL,
    userOpts: {
        set: 'moveToColorTemperature',
        setParser(value, opts2 = {}) {
            const colorTemperature = Math.round(value * MAX_COLORTEMPERATURE);
            return {
                colorTemperature,
                transitionTime: calculateColorControlTransitionTime(opts2)
            };
        },
        get: 'colorTemperatureMireds',
        getOpts: {
            getOnStart: true,
            getOnOnline: true
        },
        report: 'colorTemperatureMireds',
        reportParser(value) {
            return 1 - (value / MAX_COLORTEMPERATURE);
        }
    }
};

const lightModeCapabilityDefinition = {
    capabilityId: 'light_mode',
    cluster: CLUSTER.COLOR_CONTROL,
    userOpts: {
        set: 'moveToColorTemperature',
        setParser(lightMode, opts = {}) {
            const colorControlEndpoint = this.getClusterEndpoint(CLUSTER.COLOR_CONTROL);
            if (colorControlEndpoint === null) throw new Error('missing_color_control_cluster');
            const colorControlCluster = this.zclNode.endpoints[colorControlEndpoint].clusters.colorControl;
            switch (lightMode) {
                case 'temperature': {
                    const colorTemperature = Math.round(value * MAX_COLORTEMPERATURE);
                    const moveToColorTemperatureCommand = {
                        colorTemperature,
                        transitionTime: calculateColorControlTransitionTime(opts),
                    };

                    this.debug('set → `light_mode`: \'temperature\' → setParser → tuyaRgbMode', { enable: 0 });
                    colorControlCluster.tuyaRgbMode({ enable: 0 })
                        .then(res => {
                            this.debug('set → `light_mode`: \'temperature\' → setParser → tuyaRgbMode'
                                + ' success', res);
                            return null; // Return `null` to prevent the default command from being send
                        })
                        .catch(err => {
                            this.error('Error: could not set → `light_mode`: \'temperature\' → setParser →'
                                + ' tuyaRgbMode', err);
                            throw err;
                        });
                    this.debug('set → `light_mode`: \'temperature\' → setParser → moveToColorTemperature', moveToColorTemperatureCommand);
                    return colorControlCluster.moveToColorTemperature(moveToColorTemperatureCommand)
                        .then(res => {
                            this.debug('set → `light_mode`: \'temperature\' → setParser → moveToColorTemperature'
                                + ' success', res);
                            return null; // Return `null` to prevent the default command from being send
                        })
                        .catch(err => {
                            this.error('Error: could not set → `light_mode`: \'temperature\' → setParser →'
                                + ' moveToColorTemperature', err);
                            throw err;
                        });
                }
                case 'color': {
                    const lightHue = this.getCapabilityValue('light_hue');
                    const lightSaturation = this.getCapabilityValue('light_saturation');
                    const lightValue = this.getCapabilityValue('dim');
                    const moveToHueAndSaturation = {
                        hue: Math.round(lightHue * MAX_HUE),
                        saturation: Math.round(lightSaturation * MAX_SATURATION),
                        transitionTime: calculateColorControlTransitionTime(opts),
                        value: Math.round(lightValue * MAX_DIM)
                    };

                    this.debug('set → `light_mode`: \'temperature\' → setParser → tuyaRgbMode', { enable: 1 });
                    colorControlCluster.tuyaRgbMode({ enable: 1 })
                        .then(res => {
                            this.debug('set → `light_mode`: \'temperature\' → setParser → tuyaRgbMode'
                                + ' success', res);
                            return null; // Return `null` to prevent the default command from being send
                        })
                        .catch(err => {
                            this.error('Error: could not set → `light_mode`: \'temperature\' → setParser →'
                                + ' tuyaRgbMode', err);
                            throw err;
                        });

                    this.debug('set → `light_mode`: \'color\' → setParser → moveToHueAndSaturation', moveToHueAndSaturation);

                    return colorControlCluster.moveToHueAndSaturation(moveToHueAndSaturation)
                        .then(res => {
                            this.debug('set → `light_mode`: \'color\' → setParser → moveToHueAndSaturation'
                                + ' success', res);
                            return null; // Return `null` to prevent the default command from being send
                        })
                        .catch(err => {
                            this.error('Error: could not set → `light_mode`: \'color\' → setParser →'
                                + ' moveToHueAndSaturation', err);
                            throw err;
                        });
                }
                default:
                    return null;
            }
        },
        get: 'colorMode',
        getOpts: {
            getOnStart: true,
            getOnOnline: true,
        },
        report: 'colorMode',
        async reportParser(colorMode) {
            switch (colorMode) {
                case 'currentHueAndCurrentSaturation':
                case 'currentXAndCurrentY': {
                    this.debug(`\`light_mode\` → reportParser → colorMode: ${colorMode} → parsed: 'color'`);
                    return 'color';
                }
                default:
                    this.debug(`\`light_mode\` → reportParser → colorMode: ${colorMode} → parsed: 'temperature'`);
                    return 'temperature';
            }
        },
    }
};


class TuyaZigBeeLightDevice extends ZigBeeDevice {

    async onNodeInit({ zclNode }) {
        // TODO: remove when stable
        this.enableDebug();

        await wrapAsyncWithRetry(this.readColorControlAttributes.bind(this));

        // Register `onoff` and `dim` capabilities if device has both
        if (this.hasCapability('onoff') && this.hasCapability('dim')) {
            this.registerOnOffAndDimCapabilities({ zclNode });
        }

        // Register color related capabilities if device has one of the following
        if (this.hasCapability('light_hue')
            || this.hasCapability('light_saturation')
            || this.hasCapability('light_mode')
            || this.hasCapability('light_temperature')
        ) {
            await this.registerColorCapabilities({ zclNode });
        }

        await zclNode.endpoints[1].clusters.basic.readAttributes(['manufacturerName', 'zclVersion', 'appVersion', 'modelId', 'powerSource', 'attributeReportingStatus'])
        .catch(err => {
            this.error('Error when reading device attributes ', err);
        });

        this.log('TuyaZigBeeLightDevice is initialized');
    }

    get levelControlCluster() {
        const levelControlClusterEndpoint = this.getClusterEndpoint(CLUSTER.LEVEL_CONTROL);
        if (levelControlClusterEndpoint === null) throw new Error('missing_level_control_cluster');
        return this.zclNode.endpoints[levelControlClusterEndpoint].clusters.levelControl;
    }

    get onOffCluster() {
        const onOffClusterEndpoint = this.getClusterEndpoint(CLUSTER.ON_OFF);
        if (onOffClusterEndpoint === null) throw new Error('missing_on_off_cluster');
        return this.zclNode.endpoints[onOffClusterEndpoint].clusters.onOff;
    }

    get colorControlCluster() {
        const colorControlEndpoint = this.getClusterEndpoint(CLUSTER.COLOR_CONTROL);
        if (colorControlEndpoint === null) throw new Error('missing_color_control_cluster');
        return this.zclNode.endpoints[colorControlEndpoint].clusters['colorControl'];
    }

    async readColorControlAttributes() {
        this.log('readColorControlAttributes()');
        return this.colorControlCluster.readAttributes( ['colorTemperatureMireds', 'currentHue', 'currentSaturation', 'colorMode', 'currentX', 'currentY'] )
            .then(async ({
                colorTemperatureMireds, currentHue, currentSaturation, colorMode, currentX, currentY
            }) => {
                //await this.setStoreValue('colorClusterConfigured', true);

                this.log('read configuration attributes', {
                    colorTemperatureMireds,
                    currentHue,
                    currentSaturation,
                    colorMode,
                    currentX,
                    currentY
                });
            })
            .catch(err => {
                this.error('Error: could not read color control attributes', err);
            });
    }

    registerOnOffAndDimCapabilities({ zclNode }) {
        // Register multiple capabilities, they will be debounced when one of them is called
        this.registerMultipleCapabilities(
            [onoffCapabilityDefinition, dimCapabilityDefinition],
            // eslint-disable-next-line consistent-return
            (valueObj = {}, optsObj = {}) => {
                const onoffChanged = typeof valueObj.onoff === 'boolean';
                const dimChanged = typeof valueObj.dim === 'number';

                this.log('capabilities changed', { onoffChanged, dimChanged });

                if (onoffChanged && dimChanged) {
                    if (valueObj.onoff && valueObj.dim > 0) {
                        // Bulb is turned on and dimmed to a value, then just dim
                        return this.changeDimLevel(valueObj.dim, { ...optsObj.dim });
                    }
                    if (valueObj.onoff === false) {
                        // Bulb is turned off and dimmed to a value, then turn off
                        return this.changeOnOff(false); // Turn off
                    }
                    if (valueObj.onoff === true && valueObj.dim === 0) {
                        // Device is turned on and dimmed to zero, then just turn off
                        return this.changeDimLevel(0, { ...optsObj.dim });
                    }
                } else if (onoffChanged) {
                    // Device is only turned on/off, request new dim level afterwards
                    return this.changeOnOff(valueObj.onoff);
                } else if (dimChanged) {
                    // Bulb is only dimmed
                    return this.changeDimLevel(valueObj.dim, { ...optsObj.dim });
                }
            },
        );
    }

    async registerColorCapabilities({ zclNode }) {
        // Register debounced capabilities
        const groupedCapabilities = [];
        if (this.hasCapability('light_hue')) {
            groupedCapabilities.push(lightHueCapabilityDefinition);
        }
        if (this.hasCapability('light_saturation')) {
            groupedCapabilities.push(lightSaturationCapabilityDefinition);
        }
        if (this.hasCapability('light_temperature')) {
            groupedCapabilities.push(lightTemperatureCapabilityDefinition);
        }
        if (this.hasCapability('light_mode')) {
            groupedCapabilities.push(lightModeCapabilityDefinition);
        }

        // Register multiple capabilities, they will be debounced when one of them is called
        // eslint-disable-next-line consistent-return
        this.registerMultipleCapabilities(groupedCapabilities, (valueObj, optsObj) => {
            const lightHueChanged = typeof valueObj.light_hue === 'number';
            const lightSaturationChanged = typeof valueObj.light_saturation === 'number';
            const lightTemperatureChanged = typeof valueObj.light_temperature === 'number';
            const lightModeChanged = typeof valueObj.light_mode === 'string';

            this.log('capabilities changed', {
                lightHueChanged, lightSaturationChanged, lightTemperatureChanged, lightModeChanged
            });

            // If a color capability changed or light mode was changed to color, change the color
            if (lightHueChanged || lightSaturationChanged || (lightModeChanged && valueObj.light_mode === 'color')) {
                return this.changeColor(
                    { hue: valueObj.light_hue, saturation: valueObj.light_saturation, value: null },
                    { ...optsObj.light_saturation, ...optsObj.light_hue }
                ).catch(err => {
                    if (err && err.message && err.message.includes('FAILURE')) {
                        throw new Error('Make sure the device is turned on before changing its color.');
                    }
                    throw err;
                });
            }

            // If the light temperature was changed or the light mode was changed to temperature,
            // change the temperature
            if (lightTemperatureChanged || (lightModeChanged && valueObj.light_mode === 'temperature')) {
                return this.changeColorTemperature(
                    valueObj.light_temperature,
                    { ...optsObj.light_temperature }
                    ).catch(err => {
                        if (err && err.message && err.message.includes('FAILURE')) {
                            throw new Error('Make sure the device is turned on before changing its color temperature.');
                        }
                        throw err;
                    });
            }

        });
    }

    async changeOnOff(onoff) {
        this.log('changeOnOff() →', onoff);
        return this.onOffCluster[onoff ? 'setOn' : 'setOff']()
            .then(async result => {
                if (onoff === false) {
                    await this.setCapabilityValue('dim', 0).catch(this.error); // Set dim to zero when turned off
                } else if (onoff) {
                    // Wait for a little while, some devices do not directly update their currentLevel
                    await wait(1000)
                        .then(async () => {
                            // Get current level attribute to update dim level
                            const { currentLevel } = await this.levelControlCluster.readAttributes([CURRENT_LEVEL]);
                            this.debug('changeOnOff() →', onoff, { currentLevel });
                            // Always set dim to 0.01 or higher since bulb is turned on
                            await this.setCapabilityValue('dim', Math.max(0.01, currentLevel / MAX_DIM)).catch(this.error);
                        })
                        .catch(err => {
                            this.error('Error: could not update dim capability value after `onoff` change', err);
                        });
                }
                return result;
            });
    }

    async changeDimLevel(dim, opts = {}) {
        this.log('changeDimLevel() →', dim);


        const moveToLevelWithOnOffCommand = {
            level: Math.round(dim * MAX_DIM),
            transitionTime: calculateLevelControlTransitionTime(opts)
        };

        const moveToLevelCommand = {
            level: Math.round(dim * MAX_DIM),
            transitionTime: calculateLevelControlTransitionTime(opts)
        };


        if (!this.hasCapability('light_mode') && this.hasCapability('light_temperature')) {
            this.log("No light_mode and has temperature capability");

            // Execute dim
            //Changed from moveToLevelWithOnOffCommand since Tuya devices reported wrong attribute for onoff
            this.debug('changeDimLevel() → ', dim, moveToLevelCommand);

            if (dim === 0) // Added code to turn off the device on dim to 0 since we don't use moveToLevelWithOnOffCommand
            return this.changeOnOff(false)
                .then(async result => {
                    await this.setCapabilityValue('onoff', false).catch(this.error);
                    return result;
                });

            //Changed from moveToLevelWithOnOffCommand since Tuya devices reported wrong attribute for onoff
            return this.levelControlCluster.moveToLevel(moveToLevelCommand)
                .then(async result => {
                    // Update onoff value
                    if (dim === 0) {
                        await this.setCapabilityValue('onoff', false).catch(this.error);
                    } else if (this.getCapabilityValue('onoff') === false && dim > 0) {
                        await this.setCapabilityValue('onoff', true).catch(this.error);
                    }
                    return result;
                });
        }
        
        if (this.hasCapability('light_mode') && this.getCapabilityValue('light_mode') === 'temperature') {
            this.log("light_mode and it's at temperature");
            // Execute dim
            //Changed from moveToLevelWithOnOffCommand since Tuya devices reported wrong attribute for onoff
            this.debug('changeDimLevel() → ', dim, moveToLevelCommand);

            if (dim === 0) // Added code to turn off the device on dim to 0 since we don't use moveToLevelWithOnOffCommand
            return this.changeOnOff(false)
                .then(async result => {
                    await this.setCapabilityValue('onoff', false).catch(this.error);
                    return result;
                });

            //Changed from moveToLevelWithOnOffCommand since Tuya devices reported wrong attribute for onoff
            return this.levelControlCluster.moveToLevel(moveToLevelCommand)
                .then(async result => {
                    // Update onoff value
                    if (dim === 0) {
                        await this.setCapabilityValue('onoff', false).catch(this.error);
                    } else if (this.getCapabilityValue('onoff') === false && dim > 0) {
                        await this.setCapabilityValue('onoff', true).catch(this.error);
                    }
                    return result;
                });
        }

        if (this.hasCapability('light_mode') && this.getCapabilityValue('light_mode') === 'color') {
            this.log("Light_mode and it's at color");
            const hvc = {
                hue: null,
                saturation: null,
                value: dim
            };

            if (dim === 0) // Added code to turn off the device on dim to 0 since we don't use moveToLevelWithOnOffCommand
            return this.changeOnOff(false)
                .then(async result => {
                    await this.setCapabilityValue('onoff', false).catch(this.error);
                    return result;
                });

            if (this.hasCapability('light_hue')
                || this.hasCapability('light_saturation')
            )
            return this.changeColor(hvc)
                .then(async result => {
                    // Update onoff value
                    if (dim === 0) {
                        await this.setCapabilityValue('onoff', false).catch(this.error);
                    } else if (this.getCapabilityValue('onoff') === false && dim > 0) {
                        await this.setCapabilityValue('onoff', true).catch(this.error);
                    }
                    return result;
                });
        }
    }

    async changeColorTemperature(temperature, opts = {}) {
        this.log('changeColorTemperature() →', temperature);

        // Determine value with fallback to current light_saturation capability value or 1
        if (typeof temperature !== 'number') {
            if (typeof this.getCapabilityValue('light_temperature') === 'number') {
                temperature = this.getCapabilityValue('light_temperature');
            } else {
                temperature = 1;
            }
        }

        // Update light_mode capability if necessary
        if (this.hasCapability('light_mode')
            && this.getCapabilityValue('light_mode') !== 'temperature') {
            await this.setCapabilityValue('light_mode', 'temperature').catch(this.error);
        }

        // Execute move to color temperature command
         const moveToColorTemperatureCommand = {
            colorTemperature: Math.round(MAX_COLORTEMPERATURE - (temperature * MAX_COLORTEMPERATURE)),
            transitionTime: calculateColorControlTransitionTime(opts)
        };
        this.debug(`changeColorTemperature() → ${temperature} →`, moveToColorTemperatureCommand);

        try {
            await this.colorControlCluster.tuyaRgbMode({ enable: 0 });
            return await this.colorControlCluster.moveToColorTemperature(moveToColorTemperatureCommand);
        } catch (error) {
            this.error('changeColorTemperature() failed:', error);
        }
    }

    async changeColor({ hue, saturation, value }, opts = {}) {
        this.log('changeColor() →', { hue, saturation, value });

        // Determine value with fallback to current light_saturation capability value or 1
        if (typeof saturation !== 'number') {
            if (typeof this.getCapabilityValue('light_saturation') === 'number') {
                saturation = this.getCapabilityValue('light_saturation');
            } else {
                saturation = 1;
            }
        }

        // Determine value with fallback to current light_saturation capability value or 1
        if (typeof hue !== 'number') {
            if (typeof this.getCapabilityValue('light_hue') === 'number') {
                hue = this.getCapabilityValue('light_hue');
            } else {
                hue = 1;
            }
        }

        // Determine value with fallback to current dim capability value or 1
        if (typeof value !== 'number') {
            value = this.getCapabilityValue('dim') || 1;
        }

        // Update light_mode capability if necessary
        if (this.hasCapability('light_mode'
            && this.getCapabilityValue('light_mode') !== 'color')) {
            await this.setCapabilityValue('light_mode', 'color').catch(this.error);
        }


        // Execute move to hue and saturation command
        const moveToHueAndSaturationCommand = {
            hue: Math.round(hue * MAX_HUE),
            saturation: Math.round(saturation * MAX_SATURATION),
            transitionTime: calculateColorControlTransitionTime(opts),
            value: Math.round(value * MAX_DIM)
        };

        this.debug('changeColor() → hue and saturation', moveToHueAndSaturationCommand);

        try {
            // Enable RGB Mode
            await this.colorControlCluster.tuyaRgbMode({ enable: 1 });

            // Move to the specified hue and saturation
            await this.colorControlCluster.moveToHueAndSaturation(moveToHueAndSaturationCommand);

            return true;
        } catch (error) {
            // Log the error and return false
            this.error('changeColor() → failed to change color', error);
            return false;
        }
    }

    async onEndDeviceAnnounce() {
        // Try and get color control cluster
        let colorControlCluster;
        try {
            colorControlCluster = this.colorControlCluster;
        } catch (err) {
            // Device does not support the color control cluster, skip
            return;
        }

        let colorControlAttributes;
        try {
            colorControlAttributes = await colorControlCluster.readAttributes(
                ['currentSaturation', 'currentHue', 'colorMode', 'colorTemperatureMireds'],
            );
            this.log('onEndDeviceAnnounce → read color control attributes', colorControlAttributes);
        } catch (err) {
            this.error('onEndDeviceAnnounce → Error: failed to read color control attributes', err);
            return;
        }

        const {
            currentSaturation,
            currentHue,
            colorMode,
            colorTemperatureMireds
        } = colorControlAttributes;

        // If device supports hue and saturation fetch it and update the capability values
        if (typeof currentHue === 'number' && typeof currentSaturation === 'number') {
            await this.setCapabilityValue('light_hue', currentHue / MAX_HUE).catch(this.error);
            await this.setCapabilityValue('light_saturation', currentSaturation / MAX_SATURATION).catch(this.error);
        }

        // Determine the light_mode
        if (this.hasCapability('light_mode')) {
            await this.setCapabilityValue('light_mode', colorMode === 'colorTemperatureMireds' ? 'temperature' : 'color').catch(this.error);
        }

        // If device supports color temperature and current color temperature is provided
        // TYUA color temperature values are oposite of normal
        if (typeof colorTemperatureMireds === 'number') {
            await this.setCapabilityValue('light_temperature',1-(colorTemperatureMireds / MAX_COLORTEMPERATURE)).catch(this.error);
        }
    }

}

module.exports = TuyaZigBeeLightDevice;