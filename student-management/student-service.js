// ============================================================
//  student-service.js  —  COMPLETE OPTIMIZED VERSION
//  Dynamic: Classes, Subjects, Teachers, Academic Year
//  Notifications: Toastify.js
//  Backend: http://localhost:8084
// ============================================================

const BASE_URL = 'http://localhost:8084';

// ─────────────────────────────────────────────────────────────
//  GLOBAL STATE
// ─────────────────────────────────────────────────────────────
let currentPage         = 0;
let totalPages          = 0;
let totalElements       = 0;
const PAGE_SIZE         = 10;
let editingStudentId    = null;
let otherSports         = [];
let otherSubjects       = [];
let transactionVerified = false;
let qrCodeGenerated     = false;
let searchDebounce;


let allClassesData      = [];

// ============================================================
// ADD THIS NEW SECTION HERE - MANDATORY FIELDS DEFINITION
// ============================================================
const MANDATORY_FIELDS = {
    personal: [
        { id: 'firstName', name: 'First Name', type: 'input', selector: 'input[name="firstName"]' },
        { id: 'lastName', name: 'Last Name', type: 'input', selector: 'input[name="lastName"]' },
        { id: 'dob', name: 'Date of Birth', type: 'input', selector: 'input[name="dob"]' },
        { id: 'gender', name: 'Gender', type: 'select', selector: 'select[name="gender"]' },
        { id: 'studentId', name: 'Student ID', type: 'input', selector: '#studentId' },
        { id: 'studentPassword', name: 'Password', type: 'input', selector: '#studentPassword', condition: () => !editingStudentId },
        { id: 'confirmStudentPassword', name: 'Confirm Password', type: 'input', selector: '#confirmStudentPassword', condition: () => !editingStudentId },
        { id: 'localAddressLine1', name: 'Address Line 1', type: 'input', selector: 'input[name="localAddressLine1"]' },
        { id: 'localCity', name: 'City', type: 'input', selector: 'input[name="localCity"]' },
        { id: 'localState', name: 'State', type: 'input', selector: 'input[name="localState"]' },
        { id: 'localPincode', name: 'Pincode', type: 'input', selector: 'input[name="localPincode"]' }
    ],
    academic: [
        { id: 'formClassSelect', name: 'Class', type: 'select', selector: '#formClassSelect' },
        { id: 'formSectionSelect', name: 'Section', type: 'select', selector: '#formSectionSelect' },
        { id: 'admissionDate', name: 'Admission Date', type: 'input', selector: 'input[name="admissionDate"]' },
        { id: 'academicYearDropdown', name: 'Academic Year', type: 'select', selector: '#academicYearDropdown' }
    ],
    parent: [
        { id: 'fatherName', name: "Father's Name", type: 'input', selector: 'input[name="fatherName"]' },
        { id: 'fatherContact', name: "Father's Contact", type: 'input', selector: 'input[name="fatherContact"]' },
        { id: 'parentEmail', name: 'Email Address', type: 'input', selector: 'input[name="parentEmail"]' },
        { id: 'emergencyContactName', name: 'Emergency Contact Name', type: 'input', selector: 'input[name="emergencyContactName"]' },
        { id: 'emergencyContactNumber', name: 'Emergency Contact Number', type: 'input', selector: 'input[name="emergencyContactNumber"]' }
    ],
    fees: [
        { id: 'admissionFees', name: 'Admission Fees', type: 'input', selector: '#admissionFees' },
        { id: 'tuitionFees', name: 'Tuition Fees', type: 'input', selector: '#tuitionFees' },
        { id: 'initialPayment', name: 'Initial Payment', type: 'input', selector: '#initialPayment' }
    ]
};


// ─────────────────────────────────────────────────────────────
//  AUTH HELPER
// ─────────────────────────────────────────────────────────────
const getAuthHeaders = () => ({
    Authorization: `Bearer ${localStorage.getItem('admin_jwt_token')}`
});

// ─────────────────────────────────────────────────────────────
//  TOASTIFY — Smart Notifications
// ─────────────────────────────────────────────────────────────
const TOAST_STYLES = {
    success: { background: 'linear-gradient(135deg,#10b981,#059669)', icon: '✅' },
    error:   { background: 'linear-gradient(135deg,#ef4444,#dc2626)', icon: '❌' },
    warning: { background: 'linear-gradient(135deg,#f59e0b,#d97706)', icon: '⚠️' },
    info:    { background: 'linear-gradient(135deg,#3b82f6,#2563eb)', icon: 'ℹ️' },
};


// ============================================================
// ADD THESE NEW VALIDATION FUNCTIONS AFTER YOUR EXISTING ONES
// ============================================================

function validateSectionFields(sectionName) {
    const fields = MANDATORY_FIELDS[sectionName];
    if (!fields) return true;
    
    let isValid = true;
    let firstInvalidField = null;
    let errorMessages = [];
    
    for (const field of fields) {
        if (field.condition && !field.condition()) {
            continue;
        }
        
        let element = document.getElementById(field.id);
        if (!element) {
            element = document.querySelector(field.selector);
        }
        
        if (!element) {
            console.warn(`Field not found: ${field.id}`);
            continue;
        }
        
        let value = '';
        if (element.type === 'checkbox') {
            value = element.checked ? element.value : '';
        } else if (element.type === 'radio') {
            const checkedRadio = document.querySelector(`${field.selector}:checked`);
            value = checkedRadio ? checkedRadio.value : '';
        } else {
            value = element.value ? element.value.trim() : '';
        }
        
        if (!value) {
            isValid = false;
            errorMessages.push(`${field.name} is required`);
            showFieldError(field.id, `${field.name} is required`);
            
            if (!firstInvalidField) {
                firstInvalidField = element;
            }
        } else {
            let validationResult = null;
            
            switch(field.id) {
                case 'firstName':
                case 'lastName':
                case 'fatherName':
                case 'motherName':
                case 'emergencyContactName':
                    validationResult = validateName(value, field.name);
                    break;
                case 'fatherContact':
                case 'emergencyContactNumber':
                    validationResult = validatePhoneNumber(value, field.name);
                    break;
                case 'parentEmail':
                    validationResult = validateEmailAddress(value);
                    break;
                case 'studentId':
                    validationResult = validateStudentId(value);
                    break;
                case 'dob':
                    validationResult = validateDate(value, 'Date of Birth');
                    break;
                case 'admissionDate':
                    validationResult = validateDate(value, 'Admission Date');
                    break;
                case 'localPincode':
                    validationResult = validatePincode(value, 'Pincode');
                    break;
                case 'admissionFees':
                case 'tuitionFees':
                case 'initialPayment':
                    validationResult = validateNumberField(value, field.name, 0);
                    break;
            }
            
            if (validationResult && !validationResult.valid) {
                isValid = false;
                errorMessages.push(validationResult.message);
                showFieldError(field.id, validationResult.message);
                
                if (!firstInvalidField) {
                    firstInvalidField = element;
                }
            } else {
                showFieldValid(field.id);
            }
        }
    }
    
    if (!isValid) {
        const errorMessage = errorMessages.length === 1 
            ? errorMessages[0] 
            : `Please fill all required fields in ${getSectionDisplayName(sectionName)} section`;
        
        toastError(errorMessage);
        
        if (firstInvalidField) {
            firstInvalidField.focus();
            firstInvalidField.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
        
        return false;
    }
    
    return true;
}

function getSectionDisplayName(sectionName) {
    const names = {
        personal: 'Personal Details',
        academic: 'Academic Details',
        parent: 'Parent Details',
        documents: 'Documents Upload',
        fees: 'Fees Details'
    };
    return names[sectionName] || sectionName;
}

function validateAllSections() {
    const sections = ['personal', 'academic', 'parent'];
    
    for (const section of sections) {
        const isValid = validateSectionFields(section);
        if (!isValid) {
            switchTab(section);
            toastError(`Please complete ${getSectionDisplayName(section)} section first`);
            return false;
        }
    }
    
    return true;
}

function setupRealTimeMandatoryValidation() {
    const allMandatoryFields = [
        ...MANDATORY_FIELDS.personal,
        ...MANDATORY_FIELDS.academic,
        ...MANDATORY_FIELDS.parent,
        ...MANDATORY_FIELDS.fees
    ];
    
    allMandatoryFields.forEach(field => {
        if (field.condition && !field.condition()) {
            return;
        }
        
        let element = document.getElementById(field.id);
        if (!element) {
            element = document.querySelector(field.selector);
        }
        
        if (element) {
            const eventType = element.type === 'select-one' ? 'change' : 'input';
            
            element.addEventListener(eventType, function() {
                const value = this.value ? this.value.trim() : '';
                
                if (value) {
                    let validationResult = null;
                    
                    switch(field.id) {
                        case 'firstName':
                        case 'lastName':
                        case 'fatherName':
                        case 'motherName':
                        case 'emergencyContactName':
                            validationResult = validateName(value, field.name);
                            break;
                        case 'fatherContact':
                        case 'emergencyContactNumber':
                            validationResult = validatePhoneNumber(value, field.name);
                            break;
                        case 'parentEmail':
                            validationResult = validateEmailAddress(value);
                            break;
                        case 'studentId':
                            validationResult = validateStudentId(value);
                            break;
                        case 'dob':
                        case 'admissionDate':
                            validationResult = validateDate(value, field.id === 'dob' ? 'Date of Birth' : 'Admission Date');
                            break;
                        case 'localPincode':
                            validationResult = validatePincode(value, 'Pincode');
                            break;
                        case 'admissionFees':
                        case 'tuitionFees':
                        case 'initialPayment':
                            validationResult = validateNumberField(value, field.name, 0);
                            break;
                    }
                    
                    if (validationResult && validationResult.valid) {
                        showFieldValid(field.id);
                    } else if (validationResult && !validationResult.valid) {
                        showFieldError(field.id, validationResult.message);
                    } else {
                        showFieldValid(field.id);
                    }
                } else {
                    clearFieldValidation(field.id);
                }
            });
        }
    });
}

// ============================================================
// VALIDATION FUNCTIONS - Student Management
// ============================================================

// Name validation (only letters and spaces)
function validateName(value, fieldName, options = {}) {
    const { required = true, allowSpecial = false } = options;

    // Trim and normalize spaces
    value = value ? value.trim().replace(/\s+/g, ' ') : '';

    // Required check
    if (!value) {
        return required
            ? { valid: false, message: `${fieldName} is required` }
            : { valid: true, message: '' };
    }

    // Regex rules
    const regex = allowSpecial
        ? /^[A-Za-z\s.\-']+$/   // allows: . - '
        : /^[A-Za-z\s]+$/;

    if (!regex.test(value)) {
        return {
            valid: false,
            message: allowSpecial
                ? `${fieldName} can only contain letters, spaces, dots (.), hyphens (-), and apostrophes (')`
                : `${fieldName} can only contain letters and spaces`
        };
    }

    // Length validation
    if (value.length < 2) {
        return { valid: false, message: `${fieldName} must be at least 2 characters` };
    }

    if (value.length > 50) {
        return { valid: false, message: `${fieldName} cannot exceed 50 characters` };
    }

    // Prevent single-letter words (optional strict rule)
    const words = value.split(' ');
    if (words.some(w => w.length === 1)) {
        return { valid: false, message: `${fieldName} contains incomplete words` };
    }

    return { valid: true, message: '', cleanedValue: value };
}

function validateField(value, validator, fieldId, errors, options = {}) {
    const { updateValue = true, focusOnError = true } = options;

    const field = document.getElementById(fieldId);

    // Safety check
    if (!field) {
        console.warn(`Field not found: ${fieldId}`);
        return false;
    }

    const result = validator(value);

    if (!result.valid) {

        // Avoid duplicate errors
        if (!errors.includes(result.message)) {
            errors.push(result.message);
        }

        showFieldError(fieldId, result.message);

        // Focus first error field
        if (focusOnError && errors.length === 1) {
            field.focus();
            field.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }

        return false;
    }

    // ✅ Apply cleaned value if available
    if (updateValue && result.cleanedValue !== undefined) {
        field.value = result.cleanedValue;
    }

    showFieldValid(fieldId);
    return true;
}

// Phone number validation (10 digits, only numbers)
function validatePhoneNumber(phone, fieldName = 'Phone number', options = {}) {
    const { required = true, allowCountryCode = true } = options;

    // Normalize input
    phone = phone ? phone.trim().replace(/\s+/g, '') : '';

    if (!phone) {
        return required
            ? { valid: false, message: `${fieldName} is required` }
            : { valid: true, message: '' };
    }

    // Remove +91 if allowed
    if (allowCountryCode && phone.startsWith('+91')) {
        phone = phone.slice(3);
    }

    // Remove leading 0 (optional handling)
    if (phone.startsWith('0')) {
        phone = phone.slice(1);
    }

    // Validate 10-digit Indian mobile numbers
    const phoneRegex = /^[6-9]\d{9}$/;

    if (!phoneRegex.test(phone)) {
        return {
            valid: false,
            message: `${fieldName} must be a valid 10-digit mobile number (starts with 6-9)`
        };
    }

    return { valid: true, message: '', cleanedValue: phone };
}

function validateEmailAddress(email, options = {}) {
    const { required = true } = options;

    email = email ? email.trim().toLowerCase() : '';

    if (!email) {
        return required
            ? { valid: false, message: 'Email address is required' }
            : { valid: true, message: '' };
    }

    // Stronger regex
    const emailRegex = /^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/;

    if (!emailRegex.test(email)) {
        return {
            valid: false,
            message: 'Enter a valid email (e.g., name@example.com)'
        };
    }

    if (email.length > 100) {
        return {
            valid: false,
            message: 'Email cannot exceed 100 characters'
        };
    }

    // Prevent suspicious patterns
    if (email.includes('..') || email.startsWith('.') || email.endsWith('.')) {
        return {
            valid: false,
            message: 'Invalid email format'
        };
    }

    return { valid: true, message: '', cleanedValue: email };
}

function validateAadharNumber(aadhar, fieldName = 'Aadhar number', required = false) {

    // Normalize
    aadhar = aadhar ? aadhar.replace(/\s+/g, '') : '';

    if (!aadhar) {
        return required
            ? { valid: false, message: `${fieldName} is required` }
            : { valid: true, message: '' };
    }

    // Must be 12 digits
    if (!/^\d{12}$/.test(aadhar)) {
        return { valid: false, message: `${fieldName} must be exactly 12 digits` };
    }

    // ❌ Reject obvious fake numbers
    if (/^(\d)\1{11}$/.test(aadhar)) {
        return { valid: false, message: 'Invalid Aadhar number (repeating digits)' };
    }

    // ✅ Verhoeff Algorithm (UIDAI checksum)
    if (!validateVerhoeff(aadhar)) {
        return { valid: false, message: 'Invalid Aadhar number (checksum failed)' };
    }

    return { valid: true, message: '', cleanedValue: aadhar };
}

function validateRollNumber(rollNumber, required = false) {

    // Normalize
    rollNumber = rollNumber ? rollNumber.trim().toUpperCase() : '';

    if (!rollNumber) {
        return required
            ? { valid: false, message: 'Roll number is required' }
            : { valid: true, message: '' };
    }

    // Allowed characters
    const rollRegex = /^[A-Z0-9\-_]+$/;

    if (!rollRegex.test(rollNumber)) {
        return {
            valid: false,
            message: 'Roll number can only contain letters, numbers, hyphens (-), and underscores (_)'
        };
    }

    // Length checks
    if (rollNumber.length < 2) {
        return { valid: false, message: 'Roll number too short' };
    }

    if (rollNumber.length > 20) {
        return { valid: false, message: 'Roll number cannot exceed 20 characters' };
    }

    // ❌ Prevent weird patterns
    if (/^[-_]+$/.test(rollNumber)) {
        return { valid: false, message: 'Invalid roll number format' };
    }

    return { valid: true, message: '', cleanedValue: rollNumber };
}

// Student ID validation
function validateStudentId(studentId, required = true) {
    if (!studentId || studentId.trim() === '') {
        return required ? { valid: false, message: 'Student ID is required' } : { valid: true, message: '' };
    }
    const idRegex = /^[A-Za-z0-9\-_]+$/;
    if (!idRegex.test(studentId)) {
        return { valid: false, message: 'Student ID can only contain letters, numbers, hyphens, and underscores' };
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
    
    if (fieldName === 'Admission Date' && date > today) {
        return { valid: false, message: 'Admission Date cannot be in the future' };
    }
    
    // Check if student is at least 3 years old (for DOB)
    if (fieldName === 'Date of Birth') {
        const minDate = new Date();
        minDate.setFullYear(minDate.getFullYear() - 3);
        if (date > minDate) {
            return { valid: false, message: 'Student must be at least 3 years old' };
        }
        
        // Max age check (optional, 20 years)
        const maxDate = new Date();
        maxDate.setFullYear(maxDate.getFullYear() - 20);
        if (date < maxDate) {
            return { valid: false, message: 'Student age seems too high. Please verify date of birth' };
        }
    }
    
    return { valid: true, message: '' };
}

function validateRequiredFields(fields) {
    let errors = [];

    fields.forEach(field => {
        const element = document.querySelector(`[name="${field.name}"]`) || document.getElementById(field.id);
        const value = element?.value?.trim();

        if (!value) {
            errors.push(field.label + ' is required');
            showFieldError(field.id || field.name, field.label + ' is required');
        } else {
            showFieldValid(field.id || field.name);
        }
    });

    return errors;
}

function validatePersonalSection() {
    const requiredFields = [
        { name: 'firstName', label: 'First Name' },
        { name: 'lastName', label: 'Last Name' },
        { name: 'dob', label: 'Date of Birth' },
        { name: 'gender', label: 'Gender' },
        { id: 'studentId', label: 'Student ID' },
        { id: 'studentPassword', label: 'Password' },
        { id: 'confirmStudentPassword', label: 'Confirm Password' }
    ];

    let errors = validateRequiredFields(requiredFields);

    // Password match check
    const pass = document.getElementById('studentPassword').value;
    const confirm = document.getElementById('confirmStudentPassword').value;

    if (pass && confirm && pass !== confirm) {
        errors.push('Passwords do not match');
        showFieldError('confirmStudentPassword', 'Passwords do not match');
    }

    return handleValidationResult(errors, 'Personal Details');
}

function validateParentSection() {
    const requiredFields = [
        { name: 'fatherName', label: "Father's Name" },
        { name: 'fatherContact', label: "Father's Contact" },
        { name: 'motherName', label: "Mother's Name" },
        { name: 'parentEmail', label: "Email Address" },
        { name: 'relationship', label: "Relationship" },
        { name: 'emergencyContactName', label: "Emergency Contact Name" },
        { name: 'emergencyContactNumber', label: "Emergency Contact Number" }
    ];

    let errors = validateRequiredFields(requiredFields);

    return handleValidationResult(errors, 'Parent Details');
}

// ============================================================
// ENHANCED VALIDATION FUNCTIONS WITH REAL-TIME RESTRICTIONS
// ============================================================

// Restrict input to only letters and spaces
function restrictToLetters(event) {
    const input = event.target;
    const originalValue = input.value;
    const sanitizedValue = originalValue.replace(/[^A-Za-z\s]/g, '');
    if (originalValue !== sanitizedValue) {
        input.value = sanitizedValue;
        showFieldError(input.id, 'Only letters and spaces allowed');
        setTimeout(() => {
            const errorSpan = input.parentElement?.querySelector('.error-message');
            if (errorSpan) errorSpan.classList.remove('show');
        }, 2000);
    }
}

// Restrict input to only numbers
function restrictToNumbers(event) {
    const input = event.target;
    const originalValue = input.value;
    const sanitizedValue = originalValue.replace(/[^0-9]/g, '');
    if (originalValue !== sanitizedValue) {
        input.value = sanitizedValue;
        showFieldError(input.id, 'Only numbers allowed');
        setTimeout(() => {
            const errorSpan = input.parentElement?.querySelector('.error-message');
            if (errorSpan) errorSpan.classList.remove('show');
        }, 2000);
    }
}

// Restrict input to alphanumeric with specific characters
function restrictToAlphanumeric(event, allowedChars = '-_') {
    const input = event.target;
    const originalValue = input.value;
    const regex = new RegExp(`[^A-Za-z0-9${allowedChars.replace(/[-\]]/g, '\\$&')}]`, 'g');
    const sanitizedValue = originalValue.replace(regex, '');
    if (originalValue !== sanitizedValue) {
        input.value = sanitizedValue;
        showFieldError(input.id, `Only letters, numbers, and ${allowedChars} allowed`);
        setTimeout(() => {
            const errorSpan = input.parentElement?.querySelector('.error-message');
            if (errorSpan) errorSpan.classList.remove('show');
        }, 2000);
    }
}

// Restrict Aadhar to exactly 12 digits
function restrictToAadhar(event) {
    const input = event.target;
    let value = input.value.replace(/[^0-9]/g, '');
    if (value.length > 12) {
        value = value.slice(0, 12);
    }
    input.value = value;
    
    if (value.length === 12) {
        const validation = validateAadharNumber(value, 'Aadhar Number');
        if (validation.valid) {
            showFieldValid(input.id);
        } else {
            showFieldError(input.id, validation.message);
        }
    } else if (value.length > 0 && value.length < 12) {
        showFieldError(input.id, 'Aadhar must be exactly 12 digits');
    } else {
        clearFieldValidation(input.id);
    }
}

// Restrict phone to exactly 10 digits
function restrictToPhone(event) {
    const input = event.target;
    let value = input.value.replace(/[^0-9]/g, '');
    if (value.length > 10) {
        value = value.slice(0, 10);
    }
    input.value = value;
    
    if (value.length === 10) {
        const validation = validatePhoneNumber(value, input.id === 'fatherContact' ? "Father's contact" : "Contact number");
        if (validation.valid) {
            showFieldValid(input.id);
        } else {
            showFieldError(input.id, validation.message);
        }
    } else if (value.length > 0 && value.length < 10) {
        showFieldError(input.id, 'Must be exactly 10 digits');
    } else {
        clearFieldValidation(input.id);
    }
}

// Restrict pincode to exactly 6 digits
function restrictToPincode(event) {
    const input = event.target;
    let value = input.value.replace(/[^0-9]/g, '');
    if (value.length > 6) {
        value = value.slice(0, 6);
    }
    input.value = value;
    
    if (value.length === 6) {
        const validation = validatePincode(value, 'Pincode');
        if (validation.valid) {
            showFieldValid(input.id);
        } else {
            showFieldError(input.id, validation.message);
        }
    } else if (value.length > 0 && value.length < 6) {
        showFieldError(input.id, 'Pincode must be exactly 6 digits');
    } else {
        clearFieldValidation(input.id);
    }
}

// ============================================================
// SECTION VALIDATION FUNCTIONS
// ============================================================

function validateCurrentSection() {
    const activeTab = document.querySelector('.tab-content.active');
    let isValid = true;
    let errorMessages = [];
    
    if (activeTab.id === 'personalTabContent') {
        isValid = validatePersonalTab(errorMessages);
    } else if (activeTab.id === 'academicTabContent') {
        isValid = validateAcademicTab(errorMessages);
    } else if (activeTab.id === 'parentTabContent') {
        isValid = validateParentTab(errorMessages);
    } else if (activeTab.id === 'documentsTabContent') {
        // Documents are optional, always valid
        isValid = true;
    } else if (activeTab.id === 'feesTabContent') {
        isValid = validateFeesTab(errorMessages);
    }
    
    if (!isValid && errorMessages.length > 0) {
        toastError(errorMessages[0]);
    }
    
    return isValid;
}

function validatePersonalTab(errorMessages) {
    let isValid = true;
    
    // First Name
    const firstName = document.querySelector('input[name="firstName"]');
    if (firstName && !firstName.value.trim()) {
        isValid = false;
        errorMessages.push('First Name is required');
        showFieldError('firstName', 'First Name is required');
        firstName.focus();
        firstName.scrollIntoView({ behavior: 'smooth', block: 'center' });
        return false;
    } else if (firstName && firstName.value.trim().length < 2) {
        isValid = false;
        errorMessages.push('First Name must be at least 2 characters');
        showFieldError('firstName', 'First Name must be at least 2 characters');
        return false;
    }
    
    // Last Name
    const lastName = document.querySelector('input[name="lastName"]');
    if (lastName && !lastName.value.trim()) {
        isValid = false;
        errorMessages.push('Last Name is required');
        showFieldError('lastName', 'Last Name is required');
        return false;
    } else if (lastName && lastName.value.trim().length < 2) {
        isValid = false;
        errorMessages.push('Last Name must be at least 2 characters');
        showFieldError('lastName', 'Last Name must be at least 2 characters');
        return false;
    }
    
    // Date of Birth
    const dob = document.querySelector('input[name="dob"]');
    if (dob && !dob.value) {
        isValid = false;
        errorMessages.push('Date of Birth is required');
        showFieldError('dob', 'Date of Birth is required');
        return false;
    } else if (dob) {
        const dobValidation = validateDate(dob.value, 'Date of Birth');
        if (!dobValidation.valid) {
            isValid = false;
            errorMessages.push(dobValidation.message);
            showFieldError('dob', dobValidation.message);
            return false;
        }
    }
    
    // Gender
    const gender = document.querySelector('select[name="gender"]');
    if (gender && !gender.value) {
        isValid = false;
        errorMessages.push('Gender is required');
        showFieldError('gender', 'Please select gender');
        return false;
    }
    
    // Student ID
    const studentId = document.getElementById('studentId');
    if (studentId && !studentId.value.trim()) {
        isValid = false;
        errorMessages.push('Student ID is required');
        showFieldError('studentId', 'Student ID is required');
        return false;
    } else if (studentId && !validateStudentId(studentId.value).valid) {
        isValid = false;
        errorMessages.push('Invalid Student ID format');
        showFieldError('studentId', 'Student ID can only contain letters, numbers, hyphens, and underscores');
        return false;
    }
    
    // Password (only for new students)
    if (!editingStudentId) {
        const password = document.getElementById('studentPassword');
        if (password && !password.value) {
            isValid = false;
            errorMessages.push('Password is required');
            showFieldError('studentPassword', 'Password is required');
            return false;
        } else if (password && password.value.length < 6) {
            isValid = false;
            errorMessages.push('Password must be at least 6 characters');
            showFieldError('studentPassword', 'Password must be at least 6 characters');
            return false;
        }
        
        const confirmPassword = document.getElementById('confirmStudentPassword');
        if (confirmPassword && password && password.value !== confirmPassword.value) {
            isValid = false;
            errorMessages.push('Passwords do not match');
            showFieldError('confirmStudentPassword', 'Passwords do not match');
            return false;
        }
    }
    
    // Local Address validation
    const localAddr = document.querySelector('input[name="localAddressLine1"]');
    if (localAddr && !localAddr.value.trim()) {
        isValid = false;
        errorMessages.push('Address Line 1 is required');
        showFieldError('localAddressLine1', 'Address Line 1 is required');
        return false;
    }
    
    const localCity = document.querySelector('input[name="localCity"]');
    if (localCity && !localCity.value.trim()) {
        isValid = false;
        errorMessages.push('City is required');
        showFieldError('localCity', 'City is required');
        return false;
    }
    
    const localState = document.querySelector('input[name="localState"]');
    if (localState && !localState.value.trim()) {
        isValid = false;
        errorMessages.push('State is required');
        showFieldError('localState', 'State is required');
        return false;
    }
    
    const localPincode = document.querySelector('input[name="localPincode"]');
    if (localPincode && localPincode.value.length !== 6) {
        isValid = false;
        errorMessages.push('Pincode must be exactly 6 digits');
        showFieldError('localPincode', 'Pincode must be exactly 6 digits');
        return false;
    }
    
    return isValid;
}

function validateAcademicTab(errorMessages) {
    let isValid = true;
    
    const classSelect = document.getElementById('formClassSelect');
    if (classSelect && !classSelect.value) {
        isValid = false;
        errorMessages.push('Please select a class');
        showFieldError('formClassSelect', 'Class is required');
        classSelect.focus();
        classSelect.scrollIntoView({ behavior: 'smooth', block: 'center' });
        return false;
    }
    
    const sectionSelect = document.getElementById('formSectionSelect');
    if (sectionSelect && !sectionSelect.value) {
        isValid = false;
        errorMessages.push('Please select a section');
        showFieldError('formSectionSelect', 'Section is required');
        return false;
    }
    
    const admissionDate = document.querySelector('input[name="admissionDate"]');
    if (admissionDate && !admissionDate.value) {
        isValid = false;
        errorMessages.push('Admission Date is required');
        showFieldError('admissionDate', 'Admission Date is required');
        return false;
    } else if (admissionDate) {
        const admissionValidation = validateDate(admissionDate.value, 'Admission Date');
        if (!admissionValidation.valid) {
            isValid = false;
            errorMessages.push(admissionValidation.message);
            showFieldError('admissionDate', admissionValidation.message);
            return false;
        }
    }
    
    const academicYear = document.getElementById('academicYearDropdown');
    if (academicYear && !academicYear.value) {
        isValid = false;
        errorMessages.push('Academic Year is required');
        showFieldError('academicYearDropdown', 'Academic Year is required');
        return false;
    }
    
    return isValid;
}

function validateParentTab(errorMessages) {
    let isValid = true;
    
    // Father's Name
    const fatherName = document.querySelector('input[name="fatherName"]');
    if (fatherName && !fatherName.value.trim()) {
        isValid = false;
        errorMessages.push("Father's Name is required");
        showFieldError('fatherName', "Father's Name is required");
        fatherName.focus();
        fatherName.scrollIntoView({ behavior: 'smooth', block: 'center' });
        return false;
    } else if (fatherName && fatherName.value.trim().length < 2) {
        isValid = false;
        errorMessages.push("Father's Name must be at least 2 characters");
        showFieldError('fatherName', "Father's Name must be at least 2 characters");
        return false;
    }
    
    // Father's Contact
    const fatherContact = document.querySelector('input[name="fatherContact"]');
    if (fatherContact && fatherContact.value.length !== 10) {
        isValid = false;
        errorMessages.push("Father's Contact number must be exactly 10 digits");
        showFieldError('fatherContact', "Father's Contact number must be exactly 10 digits");
        return false;
    }
    
    // Parent Email
    const parentEmail = document.querySelector('input[name="parentEmail"]');
    if (parentEmail && parentEmail.value.trim()) {
        const emailValidation = validateEmailAddress(parentEmail.value);
        if (!emailValidation.valid) {
            isValid = false;
            errorMessages.push(emailValidation.message);
            showFieldError('parentEmail', emailValidation.message);
            return false;
        }
    } else {
        isValid = false;
        errorMessages.push('Email address is required');
        showFieldError('parentEmail', 'Email address is required');
        return false;
    }
    
    // Emergency Contact Name
    const emergencyName = document.querySelector('input[name="emergencyContactName"]');
    if (emergencyName && !emergencyName.value.trim()) {
        isValid = false;
        errorMessages.push('Emergency Contact Name is required');
        showFieldError('emergencyContactName', 'Emergency Contact Name is required');
        return false;
    }
    
    // Emergency Contact Number
    const emergencyNumber = document.querySelector('input[name="emergencyContactNumber"]');
    if (emergencyNumber && emergencyNumber.value.length !== 10) {
        isValid = false;
        errorMessages.push('Emergency Contact Number must be exactly 10 digits');
        showFieldError('emergencyContactNumber', 'Emergency Contact Number must be exactly 10 digits');
        return false;
    }
    
    return isValid;
}

function validateFeesTab(errorMessages) {
    let isValid = true;
    
    const admissionFees = parseInt(document.getElementById('admissionFees')?.value) || 0;
    const tuitionFees = parseInt(document.getElementById('tuitionFees')?.value) || 0;
    const initialPayment = parseInt(document.getElementById('initialPayment')?.value) || 0;
    const totalFees = admissionFees + tuitionFees + 
                      (parseInt(document.getElementById('uniformFees')?.value) || 0) +
                      (parseInt(document.getElementById('bookFees')?.value) || 0);
    
    if (admissionFees <= 0) {
        isValid = false;
        errorMessages.push('Admission Fees must be greater than 0');
        showFieldError('admissionFees', 'Admission Fees must be greater than 0');
        return false;
    }
    
    if (tuitionFees <= 0) {
        isValid = false;
        errorMessages.push('Tuition Fees must be greater than 0');
        showFieldError('tuitionFees', 'Tuition Fees must be greater than 0');
        return false;
    }
    
    if (initialPayment > totalFees) {
        isValid = false;
        errorMessages.push('Initial payment cannot exceed total fees');
        showFieldError('initialPayment', 'Initial payment cannot exceed total fees');
        return false;
    }
    
    // Online payment validation
    if (document.querySelector('input[name="paymentMethod"]:checked')?.value === 'online') {
        const transactionId = document.getElementById('transactionId')?.value;
        if (!transactionId || transactionId.length < 6) {
            isValid = false;
            errorMessages.push('Please enter and verify Transaction ID for online payment');
            showFieldError('transactionId', 'Transaction ID required and must be verified');
            return false;
        }
        if (!transactionVerified) {
            isValid = false;
            errorMessages.push('Please verify the Transaction ID');
            showFieldError('transactionId', 'Transaction ID verification required');
            return false;
        }
    }
    
    return isValid;
}

// ============================================================
// ENHANCED SWITCH TAB FUNCTION WITH VALIDATION
// ============================================================

function switchTabWithValidation(tabName) {
    // Validate current section before switching
    if (!validateCurrentSection()) {
        return false;
    }
    
    // Switch to the new tab
    document.querySelectorAll('.tab-content').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('.tab-button').forEach(b => b.classList.remove('active'));
    document.getElementById(`${tabName}TabContent`)?.classList.add('active');
    document.getElementById(`${tabName}Tab`)?.classList.add('active');
    
    return true;
}

// ============================================================
// ENHANCED SETUP REAL-TIME VALIDATION
// ============================================================

function setupRealTimeValidation() {
    console.log('Setting up enhanced real-time validation...');
    
    // Text fields - Letters only
    const textFields = [
        'firstName', 'lastName', 'middleName',
        'fatherName', 'motherName', 'emergencyContactName',
        'localCity', 'localState', 'permanentCity', 'permanentState'
    ];
    
    textFields.forEach(fieldId => {
        const element = document.getElementById(fieldId);
        if (element) {
            element.addEventListener('input', restrictToLetters);
            element.addEventListener('input', function() {
                if (this.value) {
                    const validation = validateName(this.value, fieldId);
                    if (validation.valid) {
                        showFieldValid(fieldId);
                    } else {
                        showFieldError(fieldId, validation.message);
                    }
                }
            });
        } else {
            // Try query selector for dynamically added elements
            const selector = `input[name="${fieldId}"]`;
            const elementBySelector = document.querySelector(selector);
            if (elementBySelector) {
                if (!elementBySelector.id) elementBySelector.id = fieldId;
                elementBySelector.addEventListener('input', restrictToLetters);
                elementBySelector.addEventListener('input', function() {
                    if (this.value) {
                        const validation = validateName(this.value, fieldId);
                        if (validation.valid) {
                            showFieldValid(fieldId);
                        } else {
                            showFieldError(fieldId, validation.message);
                        }
                    }
                });
            }
        }
    });
    
    // Phone fields - Numbers only, max 10 digits
    const phoneFields = ['fatherContact', 'motherContact', 'emergencyContactNumber'];
    phoneFields.forEach(fieldId => {
        const element = document.getElementById(fieldId);
        if (element) {
            element.addEventListener('input', restrictToPhone);
        } else {
            const selector = `input[name="${fieldId}"]`;
            const elementBySelector = document.querySelector(selector);
            if (elementBySelector) {
                if (!elementBySelector.id) elementBySelector.id = fieldId;
                elementBySelector.addEventListener('input', restrictToPhone);
            }
        }
    });
    
    // Aadhar fields - Numbers only, exactly 12 digits
    const aadharFields = ['aadharNumber', 'fatherAadhar', 'motherAadhar'];
    aadharFields.forEach(fieldId => {
        const element = document.getElementById(fieldId);
        if (element) {
            element.addEventListener('input', restrictToAadhar);
        } else {
            const selector = `input[name="${fieldId}"]`;
            const elementBySelector = document.querySelector(selector);
            if (elementBySelector) {
                if (!elementBySelector.id) elementBySelector.id = fieldId;
                elementBySelector.addEventListener('input', restrictToAadhar);
            }
        }
    });
    
    // Pincode fields - Numbers only, exactly 6 digits
    const pincodeFields = ['localPincode', 'permanentPincode'];
    pincodeFields.forEach(fieldId => {
        const element = document.getElementById(fieldId);
        if (element) {
            element.addEventListener('input', restrictToPincode);
        } else {
            const selector = `input[name="${fieldId}"]`;
            const elementBySelector = document.querySelector(selector);
            if (elementBySelector) {
                if (!elementBySelector.id) elementBySelector.id = fieldId;
                elementBySelector.addEventListener('input', restrictToPincode);
            }
        }
    });
    
    // Student ID - Alphanumeric with hyphens and underscores
    const studentIdElement = document.getElementById('studentId');
    if (studentIdElement) {
        studentIdElement.addEventListener('input', (e) => restrictToAlphanumeric(e, '-_'));
        studentIdElement.addEventListener('input', function() {
            if (this.value) {
                const validation = validateStudentId(this.value);
                if (validation.valid) {
                    showFieldValid('studentId');
                } else {
                    showFieldError('studentId', validation.message);
                }
            }
        });
    }
    
    // Roll Number - Alphanumeric with hyphens and underscores
    const rollNumberElement = document.querySelector('input[name="rollNumber"]');
    if (rollNumberElement) {
        if (!rollNumberElement.id) rollNumberElement.id = 'rollNumber';
        rollNumberElement.addEventListener('input', (e) => restrictToAlphanumeric(e, '-_'));
    }
    
    // Fee fields - Numbers only
    const feeFields = ['admissionFees', 'uniformFees', 'bookFees', 'tuitionFees', 'initialPayment', 'additionalFeeAmount'];
    feeFields.forEach(fieldId => {
        const element = document.getElementById(fieldId);
        if (element) {
            element.addEventListener('input', restrictToNumbers);
            element.addEventListener('input', function() {
                if (this.value && parseInt(this.value) >= 0) {
                    showFieldValid(fieldId);
                    updateFeeCalculations();
                }
            });
        }
    });
    
    console.log('Enhanced real-time validation setup complete!');
}

// ============================================================
// UPDATE THE TAB BUTTONS IN DOMContentLoaded
// ============================================================

// Replace the existing tab button event listeners with this:
document.addEventListener('DOMContentLoaded', async () => {
    // ... existing initialization code ...
    
    // Update tab buttons to use validation
    const personalTabBtn = document.getElementById('personalTab');
    const academicTabBtn = document.getElementById('academicTab');
    const parentTabBtn = document.getElementById('parentTab');
    const documentsTabBtn = document.getElementById('documentsTab');
    const feesTabBtn = document.getElementById('feesTab');
    
    if (personalTabBtn) {
        personalTabBtn.onclick = () => switchTab('personal');
    }
    
    if (academicTabBtn) {
        academicTabBtn.onclick = () => switchTabWithValidation('academic');
    }
    
    if (parentTabBtn) {
        parentTabBtn.onclick = () => switchTabWithValidation('parent');
    }
    
    if (documentsTabBtn) {
        documentsTabBtn.onclick = () => switchTabWithValidation('documents');
    }
    
    if (feesTabBtn) {
        feesTabBtn.onclick = () => switchTabWithValidation('fees');
    }
    
    // ... rest of existing initialization code ...
});

// ============================================================
// ADD HELPER FUNCTION FOR BLUR VALIDATION
// ============================================================

function addBlurValidation() {
    const blurValidationFields = [
        { id: 'firstName', validator: (val) => validateName(val, 'First Name') },
        { id: 'lastName', validator: (val) => validateName(val, 'Last Name') },
        { id: 'fatherName', validator: (val) => validateName(val, "Father's Name") },
        { id: 'motherName', validator: (val) => validateName(val, "Mother's Name") },
        { id: 'emergencyContactName', validator: (val) => validateName(val, 'Emergency Contact Name') },
        { id: 'localCity', validator: (val) => validateCityState(val, 'City') },
        { id: 'localState', validator: (val) => validateCityState(val, 'State') },
        { id: 'parentEmail', validator: (val) => validateEmailAddress(val) },
        { id: 'studentId', validator: (val) => validateStudentId(val) },
        { id: 'dob', validator: (val) => validateDate(val, 'Date of Birth') },
        { id: 'admissionDate', validator: (val) => validateDate(val, 'Admission Date') }
    ];
    
    blurValidationFields.forEach(field => {
        const element = document.getElementById(field.id);
        if (element) {
            element.addEventListener('blur', function() {
                if (this.value || this.id === 'dob' || this.id === 'admissionDate' || 
                    this.id === 'studentId' || this.id === 'parentEmail') {
                    const validation = field.validator(this.value);
                    if (!validation.valid) {
                        showFieldError(field.id, validation.message);
                    } else if (this.value) {
                        showFieldValid(field.id);
                    }
                }
            });
        } else {
            const selector = `input[name="${field.id}"]`;
            const elementBySelector = document.querySelector(selector);
            if (elementBySelector) {
                if (!elementBySelector.id) elementBySelector.id = field.id;
                elementBySelector.addEventListener('blur', function() {
                    if (this.value || field.id === 'dob' || field.id === 'admissionDate' || 
                        field.id === 'studentId' || field.id === 'parentEmail') {
                        const validation = field.validator(this.value);
                        if (!validation.valid) {
                            showFieldError(field.id, validation.message);
                        } else if (this.value) {
                            showFieldValid(field.id);
                        }
                    }
                });
            }
        }
    });
}

// Call addBlurValidation after setupRealTimeValidation

function handleValidationResult(errors, sectionName) {
    if (errors.length > 0) {
        showNotification(errors[0], 'error'); // show first error only
        return false;
    }

    showNotification(`${sectionName} completed successfully`, 'success');
    return true;
}

function validateAcademicSection() {
    const requiredFields = [
        { id: 'formClassSelect', label: 'Class' },
        { id: 'formSectionSelect', label: 'Section' },
        { name: 'admissionDate', label: 'Admission Date' },
        { id: 'academicYearDropdown', label: 'Academic Year' }
    ];

    let errors = validateRequiredFields(requiredFields);

    return handleValidationResult(errors, 'Academic Details');
}

// Pincode validation (6 digits)
function validatePincode(pincode, fieldName = 'Pincode', required = true) {
    if (!pincode || pincode.trim() === '') {
        return required ? { valid: false, message: `${fieldName} is required` } : { valid: true, message: '' };
    }
    const pincodeRegex = /^\d{6}$/;
    if (!pincodeRegex.test(pincode)) {
        return { valid: false, message: `${fieldName} must be exactly 6 digits` };
    }
    return { valid: true, message: '' };
}

// Password validation
function validatePassword(password, required = true) {
    if (!password || password.trim() === '') {
        return required ? { valid: false, message: 'Password is required' } : { valid: true, message: '' };
    }
    if (password.length < 6) {
        return { valid: false, message: 'Password must be at least 6 characters' };
    }
    if (password.length > 20) {
        return { valid: false, message: 'Password cannot exceed 20 characters' };
    }
    return { valid: true, message: '' };
}

// Number field validation (positive numbers)
function validateNumberField(value, fieldName, min = 0, max = null, required = true) {
    if (value === '' || value === null || value === undefined) {
        return required ? { valid: false, message: `${fieldName} is required` } : { valid: true, message: '' };
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

// Address validation
function validateAddress(address, fieldName = 'Address', required = true) {
    if (!address || address.trim() === '') {
        return required ? { valid: false, message: `${fieldName} is required` } : { valid: true, message: '' };
    }
    if (address.length < 5) {
        return { valid: false, message: `${fieldName} must be at least 5 characters` };
    }
    if (address.length > 200) {
        return { valid: false, message: `${fieldName} cannot exceed 200 characters` };
    }
    return { valid: true, message: '' };
}

// City/State validation
function validateCityState(value, fieldName, required = true) {
    if (!value || value.trim() === '') {
        return required ? { valid: false, message: `${fieldName} is required` } : { valid: true, message: '' };
    }
    const cityRegex = /^[A-Za-z\s]+$/;
    if (!cityRegex.test(value)) {
        return { valid: false, message: `${fieldName} should only contain letters and spaces` };
    }
    return { valid: true, message: '' };
}

function showFieldError(elementId, message) {
    const element = document.getElementById(elementId);
    if (!element) {
        console.warn(`Element not found: ${elementId}`);
        return;
    }
    
    element.classList.add('error');
    element.classList.remove('valid');
    
    // Remove any existing error message
    let errorSpan = element.parentElement.querySelector('.error-message');
    if (!errorSpan) {
        errorSpan = document.createElement('div');
        errorSpan.className = 'error-message';
        element.parentElement.appendChild(errorSpan);
    }
    errorSpan.textContent = message;
    errorSpan.classList.add('show');
    
    element.style.borderColor = 'var(--danger)';
    element.style.backgroundColor = '#fff5f5';
}

function showFieldValid(elementId) {
    const element = document.getElementById(elementId);
    if (!element) {
        console.warn(`Element not found: ${elementId}`);
        return;
    }
    
    element.classList.remove('error');
    element.classList.add('valid');
    
    const errorSpan = element.parentElement.querySelector('.error-message');
    if (errorSpan) {
        errorSpan.classList.remove('show');
    }
    
    element.style.borderColor = 'var(--success)';
    element.style.backgroundColor = '#f0fdf4';
}

function clearFieldValidation(elementId) {
    const element = document.getElementById(elementId);
    if (!element) return;
    
    element.classList.remove('error', 'valid');
    element.style.borderColor = '';
    element.style.backgroundColor = '';
    
    const errorSpan = element.parentElement.querySelector('.error-message');
    if (errorSpan) {
        errorSpan.classList.remove('show');
    }
}

// Sanitization helpers (add these if not present)
function sanitizeName(value) {
    if (!value) return '';
    return value.toString().replace(/[^A-Za-z\s]/g, '').trim();
}

function sanitizePhone(value) {
    if (!value) return '';
    return value.toString().replace(/[^0-9]/g, '').slice(0, 10);
}

function sanitizeAadhar(value) {
    if (!value) return '';
    return value.toString().replace(/[^0-9]/g, '').slice(0, 12);
}

function sanitizePincode(value) {
    if (!value) return '';
    return value.toString().replace(/[^0-9]/g, '').slice(0, 6);
}

function sanitizeRollNumber(value) {
    if (!value) return '';
    return value.toString().replace(/[^A-Za-z0-9\-_]/g, '').slice(0, 20);
}

function toast(message, type = 'info', duration = 3500) {
    const style = TOAST_STYLES[type] ?? TOAST_STYLES.info;
    const text  = `${style.icon}  ${message}`;

    if (typeof Toastify === 'function') {
        Toastify({
            text,
            duration,
            gravity:     'top',
            position:    'right',
            stopOnFocus: true,
            style: {
                background:  style.background,
                borderRadius:'10px',
                padding:     '12px 20px',
                fontSize:    '14px',
                fontWeight:  '500',
                boxShadow:   '0 4px 20px rgba(0,0,0,0.18)',
                minWidth:    '280px',
                maxWidth:    '420px',
            },
        }).showToast();
        return;
    }

    let container = document.getElementById('_toastContainer');
    if (!container) {
        container = Object.assign(document.createElement('div'), { id: '_toastContainer' });
        Object.assign(container.style, {
            position:'fixed', top:'20px', right:'20px',
            zIndex:'99999', display:'flex', flexDirection:'column', gap:'10px',
        });
        document.body.appendChild(container);
    }

    const el = document.createElement('div');
    Object.assign(el.style, {
        padding:'12px 20px', borderRadius:'10px', color:'#fff',
        fontSize:'14px', fontWeight:'500', minWidth:'280px', maxWidth:'420px',
        background: style.background,
        boxShadow: '0 4px 20px rgba(0,0,0,0.18)',
        transform: 'translateX(120%)', transition: 'transform .3s ease',
        cursor: 'pointer',
    });
    el.textContent = text;
    el.onclick = () => el.remove();
    container.appendChild(el);

    requestAnimationFrame(() => { el.style.transform = 'translateX(0)'; });
    setTimeout(() => {
        el.style.transform = 'translateX(120%)';
        el.addEventListener('transitionend', () => el.remove(), { once: true });
    }, duration);
}

const toastSuccess = (msg, dur)  => toast(msg, 'success', dur);
const toastError   = (msg, dur)  => toast(msg, 'error',   dur);
const toastWarning = (msg, dur)  => toast(msg, 'warning',  dur);
const toastInfo    = (msg, dur)  => toast(msg, 'info',    dur);

// ─────────────────────────────────────────────────────────────
//  LOADING OVERLAY
// ─────────────────────────────────────────────────────────────
const showLoading = show =>
    document.getElementById('loadingOverlay')?.classList.toggle('hidden', !show);

// ─────────────────────────────────────────────────────────────
//  MODAL
// ─────────────────────────────────────────────────────────────
const closeModal = id =>
    document.getElementById(id)?.classList.remove('show');

// ─────────────────────────────────────────────────────────────
//  SECTION SWITCHING
// ─────────────────────────────────────────────────────────────
function showAllStudentsSection() {
    const allStudentsSection = document.getElementById('allStudentsSection');
    const addStudentSection = document.getElementById('addStudentSection');
    
    if (allStudentsSection) allStudentsSection.classList.remove('hidden');
    if (addStudentSection) addStudentSection.classList.add('hidden');
    
    // Reset editing state
    editingStudentId = null;
    
    // Update form title if it exists
    const title = document.getElementById('formTitle');
    if (title) title.textContent = 'Add New Student';
    
    // Update submit button text
    const btn = document.getElementById('submitButton');
    if (btn) btn.innerHTML = '<i class="fas fa-check-circle mr-2"></i>Register Student';
    
    // Update URL without triggering navigation
    const url = new URL(window.location);
    url.searchParams.delete('action');
    window.history.pushState({}, '', url);
    
    // Update sidebar active state
    setActiveSidebarLink();
    
    // Load students and update stats
    loadStudents(0);
    
    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });
        setActiveSidebarLink(); // Add this line

}

// Function to show Add Student section
function showAddStudentSection() {
    const allStudentsSection = document.getElementById('allStudentsSection');
    const addStudentSection = document.getElementById('addStudentSection');
    
    if (allStudentsSection) allStudentsSection.classList.add('hidden');
    if (addStudentSection) addStudentSection.classList.remove('hidden');
    
    // Reset editing state
    editingStudentId = null;
    
    // Reset the add student form
    resetAddStudentForm();
    
    // Switch to personal tab
    switchTab('personal');
    
    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });
    
    // Update URL with action parameter
    const url = new URL(window.location);
    url.searchParams.set('action', 'add');
    window.history.pushState({}, '', url);
    
    // Update sidebar active state
    setActiveSidebarLink();
}


function checkUrlAndShowSection() {
    const isAdd = new URLSearchParams(window.location.search).get('action') === 'add';
    const allStudentsSection = document.getElementById('allStudentsSection');
    const addStudentSection = document.getElementById('addStudentSection');
    
    if (allStudentsSection) allStudentsSection.classList.toggle('hidden', isAdd);
    if (addStudentSection) addStudentSection.classList.toggle('hidden', !isAdd);
    
    // Update sidebar active state
    setActiveSidebarLink();
    
    // If we're on the add section, reset the form
    if (isAdd) {
        resetAddStudentForm();
        switchTab('personal');
    }
}

function setActiveSidebarLink() {
    const isAdd = new URLSearchParams(window.location.search).get('action') === 'add';
    const navAll = document.getElementById('navAllStudents');
    const navAdd = document.getElementById('navAddStudent');
    
    if (!navAll || !navAdd) {
        console.warn('Sidebar navigation elements not found');
        return;
    }
    
    // Remove active class from both
    navAll.classList.remove('active', 'bg-blue-50', 'text-blue-600', 'bg-blue-700', 'bg-blue-100');
    navAdd.classList.remove('active', 'bg-blue-50', 'text-blue-600', 'bg-blue-700', 'bg-blue-100');
    
    // Reset icon colors
    const allIcon = navAll.querySelector('.nav-icon');
    const allText = navAll.querySelector('.nav-label');
    const addIcon = navAdd.querySelector('.nav-icon');
    const addText = navAdd.querySelector('.nav-label');
    
    if (allIcon) {
        allIcon.classList.remove('text-blue-600', 'text-white');
        allIcon.classList.add('text-gray-600');
    }
    if (allText) {
        allText.classList.remove('text-blue-600', 'text-white', 'font-semibold');
        allText.classList.add('text-gray-700');
    }
    if (addIcon) {
        addIcon.classList.remove('text-blue-600', 'text-white');
        addIcon.classList.add('text-gray-600');
    }
    if (addText) {
        addText.classList.remove('text-blue-600', 'text-white', 'font-semibold');
        addText.classList.add('text-gray-700');
    }
    
    // Add active class to the correct link
    if (isAdd) {
        navAdd.classList.add('active', 'bg-blue-50', 'text-blue-600');
        if (addIcon) {
            addIcon.classList.remove('text-gray-600');
            addIcon.classList.add('text-blue-600');
        }
        if (addText) {
            addText.classList.remove('text-gray-700');
            addText.classList.add('text-blue-600', 'font-semibold');
        }
        console.log('[Sidebar] Active: Add Student');
    } else {
        navAll.classList.add('active', 'bg-blue-50', 'text-blue-600');
        if (allIcon) {
            allIcon.classList.remove('text-gray-600');
            allIcon.classList.add('text-blue-600');
        }
        if (allText) {
            allText.classList.remove('text-gray-700');
            allText.classList.add('text-blue-600', 'font-semibold');
        }
        console.log('[Sidebar] Active: All Students');
    }
}
// ─────────────────────────────────────────────────────────────
//  TAB SWITCHING
// ─────────────────────────────────────────────────────────────
// REPLACE YOUR EXISTING switchTab FUNCTION WITH THIS
function switchTab(tabName) {
    const currentActiveTab = document.querySelector('.tab-content.active');
    let currentSectionName = '';
    
    if (currentActiveTab) {
        if (currentActiveTab.id === 'personalTabContent') currentSectionName = 'personal';
        else if (currentActiveTab.id === 'academicTabContent') currentSectionName = 'academic';
        else if (currentActiveTab.id === 'parentTabContent') currentSectionName = 'parent';
        else if (currentActiveTab.id === 'documentsTabContent') currentSectionName = 'documents';
        else if (currentActiveTab.id === 'feesTabContent') currentSectionName = 'fees';
    }
    
    if (currentSectionName && currentSectionName !== tabName) {
        if (currentSectionName !== 'documents') {
            const isValid = validateSectionFields(currentSectionName);
            if (!isValid) {
                return false;
            }
        }
    }
    
    document.querySelectorAll('.tab-content').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('.tab-button').forEach(b => b.classList.remove('active'));
    
    const targetContent = document.getElementById(`${tabName}TabContent`);
    const targetButton = document.getElementById(`${tabName}Tab`);
    
    if (targetContent) targetContent.classList.add('active');
    if (targetButton) targetButton.classList.add('active');
    
    document.querySelector('.card-body')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    
    return true;
}
const resetForm = () => resetAddStudentForm();

// ─────────────────────────────────────────────────────────────
//  STUDENT ID GENERATOR
// ─────────────────────────────────────────────────────────────
function generateStudentId() {
    const yr  = new Date().getFullYear().toString().slice(-2);
    const rnd = Math.floor(1000 + Math.random() * 9000);
    return `STU${yr}${rnd}`;
}

// Update pagination UI
function updatePaginationUI() {
    const start = totalElements > 0 ? (currentPage * PAGE_SIZE) + 1 : 0;
    const end = Math.min((currentPage + 1) * PAGE_SIZE, totalElements);
    
    updatePaginationCounts(start, end, totalElements);
    
    // Update prev/next buttons
    const prevBtn = document.getElementById('prevBtn');
    const nextBtn = document.getElementById('nextBtn');
    
    if (prevBtn) {
        prevBtn.disabled = currentPage === 0 || totalElements === 0;
        prevBtn.onclick = () => {
            if (currentPage > 0) loadStudents(currentPage - 1);
        };
    }
    
    if (nextBtn) {
        nextBtn.disabled = currentPage >= totalPages - 1 || totalElements === 0;
        nextBtn.onclick = () => {
            if (currentPage < totalPages - 1) loadStudents(currentPage + 1);
        };
    }
    
    // Generate page numbers
    const pageNumbers = document.getElementById('pageNumbers');
    if (!pageNumbers) return;
    
    pageNumbers.innerHTML = '';
    
    if (totalPages === 0 || totalPages === 1) {
        const pageBtn = document.createElement('button');
        pageBtn.textContent = '1';
        pageBtn.className = 'px-3 py-1 border rounded-lg text-sm transition-all bg-blue-600 text-white border-blue-600';
        pageBtn.disabled = true;
        pageNumbers.appendChild(pageBtn);
        return;
    }
    
    let startPage = Math.max(0, currentPage - 2);
    let endPage = Math.min(totalPages - 1, startPage + 4);
    
    if (endPage - startPage < 4 && startPage > 0) {
        startPage = Math.max(0, endPage - 4);
    }
    
    // First page
    if (startPage > 0) {
        const firstBtn = document.createElement('button');
        firstBtn.textContent = '1';
        firstBtn.className = 'px-3 py-1 border rounded-lg text-sm transition-all border-gray-300 hover:bg-gray-100';
        firstBtn.onclick = () => loadStudents(0);
        pageNumbers.appendChild(firstBtn);
        
        if (startPage > 1) {
            const dots = document.createElement('span');
            dots.textContent = '...';
            dots.className = 'px-2 text-gray-500';
            pageNumbers.appendChild(dots);
        }
    }
    
    // Page numbers
    for (let i = startPage; i <= endPage; i++) {
        const pageBtn = document.createElement('button');
        pageBtn.textContent = i + 1;
        pageBtn.className = `px-3 py-1 border rounded-lg text-sm transition-all ${
            i === currentPage 
                ? 'bg-blue-600 text-white border-blue-600' 
                : 'border-gray-300 hover:bg-gray-100'
        }`;
        pageBtn.onclick = () => loadStudents(i);
        pageNumbers.appendChild(pageBtn);
    }
    
    // Last page
    if (endPage < totalPages - 1) {
        if (endPage < totalPages - 2) {
            const dots = document.createElement('span');
            dots.textContent = '...';
            dots.className = 'px-2 text-gray-500';
            pageNumbers.appendChild(dots);
        }
        
        const lastBtn = document.createElement('button');
        lastBtn.textContent = totalPages;
        lastBtn.className = 'px-3 py-1 border rounded-lg text-sm transition-all border-gray-300 hover:bg-gray-100';
        lastBtn.onclick = () => loadStudents(totalPages - 1);
        pageNumbers.appendChild(lastBtn);
    }
}

function updatePaginationCounts(start, end, total) {
    const elements = {
        'startCount': start,
        'endCount': end,
        'totalCount': total,
        'totalCountDisplay': total
    };
    
    Object.entries(elements).forEach(([id, value]) => {
        const element = document.getElementById(id);
        if (element) element.textContent = value;
    });
    
    console.log(`[Pagination] Showing ${start} to ${end} of ${total} students`);
}

async function loadStudents(page = 0) {
    showLoading(true);
    try {
        console.log(`[loadStudents] Loading page ${page}...`);
        
        // Check token
        const token = localStorage.getItem('admin_jwt_token');
        if (!token) {
            console.error('No JWT token found!');
            toastError('Please login first');
            window.location.href = '/login.html';
            return;
        }
        
        const url = `${BASE_URL}/api/students/get-all-students?page=${page}&size=${PAGE_SIZE}&direction=desc`;
        console.log('[loadStudents] Fetching:', url);
        
        const response = await fetch(url, {
            headers: { 
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        console.log('[loadStudents] Response status:', response.status);
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const data = await response.json();
        console.log('[loadStudents] Full response:', data);
        
        // ========== CRITICAL FIX: Parse Spring Boot Page response ==========
        let students = [];
        let total = 0;
        
        // Your backend returns Spring Page object with 'content', 'totalElements', etc.
        if (data && typeof data === 'object') {
            // Get students array
            if (data.content && Array.isArray(data.content)) {
                students = data.content;
                console.log(`✅ Found ${students.length} students in content array`);
            } else if (Array.isArray(data)) {
                students = data;
                console.log(`✅ Found ${students.length} students in array`);
            } else if (data.data && Array.isArray(data.data)) {
                students = data.data;
                console.log(`✅ Found ${students.length} students in data array`);
            } else {
                console.warn('⚠️ Unexpected data structure:', Object.keys(data));
                students = [];
            }
            
            // Get total elements count - THIS IS THE KEY FIX
            if (data.totalElements !== undefined) {
                total = data.totalElements;
                console.log(`✅ Total elements from backend: ${total}`);
            } else if (data.total !== undefined) {
                total = data.total;
                console.log(`✅ Total from backend: ${total}`);
            } else {
                total = students.length;
                console.log(`⚠️ Using students length as total: ${total}`);
            }
            
            // Get pagination info
            currentPage = data.number !== undefined ? data.number : page;
            totalPages = data.totalPages !== undefined ? data.totalPages : Math.ceil(total / PAGE_SIZE);
            
            console.log(`[loadStudents] Final values - Students: ${students.length}, Total: ${total}, Page: ${currentPage}, TotalPages: ${totalPages}`);
        } else {
            students = [];
            total = 0;
            currentPage = 0;
            totalPages = 1;
            console.error('❌ Invalid data structure received');
        }
        
        // ========== UPDATE GLOBAL VARIABLES ==========
        totalElements = total;  // This is the key variable for pagination
        window.totalElements = total; // Also set globally for debugging
        
        // ========== RENDER THE TABLE ==========
        renderStudentTable(students);
        
        // ========== UPDATE PAGINATION UI ==========
        updatePaginationDisplay();
        
        // ========== UPDATE STATS ==========
        const isAllStudentsPage = document.getElementById('allStudentsSection')?.classList.contains('hidden') === false;
        if (isAllStudentsPage) {
            updateStats({ totalElements: total, content: students });
        }
        
        // ========== UPDATE TOTAL COUNT IN TABLE HEADER ==========
        const totalCountSpan = document.getElementById('totalCount');
        if (totalCountSpan) {
            totalCountSpan.textContent = total;
        }
        
        // ========== SHOW EMPTY STATE IF NO STUDENTS ==========
        if (students.length === 0 && total === 0) {
            const tbody = document.getElementById('studentTableBody');
            if (tbody) {
                tbody.innerHTML = `
                    <tr>
                        <td colspan="6" style="text-align:center;padding:60px 20px;">
                            <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;">
                                <i class="fas fa-user-graduate" style="font-size:48px;color:#cbd5e1;margin-bottom:16px;"></i>
                                <p style="color:#64748b;font-size:16px;font-weight:500;">No students found</p>
                                <p style="color:#94a3b8;font-size:14px;margin-top:8px;">Click "Add New Student" to create your first student record</p>
                            </div>
                        </td>
                    </tr>
                `;
            }
        }
        
    } catch (err) {
        console.error('[loadStudents] Error:', err);
        
        let errorMsg = 'Failed to load students';
        if (err.message.includes('Failed to fetch')) {
            errorMsg = 'Cannot connect to backend server. Please check if server is running on port 8084';
        } else if (err.message.includes('401')) {
            errorMsg = 'Session expired. Please login again.';
        } else {
            errorMsg = err.message;
        }
        
        toastError(errorMsg);
        
        // Show error in table
        const tbody = document.getElementById('studentTableBody');
        if (tbody) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="6" style="text-align:center;padding:60px 20px;">
                        <div style="display:flex;flex-direction:column;align-items:center;">
                            <i class="fas fa-exclamation-triangle" style="font-size:48px;color:#f59e0b;margin-bottom:16px;"></i>
                            <p style="color:#dc2626;font-weight:500;margin-bottom:8px;">${errorMsg}</p>
                            <button onclick="loadStudents(0)" style="margin-top:16px;" class="btn btn-outline">
                                <i class="fas fa-sync-alt" style="margin-right:8px;"></i>Retry
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        }
        
        // Reset pagination counts
        updatePaginationCounts(0, 0, 0);
        
    } finally {
        showLoading(false);
    }
}

// Update pagination display - FIXED VERSION
function updatePaginationDisplay() {
    // Calculate start and end indices
    const start = totalElements > 0 ? (currentPage * PAGE_SIZE) + 1 : 0;
    const end = Math.min((currentPage + 1) * PAGE_SIZE, totalElements);
    
    console.log(`[Pagination] Updating: Start=${start}, End=${end}, Total=${totalElements}, CurrentPage=${currentPage}, TotalPages=${totalPages}`);
    
    // Update the text displays
    updatePaginationCounts(start, end, totalElements);
    
    // Update prev/next buttons
    const prevBtn = document.getElementById('prevBtn');
    const nextBtn = document.getElementById('nextBtn');
    
    if (prevBtn) {
        prevBtn.disabled = currentPage === 0 || totalElements === 0;
        // Remove existing onclick and add new one
        prevBtn.onclick = () => {
            if (currentPage > 0) {
                loadStudents(currentPage - 1);
            }
        };
    }
    
    if (nextBtn) {
        nextBtn.disabled = currentPage >= totalPages - 1 || totalElements === 0;
        nextBtn.onclick = () => {
            if (currentPage < totalPages - 1) {
                loadStudents(currentPage + 1);
            }
        };
    }
    
    // Generate page numbers
    const pageNumbers = document.getElementById('pageNumbers');
    if (!pageNumbers) return;
    
    pageNumbers.innerHTML = '';
    
    if (totalPages === 0 || totalPages === 1) {
        const pageBtn = document.createElement('button');
        pageBtn.textContent = '1';
        pageBtn.className = 'px-3 py-1 border rounded-lg text-sm transition-all bg-blue-600 text-white border-blue-600';
        pageBtn.disabled = true;
        pageNumbers.appendChild(pageBtn);
        return;
    }
    
    let startPage = Math.max(0, currentPage - 2);
    let endPage = Math.min(totalPages - 1, startPage + 4);
    
    if (endPage - startPage < 4 && startPage > 0) {
        startPage = Math.max(0, endPage - 4);
    }
    
    // First page
    if (startPage > 0) {
        const firstBtn = document.createElement('button');
        firstBtn.textContent = '1';
        firstBtn.className = 'px-3 py-1 border rounded-lg text-sm transition-all border-gray-300 hover:bg-gray-100';
        firstBtn.onclick = () => loadStudents(0);
        pageNumbers.appendChild(firstBtn);
        
        if (startPage > 1) {
            const dots = document.createElement('span');
            dots.textContent = '...';
            dots.className = 'px-2 text-gray-500';
            pageNumbers.appendChild(dots);
        }
    }
    
    // Page numbers
    for (let i = startPage; i <= endPage; i++) {
        const pageBtn = document.createElement('button');
        pageBtn.textContent = i + 1;
        pageBtn.className = `px-3 py-1 border rounded-lg text-sm transition-all ${
            i === currentPage 
                ? 'bg-blue-600 text-white border-blue-600' 
                : 'border-gray-300 hover:bg-gray-100'
        }`;
        pageBtn.onclick = () => loadStudents(i);
        pageNumbers.appendChild(pageBtn);
    }
    
    // Last page
    if (endPage < totalPages - 1) {
        if (endPage < totalPages - 2) {
            const dots = document.createElement('span');
            dots.textContent = '...';
            dots.className = 'px-2 text-gray-500';
            pageNumbers.appendChild(dots);
        }
        
        const lastBtn = document.createElement('button');
        lastBtn.textContent = totalPages;
        lastBtn.className = 'px-3 py-1 border rounded-lg text-sm transition-all border-gray-300 hover:bg-gray-100';
        lastBtn.onclick = () => loadStudents(totalPages - 1);
        pageNumbers.appendChild(lastBtn);
    }
}

function updatePaginationCounts(start, end, total) {
    const elements = {
        'startCount': start,
        'endCount': end,
        'totalCount': total,
        'totalCountDisplay': total
    };
    
    Object.entries(elements).forEach(([id, value]) => {
        const element = document.getElementById(id);
        if (element) {
            element.textContent = value;
            console.log(`[Pagination] Set ${id} to ${value}`);
        }
    });
}

// Debug function to check current pagination state
function debugPagination() {
    console.log('=== PAGINATION DEBUG ===');
    console.log('totalElements:', totalElements);
    console.log('currentPage:', currentPage);
    console.log('totalPages:', totalPages);
    console.log('PAGE_SIZE:', PAGE_SIZE);
    console.log('Start:', totalElements > 0 ? (currentPage * PAGE_SIZE) + 1 : 0);
    console.log('End:', Math.min((currentPage + 1) * PAGE_SIZE, totalElements));
    
    const startEl = document.getElementById('startCount');
    const endEl = document.getElementById('endCount');
    const totalEl = document.getElementById('totalCount');
    
    console.log('DOM Elements:');
    console.log('- startCount:', startEl?.textContent);
    console.log('- endCount:', endEl?.textContent);
    console.log('- totalCount:', totalEl?.textContent);
}
// ─────────────────────────────────────────────────────────────
//  2. RENDER STUDENT TABLE
// ─────────────────────────────────────────────────────────────
function renderStudentTable(students) {
    const tbody = document.getElementById('studentTableBody');
    if (!tbody) return;

    if (!students || students.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="6" style="text-align:center;padding:60px 20px;">
                    <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;">
                        <i class="fas fa-user-graduate" style="font-size:48px;color:#cbd5e1;margin-bottom:16px;"></i>
                        <p style="color:#64748b;font-size:16px;font-weight:500;">No students found</p>
                        <p style="color:#94a3b8;font-size:14px;margin-top:8px;">Click "Add New Student" to create your first student record</p>
                    </div>
                </td>
            </tr>
        `;
        return;
    }

    tbody.innerHTML = students.map(s => {
        const fees = s.feesDetails || {};
        const isActive = (s.status || '').toLowerCase() === 'active';
        const avatar = s.profileImageUrl
            ? `<img src="${BASE_URL}${s.profileImageUrl}" class="h-10 w-10 rounded-full object-cover" alt="photo">`
            : `<div class="h-10 w-10 bg-blue-100 rounded-full flex items-center justify-center">
                   <i class="fas fa-user-graduate text-blue-600"></i></div>`;
        
        return `
            <tr class="hover:bg-gray-50 transition-colors">
                <td class="px-4 lg:px-6 py-4">
                    <input type="checkbox" class="student-checkbox rounded border-gray-300" data-id="${s.stdId || s.id}">
                </td>
                <td class="px-4 lg:px-6 py-4">
                    <div class="flex items-center">
                        ${avatar}
                        <div class="ml-3">
                            <p class="font-semibold text-gray-800">${s.firstName || ''} ${s.lastName || ''}</p>
                            <p class="text-sm text-gray-500">ID: ${s.studentId || '-'}</p>
                            <div class="flex items-center mt-1">
                                <i class="fas fa-circle ${isActive ? 'text-green-500' : 'text-red-500'} mr-1 text-xs"></i>
                                <span class="text-xs ${isActive ? 'text-green-600' : 'text-red-600'}">${isActive ? 'Active' : 'Inactive'}</span>
                            </div>
                        </div>
                    </div>
                </td>
                <td class="px-4 lg:px-6 py-4">
                    <p class="font-medium text-gray-800">Class ${s.currentClass || '-'} ${s.section || ''}</p>
                    <p class="text-sm text-gray-500">Roll: ${s.studentRollNumber || '-'}</p>
                </td>
                <td class="px-4 lg:px-6 py-4">
                    <p class="text-sm text-gray-800">${s.fatherName || '-'}</p>
                    <p class="text-sm text-gray-500">${s.fatherPhone || s.motherPhone || '-'}</p>
                    <p class="text-sm text-gray-500">${s.fatherEmail || s.motherEmail || '-'}</p>
                </td>
                <td class="px-4 lg:px-6 py-4">${buildFeeBadge(fees)}</td>
                <td class="px-4 lg:px-6 py-4">
                    <div class="flex space-x-2">
                        <button onclick="viewStudent(${s.stdId || s.id})" class="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-all" title="View">
                            <i class="fas fa-eye"></i>
                        </button>
                        <button onclick="editStudent(${s.stdId || s.id})" class="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-all" title="Edit">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button onclick="deleteStudent(${s.stdId || s.id})" class="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-all" title="Delete">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}

// ─────────────────────────────────────────────────────────────
//  FEE BADGE HELPER
// ─────────────────────────────────────────────────────────────
function buildFeeBadge(fees) {
    if (!fees) return '<span class="status-badge status-pending">No Fees Set</span>';
    const insts       = fees.installmentsList || [];
    const paidCount   = insts.filter(i => i.status === 'PAID').length;
    const pendCount   = insts.filter(i => i.status === 'PENDING' || i.status === 'OVERDUE').length;
    const pills       = insts.length ? `
        <div style="display:flex;gap:4px;margin-top:4px;flex-wrap:wrap;">
            <span style="background:#d1fae5;color:#065f46;border-radius:999px;padding:1px 7px;font-size:11px;font-weight:600;">✓ ${paidCount} Paid</span>
            ${pendCount > 0 ? `<span style="background:#fee2e2;color:#991b1b;border-radius:999px;padding:1px 7px;font-size:11px;font-weight:600;">⏳ ${pendCount} Pending</span>` : ''}
        </div>` : '';
    const status = fees.paymentStatus || '';
    const remain = (fees.remainingFees || 0).toLocaleString('en-IN');
    if (status === 'FULLY PAID')     return `<div><span class="status-badge status-paid">✅ Fully Paid</span>${pills}</div>`;
    if (status === 'PARTIALLY PAID') return `<div><span class="status-badge status-partial">Partial — ₹${remain} left</span>${pills}</div>`;
    return `<div><span class="status-badge status-pending">Pending ₹${remain}</span>${pills}</div>`;
}

// ─────────────────────────────────────────────────────────────
//  3. PAGINATION
// ─────────────────────────────────────────────────────────────
function renderPagination() {
    console.log(`[renderPagination] Current page: ${currentPage}, Total pages: ${totalPages}, Total elements: ${totalElements}`);
    
    // Calculate start and end indices
    const start = totalElements > 0 ? (currentPage * PAGE_SIZE) + 1 : 0;
    const end = Math.min((currentPage + 1) * PAGE_SIZE, totalElements);
    
    // Update pagination text
    updatePaginationCounts(start, end, totalElements);
    
    // Get pagination buttons
    const prevBtn = document.getElementById('prevBtn');
    const nextBtn = document.getElementById('nextBtn');
    
    if (prevBtn) {
        prevBtn.disabled = currentPage === 0 || totalPages === 0;
        prevBtn.onclick = () => {
            if (currentPage > 0) {
                loadStudents(currentPage - 1);
            }
        };
    }
    
    if (nextBtn) {
        nextBtn.disabled = currentPage >= totalPages - 1 || totalPages === 0;
        nextBtn.onclick = () => {
            if (currentPage < totalPages - 1) {
                loadStudents(currentPage + 1);
            }
        };
    }
    
    // Generate page numbers
    const pageNumbers = document.getElementById('pageNumbers');
    if (!pageNumbers) return;
    
    pageNumbers.innerHTML = '';
    
    if (totalPages === 0 || totalPages === 1) {
        // Show single page indicator
        const pageBtn = document.createElement('button');
        pageBtn.textContent = '1';
        pageBtn.className = 'px-3 py-1 border rounded-lg text-sm transition-all bg-blue-600 text-white border-blue-600';
        pageBtn.disabled = true;
        pageNumbers.appendChild(pageBtn);
        return;
    }
    
    // Calculate visible page range
    let startPage = Math.max(0, currentPage - 2);
    let endPage = Math.min(totalPages - 1, startPage + 4);
    
    if (endPage - startPage < 4) {
        startPage = Math.max(0, endPage - 4);
    }
    
    // Add first page button if not in range
    if (startPage > 0) {
        const firstBtn = document.createElement('button');
        firstBtn.textContent = '1';
        firstBtn.className = 'px-3 py-1 border rounded-lg text-sm transition-all border-gray-300 hover:bg-gray-100';
        firstBtn.onclick = () => loadStudents(0);
        pageNumbers.appendChild(firstBtn);
        
        if (startPage > 1) {
            const dots = document.createElement('span');
            dots.textContent = '...';
            dots.className = 'px-2 text-gray-500';
            pageNumbers.appendChild(dots);
        }
    }
    
    // Add page buttons
    for (let i = startPage; i <= endPage; i++) {
        const pageBtn = document.createElement('button');
        pageBtn.textContent = i + 1;
        pageBtn.className = `px-3 py-1 border rounded-lg text-sm transition-all ${
            i === currentPage 
                ? 'bg-blue-600 text-white border-blue-600' 
                : 'border-gray-300 hover:bg-gray-100'
        }`;
        pageBtn.onclick = () => loadStudents(i);
        pageNumbers.appendChild(pageBtn);
    }
    
    // Add last page button if not in range
    if (endPage < totalPages - 1) {
        if (endPage < totalPages - 2) {
            const dots = document.createElement('span');
            dots.textContent = '...';
            dots.className = 'px-2 text-gray-500';
            pageNumbers.appendChild(dots);
        }
        
        const lastBtn = document.createElement('button');
        lastBtn.textContent = totalPages;
        lastBtn.className = 'px-3 py-1 border rounded-lg text-sm transition-all border-gray-300 hover:bg-gray-100';
        lastBtn.onclick = () => loadStudents(totalPages - 1);
        pageNumbers.appendChild(lastBtn);
    }
}

// Helper function to update pagination counts
function updatePaginationCounts(start, end, total) {
    const setText = (id, value) => {
        const element = document.getElementById(id);
        if (element) element.textContent = value;
    };
    
    setText('startCount', start);
    setText('endCount', end);
    setText('totalCount', total);
    setText('totalCountDisplay', total);
    
    console.log(`[Pagination] Showing ${start} to ${end} of ${total} students`);
}

// ─────────────────────────────────────────────────────────────
//  4. STATS - FIXED to not fetch pending fees on add page
// ─────────────────────────────────────────────────────────────
async function updateStats(pageData) {
    const setText = (id, v) => { const e = document.getElementById(id); if (e) e.textContent = v; };
    setText('totalStudentsCount', pageData.totalElements || 0);

    // Check if we're on the add student page - if so, don't fetch fees
    const isAddPage = document.getElementById('addStudentSection')?.classList.contains('hidden') === false;
    if (isAddPage) {
        console.log('On add student page - skipping fees fetch');
        return;
    }

    try {
        const res = await fetch(`${BASE_URL}/api/students/get-student-statistics`, { headers: getAuthHeaders() });
        if (res.ok) {
            const s = await res.json();
            setText('totalStudentsCount',  s.totalStudents    || s.total  || pageData.totalElements || 0);
            setText('activeStudentsCount', s.activeStudents   || s.active || 0);
            setText('pendingFeesCount',    s.pendingFeesCount || s.pendingStudents || 0);
            if (!s.pendingFeesCount && !s.pendingStudents) fetchPendingFeesCount();
            return;
        }
    } catch (_) {}

    try {
        const res = await fetch(`${BASE_URL}/api/students/get-students-by-status/active`, { headers: getAuthHeaders() });
        if (res.ok) {
            const list = await res.json();
            setText('activeStudentsCount', Array.isArray(list) ? list.length : (list.content?.length || 0));
        }
    } catch (_) {}

    // Only fetch pending fees if we're on the all students page
    if (!isAddPage) {
        fetchPendingFeesCount();
    }
}

// Also update fetchPendingFeesCount to handle errors gracefully
async function fetchPendingFeesCount() {
    // Don't fetch if on add page
    const isAddPage = document.getElementById('addStudentSection')?.classList.contains('hidden') === false;
    if (isAddPage) {
        return;
    }
    
    try {
        const res = await fetch(`${BASE_URL}/api/fees/get-all-pending-fees`, { headers: getAuthHeaders() });
        if (res.ok) {
            const data = await res.json();
            const el   = document.getElementById('pendingFeesCount');
            if (el) el.textContent = Array.isArray(data) ? data.length : (data.totalElements || 0);
        } else {
            console.warn('Failed to fetch pending fees:', res.status);
            // Set a default value instead of showing error
            const el = document.getElementById('pendingFeesCount');
            if (el) el.textContent = '0';
        }
    } catch (err) {
        console.warn('Error fetching pending fees:', err.message);
        // Silently fail - don't show error to user
        const el = document.getElementById('pendingFeesCount');
        if (el) el.textContent = '0';
    }
}

function resetFilters() {
    clearTimeout(searchDebounce);

    document.getElementById('searchStudent').value = '';
    document.getElementById('filterClass').value = '';
    document.getElementById('filterSection').value = '';
    document.getElementById('filterStudentStatus').value = '';

    // ✅ Reload properly with pagination restored
    loadStudents(0);

    toastInfo('All filters cleared');
}
// ─────────────────────────────────────────────────────────────
//  5. SEARCH & FILTER - IMPROVED VERSION
// ─────────────────────────────────────────────────────────────
function searchAndFilter() {
    clearTimeout(searchDebounce);
    searchDebounce = setTimeout(async () => {
        const query  = document.getElementById('searchStudent')?.value.trim() || '';
        const cls    = document.getElementById('filterClass')?.value || '';
        const sect   = document.getElementById('filterSection')?.value || '';
        const status = document.getElementById('filterStudentStatus')?.value || '';

        console.log('Search query:', query);
        console.log('Class filter:', cls);
        console.log('Section filter:', sect);
        console.log('Status filter:', status);

        // If no filters, load all students
        if (!query && !cls && !sect && !status) {
            await loadStudents(0);
            return;
        }

        showLoading(true);
        
        try {
            let students = [];
            
            // If search query is provided, search by name, roll number, or student ID
            if (query) {
                // Search by multiple criteria
                const searchPromises = [];
                
                // Search by name (first name or last name)
                searchPromises.push(
                    fetch(`${BASE_URL}/api/students/search-students?name=${encodeURIComponent(query)}`, 
                        { headers: getAuthHeaders() })
                        .then(res => res.ok ? res.json() : [])
                );
                
                // Search by student ID
                searchPromises.push(
                    fetch(`${BASE_URL}/api/students/search-by-student-id?studentId=${encodeURIComponent(query)}`, 
                        { headers: getAuthHeaders() })
                        .then(res => res.ok ? res.json() : [])
                );
                
                // Search by roll number
                searchPromises.push(
                    fetch(`${BASE_URL}/api/students/search-by-roll-number?rollNumber=${encodeURIComponent(query)}`, 
                        { headers: getAuthHeaders() })
                        .then(res => res.ok ? res.json() : [])
                );
                
                const results = await Promise.allSettled(searchPromises);
                
                // Combine and deduplicate results
                const studentMap = new Map();
                
                results.forEach(result => {
                    if (result.status === 'fulfilled') {
                        const data = result.value;
                        const studentList = Array.isArray(data) ? data : (data.content || []);
                        studentList.forEach(student => {
                            if (student.stdId) {
                                studentMap.set(student.stdId, student);
                            }
                        });
                    }
                });
                
                students = Array.from(studentMap.values());
                console.log(`Found ${students.length} students matching "${query}"`);
            } 
            // If class/section filters are provided
            else if (cls && sect) {
                const res = await fetch(
                    `${BASE_URL}/api/students/get-students-by-class-section?className=${encodeURIComponent(cls)}&section=${encodeURIComponent(sect)}`,
                    { headers: getAuthHeaders() }
                );
                const data = await res.json();
                students = Array.isArray(data) ? data : (data.content || []);
            } 
            else if (cls) {
                const res = await fetch(
                    `${BASE_URL}/api/students/get-students-by-class/${encodeURIComponent(cls)}`,
                    { headers: getAuthHeaders() }
                );
                const data = await res.json();
                students = Array.isArray(data) ? data : (data.content || []);
            } 
            else if (status) {
                const res = await fetch(
                    `${BASE_URL}/api/students/get-students-by-status/${encodeURIComponent(status)}`,
                    { headers: getAuthHeaders() }
                );
                const data = await res.json();
                students = Array.isArray(data) ? data : (data.content || []);
            }
            
            // Apply additional filters if both search and class/section are present
            if (query && (cls || sect || status)) {
                students = students.filter(student => {
                    let match = true;
                    
                    if (cls && student.currentClass !== cls) match = false;
                    if (sect && student.section !== sect) match = false;
                    if (status && student.status !== status) match = false;
                    
                    return match;
                });
            }
            
            // Render the filtered results
            renderStudentTable(students);
            
            // Update counts
            const setText = (id, v) => { 
                const e = document.getElementById(id); 
                if (e) e.textContent = v; 
            };
            
            setText('totalCount', students.length);
            setText('startCount', students.length ? 1 : 0);
            setText('endCount', students.length);
            setText('totalCountDisplay', students.length);
            
            // Hide pagination controls when searching
            const pageNumbers = document.getElementById('pageNumbers');
            if (pageNumbers) pageNumbers.innerHTML = '';
            
            const prevBtn = document.getElementById('prevBtn');
            const nextBtn = document.getElementById('nextBtn');
            if (prevBtn) prevBtn.disabled = true;
            if (nextBtn) nextBtn.disabled = true;
            
        } catch (err) {
            console.error('Search failed:', err);
            toastError('Search failed: ' + err.message);
        } finally {
            showLoading(false);
        }
    }, 400);
}

// ─────────────────────────────────────────────────────────────
//  RESET FILTERS FUNCTION
// ─────────────────────────────────────────────────────────────
function resetFilters() {
    console.log('Resetting all filters...');
    
    // Clear search input
    const searchInput = document.getElementById('searchStudent');
    if (searchInput) searchInput.value = '';
    
    // Reset class filter
    const classFilter = document.getElementById('filterClass');
    if (classFilter) classFilter.value = '';
    
    // Reset section filter
    const sectionFilter = document.getElementById('filterSection');
    if (sectionFilter) sectionFilter.value = '';
    
    // Reset status filter
    const statusFilter = document.getElementById('filterStudentStatus');
    if (statusFilter) statusFilter.value = '';
    
    // Reload all students
    loadStudents(0);
    
    toastInfo('Filters reset successfully');
}

// ─────────────────────────────────────────────────────────────
//  6. LOAD CLASSES → TEACHERS → ACADEMIC YEAR
// ─────────────────────────────────────────────────────────────
async function loadClassesIntoFilters() {
    try {
        console.log('[Classes] Fetching classes from API...');
        const res = await fetch(`${BASE_URL}/api/classes/get-classes-by-status/ACTIVE`, { 
            headers: getAuthHeaders() 
        });
        
        if (!res.ok) {
            console.error('[Classes] API returned error:', res.status);
            return;
        }

        allClassesData = await res.json();
        console.log('[Classes] Loaded:', allClassesData);
        
        if (!allClassesData || allClassesData.length === 0) {
            console.warn('[Classes] No classes found in database');
            return;
        }
        
        // Get unique class names from backend
        const classNames = [...new Set(allClassesData.map(c => c.className))].sort();
        console.log('[Classes] Class names from backend:', classNames);
        
        // Get all sections for filter dropdown
        const allSections = [...new Set(allClassesData.map(c => c.section).filter(Boolean))].sort();
        console.log('[Classes] All sections from backend:', allSections);

        // ===== POPULATE FILTER DROPDOWNS =====
        
        // Filter - Class dropdown
        const filterClass = document.getElementById('filterClass');
        if (filterClass) {
            filterClass.innerHTML = '<option value="">All Classes</option>';
            classNames.forEach(name => {
                const opt = document.createElement('option');
                opt.value = name;
                opt.textContent = name;
                filterClass.appendChild(opt);
            });
            console.log('[Classes] Filter class dropdown populated');
        }

        // Filter - Section dropdown
        const filterSection = document.getElementById('filterSection');
        if (filterSection) {
            filterSection.innerHTML = '<option value="">All Sections</option>';
            allSections.forEach(section => {
                const opt = document.createElement('option');
                opt.value = section;
                opt.textContent = `Section ${section}`;
                filterSection.appendChild(opt);
            });
            console.log('[Classes] Filter section dropdown populated');
        }

        // ===== POPULATE ADD STUDENT FORM DROPDOWNS =====
        
        // Form - Class dropdown (using ID)
        const formClassSelect = document.getElementById('formClassSelect');
        if (formClassSelect) {
            formClassSelect.innerHTML = '<option value="">Select Class</option>';
            classNames.forEach(name => {
                const opt = document.createElement('option');
                opt.value = name;
                opt.textContent = name;
                formClassSelect.appendChild(opt);
            });
            console.log('[Classes] Form class dropdown populated with:', classNames);
            
            // Add change event listener to load sections for selected class
            formClassSelect.addEventListener('change', function() {
                console.log('Class selected:', this.value);
                loadSubjectsForClass(this.value);
                loadSectionsForClass(this.value);
            });
            
            // If there's a preselected value (during edit), trigger change
            if (formClassSelect.value) {
                formClassSelect.dispatchEvent(new Event('change'));
            }
        } else {
            console.error('[Classes] Form class select element not found!');
        }

        // Initialize section dropdown (empty until class is selected)
        const formSectionSelect = document.getElementById('formSectionSelect');
        if (formSectionSelect) {
            formSectionSelect.innerHTML = '<option value="">Select Section</option>';
            formSectionSelect.disabled = true;
        }

    } catch (err) {
        console.error('[Classes] Load failed:', err.message);
    }

    await Promise.all([loadTeachersIntoDropdown(), loadAcademicYears()]);
}

// Load sections based on selected class
function loadSectionsForClass(selectedClassName) {
    console.log('Loading sections for class:', selectedClassName);
    const sectionSelect = document.getElementById('formSectionSelect');
    if (!sectionSelect) {
        console.error('Section select element not found!');
        return;
    }

    if (!selectedClassName) {
        sectionSelect.innerHTML = '<option value="">Select Section</option>';
        sectionSelect.disabled = true;
        return;
    }

    sectionSelect.disabled = false;
    sectionSelect.innerHTML = '<option value="">Loading sections...</option>';

    // Debug: Log all classes data
    console.log('All classes data:', allClassesData);

    // Filter classes that match the selected class name
    const matchingClasses = allClassesData.filter(c => {
        // Convert both to string and trim for comparison
        const className = String(c.className || '').trim();
        const selectedClass = String(selectedClassName || '').trim();
        return className === selectedClass;
    });

    console.log('Matching classes:', matchingClasses);

    // Extract sections from matching classes
    const sections = [];
    matchingClasses.forEach(c => {
        if (c.section) {
            console.log(`Found section: "${c.section}" for class:`, c.className);
            sections.push(c.section);
        }
    });

    // Get unique sections
    const uniqueSections = [...new Set(sections)].sort();
    console.log('Unique sections found:', uniqueSections);

    if (uniqueSections.length === 0) {
        sectionSelect.innerHTML = '<option value="">No sections available</option>';
        return;
    }

    sectionSelect.innerHTML = '<option value="">Select Section</option>';
    uniqueSections.forEach(section => {
        const opt = document.createElement('option');
        opt.value = section;
        opt.textContent = `Section ${section}`;
        sectionSelect.appendChild(opt);
    });
    
    console.log('Section dropdown populated with', uniqueSections.length, 'options');
}

// ─────────────────────────────────────────────────────────────
//  LOAD TEACHERS
// ─────────────────────────────────────────────────────────────
async function loadTeachersIntoDropdown() {
    try {
        const res = await fetch(`${BASE_URL}/api/teachers/get-all-teachers`, { headers: getAuthHeaders() });
        if (!res.ok) return;
        const resp     = await res.json();
        const teachers = resp.data || resp || [];
        const dropdown = document.getElementById('classTeacherDropdown');
        if (!dropdown) return;

        dropdown.innerHTML = '<option value="">Select Class Teacher</option>';
        teachers.forEach(t => {
            const name = [t.firstName, t.lastName].filter(Boolean).join(' ');
            const opt  = document.createElement('option');
            opt.value  = name; opt.textContent = name;
            opt.dataset.teacherId = t.teacherId || t.id || '';
            dropdown.appendChild(opt);
        });
        console.log(`[Teachers] Loaded ${teachers.length} teachers`);
    } catch (err) {
        console.warn('[Teachers] Load failed:', err.message);
    }
}

// ─────────────────────────────────────────────────────────────
//  ACADEMIC YEAR — Auto-generate (no API needed)
// ─────────────────────────────────────────────────────────────
function loadAcademicYears() {
    const dropdown = document.getElementById('academicYearDropdown');
    if (!dropdown) return;

    const cur   = new Date().getFullYear();
    const years = [-1, 0, 1, 2].map(offset => `${cur + offset}-${cur + offset + 1}`);

    dropdown.innerHTML = '<option value="">Select Year</option>';
    years.forEach(y => {
        const opt = document.createElement('option');
        opt.value = y; opt.textContent = y;
        if (y === `${cur}-${cur + 1}`) opt.selected = true;
        dropdown.appendChild(opt);
    });
    console.log('[Academic Years] Loaded:', years);
}

// ─────────────────────────────────────────────────────────────
//  LOAD SUBJECTS WHEN CLASS IS SELECTED
// ─────────────────────────────────────────────────────────────
function loadSubjectsForClass(selectedClassName, preChecked = []) {
    const container = document.getElementById('subjectsContainer');
    if (!container) return;

    if (!selectedClassName) {
        container.innerHTML = '<p class="text-sm text-gray-400 italic col-span-4">Please select a class first.</p>';
        return;
    }

    const matches  = allClassesData.filter(c =>
        (c.className || '').toLowerCase() === selectedClassName.toLowerCase()
    );

    const subjectSet = new Set();
    matches.forEach(c => {
        if (c.classTeacherSubject?.trim())      subjectSet.add(c.classTeacherSubject.trim());
        if (c.assistantTeacherSubject?.trim())  subjectSet.add(c.assistantTeacherSubject.trim());
        (c.otherTeacherSubject || []).forEach(teacher =>
            (teacher.subjects || []).forEach(sub => {
                const name = (sub.subjectName || sub.name || '').trim();
                if (name) subjectSet.add(name);
            })
        );
    });

    const subjects = [...subjectSet].sort();
    console.log('[Subjects] For', selectedClassName, ':', subjects);

    if (!subjects.length) {
        container.innerHTML = `
            <div class="col-span-4 text-center py-4">
                <p class="text-sm text-orange-500 font-medium">⚠️ No subjects found for "${selectedClassName}".</p>
                <p class="text-xs text-gray-400 mt-1">Please assign subjects when creating this class.</p>
            </div>`;
        return;
    }

    container.innerHTML = subjects.map(subj => {
        const id        = 'subj_' + subj.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
        const isChecked = preChecked.some(p => p.toLowerCase().trim() === subj.toLowerCase().trim());
        return `
            <label class="flex items-center gap-3 p-3 border-2 ${isChecked ? 'border-blue-500 bg-blue-50' : 'border-gray-200'}
                   rounded-xl cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-all select-none">
                <input type="checkbox" id="${id}" name="subjects[]" value="${subj}" ${isChecked ? 'checked' : ''}
                       class="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                       onchange="this.closest('label').classList.toggle('border-blue-500', this.checked);
                                 this.closest('label').classList.toggle('bg-blue-50',      this.checked);
                                 this.closest('label').classList.toggle('border-gray-200', !this.checked);">
                <span class="text-sm font-medium text-gray-700">${subj}</span>
            </label>`;
    }).join('');
}

// ─────────────────────────────────────────────────────────────
//  7. VIEW STUDENT MODAL
// ─────────────────────────────────────────────────────────────
async function viewStudent(stdId) {
    showLoading(true);
    try {
        const res = await fetch(`${BASE_URL}/api/students/get-student-by-id/${stdId}`, { headers: getAuthHeaders() });
        if (!res.ok) throw new Error('Student not found');
        renderViewModal(await res.json());
    } catch (err) {
        toastError('Could not load student: ' + err.message);
    } finally {
        showLoading(false);
    }
}

function renderViewModal(student) {
    const modal = document.getElementById('viewModalOverlay');
    if (!modal) return;
    modal.classList.add('show');

    const fees       = student.feesDetails || {};
    const nameStr    = [student.firstName, student.middleName, student.lastName].filter(Boolean).join(' ');
    const isActive   = (student.status || '').toLowerCase() === 'active';
    const profileSrc = student.profileImageUrl ? `${BASE_URL}${student.profileImageUrl}` : null;

    const buildInstRows = () => {
        const insts = fees.installmentsList || [];
        if (!insts.length) return '';
        const paid    = insts.filter(i => i.status === 'PAID');
        const pending = insts.filter(i => i.status !== 'PAID');
        const paidAmt = paid   .reduce((s, i) => s + (i.amount || 0), 0);
        const pendAmt = pending.reduce((s, i) => s + (i.amount || 0), 0);

        const rows = insts.map((inst, idx) => {
            const isPaid    = inst.status === 'PAID';
            const isOverdue = inst.status === 'OVERDUE';
            const dot  = isPaid ? '#22c55e' : isOverdue ? '#f59e0b' : '#ef4444';
            const amt  = isPaid ? '#16a34a' : isOverdue ? '#d97706' : '#dc2626';
            const bg   = isPaid ? '#d1fae5' : isOverdue ? '#fef3c7' : '#fee2e2';
            const txt  = isPaid ? '#065f46' : isOverdue ? '#92400e' : '#991b1b';
            const date = isPaid ? `Paid: ${formatDate(inst.paidDate)}` : `Due: ${formatDate(inst.dueDate)}`;
            return `
                <div style="display:flex;align-items:center;justify-content:space-between;padding:6px 0;border-bottom:1px solid #f3f4f6;">
                    <div style="display:flex;align-items:center;gap:8px;">
                        <span style="width:8px;height:8px;border-radius:50%;background:${dot};flex-shrink:0;"></span>
                        <div>
                            <span style="font-size:12px;font-weight:600;color:#374151;">Inst ${idx + 1}</span>
                            <span style="font-size:11px;color:#9ca3af;display:block;">${date}</span>
                        </div>
                    </div>
                    <div style="text-align:right;">
                        <span style="font-size:12px;font-weight:700;color:${amt};">₹${(inst.amount||0).toLocaleString('en-IN')}</span>
                        <span style="font-size:10px;padding:1px 7px;border-radius:999px;display:block;margin-top:2px;font-weight:600;background:${bg};color:${txt};">${inst.status}</span>
                    </div>
                </div>`;
        }).join('');

        return `
            <div class="pt-2 border-t mt-2">
                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
                    <span class="font-semibold text-gray-700">Installments (${insts.length})</span>
                    <div style="display:flex;gap:6px;">
                        <span style="background:#d1fae5;color:#065f46;font-size:11px;font-weight:700;padding:2px 8px;border-radius:999px;">✓ ${paid.length} Paid</span>
                        ${pending.length ? `<span style="background:#fee2e2;color:#991b1b;font-size:11px;font-weight:700;padding:2px 8px;border-radius:999px;">⏳ ${pending.length} Pending</span>` : ''}
                    </div>
                </div>
                ${rows}
                <div style="display:flex;justify-content:space-between;padding-top:6px;font-size:12px;margin-top:4px;">
                    <span style="color:#16a34a;font-weight:600;">Paid: ₹${paidAmt.toLocaleString('en-IN')}</span>
                    <span style="color:#dc2626;font-weight:600;">Pending: ₹${pendAmt.toLocaleString('en-IN')}</span>
                </div>
            </div>`;
    };

    const mc = modal.querySelector('.modal-content');
    if (!mc) return;
    mc.innerHTML = `
        <div class="p-6 lg:p-8">
            <div class="flex justify-between items-center mb-6">
                <h3 class="text-xl lg:text-2xl font-bold text-gray-800">Student Details — ${nameStr}</h3>
                <button onclick="closeModal('viewModalOverlay')" class="text-gray-500 hover:text-gray-700 p-2">
                    <i class="fas fa-times text-2xl"></i>
                </button>
            </div>
            <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <!-- Left column -->
                <div class="space-y-4">
                    <div class="bg-gradient-to-br from-blue-50 to-purple-50 rounded-xl p-6 text-center">
                        <div class="h-28 w-28 rounded-full mx-auto mb-3 overflow-hidden border-4 border-white shadow-lg flex items-center justify-center bg-gray-200">
                            ${profileSrc ? `<img src="${profileSrc}" class="h-full w-full object-cover">` : `<i class="fas fa-user-graduate text-5xl text-blue-400"></i>`}
                        </div>
                        <h4 class="text-lg font-bold text-gray-800">${nameStr}</h4>
                        <p class="text-gray-500 text-sm">${student.studentId||''}</p>
                        <div class="mt-2 flex justify-center flex-wrap gap-2">
                            <span class="px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">Class ${student.currentClass||'-'} — ${student.section||'-'}</span>
                            <span class="px-3 py-1 rounded-full text-xs font-medium ${isActive?'bg-green-100 text-green-800':'bg-red-100 text-red-800'}">${student.status||'-'}</span>
                        </div>
                        <p class="text-sm text-gray-500 mt-1">Roll: ${student.studentRollNumber||'-'}</p>
                    </div>
                    <!-- Fee Status -->
                    <div class="bg-white rounded-xl border border-gray-200 p-4">
                        <h5 class="font-semibold text-gray-700 mb-3">Fee Status</h5>
                        <div class="space-y-1 text-sm">
                            ${feeRow('Total Fees',   '₹'+(fees.totalFees    ||0).toLocaleString('en-IN'))}
                            ${feeRow('Admission',    '₹'+(fees.admissionFees||0).toLocaleString('en-IN'))}
                            ${feeRow('Uniform',      '₹'+(fees.uniformFees  ||0).toLocaleString('en-IN'))}
                            ${feeRow('Books',        '₹'+(fees.bookFees     ||0).toLocaleString('en-IN'))}
                            ${feeRow('Tuition',      '₹'+(fees.tuitionFees  ||0).toLocaleString('en-IN'))}
                            <div class="pt-2 border-t mt-1">
                                ${feeRow('Initial Paid', `<span class="text-green-600 font-semibold">₹${(fees.initialAmount||0).toLocaleString('en-IN')}</span>`)}
                                ${feeRow('Total Paid',   `<span class="text-green-600 font-semibold">₹${((fees.totalFees||0)-(fees.remainingFees||0)).toLocaleString('en-IN')}</span>`)}
                                ${feeRow('Remaining',    `<span class="text-red-600 font-semibold">₹${(fees.remainingFees||0).toLocaleString('en-IN')}</span>`)}
                            </div>
                            <div class="pt-2 border-t mt-1">
                                ${feeRow('Payment Mode',   fees.paymentMode   || '-')}
                                ${feeRow('Payment Status', fees.paymentStatus || '-')}
                                ${fees.transactionId ? feeRow('Transaction ID', fees.transactionId) : ''}
                            </div>
                            ${buildInstRows()}
                        </div>
                    </div>
                    <!-- Documents -->
                    <div class="bg-white rounded-xl border border-gray-200 p-4">
                        <h5 class="font-semibold text-gray-700 mb-3">Documents</h5>
                        <div class="space-y-2 text-sm">
                            ${docLink('Profile Photo',        student.profileImageUrl,            student.stdId, 'profile-image')}
                            ${docLink('Student Aadhar',       student.studentAadharImageUrl,       student.stdId, 'aadhar-image')}
                            ${docLink('Father Aadhar',        student.fatherAadharImageUrl,        student.stdId, 'father-aadhar-image')}
                            ${docLink('Mother Aadhar',        student.motherAadharImageUrl,        student.stdId, 'mother-aadhar-image')}
                            ${docLink('Birth Certificate',    student.birthCertificateImageUrl,    student.stdId, 'birth-certificate')}
                            ${docLink('Transfer Certificate', student.transferCertificateImageUrl, student.stdId, 'transfer-certificate')}
                            ${docLink('Mark Sheet',           student.markSheetImageUrl,           student.stdId, 'marksheet')}
                        </div>
                    </div>
                </div>
                <!-- Right columns -->
                <div class="lg:col-span-2 space-y-4">
                    <div class="bg-white rounded-xl border border-gray-200 p-4">
                        <h5 class="font-semibold text-gray-700 mb-3">Personal Details</h5>
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                            ${infoRow('Date of Birth',  formatDate(student.dateOfBirth))}
                            ${infoRow('Gender',         student.gender        || '-')}
                            ${infoRow('Blood Group',    student.bloodGroup    || '-')}
                            ${infoRow('Caste Category', student.casteCategory || '-')}
                            ${infoRow('Aadhar Number',  student.aadharNumber  || '-')}
                            ${infoRow('Medical Info',   student.medicalInfo   || '-')}
                            ${infoRow('Previous School',student.previousSchool|| '-')}
                            ${infoRow('Sports',   (student.sportsActivity||[]).join(', ') || '-')}
                            ${infoRow('Subjects', (student.subjects||[]).join(', ')       || '-')}
                        </div>
                    </div>
                    <div class="bg-white rounded-xl border border-gray-200 p-4">
                        <h5 class="font-semibold text-gray-700 mb-3">Academic Details</h5>
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                            ${infoRow('Admission Date', formatDate(student.admissionDate))}
                            ${infoRow('Academic Year',  student.academicYear || '-')}
                            ${infoRow('Class Teacher',  student.classTeacher || '-')}
                        </div>
                    </div>
                    <div class="bg-white rounded-xl border border-gray-200 p-4">
                        <h5 class="font-semibold text-gray-700 mb-3">Parent / Guardian Details</h5>
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                            ${infoRow('Father Name',       student.fatherName       || '-')}
                            ${infoRow('Father Phone',      student.fatherPhone      || '-')}
                            ${infoRow('Father Email',      student.fatherEmail      || '-')}
                            ${infoRow('Father Occupation', student.fatherOccupation || '-')}
                            ${infoRow('Mother Name',       student.motherName       || '-')}
                            ${infoRow('Mother Phone',      student.motherPhone      || '-')}
                            ${infoRow('Mother Email',      student.motherEmail      || '-')}
                            ${infoRow('Mother Occupation', student.motherOccupation || '-')}
                            ${infoRow('Emergency Contact', student.emergencyContact || '-')}
                            ${infoRow('Emergency Relation',student.emergencyRelation|| '-')}
                        </div>
                    </div>
                    <div class="bg-white rounded-xl border border-gray-200 p-4">
                        <h5 class="font-semibold text-gray-700 mb-3">Address</h5>
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                            <div>
                                <p class="font-medium text-blue-600 mb-1">Local Address</p>
                                <p class="text-gray-700">${[student.localAddress,student.localCity,student.localState,student.localPincode].filter(Boolean).join(', ')||'-'}</p>
                            </div>
                            <div>
                                <p class="font-medium text-green-600 mb-1">Permanent Address</p>
                                <p class="text-gray-700">${[student.permanentAddress,student.permanentCity,student.permanentState,student.permanentPincode].filter(Boolean).join(', ')||'-'}</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            <div class="flex justify-end space-x-3 mt-6 pt-4 border-t border-gray-200">
                <button onclick="editStudent(${student.stdId}); closeModal('viewModalOverlay')"
                    class="px-5 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-all font-medium text-sm">
                    <i class="fas fa-edit mr-2"></i>Edit Student
                </button>
                <button onclick="closeModal('viewModalOverlay')"
                    class="px-5 py-2.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-all font-medium text-sm">
                    <i class="fas fa-times mr-2"></i>Close
                </button>
            </div>
        </div>`;
}

// Small helpers
const feeRow  = (label, val) =>
    `<div class="flex justify-between py-0.5"><span class="text-gray-500">${label}:</span><span>${val}</span></div>`;
const infoRow = (label, val) =>
    `<div><span class="text-gray-400 text-xs uppercase tracking-wide block">${label}</span><span class="font-medium text-gray-800">${val}</span></div>`;
const docLink = (label, url, stdId, endpoint) => url
    ? `<div class="flex justify-between items-center"><span class="text-gray-500">${label}:</span>
           <a href="${BASE_URL}/api/students/${stdId}/${endpoint}" target="_blank" class="text-blue-600 hover:underline text-xs"><i class="fas fa-external-link-alt mr-1"></i>View</a></div>`
    : `<div class="flex justify-between"><span class="text-gray-500">${label}:</span><span class="text-gray-400 italic text-xs">Not uploaded</span></div>`;
const formatDate = d => {
    if (!d) return '-';
    try { return new Date(d).toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' }); }
    catch { return d; }
};

// ─────────────────────────────────────────────────────────────
//  8. EDIT STUDENT
// ─────────────────────────────────────────────────────────────
async function editStudent(stdId) {
    showLoading(true);
    try {
        const res     = await fetch(`${BASE_URL}/api/students/get-student-by-id/${stdId}`, { headers: getAuthHeaders() });
        if (!res.ok) throw new Error('Student not found');
        const student = await res.json();

        editingStudentId = stdId;
        document.getElementById('allStudentsSection')?.classList.add('hidden');
        document.getElementById('addStudentSection') ?.classList.remove('hidden');

        const title = document.getElementById('formTitle');
        if (title) title.textContent = `Edit — ${student.firstName||''} ${student.lastName||''}`;
        const btn = document.getElementById('submitButton');
        if (btn) btn.innerHTML = '<i class="fas fa-save mr-2"></i>Update Student';

        switchTab('personal');
        window.scrollTo(0, 0);
        populateEditForm(student);
        toastInfo(`Editing: ${student.firstName||''} ${student.lastName||''}`);
    } catch (err) {
        toastError('Could not load student: ' + err.message);
    } finally {
        showLoading(false);
    }
}

// ─────────────────────────────────────────────────────────────
//  9. POPULATE EDIT FORM
// ─────────────────────────────────────────────────────────────
function populateEditForm(student) {
    const set = (sel, val) => { const el = document.querySelector(sel); if (el) el.value = val || ''; };

    // Personal
    set('input[name="firstName"]',      student.firstName);
    set('input[name="middleName"]',     student.middleName);
    set('input[name="lastName"]',       student.lastName);
    set('input[name="dob"]',            student.dateOfBirth ? student.dateOfBirth.split('T')[0] : '');
    set('select[name="gender"]',        student.gender);
    set('select[name="bloodGroup"]',    student.bloodGroup);
    set('select[name="casteCategory"]', student.casteCategory);
    set('input[name="previousSchool"]', student.previousSchool);
    set('input[name="aadharNumber"]',   student.aadharNumber);
    set('textarea[name="medicalInfo"]', student.medicalInfo);

    const stId = document.getElementById('studentId');
    const pwd  = document.getElementById('studentPassword');
    const cpwd = document.getElementById('confirmStudentPassword');
    const auto = document.getElementById('autoGeneratedId');
    if (stId) { stId.value = student.studentId || ''; stId.readOnly = true; }
    if (auto) auto.textContent = student.studentId || '';
    if (pwd)  { pwd.value  = ''; pwd.placeholder  = 'Leave blank to keep current password'; }
    if (cpwd) { cpwd.value = ''; cpwd.placeholder = 'Leave blank to keep current password'; }

    // Address
    set('input[name="localAddressLine1"]',     student.localAddress);
    set('input[name="localCity"]',             student.localCity);
    set('input[name="localState"]',            student.localState);
    set('input[name="localPincode"]',          student.localPincode);
    set('input[name="permanentAddressLine1"]', student.permanentAddress);
    set('input[name="permanentCity"]',         student.permanentCity);
    set('input[name="permanentState"]',        student.permanentState);
    set('input[name="permanentPincode"]',      student.permanentPincode);

    // Sports
    const knownSports = ['cricket','football','basketball','chess'];
    document.querySelectorAll('input[name="sports[]"]').forEach(cb => {
        cb.checked = (student.sportsActivity || []).includes(cb.value);
    });
    otherSports = (student.sportsActivity || []).filter(s => !knownSports.includes(s));
    updateOtherSportsDisplay();

    // Academic
    // Set class value
    const classSelect = document.getElementById('formClassSelect');
    if (classSelect && student.currentClass) {
        classSelect.value = student.currentClass;
        // Load sections for this class
        loadSectionsForClass(student.currentClass);
        // Set section value after a short delay
        setTimeout(() => {
            const sectionSelect = document.getElementById('formSectionSelect');
            if (sectionSelect && student.section) {
                sectionSelect.value = student.section;
            }
        }, 200);
    }
    
    set('input[name="rollNumber"]',     student.studentRollNumber);
    set('input[name="admissionDate"]',  student.admissionDate ? student.admissionDate.split('T')[0] : '');

    // Class teacher dropdown
    const ctDropdown = document.getElementById('classTeacherDropdown');
    if (ctDropdown) ctDropdown.value = student.classTeacher || '';

    // Academic year dropdown
    const ayDropdown = document.getElementById('academicYearDropdown');
    if (ayDropdown) ayDropdown.value = student.academicYear || '';

    // Subjects
    otherSubjects = [];
    if (student.currentClass) loadSubjectsForClass(student.currentClass, student.subjects || []);
    updateOtherSubjectsDisplay();

    // Parent
    set('input[name="fatherName"]',             student.fatherName);
    set('input[name="fatherContact"]',          student.fatherPhone);
    set('input[name="fatherOccupation"]',       student.fatherOccupation);
    set('input[name="fatherAadhar"]',           student.fatherAadhar);
    set('input[name="motherName"]',             student.motherName);
    set('input[name="motherContact"]',          student.motherPhone);
    set('input[name="motherOccupation"]',       student.motherOccupation);
    set('input[name="motherAadhar"]',           student.motherAadhar);
    set('input[name="parentEmail"]',            student.fatherEmail || student.motherEmail);
    set('input[name="emergencyContactName"]',   student.emergencyContact);
    set('input[name="emergencyContactNumber"]', student.emergencyRelation);

    // Fees
    const fees = student.feesDetails || {};
    const setV = (id, v) => { const e = document.getElementById(id); if (e) e.value = v || 0; };
    setV('admissionFees',  fees.admissionFees);
    setV('uniformFees',    fees.uniformFees);
    setV('bookFees',       fees.bookFees);
    setV('tuitionFees',    fees.tuitionFees);
    setV('initialPayment', fees.initialAmount);

    const pmRadio = document.querySelector(`input[name="paymentMode"][value="${fees.paymentMode||'one-time'}"]`);
    if (pmRadio) { pmRadio.checked = true; toggleInstallmentOptions(); }

    updateFeeCalculations();
}

// ─────────────────────────────────────────────────────────────
//  10. HANDLE ADD / UPDATE STUDENT
// ─────────────────────────────────────────────────────────────
async function handleAddStudent() {
    const isEditing = !!editingStudentId;
    const password  = document.getElementById('studentPassword') ?.value || '';
    const confirmP  = document.getElementById('confirmStudentPassword')?.value || '';
    
    let isValid = true;
    let errorMessages = [];


        // ADD THIS VALIDATION AT THE VERY START
    if (!validateAllSections()) {
        return;
    }
    
    if (!validateSectionFields('fees')) {
        switchTab('fees');
        return;
    }

    // ========== VALIDATE PERSONAL DETAILS ==========
    const firstName = document.querySelector('input[name="firstName"]')?.value.trim();
    const lastName = document.querySelector('input[name="lastName"]')?.value.trim();
    const dob = document.querySelector('input[name="dob"]')?.value;
    const gender = document.querySelector('select[name="gender"]')?.value;
    const studentId = document.getElementById('studentId')?.value.trim();
    
    // First Name
    const firstNameValidation = validateName(firstName, 'First Name');
    if (!firstNameValidation.valid) {
        isValid = false;
        errorMessages.push(firstNameValidation.message);
        showFieldError('firstName', firstNameValidation.message);
    } else {
        showFieldValid('firstName');
    }
    
    // Last Name
    const lastNameValidation = validateName(lastName, 'Last Name');
    if (!lastNameValidation.valid) {
        isValid = false;
        errorMessages.push(lastNameValidation.message);
        showFieldError('lastName', lastNameValidation.message);
    } else {
        showFieldValid('lastName');
    }
    
    // Date of Birth
    const dobValidation = validateDate(dob, 'Date of Birth');
    if (!dobValidation.valid) {
        isValid = false;
        errorMessages.push(dobValidation.message);
        showFieldError('dob', dobValidation.message);
    } else {
        showFieldValid('dob');
    }
    
    // Gender
    if (!gender) {
        isValid = false;
        errorMessages.push('Gender is required');
        showFieldError('gender', 'Please select gender');
    }
    
    // Student ID
    const studentIdValidation = validateStudentId(studentId);
    if (!studentIdValidation.valid) {
        isValid = false;
        errorMessages.push(studentIdValidation.message);
        showFieldError('studentId', studentIdValidation.message);
    } else {
        showFieldValid('studentId');
    }
    
    // Password (only for new students)
    if (!isEditing) {
        const passwordValidation = validatePassword(password);
        if (!passwordValidation.valid) {
            isValid = false;
            errorMessages.push(passwordValidation.message);
            showFieldError('studentPassword', passwordValidation.message);
        }
    } else if (password) {
        const passwordValidation = validatePassword(password);
        if (!passwordValidation.valid) {
            isValid = false;
            errorMessages.push(passwordValidation.message);
            showFieldError('studentPassword', passwordValidation.message);
        }
    }
    
    // Password confirmation
    if (password && password !== confirmP) {
        isValid = false;
        errorMessages.push('Passwords do not match');
        showFieldError('confirmStudentPassword', 'Passwords do not match');
    }
    
    // ========== VALIDATE ADDRESS ==========
    const localAddrLine1 = document.querySelector('input[name="localAddressLine1"]')?.value.trim();
    const localCity = document.querySelector('input[name="localCity"]')?.value.trim();
    const localState = document.querySelector('input[name="localState"]')?.value.trim();
    const localPincode = document.querySelector('input[name="localPincode"]')?.value.trim();
    
    if (!localAddrLine1) {
        isValid = false;
        errorMessages.push('Local Address is required');
        showFieldError('localAddressLine1', 'Address Line 1 is required');
    }
    if (!localCity) {
        isValid = false;
        errorMessages.push('City is required');
        showFieldError('localCity', 'City is required');
    }
    if (!localState) {
        isValid = false;
        errorMessages.push('State is required');
        showFieldError('localState', 'State is required');
    }
    
    const pincodeValidation = validatePincode(localPincode, 'Pincode');
    if (!pincodeValidation.valid) {
        isValid = false;
        errorMessages.push(pincodeValidation.message);
        showFieldError('localPincode', pincodeValidation.message);
    }
    
    // ========== VALIDATE ACADEMIC DETAILS ==========
    const cls = document.getElementById('formClassSelect')?.value;
    const section = document.getElementById('formSectionSelect')?.value;
    const admissionDate = document.querySelector('input[name="admissionDate"]')?.value;
    const academicYear = document.getElementById('academicYearDropdown')?.value;
    
    if (!cls) {
        isValid = false;
        errorMessages.push('Please select a class');
        showFieldError('formClassSelect', 'Class is required');
    }
    
    if (!section) {
        isValid = false;
        errorMessages.push('Please select a section');
        showFieldError('formSectionSelect', 'Section is required');
    }
    
    const admissionValidation = validateDate(admissionDate, 'Admission Date');
    if (!admissionValidation.valid) {
        isValid = false;
        errorMessages.push(admissionValidation.message);
        showFieldError('admissionDate', admissionValidation.message);
    }
    
    if (!academicYear) {
        isValid = false;
        errorMessages.push('Academic Year is required');
        showFieldError('academicYearDropdown', 'Academic Year is required');
    }
    
    // ========== VALIDATE PARENT DETAILS ==========
    const fatherName = document.querySelector('input[name="fatherName"]')?.value.trim();
    const fatherContact = document.querySelector('input[name="fatherContact"]')?.value.trim();
    const motherName = document.querySelector('input[name="motherName"]')?.value.trim();
    const parentEmail = document.querySelector('input[name="parentEmail"]')?.value.trim();
    const emergencyName = document.querySelector('input[name="emergencyContactName"]')?.value.trim();
    const emergencyNumber = document.querySelector('input[name="emergencyContactNumber"]')?.value.trim();
    
    // Father's Name
    const fatherNameValidation = validateName(fatherName, 'Father\'s Name');
    if (!fatherNameValidation.valid) {
        isValid = false;
        errorMessages.push(fatherNameValidation.message);
        showFieldError('fatherName', fatherNameValidation.message);
    }
    
    // Father's Contact
    const fatherContactValidation = validatePhoneNumber(fatherContact, 'Father\'s contact number');
    if (!fatherContactValidation.valid) {
        isValid = false;
        errorMessages.push(fatherContactValidation.message);
        showFieldError('fatherContact', fatherContactValidation.message);
    }
    
    // Mother's Name (optional but validate if provided)
    if (motherName) {
        const motherNameValidation = validateName(motherName, 'Mother\'s Name');
        if (!motherNameValidation.valid) {
            isValid = false;
            errorMessages.push(motherNameValidation.message);
            showFieldError('motherName', motherNameValidation.message);
        }
    }
    
    // Parent Email
    const emailValidation = validateEmailAddress(parentEmail);
    if (!emailValidation.valid) {
        isValid = false;
        errorMessages.push(emailValidation.message);
        showFieldError('parentEmail', emailValidation.message);
    }
    
    // Emergency Contact
    const emergencyNameValidation = validateName(emergencyName, 'Emergency contact name');
    if (!emergencyNameValidation.valid) {
        isValid = false;
        errorMessages.push(emergencyNameValidation.message);
        showFieldError('emergencyContactName', emergencyNameValidation.message);
    }
    
    const emergencyValidation = validatePhoneNumber(emergencyNumber, 'Emergency contact number');
    if (!emergencyValidation.valid) {
        isValid = false;
        errorMessages.push(emergencyValidation.message);
        showFieldError('emergencyContactNumber', emergencyValidation.message);
    }
    
    // ========== VALIDATE FEES DETAILS ==========
    const admissionFees = parseInt(document.getElementById('admissionFees')?.value) || 0;
    const tuitionFees = parseInt(document.getElementById('tuitionFees')?.value) || 0;
    const initialPayment = parseInt(document.getElementById('initialPayment')?.value) || 0;
    
    const admissionFeesValidation = validateNumberField(admissionFees, 'Admission Fees', 0);
    if (!admissionFeesValidation.valid) {
        isValid = false;
        errorMessages.push(admissionFeesValidation.message);
        showFieldError('admissionFees', admissionFeesValidation.message);
    }
    
    const tuitionFeesValidation = validateNumberField(tuitionFees, 'Tuition Fees', 0);
    if (!tuitionFeesValidation.valid) {
        isValid = false;
        errorMessages.push(tuitionFeesValidation.message);
        showFieldError('tuitionFees', tuitionFeesValidation.message);
    }
    
    const initialPaymentValidation = validateNumberField(initialPayment, 'Initial Payment', 0);
    if (!initialPaymentValidation.valid) {
        isValid = false;
        errorMessages.push(initialPaymentValidation.message);
        showFieldError('initialPayment', initialPaymentValidation.message);
    }
    
    // Check if initial payment exceeds total fees
    const totalFees = admissionFees + tuitionFees + 
                      (parseInt(document.getElementById('uniformFees')?.value) || 0) +
                      (parseInt(document.getElementById('bookFees')?.value) || 0);
    if (initialPayment > totalFees) {
        isValid = false;
        errorMessages.push('Initial payment cannot exceed total fees');
        showFieldError('initialPayment', 'Initial payment cannot exceed total fees');
    }
    
    // ========== VALIDATE ONLINE PAYMENT ==========
    if (document.querySelector('input[name="paymentMethod"]:checked')?.value === 'online' && !transactionVerified) {
        isValid = false;
        errorMessages.push('Please verify the Transaction ID before submitting');
        showFieldError('transactionId', 'Transaction ID verification required');
        switchTab('fees');
    }
    
    // ========== SHOW ERRORS AND RETURN IF INVALID ==========
    if (!isValid) {
        const firstError = errorMessages[0];
        toastError(firstError);
        
        // Scroll to first error field
        const firstErrorField = document.querySelector('.form-control.error');
        if (firstErrorField) {
            firstErrorField.scrollIntoView({ behavior: 'smooth', block: 'center' });
            firstErrorField.focus();
        }
        return;
    }
    
    // If editing and no password provided, we'll keep existing password
    if (isEditing && !password) {
        // Password will be handled by backend (not updated)
        console.log('Edit mode: Keeping existing password');
    }
    
    // Continue with existing submission logic
    showLoading(true);
    toastInfo(isEditing ? 'Updating student...' : 'Registering student...');
    
    try {
        const formData = buildFormData();
        if (!formData) {
            showLoading(false);
            return;
        }
        
        const url = isEditing
            ? `${BASE_URL}/api/students/update-student-with-files/${editingStudentId}`
            : `${BASE_URL}/api/students/create-student-with-files`;
        const res = await fetch(url, { method: isEditing ? 'PATCH' : 'POST', headers: getAuthHeaders(), body: formData });
        
        if (!res.ok) {
            let msg = `Server error (${res.status})`;
            try { const t = await res.text(); if (t) msg = t; } catch (_) {}
            throw new Error(msg);
        }
        
        const saved = await res.json();
        const name = [saved?.firstName, saved?.lastName].filter(Boolean).join(' ') || `${firstName} ${lastName}`;
        
        toastSuccess(isEditing ? `"${name}" updated successfully!` : `"${name}" registered successfully!`);
        if (!isEditing && saved?.studentId) setTimeout(() => toastInfo(`Student ID: ${saved.studentId}`), 700);
        
        editingStudentId = null;
        setTimeout(showAllStudentsSection, 1800);
        
    } catch (err) {
        console.error('handleAddStudent:', err);
        let msg = err.message || 'Unknown error';
        if (msg.includes('409') || msg.toLowerCase().includes('duplicate')) msg = 'Student with this ID or Roll Number already exists';
        else if (msg.includes('400')) msg = 'Invalid data — check all required fields';
        else if (msg.includes('401') || msg.includes('403')) msg = 'Session expired — please log in again';
        else if (msg.includes('500')) msg = 'Server error — please try again';
        else if (msg.includes('Failed to fetch')) msg = 'Cannot reach server — check connection';
        toastError(`${isEditing ? 'Update' : 'Registration'} failed: ${msg}`);
    } finally {
        showLoading(false);
    }
}

// ============================================================
// REAL-TIME VALIDATION SETUP
// ============================================================

// ============================================================
// REAL-TIME VALIDATION SETUP - COMPLETELY REWRITTEN
// ============================================================

function setupRealTimeValidation() {
    console.log('Setting up real-time validation...');
    
    // ========== NAME FIELDS ==========
    const nameFields = [
        { selector: 'input[name="firstName"]', id: 'firstName', name: 'First Name', required: true },
        { selector: 'input[name="lastName"]', id: 'lastName', name: 'Last Name', required: true },
        { selector: 'input[name="fatherName"]', id: 'fatherName', name: "Father's Name", required: true },
        { selector: 'input[name="motherName"]', id: 'motherName', name: "Mother's Name", required: false },
        { selector: 'input[name="emergencyContactName"]', id: 'emergencyContactName', name: 'Emergency Contact Name', required: true }
    ];
    
    nameFields.forEach(field => {
        const element = document.querySelector(field.selector);
        if (element) {
            // Set ID if not already set
            if (!element.id) element.id = field.id;
            
            element.addEventListener('blur', function() {
                const validation = validateName(this.value, field.name, field.required);
                if (!validation.valid && (field.required || this.value)) {
                    showFieldError(field.id, validation.message);
                } else if (this.value && validation.valid) {
                    showFieldValid(field.id);
                } else if (!this.value && !field.required) {
                    clearFieldValidation(field.id);
                }
            });
            
            element.addEventListener('input', function() {
                // Sanitize input - allow only letters and spaces
                this.value = sanitizeName(this.value);
                
                if (this.value) {
                    const validation = validateName(this.value, field.name, field.required);
                    if (validation.valid) {
                        showFieldValid(field.id);
                    } else {
                        showFieldError(field.id, validation.message);
                    }
                } else if (!field.required) {
                    clearFieldValidation(field.id);
                }
            });
        } else {
            console.warn(`Name field not found: ${field.selector}`);
        }
    });
    
    // ========== PHONE NUMBER FIELDS ==========
    const phoneFields = [
        { selector: 'input[name="fatherContact"]', id: 'fatherContact', name: "Father's contact number", required: true },
        { selector: 'input[name="emergencyContactNumber"]', id: 'emergencyContactNumber', name: 'Emergency contact number', required: true },
        { selector: 'input[name="motherContact"]', id: 'motherContact', name: "Mother's contact number", required: false }
    ];
    
    phoneFields.forEach(field => {
        const element = document.querySelector(field.selector);
        if (element) {
            if (!element.id) element.id = field.id;
            
            element.addEventListener('blur', function() {
                const validation = validatePhoneNumber(this.value, field.name);
                if (!validation.valid && (field.required || this.value)) {
                    showFieldError(field.id, validation.message);
                } else if (this.value && validation.valid) {
                    showFieldValid(field.id);
                }
            });
            
            element.addEventListener('input', function() {
                // Sanitize - allow only numbers, max 10 digits
                this.value = sanitizePhone(this.value);
                
                if (this.value) {
                    const validation = validatePhoneNumber(this.value, field.name);
                    if (validation.valid) {
                        showFieldValid(field.id);
                    } else {
                        showFieldError(field.id, validation.message);
                    }
                } else if (!field.required) {
                    clearFieldValidation(field.id);
                }
            });
        } else {
            console.warn(`Phone field not found: ${field.selector}`);
        }
    });
    
    // ========== EMAIL FIELD ==========
    const emailElement = document.querySelector('input[name="parentEmail"]');
    if (emailElement) {
        emailElement.id = 'parentEmail';
        
        emailElement.addEventListener('blur', function() {
            const validation = validateEmailAddress(this.value);
            if (!validation.valid && this.value) {
                showFieldError('parentEmail', validation.message);
            } else if (this.value && validation.valid) {
                showFieldValid('parentEmail');
            }
        });
        
        emailElement.addEventListener('input', function() {
            if (this.value) {
                const validation = validateEmailAddress(this.value);
                if (validation.valid) {
                    showFieldValid('parentEmail');
                } else {
                    showFieldError('parentEmail', validation.message);
                }
            } else {
                clearFieldValidation('parentEmail');
            }
        });
    } else {
        console.warn('Email field not found');
    }
    
    // ========== AADHAR FIELDS ==========
    const aadharFields = [
        { selector: 'input[name="aadharNumber"]', id: 'aadharNumber', name: "Student's Aadhar number", required: false },
        { selector: 'input[name="fatherAadhar"]', id: 'fatherAadhar', name: "Father's Aadhar number", required: false },
        { selector: 'input[name="motherAadhar"]', id: 'motherAadhar', name: "Mother's Aadhar number", required: false }
    ];
    
    aadharFields.forEach(field => {
        const element = document.querySelector(field.selector);
        if (element) {
            if (!element.id) element.id = field.id;
            
            element.addEventListener('blur', function() {
                if (this.value) {
                    const validation = validateAadharNumber(this.value, field.name);
                    if (!validation.valid) {
                        showFieldError(field.id, validation.message);
                    } else {
                        showFieldValid(field.id);
                    }
                } else {
                    clearFieldValidation(field.id);
                }
            });
            
            element.addEventListener('input', function() {
                // Sanitize - allow only numbers, max 12 digits
                this.value = sanitizeAadhar(this.value);
                
                if (this.value && this.value.length === 12) {
                    const validation = validateAadharNumber(this.value, field.name);
                    if (validation.valid) {
                        showFieldValid(field.id);
                    } else {
                        showFieldError(field.id, validation.message);
                    }
                } else if (this.value && this.value.length > 0) {
                    showFieldError(field.id, `${field.name} must be exactly 12 digits`);
                } else {
                    clearFieldValidation(field.id);
                }
            });
        }
    });
    
    // ========== PINCODE FIELDS ==========
    const pincodeFields = [
        { selector: 'input[name="localPincode"]', id: 'localPincode', required: true },
        { selector: 'input[name="permanentPincode"]', id: 'permanentPincode', required: false }
    ];
    
    pincodeFields.forEach(field => {
        const element = document.querySelector(field.selector);
        if (element) {
            if (!element.id) element.id = field.id;
            
            element.addEventListener('blur', function() {
                if (this.value || field.required) {
                    const validation = validatePincode(this.value, 'Pincode', field.required);
                    if (!validation.valid) {
                        showFieldError(field.id, validation.message);
                    } else if (this.value) {
                        showFieldValid(field.id);
                    }
                }
            });
            
            element.addEventListener('input', function() {
                // Sanitize - allow only numbers, max 6 digits
                this.value = sanitizePincode(this.value);
                
                if (this.value) {
                    const validation = validatePincode(this.value, 'Pincode', field.required);
                    if (validation.valid && this.value.length === 6) {
                        showFieldValid(field.id);
                    } else if (this.value.length > 0 && this.value.length < 6) {
                        showFieldError(field.id, 'Pincode must be exactly 6 digits');
                    } else {
                        showFieldError(field.id, validation.message);
                    }
                } else if (field.required) {
                    showFieldError(field.id, 'Pincode is required');
                } else {
                    clearFieldValidation(field.id);
                }
            });
        }
    });
    
    // ========== DATE FIELDS ==========
    const dobElement = document.querySelector('input[name="dob"]');
    if (dobElement) {
        dobElement.id = 'dob';
        
        dobElement.addEventListener('blur', function() {
            const validation = validateDate(this.value, 'Date of Birth');
            if (!validation.valid) {
                showFieldError('dob', validation.message);
            } else {
                showFieldValid('dob');
            }
        });
        
        dobElement.addEventListener('input', function() {
            if (this.value) {
                const validation = validateDate(this.value, 'Date of Birth');
                if (validation.valid) {
                    showFieldValid('dob');
                } else {
                    showFieldError('dob', validation.message);
                }
            }
        });
    }
    
    const admissionDateElement = document.querySelector('input[name="admissionDate"]');
    if (admissionDateElement) {
        admissionDateElement.id = 'admissionDate';
        
        admissionDateElement.addEventListener('blur', function() {
            const validation = validateDate(this.value, 'Admission Date');
            if (!validation.valid) {
                showFieldError('admissionDate', validation.message);
            } else {
                showFieldValid('admissionDate');
            }
        });
        
        admissionDateElement.addEventListener('input', function() {
            if (this.value) {
                const validation = validateDate(this.value, 'Admission Date');
                if (validation.valid) {
                    showFieldValid('admissionDate');
                } else {
                    showFieldError('admissionDate', validation.message);
                }
            }
        });
    }
    
    // ========== STUDENT ID FIELD ==========
    const studentIdElement = document.getElementById('studentId');
    if (studentIdElement) {
        studentIdElement.addEventListener('blur', function() {
            const validation = validateStudentId(this.value);
            if (!validation.valid) {
                showFieldError('studentId', validation.message);
            } else {
                showFieldValid('studentId');
            }
        });
        
        studentIdElement.addEventListener('input', function() {
            // Sanitize - allow only alphanumeric, hyphens, underscores
            this.value = this.value.replace(/[^A-Za-z0-9\-_]/g, '');
            
            if (this.value) {
                const validation = validateStudentId(this.value);
                if (validation.valid) {
                    showFieldValid('studentId');
                } else {
                    showFieldError('studentId', validation.message);
                }
            } else {
                showFieldError('studentId', 'Student ID is required');
            }
        });
    }
    
    // ========== CLASS AND SECTION FIELDS ==========
    const classSelect = document.getElementById('formClassSelect');
    if (classSelect) {
        classSelect.addEventListener('change', function() {
            if (this.value) {
                showFieldValid('formClassSelect');
            } else {
                showFieldError('formClassSelect', 'Please select a class');
            }
        });
    }
    
    const sectionSelect = document.getElementById('formSectionSelect');
    if (sectionSelect) {
        sectionSelect.addEventListener('change', function() {
            if (this.value) {
                showFieldValid('formSectionSelect');
            } else {
                showFieldError('formSectionSelect', 'Please select a section');
            }
        });
    }
    
    const academicYearSelect = document.getElementById('academicYearDropdown');
    if (academicYearSelect) {
        academicYearSelect.addEventListener('change', function() {
            if (this.value) {
                showFieldValid('academicYearDropdown');
            } else {
                showFieldError('academicYearDropdown', 'Please select academic year');
            }
        });
    }
    
    // ========== CITY AND STATE FIELDS ==========
    const cityStateFields = [
        { selector: 'input[name="localCity"]', id: 'localCity', name: 'City', required: true },
        { selector: 'input[name="localState"]', id: 'localState', name: 'State', required: true }
    ];
    
    cityStateFields.forEach(field => {
        const element = document.querySelector(field.selector);
        if (element) {
            if (!element.id) element.id = field.id;
            
            element.addEventListener('blur', function() {
                const validation = validateCityState(this.value, field.name, field.required);
                if (!validation.valid && (field.required || this.value)) {
                    showFieldError(field.id, validation.message);
                } else if (this.value && validation.valid) {
                    showFieldValid(field.id);
                }
            });
            
            element.addEventListener('input', function() {
                if (this.value) {
                    const validation = validateCityState(this.value, field.name, field.required);
                    if (validation.valid) {
                        showFieldValid(field.id);
                    } else {
                        showFieldError(field.id, validation.message);
                    }
                } else if (field.required) {
                    showFieldError(field.id, `${field.name} is required`);
                } else {
                    clearFieldValidation(field.id);
                }
            });
        }
    });
    
    console.log('Real-time validation setup complete!');
}

// ─────────────────────────────────────────────────────────────
//  11. BUILD FORM DATA (multipart)
// ─────────────────────────────────────────────────────────────
function buildFormData() {
    console.log('========== DEBUG: Building Form Data ==========');
    
    const fd = new FormData();
    const sameLocal = document.getElementById('sameAsLocal')?.checked;

    // Get all values using document.querySelector
    const allSports = [
        ...[...document.querySelectorAll('input[name="sports[]"]:checked')].map(c => c.value),
        ...otherSports
    ];
    
    const allSubjects = [
        ...[...document.querySelectorAll('input[name="subjects[]"]:checked')].map(c => c.value),
        ...otherSubjects
    ];

    // Address fields
    const localAddr = [
        document.querySelector('input[name="localAddressLine1"]')?.value,
        document.querySelector('input[name="localAddressLine2"]')?.value
    ].filter(Boolean).join(', ');
    
    const permAddr = sameLocal ? localAddr : [
        document.querySelector('input[name="permanentAddressLine1"]')?.value,
        document.querySelector('input[name="permanentAddressLine2"]')?.value
    ].filter(Boolean).join(', ');
    
    const permCity = sameLocal 
        ? document.querySelector('input[name="localCity"]')?.value 
        : document.querySelector('input[name="permanentCity"]')?.value;
    
    const permState = sameLocal 
        ? document.querySelector('input[name="localState"]')?.value 
        : document.querySelector('input[name="permanentState"]')?.value;
    
    const permPincode = sameLocal 
        ? document.querySelector('input[name="localPincode"]')?.value 
        : document.querySelector('input[name="permanentPincode"]')?.value;

    // ========== FEES CALCULATION SECTION ==========
    // Calculate all fees components
    const admissionFees = parseInt(document.getElementById('admissionFees')?.value) || 0;
    const uniformFees = parseInt(document.getElementById('uniformFees')?.value) || 0;
    const bookFees = parseInt(document.getElementById('bookFees')?.value) || 0;
    const tuitionFees = parseInt(document.getElementById('tuitionFees')?.value) || 0;
    
    // Calculate additional fees
    const additionalFeesList = {};
    let additionalFeesTotal = 0;
    document.querySelectorAll('#additionalFeesList > div').forEach(row => {
        const spans = row.querySelectorAll('span');
        const name = spans[0]?.textContent.trim();
        const amount = parseInt((spans[1]?.textContent || '0').replace(/[₹,]/g, '')) || 0;
        if (name && amount > 0) {
            additionalFeesList[name] = amount;
            additionalFeesTotal += amount;
        }
    });
    
    // Calculate totals
    const totalFees = admissionFees + uniformFees + bookFees + tuitionFees + additionalFeesTotal;
    const initialPayment = parseInt(document.getElementById('initialPayment')?.value) || 0;
    const remainingBalance = totalFees - initialPayment;
    
    console.log('========== FEES CALCULATION ==========');
    console.log('Admission Fees:', admissionFees);
    console.log('Uniform Fees:', uniformFees);
    console.log('Book Fees:', bookFees);
    console.log('Tuition Fees:', tuitionFees);
    console.log('Additional Fees:', additionalFeesTotal);
    console.log('TOTAL FEES:', totalFees);
    console.log('Initial Payment:', initialPayment);
    console.log('Remaining Balance:', remainingBalance);
    
    // ========== INSTALLMENT CREATION ==========
    const paymentMode = document.querySelector('input[name="paymentMode"]:checked')?.value || 'one-time';
    const installmentsList = [];
    
    if (paymentMode === 'one-time') {
        // ONE-TIME PAYMENT: Create a single installment for the remaining balance
        if (remainingBalance > 0) {
            // Set due date to 30 days from today
            const dueDate = new Date();
            dueDate.setDate(dueDate.getDate() + 30);
            const formattedDate = dueDate.toISOString().split('T')[0];
            
            installmentsList.push({
                amount: remainingBalance,
                dueDate: formattedDate,
                status: 'PENDING'
            });
            console.log('✅ One-time payment: Created 1 installment of ₹' + remainingBalance + ' due on ' + formattedDate);
        } else {
            console.log('✅ One-time payment: Fully paid, no installments needed');
        }
    } else if (paymentMode === 'installment') {
        // INSTALLMENT PAYMENT: Create installments from UI breakdown
        const installmentDivs = document.querySelectorAll('#installmentBreakdown > div');
        console.log('Installment divs found:', installmentDivs.length);
        
        installmentDivs.forEach((row, index) => {
            const amtSpan = row.querySelector('.font-semibold');
            const dateSpan = row.querySelector('.text-xs');
            
            const amtText = amtSpan?.textContent || '0';
            const amount = parseInt(amtText.replace(/[₹,]/g, '')) || 0;
            
            const dateText = dateSpan?.textContent?.replace('Due: ', '') || null;
            
            if (amount > 0 && dateText) {
                try {
                    const parsedDate = new Date(dateText);
                    if (!isNaN(parsedDate.getTime())) {
                        const year = parsedDate.getFullYear();
                        const month = String(parsedDate.getMonth() + 1).padStart(2, '0');
                        const day = String(parsedDate.getDate()).padStart(2, '0');
                        const formattedDate = `${year}-${month}-${day}`;
                        
                        installmentsList.push({ 
                            amount: amount, 
                            dueDate: formattedDate, 
                            status: 'PENDING' 
                        });
                        console.log(`  Installment ${index + 1}: ₹${amount} due on ${formattedDate}`);
                    }
                } catch (e) {
                    console.error('Error parsing installment date:', dateText, e);
                }
            }
        });
        console.log('✅ Installment payment: Created', installmentsList.length, 'installments');
        
        // Verify installments sum matches remaining balance
        if (installmentsList.length > 0) {
            const installmentsSum = installmentsList.reduce((sum, inst) => sum + inst.amount, 0);
            if (installmentsSum !== remainingBalance) {
                console.warn(`⚠️ Installments sum (${installmentsSum}) does not equal remaining balance (${remainingBalance})`);
            }
        }
    }
    // ========== END FEES SECTION ==========
    
    const pwdVal = document.getElementById('studentPassword')?.value || '';
    const password = editingStudentId && !pwdVal ? undefined : pwdVal;
    
    const academicYear = document.getElementById('academicYearDropdown')?.value
        || document.querySelector('select[name="academicYear"]')?.value || '';

    // Auto-generate roll number if blank
    const rollInput = document.querySelector('input[name="rollNumber"]')?.value?.trim();
    const autoRoll = rollInput || `ROLL-${new Date().toISOString().slice(0,10).replace(/-/g,'')}-${Math.floor(1000+Math.random()*9000)}`;

    // Get class name from dropdown
    const classSelect = document.getElementById('formClassSelect');
    const className = classSelect ? classSelect.value : '';
    console.log('Selected class name:', className);

    // Find the corresponding classId from allClassesData
    let classId = null;
    if (className && allClassesData && allClassesData.length > 0) {
        const matchedClass = allClassesData.find(c => c.className === className);
        if (matchedClass) {
            classId = matchedClass.classId;
            console.log('Found classId:', classId, 'for class:', className);
        } else {
            console.warn('No matching class found for name:', className);
        }
    }

    // Get section value
    const sectionSelect = document.getElementById('formSectionSelect');
    const sectionValue = sectionSelect ? sectionSelect.value : '';
    console.log('Section value:', sectionValue);

    // Get father's name
    const fatherName = document.querySelector('input[name="fatherName"]')?.value || '';
    console.log('Father name captured:', fatherName);
    
    if (!fatherName) {
        toastError('Father\'s name is required');
        switchTab('parent');
        return null;
    }

    if (!className) {
        toastError('Please select a class');
        switchTab('academic');
        return null;
    }

    if (!classId) {
        toastError('Invalid class selection. Please try again.');
        switchTab('academic');
        return null;
    }

    // ========== BUILD STUDENT DATA OBJECT ==========
    const studentData = {
        // Basic Information
        studentRollNumber: autoRoll,
        firstName: document.querySelector('input[name="firstName"]')?.value || '',
        middleName: document.querySelector('input[name="middleName"]')?.value || '',
        lastName: document.querySelector('input[name="lastName"]')?.value || '',
        ...(password !== undefined && { studentPassword: password }),
        dateOfBirth: document.querySelector('input[name="dob"]')?.value || null,
        gender: document.querySelector('select[name="gender"]')?.value || '',
        bloodGroup: document.querySelector('select[name="bloodGroup"]')?.value || '',
        aadharNumber: document.querySelector('input[name="aadharNumber"]')?.value || '',
        casteCategory: document.querySelector('select[name="casteCategory"]')?.value || '',
        medicalInfo: document.querySelector('textarea[name="medicalInfo"]')?.value || '',
        sportsActivity: allSports,
        
        // Address
        localAddress: localAddr,
        localCity: document.querySelector('input[name="localCity"]')?.value || '',
        localState: document.querySelector('input[name="localState"]')?.value || '',
        localPincode: document.querySelector('input[name="localPincode"]')?.value || '',
        permanentAddress: permAddr || '',
        permanentCity: permCity || '',
        permanentState: permState || '',
        permanentPincode: permPincode || '',
        
        // Parent Details
        fatherName: fatherName,
        fatherPhone: document.querySelector('input[name="fatherContact"]')?.value || '',
        fatherOccupation: document.querySelector('input[name="fatherOccupation"]')?.value || '',
        fatherEmail: document.querySelector('input[name="parentEmail"]')?.value || '',
        motherName: document.querySelector('input[name="motherName"]')?.value || '',
        motherPhone: document.querySelector('input[name="motherContact"]')?.value || '',
        motherOccupation: document.querySelector('input[name="motherOccupation"]')?.value || '',
        motherEmail: document.querySelector('input[name="parentEmail"]')?.value || '',
        emergencyContact: document.querySelector('input[name="emergencyContactName"]')?.value || '',
        emergencyRelation: document.querySelector('input[name="emergencyContactNumber"]')?.value || '',
        
        // Academic Details
        currentClass: className,
        classId: classId,
        section: sectionValue,
        academicYear: academicYear,
        admissionDate: document.querySelector('input[name="admissionDate"]')?.value || null,
        classTeacher: document.getElementById('classTeacherDropdown')?.value || '',
        previousSchool: document.querySelector('input[name="previousSchool"]')?.value || '',
        subjects: allSubjects,
        status: 'active',
        createdBy: 'Admin',
        
        // ========== FEES DETAILS - CRITICAL FOR FEE MANAGEMENT ==========
        admissionFees: admissionFees,
        uniformFees: uniformFees,
        bookFees: bookFees,
        tuitionFees: tuitionFees,
        initialAmount: initialPayment,
        additionalFeesList: additionalFeesList,
        paymentMode: paymentMode,
        installmentsList: installmentsList,
        cashierName: 'Admin',
        transactionId: document.getElementById('transactionId')?.value || '',
        remainingFees: remainingBalance
    };

    console.log('========== STUDENT DATA SENT ==========');
    console.log('Student Name:', studentData.firstName, studentData.lastName);
    console.log('Class:', studentData.currentClass, 'Section:', studentData.section);
    console.log('Fees - Admission:', studentData.admissionFees);
    console.log('Fees - Tuition:', studentData.tuitionFees);
    console.log('Fees - Total:', totalFees);
    console.log('Fees - Initial Payment:', studentData.initialAmount);
    console.log('Fees - Remaining:', studentData.remainingFees);
    console.log('Payment Mode:', studentData.paymentMode);
    console.log('Installments Created:', studentData.installmentsList.length);
    if (studentData.installmentsList.length > 0) {
        console.log('Installment Details:', JSON.stringify(studentData.installmentsList, null, 2));
    }
    
    fd.append('studentData', JSON.stringify(studentData));

    // ========== FILE UPLOADS ==========
    const fileMap = {
        profileImage: 'studentPhoto',
        studentAadharImage: 'studentAadharImage',
        fatherAadharImage: 'fatherAadharImage',
        motherAadharImage: 'motherAadharImage',
        birthCertificateImage: 'birthCertificateImage',
        transferCertificateImage: 'transferCertificateImage',
        markSheetImage: 'markSheetImage',
        incomeCertificateImage: 'incomeCertificateImage',
        casteCertificateImage: 'casteCertificateImage'
    };
    
    Object.entries(fileMap).forEach(([field, inputId]) => {
        const input = document.getElementById(inputId);
        if (input?.files?.length > 0) {
            console.log(`Adding file: ${field} - ${input.files[0].name}`);
            fd.append(field, input.files[0]);
        }
    });

    console.log('========== BUILD COMPLETE ==========');
    return fd;
}
// ─────────────────────────────────────────────────────────────
//  12. DELETE STUDENT
// ─────────────────────────────────────────────────────────────
async function deleteStudent(stdId) {
    if (!confirm('Delete this student? This cannot be undone.')) return;
    showLoading(true);
    try {
        const res = await fetch(`${BASE_URL}/api/students/delete-student/${stdId}`, { method: 'DELETE', headers: getAuthHeaders() });
        if (!res.ok) throw new Error('Delete failed');
        toastSuccess('Student deleted successfully');
        await loadStudents(currentPage);
    } catch (err) {
        toastError('Delete failed: ' + err.message);
    } finally {
        showLoading(false);
    }
}

// ─────────────────────────────────────────────────────────────
//  13. EXPORT CSV
// ─────────────────────────────────────────────────────────────
async function exportStudents() {
    showLoading(true);
    try {
        const res      = await fetch(`${BASE_URL}/api/students/get-all-students?page=0&size=10000&direction=desc`, { headers: getAuthHeaders() });
        if (!res.ok) throw new Error('Export failed');
        const students = (await res.json()).content || [];

        const headers = ['ID','Student ID','Roll No','Name','Class','Section','Father','Phone','Email','Fees Status','Admission Date'];
        const rows    = students.map(s => {
            const fees = s.feesDetails || {};
            return [s.stdId, s.studentId||'', s.studentRollNumber||'',
                [s.firstName, s.middleName, s.lastName].filter(Boolean).join(' '),
                s.currentClass||'', s.section||'', s.fatherName||'', s.fatherPhone||'', s.fatherEmail||'',
                fees.paymentStatus||'No Fees', s.admissionDate?.split('T')[0]||''];
        });

        const csv  = [headers, ...rows].map(r => r.map(c => `"${c}"`).join(',')).join('\n');
        const a    = document.createElement('a');
        a.href     = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
        a.download = `students_${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        URL.revokeObjectURL(a.href);
        toastSuccess(`Exported ${students.length} students`);
    } catch (err) {
        toastError('Export failed: ' + err.message);
    } finally {
        showLoading(false);
    }
}

function calculateAdditionalFeesTotal() {
    let total = 0;
    document.querySelectorAll('#additionalFeesList > div').forEach(row => {
        const amtText = row.querySelectorAll('span')[1]?.textContent || '0';
        const amt = parseInt(amtText.replace(/[₹,]/g, '')) || 0;
        total += amt;
    });
    return total;
}

// ─────────────────────────────────────────────────────────────
//  14. RESET FORM
// ─────────────────────────────────────────────────────────────
function resetAddStudentForm() {
    document.getElementById('addStudentForm')?.reset();
    otherSports = []; otherSubjects = [];
    editingStudentId = null; transactionVerified = false; qrCodeGenerated = false;

    const g = id => document.getElementById(id);
    ['otherSportsDisplay','otherSubjectsDisplay'].forEach(id => {
        const el = g(id); if (el) { el.innerHTML = ''; el.classList.add('hidden'); }
    });
    ['otherSportsContainer','otherSubjectsContainer'].forEach(id => g(id)?.classList.add('hidden'));
    ['otherSportsCheckbox','otherSubjectsCheckbox'].forEach(id => { const el = g(id); if (el) el.checked = false; });

    const preview = g('studentPhotoPreview');
    if (preview) preview.innerHTML = '<i class="fas fa-user text-4xl lg:text-6xl text-gray-400"></i>';

    g('passwordMismatch')?.classList.add('hidden');

    const stId = g('studentId');
    const pwd  = g('studentPassword');
    const cpwd = g('confirmStudentPassword');
    if (stId) { stId.readOnly = false; }
    if (pwd)  { pwd.readOnly  = false; pwd.placeholder  = 'Enter password'; }
    if (cpwd) { cpwd.readOnly = false; cpwd.placeholder = 'Confirm password'; }

    document.querySelector('input[name="paymentMode"][value="one-time"]')  ?.click();
    document.querySelector('input[name="paymentMethod"][value="cash"]')    ?.click();

    const subjectsContainer = g('subjectsContainer');
    if (subjectsContainer) subjectsContainer.innerHTML = '<p class="text-sm text-gray-400 italic col-span-4">Please select a class first.</p>';

    const autoId = generateStudentId();
    if (g('autoGeneratedId')) g('autoGeneratedId').textContent = autoId;
    if (g('studentId'))       g('studentId').value             = autoId;
    if (g('submitButton'))    g('submitButton').innerHTML       = '<i class="fas fa-check-circle mr-2"></i>Register Student';
    if (g('formTitle'))       g('formTitle').textContent        = 'Add New Student';

    const fidEl = g('firstInstallmentDate');
    if (fidEl) { const d = new Date(); d.setMonth(d.getMonth() + 1); fidEl.value = d.toISOString().split('T')[0]; }

    loadAcademicYears();
    toggleInstallmentOptions();
    togglePermanentAddress();
    closeQRCode();
    updateFeeCalculations();
    updateOtherSportsDisplay();
    updateOtherSubjectsDisplay();
}

// ─────────────────────────────────────────────────────────────
//  15. FEE CALCULATIONS
// ─────────────────────────────────────────────────────────────
function updateFeeCalculations() {
    const n = id => parseInt(document.getElementById(id)?.value) || 0;

    let additional = 0;
    document.querySelectorAll('#additionalFeesList > div').forEach(row => {
        additional += parseInt((row.querySelectorAll('span')[1]?.textContent || '0').replace(/[₹,]/g, '')) || 0;
    });

    const total   = n('admissionFees') + n('uniformFees') + n('bookFees') + n('tuitionFees') + additional;
    const initial = n('initialPayment');
    const balance = Math.max(0, total - initial);
    const fmt     = v => '₹' + v.toLocaleString('en-IN');

    const setText = (id, v) => { const e = document.getElementById(id); if (e) e.textContent = v; };
    setText('totalFeesDisplay',    fmt(total));
    setText('totalFeesAmount',     fmt(total));
    setText('summaryTotal',        fmt(total - additional));
    setText('summaryAdditional',   fmt(additional));
    setText('summaryGrandTotal',   fmt(total));
    setText('summaryPaid',         fmt(initial));
    setText('summaryPending',      fmt(balance));
    setText('summaryBalance',      fmt(balance));
    setText('balanceAmount',       fmt(balance));
    setText('remainingFeeDisplay', fmt(balance));
    setText('qrAmount',            fmt(initial || total));

    calculateInstallments();
}

function calculateInstallments() {
    const breakdown = document.getElementById('installmentBreakdown');
    if (!breakdown) return;
    const n = id => parseInt(document.getElementById(id)?.value) || 0;
    const total   = n('admissionFees') + n('uniformFees') + n('bookFees') + n('tuitionFees');
    const balance = Math.max(0, total - n('initialPayment'));
    const count   = parseInt(document.getElementById('installmentCount')?.value) || 3;

    if (!balance) { breakdown.innerHTML = '<p class="text-sm text-gray-400 italic">No balance remaining.</p>'; return; }

    const perInst   = Math.floor(balance / count);
    const lastInst  = balance - perInst * (count - 1);
    const startVal  = document.getElementById('firstInstallmentDate')?.value;
    const startDate = startVal ? new Date(startVal) : (() => { const d = new Date(); d.setMonth(d.getMonth() + 1); return d; })();

    breakdown.innerHTML = Array.from({ length: count }, (_, i) => {
        const amt     = i === count - 1 ? lastInst : perInst;
        const dueDate = new Date(startDate);
        dueDate.setMonth(dueDate.getMonth() + i);
        
        const displayDate = dueDate.toLocaleDateString('en-IN', {
            day: '2-digit',
            month: 'short',
            year: 'numeric'
        });
        
        const backendDate = dueDate.toISOString().split('T')[0];
        
        return `
            <div class="flex items-center justify-between p-3 bg-blue-50 rounded-lg" 
                 data-due-date="${backendDate}" data-amount="${amt}">
                <div>
                    <span class="font-medium text-gray-700 text-sm">Installment ${i + 1}</span>
                    <span class="text-xs text-gray-500 block">Due: ${displayDate}</span>
                </div>
                <span class="font-semibold text-blue-600 text-sm">₹${amt.toLocaleString('en-IN')}</span>
            </div>`;
    }).join('');
}

function toggleInstallmentOptions() {
    const isInst = document.querySelector('input[name="paymentMode"]:checked')?.value === 'installment';
    document.getElementById('installmentOptions')?.classList.toggle('hidden', !isInst);
    if (isInst) calculateInstallments();
}

function handlePaymentMethodChange() {
    const isOnline = document.querySelector('input[name="paymentMethod"]:checked')?.value === 'online';
    document.getElementById('qrCodeSection')?.classList.toggle('hidden', !isOnline);
    transactionVerified = false;
    if (isOnline) generateQRCodeForPayment(); else closeQRCode();
}

// ─────────────────────────────────────────────────────────────
//  16. ADDRESS
// ─────────────────────────────────────────────────────────────
const togglePermanentAddress = () => {
    const checked = document.getElementById('sameAsLocal')?.checked;
    document.getElementById('permanentAddressSection')?.classList.toggle('hidden', !!checked);
};

// ─────────────────────────────────────────────────────────────
//  17. SPORTS HELPERS
// ─────────────────────────────────────────────────────────────
function toggleOtherSports() {
    const checked = document.getElementById('otherSportsCheckbox')?.checked;
    document.getElementById('otherSportsContainer')?.classList.toggle('hidden', !checked);
    if (!checked) { otherSports = []; updateOtherSportsDisplay(); }
}
function addOtherSports() {
    const input = document.getElementById('otherSportsInput');
    (input?.value || '').split(',').map(s => s.trim()).filter(Boolean).forEach(v => {
        if (!otherSports.includes(v)) otherSports.push(v);
    });
    if (input) input.value = '';
    updateOtherSportsDisplay();
}
const removeOtherSport = sport => { otherSports = otherSports.filter(s => s !== sport); updateOtherSportsDisplay(); };
function updateOtherSportsDisplay() {
    const display = document.getElementById('otherSportsDisplay');
    if (!display) return;
    if (!otherSports.length) { display.innerHTML = ''; display.classList.add('hidden'); return; }
    display.classList.remove('hidden');
    display.innerHTML = otherSports.map(s =>
        `<span class="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium mr-1 mb-1">
            ${s}<button type="button" onclick="removeOtherSport('${s}')" class="ml-1 text-blue-600 hover:text-red-600 font-bold">×</button>
        </span>`
    ).join('');
}

// ─────────────────────────────────────────────────────────────
//  18. SUBJECTS HELPERS
// ─────────────────────────────────────────────────────────────
function toggleOtherSubjects() {
    const checked = document.getElementById('otherSubjectsCheckbox')?.checked;
    document.getElementById('otherSubjectsContainer')?.classList.toggle('hidden', !checked);
    if (!checked) { otherSubjects = []; updateOtherSubjectsDisplay(); }
}
function addOtherSubjects() {
    const input = document.getElementById('otherSubjectsInput');
    (input?.value || '').split(',').map(s => s.trim()).filter(Boolean).forEach(v => {
        if (!otherSubjects.includes(v)) otherSubjects.push(v);
    });
    if (input) input.value = '';
    updateOtherSubjectsDisplay();
}
const removeOtherSubject = subj => { otherSubjects = otherSubjects.filter(s => s !== subj); updateOtherSubjectsDisplay(); };
function updateOtherSubjectsDisplay() {
    const display = document.getElementById('otherSubjectsDisplay');
    if (!display) return;
    if (!otherSubjects.length) { display.innerHTML = ''; display.classList.add('hidden'); return; }
    display.classList.remove('hidden');
    display.innerHTML = otherSubjects.map(s =>
        `<span class="inline-flex items-center gap-1 px-2 py-1 bg-purple-100 text-purple-800 rounded-full text-xs font-medium mr-1 mb-1">
            ${s}<button type="button" onclick="removeOtherSubject('${s}')" class="ml-1 text-purple-600 hover:text-red-600 font-bold">×</button>
        </span>`
    ).join('');
}

// ─────────────────────────────────────────────────────────────
//  19. ADDITIONAL FEES
// ─────────────────────────────────────────────────────────────
function addAdditionalFee() {
    const nameEl = document.getElementById('additionalFeeName');
    const amtEl  = document.getElementById('additionalFeeAmount');
    const name   = nameEl?.value.trim();
    const amount = parseInt(amtEl?.value) || 0;
    if (!name)       { toastWarning('Enter a fee name');      return; }
    if (amount <= 0) { toastWarning('Enter a valid amount');  return; }

    const list = document.getElementById('additionalFeesList');
    if (!list) return;

    const existing = [...list.querySelectorAll('span:first-child')].map(s => s.textContent.trim());
    if (existing.includes(name)) { toastWarning(`"${name}" already added`); return; }

    const div = document.createElement('div');
    div.className = 'flex items-center justify-between p-2 bg-gray-50 rounded-lg border border-gray-200';
    div.innerHTML = `
        <span class="text-sm font-medium text-gray-700">${name}</span>
        <div class="flex items-center gap-3">
            <span class="text-sm font-semibold text-green-600">₹${amount.toLocaleString('en-IN')}</span>
            <button type="button" onclick="this.closest('div.flex').parentElement.remove(); updateFeeCalculations();"
                class="text-red-500 hover:text-red-700"><i class="fas fa-times text-xs"></i></button>
        </div>`;
    list.appendChild(div);
    if (nameEl) nameEl.value = '';
    if (amtEl)  amtEl.value  = '';
    updateFeeCalculations();
}

// ─────────────────────────────────────────────────────────────
//  20. PHOTO & DOCUMENT PREVIEW
// ─────────────────────────────────────────────────────────────
function previewStudentPhoto(input) {
    if (!input?.files?.[0]) return;
    const reader = new FileReader();
    reader.onload = e => {
        const p = document.getElementById('studentPhotoPreview');
        if (p) p.innerHTML = `<img src="${e.target.result}" class="h-full w-full object-cover rounded-full">`;
    };
    reader.readAsDataURL(input.files[0]);
}

function previewDocument(input, previewId) {
    if (!input?.files?.[0]) return;
    const file    = input.files[0];
    const preview = document.getElementById(previewId);
    if (!preview) return;
    if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = e => { preview.innerHTML = `<img src="${e.target.result}" class="h-full w-full object-contain rounded-lg">`; };
        reader.readAsDataURL(file);
    } else {
        preview.innerHTML = `
            <div class="flex flex-col items-center justify-center h-full">
                <i class="fas fa-file-pdf text-3xl text-red-500 mb-2"></i>
                <p class="text-sm text-gray-600 text-center">${file.name}</p>
                <p class="text-xs text-gray-400">${(file.size / 1024).toFixed(1)} KB</p>
            </div>`;
    }
}

function removeDocument(inputId, previewId) {
    const input   = document.getElementById(inputId);
    const preview = document.getElementById(previewId);
    if (input)   input.value = '';
    if (preview) preview.innerHTML = `
        <i class="fas fa-cloud-upload-alt text-3xl text-gray-400 mb-2"></i>
        <p class="text-sm text-gray-500 text-center">Click to upload</p>`;
}

// ─────────────────────────────────────────────────────────────
//  21. TRANSACTION ID VERIFY
// ─────────────────────────────────────────────────────────────
function verifyTransactionId() {
    const txId   = document.getElementById('transactionId')?.value.trim();
    const status = document.getElementById('transactionStatus');
    if (!txId || txId.length < 6) {
        toastError('Transaction ID must be at least 6 characters');
        if (status) status.innerHTML = '<p class="text-xs text-red-500">Invalid Transaction ID</p>';
        return;
    }
    transactionVerified = true;
    toastSuccess('Transaction ID verified ✓');
    if (status) status.innerHTML = '<p class="text-xs text-green-600 font-semibold">✓ Verified</p>';
    const btn = document.querySelector('button[onclick="verifyTransactionId()"]');
    if (btn) { btn.innerHTML = '<i class="fas fa-check mr-2"></i>Verified'; btn.disabled = true; btn.classList.replace('bg-blue-600','bg-green-600'); }
}

// ─────────────────────────────────────────────────────────────
//  22. QR CODE
// ─────────────────────────────────────────────────────────────
function generateQRCodeForPayment() {
    const canvas = document.getElementById('qrCodeCanvas');
    if (!canvas) return;
    const amount = parseInt(document.getElementById('initialPayment')?.value || '0');
    const upiUrl = `upi://pay?pa=school@upi&pn=SchoolFees&am=${amount}&cu=INR&tn=SchoolFees`;

    canvas.innerHTML = '';
    if (typeof QRCode !== 'undefined') {
        try { new QRCode(canvas, { text: upiUrl, width: 200, height: 200, correctLevel: QRCode.CorrectLevel.M }); }
        catch { useFallbackQR(canvas, upiUrl, amount); }
    } else {
        useFallbackQR(canvas, upiUrl, amount);
    }

    qrCodeGenerated = true;
    const qrAmtEl = document.getElementById('qrAmount');
    if (qrAmtEl) qrAmtEl.textContent = '₹' + amount.toLocaleString('en-IN');
}

function useFallbackQR(canvas, upiUrl, amount) {
    canvas.innerHTML = `
        <img src="https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(upiUrl)}"
             alt="QR Code" style="width:180px;height:180px;border-radius:8px;border:1px solid #e5e7eb;">
        <p style="font-size:11px;color:#9ca3af;margin-top:6px;text-align:center;">Amount: ₹${amount.toLocaleString('en-IN')}</p>`;
}

function closeQRCode() {
    const canvas = document.getElementById('qrCodeCanvas');
    if (canvas) canvas.innerHTML = '';
    document.getElementById('qrCodeSection')?.classList.add('hidden');
    qrCodeGenerated = false;
}

const refreshQRCode = () => generateQRCodeForPayment();

const updatePaymentDetails = () => updateFeeCalculations();

// ─────────────────────────────────────────────────────────────
//  23. DOMContentLoaded — INIT
// ─────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
    if (!localStorage.getItem('admin_jwt_token')) {
        window.location.replace('/login.html'); return;
    }

    // Parallel init
    await Promise.all([loadClassesIntoFilters(), loadStudents(0)]);

    // Search & filter
    document.getElementById('searchStudent')      ?.addEventListener('input',  searchAndFilter);
    document.getElementById('filterClass')         ?.addEventListener('change', searchAndFilter);
    document.getElementById('filterSection')       ?.addEventListener('change', searchAndFilter);
    document.getElementById('filterStudentStatus') ?.addEventListener('change', searchAndFilter);

    // Reset filters button
const resetFiltersBtn = document.getElementById('resetFiltersBtn');
if (resetFiltersBtn) {
    resetFiltersBtn.addEventListener('click', resetFilters);
}

    // Sidebar nav
    document.getElementById('navAllStudents')?.addEventListener('click', e => { e.preventDefault(); showAllStudentsSection(); });
    document.getElementById('navAddStudent') ?.addEventListener('click', e => { e.preventDefault(); showAddStudentSection(); });

    window.addEventListener('popstate', checkUrlAndShowSection);

    // Auto student ID
    const autoId = generateStudentId();
    const autoEl = document.getElementById('autoGeneratedId');
    const stIdEl = document.getElementById('studentId');
    if (autoEl) autoEl.textContent = autoId;
    if (stIdEl) stIdEl.value       = autoId;

    // Password match
    const pwdEl   = document.getElementById('studentPassword');
    const cpwdEl  = document.getElementById('confirmStudentPassword');
    const mismatch= document.getElementById('passwordMismatch');
    const checkMatch = () => {
        const bad = !editingStudentId && pwdEl?.value && cpwdEl?.value && pwdEl.value !== cpwdEl.value;
        mismatch?.classList.toggle('hidden', !bad);
    };
    pwdEl ?.addEventListener('input', checkMatch);
    cpwdEl?.addEventListener('input', checkMatch);

    // Fee inputs
    ['admissionFees','uniformFees','bookFees','tuitionFees','initialPayment']
        .forEach(id => document.getElementById(id)?.addEventListener('input', updateFeeCalculations));
    document.getElementById('installmentCount')     ?.addEventListener('change', () => { updateFeeCalculations(); calculateInstallments(); });
    document.getElementById('firstInstallmentDate') ?.addEventListener('change', calculateInstallments);
    document.querySelectorAll('input[name="paymentMode"]').forEach(r => r.addEventListener('change', toggleInstallmentOptions));

    // Address
    document.getElementById('sameAsLocal')?.addEventListener('change', togglePermanentAddress);

    // Photo preview
    document.getElementById('studentPhoto')?.addEventListener('change', function () { previewStudentPhoto(this); });

    // Transaction ID — reset verified state on edit
    document.getElementById('transactionId')?.addEventListener('input', () => {
        transactionVerified = false;
        const s   = document.getElementById('transactionStatus');
        if (s) s.innerHTML = '';
        const btn = document.querySelector('button[onclick="verifyTransactionId()"]');
        if (btn) { btn.innerHTML = '<i class="fas fa-check mr-2"></i>Verify'; btn.disabled = false; btn.classList.replace('bg-green-600','bg-blue-600'); }
    });

    // Enter key shortcuts
    document.getElementById('additionalFeeAmount')?.addEventListener('keypress', e => { if (e.key === 'Enter') { e.preventDefault(); addAdditionalFee(); } });
    document.getElementById('additionalFeeName')  ?.addEventListener('keypress', e => { if (e.key === 'Enter') { e.preventDefault(); document.getElementById('additionalFeeAmount')?.focus(); } });
    document.getElementById('otherSportsInput')   ?.addEventListener('keypress', e => { if (e.key === 'Enter') { e.preventDefault(); addOtherSports(); } });
    document.getElementById('otherSubjectsInput') ?.addEventListener('keypress', e => { if (e.key === 'Enter') { e.preventDefault(); addOtherSubjects(); } });

    // Default first installment date
    const fidEl = document.getElementById('firstInstallmentDate');
    if (fidEl) { const d = new Date(); d.setMonth(d.getMonth() + 1); fidEl.value = d.toISOString().split('T')[0]; }

    // Initial UI
    updateFeeCalculations();
    toggleInstallmentOptions();
    togglePermanentAddress();
    switchTab('personal');

    // ========== ADD THIS LINE ==========
    // Setup real-time validation for all form fields
    setupRealTimeValidation();

    // Sidebar toggle
    document.getElementById('sidebarToggle')?.addEventListener('click', () => {
        const sidebar = document.getElementById('sidebar');
        const main    = document.getElementById('mainContent');
        const icon    = document.getElementById('sidebarToggleIcon');
        if (window.innerWidth < 1024) {
            sidebar?.classList.toggle('mobile-open');
            document.getElementById('sidebarOverlay')?.classList.toggle('active');
        } else {
            sidebar?.classList.toggle('collapsed');
            main   ?.classList.toggle('sidebar-collapsed');
            icon   ?.classList.toggle('fa-bars');
            icon   ?.classList.toggle('fa-times');
        }
    });
    document.getElementById('sidebarOverlay')?.addEventListener('click', function () {
        document.getElementById('sidebar')?.classList.remove('mobile-open');
        this.classList.remove('active');
    });

    // Header dropdowns
    document.getElementById('notificationsBtn')?.addEventListener('click', e => {
        e.stopPropagation();
        document.getElementById('notificationsDropdown')?.classList.toggle('hidden');
    });
    document.getElementById('userMenuBtn')?.addEventListener('click', e => {
        e.stopPropagation();
        document.getElementById('userMenuDropdown')?.classList.toggle('hidden');
    });
    document.addEventListener('click', () => {
        document.getElementById('notificationsDropdown')?.classList.add('hidden');
        document.getElementById('userMenuDropdown')       ?.classList.add('hidden');
    });

        // After loading students, run debug
    setTimeout(() => {
        debugPagination();
    }, 3000);

    checkUrlAndShowSection();
    setActiveSidebarLink();
});