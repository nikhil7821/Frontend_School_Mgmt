// ============================================================
//  transaction-service.js
//  Base URL: http://localhost:8084
//  FIXED: Removed duplicate function names that conflict with
//         fees-service.js. All tx helpers use "tx" prefix.
// ============================================================

const TX_BASE = 'http://localhost:8084';

function getTxAuthHeaders(contentType = null) {
    const token   = localStorage.getItem('admin_jwt_token');
    const headers = { 'Authorization': `Bearer ${token}` };
    if (contentType) headers['Content-Type'] = contentType;
    return headers;
}

// ─────────────────────────────────────────────────────────────
//  CREATE TRANSACTION (standalone, non-conflicting name)
// ─────────────────────────────────────────────────────────────
async function txCreate(payload) {
    const res = await fetch(`${TX_BASE}/api/transaction/create-transaction`, {
        method:  'POST',
        headers: getTxAuthHeaders('application/json'),
        body:    JSON.stringify(payload)
    });
    if (!res.ok) throw new Error(await res.text());
    return await res.json();
}

// ─────────────────────────────────────────────────────────────
//  GET ALL TRANSACTIONS (standalone)
// ─────────────────────────────────────────────────────────────
async function txGetAll() {
    const res = await fetch(`${TX_BASE}/api/transaction/get-all-transactions`, {
        headers: getTxAuthHeaders()
    });
    if (!res.ok) throw new Error('Failed to fetch transactions');
    return await res.json();
}

// ─────────────────────────────────────────────────────────────
//  GET TRANSACTION BY ID (standalone)
// ─────────────────────────────────────────────────────────────
async function txGetById(id) {
    const res = await fetch(`${TX_BASE}/api/transaction/get-transaction-by-Id/${id}`, {
        headers: getTxAuthHeaders()
    });
    if (!res.ok) return null;
    return await res.json();
}

// ─────────────────────────────────────────────────────────────
//  PATCH TRANSACTION (standalone)
// ─────────────────────────────────────────────────────────────
async function txPatch(id, updates) {
    const res = await fetch(`${TX_BASE}/api/transaction/patch-transaction/${id}`, {
        method:  'PATCH',
        headers: getTxAuthHeaders('application/json'),
        body:    JSON.stringify(updates)
    });
    if (!res.ok) throw new Error(await res.text());
    return await res.json();
}

// ─────────────────────────────────────────────────────────────
//  DELETE TRANSACTION (standalone)
// ─────────────────────────────────────────────────────────────
async function txDelete(id) {
    const res = await fetch(`${TX_BASE}/api/transaction/delete-transaction/${id}`, {
        method:  'DELETE',
        headers: getTxAuthHeaders()
    });
    if (!res.ok) throw new Error('Delete failed');
}