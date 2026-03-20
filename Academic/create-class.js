// ==================== API CONFIGURATION ====================
const API_BASE_URL = 'http://localhost:8084/api';
let authToken = localStorage.getItem('admin_jwt_token');

// ==================== DATA ====================
const periods = [
    { num: 1, time: '9:00-9:45' },
    { num: 2, time: '9:45-10:30' },
    { num: 3, time: '10:30-11:15' },
    { num: 4, time: '11:30-12:15' },
    { num: 5, time: '12:15-1:00' },
    { num: 6, time: '1:45-2:30' },
    { num: 7, time: '2:30-3:15' },
    { num: 8, time: '3:15-4:00' }
];

const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

// Break periods (these are fixed, not from DB)
const breaks = [
    { day: 'Monday', period: 3, type: 'RECESS' },
    { day: 'Monday', period: 5, type: 'LUNCH' },
    { day: 'Tuesday', period: 3, type: 'RECESS' },
    { day: 'Tuesday', period: 5, type: 'LUNCH' },
    { day: 'Wednesday', period: 3, type: 'RECESS' },
    { day: 'Wednesday', period: 5, type: 'LUNCH' },
    { day: 'Thursday', period: 3, type: 'RECESS' },
    { day: 'Thursday', period: 5, type: 'LUNCH' },
    { day: 'Friday', period: 3, type: 'RECESS' },
    { day: 'Friday', period: 5, type: 'LUNCH' }
];

// Data from backend
let slots = [];
let classes = [];
let teachers = [];

// Undo stack
let undoStack = [];
let redoStack = [];

// Current view state
let currentView = 'month';
let isMobileView = false;
let isCardView = false;

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

    if (data) {
        options.body = JSON.stringify(data);
    }

    console.log(`🔵 [API] ${method} ${url}`);
    if (data) console.log('📦 Request data:', data);

    try {
        const response = await fetch(`${API_BASE_URL}${url}`, options);
        console.log(`📡 Response status: ${response.status}`);
        
        const result = await response.json();
        console.log('📄 Response data:', result);
        
        if (!response.ok) {
            console.error('❌ API error:', result.message || `Status ${response.status}`);
            throw new Error(result.message || `API call failed with status ${response.status}`);
        }
        
        // Handle wrapped response structure
        if (result.success === true && result.data !== undefined) {
            console.log('✅ API success, returning data');
            return result.data;
        }
        
        console.log('✅ API success, returning raw result');
        return result;
    } catch (error) {
        console.error('❌ API Error:', error);
        throw error;
    }
}

// ==================== INITIALIZATION ====================
async function initializeData() {
    console.log('🚀 Initializing data...');
    try {
        showLoading(true);
        
        // Fetch classes
        console.log('📚 Fetching classes from /classes/get-all-classes');
        const classesResponse = await apiCall('/classes/get-all-classes');
        console.log('Classes response:', classesResponse);
        
        if (classesResponse && Array.isArray(classesResponse)) {
            classes = classesResponse;
            console.log(`✅ Loaded ${classes.length} classes`);
            populateClassFilter();
        } else {
            console.warn('⚠️ Classes response is not an array:', classesResponse);
        }

        // Fetch teachers
        console.log('👨‍🏫 Fetching teachers from /teachers/get-all-teachers');
        const teachersResponse = await apiCall('/teachers/get-all-teachers');
        console.log('Teachers response:', teachersResponse);
        
        if (teachersResponse && Array.isArray(teachersResponse)) {
            teachers = teachersResponse;
            console.log(`✅ Loaded ${teachers.length} teachers`);
            populateTeacherFilter();
        } else {
            console.warn('⚠️ Teachers response is not an array:', teachersResponse);
        }

        // Fetch initial timetable
        await fetchTimetable();
        
    } catch (error) {
        console.error('❌ Initialization error:', error);
    } finally {
        hideLoading();
    }
}

function showLoading(show) {
    const overlay = document.getElementById('loadingOverlay');
    if (overlay) {
        overlay.classList.toggle('hidden', !show);
    }
}

function hideLoading() {
    const overlay = document.getElementById('loadingOverlay');
    if (overlay) {
        overlay.classList.add('hidden');
    }
}

function populateClassFilter() {
    const classFilter = document.getElementById('classFilter');
    const createClass = document.getElementById('createClass');
    const classSelect = document.getElementById('classSelect');
    
    if (!classFilter) return;
    
    // Clear existing options
    classFilter.innerHTML = '';
    if (createClass) createClass.innerHTML = '';
    if (classSelect) classSelect.innerHTML = '';
    
    console.log('Populating class filter with:', classes);
    
    // Add options from backend
    classes.forEach(cls => {
        const className = cls.className || cls.name;
        const section = cls.section || 'A';
        
        console.log(`Adding class: ${className} - ${section}`);
        
        // Class filter dropdown
        const option = document.createElement('option');
        option.value = className;
        option.textContent = `${className} - ${section}`;
        classFilter.appendChild(option);
        
        // Create class dropdown
        if (createClass) {
            const option2 = document.createElement('option');
            option2.value = className;
            option2.textContent = className;
            createClass.appendChild(option2);
        }
        
        // Modal class select
        if (classSelect) {
            const option3 = document.createElement('option');
            option3.value = className;
            option3.textContent = className;
            classSelect.appendChild(option3);
        }
    });
    
    // Set default selection to first class
    if (classes.length > 0) {
        classFilter.value = classes[0].className;
        console.log(`Set default class to: ${classes[0].className}`);
    }
    
    console.log('✅ Class filter populated');
}

function populateTeacherFilter() {
    const teacherFilter = document.getElementById('teacherFilter');
    const teacherSelect = document.getElementById('teacherSelect');
    
    if (!teacherFilter) return;
    
    // Keep the "All Teachers" option
    teacherFilter.innerHTML = '<option value="">All Teachers</option>';
    if (teacherSelect) teacherSelect.innerHTML = '';
    
    // Add teachers from backend
    teachers.forEach(teacher => {
        const teacherName = teacher.fullName || 
                           (teacher.firstName && teacher.lastName ? 
                            `${teacher.firstName} ${teacher.lastName}` : 
                            teacher.name || 'Unknown Teacher');
        
        // Teacher filter dropdown
        const option = document.createElement('option');
        option.value = teacherName;
        option.textContent = teacherName;
        teacherFilter.appendChild(option);
        
        // Modal teacher select
        if (teacherSelect) {
            const option2 = document.createElement('option');
            option2.value = teacherName;
            option2.textContent = teacherName;
            teacherSelect.appendChild(option2);
        }
    });
    
    console.log(`✅ Teacher filter populated with ${teachers.length} teachers`);
}

// ==================== FETCH TIMETABLE FROM BACKEND ====================
async function fetchTimetable() {
    const classFilter = document.getElementById('classFilter');
    const sectionFilter = document.getElementById('sectionFilter');
    
    if (!classFilter || !sectionFilter) {
        console.error('❌ Filter elements not found');
        return;
    }

    const className = classFilter.value;
    const section = sectionFilter.value;

    if (!className || !section) {
        console.warn('⚠️ Class or section not selected');
        return;
    }

    console.log(`🔄 Fetching timetable for: ${className} - Section ${section}, View: ${currentView}`);

    try {
        // Find class object from classes array - match by className and section
        const classObj = classes.find(c => 
            c.className === className && 
            c.section === section
        );
        
        if (!classObj) {
            console.warn('⚠️ Class not found in classes array:', { className, section });
            console.log('Available classes:', classes.map(c => `${c.className}-${c.section}`));
            slots = [];
            renderTimetable();
            return;
        }
        
        console.log('📚 Found class:', { 
            id: classObj.classId || classObj.id, 
            name: classObj.className, 
            code: classObj.classCode,
            section: classObj.section
        });
        
        // Build query params - your backend expects className, section, academicYear
        let url = `/timetable?className=${encodeURIComponent(className)}&section=${encodeURIComponent(section)}&academicYear=2024-2025`;
        
        // If week view, add week number
        if (currentView === 'week') {
            url += '&weekNumber=1';
        }
        
        console.log('🔗 Fetching from URL:', url);
        
        const response = await apiCall(url);
        console.log('📊 Timetable API response:', response);
        
        // Transform the backend data to frontend slots
        slots = transformBackendToSlots(response, className, section);
        console.log(`📋 Transformed ${slots.length} slots:`, slots);
        
        renderTimetable();
        
    } catch (error) {
        console.error('❌ Error fetching timetable:', error);
        slots = [];
        renderTimetable();
    }
}

/**
 * Transform backend timetable data to frontend slots format
 * Your backend returns TimetableResponseDto with weeks -> days -> periods structure
 */
function transformBackendToSlots(backendData, className, section) {
    console.log('🔄 Transforming backend data to slots format');
    const slots = [];
    
    if (!backendData) {
        console.warn('⚠️ No backend data received');
        return slots;
    }
    
    // Check if response has data property (wrapped response)
    const data = backendData.data || backendData;
    
    if (!data) {
        console.warn('⚠️ No data in response');
        return slots;
    }
    
    console.log('Data structure:', Object.keys(data));
    
    // Check if data has weeks array
    if (data.weeks && Array.isArray(data.weeks)) {
        console.log(`📅 Found ${data.weeks.length} weeks in response`);
        
        data.weeks.forEach(week => {
            console.log(`  Week ${week.weekNumber}:`);
            
            if (week.days && Array.isArray(week.days)) {
                week.days.forEach(day => {
                    console.log(`    Day ${day.day}: ${day.periods ? day.periods.length : 0} periods`);
                    
                    if (day.periods && Array.isArray(day.periods)) {
                        day.periods.forEach((period, index) => {
                            const periodNum = index + 1;
                            
                            // Skip empty periods (no subject and not break)
                            if (period.isBreak || period.subjectName) {
                                const slot = {
                                    day: day.day,
                                    period: periodNum,
                                    week: week.weekNumber || 1,
                                    class: data.className || className,
                                    section: data.section || section,
                                    subject: period.subjectName || '',
                                    teacher: period.teacherName || '',
                                    teacherId: period.teacherId,
                                    room: period.roomNumber || '',
                                    roomType: period.roomType || 'classroom',
                                    notes: period.notes || '',
                                    time: periods[periodNum - 1]?.time || '',
                                    isBreak: period.isBreak || false,
                                    breakType: period.breakType
                                };
                                
                                slots.push(slot);
                                console.log(`      ✅ Added: ${day.day} P${periodNum} - ${slot.subject || slot.breakType}`);
                            }
                        });
                    }
                });
            }
        });
    } else {
        console.warn('⚠️ No weeks array in response data');
    }
    
    return slots;
}

// ==================== RENDER FUNCTIONS ====================
function renderTimetable() {
    const container = document.getElementById('timetableContainer');
    const classFilter = document.getElementById('classFilter');
    const sectionFilter = document.getElementById('sectionFilter');
    
    if (!container || !classFilter || !sectionFilter) {
        console.error('❌ Required elements not found');
        return;
    }

    const className = classFilter.value;
    const section = sectionFilter.value;
    const teacherFilter = document.getElementById('teacherFilter')?.value || '';
    const subjectFilter = document.getElementById('subjectFilter')?.value || '';

    console.log(`🖼️ Rendering timetable with ${slots.length} slots`);
    console.log('Filters:', { className, section, teacherFilter, subjectFilter });

    let filteredSlots = slots.filter(s => s.class === className && s.section === section);

    if (teacherFilter) {
        filteredSlots = filteredSlots.filter(s => s.teacher === teacherFilter);
    }

    if (subjectFilter) {
        filteredSlots = filteredSlots.filter(s => s.subject === subjectFilter);
    }

    console.log(`Filtered to ${filteredSlots.length} slots`);

    let html = '';

    // Update view indicator
    const viewIndicator = document.getElementById('viewIndicatorText');
    if (viewIndicator) {
        viewIndicator.textContent = `Currently viewing: ${currentView === 'month' ? 'Month' : currentView === 'week' ? 'Week' : 'Day'} View for ${className} - Section ${section}`;
    }

    if (currentView === 'month') {
        html = renderMonthView(filteredSlots, className, section);
    } else if (currentView === 'week') {
        html = renderWeekView(filteredSlots, className, section);
    } else {
        html = renderDayView(filteredSlots, className, section);
    }

    container.innerHTML = html;
    console.log('✅ Timetable rendered');
}

function renderMonthView(filteredSlots, classFilter, sectionFilter) {
    const weeks = ['Week 1', 'Week 2', 'Week 3', 'Week 4'];
    let html = '<div class="month-view-container">';

    weeks.forEach((week, index) => {
        const weekNum = index + 1;
        html += `
            <div class="month-week-card">
                <div class="month-week-header">
                    <div class="month-week-title">
                        <i class="far fa-calendar-alt mr-2"></i>${week}
                    </div>
                    <div class="flex items-center gap-2">
                        <span class="month-week-badge">${classFilter} - ${sectionFilter}</span>
                        <button onclick="openCreateModal('month', ${weekNum}, 'Monday')" class="create-week-btn">
                            <i class="fas fa-plus mr-1"></i>Create Week
                        </button>
                    </div>
                </div>
                <div class="month-days-grid">
        `;

        days.forEach(day => {
            const daySlots = filteredSlots.filter(s => s.day === day && s.week === weekNum).sort((a, b) => a.period - b.period);
            html += `
                <div class="month-day-column">
                    <div class="month-day-header">
                        <span>${day}</span>
                        <span class="text-xs bg-gray-200 px-2 py-1 rounded">${daySlots.length} periods</span>
                    </div>
                    <div class="month-day-periods">
            `;

            if (daySlots.length > 0) {
                daySlots.forEach(slot => {
                    if (slot.isBreak) {
                        html += `
                            <div class="month-period-item break-cell" onclick="openEditModal('${day}', ${slot.period})">
                                <span class="month-period-time">P${slot.period}</span>
                                <span class="break-text ml-1">${slot.breakType || 'BREAK'}</span>
                            </div>
                        `;
                    } else {
                        const subjectClass = getSubjectClass(slot.subject);
                        html += `
                            <div class="month-period-item ${subjectClass}" onclick="openEditModal('${day}', ${slot.period})">
                                <span class="month-period-time">P${slot.period}</span>
                                <span class="subject-name ml-1">${slot.subject}</span>
                                <span class="teacher-name block">Teacher : ${slot.teacher}</span>
                            </div>
                        `;
                    }
                });
            } else {
                html += `
                    <div class="month-empty-day" onclick="openCreateModal('day', 1, '${day}')">
                        <div class="text-center">
                            <i class="fas fa-plus-circle mb-1"></i>
                            <div>Add Periods</div>
                        </div>
                    </div>
                `;
            }

            html += `</div></div>`;
        });

        html += `</div></div>`;
    });

    html += '</div>';
    return html;
}

function renderWeekView(filteredSlots, classFilter, sectionFilter) {
    let html = `
        <div class="week-view-container">
            <div class="week-card">
                <div class="week-card-header">
                    <div class="week-title">
                        <i class="fas fa-calendar-week mr-2"></i>Weekly Schedule
                    </div>
                    <div class="flex items-center gap-2">
                        <span class="bg-white text-orange-600 px-3 py-1 rounded-full text-xs font-semibold">
                            ${classFilter} - ${sectionFilter}
                        </span>
                        <button onclick="openCreateModal('week', 1, 'Monday')" class="create-day-btn">
                            <i class="fas fa-plus mr-1"></i>Create Week
                        </button>
                    </div>
                </div>
                <div class="week-days-grid">
    `;

    days.forEach(day => {
        const daySlots = filteredSlots.filter(s => s.day === day).sort((a, b) => a.period - b.period);
        const dayClass = day.toLowerCase();

        html += `
            <div class="week-day-column">
                <div class="week-day-header ${dayClass}">
                    <span>${day}</span>
                    <span class="text-xs bg-gray-200 text-gray-700 px-2 py-1 rounded">${daySlots.length} periods</span>
                </div>
                <div class="week-day-periods">
        `;

        if (daySlots.length > 0) {
            daySlots.forEach(slot => {
                if (slot.isBreak) {
                    html += `
                        <div class="week-period-item break-cell" onclick="openEditModal('${day}', ${slot.period})">
                            <span class="week-period-time">P${slot.period} (${slot.time || periods[slot.period - 1]?.time})</span>
                            <span class="break-text ml-1 block">${slot.breakType || 'BREAK'}</span>
                        </div>
                    `;
                } else {
                    const subjectClass = getSubjectClass(slot.subject);
                    html += `
                        <div class="week-period-item ${subjectClass}" onclick="openEditModal('${day}', ${slot.period})">
                            <span class="week-period-time">P${slot.period} (${slot.time || periods[slot.period - 1]?.time})</span>
                            <span class="subject-name block">${slot.subject}</span>
                            <span class="teacher-name">${slot.teacher}</span>
                            <span class="room-no">Rm ${slot.room}</span>
                        </div>
                    `;
                }
            });
        } else {
            html += `
                <div class="week-empty-day" onclick="openCreateModal('day', 1, '${day}')">
                    <div class="text-center">
                        <i class="fas fa-plus-circle mb-1"></i>
                        <div>Add Periods</div>
                    </div>
                </div>
            `;
        }

        html += `</div></div>`;
    });

    html += `</div></div></div>`;
    return html;
}

function renderDayView(filteredSlots, classFilter, sectionFilter) {
    let html = '<div class="day-view-container">';

    days.forEach(day => {
        const daySlots = filteredSlots.filter(s => s.day === day).sort((a, b) => a.period - b.period);
        const dayClass = day.toLowerCase();
        const filledPeriods = daySlots.filter(s => !s.isBreak).length;

        html += `
            <div class="day-card-enhanced">
                <div class="day-card-header ${dayClass}">
                    <div class="day-title">
                        <i class="far fa-calendar-alt"></i>
                        ${day}
                    </div>
                    <div class="flex items-center gap-3">
                        <span class="day-stats">
                            <i class="fas fa-clock mr-1"></i>${filledPeriods} Classes
                        </span>
                        <span class="day-stats">
                            <i class="fas fa-book mr-1"></i>${daySlots.length} Periods
                        </span>
                        <button onclick="openCreateModal('day', 1, '${day}')" class="create-day-btn">
                            <i class="fas fa-plus mr-1"></i>Add Periods
                        </button>
                    </div>
                </div>
                <div class="day-periods-grid">
        `;

        // Create all 8 period slots
        for (let periodNum = 1; periodNum <= 8; periodNum++) {
            const slot = daySlots.find(s => s.period === periodNum);
            const periodTime = periods.find(p => p.num === periodNum)?.time || '';

            if (slot && slot.isBreak) {
                html += `
                    <div class="day-period-block break-block" onclick="openEditModal('${day}', ${periodNum})">
                        <span class="day-period-time">Period ${periodNum} (${periodTime})</span>
                        <span class="day-period-subject break-text">${slot.breakType || 'BREAK'}</span>
                        <div class="day-period-details">
                            <i class="fas fa-clock mr-1"></i>Break
                        </div>
                    </div>
                `;
            } else if (slot) {
                const subjectClass = getSubjectClass(slot.subject);
                html += `
                    <div class="day-period-block ${subjectClass}" onclick="openEditModal('${day}', ${periodNum})">
                        <span class="day-period-time">Period ${periodNum} (${periodTime})</span>
                        <span class="day-period-subject">${slot.subject}</span>
                        <div class="day-period-details">
                            <i class="fas fa-user mr-1"></i>${slot.teacher}<br>
                            <i class="fas fa-door-open mr-1"></i>Rm ${slot.room}
                        </div>
                    </div>
                `;
            } else {
                html += `
                    <div class="day-empty-block" onclick="openEditModal('${day}', ${periodNum})">
                        <div class="text-center">
                            <i class="fas fa-plus-circle mb-1"></i>
                            <div>Empty Period</div>
                            <span class="text-[0.5rem]">Click to add</span>
                        </div>
                    </div>
                `;
            }
        }

        html += `</div></div>`;
    });

    html += '</div>';
    return html;
}

function getSubjectClass(subject) {
    const classes = {
        'Mathematics': 'subject-math',
        'Science': 'subject-science',
        'English': 'subject-english',
        'Hindi': 'subject-hindi',
        'SST': 'subject-sst',
        'Computer': 'subject-computer'
    };
    return classes[subject] || '';
}

// ==================== MODAL FUNCTIONS ====================
window.openEditModal = function (day, period, week = 1) {
    console.log(`✏️ Opening edit modal for ${day} period ${period}, week ${week}`);
    
    const modalDay = document.getElementById('modalDay');
    const modalPeriod = document.getElementById('modalPeriod');
    
    if (!modalDay || !modalPeriod) {
        console.error('❌ Modal elements not found');
        return;
    }
    
    modalDay.value = day;
    modalPeriod.value = period;
    
    // Check if it's a break period
    const isBreak = breaks.some(b => b.day === day && b.period === period);
    const slot = slots.find(s => s.day === day && s.period === period && s.week === week);

    const isBreakCheckbox = document.getElementById('isBreak');
    const breakTypeDiv = document.getElementById('breakTypeDiv');
    
    if (isBreakCheckbox) isBreakCheckbox.checked = isBreak || (slot && slot.isBreak);
    if (breakTypeDiv) breakTypeDiv.classList.toggle('hidden', !(isBreak || (slot && slot.isBreak)));

    // Set values if slot exists
    if (slot) {
        setSelectValue('classSelect', slot.class);
        setSelectValue('sectionSelect', slot.section);
        setSelectValue('subjectSelect', slot.subject);
        setSelectValue('teacherSelect', slot.teacher);
        setInputValue('roomInput', slot.room);
        setSelectValue('roomType', slot.roomType || 'classroom');
        setTextareaValue('slotNotes', slot.notes || '');
        if (slot.breakType) {
            setSelectValue('breakType', slot.breakType);
        }
    } else {
        // Set default values
        setSelectValue('classSelect', document.getElementById('classFilter')?.value || 'Class 10');
        setSelectValue('sectionSelect', document.getElementById('sectionFilter')?.value || 'A');
        setSelectValue('subjectSelect', 'Mathematics');
        setSelectValue('teacherSelect', teachers[0]?.fullName || 'Ravi Kumar');
        setInputValue('roomInput', '101');
        setSelectValue('roomType', 'classroom');
        setTextareaValue('slotNotes', '');
        if (isBreak) {
            setSelectValue('breakType', 'RECESS');
        }
    }
    
    const modal = document.getElementById('slotModal');
    if (modal) modal.classList.add('active');
};

function setSelectValue(id, value) {
    const element = document.getElementById(id);
    if (element && value) element.value = value;
}

function setInputValue(id, value) {
    const element = document.getElementById(id);
    if (element && value) element.value = value;
}

function setTextareaValue(id, value) {
    const element = document.getElementById(id);
    if (element && value) element.value = value;
}

window.closeModal = function () {
    console.log('Closing modal');
    const modal = document.getElementById('slotModal');
    if (modal) modal.classList.remove('active');
    
    const form = document.getElementById('slotForm');
    if (form) form.reset();
    
    const breakTypeDiv = document.getElementById('breakTypeDiv');
    if (breakTypeDiv) breakTypeDiv.classList.add('hidden');
};

// Slot form submission
document.addEventListener('DOMContentLoaded', function() {
    const slotForm = document.getElementById('slotForm');
    if (slotForm) {
        slotForm.addEventListener('submit', async function (e) {
            e.preventDefault();
            
            console.log('📝 Submitting period update...');
            
            const day = document.getElementById('modalDay')?.value;
            const period = parseInt(document.getElementById('modalPeriod')?.value);
            const isBreak = document.getElementById('isBreak')?.checked;
            const classFilter = document.getElementById('classFilter')?.value;
            const sectionFilter = document.getElementById('sectionFilter')?.value;

            if (!day || !period || !classFilter || !sectionFilter) {
                console.error('❌ Missing required fields');
                return;
            }

            // Find class ID
            const classObj = classes.find(c => 
                c.className === classFilter && 
                (c.section === sectionFilter || c.section === sectionFilter)
            );

            if (!classObj) {
                console.error('❌ Class not found');
                return;
            }

            // Find teacher ID
            const teacherName = document.getElementById('teacherSelect')?.value;
            const teacher = teachers.find(t => 
                (t.fullName === teacherName) || 
                (`${t.firstName} ${t.lastName}` === teacherName)
            );

            const requestData = {
                className: classFilter,
                classCode: classObj.classCode,
                section: sectionFilter,
                academicYear: '2024-2025',
                day: day,
                period: period,
                weekNumber: 1,
                updatedBy: 'admin'
            };

            if (isBreak) {
                requestData.isBreak = true;
                requestData.breakType = document.getElementById('breakType')?.value || 'RECESS';
            } else {
                requestData.subjectName = document.getElementById('subjectSelect')?.value || 'Mathematics';
                requestData.teacherId = teacher?.id || null;
                requestData.roomNumber = document.getElementById('roomInput')?.value || '101';
                requestData.roomType = document.getElementById('roomType')?.value || 'classroom';
                requestData.notes = document.getElementById('slotNotes')?.value || '';
            }

            console.log('Sending update request:', requestData);

            try {
                await updatePeriod(requestData);
            } catch (error) {
                console.error('❌ Error updating period:', error);
            }
        });
    }

    // Is break checkbox handler
    const isBreakCheckbox = document.getElementById('isBreak');
    if (isBreakCheckbox) {
        isBreakCheckbox.addEventListener('change', function (e) {
            const breakTypeDiv = document.getElementById('breakTypeDiv');
            if (breakTypeDiv) {
                breakTypeDiv.classList.toggle('hidden', !e.target.checked);
            }
        });
    }
});

// ==================== UPDATE PERIOD ====================
async function updatePeriod(requestData) {
    try {
        showLoading(true);
        console.log('🔄 Updating period with data:', requestData);
        
        const response = await apiCall('/timetable/update-period', 'PUT', requestData);
        console.log('✅ Update response:', response);
        
        // Refresh timetable
        await fetchTimetable();
        closeModal();
        
    } catch (error) {
        console.error('❌ Error updating period:', error);
    } finally {
        hideLoading();
    }
}

// ==================== CREATE MODAL FUNCTIONS ====================
window.openCreateModal = function (mode, weekNum = 1, dayName = 'Monday') {
    console.log(`➕ Opening create modal: ${mode}, week ${weekNum}, day ${dayName}`);
    
    const createMode = document.getElementById('createMode');
    const contextWeek = document.getElementById('contextWeek');
    const contextDay = document.getElementById('contextDay');
    const contextText = document.getElementById('contextText');
    const createModalTitle = document.getElementById('createModalTitle');
    const daysContainer = document.getElementById('daysSelectionContainer');
    const createClass = document.getElementById('createClass');
    const createSection = document.getElementById('createSection');
    
    if (createMode) createMode.value = mode;
    if (contextWeek) contextWeek.value = weekNum;
    if (contextDay) contextDay.value = dayName;

    // Update context indicator
    if (contextText) {
        if (mode === 'day') {
            contextText.textContent = `Creating timetable for ${dayName}`;
            if (createModalTitle) createModalTitle.innerText = `Create Timetable for ${dayName}`;
        } else if (mode === 'week') {
            contextText.textContent = `Creating timetable for Week ${weekNum}`;
            if (createModalTitle) createModalTitle.innerText = `Create Timetable for Week ${weekNum}`;
        } else {
            contextText.textContent = `Creating timetable for Month`;
            if (createModalTitle) createModalTitle.innerText = `Create Timetable for Month`;
        }
    }

    // Show/hide days selection
    if (daysContainer) {
        daysContainer.classList.toggle('hidden', mode === 'day');
    }

    // Pre-fill class/section from filters
    if (createClass) {
        createClass.value = document.getElementById('classFilter')?.value || 'Class 10';
    }
    if (createSection) {
        createSection.value = document.getElementById('sectionFilter')?.value || 'A';
    }

    // Clear and add default period rows
    const container = document.getElementById('periodsContainer');
    if (container) {
        container.innerHTML = '';
        for (let i = 0; i < 5; i++) addPeriodRow();
    }

    const modal = document.getElementById('createTimetableModal');
    if (modal) modal.classList.add('active');
};

window.openCreateModalFromContext = function () {
    openCreateModal(currentView, 1, 'Monday');
};

window.closeCreateModal = function () {
    console.log('Closing create modal');
    const modal = document.getElementById('createTimetableModal');
    if (modal) modal.classList.remove('active');
};

window.addPeriodRow = function () {
    const container = document.getElementById('periodsContainer');
    if (!container) return;
    
    const rowId = 'period_' + Date.now() + '_' + Math.random();
    
    let teacherOptions = '<option value="Ravi Kumar">Ravi Kumar</option>';
    if (teachers && teachers.length > 0) {
        teacherOptions = teachers.map(t => {
            const teacherName = t.fullName || `${t.firstName || ''} ${t.lastName || ''}`.trim() || 'Unknown';
            return `<option value="${teacherName}">${teacherName}</option>`;
        }).join('');
    }
    
    const rowHtml = `
        <div class="period-row flex items-center gap-2 p-2 bg-gray-50 rounded" id="${rowId}">
            <select class="period-subject px-2 py-1 border rounded text-xs w-20">
                <option value="Mathematics">Math</option>
                <option value="Science">Sci</option>
                <option value="English">Eng</option>
                <option value="Hindi">Hindi</option>
                <option value="SST">SST</option>
                <option value="Computer">Comp</option>
            </select>
            <select class="period-teacher px-2 py-1 border rounded text-xs w-20">
                ${teacherOptions}
            </select>
            <input type="text" class="period-room px-2 py-1 border rounded text-xs w-16" placeholder="Rm" value="101">
            <select class="period-type px-2 py-1 border rounded text-xs w-16">
                <option value="classroom">Class</option>
                <option value="lab">Lab</option>
            </select>
            <input type="text" class="period-time-input px-2 py-1 border rounded text-xs w-24" placeholder="e.g., 9:00-9:45" value="9:00-9:45">
            <button type="button" onclick="removePeriodRow('${rowId}')" class="text-red-500 text-xs">
                <i class="fas fa-trash"></i>
            </button>
        </div>
    `;
    container.insertAdjacentHTML('beforeend', rowHtml);
};

window.removePeriodRow = function (rowId) {
    document.getElementById(rowId)?.remove();
};

// Create timetable form submission
document.addEventListener('DOMContentLoaded', function() {
    const createForm = document.getElementById('createTimetableForm');
    if (createForm) {
        createForm.addEventListener('submit', async function (e) {
            e.preventDefault();

            console.log('📝 Submitting create timetable form...');

            const mode = document.getElementById('createMode')?.value;
            const className = document.getElementById('createClass')?.value;
            const section = document.getElementById('createSection')?.value;
            const applyToAllDays = document.getElementById('applyToAllDays')?.checked || false;
            const applyToAllWeeks = document.getElementById('applyToAllWeeks')?.checked || false;
            const weekNum = parseInt(document.getElementById('contextWeek')?.value || '1');

            // Find class object to get class code
            const classObj = classes.find(c => 
                c.className === className && 
                (c.section === section || c.section === section)
            );

            if (!classObj) {
                console.error('❌ Class not found');
                return;
            }

            // Get selected days (if any)
            const selectedDays = [];
            document.querySelectorAll('.day-checkbox:checked').forEach(cb => selectedDays.push(cb.value));

            // Collect period data from rows
            const periodRows = document.querySelectorAll('#periodsContainer .period-row');
            const periodData = [];
            
            for (const [idx, row] of Array.from(periodRows).entries()) {
                const teacherName = row.querySelector('.period-teacher')?.value || 'Ravi Kumar';
                const teacher = teachers.find(t => 
                    (t.fullName === teacherName) || 
                    (`${t.firstName || ''} ${t.lastName || ''}`.trim() === teacherName)
                );
                
                periodData.push({
                    period: idx + 1,
                    subjectName: row.querySelector('.period-subject')?.value || 'Mathematics',
                    teacherId: teacher?.id || null,
                    roomNumber: row.querySelector('.period-room')?.value || '101',
                    roomType: row.querySelector('.period-type')?.value || 'classroom',
                    notes: ''
                });
            }

            // Determine target days based on mode and checkboxes
            let targetDays = [];
            if (mode === 'day') {
                targetDays = [document.getElementById('contextDay')?.value || 'Monday'];
            } else if (mode === 'week') {
                targetDays = applyToAllDays ? days : (selectedDays.length ? selectedDays : days);
            } else { // month
                targetDays = applyToAllDays ? days : (selectedDays.length ? selectedDays : days);
            }

            // Determine weeks to apply
            let weeksToApply = [];
            if (mode === 'month') {
                weeksToApply = applyToAllWeeks ? [1, 2, 3, 4] : [weekNum];
            } else {
                weeksToApply = [1];
            }

            console.log('Create request:', {
                mode,
                className,
                classCode: classObj.classCode,
                section,
                targetDays,
                weeksToApply,
                periods: periodData
            });

            // Create request for each week
            for (const week of weeksToApply) {
                const requestData = {
                    mode: mode,
                    className: className,
                    classCode: classObj.classCode,
                    section: section,
                    academicYear: '2024-2025',
                    targetDays: targetDays,
                    weekNumber: week,
                    applyToAllWeeks: applyToAllWeeks,
                    periods: periodData,
                    createdBy: 'admin'
                };

                await createTimetable(requestData);
            }
        });
    }
});

// ==================== CREATE TIMETABLE ====================
async function createTimetable(requestData) {
    try {
        showLoading(true);
        console.log('🔄 Creating timetable with data:', requestData);
        
        const response = await apiCall('/timetable/create', 'POST', requestData);
        console.log('✅ Create response:', response);
        
        await fetchTimetable();
        closeCreateModal();
        
    } catch (error) {
        console.error('❌ Error creating timetable:', error);
    } finally {
        hideLoading();
    }
}

// ==================== VIEW FUNCTIONS ====================
function switchView(view) {
    console.log(`🔄 Switching view to: ${view}`);
    currentView = view;
    ['day', 'week', 'month'].forEach(v => {
        const tab = document.getElementById(v + 'ViewTab');
        if (tab) tab.classList.toggle('active', v === view);
    });
    fetchTimetable();
}

function toggleMobileView() {
    isMobileView = !isMobileView;
    const mobileToggle = document.getElementById('mobileViewToggle');
    if (mobileToggle) {
        mobileToggle.classList.toggle('hidden', !isMobileView);
    }
    if (!isMobileView) isCardView = false;
}

function toggleCardView() {
    isCardView = !isCardView;
    renderTimetable();
}

// ==================== FILTER FUNCTIONS ====================
function filterChange() { 
    console.log('🔄 Filter changed');
    fetchTimetable(); 
}

function clearAllFilters() {
    console.log('🧹 Clearing all filters');
    const classFilter = document.getElementById('classFilter');
    const sectionFilter = document.getElementById('sectionFilter');
    const teacherFilter = document.getElementById('teacherFilter');
    const subjectFilter = document.getElementById('subjectFilter');
    
    if (classFilter && classes.length > 0) {
        classFilter.value = classes[0]?.className || 'Class 10';
    }
    if (sectionFilter) sectionFilter.value = 'A';
    if (teacherFilter) teacherFilter.value = '';
    if (subjectFilter) subjectFilter.value = '';
    
    fetchTimetable();
}

// ==================== CHECK CONFLICTS ====================
async function checkConflicts() {
    const classFilter = document.getElementById('classFilter');
    const sectionFilter = document.getElementById('sectionFilter');
    
    if (!classFilter || !sectionFilter) return;
    
    try {
        showLoading(true);
        console.log('🔍 Checking for conflicts...');
        
        const response = await apiCall('/timetable/check-conflicts', 'POST', {
            className: classFilter.value,
            section: sectionFilter.value,
            academicYear: '2024-2025',
            weekNumber: currentView === 'week' ? 1 : null
        });
        
        console.log('Conflicts check result:', response);
        
        if (response && response.conflicts && response.conflicts.length > 0) {
            console.warn(`⚠️ Found ${response.conflicts.length} conflicts:`, response.conflicts);
            showConflicts(response.conflicts);
        } else {
            console.log('✅ No conflicts found');
        }
    } catch (error) {
        console.error('❌ Error checking conflicts:', error);
    } finally {
        hideLoading();
    }
}

function showConflicts(conflicts) {
    if (!conflicts || conflicts.length === 0) {
        console.log('✅ No conflicts found');
        return;
    }
    
    console.warn(`⚠️ ${conflicts.length} conflict(s) found:`);
    conflicts.forEach((c, i) => {
        console.warn(`  ${i+1}. ${c.message || 'Conflict detected'}`);
    });
}

// ==================== COPY SCHEDULE ====================
async function copySchedule(sourceDay, targetDays) {
    const classFilter = document.getElementById('classFilter');
    const sectionFilter = document.getElementById('sectionFilter');
    
    if (!classFilter || !sectionFilter) return;
    
    if (!confirm(`Copy ${sourceDay} schedule to all other days?`)) {
        return;
    }
    
    try {
        showLoading(true);
        console.log(`📋 Copying schedule from ${sourceDay} to:`, targetDays);
        
        const response = await apiCall('/timetable/copy', 'POST', {
            action: 'copy',
            source: {
                className: classFilter.value,
                section: sectionFilter.value,
                academicYear: '2024-2025',
                day: sourceDay,
                weekNumber: 1
            },
            destination: {
                targetDays: targetDays,
                weekNumbers: [1],
                overrideExisting: true
            },
            updatedBy: 'admin'
        });
        
        console.log('✅ Copy response:', response);
        await fetchTimetable();
        
    } catch (error) {
        console.error('❌ Error copying schedule:', error);
    } finally {
        hideLoading();
    }
}

// ==================== CLEAR DAY ====================
async function clearDay(day) {
    if (!confirm(`Are you sure you want to clear all periods for ${day}?`)) {
        return;
    }
    
    const classFilter = document.getElementById('classFilter');
    const sectionFilter = document.getElementById('sectionFilter');
    
    if (!classFilter || !sectionFilter) return;
    
    try {
        showLoading(true);
        console.log(`🧹 Clearing day: ${day}`);
        
        const response = await apiCall('/timetable/clear-day', 'DELETE', {
            className: classFilter.value,
            section: sectionFilter.value,
            academicYear: '2024-2025',
            day: day,
            weekNumber: 1,
            updatedBy: 'admin'
        });
        
        console.log('✅ Clear response:', response);
        await fetchTimetable();
        
    } catch (error) {
        console.error('❌ Error clearing day:', error);
    } finally {
        hideLoading();
    }
}

// ==================== UNDO/REDO ====================
function saveToUndo() {
    undoStack.push(JSON.parse(JSON.stringify(slots)));
    redoStack = [];
    console.log('💾 Saved to undo stack');
}

function undo() {
    if (undoStack.length > 0) {
        redoStack.push(JSON.parse(JSON.stringify(slots)));
        slots = undoStack.pop();
        renderTimetable();
        console.log('↩️ Undo successful');
    } else {
        console.log('⚠️ Nothing to undo');
    }
}

function redo() {
    if (redoStack.length > 0) {
        undoStack.push(JSON.parse(JSON.stringify(slots)));
        slots = redoStack.pop();
        renderTimetable();
        console.log('↪️ Redo successful');
    } else {
        console.log('⚠️ Nothing to redo');
    }
}

// ==================== KEYBOARD SHORTCUTS ====================
document.addEventListener('keydown', function (e) {
    if (e.ctrlKey || e.metaKey) {
        switch (e.key.toLowerCase()) {
            case 's': e.preventDefault(); console.log('💾 Save shortcut pressed'); break;
            case 'f': e.preventDefault(); document.getElementById('globalSearch')?.focus(); break;
            case 'z': e.preventDefault(); if (e.shiftKey) redo(); else undo(); break;
            case 'y': e.preventDefault(); redo(); break;
        }
    }
});

// ==================== SEARCH ====================
document.addEventListener('DOMContentLoaded', function() {
    const globalSearch = document.getElementById('globalSearch');
    if (globalSearch) {
        globalSearch.addEventListener('input', function (e) {
            const searchTerm = e.target.value.toLowerCase();
            console.log('🔍 Searching for:', searchTerm);
            
            if (searchTerm.length < 2) { 
                renderTimetable(); 
                return; 
            }

            // Highlight matching cells
            const filtered = slots.filter(slot =>
                slot.teacher.toLowerCase().includes(searchTerm) ||
                slot.subject.toLowerCase().includes(searchTerm) ||
                slot.room.toLowerCase().includes(searchTerm)
            );

            console.log(`Found ${filtered.length} matches`);

            // Remove all highlights first
            document.querySelectorAll('.period-cell, .month-period-item, .week-period-item, .day-period-block').forEach(el => {
                el.style.backgroundColor = '';
            });

            // Add highlights
            filtered.forEach(slot => {
                const selector = `.period-cell[data-day="${slot.day}"][data-period="${slot.period}"], 
                                 .month-period-item[onclick*="${slot.day}"][onclick*="${slot.period}"],
                                 .week-period-item[onclick*="${slot.day}"][onclick*="${slot.period}"],
                                 .day-period-block[onclick*="${slot.day}"][onclick*="${slot.period}"]`;

                document.querySelectorAll(selector).forEach(el => {
                    el.style.backgroundColor = '#fef9c3';
                });
            });
        });
    }
});

// ==================== SIDEBAR FUNCTIONS ====================
let sidebarCollapsed = false;
let isMobile = window.innerWidth < 1024;

function setupResponsiveSidebar() {
    isMobile = window.innerWidth < 1024;
    if (isMobile) closeMobileSidebar();
    else {
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
        if (isMobile) closeMobileSidebar();
        else {
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
        if (sidebar?.classList.contains('mobile-open')) closeMobileSidebar();
        else openMobileSidebar();
    } else {
        const sidebar = document.getElementById('sidebar');
        const mainContent = document.getElementById('mainContent');
        sidebarCollapsed = !sidebarCollapsed;
        if (sidebarCollapsed) {
            sidebar?.classList.add('collapsed');
            mainContent?.classList.add('sidebar-collapsed');
            const icon = document.getElementById('sidebarToggleIcon');
            if (icon) icon.className = 'fas fa-bars text-xl';
        } else {
            sidebar?.classList.remove('collapsed');
            mainContent?.classList.remove('sidebar-collapsed');
            const icon = document.getElementById('sidebarToggleIcon');
            if (icon) icon.className = 'fas fa-times text-xl';
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

function toggleNotifications() {
    const dropdown = document.getElementById('notificationsDropdown');
    if (dropdown) dropdown.classList.toggle('hidden');
}

function toggleUserMenu() {
    const dropdown = document.getElementById('userMenuDropdown');
    if (dropdown) dropdown.classList.toggle('hidden');
}

// ==================== INITIALIZATION ====================
document.addEventListener('DOMContentLoaded', function () {
    console.log('🚀 Page loaded, initializing...');
    
    setupResponsiveSidebar();
    initializeData();

    const sidebarToggle = document.getElementById('sidebarToggle');
    const notificationsBtn = document.getElementById('notificationsBtn');
    const userMenuBtn = document.getElementById('userMenuBtn');
    const sidebarOverlay = document.getElementById('sidebarOverlay');
    
    if (sidebarToggle) sidebarToggle.addEventListener('click', toggleSidebar);
    if (notificationsBtn) notificationsBtn.addEventListener('click', toggleNotifications);
    if (userMenuBtn) userMenuBtn.addEventListener('click', toggleUserMenu);

    document.addEventListener('click', function (event) {
        const notificationsDropdown = document.getElementById('notificationsDropdown');
        const userMenuDropdown = document.getElementById('userMenuDropdown');
        const exportMenu = document.getElementById('exportMenu');
        
        if (!event.target.closest('#notificationsBtn') && notificationsDropdown) {
            notificationsDropdown.classList.add('hidden');
        }
        if (!event.target.closest('#userMenuBtn') && userMenuDropdown) {
            userMenuDropdown.classList.add('hidden');
        }
        if (!event.target.closest('.relative') && exportMenu) {
            exportMenu.classList.add('hidden');
        }
    });

    if (sidebarOverlay) {
        sidebarOverlay.addEventListener('click', closeMobileSidebar);
    }
    
    // Add copy functionality to week view
    window.copyDay = function(sourceDay) {
        const targetDays = days.filter(d => d !== sourceDay);
        copySchedule(sourceDay, targetDays);
    };
});

// Debug function to check API
window.checkAPI = async function() {
    console.log('🔍 Checking API endpoints...');
    
    const endpoints = [
        '/timetable?className=Class%2010&section=A&academicYear=2024-2025',
        '/classes/get-all-classes',
        '/teachers/get-all-teachers'
    ];
    
    for (const endpoint of endpoints) {
        try {
            console.log(`\n📡 Testing: ${endpoint}`);
            const response = await fetch(`${API_BASE_URL}${endpoint}`, {
                headers: { 'Authorization': `Bearer ${authToken}` }
            });
            console.log(`Status: ${response.status}`);
            const data = await response.json();
            console.log('Response:', data);
        } catch (err) {
            console.error(`Error: ${err.message}`);
        }
    }
};

console.log('💡 Debug helper: type checkAPI() to test endpoints');