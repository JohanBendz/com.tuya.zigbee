'use strict';

const BaseDevice = require('../switch_2_gang/device');
const withInputType = require('../../lib/TuyaRelayModuleInputType');

module.exports = withInputType(BaseDevice, 2);
