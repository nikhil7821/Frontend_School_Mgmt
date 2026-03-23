// ==================== API CONFIGURATION ====================
const API_BASE_URL = 'http://localhost:8084/api';
let authToken = localStorage.getItem('admin_jwt_token');

// ==================== TOAST NOTIFICATION SYSTEM ====================
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
        toast.innerHTML = `<i class="fas ${icon} text-xl"></i><span>${message}</span>`;
        
        let container = document.getElementById('toastContainer');
        if (!container) {
            container = document.createElement('div');
            container.id = 'toastContainer';
            document.body.appendChild(container);
        }
        
        container.appendChild(toast);
        
        setTimeout(() => toast.classList.add('show'), 10);
        
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 300);
        }, duration);
    }
}

// ==================== LOADING FUNCTIONS ====================
function showLoading(show) {
    const overlay = document.getElementById('loadingOverlay');
    if (overlay) {
        if (show) {
            overlay.classList.remove('hidden');
        } else {
            overlay.classList.add('hidden');
        }
    }
}

// ==================== API HELPER FUNCTIONS ====================
async function apiCall(url, method = 'GET', data = null) {
    const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
    };

    const options = {
        method,
        headers,
    };

    if (data && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
        options.body = JSON.stringify(data);
    }

    console.log(`🔵 [API] ${method} ${url}`);
    if (data) console.log('📦 Request data:', data);

    try {
        const response = await fetch(`${API_BASE_URL}${url}`, options);
        console.log(`📡 Response status: ${response.status}`);
        
        const responseText = await response.text();
        let result;
        try {
            result = JSON.parse(responseText);
        } catch (e) {
            result = { message: responseText };
        }
        
        if (!response.ok) {
            console.error('❌ API error:', result.message || `Status ${response.status}`);
            throw new Error(result.message || `API call failed with status ${response.status}`);
        }
        
        return result;
    } catch (error) {
        console.error('❌ API Error:', error);
        Toast.show(error.message || 'API call failed', 'error');
        throw error;
    }
}

// ==================== DATA STORES ====================
let classes = [];
let teachers = [];
let currentEditingClassId = null;

// Predefined subjects for dropdown (hardcoded since no subjects endpoint)
const SUBJECTS = [
    'Mathematics', 'Science', 'English', 'Hindi', 
    'Social Studies', 'Computer Science', 'Art', 
    'Physical Education', 'Music', 'Drawing'
];

// ==================== INITIALIZATION ====================
async function initializeData() {
    console.log('🚀 Initializing Class Management...');
    showLoading(true);
    
    try {
        // Set current date
        const currentDate = new Date();
        const dateElement = document.getElementById('currentDate');
        if (dateElement) {
            dateElement.textContent = currentDate.toLocaleDateString('en-IN', {
                day: 'numeric',
                month: 'short',
                year: 'numeric'
            });
        }
        
        // Set admin name
        const adminMobile = localStorage.getItem('admin_mobile');
        if (adminMobile) {
            const adminNameEl = document.getElementById('admin-name');
            const dropdownAdminNameEl = document.getElementById('dropdown-admin-name');
            if (adminNameEl) adminNameEl.textContent = adminMobile;
            if (dropdownAdminNameEl) dropdownAdminNameEl.textContent = adminMobile;
        }
        
        // Fetch data
        await fetchClasses();
        await fetchTeachers();
        
        // Populate dropdowns
        populateClassFilter();
        populateTeacherFilter();
        populateSubjectDropdowns();
        
        // Render initial view
        renderClassesTable();
        updateStatistics();
        
        // Setup event listeners
        attachEventListeners();
        
        console.log('✅ Initialization complete');
    } catch (error) {
        console.error('❌ Initialization error:', error);
        Toast.show('Failed to load data', 'error');
    } finally {
        showLoading(false);
    }
}

// ==================== FETCH DATA FROM BACKEND ====================
async function fetchClasses() {
    console.log('📚 Fetching classes from /api/classes/get-all-classes');
    try {
        const response = await apiCall('/classes/get-all-classes');
        if (Array.isArray(response)) {
            classes = response;
            console.log(`✅ Loaded ${classes.length} classes`);
        } else if (response && response.data && Array.isArray(response.data)) {
            classes = response.data;
            console.log(`✅ Loaded ${classes.length} classes from wrapped response`);
        } else {
            classes = [];
            console.warn('⚠️ Classes response not an array:', response);
        }
        return classes;
    } catch (error) {
        console.error('❌ Error fetching classes:', error);
        classes = [];
        return [];
    }
}

async function fetchTeachers() {
    console.log('👨‍🏫 Fetching teachers from /api/teachers/get-all-teachers');
    try {
        const response = await apiCall('/teachers/get-all-teachers');
        if (Array.isArray(response)) {
            teachers = response;
            console.log(`✅ Loaded ${teachers.length} teachers`);
        } else if (response && response.data && Array.isArray(response.data)) {
            teachers = response.data;
            console.log(`✅ Loaded ${teachers.length} teachers from wrapped response`);
        } else {
            teachers = [];
            console.warn('⚠️ Teachers response not an array:', response);
        }
        return teachers;
    } catch (error) {
        console.error('❌ Error fetching teachers:', error);
        teachers = [];
        return [];
    }
}

// ==================== POPULATE DROPDOWNS ====================
function populateClassFilter() {
    const classFilter = document.getElementById('filterClass');
    if (!classFilter) return;
    
    classFilter.innerHTML = '<option value="all">All Classes</option>';
    
    const uniqueClasses = [...new Map(classes.map(c => [c.className, c])).values()];
    uniqueClasses.forEach(cls => {
        const option = document.createElement('option');
        option.value = cls.className;
        option.textContent = cls.className;
        classFilter.appendChild(option);
    });
    
    console.log(`✅ Class filter populated with ${uniqueClasses.length} options`);
}

function populateTeacherFilter() {
    // Populate teacher selects in modals
    const classTeacherSelect = document.getElementById('fClassTeacher');
    const assistantTeacherSelect = document.getElementById('fAssistantTeacher');
    
    if (classTeacherSelect) {
        classTeacherSelect.innerHTML = '<option value="">Select Teacher</option>';
        teachers.forEach(teacher => {
            const teacherName = teacher.fullName || 
                               (teacher.firstName && teacher.lastName ? 
                                `${teacher.firstName} ${teacher.lastName}` : 
                                teacher.name || 'Unknown');
            const option = document.createElement('option');
            option.value = teacher.id;
            option.textContent = teacherName;
            classTeacherSelect.appendChild(option);
        });
    }
    
    if (assistantTeacherSelect) {
        assistantTeacherSelect.innerHTML = '<option value="">Select Assistant Teacher</option>';
        teachers.forEach(teacher => {
            const teacherName = teacher.fullName || 
                               (teacher.firstName && teacher.lastName ? 
                                `${teacher.firstName} ${teacher.lastName}` : 
                                teacher.name || 'Unknown');
            const option = document.createElement('option');
            option.value = teacher.id;
            option.textContent = teacherName;
            assistantTeacherSelect.appendChild(option);
        });
    }
    
    console.log(`✅ Teacher dropdowns populated with ${teachers.length} teachers`);
}

function populateSubjectDropdowns() {
    // Populate subject selects in modals
    const classTeacherSubject = document.getElementById('fClassTeacherSubject');
    const assistantTeacherSubject = document.getElementById('fAssistantTeacherSubject');
    
    const subjectOptions = SUBJECTS.map(s => `<option value="${s}">${s}</option>`).join('');
    
    if (classTeacherSubject) {
        classTeacherSubject.innerHTML = `<option value="">Select Subject</option>${subjectOptions}`;
    }
    
    if (assistantTeacherSubject) {
        assistantTeacherSubject.innerHTML = `<option value="">Select Subject</option>${subjectOptions}`;
    }
    
    console.log(`✅ Subject dropdowns populated with ${SUBJECTS.length} subjects`);
}

// ==================== RENDER CLASSES TABLE ====================
function renderClassesTable() {
    const tbody = document.getElementById('classesTableBody');
    const totalCountSpan = document.getElementById('totalCount');
    
    if (!tbody) return;
    
    // Get filter values
    const classFilter = document.getElementById('filterClass')?.value || 'all';
    const sectionFilter = document.getElementById('filterSection')?.value || 'all';
    const yearFilter = document.getElementById('filterYear')?.value || 'all';
    const searchTerm = document.getElementById('searchInput')?.value?.toLowerCase() || '';
    
    // Filter classes
    let filteredClasses = [...classes];
    
    if (classFilter !== 'all') {
        filteredClasses = filteredClasses.filter(c => c.className === classFilter);
    }
    
    if (sectionFilter !== 'all') {
        filteredClasses = filteredClasses.filter(c => c.section === sectionFilter);
    }
    
    if (yearFilter !== 'all') {
        filteredClasses = filteredClasses.filter(c => c.academicYear === yearFilter);
    }
    
    if (searchTerm) {
        filteredClasses = filteredClasses.filter(c => 
            (c.className?.toLowerCase() || '').includes(searchTerm) ||
            (c.classCode?.toLowerCase() || '').includes(searchTerm) ||
            (c.section?.toLowerCase() || '').includes(searchTerm) ||
            (c.classTeacherName?.toLowerCase() || '').includes(searchTerm)
        );
    }
    
    // Update total count
    if (totalCountSpan) {
        totalCountSpan.textContent = filteredClasses.length;
    }
    
    if (filteredClasses.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="6" class="text-center py-12 text-zinc-500">
                    <i class="fas fa-school text-4xl text-zinc-300 mb-3 block"></i>
                    <p class="text-lg">No classes found</p>
                    <p class="text-sm mt-1">Click "Create New Class" to get started</p>
                </td>
            </tr>
        `;
        return;
    }
    
    // Generate table rows
    tbody.innerHTML = filteredClasses.map(cls => {
        const className = cls.className || 'N/A';
        const section = cls.section || 'N/A';
        const maxStudents = cls.maxStudents || 0;
        const currentStudents = cls.currentStudents || 0;
        const capacityPercent = maxStudents > 0 ? (currentStudents / maxStudents) * 100 : 0;
        const capacityClass = capacityPercent >= 90 ? 'cap-high' : capacityPercent >= 70 ? 'cap-mid' : 'cap-low';
        
        // Get teacher names
        const classTeacher = teachers.find(t => t.id === cls.classTeacherId);
        const assistantTeacher = teachers.find(t => t.id === cls.assistantTeacherId);
        
        const teacherNames = [];
        if (classTeacher) teacherNames.push(classTeacher.fullName || 'Unknown');
        if (assistantTeacher) teacherNames.push(assistantTeacher.fullName || 'Unknown');
        
        // Get schedule info
        const startTime = cls.startTime || '08:30';
        const endTime = cls.endTime || '13:30';
        
        const getClassIcon = (name) => {
            const icons = {
                'PG': 'fa-baby',
                'LKG': 'fa-child',
                'UKG': 'fa-graduation-cap',
                '1st': 'fa-book-open',
                '2nd': 'fa-book'
            };
            return icons[name] || 'fa-chalkboard';
        };
        
        const getClassColor = (name) => {
            const colors = {
                'PG': 'ci-PG',
                'LKG': 'ci-LKG',
                'UKG': 'ci-UKG',
                '1st': 'ci-1st',
                '2nd': 'ci-2nd'
            };
            return colors[name] || 'ci-def';
        };
        
        return `
            <tr class="hover:bg-zinc-50 transition-colors">
                <td class="px-6 py-4">
                    <div class="flex items-center gap-3">
                        <div class="class-icon ${getClassColor(className)}">
                            <i class="fas ${getClassIcon(className)}"></i>
                        </div>
                        <div>
                            <div class="font-semibold text-zinc-800">${className} - ${section}</div>
                            <div class="text-xs text-zinc-500 font-mono">${cls.classCode || 'N/A'}</div>
                        </div>
                    </div>
                </td>
                <td class="px-6 py-4">
                    <div>
                        <div class="flex items-center justify-between text-sm">
                            <span>${currentStudents}/${maxStudents}</span>
                            <span class="text-xs text-zinc-500">${Math.round(capacityPercent)}%</span>
                        </div>
                        <div class="cap-bar mt-1">
                            <div class="cap-fill ${capacityClass}" style="width: ${capacityPercent}%"></div>
                        </div>
                    </div>
                </td>
                <td class="px-6 py-4">
                    <div class="space-y-1">
                        ${teacherNames.map(name => `
                            <div class="flex items-center gap-2 text-sm">
                                <i class="fas fa-user text-zinc-400 text-xs"></i>
                                <span class="text-zinc-600">${name}</span>
                            </div>
                        `).join('') || '<span class="text-zinc-400 text-sm">Not assigned</span>'}
                    </div>
                </td>
                <td class="px-6 py-4">
                    <div class="text-sm text-zinc-600">
                        <div>${startTime} - ${endTime}</div>
                        <div class="text-xs text-zinc-400 mt-1">
                            ${cls.workingDays ? cls.workingDays.map(d => d.substring(0, 3)).join(', ') : 'Mon-Fri'}
                        </div>
                    </div>
                </td>
                <td class="px-6 py-4">
                    <span class="badge ${cls.status === 'ACTIVE' ? 'badge-active' : 'badge-inactive'}">
                        <span class="badge-dot"></span>
                        ${cls.status === 'ACTIVE' ? 'Active' : 'Inactive'}
                    </span>
                </td>
                <td class="px-6 py-4">
                    <div class="flex items-center gap-2">
                        <button onclick="viewClass(${cls.classId || cls.id})" 
                            class="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="View Details">
                            <i class="fas fa-eye"></i>
                        </button>
                        <button onclick="editClass(${cls.classId || cls.id})" 
                            class="p-2 text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                            title="Edit Class">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button onclick="deleteClass(${cls.classId || cls.id})" 
                            class="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Delete Class">
                            <i class="fas fa-trash-alt"></i>
                        </button>
                        <button onclick="manageTimetable(${cls.classId || cls.id})" 
                            class="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                            title="Manage Timetable">
                            <i class="fas fa-calendar-alt"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}

// ==================== UPDATE STATISTICS ====================
function updateStatistics() {
    const stats = {
        PG: 0,
        LKG: 0,
        UKG: 0,
        '1st': 0,
        '2nd': 0
    };
    
    classes.forEach(cls => {
        const className = cls.className;
        if (stats.hasOwnProperty(className)) {
            stats[className] += cls.currentStudents || 0;
        }
    });
    
    const pgElement = document.getElementById('statPGCount');
    const lkgElement = document.getElementById('statLKGCount');
    const ukgElement = document.getElementById('statUKGCount');
    const firstElement = document.getElementById('stat1stCount');
    const secondElement = document.getElementById('stat2ndCount');
    
    if (pgElement) pgElement.textContent = stats.PG;
    if (lkgElement) lkgElement.textContent = stats.LKG;
    if (ukgElement) ukgElement.textContent = stats.UKG;
    if (firstElement) firstElement.textContent = stats['1st'];
    if (secondElement) secondElement.textContent = stats['2nd'];
}

// ==================== CREATE/EDIT CLASS ====================
function openCreateModal() {
    currentEditingClassId = null;
    const modalTitle = document.getElementById('classModalTitle');
    const submitBtnText = document.getElementById('submitBtnText');
    const form = document.getElementById('classForm');
    
    if (modalTitle) modalTitle.textContent = 'Create New Class';
    if (submitBtnText) submitBtnText.innerHTML = '<i class="fas fa-plus-circle"></i> Create Class';
    if (form) form.reset();
    
    // Set default values
    const academicYearSelect = document.getElementById('fAcademicYear');
    if (academicYearSelect) academicYearSelect.value = '2024-2025';
    
    const maxStudentsInput = document.getElementById('fMaxStudents');
    if (maxStudentsInput) maxStudentsInput.value = '30';
    
    const startTimeInput = document.getElementById('fStartTime');
    if (startTimeInput) startTimeInput.value = '08:30';
    
    const endTimeInput = document.getElementById('fEndTime');
    if (endTimeInput) endTimeInput.value = '13:30';
    
    // Set default working days (Monday to Friday)
    ['dMon', 'dTue', 'dWed', 'dThu', 'dFri'].forEach(day => {
        const checkbox = document.getElementById(day);
        if (checkbox) checkbox.checked = true;
    });
    
    const modal = document.getElementById('classModal');
    if (modal) modal.classList.add('active');
}

async function editClass(classId) {
    const classData = classes.find(c => (c.classId === classId || c.id === classId));
    if (!classData) {
        Toast.show('Class not found', 'error');
        return;
    }
    
    currentEditingClassId = classId;
    const modalTitle = document.getElementById('classModalTitle');
    const submitBtnText = document.getElementById('submitBtnText');
    
    if (modalTitle) modalTitle.textContent = 'Edit Class';
    if (submitBtnText) submitBtnText.innerHTML = '<i class="fas fa-save"></i> Update Class';
    
    // Populate form fields
    const classNameSelect = document.getElementById('fClassName');
    const classCodeInput = document.getElementById('fClassCode');
    const academicYearSelect = document.getElementById('fAcademicYear');
    const sectionSelect = document.getElementById('fSection');
    const maxStudentsInput = document.getElementById('fMaxStudents');
    const currentStudentsInput = document.getElementById('fCurrentStudents');
    const roomNumberInput = document.getElementById('fRoomNumber');
    const classTeacherSelect = document.getElementById('fClassTeacher');
    const assistantTeacherSelect = document.getElementById('fAssistantTeacher');
    const classTeacherSubject = document.getElementById('fClassTeacherSubject');
    const assistantTeacherSubject = document.getElementById('fAssistantTeacherSubject');
    const startTimeInput = document.getElementById('fStartTime');
    const endTimeInput = document.getElementById('fEndTime');
    const descriptionTextarea = document.getElementById('fDescription');
    
    if (classNameSelect) classNameSelect.value = classData.className || '';
    if (classCodeInput) classCodeInput.value = classData.classCode || '';
    if (academicYearSelect) academicYearSelect.value = classData.academicYear || '2024-2025';
    if (sectionSelect) sectionSelect.value = classData.section || '';
    if (maxStudentsInput) maxStudentsInput.value = classData.maxStudents || 30;
    if (currentStudentsInput) currentStudentsInput.value = classData.currentStudents || 0;
    if (roomNumberInput) roomNumberInput.value = classData.roomNumber || '';
    if (classTeacherSelect) classTeacherSelect.value = classData.classTeacherId || '';
    if (assistantTeacherSelect) assistantTeacherSelect.value = classData.assistantTeacherId || '';
    if (classTeacherSubject) classTeacherSubject.value = classData.classTeacherSubject || '';
    if (assistantTeacherSubject) assistantTeacherSubject.value = classData.assistantTeacherSubject || '';
    if (startTimeInput) startTimeInput.value = classData.startTime || '08:30';
    if (endTimeInput) endTimeInput.value = classData.endTime || '13:30';
    if (descriptionTextarea) descriptionTextarea.value = classData.description || '';
    
    // Set working days
    const workingDays = classData.workingDays || ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];
    const dayMapping = {
        'monday': 'dMon',
        'tuesday': 'dTue',
        'wednesday': 'dWed',
        'thursday': 'dThu',
        'friday': 'dFri',
        'saturday': 'dSat'
    };
    
    Object.keys(dayMapping).forEach(day => {
        const checkbox = document.getElementById(dayMapping[day]);
        if (checkbox) {
            checkbox.checked = workingDays.includes(day);
        }
    });
    
    const modal = document.getElementById('classModal');
    if (modal) modal.classList.add('active');
}

async function saveClass() {
    // Collect form data
    const formData = {
        className: document.getElementById('fClassName')?.value,
        classCode: document.getElementById('fClassCode')?.value,
        academicYear: document.getElementById('fAcademicYear')?.value,
        section: document.getElementById('fSection')?.value,
        maxStudents: parseInt(document.getElementById('fMaxStudents')?.value) || 30,
        currentStudents: parseInt(document.getElementById('fCurrentStudents')?.value) || 0,
        roomNumber: document.getElementById('fRoomNumber')?.value || '',
        classTeacherId: document.getElementById('fClassTeacher')?.value ? parseInt(document.getElementById('fClassTeacher').value) : null,
        assistantTeacherId: document.getElementById('fAssistantTeacher')?.value ? parseInt(document.getElementById('fAssistantTeacher').value) : null,
        classTeacherSubject: document.getElementById('fClassTeacherSubject')?.value || null,
        assistantTeacherSubject: document.getElementById('fAssistantTeacherSubject')?.value || null,
        startTime: document.getElementById('fStartTime')?.value || '08:30',
        endTime: document.getElementById('fEndTime')?.value || '13:30',
        description: document.getElementById('fDescription')?.value || '',
        workingDays: [],
        status: 'ACTIVE'
    };
    
    // Get working days
    const dayMapping = {
        'dMon': 'monday',
        'dTue': 'tuesday',
        'dWed': 'wednesday',
        'dThu': 'thursday',
        'dFri': 'friday',
        'dSat': 'saturday'
    };
    
    Object.keys(dayMapping).forEach(dayId => {
        const checkbox = document.getElementById(dayId);
        if (checkbox && checkbox.checked) {
            formData.workingDays.push(dayMapping[dayId]);
        }
    });
    
    // Validate required fields
    if (!formData.className || !formData.classCode || !formData.academicYear || !formData.section) {
        Toast.show('Please fill all required fields', 'error');
        return;
    }
    
    showLoading(true);
    
    try {
        let response;
        if (currentEditingClassId) {
            // Update existing class
            response = await apiCall(`/classes/update-class/${currentEditingClassId}`, 'PUT', formData);
            Toast.show('Class updated successfully', 'success');
        } else {
            // Create new class
            response = await apiCall('/classes/create-class', 'POST', formData);
            Toast.show('Class created successfully', 'success');
        }
        
        console.log('Save response:', response);
        
        // Refresh data
        await fetchClasses();
        renderClassesTable();
        updateStatistics();
        closeClassModal();
        
    } catch (error) {
        console.error('❌ Error saving class:', error);
        Toast.show(error.message || 'Failed to save class', 'error');
    } finally {
        showLoading(false);
    }
}

async function deleteClass(classId) {
    if (!confirm('Are you sure you want to delete this class? This action cannot be undone.')) {
        return;
    }
    
    showLoading(true);
    
    try {
        await apiCall(`/classes/delete-class/${classId}`, 'DELETE');
        Toast.show('Class deleted successfully', 'success');
        await fetchClasses();
        renderClassesTable();
        updateStatistics();
    } catch (error) {
        console.error('❌ Error deleting class:', error);
        Toast.show(error.message || 'Failed to delete class', 'error');
    } finally {
        showLoading(false);
    }
}

// ==================== VIEW CLASS DETAILS ====================
async function viewClass(classId) {
    showLoading(true);
    
    try {
        const classData = await apiCall(`/classes/get-class-by-id/${classId}`);
        
        const modal = document.getElementById('viewModal');
        const title = document.getElementById('viewModalTitle');
        const code = document.getElementById('viewModalCode');
        const body = document.getElementById('viewModalBody');
        
        if (title) title.textContent = `${classData.className} - ${classData.section}`;
        if (code) code.textContent = classData.classCode || 'No code';
        
        const classTeacher = teachers.find(t => t.id === classData.classTeacherId);
        const assistantTeacher = teachers.find(t => t.id === classData.assistantTeacherId);
        
        if (body) {
            body.innerHTML = `
                <div class="space-y-6">
                    <div class="grid grid-cols-2 gap-4">
                        <div class="detail-row">
                            <span class="detail-key">Class Name</span>
                            <span class="detail-val">${classData.className}</span>
                        </div>
                        <div class="detail-row">
                            <span class="detail-key">Section</span>
                            <span class="detail-val">${classData.section}</span>
                        </div>
                        <div class="detail-row">
                            <span class="detail-key">Academic Year</span>
                            <span class="detail-val">${classData.academicYear}</span>
                        </div>
                        <div class="detail-row">
                            <span class="detail-key">Room Number</span>
                            <span class="detail-val">${classData.roomNumber || 'Not assigned'}</span>
                        </div>
                        <div class="detail-row">
                            <span class="detail-key">Capacity</span>
                            <span class="detail-val">${classData.currentStudents || 0} / ${classData.maxStudents || 0}</span>
                        </div>
                        <div class="detail-row">
                            <span class="detail-key">Class Teacher</span>
                            <span class="detail-val">${classTeacher ? (classTeacher.fullName || 'Unknown') : 'Not assigned'}</span>
                        </div>
                        <div class="detail-row">
                            <span class="detail-key">Class Teacher Subject</span>
                            <span class="detail-val">${classData.classTeacherSubject || 'Not assigned'}</span>
                        </div>
                        <div class="detail-row">
                            <span class="detail-key">Assistant Teacher</span>
                            <span class="detail-val">${assistantTeacher ? (assistantTeacher.fullName || 'Unknown') : 'Not assigned'}</span>
                        </div>
                        <div class="detail-row">
                            <span class="detail-key">Assistant Teacher Subject</span>
                            <span class="detail-val">${classData.assistantTeacherSubject || 'Not assigned'}</span>
                        </div>
                        <div class="detail-row">
                            <span class="detail-key">Schedule</span>
                            <span class="detail-val">${classData.startTime || '08:30'} - ${classData.endTime || '13:30'}</span>
                        </div>
                        <div class="detail-row">
                            <span class="detail-key">Status</span>
                            <span class="detail-val">
                                <span class="badge ${classData.status === 'ACTIVE' ? 'badge-active' : 'badge-inactive'}">
                                    ${classData.status === 'ACTIVE' ? 'Active' : 'Inactive'}
                                </span>
                            </span>
                        </div>
                    </div>
                    
                    ${classData.workingDays && classData.workingDays.length > 0 ? `
                        <div>
                            <div class="detail-key mb-2">Working Days</div>
                            <div class="flex gap-2 flex-wrap">
                                ${classData.workingDays.map(day => `
                                    <span class="badge bg-zinc-100 text-zinc-700">${day.charAt(0).toUpperCase() + day.slice(1)}</span>
                                `).join('')}
                            </div>
                        </div>
                    ` : ''}
                    
                    ${classData.description ? `
                        <div>
                            <div class="detail-key mb-2">Description</div>
                            <div class="text-sm text-zinc-600">${classData.description}</div>
                        </div>
                    ` : ''}
                </div>
            `;
        }
        
        if (modal) modal.classList.add('active');
        
    } catch (error) {
        console.error('❌ Error viewing class:', error);
        Toast.show(error.message || 'Failed to load class details', 'error');
    } finally {
        showLoading(false);
    }
}

function closeViewModal() {
    const modal = document.getElementById('viewModal');
    if (modal) modal.classList.remove('active');
}

function closeClassModal() {
    const modal = document.getElementById('classModal');
    if (modal) modal.classList.remove('active');
    
    // Reset form
    const form = document.getElementById('classForm');
    if (form) form.reset();
    
    currentEditingClassId = null;
}

function manageTimetable(classId) {
    Toast.show('Timetable management coming soon', 'info');
}

// ==================== FILTER FUNCTIONS ====================
function filterChange() {
    renderClassesTable();
}

function clearFilters() {
    const classFilter = document.getElementById('filterClass');
    const sectionFilter = document.getElementById('filterSection');
    const yearFilter = document.getElementById('filterYear');
    const searchInput = document.getElementById('searchInput');
    
    if (classFilter) classFilter.value = 'all';
    if (sectionFilter) sectionFilter.value = 'all';
    if (yearFilter) yearFilter.value = '2024-2025';
    if (searchInput) searchInput.value = '';
    
    renderClassesTable();
}

// ==================== SIDEBAR & HEADER FUNCTIONS ====================
let sidebarCollapsed = false;
let isMobile = window.innerWidth < 1024;

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
    const sidebarToggleBtn = document.getElementById('sidebarToggleBtn');
    if (isMobile) {
        const sidebar = document.getElementById('sidebar');
        const overlay = document.getElementById('sidebarOverlay');
        if (sidebar?.classList.contains('mobile-open')) {
            closeMobileSidebar();
            if (sidebarToggleBtn) sidebarToggleBtn.innerHTML = '<i class="fas fa-bars"></i>';
        } else {
            openMobileSidebar();
            if (sidebarToggleBtn) sidebarToggleBtn.innerHTML = '<i class="fas fa-times"></i>';
        }
    } else {
        const sidebar = document.getElementById('sidebar');
        const mainContent = document.getElementById('mainContent');
        sidebarCollapsed = !sidebarCollapsed;
        if (sidebarCollapsed) {
            sidebar?.classList.add('collapsed');
            mainContent?.classList.add('sidebar-collapsed');
            if (sidebarToggleBtn) sidebarToggleBtn.innerHTML = '<i class="fas fa-bars"></i>';
        } else {
            sidebar?.classList.remove('collapsed');
            mainContent?.classList.remove('sidebar-collapsed');
            if (sidebarToggleBtn) sidebarToggleBtn.innerHTML = '<i class="fas fa-times"></i>';
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
    const sidebarToggleBtn = document.getElementById('sidebarToggleBtn');
    sidebar?.classList.remove('mobile-open');
    overlay?.classList.remove('active');
    document.body.classList.remove('sidebar-open');
    if (sidebarToggleBtn && window.innerWidth < 1024) {
        sidebarToggleBtn.innerHTML = '<i class="fas fa-bars"></i>';
    }
}

function toggleNotifications() {
    const notifMenu = document.getElementById('notifMenu');
    if (notifMenu) {
        notifMenu.classList.toggle('hidden');
        
        // Close user menu if open
        const userMenu = document.getElementById('userMenu');
        if (userMenu && !userMenu.classList.contains('hidden')) {
            userMenu.classList.add('hidden');
        }
    }
}

function toggleUserMenu() {
    const userMenu = document.getElementById('userMenu');
    if (userMenu) {
        userMenu.classList.toggle('hidden');
        
        // Close notifications if open
        const notifMenu = document.getElementById('notifMenu');
        if (notifMenu && !notifMenu.classList.contains('hidden')) {
            notifMenu.classList.add('hidden');
        }
    }
}

function handleLogout() {
    if (confirm('Are you sure you want to logout?')) {
        localStorage.removeItem('admin_jwt_token');
        localStorage.removeItem('admin_mobile');
        window.location.href = '../login.html';
    }
}

// Close dropdowns when clicking outside
document.addEventListener('click', function(event) {
    // Close notifications dropdown
    const notifBtn = document.getElementById('notifBtn');
    const notifMenu = document.getElementById('notifMenu');
    if (notifBtn && notifMenu && !notifBtn.contains(event.target) && !notifMenu.contains(event.target)) {
        notifMenu.classList.add('hidden');
    }
    
    // Close user menu dropdown
    const userMenuBtn = document.getElementById('userMenuBtn');
    const userMenu = document.getElementById('userMenu');
    if (userMenuBtn && userMenu && !userMenuBtn.contains(event.target) && !userMenu.contains(event.target)) {
        userMenu.classList.add('hidden');
    }
});

// ==================== ATTACH EVENT LISTENERS ====================
function attachEventListeners() {
    // Sidebar toggle
    const sidebarToggleBtn = document.getElementById('sidebarToggleBtn');
    if (sidebarToggleBtn) {
        sidebarToggleBtn.addEventListener('click', toggleSidebar);
    }
    
    // Notifications
    const notifBtn = document.getElementById('notifBtn');
    if (notifBtn) {
        notifBtn.addEventListener('click', toggleNotifications);
    }
    
    // User menu
    const userMenuBtn = document.getElementById('userMenuBtn');
    if (userMenuBtn) {
        userMenuBtn.addEventListener('click', toggleUserMenu);
    }
    
    // Logout
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', handleLogout);
    }
    
    // Sidebar overlay for mobile
    const sidebarOverlay = document.getElementById('sidebarOverlay');
    if (sidebarOverlay) {
        sidebarOverlay.addEventListener('click', closeMobileSidebar);
    }
    
    // Modal close buttons
    const closeClassModalBtn = document.getElementById('closeClassModal');
    if (closeClassModalBtn) {
        closeClassModalBtn.addEventListener('click', closeClassModal);
    }
    
    const cancelClassModal = document.getElementById('cancelClassModal');
    if (cancelClassModal) {
        cancelClassModal.addEventListener('click', closeClassModal);
    }
    
    const submitClassBtn = document.getElementById('submitClassBtn');
    if (submitClassBtn) {
        submitClassBtn.addEventListener('click', saveClass);
    }
    
    const openCreateBtn = document.getElementById('openCreateBtn');
    if (openCreateBtn) {
        openCreateBtn.addEventListener('click', openCreateModal);
    }
    
    // Search input
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('input', filterChange);
    }
    
    // Filter selects
    const filterClass = document.getElementById('filterClass');
    if (filterClass) {
        filterClass.addEventListener('change', filterChange);
    }
    
    const filterSection = document.getElementById('filterSection');
    if (filterSection) {
        filterSection.addEventListener('change', filterChange);
    }
    
    const filterYear = document.getElementById('filterYear');
    if (filterYear) {
        filterYear.addEventListener('change', filterChange);
    }
    
    // Close modals when clicking overlay
    document.querySelectorAll('.modal-overlay').forEach(overlay => {
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) {
                overlay.classList.remove('active');
            }
        });
    });
    
    // Add clear filters button if it exists (you may need to add this button to your HTML)
    const resetFiltersBtn = document.getElementById('resetFilters');
    if (resetFiltersBtn) {
        resetFiltersBtn.addEventListener('click', clearFilters);
    }
}

// ==================== INITIALIZE ====================
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 Class Management page loaded');
    setupResponsiveSidebar();
    initializeData();
});

// Expose functions to global scope
window.openCreateModal = openCreateModal;
window.editClass = editClass;
window.deleteClass = deleteClass;
window.viewClass = viewClass;
window.manageTimetable = manageTimetable;
window.closeViewModal = closeViewModal;
window.closeClassModal = closeClassModal;
window.clearFilters = clearFilters;
window.filterChange = filterChange;
window.toggleSidebar = toggleSidebar;
window.toggleNotifications = toggleNotifications;
window.toggleUserMenu = toggleUserMenu;
window.handleLogout = handleLogout;