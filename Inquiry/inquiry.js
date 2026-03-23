// ══════════════════════════════════════════
//  CONFIG
// ══════════════════════════════════════════
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
    new:      { label:'New',       icon:'fa-star',         color:'#1e40af', bg:'#dbeafe' },
    followup: { label:'Follow-up', icon:'fa-redo',         color:'#854d0e', bg:'#fef9c3' },
    visited:  { label:'Visited',   icon:'fa-eye',          color:'#0369a1', bg:'#e0f2fe' },
    admitted: { label:'Admitted',  icon:'fa-check-circle', color:'#065f46', bg:'#d1fae5' },
    rejected: { label:'Rejected',  icon:'fa-times-circle', color:'#991b1b', bg:'#fee2e2' },
};
const SOURCE_LABELS = {
    walkin:'Walk-in', phone:'Phone', website:'Website',
    referral:'Referral', social:'Social Media', advertisement:'Advertisement'
};

// Generate academic years (current and past 3, future 1)
function generateAcademicYears() {
    const yrs = [];
    const cy = new Date().getFullYear();
    for (let y = cy - 2; y <= cy + 1; y++) {
        yrs.push(`${y}-${y+1}`);
    }
    return yrs;
}
const ACADEMIC_YEARS = generateAcademicYears();
const CURRENT_YEAR   = ACADEMIC_YEARS[ACADEMIC_YEARS.length - 2]; // current active

// ══════════════════════════════════════════
//  SAMPLE DATA
// ══════════════════════════════════════════
let inquiries = [
    { id:'1', studentName:'Arjun Sharma', fatherName:'Rajesh Sharma', motherName:'Sunita Sharma', phone:'9876543210', email:'rajesh@gmail.com', address:'12, MG Road, Pune', dob:'2015-06-15', classApplied:'5', sectionApplied:'A', prevSchool:'St. Mary School', prevClass:'Class 4', source:'walkin', academicYear:'2025-2026', status:'admitted', remarks:'Interested in sports facilities. Father is an engineer.', nextFollowup:'', assignedTo:'coordinator', createdAt:'2026-01-10', followups:[{ date:'2026-01-12', note:'Father visited school, took a tour.', status:'visited', nextDate:'2026-01-18' },{ date:'2026-01-18', note:'Documents submitted. Confirmed admission.', status:'admitted', nextDate:'' }] },
    { id:'2', studentName:'Priya Patel', fatherName:'Kiran Patel', motherName:'Meena Patel', phone:'9988776655', email:'kiran.patel@yahoo.com', address:'45, Shivaji Nagar, Pune', dob:'2017-03-22', classApplied:'3', sectionApplied:'B', prevSchool:'Sunrise School', prevClass:'Class 2', source:'phone', academicYear:'2026-2027', status:'followup', remarks:'Wants to know about fee structure and transport facility.', nextFollowup:'2026-03-25', assignedTo:'receptionist', createdAt:'2026-03-18', followups:[{ date:'2026-03-20', note:'Called back. Mother asked about school bus route.', status:'followup', nextDate:'2026-03-25' }] },
    { id:'3', studentName:'Rohit Deshmukh', fatherName:'Suresh Deshmukh', motherName:'Kavita Deshmukh', phone:'8877665544', email:'', address:'7, Deccan Gymkhana, Pune', dob:'2013-11-05', classApplied:'7', sectionApplied:'', prevSchool:'Cambridge School', prevClass:'Class 6', source:'referral', academicYear:'2026-2027', status:'new', remarks:'Referred by existing parent (Mrs. Joshi). Interested in science stream.', nextFollowup:'2026-03-22', assignedTo:'principal', createdAt:'2026-03-20', followups:[] },
    { id:'4', studentName:'Sneha Kulkarni', fatherName:'Mohan Kulkarni', motherName:'Asha Kulkarni', phone:'7766554433', email:'mohan.k@gmail.com', address:'89, Karve Road, Pune', dob:'2010-08-14', classApplied:'11', sectionApplied:'Science A', prevSchool:'City High School', prevClass:'Class 10', source:'website', academicYear:'2026-2027', status:'visited', remarks:'Looking for Science stream. Good marks in boards.', nextFollowup:'2026-03-28', assignedTo:'coordinator', createdAt:'2026-03-16', followups:[{ date:'2026-03-18', note:'Visited campus. Met with principal. Impressed with labs.', status:'visited', nextDate:'2026-03-28' }] },
    { id:'5', studentName:'Aditya Joshi', fatherName:'Prakash Joshi', motherName:'Lata Joshi', phone:'6655443322', email:'prakash.joshi@company.com', address:'33, Baner Road, Pune', dob:'2018-01-30', classApplied:'2', sectionApplied:'A', prevSchool:'', prevClass:'LKG', source:'social', academicYear:'2025-2026', status:'rejected', remarks:'Looking for Montessori style. Our curriculum did not match their requirement.', nextFollowup:'', assignedTo:'admin', createdAt:'2026-01-25', followups:[{ date:'2026-01-28', note:'Called back. Mother said they are looking for Montessori approach. We could not accommodate.', status:'rejected', nextDate:'' }] },
    { id:'6', studentName:'Tanvi Mehta', fatherName:'Nilesh Mehta', motherName:'Pooja Mehta', phone:'9900887766', email:'nilesh.mehta@abc.com', address:'21, Viman Nagar, Pune', dob:'2016-09-17', classApplied:'4', sectionApplied:'C', prevSchool:'DPS School', prevClass:'Class 3', source:'advertisement', academicYear:'2026-2027', status:'new', remarks:'Saw our newspaper advertisement. Interested in arts & craft activities.', nextFollowup:'2026-03-23', assignedTo:'receptionist', createdAt:'2026-03-19', followups:[] },
];

let currentDeleteId  = null;
let currentViewId    = null;
let currentPage      = 1;
let currentTab       = 'all';
let activeYear       = CURRENT_YEAR;
const PER_PAGE       = 8;

// ══════════════════════════════════════════
//  INIT
// ══════════════════════════════════════════
document.addEventListener('DOMContentLoaded', () => {
    populateYearChips();
    populateClassFilter();
    populateFormSelects();
    renderInquiries();
    updateStats();
    updateClassSummary();
    updateNotifBadge();

    // Set default dates in form
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('followupDate').value = today;
    const nextWeek = new Date(Date.now() + 7*24*60*60*1000).toISOString().split('T')[0];
    document.getElementById('nextFollowup').value = nextWeek;
    document.getElementById('followupNextDate').value = nextWeek;
});

function populateYearChips() {
    const container = document.getElementById('yearChips');
    const allYears = ['All', ...ACADEMIC_YEARS];
    container.innerHTML = allYears.map(y => `
        <span class="year-chip ${y === activeYear ? 'active' : ''}" onclick="selectYear('${y}')">${y}</span>
    `).join('');
}

function selectYear(y) {
    activeYear = y;
    populateYearChips();
    currentPage = 1;
    renderInquiries();
    updateStats();
    updateClassSummary();
}

function populateClassFilter() {
    const sel = document.getElementById('classFilter');
    sel.innerHTML = '<option value="all">All Classes</option>' +
        CLASSES.map(c => `<option value="${c}">Class ${c}</option>`).join('');
}

function populateFormSelects() {
    // Class select in modal
    const classEl = document.getElementById('classApplied');
    classEl.innerHTML = '<option value="">-- Select Class --</option>' +
        CLASSES.map(c => `<option value="${c}">Class ${c}</option>`).join('');

    // Academic years in modal
    const yearEl = document.getElementById('academicYear');
    yearEl.innerHTML = ACADEMIC_YEARS.map(y =>
        `<option value="${y}" ${y === CURRENT_YEAR ? 'selected' : ''}>${y}</option>`
    ).join('');
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

// ══════════════════════════════════════════
//  STATS
// ══════════════════════════════════════════
function updateStats() {
    const filtered = getYearFiltered();
    document.getElementById('statTotal').textContent    = filtered.length;
    document.getElementById('statNew').textContent      = filtered.filter(i=>i.status==='new').length;
    document.getElementById('statFollowup').textContent = filtered.filter(i=>i.status==='followup').length;
    document.getElementById('statVisited').textContent  = filtered.filter(i=>i.status==='visited').length;
    document.getElementById('statAdmitted').textContent = filtered.filter(i=>i.status==='admitted').length;
    document.getElementById('statRejected').textContent = filtered.filter(i=>i.status==='rejected').length;

    // Conversion rate
    const total    = filtered.length;
    const admitted = filtered.filter(i=>i.status==='admitted').length;
    const rate     = total > 0 ? Math.round((admitted/total)*100) : 0;
    document.getElementById('conversionRate').textContent = rate + '%';

    // Follow-up notifications (due today or overdue)
    updateNotifBadge();
}

function updateNotifBadge() {
    const today = new Date().toISOString().split('T')[0];
    const due = inquiries.filter(i => i.nextFollowup && i.nextFollowup <= today && !['admitted','rejected'].includes(i.status));
    document.getElementById('notifBadge').textContent = due.length;

    const list = document.getElementById('notifList');
    if (!due.length) {
        list.innerHTML = '<div style="padding:16px;text-align:center;color:#94a3b8;font-size:.85rem;">No follow-ups due today</div>';
        return;
    }
    list.innerHTML = due.slice(0,5).map(i => `
        <div class="p-4 border-b border-gray-100 hover:bg-gray-50 cursor-pointer" onclick="openViewModal('${i.id}');toggleNotifications();">
            <div class="flex items-start space-x-3">
                <div class="h-10 w-10 bg-yellow-50 rounded-full flex items-center justify-center flex-shrink-0">
                    <i class="fas fa-redo text-yellow-500"></i>
                </div>
                <div>
                    <p class="font-semibold text-gray-800 text-sm">${i.studentName}</p>
                    <p class="text-xs text-gray-600">Follow-up due: ${fmtDate(i.nextFollowup)} · Class ${i.classApplied}</p>
                </div>
            </div>
        </div>
    `).join('');
}

// ══════════════════════════════════════════
//  CLASS-WISE SUMMARY
// ══════════════════════════════════════════
function updateClassSummary() {
    const filtered = getYearFiltered();
    document.getElementById('classSummaryYear').textContent = activeYear === 'All' ? 'All Years' : `Year: ${activeYear}`;

    const classMap = {};
    filtered.forEach(i => {
        const cls = i.classApplied || 'Unknown';
        if (!classMap[cls]) classMap[cls] = { total:0, admitted:0, followup:0, rejected:0 };
        classMap[cls].total++;
        if (i.status === 'admitted') classMap[cls].admitted++;
        if (i.status === 'followup') classMap[cls].followup++;
        if (i.status === 'rejected') classMap[cls].rejected++;
    });

    const grid = document.getElementById('classSummaryGrid');
    const keys = Object.keys(classMap).sort((a,b) => CLASSES.indexOf(a) - CLASSES.indexOf(b));

    if (!keys.length) {
        grid.innerHTML = '<div style="color:#94a3b8;font-size:.85rem;padding:8px;">No data for selected year.</div>';
        return;
    }

    grid.innerHTML = keys.map(cls => {
        const d = classMap[cls];
        const rate = d.total > 0 ? Math.round((d.admitted/d.total)*100) : 0;
        const clsLabel = CLASSES.includes(cls) ? `Class ${cls}` : cls;
        return `
        <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:12px;">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
                <span style="font-size:.8rem;font-weight:700;color:#1e293b;">${clsLabel}</span>
                <span class="badge badge-class">${d.total} inquiries</span>
            </div>
            <div style="display:flex;gap:6px;margin-bottom:8px;flex-wrap:wrap;">
                <span style="font-size:.7rem;color:#059669;font-weight:600;"><i class="fas fa-check" style="margin-right:3px;"></i>${d.admitted} Admitted</span>
                <span style="font-size:.7rem;color:#d97706;font-weight:600;"><i class="fas fa-redo" style="margin-right:3px;"></i>${d.followup} Follow-up</span>
            </div>
            <div class="progress-bar">
                <div class="progress-fill" style="width:${rate}%;background:${rate>=50?'#10b981':'#f59e0b'};"></div>
            </div>
            <div style="font-size:.7rem;color:#64748b;margin-top:4px;">${rate}% conversion</div>
        </div>`;
    }).join('');
}

// ══════════════════════════════════════════
//  FILTER + RENDER
// ══════════════════════════════════════════
function getYearFiltered() {
    if (activeYear === 'All') return inquiries;
    return inquiries.filter(i => i.academicYear === activeYear);
}

function getFilteredInquiries() {
    const q   = document.getElementById('searchInput').value.toLowerCase();
    const st  = document.getElementById('statusFilter').value;
    const cls = document.getElementById('classFilter').value;
    const src = document.getElementById('sourceFilter').value;

    return inquiries.filter(i => {
        if (activeYear !== 'All' && i.academicYear !== activeYear) return false;
        if (currentTab !== 'all' && i.status !== currentTab) return false;
        if (q && !i.studentName.toLowerCase().includes(q) && !i.fatherName.toLowerCase().includes(q) && !i.phone.includes(q) && !i.email.toLowerCase().includes(q)) return false;
        if (st  !== 'all' && i.status !== st) return false;
        if (cls !== 'all' && i.classApplied !== cls) return false;
        if (src !== 'all' && i.source !== src) return false;
        return true;
    });
}

function renderInquiries() {
    const filtered = getFilteredInquiries();
    const total    = filtered.length;
    const start    = (currentPage-1)*PER_PAGE;
    const end      = Math.min(start+PER_PAGE, total);
    const page     = filtered.slice(start, end);

    document.getElementById('startCount').textContent = total ? start+1 : 0;
    document.getElementById('endCount').textContent   = end;
    document.getElementById('totalCount').textContent = total;
    renderPagination(total);

    const tbody = document.getElementById('inquiryTableBody');
    if (!page.length) {
        tbody.innerHTML = `<tr><td colspan="9" style="text-align:center;padding:40px;color:#94a3b8;">
            <i class="fas fa-inbox" style="font-size:2rem;display:block;margin-bottom:8px;"></i>No inquiries found
        </td></tr>`;
        return;
    }

    const today = new Date().toISOString().split('T')[0];
    tbody.innerHTML = page.map((i, idx) => {
        const sc   = STATUS_CONFIG[i.status] || STATUS_CONFIG.new;
        const fups = i.followups ? i.followups.length : 0;
        const isOverdue = i.nextFollowup && i.nextFollowup < today && !['admitted','rejected'].includes(i.status);
        const clsLabel = CLASSES.includes(i.classApplied) ? `Class ${i.classApplied}` : i.classApplied;
        const secLabel = i.sectionApplied ? ` – ${i.sectionApplied}` : '';

        return `<tr>
            <td style="color:#94a3b8;font-size:.78rem;">${start+idx+1}</td>
            <td>
                <div style="font-weight:600;color:#1e293b;">${i.studentName}</div>
                <div style="font-size:.75rem;color:#64748b;">${i.fatherName || '—'} · ${i.phone}</div>
            </td>
            <td>
                <span class="badge badge-class">${clsLabel}${secLabel}</span>
            </td>
            <td>
                <span style="font-size:.78rem;color:#475569;"><i class="fas fa-${sourceIcon(i.source)}" style="margin-right:4px;color:#94a3b8;"></i>${SOURCE_LABELS[i.source]||i.source}</span>
            </td>
            <td>
                <span class="status-pill" style="background:${sc.bg};color:${sc.color};" onclick="openStatusModal('${i.id}')" title="Click to change status">
                    <i class="fas ${sc.icon}"></i>${sc.label}
                    <i class="fas fa-chevron-down" style="font-size:.55rem;opacity:.6;"></i>
                </span>
            </td>
            <td>
                <span style="font-size:.8rem;font-weight:600;color:${fups>0?'#7c3aed':'#94a3b8'};">
                    <i class="fas fa-comments" style="margin-right:4px;"></i>${fups}
                </span>
                ${isOverdue ? '<span class="badge" style="background:#fee2e2;color:#991b1b;margin-left:4px;">Overdue</span>' : ''}
            </td>
            <td><span class="badge badge-year">${i.academicYear}</span></td>
            <td style="font-size:.78rem;color:#64748b;">${fmtDate(i.createdAt)}</td>
            <td>
                <button class="action-btn view" onclick="openViewModal('${i.id}')" title="View Details"><i class="fas fa-eye"></i></button>
                <button class="action-btn edit" onclick="openEditModal('${i.id}')" title="Edit"><i class="fas fa-edit"></i></button>
                <button class="action-btn fup"  onclick="openFollowupModal('${i.id}')" title="Add Follow-up"><i class="fas fa-redo"></i></button>
                <button class="action-btn del"  onclick="openDeleteModal('${i.id}')" title="Delete"><i class="fas fa-trash"></i></button>
            </td>
        </tr>`;
    }).join('');
}

function sourceIcon(src) {
    const map = { walkin:'walking', phone:'phone', website:'globe', referral:'user-friends', social:'share-alt', advertisement:'ad' };
    return map[src] || 'question';
}

function renderPagination(total) {
    const pages = Math.ceil(total/PER_PAGE);
    if (pages <= 1) { document.getElementById('paginationControls').innerHTML = ''; return; }
    let html = `<button onclick="gotoPage(${currentPage-1})" ${currentPage===1?'disabled':''} style="width:30px;height:30px;border-radius:6px;border:1px solid #e2e8f0;background:#fff;cursor:pointer;font-size:.75rem;${currentPage===1?'opacity:.4;':''}">&lsaquo;</button>`;
    for (let p=1;p<=pages;p++) {
        html += `<button onclick="gotoPage(${p})" style="width:30px;height:30px;border-radius:6px;border:1px solid ${p===currentPage?'#2563eb':'#e2e8f0'};background:${p===currentPage?'#2563eb':'#fff'};color:${p===currentPage?'#fff':'#475569'};cursor:pointer;font-size:.75rem;">${p}</button>`;
    }
    html += `<button onclick="gotoPage(${currentPage+1})" ${currentPage===pages?'disabled':''} style="width:30px;height:30px;border-radius:6px;border:1px solid #e2e8f0;background:#fff;cursor:pointer;font-size:.75rem;${currentPage===pages?'opacity:.4;':''}">&rsaquo;</button>`;
    document.getElementById('paginationControls').innerHTML = html;
}

function gotoPage(p) {
    const total = getFilteredInquiries().length;
    const maxP  = Math.ceil(total/PER_PAGE);
    if (p<1||p>maxP) return;
    currentPage = p;
    renderInquiries();
}

function switchTab(tab) {
    currentTab = tab; currentPage = 1;
    ['all','new','followup','visited','admitted','rejected'].forEach(t => {
        const key = 'tab' + t.charAt(0).toUpperCase() + t.slice(1);
        const el  = document.getElementById(key);
        if (el) el.classList.toggle('active', t===tab);
    });
    renderInquiries();
}

function filterInquiries() { currentPage=1; renderInquiries(); }
function clearFilters() {
    document.getElementById('searchInput').value = '';
    ['statusFilter','classFilter','sourceFilter'].forEach(id => document.getElementById(id).value='all');
    filterInquiries();
}

// ══════════════════════════════════════════
//  CREATE / EDIT
// ══════════════════════════════════════════
function openCreateModal() {
    document.getElementById('modalTitle').textContent = 'New Inquiry';
    document.getElementById('inquiryForm').reset();
    document.getElementById('inquiryId').value = '';
    document.getElementById('sectionApplied').innerHTML = '<option value="">-- Any Section --</option>';

    // Default next followup = tomorrow
    const tomorrow = new Date(Date.now()+24*60*60*1000).toISOString().split('T')[0];
    document.getElementById('nextFollowup').value = tomorrow;

    // Set academic year default
    document.getElementById('academicYear').value = activeYear !== 'All' ? activeYear : CURRENT_YEAR;

    document.getElementById('inquiryModal').classList.remove('hidden');
}

function openEditModal(id) {
    const inq = inquiries.find(x=>x.id===id);
    if (!inq) return;

    document.getElementById('modalTitle').textContent = 'Edit Inquiry';
    document.getElementById('inquiryId').value     = inq.id;
    document.getElementById('studentName').value   = inq.studentName;
    document.getElementById('dob').value           = inq.dob;
    document.getElementById('classApplied').value  = inq.classApplied;
    populateModalSections();
    document.getElementById('sectionApplied').value = inq.sectionApplied;
    document.getElementById('prevSchool').value     = inq.prevSchool;
    document.getElementById('prevClass').value      = inq.prevClass;
    document.getElementById('fatherName').value     = inq.fatherName;
    document.getElementById('motherName').value     = inq.motherName;
    document.getElementById('phone').value          = inq.phone;
    document.getElementById('email').value          = inq.email;
    document.getElementById('address').value        = inq.address;
    document.getElementById('source').value         = inq.source;
    document.getElementById('academicYear').value   = inq.academicYear;
    document.getElementById('status').value         = inq.status;
    document.getElementById('remarks').value        = inq.remarks;
    document.getElementById('nextFollowup').value   = inq.nextFollowup;
    document.getElementById('assignedTo').value     = inq.assignedTo;

    document.getElementById('inquiryModal').classList.remove('hidden');
}

function closeModal() { document.getElementById('inquiryModal').classList.add('hidden'); }

function saveInquiry(e) {
    e.preventDefault();
    const id = document.getElementById('inquiryId').value;
    const data = {
        id: id || Date.now().toString(),
        studentName:   document.getElementById('studentName').value,
        dob:           document.getElementById('dob').value,
        classApplied:  document.getElementById('classApplied').value,
        sectionApplied:document.getElementById('sectionApplied').value,
        prevSchool:    document.getElementById('prevSchool').value,
        prevClass:     document.getElementById('prevClass').value,
        fatherName:    document.getElementById('fatherName').value,
        motherName:    document.getElementById('motherName').value,
        phone:         document.getElementById('phone').value,
        email:         document.getElementById('email').value,
        address:       document.getElementById('address').value,
        source:        document.getElementById('source').value,
        academicYear:  document.getElementById('academicYear').value,
        status:        document.getElementById('status').value,
        remarks:       document.getElementById('remarks').value,
        nextFollowup:  document.getElementById('nextFollowup').value,
        assignedTo:    document.getElementById('assignedTo').value,
        createdAt:     new Date().toISOString().split('T')[0],
        followups:     id ? (inquiries.find(x=>x.id===id)||{}).followups||[] : [],
    };

    if (id) {
        const idx = inquiries.findIndex(x=>x.id===id);
        if (idx !== -1) inquiries[idx] = data;
        showToast('Inquiry updated!');
    } else {
        inquiries.unshift(data);
        showToast('Inquiry added!');
    }

    closeModal();
    renderInquiries();
    updateStats();
    updateClassSummary();
}

// ══════════════════════════════════════════
//  VIEW MODAL
// ══════════════════════════════════════════
function openViewModal(id) {
    const inq = inquiries.find(x=>x.id===id);
    if (!inq) return;
    currentViewId = id;

    const sc  = STATUS_CONFIG[inq.status] || STATUS_CONFIG.new;
    const cls = CLASSES.includes(inq.classApplied) ? `Class ${inq.classApplied}` : inq.classApplied;
    const sec = inq.sectionApplied ? ` – ${inq.sectionApplied}` : '';

    document.getElementById('viewTitle').textContent = inq.studentName + ' — Inquiry';

    const timelineHtml = (inq.followups||[]).length > 0 ? `
        <div style="margin-top:16px;">
            <p style="font-size:.78rem;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:.05em;margin-bottom:10px;">
                <i class="fas fa-history" style="margin-right:5px;color:#7c3aed;"></i>Follow-up History (${inq.followups.length})
            </p>
            ${inq.followups.map((f,idx) => {
                const fsc = STATUS_CONFIG[f.status]||STATUS_CONFIG.new;
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
                        ${f.nextDate ? `<p style="font-size:.72rem;color:#94a3b8;margin-top:3px;"><i class="fas fa-calendar" style="margin-right:3px;"></i>Next: ${fmtDate(f.nextDate)}</p>` : ''}
                    </div>
                </div>`;
            }).join('')}
        </div>` : `<div style="margin-top:12px;padding:12px;background:#f8fafc;border-radius:8px;text-align:center;font-size:.82rem;color:#94a3b8;"><i class="fas fa-comments" style="display:block;font-size:1.2rem;margin-bottom:4px;"></i>No follow-ups yet</div>`;

    document.getElementById('viewContent').innerHTML = `
        <div style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:14px;">
            <span class="badge" style="background:${sc.bg};color:${sc.color};"><i class="fas ${sc.icon}" style="margin-right:4px;"></i>${sc.label}</span>
            <span class="badge badge-class">${cls}${sec}</span>
            <span class="badge badge-year">${inq.academicYear}</span>
            <span class="badge" style="background:#f1f5f9;color:#475569;"><i class="fas fa-${sourceIcon(inq.source)}" style="margin-right:4px;"></i>${SOURCE_LABELS[inq.source]||inq.source}</span>
        </div>

        <!-- Student & Parent Info Grid -->
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:14px;">
            <div style="background:#f8fafc;border-radius:10px;padding:12px;border:1px solid #e2e8f0;">
                <p style="font-size:.7rem;font-weight:700;color:#2563eb;text-transform:uppercase;letter-spacing:.05em;margin-bottom:8px;"><i class="fas fa-user-graduate" style="margin-right:5px;"></i>Student</p>
                <div style="font-size:.82rem;line-height:2;color:#334155;">
                    <div><b>Name:</b> ${inq.studentName}</div>
                    <div><b>DOB:</b> ${inq.dob ? fmtDateFull(inq.dob) : '—'}</div>
                    <div><b>Prev. School:</b> ${inq.prevSchool||'—'}</div>
                    <div><b>Prev. Class:</b> ${inq.prevClass||'—'}</div>
                </div>
            </div>
            <div style="background:#f8fafc;border-radius:10px;padding:12px;border:1px solid #e2e8f0;">
                <p style="font-size:.7rem;font-weight:700;color:#7c3aed;text-transform:uppercase;letter-spacing:.05em;margin-bottom:8px;"><i class="fas fa-users" style="margin-right:5px;"></i>Parent</p>
                <div style="font-size:.82rem;line-height:2;color:#334155;">
                    <div><b>Father:</b> ${inq.fatherName||'—'}</div>
                    <div><b>Mother:</b> ${inq.motherName||'—'}</div>
                    <div><b>Phone:</b> <a href="tel:${inq.phone}" style="color:#2563eb;">${inq.phone}</a></div>
                    <div><b>Email:</b> ${inq.email||'—'}</div>
                </div>
            </div>
        </div>

        ${inq.address ? `<div style="background:#f8fafc;border-radius:8px;padding:10px 12px;margin-bottom:12px;font-size:.82rem;color:#475569;"><i class="fas fa-map-marker-alt" style="margin-right:6px;color:#94a3b8;"></i>${inq.address}</div>` : ''}

        ${inq.remarks ? `<div style="background:#fffbeb;border:1px solid #fde68a;border-radius:8px;padding:12px;margin-bottom:12px;font-size:.85rem;color:#92400e;line-height:1.6;"><i class="fas fa-sticky-note" style="margin-right:6px;"></i><b>Remarks:</b> ${inq.remarks}</div>` : ''}

        ${inq.nextFollowup ? `<div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:10px 12px;margin-bottom:12px;font-size:.82rem;color:#166534;"><i class="fas fa-calendar-check" style="margin-right:6px;"></i><b>Next Follow-up:</b> ${fmtDateFull(inq.nextFollowup)} ${inq.assignedTo ? '· Assigned to: <b>'+inq.assignedTo+'</b>' : ''}</div>` : ''}

        ${timelineHtml}
    `;

    document.getElementById('viewAddFollowupBtn').onclick = () => { closeViewModal(); openFollowupModal(id); };
    document.getElementById('viewAdmitBtn').style.display = inq.status === 'admitted' ? 'none' : '';
    document.getElementById('viewAdmitBtn').onclick = () => {
        quickUpdateStatus(id, 'admitted');
        closeViewModal();
    };

    document.getElementById('viewModal').classList.remove('hidden');
}
function closeViewModal() { document.getElementById('viewModal').classList.add('hidden'); }

// ══════════════════════════════════════════
//  FOLLOW-UP MODAL
// ══════════════════════════════════════════
function openFollowupModal(id) {
    const inq = inquiries.find(x=>x.id===id);
    if (!inq) return;

    document.getElementById('followupInquiryId').value = id;
    document.getElementById('followupDate').value = new Date().toISOString().split('T')[0];
    document.getElementById('followupStatus').value = inq.status === 'new' ? 'followup' : inq.status;
    document.getElementById('followupNote').value = '';
    document.getElementById('followupNextDate').value = new Date(Date.now()+7*24*60*60*1000).toISOString().split('T')[0];

    document.getElementById('followupModal').classList.remove('hidden');
}
function closeFollowupModal() { document.getElementById('followupModal').classList.add('hidden'); }

function saveFollowup() {
    const id   = document.getElementById('followupInquiryId').value;
    const note = document.getElementById('followupNote').value.trim();
    if (!note) { showToast('Please enter a follow-up note.', true); return; }

    const idx = inquiries.findIndex(x=>x.id===id);
    if (idx === -1) return;

    const newFollowup = {
        date:     document.getElementById('followupDate').value,
        note,
        status:   document.getElementById('followupStatus').value,
        nextDate: document.getElementById('followupNextDate').value,
    };

    if (!inquiries[idx].followups) inquiries[idx].followups = [];
    inquiries[idx].followups.push(newFollowup);
    inquiries[idx].status      = newFollowup.status;
    inquiries[idx].nextFollowup = newFollowup.nextDate;

    closeFollowupModal();
    renderInquiries();
    updateStats();
    updateClassSummary();
    showToast('Follow-up saved & status updated!');
}

// ══════════════════════════════════════════
//  STATUS QUICK MODAL
// ══════════════════════════════════════════
function openStatusModal(id) {
    const inq = inquiries.find(x=>x.id===id);
    if (!inq) return;

    document.getElementById('statusModalId').value = id;
    document.getElementById('statusModalName').textContent = `Student: ${inq.studentName} · Current: ${STATUS_CONFIG[inq.status]?.label||inq.status}`;

    const opts = document.getElementById('statusOptions');
    opts.innerHTML = Object.entries(STATUS_CONFIG).map(([val, cfg]) => `
        <button onclick="quickUpdateStatus('${id}','${val}')" style="
            display:flex;align-items:center;gap:10px;padding:10px 14px;border-radius:8px;
            border:2px solid ${inq.status===val?cfg.color:'#e2e8f0'};
            background:${inq.status===val?cfg.bg:'#fff'};
            cursor:pointer;font-family:inherit;font-size:.85rem;font-weight:600;
            color:${inq.status===val?cfg.color:'#475569'};
            transition:all .15s;width:100%;text-align:left;">
            <i class="fas ${cfg.icon}" style="color:${cfg.color};width:16px;"></i>
            ${cfg.label}
            ${inq.status===val ? '<span style="margin-left:auto;font-size:.7rem;">✓ Current</span>' : ''}
        </button>
    `).join('');

    document.getElementById('statusModal').classList.remove('hidden');
}

function quickUpdateStatus(id, newStatus) {
    const idx = inquiries.findIndex(x=>x.id===id);
    if (idx === -1) return;

    const old = inquiries[idx].status;
    inquiries[idx].status = newStatus;

    // Auto-add a follow-up log entry for this status change
    if (!inquiries[idx].followups) inquiries[idx].followups = [];
    inquiries[idx].followups.push({
        date:    new Date().toISOString().split('T')[0],
        note:    `Status changed from "${STATUS_CONFIG[old]?.label||old}" to "${STATUS_CONFIG[newStatus]?.label||newStatus}"`,
        status:  newStatus,
        nextDate: '',
    });

    closeStatusModal();
    renderInquiries();
    updateStats();
    updateClassSummary();
    showToast(`Status updated to ${STATUS_CONFIG[newStatus]?.label||newStatus}!`);
}

function closeStatusModal() { document.getElementById('statusModal').classList.add('hidden'); }

// ══════════════════════════════════════════
//  DELETE
// ══════════════════════════════════════════
function openDeleteModal(id) { currentDeleteId=id; document.getElementById('deleteModal').classList.remove('hidden'); }
function closeDeleteModal()  { document.getElementById('deleteModal').classList.add('hidden'); currentDeleteId=null; }
function confirmDelete() {
    inquiries = inquiries.filter(i=>i.id!==currentDeleteId);
    renderInquiries(); updateStats(); updateClassSummary();
    showToast('Inquiry deleted.');
    closeDeleteModal();
}

// ══════════════════════════════════════════
//  EXPORT CSV
// ══════════════════════════════════════════
function exportCSV() {
    const filtered = getFilteredInquiries();
    const headers  = ['Name','Father','Phone','Email','Class','Section','Source','Status','Year','Follow-ups','Remarks','Date'];
    const rows = filtered.map(i => [
        i.studentName, i.fatherName, i.phone, i.email,
        i.classApplied, i.sectionApplied, i.source, i.status,
        i.academicYear, (i.followups||[]).length, i.remarks, i.createdAt
    ].map(v => `"${(v||'').toString().replace(/"/g,'""')}"`).join(','));

    const csv  = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csv], {type:'text/csv'});
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `inquiries_${activeYear.replace('-','_')}_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Exported as CSV!');
}

// ══════════════════════════════════════════
//  UTILS
// ══════════════════════════════════════════
function fmtDate(dt) {
    if (!dt) return 'N/A';
    return new Date(dt).toLocaleDateString('en-IN', {day:'numeric',month:'short',year:'numeric'});
}
function fmtDateFull(dt) {
    if (!dt) return 'N/A';
    return new Date(dt).toLocaleDateString('en-IN', {day:'numeric',month:'long',year:'numeric'});
}
function showToast(msg, err=false) {
    const t = document.createElement('div');
    t.className = 'toast' + (err?' error':'');
    t.innerHTML = `<i class="fas fa-${err?'exclamation-circle':'check-circle'}" style="color:${err?'#ef4444':'#10b981'};"></i> ${msg}`;
    document.getElementById('toastContainer').appendChild(t);
    setTimeout(()=>t.remove(), 3000);
}
function outsideClick(e, id) {
    if (e.target.id === id) document.getElementById(id).classList.add('hidden');
}

// ══════════════════════════════════════════
//  SIDEBAR TOGGLE
// ══════════════════════════════════════════
let sidebarCollapsed = false;
function toggleSidebar() {
    const sidebar     = document.getElementById('sidebar');
    const mainContent = document.getElementById('mainContent');
    const icon        = document.getElementById('sidebarToggleIcon');

    if (window.innerWidth < 1024) {
        sidebar.classList.toggle('mobile-open');
        document.getElementById('sidebarOverlay').classList.toggle('active');
        return;
    }
    sidebarCollapsed = !sidebarCollapsed;
    if (sidebarCollapsed) {
        sidebar.style.width = '72px';
        mainContent.style.marginLeft = '72px';
        sidebar.querySelectorAll('.nav-text-orig, .pt-4').forEach(el=>el.style.opacity='0');
    } else {
        sidebar.style.width = '260px';
        mainContent.style.marginLeft = '260px';
        sidebar.querySelectorAll('.nav-text-orig, .pt-4').forEach(el=>el.style.opacity='1');
    }
}
function closeMobileSidebar() {
    document.getElementById('sidebar').classList.remove('mobile-open');
    document.getElementById('sidebarOverlay').classList.remove('active');
}
function toggleNotifications() {
    document.getElementById('notificationsDropdown').classList.toggle('hidden');
    document.getElementById('userMenuDropdown').classList.add('hidden');
}
function toggleUserMenu() {
    document.getElementById('userMenuDropdown').classList.toggle('hidden');
    document.getElementById('notificationsDropdown').classList.add('hidden');
}
document.addEventListener('click', function(e) {
    if (!e.target.closest('#notificationsBtn')) document.getElementById('notificationsDropdown').classList.add('hidden');
    if (!e.target.closest('#userMenuBtn'))       document.getElementById('userMenuDropdown').classList.add('hidden');
});
window.addEventListener('resize', () => {
    if (window.innerWidth >= 1024) {
        document.getElementById('sidebarOverlay').classList.remove('active');
        document.getElementById('sidebar').classList.remove('mobile-open');
    }
});


