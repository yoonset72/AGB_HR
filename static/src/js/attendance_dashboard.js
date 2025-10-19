// ENHANCED: JavaScript with public holiday support, weekend work, and improved modal handling
function showDayDetails(element) {
    // Check if day is clickable - block full absent and future non-leave days
    const isFuture = element.classList.contains('agb-calendar-future');
    const isFullAbsent = element.getAttribute('data-status') === 'full_absent';
    
    if (element.classList.contains('agb-calendar-public-holiday') ||
        isFullAbsent ||
        (isFuture && !isLeave)) {
        return; // Don't show modal for non-clickable days
    }

    const modal = document.getElementById('day-details-modal');
    const dateElement = document.getElementById('modal-date');

    // All sections
    const attendanceSection = modal.querySelector('.attendance-section');
    const leaveSection = modal.querySelector('.leave-section');
    const publicHolidaySection = modal.querySelector('.public-holiday-section');

    // Attendance fields
    const shiftElement = document.getElementById('modal-shift');
    const checkinElement = document.getElementById('modal-checkin');
    const checkoutElement = document.getElementById('modal-checkout');
    const lateElement = document.getElementById('modal-late');
    const statusElement = document.getElementById('modal-status');
    const attendanceElement = document.getElementById('modal-attendance');

    // Leave fields
    const leaveTypeElement = document.getElementById('modal-leave-type');
    const leaveFromElement = document.getElementById('modal-leave-from');
    const leaveToElement = document.getElementById('modal-leave-to');
    const leaveDurationElement = document.getElementById('modal-leave-duration');
    const leaveHalfDayTypeElement = document.getElementById('modal-leave-half-day-type');
    console.log('Half Day Type Element:', leaveHalfDayTypeElement)
    const leaveReasonElement = document.getElementById('modal-leave-reason');
    const leaveApprover1Element = document.getElementById('modal-leave-approver1');
    const leaveApprover2Element = document.getElementById('modal-leave-approver2');
    const leaveStateElement = document.getElementById('modal-leave-state');

    
    // Holiday fields
    const holidayNameElement = document.getElementById('modal-holiday-name');

    const date = element.getAttribute('data-date');
    const isLeave = element.getAttribute('data-leave') === '1';
    const isHalfLeave = element.getAttribute('data-is-half-leave') === '1';
    const hasAttendance = element.getAttribute('data-has-attendance') === '1';
    const isWeekend = element.getAttribute('data-is-weekend') === '1';
    const hasCheckIn = element.getAttribute('data-has-check-in') === '1';
    const hasCheckOut = element.getAttribute('data-has-check-out') === '1';
    const working_hours = element.getAttribute("data-working-hours");
    const isPublicHoliday = element.getAttribute('data-is-public-holiday') === '1';
    const holidayName = element.getAttribute('data-holiday-name') || '';
    const isInvalidHalfLeave = element.getAttribute('data-is-invalid-half-leave') === '1';
    const status = element.getAttribute('data-status');

    if (dateElement) dateElement.textContent = date;

    // Reset all sections
    if (attendanceSection) attendanceSection.style.display = 'none';
    if (leaveSection) leaveSection.style.display = 'none';
    if (publicHolidaySection) publicHolidaySection.style.display = 'none';

    // --- Public Holiday Handling ---
    if (isPublicHoliday) {
        if (publicHolidaySection) {
            publicHolidaySection.style.display = 'block';
            if (holidayNameElement) holidayNameElement.textContent = holidayName;
        }
        // Don't show attendance or leave sections for public holidays
        if (modal) modal.classList.add('show');
        return;
    }

    // --- Leave Handling ---
    if (isLeave) {
        if (leaveSection) leaveSection.style.display = 'block';

        if (leaveTypeElement) leaveTypeElement.textContent = element.getAttribute('data-leave-name') || '';
        if (leaveFromElement) leaveFromElement.textContent = element.getAttribute('data-leave-from') || '';
        if (leaveToElement) leaveToElement.textContent = element.getAttribute('data-leave-to') || '';
        if (leaveDurationElement) {
            let duration = element.getAttribute('data-leave-duration') || '';
            let halfDayType = element.getAttribute('data-leave-half-day-type') || '';

            if (halfDayType === 'am') halfDayType = 'Morning';
            else if (halfDayType === 'pm') halfDayType = 'Afternoon';
            else halfDayType = ''; // treat 'None' or empty as empty

            // Combine duration and half-day type in one span
            leaveDurationElement.textContent = halfDayType ? `${duration} (${halfDayType})` : duration;
        }

        if (leaveReasonElement) leaveReasonElement.textContent = element.getAttribute('data-leave-reason') || '';
        if (leaveApprover1Element) leaveApprover1Element.textContent = element.getAttribute('data-first-approver') || '';
        if (leaveApprover2Element) leaveApprover2Element.textContent = element.getAttribute('data-second-approver') || '';

        // Leave state mapping
        const rawState = element.getAttribute('data-leave-state') || '';
        let displayState = '';
        let stateColor = '';

        switch (rawState) {
            case 'confirm':
                displayState = isWeekend ? 'Pending' : 'Pending';
                stateColor = '#FFA500';
                break;
            case 'validate':
                displayState = isWeekend ? 'Approved' : 'Approved';
                stateColor = '#28a745';
                break;
            case 'validate1':
                displayState = isWeekend ? 'Wait for 2nd Approval' : 'Wait for 2nd Approval';
                stateColor = '#FFD700';
                break;
            default:
                displayState = rawState || 'Unknown';
                stateColor = '#6c757d';
        }

        if (leaveStateElement) {
            leaveStateElement.textContent = displayState;
            leaveStateElement.style.backgroundColor = stateColor;
            leaveStateElement.style.color = '#fff';
            leaveStateElement.style.padding = '2px 6px';
            leaveStateElement.style.borderRadius = '20px';
            leaveStateElement.style.display = 'inline-block';
        }


        // Show attendance section for partial leave (leave with attendance)
        if (hasAttendance) {
            if (attendanceSection) attendanceSection.style.display = 'block';

            // Add section divider if not exists
            if (!attendanceSection.querySelector('.section-divider')) {
                const divider = document.createElement('div');
                divider.className = 'section-divider agb-modal-section-header';
                // divider.textContent = isWeekend ? 'Weekend Attendance Information' : 'Attendance Information';
                attendanceSection.insertBefore(divider, attendanceSection.firstChild);
            }
        }

        // Add section divider for leave if not exists
        if (!leaveSection.querySelector('.section-divider')) {
            const divider = document.createElement('div');
            divider.className = 'section-divider agb-modal-section-header';
            // divider.textContent = isWeekend ? 'Weekend Leave Information' : 'Leave Information';
            leaveSection.insertBefore(divider, leaveSection.firstChild);
        }

    } else {
        // No leave - show attendance section if has attendance
        if (attendanceSection) attendanceSection.style.display = hasAttendance ? 'block' : 'none';
    }

    // --- Attendance Handling ---
    if (attendanceSection && attendanceSection.style.display !== 'none') {
        const checkin = element.getAttribute('data-checkin');
        const checkout = element.getAttribute('data-checkout');
        const late = element.getAttribute('data-late');
        const shift = element.getAttribute('data-shift');
        const attendanceFraction = parseFloat(element.getAttribute('data-attendance-fraction') || '0');

        // ENHANCED: Status determination based on attendance and leave
        let displayStatus = '';
        
        if (isLeave && hasAttendance) {
            displayStatus = 'Partial Leave + Attendance';
        } else if (hasCheckIn && hasCheckOut && working_hours >= 8) {
            displayStatus = 'Present - Full Day';
        } else if (hasCheckIn && hasCheckOut && working_hours <= 4) {
            displayStatus = 'Present - Half Day';
        } else if (hasCheckIn && !hasCheckOut) {
            displayStatus = 'Partial - Check Out Missing';
        } else if (!hasCheckIn && hasCheckOut) {
            displayStatus = 'Partial - Check In Missing';
        } else if (status === 'partial_absent') {
            displayStatus = 'Partial Absent';
        } else {
            displayStatus = 'Present';
        }

        if (shiftElement) shiftElement.textContent = shift || 'Not Assigned';
        if (checkinElement) checkinElement.textContent = checkin || 'Not recorded';
        if (checkoutElement) checkoutElement.textContent = checkout || 'Not recorded';
        if (lateElement) lateElement.textContent = (late || 0) + ' minutes';
        if (attendanceElement) attendanceElement.textContent = attendanceFraction.toFixed(1);

        if (statusElement && displayStatus) {
            statusElement.textContent = displayStatus;
            
            // Set appropriate CSS class based on status
            let statusClass = 'agb-status-badge ';
            if (displayStatus.includes('Full Day')) {
                statusClass += 'agb-status-present';
            } else if (displayStatus.includes('Partial')) {
                statusClass += 'agb-status-partial';
            } else {
                statusClass += 'agb-status-present';
            }
            statusElement.className = statusClass;
        }
    }

    if (modal) modal.classList.add('show');
}


// --- Close Modal ---
function closeDayDetails() {
    const modal = document.getElementById('day-details-modal');
    if (modal) modal.classList.remove('show');
}

function showLeaveNotification() {
    showNotification('Leave management feature coming soon!', 'info');
}

// --- Notifications ---
function showNotification(message, type = 'info') {
    const container = document.getElementById('notification-container') || createNotificationContainer();
    const notification = document.createElement('div');
    notification.className = `agb-notification ${type}`;
    notification.textContent = message;
    container.appendChild(notification);

    setTimeout(() => notification.classList.add('show'), 100);

    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => {
            if (notification.parentNode) notification.parentNode.removeChild(notification);
        }, 300);
    }, 3000);
}

function createNotificationContainer() {
    const container = document.createElement('div');
    container.id = 'notification-container';
    container.className = 'agb-notification-container';
    document.body.appendChild(container);
    return container;
}

// --- Modal Events ---
document.addEventListener('click', function(event) {
    const modal = document.getElementById('day-details-modal');
    if (modal && event.target === modal) closeDayDetails();
});

document.addEventListener('keydown', function(event) {
    if (event.key === 'Escape') closeDayDetails();
});

function toggleProfileMenu() {
    const dropdown = document.getElementById('profile-dropdown');
    if (dropdown) dropdown.classList.toggle('hidden');
}

document.addEventListener('click', function(event) {
    const menu = document.querySelector('.agb-profile-menu');
    if (menu && !menu.contains(event.target)) {
        const dropdown = document.getElementById('profile-dropdown');
        if (dropdown) dropdown.classList.add('hidden');
    }
});

window.toggleProfileMenu = toggleProfileMenu;

// --- Init ---
document.addEventListener('DOMContentLoaded', function() {
    console.log('AGB Attendance Dashboard loaded - Enhanced with Public Holidays & Weekend Work');
    if ('ontouchstart' in window) document.body.classList.add('touch-device');
});

// --- Utils ---
function formatDate(date) {
    return new Date(date).toLocaleDateString('en-US', {
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
    });
}

function calculateWorkingHours(checkin, checkout) {
    if (!checkin || !checkout) return 0;
    const diffMs = new Date('1970-01-01 ' + checkout) - new Date('1970-01-01 ' + checkin);
    return Math.max(0, diffMs / (1000 * 60 * 60));
}

// --- Pull-to-Refresh (Mobile) ---
(function() {
    let startY = 0, currentY = 0, isPulling = false;
    const threshold = 60;
    let refreshIcon = document.getElementById('pull-refresh-icon');
    if (!refreshIcon) {
        refreshIcon = document.createElement('div');
        refreshIcon.id = 'pull-refresh-icon';
        refreshIcon.innerHTML = '<i class="fa fa-spinner fa-spin"></i>';
        document.body.appendChild(refreshIcon);
    }

    function touchStartHandler(e) {
        if (window.scrollY === 0) {
            startY = e.touches[0].clientY;
            isPulling = true;
            refreshIcon.style.top = '20px';
            refreshIcon.style.opacity = '0';
        }
    }

    function touchMoveHandler(e) {
        if (!isPulling) return;
        currentY = e.touches[0].clientY;
        let deltaY = currentY - startY;

        if (deltaY > 0) {
            refreshIcon.style.display = 'block';
            refreshIcon.style.top = `${20 + deltaY / 2}px`;
            refreshIcon.style.opacity = Math.min(deltaY / threshold, 1);
            refreshIcon.classList.toggle('ready', deltaY > threshold);
        }
    }

    function touchEndHandler() {
        if (!isPulling) return;
        let deltaY = currentY - startY;
        if (deltaY > threshold) {
            refreshIcon.innerHTML = '<i class="fa fa-spinner fa-spin"></i>';
            setTimeout(() => window.location.reload(), 200);
        } else {
            refreshIcon.style.display = 'none';
        }
        isPulling = false;
    }

    document.addEventListener('touchstart', touchStartHandler, { passive: true });
    document.addEventListener('touchmove', touchMoveHandler, { passive: true });
    document.addEventListener('touchend', touchEndHandler);
})();

// --- Export ---
window.showDayDetails = showDayDetails;
window.closeDayDetails = closeDayDetails;
window.showLeaveNotification = showLeaveNotification;
window.showNotification = showNotification;