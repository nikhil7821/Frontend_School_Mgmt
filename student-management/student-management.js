// // ============================================================
// //  student-service.js
// //  Base URL: http://localhost:8084
// //  Connects frontend student management to Spring Boot backend
// // ============================================================

// const BASE_URL = 'http://localhost:8084';

// // ─────────────────────────────────────────────────────────────
// //  AUTH HEADER HELPER
// // ─────────────────────────────────────────────────────────────
// function getAuthHeaders() {
//     const token = localStorage.getItem('admin_jwt_token');
//     return {
//         'Authorization': `Bearer ${token}`
//     };
// }

// // ─────────────────────────────────────────────────────────────
// //  PAGINATION STATE
// // ─────────────────────────────────────────────────────────────
// let currentPage = 0;
// let totalPages  = 0;
// let totalElements = 0;
// const PAGE_SIZE = 10;

// // ─────────────────────────────────────────────────────────────
// //  1. LOAD ALL STUDENTS  (paginated)
// // ─────────────────────────────────────────────────────────────
// async function loadStudents(page = 0) {
//     showLoading(true);
//     try {
//         const res = await fetch(
//             `${BASE_URL}/api/students/get-all-students?page=${page}&size=${PAGE_SIZE}&direction=desc`,
//             { headers: getAuthHeaders() }
//         );

//         if (!res.ok) throw new Error('Failed to fetch students');

//         const data = await res.json();

//         // Spring Page response
//         const students = data.content || [];
//         currentPage   = data.number || 0;
//         totalPages    = data.totalPages || 1;
//         totalElements = data.totalElements || 0;

//         renderStudentTable(students);
//         renderPagination();
//         updateStatsFromPage(data);

//     } catch (err) {
//         console.error('loadStudents error:', err);
//         Toast.show('Failed to load students: ' + err.message, 'error');
//     } finally {
//         showLoading(false);
//     }
// }

// // ─────────────────────────────────────────────────────────────
// //  2. RENDER STUDENT TABLE
// // ─────────────────────────────────────────────────────────────
// function renderStudentTable(students) {
//     const tbody = document.getElementById('studentTableBody');
//     tbody.innerHTML = '';

//     if (!students || students.length === 0) {
//         tbody.innerHTML = `
//             <tr>
//                 <td colspan="6" class="px-6 py-12 text-center text-gray-500">
//                     <i class="fas fa-user-graduate text-4xl mb-3 text-gray-300"></i>
//                     <p class="text-lg font-medium">No students found</p>
//                 </td>
//             </tr>`;
//         return;
//     }

//     students.forEach(student => {
//         const fees       = student.feesDetails;
//         const feeBadge   = buildFeeBadge(fees);
//         const statusIcon = student.status.toLowerCase() === 'active'
//             ? '<i class="fas fa-circle text-green-500 mr-1 text-xs"></i>'
//             : '<i class="fas fa-circle text-red-500 mr-1 text-xs"></i>';

//         const profileImg = student.profileImageUrl
//             ? `<img src="${BASE_URL}${student.profileImageUrl}" class="h-10 w-10 rounded-full object-cover" alt="photo">`
//             : `<div class="h-10 w-10 bg-blue-100 rounded-full flex items-center justify-center">
//                    <i class="fas fa-user-graduate text-blue-600"></i>
//                </div>`;

//         const tr = document.createElement('tr');
//         tr.innerHTML = `
//             <td class="px-4 lg:px-6 py-4">
//                 <input type="checkbox" class="student-checkbox rounded border-gray-300" data-id="${student.stdId}">
//             </td>
//             <td class="px-4 lg:px-6 py-4">
//                 <div class="flex items-center">
//                     ${profileImg}
//                     <div class="ml-3">
//                         <p class="font-semibold text-gray-800">${student.firstName} ${student.lastName || ''}</p>
//                         <p class="text-sm text-gray-500">ID: ${student.studentId || '-'}</p>
//                         <div class="flex items-center mt-1">
//                             ${statusIcon}
//                             <span class="text-xs ${student.status === 'active' ? 'text-green-600' : 'text-red-600'}">
//                                 ${student.status === 'active' ? 'Active' : 'Inactive'}
//                             </span>
//                         </div>
//                     </div>
//                 </div>
//             </td>
//             <td class="px-4 lg:px-6 py-4">
//                 <p class="font-medium text-gray-800">Class ${student.currentClass || '-'} ${student.section || ''}</p>
//                 <p class="text-sm text-gray-500">Roll: ${student.studentRollNumber || '-'}</p>
//             </td>
//             <td class="px-4 lg:px-6 py-4">
//                 <p class="text-sm text-gray-800">${student.fatherName || '-'}</p>
//                 <p class="text-sm text-gray-500">${student.fatherPhone || student.motherPhone || '-'}</p>
//                 <p class="text-sm text-gray-500">${student.fatherEmail || student.motherEmail || '-'}</p>
//             </td>
//             <td class="px-4 lg:px-6 py-4">${feeBadge}</td>
//             <td class="px-4 lg:px-6 py-4">
//                 <div class="flex space-x-2">
//                     <button onclick="viewStudent(${student.stdId})"
//                         class="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-all" title="View">
//                         <i class="fas fa-eye"></i>
//                     </button>
//                     <button onclick="editStudent(${student.stdId})"
//                         class="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-all" title="Edit">
//                         <i class="fas fa-edit"></i>
//                     </button>
//                     <button onclick="deleteStudent(${student.stdId})"
//                         class="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-all" title="Delete">
//                         <i class="fas fa-trash"></i>
//                     </button>
//                 </div>
//             </td>`;
//         tbody.appendChild(tr);
//     });
// }

// // Fee badge helper
// function buildFeeBadge(fees) {
//     if (!fees) return '<span class="status-badge status-pending">No Fees Set</span>';
//     const status = fees.paymentStatus || '';
//     if (status === 'FULLY PAID') {
//         return `<span class="status-badge status-paid">Fully Paid</span>`;
//     } else if (status === 'PARTIALLY PAID') {
//         const paid    = (fees.initialAmount || 0).toLocaleString('en-IN');
//         const total   = (fees.totalFees    || 0).toLocaleString('en-IN');
//         return `<span class="status-badge status-partial">Partial ₹${paid}/₹${total}</span>`;
//     }
//     const pending = (fees.remainingFees || 0).toLocaleString('en-IN');
//     return `<span class="status-badge status-pending">Pending ₹${pending}</span>`;
// }

// // ─────────────────────────────────────────────────────────────
// //  3. PAGINATION CONTROLS
// // ─────────────────────────────────────────────────────────────
// function renderPagination() {
//     const start = currentPage * PAGE_SIZE + 1;
//     const end   = Math.min((currentPage + 1) * PAGE_SIZE, totalElements);

//     document.getElementById('startCount').textContent = totalElements ? start : 0;
//     document.getElementById('endCount').textContent   = end;
//     document.getElementById('totalCount').textContent = totalElements;

//     document.getElementById('prevBtn').disabled = currentPage === 0;
//     document.getElementById('nextBtn').disabled = currentPage >= totalPages - 1;

//     const pageNumbers = document.getElementById('pageNumbers');
//     pageNumbers.innerHTML = '';

//     const maxButtons = 5;
//     let startPage = Math.max(0, currentPage - 2);
//     let endPage   = Math.min(totalPages - 1, startPage + maxButtons - 1);
//     if (endPage - startPage < maxButtons - 1) startPage = Math.max(0, endPage - maxButtons + 1);

//     for (let i = startPage; i <= endPage; i++) {
//         const btn = document.createElement('button');
//         btn.textContent = i + 1;
//         btn.className = `px-3 py-1 border rounded-lg text-sm transition-all ${
//             i === currentPage
//                 ? 'bg-blue-600 text-white border-blue-600'
//                 : 'border-gray-300 hover:bg-gray-100'
//         }`;
//         btn.onclick = () => loadStudents(i);
//         pageNumbers.appendChild(btn);
//     }
// }

// function previousPage() { if (currentPage > 0) loadStudents(currentPage - 1); }
// function nextPage()     { if (currentPage < totalPages - 1) loadStudents(currentPage + 1); }

// // ─────────────────────────────────────────────────────────────
// //  4. UPDATE STATS FROM PAGE DATA
// // ─────────────────────────────────────────────────────────────
// async function updateStatsFromPage(pageData) {
//     try {
//         document.getElementById('totalStudentsCount').textContent = pageData.totalElements || 0;

//         const statsRes = await fetch(
//             `${BASE_URL}/api/students/get-student-statistics`,
//             { headers: getAuthHeaders() }
//         );
//         if (statsRes.ok) {
//             const stats = await statsRes.json();
//             document.getElementById('activeStudentsCount').textContent =
//                 stats.activeStudents || stats.totalStudents || 0;
//             document.getElementById('pendingFeesCount').textContent =
//                 stats.pendingFeesCount || 0;
//         }
//     } catch (err) {
//         console.warn('Stats update failed:', err.message);
//     }
// }

// // ─────────────────────────────────────────────────────────────
// //  5. SEARCH & FILTER (debounced)
// // ─────────────────────────────────────────────────────────────
// let searchDebounce;
// async function searchAndFilter() {
//     clearTimeout(searchDebounce);
//     searchDebounce = setTimeout(async () => {
//         const query       = document.getElementById('searchStudent')?.value.trim() || '';
//         const classFilter = document.getElementById('filterClass')?.value || '';
//         const sectFilter  = document.getElementById('filterSection')?.value || '';
//         const statusFilter= document.getElementById('filterStudentStatus')?.value || '';

//         showLoading(true);
//         try {
//             let students = [];

//             if (query) {
//                 // Use search endpoint
//                 const params = new URLSearchParams();
//                 params.append('name', query);
//                 params.append('fatherName', query);
//                 const res = await fetch(
//                     `${BASE_URL}/api/students/search-students?${params}`,
//                     { headers: getAuthHeaders() }
//                 );
//                 if (res.ok) students = await res.json();
//             } else if (classFilter && sectFilter) {
//                 const res = await fetch(
//                     `${BASE_URL}/api/students/get-students-by-class-section?className=${encodeURIComponent(classFilter)}&section=${encodeURIComponent(sectFilter)}`,
//                     { headers: getAuthHeaders() }
//                 );
//                 if (res.ok) students = await res.json();
//             } else if (classFilter) {
//                 const res = await fetch(
//                     `${BASE_URL}/api/students/get-students-by-class/${encodeURIComponent(classFilter)}`,
//                     { headers: getAuthHeaders() }
//                 );
//                 if (res.ok) students = await res.json();
//             } else if (statusFilter) {
//                 const res = await fetch(
//                     `${BASE_URL}/api/students/get-students-by-status/${encodeURIComponent(statusFilter)}`,
//                     { headers: getAuthHeaders() }
//                 );
//                 if (res.ok) students = await res.json();
//             } else {
//                 // No filters — reload paginated
//                 await loadStudents(0);
//                 return;
//             }

//             renderStudentTable(students);
//             document.getElementById('totalCount').textContent  = students.length;
//             document.getElementById('startCount').textContent  = students.length ? 1 : 0;
//             document.getElementById('endCount').textContent    = students.length;
//             document.getElementById('pageNumbers').innerHTML   = '';
//             document.getElementById('prevBtn').disabled = true;
//             document.getElementById('nextBtn').disabled = true;

//         } catch (err) {
//             Toast.show('Search failed: ' + err.message, 'error');
//         } finally {
//             showLoading(false);
//         }
//     }, 400);
// }

// // ─────────────────────────────────────────────────────────────
// //  6. LOAD CLASSES INTO FILTER DROPDOWNS (from ClassController)
// // ─────────────────────────────────────────────────────────────
// async function loadClassesIntoFilters() {
//     try {
//         const res = await fetch(
//             `${BASE_URL}/api/classes/get-classes-by-status/ACTIVE`,
//             { headers: getAuthHeaders() }
//         );
//         if (!res.ok) return;

//         const classes = await res.json();

//         const filterClass   = document.getElementById('filterClass');
//         const filterSection = document.getElementById('filterSection');

//         const classNames = [...new Set(classes.map(c => c.className))].sort();
//         const sections   = [...new Set(classes.map(c => c.section).filter(Boolean))].sort();

//         classNames.forEach(name => {
//             const opt = document.createElement('option');
//             opt.value = name; opt.textContent = name;
//             filterClass.appendChild(opt);
//         });

//         sections.forEach(sec => {
//             const opt = document.createElement('option');
//             opt.value = sec; opt.textContent = `Section ${sec}`;
//             filterSection.appendChild(opt);
//         });

//         // Also populate the Add Student form class dropdown from classes
//         const formClassSelect = document.querySelector('select[name="class"]');
//         if (formClassSelect) {
//             formClassSelect.innerHTML = '<option value="">Select Class</option>';
//             classNames.forEach(name => {
//                 const opt = document.createElement('option');
//                 opt.value = name; opt.textContent = name;
//                 formClassSelect.appendChild(opt);
//             });
//         }

//     } catch (err) {
//         console.warn('Could not load classes for filters:', err.message);
//     }
// }

// // ─────────────────────────────────────────────────────────────
// //  7. VIEW STUDENT (fetch from backend)
// // ─────────────────────────────────────────────────────────────
// async function viewStudent(stdId) {
//     showLoading(true);
//     try {
//         const res = await fetch(
//             `${BASE_URL}/api/students/get-student-by-id/${stdId}`,
//             { headers: getAuthHeaders() }
//         );
//         if (!res.ok) throw new Error('Student not found');
//         const student = await res.json();
//         renderViewModal(student);
//     } catch (err) {
//         Toast.show('Could not load student: ' + err.message, 'error');
//     } finally {
//         showLoading(false);
//     }
// }

// function renderViewModal(student) {
//     const modal = document.getElementById('viewModalOverlay');
//     modal.classList.add('show');

//     const fees    = student.feesDetails || {};
//     const nameStr = [student.firstName, student.middleName, student.lastName]
//         .filter(Boolean).join(' ');

//     const profileSrc = student.profileImageUrl
//         ? `${BASE_URL}${student.profileImageUrl}`
//         : null;

//     modal.querySelector('.modal-content').innerHTML = `
//         <div class="p-6 lg:p-8">
//             <div class="flex justify-between items-center mb-6">
//                 <h3 class="text-xl lg:text-2xl font-bold text-gray-800">Student Details — ${nameStr}</h3>
//                 <button onclick="closeModal('viewModalOverlay')" class="text-gray-500 hover:text-gray-700">
//                     <i class="fas fa-times text-2xl"></i>
//                 </button>
//             </div>

//             <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
//                 <!-- LEFT COLUMN -->
//                 <div class="lg:col-span-1 space-y-6">
//                     <!-- Profile card -->
//                     <div class="bg-gradient-to-br from-blue-50 to-purple-50 rounded-xl p-6 text-center">
//                         <div class="h-32 w-32 rounded-full mx-auto mb-4 overflow-hidden border-4 border-white shadow-lg flex items-center justify-center bg-gray-200">
//                             ${profileSrc
//                                 ? `<img src="${profileSrc}" class="h-full w-full object-cover" alt="photo">`
//                                 : `<i class="fas fa-user-graduate text-6xl text-blue-400"></i>`}
//                         </div>
//                         <h4 class="text-xl font-bold text-gray-800">${nameStr}</h4>
//                         <p class="text-gray-500 text-sm">${student.studentId || ''}</p>
//                         <div class="mt-3 flex justify-center flex-wrap gap-2">
//                             <span class="px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
//                                 Class ${student.currentClass || '-'} — ${student.section || '-'}
//                             </span>
//                             <span class="px-3 py-1 rounded-full text-xs font-medium ${student.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}">
//                                 ${student.status || 'Unknown'}
//                             </span>
//                         </div>
//                         <p class="text-sm text-gray-500 mt-2">Roll: ${student.studentRollNumber || '-'}</p>
//                     </div>

//                     <!-- Fee summary -->
//                     <div class="bg-white rounded-xl border border-gray-200 p-4">
//                         <h5 class="font-semibold text-gray-700 mb-3">Fee Status</h5>
//                         <div class="space-y-2 text-sm">
//                             ${feeRow('Total Fees',     '₹' + (fees.totalFees     || 0).toLocaleString('en-IN'))}
//                             ${feeRow('Admission',      '₹' + (fees.admissionFees || 0).toLocaleString('en-IN'))}
//                             ${feeRow('Uniform',        '₹' + (fees.uniformFees   || 0).toLocaleString('en-IN'))}
//                             ${feeRow('Books',          '₹' + (fees.bookFees      || 0).toLocaleString('en-IN'))}
//                             ${feeRow('Tuition',        '₹' + (fees.tuitionFees   || 0).toLocaleString('en-IN'))}
//                             <div class="pt-2 border-t">
//                                 ${feeRow('Paid',    '<span class="text-green-600 font-semibold">₹' + ((fees.totalFees||0) - (fees.remainingFees||0)).toLocaleString('en-IN') + '</span>')}
//                                 ${feeRow('Pending', '<span class="text-red-600 font-semibold">₹' + (fees.remainingFees||0).toLocaleString('en-IN') + '</span>')}
//                             </div>
//                             <div class="pt-2 border-t">
//                                 ${feeRow('Payment Mode',   fees.paymentMode   || '-')}
//                                 ${feeRow('Payment Status', fees.paymentStatus || '-')}
//                                 ${fees.transactionId ? feeRow('Transaction ID', fees.transactionId) : ''}
//                             </div>
//                         </div>
//                     </div>

//                     <!-- Documents -->
//                     <div class="bg-white rounded-xl border border-gray-200 p-4">
//                         <h5 class="font-semibold text-gray-700 mb-3">Documents</h5>
//                         <div class="space-y-2 text-sm">
//                             ${docLink('Profile Photo',           student.profileImageUrl,           student.stdId, 'profile-image')}
//                             ${docLink('Student Aadhar',          student.studentAadharImageUrl,      student.stdId, 'aadhar-image')}
//                             ${docLink('Father Aadhar',           student.fatherAadharImageUrl,       student.stdId, 'father-aadhar-image')}
//                             ${docLink('Mother Aadhar',           student.motherAadharImageUrl,       student.stdId, 'mother-aadhar-image')}
//                             ${docLink('Birth Certificate',       student.birthCertificateImageUrl,   student.stdId, 'birth-certificate')}
//                             ${docLink('Transfer Certificate',    student.transferCertificateImageUrl,student.stdId, 'transfer-certificate')}
//                             ${docLink('Mark Sheet',              student.markSheetImageUrl,          student.stdId, 'marksheet')}
//                         </div>
//                     </div>
//                 </div>

//                 <!-- RIGHT COLUMNS -->
//                 <div class="lg:col-span-2 space-y-6">
//                     <!-- Personal -->
//                     <div class="bg-white rounded-xl border border-gray-200 p-4">
//                         <h5 class="font-semibold text-gray-700 mb-3">Personal Details</h5>
//                         <div class="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
//                             ${infoRow('Date of Birth',    formatDate(student.dateOfBirth))}
//                             ${infoRow('Gender',           student.gender       || '-')}
//                             ${infoRow('Blood Group',      student.bloodGroup   || '-')}
//                             ${infoRow('Caste Category',   student.casteCategory|| '-')}
//                             ${infoRow('Aadhar Number',    student.aadharNumber || '-')}
//                             ${infoRow('Medical Info',     student.medicalInfo  || '-')}
//                             ${infoRow('Previous School',  student.previousSchool|| '-')}
//                             ${infoRow('Sports', (student.sportsActivity||[]).join(', ') || '-')}
//                             ${infoRow('Subjects', (student.subjects||[]).join(', ') || '-')}
//                         </div>
//                     </div>

//                     <!-- Academic -->
//                     <div class="bg-white rounded-xl border border-gray-200 p-4">
//                         <h5 class="font-semibold text-gray-700 mb-3">Academic Details</h5>
//                         <div class="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
//                             ${infoRow('Admission Date',  formatDate(student.admissionDate))}
//                             ${infoRow('Academic Year',   student.academicYear  || '-')}
//                             ${infoRow('Class Teacher',   student.classTeacher  || '-')}
//                         </div>
//                     </div>

//                     <!-- Parent -->
//                     <div class="bg-white rounded-xl border border-gray-200 p-4">
//                         <h5 class="font-semibold text-gray-700 mb-3">Parent / Guardian Details</h5>
//                         <div class="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
//                             ${infoRow('Father Name',        student.fatherName       || '-')}
//                             ${infoRow('Father Phone',       student.fatherPhone      || '-')}
//                             ${infoRow('Father Email',       student.fatherEmail      || '-')}
//                             ${infoRow('Father Occupation',  student.fatherOccupation || '-')}
//                             ${infoRow('Mother Name',        student.motherName       || '-')}
//                             ${infoRow('Mother Phone',       student.motherPhone      || '-')}
//                             ${infoRow('Mother Email',       student.motherEmail      || '-')}
//                             ${infoRow('Mother Occupation',  student.motherOccupation || '-')}
//                             ${infoRow('Emergency Contact',  student.emergencyContact || '-')}
//                             ${infoRow('Emergency Relation', student.emergencyRelation|| '-')}
//                         </div>
//                     </div>

//                     <!-- Address -->
//                     <div class="bg-white rounded-xl border border-gray-200 p-4">
//                         <h5 class="font-semibold text-gray-700 mb-3">Address</h5>
//                         <div class="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
//                             <div>
//                                 <p class="font-medium text-blue-600 mb-1">Local Address</p>
//                                 <p>${[student.localAddress, student.localCity, student.localState, student.localPincode].filter(Boolean).join(', ') || '-'}</p>
//                             </div>
//                             <div>
//                                 <p class="font-medium text-green-600 mb-1">Permanent Address</p>
//                                 <p>${[student.permanentAddress, student.permanentCity, student.permanentState, student.permanentPincode].filter(Boolean).join(', ') || '-'}</p>
//                             </div>
//                         </div>
//                     </div>
//                 </div>
//             </div>

//             <!-- Modal footer -->
//             <div class="flex justify-end space-x-3 mt-8 pt-6 border-t border-gray-200">
//                 <button onclick="editStudent(${student.stdId}); closeModal('viewModalOverlay')"
//                     class="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-all font-medium">
//                     <i class="fas fa-edit mr-2"></i>Edit Student
//                 </button>
//                 <button onclick="closeModal('viewModalOverlay')"
//                     class="px-6 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-all font-medium">
//                     <i class="fas fa-times mr-2"></i>Close
//                 </button>
//             </div>
//         </div>`;
// }

// // Small HTML helpers
// function feeRow(label, val)  { return `<div class="flex justify-between"><span class="text-gray-500">${label}:</span><span>${val}</span></div>`; }
// function infoRow(label, val) { return `<div><span class="text-gray-500 block">${label}</span><span class="font-medium">${val}</span></div>`; }
// function docLink(label, url, stdId, endpoint) {
//     if (!url) return `<div class="flex justify-between"><span class="text-gray-500">${label}:</span><span class="text-gray-400 italic">Not uploaded</span></div>`;
//     return `<div class="flex justify-between items-center">
//         <span class="text-gray-500">${label}:</span>
//         <a href="${BASE_URL}/api/students/${stdId}/${endpoint}" target="_blank"
//             class="text-blue-600 hover:underline text-xs">
//             <i class="fas fa-external-link-alt mr-1"></i>View
//         </a>
//     </div>`;
// }

// function formatDate(dateStr) {
//     if (!dateStr) return '-';
//     try {
//         return new Date(dateStr).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
//     } catch { return dateStr; }
// }

// // ─────────────────────────────────────────────────────────────
// //  8. EDIT STUDENT (fetch then populate form)
// // ─────────────────────────────────────────────────────────────
// async function editStudent(stdId) {
//     showLoading(true);
//     try {
//         const res = await fetch(
//             `${BASE_URL}/api/students/get-student-by-id/${stdId}`,
//             { headers: getAuthHeaders() }
//         );
//         if (!res.ok) throw new Error('Student not found');

//         const student = await res.json();
//         editingStudentId = stdId;

//         document.getElementById('allStudentsSection').classList.add('hidden');
//         document.getElementById('addStudentSection').classList.remove('hidden');
//         document.getElementById('formTitle').textContent = `Edit — ${student.firstName} ${student.lastName || ''}`;

//         switchTab('personal');
//         window.scrollTo(0, 0);
//         populateEditForm(student);

//         document.getElementById('submitButton').innerHTML =
//             '<i class="fas fa-save mr-2"></i>Update Student';

//         Toast.show('Editing: ' + student.firstName, 'info');
//     } catch (err) {
//         Toast.show('Could not load student for editing: ' + err.message, 'error');
//     } finally {
//         showLoading(false);
//     }
// }

// // ─────────────────────────────────────────────────────────────
// //  9. POPULATE EDIT FORM  (maps backend fields → form fields)
// // ─────────────────────────────────────────────────────────────
// function populateEditForm(student) {
//     const set = (sel, val) => {
//         const el = document.querySelector(sel);
//         if (el) el.value = val || '';
//     };

//     // Personal
//     set('input[name="firstName"]',    student.firstName);
//     set('input[name="middleName"]',   student.middleName);
//     set('input[name="lastName"]',     student.lastName);
//     set('input[name="dob"]',          student.dateOfBirth ? student.dateOfBirth.split('T')[0] : '');
//     set('select[name="gender"]',      student.gender);
//     set('select[name="bloodGroup"]',  student.bloodGroup);
//     set('select[name="casteCategory"]',student.casteCategory);
//     set('input[name="previousSchool"]',student.previousSchool);
//     set('input[name="aadharNumber"]', student.aadharNumber);
//     set('textarea[name="medicalInfo"]',student.medicalInfo);

//     // Student ID (read-only in edit mode)
//     document.getElementById('studentId').value    = student.studentId || '';
//     document.getElementById('studentId').readOnly = true;
//     document.getElementById('studentPassword').value             = '********';
//     document.getElementById('studentPassword').readOnly          = true;
//     document.getElementById('confirmStudentPassword').value      = '********';
//     document.getElementById('confirmStudentPassword').readOnly   = true;
//     document.getElementById('autoGeneratedId').textContent       = student.studentId || '';

//     // Local address
//     set('input[name="localAddressLine1"]', student.localAddress);
//     set('input[name="localCity"]',         student.localCity);
//     set('input[name="localState"]',        student.localState);
//     set('input[name="localPincode"]',      student.localPincode);

//     // Permanent address
//     set('input[name="permanentAddressLine1"]', student.permanentAddress);
//     set('input[name="permanentCity"]',         student.permanentCity);
//     set('input[name="permanentState"]',        student.permanentState);
//     set('input[name="permanentPincode"]',      student.permanentPincode);

//     // Sports
//     const sports = student.sportsActivity || [];
//     otherSports = [];
//     document.querySelectorAll('input[name="sports[]"]').forEach(cb => {
//         cb.checked = sports.includes(cb.value);
//     });
//     sports.filter(s => !['cricket','football','basketball','chess'].includes(s))
//           .forEach(s => otherSports.push(s));
//     updateOtherSportsDisplay();

//     // Academic
//     set('select[name="class"]',        student.currentClass);
//     set('select[name="section"]',      student.section);
//     set('input[name="rollNumber"]',    student.studentRollNumber);
//     set('input[name="admissionDate"]', student.admissionDate ? student.admissionDate.split('T')[0] : '');
//     set('select[name="academicYear"]', student.academicYear);
//     set('select[name="classTeacher"]', student.classTeacher);

//     // Subjects
//     const subjects = student.subjects || [];
//     otherSubjects = [];
//     document.querySelectorAll('input[name="subjects[]"]').forEach(cb => {
//         cb.checked = subjects.includes(cb.value);
//     });
//     subjects.filter(s => !['english','hindi','mathematics','science'].includes(s))
//             .forEach(s => otherSubjects.push(s));
//     updateOtherSubjectsDisplay();

//     // Parent
//     set('input[name="fatherName"]',        student.fatherName);
//     set('input[name="fatherContact"]',     student.fatherPhone);
//     set('input[name="fatherOccupation"]',  student.fatherOccupation);
//     set('input[name="motherName"]',        student.motherName);
//     set('input[name="motherContact"]',     student.motherPhone);
//     set('input[name="motherOccupation"]',  student.motherOccupation);
//     set('input[name="parentEmail"]',       student.fatherEmail || student.motherEmail);
//     set('input[name="emergencyContactName"]',   student.emergencyContact);
//     set('input[name="emergencyContactNumber"]',  student.emergencyRelation);

//     // Fees
//     const fees = student.feesDetails || {};
//     document.getElementById('admissionFees').value  = fees.admissionFees  || 0;
//     document.getElementById('uniformFees').value    = fees.uniformFees    || 0;
//     document.getElementById('bookFees').value       = fees.bookFees       || 0;
//     document.getElementById('tuitionFees').value    = fees.tuitionFees    || 0;
//     document.getElementById('initialPayment').value = fees.initialAmount  || 0;

//     const payMode = fees.paymentMode || 'one-time';
//     const pmRadio = document.querySelector(`input[name="paymentMode"][value="${payMode}"]`);
//     if (pmRadio) { pmRadio.checked = true; toggleInstallmentOptions(); }

//     updateFeeCalculations();
// }

// // ─────────────────────────────────────────────────────────────
// //  10. HANDLE ADD / UPDATE STUDENT (main submit handler)
// // ─────────────────────────────────────────────────────────────
// async function handleAddStudent() {
//     const password        = document.getElementById('studentPassword').value;
//     const confirmPassword = document.getElementById('confirmStudentPassword').value;

//     if (!editingStudentId && password !== confirmPassword) {
//         Toast.show('Passwords do not match', 'error');
//         document.getElementById('passwordMismatch').classList.remove('hidden');
//         return;
//     }

//     const paymentMethod = document.querySelector('input[name="paymentMethod"]:checked').value;
//     if (paymentMethod === 'online' && !transactionVerified) {
//         Toast.show('Please verify the transaction ID before proceeding', 'error');
//         return;
//     }

//     showLoading(true);
//     try {
//         // Build FormData (multipart) so images can be sent
//         const formData = buildFormData();

//         let res;
//         if (editingStudentId) {
//             // UPDATE with files
//             res = await fetch(
//                 `${BASE_URL}/api/students/update-student-with-files/${editingStudentId}`,
//                 {
//                     method: 'PATCH',
//                     headers: getAuthHeaders(),   // No Content-Type — browser sets multipart boundary
//                     body: formData
//                 }
//             );
//         } else {
//             // CREATE with files
//             res = await fetch(
//                 `${BASE_URL}/api/students/create-student-with-files`,
//                 {
//                     method: 'POST',
//                     headers: getAuthHeaders(),
//                     body: formData
//                 }
//             );
//         }

//         if (!res.ok) {
//             const errText = await res.text();
//             throw new Error(errText || 'Server error');
//         }

//         const savedStudent = await res.json();

//         Toast.show(
//             editingStudentId ? 'Student updated successfully!' : 'Student registered successfully!',
//             'success'
//         );

//         editingStudentId = null;

//         setTimeout(() => showAllStudentsSection(), 1500);

//     } catch (err) {
//         Toast.show('Error: ' + err.message, 'error');
//         console.error('handleAddStudent error:', err);
//     } finally {
//         showLoading(false);
//     }
// }

// // ─────────────────────────────────────────────────────────────
// //  11. BUILD FORM DATA (multipart)
// // ─────────────────────────────────────────────────────────────
// function buildFormData() {
//     const form = document.getElementById('addStudentForm');
//     const fd   = new FormData();

//     // ── build the JSON payload ──────────────────────────────
//     const sameAsLocal = document.getElementById('sameAsLocal').checked;

//     // Collect checked sports
//     const checkedSports = [...document.querySelectorAll('input[name="sports[]"]:checked')]
//         .map(cb => cb.value);
//     const allSports = [...checkedSports, ...otherSports];

//     // Collect checked subjects
//     const checkedSubjects = [...document.querySelectorAll('input[name="subjects[]"]:checked')]
//         .map(cb => cb.value);
//     const allSubjects = [...checkedSubjects, ...otherSubjects];

//     const localAddress = form.querySelector('input[name="localAddressLine1"]')?.value || '';
//     const localAddress2= form.querySelector('input[name="localAddressLine2"]')?.value || '';
//     const fullLocalAddr= [localAddress, localAddress2].filter(Boolean).join(', ');

//     const permAddress  = sameAsLocal ? fullLocalAddr
//         : [form.querySelector('input[name="permanentAddressLine1"]')?.value,
//            form.querySelector('input[name="permanentAddressLine2"]')?.value]
//             .filter(Boolean).join(', ');
//     const permCity     = sameAsLocal ? form.querySelector('input[name="localCity"]')?.value
//         : form.querySelector('input[name="permanentCity"]')?.value;
//     const permState    = sameAsLocal ? form.querySelector('input[name="localState"]')?.value
//         : form.querySelector('input[name="permanentState"]')?.value;
//     const permPincode  = sameAsLocal ? form.querySelector('input[name="localPincode"]')?.value
//         : form.querySelector('input[name="permanentPincode"]')?.value;

//     // Additional fees map
//     const additionalFeesMap = {};
//     document.querySelectorAll('#additionalFeesList > div').forEach(row => {
//         const spans  = row.querySelectorAll('span');
//         const name   = spans[0]?.textContent.trim();
//         const amount = parseInt(spans[1]?.textContent.replace(/[₹,]/g, '')) || 0;
//         if (name) additionalFeesMap[name] = amount;
//     });

//     // Installments list
//     const installmentsList = [];
//     if (document.querySelector('input[name="paymentMode"]:checked')?.value === 'installment') {
//         document.querySelectorAll('#installmentBreakdown > div').forEach((row, i) => {
//             const amtText  = row.querySelector('.text-blue-600')?.textContent || '0';
//             const dateText = row.querySelector('.text-xs')?.textContent?.replace('Due: ', '') || '';
//             const amount   = parseInt(amtText.replace(/[₹,]/g, '')) || 0;
//             if (amount > 0) {
//                 installmentsList.push({
//                     installmentNumber: i + 1,
//                     amount,
//                     dueDate: dateText || null,
//                     status: 'PENDING'
//                 });
//             }
//         });
//     }

//     const studentData = {
//         studentRollNumber: form.querySelector('input[name="rollNumber"]')?.value || '',
//         firstName:         form.querySelector('input[name="firstName"]')?.value  || '',
//         middleName:        form.querySelector('input[name="middleName"]')?.value || '',
//         lastName:          form.querySelector('input[name="lastName"]')?.value   || '',
//         studentPassword:   document.getElementById('studentPassword').value === '********'
//                             ? undefined
//                             : document.getElementById('studentPassword').value,
//         dateOfBirth:       form.querySelector('input[name="dob"]')?.value        || null,
//         gender:            form.querySelector('select[name="gender"]')?.value    || '',
//         bloodGroup:        form.querySelector('select[name="bloodGroup"]')?.value|| '',
//         aadharNumber:      form.querySelector('input[name="aadharNumber"]')?.value || '',
//         casteCategory:     form.querySelector('select[name="casteCategory"]')?.value || '',
//         medicalInfo:       form.querySelector('textarea[name="medicalInfo"]')?.value || '',
//         sportsActivity:    allSports,

//         // Local address
//         localAddress:  fullLocalAddr,
//         localCity:     form.querySelector('input[name="localCity"]')?.value    || '',
//         localState:    form.querySelector('input[name="localState"]')?.value   || '',
//         localPincode:  form.querySelector('input[name="localPincode"]')?.value || '',

//         // Permanent address
//         permanentAddress: permAddress || '',
//         permanentCity:    permCity    || '',
//         permanentState:   permState   || '',
//         permanentPincode: permPincode || '',

//         // Parent/Guardian
//         fatherName:        form.querySelector('input[name="fatherName"]')?.value       || '',
//         fatherPhone:       form.querySelector('input[name="fatherContact"]')?.value    || '',
//         fatherOccupation:  form.querySelector('input[name="fatherOccupation"]')?.value || '',
//         fatherEmail:       form.querySelector('input[name="parentEmail"]')?.value      || '',
//         motherName:        form.querySelector('input[name="motherName"]')?.value       || '',
//         motherPhone:       form.querySelector('input[name="motherContact"]')?.value    || '',
//         motherOccupation:  form.querySelector('input[name="motherOccupation"]')?.value || '',
//         motherEmail:       form.querySelector('input[name="parentEmail"]')?.value      || '',
//         emergencyContact:  form.querySelector('input[name="emergencyContactName"]')?.value   || '',
//         emergencyRelation: form.querySelector('input[name="emergencyContactNumber"]')?.value || '',

//         // Academic
//         currentClass:  form.querySelector('select[name="class"]')?.value        || '',
//         section:       form.querySelector('select[name="section"]')?.value      || '',
//         academicYear:  form.querySelector('select[name="academicYear"]')?.value || '',
//         admissionDate: form.querySelector('input[name="admissionDate"]')?.value  || null,
//         classTeacher:  form.querySelector('select[name="classTeacher"]')?.value  || '',
//         previousSchool:form.querySelector('input[name="previousSchool"]')?.value  || '',
//         subjects:      allSubjects,
//         status:        'active',
//         createdBy:     'Admin',

//         // Fees
//         admissionFees:      parseInt(document.getElementById('admissionFees').value)  || 0,
//         uniformFees:        parseInt(document.getElementById('uniformFees').value)    || 0,
//         bookFees:           parseInt(document.getElementById('bookFees').value)       || 0,
//         tuitionFees:        parseInt(document.getElementById('tuitionFees').value)    || 0,
//         initialAmount:      parseInt(document.getElementById('initialPayment').value) || 0,
//         additionalFeesList: additionalFeesMap,
//         paymentMode:        document.querySelector('input[name="paymentMode"]:checked')?.value || 'one-time',
//         installmentsList,
//         cashierName:        'Admin',
//         transactionId:      document.getElementById('transactionId')?.value || ''
//     };

//     // Remove undefined keys
//     Object.keys(studentData).forEach(k => {
//         if (studentData[k] === undefined) delete studentData[k];
//     });

//     fd.append('studentData', JSON.stringify(studentData));

//     // ── append image files ──────────────────────────────────
//     const fileMap = {
//         profileImage:             'studentPhoto',
//         studentAadharImage:       'studentAadharImage',
//         fatherAadharImage:        'fatherAadharImage',
//         motherAadharImage:        'motherAadharImage',
//         birthCertificateImage:    'birthCertificateImage',
//         transferCertificateImage: 'transferCertificateImage',
//         markSheetImage:           'markSheetImage'
//     };

//     Object.entries(fileMap).forEach(([fieldName, inputId]) => {
//         const input = document.getElementById(inputId);
//         if (input?.files?.length > 0) {
//             fd.append(fieldName, input.files[0]);
//         }
//     });

//     return fd;
// }

// // ─────────────────────────────────────────────────────────────
// //  12. DELETE STUDENT
// // ─────────────────────────────────────────────────────────────
// async function deleteStudent(stdId) {
//     if (!confirm('Are you sure you want to delete this student? This cannot be undone.')) return;

//     showLoading(true);
//     try {
//         const res = await fetch(
//             `${BASE_URL}/api/students/delete-student/${stdId}`,
//             { method: 'DELETE', headers: getAuthHeaders() }
//         );
//         if (!res.ok) throw new Error('Delete failed');
//         Toast.show('Student deleted successfully', 'success');
//         await loadStudents(currentPage);
//     } catch (err) {
//         Toast.show('Delete failed: ' + err.message, 'error');
//     } finally {
//         showLoading(false);
//     }
// }

// // ─────────────────────────────────────────────────────────────
// //  13. EXPORT STUDENTS
// // ─────────────────────────────────────────────────────────────
// async function exportStudents() {
//     showLoading(true);
//     try {
//         const res = await fetch(
//             `${BASE_URL}/api/students/get-all-students?page=0&size=10000&direction=desc`,
//             { headers: getAuthHeaders() }
//         );
//         if (!res.ok) throw new Error('Export failed');

//         const data     = await res.json();
//         const students = data.content || [];

//         const rows = [
//             ['ID','Student ID','Roll No','Name','Class','Section','Father','Phone','Email','Fees Status','Admission Date']
//         ];

//         students.forEach(s => {
//             const fees = s.feesDetails || {};
//             rows.push([
//                 s.stdId,
//                 s.studentId || '',
//                 s.studentRollNumber || '',
//                 [s.firstName, s.middleName, s.lastName].filter(Boolean).join(' '),
//                 s.currentClass || '',
//                 s.section      || '',
//                 s.fatherName   || '',
//                 s.fatherPhone  || '',
//                 s.fatherEmail  || '',
//                 fees.paymentStatus || 'No Fees',
//                 s.admissionDate ? s.admissionDate.split('T')[0] : ''
//             ]);
//         });

//         const csv     = rows.map(r => r.map(c => `"${c}"`).join(',')).join('\n');
//         const blob    = new Blob([csv], { type: 'text/csv' });
//         const url     = URL.createObjectURL(blob);
//         const link    = document.createElement('a');
//         link.href     = url;
//         link.download = `students_${new Date().toISOString().split('T')[0]}.csv`;
//         link.click();
//         URL.revokeObjectURL(url);

//         Toast.show(`Exported ${students.length} students`, 'success');
//     } catch (err) {
//         Toast.show('Export failed: ' + err.message, 'error');
//     } finally {
//         showLoading(false);
//     }
// }

// // ─────────────────────────────────────────────────────────────
// //  14. RESET ADD STUDENT FORM (for new entry)
// // ─────────────────────────────────────────────────────────────
// function resetAddStudentForm() {
//     document.getElementById('addStudentForm').reset();
//     otherSports   = [];
//     otherSubjects = [];
//     editingStudentId = null;
//     transactionVerified = false;
//     qrCodeGenerated     = false;

//     document.getElementById('otherSportsDisplay').innerHTML  = '';
//     document.getElementById('otherSportsDisplay').classList.add('hidden');
//     document.getElementById('otherSubjectsDisplay').innerHTML= '';
//     document.getElementById('otherSubjectsDisplay').classList.add('hidden');
//     document.getElementById('otherSportsContainer').classList.add('hidden');
//     document.getElementById('otherSubjectsContainer').classList.add('hidden');
//     document.getElementById('otherSportsCheckbox').checked   = false;
//     document.getElementById('otherSubjectsCheckbox').checked = false;
//     document.getElementById('studentPhotoPreview').innerHTML =
//         '<i class="fas fa-user text-4xl lg:text-6xl text-gray-400"></i>';
//     document.getElementById('passwordMismatch').classList.add('hidden');
//     document.getElementById('sameAsLocal').checked = false;
//     document.getElementById('studentId').readOnly  = false;
//     document.getElementById('studentPassword').readOnly         = false;
//     document.getElementById('confirmStudentPassword').readOnly  = false;

//     togglePermanentAddress();
//     document.querySelector('input[name="paymentMode"][value="one-time"]').checked = true;
//     toggleInstallmentOptions();

//     const autoId = generateStudentId();
//     document.getElementById('autoGeneratedId').textContent = autoId;
//     document.getElementById('studentId').value             = autoId;

//     document.getElementById('submitButton').innerHTML =
//         '<i class="fas fa-check-circle mr-2"></i>Register Student';

//     updateFeeCalculations();
//     closeQRCode();
// }

// // ─────────────────────────────────────────────────────────────
// //  15. LOADING OVERLAY HELPER
// // ─────────────────────────────────────────────────────────────
// function showLoading(show) {
//     const overlay = document.getElementById('loadingOverlay');
//     if (overlay) overlay.classList.toggle('hidden', !show);
// }

// // ─────────────────────────────────────────────────────────────
// //  16. CLOSE MODAL
// // ─────────────────────────────────────────────────────────────
// function closeModal(id) {
//     document.getElementById(id)?.classList.remove('show');
// }

// // ─────────────────────────────────────────────────────────────
// //  17. INIT — wire up events and load data
// // ─────────────────────────────────────────────────────────────
// document.addEventListener('DOMContentLoaded', async function () {

//     // Load classes for filters
//     await loadClassesIntoFilters();

//     // Load student table
//     await loadStudents(0);

//     // Search / filter listeners
//     document.getElementById('searchStudent')
//         ?.addEventListener('input', searchAndFilter);
//     document.getElementById('filterClass')
//         ?.addEventListener('change', searchAndFilter);
//     document.getElementById('filterSection')
//         ?.addEventListener('change', searchAndFilter);
//     document.getElementById('filterStudentStatus')
//         ?.addEventListener('change', searchAndFilter);

//     // Auto-generate student ID
//     const autoId = generateStudentId();
//     document.getElementById('autoGeneratedId').textContent = autoId;
//     document.getElementById('studentId').value             = autoId;

//     // Password match validation
//     const pwdEl  = document.getElementById('studentPassword');
//     const cpwdEl = document.getElementById('confirmStudentPassword');
//     const mismatchEl = document.getElementById('passwordMismatch');
//     function checkMatch() {
//         if (!editingStudentId && pwdEl.value && cpwdEl.value && pwdEl.value !== cpwdEl.value) {
//             mismatchEl.classList.remove('hidden');
//         } else {
//             mismatchEl.classList.add('hidden');
//         }
//     }
//     pwdEl.addEventListener('input',  checkMatch);
//     cpwdEl.addEventListener('input', checkMatch);

//     // Default first installment date = next month
//     const fid = document.getElementById('firstInstallmentDate');
//     if (fid) {
//         const d = new Date();
//         d.setMonth(d.getMonth() + 1);
//         fid.value = d.toISOString().split('T')[0];
//     }

//     // Fee input listeners
//     ['admissionFees','uniformFees','bookFees','tuitionFees','initialPayment']
//         .forEach(id => document.getElementById(id)
//             ?.addEventListener('input', updateFeeCalculations));

//     document.getElementById('installmentCount')
//         ?.addEventListener('change', calculateInstallments);

//     updateFeeCalculations();

//     // Sidebar toggle
//     document.getElementById('sidebarToggle')?.addEventListener('click', function () {
//         const sidebar     = document.getElementById('sidebar');
//         const mainContent = document.getElementById('mainContent');
//         const icon        = document.getElementById('sidebarToggleIcon');
//         if (window.innerWidth < 1024) {
//             sidebar.classList.toggle('mobile-open');
//             document.getElementById('sidebarOverlay').classList.toggle('active');
//         } else {
//             sidebar.classList.toggle('collapsed');
//             mainContent.classList.toggle('sidebar-collapsed');
//             icon.classList.toggle('fa-bars');
//             icon.classList.toggle('fa-times');
//         }
//     });

//     document.getElementById('sidebarOverlay')?.addEventListener('click', function () {
//         document.getElementById('sidebar').classList.remove('mobile-open');
//         this.classList.remove('active');
//     });

//     // Dropdowns
//     document.getElementById('notificationsBtn')?.addEventListener('click', e => {
//         e.stopPropagation();
//         document.getElementById('notificationsDropdown').classList.toggle('hidden');
//     });
//     document.getElementById('userMenuBtn')?.addEventListener('click', e => {
//         e.stopPropagation();
//         document.getElementById('userMenuDropdown').classList.toggle('hidden');
//     });
//     document.addEventListener('click', () => {
//         document.getElementById('notificationsDropdown')?.classList.add('hidden');
//         document.getElementById('userMenuDropdown')?.classList.add('hidden');
//     });

//     // URL-based section detection
//     checkUrlAndShowSection();
// });