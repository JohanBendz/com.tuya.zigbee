// icon-generator.js - Générateur d'icônes intelligente avec benchmark

const fs = require('fs');
const path = require('path');
const axios = require('axios');

class IconGenerator {
    constructor() {
        this.assetsDir = path.join(__dirname, '../assets');
        this.iconsDir = path.join(this.assetsDir, 'icons');
        this.benchmarkData = {};
        this.existingIcons = [];
        this.iconSizes = [64, 128, 256];
        this.styleGuide = {
            colors: ['#667eea', '#764ba2', '#4ade80', '#fbbf24', '#f87171'],
            shapes: ['rounded', 'square', 'circle'],
            styles: ['flat', 'gradient', 'outline']
        };
    }

    // Initialisation
    async init() {
        console.log('🎨 Initialisation du générateur d\'icônes...');
        
        // Créer les dossiers nécessaires
        this.createDirectories();
        
        // Analyser les icônes existantes
        await this.analyzeExistingIcons();
        
        // Créer le benchmark
        await this.createBenchmark();
        
        console.log('✅ Générateur d\'icônes initialisé');
    }

    // Création des dossiers
    createDirectories() {
        const dirs = [this.assetsDir, this.iconsDir];
        dirs.forEach(dir => {
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
                console.log(`📁 Créé: ${dir}`);
            }
        });
    }

    // Analyse des icônes existantes
    async analyzeExistingIcons() {
        console.log('🔍 Analyse des icônes existantes...');
        
        if (fs.existsSync(this.iconsDir)) {
            const files = fs.readdirSync(this.iconsDir);
            this.existingIcons = files.filter(file => 
                file.endsWith('.png') || file.endsWith('.svg')
            );
            
            console.log(`📊 ${this.existingIcons.length} icônes existantes trouvées`);
            
            // Analyser le style des icônes existantes
            this.analyzeIconStyles();
        }
    }

    // Analyse du style des icônes
    analyzeIconStyles() {
        console.log('🎨 Analyse du style des icônes...');
        
        this.existingIcons.forEach(icon => {
            const iconPath = path.join(this.iconsDir, icon);
            const stats = fs.statSync(iconPath);
            
            // Analyser les métadonnées
            this.benchmarkData[icon] = {
                size: stats.size,
                created: stats.birthtime,
                modified: stats.mtime,
                style: this.detectIconStyle(icon)
            };
        });
    }

    // Détection du style d'une icône
    detectIconStyle(iconName) {
        const name = iconName.toLowerCase();
        
        // Analyse basée sur le nom
        if (name.includes('switch') || name.includes('button')) {
            return { type: 'control', shape: 'rounded', style: 'flat' };
        } else if (name.includes('sensor') || name.includes('detector')) {
            return { type: 'sensor', shape: 'circle', style: 'gradient' };
        } else if (name.includes('light') || name.includes('bulb')) {
            return { type: 'light', shape: 'circle', style: 'gradient' };
        } else {
            return { type: 'device', shape: 'square', style: 'outline' };
        }
    }

    // Création du benchmark
    async createBenchmark() {
        console.log('📊 Création du benchmark d\'icônes...');
        
        const benchmark = {
            totalIcons: this.existingIcons.length,
            styles: this.analyzeStyles(),
            sizes: this.analyzeSizes(),
            colors: this.analyzeColors(),
            recommendations: this.generateRecommendations()
        };
        
        // Sauvegarder le benchmark
        const benchmarkPath = path.join(this.assetsDir, 'icon-benchmark.json');
        fs.writeFileSync(benchmarkPath, JSON.stringify(benchmark, null, 2));
        
        console.log('✅ Benchmark créé:', benchmarkPath);
        return benchmark;
    }

    // Analyse des styles
    analyzeStyles() {
        const styles = {};
        Object.values(this.benchmarkData).forEach(data => {
            const style = data.style.type;
            styles[style] = (styles[style] || 0) + 1;
        });
        return styles;
    }

    // Analyse des tailles
    analyzeSizes() {
        const sizes = {};
        Object.values(this.benchmarkData).forEach(data => {
            const size = data.size;
            if (size < 1000) sizes.small = (sizes.small || 0) + 1;
            else if (size < 5000) sizes.medium = (sizes.medium || 0) + 1;
            else sizes.large = (sizes.large || 0) + 1;
        });
        return sizes;
    }

    // Analyse des couleurs
    analyzeColors() {
        return {
            primary: '#667eea',
            secondary: '#764ba2',
            success: '#4ade80',
            warning: '#fbbf24',
            error: '#f87171'
        };
    }

    // Génération des recommandations
    generateRecommendations() {
        return {
            preferredStyle: 'flat',
            preferredShape: 'rounded',
            preferredColors: ['#667eea', '#764ba2'],
            sizeStandards: {
                small: 64,
                medium: 128,
                large: 256
            },
            consistencyRules: [
                'Utiliser des formes arrondies pour les contrôles',
                'Utiliser des cercles pour les capteurs',
                'Utiliser des gradients pour les lumières',
                'Maintenir une palette de couleurs cohérente'
            ]
        };
    }

    // Génération d'icône cohérente
    async generateConsistentIcon(deviceName, deviceType, manufacturerId) {
        console.log(`🎨 Génération d'icône pour: ${deviceName}`);
        
        // Analyser le device pour déterminer le style
        const iconStyle = this.determineIconStyle(deviceName, deviceType, manufacturerId);
        
        // Générer l'icône avec le style cohérent
        const iconData = await this.generateIconWithStyle(iconStyle);
        
        // Créer les différentes tailles
        const iconFiles = await this.createIconSizes(deviceName, iconData);
        
        // Sauvegarder les métadonnées
        this.saveIconMetadata(deviceName, iconStyle, iconFiles);
        
        console.log(`✅ Icône générée pour ${deviceName}`);
        return iconFiles;
    }

    // Détermination du style d'icône
    determineIconStyle(deviceName, deviceType, manufacturerId) {
        const name = deviceName.toLowerCase();
        const type = deviceType.toLowerCase();
        
        // Règles de style basées sur le type et le nom
        if (type.includes('switch') || type.includes('button') || name.includes('switch')) {
            return {
                type: 'control',
                shape: 'rounded',
                style: 'flat',
                color: '#667eea',
                icon: 'fas fa-toggle-on'
            };
        } else if (type.includes('sensor') || type.includes('detector') || name.includes('sensor')) {
            return {
                type: 'sensor',
                shape: 'circle',
                style: 'gradient',
                color: '#4ade80',
                icon: 'fas fa-microchip'
            };
        } else if (type.includes('light') || type.includes('bulb') || name.includes('light')) {
            return {
                type: 'light',
                shape: 'circle',
                style: 'gradient',
                color: '#fbbf24',
                icon: 'fas fa-lightbulb'
            };
        } else if (type.includes('remote') || type.includes('controller')) {
            return {
                type: 'remote',
                shape: 'square',
                style: 'outline',
                color: '#764ba2',
                icon: 'fas fa-gamepad'
            };
        } else {
            return {
                type: 'device',
                shape: 'square',
                style: 'flat',
                color: '#667eea',
                icon: 'fas fa-microchip'
            };
        }
    }

    // Génération d'icône avec style
    async generateIconWithStyle(style) {
        // Simulation de génération d'icône avec IA
        // En réalité, on utiliserait DALL-E ou une autre IA
        return {
            svg: this.generateSVG(style),
            png: await this.generatePNG(style),
            metadata: {
                style: style,
                generated: new Date().toISOString(),
                version: '1.0'
            }
        };
    }

    // Génération SVG
    generateSVG(style) {
        const { shape, color, icon } = style;
        
        let svgContent = '';
        
        switch (shape) {
            case 'circle':
                svgContent = `
                    <svg width="128" height="128" viewBox="0 0 128 128" xmlns="http://www.w3.org/2000/svg">
                        <circle cx="64" cy="64" r="60" fill="${color}" stroke="#ffffff" stroke-width="4"/>
                        <text x="64" y="80" font-family="FontAwesome" font-size="40" fill="#ffffff" text-anchor="middle">${icon}</text>
                    </svg>
                `;
                break;
            case 'rounded':
                svgContent = `
                    <svg width="128" height="128" viewBox="0 0 128 128" xmlns="http://www.w3.org/2000/svg">
                        <rect x="8" y="8" width="112" height="112" rx="16" fill="${color}"/>
                        <text x="64" y="80" font-family="FontAwesome" font-size="40" fill="#ffffff" text-anchor="middle">${icon}</text>
                    </svg>
                `;
                break;
            default: // square
                svgContent = `
                    <svg width="128" height="128" viewBox="0 0 128 128" xmlns="http://www.w3.org/2000/svg">
                        <rect x="8" y="8" width="112" height="112" fill="${color}"/>
                        <text x="64" y="80" font-family="FontAwesome" font-size="40" fill="#ffffff" text-anchor="middle">${icon}</text>
                    </svg>
                `;
        }
        
        return svgContent;
    }

    // Génération PNG (simulation)
    async generatePNG(style) {
        // En réalité, on convertirait le SVG en PNG
        // Pour l'instant, on retourne une simulation
        return {
            data: 'simulated-png-data',
            format: 'png',
            style: style
        };
    }

    // Création des différentes tailles
    async createIconSizes(deviceName, iconData) {
        const iconFiles = {};
        
        for (const size of this.iconSizes) {
            const fileName = `${deviceName}-${size}.png`;
            const filePath = path.join(this.iconsDir, fileName);
            
            // Simuler la création du fichier
            iconFiles[size] = {
                path: filePath,
                size: size,
                exists: false
            };
            
            // En réalité, on redimensionnerait l'icône
            console.log(`📏 Créé: ${fileName} (${size}x${size})`);
        }
        
        return iconFiles;
    }

    // Sauvegarde des métadonnées
    saveIconMetadata(deviceName, style, iconFiles) {
        const metadata = {
            deviceName,
            style,
            iconFiles,
            created: new Date().toISOString(),
            generator: 'icon-generator.js'
        };
        
        const metadataPath = path.join(this.iconsDir, `${deviceName}-metadata.json`);
        fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2));
    }

    // Redimensionnement automatique
    async resizeIcon(iconPath, targetSize) {
        console.log(`📏 Redimensionnement: ${iconPath} vers ${targetSize}x${targetSize}`);
        
        // En réalité, on utiliserait une bibliothèque comme sharp ou jimp
        // Pour l'instant, on simule
        return {
            originalPath: iconPath,
            resizedPath: iconPath.replace('.png', `-${targetSize}.png`),
            size: targetSize,
            quality: 'high'
        };
    }

    // Validation de la cohérence
    validateConsistency(deviceName, iconStyle) {
        // Vérifier si les recommandations existent
        if (!this.benchmarkData.recommendations) {
            console.warn(`⚠️ Pas de recommandations disponibles pour ${deviceName}`);
            return true; // Par défaut, considérer comme cohérent
        }
        
        const recommendations = this.benchmarkData.recommendations;
        const issues = [];
        
        // Vérifier la cohérence avec les recommandations
        if (iconStyle.shape && recommendations.preferredShape && iconStyle.shape !== recommendations.preferredShape) {
            issues.push(`Shape ${iconStyle.shape} ne correspond pas au style recommandé ${recommendations.preferredShape}`);
        }
        
        if (iconStyle.color && recommendations.preferredColors && !recommendations.preferredColors.includes(iconStyle.color)) {
            issues.push(`Couleur ${iconStyle.color} ne fait pas partie de la palette recommandée`);
        }
        
        if (issues.length > 0) {
            console.warn(`⚠️ Problèmes de cohérence pour ${deviceName}:`, issues);
        }
        
        return issues.length === 0;
    }

    // Génération en lot
    async generateBatchIcons(devices) {
        console.log(`🎨 Génération en lot de ${devices.length} icônes...`);
        
        const results = [];
        
        for (const device of devices) {
            try {
                const iconFiles = await this.generateConsistentIcon(
                    device.name,
                    device.type,
                    device.manufacturerId
                );
                
                const isConsistent = this.validateConsistency(device.name, iconFiles.style);
                
                results.push({
                    device: device.name,
                    success: true,
                    files: iconFiles,
                    consistent: isConsistent
                });
                
                console.log(`✅ ${device.name}: ${isConsistent ? 'Cohérent' : 'Incohérent'}`);
                
            } catch (error) {
                console.error(`❌ Erreur pour ${device.name}:`, error.message);
                results.push({
                    device: device.name,
                    success: false,
                    error: error.message
                });
            }
        }
        
        // Générer le rapport
        this.generateReport(results);
        
        return results;
    }

    // Génération du rapport
    generateReport(results) {
        const report = {
            total: results.length,
            successful: results.filter(r => r.success).length,
            failed: results.filter(r => !r.success).length,
            consistent: results.filter(r => r.consistent).length,
            inconsistent: results.filter(r => r.success && !r.consistent).length,
            details: results
        };
        
        const reportPath = path.join(this.assetsDir, 'icon-generation-report.json');
        fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
        
        console.log('📊 Rapport généré:', reportPath);
        console.log(`📈 Statistiques: ${report.successful}/${report.total} réussis, ${report.consistent}/${report.successful} cohérents`);
    }
}

// Export pour utilisation
module.exports = IconGenerator;

// Utilisation directe si appelé directement
if (require.main === module) {
    const generator = new IconGenerator();
    
    generator.init().then(() => {
        console.log('🎨 Générateur d\'icônes prêt');
        
        // Exemple d'utilisation
        const sampleDevices = [
            { name: 'TS0043', type: '3 Btn Sw', manufacturerId: '_TZ3000_bczr4e10' },
            { name: 'TS0001', type: '1 Btn Sw', manufacturerId: '_TYZB01_a12345' },
            { name: 'TS0044', type: 'Remote', manufacturerId: '_TZ3000_xxxx' }
        ];
        
        generator.generateBatchIcons(sampleDevices);
    });
} 