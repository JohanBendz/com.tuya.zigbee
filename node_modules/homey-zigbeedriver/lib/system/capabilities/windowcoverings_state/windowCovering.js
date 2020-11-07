'use strict';

const commandMap = {
  up: 'upOpen',
  idle: 'stop',
  down: 'downClose',
};

/**
 * Cluster capability configuration for `windowcoverings_state`.
 * @type {ClusterCapabilityConfiguration}
 */
module.exports = {
  set: value => commandMap[value],
  setParser: () => ({}),
};
