'use strict';

const { ColorControlCluster, ZCLDataTypes } = require('zigbee-clusters');

class TuyaColorControlCluster extends ColorControlCluster {

    static get ATTRIBUTES() {
        return {
            // Mandatory if colorCapabilities = hueAndSaturation
            // Reportable, read-only
            currentHue: { id: 0, type: ZCLDataTypes.uint8 },

            // Mandatory if colorCapabilities = hueAndSaturation
            // Reportable, read-only
            currentSaturation: { id: 1, type: ZCLDataTypes.uint8 },

            // Mandatory
            // Reportable, read-only
            currentX: { id: 3, type: ZCLDataTypes.uint16 },

            // Mandatory
            // Reportable, read-only
            currentY: { id: 4, type: ZCLDataTypes.uint16 },

            // Mandatory if colorCapabilities = colorTemperature
            // Reportable, read-only
            colorTemperatureMireds: { id: 7, type: ZCLDataTypes.uint16 },

            // Mandatory, read-only
            colorMode: {
                id: 8,
                type: ZCLDataTypes.enum8({
                    currentHueAndCurrentSaturation: 0,
                    currentXAndCurrentY: 1,
                    colorTemperatureMireds: 2
                })
            },
            tuyaBrightness: {
                id: 61441,
                type: ZCLDataTypes.uint16
            },
            tuyaRgbMode: {
                id: 61440,
                type: ZCLDataTypes.uint16
            }
        };
    }

    static get COMMANDS() {
        return {
            moveToHue: {
                id: 0,
                args: {
                    hue: ZCLDataTypes.uint8,
                    direction: ZCLDataTypes.enum8({ // TODO: ?
                        shortestDistance: 0,
                        longestDistance: 1,
                        up: 2,
                        down: 3,
                    }),
                    transitionTime: ZCLDataTypes.uint16,
                },
            },
            moveToSaturation: {
                id: 3,
                args: { // TODO
                    saturation: ZCLDataTypes.uint8,
                    transitionTime: ZCLDataTypes.uint16,
                },
            },
            moveToHueAndSaturation: {
                id: 6,
                args: {
                    hue: ZCLDataTypes.uint8,
                    saturation: ZCLDataTypes.uint8,
                    transitionTime: ZCLDataTypes.uint16,
                    value: ZCLDataTypes.uint8
                }
            },
            moveToColor: {
                id: 7,
                args: {
                    colorX: ZCLDataTypes.uint16,
                    colorY: ZCLDataTypes.uint16,
                    transitionTime: ZCLDataTypes.uint16,
                },
            },
            moveToColorTemperature: {
                id: 10,
                args: {
                    colorTemperature: ZCLDataTypes.uint16,
                    transitionTime: ZCLDataTypes.uint16,
                },
            },

            tuyaRgbMode: {
                id: 240,
                args: {
                    enable: ZCLDataTypes.uint8
                }
            }
        };
    }

}

module.exports = TuyaColorControlCluster;