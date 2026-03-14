// ============================================================================
// FEES MANAGEMENT MODULE - BACKEND INTEGRATED
// Base URL: http://localhost:8084
// Design is UNCHANGED — only data source is now the real backend
// ============================================================================

const FM_BASE = 'http://localhost:8084';

// ─── Global State ────────────────────────────────────────────────────────────
let currentFeesTab            = 'students';
let selectedStudentForPayment = null;
let receiptsData              = [];          // from backend transactions
let studentsFeesData          = [];          // from backend fees list
let selectedInstallmentForPayment   = null;
let currentSelectedInstallmentIndex = -1;
let customAmountInstallment   = null;
let qrCodeInstance            = null;

// ─── Auth Helper ─────────────────────────────────────────────────────────────
function fmAuthHeaders(json = false) {
    const token = localStorage.getItem('admin_jwt_token');
    const h = { 'Authorization': `Bearer ${token}` };
    if (json) h['Content-Type'] = 'application/json';
    return h;
}

// ─── Toast Helper ────────────────────────────────────────────────────────────
function showToast(message, type = 'info') {
    const toastContainer = document.getElementById('toastContainer');
    const toast = document.createElement('div');
    toast.className = `toast ${
        type === 'success' ? 'bg-green-100 border border-green-200 text-green-800' :
        type === 'error'   ? 'bg-red-100 border border-red-200 text-red-800' :
                             'bg-blue-100 border border-blue-200 text-blue-800'}`;
    toast.innerHTML = `
        <div class="flex items-center">
            <i class="fas ${
                type === 'success' ? 'fa-check-circle' :
                type === 'error'   ? 'fa-exclamation-circle' : 'fa-info-circle'} mr-3"></i>
            <div>${message}</div>
        </div>`;
    toastContainer.appendChild(toast);
    setTimeout(() => toast.classList.add('show'), 10);
    setTimeout(() => { toast.classList.remove('show'); setTimeout(() => toast.remove(), 300); }, 5000);
}

function showLoading(show) {
    document.getElementById('loadingOverlay')?.classList.toggle('hidden', !show);
}

// ============================================================================
//  INIT
// ============================================================================
document.addEventListener('DOMContentLoaded', function () {
    initializeSidebar();
    initializeDatePickers();
    loadFeesData();          // ← real backend call
    setupEventListeners();

    const urlParams = new URLSearchParams(window.location.search);
    const view = urlParams.get('view');
    if (view) {
        const map = { structure: 'students', history: 'receipts', reports: 'reports' };
        if (map[view]) switchFeesTab(map[view]);
    }
});

// ============================================================================
//  SIDEBAR + DROPDOWNS + DATE PICKERS  (unchanged from original)
// ============================================================================
function initializeSidebar() {
    const sidebar       = document.getElementById('sidebar');
    const sidebarToggle = document.getElementById('sidebarToggle');
    const sidebarToggleIcon = document.getElementById('sidebarToggleIcon');
    const mainContent   = document.getElementById('mainContent');
    const sidebarOverlay = document.getElementById('sidebarOverlay');

    sidebarToggle.addEventListener('click', function () {
        if (window.innerWidth < 1024) {
            sidebar.classList.toggle('mobile-open');
            sidebarOverlay.classList.toggle('active');
        } else {
            sidebar.classList.toggle('collapsed');
            mainContent.classList.toggle('sidebar-collapsed');
            sidebarToggleIcon.classList.toggle('fa-bars');
            sidebarToggleIcon.classList.toggle('fa-times');
        }
    });
    sidebarOverlay.addEventListener('click', function () {
        sidebar.classList.remove('mobile-open');
        sidebarOverlay.classList.remove('active');
    });
    initializeDropdowns();
}

function initializeDropdowns() {
    const notificationsBtn      = document.getElementById('notificationsBtn');
    const notificationsDropdown = document.getElementById('notificationsDropdown');
    const userMenuBtn           = document.getElementById('userMenuBtn');
    const userMenuDropdown      = document.getElementById('userMenuDropdown');

    notificationsBtn.addEventListener('click', function (e) {
        e.stopPropagation();
        notificationsDropdown.classList.toggle('hidden');
        userMenuDropdown.classList.add('hidden');
    });
    userMenuBtn.addEventListener('click', function (e) {
        e.stopPropagation();
        userMenuDropdown.classList.toggle('hidden');
        notificationsDropdown.classList.add('hidden');
    });
    document.addEventListener('click', function () {
        notificationsDropdown.classList.add('hidden');
        userMenuDropdown.classList.add('hidden');
    });
}

function initializeDatePickers() {
    flatpickr('#receiptDateRange', { mode: 'range', dateFormat: 'Y-m-d' });
    flatpickr('#reportDateRange',  { mode: 'range', dateFormat: 'Y-m-d' });
    document.getElementById('paymentDate').value = new Date().toISOString().split('T')[0];
}

function setupEventListeners() {
    document.querySelectorAll('input[name="paymentMethodModal"]').forEach(r => {
        r.addEventListener('change', function () { togglePaymentMethodDetails(this.value); });
    });

    document.getElementById('studentSearchInput').addEventListener('input', function () {
        searchStudents(this.value);
    });

    document.getElementById('customPaymentAmount').addEventListener('input', function () {
        const max = customAmountInstallment
            ? customAmountInstallment.amount - (customAmountInstallment.paid || 0) : 0;
        if (parseInt(this.value) > max) this.value = max;
        updateRemainingAmountDisplay();
    });

    document.getElementById('paymentAmount').addEventListener('input', function () {
        updatePaymentSummary();
        const method = document.querySelector('input[name="paymentMethodModal"]:checked').value;
        if (method === 'online' && this.value) generateQRCodeForPayment();
    });

    document.querySelectorAll('input[name="paymentMethodModal"]').forEach(r => {
        r.addEventListener('change', function () {
            if (this.value === 'online' && document.getElementById('paymentAmount').value) {
                generateQRCodeForPayment();
            }
        });
    });

    document.getElementById('searchStudentFees').addEventListener('input', filterFeesTable);
    document.getElementById('filterClassFees').addEventListener('change', filterFeesTable);
    document.getElementById('filterFeeStatusFees').addEventListener('change', filterFeesTable);
}

// ============================================================================
//  LOAD DATA FROM BACKEND
// ============================================================================
async function loadFeesData() {
    showLoading(true);
    try {
        // 1. Fetch all fees from backend
        const feesRes = await fetch(`${FM_BASE}/api/fees/get-all-fees`, { headers: fmAuthHeaders() });
        if (!feesRes.ok) throw new Error('Failed to load fees');
        const allFees = await feesRes.json();

        // 2. Map backend FeesResponseDto → internal student object
        studentsFeesData = allFees.map(f => mapFeesToStudent(f));

        populateFeesTable(studentsFeesData);
        updateFeesStats();

        // 3. Fetch transactions for receipts tab
        const txRes = await fetch(`${FM_BASE}/api/transaction/get-all-transactions`, { headers: fmAuthHeaders() });
        if (txRes.ok) {
            const txList = await txRes.json();
            receiptsData = txList.map(t => mapTransactionToReceipt(t));
            populateReceiptsGrid(receiptsData);
        }

    } catch (err) {
        console.error('loadFeesData error:', err);
        showToast('Failed to load fees data: ' + err.message, 'error');
    } finally {
        showLoading(false);
    }
}

// Map FeesResponseDto → internal format used by the UI
function mapFeesToStudent(f) {
    const insts = (f.installmentsList || []).map(i => ({
        installmentId: i.installmentId,
        amount:        i.amount        || 0,
        paid:          i.status === 'PAID' ? (i.amount || 0) : (i.addonAmount > 0 ? i.addonAmount : 0),
        dueDate:       i.dueDate       || null,
        paidDate:      i.paidDate      || null,
        status:        (i.status || 'PENDING').toLowerCase(),   // keep lowercase for UI
        paymentMode:   i.paymentMode   || null,
        transactionReference: i.transactionReference || null,
        addonAmount:   i.addonAmount   || 0
    }));

    const totalPaid = (f.initialAmount || 0) +
        insts.filter(i => i.status === 'paid').reduce((s, i) => s + i.amount, 0);

    return {
        // IDs
        feesId:    f.id,
        stdId:     f.studentId,
        id:        f.studentRollNumber || String(f.studentId),

        // Display
        name:      f.studentName       || 'Unknown',
        parent:    'Parent',
        class:     f.studentClass      || '-',
        section:   f.studentSection    || '-',

        // Money
        total:     f.totalFees         || 0,
        paid:      totalPaid,
        balance:   f.remainingFees     || 0,
        initialAmount: f.initialAmount || 0,

        // Status
        status:    mapPaymentStatus(f.paymentStatus),

        // Fee breakdown
        admissionFees: f.admissionFees || 0,
        uniformFees:   f.uniformFees   || 0,
        bookFees:      f.bookFees       || 0,
        tuitionFees:   f.tuitionFees   || 0,
        additionalFeesList: f.additionalFeesList || {},
        paymentMode:   f.paymentMode   || '-',
        academicYear:  f.academicYear  || '-',
        cashierName:   f.cashierName   || '-',
        transactionId: f.transactionId || '',

        // Installments
        installments: insts
    };
}

function mapPaymentStatus(backendStatus) {
    const s = (backendStatus || '').toUpperCase();
    if (s === 'FULLY PAID')    return 'Paid';
    if (s === 'PARTIALLY PAID') return 'Partial Paid';
    return 'Unpaid';
}

// Map TransactionEntity → receipt display object
function mapTransactionToReceipt(t) {
    const inst = t.installment || {};
    return {
        receiptNo:   'TXN-' + t.transId,
        studentName: 'Student #' + (t.studentId || ''),
        studentId:   String(t.studentId || ''),
        class:       '-',
        amount:      t.amountPaid || 0,
        date:        t.paymentDate
            ? new Date(t.paymentDate).toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' })
            : '-',
        method:      t.paymentMode
            ? t.paymentMode.charAt(0).toUpperCase() + t.paymentMode.slice(1).toLowerCase()
            : 'Cash',
        bankName:    '-',
        transactionId: t.transactionId || '',
        installmentNumber: inst.installmentId || '-',
        remarks:     t.remarks || ''
    };
}

// ============================================================================
//  TABS
// ============================================================================
function switchFeesTab(tabName) {
    document.querySelectorAll('.tab-button').forEach(btn => btn.classList.remove('active'));
    document.getElementById(`${tabName}Tab`).classList.add('active');
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
    document.getElementById(`${tabName}TabContent`).classList.add('active');
    currentFeesTab = tabName;
}

// ============================================================================
//  FEES TABLE
// ============================================================================
function populateFeesTable(students) {
    const tbody = document.getElementById('feesTableBody');
    tbody.innerHTML = '';

    if (!students || students.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" class="px-6 py-12 text-center text-gray-500">
            <i class="fas fa-inbox text-4xl mb-3 text-gray-300 block"></i>No fee records found</td></tr>`;
        return;
    }

    students.forEach(student => {
        const statusClass     = getStatusClass(student.status);
        const progressPercent = student.total > 0 ? (student.paid / student.total) * 100 : 0;

        // Installment summary pills
        const insts       = student.installments || [];
        const paidInsts   = insts.filter(i => i.status === 'paid').length;
        const pendInsts   = insts.filter(i => i.status !== 'paid').length;
        const instPills   = insts.length > 0 ? `
            <div style="display:flex;gap:4px;margin-top:4px;flex-wrap:wrap;">
                <span style="background:#d1fae5;color:#065f46;font-size:10px;font-weight:700;padding:1px 7px;border-radius:999px;">✓ ${paidInsts} Paid</span>
                ${pendInsts > 0 ? `<span style="background:#fee2e2;color:#991b1b;font-size:10px;font-weight:700;padding:1px 7px;border-radius:999px;">⏳ ${pendInsts} Pending</span>` : ''}
            </div>` : '';

        const tr = document.createElement('tr');
        tr.className = 'hover:bg-gray-50 transition-all duration-200';
        tr.innerHTML = `
            <td class="px-4 lg:px-6 py-4">
                <div class="flex items-center">
                    <div class="h-10 w-10 bg-blue-100 rounded-full flex items-center justify-center mr-3">
                        <i class="fas fa-user-graduate text-blue-600"></i>
                    </div>
                    <div>
                        <p class="font-medium text-gray-800">${student.name}</p>
                        <p class="text-sm text-gray-600">ID: ${student.id}</p>
                    </div>
                </div>
            </td>
            <td class="px-4 lg:px-6 py-4">
                <span class="font-medium text-gray-800">Class ${student.class}</span>
                <p class="text-sm text-gray-600">Section ${student.section}</p>
            </td>
            <td class="px-4 lg:px-6 py-4">
                <p class="font-semibold text-gray-800">₹${student.total.toLocaleString('en-IN')}</p>
            </td>
            <td class="px-4 lg:px-6 py-4">
                <p class="font-medium text-green-600">₹${student.paid.toLocaleString('en-IN')}</p>
                <div class="progress-bar w-24 mt-1">
                    <div class="progress-fill ${progressPercent >= 100 ? 'bg-green-500' : progressPercent >= 50 ? 'bg-yellow-500' : 'bg-red-500'}"
                         style="width:${Math.min(progressPercent, 100)}%"></div>
                </div>
                ${instPills}
            </td>
            <td class="px-4 lg:px-6 py-4">
                <p class="font-medium ${student.balance > 0 ? 'text-red-600' : 'text-green-600'}">
                    ₹${student.balance.toLocaleString('en-IN')}
                </p>
            </td>
            <td class="px-4 lg:px-6 py-4">
                <span class="status-badge ${statusClass}">${student.status}</span>
            </td>
            <td class="px-4 lg:px-6 py-4">
                <div class="flex space-x-2">
                    <button onclick="viewStudentFees('${student.id}')"
                        class="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-all duration-200" title="View Details">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button onclick="collectPaymentForStudent('${student.id}')"
                        class="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-all duration-200" title="Collect Payment">
                        <i class="fas fa-money-bill-wave"></i>
                    </button>
                    <button onclick="sendReminder('${student.id}')"
                        class="p-2 text-yellow-600 hover:bg-yellow-50 rounded-lg transition-all duration-200" title="Send Reminder">
                        <i class="fas fa-bell"></i>
                    </button>
                </div>
            </td>`;
        tbody.appendChild(tr);
    });
}

function filterFeesTable() {
    const search  = document.getElementById('searchStudentFees').value.toLowerCase();
    const cls     = document.getElementById('filterClassFees').value;
    const status  = document.getElementById('filterFeeStatusFees').value;

    const filtered = studentsFeesData.filter(s => {
        const matchSearch = !search ||
            s.name.toLowerCase().includes(search) ||
            s.id.toLowerCase().includes(search);
        const matchClass  = !cls    || s.class === cls;
        const matchStatus = !status ||
            (status === 'paid'    && s.status === 'Paid')         ||
            (status === 'partial' && s.status === 'Partial Paid') ||
            (status === 'unpaid'  && s.status === 'Unpaid');
        return matchSearch && matchClass && matchStatus;
    });

    populateFeesTable(filtered);
}

// ============================================================================
//  STATS
// ============================================================================
function updateFeesStats() {
    let totalCollected = 0, totalPending = 0;
    studentsFeesData.forEach(s => {
        totalCollected += s.paid;
        if (s.balance > 0) totalPending += s.balance;
    });
    document.getElementById('totalFeesCollected').textContent = '₹' + totalCollected.toLocaleString('en-IN');
    document.getElementById('pendingPayments').textContent    = '₹' + totalPending.toLocaleString('en-IN');
}

// ============================================================================
//  RECEIPTS  (from backend transactions)
// ============================================================================
function populateReceiptsGrid(receipts) {
    const grid     = document.getElementById('receiptsGrid');
    const noMsg    = document.getElementById('noReceiptsMessage');

    if (!receipts || receipts.length === 0) {
        grid.classList.add('hidden');
        noMsg.classList.remove('hidden');
        return;
    }

    grid.classList.remove('hidden');
    noMsg.classList.add('hidden');
    grid.innerHTML = '';

    receipts.forEach(receipt => {
        const methodIcon  = getPaymentMethodIcon(receipt.method);
        const methodColor = getPaymentMethodColor(receipt.method);
        const card = document.createElement('div');
        card.className = 'bg-white border border-gray-200 rounded-xl p-5 receipt-item';
        card.innerHTML = `
            <div class="flex justify-between items-start mb-4">
                <div>
                    <p class="text-sm font-semibold text-gray-600">${receipt.receiptNo}</p>
                    <p class="text-lg font-bold text-gray-800">${receipt.studentName}</p>
                    <p class="text-sm text-gray-600">${receipt.class} | ${receipt.date}</p>
                </div>
                <div class="text-right">
                    <p class="text-xl font-bold text-green-600">₹${Number(receipt.amount).toLocaleString('en-IN')}</p>
                    <span class="inline-block px-3 py-1 text-xs font-medium rounded-full ${methodColor.bg} ${methodColor.text}">
                        <i class="fas fa-${methodIcon} mr-1"></i>${receipt.method}
                    </span>
                </div>
            </div>
            <div class="border-t border-gray-100 pt-4">
                <button onclick="viewReceipt('${receipt.receiptNo}')"
                        class="w-full px-4 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-all duration-200 text-sm font-medium">
                    <i class="fas fa-eye mr-2"></i>View Receipt
                </button>
            </div>`;
        grid.appendChild(card);
    });
}

function filterReceipts() {
    showToast('Filtering receipts...', 'info');
    populateReceiptsGrid(receiptsData);
}

// ============================================================================
//  COLLECT PAYMENT MODAL
// ============================================================================
function openCollectPaymentModal(studentId = null) {
    const modal = document.getElementById('collectPaymentModalOverlay');
    modal.classList.add('show');

    // Reset
    document.getElementById('installmentSelectionSection').classList.add('hidden');
    document.getElementById('selectedInstallmentDetails').classList.add('hidden');
    document.getElementById('paymentAmount').value = '';
    document.getElementById('transactionId').value = '';
    document.getElementById('bankName').value       = '';
    document.getElementById('qrCodeSection').classList.add('hidden');
    document.getElementById('qrCodeContainer').innerHTML = '';

    document.querySelector('input[name="paymentMethodModal"][value="cash"]').checked = true;
    togglePaymentMethodDetails('cash');

    selectedStudentForPayment       = null;
    selectedInstallmentForPayment   = null;
    currentSelectedInstallmentIndex = -1;
    qrCodeInstance = null;

    if (studentId) {
        const student = studentsFeesData.find(s => s.id === studentId);
        if (student) selectStudentForPayment(student);
    }

    updatePaymentSummary();
}

function closeCollectPaymentModal() {
    document.getElementById('collectPaymentModalOverlay').classList.remove('show');
    selectedStudentForPayment       = null;
    selectedInstallmentForPayment   = null;
    currentSelectedInstallmentIndex = -1;
    qrCodeInstance = null;

    document.getElementById('studentSearchResults').classList.add('hidden');
    document.getElementById('selectedStudentInfo').classList.add('hidden');
    document.getElementById('studentSearchInput').value = '';
    document.getElementById('installmentOptionsContainer').innerHTML = '';
    document.getElementById('installmentSelectionSection').classList.add('hidden');
    document.getElementById('selectedInstallmentDetails').classList.add('hidden');
    document.getElementById('qrCodeSection').classList.add('hidden');
    document.getElementById('qrCodeContainer').innerHTML = '';
}

// ─── Student Search ───────────────────────────────────────────────────────────
function searchStudents(query) {
    const resultsContainer = document.getElementById('studentSearchResults');
    if (query.length < 2) { resultsContainer.classList.add('hidden'); return; }

    const filtered = studentsFeesData.filter(s =>
        s.name.toLowerCase().includes(query.toLowerCase()) ||
        s.id.toLowerCase().includes(query.toLowerCase())
    );

    if (filtered.length === 0) {
        resultsContainer.innerHTML = '<div class="p-3 text-center text-gray-500">No students found</div>';
        resultsContainer.classList.remove('hidden');
        return;
    }

    resultsContainer.innerHTML = filtered.map(s => `
        <div class="p-3 border-b border-gray-100 hover:bg-gray-50 cursor-pointer"
             onclick='selectStudentForPayment(${JSON.stringify(s).replace(/'/g, "&#39;")})'>
            <div class="flex justify-between items-center">
                <div>
                    <p class="font-medium text-gray-800">${s.name}</p>
                    <p class="text-sm text-gray-600">Class ${s.class}-${s.section} | ID: ${s.id}</p>
                </div>
                <div class="text-right">
                    <p class="text-sm font-medium ${s.balance > 0 ? 'text-red-600' : 'text-green-600'}">
                        Balance: ₹${s.balance.toLocaleString('en-IN')}
                    </p>
                </div>
            </div>
        </div>`).join('');
    resultsContainer.classList.remove('hidden');
}

function selectStudentForPayment(student) {
    selectedStudentForPayment       = student;
    selectedInstallmentForPayment   = null;
    currentSelectedInstallmentIndex = -1;

    document.getElementById('studentSearchInput').value = student.name;
    document.getElementById('studentSearchResults').classList.add('hidden');

    const info = document.getElementById('selectedStudentInfo');
    info.classList.remove('hidden');
    info.innerHTML = `
        <div class="flex justify-between items-center">
            <div>
                <p class="font-medium text-gray-800">${student.name}</p>
                <p class="text-sm text-gray-600">Class ${student.class}-${student.section}</p>
            </div>
            <div class="text-right">
                <p class="text-sm">Total: <span class="font-medium">₹${student.total.toLocaleString('en-IN')}</span></p>
                <p class="text-sm">Paid: <span class="font-medium text-green-600">₹${student.paid.toLocaleString('en-IN')}</span></p>
                <p class="text-sm">Balance: <span class="font-medium text-red-600">₹${student.balance.toLocaleString('en-IN')}</span></p>
            </div>
        </div>`;

    showInstallmentOptions(student);
}

// ─── Installment Options ──────────────────────────────────────────────────────
function showInstallmentOptions(student) {
    const section   = document.getElementById('installmentSelectionSection');
    const container = document.getElementById('installmentOptionsContainer');
    section.classList.remove('hidden');
    container.innerHTML = '';

    const insts = student.installments || [];
    if (insts.length === 0) {
        container.innerHTML = `<div class="text-center py-4 text-gray-500">
            <i class="fas fa-calendar-times text-2xl mb-2 block"></i>No installments for this student</div>`;
        return;
    }

    const today = new Date(); today.setHours(0,0,0,0);

    insts.forEach((inst, index) => {
        const dueDate  = inst.dueDate ? new Date(inst.dueDate) : null;
        const remaining = inst.amount - (inst.paid || 0);
        const payableIdx = findFirstPayableInstallmentIndex(insts);
        const isPayable  = index === payableIdx && remaining > 0 && inst.status !== 'paid';

        const div = document.createElement('div');
        div.className = `installment-option ${isPayable ? '' : 'disabled'}`;
        if (index === currentSelectedInstallmentIndex) div.classList.add('selected');

        div.innerHTML = `
            <div class="flex justify-between items-center">
                <div>
                    <p class="font-medium text-gray-800">Installment ${index + 1}</p>
                    <div class="flex items-center space-x-2 mt-1">
                        <span class="text-sm ${getInstallmentStatusColor(inst.status)}">${inst.status.toUpperCase()}</span>
                        <span class="text-xs text-gray-500">•</span>
                        <span class="text-sm text-gray-600">Due: ${inst.dueDate ? formatDate(inst.dueDate) : 'N/A'}</span>
                    </div>
                </div>
                <div class="text-right">
                    <p class="font-bold text-gray-800">₹${inst.amount.toLocaleString('en-IN')}</p>
                    ${remaining > 0 ? `<p class="text-sm text-red-600">Remaining: ₹${remaining.toLocaleString('en-IN')}</p>` : ''}
                </div>
            </div>`;

        if (isPayable) div.onclick = () => selectInstallmentForPayment(index);
        container.appendChild(div);
    });
}

function findFirstPayableInstallmentIndex(insts) {
    const today = new Date(); today.setHours(0,0,0,0);
    for (let i = 0; i < insts.length; i++) {
        const inst      = insts[i];
        const remaining = inst.amount - (inst.paid || 0);
        if (remaining > 0 && inst.status !== 'paid') {
            const dueDate = inst.dueDate ? new Date(inst.dueDate) : null;
            if (dueDate && dueDate < today) return i;

            let allPrevClear = true;
            for (let j = 0; j < i; j++) {
                const prev    = insts[j];
                const prevRem = prev.amount - (prev.paid || 0);
                const prevDue = prev.dueDate ? new Date(prev.dueDate) : null;
                if (prevRem > 0 && prevDue && prevDue < today) { allPrevClear = false; break; }
            }
            if (allPrevClear) return i;
        }
    }
    return -1;
}

function selectInstallmentForPayment(index) {
    if (!selectedStudentForPayment?.installments) return;
    currentSelectedInstallmentIndex = index;
    selectedInstallmentForPayment   = selectedStudentForPayment.installments[index];

    document.querySelectorAll('.installment-option').forEach((opt, i) => {
        opt.classList.toggle('selected', i === index);
    });

    showInstallmentDetails(selectedInstallmentForPayment, index);
}

function showInstallmentDetails(inst, index) {
    const detailsSection = document.getElementById('selectedInstallmentDetails');
    const paymentSection = document.getElementById('installmentPaymentSection');

    document.getElementById('installmentNumberDisplay').textContent = `Installment ${index + 1}`;
    document.getElementById('installmentDueDateDisplay').textContent = inst.dueDate ? formatDate(inst.dueDate) : 'N/A';
    document.getElementById('installmentAmountDisplay').textContent  = `₹${inst.amount.toLocaleString('en-IN')}`;

    const remaining = inst.amount - (inst.paid || 0);
    const today     = new Date(); today.setHours(0,0,0,0);
    const dueDate   = inst.dueDate ? new Date(inst.dueDate) : null;

    let paymentHTML = '';
    if (inst.status === 'paid') {
        paymentHTML = `<div class="bg-green-50 border border-green-200 rounded-lg p-4">
            <div class="flex items-center">
                <i class="fas fa-check-circle text-green-500 text-xl mr-3"></i>
                <div>
                    <p class="font-medium text-green-800">This installment is fully paid</p>
                    <p class="text-sm text-green-600">Paid: ₹${inst.amount.toLocaleString('en-IN')}</p>
                </div>
            </div></div>`;
        document.getElementById('paymentAmount').value = '';

    } else if (inst.status === 'partial') {
        paymentHTML = `<div class="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div class="flex justify-between items-center">
                <div>
                    <p class="font-medium text-yellow-800">Partially Paid</p>
                    <p class="text-sm text-yellow-600">Paid: ₹${(inst.paid||0).toLocaleString('en-IN')} | Remaining: ₹${remaining.toLocaleString('en-IN')}</p>
                </div>
                <button onclick="openCustomAmountOverlay(${index})"
                        class="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-all duration-200">
                    Pay Now
                </button>
            </div></div>`;
        document.getElementById('paymentAmount').value = remaining;

    } else if (remaining > 0) {
        const isPayable = checkIfInstallmentIsPayable(index);
        if (isPayable) {
            const label = (dueDate && dueDate < today) ? 'Overdue' : 'Due';
            paymentHTML = `<div class="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div class="flex justify-between items-center">
                    <div>
                        <p class="font-medium text-blue-800">${label}</p>
                        <p class="text-sm text-blue-600">Amount Due: ₹${remaining.toLocaleString('en-IN')}</p>
                    </div>
                    <button onclick="openCustomAmountOverlay(${index})"
                            class="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-all duration-200">
                        Pay Now
                    </button>
                </div></div>`;
            document.getElementById('paymentAmount').value = remaining;
        } else {
            paymentHTML = `<div class="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <div class="flex justify-between items-center">
                    <div>
                        <p class="font-medium text-gray-800">Not Payable Yet</p>
                        <p class="text-sm text-gray-600">Complete previous installments first</p>
                    </div>
                    <button class="px-4 py-2 bg-gray-400 text-white rounded-lg cursor-not-allowed" disabled>Pay Now</button>
                </div></div>`;
            document.getElementById('paymentAmount').value = '';
        }
    }

    paymentSection.innerHTML = paymentHTML;
    detailsSection.classList.remove('hidden');
    updatePaymentSummary();

    const method = document.querySelector('input[name="paymentMethodModal"]:checked').value;
    if (method === 'online' && document.getElementById('paymentAmount').value) {
        generateQRCodeForPayment();
    }
}

function checkIfInstallmentIsPayable(index) {
    if (!selectedStudentForPayment?.installments) return false;
    const inst      = selectedStudentForPayment.installments[index];
    const remaining = inst.amount - (inst.paid || 0);
    if (inst.status === 'paid' || remaining <= 0) return false;

    const today = new Date(); today.setHours(0,0,0,0);
    for (let i = 0; i < index; i++) {
        const prev    = selectedStudentForPayment.installments[i];
        const prevRem = prev.amount - (prev.paid || 0);
        const prevDue = prev.dueDate ? new Date(prev.dueDate) : null;
        if (prevRem > 0 && prevDue && prevDue < today) return false;
    }
    return true;
}

// ─── Custom Amount Overlay ────────────────────────────────────────────────────
function openCustomAmountOverlay(index) {
    if (!selectedStudentForPayment?.installments) return;
    const inst      = selectedStudentForPayment.installments[index];
    const remaining = inst.amount - (inst.paid || 0);
    customAmountInstallment = inst;

    document.getElementById('installmentFullAmount').textContent = remaining.toLocaleString('en-IN');
    document.getElementById('customPaymentAmount').value = remaining;
    document.getElementById('customPaymentAmount').max   = remaining;
    document.getElementById('customPaymentAmount').min   = 1;
    updateRemainingAmountDisplay();
    document.getElementById('customAmountOverlay').classList.add('show');
    setTimeout(() => document.getElementById('customPaymentAmount').focus(), 100);
}

function closeCustomAmountOverlay() {
    document.getElementById('customAmountOverlay').classList.remove('show');
    customAmountInstallment = null;
}

function submitCustomAmount() {
    const customAmount = parseInt(document.getElementById('customPaymentAmount').value);
    if (!customAmount || customAmount <= 0) {
        showToast('Please enter a valid amount', 'error');
        return;
    }
    const remaining = customAmountInstallment.amount - (customAmountInstallment.paid || 0);
    if (customAmount > remaining) {
        showToast(`Amount cannot exceed ₹${remaining.toLocaleString('en-IN')}`, 'error');
        return;
    }
    document.getElementById('paymentAmount').value = customAmount;
    closeCustomAmountOverlay();
    updatePaymentSummary();
    const method = document.querySelector('input[name="paymentMethodModal"]:checked').value;
    if (method === 'online') generateQRCodeForPayment();
    showToast(`Payment amount set to ₹${customAmount.toLocaleString('en-IN')}`, 'success');
}

function updateRemainingAmountDisplay() {
    if (!customAmountInstallment) return;
    const custom    = parseInt(document.getElementById('customPaymentAmount').value) || 0;
    const remaining = customAmountInstallment.amount - (customAmountInstallment.paid || 0);
    document.getElementById('remainingAmountDisplay').textContent = (remaining - custom).toLocaleString('en-IN');
}

// ─── Payment Method ───────────────────────────────────────────────────────────
function togglePaymentMethodDetails(method) {
    document.getElementById('transactionDetails').classList.add('hidden');
    document.getElementById('qrCodeSection').classList.add('hidden');
    document.getElementById('bankDetails').classList.add('hidden');

    if (method === 'online') {
        document.getElementById('transactionDetails').classList.remove('hidden');
        document.getElementById('qrCodeSection').classList.remove('hidden');
        document.getElementById('bankDetails').classList.remove('hidden');
        const amt = document.getElementById('paymentAmount').value;
        if (amt) generateQRCodeForPayment();
    }
    updatePaymentSummary();
}

// ─── QR Code ──────────────────────────────────────────────────────────────────
function generateQRCodeForPayment() {
    const amt         = document.getElementById('paymentAmount').value || 0;
    const studentName = selectedStudentForPayment?.name || 'School Fees';
    const studentId   = selectedStudentForPayment?.id || '';

    document.getElementById('qrAmountDisplay').textContent = parseInt(amt).toLocaleString('en-IN');

    const upiId  = 'school.fees@upi';
    const note   = `Fees for ${studentName} (${studentId})`;
    const upiUrl = `upi://pay?pa=${upiId}&pn=Kunash%20School&am=${amt}&tn=${encodeURIComponent(note)}&cu=INR`;

    const container = document.getElementById('qrCodeContainer');
    container.innerHTML = '';

    try {
        if (typeof QRCode !== 'undefined') {
            qrCodeInstance = new QRCode(container, {
                text: upiUrl, width: 200, height: 200,
                colorDark: '#000000', colorLight: '#ffffff',
                correctLevel: QRCode.CorrectLevel.L
            });
            const img = container.querySelector('img');
            if (img) img.classList.add('mx-auto', 'block');
            const canvas = container.querySelector('canvas');
            if (canvas) canvas.classList.add('mx-auto', 'block');
        } else {
            generateSimpleQRCode();
        }
    } catch (err) {
        console.error('QR error:', err);
        generateSimpleQRCode();
    }
}

function generateSimpleQRCode() {
    const amt       = document.getElementById('paymentAmount').value || 0;
    const container = document.getElementById('qrCodeContainer');
    container.innerHTML = '';
    const canvas    = document.createElement('canvas');
    canvas.width    = 200; canvas.height = 200;
    const ctx       = canvas.getContext('2d');
    ctx.fillStyle   = '#ffffff'; ctx.fillRect(0, 0, 200, 200);
    ctx.fillStyle   = '#000000';
    [[20,20],[140,20],[20,140]].forEach(([x,y]) => {
        ctx.fillRect(x,y,40,40);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(x+8,y+8,24,24);
        ctx.fillStyle = '#000000';
        ctx.fillRect(x+14,y+14,12,12);
    });
    ctx.font = '14px Arial'; ctx.textAlign = 'center';
    ctx.fillText(`₹${amt}`, 100, 190);
    container.appendChild(canvas);
    const note = document.createElement('p');
    note.className = 'text-xs text-gray-600 mt-2 text-center';
    note.textContent = 'Scan with any UPI app';
    container.appendChild(note);
}

// ─── Payment Summary ──────────────────────────────────────────────────────────
function updatePaymentSummary() {
    const studentName   = selectedStudentForPayment?.name || 'Not selected';
    const paymentAmount = document.getElementById('paymentAmount').value || 0;
    const method        = document.querySelector('input[name="paymentMethodModal"]:checked').value;
    const methodDisplay = method === 'online' ? 'Online Transfer' : 'Cash';
    const instDisplay   = (selectedInstallmentForPayment && currentSelectedInstallmentIndex >= 0)
        ? `Installment ${currentSelectedInstallmentIndex + 1}` : 'Not selected';

    document.getElementById('summaryStudentName').textContent   = studentName;
    document.getElementById('summaryInstallment').textContent   = instDisplay;
    document.getElementById('summaryPaymentAmount').textContent = '₹' + parseInt(paymentAmount).toLocaleString('en-IN');
    document.getElementById('summaryPaymentMethod').textContent = methodDisplay;
    document.getElementById('summaryTotalAmount').textContent   = '₹' + parseInt(paymentAmount).toLocaleString('en-IN');
}

// ============================================================================
//  PROCESS PAYMENT  →  real backend call
// ============================================================================
async function processPayment() {
    // ── Validate ──
    if (!selectedStudentForPayment) {
        showToast('Please select a student', 'error'); return;
    }
    if (!selectedInstallmentForPayment || currentSelectedInstallmentIndex < 0) {
        showToast('Please select an installment', 'error'); return;
    }

    const paymentAmount = parseFloat(document.getElementById('paymentAmount').value);
    if (!paymentAmount || paymentAmount <= 0) {
        showToast('Please enter a valid payment amount', 'error'); return;
    }

    const remaining = selectedInstallmentForPayment.amount - (selectedInstallmentForPayment.paid || 0);
    if (paymentAmount > remaining) {
        showToast('Amount cannot exceed installment remaining: ₹' + remaining.toLocaleString('en-IN'), 'error'); return;
    }

    const method      = document.querySelector('input[name="paymentMethodModal"]:checked').value;
    const paymentDate = document.getElementById('paymentDate').value;
    let   transId     = '';
    let   bankName    = document.getElementById('bankName').value || '';

    if (method === 'online') {
        transId = document.getElementById('transactionId').value.trim();
        if (!transId) {
            showToast('Please enter the Transaction ID for online payment', 'error'); return;
        }
        if (transId.length < 6) {
            showToast('Transaction ID must be at least 6 characters', 'error'); return;
        }
    }

    showLoading(true);

    try {
        const student = selectedStudentForPayment;
        const feesId  = student.feesId;
        const instId  = selectedInstallmentForPayment.installmentId;

        if (!feesId) throw new Error('Fee record ID not found. Please refresh and try again.');

        // ── 1. Pay installment via backend ──
        const params = new URLSearchParams({
            paymentMode:      method === 'online' ? 'ONLINE' : 'CASH',
            transactionRef:   transId || '',
            amount:           paymentAmount
        });

        const payRes = await fetch(
            `${FM_BASE}/api/fees/${feesId}/pay-installment/${instId}?${params}`,
            { method: 'POST', headers: fmAuthHeaders() }
        );

        if (!payRes.ok) {
            const errText = await payRes.text();
            throw new Error(errText || 'Payment failed on server');
        }

        const updatedFees = await payRes.json();

        // ── 2. Create transaction record ──
        const txPayload = {
            studentId:     student.stdId,
            installmentId: instId,
            transactionId: transId || ('CASH-' + Date.now()),
            amountPaid:    paymentAmount,
            paymentDate:   paymentDate,
            paymentMode:   method === 'online' ? 'ONLINE' : 'CASH',
            cashierName:   'Admin',
            status:        'COMPLETED',
            remarks:       `Installment ${currentSelectedInstallmentIndex + 1} payment`
        };

        let txResponse = null;
        try {
            const txRes = await fetch(`${FM_BASE}/api/transaction/create-transaction`, {
                method:  'POST',
                headers: fmAuthHeaders(true),
                body:    JSON.stringify(txPayload)
            });
            if (txRes.ok) txResponse = await txRes.json();
        } catch (txErr) {
            console.warn('Transaction record creation failed (non-critical):', txErr.message);
        }

        // ── 3. Add receipt to local list ──
        const receiptNo = txResponse ? 'TXN-' + txResponse.transId : 'RCP-' + Date.now();
        const newReceipt = {
            receiptNo,
            studentName:        student.name,
            studentId:          student.id,
            class:              student.class + '-' + student.section,
            amount:             paymentAmount,
            date:               new Date(paymentDate).toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' }),
            method:             method === 'online' ? 'Online' : 'Cash',
            bankName,
            transactionId:      transId,
            installmentNumber:  currentSelectedInstallmentIndex + 1
        };
        receiptsData.unshift(newReceipt);

        // ── 4. Reload all fees data from backend ──
        await loadFeesData();

        showToast(
            `✅ Payment of ₹${paymentAmount.toLocaleString('en-IN')} collected successfully! Receipt: ${receiptNo}`,
            'success'
        );

        closeCollectPaymentModal();

        // Show receipt
        setTimeout(() => viewReceipt(receiptNo), 500);

    } catch (err) {
        console.error('processPayment error:', err);
        showToast('❌ Payment failed: ' + err.message, 'error');
    } finally {
        showLoading(false);
    }
}

// ============================================================================
//  VIEW RECEIPT
// ============================================================================
function viewReceipt(receiptNo) {
    const receipt = receiptsData.find(r => r.receiptNo === receiptNo);
    if (!receipt) { showToast('Receipt not found', 'error'); return; }

    const modal        = document.getElementById('viewReceiptModalOverlay');
    const modalContent = modal.querySelector('.modal-content');

    modalContent.innerHTML = `
        <div class="p-8">
            <div class="text-center mb-8">
                <h2 class="text-2xl font-bold text-gray-800 mb-2">Fee Payment Receipt</h2>
                <p class="text-gray-600">Official Receipt</p>
            </div>
            <div class="border-2 border-gray-300 rounded-xl p-8 mb-6">
                <div class="flex justify-between items-start mb-8">
                    <div>
                        <h3 class="text-xl font-bold text-gray-800">Kunash International School</h3>
                        <p class="text-gray-600">123 Education Street, City, State 123456</p>
                        <p class="text-gray-600">Phone: (123) 456-7890 | Email: info@kunashschool.edu</p>
                    </div>
                    <div class="text-right">
                        <p class="text-lg font-bold text-blue-600">RECEIPT</p>
                        <p class="text-gray-800 font-medium">${receipt.receiptNo}</p>
                        <p class="text-gray-600">Date: ${receipt.date}</p>
                        ${receipt.installmentNumber ? `<p class="text-gray-600">Installment: ${receipt.installmentNumber}</p>` : ''}
                    </div>
                </div>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                    <div>
                        <h4 class="font-semibold text-gray-700 mb-2">Student Details</h4>
                        <p class="text-gray-800"><strong>Name:</strong> ${receipt.studentName}</p>
                        <p class="text-gray-800"><strong>Student ID:</strong> ${receipt.studentId}</p>
                        <p class="text-gray-800"><strong>Class:</strong> ${receipt.class}</p>
                    </div>
                    <div>
                        <h4 class="font-semibold text-gray-700 mb-2">Payment Details</h4>
                        <p class="text-gray-800"><strong>Payment Method:</strong> ${receipt.method}</p>
                        ${receipt.bankName ? `<p class="text-gray-800"><strong>Bank:</strong> ${receipt.bankName}</p>` : ''}
                        ${receipt.transactionId ? `<p class="text-gray-800"><strong>Transaction ID:</strong> ${receipt.transactionId}</p>` : ''}
                    </div>
                </div>
                <div class="border-t border-b border-gray-300 py-4 mb-6">
                    <div class="flex justify-between items-center">
                        <p class="text-gray-700 text-lg">Amount Received</p>
                        <p class="text-3xl font-bold text-green-600">₹${Number(receipt.amount).toLocaleString('en-IN')}</p>
                    </div>
                </div>
                <div class="mb-8">
                    <h4 class="font-semibold text-gray-700 mb-2">Payment Description</h4>
                    <p class="text-gray-800">Tuition fee payment for academic year</p>
                    ${receipt.installmentNumber ? `<p class="text-gray-800 mt-1"><strong>Installment:</strong> ${receipt.installmentNumber}</p>` : ''}
                </div>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-8 mt-10 pt-8 border-t border-gray-300">
                    <div>
                        <p class="text-gray-700 mb-1">Authorized Signature</p>
                        <div class="h-16 border-t border-gray-400"></div>
                        <p class="text-gray-600 text-sm mt-2">School Administrator</p>
                    </div>
                    <div>
                        <p class="text-gray-700 mb-1">Parent/Guardian Signature</p>
                        <div class="h-16 border-t border-gray-400"></div>
                        <p class="text-gray-600 text-sm mt-2">Received by</p>
                    </div>
                </div>
            </div>
            <div class="flex justify-between">
                <button onclick="closeViewReceiptModal()"
                    class="px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-all duration-200 font-medium">Close</button>
                <div class="space-x-3">
                    <button onclick="printReceipt('${receipt.receiptNo}')"
                        class="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-all duration-200 font-medium">
                        <i class="fas fa-print mr-2"></i>Print Receipt
                    </button>
                </div>
            </div>
        </div>`;

    modal.classList.add('show');
}

function closeViewReceiptModal() {
    document.getElementById('viewReceiptModalOverlay').classList.remove('show');
}

function printReceipt(receiptNo) {
    showToast(`Printing receipt ${receiptNo}...`, 'info');
    window.print();
}

// ============================================================================
//  VIEW STUDENT FEES DETAILS MODAL
// ============================================================================
function viewStudentFees(studentId) {
    const student = studentsFeesData.find(s => s.id === studentId);
    if (!student) { showToast('Student not found!', 'error'); return; }
    showStudentFeesDetailsModal(student);
}

function showStudentFeesDetailsModal(student) {
    // Remove any existing detail modal
    document.querySelector('.fees-detail-modal')?.remove();

    const insts    = student.installments || [];
    const paidInst = insts.filter(i => i.status === 'paid').length;
    const pendInst = insts.filter(i => i.status !== 'paid').length;
    const progress = student.total > 0 ? Math.min((student.paid / student.total) * 100, 100) : 0;

    const instRows = insts.length > 0 ? insts.map((inst, idx) => `
        <div class="installment-card ${getInstallmentCardClass(inst.status)} mb-3">
            <div class="flex justify-between items-center">
                <div>
                    <div class="flex items-center gap-2">
                        <span class="font-medium text-gray-800">Installment ${idx + 1}</span>
                        <span class="status-badge ${inst.status === 'paid' ? 'status-paid' : inst.status === 'partial' ? 'status-partial' : 'status-unpaid'}" style="font-size:10px;padding:2px 8px;">
                            ${inst.status.toUpperCase()}
                        </span>
                    </div>
                    <div class="flex items-center space-x-3 mt-1 text-sm text-gray-600 flex-wrap gap-y-1">
                        <span>Due: ${inst.dueDate ? formatDate(inst.dueDate) : 'N/A'}</span>
                        ${inst.status === 'paid' && inst.paidDate ? `<span class="text-green-600">• Paid: ${formatDate(inst.paidDate)}</span>` : ''}
                        ${inst.paymentMode ? `<span>• ${inst.paymentMode}</span>` : ''}
                    </div>
                </div>
                <div class="text-right">
                    <p class="font-bold text-gray-800">₹${inst.amount.toLocaleString('en-IN')}</p>
                    ${inst.paid > 0 ? `<p class="text-sm text-green-600">Paid: ₹${inst.paid.toLocaleString('en-IN')}</p>` : ''}
                    ${(inst.amount - (inst.paid||0)) > 0
                        ? `<p class="text-sm text-red-600">Remaining: ₹${(inst.amount-(inst.paid||0)).toLocaleString('en-IN')}</p>`
                        : ''}
                </div>
            </div>
        </div>`) .join('')
        : '<p class="text-gray-500 text-center py-4">No installments created</p>';

    const modal = document.createElement('div');
    modal.className = 'modal-overlay show fees-detail-modal';
    modal.innerHTML = `
        <div class="bg-white rounded-xl shadow-2xl modal-content w-full max-w-4xl">
            <div class="p-6">
                <div class="flex justify-between items-center mb-6">
                    <h3 class="text-xl font-bold text-gray-800">Fees Details — ${student.name}</h3>
                    <button onclick="this.closest('.fees-detail-modal').remove()" class="text-gray-500 hover:text-gray-700">
                        <i class="fas fa-times text-xl"></i>
                    </button>
                </div>

                <!-- Student + Fees Summary -->
                <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                    <div class="bg-blue-50 border border-blue-200 rounded-lg p-4">
                        <h4 class="font-semibold text-gray-800 mb-3">Student Information</h4>
                        <div class="space-y-1 text-sm">
                            <p><span class="font-medium text-gray-700">Name:</span> ${student.name}</p>
                            <p><span class="font-medium text-gray-700">Student ID:</span> ${student.id}</p>
                            <p><span class="font-medium text-gray-700">Class:</span> ${student.class} — Section ${student.section}</p>
                            <p><span class="font-medium text-gray-700">Academic Year:</span> ${student.academicYear}</p>
                        </div>
                    </div>
                    <div class="bg-green-50 border border-green-200 rounded-lg p-4">
                        <h4 class="font-semibold text-gray-800 mb-3">Fee Summary</h4>
                        <div class="space-y-1 text-sm">
                            <p><span class="font-medium text-gray-700">Total Fees:</span> ₹${student.total.toLocaleString('en-IN')}</p>
                            <p><span class="font-medium text-gray-700">Initial Paid:</span> <span class="text-green-600 font-semibold">₹${student.initialAmount.toLocaleString('en-IN')}</span></p>
                            <p><span class="font-medium text-gray-700">Total Paid:</span> <span class="text-green-600 font-semibold">₹${student.paid.toLocaleString('en-IN')}</span></p>
                            <p><span class="font-medium text-gray-700">Balance:</span> <span class="${student.balance > 0 ? 'text-red-600' : 'text-green-600'} font-semibold">₹${student.balance.toLocaleString('en-IN')}</span></p>
                            <p><span class="font-medium text-gray-700">Status:</span> <span class="status-badge ${getStatusClass(student.status)}">${student.status}</span></p>
                        </div>
                    </div>
                </div>

                <!-- Fee Breakdown -->
                <div class="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-6">
                    <h4 class="font-semibold text-gray-800 mb-3">Fee Breakdown</h4>
                    <div class="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                        <div class="bg-white rounded-lg p-3 text-center border border-gray-200">
                            <p class="text-gray-500 text-xs">Admission</p>
                            <p class="font-bold text-gray-800">₹${student.admissionFees.toLocaleString('en-IN')}</p>
                        </div>
                        <div class="bg-white rounded-lg p-3 text-center border border-gray-200">
                            <p class="text-gray-500 text-xs">Uniform</p>
                            <p class="font-bold text-gray-800">₹${student.uniformFees.toLocaleString('en-IN')}</p>
                        </div>
                        <div class="bg-white rounded-lg p-3 text-center border border-gray-200">
                            <p class="text-gray-500 text-xs">Books</p>
                            <p class="font-bold text-gray-800">₹${student.bookFees.toLocaleString('en-IN')}</p>
                        </div>
                        <div class="bg-white rounded-lg p-3 text-center border border-gray-200">
                            <p class="text-gray-500 text-xs">Tuition</p>
                            <p class="font-bold text-gray-800">₹${student.tuitionFees.toLocaleString('en-IN')}</p>
                        </div>
                    </div>
                </div>

                <!-- Installments -->
                <div class="mb-6">
                    <div class="flex justify-between items-center mb-3">
                        <h4 class="font-semibold text-gray-800">Installment Details (${insts.length})</h4>
                        <div class="flex gap-2">
                            <span style="background:#d1fae5;color:#065f46;font-size:11px;font-weight:700;padding:2px 10px;border-radius:999px;">✓ ${paidInst} Paid</span>
                            ${pendInst > 0 ? `<span style="background:#fee2e2;color:#991b1b;font-size:11px;font-weight:700;padding:2px 10px;border-radius:999px;">⏳ ${pendInst} Pending</span>` : ''}
                        </div>
                    </div>
                    ${instRows}
                </div>

                <!-- Progress Bar -->
                <div class="mb-6">
                    <h4 class="font-semibold text-gray-800 mb-3">Payment Progress</h4>
                    <div class="bg-gray-100 rounded-lg p-4">
                        <div class="flex justify-between mb-2">
                            <span class="text-sm font-medium text-gray-700">Payment Completion</span>
                            <span class="text-sm font-medium text-gray-700">${Math.round(progress)}%</span>
                        </div>
                        <div class="progress-bar w-full h-4">
                            <div class="progress-fill ${student.balance <= 0 ? 'bg-green-500' : 'bg-yellow-500'}"
                                 style="width:${progress}%"></div>
                        </div>
                        <div class="flex justify-between mt-2 text-sm text-gray-600">
                            <span>₹0</span>
                            <span>₹${student.total.toLocaleString('en-IN')}</span>
                        </div>
                    </div>
                </div>

                <!-- Payment History -->
                <div class="mb-6">
                    <div class="flex justify-between items-center mb-3">
                        <h4 class="font-semibold text-gray-800">Payment History</h4>
                        <button onclick="closeDetailsAndOpenCollectPayment('${student.id}')"
                            class="px-4 py-2 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg hover:from-green-700 hover:to-emerald-700 transition-all duration-200 text-sm font-medium">
                            <i class="fas fa-money-bill-wave mr-2"></i>Collect Payment
                        </button>
                    </div>
                    <div class="overflow-x-auto rounded-lg border border-gray-200">
                        <table class="w-full">
                            <thead class="bg-gray-50">
                                <tr>
                                    <th class="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Receipt No</th>
                                    <th class="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Date</th>
                                    <th class="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Amount</th>
                                    <th class="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Method</th>
                                    <th class="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Status</th>
                                </tr>
                            </thead>
                            <tbody class="divide-y divide-gray-200">
                                ${generatePaymentHistory(student.id)}
                            </tbody>
                        </table>
                    </div>
                </div>

                <!-- Actions -->
                <div class="flex justify-end space-x-3 pt-4 border-t border-gray-200">
                    <button onclick="this.closest('.fees-detail-modal').remove()"
                        class="px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-all duration-200 font-medium">Close</button>
                    <button onclick="printStudentFeesReport('${student.id}')"
                        class="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all duration-200 font-medium">
                        <i class="fas fa-print mr-2"></i>Print Report
                    </button>
                </div>
            </div>
        </div>`;

    document.body.appendChild(modal);
}

function closeDetailsAndOpenCollectPayment(studentId) {
    document.querySelector('.fees-detail-modal')?.remove();
    setTimeout(() => openCollectPaymentModal(studentId), 100);
}

function generatePaymentHistory(studentId) {
    const studentReceipts = receiptsData.filter(r => r.studentId === studentId).slice(0, 5);
    if (studentReceipts.length === 0) {
        return `<tr><td colspan="5" class="px-4 py-6 text-center text-gray-500">
            <i class="fas fa-receipt text-3xl mb-3 block"></i>No payment history found</td></tr>`;
    }
    return studentReceipts.map(r => `
        <tr class="hover:bg-gray-50">
            <td class="px-4 py-3 text-sm font-medium text-blue-600">${r.receiptNo}</td>
            <td class="px-4 py-3 text-sm text-gray-700">${r.date}</td>
            <td class="px-4 py-3 text-sm font-medium text-green-600">₹${Number(r.amount).toLocaleString('en-IN')}</td>
            <td class="px-4 py-3 text-sm text-gray-700">
                <i class="fas fa-${getPaymentMethodIcon(r.method)} mr-2"></i>${r.method}
            </td>
            <td class="px-4 py-3"><span class="status-badge status-paid">Paid</span></td>
        </tr>`).join('');
}

// ============================================================================
//  MISC
// ============================================================================
function collectPaymentForStudent(studentId) { openCollectPaymentModal(studentId); }

function sendReminder(studentId) {
    const s = studentsFeesData.find(s => s.id === studentId);
    if (!s) return;
    showToast(`📨 Reminder sent for ${s.name}'s pending fees of ₹${s.balance.toLocaleString('en-IN')}`, 'success');
}

function printStudentFeesReport(studentId) {
    const s = studentsFeesData.find(s => s.id === studentId);
    if (!s) return;
    showToast(`Printing fees report for ${s.name}`, 'info');
    window.print();
}

function generateReport() {
    const type = document.getElementById('reportType').value;
    showToast(`Generating ${type} report...`, 'info');
    document.getElementById('reportResults').classList.remove('hidden');
}

function resetReportFilters() {
    document.getElementById('reportType').value          = 'collection';
    document.getElementById('reportAcademicYear').value  = '2024-2025';
    const fp = document.getElementById('reportDateRange')._flatpickr;
    if (fp) { fp.clear(); fp.setDate(['2024-04-01','2024-09-30'], true); }
    document.getElementById('reportResults').classList.add('hidden');
    showToast('Report filters reset', 'success');
}

function exportReport()    { showToast('Exporting report data...', 'info'); }
function exportFeesData()  { showToast('Exporting fees data to Excel...', 'info'); }

// ─── Helpers ──────────────────────────────────────────────────────────────────
function getStatusClass(status) {
    if (status === 'Paid')         return 'status-paid';
    if (status === 'Partial Paid') return 'status-partial';
    if (status === 'Overdue')      return 'status-overdue';
    return 'status-unpaid';
}

function getPaymentMethodIcon(method) {
    const m = (method || '').toLowerCase();
    if (m === 'cash') return 'money-bill-wave';
    if (m === 'online' || m === 'upi' || m === 'neft') return 'university';
    return 'money-bill-wave';
}

function getPaymentMethodColor(method) {
    const m = (method || '').toLowerCase();
    if (m === 'online' || m === 'upi' || m === 'neft')
        return { bg: 'bg-purple-100', text: 'text-purple-600' };
    return { bg: 'bg-green-100', text: 'text-green-600' };
}

function getInstallmentStatusColor(status) {
    if (status === 'paid')    return 'text-green-600';
    if (status === 'partial') return 'text-yellow-600';
    return 'text-red-600';
}

function getInstallmentCardClass(status) {
    if (status === 'paid')    return 'paid';
    if (status === 'partial') return 'partial';
    return 'unpaid';
}

function formatDate(dateString) {
    if (!dateString) return 'N/A';
    try {
        return new Date(dateString).toLocaleDateString('en-IN', {
            day: '2-digit', month: 'short', year: 'numeric'
        });
    } catch { return dateString; }
}

function getCurrentAcademicYear() {
    const now   = new Date();
    const year  = now.getFullYear();
    const month = now.getMonth() + 1;
    return month >= 4 ? `${year}-${year+1}` : `${year-1}-${year}`;
}