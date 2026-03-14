


// ============================================
// EXAM MANAGEMENT MODULE - COMPLETE
// Features: Table View, Filters, Timetable Modal, Reset
// ============================================

// ============= GLOBAL VARIABLES =============
let currentExams = [];           // Store all exams
let filteredExams = [];          // Store filtered exams
let currentSubjects = [];        // Store subjects for current class
let currentPage = 'create';      // Track current page
let currentPageNumber = 1;       // For pagination
const itemsPerPage = 10;         // Items per page

// ============= INITIALIZATION =============
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 Exam Management Module Initializing...');
    
    initializeExamModule();
    setupSidebar();
    setupDropdowns();
    loadSampleData();
    createTimetableModal(); // Create modal on load
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
    loadExamsFromStorage();
    
    console.log('✅ Exam module initialized successfully');
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
        button.addEventListener('click', function() {
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
            
            // If switching to schedule tab, refresh the table
            if (currentPage === 'schedule') {
                renderExamsTable();
            }
        });
    });
}

// ============= FILTER HANDLERS =============

function setupFilterHandlers() {
    // Filter inputs
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
    
    // Reset button
    const resetBtn = document.getElementById('resetFilters');
    if (resetBtn) {
        resetBtn.addEventListener('click', resetAllFilters);
    }
    
    // Pagination
    const prevBtn = document.getElementById('prevPage');
    const nextBtn = document.getElementById('nextPage');
    
    if (prevBtn) prevBtn.addEventListener('click', previousPage);
    if (nextBtn) nextBtn.addEventListener('click', nextPage);
}

/**
 * Filter exams based on all filter criteria
 */
function filterExams() {
    const searchTerm = document.getElementById('searchExam')?.value.toLowerCase() || '';
    const classFilter = document.getElementById('scheduleClass')?.value || '';
    const typeFilter = document.getElementById('scheduleExamType')?.value || '';
    const statusFilter = document.getElementById('scheduleStatus')?.value || '';
    const dateFilter = document.getElementById('scheduleDate')?.value || '';
    
    filteredExams = currentExams.filter(exam => {
        // Search filter (exam name, class, section)
        if (searchTerm) {
            const searchableText = `${exam.name} ${exam.className || ''} ${exam.section || ''}`.toLowerCase();
            if (!searchableText.includes(searchTerm)) return false;
        }
        
        // Class filter
        if (classFilter && exam.classId != classFilter) return false;
        
        // Exam type filter
        if (typeFilter && exam.type !== typeFilter) return false;
        
        // Status filter
        if (statusFilter && exam.status !== statusFilter) return false;
        
        // Date filter
        if (dateFilter) {
            const examStart = new Date(exam.startDate);
            const filterDate = new Date(dateFilter);
            if (examStart.toDateString() !== filterDate.toDateString()) return false;
        }
        
        return true;
    });
    
    // Reset to first page
    currentPageNumber = 1;
    
    // Render table with filtered data
    renderExamsTable();
    
    // Update filter stats
    updateFilterStats();
}

/**
 * Reset all filters to default values
 */
function resetAllFilters() {
    // Reset input values
    const searchInput = document.getElementById('searchExam');
    const classFilter = document.getElementById('scheduleClass');
    const typeFilter = document.getElementById('scheduleExamType');
    const statusFilter = document.getElementById('scheduleStatus');
    const dateFilter = document.getElementById('scheduleDate');
    
    if (searchInput) searchInput.value = '';
    if (classFilter) classFilter.value = '';
    if (typeFilter) typeFilter.value = '';
    if (statusFilter) statusFilter.value = '';
    if (dateFilter) dateFilter.value = '';
    
    // Reset filtered exams to all exams
    filteredExams = [...currentExams];
    currentPageNumber = 1;
    
    // Re-render table
    renderExamsTable();
    
    // Update filter stats
    updateFilterStats();
    
    showToast('Filters reset successfully', 'success');
}

/**
 * Update filter statistics display
 */
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

/**
 * Render exams in table format
 */
function renderExamsTable() {
    const tableBody = document.getElementById('examsTableBody');
    const tableInfo = document.getElementById('tableInfo');
    const noDataMessage = document.getElementById('noExamsMessage');
    
    if (!tableBody) return;
    
    // Calculate pagination
    const startIndex = (currentPageNumber - 1) * itemsPerPage;
    const endIndex = Math.min(startIndex + itemsPerPage, filteredExams.length);
    const pageData = filteredExams.slice(startIndex, endIndex);
    
    // Clear table
    tableBody.innerHTML = '';
    
    if (pageData.length === 0) {
        // Show no data message
        if (noDataMessage) noDataMessage.classList.remove('hidden');
        if (tableInfo) tableInfo.innerHTML = 'Showing 0 exams';
        updatePaginationControls(0);
        return;
    }
    
    if (noDataMessage) noDataMessage.classList.add('hidden');
    
    // Add rows
    pageData.forEach((exam, index) => {
        const row = createExamRow(exam, startIndex + index + 1);
        tableBody.appendChild(row);
    });
    
    // Update table info
    if (tableInfo) {
        tableInfo.innerHTML = `Showing ${startIndex + 1}-${endIndex} of ${filteredExams.length} exams`;
    }
    
    // Update pagination controls
    updatePaginationControls(filteredExams.length);
}

/**
 * Create a table row for an exam
 */
function createExamRow(exam, serialNo) {
    const row = document.createElement('tr');
    row.className = 'hover:bg-gray-50 transition-colors';
    
    const statusClass = getStatusClass(exam.status);
    const statusText = getStatusText(exam.status);
    
    // Format dates
    const startDate = exam.startDate ? formatDate(exam.startDate) : 'TBA';
    const endDate = exam.endDate ? formatDate(exam.endDate) : 'TBA';
    
    // Calculate total marks
    const totalMarks = exam.subjects?.reduce((total, sub) => total + (sub.maxMarks || 0), 0) || 0;
    
    row.innerHTML = `
        <td class="px-4 py-4 whitespace-nowrap text-sm text-gray-700">${serialNo}</td>
        <td class="px-4 py-4 whitespace-nowrap">
            <div class="font-medium text-gray-900">${exam.name}</div>
            <div class="text-xs text-gray-500">${exam.type || 'Exam'}</div>
        </td>
        <td class="px-4 py-4 whitespace-nowrap text-sm text-gray-700">
            ${exam.className || `Class ${exam.classId}`} - ${exam.section || 'A'}
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
            <button onclick="showExamTimetable(${exam.id})" class="text-blue-600 hover:text-blue-900 mr-3" title="View Timetable">
                <i class="fas fa-calendar-alt"></i>
            </button>
            <button onclick="editExam(${exam.id})" class="text-green-600 hover:text-green-900 mr-3" title="Edit">
                <i class="fas fa-edit"></i>
            </button>
            <button onclick="deleteExam(${exam.id})" class="text-red-600 hover:text-red-900" title="Delete">
                <i class="fas fa-trash"></i>
            </button>
        </td>
    `;
    
    return row;
}

/**
 * Update pagination controls
 */
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

// ============= TIMETABLE MODAL =============

/**
 * Create timetable modal element
 */
function createTimetableModal() {
    // Check if modal already exists
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
                <!-- Exam Info Cards -->
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
                
                <!-- Timetable Table -->
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
                        <tbody id="timetableModalBody" class="bg-white divide-y divide-gray-200">
                            <!-- Data will be populated dynamically -->
                        </tbody>
                    </table>
                </div>
                
                <!-- Description -->
                <div class="mt-6 p-4 bg-gray-50 rounded-lg">
                    <h4 class="font-semibold text-gray-700 mb-2">📝 Description</h4>
                    <p class="text-gray-600" id="modalDescription">-</p>
                </div>
                
                <!-- Download Button -->
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

/**
 * Show exam details in timetable format modal
 */
function showExamTimetable(examId) {
    const exam = currentExams.find(e => e.id === examId);
    if (!exam) {
        showToast('Exam not found', 'error');
        return;
    }
    
    // Create modal if it doesn't exist
    let modal = document.getElementById('timetableModal');
    if (!modal) {
        createTimetableModal();
        modal = document.getElementById('timetableModal');
    }
    
    // Populate modal with exam data
    populateTimetableModal(exam);
    
    // Show modal
    modal.classList.remove('hidden');
    document.body.classList.add('overflow-hidden');
}

/**
 * Populate timetable modal with exam data
 */
function populateTimetableModal(exam) {
    // Update header info
    document.getElementById('modalExamName').textContent = exam.name;
    document.getElementById('modalExamDetails').textContent = 
        `${exam.className || `Class ${exam.classId}`} - Section ${exam.section} | ${exam.academicYear}`;
    
    // Update info cards
    document.getElementById('modalExamType').textContent = formatExamType(exam.type);
    
    // Calculate total days
    const startDate = exam.startDate ? new Date(exam.startDate) : new Date();
    const endDate = exam.endDate ? new Date(exam.endDate) : new Date();
    const diffTime = Math.abs(endDate - startDate);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    document.getElementById('modalDuration').textContent = `${diffDays} days`;
    
    document.getElementById('modalTotalSubjects').textContent = exam.subjects?.length || 0;
    
    const totalMarks = exam.subjects?.reduce((total, sub) => total + (sub.maxMarks || 0), 0) || 0;
    document.getElementById('modalTotalMarks').textContent = totalMarks;
    
    document.getElementById('modalDescription').textContent = exam.description || 'No description provided';
    
    // Generate timetable rows
    const timetableBody = document.getElementById('timetableModalBody');
    timetableBody.innerHTML = '';
    
    if (!exam.subjects || exam.subjects.length === 0) {
        timetableBody.innerHTML = `
            <tr>
                <td colspan="8" class="px-6 py-8 text-center text-gray-500">
                    No subjects found for this exam
                </td>
            </tr>
        `;
        return;
    }
    
    const startDateObj = exam.startDate ? new Date(exam.startDate) : new Date();
    const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    
    // Sample timings - in real app, these would come from backend
    const timings = [
        { time: '10:00 AM - 1:00 PM', duration: '3 hours' },
        { time: '10:00 AM - 12:30 PM', duration: '2.5 hours' },
        { time: '2:00 PM - 4:00 PM', duration: '2 hours' },
        { time: '9:00 AM - 12:00 PM', duration: '3 hours' }
    ];
    
    // Sample rooms
    const rooms = ['Room 101', 'Room 102', 'Room 103', 'Room 104', 'Lab 1', 'Lab 2'];
    
    exam.subjects.forEach((subject, index) => {
        const examDate = new Date(startDateObj);
        examDate.setDate(startDateObj.getDate() + index);
        const dateStr = examDate.toISOString().split('T')[0];
        const dayOfWeek = daysOfWeek[examDate.getDay()];
        
        // Select timing based on index
        const timing = timings[index % timings.length];
        const room = rooms[index % rooms.length];
        
        const row = document.createElement('tr');
        row.innerHTML = `
            <td class="px-6 py-4 text-sm text-gray-700">${formatDate(dateStr)}</td>
            <td class="px-6 py-4 text-sm text-gray-700">${dayOfWeek}</td>
            <td class="px-6 py-4 text-sm font-medium text-gray-900">${subject.name}</td>
            <td class="px-6 py-4 text-sm text-gray-700">${timing.time}</td>
            <td class="px-6 py-4 text-sm text-gray-700">${timing.duration}</td>
            <td class="px-6 py-4 text-sm text-gray-700">${subject.maxMarks || 100}</td>
            <td class="px-6 py-4 text-sm text-gray-700">${subject.passingMarks || Math.floor((subject.maxMarks || 100) * 0.33)}</td>
            <td class="px-6 py-4 text-sm text-gray-700">${room}</td>
        `;
        
        timetableBody.appendChild(row);
    });
}

/**
 * Close timetable modal
 */
function closeTimetableModal() {
    const modal = document.getElementById('timetableModal');
    if (modal) {
        modal.classList.add('hidden');
        document.body.classList.remove('overflow-hidden');
    }
}

/**
 * Download timetable as image/PDF (simulated)
 */
function downloadTimetable() {
    showToast('Timetable download started', 'success');
    // In real app, this would generate PDF
}

// ============= FORM HANDLERS =============

function setupFormHandlers() {
    const createExamForm = document.getElementById('createExamForm');
    if (createExamForm) {
        createExamForm.addEventListener('submit', function(e) {
            e.preventDefault();
            createNewExam();
        });
    }
    
    const examClassSelect = document.getElementById('examClass');
    if (examClassSelect) {
        examClassSelect.addEventListener('change', function() {
            updateSubjectsForClass(this.value);
        });
    }
    
    const loadTimetableBtn = document.getElementById('loadTimetableBtn');
    if (loadTimetableBtn) {
        loadTimetableBtn.addEventListener('click', loadTimetable);
    }
    
    const addSubjectBtn = document.getElementById('addSubjectBtn');
    if (addSubjectBtn) {
        addSubjectBtn.addEventListener('click', function() {
            showToast('Add subject functionality - Coming soon', 'info');
        });
    }
    
    const resetBtn = document.querySelector('button[type="reset"]');
    if (resetBtn) {
        resetBtn.addEventListener('click', resetExamForm);
    }
}

// ============= SUBJECT CHECKBOXES =============

function setupSubjectCheckboxes() {
    document.querySelectorAll('.subject-checkbox').forEach(checkbox => {
        checkbox.addEventListener('change', function() {
            const marksInput = this.closest('.subject-item').querySelector('.subject-marks');
            marksInput.disabled = !this.checked;
            if (!this.checked) {
                marksInput.value = '';
            }
        });
    });
}

function updateSubjectsForClass(className) {
    if (!className) {
        showToast('Please select a class', 'warning');
        return;
    }
    
    console.log('📚 Loading subjects for class:', className);
    
    const subjectsByClass = {
        '10': ['Mathematics', 'Science', 'English', 'Social Studies', 'Hindi', 'Sanskrit'],
        '11': ['Physics', 'Chemistry', 'Mathematics', 'Biology', 'English'],
        '12': ['Physics', 'Chemistry', 'Mathematics', 'Biology', 'English', 'Computer Science']
    };
    
    const subjects = subjectsByClass[className] || 
        ['Mathematics', 'Science', 'English', 'Social Studies', 'Hindi'];
    
    updateSubjectsUI(subjects);
    showToast(`Subjects loaded for Class ${className}`, 'success');
}

function updateSubjectsUI(subjects) {
    const subjectsList = document.getElementById('subjectsList');
    if (!subjectsList) return;
    
    subjectsList.innerHTML = '';
    
    subjects.forEach((subject, index) => {
        const subjectId = `subject_${index}_${Date.now()}`;
        const subjectItem = document.createElement('div');
        subjectItem.className = 'flex items-center p-3 border border-gray-200 rounded-lg subject-item';
        
        subjectItem.innerHTML = `
            <input type="checkbox" id="${subjectId}" class="h-4 w-4 text-blue-600 border-gray-300 rounded subject-checkbox">
            <label for="${subjectId}" class="ml-3 text-sm text-gray-700">${subject}</label>
            <input type="number" placeholder="Max Marks" class="ml-auto w-20 px-2 py-1 border border-gray-300 rounded text-sm subject-marks" disabled>
        `;
        
        subjectsList.appendChild(subjectItem);
    });
    
    setupSubjectCheckboxes();
}

// ============= CREATE EXAM =============

function createNewExam() {
    console.log('📝 Creating new exam...');
    
    const examData = {
        id: Date.now(),
        name: document.getElementById('examName')?.value || '',
        type: document.getElementById('examType')?.value || '',
        academicYear: document.getElementById('academicYear')?.value || '',
        classId: document.getElementById('examClass')?.value || '',
        className: getClassName(document.getElementById('examClass')?.value || ''),
        section: document.getElementById('examSection')?.value || '',
        startDate: document.getElementById('startDate')?.value || '',
        endDate: document.getElementById('endDate')?.value || '',
        description: document.getElementById('examDescription')?.value || '',
        subjects: [],
        status: 'SCHEDULED',
        createdAt: new Date().toISOString()
    };
    
    document.querySelectorAll('.subject-checkbox:checked').forEach(checkbox => {
        const subjectItem = checkbox.closest('.subject-item');
        const subjectName = subjectItem.querySelector('label').textContent.trim();
        const maxMarks = subjectItem.querySelector('.subject-marks').value;
        
        examData.subjects.push({
            name: subjectName,
            maxMarks: maxMarks ? parseInt(maxMarks) : 100,
            passingMarks: Math.floor((maxMarks ? parseInt(maxMarks) : 100) * 0.33)
        });
    });
    
    const validationError = validateExamData(examData);
    if (validationError) {
        showToast(validationError, 'error');
        return;
    }
    
    saveExamToStorage(examData);
    showToast(`✅ Exam "${examData.name}" created successfully!`, 'success');
    resetExamForm();
    
    // Switch to schedule tab to show the new exam
    document.getElementById('scheduleTab')?.click();
}

function validateExamData(examData) {
    if (!examData.name) return 'Exam name is required';
    if (!examData.type) return 'Exam type is required';
    if (!examData.academicYear) return 'Academic year is required';
    if (!examData.classId) return 'Class is required';
    if (!examData.section) return 'Section is required';
    if (!examData.startDate) return 'Start date is required';
    if (!examData.endDate) return 'End date is required';
    if (examData.subjects.length === 0) return 'Please select at least one subject';
    
    return null;
}

function getClassName(classId) {
    const classNames = {
        '1': 'Class 1', '2': 'Class 2', '3': 'Class 3', '4': 'Class 4',
        '5': 'Class 5', '6': 'Class 6', '7': 'Class 7', '8': 'Class 8',
        '9': 'Class 9', '10': 'Class 10', '11': 'Class 11', '12': 'Class 12'
    };
    return classNames[classId] || `Class ${classId}`;
}

function resetExamForm() {
    const form = document.getElementById('createExamForm');
    if (form) form.reset();
    
    document.querySelectorAll('.subject-checkbox').forEach(cb => {
        cb.checked = false;
        const marksInput = cb.closest('.subject-item')?.querySelector('.subject-marks');
        if (marksInput) {
            marksInput.disabled = true;
            marksInput.value = '';
        }
    });
}

// ============= EXAM STORAGE =============

function saveExamToStorage(examData) {
    let exams = JSON.parse(localStorage.getItem('exams')) || [];
    exams.push(examData);
    localStorage.setItem('exams', JSON.stringify(exams));
    currentExams = exams;
    filteredExams = [...currentExams];
    console.log('💾 Exam saved to storage:', examData);
}

function loadExamsFromStorage() {
    currentExams = JSON.parse(localStorage.getItem('exams')) || [];
    filteredExams = [...currentExams];
    console.log(`📚 Loaded ${currentExams.length} exams from storage`);
    
    updateExamStats(currentExams);
    renderExamsTable();
    updateFilterStats();
}

// ============= EXAM STATISTICS =============

function updateExamStats(exams) {
    const totalExams = exams.length;
    const upcoming = exams.filter(e => e.status === 'SCHEDULED').length;
    const ongoing = exams.filter(e => e.status === 'ONGOING').length;
    const completed = exams.filter(e => e.status === 'COMPLETED').length;
    
    const statCards = document.querySelectorAll('.grid-cols-4 .bg-white');
    if (statCards.length >= 4) {
        const totalElement = statCards[0]?.querySelector('.text-2xl');
        if (totalElement) totalElement.textContent = totalExams || '0';
        
        const upcomingElement = statCards[1]?.querySelector('.text-2xl');
        if (upcomingElement) upcomingElement.textContent = upcoming || '0';
        
        const completedElement = statCards[2]?.querySelector('.text-2xl');
        if (completedElement) completedElement.textContent = completed || '0';
    }
}

// ============= EXAM CRUD OPERATIONS =============

function editExam(examId) {
    const exam = currentExams.find(e => e.id === examId);
    if (!exam) {
        showToast('Exam not found', 'error');
        return;
    }
    
    // Switch to create tab and populate form
    document.getElementById('createExamTab')?.click();
    
    // Populate form with exam data
    document.getElementById('examName').value = exam.name;
    document.getElementById('examType').value = exam.type;
    document.getElementById('academicYear').value = exam.academicYear;
    document.getElementById('examClass').value = exam.classId;
    document.getElementById('examSection').value = exam.section;
    document.getElementById('startDate').value = exam.startDate;
    document.getElementById('endDate').value = exam.endDate;
    document.getElementById('examDescription').value = exam.description || '';
    
    showToast('Edit mode - Please update and save', 'info');
}

function deleteExam(examId) {
    if (!confirm('Are you sure you want to delete this exam?')) return;
    
    currentExams = currentExams.filter(e => e.id !== examId);
    filteredExams = filteredExams.filter(e => e.id !== examId);
    
    localStorage.setItem('exams', JSON.stringify(currentExams));
    
    showToast('Exam deleted successfully', 'success');
    
    updateExamStats(currentExams);
    renderExamsTable();
    updateFilterStats();
}

// ============= UTILITY FUNCTIONS =============

function getStatusClass(status) {
    switch(status?.toUpperCase()) {
        case 'SCHEDULED': return 'bg-green-100 text-green-700';
        case 'ONGOING': return 'bg-yellow-100 text-yellow-700';
        case 'COMPLETED': return 'bg-gray-100 text-gray-700';
        default: return 'bg-blue-100 text-blue-700';
    }
}

function getStatusText(status) {
    switch(status?.toUpperCase()) {
        case 'SCHEDULED': return 'UPCOMING';
        case 'ONGOING': return 'ONGOING';
        case 'COMPLETED': return 'COMPLETED';
        default: return 'SCHEDULED';
    }
}

function formatDate(dateString) {
    if (!dateString) return 'TBA';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric', 
        year: 'numeric' 
    });
}

function formatExamType(type) {
    const types = {
        'TERM1': 'Term 1 Examination',
        'TERM2': 'Term 2 Examination',
        'TERM3': 'Term 3 Examination',
        'UNIT_TEST': 'Unit Test',
        'MID_TERM': 'Mid Term Examination',
        'FINAL': 'Final Examination',
        'PRACTICAL': 'Practical Exam',
        'VIVA': 'Viva Voce'
    };
    return types[type] || type;
}

// ============= SIDEBAR FUNCTIONS =============

function setupSidebar() {
    const sidebar = document.getElementById('sidebar');
    const sidebarToggle = document.getElementById('sidebarToggle');
    const sidebarOverlay = document.getElementById('sidebarOverlay');
    const mainContent = document.getElementById('mainContent');
    const toggleIcon = document.getElementById('sidebarToggleIcon');
    
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
                sidebarOverlay.classList.remove('active');
                document.body.classList.remove('overflow-hidden');
                
                if (sidebarCollapsed) {
                    sidebar.classList.add('collapsed');
                    mainContent.classList.add('sidebar-collapsed');
                    toggleIcon.className = 'fas fa-bars text-xl';
                } else {
                    sidebar.classList.remove('collapsed');
                    mainContent.classList.remove('sidebar-collapsed');
                    toggleIcon.className = 'fas fa-times text-xl';
                }
            }
        }
    }
    
    function toggleSidebar() {
        if (isMobile) {
            if (sidebar.classList.contains('mobile-open')) {
                closeMobileSidebar();
            } else {
                openMobileSidebar();
            }
        } else {
            sidebarCollapsed = !sidebarCollapsed;
            
            if (sidebarCollapsed) {
                sidebar.classList.add('collapsed');
                mainContent.classList.add('sidebar-collapsed');
                toggleIcon.className = 'fas fa-bars text-xl';
            } else {
                sidebar.classList.remove('collapsed');
                mainContent.classList.remove('sidebar-collapsed');
                toggleIcon.className = 'fas fa-times text-xl';
            }
        }
    }
    
    function openMobileSidebar() {
        sidebar.classList.add('mobile-open');
        sidebarOverlay.classList.add('active');
        document.body.classList.add('overflow-hidden');
    }
    
    function closeMobileSidebar() {
        sidebar.classList.remove('mobile-open');
        sidebarOverlay.classList.remove('active');
        document.body.classList.remove('overflow-hidden');
    }
    
    sidebarToggle.addEventListener('click', toggleSidebar);
    sidebarOverlay.addEventListener('click', closeMobileSidebar);
    window.addEventListener('resize', handleResize);
    
    // document.getElementById('logoutBtn')?.addEventListener('click', function(e) {
    //     e.preventDefault();
    //     if (confirm('Are you sure you want to logout?')) {
    //         window.location.href = '/login.html';
    //     }
    // });
}

function setupDropdowns() {
    const notificationsBtn = document.getElementById('notificationsBtn');
    const notificationsDropdown = document.getElementById('notificationsDropdown');
    
    notificationsBtn?.addEventListener('click', function(e) {
        e.stopPropagation();
        notificationsDropdown.classList.toggle('hidden');
    });
    
    const userMenuBtn = document.getElementById('userMenuBtn');
    const userMenuDropdown = document.getElementById('userMenuDropdown');
    
    userMenuBtn?.addEventListener('click', function(e) {
        e.stopPropagation();
        userMenuDropdown.classList.toggle('hidden');
    });
    
    document.addEventListener('click', function() {
        notificationsDropdown?.classList.add('hidden');
        userMenuDropdown?.classList.add('hidden');
    });
}

// ============= TOAST NOTIFICATIONS =============

function showToast(message, type = 'info') {
    const toastContainer = document.getElementById('toastContainer');
    if (!toastContainer) return;
    
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    
    toast.innerHTML = `
        <div class="flex items-center">
            <i class="fas ${getToastIcon(type)} mr-3"></i>
            <span>${message}</span>
        </div>
        <button class="toast-close ml-4">
            <i class="fas fa-times"></i>
        </button>
    `;
    
    toastContainer.appendChild(toast);
    
    setTimeout(() => {
        if (toast.parentNode) {
            toast.remove();
        }
    }, 5000);
    
    toast.querySelector('.toast-close').addEventListener('click', function() {
        toast.remove();
    });
}

function getToastIcon(type) {
    switch(type) {
        case 'success': return 'fa-check-circle';
        case 'error': return 'fa-exclamation-circle';
        case 'warning': return 'fa-exclamation-triangle';
        default: return 'fa-info-circle';
    }
}

function showLoading() {
    const overlay = document.getElementById('loadingOverlay');
    if (overlay) overlay.classList.remove('hidden');
}

function hideLoading() {
    const overlay = document.getElementById('loadingOverlay');
    if (overlay) overlay.classList.add('hidden');
}

// ============= SAMPLE DATA =============

function loadSampleData() {
    if (localStorage.getItem('exams')) {
        loadExamsFromStorage();
        return;
    }
    
    console.log('📦 Loading sample exam data...');
    
    const sampleExams = [
        {
            id: 1,
            name: 'Term 1 Examination',
            type: 'TERM1',
            academicYear: '2024-2025',
            classId: '10',
            className: 'Class 10',
            section: 'A',
            startDate: '2024-04-15',
            endDate: '2024-04-30',
            description: 'First term examinations for Class 10 covering all subjects as per CBSE syllabus.',
            subjects: [
                { name: 'Mathematics', maxMarks: 100, passingMarks: 33 },
                { name: 'Science', maxMarks: 100, passingMarks: 33 },
                { name: 'English', maxMarks: 100, passingMarks: 33 },
                { name: 'Social Studies', maxMarks: 100, passingMarks: 33 },
                { name: 'Hindi', maxMarks: 100, passingMarks: 33 },
                { name: 'Sanskrit', maxMarks: 100, passingMarks: 33 }
            ],
            status: 'SCHEDULED',
            createdAt: '2024-03-01T10:30:00'
        },
        {
            id: 2,
            name: 'Unit Test 2',
            type: 'UNIT_TEST',
            academicYear: '2024-2025',
            classId: '9',
            className: 'Class 9',
            section: 'B',
            startDate: '2024-03-10',
            endDate: '2024-03-15',
            description: 'Second unit test for Class 9 - Covering chapters 4-7',
            subjects: [
                { name: 'Mathematics', maxMarks: 50, passingMarks: 17 },
                { name: 'Science', maxMarks: 50, passingMarks: 17 },
                { name: 'English', maxMarks: 50, passingMarks: 17 },
                { name: 'Social Studies', maxMarks: 50, passingMarks: 17 }
            ],
            status: 'ONGOING',
            createdAt: '2024-02-15T09:15:00'
        },
        {
            id: 3,
            name: 'Mid Term Examination',
            type: 'MID_TERM',
            academicYear: '2024-2025',
            classId: '12',
            className: 'Class 12',
            section: 'C',
            startDate: '2024-02-01',
            endDate: '2024-02-15',
            description: 'Mid term examinations for Class 12 Science stream',
            subjects: [
                { name: 'Physics', maxMarks: 100, passingMarks: 33 },
                { name: 'Chemistry', maxMarks: 100, passingMarks: 33 },
                { name: 'Mathematics', maxMarks: 100, passingMarks: 33 },
                { name: 'Biology', maxMarks: 100, passingMarks: 33 },
                { name: 'English', maxMarks: 100, passingMarks: 33 }
            ],
            status: 'COMPLETED',
            createdAt: '2024-01-10T11:45:00'
        }
    ];
    
    localStorage.setItem('exams', JSON.stringify(sampleExams));
    currentExams = sampleExams;
    filteredExams = [...sampleExams];
    
    updateExamStats(sampleExams);
    renderExamsTable();
    updateFilterStats();
    
    console.log('✅ Sample data loaded successfully');
}

// ============= LOAD TIMETABLE (for timetable tab) =============

function loadTimetable() {
    const examId = document.getElementById('timetableExam')?.value;
    const className = document.getElementById('timetableClass')?.value;
    
    if (!examId || !className) {
        showToast('Please select both exam and class', 'error');
        return;
    }
    
    showLoading();
    
    setTimeout(() => {
        const exam = currentExams.find(e => e.id == examId);
        
        if (exam) {
            showToast(`Timetable loaded for ${exam.name}`, 'success');
            generateSampleTimetable(exam);
        } else {
            showToast('Exam not found', 'error');
        }
        
        hideLoading();
    }, 800);
}

function generateSampleTimetable(exam) {
    const timetableBody = document.getElementById('timetableBody');
    if (!timetableBody) return;
    
    timetableBody.innerHTML = '';
    
    if (!exam.subjects || exam.subjects.length === 0) {
        timetableBody.innerHTML = `
            <tr>
                <td colspan="7" class="px-6 py-8 text-center text-gray-500">
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
        
        const row = document.createElement('tr');
        row.innerHTML = `
            <td class="px-6 py-4 text-sm text-gray-700">${examDate.toISOString().split('T')[0]}</td>
            <td class="px-6 py-4 text-sm text-gray-700">${daysOfWeek[index % daysOfWeek.length]}</td>
            <td class="px-6 py-4 text-sm font-medium text-gray-900">${subject.name}</td>
            <td class="px-6 py-4 text-sm text-gray-700">10:00 AM - 1:00 PM</td>
            <td class="px-6 py-4 text-sm text-gray-700">3 hours</td>
            <td class="px-6 py-4 text-sm text-gray-700">${subject.maxMarks || 100}</td>
            <td class="px-6 py-4 text-sm">
                <button class="text-blue-600 hover:text-blue-800 mr-2"><i class="fas fa-edit"></i></button>
                <button class="text-red-600 hover:text-red-800"><i class="fas fa-trash"></i></button>
            </td>
        `;
        
        timetableBody.appendChild(row);
    });
}

// ============= EXPORT FUNCTIONS TO GLOBAL SCOPE =============

window.showExamTimetable = showExamTimetable;
window.closeTimetableModal = closeTimetableModal;
window.downloadTimetable = downloadTimetable;
window.editExam = editExam;
window.deleteExam = deleteExam;
window.filterExams = filterExams;
window.resetAllFilters = resetAllFilters;
window.previousPage = previousPage;
window.nextPage = nextPage;
window.loadTimetable = loadTimetable;
