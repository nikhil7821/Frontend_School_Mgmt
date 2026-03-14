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

        // Break periods
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

        // Sample slots
        let slots = [
            // Monday
            { day: 'Monday', period: 1, class: 'Class 10', section: 'A', subject: 'Mathematics', teacher: 'Ravi Kumar', room: '101', roomType: 'classroom', notes: '' },
            { day: 'Monday', period: 2, class: 'Class 10', section: 'A', subject: 'Science', teacher: 'Priya Singh', room: 'Lab 1', roomType: 'lab', notes: 'Lab session' },
            { day: 'Monday', period: 4, class: 'Class 10', section: 'A', subject: 'English', teacher: 'Amit Sharma', room: '102', roomType: 'classroom', notes: '' },
            { day: 'Monday', period: 6, class: 'Class 10', section: 'A', subject: 'Hindi', teacher: 'Neha Gupta', room: '103', roomType: 'classroom', notes: '' },
            { day: 'Monday', period: 7, class: 'Class 10', section: 'A', subject: 'SST', teacher: 'Rajesh Patel', room: '104', roomType: 'classroom', notes: '' },
            { day: 'Monday', period: 8, class: 'Class 10', section: 'A', subject: 'Computer', teacher: 'Ravi Kumar', room: 'Lab 2', roomType: 'lab', notes: 'Programming' },

            // Tuesday
            { day: 'Tuesday', period: 1, class: 'Class 10', section: 'A', subject: 'Science', teacher: 'Priya Singh', room: 'Lab 1', roomType: 'lab', notes: 'Chemistry practical' },
            { day: 'Tuesday', period: 2, class: 'Class 10', section: 'A', subject: 'Mathematics', teacher: 'Ravi Kumar', room: '101', roomType: 'classroom', notes: '' },
            { day: 'Tuesday', period: 4, class: 'Class 10', section: 'A', subject: 'Hindi', teacher: 'Neha Gupta', room: '103', roomType: 'classroom', notes: '' },
            { day: 'Tuesday', period: 6, class: 'Class 10', section: 'A', subject: 'English', teacher: 'Amit Sharma', room: '102', roomType: 'classroom', notes: '' },
            { day: 'Tuesday', period: 7, class: 'Class 10', section: 'A', subject: 'SST', teacher: 'Rajesh Patel', room: '104', roomType: 'classroom', notes: '' },

            // Wednesday
            { day: 'Wednesday', period: 1, class: 'Class 10', section: 'A', subject: 'English', teacher: 'Amit Sharma', room: '102', roomType: 'classroom', notes: '' },
            { day: 'Wednesday', period: 2, class: 'Class 10', section: 'A', subject: 'Mathematics', teacher: 'Ravi Kumar', room: '101', roomType: 'classroom', notes: '' },
            { day: 'Wednesday', period: 4, class: 'Class 10', section: 'A', subject: 'Science', teacher: 'Priya Singh', room: 'Lab 1', roomType: 'lab', notes: 'Physics lab' },
            { day: 'Wednesday', period: 6, class: 'Class 10', section: 'A', subject: 'SST', teacher: 'Rajesh Patel', room: '104', roomType: 'classroom', notes: '' },
            { day: 'Wednesday', period: 7, class: 'Class 10', section: 'A', subject: 'Hindi', teacher: 'Neha Gupta', room: '103', roomType: 'classroom', notes: '' },

            // Thursday
            { day: 'Thursday', period: 1, class: 'Class 10', section: 'A', subject: 'Hindi', teacher: 'Neha Gupta', room: '103', roomType: 'classroom', notes: '' },
            { day: 'Thursday', period: 2, class: 'Class 10', section: 'A', subject: 'Science', teacher: 'Priya Singh', room: 'Lab 1', roomType: 'lab', notes: 'Biology lab' },
            { day: 'Thursday', period: 4, class: 'Class 10', section: 'A', subject: 'Mathematics', teacher: 'Ravi Kumar', room: '101', roomType: 'classroom', notes: '' },
            { day: 'Thursday', period: 6, class: 'Class 10', section: 'A', subject: 'English', teacher: 'Amit Sharma', room: '102', roomType: 'classroom', notes: '' },
            { day: 'Thursday', period: 7, class: 'Class 10', section: 'A', subject: 'Computer', teacher: 'Ravi Kumar', room: 'Lab 2', roomType: 'lab', notes: 'Web development' },

            // Friday
            { day: 'Friday', period: 1, class: 'Class 10', section: 'A', subject: 'SST', teacher: 'Rajesh Patel', room: '104', roomType: 'classroom', notes: '' },
            { day: 'Friday', period: 2, class: 'Class 10', section: 'A', subject: 'English', teacher: 'Amit Sharma', room: '102', roomType: 'classroom', notes: '' },
            { day: 'Friday', period: 4, class: 'Class 10', section: 'A', subject: 'Science', teacher: 'Priya Singh', room: 'Lab 1', roomType: 'lab', notes: 'Practical exam' },
            { day: 'Friday', period: 6, class: 'Class 10', section: 'A', subject: 'Mathematics', teacher: 'Ravi Kumar', room: '101', roomType: 'classroom', notes: '' },
            { day: 'Friday', period: 7, class: 'Class 10', section: 'A', subject: 'Hindi', teacher: 'Neha Gupta', room: '103', roomType: 'classroom', notes: '' }
        ];

        // Undo stack
        let undoStack = [];
        let redoStack = [];

        // Current view state
        let currentView = 'month';
        let isMobileView = false;
        let isCardView = false;

        // ==================== RENDER FUNCTIONS ====================
        function renderTimetable() {
            const container = document.getElementById('timetableContainer');
            const classFilter = document.getElementById('classFilter').value;
            const sectionFilter = document.getElementById('sectionFilter').value;
            const teacherFilter = document.getElementById('teacherFilter').value;
            const subjectFilter = document.getElementById('subjectFilter').value;

            let filteredSlots = slots.filter(s => s.class === classFilter && s.section === sectionFilter);

            if (teacherFilter) {
                filteredSlots = filteredSlots.filter(s => s.teacher === teacherFilter);
            }

            if (subjectFilter) {
                filteredSlots = filteredSlots.filter(s => s.subject === subjectFilter);
            }

            let html = '';

            // Update view indicator
            const viewIndicator = document.getElementById('viewIndicatorText');

            if (currentView === 'month') {
                viewIndicator.textContent = `Currently viewing: Month View (All Weeks) for ${classFilter} - Section ${sectionFilter}`;
                html = renderMonthView(filteredSlots, classFilter, sectionFilter);
            } else if (currentView === 'week') {
                viewIndicator.textContent = `Currently viewing: Week View (All Days) for ${classFilter} - Section ${sectionFilter}`;
                html = renderWeekView(filteredSlots, classFilter, sectionFilter);
            } else {
                viewIndicator.textContent = `Currently viewing: Day View (All Days) for ${classFilter} - Section ${sectionFilter}`;
                html = renderDayView(filteredSlots, classFilter, sectionFilter);
            }

            container.innerHTML = html;
            checkAllConflicts();
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
                                <i class="far fa-calendar-alt mr-2 text-blue-600"></i>${week}
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
                    const daySlots = filteredSlots.filter(s => s.day === day).sort((a, b) => a.period - b.period);
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
                            const subjectClass = getSubjectClass(slot.subject);
                            const isBreak = breaks.some(b => b.day === day && b.period === slot.period);
                            if (isBreak) {
                                const breakType = breaks.find(b => b.day === day && b.period === slot.period).type;
                                html += `
                                    <div class="month-period-item break-cell" onclick="openEditModal('${day}', ${slot.period})">
                                        <span class="month-period-time">P${slot.period}</span>
                                        <span class="break-text ml-1">${breakType}</span>
                                    </div>
                                `;
                            } else {
                                html += `
                                    <div class="month-period-item  ${subjectClass}" onclick="openEditModal('${day}', ${slot.period})">
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
                        const subjectClass = getSubjectClass(slot.subject);
                        const isBreak = breaks.some(b => b.day === day && b.period === slot.period);
                        if (isBreak) {
                            const breakType = breaks.find(b => b.day === day && b.period === slot.period).type;
                            html += `
                                <div class="week-period-item break-cell" onclick="openEditModal('${day}', ${slot.period})">
                                    <span class="week-period-time">P${slot.period} (${slot.time || periods[slot.period - 1]?.time})</span>
                                    <span class="break-text ml-1 block">${breakType}</span>
                                </div>
                            `;
                        } else {
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
                const totalPeriods = daySlots.length;
                const filledPeriods = daySlots.filter(s => !breaks.some(b => b.day === day && b.period === s.period)).length;

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
                                    <i class="fas fa-book mr-1"></i>${totalPeriods} Periods
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
                    const isBreak = breaks.some(b => b.day === day && b.period === periodNum);
                    const periodTime = periods.find(p => p.num === periodNum)?.time || '';

                    if (isBreak) {
                        const breakType = breaks.find(b => b.day === day && b.period === periodNum).type;
                        html += `
                            <div class="day-period-block break-block" onclick="openEditModal('${day}', ${periodNum})">
                                <span class="day-period-time">Period ${periodNum} (${periodTime})</span>
                                <span class="day-period-subject break-text">${breakType}</span>
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

        // ==================== CONFLICT CHECKING ====================
        function checkConflict(slot, day, period) {
            if (!slot) return false;
            const teacherConflict = slots.some(s =>
                s.day === day && s.period === period && s.teacher === slot.teacher && (s.class !== slot.class || s.section !== slot.section));
            const roomConflict = slots.some(s =>
                s.day === day && s.period === period && s.room === slot.room && (s.class !== slot.class || s.section !== slot.section));
            return teacherConflict || roomConflict;
        }

        function checkAllConflicts() {
            let conflicts = [];
            slots.forEach(slot => {
                if (checkConflict(slot, slot.day, slot.period)) conflicts.push(slot);
            });
            return conflicts;
        }

        // ==================== MODAL FUNCTIONS ====================
        window.openEditModal = function (day, period) {
            document.getElementById('modalDay').value = day;
            document.getElementById('modalPeriod').value = period;
            const isBreak = breaks.some(b => b.day === day && b.period === period);
            const slot = slots.find(s => s.day === day && s.period === period);
            document.getElementById('isBreak').checked = isBreak;
            document.getElementById('breakTypeDiv').classList.toggle('hidden', !isBreak);

            if (slot) {
                document.getElementById('classSelect').value = slot.class;
                document.getElementById('sectionSelect').value = slot.section;
                document.getElementById('subjectSelect').value = slot.subject;
                document.getElementById('teacherSelect').value = slot.teacher;
                document.getElementById('roomInput').value = slot.room;
                document.getElementById('roomType').value = slot.roomType || 'classroom';
                document.getElementById('slotNotes').value = slot.notes || '';
            } else {
                document.getElementById('classSelect').value = document.getElementById('classFilter').value;
                document.getElementById('sectionSelect').value = document.getElementById('sectionFilter').value;
                document.getElementById('subjectSelect').value = 'Mathematics';
                document.getElementById('teacherSelect').value = 'Ravi Kumar';
                document.getElementById('roomInput').value = '101';
                document.getElementById('roomType').value = 'classroom';
                document.getElementById('slotNotes').value = '';
            }
            document.getElementById('slotModal').classList.add('active');
        };

        window.closeModal = function () {
            document.getElementById('slotModal').classList.remove('active');
            document.getElementById('slotForm').reset();
            document.getElementById('breakTypeDiv').classList.add('hidden');
        };

        document.getElementById('slotForm').addEventListener('submit', function (e) {
            e.preventDefault();
            saveToUndo();
            const day = document.getElementById('modalDay').value;
            const period = parseInt(document.getElementById('modalPeriod').value);
            const isBreak = document.getElementById('isBreak').checked;
            const classFilter = document.getElementById('classFilter').value;
            const sectionFilter = document.getElementById('sectionFilter').value;

            // Remove existing slot
            const index = slots.findIndex(s => s.day === day && s.period === period && s.class === classFilter && s.section === sectionFilter);
            if (index !== -1) slots.splice(index, 1);

            if (!isBreak) {
                slots.push({
                    day: day,
                    period: period,
                    class: document.getElementById('classSelect').value,
                    section: document.getElementById('sectionSelect').value,
                    subject: document.getElementById('subjectSelect').value,
                    teacher: document.getElementById('teacherSelect').value,
                    room: document.getElementById('roomInput').value,
                    roomType: document.getElementById('roomType').value,
                    notes: document.getElementById('slotNotes').value,
                    time: periods[period - 1]?.time || ''
                });
            }

            renderTimetable();
            showToast('Time slot saved successfully!');
            closeModal();
        });

        document.getElementById('isBreak').addEventListener('change', function (e) {
            document.getElementById('breakTypeDiv').classList.toggle('hidden', !e.target.checked);
        });

        // ==================== CREATE MODAL FUNCTIONS ====================
        window.openCreateModal = function (mode, weekNum = 1, dayName = 'Monday') {
            document.getElementById('createMode').value = mode;
            document.getElementById('contextWeek').value = weekNum;
            document.getElementById('contextDay').value = dayName;

            // Update context indicator
            const contextText = document.getElementById('contextText');
            if (mode === 'day') {
                contextText.textContent = `Creating timetable for ${dayName}`;
                document.getElementById('createModalTitle').innerText = `Create Timetable for ${dayName}`;
            } else if (mode === 'week') {
                contextText.textContent = `Creating timetable for Week ${weekNum}`;
                document.getElementById('createModalTitle').innerText = `Create Timetable for Week ${weekNum}`;
            } else {
                contextText.textContent = `Creating timetable for Month`;
                document.getElementById('createModalTitle').innerText = `Create Timetable for Month`;
            }

            // Show/hide days selection
            const daysContainer = document.getElementById('daysSelectionContainer');
            daysContainer.classList.toggle('hidden', mode === 'day');

            // Pre-fill class/section from filters
            document.getElementById('createClass').value = document.getElementById('classFilter').value;
            document.getElementById('createSection').value = document.getElementById('sectionFilter').value;

            // Clear and add default period rows
            const container = document.getElementById('periodsContainer');
            container.innerHTML = '';
            for (let i = 0; i < 5; i++) addPeriodRow();

            document.getElementById('createTimetableModal').classList.add('active');
        };

        window.openCreateModalFromContext = function () {
            openCreateModal(currentView, 1, 'Monday');
        };

        window.closeCreateModal = function () {
            document.getElementById('createTimetableModal').classList.remove('active');
        };

        window.addPeriodRow = function () {
            const container = document.getElementById('periodsContainer');
            const rowId = 'period_' + Date.now() + '_' + Math.random();
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
                        <option value="Ravi Kumar">Ravi</option>
                        <option value="Priya Singh">Priya</option>
                        <option value="Amit Sharma">Amit</option>
                        <option value="Neha Gupta">Neha</option>
                        <option value="Rajesh Patel">Rajesh</option>
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

        document.getElementById('createTimetableForm').addEventListener('submit', function (e) {
            e.preventDefault();

            const mode = document.getElementById('createMode').value;
            const className = document.getElementById('createClass').value;
            const section = document.getElementById('createSection').value;
            const applyToAllDays = document.getElementById('applyToAllDays').checked;
            const applyToAllWeeks = document.getElementById('applyToAllWeeks').checked;
            const weekNum = parseInt(document.getElementById('contextWeek').value);

            // Get selected days (if any)
            const selectedDays = [];
            document.querySelectorAll('.day-checkbox:checked').forEach(cb => selectedDays.push(cb.value));

            // Collect period data from rows
            const periodRows = document.querySelectorAll('#periodsContainer .period-row');
            const periodData = [];
            periodRows.forEach((row, idx) => {
                const subject = row.querySelector('.period-subject')?.value || 'Mathematics';
                const teacher = row.querySelector('.period-teacher')?.value || 'Ravi Kumar';
                const room = row.querySelector('.period-room')?.value || '101';
                const roomType = row.querySelector('.period-type')?.value || 'classroom';
                const timeRange = row.querySelector('.period-time-input')?.value || periods[idx]?.time || '9:00-9:45';
                periodData.push({
                    period: idx + 1,
                    subject,
                    teacher,
                    room,
                    roomType,
                    time: timeRange,
                    notes: ''
                });
            });

            // Determine target days based on mode and checkboxes
            let targetDays = [];
            if (mode === 'day') {
                targetDays = [document.getElementById('contextDay').value];
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

            saveToUndo();

            // For each week (only relevant for month mode)
            weeksToApply.forEach(week => {
                targetDays.forEach(day => {
                    // Remove existing slots for this class/section on that day
                    slots = slots.filter(s => !(s.class === className && s.section === section && s.day === day));

                    // Add new periods
                    periodData.forEach(p => {
                        slots.push({
                            day: day,
                            period: p.period,
                            class: className,
                            section: section,
                            subject: p.subject,
                            teacher: p.teacher,
                            room: p.room,
                            roomType: p.roomType,
                            notes: p.notes,
                            time: p.time
                        });
                    });
                });
            });

            renderTimetable();
            closeCreateModal();
            showToast(`Timetable created for ${mode} view`);
        });

        // ==================== VIEW FUNCTIONS ====================
        function switchView(view) {
            currentView = view;
            ['day', 'week', 'month'].forEach(v => {
                const tab = document.getElementById(v + 'ViewTab');
                if (tab) tab.classList.toggle('active', v === view);
            });
            renderTimetable();
        }

        function toggleMobileView() {
            isMobileView = !isMobileView;
            document.getElementById('mobileViewToggle').classList.toggle('hidden', !isMobileView);
            if (!isMobileView) isCardView = false;
        }

        function toggleCardView() {
            isCardView = !isCardView;
            renderTimetable();
        }

        // ==================== FILTER FUNCTIONS ====================
        function filterChange() { renderTimetable(); }

        function clearAllFilters() {
            document.getElementById('classFilter').value = 'Class 10';
            document.getElementById('sectionFilter').value = 'A';
            document.getElementById('teacherFilter').value = '';
            document.getElementById('subjectFilter').value = '';
            renderTimetable();
            showToast('All filters cleared');
        }

        // ==================== UNDO/REDO ====================
        function saveToUndo() {
            undoStack.push(JSON.parse(JSON.stringify(slots)));
            redoStack = [];
        }

        function undo() {
            if (undoStack.length > 0) {
                redoStack.push(JSON.parse(JSON.stringify(slots)));
                slots = undoStack.pop();
                renderTimetable();
                showToast('Undo successful');
            } else showToast('Nothing to undo', 'error');
        }

        function redo() {
            if (redoStack.length > 0) {
                undoStack.push(JSON.parse(JSON.stringify(slots)));
                slots = redoStack.pop();
                renderTimetable();
                showToast('Redo successful');
            } else showToast('Nothing to redo', 'error');
        }

        // ==================== KEYBOARD SHORTCUTS ====================
        document.addEventListener('keydown', function (e) {
            if (e.ctrlKey || e.metaKey) {
                switch (e.key.toLowerCase()) {
                    case 's': e.preventDefault(); showToast('Timetable saved'); break;
                    case 'f': e.preventDefault(); document.getElementById('globalSearch').focus(); break;
                    case 'z': e.preventDefault(); if (e.shiftKey) redo(); else undo(); break;
                    case 'y': e.preventDefault(); redo(); break;
                }
            }
            const hint = document.getElementById('shortcutHint');
            hint.classList.add('show');
            setTimeout(() => hint.classList.remove('show'), 3000);
        });

        // ==================== SEARCH ====================
        document.getElementById('globalSearch').addEventListener('input', function (e) {
            const searchTerm = e.target.value.toLowerCase();
            if (searchTerm.length < 2) { renderTimetable(); return; }

            // Highlight matching cells
            const filtered = slots.filter(slot =>
                slot.teacher.toLowerCase().includes(searchTerm) ||
                slot.subject.toLowerCase().includes(searchTerm) ||
                slot.room.toLowerCase().includes(searchTerm)
            );

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

        // ==================== EXPORT FUNCTIONS ====================
        window.exportToExcel = function () {
            const classVal = document.getElementById('classFilter').value;
            const sectionVal = document.getElementById('sectionFilter').value;
            const data = [['Day/Period', ...periods.map(p => `P${p.num} (${p.time})`)]];

            days.forEach(day => {
                const row = [day];
                periods.forEach(p => {
                    const isBreak = breaks.some(b => b.day === day && b.period === p.num);
                    const slot = slots.find(s => s.day === day && s.period === p.num);
                    if (isBreak) row.push(breaks.find(b => b.day === day && b.period === p.num).type);
                    else if (slot) row.push(`${slot.subject}\n${slot.teacher}\nRm${slot.room}`);
                    else row.push('-');
                });
                data.push(row);
            });

            const wb = XLSX.utils.book_new();
            const ws = XLSX.utils.aoa_to_sheet(data);
            XLSX.utils.book_append_sheet(wb, ws, `${classVal}-${sectionVal}`);
            XLSX.writeFile(wb, `timetable_${classVal}_${sectionVal}.xlsx`);
            showToast('Excel exported successfully!');
        };

        window.exportToPDF = function () {
            const { jsPDF } = window.jspdf;
            const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
            const classVal = document.getElementById('classFilter').value;
            const sectionVal = document.getElementById('sectionFilter').value;

            doc.setFontSize(14);
            doc.text(`${classVal} - Section ${sectionVal} Timetable`, 14, 15);
            doc.setFontSize(8);
            doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 22);

            const headers = ['Day', ...periods.map(p => `P${p.num}\n${p.time}`)];
            const body = days.map(day => {
                const row = [day];
                periods.forEach(p => {
                    const isBreak = breaks.some(b => b.day === day && b.period === p.num);
                    const slot = slots.find(s => s.day === day && s.period === p.num);
                    if (isBreak) row.push(breaks.find(b => b.day === day && b.period === p.num).type);
                    else if (slot) row.push(`${slot.subject}\n${slot.teacher}`);
                    else row.push('-');
                });
                return row;
            });

            doc.autoTable({
                head: [headers],
                body: body,
                startY: 30,
                styles: { fontSize: 7, cellPadding: 2 },
                columnStyles: { 0: { cellWidth: 20 } }
            });

            doc.save(`timetable_${classVal}_${sectionVal}.pdf`);
            showToast('PDF exported successfully!');
        };

        window.exportToCSV = function () {
            const classVal = document.getElementById('classFilter').value;
            const sectionVal = document.getElementById('sectionFilter').value;
            let csv = 'Day';
            periods.forEach(p => csv += `,P${p.num} (${p.time})`);
            csv += '\n';

            days.forEach(day => {
                csv += day;
                periods.forEach(p => {
                    const isBreak = breaks.some(b => b.day === day && b.period === p.num);
                    const slot = slots.find(s => s.day === day && s.period === p.num);
                    if (isBreak) csv += `,${breaks.find(b => b.day === day && b.period === p.num).type}`;
                    else if (slot) csv += `,${slot.subject} - ${slot.teacher}`;
                    else csv += ',-';
                });
                csv += '\n';
            });

            const blob = new Blob([csv], { type: 'text/csv' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `timetable_${classVal}_${sectionVal}.csv`;
            a.click();
            showToast('CSV exported successfully!');
        };

        window.printTimetable = function () { window.print(); };

        function toggleExportMenu() {
            document.getElementById('exportMenu').classList.toggle('hidden');
        }

        // ==================== TOAST ====================
        function showToast(msg, type = 'success') {
            const toast = document.createElement('div');
            toast.className = 'toast';
            toast.style.background = type === 'success' ? '#10b981' : '#ef4444';
            toast.innerHTML = `<i class="fas ${type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle'} mr-2"></i>${msg}`;
            document.getElementById('toastContainer').appendChild(toast);
            setTimeout(() => toast.remove(), 3000);
        }

        // ==================== SESSION & SIDEBAR ====================
        let sidebarCollapsed = false;
        let isMobile = window.innerWidth < 1024;

        // function checkSession() {
        //     if (!localStorage.getItem('school_portal_session')) {
        //         localStorage.setItem('school_portal_session', JSON.stringify({
        //             username: 'admin',
        //             role: 'admin',
        //             expires: new Date(Date.now() + 86400000).toISOString()
        //         }));
        //     }
        // }

        // function handleLogout() {
        //     if (confirm('Logout?')) {
        //         localStorage.removeItem('school_portal_session');
        //         window.location.href = 'login.html';
        //     }
        // }

        function setupResponsiveSidebar() {
            isMobile = window.innerWidth < 1024;
            if (isMobile) closeMobileSidebar();
            else {
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
                if (isMobile) closeMobileSidebar();
                else {
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
                if (sidebar.classList.contains('mobile-open')) closeMobileSidebar();
                else openMobileSidebar();
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
            document.getElementById('sidebar').classList.add('mobile-open');
            document.getElementById('sidebarOverlay').classList.add('active');
            document.body.classList.add('sidebar-open');
        }

        function closeMobileSidebar() {
            document.getElementById('sidebar').classList.remove('mobile-open');
            document.getElementById('sidebarOverlay').classList.remove('active');
            document.body.classList.remove('sidebar-open');
        }

        function toggleNotifications() {
            document.getElementById('notificationsDropdown').classList.toggle('hidden');
        }

        function toggleUserMenu() {
            document.getElementById('userMenuDropdown').classList.toggle('hidden');
        }

        // Initialize
        document.addEventListener('DOMContentLoaded', function () {
            // checkSession();
            setupResponsiveSidebar();
            renderTimetable();

            document.getElementById('sidebarToggle').addEventListener('click', toggleSidebar);
            document.getElementById('notificationsBtn').addEventListener('click', toggleNotifications);
            document.getElementById('userMenuBtn').addEventListener('click', toggleUserMenu);
            // document.getElementById('logoutBtn').addEventListener('click', handleLogout);

            document.addEventListener('click', function (event) {
                if (!event.target.closest('#notificationsBtn')) document.getElementById('notificationsDropdown').classList.add('hidden');
                if (!event.target.closest('#userMenuBtn')) document.getElementById('userMenuDropdown').classList.add('hidden');
                if (!event.target.closest('.relative') && document.getElementById('exportMenu')) document.getElementById('exportMenu').classList.add('hidden');
            });

            document.getElementById('sidebarOverlay').addEventListener('click', closeMobileSidebar);
        });