'use strict';

const BaseDevice = require('../switch_3_gang/device');
const withInputType = require('../../lib/TuyaRelayModuleInputType');

module.exports = withInputType(BaseDevice, 3);
