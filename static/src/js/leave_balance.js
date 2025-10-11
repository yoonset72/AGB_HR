// Leave Balance JavaScript - Updated Grid Design

// Global variables
let employeeData = {};
let leaveBalanceData = {};

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    console.log('Leave Balance Dashboard loaded');
    
    // Get employee data from window object (set by template)
    if (window.employeeData) {
        employeeData = window.employeeData;
        console.log('Employee data loaded:', employeeData);
        loadLeaveBalances();
    } else {
        console.error('Employee data not found');
        showError('Employee data not available');
    }
    
    // Add touch device detection
    if ('ontouchstart' in window) {
        document.body.classList.add('touch-device');
    }
});

async function loadLeaveBalances() {
    try {
        // 1. Fetch leave types
        const typesRes = await fetch('/api/time-off-types', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ employee_number: employeeData.employee_number })
        });

        const typesJson = await typesRes.json();
        console.log("DEBUG raw leave types =", typesJson);

        // Extract inner result array safely
        const leaveTypes = Array.isArray(typesJson?.result?.result)
            ? typesJson.result.result
            : [];
        console.log("DEBUG normalized leave types =", leaveTypes);

        // 2. Fetch leave balances
        const balancesRes = await fetch('/api/leave-balance', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ employee_number: employeeData.employee_number })
        });

        const balancesJson = await balancesRes.json();
        const leaveBalances = balancesJson.result || {};
        console.log("DEBUG leave balances =", leaveBalances);

        // 3. Merge leave types with balances
        const merged = {};

        leaveTypes.forEach(type => {
            // Convert name like "Annual Leave" -> key "annual"
            const key = type.name.toLowerCase().split(' ')[0];

            const balanceData = leaveBalances[key] || {};

            merged[key] = {
                total: balanceData.total || 0,
                taken: balanceData.taken || 0,
                available: balanceData.available || 0,
                pending: balanceData.pending || 0
            };
        });

        console.log("✅ Final merged leave balances:", merged);

        // Render leave balance cards
        renderLeaveBalances(merged);

    } catch (error) {
        console.error("❌ Error loading leave balances:", error);
        showError("Error loading leave balances");
    }
}


// Refresh data
function refreshLeaveBalances() {
    console.log('Refreshing leave balances...');
    loadLeaveBalances();
}


// Simple notification helper
function showNotification(message, type = "info") {
    console.log(`[${type.toUpperCase()}] ${message}`);
}



// Render leave balance cards with new design
function renderLeaveBalances(data) {
    const grid = document.getElementById('leave-balance-grid');
    if (!grid) {
        console.error('Balance grid not found');
        return;
    }

    // Clear loading state
    grid.innerHTML = '';

    // Define leave types with their display information
    const leaveTypes = [
        { key: 'annual', name: 'Annual Leave', icon: 'fa-calendar-check-o', class: 'annual' },
        { key: 'casual', name: 'Casual Leave', icon: 'fa-coffee', class: 'casual' },
        { key: 'maternity', name: 'Maternity Leave', icon: 'fa-female', class: 'maternity' },
        { key: 'medical', name: 'Medical Leave', icon: 'fa-medkit', class: 'medical' },
        { key: 'funeral', name: 'Funeral Leave', icon: 'fa-frown-o', class: 'funeral' },
        { key: 'marriage', name: 'Married Leave', icon: 'fa-heart', class: 'marriage' },
        { key: 'unpaid', name: 'Unpaid Leave', icon: 'fa-ban', class: 'unpaid' },
        { key: 'paternity', name: 'Paternity Leave', icon: 'fa-male', class: 'paternity' }
    ];

    let hasData = false;

    leaveTypes.forEach((leaveType, index) => {
        const leaveData = data[leaveType.key];
        
        // Only render if there's meaningful data (total > 0 or taken > 0 or pending > 0)
        if (leaveData && (leaveData.total > 0 || leaveData.taken > 0 || leaveData.pending > 0)) {
            hasData = true;
            
            const card = createBalanceCard(leaveType, leaveData, index);
            grid.appendChild(card);
        }
    });

    // Show no data message if no leave types have data
    if (!hasData) {
        showNoData();
    }
}

// Create individual balance card with new design
function createBalanceCard(leaveType, leaveData, index) {
    const card = document.createElement('div');
    card.className = `agb-balance-card agb-balance-${leaveType.class}`;
    card.style.animationDelay = `${index * 0.1}s`;

    // Extract data values
    const total = leaveData.total_dynamic || leaveData.total || 0;
    const taken = leaveData.taken || 0;
    const balance = leaveData.available || leaveData.balance || 0;
    const pending = leaveData.pending || 0;

    // Create card HTML with new design
    card.innerHTML = `
        <div class="agb-balance-card-header">
            <div class="agb-balance-title-section">
                <i class="fa ${leaveType.icon} agb-balance-icon"></i>
                <h3 class="agb-balance-title">${leaveType.name}</h3>
            </div>
            <div class="agb-balance-total-badge">
                <span class="agb-total-label">Total:</span>
                <span class="agb-total-value">${formatNumber(total)}</span>
            </div>
        </div>
        
        <div class="agb-balance-metrics-grid">
            <div class="agb-metric-box agb-metric-taken">
                <div class="agb-metric-value">${formatNumber(taken)}</div>
                <div class="agb-metric-label">Taken</div>
            </div>
            <div class="agb-metric-box agb-metric-balance">
                <div class="agb-metric-value">${formatNumber(balance)}</div>
                <div class="agb-metric-label">Balance</div>
            </div>
            <div class="agb-metric-box agb-metric-pending">
                <div class="agb-metric-value">${formatNumber(pending)}</div>
                <div class="agb-metric-label">Pending</div>
            </div>
        </div>
    `;

    // Add click interactions
    addCardInteractions(card, leaveType, leaveData);

    return card;
}

// Add interactions to cards
function addCardInteractions(card, leaveType, leaveData) {
    // Add hover effects
    card.addEventListener('mouseenter', function() {
        this.style.transform = 'translateY(-2px)';
    });

    card.addEventListener('mouseleave', function() {
        this.style.transform = 'translateY(0)';
    });

    // Add click handler for detailed view
    // card.addEventListener('click', function() {
    //     showLeaveDetail(leaveType, leaveData);
    // });

    // Add keyboard navigation
    card.setAttribute('tabindex', '0');
    card.addEventListener('keydown', function(e) {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            showLeaveDetail(leaveType, leaveData);
        }
    });
}

// Show detailed leave information
function showLeaveDetail(leaveType, leaveData) {
    console.log('Showing detail for:', leaveType.name, leaveData);
    
    // You can implement a modal or detailed view here
    // For now, just log the information
    alert(`${leaveType.name} Details:\nTotal: ${leaveData.total || 0}\nTaken: ${leaveData.taken || 0}\nBalance: ${leaveData.available || leaveData.balance || 0}\nPending: ${leaveData.pending || 0}`);
}

// Utility function to format numbers
function formatNumber(num) {
    if (num === null || num === undefined) return '0';
    return parseFloat(num).toString();
}

// Show loading state
function showLoading(show) {
    const loadingElement = document.getElementById('leave-balance-loading');
    const gridElement = document.getElementById('leave-balance-grid');
    
    if (loadingElement && gridElement) {
        if (show) {
            loadingElement.style.display = 'flex';
            gridElement.style.display = 'none';
        } else {
            loadingElement.style.display = 'none';
            gridElement.style.display = 'grid';
        }
    }
}

// Show error message
function showError(message) {
    console.error('Error:', message);
    const grid = document.getElementById('leave-balance-grid');
    if (grid) {
        grid.innerHTML = `
            <div class="agb-loading-card">
                <i class="fa fa-exclamation-triangle"></i>
                <p>Error: ${message}</p>
                <button onclick="loadLeaveBalances()" class="agb-btn agb-btn-primary" style="margin-top: 16px;">
                    <i class="fa fa-refresh"></i> Retry
                </button>
            </div>
        `;
    }
}



// Show no data message
function showNoData() {
    const grid = document.getElementById('leave-balance-grid');
    if (grid) {
        grid.innerHTML = `
            <div class="agb-loading-card">
                <i class="fa fa-info-circle"></i>
                <p>No leave balance data available.</p>
                <p style="margin-top: 8px; font-size: 14px; color: #9ca3af;">Please contact HR for more information.</p>
            </div>
        `;
    }
}

// Refresh data
function refreshLeaveBalances() {
    console.log('Refreshing leave balances...');
    loadLeaveBalances();
}

// Export functions for external use
window.leaveBalanceFunctions = {
    refresh: refreshLeaveBalances,
    showDetail: showLeaveDetail,
    formatNumber: formatNumber
};

// Handle page visibility changes to refresh data when page becomes visible
document.addEventListener('visibilitychange', function() {
    if (!document.hidden && employeeData.employee_number) {
        // Refresh data when page becomes visible again
        setTimeout(refreshLeaveBalances, 1000);
    }
});

// Handle browser back/forward navigation
window.addEventListener('pageshow', function(event) {
    if (event.persisted) {
        // Page was loaded from cache, refresh data
        refreshLeaveBalances();
    }
});