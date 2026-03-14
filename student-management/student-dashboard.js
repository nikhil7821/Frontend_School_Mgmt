   
        // Application State
        const APP_STATE = {
            currentTab: 'overview',
            studentData: null,
            notifications: [],
            unreadNotifications: 3,
            darkMode: false,
            isLoading: false,
            currentMonth: new Date(),
            performanceChart: null,
            attendanceChart: null
        };

        // Dummy Data
        const DUMMY_DATA = {
            student: {
                id: 1,
                studentId: 'STU2024001',
                name: 'Aarav Sharma',
                email: 'aarav.sharma@school.edu',
                phone: '+91 98765 43210',
                dob: '2010-06-15',
                age: 13,
                gender: 'Male',
                bloodGroup: 'A+',
                casteCategory: 'General',
                address: '123, Park Street, Mumbai - 400001',
                fatherName: 'Rajesh Sharma',
                motherName: 'Priya Sharma',
                parentContact: '+91 98765 43211',
                emergencyContact: '+91 98765 43212',
                class: '8',
                section: 'A',
                rollNumber: '15',
                admissionDate: '2023-04-01',
                academicYear: '2023-2024',
                classTeacher: 'Mrs. Gupta',
                subjects: ['Mathematics', 'Science', 'English', 'Hindi', 'Social Studies', 'Computer Science'],
                sports: ['Cricket', 'Chess', 'Swimming'],
                achievements: [
                    'Math Olympiad Winner 2023',
                    'Science Exhibition 1st Prize',
                    'Best Student Award 2022-23'
                ],
                medicalInfo: 'No known allergies',
                status: 'Active',
                lastUpdated: new Date().toISOString()
            },
            
            attendance: {
                totalDays: 180,
                present: 165,
                absent: 10,
                leave: 5,
                percentage: 91.67,
                monthlyData: [
                    { month: 'Jan', present: 22, absent: 2, leave: 1 },
                    { month: 'Feb', present: 20, absent: 0, leave: 0 },
                    { month: 'Mar', present: 23, absent: 1, leave: 1 },
                    { month: 'Apr', present: 21, absent: 3, leave: 1 },
                    { month: 'May', present: 19, absent: 1, leave: 0 },
                    { month: 'Jun', present: 22, absent: 0, leave: 0 },
                    { month: 'Jul', present: 20, absent: 2, leave: 1 },
                    { month: 'Aug', present: 23, absent: 1, leave: 0 }
                ],
                dailyData: generateDailyAttendanceData()
            },
            
            fees: {
                total: 85000,
                paid: 65000,
                pending: 20000,
                dueDate: '2024-02-15',
                paymentMode: 'Installment',
                installments: [
                    { number: 1, amount: 25000, dueDate: '2023-06-01', status: 'paid', paidDate: '2023-06-01', receiptNo: 'REC001' },
                    { number: 2, amount: 25000, dueDate: '2023-10-01', status: 'paid', paidDate: '2023-09-28', receiptNo: 'REC002' },
                    { number: 3, amount: 20000, dueDate: '2024-02-15', status: 'pending', receiptNo: 'REC003' },
                    { number: 4, amount: 15000, dueDate: '2024-06-01', status: 'pending', receiptNo: 'REC004' }
                ],
                transactions: [
                    { id: 1, date: '2023-06-01', amount: 25000, mode: 'Online Transfer', status: 'completed', receiptNo: 'REC001' },
                    { id: 2, date: '2023-09-28', amount: 25000, mode: 'Cheque', status: 'completed', receiptNo: 'REC002' },
                    { id: 3, date: '2023-12-15', amount: 15000, mode: 'Cash', status: 'completed', receiptNo: 'REC005' }
                ],
                breakdown: {
                    tuition: 50000,
                    admission: 10000,
                    uniform: 8000,
                    books: 7000,
                    sports: 4000,
                    activities: 4000
                }
            },
            
            academic: {
                overallPercentage: 88.5,
                cgpa: 8.9,
                grade: 'A+',
                rank: 5,
                totalStudents: 60,
                subjectPerformance: [
                    { subject: 'Mathematics', marks: 95, maxMarks: 100, percentage: 95, grade: 'A+', teacher: 'Mr. Gupta' },
                    { subject: 'Science', marks: 88, maxMarks: 100, percentage: 88, grade: 'A', teacher: 'Ms. Sharma' },
                    { subject: 'English', marks: 92, maxMarks: 100, percentage: 92, grade: 'A+', teacher: 'Mr. Kumar' },
                    { subject: 'Hindi', marks: 85, maxMarks: 100, percentage: 85, grade: 'A', teacher: 'Ms. Patel' },
                    { subject: 'Social Studies', marks: 87, maxMarks: 100, percentage: 87, grade: 'A', teacher: 'Mr. Singh' },
                    { subject: 'Computer Science', marks: 84, maxMarks: 100, percentage: 84, grade: 'A', teacher: 'Mr. Verma' }
                ],
                examResults: [
                    {
                        exam: 'Mid-Term Examination',
                        date: '2023-10-15',
                        totalMarks: 500,
                        obtainedMarks: 445,
                        percentage: 89,
                        grade: 'A+',
                        subjects: [
                            { name: 'Mathematics', marks: 95, maxMarks: 100 },
                            { name: 'Science', marks: 88, maxMarks: 100 },
                            { name: 'English', marks: 92, maxMarks: 100 },
                            { name: 'Hindi', marks: 85, maxMarks: 100 },
                            { name: 'Social Studies', marks: 85, maxMarks: 100 }
                        ]
                    },
                    {
                        exam: 'Unit Test 2',
                        date: '2023-09-20',
                        totalMarks: 300,
                        obtainedMarks: 265,
                        percentage: 88.33,
                        grade: 'A+',
                        subjects: [
                            { name: 'Mathematics', marks: 92, maxMarks: 100 },
                            { name: 'Science', marks: 89, maxMarks: 100 },
                            { name: 'English', marks: 84, maxMarks: 100 }
                        ]
                    }
                ],
                upcomingExams: [
                    { subject: 'Mathematics', date: '2024-02-20', time: '10:00 AM', duration: '3 hours', maxMarks: 100, room: 'Room 101' },
                    { subject: 'Science', date: '2024-02-22', time: '10:00 AM', duration: '3 hours', maxMarks: 100, room: 'Lab 2' },
                    { subject: 'English', date: '2024-02-25', time: '10:00 AM', duration: '3 hours', maxMarks: 100, room: 'Room 102' },
                    { subject: 'Hindi', date: '2024-02-28', time: '10:00 AM', duration: '3 hours', maxMarks: 100, room: 'Room 103' }
                ]
            },
            
            timetable: {
                Monday: [
                    { time: '8:00-9:00', subject: 'Mathematics', teacher: 'Mr. Gupta', room: 'Room 101' },
                    { time: '9:00-10:00', subject: 'Science', teacher: 'Ms. Sharma', room: 'Lab 2' },
                    { time: '10:15-11:15', subject: 'English', teacher: 'Mr. Kumar', room: 'Room 102' },
                    { time: '11:15-12:15', subject: 'Hindi', teacher: 'Ms. Patel', room: 'Room 103' },
                    { time: '1:00-2:00', subject: 'Social Studies', teacher: 'Mr. Singh', room: 'Room 104' }
                ],
                Tuesday: [
                    { time: '8:00-9:00', subject: 'Mathematics', teacher: 'Mr. Gupta', room: 'Room 101' },
                    { time: '9:00-10:00', subject: 'Social Studies', teacher: 'Mr. Singh', room: 'Room 104' },
                    { time: '10:15-11:15', subject: 'Science', teacher: 'Ms. Sharma', room: 'Lab 2' },
                    { time: '11:15-12:15', subject: 'Computer Science', teacher: 'Mr. Verma', room: 'Computer Lab' },
                    { time: '1:00-2:00', subject: 'Library', teacher: 'Ms. Rao', room: 'Library' }
                ],
                Wednesday: [
                    { time: '8:00-9:00', subject: 'English', teacher: 'Mr. Kumar', room: 'Room 102' },
                    { time: '9:00-10:00', subject: 'Mathematics', teacher: 'Mr. Gupta', room: 'Room 101' },
                    { time: '10:15-11:15', subject: 'Physical Education', teacher: 'Mr. Yadav', room: 'Ground' },
                    { time: '11:15-12:15', subject: 'Hindi', teacher: 'Ms. Patel', room: 'Room 103' },
                    { time: '1:00-2:00', subject: 'Art', teacher: 'Ms. Kapoor', room: 'Art Room' }
                ],
                Thursday: [
                    { time: '8:00-9:00', subject: 'Science', teacher: 'Ms. Sharma', room: 'Lab 2' },
                    { time: '9:00-10:00', subject: 'Social Studies', teacher: 'Mr. Singh', room: 'Room 104' },
                    { time: '10:15-11:15', subject: 'Mathematics', teacher: 'Mr. Gupta', room: 'Room 101' },
                    { time: '11:15-12:15', subject: 'English', teacher: 'Mr. Kumar', room: 'Room 102' },
                    { time: '1:00-2:00', subject: 'Computer Science', teacher: 'Mr. Verma', room: 'Computer Lab' }
                ],
                Friday: [
                    { time: '8:00-9:00', subject: 'English', teacher: 'Mr. Kumar', room: 'Room 102' },
                    { time: '9:00-10:00', subject: 'Mathematics', teacher: 'Mr. Gupta', room: 'Room 101' },
                    { time: '10:15-11:15', subject: 'Science', teacher: 'Ms. Sharma', room: 'Lab 2' },
                    { time: '11:15-12:15', subject: 'Hindi', teacher: 'Ms. Patel', room: 'Room 103' },
                    { time: '1:00-2:00', subject: 'Social Studies', teacher: 'Mr. Singh', room: 'Room 104' }
                ],
                Saturday: [
                    { time: '8:00-9:00', subject: 'Hindi', teacher: 'Ms. Patel', room: 'Room 103' },
                    { time: '9:00-10:00', subject: 'Social Studies', teacher: 'Mr. Singh', room: 'Room 104' },
                    { time: '10:15-11:15', subject: 'Computer Science', teacher: 'Mr. Verma', room: 'Computer Lab' },
                    { time: '11:15-12:15', subject: 'Sports', teacher: 'Mr. Yadav', room: 'Ground' }
                ]
            },
            
            teachers: {
                classTeacher: {
                    name: 'Mrs. Gupta',
                    qualification: 'M.Sc., B.Ed., Ph.D.',
                    experience: '18 years',
                    specialization: 'Mathematics & Physics',
                    email: 'gupta@school.edu',
                    phone: '+91 98765 43213',
                    officeHours: 'Mon-Fri 2:00-4:00 PM',
                    subjects: ['Mathematics', 'Physics']
                },
                subjectTeachers: [
                    { name: 'Mr. Gupta', subject: 'Mathematics', qualification: 'M.Sc. Mathematics', experience: '15 years', email: 'mgupta@school.edu' },
                    { name: 'Ms. Sharma', subject: 'Science', qualification: 'M.Sc. Physics', experience: '12 years', email: 'ssharma@school.edu' },
                    { name: 'Mr. Kumar', subject: 'English', qualification: 'M.A. English', experience: '10 years', email: 'rkumar@school.edu' },
                    { name: 'Ms. Patel', subject: 'Hindi', qualification: 'M.A. Hindi', experience: '8 years', email: 'mpatel@school.edu' },
                    { name: 'Mr. Singh', subject: 'Social Studies', qualification: 'M.A. History', experience: '14 years', email: 'ssingh@school.edu' },
                    { name: 'Mr. Verma', subject: 'Computer Science', qualification: 'M.Tech. Computer Science', experience: '7 years', email: 'averma@school.edu' },
                    { name: 'Mr. Yadav', subject: 'Physical Education', qualification: 'M.P.Ed', experience: '9 years', email: 'syadav@school.edu' },
                    { name: 'Ms. Kapoor', subject: 'Art', qualification: 'M.F.A. Painting', experience: '6 years', email: 'skapoor@school.edu' }
                ]
            },
            
            notifications: [
                {
                    id: 1,
                    title: 'Exam Reminder',
                    message: 'Mathematics test tomorrow at 10 AM in Room 101',
                    type: 'exam',
                    icon: 'fa-clipboard-list',
                    timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
                    read: false,
                    priority: 'high'
                },
                {
                    id: 2,
                    title: 'Fee Due Alert',
                    message: 'Last date for fee payment is 15th Feb 2024',
                    type: 'fee',
                    icon: 'fa-money-bill-wave',
                    timestamp: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
                    read: false,
                    priority: 'high'
                },
                {
                    id: 3,
                    title: 'New Assignment',
                    message: 'Science project submission by 20th Feb 2024',
                    type: 'assignment',
                    icon: 'fa-tasks',
                    timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
                    read: true,
                    priority: 'medium'
                },
                {
                    id: 4,
                    title: 'Achievement Unlocked',
                    message: 'Congratulations! You won the Math Olympiad',
                    type: 'achievement',
                    icon: 'fa-trophy',
                    timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
                    read: true,
                    priority: 'low'
                },
                {
                    id: 5,
                    title: 'Parent-Teacher Meeting',
                    message: 'PTM scheduled on 25th Feb 2024 at 3:00 PM',
                    type: 'meeting',
                    icon: 'fa-users',
                    timestamp: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
                    read: true,
                    priority: 'medium'
                }
            ]
        };

        // Generate daily attendance data
        function generateDailyAttendanceData() {
            const data = {};
            const today = new Date();
            for (let i = 0; i < 30; i++) {
                const date = new Date(today);
                date.setDate(today.getDate() - i);
                if (date.getDay() !== 0 && date.getDay() !== 6) { // Skip weekends
                    const dateStr = date.toISOString().split('T')[0];
                    const random = Math.random();
                    data[dateStr] = random > 0.15 ? 'present' : (random > 0.05 ? 'absent' : 'leave');
                }
            }
            return data;
        }

        // Toast System
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

        // Initialize Application
        document.addEventListener('DOMContentLoaded', function() {
            initApp();
        });

        // Initialize App
        async function initApp() {
            // Simulate loading
            await simulateLoading();
            
            // Load data
            APP_STATE.studentData = DUMMY_DATA;
            APP_STATE.notifications = DUMMY_DATA.notifications;
            
            // Initialize UI
            initUI();
            setupEventListeners();
            loadCurrentTab();
            
            // Start auto-refresh
            startAutoRefresh();
        }

        // Simulate Loading
        async function simulateLoading() {
            const progressBar = document.getElementById('loadingProgress');
            const steps = [20, 40, 60, 80, 100];
            
            for (let i = 0; i < steps.length; i++) {
                progressBar.style.width = `${steps[i]}%`;
                await new Promise(resolve => setTimeout(resolve, 300));
            }
            
            document.getElementById('loadingScreen').style.opacity = '0';
            setTimeout(() => {
                document.getElementById('loadingScreen').style.display = 'none';
                document.getElementById('mainContent').classList.remove('hidden');
            }, 500);
        }

        // Initialize UI
        function initUI() {
            updateStudentInfo();
            setupNavigation();
            updateNotifications();
            checkDarkMode();
            updateGreeting();
            updateDateTime();
        }

        // Update Student Info
        function updateStudentInfo() {
            const student = APP_STATE.studentData.student;
            
            // Update all student name elements
            document.querySelectorAll('#studentName, #userName, #mobileStudentName').forEach(el => {
                el.textContent = student.name;
            });
            
            // Update student ID elements
            document.querySelectorAll('#studentId, #mobileStudentId').forEach(el => {
                el.textContent = student.studentId;
            });
            
            // Update quick stats
            document.getElementById('quickAttendance').textContent = `${APP_STATE.studentData.attendance.percentage}%`;
            document.getElementById('quickCGPA').textContent = APP_STATE.studentData.academic.cgpa.toFixed(1);
            document.getElementById('quickFees').textContent = `₹${APP_STATE.studentData.fees.pending.toLocaleString()}`;
        }

        // Setup Navigation
        function setupNavigation() {
            const navItems = [
                { id: 'overview', icon: 'fa-home', label: 'Overview', description: 'Dashboard summary' },
                { id: 'attendance', icon: 'fa-calendar-check', label: 'Attendance', description: 'Track your presence' },
                { id: 'exams', icon: 'fa-clipboard-list', label: 'Exams', description: 'Marks & schedule' },
                { id: 'timetable', icon: 'fa-clock', label: 'Timetable', description: 'Class schedule' },
                { id: 'fees', icon: 'fa-money-bill-wave', label: 'Fees', description: 'Payments & receipts' },
                { id: 'teachers', icon: 'fa-chalkboard-teacher', label: 'Teachers', description: 'Faculty information' },
                { id: 'profile', icon: 'fa-user-circle', label: 'Profile', description: 'Complete details' },
                { id: 'analytics', icon: 'fa-chart-line', label: 'Analytics', description: 'Performance insights' }
            ];
            
            // Desktop Navigation
            const desktopNav = document.getElementById('desktopNav');
            desktopNav.innerHTML = navItems.map(item => `
                <button onclick="switchTab('${item.id}')" 
                        class="w-full text-left px-4 py-3 rounded-xl hover:bg-gradient-to-r hover:from-blue-50 hover:to-purple-50 dark:hover:from-blue-900/20 dark:hover:to-purple-900/20 hover:text-blue-600 dark:hover:text-blue-400 transition-all duration-300 flex items-center space-x-3 group ${APP_STATE.currentTab === item.id ? 'bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 text-blue-600 dark:text-blue-400' : ''}"
                        data-tab="${item.id}">
                    <div class="h-10 w-10 rounded-lg bg-gradient-to-br from-blue-100 to-purple-100 dark:from-blue-900/30 dark:to-purple-900/30 flex items-center justify-center group-hover:from-blue-200 group-hover:to-purple-200 dark:group-hover:from-blue-800 dark:group-hover:to-purple-800">
                        <i class="fas ${item.icon} text-blue-600 dark:text-blue-400"></i>
                    </div>
                    <div class="flex-1">
                        <span class="font-medium">${item.label}</span>
                        <p class="text-xs text-gray-500 dark:text-gray-400">${item.description}</p>
                    </div>
                    <i class="fas fa-chevron-right text-gray-400 dark:text-gray-600 group-hover:text-blue-600 dark:group-hover:text-blue-400"></i>
                </button>
            `).join('');
            
            // Mobile Navigation
            const mobileNav = document.getElementById('mobileNavItems');
            mobileNav.innerHTML = navItems.map(item => `
                <button onclick="switchTab('${item.id}'); closeMobileMenu();" 
                        class="w-full text-left px-4 py-3 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center space-x-3 ${APP_STATE.currentTab === item.id ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400' : ''}">
                    <div class="h-10 w-10 rounded-lg bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
                        <i class="fas ${item.icon} ${APP_STATE.currentTab === item.id ? 'text-blue-600 dark:text-blue-400' : 'text-gray-500 dark:text-gray-400'}"></i>
                    </div>
                    <div class="flex-1">
                        <span class="font-medium">${item.label}</span>
                        <p class="text-xs text-gray-500 dark:text-gray-400">${item.description}</p>
                    </div>
                </button>
            `).join('');
            
            // Bottom Navigation (Mobile - limited to 4 items)
            const bottomNav = document.getElementById('bottomNav');
            const bottomNavItems = [
                { id: 'overview', icon: 'fa-home', label: 'Home' },
                { id: 'attendance', icon: 'fa-calendar-check', label: 'Attendance' },
                { id: 'exams', icon: 'fa-clipboard-list', label: 'Exams' },
                { id: 'profile', icon: 'fa-user', label: 'Profile' }
            ];
            
            bottomNav.innerHTML = bottomNavItems.map(item => `
                <button onclick="switchTab('${item.id}')" 
                        class="flex flex-col items-center space-y-1 p-2 rounded-lg ${APP_STATE.currentTab === item.id ? 'text-blue-600 dark:text-blue-400' : 'text-gray-500 dark:text-gray-400'}">
                    <i class="fas ${item.icon} text-xl"></i>
                    <span class="text-xs">${item.label}</span>
                </button>
            `).join('');
        }

        // Switch Tab
        function switchTab(tabId) {
            if (APP_STATE.currentTab === tabId) return;
            
            APP_STATE.currentTab = tabId;
            
            // Update active tab UI
            document.querySelectorAll('[data-tab]').forEach(btn => {
                btn.classList.remove('bg-gradient-to-r', 'from-blue-50', 'to-purple-50', 'dark:from-blue-900/20', 'dark:to-purple-900/20', 'text-blue-600', 'dark:text-blue-400');
            });
            
            const activeBtn = document.querySelector(`[data-tab="${tabId}"]`);
            if (activeBtn) {
                activeBtn.classList.add('bg-gradient-to-r', 'from-blue-50', 'to-purple-50', 'dark:from-blue-900/20', 'dark:to-purple-900/20', 'text-blue-600', 'dark:text-blue-400');
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
                attendance: 'Attendance',
                exams: 'Exams & Marks',
                timetable: 'Class Timetable',
                fees: 'Fee Details',
                teachers: 'Teachers',
                profile: 'My Profile',
                analytics: 'Analytics'
            };
            
            document.getElementById('currentTabTitle').textContent = tabTitles[tabId] || 'Dashboard';
            
            // Close mobile menu if open
            closeMobileMenu();
        }

        // Load Tab Content
        function loadTabContent(tabId) {
            switch(tabId) {
                case 'overview':
                    loadOverviewTab();
                    break;
                case 'attendance':
                    loadAttendanceTab();
                    break;
                case 'exams':
                    loadExamsTab();
                    break;
                case 'timetable':
                    loadTimetableTab();
                    break;
                case 'fees':
                    loadFeesTab();
                    break;
                case 'teachers':
                    loadTeachersTab();
                    break;
                case 'profile':
                    loadProfileTab();
                    break;
                case 'analytics':
                    loadAnalyticsTab();
                    break;
            }
        }

        // Load Current Tab
        function loadCurrentTab() {
            loadTabContent(APP_STATE.currentTab);
        }

        // Load Overview Tab
        function loadOverviewTab() {
            const tabContent = document.getElementById('overviewTab');
            const data = APP_STATE.studentData;
            
            const today = new Date().toLocaleDateString('en-US', { weekday: 'long' });
            const todaySchedule = data.timetable[today] || [];
            
            const upcomingExams = data.academic.upcomingExams.slice(0, 3);
            
            tabContent.innerHTML = `
                <!-- Welcome Banner -->
                <div class="bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl shadow-lg p-6 mb-6 text-white">
                    <div class="flex flex-col md:flex-row items-center justify-between">
                        <div>
                            <h1 class="text-2xl font-bold mb-2" id="welcomeMessage">Welcome back, ${data.student.name.split(' ')[0]}!</h1>
                            <p class="opacity-90">Here's your academic summary for today</p>
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
                    <!-- Attendance Card -->
                    <div class="bg-white dark:bg-gray-800 rounded-xl shadow p-6 card-hover">
                        <div class="flex items-center justify-between mb-4">
                            <div>
                                <p class="text-sm text-gray-600 dark:text-gray-400">Attendance</p>
                                <p class="text-3xl font-bold text-green-600">${data.attendance.percentage}%</p>
                            </div>
                            <div class="h-12 w-12 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                                <i class="fas fa-calendar-check text-green-600 dark:text-green-400 text-xl"></i>
                            </div>
                        </div>
                        <div class="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                            <div class="h-full bg-gradient-to-r from-green-400 to-emerald-400 rounded-full" style="width: ${data.attendance.percentage}%"></div>
                        </div>
                    </div>

                    <!-- Academic Score Card -->
                    <div class="bg-white dark:bg-gray-800 rounded-xl shadow p-6 card-hover">
                        <div class="flex items-center justify-between mb-4">
                            <div>
                                <p class="text-sm text-gray-600 dark:text-gray-400">Academic Score</p>
                                <p class="text-3xl font-bold text-blue-600">${data.academic.overallPercentage}%</p>
                            </div>
                            <div class="h-12 w-12 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                                <i class="fas fa-chart-line text-blue-600 dark:text-blue-400 text-xl"></i>
                            </div>
                        </div>
                        <div class="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                            <div class="h-full bg-gradient-to-r from-blue-400 to-cyan-400 rounded-full" style="width: ${data.academic.overallPercentage}%"></div>
                        </div>
                    </div>

                    <!-- Pending Fees Card -->
                    <div class="bg-white dark:bg-gray-800 rounded-xl shadow p-6 card-hover">
                        <div class="flex items-center justify-between mb-4">
                            <div>
                                <p class="text-sm text-gray-600 dark:text-gray-400">Pending Fees</p>
                                <p class="text-3xl font-bold text-red-600">₹${data.fees.pending.toLocaleString()}</p>
                            </div>
                            <div class="h-12 w-12 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                                <i class="fas fa-rupee-sign text-red-600 dark:text-red-400 text-xl"></i>
                            </div>
                        </div>
                        <div class="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                            <div class="h-full bg-gradient-to-r from-red-400 to-rose-400 rounded-full" style="width: ${((data.fees.total - data.fees.pending) / data.fees.total * 100)}%"></div>
                        </div>
                    </div>

                    <!-- Upcoming Exams Card -->
                    <div class="bg-white dark:bg-gray-800 rounded-xl shadow p-6 card-hover">
                        <div class="flex items-center justify-between mb-4">
                            <div>
                                <p class="text-sm text-gray-600 dark:text-gray-400">Upcoming Exams</p>
                                <p class="text-3xl font-bold text-purple-600">${upcomingExams.length}</p>
                            </div>
                            <div class="h-12 w-12 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                                <i class="fas fa-clipboard-list text-purple-600 dark:text-purple-400 text-xl"></i>
                            </div>
                        </div>
                        <div class="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                            <div class="h-full bg-gradient-to-r from-purple-400 to-pink-400 rounded-full" style="width: ${Math.min(upcomingExams.length * 33, 100)}%"></div>
                        </div>
                    </div>
                </div>

                <!-- Today's Schedule & Recent Performance -->
                <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                    <!-- Today's Schedule -->
                    <div class="bg-white dark:bg-gray-800 rounded-xl shadow p-6">
                        <h3 class="text-lg font-bold mb-4 flex items-center">
                            <i class="fas fa-calendar-day text-blue-600 mr-2"></i>
                            Today's Schedule (${today})
                        </h3>
                        <div class="space-y-3">
                            ${todaySchedule.length > 0 ? todaySchedule.map(item => `
                                <div class="flex items-center justify-between p-3 bg-gradient-to-r from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-900/10 rounded-xl">
                                    <div class="flex items-center space-x-3">
                                        <div class="h-10 w-10 bg-blue-200 dark:bg-blue-800 rounded-lg flex items-center justify-center">
                                            <i class="fas fa-book text-blue-600 dark:text-blue-400"></i>
                                        </div>
                                        <div>
                                            <h4 class="font-medium">${item.subject}</h4>
                                            <p class="text-sm text-gray-600 dark:text-gray-400">${item.teacher} • ${item.room}</p>
                                        </div>
                                    </div>
                                    <span class="font-medium">${item.time}</span>
                                </div>
                            `).join('') : '<p class="text-center text-gray-500 py-4">No classes scheduled for today</p>'}
                        </div>
                    </div>

                    <!-- Recent Performance -->
                    <div class="bg-white dark:bg-gray-800 rounded-xl shadow p-6">
                        <h3 class="text-lg font-bold mb-4 flex items-center">
                            <i class="fas fa-trophy text-yellow-600 mr-2"></i>
                            Recent Performance
                        </h3>
                        <div class="space-y-3">
                            ${data.academic.subjectPerformance.slice(0, 4).map(subject => `
                                <div class="flex items-center justify-between p-3 border dark:border-gray-700 rounded-xl">
                                    <div class="flex items-center space-x-3">
                                        <div class="h-10 w-10 ${subject.percentage >= 90 ? 'bg-green-100 dark:bg-green-900/30' : subject.percentage >= 80 ? 'bg-blue-100 dark:bg-blue-900/30' : 'bg-yellow-100 dark:bg-yellow-900/30'} rounded-lg flex items-center justify-center">
                                            <i class="fas fa-book ${subject.percentage >= 90 ? 'text-green-600 dark:text-green-400' : subject.percentage >= 80 ? 'text-blue-600 dark:text-blue-400' : 'text-yellow-600 dark:text-yellow-400'}"></i>
                                        </div>
                                        <div>
                                            <h4 class="font-medium">${subject.subject}</h4>
                                            <p class="text-sm text-gray-600 dark:text-gray-400">${subject.teacher}</p>
                                        </div>
                                    </div>
                                    <div class="text-right">
                                        <span class="font-bold text-lg">${subject.percentage}%</span>
                                        <p class="text-sm ${subject.grade === 'A+' ? 'text-green-600' : subject.grade === 'A' ? 'text-blue-600' : 'text-yellow-600'}">${subject.grade}</p>
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                </div>

                <!-- Upcoming Exams & Quick Links -->
                <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <!-- Upcoming Exams -->
                    <div class="bg-white dark:bg-gray-800 rounded-xl shadow p-6">
                        <h3 class="text-lg font-bold mb-4 flex items-center">
                            <i class="fas fa-calendar-alt text-purple-600 mr-2"></i>
                            Upcoming Exams
                        </h3>
                        <div class="space-y-3">
                            ${upcomingExams.map(exam => {
                                const daysLeft = Math.ceil((new Date(exam.date) - new Date()) / (1000 * 60 * 60 * 24));
                                return `
                                    <div class="flex items-center justify-between p-3 border dark:border-gray-700 rounded-xl">
                                        <div>
                                            <h4 class="font-medium">${exam.subject}</h4>
                                            <p class="text-sm text-gray-600 dark:text-gray-400">${new Date(exam.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })} • ${exam.time}</p>
                                        </div>
                                        <div class="text-right">
                                            <span class="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${daysLeft <= 3 ? 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200' : 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200'}">
                                                ${daysLeft === 0 ? 'Today' : daysLeft === 1 ? 'Tomorrow' : `${daysLeft} days`}
                                            </span>
                                        </div>
                                    </div>
                                `;
                            }).join('')}
                        </div>
                    </div>

                    <!-- Quick Links -->
                    <div class="bg-white dark:bg-gray-800 rounded-xl shadow p-6">
                        <h3 class="text-lg font-bold mb-4 flex items-center">
                            <i class="fas fa-bolt text-orange-600 mr-2"></i>
                            Quick Actions
                        </h3>
                        <div class="grid grid-cols-2 gap-3">
                            <button onclick="switchTab('attendance')" class="p-4 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-xl text-center hover:shadow-md transition-shadow">
                                <i class="fas fa-calendar-check text-green-600 dark:text-green-400 text-2xl mb-2"></i>
                                <p class="font-medium">View Attendance</p>
                            </button>
                            <button onclick="switchTab('fees')" class="p-4 bg-gradient-to-br from-red-50 to-rose-50 dark:from-red-900/20 dark:to-rose-900/20 rounded-xl text-center hover:shadow-md transition-shadow">
                                <i class="fas fa-money-bill-wave text-red-600 dark:text-red-400 text-2xl mb-2"></i>
                                <p class="font-medium">Pay Fees</p>
                            </button>
                            <button onclick="printReport()" class="p-4 bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20 rounded-xl text-center hover:shadow-md transition-shadow">
                                <i class="fas fa-print text-blue-600 dark:text-blue-400 text-2xl mb-2"></i>
                                <p class="font-medium">Print Report</p>
                            </button>
                            <button onclick="downloadData()" class="p-4 bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-xl text-center hover:shadow-md transition-shadow">
                                <i class="fas fa-download text-purple-600 dark:text-purple-400 text-2xl mb-2"></i>
                                <p class="font-medium">Export Data</p>
                            </button>
                        </div>
                    </div>
                </div>
            `;
            
            // Initialize charts if they exist
            initCharts();
        }

        // Load Attendance Tab
        function loadAttendanceTab() {
            const tabContent = document.getElementById('attendanceTab');
            const data = APP_STATE.studentData.attendance;
            
            tabContent.innerHTML = `
                <div class="animate-fade-in">
                    <!-- Header -->
                    <div class="mb-6">
                        <h2 class="text-2xl font-bold text-gray-800 dark:text-white mb-2">Attendance Record</h2>
                        <p class="text-gray-600 dark:text-gray-400">Track your attendance and view detailed reports</p>
                    </div>

                    <!-- Overall Stats -->
                    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                        <div class="bg-white dark:bg-gray-800 rounded-xl shadow p-6">
                            <div class="text-center">
                                <div class="relative inline-flex items-center justify-center mb-4">
                                    <svg class="progress-ring" width="120" height="120">
                                        <circle cx="60" cy="60" r="54" stroke="#e5e7eb" stroke-width="8" fill="none"></circle>
                                        <circle id="attendanceCircle" cx="60" cy="60" r="54" stroke="#10b981" stroke-width="8" fill="none" stroke-dasharray="339.292" stroke-dashoffset="${339.292 * (1 - data.percentage / 100)}" stroke-linecap="round"></circle>
                                    </svg>
                                    <div class="absolute">
                                        <p class="text-3xl font-bold text-gray-800 dark:text-white">${data.percentage}%</p>
                                    </div>
                                </div>
                                <p class="text-sm text-gray-600 dark:text-gray-400">Overall Attendance</p>
                            </div>
                        </div>

                        <div class="bg-white dark:bg-gray-800 rounded-xl shadow p-6">
                            <div class="flex items-center justify-between mb-2">
                                <span class="text-gray-600 dark:text-gray-400">Total Days</span>
                                <i class="fas fa-calendar text-gray-400"></i>
                            </div>
                            <p class="text-2xl font-bold text-gray-800 dark:text-white">${data.totalDays}</p>
                        </div>

                        <div class="bg-white dark:bg-gray-800 rounded-xl shadow p-6">
                            <div class="flex items-center justify-between mb-2">
                                <span class="text-gray-600 dark:text-gray-400">Present</span>
                                <i class="fas fa-check-circle text-green-500"></i>
                            </div>
                            <p class="text-2xl font-bold text-green-600">${data.present}</p>
                        </div>

                        <div class="bg-white dark:bg-gray-800 rounded-xl shadow p-6">
                            <div class="flex items-center justify-between mb-2">
                                <span class="text-gray-600 dark:text-gray-400">Absent</span>
                                <i class="fas fa-times-circle text-red-500"></i>
                            </div>
                            <p class="text-2xl font-bold text-red-600">${data.absent}</p>
                        </div>
                    </div>

                    <!-- Monthly Attendance Chart -->
                    <div class="bg-white dark:bg-gray-800 rounded-xl shadow p-6 mb-6">
                        <h3 class="text-lg font-bold mb-4">Monthly Attendance Trend</h3>
                        <div class="h-64">
                            <canvas id="attendanceChart"></canvas>
                        </div>
                    </div>

                    <!-- Daily Attendance Calendar -->
                    <div class="bg-white dark:bg-gray-800 rounded-xl shadow p-6">
                        <div class="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
                            <h3 class="text-lg font-bold mb-4 md:mb-0">Daily Attendance (Last 30 Days)</h3>
                            <div class="flex items-center space-x-2">
                                <button onclick="prevMonth()" class="p-2 border rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700">
                                    <i class="fas fa-chevron-left"></i>
                                </button>
                                <span class="px-4 py-2 font-medium" id="currentMonth">${new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</span>
                                <button onclick="nextMonth()" class="p-2 border rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700">
                                    <i class="fas fa-chevron-right"></i>
                                </button>
                            </div>
                        </div>

                        <!-- Calendar Grid -->
                        <div class="mb-6">
                            <div class="grid grid-cols-7 gap-2 mb-2">
                                <div class="text-center text-sm font-medium text-gray-600 dark:text-gray-400">Sun</div>
                                <div class="text-center text-sm font-medium text-gray-600 dark:text-gray-400">Mon</div>
                                <div class="text-center text-sm font-medium text-gray-600 dark:text-gray-400">Tue</div>
                                <div class="text-center text-sm font-medium text-gray-600 dark:text-gray-400">Wed</div>
                                <div class="text-center text-sm font-medium text-gray-600 dark:text-gray-400">Thu</div>
                                <div class="text-center text-sm font-medium text-gray-600 dark:text-gray-400">Fri</div>
                                <div class="text-center text-sm font-medium text-gray-600 dark:text-gray-400">Sat</div>
                            </div>
                            <div class="grid grid-cols-7 gap-2" id="attendanceCalendar">
                                <!-- Calendar will be generated here -->
                            </div>
                        </div>

                        <!-- Legend -->
                        <div class="flex flex-wrap gap-4 text-sm">
                            <div class="flex items-center">
                                <div class="h-4 w-4 bg-green-500 rounded mr-2"></div>
                                <span>Present</span>
                            </div>
                            <div class="flex items-center">
                                <div class="h-4 w-4 bg-red-500 rounded mr-2"></div>
                                <span>Absent</span>
                            </div>
                            <div class="flex items-center">
                                <div class="h-4 w-4 bg-yellow-500 rounded mr-2"></div>
                                <span>Leave</span>
                            </div>
                            <div class="flex items-center">
                                <div class="h-4 w-4 bg-gray-300 dark:bg-gray-600 rounded mr-2"></div>
                                <span>No Data</span>
                            </div>
                        </div>
                    </div>

                    <!-- Attendance Summary -->
                    <div class="mt-6 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-xl shadow p-6">
                        <h3 class="text-lg font-bold mb-4">Attendance Summary</h3>
                        <div class="space-y-4">
                            <div>
                                <p class="text-sm text-gray-600 dark:text-gray-400 mb-1">Your attendance is <span class="font-bold ${data.percentage >= 75 ? 'text-green-600' : 'text-red-600'}">${data.percentage >= 75 ? 'above' : 'below'}</span> the required 75%</p>
                                <div class="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                                    <div class="h-full ${data.percentage >= 75 ? 'bg-green-500' : 'bg-red-500'} rounded-full" style="width: ${Math.min(data.percentage, 100)}%"></div>
                                </div>
                            </div>
                            <p class="text-sm text-gray-600 dark:text-gray-400">
                                <i class="fas fa-info-circle mr-1"></i>
                                ${data.percentage >= 75 ? 
                                    'Great job! You meet the attendance requirement.' : 
                                    'You need to improve your attendance to meet the 75% requirement.'
                                }
                            </p>
                        </div>
                    </div>
                </div>
            `;
            
            // Generate calendar
            generateAttendanceCalendar();
            
            // Initialize attendance chart
            initAttendanceChart();
        }

        // Generate Attendance Calendar
        function generateAttendanceCalendar() {
            const calendar = document.getElementById('attendanceCalendar');
            if (!calendar) return;
            
            const today = new Date();
            const year = today.getFullYear();
            const month = today.getMonth();
            const firstDay = new Date(year, month, 1).getDay();
            const daysInMonth = new Date(year, month + 1, 0).getDate();
            
            calendar.innerHTML = '';
            
            // Empty cells for days before month starts
            for (let i = 0; i < firstDay; i++) {
                calendar.innerHTML += '<div class="attendance-day"></div>';
            }
            
            // Days of the month
            for (let day = 1; day <= daysInMonth; day++) {
                const date = new Date(year, month, day);
                const dateStr = date.toISOString().split('T')[0];
                const status = APP_STATE.studentData.attendance.dailyData[dateStr];
                const isToday = date.toDateString() === today.toDateString();
                const isWeekend = date.getDay() === 0 || date.getDay() === 6;
                const isFuture = date > today;
                
                let bgClass = 'bg-gray-100 dark:bg-gray-700';
                let textClass = 'text-gray-800 dark:text-gray-300';
                
                if (isToday) {
                    bgClass = 'bg-blue-500';
                    textClass = 'text-white';
                } else if (status === 'present') {
                    bgClass = 'bg-green-500';
                    textClass = 'text-white';
                } else if (status === 'absent') {
                    bgClass = 'bg-red-500';
                    textClass = 'text-white';
                } else if (status === 'leave') {
                    bgClass = 'bg-yellow-500';
                    textClass = 'text-white';
                } else if (isWeekend) {
                    bgClass = 'bg-gray-200 dark:bg-gray-600';
                    textClass = 'text-gray-500 dark:text-gray-400';
                } else if (isFuture) {
                    bgClass = 'bg-gray-50 dark:bg-gray-800';
                    textClass = 'text-gray-400 dark:text-gray-500';
                }
                
                calendar.innerHTML += `
                    <div class="attendance-day ${bgClass} ${textClass} ${isToday ? 'ring-2 ring-blue-300' : ''}" 
                         title="${date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}">
                        ${day}
                    </div>
                `;
            }
        }

        // Load Exams Tab
        function loadExamsTab() {
            const tabContent = document.getElementById('examsTab');
            const data = APP_STATE.studentData.academic;
            
            tabContent.innerHTML = `
                <div class="animate-fade-in">
                    <!-- Header -->
                    <div class="mb-6">
                        <h2 class="text-2xl font-bold text-gray-800 dark:text-white mb-2">Exams & Marks</h2>
                        <p class="text-gray-600 dark:text-gray-400">View exam schedules and your performance</p>
                    </div>

                    <!-- Overall Performance -->
                    <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                        <div class="bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-xl shadow-lg p-6">
                            <p class="text-sm opacity-90">Overall Percentage</p>
                            <p class="text-3xl font-bold mt-2">${data.overallPercentage}%</p>
                        </div>
                        <div class="bg-gradient-to-br from-green-500 to-green-600 text-white rounded-xl shadow-lg p-6">
                            <p class="text-sm opacity-90">CGPA</p>
                            <p class="text-3xl font-bold mt-2">${data.cgpa.toFixed(1)}</p>
                        </div>
                        <div class="bg-gradient-to-br from-purple-500 to-purple-600 text-white rounded-xl shadow-lg p-6">
                            <p class="text-sm opacity-90">Class Rank</p>
                            <p class="text-3xl font-bold mt-2">${data.rank}/${data.totalStudents}</p>
                        </div>
                    </div>

                    <!-- Subject-wise Performance -->
                    <div class="bg-white dark:bg-gray-800 rounded-xl shadow p-6 mb-6">
                        <h3 class="text-lg font-bold mb-4">Subject-wise Performance</h3>
                        <div class="overflow-x-auto">
                            <table class="w-full">
                                <thead>
                                    <tr class="bg-gray-50 dark:bg-gray-700">
                                        <th class="px-4 py-3 text-left text-sm font-semibold text-gray-600 dark:text-gray-300">Subject</th>
                                        <th class="px-4 py-3 text-left text-sm font-semibold text-gray-600 dark:text-gray-300">Marks</th>
                                        <th class="px-4 py-3 text-left text-sm font-semibold text-gray-600 dark:text-gray-300">Percentage</th>
                                        <th class="px-4 py-3 text-left text-sm font-semibold text-gray-600 dark:text-gray-300">Grade</th>
                                        <th class="px-4 py-3 text-left text-sm font-semibold text-gray-600 dark:text-gray-300">Teacher</th>
                                    </tr>
                                </thead>
                                <tbody class="divide-y divide-gray-200 dark:divide-gray-700">
                                    ${data.subjectPerformance.map(subject => `
                                        <tr class="hover:bg-gray-50 dark:hover:bg-gray-700">
                                            <td class="px-4 py-3 font-medium">${subject.subject}</td>
                                            <td class="px-4 py-3">${subject.marks}/${subject.maxMarks}</td>
                                            <td class="px-4 py-3">
                                                <div class="flex items-center">
                                                    <span class="mr-2">${subject.percentage}%</span>
                                                    <div class="flex-1 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                                                        <div class="h-full ${subject.percentage >= 90 ? 'bg-green-500' : subject.percentage >= 80 ? 'bg-blue-500' : 'bg-yellow-500'} rounded-full" style="width: ${subject.percentage}%"></div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td class="px-4 py-3">
                                                <span class="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${subject.grade === 'A+' ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200' : 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200'}">
                                                    ${subject.grade}
                                                </span>
                                            </td>
                                            <td class="px-4 py-3 text-gray-600 dark:text-gray-400">${subject.teacher}</td>
                                        </tr>
                                    `).join('')}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    <!-- Exam Results -->
                    <div class="bg-white dark:bg-gray-800 rounded-xl shadow p-6 mb-6">
                        <h3 class="text-lg font-bold mb-4">Previous Exam Results</h3>
                        <div class="space-y-6">
                            ${data.examResults.map(exam => `
                                <div class="border dark:border-gray-700 rounded-xl p-6">
                                    <div class="flex flex-col md:flex-row justify-between items-start md:items-center mb-4">
                                        <div>
                                            <h4 class="font-bold text-lg">${exam.exam}</h4>
                                            <p class="text-gray-600 dark:text-gray-400">${new Date(exam.date).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}</p>
                                        </div>
                                        <div class="mt-2 md:mt-0 text-right">
                                            <p class="text-2xl font-bold text-blue-600">${exam.percentage}%</p>
                                            <p class="text-sm text-gray-600 dark:text-gray-400">${exam.obtainedMarks}/${exam.totalMarks} marks</p>
                                            <span class="inline-flex items-center px-3 py-1 mt-2 rounded-full text-sm font-medium ${exam.grade === 'A+' ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200' : 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200'}">
                                                Grade: ${exam.grade}
                                            </span>
                                        </div>
                                    </div>
                                    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                        ${exam.subjects.map(subject => `
                                            <div class="border dark:border-gray-700 rounded-lg p-4">
                                                <div class="flex justify-between items-center mb-2">
                                                    <span class="font-medium">${subject.name}</span>
                                                    <span class="font-bold">${subject.marks}/${subject.maxMarks}</span>
                                                </div>
                                                <div class="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                                                    <div class="h-full ${subject.marks >= 90 ? 'bg-green-500' : subject.marks >= 80 ? 'bg-blue-500' : 'bg-yellow-500'} rounded-full" style="width: ${(subject.marks / subject.maxMarks) * 100}%"></div>
                                                </div>
                                            </div>
                                        `).join('')}
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                    </div>

                    <!-- Upcoming Exams -->
                    <div class="bg-white dark:bg-gray-800 rounded-xl shadow p-6">
                        <h3 class="text-lg font-bold mb-4">Upcoming Exam Schedule</h3>
                        <div class="overflow-x-auto">
                            <table class="w-full">
                                <thead>
                                    <tr class="bg-gray-50 dark:bg-gray-700">
                                        <th class="px-4 py-3 text-left text-sm font-semibold text-gray-600 dark:text-gray-300">Date</th>
                                        <th class="px-4 py-3 text-left text-sm font-semibold text-gray-600 dark:text-gray-300">Subject</th>
                                        <th class="px-4 py-3 text-left text-sm font-semibold text-gray-600 dark:text-gray-300">Time</th>
                                        <th class="px-4 py-3 text-left text-sm font-semibold text-gray-600 dark:text-gray-300">Duration</th>
                                        <th class="px-4 py-3 text-left text-sm font-semibold text-gray-600 dark:text-gray-300">Room</th>
                                        <th class="px-4 py-3 text-left text-sm font-semibold text-gray-600 dark:text-gray-300">Status</th>
                                    </tr>
                                </thead>
                                <tbody class="divide-y divide-gray-200 dark:divide-gray-700">
                                    ${data.upcomingExams.map(exam => {
                                        const daysLeft = Math.ceil((new Date(exam.date) - new Date()) / (1000 * 60 * 60 * 24));
                                        return `
                                            <tr class="hover:bg-gray-50 dark:hover:bg-gray-700">
                                                <td class="px-4 py-3">${new Date(exam.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</td>
                                                <td class="px-4 py-3 font-medium">${exam.subject}</td>
                                                <td class="px-4 py-3">${exam.time}</td>
                                                <td class="px-4 py-3">${exam.duration}</td>
                                                <td class="px-4 py-3">${exam.room}</td>
                                                <td class="px-4 py-3">
                                                    <span class="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${daysLeft <= 3 ? 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200' : daysLeft <= 7 ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200' : 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200'}">
                                                        ${daysLeft === 0 ? 'Today' : daysLeft === 1 ? 'Tomorrow' : `${daysLeft} days`}
                                                    </span>
                                                </td>
                                            </tr>
                                        `;
                                    }).join('')}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            `;
        }

        // Load Timetable Tab
        function loadTimetableTab() {
            const tabContent = document.getElementById('timetableTab');
            const timetable = APP_STATE.studentData.timetable;
            
            tabContent.innerHTML = `
                <div class="animate-fade-in">
                    <!-- Header -->
                    <div class="mb-6">
                        <h2 class="text-2xl font-bold text-gray-800 dark:text-white mb-2">Class Timetable</h2>
                        <p class="text-gray-600 dark:text-gray-400">Weekly class schedule for Class ${APP_STATE.studentData.student.class}-${APP_STATE.studentData.student.section}</p>
                    </div>

                    <!-- Today's Highlight -->
                    <div class="bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl shadow-lg p-6 text-white mb-6">
                        <div class="flex flex-col md:flex-row items-center justify-between">
                            <div>
                                <h3 class="text-xl font-bold mb-2">Today's Classes</h3>
                                <p class="opacity-90" id="todayDate">${new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}</p>
                            </div>
                            <div class="mt-4 md:mt-0">
                                <span class="text-3xl font-bold" id="todayClassCount">0</span>
                                <p class="text-sm opacity-90">Classes Today</p>
                            </div>
                        </div>
                    </div>

                    <!-- Timetable -->
                    <div class="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden">
                        <div class="overflow-x-auto">
                            <table class="w-full">
                                <thead class="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20">
                                    <tr>
                                        <th class="px-4 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">Time</th>
                                        <th class="px-4 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">Monday</th>
                                        <th class="px-4 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">Tuesday</th>
                                        <th class="px-4 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">Wednesday</th>
                                        <th class="px-4 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">Thursday</th>
                                        <th class="px-4 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">Friday</th>
                                        <th class="px-4 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">Saturday</th>
                                    </tr>
                                </thead>
                                <tbody class="divide-y divide-gray-200 dark:divide-gray-700" id="timetableBody">
                                    <!-- Timetable will be generated dynamically -->
                                </tbody>
                            </table>
                        </div>
                    </div>

                    <!-- Class Legend -->
                    <div class="mt-6 bg-white dark:bg-gray-800 rounded-xl shadow p-6">
                        <h3 class="text-lg font-bold mb-4">Subject Legend</h3>
                        <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
                            ${Object.values(timetable).flat().reduce((subjects, item) => {
                                if (!subjects.includes(item.subject)) {
                                    subjects.push(item.subject);
                                }
                                return subjects;
                            }, []).map(subject => `
                                <div class="flex items-center space-x-2">
                                    <div class="h-4 w-4 rounded bg-blue-500"></div>
                                    <span class="text-sm">${subject}</span>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                </div>
            `;
            
            // Generate timetable
            generateTimetable();
        }

        // Generate Timetable
        function generateTimetable() {
            const tbody = document.getElementById('timetableBody');
            if (!tbody) return;
            
            const timetable = APP_STATE.studentData.timetable;
            
            // Get all unique time slots
            const timeSlots = [...new Set(Object.values(timetable).flat().map(item => item.time))];
            timeSlots.sort((a, b) => {
                const timeA = parseInt(a.split(':')[0]);
                const timeB = parseInt(b.split(':')[0]);
                return timeA - timeB;
            });
            
            tbody.innerHTML = timeSlots.map(timeSlot => `
                <tr class="hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td class="px-4 py-3 font-medium border-r dark:border-gray-700">${timeSlot}</td>
                    ${['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].map(day => {
                        const classItem = timetable[day]?.find(item => item.time === timeSlot);
                        if (!classItem) return '<td class="px-4 py-3 text-center text-gray-400">-</td>';
                        
                        return `
                            <td class="px-4 py-3">
                                <div class="font-medium">${classItem.subject}</div>
                                <div class="text-sm text-gray-600 dark:text-gray-400">${classItem.teacher}</div>
                                <div class="text-xs text-gray-500">${classItem.room}</div>
                            </td>
                        `;
                    }).join('')}
                </tr>
            `).join('');
            
            // Update today's class count
            const today = new Date().toLocaleDateString('en-US', { weekday: 'long' });
            const todayClasses = timetable[today] || [];
            document.getElementById('todayClassCount').textContent = todayClasses.length;
        }

        // Load Fees Tab
        function loadFeesTab() {
            const tabContent = document.getElementById('feesTab');
            const data = APP_STATE.studentData.fees;
            
            const dueDate = new Date(data.dueDate);
            const today = new Date();
            const daysUntilDue = Math.ceil((dueDate - today) / (1000 * 60 * 60 * 24));
            
            tabContent.innerHTML = `
                <div class="animate-fade-in">
                    <!-- Header -->
                    <div class="mb-6">
                        <h2 class="text-2xl font-bold text-gray-800 dark:text-white mb-2">Fee Details</h2>
                        <p class="text-gray-600 dark:text-gray-400">View and manage your fee payments</p>
                    </div>

                    <!-- Fee Summary -->
                    <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                        <div class="bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-xl shadow-lg p-6">
                            <p class="text-sm opacity-90">Total Annual Fees</p>
                            <p class="text-3xl font-bold mt-2">₹${data.total.toLocaleString()}</p>
                        </div>
                        <div class="bg-gradient-to-br from-green-500 to-green-600 text-white rounded-xl shadow-lg p-6">
                            <p class="text-sm opacity-90">Paid Amount</p>
                            <p class="text-3xl font-bold mt-2">₹${data.paid.toLocaleString()}</p>
                        </div>
                        <div class="bg-gradient-to-br ${daysUntilDue <= 7 ? 'from-red-500 to-red-600' : 'from-yellow-500 to-yellow-600'} text-white rounded-xl shadow-lg p-6">
                            <p class="text-sm opacity-90">Pending Amount</p>
                            <p class="text-3xl font-bold mt-2">₹${data.pending.toLocaleString()}</p>
                            <p class="text-sm mt-2 opacity-90">Due: ${dueDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</p>
                        </div>
                    </div>

                    <!-- Fee Breakdown -->
                    <div class="bg-white dark:bg-gray-800 rounded-xl shadow p-6 mb-6">
                        <h3 class="text-lg font-bold mb-4">Fee Breakdown</h3>
                        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            <div class="border dark:border-gray-700 rounded-lg p-4">
                                <div class="flex justify-between items-center mb-2">
                                    <span class="text-gray-600 dark:text-gray-400">Tuition Fees</span>
                                    <i class="fas fa-graduation-cap text-blue-500"></i>
                                </div>
                                <p class="text-2xl font-bold">₹${data.breakdown.tuition.toLocaleString()}</p>
                            </div>
                            <div class="border dark:border-gray-700 rounded-lg p-4">
                                <div class="flex justify-between items-center mb-2">
                                    <span class="text-gray-600 dark:text-gray-400">Admission Fees</span>
                                    <i class="fas fa-sign-in-alt text-purple-500"></i>
                                </div>
                                <p class="text-2xl font-bold">₹${data.breakdown.admission.toLocaleString()}</p>
                            </div>
                            <div class="border dark:border-gray-700 rounded-lg p-4">
                                <div class="flex justify-between items-center mb-2">
                                    <span class="text-gray-600 dark:text-gray-400">Uniform</span>
                                    <i class="fas fa-tshirt text-green-500"></i>
                                </div>
                                <p class="text-2xl font-bold">₹${data.breakdown.uniform.toLocaleString()}</p>
                            </div>
                            <div class="border dark:border-gray-700 rounded-lg p-4">
                                <div class="flex justify-between items-center mb-2">
                                    <span class="text-gray-600 dark:text-gray-400">Books & Stationery</span>
                                    <i class="fas fa-book text-yellow-500"></i>
                                </div>
                                <p class="text-2xl font-bold">₹${data.breakdown.books.toLocaleString()}</p>
                            </div>
                            <div class="border dark:border-gray-700 rounded-lg p-4">
                                <div class="flex justify-between items-center mb-2">
                                    <span class="text-gray-600 dark:text-gray-400">Sports</span>
                                    <i class="fas fa-running text-red-500"></i>
                                </div>
                                <p class="text-2xl font-bold">₹${data.breakdown.sports.toLocaleString()}</p>
                            </div>
                            <div class="border dark:border-gray-700 rounded-lg p-4">
                                <div class="flex justify-between items-center mb-2">
                                    <span class="text-gray-600 dark:text-gray-400">Activities</span>
                                    <i class="fas fa-palette text-pink-500"></i>
                                </div>
                                <p class="text-2xl font-bold">₹${data.breakdown.activities.toLocaleString()}</p>
                            </div>
                        </div>
                    </div>

                    <!-- Installment Schedule -->
                    <div class="bg-white dark:bg-gray-800 rounded-xl shadow p-6 mb-6">
                        <h3 class="text-lg font-bold mb-4">Installment Schedule</h3>
                        <div class="space-y-3">
                            ${data.installments.map(installment => {
                                const dueDate = new Date(installment.dueDate);
                                const isOverdue = dueDate < today && installment.status === 'pending';
                                const isDueSoon = dueDate > today && (dueDate - today) / (1000 * 60 * 60 * 24) <= 7;
                                
                                return `
                                    <div class="flex items-center justify-between p-3 border dark:border-gray-700 rounded-lg ${installment.status === 'paid' ? 'bg-green-50 dark:bg-green-900/20' : isOverdue ? 'bg-red-50 dark:bg-red-900/20' : isDueSoon ? 'bg-yellow-50 dark:bg-yellow-900/20' : 'bg-gray-50 dark:bg-gray-700'}">
                                        <div class="flex items-center space-x-3">
                                            <div class="h-10 w-10 rounded-lg ${installment.status === 'paid' ? 'bg-green-100 dark:bg-green-800' : 'bg-gray-100 dark:bg-gray-600'} flex items-center justify-center">
                                                <i class="fas fa-${installment.status === 'paid' ? 'check-circle' : 'clock'} ${installment.status === 'paid' ? 'text-green-600 dark:text-green-400' : 'text-gray-600 dark:text-gray-400'}"></i>
                                            </div>
                                            <div>
                                                <h4 class="font-medium">Installment ${installment.number}</h4>
                                                <p class="text-sm text-gray-600 dark:text-gray-400">Due: ${dueDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</p>
                                                ${installment.paidDate ? `<p class="text-xs text-green-600 dark:text-green-400">Paid: ${new Date(installment.paidDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</p>` : ''}
                                            </div>
                                        </div>
                                        <div class="text-right">
                                            <p class="font-bold">₹${installment.amount.toLocaleString()}</p>
                                            <span class="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${installment.status === 'paid' ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200' : isOverdue ? 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200' : 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200'}">
                                                ${installment.status === 'paid' ? 'Paid' : isOverdue ? 'Overdue' : 'Pending'}
                                            </span>
                                        </div>
                                    </div>
                                `;
                            }).join('')}
                        </div>
                    </div>

                    <!-- Payment History -->
                    <div class="bg-white dark:bg-gray-800 rounded-xl shadow p-6">
                        <h3 class="text-lg font-bold mb-4">Payment History</h3>
                        <div class="overflow-x-auto">
                            <table class="w-full">
                                <thead>
                                    <tr class="bg-gray-50 dark:bg-gray-700">
                                        <th class="px-4 py-3 text-left text-sm font-semibold text-gray-600 dark:text-gray-300">Date</th>
                                        <th class="px-4 py-3 text-left text-sm font-semibold text-gray-600 dark:text-gray-300">Amount</th>
                                        <th class="px-4 py-3 text-left text-sm font-semibold text-gray-600 dark:text-gray-300">Mode</th>
                                        <th class="px-4 py-3 text-left text-sm font-semibold text-gray-600 dark:text-gray-300">Receipt No</th>
                                        <th class="px-4 py-3 text-left text-sm font-semibold text-gray-600 dark:text-gray-300">Status</th>
                                        <th class="px-4 py-3 text-left text-sm font-semibold text-gray-600 dark:text-gray-300">Action</th>
                                    </tr>
                                </thead>
                                <tbody class="divide-y divide-gray-200 dark:divide-gray-700">
                                    ${data.transactions.map(transaction => `
                                        <tr class="hover:bg-gray-50 dark:hover:bg-gray-700">
                                            <td class="px-4 py-3">${new Date(transaction.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</td>
                                            <td class="px-4 py-3 font-bold">₹${transaction.amount.toLocaleString()}</td>
                                            <td class="px-4 py-3">${transaction.mode}</td>
                                            <td class="px-4 py-3">${transaction.receiptNo}</td>
                                            <td class="px-4 py-3">
                                                <span class="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200">
                                                    ${transaction.status}
                                                </span>
                                            </td>
                                            <td class="px-4 py-3">
                                                <button onclick="downloadReceipt('${transaction.receiptNo}')" class="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300">
                                                    <i class="fas fa-download"></i> Download
                                                </button>
                                            </td>
                                        </tr>
                                    `).join('')}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            `;
        }

        // Load Teachers Tab
        function loadTeachersTab() {
            const tabContent = document.getElementById('teachersTab');
            const teachers = APP_STATE.studentData.teachers;
            
            tabContent.innerHTML = `
                <div class="animate-fade-in">
                    <!-- Header -->
                    <div class="mb-6">
                        <h2 class="text-2xl font-bold text-gray-800 dark:text-white mb-2">Faculty Information</h2>
                        <p class="text-gray-600 dark:text-gray-400">Meet your class teacher and subject teachers</p>
                    </div>

                    <!-- Class Teacher -->
                    <div class="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-xl shadow-lg p-6 mb-6">
                        <h3 class="text-lg font-bold mb-4 flex items-center">
                            <i class="fas fa-user-tie text-blue-600 mr-2"></i>
                            Class Teacher
                        </h3>
                        <div class="flex flex-col md:flex-row items-center md:items-start space-y-4 md:space-y-0 md:space-x-6">
                            <div class="h-24 w-24 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center">
                                <i class="fas fa-chalkboard-teacher text-3xl text-white"></i>
                            </div>
                            <div class="flex-1">
                                <h4 class="text-xl font-bold mb-2">${teachers.classTeacher.name}</h4>
                                <p class="text-gray-600 dark:text-gray-400 mb-3">Class Teacher • ${teachers.classTeacher.qualification}</p>
                                <div class="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                                    <div class="flex items-center">
                                        <i class="fas fa-briefcase text-gray-400 mr-2"></i>
                                        <span>${teachers.classTeacher.experience} experience</span>
                                    </div>
                                    <div class="flex items-center">
                                        <i class="fas fa-book text-gray-400 mr-2"></i>
                                        <span>${teachers.classTeacher.specialization}</span>
                                    </div>
                                    <div class="flex items-center">
                                        <i class="fas fa-envelope text-gray-400 mr-2"></i>
                                        <span>${teachers.classTeacher.email}</span>
                                    </div>
                                    <div class="flex items-center">
                                        <i class="fas fa-phone text-gray-400 mr-2"></i>
                                        <span>${teachers.classTeacher.phone}</span>
                                    </div>
                                    <div class="md:col-span-2 flex items-center">
                                        <i class="fas fa-clock text-gray-400 mr-2"></i>
                                        <span>Office Hours: ${teachers.classTeacher.officeHours}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Subject Teachers -->
                    <div class="bg-white dark:bg-gray-800 rounded-xl shadow p-6">
                        <h3 class="text-lg font-bold mb-4">Subject Teachers</h3>
                        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            ${teachers.subjectTeachers.map(teacher => `
                                <div class="border dark:border-gray-700 rounded-xl p-4 hover:shadow-md transition-shadow">
                                    <div class="flex items-start space-x-3">
                                        <div class="h-12 w-12 rounded-full bg-gradient-to-br from-blue-100 to-purple-100 dark:from-blue-900/30 dark:to-purple-900/30 flex items-center justify-center">
                                            <i class="fas fa-chalkboard-teacher text-blue-600 dark:text-blue-400"></i>
                                        </div>
                                        <div class="flex-1">
                                            <h4 class="font-bold">${teacher.name}</h4>
                                            <p class="text-sm text-blue-600 dark:text-blue-400 mb-1">${teacher.subject}</p>
                                            <p class="text-xs text-gray-600 dark:text-gray-400">${teacher.qualification}</p>
                                            <p class="text-xs text-gray-600 dark:text-gray-400">${teacher.experience} experience</p>
                                            <p class="text-xs text-gray-600 dark:text-gray-400 mt-1">
                                                <i class="fas fa-envelope"></i> ${teacher.email}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                </div>
            `;
        }

        // Load Profile Tab
        function loadProfileTab() {
            const tabContent = document.getElementById('profileTab');
            const student = APP_STATE.studentData.student;
            const today = new Date();
            const birthDate = new Date(student.dob);
            const age = today.getFullYear() - birthDate.getFullYear();
            
            tabContent.innerHTML = `
                <div class="animate-fade-in">
                    <!-- Header -->
                    <div class="mb-6">
                        <h2 class="text-2xl font-bold text-gray-800 dark:text-white mb-2">My Profile</h2>
                        <p class="text-gray-600 dark:text-gray-400">Complete student information and details</p>
                    </div>

                    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        <!-- Profile Card -->
                        <div class="lg:col-span-1">
                            <div class="bg-white dark:bg-gray-800 rounded-xl shadow p-6 text-center">
                                <div class="h-32 w-32 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 p-1 mx-auto mb-4">
                                    <div class="h-full w-full bg-white dark:bg-gray-800 rounded-full flex items-center justify-center">
                                        <i class="fas fa-user text-5xl gradient-text"></i>
                                    </div>
                                </div>
                                <h3 class="text-xl font-bold mb-1">${student.name}</h3>
                                <p class="text-gray-600 dark:text-gray-400 mb-2">${student.studentId}</p>
                                <div class="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200 mb-4">
                                    <i class="fas fa-check-circle mr-1"></i>
                                    Active Student
                                </div>
                                
                                <div class="space-y-3 text-sm text-left">
                                    <div class="flex justify-between">
                                        <span class="text-gray-600 dark:text-gray-400">Roll Number:</span>
                                        <span class="font-medium">${student.rollNumber}</span>
                                    </div>
                                    <div class="flex justify-between">
                                        <span class="text-gray-600 dark:text-gray-400">Class:</span>
                                        <span class="font-medium">${student.class}-${student.section}</span>
                                    </div>
                                    <div class="flex justify-between">
                                        <span class="text-gray-600 dark:text-gray-400">Academic Year:</span>
                                        <span class="font-medium">${student.academicYear}</span>
                                    </div>
                                    <div class="flex justify-between">
                                        <span class="text-gray-600 dark:text-gray-400">Class Teacher:</span>
                                        <span class="font-medium">${student.classTeacher}</span>
                                    </div>
                                </div>
                            </div>

                            <!-- Quick Contacts -->
                            <div class="bg-white dark:bg-gray-800 rounded-xl shadow p-6 mt-6">
                                <h4 class="font-bold mb-3">Quick Contacts</h4>
                                <div class="space-y-3">
                                    <div class="flex items-center space-x-3">
                                        <div class="h-10 w-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                                            <i class="fas fa-phone text-blue-600 dark:text-blue-400"></i>
                                        </div>
                                        <div>
                                            <p class="font-medium">Student Contact</p>
                                            <p class="text-sm text-gray-600 dark:text-gray-400">${student.phone}</p>
                                        </div>
                                    </div>
                                    <div class="flex items-center space-x-3">
                                        <div class="h-10 w-10 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                                            <i class="fas fa-user-friends text-green-600 dark:text-green-400"></i>
                                        </div>
                                        <div>
                                            <p class="font-medium">Parent Contact</p>
                                            <p class="text-sm text-gray-600 dark:text-gray-400">${student.parentContact}</p>
                                        </div>
                                    </div>
                                    <div class="flex items-center space-x-3">
                                        <div class="h-10 w-10 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                                            <i class="fas fa-ambulance text-red-600 dark:text-red-400"></i>
                                        </div>
                                        <div>
                                            <p class="font-medium">Emergency Contact</p>
                                            <p class="text-sm text-gray-600 dark:text-gray-400">${student.emergencyContact}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <!-- Detailed Information -->
                        <div class="lg:col-span-2">
                            <div class="space-y-6">
                                <!-- Personal Information -->
                                <div class="bg-white dark:bg-gray-800 rounded-xl shadow p-6">
                                    <h4 class="text-lg font-bold mb-4">Personal Information</h4>
                                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <label class="block text-sm text-gray-600 dark:text-gray-400 mb-1">Date of Birth</label>
                                            <p class="font-medium">${birthDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</p>
                                        </div>
                                        <div>
                                            <label class="block text-sm text-gray-600 dark:text-gray-400 mb-1">Age</label>
                                            <p class="font-medium">${age} years</p>
                                        </div>
                                        <div>
                                            <label class="block text-sm text-gray-600 dark:text-gray-400 mb-1">Gender</label>
                                            <p class="font-medium">${student.gender}</p>
                                        </div>
                                        <div>
                                            <label class="block text-sm text-gray-600 dark:text-gray-400 mb-1">Blood Group</label>
                                            <p class="font-medium">${student.bloodGroup}</p>
                                        </div>
                                        <div>
                                            <label class="block text-sm text-gray-600 dark:text-gray-400 mb-1">Caste Category</label>
                                            <p class="font-medium">${student.casteCategory}</p>
                                        </div>
                                        <div>
                                            <label class="block text-sm text-gray-600 dark:text-gray-400 mb-1">Aadhar Number</label>
                                            <p class="font-medium">${student.aadharNumber || 'Not Provided'}</p>
                                        </div>
                                        <div class="md:col-span-2">
                                            <label class="block text-sm text-gray-600 dark:text-gray-400 mb-1">Address</label>
                                            <p class="font-medium">${student.address}</p>
                                        </div>
                                    </div>
                                </div>

                                <!-- Parent Information -->
                                <div class="bg-white dark:bg-gray-800 rounded-xl shadow p-6">
                                    <h4 class="text-lg font-bold mb-4">Parent/Guardian Information</h4>
                                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <label class="block text-sm text-gray-600 dark:text-gray-400 mb-1">Father's Name</label>
                                            <p class="font-medium">${student.fatherName}</p>
                                        </div>
                                        <div>
                                            <label class="block text-sm text-gray-600 dark:text-gray-400 mb-1">Mother's Name</label>
                                            <p class="font-medium">${student.motherName}</p>
                                        </div>
                                        <div>
                                            <label class="block text-sm text-gray-600 dark:text-gray-400 mb-1">Contact Number</label>
                                            <p class="font-medium">${student.parentContact}</p>
                                        </div>
                                        <div>
                                            <label class="block text-sm text-gray-600 dark:text-gray-400 mb-1">Email</label>
                                            <p class="font-medium">${student.email}</p>
                                        </div>
                                        <div class="md:col-span-2">
                                            <label class="block text-sm text-gray-600 dark:text-gray-400 mb-1">Emergency Contact</label>
                                            <p class="font-medium">${student.emergencyContactName} - ${student.emergencyContact}</p>
                                        </div>
                                    </div>
                                </div>

                                <!-- Academic Information -->
                                <div class="bg-white dark:bg-gray-800 rounded-xl shadow p-6">
                                    <h4 class="text-lg font-bold mb-4">Academic Information</h4>
                                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <label class="block text-sm text-gray-600 dark:text-gray-400 mb-1">Admission Date</label>
                                            <p class="font-medium">${new Date(student.admissionDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</p>
                                        </div>
                                        <div>
                                            <label class="block text-sm text-gray-600 dark:text-gray-400 mb-1">Previous School</label>
                                            <p class="font-medium">${student.previousSchool || 'Not Available'}</p>
                                        </div>
                                        <div class="md:col-span-2">
                                            <label class="block text-sm text-gray-600 dark:text-gray-400 mb-1">Subjects</label>
                                            <p class="font-medium">${student.subjects.join(', ')}</p>
                                        </div>
                                        <div class="md:col-span-2">
                                            <label class="block text-sm text-gray-600 dark:text-gray-400 mb-1">Sports & Activities</label>
                                            <p class="font-medium">${student.sports.join(', ') || 'None'}</p>
                                        </div>
                                        <div class="md:col-span-2">
                                            <label class="block text-sm text-gray-600 dark:text-gray-400 mb-1">Achievements</label>
                                            <div class="space-y-2">
                                                ${student.achievements.map(achievement => `
                                                    <div class="flex items-center space-x-2">
                                                        <i class="fas fa-trophy text-yellow-500"></i>
                                                        <span>${achievement}</span>
                                                    </div>
                                                `).join('')}
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <!-- Medical Information -->
                                <div class="bg-white dark:bg-gray-800 rounded-xl shadow p-6">
                                    <h4 class="text-lg font-bold mb-4">Medical Information</h4>
                                    <p class="text-gray-600 dark:text-gray-400">${student.medicalInfo || 'No medical conditions reported'}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        }

        // Load Analytics Tab
        function loadAnalyticsTab() {
            const tabContent = document.getElementById('analyticsTab');
            const academic = APP_STATE.studentData.academic;
            const attendance = APP_STATE.studentData.attendance;
            
            tabContent.innerHTML = `
                <div class="animate-fade-in">
                    <!-- Header -->
                    <div class="mb-6">
                        <h2 class="text-2xl font-bold text-gray-800 dark:text-white mb-2">Performance Analytics</h2>
                        <p class="text-gray-600 dark:text-gray-400">Detailed insights into your academic performance</p>
                    </div>

                    <!-- Performance Overview -->
                    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                        <div class="bg-white dark:bg-gray-800 rounded-xl shadow p-6">
                            <div class="text-center">
                                <p class="text-sm text-gray-600 dark:text-gray-400 mb-1">Overall Performance</p>
                                <p class="text-3xl font-bold text-blue-600">${academic.overallPercentage}%</p>
                                <p class="text-sm text-gray-600 dark:text-gray-400 mt-1">Grade: ${academic.grade}</p>
                            </div>
                        </div>
                        <div class="bg-white dark:bg-gray-800 rounded-xl shadow p-6">
                            <div class="text-center">
                                <p class="text-sm text-gray-600 dark:text-gray-400 mb-1">CGPA</p>
                                <p class="text-3xl font-bold text-green-600">${academic.cgpa.toFixed(1)}</p>
                                <p class="text-sm text-gray-600 dark:text-gray-400 mt-1">Out of 10.0</p>
                            </div>
                        </div>
                        <div class="bg-white dark:bg-gray-800 rounded-xl shadow p-6">
                            <div class="text-center">
                                <p class="text-sm text-gray-600 dark:text-gray-400 mb-1">Class Rank</p>
                                <p class="text-3xl font-bold text-purple-600">${academic.rank}</p>
                                <p class="text-sm text-gray-600 dark:text-gray-400 mt-1">Out of ${academic.totalStudents}</p>
                            </div>
                        </div>
                        <div class="bg-white dark:bg-gray-800 rounded-xl shadow p-6">
                            <div class="text-center">
                                <p class="text-sm text-gray-600 dark:text-gray-400 mb-1">Attendance</p>
                                <p class="text-3xl font-bold ${attendance.percentage >= 75 ? 'text-green-600' : 'text-red-600'}">${attendance.percentage}%</p>
                                <p class="text-sm text-gray-600 dark:text-gray-400 mt-1">${attendance.percentage >= 75 ? 'Above' : 'Below'} required</p>
                            </div>
                        </div>
                    </div>

                    <!-- Subject Performance Chart -->
                    <div class="bg-white dark:bg-gray-800 rounded-xl shadow p-6 mb-6">
                        <h3 class="text-lg font-bold mb-4">Subject-wise Performance</h3>
                        <div class="h-64">
                            <canvas id="subjectPerformanceChart"></canvas>
                        </div>
                    </div>

                    <!-- Performance Comparison -->
                    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <!-- Progress Over Time -->
                        <div class="bg-white dark:bg-gray-800 rounded-xl shadow p-6">
                            <h3 class="text-lg font-bold mb-4">Progress Over Time</h3>
                            <div class="space-y-4">
                                ${academic.subjectPerformance.map(subject => {
                                    const improvement = Math.floor(Math.random() * 20) - 5; // Random improvement between -5% to +15%
                                    return `
                                        <div>
                                            <div class="flex justify-between items-center mb-1">
                                                <span class="font-medium">${subject.subject}</span>
                                                <span class="text-sm ${improvement > 0 ? 'text-green-600' : 'text-red-600'}">
                                                    ${improvement > 0 ? '+' : ''}${improvement}%
                                                </span>
                                            </div>
                                            <div class="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                                                <div class="h-full ${subject.percentage >= 90 ? 'bg-green-500' : subject.percentage >= 80 ? 'bg-blue-500' : 'bg-yellow-500'} rounded-full" style="width: ${subject.percentage}%"></div>
                                            </div>
                                        </div>
                                    `;
                                }).join('')}
                            </div>
                        </div>

                        <!-- Strength & Weakness Analysis -->
                        <div class="bg-white dark:bg-gray-800 rounded-xl shadow p-6">
                            <h3 class="text-lg font-bold mb-4">Strength & Weakness Analysis</h3>
                            <div class="space-y-6">
                                <!-- Strengths -->
                                <div>
                                    <h4 class="font-bold text-green-600 mb-2">Strengths</h4>
                                    <div class="space-y-2">
                                        ${academic.subjectPerformance
                                            .filter(s => s.percentage >= 85)
                                            .map(subject => `
                                                <div class="flex items-center justify-between p-2 bg-green-50 dark:bg-green-900/20 rounded-lg">
                                                    <span>${subject.subject}</span>
                                                    <span class="font-bold">${subject.percentage}%</span>
                                                </div>
                                            `).join('')}
                                    </div>
                                </div>
                                
                                <!-- Improvements Needed -->
                                <div>
                                    <h4 class="font-bold text-red-600 mb-2">Need Improvement</h4>
                                    <div class="space-y-2">
                                        ${academic.subjectPerformance
                                            .filter(s => s.percentage < 75)
                                            .map(subject => `
                                                <div class="flex items-center justify-between p-2 bg-red-50 dark:bg-red-900/20 rounded-lg">
                                                    <span>${subject.subject}</span>
                                                    <span class="font-bold">${subject.percentage}%</span>
                                                </div>
                                            `).join('')}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Recommendations -->
                    <div class="mt-6 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-xl shadow p-6">
                        <h3 class="text-lg font-bold mb-4">Recommendations</h3>
                        <div class="space-y-3">
                            <div class="flex items-start space-x-3">
                                <i class="fas fa-lightbulb text-yellow-500 text-xl mt-1"></i>
                                <div>
                                    <p class="font-medium">Focus on weaker subjects</p>
                                    <p class="text-sm text-gray-600 dark:text-gray-400">Allocate more study time to subjects where your score is below 75%</p>
                                </div>
                            </div>
                            <div class="flex items-start space-x-3">
                                <i class="fas fa-calendar-check text-green-500 text-xl mt-1"></i>
                                <div>
                                    <p class="font-medium">Maintain attendance</p>
                                    <p class="text-sm text-gray-600 dark:text-gray-400">Your current attendance is ${attendance.percentage}%. Keep it above 75%</p>
                                </div>
                            </div>
                            <div class="flex items-start space-x-3">
                                <i class="fas fa-trophy text-purple-500 text-xl mt-1"></i>
                                <div>
                                    <p class="font-medium">Participate in activities</p>
                                    <p class="text-sm text-gray-600 dark:text-gray-400">Consider joining clubs or competitions to enhance your profile</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            `;
            
            // Initialize analytics charts
            initAnalyticsCharts();
        }

        // Initialize Charts
        function initCharts() {
            // Initialize performance chart if it exists
            const performanceCtx = document.getElementById('performanceChart');
            if (performanceCtx) {
                new Chart(performanceCtx, {
                    type: 'line',
                    data: {
                        labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
                        datasets: [{
                            label: 'Performance',
                            data: [85, 88, 86, 90, 89, 92],
                            borderColor: '#4361ee',
                            backgroundColor: 'rgba(67, 97, 238, 0.1)',
                            fill: true,
                            tension: 0.4
                        }]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                            legend: { display: false }
                        }
                    }
                });
            }
        }

        // Initialize Attendance Chart
        function initAttendanceChart() {
            const ctx = document.getElementById('attendanceChart');
            if (!ctx) return;
            
            const data = APP_STATE.studentData.attendance.monthlyData;
            
            new Chart(ctx, {
                type: 'bar',
                data: {
                    labels: data.map(d => d.month),
                    datasets: [
                        {
                            label: 'Present',
                            data: data.map(d => d.present),
                            backgroundColor: '#10b981'
                        },
                        {
                            label: 'Absent',
                            data: data.map(d => d.absent),
                            backgroundColor: '#ef4444'
                        }
                    ]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            position: 'top',
                        }
                    },
                    scales: {
                        y: {
                            beginAtZero: true,
                            ticks: {
                                stepSize: 5
                            }
                        }
                    }
                }
            });
        }

        // Initialize Analytics Charts
        function initAnalyticsCharts() {
            const ctx = document.getElementById('subjectPerformanceChart');
            if (!ctx) return;
            
            const subjects = APP_STATE.studentData.academic.subjectPerformance;
            
            new Chart(ctx, {
                type: 'radar',
                data: {
                    labels: subjects.map(s => s.subject),
                    datasets: [{
                        label: 'Performance %',
                        data: subjects.map(s => s.percentage),
                        backgroundColor: 'rgba(67, 97, 238, 0.2)',
                        borderColor: '#4361ee',
                        pointBackgroundColor: '#4361ee'
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                        r: {
                            beginAtZero: true,
                            max: 100,
                            ticks: {
                                stepSize: 20
                            }
                        }
                    }
                }
            });
        }

        // Setup Event Listeners
        function setupEventListeners() {
            // Mobile menu
            document.getElementById('mobileMenuButton').addEventListener('click', openMobileMenu);
            document.getElementById('mobileOverlay').addEventListener('click', closeMobileMenu);
            
            // Theme toggle
            document.getElementById('themeToggle').addEventListener('click', toggleDarkMode);
            
            // User menu
            document.addEventListener('click', (e) => {
                if (!e.target.closest('#userMenu') && !e.target.closest('.relative > button')) {
                    document.getElementById('userMenu').classList.add('hidden');
                }
            });
            
            // Close notification panel when clicking outside
            document.addEventListener('click', (e) => {
                if (!e.target.closest('#notificationPanel') && !e.target.closest('.relative > button')) {
                    document.getElementById('notificationPanel').classList.add('hidden');
                }
            });
            
            // Update time every minute
            setInterval(updateDateTime, 60000);
        }

        // Update DateTime
        function updateDateTime() {
            const now = new Date();
            const dateElements = document.querySelectorAll('#currentDate');
            const timeElements = document.querySelectorAll('#currentTime');
            
            dateElements.forEach(el => {
                el.textContent = now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
            });
            
            timeElements.forEach(el => {
                el.textContent = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
            });
        }

        // Update Greeting
        function updateGreeting() {
            const hour = new Date().getHours();
            let greeting = '';
            
            if (hour < 12) greeting = 'Good Morning';
            else if (hour < 17) greeting = 'Good Afternoon';
            else greeting = 'Good Evening';
            
            document.getElementById('welcomeMessage').textContent = `${greeting}, ${APP_STATE.studentData.student.name.split(' ')[0]}!`;
        }

        // Open Mobile Menu
        function openMobileMenu() {
            document.getElementById('mobileMenu').classList.add('active');
            document.getElementById('mobileOverlay').classList.add('active');
            document.body.style.overflow = 'hidden';
        }

        // Close Mobile Menu
        function closeMobileMenu() {
            document.getElementById('mobileMenu').classList.remove('active');
            document.getElementById('mobileOverlay').classList.remove('active');
            document.body.style.overflow = '';
        }

        // Toggle Dark Mode
        function toggleDarkMode() {
            APP_STATE.darkMode = !APP_STATE.darkMode;
            if (APP_STATE.darkMode) {
                document.documentElement.classList.add('dark');
                document.getElementById('themeToggle').innerHTML = '<i class="fas fa-sun"></i>';
                Toast.show('Dark mode enabled', 'info');
            } else {
                document.documentElement.classList.remove('dark');
                document.getElementById('themeToggle').innerHTML = '<i class="fas fa-moon"></i>';
                Toast.show('Light mode enabled', 'info');
            }
        }

        // Check Dark Mode Preference
        function checkDarkMode() {
            const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
            const savedTheme = localStorage.getItem('theme');
            
            if (savedTheme === 'dark' || (!savedTheme && prefersDark)) {
                toggleDarkMode();
            }
        }

        // Toggle User Menu
        function toggleUserMenu() {
            const menu = document.getElementById('userMenu');
            menu.classList.toggle('hidden');
        }

        // Toggle Notifications
        function toggleNotifications() {
            const panel = document.getElementById('notificationPanel');
            panel.classList.toggle('hidden');
            updateNotifications();
        }

        // Update Notifications
        function updateNotifications() {
            const list = document.getElementById('notificationsList');
            if (!list) return;
            
            const notifications = APP_STATE.notifications;
            const unreadCount = notifications.filter(n => !n.read).length;
            
            // Update badge
            const badge = document.getElementById('notificationBadge');
            badge.textContent = unreadCount;
            badge.classList.toggle('hidden', unreadCount === 0);
            
            // Update list
            list.innerHTML = notifications.map(notif => `
                <div class="p-3 border-b dark:border-gray-700 ${notif.read ? '' : 'bg-blue-50 dark:bg-blue-900/20'} hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer" onclick="viewNotification(${notif.id})">
                    <div class="flex items-start space-x-3">
                        <div class="h-10 w-10 rounded-full ${notif.type === 'exam' ? 'bg-purple-100 dark:bg-purple-900/30' : notif.type === 'fee' ? 'bg-red-100 dark:bg-red-900/30' : 'bg-blue-100 dark:bg-blue-900/30'} flex items-center justify-center">
                            <i class="fas ${notif.icon} ${notif.type === 'exam' ? 'text-purple-600 dark:text-purple-400' : notif.type === 'fee' ? 'text-red-600 dark:text-red-400' : 'text-blue-600 dark:text-blue-400'}"></i>
                        </div>
                        <div class="flex-1">
                            <div class="flex justify-between">
                                <h4 class="font-medium ${notif.read ? 'text-gray-700 dark:text-gray-300' : 'text-gray-900 dark:text-white'}">${notif.title}</h4>
                                ${!notif.read ? '<span class="h-2 w-2 bg-red-500 rounded-full"></span>' : ''}
                            </div>
                            <p class="text-sm text-gray-600 dark:text-gray-400">${notif.message}</p>
                            <p class="text-xs text-gray-500 dark:text-gray-500 mt-1">${formatTimeAgo(new Date(notif.timestamp))}</p>
                        </div>
                    </div>
                </div>
            `).join('');
        }

        // View Notification
        function viewNotification(id) {
            const notification = APP_STATE.notifications.find(n => n.id === id);
            if (notification && !notification.read) {
                notification.read = true;
                updateNotifications();
                Toast.show(`Notification marked as read: ${notification.title}`, 'success');
            }
        }

        // Mark All as Read
        function markAllAsRead() {
            APP_STATE.notifications.forEach(n => n.read = true);
            updateNotifications();
            Toast.show('All notifications marked as read', 'success');
        }

        // Format Time Ago
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
            
            return Math.floor(seconds) + ' seconds ago';
        }

        // Download Receipt
        function downloadReceipt(receiptNo) {
            Toast.show(`Downloading receipt ${receiptNo}...`, 'info');
            // In a real app, this would trigger a file download
        }

        // Print Report
        function printReport() {
            window.print();
            Toast.show('Printing report...', 'info');
        }

        // Download Data
        function downloadData() {
            const data = JSON.stringify(APP_STATE.studentData, null, 2);
            const blob = new Blob([data], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `student-data-${APP_STATE.studentData.student.studentId}.json`;
            a.click();
            Toast.show('Data exported successfully', 'success');
        }

        // Logout
        function logout() {
            if (confirm('Are you sure you want to logout?')) {
                Toast.show('Logging out...', 'info');
                setTimeout(() => {
                    window.location.href = 'login.html';
                }, 1000);
            }
        }

        // Start Auto Refresh
        function startAutoRefresh() {
            // Refresh data every 5 minutes
            setInterval(() => {
                if (document.visibilityState === 'visible') {
                    Toast.show('Data refreshed', 'success');
                }
            }, 300000);
        }

        // Calendar Navigation
        function prevMonth() {
            APP_STATE.currentMonth.setMonth(APP_STATE.currentMonth.getMonth() - 1);
            generateAttendanceCalendar();
            document.getElementById('currentMonth').textContent = APP_STATE.currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
        }

        function nextMonth() {
            APP_STATE.currentMonth.setMonth(APP_STATE.currentMonth.getMonth() + 1);
            generateAttendanceCalendar();
            document.getElementById('currentMonth').textContent = APP_STATE.currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
        }

        // Initialize the app
        initApp();
   