// ============================================================
//  transaction-service.js
//  Base URL: http://localhost:8084
//
//  PURPOSE: Standalone transaction API wrappers using "tx" prefix
//           to avoid any name conflict with fees-service.js
//           which also has createTransaction / getAllTransactions.
//
//  NAMING CONVENTION (no conflicts):
//    TX_BASE, getTxAuthHeaders, txCreate, txGetAll,
//    txGetById, txPatch, txDelete
// ============================================================

const TX_BASE = 'http://localhost:8084';

// ─────────────────────────────────────────────────────────────
//  AUTH HEADER HELPER
// ─────────────────────────────────────────────────────────────
function getTxAuthHeaders(contentType = null) {
    const token   = localStorage.getItem('admin_jwt_token');
    const headers = { 'Authorization': `Bearer ${token}` };
    if (contentType) headers['Content-Type'] = contentType;
    return headers;
}

// ─────────────────────────────────────────────────────────────
//  CREATE TRANSACTION
//  POST /api/transaction/create-transaction
// ─────────────────────────────────────────────────────────────
async function txCreate(payload) {
    const res = await fetch(`${TX_BASE}/api/transaction/create-transaction`, {
        method:  'POST',
        headers: getTxAuthHeaders('application/json'),
        body:    JSON.stringify(payload)
    });
    if (!res.ok) throw new Error(await res.text() || 'Transaction creation failed');
    return await res.json();
}

// ─────────────────────────────────────────────────────────────
//  GET ALL TRANSACTIONS
//  GET /api/transaction/get-all-transactions
// ─────────────────────────────────────────────────────────────
async function txGetAll() {
    const res = await fetch(`${TX_BASE}/api/transaction/get-all-transactions`, {
        headers: getTxAuthHeaders()
    });
    if (!res.ok) throw new Error('Failed to fetch transactions');
    return await res.json();
}

// ─────────────────────────────────────────────────────────────
//  GET TRANSACTION BY ID
//  GET /api/transaction/get-transaction-by-Id/{id}
// ─────────────────────────────────────────────────────────────
async function txGetById(id) {
    const res = await fetch(`${TX_BASE}/api/transaction/get-transaction-by-Id/${id}`, {
        headers: getTxAuthHeaders()
    });
    if (!res.ok) return null;
    return await res.json();
}

// ─────────────────────────────────────────────────────────────
//  PATCH TRANSACTION
//  PATCH /api/transaction/patch-transaction/{id}
// ─────────────────────────────────────────────────────────────
async function txPatch(id, updates) {
    const res = await fetch(`${TX_BASE}/api/transaction/patch-transaction/${id}`, {
        method:  'PATCH',
        headers: getTxAuthHeaders('application/json'),
        body:    JSON.stringify(updates)
    });
    if (!res.ok) throw new Error(await res.text() || 'Transaction patch failed');
    return await res.json();
}

// ─────────────────────────────────────────────────────────────
//  DELETE TRANSACTION
//  DELETE /api/transaction/delete-transaction/{id}
// ─────────────────────────────────────────────────────────────
async function txDelete(id) {
    const res = await fetch(`${TX_BASE}/api/transaction/delete-transaction/${id}`, {
        method:  'DELETE',
        headers: getTxAuthHeaders()
    });
    if (!res.ok) throw new Error('Delete transaction failed');
    return await res.json();
}
