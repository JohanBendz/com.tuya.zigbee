// app.js - Logique principale du dashboard

// Configuration globale
const CONFIG = {
    apiEndpoint: '/api',
    refreshInterval: 5000,
    maxLogEntries: 50,
    maxUpdates: 20
};

// État de l'application
let appState = {
    devices: [],
    workflows: [],
    logs: [],
    stats: {
        totalDevices: 338,
        implementedDevices: 47,
        inProgressDevices: 156,
        plannedDevices: 89,
        iaModules: 6,
        languages: 6,
        workflows: 12
    }
};

// Classe principale du dashboard
class DashboardApp {
    constructor() {
        this.init();
    }

    init() {
        this.loadData();
        this.setupEventListeners();
        this.startRealTimeUpdates();
        this.initializeComponents();
    }

    // Chargement des données
    async loadData() {
        try {
            // Simulation du chargement des données
            await this.loadDevices();
            await this.loadWorkflows();
            await this.loadLogs();
            this.updateUI();
        } catch (error) {
            console.error('Erreur lors du chargement des données:', error);
            this.showError('Erreur de chargement des données');
        }
    }

    // Chargement des devices
    async loadDevices() {
        // Simulation de données de devices
        appState.devices = [
            {
                id: 'TS0043',
                name: 'TS0043',
                brand: 'Tuya',
                type: '3 Btn Sw',
                manufacturerId: '_TZ3000_bczr4e10',
                status: 'implemented',
                implementation: 95,
                date: '2024-05-02',
                docs: 'https://github.com/Koenkk/zigbee-herdsman-converters/blob/master/devices.js'
            },
            {
                id: 'TS0001',
                name: 'TS0001',
                brand: 'Lonsonho',
                type: '1 Btn Sw',
                manufacturerId: '_TYZB01_a12345',
                status: 'implemented',
                implementation: 92,
                date: '2024-03-21',
                docs: 'https://community.athom.com/'
            },
            {
                id: 'TS0044',
                name: 'Girier 3Btn',
                brand: 'Girier',
                type: 'Remote',
                manufacturerId: '_TZ3000_xxxx',
                status: 'in-progress',
                implementation: 88,
                date: '2023-12-15',
                docs: 'https://developer.tuya.com/'
            }
        ];
    }

    // Chargement des workflows
    async loadWorkflows() {
        appState.workflows = [
            {
                name: 'ci.yml',
                status: 'success',
                lastRun: '16:30',
                progress: 100,
                icon: 'fas fa-check-circle'
            },
            {
                name: 'deploy.yml',
                status: 'success',
                lastRun: '16:25',
                progress: 100,
                icon: 'fas fa-check-circle'
            },
            {
                name: 'bench-ia.yml',
                status: 'warning',
                lastRun: '16:20',
                progress: 75,
                icon: 'fas fa-exclamation-triangle'
            },
            {
                name: 'backup.yml',
                status: 'success',
                lastRun: '16:15',
                progress: 100,
                icon: 'fas fa-check-circle'
            },
            {
                name: 'translate.yml',
                status: 'warning',
                lastRun: '16:10',
                progress: 60,
                icon: 'fas fa-exclamation-triangle'
            },
            {
                name: 'repair_project.yml',
                status: 'success',
                lastRun: '16:05',
                progress: 100,
                icon: 'fas fa-check-circle'
            }
        ];
    }

    // Chargement des logs
    async loadLogs() {
        appState.logs = [
            {
                time: '16:30:15',
                level: 'INFO',
                message: 'Dashboard initialisé avec succès',
                type: 'info'
            },
            {
                time: '16:29:45',
                level: 'SUCCESS',
                message: '47 drivers restaurés depuis les branches supprimées',
                type: 'success'
            },
            {
                time: '16:28:30',
                level: 'WARNING',
                message: '156 devices Z2M en cours d\'intégration',
                type: 'warning'
            },
            {
                time: '16:27:15',
                level: 'INFO',
                message: 'Workflow ci.yml exécuté avec succès',
                type: 'info'
            },
            {
                time: '16:26:00',
                level: 'SUCCESS',
                message: 'Dashboard mis à jour avec nouvelles données',
                type: 'success'
            }
        ];
    }

    // Configuration des événements
    setupEventListeners() {
        // Filtrage des devices
        const deviceFilter = document.getElementById('deviceFilter');
        if (deviceFilter) {
            deviceFilter.addEventListener('change', (e) => {
                this.filterDevices(e.target.value);
            });
        }

        // Actualisation des logs
        const refreshBtn = document.querySelector('.refresh-btn');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => {
                this.refreshLogs();
            });
        }

        // Navigation
        const navLinks = document.querySelectorAll('.nav a');
        navLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                this.navigateToSection(link.getAttribute('href').substring(1));
            });
        });
    }

    // Navigation entre les sections
    navigateToSection(sectionId) {
        // Retirer la classe active de tous les liens et sections
        document.querySelectorAll('.nav a').forEach(link => link.classList.remove('active'));
        document.querySelectorAll('.section').forEach(section => section.classList.remove('active'));

        // Ajouter la classe active au lien et section correspondants
        const activeLink = document.querySelector(`[href="#${sectionId}"]`);
        const activeSection = document.getElementById(sectionId);

        if (activeLink) activeLink.classList.add('active');
        if (activeSection) activeSection.classList.add('active');
    }

    // Filtrage des devices
    filterDevices(filterValue) {
        const devicesGrid = document.getElementById('devicesGrid');
        if (!devicesGrid) return;

        const deviceCards = devicesGrid.querySelectorAll('.device-card');
        deviceCards.forEach(card => {
            if (filterValue === 'all' || card.dataset.status === filterValue) {
                card.style.display = 'block';
                card.style.animation = 'fadeIn 0.3s ease';
            } else {
                card.style.display = 'none';
            }
        });
    }

    // Actualisation des logs
    refreshLogs() {
        const logsContainer = document.querySelector('.logs-container');
        if (!logsContainer) return;

        const newLog = {
            time: new Date().toLocaleTimeString(),
            level: 'INFO',
            message: 'Logs actualisés manuellement',
            type: 'info'
        };

        this.addLogEntry(newLog);
    }

    // Ajout d'une entrée de log
    addLogEntry(logEntry) {
        const logsContainer = document.querySelector('.logs-container');
        if (!logsContainer) return;

        const logElement = document.createElement('div');
        logElement.className = `log-entry ${logEntry.type}`;
        logElement.innerHTML = `
            <span class="log-time">${logEntry.time}</span>
            <span class="log-level">${logEntry.level}</span>
            <span class="log-message">${logEntry.message}</span>
        `;

        logsContainer.insertBefore(logElement, logsContainer.firstChild);

        // Limiter le nombre d'entrées
        const logEntries = logsContainer.querySelectorAll('.log-entry');
        if (logEntries.length > CONFIG.maxLogEntries) {
            logEntries[logEntries.length - 1].remove();
        }
    }

    // Mise à jour de l'interface
    updateUI() {
        this.updateStats();
        this.updateDevicesGrid();
        this.updateWorkflowsGrid();
        this.updateLogs();
    }

    // Mise à jour des statistiques
    updateStats() {
        const statNumbers = document.querySelectorAll('.stat-number');
        statNumbers.forEach(stat => {
            const targetValue = parseInt(stat.textContent);
            this.animateNumber(stat, targetValue);
        });
    }

    // Animation des nombres
    animateNumber(element, targetValue) {
        let currentValue = 0;
        const increment = targetValue / 50;
        const timer = setInterval(() => {
            currentValue += increment;
            if (currentValue >= targetValue) {
                currentValue = targetValue;
                clearInterval(timer);
            }
            element.textContent = Math.floor(currentValue);
        }, 20);
    }

    // Mise à jour de la grille des devices
    updateDevicesGrid() {
        const devicesGrid = document.getElementById('devicesGrid');
        if (!devicesGrid) return;

        devicesGrid.innerHTML = '';
        appState.devices.forEach(device => {
            const deviceCard = this.createDeviceCard(device);
            devicesGrid.appendChild(deviceCard);
        });
    }

    // Création d'une carte de device
    createDeviceCard(device) {
        const card = document.createElement('div');
        card.className = 'device-card';
        card.dataset.status = device.status;

        const statusClass = device.status === 'implemented' ? 'success' : 
                          device.status === 'in-progress' ? 'warning' : 'error';

        card.innerHTML = `
            <div class="device-header">
                <h3>${device.name}</h3>
                <span class="status-badge ${statusClass}">${device.status}</span>
            </div>
            <div class="device-info">
                <p><strong>Brand:</strong> ${device.brand}</p>
                <p><strong>Type:</strong> ${device.type}</p>
                <p><strong>Manufacturer ID:</strong> ${device.manufacturerId}</p>
                <p><strong>Implementation:</strong> ${device.implementation}%</p>
                <p><strong>Date:</strong> ${device.date}</p>
            </div>
            <div class="device-progress">
                <div class="progress-bar">
                    <div class="progress-fill" style="width: ${device.implementation}%"></div>
                </div>
            </div>
            <div class="device-actions">
                <a href="${device.docs}" target="_blank" class="docs-link">
                    <i class="fas fa-external-link-alt"></i> Docs
                </a>
            </div>
        `;

        return card;
    }

    // Mise à jour de la grille des workflows
    updateWorkflowsGrid() {
        const workflowsGrid = document.querySelector('.workflows-grid');
        if (!workflowsGrid) return;

        workflowsGrid.innerHTML = '';
        appState.workflows.forEach(workflow => {
            const workflowCard = this.createWorkflowCard(workflow);
            workflowsGrid.appendChild(workflowCard);
        });
    }

    // Création d'une carte de workflow
    createWorkflowCard(workflow) {
        const card = document.createElement('div');
        card.className = `workflow-card ${workflow.status}`;

        card.innerHTML = `
            <div class="workflow-header">
                <i class="${workflow.icon}"></i>
                <h3>${workflow.name}</h3>
            </div>
            <div class="workflow-status">
                <span class="status-badge ${workflow.status}">${workflow.status === 'success' ? 'Opérationnel' : 
                                                              workflow.status === 'warning' ? 'En cours' : 'Erreur'}</span>
                <span class="last-run">Dernière exécution: ${workflow.lastRun}</span>
            </div>
            <div class="workflow-progress">
                <div class="progress-bar">
                    <div class="progress-fill" style="width: ${workflow.progress}%"></div>
                </div>
            </div>
        `;

        return card;
    }

    // Mise à jour des logs
    updateLogs() {
        const logsContainer = document.querySelector('.logs-container');
        if (!logsContainer) return;

        logsContainer.innerHTML = '';
        appState.logs.forEach(log => {
            const logElement = document.createElement('div');
            logElement.className = `log-entry ${log.type}`;
            logElement.innerHTML = `
                <span class="log-time">${log.time}</span>
                <span class="log-level">${log.level}</span>
                <span class="log-message">${log.message}</span>
            `;
            logsContainer.appendChild(logElement);
        });
    }

    // Initialisation des composants
    initializeComponents() {
        // Initialisation des graphiques
        if (window.dashboardCharts) {
            window.dashboardCharts.initCharts();
        }

        // Animation des barres de progression
        setTimeout(() => {
            this.animateProgressBars();
        }, 1000);
    }

    // Animation des barres de progression
    animateProgressBars() {
        const progressBars = document.querySelectorAll('.progress-fill');
        progressBars.forEach(bar => {
            const width = bar.style.width;
            bar.style.width = '0%';
            setTimeout(() => {
                bar.style.width = width;
            }, 500);
        });
    }

    // Démarrage des mises à jour en temps réel
    startRealTimeUpdates() {
        setInterval(() => {
            this.updateRealTimeData();
        }, CONFIG.refreshInterval);
    }

    // Mise à jour des données en temps réel
    updateRealTimeData() {
        // Simulation de mises à jour
        const updates = [
            { time: new Date().toLocaleTimeString(), text: '🔄 Synchronisation des devices en cours' },
            { time: new Date().toLocaleTimeString(), text: '📊 Mise à jour des statistiques' },
            { time: new Date().toLocaleTimeString(), text: '🎨 Génération d\'icônes terminée' }
        ];

        this.addUpdate(updates[Math.floor(Math.random() * updates.length)]);
    }

    // Ajout d'une mise à jour
    addUpdate(update) {
        const updatesList = document.getElementById('updatesList');
        if (!updatesList) return;

        const updateElement = document.createElement('div');
        updateElement.className = 'update-item';
        updateElement.innerHTML = `
            <span class="update-time">${update.time}</span>
            <span class="update-text">${update.text}</span>
        `;

        updatesList.insertBefore(updateElement, updatesList.firstChild);

        // Limiter le nombre de mises à jour
        const updateItems = updatesList.querySelectorAll('.update-item');
        if (updateItems.length > CONFIG.maxUpdates) {
            updateItems[updateItems.length - 1].remove();
        }
    }

    // Affichage d'erreur
    showError(message) {
        console.error(message);
        // Ici on pourrait ajouter une notification d'erreur dans l'UI
    }
}

// Initialisation de l'application au chargement de la page
document.addEventListener('DOMContentLoaded', () => {
    new DashboardApp();
});

// Export pour utilisation externe
window.DashboardApp = DashboardApp; 