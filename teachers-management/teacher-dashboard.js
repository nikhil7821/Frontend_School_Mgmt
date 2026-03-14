// ============================================================
// TEACHER DASHBOARD - COMPLETE BACKEND INTEGRATION
// ============================================================

// Application State
const APP_STATE = {
    currentTab: 'overview',
    teacherProfile: null,
    classes: [],
    attendance: [],
    attendanceStats: null,
    marks: [],
    timetable: {},
    students: [],
    notifications: [],
    unreadNotifications: 0,
    isLoading: false,
    currentMonth: new Date(),
    performanceChart: null,
    attendanceChart: null,
    marksChart: null,
    apiBaseUrl: 'http://localhost:8084/api'
};

// ============================================================
// AUTHENTICATION & HEADERS
// ============================================================

function getAuthHeaders() {
    const token = localStorage.getItem('jwt_token');
    const headers = {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
    };
    
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }
    
    return headers;
}

function getTeacherId() {
    return localStorage.getItem('user_id');
}

function getTeacherCode() {
    return localStorage.getItem('teacher_code');
}

function getEmployeeId() {
    return localStorage.getItem('employee_id');
}

function getTeacherName() {
    return localStorage.getItem('user_name');
}

function getTeacherDesignation() {
    return localStorage.getItem('designation');
}

function getTeacherDepartment() {
    return localStorage.getItem('department');
}

// ============================================================
// TOAST NOTIFICATION SYSTEM
// ============================================================

class Toast {
    static show(message, type = 'success', duration = 3000) {
        const toast = document.createElement('div');
        const id = 'toast-' + Date.now();
        
        const icons = {
            success: 'fa-check-circle',
            error: 'fa-exclamation-circle',
            warning: 'fa-exclamation-triangle',
            info: 'fa-info-circle'
        };
        
        const colors = {
            success: 'bg-green-500',
            error: 'bg-red-500',
            warning: 'bg-yellow-500',
            info: 'bg-blue-500'
        };
        
        toast.id = id;
        toast.className = `toast ${colors[type]} text-white rounded-lg shadow-lg p-4 transform transition-all duration-300 translate-x-full`;
        toast.innerHTML = `
            <div class="flex items-center space-x-3">
                <i class="fas ${icons[type]} text-xl"></i>
                <div class="flex-1">
                    <p class="font-medium">${message}</p>
                </div>
                <button onclick="document.getElementById('${id}').remove()" class="text-white/80 hover:text-white">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        `;
        
        const container = document.getElementById('toastContainer');
        container.appendChild(toast);
        
        setTimeout(() => {
            toast.classList.remove('translate-x-full');
        }, 10);
        
        setTimeout(() => {
            toast.classList.add('translate-x-full');
            setTimeout(() => toast.remove(), 300);
        }, duration);
    }
}

// ============================================================
// API SERVICES
// ============================================================

const TeacherService = {
    // Get teacher profile by ID
    getTeacherProfile: async function() {
        const teacherId = getTeacherId();
        if (!teacherId) {
            console.error('No teacher ID found');
            return null;
        }
        
        try {
            const response = await fetch(`${APP_STATE.apiBaseUrl}/teachers/get-teacher-by-id/${teacherId}`, {
                method: 'GET',
                headers: getAuthHeaders()
            });
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const result = await response.json();
            return result.success ? result.data : result;
        } catch (error) {
            console.error('Error fetching teacher profile:', error);
            Toast.show('Failed to load teacher profile', 'error');
            return null;
        }
    },

    // Get teacher by teacher code
    getTeacherByCode: async function(teacherCode) {
        try {
            const response = await fetch(`${APP_STATE.apiBaseUrl}/teachers/get-teacher-by-code/${teacherCode}`, {
                method: 'GET',
                headers: getAuthHeaders()
            });
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const result = await response.json();
            return result.success ? result.data : result;
        } catch (error) {
            console.error('Error fetching teacher by code:', error);
            return null;
        }
    },

    // Get teacher by employee ID
    getTeacherByEmployeeId: async function(employeeId) {
        try {
            const response = await fetch(`${APP_STATE.apiBaseUrl}/teachers/get-teacher-by-employee-id/${employeeId}`, {
                method: 'GET',
                headers: getAuthHeaders()
            });
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const result = await response.json();
            return result.success ? result.data : result;
        } catch (error) {
            console.error('Error fetching teacher by employee ID:', error);
            return null;
        }
    }
};

const ClassService = {
    // Get classes assigned to teacher
    getTeacherClasses: async function() {
        const teacherId = getTeacherId();
        if (!teacherId) return [];
        
        try {
            // You'll need to implement this endpoint in your backend
            // For now, return empty array
            return [];
        } catch (error) {
            console.error('Error fetching classes:', error);
            return [];
        }
    }
};

const AttendanceService = {
    // Get attendance for teacher
    getTeacherAttendance: async function() {
        const teacherId = getTeacherId();
        if (!teacherId) return [];
        
        try {
            const response = await fetch(`${APP_STATE.apiBaseUrl}/teachers-attendance/teacher/${teacherId}`, {
                method: 'GET',
                headers: getAuthHeaders()
            });
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const result = await response.json();
            return Array.isArray(result) ? result : (result.data || []);
        } catch (error) {
            console.error('Error fetching attendance:', error);
            return [];
        }
    },

    // Get attendance statistics
    getAttendanceStatistics: async function() {
        try {
            const response = await fetch(`${APP_STATE.apiBaseUrl}/teachers-attendance/statistics`, {
                method: 'GET',
                headers: getAuthHeaders()
            });
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const result = await response.json();
            return result;
        } catch (error) {
            console.error('Error fetching attendance statistics:', error);
            return null;
        }
    },

    // Get monthly attendance summary
    getMonthlyAttendance: async function(year, month) {
        const teacherId = getTeacherId();
        if (!teacherId) return null;
        
        try {
            const response = await fetch(`${APP_STATE.apiBaseUrl}/teachers-attendance/teacher/${teacherId}/monthly-summary?year=${year}&month=${month}`, {
                method: 'GET',
                headers: getAuthHeaders()
            });
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const result = await response.json();
            return result;
        } catch (error) {
            console.error('Error fetching monthly attendance:', error);
            return null;
        }
    },

    // Get attendance by date range
    getAttendanceByDateRange: async function(startDate, endDate) {
        try {
            const response = await fetch(`${APP_STATE.apiBaseUrl}/teachers-attendance/date-range?startDate=${startDate}&endDate=${endDate}`, {
                method: 'GET',
                headers: getAuthHeaders()
            });
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const result = await response.json();
            return Array.isArray(result) ? result : (result.data || []);
        } catch (error) {
            console.error('Error fetching attendance by date range:', error);
            return [];
        }
    }
};

const MarksService = {
    // Get marks/evaluations for teacher's classes
    getTeacherMarks: async function() {
        const teacherId = getTeacherId();
        if (!teacherId) return [];
        
        try {
            // You'll need to implement this endpoint in your backend
            return [];
        } catch (error) {
            console.error('Error fetching marks:', error);
            return [];
        }
    }
};

const TimetableService = {
    // Get teacher's timetable
    getTeacherTimetable: async function() {
        const teacherId = getTeacherId();
        if (!teacherId) return {};
        
        try {
            // You'll need to implement this endpoint in your backend
            return {};
        } catch (error) {
            console.error('Error fetching timetable:', error);
            return {};
        }
    }
};

const StudentService = {
    // Get students from teacher's classes
    getTeacherStudents: async function() {
        const teacherId = getTeacherId();
        if (!teacherId) return [];
        
        try {
            // You'll need to implement this endpoint in your backend
            return [];
        } catch (error) {
            console.error('Error fetching students:', error);
            return [];
        }
    }
};

const NotificationService = {
    // Get teacher notifications
    getTeacherNotifications: async function() {
        const teacherId = getTeacherId();
        if (!teacherId) return [];
        
        try {
            // You'll need to implement this endpoint in your backend
            return [];
        } catch (error) {
            console.error('Error fetching notifications:', error);
            return [];
        }
    }
};

// ============================================================
// INITIALIZATION
// ============================================================

document.addEventListener('DOMContentLoaded', function() {
    initApp();
});

async function initApp() {
    // Show loading screen
    await simulateLoading();
    
    try {
        // Load teacher profile from backend
        await loadTeacherProfile();
        
        // Load all dashboard data in parallel
        await Promise.all([
            loadTeacherClasses(),
            loadTeacherAttendance(),
            loadTeacherMarks(),
            loadTeacherTimetable(),
            loadTeacherStudents(),
            loadNotifications()
        ]);
        
        // Initialize UI
        initUI();
        setupEventListeners();
        loadCurrentTab();
        
        // Start auto-refresh (every 5 minutes)
        startAutoRefresh();
        
        Toast.show('Dashboard loaded successfully', 'success');
    } catch (error) {
        console.error('Error initializing dashboard:', error);
        Toast.show('Failed to load dashboard data', 'error');
    } finally {
        // Hide loading screen
        setTimeout(() => {
            const loadingScreen = document.getElementById('loadingScreen');
            if (loadingScreen) {
                loadingScreen.style.opacity = '0';
                setTimeout(() => {
                    loadingScreen.style.display = 'none';
                    document.getElementById('mainContent').classList.remove('hidden');
                }, 500);
            }
        }, 500);
    }
}

// Simulate Loading Progress
async function simulateLoading() {
    const progressBar = document.getElementById('loadingProgress');
    if (!progressBar) return;
    
    const steps = [20, 40, 60, 80, 100];
    
    for (let i = 0; i < steps.length; i++) {
        progressBar.style.width = `${steps[i]}%`;
        await new Promise(resolve => setTimeout(resolve, 300));
    }
}

// ============================================================
// DATA LOADING FUNCTIONS
// ============================================================

async function loadTeacherProfile() {
    const profile = await TeacherService.getTeacherProfile();
    
    if (profile) {
        APP_STATE.teacherProfile = profile;
        
        // Update localStorage with latest data
        localStorage.setItem('user_name', profile.fullName || profile.name || '');
        localStorage.setItem('designation', profile.designation || '');
        localStorage.setItem('department', profile.department || '');
        localStorage.setItem('teacher_code', profile.teacherCode || '');
        localStorage.setItem('employee_id', profile.employeeId || '');
        
        console.log('✅ Teacher profile loaded:', profile);
    } else {
        // Use auth data as fallback
        APP_STATE.teacherProfile = {
            id: getTeacherId(),
            teacherCode: getTeacherCode(),
            employeeId: getEmployeeId(),
            name: getTeacherName(),
            designation: getTeacherDesignation(),
            department: getTeacherDepartment() || 'Not Assigned'
        };
        
        console.log('⚠️ Using cached teacher data');
    }
    
    updateTeacherInfo();
}

async function loadTeacherClasses() {
    APP_STATE.classes = await ClassService.getTeacherClasses();
    console.log(`📚 Loaded ${APP_STATE.classes.length} classes`);
}

async function loadTeacherAttendance() {
    const [attendance, statistics] = await Promise.all([
        AttendanceService.getTeacherAttendance(),
        AttendanceService.getAttendanceStatistics()
    ]);
    
    APP_STATE.attendance = attendance || [];
    APP_STATE.attendanceStats = statistics || {
        presentCount: 0,
        absentCount: 0,
        leaveCount: 0,
        lateCount: 0,
        halfDayCount: 0,
        attendancePercentage: 0
    };
    
    console.log(`📊 Loaded ${APP_STATE.attendance.length} attendance records`);
}

async function loadTeacherMarks() {
    APP_STATE.marks = await MarksService.getTeacherMarks();
    console.log(`📝 Loaded ${APP_STATE.marks.length} marks records`);
}

async function loadTeacherTimetable() {
    APP_STATE.timetable = await TimetableService.getTeacherTimetable();
    console.log(`⏰ Loaded timetable data`);
}

async function loadTeacherStudents() {
    APP_STATE.students = await StudentService.getTeacherStudents();
    console.log(`👥 Loaded ${APP_STATE.students.length} students`);
}

async function loadNotifications() {
    APP_STATE.notifications = await NotificationService.getTeacherNotifications();
    APP_STATE.unreadNotifications = APP_STATE.notifications.filter(n => !n.read).length;
    console.log(`🔔 Loaded ${APP_STATE.notifications.length} notifications`);
}

// ============================================================
// UI INITIALIZATION
// ============================================================

function initUI() {
    updateTeacherInfo();
    setupNavigation();
    updateNotifications();
    updateGreeting();
    updateDateTime();
}

function updateTeacherInfo() {
    const teacher = APP_STATE.teacherProfile;
    if (!teacher) return;
    
    const teacherName = teacher.fullName || teacher.name || getTeacherName() || 'Teacher';
    const teacherId = teacher.teacherCode || teacher.employeeId || getTeacherCode() || getEmployeeId() || 'TCH0000';
    const designation = teacher.designation || getTeacherDesignation() || 'Teacher';
    const department = teacher.department || getTeacherDepartment() || 'Not Assigned';
    
    // Update all teacher name elements
    document.querySelectorAll('#teacherName, #userName, #mobileTeacherName').forEach(el => {
        if (el) el.textContent = teacherName;
    });
    
    // Update teacher ID elements
    document.querySelectorAll('#teacherId, #mobileTeacherId').forEach(el => {
        if (el) el.textContent = teacherId;
    });
    
    // Update designation and department
    const quickDesignation = document.getElementById('quickDesignation');
    if (quickDesignation) quickDesignation.textContent = designation;
    
    const quickDepartment = document.getElementById('quickDepartment');
    if (quickDepartment) quickDepartment.textContent = department;
    
    // Update quick stats
    const quickClasses = document.getElementById('quickClasses');
    if (quickClasses) quickClasses.textContent = APP_STATE.classes.length || '0';
    
    const quickStudents = document.getElementById('quickStudents');
    if (quickStudents) quickStudents.textContent = APP_STATE.students.length || '0';
    
    const quickExperience = document.getElementById('quickExperience');
    if (quickExperience && teacher.totalExperience) {
        quickExperience.textContent = `${teacher.totalExperience} years`;
    }
    
    // Update welcome message
    updateGreeting();
}

function setupNavigation() {
    const navItems = [
        { id: 'overview', icon: 'fa-home', label: 'Overview', description: 'Dashboard summary' },
        { id: 'classes', icon: 'fa-users', label: 'My Classes', description: 'Class assignments' },
        { id: 'attendance', icon: 'fa-calendar-check', label: 'Attendance', description: 'Class attendance' },
        { id: 'marks', icon: 'fa-chart-line', label: 'Marks', description: 'Evaluations & grading' },
        { id: 'timetable', icon: 'fa-clock', label: 'Timetable', description: 'Teaching schedule' },
        { id: 'students', icon: 'fa-user-graduate', label: 'Students', description: 'Student information' },
        { id: 'profile', icon: 'fa-user-circle', label: 'Profile', description: 'Complete details' },
        { id: 'analytics', icon: 'fa-chart-bar', label: 'Analytics', description: 'Performance insights' }
    ];
    
    // Desktop Navigation
    const desktopNav = document.getElementById('desktopNav');
    if (desktopNav) {
        desktopNav.innerHTML = navItems.map(item => `
            <button onclick="switchTab('${item.id}')" 
                    class="w-full text-left px-4 py-3 rounded-xl hover:bg-gradient-to-r hover:from-blue-50 hover:to-purple-50 hover:text-blue-600 transition-all duration-300 flex items-center space-x-3 group ${APP_STATE.currentTab === item.id ? 'bg-gradient-to-r from-blue-50 to-purple-50 text-blue-600' : ''}"
                    data-tab="${item.id}">
                <div class="h-10 w-10 rounded-lg bg-gradient-to-br from-blue-100 to-purple-100 flex items-center justify-center group-hover:from-blue-200 group-hover:to-purple-200">
                    <i class="fas ${item.icon} text-blue-600"></i>
                </div>
                <div class="flex-1">
                    <span class="font-medium">${item.label}</span>
                    <p class="text-xs text-gray-500">${item.description}</p>
                </div>
                <i class="fas fa-chevron-right text-gray-400 group-hover:text-blue-600"></i>
            </button>
        `).join('');
    }
    
    // Mobile Navigation
    const mobileNav = document.getElementById('mobileNavItems');
    if (mobileNav) {
        mobileNav.innerHTML = navItems.map(item => `
            <button onclick="switchTab('${item.id}'); closeMobileMenu();" 
                    class="w-full text-left px-4 py-3 rounded-lg hover:bg-gray-100 flex items-center space-x-3 ${APP_STATE.currentTab === item.id ? 'bg-blue-50 text-blue-600' : ''}">
                <div class="h-10 w-10 rounded-lg bg-gray-100 flex items-center justify-center">
                    <i class="fas ${item.icon} ${APP_STATE.currentTab === item.id ? 'text-blue-600' : 'text-gray-500'}"></i>
                </div>
                <div class="flex-1">
                    <span class="font-medium">${item.label}</span>
                    <p class="text-xs text-gray-500">${item.description}</p>
                </div>
            </button>
        `).join('');
    }
    
    // Bottom Navigation (Mobile - limited to 4 items)
    const bottomNav = document.getElementById('bottomNav');
    if (bottomNav) {
        const bottomNavItems = [
            { id: 'overview', icon: 'fa-home', label: 'Home' },
            { id: 'classes', icon: 'fa-users', label: 'Classes' },
            { id: 'marks', icon: 'fa-chart-line', label: 'Marks' },
            { id: 'profile', icon: 'fa-user', label: 'Profile' }
        ];
        
        bottomNav.innerHTML = bottomNavItems.map(item => `
            <button onclick="switchTab('${item.id}')" 
                    class="flex flex-col items-center space-y-1 p-2 rounded-lg ${APP_STATE.currentTab === item.id ? 'text-blue-600' : 'text-gray-500'}">
                <i class="fas ${item.icon} text-xl"></i>
                <span class="text-xs">${item.label}</span>
            </button>
        `).join('');
    }
}

// ============================================================
// TAB SWITCHING
// ============================================================

function switchTab(tabId) {
    if (APP_STATE.currentTab === tabId) return;
    
    APP_STATE.currentTab = tabId;
    
    // Update active tab UI
    document.querySelectorAll('[data-tab]').forEach(btn => {
        btn.classList.remove('bg-gradient-to-r', 'from-blue-50', 'to-purple-50', 'text-blue-600');
    });
    
    const activeBtn = document.querySelector(`[data-tab="${tabId}"]`);
    if (activeBtn) {
        activeBtn.classList.add('bg-gradient-to-r', 'from-blue-50', 'to-purple-50', 'text-blue-600');
    }
    
    // Hide all tabs
    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.classList.remove('active');
    });
    
    // Show selected tab
    const selectedTab = document.getElementById(`${tabId}Tab`);
    if (selectedTab) {
        selectedTab.classList.add('active');
        loadTabContent(tabId);
    }
    
    // Update current tab title
    const tabTitles = {
        overview: 'Dashboard',
        classes: 'My Classes',
        attendance: 'Attendance',
        marks: 'Marks & Evaluations',
        timetable: 'Teaching Timetable',
        students: 'Students',
        profile: 'My Profile',
        analytics: 'Analytics'
    };
    
    const titleEl = document.getElementById('currentTabTitle');
    if (titleEl) titleEl.textContent = tabTitles[tabId] || 'Dashboard';
    
    // Close mobile menu if open
    closeMobileMenu();
}

function loadCurrentTab() {
    loadTabContent(APP_STATE.currentTab);
}

function loadTabContent(tabId) {
    switch(tabId) {
        case 'overview':
            loadOverviewTab();
            break;
        case 'classes':
            loadClassesTab();
            break;
        case 'attendance':
            loadAttendanceTab();
            break;
        case 'marks':
            loadMarksTab();
            break;
        case 'timetable':
            loadTimetableTab();
            break;
        case 'students':
            loadStudentsTab();
            break;
        case 'profile':
            loadProfileTab();
            break;
        case 'analytics':
            loadAnalyticsTab();
            break;
    }
}

// ============================================================
// TAB CONTENT LOADERS
// ============================================================

function loadOverviewTab() {
    const tabContent = document.getElementById('overviewTab');
    if (!tabContent) return;
    
    const teacher = APP_STATE.teacherProfile;
    const today = new Date().toLocaleDateString('en-US', { weekday: 'long' });
    const todaySchedule = APP_STATE.timetable[today] || [];
    const pendingCount = APP_STATE.marks.filter(m => m.status === 'pending').length || 0;
    
    tabContent.innerHTML = `
        <!-- Welcome Banner -->
        <div class="teacher-gradient rounded-2xl shadow-lg p-6 mb-6 text-white">
            <div class="flex flex-col md:flex-row items-center justify-between">
                <div>
                    <h1 class="text-2xl font-bold mb-2" id="welcomeMessage">Welcome, ${teacher?.name?.split(' ')[0] || 'Teacher'}!</h1>
                    <p class="opacity-90">Here's your teaching summary for today</p>
                    <div class="flex flex-wrap gap-4 mt-4">
                        <div class="flex items-center space-x-2">
                            <i class="fas fa-calendar"></i>
                            <span id="currentDate">${new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
                        </div>
                        <div class="flex items-center space-x-2">
                            <i class="fas fa-clock"></i>
                            <span id="currentTime">${new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                    </div>
                </div>
                <div class="mt-4 md:mt-0">
                    <div class="h-20 w-20 rounded-full bg-white/10 flex items-center justify-center">
                        <i class="fas fa-award text-3xl"></i>
                    </div>
                </div>
            </div>
        </div>

        <!-- Quick Stats -->
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <!-- Classes Card -->
            <div class="bg-white rounded-xl shadow p-6 card-hover">
                <div class="flex items-center justify-between mb-4">
                    <div>
                        <p class="text-sm text-gray-600">Classes Assigned</p>
                        <p class="text-3xl font-bold text-blue-600">${APP_STATE.classes.length || 0}</p>
                    </div>
                    <div class="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center">
                        <i class="fas fa-users text-blue-600 text-xl"></i>
                    </div>
                </div>
            </div>

            <!-- Students Card -->
            <div class="bg-white rounded-xl shadow p-6 card-hover">
                <div class="flex items-center justify-between mb-4">
                    <div>
                        <p class="text-sm text-gray-600">Total Students</p>
                        <p class="text-3xl font-bold text-purple-600">${APP_STATE.students.length || 0}</p>
                    </div>
                    <div class="h-12 w-12 rounded-full bg-purple-100 flex items-center justify-center">
                        <i class="fas fa-user-graduate text-purple-600 text-xl"></i>
                    </div>
                </div>
            </div>

            <!-- Attendance Card -->
            <div class="bg-white rounded-xl shadow p-6 card-hover">
                <div class="flex items-center justify-between mb-4">
                    <div>
                        <p class="text-sm text-gray-600">Attendance %</p>
                        <p class="text-3xl font-bold text-green-600">${APP_STATE.attendanceStats?.attendancePercentage?.toFixed(1) || 0}%</p>
                    </div>
                    <div class="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center">
                        <i class="fas fa-calendar-check text-green-600 text-xl"></i>
                    </div>
                </div>
            </div>

            <!-- Pending Evaluations -->
            <div class="bg-white rounded-xl shadow p-6 card-hover">
                <div class="flex items-center justify-between mb-4">
                    <div>
                        <p class="text-sm text-gray-600">Pending Evaluations</p>
                        <p class="text-3xl font-bold text-red-600">${pendingCount}</p>
                    </div>
                    <div class="h-12 w-12 rounded-full bg-red-100 flex items-center justify-center">
                        <i class="fas fa-clipboard-check text-red-600 text-xl"></i>
                    </div>
                </div>
            </div>
        </div>

        <!-- Today's Schedule & Quick Actions -->
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            <!-- Today's Schedule -->
            <div class="bg-white rounded-xl shadow p-6">
                <h3 class="text-lg font-bold mb-4 flex items-center">
                    <i class="fas fa-calendar-day text-blue-600 mr-2"></i>
                    Today's Schedule (${today})
                </h3>
                <div class="space-y-3">
                    ${todaySchedule.length > 0 ? todaySchedule.map(item => `
                        <div class="flex items-center justify-between p-3 bg-gradient-to-r from-blue-50 to-blue-100 rounded-xl">
                            <div class="flex items-center space-x-3">
                                <div class="h-10 w-10 bg-blue-200 rounded-lg flex items-center justify-center">
                                    <i class="fas ${item.free ? 'fa-coffee' : 'fa-chalkboard-teacher'} text-blue-600"></i>
                                </div>
                                <div>
                                    <h4 class="font-medium">${item.free ? item.activity : `${item.class} - ${item.subject}`}</h4>
                                    <p class="text-sm text-gray-600">${item.free ? 'Free Period' : `${item.room} • ${item.time}`}</p>
                                </div>
                            </div>
                            <span class="font-medium">${item.time}</span>
                        </div>
                    `).join('') : '<p class="text-center text-gray-500 py-4">No classes scheduled for today</p>'}
                </div>
            </div>

            <!-- Quick Actions -->
            <div class="bg-white rounded-xl shadow p-6">
                <h3 class="text-lg font-bold mb-4 flex items-center">
                    <i class="fas fa-bolt text-orange-600 mr-2"></i>
                    Quick Actions
                </h3>
                <div class="grid grid-cols-2 gap-3">
                    <button onclick="switchTab('attendance')" class="p-4 bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl text-center hover:shadow-md transition-shadow">
                        <i class="fas fa-calendar-check text-green-600 text-2xl mb-2"></i>
                        <p class="font-medium">Mark Attendance</p>
                    </button>
                    <button onclick="switchTab('marks')" class="p-4 bg-gradient-to-br from-blue-50 to-cyan-50 rounded-xl text-center hover:shadow-md transition-shadow">
                        <i class="fas fa-edit text-blue-600 text-2xl mb-2"></i>
                        <p class="font-medium">Enter Marks</p>
                    </button>
                    <button onclick="switchTab('timetable')" class="p-4 bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl text-center hover:shadow-md transition-shadow">
                        <i class="fas fa-clock text-purple-600 text-2xl mb-2"></i>
                        <p class="font-medium">View Timetable</p>
                    </button>
                    <button onclick="refreshDashboard()" class="p-4 bg-gradient-to-br from-yellow-50 to-amber-50 rounded-xl text-center hover:shadow-md transition-shadow">
                        <i class="fas fa-sync-alt text-yellow-600 text-2xl mb-2"></i>
                        <p class="font-medium">Refresh Data</p>
                    </button>
                </div>
            </div>
        </div>

        <!-- Attendance Summary Preview -->
        <div class="bg-white rounded-xl shadow p-6">
            <h3 class="text-lg font-bold mb-4 flex items-center">
                <i class="fas fa-chart-pie text-green-600 mr-2"></i>
                Today's Attendance Summary
            </h3>
            <div class="grid grid-cols-2 md:grid-cols-5 gap-3">
                <div class="text-center p-3 bg-green-50 rounded-lg">
                    <p class="text-xs text-gray-600">Present</p>
                    <p class="text-xl font-bold text-green-600">${APP_STATE.attendanceStats?.presentCount || 0}</p>
                </div>
                <div class="text-center p-3 bg-red-50 rounded-lg">
                    <p class="text-xs text-gray-600">Absent</p>
                    <p class="text-xl font-bold text-red-600">${APP_STATE.attendanceStats?.absentCount || 0}</p>
                </div>
                <div class="text-center p-3 bg-purple-50 rounded-lg">
                    <p class="text-xs text-gray-600">Leave</p>
                    <p class="text-xl font-bold text-purple-600">${APP_STATE.attendanceStats?.leaveCount || 0}</p>
                </div>
                <div class="text-center p-3 bg-orange-50 rounded-lg">
                    <p class="text-xs text-gray-600">Late</p>
                    <p class="text-xl font-bold text-orange-600">${APP_STATE.attendanceStats?.lateCount || 0}</p>
                </div>
                <div class="text-center p-3 bg-blue-50 rounded-lg">
                    <p class="text-xs text-gray-600">Half Day</p>
                    <p class="text-xl font-bold text-blue-600">${APP_STATE.attendanceStats?.halfDayCount || 0}</p>
                </div>
            </div>
        </div>
    `;
}

function loadClassesTab() {
    const tabContent = document.getElementById('classesTab');
    if (!tabContent) return;
    
    if (APP_STATE.classes.length === 0) {
        tabContent.innerHTML = `
            <div class="bg-white rounded-xl shadow p-8 text-center">
                <i class="fas fa-users text-5xl text-gray-300 mb-4"></i>
                <h3 class="text-xl font-bold text-gray-700 mb-2">No Classes Found</h3>
                <p class="text-gray-500">No classes have been assigned to you yet.</p>
                <button onclick="refreshDashboard()" class="mt-4 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                    <i class="fas fa-sync-alt mr-2"></i>Refresh
                </button>
            </div>
        `;
        return;
    }
    
    // Render classes
    tabContent.innerHTML = `
        <div class="bg-white rounded-xl shadow p-6">
            <h3 class="text-lg font-bold mb-4">My Classes</h3>
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                ${APP_STATE.classes.map(cls => `
                    <div class="border rounded-xl p-4 hover:shadow-md transition-shadow">
                        <div class="flex justify-between items-start mb-3">
                            <div>
                                <h4 class="font-bold text-lg">${cls.className || 'N/A'}</h4>
                                <p class="text-sm text-gray-600">${cls.subject || 'N/A'}</p>
                            </div>
                        </div>
                        <div class="space-y-2 text-sm">
                            <div class="flex justify-between">
                                <span class="text-gray-600">Students:</span>
                                <span class="font-medium">${cls.totalStudents || 0}</span>
                            </div>
                            <div class="flex justify-between">
                                <span class="text-gray-600">Schedule:</span>
                                <span class="font-medium">${cls.schedule || 'TBD'}</span>
                            </div>
                        </div>
                    </div>
                `).join('')}
            </div>
        </div>
    `;
}

function loadAttendanceTab() {
    const tabContent = document.getElementById('attendanceTab');
    if (!tabContent) return;
    
    tabContent.innerHTML = `
        <div class="bg-white rounded-xl shadow p-6">
            <h3 class="text-lg font-bold mb-4">Attendance Overview</h3>
            <div class="space-y-4">
                <div class="grid grid-cols-2 md:grid-cols-5 gap-4">
                    <div class="bg-blue-50 p-4 rounded-lg text-center">
                        <p class="text-sm text-gray-600">Total Records</p>
                        <p class="text-2xl font-bold text-blue-600">${APP_STATE.attendance.length}</p>
                    </div>
                    <div class="bg-green-50 p-4 rounded-lg text-center">
                        <p class="text-sm text-gray-600">Present</p>
                        <p class="text-2xl font-bold text-green-600">${APP_STATE.attendanceStats?.presentCount || 0}</p>
                    </div>
                    <div class="bg-red-50 p-4 rounded-lg text-center">
                        <p class="text-sm text-gray-600">Absent</p>
                        <p class="text-2xl font-bold text-red-600">${APP_STATE.attendanceStats?.absentCount || 0}</p>
                    </div>
                    <div class="bg-purple-50 p-4 rounded-lg text-center">
                        <p class="text-sm text-gray-600">Leave</p>
                        <p class="text-2xl font-bold text-purple-600">${APP_STATE.attendanceStats?.leaveCount || 0}</p>
                    </div>
                    <div class="bg-orange-50 p-4 rounded-lg text-center">
                        <p class="text-sm text-gray-600">Late</p>
                        <p class="text-2xl font-bold text-orange-600">${APP_STATE.attendanceStats?.lateCount || 0}</p>
                    </div>
                </div>
                <div class="h-80 mt-6">
                    <canvas id="attendanceChart"></canvas>
                </div>
            </div>
        </div>
    `;
    
    // Initialize attendance chart
    setTimeout(() => initAttendanceChart(), 100);
}

function loadMarksTab() {
    const tabContent = document.getElementById('marksTab');
    if (!tabContent) return;
    
    tabContent.innerHTML = `
        <div class="bg-white rounded-xl shadow p-6">
            <h3 class="text-lg font-bold mb-4">Marks & Evaluations</h3>
            <p class="text-gray-500 text-center py-8">Marks module will be integrated with your backend</p>
        </div>
    `;
}

function loadTimetableTab() {
    const tabContent = document.getElementById('timetableTab');
    if (!tabContent) return;
    
    tabContent.innerHTML = `
        <div class="bg-white rounded-xl shadow p-6">
            <h3 class="text-lg font-bold mb-4">Teaching Timetable</h3>
            <p class="text-gray-500 text-center py-8">Timetable module will be integrated with your backend</p>
        </div>
    `;
}

function loadStudentsTab() {
    const tabContent = document.getElementById('studentsTab');
    if (!tabContent) return;
    
    if (APP_STATE.students.length === 0) {
        tabContent.innerHTML = `
            <div class="bg-white rounded-xl shadow p-8 text-center">
                <i class="fas fa-user-graduate text-5xl text-gray-300 mb-4"></i>
                <h3 class="text-xl font-bold text-gray-700 mb-2">No Students Found</h3>
                <p class="text-gray-500">No students are assigned to your classes yet.</p>
            </div>
        `;
        return;
    }
    
    tabContent.innerHTML = `
        <div class="bg-white rounded-xl shadow p-6">
            <h3 class="text-lg font-bold mb-4">My Students</h3>
            <div class="overflow-x-auto">
                <table class="w-full">
                    <thead class="bg-gray-50">
                        <tr>
                            <th class="px-4 py-3 text-left">Name</th>
                            <th class="px-4 py-3 text-left">Class</th>
                            <th class="px-4 py-3 text-left">Roll No</th>
                            <th class="px-4 py-3 text-left">Action</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${APP_STATE.students.map(student => `
                            <tr class="border-t hover:bg-gray-50">
                                <td class="px-4 py-3">${student.name || 'N/A'}</td>
                                <td class="px-4 py-3">${student.className || 'N/A'}</td>
                                <td class="px-4 py-3">${student.rollNo || 'N/A'}</td>
                                <td class="px-4 py-3">
                                    <button class="text-blue-600 hover:text-blue-800">View</button>
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        </div>
    `;
}

function loadProfileTab() {
    const tabContent = document.getElementById('profileTab');
    if (!tabContent) return;
    
    const teacher = APP_STATE.teacherProfile;
    if (!teacher) return;
    
    tabContent.innerHTML = `
        <div class="bg-white rounded-xl shadow p-6">
            <h3 class="text-lg font-bold mb-4">My Profile</h3>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                    <div class="mb-4">
                        <p class="text-sm text-gray-600">Full Name</p>
                        <p class="font-medium text-lg">${teacher.fullName || teacher.name || 'N/A'}</p>
                    </div>
                    <div class="mb-4">
                        <p class="text-sm text-gray-600">Teacher Code</p>
                        <p class="font-medium">${teacher.teacherCode || 'N/A'}</p>
                    </div>
                    <div class="mb-4">
                        <p class="text-sm text-gray-600">Employee ID</p>
                        <p class="font-medium">${teacher.employeeId || 'N/A'}</p>
                    </div>
                    <div class="mb-4">
                        <p class="text-sm text-gray-600">Designation</p>
                        <p class="font-medium">${teacher.designation || 'N/A'}</p>
                    </div>
                    <div class="mb-4">
                        <p class="text-sm text-gray-600">Department</p>
                        <p class="font-medium">${teacher.department || 'N/A'}</p>
                    </div>
                </div>
                <div>
                    <div class="mb-4">
                        <p class="text-sm text-gray-600">Email</p>
                        <p class="font-medium">${teacher.email || 'N/A'}</p>
                    </div>
                    <div class="mb-4">
                        <p class="text-sm text-gray-600">Contact Number</p>
                        <p class="font-medium">${teacher.contactNumber || 'N/A'}</p>
                    </div>
                    <div class="mb-4">
                        <p class="text-sm text-gray-600">Qualification</p>
                        <p class="font-medium">${teacher.qualification || 'N/A'}</p>
                    </div>
                    <div class="mb-4">
                        <p class="text-sm text-gray-600">Experience</p>
                        <p class="font-medium">${teacher.totalExperience || 0} years</p>
                    </div>
                    <div class="mb-4">
                        <p class="text-sm text-gray-600">Joining Date</p>
                        <p class="font-medium">${teacher.joiningDate ? new Date(teacher.joiningDate).toLocaleDateString() : 'N/A'}</p>
                    </div>
                </div>
            </div>
        </div>
    `;
}

function loadAnalyticsTab() {
    const tabContent = document.getElementById('analyticsTab');
    if (!tabContent) return;
    
    tabContent.innerHTML = `
        <div class="bg-white rounded-xl shadow p-6">
            <h3 class="text-lg font-bold mb-4">Analytics</h3>
            <p class="text-gray-500 text-center py-8">Analytics module coming soon</p>
        </div>
    `;
}

// ============================================================
// CHART INITIALIZATION
// ============================================================

function initAttendanceChart() {
    const ctx = document.getElementById('attendanceChart');
    if (!ctx) return;
    
    // Destroy existing chart if it exists
    if (APP_STATE.attendanceChart) {
        APP_STATE.attendanceChart.destroy();
    }
    
    const stats = APP_STATE.attendanceStats || {
        presentCount: 0,
        absentCount: 0,
        leaveCount: 0,
        lateCount: 0,
        halfDayCount: 0
    };
    
    APP_STATE.attendanceChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['Present', 'Absent', 'Leave', 'Late', 'Half Day'],
            datasets: [{
                data: [
                    stats.presentCount || 0,
                    stats.absentCount || 0,
                    stats.leaveCount || 0,
                    stats.lateCount || 0,
                    stats.halfDayCount || 0
                ],
                backgroundColor: [
                    '#10b981',
                    '#ef4444',
                    '#8b5cf6',
                    '#f59e0b',
                    '#3b82f6'
                ]
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom'
                }
            }
        }
    });
}

// ============================================================
// UTILITY FUNCTIONS
// ============================================================

function updateDateTime() {
    const now = new Date();
    const dateElements = document.querySelectorAll('#currentDate');
    const timeElements = document.querySelectorAll('#currentTime');
    
    const dateStr = now.toLocaleDateString('en-US', { 
        weekday: 'long', 
        month: 'long', 
        day: 'numeric', 
        year: 'numeric' 
    });
    
    const timeStr = now.toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: true 
    });
    
    dateElements.forEach(el => {
        if (el) el.textContent = dateStr;
    });
    
    timeElements.forEach(el => {
        if (el) el.textContent = timeStr;
    });
}

function updateGreeting() {
    const hour = new Date().getHours();
    let greeting = '';
    
    if (hour < 12) greeting = 'Good Morning';
    else if (hour < 17) greeting = 'Good Afternoon';
    else greeting = 'Good Evening';
    
    const welcomeMessage = document.getElementById('welcomeMessage');
    if (welcomeMessage) {
        const firstName = APP_STATE.teacherProfile?.name?.split(' ')[0] || 'Teacher';
        welcomeMessage.textContent = `${greeting}, ${firstName}!`;
    }
}

function refreshDashboard() {
    Toast.show('Refreshing dashboard...', 'info');
    initApp();
}

// ============================================================
// NOTIFICATION FUNCTIONS
// ============================================================

function updateNotifications() {
    const list = document.getElementById('notificationsList');
    if (!list) return;
    
    const unreadCount = APP_STATE.notifications.filter(n => !n.read).length;
    
    // Update badge
    const badge = document.getElementById('notificationBadge');
    if (badge) {
        badge.textContent = unreadCount;
        badge.classList.toggle('hidden', unreadCount === 0);
    }
    
    if (APP_STATE.notifications.length === 0) {
        list.innerHTML = `
            <div class="p-4 text-center text-gray-500">
                <i class="fas fa-bell-slash text-2xl mb-2"></i>
                <p>No notifications</p>
            </div>
        `;
        return;
    }
    
    list.innerHTML = APP_STATE.notifications.map(notif => `
        <div class="p-3 border-b ${notif.read ? '' : 'bg-blue-50'} hover:bg-gray-50 cursor-pointer" onclick="viewNotification(${notif.id})">
            <div class="flex items-start space-x-3">
                <div class="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                    <i class="fas fa-bell text-blue-600"></i>
                </div>
                <div class="flex-1">
                    <div class="flex justify-between">
                        <h4 class="font-medium ${notif.read ? 'text-gray-700' : 'text-gray-900'}">${notif.title || 'Notification'}</h4>
                        ${!notif.read ? '<span class="h-2 w-2 bg-red-500 rounded-full"></span>' : ''}
                    </div>
                    <p class="text-sm text-gray-600">${notif.message || ''}</p>
                    <p class="text-xs text-gray-500 mt-1">${formatTimeAgo(new Date(notif.timestamp))}</p>
                </div>
            </div>
        </div>
    `).join('');
}

function toggleNotifications() {
    const panel = document.getElementById('notificationPanel');
    if (panel) {
        panel.classList.toggle('hidden');
        updateNotifications();
    }
}

function viewNotification(id) {
    const notification = APP_STATE.notifications.find(n => n.id === id);
    if (notification && !notification.read) {
        notification.read = true;
        updateNotifications();
    }
}

function markAllAsRead() {
    APP_STATE.notifications.forEach(n => n.read = true);
    updateNotifications();
    Toast.show('All notifications marked as read', 'success');
}

function formatTimeAgo(date) {
    const seconds = Math.floor((new Date() - date) / 1000);
    
    let interval = seconds / 31536000;
    if (interval > 1) return Math.floor(interval) + ' years ago';
    
    interval = seconds / 2592000;
    if (interval > 1) return Math.floor(interval) + ' months ago';
    
    interval = seconds / 86400;
    if (interval > 1) return Math.floor(interval) + ' days ago';
    
    interval = seconds / 3600;
    if (interval > 1) return Math.floor(interval) + ' hours ago';
    
    interval = seconds / 60;
    if (interval > 1) return Math.floor(interval) + ' minutes ago';
    
    return 'just now';
}

// ============================================================
// MOBILE MENU FUNCTIONS
// ============================================================

function openMobileMenu() {
    const mobileMenu = document.getElementById('mobileMenu');
    const overlay = document.getElementById('mobileOverlay');
    
    if (mobileMenu) mobileMenu.classList.add('active');
    if (overlay) overlay.classList.add('active');
    document.body.style.overflow = 'hidden';
}

function closeMobileMenu() {
    const mobileMenu = document.getElementById('mobileMenu');
    const overlay = document.getElementById('mobileOverlay');
    
    if (mobileMenu) mobileMenu.classList.remove('active');
    if (overlay) overlay.classList.remove('active');
    document.body.style.overflow = '';
}

// ============================================================
// ADMIN PANEL NAVIGATION & ACCESS CONTROL
// ============================================================

// Check if user has admin access
function checkAdminAccess() {
    const userRole = localStorage.getItem('user_role');
    const isAdmin = userRole === 'admin' || userRole === 'super_admin';
    
    // Show/hide admin-only elements
    const adminElements = document.querySelectorAll('.admin-only');
    adminElements.forEach(el => {
        if (isAdmin) {
            el.classList.remove('hidden');
        } else {
            el.classList.add('hidden');
        }
    });
    
    return isAdmin;
}

// Navigate to admin panel
function goToAdminPanel() {
    const userRole = localStorage.getItem('user_role');
    
    if (userRole === 'admin' || userRole === 'super_admin') {
        // Store current page info for return navigation
        sessionStorage.setItem('return_to_teacher', window.location.href);
        sessionStorage.setItem('return_to_teacher_tab', APP_STATE.currentTab);
        sessionStorage.setItem('return_to_teacher_data', JSON.stringify({
            teacherId: getTeacherId(),
            teacherName: getTeacherName(),
            timestamp: new Date().toISOString()
        }));
        
        // Navigate to admin dashboard
        window.location.href = '../admin/dashboard.html';
    } else {
        Toast.show('You do not have admin access', 'error');
    }
}

// Toggle admin dropdown menu
function toggleAdminMenu() {
    const menu = document.getElementById('adminMenu');
    if (menu) {
        menu.classList.toggle('hidden');
        
        // Close other open menus
        const userMenu = document.getElementById('userMenu');
        if (userMenu) userMenu.classList.add('hidden');
        
        const notificationPanel = document.getElementById('notificationPanel');
        if (notificationPanel) notificationPanel.classList.add('hidden');
    }
}

// Quick switch with keyboard shortcut
function quickSwitchToAdmin() {
    const userRole = localStorage.getItem('user_role');
    
    if (userRole === 'admin' || userRole === 'super_admin') {
        // Show quick switch toast
        Toast.show('Switching to Admin Panel...', 'info');
        
        // Store minimal data for quick return
        sessionStorage.setItem('quick_switch', 'true');
        sessionStorage.setItem('return_to_teacher', window.location.href);
        
        // Navigate to admin
        setTimeout(() => {
            window.location.href = '../admin/dashboard.html';
        }, 500);
    } else {
        Toast.show('Admin access required', 'error');
        document.getElementById('adminMenu')?.classList.add('hidden');
    }
}

// Keyboard shortcut (Ctrl+Shift+A) for quick admin access
document.addEventListener('keydown', (e) => {
    if (e.ctrlKey && e.shiftKey && e.key === 'A') {
        e.preventDefault();
        quickSwitchToAdmin();
    }
});

// Add to existing DOMContentLoaded event
document.addEventListener('DOMContentLoaded', function() {
    // ... existing code ...
    
    // Check admin access and show/hide admin buttons
    setTimeout(() => {
        checkAdminAccess();
    }, 1000);
    
    // Click outside handler for admin menu
    document.addEventListener('click', (e) => {
        if (!e.target.closest('#adminMenu') && !e.target.closest('button[onclick="toggleAdminMenu()"]')) {
            const adminMenu = document.getElementById('adminMenu');
            if (adminMenu) adminMenu.classList.add('hidden');
        }
    });
});

// ============================================================
// USER MENU FUNCTIONS
// ============================================================

function toggleUserMenu() {
    const menu = document.getElementById('userMenu');
    if (menu) menu.classList.toggle('hidden');
}

// ============================================================
// ACTION FUNCTIONS
// ============================================================

function printReport() {
    window.print();
}

function downloadData() {
    const data = {
        teacher: APP_STATE.teacherProfile,
        classes: APP_STATE.classes,
        attendance: APP_STATE.attendance,
        attendanceStats: APP_STATE.attendanceStats,
        marks: APP_STATE.marks,
        students: APP_STATE.students,
        timestamp: new Date().toISOString()
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `teacher-data-${getTeacherCode() || 'export'}.json`;
    a.click();
    Toast.show('Data exported successfully', 'success');
}

function logout() {
    if (confirm('Are you sure you want to logout?')) {
        Toast.show('Logging out...', 'info');
        
        // Clear all auth data
        localStorage.clear();
        
        setTimeout(() => {
            window.location.replace('../login.html');
        }, 1000);
    }
}

// ============================================================
// EVENT LISTENERS
// ============================================================

function setupEventListeners() {
    // Mobile menu
    const mobileMenuButton = document.getElementById('mobileMenuButton');
    if (mobileMenuButton) mobileMenuButton.addEventListener('click', openMobileMenu);
    
    const mobileOverlay = document.getElementById('mobileOverlay');
    if (mobileOverlay) mobileOverlay.addEventListener('click', closeMobileMenu);
    
    // Close user menu when clicking outside
    document.addEventListener('click', (e) => {
        if (!e.target.closest('#userMenu') && !e.target.closest('button[onclick="toggleUserMenu()"]')) {
            const userMenu = document.getElementById('userMenu');
            if (userMenu) userMenu.classList.add('hidden');
        }
    });
    
    // Close notification panel when clicking outside
    document.addEventListener('click', (e) => {
        if (!e.target.closest('#notificationPanel') && !e.target.closest('button[onclick="toggleNotifications()"]')) {
            const notificationPanel = document.getElementById('notificationPanel');
            if (notificationPanel) notificationPanel.classList.add('hidden');
        }
    });
    
    // Update time every minute
    setInterval(updateDateTime, 60000);
}

// ============================================================
// AUTO REFRESH
// ============================================================

function startAutoRefresh() {
    // Refresh data every 5 minutes
    setInterval(() => {
        if (document.visibilityState === 'visible') {
            refreshDashboard();
        }
    }, 300000);
}

// ============================================================
// EXPOSE FUNCTIONS TO GLOBAL SCOPE
// ============================================================

window.switchTab = switchTab;
window.toggleNotifications = toggleNotifications;
window.markAllAsRead = markAllAsRead;
window.toggleUserMenu = toggleUserMenu;
window.logout = logout;
window.printReport = printReport;
window.downloadData = downloadData;
window.refreshDashboard = refreshDashboard;
window.openMobileMenu = openMobileMenu;
window.closeMobileMenu = closeMobileMenu;