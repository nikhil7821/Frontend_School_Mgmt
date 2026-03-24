// ============================================================
//  student-service.js  —  COMPLETE OPTIMIZED VERSION
//  Dynamic: Classes, Subjects, Teachers, Academic Year
//  Notifications: Toastify.js
//  Backend: http://localhost:8084
// ============================================================

const BASE_URL = 'http://localhost:8084';

// ─────────────────────────────────────────────────────────────
//  GLOBAL STATE
// ─────────────────────────────────────────────────────────────
let currentPage         = 0;
let totalPages          = 0;
let totalElements       = 0;
const PAGE_SIZE         = 10;
let editingStudentId    = null;
let otherSports         = [];
let otherSubjects       = [];
let transactionVerified = false;
let qrCodeGenerated     = false;
let searchDebounce      = null;
let allClassesData      = [];

// ─────────────────────────────────────────────────────────────
//  AUTH HELPER
// ─────────────────────────────────────────────────────────────
const getAuthHeaders = () => ({
    Authorization: `Bearer ${localStorage.getItem('admin_jwt_token')}`
});

// ─────────────────────────────────────────────────────────────
//  TOASTIFY — Smart Notifications
// ─────────────────────────────────────────────────────────────
const TOAST_STYLES = {
    success: { background: 'linear-gradient(135deg,#10b981,#059669)', icon: '✅' },
    error:   { background: 'linear-gradient(135deg,#ef4444,#dc2626)', icon: '❌' },
    warning: { background: 'linear-gradient(135deg,#f59e0b,#d97706)', icon: '⚠️' },
    info:    { background: 'linear-gradient(135deg,#3b82f6,#2563eb)', icon: 'ℹ️' },
};

function toast(message, type = 'info', duration = 3500) {
    const style = TOAST_STYLES[type] ?? TOAST_STYLES.info;
    const text  = `${style.icon}  ${message}`;

    if (typeof Toastify === 'function') {
        Toastify({
            text,
            duration,
            gravity:     'top',
            position:    'right',
            stopOnFocus: true,
            style: {
                background:  style.background,
                borderRadius:'10px',
                padding:     '12px 20px',
                fontSize:    '14px',
                fontWeight:  '500',
                boxShadow:   '0 4px 20px rgba(0,0,0,0.18)',
                minWidth:    '280px',
                maxWidth:    '420px',
            },
        }).showToast();
        return;
    }

    let container = document.getElementById('_toastContainer');
    if (!container) {
        container = Object.assign(document.createElement('div'), { id: '_toastContainer' });
        Object.assign(container.style, {
            position:'fixed', top:'20px', right:'20px',
            zIndex:'99999', display:'flex', flexDirection:'column', gap:'10px',
        });
        document.body.appendChild(container);
    }

    const el = document.createElement('div');
    Object.assign(el.style, {
        padding:'12px 20px', borderRadius:'10px', color:'#fff',
        fontSize:'14px', fontWeight:'500', minWidth:'280px', maxWidth:'420px',
        background: style.background,
        boxShadow: '0 4px 20px rgba(0,0,0,0.18)',
        transform: 'translateX(120%)', transition: 'transform .3s ease',
        cursor: 'pointer',
    });
    el.textContent = text;
    el.onclick = () => el.remove();
    container.appendChild(el);

    requestAnimationFrame(() => { el.style.transform = 'translateX(0)'; });
    setTimeout(() => {
        el.style.transform = 'translateX(120%)';
        el.addEventListener('transitionend', () => el.remove(), { once: true });
    }, duration);
}

const toastSuccess = (msg, dur)  => toast(msg, 'success', dur);
const toastError   = (msg, dur)  => toast(msg, 'error',   dur);
const toastWarning = (msg, dur)  => toast(msg, 'warning',  dur);
const toastInfo    = (msg, dur)  => toast(msg, 'info',    dur);

// ─────────────────────────────────────────────────────────────
//  LOADING OVERLAY
// ─────────────────────────────────────────────────────────────
const showLoading = show =>
    document.getElementById('loadingOverlay')?.classList.toggle('hidden', !show);

// ─────────────────────────────────────────────────────────────
//  MODAL
// ─────────────────────────────────────────────────────────────
const closeModal = id =>
    document.getElementById(id)?.classList.remove('show');

// ─────────────────────────────────────────────────────────────
//  SECTION SWITCHING
// ─────────────────────────────────────────────────────────────
function showAllStudentsSection() {
    const allStudentsSection = document.getElementById('allStudentsSection');
    const addStudentSection = document.getElementById('addStudentSection');
    
    if (allStudentsSection) allStudentsSection.classList.remove('hidden');
    if (addStudentSection) addStudentSection.classList.add('hidden');
    
    // Reset editing state
    editingStudentId = null;
    
    // Update form title if it exists
    const title = document.getElementById('formTitle');
    if (title) title.textContent = 'Add New Student';
    
    // Update submit button text
    const btn = document.getElementById('submitButton');
    if (btn) btn.innerHTML = '<i class="fas fa-check-circle mr-2"></i>Register Student';
    
    // Update URL without triggering navigation
    const url = new URL(window.location);
    url.searchParams.delete('action');
    window.history.pushState({}, '', url);
    
    // Update sidebar active state
    setActiveSidebarLink();
    
    // Load students and update stats
    loadStudents(0);
    
    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });
        setActiveSidebarLink(); // Add this line

}

// Function to show Add Student section
function showAddStudentSection() {
    const allStudentsSection = document.getElementById('allStudentsSection');
    const addStudentSection = document.getElementById('addStudentSection');
    
    if (allStudentsSection) allStudentsSection.classList.add('hidden');
    if (addStudentSection) addStudentSection.classList.remove('hidden');
    
    // Reset editing state
    editingStudentId = null;
    
    // Reset the add student form
    resetAddStudentForm();
    
    // Switch to personal tab
    switchTab('personal');
    
    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });
    
    // Update URL with action parameter
    const url = new URL(window.location);
    url.searchParams.set('action', 'add');
    window.history.pushState({}, '', url);
    
    // Update sidebar active state
    setActiveSidebarLink();
}


function checkUrlAndShowSection() {
    const isAdd = new URLSearchParams(window.location.search).get('action') === 'add';
    const allStudentsSection = document.getElementById('allStudentsSection');
    const addStudentSection = document.getElementById('addStudentSection');
    
    if (allStudentsSection) allStudentsSection.classList.toggle('hidden', isAdd);
    if (addStudentSection) addStudentSection.classList.toggle('hidden', !isAdd);
    
    // Update sidebar active state
    setActiveSidebarLink();
    
    // If we're on the add section, reset the form
    if (isAdd) {
        resetAddStudentForm();
        switchTab('personal');
    }
}

function setActiveSidebarLink() {
    const isAdd = new URLSearchParams(window.location.search).get('action') === 'add';
    const navAll = document.getElementById('navAllStudents');
    const navAdd = document.getElementById('navAddStudent');
    
    if (!navAll || !navAdd) {
        console.warn('Sidebar navigation elements not found');
        return;
    }
    
    // Remove active class from both
    navAll.classList.remove('active', 'bg-blue-50', 'text-blue-600', 'bg-blue-700', 'bg-blue-100');
    navAdd.classList.remove('active', 'bg-blue-50', 'text-blue-600', 'bg-blue-700', 'bg-blue-100');
    
    // Reset icon colors
    const allIcon = navAll.querySelector('.nav-icon');
    const allText = navAll.querySelector('.nav-label');
    const addIcon = navAdd.querySelector('.nav-icon');
    const addText = navAdd.querySelector('.nav-label');
    
    if (allIcon) {
        allIcon.classList.remove('text-blue-600', 'text-white');
        allIcon.classList.add('text-gray-600');
    }
    if (allText) {
        allText.classList.remove('text-blue-600', 'text-white', 'font-semibold');
        allText.classList.add('text-gray-700');
    }
    if (addIcon) {
        addIcon.classList.remove('text-blue-600', 'text-white');
        addIcon.classList.add('text-gray-600');
    }
    if (addText) {
        addText.classList.remove('text-blue-600', 'text-white', 'font-semibold');
        addText.classList.add('text-gray-700');
    }
    
    // Add active class to the correct link
    if (isAdd) {
        navAdd.classList.add('active', 'bg-blue-50', 'text-blue-600');
        if (addIcon) {
            addIcon.classList.remove('text-gray-600');
            addIcon.classList.add('text-blue-600');
        }
        if (addText) {
            addText.classList.remove('text-gray-700');
            addText.classList.add('text-blue-600', 'font-semibold');
        }
        console.log('[Sidebar] Active: Add Student');
    } else {
        navAll.classList.add('active', 'bg-blue-50', 'text-blue-600');
        if (allIcon) {
            allIcon.classList.remove('text-gray-600');
            allIcon.classList.add('text-blue-600');
        }
        if (allText) {
            allText.classList.remove('text-gray-700');
            allText.classList.add('text-blue-600', 'font-semibold');
        }
        console.log('[Sidebar] Active: All Students');
    }
}
// ─────────────────────────────────────────────────────────────
//  TAB SWITCHING
// ─────────────────────────────────────────────────────────────
function switchTab(tabName) {
    document.querySelectorAll('.tab-content').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('.tab-button') .forEach(b => b.classList.remove('active'));
    document.getElementById(`${tabName}TabContent`)?.classList.add('active');
    document.getElementById(`${tabName}Tab`)        ?.classList.add('active');
}

const resetForm = () => resetAddStudentForm();

// ─────────────────────────────────────────────────────────────
//  STUDENT ID GENERATOR
// ─────────────────────────────────────────────────────────────
function generateStudentId() {
    const yr  = new Date().getFullYear().toString().slice(-2);
    const rnd = Math.floor(1000 + Math.random() * 9000);
    return `STU${yr}${rnd}`;
}

// ─────────────────────────────────────────────────────────────
//  1. LOAD ALL STUDENTS (paginated)
// ─────────────────────────────────────────────────────────────
async function loadStudents(page = 0) {
    showLoading(true);
    try {
        const res = await fetch(
            `${BASE_URL}/api/students/get-all-students?page=${page}&size=${PAGE_SIZE}&direction=desc`,
            { headers: getAuthHeaders() }
        );
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data    = await res.json();
        currentPage   = data.number        ?? 0;
        totalPages    = data.totalPages    ?? 1;
        totalElements = data.totalElements ?? 0;
        renderStudentTable(data.content || []);
        renderPagination();
        
        // Check if we're on all students page before updating stats
        const isAllStudentsPage = document.getElementById('allStudentsSection')?.classList.contains('hidden') === false;
        if (isAllStudentsPage) {
            updateStats(data);
        }
    } catch (err) {
        console.error('loadStudents:', err);
        toastError('Failed to load students: ' + err.message);
    } finally {
        showLoading(false);
    }
}

// ─────────────────────────────────────────────────────────────
//  2. RENDER STUDENT TABLE
// ─────────────────────────────────────────────────────────────
function renderStudentTable(students) {
    const tbody = document.getElementById('studentTableBody');
    if (!tbody) return;

    if (!students?.length) {
        tbody.innerHTML = `
            <tr><td colspan="6" class="px-6 py-12 text-center text-gray-500">
                <i class="fas fa-user-graduate text-4xl mb-3 text-gray-300 block"></i>
                <p class="text-lg font-medium">No students found</p>
            </td></tr>`;
        return;
    }

    tbody.innerHTML = students.map(s => {
        const fees     = s.feesDetails;
        const isActive = (s.status || '').toLowerCase() === 'active';
        const avatar   = s.profileImageUrl
            ? `<img src="${BASE_URL}${s.profileImageUrl}" class="h-10 w-10 rounded-full object-cover" alt="photo">`
            : `<div class="h-10 w-10 bg-blue-100 rounded-full flex items-center justify-center">
                   <i class="fas fa-user-graduate text-blue-600"></i></div>`;
        return `
            <tr class="hover:bg-gray-50 transition-colors">
                <td class="px-4 lg:px-6 py-4">
                    <input type="checkbox" class="student-checkbox rounded border-gray-300" data-id="${s.stdId}">
                </td>
                <td class="px-4 lg:px-6 py-4">
                    <div class="flex items-center">
                        ${avatar}
                        <div class="ml-3">
                            <p class="font-semibold text-gray-800">${s.firstName||''} ${s.lastName||''}</p>
                            <p class="text-sm text-gray-500">ID: ${s.studentId||'-'}</p>
                            <div class="flex items-center mt-1">
                                <i class="fas fa-circle ${isActive?'text-green-500':'text-red-500'} mr-1 text-xs"></i>
                                <span class="text-xs ${isActive?'text-green-600':'text-red-600'}">${isActive?'Active':'Inactive'}</span>
                            </div>
                        </div>
                    </div>
                </td>
                <td class="px-4 lg:px-6 py-4">
                    <p class="font-medium text-gray-800">Class ${s.currentClass||'-'} ${s.section||''}</p>
                    <p class="text-sm text-gray-500">Roll: ${s.studentRollNumber||'-'}</p>
                </td>
                <td class="px-4 lg:px-6 py-4">
                    <p class="text-sm text-gray-800">${s.fatherName||'-'}</p>
                    <p class="text-sm text-gray-500">${s.fatherPhone||s.motherPhone||'-'}</p>
                    <p class="text-sm text-gray-500">${s.fatherEmail||s.motherEmail||'-'}</p>
                </td>
                <td class="px-4 lg:px-6 py-4">${buildFeeBadge(fees)}</td>
                <td class="px-4 lg:px-6 py-4">
                    <div class="flex space-x-2">
                        <button onclick="viewStudent(${s.stdId})"   class="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-all" title="View">  <i class="fas fa-eye"></i>   </button>
                        <button onclick="editStudent(${s.stdId})"   class="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-all" title="Edit"> <i class="fas fa-edit"></i>  </button>
                        <button onclick="deleteStudent(${s.stdId})" class="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-all" title="Delete">   <i class="fas fa-trash"></i> </button>
                    </div>
                </td>
            </tr>`;
    }).join('');
}

// ─────────────────────────────────────────────────────────────
//  FEE BADGE HELPER
// ─────────────────────────────────────────────────────────────
function buildFeeBadge(fees) {
    if (!fees) return '<span class="status-badge status-pending">No Fees Set</span>';
    const insts       = fees.installmentsList || [];
    const paidCount   = insts.filter(i => i.status === 'PAID').length;
    const pendCount   = insts.filter(i => i.status === 'PENDING' || i.status === 'OVERDUE').length;
    const pills       = insts.length ? `
        <div style="display:flex;gap:4px;margin-top:4px;flex-wrap:wrap;">
            <span style="background:#d1fae5;color:#065f46;border-radius:999px;padding:1px 7px;font-size:11px;font-weight:600;">✓ ${paidCount} Paid</span>
            ${pendCount > 0 ? `<span style="background:#fee2e2;color:#991b1b;border-radius:999px;padding:1px 7px;font-size:11px;font-weight:600;">⏳ ${pendCount} Pending</span>` : ''}
        </div>` : '';
    const status = fees.paymentStatus || '';
    const remain = (fees.remainingFees || 0).toLocaleString('en-IN');
    if (status === 'FULLY PAID')     return `<div><span class="status-badge status-paid">✅ Fully Paid</span>${pills}</div>`;
    if (status === 'PARTIALLY PAID') return `<div><span class="status-badge status-partial">Partial — ₹${remain} left</span>${pills}</div>`;
    return `<div><span class="status-badge status-pending">Pending ₹${remain}</span>${pills}</div>`;
}

// ─────────────────────────────────────────────────────────────
//  3. PAGINATION
// ─────────────────────────────────────────────────────────────
function renderPagination() {
    const start = totalElements ? currentPage * PAGE_SIZE + 1 : 0;
    const end   = Math.min((currentPage + 1) * PAGE_SIZE, totalElements);
    const setText = (id, v) => { const e = document.getElementById(id); if (e) e.textContent = v; };
    setText('startCount', start);
    setText('endCount',   end);
    setText('totalCount', totalElements);

    const prevBtn = document.getElementById('prevBtn');
    const nextBtn = document.getElementById('nextBtn');
    if (prevBtn) prevBtn.disabled = currentPage === 0;
    if (nextBtn) nextBtn.disabled = currentPage >= totalPages - 1;

    const pageNumbers = document.getElementById('pageNumbers');
    if (!pageNumbers) return;
    pageNumbers.innerHTML = '';

    let startPage = Math.max(0, currentPage - 2);
    let endPage   = Math.min(totalPages - 1, startPage + 4);
    if (endPage - startPage < 4) startPage = Math.max(0, endPage - 4);

    for (let i = startPage; i <= endPage; i++) {
        const btn = document.createElement('button');
        btn.textContent = i + 1;
        btn.className   = `px-3 py-1 border rounded-lg text-sm transition-all ${
            i === currentPage ? 'bg-blue-600 text-white border-blue-600' : 'border-gray-300 hover:bg-gray-100'}`;
        btn.onclick = () => loadStudents(i);
        pageNumbers.appendChild(btn);
    }
}

const previousPage = () => { if (currentPage > 0)             loadStudents(currentPage - 1); };
const nextPage     = () => { if (currentPage < totalPages - 1) loadStudents(currentPage + 1); };

// ─────────────────────────────────────────────────────────────
//  4. STATS - FIXED to not fetch pending fees on add page
// ─────────────────────────────────────────────────────────────
async function updateStats(pageData) {
    const setText = (id, v) => { const e = document.getElementById(id); if (e) e.textContent = v; };
    setText('totalStudentsCount', pageData.totalElements || 0);

    // Check if we're on the add student page - if so, don't fetch fees
    const isAddPage = document.getElementById('addStudentSection')?.classList.contains('hidden') === false;
    if (isAddPage) {
        console.log('On add student page - skipping fees fetch');
        return;
    }

    try {
        const res = await fetch(`${BASE_URL}/api/students/get-student-statistics`, { headers: getAuthHeaders() });
        if (res.ok) {
            const s = await res.json();
            setText('totalStudentsCount',  s.totalStudents    || s.total  || pageData.totalElements || 0);
            setText('activeStudentsCount', s.activeStudents   || s.active || 0);
            setText('pendingFeesCount',    s.pendingFeesCount || s.pendingStudents || 0);
            if (!s.pendingFeesCount && !s.pendingStudents) fetchPendingFeesCount();
            return;
        }
    } catch (_) {}

    try {
        const res = await fetch(`${BASE_URL}/api/students/get-students-by-status/active`, { headers: getAuthHeaders() });
        if (res.ok) {
            const list = await res.json();
            setText('activeStudentsCount', Array.isArray(list) ? list.length : (list.content?.length || 0));
        }
    } catch (_) {}

    // Only fetch pending fees if we're on the all students page
    if (!isAddPage) {
        fetchPendingFeesCount();
    }
}

// Also update fetchPendingFeesCount to handle errors gracefully
async function fetchPendingFeesCount() {
    // Don't fetch if on add page
    const isAddPage = document.getElementById('addStudentSection')?.classList.contains('hidden') === false;
    if (isAddPage) {
        return;
    }
    
    try {
        const res = await fetch(`${BASE_URL}/api/fees/get-all-pending-fees`, { headers: getAuthHeaders() });
        if (res.ok) {
            const data = await res.json();
            const el   = document.getElementById('pendingFeesCount');
            if (el) el.textContent = Array.isArray(data) ? data.length : (data.totalElements || 0);
        } else {
            console.warn('Failed to fetch pending fees:', res.status);
            // Set a default value instead of showing error
            const el = document.getElementById('pendingFeesCount');
            if (el) el.textContent = '0';
        }
    } catch (err) {
        console.warn('Error fetching pending fees:', err.message);
        // Silently fail - don't show error to user
        const el = document.getElementById('pendingFeesCount');
        if (el) el.textContent = '0';
    }
}

// ─────────────────────────────────────────────────────────────
//  5. SEARCH & FILTER
// ─────────────────────────────────────────────────────────────
function searchAndFilter() {
    clearTimeout(searchDebounce);
    searchDebounce = setTimeout(async () => {
        const query  = document.getElementById('searchStudent')      ?.value.trim() || '';
        const cls    = document.getElementById('filterClass')         ?.value        || '';
        const sect   = document.getElementById('filterSection')       ?.value        || '';
        const status = document.getElementById('filterStudentStatus') ?.value        || '';

        if (!query && !cls && !sect && !status) { await loadStudents(0); return; }

        showLoading(true);
        try {
            let url = '';
            if (query)       url = `${BASE_URL}/api/students/search-students?name=${encodeURIComponent(query)}&fatherName=${encodeURIComponent(query)}`;
            else if (cls && sect) url = `${BASE_URL}/api/students/get-students-by-class-section?className=${encodeURIComponent(cls)}&section=${encodeURIComponent(sect)}`;
            else if (cls)    url = `${BASE_URL}/api/students/get-students-by-class/${encodeURIComponent(cls)}`;
            else if (status) url = `${BASE_URL}/api/students/get-students-by-status/${encodeURIComponent(status)}`;

            if (!url) { await loadStudents(0); return; }

            const res      = await fetch(url, { headers: getAuthHeaders() });
            const students = res.ok ? await res.json() : [];
            const list     = Array.isArray(students) ? students : (students.content || []);

            renderStudentTable(list);
            const setText = (id, v) => { const e = document.getElementById(id); if (e) e.textContent = v; };
            setText('totalCount', list.length);
            setText('startCount', list.length ? 1 : 0);
            setText('endCount',   list.length);
            document.getElementById('pageNumbers') ?.replaceChildren();
            if (document.getElementById('prevBtn')) document.getElementById('prevBtn').disabled = true;
            if (document.getElementById('nextBtn')) document.getElementById('nextBtn').disabled = true;
        } catch (err) {
            toastError('Search failed: ' + err.message);
        } finally {
            showLoading(false);
        }
    }, 400);
}

// ─────────────────────────────────────────────────────────────
//  6. LOAD CLASSES → TEACHERS → ACADEMIC YEAR
// ─────────────────────────────────────────────────────────────
async function loadClassesIntoFilters() {
    try {
        console.log('[Classes] Fetching classes from API...');
        const res = await fetch(`${BASE_URL}/api/classes/get-classes-by-status/ACTIVE`, { 
            headers: getAuthHeaders() 
        });
        
        if (!res.ok) {
            console.error('[Classes] API returned error:', res.status);
            return;
        }

        allClassesData = await res.json();
        console.log('[Classes] Loaded:', allClassesData);
        
        if (!allClassesData || allClassesData.length === 0) {
            console.warn('[Classes] No classes found in database');
            return;
        }
        
        // Get unique class names from backend
        const classNames = [...new Set(allClassesData.map(c => c.className))].sort();
        console.log('[Classes] Class names from backend:', classNames);
        
        // Get all sections for filter dropdown
        const allSections = [...new Set(allClassesData.map(c => c.section).filter(Boolean))].sort();
        console.log('[Classes] All sections from backend:', allSections);

        // ===== POPULATE FILTER DROPDOWNS =====
        
        // Filter - Class dropdown
        const filterClass = document.getElementById('filterClass');
        if (filterClass) {
            filterClass.innerHTML = '<option value="">All Classes</option>';
            classNames.forEach(name => {
                const opt = document.createElement('option');
                opt.value = name;
                opt.textContent = name;
                filterClass.appendChild(opt);
            });
            console.log('[Classes] Filter class dropdown populated');
        }

        // Filter - Section dropdown
        const filterSection = document.getElementById('filterSection');
        if (filterSection) {
            filterSection.innerHTML = '<option value="">All Sections</option>';
            allSections.forEach(section => {
                const opt = document.createElement('option');
                opt.value = section;
                opt.textContent = `Section ${section}`;
                filterSection.appendChild(opt);
            });
            console.log('[Classes] Filter section dropdown populated');
        }

        // ===== POPULATE ADD STUDENT FORM DROPDOWNS =====
        
        // Form - Class dropdown (using ID)
        const formClassSelect = document.getElementById('formClassSelect');
        if (formClassSelect) {
            formClassSelect.innerHTML = '<option value="">Select Class</option>';
            classNames.forEach(name => {
                const opt = document.createElement('option');
                opt.value = name;
                opt.textContent = name;
                formClassSelect.appendChild(opt);
            });
            console.log('[Classes] Form class dropdown populated with:', classNames);
            
            // Add change event listener to load sections for selected class
            formClassSelect.addEventListener('change', function() {
                console.log('Class selected:', this.value);
                loadSubjectsForClass(this.value);
                loadSectionsForClass(this.value);
            });
            
            // If there's a preselected value (during edit), trigger change
            if (formClassSelect.value) {
                formClassSelect.dispatchEvent(new Event('change'));
            }
        } else {
            console.error('[Classes] Form class select element not found!');
        }

        // Initialize section dropdown (empty until class is selected)
        const formSectionSelect = document.getElementById('formSectionSelect');
        if (formSectionSelect) {
            formSectionSelect.innerHTML = '<option value="">Select Section</option>';
            formSectionSelect.disabled = true;
        }

    } catch (err) {
        console.error('[Classes] Load failed:', err.message);
    }

    await Promise.all([loadTeachersIntoDropdown(), loadAcademicYears()]);
}

// Load sections based on selected class
function loadSectionsForClass(selectedClassName) {
    console.log('Loading sections for class:', selectedClassName);
    const sectionSelect = document.getElementById('formSectionSelect');
    if (!sectionSelect) {
        console.error('Section select element not found!');
        return;
    }

    if (!selectedClassName) {
        sectionSelect.innerHTML = '<option value="">Select Section</option>';
        sectionSelect.disabled = true;
        return;
    }

    sectionSelect.disabled = false;
    sectionSelect.innerHTML = '<option value="">Loading sections...</option>';

    // Debug: Log all classes data
    console.log('All classes data:', allClassesData);

    // Filter classes that match the selected class name
    const matchingClasses = allClassesData.filter(c => {
        // Convert both to string and trim for comparison
        const className = String(c.className || '').trim();
        const selectedClass = String(selectedClassName || '').trim();
        return className === selectedClass;
    });

    console.log('Matching classes:', matchingClasses);

    // Extract sections from matching classes
    const sections = [];
    matchingClasses.forEach(c => {
        if (c.section) {
            console.log(`Found section: "${c.section}" for class:`, c.className);
            sections.push(c.section);
        }
    });

    // Get unique sections
    const uniqueSections = [...new Set(sections)].sort();
    console.log('Unique sections found:', uniqueSections);

    if (uniqueSections.length === 0) {
        sectionSelect.innerHTML = '<option value="">No sections available</option>';
        return;
    }

    sectionSelect.innerHTML = '<option value="">Select Section</option>';
    uniqueSections.forEach(section => {
        const opt = document.createElement('option');
        opt.value = section;
        opt.textContent = `Section ${section}`;
        sectionSelect.appendChild(opt);
    });
    
    console.log('Section dropdown populated with', uniqueSections.length, 'options');
}

// ─────────────────────────────────────────────────────────────
//  LOAD TEACHERS
// ─────────────────────────────────────────────────────────────
async function loadTeachersIntoDropdown() {
    try {
        const res = await fetch(`${BASE_URL}/api/teachers/get-all-teachers`, { headers: getAuthHeaders() });
        if (!res.ok) return;
        const resp     = await res.json();
        const teachers = resp.data || resp || [];
        const dropdown = document.getElementById('classTeacherDropdown');
        if (!dropdown) return;

        dropdown.innerHTML = '<option value="">Select Class Teacher</option>';
        teachers.forEach(t => {
            const name = [t.firstName, t.lastName].filter(Boolean).join(' ');
            const opt  = document.createElement('option');
            opt.value  = name; opt.textContent = name;
            opt.dataset.teacherId = t.teacherId || t.id || '';
            dropdown.appendChild(opt);
        });
        console.log(`[Teachers] Loaded ${teachers.length} teachers`);
    } catch (err) {
        console.warn('[Teachers] Load failed:', err.message);
    }
}

// ─────────────────────────────────────────────────────────────
//  ACADEMIC YEAR — Auto-generate (no API needed)
// ─────────────────────────────────────────────────────────────
function loadAcademicYears() {
    const dropdown = document.getElementById('academicYearDropdown');
    if (!dropdown) return;

    const cur   = new Date().getFullYear();
    const years = [-1, 0, 1, 2].map(offset => `${cur + offset}-${cur + offset + 1}`);

    dropdown.innerHTML = '<option value="">Select Year</option>';
    years.forEach(y => {
        const opt = document.createElement('option');
        opt.value = y; opt.textContent = y;
        if (y === `${cur}-${cur + 1}`) opt.selected = true;
        dropdown.appendChild(opt);
    });
    console.log('[Academic Years] Loaded:', years);
}

// ─────────────────────────────────────────────────────────────
//  LOAD SUBJECTS WHEN CLASS IS SELECTED
// ─────────────────────────────────────────────────────────────
function loadSubjectsForClass(selectedClassName, preChecked = []) {
    const container = document.getElementById('subjectsContainer');
    if (!container) return;

    if (!selectedClassName) {
        container.innerHTML = '<p class="text-sm text-gray-400 italic col-span-4">Please select a class first.</p>';
        return;
    }

    const matches  = allClassesData.filter(c =>
        (c.className || '').toLowerCase() === selectedClassName.toLowerCase()
    );

    const subjectSet = new Set();
    matches.forEach(c => {
        if (c.classTeacherSubject?.trim())      subjectSet.add(c.classTeacherSubject.trim());
        if (c.assistantTeacherSubject?.trim())  subjectSet.add(c.assistantTeacherSubject.trim());
        (c.otherTeacherSubject || []).forEach(teacher =>
            (teacher.subjects || []).forEach(sub => {
                const name = (sub.subjectName || sub.name || '').trim();
                if (name) subjectSet.add(name);
            })
        );
    });

    const subjects = [...subjectSet].sort();
    console.log('[Subjects] For', selectedClassName, ':', subjects);

    if (!subjects.length) {
        container.innerHTML = `
            <div class="col-span-4 text-center py-4">
                <p class="text-sm text-orange-500 font-medium">⚠️ No subjects found for "${selectedClassName}".</p>
                <p class="text-xs text-gray-400 mt-1">Please assign subjects when creating this class.</p>
            </div>`;
        return;
    }

    container.innerHTML = subjects.map(subj => {
        const id        = 'subj_' + subj.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
        const isChecked = preChecked.some(p => p.toLowerCase().trim() === subj.toLowerCase().trim());
        return `
            <label class="flex items-center gap-3 p-3 border-2 ${isChecked ? 'border-blue-500 bg-blue-50' : 'border-gray-200'}
                   rounded-xl cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-all select-none">
                <input type="checkbox" id="${id}" name="subjects[]" value="${subj}" ${isChecked ? 'checked' : ''}
                       class="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                       onchange="this.closest('label').classList.toggle('border-blue-500', this.checked);
                                 this.closest('label').classList.toggle('bg-blue-50',      this.checked);
                                 this.closest('label').classList.toggle('border-gray-200', !this.checked);">
                <span class="text-sm font-medium text-gray-700">${subj}</span>
            </label>`;
    }).join('');
}

// ─────────────────────────────────────────────────────────────
//  7. VIEW STUDENT MODAL
// ─────────────────────────────────────────────────────────────
async function viewStudent(stdId) {
    showLoading(true);
    try {
        const res = await fetch(`${BASE_URL}/api/students/get-student-by-id/${stdId}`, { headers: getAuthHeaders() });
        if (!res.ok) throw new Error('Student not found');
        renderViewModal(await res.json());
    } catch (err) {
        toastError('Could not load student: ' + err.message);
    } finally {
        showLoading(false);
    }
}

function renderViewModal(student) {
    const modal = document.getElementById('viewModalOverlay');
    if (!modal) return;
    modal.classList.add('show');

    const fees       = student.feesDetails || {};
    const nameStr    = [student.firstName, student.middleName, student.lastName].filter(Boolean).join(' ');
    const isActive   = (student.status || '').toLowerCase() === 'active';
    const profileSrc = student.profileImageUrl ? `${BASE_URL}${student.profileImageUrl}` : null;

    const buildInstRows = () => {
        const insts = fees.installmentsList || [];
        if (!insts.length) return '';
        const paid    = insts.filter(i => i.status === 'PAID');
        const pending = insts.filter(i => i.status !== 'PAID');
        const paidAmt = paid   .reduce((s, i) => s + (i.amount || 0), 0);
        const pendAmt = pending.reduce((s, i) => s + (i.amount || 0), 0);

        const rows = insts.map((inst, idx) => {
            const isPaid    = inst.status === 'PAID';
            const isOverdue = inst.status === 'OVERDUE';
            const dot  = isPaid ? '#22c55e' : isOverdue ? '#f59e0b' : '#ef4444';
            const amt  = isPaid ? '#16a34a' : isOverdue ? '#d97706' : '#dc2626';
            const bg   = isPaid ? '#d1fae5' : isOverdue ? '#fef3c7' : '#fee2e2';
            const txt  = isPaid ? '#065f46' : isOverdue ? '#92400e' : '#991b1b';
            const date = isPaid ? `Paid: ${formatDate(inst.paidDate)}` : `Due: ${formatDate(inst.dueDate)}`;
            return `
                <div style="display:flex;align-items:center;justify-content:space-between;padding:6px 0;border-bottom:1px solid #f3f4f6;">
                    <div style="display:flex;align-items:center;gap:8px;">
                        <span style="width:8px;height:8px;border-radius:50%;background:${dot};flex-shrink:0;"></span>
                        <div>
                            <span style="font-size:12px;font-weight:600;color:#374151;">Inst ${idx + 1}</span>
                            <span style="font-size:11px;color:#9ca3af;display:block;">${date}</span>
                        </div>
                    </div>
                    <div style="text-align:right;">
                        <span style="font-size:12px;font-weight:700;color:${amt};">₹${(inst.amount||0).toLocaleString('en-IN')}</span>
                        <span style="font-size:10px;padding:1px 7px;border-radius:999px;display:block;margin-top:2px;font-weight:600;background:${bg};color:${txt};">${inst.status}</span>
                    </div>
                </div>`;
        }).join('');

        return `
            <div class="pt-2 border-t mt-2">
                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
                    <span class="font-semibold text-gray-700">Installments (${insts.length})</span>
                    <div style="display:flex;gap:6px;">
                        <span style="background:#d1fae5;color:#065f46;font-size:11px;font-weight:700;padding:2px 8px;border-radius:999px;">✓ ${paid.length} Paid</span>
                        ${pending.length ? `<span style="background:#fee2e2;color:#991b1b;font-size:11px;font-weight:700;padding:2px 8px;border-radius:999px;">⏳ ${pending.length} Pending</span>` : ''}
                    </div>
                </div>
                ${rows}
                <div style="display:flex;justify-content:space-between;padding-top:6px;font-size:12px;margin-top:4px;">
                    <span style="color:#16a34a;font-weight:600;">Paid: ₹${paidAmt.toLocaleString('en-IN')}</span>
                    <span style="color:#dc2626;font-weight:600;">Pending: ₹${pendAmt.toLocaleString('en-IN')}</span>
                </div>
            </div>`;
    };

    const mc = modal.querySelector('.modal-content');
    if (!mc) return;
    mc.innerHTML = `
        <div class="p-6 lg:p-8">
            <div class="flex justify-between items-center mb-6">
                <h3 class="text-xl lg:text-2xl font-bold text-gray-800">Student Details — ${nameStr}</h3>
                <button onclick="closeModal('viewModalOverlay')" class="text-gray-500 hover:text-gray-700 p-2">
                    <i class="fas fa-times text-2xl"></i>
                </button>
            </div>
            <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <!-- Left column -->
                <div class="space-y-4">
                    <div class="bg-gradient-to-br from-blue-50 to-purple-50 rounded-xl p-6 text-center">
                        <div class="h-28 w-28 rounded-full mx-auto mb-3 overflow-hidden border-4 border-white shadow-lg flex items-center justify-center bg-gray-200">
                            ${profileSrc ? `<img src="${profileSrc}" class="h-full w-full object-cover">` : `<i class="fas fa-user-graduate text-5xl text-blue-400"></i>`}
                        </div>
                        <h4 class="text-lg font-bold text-gray-800">${nameStr}</h4>
                        <p class="text-gray-500 text-sm">${student.studentId||''}</p>
                        <div class="mt-2 flex justify-center flex-wrap gap-2">
                            <span class="px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">Class ${student.currentClass||'-'} — ${student.section||'-'}</span>
                            <span class="px-3 py-1 rounded-full text-xs font-medium ${isActive?'bg-green-100 text-green-800':'bg-red-100 text-red-800'}">${student.status||'-'}</span>
                        </div>
                        <p class="text-sm text-gray-500 mt-1">Roll: ${student.studentRollNumber||'-'}</p>
                    </div>
                    <!-- Fee Status -->
                    <div class="bg-white rounded-xl border border-gray-200 p-4">
                        <h5 class="font-semibold text-gray-700 mb-3">Fee Status</h5>
                        <div class="space-y-1 text-sm">
                            ${feeRow('Total Fees',   '₹'+(fees.totalFees    ||0).toLocaleString('en-IN'))}
                            ${feeRow('Admission',    '₹'+(fees.admissionFees||0).toLocaleString('en-IN'))}
                            ${feeRow('Uniform',      '₹'+(fees.uniformFees  ||0).toLocaleString('en-IN'))}
                            ${feeRow('Books',        '₹'+(fees.bookFees     ||0).toLocaleString('en-IN'))}
                            ${feeRow('Tuition',      '₹'+(fees.tuitionFees  ||0).toLocaleString('en-IN'))}
                            <div class="pt-2 border-t mt-1">
                                ${feeRow('Initial Paid', `<span class="text-green-600 font-semibold">₹${(fees.initialAmount||0).toLocaleString('en-IN')}</span>`)}
                                ${feeRow('Total Paid',   `<span class="text-green-600 font-semibold">₹${((fees.totalFees||0)-(fees.remainingFees||0)).toLocaleString('en-IN')}</span>`)}
                                ${feeRow('Remaining',    `<span class="text-red-600 font-semibold">₹${(fees.remainingFees||0).toLocaleString('en-IN')}</span>`)}
                            </div>
                            <div class="pt-2 border-t mt-1">
                                ${feeRow('Payment Mode',   fees.paymentMode   || '-')}
                                ${feeRow('Payment Status', fees.paymentStatus || '-')}
                                ${fees.transactionId ? feeRow('Transaction ID', fees.transactionId) : ''}
                            </div>
                            ${buildInstRows()}
                        </div>
                    </div>
                    <!-- Documents -->
                    <div class="bg-white rounded-xl border border-gray-200 p-4">
                        <h5 class="font-semibold text-gray-700 mb-3">Documents</h5>
                        <div class="space-y-2 text-sm">
                            ${docLink('Profile Photo',        student.profileImageUrl,            student.stdId, 'profile-image')}
                            ${docLink('Student Aadhar',       student.studentAadharImageUrl,       student.stdId, 'aadhar-image')}
                            ${docLink('Father Aadhar',        student.fatherAadharImageUrl,        student.stdId, 'father-aadhar-image')}
                            ${docLink('Mother Aadhar',        student.motherAadharImageUrl,        student.stdId, 'mother-aadhar-image')}
                            ${docLink('Birth Certificate',    student.birthCertificateImageUrl,    student.stdId, 'birth-certificate')}
                            ${docLink('Transfer Certificate', student.transferCertificateImageUrl, student.stdId, 'transfer-certificate')}
                            ${docLink('Mark Sheet',           student.markSheetImageUrl,           student.stdId, 'marksheet')}
                        </div>
                    </div>
                </div>
                <!-- Right columns -->
                <div class="lg:col-span-2 space-y-4">
                    <div class="bg-white rounded-xl border border-gray-200 p-4">
                        <h5 class="font-semibold text-gray-700 mb-3">Personal Details</h5>
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                            ${infoRow('Date of Birth',  formatDate(student.dateOfBirth))}
                            ${infoRow('Gender',         student.gender        || '-')}
                            ${infoRow('Blood Group',    student.bloodGroup    || '-')}
                            ${infoRow('Caste Category', student.casteCategory || '-')}
                            ${infoRow('Aadhar Number',  student.aadharNumber  || '-')}
                            ${infoRow('Medical Info',   student.medicalInfo   || '-')}
                            ${infoRow('Previous School',student.previousSchool|| '-')}
                            ${infoRow('Sports',   (student.sportsActivity||[]).join(', ') || '-')}
                            ${infoRow('Subjects', (student.subjects||[]).join(', ')       || '-')}
                        </div>
                    </div>
                    <div class="bg-white rounded-xl border border-gray-200 p-4">
                        <h5 class="font-semibold text-gray-700 mb-3">Academic Details</h5>
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                            ${infoRow('Admission Date', formatDate(student.admissionDate))}
                            ${infoRow('Academic Year',  student.academicYear || '-')}
                            ${infoRow('Class Teacher',  student.classTeacher || '-')}
                        </div>
                    </div>
                    <div class="bg-white rounded-xl border border-gray-200 p-4">
                        <h5 class="font-semibold text-gray-700 mb-3">Parent / Guardian Details</h5>
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                            ${infoRow('Father Name',       student.fatherName       || '-')}
                            ${infoRow('Father Phone',      student.fatherPhone      || '-')}
                            ${infoRow('Father Email',      student.fatherEmail      || '-')}
                            ${infoRow('Father Occupation', student.fatherOccupation || '-')}
                            ${infoRow('Mother Name',       student.motherName       || '-')}
                            ${infoRow('Mother Phone',      student.motherPhone      || '-')}
                            ${infoRow('Mother Email',      student.motherEmail      || '-')}
                            ${infoRow('Mother Occupation', student.motherOccupation || '-')}
                            ${infoRow('Emergency Contact', student.emergencyContact || '-')}
                            ${infoRow('Emergency Relation',student.emergencyRelation|| '-')}
                        </div>
                    </div>
                    <div class="bg-white rounded-xl border border-gray-200 p-4">
                        <h5 class="font-semibold text-gray-700 mb-3">Address</h5>
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                            <div>
                                <p class="font-medium text-blue-600 mb-1">Local Address</p>
                                <p class="text-gray-700">${[student.localAddress,student.localCity,student.localState,student.localPincode].filter(Boolean).join(', ')||'-'}</p>
                            </div>
                            <div>
                                <p class="font-medium text-green-600 mb-1">Permanent Address</p>
                                <p class="text-gray-700">${[student.permanentAddress,student.permanentCity,student.permanentState,student.permanentPincode].filter(Boolean).join(', ')||'-'}</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            <div class="flex justify-end space-x-3 mt-6 pt-4 border-t border-gray-200">
                <button onclick="editStudent(${student.stdId}); closeModal('viewModalOverlay')"
                    class="px-5 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-all font-medium text-sm">
                    <i class="fas fa-edit mr-2"></i>Edit Student
                </button>
                <button onclick="closeModal('viewModalOverlay')"
                    class="px-5 py-2.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-all font-medium text-sm">
                    <i class="fas fa-times mr-2"></i>Close
                </button>
            </div>
        </div>`;
}

// Small helpers
const feeRow  = (label, val) =>
    `<div class="flex justify-between py-0.5"><span class="text-gray-500">${label}:</span><span>${val}</span></div>`;
const infoRow = (label, val) =>
    `<div><span class="text-gray-400 text-xs uppercase tracking-wide block">${label}</span><span class="font-medium text-gray-800">${val}</span></div>`;
const docLink = (label, url, stdId, endpoint) => url
    ? `<div class="flex justify-between items-center"><span class="text-gray-500">${label}:</span>
           <a href="${BASE_URL}/api/students/${stdId}/${endpoint}" target="_blank" class="text-blue-600 hover:underline text-xs"><i class="fas fa-external-link-alt mr-1"></i>View</a></div>`
    : `<div class="flex justify-between"><span class="text-gray-500">${label}:</span><span class="text-gray-400 italic text-xs">Not uploaded</span></div>`;
const formatDate = d => {
    if (!d) return '-';
    try { return new Date(d).toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' }); }
    catch { return d; }
};

// ─────────────────────────────────────────────────────────────
//  8. EDIT STUDENT
// ─────────────────────────────────────────────────────────────
async function editStudent(stdId) {
    showLoading(true);
    try {
        const res     = await fetch(`${BASE_URL}/api/students/get-student-by-id/${stdId}`, { headers: getAuthHeaders() });
        if (!res.ok) throw new Error('Student not found');
        const student = await res.json();

        editingStudentId = stdId;
        document.getElementById('allStudentsSection')?.classList.add('hidden');
        document.getElementById('addStudentSection') ?.classList.remove('hidden');

        const title = document.getElementById('formTitle');
        if (title) title.textContent = `Edit — ${student.firstName||''} ${student.lastName||''}`;
        const btn = document.getElementById('submitButton');
        if (btn) btn.innerHTML = '<i class="fas fa-save mr-2"></i>Update Student';

        switchTab('personal');
        window.scrollTo(0, 0);
        populateEditForm(student);
        toastInfo(`Editing: ${student.firstName||''} ${student.lastName||''}`);
    } catch (err) {
        toastError('Could not load student: ' + err.message);
    } finally {
        showLoading(false);
    }
}

// ─────────────────────────────────────────────────────────────
//  9. POPULATE EDIT FORM
// ─────────────────────────────────────────────────────────────
function populateEditForm(student) {
    const set = (sel, val) => { const el = document.querySelector(sel); if (el) el.value = val || ''; };

    // Personal
    set('input[name="firstName"]',      student.firstName);
    set('input[name="middleName"]',     student.middleName);
    set('input[name="lastName"]',       student.lastName);
    set('input[name="dob"]',            student.dateOfBirth ? student.dateOfBirth.split('T')[0] : '');
    set('select[name="gender"]',        student.gender);
    set('select[name="bloodGroup"]',    student.bloodGroup);
    set('select[name="casteCategory"]', student.casteCategory);
    set('input[name="previousSchool"]', student.previousSchool);
    set('input[name="aadharNumber"]',   student.aadharNumber);
    set('textarea[name="medicalInfo"]', student.medicalInfo);

    const stId = document.getElementById('studentId');
    const pwd  = document.getElementById('studentPassword');
    const cpwd = document.getElementById('confirmStudentPassword');
    const auto = document.getElementById('autoGeneratedId');
    if (stId) { stId.value = student.studentId || ''; stId.readOnly = true; }
    if (auto) auto.textContent = student.studentId || '';
    if (pwd)  { pwd.value  = ''; pwd.placeholder  = 'Leave blank to keep current password'; }
    if (cpwd) { cpwd.value = ''; cpwd.placeholder = 'Leave blank to keep current password'; }

    // Address
    set('input[name="localAddressLine1"]',     student.localAddress);
    set('input[name="localCity"]',             student.localCity);
    set('input[name="localState"]',            student.localState);
    set('input[name="localPincode"]',          student.localPincode);
    set('input[name="permanentAddressLine1"]', student.permanentAddress);
    set('input[name="permanentCity"]',         student.permanentCity);
    set('input[name="permanentState"]',        student.permanentState);
    set('input[name="permanentPincode"]',      student.permanentPincode);

    // Sports
    const knownSports = ['cricket','football','basketball','chess'];
    document.querySelectorAll('input[name="sports[]"]').forEach(cb => {
        cb.checked = (student.sportsActivity || []).includes(cb.value);
    });
    otherSports = (student.sportsActivity || []).filter(s => !knownSports.includes(s));
    updateOtherSportsDisplay();

    // Academic
    // Set class value
    const classSelect = document.getElementById('formClassSelect');
    if (classSelect && student.currentClass) {
        classSelect.value = student.currentClass;
        // Load sections for this class
        loadSectionsForClass(student.currentClass);
        // Set section value after a short delay
        setTimeout(() => {
            const sectionSelect = document.getElementById('formSectionSelect');
            if (sectionSelect && student.section) {
                sectionSelect.value = student.section;
            }
        }, 200);
    }
    
    set('input[name="rollNumber"]',     student.studentRollNumber);
    set('input[name="admissionDate"]',  student.admissionDate ? student.admissionDate.split('T')[0] : '');

    // Class teacher dropdown
    const ctDropdown = document.getElementById('classTeacherDropdown');
    if (ctDropdown) ctDropdown.value = student.classTeacher || '';

    // Academic year dropdown
    const ayDropdown = document.getElementById('academicYearDropdown');
    if (ayDropdown) ayDropdown.value = student.academicYear || '';

    // Subjects
    otherSubjects = [];
    if (student.currentClass) loadSubjectsForClass(student.currentClass, student.subjects || []);
    updateOtherSubjectsDisplay();

    // Parent
    set('input[name="fatherName"]',             student.fatherName);
    set('input[name="fatherContact"]',          student.fatherPhone);
    set('input[name="fatherOccupation"]',       student.fatherOccupation);
    set('input[name="fatherAadhar"]',           student.fatherAadhar);
    set('input[name="motherName"]',             student.motherName);
    set('input[name="motherContact"]',          student.motherPhone);
    set('input[name="motherOccupation"]',       student.motherOccupation);
    set('input[name="motherAadhar"]',           student.motherAadhar);
    set('input[name="parentEmail"]',            student.fatherEmail || student.motherEmail);
    set('input[name="emergencyContactName"]',   student.emergencyContact);
    set('input[name="emergencyContactNumber"]', student.emergencyRelation);

    // Fees
    const fees = student.feesDetails || {};
    const setV = (id, v) => { const e = document.getElementById(id); if (e) e.value = v || 0; };
    setV('admissionFees',  fees.admissionFees);
    setV('uniformFees',    fees.uniformFees);
    setV('bookFees',       fees.bookFees);
    setV('tuitionFees',    fees.tuitionFees);
    setV('initialPayment', fees.initialAmount);

    const pmRadio = document.querySelector(`input[name="paymentMode"][value="${fees.paymentMode||'one-time'}"]`);
    if (pmRadio) { pmRadio.checked = true; toggleInstallmentOptions(); }

    updateFeeCalculations();
}

// ─────────────────────────────────────────────────────────────
//  10. HANDLE ADD / UPDATE STUDENT
// ─────────────────────────────────────────────────────────────
async function handleAddStudent() {
    const isEditing = !!editingStudentId;
    const password  = document.getElementById('studentPassword') ?.value || '';
    const confirmP  = document.getElementById('confirmStudentPassword')?.value || '';

    if (!isEditing && !password) { toastError('Please enter a student password'); return; }
    if (password && password !== confirmP) {
        toastError('Passwords do not match');
        document.getElementById('passwordMismatch')?.classList.remove('hidden');
        return;
    }
    document.getElementById('passwordMismatch')?.classList.add('hidden');

    // First, switch to parent tab to ensure fields are visible
    switchTab('parent');
    
    // Small delay to ensure tab switch completes
    await new Promise(resolve => setTimeout(resolve, 100));

    const firstName = document.querySelector('input[name="firstName"]')?.value.trim();
    const lastName  = document.querySelector('input[name="lastName"]') ?.value.trim();
    const cls       = document.getElementById('formClassSelect')?.value;
    const fatherName = document.querySelector('input[name="fatherName"]')?.value.trim();

    console.log('After switching to parent tab:');
    console.log('Father name:', fatherName);
    console.log('Father input visible:', document.querySelector('input[name="fatherName"]')?.offsetParent !== null);

    if (!firstName) { toastError('First name is required'); switchTab('personal'); return; }
    if (!lastName)  { toastError('Last name is required');  switchTab('personal'); return; }
    if (!cls)       { toastError('Please select a class');  switchTab('academic'); return; }
    if (!fatherName) { 
        toastError('Father\'s name is required'); 
        return; 
    }

    if (document.querySelector('input[name="paymentMethod"]:checked')?.value === 'online' && !transactionVerified) {
        toastError('Please verify the Transaction ID before submitting'); 
        switchTab('fees'); 
        return;
    }

    showLoading(true);
    toastInfo(isEditing ? 'Updating student...' : 'Registering student...');

    try {
        const formData = buildFormData();
        if (!formData) {
            showLoading(false);
            return;
        }

        const url    = isEditing
            ? `${BASE_URL}/api/students/update-student-with-files/${editingStudentId}`
            : `${BASE_URL}/api/students/create-student-with-files`;
        const res    = await fetch(url, { method: isEditing ? 'PATCH' : 'POST', headers: getAuthHeaders(), body: formData });

        if (!res.ok) {
            let msg = `Server error (${res.status})`;
            try { const t = await res.text(); if (t) msg = t; } catch (_) {}
            throw new Error(msg);
        }

        const saved = await res.json();
        const name  = [saved?.firstName, saved?.lastName].filter(Boolean).join(' ') || `${firstName} ${lastName}`;

        toastSuccess(isEditing ? `"${name}" updated successfully! ` : `"${name}" registered successfully! `);
        if (!isEditing && saved?.studentId) setTimeout(() => toastInfo(`Student ID: ${saved.studentId}`), 700);

        editingStudentId = null;
        setTimeout(showAllStudentsSection, 1800);

    } catch (err) {
        console.error('handleAddStudent:', err);
        let msg = err.message || 'Unknown error';
        if      (msg.includes('409') || msg.toLowerCase().includes('duplicate')) msg = 'Student with this ID or Roll Number already exists';
        else if (msg.includes('400'))             msg = 'Invalid data — check all required fields';
        else if (msg.includes('401') || msg.includes('403')) msg = 'Session expired — please log in again';
        else if (msg.includes('500'))             msg = 'Server error — please try again';
        else if (msg.includes('Failed to fetch')) msg = 'Cannot reach server — check connection';
        toastError(`${isEditing ? 'Update' : 'Registration'} failed: ${msg}`);
    } finally {
        showLoading(false);
    }
}

// ─────────────────────────────────────────────────────────────
//  11. BUILD FORM DATA (multipart)
// ─────────────────────────────────────────────────────────────
function buildFormData() {
    console.log('========== DEBUG: Building Form Data ==========');
    
    const fd = new FormData();
    const sameLocal = document.getElementById('sameAsLocal')?.checked;

    // Get all values using document.querySelector
    const allSports = [
        ...[...document.querySelectorAll('input[name="sports[]"]:checked')].map(c => c.value),
        ...otherSports
    ];
    
    const allSubjects = [
        ...[...document.querySelectorAll('input[name="subjects[]"]:checked')].map(c => c.value),
        ...otherSubjects
    ];

    // Address fields
    const localAddr = [
        document.querySelector('input[name="localAddressLine1"]')?.value,
        document.querySelector('input[name="localAddressLine2"]')?.value
    ].filter(Boolean).join(', ');
    
    const permAddr = sameLocal ? localAddr : [
        document.querySelector('input[name="permanentAddressLine1"]')?.value,
        document.querySelector('input[name="permanentAddressLine2"]')?.value
    ].filter(Boolean).join(', ');
    
    const permCity = sameLocal 
        ? document.querySelector('input[name="localCity"]')?.value 
        : document.querySelector('input[name="permanentCity"]')?.value;
    
    const permState = sameLocal 
        ? document.querySelector('input[name="localState"]')?.value 
        : document.querySelector('input[name="permanentState"]')?.value;
    
    const permPincode = sameLocal 
        ? document.querySelector('input[name="localPincode"]')?.value 
        : document.querySelector('input[name="permanentPincode"]')?.value;

    // Additional fees
    const additionalFeesList = {};
    document.querySelectorAll('#additionalFeesList > div').forEach(row => {
        const spans = row.querySelectorAll('span');
        const name = spans[0]?.textContent.trim();
        const amount = parseInt((spans[1]?.textContent || '0').replace(/[₹,]/g, '')) || 0;
        if (name && amount > 0) additionalFeesList[name] = amount;
    });

    // Installments - WITH DATE FORMAT FIX
    const installmentsList = [];
    if (document.querySelector('input[name="paymentMode"]:checked')?.value === 'installment') {
        document.querySelectorAll('#installmentBreakdown > div').forEach((row) => {
            const amt = parseInt((row.querySelector('.font-semibold')?.textContent || '0').replace(/[₹,]/g, '')) || 0;
            const dateText = row.querySelector('.text-xs')?.textContent?.replace('Due: ', '') || null;
            
            if (dateText && amt > 0) {
                try {
                    const parsedDate = new Date(dateText);
                    if (!isNaN(parsedDate.getTime())) {
                        const year = parsedDate.getFullYear();
                        const month = String(parsedDate.getMonth() + 1).padStart(2, '0');
                        const day = String(parsedDate.getDate()).padStart(2, '0');
                        const formattedDate = `${year}-${month}-${day}`;
                        
                        installmentsList.push({ 
                            amount: amt, 
                            dueDate: formattedDate, 
                            status: 'PENDING' 
                        });
                    }
                } catch (e) {
                    console.error('Error parsing date:', dateText, e);
                }
            }
        });
    }

    const pwdVal = document.getElementById('studentPassword')?.value || '';
    const password = editingStudentId && !pwdVal ? undefined : pwdVal;
    
    const academicYear = document.getElementById('academicYearDropdown')?.value
        || document.querySelector('select[name="academicYear"]')?.value || '';

    // Auto-generate roll number if blank
    const rollInput = document.querySelector('input[name="rollNumber"]')?.value?.trim();
    const autoRoll = rollInput || `ROLL-${new Date().toISOString().slice(0,10).replace(/-/g,'')}-${Math.floor(1000+Math.random()*9000)}`;

    // Get class name from dropdown
    const classSelect = document.getElementById('formClassSelect');
    const className = classSelect ? classSelect.value : '';
    console.log('Selected class name:', className);

    // Find the corresponding classId from allClassesData
    let classId = null;
    if (className && allClassesData && allClassesData.length > 0) {
        const matchedClass = allClassesData.find(c => c.className === className);
        if (matchedClass) {
            classId = matchedClass.classId; // Get the numeric ID
            console.log('Found classId:', classId, 'for class:', className);
        } else {
            console.warn('No matching class found for name:', className);
        }
    }

    // Get section value
    const sectionSelect = document.getElementById('formSectionSelect');
    const sectionValue = sectionSelect ? sectionSelect.value : '';
    console.log('Section value:', sectionValue);

    // Get father's name
    const fatherName = document.querySelector('input[name="fatherName"]')?.value || '';
    console.log('Father name captured:', fatherName);
    
    if (!fatherName) {
        toastError('Father\'s name is required');
        switchTab('parent');
        return null;
    }

    if (!className) {
        toastError('Please select a class');
        switchTab('academic');
        return null;
    }

    if (!classId) {
        toastError('Invalid class selection. Please try again.');
        switchTab('academic');
        return null;
    }

    const studentData = {
        studentRollNumber: autoRoll,
        firstName:         document.querySelector('input[name="firstName"]')?.value || '',
        middleName:        document.querySelector('input[name="middleName"]')?.value || '',
        lastName:          document.querySelector('input[name="lastName"]')?.value || '',
        ...(password !== undefined && { studentPassword: password }),
        dateOfBirth:       document.querySelector('input[name="dob"]')?.value || null,
        gender:            document.querySelector('select[name="gender"]')?.value || '',
        bloodGroup:        document.querySelector('select[name="bloodGroup"]')?.value || '',
        aadharNumber:      document.querySelector('input[name="aadharNumber"]')?.value || '',
        casteCategory:     document.querySelector('select[name="casteCategory"]')?.value || '',
        medicalInfo:       document.querySelector('textarea[name="medicalInfo"]')?.value || '',
        sportsActivity:    allSports,
        localAddress:      localAddr,
        localCity:         document.querySelector('input[name="localCity"]')?.value || '',
        localState:        document.querySelector('input[name="localState"]')?.value || '',
        localPincode:      document.querySelector('input[name="localPincode"]')?.value || '',
        permanentAddress:  permAddr || '',
        permanentCity:     permCity || '',
        permanentState:    permState || '',
        permanentPincode:  permPincode || '',
        fatherName:        fatherName,
        fatherPhone:       document.querySelector('input[name="fatherContact"]')?.value || '',
        fatherOccupation:  document.querySelector('input[name="fatherOccupation"]')?.value || '',
        fatherEmail:       document.querySelector('input[name="parentEmail"]')?.value || '',
        motherName:        document.querySelector('input[name="motherName"]')?.value || '',
        motherPhone:       document.querySelector('input[name="motherContact"]')?.value || '',
        motherOccupation:  document.querySelector('input[name="motherOccupation"]')?.value || '',
        motherEmail:       document.querySelector('input[name="parentEmail"]')?.value || '',
        emergencyContact:  document.querySelector('input[name="emergencyContactName"]')?.value || '',
        emergencyRelation: document.querySelector('input[name="emergencyContactNumber"]')?.value || '',
        currentClass:      className,  // For StudentEntity (stores class name)
        classId:           classId,    // For StudentClassEnrollment relationship
        section:           sectionValue,
        academicYear,
        admissionDate:     document.querySelector('input[name="admissionDate"]')?.value || null,
        classTeacher:      document.getElementById('classTeacherDropdown')?.value || '',
        previousSchool:    document.querySelector('input[name="previousSchool"]')?.value || '',
        subjects:          allSubjects,
        status:            'active',
        createdBy:         'Admin',
        admissionFees:     parseInt(document.getElementById('admissionFees')?.value) || 0,
        uniformFees:       parseInt(document.getElementById('uniformFees')?.value) || 0,
        bookFees:          parseInt(document.getElementById('bookFees')?.value) || 0,
        tuitionFees:       parseInt(document.getElementById('tuitionFees')?.value) || 0,
        initialAmount:     parseInt(document.getElementById('initialPayment')?.value) || 0,
        additionalFeesList,
        paymentMode:       document.querySelector('input[name="paymentMode"]:checked')?.value || 'one-time',
        installmentsList,
        cashierName:       'Admin',
        transactionId:     document.getElementById('transactionId')?.value || '',
    };

    console.log('Student data being sent:', studentData);
    fd.append('studentData', JSON.stringify(studentData));

    const fileMap = {
        profileImage:             'studentPhoto',
        studentAadharImage:       'studentAadharImage',
        fatherAadharImage:        'fatherAadharImage',
        motherAadharImage:        'motherAadharImage',
        birthCertificateImage:    'birthCertificateImage',
        transferCertificateImage: 'transferCertificateImage',
        markSheetImage:           'markSheetImage',
    };
    
    Object.entries(fileMap).forEach(([field, inputId]) => {
        const input = document.getElementById(inputId);
        if (input?.files?.length > 0) fd.append(field, input.files[0]);
    });

    return fd;
}
// ─────────────────────────────────────────────────────────────
//  12. DELETE STUDENT
// ─────────────────────────────────────────────────────────────
async function deleteStudent(stdId) {
    if (!confirm('Delete this student? This cannot be undone.')) return;
    showLoading(true);
    try {
        const res = await fetch(`${BASE_URL}/api/students/delete-student/${stdId}`, { method: 'DELETE', headers: getAuthHeaders() });
        if (!res.ok) throw new Error('Delete failed');
        toastSuccess('Student deleted successfully');
        await loadStudents(currentPage);
    } catch (err) {
        toastError('Delete failed: ' + err.message);
    } finally {
        showLoading(false);
    }
}

// ─────────────────────────────────────────────────────────────
//  13. EXPORT CSV
// ─────────────────────────────────────────────────────────────
async function exportStudents() {
    showLoading(true);
    try {
        const res      = await fetch(`${BASE_URL}/api/students/get-all-students?page=0&size=10000&direction=desc`, { headers: getAuthHeaders() });
        if (!res.ok) throw new Error('Export failed');
        const students = (await res.json()).content || [];

        const headers = ['ID','Student ID','Roll No','Name','Class','Section','Father','Phone','Email','Fees Status','Admission Date'];
        const rows    = students.map(s => {
            const fees = s.feesDetails || {};
            return [s.stdId, s.studentId||'', s.studentRollNumber||'',
                [s.firstName, s.middleName, s.lastName].filter(Boolean).join(' '),
                s.currentClass||'', s.section||'', s.fatherName||'', s.fatherPhone||'', s.fatherEmail||'',
                fees.paymentStatus||'No Fees', s.admissionDate?.split('T')[0]||''];
        });

        const csv  = [headers, ...rows].map(r => r.map(c => `"${c}"`).join(',')).join('\n');
        const a    = document.createElement('a');
        a.href     = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
        a.download = `students_${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        URL.revokeObjectURL(a.href);
        toastSuccess(`Exported ${students.length} students`);
    } catch (err) {
        toastError('Export failed: ' + err.message);
    } finally {
        showLoading(false);
    }
}

// ─────────────────────────────────────────────────────────────
//  14. RESET FORM
// ─────────────────────────────────────────────────────────────
function resetAddStudentForm() {
    document.getElementById('addStudentForm')?.reset();
    otherSports = []; otherSubjects = [];
    editingStudentId = null; transactionVerified = false; qrCodeGenerated = false;

    const g = id => document.getElementById(id);
    ['otherSportsDisplay','otherSubjectsDisplay'].forEach(id => {
        const el = g(id); if (el) { el.innerHTML = ''; el.classList.add('hidden'); }
    });
    ['otherSportsContainer','otherSubjectsContainer'].forEach(id => g(id)?.classList.add('hidden'));
    ['otherSportsCheckbox','otherSubjectsCheckbox'].forEach(id => { const el = g(id); if (el) el.checked = false; });

    const preview = g('studentPhotoPreview');
    if (preview) preview.innerHTML = '<i class="fas fa-user text-4xl lg:text-6xl text-gray-400"></i>';

    g('passwordMismatch')?.classList.add('hidden');

    const stId = g('studentId');
    const pwd  = g('studentPassword');
    const cpwd = g('confirmStudentPassword');
    if (stId) { stId.readOnly = false; }
    if (pwd)  { pwd.readOnly  = false; pwd.placeholder  = 'Enter password'; }
    if (cpwd) { cpwd.readOnly = false; cpwd.placeholder = 'Confirm password'; }

    document.querySelector('input[name="paymentMode"][value="one-time"]')  ?.click();
    document.querySelector('input[name="paymentMethod"][value="cash"]')    ?.click();

    const subjectsContainer = g('subjectsContainer');
    if (subjectsContainer) subjectsContainer.innerHTML = '<p class="text-sm text-gray-400 italic col-span-4">Please select a class first.</p>';

    const autoId = generateStudentId();
    if (g('autoGeneratedId')) g('autoGeneratedId').textContent = autoId;
    if (g('studentId'))       g('studentId').value             = autoId;
    if (g('submitButton'))    g('submitButton').innerHTML       = '<i class="fas fa-check-circle mr-2"></i>Register Student';
    if (g('formTitle'))       g('formTitle').textContent        = 'Add New Student';

    const fidEl = g('firstInstallmentDate');
    if (fidEl) { const d = new Date(); d.setMonth(d.getMonth() + 1); fidEl.value = d.toISOString().split('T')[0]; }

    loadAcademicYears();
    toggleInstallmentOptions();
    togglePermanentAddress();
    closeQRCode();
    updateFeeCalculations();
    updateOtherSportsDisplay();
    updateOtherSubjectsDisplay();
}

// ─────────────────────────────────────────────────────────────
//  15. FEE CALCULATIONS
// ─────────────────────────────────────────────────────────────
function updateFeeCalculations() {
    const n = id => parseInt(document.getElementById(id)?.value) || 0;

    let additional = 0;
    document.querySelectorAll('#additionalFeesList > div').forEach(row => {
        additional += parseInt((row.querySelectorAll('span')[1]?.textContent || '0').replace(/[₹,]/g, '')) || 0;
    });

    const total   = n('admissionFees') + n('uniformFees') + n('bookFees') + n('tuitionFees') + additional;
    const initial = n('initialPayment');
    const balance = Math.max(0, total - initial);
    const fmt     = v => '₹' + v.toLocaleString('en-IN');

    const setText = (id, v) => { const e = document.getElementById(id); if (e) e.textContent = v; };
    setText('totalFeesDisplay',    fmt(total));
    setText('totalFeesAmount',     fmt(total));
    setText('summaryTotal',        fmt(total - additional));
    setText('summaryAdditional',   fmt(additional));
    setText('summaryGrandTotal',   fmt(total));
    setText('summaryPaid',         fmt(initial));
    setText('summaryPending',      fmt(balance));
    setText('summaryBalance',      fmt(balance));
    setText('balanceAmount',       fmt(balance));
    setText('remainingFeeDisplay', fmt(balance));
    setText('qrAmount',            fmt(initial || total));

    calculateInstallments();
}

function calculateInstallments() {
    const breakdown = document.getElementById('installmentBreakdown');
    if (!breakdown) return;
    const n = id => parseInt(document.getElementById(id)?.value) || 0;
    const total   = n('admissionFees') + n('uniformFees') + n('bookFees') + n('tuitionFees');
    const balance = Math.max(0, total - n('initialPayment'));
    const count   = parseInt(document.getElementById('installmentCount')?.value) || 3;

    if (!balance) { breakdown.innerHTML = '<p class="text-sm text-gray-400 italic">No balance remaining.</p>'; return; }

    const perInst   = Math.floor(balance / count);
    const lastInst  = balance - perInst * (count - 1);
    const startVal  = document.getElementById('firstInstallmentDate')?.value;
    const startDate = startVal ? new Date(startVal) : (() => { const d = new Date(); d.setMonth(d.getMonth() + 1); return d; })();

    breakdown.innerHTML = Array.from({ length: count }, (_, i) => {
        const amt     = i === count - 1 ? lastInst : perInst;
        const dueDate = new Date(startDate);
        dueDate.setMonth(dueDate.getMonth() + i);
        
        const displayDate = dueDate.toLocaleDateString('en-IN', {
            day: '2-digit',
            month: 'short',
            year: 'numeric'
        });
        
        const backendDate = dueDate.toISOString().split('T')[0];
        
        return `
            <div class="flex items-center justify-between p-3 bg-blue-50 rounded-lg" 
                 data-due-date="${backendDate}" data-amount="${amt}">
                <div>
                    <span class="font-medium text-gray-700 text-sm">Installment ${i + 1}</span>
                    <span class="text-xs text-gray-500 block">Due: ${displayDate}</span>
                </div>
                <span class="font-semibold text-blue-600 text-sm">₹${amt.toLocaleString('en-IN')}</span>
            </div>`;
    }).join('');
}

function toggleInstallmentOptions() {
    const isInst = document.querySelector('input[name="paymentMode"]:checked')?.value === 'installment';
    document.getElementById('installmentOptions')?.classList.toggle('hidden', !isInst);
    if (isInst) calculateInstallments();
}

function handlePaymentMethodChange() {
    const isOnline = document.querySelector('input[name="paymentMethod"]:checked')?.value === 'online';
    document.getElementById('qrCodeSection')?.classList.toggle('hidden', !isOnline);
    transactionVerified = false;
    if (isOnline) generateQRCodeForPayment(); else closeQRCode();
}

// ─────────────────────────────────────────────────────────────
//  16. ADDRESS
// ─────────────────────────────────────────────────────────────
const togglePermanentAddress = () => {
    const checked = document.getElementById('sameAsLocal')?.checked;
    document.getElementById('permanentAddressSection')?.classList.toggle('hidden', !!checked);
};

// ─────────────────────────────────────────────────────────────
//  17. SPORTS HELPERS
// ─────────────────────────────────────────────────────────────
function toggleOtherSports() {
    const checked = document.getElementById('otherSportsCheckbox')?.checked;
    document.getElementById('otherSportsContainer')?.classList.toggle('hidden', !checked);
    if (!checked) { otherSports = []; updateOtherSportsDisplay(); }
}
function addOtherSports() {
    const input = document.getElementById('otherSportsInput');
    (input?.value || '').split(',').map(s => s.trim()).filter(Boolean).forEach(v => {
        if (!otherSports.includes(v)) otherSports.push(v);
    });
    if (input) input.value = '';
    updateOtherSportsDisplay();
}
const removeOtherSport = sport => { otherSports = otherSports.filter(s => s !== sport); updateOtherSportsDisplay(); };
function updateOtherSportsDisplay() {
    const display = document.getElementById('otherSportsDisplay');
    if (!display) return;
    if (!otherSports.length) { display.innerHTML = ''; display.classList.add('hidden'); return; }
    display.classList.remove('hidden');
    display.innerHTML = otherSports.map(s =>
        `<span class="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium mr-1 mb-1">
            ${s}<button type="button" onclick="removeOtherSport('${s}')" class="ml-1 text-blue-600 hover:text-red-600 font-bold">×</button>
        </span>`
    ).join('');
}

// ─────────────────────────────────────────────────────────────
//  18. SUBJECTS HELPERS
// ─────────────────────────────────────────────────────────────
function toggleOtherSubjects() {
    const checked = document.getElementById('otherSubjectsCheckbox')?.checked;
    document.getElementById('otherSubjectsContainer')?.classList.toggle('hidden', !checked);
    if (!checked) { otherSubjects = []; updateOtherSubjectsDisplay(); }
}
function addOtherSubjects() {
    const input = document.getElementById('otherSubjectsInput');
    (input?.value || '').split(',').map(s => s.trim()).filter(Boolean).forEach(v => {
        if (!otherSubjects.includes(v)) otherSubjects.push(v);
    });
    if (input) input.value = '';
    updateOtherSubjectsDisplay();
}
const removeOtherSubject = subj => { otherSubjects = otherSubjects.filter(s => s !== subj); updateOtherSubjectsDisplay(); };
function updateOtherSubjectsDisplay() {
    const display = document.getElementById('otherSubjectsDisplay');
    if (!display) return;
    if (!otherSubjects.length) { display.innerHTML = ''; display.classList.add('hidden'); return; }
    display.classList.remove('hidden');
    display.innerHTML = otherSubjects.map(s =>
        `<span class="inline-flex items-center gap-1 px-2 py-1 bg-purple-100 text-purple-800 rounded-full text-xs font-medium mr-1 mb-1">
            ${s}<button type="button" onclick="removeOtherSubject('${s}')" class="ml-1 text-purple-600 hover:text-red-600 font-bold">×</button>
        </span>`
    ).join('');
}

// ─────────────────────────────────────────────────────────────
//  19. ADDITIONAL FEES
// ─────────────────────────────────────────────────────────────
function addAdditionalFee() {
    const nameEl = document.getElementById('additionalFeeName');
    const amtEl  = document.getElementById('additionalFeeAmount');
    const name   = nameEl?.value.trim();
    const amount = parseInt(amtEl?.value) || 0;
    if (!name)       { toastWarning('Enter a fee name');      return; }
    if (amount <= 0) { toastWarning('Enter a valid amount');  return; }

    const list = document.getElementById('additionalFeesList');
    if (!list) return;

    const existing = [...list.querySelectorAll('span:first-child')].map(s => s.textContent.trim());
    if (existing.includes(name)) { toastWarning(`"${name}" already added`); return; }

    const div = document.createElement('div');
    div.className = 'flex items-center justify-between p-2 bg-gray-50 rounded-lg border border-gray-200';
    div.innerHTML = `
        <span class="text-sm font-medium text-gray-700">${name}</span>
        <div class="flex items-center gap-3">
            <span class="text-sm font-semibold text-green-600">₹${amount.toLocaleString('en-IN')}</span>
            <button type="button" onclick="this.closest('div.flex').parentElement.remove(); updateFeeCalculations();"
                class="text-red-500 hover:text-red-700"><i class="fas fa-times text-xs"></i></button>
        </div>`;
    list.appendChild(div);
    if (nameEl) nameEl.value = '';
    if (amtEl)  amtEl.value  = '';
    updateFeeCalculations();
}

// ─────────────────────────────────────────────────────────────
//  20. PHOTO & DOCUMENT PREVIEW
// ─────────────────────────────────────────────────────────────
function previewStudentPhoto(input) {
    if (!input?.files?.[0]) return;
    const reader = new FileReader();
    reader.onload = e => {
        const p = document.getElementById('studentPhotoPreview');
        if (p) p.innerHTML = `<img src="${e.target.result}" class="h-full w-full object-cover rounded-full">`;
    };
    reader.readAsDataURL(input.files[0]);
}

function previewDocument(input, previewId) {
    if (!input?.files?.[0]) return;
    const file    = input.files[0];
    const preview = document.getElementById(previewId);
    if (!preview) return;
    if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = e => { preview.innerHTML = `<img src="${e.target.result}" class="h-full w-full object-contain rounded-lg">`; };
        reader.readAsDataURL(file);
    } else {
        preview.innerHTML = `
            <div class="flex flex-col items-center justify-center h-full">
                <i class="fas fa-file-pdf text-3xl text-red-500 mb-2"></i>
                <p class="text-sm text-gray-600 text-center">${file.name}</p>
                <p class="text-xs text-gray-400">${(file.size / 1024).toFixed(1)} KB</p>
            </div>`;
    }
}

function removeDocument(inputId, previewId) {
    const input   = document.getElementById(inputId);
    const preview = document.getElementById(previewId);
    if (input)   input.value = '';
    if (preview) preview.innerHTML = `
        <i class="fas fa-cloud-upload-alt text-3xl text-gray-400 mb-2"></i>
        <p class="text-sm text-gray-500 text-center">Click to upload</p>`;
}

// ─────────────────────────────────────────────────────────────
//  21. TRANSACTION ID VERIFY
// ─────────────────────────────────────────────────────────────
function verifyTransactionId() {
    const txId   = document.getElementById('transactionId')?.value.trim();
    const status = document.getElementById('transactionStatus');
    if (!txId || txId.length < 6) {
        toastError('Transaction ID must be at least 6 characters');
        if (status) status.innerHTML = '<p class="text-xs text-red-500">Invalid Transaction ID</p>';
        return;
    }
    transactionVerified = true;
    toastSuccess('Transaction ID verified ✓');
    if (status) status.innerHTML = '<p class="text-xs text-green-600 font-semibold">✓ Verified</p>';
    const btn = document.querySelector('button[onclick="verifyTransactionId()"]');
    if (btn) { btn.innerHTML = '<i class="fas fa-check mr-2"></i>Verified'; btn.disabled = true; btn.classList.replace('bg-blue-600','bg-green-600'); }
}

// ─────────────────────────────────────────────────────────────
//  22. QR CODE
// ─────────────────────────────────────────────────────────────
function generateQRCodeForPayment() {
    const canvas = document.getElementById('qrCodeCanvas');
    if (!canvas) return;
    const amount = parseInt(document.getElementById('initialPayment')?.value || '0');
    const upiUrl = `upi://pay?pa=school@upi&pn=SchoolFees&am=${amount}&cu=INR&tn=SchoolFees`;

    canvas.innerHTML = '';
    if (typeof QRCode !== 'undefined') {
        try { new QRCode(canvas, { text: upiUrl, width: 200, height: 200, correctLevel: QRCode.CorrectLevel.M }); }
        catch { useFallbackQR(canvas, upiUrl, amount); }
    } else {
        useFallbackQR(canvas, upiUrl, amount);
    }

    qrCodeGenerated = true;
    const qrAmtEl = document.getElementById('qrAmount');
    if (qrAmtEl) qrAmtEl.textContent = '₹' + amount.toLocaleString('en-IN');
}

function useFallbackQR(canvas, upiUrl, amount) {
    canvas.innerHTML = `
        <img src="https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(upiUrl)}"
             alt="QR Code" style="width:180px;height:180px;border-radius:8px;border:1px solid #e5e7eb;">
        <p style="font-size:11px;color:#9ca3af;margin-top:6px;text-align:center;">Amount: ₹${amount.toLocaleString('en-IN')}</p>`;
}

function closeQRCode() {
    const canvas = document.getElementById('qrCodeCanvas');
    if (canvas) canvas.innerHTML = '';
    document.getElementById('qrCodeSection')?.classList.add('hidden');
    qrCodeGenerated = false;
}

const refreshQRCode = () => generateQRCodeForPayment();

const updatePaymentDetails = () => updateFeeCalculations();

// ─────────────────────────────────────────────────────────────
//  23. DOMContentLoaded — INIT
// ─────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
    if (!localStorage.getItem('admin_jwt_token')) {
        window.location.replace('/login.html'); return;
    }

    // Parallel init
    await Promise.all([loadClassesIntoFilters(), loadStudents(0)]);

    // Search & filter
    document.getElementById('searchStudent')      ?.addEventListener('input',  searchAndFilter);
    document.getElementById('filterClass')         ?.addEventListener('change', searchAndFilter);
    document.getElementById('filterSection')       ?.addEventListener('change', searchAndFilter);
    document.getElementById('filterStudentStatus') ?.addEventListener('change', searchAndFilter);

    // Sidebar nav
    document.getElementById('navAllStudents')?.addEventListener('click', e => { e.preventDefault(); showAllStudentsSection(); });
    document.getElementById('navAddStudent') ?.addEventListener('click', e => { e.preventDefault(); showAddStudentSection(); });

    window.addEventListener('popstate', checkUrlAndShowSection);

    // Auto student ID
    const autoId = generateStudentId();
    const autoEl = document.getElementById('autoGeneratedId');
    const stIdEl = document.getElementById('studentId');
    if (autoEl) autoEl.textContent = autoId;
    if (stIdEl) stIdEl.value       = autoId;

    // Password match
    const pwdEl   = document.getElementById('studentPassword');
    const cpwdEl  = document.getElementById('confirmStudentPassword');
    const mismatch= document.getElementById('passwordMismatch');
    const checkMatch = () => {
        const bad = !editingStudentId && pwdEl?.value && cpwdEl?.value && pwdEl.value !== cpwdEl.value;
        mismatch?.classList.toggle('hidden', !bad);
    };
    pwdEl ?.addEventListener('input', checkMatch);
    cpwdEl?.addEventListener('input', checkMatch);

    // Fee inputs
    ['admissionFees','uniformFees','bookFees','tuitionFees','initialPayment']
        .forEach(id => document.getElementById(id)?.addEventListener('input', updateFeeCalculations));
    document.getElementById('installmentCount')     ?.addEventListener('change', () => { updateFeeCalculations(); calculateInstallments(); });
    document.getElementById('firstInstallmentDate') ?.addEventListener('change', calculateInstallments);
    document.querySelectorAll('input[name="paymentMode"]').forEach(r => r.addEventListener('change', toggleInstallmentOptions));

    // Address
    document.getElementById('sameAsLocal')?.addEventListener('change', togglePermanentAddress);

    // Photo preview
    document.getElementById('studentPhoto')?.addEventListener('change', function () { previewStudentPhoto(this); });

    // Transaction ID — reset verified state on edit
    document.getElementById('transactionId')?.addEventListener('input', () => {
        transactionVerified = false;
        const s   = document.getElementById('transactionStatus');
        if (s) s.innerHTML = '';
        const btn = document.querySelector('button[onclick="verifyTransactionId()"]');
        if (btn) { btn.innerHTML = '<i class="fas fa-check mr-2"></i>Verify'; btn.disabled = false; btn.classList.replace('bg-green-600','bg-blue-600'); }
    });

    // Enter key shortcuts
    document.getElementById('additionalFeeAmount')?.addEventListener('keypress', e => { if (e.key === 'Enter') { e.preventDefault(); addAdditionalFee(); } });
    document.getElementById('additionalFeeName')  ?.addEventListener('keypress', e => { if (e.key === 'Enter') { e.preventDefault(); document.getElementById('additionalFeeAmount')?.focus(); } });
    document.getElementById('otherSportsInput')   ?.addEventListener('keypress', e => { if (e.key === 'Enter') { e.preventDefault(); addOtherSports(); } });
    document.getElementById('otherSubjectsInput') ?.addEventListener('keypress', e => { if (e.key === 'Enter') { e.preventDefault(); addOtherSubjects(); } });

    // Default first installment date
    const fidEl = document.getElementById('firstInstallmentDate');
    if (fidEl) { const d = new Date(); d.setMonth(d.getMonth() + 1); fidEl.value = d.toISOString().split('T')[0]; }

    // Initial UI
    updateFeeCalculations();
    toggleInstallmentOptions();
    togglePermanentAddress();
    switchTab('personal');

    // Sidebar toggle
    document.getElementById('sidebarToggle')?.addEventListener('click', () => {
        const sidebar = document.getElementById('sidebar');
        const main    = document.getElementById('mainContent');
        const icon    = document.getElementById('sidebarToggleIcon');
        if (window.innerWidth < 1024) {
            sidebar?.classList.toggle('mobile-open');
            document.getElementById('sidebarOverlay')?.classList.toggle('active');
        } else {
            sidebar?.classList.toggle('collapsed');
            main   ?.classList.toggle('sidebar-collapsed');
            icon   ?.classList.toggle('fa-bars');
            icon   ?.classList.toggle('fa-times');
        }
    });
    document.getElementById('sidebarOverlay')?.addEventListener('click', function () {
        document.getElementById('sidebar')?.classList.remove('mobile-open');
        this.classList.remove('active');
    });

    // Header dropdowns
    document.getElementById('notificationsBtn')?.addEventListener('click', e => {
        e.stopPropagation();
        document.getElementById('notificationsDropdown')?.classList.toggle('hidden');
    });
    document.getElementById('userMenuBtn')?.addEventListener('click', e => {
        e.stopPropagation();
        document.getElementById('userMenuDropdown')?.classList.toggle('hidden');
    });
    document.addEventListener('click', () => {
        document.getElementById('notificationsDropdown')?.classList.add('hidden');
        document.getElementById('userMenuDropdown')       ?.classList.add('hidden');
    });

    checkUrlAndShowSection();
        setActiveSidebarLink();

});