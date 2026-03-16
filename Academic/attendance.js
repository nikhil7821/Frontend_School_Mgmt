// Attendance Management System
// Backend integrated with port 8084

const BASE_URL = 'http://localhost:8084/api/attendance';
const STUDENT_BASE_URL = 'http://localhost:8084/api/students';

// Initialize application
document.addEventListener('DOMContentLoaded', function() {
    setupEventListeners();
    setupResponsiveSidebar();
    initializeAttendanceModule();
});

// Global variables
let sidebarCollapsed = false;
let isMobile = window.innerWidth < 1024;
let attendanceData = [];
let filteredData = [];
let currentPage = 1;
const itemsPerPage = 10;
let currentMonth = new Date().getMonth();
let currentYear = new Date().getFullYear();
let selectedDate = new Date().toISOString().split('T')[0];
let selectedClass = 'all';
let selectedSection = 'all';
let selectedStatus = 'all';
let summaryData = [];
let summaryMonth = new Date().getMonth();
let summaryYear = new Date().getFullYear();
let summaryClass = 'all';
let summarySection = 'all';
let allStudentsForDate = [];

// Bulk update variables
let bulkSelectedStudents = new Set();
let bulkStatus = 'present';
let bulkStudentListData = [];

// Month names array
const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
                   'July', 'August', 'September', 'October', 'November', 'December'];

// ─────────────────────────────────────────────────────────
//  API Helper: get JWT token from localStorage
// ─────────────────────────────────────────────────────────
function getAuthHeaders() {
    const token = localStorage.getItem('admin_jwt_token');
    return {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
    };
}

// ─────────────────────────────────────────────────────────
//  Parse class string like "10A" => { className: "10", section: "A" }
// ─────────────────────────────────────────────────────────
function parseClassSection(classStr) {
    if (!classStr || classStr === 'all') return { className: null, section: null };
    
    const match = classStr.match(/^(\d+)\s*([A-Za-z]+)?$/);
    if (match) {
        return { 
            className: match[1], 
            section: match[2] ? match[2].toUpperCase() : '' 
        };
    }
    
    if (/^\d+$/.test(classStr)) {
        return { className: classStr, section: '' };
    }
    
    return { className: classStr, section: '' };
}

// ─────────────────────────────────────────────────────────
//  API CALLS - DIRECT FETCH (CORS handled by backend)
// ─────────────────────────────────────────────────────────

// Mark single attendance
async function apiMarkAttendance(requestDto) {
    const response = await fetch(`${BASE_URL}/mark`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(requestDto),
        mode: 'cors',
        credentials: 'include'
    });
    if (!response.ok) {
        const err = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(err.error || 'Failed to mark attendance');
    }
    return await response.json();
}

// Mark bulk attendance
async function apiMarkBulkAttendance(requestDto) {
    const response = await fetch(`${BASE_URL}/bulk-mark`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(requestDto),
        mode: 'cors',
        credentials: 'include'
    });
    if (!response.ok) {
        const err = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(err.error || 'Failed to mark bulk attendance');
    }
    return await response.json();
}

// Get attendance by class, section, date
async function apiGetAttendanceByClassAndDate(className, section, date) {
    const response = await fetch(
        `${BASE_URL}/class/${encodeURIComponent(className)}/section/${encodeURIComponent(section)}/date/${date}`,
        { 
            method: 'GET',
            headers: getAuthHeaders(),
            mode: 'cors',
            credentials: 'include'
        }
    );
    if (!response.ok) {
        const err = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(err.error || 'Failed to get attendance');
    }
    return await response.json();
}

// Get student attendance between dates
async function apiGetStudentAttendance(studentId, startDate, endDate) {
    const response = await fetch(
        `${BASE_URL}/student/${studentId}?startDate=${startDate}&endDate=${endDate}`,
        { 
            method: 'GET',
            headers: getAuthHeaders(),
            mode: 'cors',
            credentials: 'include'
        }
    );
    if (!response.ok) {
        const err = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(err.error || 'Failed to get student attendance');
    }
    return await response.json();
}

// Get attendance percentage
async function apiGetAttendancePercentage(studentId, startDate, endDate) {
    const response = await fetch(
        `${BASE_URL}/percentage/${studentId}?startDate=${startDate}&endDate=${endDate}`,
        { 
            method: 'GET',
            headers: getAuthHeaders(),
            mode: 'cors',
            credentials: 'include'
        }
    );
    if (!response.ok) {
        const err = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(err.error || 'Failed to get attendance percentage');
    }
    return await response.json();
}

// Get monthly summary
async function apiGetMonthlySummary(className, section, year, month) {
    const response = await fetch(
        `${BASE_URL}/summary/monthly?className=${encodeURIComponent(className)}&section=${encodeURIComponent(section)}&year=${year}&month=${month}`,
        { 
            method: 'GET',
            headers: getAuthHeaders(),
            mode: 'cors',
            credentials: 'include'
        }
    );
    if (!response.ok) {
        const err = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(err.error || 'Failed to get monthly summary');
    }
    return await response.json();
}

// Update attendance by ID
async function apiUpdateAttendance(attendanceId, requestDto) {
    const response = await fetch(`${BASE_URL}/${attendanceId}`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify(requestDto),
        mode: 'cors',
        credentials: 'include'
    });
    if (!response.ok) {
        const err = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(err.error || 'Failed to update attendance');
    }
    return await response.json();
}

// Get non-affecting holidays
async function apiGetNonAffectingHolidays(startDate, endDate) {
    const response = await fetch(
        `${BASE_URL}/holiday/non-affecting?startDate=${startDate}&endDate=${endDate}`,
        { 
            method: 'GET',
            headers: getAuthHeaders(),
            mode: 'cors',
            credentials: 'include'
        }
    );
    if (!response.ok) {
        const err = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(err.error || 'Failed to get holidays');
    }
    return await response.json();
}

// Check working day
async function apiCheckWorkingDay(date) {
    const response = await fetch(
        `${BASE_URL}/check-working-day/${date}`,
        { 
            method: 'GET',
            headers: getAuthHeaders(),
            mode: 'cors',
            credentials: 'include'
        }
    );
    if (!response.ok) {
        const err = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(err.error || 'Failed to check working day');
    }
    return await response.json();
}

// ─────────────────────────────────────────────────────────
//  Setup Event Listeners
// ─────────────────────────────────────────────────────────
function setupEventListeners() {
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
            if (notificationsDropdown) notificationsDropdown.classList.add('hidden');
        }
        if (!event.target.closest('#userMenuBtn')) {
            const userMenuDropdown = document.getElementById('userMenuDropdown');
            if (userMenuDropdown) userMenuDropdown.classList.add('hidden');
        }
    });

    // Close sidebar when clicking on overlay
    const sidebarOverlay = document.getElementById('sidebarOverlay');
    if (sidebarOverlay) {
        sidebarOverlay.addEventListener('click', closeMobileSidebar);
    }

    // Attendance date change
    const attendanceDate = document.getElementById('attendanceDate');
    if (attendanceDate) {
        attendanceDate.addEventListener('change', function(e) {
            selectedDate = e.target.value;
            loadAttendanceData();
        });
    }

    // Class filter change
    const classFilter = document.getElementById('classFilter');
    if (classFilter) {
        classFilter.addEventListener('change', function(e) {
            selectedClass = e.target.value;
            
            const sectionFilter = document.getElementById('sectionFilter');
            if (sectionFilter) {
                if (selectedClass === 'all') {
                    sectionFilter.disabled = true;
                    sectionFilter.value = 'all';
                    selectedSection = 'all';
                } else {
                    sectionFilter.disabled = false;
                    populateSectionsForClass(selectedClass);
                }
            }
            
            loadAttendanceData();
        });
    }

    // Status filter change
    const statusFilter = document.getElementById('statusFilter');
    if (statusFilter) {
        statusFilter.addEventListener('change', function(e) {
            selectedStatus = e.target.value;
        });
    }

    // Apply filters button
    const applyFiltersBtn = document.getElementById('applyFiltersBtn');
    if (applyFiltersBtn) {
        applyFiltersBtn.addEventListener('click', function(e) {
            e.preventDefault();
            applyFilters();
        });
    }

    // Summary modal filters
    const summaryMonthEl = document.getElementById('summaryMonth');
    if (summaryMonthEl) {
        summaryMonthEl.addEventListener('change', function(e) {
            summaryMonth = parseInt(e.target.value);
        });
    }

    const summaryYearEl = document.getElementById('summaryYear');
    if (summaryYearEl) {
        summaryYearEl.addEventListener('change', function(e) {
            summaryYear = parseInt(e.target.value);
        });
    }

    const summaryClassEl = document.getElementById('summaryClass');
    if (summaryClassEl) {
        summaryClassEl.addEventListener('change', function(e) {
            summaryClass = e.target.value;
        });
    }
}

// ─────────────────────────────────────────────────────────
//  Responsive Sidebar Setup
// ─────────────────────────────────────────────────────────
function setupResponsiveSidebar() {
    isMobile = window.innerWidth < 1024;

    if (isMobile) {
        closeMobileSidebar();
    } else {
        const sidebar = document.getElementById('sidebar');
        const mainContent = document.getElementById('mainContent');

        if (sidebar && mainContent) {
            if (sidebarCollapsed) {
                sidebar.classList.add('collapsed');
                mainContent.classList.add('sidebar-collapsed');
            } else {
                sidebar.classList.remove('collapsed');
                mainContent.classList.remove('sidebar-collapsed');
            }
        }
    }

    window.addEventListener('resize', handleResize);
}

function populateSectionsForClass(className) {
    console.log('Populating sections for class:', className);
    
    const sectionFilter = document.getElementById('sectionFilter');
    if (!sectionFilter) return;
    
    sectionFilter.innerHTML = '<option value="all">All Sections</option>';
    
    const sections = ['A', 'B', 'C', 'D'];
    sections.forEach(section => {
        const option = document.createElement('option');
        option.value = section;
        option.textContent = `Section ${section}`;
        sectionFilter.appendChild(option);
    });
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

            if (sidebar && mainContent && overlay) {
                sidebar.classList.remove('mobile-open');
                overlay.classList.remove('active');
                document.body.classList.remove('sidebar-open');

                if (sidebarCollapsed) {
                    sidebar.classList.add('collapsed');
                    mainContent.classList.add('sidebar-collapsed');
                } else {
                    sidebar.classList.remove('collapsed');
                    mainContent.classList.remove('sidebar-collapsed');
                }
            }
        }
    }
}

function toggleSidebar() {
    if (isMobile) {
        const sidebar = document.getElementById('sidebar');
        if (sidebar) {
            if (sidebar.classList.contains('mobile-open')) {
                closeMobileSidebar();
            } else {
                openMobileSidebar();
            }
        }
    } else {
        const sidebar = document.getElementById('sidebar');
        const mainContent = document.getElementById('mainContent');
        const toggleIcon = document.getElementById('sidebarToggleIcon');

        if (sidebar && mainContent && toggleIcon) {
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
}

function openMobileSidebar() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebarOverlay');

    if (sidebar && overlay) {
        sidebar.classList.add('mobile-open');
        overlay.classList.add('active');
        document.body.classList.add('sidebar-open');
    }
}

function closeMobileSidebar() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebarOverlay');

    if (sidebar && overlay) {
        sidebar.classList.remove('mobile-open');
        overlay.classList.remove('active');
        document.body.classList.remove('sidebar-open');
    }
}

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

// ─────────────────────────────────────────────────────────
//  Initialize Attendance Module
// ─────────────────────────────────────────────────────────
function initializeAttendanceModule() {
    const currentDateEl = document.getElementById('currentDate');
    if (currentDateEl) {
        const today = new Date();
        currentDateEl.textContent = today.toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    }

    const attendanceDate = document.getElementById('attendanceDate');
    if (attendanceDate) {
        attendanceDate.value = selectedDate;
    }

    loadClassesForDropdown();
    loadAttendanceData();
    generateCalendar();

    const summaryMonthEl = document.getElementById('summaryMonth');
    const summaryYearEl = document.getElementById('summaryYear');
    if (summaryMonthEl) summaryMonthEl.value = summaryMonth;
    if (summaryYearEl) summaryYearEl.value = summaryYear;
}

// ─────────────────────────────────────────────────────────
//  Load Classes for Dropdown
// ─────────────────────────────────────────────────────────
async function loadClassesForDropdown() {
    try {
        const response = await fetch(`${STUDENT_BASE_URL}/get-all-students?page=0&size=1000`, {
            method: 'GET',
            headers: getAuthHeaders(),
            mode: 'cors',
            credentials: 'include'
        });
        
        if (!response.ok) {
            throw new Error('Failed to load students');
        }
        
        const pageData = await response.json();
        const students = pageData.content || [];
        
        const classSectionSet = new Set();
        students.forEach(student => {
            if (student.currentClass && student.section) {
                classSectionSet.add(`${student.currentClass}${student.section}`);
            }
        });
        
        const classSectionOptions = Array.from(classSectionSet).sort();
        console.log('Class-Section options:', classSectionOptions);
        
        const classSelect = document.getElementById('classFilter');
        if (!classSelect) return;
        
        classSelect.innerHTML = '<option value="all">All Classes</option>';
        
        classSectionOptions.forEach(option => {
            const optElement = document.createElement('option');
            optElement.value = option;
            optElement.textContent = `Class ${option}`;
            classSelect.appendChild(optElement);
        });
        
    } catch (error) {
        console.error('Error loading classes:', error);
        // Fallback to default classes if API fails
        const classSelect = document.getElementById('classFilter');
        if (classSelect) {
            const defaultClasses = ['9A', '9B', '10A', '10B', '11A', '11B', '12A', '12B'];
            defaultClasses.forEach(className => {
                const option = document.createElement('option');
                option.value = className;
                option.textContent = `Class ${className}`;
                classSelect.appendChild(option);
            });
        }
    }
}

// ─────────────────────────────────────────────────────────
//  Load Attendance Data from Backend
// ─────────────────────────────────────────────────────────
async function loadAttendanceData() {
    showLoading();
    
    console.log('========================================');
    console.log('🔍 DEBUG: Starting loadAttendanceData()');
    console.log('Selected Class:', selectedClass);
    console.log('Selected Section:', selectedSection);
    console.log('Selected Date:', selectedDate);
    console.log('========================================');

    try {
        if (selectedClass === 'all') {
            console.log('📡 Fetching ALL students...');
            
            const studentsUrl = `${STUDENT_BASE_URL}/get-all-students?page=0&size=1000`;
            console.log('Students API URL:', studentsUrl);
            
            const headers = getAuthHeaders();
            const studentsResponse = await fetch(studentsUrl, { 
                method: 'GET',
                headers: headers,
                mode: 'cors',
                credentials: 'include'
            });
            
            console.log('Students API Response Status:', studentsResponse.status);
            
            if (!studentsResponse.ok) {
                throw new Error(`Failed to fetch all students: ${studentsResponse.status}`);
            }
            
            const pageData = await studentsResponse.json();
            const students = pageData.content || [];
            
            console.log(`✅ Found ${students.length} total students`);
            
            allStudentsForDate = students.map(student => {
                return {
                    id: student.stdId || student.studentId || student.id,
                    attendanceId: null,
                    name: `${student.firstName || ''} ${student.lastName || ''}`.trim() || 'Unknown Student',
                    class: `${student.currentClass || ''}${student.section || ''}`,
                    rollNo: student.studentRollNumber || student.rollNumber || '-',
                    todayStatus: null,
                    todayTime: null,
                    todayNotes: null
                };
            });
            
            console.log(`✅ Mapped ${allStudentsForDate.length} students for display`);
            console.log('ℹ️ "All Classes" view shows student list only (no per-day attendance status)');
            
        } else {
            const { className, section } = parseClassSection(selectedClass);
            console.log('Parsed className:', className);
            console.log('Parsed section:', section);
            
            if (!className) {
                showToast('Please select a valid class', 'error');
                allStudentsForDate = [];
            } else {
                const targetSection = (selectedSection && selectedSection !== 'all') ? selectedSection : section;
                
                if (!targetSection || targetSection === 'all') {
                    showToast('Please select a specific section', 'info');
                    allStudentsForDate = [];
                } else {
                    console.log(`📡 Fetching students for class: ${className}, section: ${targetSection}`);
                    
                    const studentsUrl = `${STUDENT_BASE_URL}/get-students-by-class-section?className=${encodeURIComponent(className)}&section=${encodeURIComponent(targetSection)}`;
                    
                    console.log('Students API URL:', studentsUrl);
                    
                    const headers = getAuthHeaders();
                    let students = [];
                    
                    try {
                        const studentsResponse = await fetch(studentsUrl, { 
                            method: 'GET',
                            headers: headers,
                            mode: 'cors',
                            credentials: 'include'
                        });
                        
                        console.log('Students API Response Status:', studentsResponse.status);
                        
                        if (studentsResponse.ok) {
                            students = await studentsResponse.json();
                        } else {
                            console.log('Trying alternative endpoint...');
                            const altUrl = `${STUDENT_BASE_URL}/get-students-by-class/${encodeURIComponent(className)}`;
                            console.log('Alternative URL:', altUrl);
                            
                            const altResponse = await fetch(altUrl, { 
                                method: 'GET',
                                headers: headers,
                                mode: 'cors',
                                credentials: 'include'
                            });
                            
                            if (!altResponse.ok) {
                                throw new Error(`Failed to fetch students: ${studentsResponse.status}`);
                            }
                            
                            students = await altResponse.json();
                            if (targetSection && targetSection !== 'all') {
                                students = students.filter(s => s.section === targetSection);
                            }
                        }
                    } catch (error) {
                        console.error('Error fetching students:', error);
                        throw error;
                    }
                    
                    console.log(`✅ Found ${students.length} students in response`);
                    
                    let attendanceRecords = [];
                    try {
                        const attendanceUrl = `${BASE_URL}/class/${encodeURIComponent(className)}/section/${encodeURIComponent(targetSection)}/date/${selectedDate}`;
                        console.log('Attendance API URL:', attendanceUrl);
                        
                        const attendanceResponse = await fetch(attendanceUrl, { 
                            method: 'GET',
                            headers: headers,
                            mode: 'cors',
                            credentials: 'include'
                        });
                        
                        if (attendanceResponse.ok) {
                            attendanceRecords = await attendanceResponse.json();
                            console.log(`✅ Found ${attendanceRecords.length} attendance records`);
                        } else {
                            console.log('ℹ️ No attendance records found for this date');
                        }
                    } catch (attError) {
                        console.log('ℹ️ Could not fetch attendance records:', attError.message);
                    }
                    
                    allStudentsForDate = students.map(student => {
                        const studentId = student.stdId || student.studentId || student.id;
                        const attendanceRecord = attendanceRecords.find(a => {
                            return a.studentId === studentId || 
                                   a.student?.stdId === studentId ||
                                   a.student?.studentId === studentId;
                        });
                        
                        return {
                            id: studentId,
                            attendanceId: attendanceRecord ? attendanceRecord.id : null,
                            name: `${student.firstName || ''} ${student.lastName || ''}`.trim() || 
                                  `${student.firstName || ''} ${student.middleName || ''} ${student.lastName || ''}`.trim() || 
                                  'Unknown Student',
                            class: `${student.currentClass || className}${student.section || targetSection}`,
                            rollNo: student.studentRollNumber || student.rollNumber || '-',
                            todayStatus: attendanceRecord ? attendanceRecord.status?.toLowerCase() : null,
                            todayTime: attendanceRecord ? attendanceRecord.time : null,
                            todayNotes: attendanceRecord ? attendanceRecord.notes : null
                        };
                    });
                    
                    console.log(`✅ Mapped ${allStudentsForDate.length} students for attendance`);
                }
            }
        }

        console.log('Applying status filter:', selectedStatus);
        filteredData = [...allStudentsForDate];
        if (selectedStatus !== 'all') {
            filteredData = filteredData.filter(student => student.todayStatus === selectedStatus);
            console.log(`Filtered to ${filteredData.length} students with status: ${selectedStatus}`);
        }

        currentPage = 1;
        updateStatistics();
        renderAttendanceTable();
        generateCalendar();

        console.log('========================================');
        console.log('✅ loadAttendanceData() completed');
        console.log('Total students loaded:', allStudentsForDate.length);
        console.log('========================================');

    } catch (error) {
        console.error('❌ CRITICAL ERROR in loadAttendanceData():', error);
        console.error('Error stack:', error.stack);
        showToast('Error loading attendance data: ' + error.message, 'error');
        filteredData = [];
        allStudentsForDate = [];
        updateStatistics();
        renderAttendanceTable();
    } finally {
        hideLoading();
    }
}

// ─────────────────────────────────────────────────────────
//  Update Statistics
// ─────────────────────────────────────────────────────────
function updateStatistics() {
    const totalStudents = allStudentsForDate.length;
    const presentCount = allStudentsForDate.filter(s => s.todayStatus === 'present').length;
    const absentCount = allStudentsForDate.filter(s => s.todayStatus === 'absent').length;
    const lateCount = allStudentsForDate.filter(s => s.todayStatus === 'late').length;
    const halfdayCount = allStudentsForDate.filter(s => s.todayStatus === 'halfday').length;

    const presentEl = document.getElementById('presentCount');
    const absentEl = document.getElementById('absentCount');
    const lateEl = document.getElementById('lateCount');
    const halfdayEl = document.getElementById('halfdayCount');
    const presentPercentEl = document.getElementById('presentPercentage');
    const absentPercentEl = document.getElementById('absentPercentage');
    const latePercentEl = document.getElementById('latePercentage');
    const halfdayPercentEl = document.getElementById('halfdayPercentage');

    if (presentEl) presentEl.textContent = presentCount;
    if (absentEl) absentEl.textContent = absentCount;
    if (lateEl) lateEl.textContent = lateCount;
    if (halfdayEl) halfdayEl.textContent = halfdayCount;

    if (presentPercentEl) {
        presentPercentEl.textContent = totalStudents > 0 ?
            `${Math.round((presentCount / totalStudents) * 100)}%` : '0%';
    }
    if (absentPercentEl) {
        absentPercentEl.textContent = totalStudents > 0 ?
            `${Math.round((absentCount / totalStudents) * 100)}%` : '0%';
    }
    if (latePercentEl) {
        latePercentEl.textContent = totalStudents > 0 ?
            `${Math.round((lateCount / totalStudents) * 100)}%` : '0%';
    }
    if (halfdayPercentEl) {
        halfdayPercentEl.textContent = totalStudents > 0 ?
            `${Math.round((halfdayCount / totalStudents) * 100)}%` : '0%';
    }
}

// ─────────────────────────────────────────────────────────
//  Render Attendance Table
// ─────────────────────────────────────────────────────────
function renderAttendanceTable() {
    const tableBody = document.getElementById('attendanceTableBody');
    const tableInfo = document.getElementById('tableInfo');
    const prevBtn = document.getElementById('prevBtn');
    const nextBtn = document.getElementById('nextBtn');

    if (!tableBody) return;

    if (filteredData.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="7" class="px-6 py-12 text-center text-gray-500">
                    <i class="fas fa-user-slash text-4xl mb-4"></i>
                    <p class="text-lg font-medium">No students found</p>
                    <p class="text-sm mt-2">Try adjusting your filters or select a specific class</p>
                </td>
            </tr>
        `;
        if (tableInfo) tableInfo.textContent = `Showing 0 students`;
        if (prevBtn) prevBtn.disabled = true;
        if (nextBtn) nextBtn.disabled = true;
        return;
    }

    const totalPages = Math.ceil(filteredData.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = Math.min(startIndex + itemsPerPage, filteredData.length);
    const pageData = filteredData.slice(startIndex, endIndex);

    tableBody.innerHTML = '';

    pageData.forEach(student => {
        const row = document.createElement('tr');
        const status = student.todayStatus || 'pending';

        row.innerHTML = `
            <td class="px-6 py-4 whitespace-nowrap">
                <div class="flex items-center">
                    <div class="h-10 w-10 bg-blue-100 rounded-full flex items-center justify-center mr-3">
                        <i class="fas fa-user text-blue-600"></i>
                    </div>
                    <div>
                        <div class="font-medium text-gray-900">${student.name}</div>
                        <div class="text-sm text-gray-500">${student.class}</div>
                    </div>
                </div>
            </td>
            <td class="px-6 py-4 whitespace-nowrap">
                <span class="px-3 py-1 bg-gray-100 text-gray-800 rounded-full text-sm font-medium">
                    ${student.class}
                </span>
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                ${student.rollNo}
            </td>
            <td class="px-6 py-4 whitespace-nowrap">
                <div class="flex space-x-2 flex-wrap gap-2">
                    <button onclick="updateAttendance(${student.id}, ${student.attendanceId ? student.attendanceId : 'null'}, 'present')"
                            class="px-4 py-2 rounded-lg ${status === 'present' ? 'bg-green-100 text-green-700 border-2 border-green-300' : 'bg-gray-100 text-gray-700 hover:bg-green-50'} transition-all attendance-status">
                        <i class="fas fa-check-circle mr-1"></i> Present
                    </button>
                    <button onclick="updateAttendance(${student.id}, ${student.attendanceId ? student.attendanceId : 'null'}, 'absent')"
                            class="px-4 py-2 rounded-lg ${status === 'absent' ? 'bg-red-100 text-red-700 border-2 border-red-300' : 'bg-gray-100 text-gray-700 hover:bg-red-50'} transition-all attendance-status">
                        <i class="fas fa-times-circle mr-1"></i> Absent
                    </button>
                    <button onclick="updateAttendance(${student.id}, ${student.attendanceId ? student.attendanceId : 'null'}, 'late')"
                            class="px-4 py-2 rounded-lg ${status === 'late' ? 'bg-yellow-100 text-yellow-700 border-2 border-yellow-300' : 'bg-gray-100 text-gray-700 hover:bg-yellow-50'} transition-all attendance-status">
                        <i class="fas fa-clock mr-1"></i> Late
                    </button>
                    <button onclick="updateAttendance(${student.id}, ${student.attendanceId ? student.attendanceId : 'null'}, 'halfday')"
                            class="px-4 py-2 rounded-lg ${status === 'halfday' ? 'bg-blue-100 text-blue-700 border-2 border-blue-300' : 'bg-gray-100 text-gray-700 hover:bg-blue-50'} transition-all attendance-status">
                        <i class="fas fa-business-time mr-1"></i> Half Day
                    </button>
                </div>
            </td>
            <td class="px-6 py-4 whitespace-nowrap">
                <span class="text-sm ${status === 'present' || status === 'late' ? 'text-gray-900' : 'text-gray-400'}">
                    ${student.todayTime || '--:--'}
                </span>
            </td>
            <td class="px-6 py-4">
                <div class="text-sm text-gray-900 max-w-xs truncate">
                    ${student.todayNotes || 'No notes'}
                </div>
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
                <button onclick="viewStudentDetails(${student.id})" class="text-blue-600 hover:text-blue-900 mr-3">
                    <i class="fas fa-eye"></i>
                </button>
                <button onclick="addAttendanceNote(${student.id}, ${student.attendanceId ? student.attendanceId : 'null'})" class="text-gray-600 hover:text-gray-900">
                    <i class="fas fa-edit"></i>
                </button>
            </td>
        `;
        tableBody.appendChild(row);
    });

    if (prevBtn) prevBtn.disabled = currentPage === 1;
    if (nextBtn) nextBtn.disabled = currentPage === totalPages;

    if (tableInfo) {
        tableInfo.textContent = `Showing ${startIndex + 1}-${endIndex} of ${filteredData.length} students`;
    }
}

// ─────────────────────────────────────────────────────────
//  Apply Filters
// ─────────────────────────────────────────────────────────
function applyFilters() {
    const sectionFilter = document.getElementById('sectionFilter');
    if (sectionFilter) {
        selectedSection = sectionFilter.value;
    }
    
    currentPage = 1;
    loadAttendanceData();
}

// ─────────────────────────────────────────────────────────
//  Update / Mark Attendance
// ─────────────────────────────────────────────────────────
async function updateAttendance(studentId, attendanceId, status) {
    showLoading();

    try {
        const time = (status === 'present' || status === 'late') ?
            new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' }) : null;

        if (attendanceId && attendanceId !== null && attendanceId !== 'null') {
            // Update existing attendance record
            const requestDto = {
                studentId: studentId,
                date: selectedDate,
                status: status.toUpperCase(),
                time: time,
                notes: getDefaultNote(status)
            };
            await apiUpdateAttendance(attendanceId, requestDto);
        } else {
            // Mark new attendance
            const { className, section } = parseClassSection(selectedClass);
            const requestDto = {
                studentId: studentId,
                date: selectedDate,
                status: status.toUpperCase(),
                time: time,
                notes: getDefaultNote(status),
                ...(className ? { className } : {}),
                ...(section ? { section } : {})
            };
            await apiMarkAttendance(requestDto);
        }

        const student = allStudentsForDate.find(s => s.id === studentId);
        const studentName = student ? student.name.split(' ')[0] : 'Student';
        showToast(`${studentName}'s attendance marked as ${status}`, 'success');

        await loadAttendanceData();

    } catch (error) {
        console.error('Error updating attendance:', error);
        showToast('Error updating attendance: ' + error.message, 'error');
        hideLoading();
    }
}

function getDefaultNote(status) {
    switch(status) {
        case 'present': return 'Present in class';
        case 'absent': return 'Absent from school';
        case 'late': return 'Arrived late';
        case 'halfday': return 'Left early';
        default: return '';
    }
}

// ─────────────────────────────────────────────────────────
//  View Student Details
// ─────────────────────────────────────────────────────────
async function viewStudentDetails(studentId) {
    showLoading();

    try {
        const endDate = new Date().toISOString().split('T')[0];
        const startDateObj = new Date();
        startDateObj.setDate(startDateObj.getDate() - 30);
        const startDate = startDateObj.toISOString().split('T')[0];

        const attendanceRecords = await apiGetStudentAttendance(studentId, startDate, endDate);
        const percentageData = await apiGetAttendancePercentage(studentId, startDate, endDate);

        const studentInfo = allStudentsForDate.find(s => s.id === studentId);
        const studentName = studentInfo ? studentInfo.name : `Student #${studentId}`;
        const studentClass = studentInfo ? studentInfo.class : '-';
        const studentRollNo = studentInfo ? studentInfo.rollNo : '-';

        const totalDays = attendanceRecords.length;
        const presentDays = attendanceRecords.filter(a => (a.status || '').toLowerCase() === 'present').length;
        const attendancePercentage = percentageData.percentage !== undefined
            ? percentageData.percentage
            : (totalDays > 0 ? Math.round((presentDays / totalDays) * 100) : 0);

        const recentAttendance = [...attendanceRecords]
            .sort((a, b) => new Date(b.date) - new Date(a.date))
            .slice(0, 5);

        const modalContent = document.getElementById('studentDetailsContent');
        if (!modalContent) return;

        modalContent.innerHTML = `
            <div class="mb-6">
                <div class="flex items-center space-x-4 mb-4">
                    <div class="h-16 w-16 bg-blue-100 rounded-full flex items-center justify-center">
                        <i class="fas fa-user-graduate text-blue-600 text-2xl"></i>
                    </div>
                    <div>
                        <h4 class="text-xl font-bold text-gray-800">${studentName}</h4>
                        <p class="text-gray-600">${studentClass} | Roll No: ${studentRollNo}</p>
                    </div>
                </div>

                <div class="grid grid-cols-2 gap-4 mb-6">
                    <div class="bg-gray-50 p-4 rounded-lg">
                        <p class="text-sm text-gray-600">Total Attendance Days</p>
                        <p class="text-2xl font-bold text-gray-800">${totalDays}</p>
                    </div>
                    <div class="bg-gray-50 p-4 rounded-lg">
                        <p class="text-sm text-gray-600">Attendance Percentage</p>
                        <p class="text-2xl font-bold ${attendancePercentage >= 75 ? 'text-green-600' : 'text-red-600'}">
                            ${attendancePercentage}%
                        </p>
                    </div>
                </div>
            </div>

            <div>
                <h5 class="font-semibold text-gray-700 mb-3">Recent Attendance History</h5>
                <div class="space-y-3">
                    ${recentAttendance.map(att => `
                        <div class="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                            <div>
                                <p class="font-medium text-gray-800">${formatDate(att.date)}</p>
                                <p class="text-sm text-gray-600">${att.time || '--:--'}</p>
                            </div>
                            <span class="${getStatusClass((att.status || '').toLowerCase())} attendance-badge">
                                ${getStatusIcon((att.status || '').toLowerCase())}
                                ${att.status ? att.status.charAt(0).toUpperCase() + att.status.slice(1).toLowerCase() : 'Unknown'}
                            </span>
                        </div>
                    `).join('')}
                </div>
            </div>

            <div class="mt-6 pt-6 border-t border-gray-200">
                <button onclick="exportStudentReport(${studentId})" class="w-full px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all font-medium">
                    <i class="fas fa-file-pdf mr-2"></i> Export Attendance Report
                </button>
            </div>
        `;

        const modal = document.getElementById('studentDetailsModal');
        if (modal) modal.classList.add('active');

    } catch (error) {
        console.error('Error loading student details:', error);
        showToast('Error loading student details: ' + error.message, 'error');
    } finally {
        hideLoading();
    }
}

// ─────────────────────────────────────────────────────────
//  Add Attendance Note
// ─────────────────────────────────────────────────────────
async function addAttendanceNote(studentId, attendanceId) {
    const note = prompt('Add a note for this attendance entry:');
    if (note === null) return;

    if (!attendanceId || attendanceId === null || attendanceId === 'null') {
        showToast('Please mark attendance first before adding a note', 'error');
        return;
    }

    showLoading();

    try {
        const student = allStudentsForDate.find(s => s.id === studentId);
        const requestDto = {
            studentId: studentId,
            date: selectedDate,
            status: student && student.todayStatus ? student.todayStatus.toUpperCase() : 'PRESENT',
            notes: note,
            time: student ? student.todayTime : null
        };

        await apiUpdateAttendance(attendanceId, requestDto);
        showToast('Note added successfully', 'success');
        await loadAttendanceData();

    } catch (error) {
        console.error('Error adding note:', error);
        showToast('Error adding note: ' + error.message, 'error');
        hideLoading();
    }
}

// ─────────────────────────────────────────────────────────
//  Calendar Functions
// ─────────────────────────────────────────────────────────
function generateCalendar() {
    const calendarElement = document.getElementById('attendanceCalendar');
    const monthYearElement = document.getElementById('currentMonth');

    if (!calendarElement || !monthYearElement) return;

    monthYearElement.textContent = `${monthNames[currentMonth]} ${currentYear}`;

    const firstDay = new Date(currentYear, currentMonth, 1);
    const lastDay = new Date(currentYear, currentMonth + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDay = firstDay.getDay();

    let calendarHTML = `
        <div class="grid grid-cols-7 gap-2 mb-4">
            <div class="text-center font-medium text-gray-500 p-2">Sun</div>
            <div class="text-center font-medium text-gray-500 p-2">Mon</div>
            <div class="text-center font-medium text-gray-500 p-2">Tue</div>
            <div class="text-center font-medium text-gray-500 p-2">Wed</div>
            <div class="text-center font-medium text-gray-500 p-2">Thu</div>
            <div class="text-center font-medium text-gray-500 p-2">Fri</div>
            <div class="text-center font-medium text-gray-500 p-2">Sat</div>
        </div>
        <div class="grid grid-cols-7 gap-2">
    `;

    for (let i = 0; i < startingDay; i++) {
        calendarHTML += `<div class="h-10"></div>`;
    }

    for (let day = 1; day <= daysInMonth; day++) {
        const dateStr = `${currentYear}-${(currentMonth + 1).toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
        const isSelected = dateStr === selectedDate;
        const isToday = dateStr === new Date().toISOString().split('T')[0];
        const hasAttendance = dateStr === selectedDate && allStudentsForDate.length > 0;

        calendarHTML += `
            <div onclick="selectCalendarDate('${dateStr}')"
                 class="h-10 flex items-center justify-center rounded-lg calendar-day cursor-pointer
                        ${isSelected ? 'selected bg-blue-100' : ''}
                        ${isToday ? 'border-2 border-blue-500' : ''}
                        ${hasAttendance ? 'has-attendance' : ''}">
                ${day}
            </div>
        `;
    }

    calendarHTML += '</div>';
    calendarElement.innerHTML = calendarHTML;
}

function selectCalendarDate(dateStr) {
    selectedDate = dateStr;
    const attendanceDate = document.getElementById('attendanceDate');
    if (attendanceDate) attendanceDate.value = dateStr;
    loadAttendanceData();
}

function previousMonth() {
    currentMonth--;
    if (currentMonth < 0) {
        currentMonth = 11;
        currentYear--;
    }
    generateCalendar();
}

function nextMonth() {
    currentMonth++;
    if (currentMonth > 11) {
        currentMonth = 0;
        currentYear++;
    }
    generateCalendar();
}

// ─────────────────────────────────────────────────────────
//  Pagination Functions
// ─────────────────────────────────────────────────────────
function previousPage() {
    if (currentPage > 1) {
        currentPage--;
        renderAttendanceTable();
    }
}

function nextPage() {
    const totalPages = Math.ceil(filteredData.length / itemsPerPage);
    if (currentPage < totalPages) {
        currentPage++;
        renderAttendanceTable();
    }
}

// ─────────────────────────────────────────────────────────
//  Bulk Update Modal Functions
// ─────────────────────────────────────────────────────────
function openBulkUpdateModal() {
    bulkSelectedStudents.clear();
    bulkStatus = 'present';
    bulkStudentListData = [...filteredData];
    updateBulkModalUI();

    const modal = document.getElementById('bulkUpdateModal');
    if (modal) modal.classList.add('active');
}

function closeBulkUpdateModal() {
    const modal = document.getElementById('bulkUpdateModal');
    if (modal) modal.classList.remove('active');
}

function updateBulkModalUI() {
    const totalStudents = bulkStudentListData.length;
    const bulkStudentCount = document.getElementById('bulkStudentCount');
    if (bulkStudentCount) bulkStudentCount.textContent = `${totalStudents} students`;

    const bulkStatusDisplay = document.getElementById('bulkStatusDisplay');
    if (bulkStatusDisplay) {
        bulkStatusDisplay.textContent = bulkStatus.charAt(0).toUpperCase() + bulkStatus.slice(1);
    }

    updateSelectedCount();

    document.querySelectorAll('.bulk-status-btn').forEach(btn => {
        btn.classList.remove('ring-2', 'ring-blue-500', 'ring-offset-2');
    });

    const selectedBtn = document.getElementById(`bulkBtn${bulkStatus.charAt(0).toUpperCase() + bulkStatus.slice(1)}`);
    if (selectedBtn) {
        selectedBtn.classList.add('ring-2', 'ring-blue-500', 'ring-offset-2');
    }

    renderBulkStudentList();
}

function renderBulkStudentList() {
    const studentListContainer = document.getElementById('bulkStudentList');
    if (!studentListContainer) return;

    if (bulkStudentListData.length === 0) {
        studentListContainer.innerHTML = `
            <div class="text-center py-8 text-gray-500">
                <i class="fas fa-user-slash text-3xl mb-3"></i>
                <p>No students found</p>
                <p class="text-sm mt-1">Apply different filters to see students</p>
            </div>
        `;
        return;
    }

    let studentListHTML = '';

    bulkStudentListData.forEach(student => {
        const isSelected = bulkSelectedStudents.has(student.id);
        const currentStatus = student.todayStatus || 'none';
        const statusClass = getStatusIndicatorClass(currentStatus);
        const statusText = currentStatus === 'none' ? 'Not marked' : currentStatus.charAt(0).toUpperCase() + currentStatus.slice(1);

        studentListHTML += `
            <div class="student-list-item ${isSelected ? 'selected' : ''}" onclick="toggleStudentSelection(${student.id}, event)">
                <div class="flex items-center">
                    <input type="checkbox"
                           class="student-checkbox h-4 w-4 mr-3"
                           ${isSelected ? 'checked' : ''}
                           onclick="event.stopPropagation(); toggleStudentSelection(${student.id})">
                    <div class="flex-1">
                        <div class="font-medium text-gray-800">${student.name}</div>
                        <div class="text-sm text-gray-600 flex items-center mt-1">
                            <span class="px-2 py-0.5 bg-gray-100 rounded text-xs mr-3">${student.class}</span>
                            <span class="mr-3">Roll No: ${student.rollNo}</span>
                            <span class="flex items-center">
                                <span class="status-indicator ${statusClass}"></span>
                                <span>${statusText}</span>
                            </span>
                        </div>
                    </div>
                </div>
            </div>
        `;
    });

    studentListContainer.innerHTML = studentListHTML;
}

function getStatusIndicatorClass(status) {
    switch(status) {
        case 'present': return 'present';
        case 'absent': return 'absent';
        case 'late': return 'late';
        case 'halfday': return 'halfday';
        default: return 'none';
    }
}

function selectBulkStatus(status) {
    bulkStatus = status;
    updateBulkModalUI();
}

function toggleStudentSelection(studentId, event = null) {
    if (event) {
        event.stopPropagation();
    }

    if (bulkSelectedStudents.has(studentId)) {
        bulkSelectedStudents.delete(studentId);
    } else {
        bulkSelectedStudents.add(studentId);
    }

    updateSelectedCount();
    updateSelectAllCheckbox();
}

function updateSelectedCount() {
    const selectedCount = bulkSelectedStudents.size;
    const totalStudents = bulkStudentListData.length;

    const bulkSelectedCountEl = document.getElementById('bulkSelectedCount');
    const bulkUpdateCountEl = document.getElementById('bulkUpdateCount');
    const applyCountBadge = document.getElementById('applyCountBadge');
    const applyBtn = document.getElementById('applyBulkBtn');

    if (bulkSelectedCountEl) {
        bulkSelectedCountEl.textContent = `${selectedCount} of ${totalStudents} students selected`;
    }
    if (bulkUpdateCountEl) {
        bulkUpdateCountEl.textContent = selectedCount;
    }
    if (applyCountBadge) {
        applyCountBadge.textContent = selectedCount;
    }

    if (applyBtn) {
        if (selectedCount === 0) {
            applyBtn.disabled = true;
            applyBtn.classList.add('opacity-50', 'cursor-not-allowed');
        } else {
            applyBtn.disabled = false;
            applyBtn.classList.remove('opacity-50', 'cursor-not-allowed');
        }
    }
}

function selectAllStudents() {
    bulkStudentListData.forEach(student => {
        bulkSelectedStudents.add(student.id);
    });
    updateSelectedCount();
    renderBulkStudentList();
}

function deselectAllStudents() {
    bulkSelectedStudents.clear();
    updateSelectedCount();
    renderBulkStudentList();
}

function toggleSelectAll(checked) {
    if (checked) {
        selectAllStudents();
    } else {
        deselectAllStudents();
    }
}

function updateSelectAllCheckbox() {
    const selectAllCheckbox = document.getElementById('selectAllCheckbox');
    if (!selectAllCheckbox) return;

    const totalStudents = bulkStudentListData.length;

    if (bulkSelectedStudents.size === 0) {
        selectAllCheckbox.checked = false;
        selectAllCheckbox.indeterminate = false;
    } else if (bulkSelectedStudents.size === totalStudents) {
        selectAllCheckbox.checked = true;
        selectAllCheckbox.indeterminate = false;
    } else {
        selectAllCheckbox.checked = false;
        selectAllCheckbox.indeterminate = true;
    }
}

async function applyBulkUpdate() {
    const selectedCount = bulkSelectedStudents.size;
    if (selectedCount === 0) {
        showToast('Please select at least one student', 'error');
        return;
    }

    const notes = document.getElementById('bulkNotes').value;
    const confirmMessage = `Are you sure you want to update attendance for ${selectedCount} student(s) to ${bulkStatus}?`;

    if (!confirm(confirmMessage)) {
        return;
    }

    showLoading();

    try {
        const time = (bulkStatus === 'present' || bulkStatus === 'late') ?
            new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' }) : null;

        const studentIds = Array.from(bulkSelectedStudents);

        const bulkRequestDto = {
            date: selectedDate,
            status: bulkStatus.toUpperCase(),
            time: time,
            notes: notes || getDefaultNote(bulkStatus),
            studentIds: studentIds
        };

        await apiMarkBulkAttendance(bulkRequestDto);

        closeBulkUpdateModal();
        showToast(`Attendance updated to ${bulkStatus} for ${selectedCount} student(s)`, 'success');
        await loadAttendanceData();
        bulkSelectedStudents.clear();

    } catch (error) {
        console.error('Error applying bulk update:', error);
        showToast('Error applying bulk update: ' + error.message, 'error');
    } finally {
        hideLoading();
    }
}

// ─────────────────────────────────────────────────────────
//  Summary Modal Functions
// ─────────────────────────────────────────────────────────
function openSummaryModal() {
    const currentDate = new Date();
    summaryMonth = currentDate.getMonth();
    summaryYear = currentDate.getFullYear();

    const summaryMonthEl = document.getElementById('summaryMonth');
    const summaryYearEl = document.getElementById('summaryYear');

    if (summaryMonthEl) summaryMonthEl.value = summaryMonth;
    if (summaryYearEl) summaryYearEl.value = summaryYear;

    const modal = document.getElementById('summaryModal');
    if (modal) modal.classList.add('active');

    generateSummary();
}

function closeSummaryModal() {
    const modal = document.getElementById('summaryModal');
    if (modal) modal.classList.remove('active');
}

function closeStudentDetailsModal() {
    const modal = document.getElementById('studentDetailsModal');
    if (modal) modal.classList.remove('active');
}

async function generateSummary() {
    showLoading();

    try {
        const summaryPeriod = document.getElementById('summaryPeriod');
        if (summaryPeriod) {
            summaryPeriod.textContent = `${monthNames[summaryMonth]} ${summaryYear}`;
        }

        if (summaryClass === 'all') {
            showToast('Please select a specific class to generate summary', 'error');
            hideLoading();
            return;
        }

        const { className, section } = parseClassSection(summaryClass);
        if (!className || !section) {
            showToast('Invalid class selection', 'error');
            hideLoading();
            return;
        }

        const backendMonth = summaryMonth + 1;
        const summaryResponse = await apiGetMonthlySummary(className, section, summaryYear, backendMonth);

        summaryData = (summaryResponse.studentSummaries || []).map(student => {
            const days = (student.days || []).map(day => {
                const status = (day.status || '').toLowerCase();
                return {
                    date: day.date,
                    status: status,
                    code: getStatusCode(status),
                    time: day.time || null,
                    notes: day.notes || null
                };
            });

            return {
                id: student.studentId,
                name: student.studentName,
                class: `${className}${section}`,
                rollNo: student.rollNo,
                days: days,
                totals: {
                    present: student.totals ? student.totals.present : 0,
                    absent: student.totals ? student.totals.absent : 0,
                    late: student.totals ? student.totals.late : 0,
                    halfday: student.totals ? student.totals.halfday : 0,
                    holiday: student.totals ? student.totals.holiday : 0,
                    weekend: student.totals ? student.totals.weekend : 0
                },
                percentage: student.percentage || 0
            };
        });

        updateSummaryStats();
        renderSummaryTable();

    } catch (error) {
        console.error('Error generating summary:', error);
        showToast('Error generating summary: ' + error.message, 'error');
    } finally {
        hideLoading();
    }
}

function getStatusCode(status) {
    switch(status) {
        case 'present': return 'P';
        case 'absent': return 'A';
        case 'late': return 'L';
        case 'halfday': return 'H';
        case 'holiday': return 'HD';
        case 'weekend': return 'WE';
        default: return '';
    }
}

function updateSummaryStats() {
    const statsContainer = document.getElementById('summaryStats');
    if (!statsContainer) return;

    const totalStudents = summaryData.length;
    const overallPresent = summaryData.reduce((sum, student) => sum + student.totals.present, 0);
    const overallAbsent = summaryData.reduce((sum, student) => sum + student.totals.absent, 0);
    const overallLate = summaryData.reduce((sum, student) => sum + student.totals.late, 0);
    const overallHalfday = summaryData.reduce((sum, student) => sum + student.totals.halfday, 0);

    const avgAttendance = totalStudents > 0 ?
        Math.round(summaryData.reduce((sum, student) => sum + student.percentage, 0) / totalStudents) : 0;

    statsContainer.innerHTML = `
        <div class="summary-stats-card">
            <div class="flex items-center justify-between">
                <div>
                    <p class="text-sm font-medium text-gray-600">Total Students</p>
                    <p class="text-3xl font-bold text-gray-800 mt-2">${totalStudents}</p>
                </div>
                <div class="h-12 w-12 bg-blue-100 rounded-full flex items-center justify-center">
                    <i class="fas fa-users text-blue-600 text-xl"></i>
                </div>
            </div>
        </div>

        <div class="summary-stats-card">
            <div class="flex items-center justify-between">
                <div>
                    <p class="text-sm font-medium text-gray-600">Average Attendance</p>
                    <p class="text-3xl font-bold ${avgAttendance >= 75 ? 'text-green-600' : 'text-red-600'} mt-2">${avgAttendance}%</p>
                </div>
                <div class="h-12 w-12 bg-green-100 rounded-full flex items-center justify-center">
                    <i class="fas fa-chart-line text-green-600 text-xl"></i>
                </div>
            </div>
        </div>

        <div class="summary-stats-card">
            <div class="flex items-center justify-between">
                <div>
                    <p class="text-sm font-medium text-gray-600">Total Present Days</p>
                    <p class="text-3xl font-bold text-gray-800 mt-2">${overallPresent}</p>
                </div>
                <div class="h-12 w-12 bg-green-100 rounded-full flex items-center justify-center">
                    <i class="fas fa-check-circle text-green-600 text-xl"></i>
                </div>
            </div>
        </div>

        <div class="summary-stats-card">
            <div class="flex items-center justify-between">
                <div>
                    <p class="text-sm font-medium text-gray-600">Total Absent Days</p>
                    <p class="text-3xl font-bold text-gray-800 mt-2">${overallAbsent}</p>
                </div>
                <div class="h-12 w-12 bg-red-100 rounded-full flex items-center justify-center">
                    <i class="fas fa-times-circle text-red-600 text-xl"></i>
                </div>
            </div>
        </div>
    `;
}

function renderSummaryTable() {
    const tableBody = document.getElementById('summaryTableBody');
    const summaryInfo = document.getElementById('summaryInfo');

    if (!tableBody) return;

    if (summaryData.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="32" class="px-6 py-12 text-center text-gray-500">
                    <i class="fas fa-user-slash text-4xl mb-4"></i>
                    <p class="text-lg font-medium">No students found</p>
                    <p class="text-sm mt-2">Try adjusting your filters</p>
                </td>
            </tr>
        `;
        if (summaryInfo) summaryInfo.textContent = `Showing 0 students`;
        return;
    }

    tableBody.innerHTML = '';

    summaryData.forEach((student, index) => {
        const row = document.createElement('tr');

        let rowHTML = `
            <td class="py-4 px-4 border-r border-gray-200 sticky left-0 bg-white z-10 min-w-[200px]">
                <div class="flex items-center">
                    <div class="h-10 w-10 bg-blue-100 rounded-full flex items-center justify-center mr-3">
                        <i class="fas fa-user text-blue-600"></i>
                    </div>
                    <div>
                        <div class="font-medium text-gray-900">${student.name}</div>
                        <div class="text-sm text-gray-600">${student.class} | Roll No: ${student.rollNo}</div>
                        <div class="text-xs mt-1 ${student.percentage >= 75 ? 'text-green-600' : 'text-red-600'}">
                            <i class="fas fa-chart-line mr-1"></i> ${student.percentage}% Attendance
                        </div>
                    </div>
                </div>
            </td>
        `;

        student.days.forEach((day, dayIndex) => {
            let cellClass = 'attendance-cell';
            let cellTitle = `${formatDate(day.date)}`;

            switch(day.status) {
                case 'present':
                    cellClass += ' cell-present';
                    cellTitle += '\nPresent';
                    break;
                case 'absent':
                    cellClass += ' cell-absent';
                    cellTitle += '\nAbsent';
                    break;
                case 'late':
                    cellClass += ' cell-late';
                    cellTitle += '\nLate';
                    break;
                case 'halfday':
                    cellClass += ' cell-halfday';
                    cellTitle += '\nHalf Day';
                    break;
                case 'holiday':
                    cellClass += ' cell-holiday';
                    cellTitle += '\nHoliday';
                    break;
                case 'weekend':
                    cellClass += ' cell-weekend';
                    cellTitle += '\nWeekend';
                    break;
            }

            if (day.time) {
                cellTitle += `\nTime: ${day.time}`;
            }
            if (day.notes) {
                cellTitle += `\nNotes: ${day.notes}`;
            }

            rowHTML += `
                <td class="py-2 px-1 border-r border-gray-100">
                    <div class="${cellClass}" title="${cellTitle}" onclick="showDayDetails(${student.id}, '${day.date}')">
                        ${day.code || ''}
                    </div>
                </td>
            `;
        });

        rowHTML += `
            <td class="py-2 px-3 border-l border-gray-200 bg-gray-50 font-medium">
                <div class="text-center">
                    <div class="text-sm text-gray-600">Total</div>
                    <div class="text-lg ${student.percentage >= 75 ? 'text-green-600' : 'text-red-600'}">
                        ${student.percentage}%
                    </div>
                    <div class="text-xs text-gray-500">
                        P:${student.totals.present} A:${student.totals.absent}
                    </div>
                </div>
            </td>
        `;

        row.innerHTML = rowHTML;
        tableBody.appendChild(row);
    });

    if (summaryInfo) {
        summaryInfo.textContent = `Showing ${summaryData.length} students`;
    }
}

function showDayDetails(studentId, date) {
    const student = summaryData.find(s => s.id === studentId);
    if (!student) return;

    const day = student.days.find(d => d.date === date);

    let message = `Date: ${formatDate(date)}\n`;
    message += `Student: ${student.name}\n`;
    message += `Class: ${student.class}\n`;
    message += `Roll No: ${student.rollNo}\n\n`;

    if (day) {
        message += `Status: ${day.status.toUpperCase()}\n`;
        message += `Time: ${day.time || '--:--'}\n`;
        message += `Notes: ${day.notes || 'No notes'}`;
    } else {
        message += 'No attendance record found';
    }

    alert(message);
}

// ─────────────────────────────────────────────────────────
//  Excel Export Function
// ─────────────────────────────────────────────────────────
function downloadSummaryExcel() {
    showLoading();

    try {
        const wb = XLSX.utils.book_new();
        const wsData = [];
        const headers = ['Student ID', 'Student Name', 'Class', 'Roll No'];

        const daysInMonth = summaryData.length > 0 ? summaryData[0].days.length : 0;
        for (let i = 0; i < daysInMonth; i++) {
            if (summaryData.length > 0 && summaryData[0].days[i]) {
                const day = summaryData[0].days[i];
                const date = new Date(day.date);
                const dateStr = `${date.getDate()} ${date.toLocaleDateString('en-US', { weekday: 'short' })}`;
                headers.push(dateStr);
            } else {
                headers.push(`Day ${i + 1}`);
            }
        }

        headers.push('Total Present', 'Total Absent', 'Total Late', 'Total Half Day', 'Attendance %', 'Remarks');
        wsData.push(headers);

        summaryData.forEach(student => {
            const row = [
                student.id,
                student.name,
                student.class,
                student.rollNo
            ];

            student.days.forEach(day => {
                row.push(day.code || '');
            });

            row.push(
                student.totals.present,
                student.totals.absent,
                student.totals.late,
                student.totals.halfday,
                `${student.percentage}%`,
                student.percentage >= 75 ? 'Good' :
                student.percentage >= 60 ? 'Average' : 'Poor'
            );

            wsData.push(row);
        });

        const ws = XLSX.utils.aoa_to_sheet(wsData);

        const colWidths = [
            { wch: 10 }, { wch: 25 }, { wch: 10 }, { wch: 10 }
        ];

        for (let i = 0; i < daysInMonth; i++) {
            colWidths.push({ wch: 8 });
        }

        colWidths.push({ wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 20 });
        ws['!cols'] = colWidths;

        XLSX.utils.book_append_sheet(wb, ws, 'Attendance Summary');

        const totalStudents = summaryData.length;
        const avgAttendance = totalStudents > 0 ?
            Math.round(summaryData.reduce((sum, student) => sum + student.percentage, 0) / totalStudents) : 0;

        const summaryStats = [
            ['Monthly Attendance Summary Report'],
            [''],
            ['Month:', monthNames[summaryMonth]],
            ['Year:', summaryYear],
            ['Class:', summaryClass === 'all' ? 'All Classes' : summaryClass],
            ['Total Students:', totalStudents],
            [''],
            ['Overall Statistics'],
            ['Total Present Days:', summaryData.reduce((sum, student) => sum + student.totals.present, 0)],
            ['Total Absent Days:', summaryData.reduce((sum, student) => sum + student.totals.absent, 0)],
            ['Total Late Arrivals:', summaryData.reduce((sum, student) => sum + student.totals.late, 0)],
            ['Total Half Days:', summaryData.reduce((sum, student) => sum + student.totals.halfday, 0)],
            ['Average Attendance %:', avgAttendance],
            [''],
            ['Generated on:', new Date().toLocaleString()]
        ];

        const ws2 = XLSX.utils.aoa_to_sheet(summaryStats);
        XLSX.utils.book_append_sheet(wb, ws2, 'Summary Statistics');

        const filename = `attendance_summary_${monthNames[summaryMonth]}_${summaryYear}_${summaryClass === 'all' ? 'all_classes' : summaryClass}.xlsx`;
        XLSX.writeFile(wb, filename);

        showToast('Excel report downloaded successfully', 'success');
    } catch (error) {
        console.error('Error generating Excel:', error);
        showToast('Error generating Excel report', 'error');
    }

    hideLoading();
}

// ─────────────────────────────────────────────────────────
//  Utility Functions
// ─────────────────────────────────────────────────────────
function showLoading() {
    const overlay = document.getElementById('loadingOverlay');
    if (overlay) overlay.classList.remove('hidden');
}

function hideLoading() {
    const overlay = document.getElementById('loadingOverlay');
    if (overlay) overlay.classList.add('hidden');
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
        weekday: 'short',
        month: 'short',
        day: 'numeric'
    });
}

function getStatusClass(status) {
    switch(status) {
        case 'present': return 'badge-present';
        case 'absent': return 'badge-absent';
        case 'late': return 'badge-late';
        case 'halfday': return 'badge-halfday';
        default: return 'badge-present';
    }
}

function getStatusIcon(status) {
    switch(status) {
        case 'present': return '<i class="fas fa-check-circle mr-1"></i>';
        case 'absent': return '<i class="fas fa-times-circle mr-1"></i>';
        case 'late': return '<i class="fas fa-clock mr-1"></i>';
        case 'halfday': return '<i class="fas fa-business-time mr-1"></i>';
        default: return '<i class="fas fa-question-circle mr-1"></i>';
    }
}

function generateAttendanceReport() {
    showLoading();

    setTimeout(() => {
        hideLoading();

        const reportData = {
            date: selectedDate,
            class: selectedClass === 'all' ? 'All Classes' : selectedClass,
            totalStudents: filteredData.length,
            presentCount: filteredData.filter(s => s.todayStatus === 'present').length,
            absentCount: filteredData.filter(s => s.todayStatus === 'absent').length,
            lateCount: filteredData.filter(s => s.todayStatus === 'late').length,
            halfdayCount: filteredData.filter(s => s.todayStatus === 'halfday').length,
            students: filteredData.map(student => ({
                name: student.name,
                class: student.class,
                rollNo: student.rollNo,
                status: student.todayStatus || 'Not marked',
                time: student.todayTime || '--:--'
            }))
        };

        const jsonData = JSON.stringify(reportData, null, 2);
        const blob = new Blob([jsonData], { type: 'application/json' });
        const url = URL.createObjectURL(blob);

        const a = document.createElement('a');
        a.href = url;
        a.download = `attendance-report-${selectedDate}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        showToast('Report downloaded successfully', 'success');
    }, 1500);
}

async function exportStudentReport(studentId) {
    showLoading();

    try {
        const endDate = new Date().toISOString().split('T')[0];
        const startDateObj = new Date();
        startDateObj.setDate(startDateObj.getDate() - 30);
        const startDate = startDateObj.toISOString().split('T')[0];

        const attendanceRecords = await apiGetStudentAttendance(studentId, startDate, endDate);
        const percentageData = await apiGetAttendancePercentage(studentId, startDate, endDate);

        const studentInfo = allStudentsForDate.find(s => s.id === studentId);

        const reportData = {
            student: {
                id: studentId,
                name: studentInfo ? studentInfo.name : `Student #${studentId}`,
                class: studentInfo ? studentInfo.class : '-',
                rollNo: studentInfo ? studentInfo.rollNo : '-'
            },
            attendanceSummary: {
                totalDays: attendanceRecords.length,
                presentDays: attendanceRecords.filter(a => (a.status || '').toLowerCase() === 'present').length,
                absentDays: attendanceRecords.filter(a => (a.status || '').toLowerCase() === 'absent').length,
                attendancePercentage: percentageData.percentage || 0
            },
            attendanceRecords: attendanceRecords
                .sort((a, b) => new Date(b.date) - new Date(a.date))
                .slice(0, 30)
        };

        const jsonData = JSON.stringify(reportData, null, 2);
        const blob = new Blob([jsonData], { type: 'application/json' });
        const url = URL.createObjectURL(blob);

        const a = document.createElement('a');
        a.href = url;
        const fileName = studentInfo
            ? `attendance-report-${studentInfo.name.replace(/\s+/g, '-')}.json`
            : `attendance-report-student-${studentId}.json`;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        showToast('Student report downloaded', 'success');

    } catch (error) {
        console.error('Error exporting student report:', error);
        showToast('Error exporting student report: ' + error.message, 'error');
    } finally {
        hideLoading();
    }
}

// Make functions global for onclick handlers
window.updateAttendance = updateAttendance;
window.viewStudentDetails = viewStudentDetails;
window.addAttendanceNote = addAttendanceNote;
window.selectCalendarDate = selectCalendarDate;
window.previousMonth = previousMonth;
window.nextMonth = nextMonth;
window.applyFilters = applyFilters;
window.previousPage = previousPage;
window.nextPage = nextPage;
window.openBulkUpdateModal = openBulkUpdateModal;
window.closeBulkUpdateModal = closeBulkUpdateModal;
window.selectBulkStatus = selectBulkStatus;
window.toggleStudentSelection = toggleStudentSelection;
window.selectAllStudents = selectAllStudents;
window.deselectAllStudents = deselectAllStudents;
window.toggleSelectAll = toggleSelectAll;
window.applyBulkUpdate = applyBulkUpdate;
window.closeStudentDetailsModal = closeStudentDetailsModal;
window.openSummaryModal = openSummaryModal;
window.closeSummaryModal = closeSummaryModal;
window.generateSummary = generateSummary;
window.downloadSummaryExcel = downloadSummaryExcel;
window.showDayDetails = showDayDetails;
window.generateAttendanceReport = generateAttendanceReport;
window.exportStudentReport = exportStudentReport;