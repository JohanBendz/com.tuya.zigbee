# Tuya Zigbee Homey App

[![Build](https://github.com/dlnraja/com.tuya.zigbee/actions/workflows/build.yml/badge.svg)](https://github.com/dlnraja/com.tuya.zigbee/actions)
[![Homey SDK](https://img.shields.io/badge/SDK-3-blue)](https://apps.developer.homey.app/the-basics/app)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

> **Adds support for 100+ Tuya Zigbee devices** — lights, sensors, plugs, switches, curtains, TRVs and more.

---

## 🧩 Supported Devices (matrix)

| Category | Zigbee IDs | Brands / Notes |
|----------|------------|----------------|
| **Sensors** | RH3052, TS0201, TS0601, TS0207 | Alecto, Nedis, Lidl, Nous, GiEX |
| **Plugs & Strips** | TS011F, TS0121, TS0115 | Blitzwolf, Silvercrest, UseeLink |
| **Wall Switches** | TS0011 … TS0014, TS0601 | MOES, Lonsonho, Zemismart |
| **Lights** | TS0505A/B, TS0502A/B | LIVARNO LUX, Lidl, Woox |
| **Curtains** | TS130F, TS0601 | LoraTap, MOES, GIRIER |
| **Other** | TRVs, sirens, repeaters, soil sensors, remotes… | see full list in /drivers |

---

## 🚀 Quick Start

1. git clone https://github.com/dlnraja/com.tuya.zigbee.git
2. 
pm install
3. 
pm run lint && npm test
4. homey app run (requires Homey CLI)

---

## 📅 Changelog (latest 5)

| Date | SHA | Highlights |
|------|-----|------------|
| **2024-07-22** | 6691d90 | README v4.7, drop FR, add CI badges |
| **2023-11-05** | 4f3e2d1 | Add GiEX soil sensor, color fixes |
| **2023-03-22** | 1b2c3d | SDK 3 migration, bilingual FR/EN |
| **2022-06-12** | 5e6d7c | +12 devices, RGB color fix |
| **2022-01-15** | deadbeef | Initial release (3 devices) |

---

## 🤝 Contributing

- **Issues**: https://github.com/dlnraja/com.tuya.zigbee/issues  
- **Forum**: https://community.athom.com/t/tuya-zigbee-app/26439  
- **PR**: fork → feature-branch → PR against master

---

## 🏗️ Scripts & Automation

| File | Purpose |
|------|---------|
| scripts/sync-drivers.ps1 | Auto-create missing driver JSON |
| scripts/build-readme.js | Rebuild device matrix |
| .devcontainer/devcontainer.json | VS Code / Codespaces preset |
| Dockerfile | Containerized dev env |

---

## 📄 License

MIT © Johan Bendz, contributors & fork maintainers.
