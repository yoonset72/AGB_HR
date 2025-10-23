/**
 * AGB Communication Myanmar Employee Profile JavaScript
 * Handles all interactive functionality for the employee profile page
 * Updated to work with Python/Odoo backend
 */

// Global variables
let currentEditSection = null;
let originalFormData = {};

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    initializeProfile();
    setupEventListeners();
    loadRecentActivity();
});

/**
 * Initialize profile page functionality
 */
function initializeProfile() {
    console.log('AGB Employee Profile initialized');
    
    // Add loading states
    addLoadingStates();
    
    // Initialize tooltips if needed
    initializeTooltips();
    
    // Check for unsaved changes
    window.addEventListener('beforeunload', handleBeforeUnload);
    
    // Initialize image upload functionality
    initializeImageUpload();
}

/**
 * Setup all event listeners
 */
function setupEventListeners() {
    // Edit button listeners
    const editButtons = document.querySelectorAll('.agb-btn-edit');
    editButtons.forEach(button => {
        button.addEventListener('click', function() {
            const section = this.getAttribute('data-section') || 
                           this.getAttribute('onclick')?.match(/editSection\('(.+?)'\)/)?.[1];
            if (section) {
                editSection(section);
            }
        });
    });
    
    // Modal close listeners
    const closeButtons = document.querySelectorAll('.agb-modal-close');
    closeButtons.forEach(button => {
        button.addEventListener('click', closeModal);
    });
    
    // Form submission listeners
    const editForm = document.getElementById('editForm');
    if (editForm) {
        editForm.addEventListener('submit', handleFormSubmit);
    }
    
    // Settings button listeners
    setupSettingsListeners();
    
    // Navigation listeners
    setupNavigationListeners();
}

/**
 * Edit a specific section of the profile
 * @param {string} section - The section to edit (personal, contact, education, etc.)
 */
function editSection(section) {
    const modal = document.getElementById('editModal');
    const modalTitle = document.getElementById('modalTitle');
    const editFields = document.getElementById('editFields');
    
    if (!modal || !modalTitle || !editFields) {
        console.error('Modal elements not found');
        return;
    }
    
    currentEditSection = section;
    
    // Clear previous fields
    editFields.innerHTML = '';
    
    // Store original form data
    storeOriginalFormData(section);
    
    // Set title and fields based on section
    switch(section) {
        case 'personal':
            setupPersonalEditForm(modalTitle, editFields);
            break;
        case 'contact':
            setupContactEditForm(modalTitle, editFields);
            break;
        case 'education':
            setupEducationEditForm(modalTitle, editFields);
            break;
        case 'work':
            setupWorkEditForm(modalTitle, editFields);
            break;
        default:
            console.error('Unknown section:', section);
            return;
    }
    
    // Show modal with animation
    showModal(modal);
}

/**
 * Setup personal information edit form
 */
function setupPersonalEditForm(modalTitle, editFields) {
    modalTitle.textContent = 'Edit Personal Information';
    editFields.innerHTML = `
        <div class="agb-form-group">
            <label class="agb-label">
                <i class="fa fa-user"></i>
                Full Name
            </label>
            <input type="text" name="name" class="agb-input" 
                   value="${getEmployeeData('name')}" required/>
        </div>
        <div class="agb-form-group">
            <label class="agb-label">
                <i class="fa fa-venus-mars"></i>
                Gender
            </label>
            <select name="gender" class="agb-input">
                <option value="">Select Gender</option>
                <option value="male" ${getEmployeeData('gender') === 'male' ? 'selected' : ''}>Male</option>
                <option value="female" ${getEmployeeData('gender') === 'female' ? 'selected' : ''}>Female</option>
                <option value="other" ${getEmployeeData('gender') === 'other' ? 'selected' : ''}>Other</option>
            </select>
        </div>
        <div class="agb-form-group">
            <label class="agb-label">
                <i class="fa fa-calendar"></i>
                Date of Birth
            </label>
            <input type="date" name="birthday" class="agb-input" 
                   value="${getEmployeeData('birthday')}"/>
        </div>
        <div class="agb-form-group">
            <label class="agb-label">
                <i class="fa fa-id-card"></i>
                NRC Number
            </label>
            <input type="text" name="nrc_full" class="agb-input" disabled
                   value="${getEmployeeData('nrc_full')}" 
                   placeholder="e.g., 12/KAMANA(N)123456"/>
        </div>
        <div class="agb-form-group">
            <label class="agb-label">
                <i class="fa fa-flag"></i>
                Nationality
            </label>
            <input type="text" name="country_id" class="agb-input" 
                value="${getEmployeeData('country_id.name')}" placeholder="e.g., Myanmar"/>
        </div>
        <div class="agb-form-group">
            <label class="agb-label">
                <i class="fa fa-heart"></i>
                Marital Status
            </label>
            <select name="marital" class="agb-input">
                <option value="">Select Status</option>
                <option value="single" ${getEmployeeData('marital') === 'single' ? 'selected' : ''}>Single</option>
                <option value="married" ${getEmployeeData('marital') === 'married' ? 'selected' : ''}>Married</option>
                <option value="divorced" ${getEmployeeData('marital') === 'divorced' ? 'selected' : ''}>Divorced</option>
                <option value="widowed" ${getEmployeeData('marital') === 'widowed' ? 'selected' : ''}>Widowed</option>
            </select>
        </div>
        <div class="agb-form-group">
            <label class="agb-label">
                <i class="fa fa-id-badge"></i>
                SSB Registration No
            </label>
            <input type="text" name="permit_no" class="agb-input"
                value="${getEmployeeData('permit_no')}" placeholder="e.g., 123456789"/>
        </div>
    `;
}

/**
 * Setup contact information edit form
 */
function setupContactEditForm(modalTitle, editFields) {
    modalTitle.textContent = 'Edit Contact Information';
    editFields.innerHTML = `
        <div class="agb-form-group">
            <label class="agb-label">
                <i class="fa fa-phone"></i>
                Personal Phone
            </label>
            <input type="tel" name="personal_phone" class="agb-input" 
                   value="${getEmployeeData('personal_phone')}" 
                   placeholder="+95-9-xxx-xxx-xxx"/>
        </div>
        <div class="agb-form-group">
            <label class="agb-label">
                <i class="fa fa-envelope"></i>
                Personal Email
            </label>
            <input type="email" name="personal_email" class="agb-input" 
                   value="${getEmployeeData('personal_email')}" 
                   placeholder="your.email@gmail.com"/>
        </div>
        <div class="agb-form-group">
            <label class="agb-label">
                <i class="fa fa-home"></i>
                Home Address
            </label>
            <textarea name="home_address" class="agb-input" rows="3" 
                      placeholder="Enter your complete home address">${getEmployeeData('home_address')}</textarea>
        </div>
    `;
}

/**
 * Setup education information edit form
 */
function setupEducationEditForm(modalTitle, editFields) {
    modalTitle.textContent = 'Edit Education & Contact Information';
    editFields.innerHTML = `
        <div class="agb-form-group">
            <label class="agb-label">
                <i class="fa fa-graduation-cap"></i>
                Highest Level of Education
            </label>
            <select name="certificate" class="agb-input">
                <option value="">Select Education Level</option>
                <option value="high_school" ${getEmployeeData('certificate') === 'high_school' ? 'selected' : ''}>High School</option>
                <option value="diploma" ${getEmployeeData('certificate') === 'diploma' ? 'selected' : ''}>Diploma</option>
                <option value="bachelor" ${getEmployeeData('certificate') === 'bachelor' ? 'selected' : ''}>Bachelor's Degree</option>
                <option value="master" ${getEmployeeData('certificate') === 'master' ? 'selected' : ''}>Master's Degree</option>
                <option value="phd" ${getEmployeeData('certificate') === 'phd' ? 'selected' : ''}>PhD</option>
            </select>
        </div>
        <div class="agb-form-group">
            <label class="agb-label">
                <i class="fa fa-book"></i>
                Specialization/Field of Study
            </label>
            <input type="text" name="study_field" class="agb-input" 
                   value="${getEmployeeData('study_field')}" 
                   placeholder="e.g., Computer Science, Business Administration"/>
        </div>
        <div class="agb-form-group">
            <label class="agb-label">
                <i class="fa fa-phone"></i>
                Personal Phone
            </label>
            <input type="tel" name="personal_phone" class="agb-input" 
                   value="${getEmployeeData('personal_phone')}" 
                   placeholder="+95-9-xxx-xxx-xxx"/>
        </div>
        <div class="agb-form-group">
            <label class="agb-label">
                <i class="fa fa-envelope"></i>
                Personal Email
            </label>
            <input type="email" name="personal_email" class="agb-input" 
                   value="${getEmployeeData('personal_email')}" 
                   placeholder="your.email@gmail.com"/>
        </div>
        <div class="agb-form-group">
            <label class="agb-label">
                <i class="fa fa-home"></i>
                Home Address
            </label>
            <textarea name="home_address" class="agb-input" rows="3" 
                      placeholder="Enter your complete home address">${getEmployeeData('home_address')}</textarea>
        </div>
    `;
}

/**
 * Setup work information edit form
 */
// function setupWorkEditForm(modalTitle, editFields) {
//     modalTitle.textContent = 'Edit Work Information';
//     editFields.innerHTML = `
//         <div class="agb-form-group">
//             <label class="agb-label">
//                 <i class="fa fa-briefcase"></i>
//                 Job Title
//             </label>
//             <input type="text" name="job_title" class="agb-input" 
//                    value="${getEmployeeData('job_title')}" 
//                    placeholder="e.g., Senior Software Developer"/>
//         </div>
//         <div class="agb-form-group">
//             <label class="agb-label">
//                 <i class="fa fa-envelope"></i>
//                 Work Email
//             </label>
//             <input type="email" name="work_email" class="agb-input" 
//                    value="${getEmployeeData('work_email')}" 
//                    placeholder="your.name@agb.com.mm"/>
//         </div>
//     `;
// }

/**
 * Get employee data from the page
 */
function getEmployeeData(field) {
    const element = document.querySelector(`[data-field="${field}"]`);
    if (element) {
        const value = element.textContent.trim() || element.value || '';
        console.log(`getEmployeeData("${field}") =>`, value);
        
        // Handle "Not Set" values
        if (value === 'Not Set' || value === 'false') {
            return '';
        }
        // Handle Odoo object representations like "res.partner(41,)"
        if (value.includes('res.partner(') || value.includes('res.')) {
            return '';
        }
        return value;
    }
    console.log(`getEmployeeData("${field}") => no element found`);
    return '';
}

/**
 * Store original form data for comparison
 */
function storeOriginalFormData(section) {
    originalFormData[section] = {};
    // Store current values for comparison later
}

/**
 * Show modal with animation
 */
function showModal(modal) {
    modal.style.display = 'flex';
    modal.style.opacity = '0';
    
    // Trigger animation
    requestAnimationFrame(() => {
        modal.style.opacity = '1';
        const modalContent = modal.querySelector('.agb-modal-content');
        if (modalContent) {
            modalContent.style.transform = 'translateY(0)';
        }
    });
    
    // Focus first input
    const firstInput = modal.querySelector('input, select, textarea');
    if (firstInput) {
        setTimeout(() => firstInput.focus(), 100);
    }
    
    // Add escape key listener
    document.addEventListener('keydown', handleEscapeKey);
}

/**
 * Close modal
 */
function closeModal() {
    const modal = document.getElementById('editModal');
    if (!modal) return;
    
    // Check for unsaved changes
    if (hasUnsavedChanges()) {
        if (!confirm('You have unsaved changes. Are you sure you want to close?')) {
            return;
        }
    }
    
    // Animate out
    modal.style.opacity = '0';
    const modalContent = modal.querySelector('.agb-modal-content');
    if (modalContent) {
        modalContent.style.transform = 'translateY(-20px)';
    }
    
    setTimeout(() => {
        modal.style.display = 'none';
        currentEditSection = null;
        originalFormData = {};
    }, 300);
    
    // Remove escape key listener
    document.removeEventListener('keydown', handleEscapeKey);
}

/**
 * Handle escape key press
 */
function handleEscapeKey(event) {
    if (event.key === 'Escape') {
        closeModal();
    }
}

/**
 * Handle form submission
 */
function handleFormSubmit(event) {
    event.preventDefault();
    
    const form = event.target;
    const formData = new FormData(form);
    
    // Convert FormData to plain object
    const data = {};
    formData.forEach((value, key) => {
        data[key] = value;
    });
    
    // Add section
    data['section'] = currentEditSection;
    
    console.log('Sending data:', data); // Debug log
    
    showLoadingState(form);
    
    fetch('/employee/profile/update', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-Requested-With': 'XMLHttpRequest',
            'X-CSRFToken': getCsrfToken()
        },
        body: JSON.stringify(data)
    })
    .then(response => {
        console.log('Response status:', response.status);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json();
    })
    .then(responseData => {
        hideLoadingState(form);
        console.log('Server response:', responseData);
        
        const data = responseData.result || responseData;
        
        if (data.success) {
            showNotification('Profile updated successfully!', 'success');
            if (data.updated_data) {
                updatePageData(data.updated_data);
            }
            closeModal();
        } else {
            showNotification(data.error || 'Failed to update profile', 'error');
        }
    })
    .catch(error => {
        hideLoadingState(form);
        console.error('Error updating profile:', error);
        showNotification('Network error. Please try again.', 'error');
    });
}

/**
 * Get CSRF token for secure requests
 */
function getCsrfToken() {
    const token = document.querySelector('meta[name="csrf-token"]');
    return token ? token.getAttribute('content') : '';
}

/**
 * Check for unsaved changes
 */
function hasUnsavedChanges() {
    const form = document.getElementById('editForm');
    if (!form) return false;
    
    const formData = new FormData(form);
    // Compare with original data
    // Implementation depends on your specific needs
    return false;
}

/**
 * Show loading state on form
 */
function showLoadingState(form) {
    const submitButton = form.querySelector('button[type="submit"]');
    if (submitButton) {
        submitButton.disabled = true;
        submitButton.innerHTML = '<i class="fa fa-spinner fa-spin"></i> Saving...';
    }
}

/**
 * Hide loading state on form
 */
function hideLoadingState(form) {
    const submitButton = form.querySelector('button[type="submit"]');
    if (submitButton) {
        submitButton.disabled = false;
        submitButton.innerHTML = '<i class="fa fa-save"></i> Save Changes';
    }
}

/**
 * Update page data after successful save
 */
function updatePageData(updatedData) {
    console.log('Updating page data:', updatedData);
    for (const [field, value] of Object.entries(updatedData)) {
        const elements = document.querySelectorAll(`[data-field="${field}"]`);
        elements.forEach(element => {
            if (element.tagName === 'INPUT' || element.tagName === 'TEXTAREA') {
                element.value = value;
            } else {
                // Handle false values and object representations
                let displayValue = value;
                if (value === false || value === null || value === undefined) {
                    displayValue = 'Not Set';
                } else if (typeof value === 'string' && value.includes('res.partner(')) {
                    displayValue = 'Not Set';
                }
                element.textContent = displayValue;
            }
        });
    }
}

/**
 * Show notification message
 */
function showNotification(message, type = 'info') {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `agb-notification agb-notification-${type}`;
    notification.innerHTML = `
        <i class="fa fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i>
        <span>${message}</span>
        <button class="agb-notification-close" onclick="this.parentElement.remove()">
            <i class="fa fa-times"></i>
        </button>
    `;
    
    // Add to page
    document.body.appendChild(notification);
    
    // Auto remove after 5 seconds
    setTimeout(() => {
        if (notification.parentElement) {
            notification.remove();
        }
    }, 5000);
    
    // Animate in
    requestAnimationFrame(() => {
        notification.style.transform = 'translateX(0)';
        notification.style.opacity = '1';
    });
}

/**
 * Initialize image upload functionality
 */
function initializeImageUpload() {
    const imageContainer = document.querySelector('.agb-profile-image-container');
    const fileInput = document.getElementById('profile-image-input');
    
    if (imageContainer && fileInput) {
        // Add drag and drop support
        imageContainer.addEventListener('dragover', function(e) {
            e.preventDefault();
            imageContainer.classList.add('agb-drag-over');
        });
        
        imageContainer.addEventListener('dragleave', function(e) {
            e.preventDefault();
            imageContainer.classList.remove('agb-drag-over');
        });
        
        imageContainer.addEventListener('drop', function(e) {
            e.preventDefault();
            imageContainer.classList.remove('agb-drag-over');
            
            const files = e.dataTransfer.files;
            if (files.length > 0) {
                handleImageFile(files[0]);
            }
        });
    }
}

/**
 * Open image upload dialog
 */
function openImageUpload() {
    const fileInput = document.getElementById('profile-image-input');
    if (fileInput) {
        fileInput.click();
    }
}

/**
 * Handle image upload from file input
 */
function handleImageUpload(event) {
    const file = event.target.files[0];
    if (file) {
        handleImageFile(file);
    }
}

/**
 * Handle file input change
 */
function handleImageUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    handleImageFile(file);
}

/**
 * Validate and upload image
 */
function handleImageFile(file) {
    // Validate file type
    if (!file.type.startsWith('image/')) {
        showToast('Invalid file type', 'Please select an image file (JPG, PNG, etc.)', 'error');
        return;
    }

    // Validate file size (5MB)
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
        showToast('File too large', 'Please select an image smaller than 5MB', 'error');
        return;
    }

    // Show loading spinner
    showImageUploadLoading(true);

    // Prepare FormData
    const formData = new FormData();
    formData.append('image', file);
    formData.append('csrf_token', getCsrfToken());

    // Include employee_number from DOM
    const header = document.querySelector('.agb-profile-header');
    if (header && header.dataset.employeeNumber) {
        formData.append('employee_number', header.dataset.employeeNumber);
    }

    // Upload via fetch
    fetch('/employee/update_profile_image', {
        method: 'POST',
        body: formData,
        headers: {
            'X-Requested-With': 'XMLHttpRequest'
        }
    })
    .then(resp => resp.json())
    .then(data => {
        showImageUploadLoading(false);

        if (data.success) {
            updateProfileImagePreview(data.image_url);
            showToast('Image uploaded', 'Your profile image has been updated successfully', 'success');
            showRemoveButton(true);
        } else {
            showToast('Upload failed', data.error || 'Failed to upload image', 'error');
        }
    })
    .catch(err => {
        showImageUploadLoading(false);
        console.error('Upload error:', err);
        showToast('Upload failed', 'An error occurred while uploading the image. Please try again.', 'error');
    });
}

function showConfirm(message) {
    return new Promise((resolve) => {
        // Create overlay
        const overlay = document.createElement('div');
        overlay.className = 'agb-confirm-overlay';
        
        // Create confirm box
        const box = document.createElement('div');
        box.className = 'agb-confirm-box';
        box.innerHTML = `
            <p>${message}</p>
            <div class="agb-confirm-actions">
                <button class="agb-confirm-yes">Yes</button>
                <button class="agb-confirm-no">No</button>
            </div>
        `;
        overlay.appendChild(box);
        document.body.appendChild(overlay);
        
        // Handle Yes/No clicks
        box.querySelector('.agb-confirm-yes').addEventListener('click', () => {
            overlay.remove();
            resolve(true);
        });
        box.querySelector('.agb-confirm-no').addEventListener('click', () => {
            overlay.remove();
            resolve(false);
        });
    });
}


async function removeProfileImage(event) {
    event.stopPropagation();

    const confirmed = await showConfirm('Are you sure you want to remove your profile image?');
    if (!confirmed) return;

    showImageUploadLoading(true);

    const header = document.querySelector('.agb-profile-header');
    let empNumber = header ? header.getAttribute('data-employee-number') : null;

    // Use FormData instead of JSON
    const formData = new FormData();
    formData.append('csrf_token', getCsrfToken());
    if (empNumber) formData.append('employee_number', empNumber);

    fetch('/employee/remove_profile_image', {
        method: 'POST',
        body: formData,
        headers: {
            'X-Requested-With': 'XMLHttpRequest'
        }
    })
    .then(resp => resp.json())
    .then(data => {
        showImageUploadLoading(false);

        if (data.success) {
            updateProfileImagePreview(null);
            showToast('Image removed', 'Your profile image has been removed successfully', 'success');
            showRemoveButton(false);
        } else {
            showToast('Remove failed', data.error || 'Failed to remove image', 'error');
        }
    })
    .catch(err => {
        showImageUploadLoading(false);
        console.error('Remove error:', err);
        showToast('Remove failed', 'An error occurred while removing the image. Please try again.', 'error');
    });
}


/**
 * Helpers (you likely already have these)
 */
function getCsrfToken() {
    const meta = document.querySelector('meta[name="csrf-token"]');
    return meta ? meta.content : '';
}

function showImageUploadLoading(show) {
    const loader = document.getElementById('image-loading');
    if (loader) loader.style.display = show ? 'block' : 'none';
}




/**
 * Handle image load success
 */
function handleImageLoad(imgElement) {
    console.log('Image loaded successfully');
    showImageUploadLoading(false);
    
    // Show remove button
    const removeBtn = document.querySelector('.agb-profile-remove-btn');
    if (removeBtn) {
        removeBtn.style.display = 'flex';
    }
}

/**
 * Handle image load error - this fixes the "always error loading image" issue
 */
function handleImageError(imgElement) {
    console.error('Failed to load profile image');
    showImageUploadLoading(false);
    
    // Show fallback avatar
    const container = imgElement.parentElement;
    if (container) {
        imgElement.style.display = 'none';
        
        // Create or show avatar fallback
        let avatar = container.querySelector('.agb-profile-avatar');
        if (!avatar) {
            avatar = document.createElement('div');
            avatar.className = 'agb-profile-avatar';
            avatar.innerHTML = '<i class="fa fa-user"></i>';
            container.appendChild(avatar);
        }
        avatar.style.display = 'flex';
        
        // Show error notification
        showToast('Image Error', 'Failed to load profile image', 'error');
    }
}

function updateProfileImagePreview(imageUrl) {
    const imageElement = document.getElementById('profile-image');
    const avatarElement = document.getElementById('profile-avatar');
    const container = document.querySelector('.agb-profile-image-container');

    if (imageUrl) {
        // Show image
        if (imageElement) {
            imageElement.src = imageUrl;  // use URL directly
            imageElement.style.display = 'block';
            imageElement.onerror = function() { handleImageError(this); };
            imageElement.onload = function() { handleImageLoad(this); };
        } else if (container) {
            // Create new image element
            const newImage = document.createElement('img');
            newImage.id = 'profile-image';
            newImage.className = 'agb-profile-image';
            newImage.alt = 'Employee Photo';
            newImage.src = imageUrl;
            newImage.onerror = function() { handleImageError(this); };
            newImage.onload = function() { handleImageLoad(this); };
            container.insertBefore(newImage, container.firstChild);
        }

        // Hide avatar
        if (avatarElement) avatarElement.style.display = 'none';
    } else {
        // Hide image and show avatar
        if (imageElement) imageElement.style.display = 'none';

        if (avatarElement) {
            avatarElement.style.display = 'flex';
        } else if (container) {
            // Create avatar element if not exist
            const newAvatar = document.createElement('div');
            newAvatar.id = 'profile-avatar';
            newAvatar.className = 'agb-profile-avatar';
            newAvatar.innerHTML = '<i class="fa fa-user"></i>';
            newAvatar.style.display = 'flex';
            container.insertBefore(newAvatar, container.firstChild);
        }
    }
}


/**
 * Show/hide image upload loading state
 */
function showImageUploadLoading(show) {
    const loadingElement = document.getElementById('image-loading');
    const editIndicator = document.querySelector('.agb-profile-edit-indicator');
    const overlay = document.querySelector('.agb-profile-overlay');
    
    if (loadingElement) {
        loadingElement.style.display = show ? 'flex' : 'none';
    }
    
    if (editIndicator) {
        editIndicator.style.display = show ? 'none' : 'flex';
    }
    
    if (overlay) {
        overlay.style.display = show ? 'none' : 'flex';
    }
}

/**
 * Show/hide remove button
 */
function showRemoveButton(show) {
    const removeBtn = document.querySelector('.agb-profile-remove-btn');
    if (removeBtn) {
        removeBtn.style.display = show ? 'flex' : 'none';
    }
}

/**
 * Change password functionality
 */
// function changePassword() {
//     // Fetch secure token
//     fetch('/employee/get_token', {
//         method: 'GET',
//         headers: { 'X-Requested-With': 'XMLHttpRequest' }
//     })
//     .then(res => res.json())
//     .then(data => {
//         if (data.token) {
//             // Redirect to change password page with token (GET)
//             window.location.href = `/employee/change_password?token=${data.token}`;
//         } else {
//             showToast('Error', 'Unable to get secure access token.', 'error');
//         }
//     })
//     .catch(err => {
//         console.error(err);
//         showToast('Error', 'Failed to initiate password change.', 'error');
//     });
// }


/**
 * Setup settings button listeners
 */
function setupSettingsListeners() {
    // Change password
    const changePasswordBtn = document.querySelector('[onclick="changePassword()"]');
    if (changePasswordBtn) {
        changePasswordBtn.addEventListener('click', function(e) {
            e.preventDefault();
            changePassword();
        });
    }
}

/**
 * Setup navigation listeners
 */
function setupNavigationListeners() {
    const navLinks = document.querySelectorAll('.agb-nav-link');
    navLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            // Add loading state for navigation
            if (!this.classList.contains('active')) {
                this.innerHTML += ' <i class="fa fa-spinner fa-spin"></i>';
            }
        });
    });
}

/**
 * Add loading states to elements
 */
function addLoadingStates() {
    // Add loading states to buttons and forms as needed
    console.log('Loading states initialized');
}

/**
 * Initialize tooltips
 */
function initializeTooltips() {
    // Initialize any tooltips if using a tooltip library
    console.log('Tooltips initialized');
}

/**
 * Handle before unload
 */
function handleBeforeUnload(event) {
    if (hasUnsavedChanges()) {
        event.preventDefault();
        event.returnValue = '';
        return '';
    }
}

/**
 * Load recent activity (placeholder)
 */
function loadRecentActivity() {
    // Load recent activity data
    console.log('Recent activity loaded');
}

/**
 * Show toast notification
 */
function showToast(title, message, type = 'info') {
    const toastContainer = document.getElementById('toast-container') || document.body;
    
    const toast = document.createElement('div');
    toast.className = `agb-toast agb-toast-${type}`;
    toast.innerHTML = `
        <div class="agb-toast-content">
            <h4>${title}</h4>
            <p>${message}</p>
        </div>
        <button class="agb-toast-close" onclick="this.parentElement.remove()">
            <i class="fa fa-times"></i>
        </button>
    `;
    
    toastContainer.appendChild(toast);
    
    // Auto remove after 5 seconds
    setTimeout(() => {
        if (toast.parentElement) {
            toast.remove();
        }
    }, 5000);
    
    // Animate in
    requestAnimationFrame(() => {
        toast.classList.add('agb-toast-show');
    });
}

/**
 * Toggle profile dropdown menu
 */
function toggleProfileMenu() {
    const dropdown = document.getElementById('profile-dropdown');
    if (dropdown) {
        dropdown.classList.toggle('agb-hidden');
    }
}

/**
 * Close modal when clicking outside
 */
window.addEventListener('click', function(event) {
    const modal = document.getElementById('editModal');
    if (event.target === modal) {
        closeModal();
    }
});

// Close dropdown when clicking outside
document.addEventListener('click', function(event) {
    const dropdown = document.getElementById('profile-dropdown');
    const profileMenu = document.querySelector('.agb-profile-menu');
    
    if (dropdown && profileMenu && !profileMenu.contains(event.target)) {
        dropdown.classList.add('agb-hidden');
    }
});

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

// Export functions for global access
window.editSection = editSection;
window.closeModal = closeModal;
window.changePassword = changePassword;
window.openImageUpload = openImageUpload;
window.handleImageUpload = handleImageUpload;
window.removeProfileImage = removeProfileImage;
window.toggleProfileMenu = toggleProfileMenu;
window.handleImageLoad = handleImageLoad;
window.handleImageError = handleImageError;