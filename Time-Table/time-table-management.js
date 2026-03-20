// ============================================================
// TIME TABLE MANAGEMENT — FULLY DYNAMIC (no hardcoded data)
// All classes, sections, subjects, teachers from backend API
// ============================================================

const API_BASE_URL = 'http://localhost:8084/api';
let authToken = localStorage.getItem('admin_jwt_token');

// ─── Period time labels (static, UI-only) ───────────────────
const PERIOD_TIMES = [
    { num: 1, time: '9:00-9:45'   },
    { num: 2, time: '9:45-10:30'  },
    { num: 3, time: '10:30-11:15' },
    { num: 4, time: '11:30-12:15' },
    { num: 5, time: '12:15-1:00'  },
    { num: 6, time: '1:45-2:30'   },
    { num: 7, time: '2:30-3:15'   },
    { num: 8, time: '3:15-4:00'   }
];

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

// ─── Runtime state ───────────────────────────────────────────
let classes       = [];   // raw from /classes/get-all-classes
let teachers      = [];   // raw from /teachers/get-all-teachers
let allSubjects   = [];   // extracted dynamically from existing slots + fresh ones
let slots         = [];   // current timetable slots
let timetableBreaks = []; // dynamic breaks

let currentView      = 'month';
let sidebarCollapsed = false;
let isMobile         = window.innerWidth < 1024;

// ─── Logging helpers ─────────────────────────────────────────
const log  = (...a) => console.log ('[TT]', ...a);
const warn = (...a) => console.warn ('[TT]', ...a);
const err  = (...a) => console.error('[TT]', ...a);

// ─── Loading overlay ─────────────────────────────────────────
function showLoading(show) {
    const el = document.getElementById('loadingOverlay');
    if (el) el.classList.toggle('hidden', !show);
}

// ─── Toast ───────────────────────────────────────────────────
function showToast(msg, type = 'info') {
    const c = document.getElementById('toastContainer');
    if (!c) return;
    c.style.cssText = 'position:fixed;top:80px;right:20px;z-index:9999;display:flex;flex-direction:column;gap:8px;pointer-events:none;';
    const palette = { success:'#10b981', error:'#ef4444', warning:'#f59e0b', info:'#3b82f6' };
    const ico     = { success:'fa-check-circle', error:'fa-times-circle', warning:'fa-exclamation-triangle', info:'fa-info-circle' };
    const div = document.createElement('div');
    div.style.cssText = `pointer-events:all;background:white;border-left:4px solid ${palette[type]};padding:12px 16px;
        border-radius:8px;box-shadow:0 4px 12px rgba(0,0,0,0.15);display:flex;align-items:center;
        gap:10px;font-size:.85rem;min-width:280px;max-width:380px;`;
    div.innerHTML = `<i class="fas ${ico[type]}" style="color:${palette[type]};flex-shrink:0"></i>
        <span style="flex:1;color:#374151">${msg}</span>
        <button onclick="this.parentElement.remove()" style="background:none;border:none;cursor:pointer;color:#9ca3af"><i class="fas fa-times"></i></button>`;
    c.appendChild(div);
    setTimeout(() => div.parentElement && div.remove(), 4500);
}

// ─── API call ────────────────────────────────────────────────
async function apiCall(url, method = 'GET', body = null) {
    const opts = {
        method,
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${authToken}` }
    };
    if (body) opts.body = JSON.stringify(body);
    log(`${method} → ${url}`, body || '');
    try {
        const res = await fetch(`${API_BASE_URL}${url}`, opts);
        if (res.status === 401) { localStorage.removeItem('admin_jwt_token'); window.location.href = '/login.html'; return null; }
        const ct = res.headers.get('content-type') || '';
        if (ct.includes('application/json')) {
            const json = await res.json();
            log(`← ${url}`, json);
            if (!res.ok) { const m = json.message || `HTTP ${res.status}`; showToast(m, 'error'); throw new Error(m); }
            // Handle both wrapped and unwrapped responses
            if (json.success !== undefined) {
                return json;
            } else {
                return { success: true, data: json };
            }
        }
        const text = await res.text();
        log(`← ${url} (text)`, text);
        return { success: true, data: text };
    } catch (e) {
        err('API error', url, e.message);
        if (!e.message.startsWith('HTTP')) showToast('Network error: ' + e.message, 'error');
        throw e;
    }
}

// ─── Teacher helpers ─────────────────────────────────────────
const getTeacherName = t => {
    if (!t) return 'Unknown';
    if (t.fullName && t.fullName.trim()) return t.fullName.trim();
    const parts = [t.firstName, t.middleName, t.lastName].filter(Boolean).map(s => s.trim());
    return parts.join(' ') || 'Unknown Teacher';
};
const getTeacherId = t => t ? (t.id ?? t.teacherId ?? t.teacher_id ?? null) : null;

// ─── Subject extraction from ClassResponseDTO ────────────────
function extractSubjectsFromClass(cls) {
    const s = new Set();
    if (cls.classTeacherSubject)     s.add(cls.classTeacherSubject.trim());
    if (cls.assistantTeacherSubject) s.add(cls.assistantTeacherSubject.trim());
    if (Array.isArray(cls.otherTeacherSubject)) {
        cls.otherTeacherSubject.forEach(a => {
            if (Array.isArray(a.subjects)) {
                a.subjects.forEach(sd => { if (sd.subjectName) s.add(sd.subjectName.trim()); });
            }
        });
    }
    return [...s].filter(Boolean);
}

function extractSubjectsFromTeacher(t) {
    const s = new Set();
    if (t.primarySubject) s.add(t.primarySubject.trim());
    if (Array.isArray(t.additionalSubjects)) t.additionalSubjects.forEach(x => { if (x) s.add(x.trim()); });
    return [...s].filter(Boolean);
}

function buildAllSubjectsFromBackend() {
    const s = new Set();
    classes.forEach(cls => extractSubjectsFromClass(cls).forEach(x => s.add(x)));
    teachers.forEach(t   => extractSubjectsFromTeacher(t).forEach(x => s.add(x)));
    return [...s].sort();
}

// ─── Subject colour map ──────────────────────────────────────
const SUBJECT_COLORS = [
    '#3b82f6','#10b981','#8b5cf6','#f59e0b','#ef4444',
    '#6366f1','#ec4899','#14b8a6','#f97316','#84cc16',
    '#06b6d4','#a855f7','#e11d48','#0d9488','#d97706'
];
const _subjectColorCache = {};
let _colorIdx = 0;
function getSubjectColor(subject) {
    if (!subject) return '#9ca3af';
    const key = subject.toLowerCase();
    if (!_subjectColorCache[key]) {
        _subjectColorCache[key] = SUBJECT_COLORS[_colorIdx % SUBJECT_COLORS.length];
        _colorIdx++;
    }
    return _subjectColorCache[key];
}

// ─── Build default breaks ────────────────────────────────────
function buildDefaultBreaks() {
    return DAYS.flatMap(day => [
        { day, period: 3, type: 'RECESS' },
        { day, period: 5, type: 'LUNCH'  }
    ]);
}
const isBreakPeriod = (day, p) => timetableBreaks.some(b => b.day === day && b.period === p);
const getBreakType  = (day, p) => timetableBreaks.find(b => b.day === day && b.period === p)?.type || '';

// ════════════════════════════════════════════════════════════════
// INITIALIZATION
// ════════════════════════════════════════════════════════════════
async function initializeData() {
    try {
        showLoading(true);
        log('Init — fetching classes and teachers...');

        const clsResp = await apiCall('/classes/get-all-classes');
        classes = Array.isArray(clsResp) ? clsResp
                : (clsResp?.data && Array.isArray(clsResp.data)) ? clsResp.data
                : [];
        log('Classes loaded:', classes.length, classes);

        const tchResp = await apiCall('/teachers/get-all-teachers');
        teachers = (tchResp?.success && Array.isArray(tchResp.data)) ? tchResp.data
                 : Array.isArray(tchResp) ? tchResp
                 : [];
        log('Teachers loaded:', teachers.length, teachers);

        populateClassFilter();
        populateTeacherFilter();
        populateSubjectFilter();

        const cf = document.getElementById('classFilter');
        if (cf && classes.length > 0) {
            cf.selectedIndex = 1;
            log('Auto-selected:', cf.options[1]?.text);
        }

        await fetchTimetable();

    } catch (e) {
        err('Init error:', e);
        showToast('Failed to load. Is the backend running?', 'error');
    } finally {
        showLoading(false);
    }
}

// ════════════════════════════════════════════════════════════════
// POPULATE CLASS FILTER
// ════════════════════════════════════════════════════════════════
function populateClassFilter() {
    const cf = document.getElementById('classFilter');
    if (!cf) { err('classFilter not found'); return; }
    cf.innerHTML = '<option value="">-- Select Class --</option>';

    classes.forEach(cls => {
        const opt = document.createElement('option');
        opt.value = cls.className;
        opt.text = `Class ${cls.className} — Section ${cls.section || 'A'}`;
        opt.dataset.classId = cls.classId;
        opt.dataset.className = cls.className;
        opt.dataset.classCode = cls.classCode || '';
        opt.dataset.section = cls.section || 'A';
        opt.dataset.academicYear = cls.academicYear || '2024-2025';
        cf.appendChild(opt);
    });
    log('classFilter ready:', cf.options.length - 1, 'entries');
}

// ════════════════════════════════════════════════════════════════
// POPULATE TEACHER FILTER
// ════════════════════════════════════════════════════════════════
function populateTeacherFilter() {
    const tf = document.getElementById('teacherFilter');
    if (!tf) return;
    tf.innerHTML = '<option value="">All Teachers</option>';
    teachers.forEach(t => {
        const o = document.createElement('option');
        o.value = getTeacherId(t);
        o.text = getTeacherName(t);
        tf.appendChild(o);
    });
    log('teacherFilter ready:', teachers.length);
}

// ════════════════════════════════════════════════════════════════
// POPULATE SUBJECT FILTER
// ════════════════════════════════════════════════════════════════
function populateSubjectFilter() {
    const sf = document.getElementById('subjectFilter');
    if (!sf) return;

    const fromBackend = buildAllSubjectsFromBackend();
    const fromSlots = slots.map(s => s.subject).filter(Boolean);
    allSubjects = [...new Set([...fromBackend, ...fromSlots])].sort();

    const prev = sf.value;
    sf.innerHTML = '<option value="">All Subjects</option>';
    allSubjects.forEach(sub => {
        const o = document.createElement('option');
        o.value = sub; o.text = sub;
        sf.appendChild(o);
    });
    if (prev && allSubjects.includes(prev)) sf.value = prev;

    const legend = document.getElementById('legendContainer');
    if (legend) {
        if (allSubjects.length > 0) {
            legend.innerHTML = allSubjects.map(sub =>
                `<span class="legend-item">
                    <span class="legend-color" style="background:${getSubjectColor(sub)};border-radius:3px;"></span>
                    ${sub}
                </span>`
            ).join('') +
            `<span class="legend-item">
                <span class="legend-color" style="background:#f97316;opacity:.7;border-radius:3px;"></span>
                Break
            </span>`;
        } else {
            legend.innerHTML = '<span class="text-gray-400 italic text-xs">Subject legend appears after loading</span>';
        }
    }
}

// ════════════════════════════════════════════════════════════════
// GET SELECTED CLASS INFO
// ════════════════════════════════════════════════════════════════
function getSelectedClassInfo() {
    const cf = document.getElementById('classFilter');
    if (!cf || !cf.value) return null;
    const sel = cf.options[cf.selectedIndex];
    if (!sel || !sel.dataset.classId) return null;
    return {
        classId: sel.dataset.classId,
        className: sel.dataset.className,
        classCode: sel.dataset.classCode || '',
        section: sel.dataset.section || 'A',
        academicYear: sel.dataset.academicYear || '2024-2025',
        displayName: sel.text
    };
}

// ════════════════════════════════════════════════════════════════
// FETCH TIMETABLE
// ════════════════════════════════════════════════════════════════
async function fetchTimetable() {
    const ci = getSelectedClassInfo();
    if (!ci) {
        slots = []; timetableBreaks = buildDefaultBreaks();
        renderTimetable(); return;
    }
    log('Fetching timetable:', ci);
    try {
        showLoading(true);
        const idParam = ci.classCode
            ? `classCode=${encodeURIComponent(ci.classCode)}`
            : `className=${encodeURIComponent(ci.className)}`;
        const url = `/timetable?${idParam}&section=${encodeURIComponent(ci.section)}&academicYear=${encodeURIComponent(ci.academicYear)}`;
        log('GET', url);
        const resp = await apiCall(url);

        if (resp?.success && resp.data) {
            const conv = convertBackendToSlots(resp.data, ci);
            slots = conv.slots;
            timetableBreaks = conv.breaks;
        } else {
            log('No timetable data yet for this class');
            slots = []; timetableBreaks = buildDefaultBreaks();
        }
        populateSubjectFilter();
        renderTimetable();
        updateStats();
    } catch (e) {
        err('fetchTimetable error:', e);
        slots = []; timetableBreaks = buildDefaultBreaks();
        renderTimetable();
    } finally {
        showLoading(false);
    }
}

// ─── Convert backend response → flat slots array ─────────────
function convertBackendToSlots(data, ci) {
    const resultSlots = [];
    const resultBreaks = [];
    if (!data) return { slots: resultSlots, breaks: buildDefaultBreaks() };

    (data.weeks || []).forEach(week => {
        const wn = week.weekNumber ?? week.week_number ?? week.week ?? 1;
        (week.days || []).forEach(dayObj => {
            const rawDay = dayObj.day || dayObj.dayName || dayObj.name || '';
            const day = rawDay.charAt(0).toUpperCase() + rawDay.slice(1).toLowerCase();
            (dayObj.periods || []).forEach(p => {
                const periodNum = p.periodNumber ?? p.period_number ?? p.period ?? p.periodNo ?? p.slot ?? null;
                if (periodNum === null || periodNum === undefined) return;
                const pNumInt = parseInt(periodNum, 10);
                if (isNaN(pNumInt)) return;
                const isBreakVal = p.isBreak ?? p.is_break ?? p.breakPeriod ?? false;
                if (isBreakVal) {
                    if (!resultBreaks.some(b => b.day === day && b.period === pNumInt)) {
                        const bType = p.breakType ?? p.break_type ?? 'RECESS';
                        resultBreaks.push({ day, period: pNumInt, type: bType });
                    }
                } else {
                    resultSlots.push({
                        day, period: pNumInt, week: wn,
                        className: ci.className, classCode: ci.classCode, section: ci.section,
                        subject: p.subjectName ?? p.subject_name ?? p.subject ?? '',
                        teacher: p.teacherName ?? p.teacher_name ?? p.teacherFullName ?? '',
                        teacherId: p.teacherId ?? p.teacher_id ?? null,
                        room: p.roomNumber ?? p.room_number ?? p.room ?? '',
                        roomType: p.roomType ?? p.room_type ?? 'classroom',
                        notes: p.notes ?? '',
                        time: PERIOD_TIMES[pNumInt - 1]?.time ?? ''
                    });
                }
            });
        });
    });

    return {
        slots: resultSlots,
        breaks: resultBreaks.length ? resultBreaks : buildDefaultBreaks()
    };
}

// ════════════════════════════════════════════════════════════════
// GET AVAILABLE TEACHERS - Uses NEW /available endpoint (checks ALL classes)
// ════════════════════════════════════════════════════════════════
async function getAvailableTeachers(day, period, week = 1, excludeTeacherId = null) {
    const ci = getSelectedClassInfo();
    if (!ci) return teachers;
    
    try {
        const url = `/timetable/available?day=${encodeURIComponent(day)}&period=${period}&weekNumber=${week}&academicYear=${encodeURIComponent(ci.academicYear)}`;
        log('🔍 Checking teacher availability across ALL classes:', url);
        const resp = await apiCall(url);
        
        if (resp?.success) {
            const availableTeacherIds = resp.availableTeachers?.map(t => t.id) || [];
            log('✅ Available teacher IDs from API:', availableTeacherIds);
            
            const availableTeachersList = teachers.filter(t => {
                const tid = getTeacherId(t);
                const isAvailable = availableTeacherIds.includes(tid);
                if (!isAvailable) {
                    log(`❌ HIDING teacher: ${getTeacherName(t)} (ID: ${tid}) - booked elsewhere at this time`);
                }
                return isAvailable;
            });
            
            log(`✅ Final available teachers: ${availableTeachersList.length}`);
            return availableTeachersList;
        }
    } catch (e) {
        err('Error checking teacher availability:', e);
    }
    return teachers;
}

// ════════════════════════════════════════════════════════════════
// GET AVAILABLE ROOMS - Uses NEW /available endpoint (checks ALL classes)
// ════════════════════════════════════════════════════════════════
async function getAvailableRooms(day, period, week = 1, excludeRoom = null) {
    const ci = getSelectedClassInfo();
    if (!ci) return [];
    
    const defaultRooms = ['101', '102', '103', '104', '105', '106', '201', '202', '203'];
    
    try {
        const url = `/timetable/available?day=${encodeURIComponent(day)}&period=${period}&weekNumber=${week}&academicYear=${encodeURIComponent(ci.academicYear)}`;
        log('🔍 Checking room availability across ALL classes:', url);
        const resp = await apiCall(url);
        
        if (resp?.success) {
            const availableRoomsFromApi = resp.availableRooms || [];
            log('✅ Available rooms from API:', availableRoomsFromApi);
            
            const localRooms = [...new Set(slots.map(s => s.room).filter(Boolean))];
            const allPossibleRooms = [...new Set([...localRooms, ...availableRoomsFromApi, ...defaultRooms])];
            
            const availableRoomsList = allPossibleRooms.filter(room => {
                const isAvailable = availableRoomsFromApi.includes(room);
                if (!isAvailable) {
                    log(`❌ HIDING room: ${room} - booked elsewhere at this time`);
                }
                return isAvailable;
            });
            
            log(`✅ Final available rooms: ${availableRoomsList.length}`);
            return availableRoomsList;
        }
    } catch (e) {
        err('Error checking room availability:', e);
    }
    return defaultRooms;
}

// ════════════════════════════════════════════════════════════════
// CREATE TIMETABLE
// ════════════════════════════════════════════════════════════════
async function createTimetable(payload) {
    try {
        showLoading(true);
        log('POST /timetable/create', payload);
        const resp = await apiCall('/timetable/create', 'POST', payload);
        if (resp?.success) {
            showToast('Timetable created!', 'success');
            await fetchTimetable();
            closeCreateModal();
        } else {
            showToast(resp?.message || 'Create failed', 'error');
        }
    } catch (e) { err('createTimetable:', e); }
    finally { showLoading(false); }
}

// ════════════════════════════════════════════════════════════════
// UPDATE PERIOD
// ════════════════════════════════════════════════════════════════
async function updatePeriod(payload) {
    try {
        showLoading(true);
        log('PUT /timetable/update-period', payload);
        const resp = await apiCall('/timetable/update-period', 'PUT', payload);
        if (resp?.success) {
            showToast('Period updated!', 'success');
            await fetchTimetable();
            closeModal();
        } else if (resp?.data?.conflicts?.length) {
            showConflictsDialog(resp.data.conflicts);
        } else {
            showToast(resp?.message || 'Update failed', 'error');
        }
    } catch (e) { err('updatePeriod:', e); }
    finally { showLoading(false); }
}

// ─── Check conflicts ──────────────────────────────────────────
async function checkConflicts() {
    const ci = getSelectedClassInfo();
    if (!ci) { showToast('Select a class first', 'warning'); return; }
    try {
        showLoading(true);
        const resp = await apiCall('/timetable/check-conflicts', 'POST', {
            className: ci.className, classCode: ci.classCode,
            section: ci.section, academicYear: ci.academicYear
        });
        resp?.data?.conflicts?.length
            ? showConflictsDialog(resp.data.conflicts)
            : showToast('No conflicts found!', 'success');
    } catch (e) { err('checkConflicts:', e); }
    finally { showLoading(false); }
}

function showConflictsDialog(conflicts) {
    const m = document.getElementById('confirmModal'); if (!m) return;
    document.getElementById('confirmTitle').textContent = `${conflicts.length} Conflict(s) Found`;
    const msg = document.getElementById('confirmMessage');
    msg.innerHTML = '';
    conflicts.forEach(c => {
        const d = document.createElement('div');
        d.className = 'text-left text-sm p-2 bg-red-50 rounded mb-1 text-red-700';
        d.textContent = '⚠ ' + (c.message || `${c.type||'Schedule'} conflict — ${c.day} Period ${c.period}`);
        msg.appendChild(d);
    });
    const ok = document.getElementById('confirmOk');
    const cn = document.getElementById('confirmCancel');
    ok.textContent = 'OK'; ok.onclick = () => m.classList.remove('active');
    cn.textContent = 'Close'; cn.onclick = () => m.classList.remove('active');
    m.classList.add('active');
}

// ─── Clear day ────────────────────────────────────────────────
async function clearDay(day, weekNum = 1) {
    const ci = getSelectedClassInfo();
    if (!ci) { showToast('Select a class first', 'warning'); return; }
    const m = document.getElementById('confirmModal'); if (!m) return;
    document.getElementById('confirmTitle').textContent = 'Clear Day';
    document.getElementById('confirmMessage').textContent = `Remove all periods for ${day} — Week ${weekNum}?`;
    const cn = document.getElementById('confirmCancel');
    const ok = document.getElementById('confirmOk');
    cn.textContent = 'Cancel'; cn.onclick = () => m.classList.remove('active');
    ok.textContent = 'Clear';
    ok.onclick = async () => {
        m.classList.remove('active');
        try {
            showLoading(true);
            const resp = await apiCall('/timetable/clear-day', 'DELETE', {
                className: ci.className, classCode: ci.classCode,
                section: ci.section, academicYear: ci.academicYear,
                day, weekNumber: weekNum, updatedBy: 'admin'
            });
            if (resp?.success) { showToast(`${day} cleared`, 'success'); await fetchTimetable(); }
            else showToast(resp?.message || 'Clear failed', 'error');
        } catch (e) { err('clearDay:', e); }
        finally { showLoading(false); }
    };
    m.classList.add('active');
}

// ════════════════════════════════════════════════════════════════
// RENDER TIMETABLE
// ════════════════════════════════════════════════════════════════
function renderTimetable() {
    const container = document.getElementById('timetableContainer');
    if (!container) { err('timetableContainer missing'); return; }

    const ci = getSelectedClassInfo();
    if (!ci) {
        container.innerHTML = `<div class="text-center py-16">
            <i class="fas fa-calendar-alt text-5xl text-gray-300 mb-4 block"></i>
            <p class="text-gray-500 text-lg font-medium">Select a class to view the timetable</p>
            <p class="text-gray-400 text-sm mt-1">Classes and teachers are loaded live from the database</p>
        </div>`;
        return;
    }

    const teacherIdF = document.getElementById('teacherFilter')?.value || '';
    const subjectF = document.getElementById('subjectFilter')?.value?.toLowerCase() || '';
    let filtered = [...slots];
    if (teacherIdF) filtered = filtered.filter(s => String(s.teacherId) === String(teacherIdF));
    if (subjectF) filtered = filtered.filter(s => s.subject?.toLowerCase().includes(subjectF));

    const vi = document.getElementById('viewIndicatorText');
    if (vi) vi.textContent = `${currentView.charAt(0).toUpperCase()+currentView.slice(1)} View — ${ci.displayName} · ${ci.academicYear}`;

    if (currentView === 'month') container.innerHTML = renderMonthView(filtered, ci);
    else if (currentView === 'week') container.innerHTML = renderWeekView(filtered, ci);
    else container.innerHTML = renderDayView(filtered, ci);
}

// ─── Shared: render a single period cell ─────────────────────
function renderPeriodCell(day, p, wn, slot, cssClass, onClickFn) {
    const pt = PERIOD_TIMES[p - 1]?.time || '';
    const onclick = `${onClickFn}('${day}',${p},${wn})`;

    if (isBreakPeriod(day, p)) {
        return `<div class="${cssClass} break-cell" onclick="${onclick}">
            <span class="${cssClass.includes('month') ? 'month-period-time' : cssClass.includes('week') ? 'week-period-time' : 'day-period-time'}">P${p} · ${pt}</span>
            <span class="break-text">${getBreakType(day, p)}</span>
        </div>`;
    }
    if (slot) {
        const col = getSubjectColor(slot.subject);
        return `<div class="${cssClass}" style="border-left-color:${col};" onclick="${onclick}">
            <span class="${cssClass.includes('month') ? 'month-period-time' : cssClass.includes('week') ? 'week-period-time' : 'day-period-time'}">P${p} · ${pt}</span>
            <span class="subject-name" style="color:${col};">${slot.subject}</span>
            <span class="teacher-name">${slot.teacher || '—'}</span>
            <span class="room-no">Rm ${slot.room || '—'}</span>
        </div>`;
    }
    return `<div class="${cssClass}" style="border-left-color:#e5e7eb;background:#fafafa;" onclick="${onclick}">
        <span class="${cssClass.includes('month') ? 'month-period-time' : cssClass.includes('week') ? 'week-period-time' : 'day-period-time'}">P${p} · ${pt}</span>
        <span style="color:#d1d5db;font-size:.65rem;">+ Add</span>
    </div>`;
}

// ════════════════════════════════════════════════════════════════
// MONTH VIEW
// ════════════════════════════════════════════════════════════════
function renderMonthView(filtered, ci) {
    let html = '<div class="month-view-container">';
    [1,2,3,4].forEach(wn => {
        html += `
        <div class="month-week-card">
            <div class="month-week-header">
                <div class="month-week-title"><i class="far fa-calendar-alt"></i>Week ${wn}</div>
                <div class="flex items-center gap-2">
                    <span class="month-week-badge">${ci.displayName} · ${ci.academicYear}</span>
                    <button onclick="openCreateModal('week',${wn},'Monday')" class="create-week-btn">
                        <i class="fas fa-plus mr-1"></i>Add Schedule
                    </button>
                </div>
            </div>
            <div class="month-days-grid">`;

        DAYS.forEach(day => {
            const daySlots = filtered.filter(s => s.day === day && s.week === wn).sort((a,b) => a.period - b.period);
            html += `
            <div class="month-day-column">
                <div class="month-day-header"><span>${day}</span><span class="text-xs bg-gray-200 px-2 py-1 rounded">${daySlots.length} filled</span></div>
                <div class="month-day-periods">`;
            for (let p = 1; p <= 8; p++) {
                html += renderPeriodCell(day, p, wn, daySlots.find(s => s.period === p), 'month-period-item', 'openEditModal');
            }
            html += `</div>
                <div class="px-2 pb-1">
                    <button onclick="clearDay('${day}',${wn})" class="w-full text-xs text-red-400 hover:text-red-600 py-1 rounded hover:bg-red-50 transition-colors">
                        <i class="fas fa-trash mr-1"></i>Clear
                    </button>
                </div>
            </div>`;
        });
        html += `</div></div>`;
    });
    html += '</div>';
    return html;
}

// ════════════════════════════════════════════════════════════════
// WEEK VIEW
// ════════════════════════════════════════════════════════════════
function renderWeekView(filtered, ci) {
    const week1 = filtered.filter(s => s.week === 1);
    let html = `
    <div class="week-view-container">
        <div class="week-card">
            <div class="week-card-header">
                <div class="week-title"><i class="fas fa-calendar-week mr-2"></i>Week 1 Schedule</div>
                <div class="flex items-center gap-2">
                    <span class="bg-white text-orange-600 px-3 py-1 rounded-full text-xs font-semibold">${ci.displayName} · ${ci.academicYear}</span>
                    <button onclick="openCreateModal('week',1,'Monday')" class="create-day-btn"><i class="fas fa-plus mr-1"></i>Add Schedule</button>
                </div>
            </div>
            <div class="week-days-grid">`;

    DAYS.forEach(day => {
        const ds = week1.filter(s => s.day === day).sort((a,b) => a.period - b.period);
        html += `
        <div class="week-day-column">
            <div class="week-day-header ${day.toLowerCase()}"><span>${day}</span><span class="text-xs bg-gray-200 text-gray-700 px-2 py-1 rounded">${ds.length}</span></div>
            <div class="week-day-periods">`;
        for (let p = 1; p <= 8; p++) {
            html += renderPeriodCell(day, p, 1, ds.find(s => s.period === p), 'week-period-item', 'openEditModal');
        }
        html += `</div>
            <button onclick="clearDay('${day}',1)" class="w-full text-xs text-red-400 hover:text-red-600 py-1 hover:bg-red-50 transition-colors">
                <i class="fas fa-trash mr-1"></i>Clear ${day}
            </button>
        </div>`;
    });
    html += `</div></div></div>`;
    return html;
}

// ════════════════════════════════════════════════════════════════
// DAY VIEW
// ════════════════════════════════════════════════════════════════
function renderDayView(filtered, ci) {
    let html = '<div class="day-view-container">';
    DAYS.forEach(day => {
        const ds = filtered.filter(s => s.day === day && s.week === 1).sort((a,b) => a.period - b.period);
        const classPeriods = ds.filter(s => !isBreakPeriod(day, s.period)).length;
        html += `
        <div class="day-card-enhanced">
            <div class="day-card-header ${day.toLowerCase()}">
                <div class="day-title"><i class="far fa-calendar-alt mr-2"></i>${day}<span class="text-sm font-normal opacity-80 ml-2">— ${ci.displayName}</span></div>
                <div class="flex items-center gap-3">
                    <span class="day-stats"><i class="fas fa-book mr-1"></i>${classPeriods} Classes</span>
                    <button onclick="openCreateModal('day',1,'${day}')" class="create-day-btn"><i class="fas fa-plus mr-1"></i>Add Periods</button>
                    <button onclick="clearDay('${day}',1)" class="create-day-btn" style="background:rgba(255,255,255,0.2);"><i class="fas fa-trash"></i></button>
                </div>
            </div>
            <div class="day-periods-grid">`;
        for (let p = 1; p <= 8; p++) {
            const slot = ds.find(s => s.period === p);
            if (isBreakPeriod(day, p)) {
                html += `<div class="day-period-block break-block" onclick="openEditModal('${day}',${p},1)">
                    <span class="day-period-time">Period ${p} · ${PERIOD_TIMES[p-1]?.time}</span>
                    <span class="day-period-subject break-text">${getBreakType(day, p)}</span>
                    <div class="day-period-details"><i class="fas fa-coffee mr-1"></i>Break</div>
                </div>`;
            } else if (slot) {
                const col = getSubjectColor(slot.subject);
                html += `<div class="day-period-block" style="border-top:3px solid ${col};" onclick="openEditModal('${day}',${p},1)">
                    <span class="day-period-time">Period ${p} · ${PERIOD_TIMES[p-1]?.time}</span>
                    <span class="day-period-subject" style="color:${col};">${slot.subject}</span>
                    <div class="day-period-details">
                        <i class="fas fa-user mr-1"></i>${slot.teacher}<br>
                        <i class="fas fa-door-open mr-1"></i>Rm ${slot.room}
                    </div>
                </div>`;
            } else {
                html += `<div class="day-empty-block" onclick="openEditModal('${day}',${p},1)">
                    <div class="text-center"><i class="fas fa-plus-circle mb-1 block"></i><div>P${p}</div><div class="text-xs">${PERIOD_TIMES[p-1]?.time}</div></div>
                </div>`;
            }
        }
        html += `</div></div>`;
    });
    html += '</div>';
    return html;
}

// ─── Stats ────────────────────────────────────────────────────
function updateStats() {
    const total = DAYS.length * PERIOD_TIMES.length * 4;
    const filled = slots.length;
    const brks = timetableBreaks.length;
    const conflicts = slots.filter(s1 => slots.some(s2 =>
        s2 !== s1 && s2.day === s1.day && s2.period === s1.period && s2.week === s1.week &&
        s2.teacherId && s1.teacherId && String(s2.teacherId) === String(s1.teacherId)
    )).length;
    ['totalPeriods','filledPeriods','breakPeriods','conflictCount']
        .forEach((id,i) => { const el = document.getElementById(id); if (el) el.textContent = [total,filled,brks,conflicts][i]; });
}

// ════════════════════════════════════════════════════════════════
// EDIT MODAL
// ════════════════════════════════════════════════════════════════
window.openEditModal = async function(day, period, week = 1) {
    const ci = getSelectedClassInfo();
    if (!ci) { showToast('Select a class first', 'warning'); return; }
    log('Edit modal:', { day, period, week });

    document.getElementById('modalDay').value = day;
    document.getElementById('modalPeriod').value = period;
    document.getElementById('modalWeek').value = week;

    const isBreak = isBreakPeriod(day, period);
    const slot = slots.find(s => s.day === day && s.period === period && s.week === week);
    const isBreakCb = document.getElementById('isBreak');
    isBreakCb.checked = isBreak;
    document.getElementById('breakTypeDiv').classList.toggle('hidden', !isBreak);

    const availableTeachers = await getAvailableTeachers(day, period, week, slot?.teacherId);
    
    const ts = document.getElementById('teacherSelect');
    ts.innerHTML = '<option value="">-- Select Teacher --</option>';
    const existingNote = document.getElementById('teacherWarningNote');
    if (existingNote) existingNote.remove();

    if (availableTeachers.length === 0) {
        const noOpt = document.createElement('option');
        noOpt.value = '';
        noOpt.text = '⚠ NO TEACHERS AVAILABLE at this time';
        noOpt.disabled = true;
        noOpt.style.color = '#ef4444';
        noOpt.style.fontWeight = 'bold';
        ts.appendChild(noOpt);
    } else {
        availableTeachers.forEach(t => {
            const o = document.createElement('option');
            o.value = getTeacherId(t);
            o.text = getTeacherName(t);
            if (slot && String(getTeacherId(t)) === String(slot.teacherId)) {
                o.selected = true;
            }
            ts.appendChild(o);
        });
    }

    if (slot && slot.teacherId) {
        const isAvailable = availableTeachers.some(t => String(getTeacherId(t)) === String(slot.teacherId));
        if (!isAvailable) {
            const noteDiv = document.createElement('div');
            noteDiv.id = 'teacherWarningNote';
            noteDiv.className = 'text-xs text-red-600 mt-1 mb-2 p-2 bg-red-50 rounded border-l-4 border-red-500';
            noteDiv.innerHTML = `<i class="fas fa-exclamation-circle mr-1"></i> 
                <strong>Note:</strong> Current teacher "${slot.teacher}" is already booked at this time and has been hidden. 
                Please select a different teacher from the list above.`;
            ts.parentNode.insertBefore(noteDiv, ts);
        }
    }

    const availableRooms = await getAvailableRooms(day, period, week, slot?.room);
    const roomInput = document.getElementById('roomInput');
    const currentRoom = slot?.room || '';
    
    let roomDatalist = document.getElementById('roomDatalist');
    if (!roomDatalist) {
        roomDatalist = document.createElement('datalist');
        roomDatalist.id = 'roomDatalist';
        roomInput.parentNode.appendChild(roomDatalist);
    }
    roomInput.setAttribute('list', 'roomDatalist');
    
    roomDatalist.innerHTML = '';
    availableRooms.forEach(room => {
        const opt = document.createElement('option');
        opt.value = room;
        roomDatalist.appendChild(opt);
    });

    const existingRoomNote = document.getElementById('roomWarningNote');
    if (existingRoomNote) existingRoomNote.remove();

    if (currentRoom && !isBreak) {
        if (!availableRooms.includes(currentRoom)) {
            roomInput.value = currentRoom;
            roomInput.style.borderColor = '#ef4444';
            roomInput.style.backgroundColor = '#fee2e2';
            roomInput.style.borderWidth = '2px';
            const roomNote = document.createElement('div');
            roomNote.id = 'roomWarningNote';
            roomNote.className = 'text-xs text-red-600 mt-1 p-2 bg-red-50 rounded border-l-4 border-red-500';
            roomNote.innerHTML = `<i class="fas fa-exclamation-circle mr-1"></i> 
                <strong>Note:</strong> Room "${currentRoom}" is already booked at this time and has been removed from suggestions. 
                Please select a different room from the dropdown suggestions.`;
            roomInput.parentNode.appendChild(roomNote);
        } else {
            roomInput.value = currentRoom;
            roomInput.style.borderColor = '';
            roomInput.style.backgroundColor = '';
            roomInput.style.borderWidth = '1px';
        }
    } else {
        roomInput.value = currentRoom;
        roomInput.style.borderColor = '';
        roomInput.style.backgroundColor = '';
        roomInput.style.borderWidth = '1px';
    }

// ─── UPDATED SUBJECT SELECT - Filter by teacher's subjects AND availability
const ss = document.getElementById('subjectSelect');

// Function to update subjects based on teacher selection and availability
const updateSubjects = () => {
    const currentTeacherId = ts.value;
    const isBreakPeriod = document.getElementById('isBreak').checked;
    
    ss.innerHTML = '<option value="">-- Select Subject --</option>';
    
    if (isBreakPeriod) {
        // If break is checked, disable subject select
        const noOpt = document.createElement('option');
        noOpt.value = '';
        noOpt.text = '-- No subject for break period --';
        noOpt.disabled = true;
        ss.appendChild(noOpt);
        ss.disabled = true;
        return;
    }
    
    ss.disabled = false;
    
    if (currentTeacherId) {
        // Find the selected teacher
        const selectedTeacher = teachers.find(t => String(getTeacherId(t)) === String(currentTeacherId));
        
        if (selectedTeacher) {
            // Get subjects the teacher can teach
            const teacherSubjects = [];
            
            // Add primary subject
            if (selectedTeacher.primarySubject && selectedTeacher.primarySubject.trim()) {
                teacherSubjects.push(selectedTeacher.primarySubject.trim());
            }
            
            // Add additional subjects
            if (Array.isArray(selectedTeacher.additionalSubjects)) {
                selectedTeacher.additionalSubjects.forEach(sub => {
                    if (sub && sub.trim() && !teacherSubjects.includes(sub.trim())) {
                        teacherSubjects.push(sub.trim());
                    }
                });
            }
            
            log(`Teacher ${getTeacherName(selectedTeacher)} can teach:`, teacherSubjects);
            
            if (teacherSubjects.length > 0) {
                // Check if teacher is available at this time
                const isTeacherAvailable = availableTeachers.some(t => String(getTeacherId(t)) === String(currentTeacherId));
                
                if (!isTeacherAvailable) {
                    // Teacher is booked - show warning and disable subject selection
                    const warningOpt = document.createElement('option');
                    warningOpt.value = '';
                    warningOpt.text = '⚠ This teacher is already booked at this time - cannot assign subjects';
                    warningOpt.disabled = true;
                    warningOpt.style.color = '#ef4444';
                    warningOpt.style.fontWeight = 'bold';
                    ss.appendChild(warningOpt);
                    ss.disabled = true;
                    return;
                }
                
                // Add teacher's subjects to dropdown (only if teacher is available)
                teacherSubjects.forEach(sub => {
                    const o = document.createElement('option');
                    o.value = sub;
                    o.text = sub;
                    if (slot?.subject === sub) o.selected = true;
                    ss.appendChild(o);
                });
            } else {
                // If teacher has no subjects assigned, show warning
                const warningOpt = document.createElement('option');
                warningOpt.value = '';
                warningOpt.text = '⚠ No subjects assigned to this teacher';
                warningOpt.disabled = true;
                warningOpt.style.color = '#f59e0b';
                ss.appendChild(warningOpt);
            }
        }
    } else {
        // No teacher selected - show message to select teacher first
        const infoOpt = document.createElement('option');
        infoOpt.value = '';
        infoOpt.text = '-- Select a teacher first --';
        infoOpt.disabled = true;
        infoOpt.style.color = '#6b7280';
        ss.appendChild(infoOpt);
    }
    
    // Also allow typing a new subject not yet in list
    if (slot?.subject && !isBreakPeriod && ts.value) {
        const selectedTeacher = teachers.find(t => String(getTeacherId(t)) === String(ts.value));
        const teacherSubjects = [];
        if (selectedTeacher?.primarySubject) teacherSubjects.push(selectedTeacher.primarySubject.trim());
        if (Array.isArray(selectedTeacher?.additionalSubjects)) {
            selectedTeacher.additionalSubjects.forEach(sub => {
                if (sub && sub.trim()) teacherSubjects.push(sub.trim());
            });
        }
        if (slot.subject && !teacherSubjects.includes(slot.subject)) {
            const o = document.createElement('option');
            o.value = slot.subject;
            o.text = `${slot.subject} (custom)`;
            o.selected = true;
            ss.appendChild(o);
        }
    }
};
    
    // Initial population of subjects
    updateSubjects();
    
    // Add event listener to update subjects when teacher changes
    // Remove existing listener to avoid duplicates
    const oldListener = ts._subjectChangeListener;
    if (oldListener) {
        ts.removeEventListener('change', oldListener);
    }
    const teacherChangeHandler = function() {
        updateSubjects();
    };
    ts.addEventListener('change', teacherChangeHandler);
    ts._subjectChangeListener = teacherChangeHandler;
    
    // Also update subjects when break checkbox changes
    const breakCheckbox = document.getElementById('isBreak');
    const oldBreakListener = breakCheckbox._subjectBreakListener;
    if (oldBreakListener) {
        breakCheckbox.removeEventListener('change', oldBreakListener);
    }
    const breakChangeHandler = function() {
        updateSubjects();
    };
    breakCheckbox.addEventListener('change', breakChangeHandler);
    breakCheckbox._subjectBreakListener = breakChangeHandler;

    // ─── Pre-fill remaining fields ───
    document.getElementById('roomType').value = slot?.roomType || 'classroom';
    document.getElementById('slotNotes').value = slot?.notes || '';
    if (isBreak) document.getElementById('breakType').value = getBreakType(day, period);

    // Open modal
    document.getElementById('slotModal').classList.add('active');
};

// ════════════════════════════════════════════════════════════════
// CLOSE MODAL
// ════════════════════════════════════════════════════════════════
window.closeModal = function() {
    const modal = document.getElementById('slotModal');
    if (modal) modal.classList.remove('active');
    const form = document.getElementById('slotForm');
    if (form) form.reset();
    const breakTypeDiv = document.getElementById('breakTypeDiv');
    if (breakTypeDiv) breakTypeDiv.classList.add('hidden');
    const teacherNote = document.getElementById('teacherWarningNote');
    if (teacherNote) teacherNote.remove();
    const roomNote = document.getElementById('roomWarningNote');
    if (roomNote) roomNote.remove();
    const roomInput = document.getElementById('roomInput');
    if (roomInput) {
        roomInput.style.borderColor = '';
        roomInput.style.backgroundColor = '';
        roomInput.style.borderWidth = '1px';
    }
    log('Modal closed');
};

// ════════════════════════════════════════════════════════════════
// CREATE MODAL
// ════════════════════════════════════════════════════════════════
window.openCreateModal = function(mode, weekNum = 1, dayName = 'Monday') {
    const ci = getSelectedClassInfo();
    if (!ci) { showToast('Select a class first', 'warning'); return; }
    log('Create modal:', { mode, weekNum, dayName });

    document.getElementById('createMode').value = mode;
    document.getElementById('contextWeek').value = weekNum;
    document.getElementById('contextDay').value = dayName;

    const label = mode === 'day' ? `${dayName} (Week ${weekNum})` : mode === 'week' ? `Week ${weekNum}` : 'Full Month';
    document.getElementById('contextText').textContent = `Creating schedule for ${label} — ${ci.displayName}`;
    document.getElementById('createModalTitle').textContent = mode === 'day' ? `Add Periods — ${dayName}` : mode === 'week' ? `Create Week ${weekNum}` : 'Create Month Schedule';
    document.getElementById('daysSelectionContainer').classList.toggle('hidden', mode === 'day');

    const container = document.getElementById('periodsContainer');
    container.innerHTML = '';
    let rowCount = 0;
    for (let p = 1; p <= 8 && rowCount < 6; p++) {
        if (!isBreakPeriod(dayName, p)) { addPeriodRow(p); rowCount++; }
    }
    document.getElementById('createTimetableModal').classList.add('active');
};

window.openCreateModalFromContext = function() { openCreateModal(currentView, 1, 'Monday'); };

window.closeCreateModal = function() {
    document.getElementById('createTimetableModal').classList.remove('active');
    document.getElementById('createTimetableForm').reset();
    document.getElementById('periodsContainer').innerHTML = '';
};

window.addPeriodRow = function(forPeriod) {
    const container = document.getElementById('periodsContainer');
    if (!container) return;
    const rowId = 'pr_' + Date.now() + '_' + Math.random().toString(36).substr(2,5);
    const pNum = forPeriod || (container.children.length + 1);
    const pt = PERIOD_TIMES[pNum - 1]?.time || '';

    const subOpts = (allSubjects.length ? allSubjects : []).map(s => `<option value="${s}">${s}</option>`).join('');
    const subjectHtml = `<option value="">-- Subject --</option>${subOpts}`;

    const teacherHtml = teachers.length
        ? '<option value="">-- Teacher --</option>' + teachers.map(t => `<option value="${getTeacherId(t)}">${getTeacherName(t)}</option>`).join('')
        : '<option value="">No teachers in DB</option>';

    const row = document.createElement('div');
    row.className = 'period-row grid items-center gap-1 p-2 bg-white rounded border mb-1 text-xs';
    row.style.gridTemplateColumns = '38px 1fr 1fr 72px 72px 30px';
    row.id = rowId;
    row.innerHTML = `
        <div class="text-center font-bold text-gray-500">P${pNum}<div style="font-size:.55rem;color:#aaa">${pt}</div></div>
        <select class="period-subject px-1 py-1 border rounded text-xs">${subjectHtml}</select>
        <select class="period-teacher px-1 py-1 border rounded text-xs">${teacherHtml}</select>
        <input type="text" class="period-room px-1 py-1 border rounded text-xs" placeholder="Room" list="roomDatalist">
        <select class="period-type px-1 py-1 border rounded text-xs">
            <option value="classroom">Class</option>
            <option value="lab">Lab</option>
            <option value="library">Library</option>
            <option value="sports">Sports</option>
        </select>
        <button type="button" onclick="removePeriodRow('${rowId}')" class="text-red-400 hover:text-red-600"><i class="fas fa-trash"></i></button>`;
    container.appendChild(row);
    const teacherSelect = row.querySelector('.period-teacher');
    teacherSelect.title = 'Note: Teachers already booked at this time will show conflict on save';
};

window.removePeriodRow = function(id) { document.getElementById(id)?.remove(); };

// ════════════════════════════════════════════════════════════════
// VIEW SWITCHING
// ════════════════════════════════════════════════════════════════
function switchView(view) {
    currentView = view;
    ['day','week','month'].forEach(v => document.getElementById(v+'ViewTab')?.classList.toggle('active', v === view));
    renderTimetable();
}

function filterChange() { fetchTimetable(); }

function clearAllFilters() {
    const cf = document.getElementById('classFilter');
    if (cf && classes.length) cf.selectedIndex = 1;
    const tf = document.getElementById('teacherFilter'); if (tf) tf.value = '';
    const sf = document.getElementById('subjectFilter'); if (sf) sf.value = '';
    fetchTimetable();
}

// ════════════════════════════════════════════════════════════════
// EXPORT
// ════════════════════════════════════════════════════════════════
window.exportToExcel = function() {
    const ci = getSelectedClassInfo(); if (!ci) { showToast('Select a class first','warning'); return; }
    const data = [['Day', ...PERIOD_TIMES.map(p => `P${p.num} (${p.time})`)]];
    DAYS.forEach(day => {
        const row = [day];
        PERIOD_TIMES.forEach(p => {
            if (isBreakPeriod(day, p.num)) row.push(getBreakType(day, p.num));
            else { const s = slots.find(sl => sl.day===day && sl.period===p.num); row.push(s?`${s.subject}|${s.teacher}|Rm${s.room}`:'-'); }
        });
        data.push(row);
    });
    if (typeof XLSX !== 'undefined') {
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(data), `${ci.className}-${ci.section}`);
        XLSX.writeFile(wb, `timetable_${ci.className}_${ci.section}.xlsx`);
        showToast('Excel exported!','success');
    } else showToast('Excel library not loaded','error');
    document.getElementById('exportMenu')?.classList.add('hidden');
};

window.exportToPDF = function() {
    const ci = getSelectedClassInfo(); if (!ci) { showToast('Select a class first','warning'); return; }
    if (!window.jspdf) { showToast('PDF library not loaded','error'); return; }
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({orientation:'landscape',unit:'mm',format:'a4'});
    doc.setFontSize(14); doc.text(`${ci.displayName} — Timetable`, 14, 15);
    doc.setFontSize(8); doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 22);
    const headers = ['Day', ...PERIOD_TIMES.map(p => `P${p.num}\n${p.time}`)];
    const body = DAYS.map(day => {
        const row = [day];
        PERIOD_TIMES.forEach(p => {
            if (isBreakPeriod(day,p.num)) row.push(getBreakType(day,p.num));
            else { const s = slots.find(sl=>sl.day===day&&sl.period===p.num); row.push(s?`${s.subject}\n${s.teacher}`:'-'); }
        });
        return row;
    });
    doc.autoTable({head:[headers],body,startY:30,styles:{fontSize:7,cellPadding:2},columnStyles:{0:{cellWidth:20}}});
    doc.save(`timetable_${ci.className}_${ci.section}.pdf`);
    showToast('PDF exported!','success');
    document.getElementById('exportMenu')?.classList.add('hidden');
};

window.exportToCSV = function() {
    const ci = getSelectedClassInfo(); if (!ci) { showToast('Select a class first','warning'); return; }
    let csv = 'Day,' + PERIOD_TIMES.map(p=>`P${p.num} (${p.time})`).join(',') + '\n';
    DAYS.forEach(day => {
        csv += day;
        PERIOD_TIMES.forEach(p => {
            if (isBreakPeriod(day,p.num)) csv += `,${getBreakType(day,p.num)}`;
            else { const s = slots.find(sl=>sl.day===day&&sl.period===p.num); csv += s?`,${s.subject} - ${s.teacher}`:',-'; }
        });
        csv += '\n';
    });
    const url = URL.createObjectURL(new Blob([csv],{type:'text/csv'}));
    Object.assign(document.createElement('a'),{href:url,download:`timetable_${ci.className}_${ci.section}.csv`}).click();
    URL.revokeObjectURL(url);
    showToast('CSV exported!','success');
    document.getElementById('exportMenu')?.classList.add('hidden');
};

window.printTimetable = function() { window.print(); document.getElementById('exportMenu')?.classList.add('hidden'); };
window.toggleExportMenu = function() { document.getElementById('exportMenu')?.classList.toggle('hidden'); };

// ════════════════════════════════════════════════════════════════
// SIDEBAR
// ════════════════════════════════════════════════════════════════
function setupSidebar() {
    isMobile = window.innerWidth < 1024;
    if (!isMobile) {
        document.getElementById('sidebar')?.classList.toggle('collapsed', sidebarCollapsed);
        document.getElementById('mainContent')?.classList.toggle('sidebar-collapsed', sidebarCollapsed);
    }
}
function toggleSidebar() {
    if (isMobile) {
        document.getElementById('sidebar')?.classList.contains('mobile-open') ? closeMobileSidebar() : openMobileSidebar();
    } else {
        sidebarCollapsed = !sidebarCollapsed;
        document.getElementById('sidebar')?.classList.toggle('collapsed', sidebarCollapsed);
        document.getElementById('mainContent')?.classList.toggle('sidebar-collapsed', sidebarCollapsed);
    }
}
function openMobileSidebar() { document.getElementById('sidebar')?.classList.add('mobile-open'); document.getElementById('sidebarOverlay')?.classList.add('active'); }
function closeMobileSidebar() { document.getElementById('sidebar')?.classList.remove('mobile-open'); document.getElementById('sidebarOverlay')?.classList.remove('active'); }
function toggleNotifications() { document.getElementById('notificationsDropdown')?.classList.toggle('hidden'); document.getElementById('userMenuDropdown')?.classList.add('hidden'); }
function toggleUserMenu() { document.getElementById('userMenuDropdown')?.classList.toggle('hidden'); document.getElementById('notificationsDropdown')?.classList.add('hidden'); }

window.addEventListener('resize', () => {
    const was = isMobile; isMobile = window.innerWidth < 1024;
    if (was !== isMobile) { if (isMobile) closeMobileSidebar(); else setupSidebar(); }
});

document.addEventListener('keydown', e => {
    if (e.ctrlKey || e.metaKey) {
        if (e.key.toLowerCase() === 'f') { e.preventDefault(); document.getElementById('globalSearch')?.focus(); }
    }
});

function setupSearch() {
    const gs = document.getElementById('globalSearch');
    if (!gs) return;
    gs.addEventListener('input', e => {
        const term = e.target.value.toLowerCase().trim();
        const allCells = document.querySelectorAll('.month-period-item,.week-period-item,.day-period-block');
        if (!term) { allCells.forEach(el => { el.style.opacity='1'; el.style.outline=''; }); return; }
        const matched = new Set(slots.filter(s => s.teacher?.toLowerCase().includes(term) || s.subject?.toLowerCase().includes(term) || s.room?.toLowerCase().includes(term)).map(s => `${s.day}-${s.period}-${s.week}`));
        allCells.forEach(el => { el.style.opacity='0.25'; el.style.outline=''; });
        matched.forEach(key => {
            const [day,,] = key.split('-');
            document.querySelectorAll(`[onclick*="openEditModal('${day}',"]`).forEach(el => { el.style.opacity='1'; el.style.outline='2px solid #3b82f6'; });
        });
    });
}

// ════════════════════════════════════════════════════════════════
// DOM READY
// ════════════════════════════════════════════════════════════════
document.addEventListener('DOMContentLoaded', function() {
    log('DOM ready');
    setupSidebar();
    setupSearch();
    initializeData();

    document.getElementById('sidebarToggle')?.addEventListener('click', toggleSidebar);
    document.getElementById('notificationsBtn')?.addEventListener('click', toggleNotifications);
    document.getElementById('userMenuBtn')?.addEventListener('click', toggleUserMenu);
    document.getElementById('sidebarOverlay')?.addEventListener('click', closeMobileSidebar);

    document.addEventListener('click', e => {
        if (!e.target.closest('#notificationsBtn')) document.getElementById('notificationsDropdown')?.classList.add('hidden');
        if (!e.target.closest('#userMenuBtn')) document.getElementById('userMenuDropdown')?.classList.add('hidden');
        if (!e.target.closest('[onclick="toggleExportMenu()"]') && !e.target.closest('#exportMenu'))
            document.getElementById('exportMenu')?.classList.add('hidden');
    });

    // ── Break checkbox listener (UPDATED to work with subject filtering) ──
    const breakCheckbox = document.getElementById('isBreak');
    if (breakCheckbox) {
        // Remove any existing listeners to avoid duplicates
        const newBreakCheckbox = breakCheckbox.cloneNode(true);
        breakCheckbox.parentNode.replaceChild(newBreakCheckbox, breakCheckbox);
        
        newBreakCheckbox.addEventListener('change', function(e) {
            const breakTypeDiv = document.getElementById('breakTypeDiv');
            if (breakTypeDiv) breakTypeDiv.classList.toggle('hidden', !e.target.checked);
            
            // Update subject dropdown based on break status
            const ss = document.getElementById('subjectSelect');
            const ts = document.getElementById('teacherSelect');
            const isBreakChecked = e.target.checked;
            
            if (isBreakChecked) {
                // If break is checked, disable subject select
                if (ss) {
                    ss.innerHTML = '<option value="">-- No subject for break --</option>';
                    ss.disabled = true;
                }
            } else {
                if (ss) {
                    ss.disabled = false;
                    // Trigger teacher change to reload subjects
                    if (ts) {
                        ts.dispatchEvent(new Event('change'));
                    }
                }
            }
        });
    }

    document.getElementById('slotForm')?.addEventListener('submit', async function(e) {
        e.preventDefault();
        const ci = getSelectedClassInfo(); if (!ci) { showToast('No class selected','error'); return; }
        const day = document.getElementById('modalDay').value;
        const period = parseInt(document.getElementById('modalPeriod').value);
        const week = parseInt(document.getElementById('modalWeek').value || '1');
        const isBreakCb = document.getElementById('isBreak').checked;
        const teacherId = document.getElementById('teacherSelect').value;
        const subject = document.getElementById('subjectSelect').value;
        if (!day || !period) { showToast('Missing period info','error'); return; }
        if (!isBreakCb && !teacherId) { showToast('Please select a teacher','warning'); return; }
        if (!isBreakCb && !subject) { showToast('Please select a subject','warning'); return; }
        await updatePeriod({
            className: ci.className, classCode: ci.classCode, section: ci.section, academicYear: ci.academicYear,
            day, period, weekNumber: week, isBreak: isBreakCb,
            breakType: isBreakCb ? (document.getElementById('breakType').value || 'RECESS') : null,
            subjectName: isBreakCb ? null : subject, teacherId: isBreakCb ? null : parseInt(teacherId),
            roomNumber: document.getElementById('roomInput').value || '', roomType: document.getElementById('roomType').value || 'classroom',
            notes: document.getElementById('slotNotes').value || '', updatedBy: 'admin'
        });
    });

    document.getElementById('createTimetableForm')?.addEventListener('submit', async function(e) {
        e.preventDefault();
        const ci = getSelectedClassInfo(); if (!ci) { showToast('No class selected','error'); return; }
        const mode = document.getElementById('createMode').value || 'day';
        const applyAll = document.getElementById('applyToAllWeeks').checked;
        const weekNum = parseInt(document.getElementById('contextWeek').value || '1');
        const ctxDay = document.getElementById('contextDay').value || 'Monday';
        let targetDays = [];
        if (mode === 'day') { targetDays = [ctxDay]; }
        else { document.querySelectorAll('.day-checkbox:checked').forEach(cb => targetDays.push(cb.value)); if (!targetDays.length) targetDays = [...DAYS]; }
        const rows = document.querySelectorAll('#periodsContainer .period-row');
        const periodData = [];
        rows.forEach((row, idx) => {
            const pLabel = row.querySelector('div')?.textContent?.trim();
            const pNum = parseInt(pLabel?.replace(/[^0-9]/g,'')) || (idx + 1);
            const tid = row.querySelector('.period-teacher')?.value;
            const subj = row.querySelector('.period-subject')?.value;
            if (!tid || !subj) { log('Skipping incomplete row'); return; }
            periodData.push({ period: pNum, subjectName: subj, teacherId: parseInt(tid), roomNumber: row.querySelector('.period-room')?.value || '101', roomType: row.querySelector('.period-type')?.value || 'classroom', notes: '' });
        });
        if (!periodData.length) { showToast('Add at least one complete period row','warning'); return; }
        const weeks = applyAll ? [1,2,3,4] : [weekNum];
        for (const wk of weeks) {
            await createTimetable({
                mode: 'week', className: ci.className, classCode: ci.classCode, section: ci.section,
                academicYear: ci.academicYear, targetDays, weekNumber: wk, applyToAllWeeks: applyAll,
                periods: periodData, createdBy: 'admin'
            });
        }
    });
});