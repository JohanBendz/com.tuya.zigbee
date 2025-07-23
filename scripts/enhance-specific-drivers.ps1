# ENHANCE SPECIFIC DRIVERS - Tuya Zigbee Project
# Script pour ameliorer quelques drivers specifiques

Write-Host "AMELIORATION DE DRIVERS SPECIFIQUES" -ForegroundColor Cyan
Write-Host "==================================" -ForegroundColor Cyan

# Liste des drivers a ameliorer
$driversToEnhance = @(
    "wall_switch_1_gang",
    "wall_switch_2_gang", 
    "wall_switch_4_gang",
    "smartplug",
    "motion_sensor",
    "temphumidsensor",
    "smoke_sensor"
)

$enhancedCount = 0

foreach ($driverName in $driversToEnhance) {
    $driverPath = "drivers\$driverName"
    
    if (Test-Path $driverPath) {
        Write-Host "`nAmelioration du driver: $driverName" -ForegroundColor Yellow
        
        $deviceJsPath = Join-Path $driverPath "device.js"
        $composePath = Join-Path $driverPath "driver.compose.json"
        
        if ((Test-Path $deviceJsPath) -and (Test-Path $composePath)) {
            try {
                # Lire les fichiers
                $deviceJsContent = Get-Content $deviceJsPath -Raw
                $composeContent = Get-Content $composePath -Raw
                $composeJson = $composeContent | ConvertFrom-Json
                
                # Verifier les ameliorations existantes
                $hasBattery = $deviceJsContent -match "measure_battery"
                $hasManufacturerIds = $composeContent -match "_TZ3000_"
                $hasCapabilities = $composeContent -match "measure_battery"
                $hasClickHandling = $deviceJsContent -match "clickState"
                
                $enhanced = $false
                
                # 1. Ajouter la gestion de batterie si manquante
                if (-not $hasBattery) {
                    $batteryCode = @"

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

    // Mettre a jour l'autonomie de la batterie toutes les heures
    this.batteryUpdateInterval = setInterval(async () => {
      await this.updateBatteryAutonomy();
    }, 3600000); // 1 heure
  }

  // Methode pour mettre a jour l'autonomie de la batterie
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

  // Methode pour déclencher les flows
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
"@
                    
                    # Ajouter le code de batterie au device.js
                    $deviceJsContent = $deviceJsContent -replace "async onNodeInit\({zclNode}\) \{", "async onNodeInit({zclNode}) {$batteryCode"
                    $enhanced = $true
                    Write-Host "  - Gestion de batterie ajoutee" -ForegroundColor Green
                }
                
                # 2. Ajouter les manufacturer IDs etendus
                if (-not $hasManufacturerIds) {
                    $extendedManufacturers = @"
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
        "_TZ3000_aezbqpcu"
"@
                    
                    # Ajouter les manufacturer IDs au compose.json
                    $composeContent = $composeContent -replace '"manufacturerName": \[', "`"manufacturerName`": [$extendedManufacturers,"
                    $enhanced = $true
                    Write-Host "  - Manufacturer IDs etendus" -ForegroundColor Green
                }
                
                # 3. Ajouter les capacites etendues
                if (-not $hasCapabilities) {
                    $extendedCapabilities = @"
      "measure_battery",
      "alarm_battery",
      "button",
      "measure_voltage",
      "measure_current"
"@
                    
                    # Ajouter les capacites au compose.json
                    $composeContent = $composeContent -replace '"capabilities": \[', "`"capabilities`": [$extendedCapabilities,"
                    $enhanced = $true
                    Write-Host "  - Capacites etendues" -ForegroundColor Green
                }
                
                # 4. Ajouter la gestion des clics pour les switches
                if (-not $hasClickHandling -and $driverName -match "switch") {
                    $clickHandlingCode = @"

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
          this.log('Appui long détecté');
          
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
            this.log('Double clic détecté');
            
            // Déclencher l'action du double clic
            await this.triggerFlow('double_click');
          } else if (this.clickState.clickCount === 3) { // Triple clic
            this.clickState.tripleClick = true;
            this.clickState.doubleClick = false;
            this.log('Triple clic détecté');
            
            // Déclencher l'action du triple clic
            await this.triggerFlow('triple_click');
          } else { // Clic simple
            this.log('Clic simple détecté');
            
            // Déclencher l'action du clic simple
            await this.triggerFlow('single_click');
          }
        } else { // Nouveau clic
          this.clickState.clickCount = 1;
          this.clickState.singleClick = true;
          this.log('Clic simple détecté');
          
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
"@
                    
                    # Ajouter le code de gestion des clics au device.js
                    $deviceJsContent = $deviceJsContent -replace "async onNodeInit\({zclNode}\) \{", "async onNodeInit({zclNode}) {$clickHandlingCode"
                    $enhanced = $true
                    Write-Host "  - Gestion des clics ajoutee" -ForegroundColor Green
                }
                
                # Sauvegarder les modifications
                if ($enhanced) {
                    Set-Content -Path $deviceJsPath -Value $deviceJsContent -Encoding UTF8
                    Set-Content -Path $composePath -Value $composeContent -Encoding UTF8
                    $enhancedCount++
                    Write-Host "  - Driver $driverName ameliore avec succes!" -ForegroundColor Green
                } else {
                    Write-Host "  - Driver $driverName deja a jour" -ForegroundColor Yellow
                }
                
            } catch {
                Write-Host "  - Erreur lors de l'amelioration du driver $driverName : $($_.Exception.Message)" -ForegroundColor Red
            }
        } else {
            Write-Host "  - Fichiers manquants pour le driver $driverName" -ForegroundColor Red
        }
    } else {
        Write-Host "  - Driver $driverName non trouve" -ForegroundColor Red
    }
}

Write-Host "`nAMELIORATION TERMINEE!" -ForegroundColor Green
Write-Host "Drivers ameliores: $enhancedCount" -ForegroundColor White
Write-Host "Mode YOLO Intelligent active" -ForegroundColor Cyan 