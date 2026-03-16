// ============================================================================
// EXAM MANAGEMENT MODULE - COMPLETE (API INTEGRATED)
// Features: Full CRUD via REST API, Filters, Status Update, Timetable Modal
// Backend Base URL: configure API_BASE_URL below
// ============================================================================

// ============= CONFIGURATION =============
const API_BASE_URL = 'http://localhost:8084/api/exams';
const CLASS_API_BASE_URL = 'http://localhost:8084/api/classes';
const USER_API_BASE_URL = 'http://localhost:8084/api/users';
const NOTIFICATION_API_BASE_URL = 'http://localhost:8084/api/notifications';

// ============= GLOBAL VARIABLES =============
let currentExams = [];
let filteredExams = [];
let currentSubjects = [];
let currentPage = 'create';
let currentPageNumber = 1;
const itemsPerPage = 10;
let editingExamId = null;
let statusUpdateExamId = null;
let allClasses = [];
let currentUser = null;
let notifications = [];
let currentTimetableExam = null;  // tracks the exam currently open in the timetable modal

// ============= INITIALIZATION =============
document.addEventListener('DOMContentLoaded', function () {
    console.log('🚀 Exam Management Module Initializing...');

    initializeExamModule();
    setupSidebar();
    setupDropdowns();
    // loadUserData();
    // loadNotifications();
    loadExamsFromAPI();
    createTimetableModal();
    createStatusModal();
    createEditModal();
    loadClassesForFilters();
    // loadAcademicYears();
    // loadSections();
});

/**
 * Main initialization function
 */
function initializeExamModule() {
    console.log('📋 Setting up exam module...');

    setupTabNavigation();
    setupFormHandlers();
    setupSubjectCheckboxes();
    setupFilterHandlers();

    console.log('✅ Exam module initialized successfully');
}

// ============= LOAD USER DATA =============

// ============= LOAD NOTIFICATIONS =============

// Add this function to load sections from backend

function populateSectionDropdowns(sections) {
    console.log('Populating section dropdowns with:', sections);

    // Handle both array of strings and array of objects
    const sectionOptions = sections.map(section => {
        if (typeof section === 'string') {
            return { value: section, text: `Section ${section}` };
        } else {
            return {
                value: section.sectionCode || section.id || section,
                text: section.sectionName || `Section ${section.sectionCode}`
            };
        }
    });

    // Populate exam section dropdown
    const examSectionSelect = document.getElementById('examSection');
    if (examSectionSelect) {
        examSectionSelect.innerHTML = '<option value="">Select Section</option>';
        sectionOptions.forEach(section => {
            const option = document.createElement('option');
            option.value = section.value;
            option.textContent = section.text;
            examSectionSelect.appendChild(option);
        });
    }

    // Add this helper function for getting class name from ID (optional)
const getClassNameById = (classId) => {
    const cls = allClasses.find(c => c.classId === parseInt(classId));
    return cls ? cls.className : null;
};

    // Populate edit section dropdown
    const editSectionSelect = document.getElementById('editSection');
    if (editSectionSelect) {
        editSectionSelect.innerHTML = '';
        sectionOptions.forEach(section => {
            const option = document.createElement('option');
            option.value = section.value;
            option.textContent = section.text;
            editSectionSelect.appendChild(option);
        });
    }

    // Populate any other section dropdowns in filters
    const filterSectionSelect = document.getElementById('filterSection');
    if (filterSectionSelect) {
        filterSectionSelect.innerHTML = '<option value="">All Sections</option>';
        sectionOptions.forEach(section => {
            const option = document.createElement('option');
            option.value = section.value;
            option.textContent = section.text;
            filterSectionSelect.appendChild(option);
        });
    }
}

// ============= LOAD ACADEMIC YEARS =============
async function loadAcademicYears() {
    // Remove the API call and just use fallback
    console.log('Using default academic years');
    populateAcademicYearDropdowns(['2024-2025', '2025-2026', '2026-2027']);
}

function populateAcademicYearDropdowns(academicYears) {
    // Populate create form academic year dropdown
    const academicYearSelect = document.getElementById('academicYear');
    if (academicYearSelect) {
        academicYearSelect.innerHTML = '<option value="">Select Academic Year</option>';
        academicYears.forEach(year => {
            const option = document.createElement('option');
            option.value = year;
            option.textContent = year;
            academicYearSelect.appendChild(option);
        });
    }

    // Populate edit modal academic year dropdown - FIXED: Now populating correctly
    const editAcademicYearSelect = document.getElementById('editAcademicYear');
    if (editAcademicYearSelect) {
        editAcademicYearSelect.innerHTML = '<option value="">Select Academic Year</option>';
        academicYears.forEach(year => {
            const option = document.createElement('option');
            option.value = year;
            option.textContent = year;
            editAcademicYearSelect.appendChild(option);
        });
    }
}

// ============= LOAD CLASSES FOR CREATE FORM =============
async function loadClassesForFilters() {
    try {
        console.log('📚 Loading classes for create exam form...');
        showLoading();
        
        // Try the simple endpoint first
        const response = await fetch(`${CLASS_API_BASE_URL}/get-all-classes-simple`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            credentials: 'include'
        });

        if (!response.ok) {
            // Fallback to the regular endpoint
            console.log('Simple endpoint failed, trying regular endpoint...');
            const fallbackResponse = await fetch(`${CLASS_API_BASE_URL}/get-all-classes`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                credentials: 'include'
            });
            
            if (!fallbackResponse.ok) {
                throw new Error(`Failed to fetch classes: ${fallbackResponse.status}`);
            }
            
            var classes = await fallbackResponse.json();
        } else {
            var classes = await response.json();
        }
        
        console.log('✅ Classes loaded:', classes);
        
        // Store classes globally
        allClasses = classes;
        
        // Populate ALL dropdowns
        populateExamClassDropdown(classes);
        populateFilterClassDropdown(classes);
        populateTimetableClassDropdown(classes);
        populateSubjectClassDropdown(classes);
        
        showToast(`Loaded ${classes.length} classes successfully`, 'success');
        
    } catch (error) {
        console.error('❌ Error loading classes:', error);
        showToast('Failed to load classes: ' + error.message, 'error');
        
        // Use mock data for testing if API fails
        useMockClassData();
    } finally {
        hideLoading();
    }
}

// Add mock data function for testing
function useMockClassData() {
    console.log('📚 Using mock class data for testing...');
    
    const mockClasses = [
        { classId: 1, className: '12', section: 'B', academicYear: '2024-2025', classCode: 'CLASS-12-B-2024' }
    ];
    
    allClasses = mockClasses;
    populateExamClassDropdown(mockClasses);
    showToast('Using mock data - API connection failed', 'warning');
}

// Populate the main CREATE EXAM form class dropdown
function populateExamClassDropdown(classes) {
    const examClassSelect = document.getElementById('examClass');
    if (!examClassSelect) {
        console.error('❌ examClass dropdown not found!');
        return;
    }

    // Clear existing options
    examClassSelect.innerHTML = '<option value="">Select Class</option>';

    if (!classes || classes.length === 0) {
        console.warn('No classes to display');
        return;
    }

    console.log('📋 Populating class dropdown with:', classes);

    // Create options for each class
    classes.forEach(cls => {
        const option = document.createElement('option');
        option.value = cls.classId;
        
        // Display name based on available data
        let displayName = '';
        if (cls.className && cls.section) {
            displayName = `Class ${cls.className} - Section ${cls.section}`;
        } else if (cls.className) {
            displayName = `Class ${cls.className}`;
        } else if (cls.classCode) {
            displayName = cls.classCode;
        } else {
            displayName = `Class ID: ${cls.classId}`;
        }
        
        // Add academic year if available
        if (cls.academicYear) {
            displayName += ` (${cls.academicYear})`;
        }
        
        option.textContent = displayName;
        
        // Store section in data attribute
        if (cls.section) {
            option.setAttribute('data-section', cls.section);
        }
        
        examClassSelect.appendChild(option);
    });

    console.log('✅ Exam class dropdown populated with', examClassSelect.options.length - 1, 'classes');

    // Add change event listener
    examClassSelect.addEventListener('change', handleExamClassChange);
}

// Handle class change in create exam form
function handleExamClassChange(event) {
    const classId = event.target.value;
    console.log('🔄 Class selected:', classId);
    
    const selectedOption = event.target.options[event.target.selectedIndex];
    
    if (classId) {
        // Get section from data attribute or find in allClasses
        let section = selectedOption.getAttribute('data-section');
        
        // If section not in data attribute, find in allClasses
        if (!section) {
            const selectedClass = allClasses.find(c => c.classId == classId);
            section = selectedClass ? selectedClass.section : null;
        }
        
        console.log('📋 Section for selected class:', section);
        
        // Update section dropdown
        if (section) {
            updateExamSectionDropdown([section]);
        } else {
            // If no section found, provide default sections
            updateExamSectionDropdown(['A', 'B', 'C', 'D']);
        }
        
        // Load subjects for this class
        updateSubjectsForClass(classId);
        
        // Reset marks fields
        document.getElementById('totalMarks').value = '';
        document.getElementById('passingMarks').value = '';
    } else {
        // Clear section dropdown and subjects
        clearExamSectionDropdown();
        clearSubjectsList();
    }
}

// Update section dropdown in create exam form
function updateExamSectionDropdown(sections) {
    const sectionSelect = document.getElementById('examSection');
    if (!sectionSelect) return;

    sectionSelect.innerHTML = '<option value="">Select Section</option>';
    sectionSelect.disabled = false;
    
    if (sections && sections.length > 0) {
        // Remove duplicates and sort
        const uniqueSections = [...new Set(sections)].filter(s => s).sort();
        
        if (uniqueSections.length > 0) {
            uniqueSections.forEach(section => {
                const option = document.createElement('option');
                option.value = section;
                option.textContent = `Section ${section}`;
                sectionSelect.appendChild(option);
            });
            console.log('✅ Section dropdown updated with', uniqueSections.length, 'sections');
        } else {
            // If no valid sections, use defaults
            addDefaultSections(sectionSelect);
        }
    } else {
        // If no sections found, provide default sections
        addDefaultSections(sectionSelect);
    }
}

// Helper function to add default sections
function addDefaultSections(sectionSelect) {
    const defaultSections = ['A', 'B', 'C', 'D'];
    defaultSections.forEach(section => {
        const option = document.createElement('option');
        option.value = section;
        option.textContent = `Section ${section}`;
        sectionSelect.appendChild(option);
    });
    console.log('⚠️ Using default sections');
}

// Clear section dropdown
function clearExamSectionDropdown() {
    const sectionSelect = document.getElementById('examSection');
    if (sectionSelect) {
        sectionSelect.innerHTML = '<option value="">Select Section</option>';
        sectionSelect.disabled = false;
    }
}

// Clear subjects list
function clearSubjectsList() {
    const subjectsList = document.getElementById('subjectsList');
    if (subjectsList) {
        subjectsList.innerHTML = `
            <div class="col-span-3 text-center py-6 text-gray-400">
                <i class="fas fa-hand-point-up text-2xl mb-2 block"></i>
                Select a class to load its subjects
            </div>`;
    }
}

// Populate filter class dropdown
function populateFilterClassDropdown(classes) {
    const filterClassSelect = document.getElementById('scheduleClass');
    if (!filterClassSelect) return;

    filterClassSelect.innerHTML = '<option value="">All Classes</option>';
    
    // Get unique class names
    const uniqueClassNames = [...new Set(classes.map(c => c.className))].filter(Boolean);
    uniqueClassNames.sort().forEach(className => {
        const option = document.createElement('option');
        option.value = className;
        option.textContent = className;
        filterClassSelect.appendChild(option);
    });
}

// Populate timetable class dropdown
function populateTimetableClassDropdown(classes) {
    const timetableClassSelect = document.getElementById('timetableClass');
    if (!timetableClassSelect) return;

    timetableClassSelect.innerHTML = '<option value="">Select Class</option>';
    
    classes.forEach(cls => {
        const option = document.createElement('option');
        option.value = cls.classId;
        const className = cls.className || `Class ${cls.classId}`;
        option.textContent = `${className} - Section ${cls.section || 'A'}`;
        timetableClassSelect.appendChild(option);
    });
}

// Populate subject class dropdown
function populateSubjectClassDropdown(classes) {
    const subjectClassSelect = document.getElementById('subjectClassSelect');
    if (!subjectClassSelect) return;

    subjectClassSelect.innerHTML = '<option value="">Select Class</option>';
    
    classes.forEach(cls => {
        const option = document.createElement('option');
        option.value = cls.classId;
        const className = cls.className || `Class ${cls.classId}`;
        option.textContent = `${className} - Section ${cls.section || 'A'}`;
        subjectClassSelect.appendChild(option);
    });
}

function addExportButtons() {
    const exportHTML = `
        <div class="flex space-x-2 mb-4">
            <button onclick="exportToCSV()" class="px-4 py-2 bg-green-600 text-white rounded-lg">
                <i class="fas fa-file-csv mr-2"></i>Export CSV
            </button>
            <button onclick="exportToPDF()" class="px-4 py-2 bg-red-600 text-white rounded-lg">
                <i class="fas fa-file-pdf mr-2"></i>Export PDF
            </button>
            <button onclick="printExams()" class="px-4 py-2 bg-gray-600 text-white rounded-lg">
                <i class="fas fa-print mr-2"></i>Print
            </button>
        </div>
    `;
}

// Fix updateSectionForClass function (remove duplicate)
function updateSectionForClass(classId) {
    const sectionSelect = document.getElementById('examSection');
    if (!sectionSelect) return;

    const selectedClass = allClasses.find(cls => cls.classId == classId);
    console.log('Selected class for section:', selectedClass);

    if (selectedClass) {
        if (selectedClass.section) {
            sectionSelect.innerHTML = `<option value="${selectedClass.section}">Section ${selectedClass.section}</option>`;
            sectionSelect.disabled = true;
            console.log('Section set to:', selectedClass.section);
        } else {
            sectionSelect.disabled = false;
            const sections = [...new Set(allClasses.map(c => c.section).filter(s => s))];
            
            if (sections.length > 0) {
                sectionSelect.innerHTML = '<option value="">Select Section</option>';
                sections.sort().forEach(section => {
                    const option = document.createElement('option');
                    option.value = section;
                    option.textContent = `Section ${section}`;
                    sectionSelect.appendChild(option);
                });
            } else {
                const defaultSections = ['A', 'B', 'C', 'D'];
                sectionSelect.innerHTML = '<option value="">Select Section</option>';
                defaultSections.forEach(section => {
                    const option = document.createElement('option');
                    option.value = section;
                    option.textContent = `Section ${section}`;
                    sectionSelect.appendChild(option);
                });
            }
        }
    }
}


// ============= API SERVICE LAYER =============
const ExamAPI = {
    async getAllExams() {
        const res = await fetch(`${API_BASE_URL}/get-all-exams`, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include'
        });
        if (!res.ok) throw new Error(`Failed to fetch exams: ${res.status}`);
        return await res.json();
    },

    async getExamById(examId) {
        const res = await fetch(`${API_BASE_URL}/get-exam-by-id/${examId}`, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include'
        });
        if (!res.ok) throw new Error(`Exam not found: ${res.status}`);
        return await res.json();
    },

    async getExamsByClass(classId) {
        const res = await fetch(`${API_BASE_URL}/get-exams-by-class/${classId}`, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include'
        });
        if (!res.ok) throw new Error(`Failed to fetch exams by class: ${res.status}`);
        return await res.json();
    },

    async getExamsByStatus(status) {
        const res = await fetch(`${API_BASE_URL}/get-exams-by-status/${status}`, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include'
        });
        if (!res.ok) throw new Error(`Failed to fetch exams by status: ${res.status}`);
        return await res.json();
    },

    async getUpcomingExams() {
        const res = await fetch(`${API_BASE_URL}/get-upcoming-exams`, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include'
        });
        if (!res.ok) throw new Error(`Failed to fetch upcoming exams: ${res.status}`);
        return await res.json();
    },

    async checkExamCode(examCode) {
        const res = await fetch(`${API_BASE_URL}/check-exam-code/${examCode}`, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include'
        });
        if (!res.ok) return false;
        return await res.json();
    },

    async createExam(examData) {
        const res = await fetch(`${API_BASE_URL}/create-exam`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify(examData)
        });
        const body = await res.json();
        if (!res.ok) throw new Error(body.error || 'Failed to create exam');
        return body;
    },

    async updateExam(examId, examData) {
        const res = await fetch(`${API_BASE_URL}/update-exam/${examId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify(examData)
        });
        const body = await res.json();
        if (!res.ok) throw new Error(body.error || 'Failed to update exam');
        return body;
    },

    async updateExamStatus(examId, status) {
        const res = await fetch(`${API_BASE_URL}/update-exam-status/${examId}?status=${status}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include'
        });
        const body = await res.json();
        if (!res.ok) throw new Error(body.error || 'Failed to update status');
        return body;
    },

    async deleteExam(examId) {
        const res = await fetch(`${API_BASE_URL}/delete-exam/${examId}`, {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include'
        });
        if (!res.ok) {
            const body = await res.json().catch(() => ({}));
            throw new Error(body.error || 'Failed to delete exam');
        }
        return true;
    }
};

// Helper function to format date range
function formatDateRange(startDate, endDate) {
    if (!startDate || !endDate) return 'TBA';

    const start = new Date(startDate);
    const end = new Date(endDate);

    const options = { year: 'numeric', month: 'short', day: 'numeric' };
    return `${start.toLocaleDateString('en-US', options)} - ${end.toLocaleDateString('en-US', options)}`;
}

// Helper function to format date for PDF
function formatDateForPDF(date) {
    if (!date) return 'TBA';
    const options = { year: 'numeric', month: 'short', day: 'numeric' };
    return date.toLocaleDateString('en-US', options);
}

// Helper function to format time for display
function formatTimeForDisplay(timeString) {
    if (!timeString) return 'TBA';

    // Handle time in HH:mm format
    const [hours, minutes] = timeString.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const hour12 = hour % 12 || 12;
    return `${hour12}:${minutes} ${ampm}`;
}

// Helper function to calculate duration
function calculateDuration(startTime, endTime) {
    if (!startTime || !endTime) return '3 hours';

    const start = new Date(`2000-01-01T${startTime}`);
    const end = new Date(`2000-01-01T${endTime}`);
    const diffMs = end - start;
    const diffHrs = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

    if (diffHrs === 0) {
        return `${diffMins} minutes`;
    } else if (diffMins === 0) {
        return `${diffHrs} hour${diffHrs > 1 ? 's' : ''}`;
    } else {
        return `${diffHrs} hour${diffHrs > 1 ? 's' : ''} ${diffMins} minutes`;
    }
}

// ============= DATA MAPPING HELPERS =============
function mapResponseToFrontend(exam) {
    return {
        id: exam.examId,
        name: exam.examName,
        examCode: exam.examCode,
        type: exam.examType,
        academicYear: exam.academicYear,
        classId: exam.classId ? String(exam.classId) : '',
        className: exam.className || `Class ${exam.classId}`,
        classCode: exam.classCode || '',
        section: exam.section,
        startDate: exam.startDate,     // already "YYYY-MM-DD" string
        endDate: exam.endDate,
        description: exam.description || '',
        status: exam.status || 'SCHEDULED',
        subjects: (exam.subjects || []).map(s => ({
            name: s.subjectName,
            subjectName: s.subjectName,
            maxMarks: s.maxMarks,
            passingMarks: s.passingMarks,
            examDate: s.examDate,
            startTime: s.startTime,
            endTime: s.endTime,
            roomNumber: s.roomNumber,
            invigilator: s.invigilator
        })),
        createdAt: exam.createdAt,
        updatedAt: exam.updatedAt
    };
}

function mapFormToRequest(formData) {
    // Create SubjectDetail objects for each subject
    const subjects = formData.subjects.map(s => ({
        subjectName: s.name,
        maxMarks: formData.totalMarks || 100,
        passingMarks: formData.passingMarks || Math.floor((formData.totalMarks || 100) * 0.33),
        examDate: formData.startDate ? formData.startDate.split('T')[0] : null,
        startTime: formData.startTime || '10:00:00',
        endTime: formData.endTime || '13:00:00',
        roomNumber: formData.roomNumber || null,
        invigilator: formData.invigilator || null
    }));

    return {
        examName: formData.examName,
        examCode: formData.examCode || null,
        examType: formData.examType,
        academicYear: formData.academicYear,
        classId: formData.classId,
        section: formData.section,
        startDate: formData.startDate,
        endDate: formData.endDate,
        description: formData.description || '',
        subjects: subjects
    };
}

function setupTabNavigation() {
    const tabButtons = document.querySelectorAll('.tab-btn');
    const tabContents = {
        createExamTab: 'createExamContent',
        scheduleTab: 'scheduleContent',
        timeTableTab: 'timeTableContent',
        subjectsTab: 'subjectsContent'
    };

    tabButtons.forEach(button => {
        button.addEventListener('click', function () {
            const tabId = this.id;
            const contentId = tabContents[tabId];

            tabButtons.forEach(btn => {
                btn.classList.remove('active', 'border-blue-500', 'text-gray-700');
                btn.classList.add('text-gray-500');
            });

            this.classList.add('active', 'border-blue-500', 'text-gray-700');
            this.classList.remove('text-gray-500');

            Object.values(tabContents).forEach(id => {
                const element = document.getElementById(id);
                if (element) {
                    element.classList.add('hidden');
                    element.classList.remove('active');
                }
            });

            const activeContent = document.getElementById(contentId);
            if (activeContent) {
                activeContent.classList.remove('hidden');
                activeContent.classList.add('active');
            }

            currentPage = tabId.replace('Tab', '').toLowerCase();

            if (currentPage === 'schedule') {
                renderExamsTable();
            }
        });
    });
}

// ============= LOAD EXAMS FROM API =============
async function loadExamsFromAPI() {
    console.log('📡 Fetching exams from API...');
    showLoading();
    try {
        const response = await ExamAPI.getAllExams();
        currentExams = response.map(mapResponseToFrontend);
        filteredExams = [...currentExams];

        updateExamStats(currentExams);
        renderExamsTable();
        updateFilterStats();
        populateTimetableDropdown();

        console.log(`✅ Loaded ${currentExams.length} exams from API`);
    } catch (err) {
        console.error('❌ Failed to load exams:', err);
        showToast('Failed to load exams from server. Check your connection.', 'error');
        currentExams = [];
        filteredExams = [];
        renderExamsTable();
    } finally {
        hideLoading();
    }
}

// ============= UPDATE SUBJECTS BASED ON CLASS SELECTION =============
// Update the updateSubjectsForClass function
async function updateSubjectsForClass(classId) {
    const subjectsList = document.getElementById('subjectsList');
    if (!subjectsList) return;

    console.log('📚 Updating subjects for class ID:', classId);

    if (!classId) {
        clearSubjectsList();
        return;
    }

    subjectsList.innerHTML = `
        <div class="col-span-3 text-center py-6 text-gray-400">
            <i class="fas fa-spinner fa-spin text-2xl mb-2 block"></i>
            Loading subjects...
        </div>`;

    // ✅ ADDED: Small timeout to prevent UI flicker
    await new Promise(resolve => setTimeout(resolve, 300));

    try {
        console.log('🔍 Fetching class data from:', `${CLASS_API_BASE_URL}/get-class-by-id/${classId}`);
        
        const response = await fetch(`${CLASS_API_BASE_URL}/get-class-by-id/${classId}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            credentials: 'include'
        });

        console.log('📡 Response status:', response.status);

        if (!response.ok) {
            const errorText = await response.text();
            console.error('❌ Error response:', errorText);
            throw new Error(`Failed to fetch class: ${response.status} - ${errorText}`);
        }

        const classData = await response.json();
        console.log('📖 Class data received:', classData);

        // ✅ IMPROVED: Better subject extraction with error handling
        const subjects = extractSubjectsFromClass(classData);
        console.log('📝 Subjects extracted:', subjects);

        if (!subjects || subjects.length === 0) {
            subjectsList.innerHTML = `
                <div class="col-span-3 text-center py-6 text-amber-500">
                    <i class="fas fa-exclamation-triangle text-2xl mb-2 block"></i>
                    No subjects found for this class.<br>
                    <span class="text-sm text-gray-500">Please add subjects to the class first.</span>
                </div>`;
            showToast('No subjects available for this class', 'info');
            return;
        }

        // ✅ IMPROVED: Better checkbox rendering
        renderSubjectCheckboxes(subjects);
        showToast(`✅ Loaded ${subjects.length} subjects successfully`, 'success');

    } catch (error) {
        console.error('❌ Error loading subjects:', error);
        
        // ✅ IMPROVED: Better error message
        let errorMessage = 'Failed to load subjects';
        if (error.message.includes('404')) {
            errorMessage = 'Class not found. Please select a valid class.';
        } else if (error.message.includes('500')) {
            errorMessage = 'Server error. Please try again later.';
        } else if (error.message.includes('Failed to fetch')) {
            errorMessage = 'Network error. Please check your connection.';
        }
        
        subjectsList.innerHTML = `
            <div class="col-span-3 text-center py-6 text-red-400">
                <i class="fas fa-exclamation-circle text-2xl mb-2 block"></i>
                ${errorMessage}<br>
                <span class="text-sm text-gray-500">${error.message}</span>
            </div>`;
        showToast(errorMessage, 'error');
    }
}


// Update the extractSubjectsFromClass function
function extractSubjectsFromClass(classData) {
    console.log('Extracting subjects from class data:', classData);
    const subjects = [];
    const subjectMap = new Map();

    try {
        // Check for class teacher subject
        if (classData.classTeacherSubject) {
            console.log('Found class teacher subject:', classData.classTeacherSubject);
            subjectMap.set(classData.classTeacherSubject, {
                name: classData.classTeacherSubject,
                maxMarks: 100,
                passingMarks: 33
            });
        }

        // Check for assistant teacher subject
        if (classData.assistantTeacherSubject) {
            console.log('Found assistant teacher subject:', classData.assistantTeacherSubject);
            subjectMap.set(classData.assistantTeacherSubject, {
                name: classData.assistantTeacherSubject,
                maxMarks: 100,
                passingMarks: 33
            });
        }

        // Check for other teacher subjects
        if (classData.otherTeacherSubject && Array.isArray(classData.otherTeacherSubject)) {
            console.log('Processing otherTeacherSubject array:', classData.otherTeacherSubject);

            classData.otherTeacherSubject.forEach((teacherAssignment) => {
                if (teacherAssignment.subjects && Array.isArray(teacherAssignment.subjects)) {
                    teacherAssignment.subjects.forEach((subject) => {
                        if (subject.subjectName && !subjectMap.has(subject.subjectName)) {
                            subjectMap.set(subject.subjectName, {
                                name: subject.subjectName,
                                maxMarks: subject.totalMarks || 100,
                                passingMarks: Math.floor((subject.totalMarks || 100) * 0.33)
                            });
                        }
                    });
                }
            });
        }

        const result = Array.from(subjectMap.values());
        console.log('Extracted subjects:', result);
        return result;

    } catch (error) {
        console.error('Error extracting subjects:', error);
        return [];
    }
}

function renderSubjectCheckboxes(subjects) {
    const subjectsList = document.getElementById('subjectsList');
    if (!subjectsList) return;

    subjectsList.innerHTML = '';

    subjects.forEach((subject, index) => {
        const subjectId = `subject_${index}_${Date.now()}`;
        const subjectItem = document.createElement('div');
        subjectItem.className = 'flex items-center p-3 border border-gray-200 rounded-lg subject-item';

        subjectItem.innerHTML = `
            <input type="checkbox" id="${subjectId}" name="subjects" value="${subject.name}"
                class="h-4 w-4 text-blue-600 border-gray-300 rounded subject-checkbox">
            <label for="${subjectId}" class="ml-3 text-sm text-gray-700 flex-1">${subject.name}</label>
            <!-- Removed the marks display and input field -->
        `;

        subjectsList.appendChild(subjectItem);
    });

    // Remove the updateTotalMarks from checkbox change event
    setupSubjectCheckboxes();
}

// ============= TAB NAVIGATION =============
function setupTabNavigation() {
    const tabButtons = document.querySelectorAll('.tab-btn');
    const tabContents = {
        createExamTab: 'createExamContent',
        scheduleTab: 'scheduleContent',
        timeTableTab: 'timeTableContent',
        subjectsTab: 'subjectsContent'
    };

    tabButtons.forEach(button => {
        button.addEventListener('click', function () {
            const tabId = this.id;
            const contentId = tabContents[tabId];

            tabButtons.forEach(btn => {
                btn.classList.remove('active', 'border-blue-500', 'text-gray-700');
                btn.classList.add('text-gray-500');
            });

            this.classList.add('active', 'border-blue-500', 'text-gray-700');
            this.classList.remove('text-gray-500');

            Object.values(tabContents).forEach(id => {
                const element = document.getElementById(id);
                if (element) {
                    element.classList.add('hidden');
                    element.classList.remove('active');
                }
            });

            const activeContent = document.getElementById(contentId);
            if (activeContent) {
                activeContent.classList.remove('hidden');
                activeContent.classList.add('active');
            }

            currentPage = tabId.replace('Tab', '').toLowerCase();

            if (currentPage === 'schedule') {
                renderExamsTable();
            }
        });
    });
}

// ============= FILTER HANDLERS =============
function setupFilterHandlers() {
    const searchInput = document.getElementById('searchExam');
    const classFilter = document.getElementById('scheduleClass');
    const typeFilter = document.getElementById('scheduleExamType');
    const statusFilter = document.getElementById('scheduleStatus');
    const dateFilter = document.getElementById('scheduleDate');

    if (searchInput) searchInput.addEventListener('input', filterExams);
    if (classFilter) classFilter.addEventListener('change', filterExams);
    if (typeFilter) typeFilter.addEventListener('change', filterExams);
    if (statusFilter) statusFilter.addEventListener('change', filterExams);
    if (dateFilter) dateFilter.addEventListener('change', filterExams);

    const resetBtn = document.getElementById('resetFilters');
    if (resetBtn) resetBtn.addEventListener('click', resetAllFilters);

    const prevBtn = document.getElementById('prevPage');
    const nextBtn = document.getElementById('nextPage');
    if (prevBtn) prevBtn.addEventListener('click', previousPage);
    if (nextBtn) nextBtn.addEventListener('click', nextPage);
}

function filterExams() {
    const searchTerm = document.getElementById('searchExam')?.value.toLowerCase() || '';
    const classFilter = document.getElementById('scheduleClass')?.value || '';
    const typeFilter = document.getElementById('scheduleExamType')?.value || '';
    const statusFilter = document.getElementById('scheduleStatus')?.value || '';
    const dateFilter = document.getElementById('scheduleDate')?.value || '';

    filteredExams = currentExams.filter(exam => {
        if (searchTerm) {
            const searchableText = `${exam.name} ${exam.className || ''} ${exam.section || ''} ${exam.examCode || ''}`.toLowerCase();
            if (!searchableText.includes(searchTerm)) return false;
        }
        if (classFilter && exam.classId !== classFilter) return false;
        if (typeFilter && exam.type !== typeFilter) return false;
        // Backend statuses: SCHEDULED, ONGOING, COMPLETED
        if (statusFilter) {
            const normalised = statusFilter === 'UPCOMING' ? 'SCHEDULED' : statusFilter;
            if (exam.status !== normalised) return false;
        }
        if (dateFilter) {
            if (exam.startDate !== dateFilter) return false;
        }
        return true;
    });

    currentPageNumber = 1;
    renderExamsTable();
    updateFilterStats();
}

function resetAllFilters() {
    ['searchExam', 'scheduleClass', 'scheduleExamType', 'scheduleStatus', 'scheduleDate'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = '';
    });
    filteredExams = [...currentExams];
    currentPageNumber = 1;
    renderExamsTable();
    updateFilterStats();
    showToast('Filters reset successfully', 'success');
}

function updateFilterStats() {
    const statsElement = document.getElementById('filterStats');
    if (statsElement) {
        statsElement.innerHTML = `
            Showing <span class="font-bold">${filteredExams.length}</span> of 
            <span class="font-bold">${currentExams.length}</span> exams
        `;
    }
}

// ============= PAGINATION =============
function previousPage() {
    if (currentPageNumber > 1) {
        currentPageNumber--;
        renderExamsTable();
    }
}

function nextPage() {
    const totalPages = Math.ceil(filteredExams.length / itemsPerPage);
    if (currentPageNumber < totalPages) {
        currentPageNumber++;
        renderExamsTable();
    }
}

// ============= EXAM TABLE RENDERING =============
function renderExamsTable() {
    const tableBody = document.getElementById('examsTableBody');
    const tableInfo = document.getElementById('tableInfo');
    const noDataMessage = document.getElementById('noExamsMessage');

    if (!tableBody) return;

    const startIndex = (currentPageNumber - 1) * itemsPerPage;
    const endIndex = Math.min(startIndex + itemsPerPage, filteredExams.length);
    const pageData = filteredExams.slice(startIndex, endIndex);

    tableBody.innerHTML = '';

    if (pageData.length === 0) {
        if (noDataMessage) noDataMessage.classList.remove('hidden');
        if (tableInfo) tableInfo.innerHTML = 'Showing 0 exams';
        updatePaginationControls(0);
        return;
    }

    if (noDataMessage) noDataMessage.classList.add('hidden');

    pageData.forEach((exam, index) => {
        const row = createExamRow(exam, startIndex + index + 1);
        tableBody.appendChild(row);
    });

    if (tableInfo) {
        tableInfo.innerHTML = `Showing ${startIndex + 1}-${endIndex} of ${filteredExams.length} exams`;
    }

    updatePaginationControls(filteredExams.length);
}

function createExamRow(exam, serialNo) {
    const row = document.createElement('tr');
    row.className = 'hover:bg-gray-50 transition-colors';

    const statusClass = getStatusClass(exam.status);
    const statusText = getStatusText(exam.status);

    // Format dates for display
    const startDate = exam.startDate ? formatDateForTable(exam.startDate) : 'TBA';
    const endDate = exam.endDate ? formatDateForTable(exam.endDate) : 'TBA';
    const totalMarks = exam.subjects?.reduce((total, sub) => total + (sub.maxMarks || 0), 0) || 0;

    row.innerHTML = `
        <td class="px-4 py-4 whitespace-nowrap text-sm text-gray-700">${serialNo}</td>
        <td class="px-4 py-4 whitespace-nowrap">
            <div class="font-medium text-gray-900">${exam.name}</div>
            <div class="text-xs text-gray-500">${formatExamType(exam.type)} ${exam.examCode ? '• ' + exam.examCode : ''}</div>
        </td>
        <td class="px-4 py-4 whitespace-nowrap text-sm text-gray-700">
            ${exam.className || 'Class ' + exam.classId} - ${exam.section || 'A'}
        </td>
        <td class="px-4 py-4 whitespace-nowrap text-sm text-gray-700">
            ${startDate} - ${endDate}
        </td>
        <td class="px-4 py-4 whitespace-nowrap">
            <span class="px-2 py-1 text-xs font-semibold rounded-full ${statusClass}">
                ${statusText}
            </span>
        </td>
        <td class="px-4 py-4 whitespace-nowrap text-sm text-gray-700">
            ${exam.subjects?.length || 0} subjects
        </td>
        <td class="px-4 py-4 whitespace-nowrap text-sm text-gray-700">
            ${totalMarks}
        </td>
        <td class="px-4 py-4 whitespace-nowrap text-sm font-medium">
            <button onclick="showExamTimetable(${exam.id})" class="text-blue-600 hover:text-blue-900 mr-2" title="View Timetable">
                <i class="fas fa-calendar-alt"></i>
            </button>
            <button onclick="openEditModal(${exam.id})" class="text-green-600 hover:text-green-900 mr-2" title="Edit Exam">
                <i class="fas fa-edit"></i>
            </button>
            <button onclick="openStatusModal(${exam.id}, '${exam.status}')" class="text-yellow-600 hover:text-yellow-900 mr-2" title="Update Status">
                <i class="fas fa-toggle-on"></i>
            </button>
            <button onclick="deleteExam(${exam.id})" class="text-red-600 hover:text-red-900" title="Delete Exam">
                <i class="fas fa-trash"></i>
            </button>
        </td>
    `;

    return row;
}

// Helper function to format dates for table display
function formatDateForTable(dateString) {
    if (!dateString) return 'TBA';
    try {
        // If it's in ISO format, extract the date part
        if (dateString.includes('T')) {
            dateString = dateString.split('T')[0];
        }
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    } catch (e) {
        return dateString;
    }
}

function updatePaginationControls(totalItems) {
    const totalPages = Math.ceil(totalItems / itemsPerPage);
    const prevBtn = document.getElementById('prevPage');
    const nextBtn = document.getElementById('nextPage');
    const pageInfo = document.getElementById('pageInfo');

    if (prevBtn) {
        prevBtn.disabled = currentPageNumber === 1;
        prevBtn.classList.toggle('opacity-50', currentPageNumber === 1);
        prevBtn.classList.toggle('cursor-not-allowed', currentPageNumber === 1);
    }
    if (nextBtn) {
        nextBtn.disabled = currentPageNumber === totalPages || totalPages === 0;
        nextBtn.classList.toggle('opacity-50', currentPageNumber === totalPages || totalPages === 0);
        nextBtn.classList.toggle('cursor-not-allowed', currentPageNumber === totalPages || totalPages === 0);
    }
    if (pageInfo) {
        pageInfo.textContent = `Page ${currentPageNumber} of ${totalPages || 1}`;
    }
}

// ============= EXAM STATISTICS =============
function updateExamStats(exams) {
    const totalExams = exams.length;
    const upcoming = exams.filter(e => e.status === 'SCHEDULED').length;
    const ongoing = exams.filter(e => e.status === 'ONGOING').length;
    const completed = exams.filter(e => e.status === 'COMPLETED').length;

    document.getElementById('statTotalExams').textContent = totalExams;
    document.getElementById('statUpcoming').textContent = upcoming;
    document.getElementById('statCompleted').textContent = completed;
    document.getElementById('statOngoing').textContent = ongoing;
}

// ============= CREATE / UPDATE EXAM =============
function setupFormHandlers() {
    const createExamForm = document.getElementById('createExamForm');
    if (createExamForm) {
        // Remove any existing listeners before adding new one
        createExamForm.removeEventListener('submit', createNewExam);
        createExamForm.addEventListener('submit', function (e) {
            e.preventDefault();
            createNewExam();
        });
    }

    // Separate handler function for class change
    function handleClassChange(event) {
        const classId = event.target.value;
        updateSubjectsForClass(classId);
        updateSectionForClass(classId);

        // Reset subject selection and marks
        document.getElementById('totalMarks').value = '';
        document.getElementById('passingMarks').value = '';
    }

    // In setupFormHandlers function, update the examClass change event:
    // In setupFormHandlers function
    const examClassSelect = document.getElementById('examClass');
    if (examClassSelect) {
        examClassSelect.addEventListener('change', function () {
            const classId = this.value;
            updateSubjectsForClass(classId);
            updateSectionForClass(classId);

            // Reset subject selection and marks
            document.getElementById('totalMarks').value = '';
            document.getElementById('passingMarks').value = '';
        });
    }

    const loadTimetableBtn = document.getElementById('loadTimetableBtn');
    if (loadTimetableBtn) {
        loadTimetableBtn.addEventListener('click', loadTimetable);
    }

    const addSubjectForm = document.getElementById('addSubjectForm');
    if (addSubjectForm) {
        addSubjectForm.addEventListener('submit', function (e) {
            e.preventDefault();
            handleAddSubject();
        });
    }

    const addSubjectBtn = document.getElementById('addSubjectBtn');
    if (addSubjectBtn) {
        addSubjectBtn.addEventListener('click', function () {
            document.getElementById('subjectsTab').click();
        });
    }

    const resetBtn = document.querySelector('button[type="reset"]');
    if (resetBtn) {
        resetBtn.addEventListener('click', resetExamForm);
    }
}

function collectFormData() {
    // Get selected subjects as array
    const subjects = [];
    document.querySelectorAll('.subject-checkbox:checked').forEach(checkbox => {
        subjects.push({
            name: checkbox.value
        });
    });

    // Get section
    const sectionSelect = document.getElementById('examSection');
    let section = sectionSelect.value;
    
    // If section is empty but class has a section, use that
    if (!section) {
        const classId = document.getElementById('examClass')?.value;
        if (classId) {
            const selectedClass = allClasses.find(c => c.classId == classId);
            if (selectedClass && selectedClass.section) {
                section = selectedClass.section;
            }
        }
    }

    // Get class ID
    const classId = document.getElementById('examClass')?.value || '';
    if (!classId) {
        showToast('Please select a valid class', 'error');
        return null;
    }

    // Rest of the function remains the same...
    const startDate = document.getElementById('startDate')?.value;
    const endDate = document.getElementById('endDate')?.value;
    const startTime = document.getElementById('startTime')?.value || '10:00';
    const endTime = document.getElementById('endTime')?.value || '13:00';

    // Create ISO datetime without timezone offset
    const startDateTime = startDate ? `${startDate}T${startTime}:00` : null;
    const endDateTime = endDate ? `${endDate}T${endTime}:00` : null;

    // Get total marks and passing marks
    const totalMarks = parseInt(document.getElementById('totalMarks')?.value) || 0;
    const passingMarks = parseInt(document.getElementById('passingMarks')?.value) || 0;

    return {
        examName: document.getElementById('examName')?.value.trim() || '',
        examCode: document.getElementById('examCode')?.value.trim() || '',
        examType: document.getElementById('examType')?.value || '',
        classId: parseInt(classId), // Ensure it's a number
        section: section || '',
        streamId: document.getElementById('examStream')?.value || null,
        termId: document.getElementById('examTerm')?.value || '',
        academicYear: document.getElementById('academicYear')?.value || '',
        startDate: startDateTime,
        endDate: endDateTime,
        startTime: startTime ? `${startTime}:00` : '10:00:00',
        endTime: endTime ? `${endTime}:00` : '13:00:00',
        totalMarks: totalMarks,
        passingMarks: passingMarks,
        examStatus: 'SCHEDULED',
        createdBy: 'admin',
        updatedBy: 'admin',
        description: document.getElementById('examDescription')?.value.trim() || '',
        roomNumber: document.getElementById('roomNumber')?.value.trim() || null,
        invigilator: document.getElementById('invigilator')?.value.trim() || null,
        subjects: subjects
    };
}

function validateExamData(examData) {
    if (!examData.examName) return 'Exam name is required';
    if (!examData.examCode) return 'Exam code is required';
    if (!examData.examType) return 'Exam type is required';

    // Backend enum values
    const validTypes = ['TERM1', 'TERM2', 'TERM3', 'UNIT_TEST', 'MID_TERM', 'FINAL'];
    if (!validTypes.includes(examData.examType)) {
        return `Invalid exam type: ${examData.examType}. Supported: ${validTypes.join(', ')}`;
    }

    if (!examData.classId) return 'Class is required';
    if (!examData.section) return 'Section is required';
    if (!examData.termId) return 'Term is required';
    if (!examData.academicYear) return 'Academic year is required';

    if (!examData.startDate) {
        return 'Start date is required';
    }
    if (!examData.endDate) {
        return 'End date is required';
    }
    if (!examData.startTime) return 'Start time is required';
    if (!examData.endTime) return 'End time is required';

    // Validate marks
    if (!examData.totalMarks || examData.totalMarks <= 0) {
        return 'Total marks must be greater than 0';
    }
    if (!examData.passingMarks || examData.passingMarks <= 0) {
        return 'Passing marks must be greater than 0';
    }
    if (examData.passingMarks > examData.totalMarks) {
        return 'Passing marks cannot exceed total marks';
    }

    // Validate that end date is after start date
    if (examData.startDate && examData.endDate) {
        const start = new Date(examData.startDate);
        const end = new Date(examData.endDate);
        if (end < start) {
            return 'End date must be after start date';
        }
    }

    // Check if at least one subject is selected
    if (!examData.subjects || examData.subjects.length === 0) {
        return 'At least one subject is required';
    }

    return null;
}

async function createNewExam() {
    console.log('📝 Creating new exam via API...');

        // ✅ ADD THESE DEBUG LINES
    console.log('Current allClasses:', allClasses);
    console.log('Selected classId:', document.getElementById('examClass')?.value);
    console.log('Selected section:', document.getElementById('examSection')?.value);

    const formData = collectFormData();

    const validationError = validateExamData(formData);
    if (validationError) {
        showToast(validationError, 'error');
        return;
    }

    if (formData.examCode) {
        try {
            const exists = await ExamAPI.checkExamCode(formData.examCode);
            if (exists) {
                showToast(`Exam code "${formData.examCode}" already exists. Please use a different code.`, 'error');
                return;
            }
        } catch (e) {
            console.warn('Exam code check failed:', e);
        }
    }

    const requestBody = mapFormToRequest(formData);

    showLoading();
    try {
        const createdExam = await ExamAPI.createExam(requestBody);
        const mapped = mapResponseToFrontend(createdExam);

        currentExams.unshift(mapped);
        filteredExams = [...currentExams];

        updateExamStats(currentExams);
        populateTimetableDropdown();
        resetExamForm();

        showToast(`✅ Exam "${mapped.name}" created successfully!`, 'success');

        document.getElementById('scheduleTab')?.click();
        renderExamsTable();

    } catch (err) {
        console.error('❌ Create exam error:', err);
        showToast(err.message || 'Failed to create exam. Please try again.', 'error');
    } finally {
        hideLoading();
    }
}

function resetExamForm() {
    const form = document.getElementById('createExamForm');
    if (form) form.reset();

    // Clear date fields explicitly
    document.getElementById('startDate').value = '';
    document.getElementById('endDate').value = '';

    // Clear marks fields explicitly - FIXED IDs
    document.getElementById('totalMarks').value = '';
    document.getElementById('passingMarks').value = '';

    document.querySelectorAll('.subject-checkbox').forEach(cb => {
        cb.checked = false;
        // Remove the background color
        cb.closest('.subject-item')?.classList.remove('bg-blue-50');
    });

    const submitBtn = document.querySelector('#createExamForm button[type="submit"]');
    if (submitBtn) {
        submitBtn.innerHTML = '<i class="fas fa-save mr-2"></i>Create Exam';
    }

    editingExamId = null;
}

// ============= SUBJECT CHECKBOXES =============
function setupSubjectCheckboxes() {
    document.querySelectorAll('.subject-checkbox').forEach(checkbox => {
        checkbox.addEventListener('change', function () {
            // Just handle checkbox state, no marks calculation
            const subjectItem = this.closest('.subject-item');
            // Optional: Add visual indication of selected subjects
            if (this.checked) {
                subjectItem.classList.add('bg-blue-50');
            } else {
                subjectItem.classList.remove('bg-blue-50');
            }
        });
    });
}

// Optional: Function to calculate total marks from selected subjects
function updateTotalMarks() {
    let totalMarks = 0;
    let passingMarks = 0;

    document.querySelectorAll('.subject-checkbox:checked').forEach(checkbox => {
        const maxMarks = parseInt(checkbox.dataset.maxMarks) || 0;
        const passing = parseInt(checkbox.dataset.passingMarks) || 0;
        totalMarks += maxMarks;
        passingMarks += passing;
    });

    const totalMarksInput = document.getElementById('totalMarks');
    const passingMarksInput = document.getElementById('passingMarks');

    if (totalMarksInput) totalMarksInput.value = totalMarks || '';
    if (passingMarksInput) passingMarksInput.value = passingMarks || '';
}

// ============= EDIT EXAM MODAL =============
function createEditModal() {
    if (document.getElementById('editExamModal')) return;

    const modal = document.createElement('div');
    modal.id = 'editExamModal';
    modal.className = 'fixed inset-0 bg-black bg-opacity-50 z-50 hidden flex items-center justify-center p-4';
    modal.innerHTML = `
        <div class="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div class="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center z-10">
                <h3 class="text-xl font-bold text-gray-800">Edit Exam</h3>
                <button onclick="closeEditModal()" class="text-gray-400 hover:text-gray-600">
                    <i class="fas fa-times text-xl"></i>
                </button>
            </div>
            <div class="p-6 space-y-4">
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <!-- Exam Name -->
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1">Exam Name *</label>
                        <input type="text" id="editExamName" class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
                    </div>
                    
                    <!-- Exam Code -->
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1">Exam Code *</label>
                        <input type="text" id="editExamCode" class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
                    </div>
                    
                    <!-- Exam Type -->
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1">Exam Type *</label>
                        <select id="editExamType" class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
                            <option value="TERM1">Term 1 Examination</option>
                            <option value="TERM2">Term 2 Examination</option>
                            <option value="TERM3">Term 3 Examination</option>
                            <option value="UNIT_TEST">Unit Test</option>
                            <option value="MID_TERM">Mid Term Examination</option>
                            <option value="FINAL">Final Examination</option>
                        </select>
                    </div>
                    
                    <!-- Academic Year -->
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1">Academic Year *</label>
                        <select id="editAcademicYear" class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
                            <!-- Options will be populated dynamically -->
                        </select>
                    </div>
                    
                    <!-- Class (Read-only) -->
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1">Class</label>
                        <input type="text" id="editClassDisplay" class="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50" readonly>
                    </div>
                    
                    <!-- Section -->
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1">Section *</label>
                        <select id="editSectionModal" class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
                            <option value="">Select Section</option>
                        </select>
                    </div>
                    
                    <!-- Term -->
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1">Term *</label>
                        <select id="editTerm" class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
                            <option value="term1">Term 1</option>
                            <option value="term2">Term 2</option>
                            <option value="term3">Term 3</option>
                        </select>
                    </div>
                    
                    <!-- Stream -->
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1">Stream</label>
                        <select id="editStream" class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
                            <option value="">Select Stream</option>
                            <option value="science">Science</option>
                            <option value="commerce">Commerce</option>
                            <option value="arts">Arts</option>
                        </select>
                    </div>
                    
                    <!-- Start Date -->
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1">Start Date *</label>
                        <input type="date" id="editStartDate" class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
                    </div>
                    
                    <!-- End Date -->
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1">End Date *</label>
                        <input type="date" id="editEndDate" class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
                    </div>
                    
                    <!-- Start Time -->
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1">Start Time *</label>
                        <input type="time" id="editStartTime" class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" value="10:00">
                    </div>
                    
                    <!-- End Time -->
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1">End Time *</label>
                        <input type="time" id="editEndTime" class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" value="13:00">
                    </div>
                    
                    <!-- Room Number -->
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1">Room Number</label>
                        <input type="text" id="editRoomNumber" class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
                    </div>
                    
                    <!-- Invigilator -->
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1">Invigilator</label>
                        <input type="text" id="editInvigilator" class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
                    </div>
                    
                    <!-- Total Marks (Editable) -->
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1">Total Marks *</label>
                        <input type="number" id="editTotalMarks" 
                            class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                            min="1" required>
                    </div>

                    <!-- Passing Marks (Editable) -->
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1">Passing Marks *</label>
                        <input type="number" id="editPassingMarks" 
                            class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                            min="1" required>
                    </div>
                    
                    <!-- Description -->
                    <div class="md:col-span-2">
                        <label class="block text-sm font-medium text-gray-700 mb-1">Description</label>
                        <textarea id="editDescription" rows="3" class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"></textarea>
                    </div>
                </div>

                <!-- Subjects Section -->
                <div class="border border-gray-200 rounded-lg p-4">
                    <h4 class="font-semibold text-gray-700 mb-3">Subjects</h4>
                    <div id="editSubjectsList" class="space-y-2"></div>
                    <button type="button" onclick="addEditSubjectRow()" class="mt-3 text-sm text-blue-600 hover:text-blue-800">
                        <i class="fas fa-plus mr-1"></i> Add Subject
                    </button>
                </div>

                <!-- Action Buttons -->
                <div class="flex justify-end space-x-3 pt-2">
                    <button onclick="closeEditModal()" class="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50">
                        Cancel
                    </button>
                    <button onclick="submitEditExam()" class="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                        <i class="fas fa-save mr-2"></i>Save Changes
                    </button>
                </div>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
}

function openEditModal(examId) {
    console.log('Opening edit modal for exam ID:', examId);

    const exam = currentExams.find(e => e.id === examId);
    if (!exam) {
        showToast('Exam not found', 'error');
        return;
    }

    console.log('Exam data for edit:', exam); // Debug log
    console.log('Total Marks:', exam.totalMarks);
    console.log('Passing Marks:', exam.passingMarks);

    editingExamId = examId;

    // Get the modal element
    const modal = document.getElementById('editExamModal');
    if (!modal) {
        console.error('Edit modal not found');
        createEditModal(); // Create it if it doesn't exist
    }

    // Populate basic fields
    setElementValue('editExamName', exam.name || '');
    setElementValue('editExamCode', exam.examCode || '');
    setElementValue('editExamType', exam.type || '');

    // Set class display
    const classDisplay = document.getElementById('editClassDisplay');
    if (classDisplay) {
        classDisplay.value = `${exam.className || 'Class ' + exam.classId} - Section ${exam.section || 'A'}`;
    }

    // Set academic year
    const editAcademicYearSelect = document.getElementById('editAcademicYear');
    if (editAcademicYearSelect) {
        // If dropdown is empty, populate with default values
        if (editAcademicYearSelect.options.length <= 1) {
            const defaultYears = ['2024-2025', '2025-2026', '2026-2027'];
            editAcademicYearSelect.innerHTML = '<option value="">Select Academic Year</option>';
            defaultYears.forEach(year => {
                const option = document.createElement('option');
                option.value = year;
                option.textContent = year;
                editAcademicYearSelect.appendChild(option);
            });
        }
        // Set the value from exam
        editAcademicYearSelect.value = exam.academicYear || '';
    }

    // Set term
    setElementValue('editTerm', exam.termId || 'term1');

    // Set stream
    setElementValue('editStream', exam.streamId || '');

    // Set dates - extract from ISO strings if needed
    if (exam.startDate) {
        const startDateStr = exam.startDate.split('T')[0];
        setElementValue('editStartDate', startDateStr);
    }

    if (exam.endDate) {
        const endDateStr = exam.endDate.split('T')[0];
        setElementValue('editEndDate', endDateStr);
    }

    // Set times
    if (exam.startTime) {
        const timeStr = exam.startTime.split(':')[0] + ':' + exam.startTime.split(':')[1];
        setElementValue('editStartTime', timeStr);
    }

    if (exam.endTime) {
        const timeStr = exam.endTime.split(':')[0] + ':' + exam.endTime.split(':')[1];
        setElementValue('editEndTime', timeStr);
    }

    // Set room and invigilator
    setElementValue('editRoomNumber', exam.roomNumber || '');
    setElementValue('editInvigilator', exam.invigilator || '');
    setElementValue('editDescription', exam.description || '');

    // FIX: Set total marks and passing marks directly from exam object
    // Make sure these elements exist and are not readonly
    const totalMarksElement = document.getElementById('editTotalMarks');
    const passingMarksElement = document.getElementById('editPassingMarks');

    if (totalMarksElement) {
        totalMarksElement.value = exam.totalMarks || 0;
        console.log('Set total marks to:', totalMarksElement.value);
    } else {
        console.error('editTotalMarks element not found');
    }

    if (passingMarksElement) {
        passingMarksElement.value = exam.passingMarks || 0;
        console.log('Set passing marks to:', passingMarksElement.value);
    } else {
        console.error('editPassingMarks element not found');
    }

    // Handle section dropdown
    const editSectionSelect = document.getElementById('editSectionModal');
    if (editSectionSelect) {
        if (exam.section) {
            editSectionSelect.innerHTML = `<option value="${exam.section}">Section ${exam.section}</option>`;
            editSectionSelect.disabled = true;
        } else {
            editSectionSelect.disabled = false;
            const sections = ['A', 'B', 'C', 'D'];
            editSectionSelect.innerHTML = '<option value="">Select Section</option>';
            sections.forEach(section => {
                const option = document.createElement('option');
                option.value = section;
                option.textContent = `Section ${section}`;
                if (section === exam.section) {
                    option.selected = true;
                }
                editSectionSelect.appendChild(option);
            });
        }
    }

    // Populate subjects
    const subjectsList = document.getElementById('editSubjectsList');
    if (subjectsList) {
        subjectsList.innerHTML = '';
        (exam.subjects || []).forEach(s => {
            subjectsList.appendChild(createEditSubjectRow(s.name || s.subjectName));
        });
    }

    // Show the modal
    modal.classList.remove('hidden');
    document.body.classList.add('overflow-hidden');
}

// Helper function to safely set element values
function setElementValue(id, value) {
    const element = document.getElementById(id);
    if (element) {
        element.value = value;
        console.log(`Set ${id} to:`, value);
    } else {
        console.warn(`Element with id '${id}' not found`);
    }
}

function closeEditModal() {
    document.getElementById('editExamModal')?.classList.add('hidden');
    document.body.classList.remove('overflow-hidden');
    editingExamId = null;
}

function createEditSubjectRow(name = '') {
    const div = document.createElement('div');
    div.className = 'flex items-center gap-2 edit-subject-row';
    div.innerHTML = `
        <input type="text" placeholder="Subject Name" value="${name}" 
            class="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm edit-subject-name" />
        <button type="button" onclick="this.closest('.edit-subject-row').remove()" 
            class="text-red-500 hover:text-red-700 px-2">
            <i class="fas fa-times"></i>
        </button>
    `;
    return div;
}

function addEditSubjectRow() {
    const subjectsList = document.getElementById('editSubjectsList');
    if (subjectsList) {
        subjectsList.appendChild(createEditSubjectRow());
    }
}

async function submitEditExam() {
    if (!editingExamId) {
        showToast('No exam selected for editing', 'error');
        return;
    }

    // Collect subjects from edit form (just names)
    const subjects = [];
    document.querySelectorAll('.edit-subject-row').forEach(row => {
        const name = row.querySelector('.edit-subject-name')?.value.trim();
        if (name) subjects.push({ name }); // Only store name
    });

    // Get section from edit modal
    const editSectionSelect = document.getElementById('editSectionModal');
    let section = editSectionSelect?.value;
    if (editSectionSelect?.disabled) {
        section = editSectionSelect.value;
    }

    // Get the original exam to preserve classId
    const originalExam = currentExams.find(e => e.id === editingExamId);

    // Get date values
    const startDate = document.getElementById('editStartDate')?.value;
    const endDate = document.getElementById('editEndDate')?.value;
    const startTime = document.getElementById('editStartTime')?.value || '10:00';
    const endTime = document.getElementById('editEndTime')?.value || '13:00';

    // Get marks from edit form
    const totalMarks = parseInt(document.getElementById('editTotalMarks')?.value) || 0;
    const passingMarks = parseInt(document.getElementById('editPassingMarks')?.value) || 0;

    // Validate dates are present
    if (!startDate) {
        showToast('Start date is required', 'error');
        return;
    }
    if (!endDate) {
        showToast('End date is required', 'error');
        return;
    }

    const formData = {
        examName: document.getElementById('editExamName')?.value.trim(),
        examCode: document.getElementById('editExamCode')?.value.trim(),
        examType: document.getElementById('editExamType')?.value,
        academicYear: document.getElementById('editAcademicYear')?.value,
        classId: originalExam?.classId || '',
        section: section,
        termId: document.getElementById('editTerm')?.value || 'term1',
        streamId: document.getElementById('editStream')?.value || null,
        startDate: startDate,
        endDate: endDate,
        startTime: startTime,
        endTime: endTime,
        totalMarks: totalMarks,
        passingMarks: passingMarks,
        roomNumber: document.getElementById('editRoomNumber')?.value || '',
        invigilator: document.getElementById('editInvigilator')?.value || '',
        description: document.getElementById('editDescription')?.value.trim(),
        subjects: subjects
    };

    // Format dates with times
    if (formData.startDate) {
        formData.startDate = `${formData.startDate}T${formData.startTime}:00`;
    }
    if (formData.endDate) {
        formData.endDate = `${formData.endDate}T${formData.endTime}:00`;
    }

    console.log('Submitting edit form data:', formData);

    // Validate form data
    const validationError = validateExamData(formData);
    if (validationError) {
        showToast(validationError, 'error');
        return;
    }

    const requestBody = mapFormToRequest(formData);

    showLoading();
    try {
        const updatedExam = await ExamAPI.updateExam(editingExamId, requestBody);
        const mapped = mapResponseToFrontend(updatedExam);

        // Update the exam in the local arrays
        const idx = currentExams.findIndex(e => e.id === editingExamId);
        if (idx !== -1) currentExams[idx] = mapped;
        filteredExams = [...currentExams];

        closeEditModal();
        updateExamStats(currentExams);
        renderExamsTable();
        updateFilterStats();

        showToast(`✅ Exam "${mapped.name}" updated successfully!`, 'success');
    } catch (err) {
        console.error('❌ Update exam error:', err);
        showToast(err.message || 'Failed to update exam. Please try again.', 'error');
    } finally {
        hideLoading();
    }
}

// ============= UPDATE EXAM STATUS =============
function createStatusModal() {
    if (document.getElementById('statusModal')) return;

    const modal = document.createElement('div');
    modal.id = 'statusModal';
    modal.className = 'fixed inset-0 bg-black bg-opacity-50 z-50 hidden flex items-center justify-center p-4';
    modal.innerHTML = `
        <div class="bg-white rounded-xl shadow-2xl w-full max-w-sm p-6">
            <h3 class="text-lg font-bold text-gray-800 mb-4">Update Exam Status</h3>
            <p class="text-sm text-gray-600 mb-4">Current Status: <span id="currentStatusDisplay" class="font-semibold"></span></p>
            <div class="space-y-2 mb-6">
                <label class="block text-sm font-medium text-gray-700">Select New Status</label>
                <select id="newStatusSelect" class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
                    <option value="SCHEDULED">SCHEDULED (Upcoming)</option>
                    <option value="ONGOING">ONGOING (In Progress)</option>
                    <option value="COMPLETED">COMPLETED (Finished)</option>
                </select>
            </div>
            <div class="flex justify-end space-x-3">
                <button onclick="closeStatusModal()" class="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50">
                    Cancel
                </button>
                <button onclick="submitStatusUpdate()" class="px-4 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600">
                    <i class="fas fa-check mr-2"></i>Update Status
                </button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
}

function openStatusModal(examId, currentStatus) {
    statusUpdateExamId = examId;
    document.getElementById('currentStatusDisplay').textContent = currentStatus;
    document.getElementById('newStatusSelect').value = currentStatus;
    document.getElementById('statusModal').classList.remove('hidden');
}

function closeStatusModal() {
    document.getElementById('statusModal')?.classList.add('hidden');
    statusUpdateExamId = null;
}

async function submitStatusUpdate() {
    if (!statusUpdateExamId) return;

    const newStatus = document.getElementById('newStatusSelect')?.value;
    if (!newStatus) return;

    showLoading();
    try {
        const updatedExam = await ExamAPI.updateExamStatus(statusUpdateExamId, newStatus);
        const mapped = mapResponseToFrontend(updatedExam);

        const idx = currentExams.findIndex(e => e.id === statusUpdateExamId);
        if (idx !== -1) currentExams[idx] = mapped;
        filteredExams = [...currentExams];

        closeStatusModal();
        updateExamStats(currentExams);
        renderExamsTable();
        updateFilterStats();

        showToast(`✅ Exam status updated to "${newStatus}"`, 'success');
    } catch (err) {
        console.error('❌ Status update error:', err);
        showToast(err.message || 'Failed to update status', 'error');
    } finally {
        hideLoading();
    }
}

// ============= DELETE EXAM =============
async function deleteExam(examId) {
    const exam = currentExams.find(e => e.id === examId);
    if (!exam) return;

    if (!confirm(`Are you sure you want to delete "${exam.name}"? This action cannot be undone.`)) return;

    showLoading();
    try {
        await ExamAPI.deleteExam(examId);

        currentExams = currentExams.filter(e => e.id !== examId);
        filteredExams = filteredExams.filter(e => e.id !== examId);

        updateExamStats(currentExams);
        renderExamsTable();
        updateFilterStats();
        populateTimetableDropdown();

        showToast('Exam deleted successfully', 'success');
    } catch (err) {
        console.error('❌ Delete exam error:', err);
        showToast(err.message || 'Failed to delete exam', 'error');
    } finally {
        hideLoading();
    }
}

// ============= TIMETABLE MODAL =============
function populateTimetableDropdown() {
    const timetableExamSelect = document.getElementById('timetableExam');
    if (!timetableExamSelect) return;

    timetableExamSelect.innerHTML = '<option value="">Choose Exam</option>';
    currentExams.forEach(exam => {
        const opt = document.createElement('option');
        opt.value = exam.id;
        opt.textContent = `${exam.name} (${exam.academicYear})`;
        timetableExamSelect.appendChild(opt);
    });
}

function createTimetableModal() {
    if (document.getElementById('timetableModal')) return;

    const modal = document.createElement('div');
    modal.id = 'timetableModal';
    modal.className = 'fixed inset-0 bg-black bg-opacity-50 z-50 hidden flex items-center justify-center p-4';
    modal.innerHTML = `
        <div class="bg-white rounded-xl shadow-2xl w-full max-w-6xl max-h-[90vh] overflow-y-auto">
            <div class="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center z-10">
                <div>
                    <h3 class="text-xl font-bold text-gray-800" id="modalExamName">Exam Timetable</h3>
                    <p class="text-sm text-gray-600" id="modalExamDetails">Class details</p>
                </div>
                <button onclick="closeTimetableModal()" class="text-gray-400 hover:text-gray-600">
                    <i class="fas fa-times text-xl"></i>
                </button>
            </div>

            <div class="p-6">
                <div class="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                    <div class="bg-blue-50 rounded-lg p-4">
                        <p class="text-sm text-blue-600 mb-1">Exam Type</p>
                        <p class="text-lg font-semibold text-gray-800" id="modalExamType">-</p>
                    </div>
                    <div class="bg-green-50 rounded-lg p-4">
                        <p class="text-sm text-green-600 mb-1">Duration</p>
                        <p class="text-lg font-semibold text-gray-800" id="modalDuration">-</p>
                    </div>
                    <div class="bg-purple-50 rounded-lg p-4">
                        <p class="text-sm text-purple-600 mb-1">Total Subjects</p>
                        <p class="text-lg font-semibold text-gray-800" id="modalTotalSubjects">-</p>
                    </div>
                    <div class="bg-yellow-50 rounded-lg p-4">
                        <p class="text-sm text-yellow-600 mb-1">Total Marks</p>
                        <p class="text-lg font-semibold text-gray-800" id="modalTotalMarks">-</p>
                    </div>
                </div>

                <div class="overflow-x-auto rounded-lg border border-gray-200">
                    <table class="min-w-full divide-y divide-gray-200">
                        <thead class="bg-gray-50">
                            <tr>
                                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Day</th>
                                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Subject</th>
                                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Time</th>
                                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Duration</th>
                                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Max Marks</th>
                                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Passing Marks</th>
                                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Room</th>
                            </tr>
                        </thead>
                        <tbody id="timetableModalBody" class="bg-white divide-y divide-gray-200"></tbody>
                    </table>
                </div>

                <div class="mt-6 p-4 bg-gray-50 rounded-lg">
                    <h4 class="font-semibold text-gray-700 mb-2">📝 Description</h4>
                    <p class="text-gray-600" id="modalDescription">-</p>
                </div>

                <div class="mt-6 flex justify-end">
                    <button onclick="downloadTimetable()" class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                        <i class="fas fa-download mr-2"></i>Download Timetable
                    </button>
                </div>
            </div>
        </div>
    `;

    document.body.appendChild(modal);
}

function showExamTimetable(examId) {
    const exam = currentExams.find(e => e.id === examId);
    if (!exam) {
        showToast('Exam not found', 'error');
        return;
    }

    let modal = document.getElementById('timetableModal');
    if (!modal) {
        createTimetableModal();
        modal = document.getElementById('timetableModal');
    }

    currentTimetableExam = exam;   // ← store so downloadTimetable() can read it
    populateTimetableModal(exam);
    modal.classList.remove('hidden');
    document.body.classList.add('overflow-hidden');
}

function populateTimetableModal(exam) {
    document.getElementById('modalExamName').textContent = exam.name;
    document.getElementById('modalExamDetails').textContent =
        `${exam.className || 'Class ' + exam.classId} - Section ${exam.section} | ${exam.academicYear}`;
    document.getElementById('modalExamType').textContent = formatExamType(exam.type);
    document.getElementById('modalTotalSubjects').textContent = exam.subjects?.length || 0;
    document.getElementById('modalDescription').textContent = exam.description || 'No description provided.';

    const totalMarks = exam.subjects?.reduce((t, s) => t + (s.maxMarks || 0), 0) || 0;
    document.getElementById('modalTotalMarks').textContent = totalMarks;

    if (exam.startDate && exam.endDate) {
        const start = new Date(exam.startDate);
        const end = new Date(exam.endDate);
        const days = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;
        document.getElementById('modalDuration').textContent = `${days} days`;
    } else {
        document.getElementById('modalDuration').textContent = 'TBA';
    }

    const timetableBody = document.getElementById('timetableModalBody');
    timetableBody.innerHTML = '';

    if (!exam.subjects || exam.subjects.length === 0) {
        timetableBody.innerHTML = `
            <tr><td colspan="8" class="px-6 py-8 text-center text-gray-500">No subjects found for this exam</td></tr>
        `;
        return;
    }

    const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

    const startDate = exam.startDate ? new Date(exam.startDate) : new Date();

    exam.subjects.forEach((subject, index) => {
        const examDate = new Date(startDate);
        examDate.setDate(startDate.getDate() + index);
        const dateStr = examDate.toISOString().split('T')[0];
        const dayOfWeek = daysOfWeek[examDate.getDay() === 0 ? 6 : examDate.getDay() - 1];

        const timing = subject.startTime && subject.endTime
            ? { time: `${subject.startTime} - ${subject.endTime}`, duration: '3 hours' }
            : { time: '10:00 AM - 1:00 PM', duration: '3 hours' };
        const room = subject.roomNumber || 'Room TBA';

        const row = document.createElement('tr');
        row.innerHTML = `
            <td class="px-6 py-4 text-sm text-gray-700">${formatDate(dateStr)}</td>
            <td class="px-6 py-4 text-sm text-gray-700">${dayOfWeek}</td>
            <td class="px-6 py-4 text-sm font-medium text-gray-900">${subject.name || subject.subjectName}</td>
            <td class="px-6 py-4 text-sm text-gray-700">${timing.time}</td>
            <td class="px-6 py-4 text-sm text-gray-700">${timing.duration}</td>
            <td class="px-6 py-4 text-sm text-gray-700">${subject.maxMarks || 100}</td>
            <td class="px-6 py-4 text-sm text-gray-700">${subject.passingMarks || Math.floor((subject.maxMarks || 100) * 0.33)}</td>
            <td class="px-6 py-4 text-sm text-gray-700">${room}</td>
        `;
        timetableBody.appendChild(row);
    });
}

function closeTimetableModal() {
    document.getElementById('timetableModal')?.classList.add('hidden');
    document.body.classList.remove('overflow-hidden');
}

function downloadTimetable() {
    if (!currentTimetableExam) {
        showToast('No timetable loaded. Please open an exam timetable first.', 'error');
        return;
    }

    // Remove any existing picker
    const existing = document.getElementById('downloadFormatPicker');
    if (existing) { existing.remove(); return; }
 
    const picker = document.createElement('div');
    picker.id = 'downloadFormatPicker';
    picker.className = 'absolute right-6 bottom-20 bg-white rounded-xl shadow-2xl border border-gray-200 p-3 z-50 flex flex-col gap-2 min-w-[160px]';
    picker.innerHTML = `
        <p class="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Download as</p>
        <button onclick="downloadTimetableAsPDF()" class="flex items-center gap-2 px-4 py-2 rounded-lg bg-red-50 hover:bg-red-100 text-red-700 text-sm font-medium transition-colors">
            <i class="fas fa-file-pdf text-red-500"></i> PDF
        </button>
        <button onclick="downloadTimetableAsCSV()" class="flex items-center gap-2 px-4 py-2 rounded-lg bg-green-50 hover:bg-green-100 text-green-700 text-sm font-medium transition-colors">
            <i class="fas fa-file-csv text-green-600"></i> CSV / Excel
        </button>
        <button onclick="document.getElementById('downloadFormatPicker')?.remove()" class="text-xs text-gray-400 hover:text-gray-600 text-center mt-1">Cancel</button>
    `;
 
    // Append inside the modal so it stays in position
    const modalContent = document.querySelector('#timetableModal .p-6');
    if (modalContent) {
        modalContent.style.position = 'relative';
        modalContent.appendChild(picker);
    } else {
        document.body.appendChild(picker);
    }
 
    // Auto-dismiss when clicking outside
    setTimeout(() => {
        document.addEventListener('click', function dismiss(e) {
            if (!picker.contains(e.target)) {
                picker.remove();
                document.removeEventListener('click', dismiss);
            }
        });
    }, 50);
}
 
/**
 * Build the timetable row data from the exam object.
 * Returns array of row objects: { date, day, subject, time, duration, maxMarks, passingMarks, room }
 */
function buildTimetableRows(exam) {
    const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    const startDate = exam.startDate ? new Date(exam.startDate) : new Date();
 
    return (exam.subjects || []).map((subject, index) => {
        const examDate = new Date(startDate);
        examDate.setDate(startDate.getDate() + index);
 
        const dateStr = examDate.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
        const dayOfWeek = daysOfWeek[examDate.getDay()]; // 0=Sunday…6=Saturday
 
        const time = subject.startTime && subject.endTime
            ? `${subject.startTime} - ${subject.endTime}`
            : '10:00 - 13:00';
 
        let duration = '3 hrs';
        if (subject.startTime && subject.endTime) {
            const [sh, sm] = subject.startTime.split(':').map(Number);
            const [eh, em] = subject.endTime.split(':').map(Number);
            const mins = (eh * 60 + em) - (sh * 60 + sm);
            if (mins > 0) {
                const h = Math.floor(mins / 60);
                const m = mins % 60;
                duration = h > 0 ? (m > 0 ? `${h}h ${m}m` : `${h}h`) : `${m}m`;
            }
        }
 
        const maxMarks    = subject.maxMarks    ?? 100;
        const passingMarks = subject.passingMarks ?? Math.floor(maxMarks * 0.33);
        const room        = subject.roomNumber   || '—';
        const invigilator = subject.invigilator  || '—';
        const subjectName = subject.name || subject.subjectName || '—';
 
        return { dateStr, dayOfWeek, subjectName, time, duration, maxMarks, passingMarks, room, invigilator };
    });
}

/**
 * PDF download using jsPDF + jspdf-autotable (loaded from CDN on demand).
 */
async function downloadTimetableAsPDF() {
    document.getElementById('downloadFormatPicker')?.remove();
    const exam = currentTimetableExam;
    if (!exam) return;
 
    showToast('Generating PDF…', 'info');
 
    // Load jsPDF + autoTable from CDN if not already loaded
    await loadScript('https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js', 'jspdf-core');
    await loadScript('https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.8.2/jspdf.plugin.autotable.min.js', 'jspdf-autotable');
 
    try {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
 
        const pageW = doc.internal.pageSize.getWidth();
        const margin = 14;
 
        // ── Header bar ──────────────────────────────────────────────────────
        doc.setFillColor(67, 118, 237);   // #4376ed — matches --primary
        doc.rect(0, 0, pageW, 22, 'F');
 
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(16);
        doc.setFont('helvetica', 'bold');
        doc.text('EXAM TIMETABLE', margin, 14);
 
        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        const generatedOn = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
        doc.text(`Generated: ${generatedOn}`, pageW - margin, 14, { align: 'right' });
 
        // ── Exam details summary ─────────────────────────────────────────────
        doc.setTextColor(31, 41, 55);   // gray-800
        doc.setFontSize(13);
        doc.setFont('helvetica', 'bold');
        doc.text(exam.name || 'Exam Timetable', margin, 32);
 
        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(75, 85, 99);   // gray-600
 
        const classLabel  = exam.className || `Class ${exam.classId}`;
        const section     = exam.section   || '—';
        const acYear      = exam.academicYear || '—';
        const examType    = formatExamType(exam.type);
        const totalSubj   = (exam.subjects || []).length;
        const startFmt    = exam.startDate ? new Date(exam.startDate).toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' }) : '—';
        const endFmt      = exam.endDate   ? new Date(exam.endDate).toLocaleDateString('en-IN',   { day:'2-digit', month:'short', year:'numeric' }) : '—';
 
        const infoLine1 = `Class: ${classLabel}   Section: ${section}   Academic Year: ${acYear}`;
        const infoLine2 = `Type: ${examType}   Duration: ${startFmt} – ${endFmt}   Total Subjects: ${totalSubj}`;
        doc.text(infoLine1, margin, 39);
        doc.text(infoLine2, margin, 45);
 
        // thin separator
        doc.setDrawColor(229, 231, 235);
        doc.setLineWidth(0.4);
        doc.line(margin, 49, pageW - margin, 49);
 
        // ── Table ────────────────────────────────────────────────────────────
        const rows = buildTimetableRows(exam);
 
        doc.autoTable({
            startY: 53,
            margin: { left: margin, right: margin },
            head: [[
                '#', 'Date', 'Day', 'Subject', 'Time', 'Duration',
                'Max Marks', 'Pass Marks', 'Room', 'Invigilator'
            ]],
            body: rows.map((r, i) => [
                i + 1,
                r.dateStr,
                r.dayOfWeek,
                r.subjectName,
                r.time,
                r.duration,
                r.maxMarks,
                r.passingMarks,
                r.room,
                r.invigilator
            ]),
            headStyles: {
                fillColor: [67, 118, 237],
                textColor: 255,
                fontStyle: 'bold',
                fontSize: 8.5,
                halign: 'center'
            },
            bodyStyles:       { fontSize: 8.5, textColor: [31, 41, 55] },
            alternateRowStyles: { fillColor: [249, 250, 251] },
            columnStyles: {
                0:  { halign: 'center', cellWidth: 8  },
                1:  { cellWidth: 26 },
                2:  { cellWidth: 22 },
                3:  { fontStyle: 'bold', cellWidth: 38 },
                4:  { cellWidth: 28 },
                5:  { halign: 'center', cellWidth: 20 },
                6:  { halign: 'center', cellWidth: 22 },
                7:  { halign: 'center', cellWidth: 22 },
                8:  { cellWidth: 22 },
                9:  { cellWidth: 30 }
            },
            didDrawPage: (data) => {
                // footer with page numbers
                const pageCount = doc.internal.getNumberOfPages();
                const pageNum   = doc.internal.getCurrentPageInfo().pageNumber;
                doc.setFontSize(8);
                doc.setTextColor(156, 163, 175);
                doc.text(
                    `Page ${pageNum} of ${pageCount}  |  ${exam.name}`,
                    pageW / 2,
                    doc.internal.pageSize.getHeight() - 8,
                    { align: 'center' }
                );
            }
        });
 
        // ── Description block (if present) ───────────────────────────────────
        if (exam.description) {
            const finalY = doc.lastAutoTable.finalY + 6;
            doc.setFontSize(8.5);
            doc.setTextColor(75, 85, 99);
            doc.setFont('helvetica', 'bold');
            doc.text('Notes / Instructions:', margin, finalY);
            doc.setFont('helvetica', 'normal');
            const wrapped = doc.splitTextToSize(exam.description, pageW - margin * 2);
            doc.text(wrapped, margin, finalY + 5);
        }
 
        // ── Save ─────────────────────────────────────────────────────────────
        const safeName  = (exam.name || 'timetable').replace(/[^a-z0-9_\-\s]/gi, '_').replace(/\s+/g, '_');
        const safeYear  = (exam.academicYear || '').replace(/[^a-z0-9\-]/gi, '');
        doc.save(`${safeName}_${safeYear}_timetable.pdf`);
        showToast('✅ PDF downloaded successfully!', 'success');
 
    } catch (err) {
        console.error('PDF generation error:', err);
        showToast('Failed to generate PDF. Please try CSV instead.', 'error');
    }
}
 
/**
 * CSV download — pure JS, no library needed.
 */
function downloadTimetableAsCSV() {
    document.getElementById('downloadFormatPicker')?.remove();
    const exam = currentTimetableExam;
    if (!exam) return;
 
    const rows = buildTimetableRows(exam);
 
    const headers = ['#', 'Date', 'Day', 'Subject', 'Time', 'Duration', 'Max Marks', 'Pass Marks', 'Room', 'Invigilator'];
 
    const escape = (val) => {
        const s = String(val ?? '');
        return s.includes(',') || s.includes('"') || s.includes('\n')
            ? `"${s.replace(/"/g, '""')}"`
            : s;
    };
 
    const csvLines = [
        // Exam info block at the top
        `Exam Timetable`,
        `Exam Name,${escape(exam.name)}`,
        `Class,${escape(exam.className || 'Class ' + exam.classId)}`,
        `Section,${escape(exam.section || '—')}`,
        `Academic Year,${escape(exam.academicYear || '—')}`,
        `Exam Type,${escape(formatExamType(exam.type))}`,
        `Start Date,${escape(exam.startDate || '—')}`,
        `End Date,${escape(exam.endDate || '—')}`,
        `Generated On,${escape(new Date().toLocaleDateString('en-IN'))}`,
        '',
        headers.map(escape).join(','),
        ...rows.map((r, i) => [
            i + 1,
            r.dateStr,
            r.dayOfWeek,
            r.subjectName,
            r.time,
            r.duration,
            r.maxMarks,
            r.passingMarks,
            r.room,
            r.invigilator
        ].map(escape).join(','))
    ];
 
    const csvContent   = csvLines.join('\r\n');
    const blob         = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' }); // BOM for Excel
    const url          = URL.createObjectURL(blob);
    const link         = document.createElement('a');
    const safeName     = (exam.name || 'timetable').replace(/[^a-z0-9_\-\s]/gi, '_').replace(/\s+/g, '_');
    const safeYear     = (exam.academicYear || '').replace(/[^a-z0-9\-]/gi, '');
    link.href          = url;
    link.download      = `${safeName}_${safeYear}_timetable.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
 
    showToast('✅ CSV downloaded! Open with Excel or Google Sheets.', 'success');
}
 
/**
 * Dynamically load a script from CDN only once.
 */
function loadScript(src, id) {
    return new Promise((resolve, reject) => {
        if (document.getElementById(id)) { resolve(); return; }
        const script   = document.createElement('script');
        script.src     = src;
        script.id      = id;
        script.onload  = resolve;
        script.onerror = () => reject(new Error(`Failed to load script: ${src}`));
        document.head.appendChild(script);
    });
}

// ============= TIMETABLE TAB =============
function loadTimetable() {
    const examId = document.getElementById('timetableExam')?.value;
    const classId = document.getElementById('timetableClass')?.value;

    if (!examId || !classId) {
        showToast('Please select both exam and class', 'error');
        return;
    }

    showLoading();

    setTimeout(() => {
        const exam = currentExams.find(e => String(e.id) === String(examId));
        if (exam) {
            // Filter subjects based on class if needed
            generateTimetableInTab(exam);
            showToast(`Timetable loaded for ${exam.name}`, 'success');
        } else {
            showToast('Exam not found', 'error');
        }
        hideLoading();
    }, 400);
}

function generateTimetableInTab(exam) {
    const timetableBody = document.getElementById('timetableBody');
    if (!timetableBody) return;

    timetableBody.innerHTML = '';

    if (!exam.subjects || exam.subjects.length === 0) {
        timetableBody.innerHTML = `
            <tr>
                <td colspan="7" class="px-6 py-8 text-center text-gray-500">
                    <i class="fas fa-info-circle text-2xl mb-2 block"></i>
                    No subjects found for this exam
                </td>
            </tr>
        `;
        return;
    }

    const startDate = exam.startDate ? new Date(exam.startDate) : new Date();
    const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

    exam.subjects.forEach((subject, index) => {
        const examDate = new Date(startDate);
        examDate.setDate(startDate.getDate() + index);

        // Format date
        const dateStr = examDate.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });

        const dayOfWeek = daysOfWeek[examDate.getDay() === 0 ? 6 : examDate.getDay() - 1];

        // Format time
        const startTimeFormatted = subject.startTime ? formatTimeForDisplay(subject.startTime) : '10:00 AM';
        const endTimeFormatted = subject.endTime ? formatTimeForDisplay(subject.endTime) : '1:00 PM';
        const timeRange = `${startTimeFormatted} - ${endTimeFormatted}`;

        // Calculate duration
        const duration = calculateDuration(subject.startTime, subject.endTime);

        const row = document.createElement('tr');
        row.className = 'hover:bg-gray-50 transition-colors';
        row.innerHTML = `
            <td class="px-6 py-4 text-sm text-gray-700">${dateStr}</td>
            <td class="px-6 py-4 text-sm text-gray-700">${dayOfWeek}</td>
            <td class="px-6 py-4 text-sm font-medium text-gray-900">${subject.name || subject.subjectName}</td>
            <td class="px-6 py-4 text-sm text-gray-700">${timeRange}</td>
            <td class="px-6 py-4 text-sm text-gray-700">${duration}</td>
            <td class="px-6 py-4 text-sm text-gray-700">${subject.maxMarks || 100}</td>
            <td class="px-6 py-4 text-sm">
                <button onclick="showExamTimetable(${exam.id})" 
                    class="text-blue-600 hover:text-blue-800 transition-colors" 
                    title="View Full Timetable">
                    <i class="fas fa-expand"></i>
                </button>
            </td>
        `;
        timetableBody.appendChild(row);
    });
}

function generateTimetableInTab(exam) {
    const timetableBody = document.getElementById('timetableBody');
    if (!timetableBody) return;

    timetableBody.innerHTML = '';

    if (!exam.subjects || exam.subjects.length === 0) {
        timetableBody.innerHTML = `
            <tr><td colspan="7" class="px-6 py-8 text-center text-gray-500">No subjects found for this exam</td></tr>
        `;
        return;
    }

    const startDate = exam.startDate ? new Date(exam.startDate) : new Date();
    const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

    exam.subjects.forEach((subject, index) => {
        const examDate = new Date(startDate);
        examDate.setDate(startDate.getDate() + index);

        const row = document.createElement('tr');
        row.innerHTML = `
            <td class="px-6 py-4 text-sm text-gray-700">${examDate.toISOString().split('T')[0]}</td>
            <td class="px-6 py-4 text-sm text-gray-700">${daysOfWeek[index % daysOfWeek.length]}</td>
            <td class="px-6 py-4 text-sm font-medium text-gray-900">${subject.name || subject.subjectName}</td>
            <td class="px-6 py-4 text-sm text-gray-700">${subject.startTime && subject.endTime ? subject.startTime + ' - ' + subject.endTime : '10:00 AM - 1:00 PM'}</td>
            <td class="px-6 py-4 text-sm text-gray-700">3 hours</td>
            <td class="px-6 py-4 text-sm text-gray-700">${subject.maxMarks || 100}</td>
            <td class="px-6 py-4 text-sm">
                <button onclick="showExamTimetable(${exam.id})" class="text-blue-600 hover:text-blue-800 mr-2" title="View Full Timetable">
                    <i class="fas fa-expand"></i>
                </button>
            </td>
        `;
        timetableBody.appendChild(row);
    });
}

// ============= SUBJECT MANAGEMENT =============
async function handleAddSubject() {
    const classId = document.getElementById('subjectClassSelect')?.value;
    const subjectCode = document.getElementById('subjectCode')?.value;
    const subjectName = document.getElementById('subjectName')?.value;
    const maxMarks = document.getElementById('subjectMaxMarks')?.value;
    const passingMarks = document.getElementById('subjectPassingMarks')?.value;

    if (!classId || !subjectCode || !subjectName || !maxMarks || !passingMarks) {
        showToast('Please fill all fields', 'error');
        return;
    }

    try {
        const response = await fetch(`${CLASS_API_BASE_URL}/add-subject/${classId}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            credentials: 'include',
            body: JSON.stringify({
                subjectCode: subjectCode,
                subjectName: subjectName,
                maxMarks: parseInt(maxMarks),
                passingMarks: parseInt(passingMarks)
            })
        });

        if (response.ok) {
            showToast('Subject added successfully', 'success');
            document.getElementById('addSubjectForm').reset();
            // Refresh subjects for the selected class
            if (document.getElementById('examClass').value === classId) {
                updateSubjectsForClass(classId);
            }
        } else {
            const error = await response.text();
            showToast('Failed to add subject: ' + error, 'error');
        }
    } catch (error) {
        console.error('Error adding subject:', error);
        showToast('Failed to add subject', 'error');
    }
}

// ============= UTILITY FUNCTIONS =============
function getStatusClass(status) {
    switch (status?.toUpperCase()) {
        case 'SCHEDULED': return 'bg-green-100 text-green-700';
        case 'ONGOING': return 'bg-yellow-100 text-yellow-700';
        case 'COMPLETED': return 'bg-gray-100 text-gray-700';
        default: return 'bg-blue-100 text-blue-700';
    }
}

function getStatusText(status) {
    switch (status?.toUpperCase()) {
        case 'SCHEDULED': return 'UPCOMING';
        case 'ONGOING': return 'ONGOING';
        case 'COMPLETED': return 'COMPLETED';
        default: return 'SCHEDULED';
    }
}

function formatDate(dateString) {
    if (!dateString) return 'TBA';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatExamType(type) {
    const types = {
        'TERM1': 'Term 1 Examination',
        'TERM2': 'Term 2 Examination',
        'TERM3': 'Term 3 Examination',
        'UNIT_TEST': 'Unit Test',
        'MID_TERM': 'Mid Term Examination',
        'FINAL': 'Final Examination'
    };
    return types[type] || type || 'Exam';
}

// ============= SIDEBAR =============
function setupSidebar() {
    const sidebar = document.getElementById('sidebar');
    const sidebarToggle = document.getElementById('sidebarToggle');
    const sidebarOverlay = document.getElementById('sidebarOverlay');
    const mainContent = document.getElementById('mainContent');
    const toggleIcon = document.getElementById('sidebarToggleIcon');

    if (!sidebar || !sidebarToggle) return;

    let isMobile = window.innerWidth < 1024;
    let sidebarCollapsed = false;

    function handleResize() {
        const wasMobile = isMobile;
        isMobile = window.innerWidth < 1024;

        if (wasMobile !== isMobile) {
            if (isMobile) {
                closeMobileSidebar();
            } else {
                sidebar.classList.remove('mobile-open');
                if (sidebarOverlay) sidebarOverlay.classList.remove('active');
                document.body.classList.remove('overflow-hidden');

                if (sidebarCollapsed) {
                    sidebar.classList.add('collapsed');
                    mainContent?.classList.add('sidebar-collapsed');
                    if (toggleIcon) toggleIcon.className = 'fas fa-bars text-xl';
                } else {
                    sidebar.classList.remove('collapsed');
                    mainContent?.classList.remove('sidebar-collapsed');
                    if (toggleIcon) toggleIcon.className = 'fas fa-times text-xl';
                }
            }
        }
    }

    function toggleSidebar() {
        if (isMobile) {
            sidebar.classList.contains('mobile-open') ? closeMobileSidebar() : openMobileSidebar();
        } else {
            sidebarCollapsed = !sidebarCollapsed;
            if (sidebarCollapsed) {
                sidebar.classList.add('collapsed');
                mainContent?.classList.add('sidebar-collapsed');
                if (toggleIcon) toggleIcon.className = 'fas fa-bars text-xl';
            } else {
                sidebar.classList.remove('collapsed');
                mainContent?.classList.remove('sidebar-collapsed');
                if (toggleIcon) toggleIcon.className = 'fas fa-times text-xl';
            }
        }
    }

    function openMobileSidebar() {
        sidebar.classList.add('mobile-open');
        sidebarOverlay?.classList.add('active');
        document.body.classList.add('overflow-hidden');
    }

    function closeMobileSidebar() {
        sidebar.classList.remove('mobile-open');
        sidebarOverlay?.classList.remove('active');
        document.body.classList.remove('overflow-hidden');
    }

    sidebarToggle.addEventListener('click', toggleSidebar);
    sidebarOverlay?.addEventListener('click', closeMobileSidebar);
    window.addEventListener('resize', handleResize);

    document.getElementById('logoutBtn')?.addEventListener('click', function (e) {
        e.preventDefault();
        if (confirm('Are you sure you want to logout?')) {
            window.location.href = '/login.html';
        }
    });
}

function setupDropdowns() {
    const notificationsBtn = document.getElementById('notificationsBtn');
    const notificationsDropdown = document.getElementById('notificationsDropdown');

    notificationsBtn?.addEventListener('click', function (e) {
        e.stopPropagation();
        notificationsDropdown?.classList.toggle('hidden');
    });

    const userMenuBtn = document.getElementById('userMenuBtn');
    const userMenuDropdown = document.getElementById('userMenuDropdown');

    userMenuBtn?.addEventListener('click', function (e) {
        e.stopPropagation();
        userMenuDropdown?.classList.toggle('hidden');
    });

    document.addEventListener('click', function () {
        notificationsDropdown?.classList.add('hidden');
        userMenuDropdown?.classList.add('hidden');
    });
}

// ============= TOAST NOTIFICATIONS =============
function showToast(message, type = 'info') {
    const toastContainer = document.getElementById('toastContainer');
    if (!toastContainer) return;

    const toast = document.createElement('div');
    toast.className = `toast toast-${type} bg-white border-l-4 ${type === 'success' ? 'border-green-500' : type === 'error' ? 'border-red-500' : 'border-blue-500'} shadow-lg rounded-lg p-4 mb-2 flex justify-between items-center`;

    toast.innerHTML = `
        <div class="flex items-center">
            <i class="fas ${getToastIcon(type)} mr-3 ${type === 'success' ? 'text-green-500' : type === 'error' ? 'text-red-500' : 'text-blue-500'}"></i>
            <span>${message}</span>
        </div>
        <button class="toast-close ml-4 text-gray-400 hover:text-gray-600">
            <i class="fas fa-times"></i>
        </button>
    `;

    toastContainer.appendChild(toast);

    setTimeout(() => {
        if (toast.parentNode) toast.remove();
    }, 5000);

    toast.querySelector('.toast-close').addEventListener('click', () => toast.remove());
}

function getToastIcon(type) {
    switch (type) {
        case 'success': return 'fa-check-circle';
        case 'error': return 'fa-exclamation-circle';
        case 'warning': return 'fa-exclamation-triangle';
        default: return 'fa-info-circle';
    }
}

function showLoading() {
    document.getElementById('loadingOverlay')?.classList.remove('hidden');
}

function hideLoading() {
    document.getElementById('loadingOverlay')?.classList.add('hidden');
}

// ============= EXPORT TO GLOBAL SCOPE =============
window.showExamTimetable = showExamTimetable;
window.closeTimetableModal = closeTimetableModal;
window.downloadTimetable = downloadTimetable;
window.downloadTimetableAsPDF = downloadTimetableAsPDF;
window.downloadTimetableAsCSV = downloadTimetableAsCSV;
window.editExam = openEditModal;
window.openEditModal = openEditModal;
window.closeEditModal = closeEditModal;
window.submitEditExam = submitEditExam;
window.addEditSubjectRow = addEditSubjectRow;
window.deleteExam = deleteExam;
window.openStatusModal = openStatusModal;
window.closeStatusModal = closeStatusModal;
window.submitStatusUpdate = submitStatusUpdate;
window.showSection = function (section) {
    console.log('Showing section:', section);
};