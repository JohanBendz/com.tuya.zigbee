'use strict';

const { Cluster } = require('zigbee-clusters');
const TuyaSpecificCluster = require('../../lib/TuyaSpecificCluster');
const TuyaSpecificClusterDevice = require('../../lib/TuyaSpecificClusterDevice');

Cluster.addCluster(TuyaSpecificCluster);

const dataPoints = {
  control: 1,      // TUYA_DP_ID_CONTROL: enum (0=OPEN, 1=STOP, 2=CLOSE)
  position: 2,     // TUYA_DP_ID_PERCENT_CONTROL: value (0-100% control)
  state: 3,        // TUYA_DP_ID_PERCENT_STATE: value (current position state)
  motorReverse: 4,
  motorSpeed: 5,
}

// Tuya standard control values
const TUYA_CONTROL_OPEN = 0;
const TUYA_CONTROL_STOP = 1;
const TUYA_CONTROL_CLOSE = 2;

const dataTypes = {
  raw: 0, // [ bytes ]
  bool: 1, // [0/1]
  value: 2, // [ 4 byte value ]
  string: 3, // [ N byte string ]
  enum: 4, // [ 0-255 ]
  bitmap: 5, // [ 1,2,4 bytes ] as bits
};

const convertMultiByteNumberPayloadToSingleDecimalNumber = (chunks) => {
  let value = 0;

  for (let i = 0; i < chunks.length; i++) {
    value = value << 8;
    value += chunks[i];
  }

  return value;
};

const getDataValue = (dpValue) => {
  switch (dpValue.datatype) {
    case dataTypes.raw:
      return dpValue.data;
    case dataTypes.bool:
      return dpValue.data[0] === 1;
    case dataTypes.value:
      return convertMultiByteNumberPayloadToSingleDecimalNumber(dpValue.data);
    case dataTypes.string:
      let dataString = '';
      for (let i = 0; i < dpValue.data.length; ++i) {
        dataString += String.fromCharCode(dpValue.data[i]);
      }
      return dataString;
    case dataTypes.enum:
      return dpValue.data[0];
    case dataTypes.bitmap:
      return convertMultiByteNumberPayloadToSingleDecimalNumber(dpValue.data);
  }
}

class CurtainMotor extends TuyaSpecificClusterDevice {

  async onNodeInit({ zclNode }) {

    this.printNode();

    this.toggleState = 'idle';
    this.targetPosition = null;
    this.lastKnownPosition = undefined;

    // Listen to all tuya cluster events with detailed logging
    zclNode.endpoints[1].clusters.tuya.on("response", value => {
      this.log(`[TOGGLE] [TUYA_RESPONSE] Received response:`, JSON.stringify(value, null, 2));
      if (value && value.dp !== undefined) {
        this.updatePosition(value);
      }
    });

    zclNode.endpoints[1].clusters.tuya.on("datapoint", value => {
      this.log(`[TOGGLE] [TUYA_DATAPOINT] Received datapoint:`, JSON.stringify(value, null, 2));
      if (value && value.dp !== undefined) {
        this.updatePosition(value);
      }
    });

    zclNode.endpoints[1].clusters.tuya.on("reporting", value => {
      this.log(`[TOGGLE] [TUYA_REPORTING] Received reporting:`, JSON.stringify(value, null, 2));
      if (value && value.dp !== undefined) {
        this.updatePosition(value);
      }
    });

    // Add comprehensive event logging for ALL possible events
    const tuyaCluster = zclNode.endpoints[1].clusters.tuya;
    const originalEmit = tuyaCluster.emit;

    tuyaCluster.emit = function(event, ...args) {
      this.driver.log(`[TOGGLE] [TUYA_ALL_EVENTS] Event '${event}':`, JSON.stringify(args, null, 2));

      // Also check if args contain datapoint info
      if (args && args.length > 0) {
        for (let i = 0; i < args.length; i++) {
          if (args[i] && args[i].dp !== undefined) {
            this.driver.log(`[TOGGLE] [TUYA_ALL_EVENTS] Found datapoint in event '${event}', arg ${i}:`, JSON.stringify(args[i], null, 2));
            this.driver.updatePosition(args[i]);
          }
        }
      }

      return originalEmit.call(this, event, ...args);
    }.bind({ driver: this });

    // Also listen to windowCovering cluster for standard Zigbee position updates
    if (zclNode.endpoints[1].clusters.windowCovering) {
      this.log(`[TOGGLE] Setting up windowCovering cluster listeners`);

      zclNode.endpoints[1].clusters.windowCovering.on("attr.currentPositionLiftPercentage", value => {
        this.log(`[TOGGLE] [WINDOWCOVERING] currentPositionLiftPercentage:`, value);
        const pos = (100 - value) / 100; // invert percentage
        this.setCapabilityValue('windowcoverings_set', pos).catch(this.error);
        this.lastKnownPosition = pos;
      });

      zclNode.endpoints[1].clusters.windowCovering.on("attr.currentPositionLiftPercent100ths", value => {
        this.log(`[TOGGLE] [WINDOWCOVERING] currentPositionLiftPercent100ths:`, value);
        const pos = (10000 - value) / 10000; // invert percentage
        this.setCapabilityValue('windowcoverings_set', pos).catch(this.error);
        this.lastKnownPosition = pos;
      });
    }

    // Log all cluster events to find any position updates we might be missing
    Object.keys(zclNode.endpoints[1].clusters).forEach(clusterName => {
      const cluster = zclNode.endpoints[1].clusters[clusterName];
      if (cluster && cluster.emit) {
        const originalClusterEmit = cluster.emit;
        cluster.emit = function(event, ...args) {
          if (clusterName !== 'tuya') { // Already logged tuya above
            this.driver.log(`[TOGGLE] [${clusterName.toUpperCase()}] Event '${event}':`, JSON.stringify(args, null, 2));
          }
          return originalClusterEmit.call(this, event, ...args);
        }.bind({ driver: this });
      }
    });

    this.registerCapabilityListener('windowcoverings_set', value => this.setPosition(value));

    await zclNode.endpoints[1].clusters.basic.readAttributes(['manufacturerName', 'zclVersion', 'appVersion', 'modelId', 'powerSource', 'attributeReportingStatus'])
    .catch(err => {
        this.error('Error when reading device attributes ', err);
    });

    this.homey.flow
      .getActionCard('toggle_curtain')
      .registerRunListener(async (args, state) => {
        this.log(`[${args.device.getName()}] flow action 'toggle_curtain' card received`);
        await args.device.toggle();
      });

    // 커튼 포지션 확인 Condition 카드
    this.homey.flow
      .getConditionCard("get_curtain_position")
      .registerRunListener(async (args, state) => {
        const currentPosition = args.device.getCapabilityValue("windowcoverings_set");
        this.log(`[${args.device.getName()}] condition 'get_curtain_position' current position: ${currentPosition}`);
        return currentPosition;
      });

  }

  async setPosition(pos) {
    const reverse = this.getSettings().reverse == 1;
    const maxOpenPercentage = this.getSettings().max_open_percentage || 100;

    this.log(`[TOGGLE] [SET_POSITION] Called with pos: ${pos}, reverse: ${reverse}, maxOpen: ${maxOpenPercentage}`);

    if (pos > maxOpenPercentage / 100) {
      pos = maxOpenPercentage / 100;
    }

    if (pos === undefined) {
      pos = this.getCapabilityValue('pos');
    } else {
      pos = reverse ? 1 - pos : pos;
    }

    this.log(`[TOGGLE] [SET_POSITION] Final position to send: ${pos}, raw value: ${pos * 100}`);
    return this.writeData32(dataPoints.position, pos * 100);
  }

  async updatePosition(data) {
    const dp = data.dp;
    const value = getDataValue(data);
    const reverse = this.getSettings().reverse == 1;

    this.log(`[TOGGLE] [UPDATE_POSITION] Raw data - dp: ${dp}, value: ${value}, reverse: ${reverse}`);

    switch (dp) {
      case dataPoints.control:
        this.log(`[TOGGLE] [UPDATE_POSITION] Control update - dp: ${dp}, value: ${value}`);
        break;
      case dataPoints.position:
        this.log(`[TOGGLE] [UPDATE_POSITION] Position update - dp: ${dp}, value: ${value}`);
        const currentPos = reverse ? (100 - value) / 100 : value / 100;
        this.log(`[TOGGLE] [UPDATE_POSITION] Setting position to: ${currentPos}`);
        this.setCapabilityValue('windowcoverings_set', currentPos).catch(this.error);

        // Force position refresh to unstick values
        this.lastKnownPosition = currentPos;
        this.log(`[TOGGLE] [UPDATE_POSITION] Stored lastKnownPosition: ${this.lastKnownPosition}`);

        // Don't immediately set to idle on position updates - wait for arrived signal
        // This allows for stopping during movement
        if (this.toggleState === 'moving' && this.targetPosition !== null) {
          this.log(`[TOGGLE] [UPDATE_POSITION] Position moving state - current: ${currentPos}, target: ${this.targetPosition} (waiting for arrived signal)`);
        }
        break;
      case dataPoints.state:
        // DP3: Current position state (TUYA_DP_ID_PERCENT_STATE)
        const currentState = reverse ? (100 - (value & 0xFF)) / 100 : (value & 0xFF) / 100;

        this.log(`[TOGGLE] [UPDATE_POSITION] State update - raw value: ${value}, calculated position: ${currentState}`);

        // Always update the position when state signal is received
        this.setCapabilityValue('windowcoverings_set', currentState).catch(this.error);
        this.lastKnownPosition = currentState;

        // Reset to idle when we get a state update that indicates movement stopped
        if (this.toggleState === 'moving' || this.toggleState === 'stopping') {
          this.log(`[TOGGLE] [UPDATE_POSITION] Movement completed at position ${currentState} - setting state to idle`);
          this.toggleState = 'idle';
          this.targetPosition = null;
        } else {
          this.log(`[TOGGLE] [UPDATE_POSITION] Position update - current position: ${currentState}, state: ${this.toggleState}`);
        }
        break;
      case dataPoints.motorReverse:
        this.log(`[TOGGLE] [UPDATE_POSITION] Motor reverse - dp: ${dp}, value: ${value}`);
        break;
      case dataPoints.motorSpeed:
        this.log(`[TOGGLE] [UPDATE_POSITION] Motor speed - dp: ${dp}, value: ${value}`);
        if (value === 0 && (this.toggleState === 'moving' || this.toggleState === 'stopping')) {
          this.log(`[TOGGLE] [UPDATE_POSITION] Motor stopped (speed=0) - setting state to idle`);
          this.toggleState = 'idle';
          this.targetPosition = null;

          // Try to get current position when motor stops
          setTimeout(async () => {
            try {
              const currentActual = this.getCapabilityValue('windowcoverings_set');
              this.lastKnownPosition = currentActual;
              this.log(`[TOGGLE] [UPDATE_POSITION] Motor stopped - updated lastKnownPosition: ${this.lastKnownPosition}`);
            } catch (e) {
              this.log(`[TOGGLE] [UPDATE_POSITION] Failed to update position after motor stop:`, e);
            }
          }, 500);
        }
        break;
      default:
        this.log(`[TOGGLE] [UPDATE_POSITION] Unhandled dataPoint: ${dp}, value: ${value}`);
    }
  }

  onDeleted() {
    this.log("Curtain Motor removed")
  }

  async onSettings({oldSettings, newSettings, changedKeys}) {
    if (changedKeys.includes('reverse')) {
      this.setCapabilityValue('windowcoverings_set', 1 - this.getCapabilityValue('windowcoverings_set')).catch(this.error);
    }
  }

  async toggle(){
    // Use lastKnownPosition if available and recent, otherwise fall back to capability value
    let currentPosition = this.lastKnownPosition !== undefined ? this.lastKnownPosition : this.getCapabilityValue('windowcoverings_set') || 0;

    this.log(`[TOGGLE] Called - currentPosition: ${currentPosition}, lastKnownPosition: ${this.lastKnownPosition}, toggleState: ${this.toggleState}, targetPosition: ${this.targetPosition}`);
    this.log(`[TOGGLE] Current capability value raw:`, this.getCapabilityValue('windowcoverings_set'));

    if (this.toggleState === 'moving') {
      this.log(`[TOGGLE] Currently moving - attempting to stop (target: ${this.targetPosition})`);

      // 정지 시도 후에는 잠시 대기 상태로 설정 (커튼이 실제로 정지할 때까지)
      this.toggleState = 'stopping';
      const originalTarget = this.targetPosition;
      this.targetPosition = null;

      if (originalTarget === 0.0) {
        // 닫히는 방향 - 열기 동작으로 전환
        this.log(`[TOGGLE] 닫는 방향 중 토글 - 열기 동작으로 전환`);
        this.toggleState = 'moving';
        this.targetPosition = 1.0;

        // 표준 OPEN 명령도 함께 시도
        try {
          await this.writeData32(dataPoints.control, TUYA_CONTROL_OPEN);
          this.log(`[TOGGLE] control=${TUYA_CONTROL_OPEN} (표준 열기) 명령 전송`);
        } catch (error) {
          this.log(`[TOGGLE] 표준 열기 명령 실패:`, error);
        }

        // 기존 position 방식도 함께 사용
        await this.setPosition(1.0);
        this.log(`[TOGGLE] 열기 동작으로 전환 완료`);
        return;

      } else if (originalTarget === 1.0) {
        // 열리는 방향 - 정지 명령 시도 (이것은 잘 작동함)
        this.log(`[TOGGLE] 열리는 방향 - 정지 명령 시도`);

        try {
          await this.writeData32(dataPoints.control, TUYA_CONTROL_STOP);
          this.log(`[TOGGLE] control=${TUYA_CONTROL_STOP} (표준 정지) 전송`);
        } catch (error) {
          this.log(`[TOGGLE] 표준 정지 명령 실패:`, error);
        }

        // 2초 후 상태를 idle로 초기화
        setTimeout(() => {
          if (this.toggleState === 'stopping') {
            this.log(`[TOGGLE] 열림 정지 완료 - 상태 초기화`);
            this.toggleState = 'idle';
          }
        }, 1000);

        this.log(`[TOGGLE] 열림 정지 명령 전송 완료`);
        return;
      }
    }

    if (this.toggleState === 'stopping') {
      this.log(`[TOGGLE] 이미 정지 중 - 대기`);
      return;
    }

    if (this.toggleState === 'idle') {
      this.log(`[TOGGLE] Currently idle - starting movement`);
      this.toggleState = 'moving';

      // 간단한 로직: 열려있으면(>=0.5) 닫기(0.0), 닫혀있으면(<0.5) 열기(1.0)
      if (currentPosition >= 0.5) {
        this.log(`[TOGGLE] Position ${currentPosition} >= 0.5 - closing curtain (moving to 0.0)`);
        this.targetPosition = 0.0;

        // 표준 CLOSE 명령 시도
        try {
          await this.writeData32(dataPoints.control, TUYA_CONTROL_CLOSE);
          this.log(`[TOGGLE] control=${TUYA_CONTROL_CLOSE} (표준 닫기) 명령 전송`);
        } catch (error) {
          this.log(`[TOGGLE] 표준 닫기 명령 실패:`, error);
        }

        // 기존 position 방식도 함께 사용
        await this.setPosition(0.0);
      } else {
        this.log(`[TOGGLE] Position ${currentPosition} < 0.5 - opening curtain (moving to 1.0)`);
        this.targetPosition = 1.0;

        // 표준 OPEN 명령 시도
        try {
          await this.writeData32(dataPoints.control, TUYA_CONTROL_OPEN);
          this.log(`[TOGGLE] control=${TUYA_CONTROL_OPEN} (표준 열기) 명령 전송`);
        } catch (error) {
          this.log(`[TOGGLE] 표준 열기 명령 실패:`, error);
        }

        // 기존 position 방식도 함께 사용
        await this.setPosition(1.0);
      }

      this.log(`[TOGGLE] Movement started - targetPosition: ${this.targetPosition}, toggleState: ${this.toggleState}`);

      // Add timeout to reset state if no arrival signal received
      setTimeout(() => {
        if (this.toggleState === 'moving') {
          this.log(`[TOGGLE] Timeout - no arrival signal received, resetting state`);
          this.toggleState = 'idle';
          this.targetPosition = null;
        }
      }, 30000); // 30 seconds timeout
    }
  }

}

module.exports = CurtainMotor;

// Tuya Zigbee Curtain Motor - Using Standard Datapoints
// Follows Tuya standard protocol for curtain control
// DP1 (control): enum (0=OPEN, 1=STOP, 2=CLOSE) - Tuya standard control commands
// DP2 (position): value (0-100%) - Position control for percentage-based movement
// DP3 (state): value (current position state) - Real-time position feedback
// DP4 (motorReverse): boolean (0=normal, 1=reversed) - Motor direction configuration
// DP5 (motorSpeed): value (0-100) - Motor speed control


// {
//   "ids": {
//   "modelId": "TS0601",
//     "manufacturerName": "_TZE200_nogaemzt"
// },
//   "endpoints": {
//   "endpointDescriptors": [
//     {
//       "endpointId": 1,
//       "applicationProfileId": 260,
//       "applicationDeviceId": 81,
//       "applicationDeviceVersion": 0,
//       "_reserved1": 0,
//       "inputClusters": [
//         0,
//         10,
//         4,
//         5,
//         61184
//       ],
//       "outputClusters": [
//         25
//       ]
//     }
//   ],
//     "endpoints": {
//     "1": {
//       "clusters": {
//         "basic": {
//           "commandsGenerated": "UNSUP_GENERAL_COMMAND",
//             "commandsReceived": "UNSUP_GENERAL_COMMAND"
//         },
//         "time": {
//           "attributes": [
//             {
//               "acl": [
//                 "readable",
//                 "reportable"
//               ],
//               "id": 7
//             }
//           ],
//             "commandsGenerated": "UNSUP_GENERAL_COMMAND",
//             "commandsReceived": "UNSUP_GENERAL_COMMAND"
//         },
//         "groups": {
//           "attributes": [
//             {
//               "acl": [
//                 "readable",
//                 "reportable"
//               ],
//               "id": 0,
//               "name": "nameSupport",
//               "value": {
//                 "type": "Buffer",
//                 "data": [
//                   0
//                 ]
//               }
//             },
//             {
//               "acl": [
//                 "readable",
//                 "reportable"
//               ],
//               "id": 65533,
//               "name": "clusterRevision",
//               "value": 1
//             }
//           ],
//             "commandsGenerated": "UNSUP_GENERAL_COMMAND",
//             "commandsReceived": "UNSUP_GENERAL_COMMAND"
//         },
//         "scenes": {
//           "attributes": [
//             {
//               "acl": [
//                 "readable",
//                 "reportable"
//               ],
//               "id": 0
//             },
//             {
//               "acl": [
//                 "readable",
//                 "reportable"
//               ],
//               "id": 1
//             },
//             {
//               "acl": [
//                 "readable",
//                 "reportable"
//               ],
//               "id": 2
//             },
//             {
//               "acl": [
//                 "readable",
//                 "reportable"
//               ],
//               "id": 3
//             },
//             {
//               "acl": [
//                 "readable",
//                 "reportable"
//               ],
//               "id": 4
//             },
//             {
//               "acl": [
//                 "readable",
//                 "reportable"
//               ],
//               "id": 65533,
//               "name": "clusterRevision",
//               "value": 1
//             }
//           ],
//             "commandsGenerated": "UNSUP_GENERAL_COMMAND",
//             "commandsReceived": "UNSUP_GENERAL_COMMAND"
//         }
//       },
//       "bindings": {
//         "ota": {
//           "attributes": [],
//             "commandsGenerated": "UNSUP_GENERAL_COMMAND",
//             "commandsReceived": "UNSUP_GENERAL_COMMAND"
//         }
//       }
//     }
//   }
// }
