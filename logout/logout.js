// logout.js — creates toast container + modal dynamically + handles logout

(function () {
    // ────────────────────────────────────────────────
    // Create Toast Container dynamically if not exists
    // ────────────────────────────────────────────────
    if (!document.getElementById('toastContainer')) {
        const container = document.createElement('div');
        container.id = 'toastContainer';
        container.className = 'fixed top-6 right-6 z-[9999] flex flex-col items-end gap-3 pointer-events-none';
        document.body.appendChild(container);
    }

    // ────────────────────────────────────────────────
    // Create Confirmation Modal dynamically if not exists
    // ────────────────────────────────────────────────
    if (!document.getElementById('confirmModal')) {
        const modalHTML = `
            <div id="confirmModal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 hidden">
                <div class="bg-white rounded-xl shadow-2xl p-6 max-w-sm w-full mx-4 transform transition-all scale-95">
                    <h3 class="text-lg font-semibold text-gray-800 mb-4">Confirm Logout</h3>
                    <p class="text-gray-600 mb-6">Are you sure you want to log out?</p>
                    
                    <div class="flex justify-end space-x-3">
                        <button id="confirmCancel"
                                class="px-5 py-2.5 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition font-medium">
                            Cancel
                        </button>
                        <button id="confirmYes"
                                class="px-5 py-2.5 bg-red-600 text-white rounded-lg hover:bg-red-700 transition font-medium flex items-center">
                            <i class="fas fa-sign-out-alt mr-2"></i> Yes, Logout
                        </button>
                    </div>
                </div>
            </div>
        `;

        const modalWrapper = document.createElement('div');
        modalWrapper.innerHTML = modalHTML;
        document.body.appendChild(modalWrapper.firstElementChild);
    }

    // ────────────────────────────────────────────────
    // Toast Class
    // ────────────────────────────────────────────────
    class Toast {
        static show(message, type = 'success', duration = 3000) {
            const toast = document.createElement('div');
            const bgColor = {
                success: 'bg-green-500',
                error:   'bg-red-500',
                warning: 'bg-yellow-500',
                info:    'bg-blue-500'
            }[type] || 'bg-gray-600';

            const icon = {
                success: 'fa-check-circle',
                error:   'fa-exclamation-circle',
                warning: 'fa-exclamation-triangle',
                info:    'fa-info-circle'
            }[type] || 'fa-info-circle';

            toast.className = `toast ${bgColor} text-white flex items-center space-x-3`;
            toast.innerHTML = `
                <i class="fas ${icon} text-xl"></i>
                <span>${message}</span>
            `;

            const container = document.getElementById('toastContainer');
            if (container) {
                container.appendChild(toast);
                setTimeout(() => toast.classList.add('show'), 10);

                setTimeout(() => {
                    toast.classList.remove('show');
                    setTimeout(() => toast.remove(), 400);
                }, duration);
            }
        }
    }

    // ────────────────────────────────────────────────
    // Logout Handler
    // ────────────────────────────────────────────────
    function handleLogout() {
        const modal = document.getElementById('confirmModal');
        if (!modal) return;

        modal.classList.remove('hidden');

        const yesBtn   = document.getElementById('confirmYes');
        const cancelBtn = document.getElementById('confirmCancel');

        // Clone to remove old listeners (prevents duplicates)
        const newYes   = yesBtn.cloneNode(true);
        const newCancel = cancelBtn.cloneNode(true);
        yesBtn.replaceWith(newYes);
        cancelBtn.replaceWith(newCancel);

        newYes.addEventListener('click', () => {
            modal.classList.add('hidden');
            localStorage.removeItem('admin_jwt_token');
            localStorage.removeItem('admin_mobile');
            Toast.show('Logged out successfully', 'success');
            setTimeout(() => window.location.replace('/login.html'), 800);
        }, { once: true });

        newCancel.addEventListener('click', () => {
            modal.classList.add('hidden');
        }, { once: true });

        // Outside click
        const outside = e => {
            if (e.target === modal) modal.classList.add('hidden');
        };
        modal.addEventListener('click', outside, { once: true });

        // Esc key
        const esc = e => {
            if (e.key === 'Escape') {
                modal.classList.add('hidden');
                document.removeEventListener('keydown', esc);
            }
        };
        document.addEventListener('keydown', esc, { once: true });
    }

    // ────────────────────────────────────────────────
    // Auto-attach to logout button
    // ────────────────────────────────────────────────
    document.addEventListener('DOMContentLoaded', () => {
        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', handleLogout);
        }
    });

    // Optional: expose handleLogout globally if needed
    window.handleLogout = handleLogout;
})();