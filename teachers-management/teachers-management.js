// ============================================================================
// TEACHER MANAGEMENT APPLICATION - COMPLETE WORKING VERSION
// ============================================================================

// Global variables
let sidebarCollapsed = false;
let isMobile = window.innerWidth < 1024;
let additionalAllowances = [];
let uploadedDocuments = {};
let uploadedFiles = new Map(); // Store file objects for API upload

// API Configuration
const API_BASE_URL = 'http://localhost:8084/api/teachers';
const ITEMS_PER_PAGE = 10;

// Application State
let appState = {
    teachers: [],
    currentPage: 1,
    filteredTeachers: [],
    teacherIdCounter: 1001,
    loading: false
};

// ============================================================================
// SESSION MANAGEMENT - UNIVERSAL FIX
// ============================================================================

function checkSession() {
    console.log('Checking session...');
    
    // Check for JWT token (what your login page stores)
    const jwtToken = localStorage.getItem('admin_jwt_token');
    
    if (jwtToken) {
        console.log('✅ JWT token found');
        
        try {
            // Optional: Validate token expiration
            const parts = jwtToken.split('.');
            if (parts.length === 3) {
                const payload = JSON.parse(atob(parts[1]));
                const isValid = Date.now() < (payload.exp * 1000);
                
                if (isValid) {
                    console.log('✅ Valid JWT token, session is active');
                    return true;
                } else {
                    console.log('❌ JWT token expired');
                    localStorage.removeItem('admin_jwt_token');
                    localStorage.removeItem('admin_mobile');
                }
            }
        } catch (e) {
            console.log('Error validating token:', e);
            // Even if validation fails, token exists so consider logged in
            return true;
        }
    }
    
    // Check for admin_mobile as fallback
    const adminMobile = localStorage.getItem('admin_mobile');
    if (adminMobile) {
        console.log('✅ Admin mobile found, session is active');
        return true;
    }
    
    // Check for the old session format as last resort
    const oldSession = localStorage.getItem('school_portal_session');
    if (oldSession) {
        console.log('✅ Old session found, session is active');
        return true;
    }
    
    // Check for any teacher data
    const teacherData = localStorage.getItem('school_portal_data_teachers');
    if (teacherData) {
        console.log('✅ Teacher data found, session is active');
        return true;
    }
    
    // No session found, redirect to login
    console.log('❌ No session found, redirecting to login...');
    window.location.href = '../login.html';
    return false;
}

function handleLogout() {
    if (confirm('Are you sure you want to logout?')) {
        console.log('Logging out...');
        
        // Clear all auth-related items
        localStorage.removeItem('admin_jwt_token');
        localStorage.removeItem('admin_mobile');
        localStorage.removeItem('school_portal_session');
        localStorage.removeItem('redirect_after_login');
        
        // Clear teacher data if you want
        // localStorage.removeItem('school_portal_data_teachers');
        
        // Redirect to login page
        window.location.href = '../login.html';
    }
}

// ============================================================================
// INITIALIZATION
// ============================================================================

document.addEventListener('DOMContentLoaded', function() {
    console.log('Teacher Management Initializing...');
    
    // Check session first
    if (!checkSession()) {
        return; // Stop if redirecting
    }

    // Setup all event listeners
    setupEventListeners();
    
    // Setup responsive sidebar
    setupResponsiveSidebar();
    
    // Load initial data from API
    loadInitialData();
    
    // Initialize salary calculation
    calculateTotalSalary();
    
    // Check URL parameters to show appropriate section
    const urlParams = new URLSearchParams(window.location.search);
    const action = urlParams.get('action');
    const editId = urlParams.get('id');
    
    console.log('URL Parameters:', { action, editId });
    
    if (action === 'add') {
        showAddTeacherSection();
    } else if (action === 'edit' && editId) {
        // Handle edit from URL parameter - wait for teachers to load
        console.log('Edit mode detected for teacher ID:', editId);
        
        // Check if teachers are already loaded
        if (appState.teachers && appState.teachers.length > 0) {
            // Teachers are loaded, edit immediately
            setTimeout(() => {
                editTeacher(parseInt(editId));
            }, 500);
        } else {
            // Wait for teachers to load
            const checkInterval = setInterval(() => {
                if (appState.teachers && appState.teachers.length > 0) {
                    clearInterval(checkInterval);
                    editTeacher(parseInt(editId));
                }
            }, 100);
            
            // Timeout after 5 seconds
            setTimeout(() => {
                clearInterval(checkInterval);
                if (!appState.teachers || appState.teachers.length === 0) {
                    Toast.show('Failed to load teacher data', 'error');
                    showAllTeachersSection();
                }
            }, 5000);
        }
    } else {
        showAllTeachersSection();
    }
    
    // Handle browser back/forward buttons
    window.addEventListener('popstate', function() {
        const urlParams = new URLSearchParams(window.location.search);
        const action = urlParams.get('action');
        const editId = urlParams.get('id');
        
        console.log('Popstate - URL Parameters:', { action, editId });
        
        if (action === 'add') {
            showAddTeacherSection();
        } else if (action === 'edit' && editId) {
            if (appState.teachers && appState.teachers.length > 0) {
                editTeacher(parseInt(editId));
            } else {
                // Reload data and then edit
                loadInitialData().then(() => {
                    editTeacher(parseInt(editId));
                });
            }
        } else {
            showAllTeachersSection();
        }
        
        // Update sidebar after popstate
        setTimeout(() => {
            if (typeof setActiveTeacherSidebarLink === 'function') {
                setActiveTeacherSidebarLink();
            }
        }, 100);
    });
    
    // Initialize teacher login credentials
    generateEmployeeId();
    setupPasswordValidation();
    setupDocumentUploadHandlers();
    
    // Setup password confirmation validation
    const passwordField = document.getElementById('teacherPassword');
    const confirmPasswordField = document.getElementById('confirmTeacherPassword');
    const mismatchMessage = document.getElementById('passwordMismatch');
    
    if (passwordField && confirmPasswordField) {
        const validatePasswordMatch = () => {
            if (passwordField.value && confirmPasswordField.value && passwordField.value !== confirmPasswordField.value) {
                if (mismatchMessage) mismatchMessage.classList.remove('hidden');
                return false;
            } else {
                if (mismatchMessage) mismatchMessage.classList.add('hidden');
                return true;
            }
        };
        
        passwordField.addEventListener('input', validatePasswordMatch);
        confirmPasswordField.addEventListener('input', validatePasswordMatch);
    }
    
    // Update sidebar after everything is loaded
    setTimeout(() => {
        if (typeof setActiveTeacherSidebarLink === 'function') {
            setActiveTeacherSidebarLink();
        }
    }, 500);
    
    console.log('Teacher Management Initialized Successfully');
});

// ============================================================================
// API INTEGRATION FUNCTIONS
// ============================================================================

// API Helper Functions
async function apiRequest(endpoint, options = {}) {
    const url = endpoint.startsWith('http') ? endpoint : `${API_BASE_URL}${endpoint}`;
    
    // Get JWT token for authorization
    const token = localStorage.getItem('admin_jwt_token');
    
    const defaultOptions = {
        headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            ...(token && { 'Authorization': `Bearer ${token}` }) // Add token if exists
        },
        mode: 'cors',
        credentials: 'same-origin'
    };
    
    const config = {
        ...defaultOptions,
        ...options,
        headers: {
            ...defaultOptions.headers,
            ...options.headers
        }
    };
    
    console.log(`API Request: ${url}`, config);
    
    try {
        const response = await fetch(url, config);
        
        if (!response.ok) {
            let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
            try {
                const errorData = await response.json();
                errorMessage = errorData.message || errorMessage;
            } catch (e) {
                // Ignore JSON parse error
            }
            throw new Error(errorMessage);
        }
        
        let data;
        try {
            data = await response.json();
        } catch (e) {
            console.warn('Response is not JSON, returning empty data');
            data = {};
        }
        
        return { 
            success: true, 
            data: data,
            status: response.status 
        };
        
    } catch (error) {
        console.error(`API Error (${endpoint}):`, error);
        
        let userMessage = 'Network error. Please check:';
        if (error.message.includes('Failed to fetch')) {
            userMessage += '\n1. Backend server is running on port 8084';
            userMessage += '\n2. CORS is properly configured in backend';
            userMessage += '\n3. No network connectivity issues';
        } else if (error.message.includes('NetworkError')) {
            userMessage = 'Network error. Please check your internet connection.';
        } else if (error.message.includes('Unexpected token')) {
            userMessage = 'Server returned invalid response.';
        } else {
            userMessage = error.message;
        }
        
        return { 
            success: false, 
            error: userMessage,
            data: null,
            status: 0
        };
    }
}

// Test API connection
async function testAPIConnection() {
    console.log('Testing API connection...');
    
    try {
        const response = await fetch(`${API_BASE_URL}/health`, {
            method: 'GET',
            headers: {
                'Accept': 'application/json'
            },
            mode: 'cors'
        });
        
        if (response.ok) {
            const data = await response.json();
            console.log('API Health Check:', data);
            return true;
        } else {
            console.warn('API health check failed:', response.status);
            return false;
        }
    } catch (error) {
        console.error('API connection test failed:', error);
        return false;
    }
}

// Teacher API Functions
async function loadInitialData() {
    try {
        showLoading();
        
        // Try to get all teachers directly without health check
        const response = await apiRequest('/get-all-teachers');
        
        if (response.success) {
            console.log('API Response:', response);
            
            let teachersData = [];
            
            if (response.data && response.data.data && Array.isArray(response.data.data)) {
                teachersData = response.data.data;
            } else if (response.data && Array.isArray(response.data)) {
                teachersData = response.data;
            } else if (response.data && response.data.teachers && Array.isArray(response.data.teachers)) {
                teachersData = response.data.teachers;
            }
            
            appState.teachers = teachersData;
            
            if (teachersData.length > 0) {
                const maxId = teachersData.reduce((max, teacher) => {
                    const teacherCode = teacher.teacherCode || '';
                    const match = teacherCode.match(/TCH(\d+)/);
                    if (match) {
                        const num = parseInt(match[1]);
                        return Math.max(max, num);
                    }
                    return max;
                }, 1000);
                appState.teacherIdCounter = maxId + 1;
            } else {
                appState.teacherIdCounter = 1001;
            }
            
            renderTeachersTable();
            updateTeacherStats();
            
            Toast.show(`Loaded ${teachersData.length} teachers from server`, 'success');
            
            return true; // Return success
            
        } else {
            console.warn('API returned error:', response.error);
            Toast.show('Failed to load teachers from server. Using local data.', 'warning');
            loadLocalData();
            return false;
        }
    } catch (error) {
        console.error('Error loading data:', error);
        Toast.show('Error loading teacher data. Using local storage.', 'error');
        loadLocalData();
        return false;
    } finally {
        hideLoading();
    }
}

function loadLocalData() {
    console.log('Loading data from local storage...');
    
    try {
        const savedData = localStorage.getItem('school_portal_data_teachers');
        if (savedData) {
            const parsedData = JSON.parse(savedData);
            appState.teachers = parsedData.teachers || [];
            appState.teacherIdCounter = parsedData.teacherIdCounter || 1001;
            console.log(`Loaded ${appState.teachers.length} teachers from local storage`);
        } else {
            appState.teachers = generateSampleTeachers();
            appState.teacherIdCounter = 1001;
            console.log('No local data found, using sample data');
        }
    } catch (e) {
        console.error('Error loading local data:', e);
        appState.teachers = generateSampleTeachers();
        appState.teacherIdCounter = 1001;
    }
    
    saveLocalData();
    renderTeachersTable();
    updateTeacherStats();
}

function saveLocalData() {
    try {
        localStorage.setItem('school_portal_data_teachers', JSON.stringify({
            teachers: appState.teachers,
            teacherIdCounter: appState.teacherIdCounter
        }));
        console.log('Saved data to local storage');
    } catch (e) {
        console.error('Error saving to local storage:', e);
    }
}

// ============================================================================
// EVENT LISTENERS SETUP
// ============================================================================

function setupEventListeners() {
    // Logout
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', handleLogout);
    }
    
    // Sidebar Toggle
    const sidebarToggle = document.getElementById('sidebarToggle');
    if (sidebarToggle) {
        sidebarToggle.addEventListener('click', toggleSidebar);
    }
    
    // Notifications Dropdown
    const notificationsBtn = document.getElementById('notificationsBtn');
    if (notificationsBtn) {
        notificationsBtn.addEventListener('click', toggleNotifications);
    }
    
    // User Menu Dropdown
    const userMenuBtn = document.getElementById('userMenuBtn');
    if (userMenuBtn) {
        userMenuBtn.addEventListener('click', toggleUserMenu);
    }
    
    // Close dropdowns when clicking outside
    document.addEventListener('click', function(event) {
        if (!event.target.closest('#notificationsBtn')) {
            const notificationsDropdown = document.getElementById('notificationsDropdown');
            if (notificationsDropdown) {
                notificationsDropdown.classList.add('hidden');
            }
        }
        if (!event.target.closest('#userMenuBtn')) {
            const userMenuDropdown = document.getElementById('userMenuDropdown');
            if (userMenuDropdown) {
                userMenuDropdown.classList.add('hidden');
            }
        }
        
        // Close export dropdown when clicking outside
        const exportBtn = document.getElementById('exportDropdownBtn');
        const exportDropdown = document.getElementById('exportDropdown');
        if (exportBtn && exportDropdown && !exportBtn.contains(event.target) && !exportDropdown.contains(event.target)) {
            exportDropdown.classList.add('hidden');
        }
    });
    
    // Close sidebar when clicking on overlay
    const sidebarOverlay = document.getElementById('sidebarOverlay');
    if (sidebarOverlay) {
        sidebarOverlay.addEventListener('click', closeMobileSidebar);
    }
    
    // Salary calculation inputs
    const salaryInputs = ['basicSalary', 'hra', 'da', 'ta'];
    salaryInputs.forEach(id => {
        const element = document.getElementById(id);
        if (element) {
            element.addEventListener('input', calculateTotalSalary);
        }
    });
    
    // Teacher search and filters
    const searchInput = document.getElementById('searchTeacher');
    if (searchInput) {
        searchInput.addEventListener('input', filterTeachers);
    }
    
    const filters = ['filterSubject', 'filterQualification', 'filterStatus'];
    filters.forEach(id => {
        const element = document.getElementById(id);
        if (element) {
            element.addEventListener('change', filterTeachers);
        }
    });
    
    // Select all checkbox
    const selectAll = document.getElementById('selectAll');
    if (selectAll) {
        selectAll.addEventListener('change', function() {
            const checkboxes = document.querySelectorAll('.teacher-checkbox');
            checkboxes.forEach(cb => cb.checked = this.checked);
        });
    }
    
    // Window resize handler
    window.addEventListener('resize', handleResize);
    
    // Form validation listeners
    setupFormValidation();
    
    // ========== NEW: Reset Filters Button ==========
    const resetFiltersBtn = document.getElementById('resetFiltersBtn');
    if (resetFiltersBtn) {
        // Remove any existing listeners to avoid duplicates
        const newResetBtn = resetFiltersBtn.cloneNode(true);
        resetFiltersBtn.parentNode.replaceChild(newResetBtn, resetFiltersBtn);
        
        newResetBtn.addEventListener('click', function(e) {
            e.preventDefault();
            resetFilters();
        });
        console.log('Reset filters button initialized');
    } else {
        console.warn('Reset filters button not found');
    }
    
    // ========== NEW: Export Dropdown ==========
    const exportBtn = document.getElementById('exportDropdownBtn');
    const exportDropdown = document.getElementById('exportDropdown');
    
    if (exportBtn && exportDropdown) {
        // Remove any existing listeners to avoid duplicates
        const newExportBtn = exportBtn.cloneNode(true);
        exportBtn.parentNode.replaceChild(newExportBtn, exportBtn);
        
        newExportBtn.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            exportDropdown.classList.toggle('hidden');
        });
        console.log('Export dropdown initialized');
    } else {
        console.warn('Export dropdown elements not found', {
            exportBtn: !!exportBtn,
            exportDropdown: !!exportDropdown
        });
    }
    
    // ========== NEW: CSV Export Button (if using ID instead of onclick) ==========
    const exportCSVBtn = document.getElementById('exportCSVBtn');
    if (exportCSVBtn) {
        exportCSVBtn.addEventListener('click', function(e) {
            e.preventDefault();
            exportToCSV();
            const dropdown = document.getElementById('exportDropdown');
            if (dropdown) dropdown.classList.add('hidden');
        });
    }
    
    // ========== NEW: PDF Export Button (if using ID instead of onclick) ==========
    const exportPDFBtn = document.getElementById('exportPDFBtn');
    if (exportPDFBtn) {
        exportPDFBtn.addEventListener('click', function(e) {
            e.preventDefault();
            exportToPDF();
            const dropdown = document.getElementById('exportDropdown');
            if (dropdown) dropdown.classList.add('hidden');
        });
    }
}

function setupFormValidation() {
    console.log('Setting up form validations...');
    
    // ========== NAME FIELDS ==========
    const nameFields = [
        { id: 'firstName', name: 'First Name' },
        { id: 'lastName', name: 'Last Name' },
        { id: 'middleName', name: 'Middle Name', required: false }
    ];
    
    nameFields.forEach(field => {
        const element = document.querySelector(`input[name="${field.id}"]`);
        if (element) {
            element.addEventListener('blur', function() {
                if (field.required === false && !this.value) {
                    clearFieldValidation(this.id);
                    return;
                }
                const validation = validateName(this.value, field.name);
                if (validation.valid) {
                    showFieldValid(this.id);
                } else {
                    showFieldError(this.id, validation.message);
                }
            });
            
            element.addEventListener('input', function() {
                if (this.value) {
                    const validation = validateName(this.value, field.name);
                    if (validation.valid) {
                        showFieldValid(this.id);
                    } else {
                        showFieldError(this.id, validation.message);
                    }
                } else {
                    clearFieldValidation(this.id);
                }
            });
        }
    });
    
    // ========== PHONE NUMBER FIELDS ==========
    const phoneField = document.querySelector('input[name="contactNumber"]');
    if (phoneField) {
        phoneField.id = 'contactNumber';
        phoneField.addEventListener('blur', function() {
            const validation = validatePhoneNumber(this.value);
            if (validation.valid) {
                showFieldValid('contactNumber');
            } else {
                showFieldError('contactNumber', validation.message);
            }
        });
        
        phoneField.addEventListener('input', function() {
            // Allow only numbers
            this.value = this.value.replace(/[^0-9]/g, '').slice(0, 10);
            if (this.value.length === 10) {
                const validation = validatePhoneNumber(this.value);
                if (validation.valid) {
                    showFieldValid('contactNumber');
                } else {
                    showFieldError('contactNumber', validation.message);
                }
            } else {
                clearFieldValidation('contactNumber');
            }
        });
    }
    
    // ========== EMERGENCY CONTACT ==========
    const emergencyField = document.querySelector('input[name="emergencyContactNumber"]');
    if (emergencyField) {
        emergencyField.id = 'emergencyContactNumber';
        emergencyField.addEventListener('blur', function() {
            const validation = validateEmergencyContact(this.value);
            if (validation.valid) {
                showFieldValid('emergencyContactNumber');
            } else {
                showFieldError('emergencyContactNumber', validation.message);
            }
        });
        
        emergencyField.addEventListener('input', function() {
            // Allow only numbers
            this.value = this.value.replace(/[^0-9]/g, '').slice(0, 10);
            if (this.value.length === 10) {
                const validation = validateEmergencyContact(this.value);
                if (validation.valid) {
                    showFieldValid('emergencyContactNumber');
                } else {
                    showFieldError('emergencyContactNumber', validation.message);
                }
            } else {
                clearFieldValidation('emergencyContactNumber');
            }
        });
    }
    
    // ========== EMAIL ==========
    const emailField = document.querySelector('input[name="email"]');
    if (emailField) {
        emailField.id = 'email';
        emailField.addEventListener('blur', function() {
            const validation = validateEmailAddress(this.value);
            if (validation.valid) {
                showFieldValid('email');
            } else {
                showFieldError('email', validation.message);
            }
        });
        
        emailField.addEventListener('input', function() {
            if (this.value) {
                const validation = validateEmailAddress(this.value);
                if (validation.valid) {
                    showFieldValid('email');
                } else {
                    showFieldError('email', validation.message);
                }
            } else {
                clearFieldValidation('email');
            }
        });
    }
    
    // ========== AADHAR NUMBER ==========
    const aadharField = document.querySelector('input[name="aadharNumber"]');
    if (aadharField) {
        aadharField.id = 'aadharNumber';
        aadharField.addEventListener('blur', function() {
            const validation = validateAadharNumber(this.value);
            if (validation.valid) {
                showFieldValid('aadharNumber');
            } else {
                showFieldError('aadharNumber', validation.message);
            }
        });
        
        aadharField.addEventListener('input', function() {
            // Allow only numbers
            this.value = this.value.replace(/[^0-9]/g, '').slice(0, 12);
            if (this.value.length === 12) {
                const validation = validateAadharNumber(this.value);
                if (validation.valid) {
                    showFieldValid('aadharNumber');
                } else {
                    showFieldError('aadharNumber', validation.message);
                }
            } else {
                clearFieldValidation('aadharNumber');
            }
        });
    }
    
    // ========== PAN NUMBER ==========
    const panField = document.querySelector('input[name="panNumber"]');
    if (panField) {
        panField.id = 'panNumber';
        panField.addEventListener('blur', function() {
            const validation = validatePANNumber(this.value);
            if (validation.valid) {
                showFieldValid('panNumber');
            } else {
                showFieldError('panNumber', validation.message);
            }
        });
        
        panField.addEventListener('input', function() {
            // Convert to uppercase
            this.value = this.value.toUpperCase();
            if (this.value.length === 10) {
                const validation = validatePANNumber(this.value);
                if (validation.valid) {
                    showFieldValid('panNumber');
                } else {
                    showFieldError('panNumber', validation.message);
                }
            } else {
                clearFieldValidation('panNumber');
            }
        });
    }
    
    // ========== EMPLOYEE ID ==========
    const empIdField = document.getElementById('employeeId');
    if (empIdField) {
        empIdField.addEventListener('blur', function() {
            const validation = validateEmployeeId(this.value);
            if (validation.valid) {
                showFieldValid('employeeId');
            } else {
                showFieldError('employeeId', validation.message);
            }
        });
        
        empIdField.addEventListener('input', function() {
            if (this.value) {
                const validation = validateEmployeeId(this.value);
                if (validation.valid) {
                    showFieldValid('employeeId');
                } else {
                    showFieldError('employeeId', validation.message);
                }
            } else {
                clearFieldValidation('employeeId');
            }
        });
    }
    
    // ========== PASSWORD FIELDS ==========
    const passwordField = document.getElementById('teacherPassword');
    const confirmPasswordField = document.getElementById('confirmTeacherPassword');
    
    if (passwordField) {
        passwordField.addEventListener('blur', function() {
            const validation = validatePassword(this.value);
            if (validation.valid) {
                showFieldValid('teacherPassword');
            } else {
                showFieldError('teacherPassword', validation.message);
            }
        });
        
        passwordField.addEventListener('input', function() {
            if (this.value) {
                const validation = validatePassword(this.value);
                if (validation.valid) {
                    showFieldValid('teacherPassword');
                } else {
                    showFieldError('teacherPassword', validation.message);
                }
            } else {
                clearFieldValidation('teacherPassword');
            }
        });
    }
    
    if (confirmPasswordField) {
        confirmPasswordField.addEventListener('blur', function() {
            if (passwordField && this.value !== passwordField.value) {
                showFieldError('confirmTeacherPassword', 'Passwords do not match');
            } else {
                showFieldValid('confirmTeacherPassword');
            }
        });
        
        confirmPasswordField.addEventListener('input', function() {
            if (passwordField && this.value === passwordField.value) {
                showFieldValid('confirmTeacherPassword');
                const mismatchMsg = document.getElementById('passwordMismatch');
                if (mismatchMsg) mismatchMsg.classList.add('hidden');
            } else if (this.value) {
                showFieldError('confirmTeacherPassword', 'Passwords do not match');
            } else {
                clearFieldValidation('confirmTeacherPassword');
            }
        });
    }
    
    // ========== DATE FIELDS ==========
    const dobField = document.querySelector('input[name="dob"]');
    if (dobField) {
        dobField.id = 'dob';
        dobField.addEventListener('blur', function() {
            const validation = validateDate(this.value, 'Date of Birth');
            if (validation.valid) {
                showFieldValid('dob');
            } else {
                showFieldError('dob', validation.message);
            }
        });
    }
    
    const joiningDateField = document.querySelector('input[name="joiningDate"]');
    if (joiningDateField) {
        joiningDateField.id = 'joiningDate';
        joiningDateField.addEventListener('blur', function() {
            const validation = validateDate(this.value, 'Joining Date');
            if (validation.valid) {
                showFieldValid('joiningDate');
            } else {
                showFieldError('joiningDate', validation.message);
            }
        });
    }
    
    // ========== NUMBER FIELDS ==========
    const experienceField = document.getElementById('totalExperience');
    if (experienceField) {
        experienceField.addEventListener('blur', function() {
            const validation = validateNumberField(this.value, 'Total Experience', 0, 50);
            if (validation.valid) {
                showFieldValid('totalExperience');
            } else {
                showFieldError('totalExperience', validation.message);
            }
        });
        
        experienceField.addEventListener('input', function() {
            // Allow only numbers
            this.value = this.value.replace(/[^0-9]/g, '');
            if (this.value) {
                const num = parseInt(this.value);
                if (num >= 0 && num <= 50) {
                    showFieldValid('totalExperience');
                } else {
                    showFieldError('totalExperience', 'Experience must be between 0 and 50 years');
                }
            } else {
                clearFieldValidation('totalExperience');
            }
        });
    }
    
    const basicSalaryField = document.getElementById('basicSalary');
    if (basicSalaryField) {
        basicSalaryField.addEventListener('input', function() {
            this.value = this.value.replace(/[^0-9]/g, '');
            if (this.value && parseInt(this.value) > 0) {
                showFieldValid('basicSalary');
            }
        });
    }
    
    console.log('Form validations setup complete');
}
// ============================================================================
// RESPONSIVE SIDEBAR
// ============================================================================

function setupResponsiveSidebar() {
    isMobile = window.innerWidth < 1024;
    
    if (isMobile) {
        closeMobileSidebar();
    } else {
        const sidebar = document.getElementById('sidebar');
        const mainContent = document.getElementById('mainContent');
        
        if (sidebarCollapsed) {
            sidebar.classList.add('collapsed');
            mainContent.classList.add('sidebar-collapsed');
        } else {
            sidebar.classList.remove('collapsed');
            mainContent.classList.remove('sidebar-collapsed');
        }
    }
}

function handleResize() {
    const wasMobile = isMobile;
    isMobile = window.innerWidth < 1024;
    
    if (wasMobile !== isMobile) {
        if (isMobile) {
            closeMobileSidebar();
        } else {
            const sidebar = document.getElementById('sidebar');
            const mainContent = document.getElementById('mainContent');
            const overlay = document.getElementById('sidebarOverlay');
            
            if (sidebar) sidebar.classList.remove('mobile-open');
            if (overlay) overlay.classList.remove('active');
            document.body.classList.remove('sidebar-open');
            
            if (sidebarCollapsed) {
                if (sidebar) sidebar.classList.add('collapsed');
                if (mainContent) mainContent.classList.add('sidebar-collapsed');
            } else {
                if (sidebar) sidebar.classList.remove('collapsed');
                if (mainContent) mainContent.classList.remove('sidebar-collapsed');
            }
        }
    }
}

function toggleSidebar() {
    if (isMobile) {
        const sidebar = document.getElementById('sidebar');
        const overlay = document.getElementById('sidebarOverlay');
        
        if (sidebar.classList.contains('mobile-open')) {
            closeMobileSidebar();
        } else {
            openMobileSidebar();
        }
    } else {
        const sidebar = document.getElementById('sidebar');
        const mainContent = document.getElementById('mainContent');
        
        sidebarCollapsed = !sidebarCollapsed;
        
        if (sidebarCollapsed) {
            sidebar.classList.add('collapsed');
            mainContent.classList.add('sidebar-collapsed');
            document.getElementById('sidebarToggleIcon').className = 'fas fa-bars text-xl';
        } else {
            sidebar.classList.remove('collapsed');
            mainContent.classList.remove('sidebar-collapsed');
            document.getElementById('sidebarToggleIcon').className = 'fas fa-times text-xl';
        }
    }
}

function openMobileSidebar() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebarOverlay');
    
    if (sidebar) sidebar.classList.add('mobile-open');
    if (overlay) overlay.classList.add('active');
    document.body.classList.add('sidebar-open');
}

function closeMobileSidebar() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebarOverlay');
    
    if (sidebar) sidebar.classList.remove('mobile-open');
    if (overlay) overlay.classList.remove('active');
    document.body.classList.remove('sidebar-open');
}

// ============================================================================
// DROPDOWN TOGGLES
// ============================================================================

function toggleNotifications() {
    const dropdown = document.getElementById('notificationsDropdown');
    if (dropdown) {
        dropdown.classList.toggle('hidden');
    }
}

function toggleUserMenu() {
    const dropdown = document.getElementById('userMenuDropdown');
    if (dropdown) {
        dropdown.classList.toggle('hidden');
    }
}

// ============================================================================
// SECTION NAVIGATION
// ============================================================================

function showAllTeachersSection() {
    // Reset edit mode
    editingTeacherId = null;
    
    // Reset button text - TARGET BY ID NOT CLASS
    const submitButton = document.getElementById('submitTeacherBtn');
    if (submitButton) {
        submitButton.innerHTML = '<i class="fas fa-check-circle mr-2"></i> Register Teacher';
        submitButton.onclick = () => handleAddTeacher();
    }
    
    // Reset form title
    const formTitle = document.getElementById('formTitle');
    if (formTitle) {
        formTitle.textContent = 'Add New Teacher';
    }
    
    document.getElementById('allTeachersSection').classList.remove('hidden');
    document.getElementById('addTeacherSection').classList.add('hidden');
    appState.currentPage = 1;
    renderTeachersTable();
    updateTeacherStats();
    
    history.pushState({}, '', '../teachers-management/teachers-management.html');
    
    if (typeof setActiveTeacherSidebarLink === 'function') {
        setActiveTeacherSidebarLink();
    }
    
    if (isMobile) {
        closeMobileSidebar();
    }
}
function showAddTeacherSection() {
    console.log('showAddTeacherSection called');
    
    // Reset edit mode
    editingTeacherId = null;
    
    // Reset button text - TARGET BY ID NOT CLASS
    const submitButton = document.getElementById('submitTeacherBtn');
    if (submitButton) {
        submitButton.innerHTML = '<i class="fas fa-check-circle mr-2"></i> Register Teacher';
        submitButton.onclick = () => handleAddTeacher();
    }
    
    // Reset form title
    const formTitle = document.getElementById('formTitle');
    if (formTitle) {
        formTitle.textContent = 'Add New Teacher';
    }
    
    // Clear any previous edit data from URL
    const url = new URL(window.location.href);
    url.searchParams.set('action', 'add');
    url.searchParams.delete('id');
    window.history.pushState({}, '', url);
    
    document.getElementById('allTeachersSection').classList.add('hidden');
    document.getElementById('addTeacherSection').classList.remove('hidden');
    resetForm();
    switchTab('personal');
    
    // Update sidebar active state
    if (typeof setActiveTeacherSidebarLink === 'function') {
        setActiveTeacherSidebarLink();
        setTimeout(() => {
            setActiveTeacherSidebarLink();
        }, 100);
    }
    
    if (isMobile) {
        closeMobileSidebar();
    }
}
function updateSidebarActiveState(activeSection) {
    console.log('Updating sidebar active state:', activeSection);
    
    // Remove active classes from all sidebar links
    const allLinks = document.querySelectorAll('#sidebar a');
    allLinks.forEach(link => {
        link.classList.remove('bg-blue-700', 'text-white', 'text-blue-600');
        link.classList.add('hover:bg-gray-100', 'text-black');
        
        // Fix: Use 'nav-label' instead of 'nav-text' (based on your HTML)
        const icon = link.querySelector('.nav-icon');
        if (icon) {
            icon.classList.remove('text-white', 'text-blue-600');
            icon.classList.add('text-black');
        }
        
        const text = link.querySelector('.nav-label'); // Changed from nav-text to nav-label
        if (text) {
            text.classList.remove('text-white', 'text-blue-600');
            text.classList.add('text-black');
        }
    });
    
    if (activeSection === 'all') {
        // Find "All Teachers" link - exact match without action=add
        const allTeachersLink = document.querySelector('#sidebar a[href*="teachers-management.html"]:not([href*="action=add"])');
        if (allTeachersLink) {
            console.log('Activating All Teachers link');
            allTeachersLink.classList.add('bg-blue-700', 'text-blue-600');
            allTeachersLink.classList.remove('hover:bg-gray-100', 'text-black');
            
            const icon = allTeachersLink.querySelector('.nav-icon');
            if (icon) {
                icon.classList.add('text-blue-600');
                icon.classList.remove('text-black');
            }
            
            const text = allTeachersLink.querySelector('.nav-label'); // Changed from nav-text
            if (text) {
                text.classList.add('text-blue-600');
                text.classList.remove('text-black');
            }
        } else {
            console.warn('All Teachers link not found');
        }
    } else if (activeSection === 'add') {
        // Find "Add Teacher" link
        const addTeacherLink = document.querySelector('#sidebar a[href*="action=add"]');
        if (addTeacherLink) {
            console.log('Activating Add Teacher link');
            addTeacherLink.classList.add('bg-blue-700', 'text-blue-600');
            addTeacherLink.classList.remove('hover:bg-gray-100', 'text-black');
            
            const icon = addTeacherLink.querySelector('.nav-icon');
            if (icon) {
                icon.classList.add('text-blue-600');
                icon.classList.remove('text-black');
            }
            
            const text = addTeacherLink.querySelector('.nav-label'); // Changed from nav-text
            if (text) {
                text.classList.add('text-blue-600');
                text.classList.remove('text-black');
            }
        } else {
            console.warn('Add Teacher link not found');
        }
    }
}

// ============================================================================
// TAB SWITCHING
// ============================================================================

function switchTab(tabName) {
    const tabContents = document.querySelectorAll('.tab-content');
    tabContents.forEach(content => content.classList.remove('active'));
    
    const tabButtons = document.querySelectorAll('.tab-button');
    tabButtons.forEach(button => button.classList.remove('active'));
    
    const targetContent = document.getElementById(tabName + 'TabContent');
    if (targetContent) {
        targetContent.classList.add('active');
    }
    
    const targetButton = document.getElementById(tabName + 'Tab');
    if (targetButton) {
        targetButton.classList.add('active');
    }
    
    if (tabName === 'salary') {
        calculateTotalSalary();
    } else if (tabName === 'documents') {
        updateDocumentStatus();
    }
}

// ============================================================================
// FORM HANDLING - TEACHER PHOTO & DOCUMENTS
// ============================================================================

function previewTeacherPhoto(input) {
    const file = input.files[0];
    if (!file) return;
    
    if (file.size > 2 * 1024 * 1024) {
        Toast.show('File size exceeds 2MB limit', 'error');
        input.value = '';
        return;
    }
    
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png'];
    if (!validTypes.includes(file.type)) {
        Toast.show('Please upload JPG or PNG files only', 'error');
        input.value = '';
        return;
    }
    
    const previewElement = document.getElementById('teacherPhotoPreview');
    const reader = new FileReader();
    
    reader.onload = function(e) {
        previewElement.innerHTML = `
            <img src="${e.target.result}" class="h-full w-full object-cover rounded-full" alt="Teacher Photo">
        `;
        uploadedFiles.set('teacherPhoto', file);
    };
    
    reader.readAsDataURL(file);
    Toast.show('Photo uploaded successfully', 'success');
}

// ============================================================================
// ADD MISSING FUNCTIONS
// ============================================================================

// Add this function if not present
function setupDocumentUploadHandlers() {
    const documentInputs = [
        'teacherAadharImage',
        'panCardImage',
        'educationCertificateImage',
        'bedCertificateImage',
        'experienceCertificateImage',
        'policeVerificationImage',
        'medicalFitnessImage',
        'resumeImage'
    ];
    
    documentInputs.forEach(inputId => {
        const input = document.getElementById(inputId);
        if (input) {
            const previewId = inputId.replace('Image', 'Preview');
            input.addEventListener('change', function() {
                previewDocument(this, previewId);
            });
        }
    });
}

function previewDocument(input, previewId) {
    const file = input.files[0];
    if (!file) return;
    
    if (file.size > 2 * 1024 * 1024) {
        Toast.show('File size exceeds 2MB limit', 'error');
        input.value = '';
        return;
    }
    
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf'];
    if (!validTypes.includes(file.type)) {
        Toast.show('Please upload JPG, PNG, or PDF files only', 'error');
        input.value = '';
        return;
    }
    
    const previewElement = document.getElementById(previewId);
    const reader = new FileReader();
    const docType = input.id.replace('Image', '');
    
    reader.onload = function(e) {
        if (file.type === 'application/pdf') {
            previewElement.innerHTML = `
                <div class="flex flex-col items-center justify-center h-full">
                    <i class="fas fa-file-pdf text-4xl text-red-500 mb-2"></i>
                    <p class="text-sm text-gray-700 font-semibold">${file.name}</p>
                    <p class="text-xs text-gray-500">PDF Document</p>
                </div>
            `;
        } else {
            previewElement.innerHTML = `
                <img src="${e.target.result}" class="h-full w-full object-cover rounded-lg" alt="Document Preview">
            `;
        }
        
        uploadedFiles.set(docType, file);
    };
    
    reader.readAsDataURL(file);
    Toast.show('Document uploaded successfully', 'success');
    updateDocumentStatus();
}

function removeDocument(inputId, previewId) {
    const input = document.getElementById(inputId);
    if (input) {
        input.value = '';
    }
    
    const previewElement = document.getElementById(previewId);
    const docType = inputId.replace('Image', '');
    
    previewElement.innerHTML = `
        <i class="fas fa-cloud-upload-alt text-3xl text-gray-400 mb-2"></i>
        <p class="text-sm text-gray-500 text-center">Upload document image</p>
        <p class="text-xs text-gray-400">Click to upload</p>
    `;
    
    uploadedFiles.delete(docType);
    Toast.show('Document removed', 'info');
    updateDocumentStatus();
}

function updateDocumentStatus() {
    const requiredDocuments = [
        'teacherAadhar',
        'panCard',
        'educationCertificate',
        'bedCertificate',
        'policeVerification'
    ];
    
    const allDocuments = [
        'teacherAadhar',
        'panCard',
        'educationCertificate',
        'bedCertificate',
        'experienceCertificate',
        'policeVerification',
        'medicalFitness',
        'resume'
    ];
    
    let uploadedCount = 0;
    let uploadedRequired = 0;
    
    allDocuments.forEach(docType => {
        if (uploadedFiles.has(docType)) {
            uploadedCount++;
            if (requiredDocuments.includes(docType)) {
                uploadedRequired++;
            }
        }
    });
    
    const statusElement = document.getElementById('documentStatus');
    if (!statusElement) return;
    
    const requiredRemaining = requiredDocuments.length - uploadedRequired;
    
    if (uploadedCount === 0) {
        statusElement.innerHTML = 'No documents uploaded yet';
    } else {
        statusElement.innerHTML = `
            <div class="space-y-1">
                <div class="flex items-center justify-between">
                    <span>Total uploaded: ${uploadedCount}/${allDocuments.length}</span>
                    <span class="font-medium">${Math.round((uploadedCount/allDocuments.length)*100)}%</span>
                </div>
                <div class="w-full bg-gray-200 rounded-full h-2">
                    <div class="bg-green-600 h-2 rounded-full" style="width: ${(uploadedCount/allDocuments.length)*100}%"></div>
                </div>
                ${requiredRemaining > 0 ? 
                    `<div class="text-red-600 text-sm mt-1">
                        <i class="fas fa-exclamation-circle mr-1"></i>
                        ${requiredRemaining} required document(s) remaining
                    </div>` : 
                    '<div class="text-green-600 text-sm mt-1"><i class="fas fa-check-circle mr-1"></i> All required documents uploaded</div>'
                }
            </div>
        `;
    }
}

function generateEmployeeId() {
    const year = new Date().getFullYear().toString().slice(-2);
    const random = Math.floor(1000 + Math.random() * 9000);
    const employeeId = `EMP${year}${random}`;
    
    const employeeIdField = document.getElementById('employeeId');
    if (employeeIdField && !employeeIdField.value) {
        employeeIdField.value = employeeId;
    }
}

function setupPasswordValidation() {
    const password = document.getElementById('teacherPassword');
    const confirmPassword = document.getElementById('confirmTeacherPassword');
    const mismatchMessage = document.getElementById('passwordMismatch');
    
    if (!password || !confirmPassword) return;
    
    function checkPasswordMatch() {
        if (password.value && confirmPassword.value && password.value !== confirmPassword.value) {
            if (mismatchMessage) mismatchMessage.classList.remove('hidden');
        } else {
            if (mismatchMessage) mismatchMessage.classList.add('hidden');
        }
    }
    
    password.addEventListener('input', checkPasswordMatch);
    confirmPassword.addEventListener('input', checkPasswordMatch);
}

// ============================================================================
// SALARY CALCULATIONS
// ============================================================================

function calculateTotalSalary() {
    const basic = parseFloat(document.getElementById('basicSalary')?.value || 0);
    const hra = parseFloat(document.getElementById('hra')?.value || 0);
    const da = parseFloat(document.getElementById('da')?.value || 0);
    const ta = parseFloat(document.getElementById('ta')?.value || 0);
    
    const baseTotal = basic + hra + da + ta;
    const additionalTotal = calculateAdditionalAllowancesTotal();
    const grandTotal = baseTotal + additionalTotal;
    
    const totalSalaryDisplay = document.getElementById('totalSalaryDisplay');
    if (totalSalaryDisplay) totalSalaryDisplay.textContent = `₹${grandTotal.toLocaleString()}`;
    
    const summaryBasic = document.getElementById('summaryBasic');
    if (summaryBasic) summaryBasic.textContent = `₹${basic.toLocaleString()}`;
    
    const summaryHRA = document.getElementById('summaryHRA');
    if (summaryHRA) summaryHRA.textContent = `₹${hra.toLocaleString()}`;
    
    const summaryDA = document.getElementById('summaryDA');
    if (summaryDA) summaryDA.textContent = `₹${da.toLocaleString()}`;
    
    const summaryTA = document.getElementById('summaryTA');
    if (summaryTA) summaryTA.textContent = `₹${ta.toLocaleString()}`;
    
    const summaryAdditional = document.getElementById('summaryAdditional');
    if (summaryAdditional) summaryAdditional.textContent = `₹${additionalTotal.toLocaleString()}`;
    
    const summaryGross = document.getElementById('summaryGross');
    if (summaryGross) summaryGross.textContent = `₹${grandTotal.toLocaleString()}`;
    
    return grandTotal;
}

function calculateAdditionalAllowancesTotal() {
    return additionalAllowances.reduce((total, allowance) => total + allowance.amount, 0);
}

function addAdditionalAllowance() {
    const nameInput = document.getElementById('additionalAllowanceName');
    const amountInput = document.getElementById('additionalAllowanceAmount');
    const name = nameInput.value.trim();
    const amount = parseFloat(amountInput.value);
    
    if (!name || isNaN(amount) || amount <= 0) {
        Toast.show('Please enter valid allowance name and amount', 'error');
        return;
    }
    
    const allowance = {
        id: Date.now(),
        name: name,
        amount: amount
    };
    
    additionalAllowances.push(allowance);
    renderAdditionalAllowancesList();
    calculateTotalSalary();
    
    nameInput.value = '';
    amountInput.value = '';
    nameInput.focus();
}

function removeAdditionalAllowance(id) {
    additionalAllowances = additionalAllowances.filter(allowance => allowance.id !== id);
    renderAdditionalAllowancesList();
    calculateTotalSalary();
}

function renderAdditionalAllowancesList() {
    const container = document.getElementById('additionalAllowancesList');
    if (!container) return;
    
    if (additionalAllowances.length === 0) {
        container.innerHTML = '<p class="text-sm text-gray-500">No additional allowances added</p>';
        return;
    }
    
    let html = '';
    additionalAllowances.forEach(allowance => {
        html += `
            <div class="flex items-center justify-between bg-gray-50 px-3 py-2 rounded">
                <div>
                    <span class="font-medium text-sm">${allowance.name}</span>
                    <span class="text-sm text-gray-600 ml-2">₹${allowance.amount.toLocaleString()}</span>
                </div>
                <button onclick="removeAdditionalAllowance(${allowance.id})" class="text-red-500 hover:text-red-700">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        `;
    });
    
    container.innerHTML = html;
    
    const additionalTotal = calculateAdditionalAllowancesTotal();
    const summaryContainer = document.getElementById('additionalAllowancesSummary');
    if (summaryContainer) {
        summaryContainer.textContent = `Includes additional allowances: ₹${additionalTotal.toLocaleString()}`;
    }
}


function setActiveTeacherSidebarLink() {
    const currentUrl = window.location.href;
    const urlParams = new URLSearchParams(window.location.search);
    const isAdd = urlParams.get('action') === 'add';
    const isAttendance = currentUrl.includes('teacher-attendance.html');
    const isAllTeachers = currentUrl.includes('teachers-management.html') && !isAdd;
    
    const navAttendance = document.getElementById('navTeacherAttendance');
    const navAll = document.getElementById('navAllTeachers');
    const navAdd = document.getElementById('navAddTeacher');
    
    console.log('setActiveTeacherSidebarLink called:', {
        isAdd,
        isAttendance,
        isAllTeachers,
        currentUrl
    });
    
    if (!navAttendance || !navAll || !navAdd) {
        console.warn('Teacher sidebar elements not found', {
            navAttendance: !!navAttendance,
            navAll: !!navAll,
            navAdd: !!navAdd
        });
        return;
    }
    
    // Remove active class from all teacher links
    [navAttendance, navAll, navAdd].forEach(link => {
        link.classList.remove('active', 'bg-blue-50', 'bg-blue-700', 'text-blue-600', 'text-white');
        
        const icon = link.querySelector('.nav-icon');
        const text = link.querySelector('.nav-label');
        
        if (icon) {
            icon.classList.remove('text-blue-600', 'text-white');
            icon.classList.add('text-gray-600');
        }
        if (text) {
            text.classList.remove('text-blue-600', 'text-white', 'font-semibold');
            text.classList.add('text-gray-700');
        }
    });
    
    // Add active class to the correct link
    let activeLink = null;
    if (isAttendance) {
        activeLink = navAttendance;
        console.log('Activating Teachers Attendance link');
    } else if (isAdd) {
        activeLink = navAdd;
        console.log('Activating Add Teacher link');
    } else if (isAllTeachers) {
        activeLink = navAll;
        console.log('Activating All Teachers link');
    } else {
        // Default to All Teachers if none match
        activeLink = navAll;
        console.log('Defaulting to All Teachers link');
    }
    
    if (activeLink) {
        activeLink.classList.add('active');
        
        const icon = activeLink.querySelector('.nav-icon');
        const text = activeLink.querySelector('.nav-label');
        
        if (icon) {
            icon.classList.remove('text-gray-600');
            icon.classList.add('text-primary');
        }
        if (text) {
            text.classList.remove('text-gray-700');
            text.classList.add('text-primary', 'font-semibold');
        }
    }
}

// ============================================================================
// EXPERIENCE AND QUALIFICATION ENTRIES
// ============================================================================

function addExperienceEntry() {
    const container = document.getElementById('experienceEntries');
    if (!container) return;
    
    const entry = document.createElement('div');
    entry.className = 'grid grid-cols-1 md:grid-cols-3 gap-4 mb-4';
    entry.innerHTML = `
        <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">School/Organization</label>
            <input type="text" name="prevSchool[]" class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200" placeholder="Previous school name">
        </div>
        
        <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">Position</label>
            <input type="text" name="prevPosition[]" class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200" placeholder="Position held">
        </div>
        
        <div class="flex items-end space-x-2">
            <div class="flex-1">
                <label class="block text-sm font-medium text-gray-700 mb-2">Duration (Years)</label>
                <input type="number" name="prevDuration[]" min="0" max="50" class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200" placeholder="Years">
            </div>
            <button type="button" onclick="removeExperienceEntry(this)" class="px-3 py-2 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-lg transition-colors duration-200">
                <i class="fas fa-times"></i>
            </button>
        </div>
    `;
    container.appendChild(entry);
}

function removeExperienceEntry(button) {
    button.closest('.grid').remove();
}

function addQualificationEntry() {
    const container = document.getElementById('qualificationEntries');
    if (!container) return;
    
    const entry = document.createElement('div');
    entry.className = 'grid grid-cols-1 md:grid-cols-4 gap-4 mb-4';
    entry.innerHTML = `
        <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">Degree</label>
            <select name="degree[]" class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200">
                <option value="">Select Degree</option>
                <option value="Bachelor">Bachelor's Degree</option>
                <option value="Master">Master's Degree</option>
                <option value="PhD">Ph.D.</option>
                <option value="B.Ed.">B.Ed.</option>
                <option value="M.Ed.">M.Ed.</option>
                <option value="Diploma">Diploma</option>
            </select>
        </div>
        
        <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">Specialization</label>
            <input type="text" name="specialization[]" class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200" placeholder="e.g., Mathematics, Physics">
        </div>
        
        <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">University/College</label>
            <input type="text" name="university[]" class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200" placeholder="University name">
        </div>
        
        <div class="flex items-end space-x-2">
            <div class="flex-1">
                <label class="block text-sm font-medium text-gray-700 mb-2">Year of Completion</label>
                <input type="number" name="completionYear[]" min="1950" max="2030" class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200" placeholder="YYYY">
            </div>
            <button type="button" onclick="removeQualificationEntry(this)" class="px-3 py-2 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-lg transition-colors duration-200">
                <i class="fas fa-times"></i>
            </button>
        </div>
    `;
    container.appendChild(entry);
}

function removeQualificationEntry(button) {
    button.closest('.grid').remove();
}

// ============================================================================
// TEACHER MANAGEMENT - TABLE RENDERING
// ============================================================================

function renderTeachersTable() {
    const tbody = document.getElementById('teacherTableBody');
    if (!tbody) return;
    
    tbody.innerHTML = '';
    
    const filtered = getFilteredTeachers();
    const startIndex = (appState.currentPage - 1) * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;
    const pageTeachers = filtered.slice(startIndex, endIndex);
    
    if (pageTeachers.length === 0) {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td colspan="6" class="px-6 py-12 text-center">
                <i class="fas fa-chalkboard-teacher text-4xl text-gray-300 mb-3"></i>
                <p class="text-lg text-gray-600">No teachers found</p>
                <p class="text-sm text-gray-500 mt-2">Try adjusting your search criteria</p>
            </td>
        `;
        tbody.appendChild(row);
    } else {
        pageTeachers.forEach(teacher => {
            const statusBadge = getStatusBadge(teacher.status);
            const fullName = `${teacher.firstName || ''} ${teacher.middleName || ''} ${teacher.lastName || ''}`.trim();
            const teacherId = teacher.teacherCode || teacher.employeeId || `TCH${teacher.id}`;
            
            const row = document.createElement('tr');
            row.className = 'hover:bg-gray-50 transition-colors duration-150';
            row.innerHTML = `
                <td class="px-4 lg:px-6 py-4">
                    <input type="checkbox" class="teacher-checkbox rounded border-gray-300" data-id="${teacher.id}">
                </td>
                <td class="px-4 lg:px-6 py-4">
                    <div class="flex items-center space-x-3">
                        <div class="h-10 w-10 bg-blue-100 rounded-full flex items-center justify-center">
                            ${teacher.teacherPhotoUrl ? 
                                `<img src="${API_BASE_URL}/uploads/teachers/${teacher.teacherPhotoUrl}" class="h-full w-full rounded-full object-cover" alt="${fullName}">` :
                                `<i class="fas fa-user-tie text-blue-600"></i>`
                            }
                        </div>
                        <div>
                            <div class="font-medium text-gray-900">${fullName}</div>
                            <div class="text-sm text-gray-500">${teacherId} • ${teacher.designation || 'Teacher'}</div>
                            <div class="text-xs text-gray-500">${teacher.department || 'Department'} Department</div>
                        </div>
                    </div>
                </td>
                <td class="px-4 lg:px-6 py-4">
                    <div class="font-medium text-gray-900">${teacher.primarySubject || 'Not Assigned'}</div>
                    <div class="text-sm text-gray-500">Classes: ${Array.isArray(teacher.classes) ? teacher.classes.map(c => `Class ${c}`).join(', ') : 'Not Assigned'}</div>
                </td>
                <td class="px-4 lg:px-6 py-4">
                    <div class="text-sm text-gray-900">${teacher.contactNumber || 'N/A'}</div>
                    <div class="text-sm text-gray-500">${teacher.email || 'N/A'}</div>
                </td>
                <td class="px-4 lg:px-6 py-4">
                    ${statusBadge}
                    <div class="text-xs text-gray-500 mt-1">
                        Experience: ${teacher.totalExperience || 0} years
                    </div>
                </td>
                <td class="px-4 lg:px-6 py-4">
                    <div class="flex items-center space-x-2">
                        <button onclick="viewTeacher(${teacher.id})" class="p-2 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition-colors duration-200" title="View">
                            <i class="fas fa-eye"></i>
                        </button>
                        <button onclick="editTeacher(${teacher.id})" class="p-2 text-green-600 hover:text-green-800 hover:bg-green-50 rounded-lg transition-colors duration-200" title="Edit">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button onclick="deleteTeacher(${teacher.id})" class="p-2 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-lg transition-colors duration-200" title="Delete">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </td>
            `;
            tbody.appendChild(row);
        });
    }
    
    updatePagination(filtered.length);
}

function getStatusBadge(status) {
    if (!status) return '<span class="status-badge status-inactive">Unknown</span>';
    
    if (status === 'Active') {
        return '<span class="status-badge status-active">Active</span>';
    } else if (status === 'Inactive') {
        return '<span class="status-badge status-inactive">Inactive</span>';
    } else if (status === 'On Leave') {
        return '<span class="status-badge status-onleave">On Leave</span>';
    } else {
        return '<span class="status-badge status-inactive">Unknown</span>';
    }
}

function getFilteredTeachers() {
    const searchTerm = document.getElementById('searchTeacher')?.value.toLowerCase() || '';
    const filterSubject = document.getElementById('filterSubject')?.value || '';
    const filterQualification = document.getElementById('filterQualification')?.value || '';
    const filterStatus = document.getElementById('filterStatus')?.value || '';
    
    return appState.teachers.filter(teacher => {
        const fullName = `${teacher.firstName || ''} ${teacher.middleName || ''} ${teacher.lastName || ''}`.toLowerCase();
        const teacherId = (teacher.teacherCode || teacher.employeeId || '').toLowerCase();
        const primarySubject = (teacher.primarySubject || '').toLowerCase();
        
        const matchesSearch = !searchTerm || 
            fullName.includes(searchTerm) ||
            teacherId.includes(searchTerm) ||
            primarySubject.includes(searchTerm);
        
        const matchesSubject = !filterSubject || 
            teacher.primarySubject === filterSubject;
        
        const matchesStatus = !filterStatus || teacher.status === filterStatus;
        
        return matchesSearch && matchesSubject && matchesStatus;
    });
}

function filterTeachers() {
    appState.currentPage = 1;
    renderTeachersTable();
    updateTeacherStats();
}

function updateTeacherStats() {
    const filtered = getFilteredTeachers();
    
    const totalCount = document.getElementById('totalTeachersCount');
    if (totalCount) totalCount.textContent = filtered.length;
    
    const activeTeachers = filtered.filter(t => t.status === 'Active').length;
    const activeCount = document.getElementById('activeTeachersCount');
    if (activeCount) activeCount.textContent = activeTeachers;
    
    const avgExperience = filtered.length > 0 ? 
        Math.round(filtered.reduce((sum, teacher) => sum + (teacher.totalExperience || 0), 0) / filtered.length) : 0;
    const avgExpElement = document.getElementById('avgExperience');
    if (avgExpElement) avgExpElement.textContent = `${avgExperience} years`;
    
    const uniqueSubjects = new Set();
    filtered.forEach(teacher => {
        if (teacher.primarySubject) uniqueSubjects.add(teacher.primarySubject);
    });
    const subjectsCount = document.getElementById('subjectsCount');
    if (subjectsCount) subjectsCount.textContent = uniqueSubjects.size;
}

function updatePagination(totalItems) {
    const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE);
    const startItem = totalItems > 0 ? (appState.currentPage - 1) * ITEMS_PER_PAGE + 1 : 0;
    const endItem = Math.min(appState.currentPage * ITEMS_PER_PAGE, totalItems);
    
    document.getElementById('startCount').textContent = startItem;
    document.getElementById('endCount').textContent = endItem;
    document.getElementById('totalCount').textContent = totalItems;
    
    const prevBtn = document.getElementById('prevBtn');
    const nextBtn = document.getElementById('nextBtn');
    
    if (prevBtn) prevBtn.disabled = appState.currentPage === 1;
    if (nextBtn) nextBtn.disabled = appState.currentPage === totalPages;
    
    const pageNumbers = document.getElementById('pageNumbers');
    if (!pageNumbers) return;
    
    pageNumbers.innerHTML = '';
    
    for (let i = 1; i <= totalPages; i++) {
        const button = document.createElement('button');
        button.className = `px-3 py-1 border rounded-lg transition-all duration-200 ${i === appState.currentPage ? 'bg-blue-600 text-white border-blue-600' : 'border-gray-300 hover:bg-gray-100'}`;
        button.textContent = i;
        button.onclick = () => goToPage(i);
        pageNumbers.appendChild(button);
    }
}

function goToPage(page) {
    appState.currentPage = page;
    renderTeachersTable();
}

function previousPage() {
    if (appState.currentPage > 1) {
        appState.currentPage--;
        renderTeachersTable();
    }
}

function nextPage() {
    const totalPages = Math.ceil(getFilteredTeachers().length / ITEMS_PER_PAGE);
    if (appState.currentPage < totalPages) {
        appState.currentPage++;
        renderTeachersTable();
    }
}

// ============================================================================
// TEACHER CRUD OPERATIONS WITH API
// ============================================================================

async function viewTeacher(id) {
    try {
        showLoading();
        
        // First try to get from local state
        let teacher = appState.teachers.find(t => t.id === id);
        
        if (teacher) {
            // If found locally, show immediately
            showTeacherModal(teacher);
        }
        
        // Then try to get fresh data from API
        const response = await apiRequest(`/get-teacher-by-id/${id}`);
        
        if (response.success) {
            // Extract teacher data from response
            let teacherData = response.data;
            if (response.data.data) {
                teacherData = response.data.data;
            }
            
            // Update local state
            const index = appState.teachers.findIndex(t => t.id === id);
            if (index !== -1) {
                appState.teachers[index] = teacherData;
            } else {
                appState.teachers.push(teacherData);
            }
            
            // Show modal with fresh data
            showTeacherModal(teacherData);
            saveLocalData();
        } else {
            if (!teacher) {
                Toast.show('Teacher not found', 'error');
            }
        }
    } catch (error) {
        console.error('Error viewing teacher:', error);
        Toast.show('Error loading teacher details', 'error');
    } finally {
        hideLoading();
    }
}

function showTeacherModal(teacher) {
    const modal = document.getElementById('viewModalOverlay');
    if (!modal) return;
    
    modal.classList.add('show');
    
    const fullName = `${teacher.firstName} ${teacher.middleName ? teacher.middleName + ' ' : ''}${teacher.lastName}`;
    const teacherId = teacher.teacherCode || teacher.employeeId || `TCH${teacher.id}`;
    
    modal.querySelector('.modal-content').innerHTML = `
        <div class="p-6 lg:p-8">
            <div class="flex justify-between items-center mb-6">
                <h3 class="text-xl lg:text-2xl font-bold text-gray-800">Teacher Details - ${fullName}</h3>
                <button onclick="closeModal('viewModalOverlay')" class="text-gray-500 hover:text-gray-700">
                    <i class="fas fa-times text-2xl"></i>
                </button>
            </div>
            
            <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <!-- Teacher Profile -->
                <div class="lg:col-span-1">
                    <div class="bg-gradient-to-br from-blue-50 to-purple-50 rounded-xl p-6 text-center">
                        <div class="h-32 w-32 bg-white rounded-full mx-auto mb-4 flex items-center justify-center overflow-hidden border-4 border-white shadow-lg">
                            ${teacher.teacherPhotoUrl ? 
                                `<img src="${API_BASE_URL}/uploads/teachers/${teacher.teacherPhotoUrl}" class="h-full w-full object-cover" alt="${fullName}">` :
                                `<i class="fas fa-user-tie text-6xl text-blue-600"></i>`
                            }
                        </div>
                        <h4 class="text-xl font-bold text-gray-800">${fullName}</h4>
                        <p class="text-gray-600">${teacherId}</p>
                        <div class="mt-4 space-y-2">
                            <div class="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
                                <i class="fas fa-user-tie mr-1"></i>
                                ${teacher.designation || 'Teacher'}
                            </div>
                            <div class="text-sm text-gray-500">${teacher.department || 'Department'} Department</div>
                        </div>
                    </div>
                    
                    <!-- Salary Information -->
                    <div class="mt-6 bg-white rounded-xl border border-gray-200 p-4">
                        <h5 class="font-semibold text-gray-700 mb-3">Salary Information</h5>
                        <div class="space-y-2">
                            <div class="flex justify-between">
                                <span class="text-gray-600">Basic Salary:</span>
                                <span class="font-medium">₹${(teacher.basicSalary || 0).toLocaleString()}</span>
                            </div>
                            <div class="flex justify-between">
                                <span class="text-gray-600">HRA:</span>
                                <span class="font-medium">₹${(teacher.hra || 0).toLocaleString()}</span>
                            </div>
                            <div class="flex justify-between">
                                <span class="text-gray-600">DA:</span>
                                <span class="font-medium">₹${(teacher.da || 0).toLocaleString()}</span>
                            </div>
                            <div class="flex justify-between">
                                <span class="text-gray-600">TA:</span>
                                <span class="font-medium">₹${(teacher.ta || 0).toLocaleString()}</span>
                            </div>
                            <div class="pt-2 border-t">
                                <div class="flex justify-between font-bold">
                                    <span>Gross Salary:</span>
                                    <span class="text-green-600">₹${(teacher.grossSalary || 0).toLocaleString()}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                
                <!-- Teacher Information -->
                <div class="lg:col-span-2">
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <!-- Personal Details -->
                        <div class="bg-white rounded-xl border border-gray-200 p-4">
                            <h5 class="font-semibold text-gray-700 mb-3">Personal Details</h5>
                            <div class="space-y-2 text-sm">
                                <div class="flex">
                                    <span class="w-32 text-gray-600">Full Name:</span>
                                    <span>${fullName}</span>
                                </div>
                                <div class="flex">
                                    <span class="w-32 text-gray-600">Date of Birth:</span>
                                    <span>${formatDate(teacher.dob)}</span>
                                </div>
                                <div class="flex">
                                    <span class="w-32 text-gray-600">Gender:</span>
                                    <span>${teacher.gender || 'N/A'}</span>
                                </div>
                                <div class="flex">
                                    <span class="w-32 text-gray-600">Blood Group:</span>
                                    <span>${teacher.bloodGroup || 'N/A'}</span>
                                </div>
                                <div class="flex">
                                    <span class="w-32 text-gray-600">Contact:</span>
                                    <span>${teacher.contactNumber || 'N/A'}</span>
                                </div>
                                <div class="flex">
                                    <span class="w-32 text-gray-600">Email:</span>
                                    <span>${teacher.email || 'N/A'}</span>
                                </div>
                                <div class="flex">
                                    <span class="w-32 text-gray-600">Aadhar:</span>
                                    <span>${teacher.aadharNumber || 'N/A'}</span>
                                </div>
                                <div class="flex">
                                    <span class="w-32 text-gray-600">PAN:</span>
                                    <span>${teacher.panNumber || 'N/A'}</span>
                                </div>
                            </div>
                        </div>
                        
                        <!-- Professional Details -->
                        <div class="bg-white rounded-xl border border-gray-200 p-4">
                            <h5 class="font-semibold text-gray-700 mb-3">Professional Details</h5>
                            <div class="space-y-2 text-sm">
                                <div class="flex">
                                    <span class="w-32 text-gray-600">Joining Date:</span>
                                    <span>${formatDate(teacher.joiningDate)}</span>
                                </div>
                                <div class="flex">
                                    <span class="w-32 text-gray-600">Experience:</span>
                                    <span>${teacher.totalExperience || 0} years</span>
                                </div>
                                <div class="flex">
                                    <span class="w-32 text-gray-600">Employee ID:</span>
                                    <span>${teacher.employeeId || 'N/A'}</span>
                                </div>
                                <div class="flex">
                                    <span class="w-32 text-gray-600">Employment Type:</span>
                                    <span>${teacher.employmentType || 'N/A'}</span>
                                </div>
                                <div class="flex">
                                    <span class="w-32 text-gray-600">Status:</span>
                                    <span>${teacher.status || 'N/A'}</span>
                                </div>
                            </div>
                        </div>
                        
                        <!-- Subject & Class Details -->
                        <div class="md:col-span-2 bg-white rounded-xl border border-gray-200 p-4">
                            <h5 class="font-semibold text-gray-700 mb-3">Subject & Class Assignments</h5>
                            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div class="space-y-2 text-sm">
                                    <h6 class="font-medium text-blue-600">Subjects</h6>
                                    <div class="flex">
                                        <span class="w-32 text-gray-600">Primary:</span>
                                        <span>${teacher.primarySubject || 'Not Assigned'}</span>
                                    </div>
                                    <div class="flex">
                                        <span class="w-32 text-gray-600">Additional:</span>
                                        <span>${Array.isArray(teacher.additionalSubjects) ? teacher.additionalSubjects.join(', ') : 'N/A'}</span>
                                    </div>
                                </div>
                                <div class="space-y-2 text-sm">
                                    <h6 class="font-medium text-pink-600">Classes Assigned</h6>
                                    <div>
                                        <span>${Array.isArray(teacher.classes) ? teacher.classes.map(c => `Class ${c}`).join(', ') : 'Not Assigned'}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            
            <div class="flex flex-col lg:flex-row justify-end space-y-4 lg:space-y-0 lg:space-x-4 mt-8 pt-6 border-t border-gray-200">
                <button onclick="editTeacher(${teacher.id})" class="px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all duration-200 font-medium">
                    <i class="fas fa-edit mr-2"></i>Edit Teacher
                </button>
                <button onclick="printTeacherDetails(${teacher.id})" class="px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-all duration-200 font-medium">
                    <i class="fas fa-print mr-2"></i>Print Details
                </button>
            </div>
        </div>
    `;
}

async function editTeacher(id) {
    console.log('Editing teacher with ID:', id);
    
    try {
        showLoading();
        
        // First check if teacher exists in local state
        let teacherData = appState.teachers.find(t => t.id === id);
        
        if (teacherData) {
            console.log('Teacher found in local state:', teacherData);
            fillEditForm(teacherData);
            showEditTeacherSection(teacherData);
            hideLoading();
            return;
        }
        
        // If not found locally, fetch from API
        const response = await apiRequest(`/get-teacher-by-id/${id}`);
        
        if (response.success) {
            // Extract teacher data from response
            teacherData = response.data.data || response.data;
            console.log('Teacher data fetched from API:', teacherData);
            
            // Update local state
            const index = appState.teachers.findIndex(t => t.id === id);
            if (index !== -1) {
                appState.teachers[index] = teacherData;
            } else {
                appState.teachers.push(teacherData);
            }
            saveLocalData();
            
            fillEditForm(teacherData);
            showEditTeacherSection(teacherData);
            
        } else {
            Toast.show('Teacher not found', 'error');
            showAllTeachersSection();
        }
        
    } catch (error) {
        console.error('Error editing teacher:', error);
        Toast.show('Error loading teacher data for editing', 'error');
        showAllTeachersSection();
    } finally {
        hideLoading();
    }
}

async function deleteTeacher(id) {
    if (!confirm('Are you sure you want to delete this teacher? This action cannot be undone.')) {
        return;
    }
    
    try {
        showLoading();
        
        const response = await apiRequest(`/delete/${id}`, {
            method: 'DELETE'
        });
        
        if (response.success) {
            appState.teachers = appState.teachers.filter(t => t.id !== id);
            saveLocalData();
            
            renderTeachersTable();
            updateTeacherStats();
            
            Toast.show('Teacher deleted successfully', 'success');
        } else {
            Toast.show(response.error || 'Failed to delete teacher', 'error');
        }
    } catch (error) {
        console.error('Error deleting teacher:', error);
        Toast.show('Error deleting teacher', 'error');
    } finally {
        hideLoading();
    }
}

// ============================================================================
// FORM DATA COLLECTION AND VALIDATION
// ============================================================================

function collectFormData() {
    console.log('Collecting form data...');
    
    const form = document.getElementById('addTeacherForm');
    if (!form) {
        console.error('Form not found!');
        return {};
    }
    
    const formData = new FormData(form);
    
    // Helper function to get element value with validation
    const getElementValue = (selector) => {
        const element = document.querySelector(selector);
        return element ? element.value : '';
    };
    
    // Helper function to get select value
    const getSelectValue = (selector) => {
        const element = document.querySelector(selector);
        return element ? element.value : '';
    };
    
    // Helper function to sanitize phone number (only numbers, max 10 digits)
    const sanitizePhone = (value) => {
        if (!value) return '';
        return value.toString().replace(/[^0-9]/g, '').slice(0, 10);
    };
    
    // Helper function to sanitize Aadhar (only numbers, max 12 digits)
    const sanitizeAadhar = (value) => {
        if (!value) return '';
        return value.toString().replace(/[^0-9]/g, '').slice(0, 12);
    };
    
    // Helper function to sanitize PAN (uppercase, alphanumeric, max 10 chars)
    const sanitizePAN = (value) => {
        if (!value) return '';
        return value.toString().toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 10);
    };
    
    // Helper function to sanitize name (only letters and spaces)
    const sanitizeName = (value) => {
        if (!value) return '';
        return value.toString().replace(/[^A-Za-z\s]/g, '').trim();
    };
    
    // Helper function to sanitize number fields
    const sanitizeNumber = (value) => {
        if (!value) return 0;
        const num = parseFloat(value.toString().replace(/[^0-9.]/g, ''));
        return isNaN(num) ? 0 : num;
    };
    
    const teacherData = {
        // Personal Details with sanitization
        firstName: sanitizeName(getElementValue('[name="firstName"]')),
        middleName: sanitizeName(getElementValue('[name="middleName"]')),
        lastName: sanitizeName(getElementValue('[name="lastName"]')),
        employeeId: getElementValue('[name="employeeId"]').trim(),
        teacherPassword: getElementValue('[name="teacherPassword"]'),
        dob: getElementValue('[name="dob"]'),
        gender: getSelectValue('[name="gender"]'),
        bloodGroup: getSelectValue('[name="bloodGroup"]'),
        status: getSelectValue('[name="status"]') || 'Active',
        
        // Address
        addressLine1: getElementValue('[name="addressLine1"]').trim(),
        addressLine2: getElementValue('[name="addressLine2"]').trim(),
        city: getElementValue('[name="city"]').trim(),
        state: getElementValue('[name="state"]').trim(),
        pincode: getElementValue('[name="pincode"]').trim(),
        
        // Contact Information with sanitization
        contactNumber: sanitizePhone(getElementValue('[name="contactNumber"]')),
        email: getElementValue('[name="email"]').trim().toLowerCase(),
        emergencyContactName: sanitizeName(getElementValue('[name="emergencyContactName"]')),
        emergencyContactNumber: sanitizePhone(getElementValue('[name="emergencyContactNumber"]')),
        
        // Identity Documents with sanitization
        aadharNumber: sanitizeAadhar(getElementValue('[name="aadharNumber"]')),
        panNumber: sanitizePAN(getElementValue('[name="panNumber"]')),
        medicalInfo: getElementValue('[name="medicalInfo"]').trim(),
        
        // Professional Details
        joiningDate: getElementValue('[name="joiningDate"]'),
        designation: getSelectValue('[name="designation"]'),
        totalExperience: sanitizeNumber(getElementValue('[name="totalExperience"]')),
        department: getSelectValue('[name="department"]'),
        employmentType: getSelectValue('[name="employmentType"]'),
        
        // Academic Details
        primarySubject: getSelectValue('[name="primarySubject"]'),
        
        // Salary Details with sanitization
        basicSalary: sanitizeNumber(getElementValue('[name="basicSalary"]')),
        hra: sanitizeNumber(getElementValue('[name="hra"]')),
        da: sanitizeNumber(getElementValue('[name="da"]')),
        ta: sanitizeNumber(getElementValue('[name="ta"]')),
        
        // Bank Details
        bankName: getElementValue('[name="bankName"]').trim(),
        accountNumber: getElementValue('[name="accountNumber"]').trim().replace(/[^0-9]/g, ''),
        ifscCode: getElementValue('[name="ifscCode"]').trim().toUpperCase(),
        branchName: getElementValue('[name="branchName"]').trim(),
        
        // Arrays
        previousExperience: processExperienceEntries(formData),
        qualifications: processQualificationEntries(formData),
        additionalSubjects: formData.getAll('additionalSubjects[]'),
        classes: formData.getAll('classes[]').map(c => c.toString())
    };
    
    console.log('Collected and sanitized form data:', {
        firstName: teacherData.firstName,
        lastName: teacherData.lastName,
        contactNumber: teacherData.contactNumber,
        aadharNumber: teacherData.aadharNumber,
        panNumber: teacherData.panNumber,
        basicSalary: teacherData.basicSalary
    });
    
    return teacherData;
}

function validateFormData(data) {
    console.log('Validating form data...');
    
    let isValid = true;
    let errorMessages = [];
    
    // Validate First Name
    const firstNameValidation = validateName(data.firstName, 'First Name');
    if (!firstNameValidation.valid) {
        isValid = false;
        errorMessages.push(firstNameValidation.message);
        showFieldError('firstName', firstNameValidation.message);
    }
    
    // Validate Last Name
    const lastNameValidation = validateName(data.lastName, 'Last Name');
    if (!lastNameValidation.valid) {
        isValid = false;
        errorMessages.push(lastNameValidation.message);
        showFieldError('lastName', lastNameValidation.message);
    }
    
    // Validate Middle Name (optional)
    if (data.middleName && data.middleName.trim()) {
        const middleNameValidation = validateName(data.middleName, 'Middle Name');
        if (!middleNameValidation.valid) {
            isValid = false;
            errorMessages.push(middleNameValidation.message);
            showFieldError('middleName', middleNameValidation.message);
        }
    }
    
    // Validate Employee ID
    const empIdValidation = validateEmployeeId(data.employeeId);
    if (!empIdValidation.valid) {
        isValid = false;
        errorMessages.push(empIdValidation.message);
        showFieldError('employeeId', empIdValidation.message);
    }
    
    // Validate Password
    const passwordValidation = validatePassword(data.teacherPassword);
    if (!passwordValidation.valid) {
        isValid = false;
        errorMessages.push(passwordValidation.message);
        showFieldError('teacherPassword', passwordValidation.message);
    }
    
    // Validate Date of Birth
    const dobValidation = validateDate(data.dob, 'Date of Birth');
    if (!dobValidation.valid) {
        isValid = false;
        errorMessages.push(dobValidation.message);
        showFieldError('dob', dobValidation.message);
    }
    
    // Validate Gender
    if (!data.gender || data.gender === '') {
        isValid = false;
        errorMessages.push('Gender is required');
        showFieldError('gender', 'Please select gender');
    }
    
    // Validate Contact Number
    const phoneValidation = validatePhoneNumber(data.contactNumber);
    if (!phoneValidation.valid) {
        isValid = false;
        errorMessages.push(phoneValidation.message);
        showFieldError('contactNumber', phoneValidation.message);
    }
    
    // Validate Email
    const emailValidation = validateEmailAddress(data.email);
    if (!emailValidation.valid) {
        isValid = false;
        errorMessages.push(emailValidation.message);
        showFieldError('email', emailValidation.message);
    }
    
    // Validate Emergency Contact
    const emergencyValidation = validateEmergencyContact(data.emergencyContactNumber);
    if (!emergencyValidation.valid) {
        isValid = false;
        errorMessages.push(emergencyValidation.message);
        showFieldError('emergencyContactNumber', emergencyValidation.message);
    }
    
    // Validate Aadhar
    const aadharValidation = validateAadharNumber(data.aadharNumber);
    if (!aadharValidation.valid) {
        isValid = false;
        errorMessages.push(aadharValidation.message);
        showFieldError('aadharNumber', aadharValidation.message);
    }
    
    // Validate PAN
    const panValidation = validatePANNumber(data.panNumber);
    if (!panValidation.valid) {
        isValid = false;
        errorMessages.push(panValidation.message);
        showFieldError('panNumber', panValidation.message);
    }
    
    // Validate Joining Date
    const joiningValidation = validateDate(data.joiningDate, 'Joining Date');
    if (!joiningValidation.valid) {
        isValid = false;
        errorMessages.push(joiningValidation.message);
        showFieldError('joiningDate', joiningValidation.message);
    }
    
    // Validate Designation
    if (!data.designation || data.designation === '') {
        isValid = false;
        errorMessages.push('Designation is required');
        showFieldError('designation', 'Please select designation');
    }
    
    // Validate Department
    if (!data.department || data.department === '') {
        isValid = false;
        errorMessages.push('Department is required');
        showFieldError('department', 'Please select department');
    }
    
    // Validate Employment Type
    if (!data.employmentType || data.employmentType === '') {
        isValid = false;
        errorMessages.push('Employment Type is required');
        showFieldError('employmentType', 'Please select employment type');
    }
    
    // Validate Primary Subject
    if (!data.primarySubject || data.primarySubject === '') {
        isValid = false;
        errorMessages.push('Primary Subject is required');
        showFieldError('primarySubject', 'Please select primary subject');
    }
    
    // Validate Experience
    const expValidation = validateNumberField(data.totalExperience, 'Total Experience', 0, 50);
    if (!expValidation.valid) {
        isValid = false;
        errorMessages.push(expValidation.message);
        showFieldError('totalExperience', expValidation.message);
    }
    
    // Validate Basic Salary
    const salaryValidation = validateNumberField(data.basicSalary, 'Basic Salary', 0);
    if (!salaryValidation.valid) {
        isValid = false;
        errorMessages.push(salaryValidation.message);
        showFieldError('basicSalary', salaryValidation.message);
    }
    
    // Show error summary if any
    if (!isValid) {
        // Show first error message in toast
        Toast.show(errorMessages[0], 'error', 5000);
        
        // Scroll to first error field
        const firstErrorField = document.querySelector('.form-control.error');
        if (firstErrorField) {
            firstErrorField.scrollIntoView({ behavior: 'smooth', block: 'center' });
            firstErrorField.focus();
        }
    }
    
    return isValid;
}

function processExperienceEntries(formData) {
    const experiences = [];
    const schools = formData.getAll('prevSchool[]');
    const positions = formData.getAll('prevPosition[]');
    const durations = formData.getAll('prevDuration[]');
    
    for (let i = 0; i < schools.length; i++) {
        if (schools[i] && schools[i].trim()) {
            experiences.push({
                school: schools[i],
                position: positions[i] || '',
                duration: parseInt(durations[i]) || 0
            });
        }
    }
    return experiences;
}

function processQualificationEntries(formData) {
    const qualifications = [];
    const degrees = formData.getAll('degree[]');
    const specializations = formData.getAll('specialization[]');
    const universities = formData.getAll('university[]');
    const completionYears = formData.getAll('completionYear[]');
    
    for (let i = 0; i < degrees.length; i++) {
        if (degrees[i] && degrees[i].trim()) {
            qualifications.push({
                degree: degrees[i],
                specialization: specializations[i] || '',
                university: universities[i] || '',
                completionYear: parseInt(completionYears[i]) || 0
            });
        }
    }
    return qualifications;
}

// ============================================================================
// ADD TEACHER HANDLER WITH API
// ============================================================================

async function handleAddTeacher() {
    console.log('=== STARTING TEACHER REGISTRATION ===');
    
    try {
        // Step 1: Get password fields
        const passwordElement = document.getElementById('teacherPassword');
        const confirmPasswordElement = document.getElementById('confirmTeacherPassword');
        
        if (!passwordElement || !confirmPasswordElement) {
            Toast.show('Password fields not found', 'error');
            return;
        }
        
        const password = passwordElement.value;
        const confirmPassword = confirmPasswordElement.value;
        
        // Step 2: Password validation
        if (!password || password.length < 6) {
            Toast.show('Password must be at least 6 characters', 'error');
            return;
        }
        
        if (password !== confirmPassword) {
            Toast.show('Passwords do not match', 'error');
            return;
        }
        
        // Step 3: Validate required documents
        const requiredDocuments = [
            'teacherAadhar',
            'panCard',
            'educationCertificate'
        ];
        
        let missingDocuments = [];
        requiredDocuments.forEach(docType => {
            if (!uploadedFiles.has(docType)) {
                missingDocuments.push(docType);
            }
        });
        
        if (missingDocuments.length > 0) {
            Toast.show(`Please upload required documents: ${missingDocuments.join(', ')}`, 'error');
            switchTab('documents');
            return;
        }
        
        // Step 4: Collect and validate form data
        console.log('Collecting form data...');
        const formData = collectFormData();
        console.log('Collected form data:', formData);
        
        // Add password to form data if not present
        formData.teacherPassword = password;
        
        // Step 5: Validate required fields
        const requiredFields = [
            'firstName', 'lastName', 'employeeId', 
            'dob', 'gender', 'contactNumber', 'email',
            'emergencyContactName', 'emergencyContactNumber',
            'aadharNumber', 'panNumber', 'joiningDate', 'designation',
            'department', 'employmentType', 'primarySubject'
        ];
        
        const missingFields = [];
        requiredFields.forEach(field => {
            if (!formData[field] || formData[field].toString().trim() === '') {
                missingFields.push(field);
            }
        });
        
        if (missingFields.length > 0) {
            Toast.show(`Please fill required fields: ${missingFields.join(', ')}`, 'error');
            return;
        }
        
        // Step 6: Show loading
        showLoading();
        
        // Step 7: Transform data for backend
        console.log('Transforming data for backend...');
        const backendData = transformDataForBackend(formData);
        console.log('Transformed data:', backendData);
        
        // Step 8: Create FormData for multipart request
        const apiFormData = new FormData();
        
        // Add teacher data as JSON string
        apiFormData.append('teacherData', JSON.stringify(backendData));
        console.log('Added teacherData to FormData');
        
        // Step 9: Add files with correct field names
        let fileCount = 0;
        uploadedFiles.forEach((file, key) => {
            const apiKey = getApiFileKey(key);
            if (apiKey) {
                console.log(`Adding file: ${key} -> ${apiKey} (${file.name})`);
                apiFormData.append(apiKey, file);
                fileCount++;
            }
        });
        
        console.log(`Total files added: ${fileCount}`);
        
        // Step 10: Get createdBy from admin mobile
        const adminMobile = localStorage.getItem('admin_mobile') || 'admin';
        const createdBy = adminMobile;
        
        // Step 11: Make API call
        console.log('Making API request to:', `${API_BASE_URL}/create-teacher`);
        
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout
        
        try {
            const response = await fetch(`${API_BASE_URL}/create-teacher`, {
                method: 'POST',
                body: apiFormData,
                headers: {
                    'X-Created-By': createdBy
                },
                signal: controller.signal
            });
            
            clearTimeout(timeoutId);
            
            console.log('Response status:', response.status, response.statusText);
            
            // Get response text
            const responseText = await response.text();
            console.log('Response text length:', responseText.length);
            
            let result;
            try {
                result = JSON.parse(responseText);
                console.log('Parsed response:', result);
            } catch (jsonError) {
                console.error('Failed to parse JSON:', jsonError);
                console.error('Raw response:', responseText.substring(0, 500));
                
                if (!response.ok) {
                    throw new Error(`Server error ${response.status}: ${response.statusText}`);
                } else {
                    throw new Error('Server returned invalid JSON response');
                }
            }
            
            // Handle response
            if (response.ok && result.success) {
                console.log('✅ Teacher created successfully!');
                
                const teacherCode = result.data?.teacherCode || result.teacherCode || 'Unknown';
                Toast.show(`Teacher registered successfully! ID: ${teacherCode}`, 'success');
                
                // Add to local state
                if (result.data) {
                    const newTeacher = result.data;
                    if (!newTeacher.id) newTeacher.id = Date.now();
                    appState.teachers.unshift(newTeacher);
                    saveLocalData();
                }
                
                // Reset form and redirect
                resetForm();
                
                setTimeout(() => {
                    showAllTeachersSection();
                }, 2000);
                
            } else {
                // Handle error response
                const errorMessage = result.message || result.error || 'Failed to register teacher';
                console.error('API returned error:', errorMessage);
                
                if (result.errors) {
                    console.error('Validation errors:', result.errors);
                    Toast.show(`Validation errors: ${JSON.stringify(result.errors)}`, 'error', 5000);
                } else {
                    Toast.show(errorMessage, 'error');
                }
            }
            
        } catch (fetchError) {
            clearTimeout(timeoutId);
            console.error('Fetch error:', fetchError);
            
            let userMessage = fetchError.message;
            
            if (fetchError.name === 'AbortError') {
                userMessage = 'Request timeout. Please try again.';
            } else if (fetchError.message.includes('Failed to fetch')) {
                userMessage = 'Cannot connect to server. Please ensure backend is running on port 8084.';
            }
            
            Toast.show(userMessage, 'error', 5000);
        }
        
    } catch (error) {
        console.error('Error in handleAddTeacher:', error);
        Toast.show(error.message || 'An unexpected error occurred', 'error');
    } finally {
        hideLoading();
        console.log('=== TEACHER REGISTRATION COMPLETED ===');
    }
}

function transformDataForBackend(formData) {
    // Transform the data to match backend DTO structure
    console.log('Transforming data for backend...');
    
    // Format date properly for backend
    const formatDateForBackend = (dateString) => {
        if (!dateString) return null;
        // Send date as is - backend now uses LocalDate which accepts yyyy-MM-dd
        return dateString;
    };
    
    // Combine address into single string
    const fullAddress = combineAddress(
        formData.addressLine1, 
        formData.addressLine2, 
        formData.city, 
        formData.state, 
        formData.pincode
    );
    
    // Calculate total salary
    const totalSalary = (formData.basicSalary || 0) + 
                        (formData.hra || 0) + 
                        (formData.da || 0) + 
                        (formData.ta || 0) + 
                        calculateAdditionalAllowancesTotal();
    
    // Prepare additional allowances array
    const additionalAllowancesArray = additionalAllowances.map(allowance => ({
        name: allowance.name,
        amount: allowance.amount
    }));
    
    // Prepare document names (will be set after upload)
    const documentNames = {
        teacherPhotoName: null,
        aadharDocumentName: null,
        panDocumentName: null,
        educationDocumentName: null,
        bedDocumentName: null,
        experienceDocumentName: null,
        policeVerificationDocumentName: null,
        medicalFitnessDocumentName: null,
        resumeDocumentName: null
    };
    
    // Check which files are uploaded and set placeholder names
    uploadedFiles.forEach((file, key) => {
        const fileName = file.name;
        switch(key) {
            case 'teacherPhoto':
                documentNames.teacherPhotoName = fileName;
                break;
            case 'teacherAadhar':
                documentNames.aadharDocumentName = fileName;
                break;
            case 'panCard':
                documentNames.panDocumentName = fileName;
                break;
            case 'educationCertificate':
                documentNames.educationDocumentName = fileName;
                break;
            case 'bedCertificate':
                documentNames.bedDocumentName = fileName;
                break;
            case 'experienceCertificate':
                documentNames.experienceDocumentName = fileName;
                break;
            case 'policeVerification':
                documentNames.policeVerificationDocumentName = fileName;
                break;
            case 'medicalFitness':
                documentNames.medicalFitnessDocumentName = fileName;
                break;
            case 'resume':
                documentNames.resumeDocumentName = fileName;
                break;
        }
    });
    
    // Build the complete backend DTO
    const backendData = {
        // Basic Information
        firstName: formData.firstName || '',
        middleName: formData.middleName || '',
        lastName: formData.lastName || '',
        employeeId: formData.employeeId || `EMP${Date.now()}`,
        
        // AUTHENTICATION - CRITICAL FIELDS
        teacherPassword: formData.teacherPassword || 'Password@123',
        confirmTeacherPassword: formData.teacherPassword || 'Password@123',
        
        // Personal Information
        dob: formatDateForBackend(formData.dob),
        gender: formData.gender || '',
        bloodGroup: formData.bloodGroup || '',
        status: formData.status || 'Active',
        
        // Address
        address: fullAddress,
        city: formData.city || '',
        state: formData.state || '',
        pincode: formData.pincode || '',
        
        // Contact Information
        contactNumber: formData.contactNumber || '',
        email: formData.email || '',
        emergencyContactName: formData.emergencyContactName || '',
        emergencyContactNumber: formData.emergencyContactNumber || '',
        
        // Identity Documents
        aadharNumber: formData.aadharNumber || '',
        panNumber: formData.panNumber || '',
        medicalInfo: formData.medicalInfo || '',
        
        // Professional Information
        joiningDate: formatDateForBackend(formData.joiningDate),
        designation: formData.designation || '',
        totalExperience: formData.totalExperience || 0,
        department: formData.department || '',
        employmentType: formData.employmentType || 'Full Time',
        
        // Academic Information
        primarySubject: formData.primarySubject || '',
        
        // Salary Information
        basicSalary: formData.basicSalary || 0,
        hra: formData.hra || 0,
        da: formData.da || 0,
        ta: formData.ta || 0,
        grossSalary: totalSalary,
        
        // Additional Allowances
        additionalAllowances: additionalAllowancesArray,
        
        // Bank Details
        bankName: formData.bankName || '',
        accountNumber: formData.accountNumber || '',
        ifscCode: formData.ifscCode || '',
        branchName: formData.branchName || '',
        
        // Arrays
        previousExperience: formData.previousExperience || [],
        qualifications: formData.qualifications || [],
        additionalSubjects: formData.additionalSubjects || [],
        classes: (formData.classes || []).map(c => c.toString()),
        
        // Teacher Code (let backend generate)
        teacherCode: null,
        
        // Document Names
        ...documentNames
    };
    
    // Remove any undefined or null values
    Object.keys(backendData).forEach(key => {
        if (backendData[key] === undefined || backendData[key] === null) {
            if (typeof backendData[key] === 'string') {
                backendData[key] = '';
            } else if (typeof backendData[key] === 'number') {
                backendData[key] = 0;
            } else if (Array.isArray(backendData[key])) {
                backendData[key] = [];
            }
        }
    });
    
    // Ensure password fields are identical
    if (backendData.teacherPassword !== backendData.confirmTeacherPassword) {
        backendData.confirmTeacherPassword = backendData.teacherPassword;
    }
    
    console.log('Transformed backend data structure:', Object.keys(backendData).sort());
    console.log('Password fields match:', backendData.teacherPassword === backendData.confirmTeacherPassword);
    console.log('Formatted DOB:', backendData.dob);
    console.log('Formatted Joining Date:', backendData.joiningDate);
    
    return backendData;
}

function combineAddress(addressLine1, addressLine2, city, state, pincode) {
    const parts = [];
    
    if (addressLine1 && addressLine1.trim()) parts.push(addressLine1.trim());
    if (addressLine2 && addressLine2.trim()) parts.push(addressLine2.trim());
    if (city && city.trim()) parts.push(city.trim());
    if (state && state.trim()) parts.push(state.trim());
    if (pincode && pincode.trim()) parts.push(pincode.trim());
    
    return parts.join(', ');
}

function getApiFileKey(frontendKey) {
    const keyMap = {
        'teacherPhoto': 'teacherPhoto',
        'teacherAadhar': 'aadharDocument',
        'panCard': 'panDocument',
        'educationCertificate': 'educationDocument',
        'bedCertificate': 'bedDocument',
        'experienceCertificate': 'experienceDocument',
        'policeVerification': 'policeVerificationDocument',
        'medicalFitness': 'medicalFitnessDocument',
        'resume': 'resumeDocument'
    };
    
    return keyMap[frontendKey] || null;
}

// ============================================================================
// FORM RESET
// ============================================================================

function resetForm() {
    console.log('Resetting form...');

    // Clear edit mode
    editingTeacherId = null;

    // Reset button text - TARGET BY ID NOT CLASS
    const submitButton = document.getElementById('submitTeacherBtn');
    if (submitButton) {
        submitButton.innerHTML = '<i class="fas fa-check-circle mr-2"></i> Register Teacher';
        submitButton.onclick = () => handleAddTeacher();
    }
    
    // Update sidebar active state after reset
    if (typeof setActiveTeacherSidebarLink === 'function') {
        setActiveTeacherSidebarLink();
    }

    // Reset form title
    const formTitle = document.getElementById('formTitle');
    if (formTitle) {
        formTitle.textContent = 'Add New Teacher';
    }
    
    const form = document.getElementById('addTeacherForm');
    if (form) {
        form.reset();
        console.log('Form reset');
    }
    
    // Reset photo preview
    const photoPreview = document.getElementById('teacherPhotoPreview');
    if (photoPreview) {
        photoPreview.innerHTML = `
            <i class="fas fa-user-tie text-4xl lg:text-6xl text-gray-400"></i>
        `;
    }
    
    // Reset document previews
    const documentPreviews = [
        'teacherAadharPreview',
        'panCardPreview',
        'educationCertificatePreview',
        'bedCertificatePreview',
        'experienceCertificatePreview',
        'policeVerificationPreview',
        'medicalFitnessPreview',
        'resumePreview'
    ];
    
    documentPreviews.forEach(previewId => {
        const element = document.getElementById(previewId);
        if (element) {
            element.innerHTML = `
                <i class="fas fa-cloud-upload-alt text-3xl text-gray-400 mb-2"></i>
                <p class="text-sm text-gray-500 text-center">Upload document image</p>
                <p class="text-xs text-gray-400">Click to upload</p>
            `;
        }
    });
    
    // Reset salary inputs to defaults
    const basicSalary = document.getElementById('basicSalary');
    const hra = document.getElementById('hra');
    const da = document.getElementById('da');
    const ta = document.getElementById('ta');
    
    if (basicSalary) basicSalary.value = '25000';
    if (hra) hra.value = '5000';
    if (da) da.value = '3000';
    if (ta) ta.value = '2000';
    
    // Clear additional allowances
    additionalAllowances = [];
    renderAdditionalAllowancesList();
    
    // Clear uploaded files
    uploadedFiles.clear();
    
    // Clear dynamic entries (keep first one)
    const experienceEntries = document.getElementById('experienceEntries');
    if (experienceEntries) {
        const firstEntry = experienceEntries.querySelector('.grid');
        if (firstEntry) {
            experienceEntries.innerHTML = '';
            experienceEntries.appendChild(firstEntry.cloneNode(true));
        }
    }
    
    const qualificationEntries = document.getElementById('qualificationEntries');
    if (qualificationEntries) {
        const firstEntry = qualificationEntries.querySelector('.grid');
        if (firstEntry) {
            qualificationEntries.innerHTML = '';
            qualificationEntries.appendChild(firstEntry.cloneNode(true));
        }
    }
    
    // Generate new employee ID
    generateEmployeeId();
    
    calculateTotalSalary();
    updateDocumentStatus();
    switchTab('personal');
    
    Toast.show('Form reset successfully', 'info');
}

// ============================================================================
// EDIT TEACHER FUNCTIONALITY
// ============================================================================

// Global variable to track which teacher is being edited
let editingTeacherId = null;

async function editTeacher(id) {
    console.log('Editing teacher with ID:', id);
    
    try {
        showLoading();
        
        // Fetch teacher data from API
        const response = await apiRequest(`/get-teacher-by-id/${id}`);
        
        let teacherData = null;
        
        if (response.success) {
            // Extract teacher data from response
            teacherData = response.data.data || response.data;
            console.log('Teacher data fetched:', teacherData);
            
            // Update local state
            const index = appState.teachers.findIndex(t => t.id === id);
            if (index !== -1) {
                appState.teachers[index] = teacherData;
            }
            
            // Fill the form with teacher data
            fillEditForm(teacherData);
            
            // Show the add teacher section with edit mode
            showEditTeacherSection(teacherData);
            
        } else {
            // Try to find in local state
            teacherData = appState.teachers.find(t => t.id === id);
            
            if (teacherData) {
                fillEditForm(teacherData);
                showEditTeacherSection(teacherData);
            } else {
                Toast.show('Teacher not found', 'error');
            }
        }
        
    } catch (error) {
        console.error('Error editing teacher:', error);
        Toast.show('Error loading teacher data for editing', 'error');
    } finally {
        hideLoading();
    }
}

function showEditTeacherSection(teacherData) {
    // Change the section title to "Edit Teacher"
    const formTitle = document.getElementById('formTitle');
    if (formTitle) {
        formTitle.textContent = 'Edit Teacher';
    }
    
    // Store the teacher ID being edited
    editingTeacherId = teacherData.id;
    
    // Change the submit button text and function - TARGET BY ID NOT CLASS
    const submitButton = document.getElementById('submitTeacherBtn');
    if (submitButton) {
        submitButton.innerHTML = '<i class="fas fa-save mr-2"></i> Update Teacher';
        submitButton.onclick = () => handleUpdateTeacher();
    }
    
    // Show the add teacher section
    document.getElementById('allTeachersSection').classList.add('hidden');
    document.getElementById('addTeacherSection').classList.remove('hidden');
    
    // Switch to personal details tab first
    switchTab('personal');
    
    history.pushState({}, '', '../teachers-management/teachers-management.html?action=edit&id=' + teacherData.id);
    
    if (typeof setActiveTeacherSidebarLink === 'function') {
        setActiveTeacherSidebarLink();
    }
    
    if (isMobile) {
        closeMobileSidebar();
    }
}

function fillEditForm(teacherData) {
    console.log('Filling edit form with data:', teacherData);
    
    // Personal Details
    setElementValue('firstName', teacherData.firstName);
    setElementValue('middleName', teacherData.middleName);
    setElementValue('lastName', teacherData.lastName);
    setElementValue('employeeId', teacherData.employeeId || teacherData.teacherCode);
    setElementValue('dob', teacherData.dob);
    setSelectValue('gender', teacherData.gender);
    setSelectValue('bloodGroup', teacherData.bloodGroup);
    setSelectValue('status', teacherData.status || 'Active');
    
    // Address
    setElementValue('addressLine1', teacherData.addressLine1 || extractAddressLine1(teacherData.address));
    setElementValue('addressLine2', teacherData.addressLine2 || extractAddressLine2(teacherData.address));
    setElementValue('city', teacherData.city);
    setElementValue('state', teacherData.state);
    setElementValue('pincode', teacherData.pincode);
    
    // Contact
    setElementValue('contactNumber', teacherData.contactNumber);
    setElementValue('email', teacherData.email);
    setElementValue('emergencyContactName', teacherData.emergencyContactName);
    setElementValue('emergencyContactNumber', teacherData.emergencyContactNumber);
    
    // Documents
    setElementValue('aadharNumber', teacherData.aadharNumber);
    setElementValue('panNumber', teacherData.panNumber);
    setElementValue('medicalInfo', teacherData.medicalInfo);
    
    // Professional
    setElementValue('joiningDate', teacherData.joiningDate);
    setSelectValue('designation', teacherData.designation);
    setElementValue('totalExperience', teacherData.totalExperience || 0);
    setSelectValue('department', teacherData.department);
    setSelectValue('employmentType', teacherData.employmentType);
    
    // Academic
    setSelectValue('primarySubject', teacherData.primarySubject);
    
    // Salary
    setElementValue('basicSalary', teacherData.basicSalary || 0);
    setElementValue('hra', teacherData.hra || 0);
    setElementValue('da', teacherData.da || 0);
    setElementValue('ta', teacherData.ta || 0);
    
    // Bank Details
    setElementValue('bankName', teacherData.bankName);
    setElementValue('accountNumber', teacherData.accountNumber);
    setElementValue('ifscCode', teacherData.ifscCode);
    setElementValue('branchName', teacherData.branchName);
    
    // Checkboxes for additional subjects
    if (teacherData.additionalSubjects && Array.isArray(teacherData.additionalSubjects)) {
        const subjectCheckboxes = document.querySelectorAll('input[name="additionalSubjects[]"]');
        subjectCheckboxes.forEach(checkbox => {
            checkbox.checked = teacherData.additionalSubjects.includes(checkbox.value);
        });
    }
    
    // Checkboxes for classes
    if (teacherData.classes && Array.isArray(teacherData.classes)) {
        const classCheckboxes = document.querySelectorAll('input[name="classes[]"]');
        classCheckboxes.forEach(checkbox => {
            checkbox.checked = teacherData.classes.includes(checkbox.value);
        });
    }
    
    // Clear and populate previous experience
    if (teacherData.previousExperience && teacherData.previousExperience.length > 0) {
        const experienceContainer = document.getElementById('experienceEntries');
        if (experienceContainer) {
            // Clear existing entries except the first one
            experienceContainer.innerHTML = '';
            
            teacherData.previousExperience.forEach((exp, index) => {
                addExperienceEntryWithData(exp.school, exp.position, exp.duration);
            });
        }
    }
    
    // Clear and populate qualifications
    if (teacherData.qualifications && teacherData.qualifications.length > 0) {
        const qualificationContainer = document.getElementById('qualificationEntries');
        if (qualificationContainer) {
            // Clear existing entries except the first one
            qualificationContainer.innerHTML = '';
            
            teacherData.qualifications.forEach((qual, index) => {
                addQualificationEntryWithData(
                    qual.degree, 
                    qual.specialization, 
                    qual.university, 
                    qual.completionYear
                );
            });
        }
    }
    
    // Populate additional allowances
    if (teacherData.additionalAllowances && teacherData.additionalAllowances.length > 0) {
        additionalAllowances = teacherData.additionalAllowances.map((allowance, index) => ({
            id: Date.now() + index,
            name: allowance.name,
            amount: allowance.amount
        }));
        renderAdditionalAllowancesList();
    }
    
    // Display photo if exists
    if (teacherData.teacherPhotoUrl) {
        const photoPreview = document.getElementById('teacherPhotoPreview');
        if (photoPreview) {
            photoPreview.innerHTML = `
                <img src="${API_BASE_URL}/uploads/teachers/${teacherData.teacherPhotoUrl}" 
                     class="h-full w-full object-cover rounded-full" alt="Teacher Photo">
            `;
        }
    }
    
    // Update document status
    updateDocumentStatus();
    
    // Calculate total salary
    calculateTotalSalary();
    
    Toast.show('Teacher data loaded for editing', 'success');
}

// Helper function to set input value
function setElementValue(elementId, value) {
    const element = document.getElementById(elementId);
    if (element && value !== undefined && value !== null) {
        element.value = value;
    }
}

// Helper function to set select value
function setSelectValue(elementId, value) {
    const element = document.getElementById(elementId);
    if (element && value) {
        element.value = value;
    }
}

// Helper functions to extract address components
function extractAddressLine1(fullAddress) {
    if (!fullAddress) return '';
    const parts = fullAddress.split(', ');
    return parts[0] || '';
}

function extractAddressLine2(fullAddress) {
    if (!fullAddress) return '';
    const parts = fullAddress.split(', ');
    return parts[1] || '';
}

// Add experience entry with data
function addExperienceEntryWithData(school, position, duration) {
    const container = document.getElementById('experienceEntries');
    if (!container) return;
    
    const entry = document.createElement('div');
    entry.className = 'grid grid-cols-1 md:grid-cols-3 gap-4 mb-4';
    entry.innerHTML = `
        <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">School/Organization</label>
            <input type="text" name="prevSchool[]" value="${escapeHtml(school || '')}" class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200" placeholder="Previous school name">
        </div>
        
        <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">Position</label>
            <input type="text" name="prevPosition[]" value="${escapeHtml(position || '')}" class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200" placeholder="Position held">
        </div>
        
        <div class="flex items-end space-x-2">
            <div class="flex-1">
                <label class="block text-sm font-medium text-gray-700 mb-2">Duration (Years)</label>
                <input type="number" name="prevDuration[]" value="${duration || 0}" min="0" max="50" class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200" placeholder="Years">
            </div>
            <button type="button" onclick="removeExperienceEntry(this)" class="px-3 py-2 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-lg transition-colors duration-200">
                <i class="fas fa-times"></i>
            </button>
        </div>
    `;
    container.appendChild(entry);
}

// Add qualification entry with data
function addQualificationEntryWithData(degree, specialization, university, completionYear) {
    const container = document.getElementById('qualificationEntries');
    if (!container) return;
    
    const entry = document.createElement('div');
    entry.className = 'grid grid-cols-1 md:grid-cols-4 gap-4 mb-4';
    entry.innerHTML = `
        <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">Degree</label>
            <select name="degree[]" class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200">
                <option value="">Select Degree</option>
                <option value="Bachelor" ${degree === 'Bachelor' ? 'selected' : ''}>Bachelor's Degree</option>
                <option value="Master" ${degree === 'Master' ? 'selected' : ''}>Master's Degree</option>
                <option value="PhD" ${degree === 'PhD' ? 'selected' : ''}>Ph.D.</option>
                <option value="B.Ed." ${degree === 'B.Ed.' ? 'selected' : ''}>B.Ed.</option>
                <option value="M.Ed." ${degree === 'M.Ed.' ? 'selected' : ''}>M.Ed.</option>
                <option value="Diploma" ${degree === 'Diploma' ? 'selected' : ''}>Diploma</option>
            </select>
        </div>
        
        <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">Specialization</label>
            <input type="text" name="specialization[]" value="${escapeHtml(specialization || '')}" class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200" placeholder="e.g., Mathematics, Physics">
        </div>
        
        <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">University/College</label>
            <input type="text" name="university[]" value="${escapeHtml(university || '')}" class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200" placeholder="University name">
        </div>
        
        <div class="flex items-end space-x-2">
            <div class="flex-1">
                <label class="block text-sm font-medium text-gray-700 mb-2">Year of Completion</label>
                <input type="number" name="completionYear[]" value="${completionYear || ''}" min="1950" max="2030" class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200" placeholder="YYYY">
            </div>
            <button type="button" onclick="removeQualificationEntry(this)" class="px-3 py-2 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-lg transition-colors duration-200">
                <i class="fas fa-times"></i>
            </button>
        </div>
    `;
    container.appendChild(entry);
}

// Escape HTML to prevent XSS
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// ============================================================================
// UPDATE TEACHER HANDLER
// ============================================================================

async function handleUpdateTeacher() {
    console.log('=== STARTING TEACHER UPDATE ===');
    console.log('Editing Teacher ID:', editingTeacherId);
    
    try {
        // Get password fields (optional for update)
        const passwordElement = document.getElementById('teacherPassword');
        const confirmPasswordElement = document.getElementById('confirmTeacherPassword');
        
        let password = null;
        
        // Only validate password if user entered something
        if (passwordElement && passwordElement.value) {
            password = passwordElement.value;
            
            if (password.length < 6) {
                Toast.show('Password must be at least 6 characters', 'error');
                return;
            }
            
            if (confirmPasswordElement && password !== confirmPasswordElement.value) {
                Toast.show('Passwords do not match', 'error');
                return;
            }
        }
        
        // Collect form data
        console.log('Collecting form data...');
        const formData = collectFormData();
        
        // Add password only if provided
        if (password) {
            formData.teacherPassword = password;
        }
        
        // Validate required fields (skip password for update)
        const requiredFields = [
            'firstName', 'lastName', 'employeeId',
            'dob', 'gender', 'contactNumber', 'email',
            'emergencyContactName', 'emergencyContactNumber',
            'aadharNumber', 'panNumber', 'joiningDate', 'designation',
            'department', 'employmentType', 'primarySubject'
        ];
        
        const missingFields = [];
        requiredFields.forEach(field => {
            if (!formData[field] || formData[field].toString().trim() === '') {
                missingFields.push(field);
            }
        });
        
        if (missingFields.length > 0) {
            Toast.show(`Please fill required fields: ${missingFields.join(', ')}`, 'error');
            return;
        }
        
        // Show loading
        showLoading();
        
        // Transform data for backend
        console.log('Transforming data for backend...');
        const backendData = transformDataForBackend(formData);
        
        // Add the teacher ID for update
        backendData.id = editingTeacherId;
        
        // Prepare FormData for multipart request
        const apiFormData = new FormData();
        
        // Add teacher data as JSON string
        apiFormData.append('teacherData', JSON.stringify(backendData));
        
        // Add files (only new ones, not already uploaded)
        uploadedFiles.forEach((file, key) => {
            const apiKey = getApiFileKey(key);
            if (apiKey && file) {
                console.log(`Adding file for update: ${key} -> ${apiKey} (${file.name})`);
                apiFormData.append(apiKey, file);
            }
        });
        
        // Get createdBy from admin mobile
        const adminMobile = localStorage.getItem('admin_mobile') || 'admin';
        const updatedBy = adminMobile;
        
        // Make API call to update teacher
        console.log('Making API request to update teacher...');
        
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 30000);
        
        try {
            const response = await fetch(`${API_BASE_URL}/update-teacher/${editingTeacherId}`, {
                method: 'PUT',
                body: apiFormData,
                headers: {
                    'X-Updated-By': updatedBy
                },
                signal: controller.signal
            });
            
            clearTimeout(timeoutId);
            
            console.log('Update response status:', response.status);
            
            const responseText = await response.text();
            console.log('Response text:', responseText.substring(0, 500));
            
            let result;
            try {
                result = JSON.parse(responseText);
            } catch (jsonError) {
                console.error('Failed to parse JSON:', jsonError);
                throw new Error('Server returned invalid response');
            }
            
            if (response.ok && result.success) {
                console.log('✅ Teacher updated successfully!');
                
                Toast.show(`Teacher updated successfully! ID: ${result.data?.teacherCode || editingTeacherId}`, 'success');
                
                // Update local state
                if (result.data) {
                    const index = appState.teachers.findIndex(t => t.id === editingTeacherId);
                    if (index !== -1) {
                        appState.teachers[index] = result.data;
                    } else {
                        appState.teachers.unshift(result.data);
                    }
                    saveLocalData();
                }
                
                // Reset form and redirect
                resetForm();
                editingTeacherId = null;
                
                // Reset button text
                const submitButton = document.querySelector('#addTeacherSection .btn-primary');
                if (submitButton) {
                    submitButton.innerHTML = '<i class="fas fa-save mr-2"></i> Save Teacher';
                    submitButton.onclick = () => handleAddTeacher();
                }
                
                setTimeout(() => {
                    showAllTeachersSection();
                }, 2000);
                
            } else {
                const errorMessage = result.message || result.error || 'Failed to update teacher';
                console.error('API returned error:', errorMessage);
                Toast.show(errorMessage, 'error');
            }
            
        } catch (fetchError) {
            clearTimeout(timeoutId);
            console.error('Fetch error:', fetchError);
            
            let userMessage = fetchError.message;
            if (fetchError.name === 'AbortError') {
                userMessage = 'Request timeout. Please try again.';
            } else if (fetchError.message.includes('Failed to fetch')) {
                userMessage = 'Cannot connect to server. Please ensure backend is running.';
            }
            
            Toast.show(userMessage, 'error');
        }
        
    } catch (error) {
        console.error('Error in handleUpdateTeacher:', error);
        Toast.show(error.message || 'An unexpected error occurred', 'error');
    } finally {
        hideLoading();
        console.log('=== TEACHER UPDATE COMPLETED ===');
    }
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

function formatDate(dateString) {
    if (!dateString) return 'N/A';
    try {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-IN', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    } catch (e) {
        return dateString;
    }
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.remove('show');
    }
}

function exportTeachers() {
    Toast.show('Export functionality will be implemented soon', 'info');
}

function printTeacherDetails(id) {
    Toast.show('Print functionality will be implemented soon', 'info');
}

// Validation Functions
function validateEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

function validatePhone(phone) {
    const phoneRegex = /^\d{10}$/;
    return phoneRegex.test(phone);
}

function validateAadhar(aadhar) {
    const aadharRegex = /^\d{12}$/;
    return aadharRegex.test(aadhar);
}

function validatePAN(pan) {
    const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
    return panRegex.test(pan.toUpperCase());
}

// Name validation (only letters and spaces)
function validateName(name, fieldName) {
    if (!name || name.trim() === '') {
        return { valid: false, message: `${fieldName} is required` };
    }
    const nameRegex = /^[A-Za-z\s]+$/;
    if (!nameRegex.test(name)) {
        return { valid: false, message: `${fieldName} should only contain letters and spaces` };
    }
    if (name.length < 2) {
        return { valid: false, message: `${fieldName} must be at least 2 characters` };
    }
    if (name.length > 50) {
        return { valid: false, message: `${fieldName} cannot exceed 50 characters` };
    }
    return { valid: true, message: '' };
}

// Phone number validation (10 digits, only numbers)
function validatePhoneNumber(phone) {
    if (!phone || phone.trim() === '') {
        return { valid: false, message: 'Phone number is required' };
    }
    const phoneRegex = /^\d{10}$/;
    if (!phoneRegex.test(phone)) {
        return { valid: false, message: 'Phone number must be exactly 10 digits (0-9 only)' };
    }
    return { valid: true, message: '' };
}

// Emergency contact validation
function validateEmergencyContact(phone) {
    if (!phone || phone.trim() === '') {
        return { valid: false, message: 'Emergency contact number is required' };
    }
    const phoneRegex = /^\d{10}$/;
    if (!phoneRegex.test(phone)) {
        return { valid: false, message: 'Emergency contact must be exactly 10 digits (0-9 only)' };
    }
    return { valid: true, message: '' };
}

// Email validation
function validateEmailAddress(email) {
    if (!email || email.trim() === '') {
        return { valid: false, message: 'Email address is required' };
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        return { valid: false, message: 'Enter a valid email address (e.g., name@domain.com)' };
    }
    if (email.length > 100) {
        return { valid: false, message: 'Email cannot exceed 100 characters' };
    }
    return { valid: true, message: '' };
}

// Aadhar validation (12 digits, only numbers)
function validateAadharNumber(aadhar) {
    if (!aadhar || aadhar.trim() === '') {
        return { valid: false, message: 'Aadhar number is required' };
    }
    const aadharRegex = /^\d{12}$/;
    if (!aadharRegex.test(aadhar)) {
        return { valid: false, message: 'Aadhar number must be exactly 12 digits (0-9 only)' };
    }
    return { valid: true, message: '' };
}

// PAN validation
function validatePANNumber(pan) {
    if (!pan || pan.trim() === '') {
        return { valid: false, message: 'PAN number is required' };
    }
    const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
    if (!panRegex.test(pan.toUpperCase())) {
        return { valid: false, message: 'PAN must be in format: ABCDE1234F (5 letters, 4 digits, 1 letter)' };
    }
    return { valid: true, message: '' };
}


// Number field validation (positive numbers only)
function validateNumberField(value, fieldName, min = 0, max = null) {
    if (value === '' || value === null || value === undefined) {
        return { valid: false, message: `${fieldName} is required` };
    }
    const num = parseFloat(value);
    if (isNaN(num)) {
        return { valid: false, message: `${fieldName} must be a valid number` };
    }
    if (num < min) {
        return { valid: false, message: `${fieldName} cannot be less than ${min}` };
    }
    if (max !== null && num > max) {
        return { valid: false, message: `${fieldName} cannot exceed ${max}` };
    }
    return { valid: true, message: '' };
}

// Employee ID validation
function validateEmployeeId(empId) {
    if (!empId || empId.trim() === '') {
        return { valid: false, message: 'Employee ID is required' };
    }
    const empIdRegex = /^[A-Za-z0-9]{4,20}$/;
    if (!empIdRegex.test(empId)) {
        return { valid: false, message: 'Employee ID should be 4-20 alphanumeric characters' };
    }
    return { valid: true, message: '' };
}

// Password validation
function validatePassword(password) {
    if (!password || password.trim() === '') {
        return { valid: false, message: 'Password is required' };
    }
    if (password.length < 6) {
        return { valid: false, message: 'Password must be at least 6 characters' };
    }
    if (password.length > 20) {
        return { valid: false, message: 'Password cannot exceed 20 characters' };
    }
    return { valid: true, message: '' };
}

// Date validation (not future date)
function validateDate(dateString, fieldName) {
    if (!dateString || dateString.trim() === '') {
        return { valid: false, message: `${fieldName} is required` };
    }
    const date = new Date(dateString);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (isNaN(date.getTime())) {
        return { valid: false, message: `${fieldName} is invalid` };
    }
    
    if (fieldName === 'Date of Birth' && date > today) {
        return { valid: false, message: 'Date of Birth cannot be in the future' };
    }
    
    if (fieldName === 'Joining Date' && date > today) {
        return { valid: false, message: 'Joining Date cannot be in the future' };
    }
    
    return { valid: true, message: '' };
}

// Generic function to show error message
function showFieldError(elementId, message) {
    const element = document.getElementById(elementId);
    if (!element) return;
    
    element.classList.add('error');
    element.classList.remove('valid');
    
    // Check if error message element exists, if not create it
    let errorSpan = element.parentElement.querySelector('.error-message');
    if (!errorSpan) {
        errorSpan = document.createElement('div');
        errorSpan.className = 'error-message';
        element.parentElement.appendChild(errorSpan);
    }
    errorSpan.textContent = message;
    errorSpan.classList.add('show');
}

function showFieldValid(elementId) {
    const element = document.getElementById(elementId);
    if (!element) return;
    
    element.classList.remove('error');
    element.classList.add('valid');
    
    const errorSpan = element.parentElement.querySelector('.error-message');
    if (errorSpan) {
        errorSpan.classList.remove('show');
    }
}

function clearFieldValidation(elementId) {
    const element = document.getElementById(elementId);
    if (!element) return;
    
    element.classList.remove('error', 'valid');
    const errorSpan = element.parentElement.querySelector('.error-message');
    if (errorSpan) {
        errorSpan.classList.remove('show');
    }
}

// Loading Functions
function showLoading() {
    const loadingOverlay = document.getElementById('loadingOverlay');
    if (loadingOverlay) {
        loadingOverlay.classList.remove('hidden');
        appState.loading = true;
    }
}

function hideLoading() {
    const loadingOverlay = document.getElementById('loadingOverlay');
    if (loadingOverlay) {
        loadingOverlay.classList.add('hidden');
        appState.loading = false;
    }
}

// Toast Notification System
class Toast {
    static show(message, type = 'success', duration = 3000) {
        const toast = document.createElement('div');
        const bgColor = {
            success: 'bg-green-500',
            error: 'bg-red-500',
            warning: 'bg-yellow-500',
            info: 'bg-blue-500'
        }[type];
        
        const icon = {
            success: 'fa-check-circle',
            error: 'fa-exclamation-circle',
            warning: 'fa-exclamation-triangle',
            info: 'fa-info-circle'
        }[type];
        
        toast.className = `toast ${bgColor} text-white flex items-center space-x-3`;
        toast.innerHTML = `
            <i class="fas ${icon} text-xl"></i>
            <span>${message}</span>
        `;
        
        const container = document.getElementById('toastContainer');
        if (!container) return;
        
        container.appendChild(toast);
        
        setTimeout(() => toast.classList.add('show'), 10);
        
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 300);
        }, duration);
    }
}

// Sample data generator (fallback)
function generateSampleTeachers() {
    return [
        {
            id: 1,
            teacherCode: 'TCH1001',
            firstName: 'Rajesh',
            middleName: '',
            lastName: 'Sharma',
            dob: '1985-05-15',
            gender: 'Male',
            bloodGroup: 'A+',
            address: '123 Main Street, Pimpri, Pune, Maharashtra - 411017',
            city: 'Pune',
            state: 'Maharashtra',
            pincode: '411017',
            contactNumber: '9876543210',
            email: 'rajesh.sharma@school.com',
            emergencyContactName: 'Mrs. Sharma',
            emergencyContactNumber: '9876543211',
            aadharNumber: '123456789012',
            panNumber: 'ABCDE1234F',
            medicalInfo: 'No known allergies',
            joiningDate: '2020-06-01',
            designation: 'Senior Teacher',
            totalExperience: 15,
            department: 'Mathematics',
            employmentType: 'Full Time',
            employeeId: 'EMP001',
            previousExperience: [
                { school: 'ABC School', position: 'Teacher', duration: 5 },
                { school: 'XYZ School', position: 'Senior Teacher', duration: 8 }
            ],
            qualifications: [
                { degree: 'Master', specialization: 'Mathematics', university: 'University of Pune', completionYear: 2010 },
                { degree: 'B.Ed.', specialization: 'Education', university: 'University of Mumbai', completionYear: 2012 }
            ],
            primarySubject: 'Mathematics',
            additionalSubjects: ['Mathematics', 'Physics'],
            classes: ['9', '10'],
            basicSalary: 35000,
            hra: 7000,
            da: 5000,
            ta: 3000,
            grossSalary: 52000,
            bankName: 'State Bank of India',
            accountNumber: '12345678901234',
            ifscCode: 'SBIN0001234',
            branchName: 'Pimpri Branch',
            status: 'Active'
        }
    ];
}


// ============================================================================
// EXPORT FUNCTIONS - CSV AND PDF
// ============================================================================

// Reset Filters Function
function resetFilters() {
    // Clear search input
    const searchInput = document.getElementById('searchTeacher');
    if (searchInput) searchInput.value = '';
    
    // Reset subject filter
    const subjectFilter = document.getElementById('filterSubject');
    if (subjectFilter) subjectFilter.value = '';
    
    // Reset qualification filter
    const qualificationFilter = document.getElementById('filterQualification');
    if (qualificationFilter) qualificationFilter.value = '';
    
    // Reset status filter
    const statusFilter = document.getElementById('filterStatus');
    if (statusFilter) statusFilter.value = '';
    
    // Trigger filter to refresh the table
    filterTeachers();
    
    Toast.show('All filters have been reset', 'success');
}

// Export to CSV
function exportToCSV() {
    try {
        showLoading();
        
        const teachers = getFilteredTeachers();
        
        if (teachers.length === 0) {
            Toast.show('No teachers to export', 'warning');
            return;
        }
        
        // Define CSV headers
        const headers = [
            'Teacher ID',
            'Full Name',
            'Designation',
            'Department',
            'Primary Subject',
            'Classes',
            'Contact Number',
            'Email',
            'Status',
            'Experience (Years)',
            'Joining Date',
            'Basic Salary',
            'Gross Salary',
            'Blood Group',
            'Aadhar Number',
            'PAN Number'
        ];
        
        // Prepare CSV rows
        const rows = teachers.map(teacher => {
            const fullName = `${teacher.firstName || ''} ${teacher.middleName || ''} ${teacher.lastName || ''}`.trim();
            const classes = Array.isArray(teacher.classes) ? teacher.classes.map(c => `Class ${c}`).join(', ') : 'Not Assigned';
            
            return [
                teacher.teacherCode || teacher.employeeId || `TCH${teacher.id}`,
                fullName,
                teacher.designation || 'Teacher',
                teacher.department || 'N/A',
                teacher.primarySubject || 'Not Assigned',
                classes,
                teacher.contactNumber || 'N/A',
                teacher.email || 'N/A',
                teacher.status || 'Active',
                teacher.totalExperience || 0,
                teacher.joiningDate || 'N/A',
                teacher.basicSalary || 0,
                teacher.grossSalary || 0,
                teacher.bloodGroup || 'N/A',
                teacher.aadharNumber || 'N/A',
                teacher.panNumber || 'N/A'
            ];
        });
        
        // Convert to CSV string
        const csvContent = [
            headers.join(','),
            ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
        ].join('\n');
        
        // Add BOM for UTF-8 support
        const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
        
        // Create download link
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `teachers_export_${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        
        Toast.show(`Exported ${teachers.length} teachers to CSV`, 'success');
        
    } catch (error) {
        console.error('Error exporting to CSV:', error);
        Toast.show('Error exporting to CSV', 'error');
    } finally {
        hideLoading();
    }
}

// Export to PDF
function exportToPDF() {
    try {
        showLoading();
        
        const teachers = getFilteredTeachers();
        
        if (teachers.length === 0) {
            Toast.show('No teachers to export', 'warning');
            return;
        }
        
        // Create a new window for PDF content
        const printWindow = window.open('', '_blank');
        
        if (!printWindow) {
            Toast.show('Please allow popups to export PDF', 'error');
            return;
        }
        
        // Generate HTML content for PDF
        const htmlContent = generatePDFHTML(teachers);
        
        printWindow.document.write(htmlContent);
        printWindow.document.close();
        
        printWindow.onload = function() {
            printWindow.print();
            // Close window after printing or user cancels
            setTimeout(() => {
                printWindow.close();
            }, 1000);
        };
        
        Toast.show(`Preparing PDF with ${teachers.length} teachers...`, 'info');
        
    } catch (error) {
        console.error('Error exporting to PDF:', error);
        Toast.show('Error exporting to PDF', 'error');
    } finally {
        hideLoading();
    }
}

// Generate HTML for PDF export
function generatePDFHTML(teachers) {
    const currentDate = new Date().toLocaleString();
    const totalTeachers = teachers.length;
    const activeTeachers = teachers.filter(t => t.status === 'Active').length;
    const totalExperience = teachers.reduce((sum, t) => sum + (t.totalExperience || 0), 0);
    const avgExperience = totalTeachers > 0 ? Math.round(totalExperience / totalTeachers) : 0;
    
    // Generate table rows
    let tableRows = '';
    teachers.forEach((teacher, index) => {
        const fullName = `${teacher.firstName || ''} ${teacher.middleName || ''} ${teacher.lastName || ''}`.trim();
        const classes = Array.isArray(teacher.classes) ? teacher.classes.map(c => `Class ${c}`).join(', ') : 'Not Assigned';
        const statusBadge = teacher.status === 'Active' ? 'Active' : (teacher.status === 'On Leave' ? 'On Leave' : 'Inactive');
        const statusColor = teacher.status === 'Active' ? '#10b981' : (teacher.status === 'On Leave' ? '#f59e0b' : '#6b7280');
        
        tableRows += `
            <tr style="border-bottom: 1px solid #e5e7eb;">
                <td style="padding: 8px; text-align: left;">${teacher.teacherCode || teacher.employeeId || `TCH${teacher.id}`}</td>
                <td style="padding: 8px; text-align: left;">${fullName}</td>
                <td style="padding: 8px; text-align: left;">${teacher.designation || 'Teacher'}</td>
                <td style="padding: 8px; text-align: left;">${teacher.department || 'N/A'}</td>
                <td style="padding: 8px; text-align: left;">${teacher.primarySubject || 'Not Assigned'}</td>
                <td style="padding: 8px; text-align: left;">${classes}</td>
                <td style="padding: 8px; text-align: left;">${teacher.contactNumber || 'N/A'}</td>
                <td style="padding: 8px; text-align: left;">${teacher.email || 'N/A'}</td>
                <td style="padding: 8px; text-align: left;">
                    <span style="color: ${statusColor}; font-weight: 500;">${statusBadge}</span>
                </td>
                <td style="padding: 8px; text-align: left;">${teacher.totalExperience || 0} yrs</td>
            </tr>
        `;
    });
    
    return `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <title>Teachers Export Report</title>
            <style>
                @media print {
                    @page {
                        size: landscape;
                        margin: 1cm;
                    }
                    body {
                        -webkit-print-color-adjust: exact;
                        print-color-adjust: exact;
                    }
                    .no-break {
                        break-inside: avoid;
                    }
                    table {
                        break-inside: avoid;
                    }
                    tr {
                        break-inside: avoid;
                    }
                }
                
                body {
                    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                    margin: 0;
                    padding: 20px;
                    color: #333;
                }
                
                .header {
                    text-align: center;
                    margin-bottom: 20px;
                    padding-bottom: 10px;
                    border-bottom: 3px solid #3b5bdb;
                }
                
                .title {
                    font-size: 24px;
                    font-weight: bold;
                    color: #3b5bdb;
                    margin-bottom: 5px;
                }
                
                .subtitle {
                    font-size: 14px;
                    color: #666;
                }
                
                .stats-container {
                    display: flex;
                    justify-content: space-between;
                    margin-bottom: 20px;
                    gap: 15px;
                }
                
                .stat-card {
                    flex: 1;
                    background: #f9fafb;
                    border: 1px solid #e5e7eb;
                    border-radius: 8px;
                    padding: 12px;
                    text-align: center;
                }
                
                .stat-label {
                    font-size: 12px;
                    color: #6b7280;
                    text-transform: uppercase;
                    letter-spacing: 0.05em;
                }
                
                .stat-value {
                    font-size: 24px;
                    font-weight: bold;
                    color: #3b5bdb;
                    margin-top: 5px;
                }
                
                table {
                    width: 100%;
                    border-collapse: collapse;
                    font-size: 11px;
                }
                
                th {
                    background: #3b5bdb;
                    color: white;
                    padding: 10px 8px;
                    text-align: left;
                    font-weight: 600;
                }
                
                td {
                    padding: 8px;
                    border-bottom: 1px solid #e5e7eb;
                }
                
                .footer {
                    margin-top: 20px;
                    text-align: center;
                    font-size: 10px;
                    color: #999;
                    border-top: 1px solid #e5e7eb;
                    padding-top: 10px;
                }
                
                .generated-date {
                    font-size: 10px;
                    color: #999;
                    text-align: right;
                    margin-bottom: 10px;
                }
            </style>
        </head>
        <body>
            <div class="header">
                <div class="title">Teacher Management Report</div>
                <div class="subtitle">Complete Teacher Details Export</div>
            </div>
            
            <div class="generated-date">
                Generated on: ${currentDate}
            </div>
            
            <div class="stats-container">
                <div class="stat-card">
                    <div class="stat-label">Total Teachers</div>
                    <div class="stat-value">${totalTeachers}</div>
                </div>
                <div class="stat-card">
                    <div class="stat-label">Active Teachers</div>
                    <div class="stat-value">${activeTeachers}</div>
                </div>
                <div class="stat-card">
                    <div class="stat-label">Avg Experience</div>
                    <div class="stat-value">${avgExperience} yrs</div>
                </div>
                <div class="stat-card">
                    <div class="stat-label">Subjects Covered</div>
                    <div class="stat-value">${new Set(teachers.map(t => t.primarySubject).filter(s => s)).size}</div>
                </div>
            </div>
            
            <table>
                <thead>
                    <tr>
                        <th>Teacher ID</th>
                        <th>Full Name</th>
                        <th>Designation</th>
                        <th>Department</th>
                        <th>Primary Subject</th>
                        <th>Classes</th>
                        <th>Contact</th>
                        <th>Email</th>
                        <th>Status</th>
                        <th>Experience</th>
                    </tr>
                </thead>
                <tbody>
                    ${tableRows}
                </tbody>
            </table>
            
            <div class="footer">
                <p>This is a system-generated report. For any queries, please contact the school administration.</p>
                <p>© ${new Date().getFullYear()} School Portal - Teacher Management System</p>
            </div>
        </body>
        </html>
    `;
}

// Add event listener for reset filters button
function setupResetFiltersButton() {
    const resetBtn = document.getElementById('resetFiltersBtn');
    if (resetBtn) {
        resetBtn.addEventListener('click', resetFilters);
        console.log('Reset filters button initialized');
    }
}

// Setup export dropdown
function setupExportDropdown() {
    const exportBtn = document.getElementById('exportDropdownBtn');
    const exportDropdown = document.getElementById('exportDropdown');
    
    if (exportBtn && exportDropdown) {
        exportBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            exportDropdown.classList.toggle('hidden');
        });
        
        // Close dropdown when clicking outside
        document.addEventListener('click', (e) => {
            if (!exportBtn.contains(e.target) && !exportDropdown.contains(e.target)) {
                exportDropdown.classList.add('hidden');
            }
        });
    }
}

// ============================================================================
// EXPORT FUNCTIONS FOR HTML
// ============================================================================

// Export functions that are called from HTML onclick attributes
window.switchTab = switchTab;
window.previewTeacherPhoto = previewTeacherPhoto;
window.removeDocument = removeDocument;
window.addExperienceEntry = addExperienceEntry;
window.removeExperienceEntry = removeExperienceEntry;
window.addQualificationEntry = addQualificationEntry;
window.removeQualificationEntry = removeQualificationEntry;
window.calculateTotalSalary = calculateTotalSalary;
window.addAdditionalAllowance = addAdditionalAllowance;
window.removeAdditionalAllowance = removeAdditionalAllowance;
window.handleAddTeacher = handleAddTeacher;
window.resetForm = resetForm;
window.exportTeachers = exportTeachers;
window.exportToCSV = exportToCSV;
window.exportToPDF = exportToPDF;
window.resetFilters = resetFilters;
window.previousPage = previousPage;
window.nextPage = nextPage;
window.viewTeacher = viewTeacher;
window.editTeacher = editTeacher;
window.deleteTeacher = deleteTeacher;
window.closeModal = closeModal;
window.printTeacherDetails = printTeacherDetails;
window.handleLogout = handleLogout;

console.log('Teacher Management JS loaded successfully');