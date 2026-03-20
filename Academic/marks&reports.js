// Marks and Reports Management Module
// Backend API base URL
const API_BASE = 'http://localhost:8084/api';

// Global variables
let examTypes = [];
let classes = [];
let sections = [];
let students = [];
let marksData = [];
let academicYears = generateAcademicYears();
let currentEditMarksId = null;

// Initialize application
document.addEventListener('DOMContentLoaded', function() {
    initializeMarksModule();
});

// ─────────────────────────────────────────────────────────────
// INITIALIZE MODULE
// ─────────────────────────────────────────────────────────────
async function initializeMarksModule() {
    console.log('Initializing marks module...');
    showLoadingOverlay(true);
    
    try {
        await loadInitialData();
        setupTabNavigation();
        setupDropdowns();
        setupFormHandlers();
        setupMarksTable();
        setupReportHandlers();
        setupModals();
        setupOtherSubjectAdder();
        setupSidebar();
        
        // Set default date to today
        const assessmentDate = document.getElementById('assessmentDate');
        if (assessmentDate) {
            assessmentDate.valueAsDate = new Date();
        }
        
        console.log('Marks module initialized successfully');
    } catch (error) {
        console.error('Error initializing module:', error);
        showToast('Error loading initial data: ' + error.message, 'error');
    } finally {
        showLoadingOverlay(false);
    }
}

// ─────────────────────────────────────────────────────────────
// LOAD INITIAL DATA FROM BACKEND
// ─────────────────────────────────────────────────────────────
async function loadInitialData() {
    try {
        // Load exam types
        const examTypesResult = await apiFetch(`${API_BASE}/marks/exam-types`);
        if (examTypesResult.ok) {
            examTypes = examTypesResult.data.data || [];
            console.log('Loaded exam types:', examTypes);
        }
        
        // Load classes from students
        const studentsResult = await apiFetch(`${API_BASE}/students/get-all-students?page=0&size=1000`);
        if (studentsResult.ok) {
            const pageData = studentsResult.data;
            const allStudents = pageData.content || [];
            
            // Extract unique classes
            const classSet = new Set();
            allStudents.forEach(student => {
                if (student.currentClass) {
                    classSet.add(student.currentClass);
                }
            });
            classes = Array.from(classSet).sort();
            
            // Store all students for later use
            students = allStudents;
            
            console.log('Loaded classes:', classes);
            console.log('Total students:', students.length);
        }
    } catch (error) {
        console.error('Error loading initial data:', error);
        throw error;
    }
}

// ─────────────────────────────────────────────────────────────
// API HELPERS
// ─────────────────────────────────────────────────────────────
function getAuthHeaders() {
    const token = localStorage.getItem('admin_jwt_token');
    return {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
    };
}

async function apiFetch(url, options = {}) {
    try {
        const response = await fetch(url, {
            ...options,
            headers: {
                ...getAuthHeaders(),
                ...(options.headers || {})
            },
            mode: 'cors',
            credentials: 'include'
        });
        
        const data = await response.json();
        return { 
            ok: response.ok, 
            status: response.status, 
            data: data 
        };
    } catch (err) {
        console.error('API Fetch Error:', err);
        return { 
            ok: false, 
            status: 0, 
            data: { error: err.message } 
        };
    }
}

// ─────────────────────────────────────────────────────────────
// GENERATE ACADEMIC YEARS
// ─────────────────────────────────────────────────────────────
function generateAcademicYears() {
    const years = [];
    const currentYear = new Date().getFullYear();
    for (let i = 0; i < 5; i++) {
        const startYear = currentYear - i;
        const endYear = startYear + 1;
        years.push(`${startYear}-${endYear}`);
    }
    return years;
}

// ─────────────────────────────────────────────────────────────
// DROPDOWN SETUP
// ─────────────────────────────────────────────────────────────
function setupDropdowns() {
    loadAcademicYears();
    loadClasses();
    loadExamTypes();
    setupCascadingDropdowns();
}

function loadAcademicYears() {
    // Academic Year dropdowns
    const yearSelectors = [
        'academicYearSelect',
        'reportAcademicYear'
    ];
    
    yearSelectors.forEach(selectorId => {
        const select = document.getElementById(selectorId);
        if (select) {
            select.innerHTML = '<option value="">Select year...</option>';
            academicYears.forEach(year => {
                const option = document.createElement('option');
                option.value = year;
                option.textContent = year;
                select.appendChild(option);
            });
        }
    });
}

function loadClasses() {
    // Class dropdowns
    const classSelectors = [
        'classSelect',
        'classFilter',
        'reportClassSelect',
        'reportClassSelect2'
    ];
    
    classSelectors.forEach(selectorId => {
        const select = document.getElementById(selectorId);
        if (select) {
            const currentValue = select.value;
            select.innerHTML = '<option value="">All Classes</option>';
            classes.forEach(cls => {
                const option = document.createElement('option');
                option.value = cls;
                option.textContent = `Class ${cls}`;
                select.appendChild(option);
            });
            if (currentValue) select.value = currentValue;
        }
    });
}

function loadExamTypes() {
    // Exam type dropdowns
    const examSelectors = [
        'termSelect',
        'examTypeFilter'
    ];
    
    examSelectors.forEach(selectorId => {
        const select = document.getElementById(selectorId);
        if (select) {
            select.innerHTML = '<option value="">Select exam...</option>';
            examTypes.forEach(exam => {
                const option = document.createElement('option');
                option.value = exam;
                option.textContent = formatExamType(exam);
                select.appendChild(option);
            });
        }
    });
}

function formatExamType(examType) {
    switch(examType) {
        case 'UNIT_TEST': return 'Unit Test';
        case 'TERM1': return 'First Term Examination';
        case 'TERM2': return 'Final Term Examination';
        default: return examType;
    }
}

// ─────────────────────────────────────────────────────────────
// CASCADING DROPDOWNS
// ─────────────────────────────────────────────────────────────
function setupCascadingDropdowns() {
    const classSelect = document.getElementById('classSelect');
    const sectionSelect = document.getElementById('sectionSelect');
    const studentSelect = document.getElementById('studentSelect');
    const marksContainer = document.getElementById('subjectsMarksContainer');
    const classInfo = document.getElementById('selectedClassInfo');

    if (!classSelect || !sectionSelect || !studentSelect || !marksContainer) return;

    classSelect.addEventListener('change', function() {
        const selectedClass = this.value;
        
        if (selectedClass) {
            // Get unique sections for this class
            const sectionsForClass = getSectionsForClass(selectedClass);
            
            sectionSelect.disabled = false;
            sectionSelect.innerHTML = '<option value="">Select section...</option>';
            
            sectionsForClass.forEach(section => {
                const option = document.createElement('option');
                option.value = section;
                option.textContent = `Section ${section}`;
                sectionSelect.appendChild(option);
            });
            
            studentSelect.disabled = true;
            studentSelect.innerHTML = '<option value="">Select section first</option>';
            marksContainer.innerHTML = '<div class="text-center py-8 text-gray-500"><i class="fas fa-book-open text-4xl mb-3"></i><p>Select section to load subjects and students</p></div>';
            if (classInfo) classInfo.textContent = '';
        } else {
            sectionSelect.disabled = true;
            sectionSelect.innerHTML = '<option value="">Select class first</option>';
            studentSelect.disabled = true;
            studentSelect.innerHTML = '<option value="">Select class & section first</option>';
            marksContainer.innerHTML = '<div class="text-center py-8 text-gray-500"><i class="fas fa-book-open text-4xl mb-3"></i><p>Select class to load subjects</p></div>';
            if (classInfo) classInfo.textContent = '';
        }
    });

    sectionSelect.addEventListener('change', async function() {
        const selectedClass = classSelect.value;
        const selectedSection = this.value;
        
        if (selectedClass && selectedSection) {
            studentSelect.disabled = true;
            studentSelect.innerHTML = '<option value="">Loading students...</option>';
            marksContainer.innerHTML = '<div class="text-center py-8 text-gray-500"><i class="fas fa-spinner fa-spin text-4xl mb-3"></i><p>Loading subjects...</p></div>';
            
            await loadStudentsForClass(selectedClass, selectedSection);
            loadSubjectsForClass(selectedClass, selectedSection);
            
            if (classInfo) classInfo.textContent = `Class ${selectedClass} - Section ${selectedSection}`;
        } else {
            studentSelect.disabled = true;
            studentSelect.innerHTML = '<option value="">Select section first</option>';
        }
    });
}

function getSectionsForClass(className) {
    const sectionsSet = new Set();
    students.forEach(student => {
        if (student.currentClass === className && student.section) {
            sectionsSet.add(student.section);
        }
    });
    return Array.from(sectionsSet).sort();
}

async function loadStudentsForClass(className, section) {
    const studentSelect = document.getElementById('studentSelect');
    if (!studentSelect) return;
    
    try {
        // Filter students by class and section
        const filteredStudents = students.filter(s => 
            s.currentClass === className && s.section === section
        );
        
        studentSelect.disabled = false;
        studentSelect.innerHTML = '<option value="">Select student...</option>';
        
        if (filteredStudents.length === 0) {
            studentSelect.innerHTML = '<option value="">No students found</option>';
            return;
        }
        
        filteredStudents.forEach(student => {
            const option = document.createElement('option');
            option.value = student.stdId;
            option.textContent = `${student.firstName} ${student.lastName || ''} (Roll: ${student.studentRollNumber || 'N/A'})`;
            studentSelect.appendChild(option);
        });
        
    } catch (error) {
        console.error('Error loading students:', error);
        studentSelect.innerHTML = '<option value="">Error loading students</option>';
    }
}

// ─────────────────────────────────────────────────────────────
// LOAD SUBJECTS FOR CLASS
// ─────────────────────────────────────────────────────────────
function loadSubjectsForClass(classId, section) {
    const marksContainer = document.getElementById('subjectsMarksContainer');
    if (!marksContainer) return;
    
    // Subject definitions based on class and section
    const subjects = getSubjectsForClass(classId, section);
    
    if (subjects && subjects.length > 0) {
        marksContainer.innerHTML = generateSubjectsHTML(subjects);
        attachSubjectEventListeners();
    } else {
        marksContainer.innerHTML = `
            <div class="text-center py-8 text-gray-500">
                <i class="fas fa-exclamation-circle text-4xl mb-3"></i>
                <p>No subjects found for this class and section</p>
                <p class="text-sm mt-2">Please check your selection</p>
            </div>
        `;
    }
}

function getSubjectsForClass(classId, section) {
    // This is a dynamic subject mapping - you can modify based on your backend data
    const subjectMap = {
        '9': [
            { id: 'math9', name: 'Mathematics', maxMarks: 100 },
            { id: 'science9', name: 'Science', maxMarks: 100 },
            { id: 'english9', name: 'English', maxMarks: 100 },
            { id: 'sst9', name: 'Social Studies', maxMarks: 100 },
            { id: 'hindi9', name: 'Hindi', maxMarks: 100 },
            { id: 'sanskrit9', name: 'Sanskrit', maxMarks: 100 }
        ],
        '10': [
            { id: 'math10', name: 'Mathematics', maxMarks: 100 },
            { id: 'science10', name: 'Science', maxMarks: 100 },
            { id: 'english10', name: 'English', maxMarks: 100 },
            { id: 'sst10', name: 'Social Studies', maxMarks: 100 },
            { id: 'hindi10', name: 'Hindi', maxMarks: 100 },
            { id: 'computer10', name: 'Computer Science', maxMarks: 100 }
        ],
        '11': {
            'A': [
                { id: 'physics11', name: 'Physics', maxMarks: 100 },
                { id: 'chemistry11', name: 'Chemistry', maxMarks: 100 },
                { id: 'math11', name: 'Mathematics', maxMarks: 100 },
                { id: 'english11', name: 'English', maxMarks: 100 }
            ],
            'B': [
                { id: 'accounts11', name: 'Accountancy', maxMarks: 100 },
                { id: 'bst11', name: 'Business Studies', maxMarks: 100 },
                { id: 'economics11', name: 'Economics', maxMarks: 100 },
                { id: 'english11', name: 'English', maxMarks: 100 }
            ],
            'C': [
                { id: 'history11', name: 'History', maxMarks: 100 },
                { id: 'political11', name: 'Political Science', maxMarks: 100 },
                { id: 'geography11', name: 'Geography', maxMarks: 100 },
                { id: 'english11', name: 'English', maxMarks: 100 }
            ],
            'D': [
                { id: 'physics11', name: 'Physics', maxMarks: 100 },
                { id: 'chemistry11', name: 'Chemistry', maxMarks: 100 },
                { id: 'math11', name: 'Mathematics', maxMarks: 100 },
                { id: 'english11', name: 'English', maxMarks: 100 }
            ]
        },
        '12': {
            'A': [
                { id: 'physics12', name: 'Physics', maxMarks: 100 },
                { id: 'chemistry12', name: 'Chemistry', maxMarks: 100 },
                { id: 'math12', name: 'Mathematics', maxMarks: 100 },
                { id: 'english12', name: 'English', maxMarks: 100 }
            ],
            'B': [
                { id: 'accounts12', name: 'Accountancy', maxMarks: 100 },
                { id: 'bst12', name: 'Business Studies', maxMarks: 100 },
                { id: 'economics12', name: 'Economics', maxMarks: 100 },
                { id: 'english12', name: 'English', maxMarks: 100 }
            ],
            'C': [
                { id: 'history12', name: 'History', maxMarks: 100 },
                { id: 'political12', name: 'Political Science', maxMarks: 100 },
                { id: 'geography12', name: 'Geography', maxMarks: 100 },
                { id: 'english12', name: 'English', maxMarks: 100 }
            ],
            'D': [
                { id: 'physics12', name: 'Physics', maxMarks: 100 },
                { id: 'chemistry12', name: 'Chemistry', maxMarks: 100 },
                { id: 'math12', name: 'Mathematics', maxMarks: 100 },
                { id: 'english12', name: 'English', maxMarks: 100 }
            ]
        }
    };
    
    if (classId === '9' || classId === '10') {
        return subjectMap[classId] || [];
    } else {
        return subjectMap[classId]?.[section] || subjectMap[classId]?.['A'] || [];
    }
}

// ─────────────────────────────────────────────────────────────
// GENERATE SUBJECTS HTML
// ─────────────────────────────────────────────────────────────
function generateSubjectsHTML(subjects) {
    let html = '';
    
    subjects.forEach(subject => {
        html += `
            <div class="subject-entry border border-gray-200 rounded-lg p-4 mb-4 hover:shadow-sm transition-shadow" data-subject-id="${subject.id}">
                <div class="grid grid-cols-1 lg:grid-cols-12 gap-4">
                    <div class="lg:col-span-2">
                        <label class="block text-sm font-medium text-gray-700 mb-1">${subject.name}</label>
                    </div>

                    <div class="lg:col-span-2">
                        <label class="block text-sm font-medium text-gray-700 mb-1">Entry Type</label>
                        <select class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 entry-type-select"
                                data-subject="${subject.name}" data-max="${subject.maxMarks}">
                            <option value="marks">Marks</option>
                            <option value="grade">Grade</option>
                        </select>
                    </div>

                    <div class="lg:col-span-3">
                        <label class="block text-sm font-medium text-gray-700 mb-1">Enter Value</label>
                        <div class="marks-input-container" data-subject="${subject.name}">
                            <div class="flex items-center marks-field active">
                                <input type="number" min="0" max="${subject.maxMarks}" step="0.01"
                                    class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 marks-input"
                                    placeholder="Enter marks"
                                    data-subject="${subject.name}"
                                    data-max="${subject.maxMarks}"
                                    data-field-type="marks">
                                <span class="ml-2 text-sm text-gray-500">/${subject.maxMarks}</span>
                            </div>
                            <div class="grade-field hidden">
                                <input type="text"
                                    class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 grade-input uppercase-input"
                                    placeholder="Enter grade"
                                    data-subject="${subject.name}"
                                    data-field-type="grade"
                                    maxlength="2">
                                <span class="ml-2 text-sm text-gray-500">Letter</span>
                            </div>
                        </div>
                    </div>

                    <div class="lg:col-span-2">
                        <label class="block text-sm font-medium text-gray-700 mb-1">Calculated Grade</label>
                        <div class="flex items-center">
                            <p class="text-sm font-medium grade-display px-4 py-2 bg-gray-50 rounded-lg w-full"
                               data-grade-display="${subject.name}">
                                <span class="grade-value">-</span>
                                <span class="grade-percentage text-xs text-gray-500 ml-2"></span>
                            </p>
                        </div>
                    </div>

                    <div class="lg:col-span-3">
                        <label class="block text-sm font-medium text-gray-700 mb-1">Performance Level</label>
                        <div class="flex flex-wrap items-center gap-1">
                            <button type="button"
                                class="performance-btn px-2 py-1 text-xs rounded-full border border-gray-300 text-gray-700 hover:bg-green-50 hover:border-green-300 transition-all"
                                data-subject="${subject.name}" data-performance="excellent" title="Excellent">
                                <i class="fas fa-star text-green-500"></i>
                            </button>
                            <button type="button"
                                class="performance-btn px-2 py-1 text-xs rounded-full border border-gray-300 text-gray-700 hover:bg-blue-50 hover:border-blue-300 transition-all"
                                data-subject="${subject.name}" data-performance="good" title="Good">
                                <i class="fas fa-thumbs-up text-blue-500"></i>
                            </button>
                            <button type="button"
                                class="performance-btn px-2 py-1 text-xs rounded-full border border-gray-300 text-gray-700 hover:bg-yellow-50 hover:border-yellow-300 transition-all"
                                data-subject="${subject.name}" data-performance="average" title="Average">
                                <i class="fas fa-minus-circle text-yellow-500"></i>
                            </button>
                            <button type="button"
                                class="performance-btn px-2 py-1 text-xs rounded-full border border-gray-300 text-gray-700 hover:bg-red-50 hover:border-red-300 transition-all"
                                data-subject="${subject.name}" data-performance="needs-improvement" title="Needs Improvement">
                                <i class="fas fa-exclamation-triangle text-red-500"></i>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
    });
    
    return html;
}

// ─────────────────────────────────────────────────────────────
// ATTACH SUBJECT EVENT LISTENERS
// ─────────────────────────────────────────────────────────────
function attachSubjectEventListeners() {
    document.querySelectorAll('.entry-type-select').forEach(select => {
        select.addEventListener('change', function() {
            const subject = this.dataset.subject;
            const container = document.querySelector(`.marks-input-container[data-subject="${subject}"]`);
            if (!container) return;
            
            const marksField = container.querySelector('.marks-field');
            const gradeField = container.querySelector('.grade-field');
            const marksInput = container.querySelector('.marks-input');
            const gradeInput = container.querySelector('.grade-input');
            
            if (this.value === 'marks') {
                marksField.classList.add('active');
                marksField.classList.remove('hidden');
                gradeField.classList.add('hidden');
                gradeField.classList.remove('active');
                if (gradeInput) gradeInput.value = '';
                if (marksInput) marksInput.dispatchEvent(new Event('input'));
            } else {
                gradeField.classList.add('active');
                gradeField.classList.remove('hidden');
                marksField.classList.add('hidden');
                marksField.classList.remove('active');
                if (marksInput) marksInput.value = '';
                if (gradeInput) updateGradeFromGradeInput(subject, gradeInput.value);
            }
        });
    });
    
    document.querySelectorAll('.grade-input').forEach(input => {
        input.addEventListener('input', function() {
            this.value = this.value.toUpperCase();
            const subject = this.dataset.subject;
            updateGradeFromGradeInput(subject, this.value);
        });
        input.addEventListener('blur', function() {
            this.value = this.value.toUpperCase();
        });
    });
    
    document.querySelectorAll('.marks-input').forEach(input => {
        input.addEventListener('input', function() {
            const subject = this.dataset.subject;
            const marks = parseFloat(this.value) || 0;
            const maxMarks = parseInt(this.dataset.max) || 100;
            if (marks > maxMarks) this.value = maxMarks;
            updateGradeFromMarks(subject, marks, maxMarks);
        });
        input.addEventListener('blur', function() {
            const maxMarks = parseInt(this.dataset.max) || 100;
            let marks = parseFloat(this.value) || 0;
            if (marks > maxMarks) { 
                this.value = maxMarks; 
                marks = maxMarks; 
            } else if (marks < 0) { 
                this.value = 0; 
                marks = 0; 
            }
            updateGradeFromMarks(this.dataset.subject, marks, maxMarks);
        });
    });
    
    document.querySelectorAll('.performance-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const subject = this.dataset.subject;
            document.querySelectorAll(`.performance-btn[data-subject="${subject}"]`).forEach(b => {
                b.classList.remove('active', 'bg-blue-600', 'text-white');
                b.classList.add('border-gray-300', 'text-gray-700');
            });
            this.classList.add('active', 'bg-blue-600', 'text-white');
            this.classList.remove('border-gray-300', 'text-gray-700');
        });
    });
}

// ─────────────────────────────────────────────────────────────
// GRADE DISPLAY HELPERS
// ─────────────────────────────────────────────────────────────
function updateGradeFromMarks(subject, marks, maxMarks) {
    const gradeDisplay = document.querySelector(`[data-grade-display="${subject}"]`);
    if (!gradeDisplay) return;
    const percentage = (marks / maxMarks) * 100;
    const grade = calculateGrade(percentage);
    const gradeValue = gradeDisplay.querySelector('.grade-value');
    const gradePercentage = gradeDisplay.querySelector('.grade-percentage');
    
    gradeValue.textContent = grade;
    gradePercentage.textContent = `(${marks}/${maxMarks} - ${percentage.toFixed(1)}%)`;
    
    gradeDisplay.className = 'text-sm font-medium grade-display px-4 py-2 bg-gray-50 rounded-lg w-full';
    
    if (grade === 'A') gradeDisplay.classList.add('text-green-600');
    else if (grade === 'B') gradeDisplay.classList.add('text-blue-600');
    else if (grade === 'C') gradeDisplay.classList.add('text-yellow-600');
    else if (grade === 'D') gradeDisplay.classList.add('text-orange-600');
    else if (grade === 'F') gradeDisplay.classList.add('text-red-600');
}

function updateGradeFromGradeInput(subject, grade) {
    const gradeDisplay = document.querySelector(`[data-grade-display="${subject}"]`);
    if (!gradeDisplay) return;
    const gradeValue = gradeDisplay.querySelector('.grade-value');
    const gradePercentage = gradeDisplay.querySelector('.grade-percentage');
    
    gradeValue.textContent = grade || '-';
    gradePercentage.textContent = grade ? '(Manual Entry)' : '';
    
    gradeDisplay.className = 'text-sm font-medium grade-display px-4 py-2 bg-gray-50 rounded-lg w-full';
    
    if (grade.startsWith('A')) gradeDisplay.classList.add('text-green-600');
    else if (grade.startsWith('B')) gradeDisplay.classList.add('text-blue-600');
    else if (grade.startsWith('C')) gradeDisplay.classList.add('text-yellow-600');
    else if (grade.startsWith('D')) gradeDisplay.classList.add('text-orange-600');
    else if (grade.startsWith('F')) gradeDisplay.classList.add('text-red-600');
}

function calculateGrade(percentage) {
    if (percentage >= 90) return 'A';
    if (percentage >= 75) return 'B';
    if (percentage >= 60) return 'C';
    if (percentage >= 40) return 'D';
    return 'F';
}

function estimateMarksFromGrade(grade, maxMarks) {
    const gradeMarksMap = {
        'A+': 95, 'A': 90, 'A-': 87,
        'B+': 82, 'B': 78, 'B-': 75,
        'C+': 72, 'C': 68, 'C-': 65,
        'D+': 58, 'D': 52, 'D-': 45,
        'F': 30
    };
    const percentage = gradeMarksMap[grade] || 0;
    return Math.round((percentage / 100) * maxMarks);
}

// ─────────────────────────────────────────────────────────────
// FORM HANDLERS
// ─────────────────────────────────────────────────────────────
function setupFormHandlers() {
    const assignMarksForm = document.getElementById('assignMarksForm');
    if (assignMarksForm) {
        assignMarksForm.addEventListener('submit', function(e) {
            e.preventDefault();
            saveStudentMarks();
        });
    }
    
    const resetBtn = document.querySelector('button[type="reset"]');
    if (resetBtn) {
        resetBtn.addEventListener('click', function() {
            resetMarksForm();
        });
    }
}

// ─────────────────────────────────────────────────────────────
// OTHER SUBJECT ADDER
// ─────────────────────────────────────────────────────────────
function setupOtherSubjectAdder() {
    const otherSubjectName = document.getElementById('otherSubjectName');
    const otherSubjectType = document.getElementById('otherSubjectType');
    const otherMarksInput = document.getElementById('otherMarksInput');
    const otherGradeInput = document.getElementById('otherGradeInput');
    const addButton = document.getElementById('addOtherSubjectBtn');
    
    if (!otherSubjectName || !otherSubjectType || !otherMarksInput || !otherGradeInput || !addButton) {
        console.error('Other subject elements not found');
        return;
    }
    
    otherSubjectType.addEventListener('change', function() {
        const marksField = document.querySelector('.other-marks-field');
        const gradeField = document.querySelector('.other-grade-field');
        if (this.value === 'marks') {
            marksField.classList.remove('hidden');
            gradeField.classList.add('hidden');
            otherGradeInput.value = '';
        } else {
            marksField.classList.add('hidden');
            gradeField.classList.remove('hidden');
            otherMarksInput.value = '';
        }
    });
    
    otherGradeInput.addEventListener('input', function() { 
        this.value = this.value.toUpperCase(); 
    });
    otherGradeInput.addEventListener('blur', function() { 
        this.value = this.value.toUpperCase(); 
    });
    
    addButton.addEventListener('click', function(e) {
        e.preventDefault();
        addOtherSubject();
    });
    
    [otherSubjectName, otherMarksInput, otherGradeInput].forEach(input => {
        input.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') { 
                e.preventDefault(); 
                addOtherSubject(); 
            }
        });
    });
}

function addOtherSubject() {
    const subjectName = document.getElementById('otherSubjectName').value.trim();
    const entryType = document.getElementById('otherSubjectType').value;
    const marksInput = document.getElementById('otherMarksInput');
    const gradeInput = document.getElementById('otherGradeInput');
    const otherSubjectsList = document.getElementById('otherSubjectsList');
    
    if (!subjectName) { 
        showToast('Please enter a subject name', 'error'); 
        return; 
    }
    
    let value = '';
    let displayValue = '';
    let grade = '';
    
    if (entryType === 'marks') {
        const marks = parseFloat(marksInput.value);
        if (isNaN(marks) || marks < 0 || marks > 100) {
            showToast('Please enter valid marks between 0 and 100', 'error');
            return;
        }
        value = marks.toString();
        displayValue = `${marks}/100`;
        grade = calculateGrade(marks);
    } else {
        const gradeVal = gradeInput.value.trim().toUpperCase();
        if (!gradeVal) { 
            showToast('Please enter a grade', 'error'); 
            return; 
        }
        value = gradeVal;
        displayValue = gradeVal;
        grade = gradeVal;
    }
    
    const existingSubjects = document.querySelectorAll('.other-subject-item .subject-name');
    for (let existing of existingSubjects) {
        if (existing.textContent.toLowerCase() === subjectName.toLowerCase()) {
            showToast('This subject has already been added', 'error');
            return;
        }
    }
    
    const emptyState = otherSubjectsList.querySelector('.other-subjects-empty');
    if (emptyState) emptyState.remove();
    
    const newSubjectDiv = document.createElement('div');
    newSubjectDiv.className = 'other-subject-item bg-gray-50 rounded-lg p-3 mb-2 flex items-center justify-between group border border-gray-200 hover:border-blue-300 transition-all';
    newSubjectDiv.dataset.subjectName = subjectName;
    newSubjectDiv.dataset.entryType = entryType;
    newSubjectDiv.dataset.value = value;
    newSubjectDiv.dataset.grade = grade;
    
    newSubjectDiv.innerHTML = `
        <div class="flex-1 grid grid-cols-12 gap-3 items-center">
            <div class="col-span-4">
                <span class="subject-name font-medium text-gray-800">${subjectName}</span>
            </div>
            <div class="col-span-3">
                <span class="entry-type-badge text-xs px-2 py-1 rounded-full ${entryType === 'marks' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'}">
                    ${entryType === 'marks' ? 'Marks' : 'Grade'}
                </span>
            </div>
            <div class="col-span-3">
                <span class="subject-value font-medium text-gray-900">${displayValue}</span>
                <span class="subject-grade text-xs ml-2 px-2 py-0.5 rounded-full ${getGradeColorClass(grade)}">
                    Grade: ${grade}
                </span>
            </div>
            <div class="col-span-2 flex justify-end space-x-2">
                <button class="edit-other-subject w-8 h-8 rounded-full bg-blue-50 hover:bg-blue-100 text-blue-600 transition-all" title="Edit">
                    <i class="fas fa-edit text-sm"></i>
                </button>
                <button class="remove-other-subject w-8 h-8 rounded-full bg-red-50 hover:bg-red-100 text-red-600 transition-all" title="Remove">
                    <i class="fas fa-trash text-sm"></i>
                </button>
            </div>
        </div>
    `;
    
    otherSubjectsList.appendChild(newSubjectDiv);
    attachOtherSubjectEventListeners(newSubjectDiv);
    
    document.getElementById('otherSubjectName').value = '';
    document.getElementById('otherMarksInput').value = '';
    document.getElementById('otherGradeInput').value = '';
    
    showToast(`${subjectName} added successfully`, 'success');
}

function getGradeColorClass(grade) {
    if (grade.startsWith('A')) return 'bg-green-100 text-green-800';
    if (grade.startsWith('B')) return 'bg-blue-100 text-blue-800';
    if (grade.startsWith('C')) return 'bg-yellow-100 text-yellow-800';
    if (grade.startsWith('D')) return 'bg-orange-100 text-orange-800';
    if (grade.startsWith('F')) return 'bg-red-100 text-red-800';
    return 'bg-gray-100 text-gray-800';
}

function attachOtherSubjectEventListeners(item) {
    const removeBtn = item.querySelector('.remove-other-subject');
    if (removeBtn) {
        removeBtn.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            const subjectName = item.querySelector('.subject-name').textContent;
            item.remove();
            
            if (document.querySelectorAll('.other-subject-item').length === 0) {
                document.getElementById('otherSubjectsList').innerHTML = `
                    <div class="text-center py-4 text-gray-500 other-subjects-empty">
                        <i class="fas fa-plus-circle text-gray-300 text-2xl mb-2"></i>
                        <p class="text-sm">No additional subjects added yet</p>
                    </div>`;
            }
            showToast(`${subjectName} removed`, 'info');
        });
    }
    
    const editBtn = item.querySelector('.edit-other-subject');
    if (editBtn) {
        editBtn.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            const subjectName = item.querySelector('.subject-name').textContent;
            const entryType = item.dataset.entryType;
            const value = item.dataset.value;
            
            document.getElementById('otherSubjectName').value = subjectName;
            document.getElementById('otherSubjectType').value = entryType;
            document.getElementById('otherSubjectType').dispatchEvent(new Event('change'));
            
            if (entryType === 'marks') {
                document.getElementById('otherMarksInput').value = value;
            } else {
                document.getElementById('otherGradeInput').value = value;
            }
            
            item.remove();
            
            if (document.querySelectorAll('.other-subject-item').length === 0) {
                document.getElementById('otherSubjectsList').innerHTML = `
                    <div class="text-center py-4 text-gray-500 other-subjects-empty">
                        <i class="fas fa-plus-circle text-gray-300 text-2xl mb-2"></i>
                        <p class="text-sm">No additional subjects added yet</p>
                    </div>`;
            }
            showToast(`Editing ${subjectName}`, 'info');
        });
    }
}

function getOtherSubjectsData() {
    const otherSubjects = [];
    document.querySelectorAll('.other-subject-item').forEach(item => {
        otherSubjects.push({
            name: item.dataset.subjectName,
            entryType: item.dataset.entryType,
            value: item.dataset.value,
            grade: item.dataset.grade
        });
    });
    return otherSubjects;
}

// ─────────────────────────────────────────────────────────────
// SAVE STUDENT MARKS
// ─────────────────────────────────────────────────────────────
async function saveStudentMarks() {
    const academicYear = document.getElementById('academicYearSelect').value;
    const classSelect = document.getElementById('classSelect');
    const sectionSelect = document.getElementById('sectionSelect');
    const studentSelect = document.getElementById('studentSelect');
    const termSelect = document.getElementById('termSelect');
    const assessmentDate = document.getElementById('assessmentDate');
    
    if (!academicYear || !classSelect.value || !sectionSelect.value || !studentSelect.value || !termSelect.value || !assessmentDate.value) {
        showToast('Please fill all required fields', 'error');
        return;
    }
    
    const studentIdRaw = studentSelect.value;
    const studentIdNum = parseInt(studentIdRaw, 10);
    if (!studentIdRaw || isNaN(studentIdNum) || studentIdNum <= 0) {
        showToast('Please select a valid student', 'error');
        return;
    }
    
    const subjects = [];
    
    document.querySelectorAll('.subject-entry').forEach(entry => {
        const subjectName = entry.querySelector('.marks-input')?.dataset.subject ||
            entry.querySelector('.grade-input')?.dataset.subject;
        const entryTypeSelect = entry.querySelector('.entry-type-select');
        if (!entryTypeSelect || !subjectName) return;
        
        const entryType = entryTypeSelect.value;
        const performanceBtn = entry.querySelector('.performance-btn.active');
        const remarks = performanceBtn ? performanceBtn.dataset.performance : '';
        
        let marksObtained = 0;
        let maxMarks = 100;
        let grade = '';
        
        if (entryType === 'marks') {
            const marksInput = entry.querySelector('.marks-input');
            if (marksInput) {
                marksObtained = parseFloat(marksInput.value) || 0;
                maxMarks = parseInt(marksInput.dataset.max) || 100;
                grade = calculateGrade((marksObtained / maxMarks) * 100);
            }
        } else {
            const gradeInput = entry.querySelector('.grade-input');
            if (gradeInput) {
                grade = gradeInput.value.toUpperCase();
                marksObtained = estimateMarksFromGrade(grade, maxMarks);
            }
        }
        
        subjects.push({
            subjectName: subjectName,
            marksObtained: marksObtained,
            maxMarks: maxMarks,
            grade: grade,
            remarks: remarks
        });
    });
    
    // Add other subjects
    getOtherSubjectsData().forEach(otherSubject => {
        let marksObtained = 0;
        let grade = otherSubject.grade;
        const maxMarks = 100;
        
        if (otherSubject.entryType === 'marks') {
            marksObtained = parseFloat(otherSubject.value) || 0;
        } else {
            marksObtained = estimateMarksFromGrade(grade, maxMarks);
        }
        
        subjects.push({
            subjectName: otherSubject.name,
            marksObtained: marksObtained,
            maxMarks: maxMarks,
            grade: grade,
            remarks: ''
        });
    });
    
    if (subjects.length === 0) {
        showToast('Please enter marks for at least one subject', 'error');
        return;
    }
    
    const requestPayload = {
        studentId: studentIdNum,
        examType: termSelect.value,
        academicYear: academicYear,
        assessmentDate: assessmentDate.value,
        subjects: subjects,
        teacherComments: ''
    };
    
    showLoadingOverlay(true);
    
    // Check if marks already exist
    const existsResult = await apiFetch(
        `${API_BASE}/marks/check-exists?studentId=${studentIdNum}&examType=${requestPayload.examType}&academicYear=${academicYear}`
    );
    
    let result;
    if (existsResult.ok && existsResult.data.success && existsResult.data.data === true) {
        // Marks exist - get the marksId and update
        const fetchResult = await apiFetch(
            `${API_BASE}/marks/student/${studentIdNum}/exam/${requestPayload.examType}?academicYear=${academicYear}`
        );
        if (fetchResult.ok && fetchResult.data.success && fetchResult.data.data) {
            const existingMarksId = fetchResult.data.data.id || fetchResult.data.data.marksId;
            if (existingMarksId) {
                result = await apiFetch(`${API_BASE}/marks/update/${existingMarksId}`, {
                    method: 'PUT',
                    body: JSON.stringify(requestPayload)
                });
            } else {
                result = await apiFetch(`${API_BASE}/marks/enter`, {
                    method: 'POST',
                    body: JSON.stringify(requestPayload)
                });
            }
        } else {
            result = await apiFetch(`${API_BASE}/marks/enter`, {
                method: 'POST',
                body: JSON.stringify(requestPayload)
            });
        }
    } else {
        // New entry
        result = await apiFetch(`${API_BASE}/marks/enter`, {
            method: 'POST',
            body: JSON.stringify(requestPayload)
        });
    }
    
    showLoadingOverlay(false);
    
    if (result.ok && result.data.success) {
        const studentName = studentSelect.options[studentSelect.selectedIndex].text;
        showToast(`Marks saved successfully for ${studentName}`, 'success');
        resetMarksForm();
        await loadMarksTable(); // Refresh the view tab
    } else {
        const errMsg = result.data?.error || result.data?.message || 'Failed to save marks';
        showToast(`Error: ${errMsg}`, 'error');
        console.error('Save marks error response:', result.data);
    }
}

// ─────────────────────────────────────────────────────────────
// RESET MARKS FORM
// ─────────────────────────────────────────────────────────────
function resetMarksForm() {
    const assignMarksForm = document.getElementById('assignMarksForm');
    if (assignMarksForm) assignMarksForm.reset();
    
    const academicYearSelect = document.getElementById('academicYearSelect');
    if (academicYearSelect) academicYearSelect.selectedIndex = 0;
    
    const classSelect = document.getElementById('classSelect');
    if (classSelect) classSelect.selectedIndex = 0;
    
    const sectionSelect = document.getElementById('sectionSelect');
    if (sectionSelect) {
        sectionSelect.innerHTML = '<option value="">Select class first</option>';
        sectionSelect.disabled = true;
    }
    
    const studentSelect = document.getElementById('studentSelect');
    if (studentSelect) {
        studentSelect.innerHTML = '<option value="">Select class & section first</option>';
        studentSelect.disabled = true;
    }
    
    const marksContainer = document.getElementById('subjectsMarksContainer');
    if (marksContainer) {
        marksContainer.innerHTML = '<div class="text-center py-8 text-gray-500"><i class="fas fa-book-open text-4xl mb-3"></i><p>Select class to load subjects</p></div>';
    }
    
    const classInfo = document.getElementById('selectedClassInfo');
    if (classInfo) classInfo.textContent = '';
    
    const otherSubjectsList = document.getElementById('otherSubjectsList');
    if (otherSubjectsList) {
        otherSubjectsList.innerHTML = `
            <div class="text-center py-4 text-gray-500 other-subjects-empty">
                <i class="fas fa-plus-circle text-gray-300 text-2xl mb-2"></i>
                <p class="text-sm">No additional subjects added yet</p>
            </div>`;
    }
    
    const otherSubjectName = document.getElementById('otherSubjectName');
    if (otherSubjectName) otherSubjectName.value = '';
    
    const otherMarksInput = document.getElementById('otherMarksInput');
    if (otherMarksInput) otherMarksInput.value = '';
    
    const otherGradeInput = document.getElementById('otherGradeInput');
    if (otherGradeInput) otherGradeInput.value = '';
    
    const otherSubjectType = document.getElementById('otherSubjectType');
    if (otherSubjectType) otherSubjectType.value = 'marks';
    
    const marksField = document.querySelector('.other-marks-field');
    const gradeField = document.querySelector('.other-grade-field');
    if (marksField) marksField.classList.remove('hidden');
    if (gradeField) gradeField.classList.add('hidden');
    
    const assessmentDate = document.getElementById('assessmentDate');
    if (assessmentDate) assessmentDate.valueAsDate = new Date();
}

// ─────────────────────────────────────────────────────────────
// TAB NAVIGATION
// ─────────────────────────────────────────────────────────────
function setupTabNavigation() {
    const tabButtons = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');
    
    tabContents.forEach((content, index) => {
        if (index === 0) {
            content.classList.remove('hidden');
            content.classList.add('active');
        } else {
            content.classList.add('hidden');
            content.classList.remove('active');
        }
    });
    
    tabButtons.forEach((btn, index) => {
        if (index === 0) {
            btn.classList.add('active', 'text-gray-700', 'border-blue-500');
            btn.classList.remove('text-gray-500');
        } else {
            btn.classList.remove('active', 'text-gray-700', 'border-blue-500');
            btn.classList.add('text-gray-500');
        }
    });
    
    tabButtons.forEach(button => {
        button.addEventListener('click', function(e) {
            e.preventDefault();
            const tabId = this.id.replace('Tab', 'Content');
            
            tabButtons.forEach(btn => {
                btn.classList.remove('active', 'text-gray-700', 'border-blue-500');
                btn.classList.add('text-gray-500');
            });
            this.classList.add('active', 'text-gray-700', 'border-blue-500');
            this.classList.remove('text-gray-500');
            
            tabContents.forEach(content => {
                content.classList.add('hidden');
                content.classList.remove('active');
            });
            
            const activeContent = document.getElementById(tabId);
            if (activeContent) {
                activeContent.classList.remove('hidden');
                activeContent.classList.add('active');
                
                if (tabId === 'viewMarksContent') {
                    loadMarksTable();
                }
                
                if (tabId === 'generateReportContent') {
                    setupReportFilters();
                    updatePreviewInfo();
                }
            }
        });
    });
}

// ─────────────────────────────────────────────────────────────
// MARKS TABLE
// ─────────────────────────────────────────────────────────────
function setupMarksTable() {
    const searchStudent = document.getElementById('searchStudent');
    const classFilter = document.getElementById('classFilter');
    const sectionFilter = document.getElementById('sectionFilter');
    const examTypeFilter = document.getElementById('examTypeFilter');
    const applyFilters = document.getElementById('applyFilters');
    const resetFilters = document.getElementById('resetFilters');
    
    const loadWithFilters = () => {
        if (document.getElementById('viewMarksContent')?.classList.contains('hidden') === false) {
            loadMarksTable();
        }
    };
    
    if (searchStudent) searchStudent.addEventListener('input', loadWithFilters);
    if (classFilter) classFilter.addEventListener('change', loadWithFilters);
    if (sectionFilter) sectionFilter.addEventListener('change', loadWithFilters);
    if (examTypeFilter) examTypeFilter.addEventListener('change', loadWithFilters);
    
    if (applyFilters) {
        applyFilters.addEventListener('click', function() {
            loadWithFilters();
            showToast('Filters applied', 'success');
        });
    }
    
    if (resetFilters) {
        resetFilters.addEventListener('click', function() {
            if (searchStudent) searchStudent.value = '';
            if (classFilter) classFilter.value = '';
            if (sectionFilter) sectionFilter.value = '';
            if (examTypeFilter) examTypeFilter.value = '';
            loadWithFilters();
            showToast('Filters reset', 'info');
        });
    }
}

async function loadMarksTable() {
    console.log('Loading marks table from backend...');
    
    const searchStudent = document.getElementById('searchStudent');
    const classFilter = document.getElementById('classFilter');
    const sectionFilter = document.getElementById('sectionFilter');
    const examTypeFilter = document.getElementById('examTypeFilter');
    const tableBody = document.getElementById('marksTableBody');
    const noMarksMessage = document.getElementById('noMarksMessage');
    
    if (!tableBody) { 
        console.error('Table body element not found'); 
        return; 
    }
    
    const searchTerm = searchStudent ? searchStudent.value.toLowerCase() : '';
    const classValue = classFilter ? classFilter.value : '';
    const sectionValue = sectionFilter ? sectionFilter.value : '';
    const examTypeValue = examTypeFilter ? examTypeFilter.value : '';
    
    showLoadingOverlay(true);
    tableBody.innerHTML = '';
    
    let allMarksRecords = [];
    
    try {
        if (classValue && sectionValue && examTypeValue) {
            // Direct filtered fetch
            const academicYear = document.getElementById('academicYearSelect')?.value || academicYears[0];
            const result = await apiFetch(
                `${API_BASE}/marks/class/${encodeURIComponent(classValue)}/section/${encodeURIComponent(sectionValue)}/exam/${examTypeValue}?academicYear=${academicYear}`
            );
            if (result.ok && result.data.success && Array.isArray(result.data.data)) {
                allMarksRecords = result.data.data;
            }
        } else if (classValue && sectionValue) {
            // Fetch for all exam types
            const academicYear = document.getElementById('academicYearSelect')?.value || academicYears[0];
            for (const examType of examTypes) {
                const result = await apiFetch(
                    `${API_BASE}/marks/class/${encodeURIComponent(classValue)}/section/${encodeURIComponent(sectionValue)}/exam/${examType}?academicYear=${academicYear}`
                );
                if (result.ok && result.data.success && Array.isArray(result.data.data)) {
                    allMarksRecords = allMarksRecords.concat(result.data.data);
                }
            }
        } else {
            // No filter - try to fetch from all students (limited)
            // This could be heavy - consider showing message
            showLoadingOverlay(false);
            tableBody.innerHTML = `
                <tr>
                    <td colspan="8" class="px-6 py-12 text-center text-gray-500">
                        <i class="fas fa-filter text-4xl mb-3 text-gray-300"></i>
                        <p class="text-lg">Please select Class and Section filters to load marks</p>
                        <p class="text-sm mt-2">Use the filters above to view marks records</p>
                    </td>
                </tr>`;
            if (noMarksMessage) noMarksMessage.classList.add('hidden');
            return;
        }
    } catch (error) {
        console.error('Error loading marks:', error);
        showLoadingOverlay(false);
        tableBody.innerHTML = `
            <tr>
                <td colspan="8" class="px-6 py-12 text-center text-gray-500">
                    <i class="fas fa-exclamation-circle text-4xl mb-3 text-red-300"></i>
                    <p class="text-lg">Error loading marks data</p>
                    <p class="text-sm mt-2">${error.message}</p>
                </td>
            </tr>`;
        return;
    }
    
    showLoadingOverlay(false);
    
    // Apply client-side search filter
    if (searchTerm) {
        allMarksRecords = allMarksRecords.filter(m => {
            const name = (m.studentName || '').toLowerCase();
            const id = String(m.studentId || '').toLowerCase();
            return name.includes(searchTerm) || id.includes(searchTerm);
        });
    }
    
    if (allMarksRecords.length === 0) {
        if (noMarksMessage) noMarksMessage.classList.remove('hidden');
        tableBody.innerHTML = `
            <tr>
                <td colspan="8" class="px-6 py-12 text-center text-gray-500">
                    <i class="fas fa-inbox text-4xl mb-3 text-gray-300"></i>
                    <p class="text-lg">No marks records found</p>
                    <p class="text-sm mt-2">Try adjusting your filters or add marks in the "Assign Marks" tab</p>
                </td>
            </tr>`;
        return;
    }
    
    if (noMarksMessage) noMarksMessage.classList.add('hidden');
    
    allMarksRecords.forEach(marks => {
        const row = document.createElement('tr');
        row.className = 'hover:bg-gray-50 transition-colors group';
        
        const studentDisplayName = marks.studentName || 'Unknown Student';
        const studentId = marks.studentId || 'N/A';
        const className = marks.className || `Class ${marks.studentClass || 'N/A'}`;
        const section = marks.section || '';
        const examName = formatExamType(marks.examType) || marks.examType || 'N/A';
        const subjectCount = Array.isArray(marks.subjects) ? marks.subjects.length : 0;
        const totalMarks = marks.totalMarks !== undefined ? marks.totalMarks : 0;
        const maxTotal = marks.totalMaxMarks !== undefined ? marks.totalMaxMarks : 0;
        const percentage = marks.percentage !== undefined ? marks.percentage : 0;
        const grade = marks.grade || 'N/A';
        
        const gradeClass = grade === 'A' ? 'text-green-600 font-bold' :
            grade === 'B' ? 'text-blue-600 font-bold' :
            grade === 'C' ? 'text-yellow-600 font-bold' :
            grade === 'D' ? 'text-orange-600 font-bold' :
            grade === 'F' ? 'text-red-600 font-bold' : 'text-gray-600';
        
        row.innerHTML = `
            <td class="px-6 py-4 whitespace-nowrap">
                <div class="flex items-center">
                    <div class="h-10 w-10 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center mr-3 shadow-sm">
                        <i class="fas fa-user-graduate text-white text-sm"></i>
                    </div>
                    <div>
                        <div class="text-sm font-semibold text-gray-900">${studentDisplayName}</div>
                        <div class="text-xs text-gray-500 flex items-center">
                            <i class="fas fa-id-card mr-1 text-xs"></i> ${studentId}
                        </div>
                    </div>
                </div>
            </td>
            <td class="px-6 py-4 whitespace-nowrap">
                <div class="text-sm font-medium text-gray-900">${className}</div>
                <div class="text-xs text-gray-500">Section ${section || 'N/A'}</div>
            </td>
            <td class="px-6 py-4 whitespace-nowrap">
                <div class="text-sm text-gray-900">${examName}</div>
                <div class="text-xs text-gray-500">${marks.assessmentDate || marks.academicYear || ''}</div>
            </td>
            <td class="px-6 py-4 whitespace-nowrap">
                <div class="flex items-center">
                    <span class="text-sm font-medium text-gray-900">${subjectCount}</span>
                    <span class="text-xs text-gray-500 ml-1">subjects</span>
                </div>
            </td>
            <td class="px-6 py-4 whitespace-nowrap">
                <div class="text-sm font-bold text-gray-900">${totalMarks}</div>
                <div class="text-xs text-gray-500">out of ${maxTotal}</div>
            </td>
            <td class="px-6 py-4 whitespace-nowrap">
                <div class="flex items-center">
                    <span class="text-sm font-bold ${gradeClass}">${percentage}%</span>
                    <div class="ml-2 w-12 h-1.5 bg-gray-200 rounded-full">
                        <div class="h-1.5 rounded-full ${
            percentage >= 90 ? 'bg-green-500' :
            percentage >= 75 ? 'bg-blue-500' :
            percentage >= 60 ? 'bg-yellow-500' :
            percentage >= 40 ? 'bg-orange-500' : 'bg-red-500'
        }" style="width: ${Math.min(percentage, 100)}%"></div>
                    </div>
                </div>
            </td>
            <td class="px-6 py-4 whitespace-nowrap">
                <span class="px-3 py-1 text-sm font-bold rounded-full ${gradeClass} ${
            grade === 'A' ? 'bg-green-100' :
            grade === 'B' ? 'bg-blue-100' :
            grade === 'C' ? 'bg-yellow-100' :
            grade === 'D' ? 'bg-orange-100' :
            grade === 'F' ? 'bg-red-100' : 'bg-gray-100'
        }">
                    ${grade}
                </span>
            </td>
            <td class="px-6 py-4 whitespace-nowrap sticky right-0 bg-white shadow-lg z-10 group-hover:bg-gray-50 transition-colors">
                <div class="flex items-center space-x-2 bg-white bg-opacity-95 px-3 py-2 rounded-lg shadow-md border border-gray-100">
                    <button class="edit-marks-btn w-9 h-9 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-600 transition-all transform hover:scale-110 flex items-center justify-center"
                        data-id="${marks.id || marks.marksId}" title="Edit Marks">
                        <i class="fas fa-edit text-sm"></i>
                    </button>
                    <button class="delete-marks-btn w-9 h-9 rounded-lg bg-red-50 hover:bg-red-100 text-red-600 transition-all transform hover:scale-110 flex items-center justify-center"
                        data-id="${marks.id || marks.marksId}" title="Delete Marks">
                        <i class="fas fa-trash text-sm"></i>
                    </button>
                    <button class="view-report-btn w-9 h-9 rounded-lg bg-green-50 hover:bg-green-100 text-green-600 transition-all transform hover:scale-110 flex items-center justify-center"
                        data-student-id="${studentId}" data-academic-year="${marks.academicYear || academicYears[0]}" title="View Report">
                        <i class="fas fa-file-alt text-sm"></i>
                    </button>
                </div>
            </td>
        `;
        
        tableBody.appendChild(row);
    });
    
    attachTableActionListeners();
}

// ─────────────────────────────────────────────────────────────
// TABLE ACTION LISTENERS
// ─────────────────────────────────────────────────────────────
function attachTableActionListeners() {
    document.querySelectorAll('.edit-marks-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const marksId = this.dataset.id;
            openEditMarksModal(marksId);
        });
    });
    
    document.querySelectorAll('.delete-marks-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const marksId = this.dataset.id;
            if (confirm('Are you sure you want to delete this marks record? This action cannot be undone.')) {
                deleteMarks(marksId);
            }
        });
    });
    
    document.querySelectorAll('.view-report-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const studentId = this.dataset.studentId;
            const academicYear = this.dataset.academicYear;
            viewStudentReport(studentId, academicYear);
        });
    });
}

// ─────────────────────────────────────────────────────────────
// EDIT MARKS
// ─────────────────────────────────────────────────────────────
async function openEditMarksModal(marksId) {
    if (!marksId || marksId === 'undefined') {
        showToast('Marks record ID not found', 'error');
        return;
    }
    
    currentEditMarksId = marksId;
    
    // Switch to Assign Marks tab
    document.getElementById('assignMarksTab').click();
    showToast(`Loading marks for editing...`, 'info');
    
    // Here you would ideally load the marks data and pre-fill the form
    // For now, we'll just show a message
    showToast(`To edit marks ID ${marksId}, please update and save the form`, 'info');
}

// ─────────────────────────────────────────────────────────────
// DELETE MARKS
// ─────────────────────────────────────────────────────────────
async function deleteMarks(marksId) {
    showLoadingOverlay(true);
    
    const result = await apiFetch(`${API_BASE}/marks/delete/${marksId}`, {
        method: 'DELETE'
    });
    
    showLoadingOverlay(false);
    
    if (result.ok && result.data.success) {
        showToast('Marks deleted successfully', 'success');
        loadMarksTable();
    } else {
        const errMsg = result.data?.error || 'Failed to delete marks';
        showToast(`Error: ${errMsg}`, 'error');
    }
}

// ─────────────────────────────────────────────────────────────
// VIEW STUDENT REPORT
// ─────────────────────────────────────────────────────────────
async function viewStudentReport(studentId, academicYear) {
    showLoadingOverlay(true);
    
    const result = await apiFetch(
        `${API_BASE}/marks/reports/annual/${studentId}?academicYear=${academicYear}`
    );
    
    showLoadingOverlay(false);
    
    if (result.ok && result.data.success) {
        const reportData = result.data.data;
        renderReportInNewWindow(reportData, 'annual');
    } else {
        // Try summary fallback
        const summaryResult = await apiFetch(
            `${API_BASE}/marks/student/${studentId}/summary?academicYear=${academicYear}`
        );
        if (summaryResult.ok && summaryResult.data.success) {
            renderSummaryReportInNewWindow(summaryResult.data.data, studentId, academicYear);
        } else {
            showToast('No report data found for this student', 'warning');
        }
    }
}

// ─────────────────────────────────────────────────────────────
// RENDER REPORT IN NEW WINDOW
// ─────────────────────────────────────────────────────────────
function renderReportInNewWindow(reportData, type) {
    const studentInfo = reportData.studentInfo || {};
    const annualSummary = reportData.annualSummary || reportData.cumulativeSummary || {};
    const examBreakdown = reportData.examWiseBreakdown || reportData.exams || [];
    
    const gradeColor = (g) => {
        if (g === 'A') return '#059669';
        if (g === 'B') return '#2563eb';
        if (g === 'C') return '#d97706';
        if (g === 'D') return '#ea580c';
        return '#dc2626';
    };
    
    let examRowsHTML = examBreakdown.map(exam => `
        <tr style="border-bottom: 1px solid #e5e7eb;">
            <td style="padding: 10px 16px; font-weight:500;">${exam.examName || exam.examType || ''}</td>
            <td style="padding: 10px 16px;">${exam.percentage !== undefined ? exam.percentage + '%' : 'N/A'}</td>
            <td style="padding: 10px 16px; font-weight:bold; color:${gradeColor(exam.grade)}">${exam.grade || 'N/A'}</td>
        </tr>
    `).join('');
    
    const reportHTML = `
        <!DOCTYPE html>
        <html>
        <head>
            <title>Student Report - ${studentInfo.studentName || ''}</title>
            <style>
                body { font-family: 'Segoe UI', sans-serif; background: #f3f4f6; margin: 0; padding: 24px; }
                .card { max-width: 900px; margin: 0 auto; background: white; border-radius: 12px; box-shadow: 0 4px 24px rgba(0,0,0,0.08); overflow: hidden; }
                .header { background: linear-gradient(135deg, #3b82f6, #1d4ed8); color: white; padding: 32px; }
                .section { padding: 24px 32px; border-bottom: 1px solid #e5e7eb; }
                table { width: 100%; border-collapse: collapse; }
                th { background: #f9fafb; padding: 10px 16px; text-align: left; font-size: 13px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.05em; }
                .summary-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; margin-top: 16px; }
                .summary-card { background: #f9fafb; border-radius: 8px; padding: 16px; text-align: center; }
                .no-print { text-align: center; padding: 24px; }
                @media print { .no-print { display: none; } body { background: white; } }
            </style>
        </head>
        <body>
            <div class="card">
                <div class="header">
                    <h1 style="margin:0; font-size:24px; font-weight:700;">Student Performance Report</h1>
                    <p style="margin:8px 0 0; opacity:0.85;">Academic Year: ${reportData.academicYear || ''}</p>
                    <p style="margin:4px 0 0; font-size:13px; opacity:0.7;">Generated: ${reportData.generatedDate || new Date().toLocaleDateString()}</p>
                </div>

                <div class="section">
                    <h2 style="margin:0 0 16px; font-size:16px; color:#374151;">Student Information</h2>
                    <div style="display:grid; grid-template-columns:1fr 1fr; gap:16px;">
                        <div><p style="margin:0; font-size:12px; color:#6b7280;">Student Name</p><p style="margin:4px 0 0; font-weight:600; color:#111827;">${studentInfo.studentName || 'N/A'}</p></div>
                        <div><p style="margin:0; font-size:12px; color:#6b7280;">Roll Number</p><p style="margin:4px 0 0; font-weight:600; color:#111827;">${studentInfo.rollNumber || 'N/A'}</p></div>
                        <div><p style="margin:0; font-size:12px; color:#6b7280;">Class & Section</p><p style="margin:4px 0 0; font-weight:600; color:#111827;">${studentInfo.className || ''} - Section ${studentInfo.section || 'N/A'}</p></div>
                        <div><p style="margin:0; font-size:12px; color:#6b7280;">Student ID</p><p style="margin:4px 0 0; font-weight:600; color:#111827;">${studentInfo.studentId || 'N/A'}</p></div>
                    </div>
                </div>

                <div class="section">
                    <h2 style="margin:0 0 16px; font-size:16px; color:#374151;">Exam-wise Performance</h2>
                    <table>
                        <thead><tr><th>Exam</th><th>Percentage</th><th>Grade</th></tr></thead>
                        <tbody>${examRowsHTML || '<tr><td colspan="3" style="text-align:center; padding:20px; color:#6b7280;">No exam data available</td></tr>'}</tbody>
                    </table>
                </div>

                <div class="section">
                    <h2 style="margin:0 0 16px; font-size:16px; color:#374151;">Annual Summary</h2>
                    <div class="summary-grid">
                        <div class="summary-card">
                            <p style="margin:0; font-size:12px; color:#6b7280;">Total Marks</p>
                            <p style="margin:8px 0 0; font-size:22px; font-weight:700; color:#111827;">${annualSummary.totalMarks || 0}/${annualSummary.totalMaxMarks || 0}</p>
                        </div>
                        <div class="summary-card">
                            <p style="margin:0; font-size:12px; color:#6b7280;">Annual Percentage</p>
                            <p style="margin:8px 0 0; font-size:22px; font-weight:700; color:${gradeColor(annualSummary.annualGrade || annualSummary.overallGrade)}">${annualSummary.annualPercentage || annualSummary.overallPercentage || 0}%</p>
                        </div>
                        <div class="summary-card">
                            <p style="margin:0; font-size:12px; color:#6b7280;">Final Grade</p>
                            <p style="margin:8px 0 0; font-size:22px; font-weight:700; color:${gradeColor(annualSummary.annualGrade || annualSummary.overallGrade)}">${annualSummary.annualGrade || annualSummary.overallGrade || 'N/A'}</p>
                        </div>
                    </div>
                </div>

                <div class="no-print">
                    <button onclick="window.print()" style="padding:10px 24px; background:#3b82f6; color:white; border:none; border-radius:8px; cursor:pointer; font-size:14px; margin-right:8px;">
                        Print Report
                    </button>
                    <button onclick="window.close()" style="padding:10px 24px; background:#6b7280; color:white; border:none; border-radius:8px; cursor:pointer; font-size:14px;">
                        Close
                    </button>
                </div>
            </div>
        </body>
        </html>
    `;
    
    const reportWindow = window.open('', '_blank');
    reportWindow.document.write(reportHTML);
    reportWindow.document.close();
}

// ─────────────────────────────────────────────────────────────
// RENDER SUMMARY REPORT
// ─────────────────────────────────────────────────────────────
function renderSummaryReportInNewWindow(summaryData, studentId, academicYear) {
    const gradeColor = (g) => {
        if (g === 'A') return '#059669';
        if (g === 'B') return '#2563eb';
        if (g === 'C') return '#d97706';
        if (g === 'D') return '#ea580c';
        return '#dc2626';
    };
    
    const reportHTML = `
        <!DOCTYPE html>
        <html>
        <head>
            <title>Student Summary Report</title>
            <style>
                body { font-family: 'Segoe UI', sans-serif; background: #f3f4f6; padding: 24px; }
                .card { max-width: 900px; margin: 0 auto; background: white; border-radius: 12px; box-shadow: 0 4px 24px rgba(0,0,0,0.08); overflow: hidden; }
                .header { background: linear-gradient(135deg, #10b981, #059669); color: white; padding: 32px; }
                pre { background: #f9fafb; padding: 24px; border-radius: 8px; overflow-x: auto; font-size: 13px; }
                .no-print { text-align: center; padding: 24px; }
                @media print { .no-print { display: none; } }
            </style>
        </head>
        <body>
            <div class="card">
                <div class="header">
                    <h1 style="margin:0; font-size:22px; font-weight:700;">Student Marks Summary</h1>
                    <p style="margin:8px 0 0; opacity:0.85;">Academic Year: ${academicYear} | Student ID: ${studentId}</p>
                </div>
                <div style="padding: 24px 32px;">
                    <pre>${JSON.stringify(summaryData, null, 2)}</pre>
                </div>
                <div class="no-print">
                    <button onclick="window.print()" style="padding:10px 24px; background:#10b981; color:white; border:none; border-radius:8px; cursor:pointer; font-size:14px; margin-right:8px;">Print</button>
                    <button onclick="window.close()" style="padding:10px 24px; background:#6b7280; color:white; border:none; border-radius:8px; cursor:pointer; font-size:14px;">Close</button>
                </div>
            </div>
        </body>
        </html>
    `;
    
    const reportWindow = window.open('', '_blank');
    reportWindow.document.write(reportHTML);
    reportWindow.document.close();
}

// ─────────────────────────────────────────────────────────────
// REPORT GENERATION HANDLERS
// ─────────────────────────────────────────────────────────────
function setupReportHandlers() {
    console.log('Setting up report handlers...');
    
    const reportTypeCards = document.querySelectorAll('.report-type-card');
    const individualOptions = document.getElementById('individualReportOptions');
    const classOptions = document.getElementById('classReportOptions');
    
    if (reportTypeCards.length > 0) {
        reportTypeCards.forEach(card => {
            card.addEventListener('click', function() {
                reportTypeCards.forEach(c => {
                    c.classList.remove('active', 'border-blue-500', 'bg-blue-50');
                    c.classList.add('border-gray-200');
                });
                this.classList.add('active', 'border-blue-500', 'bg-blue-50');
                this.classList.remove('border-gray-200');
                
                const type = this.dataset.type;
                if (type === 'individual') {
                    individualOptions.classList.remove('hidden');
                    classOptions.classList.add('hidden');
                } else {
                    individualOptions.classList.add('hidden');
                    classOptions.classList.remove('hidden');
                }
            });
        });
    }
    
    const fullYearRadio = document.getElementById('fullYear');
    const termWiseRadio = document.getElementById('termWise');
    const termSelectionContainer = document.getElementById('termSelectionContainer');
    
    if (fullYearRadio && termWiseRadio) {
        fullYearRadio.addEventListener('change', function() {
            if (this.checked) {
                termSelectionContainer.classList.add('hidden');
                updatePreviewInfo();
            }
        });
        termWiseRadio.addEventListener('change', function() {
            if (this.checked) {
                termSelectionContainer.classList.remove('hidden');
                loadExamCheckboxes();
                updatePreviewInfo();
            }
        });
    }
    
    const classFullYear = document.getElementById('classFullYear');
    const classExamWise = document.getElementById('classExamWise');
    const classExamContainer = document.getElementById('classExamSelectionContainer');
    
    if (classFullYear && classExamWise) {
        classFullYear.addEventListener('change', function() {
            if (this.checked) {
                classExamContainer.classList.add('hidden');
                updatePreviewInfo('full', 'class');
            }
        });
        classExamWise.addEventListener('change', function() {
            if (this.checked) {
                classExamContainer.classList.remove('hidden');
                loadClassExamCheckboxes();
                updatePreviewInfo('exam', 'class');
            }
        });
    }
    
    document.getElementById('generateReportBtn')?.addEventListener('click', generateReport);
    
    const previewBtn = document.getElementById('previewReportBtn');
    if (previewBtn) {
        previewBtn.addEventListener('click', function(e) {
            e.preventDefault();
            previewReport();
        });
    }
    
    const downloadReportBtn = document.getElementById('downloadReportBtn');
    if (downloadReportBtn) {
        downloadReportBtn.addEventListener('click', function() {
            showToast('Download functionality coming soon', 'info');
        });
    }
    
    setupReportFilters();
    setupReportClassFilter();
}

function loadExamCheckboxes() {
    const container = document.getElementById('examCheckboxContainer');
    if (!container) return;
    
    let html = '';
    examTypes.forEach((exam, index) => {
        html += `
            <div class="flex items-center mb-2">
                <input type="checkbox" id="exam_${index}" value="${exam}" class="h-4 w-4 text-blue-600 border-gray-300 rounded exam-checkbox">
                <label for="exam_${index}" class="ml-2 text-sm text-gray-700">${formatExamType(exam)}</label>
            </div>
        `;
    });
    
    container.innerHTML = html;
    
    document.querySelectorAll('.exam-checkbox').forEach(checkbox => {
        checkbox.addEventListener('change', updatePreviewInfo);
    });
}

function loadClassExamCheckboxes() {
    const container = document.getElementById('classExamCheckboxContainer');
    if (!container) return;
    
    let html = '';
    examTypes.forEach((exam, index) => {
        html += `
            <div class="flex items-center mb-2">
                <input type="checkbox" id="class_exam_${index}" value="${exam}" class="h-4 w-4 text-blue-600 border-gray-300 rounded class-exam-checkbox">
                <label for="class_exam_${index}" class="ml-2 text-sm text-gray-700">${formatExamType(exam)}</label>
            </div>
        `;
    });
    
    container.innerHTML = html;
    
    document.querySelectorAll('.class-exam-checkbox').forEach(checkbox => {
        checkbox.addEventListener('change', updatePreviewInfo);
    });
}

function setupReportFilters() {
    const classSelect = document.getElementById('reportClassSelect');
    const sectionSelect = document.getElementById('reportSectionSelect');
    const studentSelect = document.getElementById('reportStudentSelect');
    
    if (!classSelect || !sectionSelect || !studentSelect) return;
    
    async function filterStudents() {
        const selectedClass = classSelect.value;
        const selectedSection = sectionSelect.value;
        
        studentSelect.innerHTML = '<option value="">Loading students...</option>';
        studentSelect.disabled = true;
        
        if (!selectedClass) {
            studentSelect.innerHTML = '<option value="">Select a student...</option>';
            studentSelect.disabled = false;
            updatePreviewInfo();
            return;
        }
        
        // Filter students by class and section
        let filteredStudents = students.filter(s => s.currentClass === selectedClass);
        if (selectedSection) {
            filteredStudents = filteredStudents.filter(s => s.section === selectedSection);
        }
        
        studentSelect.innerHTML = '<option value="">Select a student...</option>';
        
        if (filteredStudents.length > 0) {
            filteredStudents.sort((a, b) => (a.firstName || '').localeCompare(b.firstName || ''));
            filteredStudents.forEach(student => {
                const option = document.createElement('option');
                option.value = student.stdId;
                option.textContent = `${student.firstName} ${student.lastName || ''} (Class ${student.currentClass || ''}${student.section ? '-' + student.section : ''})`;
                studentSelect.appendChild(option);
            });
            studentSelect.disabled = false;
        } else {
            const option = document.createElement('option');
            option.value = '';
            option.textContent = 'No students found';
            option.disabled = true;
            studentSelect.appendChild(option);
            studentSelect.disabled = true;
        }
        
        updatePreviewInfo();
    }
    
    classSelect.addEventListener('change', filterStudents);
    sectionSelect.addEventListener('change', filterStudents);
    studentSelect.addEventListener('change', updatePreviewInfo);
}

function setupReportClassFilter() {
    const classSelect = document.getElementById('reportClassSelect2');
    const sectionSelect = document.getElementById('reportSectionSelect2');
    
    if (!classSelect || !sectionSelect) return;
    
    classSelect.addEventListener('change', function() {
        const selectedClass = this.value;
        
        if (!selectedClass) {
            sectionSelect.innerHTML = '<option value="">All Sections</option>';
            sectionSelect.disabled = true;
            return;
        }
        
        const sectionsForClass = getSectionsForClass(selectedClass);
        
        sectionSelect.disabled = false;
        sectionSelect.innerHTML = '<option value="">All Sections</option>';
        sectionsForClass.forEach(section => {
            const option = document.createElement('option');
            option.value = section;
            option.textContent = `Section ${section}`;
            sectionSelect.appendChild(option);
        });
        
        updatePreviewInfo('full', 'class');
    });
    
    sectionSelect.addEventListener('change', function() {
        updatePreviewInfo(
            document.querySelector('input[name="classReportScope"]:checked')?.value || 'full', 
            'class'
        );
    });
}

function updatePreviewInfo(scope = null, type = 'individual') {
    const pagesSpan = document.getElementById('previewPages');
    const includesSpan = document.getElementById('previewIncludes');
    const timeSpan = document.getElementById('previewTime');
    const previewArea = document.getElementById('reportPreviewArea');
    
    if (!pagesSpan || !includesSpan || !timeSpan || !previewArea) return;
    
    if (type === 'individual') {
        const studentSelect = document.getElementById('reportStudentSelect');
        const studentId = studentSelect?.value;
        const selectedOption = studentSelect?.options[studentSelect.selectedIndex];
        
        if (!studentId || !selectedOption || selectedOption.disabled) {
            pagesSpan.textContent = '-';
            includesSpan.textContent = 'Select a student';
            timeSpan.textContent = '-';
            previewArea.innerHTML = `
                <div class="text-center py-4">
                    <i class="fas fa-user text-gray-300 text-4xl mb-4"></i>
                    <p class="text-gray-500 text-sm">Please select a student</p>
                    <p class="text-gray-400 text-xs mt-2">Choose a student to preview report</p>
                </div>`;
            return;
        }
        
        const actualScope = scope || document.querySelector('input[name="reportScope"]:checked')?.value || 'full';
        
        if (actualScope === 'full') {
            pagesSpan.textContent = '8-10 pages';
            includesSpan.textContent = 'All Exams, Grades, Summary';
            timeSpan.textContent = '~20 seconds';
            previewArea.innerHTML = `
                <div class="text-left w-full">
                    <span class="text-xs font-semibold text-blue-600 bg-blue-50 px-2 py-1 rounded">Full Year Report</span>
                    <div class="mt-3 space-y-2">
                        <div class="flex items-center text-sm"><i class="fas fa-check-circle text-green-500 mr-2 text-xs"></i><span>All Unit Tests</span></div>
                        <div class="flex items-center text-sm"><i class="fas fa-check-circle text-green-500 mr-2 text-xs"></i><span>Term 1 Examination</span></div>
                        <div class="flex items-center text-sm"><i class="fas fa-check-circle text-green-500 mr-2 text-xs"></i><span>Final Term Examination</span></div>
                        <div class="flex items-center text-sm"><i class="fas fa-star text-yellow-500 mr-2 text-xs"></i><span>Overall Grade & Annual Summary</span></div>
                    </div>
                </div>`;
        } else {
            const selectedExams = [];
            document.querySelectorAll('.exam-checkbox:checked').forEach(cb => {
                selectedExams.push(formatExamType(cb.value));
            });
            
            if (selectedExams.length === 0) {
                pagesSpan.textContent = '2-3 pages';
                includesSpan.textContent = 'No exams selected';
                timeSpan.textContent = '~5 seconds';
            } else {
                pagesSpan.textContent = `${selectedExams.length * 2 + 2} pages`;
                includesSpan.textContent = selectedExams.join(', ');
                timeSpan.textContent = '~10 seconds';
            }
            
            let previewHTML = `<div class="text-left w-full"><span class="text-xs font-semibold text-purple-600 bg-purple-50 px-2 py-1 rounded">Selected Exams Report</span><div class="mt-3 space-y-2">`;
            
            if (selectedExams.length > 0) {
                selectedExams.forEach(exam => {
                    previewHTML += `<div class="flex items-center text-sm"><i class="fas fa-check-circle text-green-500 mr-2 text-xs"></i>${exam}</div>`;
                });
            } else {
                previewHTML += `<div class="text-sm text-gray-500">No exams selected</div>`;
            }
            
            previewHTML += '</div></div>';
            previewArea.innerHTML = previewHTML;
        }
    } else {
        const classSelect = document.getElementById('reportClassSelect2');
        const className = classSelect?.value;
        const sectionName = document.getElementById('reportSectionSelect2')?.value;
        
        if (!className) {
            pagesSpan.textContent = '-';
            includesSpan.textContent = 'Select a class';
            timeSpan.textContent = '-';
            previewArea.innerHTML = `
                <div class="text-center py-4">
                    <i class="fas fa-users text-gray-300 text-4xl mb-4"></i>
                    <p class="text-gray-500 text-sm">Please select a class</p>
                </div>`;
            return;
        }
        
        const actualScope = scope || document.querySelector('input[name="classReportScope"]:checked')?.value || 'full';
        
        if (actualScope === 'full') {
            pagesSpan.textContent = '10-15 pages';
            includesSpan.textContent = `Class ${className}${sectionName ? '-' + sectionName : ''}, All Terms, Statistics`;
            timeSpan.textContent = '~30 seconds';
            previewArea.innerHTML = `
                <div class="text-left w-full">
                    <span class="text-xs font-semibold text-green-600 bg-green-50 px-2 py-1 rounded">Full Year Class Report</span>
                    <div class="mt-3 space-y-2">
                        <div class="flex items-center text-sm"><i class="fas fa-users text-blue-500 mr-2 text-xs"></i><span>Class ${className}${sectionName ? ' - Section ' + sectionName : ''}</span></div>
                        <div class="flex items-center text-sm"><i class="fas fa-check-circle text-green-500 mr-2 text-xs"></i><span>All Unit Tests</span></div>
                        <div class="flex items-center text-sm"><i class="fas fa-check-circle text-green-500 mr-2 text-xs"></i><span>Term 1 & Final Term</span></div>
                        <div class="flex items-center text-sm"><i class="fas fa-chart-bar text-green-500 mr-2 text-xs"></i><span>Class Average & Rankings</span></div>
                    </div>
                </div>`;
        } else {
            const selectedExams = [];
            document.querySelectorAll('.class-exam-checkbox:checked').forEach(cb => {
                selectedExams.push(formatExamType(cb.value));
            });
            
            pagesSpan.textContent = `${selectedExams.length * 3 + 2} pages`;
            includesSpan.textContent = selectedExams.join(', ') || 'Select exams';
            timeSpan.textContent = '~15 seconds';
            
            let previewHTML = `<div class="text-left w-full"><span class="text-xs font-semibold text-orange-600 bg-orange-50 px-2 py-1 rounded">Exam Wise Class Report</span><div class="mt-3 space-y-2">`;
            if (selectedExams.length > 0) {
                selectedExams.forEach(exam => {
                    previewHTML += `<div class="flex items-center text-sm"><i class="fas fa-check-circle text-green-500 mr-2 text-xs"></i>${exam} Analysis</div>`;
                });
            } else {
                previewHTML += '<div class="text-sm text-gray-500">No exams selected.</div>';
            }
            previewHTML += '</div></div>';
            previewArea.innerHTML = previewHTML;
        }
    }
}

// ─────────────────────────────────────────────────────────────
// GENERATE REPORT
// ─────────────────────────────────────────────────────────────
function generateReport() {
    const reportType = document.querySelector('.report-type-card.active')?.dataset.type;
    const format = document.querySelector('input[name="reportFormat"]:checked')?.value || 'html';
    
    if (reportType === 'individual') {
        generateIndividualReport(format);
    } else {
        generateClassReport(format);
    }
}

async function generateIndividualReport(format) {
    const studentSelect = document.getElementById('reportStudentSelect');
    const studentId = studentSelect?.value;
    
    if (!studentId) { 
        showToast('Please select a student', 'error'); 
        return; 
    }
    
    const academicYear = document.getElementById('reportAcademicYear')?.value || academicYears[0];
    const scope = document.querySelector('input[name="reportScope"]:checked')?.value || 'full';
    
    showLoadingOverlay(true);
    
    if (scope === 'full') {
        // Annual report
        const result = await apiFetch(`${API_BASE}/marks/reports/annual/${studentId}?academicYear=${academicYear}`);
        showLoadingOverlay(false);
        if (result.ok && result.data.success) {
            renderReportInNewWindow(result.data.data, 'annual');
            showToast('Annual report generated successfully', 'success');
        } else {
            showToast(result.data?.error || 'No data found for this student', 'warning');
        }
    } else {
        // Term wise - get selected exams
        const selectedExams = [];
        document.querySelectorAll('.exam-checkbox:checked').forEach(cb => {
            selectedExams.push(cb.value);
        });
        
        if (selectedExams.length === 0) {
            showLoadingOverlay(false);
            showToast('Please select at least one exam', 'error');
            return;
        }
        
        // For simplicity, get annual report
        const result = await apiFetch(`${API_BASE}/marks/reports/annual/${studentId}?academicYear=${academicYear}`);
        showLoadingOverlay(false);
        if (result.ok && result.data.success) {
            // Filter the report data based on selected exams
            const reportData = result.data.data;
            reportData.examWiseBreakdown = (reportData.examWiseBreakdown || []).filter(exam => 
                selectedExams.includes(exam.examType)
            );
            renderReportInNewWindow(reportData, 'filtered');
            showToast('Report generated successfully', 'success');
        } else {
            showToast(result.data?.error || 'No data found', 'warning');
        }
    }
}

async function generateClassReport(format) {
    const classValue = document.getElementById('reportClassSelect2')?.value;
    const sectionValue = document.getElementById('reportSectionSelect2')?.value;
    
    if (!classValue) { 
        showToast('Please select a class', 'error'); 
        return; 
    }
    
    const academicYear = document.getElementById('reportAcademicYear')?.value || academicYears[0];
    const scope = document.querySelector('input[name="classReportScope"]:checked')?.value || 'full';
    
    showLoadingOverlay(true);
    
    const selectedExams = scope === 'full' 
        ? examTypes 
        : Array.from(document.querySelectorAll('.class-exam-checkbox:checked')).map(cb => cb.value);
    
    if (selectedExams.length === 0) {
        showLoadingOverlay(false);
        showToast('Please select at least one exam', 'error');
        return;
    }
    
    const allClassMarks = [];
    for (const examType of selectedExams) {
        if (!sectionValue) continue;
        const result = await apiFetch(
            `${API_BASE}/marks/class/${encodeURIComponent(classValue)}/section/${encodeURIComponent(sectionValue)}/exam/${examType}?academicYear=${academicYear}`
        );
        if (result.ok && result.data.success && Array.isArray(result.data.data)) {
            allClassMarks.push(...result.data.data);
        }
    }
    
    showLoadingOverlay(false);
    
    if (allClassMarks.length === 0) {
        showToast('No marks data found for this class', 'warning');
        return;
    }
    
    const className = `Class ${classValue}${sectionValue ? ' - Section ' + sectionValue : ''}`;
    previewClassReport(allClassMarks, className, scope, selectedExams);
    showToast(`Class report generated for ${className}`, 'success');
}

// ─────────────────────────────────────────────────────────────
// PREVIEW REPORT
// ─────────────────────────────────────────────────────────────
async function previewReport() {
    console.log('Preview report function called');
    
    const reportType = document.querySelector('.report-type-card.active')?.dataset.type;
    
    if (reportType === 'individual') {
        const studentSelect = document.getElementById('reportStudentSelect');
        const studentId = studentSelect?.value;
        
        if (!studentId) { 
            showToast('Please select a student', 'error'); 
            return; 
        }
        
        const academicYear = document.getElementById('reportAcademicYear')?.value || academicYears[0];
        
        showLoadingOverlay(true);
        const result = await apiFetch(`${API_BASE}/marks/reports/annual/${studentId}?academicYear=${academicYear}`);
        showLoadingOverlay(false);
        
        if (result.ok && result.data.success) {
            renderReportInNewWindow(result.data.data, 'annual');
        } else {
            // Try student marks summary
            const summaryResult = await apiFetch(`${API_BASE}/marks/student/${studentId}/summary?academicYear=${academicYear}`);
            if (summaryResult.ok && summaryResult.data.success) {
                renderSummaryReportInNewWindow(summaryResult.data.data, studentId, academicYear);
            } else {
                showToast('No marks data found for this student', 'warning');
            }
        }
    } else {
        const classValue = document.getElementById('reportClassSelect2')?.value;
        const sectionValue = document.getElementById('reportSectionSelect2')?.value;
        
        if (!classValue) { 
            showToast('Please select a class', 'error'); 
            return; 
        }
        
        const academicYear = document.getElementById('reportAcademicYear')?.value || academicYears[0];
        const examTypes = ['TERM1', 'UNIT_TEST', 'TERM2'];
        const allClassMarks = [];
        
        showLoadingOverlay(true);
        for (const examType of examTypes) {
            if (!sectionValue) continue;
            const result = await apiFetch(
                `${API_BASE}/marks/class/${encodeURIComponent(classValue)}/section/${encodeURIComponent(sectionValue)}/exam/${examType}?academicYear=${academicYear}`
            );
            if (result.ok && result.data.success && Array.isArray(result.data.data)) {
                allClassMarks.push(...result.data.data);
            }
        }
        showLoadingOverlay(false);
        
        const className = `Class ${classValue}${sectionValue ? ' - Section ' + sectionValue : ''}`;
        const scope = document.querySelector('input[name="classReportScope"]:checked')?.value || 'full';
        
        if (allClassMarks.length === 0) {
            showToast('No marks data found for this class/section', 'warning');
            return;
        }
        
        previewClassReport(allClassMarks, className, scope, examTypes);
    }
}

// ─────────────────────────────────────────────────────────────
// PREVIEW CLASS REPORT
// ─────────────────────────────────────────────────────────────
function previewClassReport(classMarks, className, scope, selectedTerms) {
    const studentsBySection = {};
    classMarks.forEach(mark => {
        const section = mark.section || 'N/A';
        if (!studentsBySection[section]) studentsBySection[section] = [];
        studentsBySection[section].push(mark);
    });
    
    let reportHTML = `
        <!DOCTYPE html>
        <html>
        <head>
            <title>Class Report - ${className}</title>
            <style>
                body { font-family: 'Segoe UI', sans-serif; background: #f3f4f6; padding: 24px; }
                .report-card { max-width: 1200px; margin: 0 auto; }
                .card { background: white; border-radius: 12px; box-shadow: 0 2px 12px rgba(0,0,0,0.06); margin-bottom: 24px; overflow: hidden; }
                .card-header { background: linear-gradient(135deg, #10b981, #059669); color: white; padding: 24px 32px; }
                .card-body { padding: 24px 32px; }
                table { width: 100%; border-collapse: collapse; }
                th { background: #f9fafb; padding: 10px 16px; text-align: left; font-size: 12px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.05em; }
                td { padding: 10px 16px; }
                tr { border-bottom: 1px solid #f3f4f6; }
                .summary-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-top: 16px; }
                .summary-item { background: #f9fafb; border-radius: 8px; padding: 14px; text-align: center; }
                .grade-A { color: #059669; font-weight: bold; }
                .grade-B { color: #2563eb; font-weight: bold; }
                .grade-C { color: #d97706; font-weight: bold; }
                .grade-D { color: #ea580c; font-weight: bold; }
                .grade-F { color: #dc2626; font-weight: bold; }
                .no-print { text-align: center; padding: 24px; }
                @media print { .no-print { display: none; } body { background: white; } }
            </style>
        </head>
        <body>
            <div class="report-card">
                <div class="card">
                    <div class="card-header">
                        <h1 style="margin:0; font-size:22px; font-weight:700;">Class Performance Report</h1>
                        <p style="margin:6px 0 0; opacity:0.85;">${className}</p>
                        <p style="margin:4px 0 0; font-size:12px; opacity:0.7;">Generated: ${new Date().toLocaleDateString()}</p>
                    </div>
                </div>
    `;
    
    Object.keys(studentsBySection).forEach(section => {
        const students = studentsBySection[section];
        const studentMap = {};
        students.forEach(student => {
            if (!studentMap[student.studentId]) studentMap[student.studentId] = {};
            studentMap[student.studentId][student.examType || student.term] = student;
        });
        
        let term1Percent = 0;
        let term2Percent = 0;
        let term1Count = 0;
        let term2Count = 0;
        
        let rowsHTML = '';
        Object.keys(studentMap).forEach(studentId => {
            const studentData = studentMap[studentId];
            const term1Data = studentData['TERM1'] || null;
            const term2Data = studentData['TERM2'] || null;
            const utData = studentData['UNIT_TEST'] || null;
            
            const t1Percent = term1Data?.percentage || 0;
            const t1Grade = term1Data?.grade || 'N/A';
            const t2Percent = term2Data?.percentage || 0;
            const t2Grade = term2Data?.grade || 'N/A';
            const utPercent = utData?.percentage || '-';
            const avgPercent = (t1Percent + t2Percent) > 0 ? ((t1Percent + t2Percent) / 2) : (utPercent !== '-' ? utPercent : 0);
            const avgGrade = calculateGrade(avgPercent);
            
            if (t1Percent > 0) { term1Percent += t1Percent; term1Count++; }
            if (t2Percent > 0) { term2Percent += t2Percent; term2Count++; }
            
            const studentName = (term1Data || term2Data || utData)?.studentName || `Student ${studentId}`;
            
            rowsHTML += `
                <tr>
                    <td>${studentId}</td>
                    <td style="font-weight:500;">${studentName}</td>
                    <td>${t1Percent > 0 ? t1Percent + '%' : '-'}</td>
                    <td class="grade-${t1Grade !== 'N/A' ? t1Grade : ''}">${t1Grade}</td>
                    <td>${t2Percent > 0 ? t2Percent + '%' : '-'}</td>
                    <td class="grade-${t2Grade !== 'N/A' ? t2Grade : ''}">${t2Grade}</td>
                    <td class="grade-${avgGrade}">${avgPercent > 0 ? avgPercent.toFixed(1) + '% (' + avgGrade + ')' : '-'}</td>
                </tr>`;
        });
        
        const avgTerm1 = term1Count > 0 ? (term1Percent / term1Count) : 0;
        const avgTerm2 = term2Count > 0 ? (term2Percent / term2Count) : 0;
        const classAvg = (avgTerm1 + avgTerm2) / (avgTerm1 > 0 && avgTerm2 > 0 ? 2 : 1);
        
        reportHTML += `
            <div class="card">
                <div class="card-body">
                    <h3 style="margin:0 0 16px; font-size:16px; color:#374151;">Section ${section}</h3>
                    <table>
                        <thead><tr>
                            <th>Student ID</th>
                            <th>Student Name</th>
                            <th>Term 1 %</th>
                            <th>Term 1 Grade</th>
                            <th>Term 2 %</th>
                            <th>Term 2 Grade</th>
                            <th>Average</th>
                        </tr></thead>
                        <tbody>${rowsHTML}</tbody>
                    </table>
                    <div class="summary-grid">
                        <div class="summary-item"><p style="margin:0; font-size:12px; color:#6b7280;">Avg Term 1</p><p style="margin:8px 0 0; font-size:20px; font-weight:700; color:#2563eb;">${avgTerm1.toFixed(1)}%</p></div>
                        <div class="summary-item"><p style="margin:0; font-size:12px; color:#6b7280;">Avg Term 2</p><p style="margin:8px 0 0; font-size:20px; font-weight:700; color:#10b981;">${avgTerm2.toFixed(1)}%</p></div>
                        <div class="summary-item"><p style="margin:0; font-size:12px; color:#6b7280;">Overall Avg</p><p style="margin:8px 0 0; font-size:20px; font-weight:700; color:#7c3aed;">${classAvg.toFixed(1)}%</p></div>
                    </div>
                </div>
            </div>`;
    });
    
    reportHTML += `
                <div class="no-print">
                    <button onclick="window.print()" style="padding:10px 24px; background:#10b981; color:white; border:none; border-radius:8px; cursor:pointer; font-size:14px; margin-right:8px;">Print Report</button>
                    <button onclick="window.close()" style="padding:10px 24px; background:#6b7280; color:white; border:none; border-radius:8px; cursor:pointer; font-size:14px;">Close</button>
                </div>
            </div>
        </body>
        </html>`;
    
    const reportWindow = window.open('', '_blank');
    reportWindow.document.write(reportHTML);
    reportWindow.document.close();
}

// ─────────────────────────────────────────────────────────────
// TOAST NOTIFICATIONS
// ─────────────────────────────────────────────────────────────
function showToast(message, type = 'info') {
    const toastContainer = document.getElementById('toastContainer');
    if (!toastContainer) return;
    
    const toast = document.createElement('div');
    toast.className = `px-6 py-3 rounded-lg shadow-lg text-white flex items-center justify-between animate-slideIn ${
        type === 'success' ? 'bg-green-500' :
        type === 'error' ? 'bg-red-500' :
        type === 'warning' ? 'bg-yellow-500' : 'bg-blue-500'
    }`;
    
    const icons = { 
        success: 'fa-check-circle', 
        error: 'fa-exclamation-circle', 
        warning: 'fa-exclamation-triangle', 
        info: 'fa-info-circle' 
    };
    
    toast.innerHTML = `
        <div class="flex items-center">
            <i class="fas ${icons[type]} mr-3"></i>
            <span>${message}</span>
        </div>
        <button class="ml-4 hover:opacity-75"><i class="fas fa-times"></i></button>
    `;
    
    toastContainer.appendChild(toast);
    
    setTimeout(() => {
        toast.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => toast.remove(), 300);
    }, 5000);
    
    toast.querySelector('button').addEventListener('click', function() {
        toast.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => toast.remove(), 300);
    });
}

// ─────────────────────────────────────────────────────────────
// LOADING OVERLAY
// ─────────────────────────────────────────────────────────────
function showLoadingOverlay(show) {
    const overlay = document.getElementById('loadingOverlay');
    if (overlay) {
        if (show) overlay.classList.remove('hidden');
        else overlay.classList.add('hidden');
    }
}

// ─────────────────────────────────────────────────────────────
// MODAL SETUP
// ─────────────────────────────────────────────────────────────
function setupModals() {
    const closeEditModal = document.getElementById('closeEditModal');
    const closeReportModal = document.getElementById('closeReportModal');
    
    if (closeEditModal) {
        closeEditModal.addEventListener('click', function() {
            document.getElementById('editMarksModal')?.classList.add('hidden');
        });
    }
    
    if (closeReportModal) {
        closeReportModal.addEventListener('click', function() {
            document.getElementById('reportPreviewModal')?.classList.add('hidden');
        });
    }
}

// ─────────────────────────────────────────────────────────────
// SIDEBAR SETUP
// ─────────────────────────────────────────────────────────────
function setupSidebar() {
    const sidebar = document.getElementById('sidebar');
    const sidebarToggle = document.getElementById('sidebarToggle');
    const mainContent = document.getElementById('mainContent');
    const overlay = document.getElementById('sidebarOverlay');
    const toggleIcon = document.getElementById('sidebarToggleIcon');
    
    let sidebarCollapsed = false;
    let isMobile = window.innerWidth < 1024;
    
    if (sidebarToggle) {
        sidebarToggle.addEventListener('click', function() {
            if (isMobile) {
                sidebar.classList.toggle('mobile-open');
                overlay.classList.toggle('active');
                document.body.classList.toggle('sidebar-open');
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
        });
    }
    
    if (overlay) {
        overlay.addEventListener('click', function() {
            sidebar.classList.remove('mobile-open');
            overlay.classList.remove('active');
            document.body.classList.remove('sidebar-open');
        });
    }
    
    window.addEventListener('resize', function() {
        isMobile = window.innerWidth < 1024;
        if (!isMobile && sidebar) {
            sidebar.classList.remove('mobile-open');
            if (overlay) overlay.classList.remove('active');
        }
    });
}

// ─────────────────────────────────────────────────────────────
// ADD ANIMATION & STYLE BLOCKS
// ─────────────────────────────────────────────────────────────
const style = document.createElement('style');
style.textContent = `
    .marks-field, .grade-field { transition: all 0.3s ease; }
    .marks-field.active, .grade-field.active { display: flex !important; }
    .uppercase-input { text-transform: uppercase; }
    .uppercase-input::placeholder { text-transform: none; }
    .performance-btn.active { background-color: #3b82f6; color: white; border-color: #3b82f6; }
    .grade-display { transition: all 0.2s ease; }
    .other-subject-item { transition: all 0.2s ease; border: 1px solid #e5e7eb; }
    .other-subject-item:hover { border-color: #3b82f6; box-shadow: 0 2px 4px rgba(0,0,0,0.05); }
    .other-subject-item .edit-other-subject, .other-subject-item .remove-other-subject { opacity: 0.7; transition: all 0.2s ease; }
    .other-subject-item:hover .edit-other-subject, .other-subject-item:hover .remove-other-subject { opacity: 1; transform: scale(1.05); }
    .entry-type-badge { display: inline-block; font-size: 0.7rem; font-weight: 500; }
    .other-marks-field, .other-grade-field { transition: all 0.3s ease; }
    .other-subjects-empty { animation: fadeIn 0.3s ease; }
    @keyframes fadeIn { from { opacity: 0; transform: translateY(-10px); } to { opacity: 1; transform: translateY(0); } }
    .tab-btn.active { border-bottom: 2px solid #3b82f6; color: #374151; font-weight: 600; }
    .sticky.right-0 { position: sticky; right: 0; background-color: white; transition: box-shadow 0.2s ease; border-left: 1px solid #e5e7eb; }
    tr:hover .sticky.right-0 { background-color: #f9fafb; }
    thead th { position: sticky; top: 0; background: #f9fafb; z-index: 20; }
    thead th.sticky.right-0 { z-index: 30; background: #f9fafb; }
    @keyframes slideIn { from { transform: translateX(100%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
    @keyframes slideOut { from { transform: translateX(0); opacity: 1; } to { transform: translateX(100%); opacity: 0; } }
    .animate-slideIn { animation: slideIn 0.3s ease; }
    #reportPreviewArea { min-height: 200px; transition: all 0.3s ease; background-color: #f9fafb; border: 1px solid #e5e7eb; border-radius: 0.5rem; padding: 1rem; overflow-y: auto; max-height: 300px; }
    #reportPreviewArea > div { animation: fadeIn 0.3s ease; }
    .report-type-card { transition: all 0.2s ease; cursor: pointer; }
    .report-type-card:hover { transform: translateY(-2px); box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1); }
    .report-type-card.active { border-color: #3b82f6; background-color: #eff6ff; }
`;
document.head.appendChild(style);