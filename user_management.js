// ══════════════════════════════════════════════════════════════════════
//  user_management.js  v7.5
//  إدارة المستخدمين — Admin Only (Direct Supabase Connection + Real Delete)
// ══════════════════════════════════════════════════════════════════════

(function () {
    'use strict';

    function isAdmin() {
        return (sessionStorage.getItem('clinicRole') || '') === 'admin';
    }

    const ROLE_MAP = {
        admin:     { ar: 'مدير النظام',   en: 'System Admin',   icon: 'fa-shield-halved', color: 'indigo' },
        doctor:    { ar: 'طبيب',           en: 'Doctor',         icon: 'fa-user-doctor',   color: 'blue' },
        reception: { ar: 'استقبال',        en: 'Receptionist',   icon: 'fa-headset',       color: 'emerald' },
    };

    // القوائم القابلة للتخصيص
    const PERMISSIONS_LIST = [
        { id: 'nav-dashboard', labelAr: 'الرئيسية', labelEn: 'Dashboard' },
        { id: 'nav-patients', labelAr: 'المرضى', labelEn: 'Patients' },
        { id: 'nav-appointments', labelAr: 'المواعيد', labelEn: 'Appointments' },
        { id: 'nav-calendar', labelAr: 'التقويم', labelEn: 'Calendar' },
        { id: 'nav-prescriptions', labelAr: 'الوصفات الطبية', labelEn: 'Prescriptions' },
        { id: 'nav-invoices', labelAr: 'الفواتير', labelEn: 'Invoices' },
        { id: 'nav-expenses', labelAr: 'المصروفات', labelEn: 'Expenses' },
        { id: 'nav-reports', labelAr: 'التقارير والإحصائيات', labelEn: 'Reports' },
        { id: 'nav-inventory', labelAr: 'المخزن', labelEn: 'Inventory' },
        { id: 'nav-lab', labelAr: 'معامل الأسنان', labelEn: 'Lab Orders' },
        { id: 'nav-doctors', labelAr: 'الأطباء والعمولات', labelEn: 'Doctors' },
        { id: 'nav-reminders', labelAr: 'التذكيرات', labelEn: 'Reminders' },
        { id: 'nav-settings', labelAr: 'الإعدادات', labelEn: 'Settings' }
    ];

    function injectUI() {
        const lang = localStorage.getItem('clinicLang') || 'ar';
        const menuLabel = lang === 'ar' ? 'إدارة المستخدمين' : 'User Management';

        // ── 1. Nav item ───────────────────────────────────────────────
        const navSettings = document.getElementById('nav-settings');
        if (navSettings && isAdmin() && !document.getElementById('nav-users')) {
            navSettings.insertAdjacentHTML('afterend', `
            <a onclick="switchView('users')" id="nav-users" class="sidebar-link">
                <i class="fa-solid fa-users-gear"></i>
                <span class="nav-label" id="navUsersLabel">${menuLabel}</span>
            </a>`);
        }

        // ── 2. View Section ────────────────────────────────────────────
        if (!document.getElementById('usersView')) {
            const mainArea = document.getElementById('mainArea') || document.querySelector('main');
            
            const viewHTML = `
            <div class="view-section h-full overflow-y-auto p-5" id="usersView">
                
                <!-- Header -->
                <div class="flex flex-wrap justify-between items-center mb-4 gap-3">
                    <h2 class="text-xl font-bold flex items-center gap-2" id="usersMainTitle">
                        <i class="fa-solid fa-users-gear text-indigo-500"></i> إدارة المستخدمين والصلاحيات
                    </h2>
                    <div class="flex gap-2 items-center">
                        <div class="search-box">
                            <i class="fa-solid fa-magnifying-glass text-xs"></i>
                            <input type="text" id="usersSearchInput" onkeyup="window.filterUsers()" 
                                placeholder="بحث باسم المستخدم أو الدخول..." 
                                class="border border-gray-200 rounded-xl text-sm py-2 px-3 w-56" style="padding-left:36px; padding-right:16px;">
                        </div>
                        <button onclick="window.openUserModal()" class="btn" style="background:#4f46e5;color:white;" id="btnNewUser">
                            <i class="fa-solid fa-user-plus"></i> مستخدم جديد
                        </button>
                    </div>
                </div>

                <!-- KPIs Cards -->
                <div class="grid grid-cols-3 gap-3 mb-4">
                    <div class="stat-card">
                        <div>
                            <p class="text-xs text-gray-400">إجمالي الحسابات</p>
                            <h3 class="text-xl font-bold text-gray-800" id="umKpiTotal">0</h3>
                        </div>
                        <div class="w-9 h-9 bg-gray-50 text-gray-500 rounded-xl flex items-center justify-center"><i class="fa-solid fa-users"></i></div>
                    </div>
                    <div class="stat-card">
                        <div>
                            <p class="text-xs text-green-500 font-semibold">حسابات نشطة</p>
                            <h3 class="text-xl font-bold text-green-600" id="umKpiActive">0</h3>
                        </div>
                        <div class="w-9 h-9 bg-green-50 text-green-500 rounded-xl flex items-center justify-center"><i class="fa-solid fa-user-check"></i></div>
                    </div>
                    <div class="stat-card">
                        <div>
                            <p class="text-xs text-indigo-400 font-semibold">مديري النظام</p>
                            <h3 class="text-xl font-bold text-indigo-500" id="umKpiAdmins">0</h3>
                        </div>
                        <div class="w-9 h-9 bg-indigo-50 text-indigo-500 rounded-xl flex items-center justify-center"><i class="fa-solid fa-shield-halved"></i></div>
                    </div>
                </div>

                <!-- Loader -->
                <div id="usersLoader" class="hidden text-center py-12">
                    <i class="fa-solid fa-circle-notch fa-spin text-3xl text-blue-500"></i>
                    <p class="text-sm text-gray-400 mt-2">جاري تحميل المستخدمين...</p>
                </div>

                <!-- Table -->
                <div class="bg-white rounded-xl border border-gray-100 overflow-hidden" id="usersTableContainer">
                    <table class="w-full text-sm text-start">
                        <thead>
                            <tr class="bg-gray-50 text-gray-400 text-xs uppercase border-b border-gray-100">
                                <th class="text-start px-4 py-3">المستخدم</th>
                                <th class="text-start px-4 py-3">اسم الدخول</th>
                                <th class="text-center px-4 py-3">الصلاحية</th>
                                <th class="text-center px-4 py-3">الحالة</th>
                                <th class="text-center px-4 py-3">تاريخ السجل</th>
                                <th class="text-center px-4 py-3">إجراءات</th>
                            </tr>
                        </thead>
                        <tbody id="usersTableBody"></tbody>
                    </table>
                    <div id="usersEmptyState" class="hidden text-center py-16 text-gray-400">
                        <i class="fa-solid fa-users-slash text-4xl mb-3 opacity-30"></i>
                        <p class="text-sm font-medium">لا يوجد مستخدمين مسجلين</p>
                    </div>
                </div>
            </div>
            `;
            
            // حقن الشاشة
            const container = mainArea.querySelector('.flex-1.relative') || mainArea;
            container.insertAdjacentHTML('beforeend', viewHTML);

            // إنشاء قائمة الصلاحيات للـ Modal
            const permissionsHtml = PERMISSIONS_LIST.map(p => `
                <label class="flex items-center gap-2 p-2 border border-gray-100 rounded-lg hover:bg-slate-50 cursor-pointer">
                    <input type="checkbox" class="user-permission-cb accent-indigo-600 w-4 h-4" value="${p.id}">
                    <span class="text-xs font-semibold text-gray-700">${lang === 'ar' ? p.labelAr : p.labelEn}</span>
                </label>
            `).join('');

            // حقن النافذة المنبثقة (Modal)
            document.body.insertAdjacentHTML('beforeend', `
            <div id="userModal" class="modal-base">
                <div class="modal-box max-w-lg">
                    <div class="flex justify-between items-center mb-5 border-b pb-3">
                        <h3 class="text-lg font-bold" id="userModalTitle"><i class="fa-solid fa-user-plus text-indigo-500 mr-2"></i>مستخدم جديد</h3>
                        <button onclick="closeModal('userModal')" class="text-gray-300 hover:text-red-400 text-xl w-7 h-7 flex items-center justify-center">
                            <i class="fa-solid fa-xmark"></i>
                        </button>
                    </div>
                    <form id="userForm" onsubmit="window.saveUser(event)" class="space-y-3">
                        <input type="hidden" id="userId">
                        
                        <div class="grid grid-cols-2 gap-3">
                            <div>
                                <label class="text-xs font-semibold text-gray-500 block mb-1">الاسم بالعربي</label>
                                <input type="text" id="userNameAr" class="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm" placeholder="الاسم الظاهر">
                            </div>
                            <div>
                                <label class="text-xs font-semibold text-gray-500 block mb-1">الاسم بالإنجليزي</label>
                                <input type="text" id="userNameEn" class="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm" placeholder="Display Name" dir="ltr">
                            </div>
                        </div>

                        <div class="grid grid-cols-2 gap-3">
                            <div>
                                <label class="text-xs font-semibold text-gray-500 block mb-1">اسم الدخول (Username) *</label>
                                <input type="text" id="userUsername" required class="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm font-semibold" placeholder="ahmed99" dir="ltr">
                            </div>
                            <div>
                                <label class="text-xs font-semibold text-gray-500 block mb-1">كلمة المرور (Password) *</label>
                                <input type="text" id="userPassword" required class="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm font-semibold" placeholder="••••••••" dir="ltr">
                            </div>
                        </div>

                        <div>
                            <label class="text-xs font-semibold text-gray-500 block mb-1">الدور الأساسي *</label>
                            <select id="userRole" class="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm" onchange="window.setDefaultPermissions()">
                                <option value="doctor">طبيب (Doctor)</option>
                                <option value="reception">موظف استقبال (Receptionist)</option>
                                <option value="admin">مدير نظام (Admin)</option>
                            </select>
                        </div>

                        <div class="mt-4 border-t border-gray-100 pt-3">
                            <label class="text-xs font-bold text-gray-800 flex items-center gap-2 mb-2">
                                <i class="fa-solid fa-user-lock text-indigo-500"></i> الصلاحيات المخصصة (الشاشات المسموحة)
                            </label>
                            <div class="grid grid-cols-2 gap-2 max-h-32 overflow-y-auto p-1" id="userPermissionsContainer">
                                ${permissionsHtml}
                            </div>
                        </div>

                        <div class="bg-slate-50 border border-gray-100 rounded-xl p-3 flex items-center gap-3 mt-3">
                            <input type="checkbox" id="userActive" checked class="w-4 h-4 accent-indigo-600">
                            <label for="userActive" class="text-sm font-semibold text-gray-700 cursor-pointer">الحساب نشط ويُسمح له بالدخول</label>
                        </div>

                        <div class="flex gap-2 mt-4 pt-4 border-t border-gray-100">
                            <button type="button" onclick="closeModal('userModal')" class="btn btn-gray flex-1 justify-center py-2.5">إلغاء</button>
                            <button type="submit" id="userSaveBtn" class="btn flex-1 justify-center py-2.5" style="background:#4f46e5;color:white;">
                                <i class="fa-solid fa-save mr-2"></i> حفظ المستخدم
                            </button>
                        </div>
                    </form>
                </div>
            </div>
            `);
        }
    }

    // ── 3. Logic ───────────────────────────────────────────────────
    let _usersList = [];

    window.loadUsersView = async function () {
        if (!isAdmin()) return;
        const loader = document.getElementById('usersLoader');
        const tableContainer = document.getElementById('usersTableContainer');
        
        loader.classList.remove('hidden');
        tableContainer.style.display = 'none';

        try {
            if (!navigator.onLine) throw new Error('لا يوجد اتصال بالإنترنت.');

            // ✅ جلب البيانات مباشرة من السيرفر لضمان أننا نرى النسخة الحقيقية وليس الكاش
            const { data, error } = await window._sb.from('clinic_users').select('*').order('created_at', { ascending: true });
            
            if (error) throw error;
            _usersList = data || [];
            
            // تحديث الإحصائيات العلوية
            const activeCount = _usersList.filter(u => u.is_active).length;
            const adminCount  = _usersList.filter(u => u.role === 'admin').length;
            document.getElementById('umKpiTotal').innerText = _usersList.length;
            document.getElementById('umKpiActive').innerText = activeCount;
            document.getElementById('umKpiAdmins').innerText = adminCount;

            window.renderUsers(_usersList);
        } catch (e) {
            console.error('Error loading users:', e);
            if (typeof showToast === 'function') showToast('خطأ في تحميل المستخدمين: ' + (e.message || ''), 'error');
        } finally {
            loader.classList.add('hidden');
            tableContainer.style.display = 'block';
        }
    };

    window.filterUsers = function () {
        const q = (document.getElementById('usersSearchInput')?.value || '').toLowerCase().trim();
        if (!q) {
            window.renderUsers(_usersList);
            return;
        }
        const filtered = _usersList.filter(u => {
            const rl = ROLE_MAP[u.role] || ROLE_MAP['reception'];
            return (
                (u.username  || '').toLowerCase().includes(q) ||
                (u.name_ar   || '').toLowerCase().includes(q) ||
                (u.name_en   || '').toLowerCase().includes(q) ||
                (rl.ar       || '').toLowerCase().includes(q) ||
                (rl.en       || '').toLowerCase().includes(q)
            );
        });
        window.renderUsers(filtered);
    };

    window.renderUsers = function (users) {
        const tbody = document.getElementById('usersTableBody');
        const empty = document.getElementById('usersEmptyState');
        const lang = localStorage.getItem('clinicLang') || 'ar';
        
        if (!users.length) {
            tbody.innerHTML = '';
            empty.classList.remove('hidden');
            return;
        }
        empty.classList.add('hidden');

        tbody.innerHTML = users.map(u => {
            const rl = ROLE_MAP[u.role] || ROLE_MAP['reception'];
            const name = u.name_ar || u.name_en || u.username;
            const roleName = lang === 'ar' ? rl.ar : rl.en;
            
            const activeHtml = u.is_active 
                ? `<span class="badge" style="background:#f0fdf4;color:#16a34a;"><i class="fa-solid fa-check mr-1"></i> ${lang === 'ar' ? 'نشط' : 'Active'}</span>`
                : `<span class="badge" style="background:#fef2f2;color:#ef4444;"><i class="fa-solid fa-xmark mr-1"></i> ${lang === 'ar' ? 'موقوف' : 'Suspended'}</span>`;

            const roleBadge = `<span class="badge" style="background:var(--tw-colors-${rl.color}-50,#eff6ff);color:var(--tw-colors-${rl.color}-600,#2563eb);border:1px solid var(--tw-colors-${rl.color}-100,#dbeafe);"><i class="fa-solid ${rl.icon} mr-1"></i> ${roleName}</span>`;

            // تجهيز التاريخ للظهور بشكل أنيق
            let dateHtml = '<span class="text-gray-400">—</span>';
            if (u.created_at) {
                const dateObj = new Date(u.created_at);
                const dateStr = dateObj.toLocaleDateString(lang === 'ar' ? 'ar-EG' : 'en-US', { year: 'numeric', month: 'short', day: 'numeric' });
                const timeStr = dateObj.toLocaleTimeString(lang === 'ar' ? 'ar-EG' : 'en-US', { hour: '2-digit', minute: '2-digit' });
                dateHtml = `<div class="text-xs text-gray-600 font-medium">${dateStr}</div><div class="text-[10px] text-gray-400">${timeStr}</div>`;
            }

            return `
            <tr class="border-b border-gray-50 hover:bg-slate-50 transition-colors">
                <td class="px-4 py-3">
                    <div class="flex items-center gap-3">
                        <div class="w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm shadow-sm" style="background:var(--tw-colors-${rl.color}-100,#dbeafe); color:var(--tw-colors-${rl.color}-600,#2563eb);">
                            ${name.charAt(0).toUpperCase()}
                        </div>
                        <div class="font-semibold text-gray-800 text-sm">${name}</div>
                    </div>
                </td>
                <td class="px-4 py-3 text-gray-500 font-mono text-sm" dir="ltr">@${u.username}</td>
                <td class="px-4 py-3 text-center">${roleBadge}</td>
                <td class="px-4 py-3 text-center">${activeHtml}</td>
                <td class="px-4 py-3 text-center">${dateHtml}</td>
                <td class="px-4 py-3 text-center">
                    <div class="flex gap-1 justify-center">
                        <button onclick="window.openUserModal('${u.id}')" class="btn btn-outline text-xs px-2 py-1"><i class="fa-solid fa-pen"></i></button>
                        <button onclick="window.deleteUser('${u.id}', '${u.username}')" class="btn text-xs px-2 py-1" style="background:#fef2f2;color:#ef4444;border:1px solid #fecaca;"><i class="fa-solid fa-trash"></i></button>
                    </div>
                </td>
            </tr>`;
        }).join('');
    };

    window.setDefaultPermissions = function() {
        const role = document.getElementById('userRole').value;
        const checkboxes = document.querySelectorAll('.user-permission-cb');
        
        let defaultPerms = [];
        if (role === 'admin') {
            defaultPerms = PERMISSIONS_LIST.map(p => p.id); // الكل مسموح
        } else if (role === 'doctor') {
            defaultPerms = ['nav-dashboard', 'nav-patients', 'nav-appointments', 'nav-calendar', 'nav-prescriptions', 'nav-invoices', 'nav-reports'];
        } else { // reception
            defaultPerms = ['nav-dashboard', 'nav-patients', 'nav-appointments', 'nav-calendar', 'nav-prescriptions', 'nav-invoices'];
        }

        checkboxes.forEach(cb => {
            cb.checked = defaultPerms.includes(cb.value);
        });
    };

    window.openUserModal = function (id = null) {
        const form = document.getElementById('userForm');
        const title = document.getElementById('userModalTitle');
        const lang = localStorage.getItem('clinicLang') || 'ar';
        
        form.reset();
        document.getElementById('userId').value = '';
        title.innerHTML = `<i class="fa-solid fa-user-plus text-indigo-500 mr-2"></i> ${lang === 'ar' ? 'إضافة مستخدم' : 'New User'}`;

        if (id) {
            const u = _usersList.find(x => String(x.id) === String(id));
            if (u) {
                document.getElementById('userId').value = u.id;
                document.getElementById('userUsername').value = u.username;
                document.getElementById('userPassword').value = u.password;
                document.getElementById('userNameAr').value = u.name_ar || '';
                document.getElementById('userNameEn').value = u.name_en || '';
                document.getElementById('userRole').value = u.role;
                document.getElementById('userActive').checked = u.is_active;
                
                let userPerms = [];
                try {
                    userPerms = u.permissions ? JSON.parse(u.permissions) : [];
                } catch(e) {}
                
                const checkboxes = document.querySelectorAll('.user-permission-cb');
                if (userPerms && userPerms.length > 0) {
                    checkboxes.forEach(cb => {
                        cb.checked = userPerms.includes(cb.value);
                    });
                } else {
                    window.setDefaultPermissions();
                }

                title.innerHTML = `<i class="fa-solid fa-user-pen text-indigo-500 mr-2"></i> ${lang === 'ar' ? 'تعديل الحساب:' : 'Edit Account:'} <span class="font-mono text-sm ml-1">@${u.username}</span>`;
            }
        } else {
            window.setDefaultPermissions();
        }
        
        if (typeof openModal === 'function') openModal('userModal');
        else document.getElementById('userModal')?.classList.add('open');
    };

    window.saveUser = async function (e) {
        e.preventDefault();
        const btn = document.getElementById('userSaveBtn');
        const origHtml = btn.innerHTML;
        btn.innerHTML = `<i class="fa-solid fa-spinner fa-spin mr-1"></i> جاري الحفظ...`;
        btn.disabled = true;

        const id = document.getElementById('userId').value;
        
        const selectedPerms = [];
        document.querySelectorAll('.user-permission-cb:checked').forEach(cb => {
            selectedPerms.push(cb.value);
        });

        const data = {
            username: document.getElementById('userUsername').value.trim(),
            password: document.getElementById('userPassword').value.trim(),
            name_ar: document.getElementById('userNameAr').value.trim(),
            name_en: document.getElementById('userNameEn').value.trim(),
            role: document.getElementById('userRole').value,
            is_active: document.getElementById('userActive').checked,
            permissions: JSON.stringify(selectedPerms)
        };

        try {
            if (!navigator.onLine) throw new Error('لا يوجد اتصال بالإنترنت.');

            if (id) {
                const parsedId = isNaN(Number(id)) ? id : Number(id);
                // ✅ الحفظ المباشر في السيرفر
                const { error } = await window._sb.from('clinic_users').update(data).eq('id', parsedId);
                if (error) throw error;
                if (typeof showToast === 'function') showToast('تم تعديل البيانات بنجاح', 'success');
            } else {
                // ✅ الحفظ المباشر في السيرفر
                const { error } = await window._sb.from('clinic_users').insert(data);
                if (error) throw error;
                if (typeof showToast === 'function') showToast('تم إضافة المستخدم', 'success');
            }
            if (typeof closeModal === 'function') closeModal('userModal');
            else document.getElementById('userModal')?.classList.remove('open');
            
            // تحديث القائمة
            window.loadUsersView();
            
        } catch (err) {
            console.error(err);
            if (typeof showToast === 'function') showToast('خطأ: ' + err.message, 'error');
            else alert('خطأ أثناء الحفظ');
        } finally {
            btn.innerHTML = origHtml;
            btn.disabled = false;
        }
    };

    // ── الحذف الجذري والأكيد ───────────────────
    window.deleteUser = async function (id, username) {
        if (!navigator.onLine) {
            alert('عذراً، يجب أن تكون متصلاً بالإنترنت لحذف المستخدمين.');
            return;
        }

        if (!confirm(`تحذير: هل أنت متأكد من حذف حساب "${username}" نهائياً؟\nهذا الإجراء لا يمكن التراجع عنه.`)) return;
        
        try {
            if (typeof showToast === 'function') showToast('جاري الحذف...', 'info');

            // تحويل الـ ID لنوع Number إذا كان رقماً
            const parsedId = isNaN(Number(id)) ? id : Number(id);
            
            console.log('[DeleteUser] Attempting to delete ID:', parsedId);
            
            // ✅ الاتصال المباشر بقاعدة البيانات (بمرور dbDelete المحلي) والتأكد عبر select()
            const { data, error } = await window._sb
                .from('clinic_users')
                .delete()
                .eq('id', parsedId)
                .select(); // للتحقق من أنه مسح حاجة فعلاً
            
            if (error) {
                 // التقاط خطأ ارتباط البيانات (Foreign Key Constraint)
                if (error.code === '23503' || (error.message && error.message.toLowerCase().includes('foreign key'))) {
                    console.warn('[DeleteUser] Foreign key constraint. Soft deleting instead...');
                    
                    // إيقاف إجباري للحساب بدلاً من حذفه
                    const { data: updData, error: updErr } = await window._sb
                        .from('clinic_users')
                        .update({ is_active: false })
                        .eq('id', parsedId)
                        .select();
                        
                    if (updErr) throw updErr;
                    if (!updData || updData.length === 0) throw new Error('فشل إيقاف الحساب.');
                    
                    if (typeof showToast === 'function') {
                        showToast('تم إيقاف الحساب بدلاً من حذفه، لوجود عمليات مسجلة باسمه (فواتير/كشوفات)', 'warning');
                    } else {
                        alert('تم إيقاف الحساب لوجود عمليات مسجلة باسمه');
                    }
                } else {
                    throw error; // رمي أي خطأ آخر
                }
            } else if (!data || data.length === 0) {
                // النظام قال أنه نفذ الأمر بس مفيش صفوف اتمسحت! 
                throw new Error('لم يتم الحذف! قد يكون هناك مشكلة في صلاحيات (RLS Policy) في قاعدة البيانات.');
            } else {
                console.log('[DeleteUser] Delete successful', data);
                if (typeof showToast === 'function') showToast('تم حذف الحساب بنجاح', 'success');
            }
            
            // إعادة تحميل القائمة من السيرفر مباشرة لتحديث الواجهة
            window.loadUsersView();
            
        } catch (err) {
            console.error('[DeleteUser] Error:', err);
            if (typeof showToast === 'function') {
                showToast('حدث خطأ أثناء الحذف: ' + err.message, 'error');
            } else {
                alert('خطأ: ' + err.message);
            }
        }
    };

    // ── 4. UI Patches & Integration ──────────────────────────────────
    function patchSwitchView() {
        const _orig = window.switchView;
        if (!_orig || _orig._umPatched) return;
        window.switchView = function (viewName) {
            _orig(viewName);
            
            const usersView = document.getElementById('usersView');
            if (usersView) {
                if (viewName === 'users') {
                    usersView.style.display = 'block';
                    const searchInput = document.getElementById('usersSearchInput');
                    if (searchInput) searchInput.value = '';
                    window.loadUsersView();
                    
                    const lang = localStorage.getItem('clinicLang') || 'ar';
                    document.getElementById('headerTitle').innerText = lang === 'ar' ? 'إدارة المستخدمين' : 'User Management';
                } else {
                    usersView.style.display = 'none';
                }
            }
        };
        window.switchView._umPatched = true;
    }
    
    // دعم تغيير اللغة بشكل فوري
    function patchLanguageToggle() {
        const origSwitchLang = window.switchLang;
        if (typeof origSwitchLang === 'function') {
            window.switchLang = function(lang) {
                origSwitchLang(lang);
                const label = document.getElementById('navUsersLabel');
                if (label) label.textContent = lang === 'ar' ? 'إدارة المستخدمين' : 'User Management';
                
                const title = document.getElementById('headerTitle');
                if (title && document.getElementById('usersView')?.style.display === 'block') {
                    title.textContent = lang === 'ar' ? 'إدارة المستخدمين' : 'User Management';
                }
                
                if (document.getElementById('usersView')?.style.display === 'block') {
                    window.loadUsersView();
                }
            };
        }
    }

    // إخفاء القوائم بناءً على الصلاحيات المحفوظة لليوزر الحالي
    window.applyUserPermissions = async function() {

        function revealNav() {
            const skeleton = document.getElementById('sidebarSkeleton');
            const nav      = document.getElementById('sidebarNav');
            if (!nav) return;
            // أظهر الـ nav واخفي الـ skeleton بـ fade
            nav.style.display = '';
            requestAnimationFrame(() => {
                nav.style.opacity = '1';
                if (skeleton) skeleton.style.opacity = '0';
                setTimeout(() => { if (skeleton) skeleton.style.display = 'none'; }, 250);
            });
        }

        if (isAdmin()) {
            PERMISSIONS_LIST.forEach(p => {
                const el = document.getElementById(p.id);
                if (el) el.style.display = 'flex';
            });
            ['nav-section-main','nav-section-clinical','nav-section-finance','nav-section-system'].forEach(id => {
                const el = document.getElementById(id);
                if (el) el.style.display = '';
            });
            const settingsEl = document.getElementById('nav-settings');
            if (settingsEl) settingsEl.style.display = 'flex';
            window._currentUserPermissions = PERMISSIONS_LIST.map(p => p.id);
            revealNav();
            return;
        }

        try {
            const username = sessionStorage.getItem('clinicUsername');

            if (!username) { revealNav(); return; }

            // أخفي كل القوائم والـ headers (الـ nav نفسه مخفي)
            PERMISSIONS_LIST.forEach(p => {
                const el = document.getElementById(p.id);
                if (el) el.style.display = 'none';
            });
            ['nav-section-main','nav-section-clinical','nav-section-finance','nav-section-system'].forEach(id => {
                const el = document.getElementById(id);
                if (el) el.style.display = 'none';
            });

            const data = await window.dbGetAll('clinic_users');
            const currentUser = data.find(u => u.username === username);

            if (currentUser && currentUser.permissions) {
                let perms = [];
                try { perms = JSON.parse(currentUser.permissions); } catch(e) {}

                window._currentUserPermissions = perms;

                PERMISSIONS_LIST.forEach(p => {
                    const el = document.getElementById(p.id);
                    if (el) el.style.display = perms.includes(p.id) ? 'flex' : 'none';
                });

                const settingsEl = document.getElementById('nav-settings');
                if (settingsEl) settingsEl.style.display = perms.includes('nav-settings') ? 'flex' : 'none';

                const SECTION_MAP = {
                    'nav-section-main':     ['nav-dashboard','nav-patients','nav-appointments','nav-calendar'],
                    'nav-section-clinical': ['nav-prescriptions'],
                    'nav-section-finance':  ['nav-invoices','nav-expenses','nav-reports'],
                    'nav-section-system':   ['nav-inventory','nav-lab','nav-doctors','nav-reminders','nav-settings'],
                };
                Object.entries(SECTION_MAP).forEach(([sectionId, linkIds]) => {
                    const hasVisible = linkIds.some(lid => perms.includes(lid));
                    const el = document.getElementById(sectionId);
                    if (el) el.style.display = hasVisible ? '' : 'none';
                });
            }
        } catch(e) {
            console.error('[Permissions] Error:', e);
        } finally {
            revealNav();
        }
    };

    // ── INIT ──────────────────────────────────────────────────────────
    async function init() {
        let tries = 0;
        while (!window.openModal && tries < 50) {
            await new Promise(r => setTimeout(r, 100));
            tries++;
        }
        injectUI();
        patchSwitchView();
        patchLanguageToggle();
        
        setTimeout(window.applyUserPermissions, 300);
        setTimeout(window.applyUserPermissions, 1500);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();