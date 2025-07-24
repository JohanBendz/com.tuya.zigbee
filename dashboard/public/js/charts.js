// Charts.js - Graphiques dynamiques pour le dashboard

// Configuration globale de Chart.js
Chart.defaults.font.family = 'Inter, sans-serif';
Chart.defaults.color = '#64748b';

// Données pour les graphiques
const chartData = {
    devices: {
        labels: ['Implémentés', 'En cours', 'Planifiés', 'Z2M', 'HA', 'Grok'],
        datasets: [{
            label: 'Devices',
            data: [47, 156, 89, 34, 12, 0],
            backgroundColor: [
                '#4ade80', // Vert - Implémentés
                '#fbbf24', // Jaune - En cours
                '#f87171', // Rouge - Planifiés
                '#667eea', // Bleu - Z2M
                '#764ba2', // Violet - HA
                '#94a3b8'  // Gris - Grok
            ],
            borderWidth: 2,
            borderColor: '#ffffff',
            hoverOffset: 4
        }]
    },
    evolution: {
        labels: ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sep', 'Oct', 'Nov', 'Déc'],
        datasets: [{
            label: 'Devices Implémentés',
            data: [10, 25, 35, 45, 60, 75, 90, 110, 130, 150, 180, 220],
            borderColor: '#667eea',
            backgroundColor: 'rgba(102, 126, 234, 0.1)',
            tension: 0.4,
            fill: true
        }, {
            label: 'Workflows Opérationnels',
            data: [2, 4, 6, 8, 9, 10, 11, 11, 12, 12, 12, 12],
            borderColor: '#4ade80',
            backgroundColor: 'rgba(74, 222, 128, 0.1)',
            tension: 0.4,
            fill: true
        }]
    }
};

// Configuration des graphiques
const chartConfigs = {
    devices: {
        type: 'doughnut',
        data: chartData.devices,
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        padding: 20,
                        usePointStyle: true,
                        font: {
                            size: 12
                        }
                    }
                },
                tooltip: {
                    backgroundColor: 'rgba(0, 0, 0, 0.8)',
                    titleColor: '#ffffff',
                    bodyColor: '#ffffff',
                    borderColor: '#667eea',
                    borderWidth: 1,
                    cornerRadius: 8,
                    displayColors: true
                }
            },
            animation: {
                animateRotate: true,
                animateScale: true,
                duration: 1000
            }
        }
    },
    evolution: {
        type: 'line',
        data: chartData.evolution,
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'top',
                    labels: {
                        usePointStyle: true,
                        padding: 20,
                        font: {
                            size: 12
                        }
                    }
                },
                tooltip: {
                    backgroundColor: 'rgba(0, 0, 0, 0.8)',
                    titleColor: '#ffffff',
                    bodyColor: '#ffffff',
                    borderColor: '#667eea',
                    borderWidth: 1,
                    cornerRadius: 8
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    grid: {
                        color: 'rgba(0, 0, 0, 0.1)'
                    },
                    ticks: {
                        color: '#64748b'
                    }
                },
                x: {
                    grid: {
                        color: 'rgba(0, 0, 0, 0.1)'
                    },
                    ticks: {
                        color: '#64748b'
                    }
                }
            },
            animation: {
                duration: 1000,
                easing: 'easeInOutQuart'
            }
        }
    }
};

// Initialisation des graphiques
let devicesChart, evolutionChart;

function initCharts() {
    const devicesCtx = document.getElementById('devicesChart');
    const evolutionCtx = document.getElementById('evolutionChart');

    if (devicesCtx) {
        devicesChart = new Chart(devicesCtx, chartConfigs.devices);
    }

    if (evolutionCtx) {
        evolutionChart = new Chart(evolutionCtx, chartConfigs.evolution);
    }
}

// Mise à jour des données des graphiques
function updateCharts(newData) {
    if (devicesChart) {
        devicesChart.data.datasets[0].data = newData.devices || chartData.devices.datasets[0].data;
        devicesChart.update('active');
    }

    if (evolutionChart) {
        evolutionChart.data.datasets[0].data = newData.evolution || chartData.evolution.datasets[0].data;
        evolutionChart.update('active');
    }
}

// Animation des barres de progression
function animateProgressBars() {
    const progressBars = document.querySelectorAll('.progress-fill');
    
    progressBars.forEach(bar => {
        const width = bar.style.width;
        bar.style.width = '0%';
        
        setTimeout(() => {
            bar.style.width = width;
        }, 500);
    });
}

// Mise à jour en temps réel des statistiques
function updateStats() {
    const statNumbers = document.querySelectorAll('.stat-number');
    
    statNumbers.forEach(stat => {
        const targetValue = parseInt(stat.textContent);
        let currentValue = 0;
        
        const increment = targetValue / 50;
        const timer = setInterval(() => {
            currentValue += increment;
            if (currentValue >= targetValue) {
                currentValue = targetValue;
                clearInterval(timer);
            }
            stat.textContent = Math.floor(currentValue);
        }, 20);
    });
}

// Actualisation des logs
function refreshLogs() {
    const logsContainer = document.querySelector('.logs-container');
    const newLogEntry = document.createElement('div');
    newLogEntry.className = 'log-entry info';
    newLogEntry.innerHTML = `
        <span class="log-time">${new Date().toLocaleTimeString()}</span>
        <span class="log-level">INFO</span>
        <span class="log-message">Logs actualisés avec succès</span>
    `;
    
    logsContainer.insertBefore(newLogEntry, logsContainer.firstChild);
    
    // Limiter le nombre d'entrées de log
    const logEntries = logsContainer.querySelectorAll('.log-entry');
    if (logEntries.length > 20) {
        logEntries[logEntries.length - 1].remove();
    }
}

// Navigation entre les sections
function initNavigation() {
    const navLinks = document.querySelectorAll('.nav a');
    const sections = document.querySelectorAll('.section');
    
    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            
            // Retirer la classe active de tous les liens et sections
            navLinks.forEach(l => l.classList.remove('active'));
            sections.forEach(s => s.classList.remove('active'));
            
            // Ajouter la classe active au lien cliqué
            link.classList.add('active');
            
            // Afficher la section correspondante
            const targetId = link.getAttribute('href').substring(1);
            const targetSection = document.getElementById(targetId);
            if (targetSection) {
                targetSection.classList.add('active');
            }
        });
    });
}

// Filtrage des devices
function initDeviceFilter() {
    const filterSelect = document.getElementById('deviceFilter');
    const devicesGrid = document.getElementById('devicesGrid');
    
    if (filterSelect && devicesGrid) {
        filterSelect.addEventListener('change', (e) => {
            const filterValue = e.target.value;
            const deviceCards = devicesGrid.querySelectorAll('.device-card');
            
            deviceCards.forEach(card => {
                if (filterValue === 'all' || card.dataset.status === filterValue) {
                    card.style.display = 'block';
                } else {
                    card.style.display = 'none';
                }
            });
        });
    }
}

// Mise à jour en temps réel des mises à jour
function updateRealTimeUpdates() {
    const updatesList = document.getElementById('updatesList');
    if (!updatesList) return;
    
    const updates = [
        { time: '16:35', text: '🎨 Icônes générées avec succès (338/338)' },
        { time: '16:34', text: '🔄 Enrichissement HA terminé (89 devices)' },
        { time: '16:33', text: '✅ Workflow bench-ia.yml opérationnel' },
        { time: '16:32', text: '📊 Dashboard mis à jour avec nouvelles données' },
        { time: '16:31', text: '🌐 Traduction ES terminée (60%)' }
    ];
    
    updates.forEach((update, index) => {
        setTimeout(() => {
            const updateItem = document.createElement('div');
            updateItem.className = 'update-item';
            updateItem.innerHTML = `
                <span class="update-time">${update.time}</span>
                <span class="update-text">${update.text}</span>
            `;
            
            updatesList.insertBefore(updateItem, updatesList.firstChild);
            
            // Limiter le nombre d'updates
            const updateItems = updatesList.querySelectorAll('.update-item');
            if (updateItems.length > 10) {
                updateItems[updateItems.length - 1].remove();
            }
        }, index * 2000);
    });
}

// Initialisation au chargement de la page
document.addEventListener('DOMContentLoaded', () => {
    initCharts();
    initNavigation();
    initDeviceFilter();
    
    // Animations au chargement
    setTimeout(() => {
        animateProgressBars();
        updateStats();
    }, 1000);
    
    // Mises à jour en temps réel
    setInterval(updateRealTimeUpdates, 10000);
    
    // Actualisation automatique des logs
    setInterval(refreshLogs, 30000);
});

// Export des fonctions pour utilisation externe
window.dashboardCharts = {
    initCharts,
    updateCharts,
    animateProgressBars,
    updateStats,
    refreshLogs,
    updateRealTimeUpdates
}; 