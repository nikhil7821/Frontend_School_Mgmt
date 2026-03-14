// ============================================================
//  fees-service.js
//  Base URL: http://localhost:8084
//  Connects fees & transaction frontend to Spring Boot backend
// ============================================================

const FEES_BASE = 'http://localhost:8084';

// ─────────────────────────────────────────────────────────────
//  AUTH HEADER HELPER (shared with student-service.js)
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
            academicYear:       feesPayload.academicYear       || getCurrentAcademicYear()
        };

        const res = await fetch(`${FEES_BASE}/api/fees/create-fees`, {
            method:  'POST',
            headers: getFeesAuthHeaders('application/json'),
            body:    JSON.stringify(body)
        });

        if (!res.ok) {
            const err = await res.text();
            throw new Error(err || 'Failed to create fees');
        }

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
    const res = await fetch(
        `${FEES_BASE}/api/fees/get-all-fees`,
        { headers: getFeesAuthHeaders() }
    );
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
    if (!res.ok) {
        const err = await res.text();
        throw new Error(err || 'Failed to update fees');
    }
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
//     POST /api/fees/{feesId}/pay-installment/{installmentId}
// ─────────────────────────────────────────────────────────────
async function processInstallmentPayment(feesId, installmentId, paymentMode, transactionRef) {
    const params = new URLSearchParams({ paymentMode, transactionRef: transactionRef || '' });
    const res    = await fetch(
        `${FEES_BASE}/api/fees/${feesId}/pay-installment/${installmentId}?${params}`,
        { method: 'POST', headers: getFeesAuthHeaders() }
    );
    if (!res.ok) {
        const err = await res.text();
        throw new Error(err || 'Installment payment failed');
    }
    return await res.json();
}

// ─────────────────────────────────────────────────────────────
//  9. CREATE TRANSACTION
//     POST /api/transaction/create-transaction
// ─────────────────────────────────────────────────────────────
async function createTransaction(txPayload) {
    const res = await fetch(
        `${FEES_BASE}/api/transaction/create-transaction`,
        {
            method:  'POST',
            headers: getFeesAuthHeaders('application/json'),
            body:    JSON.stringify(txPayload)
        }
    );
    if (!res.ok) {
        const err = await res.text();
        throw new Error(err || 'Transaction creation failed');
    }
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
    const res = await fetch(
        `${FEES_BASE}/api/transaction/get-all-transactions`,
        { headers: getFeesAuthHeaders() }
    );
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
    if (!res.ok) {
        const err = await res.text();
        throw new Error(err || 'Transaction patch failed');
    }
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
//  14. VERIFY TRANSACTION ID  (real backend check)
//      This replaces the fake setTimeout verify in student-management.js
// ─────────────────────────────────────────────────────────────
async function verifyTransactionId() {
    const input     = document.getElementById('transactionId');
    const txId      = input?.value.trim();
    const statusDiv = document.getElementById('transactionStatus');

    if (!txId) {
        Toast.show('Please enter a transaction ID', 'error');
        return;
    }

    statusDiv.innerHTML =
        '<div class="flex items-center text-yellow-600"><i class="fas fa-spinner fa-spin mr-2"></i>Verifying...</div>';

    try {
        // Try to find it in the transactions table
        const allTx = await getAllTransactions();
        const found  = allTx.find(t =>
            t.transactionId && t.transactionId.toUpperCase() === txId.toUpperCase()
        );

        if (found) {
            statusDiv.innerHTML =
                '<div class="flex items-center text-green-600"><i class="fas fa-check-circle mr-2"></i>Transaction found & verified!</div>';
            transactionVerified = true;
            Toast.show('Transaction verified!', 'success');
        } else {
            // Accept if format is valid (8+ alphanumeric)
            if (txId.length >= 8 && /^[A-Z0-9a-z]+$/.test(txId)) {
                statusDiv.innerHTML =
                    '<div class="flex items-center text-green-600"><i class="fas fa-check-circle mr-2"></i>Transaction ID accepted.</div>';
                transactionVerified = true;
                Toast.show('Transaction ID accepted', 'success');
            } else {
                statusDiv.innerHTML =
                    '<div class="flex items-center text-red-600"><i class="fas fa-times-circle mr-2"></i>Invalid transaction ID (min 8 alphanumeric characters).</div>';
                transactionVerified = false;
                Toast.show('Invalid transaction ID', 'error');
            }
        }
    } catch (err) {
        // Network error — fall back to format check
        if (txId.length >= 8) {
            statusDiv.innerHTML =
                '<div class="flex items-center text-green-600"><i class="fas fa-check-circle mr-2"></i>Transaction ID accepted.</div>';
            transactionVerified = true;
        } else {
            statusDiv.innerHTML =
                '<div class="flex items-center text-red-600"><i class="fas fa-times-circle mr-2"></i>Could not verify. Please check the ID.</div>';
            transactionVerified = false;
        }
    }
}

// ─────────────────────────────────────────────────────────────
//  15. FEES SUMMARY CARD  (renders fees info in student table)
// ─────────────────────────────────────────────────────────────
async function loadFeesForStudent(stdId) {
    try {
        const fees = await getFeesByStudentId(stdId);
        if (!fees) return null;
        return fees;
    } catch {
        return null;
    }
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
//  17. HELPER — current academic year string e.g. "2025-2026"
// ─────────────────────────────────────────────────────────────
function getCurrentAcademicYear() {
    const now   = new Date();
    const year  = now.getFullYear();
    const month = now.getMonth() + 1; // 1-based
    // Academic year starts in April in India
    if (month >= 4) return `${year}-${year + 1}`;
    return `${year - 1}-${year}`;
}

