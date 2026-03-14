// Initialize application
document.addEventListener('DOMContentLoaded', function () {
    checkSession();
    setupEventListeners();
    setupResponsiveSidebar();
    initializeClassModule();
});

// Global variables
let sidebarCollapsed = false;
let isMobile = window.innerWidth < 1024;
let classesData = [];
let filteredClasses = [];
let currentPage = 1;
const itemsPerPage = 8;
let currentWeek = 1;
let currentWeekDate = new Date();
let editingClassId = null;
let selectedSubjects = [];
let teachersData = [];
let subjectsData = [];
let bulkAssignData = {
    teachers: [],
    teacherAssignments: {}
};

let selectedClassTeacher = null;
let selectedAssistantTeacher = null;
let assignedSubjects = [];
let allAssignedSubjects = new Set();

// Base API URL
const API_BASE_URL = 'http://localhost:8084/api';

// Session Management
const USER_SESSION_KEY = 'school_portal_session';

function checkSession() {
    const session = localStorage.getItem(USER_SESSION_KEY);
    if (!session) {
        window.location.href = 'login.html';
        return;
    }
    const { username, expires } = JSON.parse(session);
    if (new Date(expires) < new Date()) {
        localStorage.removeItem(USER_SESSION_KEY);
        window.location.href = 'login.html';
    }
}

function handleLogout() {
    if (confirm('Are you sure you want to logout?')) {
        localStorage.removeItem(USER_SESSION_KEY);
        window.location.href = 'login.html';
    }
}

// Setup Event Listeners
function setupEventListeners() {
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', handleLogout);
    }

    const sidebarToggle = document.getElementById('sidebarToggle');
    if (sidebarToggle) {
        sidebarToggle.addEventListener('click', toggleSidebar);
    }

    const notificationsBtn = document.getElementById('notificationsBtn');
    if (notificationsBtn) {
        notificationsBtn.addEventListener('click', toggleNotifications);
    }

    const userMenuBtn = document.getElementById('userMenuBtn');
    if (userMenuBtn) {
        userMenuBtn.addEventListener('click', toggleUserMenu);
    }

    document.addEventListener('click', function (event) {
        const notificationsDropdown = document.getElementById('notificationsDropdown');
        const userMenuDropdown = document.getElementById('userMenuDropdown');

        if (notificationsBtn && !event.target.closest('#notificationsBtn') && notificationsDropdown) {
            notificationsDropdown.classList.add('hidden');
        }
        if (userMenuBtn && !event.target.closest('#userMenuBtn') && userMenuDropdown) {
            userMenuDropdown.classList.add('hidden');
        }

        if (!event.target.closest('.bulk-assign-dropdown')) {
            closeAllBulkAssignDropdowns();
        }
    });

       // Add click listener for create class button
    const createClassBtn = document.querySelector('button[onclick="openCreateClassModal()"]');
    if (createClassBtn) {
        // Remove the onclick attribute and add event listener
        createClassBtn.removeAttribute('onclick');
        createClassBtn.addEventListener('click', openCreateClassModal);
    }

    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('input', function (e) {
            setTimeout(() => {
                applyFilters();
            }, 300);
        });
    }

    const classFilter = document.getElementById('classFilter');
    const sectionFilter = document.getElementById('sectionFilter');
    const yearFilter = document.getElementById('yearFilter');

    if (classFilter) {
        classFilter.addEventListener('change', applyFilters);
    }
    if (sectionFilter) {
        sectionFilter.addEventListener('change', applyFilters);
    }
    if (yearFilter) {
        yearFilter.addEventListener('change', applyFilters);
    }

    const classTeacherSelect = document.getElementById('classTeacher');
    const assistantTeacherSelect = document.getElementById('assistantTeacher');
    const classTeacherSubjectSelect = document.getElementById('classTeacherSubject');
    const assistantTeacherSubjectSelect = document.getElementById('assistantTeacherSubject');

    if (classTeacherSelect) {
        classTeacherSelect.addEventListener('change', handleClassTeacherChange);
    }
    if (assistantTeacherSelect) {
        assistantTeacherSelect.addEventListener('change', handleAssistantTeacherChange);
    }
    if (classTeacherSubjectSelect) {
        classTeacherSubjectSelect.addEventListener('change', handleClassTeacherSubjectChange);
    }
    if (assistantTeacherSubjectSelect) {
        assistantTeacherSubjectSelect.addEventListener('change', handleAssistantTeacherSubjectChange);
    }

    const classForm = document.getElementById('classForm');
    if (classForm) {
        classForm.addEventListener('submit', handleClassFormSubmit);
    }

    const prevBtn = document.getElementById('prevBtn');
    const nextBtn = document.getElementById('nextBtn');

    if (prevBtn) {
        prevBtn.addEventListener('click', previousPage);
    }
    if (nextBtn) {
        nextBtn.addEventListener('click', nextPage);
    }
}

// ==================== TEACHER API FUNCTIONS ====================

async function fetchTeachers() {
    try {
        showLoading();
        console.log('Fetching teachers from backend API...');
        const response = await fetch(`${API_BASE_URL}/teachers/get-all-teachers`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            }
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const result = await response.json();
        console.log('Teachers API response:', result);

        if (result.success && result.data) {
            teachersData = transformTeachersData(result.data);
            console.log('Transformed teachers data:', teachersData);
        } else {
            teachersData = [];
            console.warn('No teachers data received');
        }

        populateTeacherDropdowns();
        initializeTeachersDropdown();
        showToast('Teachers loaded successfully', 'success');
        return teachersData;
    } catch (error) {
        console.error('Error fetching teachers:', error);
        teachersData = [];
        showToast('Failed to load teachers from server', 'error');
        return [];
    } finally {
        hideLoading();
    }
}

async function fetchTeacherById(teacherId) {
    try {
        const response = await fetch(`${API_BASE_URL}/teachers/get-teacher-by-id/${teacherId}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            }
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const result = await response.json();
        if (result.success && result.data) {
            return transformTeacherData(result.data);
        }
        return null;
    } catch (error) {
        console.error('Error fetching teacher by ID:', error);
        return null;
    }
}

async function fetchTeacherByCode(teacherCode) {
    try {
        const response = await fetch(`${API_BASE_URL}/teachers/get-teacher-by-code/${teacherCode}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            }
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const result = await response.json();
        if (result.success && result.data) {
            return transformTeacherData(result.data);
        }
        return null;
    } catch (error) {
        console.error('Error fetching teacher by code:', error);
        return null;
    }
}

async function fetchActiveTeachers() {
    try {
        const response = await fetch(`${API_BASE_URL}/teachers/get-active-teachers`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            }
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const result = await response.json();
        if (result.success && result.data) {
            return transformTeachersData(result.data);
        }
        return [];
    } catch (error) {
        console.error('Error fetching active teachers:', error);
        return [];
    }
}

async function fetchTeachersByStatus(status) {
    try {
        const response = await fetch(`${API_BASE_URL}/teachers/get-teachers-by-status/${status}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            }
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const result = await response.json();
        if (result.success && result.data) {
            return transformTeachersData(result.data);
        }
        return [];
    } catch (error) {
        console.error('Error fetching teachers by status:', error);
        return [];
    }
}

async function fetchTeachersByDepartment(department) {
    try {
        const response = await fetch(`${API_BASE_URL}/teachers/get-teachers-by-department/${department}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            }
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const result = await response.json();
        if (result.success && result.data) {
            return transformTeachersData(result.data);
        }
        return [];
    } catch (error) {
        console.error('Error fetching teachers by department:', error);
        return [];
    }
}

async function searchTeachers(searchName) {
    try {
        const response = await fetch(`${API_BASE_URL}/teachers/search-teachers?name=${encodeURIComponent(searchName)}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            }
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const result = await response.json();
        if (result.success && result.data) {
            return transformTeachersData(result.data);
        }
        return [];
    } catch (error) {
        console.error('Error searching teachers:', error);
        return [];
    }
}

async function createTeacher(teacherData, files = {}) {
    try {
        showLoading();
        console.log('Creating teacher with data:', teacherData);

        const formData = new FormData();
        formData.append('teacherData', JSON.stringify(teacherData));

        // Append files if provided
        if (files.teacherPhoto) formData.append('teacherPhoto', files.teacherPhoto);
        if (files.aadharDocument) formData.append('aadharDocument', files.aadharDocument);
        if (files.panDocument) formData.append('panDocument', files.panDocument);
        if (files.educationDocument) formData.append('educationDocument', files.educationDocument);
        if (files.bedDocument) formData.append('bedDocument', files.bedDocument);
        if (files.experienceDocument) formData.append('experienceDocument', files.experienceDocument);
        if (files.policeVerificationDocument) formData.append('policeVerificationDocument', files.policeVerificationDocument);
        if (files.medicalFitnessDocument) formData.append('medicalFitnessDocument', files.medicalFitnessDocument);
        if (files.resumeDocument) formData.append('resumeDocument', files.resumeDocument);

        const response = await fetch(`${API_BASE_URL}/teachers/create-teacher`, {
            method: 'POST',
            headers: {
                'X-Created-By': 'admin'
            },
            body: formData
        });

        if (!response.ok) {
            const errorData = await response.text();
            throw new Error(`HTTP error! status: ${response.status}, message: ${errorData}`);
        }

        const result = await response.json();
        console.log('Create teacher response:', result);

        if (result.success) {
            showToast('Teacher created successfully', 'success');
            return result.data;
        } else {
            throw new Error(result.message || 'Failed to create teacher');
        }
    } catch (error) {
        console.error('Error creating teacher:', error);
        showToast('Failed to create teacher: ' + error.message, 'error');
        throw error;
    } finally {
        hideLoading();
    }
}

async function updateTeacher(teacherId, teacherData) {
    try {
        showLoading();
        console.log('Updating teacher with ID:', teacherId, 'data:', teacherData);

        const response = await fetch(`${API_BASE_URL}/teachers/update-teacher/${teacherId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(teacherData)
        });

        if (!response.ok) {
            const errorData = await response.text();
            throw new Error(`HTTP error! status: ${response.status}, message: ${errorData}`);
        }

        const result = await response.json();
        console.log('Update teacher response:', result);

        if (result.success) {
            showToast('Teacher updated successfully', 'success');
            return result.data;
        } else {
            throw new Error(result.message || 'Failed to update teacher');
        }
    } catch (error) {
        console.error('Error updating teacher:', error);
        showToast('Failed to update teacher: ' + error.message, 'error');
        throw error;
    } finally {
        hideLoading();
    }
}

async function updateTeacherWithFiles(teacherId, teacherData, files = {}) {
    try {
        showLoading();
        console.log('Updating teacher with files, ID:', teacherId);

        const formData = new FormData();
        formData.append('teacherData', JSON.stringify(teacherData));

        if (files.teacherPhoto) formData.append('teacherPhoto', files.teacherPhoto);
        if (files.aadharDocument) formData.append('aadharDocument', files.aadharDocument);
        if (files.panDocument) formData.append('panDocument', files.panDocument);
        if (files.educationDocument) formData.append('educationDocument', files.educationDocument);
        if (files.bedDocument) formData.append('bedDocument', files.bedDocument);
        if (files.experienceDocument) formData.append('experienceDocument', files.experienceDocument);
        if (files.policeVerificationDocument) formData.append('policeVerificationDocument', files.policeVerificationDocument);
        if (files.medicalFitnessDocument) formData.append('medicalFitnessDocument', files.medicalFitnessDocument);
        if (files.resumeDocument) formData.append('resumeDocument', files.resumeDocument);

        const response = await fetch(`${API_BASE_URL}/teachers/update-with-files/${teacherId}`, {
            method: 'PUT',
            body: formData
        });

        if (!response.ok) {
            const errorData = await response.text();
            throw new Error(`HTTP error! status: ${response.status}, message: ${errorData}`);
        }

        const result = await response.json();
        console.log('Update teacher with files response:', result);

        if (result.success) {
            showToast('Teacher updated successfully with files', 'success');
            return result.data;
        } else {
            throw new Error(result.message || 'Failed to update teacher');
        }
    } catch (error) {
        console.error('Error updating teacher with files:', error);
        showToast('Failed to update teacher: ' + error.message, 'error');
        throw error;
    } finally {
        hideLoading();
    }
}

async function updateTeacherStatus(teacherCode, status) {
    try {
        showLoading();
        console.log('Updating teacher status:', teacherCode, 'to', status);

        const response = await fetch(`${API_BASE_URL}/teachers/update-teacher-status/${teacherCode}?status=${encodeURIComponent(status)}`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
            }
        });

        if (!response.ok) {
            const errorData = await response.text();
            throw new Error(`HTTP error! status: ${response.status}, message: ${errorData}`);
        }

        const result = await response.json();
        console.log('Update teacher status response:', result);

        if (result.success) {
            showToast(`Teacher status updated to ${status}`, 'success');
            return result.data;
        } else {
            throw new Error(result.message || 'Failed to update teacher status');
        }
    } catch (error) {
        console.error('Error updating teacher status:', error);
        showToast('Failed to update teacher status: ' + error.message, 'error');
        throw error;
    } finally {
        hideLoading();
    }
}

async function updateTeacherPassword(teacherCode, newPassword, confirmPassword) {
    try {
        showLoading();
        console.log('Updating teacher password for:', teacherCode);

        const response = await fetch(`${API_BASE_URL}/teachers/update-teacher-password/${teacherCode}?newPassword=${encodeURIComponent(newPassword)}&confirmPassword=${encodeURIComponent(confirmPassword)}`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
            }
        });

        if (!response.ok) {
            const errorData = await response.text();
            throw new Error(`HTTP error! status: ${response.status}, message: ${errorData}`);
        }

        const result = await response.json();
        console.log('Update teacher password response:', result);

        if (result.success) {
            showToast('Teacher password updated successfully', 'success');
            return result.data;
        } else {
            throw new Error(result.message || 'Failed to update teacher password');
        }
    } catch (error) {
        console.error('Error updating teacher password:', error);
        showToast('Failed to update teacher password: ' + error.message, 'error');
        throw error;
    } finally {
        hideLoading();
    }
}

async function uploadTeacherDocuments(teacherCode, fileNames) {
    try {
        showLoading();
        console.log('Uploading documents for teacher:', teacherCode);

        const response = await fetch(`${API_BASE_URL}/teachers/upload-documents/${teacherCode}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(fileNames)
        });

        if (!response.ok) {
            const errorData = await response.text();
            throw new Error(`HTTP error! status: ${response.status}, message: ${errorData}`);
        }

        const result = await response.json();
        console.log('Upload documents response:', result);

        if (result.success) {
            showToast('Documents uploaded successfully', 'success');
            return result.data;
        } else {
            throw new Error(result.message || 'Failed to upload documents');
        }
    } catch (error) {
        console.error('Error uploading documents:', error);
        showToast('Failed to upload documents: ' + error.message, 'error');
        throw error;
    } finally {
        hideLoading();
    }
}

async function updateSingleDocument(teacherCode, documentType, file) {
    try {
        showLoading();
        console.log('Updating single document for teacher:', teacherCode, 'type:', documentType);

        const formData = new FormData();
        formData.append('file', file);

        const response = await fetch(`${API_BASE_URL}/teachers/update-single-document/${teacherCode}/${documentType}`, {
            method: 'POST',
            body: formData
        });

        if (!response.ok) {
            const errorData = await response.text();
            throw new Error(`HTTP error! status: ${response.status}, message: ${errorData}`);
        }

        const result = await response.json();
        console.log('Update single document response:', result);

        if (result.success) {
            showToast('Document updated successfully', 'success');
            return result.data;
        } else {
            throw new Error(result.message || 'Failed to update document');
        }
    } catch (error) {
        console.error('Error updating document:', error);
        showToast('Failed to update document: ' + error.message, 'error');
        throw error;
    } finally {
        hideLoading();
    }
}

async function softDeleteTeacher(teacherCode) {
    try {
        showLoading();
        console.log('Soft deleting teacher with code:', teacherCode);

        const response = await fetch(`${API_BASE_URL}/teachers/soft-delete-teacher/${teacherCode}`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
            }
        });

        if (!response.ok) {
            const errorData = await response.text();
            throw new Error(`HTTP error! status: ${response.status}, message: ${errorData}`);
        }

        const result = await response.json();
        console.log('Soft delete teacher response:', result);

        if (result.success) {
            showToast('Teacher soft deleted successfully', 'success');
            return true;
        } else {
            throw new Error(result.message || 'Failed to soft delete teacher');
        }
    } catch (error) {
        console.error('Error soft deleting teacher:', error);
        showToast('Failed to soft delete teacher: ' + error.message, 'error');
        throw error;
    } finally {
        hideLoading();
    }
}

async function hardDeleteTeacher(teacherId) {
    if (!confirm('Are you sure you want to permanently delete this teacher? This action cannot be undone.')) {
        return;
    }

    try {
        showLoading();
        console.log('Hard deleting teacher with ID:', teacherId);

        const response = await fetch(`${API_BASE_URL}/teachers/delete-teacher/${teacherId}`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
            }
        });

        if (!response.ok) {
            const errorData = await response.text();
            throw new Error(`HTTP error! status: ${response.status}, message: ${errorData}`);
        }

        const result = await response.json();
        console.log('Hard delete teacher response:', result);

        if (result.success) {
            showToast('Teacher permanently deleted', 'success');
            return true;
        } else {
            throw new Error(result.message || 'Failed to delete teacher');
        }
    } catch (error) {
        console.error('Error hard deleting teacher:', error);
        showToast('Failed to delete teacher: ' + error.message, 'error');
        throw error;
    } finally {
        hideLoading();
    }
}

async function checkTeacherEmailExists(email) {
    try {
        const response = await fetch(`${API_BASE_URL}/teachers/check-email-exists/${encodeURIComponent(email)}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            }
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const result = await response.json();
        return result.exists;
    } catch (error) {
        console.error('Error checking email exists:', error);
        return false;
    }
}

async function checkTeacherContactExists(contactNumber) {
    try {
        const response = await fetch(`${API_BASE_URL}/teachers/check-contact-exists/${encodeURIComponent(contactNumber)}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            }
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const result = await response.json();
        return result.exists;
    } catch (error) {
        console.error('Error checking contact exists:', error);
        return false;
    }
}

async function checkTeacherAadharExists(aadharNumber) {
    try {
        const response = await fetch(`${API_BASE_URL}/teachers/check-aadhar-exists/${encodeURIComponent(aadharNumber)}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            }
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const result = await response.json();
        return result.exists;
    } catch (error) {
        console.error('Error checking aadhar exists:', error);
        return false;
    }
}

async function checkTeacherPanExists(panNumber) {
    try {
        const response = await fetch(`${API_BASE_URL}/teachers/check-pan-exists/${encodeURIComponent(panNumber)}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            }
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const result = await response.json();
        return result.exists;
    } catch (error) {
        console.error('Error checking pan exists:', error);
        return false;
    }
}

async function checkTeacherEmployeeIdExists(employeeId) {
    try {
        const response = await fetch(`${API_BASE_URL}/teachers/check-employee-id-exists/${encodeURIComponent(employeeId)}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            }
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const result = await response.json();
        return result.exists;
    } catch (error) {
        console.error('Error checking employee ID exists:', error);
        return false;
    }
}

async function checkTeacherCodeExists(teacherCode) {
    try {
        const response = await fetch(`${API_BASE_URL}/teachers/check-teacher-code-exists/${encodeURIComponent(teacherCode)}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            }
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const result = await response.json();
        return result.exists;
    } catch (error) {
        console.error('Error checking teacher code exists:', error);
        return false;
    }
}

async function generateTeacherCode() {
    try {
        const response = await fetch(`${API_BASE_URL}/teachers/generate-teacher-code`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            }
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const result = await response.json();
        return result.teacherCode;
    } catch (error) {
        console.error('Error generating teacher code:', error);
        return 'TCH' + Date.now();
    }
}

async function getTeacherCount() {
    try {
        const response = await fetch(`${API_BASE_URL}/teachers/get-teacher-count`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            }
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const result = await response.json();
        return result.total;
    } catch (error) {
        console.error('Error getting teacher count:', error);
        return 0;
    }
}

async function getActiveTeacherCount() {
    try {
        const response = await fetch(`${API_BASE_URL}/teachers/get-active-teacher-count`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            }
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const result = await response.json();
        return result.active;
    } catch (error) {
        console.error('Error getting active teacher count:', error);
        return 0;
    }
}

async function getAllTeacherDepartments() {
    try {
        const response = await fetch(`${API_BASE_URL}/teachers/get-all-departments`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            }
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const result = await response.json();
        return result.departments || [];
    } catch (error) {
        console.error('Error getting departments:', error);
        return [];
    }
}

async function authenticateTeacher(employeeId, password) {
    try {
        showLoading();
        const response = await fetch(`${API_BASE_URL}/teachers/authenticate`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ employeeId, password })
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const result = await response.json();
        return result;
    } catch (error) {
        console.error('Error authenticating teacher:', error);
        showToast('Authentication failed: ' + error.message, 'error');
        return { authenticated: false };
    } finally {
        hideLoading();
    }
}

async function authenticateTeacherByCode(teacherCode, password) {
    try {
        showLoading();
        const response = await fetch(`${API_BASE_URL}/teachers/authenticate-by-code`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ teacherCode, password })
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const result = await response.json();
        return result;
    } catch (error) {
        console.error('Error authenticating teacher by code:', error);
        showToast('Authentication failed: ' + error.message, 'error');
        return { authenticated: false };
    } finally {
        hideLoading();
    }
}

// Transform teacher data helper functions
function transformTeachersData(backendTeachers) {
    if (!backendTeachers || !Array.isArray(backendTeachers)) {
        return [];
    }

    return backendTeachers.map(teacher => transformTeacherData(teacher));
}

function transformTeacherData(teacher) {
    return {
        id: teacher.teacherId || teacher.id,
        teacherId: teacher.teacherCode || `TCH${teacher.id}`,
        name: teacher.fullName || `${teacher.firstName || ''} ${teacher.lastName || ''}`.trim(),
        firstName: teacher.firstName || '',
        lastName: teacher.lastName || '',
        dob: teacher.dob || '',
        gender: teacher.gender || '',
        bloodGroup: teacher.bloodGroup || '',
        address: teacher.address || '',
        photo: teacher.teacherPhotoUrl || null,
        contactNumber: teacher.contactNumber || '',
        email: teacher.email || '',
        emergencyContactName: teacher.emergencyContactName || '',
        emergencyContactNumber: teacher.emergencyContactNumber || '',
        aadharNumber: teacher.aadharNumber || '',
        panNumber: teacher.panNumber || '',
        medicalInfo: teacher.medicalInfo || '',
        joiningDate: teacher.joiningDate || '',
        designation: teacher.designation || '',
        totalExperience: teacher.totalExperience || 0,
        department: teacher.department || '',
        employmentType: teacher.employmentType || '',
        employeeId: teacher.employeeId || `EMP${teacher.id}`,
        previousExperience: teacher.previousExperience || [],
        qualifications: teacher.qualifications || [],
        primarySubject: teacher.primarySubject || 'Not Assigned',
        additionalSubjects: teacher.additionalSubjects || [],
        classes: teacher.classes || [],
        salary: {
            basic: teacher.basicSalary || 0,
            hra: teacher.hra || 0,
            da: teacher.da || 0,
            ta: teacher.ta || 0,
            additional: 0,
            total: teacher.grossSalary || 0
        },
        bankDetails: {
            bankName: teacher.bankName || '',
            accountNumber: teacher.accountNumber || '',
            ifscCode: teacher.ifscCode || '',
            branchName: teacher.branchName || ''
        },
        documents: {
            teacherPhoto: teacher.teacherPhotoUrl,
            aadharDocument: teacher.aadharDocumentUrl,
            panDocument: teacher.panDocumentUrl,
            educationDocument: teacher.educationDocumentUrl,
            bedDocument: teacher.bedDocumentUrl,
            experienceDocument: teacher.experienceDocumentUrl,
            policeVerificationDocument: teacher.policeVerificationDocumentUrl,
            medicalFitnessDocument: teacher.medicalFitnessDocumentUrl,
            resumeDocument: teacher.resumeDocumentUrl
        },
        status: teacher.status || 'Active',
        createdAt: teacher.createdAt || new Date().toISOString(),
        updatedAt: teacher.updatedAt || new Date().toISOString()
    };
}

// ==================== SUBJECT API FUNCTIONS ====================

async function fetchSubjects() {
    try {
        console.log('Fetching subjects from backend API...');
        const response = await fetch(`${API_BASE_URL}/subjects/get-all`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            }
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const subjects = await response.json();
        console.log('Subjects API response:', subjects);

        if (Array.isArray(subjects)) {
            subjectsData = transformSubjectsData(subjects);
        } else if (subjects.data && Array.isArray(subjects.data)) {
            subjectsData = transformSubjectsData(subjects.data);
        } else {
            subjectsData = [];
        }

        console.log('Transformed subjects data:', subjectsData);
        return subjectsData;
    } catch (error) {
        console.error('Error fetching subjects:', error);
        subjectsData = [];
        return [];
    }
}

async function fetchSubjectById(subjectId) {
    try {
        const response = await fetch(`${API_BASE_URL}/subjects/get-subject-by-id/get/${subjectId}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            }
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const subject = await response.json();
        return transformSubjectData(subject);
    } catch (error) {
        console.error('Error fetching subject by ID:', error);
        return null;
    }
}

async function fetchSubjectByCode(subjectCode) {
    try {
        const response = await fetch(`${API_BASE_URL}/subjects/get-subject-by-code/${subjectCode}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            }
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const subject = await response.json();
        return transformSubjectData(subject);
    } catch (error) {
        console.error('Error fetching subject by code:', error);
        return null;
    }
}

async function fetchSubjectsByType(subjectType) {
    try {
        const response = await fetch(`${API_BASE_URL}/subjects/get-subject-by-type/${subjectType}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            }
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const subjects = await response.json();
        return transformSubjectsData(subjects);
    } catch (error) {
        console.error('Error fetching subjects by type:', error);
        return [];
    }
}

async function fetchSubjectsByGradeLevel(gradeLevel) {
    try {
        const response = await fetch(`${API_BASE_URL}/subjects/get-subjects-by-grade-level/${gradeLevel}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            }
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const subjects = await response.json();
        return transformSubjectsData(subjects);
    } catch (error) {
        console.error('Error fetching subjects by grade level:', error);
        return [];
    }
}

async function fetchSubjectsByTeacher(teacherId) {
    try {
        const response = await fetch(`${API_BASE_URL}/subjects/get-subject-by-teacher/${teacherId}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            }
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const subjects = await response.json();
        return transformSubjectsData(subjects);
    } catch (error) {
        console.error('Error fetching subjects by teacher:', error);
        return [];
    }
}

async function createSubject(subjectData) {
    try {
        showLoading();
        console.log('Creating subject with data:', subjectData);

        const response = await fetch(`${API_BASE_URL}/subjects/create`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(subjectData)
        });

        if (!response.ok) {
            const errorData = await response.text();
            throw new Error(`HTTP error! status: ${response.status}, message: ${errorData}`);
        }

        const result = await response.json();
        console.log('Create subject response:', result);

        showToast('Subject created successfully', 'success');
        return result;
    } catch (error) {
        console.error('Error creating subject:', error);
        showToast('Failed to create subject: ' + error.message, 'error');
        throw error;
    } finally {
        hideLoading();
    }
}

async function updateSubject(subjectId, subjectData) {
    try {
        showLoading();
        console.log('Updating subject with ID:', subjectId, 'data:', subjectData);

        const response = await fetch(`${API_BASE_URL}/subjects/update-subject/${subjectId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(subjectData)
        });

        if (!response.ok) {
            const errorData = await response.text();
            throw new Error(`HTTP error! status: ${response.status}, message: ${errorData}`);
        }

        const result = await response.json();
        console.log('Update subject response:', result);

        showToast('Subject updated successfully', 'success');
        return result;
    } catch (error) {
        console.error('Error updating subject:', error);
        showToast('Failed to update subject: ' + error.message, 'error');
        throw error;
    } finally {
        hideLoading();
    }
}

async function updateSubjectTeacher(subjectId, teacherId) {
    try {
        showLoading();
        console.log('Updating subject teacher - Subject ID:', subjectId, 'Teacher ID:', teacherId);

        const response = await fetch(`${API_BASE_URL}/subjects/update-subject-teacher/${subjectId}?teacherId=${teacherId}`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
            }
        });

        if (!response.ok) {
            const errorData = await response.text();
            throw new Error(`HTTP error! status: ${response.status}, message: ${errorData}`);
        }

        const result = await response.json();
        console.log('Update subject teacher response:', result);

        showToast('Subject teacher updated successfully', 'success');
        return result;
    } catch (error) {
        console.error('Error updating subject teacher:', error);
        showToast('Failed to update subject teacher: ' + error.message, 'error');
        throw error;
    } finally {
        hideLoading();
    }
}

async function updateSubjectStatus(subjectId, status) {
    try {
        showLoading();
        console.log('Updating subject status - ID:', subjectId, 'Status:', status);

        const response = await fetch(`${API_BASE_URL}/subjects/update-subject-status/${subjectId}?status=${encodeURIComponent(status)}`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
            }
        });

        if (!response.ok) {
            const errorData = await response.text();
            throw new Error(`HTTP error! status: ${response.status}, message: ${errorData}`);
        }

        const result = await response.json();
        console.log('Update subject status response:', result);

        showToast(`Subject status updated to ${status}`, 'success');
        return result;
    } catch (error) {
        console.error('Error updating subject status:', error);
        showToast('Failed to update subject status: ' + error.message, 'error');
        throw error;
    } finally {
        hideLoading();
    }
}

async function updateSubjectDisplayOrder(subjectId, displayOrder) {
    try {
        showLoading();
        console.log('Updating subject display order - ID:', subjectId, 'Order:', displayOrder);

        const response = await fetch(`${API_BASE_URL}/subjects/update-subject-display-order/${subjectId}?displayOrder=${displayOrder}`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
            }
        });

        if (!response.ok) {
            const errorData = await response.text();
            throw new Error(`HTTP error! status: ${response.status}, message: ${errorData}`);
        }

        const result = await response.json();
        console.log('Update subject display order response:', result);

        showToast('Subject display order updated successfully', 'success');
        return result;
    } catch (error) {
        console.error('Error updating subject display order:', error);
        showToast('Failed to update subject display order: ' + error.message, 'error');
        throw error;
    } finally {
        hideLoading();
    }
}

async function deleteSubject(subjectId) {
    if (!confirm('Are you sure you want to delete this subject? This action cannot be undone.')) {
        return;
    }

    try {
        showLoading();
        console.log('Deleting subject with ID:', subjectId);

        const response = await fetch(`${API_BASE_URL}/subjects/delete-subject/${subjectId}`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
            }
        });

        if (!response.ok) {
            const errorData = await response.text();
            throw new Error(`HTTP error! status: ${response.status}, message: ${errorData}`);
        }

        const result = await response.text();
        console.log('Delete subject response:', result);

        showToast('Subject deleted successfully', 'success');
        return true;
    } catch (error) {
        console.error('Error deleting subject:', error);
        showToast('Failed to delete subject: ' + error.message, 'error');
        throw error;
    } finally {
        hideLoading();
    }
}

async function checkSubjectCodeExists(subjectCode) {
    try {
        const response = await fetch(`${API_BASE_URL}/subjects/check-subject-code-exists/${encodeURIComponent(subjectCode)}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            }
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const result = await response.json();
        return result;
    } catch (error) {
        console.error('Error checking subject code exists:', error);
        return false;
    }
}

async function fetchSubjectsForClass(gradeLevel, section) {
    try {
        const response = await fetch(`${API_BASE_URL}/subjects/get-subject-for-class?gradeLevel=${encodeURIComponent(gradeLevel)}&section=${encodeURIComponent(section)}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            }
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const subjects = await response.json();
        return transformSubjectsData(subjects);
    } catch (error) {
        console.error('Error fetching subjects for class:', error);
        return [];
    }
}

async function validateSubjectCombination(subjectIds) {
    try {
        const response = await fetch(`${API_BASE_URL}/subjects/validate-subject-combination`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(subjectIds)
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const result = await response.json();
        return result;
    } catch (error) {
        console.error('Error validating subject combination:', error);
        return false;
    }
}

async function getSubjectStatistics() {
    try {
        const response = await fetch(`${API_BASE_URL}/subjects/get-subject-statistics`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            }
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const result = await response.json();
        return result;
    } catch (error) {
        console.error('Error getting subject statistics:', error);
        return {};
    }
}

// Transform subject data helper functions
function transformSubjectsData(backendSubjects) {
    if (!backendSubjects || !Array.isArray(backendSubjects)) {
        return [];
    }

    return backendSubjects.map(subject => transformSubjectData(subject));
}

function transformSubjectData(subject) {
    return {
        id: subject.subjectId,
        subjectId: subject.subjectId,
        name: subject.subjectName,
        subjectName: subject.subjectName,
        subjectCode: subject.subjectCode,
        description: subject.description || '',
        color: subject.colorCode || getSubjectColor(subject.subjectName),
        grade: subject.gradeLevel || 'PG-2nd',
        gradeLevel: subject.gradeLevel || 'PG-2nd',
        subjectType: subject.subjectType || 'CORE',
        maxMarks: subject.maxMarks || 100,
        passingMarks: subject.passingMarks || 35,
        creditHours: subject.creditHours || 4,
        periodsPerWeek: subject.periodsPerWeek || 5,
        teacherId: subject.teacherId || null,
        teacherName: subject.teacherName || '',
        status: subject.status || 'ACTIVE',
        displayOrder: subject.displayOrder || 0,
        isCustom: true,
        createdAt: subject.createdAt || new Date().toISOString(),
        updatedAt: subject.updatedAt || new Date().toISOString()
    };
}

function getSubjectColor(subjectName) {
    const colors = [
        '#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6',
        '#EC4899', '#06B6D4', '#84CC16', '#6366F1', '#F97316'
    ];
    const index = (subjectName?.length || 0) % colors.length;
    return colors[index];
}

// ==================== CLASS API FUNCTIONS ====================

async function fetchClasses() {
    try {
        console.log('Fetching classes from backend API...');
        const response = await fetch(`${API_BASE_URL}/classes/get-all-classes`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            }
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const classes = await response.json();
        console.log('Classes API response:', classes);

        if (Array.isArray(classes)) {
            classesData = await transformClassesData(classes);
        } else if (classes.data && Array.isArray(classes.data)) {
            classesData = await transformClassesData(classes.data);
        } else {
            classesData = [];
        }

        filteredClasses = [...classesData];
        console.log('Transformed classes data:', classesData);
        
        updateClassStatistics();
        renderClassesTable();
        generateSchedule();
        
        return classesData;
    } catch (error) {
        console.error('Error fetching classes:', error);
        classesData = [];
        filteredClasses = [];
        return [];
    }
}

async function fetchClassById(classId) {
    try {
        const response = await fetch(`${API_BASE_URL}/classes/get-class-by-id/${classId}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            }
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const classData = await response.json();
        return await transformClassData(classData);
    } catch (error) {
        console.error('Error fetching class by ID:', error);
        return null;
    }
}

async function fetchClassByCode(classCode) {
    try {
        const response = await fetch(`${API_BASE_URL}/classes/get-class-by-code/${classCode}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            }
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const classData = await response.json();
        return await transformClassData(classData);
    } catch (error) {
        console.error('Error fetching class by code:', error);
        return null;
    }
}

async function fetchClassesByAcademicYear(academicYear) {
    try {
        const response = await fetch(`${API_BASE_URL}/classes/get-classes-by-academic-year/${academicYear}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            }
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const classes = await response.json();
        return await transformClassesData(classes);
    } catch (error) {
        console.error('Error fetching classes by academic year:', error);
        return [];
    }
}

async function fetchClassesByClassName(className) {
    try {
        const response = await fetch(`${API_BASE_URL}/classes/get-classes-by-name/${className}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            }
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const classes = await response.json();
        return await transformClassesData(classes);
    } catch (error) {
        console.error('Error fetching classes by class name:', error);
        return [];
    }
}

async function fetchClassesByTeacher(teacherId) {
    try {
        const response = await fetch(`${API_BASE_URL}/classes/get-classes-by-teacher/${teacherId}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            }
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const classes = await response.json();
        return await transformClassesData(classes);
    } catch (error) {
        console.error('Error fetching classes by teacher:', error);
        return [];
    }
}

async function createClass(classData) {
    try {
        showLoading();
        console.log('Creating class with data:', classData);

        const backendData = transformClassDataForBackend(classData);
        console.log('Transformed data for backend:', backendData);

        const response = await fetch(`${API_BASE_URL}/classes/create-class`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(backendData)
        });

        if (!response.ok) {
            const errorData = await response.text();
            throw new Error(`HTTP error! status: ${response.status}, message: ${errorData}`);
        }

        const result = await response.json();
        console.log('Create class response:', result);

        showToast('Class created successfully', 'success');
        return result;
    } catch (error) {
        console.error('Error creating class:', error);
        showToast('Failed to create class: ' + error.message, 'error');
        throw error;
    } finally {
        hideLoading();
    }
}

async function createClassBasic(classData) {
    try {
        showLoading();
        console.log('Creating basic class with data:', classData);

        const response = await fetch(`${API_BASE_URL}/classes/create-class-basic`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(classData)
        });

        if (!response.ok) {
            const errorData = await response.text();
            throw new Error(`HTTP error! status: ${response.status}, message: ${errorData}`);
        }

        const result = await response.json();
        console.log('Create basic class response:', result);

        showToast('Basic class created successfully', 'success');
        return result;
    } catch (error) {
        console.error('Error creating basic class:', error);
        showToast('Failed to create basic class: ' + error.message, 'error');
        throw error;
    } finally {
        hideLoading();
    }
}

async function updateClass(classId, classData) {
    try {
        showLoading();
        console.log('Updating class with ID:', classId, 'data:', classData);

        const backendData = transformClassDataForBackend(classData);
        console.log('Transformed data for backend:', backendData);

        const response = await fetch(`${API_BASE_URL}/classes/update-class/${classId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(backendData)
        });

        if (!response.ok) {
            const errorData = await response.text();
            throw new Error(`HTTP error! status: ${response.status}, message: ${errorData}`);
        }

        const result = await response.json();
        console.log('Update class response:', result);

        showToast('Class updated successfully', 'success');
        return result;
    } catch (error) {
        console.error('Error updating class:', error);
        showToast('Failed to update class: ' + error.message, 'error');
        throw error;
    } finally {
        hideLoading();
    }
}

async function updateClassTeacher(classId, teacherId, subject) {
    try {
        showLoading();
        console.log('Updating class teacher - Class ID:', classId, 'Teacher ID:', teacherId, 'Subject:', subject);

        const response = await fetch(`${API_BASE_URL}/classes/update-class-teacher/${classId}?teacherId=${teacherId}&subject=${encodeURIComponent(subject)}`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
            }
        });

        if (!response.ok) {
            const errorData = await response.text();
            throw new Error(`HTTP error! status: ${response.status}, message: ${errorData}`);
        }

        const result = await response.json();
        console.log('Update class teacher response:', result);

        showToast('Class teacher updated successfully', 'success');
        return result;
    } catch (error) {
        console.error('Error updating class teacher:', error);
        showToast('Failed to update class teacher: ' + error.message, 'error');
        throw error;
    } finally {
        hideLoading();
    }
}

async function updateAssistantTeacher(classId, teacherId, subject) {
    try {
        showLoading();
        console.log('Updating assistant teacher - Class ID:', classId, 'Teacher ID:', teacherId, 'Subject:', subject);

        const response = await fetch(`${API_BASE_URL}/classes/update-assistant-teacher/${classId}?teacherId=${teacherId}&subject=${encodeURIComponent(subject)}`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
            }
        });

        if (!response.ok) {
            const errorData = await response.text();
            throw new Error(`HTTP error! status: ${response.status}, message: ${errorData}`);
        }

        const result = await response.json();
        console.log('Update assistant teacher response:', result);

        showToast('Assistant teacher updated successfully', 'success');
        return result;
    } catch (error) {
        console.error('Error updating assistant teacher:', error);
        showToast('Failed to update assistant teacher: ' + error.message, 'error');
        throw error;
    } finally {
        hideLoading();
    }
}

async function addOtherTeacherSubject(classId, teacherSubjectAssignment) {
    try {
        showLoading();
        console.log('Adding other teacher subject - Class ID:', classId, 'Data:', teacherSubjectAssignment);

        const response = await fetch(`${API_BASE_URL}/classes/add-other-teacher-subject/${classId}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(teacherSubjectAssignment)
        });

        if (!response.ok) {
            const errorData = await response.text();
            throw new Error(`HTTP error! status: ${response.status}, message: ${errorData}`);
        }

        const result = await response.json();
        console.log('Add other teacher subject response:', result);

        showToast('Teacher subject added successfully', 'success');
        return result;
    } catch (error) {
        console.error('Error adding other teacher subject:', error);
        showToast('Failed to add teacher subject: ' + error.message, 'error');
        throw error;
    } finally {
        hideLoading();
    }
}

async function removeOtherTeacherSubject(classId, teacherId, subject) {
    try {
        showLoading();
        console.log('Removing other teacher subject - Class ID:', classId, 'Teacher ID:', teacherId, 'Subject:', subject);

        const response = await fetch(`${API_BASE_URL}/classes/remove-other-teacher-subject/${classId}?teacherId=${encodeURIComponent(teacherId)}&subject=${encodeURIComponent(subject)}`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
            }
        });

        if (!response.ok) {
            const errorData = await response.text();
            throw new Error(`HTTP error! status: ${response.status}, message: ${errorData}`);
        }

        const result = await response.json();
        console.log('Remove other teacher subject response:', result);

        showToast('Teacher subject removed successfully', 'success');
        return result;
    } catch (error) {
        console.error('Error removing other teacher subject:', error);
        showToast('Failed to remove teacher subject: ' + error.message, 'error');
        throw error;
    } finally {
        hideLoading();
    }
}

async function updateClassStatus(classId, status) {
    try {
        showLoading();
        console.log('Updating class status - ID:', classId, 'Status:', status);

        const response = await fetch(`${API_BASE_URL}/classes/update-class-status/${classId}?status=${encodeURIComponent(status)}`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
            }
        });

        if (!response.ok) {
            const errorData = await response.text();
            throw new Error(`HTTP error! status: ${response.status}, message: ${errorData}`);
        }

        const result = await response.json();
        console.log('Update class status response:', result);

        showToast(`Class status updated to ${status}`, 'success');
        return result;
    } catch (error) {
        console.error('Error updating class status:', error);
        showToast('Failed to update class status: ' + error.message, 'error');
        throw error;
    } finally {
        hideLoading();
    }
}

async function deleteClass(classId) {
    if (!confirm('Are you sure you want to delete this class? This action cannot be undone.')) {
        return;
    }

    try {
        showLoading();

        const classItem = classesData.find(c => c.id === classId);
        if (!classItem) {
            showToast('Class not found', 'error');
            hideLoading();
            return;
        }

        if (classItem.currentStudents > 0) {
            const forceDelete = confirm(`This class has ${classItem.currentStudents} enrolled students. Are you sure you want to delete it anyway?`);
            if (!forceDelete) {
                hideLoading();
                return;
            }
        }

        console.log('Deleting class with ID:', classId);

        const response = await fetch(`${API_BASE_URL}/classes/delete-class/${classId}`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
            }
        });

        if (!response.ok) {
            const errorData = await response.text();
            throw new Error(`HTTP error! status: ${response.status}, message: ${errorData}`);
        }

        const result = await response.text();
        console.log('Delete class response:', result);

        await fetchClasses();
        showToast('Class deleted successfully', 'success');

        setTimeout(() => {
            loadClassData();
        }, 500);

        return true;
    } catch (error) {
        console.error('Error deleting class:', error);
        showToast('Error deleting class: ' + error.message, 'error');
        throw error;
    } finally {
        hideLoading();
    }
}

async function hardDeleteClass(classId) {
    if (!confirm('Are you sure you want to permanently delete this class? This action cannot be undone.')) {
        return;
    }

    try {
        showLoading();
        console.log('Hard deleting class with ID:', classId);

        const response = await fetch(`${API_BASE_URL}/classes/hard-delete-class/${classId}`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
            }
        });

        if (!response.ok) {
            const errorData = await response.text();
            throw new Error(`HTTP error! status: ${response.status}, message: ${errorData}`);
        }

        const result = await response.text();
        console.log('Hard delete class response:', result);

        await fetchClasses();
        showToast('Class permanently deleted', 'success');
        return true;
    } catch (error) {
        console.error('Error hard deleting class:', error);
        showToast('Failed to delete class: ' + error.message, 'error');
        throw error;
    } finally {
        hideLoading();
    }
}

async function checkClassCodeExists(classCode) {
    try {
        const response = await fetch(`${API_BASE_URL}/classes/check-class-code-exists/${encodeURIComponent(classCode)}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            }
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const result = await response.json();
        return result;
    } catch (error) {
        console.error('Error checking class code exists:', error);
        return false;
    }
}

async function checkTeacherAssignedToClass(teacherId, excludeClassId = null) {
    try {
        let url = `${API_BASE_URL}/classes/check-teacher-assigned/${teacherId}`;
        if (excludeClassId) {
            url += `?excludeClassId=${excludeClassId}`;
        }

        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            }
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const result = await response.json();
        return result;
    } catch (error) {
        console.error('Error checking teacher assigned:', error);
        return false;
    }
}

async function getClassStatistics() {
    try {
        const response = await fetch(`${API_BASE_URL}/classes/get-class-statistics`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            }
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const result = await response.json();
        return result;
    } catch (error) {
        console.error('Error getting class statistics:', error);
        return {};
    }
}

async function fetchClassesByStatus(status) {
    try {
        const response = await fetch(`${API_BASE_URL}/classes/get-classes-by-status/${status}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            }
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const classes = await response.json();
        return await transformClassesData(classes);
    } catch (error) {
        console.error('Error fetching classes by status:', error);
        return [];
    }
}

async function updateClassCapacity(classId, maxStudents, currentStudents = null) {
    try {
        showLoading();
        console.log('Updating class capacity - ID:', classId, 'Max:', maxStudents, 'Current:', currentStudents);

        let url = `${API_BASE_URL}/classes/update-class-capacity/${classId}?maxStudents=${maxStudents}`;
        if (currentStudents !== null) {
            url += `&currentStudents=${currentStudents}`;
        }

        const response = await fetch(url, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
            }
        });

        if (!response.ok) {
            const errorData = await response.text();
            throw new Error(`HTTP error! status: ${response.status}, message: ${errorData}`);
        }

        const result = await response.json();
        console.log('Update class capacity response:', result);

        showToast('Class capacity updated successfully', 'success');
        return result;
    } catch (error) {
        console.error('Error updating class capacity:', error);
        showToast('Failed to update class capacity: ' + error.message, 'error');
        throw error;
    } finally {
        hideLoading();
    }
}

async function updateClassSchedule(classId, startTime, endTime, workingDays) {
    try {
        showLoading();
        console.log('Updating class schedule - ID:', classId, 'Start:', startTime, 'End:', endTime, 'Days:', workingDays);

        const response = await fetch(`${API_BASE_URL}/classes/update-class-schedule/${classId}?startTime=${encodeURIComponent(startTime)}&endTime=${encodeURIComponent(endTime)}`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(workingDays)
        });

        if (!response.ok) {
            const errorData = await response.text();
            throw new Error(`HTTP error! status: ${response.status}, message: ${errorData}`);
        }

        const result = await response.json();
        console.log('Update class schedule response:', result);

        showToast('Class schedule updated successfully', 'success');
        return result;
    } catch (error) {
        console.error('Error updating class schedule:', error);
        showToast('Failed to update class schedule: ' + error.message, 'error');
        throw error;
    } finally {
        hideLoading();
    }
}

async function fetchClassesWithAvailableSeats(minSeats = null) {
    try {
        let url = `${API_BASE_URL}/classes/get-classes-with-available-seats`;
        if (minSeats !== null) {
            url += `?minSeats=${minSeats}`;
        }

        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            }
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const classes = await response.json();
        return await transformClassesData(classes);
    } catch (error) {
        console.error('Error fetching classes with available seats:', error);
        return [];
    }
}

async function bulkUpdateClassStatus(classIds, status) {
    try {
        showLoading();
        console.log('Bulk updating class status - IDs:', classIds, 'Status:', status);

        const classIdsParam = classIds.join(',');
        const response = await fetch(`${API_BASE_URL}/classes/bulk-update-class-status?classIds=${classIdsParam}&status=${encodeURIComponent(status)}`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
            }
        });

        if (!response.ok) {
            const errorData = await response.text();
            throw new Error(`HTTP error! status: ${response.status}, message: ${errorData}`);
        }

        const result = await response.json();
        console.log('Bulk update class status response:', result);

        showToast(`${classIds.length} classes updated to ${status}`, 'success');
        return result;
    } catch (error) {
        console.error('Error in bulk update class status:', error);
        showToast('Failed to update class statuses: ' + error.message, 'error');
        throw error;
    } finally {
        hideLoading();
    }
}

async function fetchClassesByRoomNumber(roomNumber) {
    try {
        const response = await fetch(`${API_BASE_URL}/classes/get-classes-by-room/${encodeURIComponent(roomNumber)}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            }
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const classes = await response.json();
        return await transformClassesData(classes);
    } catch (error) {
        console.error('Error fetching classes by room number:', error);
        return [];
    }
}

async function searchClasses(keyword) {
    try {
        const response = await fetch(`${API_BASE_URL}/classes/search-classes?keyword=${encodeURIComponent(keyword)}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            }
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const classes = await response.json();
        return await transformClassesData(classes);
    } catch (error) {
        console.error('Error searching classes:', error);
        return [];
    }
}

async function fetchRecentClasses(days = 30) {
    try {
        const response = await fetch(`${API_BASE_URL}/classes/get-recent-classes?days=${days}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            }
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const classes = await response.json();
        return await transformClassesData(classes);
    } catch (error) {
        console.error('Error fetching recent classes:', error);
        return [];
    }
}

// ==================== NEWLY ADDED API FUNCTION ====================
// Get subjects by class and section
async function fetchSubjectsByClassAndSection(className, section) {
    try {
        console.log(`Fetching subjects for class: ${className}, section: ${section}...`);
        const response = await fetch(`${API_BASE_URL}/classes/get-subjects-by-class-section?className=${encodeURIComponent(className)}&section=${encodeURIComponent(section)}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            }
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const result = await response.json();
        console.log('Subjects by class and section response:', result);
        return result;
    } catch (error) {
        console.error('Error fetching subjects by class and section:', error);
        showToast('Failed to fetch subjects for class: ' + error.message, 'error');
        return null;
    }
}
// ==================== END OF NEWLY ADDED API FUNCTION ====================

// Transform class data helper functions
async function transformClassesData(backendClasses) {
    if (!backendClasses || !Array.isArray(backendClasses)) {
        return [];
    }

    const transformedClasses = [];

    for (const cls of backendClasses) {
        transformedClasses.push(await transformClassData(cls));
    }

    return transformedClasses;
}

async function transformClassData(cls) {
    const classTeacher = cls.classTeacherId ?
        teachersData.find(t => t.id === cls.classTeacherId) : null;
    const assistantTeacher = cls.assistantTeacherId ?
        teachersData.find(t => t.id === cls.assistantTeacherId) : null;

    let otherTeacherAssignments = [];
    let bulkAssignDataObj = {
        teachers: [],
        teacherAssignments: {}
    };

    if (cls.otherTeacherSubject && Array.isArray(cls.otherTeacherSubject)) {
        otherTeacherAssignments = cls.otherTeacherSubject;

        otherTeacherAssignments.forEach(assignment => {
            const teacherId = parseInt(assignment.teacherId);
            if (teacherId && !isNaN(teacherId)) {
                bulkAssignDataObj.teachers.push(teacherId);

                const subjects = assignment.subjects?.map(s => s.subjectName) || [];
                const otherSubjects = [];

                bulkAssignDataObj.teacherAssignments[teacherId] = {
                    subjects: subjects,
                    otherSubjects: otherSubjects
                };
            }
        });
    }

    let workingDays = [];
    if (cls.workingDays && Array.isArray(cls.workingDays)) {
        workingDays = cls.workingDays.map(day => day.toLowerCase());
    }

    return {
        id: cls.classId,
        classId: cls.classId,
        className: cls.className,
        classCode: cls.classCode,
        academicYear: cls.academicYear,
        section: cls.section,
        maxStudents: cls.maxStudents || 30,
        currentStudents: cls.currentStudents || 0,
        roomNumber: cls.roomNumber || '',
        classTeacher: classTeacher ? {
            id: classTeacher.id,
            name: classTeacher.name,
            subject: cls.classTeacherSubject || ''
        } : null,
        assistantTeacher: assistantTeacher ? {
            id: assistantTeacher.id,
            name: assistantTeacher.name,
            subject: cls.assistantTeacherSubject || ''
        } : null,
        classTeacherId: cls.classTeacherId,
        assistantTeacherId: cls.assistantTeacherId,
        classTeacherSubject: cls.classTeacherSubject || '',
        assistantTeacherSubject: cls.assistantTeacherSubject || '',
        startTime: cls.startTime || '08:30',
        endTime: cls.endTime || '13:30',
        workingDays: workingDays,
        status: cls.status ? cls.status.toLowerCase() : 'active',
        description: cls.description || '',
        subjects: [],
        otherTeacherAssignments: otherTeacherAssignments,
        bulkAssignData: bulkAssignDataObj,
        createdAt: cls.createdAt || new Date().toISOString(),
        updatedAt: cls.updatedAt || new Date().toISOString()
    };
}

function transformClassDataForBackend(classData) {
    const classTeacherId = classData.classTeacher?.id ?
        parseInt(classData.classTeacher.id) : null;
    const assistantTeacherId = classData.assistantTeacher?.id ?
        parseInt(classData.assistantTeacher.id) : null;

    const otherTeacherSubject = [];

    if (classData.bulkAssignData && 
        classData.bulkAssignData.teachers && 
        Array.isArray(classData.bulkAssignData.teachers) && 
        classData.bulkAssignData.teachers.length > 0) {
        
        classData.bulkAssignData.teachers.forEach(teacherId => {
            const assignment = classData.bulkAssignData.teacherAssignments ? 
                classData.bulkAssignData.teacherAssignments[teacherId] : null;
            
            const teacher = teachersData.find(t => t.id === teacherId);

            if (teacher && assignment) {
                const subjects = [];
          
                if (assignment.subjects && Array.isArray(assignment.subjects)) {
                    assignment.subjects.forEach(subjectName => {
                        if (subjectName && typeof subjectName === 'string' && subjectName.trim() !== '') {
                            subjects.push({
                                subId: null,
                                subjectName: subjectName,
                                totalMarks: 100
                            });
                        } else if (subjectName && subjectName !== null && subjectName !== undefined) {
                            subjects.push({
                                subId: null,
                                subjectName: String(subjectName),
                                totalMarks: 100
                            });
                        }
                    });
                }
          
                if (assignment.otherSubjects && Array.isArray(assignment.otherSubjects)) {
                    assignment.otherSubjects.forEach(subjectName => {
                        if (subjectName && typeof subjectName === 'string' && subjectName.trim() !== '') {
                            subjects.push({
                                subId: null,
                                subjectName: subjectName,
                                totalMarks: 100
                            });
                        } else if (subjectName && subjectName !== null && subjectName !== undefined) {
                            subjects.push({
                                subId: null,
                                subjectName: String(subjectName),
                                totalMarks: 100
                            });
                        }
                    });
                }
          
                if (subjects.length > 0) {
                    otherTeacherSubject.push({
                        teacherId: String(teacherId),
                        teacherName: teacher.name ? String(teacher.name) : '',
                        subjects: subjects
                    });
                }
            }
        });
    }

    return {
        className: classData.className,
        classCode: classData.classCode,
        academicYear: classData.academicYear,
        section: classData.section,
        maxStudents: parseInt(classData.maxStudents) || 30,
        currentStudents: parseInt(classData.currentStudents) || 0,
        roomNumber: classData.roomNumber || '',
        startTime: classData.startTime || '08:30',
        endTime: classData.endTime || '13:30',
        description: classData.description || '',
        classTeacherId: classTeacherId,
        classTeacherSubject: classData.classTeacherSubject || '',
        assistantTeacherId: assistantTeacherId,
        assistantTeacherSubject: classData.assistantTeacherSubject || '',
        workingDays: classData.workingDays || ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
        status: classData.status ? classData.status.toUpperCase() : 'ACTIVE',
        otherTeacherSubject: otherTeacherSubject
    };
}

// ==================== UI Functions ====================

function populateTeacherDropdowns() {
    const classTeacherSelect = document.getElementById('classTeacher');
    const assistantTeacherSelect = document.getElementById('assistantTeacher');
    const subjectTeacherSelect = document.getElementById('subjectTeacher');

    if (!classTeacherSelect || !assistantTeacherSelect) {
        console.error('Teacher dropdown elements not found');
        return;
    }

    console.log('Populating teacher dropdowns with', teachersData.length, 'teachers');

    classTeacherSelect.innerHTML = '<option value="">Select Teacher</option>';
    assistantTeacherSelect.innerHTML = '<option value="">Select Assistant Teacher</option>';

    if (subjectTeacherSelect) {
        subjectTeacherSelect.innerHTML = '<option value="">Select Teacher (Optional)</option>';
    }

    teachersData.forEach(teacher => {
        if (!teacher || !teacher.id) {
            console.warn('Invalid teacher data:', teacher);
            return;
        }

        const option1 = document.createElement('option');
        option1.value = teacher.id;
        option1.textContent = teacher.name;
        classTeacherSelect.appendChild(option1);

        const option2 = document.createElement('option');
        option2.value = teacher.id;
        option2.textContent = teacher.name;
        assistantTeacherSelect.appendChild(option2);
  
        if (subjectTeacherSelect) {
            const option3 = document.createElement('option');
            option3.value = teacher.id;
            option3.textContent = teacher.name;
            subjectTeacherSelect.appendChild(option3);
        }
    });

    console.log('Class teacher options:', classTeacherSelect.options.length);
    console.log('Assistant teacher options:', assistantTeacherSelect.options.length);
}

function handleClassTeacherChange() {
    const teacherId = document.getElementById('classTeacher')?.value;
    const classTeacherSubjectSelect = document.getElementById('classTeacherSubject');

    if (!teacherId || !classTeacherSubjectSelect) return;

    selectedClassTeacher = teacherId ? teachersData.find(t => t.id === parseInt(teacherId)) : null;

    const teacherSubjectAssignments = document.getElementById('teacherSubjectAssignments');
    if (teacherSubjectAssignments) {
        teacherSubjectAssignments.classList.remove('hidden');
    }

    const classTeacherSubjectItem = document.getElementById('classTeacherSubjectItem');
    if (classTeacherSubjectItem) {
        classTeacherSubjectItem.classList.remove('hidden');
    }

    const noTeachersMessage = document.getElementById('noTeachersMessage');
    if (noTeachersMessage) {
        noTeachersMessage.classList.add('hidden');
    }

    if (teacherId && selectedClassTeacher) {
        const classTeacherNameLabel = document.getElementById('classTeacherNameLabel');
        if (classTeacherNameLabel) {
            classTeacherNameLabel.textContent = `Class Teacher: ${selectedClassTeacher.name}`;
        }
  
        const classTeacherInfo = document.getElementById('classTeacherInfo');
        if (classTeacherInfo) {
            classTeacherInfo.textContent = `(${selectedClassTeacher.teacherId} - ${selectedClassTeacher.primarySubject})`;
        }
  
        classTeacherSubjectSelect.disabled = false;
  
        updateSubjectDropdowns();
        updateAssistantTeacherDropdown();
        updateBulkAssignTeachersDropdown();
        updateAllAssignedSubjects();
    } else {
        if (classTeacherSubjectItem) {
            classTeacherSubjectItem.classList.add('hidden');
        }
  
        classTeacherSubjectSelect.disabled = true;
        classTeacherSubjectSelect.innerHTML = '<option value="">Select Subject</option>';
        classTeacherSubjectSelect.value = '';
  
        updateAssistantTeacherDropdown();
        updateBulkAssignTeachersDropdown();
        updateAllAssignedSubjects();
    }

    checkTeacherSubjectAssignmentsVisibility();
}

function handleAssistantTeacherChange() {
    const teacherId = document.getElementById('assistantTeacher')?.value;
    const assistantTeacherSubjectSelect = document.getElementById('assistantTeacherSubject');

    if (!teacherId || !assistantTeacherSubjectSelect) return;

    selectedAssistantTeacher = teacherId ? teachersData.find(t => t.id === parseInt(teacherId)) : null;

    const teacherSubjectAssignments = document.getElementById('teacherSubjectAssignments');
    if (teacherSubjectAssignments) {
        teacherSubjectAssignments.classList.remove('hidden');
    }

    const assistantTeacherSubjectItem = document.getElementById('assistantTeacherSubjectItem');
    if (assistantTeacherSubjectItem) {
        assistantTeacherSubjectItem.classList.remove('hidden');
    }

    const noTeachersMessage = document.getElementById('noTeachersMessage');
    if (noTeachersMessage) {
        noTeachersMessage.classList.add('hidden');
    }

    if (teacherId && selectedAssistantTeacher) {
        const assistantTeacherNameLabel = document.getElementById('assistantTeacherNameLabel');
        if (assistantTeacherNameLabel) {
            assistantTeacherNameLabel.textContent = `Assistant Teacher: ${selectedAssistantTeacher.name}`;
        }
  
        const assistantTeacherInfo = document.getElementById('assistantTeacherInfo');
        if (assistantTeacherInfo) {
            assistantTeacherInfo.textContent = `(${selectedAssistantTeacher.teacherId} - ${selectedAssistantTeacher.primarySubject})`;
        }
  
        assistantTeacherSubjectSelect.disabled = false;
  
        updateSubjectDropdowns();
        updateBulkAssignTeachersDropdown();
        updateAllAssignedSubjects();
    } else {
        if (assistantTeacherSubjectItem) {
            assistantTeacherSubjectItem.classList.add('hidden');
        }
  
        assistantTeacherSubjectSelect.disabled = true;
        assistantTeacherSubjectSelect.innerHTML = '<option value="">Select Subject</option>';
        assistantTeacherSubjectSelect.value = '';
  
        updateBulkAssignTeachersDropdown();
        updateAllAssignedSubjects();
    }

    checkTeacherSubjectAssignmentsVisibility();
}

function checkTeacherSubjectAssignmentsVisibility() {
    const classTeacherId = document.getElementById('classTeacher')?.value;
    const assistantTeacherId = document.getElementById('assistantTeacher')?.value;
    const teacherSubjectAssignments = document.getElementById('teacherSubjectAssignments');
    const noTeachersMessage = document.getElementById('noTeachersMessage');

    if (!classTeacherId && !assistantTeacherId) {
        if (teacherSubjectAssignments) {
            teacherSubjectAssignments.classList.add('hidden');
        }
        if (noTeachersMessage) {
            noTeachersMessage.classList.remove('hidden');
        }
    }
}

function updateAssistantTeacherDropdown() {
    const classTeacherId = document.getElementById('classTeacher')?.value;
    const assistantTeacherSelect = document.getElementById('assistantTeacher');

    if (!assistantTeacherSelect) return;

    const currentAssistantTeacherId = assistantTeacherSelect.value;

    assistantTeacherSelect.innerHTML = '<option value="">Select Assistant Teacher</option>';

    teachersData.forEach(teacher => {
        if (teacher.id == null) return;

        if (classTeacherId && teacher.id.toString() === classTeacherId) {
            return;
        }

        const option = document.createElement('option');
        option.value = teacher.id;
        option.textContent = teacher.name;

        if (currentAssistantTeacherId && teacher.id.toString() === currentAssistantTeacherId) {
            option.selected = true;
        }

        assistantTeacherSelect.appendChild(option);
    });

    console.log('Assistant teacher dropdown updated with', assistantTeacherSelect.options.length - 1, 'teachers');

    if (currentAssistantTeacherId && !assistantTeacherSelect.querySelector(`option[value="${currentAssistantTeacherId}"]`)) {
        assistantTeacherSelect.value = '';
        assistantTeacherSelect.dispatchEvent(new Event('change'));
    }
}

function updateBulkAssignTeachersDropdown() {
    initializeTeachersDropdown();
}

function updateAllAssignedSubjects() {
    allAssignedSubjects.clear();

    const classTeacherSubject = document.getElementById('classTeacherSubject')?.value;
    if (classTeacherSubject) {
        allAssignedSubjects.add(classTeacherSubject);
    }

    const assistantTeacherSubject = document.getElementById('assistantTeacherSubject')?.value;
    if (assistantTeacherSubject) {
        allAssignedSubjects.add(assistantTeacherSubject);
    }

    if (bulkAssignData && bulkAssignData.teacherAssignments) {
        Object.values(bulkAssignData.teacherAssignments).forEach(assignment => {
            if (assignment && assignment.subjects) {
                assignment.subjects.forEach(subject => {
                    if (subject) allAssignedSubjects.add(subject);
                });
            }
            if (assignment && assignment.otherSubjects) {
                assignment.otherSubjects.forEach(subject => {
                    if (subject) allAssignedSubjects.add(subject);
                });
            }
        });
    }
}

function updateSubjectDropdowns() {
    const classTeacherSubject = document.getElementById('classTeacherSubject')?.value;
    const assistantTeacherSubject = document.getElementById('assistantTeacherSubject')?.value;

    assignedSubjects = [];
    if (classTeacherSubject) assignedSubjects.push(classTeacherSubject);
    if (assistantTeacherSubject) assignedSubjects.push(assistantTeacherSubject);

    const selectedClass = document.getElementById('className')?.value || '';

    if (selectedClassTeacher) {
        updateTeacherSubjectDropdown('classTeacherSubject', selectedClassTeacher, assignedSubjects, selectedClass, classTeacherSubject);
    }

    if (selectedAssistantTeacher) {
        updateTeacherSubjectDropdown('assistantTeacherSubject', selectedAssistantTeacher, assignedSubjects, selectedClass, assistantTeacherSubject);
    }

    updateAllAssignedSubjects();
}

function updateTeacherSubjectDropdown(dropdownId, teacher, assignedSubjects, selectedClass, currentValue) {
    const dropdown = document.getElementById(dropdownId);
    if (!dropdown) return;

    dropdown.innerHTML = '<option value="">Select Subject</option>';

    const allAvailableSubjects = subjectsData.filter(subject => {
        const gradeRange = subject.grade ? subject.grade.split('-') : ['PG', '2nd'];
        const startGrade = gradeRange[0];
        const endGrade = gradeRange[1];
  
        const gradeLevels = {
            'PG': 0, 'LKG': 1, 'UKG': 2, '1st': 3, '2nd': 4
        };
  
        const classLevel = gradeLevels[selectedClass] || 0;
        const startLevel = gradeLevels[startGrade] || 0;
        const endLevel = gradeLevels[endGrade] || 4;
  
        return classLevel >= startLevel && classLevel <= endLevel;
    });

    const filteredSubjects = allAvailableSubjects.filter(subject => {
        if (subject.name === currentValue) return true;
        return !assignedSubjects.includes(subject.name) || subject.name === currentValue;
    });

    filteredSubjects.sort((a, b) => {
        const aIsCustom = a.isCustom || false;
        const bIsCustom = b.isCustom || false;
        if (aIsCustom && !bIsCustom) return 1;
        if (!aIsCustom && bIsCustom) return -1;
        return a.name.localeCompare(b.name);
    });

    filteredSubjects.forEach(subject => {
        const option = document.createElement('option');
        option.value = subject.name;
  
        const color = subject.color || '#3B82F6';
        const isCustom = subject.isCustom || false;
  
        option.innerHTML = `
            <span class="subject-color-indicator" style="background-color: ${color}; width: 12px; height: 12px; display: inline-block; border-radius: 50%; margin-right: 8px;"></span>
            ${subject.name} ${isCustom ? '<span class="text-xs text-gray-500 ml-1">(Custom)</span>' : ''}
        `;
  
        if (subject.name === currentValue) {
            option.selected = true;
        }
  
        dropdown.appendChild(option);
    });

    if (filteredSubjects.length === 0) {
        const option = document.createElement('option');
        option.value = '';
        option.textContent = 'No subjects available (all assigned)';
        option.disabled = true;
        dropdown.appendChild(option);
    }
}

function handleClassTeacherSubjectChange() {
    updateSubjectDropdowns();

    const value = document.getElementById('classTeacherSubject')?.value;
    if (value) {
        showToast(`Assigned ${value} to class teacher`, 'success');
    }
}

function handleAssistantTeacherSubjectChange() {
    updateSubjectDropdowns();

    const value = document.getElementById('assistantTeacherSubject')?.value;
    if (value) {
        showToast(`Assigned ${value} to assistant teacher`, 'success');
    }
}

function clearClassTeacherSubject() {
    const classTeacherSubjectSelect = document.getElementById('classTeacherSubject');
    if (classTeacherSubjectSelect) {
        classTeacherSubjectSelect.value = '';
        updateSubjectDropdowns();
        showToast('Class teacher subject cleared', 'info');
    }
}

function clearAssistantTeacherSubject() {
    const assistantTeacherSubjectSelect = document.getElementById('assistantTeacherSubject');
    if (assistantTeacherSubjectSelect) {
        assistantTeacherSubjectSelect.value = '';
        updateSubjectDropdowns();
        showToast('Assistant teacher subject cleared', 'info');
    }
}

// ==================== Bulk Assign Functions ====================

function toggleBulkAssignDropdown(type) {
    closeAllBulkAssignDropdowns();

    const dropdown = document.getElementById(`${type}Dropdown`);
    const button = document.querySelector(`button[onclick="toggleBulkAssignDropdown('${type}')"]`);

    if (!dropdown || !button) return;

    dropdown.classList.add('show');
    button.classList.add('active');

    if (type === 'teachers' && document.getElementById('teachersList').children.length === 0) {
        initializeTeachersDropdown();
    }

    updateSelectedCount(type);

    if (type === 'teachers') {
        setTimeout(() => {
            const searchInput = document.getElementById('teachersSearch');
            if (searchInput) searchInput.focus();
        }, 100);
    }
}

function closeBulkAssignDropdown(type) {
    const dropdown = document.getElementById(`${type}Dropdown`);
    const button = document.querySelector(`button[onclick="toggleBulkAssignDropdown('${type}')"]`);

    if (!dropdown || !button) return;

    dropdown.classList.remove('show');
    button.classList.remove('active');

    if (type === 'teachers') {
        const searchInput = document.getElementById('teachersSearch');
        if (searchInput) {
            searchInput.value = '';
            filterTeachers('');
        }
    }
}

function closeAllBulkAssignDropdowns() {
    const dropdown = document.getElementById('teachersDropdown');
    const button = document.querySelector(`button[onclick="toggleBulkAssignDropdown('teachers')"]`);

    if (dropdown) dropdown.classList.remove('show');
    if (button) button.classList.remove('active');

    const searchInput = document.getElementById('teachersSearch');
    if (searchInput) {
        searchInput.value = '';
        filterTeachers('');
    }
}

function filterTeachers(searchTerm) {
    const teachersList = document.getElementById('teachersList');
    if (!teachersList) return;

    const items = teachersList.querySelectorAll('.bulk-assign-item');
    searchTerm = searchTerm.toLowerCase().trim();

    items.forEach(item => {
        const teacherNameElement = item.querySelector('.font-medium');
        const teacherIdElement = item.querySelector('.text-xs.text-gray-500');
  
        if (!teacherNameElement || !teacherIdElement) return;
  
        const teacherName = teacherNameElement.textContent.toLowerCase();
        const teacherId = teacherIdElement.textContent.toLowerCase();

        const shouldShow = !searchTerm ||
            teacherName.includes(searchTerm) ||
            teacherId.includes(searchTerm);

        item.style.display = shouldShow ? 'flex' : 'none';
    });
}

function initializeTeachersDropdown() {
    const teachersList = document.getElementById('teachersList');
    if (!teachersList) return;

    teachersList.innerHTML = '';

    const classTeacherId = document.getElementById('classTeacher')?.value;
    const assistantTeacherId = document.getElementById('assistantTeacher')?.value;

    teachersData.forEach(teacher => {
        if ((classTeacherId && teacher.id.toString() === classTeacherId) ||
            (assistantTeacherId && teacher.id.toString() === assistantTeacherId)) {
            return;
        }

        const isSelected = bulkAssignData.teachers.includes(teacher.id);

        const teacherSubjects = [
            teacher.primarySubject,
            ...(teacher.additionalSubjects || [])
        ].filter(subject => subject && subject.trim() !== '');

        const item = document.createElement('div');
        item.className = 'bulk-assign-item';
        item.innerHTML = `
            <input type="checkbox" id="teacher-${teacher.id}"
                   ${isSelected ? 'checked' : ''}
                   onchange="updateBulkAssignSelection('teachers', ${teacher.id})"
                   class="bulk-assign-checkbox h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded">
            <label for="teacher-${teacher.id}" class="flex-1 cursor-pointer">
                <div class="font-medium text-gray-900">${teacher.name}</div>
                <div class="text-xs text-gray-500">
                    <span class="text-blue-600 font-medium">Subjects:</span>
                    <span class="text-green-600">${teacher.primarySubject}</span>
                    ${teacher.additionalSubjects?.length > 0 ?
                `, <span class="text-purple-600">${teacher.additionalSubjects.join(', ')}</span>` :
                ''}
                    • ${teacher.teacherId}
                </div>
            </label>
        `;

        teachersList.appendChild(item);
    });
}

function updateBulkAssignSelection(type, id) {
    const index = bulkAssignData[type].indexOf(id);

    if (index === -1) {
        bulkAssignData[type].push(id);
    } else {
        bulkAssignData[type].splice(index, 1);
    }

    updateSelectedCount(type);

    if (type === 'teachers') {
        updateTeachersTable();
    }
}

function updateSelectedCount(type) {
    const count = bulkAssignData[type].length;
    const countElement = document.getElementById(`${type}SelectedCount`);

    if (countElement) {
        countElement.textContent = count;
    }

    const buttonText = document.getElementById(`${type}DropdownText`);
    if (buttonText) {
        if (count === 0) {
            buttonText.textContent = type === 'teachers' ? 'Select teachers...' : 'Select subjects...';
        } else {
            buttonText.textContent = `${count} ${type} selected`;
        }
    }
}

function clearSelection(type) {
    bulkAssignData[type] = [];

    const checkboxes = document.querySelectorAll(`#${type}List input[type="checkbox"]`);
    checkboxes.forEach(checkbox => {
        checkbox.checked = false;
    });

    updateSelectedCount(type);

    if (type === 'teachers') {
        bulkAssignData.teacherAssignments = {};
        const tableContainer = document.getElementById('teachersTableContainer');
        if (tableContainer) {
            tableContainer.classList.add('hidden');
        }
    }
}

function saveBulkAssignSelection(type) {
    closeBulkAssignDropdown(type);

    if (type === 'teachers') {
        updateTeachersTable();
    }

    showToast('Teacher selection saved', 'success');
}

function updateTeachersTable() {
    const container = document.getElementById('teachersTableContainer');
    const tableBody = document.getElementById('teachersTableBody');
    const countElement = document.getElementById('selectedTeachersCount');

    if (!container || !tableBody || !countElement) return;

    if (bulkAssignData.teachers.length === 0) {
        container.classList.add('hidden');
        return;
    }

    container.classList.remove('hidden');
    countElement.textContent = bulkAssignData.teachers.length;

    tableBody.innerHTML = '';

    bulkAssignData.teachers.forEach((teacherId, index) => {
        const teacher = teachersData.find(t => t.id === teacherId);
        if (!teacher) return;

        if (!bulkAssignData.teacherAssignments[teacherId]) {
            bulkAssignData.teacherAssignments[teacherId] = {
                subjects: [teacher.primarySubject],
                otherSubjects: []
            };
        }

        const assignment = bulkAssignData.teacherAssignments[teacherId];

        const teacherSubjects = [
            teacher.primarySubject,
            ...(teacher.additionalSubjects || [])
        ].filter(subject => subject && subject.trim() !== '');

        const uniqueSubjects = [...new Set(teacherSubjects)];

        const subjectsOptions = uniqueSubjects
            .map(subject => {
                const isSelected = assignment.subjects.includes(subject);
                return `<option value="${subject}" ${isSelected ? 'selected' : ''}>${subject}</option>`;
            }).join('');

        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${index + 1}</td>
            <td>
                <div class="font-medium text-gray-900">${teacher.name}</div>
                <div class="text-xs text-gray-500">${teacher.teacherId}</div>
                <div class="text-xs text-gray-500">${teacher.department || ''}</div>
            </td>
            <td>
                <select class="subject-dropdown" multiple onchange="updateTeacherSubjects(${teacherId}, this)"
                        style="height: 80px;" title="Hold Ctrl to select multiple subjects">
                    ${subjectsOptions}
                </select>
                <div class="text-xs text-gray-500 mt-1">
                    <span class="font-medium">Selected:</span>
                    <span id="selectedSubjectsDisplay-${teacherId}">
                        ${assignment.subjects.join(', ') || 'No subjects selected'}
                    </span>
                    ${assignment.otherSubjects.length > 0 ? `
                        <div class="mt-1">
                            <span class="font-medium text-purple-600">Others:</span>
                            <span id="otherSubjectsDisplay-${teacherId}" class="text-purple-600">
                                ${assignment.otherSubjects.join(', ')}
                            </span>
                        </div>
                    ` : ''}
                </div>
            </td>
            <td>
                <div class="flex space-x-2">
                    <button type="button" onclick="openOthersModal(${teacherId})" class="others-btn">
                        <i class="fas fa-ellipsis-h mr-1"></i> Others
                    </button>
                    <button type="button" onclick="removeTeacher(${teacherId})" class="others-btn text-red-600 hover:text-red-800">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
            </td>
        `;

        tableBody.appendChild(row);

        const selectElement = row.querySelector('select');
        if (selectElement) {
            assignment.subjects.forEach(subject => {
                const option = selectElement.querySelector(`option[value="${subject}"]`);
                if (option) {
                    option.selected = true;
                }
            });
        }
    });
}

function updateTeacherSubjects(teacherId, selectElement) {
    if (!bulkAssignData.teacherAssignments[teacherId]) {
        bulkAssignData.teacherAssignments[teacherId] = {
            subjects: [],
            otherSubjects: []
        };
    }

    const teacher = teachersData.find(t => t.id === teacherId);
    if (!teacher) return;

    const selectedOptions = Array.from(selectElement.selectedOptions);
    const selectedSubjects = selectedOptions.map(option => option.value);

    const teacherSubjects = [
        teacher.primarySubject,
        ...(teacher.additionalSubjects || [])
    ].filter(subject => subject && subject.trim() !== '');

    const invalidSubjects = selectedSubjects.filter(subject =>
        !teacherSubjects.includes(subject) &&
        !bulkAssignData.teacherAssignments[teacherId].otherSubjects.includes(subject)
    );

    if (invalidSubjects.length > 0) {
        showToast(`Invalid subjects selected: ${invalidSubjects.join(', ')}`, 'error');
  
        setTimeout(() => {
            const select = document.querySelector(`select[onchange="updateTeacherSubjects(${teacherId}, this)"]`);
            if (select) {
                bulkAssignData.teacherAssignments[teacherId].subjects.forEach(subject => {
                    const option = select.querySelector(`option[value="${subject}"]`);
                    if (option) {
                        option.selected = true;
                    }
                });
            }
        }, 100);
        return;
    }

    bulkAssignData.teacherAssignments[teacherId].subjects = selectedSubjects;

    const displayElement = document.getElementById(`selectedSubjectsDisplay-${teacherId}`);
    if (displayElement) {
        displayElement.textContent = selectedSubjects.join(', ') || 'No subjects selected';
    }

    updateAllAssignedSubjects();

    showToast(`Updated subjects for ${teacher.name}`, 'success');
}

function openOthersModal(teacherId) {
    closeOthersModal();

    const teacher = teachersData.find(t => t.id === teacherId);
    if (!teacher) return;

    const assignment = bulkAssignData.teacherAssignments[teacherId] || {
        subjects: [],
        otherSubjects: []
    };

    const teacherSubjects = [
        teacher.primarySubject,
        ...(teacher.additionalSubjects || [])
    ].filter(subject => subject && subject.trim() !== '');

    const allSubjects = subjectsData;

    const availableSubjects = allSubjects.filter(subject => {
        if (assignment.subjects.includes(subject.name)) {
            return false;
        }
  
        if (assignment.otherSubjects.includes(subject.name)) {
            return false;
        }
  
        if (allAssignedSubjects.has(subject.name)) {
            return false;
        }
  
        return true;
    });

    const modalContent = `
        <div class="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center z-[200]">
            <div class="bg-white rounded-lg p-6 max-w-md w-full mx-4 max-h-[80vh] overflow-y-auto">
                <div class="flex justify-between items-center mb-4">
                    <h3 class="text-lg font-semibold text-gray-800">Additional Subjects for ${teacher.name}</h3>
                    <button onclick="closeOthersModal()" class="text-gray-500 hover:text-gray-700">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
          
                <div class="mb-4">
                    <div class="text-sm text-gray-600 mb-2">Teacher's Current Subjects:</div>
                    <div class="flex flex-wrap gap-2 mb-3">
                        <span class="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">Primary: ${teacher.primarySubject}</span>
                        ${teacher.additionalSubjects?.map(subject =>
        `<span class="px-2 py-1 bg-green-100 text-green-800 text-xs rounded">${subject}</span>`
    ).join('') || ''}
                    </div>
                    <div class="text-sm text-gray-600 mb-2 mt-3">Assigned Subjects:</div>
                    <div class="flex flex-wrap gap-2 mb-3">
                        ${assignment.subjects.map(subject => {
        const isPrimary = subject === teacher.primarySubject;
        const isAdditional = teacher.additionalSubjects?.includes(subject);
        return `<span class="px-2 py-1 ${isPrimary ? 'bg-blue-100 text-blue-800' : isAdditional ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'} text-xs rounded">${subject}</span>`;
    }).join('')}
                    </div>
                    ${assignment.otherSubjects.length > 0 ? `
                        <div class="text-sm text-gray-600 mb-2 mt-3">Current Other Subjects:</div>
                        <div class="flex flex-wrap gap-2 mb-3">
                            ${assignment.otherSubjects.map(subject => {
        return `<span class="px-2 py-1 bg-purple-100 text-purple-800 text-xs rounded">${subject}</span>`;
    }).join('')}
                        </div>
                    ` : ''}
                </div>
          
                <div class="mb-4">
                    <label class="block text-sm font-medium text-gray-700 mb-2">Add Other Subjects</label>
                    <div class="flex space-x-2">
                        <select id="otherSubjectSelect" class="flex-1 subject-dropdown">
                            <option value="">Select Subject</option>
                            ${availableSubjects.map(subject => `
                                <option value="${subject.id}">${subject.name}</option>
                            `).join('')}
                        </select>
                        <button type="button" onclick="addOtherSubject(${teacherId})" class="add-subject-btn">
                            <i class="fas fa-plus"></i> Add
                        </button>
                    </div>
                    <p class="text-xs text-gray-500 mt-1">
                        Available subjects that are not already assigned to any teacher
                    </p>
                    ${availableSubjects.length === 0 ? `
                        <div class="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded">
                            <p class="text-xs text-yellow-700">No subjects available. All subjects are already assigned to teachers.</p>
                        </div>
                    ` : ''}
                </div>
          
                <div class="mb-4">
                    <h4 class="text-sm font-medium text-gray-700 mb-2">Current Other Subjects</h4>
                    <div id="otherSubjectsList" class="space-y-2">
                        ${assignment.otherSubjects.map((subject, index) => {
        const subjectData = subjectsData.find(s => s.name === subject);
        return `
                                <div class="flex items-center justify-between bg-gray-50 p-2 rounded">
                                    <div class="flex items-center">
                                        <span class="subject-color-small mr-2" style="background-color: ${subjectData?.color || '#6b7280'}; width: 12px; height: 12px; border-radius: 50%; display: inline-block;"></span>
                                        <span>${subject}</span>
                                    </div>
                                    <button type="button" onclick="removeOtherSubject(${teacherId}, ${index})" class="text-red-500 hover:text-red-700">
                                        <i class="fas fa-times"></i>
                                    </button>
                                </div>
                            `;
    }).join('')}
                        ${assignment.otherSubjects.length === 0 ? `
                            <div class="text-center text-gray-500 py-4">
                                <i class="fas fa-book-open text-2xl mb-2"></i>
                                <p>No other subjects added</p>
                            </div>
                        ` : ''}
                    </div>
                </div>
          
                <div class="flex justify-end space-x-2">
                    <button type="button" onclick="closeOthersModal()" class="px-4 py-2 border border-gray-300 rounded text-sm text-gray-700 hover:bg-gray-50">
                        Close
                    </button>
                </div>
            </div>
        </div>
    `;

    const modal = document.createElement('div');
    modal.id = 'othersModal';
    modal.innerHTML = modalContent;
    document.body.appendChild(modal);
}

function closeOthersModal() {
    const modal = document.getElementById('othersModal');
    if (modal) {
        modal.remove();
    }
}

function addOtherSubject(teacherId) {
    const select = document.getElementById('otherSubjectSelect');
    const subjectId = select?.value;

    if (!subjectId) {
        showToast('Please select a subject first', 'error');
        return;
    }

    const subject = subjectsData.find(s => s.id === parseInt(subjectId));
    if (!subject) return;

    if (!bulkAssignData.teacherAssignments[teacherId]) {
        bulkAssignData.teacherAssignments[teacherId] = {
            subjects: [],
            otherSubjects: []
        };
    }

    if (bulkAssignData.teacherAssignments[teacherId].otherSubjects.includes(subject.name)) {
        showToast('Subject already added to other subjects', 'info');
        return;
    }

    if (bulkAssignData.teacherAssignments[teacherId].subjects.includes(subject.name)) {
        showToast('Subject already assigned to teacher', 'info');
        return;
    }

    if (allAssignedSubjects.has(subject.name)) {
        showToast('This subject is already assigned to another teacher', 'error');
        return;
    }

    bulkAssignData.teacherAssignments[teacherId].otherSubjects.push(subject.name);
    allAssignedSubjects.add(subject.name);

    updateOthersList(teacherId);
    updateOtherSubjectsDisplay(teacherId);

    if (select) select.value = '';

    showToast(`Added ${subject.name} to other subjects`, 'success');
}

function updateOtherSubjectsDisplay(teacherId) {
    const assignment = bulkAssignData.teacherAssignments[teacherId] || { otherSubjects: [] };
    const displayElement = document.getElementById(`otherSubjectsDisplay-${teacherId}`);

    if (displayElement) {
        if (assignment.otherSubjects.length > 0) {
            displayElement.innerHTML = assignment.otherSubjects.join(', ');
            displayElement.parentElement.classList.remove('hidden');
        } else {
            displayElement.parentElement.classList.add('hidden');
        }
    }
}

function removeOtherSubject(teacherId, index) {
    if (bulkAssignData.teacherAssignments[teacherId]) {
        const removed = bulkAssignData.teacherAssignments[teacherId].otherSubjects.splice(index, 1);
  
        if (removed && removed[0]) {
            allAssignedSubjects.delete(removed[0]);
        }
  
        updateOthersList(teacherId);
        updateOtherSubjectsDisplay(teacherId);
        showToast(`Removed ${removed[0]} from other subjects`, 'info');
    }
}

function updateOthersList(teacherId) {
    const assignment = bulkAssignData.teacherAssignments[teacherId] || { otherSubjects: [] };
    const listElement = document.getElementById('otherSubjectsList');

    if (!listElement) return;

    listElement.innerHTML = assignment.otherSubjects.map((subject, index) => {
        const subjectData = subjectsData.find(s => s.name === subject);
        return `
                <div class="flex items-center justify-between bg-gray-50 p-2 rounded">
                    <div class="flex items-center">
                        <span class="subject-color-small mr-2" style="background-color: ${subjectData?.color || '#6b7280'}; width: 12px; height: 12px; border-radius: 50%; display: inline-block;"></span>
                        <span>${subject}</span>
                    </div>
                    <button type="button" onclick="removeOtherSubject(${teacherId}, ${index})" class="text-red-500 hover:text-red-700">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
            `;
    }).join('') || `
                <div class="text-center text-gray-500 py-4">
                    <i class="fas fa-book-open text-2xl mb-2"></i>
                    <p>No other subjects added</p>
                </div>
            `;
}

function removeTeacher(teacherId) {
    const assignment = bulkAssignData.teacherAssignments[teacherId];

    const index = bulkAssignData.teachers.indexOf(teacherId);
    if (index !== -1) {
        bulkAssignData.teachers.splice(index, 1);
    }

    delete bulkAssignData.teacherAssignments[teacherId];

    if (assignment) {
        if (assignment.subjects) {
            assignment.subjects.forEach(subject => {
                if (subject) allAssignedSubjects.delete(subject);
            });
        }
        if (assignment.otherSubjects) {
            assignment.otherSubjects.forEach(subject => {
                if (subject) allAssignedSubjects.delete(subject);
            });
        }
    }

    const checkbox = document.getElementById(`teacher-${teacherId}`);
    if (checkbox) {
        checkbox.checked = false;
    }

    updateSelectedCount('teachers');
    updateTeachersTable();

    showToast('Teacher removed from selection', 'info');
}

// ==================== Subject Creation Functions ====================

function toggleCreateSubjectSection() {
    const section = document.getElementById('createSubjectSection');
    const toggleBtn = document.getElementById('toggleSubjectSectionBtn');

    if (section.classList.contains('hidden')) {
        section.classList.remove('hidden');
        toggleBtn.innerHTML = '<i class="fas fa-minus mr-2"></i> Hide Subject Creation';
        toggleBtn.classList.remove('bg-blue-600');
        toggleBtn.classList.add('bg-gray-600');
    } else {
        section.classList.add('hidden');
        toggleBtn.innerHTML = '<i class="fas fa-plus mr-2"></i> Create New Subject';
        toggleBtn.classList.remove('bg-gray-600');
        toggleBtn.classList.add('bg-blue-600');
    }
}

function resetSubjectForm() {
    const form = document.getElementById('createSubjectForm');
    if (form) {
        form.reset();
    }
}

async function saveSubject(event) {
    event.preventDefault();
    showLoading();

    try {
        const subjectCode = document.getElementById('subjectCode')?.value.trim();
        const subjectName = document.getElementById('subjectName')?.value.trim();
        const description = document.getElementById('subjectDescription')?.value.trim() || '';
        const subjectType = document.getElementById('subjectType')?.value || 'CORE';
        const maxMarks = parseInt(document.getElementById('maxMarks')?.value) || 100;
        const passingMarks = parseInt(document.getElementById('passingMarks')?.value) || 35;
        const creditHours = parseInt(document.getElementById('creditHours')?.value) || 4;
        const periodsPerWeek = parseInt(document.getElementById('periodsPerWeek')?.value) || 5;
  
        if (!subjectCode || !subjectName) {
            showToast('Subject Code and Subject Name are required', 'error');
            hideLoading();
            return;
        }
  
        const existingSubject = subjectsData.find(subject =>
            subject.name.toLowerCase() === subjectName.toLowerCase()
        );
  
        if (existingSubject) {
            showToast('Subject with this name already exists', 'error');
            hideLoading();
            return;
        }
  
        const subjectData = {
            subjectCode: subjectCode,
            subjectName: subjectName,
            description: description,
            subjectType: subjectType,
            gradeLevel: 'PG-2nd',
            maxMarks: maxMarks,
            passingMarks: passingMarks,
            creditHours: creditHours,
            periodsPerWeek: periodsPerWeek,
            colorCode: '#3B82F6'
        };
  
        console.log('Creating new subject:', subjectData);
  
        const result = await createSubject(subjectData);
  
        await fetchSubjects();
  
        showToast(`Subject "${subjectName}" created successfully`, 'success');
  
        updateSubjectDropdowns();
  
        console.log('All subjects after creation:', subjectsData);
  
        resetSubjectForm();
        toggleCreateSubjectSection();
  
    } catch (error) {
        console.error('Error saving subject:', error);
        showToast('Error saving subject: ' + error.message, 'error');
    } finally {
        hideLoading();
    }
}

function generateSubjectCode() {
    const subjectName = document.getElementById('subjectName')?.value.trim();
    if (!subjectName) return;

    const code = subjectName
        .toUpperCase()
        .replace(/[^A-Z]/g, '')
        .substring(0, 4) +
        Math.floor(1000 + Math.random() * 9000);

    const subjectCodeInput = document.getElementById('subjectCode');
    if (subjectCodeInput) {
        subjectCodeInput.value = code;
    }
}

// ==================== Responsive Sidebar Functions ====================

function setupResponsiveSidebar() {
    isMobile = window.innerWidth < 1024;

    if (isMobile) {
        closeMobileSidebar();
    } else {
        const sidebar = document.getElementById('sidebar');
        const mainContent = document.getElementById('mainContent');

        if (sidebarCollapsed) {
            sidebar?.classList.add('collapsed');
            mainContent?.classList.add('sidebar-collapsed');
        } else {
            sidebar?.classList.remove('collapsed');
            mainContent?.classList.remove('sidebar-collapsed');
        }
    }

    window.addEventListener('resize', handleResize);
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

            sidebar?.classList.remove('mobile-open');
            overlay?.classList.remove('active');
            document.body.classList.remove('sidebar-open');

            if (sidebarCollapsed) {
                sidebar?.classList.add('collapsed');
                mainContent?.classList.add('sidebar-collapsed');
            } else {
                sidebar?.classList.remove('collapsed');
                mainContent?.classList.remove('sidebar-collapsed');
            }
        }
    }
}

function toggleSidebar() {
    if (isMobile) {
        const sidebar = document.getElementById('sidebar');
        const overlay = document.getElementById('sidebarOverlay');

        if (sidebar?.classList.contains('mobile-open')) {
            closeMobileSidebar();
        } else {
            openMobileSidebar();
        }
    } else {
        const sidebar = document.getElementById('sidebar');
        const mainContent = document.getElementById('mainContent');

        sidebarCollapsed = !sidebarCollapsed;

        if (sidebarCollapsed) {
            sidebar?.classList.add('collapsed');
            mainContent?.classList.add('sidebar-collapsed');
            const sidebarToggleIcon = document.getElementById('sidebarToggleIcon');
            if (sidebarToggleIcon) {
                sidebarToggleIcon.className = 'fas fa-bars text-xl';
            }
        } else {
            sidebar?.classList.remove('collapsed');
            mainContent?.classList.remove('sidebar-collapsed');
            const sidebarToggleIcon = document.getElementById('sidebarToggleIcon');
            if (sidebarToggleIcon) {
                sidebarToggleIcon.className = 'fas fa-times text-xl';
            }
        }
    }
}

function openMobileSidebar() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebarOverlay');

    sidebar?.classList.add('mobile-open');
    overlay?.classList.add('active');
    document.body.classList.add('sidebar-open');
}

function closeMobileSidebar() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebarOverlay');

    sidebar?.classList.remove('mobile-open');
    overlay?.classList.remove('active');
    document.body.classList.remove('sidebar-open');
}

// ==================== Dropdown Functions ====================

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

// ==================== Initialization ====================

async function initializeClassModule() {
    const today = new Date();
    const currentDateElement = document.getElementById('currentDate');
    if (currentDateElement) {
        currentDateElement.textContent = today.toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    }

    await fetchTeachers();
    await fetchSubjects();
    await fetchClasses();
    await loadClassData();

    generateSchedule();
}

async function loadClassData() {
    showLoading();

    try {
        await fetchClasses();
        updateClassStatistics();
        applyFilters();
    } catch (error) {
        console.error('Error loading class data:', error);
        showToast('Failed to load class data', 'error');
    } finally {
        hideLoading();
    }
}

function updateClassStatistics() {
    const pgClasses = classesData.filter(c => c.className === "PG");
    const lkgClasses = classesData.filter(c => c.className === "LKG");
    const ukgClasses = classesData.filter(c => c.className === "UKG");
    const firstClasses = classesData.filter(c => c.className === "1st");
    const secondClasses = classesData.filter(c => c.className === "2nd");

    const pgStudentsElement = document.getElementById('pgStudents');
    const lkgStudentsElement = document.getElementById('lkgStudents');
    const ukgStudentsElement = document.getElementById('ukgStudents');
    const firstStudentsElement = document.getElementById('firstStudents');
    const secondStudentsElement = document.getElementById('secondStudents');

    if (pgStudentsElement) pgStudentsElement.textContent = pgClasses.reduce((sum, c) => sum + c.currentStudents, 0);
    if (lkgStudentsElement) lkgStudentsElement.textContent = lkgClasses.reduce((sum, c) => sum + c.currentStudents, 0);
    if (ukgStudentsElement) ukgStudentsElement.textContent = ukgClasses.reduce((sum, c) => sum + c.currentStudents, 0);
    if (firstStudentsElement) firstStudentsElement.textContent = firstClasses.reduce((sum, c) => sum + c.currentStudents, 0);
    if (secondStudentsElement) secondStudentsElement.textContent = secondClasses.reduce((sum, c) => sum + c.currentStudents, 0);
}

function applyFilters() {
    currentPage = 1;

    const classFilter = document.getElementById('classFilter')?.value || 'all';
    const sectionFilter = document.getElementById('sectionFilter')?.value || 'all';
    const yearFilter = document.getElementById('yearFilter')?.value || 'all';
    const searchTerm = document.getElementById('searchInput')?.value.toLowerCase() || '';

    filteredClasses = classesData.filter(classItem => {
        if (classFilter !== 'all' && classItem.className !== classFilter) {
            return false;
        }

        if (sectionFilter !== 'all' && classItem.section !== sectionFilter) {
            return false;
        }

        if (yearFilter !== 'all' && classItem.academicYear !== yearFilter) {
            return false;
        }

        if (searchTerm) {
            const searchFields = [
                classItem.className,
                classItem.classCode,
                classItem.roomNumber,
                classItem.classTeacher?.name,
                classItem.assistantTeacher?.name,
                classItem.description
            ].filter(field => field).map(field => field.toLowerCase());

            if (!searchFields.some(field => field.includes(searchTerm))) {
                return false;
            }
        }

        return true;
    });

    const totalClassesElement = document.getElementById('totalClasses');
    if (totalClassesElement) {
        totalClassesElement.textContent = filteredClasses.length;
    }

    renderClassesTable();
    generateSchedule();
}

function renderClassesTable() {
    const tableBody = document.getElementById('classesTableBody');
    const tableInfo = document.getElementById('tableInfo');

    if (!tableBody || !tableInfo) return;

    if (filteredClasses.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="6" class="px-6 py-12 text-center text-gray-500">
                    <i class="fas fa-chalkboard-teacher text-4xl mb-4"></i>
                    <p class="text-lg font-medium">No classes found</p>
                    <p class="text-sm mt-2">Try adjusting your filters or create a new class</p>
                </td>
            </tr>
        `;
        tableInfo.textContent = `Showing 0 classes`;
        return;
    }

    const totalPages = Math.ceil(filteredClasses.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = Math.min(startIndex + itemsPerPage, filteredClasses.length);
    const pageData = filteredClasses.slice(startIndex, endIndex);

    tableBody.innerHTML = '';

    pageData.forEach(classItem => {
        const row = document.createElement('tr');

        const capacityPercentage = Math.round((classItem.currentStudents / classItem.maxStudents) * 100);

        let capacityColor = 'text-green-600';
        let capacityBg = 'bg-green-100';

        if (capacityPercentage >= 90) {
            capacityColor = 'text-red-600';
            capacityBg = 'bg-red-100';
        } else if (capacityPercentage >= 75) {
            capacityColor = 'text-yellow-600';
            capacityBg = 'bg-yellow-100';
        }

        let subjectCount = 0;
        if (classItem.bulkAssignData && classItem.bulkAssignData.teacherAssignments) {
            Object.values(classItem.bulkAssignData.teacherAssignments).forEach(assignment => {
                subjectCount += (assignment.subjects?.length || 0) + (assignment.otherSubjects?.length || 0);
            });
        }

        row.innerHTML = `
            <td class="px-6 py-4">
                <div class="flex items-center">
                    <div class="h-12 w-12 ${getClassColor(classItem.className)} rounded-lg flex items-center justify-center mr-4">
                        <i class="${getClassIcon(classItem.className)} text-white text-lg"></i>
                    </div>
                    <div>
                        <div class="font-medium text-gray-900">${classItem.className} - Section ${classItem.section}</div>
                        <div class="text-sm text-gray-500">${classItem.classCode}</div>
                        <div class="text-xs text-gray-400 mt-1">${classItem.academicYear} • ${classItem.roomNumber || 'No room assigned'}</div>
                        <div class="text-xs text-gray-500 mt-1">
                            <i class="fas fa-book mr-1"></i> ${subjectCount} subjects
                        </div>
                    </div>
                </div>
            </td>
            <td class="px-6 py-4">
                <div>
                    <div class="flex justify-between items-center mb-1">
                        <span class="text-sm font-medium text-gray-700">Capacity</span>
                        <span class="text-sm font-bold ${capacityColor}">${capacityPercentage}%</span>
                    </div>
                    <div class="w-full bg-gray-200 rounded-full h-2">
                        <div class="${capacityBg} h-2 rounded-full" style="width: ${capacityPercentage}%"></div>
                    </div>
                    <div class="text-xs text-gray-500 mt-1">
                        ${classItem.currentStudents} / ${classItem.maxStudents} students
                    </div>
                </div>
            </td>
            <td class="px-6 py-4">
                <div class="space-y-2">
                    <div class="flex items-center">
                        <div class="teacher-avatar mr-2">
                            ${getTeacherInitials(classItem.classTeacher?.name)}
                        </div>
                        <div>
                            <div class="text-sm font-medium text-gray-900">${classItem.classTeacher?.name || 'Not assigned'}</div>
                            <div class="text-xs text-gray-500">Class Teacher</div>
                        </div>
                    </div>
                    ${classItem.assistantTeacher ? `
                        <div class="flex items-center">
                            <div class="teacher-avatar mr-2">
                                ${getTeacherInitials(classItem.assistantTeacher.name)}
                            </div>
                            <div>
                                <div class="text-sm font-medium text-gray-900">${classItem.assistantTeacher.name}</div>
                                <div class="text-xs text-gray-500">Assistant Teacher</div>
                            </div>
                        </div>
                    ` : ''}
                </div>
            </td>
            <td class="px-6 py-4">
                <div class="text-sm text-gray-900">
                    <div class="font-medium">${formatTime(classItem.startTime)} - ${formatTime(classItem.endTime)}</div>
                    <div class="text-xs text-gray-500 mt-1">
                        ${classItem.workingDays.length} days/week
                    </div>
                </div>
            </td>
            <td class="px-6 py-4">
                <span class="${getStatusClass(classItem.status)} status-badge">
                    <i class="fas ${getStatusIcon(classItem.status)} mr-1"></i>
                    ${classItem.status.charAt(0).toUpperCase() + classItem.status.slice(1)}
                </span>
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
                <button onclick="viewClassDetails(${classItem.id})" class="text-blue-600 hover:text-blue-900 mr-3">
                    <i class="fas fa-eye"></i>
                </button>
                <button onclick="editClass(${classItem.id})" class="text-green-600 hover:text-green-900 mr-3">
                    <i class="fas fa-edit"></i>
                </button>
                <button onclick="deleteClass(${classItem.id})" class="text-red-600 hover:text-red-900">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        `;

        tableBody.appendChild(row);
    });

    const prevBtn = document.getElementById('prevBtn');
    const nextBtn = document.getElementById('nextBtn');

    if (prevBtn) prevBtn.disabled = currentPage === 1;
    if (nextBtn) nextBtn.disabled = currentPage === totalPages;

    tableInfo.textContent = `Showing ${startIndex + 1}-${endIndex} of ${filteredClasses.length} classes`;
}

function getClassColor(className) {
    switch (className) {
        case 'PG': return 'bg-purple-600';
        case 'LKG': return 'bg-green-600';
        case 'UKG': return 'bg-blue-600';
        case '1st': return 'bg-yellow-600';
        case '2nd': return 'bg-red-600';
        default: return 'bg-gray-600';
    }
}

function getClassIcon(className) {
    switch (className) {
        case 'PG': return 'fas fa-baby';
        case 'LKG': return 'fas fa-child';
        case 'UKG': return 'fas fa-graduation-cap';
        case '1st': return 'fas fa-book-open';
        case '2nd': return 'fas fa-book';
        default: return 'fas fa-chalkboard';
    }
}

function getTeacherInitials(name) {
    if (!name) return '?';
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
}

function getStatusClass(status) {
    switch (status) {
        case 'active': return 'status-active';
        case 'inactive': return 'status-inactive';
        case 'pending': return 'status-pending';
        default: return 'status-active';
    }
}

function getStatusIcon(status) {
    switch (status) {
        case 'active': return 'fa-check-circle';
        case 'inactive': return 'fa-times-circle';
        case 'pending': return 'fa-clock';
        default: return 'fa-question-circle';
    }
}

function formatTime(time) {
    if (!time) return '--:--';
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const hour12 = hour % 12 || 12;
    return `${hour12}:${minutes} ${ampm}`;
}

function previousPage() {
    if (currentPage > 1) {
        currentPage--;
        renderClassesTable();
    }
}

function nextPage() {
    const totalPages = Math.ceil(filteredClasses.length / itemsPerPage);
    if (currentPage < totalPages) {
        currentPage++;
        renderClassesTable();
    }
}

// ==================== Modal Functions ====================

function openCreateClassModal() {
    const modal = document.getElementById('createClassModal');
    if (!modal) {
        console.error('Create class modal not found');
        return;
    }

    editingClassId = null;

    const modalTitle = document.getElementById('modalTitle');
    const submitButtonText = document.getElementById('submitButtonText');

    if (modalTitle) modalTitle.textContent = 'Create New Class';
    if (submitButtonText) submitButtonText.textContent = 'Create Class';

    const form = document.getElementById('classForm');
    if (form) form.reset();

    const teacherSubjectAssignments = document.getElementById('teacherSubjectAssignments');
    const classTeacherSubjectItem = document.getElementById('classTeacherSubjectItem');
    const assistantTeacherSubjectItem = document.getElementById('assistantTeacherSubjectItem');
    const noTeachersMessage = document.getElementById('noTeachersMessage');

    if (teacherSubjectAssignments) teacherSubjectAssignments.classList.add('hidden');
    if (classTeacherSubjectItem) classTeacherSubjectItem.classList.add('hidden');
    if (assistantTeacherSubjectItem) assistantTeacherSubjectItem.classList.add('hidden');
    if (noTeachersMessage) noTeachersMessage.classList.remove('hidden');

    const classTeacherSubject = document.getElementById('classTeacherSubject');
    const assistantTeacherSubject = document.getElementById('assistantTeacherSubject');

    if (classTeacherSubject) {
        classTeacherSubject.disabled = true;
        classTeacherSubject.innerHTML = '<option value="">Select Subject</option>';
    }

    if (assistantTeacherSubject) {
        assistantTeacherSubject.disabled = true;
        assistantTeacherSubject.innerHTML = '<option value="">Select Subject</option>';
    }

    selectedClassTeacher = null;
    selectedAssistantTeacher = null;
    assignedSubjects = [];

    clearBulkAssign();

    const academicYear = document.getElementById('academicYear');
    const maxStudents = document.getElementById('maxStudents');
    const currentStudents = document.getElementById('currentStudents');
    const startTime = document.getElementById('startTime');
    const endTime = document.getElementById('endTime');

    if (academicYear) academicYear.value = '2024-2025';
    if (maxStudents) maxStudents.value = '30';
    if (currentStudents) currentStudents.value = '0';
    if (startTime) startTime.value = '08:30';
    if (endTime) endTime.value = '13:30';

    const createSubjectSection = document.getElementById('createSubjectSection');
    const toggleSubjectBtn = document.getElementById('toggleSubjectSectionBtn');

    if (createSubjectSection) {
        createSubjectSection.classList.add('hidden');
    }

    if (toggleSubjectBtn) {
        toggleSubjectBtn.innerHTML = '<i class="fas fa-plus mr-2"></i> Create New Subject';
        toggleSubjectBtn.classList.remove('bg-gray-600');
        toggleSubjectBtn.classList.add('bg-blue-600');
    }

    resetSubjectForm();

    if (teachersData.length === 0) {
        fetchTeachers();
    }

    modal.style.zIndex = '100';
    modal.classList.add('active');
}

// ==================== FIX: MODAL CLOSE FUNCTION ====================
function closeCreateClassModal() {
    const modal = document.getElementById('createClassModal');
    if (modal) {
        modal.classList.remove('active');
        modal.style.zIndex = '';
        modal.style.display = ''; // Reset any inline display styles
    }
    
    // Close any other open modals
    closeOthersModal();
    
    // Reset form
    const form = document.getElementById('classForm');
    if (form) form.reset();
    
    // Reset all state
    editingClassId = null;
    selectedClassTeacher = null;
    selectedAssistantTeacher = null;
    assignedSubjects = [];
    bulkAssignData = {
        teachers: [],
        teacherAssignments: {}
    };
    
    // Hide teachers table
    const tableContainer = document.getElementById('teachersTableContainer');
    if (tableContainer) tableContainer.classList.add('hidden');
    
    console.log('Modal closed and state reset');
}

async function openEditClassModal(classId) {
    editingClassId = classId;

    const modalTitle = document.getElementById('modalTitle');
    const submitButtonText = document.getElementById('submitButtonText');

    if (modalTitle) modalTitle.textContent = 'Edit Class';
    if (submitButtonText) submitButtonText.textContent = 'Update Class';

    const classItem = classesData.find(c => c.id === classId);
    if (!classItem) {
        showToast('Class not found', 'error');
        return;
    }

    const classNameInput = document.getElementById('className');
    const classCodeInput = document.getElementById('classCode');
    const academicYearInput = document.getElementById('academicYear');
    const sectionInput = document.getElementById('section');
    const maxStudentsInput = document.getElementById('maxStudents');
    const currentStudentsInput = document.getElementById('currentStudents');
    const roomNumberInput = document.getElementById('roomNumber');
    const classTeacherSelect = document.getElementById('classTeacher');
    const assistantTeacherSelect = document.getElementById('assistantTeacher');
    const startTimeInput = document.getElementById('startTime');
    const endTimeInput = document.getElementById('endTime');
    const descriptionInput = document.getElementById('description');

    if (classNameInput) classNameInput.value = classItem.className;
    if (classCodeInput) classCodeInput.value = classItem.classCode;
    if (academicYearInput) academicYearInput.value = classItem.academicYear;
    if (sectionInput) sectionInput.value = classItem.section;
    if (maxStudentsInput) maxStudentsInput.value = classItem.maxStudents;
    if (currentStudentsInput) currentStudentsInput.value = classItem.currentStudents;
    if (roomNumberInput) roomNumberInput.value = classItem.roomNumber || '';
    if (classTeacherSelect) classTeacherSelect.value = classItem.classTeacher?.id || '';
    if (assistantTeacherSelect) assistantTeacherSelect.value = classItem.assistantTeacher?.id || '';
    if (startTimeInput) startTimeInput.value = classItem.startTime;
    if (endTimeInput) endTimeInput.value = classItem.endTime;
    if (descriptionInput) descriptionInput.value = classItem.description || '';

    const checkboxes = document.querySelectorAll('input[name="workingDays"]');
    checkboxes.forEach(checkbox => {
        checkbox.checked = classItem.workingDays.includes(checkbox.value);
    });

    if (classItem.classTeacher?.id) {
        setTimeout(() => {
            if (classTeacherSelect) {
                classTeacherSelect.dispatchEvent(new Event('change'));
          
                if (classItem.classTeacher.subject) {
                    setTimeout(() => {
                        const classTeacherSubject = document.getElementById('classTeacherSubject');
                        if (classTeacherSubject) {
                            classTeacherSubject.value = classItem.classTeacher.subject;
                            classTeacherSubject.dispatchEvent(new Event('change'));
                        }
                    }, 100);
                }
            }
        }, 100);
    }

    if (classItem.assistantTeacher?.id) {
        setTimeout(() => {
            if (assistantTeacherSelect) {
                assistantTeacherSelect.dispatchEvent(new Event('change'));
          
                if (classItem.assistantTeacher.subject) {
                    setTimeout(() => {
                        const assistantTeacherSubject = document.getElementById('assistantTeacherSubject');
                        if (assistantTeacherSubject) {
                            assistantTeacherSubject.value = classItem.assistantTeacher.subject;
                            assistantTeacherSubject.dispatchEvent(new Event('change'));
                        }
                    }, 100);
                }
            }
        }, 200);
    }

    if (classItem.bulkAssignData) {
        bulkAssignData = { ...classItem.bulkAssignData };
        updateTeachersTable();
    }

    const modal = document.getElementById('createClassModal');
    if (modal) {
        modal.style.zIndex = '100';
        modal.classList.add('active');
    }
}

// ==================== FIX: FORM SUBMIT HANDLER ====================
async function handleClassFormSubmit(event) {
    // Prevent any default behavior and stop propagation
    if (event) {
        event.preventDefault();
        event.stopPropagation();
    }
    
    console.log('=== FORM SUBMIT STARTED ===');
    showLoading();

    try {
        // Check if form exists
        const form = document.getElementById('classForm');
        if (!form) {
            throw new Error('Form not found');
        }

        // Get all form values with safe fallbacks
        const formData = {
            className: document.getElementById('className')?.value?.trim() || '',
            classCode: document.getElementById('classCode')?.value?.trim() || '',
            academicYear: document.getElementById('academicYear')?.value || '',
            section: document.getElementById('section')?.value || '',
            maxStudents: parseInt(document.getElementById('maxStudents')?.value || '0'),
            currentStudents: parseInt(document.getElementById('currentStudents')?.value || '0'),
            roomNumber: document.getElementById('roomNumber')?.value?.trim() || '',
            classTeacherId: document.getElementById('classTeacher')?.value || '',
            assistantTeacherId: document.getElementById('assistantTeacher')?.value || '',
            classTeacherSubject: document.getElementById('classTeacherSubject')?.value || '',
            assistantTeacherSubject: document.getElementById('assistantTeacherSubject')?.value || '',
            startTime: document.getElementById('startTime')?.value || '08:30',
            endTime: document.getElementById('endTime')?.value || '13:30',
            description: document.getElementById('description')?.value?.trim() || '',
            workingDays: Array.from(document.querySelectorAll('input[name="workingDays"]:checked'))
                .map(cb => cb.value),
            bulkAssignData: { ...bulkAssignData }
        };

        console.log('Form data collected:', formData);

        // Validation
        if (!formData.className) {
            showToast('Please select a class name', 'error');
            hideLoading();
            return;
        }

        if (!formData.classCode) {
            showToast('Please enter a class code', 'error');
            hideLoading();
            return;
        }

        if (!formData.academicYear) {
            showToast('Please select academic year', 'error');
            hideLoading();
            return;
        }

        if (!formData.section) {
            showToast('Please select a section', 'error');
            hideLoading();
            return;
        }

        if (formData.currentStudents > formData.maxStudents) {
            showToast('Current students cannot exceed maximum capacity', 'error');
            hideLoading();
            return;
        }

        if (formData.workingDays.length === 0) {
            showToast('Please select at least one working day', 'error');
            hideLoading();
            return;
        }

        if (formData.classTeacherId && !formData.classTeacherSubject) {
            showToast('Please select a subject for the class teacher', 'error');
            hideLoading();
            return;
        }

        // Get teacher details
        const classTeacher = formData.classTeacherId ?
            teachersData.find(t => t.id === parseInt(formData.classTeacherId)) : null;
        const assistantTeacher = formData.assistantTeacherId ?
            teachersData.find(t => t.id === parseInt(formData.assistantTeacherId)) : null;

        // Create class object
        const newClass = {
            ...formData,
            classTeacher: classTeacher ? {
                id: classTeacher.id,
                name: classTeacher.name,
                subject: formData.classTeacherSubject
            } : null,
            assistantTeacher: assistantTeacher ? {
                id: assistantTeacher.id,
                name: assistantTeacher.name,
                subject: formData.assistantTeacherSubject
            } : null,
            status: 'active',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        console.log('Saving class:', newClass);

        // Save to backend
        const savedClass = await saveClass(newClass);
        console.log('Class saved:', savedClass);

        // Refresh data
        await fetchClasses();

        // Show success message
        if (editingClassId) {
            showToast('Class updated successfully', 'success');
        } else {
            showToast('Class created successfully', 'success');
            if (bulkAssignData.teachers.length > 0) {
                setTimeout(() => {
                    showToast('Bulk teacher assignments saved', 'info');
                }, 1000);
            }
        }

        // Close modal and reset
        closeCreateClassModal();
        
        // Reload data
        setTimeout(() => {
            loadClassData();
        }, 500);

    } catch (error) {
        console.error('Error in form submission:', error);
        showToast('Error saving class: ' + error.message, 'error');
    } finally {
        hideLoading();
    }
}

async function viewClassDetails(classId) {
    const classItem = classesData.find(c => c.id === classId);
    if (!classItem) return;

    const viewClassTitle = document.getElementById('viewClassTitle');
    const viewClassCode = document.getElementById('viewClassCode');

    if (viewClassTitle) viewClassTitle.textContent = `${classItem.className} - Section ${classItem.section}`;
    if (viewClassCode) viewClassCode.textContent = classItem.classCode;

    const capacityPercentage = Math.round((classItem.currentStudents / classItem.maxStudents) * 100);

    const subjectNames = [];
    if (classItem.bulkAssignData && classItem.bulkAssignData.teacherAssignments) {
        Object.values(classItem.bulkAssignData.teacherAssignments).forEach(assignment => {
            if (assignment.subjects) {
                assignment.subjects.forEach(subject => {
                    if (!subjectNames.includes(subject)) subjectNames.push(subject);
                });
            }
            if (assignment.otherSubjects) {
                assignment.otherSubjects.forEach(subject => {
                    if (!subjectNames.includes(subject)) subjectNames.push(subject);
                });
            }
        });
    }

    const hasBulkAssignments = classItem.bulkAssignData &&
        (classItem.bulkAssignData.teachers.length > 0 ||
            Object.keys(classItem.bulkAssignData.teacherAssignments || {}).length > 0);

    const content = document.getElementById('classDetailsContent');
    if (!content) return;

    content.innerHTML = `
        <div class="space-y-6">
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div class="bg-gray-50 p-6 rounded-lg">
                    <h4 class="font-semibold text-gray-800 mb-4">Class Information</h4>
                    <div class="space-y-3">
                        <div class="flex justify-between">
                            <span class="text-gray-600">Academic Year:</span>
                            <span class="font-medium">${classItem.academicYear}</span>
                        </div>
                        <div class="flex justify-between">
                            <span class="text-gray-600">Room Number:</span>
                            <span class="font-medium">${classItem.roomNumber || 'Not assigned'}</span>
                        </div>
                        <div class="flex justify-between">
                            <span class="text-gray-600">Class Code:</span>
                            <span class="font-medium">${classItem.classCode}</span>
                        </div>
                        <div class="flex justify-between">
                            <span class="text-gray-600">Created On:</span>
                            <span class="font-medium">${formatDate(classItem.createdAt)}</span>
                        </div>
                    </div>
                </div>
          
                <div class="bg-gray-50 p-6 rounded-lg">
                    <h4 class="font-semibold text-gray-800 mb-4">Class Capacity</h4>
                    <div class="space-y-3">
                        <div class="flex justify-between">
                            <span class="text-gray-600">Maximum Students:</span>
                            <span class="font-medium">${classItem.maxStudents}</span>
                        </div>
                        <div class="flex justify-between">
                            <span class="text-gray-600">Current Students:</span>
                            <span class="font-medium">${classItem.currentStudents}</span>
                        </div>
                        <div class="flex justify-between">
                            <span class="text-gray-600">Available Seats:</span>
                            <span class="font-medium ${classItem.maxStudents - classItem.currentStudents === 0 ? 'text-red-600' : 'text-green-600'}">
                                ${classItem.maxStudents - classItem.currentStudents}
                            </span>
                        </div>
                        <div class="pt-2">
                            <div class="w-full bg-gray-200 rounded-full h-2">
                                <div class="bg-blue-600 h-2 rounded-full" style="width: ${capacityPercentage}%"></div>
                            </div>
                            <div class="text-xs text-gray-500 mt-1 text-center">
                                ${capacityPercentage}% filled
                            </div>
                        </div>
                    </div>
                </div>
            </div>
          
            <div>
                <h4 class="font-semibold text-gray-800 mb-4">Teaching Staff</h4>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    ${classItem.classTeacher ? `
                        <div class="bg-white border border-gray-200 rounded-lg p-4">
                            <div class="flex items-center mb-3">
                                <div class="teacher-avatar mr-3">
                                    ${getTeacherInitials(classItem.classTeacher.name)}
                                </div>
                                <div>
                                    <div class="font-medium text-gray-900">${classItem.classTeacher.name}</div>
                                    <div class="text-sm text-gray-500">Class Teacher</div>
                                    ${classItem.classTeacher.subject ? `
                                        <div class="text-xs text-blue-600 mt-1">
                                            <i class="fas fa-book mr-1"></i> ${classItem.classTeacher.subject}
                                        </div>
                                    ` : ''}
                                </div>
                            </div>
                            <div class="text-sm text-gray-600">
                                <i class="fas fa-envelope mr-2"></i> ${teachersData.find(t => t.id === classItem.classTeacher.id)?.email || 'teacher@school.com'}
                            </div>
                            <div class="text-sm text-gray-600 mt-1">
                                <i class="fas fa-phone mr-2"></i> ${teachersData.find(t => t.id === classItem.classTeacher.id)?.contactNumber || '+91 9876543210'}
                            </div>
                        </div>
                    ` : ''}}
                      
                    ${classItem.assistantTeacher ? `
                        <div class="bg-white border border-gray-200 rounded-lg p-4">
                            <div class="flex items-center mb-3">
                                <div class="teacher-avatar mr-3">
                                    ${getTeacherInitials(classItem.assistantTeacher.name)}
                                </div>
                                <div>
                                    <div class="font-medium text-gray-900">${classItem.assistantTeacher.name}</div>
                                    <div class="text-sm text-gray-500">Assistant Teacher</div>
                                    ${classItem.assistantTeacher.subject ? `
                                        <div class="text-xs text-blue-600 mt-1">
                                            <i class="fas fa-book mr-1"></i> ${classItem.assistantTeacher.subject}
                                        </div>
                                    ` : ''}
                                </div>
                            </div>
                            <div class="text-sm text-gray-600">
                                <i class="fas fa-envelope mr-2"></i> ${teachersData.find(t => t.id === classItem.assistantTeacher.id)?.email || 'assistant@school.com'}
                            </div>
                            <div class="text-sm text-gray-600 mt-1">
                                <i class="fas fa-phone mr-2"></i> ${teachersData.find(t => t.id === classItem.assistantTeacher.id)?.contactNumber || '+91 9876543211'}
                            </div>
                        </div>
                    ` : ''}}
                </div>
            </div>
          
            ${hasBulkAssignments ? `
                <div>
                    <h4 class="font-semibold text-gray-800 mb-4">Bulk Assignments</h4>
                    <div class="bg-blue-50 border border-blue-200 rounded-lg p-4">
                        <div class="overflow-x-auto">
                            <table class="min-w-full divide-y divide-gray-200">
                                <thead>
                                    <tr>
                                        <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">#</th>
                                        <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Teacher</th>
                                        <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Assigned Subjects</th>
                                        <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Other Subjects</th>
                                    </tr>
                                </thead>
                                <tbody class="divide-y divide-gray-200">
                                    ${classItem.bulkAssignData.teachers.map((teacherId, index) => {
        const teacher = teachersData.find(t => t.id === teacherId);
        const assignment = classItem.bulkAssignData.teacherAssignments[teacherId];
        if (!teacher || !assignment) return '';
        return `
                                            <tr>
                                                <td class="px-4 py-2">${index + 1}</td>
                                                <td class="px-4 py-2">
                                                    <div class="font-medium text-gray-900">${teacher.name}</div>
                                                    <div class="text-xs text-gray-500">${teacher.teacherId}</div>
                                                </td>
                                                <td class="px-4 py-2">
                                                    <div class="flex flex-wrap gap-1">
                                                        ${assignment.subjects?.map(subject => `
                                                            <span class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                                                ${subject}
                                                            </span>
                                                        `).join('') || '<span class="text-gray-500 text-sm">None</span>'}
                                                    </div>
                                                </td>
                                                <td class="px-4 py-2">
                                                    <div class="flex flex-wrap gap-1">
                                                        ${assignment.otherSubjects?.map(subject => `
                                                            <span class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                                                                ${subject}
                                                            </span>
                                                        `).join('') || '<span class="text-gray-500 text-sm">None</span>'}
                                                    </div>
                                                </td>
                                            </tr>
                                        `;
    }).join('')}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            ` : ''}
          
            ${subjectNames.length > 0 ? `
                <div>
                    <h4 class="font-semibold text-gray-800 mb-4">Subjects (${subjectNames.length})</h4>
                    <div class="bg-gray-50 p-4 rounded-lg">
                        <div class="flex flex-wrap gap-2">
                            ${subjectNames.map(subjectName => `
                                <span class="px-3 py-1 bg-white border border-gray-200 rounded-full text-sm text-gray-700">
                                    <i class="fas fa-book mr-1 text-blue-500"></i> ${subjectName}
                                </span>
                            `).join('')}
                        </div>
                    </div>
                </div>
            ` : ''}
          
            <div>
                <h4 class="font-semibold text-gray-800 mb-4">Class Schedule</h4>
                <div class="bg-gray-50 p-6 rounded-lg">
                    <div class="flex items-center justify-between mb-4">
                        <div>
                            <div class="font-medium text-gray-900">${formatTime(classItem.startTime)} - ${formatTime(classItem.endTime)}</div>
                            <div class="text-sm text-gray-600">Daily Schedule</div>
                        </div>
                        <span class="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium">
                            ${classItem.workingDays.length} days/week
                        </span>
                    </div>
              
                    <div class="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
                        ${['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'].map(day => `
                            <div class="schedule-day p-3 text-center ${classItem.workingDays.includes(day) ? 'border-2 border-blue-500' : 'opacity-50'}">
                                <div class="font-medium text-gray-900">${day.charAt(0).toUpperCase() + day.slice(1).substring(0, 3)}</div>
                                <div class="text-xs ${classItem.workingDays.includes(day) ? 'text-green-600' : 'text-gray-400'} mt-1">
                                    ${classItem.workingDays.includes(day) ? 'Class Day' : 'No Class'}
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            </div>
          
            ${classItem.description ? `
                <div>
                    <h4 class="font-semibold text-gray-800 mb-4">Description</h4>
                    <div class="bg-gray-50 p-6 rounded-lg">
                        <p class="text-gray-700">${classItem.description}</p>
                    </div>
                </div>
            ` : ''}
        </div>
          
        <div class="pt-6 border-t border-gray-200 flex justify-end space-x-4">
            <button onclick="editClass(${classItem.id})"
                    class="px-5 py-2.5 border border-blue-600 text-blue-600 rounded-lg hover:bg-blue-50 transition-all font-medium">
                <i class="fas fa-edit mr-2"></i> Edit Class
            </button>
            <button onclick="closeViewClassModal()"
                    class="px-5 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all font-medium">
                Close
            </button>
        </div>
    `;

    const modal = document.getElementById('viewClassModal');
    if (modal) {
        modal.classList.add('active');
    }
}

function closeViewClassModal() {
    const modal = document.getElementById('viewClassModal');
    if (modal) {
        modal.classList.remove('active');
    }
}

function editClass(classId) {
    closeViewClassModal();
    setTimeout(() => {
        openEditClassModal(classId);
    }, 300);
}

// ==================== Schedule Functions ====================

function generateSchedule() {
    const scheduleGrid = document.getElementById('scheduleGrid');
    const weekDisplay = document.getElementById('currentWeek');

    if (!scheduleGrid || !weekDisplay) return;

    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
        'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    const weekStart = new Date(currentWeekDate);
    weekStart.setDate(weekStart.getDate() - weekStart.getDay() + 1);

    const dateOptions = { weekday: 'short', day: 'numeric' };

    const monday = new Date(weekStart);
    const friday = new Date(weekStart);
    friday.setDate(friday.getDate() + 4);

    weekDisplay.textContent = `${monday.toLocaleDateString('en-US', dateOptions)} - ${friday.toLocaleDateString('en-US', dateOptions)}`;

    let scheduleHTML = `
        <div class="grid grid-cols-5 gap-2">
            <div class="text-xs text-gray-500 font-medium py-2 text-center">MON</div>
            <div class="text-xs text-gray-500 font-medium py-2 text-center">TUE</div>
            <div class="text-xs text-gray-500 font-medium py-2 text-center">WED</div>
            <div class="text-xs text-gray-500 font-medium py-2 text-center">THU</div>
            <div class="text-xs text-gray-500 font-medium py-2 text-center">FRI</div>
    `;

    const dayMap = {
        'MON': 'monday',
        'TUE': 'tuesday',
        'WED': 'wednesday',
        'THU': 'thursday',
        'FRI': 'friday'
    };

    const days = ['MON', 'TUE', 'WED', 'THU', 'FRI'];

    days.forEach((dayShort, index) => {
        const fullDayName = dayMap[dayShort];
        const currentDate = new Date(weekStart);
        currentDate.setDate(currentDate.getDate() + index);
        const dateStr = currentDate.getDate();

        const dayClasses = filteredClasses.filter(classItem =>
            classItem.workingDays &&
            classItem.workingDays.map(d => d.toLowerCase()).includes(fullDayName)
        );

        scheduleHTML += `
            <div class="border border-gray-100 rounded-lg p-3 min-h-[180px]">
                <div class="flex items-center justify-between mb-2">
                    <span class="text-xs font-medium text-gray-500">${dateStr}</span>
                    ${dayClasses.length > 0 ? `
                        <span class="text-xs px-1.5 py-0.5 rounded bg-gray-100 text-gray-600">
                            ${dayClasses.length}
                        </span>
                    ` : ''}
                </div>
          
                <div class="space-y-2">
                    ${dayClasses.length > 0 ? dayClasses.map(classItem => `
                        <div class="text-xs p-2 border border-gray-100 rounded hover:border-gray-200 transition-colors">
                            <div class="flex items-start justify-between">
                                <div class="flex items-center">
                                    <div class="h-5 w-5 ${getClassColor(classItem.className)} rounded flex items-center justify-center mr-2">
                                        <i class="${getClassIcon(classItem.className)} text-white text-xs"></i>
                                    </div>
                                    <div>
                                        <div class="font-medium text-gray-800">${classItem.className}-${classItem.section}</div>
                                        <div class="text-gray-500 mt-0.5">${formatTimeShort(classItem.startTime)}-${formatTimeShort(classItem.endTime)}</div>
                                    </div>
                                </div>
                                <div class="text-gray-400 text-xs">
                                    ${classItem.roomNumber?.replace('Room ', 'R') || '-'}
                                </div>
                            </div>
                            <div class="text-gray-500 text-xs mt-1 truncate">
                                ${classItem.classTeacher?.name?.split(' ')[0] || classItem.assistantTeacher?.name?.split(' ')[0] || 'Staff'}
                            </div>
                        </div>
                    `).join('') : `
                        <div class="text-center pt-8">
                            <i class="fas fa-calendar text-gray-300 text-lg mb-2"></i>
                            <p class="text-xs text-gray-400">No classes</p>
                        </div>
                    `}
                </div>
            </div>
        `;
    });

    scheduleHTML += '</div>';
    scheduleGrid.innerHTML = scheduleHTML;
}

function formatTimeShort(time) {
    if (!time) return '--:--';
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'pm' : 'am';
    const hour12 = hour % 12 || 12;
    return `${hour12}:${minutes}${ampm}`;
}

function previousWeek() {
    currentWeek--;
    if (currentWeek < 1) currentWeek = 52;
    currentWeekDate.setDate(currentWeekDate.getDate() - 7);
    generateSchedule();
}

function nextWeek() {
    currentWeek++;
    if (currentWeek > 52) currentWeek = 1;
    currentWeekDate.setDate(currentWeekDate.getDate() + 7);
    generateSchedule();
}

// ==================== Utility Functions ====================

function showLoading() {
    const loadingOverlay = document.getElementById('loadingOverlay');
    if (loadingOverlay) {
        loadingOverlay.classList.remove('hidden');
    }
}

function hideLoading() {
    const loadingOverlay = document.getElementById('loadingOverlay');
    if (loadingOverlay) {
        loadingOverlay.classList.add('hidden');
    }
}

function showToast(message, type = 'info') {
    const toastContainer = document.getElementById('toastContainer');
    if (!toastContainer) return;

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;

    let icon = 'fa-info-circle';
    if (type === 'success') icon = 'fa-check-circle';
    if (type === 'error') icon = 'fa-exclamation-circle';

    toast.innerHTML = `
        <i class="fas ${icon} text-xl"></i>
        <div>
            <p class="font-medium">${message}</p>
        </div>
        <button onclick="this.parentElement.remove()" class="ml-auto text-gray-400 hover:text-gray-600">
            <i class="fas fa-times"></i>
        </button>
    `;

    toastContainer.appendChild(toast);

    setTimeout(() => {
        if (toast.parentNode) {
            toast.remove();
        }
    }, 5000);
}

function formatDate(dateStr) {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
}

function clearBulkAssign() {
    bulkAssignData = {
        teachers: [],
        teacherAssignments: {}
    };

    clearSelection('teachers');

    const buttonText = document.getElementById('teachersDropdownText');
    if (buttonText) {
        buttonText.textContent = 'Select teachers...';
    }

    const tableContainer = document.getElementById('teachersTableContainer');
    if (tableContainer) {
        tableContainer.classList.add('hidden');
    }

    showToast('All assignments cleared', 'info');
}

// Save class function
async function saveClass(classData) {
    try {
        if (editingClassId) {
            return await updateClass(editingClassId, classData);
        } else {
            return await createClass(classData);
        }
    } catch (error) {
        console.error('Error saving class:', error);
        throw error;
    }

    // ==================== FIX: OTHERS MODAL CLEANUP ====================
// Replace your existing closeOthersModal function with this
function closeOthersModal() {
    const modal = document.getElementById('othersModal');
    if (modal) {
        modal.remove(); // Completely remove from DOM
    }
    // Remove any leftover backdrop elements
    document.querySelectorAll('.fixed.inset-0.bg-gray-500.bg-opacity-75').forEach(el => el.remove());
    // Restore body scrolling
    document.body.style.overflow = '';
    document.body.style.position = '';
}

// Also fix the openOthersModal function to ensure proper cleanup
function openOthersModal(teacherId) {
    // First close any existing modal
    closeOthersModal();
    
    // ... rest of your existing openOthersModal code ...
    
    // At the end, disable body scroll
    document.body.style.overflow = 'hidden';
}
}