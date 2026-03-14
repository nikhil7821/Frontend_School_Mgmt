/* =============================================================
   create-class.js  —  Complete, de-duplicated JS
   Backend: Spring Boot @ http://localhost:8084/api
   ============================================================= */

'use strict';

// ─────────────────────────────────────────────
//  CONFIG
// ─────────────────────────────────────────────
const API_BASE = 'http://localhost:8084/api';

// ─────────────────────────────────────────────
//  STATE
// ─────────────────────────────────────────────
let teachersData     = [];
let subjectsData     = [];
let classesData      = [];
let filteredClasses  = [];
let currentPage      = 1;
const PAGE_SIZE      = 8;

let editingClassId          = null;
let selectedClassTeacherId  = null;
let selectedAssistTeacherId = null;
let allAssignedSubjects     = new Set();  // tracks subjects locked to any teacher

// Bulk assign state
let bulkTeachers     = [];   // array of teacher IDs selected in bulk panel
let bulkAssignments  = {};   // { teacherId: { subjects:[], otherSubjects:[] } }

// Schedule navigation
let currentWeekDate = new Date();

// ─────────────────────────────────────────────
//  JWT AUTH GUARD
// ─────────────────────────────────────────────
(function authGuard() {
    function tokenValid() {
        const tok = localStorage.getItem('admin_jwt_token');
        if (!tok) return false;
        try {
            const payload = JSON.parse(atob(tok.split('.')[1]));
            return Date.now() < payload.exp * 1000;
        } catch { return false; }
    }
    if (!tokenValid()) {
        localStorage.removeItem('admin_jwt_token');
        window.location.replace('/login.html');
    }
    window.addEventListener('pageshow', () => {
        if (!tokenValid()) { localStorage.removeItem('admin_jwt_token'); window.location.replace('/login.html'); }
    });
})();

// ─────────────────────────────────────────────
//  DOM READY
// ─────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
    setCurrentDate();
    setupSidebar();
    setupNavDropdowns();
    setupFilters();
    setupModalButtons();
    setupFormListeners();
    initPage();
});

// ─────────────────────────────────────────────
//  INIT
// ─────────────────────────────────────────────
async function initPage() {
    showLoading();
    try {
        await Promise.all([fetchTeachers(), fetchSubjects()]);
        await fetchClasses();
    } finally {
        hideLoading();
    }
}

// ─────────────────────────────────────────────
//  UTILITY
// ─────────────────────────────────────────────
function showLoading()  { document.getElementById('loadingOverlay').classList.remove('hidden'); }
function hideLoading()  { document.getElementById('loadingOverlay').classList.add('hidden'); }

function showToast(msg, type = 'info') {
    const icons = { success: 'fa-check-circle', error: 'fa-exclamation-circle', info: 'fa-info-circle', warning: 'fa-exclamation-triangle' };
    const t = document.createElement('div');
    t.className = `toast toast-${type}`;
    t.innerHTML = `
        <i class="fas ${icons[type] || icons.info} toast-icon"></i>
        <div style="flex:1;font-size:13px">${msg}</div>
        <button class="toast-close" onclick="this.closest('.toast').remove()"><i class="fas fa-times"></i></button>`;
    document.getElementById('toastContainer').appendChild(t);
    setTimeout(() => t.remove(), 5000);
}

function formatTime(t) {
    if (!t) return '--';
    const [h, m] = t.split(':');
    const hr = parseInt(h);
    return `${hr % 12 || 12}:${m} ${hr >= 12 ? 'PM' : 'AM'}`;
}

function formatTimeShort(t) {
    if (!t) return '--';
    const [h, m] = t.split(':');
    const hr = parseInt(h);
    return `${hr % 12 || 12}:${m}${hr >= 12 ? 'pm' : 'am'}`;
}

function formatDate(d) {
    return d ? new Date(d).toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' }) : '—';
}

function getTeacherInitials(name) {
    if (!name) return '?';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
}

function classIconClass(cn) {
    const m = { PG:'ci-PG', LKG:'ci-LKG', UKG:'ci-UKG', '1st':'ci-1st', '2nd':'ci-2nd' };
    return m[cn] || 'ci-def';
}

function classIconFA(cn) {
    const m = { PG:'fa-baby', LKG:'fa-child', UKG:'fa-graduation-cap', '1st':'fa-book-open', '2nd':'fa-book' };
    return m[cn] || 'fa-chalkboard';
}

function subjectColor(name) {
    const pool = ['#4263eb','#e03131','#2f9e44','#f08c00','#7950f2','#d6336c','#0c8599','#5c940d','#862e9c','#d9480f'];
    return pool[(name?.length || 0) % pool.length];
}

function setCurrentDate() {
    const el = document.getElementById('currentDate');
    if (el) el.textContent = new Date().toLocaleDateString('en-IN', { weekday:'long', year:'numeric', month:'long', day:'numeric' });
}

// ─────────────────────────────────────────────
//  SIDEBAR
// ─────────────────────────────────────────────
function setupSidebar() {
    let collapsed = false;
    let isMobile = window.innerWidth < 1024;
    const sidebar = document.getElementById('sidebar');
    const main    = document.getElementById('mainContent');
    const overlay = document.getElementById('sidebarOverlay');
    const btn     = document.getElementById('sidebarToggleBtn');

    btn.addEventListener('click', () => {
        if (isMobile) {
            const open = sidebar.classList.toggle('mobile-open');
            overlay.classList.toggle('active', open);
        } else {
            collapsed = !collapsed;
            sidebar.classList.toggle('collapsed', collapsed);
            main.classList.toggle('sidebar-collapsed', collapsed);
        }
    });

    overlay.addEventListener('click', () => {
        sidebar.classList.remove('mobile-open');
        overlay.classList.remove('active');
    });

    window.addEventListener('resize', () => {
        isMobile = window.innerWidth < 1024;
        if (!isMobile) { sidebar.classList.remove('mobile-open'); overlay.classList.remove('active'); }
    });
}

// ─────────────────────────────────────────────
//  NAV DROPDOWNS
// ─────────────────────────────────────────────
function setupNavDropdowns() {
    function toggle(btnId, menuId) {
        const btn  = document.getElementById(btnId);
        const menu = document.getElementById(menuId);
        if (!btn || !menu) return;
        btn.addEventListener('click', e => { e.stopPropagation(); menu.classList.toggle('hidden'); });
    }
    toggle('notifBtn',   'notifMenu');
    toggle('userMenuBtn','userMenu');

    document.addEventListener('click', () => {
        document.querySelectorAll('.dropdown-menu').forEach(m => m.classList.add('hidden'));
    });

    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            if (confirm('Are you sure you want to logout?')) {
                localStorage.removeItem('admin_jwt_token');
                window.location.replace('/login.html');
            }
        });
    }
}

// ─────────────────────────────────────────────
//  FILTERS
// ─────────────────────────────────────────────
function setupFilters() {
    ['filterClass','filterSection','filterYear'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.addEventListener('change', applyFilters);
    });
    let searchTimer;
    const si = document.getElementById('searchInput');
    if (si) si.addEventListener('input', () => { clearTimeout(searchTimer); searchTimer = setTimeout(applyFilters, 300); });

    document.getElementById('prevBtn').addEventListener('click', () => { if (currentPage > 1) { currentPage--; renderTable(); } });
    document.getElementById('nextBtn').addEventListener('click', () => {
        const pages = Math.ceil(filteredClasses.length / PAGE_SIZE);
        if (currentPage < pages) { currentPage++; renderTable(); }
    });
}

function applyFilters() {
    currentPage = 1;
    const cls  = document.getElementById('filterClass').value;
    const sec  = document.getElementById('filterSection').value;
    const yr   = document.getElementById('filterYear').value;
    const q    = (document.getElementById('searchInput').value || '').toLowerCase().trim();

    filteredClasses = classesData.filter(c => {
        if (cls !== 'all' && c.className !== cls) return false;
        if (sec !== 'all' && c.section    !== sec) return false;
        if (yr  !== 'all' && c.academicYear !== yr) return false;
        if (q) {
            const haystack = [c.className, c.classCode, c.roomNumber, c.classTeacher?.name, c.assistantTeacher?.name, c.description]
                .filter(Boolean).map(s => s.toLowerCase()).join(' ');
            if (!haystack.includes(q)) return false;
        }
        return true;
    });

    document.getElementById('totalCount').textContent = filteredClasses.length;
    renderTable();
    renderSchedule();
}

// ─────────────────────────────────────────────
//  MODAL BUTTONS SETUP
// ─────────────────────────────────────────────
function setupModalButtons() {
    document.getElementById('openCreateBtn').addEventListener('click', openCreateModal);
    document.getElementById('closeClassModal').addEventListener('click', closeClassModal);
    document.getElementById('cancelClassModal').addEventListener('click', closeClassModal);
    document.getElementById('submitClassBtn').addEventListener('click', handleFormSubmit);

    document.getElementById('toggleSubjectBtn').addEventListener('click', () => {
        const panel = document.getElementById('createSubjectPanel');
        const btn   = document.getElementById('toggleSubjectBtn');
        const show  = panel.style.display === 'none';
        panel.style.display = show ? 'block' : 'none';
        btn.innerHTML = show
            ? '<i class="fas fa-minus-circle"></i> Hide Subject Form'
            : '<i class="fas fa-plus-circle"></i> Create New Subject';
    });

    document.getElementById('saveSubjectBtn').addEventListener('click', saveSubject);

    // Schedule navigation
    document.getElementById('prevWeekBtn').addEventListener('click', () => {
        currentWeekDate.setDate(currentWeekDate.getDate() - 7); renderSchedule();
    });
    document.getElementById('nextWeekBtn').addEventListener('click', () => {
        currentWeekDate.setDate(currentWeekDate.getDate() + 7); renderSchedule();
    });

    // Bulk dropdown
    document.getElementById('bulkDropBtn').addEventListener('click', e => {
        e.stopPropagation();
        const panel = document.getElementById('bulkDropPanel');
        const btn   = document.getElementById('bulkDropBtn');
        const open  = panel.classList.toggle('hidden') === false;
        btn.classList.toggle('open', open);
        if (open) { renderBulkList(); document.getElementById('bulkSearchInput').focus(); }
    });

    document.getElementById('bulkSearchInput').addEventListener('input', function() {
        filterBulkList(this.value);
    });

    document.addEventListener('click', e => {
        if (!e.target.closest('.bulk-dropdown')) {
            document.getElementById('bulkDropPanel').classList.add('hidden');
            document.getElementById('bulkDropBtn').classList.remove('open');
        }
    });
}

// ─────────────────────────────────────────────
//  FORM LISTENERS
// ─────────────────────────────────────────────
function setupFormListeners() {
    document.getElementById('fClassTeacher').addEventListener('change', onClassTeacherChange);
    document.getElementById('fAssistantTeacher').addEventListener('change', onAssistantTeacherChange);
    document.getElementById('fClassTeacherSubject').addEventListener('change', onAnySubjectChange);
    document.getElementById('fAssistantTeacherSubject').addEventListener('change', onAnySubjectChange);
}

// ─────────────────────────────────────────────
//  ── API: TEACHERS ──
// ─────────────────────────────────────────────
async function fetchTeachers() {
    try {
        const res = await fetch(`${API_BASE}/teachers/get-all-teachers`);
        if (!res.ok) throw new Error(`Status ${res.status}`);
        const json = await res.json();
        const raw  = json.data || json;
        teachersData = Array.isArray(raw) ? raw.map(transformTeacher) : [];
        populateTeacherDropdowns();
    } catch (err) {
        console.error('fetchTeachers:', err);
        showToast('Failed to load teachers', 'error');
    }
}

function transformTeacher(t) {
    return {
        id:               t.id || t.teacherId,
        teacherCode:      t.teacherCode || `TCH${t.id}`,
        name:             t.fullName || `${t.firstName || ''} ${t.lastName || ''}`.trim() || 'Unknown',
        email:            t.email || '',
        contactNumber:    t.contactNumber || '',
        designation:      t.designation || '',
        department:       t.department || '',
        primarySubject:   t.primarySubject || '',
        additionalSubjects: Array.isArray(t.additionalSubjects) ? t.additionalSubjects : [],
        status:           t.status || 'Active',
    };
}

function populateTeacherDropdowns() {
    const ct = document.getElementById('fClassTeacher');
    const at = document.getElementById('fAssistantTeacher');
    [ct, at].forEach(sel => {
        const placeholder = sel.options[0].text;
        sel.innerHTML = `<option value="">${placeholder}</option>`;
    });
    teachersData.forEach(t => {
        ct.add(new Option(t.name, t.id));
        at.add(new Option(t.name, t.id));
    });
}

// ─────────────────────────────────────────────
//  ── API: SUBJECTS ──
// ─────────────────────────────────────────────
async function fetchSubjects() {
    try {
        const res = await fetch(`${API_BASE}/subjects/get-all`);
        if (!res.ok) throw new Error(`Status ${res.status}`);
        const json = await res.json();
        const raw  = json.data || json;
        subjectsData = Array.isArray(raw) ? raw.map(transformSubject) : [];
    } catch (err) {
        console.error('fetchSubjects:', err);
        showToast('Failed to load subjects', 'error');
    }
}

function transformSubject(s) {
    return {
        id:          s.subjectId || s.id,
        name:        s.subjectName || s.name,
        code:        s.subjectCode,
        type:        s.subjectType || 'CORE',
        grade:       s.gradeLevel || 'PG-2nd',
        maxMarks:    s.maxMarks || 100,
        passingMarks:s.passingMarks || 35,
        creditHours: s.creditHours || 4,
        periods:     s.periodsPerWeek || 5,
        color:       s.colorCode || subjectColor(s.subjectName),
        status:      s.status || 'ACTIVE',
    };
}

// ─────────────────────────────────────────────
//  ── API: CLASSES ──
// ─────────────────────────────────────────────
async function fetchClasses() {
    showLoading();
    try {
        const res = await fetch(`${API_BASE}/classes/get-all-classes`);
        if (!res.ok) throw new Error(`Status ${res.status}`);
        const json = await res.json();
        const raw  = json.data || json;
        classesData     = Array.isArray(raw) ? raw.map(transformClass) : [];
        filteredClasses = [...classesData];
        updateStats();
        document.getElementById('totalCount').textContent = filteredClasses.length;
        renderTable();
        renderSchedule();
    } catch (err) {
        console.error('fetchClasses:', err);
        showToast('Failed to load classes', 'error');
        document.getElementById('classesTableBody').innerHTML =
            `<tr><td colspan="6" style="text-align:center;padding:40px;color:var(--text-muted)">Failed to load data. Please retry.</td></tr>`;
    } finally {
        hideLoading();
    }
}

function transformClass(c) {
    const ct = teachersData.find(t => t.id === c.classTeacherId || t.id === String(c.classTeacherId)) || null;
    const at = teachersData.find(t => t.id === c.assistantTeacherId || t.id === String(c.assistantTeacherId)) || null;

    let bulkTeacherIds   = [];
    let bulkAssignmentsT = {};
    if (Array.isArray(c.otherTeacherSubject)) {
        c.otherTeacherSubject.forEach(a => {
            const tid = parseInt(a.teacherId);
            if (!isNaN(tid)) {
                bulkTeacherIds.push(tid);
                bulkAssignmentsT[tid] = {
                    subjects:      (a.subjects || []).map(s => s.subjectName || s),
                    otherSubjects: []
                };
            }
        });
    }

    return {
        id:               c.classId,
        className:        c.className,
        classCode:        c.classCode,
        academicYear:     c.academicYear,
        section:          c.section,
        maxStudents:      c.maxStudents || 30,
        currentStudents:  c.currentStudents || 0,
        roomNumber:       c.roomNumber || '',
        classTeacher:     ct ? { id: ct.id, name: ct.name, subject: c.classTeacherSubject || '' } : null,
        assistantTeacher: at ? { id: at.id, name: at.name, subject: c.assistantTeacherSubject || '' } : null,
        classTeacherId:   c.classTeacherId,
        assistantTeacherId: c.assistantTeacherId,
        classTeacherSubject:     c.classTeacherSubject || '',
        assistantTeacherSubject: c.assistantTeacherSubject || '',
        startTime:        c.startTime || '08:30',
        endTime:          c.endTime   || '13:30',
        workingDays:      (c.workingDays || []).map(d => d.toLowerCase()),
        status:           (c.status || 'active').toLowerCase(),
        description:      c.description || '',
        bulkTeacherIds,
        bulkAssignments:  bulkAssignmentsT,
        createdAt:        c.createdAt || new Date().toISOString(),
    };
}

function buildBackendPayload(formData) {
    const ctId = formData.classTeacherId ? parseInt(formData.classTeacherId) : null;
    const atId = formData.assistantTeacherId ? parseInt(formData.assistantTeacherId) : null;

    const otherTeacherSubject = [];
    bulkTeachers.forEach(tid => {
        const teacher    = teachersData.find(t => t.id === tid);
        const assignment = bulkAssignments[tid];
        if (!teacher || !assignment) return;
        const subs = [
            ...(assignment.subjects      || []),
            ...(assignment.otherSubjects || [])
        ].filter(Boolean).map(name => ({ subId: null, subjectName: name, totalMarks: 100 }));
        if (subs.length > 0) {
            otherTeacherSubject.push({ teacherId: String(tid), teacherName: teacher.name, subjects: subs });
        }
    });

    return {
        className:              formData.className,
        classCode:              formData.classCode,
        academicYear:           formData.academicYear,
        section:                formData.section,
        maxStudents:            parseInt(formData.maxStudents) || 30,
        currentStudents:        parseInt(formData.currentStudents) || 0,
        roomNumber:             formData.roomNumber || '',
        startTime:              formData.startTime || '08:30',
        endTime:                formData.endTime   || '13:30',
        description:            formData.description || '',
        classTeacherId:         ctId,
        classTeacherSubject:    formData.classTeacherSubject || '',
        assistantTeacherId:     atId,
        assistantTeacherSubject:formData.assistantTeacherSubject || '',
        workingDays:            formData.workingDays || [],
        status:                 'ACTIVE',
        otherTeacherSubject,
    };
}

async function saveClassAPI(payload, classId = null) {
    const url    = classId ? `${API_BASE}/classes/update-class/${classId}` : `${API_BASE}/classes/create-class`;
    const method = classId ? 'PUT' : 'POST';
    const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    });
    if (!res.ok) {
        const txt = await res.text();
        throw new Error(txt || `HTTP ${res.status}`);
    }
    return res.json();
}

async function deleteClass(classId) {
    const cls = classesData.find(c => c.id === classId);
    if (!cls) return;

    const msg = cls.currentStudents > 0
        ? `This class has ${cls.currentStudents} enrolled students. Delete anyway?`
        : 'Delete this class? This cannot be undone.';
    if (!confirm(msg)) return;

    showLoading();
    try {
        const res = await fetch(`${API_BASE}/classes/delete-class/${classId}`, { method: 'DELETE' });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        showToast('Class deleted successfully', 'success');
        await fetchClasses();
    } catch (err) {
        showToast('Delete failed: ' + err.message, 'error');
    } finally {
        hideLoading();
    }
}

// ─────────────────────────────────────────────
//  STATISTICS
// ─────────────────────────────────────────────
function updateStats() {
    const sum = (name) => classesData.filter(c => c.className === name).reduce((a, c) => a + c.currentStudents, 0);
    document.getElementById('statPGCount').textContent  = sum('PG');
    document.getElementById('statLKGCount').textContent = sum('LKG');
    document.getElementById('statUKGCount').textContent = sum('UKG');
    document.getElementById('stat1stCount').textContent = sum('1st');
    document.getElementById('stat2ndCount').textContent = sum('2nd');
}

// ─────────────────────────────────────────────
//  TABLE RENDER
// ─────────────────────────────────────────────
function renderTable() {
    const tbody = document.getElementById('classesTableBody');
    const info  = document.getElementById('tableInfo');

    if (filteredClasses.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;padding:40px;color:var(--text-muted)">
            <i class="fas fa-inbox" style="font-size:24px;display:block;margin-bottom:8px;opacity:.3"></i>
            No classes found. Adjust filters or create a new class.</td></tr>`;
        info.textContent = 'Showing 0 classes';
        document.getElementById('prevBtn').disabled = true;
        document.getElementById('nextBtn').disabled = true;
        return;
    }

    const pages   = Math.ceil(filteredClasses.length / PAGE_SIZE);
    const start   = (currentPage - 1) * PAGE_SIZE;
    const end     = Math.min(start + PAGE_SIZE, filteredClasses.length);
    const pageData = filteredClasses.slice(start, end);

    tbody.innerHTML = pageData.map(c => {
        const capPct = c.maxStudents ? Math.round((c.currentStudents / c.maxStudents) * 100) : 0;
        const capClass = capPct >= 90 ? 'cap-high' : capPct >= 75 ? 'cap-mid' : 'cap-low';

        let subjectCount = 0;
        Object.values(c.bulkAssignments || {}).forEach(a => {
            subjectCount += (a.subjects?.length || 0) + (a.otherSubjects?.length || 0);
        });

        const statusBadge = {
            active:   `<span class="badge badge-active"><span class="badge-dot"></span>Active</span>`,
            inactive: `<span class="badge badge-inactive"><span class="badge-dot"></span>Inactive</span>`,
            pending:  `<span class="badge badge-pending"><span class="badge-dot"></span>Pending</span>`,
        }[c.status] || `<span class="badge">${c.status}</span>`;

        return `<tr>
            <td>
                <div style="display:flex;align-items:center;gap:12px">
                    <div class="class-icon ${classIconClass(c.className)}">
                        <i class="fas ${classIconFA(c.className)}"></i>
                    </div>
                    <div>
                        <div style="font-weight:600">${c.className} — Section ${c.section}</div>
                        <div style="font-size:11px;color:var(--text-muted);font-family:'DM Mono',monospace">${c.classCode}</div>
                        <div style="font-size:11px;color:var(--text-muted);margin-top:2px">
                            ${c.academicYear}
                            ${c.roomNumber ? ` · ${c.roomNumber}` : ''}
                            ${subjectCount > 0 ? ` · <i class="fas fa-book" style="font-size:10px"></i> ${subjectCount}` : ''}
                        </div>
                    </div>
                </div>
            </td>
            <td>
                <div style="font-size:12px;color:var(--text-muted);margin-bottom:4px">${c.currentStudents} / ${c.maxStudents}</div>
                <div class="cap-bar"><div class="cap-fill ${capClass}" style="width:${capPct}%"></div></div>
                <div style="font-size:11px;color:var(--text-muted);margin-top:3px">${capPct}% filled</div>
            </td>
            <td>
                ${c.classTeacher ? `
                <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px">
                    <div class="t-avatar">${getTeacherInitials(c.classTeacher.name)}</div>
                    <div>
                        <div style="font-size:13px;font-weight:500">${c.classTeacher.name}</div>
                        <div style="font-size:11px;color:var(--text-muted)">Class Teacher${c.classTeacher.subject ? ` · ${c.classTeacher.subject}` : ''}</div>
                    </div>
                </div>` : '<span style="font-size:12px;color:var(--text-muted)">Not assigned</span>'}
                ${c.assistantTeacher ? `
                <div style="display:flex;align-items:center;gap:8px">
                    <div class="t-avatar" style="background:linear-gradient(135deg,#2f9e44,#1a6b2a)">${getTeacherInitials(c.assistantTeacher.name)}</div>
                    <div>
                        <div style="font-size:13px;font-weight:500">${c.assistantTeacher.name}</div>
                        <div style="font-size:11px;color:var(--text-muted)">Assistant${c.assistantTeacher.subject ? ` · ${c.assistantTeacher.subject}` : ''}</div>
                    </div>
                </div>` : ''}
            </td>
            <td>
                <div style="font-family:'DM Mono',monospace;font-size:12px;font-weight:500">
                    ${formatTime(c.startTime)} – ${formatTime(c.endTime)}
                </div>
                <div style="font-size:11px;color:var(--text-muted);margin-top:3px">${c.workingDays.length} days/week</div>
            </td>
            <td>${statusBadge}</td>
            <td>
                <div style="display:flex;gap:4px">
                    <button class="btn btn-outline btn-sm btn-icon" title="View" onclick="viewClass(${c.id})">
                        <i class="fas fa-eye" style="font-size:12px"></i>
                    </button>
                    <button class="btn btn-outline btn-sm btn-icon" title="Edit" onclick="editClass(${c.id})" style="color:var(--success)">
                        <i class="fas fa-edit" style="font-size:12px"></i>
                    </button>
                    <button class="btn btn-outline btn-sm btn-icon" title="Delete" onclick="deleteClass(${c.id})" style="color:var(--danger)">
                        <i class="fas fa-trash" style="font-size:12px"></i>
                    </button>
                </div>
            </td>
        </tr>`;
    }).join('');

    info.textContent = `Showing ${start + 1}–${end} of ${filteredClasses.length} classes`;
    document.getElementById('prevBtn').disabled = currentPage === 1;
    document.getElementById('nextBtn').disabled = currentPage === pages;
}

// ─────────────────────────────────────────────
//  SCHEDULE RENDER
// ─────────────────────────────────────────────
function renderSchedule() {
    const weekStart = new Date(currentWeekDate);
    weekStart.setDate(weekStart.getDate() - ((weekStart.getDay() + 6) % 7)); // Monday

    const friday = new Date(weekStart); friday.setDate(friday.getDate() + 4);
    document.getElementById('weekLabel').textContent =
        `${weekStart.toLocaleDateString('en-IN', { day:'2-digit', month:'short' })} – ${friday.toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' })}`;

    const dayKeys = ['monday','tuesday','wednesday','thursday','friday'];
    const body = document.getElementById('scheduleBody');

    body.innerHTML = dayKeys.map((day, i) => {
        const date   = new Date(weekStart); date.setDate(date.getDate() + i);
        const dayNum = date.getDate();
        const classes = filteredClasses.filter(c => c.workingDays.includes(day));

        return `<div class="schedule-col">
            <div class="schedule-col-header">
                <span class="schedule-date">${dayNum}</span>
                ${classes.length > 0 ? `<span class="schedule-count">${classes.length}</span>` : ''}
            </div>
            ${classes.length > 0
                ? classes.map(c => `
                    <div class="schedule-class-chip">
                        <div style="display:flex;align-items:flex-start;justify-content:space-between">
                            <div>
                                <span class="class-dot class-${c.className.replace(/\s/g,'')}"></span>
                                <span class="schedule-class-name">${c.className}-${c.section}</span>
                            </div>
                            <span class="schedule-class-room">${c.roomNumber?.replace('Room ','R') || '—'}</span>
                        </div>
                        <div class="schedule-class-time">${formatTimeShort(c.startTime)}–${formatTimeShort(c.endTime)}</div>
                        <div style="font-size:10px;color:var(--text-muted);margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">
                            ${c.classTeacher?.name?.split(' ')[0] || 'Staff'}
                        </div>
                    </div>`).join('')
                : `<div class="schedule-empty"><i class="fas fa-calendar-times"></i>No classes</div>`
            }
        </div>`;
    }).join('');
}

// ─────────────────────────────────────────────
//  CREATE / EDIT MODAL
// ─────────────────────────────────────────────
function openCreateModal() {
    editingClassId = null;
    resetFormState();
    document.getElementById('classModalTitle').textContent = 'Create New Class';
    document.getElementById('submitBtnText').textContent   = 'Create Class';
    document.getElementById('classModal').classList.add('active');
    document.body.style.overflow = 'hidden';
}

function editClass(classId) {
    const cls = classesData.find(c => c.id === classId);
    if (!cls) return;
    editingClassId = classId;
    resetFormState();
    document.getElementById('classModalTitle').textContent = 'Edit Class';
    document.getElementById('submitBtnText').textContent   = 'Update Class';

    // Fill basic fields
    setVal('fClassName',      cls.className);
    setVal('fClassCode',      cls.classCode);
    setVal('fAcademicYear',   cls.academicYear);
    setVal('fSection',        cls.section);
    setVal('fMaxStudents',    cls.maxStudents);
    setVal('fCurrentStudents',cls.currentStudents);
    setVal('fRoomNumber',     cls.roomNumber);
    setVal('fStartTime',      cls.startTime);
    setVal('fEndTime',        cls.endTime);
    setVal('fDescription',    cls.description);

    // Working days
    document.querySelectorAll('input[name="workingDays"]').forEach(cb => {
        cb.checked = cls.workingDays.includes(cb.value);
    });

    // Teachers
    if (cls.classTeacherId) {
        setVal('fClassTeacher', cls.classTeacherId);
        onClassTeacherChange();
        setTimeout(() => {
            if (cls.classTeacherSubject) {
                setVal('fClassTeacherSubject', cls.classTeacherSubject);
                onAnySubjectChange();
            }
        }, 100);
    }
    if (cls.assistantTeacherId) {
        setVal('fAssistantTeacher', cls.assistantTeacherId);
        onAssistantTeacherChange();
        setTimeout(() => {
            if (cls.assistantTeacherSubject) {
                setVal('fAssistantTeacherSubject', cls.assistantTeacherSubject);
                onAnySubjectChange();
            }
        }, 200);
    }

    // Bulk assignments
    bulkTeachers    = [...(cls.bulkTeacherIds || [])];
    bulkAssignments = JSON.parse(JSON.stringify(cls.bulkAssignments || {}));
    updateBulkDropLabel();
    renderBulkTable();

    document.getElementById('classModal').classList.add('active');
    document.body.style.overflow = 'hidden';
}

function closeClassModal() {
    document.getElementById('classModal').classList.remove('active');
    document.body.style.overflow = '';
    editingClassId = null;
    resetFormState();
}

function resetFormState() {
    document.getElementById('classForm').reset();
    selectedClassTeacherId  = null;
    selectedAssistTeacherId = null;
    allAssignedSubjects     = new Set();
    bulkTeachers            = [];
    bulkAssignments         = {};

    // Hide subject assignment rows
    document.getElementById('teacherSubjectSection').style.display = 'none';
    document.getElementById('classTeacherSubjectRow').style.display = 'none';
    document.getElementById('assiTeacherSubjectRow').style.display  = 'none';
    document.getElementById('fClassTeacherSubject').disabled       = true;
    document.getElementById('fAssistantTeacherSubject').disabled   = true;

    // Reset bulk UI
    updateBulkDropLabel();
    document.getElementById('bulkTableWrap').style.display = 'none';
    document.getElementById('bulkTableBody').innerHTML = '';

    // Reset subject form
    resetSubjectForm();
    document.getElementById('createSubjectPanel').style.display = 'none';
    document.getElementById('toggleSubjectBtn').innerHTML = '<i class="fas fa-plus-circle"></i> Create New Subject';

    // Restore defaults
    setVal('fAcademicYear', '2024-2025');
    setVal('fMaxStudents',  '30');
    setVal('fCurrentStudents', '0');
    setVal('fStartTime',    '08:30');
    setVal('fEndTime',      '13:30');
    document.querySelectorAll('input[name="workingDays"]').forEach(cb => {
        cb.checked = ['monday','tuesday','wednesday','thursday','friday'].includes(cb.value);
    });
}

function setVal(id, val) {
    const el = document.getElementById(id);
    if (el) el.value = val !== null && val !== undefined ? val : '';
}

// ─────────────────────────────────────────────
//  TEACHER / SUBJECT CHANGE HANDLERS
// ─────────────────────────────────────────────
function onClassTeacherChange() {
    const tid = document.getElementById('fClassTeacher').value;
    selectedClassTeacherId = tid ? parseInt(tid) : null;

    const teacher = tid ? teachersData.find(t => t.id === parseInt(tid) || String(t.id) === tid) : null;
    const row     = document.getElementById('classTeacherSubjectRow');
    const sel     = document.getElementById('fClassTeacherSubject');

    if (teacher) {
        document.getElementById('ctSubjectLabel').textContent = `Class Teacher: ${teacher.name}`;
        document.getElementById('ctSubjectMeta').textContent  = `${teacher.teacherCode} · ${teacher.primarySubject || ''}`;
        row.style.display = 'block';
        sel.disabled = false;
        populateSubjectDropdown(sel, teacher, sel.value);
        document.getElementById('teacherSubjectSection').style.display = 'block';
    } else {
        row.style.display = 'none';
        sel.disabled = true;
        sel.innerHTML = '<option value="">Select Subject</option>';
    }

    refreshAssistantTeacherDropdown();
    refreshBulkList();
    checkTeacherSectionVisibility();
    onAnySubjectChange();
}

function onAssistantTeacherChange() {
    const tid = document.getElementById('fAssistantTeacher').value;
    selectedAssistTeacherId = tid ? parseInt(tid) : null;

    const teacher = tid ? teachersData.find(t => t.id === parseInt(tid) || String(t.id) === tid) : null;
    const row     = document.getElementById('assiTeacherSubjectRow');
    const sel     = document.getElementById('fAssistantTeacherSubject');

    if (teacher) {
        document.getElementById('atSubjectLabel').textContent = `Assistant Teacher: ${teacher.name}`;
        document.getElementById('atSubjectMeta').textContent  = `${teacher.teacherCode} · ${teacher.primarySubject || ''}`;
        row.style.display = 'block';
        sel.disabled = false;
        populateSubjectDropdown(sel, teacher, sel.value);
        document.getElementById('teacherSubjectSection').style.display = 'block';
    } else {
        row.style.display = 'none';
        sel.disabled = true;
        sel.innerHTML = '<option value="">Select Subject</option>';
    }

    refreshBulkList();
    checkTeacherSectionVisibility();
    onAnySubjectChange();
}

function checkTeacherSectionVisibility() {
    const hasCT = !!document.getElementById('fClassTeacher').value;
    const hasAT = !!document.getElementById('fAssistantTeacher').value;
    if (!hasCT && !hasAT) {
        document.getElementById('teacherSubjectSection').style.display = 'none';
    }
}

function onAnySubjectChange() {
    // Rebuild allAssignedSubjects
    allAssignedSubjects = new Set();
    const ctSub = document.getElementById('fClassTeacherSubject').value;
    const atSub = document.getElementById('fAssistantTeacherSubject').value;
    if (ctSub) allAssignedSubjects.add(ctSub);
    if (atSub) allAssignedSubjects.add(atSub);

    Object.values(bulkAssignments).forEach(a => {
        (a.subjects || []).forEach(s => allAssignedSubjects.add(s));
        (a.otherSubjects || []).forEach(s => allAssignedSubjects.add(s));
    });

    // Refresh both subject dropdowns keeping current value
    const ctTeacher = selectedClassTeacherId ? teachersData.find(t => t.id === selectedClassTeacherId) : null;
    const atTeacher = selectedAssistTeacherId ? teachersData.find(t => t.id === selectedAssistTeacherId) : null;
    const ctSel = document.getElementById('fClassTeacherSubject');
    const atSel = document.getElementById('fAssistantTeacherSubject');
    if (ctTeacher && !ctSel.disabled) populateSubjectDropdown(ctSel, ctTeacher, ctSel.value);
    if (atTeacher && !atSel.disabled) populateSubjectDropdown(atSel, atTeacher, atSel.value);
}

function populateSubjectDropdown(selectEl, teacher, currentValue) {
    selectEl.innerHTML = '<option value="">Select Subject</option>';
    subjectsData.forEach(sub => {
        // Include if: it's the current value, or it's not assigned elsewhere
        if (sub.name !== currentValue && allAssignedSubjects.has(sub.name)) return;
        const opt  = new Option(`${sub.name}${sub.code ? ' · ' + sub.code : ''}`, sub.name);
        opt.selected = sub.name === currentValue;
        selectEl.add(opt);
    });
    if (subjectsData.length === 0) {
        selectEl.add(new Option('No subjects available', ''));
    }
}

function clearTeacherSubject(which) {
    const selId = which === 'ct' ? 'fClassTeacherSubject' : 'fAssistantTeacherSubject';
    const sel   = document.getElementById(selId);
    if (sel) { sel.value = ''; onAnySubjectChange(); }
}

function refreshAssistantTeacherDropdown() {
    const ctId = document.getElementById('fClassTeacher').value;
    const atSel = document.getElementById('fAssistantTeacher');
    const prev  = atSel.value;
    atSel.innerHTML = '<option value="">Select Assistant Teacher</option>';
    teachersData.forEach(t => {
        if (ctId && String(t.id) === ctId) return; // exclude class teacher
        const opt = new Option(t.name, t.id);
        if (String(t.id) === prev) opt.selected = true;
        atSel.add(opt);
    });
}

// ─────────────────────────────────────────────
//  BULK ASSIGN
// ─────────────────────────────────────────────
function getExcludedTeacherIds() {
    return [
        document.getElementById('fClassTeacher').value,
        document.getElementById('fAssistantTeacher').value
    ].filter(Boolean).map(v => String(v));
}

function renderBulkList() {
    const list    = document.getElementById('bulkTeacherList');
    const excluded = getExcludedTeacherIds();
    const available = teachersData.filter(t => !excluded.includes(String(t.id)));

    if (available.length === 0) {
        list.innerHTML = '<div style="padding:16px;text-align:center;color:var(--text-muted);font-size:13px">No additional teachers available</div>';
        return;
    }

    list.innerHTML = available.map(t => {
        const checked = bulkTeachers.includes(t.id);
        const subInfo = [t.primarySubject, ...(t.additionalSubjects || [])].filter(Boolean).join(', ');
        return `<div class="bulk-item">
            <input type="checkbox" id="bt-${t.id}" ${checked ? 'checked' : ''} onchange="toggleBulkTeacher(${t.id}, this.checked)">
            <label for="bt-${t.id}" style="cursor:pointer;flex:1">
                <div class="bulk-item-name">${t.name}</div>
                <div class="bulk-item-meta">${t.teacherCode}${subInfo ? ' · ' + subInfo : ''}</div>
            </label>
        </div>`;
    }).join('');
}

function filterBulkList(q) {
    q = q.toLowerCase();
    document.querySelectorAll('#bulkTeacherList .bulk-item').forEach(item => {
        const text = item.textContent.toLowerCase();
        item.style.display = !q || text.includes(q) ? '' : 'none';
    });
}

function refreshBulkList() {
    const panel = document.getElementById('bulkDropPanel');
    if (!panel.classList.contains('hidden')) renderBulkList();
}

function toggleBulkTeacher(id, checked) {
    if (checked && !bulkTeachers.includes(id)) {
        bulkTeachers.push(id);
        if (!bulkAssignments[id]) {
            const teacher = teachersData.find(t => t.id === id);
            bulkAssignments[id] = {
                subjects:      teacher?.primarySubject ? [teacher.primarySubject] : [],
                otherSubjects: []
            };
        }
    } else if (!checked) {
        removeBulkTeacher(id, false);
    }
    document.getElementById('bulkSelectedCount').textContent = bulkTeachers.length;
}

function clearBulkSelection() {
    bulkTeachers    = [];
    bulkAssignments = {};
    document.getElementById('bulkSelectedCount').textContent = '0';
    renderBulkList();
    updateBulkDropLabel();
    renderBulkTable();
    onAnySubjectChange();
}

function saveBulkSelection() {
    updateBulkDropLabel();
    document.getElementById('bulkDropPanel').classList.add('hidden');
    document.getElementById('bulkDropBtn').classList.remove('open');
    renderBulkTable();
    onAnySubjectChange();
}

function updateBulkDropLabel() {
    const n = bulkTeachers.length;
    document.getElementById('bulkDropLabel').textContent = n === 0 ? 'Select teachers…' : `${n} teacher${n > 1 ? 's' : ''} selected`;
    document.getElementById('bulkTeacherCount').textContent = n;
}

function renderBulkTable() {
    const wrap = document.getElementById('bulkTableWrap');
    const body = document.getElementById('bulkTableBody');

    if (bulkTeachers.length === 0) { wrap.style.display = 'none'; body.innerHTML = ''; return; }
    wrap.style.display = 'block';

    body.innerHTML = bulkTeachers.map((tid, idx) => {
        const teacher    = teachersData.find(t => t.id === tid);
        if (!teacher) return '';
        const assignment = bulkAssignments[tid] || { subjects: [], otherSubjects: [] };
        const available  = [teacher.primarySubject, ...(teacher.additionalSubjects || [])].filter(Boolean);
        const uniqueAvail = [...new Set(available)];

        const options = uniqueAvail.map(s =>
            `<option value="${s}" ${assignment.subjects.includes(s) ? 'selected' : ''}>${s}</option>`
        ).join('');

        const otherChips = (assignment.otherSubjects || []).map((s, i) =>
            `<span class="subject-chip chip-purple">${s}<span class="chip-remove" onclick="removeBulkOtherSubject(${tid}, ${i})">×</span></span>`
        ).join('');

        return `<tr>
            <td style="font-size:12px;color:var(--text-muted)">${idx + 1}</td>
            <td>
                <div style="font-weight:500">${teacher.name}</div>
                <div style="font-size:11px;color:var(--text-muted)">${teacher.teacherCode}</div>
            </td>
            <td>
                <select class="multi-select" multiple style="height:72px"
                    onchange="onBulkSubjectChange(${tid}, this)">
                    ${options}
                </select>
                <div style="margin-top:5px;font-size:11px">
                    <strong>Selected:</strong> <span id="bsd-${tid}">${assignment.subjects.join(', ') || '—'}</span>
                    ${otherChips.length ? `<div style="margin-top:3px">${otherChips}</div>` : ''}
                </div>
            </td>
            <td>
                <div style="display:flex;flex-direction:column;gap:5px">
                    <button type="button" class="btn btn-outline btn-sm" onclick="openOthersModal(${tid})">
                        <i class="fas fa-plus"></i> Others
                    </button>
                    <button type="button" class="btn btn-outline btn-sm" onclick="removeBulkTeacherFromTable(${tid})" style="color:var(--danger)">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
            </td>
        </tr>`;
    }).filter(Boolean).join('');
}

function onBulkSubjectChange(tid, sel) {
    const selected = Array.from(sel.selectedOptions).map(o => o.value);
    if (!bulkAssignments[tid]) bulkAssignments[tid] = { subjects: [], otherSubjects: [] };
    bulkAssignments[tid].subjects = selected;
    const disp = document.getElementById(`bsd-${tid}`);
    if (disp) disp.textContent = selected.join(', ') || '—';
    onAnySubjectChange();
}

function removeBulkTeacherFromTable(tid) {
    removeBulkTeacher(tid, true);
}

function removeBulkTeacher(tid, rerender = true) {
    bulkTeachers    = bulkTeachers.filter(id => id !== tid);
    delete bulkAssignments[tid];
    const cb = document.getElementById(`bt-${tid}`);
    if (cb) cb.checked = false;
    document.getElementById('bulkSelectedCount').textContent = bulkTeachers.length;
    updateBulkDropLabel();
    if (rerender) renderBulkTable();
    onAnySubjectChange();
}

function removeBulkOtherSubject(tid, idx) {
    if (!bulkAssignments[tid]) return;
    const removed = bulkAssignments[tid].otherSubjects.splice(idx, 1)[0];
    if (removed) allAssignedSubjects.delete(removed);
    renderBulkTable();
    onAnySubjectChange();
}

// ─────────────────────────────────────────────
//  OTHERS MODAL
// ─────────────────────────────────────────────
let othersModalTeacherId = null;

function openOthersModal(tid) {
    othersModalTeacherId = tid;
    const teacher    = teachersData.find(t => t.id === tid);
    if (!teacher) return;
    const assignment = bulkAssignments[tid] || { subjects: [], otherSubjects: [] };

    document.getElementById('othersModalTitle').textContent = `Other Subjects — ${teacher.name}`;

    const available = subjectsData.filter(sub => {
        if (assignment.subjects.includes(sub.name))      return false;
        if (assignment.otherSubjects.includes(sub.name)) return false;
        if (allAssignedSubjects.has(sub.name))           return false;
        return true;
    });

    const otherItems = (assignment.otherSubjects || []).map((s, i) => `
        <div style="display:flex;align-items:center;justify-content:space-between;padding:8px 0;border-bottom:1px solid var(--border-light)">
            <span style="font-size:13px">${s}</span>
            <button type="button" class="btn btn-outline btn-sm" onclick="removeOthersModalSubject(${i})" style="color:var(--danger)"><i class="fas fa-trash"></i></button>
        </div>`).join('') || '<p style="font-size:12px;color:var(--text-muted)">No extra subjects added yet.</p>';

    document.getElementById('othersModalBody').innerHTML = `
        <div style="margin-bottom:14px">
            <div style="font-size:12px;font-weight:600;color:var(--text-muted);margin-bottom:6px">Teacher's subjects</div>
            <div style="display:flex;flex-wrap:wrap;gap:4px;margin-bottom:14px">
                <span class="subject-chip chip-primary">${teacher.primarySubject || '—'}</span>
                ${(teacher.additionalSubjects || []).map(s => `<span class="subject-chip chip-success">${s}</span>`).join('')}
            </div>
            <div style="font-size:12px;font-weight:600;color:var(--text-muted);margin-bottom:6px">Add extra subject</div>
            <div style="display:flex;gap:8px;margin-bottom:14px">
                <select class="form-control" id="othersSubjectSel">
                    <option value="">Select subject…</option>
                    ${available.map(s => `<option value="${s.id}">${s.name}</option>`).join('')}
                </select>
                <button type="button" class="btn btn-primary" onclick="confirmAddOtherSubject()"><i class="fas fa-plus"></i></button>
            </div>
            ${available.length === 0 ? `<p style="font-size:11px;color:var(--warning)"><i class="fas fa-exclamation-triangle"></i> All subjects already assigned.</p>` : ''}
        </div>
        <div style="font-size:12px;font-weight:600;color:var(--text-muted);margin-bottom:8px">Currently added</div>
        <div id="othersCurrentList">${otherItems}</div>
    `;

    document.getElementById('othersModalWrap').classList.add('active');
    document.body.style.overflow = 'hidden';
}

function confirmAddOtherSubject() {
    const selEl = document.getElementById('othersSubjectSel');
    if (!selEl || !selEl.value) { showToast('Select a subject first', 'warning'); return; }

    const sub = subjectsData.find(s => s.id === parseInt(selEl.value));
    if (!sub) return;

    const tid = othersModalTeacherId;
    if (!bulkAssignments[tid]) bulkAssignments[tid] = { subjects: [], otherSubjects: [] };

    if (allAssignedSubjects.has(sub.name)) {
        showToast('Subject already assigned to another teacher', 'error');
        return;
    }

    bulkAssignments[tid].otherSubjects.push(sub.name);
    allAssignedSubjects.add(sub.name);

    showToast(`Added ${sub.name}`, 'success');
    openOthersModal(tid); // re-render
    renderBulkTable();
    onAnySubjectChange();
}

function removeOthersModalSubject(idx) {
    const tid = othersModalTeacherId;
    if (!bulkAssignments[tid]) return;
    const removed = bulkAssignments[tid].otherSubjects.splice(idx, 1)[0];
    if (removed) allAssignedSubjects.delete(removed);
    openOthersModal(tid); // re-render
    renderBulkTable();
    onAnySubjectChange();
}

function closeOthersModal() {
    document.getElementById('othersModalWrap').classList.remove('active');
    document.body.style.overflow = '';
    othersModalTeacherId = null;
}

// ─────────────────────────────────────────────
//  FORM SUBMIT
// ─────────────────────────────────────────────
async function handleFormSubmit() {
    const formData = collectFormData();
    if (!validateFormData(formData)) return;

    showLoading();
    try {
        const payload = buildBackendPayload(formData);
        await saveClassAPI(payload, editingClassId);
        showToast(editingClassId ? 'Class updated successfully' : 'Class created successfully', 'success');
        closeClassModal();
        await fetchClasses();
    } catch (err) {
        showToast('Save failed: ' + err.message, 'error');
    } finally {
        hideLoading();
    }
}

function collectFormData() {
    return {
        className:              getVal('fClassName'),
        classCode:              getVal('fClassCode'),
        academicYear:           getVal('fAcademicYear'),
        section:                getVal('fSection'),
        maxStudents:            getVal('fMaxStudents'),
        currentStudents:        getVal('fCurrentStudents'),
        roomNumber:             getVal('fRoomNumber'),
        classTeacherId:         getVal('fClassTeacher'),
        assistantTeacherId:     getVal('fAssistantTeacher'),
        classTeacherSubject:    getVal('fClassTeacherSubject'),
        assistantTeacherSubject:getVal('fAssistantTeacherSubject'),
        startTime:              getVal('fStartTime'),
        endTime:                getVal('fEndTime'),
        description:            getVal('fDescription'),
        workingDays:            Array.from(document.querySelectorAll('input[name="workingDays"]:checked')).map(cb => cb.value),
    };
}

function getVal(id) {
    const el = document.getElementById(id);
    return el ? el.value.trim() : '';
}

function validateFormData(f) {
    if (!f.className)    { showToast('Please select a class name', 'error');     return false; }
    if (!f.classCode)    { showToast('Please enter a class code', 'error');      return false; }
    if (!f.academicYear) { showToast('Please select academic year', 'error');    return false; }
    if (!f.section)      { showToast('Please select a section', 'error');        return false; }
    if (parseInt(f.currentStudents) > parseInt(f.maxStudents)) {
        showToast('Current students cannot exceed max capacity', 'error');        return false;
    }
    if (f.workingDays.length === 0) {
        showToast('Select at least one working day', 'error');                    return false;
    }
    if (f.classTeacherId && !f.classTeacherSubject) {
        showToast('Please assign a subject to the class teacher', 'error');       return false;
    }
    return true;
}

// ─────────────────────────────────────────────
//  SUBJECT CREATION
// ─────────────────────────────────────────────
function autoSubjectCode() {
    const name = document.getElementById('sName').value.trim();
    if (!name) return;
    const code = name.replace(/[^A-Za-z]/g,'').toUpperCase().slice(0,4) + Math.floor(1000 + Math.random()*9000);
    const codeEl = document.getElementById('sCode');
    if (codeEl && !codeEl.value) codeEl.value = code;
}

function resetSubjectForm() {
    ['sCode','sName','sDescription'].forEach(id => setVal(id, ''));
    setVal('sType',         'CORE');
    setVal('sMaxMarks',     '100');
    setVal('sPassMarks',    '35');
    setVal('sCreditHours',  '4');
    setVal('sPeriodsWeek',  '5');
}

function hideSubjectPanel() {
    document.getElementById('createSubjectPanel').style.display = 'none';
    document.getElementById('toggleSubjectBtn').innerHTML = '<i class="fas fa-plus-circle"></i> Create New Subject';
}

async function saveSubject() {
    const code = getVal('sCode');
    const name = getVal('sName');
    if (!code || !name) { showToast('Subject Code and Name are required', 'error'); return; }

    if (subjectsData.some(s => s.name.toLowerCase() === name.toLowerCase())) {
        showToast('A subject with this name already exists', 'error'); return;
    }

    const payload = {
        subjectCode:     code,
        subjectName:     name,
        description:     getVal('sDescription'),
        subjectType:     getVal('sType') || 'CORE',
        gradeLevel:      'PG-2nd',
        maxMarks:        parseInt(getVal('sMaxMarks'))    || 100,
        passingMarks:    parseInt(getVal('sPassMarks'))   || 35,
        creditHours:     parseInt(getVal('sCreditHours')) || 4,
        periodsPerWeek:  parseInt(getVal('sPeriodsWeek')) || 5,
        colorCode:       '#3b5bdb',
        status:          'ACTIVE',
    };

    showLoading();
    try {
        const res = await fetch(`${API_BASE}/subjects/create`, {
            method:  'POST',
            headers: { 'Content-Type': 'application/json' },
            body:    JSON.stringify(payload)
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        await fetchSubjects();
        showToast(`Subject "${name}" created`, 'success');
        resetSubjectForm();
        hideSubjectPanel();
        onAnySubjectChange(); // refresh dropdowns
    } catch (err) {
        showToast('Failed to create subject: ' + err.message, 'error');
    } finally {
        hideLoading();
    }
}

// ─────────────────────────────────────────────
//  VIEW CLASS MODAL
// ─────────────────────────────────────────────
function viewClass(classId) {
    const c = classesData.find(x => x.id === classId);
    if (!c) return;

    const capPct  = c.maxStudents ? Math.round((c.currentStudents / c.maxStudents) * 100) : 0;
    const capCls  = capPct >= 90 ? '#e03131' : capPct >= 75 ? '#f08c00' : '#2f9e44';

    const hasBulk = bulkTeachers.length > 0 || Object.keys(c.bulkAssignments || {}).length > 0;

    const allSubjects = [];
    Object.values(c.bulkAssignments || {}).forEach(a => {
        (a.subjects      || []).forEach(s => { if (!allSubjects.includes(s)) allSubjects.push(s); });
        (a.otherSubjects || []).forEach(s => { if (!allSubjects.includes(s)) allSubjects.push(s); });
    });

    const dayLabels = { monday:'Mon', tuesday:'Tue', wednesday:'Wed', thursday:'Thu', friday:'Fri', saturday:'Sat' };

    document.getElementById('viewModalTitle').textContent = `${c.className} — Section ${c.section}`;
    document.getElementById('viewModalCode').textContent  = c.classCode;

    document.getElementById('viewModalBody').innerHTML = `
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:20px">
            <div style="background:var(--surface-2);border:1px solid var(--border);border-radius:var(--radius);padding:16px">
                <div style="font-weight:600;margin-bottom:12px;font-size:13px">Class Information</div>
                ${row('Academic Year', c.academicYear)}
                ${row('Room',          c.roomNumber || '—')}
                ${row('Code',          `<span style="font-family:'DM Mono',monospace">${c.classCode}</span>`)}
                ${row('Created',       formatDate(c.createdAt))}
                ${row('Status',        `<span class="badge badge-${c.status}">${c.status}</span>`)}
            </div>
            <div style="background:var(--surface-2);border:1px solid var(--border);border-radius:var(--radius);padding:16px">
                <div style="font-weight:600;margin-bottom:12px;font-size:13px">Capacity</div>
                ${row('Max Students',     c.maxStudents)}
                ${row('Current Students', c.currentStudents)}
                ${row('Available Seats',  c.maxStudents - c.currentStudents)}
                <div style="margin-top:10px">
                    <div style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:4px">
                        <span style="color:var(--text-muted)">Utilisation</span>
                        <span style="font-weight:600;color:${capCls}">${capPct}%</span>
                    </div>
                    <div class="cap-bar"><div class="cap-fill" style="width:${capPct}%;background:${capCls}"></div></div>
                </div>
            </div>
        </div>

        <div style="margin-bottom:20px">
            <div style="font-weight:600;margin-bottom:12px;font-size:13px">Teaching Staff</div>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
                ${staffCard(c.classTeacher, 'Class Teacher', 'var(--primary)')}
                ${staffCard(c.assistantTeacher, 'Assistant Teacher', 'var(--success)')}
            </div>
        </div>

        ${hasBulk || c.bulkTeacherIds?.length > 0 ? `
        <div style="margin-bottom:20px">
            <div style="font-weight:600;margin-bottom:12px;font-size:13px">Bulk Teacher Assignments</div>
            <div style="border:1px solid var(--border);border-radius:var(--radius);overflow:hidden">
                <table style="width:100%;border-collapse:collapse;font-size:12px">
                    <thead><tr style="background:var(--surface-2)">
                        <th style="padding:8px 12px;text-align:left;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:var(--text-muted)">#</th>
                        <th style="padding:8px 12px;text-align:left">Teacher</th>
                        <th style="padding:8px 12px;text-align:left">Subjects</th>
                    </tr></thead>
                    <tbody>
                        ${(c.bulkTeacherIds || []).map((tid, i) => {
                            const t  = teachersData.find(x => x.id === tid);
                            const a  = (c.bulkAssignments || {})[tid];
                            if (!t || !a) return '';
                            const subs = [...(a.subjects || []), ...(a.otherSubjects || [])];
                            return `<tr style="border-top:1px solid var(--border-light)">
                                <td style="padding:8px 12px">${i+1}</td>
                                <td style="padding:8px 12px"><div style="font-weight:500">${t.name}</div><div style="color:var(--text-muted)">${t.teacherCode}</div></td>
                                <td style="padding:8px 12px">${subs.map(s => `<span class="badge" style="background:var(--primary-bg);color:var(--primary);margin:2px">${s}</span>`).join('') || '—'}</td>
                            </tr>`;
                        }).filter(Boolean).join('')}
                    </tbody>
                </table>
            </div>
        </div>` : ''}

        <div style="margin-bottom:20px">
            <div style="font-weight:600;margin-bottom:10px;font-size:13px">Schedule</div>
            <div style="background:var(--surface-2);border:1px solid var(--border);border-radius:var(--radius);padding:14px">
                <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px">
                    <span style="font-family:'DM Mono',monospace;font-size:13px;font-weight:500">${formatTime(c.startTime)} – ${formatTime(c.endTime)}</span>
                    <span class="badge" style="background:var(--primary-bg);color:var(--primary)">${c.workingDays.length} days/week</span>
                </div>
                <div style="display:flex;flex-wrap:wrap;gap:6px">
                    ${['monday','tuesday','wednesday','thursday','friday','saturday'].map(d =>
                        `<span style="padding:5px 10px;border-radius:6px;font-size:12px;font-weight:500;
                            background:${c.workingDays.includes(d) ? 'var(--primary-bg)' : 'var(--surface-3)'};
                            color:${c.workingDays.includes(d) ? 'var(--primary)' : 'var(--text-muted)'};
                            border:1px solid ${c.workingDays.includes(d) ? 'rgba(59,91,219,.3)' : 'var(--border)'}">
                            ${dayLabels[d]}
                        </span>`
                    ).join('')}
                </div>
            </div>
        </div>

        ${allSubjects.length > 0 ? `
        <div style="margin-bottom:20px">
            <div style="font-weight:600;margin-bottom:10px;font-size:13px">Subjects (${allSubjects.length})</div>
            <div style="display:flex;flex-wrap:wrap;gap:6px">
                ${allSubjects.map(s => `<span class="badge" style="background:var(--surface-3);color:var(--text-secondary)"><i class="fas fa-book" style="font-size:10px;color:var(--primary)"></i> ${s}</span>`).join('')}
            </div>
        </div>` : ''}

        ${c.description ? `
        <div style="margin-bottom:20px">
            <div style="font-weight:600;margin-bottom:8px;font-size:13px">Description</div>
            <p style="font-size:13px;color:var(--text-secondary);line-height:1.6">${c.description}</p>
        </div>` : ''}

        <div style="display:flex;justify-content:flex-end;gap:10px;padding-top:16px;border-top:1px solid var(--border)">
            <button class="btn btn-outline" onclick="closeViewModal();editClass(${c.id})"><i class="fas fa-edit"></i> Edit Class</button>
            <button class="btn btn-primary" onclick="closeViewModal()">Close</button>
        </div>
    `;

    document.getElementById('viewModal').classList.add('active');
    document.body.style.overflow = 'hidden';
}

function row(label, val) {
    return `<div class="detail-row"><span class="detail-key">${label}</span><span class="detail-val">${val}</span></div>`;
}

function staffCard(teacher, role, color) {
    if (!teacher) return `<div style="background:var(--surface-3);border:1px solid var(--border);border-radius:var(--radius);padding:14px;display:flex;align-items:center;justify-content:center;color:var(--text-muted);font-size:12px">${role} not assigned</div>`;
    const fullT = teachersData.find(t => t.id === teacher.id);
    return `<div style="background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);padding:14px">
        <div style="display:flex;align-items:center;gap:10px;margin-bottom:10px">
            <div class="t-avatar" style="background:linear-gradient(135deg,${color}aa,${color})">${getTeacherInitials(teacher.name)}</div>
            <div>
                <div style="font-weight:600;font-size:13px">${teacher.name}</div>
                <div style="font-size:11px;color:var(--text-muted)">${role}</div>
                ${teacher.subject ? `<div style="font-size:11px;color:var(--primary);margin-top:1px"><i class="fas fa-book" style="font-size:9px"></i> ${teacher.subject}</div>` : ''}
            </div>
        </div>
        ${fullT?.email ? `<div style="font-size:11px;color:var(--text-muted)"><i class="fas fa-envelope" style="width:12px"></i> ${fullT.email}</div>` : ''}
        ${fullT?.contactNumber ? `<div style="font-size:11px;color:var(--text-muted);margin-top:2px"><i class="fas fa-phone" style="width:12px"></i> ${fullT.contactNumber}</div>` : ''}
    </div>`;
}

function closeViewModal() {
    document.getElementById('viewModal').classList.remove('active');
    document.body.style.overflow = '';
}