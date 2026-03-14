
        // Initialize application
        document.addEventListener('DOMContentLoaded', function () {
            checkSession();
            setupEventListeners();
            setupResponsiveSidebar();
            initializeCalendar();
            loadHolidays();
            updateCurrentDate();
        });

        // Global variables
        let sidebarCollapsed = false;
        let isMobile = window.innerWidth < 1024;
        let currentDate = new Date();
        let holidays = [];
        let selectedColor = 'red';
        let editingHolidayId = null;

        // Calendar data - Sample holidays and events
        const sampleHolidays = [
            {
                id: 1,
                title: "Republic Day",
                description: "National holiday - Republic Day of India",
                startDate: "2024-01-26",
                endDate: "2024-01-26",
                type: "holiday",
                color: "red"
            },
            {
                id: 2,
                title: "Annual Sports Day",
                description: "School sports day competition",
                startDate: "2024-02-15",
                endDate: "2024-02-16",
                type: "event",
                color: "green"
            },
            {
                id: 3,
                title: "Mid-term Examinations",
                description: "Mid-term exams for all classes",
                startDate: "2024-03-10",
                endDate: "2024-03-20",
                type: "exam",
                color: "blue"
            },
            {
                id: 4,
                title: "Holi",
                description: "Festival of colors holiday",
                startDate: "2024-03-25",
                endDate: "2024-03-25",
                type: "holiday",
                color: "red"
            },
            {
                id: 5,
                title: "Parent-Teacher Meeting",
                description: "Quarterly parent-teacher meeting",
                startDate: "2024-04-05",
                endDate: "2024-04-05",
                type: "event",
                color: "green"
            },
            {
                id: 6,
                title: "Summer Vacation Starts",
                description: "Beginning of summer vacation",
                startDate: "2024-05-10",
                endDate: "2024-06-30",
                type: "holiday",
                color: "yellow"
            },
            {
                id: 7,
                title: "Independence Day",
                description: "National holiday - Independence Day",
                startDate: "2024-08-15",
                endDate: "2024-08-15",
                type: "holiday",
                color: "red"
            },
            {
                id: 8,
                title: "Diwali",
                description: "Festival of lights holiday",
                startDate: "2024-10-31",
                endDate: "2024-11-01",
                type: "holiday",
                color: "red"
            },
            {
                id: 9,
                title: "Final Examinations",
                description: "Year-end final examinations",
                startDate: "2024-12-01",
                endDate: "2024-12-15",
                type: "exam",
                color: "blue"
            },
            {
                id: 10,
                title: "Christmas",
                description: "Christmas holiday",
                startDate: "2024-12-25",
                endDate: "2024-12-25",
                type: "holiday",
                color: "red"
            }
        ];

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
            // Logout
            document.getElementById('logoutBtn').addEventListener('click', handleLogout);

            // Sidebar Toggle
            document.getElementById('sidebarToggle').addEventListener('click', toggleSidebar);

            // Notifications Dropdown
            document.getElementById('notificationsBtn').addEventListener('click', toggleNotifications);

            // User Menu Dropdown
            document.getElementById('userMenuBtn').addEventListener('click', toggleUserMenu);

            // Calendar Controls
            document.getElementById('prevMonth').addEventListener('click', () => changeMonth(-1));
            document.getElementById('nextMonth').addEventListener('click', () => changeMonth(1));
            document.getElementById('todayBtn').addEventListener('click', goToToday);
            document.getElementById('addHolidayBtn').addEventListener('click', openAddHolidayModal);
            document.getElementById('viewSelect').addEventListener('change', changeView);

            // Holiday Modal
            document.getElementById('closeModal').addEventListener('click', closeModal);
            document.getElementById('cancelHoliday').addEventListener('click', closeModal);
            document.getElementById('holidayForm').addEventListener('submit', saveHoliday);

            // Color buttons
            document.querySelectorAll('.holiday-color-btn').forEach(btn => {
                btn.addEventListener('click', function() {
                    selectedColor = this.dataset.color;
                    document.querySelectorAll('.holiday-color-btn').forEach(b => {
                        b.classList.remove('border-blue-500', 'border-2');
                    });
                    this.classList.add('border-blue-500', 'border-2');
                });
            });

            // Toggle advanced options
document.getElementById('toggleAdvancedOptions')?.addEventListener('click', function() {
    const advancedOptions = document.getElementById('advancedOptions');
    const icon = this.querySelector('i');
    
    if (advancedOptions.classList.contains('hidden')) {
        advancedOptions.classList.remove('hidden');
        icon.className = 'fas fa-chevron-up mr-1';
    } else {
        advancedOptions.classList.add('hidden');
        icon.className = 'fas fa-chevron-down mr-1';
    }
});

// Toggle recurrence options
document.getElementById('isRecurring')?.addEventListener('change', function() {
    const recurrenceOptions = document.getElementById('recurrenceOptions');
    if (this.checked) {
        recurrenceOptions.classList.remove('hidden');
    } else {
        recurrenceOptions.classList.add('hidden');
    }
});

            // Filter buttons
            document.querySelectorAll('.holiday-filter-btn').forEach(btn => {
                btn.addEventListener('click', function() {
                    const filter = this.dataset.filter;
                    document.querySelectorAll('.holiday-filter-btn').forEach(b => {
                        b.classList.remove('active');
                    });
                    this.classList.add('active');
                    filterHolidays(filter);
                });
            });

            // Quick Actions
            document.getElementById('importCalendarBtn').addEventListener('click', importCalendar);
            document.getElementById('exportCalendarBtn').addEventListener('click', exportCalendar);
            document.getElementById('printCalendarBtn').addEventListener('click', printCalendar);
            document.getElementById('bulkDeleteBtn').addEventListener('click', bulkDelete);

            // Initialize date pickers
            flatpickr(".datepicker", {
                dateFormat: "Y-m-d",
                allowInput: true
            });

            // Close dropdowns when clicking outside
            document.addEventListener('click', function (event) {
                if (!event.target.closest('#notificationsBtn')) {
                    document.getElementById('notificationsDropdown').classList.add('hidden');
                }
                if (!event.target.closest('#userMenuBtn')) {
                    document.getElementById('userMenuDropdown').classList.add('hidden');
                }
            });

            // Close sidebar when clicking on overlay
            const sidebarOverlay = document.getElementById('sidebarOverlay');
            if (sidebarOverlay) {
                sidebarOverlay.addEventListener('click', closeMobileSidebar);
            }
        }

        // Responsive Sidebar Setup
        function setupResponsiveSidebar() {
            isMobile = window.innerWidth < 1024;

            if (isMobile) {
                closeMobileSidebar();
            } else {
                const sidebar = document.getElementById('sidebar');
                const mainContent = document.getElementById('mainContent');

                if (sidebarCollapsed) {
                    sidebar.classList.add('collapsed');
                    mainContent.classList.add('sidebar-collapsed');
                } else {
                    sidebar.classList.remove('collapsed');
                    mainContent.classList.remove('sidebar-collapsed');
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

        function toggleSidebar() {
            if (isMobile) {
                const sidebar = document.getElementById('sidebar');
                const overlay = document.getElementById('sidebarOverlay');

                if (sidebar.classList.contains('mobile-open')) {
                    closeMobileSidebar();
                } else {
                    openMobileSidebar();
                }
            } else {
                const sidebar = document.getElementById('sidebar');
                const mainContent = document.getElementById('mainContent');

                sidebarCollapsed = !sidebarCollapsed;

                if (sidebarCollapsed) {
                    sidebar.classList.add('collapsed');
                    mainContent.classList.add('sidebar-collapsed');
                    document.getElementById('sidebarToggleIcon').className = 'fas fa-bars text-xl';
                } else {
                    sidebar.classList.remove('collapsed');
                    mainContent.classList.remove('sidebar-collapsed');
                    document.getElementById('sidebarToggleIcon').className = 'fas fa-times text-xl';
                }
            }
        }

        function openMobileSidebar() {
            const sidebar = document.getElementById('sidebar');
            const overlay = document.getElementById('sidebarOverlay');

            sidebar.classList.add('mobile-open');
            overlay.classList.add('active');
            document.body.classList.add('sidebar-open');
        }

        function closeMobileSidebar() {
            const sidebar = document.getElementById('sidebar');
            const overlay = document.getElementById('sidebarOverlay');

            sidebar.classList.remove('mobile-open');
            overlay.classList.remove('active');
            document.body.classList.remove('sidebar-open');
        }

        // Dropdown Toggles
        function toggleNotifications() {
            const dropdown = document.getElementById('notificationsDropdown');
            dropdown.classList.toggle('hidden');
        }

        function toggleUserMenu() {
            const dropdown = document.getElementById('userMenuDropdown');
            dropdown.classList.toggle('hidden');
        }

        // Calendar Functions
        function initializeCalendar() {
            updateCalendar();
        }

        function updateCalendar() {
            const year = currentDate.getFullYear();
            const month = currentDate.getMonth();
            
            // Update month/year display
            const monthNames = ["January", "February", "March", "April", "May", "June",
                                "July", "August", "September", "October", "November", "December"];
            document.getElementById('currentMonthYear').textContent = `${monthNames[month]} ${year}`;
            
            // Get first day of month and total days
            const firstDay = new Date(year, month, 1);
            const lastDay = new Date(year, month + 1, 0);
            const totalDays = lastDay.getDate();
            const firstDayIndex = firstDay.getDay();
            
            // Clear calendar
            const calendarDays = document.getElementById('calendarDays');
            calendarDays.innerHTML = '';
            
            // Add empty days for previous month
            for (let i = 0; i < firstDayIndex; i++) {
                const emptyDay = document.createElement('div');
                emptyDay.className = 'calendar-day bg-gray-50 rounded-lg p-2 opacity-50';
                calendarDays.appendChild(emptyDay);
            }
            
            // Add days of current month
            const today = new Date();
            const currentDay = today.getDate();
            const currentMonth = today.getMonth();
            const currentYear = today.getFullYear();
            
            for (let day = 1; day <= totalDays; day++) {
                const dayElement = document.createElement('div');
                dayElement.className = 'calendar-day bg-white rounded-lg border border-gray-100 p-2 relative';
                
                // Check if this is today
                if (day === currentDay && month === currentMonth && year === currentYear) {
                    dayElement.classList.add('today');
                }
                
                // Add day number
                const dayNumber = document.createElement('div');
                dayNumber.className = 'day-number text-gray-800 mb-1';
                dayNumber.textContent = day;
                dayElement.appendChild(dayNumber);
                
                // Add holidays for this day
                const dayHolidays = getHolidaysForDay(year, month + 1, day);
                dayHolidays.forEach(holiday => {
                    const holidayBadge = document.createElement('div');
                    holidayBadge.className = `holiday-badge ${holiday.type} mb-1 truncate text-xs font-medium`;
                    holidayBadge.textContent = holiday.title;
                    holidayBadge.title = holiday.description;
                    holidayElement.appendChild(holidayBadge);
                    
                    // Add holiday class to day
                    dayElement.classList.add(holiday.type);
                });
                
                // Create container for holiday badges
                const holidayElement = document.createElement('div');
                holidayElement.className = 'mt-1 space-y-1';
                dayElement.appendChild(holidayElement);
                
                // Add click event to view holiday details
                dayElement.addEventListener('click', () => viewDayDetails(year, month + 1, day));
                
                calendarDays.appendChild(dayElement);
            }
            
            updateStatistics();
            updateUpcomingHolidays();
        }

        function changeMonth(delta) {
            currentDate.setMonth(currentDate.getMonth() + delta);
            updateCalendar();
        }

        function goToToday() {
            currentDate = new Date();
            updateCalendar();
            showToast('Navigated to today', 'success');
        }

        function changeView() {
            const view = document.getElementById('viewSelect').value;
            const monthView = document.getElementById('monthView');
            const listView = document.getElementById('listView');
            
            if (view === 'month') {
                monthView.classList.remove('hidden');
                listView.classList.add('hidden');
            } else {
                monthView.classList.add('hidden');
                listView.classList.remove('hidden');
                updateListView();
            }
        }

        function updateListView() {
            const holidayList = document.getElementById('holidayList');
            holidayList.innerHTML = '';
            
            // Sort holidays by start date
            const sortedHolidays = [...holidays].sort((a, b) => new Date(a.startDate) - new Date(b.startDate));
            
            sortedHolidays.forEach(holiday => {
                const holidayItem = document.createElement('div');
                holidayItem.className = `holiday-list-item p-4 border-l-4 ${
                    holiday.type === 'holiday' ? 'border-red-400 bg-red-50' :
                    holiday.type === 'event' ? 'border-green-400 bg-green-50' :
                    holiday.type === 'exam' ? 'border-blue-400 bg-blue-50' :
                    'border-yellow-400 bg-yellow-50'
                }`;
                
                const startDate = new Date(holiday.startDate);
                const endDate = new Date(holiday.endDate);
                const dateRange = startDate.toDateString() === endDate.toDateString() 
                    ? startDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
                    : `${startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${endDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
                
                holidayItem.innerHTML = `
                    <div class="flex justify-between items-start">
                        <div>
                            <h4 class="font-bold text-gray-800">${holiday.title}</h4>
                            <p class="text-sm text-gray-600 mt-1">${holiday.description}</p>
                            <div class="flex items-center mt-2">
                                <i class="fas fa-calendar-alt text-gray-400 text-xs mr-1"></i>
                                <span class="text-xs text-gray-500">${dateRange}</span>
                                <span class="mx-2">•</span>
                                <span class="text-xs px-2 py-1 rounded-full ${
                                    holiday.type === 'holiday' ? 'bg-red-100 text-red-800' :
                                    holiday.type === 'event' ? 'bg-green-100 text-green-800' :
                                    holiday.type === 'exam' ? 'bg-blue-100 text-blue-800' :
                                    'bg-yellow-100 text-yellow-800'
                                }">${holiday.type.charAt(0).toUpperCase() + holiday.type.slice(1)}</span>
                            </div>
                        </div>
                        <div class="flex space-x-2">
                            <button class="edit-holiday-btn p-2 text-blue-600 hover:bg-blue-50 rounded-lg" data-id="${holiday.id}">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button class="delete-holiday-btn p-2 text-red-600 hover:bg-red-50 rounded-lg" data-id="${holiday.id}">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </div>
                `;
                
                holidayList.appendChild(holidayItem);
            });
            
            // Add event listeners to edit and delete buttons
            document.querySelectorAll('.edit-holiday-btn').forEach(btn => {
                btn.addEventListener('click', function() {
                    const holidayId = parseInt(this.dataset.id);
                    editHoliday(holidayId);
                });
            });
            
            document.querySelectorAll('.delete-holiday-btn').forEach(btn => {
                btn.addEventListener('click', function() {
                    const holidayId = parseInt(this.dataset.id);
                    deleteHoliday(holidayId);
                });
            });
        }

        function loadHolidays() {
            // Load from localStorage or use sample data
            const savedHolidays = localStorage.getItem('school_calendar_holidays');
            if (savedHolidays) {
                holidays = JSON.parse(savedHolidays);
            } else {
                holidays = [...sampleHolidays];
                localStorage.setItem('school_calendar_holidays', JSON.stringify(holidays));
            }
            updateCalendar();
        }

        function saveHolidays() {
            localStorage.setItem('school_calendar_holidays', JSON.stringify(holidays));
        }

        function getHolidaysForDay(year, month, day) {
            const dateStr = `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
            return holidays.filter(holiday => {
                const start = new Date(holiday.startDate);
                const end = new Date(holiday.endDate);
                const current = new Date(dateStr);
                return current >= start && current <= end;
            });
        }

        // Modal Functions
        function openAddHolidayModal() {
            editingHolidayId = null;
            document.getElementById('modalTitle').textContent = 'Add New Holiday/Event';
            document.getElementById('holidayForm').reset();
            
            // Reset color selection
            selectedColor = 'red';
            document.querySelectorAll('.holiday-color-btn').forEach(b => {
                b.classList.remove('border-blue-500', 'border-2');
                if (b.dataset.color === 'red') {
                    b.classList.add('border-blue-500', 'border-2');
                }
            });
            
            // Set default dates
            const today = new Date().toISOString().split('T')[0];
            document.getElementById('holidayStartDate').value = today;
            document.getElementById('holidayEndDate').value = today;
            
            document.getElementById('holidayModal').classList.remove('hidden');
        }

        function editHoliday(id) {
            const holiday = holidays.find(h => h.id === id);
            if (!holiday) return;
            
            editingHolidayId = id;
            document.getElementById('modalTitle').textContent = 'Edit Holiday/Event';
            
            // Fill form with holiday data
            document.getElementById('holidayTitle').value = holiday.title;
            document.getElementById('holidayDescription').value = holiday.description;
            document.getElementById('holidayStartDate').value = holiday.startDate;
            document.getElementById('holidayEndDate').value = holiday.endDate;
            
            // Set holiday type
            document.querySelector(`input[name="holidayType"][value="${holiday.type}"]`).checked = true;
            
            // Set color
            selectedColor = holiday.color;
            document.querySelectorAll('.holiday-color-btn').forEach(b => {
                b.classList.remove('border-blue-500', 'border-2');
                if (b.dataset.color === holiday.color) {
                    b.classList.add('border-blue-500', 'border-2');
                }
            });
            
            document.getElementById('holidayModal').classList.remove('hidden');
        }

        function closeModal() {
            document.getElementById('holidayModal').classList.add('hidden');
        }

        function saveHoliday(event) {
            event.preventDefault();
            
            const title = document.getElementById('holidayTitle').value.trim();
            const description = document.getElementById('holidayDescription').value.trim();
            const startDate = document.getElementById('holidayStartDate').value;
            const endDate = document.getElementById('holidayEndDate').value;
            const type = document.querySelector('input[name="holidayType"]:checked').value;
            
            if (!title) {
                showToast('Please enter a title', 'error');
                return;
            }
            
            if (new Date(endDate) < new Date(startDate)) {
                showToast('End date cannot be before start date', 'error');
                return;
            }
            
            if (editingHolidayId) {
                // Update existing holiday
                const index = holidays.findIndex(h => h.id === editingHolidayId);
                if (index !== -1) {
                    holidays[index] = {
                        ...holidays[index],
                        title,
                        description,
                        startDate,
                        endDate,
                        type,
                        color: selectedColor
                    };
                    showToast('Holiday updated successfully', 'success');
                }
            } else {
                // Add new holiday
                const newId = holidays.length > 0 ? Math.max(...holidays.map(h => h.id)) + 1 : 1;
                holidays.push({
                    id: newId,
                    title,
                    description,
                    startDate,
                    endDate,
                    type,
                    color: selectedColor
                });
                showToast('Holiday added successfully', 'success');
            }
            
            saveHolidays();
            updateCalendar();
            closeModal();
            
            if (document.getElementById('viewSelect').value === 'list') {
                updateListView();
            }
        }

        function deleteHoliday(id) {
            if (confirm('Are you sure you want to delete this holiday/event?')) {
                holidays = holidays.filter(h => h.id !== id);
                saveHolidays();
                updateCalendar();
                showToast('Holiday deleted successfully', 'success');
                
                if (document.getElementById('viewSelect').value === 'list') {
                    updateListView();
                }
            }
        }

        function viewDayDetails(year, month, day) {
            const date = new Date(year, month - 1, day);
            const dateStr = date.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
            const dayHolidays = getHolidaysForDay(year, month, day);
            
            let message = `Date: ${dateStr}\n\n`;
            
            if (dayHolidays.length === 0) {
                message += 'No holidays or events scheduled for this day.';
            } else {
                message += 'Scheduled Events:\n';
                dayHolidays.forEach(holiday => {
                    message += `• ${holiday.title} (${holiday.type})\n`;
                    if (holiday.description) {
                        message += `  ${holiday.description}\n`;
                    }
                });
            }
            
            alert(message);
        }

        function filterHolidays(filterType) {
            const calendarDays = document.querySelectorAll('#calendarDays > div.calendar-day');
            calendarDays.forEach(day => {
                if (filterType === 'all') {
                    day.classList.remove('hidden');
                } else {
                    if (day.classList.contains(filterType)) {
                        day.classList.remove('hidden');
                    } else {
                        day.classList.add('hidden');
                    }
                }
            });
        }

        function updateStatistics() {
            const totalHolidays = holidays.filter(h => h.type === 'holiday').length;
            const totalEvents = holidays.filter(h => h.type === 'event').length;
            const totalExams = holidays.filter(h => h.type === 'exam').length;
            const totalOther = holidays.filter(h => h.type === 'other').length;
            
            document.getElementById('totalHolidays').textContent = totalHolidays;
            document.getElementById('totalEvents').textContent = totalEvents;
            document.getElementById('totalExams').textContent = totalExams;
            document.getElementById('totalOther').textContent = totalOther;
        }

        function updateUpcomingHolidays() {
            const upcomingContainer = document.getElementById('upcomingHolidays');
            upcomingContainer.innerHTML = '';
            
            const today = new Date();
            const nextWeek = new Date(today);
            nextWeek.setDate(nextWeek.getDate() + 7);
            
            const upcoming = holidays
                .filter(holiday => {
                    const startDate = new Date(holiday.startDate);
                    return startDate >= today && startDate <= nextWeek;
                })
                .sort((a, b) => new Date(a.startDate) - new Date(b.startDate))
                .slice(0, 3);
            
            if (upcoming.length === 0) {
                upcomingContainer.innerHTML = '<p class="text-gray-500 text-center py-4">No upcoming holidays in the next 7 days</p>';
                return;
            }
            
            upcoming.forEach(holiday => {
                const startDate = new Date(holiday.startDate);
                const endDate = new Date(holiday.endDate);
                const isSingleDay = startDate.toDateString() === endDate.toDateString();
                
                const holidayItem = document.createElement('div');
                holidayItem.className = 'flex items-start p-3 bg-gray-50 rounded-lg';
                
                const iconClass = holiday.type === 'holiday' ? 'fas fa-umbrella-beach text-red-500' :
                                 holiday.type === 'event' ? 'fas fa-calendar-check text-green-500' :
                                 holiday.type === 'exam' ? 'fas fa-file-alt text-blue-500' :
                                 'fas fa-star text-yellow-500';
                
                holidayItem.innerHTML = `
                    <div class="flex-shrink-0 h-10 w-10 rounded-lg flex items-center justify-center ${
                        holiday.type === 'holiday' ? 'bg-red-100' :
                        holiday.type === 'event' ? 'bg-green-100' :
                        holiday.type === 'exam' ? 'bg-blue-100' :
                        'bg-yellow-100'
                    }">
                        <i class="${iconClass}"></i>
                    </div>
                    <div class="ml-3">
                        <h4 class="font-medium text-gray-800 text-sm">${holiday.title}</h4>
                        <p class="text-xs text-gray-600 mt-1">
                            <i class="far fa-calendar mr-1"></i>
                            ${isSingleDay 
                                ? startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                                : `${startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${endDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
                            }
                        </p>
                    </div>
                `;
                
                upcomingContainer.appendChild(holidayItem);
            });
            
            if (upcoming.length < 3) {
                const viewAll = document.createElement('button');
                viewAll.className = 'w-full mt-3 text-center text-blue-600 hover:text-blue-800 text-sm font-medium';
                viewAll.innerHTML = '<i class="fas fa-chevron-right mr-1"></i> View All Upcoming';
                viewAll.addEventListener('click', () => {
                    document.getElementById('viewSelect').value = 'list';
                    changeView();
                });
                upcomingContainer.appendChild(viewAll);
            }
        }

        function updateCurrentDate() {
            const now = new Date();
            const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
            document.getElementById('currentDateDisplay').textContent = now.toLocaleDateString('en-US', options);
        }

        // Quick Actions Functions
        function importCalendar() {
            showToast('Import feature coming soon!', 'info');
        }

        function exportCalendar() {
            const dataStr = JSON.stringify(holidays, null, 2);
            const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
            
            const exportFileDefaultName = `school_calendar_${new Date().toISOString().split('T')[0]}.json`;
            
            const linkElement = document.createElement('a');
            linkElement.setAttribute('href', dataUri);
            linkElement.setAttribute('download', exportFileDefaultName);
            linkElement.click();
            
            showToast('Calendar exported successfully', 'success');
        }

        function printCalendar() {
            window.print();
        }

        function bulkDelete() {
            if (confirm('Are you sure you want to delete all holidays? This action cannot be undone.')) {
                holidays = [];
                saveHolidays();
                updateCalendar();
                showToast('All holidays deleted successfully', 'success');
            }
        }

        // Utility Functions
        function showToast(message, type = 'info') {
            const toastContainer = document.getElementById('toastContainer');
            const toast = document.createElement('div');
            
            const bgColor = type === 'success' ? 'bg-green-100 border-green-300 text-green-800' :
                           type === 'error' ? 'bg-red-100 border-red-300 text-red-800' :
                           type === 'warning' ? 'bg-yellow-100 border-yellow-300 text-yellow-800' :
                           'bg-blue-100 border-blue-300 text-blue-800';
            
            const icon = type === 'success' ? 'fas fa-check-circle' :
                        type === 'error' ? 'fas fa-exclamation-circle' :
                        type === 'warning' ? 'fas fa-exclamation-triangle' :
                        'fas fa-info-circle';
            
            toast.className = `${bgColor} border px-4 py-3 rounded-lg shadow-lg flex items-start transform transition-all duration-300 translate-x-full opacity-0`;
            toast.innerHTML = `
                <i class="${icon} mt-1 mr-3"></i>
                <div class="flex-1">
                    <p class="font-medium">${message}</p>
                </div>
                <button class="ml-4 text-gray-500 hover:text-gray-700 toast-close">
                    <i class="fas fa-times"></i>
                </button>
            `;
            
            toastContainer.appendChild(toast);
            
            // Animate in
            setTimeout(() => {
                toast.classList.remove('translate-x-full', 'opacity-0');
                toast.classList.add('translate-x-0', 'opacity-100');
            }, 10);
            
            // Close button
            toast.querySelector('.toast-close').addEventListener('click', () => {
                toast.classList.remove('translate-x-0', 'opacity-100');
                toast.classList.add('translate-x-full', 'opacity-0');
                setTimeout(() => toast.remove(), 300);
            });
            
            // Auto remove after 5 seconds
            setTimeout(() => {
                if (toast.parentNode) {
                    toast.classList.remove('translate-x-0', 'opacity-100');
                    toast.classList.add('translate-x-full', 'opacity-0');
                    setTimeout(() => toast.remove(), 300);
                }
            }, 5000);
        }
    