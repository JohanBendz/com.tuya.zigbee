#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import json
import os
import glob
from datetime import datetime

def extract_device_ids():
    """Extrait les Manufacturer IDs et Product IDs de tous les drivers"""
    
    drivers_info = {}
    
    # Parcourir tous les dossiers de drivers
    driver_dirs = glob.glob("drivers/*/")
    
    for driver_dir in driver_dirs:
        driver_id = os.path.basename(os.path.dirname(driver_dir))
        compose_file = os.path.join(driver_dir, "driver.compose.json")
        
        if os.path.exists(compose_file):
            try:
                with open(compose_file, 'r', encoding='utf-8') as f:
                    data = json.load(f)
                
                # Extraire les informations
                driver_name = data.get('name', {}).get('en', driver_id)
                manufacturer_ids = []
                product_ids = []
                
                # Extraire les Manufacturer IDs
                zigbee_data = data.get('zigbee', {})
                if 'manufacturerName' in zigbee_data:
                    manufacturer_ids = zigbee_data['manufacturerName']
                
                # Extraire les Product IDs
                if 'productId' in zigbee_data:
                    product_ids = zigbee_data['productId']
                
                drivers_info[driver_id] = {
                    'name': driver_name,
                    'manufacturer_ids': manufacturer_ids,
                    'product_ids': product_ids
                }
                
            except Exception as e:
                print(f"Erreur lors de l'extraction de {driver_id}: {e}")
    
    return drivers_info

def generate_markdown_table(drivers_info):
    """Génère le tableau Markdown avec les IDs"""
    
    # Catégoriser les drivers
    categories = {
        'Interrupteurs': [],
        'Prises': [],
        'Capteurs': [],
        'Éclairage': [],
        'Climatisation': [],
        'Autres': []
    }
    
    for driver_id, info in drivers_info.items():
        # Déterminer la catégorie
        category = 'Autres'
        if any(keyword in driver_id.lower() for keyword in ['switch', 'wall_switch', 'button']):
            category = 'Interrupteurs'
        elif any(keyword in driver_id.lower() for keyword in ['socket', 'plug', 'power']):
            category = 'Prises'
        elif any(keyword in driver_id.lower() for keyword in ['sensor', 'detector', 'motion', 'temp', 'humidity']):
            category = 'Capteurs'
        elif any(keyword in driver_id.lower() for keyword in ['light', 'bulb', 'lamp', 'rgb']):
            category = 'Éclairage'
        elif any(keyword in driver_id.lower() for keyword in ['thermostat', 'climate', 'curtain']):
            category = 'Climatisation'
        
        categories[category].append({
            'id': driver_id,
            'name': info['name'],
            'manufacturer_ids': info['manufacturer_ids'],
            'product_ids': info['product_ids']
        })
    
    markdown = """## 📱 **Appareils Supportés (117+ Drivers) avec Manufacturer IDs et Product IDs**

### **🔌 Interrupteurs Intelligents**
| Appareil | Manufacturer IDs | Product IDs | Statut |
|----------|------------------|-------------|--------|
"""
    
    for driver in categories['Interrupteurs']:
        mfg_ids = ', '.join(driver['manufacturer_ids'][:3]) + ('...' if len(driver['manufacturer_ids']) > 3 else '')
        prod_ids = ', '.join(driver['product_ids'][:3]) + ('...' if len(driver['product_ids']) > 3 else '')
        markdown += f"| {driver['name']} | {mfg_ids} | {prod_ids} | ✅ Opérationnel |\n"
    
    markdown += """
### **🔌 Prises Connectées**
| Appareil | Manufacturer IDs | Product IDs | Statut |
|----------|------------------|-------------|--------|
"""
    
    for driver in categories['Prises']:
        mfg_ids = ', '.join(driver['manufacturer_ids'][:3]) + ('...' if len(driver['manufacturer_ids']) > 3 else '')
        prod_ids = ', '.join(driver['product_ids'][:3]) + ('...' if len(driver['product_ids']) > 3 else '')
        markdown += f"| {driver['name']} | {mfg_ids} | {prod_ids} | ✅ Opérationnel |\n"
    
    markdown += """
### **📡 Capteurs & Détecteurs**
| Appareil | Manufacturer IDs | Product IDs | Statut |
|----------|------------------|-------------|--------|
"""
    
    for driver in categories['Capteurs']:
        mfg_ids = ', '.join(driver['manufacturer_ids'][:3]) + ('...' if len(driver['manufacturer_ids']) > 3 else '')
        prod_ids = ', '.join(driver['product_ids'][:3]) + ('...' if len(driver['product_ids']) > 3 else '')
        markdown += f"| {driver['name']} | {mfg_ids} | {prod_ids} | ✅ Opérationnel |\n"
    
    markdown += """
### **💡 Éclairage Intelligent**
| Appareil | Manufacturer IDs | Product IDs | Statut |
|----------|------------------|-------------|--------|
"""
    
    for driver in categories['Éclairage']:
        mfg_ids = ', '.join(driver['manufacturer_ids'][:3]) + ('...' if len(driver['manufacturer_ids']) > 3 else '')
        prod_ids = ', '.join(driver['product_ids'][:3]) + ('...' if len(driver['product_ids']) > 3 else '')
        markdown += f"| {driver['name']} | {mfg_ids} | {prod_ids} | ✅ Opérationnel |\n"
    
    markdown += """
### **🌡️ Climatisation & Stores**
| Appareil | Manufacturer IDs | Product IDs | Statut |
|----------|------------------|-------------|--------|
"""
    
    for driver in categories['Climatisation']:
        mfg_ids = ', '.join(driver['manufacturer_ids'][:3]) + ('...' if len(driver['manufacturer_ids']) > 3 else '')
        prod_ids = ', '.join(driver['product_ids'][:3]) + ('...' if len(driver['product_ids']) > 3 else '')
        markdown += f"| {driver['name']} | {mfg_ids} | {prod_ids} | ✅ Opérationnel |\n"
    
    markdown += """
### **🔧 Autres Appareils**
| Appareil | Manufacturer IDs | Product IDs | Statut |
|----------|------------------|-------------|--------|
"""
    
    for driver in categories['Autres']:
        mfg_ids = ', '.join(driver['manufacturer_ids'][:3]) + ('...' if len(driver['manufacturer_ids']) > 3 else '')
        prod_ids = ', '.join(driver['product_ids'][:3]) + ('...' if len(driver['product_ids']) > 3 else '')
        markdown += f"| {driver['name']} | {mfg_ids} | {prod_ids} | ✅ Opérationnel |\n"
    
    return markdown

def main():
    print("🔍 Extraction des Manufacturer IDs et Product IDs...")
    
    drivers_info = extract_device_ids()
    
    if not drivers_info:
        print("❌ Aucun driver trouvé")
        return
    
    print(f"✅ {len(drivers_info)} drivers analysés avec succès")
    
    # Générer le tableau Markdown
    markdown_table = generate_markdown_table(drivers_info)
    
    # Sauvegarder dans un fichier
    with open('devices_with_ids.md', 'w', encoding='utf-8') as f:
        f.write(markdown_table)
    
    print("✅ Tableau avec IDs généré dans devices_with_ids.md")
    
    # Afficher les statistiques
    print("\n📊 Statistiques par catégorie:")
    categories = {'Interrupteurs': 0, 'Prises': 0, 'Capteurs': 0, 'Éclairage': 0, 'Climatisation': 0, 'Autres': 0}
    
    for driver_id, info in drivers_info.items():
        if any(keyword in driver_id.lower() for keyword in ['switch', 'wall_switch', 'button']):
            categories['Interrupteurs'] += 1
        elif any(keyword in driver_id.lower() for keyword in ['socket', 'plug', 'power']):
            categories['Prises'] += 1
        elif any(keyword in driver_id.lower() for keyword in ['sensor', 'detector', 'motion', 'temp', 'humidity']):
            categories['Capteurs'] += 1
        elif any(keyword in driver_id.lower() for keyword in ['light', 'bulb', 'lamp', 'rgb']):
            categories['Éclairage'] += 1
        elif any(keyword in driver_id.lower() for keyword in ['thermostat', 'climate', 'curtain']):
            categories['Climatisation'] += 1
        else:
            categories['Autres'] += 1
    
    for category, count in categories.items():
        print(f"  - {category}: {count} drivers")
    
    print(f"\n📈 Total: {len(drivers_info)} drivers avec IDs")

if __name__ == "__main__":
    main() 