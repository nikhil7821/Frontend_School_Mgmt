// =====================================================
// API CONFIGURATION
// =====================================================
const API_BASE_URL = 'http://localhost:8084/api/inquiries';

// =====================================================
// CONFIG — CLASSES & SECTIONS
// =====================================================
const CLASSES = ['Nursery','LKG','UKG','1','2','3','4','5','6','7','8','9','10','11','12'];
const SECTIONS_MAP = {
    'Nursery':['A','B'], 'LKG':['A','B'], 'UKG':['A','B'],
    '1':['A','B'], '2':['A','B'], '3':['A','B','C'],
    '4':['A','B','C'], '5':['A','B','C'], '6':['A','B','C','D'],
    '7':['A','B','C','D'], '8':['A','B','C','D'],
    '9':['A','B','C','D'], '10':['A','B','C','D'],
    '11':['Science A','Science B','Commerce A','Arts A'],
    '12':['Science A','Science B','Commerce A','Arts A'],
};
const STATUS_CONFIG = {
    new:        { label:'New',        icon:'fa-star',         color:'#1e40af', bg:'#dbeafe' },
    follow_up:  { label:'Follow-up',  icon:'fa-redo',         color:'#854d0e', bg:'#fef9c3' },
    visited:    { label:'Visited',    icon:'fa-eye',          color:'#0369a1', bg:'#e0f2fe' },
    admitted:   { label:'Admitted',   icon:'fa-check-circle', color:'#065f46', bg:'#d1fae5' },
    rejected:   { label:'Rejected',   icon:'fa-times-circle', color:'#991b1b', bg:'#fee2e2' },
    in_progress:{ label:'In Progress',icon:'fa-spinner',      color:'#d97706', bg:'#fef3c7' }
};
const SOURCE_LABELS = {
    walkin:'Walk-in', phone:'Phone', website:'Website',
    referral:'Referral', social:'Social Media', advertisement:'Advertisement'
};

// =====================================================
// USER SESSION MANAGEMENT (JWT)
// =====================================================

function isTokenValid() {
    const token = localStorage.getItem('admin_jwt_token');
    if (!token) return false;
    try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        return Date.now() < payload.exp * 1000;
    } catch(e) {
        return false;
    }
}

function getAuthHeaders() {
    const token = localStorage.getItem('admin_jwt_token');
    return {
        'Content-Type': 'application/json',
        'Authorization': token ? `Bearer ${token}` : ''
    };
}

// =====================================================
// GLOBAL VARIABLES
// =====================================================
let inquiries = [];
let academicYearsList = [];
let activeYear = 'All';
let currentDeleteId = null;
let currentViewId = null;
let currentPage = 1;
let currentTab = 'all';
const PER_PAGE = 8;

// =====================================================
// API CALL FUNCTIONS
// =====================================================

async function fetchInquiries(search = '', status = 'all', classApplied = 'all', source = 'all', academicYear = 'All', page = 0, size = 10, sortBy = 'createdAt', sortOrder = 'desc') {
    try {
        const params = new URLSearchParams();
        if (search) params.append('search', search);
        params.append('status', status);
        params.append('classApplied', classApplied);
        params.append('source', source);
        params.append('academicYear', academicYear);
        params.append('page', page);
        params.append('size', size);
        params.append('sortBy', sortBy);
        params.append('sortOrder', sortOrder);
        
        const response = await fetch(`${API_BASE_URL}/get-all?${params}`, {
            headers: getAuthHeaders()
        });
        const data = await response.json();
        
        if (data.success) {
            inquiries = data.data;
            console.log('Fetched inquiries:', inquiries);
            return {
                data: data.data,
                pagination: data.pagination
            };
        } else {
            showToast(data.message, true);
            return { data: [], pagination: { total: 0, pages: 0 } };
        }
    } catch (error) {
        console.error('Error fetching inquiries:', error);
        showToast('Failed to fetch inquiries: ' + error.message, true);
        return { data: [], pagination: { total: 0, pages: 0 } };
    }
}

async function fetchStats(academicYear = 'All') {
    try {
        const response = await fetch(`${API_BASE_URL}/stats?academicYear=${academicYear}`, {
            headers: getAuthHeaders()
        });
        const data = await response.json();
        if (data.success) {
            return data.data;
        } else {
            showToast(data.message, true);
            return null;
        }
    } catch (error) {
        console.error('Error fetching stats:', error);
        showToast('Failed to fetch statistics', true);
        return null;
    }
}

async function fetchClassSummary(academicYear = 'All') {
    try {
        const response = await fetch(`${API_BASE_URL}/class-summary?academicYear=${academicYear}`, {
            headers: getAuthHeaders()
        });
        const data = await response.json();
        if (data.success) {
            return data.data;
        } else {
            return [];
        }
    } catch (error) {
        console.error('Error fetching class summary:', error);
        return [];
    }
}

async function createInquiry(data) {
    try {
        const payload = {
            studentName: data.studentName,
            dob: data.dob,
            classApplied: data.classApplied,
            sectionApplied: data.sectionApplied,
            prevSchool: data.prevSchool,
            prevClass: data.prevClass,
            fatherName: data.fatherName,
            motherName: data.motherName,
            phone: data.phone,
            email: data.email,
            address: data.address,
            source: data.source,
            academicYear: data.academicYear,
            status: data.status,
            remarks: data.remarks,
            nextFollowup: data.nextFollowup,
            assignedTo: data.assignedTo,
            createdBy: data.createdBy
        };
        
        console.log('Create Inquiry Payload:', JSON.stringify(payload, null, 2));
        
        const response = await fetch(`${API_BASE_URL}/create`, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify(payload)
        });
        const result = await response.json();
        
        if (result.success) {
            showToast('Inquiry created successfully!');
            return result.data;
        } else {
            showToast(result.message, true);
            return null;
        }
    } catch (error) {
        console.error('Error creating inquiry:', error);
        showToast('Failed to create inquiry: ' + error.message, true);
        return null;
    }
}

async function updateInquiry(inquiryId, data) {
    try {
        const payload = {
            studentName: data.studentName,
            dob: data.dob,
            classApplied: data.classApplied,
            sectionApplied: data.sectionApplied,
            prevSchool: data.prevSchool,
            prevClass: data.prevClass,
            fatherName: data.fatherName,
            motherName: data.motherName,
            phone: data.phone,
            email: data.email,
            address: data.address,
            source: data.source,
            academicYear: data.academicYear,
            status: data.status,
            remarks: data.remarks,
            nextFollowup: data.nextFollowup,
            assignedTo: data.assignedTo,
            createdBy: data.createdBy
        };
        
        const response = await fetch(`${API_BASE_URL}/update/${inquiryId}`, {
            method: 'PUT',
            headers: getAuthHeaders(),
            body: JSON.stringify(payload)
        });
        const result = await response.json();
        
        if (result.success) {
            showToast('Inquiry updated successfully!');
            return result.data;
        } else {
            showToast(result.message, true);
            return null;
        }
    } catch (error) {
        console.error('Error updating inquiry:', error);
        showToast('Failed to update inquiry: ' + error.message, true);
        return null;
    }
}

async function deleteInquiry(inquiryId) {
    try {
        const response = await fetch(`${API_BASE_URL}/delete/${inquiryId}`, {
            method: 'DELETE',
            headers: getAuthHeaders()
        });
        const result = await response.json();
        if (result.success) {
            showToast('Inquiry deleted successfully!');
            return true;
        } else {
            showToast(result.message, true);
            return false;
        }
    } catch (error) {
        console.error('Error deleting inquiry:', error);
        showToast('Failed to delete inquiry: ' + error.message, true);
        return false;
    }
}

async function addFollowUp(inquiryId, data) {
    try {
        const payload = {
            date: data.date,
            note: data.note,
            status: data.status,
            nextDate: data.nextDate
        };
        
        const response = await fetch(`${API_BASE_URL}/${inquiryId}/followups`, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify(payload)
        });
        const result = await response.json();
        if (result.success) {
            showToast('Follow-up added successfully!');
            return result.data;
        } else {
            showToast(result.message, true);
            return null;
        }
    } catch (error) {
        console.error('Error adding follow-up:', error);
        showToast('Failed to add follow-up: ' + error.message, true);
        return null;
    }
}

async function updateStatus(inquiryId, status) {
    try {
        const response = await fetch(`${API_BASE_URL}/${inquiryId}/status?status=${status}`, {
            method: 'PATCH',
            headers: getAuthHeaders()
        });
        const result = await response.json();
        if (result.success) {
            showToast(`Status updated to ${STATUS_CONFIG[status]?.label || status}!`);
            return result.data;
        } else {
            showToast(result.message, true);
            return null;
        }
    } catch (error) {
        console.error('Error updating status:', error);
        showToast('Failed to update status: ' + error.message, true);
        return null;
    }
}

async function fetchInquiryById(inquiryId) {
    try {
        const response = await fetch(`${API_BASE_URL}/get/${inquiryId}`, {
            headers: getAuthHeaders()
        });
        const result = await response.json();
        if (result.success) {
            return result.data;
        } else {
            showToast(result.message, true);
            return null;
        }
    } catch (error) {
        console.error('Error fetching inquiry:', error);
        showToast('Failed to fetch inquiry details', true);
        return null;
    }
}

// =====================================================
// ACADEMIC YEAR MANAGEMENT
// =====================================================

async function fetchAcademicYears() {
    try {
        const yearsSet = new Set();
        inquiries.forEach(i => yearsSet.add(i.academicYear));
        
        if (yearsSet.size === 0) {
            const cy = new Date().getFullYear();
            for (let y = cy - 2; y <= cy + 2; y++) {
                yearsSet.add(`${y}-${y + 1}`);
            }
        }
        
        const years = Array.from(yearsSet).sort().map(year => ({ year, label: year }));
        return years;
    } catch (error) {
        console.error('Error fetching academic years:', error);
        const cy = new Date().getFullYear();
        const years = [];
        for (let y = cy - 2; y <= cy + 2; y++) {
            years.push({ year: `${y}-${y + 1}`, label: `${y}-${y + 1}` });
        }
        return years;
    }
}

function getCurrentYearDefault() {
    const cy = new Date().getFullYear();
    const month = new Date().getMonth();
    return month >= 3 ? `${cy}-${cy + 1}` : `${cy - 1}-${cy}`;
}

function parseYearStart(str) {
    const m = String(str).match(/^(\d{4})/);
    return m ? parseInt(m[1]) : 0;
}

// =====================================================
// RENDER FUNCTIONS
// =====================================================

async function refreshAllData() {
    const searchVal = document.getElementById('searchInput')?.value || '';
    const statusVal = document.getElementById('statusFilter')?.value || 'all';
    const classVal = document.getElementById('classFilter')?.value || 'all';
    const sourceVal = document.getElementById('sourceFilter')?.value || 'all';
    
    const result = await fetchInquiries(searchVal, statusVal, classVal, sourceVal, activeYear, currentPage - 1, PER_PAGE);
    inquiries = result.data;
    
    academicYearsList = await fetchAcademicYears();
    
    populateYearChips();
    populateFormSelects();
    renderInquiries();
    await updateStats();
    await updateClassSummary();
    updateNotifBadge();
}

async function updateStats() {
    const stats = await fetchStats(activeYear);
    if (stats) {
        const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
        set('statTotal', stats.total);
        set('statNew', stats.new);
        set('statFollowup', stats.followup);
        set('statVisited', stats.visited);
        set('statAdmitted', stats.admitted);
        set('statRejected', stats.rejected);
        set('conversionRate', stats.conversionRate + '%');
    }
}

async function updateClassSummary() {
    const summary = await fetchClassSummary(activeYear);
    const yearLabelEl = document.getElementById('classSummaryYear');
    if (yearLabelEl) yearLabelEl.textContent = activeYear === 'All' ? 'All Years' : `Year: ${activeYear}`;
    
    const grid = document.getElementById('classSummaryGrid');
    if (!grid) return;
    
    if (!summary.length) {
        grid.innerHTML = '<div style="color:#94a3b8;font-size:.85rem;padding:8px;grid-column:1/-1;">No data for selected year.</div>';
        return;
    }
    
    grid.innerHTML = summary.map(cls => {
        const rate = cls.conversionRate || 0;
        const clsLabel = CLASSES.includes(cls.className) ? `Class ${cls.className}` : cls.className;
        return `
        <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:12px;">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
                <span style="font-size:.8rem;font-weight:700;color:#1e293b;">${clsLabel}</span>
                <span class="badge badge-class">${cls.total} inq.</span>
            </div>
            <div style="display:flex;gap:8px;margin-bottom:8px;flex-wrap:wrap;">
                <span style="font-size:.68rem;color:#059669;font-weight:600;"><i class="fas fa-check" style="margin-right:2px;"></i>${cls.admitted || 0}</span>
                <span style="font-size:.68rem;color:#d97706;font-weight:600;"><i class="fas fa-redo" style="margin-right:2px;"></i>${cls.followup || 0}</span>
            </div>
            <div class="progress-bar">
                <div class="progress-fill" style="width:${rate}%;background:${rate>=50?'#10b981':'#f59e0b'};"></div>
            </div>
            <div style="font-size:.68rem;color:#64748b;margin-top:4px;">${rate}% conversion</div>
        </div>`;
    }).join('');
}

function renderInquiries() {
    const filtered = getFilteredInquiries();
    const total = filtered.length;
    const start = (currentPage - 1) * PER_PAGE;
    const end = Math.min(start + PER_PAGE, total);
    const page = filtered.slice(start, end);
    
    const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
    set('startCount', total ? start + 1 : 0);
    set('endCount', end);
    set('totalCount', total);
    renderPagination(total);
    
    const tbody = document.getElementById('inquiryTableBody');
    if (!tbody) return;
    
    if (!page.length) {
        tbody.innerHTML = '<tr><td colspan="11" style="text-align:center;padding:40px;color:#94a3b8;"><i class="fas fa-inbox" style="font-size:2rem;display:block;margin-bottom:8px;"></i>No inquiries found</td></tr>';
        return;
    }
    
    const today = new Date().toISOString().split('T')[0];
    tbody.innerHTML = page.map((i, idx) => {
        const sc = STATUS_CONFIG[i.status] || STATUS_CONFIG.new;
        const fups = (i.followups || []).length;
        const isOverdue = i.nextFollowup && i.nextFollowup < today && !['admitted','rejected'].includes(i.status);
        const clsLabel = CLASSES.includes(i.classApplied) ? `Class ${i.classApplied}` : (i.classApplied || '—');
        const secLabel = i.sectionApplied ? ` – ${i.sectionApplied}` : '';
        const createdByName = i.createdBy || i.created_by || i.created_by_name || 'System';
        
        return `<tr>
            <td style="color:#94a3b8;font-size:.78rem;">${start + idx + 1}</td>
            <td><span class="badge badge-id" style="background:#e0e7ff;color:#4f46e5;font-family:monospace;">${i.inquiryId}</span></td>
            <td>
                <div style="font-weight:600;color:#1e293b;">${i.studentName}</div>
                <div style="font-size:.75rem;color:#64748b;">${i.fatherName || '—'} · ${i.phone}</div>
            </td>
            <td><span class="badge badge-class">${clsLabel}${secLabel}</span></td>
            <td><span style="font-size:.78rem;color:#475569;"><i class="fas fa-${sourceIcon(i.source)}" style="margin-right:4px;color:#94a3b8;"></i>${SOURCE_LABELS[i.source] || i.source}</span></td>
            <td>
                <span class="status-pill" style="background:${sc.bg};color:${sc.color};" onclick="openStatusModal('${i.inquiryId}')" title="Click to change status">
                    <i class="fas ${sc.icon}"></i>${sc.label}
                    <i class="fas fa-chevron-down" style="font-size:.55rem;opacity:.6;"></i>
                </span>
            </td>
            <td>
                <span style="font-size:.8rem;font-weight:600;color:${fups > 0 ? '#7c3aed' : '#94a3b8'};">
                    <i class="fas fa-comments" style="margin-right:4px;"></i>${fups}
                </span>
                ${isOverdue ? '<span class="badge" style="background:#fee2e2;color:#991b1b;margin-left:4px;">Overdue</span>' : ''}
            </td>
            <td><span class="badge badge-year">${i.academicYear}</span></td>
            <td>
                <span class="badge badge-user" style="background:#e9e9ff;color:#4f46e5;">
                    <i class="fas fa-user-circle" style="margin-right:3px;"></i>${createdByName}
                </span>
            </td>
            <td style="font-size:.78rem;color:#64748b;">${fmtDate(i.createdAt)}</td>
            <td>
                <button class="action-btn view" onclick="openViewModal('${i.inquiryId}')" title="View"><i class="fas fa-eye"></i></button>
                <button class="action-btn edit" onclick="openEditModal('${i.inquiryId}')" title="Edit"><i class="fas fa-edit"></i></button>
                <button class="action-btn fup" onclick="openFollowupModal('${i.inquiryId}')" title="Follow-up"><i class="fas fa-redo"></i></button>
                <button class="action-btn del" onclick="openDeleteModal('${i.inquiryId}')" title="Delete"><i class="fas fa-trash"></i></button>
            </td>
        </tr>`;
    }).join('');
}

function getFilteredInquiries() {
    const q = (document.getElementById('searchInput')?.value || '').toLowerCase();
    const st = document.getElementById('statusFilter')?.value || 'all';
    const cls = document.getElementById('classFilter')?.value || 'all';
    const src = document.getElementById('sourceFilter')?.value || 'all';
    
    return inquiries.filter(i => {
        if (activeYear !== 'All' && i.academicYear !== activeYear) return false;
        if (currentTab !== 'all' && i.status !== currentTab) return false;
        if (q && !i.studentName.toLowerCase().includes(q) &&
                 !(i.fatherName || '').toLowerCase().includes(q) &&
                 !i.phone.includes(q) &&
                 !(i.email || '').toLowerCase().includes(q) &&
                 !(i.inquiryId || '').toLowerCase().includes(q)) return false;
        if (st !== 'all' && i.status !== st) return false;
        if (cls !== 'all' && i.classApplied !== cls) return false;
        if (src !== 'all' && i.source !== src) return false;
        return true;
    });
}

function renderPagination(total) {
    const pages = Math.ceil(total / PER_PAGE);
    const ctrl = document.getElementById('paginationControls');
    if (!ctrl) return;
    if (pages <= 1) { ctrl.innerHTML = ''; return; }
    
    const btn = (label, page, disabled, active) =>
        `<button onclick="gotoPage(${page})" ${disabled ? 'disabled' : ''}
            style="width:30px;height:30px;border-radius:6px;
                   border:1px solid ${active ? '#2563eb' : '#e2e8f0'};
                   background:${active ? '#2563eb' : '#fff'};
                   color:${active ? '#fff' : '#475569'};
                   cursor:${disabled ? 'not-allowed' : 'pointer'};
                   font-size:.75rem;opacity:${disabled ? '.4' : '1'};">${label}</button>`;
    
    let html = btn('&lsaquo;', currentPage - 1, currentPage === 1, false);
    for (let p = 1; p <= pages; p++) html += btn(p, p, false, p === currentPage);
    html += btn('&rsaquo;', currentPage + 1, currentPage === pages, false);
    ctrl.innerHTML = html;
}

function gotoPage(p) {
    const total = getFilteredInquiries().length;
    const maxP = Math.ceil(total / PER_PAGE);
    if (p < 1 || p > maxP) return;
    currentPage = p;
    renderInquiries();
}

// =====================================================
// UI EVENT HANDLERS
// =====================================================

function populateYearChips() {
    const container = document.getElementById('yearChips');
    if (!container) return;
    
    let html = `<span class="year-chip ${activeYear === 'All' ? 'active' : ''}" onclick="selectYear('All')">All</span>`;
    
    academicYearsList.forEach(({ year }) => {
        html += `
        <span class="year-chip ${activeYear === year ? 'active' : ''}" onclick="selectYear('${year}')"
              style="position:relative;padding-right:26px;">
          ${year}
          <button onclick="event.stopPropagation(); deleteYear('${year}')" class="year-chip-x">&#x2715;</button>
        <\/span>`;
    });
    
    html += `<button onclick="openAddYearModal()" class="year-quick-btn"><i class="fas fa-plus"></i> Add Year</button>`;
    container.innerHTML = html;
}

async function selectYear(y) {
    activeYear = y;
    currentPage = 1;
    await refreshAllData();
}

function deleteYear(year) {
    if (confirm(`Delete academic year ${year}? This will affect inquiries with this year.`)) {
        academicYearsList = academicYearsList.filter(y => y.year !== year);
        if (activeYear === year) {
            activeYear = 'All';
        }
        populateYearChips();
        populateFormSelects();
        refreshAllData();
        showToast(`Year ${year} removed from filter`);
    }
}

function populateClassFilter() {
    const sel = document.getElementById('classFilter');
    if (!sel) return;
    sel.innerHTML = '<option value="all">All Classes</option>' +
        CLASSES.map(c => `<option value="${c}">Class ${c}</option>`).join('');
}

function populateFormSelects() {
    const classEl = document.getElementById('classApplied');
    if (classEl) {
        classEl.innerHTML = '<option value="">-- Select Class --</option>' +
            CLASSES.map(c => `<option value="${c}">Class ${c}</option>`).join('');
    }
    const yearEl = document.getElementById('academicYear');
    if (yearEl) {
        yearEl.innerHTML = academicYearsList.map(({ year }) =>
            `<option value="${year}" ${year === getCurrentYearDefault() ? 'selected' : ''}>${year}</option>`
        ).join('');
    }
}

function populateModalSections() {
    const cls = document.getElementById('classApplied').value;
    const secEl = document.getElementById('sectionApplied');
    secEl.innerHTML = '<option value="">-- Any Section --</option>';
    if (cls && SECTIONS_MAP[cls]) {
        SECTIONS_MAP[cls].forEach(s => {
            secEl.innerHTML += `<option value="${s}">${s}</option>`;
        });
    }
}

function updateNotifBadge() {
    const today = new Date().toISOString().split('T')[0];
    const due = inquiries.filter(i => i.nextFollowup && i.nextFollowup <= today && !['admitted','rejected'].includes(i.status));
    const badge = document.getElementById('notifBadge');
    if (badge) badge.textContent = due.length || '';
    
    const list = document.getElementById('notifList');
    if (!list) return;
    if (!due.length) {
        list.innerHTML = '<div style="padding:16px;text-align:center;color:#94a3b8;font-size:.85rem;"><i class="fas fa-check-circle" style="color:#10b981;font-size:1.2rem;display:block;margin-bottom:4px;"></i>No follow-ups due today</div>';
        return;
    }
    list.innerHTML = due.slice(0,5).map(i => `
        <div style="padding:12px 14px;border-bottom:1px solid #f1f5f9;cursor:pointer;transition:background .15s;"
             onmouseover="this.style.background='#f8fafc'" onmouseout="this.style.background=''"
             onclick="openViewModal('${i.inquiryId}');document.getElementById('notifMenu').classList.add('hidden');">
            <div style="display:flex;align-items:center;gap:10px;">
                <div style="width:32px;height:32px;border-radius:50%;background:#fef9c3;display:flex;align-items:center;justify-content:center;flex-shrink:0;">
                    <i class="fas fa-redo" style="color:#d97706;font-size:.75rem;"></i>
                </div>
                <div>
                    <p style="font-size:.82rem;font-weight:600;color:#1e293b;">${i.studentName}</p>
                    <p style="font-size:.72rem;color:#64748b;">Follow-up due: ${fmtDate(i.nextFollowup)} · Class ${i.classApplied}</p>
                </div>
            </div>
        </div>
    `).join('');
}

function filterInquiries() { currentPage = 1; renderInquiries(); }

function clearFilters() {
    const si = document.getElementById('searchInput');
    if (si) si.value = '';
    ['statusFilter','classFilter','sourceFilter'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = 'all';
    });
    filterInquiries();
}

function switchTab(tab) {
    currentTab = tab;
    currentPage = 1;
    ['all','new','follow_up','visited','admitted','rejected'].forEach(t => {
        const key = 'tab' + t.charAt(0).toUpperCase() + t.slice(1);
        const el = document.getElementById(key);
        if (el) el.classList.toggle('active', t === tab);
    });
    renderInquiries();
}

// =====================================================
// MODAL FUNCTIONS
// =====================================================

function openCreateModal() {
    document.getElementById('modalTitle').textContent = 'New Inquiry';
    document.getElementById('inquiryForm').reset();
    document.getElementById('inquiryId').value = '';
    document.getElementById('sectionApplied').innerHTML = '<option value="">-- Any Section --</option>';
    
    const tomorrow = new Date(Date.now() + 24*60*60*1000).toISOString().split('T')[0];
    document.getElementById('nextFollowup').value = tomorrow;
    
    const yearEl = document.getElementById('academicYear');
    if (yearEl) {
        yearEl.value = activeYear !== 'All' ? activeYear : getCurrentYearDefault();
    }
    
    const statusEl = document.getElementById('status');
    if (statusEl) statusEl.value = 'new';
    
    const createdByField = document.getElementById('createdBy');
    const recordNotesField = document.getElementById('recordNotes');
    
    if (createdByField) createdByField.value = '';
    if (recordNotesField) recordNotesField.value = '';
    
    document.getElementById('inquiryModal').classList.remove('hidden');
}

async function openEditModal(id) {
    const inq = await fetchInquiryById(id);
    if (!inq) return;
    
    document.getElementById('modalTitle').textContent = 'Edit Inquiry';
    document.getElementById('inquiryId').value = inq.inquiryId;
    document.getElementById('studentName').value = inq.studentName || '';
    document.getElementById('dob').value = inq.dob || '';
    document.getElementById('classApplied').value = inq.classApplied || '';
    populateModalSections();
    document.getElementById('sectionApplied').value = inq.sectionApplied || '';
    document.getElementById('prevSchool').value = inq.prevSchool || '';
    document.getElementById('prevClass').value = inq.prevClass || '';
    document.getElementById('fatherName').value = inq.fatherName || '';
    document.getElementById('motherName').value = inq.motherName || '';
    document.getElementById('phone').value = inq.phone || '';
    document.getElementById('email').value = inq.email || '';
    document.getElementById('address').value = inq.address || '';
    document.getElementById('source').value = inq.source || 'walkin';
    document.getElementById('academicYear').value = inq.academicYear || getCurrentYearDefault();
    document.getElementById('status').value = inq.status || 'new';
    document.getElementById('remarks').value = inq.remarks || '';
    document.getElementById('nextFollowup').value = inq.nextFollowup || '';
    document.getElementById('assignedTo').value = inq.assignedTo || '';
    
    const createdByField = document.getElementById('createdBy');
    const recordNotesField = document.getElementById('recordNotes');
    
    if (createdByField) createdByField.value = inq.createdBy || '';
    if (recordNotesField) recordNotesField.value = inq.record_notes || '';
    
    document.getElementById('inquiryModal').classList.remove('hidden');
}

function closeModal() { document.getElementById('inquiryModal').classList.add('hidden'); }

async function saveInquiry(e) {
    e.preventDefault();
    const id = document.getElementById('inquiryId').value;
    const get = (elId) => (document.getElementById(elId) || {}).value || '';
    
    const createdByName = document.getElementById('createdBy')?.value || '';
    
    const data = {
        studentName: get('studentName'),
        dob: get('dob') || null,
        classApplied: get('classApplied'),
        sectionApplied: get('sectionApplied'),
        prevSchool: get('prevSchool'),
        prevClass: get('prevClass'),
        fatherName: get('fatherName'),
        motherName: get('motherName'),
        phone: get('phone'),
        email: get('email'),
        address: get('address'),
        source: get('source'),
        academicYear: get('academicYear'),
        status: get('status'),
        remarks: get('remarks'),
        nextFollowup: get('nextFollowup') || null,
        assignedTo: get('assignedTo'),
        createdBy: createdByName
    };
    
    console.log('Saving inquiry with data:', data);
    
    let result;
    if (id) {
        result = await updateInquiry(id, data);
    } else {
        result = await createInquiry(data);
    }
    
    if (result) {
        closeModal();
        await refreshAllData();
        showToast(id ? 'Inquiry updated successfully!' : 'Inquiry created successfully!');
    }
}

async function openViewModal(id) {
    const inq = await fetchInquiryById(id);
    if (!inq) return;
    currentViewId = id;
    
    const sc = STATUS_CONFIG[inq.status] || STATUS_CONFIG.new;
    const clsLabel = CLASSES.includes(inq.classApplied) ? `Class ${inq.classApplied}` : inq.classApplied;
    const secLabel = inq.sectionApplied ? ` – ${inq.sectionApplied}` : '';
    
    document.getElementById('viewTitle').textContent = `${inq.studentName} — ${inq.inquiryId}`;
    
    const userInfoHtml = `
        <div style="background:#f1f5f9;border-radius:8px;padding:10px 12px;margin-bottom:12px;font-size:.72rem;color:#475569;border:1px solid #e2e8f0;">
            <div style="display:flex;justify-content:space-between;margin-bottom:6px;">
                <span><i class="fas fa-id-card" style="margin-right:6px;color:#4f46e5;"></i>Inquiry ID: <b style="color:#4f46e5;">${inq.inquiryId}</b></span>
                <span><i class="fas fa-user-circle" style="margin-right:6px;color:#64748b;"></i>Created by: <b>${inq.createdBy || 'System'}</b></span>
            </div>
            <div style="display:flex;gap:12px;margin-top:4px;">
                <span><i class="fas fa-calendar" style="margin-right:4px;"></i>Created: ${fmtDateFull(inq.createdAt)}</span>
                ${inq.updatedAt && inq.updatedAt !== inq.createdAt ? 
                    `<span><i class="fas fa-edit" style="margin-right:4px;"></i>Last updated: ${fmtDateFull(inq.updatedAt)}</span>` : ''}
            </div>
        </div>
    `;
    
    const timelineHtml = (inq.followups || []).length > 0 ? `
        <div style="margin-top:16px;">
            <p style="font-size:.78rem;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:.05em;margin-bottom:10px;">
                <i class="fas fa-history" style="margin-right:5px;color:#7c3aed;"></i>
                Follow-up History (${inq.followups.length})
            </p>
            ${inq.followups.map(f => {
                const fsc = STATUS_CONFIG[f.status] || STATUS_CONFIG.new;
                return `<div class="timeline-item">
                    <div class="timeline-dot" style="background:${fsc.bg};color:${fsc.color};">
                        <i class="fas ${fsc.icon}" style="font-size:.65rem;"></i>
                    </div>
                    <div style="flex:1;">
                        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:3px;">
                            <span style="font-size:.75rem;font-weight:700;color:#1e293b;">${fmtDate(f.date)}</span>
                            <span class="badge" style="background:${fsc.bg};color:${fsc.color};">${fsc.label}</span>
                        </div>
                        <p style="font-size:.82rem;color:#475569;line-height:1.5;">${f.note}</p>
                        ${f.nextDate ? `<p style="font-size:.72rem;color:#94a3b8;margin-top:3px;">
                            <i class="fas fa-calendar" style="margin-right:3px;"></i>Next: ${fmtDate(f.nextDate)}</p>` : ''}
                    </div>
                </div>`;
            }).join('')}
        </div>`
    : '<div style="margin-top:12px;padding:12px;background:#f8fafc;border-radius:8px;text-align:center;font-size:.82rem;color:#94a3b8;"><i class="fas fa-comments" style="display:block;font-size:1.2rem;margin-bottom:4px;"></i>No follow-ups yet</div>';
    
    document.getElementById('viewContent').innerHTML = `
        ${userInfoHtml}
        <div style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:14px;">
            <span class="badge" style="background:${sc.bg};color:${sc.color};">
                <i class="fas ${sc.icon}" style="margin-right:4px;"></i>${sc.label}
            </span>
            <span class="badge badge-class">${clsLabel}${secLabel}</span>
            <span class="badge badge-year">${inq.academicYear}</span>
            <span class="badge" style="background:#f1f5f9;color:#475569;">
                <i class="fas fa-${sourceIcon(inq.source)}" style="margin-right:4px;"></i>${SOURCE_LABELS[inq.source] || inq.source}
            </span>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:14px;">
            <div style="background:#f8fafc;border-radius:10px;padding:12px;border:1px solid #e2e8f0;">
                <p style="font-size:.7rem;font-weight:700;color:#2563eb;text-transform:uppercase;letter-spacing:.05em;margin-bottom:8px;">
                    <i class="fas fa-user-graduate" style="margin-right:5px;"></i>Student
                </p>
                <div style="font-size:.82rem;line-height:2;color:#334155;">
                    <div><b>Name:</b> ${inq.studentName}</div>
                    <div><b>DOB:</b> ${inq.dob ? fmtDateFull(inq.dob) : '—'}</div>
                    <div><b>Prev. School:</b> ${inq.prevSchool || '—'}</div>
                    <div><b>Prev. Class:</b> ${inq.prevClass || '—'}</div>
                </div>
            </div>
            <div style="background:#f8fafc;border-radius:10px;padding:12px;border:1px solid #e2e8f0;">
                <p style="font-size:.7rem;font-weight:700;color:#7c3aed;text-transform:uppercase;letter-spacing:.05em;margin-bottom:8px;">
                    <i class="fas fa-users" style="margin-right:5px;"></i>Parent
                </p>
                <div style="font-size:.82rem;line-height:2;color:#334155;">
                    <div><b>Father:</b> ${inq.fatherName || '—'}</div>
                    <div><b>Mother:</b> ${inq.motherName || '—'}</div>
                    <div><b>Phone:</b> <a href="tel:${inq.phone}" style="color:#2563eb;">${inq.phone}</a></div>
                    <div><b>Email:</b> ${inq.email || '—'}</div>
                </div>
            </div>
        </div>
        ${inq.address ? '<div style="background:#f8fafc;border-radius:8px;padding:10px 12px;margin-bottom:12px;font-size:.82rem;color:#475569;"><i class="fas fa-map-marker-alt" style="margin-right:6px;color:#94a3b8;"></i>' + inq.address + '</div>' : ''}
        ${inq.remarks ? '<div style="background:#fffbeb;border:1px solid #fde68a;border-radius:8px;padding:12px;margin-bottom:12px;font-size:.85rem;color:#92400e;line-height:1.6;"><i class="fas fa-sticky-note" style="margin-right:6px;"></i><b>Remarks:</b> ' + inq.remarks + '</div>' : ''}
        ${inq.nextFollowup ? '<div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:10px 12px;margin-bottom:12px;font-size:.82rem;color:#166534;"><i class="fas fa-calendar-check" style="margin-right:6px;"></i><b>Next Follow-up:</b> ' + fmtDateFull(inq.nextFollowup) + (inq.assignedTo ? ' · Assigned to: <b>' + inq.assignedTo + '</b>' : '') + '</div>' : ''}
        ${timelineHtml}
    `;
    
    document.getElementById('viewAddFollowupBtn').onclick = () => { closeViewModal(); openFollowupModal(id); };
    const admitBtn = document.getElementById('viewAdmitBtn');
    admitBtn.style.display = inq.status === 'admitted' ? 'none' : '';
    admitBtn.onclick = async () => {
        await updateStatus(id, 'admitted');
        closeViewModal();
        await refreshAllData();
    };
    
    document.getElementById('viewModal').classList.remove('hidden');
}

function closeViewModal() { document.getElementById('viewModal').classList.add('hidden'); }

function openFollowupModal(id) {
    document.getElementById('followupInquiryId').value = id;
    document.getElementById('followupDate').value = new Date().toISOString().split('T')[0];
    document.getElementById('followupStatus').value = 'follow_up';
    document.getElementById('followupNote').value = '';
    document.getElementById('followupNextDate').value = new Date(Date.now() + 7*24*60*60*1000).toISOString().split('T')[0];
    document.getElementById('followupModal').classList.remove('hidden');
}

function closeFollowupModal() { document.getElementById('followupModal').classList.add('hidden'); }

async function saveFollowup() {
    const id = document.getElementById('followupInquiryId').value;
    const note = document.getElementById('followupNote').value.trim();
    if (!note) { showToast('Please enter a follow-up note.', true); return; }
    
    const data = {
        date: document.getElementById('followupDate').value,
        note: note,
        status: document.getElementById('followupStatus').value,
        nextDate: document.getElementById('followupNextDate').value
    };
    
    const result = await addFollowUp(id, data);
    if (result) {
        closeFollowupModal();
        await refreshAllData();
    }
}

function openStatusModal(id) {
    const inq = inquiries.find(x => x.inquiryId === id);
    if (!inq) return;
    
    document.getElementById('statusModalId').value = id;
    document.getElementById('statusModalName').textContent =
        `Student: ${inq.studentName} (${inq.inquiryId}) · Current: ${STATUS_CONFIG[inq.status]?.label || inq.status}`;
    
    document.getElementById('statusOptions').innerHTML =
        Object.entries(STATUS_CONFIG).map(([val, cfg]) => `
            <button onclick="quickUpdateStatus('${id}','${val}')"
                style="display:flex;align-items:center;gap:10px;padding:10px 14px;border-radius:8px;
                       border:2px solid ${inq.status === val ? cfg.color : '#e2e8f0'};
                       background:${inq.status === val ? cfg.bg : '#fff'};
                       cursor:pointer;font-family:inherit;font-size:.85rem;font-weight:600;
                       color:${inq.status === val ? cfg.color : '#475569'};
                       transition:all .15s;width:100%;text-align:left;">
                <i class="fas ${cfg.icon}" style="color:${cfg.color};width:16px;"></i>
                ${cfg.label}
                ${inq.status === val ? '<span style="margin-left:auto;font-size:.7rem;">✓ Current</span>' : ''}
            </button>`
        ).join('');
    
    document.getElementById('statusModal').classList.remove('hidden');
}

async function quickUpdateStatus(id, newStatus) {
    const result = await updateStatus(id, newStatus);
    if (result) {
        closeStatusModal();
        await refreshAllData();
    }
}

function closeStatusModal() { document.getElementById('statusModal').classList.add('hidden'); }

function openDeleteModal(id) { currentDeleteId = id; document.getElementById('deleteModal').classList.remove('hidden'); }
function closeDeleteModal() { document.getElementById('deleteModal').classList.add('hidden'); currentDeleteId = null; }

async function confirmDelete() {
    if (currentDeleteId) {
        const success = await deleteInquiry(currentDeleteId);
        if (success) {
            closeDeleteModal();
            await refreshAllData();
        }
    }
}

// =====================================================
// YEAR MODAL FUNCTIONS
// =====================================================

function openAddYearModal() {
    const cy = new Date().getFullYear();
    const suggestion = `${cy + 1}-${cy + 2}`;
    document.getElementById('addYearInput').value = suggestion;
    document.getElementById('addYearError').textContent = '';
    document.getElementById('addYearModal').classList.remove('hidden');
    setTimeout(() => {
        const inp = document.getElementById('addYearInput');
        if (inp) inp.focus();
    }, 100);
}

function closeAddYearModal() {
    document.getElementById('addYearModal').classList.add('hidden');
}

function confirmAddYear() {
    const val = document.getElementById('addYearInput').value.trim();
    if (!val) {
        document.getElementById('addYearError').textContent = 'Please enter a year';
        return;
    }
    if (!/^\d{4}-\d{4}$/.test(val)) {
        document.getElementById('addYearError').textContent = 'Format must be YYYY-YYYY (e.g. 2028-2029)';
        return;
    }
    const [s, e] = val.split('-').map(Number);
    if (e !== s + 1) {
        document.getElementById('addYearError').textContent = 'End year must be start year + 1';
        return;
    }
    if (academicYearsList.find(a => a.year === val)) {
        document.getElementById('addYearError').textContent = `${val} already exists`;
        return;
    }
    
    academicYearsList.push({ year: val, label: val });
    academicYearsList.sort((a, b) => parseYearStart(a.year) - parseYearStart(b.year));
    closeAddYearModal();
    populateYearChips();
    populateFormSelects();
    showToast(`Academic year ${val} added!`);
    selectYear(val);
}

// =====================================================
// UTILITY FUNCTIONS
// =====================================================

function sourceIcon(src) {
    const map = { walkin:'walking', phone:'phone', website:'globe', referral:'user-friends', social:'share-alt', advertisement:'ad' };
    return map[src] || 'question';
}

function fmtDate(dt) {
    if (!dt) return 'N/A';
    return new Date(dt).toLocaleDateString('en-IN', { day:'numeric', month:'short', year:'numeric' });
}

function fmtDateFull(dt) {
    if (!dt) return 'N/A';
    return new Date(dt).toLocaleDateString('en-IN', { day:'numeric', month:'long', year:'numeric', hour:'2-digit', minute:'2-digit' });
}

function showToast(msg, err = false) {
    const t = document.createElement('div');
    t.className = 'toast' + (err ? ' error' : '');
    t.innerHTML = `<i class="fas fa-${err ? 'exclamation-circle' : 'check-circle'}" style="color:${err ? '#ef4444' : '#10b981'};"></i> ${msg}`;
    document.getElementById('toastContainer').appendChild(t);
    setTimeout(() => t.remove(), 3200);
}

function outsideClick(e, id) {
    if (e.target.id === id) document.getElementById(id).classList.add('hidden');
}

// =====================================================
// EXPORT CSV
// =====================================================

function exportCSV() {
    const filtered = getFilteredInquiries();
    const headers = ['Inquiry ID', 'Name', 'Father', 'Phone', 'Email', 'Class', 'Section', 'Source', 'Status', 'Year', 'Follow-ups', 'Remarks', 'Date', 'Created By'];
    const rows = filtered.map(i =>
        [i.inquiryId, i.studentName, i.fatherName, i.phone, i.email,
         i.classApplied, i.sectionApplied, i.source, i.status,
         i.academicYear, (i.followups || []).length, i.remarks, i.createdAt,
         i.createdBy || '']
        .map(v => `"${(v || '').toString().replace(/"/g, '""')}"`)
        .join(',')
    );
    const csv = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `inquiries_${activeYear.replace(/\s/g, '_')}_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Exported as CSV!');
}

// =====================================================
// INITIALIZATION
// =====================================================

document.addEventListener('DOMContentLoaded', async () => {
    const currentDateEl = document.getElementById('currentDate');
    if (currentDateEl) {
        currentDateEl.textContent = new Date().toLocaleDateString('en-IN', {
            weekday: 'short', day: '2-digit', month: 'short', year: 'numeric'
        });
    }
    
    populateClassFilter();
    populateFormSelects();
    
    await refreshAllData();
    
    const today = new Date().toISOString().split('T')[0];
    const nextWeek = new Date(Date.now() + 7*24*60*60*1000).toISOString().split('T')[0];
    const nextFollowupEl = document.getElementById('nextFollowup');
    const followupDateEl = document.getElementById('followupDate');
    const followupNextDateEl = document.getElementById('followupNextDate');
    
    if (followupDateEl) followupDateEl.value = today;
    if (nextFollowupEl) nextFollowupEl.value = nextWeek;
    if (followupNextDateEl) followupNextDateEl.value = nextWeek;
});

// Make functions globally available
window.openCreateModal = openCreateModal;
window.openEditModal = openEditModal;
window.openViewModal = openViewModal;
window.closeViewModal = closeViewModal;
window.openFollowupModal = openFollowupModal;
window.closeFollowupModal = closeFollowupModal;
window.saveFollowup = saveFollowup;
window.openDeleteModal = openDeleteModal;
window.closeDeleteModal = closeDeleteModal;
window.confirmDelete = confirmDelete;
window.openStatusModal = openStatusModal;
window.quickUpdateStatus = quickUpdateStatus;
window.closeStatusModal = closeStatusModal;
window.selectYear = selectYear;
window.deleteYear = deleteYear;
window.openAddYearModal = openAddYearModal;
window.closeAddYearModal = closeAddYearModal;
window.confirmAddYear = confirmAddYear;
window.filterInquiries = filterInquiries;
window.clearFilters = clearFilters;
window.switchTab = switchTab;
window.exportCSV = exportCSV;
window.saveInquiry = saveInquiry;
window.closeModal = closeModal;
window.gotoPage = gotoPage;
window.populateModalSections = populateModalSections;