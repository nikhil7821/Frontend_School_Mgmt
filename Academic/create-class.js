// ==================== API CONFIGURATION ====================
const API_BASE_URL = 'http://localhost:8084/api';
let authToken = localStorage.getItem('admin_jwt_token');

// ==================== TOAST ====================
class Toast {
    static show(message, type = 'success', duration = 3500) {
        const icons = {
            success: 'fa-check-circle',
            error: 'fa-exclamation-circle',
            warning: 'fa-exclamation-triangle',
            info: 'fa-info-circle'
        };
        const colors = {
            success: 'var(--success)',
            error: 'var(--danger)',
            warning: 'var(--warning)',
            info: 'var(--primary)'
        };

        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.innerHTML = `
            <i class="fas ${icons[type]} toast-icon"></i>
            <span style="flex:1;font-size:13px">${message}</span>
            <button class="toast-close" onclick="this.parentElement.remove()">
                <i class="fas fa-times"></i>
            </button>
        `;

        let container = document.getElementById('toastContainer');
        if (!container) {
            container = document.createElement('div');
            container.id = 'toastContainer';
            document.body.appendChild(container);
        }
        container.appendChild(toast);
        setTimeout(() => { if (toast.parentElement) toast.remove(); }, duration);
    }
}

// ==================== LOADING ====================
function showLoading(show) {
    const overlay = document.getElementById('loadingOverlay');
    if (overlay) overlay.classList[show ? 'remove' : 'add']('hidden');
}

// ==================== API HELPER ====================
async function apiCall(url, method = 'GET', data = null) {
    const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
    };
    const options = { method, headers };
    if (data && ['POST', 'PUT', 'PATCH'].includes(method)) {
        options.body = JSON.stringify(data);
    }

    console.log(`🔵 [API] ${method} ${url}`);
    if (data) console.log('📦 Request:', data);

    const response = await fetch(`${API_BASE_URL}${url}`, options);
    console.log(`📡 Status: ${response.status}`);

    const text = await response.text();
    let result;
    try { result = JSON.parse(text); } catch { result = { message: text }; }

    if (!response.ok) {
        throw new Error(result.message || `API error ${response.status}`);
    }
    return result;
}

// ==================== GLOBAL STATE ====================
let classes       = [];   // all classes from DB
let teachers      = [];   // all teachers from DB
let classNames    = [];   // unique class name strings from DB (for dropdown)
let subjects      = [];   // subjects list (fetched + locally saved ones)
let bulkSelected  = {};   // { teacherId: { name, meta, subjects:[] } }
let currentEditingClassId = null;
let currentWeekOffset = 0;

// ==================== SUBJECTS MASTER LIST ====================
const DEFAULT_SUBJECTS = [
    'Mathematics', 'Science', 'English', 'Hindi',
    'Social Studies', 'Computer Science', 'Art',
    'Physical Education', 'Music', 'Drawing'
];

// ==================== INITIALIZATION ====================
async function initializeData() {
    console.log('🚀 Initializing Class Management…');
    showLoading(true);

    // Set current date
    const dateEl = document.getElementById('currentDate');
    if (dateEl) {
        dateEl.textContent = new Date().toLocaleDateString('en-IN', {
            day: 'numeric', month: 'short', year: 'numeric'
        });
    }

    try {
        await Promise.all([fetchClasses(), fetchTeachers(), fetchSubjects()]);
        buildClassNameDropdown();
        populateFilterDropdowns();
        populateTeacherDropdowns();
        populateSubjectDropdowns();
        renderStatCards();
        renderClassesTable();
        renderSchedule();
        attachEventListeners();
        console.log('✅ Initialization complete');
    } catch (err) {
        console.error('❌ Init error:', err);
        Toast.show('Failed to load data. Check network and auth token.', 'error');
    } finally {
        showLoading(false);
    }
}

// ==================== FETCH DATA ====================
async function fetchClasses() {
    try {
        const res = await apiCall('/classes/get-all-classes');
        classes = Array.isArray(res) ? res : (res?.data ?? []);
        // Extract unique class name strings from DB
        const nameSet = new Set(classes.map(c => c.className).filter(Boolean));
        classNames = [...nameSet].sort();
        console.log(`✅ ${classes.length} classes, ${classNames.length} unique names`);
    } catch (err) {
        console.error('❌ fetchClasses:', err);
        classes = []; classNames = [];
    }
}

async function fetchTeachers() {
    try {
        const res = await apiCall('/teachers/get-all-teachers');
        teachers = Array.isArray(res) ? res : (res?.data ?? []);
        console.log(`✅ ${teachers.length} teachers`);
    } catch (err) {
        console.error('❌ fetchTeachers:', err);
        teachers = [];
    }
}

async function fetchSubjects() {
    try {
        const res = await apiCall('/subjects/get-all-subjects');
        const fetched = Array.isArray(res) ? res : (res?.data ?? []);
        const names = fetched.map(s => s.subjectName || s.name).filter(Boolean);
        subjects = [...new Set([...DEFAULT_SUBJECTS, ...names])];
        console.log(`✅ ${subjects.length} subjects`);
    } catch {
        subjects = [...DEFAULT_SUBJECTS];
        console.warn('⚠️ Using default subjects list');
    }
}

// ==================== BUILD CLASS NAME DROPDOWN ====================
function buildClassNameDropdown() {
    const sel = document.getElementById('fClassName');
    if (!sel) return;

    // Keep first two options (placeholder + "New Class")
    sel.innerHTML = `
        <option value="">Select or create a class…</option>
        <option value="__new__">➕ New Class (type below)</option>
    `;
    classNames.forEach(name => {
        const opt = document.createElement('option');
        opt.value = name;
        opt.textContent = name;
        sel.appendChild(opt);
    });
}


// ==================== LOAD SECTIONS FROM DATABASE WITH CREATE OPTION ====================
async function loadSectionsForClass(className) {
    const secSel = document.getElementById('fSection');
    const hint   = document.getElementById('sectionHint');

    if (!className || className === '__new__') {
        secSel.innerHTML = '<option value="">Select class first…</option>';
        secSel.disabled = true;
        if (hint) hint.textContent = 'Choose a class name above to load available sections.';
        return;
    }

    // Show loading state
    secSel.innerHTML = '<option value="">Loading sections from database…</option>';
    secSel.disabled = true;
    if (hint) hint.textContent = '';

    try {
        // Fetch ALL sections for this class name from the database
        const response = await apiCall(`/classes/get-classes-by-name/${encodeURIComponent(className)}`);
        
        let existingSections = [];
        
        // Handle different response formats
        if (response && response.data && Array.isArray(response.data)) {
            existingSections = response.data.map(c => c.section).filter(Boolean);
        } else if (response && Array.isArray(response)) {
            existingSections = response.map(c => c.section).filter(Boolean);
        } else if (response && response.sections && Array.isArray(response.sections)) {
            existingSections = response.sections;
        }
        
        // Remove duplicates and sort
        existingSections = [...new Set(existingSections)].sort();
        
        console.log(`📚 Sections found for "${className}":`, existingSections);
        
        // Build dropdown options
        secSel.innerHTML = '<option value="">Select Section</option>';
        
        // Add existing sections from database
        if (existingSections.length > 0) {
            existingSections.forEach(s => {
                const opt = document.createElement('option');
                opt.value = s;
                opt.textContent = `Section ${s}`;
                secSel.appendChild(opt);
            });
        }
        
        // ALWAYS add the "Create New Section" option at the end
        const newSectionOption = document.createElement('option');
        newSectionOption.value = '__new_section__';
        newSectionOption.textContent = '➕ Create New Section...';
        newSectionOption.style.color = 'var(--primary)';
        newSectionOption.style.fontWeight = 'bold';
        secSel.appendChild(newSectionOption);
        
        // Enable the dropdown
        secSel.disabled = false;
        
        // Update hint message
        if (existingSections.length > 0) {
            if (hint) hint.textContent = `${existingSections.length} section(s) already exist for ${className}. Select an existing section or click "Create New Section" to add one.`;
        } else {
            if (hint) hint.textContent = `No sections exist for ${className} yet. Click "Create New Section" to add the first section.`;
        }
        
        // Remove previous event listener to avoid duplicates
        secSel.removeEventListener('change', handleSectionChange);
        secSel.addEventListener('change', handleSectionChange);
        
    } catch (error) {
        console.error('Error loading sections from DB:', error);
        secSel.innerHTML = '<option value="">Error loading sections</option>';
        secSel.disabled = true;
        if (hint) hint.textContent = 'Could not load sections. Please try again.';
        Toast.show('Failed to load sections from database', 'error');
    }
}

// ==================== HANDLE SECTION CHANGE (for creating new section) ====================
function handleSectionChange(e) {
    const selectedValue = e.target.value;
    
    if (selectedValue === '__new_section__') {
        // Show modal to create new section
        showCreateSectionModal();
        // Reset dropdown to previous selection
        e.target.value = '';
    }
}

// ==================== SHOW CREATE SECTION MODAL ====================
function showCreateSectionModal() {
    // Create modal dynamically
    const modalHtml = `
        <div id="createSectionModalOverlay" class="modal-overlay active">
            <div class="modal" style="max-width: 400px;">
                <div class="modal-header">
                    <span class="modal-title"><i class="fas fa-plus-circle"></i> Create New Section</span>
                    <button class="modal-close" onclick="closeCreateSectionModal()"><i class="fas fa-times"></i></button>
                </div>
                <div class="modal-body">
                    <div class="form-group" style="margin-bottom: 16px;">
                        <label class="form-label">Class Name</label>
                        <input type="text" class="form-control" id="newSectionClassName" readonly 
                               value="${document.getElementById('fClassName')?.value || ''}" 
                               style="background: var(--surface-3);">
                    </div>
                    <div class="form-group">
                        <label class="form-label">Section Name <span class="req">*</span></label>
                        <input type="text" class="form-control" id="newSectionName" 
                               placeholder="e.g., A, B, C, or any identifier" maxlength="10">
                        <span class="form-hint">Enter a section identifier (e.g., A, B, C, D, E, or any custom name)</span>
                    </div>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-outline" onclick="closeCreateSectionModal()">Cancel</button>
                    <button type="button" class="btn btn-primary" onclick="createNewSection()">
                        <i class="fas fa-save"></i> Create Section
                    </button>
                </div>
            </div>
        </div>
    `;
    
    // Remove existing modal if any
    const existingModal = document.getElementById('createSectionModalOverlay');
    if (existingModal) {
        existingModal.remove();
    }
    
    // Add modal to body
    document.body.insertAdjacentHTML('beforeend', modalHtml);
    
    // Focus on input
    setTimeout(() => {
        const input = document.getElementById('newSectionName');
        if (input) input.focus();
    }, 100);
}

// ==================== CLOSE CREATE SECTION MODAL ====================
function closeCreateSectionModal() {
    const modal = document.getElementById('createSectionModalOverlay');
    if (modal) {
        modal.remove();
    }
}

// Global variable to store newly created sections (for UI only)
let newlyCreatedSections = [];

// ==================== CREATE NEW SECTION (UI ONLY - NO DATABASE SAVE) ====================
async function createNewSection() {
    const className = document.getElementById('fClassName')?.value;
    const sectionName = document.getElementById('newSectionName')?.value?.trim().toUpperCase();
    
    if (!className) {
        Toast.show('Class name is required', 'error');
        return;
    }
    
    if (!sectionName) {
        Toast.show('Please enter a section name', 'warning');
        document.getElementById('newSectionName')?.focus();
        return;
    }
    
    // Validate section name (letters and numbers only, max 5 chars)
    if (!/^[A-Z0-9]{1,5}$/i.test(sectionName)) {
        Toast.show('Section name should be 1-5 alphanumeric characters (e.g., A, B, C1, D2)', 'warning');
        return;
    }
    
    const secSel = document.getElementById('fSection');
    
    // Check if section already exists in dropdown
    let sectionExists = false;
    for (let i = 0; i < secSel.options.length; i++) {
        if (secSel.options[i].value === sectionName) {
            sectionExists = true;
            break;
        }
    }
    
    if (sectionExists) {
        Toast.show(`Section "${sectionName}" already exists!`, 'warning');
        // Select the existing section
        for (let i = 0; i < secSel.options.length; i++) {
            if (secSel.options[i].value === sectionName) {
                secSel.selectedIndex = i;
                break;
            }
        }
        closeCreateSectionModal();
        return;
    }
    
    // Add the new section to dropdown (UI only - NO DATABASE SAVE)
    const newOption = document.createElement('option');
    newOption.value = sectionName;
    newOption.textContent = `Section ${sectionName} (New)`;
    newOption.style.fontWeight = 'bold';
    newOption.style.backgroundColor = 'var(--primary-bg)';
    secSel.appendChild(newOption);
    
    // Select the new section
    secSel.value = sectionName;
    
    // Store that this section was newly created
    newlyCreatedSections.push({ className, sectionName });
    
    // Update class code suggestion with new section
    const academicYear = document.getElementById('fAcademicYear')?.value || '2025';
    const codeEl = document.getElementById('fClassCode');
    if (codeEl && !codeEl.value) {
        codeEl.value = `${className.replace(/\s+/g, '-').toUpperCase()}-${sectionName}-${academicYear.split('-')[1] || academicYear}`;
    }
    
    Toast.show(`Section "${sectionName}" added. Fill remaining details and click Create Class.`, 'success');
    
    // Close the modal
    closeCreateSectionModal();
    
    // Trigger change event to update any dependent fields
    const changeEvent = new Event('change');
    secSel.dispatchEvent(changeEvent);
}   

// ==================== SAVE NEW CLASS NAME TO DATABASE ====================
// This function saves the new class name to the database BEFORE creating the full class
async function saveNewClassName() {
    const newName = document.getElementById('fNewClassName')?.value?.trim();
    if (!newName) { 
        Toast.show('Please enter a class name', 'warning'); 
        return; 
    }

    showLoading(true);
    
    try {
        // First, check if this class name already exists
        const existingClass = classes.find(c => c.className === newName);
        
        if (existingClass) {
            Toast.show(`Class "${newName}" already exists!`, 'warning');
            // Select it in dropdown
            const sel = document.getElementById('fClassName');
            if (sel) sel.value = newName;
            await loadSectionsForClass(newName);
            document.getElementById('newClassNameRow').classList.remove('show');
            showLoading(false);
            return;
        }
        
        // Create a temporary class entry with just the name and minimal info
        // This will create the class name in the database with a placeholder section
        // The actual class will be created later when user fills all details
        const tempClassData = {
            className: newName,
            section: 'TEMP', // Temporary section - will be replaced when saving full class
            classCode: `TEMP_${newName.replace(/\s+/g, '_')}`,
            academicYear: document.getElementById('fAcademicYear')?.value || '2024-2025',
            maxStudents: 30,
            currentStudents: 0,
            status: 'ACTIVE',
            workingDays: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
            startTime: '08:30',
            endTime: '13:30',
            isTemp: true // Mark as temporary
        };
        
        console.log('Creating temporary class name entry:', tempClassData);
        
        // Save to database
        const result = await apiCall('/classes/create-class', 'POST', tempClassData);
        console.log('Temporary class created:', result);
        
        // Add to local cache
        if (result && result.data) {
            classes.push(result.data);
        } else if (result && result.id) {
            classes.push(result);
        }
        
        // Update class names list
        if (!classNames.includes(newName)) {
            classNames.push(newName);
            classNames.sort();
        }
        
        // Rebuild dropdown
        buildClassNameDropdown();
        
        // Select the new class
        const sel = document.getElementById('fClassName');
        if (sel) sel.value = newName;
        
        // Load sections (now there should be at least the TEMP section)
        await loadSectionsForClass(newName);
        
        // Hide new name row
        document.getElementById('newClassNameRow').classList.remove('show');
        
        // Auto-generate class code
        const year = document.getElementById('fAcademicYear')?.value || '2025';
        const codeEl = document.getElementById('fClassCode');
        if (codeEl && !codeEl.value) {
            codeEl.value = `${newName.replace(/\s+/g, '-').toUpperCase()}-A-${year.split('-')[1] || year}`;
        }
        
        Toast.show(`Class name "${newName}" saved. Fill remaining details and click Create Class.`, 'success');
        
    } catch (err) {
        console.error('Error saving new class name:', err);
        Toast.show(err.message || 'Failed to save class name. It may already exist.', 'error');
    } finally {
        showLoading(false);
    }
}

async function saveClass() {
    const getVal = id => document.getElementById(id)?.value?.trim() || '';

    // Determine final class name
    let finalClassName = getVal('fClassName');
    if (finalClassName === '__new__') {
        const newName = getVal('fNewClassName');
        if (!newName) {
            Toast.show('Please enter a name for the new class', 'warning');
            document.getElementById('fNewClassName')?.focus();
            return;
        }
        finalClassName = newName;
    }

    const selectedSection = getVal('fSection');
    
    if (!selectedSection || selectedSection === '__new_section__') {
        Toast.show('Please select a valid section', 'warning');
        return;
    }

    const formData = {
        className:              finalClassName,
        classCode:              getVal('fClassCode'),
        academicYear:           getVal('fAcademicYear'),
        section:                selectedSection,
        maxStudents:            parseInt(document.getElementById('fMaxStudents')?.value) || 30,
        currentStudents:        parseInt(document.getElementById('fCurrentStudents')?.value) || 0,
        roomNumber:             getVal('fRoomNumber'),
        classTeacherId:         document.getElementById('fClassTeacher')?.value     ? parseInt(document.getElementById('fClassTeacher').value)     : null,
        assistantTeacherId:     document.getElementById('fAssistantTeacher')?.value ? parseInt(document.getElementById('fAssistantTeacher').value) : null,
        classTeacherSubject:    getVal('fClassTeacherSubject')    || null,
        assistantTeacherSubject:getVal('fAssistantTeacherSubject')|| null,
        startTime:              getVal('fStartTime')    || '08:30',
        endTime:                getVal('fEndTime')      || '13:30',
        description:            getVal('fDescription'),
        workingDays:            [],
        status:                 'ACTIVE',
        bulkTeachers:           Object.entries(bulkSelected).map(([id, data]) => ({
            teacherId: parseInt(id),
            subjects:  data.subjects
        }))
    };

    // Working days
    const dayMap = { dMon:'monday', dTue:'tuesday', dWed:'wednesday', dThu:'thursday', dFri:'friday', dSat:'saturday' };
    Object.entries(dayMap).forEach(([elId, day]) => {
        const cb = document.getElementById(elId); 
        if (cb?.checked) formData.workingDays.push(day);
    });

    // Validate required fields
    if (!formData.className || !formData.classCode || !formData.academicYear || !formData.section) {
        Toast.show('Please fill all required fields (Class Name, Code, Academic Year, Section)', 'warning');
        return;
    }

    // Validate section format
    if (formData.section && !/^[A-Z0-9]{1,5}$/i.test(formData.section)) {
        Toast.show('Section name should be 1-5 alphanumeric characters (e.g., A, B, C1, D2)', 'warning');
        return;
    }

    showLoading(true);
    try {
        let result;
        
        // Check if this class-section combination already exists in database
        const existingClass = classes.find(c => 
            c.className === finalClassName && 
            c.section === selectedSection &&
            (!currentEditingClassId || (c.classId !== currentEditingClassId && c.id !== currentEditingClassId))
        );
        
        if (existingClass) {
            // Update existing class
            console.log('Updating existing class with ID:', existingClass.classId || existingClass.id);
            result = await apiCall(`/classes/update-class/${existingClass.classId || existingClass.id}`, 'PUT', formData);
            Toast.show('Class updated successfully!', 'success');
        } else if (currentEditingClassId) {
            // Editing existing class
            result = await apiCall(`/classes/update-class/${currentEditingClassId}`, 'PUT', formData);
            Toast.show('Class updated successfully!', 'success');
        } else {
            // Create NEW class (this is where the actual database entry is created)
            result = await apiCall('/classes/create-class', 'POST', formData);
            Toast.show('Class created successfully!', 'success');
        }
        
        // Clear newly created sections tracking
        newlyCreatedSections = [];
        
        // Refresh all data
        await fetchClasses();
        buildClassNameDropdown();
        populateFilterDropdowns();
        renderStatCards();
        renderClassesTable();
        renderSchedule();
        
        // Reset form and close modal
        closeClassModal();
        
    } catch (err) {
        console.error('❌ saveClass:', err);
        
        let errorMessage = err.message || 'Failed to save class';
        if (errorMessage.includes('duplicate') || errorMessage.includes('already exists')) {
            errorMessage = `Class "${formData.className}" - Section "${formData.section}" already exists!`;
        }
        
        Toast.show(errorMessage, 'error');
    } finally {
        showLoading(false);
    }
}

// Optional: Check for duplicate class-section via API
async function checkDuplicateClassSection(className, section, excludeId = null) {
    try {
        // First check local cache for quick response
        const localDuplicate = classes.find(c => 
            c.className === className && 
            c.section === section &&
            (!excludeId || (c.classId !== excludeId && c.id !== excludeId))
        );
        
        if (localDuplicate) {
            return true;
        }
        
        // Optional: Also check via API for fresh data
        const response = await apiCall(`/classes/check-duplicate?className=${encodeURIComponent(className)}&section=${encodeURIComponent(section)}`);
        return response && response.exists === true;
        
    } catch (error) {
        console.error('Error checking duplicate:', error);
        return false;
    }
}

// ==================== POPULATE FILTER DROPDOWNS ====================
function populateFilterDropdowns() {
    // Filter Class
    const filterClass = document.getElementById('filterClass');
    if (filterClass) {
        filterClass.innerHTML = '<option value="all">All Classes</option>';
        classNames.forEach(name => {
            const o = document.createElement('option');
            o.value = name; o.textContent = name;
            filterClass.appendChild(o);
        });
    }

    // Filter Section — initially all sections from DB
    rebuildFilterSections('all');
}

// Rebuild the filter section dropdown based on selected class
function rebuildFilterSections(className) {
    const filterSection = document.getElementById('filterSection');
    if (!filterSection) return;

    let sectionList;
    if (className === 'all') {
        const set = new Set(classes.map(c => c.section).filter(Boolean));
        sectionList = [...set].sort();
    } else {
        const set = new Set(
            classes.filter(c => c.className === className).map(c => c.section).filter(Boolean)
        );
        sectionList = [...set].sort();
    }

    filterSection.innerHTML = '<option value="all">All Sections</option>';
    sectionList.forEach(s => {
        const o = document.createElement('option');
        o.value = s; o.textContent = `Section ${s}`;
        filterSection.appendChild(o);
    });
}

// ==================== POPULATE TEACHER DROPDOWNS ====================
function populateTeacherDropdowns() {
    const ctSel = document.getElementById('fClassTeacher');
    const atSel = document.getElementById('fAssistantTeacher');

    const baseOption = (placeholder) => `<option value="">${placeholder}</option>`;
    const teacherOptions = teachers.map(t => {
        const name = getTeacherName(t);
        return `<option value="${t.id}">${name} (${t.employeeId || t.id})</option>`;
    }).join('');

    if (ctSel) ctSel.innerHTML = baseOption('Select Class Teacher') + teacherOptions;
    if (atSel) atSel.innerHTML = baseOption('Select Assistant Teacher') + teacherOptions;
}

function getTeacherName(t) {
    if (!t) return 'Unknown';
    return t.fullName ||
        (t.firstName && t.lastName ? `${t.firstName} ${t.lastName}` : null) ||
        t.name || 'Unknown';
}

// ==================== POPULATE SUBJECT DROPDOWNS ====================
function populateSubjectDropdowns() {
    const opts = subjects.map(s => `<option value="${s}">${s}</option>`).join('');
    const ctSubj = document.getElementById('fClassTeacherSubject');
    const atSubj = document.getElementById('fAssistantTeacherSubject');
    if (ctSubj) ctSubj.innerHTML = `<option value="">Select Subject</option>${opts}`;
    if (atSubj) atSubj.innerHTML = `<option value="">Select Subject</option>${opts}`;
}

// ==================== RENDER STAT CARDS ====================
function renderStatCards() {
    const grid = document.getElementById('statGrid');
    if (!grid) return;

    // Aggregate students per class name
    const stats = {};
    classes.forEach(c => {
        if (!c.className) return;
        stats[c.className] = (stats[c.className] || 0) + (c.currentStudents || 0);
    });

    if (classNames.length === 0) {
        grid.innerHTML = `
            <div style="grid-column:1/-1;text-align:center;padding:20px;color:var(--text-muted)">
                No classes yet. Create the first one!
            </div>`;
        return;
    }

    const palette = [
        { bg: '#f3d9fa', icon: 'fa-baby',          color: '#9c36b5' },
        { bg: '#d3f9d8', icon: 'fa-child',          color: '#2b8a3e' },
        { bg: '#dbe4ff', icon: 'fa-graduation-cap', color: '#1971c2' },
        { bg: '#fff3bf', icon: 'fa-book-open',      color: '#e67700' },
        { bg: '#ffe3e3', icon: 'fa-book',           color: '#c92a2a' },
    ];

    grid.innerHTML = classNames.map((name, i) => {
        const p = palette[i % palette.length];
        return `
            <div class="stat-card">
                <div class="stat-info">
                    <div class="stat-label">${name}</div>
                    <div class="stat-name">${stats[name] || 0}</div>
                    <div class="stat-count">students enrolled</div>
                </div>
                <div class="stat-icon" style="background:${p.bg}">
                    <i class="fas ${p.icon}" style="color:${p.color}"></i>
                </div>
            </div>
        `;
    }).join('');
}

// ==================== RENDER CLASSES TABLE ====================
function renderClassesTable() {
    const tbody = document.getElementById('classesTableBody');
    if (!tbody) return;

    const filterClass   = document.getElementById('filterClass')?.value   || 'all';
    const filterSection = document.getElementById('filterSection')?.value  || 'all';
    const filterYear    = document.getElementById('filterYear')?.value     || 'all';
    const search        = document.getElementById('searchInput')?.value?.toLowerCase() || '';

    let filtered = [...classes];
    if (filterClass   !== 'all') filtered = filtered.filter(c => c.className === filterClass);
    if (filterSection !== 'all') filtered = filtered.filter(c => c.section   === filterSection);
    if (filterYear    !== 'all') filtered = filtered.filter(c => c.academicYear === filterYear);
    if (search) {
        filtered = filtered.filter(c =>
            (c.className?.toLowerCase()  || '').includes(search) ||
            (c.classCode?.toLowerCase()  || '').includes(search) ||
            (c.section?.toLowerCase()    || '').includes(search)
        );
    }

    const totalEl = document.getElementById('totalCount');
    const infoEl  = document.getElementById('tableInfo');
    if (totalEl) totalEl.textContent = filtered.length;
    if (infoEl)  infoEl.textContent  = `Showing ${filtered.length} class${filtered.length !== 1 ? 'es' : ''}`;

    if (filtered.length === 0) {
        tbody.innerHTML = `
             <tr><td colspan="6" style="text-align:center;padding:40px;color:var(--text-muted)">
                <i class="fas fa-school" style="font-size:32px;display:block;margin-bottom:10px;opacity:0.3"></i>
                No classes found. Click <strong>Create New Class</strong> to get started.
             </td></tr>`;
        return;
    }

    tbody.innerHTML = filtered.map(cls => {
        const maxS    = cls.maxStudents     || 0;
        const curS    = cls.currentStudents || 0;
        const pct     = maxS > 0 ? (curS / maxS) * 100 : 0;
        const capCls  = pct >= 90 ? 'cap-high' : pct >= 70 ? 'cap-mid' : 'cap-low';

        const ct = teachers.find(t => t.id === cls.classTeacherId);
        const at = teachers.find(t => t.id === cls.assistantTeacherId);

        const teacherHtml = [ct, at].filter(Boolean).map(t =>
            `<div style="display:flex;align-items:center;gap:6px;font-size:12px">
                <i class="fas fa-user" style="color:var(--text-muted);font-size:10px"></i>
                <span>${getTeacherName(t)}</span>
            </div>`
        ).join('') || '<span style="font-size:12px;color:var(--text-muted)">Not assigned</span>';

        const id = cls.classId || cls.id;

        return `
            <tr>
                <td>
                    <div style="display:flex;align-items:center;gap:10px">
                        <div class="class-icon ci-def">
                            <i class="fas fa-chalkboard"></i>
                        </div>
                        <div>
                            <div style="font-weight:600">${cls.className} — ${cls.section || '?'}</div>
                            <div style="font-size:11px;color:var(--text-muted);font-family:'DM Mono',monospace">${cls.classCode || 'N/A'}</div>
                        </div>
                    </div>
                </td>
                <td>
                    <div style="font-size:13px">${curS} / ${maxS}</div>
                    <div class="cap-bar"><div class="cap-fill ${capCls}" style="width:${pct}%"></div></div>
                    <div style="font-size:10px;color:var(--text-muted);margin-top:3px">${Math.round(pct)}% full</div>
                </td>
                <td>${teacherHtml}</td>
                <td>
                    <div style="font-size:13px">${cls.startTime || '08:30'} – ${cls.endTime || '13:30'}</div>
                    <div style="font-size:11px;color:var(--text-muted);margin-top:2px">
                        ${cls.workingDays ? cls.workingDays.map(d => d.substring(0,3)).join(', ') : 'Mon–Fri'}
                    </div>
                </td>
                <td>
                    <span class="badge ${cls.status === 'ACTIVE' ? 'badge-active' : 'badge-inactive'}">
                        <span class="badge-dot"></span>
                        ${cls.status === 'ACTIVE' ? 'Active' : 'Inactive'}
                    </span>
                </td>
                <td>
                    <div style="display:flex;gap:6px">
                        <button onclick="viewClass(${id})" class="btn btn-outline btn-sm btn-icon" title="View">
                            <i class="fas fa-eye" style="color:var(--primary)"></i>
                        </button>
                        <button onclick="editClass(${id})" class="btn btn-outline btn-sm btn-icon" title="Edit">
                            <i class="fas fa-edit" style="color:var(--warning)"></i>
                        </button>
                        <button onclick="deleteClass(${id})" class="btn btn-outline btn-sm btn-icon" title="Delete">
                            <i class="fas fa-trash-alt" style="color:var(--danger)"></i>
                        </button>
                        <button onclick="manageTimetable(${id})" class="btn btn-outline btn-sm btn-icon" title="Timetable">
                            <i class="fas fa-calendar-alt" style="color:var(--success)"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}

// ==================== WEEKLY SCHEDULE ====================
function renderSchedule() {
    const body = document.getElementById('scheduleBody');
    const label = document.getElementById('weekLabel');
    if (!body) return;

    const now   = new Date();
    const monday = new Date(now);
    monday.setDate(now.getDate() - now.getDay() + 1 + currentWeekOffset * 7);

    const days = Array.from({ length: 5 }, (_, i) => {
        const d = new Date(monday);
        d.setDate(monday.getDate() + i);
        return d;
    });

    if (label) {
        label.textContent = `${days[0].toLocaleDateString('en-IN', { day:'numeric', month:'short' })} – ${days[4].toLocaleDateString('en-IN', { day:'numeric', month:'short', year:'numeric' })}`;
    }

    const dayNames = ['monday','tuesday','wednesday','thursday','friday'];

    body.innerHTML = days.map((d, i) => {
        const dayClasses = classes.filter(c =>
            c.workingDays && c.workingDays.includes(dayNames[i])
        );

        const chips = dayClasses.map(c => `
            <div class="schedule-class-chip">
                <div class="schedule-class-name">${c.className} – ${c.section || '?'}</div>
                <div class="schedule-class-time">${c.startTime || '08:30'} – ${c.endTime || '13:30'}</div>
            </div>
        `).join('') || `<div class="schedule-empty"><i class="fas fa-calendar-times"></i>No classes</div>`;

        return `
            <div class="schedule-col">
                <div class="schedule-col-header">
                    <span class="schedule-date">${d.getDate()} ${d.toLocaleDateString('en-IN',{month:'short'})}</span>
                    ${dayClasses.length ? `<span class="schedule-count">${dayClasses.length}</span>` : ''}
                </div>
                ${chips}
            </div>
        `;
    }).join('');
}

// ==================== OPEN CREATE MODAL ====================
function openCreateModal() {
    currentEditingClassId = null;
    bulkSelected = {};

    document.getElementById('classModalTitle').textContent = 'Create New Class';
    document.getElementById('submitBtnText').textContent = 'Create Class';

    const form = document.getElementById('classForm');
    if (form) form.reset();

    // Rebuild class name dropdown (refreshed from DB data)
    buildClassNameDropdown();

    // Reset section dropdown
    const secSel = document.getElementById('fSection');
    if (secSel) { secSel.innerHTML = '<option value="">Select class first…</option>'; secSel.disabled = true; }

    // Restore defaults
    document.getElementById('fAcademicYear').value  = '2024-2025';
    document.getElementById('fMaxStudents').value   = '30';
    document.getElementById('fCurrentStudents').value = '0';
    document.getElementById('fStartTime').value     = '08:30';
    document.getElementById('fEndTime').value       = '13:30';
    ['dMon','dTue','dWed','dThu','dFri'].forEach(id => {
        const cb = document.getElementById(id); if (cb) cb.checked = true;
    });
    const dSat = document.getElementById('dSat'); if (dSat) dSat.checked = false;

    // Hide sub-sections
    document.getElementById('newClassNameRow').classList.remove('show');
    document.getElementById('teacherSubjectSection').style.display = 'none';
    document.getElementById('classTeacherSubjectRow').style.display = 'none';
    document.getElementById('assiTeacherSubjectRow').style.display = 'none';
    document.getElementById('createSubjectPanel').style.display = 'none';
    document.getElementById('bulkTableWrap').style.display = 'none';
    const bulkPanel = document.getElementById('bulkDropPanel'); if (bulkPanel) bulkPanel.classList.add('hidden');
    const bulkBtn   = document.getElementById('bulkDropBtn');   if (bulkBtn)   bulkBtn.classList.remove('open');
    document.getElementById('bulkDropLabel').textContent = 'Click to select teachers…';
    document.getElementById('bulkSelectedCount').textContent = '0';
    renderBulkTable();

    populateTeacherDropdowns();
    populateSubjectDropdowns();

    document.getElementById('classModal').classList.add('active');
}

// ==================== EDIT CLASS ====================
async function editClass(classId) {
    const cls = classes.find(c => (c.classId === classId || c.id === classId));
    if (!cls) { Toast.show('Class not found', 'error'); return; }

    currentEditingClassId = classId;
    bulkSelected = {};

    document.getElementById('classModalTitle').textContent = 'Edit Class';
    document.getElementById('submitBtnText').textContent = 'Update Class';

    buildClassNameDropdown();
    populateTeacherDropdowns();
    populateSubjectDropdowns();

    // Populate fields
    const set = (id, val) => { const el = document.getElementById(id); if (el) el.value = val ?? ''; };
    set('fClassName',         cls.className         || '');
    set('fClassCode',         cls.classCode         || '');
    set('fAcademicYear',      cls.academicYear      || '2024-2025');
    set('fMaxStudents',       cls.maxStudents       || 30);
    set('fCurrentStudents',   cls.currentStudents   || 0);
    set('fRoomNumber',        cls.roomNumber        || '');
    set('fClassTeacher',      cls.classTeacherId    || '');
    set('fAssistantTeacher',  cls.assistantTeacherId|| '');
    set('fClassTeacherSubject',   cls.classTeacherSubject    || '');
    set('fAssistantTeacherSubject', cls.assistantTeacherSubject || '');
    set('fStartTime',         cls.startTime         || '08:30');
    set('fEndTime',           cls.endTime           || '13:30');
    set('fDescription',       cls.description       || '');

    // Load sections for chosen class from DB
    await loadSectionsForClass(cls.className);
    set('fSection', cls.section || '');

    // Working days
    const days = cls.workingDays || ['monday','tuesday','wednesday','thursday','friday'];
    const map = { monday:'dMon', tuesday:'dTue', wednesday:'dWed', thursday:'dThu', friday:'dFri', saturday:'dSat' };
    Object.entries(map).forEach(([day, elId]) => {
        const cb = document.getElementById(elId); if (cb) cb.checked = days.includes(day);
    });

    // Show teacher subject rows if teachers assigned
    updateTeacherSubjectSection();

    document.getElementById('newClassNameRow').classList.remove('show');
    document.getElementById('classModal').classList.add('active');
}

// ==================== DELETE CLASS ====================
async function deleteClass(classId) {
    if (!confirm('Delete this class? This cannot be undone.')) return;
    showLoading(true);
    try {
        await apiCall(`/classes/delete-class/${classId}`, 'DELETE');
        Toast.show('Class deleted', 'success');
        await fetchClasses();
        buildClassNameDropdown();
        populateFilterDropdowns();
        renderStatCards();
        renderClassesTable();
        renderSchedule();
    } catch (err) {
        Toast.show(err.message || 'Failed to delete class', 'error');
    } finally {
        showLoading(false);
    }
}

// ==================== VIEW CLASS ====================
async function viewClass(classId) {
    showLoading(true);
    try {
        const cls = await apiCall(`/classes/get-class-by-id/${classId}`);
        const ct  = teachers.find(t => t.id === cls.classTeacherId);
        const at  = teachers.find(t => t.id === cls.assistantTeacherId);

        document.getElementById('viewModalTitle').textContent  = `${cls.className} — ${cls.section}`;
        document.getElementById('viewModalCode').textContent   = cls.classCode || '';

        document.getElementById('viewModalBody').innerHTML = `
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
                ${[
                    ['Class Name',   cls.className],
                    ['Section',      cls.section],
                    ['Class Code',   cls.classCode || '—'],
                    ['Academic Year',cls.academicYear || '—'],
                    ['Room',         cls.roomNumber  || 'Not assigned'],
                    ['Capacity',     `${cls.currentStudents || 0} / ${cls.maxStudents || 0}`],
                    ['Class Teacher',ct ? getTeacherName(ct) : 'Not assigned'],
                    ['CT Subject',   cls.classTeacherSubject || 'Not assigned'],
                    ['Asst. Teacher',at ? getTeacherName(at) : 'Not assigned'],
                    ['AT Subject',   cls.assistantTeacherSubject || 'Not assigned'],
                    ['Schedule',     `${cls.startTime || '08:30'} – ${cls.endTime || '13:30'}`],
                    ['Status',       `<span class="badge ${cls.status === 'ACTIVE' ? 'badge-active' : 'badge-inactive'}">
                                        <span class="badge-dot"></span>${cls.status === 'ACTIVE' ? 'Active' : 'Inactive'}</span>`],
                ].map(([k,v]) => `
                    <div class="detail-row" style="flex-direction:column;gap:2px">
                        <span class="detail-key">${k}</span>
                        <span class="detail-val">${v}</span>
                    </div>`).join('')}
            </div>
            ${cls.workingDays?.length ? `
                <div style="margin-top:16px">
                    <div class="detail-key" style="margin-bottom:8px">Working Days</div>
                    <div style="display:flex;gap:6px;flex-wrap:wrap">
                        ${cls.workingDays.map(d =>
                            `<span class="badge" style="background:var(--primary-bg);color:var(--primary)">${d.charAt(0).toUpperCase()+d.slice(1)}</span>`
                        ).join('')}
                    </div>
                </div>` : ''}
            ${cls.description ? `
                <div style="margin-top:16px">
                    <div class="detail-key" style="margin-bottom:6px">Description</div>
                    <div style="font-size:13px;color:var(--text-secondary)">${cls.description}</div>
                </div>` : ''}
        `;

        document.getElementById('viewModal').classList.add('active');
    } catch (err) {
        Toast.show(err.message || 'Failed to load class details', 'error');
    } finally {
        showLoading(false);
    }
}

function closeViewModal() {
    document.getElementById('viewModal')?.classList.remove('active');
}

function closeClassModal() {
    document.getElementById('classModal')?.classList.remove('active');
    const form = document.getElementById('classForm');
    if (form) form.reset();
    bulkSelected = {};
    currentEditingClassId = null;
    newlyCreatedSections = [];  // Clear newly created sections
    document.getElementById('newClassNameRow')?.classList.remove('show');
    document.getElementById('teacherSubjectSection').style.display = 'none';
    document.getElementById('createSubjectPanel').style.display = 'none';
    document.getElementById('bulkTableWrap').style.display = 'none';
}

function manageTimetable(classId) {
    Toast.show('Timetable management coming soon', 'info');
}

// ==================== TEACHER SUBJECT SECTION ====================
function updateTeacherSubjectSection() {
    const ctVal = document.getElementById('fClassTeacher')?.value;
    const atVal = document.getElementById('fAssistantTeacher')?.value;

    const ctRow  = document.getElementById('classTeacherSubjectRow');
    const atRow  = document.getElementById('assiTeacherSubjectRow');
    const section = document.getElementById('teacherSubjectSection');

    const ct = teachers.find(t => String(t.id) === String(ctVal));
    const at = teachers.find(t => String(t.id) === String(atVal));

    if (ct) {
        document.getElementById('ctSubjectLabel').textContent = getTeacherName(ct);
        document.getElementById('ctSubjectMeta').textContent  = ct.designation || ct.primarySubject || '';
        ctRow.style.display = 'block';
    } else {
        ctRow.style.display = 'none';
    }

    if (at) {
        document.getElementById('atSubjectLabel').textContent = getTeacherName(at);
        document.getElementById('atSubjectMeta').textContent  = at.designation || at.primarySubject || '';
        atRow.style.display = 'block';
    } else {
        atRow.style.display = 'none';
    }

    section.style.display = (ct || at) ? 'block' : 'none';
}

// ==================== BULK ASSIGN ====================
function getBulkEligibleTeachers() {
    const ctId = document.getElementById('fClassTeacher')?.value;
    const atId = document.getElementById('fAssistantTeacher')?.value;
    return teachers.filter(t => String(t.id) !== ctId && String(t.id) !== atId);
}

function renderBulkDropdownList(filter = '') {
    const list = document.getElementById('bulkTeacherList');
    if (!list) return;

    const eligible = getBulkEligibleTeachers();
    const filtered = filter
        ? eligible.filter(t => getTeacherName(t).toLowerCase().includes(filter) ||
                               String(t.id).includes(filter) ||
                               (t.employeeId || '').toLowerCase().includes(filter))
        : eligible;

    if (filtered.length === 0) {
        list.innerHTML = `<div style="padding:16px;text-align:center;color:var(--text-muted);font-size:13px">
            No teachers available
        </div>`;
        return;
    }

    list.innerHTML = filtered.map(t => {
        const id      = String(t.id);
        const name    = getTeacherName(t);
        const meta    = t.designation || t.primarySubject || `ID: ${t.employeeId || t.id}`;
        const checked = bulkSelected[id] ? 'checked' : '';
        return `
            <div class="bulk-item" onclick="toggleBulkTeacher('${id}', '${name.replace(/'/g,"\\'")}', '${meta.replace(/'/g,"\\'")}')">
                <input type="checkbox" ${checked} onclick="event.stopPropagation();toggleBulkTeacher('${id}','${name.replace(/'/g,"\\'")}','${meta.replace(/'/g,"\\'")}')">
                <div>
                    <div class="bulk-item-name">${name}</div>
                    <div class="bulk-item-meta">${meta}</div>
                </div>
            </div>
        `;
    }).join('');
}

function toggleBulkTeacher(idStr, name, meta) {
    if (bulkSelected[idStr]) {
        delete bulkSelected[idStr];
    } else {
        bulkSelected[idStr] = { name, meta, subjects: [] };
    }
    document.getElementById('bulkSelectedCount').textContent = Object.keys(bulkSelected).length;
    renderBulkDropdownList(document.getElementById('bulkSearchInput')?.value?.toLowerCase() || '');
}

function renderBulkTable() {
    const wrap    = document.getElementById('bulkTableWrap');
    const tbody   = document.getElementById('bulkTableBody');
    const counter = document.getElementById('bulkTeacherCount');
    const entries = Object.entries(bulkSelected);

    if (!wrap || !tbody) return;

    if (entries.length === 0) {
        wrap.style.display = 'none';
        return;
    }

    wrap.style.display = 'block';
    if (counter) counter.textContent = entries.length;

    const subjectOptions = subjects.map(s => `<option value="${s}">${s}</option>`).join('');

    tbody.innerHTML = entries.map(([id, data], idx) => {
        const assignedChips = data.subjects.map((s, si) => `
            <span class="subject-chip-tag">
                ${s}
                <span class="remove-chip" onclick="removeBulkSubject('${id}', ${si})">×</span>
            </span>
        `).join('');

        return `
            <tr>
                <td style="font-weight:600;color:var(--text-muted)">${idx + 1}</td>
                <td>
                    <div style="font-weight:600;font-size:13px">${data.name}</div>
                    <div style="font-size:11px;color:var(--text-muted)">${data.meta}</div>
                </td>
                <td>
                    <div style="margin-bottom:6px">${assignedChips || '<span style="font-size:12px;color:var(--text-muted)">No subjects assigned</span>'}</div>
                    <div style="display:flex;gap:6px;align-items:center">
                        <select class="form-control" style="font-size:12px;padding:5px 8px" id="bulkSubjSel_${id}">
                            <option value="">Add subject…</option>
                            ${subjectOptions}
                        </select>
                        <button type="button" class="btn btn-primary btn-sm" onclick="addBulkSubject('${id}')">
                            <i class="fas fa-plus"></i>
                        </button>
                    </div>
                </td>
                <td>
                    <button type="button" class="btn btn-outline btn-sm" onclick="removeBulkTeacher('${id}')">
                        <i class="fas fa-times" style="color:var(--danger)"></i>
                    </button>
                </td>
            </tr>
        `;
    }).join('');
}

function addBulkSubject(teacherId) {
    const sel = document.getElementById(`bulkSubjSel_${teacherId}`);
    if (!sel || !sel.value) { Toast.show('Select a subject first', 'warning'); return; }
    if (!bulkSelected[teacherId]) return;

    const subj = sel.value;
    if (bulkSelected[teacherId].subjects.includes(subj)) {
        Toast.show('Subject already assigned to this teacher', 'warning');
        return;
    }
    bulkSelected[teacherId].subjects.push(subj);
    renderBulkTable();
}

function removeBulkSubject(teacherId, subjectIndex) {
    if (!bulkSelected[teacherId]) return;
    bulkSelected[teacherId].subjects.splice(subjectIndex, 1);
    renderBulkTable();
}

function removeBulkTeacher(teacherId) {
    delete bulkSelected[teacherId];
    document.getElementById('bulkSelectedCount').textContent = Object.keys(bulkSelected).length;
    renderBulkTable();
    updateBulkDropLabel();
}

function updateBulkDropLabel() {
    const count = Object.keys(bulkSelected).length;
    const label = document.getElementById('bulkDropLabel');
    if (label) {
        label.textContent = count > 0
            ? `${count} teacher${count > 1 ? 's' : ''} selected`
            : 'Click to select teachers…';
    }
}

function clearBulkSelection() {
    bulkSelected = {};
    document.getElementById('bulkSelectedCount').textContent = '0';
    renderBulkDropdownList(document.getElementById('bulkSearchInput')?.value?.toLowerCase() || '');
}

function saveBulkSelection() {
    const panel = document.getElementById('bulkDropPanel');
    const btn   = document.getElementById('bulkDropBtn');
    if (panel) panel.classList.add('hidden');
    if (btn)   btn.classList.remove('open');
    updateBulkDropLabel();
    renderBulkTable();
    Toast.show(`${Object.keys(bulkSelected).length} teacher(s) added to bulk assignment`, 'success');
}

// ==================== CREATE SUBJECT ====================
function toggleSubjectPanel() {
    const panel = document.getElementById('createSubjectPanel');
    const btn   = document.getElementById('toggleSubjectBtn');
    if (!panel) return;
    const isOpen = panel.style.display !== 'none';
    panel.style.display = isOpen ? 'none' : 'block';
    if (btn) {
        btn.innerHTML = isOpen
            ? '<i class="fas fa-plus-circle"></i> Create New Subject'
            : '<i class="fas fa-minus-circle"></i> Cancel New Subject';
    }
}

function hideSubjectPanel() {
    const panel = document.getElementById('createSubjectPanel');
    const btn   = document.getElementById('toggleSubjectBtn');
    if (panel) panel.style.display = 'none';
    if (btn) btn.innerHTML = '<i class="fas fa-plus-circle"></i> Create New Subject';
}

function resetSubjectForm() {
    ['sName','sCode','sDescription'].forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
    const sType      = document.getElementById('sType');      if (sType)      sType.value      = 'CORE';
    const sMaxMarks  = document.getElementById('sMaxMarks');  if (sMaxMarks)  sMaxMarks.value  = '100';
    const sPassMarks = document.getElementById('sPassMarks'); if (sPassMarks) sPassMarks.value = '35';
    const sCH        = document.getElementById('sCreditHours');if (sCH)        sCH.value        = '4';
    const sPW        = document.getElementById('sPeriodsWeek');if (sPW)        sPW.value        = '5';
}

function autoSubjectCode() {
    const name = document.getElementById('sName')?.value || '';
    const code = name.trim().toUpperCase().replace(/\s+/g,'_').substring(0, 10);
    const codeEl = document.getElementById('sCode');
    if (codeEl && !codeEl.dataset.manuallyEdited) codeEl.value = code;
}

async function saveSubject() {
    const name    = document.getElementById('sName')?.value?.trim();
    const code    = document.getElementById('sCode')?.value?.trim();
    const type    = document.getElementById('sType')?.value;
    const maxMk   = parseInt(document.getElementById('sMaxMarks')?.value)  || 100;
    const passMk  = parseInt(document.getElementById('sPassMarks')?.value) || 35;
    const credit  = parseInt(document.getElementById('sCreditHours')?.value)|| 4;
    const periods = parseInt(document.getElementById('sPeriodsWeek')?.value)|| 5;
    const desc    = document.getElementById('sDescription')?.value?.trim() || '';

    if (!name || !code) {
        Toast.show('Subject Name and Code are required', 'warning');
        return;
    }

    const payload = { subjectName: name, subjectCode: code, subjectType: type,
                      maxMarks: maxMk, passingMarks: passMk, creditHours: credit,
                      periodsPerWeek: periods, description: desc };

    showLoading(true);
    try {
        await apiCall('/subjects/create-subject', 'POST', payload);
        Toast.show(`Subject "${name}" saved successfully!`, 'success');

        if (!subjects.includes(name)) subjects.push(name);
        populateSubjectDropdowns();
        renderBulkTable();

        resetSubjectForm();
        hideSubjectPanel();
    } catch (err) {
        console.error('❌ saveSubject:', err);
        Toast.show(err.message || 'Failed to save subject', 'error');
    } finally {
        showLoading(false);
    }
}

// ==================== FILTERS ====================
function filterChange() { renderClassesTable(); }

function clearFilters() {
    const filterClass   = document.getElementById('filterClass');
    const filterSection = document.getElementById('filterSection');
    const filterYear    = document.getElementById('filterYear');
    const searchInput   = document.getElementById('searchInput');
    if (filterClass)   filterClass.value   = 'all';
    if (filterSection) filterSection.value = 'all';
    if (filterYear)    filterYear.value    = '2024-2025';
    if (searchInput)   searchInput.value   = '';
    renderClassesTable();
}

// ==================== CLOSE OTHERS MODAL ====================
function closeOthersModal() {
    const w = document.getElementById('othersModalWrap');
    if (w) w.classList.remove('active');
}

// ==================== SIDEBAR ====================
let sidebarCollapsed = false;
let isMobile = window.innerWidth < 1024;

function setupResponsiveSidebar() {
    isMobile = window.innerWidth < 1024;
    if (isMobile) closeMobileSidebar();
    window.addEventListener('resize', handleResize);
}

function handleResize() {
    const wasMobile = isMobile;
    isMobile = window.innerWidth < 1024;
    if (wasMobile === isMobile) return;
    if (isMobile) {
        closeMobileSidebar();
    } else {
        const sidebar = document.getElementById('sidebar');
        const main    = document.getElementById('mainContent');
        const overlay = document.getElementById('sidebarOverlay');
        sidebar?.classList.remove('mobile-open');
        overlay?.classList.remove('active');
        if (sidebarCollapsed) {
            sidebar?.classList.add('collapsed');
            main?.classList.add('sidebar-collapsed');
        } else {
            sidebar?.classList.remove('collapsed');
            main?.classList.remove('sidebar-collapsed');
        }
    }
}

function toggleSidebar() {
    const btn = document.getElementById('sidebarToggleBtn');
    if (isMobile) {
        const sidebar = document.getElementById('sidebar');
        if (sidebar?.classList.contains('mobile-open')) {
            closeMobileSidebar();
            if (btn) btn.innerHTML = '<i class="fas fa-bars"></i>';
        } else {
            openMobileSidebar();
            if (btn) btn.innerHTML = '<i class="fas fa-times"></i>';
        }
    } else {
        const sidebar = document.getElementById('sidebar');
        const main    = document.getElementById('mainContent');
        sidebarCollapsed = !sidebarCollapsed;
        sidebar?.classList.toggle('collapsed',      sidebarCollapsed);
        main?.classList.toggle('sidebar-collapsed', sidebarCollapsed);
    }
}

function openMobileSidebar() {
    document.getElementById('sidebar')?.classList.add('mobile-open');
    document.getElementById('sidebarOverlay')?.classList.add('active');
    document.body.classList.add('sidebar-open');
}

function closeMobileSidebar() {
    document.getElementById('sidebar')?.classList.remove('mobile-open');
    document.getElementById('sidebarOverlay')?.classList.remove('active');
    document.body.classList.remove('sidebar-open');
    const btn = document.getElementById('sidebarToggleBtn');
    if (btn && isMobile) btn.innerHTML = '<i class="fas fa-bars"></i>';
}

function toggleNotifications() {
    const notifMenu = document.getElementById('notifMenu');
    const userMenu  = document.getElementById('userMenu');
    if (notifMenu) {
        notifMenu.classList.toggle('hidden');
        userMenu?.classList.add('hidden');
    }
}

function toggleUserMenu() {
    const userMenu  = document.getElementById('userMenu');
    const notifMenu = document.getElementById('notifMenu');
    if (userMenu) {
        userMenu.classList.toggle('hidden');
        notifMenu?.classList.add('hidden');
    }
}

function handleLogout() {
    if (confirm('Are you sure you want to logout?')) {
        localStorage.removeItem('admin_jwt_token');
        localStorage.removeItem('admin_mobile');
        window.location.href = '../login.html';
    }
}

// ==================== ATTACH ALL EVENT LISTENERS ====================
function attachEventListeners() {

    // Sidebar
    document.getElementById('sidebarToggleBtn')?.addEventListener('click', toggleSidebar);
    document.getElementById('sidebarOverlay')?.addEventListener('click', closeMobileSidebar);

    // Nav
    document.getElementById('notifBtn')?.addEventListener('click', toggleNotifications);
    document.getElementById('userMenuBtn')?.addEventListener('click', toggleUserMenu);
    document.getElementById('logoutBtn')?.addEventListener('click', handleLogout);

    // Close dropdowns on outside click
    document.addEventListener('click', e => {
        const notifBtn  = document.getElementById('notifBtn');
        const notifMenu = document.getElementById('notifMenu');
        if (notifBtn && notifMenu && !notifBtn.contains(e.target) && !notifMenu.contains(e.target))
            notifMenu.classList.add('hidden');

        const userMenuBtn = document.getElementById('userMenuBtn');
        const userMenu    = document.getElementById('userMenu');
        if (userMenuBtn && userMenu && !userMenuBtn.contains(e.target) && !userMenu.contains(e.target))
            userMenu.classList.add('hidden');

        const bulkBtn   = document.getElementById('bulkDropBtn');
        const bulkPanel = document.getElementById('bulkDropPanel');
        if (bulkBtn && bulkPanel && !bulkBtn.contains(e.target) && !bulkPanel.contains(e.target)) {
            bulkPanel.classList.add('hidden');
            bulkBtn.classList.remove('open');
        }
    });

    // Create class button
    document.getElementById('openCreateBtn')?.addEventListener('click', openCreateModal);

    // Modal close / cancel
    document.getElementById('closeClassModal')?.addEventListener('click', closeClassModal);
    document.getElementById('cancelClassModal')?.addEventListener('click', closeClassModal);

    // Submit class
    document.getElementById('submitClassBtn')?.addEventListener('click', saveClass);

    // Click overlay to close modal
    document.querySelectorAll('.modal-overlay').forEach(overlay => {
        overlay.addEventListener('click', e => { if (e.target === overlay) overlay.classList.remove('active'); });
    });

    // Filters
    document.getElementById('searchInput')?.addEventListener('input', filterChange);
    document.getElementById('filterClass')?.addEventListener('change', e => {
        rebuildFilterSections(e.target.value);
        filterChange();
    });
    document.getElementById('filterSection')?.addEventListener('change', filterChange);
    document.getElementById('filterYear')?.addEventListener('change', filterChange);

    // ── CLASS NAME DROPDOWN (modal) ──
    document.getElementById('fClassName')?.addEventListener('change', async e => {
        const val = e.target.value;
        const row = document.getElementById('newClassNameRow');
        if (val === '__new__') {
            row.classList.add('show');
            document.getElementById('fNewClassName')?.focus();
            const secSel = document.getElementById('fSection');
            if (secSel) { secSel.innerHTML = '<option value="">Enter class name first…</option>'; secSel.disabled = true; }
        } else {
            row.classList.remove('show');
            if (val) await loadSectionsForClass(val);
            else {
                const secSel = document.getElementById('fSection');
                if (secSel) { secSel.innerHTML = '<option value="">Select class first…</option>'; secSel.disabled = true; }
            }
        }
        const acYear  = document.getElementById('fAcademicYear')?.value || '2025';
        const secVal  = document.getElementById('fSection')?.value      || '';
        const codeSug = val && val !== '__new__' ? `${val.replace(/\s+/g,'-').toUpperCase()}-${secVal || 'A'}-${acYear.split('-')[1] || acYear}` : '';
        const codeEl  = document.getElementById('fClassCode');
        if (codeEl && !codeEl.value) codeEl.value = codeSug;
    });

    // Save new class name button
    document.getElementById('saveNewClassNameBtn')?.addEventListener('click', saveNewClassName);

    // Section change → update class code suggestion
    document.getElementById('fSection')?.addEventListener('change', () => {
        const className = document.getElementById('fClassName')?.value;
        const section   = document.getElementById('fSection')?.value;
        const year      = document.getElementById('fAcademicYear')?.value || '2025';
        if (className && className !== '__new__' && section) {
            const codeEl = document.getElementById('fClassCode');
            if (codeEl && !codeEl.value) {
                codeEl.value = `${className.replace(/\s+/g,'-').toUpperCase()}-${section}-${year.split('-')[1] || year}`;
            }
        }
    });

    // Teachers → subject section visibility
    document.getElementById('fClassTeacher')?.addEventListener('change', updateTeacherSubjectSection);
    document.getElementById('fAssistantTeacher')?.addEventListener('change', updateTeacherSubjectSection);

    // Clear subject buttons
    document.getElementById('clearCTSubjectBtn')?.addEventListener('click', () => {
        const el = document.getElementById('fClassTeacherSubject'); if (el) el.value = '';
    });
    document.getElementById('clearATSubjectBtn')?.addEventListener('click', () => {
        const el = document.getElementById('fAssistantTeacherSubject'); if (el) el.value = '';
    });

    // ── BULK ASSIGN ──
    document.getElementById('bulkDropBtn')?.addEventListener('click', () => {
        const panel = document.getElementById('bulkDropPanel');
        const btn   = document.getElementById('bulkDropBtn');
        const isOpen = !panel.classList.contains('hidden');
        if (isOpen) {
            panel.classList.add('hidden');
            btn.classList.remove('open');
        } else {
            renderBulkDropdownList('');
            panel.classList.remove('hidden');
            btn.classList.add('open');
            document.getElementById('bulkSearchInput')?.focus();
        }
    });

    document.getElementById('bulkSearchInput')?.addEventListener('input', e => {
        renderBulkDropdownList(e.target.value.toLowerCase());
    });

    document.getElementById('clearBulkBtn')?.addEventListener('click', clearBulkSelection);
    document.getElementById('saveBulkBtn')?.addEventListener('click', saveBulkSelection);

    // ── CREATE SUBJECT ──
    document.getElementById('toggleSubjectBtn')?.addEventListener('click', toggleSubjectPanel);
    document.getElementById('hideSubjectPanelBtn')?.addEventListener('click', hideSubjectPanel);
    document.getElementById('resetSubjectBtn')?.addEventListener('click', resetSubjectForm);
    document.getElementById('saveSubjectBtn')?.addEventListener('click', saveSubject);

    // Subject name → auto-generate code
    document.getElementById('sName')?.addEventListener('input', autoSubjectCode);
    document.getElementById('sCode')?.addEventListener('input', () => {
        const el = document.getElementById('sCode');
        if (el) el.dataset.manuallyEdited = 'true';
    });

    // Weekly schedule navigation
    document.getElementById('prevWeekBtn')?.addEventListener('click', () => { currentWeekOffset--; renderSchedule(); });
    document.getElementById('nextWeekBtn')?.addEventListener('click', () => { currentWeekOffset++; renderSchedule(); });
}

// ==================== BOOT ====================
document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 Class Management loaded');
    setupResponsiveSidebar();
    initializeData();
});

// Expose for inline HTML handlers
window.viewClass          = viewClass;
window.editClass          = editClass;
window.deleteClass        = deleteClass;
window.manageTimetable    = manageTimetable;
window.closeViewModal     = closeViewModal;
window.closeClassModal    = closeClassModal;
window.closeOthersModal   = closeOthersModal;
window.toggleBulkTeacher  = toggleBulkTeacher;
window.addBulkSubject     = addBulkSubject;
window.removeBulkSubject  = removeBulkSubject;
window.removeBulkTeacher  = removeBulkTeacher;