//  fees-service.js
//  Base URL: http://localhost:8084
//  PURPOSE: All fees & transaction API calls to Spring Boot
//
//  SAFE TO USE WITH:
//    student-service.js  — showLoading lives there (NOT redeclared here)
//    transaction-service.js — uses "tx" prefix, no overlap
//    fee-management.js  — uses "fm" prefix, no overlap
//
//  NAMING CONVENTION (no conflicts):
//    FEES_BASE, getFeesAuthHeaders, getFeesCurrentAcademicYear
// ============================================================

const FEES_BASE = 'http://localhost:8084';

// ─────────────────────────────────────────────────────────────
//  AUTH HEADER HELPER
// ─────────────────────────────────────────────────────────────
function getFeesAuthHeaders(contentType = null) {
    const token   = localStorage.getItem('admin_jwt_token');
    const headers = { 'Authorization': `Bearer ${token}` };
    if (contentType) headers['Content-Type'] = contentType;
    return headers;
}

// ─────────────────────────────────────────────────────────────
//  1. CREATE FEES FOR A STUDENT
//     POST /api/fees/create-fees
// ─────────────────────────────────────────────────────────────
async function createFees(studentStdId, feesPayload) {
    try {
        const body = {
            studentId:          studentStdId,
            admissionFees:      feesPayload.admissionFees      || 0,
            uniformFees:        feesPayload.uniformFees        || 0,
            bookFees:           feesPayload.bookFees           || 0,
            tuitionFees:        feesPayload.tuitionFees        || 0,
            additionalFeesList: feesPayload.additionalFeesList || {},
            initialAmount:      feesPayload.initialAmount      || 0,
            paymentMode:        feesPayload.paymentMode        || 'one-time',
            installmentsList:   feesPayload.installmentsList   || [],
            cashierName:        feesPayload.cashierName        || 'Admin',
            transactionId:      feesPayload.transactionId      || '',
            academicYear:       feesPayload.academicYear       || getFeesCurrentAcademicYear()
        };
        const res = await fetch(`${FEES_BASE}/api/fees/create-fees`, {
            method:  'POST',
            headers: getFeesAuthHeaders('application/json'),
            body:    JSON.stringify(body)
        });
        if (!res.ok) { const err = await res.text(); throw new Error(err || 'Failed to create fees'); }
        return await res.json();
    } catch (err) {
        console.error('createFees error:', err);
        throw err;
    }
}

// ─────────────────────────────────────────────────────────────
//  2. GET FEES BY STUDENT stdId
//     GET /api/fees/get-fees-by-student-id/{studentId}
// ─────────────────────────────────────────────────────────────
async function getFeesByStudentId(stdId) {
    try {
        const res = await fetch(
            `${FEES_BASE}/api/fees/get-fees-by-student-id/${stdId}`,
            { headers: getFeesAuthHeaders() }
        );
        if (!res.ok) return null;
        return await res.json();
    } catch (err) {
        console.warn('getFeesByStudentId error:', err.message);
        return null;
    }
}

// ─────────────────────────────────────────────────────────────
//  3. GET FEES BY FEES ID
//     GET /api/fees/get-fees-by-id/{id}
// ─────────────────────────────────────────────────────────────
async function getFeesById(feesId) {
    const res = await fetch(
        `${FEES_BASE}/api/fees/get-fees-by-id/${feesId}`,
        { headers: getFeesAuthHeaders() }
    );
    if (!res.ok) throw new Error('Fees not found');
    return await res.json();
}

// ─────────────────────────────────────────────────────────────
//  4. GET ALL FEES
//     GET /api/fees/get-all-fees
// ─────────────────────────────────────────────────────────────
async function getAllFees() {
    const res = await fetch(`${FM_BASE}/api/fees/get-all-fees`, { headers: fmAuthHeaders() });
    if (!res.ok) throw new Error('Failed to fetch fees');
    return await res.json();
}

// ─────────────────────────────────────────────────────────────
//  5. GET PENDING FEES
//     GET /api/fees/get-all-pending-fees
// ─────────────────────────────────────────────────────────────
async function getAllPendingFees() {
    const res = await fetch(
        `${FEES_BASE}/api/fees/get-all-pending-fees`,
        { headers: getFeesAuthHeaders() }
    );
    if (!res.ok) throw new Error('Failed to fetch pending fees');
    return await res.json();
}

// ─────────────────────────────────────────────────────────────
//  6. UPDATE FEES (full update)
//     PUT /api/fees/update-fees/{id}
// ─────────────────────────────────────────────────────────────
async function updateFees(feesId, feesPayload) {
    const res = await fetch(
        `${FEES_BASE}/api/fees/update-fees/${feesId}`,
        {
            method:  'PUT',
            headers: getFeesAuthHeaders('application/json'),
            body:    JSON.stringify(feesPayload)
        }
    );
    if (!res.ok) { const err = await res.text(); throw new Error(err || 'Failed to update fees'); }
    return await res.json();
}

// ─────────────────────────────────────────────────────────────
//  7. DELETE FEES
//     DELETE /api/fees/delete-fees/{id}
// ─────────────────────────────────────────────────────────────
async function deleteFees(feesId) {
    const res = await fetch(
        `${FEES_BASE}/api/fees/delete-fees/${feesId}`,
        { method: 'DELETE', headers: getFeesAuthHeaders() }
    );
    if (!res.ok) throw new Error('Failed to delete fees');
}

// ─────────────────────────────────────────────────────────────
//  8. PROCESS INSTALLMENT PAYMENT
//     POST /api/fees/{feesId}/installments/{installmentId}/pay
//     NOTE: fee-management.js calls this endpoint directly via fetch.
//           This function is available for use from other modules.
// ─────────────────────────────────────────────────────────────
async function processInstallmentPayment(feesId, installmentId, paymentMode, transactionRef, amount) {
    const params = new URLSearchParams({
        paymentMode:    paymentMode,
        transactionRef: transactionRef || '',
        amount:         amount || 0
    });
    const res = await fetch(
        `${FEES_BASE}/api/fees/${feesId}/installments/${installmentId}/pay?${params}`,
        { method: 'POST', headers: getFeesAuthHeaders() }
    );
    if (!res.ok) { const err = await res.text(); throw new Error(err || 'Installment payment failed'); }
    return await res.json();
}

// ─────────────────────────────────────────────────────────────
//  9. CREATE TRANSACTION
//     POST /api/transaction/create-transaction
// ─────────────────────────────────────────────────────────────
async function createTransaction(payload) {
    const res = await fetch(`${FM_BASE}/api/transaction/create-transaction`, {
        method: 'POST',
        headers: fmAuthHeaders(true),
        body: JSON.stringify(payload)
    });
    if (!res.ok) throw new Error('Transaction creation failed');
    return await res.json();
}

// ─────────────────────────────────────────────────────────────
//  10. GET TRANSACTION BY ID
//      GET /api/transaction/get-transaction-by-Id/{id}
// ─────────────────────────────────────────────────────────────
async function getTransactionById(txId) {
    const res = await fetch(
        `${FEES_BASE}/api/transaction/get-transaction-by-Id/${txId}`,
        { headers: getFeesAuthHeaders() }
    );
    if (!res.ok) return null;
    return await res.json();
}

// ─────────────────────────────────────────────────────────────
//  11. GET ALL TRANSACTIONS
//      GET /api/transaction/get-all-transactions
// ─────────────────────────────────────────────────────────────
async function getAllTransactions() {
    const res = await fetch(`${FM_BASE}/api/transaction/get-all-transactions`, { headers: fmAuthHeaders() });
    if (!res.ok) throw new Error('Failed to fetch transactions');
    return await res.json();
}

// ─────────────────────────────────────────────────────────────
//  12. PATCH TRANSACTION
//      PATCH /api/transaction/patch-transaction/{id}
// ─────────────────────────────────────────────────────────────
async function patchTransaction(txId, updates) {
    const res = await fetch(
        `${FEES_BASE}/api/transaction/patch-transaction/${txId}`,
        {
            method:  'PATCH',
            headers: getFeesAuthHeaders('application/json'),
            body:    JSON.stringify(updates)
        }
    );
    if (!res.ok) { const err = await res.text(); throw new Error(err || 'Transaction patch failed'); }
    return await res.json();
}

// ─────────────────────────────────────────────────────────────
//  13. DELETE TRANSACTION
//      DELETE /api/transaction/delete-transaction/{id}
// ─────────────────────────────────────────────────────────────
async function deleteTransaction(txId) {
    const res = await fetch(
        `${FEES_BASE}/api/transaction/delete-transaction/${txId}`,
        { method: 'DELETE', headers: getFeesAuthHeaders() }
    );
    if (!res.ok) throw new Error('Failed to delete transaction');
}

// ─────────────────────────────────────────────────────────────
//  14. VERIFY TRANSACTION ID
//      Checks against existing transactions, accepts if valid format
// ─────────────────────────────────────────────────────────────
async function verifyTransactionIdFromService() {
    const input     = document.getElementById('transactionId');
    const txId      = input?.value.trim();
    const statusDiv = document.getElementById('transactionStatus');

    if (!txId) {
        if (typeof toastError === 'function') toastError('Please enter a transaction ID');
        return;
    }

    if (statusDiv) {
        statusDiv.innerHTML =
            '<div style="display:flex;align-items:center;color:#d97706"><i class="fas fa-spinner fa-spin" style="margin-right:8px"></i>Verifying…</div>';
    }

    try {
        const allTx = await getAllTransactions();
        const found = allTx.find(t =>
            t.transactionId && t.transactionId.toUpperCase() === txId.toUpperCase()
        );

        if (found) {
            if (statusDiv) statusDiv.innerHTML =
                '<div style="display:flex;align-items:center;color:#2f9e44"><i class="fas fa-check-circle" style="margin-right:8px"></i>Transaction found & verified!</div>';
            if (typeof window.transactionVerified !== 'undefined') window.transactionVerified = true;
            if (typeof toastSuccess === 'function') toastSuccess('Transaction verified!');
        } else {
            if (txId.length >= 8 && /^[A-Z0-9a-z]+$/.test(txId)) {
                if (statusDiv) statusDiv.innerHTML =
                    '<div style="display:flex;align-items:center;color:#2f9e44"><i class="fas fa-check-circle" style="margin-right:8px"></i>Transaction ID accepted.</div>';
                if (typeof window.transactionVerified !== 'undefined') window.transactionVerified = true;
                if (typeof toastSuccess === 'function') toastSuccess('Transaction ID accepted');
            } else {
                if (statusDiv) statusDiv.innerHTML =
                    '<div style="display:flex;align-items:center;color:#e03131"><i class="fas fa-times-circle" style="margin-right:8px"></i>Invalid transaction ID (min 8 alphanumeric characters).</div>';
                if (typeof window.transactionVerified !== 'undefined') window.transactionVerified = false;
                if (typeof toastError === 'function') toastError('Invalid transaction ID');
            }
        }
    } catch (err) {
        if (txId.length >= 8) {
            if (statusDiv) statusDiv.innerHTML =
                '<div style="display:flex;align-items:center;color:#2f9e44"><i class="fas fa-check-circle" style="margin-right:8px"></i>Transaction ID accepted.</div>';
            if (typeof window.transactionVerified !== 'undefined') window.transactionVerified = true;
        } else {
            if (statusDiv) statusDiv.innerHTML =
                '<div style="display:flex;align-items:center;color:#e03131"><i class="fas fa-times-circle" style="margin-right:8px"></i>Could not verify. Please check the ID.</div>';
            if (typeof window.transactionVerified !== 'undefined') window.transactionVerified = false;
        }
    }
}

// ─────────────────────────────────────────────────────────────
//  15. LOAD FEES SUMMARY FOR A STUDENT (convenience wrapper)
// ─────────────────────────────────────────────────────────────
async function loadFeesForStudent(stdId) {
    try { return await getFeesByStudentId(stdId); }
    catch { return null; }
}

// ─────────────────────────────────────────────────────────────
//  16. GET FEES BY ACADEMIC YEAR
//      GET /api/fees/get-fees-by-academic-year/{year}
// ─────────────────────────────────────────────────────────────
async function getFeesByAcademicYear(year) {
    const res = await fetch(
        `${FEES_BASE}/api/fees/get-fees-by-academic-year/${encodeURIComponent(year)}`,
        { headers: getFeesAuthHeaders() }
    );
    if (!res.ok) throw new Error('Failed to fetch fees by academic year');
    return await res.json();
}

// ─────────────────────────────────────────────────────────────
//  17. HELPER — current academic year
//      RENAMED to getFeesCurrentAcademicYear to avoid conflict
//      with any getCurrentAcademicYear in student-service.js
// ─────────────────────────────────────────────────────────────
function getFeesCurrentAcademicYear() {
    const now   = new Date();
    const year  = now.getFullYear();
    const month = now.getMonth() + 1;
    return month >= 4 ? `${year}-${year + 1}` : `${year - 1}-${year}`;
}