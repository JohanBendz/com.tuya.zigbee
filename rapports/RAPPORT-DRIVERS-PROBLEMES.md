# RAPPORT DÉTAILLÉ DES DRIVERS PROBLÉMATIQUES

Ce rapport liste tous les drivers nécessitant une correction automatique suite à l’analyse complète du projet.

## Problèmes détectés

- **Fichiers manquants** : device.js, driver.compose.json
- **JSON invalide** : erreurs de merge, syntaxe, etc.
- **Classe non conforme** : n’étend pas ZigbeeDevice
- **Méthode onInit absente**
- **Capacités manquantes ou non enregistrées**

---

### Exemples de drivers à corriger

- **Fichiers manquants** :
  - history, Lot1, multi_sensor, remote_control, smart_plug, TS0001
- **JSON invalide** :
  - curtain_module, light_rgb_TZ3000_dbou1ap4, motion_sensor, plug_blitzwolf_TZ3000_mraovvmm, rain_sensor, sensor_temp_TUYATEC-g3gl6cgy, smartplug, smoke_sensor, wall_switch_1_gang, wall_switch_2_gang, wall_switch_3_gang, wall_switch_4_gang, etc.
- **Classe non conforme** :
  - christmas_lights, curtain_motor, dimmable_led_strip, dimmable_recessed_led, dimmer_1_gang_tuya, dimmer_2_gang_tuya, fingerbot, lcdtemphumidsensor_3, radar_sensor, etc.
- **onInit manquant** :
  - dimmable_led_strip, dimmable_recessed_led, multi_sensor, remote_control, rgb_bulb_E14, etc.
- **Capacités manquantes** :
  - Très nombreux, voir le rapport complet généré par les scripts de vérification.

---

**Ce rapport est généré automatiquement. Les corrections automatiques vont être appliquées dans la foulée.** 