'use strict';

const LIGHT_COLOR_CAPABILITIES = [
    'onoff',
    'dim',
    'light_hue',
    'light_saturation',
    'light_temperature',
    'light_mode',
];

const LIGHT_WHITE_AMBIANCE_CAPABILITIES = [
    'onoff',
    'dim',
    'light_temperature',
];

/**
 * Reference profiles derived from the current SDK3 light drivers.
 *
 * These profiles are intentionally marked as "legacy-reference". They are not
 * wired into a new Homey driver yet and therefore do not change pairing
 * behaviour for any existing device.
 *
 * New devices should use status "active" once a type-based driver exists.
 */
module.exports = [
    {
        id: 'legacy-light-rgb-bulb-e14',
        deviceType: 'light',
        protocol: 'zcl-light',
        status: 'legacy-reference',
        sourceDriver: 'rgb_bulb_E14',
        capabilities: LIGHT_COLOR_CAPABILITIES,
        matchers: [{
            manufacturerName: ['_TZ3000_odygigth'],
            productId: ['TS0505A'],
        }],
    },
    {
        id: 'legacy-light-rgb-bulb-e27',
        deviceType: 'light',
        protocol: 'zcl-light',
        status: 'legacy-reference',
        sourceDriver: 'rgb_bulb_E27',
        capabilities: LIGHT_COLOR_CAPABILITIES,
        matchers: [{
            manufacturerName: [
                '_TZ3000_dbou1ap4',
                '_TZ3000_keabpigv',
                '_TZ3000_12sxjap4',
                '_TZ3000_hlijwsai',
                '_TZ3000_qd7hej8u',
                '_TZ3210_mja6r5ix',
                '_TZ3000_q50zhdsc',
                'eWeLight',
            ],
            productId: ['TS0505A', 'TS0505B', 'ZB-CL01'],
        }],
    },
    {
        id: 'legacy-light-rgb-spot-gu10',
        deviceType: 'light',
        protocol: 'zcl-light',
        status: 'legacy-reference',
        sourceDriver: 'rgb_spot_GU10',
        capabilities: LIGHT_COLOR_CAPABILITIES,
        matchers: [{
            manufacturerName: ['_TZ3000_kdpxju99'],
            productId: ['TS0505A'],
        }],
    },
    {
        id: 'legacy-light-rgb-mood-light',
        deviceType: 'light',
        protocol: 'zcl-light',
        status: 'legacy-reference',
        sourceDriver: 'rgb_mood_light',
        capabilities: LIGHT_COLOR_CAPABILITIES,
        matchers: [{
            manufacturerName: ['_TZ3000_9cpuaca6', '_TZ3210_r0xgkft5'],
            productId: ['TS0505A', 'TS0505B'],
        }],
    },
    {
        id: 'legacy-light-tunable-bulb-e14',
        deviceType: 'light',
        protocol: 'zcl-light',
        status: 'legacy-reference',
        sourceDriver: 'tunable_bulb_E14',
        capabilities: LIGHT_WHITE_AMBIANCE_CAPABILITIES,
        matchers: [{
            manufacturerName: ['_TZ3000_oborybow'],
            productId: ['TS0502A'],
        }],
    },
    {
        id: 'legacy-light-tunable-bulb-e27',
        deviceType: 'light',
        protocol: 'zcl-light',
        status: 'legacy-reference',
        sourceDriver: 'tunable_bulb_E27',
        capabilities: LIGHT_WHITE_AMBIANCE_CAPABILITIES,
        matchers: [{
            manufacturerName: ['_TZ3000_49qchf10'],
            productId: ['TS0502A'],
        }],
    },
    {
        id: 'legacy-light-tunable-spot-gu10',
        deviceType: 'light',
        protocol: 'zcl-light',
        status: 'legacy-reference',
        sourceDriver: 'tunable_spot_GU10',
        capabilities: LIGHT_WHITE_AMBIANCE_CAPABILITIES,
        matchers: [{
            manufacturerName: ['_TZ3000_el5kt5im'],
            productId: ['TS0502A'],
        }],
    },
    {
        id: 'legacy-light-rgb-light-bar',
        deviceType: 'light',
        protocol: 'zcl-light',
        status: 'legacy-reference',
        sourceDriver: 'rgb_led_light_bar',
        capabilities: LIGHT_COLOR_CAPABILITIES,
        matchers: [{
            manufacturerName: ['_TZ3000_gek6snaj', '_TZ3210_iystcadi'],
            productId: ['TS0505A', 'TS0505B'],
        }],
    },
    {
        id: 'legacy-light-rgb-wall-light',
        deviceType: 'light',
        protocol: 'zcl-light',
        status: 'legacy-reference',
        sourceDriver: 'rgb_wall_led_light',
        capabilities: LIGHT_COLOR_CAPABILITIES,
        matchers: [{
            manufacturerName: ['_TZ3000_utagpnzs', '_TZ3000_5bsf8vaj'],
            productId: ['TS0505A'],
        }],
    },
    {
        id: 'legacy-light-rgb-floor-light',
        deviceType: 'light',
        protocol: 'zcl-light',
        status: 'legacy-reference',
        sourceDriver: 'rgb_floor_led_light',
        capabilities: LIGHT_COLOR_CAPABILITIES,
        matchers: [{
            manufacturerName: ['_TZ3000_8uaoilu9'],
            productId: ['TS0502A'],
        }],
    },
    {
        id: 'legacy-light-rgb-garden-spot',
        deviceType: 'light',
        protocol: 'zcl-light',
        status: 'legacy-reference',
        sourceDriver: 'rgb_spot_GardenLight',
        capabilities: LIGHT_COLOR_CAPABILITIES,
        matchers: [{
            manufacturerName: ['_TZ3000_h1jnz6l8'],
            productId: ['TS0505A'],
        }],
    },
    {
        id: 'legacy-light-rgb-ceiling-light',
        deviceType: 'light',
        protocol: 'zcl-light',
        status: 'legacy-reference',
        sourceDriver: 'rgb_ceiling_led_light',
        capabilities: LIGHT_COLOR_CAPABILITIES,
        matchers: [{
            manufacturerName: ['_TZ3210_x13bu7za'],
            productId: ['TS0505B'],
        }],
    },
    {
        id: 'legacy-light-dimmable-recessed-led',
        deviceType: 'light',
        protocol: 'zcl-light',
        status: 'legacy-reference',
        sourceDriver: 'dimmable_recessed_led',
        capabilities: LIGHT_WHITE_AMBIANCE_CAPABILITIES,
        matchers: [{
            manufacturerName: ['_TZ3210_zdrhqmo0'],
            productId: ['TS0502B'],
        }],
    },
    {
        id: 'legacy-light-rgb-led-strip',
        deviceType: 'light',
        protocol: 'zcl-light',
        status: 'legacy-reference',
        sourceDriver: 'rgb_led_strip',
        capabilities: LIGHT_COLOR_CAPABILITIES,
        matchers: [{
            manufacturerName: ['_TZ3000_riwp3k79'],
            productId: ['TS0505A'],
        }],
    },
    {
        id: 'legacy-light-dimmable-led-strip',
        deviceType: 'light',
        protocol: 'zcl-light',
        status: 'legacy-reference',
        sourceDriver: 'dimmable_led_strip',
        capabilities: LIGHT_WHITE_AMBIANCE_CAPABILITIES,
        matchers: [{
            manufacturerName: ['_TZ3210_invesber'],
            productId: ['TS0502B'],
        }],
    },
];
