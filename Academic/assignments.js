// ============================================================================
// ASSIGNMENT MANAGEMENT - COMPLETE BACKEND INTEGRATION
// API Base URL - Change this to your backend URL
// ============================================================================

const API_BASE_URL = 'http://localhost:8084/api/assignments';
const CLASS_API_BASE_URL = 'http://localhost:8084/api/classes';
const STUDENT_API_BASE_URL = 'http://localhost:8084/api/students';
const AUTH_TOKEN_KEY = 'admin_jwt_token';

// Global variables
let sidebarCollapsed = false;
let isMobile = window.innerWidth < 1024;
let assignments = [];
let drafts = [];
let scheduled = [];
let submissions = [];
let students = [];
let notifications = [];
let currentPage = 1;
const itemsPerPage = 10;
let filteredAssignments = [];
let currentTab = 'active';
let selectedStudents = [];
let selectedAssignments = new Set();
let submissionsModalCurrentAssignment = null;
let classList = [];           // All classes
let currentClassSubjects = []; // Subjects for selected class
let currentClassSections = []; // Sections for selected class
let gradingTypes = [];         // Grading types from backend
let priorityTypes = [];        // Priority types from backend
let statusTypes = [];          // Status types from backend
let assignToTypes = [];    

// ============================================================================
// API SERVICE LAYER
// ============================================================================

const AssignmentApi = {
    // ============= AUTH HEADERS =============
    getHeaders: function(includeContentType = true) {
        const token = localStorage.getItem(AUTH_TOKEN_KEY);
        const headers = {};
        
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }
        
        if (includeContentType) {
            headers['Content-Type'] = 'application/json';
        }
        return headers;
    },

    getTeacherIdFromToken: function() {
        const token = localStorage.getItem(AUTH_TOKEN_KEY);
        if (!token) return 1; // Default for testing
        try {
            const payload = JSON.parse(atob(token.split('.')[1]));
            return payload.teacherId || payload.userId || 1;
        } catch (e) {
            console.warn('Could not extract teacher ID from token', e);
            return 1;
        }
    },

    // Helper to extract data from ApiResponse
    extractData: function(response) {
        if (response && response.data !== undefined) {
            return response.data;
        }
        return response;
    },

    // ============= ENUM VALUES (Hardcoded to match backend enums) =============
    getGradingTypes: function() {
        return [
            { value: 'MARKS', label: 'Marks' },
            { value: 'GRADE', label: 'Grade' },
            { value: 'PERCENTAGE', label: 'Percentage' },
            { value: 'PASS_FAIL', label: 'Pass/Fail' },
            { value: 'RUBRIC', label: 'Rubric' }
        ];
    },

    getPriorityTypes: function() {
        return [
            { value: 'HIGH', label: 'High' },
            { value: 'MEDIUM', label: 'Medium' },
            { value: 'LOW', label: 'Low' }
        ];
    },

    getAssignToTypes: function() {
        return [
            { value: 'SPECIFIC_CLASS', label: 'Specific Class & Section' },
            { value: 'MULTIPLE_CLASSES', label: 'Multiple Classes' },
            { value: 'INDIVIDUAL_STUDENTS', label: 'Individual Students' },
            { value: 'WHOLE_SCHOOL', label: 'Whole School / Batch' }
        ];
    },

    getStatusTypes: function() {
        return [
            { value: 'active', label: 'Active' },
            { value: 'inactive', label: 'Inactive' },
            { value: 'completed', label: 'Completed' }
        ];
    },

    getPublishStatusTypes: function() {
        return [
            { value: 'DRAFT', label: 'Draft' },
            { value: 'PUBLISHED', label: 'Published' },
            { value: 'SCHEDULED', label: 'Scheduled' }
        ];
    },

    // ============= PUBLISH OPERATIONS =============
    getDraftAssignments: async function() {
        const teacherId = this.getTeacherIdFromToken();
        try {
            const response = await fetch(`${API_BASE_URL}/teacher/${teacherId}/drafts`, {
                headers: this.getHeaders()
            });
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            const result = await response.json();
            return this.extractData(result) || [];
        } catch (error) {
            console.error('Error fetching drafts:', error);
            throw error;
        }
    },

    getScheduledAssignments: async function() {
        const teacherId = this.getTeacherIdFromToken();
        try {
            const response = await fetch(`${API_BASE_URL}/teacher/${teacherId}/scheduled`, {
                headers: this.getHeaders()
            });
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            const result = await response.json();
            return this.extractData(result) || [];
        } catch (error) {
            console.error('Error fetching scheduled assignments:', error);
            throw error;
        }
    },

    publishAssignment: async function(assignmentId) {
        const teacherId = this.getTeacherIdFromToken();
        try {
            const response = await fetch(`${API_BASE_URL}/${assignmentId}/publish?teacherId=${teacherId}`, {
                method: 'POST',
                headers: this.getHeaders()
            });
            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(errorText || `HTTP error! status: ${response.status}`);
            }
            const result = await response.json();
            return this.extractData(result);
        } catch (error) {
            console.error(`Error publishing assignment ${assignmentId}:`, error);
            throw error;
        }
    },

    // ============= CREATE ASSIGNMENT =============
createAssignment: async function(assignmentData, files = []) {
    assignmentData.createdByTeacherId = this.getTeacherIdFromToken();
    
    console.log('📤 Sending assignment data:', JSON.stringify(assignmentData, null, 2));

    try {
        const response = await fetch(`${API_BASE_URL}/create-assignment`, {
            method: 'POST',
            headers: this.getHeaders(true),
            body: JSON.stringify(assignmentData)
        });
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error('❌ Server error response:', errorText);
            
            // Try to parse as JSON
            try {
                const errorJson = JSON.parse(errorText);
                throw new Error(JSON.stringify(errorJson));
            } catch (e) {
                throw new Error(errorText || `HTTP error! status: ${response.status}`);
            }
        }
        
        const result = await response.json();
        return this.extractData(result);
    } catch (error) {
        console.error('❌ Error creating assignment:', error);
        throw error;
    }
},

    createAssignmentWithFiles: async function(assignmentData, files) {
        const formData = new FormData();
        formData.append('assignmentData', JSON.stringify(assignmentData));
        files.forEach(file => {
            formData.append('attachmentFiles', file);
        });

        try {
            const response = await fetch(`${API_BASE_URL}/create-assignment-with-files`, {
                method: 'POST',
                headers: {
                    'Authorization': this.getHeaders().Authorization
                },
                body: formData
            });
            
            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(errorText || `HTTP error! status: ${response.status}`);
            }
            const result = await response.json();
            return this.extractData(result);
        } catch (error) {
            console.error('Error creating assignment with files:', error);
            throw error;
        }
    },

    // ============= GET ASSIGNMENTS =============
    getAllAssignments: async function(params = {}) {
        const queryParams = new URLSearchParams({
            page: params.page || 0,
            size: params.size || 10,
            ...(params.sortBy && { sortBy: params.sortBy }),
            ...(params.direction && { direction: params.direction })
        });

        try {
            const response = await fetch(`${API_BASE_URL}/get-all-assignments?${queryParams}`, {
                headers: this.getHeaders()
            });
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            
            // This endpoint returns a Page object directly, not wrapped in ApiResponse
            return await response.json();
        } catch (error) {
            console.error('Error fetching assignments:', error);
            throw error;
        }
    },

    getAssignmentById: async function(id) {
        try {
            const response = await fetch(`${API_BASE_URL}/get-assignment-by-id/${id}`, {
                headers: this.getHeaders()
            });
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            const result = await response.json();
            return this.extractData(result);
        } catch (error) {
            console.error(`Error fetching assignment ${id}:`, error);
            throw error;
        }
    },

    getAssignmentsByStatus: async function(status) {
        try {
            const response = await fetch(`${API_BASE_URL}/get-assignments-by-status/${status}`, {
                headers: this.getHeaders()
            });
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            const result = await response.json();
            return this.extractData(result) || [];
        } catch (error) {
            console.error(`Error fetching assignments by status ${status}:`, error);
            throw error;
        }
    },

    getAssignmentsByClass: async function(className) {
        try {
            const response = await fetch(`${API_BASE_URL}/get-assignments-by-class/${className}`, {
                headers: this.getHeaders()
            });
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            const result = await response.json();
            return this.extractData(result) || [];
        } catch (error) {
            console.error(`Error fetching assignments by class ${className}:`, error);
            throw error;
        }
    },

    searchAssignments: async function(filters = {}, page = 0, size = 10) {
        const queryParams = new URLSearchParams({
            page,
            size,
            sortBy: filters.sortBy || 'createdAt',
            direction: filters.direction || 'desc'
        });
        
        // Add filter parameters only if they have values
        if (filters.subject && filters.subject !== 'all') {
            queryParams.append('subject', filters.subject);
        }
        
        if (filters.className && filters.className !== 'all') {
            queryParams.append('className', filters.className);
        }
        
        if (filters.status && filters.status !== 'all') {
            queryParams.append('status', filters.status);
        }
        
        if (filters.priority && filters.priority !== 'all') {
            queryParams.append('priority', filters.priority);
        }
        
        if (filters.fromDate) {
            queryParams.append('fromDate', filters.fromDate);
        }
        
        if (filters.toDate) {
            queryParams.append('toDate', filters.toDate);
        }

        try {
            console.log('🔍 Searching assignments with params:', queryParams.toString());
            const response = await fetch(`${API_BASE_URL}/search-assignments?${queryParams}`, {
                headers: this.getHeaders()
            });
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            // This endpoint returns a Page object directly
            return await response.json();
        } catch (error) {
            console.error('Error searching assignments:', error);
            throw error;
        }
    },

    // ============= UPDATE ASSIGNMENTS =============
    updateAssignment: async function(id, assignmentData, files = []) {
        assignmentData.createdByTeacherId = this.getTeacherIdFromToken();

        if (files && files.length > 0) {
            return this.updateAssignmentWithFiles(id, assignmentData, files);
        }

        try {
            const response = await fetch(`${API_BASE_URL}/update-assignment/${id}`, {
                method: 'PUT',
                headers: this.getHeaders(true),
                body: JSON.stringify(assignmentData)
            });
            
            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(errorText || `HTTP error! status: ${response.status}`);
            }
            const result = await response.json();
            return this.extractData(result);
        } catch (error) {
            console.error(`Error updating assignment ${id}:`, error);
            throw error;
        }
    },

    updateAssignmentWithFiles: async function(id, assignmentData, files) {
        const formData = new FormData();
        formData.append('assignmentData', JSON.stringify(assignmentData));
        files.forEach(file => {
            formData.append('attachmentFiles', file);
        });

        try {
            const response = await fetch(`${API_BASE_URL}/update-assignment-with-files/${id}`, {
                method: 'PATCH',
                headers: {
                    'Authorization': this.getHeaders().Authorization
                },
                body: formData
            });
            
            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(errorText || `HTTP error! status: ${response.status}`);
            }
            const result = await response.json();
            return this.extractData(result);
        } catch (error) {
            console.error(`Error updating assignment ${id} with files:`, error);
            throw error;
        }
    },

    updateAssignmentPartial: async function(id, updates) {
        try {
            const response = await fetch(`${API_BASE_URL}/update-assignment-partial/${id}`, {
                method: 'PATCH',
                headers: this.getHeaders(true),
                body: JSON.stringify(updates)
            });
            
            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(errorText || `HTTP error! status: ${response.status}`);
            }
            const result = await response.json();
            return this.extractData(result);
        } catch (error) {
            console.error(`Error partially updating assignment ${id}:`, error);
            throw error;
        }
    },

    updateAssignmentStatus: async function(id, status) {
        try {
            const response = await fetch(`${API_BASE_URL}/update-assignment-status/${id}?status=${status}`, {
                method: 'PATCH',
                headers: this.getHeaders(true)
            });
            
            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(errorText || `HTTP error! status: ${response.status}`);
            }
            const result = await response.json();
            return this.extractData(result);
        } catch (error) {
            console.error(`Error updating status for assignment ${id}:`, error);
            throw error;
        }
    },

    // ============= DELETE ASSIGNMENTS =============
    deleteAssignment: async function(id) {
        try {
            const response = await fetch(`${API_BASE_URL}/delete-assignment/${id}`, {
                method: 'DELETE',
                headers: this.getHeaders()
            });
            
            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(errorText || `HTTP error! status: ${response.status}`);
            }
            const result = await response.json();
            return this.extractData(result);
        } catch (error) {
            console.error(`Error deleting assignment ${id}:`, error);
            throw error;
        }
    },

    // ============= BULK OPERATIONS =============
    bulkDelete: async function(assignmentIds) {
        try {
            const response = await fetch(`${API_BASE_URL}/bulk-delete`, {
                method: 'DELETE',
                headers: this.getHeaders(true),
                body: JSON.stringify(assignmentIds)
            });
            
            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(errorText || `HTTP error! status: ${response.status}`);
            }
            const result = await response.json();
            return this.extractData(result);
        } catch (error) {
            console.error('Error bulk deleting assignments:', error);
            throw error;
        }
    },

    bulkUpdateStatus: async function(assignmentIds, status) {
        try {
            const response = await fetch(`${API_BASE_URL}/bulk-update-status?status=${status}`, {
                method: 'PATCH',
                headers: this.getHeaders(true),
                body: JSON.stringify(assignmentIds)
            });
            
            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(errorText || `HTTP error! status: ${response.status}`);
            }
            const result = await response.json();
            return this.extractData(result);
        } catch (error) {
            console.error('Error bulk updating status:', error);
            throw error;
        }
    },

    executeBulkAction: async function(bulkActionDto) {
        try {
            const response = await fetch(`${API_BASE_URL}/execute-bulk-action`, {
                method: 'POST',
                headers: this.getHeaders(true),
                body: JSON.stringify(bulkActionDto)
            });
            
            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(errorText || `HTTP error! status: ${response.status}`);
            }
            const result = await response.json();
            return this.extractData(result);
        } catch (error) {
            console.error('Error executing bulk action:', error);
            throw error;
        }
    },

    // ============= STATISTICS =============
    getAssignmentStatistics: async function() {
        try {
            const response = await fetch(`${API_BASE_URL}/get-assignment-statistics`, {
                headers: this.getHeaders()
            });
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            const result = await response.json();
            return this.extractData(result);
        } catch (error) {
            console.error('Error fetching assignment statistics:', error);
            throw error;
        }
    },

    // ============= SUBMISSIONS =============
    getSubmissionsByAssignment: async function(assignmentId) {
        try {
            const response = await fetch(`${API_BASE_URL}/${assignmentId}/get-submissions`, {
                headers: this.getHeaders()
            });
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            const result = await response.json();
            return this.extractData(result) || [];
        } catch (error) {
            console.error(`Error fetching submissions for assignment ${assignmentId}:`, error);
            throw error;
        }
    },

    getSubmission: async function(assignmentId, studentId) {
        try {
            const response = await fetch(`${API_BASE_URL}/${assignmentId}/get-submission/${studentId}`, {
                headers: this.getHeaders()
            });
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            const result = await response.json();
            return this.extractData(result);
        } catch (error) {
            console.error(`Error fetching submission:`, error);
            throw error;
        }
    },

    gradeSubmission: async function(gradeData) {
        try {
            const response = await fetch(`${API_BASE_URL}/grade-submission`, {
                method: 'POST',
                headers: this.getHeaders(true),
                body: JSON.stringify(gradeData)
            });
            
            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(errorText || `HTTP error! status: ${response.status}`);
            }
            const result = await response.json();
            return this.extractData(result);
        } catch (error) {
            console.error('Error grading submission:', error);
            throw error;
        }
    },

    getSubmissionStats: async function(assignmentId) {
        try {
            const response = await fetch(`${API_BASE_URL}/${assignmentId}/get-submission-stats`, {
                headers: this.getHeaders()
            });
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            const result = await response.json();
            return this.extractData(result);
        } catch (error) {
            console.error(`Error fetching submission stats:`, error);
            throw error;
        }
    },

    // ============= REMINDERS =============
    sendReminders: async function(assignmentId, reminderType, customMessage = '') {
        try {
            const url = `${API_BASE_URL}/${assignmentId}/send-reminders?reminderType=${reminderType}${customMessage ? '&customMessage=' + encodeURIComponent(customMessage) : ''}`;
            const response = await fetch(url, {
                method: 'POST',
                headers: this.getHeaders()
            });
            
            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(errorText || `HTTP error! status: ${response.status}`);
            }
            const result = await response.json();
            return this.extractData(result);
        } catch (error) {
            console.error('Error sending reminders:', error);
            throw error;
        }
    },

    sendBulkReminders: async function(assignmentIds, reminderType, customMessage = '') {
        try {
            const url = `${API_BASE_URL}/send-bulk-reminders?reminderType=${reminderType}${customMessage ? '&customMessage=' + encodeURIComponent(customMessage) : ''}`;
            const response = await fetch(url, {
                method: 'POST',
                headers: this.getHeaders(true),
                body: JSON.stringify(assignmentIds)
            });
            
            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(errorText || `HTTP error! status: ${response.status}`);
            }
            const result = await response.json();
            return this.extractData(result);
        } catch (error) {
            console.error('Error sending bulk reminders:', error);
            throw error;
        }
    },

    // ============= CLASS APIs =============
    getAllClasses: async function() {
        try {
            console.log('📚 Fetching classes from API...');
            const response = await fetch(`${CLASS_API_BASE_URL}/get-all-classes`, {
                method: 'GET',
                headers: this.getHeaders()
            });
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            console.log('Raw class API response:', data);
            
            // ClassController returns List<ClassResponseDTO> directly
            return Array.isArray(data) ? data : [];
        } catch (error) {
            console.error('❌ Error fetching classes:', error);
            throw error;
        }
    },

    getClassById: async function(classId) {
        try {
            const response = await fetch(`${CLASS_API_BASE_URL}/get-class-by-id/${classId}`, {
                headers: this.getHeaders()
            });
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            return await response.json();
        } catch (error) {
            console.error('Error fetching class by ID:', error);
            throw error;
        }
    }
};

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

function showToast(message, type = 'success') {
    const toastContainer = document.getElementById('toastContainer');
    if (!toastContainer) {
        // Create toast container if it doesn't exist
        const container = document.createElement('div');
        container.id = 'toastContainer';
        container.className = 'fixed top-4 right-4 z-50 space-y-2';
        document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = `toast ${type} bg-white border-l-4 ${type === 'success' ? 'border-green-500' : type === 'error' ? 'border-red-500' : type === 'warning' ? 'border-yellow-500' : 'border-blue-500'} shadow-lg rounded-lg p-4 mb-2 flex justify-between items-center`;

    let icon = 'fa-check-circle';
    if (type === 'error') icon = 'fa-exclamation-circle';
    else if (type === 'warning') icon = 'fa-exclamation-triangle';
    else if (type === 'info') icon = 'fa-info-circle';

    toast.innerHTML = `
        <div class="flex items-center">
            <i class="fas ${icon} mr-3 ${type === 'success' ? 'text-green-500' : type === 'error' ? 'text-red-500' : type === 'warning' ? 'text-yellow-500' : 'text-blue-500'}"></i>
            <span>${message}</span>
        </div>
        <button class="toast-close ml-4 text-gray-400 hover:text-gray-600">
            <i class="fas fa-times"></i>
        </button>
    `;

    document.getElementById('toastContainer').appendChild(toast);

    setTimeout(() => {
        if (toast.parentNode) {
            toast.remove();
        }
    }, 3000);

    toast.querySelector('.toast-close').addEventListener('click', () => toast.remove());
}

function showLoading() {
    const overlay = document.getElementById('loadingOverlay');
    if (overlay) overlay.classList.remove('hidden');
}

function hideLoading() {
    const overlay = document.getElementById('loadingOverlay');
    if (overlay) overlay.classList.add('hidden');
}

function showEmptyState(type = 'no-assignments') {
    const emptyState = document.getElementById('emptyStateContainer');
    if (!emptyState) return;

    emptyState.classList.remove('hidden');
    document.querySelectorAll('[data-state]').forEach(el => el.classList.add('hidden'));

    const stateEl = document.querySelector(`[data-state="${type}"]`);
    if (stateEl) stateEl.classList.remove('hidden');
}

function showConfirmDialog(title, message, onConfirm) {
    const modal = document.getElementById('confirmModal');
    if (!modal) return;

    document.getElementById('confirmTitle').textContent = title;
    document.getElementById('confirmMessage').textContent = message;
    modal.classList.add('active');

    const handleConfirm = () => {
        modal.classList.remove('active');
        onConfirm();
        cleanup();
    };

    const handleCancel = () => {
        modal.classList.remove('active');
        cleanup();
    };

    const cleanup = () => {
        document.getElementById('confirmOk').removeEventListener('click', handleConfirm);
        document.getElementById('confirmCancel').removeEventListener('click', handleCancel);
    };

    document.getElementById('confirmOk').addEventListener('click', handleConfirm);
    document.getElementById('confirmCancel').addEventListener('click', handleCancel);
}

function showKeyboardShortcuts() {
    const modal = document.getElementById('shortcutsModal');
    if (modal) modal.classList.add('active');
}

function closeShortcutsModal() {
    const modal = document.getElementById('shortcutsModal');
    if (modal) modal.classList.remove('active');
}

// ============================================================================
// RENDER FUNCTIONS
// ============================================================================

function renderAssignmentsList(assignmentsData) {
    const list = document.getElementById('assignmentsList');
    if (!list) return;

    if (!assignmentsData || assignmentsData.length === 0) {
        list.innerHTML = '<div class="text-center py-8 text-gray-500">No assignments found</div>';
        return;
    }

    let html = '';
    assignmentsData.forEach(a => {
        const dueDate = new Date(a.dueDate);
        const now = new Date();
        const daysLeft = Math.ceil((dueDate - now) / (1000 * 3600 * 24));
        const dueStatus = daysLeft < 0 ? 'overdue' : daysLeft <= 2 ? 'soon' : 'normal';
        const dueText = daysLeft < 0 ? `Overdue ${Math.abs(daysLeft)}d` : `Due in ${daysLeft}d`;
        const subRate = a.totalStudents ? Math.round((a.submittedCount / a.totalStudents) * 100) : 0;
        const isSelected = selectedAssignments.has(a.assignmentId);

        html += `
            <div class="assignment-card bg-white border border-gray-200 rounded-lg p-5 mb-4 due-${dueStatus} ${isSelected ? 'selected-row' : ''}">
                <div class="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
                    <div class="flex items-start gap-3 flex-1">
                        <input type="checkbox" class="assignment-checkbox mt-1" value="${a.assignmentId}" 
                            ${isSelected ? 'checked' : ''} onchange="toggleAssignmentSelection(${a.assignmentId}, this.checked)">
                        <div class="h-10 w-10 rounded-full flex items-center justify-center ${getPriorityColorClass(a.priority, true)}">
                            <i class="fas ${getSubjectIcon(a.subject)} ${getPriorityColorClass(a.priority)}"></i>
                        </div>
                        <div class="flex-1">
                            <h4 class="font-semibold text-gray-800 mb-2">${a.title}</h4>
                            <div class="flex items-center gap-4 text-sm text-gray-600">
                                <span><i class="fas fa-book mr-1"></i>${a.subject}</span>
                                <span><i class="fas fa-users mr-1"></i>${a.className}</span>
                                <span class="section-badge">${a.section === 'All Sections' ? 'All Sections' : a.section}</span>
                                <span><i class="fas fa-calendar-alt mr-1"></i>${dueDate.toLocaleDateString('en-IN')}</span>
                            </div>
                            <div class="mt-3 flex items-center gap-4 text-sm">
                                <span>Submissions: <span class="${subRate === 100 ? 'text-green-600' : subRate >= 50 ? 'text-yellow-600' : 'text-red-600'}">
                                    ${a.submittedCount || 0}/${a.totalStudents || 0}</span></span>
                                ${a.gradedCount ? `<span>Graded: ${a.gradedCount}</span>` : ''}
                                ${a.totalMarks ? `<span>Marks: ${a.totalMarks}</span>` : ''}
                            </div>
                            ${a.description ? `<p class="mt-3 text-gray-600 text-sm">${a.description.substring(0, 100)}${a.description.length > 100 ? '...' : ''}</p>` : ''}
                        </div>
                    </div>
                    <div class="flex gap-2 ml-12 lg:ml-0">
                        <button onclick="openSubmissionsModal(${a.assignmentId})" class="px-4 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100">
                            <i class="fas fa-list-check mr-2"></i>Submissions
                        </button>
                        ${a.status === 'active' ? `
                            <button onclick="openEditModal(${a.assignmentId})" class="px-4 py-2 bg-gray-50 text-gray-600 rounded-lg hover:bg-gray-100">
                                <i class="fas fa-edit mr-2"></i>Edit
                            </button>
                            <button onclick="updateAssignmentStatus(${a.assignmentId}, 'completed')" class="px-4 py-2 bg-green-50 text-green-600 rounded-lg hover:bg-green-100">
                                <i class="fas fa-check mr-2"></i>Complete
                            </button>
                        ` : a.status === 'completed' ? `
                            <button onclick="updateAssignmentStatus(${a.assignmentId}, 'active')" class="px-4 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100">
                                <i class="fas fa-redo mr-2"></i>Reopen
                            </button>
                        ` : ''}
                        ${a.publishStatus === 'DRAFT' ? `
                            <button onclick="publishDraft(${a.assignmentId})" class="px-4 py-2 bg-green-50 text-green-600 rounded-lg hover:bg-green-100">
                                <i class="fas fa-globe mr-2"></i>Publish
                            </button>
                        ` : ''}
                        <button onclick="deleteAssignment(${a.assignmentId})" class="px-4 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100">
                            <i class="fas fa-trash mr-2"></i>Delete
                        </button>
                    </div>
                </div>
                <div class="mt-4 pt-4 border-t border-gray-100 flex justify-between text-sm">
                    <span class="${daysLeft < 0 ? 'text-red-600' : daysLeft <= 2 ? 'text-yellow-600' : 'text-green-600'}">
                        <i class="fas fa-clock mr-1"></i>${dueText}
                    </span>
                    <span class="text-gray-500">Created: ${new Date(a.createdAt).toLocaleDateString('en-IN')}</span>
                </div>
            </div>
        `;
    });

    list.innerHTML = html;
}

function renderDraftsList(draftsData) {
    const draftsList = document.getElementById('draftsList');
    if (!draftsList) return;

    if (!draftsData || draftsData.length === 0) {
        draftsList.innerHTML = `
            <div class="text-center py-12 bg-white rounded-lg border border-gray-200">
                <i class="fas fa-pen text-4xl text-gray-300 mb-3"></i>
                <p class="text-gray-500">No draft assignments found</p>
            </div>
        `;
        return;
    }

    let html = '';
    draftsData.forEach(draft => {
        html += `
            <div class="bg-white border border-gray-200 rounded-lg p-5 mb-4 border-l-4 border-yellow-400">
                <div class="flex justify-between items-start">
                    <div>
                        <h4 class="font-semibold text-gray-800">${draft.title}</h4>
                        <p class="text-sm text-gray-600 mt-1">${draft.subject} | ${draft.className} - ${draft.section}</p>
                        <p class="text-xs text-gray-500 mt-2">Last saved: ${new Date(draft.updatedAt || draft.createdAt).toLocaleString()}</p>
                    </div>
                    <div class="flex gap-2">
                        <button onclick="openEditModal(${draft.assignmentId})" class="px-3 py-1 bg-blue-50 text-blue-600 rounded hover:bg-blue-100">
                            <i class="fas fa-edit mr-1"></i> Edit
                        </button>
                        <button onclick="publishDraft(${draft.assignmentId})" class="px-3 py-1 bg-green-50 text-green-600 rounded hover:bg-green-100">
                            <i class="fas fa-globe mr-1"></i> Publish
                        </button>
                    </div>
                </div>
                ${draft.scheduledPublishDate ? `
                    <div class="mt-3 text-xs text-purple-600">
                        <i class="far fa-clock mr-1"></i> Scheduled: ${new Date(draft.scheduledPublishDate).toLocaleString()}
                    </div>
                ` : ''}
            </div>
        `;
    });
    draftsList.innerHTML = html;
}

function renderScheduledList(scheduledData) {
    const scheduledList = document.getElementById('scheduledList');
    if (!scheduledList) return;

    if (!scheduledData || scheduledData.length === 0) {
        scheduledList.innerHTML = `
            <div class="text-center py-12 bg-white rounded-lg border border-gray-200">
                <i class="fas fa-clock text-4xl text-gray-300 mb-3"></i>
                <p class="text-gray-500">No scheduled assignments</p>
            </div>
        `;
        return;
    }

    let html = '';
    scheduledData.forEach(item => {
        html += `
            <div class="bg-white border border-gray-200 rounded-lg p-5 mb-4 border-l-4 border-purple-500">
                <div class="flex justify-between items-start">
                    <div>
                        <h4 class="font-semibold text-gray-800">${item.title}</h4>
                        <p class="text-sm text-gray-600 mt-1">${item.subject} | ${item.className} - ${item.section}</p>
                        <div class="mt-2">
                            <span class="bg-purple-100 text-purple-800 text-xs px-2 py-1 rounded">
                                <i class="far fa-clock mr-1"></i> 
                                Publishes: ${new Date(item.scheduledPublishDate).toLocaleString()}
                            </span>
                        </div>
                    </div>
                    <button onclick="openEditModal(${item.assignmentId})" class="text-blue-600 hover:text-blue-800">
                        <i class="fas fa-edit"></i>
                    </button>
                </div>
            </div>
        `;
    });
    scheduledList.innerHTML = html;
}

function renderSubmissionsTable(submissionsData, assignment) {
    const tableBody = document.getElementById('submissionsTableBody');
    if (!tableBody) return;

    if (!submissionsData || submissionsData.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="8" class="text-center py-4 text-gray-500">No submissions found</td></tr>';
        return;
    }

    const totalStudents = submissionsData.length;
    const submittedCount = submissionsData.filter(s => s.status === 'submitted' || s.status === 'graded').length;
    const pendingCount = submissionsData.filter(s => s.status === 'pending').length;
    const lateCount = submissionsData.filter(s => s.isLate).length;

    document.getElementById('totalStudents').textContent = totalStudents;
    document.getElementById('submittedCount').textContent = submittedCount;
    document.getElementById('pendingCount').textContent = pendingCount;
    document.getElementById('lateCount').textContent = lateCount;

    let html = '';
    submissionsData.forEach(s => {
        let statusBadge = '';
        let marks = '-';

        if (s.status === 'submitted') {
            statusBadge = '<span class="badge badge-success">Submitted</span>';
            marks = s.obtainedMarks ? `${s.obtainedMarks}/${assignment.totalMarks}` : 'Not graded';
        } else if (s.status === 'graded') {
            statusBadge = '<span class="badge badge-info">Graded</span>';
            marks = s.obtainedMarks ? `${s.obtainedMarks}/${assignment.totalMarks}` : '-';
            if (s.grade) marks += ` (${s.grade})`;
        } else if (s.isLate) {
            statusBadge = '<span class="badge badge-danger">Late</span>';
        } else {
            statusBadge = '<span class="badge badge-warning">Pending</span>';
        }

        html += `
            <tr>
                <td>${s.studentName}</td>
                <td>${s.rollNumber}</td>
                <td>${s.studentSection}</td>
                <td>${statusBadge}</td>
                <td>${s.submittedDate ? new Date(s.submittedDate).toLocaleString() : 'Not submitted'}</td>
                <td>${marks}</td>
                <td>${s.teacherFeedback || '-'}</td>
                <td>
                    <button onclick="openGradeModal(${assignment.assignmentId}, ${s.studentId})" class="text-green-600 hover:text-green-800 mr-2">
                        <i class="fas fa-edit"></i>
                    </button>
                </td>
            </tr>
        `;
    });
    tableBody.innerHTML = html;
}

// ============================================================================
// DATA FETCHING FUNCTIONS
// ============================================================================

function populateGradingTypes() {
    const gradingSelect = document.getElementById('gradingType');
    if (!gradingSelect) return;
    
    const currentValue = gradingSelect.value;
    
    gradingTypes = AssignmentApi.getGradingTypes();
    
    gradingSelect.innerHTML = '<option value="">Select Grading Type</option>';
    gradingTypes.forEach(type => {
        const option = document.createElement('option');
        option.value = type.value;
        option.textContent = type.label;
        gradingSelect.appendChild(option);
    });
    
    if (currentValue) gradingSelect.value = currentValue;
}

function populatePriorityOptions() {
    const priorityContainer = document.querySelector('.flex.space-x-2');
    if (!priorityContainer) return;
    
    priorityTypes = AssignmentApi.getPriorityTypes();
    
    priorityContainer.innerHTML = '';
    priorityTypes.forEach(type => {
        const isChecked = type.value === 'MEDIUM' ? 'checked' : '';
        const colorClass = type.value === 'HIGH' ? 'red' : (type.value === 'MEDIUM' ? 'yellow' : 'green');
        
        priorityContainer.innerHTML += `
            <label class="flex-1">
                <input type="radio" name="priority" value="${type.value}" class="hidden peer" ${isChecked}>
                <div class="w-full py-2 text-center rounded-lg border border-gray-300 peer-checked:border-${colorClass}-500 peer-checked:bg-${colorClass}-50 peer-checked:text-${colorClass}-700 cursor-pointer">
                    ${type.label}
                </div>
            </label>
        `;
    });
}

function populateAssignToOptions() {
    const assignToContainer = document.querySelector('.space-y-2');
    if (!assignToContainer) return;
    
    assignToTypes = AssignmentApi.getAssignToTypes();
    
    assignToContainer.innerHTML = '';
    
    assignToTypes.forEach(type => {
        const isChecked = type.value === 'SPECIFIC_CLASS' ? 'checked' : '';
        
        assignToContainer.innerHTML += `
            <label class="flex items-center">
                <input type="radio" name="assignTo" value="${type.value}" class="mr-2" ${isChecked}>
                <span class="text-sm">${type.label}</span>
            </label>
        `;
    });
    
    document.querySelectorAll('input[name="assignTo"]').forEach(radio => {
        radio.addEventListener('change', handleAssignToChange);
    });
}

function formatAssignToLabel(value) {
    return value.split('_').map(word => 
        word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
    ).join(' ');
}

async function fetchClassesFromDatabase() {
    showLoading();
    try {
        console.log('📚 Fetching classes from database...');
        
        const classes = await AssignmentApi.getAllClasses();
        console.log('✅ Classes fetched:', classes);
        
        if (classes && classes.length > 0) {
            classList = classes;
            console.log('Sample class structure:', classList[0]);
            
            // Log all available sections for debugging
            const allSections = classes.map(c => c.section).filter(s => s);
            console.log('📋 All sections from API:', [...new Set(allSections)]);
            
            // Update dropdowns
            updateClassDropdown();
            updateSectionDropdown();
            updateSubjectDropdown();
            
            // Populate filter dropdowns
            await populateFilterSubjects();
            await populateFilterClasses();
            
            showToast(`Loaded ${classes.length} classes successfully`, 'success');
        } else {
            console.warn('No classes found');
            classList = [];
            clearDependentDropdowns();
        }
        
        return classList;
    } catch (error) {
        console.error('❌ Error fetching classes:', error);
        showToast('Failed to load classes: ' + error.message, 'error');
        classList = [];
        clearDependentDropdowns();
        return [];
    } finally {
        hideLoading();
    }
}

function updateClassDropdown() {
    const classSelect = document.getElementById('class');
    if (!classSelect) {
        console.error('Class dropdown element not found!');
        return;
    }

    const currentValue = classSelect.value;
    classSelect.innerHTML = '<option value="">Select Class</option>';

    if (!classList || classList.length === 0) {
        console.warn('No classes to display in dropdown');
        return;
    }

    // Group by className to avoid duplicates
    const uniqueClasses = [];
    const seen = new Set();
    
    classList.forEach(cls => {
        const className = cls.className || `Class ${cls.classId}`;
        if (!seen.has(className)) {
            seen.add(className);
            uniqueClasses.push(cls);
        }
    });

    console.log('Unique classes for dropdown:', uniqueClasses.length);

    uniqueClasses.forEach(cls => {
        const option = document.createElement('option');
        const className = cls.className || `Class ${cls.classId}`;
        option.value = className;
        option.setAttribute('data-class-id', cls.classId);
        option.setAttribute('data-class-object', JSON.stringify(cls));
        option.textContent = `${className} (${cls.academicYear || 'N/A'})`;

        if (className === currentValue) {
            option.selected = true;
            loadClassDetails(cls);
        }

        classSelect.appendChild(option);
    });

    console.log('📋 Class dropdown updated with', uniqueClasses.length, 'classes');

    // Always update section dropdown after class dropdown is populated
    updateSectionDropdown();

    if (!currentValue) {
        clearDependentDropdowns();
    }
}

function updateSectionDropdown() {
    const sectionSelect = document.getElementById('section');
    if (!sectionSelect) {
        console.error('Section dropdown element not found!');
        return;
    }

    const classSelect = document.getElementById('class');
    const selectedClass = classSelect ? classSelect.value : null;
    
    console.log('🔄 Updating section dropdown. Selected class:', selectedClass);
    console.log('📊 Current classList:', classList);

    // Clear current options
    sectionSelect.innerHTML = '<option value="">Select Section</option>';

    if (!selectedClass || selectedClass === '') {
        console.log('No class selected, clearing section dropdown');
        sectionSelect.disabled = true;
        return;
    }

    if (!classList || classList.length === 0) {
        console.warn('No classes in classList');
        sectionSelect.disabled = true;
        return;
    }

    // Filter classes by the selected class name
    const classesForSelected = classList.filter(cls => 
        cls.className === selectedClass || 
        (cls.className && cls.className.toString() === selectedClass.toString())
    );
    
    console.log('📚 Classes matching selected class:', classesForSelected);

    if (classesForSelected.length === 0) {
        console.warn('No classes found for selected class name:', selectedClass);
        sectionSelect.disabled = true;
        return;
    }

    // Extract unique sections
    const sections = classesForSelected
        .map(cls => cls.section)
        .filter(section => section && section.trim() !== '');
    
    console.log('🔍 Raw sections extracted:', sections);

    // Remove duplicates
    const uniqueSections = [...new Set(sections)];
    console.log('🎯 Unique sections:', uniqueSections);

    if (uniqueSections.length === 0) {
        console.warn('No valid sections found for class:', selectedClass);
        sectionSelect.innerHTML = '<option value="">No sections available</option>';
        sectionSelect.disabled = true;
        return;
    }

    // Populate the dropdown
    uniqueSections.sort().forEach(section => {
        const option = document.createElement('option');
        option.value = section;
        option.textContent = `Section ${section}`;
        sectionSelect.appendChild(option);
    });

    currentClassSections = uniqueSections;
    sectionSelect.disabled = false;
    
    console.log('✅ Section dropdown updated with', uniqueSections.length, 'sections:', uniqueSections);
}

function updateSubjectDropdown() {
    const subjectSelect = document.getElementById('subject');
    if (!subjectSelect) return;
    
    const classSelect = document.getElementById('class');
    const selectedClass = classSelect.options[classSelect.selectedIndex]?.value;
    
    const currentValue = subjectSelect.value;
    subjectSelect.innerHTML = '<option value="">Select Subject</option>';
    
    if (!selectedClass || !classList) {
        addDefaultSubjects(subjectSelect);
        return;
    }
    
    const classObj = classList.find(cls => cls.className === selectedClass);
    
    if (!classObj) {
        console.warn('Class object not found for:', selectedClass);
        addDefaultSubjects(subjectSelect);
        return;
    }
    
    const subjects = extractSubjectsFromClass(classObj);
    currentClassSubjects = subjects;
    
    if (subjects.length === 0) {
        console.warn('No subjects found for class:', selectedClass);
        addDefaultSubjects(subjectSelect);
    } else {
        subjects.sort().forEach(subject => {
            const option = document.createElement('option');
            option.value = subject;
            option.textContent = subject;
            subjectSelect.appendChild(option);
        });
    }
    
    if (currentValue && subjects.includes(currentValue)) {
        subjectSelect.value = currentValue;
    }
    
    console.log('📋 Subjects updated for', selectedClass, ':', subjects);
}

function addDefaultSubjects(subjectSelect) {
    const defaultSubjects = [
        'Mathematics', 'Science', 'English', 'Hindi', 'Social Studies',
        'Computer Science', 'Physics', 'Chemistry', 'Biology',
        'History', 'Geography', 'Economics', 'Accountancy', 'Business Studies'
    ];
    
    defaultSubjects.forEach(subject => {
        const option = document.createElement('option');
        option.value = subject;
        option.textContent = subject;
        subjectSelect.appendChild(option);
    });
    
    console.log('Using default subjects as fallback');
}

function extractSubjectsFromClass(classObj) {
    const subjects = new Set();
    
    console.log('Extracting subjects from class:', classObj);
    
    try {
        if (classObj.classTeacherSubject) {
            subjects.add(classObj.classTeacherSubject);
        }
        
        if (classObj.assistantTeacherSubject) {
            subjects.add(classObj.assistantTeacherSubject);
        }
        
        if (classObj.otherTeacherSubject && Array.isArray(classObj.otherTeacherSubject)) {
            classObj.otherTeacherSubject.forEach(teacher => {
                if (teacher.subjects && Array.isArray(teacher.subjects)) {
                    teacher.subjects.forEach(sub => {
                        if (sub.subjectName) {
                            subjects.add(sub.subjectName);
                        }
                    });
                }
            });
        }
        
        if (classObj.subjects && Array.isArray(classObj.subjects)) {
            classObj.subjects.forEach(sub => {
                if (typeof sub === 'string') subjects.add(sub);
                else if (sub.subjectName) subjects.add(sub.subjectName);
                else if (sub.name) subjects.add(sub.name);
            });
        }
        
    } catch (error) {
        console.error('Error extracting subjects:', error);
    }
    
    const result = Array.from(subjects);
    console.log('Extracted subjects:', result);
    return result;
}

function clearDependentDropdowns() {
    const sectionSelect = document.getElementById('section');
    const subjectSelect = document.getElementById('subject');

    if (sectionSelect) {
        sectionSelect.innerHTML = '<option value="">Select Section</option>';
    }

    if (subjectSelect) {
        subjectSelect.innerHTML = '<option value="">Select Subject</option>';
        addDefaultSubjects(subjectSelect);
    }

    currentClassSubjects = [];
    currentClassSections = [];
}

function loadClassDetails(classObj) {
    console.log('Loading details for class:', classObj);

    const academicYearInput = document.getElementById('academicYear');
    if (academicYearInput && classObj.academicYear) {
        academicYearInput.value = classObj.academicYear;
    }

    updateSectionDropdown();
    updateSubjectDropdown();
}

function onClassChange() {
    console.log('🔄 Class changed to:', document.getElementById('class').value);
    
    const classSelect = document.getElementById('class');
    const selectedClass = classSelect.value;
    const assignTo = document.querySelector('input[name="assignTo"]:checked')?.value;

    // Force update section dropdown immediately
    updateSectionDropdown();
    
    // Also update subject dropdown
    updateSubjectDropdown();

    const selectedSection = document.getElementById('section').value;

    if (assignTo === 'INDIVIDUAL_STUDENTS' && selectedClass && selectedSection) {
        loadStudentsForClass(selectedClass, selectedSection);
    }

    console.log('✅ Class change processed. Section dropdown should be updated.');
}

function getSelectedClassId() {
    // This function is now optional since we're using className instead of classId
    const classSelect = document.getElementById('class');
    if (!classSelect) return null;
    
    const selectedIndex = classSelect.selectedIndex;
    if (selectedIndex <= 0) return null;
    
    const selectedOption = classSelect.options[selectedIndex];
    return selectedOption.getAttribute('data-class-id');
}

async function fetchAssignments(page = 0, filters = {}) {
    showLoading();
    try {
        let response;
        
        // Check if we have any filters
        const hasFilters = filters.search || 
                          (filters.subject && filters.subject !== 'all') || 
                          (filters.className && filters.className !== 'all') || 
                          (filters.status && filters.status !== 'all');
        
        // Add tab to filters if not drafts or scheduled
        if (currentTab !== 'drafts' && currentTab !== 'scheduled') {
            filters.tab = currentTab;
        }
        
        if (hasFilters) {
            // Use search endpoint when filters are applied
            console.log('🔍 Using search endpoint with filters:', filters);
            response = await AssignmentApi.searchAssignments(filters, page, itemsPerPage);
        } else {
            // Use getAllAssignments when no filters
            const params = {
                page,
                size: itemsPerPage
            };
            
            if (currentTab !== 'drafts' && currentTab !== 'scheduled') {
                params.tab = currentTab;
            }
            
            console.log('📡 Using getAll endpoint with params:', params);
            response = await AssignmentApi.getAllAssignments(params);
        }
        
        if (response) {
            if (response.content) {
                filteredAssignments = response.content;
                const totalItems = response.totalElements || 0;
                const totalPages = response.totalPages || 1;
                
                console.log(`✅ Found ${filteredAssignments.length} assignments (total: ${totalItems})`);
                
                renderAssignmentsList(filteredAssignments);
                updatePagination(totalItems, totalPages, page);
                
                // Update filter stats
                updateFilterStats(totalItems, filteredAssignments.length, hasFilters);
            } else if (Array.isArray(response)) {
                filteredAssignments = response;
                renderAssignmentsList(filteredAssignments);
                updatePagination(filteredAssignments.length, 1, page);
                updateFilterStats(filteredAssignments.length, filteredAssignments.length, hasFilters);
            } else {
                filteredAssignments = [];
                renderAssignmentsList([]);
                updateFilterStats(0, 0, hasFilters);
            }

            updateStatistics();

            // Handle empty state
            const emptyState = document.getElementById('emptyStateContainer');
            if (emptyState) {
                if (filteredAssignments.length > 0) {
                    emptyState.classList.add('hidden');
                } else {
                    if (hasFilters) {
                        showEmptyState('no-results');
                    } else {
                        showEmptyState('no-assignments');
                    }
                }
            }
        }
    } catch (error) {
        console.error('Error fetching assignments:', error);
        showToast('Failed to load assignments: ' + error.message, 'error');
        showEmptyState('error');
    } finally {
        hideLoading();
    }
}

function updateFilterStats(totalItems, shownItems, hasFilters) {
    const filterStats = document.getElementById('filterStats');
    if (!filterStats) {
        // Create filter stats element if it doesn't exist
        const filterSection = document.querySelector('.bg-white.rounded-xl.shadow-sm.border.border-gray-100.p-6');
        if (filterSection) {
            const statsDiv = document.createElement('div');
            statsDiv.id = 'filterStats';
            statsDiv.className = 'text-sm text-gray-600 mt-2';
            filterSection.appendChild(statsDiv);
        }
    }
    
    if (filterStats) {
        if (hasFilters) {
            filterStats.innerHTML = `Showing <span class="font-semibold">${shownItems}</span> of <span class="font-semibold">${totalItems}</span> filtered assignments`;
        } else {
            filterStats.innerHTML = `Showing <span class="font-semibold">${shownItems}</span> of <span class="font-semibold">${totalItems}</span> assignments`;
        }
    }
}

async function loadDrafts() {
    showLoading();
    try {
        const draftsData = await AssignmentApi.getDraftAssignments();
        drafts = draftsData || [];
        renderDraftsList(drafts);
    } catch (error) {
        console.error('Error loading drafts:', error);
        showToast('Failed to load drafts', 'error');
    } finally {
        hideLoading();
    }
}

async function loadScheduled() {
    showLoading();
    try {
        const scheduledData = await AssignmentApi.getScheduledAssignments();
        scheduled = scheduledData || [];
        renderScheduledList(scheduled);
    } catch (error) {
        console.error('Error loading scheduled:', error);
        showToast('Failed to load scheduled assignments', 'error');
    } finally {
        hideLoading();
    }
}

async function updateStatistics() {
    try {
        const stats = await AssignmentApi.getAssignmentStatistics();
        if (stats) {
            document.getElementById('totalAssignments').textContent = stats.totalAssignments || 0;
            document.getElementById('activeAssignments').textContent = stats.activeAssignments || 0;
            
            const assignmentCount = document.getElementById('assignmentCount');
            if (assignmentCount) assignmentCount.textContent = stats.activeAssignments || 0;
            
            document.getElementById('pendingSubmissions').textContent = stats.pendingSubmissions || 0;
            document.getElementById('lateSubmissionsStat').textContent = stats.lateSubmissions || 0;
            document.getElementById('needsGrading').textContent = stats.needsGrading || 0;
            document.getElementById('gradedAssignments').textContent = stats.gradedAssignments || 0;

            const draftCount = stats.draftAssignments || 0;
            const draftCountEl = document.getElementById('draftCount');
            if (draftCountEl) {
                draftCountEl.textContent = draftCount;
                draftCountEl.classList.toggle('hidden', draftCount === 0);
            }
        }
    } catch (error) {
        console.error('Error updating statistics:', error);
    }
}

async function populateFilterSubjects() {
    const filterSubject = document.getElementById('filterSubject');
    if (!filterSubject) return;
    
    try {
        // If classes aren't loaded yet, fetch them
        if (classList.length === 0) {
            await fetchClassesFromDatabase();
        }
        
        const allSubjects = new Set();
        
        // Extract subjects from all classes
        classList.forEach(cls => {
            const subjects = extractSubjectsFromClass(cls);
            subjects.forEach(sub => allSubjects.add(sub));
        });
        
        const currentValue = filterSubject.value;
        
        // Clear and repopulate dropdown
        filterSubject.innerHTML = '<option value="all">All Subjects</option>';
        
        // Add subjects alphabetically
        Array.from(allSubjects).sort().forEach(subject => {
            if (subject && subject.trim()) {
                const option = document.createElement('option');
                option.value = subject;
                option.textContent = subject;
                filterSubject.appendChild(option);
            }
        });
        
        // If no subjects found, add default ones
        if (allSubjects.size === 0) {
            const defaultSubjects = [
                'Mathematics', 'Science', 'English', 'Hindi', 
                'Social Studies', 'Computer Science', 'Physics', 
                'Chemistry', 'Biology'
            ];
            defaultSubjects.forEach(subject => {
                const option = document.createElement('option');
                option.value = subject;
                option.textContent = subject;
                filterSubject.appendChild(option);
            });
        }
        
        // Restore previous selection if possible
        if (currentValue && currentValue !== 'all') {
            const exists = Array.from(filterSubject.options).some(opt => opt.value === currentValue);
            if (exists) filterSubject.value = currentValue;
        }
        
        console.log('📋 Subject filter populated with', filterSubject.options.length - 1, 'subjects');
        
    } catch (error) {
        console.error('Error populating subject filter:', error);
        // Add default subjects as fallback
        filterSubject.innerHTML = '<option value="all">All Subjects</option>';
        const defaultSubjects = [
            'Mathematics', 'Science', 'English', 'Hindi', 
            'Social Studies', 'Computer Science'
        ];
        defaultSubjects.forEach(subject => {
            const option = document.createElement('option');
            option.value = subject;
            option.textContent = subject;
            filterSubject.appendChild(option);
        });
    }
}

async function populateFilterClasses() {
    const filterClass = document.getElementById('filterClass');
    if (!filterClass) return;
    
    try {
        // If classes aren't loaded yet, fetch them
        if (classList.length === 0) {
            await fetchClassesFromDatabase();
        }
        
        const currentValue = filterClass.value;
        
        // Clear and repopulate dropdown
        filterClass.innerHTML = '<option value="all">All Classes</option>';
        
        // Get unique class names
        const uniqueClasses = [...new Set(classList.map(c => c.className))].filter(Boolean);
        
        // Sort alphabetically
        uniqueClasses.sort().forEach(className => {
            const option = document.createElement('option');
            option.value = className;
            option.textContent = className;
            filterClass.appendChild(option);
        });
        
        // Restore previous selection if possible
        if (currentValue && currentValue !== 'all') {
            const exists = Array.from(filterClass.options).some(opt => opt.value === currentValue);
            if (exists) filterClass.value = currentValue;
        }
        
        console.log('📋 Class filter populated with', filterClass.options.length - 1, 'classes');
        
    } catch (error) {
        console.error('Error populating class filter:', error);
        filterClass.innerHTML = '<option value="all">All Classes</option>';
    }
}

function applyFilters() {
    // Get filter values
    const searchTerm = document.getElementById('searchAssignments').value.trim();
    const subjectFilter = document.getElementById('filterSubject').value;
    const classFilter = document.getElementById('filterClass').value;
    const statusFilter = document.getElementById('filterStatus').value;

    // Build filters object for backend
    const filters = {};

    // Add search term
    if (searchTerm) {
        filters.search = searchTerm;
    }

    // Add subject filter
    if (subjectFilter && subjectFilter !== 'all') {
        filters.subject = subjectFilter;
    }

    // Add class filter
    if (classFilter && classFilter !== 'all') {
        filters.className = classFilter;
    }

    // Add status filter
    if (statusFilter && statusFilter !== 'all') {
        filters.status = statusFilter;
    }

    console.log('🔍 Applying filters:', filters);

    // Reset to first page and fetch
    currentPage = 1;
    fetchAssignments(0, filters);
    
    // Show visual feedback
    showToast('Filters applied', 'info');
}

function clearFilters() {
    // Clear search input
    document.getElementById('searchAssignments').value = '';
    
    // Reset all filter dropdowns to 'all'
    document.getElementById('filterSubject').value = 'all';
    document.getElementById('filterClass').value = 'all';
    document.getElementById('filterStatus').value = 'all';
    
    // Fetch all assignments without filters
    fetchAssignments(0);
    
    // Show success message
    showToast('Filters cleared', 'success');
    
    console.log('🧹 Filters cleared');
}

// ============================================================================
// MODAL FUNCTIONS
// ============================================================================

function openAddModal() {
    document.getElementById('modalTitle').textContent = 'Add New Assignment';
    document.getElementById('assignmentForm').reset();
    document.getElementById('assignmentId').value = '';

    document.getElementById('multipleClassesSection').classList.add('hidden');
    document.getElementById('individualStudentsSection').classList.add('hidden');

    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const formatDate = (date) => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        return `${year}-${month}-${day}T${hours}:${minutes}`;
    };

    document.getElementById('startDate').value = formatDate(now);
    document.getElementById('dueDate').value = formatDate(tomorrow);

    document.querySelector('input[name="priority"][value="MEDIUM"]').checked = true;
    document.querySelector('input[name="assignTo"][value="SPECIFIC_CLASS"]').checked = true;
    document.querySelector('input[name="publishOption"][value="publish_now"]').checked = true;

    document.getElementById('notifyStudents').checked = true;
    document.getElementById('notifyParents').checked = true;
    document.getElementById('sendReminders').checked = true;

    document.getElementById('uploadedFiles').classList.add('hidden');
    document.getElementById('fileList').innerHTML = '';

    document.getElementById('assignmentModal').classList.add('active');
    document.getElementById('assignmentTitle').focus();
}

async function openEditModal(assignmentId) {
    showLoading();
    try {
        const assignment = await AssignmentApi.getAssignmentById(assignmentId);
        if (!assignment) {
            showToast('Assignment not found', 'error');
            return;
        }

        document.getElementById('modalTitle').textContent = 'Edit Assignment';
        document.getElementById('assignmentId').value = assignment.assignmentId;

        document.getElementById('assignmentTitle').value = assignment.title || '';
        document.getElementById('subject').value = assignment.subject || '';
        document.getElementById('class').value = assignment.className || '';
        document.getElementById('section').value = assignment.section || '';
        document.getElementById('description').value = assignment.description || '';
        document.getElementById('gradingType').value = assignment.gradingType || '';
        document.getElementById('totalMarks').value = assignment.totalMarks || '';

        const formatDateForInput = (dateStr) => {
            if (!dateStr) return '';
            const date = new Date(dateStr);
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            const hours = String(date.getHours()).padStart(2, '0');
            const minutes = String(date.getMinutes()).padStart(2, '0');
            return `${year}-${month}-${day}T${hours}:${minutes}`;
        };

        document.getElementById('startDate').value = formatDateForInput(assignment.startDate);
        document.getElementById('dueDate').value = formatDateForInput(assignment.dueDate);

        document.getElementById('allowLateSubmission').checked = assignment.allowLateSubmission || false;
        document.getElementById('allowResubmission').checked = assignment.allowResubmission || false;

        const priorityRadio = document.querySelector(`input[name="priority"][value="${assignment.priority}"]`);
        if (priorityRadio) priorityRadio.checked = true;

        const assignToRadio = document.querySelector(`input[name="assignTo"][value="${assignment.assignTo}"]`);
        if (assignToRadio) {
            assignToRadio.checked = true;
            if (assignment.assignTo === 'MULTIPLE_CLASSES') {
                document.getElementById('multipleClassesSection').classList.remove('hidden');
            }
        }

        document.getElementById('notifyStudents').checked = assignment.notifyStudents !== false;
        document.getElementById('notifyParents').checked = assignment.notifyParents !== false;
        document.getElementById('sendReminders').checked = assignment.sendReminders !== false;
        document.getElementById('sendLateWarnings').checked = assignment.sendLateWarnings || false;

        document.getElementById('externalLink').value = assignment.externalLink || '';

        if (assignment.attachments && assignment.attachments.length > 0) {
            document.getElementById('uploadedFiles').classList.remove('hidden');
            const fileList = document.getElementById('fileList');
            fileList.innerHTML = '';
            assignment.attachments.forEach(file => {
                fileList.innerHTML += `<div class="file-attachment"><i class="fas fa-paperclip mr-1"></i>${file}</div>`;
            });
        }

        if (assignment.publishStatus === 'DRAFT') {
            document.querySelector('input[name="publishOption"][value="save_draft"]').checked = true;
            document.getElementById('saveButtonText').textContent = 'Save Draft';
            document.getElementById('draftInfo').classList.remove('hidden');
        } else if (assignment.publishStatus === 'SCHEDULED' && assignment.scheduledPublishDate) {
            document.querySelector('input[name="publishOption"][value="schedule_publish"]').checked = true;
            document.getElementById('scheduledPublishDate').value = assignment.scheduledPublishDate.slice(0, 16);
            document.getElementById('schedulePicker').classList.remove('hidden');
            document.getElementById('saveButtonText').textContent = 'Schedule Publish';
        }

        document.getElementById('assignmentModal').classList.add('active');
    } catch (error) {
        console.error('Error opening edit modal:', error);
        showToast('Failed to load assignment details', 'error');
    } finally {
        hideLoading();
    }
}

function closeModal() {
    document.getElementById('assignmentModal').classList.remove('active');
}

async function openSubmissionsModal(assignmentId) {
    submissionsModalCurrentAssignment = assignmentId;
    showLoading();
    try {
        const assignment = await AssignmentApi.getAssignmentById(assignmentId);
        if (!assignment) {
            showToast('Assignment not found', 'error');
            return;
        }

        document.getElementById('submissionModalTitle').textContent = `Submissions: ${assignment.title}`;
        document.getElementById('submissionAssignmentInfo').textContent =
            `${assignment.subject} | ${assignment.className} | Due: ${new Date(assignment.dueDate).toLocaleDateString()}`;

        const submissions = await AssignmentApi.getSubmissionsByAssignment(assignmentId);
        renderSubmissionsTable(submissions || [], assignment);

        document.getElementById('submissionsModal').classList.add('active');
    } catch (error) {
        console.error('Error opening submissions modal:', error);
        showToast('Failed to load submissions', 'error');
    } finally {
        hideLoading();
    }
}

function closeSubmissionsModal() {
    document.getElementById('submissionsModal').classList.remove('active');
    submissionsModalCurrentAssignment = null;
}

async function openGradeModal(assignmentId, studentId) {
    showLoading();
    try {
        const assignment = await AssignmentApi.getAssignmentById(assignmentId);
        const submission = await AssignmentApi.getSubmission(assignmentId, studentId);

        document.getElementById('gradeModalTitle').textContent = `Grade: ${assignment.title}`;
        document.getElementById('gradeStudentInfo').textContent = `Student: ${submission?.studentName || 'Unknown'}`;
        document.getElementById('gradeAssignmentId').value = assignmentId;
        document.getElementById('gradeStudentId').value = studentId;
        document.getElementById('maxMarks').textContent = assignment.totalMarks || 100;

        if (submission) {
            document.getElementById('obtainedMarks').value = submission.obtainedMarks || '';
            document.getElementById('gradeLetter').value = submission.grade || '';
            document.getElementById('teacherFeedback').value = submission.teacherFeedback || '';
        }

        document.getElementById('gradeModal').classList.add('active');
    } catch (error) {
        console.error('Error opening grade modal:', error);
        showToast('Failed to load grading details', 'error');
    } finally {
        hideLoading();
    }
}

function closeGradeModal() {
    document.getElementById('gradeModal').classList.remove('active');
}

async function openReportsModal() {
    document.getElementById('reportsModal').classList.add('active');
    await loadReportsData();
}

function closeReportsModal() {
    document.getElementById('reportsModal').classList.remove('active');
}

function openBulkActionsModal() {
    if (selectedAssignments.size === 0) {
        showToast('Please select at least one assignment', 'warning');
        return;
    }
    document.getElementById('selectedCount').textContent = selectedAssignments.size;
    document.getElementById('bulkActionsModal').classList.add('active');
}

function closeBulkActionsModal() {
    document.getElementById('bulkActionsModal').classList.remove('active');
}

// ============================================================================
// CRUD OPERATIONS
// ============================================================================

function buildAssignmentDataFromForm() {
    const publishOption = document.querySelector('input[name="publishOption"]:checked')?.value || 'publish_now';
    
    // Don't use classId - use className and section instead
    const selectedClass = document.getElementById('class').value;
    const selectedSubject = document.getElementById('subject').value;
    const selectedSection = document.getElementById('section').value;
    const selectedGradingType = document.getElementById('gradingType').value;
    const selectedPriority = document.querySelector('input[name="priority"]:checked')?.value;
    const selectedAssignTo = document.querySelector('input[name="assignTo"]:checked')?.value;
    
    // Validation
    if (!selectedClass) {
        showToast('Please select a class', 'warning');
        return null;
    }
    
    if (!selectedSubject) {
        showToast('Please select a subject', 'warning');
        return null;
    }
    
    if (!selectedSection) {
        showToast('Please select a section', 'warning');
        return null;
    }
    
    if (!selectedGradingType) {
        showToast('Please select a grading type', 'warning');
        return null;
    }
    
    if (!selectedPriority) {
        showToast('Please select a priority', 'warning');
        return null;
    }
    
    if (!selectedAssignTo) {
        showToast('Please select assignment distribution', 'warning');
        return null;
    }
    
    const teacherId = AssignmentApi.getTeacherIdFromToken();
    if (!teacherId) {
        showToast('Teacher ID not found. Please login again.', 'error');
        return null;
    }
    
    const formatDateTime = (dateTimeString) => {
        if (!dateTimeString) return null;
        return dateTimeString;
    };
    
    // 🔴 FIXED: Removed classId, using className and section instead
    const data = {
        title: document.getElementById('assignmentTitle').value,
        subject: selectedSubject,
        className: selectedClass,        // ✅ Use className instead of classId
        section: selectedSection,        // ✅ Section is already here
        description: document.getElementById('description').value,
        gradingType: selectedGradingType,
        totalMarks: parseInt(document.getElementById('totalMarks').value) || 0,
        startDate: formatDateTime(document.getElementById('startDate').value),
        dueDate: formatDateTime(document.getElementById('dueDate').value),
        allowLateSubmission: document.getElementById('allowLateSubmission').checked,
        allowResubmission: document.getElementById('allowResubmission').checked,
        priority: selectedPriority,
        assignTo: selectedAssignTo,
        externalLink: document.getElementById('externalLink').value,
        notifyStudents: document.getElementById('notifyStudents').checked,
        notifyParents: document.getElementById('notifyParents').checked,
        sendReminders: document.getElementById('sendReminders').checked,
        sendLateWarnings: document.getElementById('sendLateWarnings').checked,
        createdByTeacherId: teacherId,
        publishNow: publishOption === 'publish_now',
        academicYear: document.getElementById('academicYear')?.value || new Date().getFullYear() + '-' + (new Date().getFullYear() + 1),
        term: document.getElementById('term')?.value || 'First Term'
    };
    
    // Handle multiple classes
    if (selectedAssignTo === 'MULTIPLE_CLASSES') {
        const selectedClasses = [];
        document.querySelectorAll('#multipleClassesSection input[type="checkbox"]:checked').forEach(cb => {
            selectedClasses.push(cb.value);
        });
        data.assignedClasses = selectedClasses;
    }
    
    // Handle individual students
    if (selectedAssignTo === 'INDIVIDUAL_STUDENTS') {
        const selectedStudentIds = [];
        document.querySelectorAll('#studentsCheckboxGrid input[type="checkbox"]:checked').forEach(cb => {
            selectedStudentIds.push(parseInt(cb.value));
        });
        data.assignedStudents = selectedStudentIds;
    }
    
    // Handle publish options
    if (publishOption === 'schedule_publish') {
        data.scheduledPublishDate = formatDateTime(document.getElementById('scheduledPublishDate').value);
        data.publishStatus = 'SCHEDULED';
    } else if (publishOption === 'save_draft') {
        data.publishStatus = 'DRAFT';
    } else {
        data.publishStatus = 'PUBLISHED';
        data.publishedDate = new Date().toISOString();
    }
    
    console.log('🚀 Final assignment data:', data);
    return data;
}

async function handleAssignmentSubmit(e) {
    e.preventDefault();

    const assignmentId = document.getElementById('assignmentId').value;
    const assignmentData = buildAssignmentDataFromForm();
    if (!assignmentData) return;

    const fileInput = document.getElementById('attachments');
    const files = fileInput.files ? Array.from(fileInput.files) : [];

    showLoading();
    try {
        let result;
        if (assignmentId) {
            result = await AssignmentApi.updateAssignment(parseInt(assignmentId), assignmentData, files);
            showToast('Assignment updated successfully!', 'success');
        } else {
            result = await AssignmentApi.createAssignment(assignmentData, files);
            showToast('Assignment created successfully!', 'success');
        }

        closeModal();

        if (currentTab === 'drafts') {
            await loadDrafts();
        } else if (currentTab === 'scheduled') {
            await loadScheduled();
        } else {
            await fetchAssignments(0);
        }

        await updateStatistics();

    } catch (error) {
        console.error('Error saving assignment:', error);
        showToast('Error saving assignment: ' + error.message, 'error');
    } finally {
        hideLoading();
    }
}

async function deleteAssignment(id) {
    showConfirmDialog('Delete Assignment', 'Are you sure you want to delete this assignment?', async () => {
        showLoading();
        try {
            await AssignmentApi.deleteAssignment(id);
            showToast('Assignment deleted successfully!', 'success');

            if (currentTab === 'drafts') {
                await loadDrafts();
            } else if (currentTab === 'scheduled') {
                await loadScheduled();
            } else {
                await fetchAssignments(currentPage - 1);
            }

            await updateStatistics();

        } catch (error) {
            console.error('Error deleting assignment:', error);
            showToast('Error deleting assignment: ' + error.message, 'error');
        } finally {
            hideLoading();
        }
    });
}

async function updateAssignmentStatus(id, newStatus) {
    showLoading();
    try {
        await AssignmentApi.updateAssignmentStatus(id, newStatus);
        showToast(`Assignment marked as ${newStatus}!`, 'success');
        await fetchAssignments(currentPage - 1);
        await updateStatistics();
    } catch (error) {
        console.error('Error updating status:', error);
        showToast('Error updating status: ' + error.message, 'error');
    } finally {
        hideLoading();
    }
}

async function publishDraft(id) {
    showLoading();
    try {
        await AssignmentApi.publishAssignment(id);
        showToast('Draft published successfully!', 'success');
        await loadDrafts();
        await fetchAssignments(0);
        await updateStatistics();
    } catch (error) {
        console.error('Error publishing draft:', error);
        showToast('Error publishing draft: ' + error.message, 'error');
    } finally {
        hideLoading();
    }
}

async function handleGradeSubmit(e) {
    e.preventDefault();

    const assignmentId = document.getElementById('gradeAssignmentId').value;
    const studentId = document.getElementById('gradeStudentId').value;
    const gradingMethod = document.querySelector('input[name="gradingMethod"]:checked')?.value || 'marks';

    const gradeData = {
        assignmentId: parseInt(assignmentId),
        studentId: parseInt(studentId),
        gradingMethod: gradingMethod,
        obtainedMarks: parseFloat(document.getElementById('obtainedMarks').value),
        grade: document.getElementById('gradeLetter').value,
        teacherFeedback: document.getElementById('teacherFeedback').value,
        publishToStudent: document.getElementById('publishMarks').checked
    };

    showLoading();
    try {
        await AssignmentApi.gradeSubmission(gradeData);
        showToast('Grade saved successfully!', 'success');
        closeGradeModal();

        if (submissionsModalCurrentAssignment) {
            await openSubmissionsModal(submissionsModalCurrentAssignment);
        }

    } catch (error) {
        console.error('Error saving grade:', error);
        showToast('Error saving grade: ' + error.message, 'error');
    } finally {
        hideLoading();
    }
}

// ============================================================================
// SELECTION FUNCTIONS
// ============================================================================

function toggleAssignmentSelection(id, checked) {
    if (checked) {
        selectedAssignments.add(id);
    } else {
        selectedAssignments.delete(id);
    }

    document.querySelectorAll('.assignment-card').forEach(card => {
        const checkbox = card.querySelector('.assignment-checkbox');
        if (checkbox && checkbox.value == id) {
            if (checked) {
                card.classList.add('selected-row');
            } else {
                card.classList.remove('selected-row');
            }
        }
    });

    const bulkBtn = document.getElementById('bulkActionsBtn');
    if (bulkBtn) {
        bulkBtn.innerHTML = selectedAssignments.size > 0
            ? `<i class="fas fa-cogs"></i> Bulk Actions (${selectedAssignments.size})`
            : `<i class="fas fa-cogs"></i> Bulk Actions`;
    }
}

function clearSelectedAssignments() {
    selectedAssignments.clear();
    document.getElementById('selectedCount').textContent = '0';
    renderAssignmentsList(filteredAssignments);
    showToast('Selection cleared', 'info');
}

// ============================================================================
// TAB FUNCTIONS
// ============================================================================

async function handleTabChange(e) {
    const tab = e.target.dataset.tab;

    document.querySelectorAll('.tab-button').forEach(btn => {
        btn.classList.remove('active');
    });
    e.target.classList.add('active');

    currentTab = tab;
    currentPage = 1;

    document.querySelectorAll('.view-section').forEach(section => {
        section.classList.add('hidden');
    });

    if (tab === 'drafts') {
        document.getElementById('draftsView').classList.remove('hidden');
        await loadDrafts();
    } else if (tab === 'scheduled') {
        document.getElementById('scheduledView').classList.remove('hidden');
        await loadScheduled();
    } else {
        document.getElementById('assignmentsView').classList.remove('hidden');
        await fetchAssignments(0);
    }

    const titles = {
        'active': 'Active Assignments',
        'pending': 'Pending Submissions',
        'grading': 'Needs Grading',
        'completed': 'Completed Assignments'
    };
    if (titles[tab]) {
        const titleEl = document.getElementById('assignmentsListTitle');
        if (titleEl) titleEl.textContent = titles[tab];
    }
}

// ============================================================================
// PAGINATION FUNCTIONS
// ============================================================================

function updatePagination(totalItems, totalPages, currentPageNum) {
    const pagination = document.getElementById('pagination');
    if (!pagination) return;

    if (totalItems === 0 || totalPages <= 1) {
        pagination.classList.add('hidden');
        return;
    }

    pagination.classList.remove('hidden');

    const startIndex = (currentPageNum * itemsPerPage) + 1;
    const endIndex = Math.min((currentPageNum + 1) * itemsPerPage, totalItems);

    document.getElementById('startIndex').textContent = startIndex;
    document.getElementById('endIndex').textContent = endIndex;
    document.getElementById('totalItems').textContent = totalItems;

    const prevBtn = document.getElementById('prevPage');
    const nextBtn = document.getElementById('nextPage');
    
    if (prevBtn) {
        prevBtn.disabled = currentPageNum === 0;
        prevBtn.classList.toggle('opacity-50', currentPageNum === 0);
        prevBtn.classList.toggle('cursor-not-allowed', currentPageNum === 0);
    }
    
    if (nextBtn) {
        nextBtn.disabled = currentPageNum >= totalPages - 1;
        nextBtn.classList.toggle('opacity-50', currentPageNum >= totalPages - 1);
        nextBtn.classList.toggle('cursor-not-allowed', currentPageNum >= totalPages - 1);
    }

    const pageNumbers = document.getElementById('pageNumbers');
    if (!pageNumbers) return;

    pageNumbers.innerHTML = '';

    const maxVisible = 5;
    let startPage = Math.max(0, currentPageNum - Math.floor(maxVisible / 2));
    let endPage = Math.min(totalPages - 1, startPage + maxVisible - 1);

    for (let i = startPage; i <= endPage; i++) {
        const btn = document.createElement('button');
        btn.className = `px-3 py-1 border rounded ${i === currentPageNum ? 'bg-blue-600 text-white' : 'hover:bg-gray-50'}`;
        btn.textContent = i + 1;
        btn.addEventListener('click', () => {
            currentPage = i + 1;
            fetchAssignments(i);
        });
        pageNumbers.appendChild(btn);
    }
}

function goToPrevPage() {
    if (currentPage > 1) {
        currentPage--;
        fetchAssignments(currentPage - 1);
    }
}

function goToNextPage() {
    currentPage++;
    fetchAssignments(currentPage - 1);
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function getPriorityColorClass(priority, isBg = false) {
    switch (priority?.toUpperCase()) {
        case 'HIGH': return isBg ? 'bg-red-50' : 'text-red-500';
        case 'MEDIUM': return isBg ? 'bg-yellow-50' : 'text-yellow-500';
        case 'LOW': return isBg ? 'bg-green-50' : 'text-green-500';
        default: return isBg ? 'bg-gray-50' : 'text-gray-500';
    }
}

function getSubjectIcon(subject) {
    switch (subject?.toLowerCase()) {
        case 'mathematics': return 'fa-calculator';
        case 'science': return 'fa-flask';
        case 'english': return 'fa-book-open';
        case 'hindi': return 'fa-language';
        case 'social studies': return 'fa-globe-asia';
        case 'computer science': return 'fa-laptop-code';
        default: return 'fa-book';
    }
}

function handleAssignToChange(e) {
    const val = e.target.value;
    document.getElementById('multipleClassesSection').classList.toggle('hidden', val !== 'MULTIPLE_CLASSES');
    document.getElementById('individualStudentsSection').classList.toggle('hidden', val !== 'INDIVIDUAL_STUDENTS');

    if (val === 'INDIVIDUAL_STUDENTS') {
        const selectedClass = document.getElementById('class').value;
        const selectedSection = document.getElementById('section').value;
        if (selectedClass && selectedSection) {
            loadStudentsForClass(selectedClass, selectedSection);
        } else {
            showToast('Please select class and section first', 'warning');
        }
    }
}

function toggleGradingMethod() {
    const method = document.querySelector('input[name="gradingMethod"]:checked')?.value;
    const marksSection = document.getElementById('marksSection');
    const gradeSection = document.getElementById('gradeSection');
    const marksRequired = document.getElementById('marksRequired');
    const gradeRequired = document.getElementById('gradeRequired');

    if (method === 'marks') {
        marksSection.style.display = 'block';
        gradeSection.style.display = 'none';
        marksRequired?.classList.remove('hidden');
        gradeRequired?.classList.add('hidden');
    } else if (method === 'grade') {
        marksSection.style.display = 'none';
        gradeSection.style.display = 'block';
        marksRequired?.classList.add('hidden');
        gradeRequired?.classList.remove('hidden');
    } else {
        marksSection.style.display = 'block';
        gradeSection.style.display = 'block';
        marksRequired?.classList.remove('hidden');
        gradeRequired?.classList.remove('hidden');
    }
}

function setupPublishOptions() {
    const radios = document.querySelectorAll('input[name="publishOption"]');
    const schedulePicker = document.getElementById('schedulePicker');
    const draftInfo = document.getElementById('draftInfo');
    const saveText = document.getElementById('saveButtonText');

    radios.forEach(radio => {
        radio.addEventListener('change', function () {
            if (this.value === 'schedule_publish') {
                schedulePicker.classList.remove('hidden');
                draftInfo.classList.add('hidden');
                saveText.textContent = 'Schedule Publish';
            } else if (this.value === 'save_draft') {
                schedulePicker.classList.add('hidden');
                draftInfo.classList.remove('hidden');
                saveText.textContent = 'Save Draft';
            } else {
                schedulePicker.classList.add('hidden');
                draftInfo.classList.add('hidden');
                saveText.textContent = 'Publish Now';
            }
        });
    });
}

// ============================================================================
// REPORTS FUNCTIONS
// ============================================================================

async function loadReportsData() {
    try {
        const stats = await AssignmentApi.getAssignmentStatistics();
        if (stats) {
            document.getElementById('submissionRate').textContent = stats.submissionRate || '0%';
            document.getElementById('averageScore').textContent = stats.averageScore || '0';
            document.getElementById('lateSubmissions').textContent = stats.lateSubmissions || '0';
            document.getElementById('gradingProgress').textContent = stats.gradingProgress || '0%';
        }
    } catch (error) {
        console.error('Error loading reports data:', error);
    }
}

async function loadStudentsForClass(className, section) {
    try {
        const response = await fetch(`${STUDENT_API_BASE_URL}/get-by-class?className=${className}&section=${section}`, {
            headers: AssignmentApi.getHeaders()
        });

        if (response.ok) {
            const students = await response.json();
            populateStudentsCheckbox(students);
        }
    } catch (error) {
        console.error('Error loading students:', error);
    }
}

function populateStudentsCheckbox(students) {
    const studentGrid = document.getElementById('studentsCheckboxGrid');
    if (!studentGrid) return;

    studentGrid.innerHTML = '';
    students.forEach(student => {
        studentGrid.innerHTML += `
            <label class="flex items-center">
                <input type="checkbox" value="${student.id}" class="mr-2 student-checkbox">
                <span class="text-sm">${student.name} (${student.rollNumber})</span>
            </label>
        `;
    });
}

// ============================================================================
// BULK ACTION FUNCTIONS
// ============================================================================

async function executeBulkAction() {
    const action = document.querySelector('input[name="bulkAction"]:checked')?.value;
    if (!action) {
        showToast('Please select an action', 'warning');
        return;
    }

    const assignmentIds = Array.from(selectedAssignments);

    showLoading();
    try {
        if (action === 'change_status') {
            const newStatus = document.querySelector('input[name="newStatus"]:checked')?.value;
            if (!newStatus) {
                showToast('Please select a status', 'warning');
                return;
            }
            await AssignmentApi.bulkUpdateStatus(assignmentIds, newStatus);
            showToast('Status updated successfully!', 'success');

        } else if (action === 'delete_assignments') {
            const confirmDelete = document.getElementById('confirmDelete')?.checked;
            if (!confirmDelete) {
                showToast('Please confirm deletion', 'warning');
                return;
            }
            await AssignmentApi.bulkDelete(assignmentIds);
            showToast('Assignments deleted successfully!', 'success');

        } else if (action === 'send_reminders') {
            const reminderType = document.querySelector('input[name="reminderType"]:checked')?.value || 'due_date';
            const customMessage = document.getElementById('customReminderMessage')?.value;
            await AssignmentApi.sendBulkReminders(assignmentIds, reminderType.toUpperCase(), customMessage);
            showToast('Reminders sent successfully!', 'success');
        }

        closeBulkActionsModal();
        clearSelectedAssignments();

        if (currentTab === 'drafts') {
            await loadDrafts();
        } else if (currentTab === 'scheduled') {
            await loadScheduled();
        } else {
            await fetchAssignments(currentPage - 1);
        }

    } catch (error) {
        console.error('Error executing bulk action:', error);
        showToast('Error executing bulk action: ' + error.message, 'error');
    } finally {
        hideLoading();
    }
}

function handleBulkActionChange(e) {
    const action = e.target.value;
    document.getElementById('statusChangeSettings').classList.add('hidden');
    document.getElementById('reminderSettings').classList.add('hidden');
    document.getElementById('exportSettings').classList.add('hidden');
    document.getElementById('deleteSettings').classList.add('hidden');
    document.getElementById('bulkActionSettings').classList.remove('hidden');

    if (action === 'change_status') {
        document.getElementById('statusChangeSettings').classList.remove('hidden');
    } else if (action === 'send_reminders') {
        document.getElementById('reminderSettings').classList.remove('hidden');
    } else if (action === 'export_data') {
        document.getElementById('exportSettings').classList.remove('hidden');
    } else if (action === 'delete_assignments') {
        document.getElementById('deleteSettings').classList.remove('hidden');
    }
    updateActionSummary();
}

function updateActionSummary() {
    const action = document.querySelector('input[name="bulkAction"]:checked')?.value;
    if (!action) return;

    const count = selectedAssignments.size;
    let summary = '';

    if (action === 'change_status') {
        const status = document.querySelector('input[name="newStatus"]:checked')?.value;
        if (status) summary = `Change status of ${count} assignment${count > 1 ? 's' : ''} to ${status}`;
    } else if (action === 'send_reminders') {
        summary = `Send reminders for ${count} assignment${count > 1 ? 's' : ''}`;
    } else if (action === 'export_data') {
        const format = document.querySelector('input[name="exportFormat"]:checked')?.value;
        if (format) summary = `Export ${count} assignment${count > 1 ? 's' : ''} as ${format.toUpperCase()}`;
    } else if (action === 'delete_assignments') {
        summary = `Permanently delete ${count} assignment${count > 1 ? 's' : ''}`;
    }

    if (summary) {
        document.getElementById('summaryText').textContent = summary;
        document.getElementById('actionSummary').classList.remove('hidden');
    }
}

// ============================================================================
// EXPORT FUNCTIONS
// ============================================================================

function exportToExcel() {
    showToast('Exporting to Excel...', 'info');
    setTimeout(() => showToast('Excel export completed!', 'success'), 1500);
}

function exportToPDF() {
    showToast('Exporting to PDF...', 'info');
    setTimeout(() => showToast('PDF export completed!', 'success'), 1500);
}

function exportSubmissions() {
    showToast('Exporting submissions...', 'info');
    setTimeout(() => showToast('Submissions exported!', 'success'), 1500);
}

function sendReminders() {
    showToast('Sending reminders...', 'info');
    setTimeout(() => showToast('Reminders sent!', 'success'), 1500);
}

function downloadAllSubmissions() {
    showToast('Downloading submissions...', 'info');
    setTimeout(() => showToast('Download completed!', 'success'), 1500);
}

function openBulkGradeModal() {
    showToast('Bulk grading feature coming soon', 'info');
}

// ============================================================================
// SIDEBAR FUNCTIONS
// ============================================================================

function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    const main = document.getElementById('mainContent');
    sidebarCollapsed = !sidebarCollapsed;

    if (sidebarCollapsed) {
        sidebar.classList.add('collapsed');
        main.classList.add('sidebar-collapsed');
        document.getElementById('sidebarToggleIcon').className = 'fas fa-bars text-xl';
    } else {
        sidebar.classList.remove('collapsed');
        main.classList.remove('sidebar-collapsed');
        document.getElementById('sidebarToggleIcon').className = 'fas fa-times text-xl';
    }
}

function toggleNotifications() {
    document.getElementById('notificationsDropdown')?.classList.toggle('hidden');
}

function toggleUserMenu() {
    document.getElementById('userMenuDropdown')?.classList.toggle('hidden');
}

function handleLogout() {
    showLogoutConfirmation();
}

function showLogoutConfirmation() {
    let modal = document.getElementById('logoutConfirmModal');

    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'logoutConfirmModal';
        modal.className = 'modal';
        modal.innerHTML = `
            <div class="modal-content max-w-md">
                <div class="p-6">
                    <div class="flex items-center justify-center w-12 h-12 mx-auto bg-red-100 rounded-full mb-4">
                        <i class="fas fa-sign-out-alt text-red-600 text-xl"></i>
                    </div>
                    <h3 class="text-lg font-semibold text-center text-gray-800 mb-2">Logout Confirmation</h3>
                    <p class="text-gray-600 text-center mb-6">Are you sure you want to logout?</p>
                    <div class="flex justify-center space-x-3">
                        <button id="logoutCancelBtn" class="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50">Cancel</button>
                        <button id="logoutConfirmBtn" class="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700">Logout</button>
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(modal);

        document.getElementById('logoutCancelBtn').addEventListener('click', hideLogoutConfirmation);
        document.getElementById('logoutConfirmBtn').addEventListener('click', confirmLogout);

        modal.addEventListener('click', function (e) {
            if (e.target === modal) {
                hideLogoutConfirmation();
            }
        });
    }

    modal.classList.add('active');
}

function hideLogoutConfirmation() {
    const modal = document.getElementById('logoutConfirmModal');
    if (modal) {
        modal.classList.remove('active');
    }
}

function confirmLogout() {
    localStorage.removeItem(AUTH_TOKEN_KEY);
    localStorage.removeItem('admin_mobile');
    localStorage.removeItem('user_role');
    sessionStorage.clear();

    showToast('Logout successful! Redirecting...', 'success');

    hideLogoutConfirmation();

    setTimeout(() => {
        window.location.href = '/login.html';
    }, 1000);
}

// ============================================================================
// INITIALIZATION
// ============================================================================

document.addEventListener('DOMContentLoaded', async function () {
    console.log('Initializing Assignment Management...');

    // Load all data
    await fetchClassesFromDatabase();
    populateGradingTypes();
    populatePriorityOptions();
    populateAssignToOptions();
    await populateFilterSubjects();
    await populateFilterClasses();

    // Set up event listeners
    document.getElementById('sidebarToggle')?.addEventListener('click', toggleSidebar);
    document.getElementById('notificationsBtn')?.addEventListener('click', toggleNotifications);
    document.getElementById('userMenuBtn')?.addEventListener('click', toggleUserMenu);
    
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.replaceWith(logoutBtn.cloneNode(true));
        document.getElementById('logoutBtn').addEventListener('click', function (e) {
            e.preventDefault();
            handleLogout();
        });
    }

    document.getElementById('addAssignmentBtn')?.addEventListener('click', openAddModal);
    document.getElementById('viewReportsBtn')?.addEventListener('click', openReportsModal);
    document.getElementById('bulkActionsBtn')?.addEventListener('click', openBulkActionsModal);
    document.getElementById('refreshAssignments')?.addEventListener('click', () => {
        if (currentTab === 'drafts') {
            loadDrafts();
        } else if (currentTab === 'scheduled') {
            loadScheduled();
        } else {
            fetchAssignments(currentPage - 1);
        }
    });

    document.getElementById('closeModal')?.addEventListener('click', closeModal);
    document.getElementById('cancelModal')?.addEventListener('click', closeModal);
    document.getElementById('closeSubmissionsModal')?.addEventListener('click', closeSubmissionsModal);
    document.getElementById('closeGradeModal')?.addEventListener('click', closeGradeModal);
    document.getElementById('closeReportsModal')?.addEventListener('click', closeReportsModal);
    document.getElementById('closeBulkModal')?.addEventListener('click', closeBulkActionsModal);
    document.getElementById('cancelBulkModal')?.addEventListener('click', closeBulkActionsModal);
    document.getElementById('cancelGradeModal')?.addEventListener('click', closeGradeModal);

    document.getElementById('assignmentForm')?.addEventListener('submit', handleAssignmentSubmit);
    document.getElementById('gradeForm')?.addEventListener('submit', handleGradeSubmit);

    document.querySelectorAll('input[name="assignTo"]').forEach(radio => {
        radio.addEventListener('change', handleAssignToChange);
    });

    document.getElementById('searchAssignments')?.addEventListener('input', function() {
        clearTimeout(window.searchTimer);
        window.searchTimer = setTimeout(() => {
            applyFilters();
        }, 500);
    });
    
    document.getElementById('filterSubject')?.addEventListener('change', applyFilters);
    document.getElementById('filterClass')?.addEventListener('change', applyFilters);
    document.getElementById('filterStatus')?.addEventListener('change', applyFilters);
    document.getElementById('clearFiltersBtn')?.addEventListener('click', clearFilters);

    document.querySelectorAll('.tab-button').forEach(btn => {
        btn.addEventListener('click', handleTabChange);
    });

    document.getElementById('prevPage')?.addEventListener('click', goToPrevPage);
    document.getElementById('nextPage')?.addEventListener('click', goToNextPage);

    document.getElementById('exportExcel')?.addEventListener('click', exportToExcel);
    document.getElementById('exportPDF')?.addEventListener('click', exportToPDF);
    document.getElementById('exportSubmissions')?.addEventListener('click', exportSubmissions);

    document.getElementById('sendReminderBtn')?.addEventListener('click', sendReminders);
    document.getElementById('downloadAllBtn')?.addEventListener('click', downloadAllSubmissions);
    document.getElementById('bulkGradeBtn')?.addEventListener('click', openBulkGradeModal);

    document.getElementById('clearSelection')?.addEventListener('click', clearSelectedAssignments);
    document.querySelectorAll('input[name="bulkAction"]').forEach(radio => {
        radio.addEventListener('change', handleBulkActionChange);
    });
    document.getElementById('executeBulkAction')?.addEventListener('click', executeBulkAction);

    // Modal click handlers
    document.querySelectorAll('.modal').forEach(modal => {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                if (modal.id === 'assignmentModal') closeModal();
                if (modal.id === 'submissionsModal') closeSubmissionsModal();
                if (modal.id === 'gradeModal') closeGradeModal();
                if (modal.id === 'reportsModal') closeReportsModal();
                if (modal.id === 'bulkActionsModal') closeBulkActionsModal();
                if (modal.id === 'confirmModal') document.getElementById('confirmCancel')?.click();
            }
        });
    });

    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            document.querySelectorAll('.modal.active').forEach(m => m.classList.remove('active'));
        }
        if (e.ctrlKey && e.key === 'n') {
            e.preventDefault();
            openAddModal();
        }
        if (e.key === '?') {
            showKeyboardShortcuts();
        }
    });

    const classSelect = document.getElementById('class');
    if (classSelect) {
        classSelect.addEventListener('change', onClassChange);
    }

    setupPublishOptions();

    // Initial data load
    fetchAssignments(0);
    updateStatistics();

    // Test backend connection
    fetch(`${API_BASE_URL}/get-assignment-statistics`, {
        headers: AssignmentApi.getHeaders()
    })
        .then(response => {
            if (response.ok) {
                showToast('Connected to backend successfully!', 'success');
            } else {
                showToast('Backend connection failed!', 'error');
            }
        })
        .catch(error => {
            console.error('Backend connection error:', error);
            showToast('Cannot connect to backend. Please check if server is running.', 'error');
        });
});

// Make functions globally available
window.openAddModal = openAddModal;
window.openEditModal = openEditModal;
window.openSubmissionsModal = openSubmissionsModal;
window.openGradeModal = openGradeModal;
window.closeModal = closeModal;
window.closeSubmissionsModal = closeSubmissionsModal;
window.closeGradeModal = closeGradeModal;
window.deleteAssignment = deleteAssignment;
window.updateAssignmentStatus = updateAssignmentStatus;
window.publishDraft = publishDraft;
window.toggleAssignmentSelection = toggleAssignmentSelection;
window.clearSelectedAssignments = clearSelectedAssignments;
window.showKeyboardShortcuts = showKeyboardShortcuts;
window.closeShortcutsModal = closeShortcutsModal;
window.toggleGradingMethod = toggleGradingMethod;