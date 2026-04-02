
// ═══════════════════════════════════════════════════════════
//  ATTENDANCE MANAGEMENT — attendance.js  (Full Backend Integration)
//  Backend: http://localhost:8084/api/attendance
//  Students: http://localhost:8084/api/students
// ═══════════════════════════════════════════════════════════

const BASE_URL         = 'http://localhost:8084/api/attendance';
const STUDENT_BASE_URL = 'http://localhost:8084/api/students';

// ─── Globals ───────────────────────────────────────────────
let sidebarCollapsed   = false;
let isMobile           = window.innerWidth < 1024;
let filteredData       = [];
let currentPage        = 1;
const itemsPerPage     = 10;
let currentMonth       = new Date().getMonth();
let currentYear        = new Date().getFullYear();
let selectedDate       = new Date().toISOString().split('T')[0];
let selectedClass      = 'all';
let selectedSection    = 'all';
let selectedStatus     = 'all';
let summaryData        = [];
let summaryMonth       = new Date().getMonth();
let summaryYear        = new Date().getFullYear();
let summaryClass       = 'all';
let allStudentsForDate = [];

// Bulk
let bulkSelectedStudents = new Set();
let bulkStatus           = 'present';
let bulkStudentListData  = [];

// Edit note state
let editNoteStudentId   = null;
let editNoteAttendId    = null;
let editNoteCurrentStu  = null;

// Student details state (for export)
let sdCurrentStudentId   = null;
let sdCurrentStudentInfo = null;

const monthNames = ['January','February','March','April','May','June',
                    'July','August','September','October','November','December'];

const AV_COLORS = ['#6366f1','#ec4899','#14b8a6','#f59e0b','#8b5cf6','#06b6d4','#10b981','#ef4444'];
function avatarColor(id) { return AV_COLORS[(id || 0) % AV_COLORS.length]; }
function initials(name)  { return (name || '?').split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase(); }
function cap(s)          { return s ? s.charAt(0).toUpperCase() + s.slice(1) : ''; }

// ─── Auth ──────────────────────────────────────────────────
function getAuthHeaders() {
  const t = localStorage.getItem('admin_jwt_token');
  return {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    ...(t ? { Authorization: `Bearer ${t}` } : {})
  };
}

// ─── Class parser ──────────────────────────────────────────
function parseClassSection(s) {
  if (!s || s === 'all') return { className: null, section: null };
  const m = s.match(/^(\d+)\s*([A-Za-z]+)?$/);
  if (m) return { className: m[1], section: m[2] ? m[2].toUpperCase() : '' };
  return { className: s, section: '' };
}

// ═══════════════════════════════════════════════════════════
//  TOAST NOTIFICATION SYSTEM (Enhanced)
// ═══════════════════════════════════════════════════════════
const Toast = {
  container: null,
  queue: [],
  maxVisible: 5,
  visible: 0,

  init() {
    if (!this.container) {
      this.container = document.getElementById('toastContainer');
    }
  },

  show(message, type = 'info', title = null, duration = 4500) {
    this.init();
    if (!this.container) return;

    const icons = {
      success: 'fa-check-circle',
      error:   'fa-exclamation-circle',
      info:    'fa-info-circle',
      warning: 'fa-exclamation-triangle',
      loading: 'fa-spinner fa-spin'
    };
    const defaultTitles = {
      success: 'Success',
      error:   'Error',
      info:    'Info',
      warning: 'Warning',
      loading: 'Loading'
    };

    const t = document.createElement('div');
    t.className = `toast toast-${type}`;
    t.style.cssText = 'transform:translateX(110%);opacity:0;transition:transform 0.35s cubic-bezier(.21,1.02,.73,1),opacity 0.35s ease;';
    t.innerHTML = `
      <i class="fas ${icons[type] || 'fa-info-circle'} toast-icon"></i>
      <div class="toast-body">
        <div class="toast-title">${title || defaultTitles[type]}</div>
        <div class="toast-msg">${message}</div>
      </div>
      <button class="toast-close" aria-label="Dismiss"><i class="fas fa-times"></i></button>`;

    // Progress bar
    if (type !== 'loading') {
      const prog = document.createElement('div');
      prog.style.cssText = `position:absolute;bottom:0;left:0;height:3px;border-radius:0 0 var(--radius) var(--radius);
        background:currentColor;opacity:0.35;width:100%;
        transition:width ${duration}ms linear;`;
      t.style.position = 'relative';
      t.style.overflow = 'hidden';
      t.appendChild(prog);
      setTimeout(() => { prog.style.width = '0%'; }, 50);
    }

    t.querySelector('.toast-close').addEventListener('click', () => this._dismiss(t));
    this.container.appendChild(t);
    this.visible++;

    // Animate in
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        t.style.transform = 'translateX(0)';
        t.style.opacity   = '1';
      });
    });

    if (type !== 'loading') {
      t._timeout = setTimeout(() => this._dismiss(t), duration);
    }

    // Trim if too many
    while (this.container.children.length > this.maxVisible) {
      this._dismiss(this.container.firstChild, true);
    }

    return t;
  },

  _dismiss(el, immediate = false) {
    if (!el || !el.parentNode) return;
    if (el._timeout) clearTimeout(el._timeout);
    if (immediate) {
      el.remove();
      this.visible = Math.max(0, this.visible - 1);
      return;
    }
    el.style.transform  = 'translateX(110%)';
    el.style.opacity    = '0';
    el.style.maxHeight  = el.offsetHeight + 'px';
    setTimeout(() => {
      el.style.maxHeight  = '0';
      el.style.margin     = '0';
      el.style.padding    = '0';
      el.style.border     = '0';
    }, 300);
    setTimeout(() => {
      el.remove();
      this.visible = Math.max(0, this.visible - 1);
    }, 600);
  },

  dismiss(el) { this._dismiss(el); },

  success(msg, title, dur) { return this.show(msg, 'success', title, dur); },
  error(msg, title, dur)   { return this.show(msg, 'error',   title, dur || 6000); },
  info(msg, title, dur)    { return this.show(msg, 'info',    title, dur); },
  warning(msg, title, dur) { return this.show(msg, 'warning', title, dur); },
  loading(msg)             { return this.show(msg, 'loading', 'Please wait…', 0); },

  update(el, msg, type) {
    if (!el) return;
    const body = el.querySelector('.toast-msg');
    const icon = el.querySelector('.toast-icon');
    const titleEl = el.querySelector('.toast-title');
    if (body) body.textContent = msg;
    if (titleEl) titleEl.textContent = cap(type);
    el.className = `toast toast-${type}`;
    const icons = { success:'fa-check-circle', error:'fa-exclamation-circle', info:'fa-info-circle', warning:'fa-exclamation-triangle' };
    if (icon) icon.className = `fas ${icons[type] || 'fa-info-circle'} toast-icon`;
    setTimeout(() => this._dismiss(el), 3000);
  }
};

// Compatibility shim for any existing showToast calls
function showToast(message, type = 'info') {
  Toast.show(message, type);
}

// ═══════════════════════════════════════════════════════════
//  API LAYER — All backend calls with proper error handling
// ═══════════════════════════════════════════════════════════

async function apiFetch(url, options = {}) {
  try {
    const response = await fetch(url, {
      ...options,
      headers: { ...getAuthHeaders(), ...(options.headers || {}) },
      mode: 'cors',
      credentials: 'include'
    });

    // Handle 401 Unauthorized
    if (response.status === 401) {
      Toast.error('Session expired. Redirecting to login…', 'Unauthorized');
      setTimeout(() => {
        localStorage.clear();
        window.location.replace('/login.html');
      }, 2000);
      throw new Error('Unauthorized');
    }

    // Handle 403 Forbidden
    if (response.status === 403) {
      throw new Error('You do not have permission to perform this action.');
    }

    // Handle 404
    if (response.status === 404) {
      throw new Error('Resource not found (404).');
    }

    if (!response.ok) {
      let errMsg = `Server error (${response.status})`;
      try {
        const errBody = await response.json();
        errMsg = errBody.error || errBody.message || errMsg;
      } catch (_) {}
      throw new Error(errMsg);
    }

    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      return await response.json();
    }
    return await response.text();
  } catch (err) {
    if (err.name === 'TypeError' && err.message.includes('fetch')) {
      throw new Error('Cannot connect to server. Please check if the backend is running on port 8084.');
    }
    throw err;
  }
}

// ── Attendance Endpoints ──────────────────────────────────
async function apiMarkAttendance(dto) {
  return apiFetch(`${BASE_URL}/mark`, {
    method: 'POST',
    body: JSON.stringify(dto)
  });
}

async function apiMarkBulkAttendance(dto) {
  return apiFetch(`${BASE_URL}/bulk-mark`, {
    method: 'POST',
    body: JSON.stringify(dto)
  });
}

async function apiGetAttendanceByClassAndDate(cn, sec, date) {
  return apiFetch(
    `${BASE_URL}/class/${encodeURIComponent(cn)}/section/${encodeURIComponent(sec)}/date/${date}`
  );
}

async function apiGetStudentAttendance(sid, start, end) {
  return apiFetch(`${BASE_URL}/student/${sid}?startDate=${start}&endDate=${end}`);
}

async function apiGetAttendancePercentage(sid, start, end) {
  return apiFetch(`${BASE_URL}/percentage/${sid}?startDate=${start}&endDate=${end}`);
}

async function apiGetMonthlySummary(cn, sec, year, month) {
  return apiFetch(
    `${BASE_URL}/summary/monthly?className=${encodeURIComponent(cn)}&section=${encodeURIComponent(sec)}&year=${year}&month=${month}`
  );
}

async function apiUpdateAttendance(id, dto) {
  return apiFetch(`${BASE_URL}/${id}`, {
    method: 'PUT',
    body: JSON.stringify(dto)
  });
}

async function apiGetAllStudents() {
  return apiFetch(`${STUDENT_BASE_URL}/get-all-students?page=0&size=1000`);
}

async function apiGetStudentsByClassSection(className, section) {
  return apiFetch(
    `${STUDENT_BASE_URL}/get-students-by-class-section?className=${encodeURIComponent(className)}&section=${encodeURIComponent(section)}`
  );
}

// ═══════════════════════════════════════════════════════════
//  INIT
// ═══════════════════════════════════════════════════════════
document.addEventListener('DOMContentLoaded', () => {
  setupEventListeners();
  setupResponsiveSidebar();
  initializeAttendanceModule();
});

function initializeAttendanceModule() {
  const el = document.getElementById('attendanceDate');
  if (el) el.value = selectedDate;
  loadClassesForDropdown();
  loadAttendanceData();
  generateCalendar();
  const sm = document.getElementById('summaryMonth'); if (sm) sm.value = summaryMonth;
  const sy = document.getElementById('summaryYear');  if (sy) sy.value = summaryYear;

  // Show welcome toast
  setTimeout(() => {
    Toast.info(
      `Attendance for <strong>${new Date().toLocaleDateString('en-IN', { weekday:'long', day:'numeric', month:'long' })}</strong> — Select a class to begin.`,
      'Attendance Module Ready',
      5000
    );
  }, 800);
}

// ═══════════════════════════════════════════════════════════
//  EVENT LISTENERS
// ═══════════════════════════════════════════════════════════
function setupEventListeners() {
  const ad = document.getElementById('attendanceDate');
  if (ad) ad.addEventListener('change', e => {
    selectedDate = e.target.value;
    Toast.info(`Switched to ${new Date(selectedDate).toLocaleDateString('en-IN', { weekday:'long', day:'numeric', month:'long' })}`, 'Date Changed', 2500);
    loadAttendanceData();
  });

  const cf = document.getElementById('classFilter');
  if (cf) cf.addEventListener('change', e => {
    selectedClass = e.target.value;
    const sf = document.getElementById('sectionFilter');
    if (sf) {
      if (selectedClass === 'all') {
        sf.disabled = true;
        sf.value = 'all';
        selectedSection = 'all';
      } else {
        sf.disabled = false;
        populateSectionsForClass(selectedClass);
      }
    }
    loadAttendanceData();
  });

  const sof = document.getElementById('sectionFilter');
  if (sof) sof.addEventListener('change', e => {
    selectedSection = e.target.value;
  });

  const stf = document.getElementById('statusFilter');
  if (stf) stf.addEventListener('change', e => { selectedStatus = e.target.value; });

  const summMo = document.getElementById('summaryMonth');
  const summYr = document.getElementById('summaryYear');
  const summCl = document.getElementById('summaryClass');
  if (summMo) summMo.addEventListener('change', e => { summaryMonth = parseInt(e.target.value); });
  if (summYr) summYr.addEventListener('change', e => { summaryYear  = parseInt(e.target.value); });
  if (summCl) summCl.addEventListener('change', e => { summaryClass  = e.target.value; });
}

// ═══════════════════════════════════════════════════════════
//  SIDEBAR
// ═══════════════════════════════════════════════════════════
function setupResponsiveSidebar() {
  isMobile = window.innerWidth < 1024;
  if (isMobile) closeMobileSidebar();
  else {
    document.getElementById('sidebar')?.classList.toggle('collapsed', sidebarCollapsed);
    document.getElementById('mainContent')?.classList.toggle('sidebar-collapsed', sidebarCollapsed);
  }
  window.addEventListener('resize', handleResize);
}
function handleResize() {
  const was = isMobile; isMobile = window.innerWidth < 1024;
  if (was === isMobile) return;
  if (isMobile) closeMobileSidebar();
  else {
    document.getElementById('sidebar')?.classList.remove('mobile-open');
    document.getElementById('sidebarOverlay')?.classList.remove('active');
    document.body.classList.remove('sidebar-open');
    document.getElementById('sidebar')?.classList.toggle('collapsed', sidebarCollapsed);
    document.getElementById('mainContent')?.classList.toggle('sidebar-collapsed', sidebarCollapsed);
  }
}
function toggleSidebar() {
  if (isMobile) {
    const s = document.getElementById('sidebar');
    s?.classList.contains('mobile-open') ? closeMobileSidebar() : openMobileSidebar();
  } else {
    sidebarCollapsed = !sidebarCollapsed;
    document.getElementById('sidebar')?.classList.toggle('collapsed', sidebarCollapsed);
    document.getElementById('mainContent')?.classList.toggle('sidebar-collapsed', sidebarCollapsed);
  }
}
function openMobileSidebar()  { document.getElementById('sidebar')?.classList.add('mobile-open');    document.getElementById('sidebarOverlay')?.classList.add('active');    document.body.classList.add('sidebar-open'); }
function closeMobileSidebar() { document.getElementById('sidebar')?.classList.remove('mobile-open'); document.getElementById('sidebarOverlay')?.classList.remove('active'); document.body.classList.remove('sidebar-open'); }

function populateSectionsForClass(cn) {
  const sf = document.getElementById('sectionFilter'); if (!sf) return;
  sf.innerHTML = '<option value="all">All Sections</option>';
  ['A','B','C','D'].forEach(s => {
    const o = document.createElement('option');
    o.value = s; o.textContent = `Section ${s}`; sf.appendChild(o);
  });
}

// ═══════════════════════════════════════════════════════════
//  LOAD CLASSES
// ═══════════════════════════════════════════════════════════
async function loadClassesForDropdown() {
  try {
    const pd = await apiGetAllStudents();
    const students = pd.content || [];

    const set = new Set();
    students.forEach(s => {
      if (s.currentClass && s.section) set.add(`${s.currentClass}${s.section}`);
    });

    const populateSelect = (selId) => {
      const sel = document.getElementById(selId); if (!sel) return;
      const prev = sel.value;
      sel.innerHTML = '<option value="all">All Classes</option>';
      [...set].sort().forEach(v => {
        const o = document.createElement('option');
        o.value = v; o.textContent = `Class ${v}`; sel.appendChild(o);
      });
      if (prev && prev !== 'all') sel.value = prev;
    };

    populateSelect('classFilter');
    populateSelect('summaryClass');

    if (set.size === 0) {
      Toast.warning('No students found in the system. Please add students first.', 'No Data');
    }
  } catch (err) {
    console.error('loadClassesForDropdown:', err);
    // Fallback classes
    const fallback = ['9A','9B','10A','10B','11A','11B','12A','12B'];
    ['classFilter','summaryClass'].forEach(selId => {
      const sel = document.getElementById(selId); if (!sel) return;
      sel.innerHTML = '<option value="all">All Classes</option>';
      fallback.forEach(v => {
        const o = document.createElement('option');
        o.value = v; o.textContent = `Class ${v}`; sel.appendChild(o);
      });
    });
    Toast.warning('Could not load class list from server. Using defaults.', 'Connection Issue');
  }
}

// ═══════════════════════════════════════════════════════════
//  LOAD ATTENDANCE DATA
// ═══════════════════════════════════════════════════════════
async function loadAttendanceData() {
  showLoading();
  try {
    if (selectedClass === 'all') {
      // Load all students without attendance
      const pd = await apiGetAllStudents();
      const students = pd.content || [];

      allStudentsForDate = students.map(s => ({
        id:           s.stdId || s.studentId || s.id,
        attendanceId: null,
        name:         `${s.firstName || ''} ${s.lastName || ''}`.trim() || 'Unknown',
        class:        `${s.currentClass || ''}${s.section || ''}`,
        rollNo:       s.studentRollNumber || s.rollNumber || '-',
        todayStatus:  null,
        todayTime:    null,
        todayNotes:   null
      }));

    } else {
      const { className, section } = parseClassSection(selectedClass);

      if (!className) {
        allStudentsForDate = [];
        Toast.warning('Invalid class selected.', 'Filter Error');
      } else {
        const targetSection = (selectedSection && selectedSection !== 'all') ? selectedSection : section;

        if (!targetSection || targetSection === 'all') {
          Toast.info('Please select a specific section to view attendance records.', 'Select Section');
          allStudentsForDate = [];
        } else {
          // 1. Fetch students
          let students = [];
          try {
            students = await apiGetStudentsByClassSection(className, targetSection);
          } catch (err) {
            // Fallback: get all and filter
            try {
              const pd = await apiGetAllStudents();
              students = (pd.content || []).filter(s =>
                s.currentClass == className && s.section === targetSection
              );
            } catch (e2) {
              Toast.error(`Failed to load students: ${e2.message}`, 'Student Fetch Error');
              students = [];
            }
          }

          // 2. Fetch attendance records for this class/section/date
          let attRecords = [];
          try {
            attRecords = await apiGetAttendanceByClassAndDate(className, targetSection, selectedDate);
          } catch (err) {
            // It's OK if no records yet — first time marking
            if (!err.message.includes('404')) {
              Toast.warning(`Attendance data partially loaded: ${err.message}`, 'Partial Load');
            }
            attRecords = [];
          }

          // 3. Merge students with their attendance record
          allStudentsForDate = students.map(s => {
            const sid = s.stdId || s.studentId || s.id;
            const att = attRecords.find(a =>
              a.studentId === sid ||
              a.student?.stdId === sid ||
              a.student?.studentId === sid
            );
            return {
              id:           sid,
              attendanceId: att?.id || null,
              name:         `${s.firstName || ''} ${s.lastName || ''}`.trim() || 'Unknown',
              class:        `${s.currentClass || className}${s.section || targetSection}`,
              rollNo:       s.studentRollNumber || s.rollNumber || '-',
              todayStatus:  att ? (att.status || '').toLowerCase() : null,
              todayTime:    att?.time || null,
              todayNotes:   att?.notes || att?.reason || null
            };
          });

          if (students.length === 0) {
            Toast.info(`No students found in Class ${className}${targetSection}.`, 'Empty Class');
          }
        }
      }
    }

    // Apply status filter
    filteredData = [...allStudentsForDate];
    if (selectedStatus !== 'all') {
      filteredData = filteredData.filter(s => s.todayStatus === selectedStatus);
    }

    currentPage = 1;
    updateStatistics();
    renderAttendanceTable();
    generateCalendar();

  } catch (err) {
    console.error('loadAttendanceData:', err);
    if (err.message.includes('port 8084') || err.message.includes('connect')) {
      Toast.error(
        'Cannot reach backend server on port 8084. Please ensure Spring Boot is running.',
        'Server Offline',
        8000
      );
    } else {
      Toast.error(`Data load failed: ${err.message}`, 'Load Error');
    }
    filteredData = []; allStudentsForDate = [];
    updateStatistics(); renderAttendanceTable();
  } finally {
    hideLoading();
  }
}

// ═══════════════════════════════════════════════════════════
//  STATISTICS
// ═══════════════════════════════════════════════════════════
function updateStatistics() {
  const total   = allStudentsForDate.length;
  const present = allStudentsForDate.filter(s => s.todayStatus === 'present').length;
  const absent  = allStudentsForDate.filter(s => s.todayStatus === 'absent').length;
  const late    = allStudentsForDate.filter(s => s.todayStatus === 'late').length;
  const half    = allStudentsForDate.filter(s => s.todayStatus === 'halfday').length;
  const pct = v => total > 0 ? `${Math.round(v / total * 100)}%` : '0%';

  setText('presentCount',      present);
  setText('absentCount',       absent);
  setText('lateCount',         late);
  setText('halfdayCount',      half);
  setText('presentPercentage', pct(present));
  setText('absentPercentage',  pct(absent));
  setText('latePercentage',    pct(late));
  setText('halfdayPercentage', pct(half));
}
function setText(id, v) { const el = document.getElementById(id); if (el) el.textContent = v; }

// ═══════════════════════════════════════════════════════════
//  RENDER TABLE
// ═══════════════════════════════════════════════════════════
function renderAttendanceTable() {
  const tbody  = document.getElementById('attendanceTableBody');
  const info   = document.getElementById('tableInfo');
  const prevBtn = document.getElementById('prevBtn');
  const nextBtn = document.getElementById('nextBtn');
  if (!tbody) return;

  if (!filteredData.length) {
    tbody.innerHTML = `<tr><td colspan="5"><div class="empty-state">
      <div class="empty-icon"><i class="fas fa-users-slash"></i></div>
      <div class="empty-title">No students found</div>
      <div class="empty-sub">Adjust filters or select a class &amp; section</div>
    </div></td></tr>`;
    if (info) info.textContent = 'Showing 0 students';
    if (prevBtn) prevBtn.disabled = true;
    if (nextBtn) nextBtn.disabled = true;
    return;
  }

  const total = filteredData.length;
  const pages = Math.ceil(total / itemsPerPage);
  const start = (currentPage - 1) * itemsPerPage;
  const end   = Math.min(start + itemsPerPage, total);
  const page  = filteredData.slice(start, end);

  tbody.innerHTML = '';
  page.forEach(student => {
    const status = student.todayStatus || null;
    const statusBadge = status
      ? `<span class="status-badge sb-${status === 'halfday' ? 'halfday' : status}" style="font-size:11px;padding:3px 8px;margin-left:8px">
           <span class="sb-dot"></span>${cap(status)}
         </span>`
      : `<span style="font-size:11px;color:var(--text-muted);font-style:italic;margin-left:8px">Not marked</span>`;

    const row = document.createElement('tr');
    row.innerHTML = `
      <td>
        <div style="display:flex;align-items:center;gap:12px">
          <div class="stu-av" style="background:${avatarColor(student.id)}">${initials(student.name)}</div>
          <div>
            <div style="display:flex;align-items:center;flex-wrap:wrap;gap:4px">
              <span class="stu-name">${student.name}</span>
              ${statusBadge}
            </div>
            <div class="stu-roll"><i class="fas fa-hashtag" style="font-size:9px;margin-right:2px;opacity:.6"></i>${student.rollNo}</div>
          </div>
        </div>
      </td>
      <td><span class="class-badge">${student.class}</span></td>
      <td>
        <div class="att-actions">
          <button onclick="updateAttendance(${student.id},${student.attendanceId ?? 'null'},'present')"
            class="att-btn att-btn-p ${status === 'present' ? 'att-active' : ''}">
            <i class="fas fa-check"></i>Present
          </button>
          <button onclick="updateAttendance(${student.id},${student.attendanceId ?? 'null'},'absent')"
            class="att-btn att-btn-a ${status === 'absent' ? 'att-active' : ''}">
            <i class="fas fa-times"></i>Absent
          </button>
          <button onclick="updateAttendance(${student.id},${student.attendanceId ?? 'null'},'late')"
            class="att-btn att-btn-l ${status === 'late' ? 'att-active' : ''}">
            <i class="fas fa-clock"></i>Late
          </button>
          <button onclick="updateAttendance(${student.id},${student.attendanceId ?? 'null'},'halfday')"
            class="att-btn att-btn-h ${status === 'halfday' ? 'att-active' : ''}">
            <i class="fas fa-adjust"></i>Half Day
          </button>
        </div>
      </td>
      <td>
        <span class="notes-cell" title="${student.todayNotes || ''}">
          ${student.todayNotes
            ? `<i class="fas fa-sticky-note" style="color:var(--amber);margin-right:4px;font-size:11px"></i>${student.todayNotes}`
            : '<span style="color:var(--text-muted);font-style:italic">No notes</span>'}
        </span>
      </td>
      <td>
        <div class="action-grp">
          <button onclick="viewStudentDetails(${student.id})"          class="tbl-icon-btn view" title="View Details"><i class="fas fa-eye"></i></button>
          <button onclick="openEditNoteModal(${student.id},${student.attendanceId ?? 'null'})" class="tbl-icon-btn edit" title="Edit Note"><i class="fas fa-pen"></i></button>
        </div>
      </td>`;
    tbody.appendChild(row);
  });

  if (prevBtn) prevBtn.disabled = currentPage === 1;
  if (nextBtn) nextBtn.disabled = currentPage === pages;
  if (info) info.textContent = `Showing ${start + 1}–${end} of ${total} students`;
}

// ═══════════════════════════════════════════════════════════
//  RESET / APPLY FILTERS
// ═══════════════════════════════════════════════════════════
function resetFilters() {
  selectedDate    = new Date().toISOString().split('T')[0];
  selectedClass   = 'all';
  selectedSection = 'all';
  selectedStatus  = 'all';

  const ad  = document.getElementById('attendanceDate'); if (ad)  ad.value  = selectedDate;
  const cf  = document.getElementById('classFilter');    if (cf)  cf.value  = 'all';
  const sf  = document.getElementById('sectionFilter');  if (sf) { sf.value = 'all'; sf.disabled = true; }
  const stf = document.getElementById('statusFilter');   if (stf) stf.value = 'all';

  Toast.info('All filters have been reset to default.', 'Filters Reset', 2500);
  loadAttendanceData();
}

function applyFilters() {
  const sf  = document.getElementById('sectionFilter'); if (sf)  selectedSection = sf.value;
  const stf = document.getElementById('statusFilter');  if (stf) selectedStatus  = stf.value;
  currentPage = 1;

  let msg = `Showing ${selectedStatus !== 'all' ? cap(selectedStatus) : 'all'} students`;
  if (selectedClass !== 'all') msg += ` · Class ${selectedClass}`;
  Toast.info(msg, 'Filter Applied', 2000);

  loadAttendanceData();
}

// ═══════════════════════════════════════════════════════════
//  MARK / UPDATE ATTENDANCE
// ═══════════════════════════════════════════════════════════
async function updateAttendance(studentId, attendanceId, status) {
  // Optimistic UI — update pill state immediately
  const student = allStudentsForDate.find(s => s.id === studentId);
  const prevStatus = student ? student.todayStatus : null;

  showLoading();
  const loadingToast = Toast.loading(`Marking ${student?.name?.split(' ')[0] || 'student'} as ${cap(status)}…`);

  try {
    const time = (status === 'present' || status === 'late')
      ? new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' })
      : null;
    const notes = defaultNote(status);

    if (attendanceId && attendanceId !== null && attendanceId !== 'null') {
      // UPDATE existing record
      await apiUpdateAttendance(attendanceId, {
        studentId,
        date:   selectedDate,
        status: status.toUpperCase(),
        time,
        reason: notes
      });
    } else {
      // MARK new record
      const { className, section } = parseClassSection(selectedClass);
      const dto = {
        studentId,
        date:   selectedDate,
        status: status.toUpperCase(),
        time,
        reason: notes,
        ...(className ? { className } : {}),
        ...(section   ? { section }   : {})
      };
      await apiMarkAttendance(dto);
    }

    Toast.dismiss(loadingToast);

    const statusEmoji = { present: '✅', absent: '❌', late: '⏰', halfday: '🕐' }[status] || '📝';
    Toast.success(
      `${statusEmoji} <strong>${student?.name || 'Student'}</strong> marked as <strong>${cap(status)}</strong>`,
      'Attendance Saved'
    );

    await loadAttendanceData();
  } catch (err) {
    Toast.dismiss(loadingToast);
    console.error('updateAttendance:', err);

    if (err.message.includes('port 8084') || err.message.includes('connect')) {
      Toast.error('Server unreachable. Check if backend is running.', 'Connection Error', 7000);
    } else {
      Toast.error(`Could not mark attendance: ${err.message}`, 'Save Failed');
    }
    hideLoading();
  }
}

function defaultNote(s) {
  return { present: 'Present in class', absent: 'Absent from school', late: 'Arrived late', halfday: 'Left early' }[s] || '';
}

// ═══════════════════════════════════════════════════════════
//  EDIT NOTE MODAL
// ═══════════════════════════════════════════════════════════
function openEditNoteModal(studentId, attendanceId) {
  if (!attendanceId || attendanceId === 'null') {
    Toast.warning(
      'Please mark attendance for this student before adding a note.',
      'Mark Attendance First'
    );
    return;
  }

  const student = allStudentsForDate.find(s => s.id === studentId);
  editNoteStudentId  = studentId;
  editNoteAttendId   = attendanceId;
  editNoteCurrentStu = student;

  const labelEl = document.getElementById('editNoteStudentInfo');
  const textEl  = document.getElementById('editNoteInput');

  if (labelEl) {
    const st = student?.todayStatus || 'unknown';
    const iconMap  = { present: 'fa-check-circle', absent: 'fa-times-circle', late: 'fa-clock', halfday: 'fa-adjust' };
    const colorMap = { present: 'var(--green)', absent: 'var(--red)', late: 'var(--amber)', halfday: 'var(--sky)' };
    labelEl.innerHTML = `
      <div style="display:flex;align-items:center;gap:10px">
        <div style="width:38px;height:38px;border-radius:50%;background:${avatarColor(studentId)};display:flex;align-items:center;justify-content:center;color:#fff;font-size:12px;font-weight:700;flex-shrink:0">${initials(student?.name || '?')}</div>
        <div>
          <div style="font-weight:600;font-size:13px;color:var(--text-primary)">${student?.name || `Student #${studentId}`}</div>
          <div style="font-size:11px;color:var(--text-muted);margin-top:2px">
            ${student?.class || ''} · Roll #${student?.rollNo || '-'}
            &nbsp;·&nbsp;
            <i class="fas ${iconMap[st] || 'fa-question'}" style="color:${colorMap[st] || 'var(--text-muted)'}"></i>
            &nbsp;${cap(st)}
          </div>
        </div>
      </div>`;
  }
  if (textEl) textEl.value = student?.todayNotes || '';
  document.getElementById('editNoteModal')?.classList.add('active');
  setTimeout(() => document.getElementById('editNoteInput')?.focus(), 150);
}

function closeEditNoteModal() {
  document.getElementById('editNoteModal')?.classList.remove('active');
  editNoteStudentId = null; editNoteAttendId = null; editNoteCurrentStu = null;
}

async function submitEditNote() {
  const note = document.getElementById('editNoteInput')?.value?.trim();
  if (!note) { Toast.warning('Please enter a note before saving.', 'Note Required'); return; }
  if (!editNoteAttendId) { Toast.error('No attendance record found to attach note.', 'Error'); return; }

  const btn = document.getElementById('editNoteSubmitBtn');
  if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving…'; }

  try {
    const s = editNoteCurrentStu;
    await apiUpdateAttendance(editNoteAttendId, {
      studentId: editNoteStudentId,
      date:      selectedDate,
      status:    (s?.todayStatus || 'present').toUpperCase(),
      reason:    note,
      time:      s?.todayTime || null
    });
    Toast.success(`Note saved for <strong>${s?.name || 'student'}</strong>.`, 'Note Saved');
    closeEditNoteModal();
    await loadAttendanceData();
  } catch (err) {
    Toast.error(`Could not save note: ${err.message}`, 'Save Failed');
  } finally {
    if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fas fa-save"></i> Save Note'; }
  }
}

// ═══════════════════════════════════════════════════════════
//  STUDENT DETAILS MODAL
// ═══════════════════════════════════════════════════════════
async function viewStudentDetails(studentId) {
  sdCurrentStudentId   = studentId;
  sdCurrentStudentInfo = allStudentsForDate.find(s => s.id === studentId);

  const info = sdCurrentStudentInfo;
  const name = info?.name || `Student #${studentId}`;
  const cls  = info?.class || '—';
  const roll = info?.rollNo || '—';

  const titleEl = document.getElementById('sdModalTitle');
  const subEl   = document.getElementById('sdModalSubtitle');
  if (titleEl) titleEl.textContent = name;
  if (subEl)   subEl.textContent   = `${cls}  ·  Roll #${roll}`;

  // Build 6-month tabs
  const months = [];
  for (let i = 0; i < 6; i++) {
    const d = new Date(); d.setMonth(d.getMonth() - i);
    months.push({
      month: d.getMonth(), year: d.getFullYear(),
      label: `${monthNames[d.getMonth()].substring(0, 3)} ${d.getFullYear()}`
    });
  }

  const bodyEl = document.getElementById('sdModalBody');
  if (!bodyEl) return;

  bodyEl.innerHTML = `
    <div class="sd-profile-banner">
      <div class="sd-avatar-lg" style="background:${avatarColor(studentId)}">${initials(name)}</div>
      <div>
        <div class="sd-info-name">${name}</div>
        <div class="sd-info-meta">
          <i class="fas fa-graduation-cap" style="margin-right:5px;color:var(--primary)"></i>${cls}
          &nbsp;&nbsp;<i class="fas fa-hashtag" style="margin-right:3px;color:var(--text-muted)"></i>${roll}
        </div>
      </div>
    </div>
    <div style="margin-bottom:4px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.07em;color:var(--text-muted)">Select Period</div>
    <div class="month-tab-strip" id="sdMonthTabs">
      ${months.map((m, i) => `
        <button class="month-tab ${i === 0 ? 'active' : ''}"
          onclick="loadSdMonthData(${studentId},${m.month},${m.year},this)"
          data-month="${m.month}" data-year="${m.year}">${m.label}</button>
      `).join('')}
    </div>
    <div id="sdMonthDataSection">
      <div class="empty-state" style="padding:32px">
        <div class="empty-icon"><i class="fas fa-spinner fa-spin"></i></div>
        <div class="empty-title">Loading attendance data…</div>
      </div>
    </div>`;

  document.getElementById('studentDetailsModal')?.classList.add('active');
  await loadSdMonthData(studentId, months[0].month, months[0].year,
    document.querySelector('#sdMonthTabs .month-tab.active'));
}

async function loadSdMonthData(studentId, month, year, tabEl) {
  document.querySelectorAll('#sdMonthTabs .month-tab').forEach(t => t.classList.remove('active'));
  if (tabEl) tabEl.classList.add('active');

  const section = document.getElementById('sdMonthDataSection');
  if (!section) return;

  section.innerHTML = `<div class="empty-state" style="padding:32px">
    <div class="empty-icon"><i class="fas fa-spinner fa-spin"></i></div>
    <div class="empty-title">Loading ${monthNames[month]} ${year}…</div>
  </div>`;

  try {
    const startDate = new Date(year, month, 1).toISOString().split('T')[0];
    const endDate   = new Date(year, month + 1, 0).toISOString().split('T')[0];

    const [records, pctData] = await Promise.all([
      apiGetStudentAttendance(studentId, startDate, endDate).catch(() => []),
      apiGetAttendancePercentage(studentId, startDate, endDate).catch(() => ({ percentage: 0 }))
    ]);

    const present = records.filter(a => (a.status || '').toLowerCase() === 'present').length;
    const absent  = records.filter(a => (a.status || '').toLowerCase() === 'absent').length;
    const late    = records.filter(a => (a.status || '').toLowerCase() === 'late').length;
    const half    = records.filter(a => (a.status || '').toLowerCase() === 'halfday').length;
    const total   = records.length;

    let pct = pctData.percentage;
    if (pct == null || isNaN(pct)) pct = total > 0 ? Math.round(present / total * 100) : 0;
    pct = Math.round(pct);

    const pctColor = pct >= 75 ? 'var(--green)' : pct >= 60 ? 'var(--amber)' : 'var(--red)';
    const pctClass = pct >= 75 ? 'pct-good'     : pct >= 60 ? 'pct-average'  : 'pct-poor';
    const pctLabel = pct >= 75 ? '✓ Good Standing' : pct >= 60 ? '⚠ Average' : '✗ Poor Attendance';

    const sorted = [...records].sort((a, b) => new Date(b.date) - new Date(a.date));

    section.innerHTML = `
      <div class="sd-stats-grid">
        <div class="sd-stat-box sp"><div class="sd-stat-val">${present}</div><div class="sd-stat-lbl">Present</div></div>
        <div class="sd-stat-box sa"><div class="sd-stat-val">${absent}</div><div class="sd-stat-lbl">Absent</div></div>
        <div class="sd-stat-box sl"><div class="sd-stat-val">${late}</div><div class="sd-stat-lbl">Late</div></div>
        <div class="sd-stat-box sh"><div class="sd-stat-val">${half}</div><div class="sd-stat-lbl">Half Day</div></div>
      </div>
      <div style="background:var(--surface-2);border:1px solid var(--border-light);border-radius:10px;padding:16px;margin-bottom:16px">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:6px">
          <div>
            <div style="font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:var(--text-muted)">Attendance Rate — ${monthNames[month]} ${year}</div>
            <div style="font-size:11.5px;color:${pctColor};font-weight:600;margin-top:3px">${pctLabel}</div>
          </div>
          <div style="font-size:32px;font-weight:800;color:${pctColor};line-height:1">${pct}%</div>
        </div>
        <div class="pct-bar-wrap">
          <div class="pct-bar-fill ${pctClass}" style="width:0%;transition:width .8s ease"></div>
        </div>
        <div style="display:flex;justify-content:space-between;font-size:11px;color:var(--text-muted);margin-top:4px">
          <span>0%</span><span style="color:var(--amber)">60% (Avg)</span><span style="color:var(--green)">75% (Good)</span><span>100%</span>
        </div>
      </div>
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px">
        <div style="font-size:13px;font-weight:600;color:var(--text-primary)">
          <i class="fas fa-list-ul" style="color:var(--primary);margin-right:6px"></i>
          Daily Records <span style="font-size:11px;color:var(--text-muted);font-weight:400">(${total} entries)</span>
        </div>
        ${total > 0 ? `<span style="font-size:11px;color:var(--text-muted)">Newest first</span>` : ''}
      </div>
      ${sorted.length === 0
        ? `<div class="empty-state" style="padding:28px">
            <div class="empty-icon"><i class="fas fa-calendar-times"></i></div>
            <div class="empty-title">No records for ${monthNames[month]} ${year}</div>
            <div class="empty-sub">Attendance hasn't been marked for this period</div>
          </div>`
        : `<div class="daily-record-list">
            ${sorted.map(att => {
              const st = (att.status || '').toLowerCase();
              const badgeClass = { present:'sb-present', absent:'sb-absent', late:'sb-late', halfday:'sb-halfday' }[st] || '';
              const icon = { present:'fa-check-circle', absent:'fa-times-circle', late:'fa-clock', halfday:'fa-adjust' }[st] || 'fa-question';
              return `<div class="daily-record-item">
                <div>
                  <div class="dr-date">${formatDate(att.date)}</div>
                  ${att.time    ? `<div class="dr-time"><i class="fas fa-clock" style="margin-right:4px;opacity:.6"></i>${att.time}</div>` : ''}
                  ${(att.notes || att.reason) ? `<div class="dr-note">"${att.notes || att.reason}"</div>` : ''}
                </div>
                <span class="status-badge ${badgeClass}">
                  <span class="sb-dot"></span>
                  <i class="fas ${icon}" style="font-size:11px"></i>
                  ${cap(st)}
                </span>
              </div>`;
            }).join('')}
          </div>`
      }`;

    // Animate progress bar
    setTimeout(() => {
      const bar = section.querySelector('.pct-bar-fill');
      if (bar) bar.style.width = `${pct}%`;
    }, 100);

  } catch (err) {
    section.innerHTML = `<div class="empty-state" style="padding:28px">
      <div class="empty-icon" style="color:var(--danger)"><i class="fas fa-exclamation-triangle"></i></div>
      <div class="empty-title">Failed to load data</div>
      <div class="empty-sub">${err.message}</div>
    </div>`;
    Toast.error(`Could not fetch student data: ${err.message}`, 'Fetch Error');
  }
}

function closeStudentDetailsModal() {
  document.getElementById('studentDetailsModal')?.classList.remove('active');
  sdCurrentStudentId   = null;
  sdCurrentStudentInfo = null;
}

async function exportStudentReportFromModal() {
  if (!sdCurrentStudentId) return;
  await exportStudentReport(sdCurrentStudentId);
}

// ═══════════════════════════════════════════════════════════
//  CALENDAR
// ═══════════════════════════════════════════════════════════
function generateCalendar() {
  const cal = document.getElementById('attendanceCalendar');
  const mon = document.getElementById('currentMonth');
  if (!cal || !mon) return;
  mon.textContent = `${monthNames[currentMonth]} ${currentYear}`;

  const first = new Date(currentYear, currentMonth, 1);
  const days  = new Date(currentYear, currentMonth + 1, 0).getDate();
  const start = first.getDay();
  const today = new Date().toISOString().split('T')[0];

  let html = '<div class="cal-grid">';
  ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].forEach(d => { html += `<div class="cal-hd">${d}</div>`; });
  for (let i = 0; i < start; i++) html += '<div></div>';
  for (let d = 1; d <= days; d++) {
    const dt  = `${currentYear}-${String(currentMonth + 1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
    const sel = dt === selectedDate ? 'cal-sel' : '';
    const tod = dt === today ? 'cal-today' : '';
    const has = dt === selectedDate && allStudentsForDate.length > 0 ? 'has-data' : '';
    html += `<div class="cal-day ${sel} ${tod} ${has}" onclick="selectCalendarDate('${dt}')">${d}</div>`;
  }
  html += '</div>';
  cal.innerHTML = html;
}

function selectCalendarDate(dt) {
  selectedDate = dt;
  const el = document.getElementById('attendanceDate'); if (el) el.value = dt;
  loadAttendanceData();
}
function previousMonth() { currentMonth--; if (currentMonth < 0)  { currentMonth = 11; currentYear--; } generateCalendar(); }
function nextMonth()     { currentMonth++; if (currentMonth > 11) { currentMonth = 0;  currentYear++; } generateCalendar(); }

// ═══════════════════════════════════════════════════════════
//  PAGINATION
// ═══════════════════════════════════════════════════════════
function previousPage() { if (currentPage > 1) { currentPage--; renderAttendanceTable(); } }
function nextPage()     { if (currentPage < Math.ceil(filteredData.length / itemsPerPage)) { currentPage++; renderAttendanceTable(); } }

// ═══════════════════════════════════════════════════════════
//  BULK UPDATE
// ═══════════════════════════════════════════════════════════
function openBulkUpdateModal() {
  bulkSelectedStudents.clear();
  bulkStatus           = 'present';
  bulkStudentListData  = [...filteredData];

  if (!bulkStudentListData.length) {
    Toast.warning('No students loaded. Please select a Class and Section first.', 'No Students');
    return;
  }

  ['Present','Absent','Late','Halfday'].forEach(s => {
    const btn = document.getElementById(`bulkBtn${s}`);
    if (btn) btn.className = 'bulk-status-btn' + (s === 'Present' ? ' active-p' : '');
  });

  renderBulkStudentList();
  setText('bulkSelectedCount', '0 students selected');
  document.getElementById('bulkUpdateModal')?.classList.add('active');
}
function closeBulkUpdateModal() { document.getElementById('bulkUpdateModal')?.classList.remove('active'); }

function renderBulkStudentList() {
  const container = document.getElementById('bulkStudentList'); if (!container) return;
  if (!bulkStudentListData.length) {
    container.innerHTML = `<div style="text-align:center;padding:28px;color:var(--text-muted)">
      <i class="fas fa-users-slash" style="font-size:22px;display:block;margin-bottom:8px"></i>No students found</div>`;
    return;
  }
  container.innerHTML = bulkStudentListData.map(s => {
    const sel = bulkSelectedStudents.has(s.id);
    return `<div class="bulk-stu-row ${sel ? 'selected' : ''}" onclick="toggleStudentSelection(${s.id})">
      <input type="checkbox" ${sel ? 'checked' : ''} style="accent-color:var(--primary);width:15px;height:15px;cursor:pointer" onclick="event.stopPropagation();toggleStudentSelection(${s.id})">
      <div style="width:32px;height:32px;border-radius:50%;background:${avatarColor(s.id)};display:flex;align-items:center;justify-content:center;color:#fff;font-size:11px;font-weight:700;flex-shrink:0">${initials(s.name)}</div>
      <div style="flex:1;min-width:0">
        <div style="font-size:13px;font-weight:600;color:var(--text-primary);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${s.name}</div>
        <div style="font-size:11px;color:var(--text-muted);margin-top:1px">${s.class} · #${s.rollNo}${s.todayStatus ? ` · ${cap(s.todayStatus)}` : ''}</div>
      </div>
    </div>`;
  }).join('');
}

function selectBulkStatus(s) {
  bulkStatus = s;
  const map = { present:'active-p', absent:'active-a', late:'active-l', halfday:'active-h' };
  ['present','absent','late','halfday'].forEach(st => {
    const btn = document.getElementById(`bulkBtn${cap(st)}`);
    if (btn) btn.className = 'bulk-status-btn' + (st === s ? ` ${map[st]}` : '');
  });
}

function toggleStudentSelection(id) {
  if (bulkSelectedStudents.has(id)) bulkSelectedStudents.delete(id);
  else bulkSelectedStudents.add(id);
  updateSelectedCount(); renderBulkStudentList();
}
function updateSelectedCount() {
  const n = bulkSelectedStudents.size, t = bulkStudentListData.length;
  setText('bulkSelectedCount', `${n} of ${t} selected`);
}
function selectAllStudents()   { bulkStudentListData.forEach(s => bulkSelectedStudents.add(s.id)); updateSelectedCount(); renderBulkStudentList(); }
function deselectAllStudents() { bulkSelectedStudents.clear(); updateSelectedCount(); renderBulkStudentList(); }

async function applyBulkUpdate() {
  if (!bulkSelectedStudents.size) {
    Toast.warning('Please select at least one student to update.', 'No Selection');
    return;
  }
  if (!confirm(`Mark ${bulkSelectedStudents.size} student(s) as "${cap(bulkStatus)}"?`)) return;

  showLoading();
  const loadingToast = Toast.loading(`Updating ${bulkSelectedStudents.size} students as ${cap(bulkStatus)}…`);

  try {
    const time = (bulkStatus === 'present' || bulkStatus === 'late')
      ? new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' })
      : null;
    const notes = defaultNote(bulkStatus);
    const { className, section } = parseClassSection(selectedClass);

    const attendanceList = [...bulkSelectedStudents].map(sid => ({
      studentId: sid,
      status:    bulkStatus.toUpperCase(),
      leaveType: null,
      reason:    notes
    }));

    const dto = {
      date:     selectedDate,
      className: className || '',
      section:   section || '',
      attendanceList
    };

    await apiMarkBulkAttendance(dto);

    Toast.dismiss(loadingToast);
    Toast.success(
      `${bulkSelectedStudents.size} students successfully marked as <strong>${cap(bulkStatus)}</strong>.`,
      'Bulk Update Complete'
    );
    closeBulkUpdateModal();
    bulkSelectedStudents.clear();
    await loadAttendanceData();
  } catch (err) {
    Toast.dismiss(loadingToast);
    Toast.error(`Bulk update failed: ${err.message}`, 'Bulk Error');
  } finally {
    hideLoading();
  }
}

// ═══════════════════════════════════════════════════════════
//  MONTHLY SUMMARY MODAL
// ═══════════════════════════════════════════════════════════
function openSummaryModal() {
  const now = new Date(); summaryMonth = now.getMonth(); summaryYear = now.getFullYear();
  const sm = document.getElementById('summaryMonth'); if (sm) sm.value = summaryMonth;
  const sy = document.getElementById('summaryYear');  if (sy) sy.value = summaryYear;
  document.getElementById('summaryModal')?.classList.add('active');
  generateSummary();
}
function closeSummaryModal() { document.getElementById('summaryModal')?.classList.remove('active'); }

async function generateSummary() {
  if (summaryClass === 'all') {
    Toast.warning('Please select a specific class to generate the monthly summary.', 'Select Class');
    return;
  }
  const { className, section } = parseClassSection(summaryClass);
  if (!className || !section) {
    Toast.error('Invalid class selected. Please pick a class that includes a section (e.g. 10A).', 'Invalid Class');
    return;
  }

  showLoading();
  const loadingToast = Toast.loading(`Generating summary for Class ${summaryClass} — ${monthNames[summaryMonth]} ${summaryYear}…`);

  try {
    const res = await apiGetMonthlySummary(className, section, summaryYear, summaryMonth + 1);

    // Normalize response — backend returns studentSummaries[]
    summaryData = (res.studentSummaries || []).map(stu => {
      // Build day array from dailyStatus map
      const days = [];
      if (stu.dailyStatus) {
        Object.entries(stu.dailyStatus).sort().forEach(([date, code]) => {
          const st = { P:'present', A:'absent', L:'late', H:'halfday', HD:'holiday', '—':'weekend' }[code] || 'absent';
          days.push({ date, status: st, code, time: null, notes: null });
        });
      }
      return {
        id:         stu.studentId,
        name:       stu.studentName,
        class:      `${className}${section}`,
        rollNo:     stu.rollNumber || stu.rollNo || '-',
        days,
        totals: {
          present:  stu.presentCount || 0,
          absent:   stu.absentCount  || 0,
          late:     stu.leaveCount   || 0,
          halfday:  0,
          holiday:  0,
          weekend:  0
        },
        percentage: stu.attendancePercentage || stu.percentage || 0
      };
    });

    // Build table header (dates)
    const thead = document.getElementById('summaryTableHead');
    if (thead && summaryData.length > 0) {
      let hHtml = `<th style="background:#1e293b;color:#94a3b8;position:sticky;left:0;z-index:10;min-width:220px">Student</th>`;
      summaryData[0].days.forEach(d => {
        const dt = new Date(d.date);
        hHtml += `<th style="background:#1e293b;color:#94a3b8;padding:8px 4px;min-width:34px;text-align:center">
          <div style="font-size:10px">${dt.toLocaleDateString('en-US', { weekday:'short' })}</div>
          <div style="font-size:12px;font-weight:700">${dt.getDate()}</div>
        </th>`;
      });
      hHtml += `<th style="background:#1e293b;color:#94a3b8;min-width:90px;text-align:center">Summary</th>`;
      thead.innerHTML = hHtml;
    }

    updateSummaryStats();
    renderSummaryTable();

    Toast.dismiss(loadingToast);
    Toast.success(
      `Summary generated for <strong>Class ${summaryClass}</strong> — ${monthNames[summaryMonth]} ${summaryYear}. ${summaryData.length} students.`,
      'Summary Ready'
    );
  } catch (err) {
    Toast.dismiss(loadingToast);
    Toast.error(`Could not generate summary: ${err.message}`, 'Summary Error', 7000);
    console.error('generateSummary:', err);
  } finally {
    hideLoading();
  }
}

function statusCode(s) {
  return { present:'P', absent:'A', late:'L', halfday:'H', holiday:'HD', weekend:'—' }[s] || '';
}

function updateSummaryStats() {
  const c = document.getElementById('summaryStats'); if (!c) return;
  const n   = summaryData.length;
  const tot = summaryData.reduce((a, s) => ({ present: a.present + (s.totals.present || 0), absent: a.absent + (s.totals.absent || 0) }), { present:0, absent:0 });
  const avg = n > 0 ? Math.round(summaryData.reduce((a, s) => a + s.percentage, 0) / n) : 0;
  c.innerHTML = `
    <div class="stat-card"><div><div class="stat-label">Total Students</div><div class="stat-name">${n}</div></div><div class="stat-icon" style="background:var(--sky-bg)"><i class="fas fa-users" style="color:var(--sky)"></i></div></div>
    <div class="stat-card"><div><div class="stat-label">Avg Attendance</div><div class="stat-name" style="color:${avg>=75?'var(--green)':avg>=60?'var(--amber)':'var(--red)'}">${avg}%</div></div><div class="stat-icon" style="background:var(--primary-bg)"><i class="fas fa-chart-pie" style="color:var(--primary)"></i></div></div>
    <div class="stat-card"><div><div class="stat-label">Total Present</div><div class="stat-name">${tot.present}</div></div><div class="stat-icon" style="background:var(--green-bg)"><i class="fas fa-user-check" style="color:var(--green)"></i></div></div>
    <div class="stat-card"><div><div class="stat-label">Total Absent</div><div class="stat-name">${tot.absent}</div></div><div class="stat-icon" style="background:var(--red-bg)"><i class="fas fa-user-times" style="color:var(--red)"></i></div></div>`;
}

function renderSummaryTable() {
  const tbody = document.getElementById('summaryTableBody');
  const info  = document.getElementById('summaryInfo');
  if (!tbody) return;

  if (!summaryData.length) {
    tbody.innerHTML = `<tr><td colspan="32"><div class="empty-state">
      <div class="empty-icon"><i class="fas fa-table"></i></div>
      <div class="empty-title">No data available</div>
      <div class="empty-sub">Select a class and generate the summary</div>
    </div></td></tr>`;
    if (info) info.textContent = '0 students';
    return;
  }

  tbody.innerHTML = '';
  summaryData.forEach(stu => {
    const pctColor = stu.percentage >= 75 ? 'var(--green)' : stu.percentage >= 60 ? 'var(--amber)' : 'var(--red)';
    const row = document.createElement('tr');
    let html = `<td style="position:sticky;left:0;background:var(--surface);z-index:5;border-right:1px solid var(--border);min-width:220px">
      <div style="display:flex;align-items:center;gap:10px">
        <div style="width:34px;height:34px;border-radius:50%;background:${avatarColor(stu.id)};display:flex;align-items:center;justify-content:center;color:#fff;font-size:11px;font-weight:700;flex-shrink:0">${initials(stu.name)}</div>
        <div>
          <div style="font-weight:700;font-size:13px;color:var(--text-primary)">${stu.name}</div>
          <div style="font-size:11px;color:var(--text-muted)">#${stu.rollNo} · ${stu.class}</div>
          <div style="font-size:11px;font-weight:700;color:${pctColor};margin-top:1px">${stu.percentage}%</div>
        </div>
      </div>
    </td>`;

    stu.days.forEach(d => {
      const cls = { present:'ac-p', absent:'ac-a', late:'ac-l', halfday:'ac-h', holiday:'ac-hd', weekend:'ac-we' }[d.status] || 'ac-we';
      const tip = `${formatDate(d.date)}: ${cap(d.status) || '—'}${d.time ? '\nTime: ' + d.time : ''}${d.notes ? '\nNote: ' + d.notes : ''}`;
      html += `<td style="padding:4px 2px;text-align:center">
        <div class="att-cell ${cls}" title="${tip}" onclick="showDayDetails(${stu.id},'${d.date}')">${d.code}</div>
      </td>`;
    });

    html += `<td style="padding:6px 10px;background:var(--surface-2);border-left:1px solid var(--border);min-width:90px;text-align:center">
      <div style="font-size:17px;font-weight:800;color:${pctColor}">${stu.percentage}%</div>
      <div style="font-size:10px;color:var(--text-muted);margin-top:2px">
        <span style="color:var(--green)">P:${stu.totals.present}</span>
        <span style="color:var(--red);margin-left:4px">A:${stu.totals.absent}</span>
        <span style="color:var(--amber);margin-left:4px">L:${stu.totals.late || 0}</span>
      </div>
    </td>`;

    row.innerHTML = html;
    tbody.appendChild(row);
  });

  if (info) info.textContent = `${summaryData.length} students`;
}

function showDayDetails(studentId, date) {
  const stu = summaryData.find(s => s.id === studentId); if (!stu) return;
  const d   = stu.days.find(x => x.date === date);
  alert(d
    ? `📅  ${formatDate(date)}\n👤  ${stu.name}\n🏫  ${stu.class}  ·  #${stu.rollNo}\n\nStatus: ${cap(d.status) || '—'}\nTime: ${d.time || '—'}\nNotes: ${d.notes || '—'}`
    : `No record found for ${formatDate(date)}`);
}

// ═══════════════════════════════════════════════════════════
//  EXCEL EXPORT
// ═══════════════════════════════════════════════════════════
function downloadSummaryExcel() {
  if (!summaryData.length) {
    Toast.warning('No summary data to export. Please generate the summary first.', 'Nothing to Export');
    return;
  }
  showLoading();
  try {
    const wb   = XLSX.utils.book_new();
    const days = summaryData[0]?.days.length || 0;
    const hdrs = ['Student ID','Student Name','Class','Roll No.'];
    summaryData[0]?.days.forEach(d => {
      const dt = new Date(d.date);
      hdrs.push(`${dt.getDate()} ${dt.toLocaleDateString('en-US', { weekday:'short' })}`);
    });
    hdrs.push('Present','Absent','Late','Half Day','Attendance %','Remarks');

    const rows = [hdrs, ...summaryData.map(s => [
      s.id, s.name, s.class, s.rollNo,
      ...s.days.map(d => d.code || ''),
      s.totals.present, s.totals.absent, s.totals.late || 0, s.totals.halfday || 0,
      `${s.percentage}%`,
      s.percentage >= 75 ? 'Good' : s.percentage >= 60 ? 'Average' : 'Poor'
    ])];

    const ws = XLSX.utils.aoa_to_sheet(rows);
    ws['!cols'] = [{ wch:10 },{ wch:25 },{ wch:10 },{ wch:10 },
      ...Array(days).fill({ wch:7 }),
      { wch:8 },{ wch:8 },{ wch:8 },{ wch:10 },{ wch:12 },{ wch:10 }];
    XLSX.utils.book_append_sheet(wb, ws, 'Attendance');

    const avg = summaryData.length > 0
      ? Math.round(summaryData.reduce((a, s) => a + s.percentage, 0) / summaryData.length) : 0;
    const ws2 = XLSX.utils.aoa_to_sheet([
      ['Monthly Attendance Report'], [''],
      ['Month:', monthNames[summaryMonth]], ['Year:', summaryYear],
      ['Class:', summaryClass], ['Total Students:', summaryData.length], [''],
      ['Avg Attendance %:', avg], ['Generated:', new Date().toLocaleString()]
    ]);
    XLSX.utils.book_append_sheet(wb, ws2, 'Statistics');

    XLSX.writeFile(wb, `attendance_${monthNames[summaryMonth]}_${summaryYear}_${summaryClass}.xlsx`);
    Toast.success(`Excel report downloaded: attendance_${monthNames[summaryMonth]}_${summaryYear}_${summaryClass}.xlsx`, 'Export Complete');
  } catch (err) {
    Toast.error(`Excel export failed: ${err.message}`, 'Export Error');
  } finally {
    hideLoading();
  }
}

// ═══════════════════════════════════════════════════════════
//  STUDENT JSON EXPORT
// ═══════════════════════════════════════════════════════════
async function exportStudentReport(studentId) {
  showLoading();
  const loadingToast = Toast.loading('Preparing student report…');
  try {
    const end = new Date().toISOString().split('T')[0];
    const s90 = new Date(); s90.setDate(s90.getDate() - 90);
    const start = s90.toISOString().split('T')[0];

    const [records, pct] = await Promise.all([
      apiGetStudentAttendance(studentId, start, end),
      apiGetAttendancePercentage(studentId, start, end)
    ]);

    const info = allStudentsForDate.find(x => x.id === studentId) || sdCurrentStudentInfo;
    const present  = records.filter(a => (a.status || '').toLowerCase() === 'present').length;
    const absent   = records.filter(a => (a.status || '').toLowerCase() === 'absent').length;
    const late     = records.filter(a => (a.status || '').toLowerCase() === 'late').length;
    const half     = records.filter(a => (a.status || '').toLowerCase() === 'halfday').length;

    const json = JSON.stringify({
      student: { id: studentId, name: info?.name, class: info?.class, rollNo: info?.rollNo },
      summary: { ...pct, present, absent, late, halfday: half, total: records.length },
      records: records.sort((a, b) => new Date(b.date) - new Date(a.date))
    }, null, 2);

    const fname = `report_${(info?.name || String(studentId)).replace(/\s+/g, '-')}_${end}.json`;
    const a = Object.assign(document.createElement('a'), {
      href:     URL.createObjectURL(new Blob([json], { type: 'application/json' })),
      download: fname
    });
    document.body.appendChild(a); a.click(); document.body.removeChild(a);

    Toast.dismiss(loadingToast);
    Toast.success(`Report downloaded: ${fname}`, 'Export Complete');
  } catch (err) {
    Toast.dismiss(loadingToast);
    Toast.error(`Export failed: ${err.message}`, 'Export Error');
  } finally {
    hideLoading();
  }
}

function generateAttendanceReport() {
  showLoading();
  setTimeout(() => {
    hideLoading();
    if (!filteredData.length) {
      Toast.warning('No data loaded to export. Apply a class/section filter first.', 'No Data');
      return;
    }
    const data = {
      date:  selectedDate,
      class: selectedClass,
      total: filteredData.length,
      statistics: {
        present: filteredData.filter(s => s.todayStatus === 'present').length,
        absent:  filteredData.filter(s => s.todayStatus === 'absent').length,
        late:    filteredData.filter(s => s.todayStatus === 'late').length,
        halfday: filteredData.filter(s => s.todayStatus === 'halfday').length,
      },
      students: filteredData.map(s => ({
        name:   s.name,
        class:  s.class,
        rollNo: s.rollNo,
        status: s.todayStatus || 'Not marked',
        time:   s.todayTime  || '—',
        notes:  s.todayNotes || '—'
      }))
    };
    const fname = `attendance-${selectedDate}.json`;
    const a = Object.assign(document.createElement('a'), {
      href:     URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })),
      download: fname
    });
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    Toast.success(`Report downloaded: ${fname}`, 'Export Complete');
  }, 600);
}

// ═══════════════════════════════════════════════════════════
//  LOADING OVERLAY
// ═══════════════════════════════════════════════════════════
function showLoading() { document.getElementById('loadingOverlay')?.classList.remove('hidden'); }
function hideLoading() { document.getElementById('loadingOverlay')?.classList.add('hidden'); }

// ═══════════════════════════════════════════════════════════
//  FORMAT DATE
// ═══════════════════════════════════════════════════════════
function formatDate(ds) {
  return new Date(ds).toLocaleDateString('en-IN', { weekday:'short', month:'short', day:'numeric' });
}

// ═══════════════════════════════════════════════════════════
//  GLOBAL EXPORTS
// ═══════════════════════════════════════════════════════════
window.updateAttendance             = updateAttendance;
window.viewStudentDetails           = viewStudentDetails;
window.loadSdMonthData              = loadSdMonthData;
window.exportStudentReportFromModal = exportStudentReportFromModal;
window.openEditNoteModal            = openEditNoteModal;
window.closeEditNoteModal           = closeEditNoteModal;
window.submitEditNote               = submitEditNote;
window.selectCalendarDate           = selectCalendarDate;
window.previousMonth                = previousMonth;
window.nextMonth                    = nextMonth;
window.applyFilters                 = applyFilters;
window.resetFilters                 = resetFilters;
window.previousPage                 = previousPage;
window.nextPage                     = nextPage;
window.openBulkUpdateModal          = openBulkUpdateModal;
window.closeBulkUpdateModal         = closeBulkUpdateModal;
window.selectBulkStatus             = selectBulkStatus;
window.toggleStudentSelection       = toggleStudentSelection;
window.selectAllStudents            = selectAllStudents;
window.deselectAllStudents          = deselectAllStudents;
window.applyBulkUpdate              = applyBulkUpdate;
window.closeStudentDetailsModal     = closeStudentDetailsModal;
window.openSummaryModal             = openSummaryModal;
window.closeSummaryModal            = closeSummaryModal;
window.generateSummary              = generateSummary;
window.downloadSummaryExcel         = downloadSummaryExcel;
window.showDayDetails               = showDayDetails;
window.generateAttendanceReport     = generateAttendanceReport;
window.exportStudentReport          = exportStudentReport;
window.toggleSidebar                = toggleSidebar;
window.closeMobileSidebar           = closeMobileSidebar;
window.showToast                    = showToast;
window.Toast                        = Toast;



