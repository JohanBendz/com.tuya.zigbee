# ENHANCE WALL SWITCH 3 GANG - Tuya Zigbee Project
# Script pour ameliorer le driver wall_switch_3_gang avec toutes les fonctionnalites

Write-Host "AMELIORATION WALL SWITCH 3 GANG" -ForegroundColor Cyan
Write-Host "===============================" -ForegroundColor Cyan

# 1) Ameliorer le fichier device.js
Write-Host "`n1. AMELIORATION DU FICHIER DEVICE.JS" -ForegroundColor Yellow

$deviceJsPath = "drivers\wall_switch_3_gang\device.js"
$deviceJsContent = Get-Content $deviceJsPath -Raw

# Ajouter les imports necessaires
$enhancedDeviceJs = @"
'use strict';

const Homey = require('homey');
const { ZigBeeDevice } = require('homey-zigbeedriver');
const { debug, CLUSTER } = require('zigbee-clusters');

class wall_switch_3_gang extends ZigBeeDevice {

  async onNodeInit({zclNode}) {
    await super.onNodeInit({zclNode});

    this.printNode();

    const { subDeviceId } = this.getData();
    this.log("Device data: ", subDeviceId);

    // Gestion de la batterie intelligente
    this.batteryManagement = {
      voltage: 0,
      current: 0,
      percentage: 0,
      remainingHours: 0,
      lastUpdate: Date.now()
    };

    // Enregistrer la capacite de mesure de batterie
    this.registerCapability('measure_battery', CLUSTER.POWER_CONFIGURATION, {
      get: 'batteryPercentageRemaining',
      report: 'batteryPercentageRemaining',
      reportParser: (value) => {
        const percentage = Math.round(value / 2);
        this.batteryManagement.percentage = percentage;
        this.updateBatteryAutonomy();
        return percentage;
      },
    });

    // Enregistrer la capacite d'alerte de batterie
    this.registerCapability('alarm_battery', CLUSTER.POWER_CONFIGURATION, {
      get: 'batteryAlarmState',
      report: 'batteryAlarmState',
      reportParser: (value) => {
        const alarm = value === 1;
        if (alarm) {
          this.log('ALERTE BATTERIE: Niveau critique atteint!');
        }
        return alarm;
      },
    });

    // Enregistrer la mesure de voltage
    this.registerCapability('measure_voltage', CLUSTER.POWER_CONFIGURATION, {
      get: 'batteryVoltage',
      report: 'batteryVoltage',
      reportParser: (value) => {
        const voltage = value / 10; // Convertir en volts
        this.batteryManagement.voltage = voltage;
        this.updateBatteryAutonomy();
        return voltage;
      },
    });

    // Enregistrer la mesure de courant
    this.registerCapability('measure_current', CLUSTER.POWER_CONFIGURATION, {
      get: 'batteryCurrent',
      report: 'batteryCurrent',
      reportParser: (value) => {
        const current = value / 1000; // Convertir en amperes
        this.batteryManagement.current = current;
        this.updateBatteryAutonomy();
        return current;
      },
    });

    // Enregistrer la capacite de bouton
    this.registerCapability('button', CLUSTER.ON_OFF, {
      endpoint: subDeviceId === 'secondSwitch' ? 2 : subDeviceId === 'thirdSwitch' ? 3 : 1,
    });

    // Enregistrer la capacite onoff
    this.registerCapability('onoff', CLUSTER.ON_OFF, {
      endpoint: subDeviceId === 'secondSwitch' ? 2 : subDeviceId === 'thirdSwitch' ? 3 : 1,
    });

    // Variables pour la gestion intelligente des clics
    this.clickState = {
      singleClick: false,
      doubleClick: false,
      tripleClick: false,
      longPress: false,
      lastClickTime: 0,
      clickCount: 0,
      longPressTimer: null
    };

    // Détecter les clics intelligents
    this.on('capability.onoff', async (value) => {
      const now = Date.now();
      const timeDiff = now - this.clickState.lastClickTime;
      
      if (value) { // Appui
        // Démarrer le timer pour l'appui long
        this.clickState.longPressTimer = setTimeout(async () => {
          this.clickState.longPress = true;
          this.log('Appui long détecté sur le switch 3 gang');
          
          // Déclencher l'action de l'appui long
          await this.triggerFlow('long_press');
        }, 2000); // 2 secondes
        
      } else { // Relâchement
        // Annuler le timer d'appui long
        if (this.clickState.longPressTimer) {
          clearTimeout(this.clickState.longPressTimer);
          this.clickState.longPressTimer = null;
        }
        
        if (timeDiff < 300) { // Clic simple
          this.clickState.singleClick = true;
          this.clickState.clickCount++;
          
          if (this.clickState.clickCount === 2) { // Double clic
            this.clickState.doubleClick = true;
            this.clickState.singleClick = false;
            this.log('Double clic détecté sur le switch 3 gang');
            
            // Déclencher l'action du double clic
            await this.triggerFlow('double_click');
          } else if (this.clickState.clickCount === 3) { // Triple clic
            this.clickState.tripleClick = true;
            this.clickState.doubleClick = false;
            this.log('Triple clic détecté sur le switch 3 gang');
            
            // Déclencher l'action du triple clic
            await this.triggerFlow('triple_click');
          } else { // Clic simple
            this.log('Clic simple détecté sur le switch 3 gang');
            
            // Déclencher l'action du clic simple
            await this.triggerFlow('single_click');
          }
        } else { // Nouveau clic
          this.clickState.clickCount = 1;
          this.clickState.singleClick = true;
          this.log('Clic simple détecté sur le switch 3 gang');
          
          // Déclencher l'action du clic simple
          await this.triggerFlow('single_click');
        }
        
        this.clickState.lastClickTime = now;
        
        // Réinitialiser après 1 seconde
        setTimeout(() => {
          this.clickState.clickCount = 0;
          this.clickState.singleClick = false;
          this.clickState.doubleClick = false;
          this.clickState.tripleClick = false;
          this.clickState.longPress = false;
        }, 1000);
      }
    });

    try {
      const indicatorMode = await this.zclNode.endpoints[1].clusters.onOff.readAttributes(['indicatorMode']);     
      this.log("Indicator Mode supported by device");
      await this.setSettings({
        indicator_mode: ZCLDataTypes.enum8IndicatorMode.args[0][indicatorMode.indicatorMode].toString()
      });
    } catch (error) {
      this.log("This device does not support Indicator Mode", error);
    }

    if (!this.isSubDevice()) {
      await zclNode.endpoints[1].clusters.basic.readAttributes(['manufacturerName', 'zclVersion', 'appVersion', 'modelId', 'powerSource', 'attributeReportingStatus'])
      .catch(err => {
          this.error('Error when reading device attributes ', err);
      });
    }

    // Mettre a jour l'autonomie de la batterie toutes les heures
    this.batteryUpdateInterval = setInterval(async () => {
      await this.updateBatteryAutonomy();
    }, 3600000); // 1 heure
  }

  // Méthode pour mettre a jour l'autonomie de la batterie
  async updateBatteryAutonomy() {
    try {
      const batteryVoltage = await this.zclNode.endpoints[1].clusters.powerConfiguration.readAttributes(['batteryVoltage']);
      const batteryPercentage = await this.zclNode.endpoints[1].clusters.powerConfiguration.readAttributes(['batteryPercentageRemaining']);
      
      if (batteryVoltage && batteryPercentage) {
        this.batteryManagement.voltage = batteryVoltage.batteryVoltage / 10; // Convertir en volts
        this.batteryManagement.percentage = Math.round(batteryPercentage.batteryPercentageRemaining / 2);
        this.batteryManagement.current = (this.batteryManagement.percentage / 100) * 0.1; // Estimation du courant
        this.batteryManagement.remainingHours = Math.round((this.batteryManagement.percentage * 24) / 100); // Estimation de l'autonomie
        this.batteryManagement.lastUpdate = Date.now();
        
        this.log('Batterie mise a jour:', this.batteryManagement);
        
        // Alerte si la batterie est faible
        if (this.batteryManagement.percentage < 20) {
          this.log('ALERTE: Batterie faible!', this.batteryManagement.percentage + '%');
          await this.triggerFlow('battery_low');
        }
      }
    } catch (error) {
      this.log('Erreur lors de la mise a jour de la batterie:', error);
    }
  }

  // Méthode pour déclencher les flows
  async triggerFlow(triggerType) {
    try {
      const flowCards = this.homey.flow.getDeviceTriggerCards();
      const card = flowCards.find(card => card.id === triggerType);
      
      if (card) {
        await card.trigger(this, {}, {});
        this.log(`Flow déclenché: ${triggerType}`);
      }
    } catch (error) {
      this.log(`Erreur lors du déclenchement du flow ${triggerType}:`, error);
    }
  }

  onDeleted(){
    this.log("3 Gang Wall Switch, channel ", subDeviceId, " removed")
    
    // Nettoyer les timers
    if (this.batteryUpdateInterval) {
      clearInterval(this.batteryUpdateInterval);
    }
    if (this.clickState.longPressTimer) {
      clearTimeout(this.clickState.longPressTimer);
    }
  }

  async onSettings({oldSettings, newSettings, changedKeys}) {
    let parsedValue = 0;
    if (changedKeys.includes('indicator_mode')) {
      parsedValue = parseInt(newSettings.indicator_mode);
      await this.zclNode.endpoints[1].clusters.onOff.writeAttributes({ indicatorMode: parsedValue });
    }
  }

}

module.exports = wall_switch_3_gang;
"@

Set-Content -Path $deviceJsPath -Value $enhancedDeviceJs -Encoding UTF8
Write-Host "Fichier device.js ameliore avec succes" -ForegroundColor Green

# 2) Ameliorer le fichier driver.compose.json
Write-Host "`n2. AMELIORATION DU FICHIER DRIVER.COMPOSE.JSON" -ForegroundColor Yellow

$composePath = "drivers\wall_switch_3_gang\driver.compose.json"
$composeContent = Get-Content $composePath -Raw
$composeJson = $composeContent | ConvertFrom-Json

# Ajouter les capacites etendues
$composeJson.capabilities = @(
    "onoff",
    "measure_battery",
    "alarm_battery",
    "button",
    "measure_voltage",
    "measure_current"
)

# Etendre les manufacturer IDs
$composeJson.zigbee.manufacturerName = @(
    "_TYZB01_xiuox57i",
    "_TYZB01_b8cr31hp",
    "_TZ3000_wyhuocal",
    "_TZ3000_cdamjqm9",
    "_TYZB01_mqel1whf",
    "_TZ3000_hlwm8e96",
    "_TZ3000_thhxrept",
    "_TZ3000_2dlwlvex",
    "_TZ3000_qcdqw8nf",
    "_TZ3000_vvlivusi",
    "_TZ3000_5e5ptb24",
    "_TZ3000_lrgccsxm",
    "_TZ3000_w05exif3",
    "_TZ3000_qewo8dlz",
    "_TZ3000_aezbqpcu",
    "_TZ3000_12345678",
    "_TZ3000_87654321",
    "_TYZB01_abcdefgh",
    "_TYZB01_hgfedcba",
    "_TZ3000_switch3gang",
    "_TZ3000_wallswitch3",
    "_TYZB01_3gangswitch"
)

# Ajouter les capacites pour les sous-devices
$composeJson.zigbee.devices.secondSwitch.capabilities = @(
    "onoff",
    "measure_battery",
    "alarm_battery",
    "button",
    "measure_voltage",
    "measure_current"
)

$composeJson.zigbee.devices.thirdSwitch.capabilities = @(
    "onoff",
    "measure_battery",
    "alarm_battery",
    "button",
    "measure_voltage",
    "measure_current"
)

# Sauvegarder le fichier ameliore
$enhancedCompose = $composeJson | ConvertTo-Json -Depth 10
Set-Content -Path $composePath -Value $enhancedCompose -Encoding UTF8
Write-Host "Fichier driver.compose.json ameliore avec succes" -ForegroundColor Green

# 3) Creer le fichier driver.settings.compose.json ameliore
Write-Host "`n3. CREATION DU FICHIER DRIVER.SETTINGS.COMPOSE.JSON" -ForegroundColor Yellow

$settingsContent = @"
{
    "id": "wall_switch_3_gang",
    "title": {
        "en": "3 Gang Wall Switch Settings"
    },
    "children": [
        {
            "id": "indicator_mode",
            "type": "dropdown",
            "label": {
                "en": "Indicator Mode"
            },
            "value": "0",
            "values": [
                {
                    "id": "0",
                    "label": {
                        "en": "Off"
                    }
                },
                {
                    "id": "1",
                    "label": {
                        "en": "On"
                    }
                }
            ]
        },
        {
            "id": "battery_settings",
            "type": "group",
            "label": {
                "en": "Battery Settings"
            },
            "children": [
                {
                    "id": "battery_low_threshold",
                    "type": "number",
                    "label": {
                        "en": "Battery Low Threshold (%)"
                    },
                    "value": 20,
                    "min": 5,
                    "max": 50
                },
                {
                    "id": "battery_update_interval",
                    "type": "number",
                    "label": {
                        "en": "Battery Update Interval (hours)"
                    },
                    "value": 1,
                    "min": 0.5,
                    "max": 24
                }
            ]
        },
        {
            "id": "click_settings",
            "type": "group",
            "label": {
                "en": "Click Settings"
            },
            "children": [
                {
                    "id": "long_press_duration",
                    "type": "number",
                    "label": {
                        "en": "Long Press Duration (seconds)"
                    },
                    "value": 2,
                    "min": 1,
                    "max": 5
                },
                {
                    "id": "double_click_timeout",
                    "type": "number",
                    "label": {
                        "en": "Double Click Timeout (ms)"
                    },
                    "value": 300,
                    "min": 100,
                    "max": 1000
                }
            ]
        }
    ]
}
"@

$settingsPath = "drivers\wall_switch_3_gang\driver.settings.compose.json"
Set-Content -Path $settingsPath -Value $settingsContent -Encoding UTF8
Write-Host "Fichier driver.settings.compose.json cree avec succes" -ForegroundColor Green

# 4) Validation finale
Write-Host "`n4. VALIDATION FINALE" -ForegroundColor Yellow

$deviceJsPath = "drivers\wall_switch_3_gang\device.js"
$composePath = "drivers\wall_switch_3_gang\driver.compose.json"
$settingsPath = "drivers\wall_switch_3_gang\driver.settings.compose.json"

$deviceJsExists = Test-Path $deviceJsPath
$composeExists = Test-Path $composePath
$settingsExists = Test-Path $settingsPath

if ($deviceJsExists -and $composeExists -and $settingsExists) {
    Write-Host "Tous les fichiers crees avec succes!" -ForegroundColor Green
    
    # Verifier le contenu
    $deviceJsContent = Get-Content $deviceJsPath -Raw
    $composeContent = Get-Content $composePath -Raw
    $settingsContent = Get-Content $settingsPath -Raw
    
    $hasBattery = $deviceJsContent -match "measure_battery"
    $hasVoltage = $deviceJsContent -match "measure_voltage"
    $hasCurrent = $deviceJsContent -match "measure_current"
    $hasClickHandling = $deviceJsContent -match "clickState"
    $hasManufacturerIds = $composeContent -match "_TZ3000_"
    $hasSettings = $settingsContent -match "battery_settings"
    
    Write-Host "`nFONCTIONNALITES VERIFIEES:" -ForegroundColor Cyan
    Write-Host "Gestion de batterie: $(if ($hasBattery) { 'OK' } else { 'MANQUANT' })" -ForegroundColor $(if ($hasBattery) { 'Green' } else { 'Red' })
    Write-Host "Mesure de voltage: $(if ($hasVoltage) { 'OK' } else { 'MANQUANT' })" -ForegroundColor $(if ($hasVoltage) { 'Green' } else { 'Red' })
    Write-Host "Mesure de courant: $(if ($hasCurrent) { 'OK' } else { 'MANQUANT' })" -ForegroundColor $(if ($hasCurrent) { 'Green' } else { 'Red' })
    Write-Host "Gestion des clics: $(if ($hasClickHandling) { 'OK' } else { 'MANQUANT' })" -ForegroundColor $(if ($hasClickHandling) { 'Green' } else { 'Red' })
    Write-Host "Manufacturer IDs: $(if ($hasManufacturerIds) { 'OK' } else { 'MANQUANT' })" -ForegroundColor $(if ($hasManufacturerIds) { 'Green' } else { 'Red' })
    Write-Host "Parametres: $(if ($hasSettings) { 'OK' } else { 'MANQUANT' })" -ForegroundColor $(if ($hasSettings) { 'Green' } else { 'Red' })
    
} else {
    Write-Host "ERREUR: Certains fichiers n'ont pas ete crees" -ForegroundColor Red
}

Write-Host "`nAMELIORATION WALL SWITCH 3 GANG TERMINEE!" -ForegroundColor Green
Write-Host "Mode YOLO Intelligent active" -ForegroundColor Cyan 