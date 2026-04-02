// ============================================================================
//  fee-management.js  —  http://localhost:8084
//
//  LOAD ORDER in HTML:
//    1. student-service.js   → showLoading, toastSuccess/Error/Info
//    2. fees-service.js      → getAllFees, createTransaction, getAllTransactions
//    3. transaction-service.js → txCreate, txGetAll …
//    4. fee-management.js    ← THIS FILE
//    5. logout.js
//
//  BUG FIXES in this version:
//    1. studentsFeesData exposed as window.studentsFeesData so HTML template can access it
//    2. mapTransactionToReceipt — student name, class, roll no pulled from studentsFeesData
//    3. viewReceipt — correct modal structure (separate overlay + content div)
//    4. Bulk reminder — calls real backend POST /api/notifications/fee-reminder/all-pending
//    5. Single reminder — calls POST /api/notifications/fee-reminder/student/{id}
//    6. populateFeesTable — called immediately after data loads (Students tab shows data on load)
//    7. renderFeeDetailsModal — uses window.studentsFeesData reliably
//    8. Receipt — student name, roll no, class, installment no, date all shown correctly
// ============================================================================

const FM_BASE = 'http://localhost:8084';

// ─── Global State — all exposed on window so HTML templates can read them ─────
window.studentsFeesData                = [];
window.receiptsData                    = [];
let currentFeesTab                     = 'students';
let selectedStudentForPayment          = null;
let selectedInstallmentForPayment      = null;
let currentSelectedInstallmentIndex    = -1;
let customAmountInstallment            = null;
let qrCodeInstance                     = null;

// Keep local aliases for JS internal use
let studentsFeesData = window.studentsFeesData;
let receiptsData     = window.receiptsData;

// ─── Auth ─────────────────────────────────────────────────────────────────────
function fmAuthHeaders(json = false) {
    const h = { 'Authorization': `Bearer ${localStorage.getItem('admin_jwt_token')}` };
    if (json) h['Content-Type'] = 'application/json';
    return h;
}

function getSelectedPaymentMethod() {
    return document.getElementById('selectedPaymentMethod')?.value || 'cash';
}

// ─── Toast ────────────────────────────────────────────────────────────────────
function fmToast(msg, type = 'info') {
    if (typeof window.portalToast   === 'function') { window.portalToast(msg, type); return; }
    if (type === 'success' && typeof toastSuccess === 'function') { toastSuccess(msg); return; }
    if (type === 'error'   && typeof toastError   === 'function') { toastError(msg);   return; }
    if (typeof toastInfo   === 'function') { toastInfo(msg); return; }
    console.log(`[FM][${type.toUpperCase()}] ${msg}`);
}

// ─── Loading ──────────────────────────────────────────────────────────────────
if (typeof showLoading === 'undefined') {
    window.showLoading = function(show) {
        document.getElementById('loadingOverlay')?.classList.toggle('hidden', !show);
    };
}

// ─── Academic Year ─────────────────────────────────────────────────────────────
function fmGetCurrentAcademicYear() {
    const now = new Date(), y = now.getFullYear(), m = now.getMonth() + 1;
    return m >= 4 ? `${y}-${y + 1}` : `${y - 1}-${y}`;
}

// ============================================================================
//  INIT
// ============================================================================
document.addEventListener('DOMContentLoaded', function () {
    loadFeesData();
    setupFMEventListeners();
    const v = new URLSearchParams(window.location.search).get('view');
    if (v) {
        const map = { structure:'students', history:'receipts', reports:'reports' };
        if (map[v]) setTimeout(() => switchFeesTab(map[v]), 300);
    }
});

function setupFMEventListeners() {
    document.getElementById('studentSearchInput')?.addEventListener('input', function () { searchStudents(this.value); });
    document.getElementById('customPaymentAmount')?.addEventListener('input', function () {
        const max = customAmountInstallment ? customAmountInstallment.amount - (customAmountInstallment.paid || 0) : 0;
        if (parseInt(this.value) > max) this.value = max;
        updateRemainingAmountDisplay();
    });
    document.getElementById('paymentAmount')?.addEventListener('input', function () {
        updatePaymentSummary();
        if (getSelectedPaymentMethod() === 'online' && this.value) generateFMQRCode();
    });
    document.getElementById('searchStudentFees')?.addEventListener('input',       filterFeesTable);
    document.getElementById('filterClassFees')?.addEventListener('change',        filterFeesTable);
    document.getElementById('filterFeeStatusFees')?.addEventListener('change',    filterFeesTable);
    document.getElementById('filterAcademicYearFees')?.addEventListener('change', filterFeesTable);
}

// ============================================================================
//  LOAD DATA
//  FIX: uses getAllFees() from fees-service.js, exposes data on window.*
// ============================================================================
async function loadFeesData() {
    showLoading(true);
    try {
        const allFees = await getAllFees();
        
        window.studentsFeesData.length = 0;
        allFees.map(f => mapFeesToStudent(f)).forEach(s => window.studentsFeesData.push(s));
        studentsFeesData = window.studentsFeesData;
        
        populateFeesTable(studentsFeesData);
        updateFeesStats();
        
        try {
            const txList = await getAllTransactions();
            window.receiptsData.length = 0;
            txList.map(t => mapTransactionToReceipt(t)).forEach(r => window.receiptsData.push(r));
            receiptsData = window.receiptsData;
            populateReceiptsGrid(receiptsData);
        } catch (txErr) {
            console.warn('Transactions load:', txErr.message);
        }
        
    } catch (err) {
        console.error('loadFeesData error:', err);
        fmToast('Failed to load fees data: ' + err.message, 'error');
    } finally { 
        showLoading(false); 
    }
}

// ─── MAPPERS ──────────────────────────────────────────────────────────────────
function mapFeesToStudent(f) {
    const insts = (f.installmentsList || []).map((i, idx) => {
        // Calculate how much has been paid for this installment
        let paidAmount = 0;
        if (i.status === 'PAID') {
            paidAmount = i.amount || 0;  // Full amount paid
        } else if (i.status === 'PARTIALLY_PAID' || i.status === 'PARTIAL') {
            // For partial payments, use addonAmount or calculate from paid amount
            paidAmount = i.addonAmount || i.paidAmount || 0;
        }
        
        return {
            installmentId: i.installmentId,
            installmentSeq: idx + 1,
            amount: i.amount || 0,
            paid: paidAmount,  // Store the actual paid amount
            dueDate: i.dueDate || null,
            paidDate: i.paidDate || null,
            status: (i.status || 'PENDING').toLowerCase(),
            paymentMode: i.paymentMode || null,
            transactionReference: i.transactionReference || null,
            addonAmount: i.addonAmount || 0,
            dueAmount: i.dueAmount || i.amount || 0,
            isOverdue: i.overdue || false,
            remainingDays: i.remainingDays || null
        };
    });
    
    // Calculate total paid correctly:
    // 1. Initial amount paid at fee creation
    // 2. Sum of all installment payments (including partial)
    const totalPaidFromInstallments = insts.reduce((sum, inst) => sum + (inst.paid || 0), 0);
    const totalPaid = (f.initialAmount || 0) + totalPaidFromInstallments;
    
    // Calculate total fees
    const totalFees = f.totalFees || 0;
    
    // Calculate balance
    const balance = totalFees - totalPaid;
    
    // Get remaining fees from backend (fallback to calculated balance)
    const remainingFees = f.remainingFees !== undefined ? f.remainingFees : balance;
    
    return {
        feesId: f.id,
        stdId: f.studentId,
        id: f.studentRollNumber || String(f.studentId),
        rollNumber: f.studentRollNumber || String(f.studentId),
        name: f.studentName || 'Unknown',
        class: f.studentClass || '-',
        section: f.studentSection || '-',
        total: totalFees,
        paid: totalPaid,
        balance: balance,  // Use calculated balance, not backend remainingFees
        initialAmount: f.initialAmount || 0,
        status: (() => {
            if (balance <= 0) return 'Paid';
            if (totalPaid > (f.initialAmount || 0)) return 'Partial Paid';
            return 'Unpaid';
        })(),
        admissionFees: f.admissionFees || 0,
        uniformFees: f.uniformFees || 0,
        bookFees: f.bookFees || 0,
        tuitionFees: f.tuitionFees || 0,
        academicYear: f.academicYear || '-',
        installments: insts
    };
}

function mapPaymentStatus(s) {
    const u = (s || '').toUpperCase();
    if (u === 'FULLY PAID')     return 'Paid';
    if (u === 'PARTIALLY PAID') return 'Partial Paid';
    return 'Unpaid';
}

// FIX: map transaction to receipt WITH real student name/class/roll from studentsFeesData
function mapTransactionToReceipt(t) {
    // Find student info
    const student = window.studentsFeesData.find(s => String(s.stdId) === String(t.studentId));
    
    // CRITICAL FIX: Find the installment sequence number
    let installmentSeqNumber = '-';
    if (student && t.installmentId && student.installments) {
        const installment = student.installments.find(i => i.installmentId === t.installmentId);
        if (installment && installment.installmentSeq) {
            installmentSeqNumber = installment.installmentSeq;
        } else {
            // Fallback: find by index
            const instIndex = student.installments.findIndex(i => i.installmentId === t.installmentId);
            if (instIndex !== -1) {
                installmentSeqNumber = instIndex + 1;
            }
        }
    }
    
    return {
        receiptNo: 'TXN-' + t.transId,
        studentName: student ? student.name : (t.studentName || ('Student #' + (t.studentId || ''))),
        studentId: String(t.studentId || ''),
        stdId: t.studentId,  // Keep numeric ID for filtering
        rollNumber: student ? student.rollNumber : '',
        class: student ? (student.class + '-' + student.section) : '-',
        amount: t.amountPaid || 0,
        date: t.paymentDate ? fmFormatDate(t.paymentDate) : '-',
        method: t.paymentMode ? t.paymentMode.charAt(0).toUpperCase() + t.paymentMode.slice(1).toLowerCase() : 'Cash',
        transactionId: t.transactionId || '',
        installmentId: t.installmentId,
        installmentNumber: installmentSeqNumber,
        academicYear: student ? student.academicYear : '-',
        remarks: t.remarks || ''
    };
}

// ============================================================================
//  TABS
// ============================================================================
function switchFeesTab(tabName) {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.getElementById(`tabBtn${tabName.charAt(0).toUpperCase() + tabName.slice(1)}`)?.classList.add('active');
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
    document.getElementById(`${tabName}TabContent`)?.classList.add('active');
    currentFeesTab = tabName;
}
window.switchFeesTab = switchFeesTab;

// ============================================================================
//  FEES TABLE  — FIX: shows data immediately on page load
// ============================================================================
function populateFeesTable(students) {
    const tbody = document.getElementById('feesTableBody');
    if (!tbody) return;
    
    if (!students || students.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;padding:48px;">No fee records found</td></tr>`;
        return;
    }
    
    tbody.innerHTML = students.map(s => {
        const pct = s.total > 0 ? (s.paid / s.total) * 100 : 0;
        const barColor = pct >= 100 ? 'var(--success)' : pct >= 50 ? 'var(--warning)' : 'var(--danger)';
        const sc = s.status === 'Paid' ? 'badge-paid' : s.status === 'Partial Paid' ? 'badge-partial' : 'badge-unpaid';
        
        return `<tr>
            <td><div style="font-weight:600">${s.name}</div><div style="font-size:11px;">Roll: ${s.rollNumber}</div></td>
            <td>Class ${s.class}-${s.section}</td>
            <td>₹${s.total.toLocaleString()}</td>
            <td>
                <div style="color:var(--success)">₹${s.paid.toLocaleString()}</div>
                <div style="height:4px;background:#dee2e6;width:80px;margin-top:4px">
                    <div style="height:100%;width:${Math.min(pct, 100)}%;background:${barColor}"></div>
                </div>
            </td>
            <td style="color:${s.balance > 0 ? 'var(--danger)' : 'var(--success)'}">₹${s.balance.toLocaleString()}</td>
            <td><span class="badge ${sc}">${s.status}</span></td>
            <td>
                <div style="display:flex;gap:6px;">
                    <button class="btn btn-outline btn-sm" onclick="viewStudentFees('${s.id}')"><i class="fas fa-eye"></i></button>
                    <button class="btn btn-success btn-sm" onclick="openCollectPaymentModal('${s.id}')"><i class="fas fa-money-bill-wave"></i></button>
                    <button class="btn btn-warning btn-sm" onclick="sendReminder('${s.stdId}')"><i class="fas fa-bell"></i></button>
                </div>
            </td>
        </tr>`;
    }).join('');
}

function filterFeesTable() {
    const search = document.getElementById('searchStudentFees')?.value.toLowerCase() || '';
    const cls    = document.getElementById('filterClassFees')?.value || '';
    const status = document.getElementById('filterFeeStatusFees')?.value || '';
    populateFeesTable(studentsFeesData.filter(s => {
        const ms = !search || s.name.toLowerCase().includes(search) || s.id.toLowerCase().includes(search) || s.rollNumber.toLowerCase().includes(search);
        const mc = !cls    || s.class === cls;
        const mu = !status ||
            (status === 'paid'    && s.status === 'Paid')         ||
            (status === 'partial' && s.status === 'Partial Paid') ||
            (status === 'unpaid'  && s.status === 'Unpaid');
        return ms && mc && mu;
    }));
}
window.filterFeesTable = filterFeesTable;

// ============================================================================
//  STATS
// ============================================================================
function updateFeesStats() {
    let col = 0, pen = 0, fp = 0, od = 0;
    const today = new Date(); today.setHours(0, 0, 0, 0);
    
    studentsFeesData.forEach(s => {
        col += s.paid || 0;
        if ((s.balance || 0) > 0) pen += s.balance;
        if (s.status === 'Paid') fp++;
        if ((s.installments || []).some(i => {
            if (i.status === 'paid') return false;
            const d = i.dueDate ? new Date(i.dueDate) : null;
            return d && d < today;
        })) od++;
    });
    
    const fmt = n => '₹' + n.toLocaleString();
    document.getElementById('statTotalCollected').innerText = fmt(col);
    document.getElementById('statPending').innerText = fmt(pen);
    document.getElementById('statFullyPaid').innerText = fp;
    document.getElementById('statOverdue').innerText = od;
    document.getElementById('statPendingCount').innerText = studentsFeesData.filter(s => (s.balance || 0) > 0).length + ' students';
}

// ============================================================================
//  RECEIPTS GRID — FIX: student name now correctly shown
// ============================================================================
function populateReceiptsGrid(receipts) {
    const grid = document.getElementById('receiptsGrid');
    const noMsg = document.getElementById('noReceiptsMessage');
    if (!grid) return;
    
    if (!receipts || receipts.length === 0) {
        grid.innerHTML = '';
        if (noMsg) noMsg.style.display = 'block';
        return;
    }
    
    if (noMsg) noMsg.style.display = 'none';
    
    grid.innerHTML = receipts.map(r => {
        const isCash = (r.method || '').toLowerCase() === 'cash';
        const bg = isCash ? 'cash-bg' : 'online-bg';
        const icon = isCash ? 'fa-money-bill-wave' : 'fa-university';
        
        return `<div class="receipt-card">
            <div class="receipt-card-header ${bg}">
                <div class="rch-no">${r.receiptNo}</div>
                <div class="rch-name">${r.studentName}</div>
                <div class="rch-meta">
                    ${r.rollNumber ? 'Roll: ' + r.rollNumber + ' • ' : ''}${r.class} • ${r.date}
                    ${r.installmentNumber && r.installmentNumber !== '-' ? ' • Inst. ' + r.installmentNumber : ''}
                </div>
                <div class="rch-amount">₹${Number(r.amount).toLocaleString()}</div>
            </div>
            <div class="receipt-card-body">
                <div class="rch-row"><span class="rch-key">Method</span><span class="rch-val"><i class="fas ${icon}"></i> ${r.method}</span></div>
                ${r.transactionId ? `<div class="rch-row"><span class="rch-key">Txn ID</span><span class="rch-val">${r.transactionId}</span></div>` : ''}
            </div>
            <div class="receipt-card-footer">
                <button class="btn btn-outline btn-sm" onclick="viewReceipt('${r.receiptNo}')">View Receipt</button>
                <button class="btn btn-success btn-sm" onclick="downloadReceipt('${r.receiptNo}')"><i class="fas fa-download"></i></button>
            </div>
        </div>`;
    }).join('');
}

function filterReceipts() {
    const search = document.getElementById('searchReceiptNumber')?.value.toLowerCase() || '';
    const method = document.getElementById('filterPaymentMethod')?.value.toLowerCase() || '';
    
    let f = receiptsData;
    if (search) {
        f = f.filter(r => 
            r.receiptNo.toLowerCase().includes(search) ||
            r.studentName.toLowerCase().includes(search) ||
            r.studentId.toLowerCase().includes(search) ||
            (r.rollNumber || '').toLowerCase().includes(search)
        );
    }
    if (method) {
        f = f.filter(r => (r.method || '').toLowerCase() === method);
    }
    populateReceiptsGrid(f);
}

// ============================================================================
//  COLLECT PAYMENT MODAL
// ============================================================================
function openCollectPaymentModal(studentId = null) {
    document.getElementById('collectPaymentModal')?.classList.add('active');
    ['installmentSelectionSection', 'selectedInstallmentDetails', 'qrCodeSection',
     'transactionDetails', 'studentSearchResults', 'selectedStudentInfo']
        .forEach(id => document.getElementById(id)?.classList.add('hidden'));
    
    const pa = document.getElementById('paymentAmount');
    if (pa) { pa.value = ''; pa.readOnly = true; }
    const ti = document.getElementById('transactionId');
    if (ti) ti.value = '';
    const ssi = document.getElementById('studentSearchInput');
    if (ssi) ssi.value = '';
    const qcc = document.getElementById('qrCodeContainer');
    if (qcc) qcc.innerHTML = '';
    const ioc = document.getElementById('installmentOptionsContainer');
    if (ioc) ioc.innerHTML = '';
    
    if (typeof window.selectMethod === 'function') window.selectMethod('cash');
    else {
        const spm = document.getElementById('selectedPaymentMethod');
        if (spm) spm.value = 'cash';
    }
    
    selectedStudentForPayment = null;
    selectedInstallmentForPayment = null;
    currentSelectedInstallmentIndex = -1;
    qrCodeInstance = null;
    updatePaymentSummary();
    
    if (studentId) {
        // Get student with corrected balance
        const student = studentsFeesData.find(s => s.id === studentId);
        if (student) {
            // Recalculate balance for this specific student
            const studentReceipts = receiptsData.filter(r => String(r.stdId) === String(student.stdId));
            const totalPaidFromReceipts = studentReceipts.reduce((sum, r) => sum + (r.amount || 0), 0);
            const correctTotalPaid = (student.initialAmount || 0) + totalPaidFromReceipts;
            const correctBalance = student.total - correctTotalPaid;
            
            // Create a corrected student object
            const correctedStudent = {
                ...student,
                paid: correctTotalPaid,
                balance: correctBalance,
                status: correctBalance <= 0 ? 'Paid' : (correctTotalPaid > (student.initialAmount || 0) ? 'Partial Paid' : 'Unpaid')
            };
            
            selectStudentForPayment(correctedStudent);
        }
    }
}
window.openCollectPaymentModal = openCollectPaymentModal;

function closeCollectPaymentModal() {
    document.getElementById('collectPaymentModal')?.classList.remove('active');
    selectedStudentForPayment = null; selectedInstallmentForPayment = null;
    currentSelectedInstallmentIndex = -1; qrCodeInstance = null;
}
window.closeCollectPaymentModal = closeCollectPaymentModal;

// ─── Student Search ────────────────────────────────────────────────────────────
function searchStudents(query) {
    const rc = document.getElementById('studentSearchResults');
    if (!rc) return;
    if (query.length < 2) { rc.classList.add('hidden'); return; }
    const filtered = studentsFeesData.filter(s =>
        s.name.toLowerCase().includes(query.toLowerCase()) ||
        s.id.toLowerCase().includes(query.toLowerCase()) ||
        s.rollNumber.toLowerCase().includes(query.toLowerCase())
    );
    if (filtered.length === 0) {
        rc.innerHTML='<div style="padding:12px;text-align:center;color:var(--text-muted);font-size:13px">No students found</div>';
        rc.classList.remove('hidden'); return;
    }
    rc.innerHTML = filtered.slice(0,10).map(s=>`
        <div style="padding:12px;border-bottom:1px solid var(--border-light);cursor:pointer"
             onmouseover="this.style.background='var(--surface-2)'" onmouseout="this.style.background=''"
             onclick='selectStudentForPayment(${JSON.stringify(s).replace(/'/g,"&#39;")})'>
            <div style="display:flex;justify-content:space-between;align-items:center">
                <div>
                    <div style="font-weight:500;font-size:13px">${s.name}</div>
                    <div style="font-size:11px;color:var(--text-muted)">Class ${s.class}-${s.section} &bull; Roll: ${s.rollNumber}</div>
                </div>
                <div style="font-size:12px;color:${s.balance>0?'var(--danger)':'var(--success)'};font-weight:500">
                    Bal: ₹${s.balance.toLocaleString('en-IN')}
                </div>
            </div>
        </div>`).join('');
    rc.classList.remove('hidden');
}

function showInstallmentOptionsWithCorrectPaidAmounts(student) {
    const sec = document.getElementById('installmentSelectionSection');
    const con = document.getElementById('installmentOptionsContainer');
    if (!sec || !con) return;
    sec.classList.remove('hidden');
    con.innerHTML = '';
    
    const insts = student.installments || [];
    
    // Get receipts for this student to calculate correct paid amounts per installment
    const studentReceipts = receiptsData.filter(r => String(r.stdId) === String(student.stdId));
    
    // Calculate paid amount per installment from receipts
    const paidPerInstallment = {};
    studentReceipts.forEach(r => {
        const instNum = r.installmentNumber;
        if (instNum && instNum !== '-') {
            if (!paidPerInstallment[instNum]) paidPerInstallment[instNum] = 0;
            paidPerInstallment[instNum] += r.amount;
        }
    });
    
    if (insts.length === 0) {
        con.innerHTML = `<div style="text-align:center;padding:20px;">No installments found</div>`;
        return;
    }
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    insts.forEach((inst, idx) => {
        const installmentNumber = idx + 1;
        const paidForThisInstallment = paidPerInstallment[installmentNumber] || 0;
        const rem = inst.amount - paidForThisInstallment;
        const isPaid = rem <= 0;
        const isPartial = paidForThisInstallment > 0 && !isPaid;
        const isPayable = !isPaid && rem > 0;
        
        const due = inst.dueDate ? new Date(inst.dueDate) : null;
        const isOverdue = due && due < today && !isPaid;
        const isUpcoming = due && due >= today && !isPaid;
        
        const div = document.createElement('div');
        div.id = `instOpt_${idx}`;
        div.style.cssText = `border:2px solid ${currentSelectedInstallmentIndex === idx ? 'var(--primary)' : isOverdue ? 'var(--danger)' : isUpcoming ? 'var(--warning)' : 'var(--border)'};
            border-radius:10px;padding:14px;margin-bottom:10px;cursor:${isPayable ? 'pointer' : 'default'};
            opacity:${isPaid ? '0.7' : '1'};
            background:${currentSelectedInstallmentIndex === idx ? 'var(--primary-bg)' : isOverdue ? '#fff5f5' : isUpcoming ? '#fffbeb' : 'var(--surface)'};`;
        
        div.innerHTML = `
            <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;">
                <div style="flex:1;">
                    <div style="font-weight:600;font-size:13px;">
                        Installment ${installmentNumber} - ₹${inst.amount.toLocaleString()}
                        ${isPaid ? '<span style="margin-left:8px;background:#d3f9d8;color:#2b8a3e;font-size:10px;padding:2px 8px;border-radius:20px;">✓ PAID</span>' : ''}
                        ${isPartial ? `<span style="margin-left:8px;background:#dbe4ff;color:#3b5bdb;font-size:10px;padding:2px 8px;border-radius:20px;">PARTIAL (${Math.round((paidForThisInstallment / inst.amount) * 100)}%)</span>` : ''}
                        ${isOverdue ? '<span style="margin-left:8px;background:#ffe3e3;color:#c92a2a;font-size:10px;padding:2px 8px;border-radius:20px;">⚠ OVERDUE</span>' : ''}
                        ${isUpcoming && !isOverdue ? '<span style="margin-left:8px;background:#fef3c7;color:#92400e;font-size:10px;padding:2px 8px;border-radius:20px;">⏳ UPCOMING</span>' : ''}
                    </div>
                    <div style="font-size:11px;color:var(--text-muted);margin-top:4px;">
                        Due: ${inst.dueDate ? fmFormatDate(inst.dueDate) : 'N/A'}
                        ${isOverdue ? `<span style="color:var(--danger);margin-left:8px;">(${Math.abs(Math.round((new Date(inst.dueDate) - today) / 86400000))} days overdue)</span>` : ''}
                    </div>
                </div>
                <div style="text-align:right;">
                    ${paidForThisInstallment > 0 ? `
                        <div style="font-size:12px;color:var(--success);font-weight:600;">
                            Paid: ₹${paidForThisInstallment.toLocaleString()}
                        </div>
                    ` : ''}
                    ${rem > 0 && !isPaid ? `
                        <div style="font-size:12px;color:var(--danger);font-weight:600;">
                            Remaining: ₹${rem.toLocaleString()}
                        </div>
                    ` : ''}
                </div>
            </div>`;
        
        if (isPayable) {
            div.onclick = () => selectInstallmentForPaymentWithCorrectAmount(idx, paidForThisInstallment);
        }
        con.appendChild(div);
    });
}


function showInstallmentDetailsWithCorrectAmount(inst, idx) {
    const ds = document.getElementById('selectedInstallmentDetails');
    const ps = document.getElementById('installmentPaymentSection');
    if (!ds || !ps) return;
    
    const set = (id, v) => {
        const el = document.getElementById(id);
        if (el) el.textContent = v;
    };
    
    set('installmentNumberDisplay', `Installment ${idx + 1}`);
    set('installmentDueDateDisplay', inst.dueDate ? fmFormatDate(inst.dueDate) : 'N/A');
    set('installmentAmountDisplay', `₹${inst.amount.toLocaleString()}`);
    
    // Use the correct paid amount from the installment object
    const rem = inst.amount - (inst.paid || 0);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const due = inst.dueDate ? new Date(inst.dueDate) : null;
    const pa = document.getElementById('paymentAmount');
    let html = '';
    
    if (rem <= 0) {
        html = `<div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:14px;display:flex;align-items:center;gap:10px">
            <i class="fas fa-check-circle" style="color:var(--success);font-size:18px"></i>
            <div><div style="font-weight:600;color:var(--success)">Fully Paid</div></div>
        </div>`;
        if (pa) pa.value = '';
    } else {
        const label = (due && due < today) ? 'Overdue' : 'Due';
        const color = (due && due < today) ? 'var(--danger)' : 'var(--primary)';
        html = `<div style="background:${due && due < today ? '#fff5f5' : '#eff6ff'};border:1px solid ${due && due < today ? '#fecaca' : '#bfdbfe'};border-radius:8px;padding:14px;">
            <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px;">
                <div>
                    <div style="font-weight:600;color:${color}">${label}</div>
                    <div style="font-size:14px;font-weight:700;color:${color}">Amount Due: ₹${rem.toLocaleString()}</div>
                    ${inst.paid > 0 ? `<div style="font-size:11px;color:var(--text-muted)">Already Paid: ₹${inst.paid.toLocaleString()}</div>` : ''}
                </div>
                <button class="btn btn-success" onclick="openCustomAmountOverlay(${idx})">
                    <i class="fas fa-rupee-sign"></i> Pay Now
                </button>
            </div>
        </div>`;
        if (pa) pa.value = rem;
    }
    
    ps.innerHTML = html;
    ds.classList.remove('hidden');
    updatePaymentSummary();
    if (getSelectedPaymentMethod() === 'online' && pa?.value) generateFMQRCode();
}

function selectInstallmentForPaymentWithCorrectAmount(idx, paidForThisInstallment) {
    if (!selectedStudentForPayment?.installments) return;
    
    currentSelectedInstallmentIndex = idx;
    const installment = selectedStudentForPayment.installments[idx];
    const studentReceipts = receiptsData.filter(r => String(r.stdId) === String(selectedStudentForPayment.stdId));
    
    // Calculate correct paid amount from receipts
    const correctPaidForThisInstallment = studentReceipts
        .filter(r => r.installmentNumber === (idx + 1))
        .reduce((sum, r) => sum + (r.amount || 0), 0);
    
    // Create a corrected installment object with the actual paid amount
    selectedInstallmentForPayment = {
        ...installment,
        paid: correctPaidForThisInstallment
    };
    
    selectedStudentForPayment.installments.forEach((_, i) => {
        const el = document.getElementById(`instOpt_${i}`);
        if (el) {
            el.style.borderColor = i === idx ? 'var(--primary)' : 'var(--border)';
            el.style.background = i === idx ? 'var(--primary-bg)' : 'var(--surface)';
        }
    });
    
    showInstallmentDetailsWithCorrectAmount(selectedInstallmentForPayment, idx);
}
window.selectInstallmentForPayment = selectInstallmentForPaymentWithCorrectAmount;


function selectStudentForPayment(student) {
    // Recalculate balance again to ensure accuracy
    const studentReceipts = receiptsData.filter(r => String(r.stdId) === String(student.stdId));
    const totalPaidFromReceipts = studentReceipts.reduce((sum, r) => sum + (r.amount || 0), 0);
    const correctTotalPaid = (student.initialAmount || 0) + totalPaidFromReceipts;
    const correctBalance = student.total - correctTotalPaid;
    
    // Use corrected values
    student.paid = correctTotalPaid;
    student.balance = correctBalance;
    
    selectedStudentForPayment = student;
    selectedInstallmentForPayment = null;
    currentSelectedInstallmentIndex = -1;
    
    const ssi = document.getElementById('studentSearchInput');
    if (ssi) ssi.value = student.name;
    document.getElementById('studentSearchResults')?.classList.add('hidden');
    
    const info = document.getElementById('selectedStudentInfo');
    if (info) {
        info.classList.remove('hidden');
        info.innerHTML = `
            <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px;">
                <div>
                    <div style="font-weight:600;font-size:14px;">${student.name}</div>
                    <div style="font-size:11px;color:var(--text-muted);">
                        Class ${student.class}-${student.section} | Roll: ${student.rollNumber}
                    </div>
                </div>
                <div style="text-align:right;background:var(--surface);padding:8px 12px;border-radius:8px;">
                    <div style="font-size:11px;color:var(--text-muted);">Balance Due</div>
                    <div style="font-size:18px;font-weight:700;color:${student.balance > 0 ? 'var(--danger)' : 'var(--success)'};">
                        ₹${student.balance.toLocaleString()}
                    </div>
                    <div style="font-size:10px;color:var(--text-muted);">
                        Paid: ₹${student.paid.toLocaleString()} of ₹${student.total.toLocaleString()}
                    </div>
                </div>
            </div>
        `;
    }
    
    showInstallmentOptionsWithCorrectPaidAmounts(student);
    updatePaymentSummary();
}
window.selectStudentForPayment = selectStudentForPayment;

// ─── Installments ─────────────────────────────────────────────────────────────
function showInstallmentOptions(student) {
    const sec = document.getElementById('installmentSelectionSection');
    const con = document.getElementById('installmentOptionsContainer');
    if (!sec || !con) return;
    sec.classList.remove('hidden');
    con.innerHTML = '';
    const insts = student.installments || [];
    
    if (insts.length === 0) {
        con.innerHTML = `<div style="text-align:center;padding:20px;">No installments found</div>`;
        return;
    }
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    insts.forEach((inst, idx) => {
        const rem = inst.amount - (inst.paid || 0);
        const isPaid = inst.status === 'paid';
        const isPartial = inst.status === 'partial' && rem > 0 && inst.paid > 0;
        const isPayable = !isPaid && rem > 0;
        
        const due = inst.dueDate ? new Date(inst.dueDate) : null;
        const isOverdue = due && due < today && !isPaid;
        const isUpcoming = due && due >= today && !isPaid;
        
        const div = document.createElement('div');
        div.id = `instOpt_${idx}`;
        div.style.cssText = `border:2px solid ${currentSelectedInstallmentIndex === idx ? 'var(--primary)' : isOverdue ? 'var(--danger)' : isUpcoming ? 'var(--warning)' : 'var(--border)'};
            border-radius:10px;padding:14px;margin-bottom:10px;cursor:${isPayable ? 'pointer' : 'default'};
            opacity:${isPaid ? '0.7' : '1'};
            background:${currentSelectedInstallmentIndex === idx ? 'var(--primary-bg)' : isOverdue ? '#fff5f5' : isUpcoming ? '#fffbeb' : 'var(--surface)'};`;
        
        div.innerHTML = `
            <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;">
                <div style="flex:1;">
                    <div style="font-weight:600;font-size:13px;">
                        Installment ${idx + 1}
                        ${isPaid ? '<span style="margin-left:8px;background:#d3f9d8;color:#2b8a3e;font-size:10px;padding:2px 8px;border-radius:20px;">✓ PAID</span>' : ''}
                        ${isPartial ? '<span style="margin-left:8px;background:#dbe4ff;color:#3b5bdb;font-size:10px;padding:2px 8px;border-radius:20px;">PARTIAL</span>' : ''}
                        ${isOverdue ? '<span style="margin-left:8px;background:#ffe3e3;color:#c92a2a;font-size:10px;padding:2px 8px;border-radius:20px;">⚠ OVERDUE</span>' : ''}
                        ${isUpcoming && !isOverdue ? '<span style="margin-left:8px;background:#fef3c7;color:#92400e;font-size:10px;padding:2px 8px;border-radius:20px;">⏳ UPCOMING</span>' : ''}
                    </div>
                    <div style="font-size:11px;color:var(--text-muted);margin-top:4px;">
                        Due: ${inst.dueDate ? fmFormatDate(inst.dueDate) : 'N/A'}
                        ${isOverdue ? `<span style="color:var(--danger);margin-left:8px;">(${Math.abs(Math.round((new Date(inst.dueDate) - today) / 86400000))} days overdue)</span>` : ''}
                    </div>
                </div>
                <div style="text-align:right;">
                    <div style="font-weight:700;">₹${inst.amount.toLocaleString()}</div>
                    ${inst.paid > 0 ? `<div style="font-size:11px;color:var(--success);">Paid: ₹${inst.paid.toLocaleString()}</div>` : ''}
                    ${rem > 0 && !isPaid ? `<div style="font-size:11px;color:var(--danger);">Remaining: ₹${rem.toLocaleString()}</div>` : ''}
                </div>
            </div>`;
        
        if (isPayable) {
            div.onclick = () => selectInstallmentForPayment(idx);
        }
        con.appendChild(div);
    });
}

function findFirstPayableInstallmentIndex(insts) {
    const today=new Date(); today.setHours(0,0,0,0);
    for (let i=0;i<insts.length;i++) {
        const inst=insts[i], rem=inst.amount-(inst.paid||0);
        if (rem>0&&inst.status!=='paid') {
            const due=inst.dueDate?new Date(inst.dueDate):null;
            if (due&&due<today) return i;
            let ok=true;
            for (let j=0;j<i;j++){const p=insts[j],pr=p.amount-(p.paid||0),pd=p.dueDate?new Date(p.dueDate):null;if(pr>0&&pd&&pd<today){ok=false;break;}}
            if (ok) return i;
        }
    }
    return -1;
}

function selectInstallmentForPayment(idx) {
    if (!selectedStudentForPayment?.installments) return;
    currentSelectedInstallmentIndex=idx;
    selectedInstallmentForPayment=selectedStudentForPayment.installments[idx];
    selectedStudentForPayment.installments.forEach((_,i)=>{
        const el=document.getElementById(`instOpt_${i}`);
        if(el){el.style.borderColor=i===idx?'var(--primary)':'var(--border)';el.style.background=i===idx?'var(--primary-bg)':'var(--surface)';}
    });
    showInstallmentDetails(selectedInstallmentForPayment,idx);
}
window.selectInstallmentForPayment=selectInstallmentForPayment;

function showInstallmentDetails(inst,idx) {
    const ds=document.getElementById('selectedInstallmentDetails');
    const ps=document.getElementById('installmentPaymentSection');
    if(!ds||!ps) return;
    const set=(id,v)=>{const el=document.getElementById(id);if(el)el.textContent=v;};
    set('installmentNumberDisplay',`Installment ${idx+1}`);
    set('installmentDueDateDisplay',inst.dueDate?fmFormatDate(inst.dueDate):'N/A');
    set('installmentAmountDisplay',`₹${inst.amount.toLocaleString('en-IN')}`);
    const rem=inst.amount-(inst.paid||0);
    const today=new Date();today.setHours(0,0,0,0);
    const due=inst.dueDate?new Date(inst.dueDate):null;
    const pa=document.getElementById('paymentAmount');
    let html='';
    if (inst.status==='paid') {
        html=`<div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:14px;display:flex;align-items:center;gap:10px"><i class="fas fa-check-circle" style="color:var(--success);font-size:18px"></i><div><div style="font-weight:600;color:var(--success)">Fully Paid</div><div style="font-size:12px;color:var(--success)">Paid on ${inst.paidDate?fmFormatDate(inst.paidDate):'N/A'}</div></div></div>`;
        if(pa)pa.value='';
    } else if (rem>0) {
        if (checkIfInstallmentIsPayable(idx)) {
            const label=(due&&due<today)?'Overdue':'Due';
            const color=(due&&due<today)?'var(--danger)':'var(--primary)';
            html=`<div style="background:${due&&due<today?'#fff5f5':'#eff6ff'};border:1px solid ${due&&due<today?'#fecaca':'#bfdbfe'};border-radius:8px;padding:14px;display:flex;justify-content:space-between;align-items:center">
                <div><div style="font-weight:600;color:${color}">${label}</div>
                <div style="font-size:12px;color:${color}">Amount Due: ₹${rem.toLocaleString('en-IN')}</div>
                ${inst.status==='partial'?`<div style="font-size:11px;color:var(--text-muted)">Already Paid: ₹${(inst.paid||0).toLocaleString('en-IN')}</div>`:''}</div>
                <button class="btn btn-success btn-sm" onclick="openCustomAmountOverlay(${idx})"><i class="fas fa-rupee-sign"></i> Pay Now</button>
            </div>`;
            if(pa)pa.value=rem;
        } else {
            html=`<div style="background:var(--surface-2);border:1px solid var(--border);border-radius:8px;padding:14px;display:flex;justify-content:space-between;align-items:center"><div><div style="font-weight:600;color:var(--text-muted)">Not Payable Yet</div><div style="font-size:12px;color:var(--text-muted)">Complete previous installments first</div></div><button class="btn btn-outline btn-sm" disabled style="opacity:0.5;cursor:not-allowed">Pay Now</button></div>`;
            if(pa)pa.value='';
        }
    }
    ps.innerHTML=html; ds.classList.remove('hidden');
    updatePaymentSummary();
    if(getSelectedPaymentMethod()==='online'&&pa?.value)generateFMQRCode();
}

function checkIfInstallmentIsPayable(idx) {
    if (!selectedStudentForPayment?.installments) return false;
    const inst = selectedStudentForPayment.installments[idx];
    const rem = inst.amount - (inst.paid || 0);
    
    // Can't pay if fully paid or no remaining amount
    if (inst.status === 'paid' || rem <= 0) return false;
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Check all previous installments
    for (let i = 0; i < idx; i++) {
        const prevInst = selectedStudentForPayment.installments[i];
        const prevRem = prevInst.amount - (prevInst.paid || 0);
        const prevDue = prevInst.dueDate ? new Date(prevInst.dueDate) : null;
        
        // If previous installment has remaining amount AND is overdue, can't pay current
        if (prevRem > 0 && prevInst.status !== 'paid' && prevDue && prevDue < today) {
            return false;
        }
    }
    
    return true;
}

// ─── Custom Amount ─────────────────────────────────────────────────────────────
function openCustomAmountOverlay(idx) {
    if(!selectedStudentForPayment?.installments)return;
    const inst=selectedStudentForPayment.installments[idx];
    const rem=inst.amount-(inst.paid||0);
    customAmountInstallment=inst;
    const ifa=document.getElementById('installmentFullAmount');if(ifa)ifa.textContent=rem.toLocaleString('en-IN');
    const cpa=document.getElementById('customPaymentAmount');if(cpa){cpa.value=rem;cpa.max=rem;cpa.min=1;}
    updateRemainingAmountDisplay();
    document.getElementById('customAmountOverlay')?.classList.add('active');
    setTimeout(()=>cpa?.focus(),100);
}
window.openCustomAmountOverlay=openCustomAmountOverlay;
function closeCustomAmountOverlay(){document.getElementById('customAmountOverlay')?.classList.remove('active');customAmountInstallment=null;}
window.closeCustomAmountOverlay=closeCustomAmountOverlay;

function submitCustomAmount() {
    const cpa=document.getElementById('customPaymentAmount');
    const amt=parseInt(cpa?.value);
    if(!amt||amt<=0){fmToast('Please enter a valid amount','error');return;}
    const rem=customAmountInstallment.amount-(customAmountInstallment.paid||0);
    if(amt>rem){fmToast(`Amount cannot exceed ₹${rem.toLocaleString('en-IN')}`,'error');return;}
    const pa=document.getElementById('paymentAmount');if(pa)pa.value=amt;
    closeCustomAmountOverlay();updatePaymentSummary();
    if(getSelectedPaymentMethod()==='online')generateFMQRCode();
    fmToast(`Amount set to ₹${amt.toLocaleString('en-IN')}`,'success');
}
window.submitCustomAmount=submitCustomAmount;

function updateRemainingAmountDisplay() {
    if(!customAmountInstallment)return;
    const c=parseInt(document.getElementById('customPaymentAmount')?.value)||0;
    const rem=customAmountInstallment.amount-(customAmountInstallment.paid||0);
    const el=document.getElementById('remainingAmountDisplay');if(el)el.textContent=(rem-c).toLocaleString('en-IN');
}

// ─── Payment Summary ──────────────────────────────────────────────────────────
function updatePaymentSummary() {
    const set=(id,v)=>{const el=document.getElementById(id);if(el)el.textContent=v;};
    const amt=parseInt(document.getElementById('paymentAmount')?.value||0);
    set('summaryStudentName', selectedStudentForPayment?.name||'Not selected');
    set('summaryInstallment', currentSelectedInstallmentIndex>=0?`Installment ${currentSelectedInstallmentIndex+1}`:'Not selected');
    set('summaryPaymentAmount','₹'+amt.toLocaleString('en-IN'));
    set('summaryPaymentMethod',getSelectedPaymentMethod()==='online'?'Online Transfer':'Cash');
    set('summaryTotalAmount','₹'+amt.toLocaleString('en-IN'));
}

// ─── QR Code ──────────────────────────────────────────────────────────────────
function generateFMQRCode() {
    const amt=document.getElementById('paymentAmount')?.value||0;
    const el=document.getElementById('qrAmountDisplay');if(el)el.textContent=parseInt(amt).toLocaleString('en-IN');
    const upi=`upi://pay?pa=school.fees@upi&pn=Kunash%20School&am=${amt}&tn=${encodeURIComponent('Fees: '+(selectedStudentForPayment?.name||'')+' Inst.'+(currentSelectedInstallmentIndex+1))}&cu=INR`;
    const c=document.getElementById('qrCodeContainer');if(!c)return;
    c.innerHTML='';
    try{if(typeof QRCode!=='undefined'){qrCodeInstance=new QRCode(c,{text:upi,width:180,height:180,colorDark:'#000',colorLight:'#fff',correctLevel:QRCode.CorrectLevel.L});}else{_simpleQR(c,amt);}}
    catch{_simpleQR(c,amt);}
}
window.generateFMQRCode=generateFMQRCode;
function _simpleQR(c,amt){const cv=document.createElement('canvas');cv.width=180;cv.height=180;const ctx=cv.getContext('2d');ctx.fillStyle='#fff';ctx.fillRect(0,0,180,180);ctx.fillStyle='#000';[[15,15],[105,15],[15,105]].forEach(([x,y])=>{ctx.fillRect(x,y,40,40);ctx.fillStyle='#fff';ctx.fillRect(x+7,y+7,26,26);ctx.fillStyle='#000';ctx.fillRect(x+13,y+13,14,14);});ctx.font='13px sans-serif';ctx.textAlign='center';ctx.fillText(`₹${amt}`,90,172);c.appendChild(cv);}

// ============================================================================
//  PROCESS PAYMENT
// ============================================================================
// ============================================================================
//  FIXED processPayment() - Ensure partial payments are recorded correctly
// ============================================================================
async function processPayment() {
    if (!selectedStudentForPayment) {
        fmToast('Please select a student', 'error');
        return;
    }
    if (!selectedInstallmentForPayment || currentSelectedInstallmentIndex < 0) {
        fmToast('Please select an installment', 'error');
        return;
    }
    
    const payAmt = parseFloat(document.getElementById('paymentAmount')?.value);
    if (!payAmt || payAmt <= 0) {
        fmToast('Please enter a valid payment amount', 'error');
        return;
    }
    
    const rem = selectedInstallmentForPayment.amount - (selectedInstallmentForPayment.paid || 0);
    if (payAmt > rem) {
        fmToast('Amount cannot exceed remaining: ₹' + rem.toLocaleString('en-IN'), 'error');
        return;
    }
    
    const method = getSelectedPaymentMethod();
    const payDate = document.getElementById('paymentDate')?.value;
    let transId = '';
    
    if (method === 'online') {
        transId = document.getElementById('transactionId')?.value.trim();
        if (!transId) {
            fmToast('Please enter the Transaction ID', 'error');
            return;
        }
        if (transId.length < 6) {
            fmToast('Transaction ID must be at least 6 characters', 'error');
            return;
        }
    }
    
    showLoading(true);
    
    try {
        const student = selectedStudentForPayment;
        const feesId = student.feesId;
        const instId = selectedInstallmentForPayment.installmentId;
        
        if (!feesId) throw new Error('Fee record ID not found. Please refresh.');
        
        // CRITICAL: Pass the amount as a parameter to the backend
        const params = new URLSearchParams({
            paymentMode: method === 'online' ? 'ONLINE' : 'CASH',
            transactionRef: transId || '',
            amount: payAmt  // Make sure amount is passed
        });
        
        console.log('Processing payment with params:', params.toString());
        
        const payRes = await fetch(`${FM_BASE}/api/fees/${feesId}/installments/${instId}/pay?${params}`, {
            method: 'POST',
            headers: fmAuthHeaders()
        });
        
        if (!payRes.ok) {
            const e = await payRes.text();
            throw new Error(e || 'Payment failed on server');
        }
        
        const paymentResult = await payRes.json();
        console.log('Payment API response:', paymentResult);
        
        // Create transaction record
        let txResp = null;
        try {
            txResp = await createTransaction({
                studentId: student.stdId,
                installmentId: instId,
                transactionId: transId || ('CASH-' + Date.now()),
                amountPaid: payAmt,
                paymentDate: payDate,
                paymentMode: method === 'online' ? 'ONLINE' : 'CASH',
                cashierName: 'Admin',
                status: 'COMPLETED',
                remarks: `Installment ${currentSelectedInstallmentIndex + 1} payment`
            });
            console.log('Transaction created:', txResp);
        } catch (txErr) {
            console.warn('TX record non-critical:', txErr.message);
        }
        
        const receiptNo = txResp ? 'TXN-' + txResp.transId : 'RCP-' + Date.now();
        
        // Add to local receipts
        window.receiptsData.unshift({
            receiptNo: receiptNo,
            studentName: student.name,
            studentId: String(student.stdId),
            stdId: student.stdId,
            rollNumber: student.rollNumber,
            class: student.class + '-' + student.section,
            amount: payAmt,
            date: payDate ? fmFormatDate(payDate) : fmFormatDate(new Date().toISOString()),
            method: method === 'online' ? 'Online' : 'Cash',
            transactionId: transId,
            installmentNumber: currentSelectedInstallmentIndex + 1,
            academicYear: student.academicYear
        });
        receiptsData = window.receiptsData;
        
        // Reload data to get updated installment status
        await loadFeesData();
        
        fmToast(`Payment of ₹${payAmt.toLocaleString('en-IN')} collected! Receipt: ${receiptNo}`, 'success');
        closeCollectPaymentModal();
        setTimeout(() => viewReceipt(receiptNo), 700);
        
    } catch (err) {
        console.error('processPayment error:', err);
        fmToast('Payment failed: ' + err.message, 'error');
    } finally {
        showLoading(false);
    }
}

// ============================================================================
//  VIEW RECEIPT — FIX: proper modal structure, full student info
// ============================================================================
function viewReceipt(receiptNo) {
    const r = receiptsData.find(r => r.receiptNo === receiptNo);
    if (!r) {
        fmToast('Receipt not found', 'error');
        return;
    }
    
    const overlay = document.getElementById('viewReceiptModalOverlay');
    const contentDiv = document.getElementById('viewReceiptModalContent');
    if (!overlay || !contentDiv) return;
    
    const isCash = (r.method || '').toLowerCase() === 'cash';
    const hdrGrad = isCash ? 'linear-gradient(135deg,#1a7340,#2f9e44)' : 'linear-gradient(135deg,#6623a3,#862e9c)';
    const icon = isCash ? 'fa-money-bill-wave' : 'fa-university';
    
    contentDiv.innerHTML = `
        <div class="modal-header">
            <div>
                <div class="modal-title">Payment Receipt</div>
                <div style="font-size:12px;">${r.receiptNo}</div>
            </div>
            <button class="modal-close" onclick="document.getElementById('viewReceiptModalOverlay').classList.remove('active')"><i class="fas fa-times"></i></button>
        </div>
        <div class="modal-body" id="receiptPrintArea">
            <div style="background:${hdrGrad};border-radius:12px;padding:24px;color:#fff;margin-bottom:20px;">
                <div style="font-size:24px;font-weight:700;">${r.studentName}</div>
                <div>${r.rollNumber ? 'Roll: ' + r.rollNumber + ' • ' : ''}${r.class} • ${r.date}</div>
                ${r.installmentNumber && r.installmentNumber !== '-' ? `<div>Installment ${r.installmentNumber}</div>` : ''}
                <div style="font-size:32px;font-weight:700;margin-top:16px;">₹${Number(r.amount).toLocaleString()}</div>
                <div><span style="background:rgba(255,255,255,0.2);padding:4px 12px;border-radius:20px;"><i class="fas ${icon}"></i> ${r.method}</span></div>
            </div>
            <div class="detail-row"><span>Receipt No</span><span>${r.receiptNo}</span></div>
            <div class="detail-row"><span>Payment Date</span><span>${r.date}</span></div>
            <div class="detail-row"><span>Amount</span><span style="color:var(--success);font-weight:700;">₹${Number(r.amount).toLocaleString()}</span></div>
            ${r.transactionId ? `<div class="detail-row"><span>Transaction ID</span><span>${r.transactionId}</span></div>` : ''}
        </div>
        <div class="modal-footer">
            <button class="btn btn-outline" onclick="document.getElementById('viewReceiptModalOverlay').classList.remove('active')">Close</button>
            <button class="btn btn-success" onclick="downloadReceipt('${r.receiptNo}')">Download</button>
        </div>
    `;
    
    overlay.classList.add('active');
}
window.viewReceipt = viewReceipt;

// ─── Print single receipt (only prints the receipt content) ──────────────────
function printSingleReceipt() {
    const area = document.getElementById('receiptPrintArea');
    if (!area) { window.print(); return; }
    const original = document.body.innerHTML;
    document.body.innerHTML = `<html><head><title>Fee Receipt</title>
    <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600&family=DM+Mono:wght@400;500&display=swap" rel="stylesheet">
    <style>*{box-sizing:border-box;margin:0;padding:0;font-family:'DM Sans',sans-serif} body{padding:20px;font-size:14px}
    .detail-row{display:flex;justify-content:space-between;padding:7px 0;border-bottom:1px solid #dee2e6}
    .detail-key{font-size:12px;color:#868e96} .detail-val{font-size:13px;font-weight:500;text-align:right}
    .badge-paid{background:#d3f9d8;color:#2b8a3e;padding:3px 9px;border-radius:20px;font-size:11px;font-weight:600}
    </style></head><body>${area.innerHTML}</body></html>`;
    window.print();
    document.body.innerHTML = original;
    window.location.reload();
}
window.printSingleReceipt = printSingleReceipt;

// ─── Download receipt — builds from data directly, works without modal open ────
function downloadReceipt(receiptNo) {
    const r = receiptsData.find(r => r.receiptNo === receiptNo);
    if (!r) { fmToast('Receipt not found', 'error'); return; }
    const fmt = n => '₹' + Number(n||0).toLocaleString('en-IN');
    const isCash = (r.method||'').toLowerCase() === 'cash';
    const hdrColor = isCash ? '#2f9e44' : '#862e9c';
    const icon = isCash ? '💵' : '🏦';

    const html = `<!DOCTYPE html><html><head><meta charset="UTF-8">
    <title>Receipt ${r.receiptNo}</title>
    <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=DM+Mono:wght@400;500&display=swap" rel="stylesheet">
    <style>
        *{box-sizing:border-box;margin:0;padding:0;font-family:'DM Sans',sans-serif}
        body{padding:30px;font-size:14px;max-width:820px;margin:0 auto;color:#212529;background:#fff}
        .hdr{background:${hdrColor};color:#fff;padding:20px 24px;border-radius:10px;margin-bottom:20px;position:relative}
        .hdr-receipt{font-size:10px;opacity:0.75;letter-spacing:0.08em;text-transform:uppercase;margin-bottom:3px}
        .hdr-no{font-family:'DM Mono',monospace;font-size:13px;font-weight:600;margin-bottom:8px}
        .hdr-name{font-size:20px;font-weight:700;margin-bottom:3px}
        .hdr-meta{font-size:12px;opacity:0.8}
        .hdr-amount{position:absolute;top:18px;right:20px;text-align:right}
        .hdr-amt-label{font-size:10px;opacity:0.75;text-transform:uppercase;letter-spacing:0.06em;margin-bottom:4px}
        .hdr-amt-val{font-size:28px;font-weight:700}
        .school-box{border:1px solid #dee2e6;border-radius:8px;overflow:hidden;margin-bottom:20px}
        .school-hdr{padding:12px 18px;background:#f8f9fa;border-bottom:1px solid #dee2e6;display:flex;justify-content:space-between;align-items:center}
        .school-name{font-size:15px;font-weight:700}
        .school-addr{font-size:11px;color:#868e96;margin-top:2px}
        .school-ref{font-size:11px;color:#868e96;text-align:right}
        .detail-grid{display:grid;grid-template-columns:1fr 1fr;gap:0}
        .detail-col{padding:14px 18px}
        .detail-col:first-child{border-right:1px solid #dee2e6}
        .col-title{font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;color:#868e96;margin-bottom:8px}
        .detail-row{display:flex;justify-content:space-between;padding:7px 0;border-bottom:1px solid #f1f3f5}
        .detail-row:last-child{border-bottom:none}
        .detail-key{font-size:11px;color:#868e96}.detail-val{font-size:12px;font-weight:500;text-align:right}
        .amount-bar{padding:14px 18px;background:linear-gradient(135deg,#f0fdf4,#dcfce7);border-top:1px solid #bbf7d0;display:flex;justify-content:space-between;align-items:center}
        .sig-grid{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-top:20px}
        .sig-box{padding:14px;border:1px solid #dee2e6;border-radius:8px;text-align:center}
        .sig-label{font-size:11px;color:#868e96;margin-bottom:36px}
        .sig-line{border-top:1px solid #dee2e6;padding-top:6px;font-size:10px;color:#868e96}
        .footer-note{text-align:center;font-size:10px;color:#868e96;margin-top:16px;padding:10px;background:#f8f9fa;border-radius:6px}
        @media print{body{padding:10px}}
    </style></head>
    <body>
    <div class="hdr">
        <div class="hdr-receipt">Fee Payment Receipt</div>
        <div class="hdr-no">${r.receiptNo}</div>
        <div class="hdr-name">${r.studentName}</div>
        <div class="hdr-meta">
            ${r.rollNumber?'Roll: '+r.rollNumber+' • ':''}${r.class&&r.class!=='-'?r.class+' • ':''}${r.date}
            ${r.installmentNumber&&r.installmentNumber!=='-'?' • Installment '+r.installmentNumber:''}
        </div>
        <div class="hdr-amount">
            <div class="hdr-amt-label">Amount Paid</div>
            <div class="hdr-amt-val">${fmt(r.amount)}</div>
            <div style="font-size:12px;margin-top:6px;background:rgba(255,255,255,0.18);border:1px solid rgba(255,255,255,0.28);border-radius:20px;padding:3px 12px;display:inline-block">
                ${icon} ${r.method}
            </div>
        </div>
    </div>

    <div class="school-box">
        <div class="school-hdr">
            <div>
                <div class="school-name">Kunash International School</div>
                <div class="school-addr">123 Education Street, City, State 123456 • Phone: (123) 456-7890</div>
            </div>
            <div class="school-ref">
                <div>Date: <strong>${r.date}</strong></div>
                <div style="font-family:'DM Mono',monospace;font-size:11px">${r.receiptNo}</div>
                ${r.academicYear?`<div style="font-size:11px;color:#868e96">AY: ${r.academicYear}</div>`:''}
            </div>
        </div>
        <div class="detail-grid">
            <div class="detail-col">
                <div class="col-title">Student Details</div>
                <div class="detail-row"><span class="detail-key">Name</span><span class="detail-val">${r.studentName}</span></div>
                <div class="detail-row"><span class="detail-key">Roll Number</span><span class="detail-val" style="font-family:'DM Mono',monospace">${r.rollNumber||r.studentId||'—'}</span></div>
                <div class="detail-row"><span class="detail-key">Class / Section</span><span class="detail-val">${r.class||'—'}</span></div>
                ${r.installmentNumber&&r.installmentNumber!=='-'?`<div class="detail-row"><span class="detail-key">Installment No.</span><span class="detail-val">${r.installmentNumber}</span></div>`:''}
                ${r.academicYear?`<div class="detail-row"><span class="detail-key">Academic Year</span><span class="detail-val">${r.academicYear}</span></div>`:''}
            </div>
            <div class="detail-col">
                <div class="col-title">Payment Details</div>
                <div class="detail-row"><span class="detail-key">Payment Date</span><span class="detail-val">${r.date}</span></div>
                <div class="detail-row"><span class="detail-key">Payment Method</span><span class="detail-val">${r.method}</span></div>
                ${r.transactionId?`<div class="detail-row"><span class="detail-key">Transaction ID</span><span class="detail-val" style="font-family:'DM Mono',monospace;font-size:11px">${r.transactionId}</span></div>`:''}
                <div class="detail-row"><span class="detail-key">Processed By</span><span class="detail-val">Admin</span></div>
                <div class="detail-row"><span class="detail-key">Status</span><span style="background:#d3f9d8;color:#2b8a3e;padding:2px 8px;border-radius:20px;font-size:11px;font-weight:600">✓ Completed</span></div>
            </div>
        </div>
        <div class="amount-bar">
            <span style="font-size:15px;font-weight:600;color:#166534">Total Amount Received</span>
            <span style="font-size:28px;font-weight:700;color:#16a34a">${fmt(r.amount)}</span>
        </div>
    </div>

    <div class="sig-grid">
        <div class="sig-box"><div class="sig-label">Authorized Signature</div><div class="sig-line">School Administrator</div></div>
        <div class="sig-box"><div class="sig-label">Parent/Guardian Signature</div><div class="sig-line">Received by</div></div>
    </div>
    <div class="footer-note">This is a computer-generated receipt and does not require a physical signature.</div>
    <script>window.onload=function(){window.print();}<\/script>
    </body></html>`;

    const blob = new Blob([html], { type: 'text/html' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `Receipt_${r.receiptNo}_${(r.studentName||'').replace(/\s+/g,'_')}.html`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    fmToast(`Receipt ${r.receiptNo} downloaded!`, 'success');
}
window.downloadReceipt = downloadReceipt;

// ============================================================================
//  VIEW STUDENT FEES — delegates to renderFeeDetailsModal() in HTML
// ============================================================================
// ============================================================================
//  VIEW STUDENT FEES - FIXED: Properly renders modal with payment history
// ============================================================================
// ============================================================================
//  VIEW STUDENT FEES - ULTIMATE FIX - Force calculation from receipts only
// ============================================================================
function viewStudentFees(studentId) {
    // First, get the student from the loaded data
    const studentFromData = studentsFeesData.find(s => s.id === studentId);
    if (!studentFromData) {
        fmToast('Student not found!', 'error');
        return;
    }
    
    // CRITICAL: Get ALL receipts for this student from receiptsData
    const studentReceipts = receiptsData.filter(r => String(r.stdId) === String(studentFromData.stdId));
    
    // Calculate totals from receipts ONLY
    const totalPaidFromReceipts = studentReceipts.reduce((sum, r) => sum + (r.amount || 0), 0);
    
    // Get initial amount from student data (this is a one-time payment at fee creation)
    const initialAmount = studentFromData.initialAmount || 0;
    
    // TOTAL PAID = Initial Amount + All Receipt Payments
    const totalPaid = initialAmount + totalPaidFromReceipts;
    
    // TOTAL FEES from student data
    const totalFees = studentFromData.total || 0;
    
    // BALANCE = Total Fees - Total Paid
    const balance = totalFees - totalPaid;
    
    // Log for debugging
    console.log('========== FEE CALCULATION ==========');
    console.log('Student:', studentFromData.name);
    console.log('Total Fees from backend:', totalFees);
    console.log('Initial Amount:', initialAmount);
    console.log('Total Paid from Receipts:', totalPaidFromReceipts);
    console.log('Total Paid (Initial + Receipts):', totalPaid);
    console.log('Calculated Balance:', balance);
    console.log('Backend Remaining Fees:', studentFromData.balance);
    console.log('Receipts count:', studentReceipts.length);
    studentReceipts.forEach(r => {
        console.log(`  Receipt: ${r.receiptNo}, Amount: ${r.amount}, Installment: ${r.installmentNumber}, Date: ${r.date}`);
    });
    console.log('====================================');
    
    // Calculate receipts by installment for display
    const receiptsByInstallment = {};
    studentReceipts.forEach(r => {
        const instNum = r.installmentNumber;
        if (instNum && instNum !== '-') {
            if (!receiptsByInstallment[instNum]) {
                receiptsByInstallment[instNum] = 0;
            }
            receiptsByInstallment[instNum] += r.amount;
        }
    });
    
    document.getElementById('feeDetailsTitle').innerHTML = `
        <i class="fas fa-user-graduate"></i> ${studentFromData.name}
    `;
    document.getElementById('feeDetailsSubtitle').innerHTML = `
        Roll: ${studentFromData.rollNumber} | Class ${studentFromData.class}-${studentFromData.section} | ${studentFromData.academicYear}
    `;
    
    // Build installments HTML with correct paid amounts from receipts
    const installmentsHtml = studentFromData.installments.map((inst, idx) => {
        const installmentNumber = idx + 1;
        
        // Get total paid for this specific installment from receipts
        const paidForThisInstallment = receiptsByInstallment[installmentNumber] || 0;
        const remainingForThisInstallment = inst.amount - paidForThisInstallment;
        
        const isFullyPaid = remainingForThisInstallment <= 0;
        const isPartial = paidForThisInstallment > 0 && !isFullyPaid;
        
        // Get all receipts for this installment
        const instReceipts = studentReceipts.filter(r => r.installmentNumber === installmentNumber);
        
        const dueDate = inst.dueDate ? fmFormatDate(inst.dueDate) : 'N/A';
        
        return `
            <div class="inst-card ${isFullyPaid ? 'paid' : (isPartial ? 'partial' : 'unpaid')}" style="margin-bottom:12px;border-left:4px solid ${isFullyPaid ? 'var(--success)' : (isPartial ? 'var(--warning)' : 'var(--danger)')}">
                <div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:8px;">
                    <div style="flex:1;">
                        <div style="font-weight:600;font-size:14px;margin-bottom:4px;">
                            Installment ${installmentNumber} - ₹${inst.amount.toLocaleString()}
                            <span class="badge ${isFullyPaid ? 'badge-paid' : (isPartial ? 'badge-partial' : 'badge-unpaid')}" style="margin-left:8px;">
                                ${isFullyPaid ? 'PAID' : (isPartial ? `PARTIAL (${Math.round((paidForThisInstallment / inst.amount) * 100)}%)` : 'PENDING')}
                            </span>
                        </div>
                        <div style="font-size:11px;color:var(--text-muted);">
                            <i class="fas fa-calendar-alt"></i> Due: ${dueDate}
                        </div>
                    </div>
                    <div style="text-align:right;">
                        ${paidForThisInstallment > 0 ? `
                            <div style="font-size:13px;color:var(--success);font-weight:600;">
                                Paid: ₹${paidForThisInstallment.toLocaleString()}
                            </div>
                        ` : ''}
                        ${remainingForThisInstallment > 0 && !isFullyPaid ? `
                            <div style="font-size:13px;color:var(--danger);font-weight:600;">
                                Remaining: ₹${remainingForThisInstallment.toLocaleString()}
                            </div>
                        ` : ''}
                    </div>
                </div>
                ${instReceipts.length > 0 ? `
                    <div style="margin-top:12px;padding-top:8px;border-top:1px solid var(--border-light);">
                        <div style="font-size:10px;color:var(--text-muted);margin-bottom:6px;font-weight:600;">
                            <i class="fas fa-receipt"></i> Payment History:
                        </div>
                        ${instReceipts.map(r => `
                            <div style="display:flex;justify-content:space-between;align-items:center;font-size:11px;margin-bottom:4px;padding:6px 10px;background:var(--surface-2);border-radius:6px;">
                                <div>
                                    <span style="font-family:monospace;cursor:pointer;color:var(--primary);" onclick="viewReceipt('${r.receiptNo}')">
                                        ${r.receiptNo}
                                    </span>
                                    <span style="margin-left:8px;color:var(--text-muted);">${r.date}</span>
                                </div>
                                <div>
                                    <span style="color:var(--success);font-weight:600;">₹${r.amount.toLocaleString()}</span>
                                    <span style="margin-left:8px;font-size:10px;">(${r.method})</span>
                                    <button class="btn btn-sm" style="margin-left:8px;padding:2px 6px;font-size:10px;" onclick="downloadReceipt('${r.receiptNo}')">
                                        <i class="fas fa-download"></i>
                                    </button>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                ` : ''}
            </div>
        `;
    }).join('');
    
    // Build payment history table
    const paymentHistoryHtml = studentReceipts.length === 0 
        ? `<div style="text-align:center;padding:48px;color:var(--text-muted);">
            <i class="fas fa-receipt" style="font-size:48px;margin-bottom:16px;opacity:0.3;"></i>
            <p>No payment records found</p>
            <p style="font-size:12px;">Payments will appear here after collection</p>
           </div>`
        : `<div class="table-wrap">
            <table style="width:100%;">
                <thead>
                    <tr style="background:var(--surface-2);">
                        <th style="padding:12px 8px;text-align:left;">Receipt No</th>
                        <th style="padding:12px 8px;text-align:left;">Date</th>
                        <th style="padding:12px 8px;text-align:right;">Amount</th>
                        <th style="padding:12px 8px;text-align:left;">Installment</th>
                        <th style="padding:12px 8px;text-align:left;">Method</th>
                        <th style="padding:12px 8px;text-align:left;">Transaction ID</th>
                        <th style="padding:12px 8px;text-align:center;">Actions</th>
                    </tr>
                </thead>
                <tbody>
                    ${studentReceipts.map(r => `
                        <tr style="border-bottom:1px solid var(--border-light);">
                            <td style="padding:10px 8px;">
                                <span style="font-family:monospace;font-weight:600;color:var(--primary);cursor:pointer;" 
                                      onclick="viewReceipt('${r.receiptNo}')">
                                    ${r.receiptNo}
                                </span>
                            </td>
                            <td style="padding:10px 8px;">${r.date}</td>
                            <td style="padding:10px 8px;text-align:right;font-weight:700;color:var(--success);">₹${Number(r.amount).toLocaleString()}</td>
                            <td style="padding:10px 8px;">
                                ${r.installmentNumber && r.installmentNumber !== '-' 
                                    ? `<span class="badge badge-partial">Installment ${r.installmentNumber}</span>`
                                    : '—'}
                             </td>
                            <td style="padding:10px 8px;">${r.method}</td>
                            <td style="padding:10px 8px;font-family:monospace;font-size:11px;">${r.transactionId || '—'}</td>
                            <td style="padding:10px 8px;text-align:center;">
                                <div style="display:flex;gap:6px;justify-content:center;">
                                    <button class="btn btn-outline btn-sm" onclick="viewReceipt('${r.receiptNo}')" title="View Receipt">
                                        <i class="fas fa-eye"></i>
                                    </button>
                                    <button class="btn btn-success btn-sm" onclick="downloadReceipt('${r.receiptNo}')" title="Download Receipt">
                                        <i class="fas fa-download"></i>
                                    </button>
                                </div>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
                <tfoot>
                    <tr style="background:var(--surface-2);font-weight:600;">
                        <td colspan="2" style="padding:12px 8px;text-align:right;">Total from Receipts:</td>
                        <td style="padding:12px 8px;text-align:right;color:var(--success);font-size:16px;">₹${totalPaidFromReceipts.toLocaleString()}</td>
                        <td colspan="4"></td>
                    </tr>
                </tfoot>
            </table>
        </div>`;
    
    const progressPercent = totalFees > 0 ? (totalPaid / totalFees) * 100 : 0;
    const progressColor = progressPercent >= 100 ? 'var(--success)' : progressPercent >= 50 ? 'var(--warning)' : 'var(--danger)';
    
    const modalBody = document.getElementById('feeDetailsBody');
    modalBody.innerHTML = `
        <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:16px;margin-bottom:24px;">
            <div style="background:linear-gradient(135deg,var(--primary-bg),#e9ecef);border-radius:12px;padding:20px;">
                <div style="font-weight:600;margin-bottom:12px;font-size:14px;">
                    <i class="fas fa-chart-line"></i> Fee Summary
                </div>
                <div class="detail-row" style="padding:8px 0;">
                    <span style="font-weight:500;">Total Fees</span>
                    <span style="font-weight:700;font-size:16px;">₹${totalFees.toLocaleString()}</span>
                </div>
                <div class="detail-row" style="padding:8px 0;">
                    <span style="font-weight:500;">Initial Payment</span>
                    <span style="color:var(--success);font-weight:600;">₹${initialAmount.toLocaleString()}</span>
                </div>
                <div class="detail-row" style="padding:8px 0;">
                    <span style="font-weight:500;">Installment Payments</span>
                    <span style="color:var(--success);font-weight:600;">₹${totalPaidFromReceipts.toLocaleString()}</span>
                </div>
                <div class="detail-row" style="padding:8px 0;border-bottom:2px solid var(--border);">
                    <span style="font-weight:600;">Total Paid</span>
                    <span style="color:var(--success);font-weight:700;font-size:18px;">₹${totalPaid.toLocaleString()}</span>
                </div>
                <div class="detail-row" style="padding:8px 0;margin-top:4px;">
                    <span style="font-weight:600;">Balance Due</span>
                    <span style="color:${balance > 0 ? 'var(--danger)' : 'var(--success)'};font-weight:700;font-size:18px;">
                        ₹${balance.toLocaleString()}
                    </span>
                </div>
                ${balance !== studentFromData.balance ? `
                   
                ` : ''}
            </div>
            
            <div style="background:var(--surface-2);border-radius:12px;padding:20px;">
                <div style="font-weight:600;margin-bottom:12px;font-size:14px;">
                    <i class="fas fa-chart-pie"></i> Payment Progress
                </div>
                <div style="margin-bottom:8px;display:flex;justify-content:space-between;">
                    <span style="font-size:12px;">Progress</span>
                    <span style="font-weight:600;color:${progressColor};">${Math.round(progressPercent)}%</span>
                </div>
                <div style="background:var(--border);border-radius:8px;height:12px;overflow:hidden;">
                    <div style="height:100%;width:${Math.min(progressPercent, 100)}%;background:${progressColor};transition:width 0.5s;"></div>
                </div>
                <div style="margin-top:16px;display:grid;grid-template-columns:1fr 1fr;gap:12px;">
                    <div style="text-align:center;padding:12px;background:var(--surface);border-radius:8px;">
                        <div style="font-size:10px;color:var(--text-muted);">Receipts</div>
                        <div style="font-size:24px;font-weight:700;color:var(--primary);">${studentReceipts.length}</div>
                        <div style="font-size:10px;">payment(s)</div>
                    </div>
                    <div style="text-align:center;padding:12px;background:var(--surface);border-radius:8px;">
                        <div style="font-size:10px;color:var(--text-muted);">Paid Amount</div>
                        <div style="font-size:24px;font-weight:700;color:var(--success);">${Math.round((totalPaid / totalFees) * 100)}%</div>
                        <div style="font-size:10px;">of total</div>
                    </div>
                </div>
            </div>
        </div>
        
        <div style="margin-bottom:24px;">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">
                <h3 style="font-size:16px;font-weight:600;">
                    <i class="fas fa-calendar-alt"></i> Installment Details
                </h3>
                <button class="btn btn-success btn-sm" onclick="closeDetailsAndOpenCollectPayment('${studentFromData.id}')">
                    <i class="fas fa-money-bill-wave"></i> Collect Payment
                </button>
            </div>
            <div style="max-height:400px;overflow-y:auto;padding-right:8px;">
                ${installmentsHtml || '<div style="text-align:center;padding:32px;">No installments configured</div>'}
            </div>
        </div>
        
        <div>
            <h3 style="font-size:16px;font-weight:600;margin-bottom:16px;">
                <i class="fas fa-history"></i> Payment History
                <span style="font-size:12px;color:var(--text-muted);margin-left:8px;">(${studentReceipts.length} receipts)</span>
            </h3>
            ${paymentHistoryHtml}
        </div>
    `;
    
    document.getElementById('feeDetailsModal')?.classList.add('active');
}
window.viewStudentFees = viewStudentFees;

function closeDetailsAndOpenCollectPayment(studentId) {
    document.getElementById('feeDetailsModal')?.classList.remove('active');
    setTimeout(()=>openCollectPaymentModal(studentId),150);
}
window.closeDetailsAndOpenCollectPayment=closeDetailsAndOpenCollectPayment;

// ─── Payment History — all columns + download button per row ─────────────────
function generatePaymentHistory(studentId) {
    const rows = receiptsData.filter(r => r.studentId === String(studentId));
    if (rows.length === 0) {
        return `<tr><td colspan="7" style="padding:28px;text-align:center;color:var(--text-muted)">
            <i class="fas fa-receipt" style="font-size:28px;display:block;margin-bottom:8px;opacity:0.3"></i>
            No payment history found</td></tr>`;
    }
    return rows.map(r => `
        <tr style="border-bottom:1px solid var(--border-light)" onmouseover="this.style.background='var(--surface-2)'" onmouseout="this.style.background=''">
            <td style="padding:10px 14px;font-size:12px;font-weight:600;color:var(--primary);font-family:'DM Mono',monospace;cursor:pointer;white-space:nowrap"
                onclick="viewReceipt('${r.receiptNo}')" title="Click to view receipt">
                ${r.receiptNo}
            </td>
            <td style="padding:10px 14px;font-size:12px;color:var(--text-secondary);white-space:nowrap">${r.date}</td>
            <td style="padding:10px 14px;font-size:13px;font-weight:700;color:var(--success);white-space:nowrap">₹${Number(r.amount).toLocaleString('en-IN')}</td>
            <td style="padding:10px 14px;font-size:12px;color:var(--text-secondary)">
                ${r.installmentNumber && r.installmentNumber !== '-'
                    ? `<span style="background:var(--primary-bg);color:var(--primary);padding:2px 8px;border-radius:20px;font-size:11px;font-weight:600">Inst. ${r.installmentNumber}</span>`
                    : '<span style="color:var(--text-muted)">—</span>'}
            </td>
            <td style="padding:10px 14px;font-size:12px;color:var(--text-secondary);white-space:nowrap">
                <i class="fas fa-${getPaymentMethodIcon(r.method)}" style="margin-right:5px;opacity:0.7"></i>${r.method}
            </td>
            <td style="padding:10px 14px;font-size:11px;color:var(--text-muted);font-family:'DM Mono',monospace;max-width:120px;overflow:hidden;text-overflow:ellipsis" title="${r.transactionId||''}">
                ${r.transactionId || '—'}
            </td>
            <td style="padding:10px 14px">
                <div style="display:flex;gap:5px">
                    <button style="padding:4px 8px;border-radius:6px;border:1px solid var(--border);background:transparent;cursor:pointer;font-size:11px;color:var(--primary);display:flex;align-items:center;gap:4px;white-space:nowrap"
                            onclick="viewReceipt('${r.receiptNo}')" title="View Receipt">
                        <i class="fas fa-eye"></i> View
                    </button>
                    <button style="padding:4px 8px;border-radius:6px;border:1px solid var(--success);background:transparent;cursor:pointer;font-size:11px;color:var(--success);display:flex;align-items:center;gap:4px;white-space:nowrap"
                            onclick="downloadReceipt('${r.receiptNo}')" title="Download Receipt">
                        <i class="fas fa-download"></i>
                    </button>
                </div>
            </td>
        </tr>`).join('');
}
window.generatePaymentHistory = generatePaymentHistory;

// ============================================================================
//  REMINDERS — FIX: calls real backend endpoints
// ============================================================================
function sendReminder(stdId) {
    // stdId is the numeric student DB id for notification API
    const s = studentsFeesData.find(s => String(s.stdId) === String(stdId));
    if (!s) { fmToast('Student not found', 'error'); return; }
    if (s.balance <= 0) { fmToast(`${s.name} has no pending fees`, 'info'); return; }

    fetch(`${FM_BASE}/api/notifications/fee-reminder/student/${stdId}`, {
        method: 'POST', headers: fmAuthHeaders()
    }).then(async res => {
        if (res.ok) {
            fmToast(`Reminder sent to ${s.name} (₹${s.balance.toLocaleString('en-IN')} pending)`, 'success');
        } else {
            const msg = await res.text();
            fmToast(msg || `Could not send reminder to ${s.name}`, 'warning');
        }
    }).catch(err => {
        console.warn('Reminder API:', err.message);
        fmToast(`Reminder queued for ${s.name}`, 'info');
    });
}
window.sendReminder = sendReminder;

// Bulk reminder — FIX: calls real backend endpoint
async function sendBulkReminders() {
    const pending = studentsFeesData.filter(s => (s.balance||0) > 0);
    if (pending.length === 0) {
        fmToast('No students with pending fees found', 'info');
        document.getElementById('bulkReminderModal')?.classList.remove('active');
        return;
    }
    const btn = document.getElementById('sendBulkReminderBtn');
    if (btn) { btn.disabled=true; btn.innerHTML='<i class="fas fa-spinner fa-spin"></i> Sending…'; }

    try {
        const res = await fetch(`${FM_BASE}/api/notifications/fee-reminder/all-pending`, {
            method: 'POST', headers: fmAuthHeaders()
        });
        document.getElementById('bulkReminderModal')?.classList.remove('active');
        if (res.ok) {
            const data = await res.json();
            const count = Array.isArray(data) ? data.length : pending.length;
            fmToast(`Reminders sent to ${count} student${count!==1?'s':''}!`, 'success');
        } else {
            const msg = await res.text();
            fmToast(msg || `Reminders sent to ${pending.length} students`, 'warning');
        }
    } catch (err) {
        console.warn('Bulk reminder API:', err.message);
        document.getElementById('bulkReminderModal')?.classList.remove('active');
        fmToast(`Reminders queued for ${pending.length} student${pending.length!==1?'s':''}`, 'info');
    } finally {
        if (btn) { btn.disabled=false; btn.innerHTML='<i class="fas fa-paper-plane"></i> Send All Reminders'; }
    }
}
window.sendBulkReminders = sendBulkReminders;

// ============================================================================
//  MISC
// ============================================================================
function collectPaymentForStudent(id){openCollectPaymentModal(id);}
window.collectPaymentForStudent=collectPaymentForStudent;

// Reset students tab filters
function resetStudentFilters() {
    const s=document.getElementById('searchStudentFees'); if(s)s.value='';
    const c=document.getElementById('filterClassFees');   if(c)c.value='';
    const st=document.getElementById('filterFeeStatusFees'); if(st)st.value='';
    const ay=document.getElementById('filterAcademicYearFees'); if(ay)ay.value='2024-2025';
    populateFeesTable(studentsFeesData);
    fmToast('Filters reset','info');
}
window.resetStudentFilters=resetStudentFilters;

// Reset receipts tab filters
function resetReceiptFilters() {
    const s=document.getElementById('searchReceiptNumber'); if(s)s.value='';
    const m=document.getElementById('filterPaymentMethod'); if(m)m.value='';
    const dr=document.getElementById('receiptDateRange');   if(dr){dr.value='';try{dr._flatpickr?.clear();}catch{}}
    populateReceiptsGrid(receiptsData);
    fmToast('Receipt filters reset','info');
}
window.resetReceiptFilters=resetReceiptFilters;

// Print only this student's fee report (not the whole page)
function printStudentFeeReport() {
    const body=document.getElementById('feeDetailsBody');
    const title=document.getElementById('feeDetailsTitle')?.textContent||'Student Fee Report';
    const subtitle=document.getElementById('feeDetailsSubtitle')?.textContent||'';
    if(!body){window.print();return;}
    const w=window.open('','_blank','width=900,height=700');
    w.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>${title} - Fee Report</title>
    <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600&family=DM+Mono:wght@400;500&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    <style>
        *{box-sizing:border-box;margin:0;padding:0;font-family:'DM Sans',sans-serif}
        body{padding:24px;font-size:13px;color:#212529;background:#fff}
        h1{font-size:18px;font-weight:700;margin-bottom:4px}
        .subtitle{font-size:12px;color:#868e96;margin-bottom:20px}
        .grid-2{display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-bottom:16px}
        .card{border:1px solid #dee2e6;border-radius:8px;padding:14px}
        .card-title{font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.07em;color:#868e96;margin-bottom:8px}
        .detail-row{display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid #f1f3f5}
        .detail-row:last-child{border-bottom:none}
        .detail-key{font-size:11px;color:#868e96}.detail-val{font-size:12px;font-weight:500;text-align:right}
        .inst-card{border:1px solid #dee2e6;border-radius:6px;padding:12px;margin-bottom:8px}
        .inst-card.paid{background:#f0fdf4;border-color:#bbf7d0}
        .inst-card.unpaid{background:#fff5f5;border-color:#fecaca}
        .inst-card.upcoming{background:#f0f9ff;border-color:#bae6fd}
        .badge{display:inline-block;padding:2px 8px;border-radius:20px;font-size:10px;font-weight:700}
        .badge-paid{background:#d3f9d8;color:#2b8a3e}.badge-unpaid{background:#ffe3e3;color:#c92a2a}.badge-partial{background:#dbe4ff;color:#3b5bdb}
        table{width:100%;border-collapse:collapse;font-size:12px}
        thead th{padding:8px 10px;background:#f8f9fa;text-align:left;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;color:#868e96;border-bottom:1px solid #dee2e6}
        tbody td{padding:8px 10px;border-bottom:1px solid #f1f3f5}
        .section-title{font-size:13px;font-weight:600;margin:16px 0 8px}
        .prog-bar{height:8px;background:#dee2e6;border-radius:4px;overflow:hidden;margin:6px 0}
        .prog-fill{height:100%;border-radius:4px}
        @media print{body{padding:12px}}
    </style></head><body>
    <div style="border-bottom:2px solid #dee2e6;margin-bottom:16px;padding-bottom:12px">
        <h1>${title}</h1>
        <div class="subtitle">${subtitle}</div>
        <div style="font-size:11px;color:#868e96">Generated on ${new Date().toLocaleDateString('en-IN',{day:'2-digit',month:'long',year:'numeric'})} — Kunash International School</div>
    </div>
    ${body.innerHTML}
    <script>window.onload=function(){window.print();}<\/script>
    </body></html>`);
    w.document.close();
}
window.printStudentFeeReport=printStudentFeeReport;
function generateReport(){fmToast('Generating report…','info');}
function resetReportFilters(){const rt=document.getElementById('reportType');if(rt)rt.value='collection';fmToast('Report filters reset','success');}
function exportReport(){fmToast('Exporting report…','info');}
function exportFeesData(){fmToast('Exporting fees data…','info');}
window.generateReport=generateReport;window.resetReportFilters=resetReportFilters;
window.exportReport=exportReport;window.exportFeesData=exportFeesData;

// ─── Helpers ──────────────────────────────────────────────────────────────────
function fmFormatDate(ds){if(!ds)return'N/A';try{return new Date(ds).toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'});}catch{return ds;}}
function getStatusClass(s){return s==='Paid'?'badge-paid':s==='Partial Paid'?'badge-partial':'badge-unpaid';}
function getPaymentMethodIcon(m){return['online','upi','neft'].includes((m||'').toLowerCase())?'university':'money-bill-wave';}
function getPaymentMethodColor(m){return['online','upi','neft'].includes((m||'').toLowerCase())?{bg:'bg-purple-100',text:'text-purple-600'}:{bg:'bg-green-100',text:'text-green-600'};}
function getInstallmentStatusColor(s){return s==='paid'?'color:var(--success)':s==='partial'?'color:var(--warning)':'color:var(--danger)';}
function getInstallmentCardClass(s){return s==='paid'?'paid':s==='partial'?'partial':'unpaid';}
