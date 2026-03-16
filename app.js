// ══════════════════════════════════════════
//  DentalClinic — app.js  (Full Version)
// ══════════════════════════════════════════

// ── 0. LANGUAGE SYSTEM ───────────────────
const TRANSLATIONS = {
    en: {
        // Nav
        'nav.dashboard': 'Dashboard', 'nav.patients': 'Patients', 'nav.appointments': 'Appointments',
        'nav.calendar': 'Calendar', 'nav.prescriptions': 'Prescriptions', 'nav.expenses': 'Expenses',
        'nav.reports': 'Reports', 'nav.settings': 'Settings', 'nav.logout': 'Logout',
        'nav.main': 'MAIN', 'nav.clinical': 'CLINICAL', 'nav.finance': 'FINANCE', 'nav.system': 'SYSTEM',
        // Header
        'header.newPatient': 'New Patient', 'header.book': 'Book', 'header.clinicAdmin': 'Clinic Admin',
        // Dashboard
        'dash.greeting.morning': 'Good morning ☀️', 'dash.greeting.afternoon': 'Good afternoon 🌤️', 'dash.greeting.evening': 'Good evening 🌙',
        'dash.welcome': 'Welcome back 👋', 'dash.totalPatients': 'Total Patients',
        'dash.todayRevenue': "Today's Revenue", 'dash.todayExpenses': "Today's Expenses", 'dash.netTreasury': 'Net (Treasury)',
        'dash.newPatient': 'New Patient', 'dash.bookAppt': 'Book Appointment', 'dash.addTreatment': 'Add Treatment', 'dash.addExpense': 'Add Expense',
        'dash.todayAppts': "Today's Appointments", 'dash.viewAll': 'View All', 'dash.recentPatients': 'Recent Patients', 'dash.all': 'All',
        'dash.noAppts': 'No appointments today', 'dash.noPatients': 'No patients yet',
        'dash.time': 'Time', 'dash.patient': 'Patient', 'dash.doctor': 'Doctor', 'dash.status': 'Status',
        // Patients
        'patients.title': 'Patient Directory', 'patients.search': 'Search patients...', 'patients.newPatient': 'New Patient',
        'patients.num': '#', 'patients.name': 'Patient Name', 'patients.phone': 'Phone', 'patients.age': 'Age',
        'patients.registered': 'Registered', 'patients.balance': 'Balance', 'patients.actions': 'Actions', 'patients.empty': 'No patients found',
        'patients.settled': 'Settled ✓',
        // Profile
        'profile.addTreatment': 'Add Treatment', 'profile.back': 'Back',
        'profile.dentalChart': 'Dental Chart', 'profile.upperJaw': '— Upper Jaw —', 'profile.lowerJaw': '— Lower Jaw —',
        'profile.treated': 'Treated', 'profile.crown': 'Crown', 'profile.missing': 'Missing', 'profile.rootCanal': 'Root Canal',
        'profile.account': 'Account Statement', 'profile.totalDue': 'Total Due', 'profile.totalPaid': 'Total Paid', 'profile.remaining': 'Remaining',
        'profile.notes': 'Patient Notes', 'profile.notesPlaceholder': 'Add clinical notes, allergies, medical history...', 'profile.saveNotes': 'Save Notes',
        'profile.xrays': 'X-Rays & Attachments', 'profile.upload': 'Upload', 'profile.noImages': 'No images attached.',
        'profile.printSheet': 'Print Patient Sheet',
        // Appointments
        'appts.title': 'All Appointments', 'appts.clear': 'Clear', 'appts.new': 'New Appointment',
        'appts.date': 'Date', 'appts.time': 'Time', 'appts.complaint': 'Complaint', 'appts.empty': 'No appointments found',
        'appts.waiting': 'Waiting', 'appts.inside': 'Inside', 'appts.examined': 'Examined', 'appts.cancelled': 'Cancelled',
        // Calendar
        'cal.title': 'Calendar', 'cal.today': 'Today', 'cal.noAppts': 'No appointments this day.',
        'cal.bookDay': 'Book for this day', 'cal.addAppt': 'Add Appointment', 'cal.apptOn': 'Appointments on',
        'cal.sun': 'Sun', 'cal.mon': 'Mon', 'cal.tue': 'Tue', 'cal.wed': 'Wed', 'cal.thu': 'Thu', 'cal.fri': 'Fri', 'cal.sat': 'Sat',
        // Prescriptions
        'rx.title': 'Prescriptions', 'rx.new': 'New Prescription', 'rx.patient': 'Patient', 'rx.meds': 'Medications', 'rx.date': 'Date', 'rx.actions': 'Actions',
        // Expenses
        'exp.title': 'Expenses', 'exp.new': 'New Expense', 'exp.thisMonth': 'This Month', 'exp.allTime': 'All Time', 'exp.totalEntries': 'Total Entries',
        'exp.item': 'Item', 'exp.category': 'Category', 'exp.amount': 'Amount', 'exp.date': 'Date', 'exp.actions': 'Actions',
        // Reports
        'rep.title': 'Reports & Analytics', 'rep.export': 'Export Backup', 'rep.financial': 'Financial Summary',
        'rep.patientStats': 'Patient Statistics', 'rep.debts': 'Outstanding Debts',
        'rep.totalRevenue': 'Total Revenue (billed)', 'rep.collected': 'Total Collected', 'rep.debt': 'Outstanding Debt',
        'rep.totalExp': 'Total Expenses', 'rep.netProfit': 'Net Profit',
        'rep.totalPatients': 'Total Patients', 'rep.totalAppts': 'Total Appointments', 'rep.completed': 'Completed Visits',
        'rep.totalTreat': 'Total Treatments', 'rep.totalRx': 'Total Prescriptions',
        'rep.allSettled': 'All accounts are settled!', 'rep.debtor': 'Patient', 'rep.debtAmt': 'Debt',
        // Settings
        'set.title': 'Settings', 'set.clinicInfo': 'Clinic Information', 'set.clinicName': 'Clinic Name',
        'set.doctorName': 'Doctor Name', 'set.phone': 'Phone', 'set.currency': 'Currency',
        'set.save': 'Save Settings', 'set.dataMgmt': 'Data Management', 'set.exportBackup': 'Export Backup (JSON)',
        'set.importBackup': 'Import Backup', 'set.danger': '⚠️ Danger Zone', 'set.deleteAll': 'Delete All Data',
        // Modals
        'modal.newPatient': 'New Patient', 'modal.fullName': 'Full Name *', 'modal.phone': 'Phone *',
        'modal.age': 'Age', 'modal.gender': 'Gender', 'modal.selectGender': 'Select...', 'modal.male': 'Male', 'modal.female': 'Female',
        'modal.medHistory': 'Medical History / Allergies', 'modal.savePatient': 'Save Patient',
        'modal.bookAppt': 'Book Appointment', 'modal.patient': 'Patient *', 'modal.date': 'Date *', 'modal.time': 'Time *',
        'modal.doctor': 'Doctor *', 'modal.complaint': 'Chief Complaint', 'modal.confirmBooking': 'Confirm Booking',
        'modal.treatment': 'Record Treatment & Payment', 'modal.procedure': 'Procedure *',
        'modal.totalCost': 'Total Cost', 'modal.paidNow': 'Paid Now', 'modal.toothCondition': 'Tooth Condition',
        'modal.notes': 'Notes', 'modal.saveRecord': 'Save & Record',
        'modal.addExpense': 'Add Expense', 'modal.expItem': 'Item *', 'modal.expCategory': 'Category', 'modal.expAmount': 'Amount *', 'modal.saveExpense': 'Save Expense',
        'modal.writePrescription': 'Write Prescription', 'modal.diagnosis': 'Diagnosis', 'modal.medsLabel': 'Medications & Dosages *',
        'modal.instructions': 'Instructions', 'modal.save': 'Save', 'modal.saveAndPrint': 'Save & Print',
        'modal.toothAction': 'Select action:', 'modal.addTreatment': 'Add Treatment', 'modal.markTreated': 'Mark Treated',
        'modal.markCrown': 'Crown', 'modal.markMissing': 'Missing', 'modal.markRoot': 'Root Canal', 'modal.clear': 'Clear', 'modal.cancel': 'Cancel',
        // Tooth conditions
        'tooth.treated': 'Treated (Red)', 'tooth.crown': 'Crown (Yellow)', 'tooth.missing': 'Missing/Extracted (Gray)', 'tooth.root': 'Root Canal (Purple)',
        // Toast
        'toast.patientAdded': 'Patient added successfully', 'toast.apptBooked': 'Appointment booked', 'toast.deleted': 'Deleted',
        'toast.notesSaved': 'Notes saved', 'toast.imageUploaded': 'Image uploaded', 'toast.imageDeleted': 'Image deleted',
        'toast.settingsSaved': 'Settings saved', 'toast.backupExported': 'Backup exported', 'toast.backupImported': 'Backup imported successfully',
        'toast.allDeleted': 'All data deleted', 'toast.treatmentSaved': 'Treatment saved', 'toast.expenseSaved': 'Expense saved', 'toast.rxSaved': 'Prescription saved',
        // Confirm messages
        'confirm.deletePatient': 'Delete this patient and ALL their data? This cannot be undone.',
        'confirm.deleteAppt': 'Delete this appointment?', 'confirm.deleteExpense': 'Delete this expense?',
        'confirm.deleteRx': 'Delete prescription?', 'confirm.deleteAll': '⚠️ Delete ALL data? This is permanent and cannot be undone!',
        'confirm.deleteAll2': 'Are you absolutely sure? Type OK to confirm.',
        'confirm.importBackup': 'This will MERGE the backup data with existing data. Continue?',
        // Access granted
        'login.accessGranted': 'Access granted — loading dashboard...',
        'login.invalidCreds': 'Invalid username or password.',
        'login.fillAll': 'Please fill in all fields.',
        'login.wrongCurrentPw': 'Current password is incorrect.',
        'login.credsUpdated': 'Credentials updated successfully!',
        'login.credsMustMatch': 'Username required & password must be ≥ 4 characters.',
        'nav.invoices': 'Invoices', 'nav.reminders': 'Reminders',
        'toast.invoiceSaved': 'Invoice saved!', 'toast.invoiceDeleted': 'Invoice deleted',
        // Profile extras
        'profile.upperJaw2': 'UPPER JAW', 'profile.lowerJaw2': 'LOWER JAW', 'profile.midline': 'MIDLINE',
        'profile.toothPickerHint': 'Click a tooth to select it. Click again to deselect.',
        // Modal extras
        'modal.toothNumber': 'Tooth Number',
        'modal.pregnant': 'Pregnant', 'modal.breastfeeding': 'Breastfeeding',
        // Medical history checkboxes
        'med.diabetes': 'Diabetes', 'med.hypertension': 'Hypertension', 'med.heartDisease': 'Heart Disease',
        'med.asthma': 'Asthma', 'med.bleedingDisorder': 'Bleeding Disorder', 'med.kidneyDisease': 'Kidney Disease',
        'med.liverDisease': 'Liver Disease', 'med.pregnancy': 'Pregnancy', 'med.penicillinAllergy': 'Penicillin Allergy',
        'med.aspirinAllergy': 'Aspirin Allergy', 'med.bloodThinner': 'Blood Thinner', 'med.osteoporosis': 'Osteoporosis',
    },
    ar: {
        // Nav
        'nav.dashboard': 'الرئيسية', 'nav.patients': 'المرضى', 'nav.appointments': 'المواعيد',
        'nav.calendar': 'التقويم', 'nav.prescriptions': 'الوصفات', 'nav.expenses': 'المصروفات',
        'nav.reports': 'التقارير', 'nav.settings': 'الإعدادات', 'nav.logout': 'تسجيل الخروج',
        'nav.main': 'الرئيسية', 'nav.clinical': 'طبي', 'nav.finance': 'مالي', 'nav.system': 'النظام',
        // Header
        'header.newPatient': 'مريض جديد', 'header.book': 'حجز موعد', 'header.clinicAdmin': 'مدير العيادة',
        // Dashboard
        'dash.greeting.morning': 'صباح الخير ☀️', 'dash.greeting.afternoon': 'مساء الخير 🌤️', 'dash.greeting.evening': 'مساء النور 🌙',
        'dash.welcome': 'أهلاً وسهلاً 👋', 'dash.totalPatients': 'إجمالي المرضى',
        'dash.todayRevenue': 'إيرادات اليوم', 'dash.todayExpenses': 'مصروفات اليوم', 'dash.netTreasury': 'صافي الخزينة',
        'dash.newPatient': 'مريض جديد', 'dash.bookAppt': 'حجز موعد', 'dash.addTreatment': 'إضافة علاج', 'dash.addExpense': 'إضافة مصروف',
        'dash.todayAppts': 'مواعيد اليوم', 'dash.viewAll': 'عرض الكل', 'dash.recentPatients': 'آخر المرضى', 'dash.all': 'الكل',
        'dash.noAppts': 'لا توجد مواعيد اليوم', 'dash.noPatients': 'لا يوجد مرضى بعد',
        'dash.time': 'الوقت', 'dash.patient': 'المريض', 'dash.doctor': 'الطبيب', 'dash.status': 'الحالة',
        // Patients
        'patients.title': 'سجل المرضى', 'patients.search': 'بحث عن مريض...', 'patients.newPatient': 'مريض جديد',
        'patients.num': '#', 'patients.name': 'اسم المريض', 'patients.phone': 'الهاتف', 'patients.age': 'العمر',
        'patients.registered': 'تاريخ التسجيل', 'patients.balance': 'الرصيد', 'patients.actions': 'إجراءات', 'patients.empty': 'لا يوجد مرضى',
        'patients.settled': 'مسدد ✓',
        // Profile
        'profile.addTreatment': 'إضافة علاج', 'profile.back': 'رجوع',
        'profile.dentalChart': 'خريطة الأسنان', 'profile.upperJaw': '— الفك العلوي —', 'profile.lowerJaw': '— الفك السفلي —',
        'profile.treated': 'معالج', 'profile.crown': 'تاج', 'profile.missing': 'مفقود', 'profile.rootCanal': 'عصب',
        'profile.account': 'كشف الحساب', 'profile.totalDue': 'إجمالي التكلفة', 'profile.totalPaid': 'إجمالي المدفوع', 'profile.remaining': 'المتبقي',
        'profile.notes': 'ملاحظات المريض', 'profile.notesPlaceholder': 'ملاحظات سريرية، الحساسية، التاريخ الطبي...', 'profile.saveNotes': 'حفظ الملاحظات',
        'profile.xrays': 'الأشعة والمرفقات', 'profile.upload': 'رفع صورة', 'profile.noImages': 'لا توجد صور مرفقة.',
        'profile.printSheet': 'طباعة ملف المريض',
        // Appointments
        'appts.title': 'جميع المواعيد', 'appts.clear': 'مسح', 'appts.new': 'موعد جديد',
        'appts.date': 'التاريخ', 'appts.time': 'الوقت', 'appts.complaint': 'الشكوى', 'appts.empty': 'لا توجد مواعيد',
        'appts.waiting': 'انتظار', 'appts.inside': 'داخل', 'appts.examined': 'تم الكشف', 'appts.cancelled': 'ملغي',
        // Calendar
        'cal.title': 'التقويم', 'cal.today': 'اليوم', 'cal.noAppts': 'لا توجد مواعيد في هذا اليوم.',
        'cal.bookDay': 'احجز لهذا اليوم', 'cal.addAppt': 'إضافة موعد', 'cal.apptOn': 'مواعيد يوم',
        'cal.sun': 'أحد', 'cal.mon': 'اثنين', 'cal.tue': 'ثلاثاء', 'cal.wed': 'أربعاء', 'cal.thu': 'خميس', 'cal.fri': 'جمعة', 'cal.sat': 'سبت',
        // Prescriptions
        'rx.title': 'الوصفات الطبية', 'rx.new': 'وصفة جديدة', 'rx.patient': 'المريض', 'rx.meds': 'الأدوية', 'rx.date': 'التاريخ', 'rx.actions': 'إجراءات',
        // Expenses
        'exp.title': 'المصروفات', 'exp.new': 'مصروف جديد', 'exp.thisMonth': 'هذا الشهر', 'exp.allTime': 'الإجمالي', 'exp.totalEntries': 'عدد السجلات',
        'exp.item': 'البند', 'exp.category': 'الفئة', 'exp.amount': 'المبلغ', 'exp.date': 'التاريخ', 'exp.actions': 'إجراءات',
        // Reports
        'rep.title': 'التقارير والإحصائيات', 'rep.export': 'تصدير نسخة احتياطية', 'rep.financial': 'الملخص المالي',
        'rep.patientStats': 'إحصائيات المرضى', 'rep.debts': 'الديون المستحقة',
        'rep.totalRevenue': 'إجمالي الإيرادات (المفوترة)', 'rep.collected': 'إجمالي المحصل', 'rep.debt': 'الديون المستحقة',
        'rep.totalExp': 'إجمالي المصروفات', 'rep.netProfit': 'صافي الربح',
        'rep.totalPatients': 'إجمالي المرضى', 'rep.totalAppts': 'إجمالي المواعيد', 'rep.completed': 'الزيارات المكتملة',
        'rep.totalTreat': 'إجمالي العلاجات', 'rep.totalRx': 'إجمالي الوصفات',
        'rep.allSettled': 'جميع الحسابات مسددة!', 'rep.debtor': 'المريض', 'rep.debtAmt': 'المديونية',
        // Settings
        'set.title': 'الإعدادات', 'set.clinicInfo': 'معلومات العيادة', 'set.clinicName': 'اسم العيادة',
        'set.doctorName': 'اسم الطبيب', 'set.phone': 'الهاتف', 'set.currency': 'العملة',
        'set.save': 'حفظ الإعدادات', 'set.dataMgmt': 'إدارة البيانات', 'set.exportBackup': 'تصدير نسخة احتياطية (JSON)',
        'set.importBackup': 'استيراد نسخة احتياطية', 'set.danger': '⚠️ منطقة الخطر', 'set.deleteAll': 'حذف كل البيانات',
        // Modals
        'modal.newPatient': 'مريض جديد', 'modal.fullName': 'الاسم الكامل *', 'modal.phone': 'الهاتف *',
        'modal.age': 'العمر', 'modal.gender': 'الجنس', 'modal.selectGender': 'اختر...', 'modal.male': 'ذكر', 'modal.female': 'أنثى',
        'modal.medHistory': 'التاريخ الطبي / الحساسية', 'modal.savePatient': 'حفظ المريض',
        'modal.bookAppt': 'حجز موعد', 'modal.patient': 'المريض *', 'modal.date': 'التاريخ *', 'modal.time': 'الوقت *',
        'modal.doctor': 'الطبيب *', 'modal.complaint': 'سبب الزيارة', 'modal.confirmBooking': 'تأكيد الحجز',
        'modal.treatment': 'تسجيل علاج ودفع', 'modal.procedure': 'الإجراء *',
        'modal.totalCost': 'التكلفة الإجمالية', 'modal.paidNow': 'المدفوع الآن', 'modal.toothCondition': 'حالة السن',
        'modal.notes': 'ملاحظات', 'modal.saveRecord': 'حفظ وتسجيل',
        'modal.addExpense': 'إضافة مصروف', 'modal.expItem': 'البند *', 'modal.expCategory': 'الفئة', 'modal.expAmount': 'المبلغ *', 'modal.saveExpense': 'حفظ المصروف',
        'modal.writePrescription': 'كتابة وصفة طبية', 'modal.diagnosis': 'التشخيص', 'modal.medsLabel': 'الأدوية والجرعات *',
        'modal.instructions': 'التعليمات', 'modal.save': 'حفظ', 'modal.saveAndPrint': 'حفظ وطباعة',
        'modal.toothAction': 'اختر الإجراء:', 'modal.addTreatment': 'إضافة علاج', 'modal.markTreated': 'تحديد كمعالج',
        'modal.markCrown': 'تاج', 'modal.markMissing': 'مفقود', 'modal.markRoot': 'علاج عصب', 'modal.clear': 'مسح', 'modal.cancel': 'إلغاء',
        // Tooth conditions
        'tooth.treated': 'معالج (أحمر)', 'tooth.crown': 'تاج (أصفر)', 'tooth.missing': 'مفقود/مخلوع (رمادي)', 'tooth.root': 'علاج عصب (بنفسجي)',
        // Toast
        'toast.patientAdded': 'تم إضافة المريض بنجاح', 'toast.apptBooked': 'تم حجز الموعد', 'toast.deleted': 'تم الحذف',
        'toast.notesSaved': 'تم حفظ الملاحظات', 'toast.imageUploaded': 'تم رفع الصورة', 'toast.imageDeleted': 'تم حذف الصورة',
        'toast.settingsSaved': 'تم حفظ الإعدادات', 'toast.backupExported': 'تم تصدير النسخة الاحتياطية', 'toast.backupImported': 'تم استيراد البيانات بنجاح',
        'toast.allDeleted': 'تم حذف جميع البيانات', 'toast.treatmentSaved': 'تم حفظ العلاج', 'toast.expenseSaved': 'تم حفظ المصروف', 'toast.rxSaved': 'تم حفظ الوصفة',
        // Confirm messages
        'confirm.deletePatient': 'هل تريد حذف هذا المريض وجميع بياناته؟ لا يمكن التراجع.',
        'confirm.deleteAppt': 'هل تريد حذف هذا الموعد؟', 'confirm.deleteExpense': 'هل تريد حذف هذا المصروف؟',
        'confirm.deleteRx': 'هل تريد حذف هذه الوصفة؟', 'confirm.deleteAll': '⚠️ هل تريد حذف جميع البيانات؟ هذا الإجراء لا يمكن التراجع عنه!',
        'confirm.deleteAll2': 'هل أنت متأكد تماماً؟',
        'confirm.importBackup': 'سيتم دمج البيانات مع البيانات الحالية. هل تريد الاستمرار؟',
        // Login
        'login.accessGranted': 'تم تسجيل الدخول — جاري التحميل...',
        'login.invalidCreds': 'اسم المستخدم أو كلمة المرور غير صحيحة.',
        // Profile extras
        'profile.upperJaw2': 'الفك العلوي', 'profile.lowerJaw2': 'الفك السفلي', 'profile.midline': 'خط الوسط',
        'profile.toothPickerHint': 'اضغط على السن لتحديده. اضغط مجدداً لإلغاء التحديد.',
        // Modal extras
        'modal.toothNumber': 'رقم السن',
        'modal.pregnant': 'حامل', 'modal.breastfeeding': 'مرضعة',
        // Medical history checkboxes
        'med.diabetes': 'سكري', 'med.hypertension': 'ضغط دم مرتفع', 'med.heartDisease': 'أمراض قلب',
        'med.asthma': 'ربو', 'med.bleedingDisorder': 'اضطراب نزيف', 'med.kidneyDisease': 'أمراض كلى',
        'med.liverDisease': 'أمراض كبد', 'med.pregnancy': 'حمل', 'med.penicillinAllergy': 'حساسية بنسلين',
        'med.aspirinAllergy': 'حساسية أسبرين', 'med.bloodThinner': 'مميعات دم', 'med.osteoporosis': 'هشاشة عظام',
        'login.fillAll': 'يرجى ملء جميع الحقول.',
        'login.wrongCurrentPw': 'كلمة المرور الحالية غير صحيحة.',
        'login.credsUpdated': 'تم تحديث بيانات الدخول بنجاح!',
        'login.credsMustMatch': 'اسم المستخدم مطلوب وكلمة المرور يجب أن تكون 4 أحرف على الأقل.',
        'nav.invoices': 'الفواتير', 'nav.reminders': 'التذكيرات',
        'toast.invoiceSaved': 'تم حفظ الفاتورة!', 'toast.invoiceDeleted': 'تم حذف الفاتورة',
    }
};

let currentLang = localStorage.getItem('clinicLang') || 'en';

function t(key) {
    return TRANSLATIONS[currentLang][key] || TRANSLATIONS['en'][key] || key;
}

function setLanguage(lang) {
    currentLang = lang;
    localStorage.setItem('clinicLang', lang);
    const isAr = lang === 'ar';
    document.documentElement.lang = lang;
    document.documentElement.dir = isAr ? 'rtl' : 'ltr';
    document.body.style.fontFamily = isAr ? "'Cairo', 'DM Sans', sans-serif" : "'DM Sans', 'Cairo', sans-serif";
    refreshAllUI();
}

function refreshAllUI() {
    const isAr = currentLang === 'ar';

    // RTL / LTR layout
    document.documentElement.dir = isAr ? 'rtl' : 'ltr';
    document.documentElement.lang = currentLang;
    document.body.style.fontFamily = isAr
        ? "'Cairo', 'DM Sans', sans-serif"
        : "'DM Sans', 'Cairo', sans-serif";

    // Update all data-t elements
    document.querySelectorAll('[data-t]').forEach(el => {
        const key  = el.getAttribute('data-t');
        const attr = el.getAttribute('data-t-attr');
        const translated = t(key);
        if (attr) {
            el.setAttribute(attr, translated);
        } else {
            el.textContent = translated;
        }
    });

    // Update placeholders
    const placeholders = {
        'patientName':    isAr ? 'اسم المريض'      : 'Patient name',
        'patientPhone':   isAr ? '01xxxxxxxxx'      : '01xxxxxxxxx',
        'patientAge':     isAr ? 'العمر'            : 'Age',
        'treatmentProcedure': isAr ? 'مثال: حشو، عصب، خلع...' : 'e.g. Filling, Root Canal, Extraction...',
        'treatmentNotes': isAr ? 'ملاحظات إضافية...' : 'Additional notes...',
        'patientMedHistory': isAr ? 'أخرى / ملاحظات إضافية...' : 'Other / additional notes...',
        'patientSearch':  isAr ? 'بحث عن مريض...'  : 'Search patients...',
    };
    Object.entries(placeholders).forEach(([id, ph]) => {
        const el = document.getElementById(id);
        if (el) el.placeholder = ph;
    });

    // Select options with data-t-val
    const genderSel = document.getElementById('patientGender');
    if (genderSel) {
        genderSel.options[0].text = t('modal.selectGender');
        genderSel.options[1].text = t('modal.male');
        genderSel.options[2].text = t('modal.female');
    }

    // Update lang toggle button
    const langBtn = document.getElementById('langToggleBtn');
    if (langBtn) langBtn.innerHTML = isAr ? '🌐 EN' : '🌐 عربي';

    // Re-render current active view
    updateDashboard();
}


// ── 1. DATABASE ──────────────────────────
const db = new Dexie("ClinicDB_v2");
// expose globally so offline engine and preload use the same instance
window.db = db;
db.version(1).stores({
    patients:     '++id, name, phone, createdAt',
    appointments: '++id, patientId, patientName, date, time, doctor, status, complaint',
    treatments:   '++id, patientId, patientName, toothNumber, toothCondition, procedure, totalCost, paid, notes, date',
    expenses:     '++id, item, category, amount, date',
    prescriptions:'++id, patientId, patientName, diagnosis, meds, instructions, date',
    xrays:        '++id, patientId, imageBase64, date',
    toothStates:  '++id, patientId, toothNumber, condition',
    patientNotes: '++id, patientId, notes'
});
db.version(2).stores({
    patients:     '++id, name, phone, createdAt',
    appointments: '++id, patientId, patientName, date, time, doctor, status, complaint',
    treatments:   '++id, patientId, patientName, toothNumber, toothCondition, procedure, totalCost, paid, notes, date',
    expenses:     '++id, item, category, amount, date',
    prescriptions:'++id, patientId, patientName, diagnosis, meds, instructions, date',
    xrays:        '++id, patientId, imageBase64, date',
    toothStates:  '++id, patientId, toothNumber, condition',
    patientNotes: '++id, patientId, notes',
    invoices:     '++id, patientId, patientName, date, dueDate, items, total, paid, notes, status'
}).upgrade(tx => {});
db.version(3).stores({
    patients:     '++id, name, phone, createdAt',
    appointments: '++id, patientId, patientName, date, time, doctor, status, complaint',
    treatments:   '++id, patientId, patientName, toothNumber, toothCondition, procedure, totalCost, paid, notes, date',
    expenses:     '++id, item, category, amount, date',
    prescriptions:'++id, patientId, patientName, diagnosis, meds, instructions, date',
    xrays:        '++id, patientId, imageBase64, date',
    toothStates:  '++id, patientId, toothNumber, condition',
    patientNotes: '++id, patientId, notes',
    invoices:     '++id, patientId, patientName, date, dueDate, items, total, paid, notes, status',
    inventory:    '++id, name, category, qty, min_qty, unit, unit_cost, supplier, expiry, last_restock',
    labOrders:    '++id, patientId, patient_name, lab_name, work_type, status, due_date, cost, paid_to_lab, teeth, material, shade, priority, notes, created_at',
    inventoryLog: '++id, item_id, type, qty_change, date'
}).upgrade(tx => {});
db.version(4).stores({
    patients:         '++id, name, phone, createdAt',
    appointments:     '++id, patientId, patientName, date, time, doctor, status, complaint',
    treatments:       '++id, patientId, patientName, toothNumber, toothCondition, procedure, totalCost, paid, notes, date',
    expenses:         '++id, item, category, amount, date',
    prescriptions:    '++id, patientId, patientName, diagnosis, meds, instructions, date',
    xrays:            '++id, patientId, imageBase64, date',
    toothStates:      '++id, patientId, toothNumber, condition',
    patientNotes:     '++id, patientId, notes',
    invoices:         '++id, patientId, patientName, date, dueDate, items, total, paid, notes, status',
    inventory:        '++id, name, category, qty, minQty, unit, unitCost, supplier, expiry, lastRestock',
    labOrders:        '++id, patientId, patientName, labName, workType, status, dueDate, cost, paidToLab, teeth, material, shade, priority, notes, createdAt',
    inventoryLog:     '++id, itemId, type, qtyChange, date',
    pendingOps:       '++id, operation, table, timestamp',
    doctors: '++id, name_ar, name_en, specialty, is_active, commission_pct'
}).upgrade(tx => {});
db.version(5).stores({
    patients:         '++id, name, phone, createdAt',
    appointments:     '++id, patientId, patientName, date, time, doctor, status, complaint',
    treatments:       '++id, patientId, patientName, toothNumber, toothCondition, procedure, totalCost, paid, notes, date',
    expenses:         '++id, item, category, amount, date',
    prescriptions:    '++id, patientId, patientName, diagnosis, meds, instructions, date',
    xrays:            '++id, patientId, imageBase64, date',
    toothStates:      '++id, patientId, toothNumber, condition',
    patientNotes:     '++id, patientId, notes',
    invoices:         '++id, patientId, patientName, date, dueDate, items, total, paid, notes, status',
    inventory:        '++id, name, category, qty, minQty, unit, unitCost, supplier, expiry, lastRestock',
    labOrders:        '++id, patientId, patientName, labName, workType, status, dueDate, cost, paidToLab, teeth, material, shade, priority, notes, createdAt',
    inventoryLog:     '++id, itemId, type, qtyChange, date',
    pendingOps:       '++id, operation, table, timestamp',
    doctors:          '++id, name_ar, name_en, specialty, is_active, commission_pct',
    session_payments: '++id, treatment_id, patient_id, amount, session_num, date, note',
    procedureCatalog: '++id, name, category, isActive'
}).upgrade(tx => {});

// ── 2. STATE ─────────────────────────────
let currentProfilePatientId = null;
let calendarYear = new Date().getFullYear();
let calendarMonth = new Date().getMonth();
let selectedToothNum = null;
let allAppointmentsCache = [];

// ── 3. SETTINGS ──────────────────────────
let _settingsCache = null;

function getSettings() {
    if (_settingsCache) return _settingsCache;
    const s = localStorage.getItem('clinicSettings');
    return s ? JSON.parse(s) : { clinicName: 'DentalClinic', doctorName: 'Dr. Admin', phone: '', currency: 'EGP', address: '', logo: '' };
}
function getCurrency() { return getSettings().currency || 'EGP'; }

async function loadSettingsFromDB() {
    let waited = 0;
while ((!window._sbReady || !(typeof window._sbReady === 'function' ? window._sbReady() : window._sbReady)) && waited < 50) {
        await new Promise(r => setTimeout(r, 100));
        waited++;
    }
    if (!window._sbReady || !window._sbReady()) return;
    try {
        const { data, error } = await window._sb.from('clinic_settings').select('*');
        if (error || !data || !data.length) return;
        const obj = {};
        data.forEach(r => { obj[r.key] = r.value; });
        _settingsCache = {
            clinicName: obj.clinicName || 'DentalClinic',
            doctorName: obj.doctorName || 'Dr. Admin',
            phone:      obj.phone      || '',
            address:    obj.address    || '',
            currency:   obj.currency   || 'EGP',
            logo:       obj.logoUrl    || obj.logo || ''
        };
        localStorage.setItem('clinicSettings', JSON.stringify(_settingsCache));
        // لا نكتب doctorName على headerUsername — اسم اليوزر الحقيقي يجيه من user_header_patch.js
        loadSettingsForm();
        console.log('[Settings] ✓ Loaded from DB');
    } catch(e) { console.warn('[Settings] load failed:', e.message); }
}

// ── 4. TOAST ─────────────────────────────
function showToast(msg, type = 'success') {
    const t = document.getElementById('toast');
    t.innerHTML = `<i class="fa-solid fa-${type === 'success' ? 'circle-check' : 'circle-exclamation'}"></i> ${msg}`;
    t.className = `toast ${type} show`;
    setTimeout(() => t.classList.remove('show'), 3000);
}

// ── 5. NAVIGATION ────────────────────────
const viewIds = ['dashboardView','patientsView','profileView','appointmentsView',
                 'calendarView','prescriptionsView','expensesView','reportsView','invoicesView',
                 'remindersView','inventoryView','labView','settingsView','usersView'];
const navIds  = ['nav-dashboard','nav-patients',null,
                 'nav-appointments','nav-calendar','nav-prescriptions',
                 'nav-expenses','nav-reports','nav-settings'];

// ── ROLE HELPERS ─────────────────────────
function getCurrentRole() { return sessionStorage.getItem('clinicRole') || 'doctor'; }
function isDoctor()       { const r = getCurrentRole(); return r === 'doctor' || r === 'admin'; }

// ── ROLE SYSTEM ──────────────────────────
const DOCTOR_ONLY_VIEWS = ['expenses','reports','settings','invoices'];

window.isDoctor = function(){ const r = getCurrentRole(); return r === 'doctor' || r === 'admin'; }

function applyRoleUI() {
    const role     = getCurrentRole();
    const userName = sessionStorage.getItem('clinicUserName') || (role === 'doctor' ? 'Doctor' : 'Reception');
    const hUser = document.getElementById('headerUsername');
    const hAv   = document.getElementById('headerAvatar');
    const hRole = document.getElementById('headerRoleLabel');
    if (hUser) hUser.innerText = userName;
    if (hAv)   hAv.innerText  = userName.charAt(0).toUpperCase();
    // الـ role label بيعتمد على القيمة الحقيقية من clinic_users
    const ROLE_LABELS = {
        admin:     { ar: 'System Admin', en: 'System Admin'  },
        doctor:    { ar: 'طبيب',         en: 'Doctor'         },
        reception: { ar: 'استقبال',      en: 'Receptionist'  },
    };
    const rl = ROLE_LABELS[role];
    if (hRole && rl) hRole.innerText = currentLang === 'ar' ? rl.ar : rl.en;
    else if (hRole)  hRole.innerText = role;
    if (role !== 'doctor') {
        ['nav-expenses','nav-reports','nav-settings','nav-invoices','nav-doctors'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.style.display = 'none';
        });
        document.querySelectorAll('.nav-section-finance').forEach(el => el.style.display = 'none');
    }
}

function switchView(viewName) {
    if (!isDoctor() && DOCTOR_ONLY_VIEWS.includes(viewName)) {
        showToast('⛔ غير مصرح — Doctor access only', 'error');
        return;
    }

    viewIds.forEach(v => {
        const el = document.getElementById(v);
        if (el) el.classList.remove('active');
    });
    navIds.forEach(n => {
        if (n && document.getElementById(n)) document.getElementById(n).classList.remove('active');
    });

    const map = {
        dashboard:     ['dashboardView',   'nav-dashboard',   'Dashboard',         updateDashboard],
        patients:      ['patientsView',    'nav-patients',    'Patients',          loadAllPatients],
        profile:       ['profileView',     null,              'Patient Profile',   null],
        appointments:  ['appointmentsView','nav-appointments','Appointments',      loadAppointments],
        calendar:      ['calendarView',    'nav-calendar',    'Calendar',          renderCalendar],
        prescriptions: ['prescriptionsView','nav-prescriptions','Prescriptions',   loadPrescriptions],
        expenses:      ['expensesView',    'nav-expenses',    'Expenses',          loadExpenses],
        reports:       ['reportsView',     'nav-reports',     'Reports',           loadReports],
        invoices:      ['invoicesView',    'nav-invoices',    'Invoices',          loadInvoices],
        reminders:     ['remindersView',   'nav-reminders',   'Reminders',         checkReminders],
        inventory:     ['inventoryView',   'nav-inventory',   'Inventory 📦',      loadInventory],
        lab:           ['labView',         'nav-lab',         'Lab Orders 🔬',     loadLabOrders],
        settings:      ['settingsView',    'nav-settings',    'Settings',          loadSettingsForm],
        users:         ['usersView',       'nav-users',       'User Management',   function(){ if(typeof window.loadUsersView==='function') window.loadUsersView(); }],
    };

    const entry = map[viewName];
    if (!entry) return;
    const [viewId, navId, title, fn] = entry;

    document.getElementById(viewId)?.classList.add('active');
    if (navId) document.getElementById(navId)?.classList.add('active');
    document.getElementById('headerTitle').innerText = title;
    if (fn) fn();
}

function toggleSidebar() {
    document.getElementById('sidebar').classList.toggle('hidden');
}

// ── 6. MODALS ────────────────────────────
function openModal(modalId, toothNum = null) {
    if (modalId === 'createInvoiceModal') {
        loadPatientsDropdown().then(() => {
            const sel = document.getElementById('invoicePatientId');
            if (sel && sel.innerHTML === '') {
                dbGetAll('patients').then(patients => {
                    sel.innerHTML = patients.map(p=>`<option value="${p.id}">${p.name}</option>`).join('');
                });
            }
        });
        document.getElementById('invoiceDate').value = today();
        document.getElementById('invoiceItemsContainer').innerHTML = '';
        document.getElementById('invoicePaid').value = '';
        document.getElementById('invoiceNotes').value = '';
        document.getElementById('invoiceTotalDisplay').textContent = '0 ' + getCurrency();
        document.getElementById('invoiceSubtotalDisplay').textContent = '0 ' + getCurrency();
        const discEl = document.getElementById('invoiceDiscount');
        if (discEl) discEl.value = '';
        const suppEl = document.getElementById('invoiceSupplierName');
        if (suppEl) suppEl.value = '';
        // reset to patient type
        if (typeof window.setInvoiceType === 'function') window.setInvoiceType('patient');
        addInvoiceItem();
    }
    const el = document.getElementById(modalId);
    if (!el) return;
    el.classList.add('open');

    if (['addAppointmentModal','addTreatmentModal','addPrescriptionModal'].includes(modalId)) {
        // clear search fields and hidden ids when showing specific modals
        if (modalId === 'addAppointmentModal') {
            const s = document.getElementById('appointmentPatientSearch');
            if (s) s.value = '';
            const hid = document.getElementById('appointmentPatientId');
            if (hid) hid.value = '';
        }
        if (modalId === 'addTreatmentModal') {
            const s2 = document.getElementById('treatmentPatientSearch');
            if (s2) s2.value = '';
            const hid2 = document.getElementById('treatmentPatientId');
            if (hid2) hid2.value = '';
        }
        loadPatientsDropdown();
    }

    if (modalId === 'addTreatmentModal') {
        if (toothNum) {
            document.getElementById('treatmentModalTitle').innerText = `Treatment — Tooth #${toothNum}`;
            document.getElementById('treatmentToothNumber').value = toothNum;
            document.getElementById('treatmentPatientContainer').style.display = 'none';
        } else {
            document.getElementById('treatmentModalTitle').innerText = 'Record Treatment & Payment';
            document.getElementById('treatmentToothNumber').value = '';
            document.getElementById('treatmentPatientContainer').style.display = 'block';
        }
    }
}

function closeModal(modalId) {
    document.getElementById(modalId)?.classList.remove('open');
}

// Close modal on overlay click
document.querySelectorAll('.modal-base').forEach(modal => {
    modal.addEventListener('click', e => {
        if (e.target === modal) closeModal(modal.id);
    });
});

async function loadPatientsDropdown(filter = '', targetIds) {
    // default selectors (excluding appointment/treatment since those use custom UI)
    const ids = Array.isArray(targetIds) && targetIds.length > 0
        ? targetIds
        : ['prescriptionPatientId','invoicePatientId'];

    // fetch/cache patients
    let patients = window.allPatientsData && window.allPatientsData.length ? window.allPatientsData : await dbGetAll('patients');
    window.cachedPatients = patients;

    // apply filter if provided (mainly for selects)
    if (filter && filter.trim()) {
        const q = filter.trim().toLowerCase();
        patients = patients.filter(p =>
            p.name.toLowerCase().includes(q) || (p.phone || '').includes(q)
        );
    }

    patients.sort((a,b) => a.name.localeCompare(b.name));
    let html;
    if (patients.length === 0) {
        html = filter && filter.trim()
            ? '<option value="">No matching patients</option>'
            : '<option value="">Select Patient...</option>';
    } else {
        html = '<option value="">Select Patient...</option>';
        patients.forEach(p => { html += `<option value="${p.id}">${p.name}</option>`; });
    }

    ids.forEach(id => {
        const el = document.getElementById(id);
        if (el && el.tagName === 'SELECT') el.innerHTML = html;
    });
}

// autocomplete helpers for appointment/treatment
window.filterAppointmentPatients = async function() {
    const searchEl = document.getElementById('appointmentPatientSearch');
    const q = searchEl?.value || '';
    // clear previous id until a result is chosen
    const hid = document.getElementById('appointmentPatientId');
    if (hid) hid.value = '';
    const resultsEl = document.getElementById('appointmentPatientResults');
    resultsEl.innerHTML = '';

    // ensure patient cache is loaded before filtering
    if (!window.cachedPatients || !window.cachedPatients.length) {
        await loadPatientsDropdown();
    }
    if (!window.cachedPatients) return;

    const matches = window.cachedPatients.filter(p =>
        p.name.toLowerCase().includes(q.toLowerCase()) || (p.phone || '').includes(q)
    );
    if (matches.length === 0) {
        resultsEl.innerHTML = '<div class="item text-gray-400">No matching patients</div>';
        return;
    }
    matches.forEach(p => {
        const div = document.createElement('div');
        div.className = 'item';
        div.textContent = p.name + (p.phone ? ` (${p.phone})` : '');
        div.dataset.id = p.id;
        div.addEventListener('click', () => {
            searchEl.value = p.name;
            hid.value = p.id;
            resultsEl.innerHTML = '';
        });
        resultsEl.appendChild(div);
    });
};

window.filterTreatmentPatients = async function() {
    const searchEl = document.getElementById('treatmentPatientSearch');
    const q = searchEl?.value || '';
    const hid = document.getElementById('treatmentPatientId');
    if (hid) hid.value = '';
    const resultsEl = document.getElementById('treatmentPatientResults');
    resultsEl.innerHTML = '';

    if (!window.cachedPatients || !window.cachedPatients.length) {
        await loadPatientsDropdown();
    }
    if (!window.cachedPatients) return;

    const matches = window.cachedPatients.filter(p =>
        p.name.toLowerCase().includes(q.toLowerCase()) || (p.phone || '').includes(q)
    );
    if (matches.length === 0) {
        resultsEl.innerHTML = '<div class="item text-gray-400">No matching patients</div>';
        return;
    }
    matches.forEach(p => {
        const div = document.createElement('div');
        div.className = 'item';
        div.textContent = p.name + (p.phone ? ` (${p.phone})` : '');
        div.dataset.id = p.id;
        div.addEventListener('click', () => {
            searchEl.value = p.name;
            hid.value = p.id;
            resultsEl.innerHTML = '';
        });
        resultsEl.appendChild(div);
    });
};

// hide result lists when clicking outside
document.addEventListener('click', e => {
    if (!e.target.closest('#addAppointmentModal')) {
        const res = document.getElementById('appointmentPatientResults');
        if (res) res.innerHTML = '';
    }
    if (!e.target.closest('#addTreatmentModal')) {
        const res2 = document.getElementById('treatmentPatientResults');
        if (res2) res2.innerHTML = '';
    }
});


// ── 7. FORMS ─────────────────────────────

// ══════════════════════════════════════════
// FIX: New Patient — يحفظ is_pregnant و is_breastfeeding كـ boolean
//      ويجمع الـ checkboxes في medical_history
// ══════════════════════════════════════════
document.getElementById('newPatientForm').addEventListener('submit', async e => {
    e.preventDefault();

    // جيب الـ checkboxes الطبية المحددة
    const checkedConditions = [];
    document.querySelectorAll('.med-hist-cb:checked').forEach(cb => {
        checkedConditions.push(cb.value);
    });
    const extraNotes = document.getElementById('patientMedHistory').value.trim();
    const fullMedHistory = [
        ...checkedConditions,
        ...(extraNotes ? [extraNotes] : [])
    ].join(', ') || null;

    // Pregnant / Breastfeeding كـ boolean columns منفصلة
    const isPregnant      = document.getElementById('patientPregnant')?.checked || false;
    const isBreastfeeding = document.getElementById('patientBreastfeeding')?.checked || false;

    await dbInsert('patients', {
        name:             document.getElementById('patientName').value.trim(),
        phone:            document.getElementById('patientPhone').value.trim(),
        age:              parseInt(document.getElementById('patientAge').value) || null,
        gender:           document.getElementById('patientGender').value || null,
        medical_history:  fullMedHistory,
        is_pregnant:      isPregnant,
        is_breastfeeding: isBreastfeeding,
        created_at:       today()
    });

    e.target.reset();

    // Reset female fields visibility
    const femaleFields = document.getElementById('femaleOnlyFields');
    if (femaleFields) {
        femaleFields.classList.add('hidden');
        femaleFields.classList.remove('grid');
    }

    closeModal('addPatientModal');
    updateDashboard();
    loadAllPatients();
    showToast(t('toast.patientAdded'));
});

// New Appointment
document.getElementById('newAppointmentForm').addEventListener('submit', async e => {
    e.preventDefault();
    const sel = document.getElementById('appointmentPatientId');
    let patientName = '';
    if (sel && sel.value) {
        const pid = parseInt(sel.value);
        const p = (window.cachedPatients || []).find(x => x.id === pid);
        patientName = p ? p.name : '';
    }
    await dbInsert('appointments', {
        patient_id:   parseInt(sel.value),
        patient_name: patientName,
        date:         document.getElementById('appointmentDate').value,
        time:         document.getElementById('appointmentTime').value,
        doctor:       document.getElementById('appointmentDoctor').value.trim(),
        complaint:    document.getElementById('appointmentComplaint').value.trim(),
        status:       'Waiting'
    });
    e.target.reset();
    document.getElementById('appointmentDate').value = today();
    closeModal('addAppointmentModal');
    updateDashboard();
    loadAppointments();
    showToast(t('toast.apptBooked'));
});

// New Treatment
document.getElementById('newTreatmentForm').addEventListener('submit', async e => {
    e.preventDefault();
    const toothNumber = document.getElementById('treatmentToothNumber').value;
    let patientId, patientName;

    if (toothNumber && currentProfilePatientId) {
        patientId   = currentProfilePatientId;
        patientName = document.getElementById('profileName').innerText;
    } else {
        const sel   = document.getElementById('treatmentPatientId');
        patientId   = parseInt(sel.value);
        if (sel && sel.value) {
            const p = (window.cachedPatients || []).find(x => x.id === patientId);
            patientName = p ? p.name : '';
        }
    }

    const cost = parseFloat(document.getElementById('treatmentTotalCost').value) || 0;
    const paid = parseFloat(document.getElementById('treatmentPaid').value) || 0;
    let cond = document.getElementById('treatmentToothCondition').value;
    // normalize legacy/alias values
    if (cond === 'crown') cond = 'crown_work';
    if (cond === 'root')  cond = 'root_canal';

    await dbInsert('treatments', {
        patient_id:      patientId,
        patient_name:    patientName,
        tooth_number:    toothNumber || null,
        tooth_condition: cond || null,
        procedure:       document.getElementById('treatmentProcedure').value.trim(),
        total_cost:      cost,
        paid:            paid,
        notes:           document.getElementById('treatmentNotes').value.trim() || null,
        date:            today()
    });

    // Save tooth state
    if (toothNumber && cond) {
        await dbUpsert('tooth_states', {
            patient_id:   patientId,
            tooth_number: toothNumber,
            condition:    cond
        }, 'patient_id,tooth_number');
    }

    e.target.reset();
    closeModal('addTreatmentModal');
    updateDashboard();
    showToast('Treatment recorded');

    if (!document.getElementById('profileView').classList.contains('active')) return;
    openPatientProfile(patientId);
});

// New Expense
document.getElementById('newExpenseForm').addEventListener('submit', async e => {
    e.preventDefault();
    await dbInsert('expenses', {
        item:     document.getElementById('expenseItem').value.trim(),
        category: document.getElementById('expenseCategory').value,
        amount:   parseFloat(document.getElementById('expenseAmount').value) || 0,
        date:     today()
    });
    e.target.reset();
    closeModal('addExpenseModal');
    updateDashboard();
    loadExpenses();
    showToast('Expense added');
});

// New Prescription
document.getElementById('newPrescriptionForm').addEventListener('submit', async e => {
    e.preventDefault();
    const sel = document.getElementById('prescriptionPatientId');
    await dbInsert('prescriptions', {
        patient_id:   parseInt(sel.value),
        patient_name: sel.options[sel.selectedIndex].text,
        diagnosis:    document.getElementById('prescriptionDiagnosis').value.trim() || null,
        meds:         document.getElementById('prescriptionMeds').value.trim(),
        instructions: document.getElementById('prescriptionInstructions').value.trim() || null,
        date:         today()
    });
    e.target.reset();
    closeModal('addPrescriptionModal');
    loadPrescriptions();
    showToast('Prescription saved');
});

// ── 8. PATIENT PROFILE ───────────────────
window.openPatientProfile = async function(id) {
    currentProfilePatientId = id;
    let patient;
if (window._sbReady && (typeof window._sbReady === 'function' ? window._sbReady() : window._sbReady)) {
        const rows = await dbGetAll('patients', { id });
        patient = rows[0];
    } else {
        patient = await db.patients.get(id);
    }
    if (!patient) return;

    const pName           = patient.name;
    const pPhone          = patient.phone || '';
    const pGender         = patient.gender || '';
    const pAge            = patient.age || patient.age;
    const pMedHistory     = patient.medical_history || patient.medHistory || '';
    const pIsPregnant     = patient.is_pregnant || false;
    const pIsBreastfeeding= patient.is_breastfeeding || false;
    const pCreatedAt      = patient.created_at || patient.createdAt || '';

    document.getElementById('profileName').innerText  = pName;
    document.getElementById('profilePhone').innerText = [pPhone, pGender, pAge ? `Age: ${pAge}` : ''].filter(Boolean).join(' · ');
    document.getElementById('profileAvatar').innerText = pName.charAt(0).toUpperCase();

    const treatments = await dbGetAll('treatments', { patient_id: id });
    let totalC = 0, totalP = 0;
    treatments.forEach(tr => { totalC += parseFloat(tr.total_cost || tr.totalCost)||0; totalP += parseFloat(tr.paid)||0; });
    const debt = totalC - totalP;

    document.getElementById('profileInfoCards').innerHTML = `
        <div class="stat-card"><div><p class="text-xs text-gray-400">Registered</p><p class="font-bold text-sm">${pCreatedAt}</p></div></div>
        <div class="stat-card"><div><p class="text-xs text-gray-400">Treatments</p><p class="font-bold text-sm">${treatments.length}</p></div></div>
        <div class="stat-card"><div><p class="text-xs text-gray-400">Total Paid</p><p class="font-bold text-sm text-green-600">${totalP} ${getCurrency()}</p></div></div>
        <div class="stat-card border-l-4 ${debt > 0 ? 'border-l-red-400' : 'border-l-green-400'}"><div><p class="text-xs text-gray-400">Balance</p><p class="font-bold text-sm ${debt > 0 ? 'text-red-500' : 'text-green-600'}">${debt > 0 ? debt + ' ' + getCurrency() : 'Settled ✓'}</p></div></div>
    `;

    // ══════════════════════════════════════════
    // FIX: عرض التحذير يشمل is_pregnant و is_breastfeeding
    // ══════════════════════════════════════════
    const warningParts = [];
    if (pIsPregnant)      warningParts.push('🤰 ' + t('modal.pregnant'));
    if (pIsBreastfeeding) warningParts.push('🤱 ' + t('modal.breastfeeding'));
    if (pMedHistory)      warningParts.push(pMedHistory);

    if (warningParts.length > 0) {
        document.getElementById('profileInfoCards').innerHTML += `
            <div class="col-span-2 md:col-span-4 bg-yellow-50 border border-yellow-200 rounded-xl px-4 py-2 text-xs text-yellow-800">
                <i class="fa-solid fa-triangle-exclamation mr-1"></i><strong>Medical History:</strong> ${warningParts.join(' · ')}
            </div>`;
    }

    switchView('profile');
    generateDentalChart(id);
    loadPatientHistory(id);
    loadPatientXrays(id);
    loadPatientNotes(id);
};

// ── 9. DENTAL CHART ──────────────────────
// Handled by dental-chart.js

// ── 10. PATIENT HISTORY ──────────────────
async function loadPatientHistory(patientId) {
    // also refresh dental chart any time history is reloaded
    if (typeof window.generateDentalChart === 'function') {
        try {
            const yearFilter = yearSelect ? yearSelect.value : '';
            if (yearFilter) {
                // build override map using treatments of that year only
                const yearStates = {};
                display.forEach(tr => {
                    const tnum = tr.tooth_number || tr.toothNumber;
                    const tcond = tr.tooth_condition || tr.toothCondition;
                    if (tnum && tcond) {
                        let cond = tcond;
                        if (cond === 'crown') cond = 'crown_work';
                        if (cond === 'root') cond = 'root_canal';
                        yearStates[tnum] = cond;
                    }
                });
                window.generateDentalChart(patientId, yearStates);
            } else {
                window.generateDentalChart(patientId);
            }
        } catch(e) { console.warn('[loadPatientHistory] chart refresh failed', e); }
    }
    const treatments = await dbGetAll('treatments', { patient_id: patientId });

    // populate year filter dropdown using all available treatment years
    const yearSelect = document.getElementById('patientHistoryYear');
    if (yearSelect) {
        const prevYear = yearSelect.value;
        const years = [...new Set(treatments.map(t => (t.date||'').slice(0,4)).filter(y => y))];
        years.sort((a,b) => b - a); // descending order
        let options = '<option value="">All</option>' + years.map(y => `<option value="${y}">${y}</option>`).join('');
        yearSelect.innerHTML = options;
        if (prevYear && years.includes(prevYear)) {
            yearSelect.value = prevYear;
        }
    }

    // apply year filter if selected
    let display = treatments;
    const yearFilter = yearSelect ? yearSelect.value : '';
    if (yearFilter) {
        display = treatments.filter(tr => (tr.date||'').startsWith(yearFilter));
    }

    let totalC = 0, totalP = 0;
    display.forEach(tr => {
        totalC += parseFloat(tr.total_cost || tr.totalCost)||0;
        totalP += parseFloat(tr.paid)||0;
    });

    const curr = getCurrency();
    document.getElementById('profileTotalCost').innerText = `${totalC} ${curr}`;
    document.getElementById('profileTotalPaid').innerText = `${totalP} ${curr}`;
    document.getElementById('profileTotalDebt').innerText = `${totalC - totalP} ${curr}`;

    const list = document.getElementById('patientTreatmentsList');
    if (display.length === 0) {
        list.innerHTML = '<p class="text-gray-400 text-center text-sm mt-5">No treatments recorded.</p>';
        return;
    }
    list.innerHTML = display.map(tr => `
        <div class="border-b border-gray-50 py-2.5 flex justify-between items-start gap-2">
            <div class="flex-1 min-w-0">
                <p class="font-semibold text-sm text-gray-800 truncate">${tr.procedure}${(tr.tooth_number||tr.toothNumber) ? ` <span class="text-blue-500 text-xs font-normal">#${tr.tooth_number||tr.toothNumber}</span>` : ''}</p>
                <p class="text-xs text-gray-400">${tr.date}${tr.notes ? ' · ' + tr.notes : ''}</p>
            </div>
            <div class="text-right shrink-0">
                <span class="block text-xs font-bold text-gray-700">${tr.total_cost||tr.totalCost||0} ${curr}</span>
                <span class="block text-xs text-green-600">${tr.paid||0} paid</span>
            </div>
            <button onclick="deleteTreatment(${tr.id}, ${patientId})" class="text-gray-200 hover:text-red-400 text-xs ml-1 mt-1"><i class="fa-solid fa-trash"></i></button>
        </div>
    `).join('');
}

window.deleteTreatment = async function(id, patientId) {
    if (!confirm('Delete this treatment record?')) return;
    await dbDelete('treatments', id);
    loadPatientHistory(patientId);
    updateDashboard();
    showToast(t('toast.deleted'), 'error');
};

// ── 11. PATIENT NOTES ────────────────────
async function loadPatientNotes(patientId) {
    const rows = await dbGetAll('patient_notes', { patient_id: patientId });
    const rec = rows[0];
    document.getElementById('patientNotes').value = rec ? rec.notes : '';
}

window.savePatientNotes = async function() {
    const notes = document.getElementById('patientNotes').value;
    const rows = await dbGetAll('patient_notes', { patient_id: currentProfilePatientId });
    const existing = rows[0];
    if (existing) {
        await dbUpdate('patient_notes', existing.id, { notes });
    } else {
        await dbInsert('patient_notes', { patient_id: currentProfilePatientId, notes });
    }
    showToast(t('toast.notesSaved'));
};

// ── 12. X-RAYS ───────────────────────────
window.uploadPatientXray = function(event) {
    const file = event.target.files[0];
    if (!file || !currentProfilePatientId) return;
    const reader = new FileReader();
    reader.onload = async function(e) {
        await dbInsert('xrays', { patient_id: currentProfilePatientId, image_base64: e.target.result, date: today() });
        loadPatientXrays(currentProfilePatientId);
        showToast(t('toast.imageUploaded'));
    };
    reader.readAsDataURL(file);
    event.target.value = '';
};

async function loadPatientXrays(patientId) {
    const xrays = await dbGetAll('xrays', { patient_id: patientId });
    const grid = document.getElementById('patientXraysGrid');
    if (xrays.length === 0) {
        grid.innerHTML = `<p class="text-gray-400 text-sm col-span-full">${t('profile.noImages')}</p>`;
        return;
    }
    grid.innerHTML = xrays.map(x => `
        <div class="relative group cursor-pointer border border-gray-100 rounded-xl overflow-hidden h-24 bg-gray-50">
            <img src="${x.image_base64||x.imageBase64}" class="w-full h-full object-cover group-hover:scale-105 transition duration-300" onclick="viewImage('${x.image_base64||x.imageBase64}')">
            <div class="absolute bottom-0 bg-black bg-opacity-50 w-full text-white text-[10px] text-center py-0.5">${x.date}</div>
            <button onclick="deleteXray(${x.id}, ${patientId})" class="absolute top-1 right-1 w-5 h-5 bg-red-500 text-white rounded-full text-[9px] items-center justify-center hidden group-hover:flex"><i class="fa-solid fa-xmark"></i></button>
        </div>
    `).join('');
}

window.deleteXray = async function(id, patientId) {
    await dbDelete('xrays', id);
    loadPatientXrays(patientId);
    showToast(t('toast.imageDeleted'), 'error');
};

window.viewImage = function(src) {
    document.getElementById('enlargedXray').src = src;
    openModal('viewImageModal');
};

// ── 13. PATIENTS TABLE ───────────────────
let allPatientsData = [];

async function loadAllPatients() {
    allPatientsData = await dbGetAll('patients');
    const allTreatments = await dbGetAll('treatments');
    renderPatientsTable(allPatientsData, allTreatments);
}

function renderPatientsTable(patients, allTreatments) {
    const tbody = document.getElementById('allPatientsTableBody');
    const curr  = getCurrency();

    if (patients.length === 0) {
        tbody.innerHTML = '';
        document.getElementById('patientsEmptyState').classList.remove('hidden');
        return;
    }
    document.getElementById('patientsEmptyState').classList.add('hidden');

    tbody.innerHTML = [...patients].reverse().map((p, i) => {
        let pCost = 0, pPaid = 0;
        allTreatments.filter(tr => (tr.patient_id||tr.patientId) === p.id).forEach(tr => {
            pCost += parseFloat(tr.total_cost||tr.totalCost)||0;
            pPaid += parseFloat(tr.paid)||0;
        });
        const debt = pCost - pPaid;
        const debtHtml = debt > 0
            ? `<span class="badge" style="background:#fef2f2;color:#ef4444;">${debt} ${curr}</span>`
            : `<span class="badge" style="background:#f0fdf4;color:#16a34a;">${t('patients.settled')}</span>`;

        // ══════════════════════════════════════════
        // FIX: عرض is_pregnant و is_breastfeeding في جدول المرضى
        // ══════════════════════════════════════════
        const medParts = [];
        if (p.is_pregnant)      medParts.push('🤰 ' + t('modal.pregnant'));
        if (p.is_breastfeeding) medParts.push('🤱 ' + t('modal.breastfeeding'));
        if (p.medical_history || p.medHistory) medParts.push(p.medical_history || p.medHistory);
        const medWarningHtml = medParts.length > 0
            ? `<p class="text-[10px] text-yellow-600"><i class="fa-solid fa-triangle-exclamation"></i> ${medParts.join(' · ')}</p>`
            : '';

        return `
        <tr class="border-b border-gray-50 hover:bg-blue-50 transition cursor-pointer" onclick="openPatientProfile(${p.id})">
            <td class="p-3 text-gray-400 text-sm font-medium">${i+1}</td>
            <td class="p-3">
                <div class="flex items-center gap-2">
                    <div class="w-7 h-7 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-bold">${p.name.charAt(0)}</div>
                    <div>
                        <p class="font-semibold text-sm text-gray-800">${p.name}</p>
                        ${medWarningHtml}
                    </div>
                </div>
            </td>
            <td class="p-3 text-sm text-gray-600">${p.phone}</td>
            <td class="p-3 text-sm text-gray-500">${p.age || '—'}</td>
            <td class="p-3 text-sm text-gray-400">${p.created_at||p.createdAt}</td>
            <td class="p-3 text-center">${debtHtml}</td>
            <td class="p-3 text-center" onclick="event.stopPropagation()">
                <div class="flex gap-1 justify-center">
                    <button onclick="openPatientProfile(${p.id})" class="btn btn-outline text-xs px-2 py-1"><i class="fa-solid fa-folder-open"></i></button>
                    <button onclick="deletePatient(${p.id})" class="btn text-xs px-2 py-1" style="background:#fef2f2;color:#ef4444;border:1px solid #fecaca;"><i class="fa-solid fa-trash"></i></button>
                </div>
            </td>
        </tr>`;
    }).join('');
}

window.filterPatients = async function() {
    const q = document.getElementById('patientSearch').value.toLowerCase();
    const allTreatments = await dbGetAll('treatments');
    const filtered = allPatientsData.filter(p =>
        p.name.toLowerCase().includes(q) || (p.phone||'').includes(q)
    );
    renderPatientsTable(filtered, allTreatments);
};

window.deletePatient = async function(id) {
    if (!confirm(t('confirm.deletePatient'))) return;
    await dbDelete('patients', id);
    loadAllPatients();
    updateDashboard();
    showToast(t('toast.deleted'), 'error');
};

// ── 14. APPOINTMENTS ─────────────────────
async function loadAppointments() {
    const filterDate = document.getElementById('apptFilterDate')?.value || '';
    let appts = await dbGetAll('appointments');
    if (filterDate) appts = appts.filter(a => a.date === filterDate);
    appts.sort((a,b) => (a.date + a.time).localeCompare(b.date + b.time));
    allAppointmentsCache = appts;

    const tbody = document.getElementById('appointmentsTableBody');
    const empty = document.getElementById('apptEmptyState');

    if (appts.length === 0) {
        tbody.innerHTML = '';
        empty.classList.remove('hidden');
        return;
    }
    empty.classList.add('hidden');

    tbody.innerHTML = appts.map(a => {
        const statusColors = {
            Waiting:   'badge-waiting',
            Inside:    'badge-inside',
            Examined:  'badge-examined',
            Cancelled: 'badge-cancelled'
        };
        const sc = statusColors[a.status] || 'badge-waiting';
        return `
        <tr class="border-b border-gray-50 hover:bg-gray-50 transition text-sm">
            <td class="p-3 text-gray-600">${a.date}</td>
            <td class="p-3 font-bold text-blue-600">${a.time}</td>
            <td class="p-3">
                <p class="font-semibold text-gray-800 cursor-pointer hover:text-blue-600" onclick="openPatientProfile(${a.patient_id||a.patientId})">${a.patient_name||a.patientName}</p>
                ${a.complaint ? `<p class="text-xs text-gray-400">${a.complaint}</p>` : ''}
            </td>
            <td class="p-3 text-gray-600">${a.doctor}</td>
            <td class="p-3 text-center">
                <select onchange="updateAppointmentStatus(${a.id}, this.value)" class="badge ${sc} cursor-pointer border-0 bg-transparent font-semibold text-xs outline-none">
                    <option value="Waiting" ${a.status==='Waiting'?'selected':''}>${t('appts.waiting')}</option>
                    <option value="Inside" ${a.status==='Inside'?'selected':''}>${t('appts.inside')}</option>
                    <option value="Examined" ${a.status==='Examined'?'selected':''}>${t('appts.examined')}</option>
                    <option value="Cancelled" ${a.status==='Cancelled'?'selected':''}>${t('appts.cancelled')}</option>
                </select>
            </td>
            <td class="p-3 text-center">
                <button onclick="deleteAppointment(${a.id})" class="btn text-xs px-2 py-1" style="background:#fef2f2;color:#ef4444;border:1px solid #fecaca;"><i class="fa-solid fa-trash"></i></button>
            </td>
        </tr>`;
    }).join('');
}

window.updateAppointmentStatus = async function(id, newStatus) {
    await dbUpdate('appointments', id, { status: newStatus });
    updateDashboard();
    loadAppointments();
};

window.deleteAppointment = async function(id) {
    if (!confirm(t('confirm.deleteAppt'))) return;
    await dbDelete('appointments', id);
    loadAppointments();
    updateDashboard();
    showToast('Appointment deleted', 'error');
};

// ── 15. CALENDAR ─────────────────────────
async function renderCalendar() {
    const appts = await dbGetAll('appointments');
    const apptMap = {};
    appts.forEach(a => {
        if (!apptMap[a.date]) apptMap[a.date] = [];
        apptMap[a.date].push(a);
    });

    const year  = calendarYear;
    const month = calendarMonth;
    const label = new Date(year, month, 1).toLocaleString(currentLang === 'ar' ? 'ar-EG' : 'en-US', { month: 'long', year: 'numeric' });
    document.getElementById('calMonthLabel').innerText = label;

    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const todayStr = today();

    let html = '';
    for (let i = 0; i < firstDay; i++) html += `<div class="cal-day opacity-0 pointer-events-none"></div>`;

    for (let d = 1; d <= daysInMonth; d++) {
        const dateStr = `${year}-${String(month+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
        const dayAppts = apptMap[dateStr] || [];
        const isToday = dateStr === todayStr;
        const hasAppt = dayAppts.length > 0;
        html += `
            <div class="cal-day ${isToday ? 'today' : ''} ${hasAppt ? 'has-appt' : ''} cursor-pointer" onclick="showCalDay('${dateStr}')">
                <div class="cal-day-num ${isToday ? 'text-blue-600' : ''}">${d}</div>
                ${dayAppts.slice(0,2).map(a => `<div class="cal-dot">${a.time} ${(a.patient_name||a.patientName||'').split(' ')[0]}</div>`).join('')}
                ${dayAppts.length > 2 ? `<div class="text-[9px] text-gray-400 mt-0.5">+${dayAppts.length-2} more</div>` : ''}
            </div>`;
    }
    document.getElementById('calGrid').innerHTML = html;
    document.getElementById('calDayDetail').style.display = 'none';
}

window.showCalDay = async function(dateStr) {
    let appts = await dbGetAll('appointments');
    appts = appts.filter(a => a.date === dateStr);
    const detail = document.getElementById('calDayDetail');
    const title  = document.getElementById('calDayTitle');
    const list   = document.getElementById('calDayAppts');

    title.innerText = `${t('cal.apptOn')} ${dateStr}`;
    detail.style.display = 'block';

    if (appts.length === 0) {
        list.innerHTML = `
            <p class="text-gray-400 text-sm mb-3">${t('cal.noAppts')}</p>
            <button onclick="prefillApptDate('${dateStr}')" class="btn btn-green text-xs"><i class="fa-solid fa-plus"></i> ${t('cal.bookDay')}</button>`;
        return;
    }
    list.innerHTML = appts.map(a => {
        const sc = { Waiting:'bg-orange-100 text-orange-600', Inside:'bg-blue-100 text-blue-600', Examined:'bg-green-100 text-green-600', Cancelled:'bg-red-100 text-red-600' }[a.status] || 'bg-gray-100 text-gray-600';
        return `<div class="flex items-center justify-between py-2 border-b border-gray-50 text-sm">
            <div><span class="font-bold text-blue-600 mr-2">${a.time}</span><span class="font-semibold">${a.patient_name||a.patientName||''}</span><span class="text-gray-400 ml-2 text-xs">${a.doctor}</span>${a.complaint ? `<span class="text-gray-400 ml-2 text-xs">— ${a.complaint}</span>` : ''}</div>
            <span class="badge ${sc}">${t('appts.' + a.status.toLowerCase())}</span>
        </div>`;
    }).join('') + `<button onclick="prefillApptDate('${dateStr}')" class="btn btn-green text-xs mt-3"><i class="fa-solid fa-plus"></i> ${t('cal.addAppt')}</button>`;
};

window.prefillApptDate = function(dateStr) {
    openModal('addAppointmentModal');
    setTimeout(() => { document.getElementById('appointmentDate').value = dateStr; }, 100);
};

window.changeMonth = function(dir) {
    calendarMonth += dir;
    if (calendarMonth > 11) { calendarMonth = 0; calendarYear++; }
    if (calendarMonth < 0)  { calendarMonth = 11; calendarYear--; }
    renderCalendar();
};

window.goToToday = function() {
    calendarYear  = new Date().getFullYear();
    calendarMonth = new Date().getMonth();
    renderCalendar();
};

// ── 16. EXPENSES ─────────────────────────
async function loadExpenses() {
    const expenses = await dbGetAll('expenses');
    const curr = getCurrency();
    const thisMonth = today().slice(0,7);
    let totalMonth = 0, totalAll = 0;
    expenses.forEach(e => {
        totalAll += parseFloat(e.amount)||0;
        if ((e.date||'').startsWith(thisMonth)) totalMonth += parseFloat(e.amount)||0;
    });
    document.getElementById('expTotalMonth').innerText = `${totalMonth} ${curr}`;
    document.getElementById('expTotalAll').innerText   = `${totalAll} ${curr}`;
    document.getElementById('expCount').innerText      = expenses.length;

    document.getElementById('expensesTableBody').innerHTML = expenses.map(e => `
        <tr class="border-b border-gray-50 hover:bg-gray-50 text-sm">
            <td class="p-3 font-semibold text-gray-800">${e.item}</td>
            <td class="p-3"><span class="badge" style="background:#f1f5f9;color:#475569;">${e.category||'Other'}</span></td>
            <td class="p-3 text-red-500 font-bold">${e.amount||0} ${curr}</td>
            <td class="p-3 text-gray-400">${e.date}</td>
            <td class="p-3 text-center"><button onclick="deleteExpense(${e.id})" class="btn text-xs px-2 py-1" style="background:#fef2f2;color:#ef4444;border:1px solid #fecaca;"><i class="fa-solid fa-trash"></i></button></td>
        </tr>
    `).join('');
}

window.deleteExpense = async function(id) {
    if (!confirm(t('confirm.deleteExpense'))) return;
    await dbDelete('expenses', id);
    loadExpenses();
    updateDashboard();
    showToast(t('toast.deleted'), 'error');
};

// ── 17. PRESCRIPTIONS ────────────────────
async function loadPrescriptions() {
    const list = await dbGetAll('prescriptions');
    document.getElementById('prescriptionsTableBody').innerHTML = list.map(p => `
        <tr class="border-b border-gray-50 hover:bg-gray-50 text-sm">
            <td class="p-3 font-semibold text-gray-800 cursor-pointer hover:text-blue-600" onclick="openPatientProfile(${p.patient_id||p.patientId})">${p.patient_name||p.patientName}</td>
            <td class="p-3 text-gray-600 whitespace-pre-line max-w-xs">${p.diagnosis ? `<p class="text-xs text-indigo-500 font-semibold mb-1">${p.diagnosis}</p>` : ''}${p.meds}</td>
            <td class="p-3 text-gray-400">${p.date}</td>
            <td class="p-3 text-center">
                <div class="flex gap-1 justify-center">
                    <button onclick="printPrescription(${p.id})" class="btn btn-outline text-xs px-2 py-1"><i class="fa-solid fa-print"></i></button>
                    <button onclick="deletePrescription(${p.id})" class="btn text-xs px-2 py-1" style="background:#fef2f2;color:#ef4444;border:1px solid #fecaca;"><i class="fa-solid fa-trash"></i></button>
                </div>
            </td>
        </tr>
    `).join('');
}

window.deletePrescription = async function(id) {
    if (!confirm(t('confirm.deleteRx'))) return;
    await dbDelete('prescriptions', id);
    loadPrescriptions();
    showToast(t('toast.deleted'), 'error');
};

window.printPrescription = async function(id) {
    const rows = await dbGetAll('prescriptions');
    const p = rows.find(r => r.id == id);
    if (!p) return;
    const pName = p.patient_name || p.patientName;
    const s = getSettings();
    const win = window.open('', '_blank');
    win.document.write(`
        <html><head><title>Prescription</title>
        <style>
            body { font-family: serif; max-width: 680px; margin: 40px auto; padding: 20px; }
            .header { text-align: center; border-bottom: 2px solid #333; padding-bottom: 15px; margin-bottom: 20px; }
            h1 { font-size: 22px; margin: 0; } h2 { font-size: 14px; color: #666; margin: 4px 0; }
            .rx { font-size: 36px; color: #1e40af; font-style: italic; }
            .body { font-size: 14px; line-height: 1.8; white-space: pre-wrap; }
            .footer { border-top: 1px solid #ddd; margin-top: 30px; padding-top: 10px; display: flex; justify-content: space-between; font-size: 12px; color: #888; }
            .sig { text-align: right; margin-top: 40px; }
        </style></head><body>
        <div class="header">
            <h1>${s.clinicName || 'Dental Clinic'}</h1>
            <h2>${s.doctorName || ''}</h2>
            <h2>${s.phone || ''}</h2>
        </div>
        <p><strong>Patient:</strong> ${pName} &nbsp;&nbsp; <strong>Date:</strong> ${p.date}</p>
        ${p.diagnosis ? `<p><strong>Diagnosis:</strong> ${p.diagnosis}</p>` : ''}
        <br>
        <div class="rx">℞</div>
        <div class="body">${p.meds}</div>
        ${p.instructions ? `<br><p><strong>Instructions:</strong> ${p.instructions}</p>` : ''}
        <div class="sig">
            <p>_____________________</p>
            <p>${s.doctorName || 'Doctor'}</p>
        </div>
        <div class="footer"><span>Printed from ${s.clinicName}</span><span>${p.date}</span></div>
        <script>window.onload = () => { window.print(); window.close(); }<\/script>
        </body></html>
    `);
    win.document.close();
};

window.printPrescriptionPreview = function() {
    document.getElementById('newPrescriptionForm').dispatchEvent(new Event('submit', {cancelable:true}));
    setTimeout(async () => {
        const list = await dbGetAll('prescriptions');
        if (list.length > 0) printPrescription(list[0].id);
    }, 400);
};

// ── 18. REPORTS ──────────────────────────
// ── DAILY PROFIT RATIOS ───────────────────────────────────────────
const PROFIT_RATIOS_KEY = 'clinicProfitRatios';
const PROFIT_RATIOS_DEFAULT = { material: 30, devices: 15, others: 10 };

function getProfitRatios() {
    try {
        const s = localStorage.getItem(PROFIT_RATIOS_KEY);
        return s ? { ...PROFIT_RATIOS_DEFAULT, ...JSON.parse(s) } : { ...PROFIT_RATIOS_DEFAULT };
    } catch { return { ...PROFIT_RATIOS_DEFAULT }; }
}
function saveProfitRatios(r) { localStorage.setItem(PROFIT_RATIOS_KEY, JSON.stringify(r)); }

function currentMonthRange() {
    const now = new Date();
    const y   = now.getFullYear();
    const m   = String(now.getMonth() + 1).padStart(2, '0');
    const last = new Date(y, now.getMonth() + 1, 0).getDate();
    return { from: `${y}-${m}-01`, to: `${y}-${m}-${String(last).padStart(2,'0')}` };
}

function buildProfitTable(revenue, ratios, curr) {
    const mat    = revenue * ratios.material / 100;
    const dev    = revenue * ratios.devices  / 100;
    const oth    = revenue * ratios.others   / 100;
    const net    = revenue - mat - dev - oth;
    const netPct = 100 - ratios.material - ratios.devices - ratios.others;
    const fmt    = n => Number.isInteger(n) ? n : n.toFixed(1);
    const nc     = net >= 0 ? 'text-emerald-600' : 'text-red-500';
    const row    = (label, icon, pct, amount, cls) => `
        <div class="flex justify-between items-center text-xs py-1.5 border-b border-gray-100 last:border-0">
            <span class="text-gray-500">${icon} ${label} <span class="text-gray-300">(${pct}%)</span></span>
            <span class="font-semibold ${cls}">${fmt(amount)} ${curr}</span>
        </div>`;
    return `<div class="space-y-0.5">
        ${row('الإيراد', '💰', 100, revenue, 'text-gray-800 font-bold')}
        ${row('استهلاك المواد',   '🧪', ratios.material, mat, 'text-orange-500')}
        ${row('استهلاك الأجهزة', '⚙️', ratios.devices,  dev, 'text-purple-500')}
        ${row('مصاريف أخرى',     '📦', ratios.others,   oth, 'text-rose-400')}
        <div class="flex justify-between items-center mt-2 pt-2 border-t-2 border-dashed border-gray-200">
            <span class="text-xs font-bold text-gray-700"><i class="fa-solid fa-circle-check text-emerald-500"></i> صافي الربح <span class="text-gray-300 font-normal">(${fmt(netPct)}%)</span></span>
            <span class="font-black text-sm ${nc}">${fmt(net)} ${curr}</span>
        </div>
    </div>`;
}

async function renderDailyProfitCard(treatments) {
    const el = document.getElementById('dailyProfitCard');
    if (!el) return;
    const curr   = getCurrency();
    const ratios = getProfitRatios();
    const today  = new Date().toISOString().split('T')[0];
    const { from, to } = currentMonthRange();

    const dailyRev   = treatments.filter(tr => tr.date === today)
                                 .reduce((s,tr) => s+(parseFloat(tr.paid)||0), 0);
    const monthlyRev = treatments.filter(tr => tr.date >= from && tr.date <= to)
                                 .reduce((s,tr) => s+(parseFloat(tr.paid)||0), 0);

    el.innerHTML = `
    <div class="bg-white rounded-xl border border-gray-100 p-5 mb-5">
        <div class="flex items-center justify-between mb-4 border-b pb-3">
            <h3 class="font-bold text-gray-800 text-sm flex items-center gap-2">
                <i class="fa-solid fa-circle-dollar-to-slot text-emerald-500"></i>
                تقرير الأرباح اليومية والشهرية
            </h3>
            <button onclick="toggleProfitSettings()"
                class="text-xs flex items-center gap-1 text-gray-400 hover:text-blue-600 transition-colors px-2 py-1 rounded-lg hover:bg-blue-50">
                <i class="fa-solid fa-sliders"></i> تعديل النسب
            </button>
        </div>

        <!-- Settings panel -->
        <div id="profitSettingsPanel" style="display:none" class="mb-5 p-4 bg-gray-50 rounded-xl border border-gray-200">
            <p class="text-xs text-gray-500 mb-3 font-semibold">⚙️ اضبط النسب من الإيراد — تُحفظ تلقائيًا</p>
            <div class="grid grid-cols-1 gap-3">
                <div class="flex items-center gap-3 bg-white rounded-lg border border-gray-200 px-3 py-2">
                    <span>🧪</span><label class="text-xs text-gray-600 flex-1 font-medium">استهلاك المواد</label>
                    <input type="number" id="ratio_material" value="${ratios.material}" min="0" max="100" step="0.5"
                        class="w-16 text-center text-sm font-bold border border-gray-200 rounded-lg px-2 py-1 outline-none focus:border-blue-400"
                        oninput="previewRatioSum()"> <span class="text-xs text-gray-400">%</span>
                </div>
                <div class="flex items-center gap-3 bg-white rounded-lg border border-gray-200 px-3 py-2">
                    <span>⚙️</span><label class="text-xs text-gray-600 flex-1 font-medium">استهلاك الأجهزة</label>
                    <input type="number" id="ratio_devices" value="${ratios.devices}" min="0" max="100" step="0.5"
                        class="w-16 text-center text-sm font-bold border border-gray-200 rounded-lg px-2 py-1 outline-none focus:border-blue-400"
                        oninput="previewRatioSum()"> <span class="text-xs text-gray-400">%</span>
                </div>
                <div class="flex items-center gap-3 bg-white rounded-lg border border-gray-200 px-3 py-2">
                    <span>📦</span><label class="text-xs text-gray-600 flex-1 font-medium">مصاريف أخرى</label>
                    <input type="number" id="ratio_others" value="${ratios.others}" min="0" max="100" step="0.5"
                        class="w-16 text-center text-sm font-bold border border-gray-200 rounded-lg px-2 py-1 outline-none focus:border-blue-400"
                        oninput="previewRatioSum()"> <span class="text-xs text-gray-400">%</span>
                </div>
            </div>
            <p id="profitNetHint" class="text-xs text-center mt-2 font-semibold"></p>
            <div class="flex gap-2 mt-4">
                <button onclick="applyProfitRatios()"
                    class="flex-1 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-4 py-2 rounded-lg transition-colors">
                    <i class="fa-solid fa-check mr-1"></i> حفظ وتحديث
                </button>
                <button onclick="toggleProfitSettings()"
                    class="text-xs text-gray-500 px-3 py-2 rounded-lg border border-gray-200 hover:bg-gray-100 transition-colors">
                    إغلاق
                </button>
            </div>
        </div>

        <!-- Two columns -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div class="rounded-xl border border-emerald-100 bg-emerald-50/40 p-4">
                <div class="flex items-center gap-2 mb-3">
                    <span class="text-xs font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">📅 اليوم</span>
                    <span class="text-xs text-gray-400">${today}</span>
                </div>
                ${buildProfitTable(dailyRev, ratios, curr)}
            </div>
            <div class="rounded-xl border border-blue-100 bg-blue-50/40 p-4">
                <div class="flex items-center gap-2 mb-3">
                    <span class="text-xs font-bold text-blue-700 bg-blue-100 px-2 py-0.5 rounded-full">📆 الشهر الحالي</span>
                    <span class="text-xs text-gray-400">${from} ← ${to}</span>
                </div>
                ${buildProfitTable(monthlyRev, ratios, curr)}
            </div>
        </div>
    </div>`;
}

window.toggleProfitSettings = function() {
    const p = document.getElementById('profitSettingsPanel');
    if (!p) return;
    p.style.display = p.style.display === 'none' ? 'block' : 'none';
    previewRatioSum();
};
window.previewRatioSum = function() {
    const mat = parseFloat(document.getElementById('ratio_material')?.value) || 0;
    const dev = parseFloat(document.getElementById('ratio_devices')?.value)  || 0;
    const oth = parseFloat(document.getElementById('ratio_others')?.value)   || 0;
    const net = 100 - mat - dev - oth;
    const h   = document.getElementById('profitNetHint');
    if (h) h.innerHTML = `<span style="color:${net<0?'#ef4444':'#16a34a'}">صافي الربح المتوقع: ${net.toFixed(1)}%</span>`;
};
window.applyProfitRatios = async function() {
    const mat = parseFloat(document.getElementById('ratio_material')?.value) || 0;
    const dev = parseFloat(document.getElementById('ratio_devices')?.value)  || 0;
    const oth = parseFloat(document.getElementById('ratio_others')?.value)   || 0;
    if (mat + dev + oth > 100) { showToast('مجموع النسب تجاوز 100% — يرجى المراجعة', 'error'); return; }
    saveProfitRatios({ material: mat, devices: dev, others: oth });
    showToast('تم حفظ النسب وتحديث التقرير ✓');
    const p = document.getElementById('profitSettingsPanel');
    if (p) p.style.display = 'none';
    const treatments = await dbGetAll('treatments');
    renderDailyProfitCard(treatments);
};

// ── END DAILY PROFIT RATIOS ───────────────────────────────────────

async function loadReports() {
    const curr = getCurrency();
    const treatments   = await dbGetAll('treatments');
    const expenses     = await dbGetAll('expenses');
    const patients     = await dbGetAll('patients');
    const appointments = await dbGetAll('appointments');
    renderReportKpis(treatments, expenses, patients, appointments);
    renderCharts();

    // inject placeholder if missing then render profit card
    if (!document.getElementById('dailyProfitCard')) {
        const kpis = document.getElementById('reportKpis');
        const ph   = document.createElement('div');
        ph.id = 'dailyProfitCard';
        if (kpis && kpis.parentNode) kpis.parentNode.insertBefore(ph, kpis.nextSibling);
    }
    await renderDailyProfitCard(treatments);

    let totalRevenue = 0, totalPaid = 0, totalDebt = 0, totalExpenses = 0;
    treatments.forEach(tr => {
        totalRevenue += parseFloat(tr.total_cost||tr.totalCost)||0;
        totalPaid    += parseFloat(tr.paid)||0;
    });
    totalDebt = totalRevenue - totalPaid;
    expenses.forEach(e => { totalExpenses += parseFloat(e.amount)||0; });

    document.getElementById('financialReport').innerHTML = `
        <div class="flex justify-between text-sm border-b pb-2"><span class="text-gray-500">${t('rep.totalRevenue')}</span><span class="font-bold text-gray-800">${totalRevenue} ${curr}</span></div>
        <div class="flex justify-between text-sm border-b pb-2"><span class="text-gray-500">${t('rep.collected')}</span><span class="font-bold text-green-600">${totalPaid} ${curr}</span></div>
        <div class="flex justify-between text-sm border-b pb-2"><span class="text-gray-500">${t('rep.debt')}</span><span class="font-bold text-red-500">${totalDebt} ${curr}</span></div>
        <div class="flex justify-between text-sm border-b pb-2"><span class="text-gray-500">${t('rep.totalExp')}</span><span class="font-bold text-orange-500">${totalExpenses} ${curr}</span></div>
        <div class="flex justify-between text-sm font-bold text-base mt-1"><span>${t('rep.netProfit')}</span><span class="${totalPaid-totalExpenses>=0?'text-green-600':'text-red-500'}">${totalPaid - totalExpenses} ${curr}</span></div>
    `;

    const examined = appointments.filter(a => a.status === 'Examined').length;
    document.getElementById('patientReport').innerHTML = `
        <div class="flex justify-between text-sm border-b pb-2"><span class="text-gray-500">${t('rep.totalPatients')}</span><span class="font-bold">${patients.length}</span></div>
        <div class="flex justify-between text-sm border-b pb-2"><span class="text-gray-500">${t('rep.totalAppts')}</span><span class="font-bold">${appointments.length}</span></div>
        <div class="flex justify-between text-sm border-b pb-2"><span class="text-gray-500">${t('rep.completed')}</span><span class="font-bold text-green-600">${examined}</span></div>
        <div class="flex justify-between text-sm border-b pb-2"><span class="text-gray-500">${t('rep.totalTreat')}</span><span class="font-bold">${treatments.length}</span></div>
        <div class="flex justify-between text-sm"><span class="text-gray-500">${t('rep.totalRx')}</span><span class="font-bold">(see list)</span></div>
    `;

    const debtMap = {};
    treatments.forEach(tr => {
        const pid  = tr.patient_id || tr.patientId;
        const name = tr.patient_name || tr.patientName;
        if (!debtMap[pid]) debtMap[pid] = { name, cost: 0, paid: 0, id: pid };
        debtMap[pid].cost += parseFloat(tr.total_cost||tr.totalCost)||0;
        debtMap[pid].paid += parseFloat(tr.paid)||0;
    });
    const debtors = Object.values(debtMap).filter(d => d.cost - d.paid > 0).sort((a,b) => (b.cost-b.paid)-(a.cost-a.paid));

    if (debtors.length === 0) {
        document.getElementById('debtReport').innerHTML = `<p class="text-green-600 font-semibold text-sm"><i class="fa-solid fa-circle-check mr-1"></i> ${t('rep.allSettled')}</p>`;
        return;
    }
    document.getElementById('debtReport').innerHTML = `
        <table class="w-full text-sm">
            <thead><tr class="text-gray-400 text-xs uppercase border-b"><th class="text-left pb-2">${t('rep.debtor')}</th><th class="text-right pb-2">${t('rep.debtAmt')}</th></tr></thead>
            <tbody>${debtors.map(d => `
                <tr class="border-b border-gray-50">
                    <td class="py-2 cursor-pointer hover:text-blue-600 font-semibold" onclick="openPatientProfile(${d.id})">${d.name}</td>
                    <td class="py-2 text-right text-red-500 font-bold">${d.cost - d.paid} ${curr}</td>
                </tr>`).join('')}
            </tbody>
        </table>`;
}

// ── 19. SETTINGS ─────────────────────────
function loadSettingsForm() {
    const s = getSettings();
    const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val || '—'; };
    set('settingClinicName', s.clinicName);
    set('settingDoctorName', s.doctorName);
    set('settingPhone',      s.phone);
    set('settingAddress',    s.address);
    set('settingCurrency',   s.currency);
    // لا نكتب doctorName على headerUsername — اسم اليوزر الحقيقي يجيه من user_header_patch.js
    if (s.logo) {
        const img = document.getElementById('logoPreviewImg');
        const ico = document.getElementById('logoPlaceholderIcon');
        if (img) { img.src = s.logo; img.classList.remove('hidden'); }
        if (ico) ico.classList.add('hidden');
    }
    const isDark = document.body.classList.contains('dark');
    const thumb = document.getElementById('darkModeThumb');
    const toggleBtn = document.getElementById('darkModeToggleBtn');
    if (thumb && toggleBtn) {
        if (isDark) { toggleBtn.classList.replace('bg-gray-200','bg-blue-600'); thumb.style.transform = 'translateX(20px)'; }
        else { toggleBtn.classList.replace('bg-blue-600','bg-gray-200'); thumb.style.transform = 'translateX(0)'; }
    }
}

window.saveSettings = function() { showToast('Settings are managed by BitMaster.', 'info'); };
window.uploadLogo = function() { showToast('Logo is managed by BitMaster.', 'info'); };
window.removeLogo = function() { showToast('Logo is managed by BitMaster.', 'info'); };

window.confirmDeleteAll = function() {
    if (!confirm(t('confirm.deleteAll'))) return;
    if (!confirm(t('confirm.deleteAll2'))) return;
    db.delete().then(() => { showToast(t('toast.allDeleted'), 'error'); setTimeout(() => location.reload(), 1500); });
};

// ── 20. BACKUP ───────────────────────────
window.exportBackup = async function() {
    const safeGet = async (tbl) => { try { return await dbGetAll(tbl); } catch(e) { return []; } };
    const data = {
        patients:      await safeGet('patients'),
        appointments:  await safeGet('appointments'),
        treatments:    await safeGet('treatments'),
        expenses:      await safeGet('expenses'),
        prescriptions: await safeGet('prescriptions'),
        toothStates:   await db.toothStates.toArray().catch(()=>[]),
        patientNotes:  await db.patientNotes.toArray().catch(()=>[]),
        invoices:      await safeGet('invoices'),
        labOrders:     await safeGet('lab_orders'),
        inventory:     await safeGet('inventory'),
        doctors:       await safeGet('doctors'),
        exportedAt:    new Date().toISOString(),
        profitRatios:  getProfitRatios(),
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `DentalClinic_backup_${today()}.json`;
    a.click();
    showToast(t('toast.backupExported'));
};

window.importBackup = async function(event) {
    const file = event.target.files[0];
    if (!file) return;
    if (!confirm(t('confirm.importBackup'))) return;
    const text = await file.text();
    const data = JSON.parse(text);

    if (data.profitRatios) {
        localStorage.setItem(PROFIT_RATIOS_KEY, JSON.stringify(data.profitRatios));
    }

    const TABLE_RESTORE_MAP = {
        patients:      'patients',
        appointments:  'appointments',
        treatments:    'treatments',
        expenses:      'expenses',
        prescriptions: 'prescriptions',
        toothStates:   'toothStates',
        patientNotes:  'patientNotes',
        invoices:      'invoices',
        labOrders:     'labOrders',
        inventory:     'inventory',
        doctors:       'doctors',
    };
    for (const [key, tbl] of Object.entries(TABLE_RESTORE_MAP)) {
        if (data[key] && data[key].length > 0) {
            try {
                const rows = data[key].map(r => { const {id, ...rest} = r; return rest; });
                await db[tbl].bulkAdd(rows);
            } catch(e) { console.warn(`[importBackup] failed: ${tbl}`, e.message); }
        }
    }
    showToast(t('toast.backupImported'));
    updateDashboard();
};

// ── 21. DASHBOARD UPDATE ─────────────────
async function updateDashboard() {
    const todayStr     = today();
    const curr         = getCurrency();
    const patients     = await dbGetAll('patients');
    const appointments = await dbGetAll('appointments');
    const treatments   = await dbGetAll('treatments');
    const expenses     = await dbGetAll('expenses');

    document.getElementById('totalPatientsCount').innerText = patients.length;

    let dailyRevenue = 0, dailyExpense = 0;
    treatments.forEach(tr => { if (tr.date === todayStr) dailyRevenue += parseFloat(tr.paid)||0; });
    expenses.forEach(e    => { if (e.date === todayStr)  dailyExpense += parseFloat(e.amount)||0; });
    const net = dailyRevenue - dailyExpense;

    document.getElementById('todayRevenue').innerText  = `${dailyRevenue} ${curr}`;
    document.getElementById('todayExpenses').innerText = `${dailyExpense} ${curr}`;
    document.getElementById('netProfit').innerText     = `${net} ${curr}`;

    document.getElementById('dashDate').innerText = new Date().toLocaleDateString(currentLang === 'ar' ? 'ar-EG' : 'en-US', { weekday:'long', year:'numeric', month:'long', day:'numeric' });
    const hr = new Date().getHours();
    document.getElementById('dashGreeting').innerText = hr < 12 ? t('dash.greeting.morning') : hr < 17 ? t('dash.greeting.afternoon') : t('dash.greeting.evening');

    const recentList = document.getElementById('recentPatientsList');
    if (patients.length === 0) {
        recentList.innerHTML = `<div class="text-center text-gray-300 mt-8"><i class="fa-solid fa-folder-open text-3xl mb-2 block"></i><p class="text-sm">${t('dash.noPatients')}</p></div>`;
    } else {
        recentList.innerHTML = patients.slice(0, 7).map(p => `
            <div onclick="openPatientProfile(${p.id})" class="flex items-center gap-2 p-2.5 hover:bg-blue-50 cursor-pointer rounded-xl transition group border-b border-gray-50 last:border-0">
                <div class="w-7 h-7 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-bold shrink-0">${p.name.charAt(0)}</div>
                <div class="flex-1 min-w-0">
                    <p class="font-semibold text-sm text-gray-800 truncate">${p.name}</p>
                    <p class="text-[10px] text-gray-400">${p.phone||''}</p>
                </div>
                <i class="fa-solid fa-chevron-right text-xs text-gray-300 group-hover:text-blue-400"></i>
            </div>`).join('');
    }

    const todayAppts = appointments.filter(a => a.date === todayStr).sort((a,b) => (a.time||'').localeCompare(b.time||''));
    const apptsList = document.getElementById('appointmentsList');

    if (todayAppts.length === 0) {
        apptsList.innerHTML = `<div class="flex flex-col items-center py-10 text-gray-300"><i class="fa-solid fa-calendar-xmark text-3xl mb-2"></i><p class="text-sm">${t('dash.noAppts')}</p></div>`;
    } else {
        const statusColors = { Waiting:'badge-waiting', Inside:'badge-inside', Examined:'badge-examined', Cancelled:'badge-cancelled' };
        apptsList.innerHTML = todayAppts.map(a => {
            const sc = statusColors[a.status] || 'badge-waiting';
            const pName = a.patient_name || a.patientName;
            const pId   = a.patient_id   || a.patientId;
            return `<div class="grid grid-cols-4 gap-2 px-4 py-3 text-xs text-center border-b border-gray-50 items-center hover:bg-gray-50">
                <div class="font-bold text-blue-600">${a.time}</div>
                <div class="font-semibold text-gray-800 truncate cursor-pointer hover:text-blue-600" onclick="openPatientProfile(${pId})">${pName}</div>
                <div class="text-gray-400 truncate">${a.doctor}</div>
                <div>
                    <select onchange="updateAppointmentStatus(${a.id}, this.value)" class="badge ${sc} border-0 bg-transparent font-semibold text-xs outline-none cursor-pointer w-full">
                        <option value="Waiting" ${a.status==='Waiting'?'selected':''}>${t('appts.waiting')}</option>
                        <option value="Inside" ${a.status==='Inside'?'selected':''}>${t('appts.inside')}</option>
                        <option value="Examined" ${a.status==='Examined'?'selected':''}>${t('appts.examined')}</option>
                        <option value="Cancelled" ${a.status==='Cancelled'?'selected':''}>${t('appts.cancelled')}</option>
                    </select>
                </div>
            </div>`;
        }).join('');
    }
}

// ── 21.2 TODAY REVENUE MODAL ─────────────
window.showTodayRevenueModal = async function() {
    const todayStr = today();
    const curr     = getCurrency();
    // استخدم الـ cache لو متاح (أسرع) وإلا اقرأ من DB
    const c = window._appCache;
    const treatments = (c && c.loaded && c.treatments) ? c.treatments : await dbGetAll('treatments');
    const todayTr  = treatments.filter(tr => tr.date === todayStr && parseFloat(tr.paid||0) > 0);
    const body     = document.getElementById('todayRevenueModalBody');
    const totalEl  = document.getElementById('todayRevenueModalTotal');
    let sum = 0;
    todayTr.forEach(tr => { sum += parseFloat(tr.paid)||0; });
    totalEl.innerText = `${sum} ${curr}`;
    if (todayTr.length === 0) {
        body.innerHTML = `<div class="text-center py-10 text-gray-300"><i class="fa-solid fa-receipt text-5xl mb-3 block opacity-30"></i><p class="text-sm">لا توجد إيرادات اليوم</p></div>`;
    } else {
        const byPatient = {};
        todayTr.forEach(tr => {
            const pid = tr.patient_id || tr.patientId;
            const pname = tr.patient_name || tr.patientName || 'غير معروف';
            if (!byPatient[pid]) byPatient[pid] = { name: pname, id: pid, treatments: [] };
            byPatient[pid].treatments.push(tr);
        });
        body.innerHTML = `<div class="space-y-3 max-h-80 overflow-y-auto pr-1">${Object.values(byPatient).map(p => {
            const pTotal = p.treatments.reduce((s,tr)=>s+(parseFloat(tr.paid)||0),0);
            return `<div class="rounded-xl border border-gray-100 overflow-hidden">
                <div class="flex items-center justify-between px-4 py-2.5 bg-green-50 border-b border-green-100 cursor-pointer hover:bg-green-100 transition" onclick="openPatientProfile(${p.id}); closeModal('todayRevenueModal');">
                    <div class="flex items-center gap-2"><div class="w-7 h-7 rounded-lg bg-green-200 text-green-700 flex items-center justify-center text-xs font-bold">${p.name.charAt(0)}</div><span class="font-semibold text-sm text-gray-800">${p.name}</span></div>
                    <span class="font-black text-green-600 text-sm">${pTotal} ${curr}</span>
                </div>
                ${p.treatments.map(tr => `<div class="flex justify-between items-center px-4 py-2 text-xs text-gray-600 border-b border-gray-50 last:border-0 bg-white">
                    <span><i class="fa-solid fa-tooth text-blue-300 mr-1"></i>${tr.procedure}${(tr.tooth_number||tr.toothNumber)?` <span class="text-blue-400">#${tr.tooth_number||tr.toothNumber}</span>`:''}</span>
                    <span class="font-semibold text-green-600">${tr.paid} ${curr}</span>
                </div>`).join('')}
            </div>`;
        }).join('')}</div>`;
    }
    document.getElementById('todayRevenueModal').classList.add('open');
};

// ── 21.3 TODAY EXPENSES MODAL ────────────
window.showTodayExpensesModal = async function() {
    const todayStr = today();
    const curr     = getCurrency();
    // استخدم الـ cache لو متاح
    const c = window._appCache;
    const expenses = (c && c.loaded && c.expenses) ? c.expenses : await dbGetAll('expenses');
    const todayExp = expenses.filter(e => e.date === todayStr);
    const body     = document.getElementById('todayExpensesModalBody');
    const totalEl  = document.getElementById('todayExpensesModalTotal');
    let sum = 0;
    todayExp.forEach(e => { sum += parseFloat(e.amount)||0; });
    totalEl.innerText = `${sum} ${curr}`;
    if (todayExp.length === 0) {
        body.innerHTML = `<div class="text-center py-10 text-gray-300"><i class="fa-solid fa-file-invoice-dollar text-5xl mb-3 block opacity-30"></i><p class="text-sm">لا توجد مصروفات اليوم</p></div>`;
    } else {
        const CC = { Supplies:'bg-blue-50 text-blue-600', Rent:'bg-purple-50 text-purple-600', Salaries:'bg-yellow-50 text-yellow-700', Utilities:'bg-cyan-50 text-cyan-600', Equipment:'bg-indigo-50 text-indigo-600', Maintenance:'bg-orange-50 text-orange-600', lab:'bg-teal-50 text-teal-600', Other:'bg-gray-100 text-gray-600' };
        body.innerHTML = `<div class="space-y-2 max-h-80 overflow-y-auto pr-1">${todayExp.map(e => {
            const cat = e.category||'Other'; const cls = CC[cat]||CC['Other'];
            return `<div class="flex items-center justify-between px-4 py-3 rounded-xl border border-gray-100 bg-white hover:bg-red-50 transition">
                <div class="flex items-center gap-3"><span class="badge text-[11px] px-2.5 py-1 ${cls}">${cat}</span><span class="text-sm font-semibold text-gray-800">${e.item}</span></div>
                <span class="font-black text-red-500 text-sm">${e.amount} ${curr}</span>
            </div>`;
        }).join('')}</div>`;
    }
    document.getElementById('todayExpensesModal').classList.add('open');
};

// ── 21.4 REPORT TABS ─────────────────────
window.switchReportTab = function(tab) {
    ['overview','monthly'].forEach(name => {
        const panel = document.getElementById(`repPanel-${name}`);
        const btn   = document.getElementById(`repTab-${name}`);
        if (!panel || !btn) return;
        const active = name === tab;
        panel.style.display = active ? 'block' : 'none';
        btn.classList.toggle('border-blue-600', active);
        btn.classList.toggle('text-blue-600',   active);
        btn.classList.toggle('border-transparent', !active);
        btn.classList.toggle('text-gray-400',   !active);
    });
    if (tab === 'monthly') renderMonthlyReport();
};

// ✅ Edge-safe: attach tab click handlers via JS not inline onclick
document.addEventListener('DOMContentLoaded', function() {
    const btnOverview = document.getElementById('repTab-overview');
    const btnMonthly  = document.getElementById('repTab-monthly');
    if (btnOverview) btnOverview.addEventListener('click', function() { window.switchReportTab('overview'); });
    if (btnMonthly)  btnMonthly.addEventListener('click',  function() { window.switchReportTab('monthly'); });
});

window.renderMonthlyReport = async function() {
    // استخدم الـ cache لو متاح
    const c = window._appCache;
    const treatments = (c && c.loaded && c.treatments) ? c.treatments : await dbGetAll('treatments');
    const expenses   = (c && c.loaded && c.expenses)   ? c.expenses   : await dbGetAll('expenses');
    const curr       = getCurrency();
    const yearsSet   = new Set();
    treatments.forEach(tr => { const y=(tr.date||'').slice(0,4); if(y) yearsSet.add(y); });
    expenses.forEach(e  => { const y=(e.date||'').slice(0,4);  if(y) yearsSet.add(y); });
    const years = [...yearsSet].sort((a,b)=>b-a);
    const sel = document.getElementById('monthlyReportYear');
    if (sel) {
        const cur = sel.value || years[0] || String(new Date().getFullYear());
        sel.innerHTML = years.map(y=>`<option value="${y}" ${y===cur?'selected':''}>${y}</option>`).join('');
        if (!sel.value && years.length) sel.value = years[0];
    }
    const selectedYear = sel ? sel.value : (years[0] || String(new Date().getFullYear()));
    const MONTHS = currentLang==='ar'
        ? ['يناير','فبراير','مارس','أبريل','مايو','يونيو','يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر']
        : ['January','February','March','April','May','June','July','August','September','October','November','December'];
    const monthData = MONTHS.map((month, m) => {
        const mStr = `${selectedYear}-${String(m+1).padStart(2,'0')}`;
        const rev  = treatments.filter(tr=>(tr.date||'').startsWith(mStr)).reduce((s,tr)=>s+(parseFloat(tr.paid)||0),0);
        const exp  = expenses.filter(e=>(e.date||'').startsWith(mStr)).reduce((s,e)=>s+(parseFloat(e.amount)||0),0);
        return { month, rev, exp, net: rev-exp };
    });
    const totalRev = monthData.reduce((s,d)=>s+d.rev,0);
    const totalExp = monthData.reduce((s,d)=>s+d.exp,0);
    const maxRev   = Math.max(...monthData.map(d=>d.rev), 1);
    document.getElementById('monthlyReportBody').innerHTML = `
    <div class="overflow-x-auto"><table class="w-full text-sm">
        <thead><tr class="bg-slate-50 text-gray-400 text-xs uppercase border-b">
            <th class="text-right px-4 py-3">الشهر</th>
            <th class="text-right px-4 py-3 text-green-600">الإيراد</th>
            <th class="text-right px-4 py-3 text-red-400">المصروف</th>
            <th class="text-right px-4 py-3 text-blue-600">صافي الربح</th>
            <th class="px-4 py-3 w-36">نسبة الإيراد</th>
        </tr></thead>
        <tbody>${monthData.map(d => {
            const pct = Math.round(d.rev/maxRev*100);
            const hasData = d.rev>0||d.exp>0;
            return `<tr class="border-b border-gray-50 ${hasData?'hover:bg-blue-50':'opacity-40'} transition">
                <td class="px-4 py-3 font-semibold text-gray-700">${d.month}</td>
                <td class="px-4 py-3 text-green-600 font-semibold">${d.rev>0?d.rev.toLocaleString()+' '+curr:'—'}</td>
                <td class="px-4 py-3 text-red-400">${d.exp>0?d.exp.toLocaleString()+' '+curr:'—'}</td>
                <td class="px-4 py-3 font-bold ${d.net>=0?'text-green-600':'text-red-500'}">${hasData?d.net.toLocaleString()+' '+curr:'—'}</td>
                <td class="px-4 py-3"><div class="flex items-center gap-2"><div class="flex-1 bg-gray-100 rounded-full h-2 overflow-hidden"><div class="h-2 rounded-full ${d.rev>0?'bg-green-400':'bg-gray-200'}" style="width:${pct}%"></div></div><span class="text-[11px] text-gray-400 w-8">${pct}%</span></div></td>
            </tr>`;
        }).join('')}</tbody>
        <tfoot><tr class="bg-slate-50 font-bold border-t-2 border-gray-200">
            <td class="px-4 py-3 text-gray-700">الإجمالي</td>
            <td class="px-4 py-3 text-green-700">${totalRev.toLocaleString()} ${curr}</td>
            <td class="px-4 py-3 text-red-500">${totalExp.toLocaleString()} ${curr}</td>
            <td class="px-4 py-3 ${(totalRev-totalExp)>=0?'text-green-700':'text-red-500'}">${(totalRev-totalExp).toLocaleString()} ${curr}</td>
            <td></td>
        </tr></tfoot>
    </table></div>`;
};

// ── 21.5 PRINT PATIENT SHEET ──
window.printPatientSheet = async function() {
    const rows = await dbGetAll('patients');
    const p = rows.find(r => r.id == currentProfilePatientId);
    if (!p) return;
    const treatments    = await dbGetAll('treatments', { patient_id: currentProfilePatientId });
    const appointments  = await dbGetAll('appointments', { patient_id: currentProfilePatientId });
    const prescriptions = await dbGetAll('prescriptions', { patient_id: currentProfilePatientId });
    const notesRows     = await dbGetAll('patient_notes', { patient_id: currentProfilePatientId });
    const notesRec      = notesRows[0];
    const s = getSettings();
    const curr = getCurrency();

    let totalCost = 0, totalPaid = 0;
    treatments.forEach(tr => { totalCost += parseFloat(tr.total_cost||tr.totalCost)||0; totalPaid += parseFloat(tr.paid)||0; });

    // Build medical history string including pregnant/breastfeeding
    const medParts = [];
    if (p.is_pregnant)      medParts.push('🤰 ' + t('modal.pregnant'));
    if (p.is_breastfeeding) medParts.push('🤱 ' + t('modal.breastfeeding'));
    if (p.medical_history || p.medHistory) medParts.push(p.medical_history || p.medHistory);
    const pMedHistory = medParts.join(' · ') || '';

    const win = window.open('', '_blank');
    const isAr = currentLang === 'ar';
    win.document.write(`
    <html dir="${isAr ? 'rtl' : 'ltr'}"><head><title>Patient Sheet — ${p.name}</title>
    <style>
        body { font-family: ${isAr ? 'Cairo, Arial' : 'Inter, Arial'}, sans-serif; max-width: 750px; margin: 30px auto; padding: 20px; color: #1e293b; font-size: 13px; }
        .header { background: linear-gradient(135deg, #1d4ed8, #0891b2); color: white; padding: 20px 24px; border-radius: 12px; margin-bottom: 20px; display: flex; justify-content: space-between; align-items: center; }
        .header h1 { margin: 0; font-size: 20px; } .header p { margin: 3px 0; opacity: 0.85; font-size: 12px; }
        .section { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 16px; margin-bottom: 14px; }
        .section h3 { margin: 0 0 12px 0; color: #1d4ed8; font-size: 14px; border-bottom: 1px solid #dbeafe; padding-bottom: 6px; }
        .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
        .info-item { display: flex; gap: 6px; } .label { color: #64748b; font-size: 11px; font-weight: 600; text-transform: uppercase; min-width: 80px; }
        table { width: 100%; border-collapse: collapse; font-size: 12px; }
        th { background: #e2e8f0; padding: 6px 10px; text-align: ${isAr ? 'right' : 'left'}; color: #475569; font-size: 11px; }
        td { padding: 6px 10px; border-bottom: 1px solid #f1f5f9; }
        .balance-row { display: flex; justify-content: space-between; padding: 4px 0; font-size: 13px; }
        .balance-row.total { font-weight: 700; font-size: 14px; border-top: 2px solid #e2e8f0; padding-top: 8px; margin-top: 4px; }
        .red { color: #ef4444; } .green { color: #16a34a; }
        .footer { text-align: center; margin-top: 20px; color: #94a3b8; font-size: 11px; border-top: 1px solid #e2e8f0; padding-top: 10px; }
        @media print { @page { margin: 15mm; } }
    </style></head><body>
    <div class="header">
        <div><h1>${s.clinicName || 'DentalClinic'}</h1><p>${s.doctorName || ''}</p><p>${s.phone || ''}</p></div>
        <div style="text-align:${isAr?'left':'right'}"><p style="font-size:16px;font-weight:700;">${isAr ? 'ملف المريض' : 'Patient Record'}</p><p>${new Date().toLocaleDateString()}</p></div>
    </div>

    <div class="section">
        <h3>${isAr ? 'بيانات المريض' : 'Patient Information'}</h3>
        <div class="info-grid">
            <div class="info-item"><span class="label">${isAr?'الاسم':'Name'}:</span> <strong>${p.name}</strong></div>
            <div class="info-item"><span class="label">${isAr?'الهاتف':'Phone'}:</span> ${p.phone||'—'}</div>
            <div class="info-item"><span class="label">${isAr?'العمر':'Age'}:</span> ${p.age || '—'}</div>
            <div class="info-item"><span class="label">${isAr?'الجنس':'Gender'}:</span> ${p.gender || '—'}</div>
            <div class="info-item" style="grid-column:span 2"><span class="label">${isAr?'التاريخ الطبي':'Med History'}:</span> ${pMedHistory || '—'}</div>
            ${notesRec?.notes ? `<div class="info-item" style="grid-column:span 2"><span class="label">${isAr?'ملاحظات':'Notes'}:</span> ${notesRec.notes}</div>` : ''}
        </div>
    </div>

    ${treatments.length > 0 ? `
    <div class="section">
        <h3>${isAr ? 'سجل العلاجات' : 'Treatment History'} (${treatments.length})</h3>
        <table>
            <thead><tr>
                <th>${isAr?'التاريخ':'Date'}</th><th>${isAr?'الإجراء':'Procedure'}</th><th>${isAr?'السن':'Tooth'}</th>
                <th>${isAr?'التكلفة':'Cost'}</th><th>${isAr?'المدفوع':'Paid'}</th>
            </tr></thead>
            <tbody>${treatments.map(tr => `
                <tr>
                    <td>${tr.date}</td><td>${tr.procedure}</td><td>${tr.tooth_number||tr.toothNumber || '—'}</td>
                    <td>${tr.total_cost||tr.totalCost} ${curr}</td><td class="${tr.paid < (tr.total_cost||tr.totalCost) ? 'red' : 'green'}">${tr.paid} ${curr}</td>
                </tr>`).join('')}
            </tbody>
        </table>
        <div style="margin-top:12px;border-top:1px solid #e2e8f0;padding-top:10px;">
            <div class="balance-row"><span>${isAr?'إجمالي التكلفة':'Total Cost'}:</span><span>${totalCost} ${curr}</span></div>
            <div class="balance-row green"><span>${isAr?'إجمالي المدفوع':'Total Paid'}:</span><span>${totalPaid} ${curr}</span></div>
            <div class="balance-row total ${totalCost-totalPaid>0?'red':'green'}"><span>${isAr?'المتبقي':'Balance'}:</span><span>${totalCost-totalPaid} ${curr}</span></div>
        </div>
    </div>` : ''}

    ${appointments.length > 0 ? `
    <div class="section">
        <h3>${isAr ? 'المواعيد' : 'Appointments'} (${appointments.length})</h3>
        <table>
            <thead><tr><th>${isAr?'التاريخ':'Date'}</th><th>${isAr?'الوقت':'Time'}</th><th>${isAr?'الطبيب':'Doctor'}</th><th>${isAr?'الحالة':'Status'}</th></tr></thead>
            <tbody>${appointments.map(a => `<tr><td>${a.date}</td><td>${a.time}</td><td>${a.doctor}</td><td>${a.status}</td></tr>`).join('')}</tbody>
        </table>
    </div>` : ''}

    ${prescriptions.length > 0 ? `
    <div class="section">
        <h3>${isAr ? 'الوصفات الطبية' : 'Prescriptions'} (${prescriptions.length})</h3>
        <table>
            <thead><tr><th>${isAr?'التاريخ':'Date'}</th><th>${isAr?'التشخيص':'Diagnosis'}</th><th>${isAr?'الأدوية':'Medications'}</th></tr></thead>
            <tbody>${prescriptions.map(rx => `<tr><td>${rx.date}</td><td>${rx.diagnosis||'—'}</td><td style="white-space:pre-wrap">${rx.meds}</td></tr>`).join('')}</tbody>
        </table>
    </div>` : ''}

    <div class="footer">
        <p>${isAr ? 'طُبع من' : 'Printed from'} ${s.clinicName || 'DentalClinic'} — ${new Date().toLocaleString()}</p>
    </div>
    <script>window.onload = () => { window.print(); }<\/script>
    </body></html>`);
    win.document.close();
};

// ── 21.6 TREATMENT FORM SMART FILL ──
document.getElementById('treatmentProcedure')?.addEventListener('input', function() {
    const val = this.value.toLowerCase();
    const condEl = document.getElementById('treatmentToothCondition');
    if (!condEl) return;
    // use canonical values matching select options
    if (val.includes('crown')) condEl.value = 'crown_work';
    else if (val.includes('root canal') || val.includes('عصب')) condEl.value = 'root_canal';
    else if (val.includes('extract') || val.includes('مخلوع') || val.includes('خلع')) condEl.value = 'missing';
    else if (val.includes('fill') || val.includes('حشو') || val.includes('scaling') || val.includes('whitening')) condEl.value = 'treated';
});

// ── 21.7 LANGUAGE TOGGLE ──────────────────
window.toggleLanguage = function() {
    setLanguage(currentLang === 'en' ? 'ar' : 'en');
};

// ── 22. HELPERS ──────────────────────────
function today() {
    return new Date().toISOString().split('T')[0];
}

function logout() {
    sessionStorage.removeItem('clinicLoggedIn');
    sessionStorage.removeItem('clinicRole');
    sessionStorage.removeItem('clinicUserName');
    window.location.replace('login.html');
}

// ── 24. DARK MODE ────────────────────────
window.toggleDarkMode = function() {
    const isDark = document.body.classList.toggle('dark');
    localStorage.setItem('clinicDarkMode', isDark ? '1' : '0');
    const btn = document.getElementById('darkModeBtn');
    if (btn) btn.innerHTML = isDark ? '<i class="fa-solid fa-sun"></i>' : '<i class="fa-solid fa-moon"></i>';
    const thumb = document.getElementById('darkModeThumb');
    const toggleBtn = document.getElementById('darkModeToggleBtn');
    if (thumb && toggleBtn) {
        if (isDark) { toggleBtn.classList.remove('bg-gray-200'); toggleBtn.classList.add('bg-blue-600'); thumb.style.transform = 'translateX(20px)'; }
        else { toggleBtn.classList.remove('bg-blue-600'); toggleBtn.classList.add('bg-gray-200'); thumb.style.transform = 'translateX(0)'; }
    }
};

// ── 25. INVOICES ─────────────────────────
// ── Invoice type toggle ──────────────────
window.setInvoiceType = function(type) {
    document.getElementById('invoiceType').value = type;
    const isPat = type === 'patient';
    document.getElementById('invPatientRow').classList.toggle('hidden', !isPat);
    document.getElementById('invSupplierRow').classList.toggle('hidden', isPat);
    // styles
    const btnPat  = document.getElementById('invTypePat');
    const btnSupp = document.getElementById('invTypeSupp');
    if (btnPat)  { btnPat.classList.toggle('border-blue-500',  isPat);  btnPat.classList.toggle('bg-blue-50',    isPat);  btnPat.classList.toggle('text-blue-700', isPat);  btnPat.classList.toggle('border-gray-200',  !isPat); btnPat.classList.toggle('bg-white',  !isPat); btnPat.classList.toggle('text-gray-500', !isPat); }
    if (btnSupp) { btnSupp.classList.toggle('border-blue-500', !isPat); btnSupp.classList.toggle('bg-blue-50',   !isPat); btnSupp.classList.toggle('text-blue-700', !isPat); btnSupp.classList.toggle('border-gray-200', isPat);  btnSupp.classList.toggle('bg-white', isPat);  btnSupp.classList.toggle('text-gray-500', isPat); }
};

window.loadInvoices = async function() {
    const curr = getCurrency();
    const invoices = await dbGetAll('invoices');
    const tbody = document.getElementById('invoicesTableBody');
    const empty = document.getElementById('invoicesEmpty');
    if (!invoices.length) { tbody.innerHTML = ''; empty.classList.remove('hidden'); return; }
    empty.classList.add('hidden');
    tbody.innerHTML = invoices.sort((a,b) => b.id - a.id).map(inv => {
        const due       = (parseFloat(inv.total)||0) - (parseFloat(inv.paid)||0);
        const rawName   = inv.patient_name || inv.patientName || '—';
        const isSupp    = rawName.startsWith('🏢 ');
        const name      = isSupp ? rawName.slice(3) : rawName;
        const typeBadge = isSupp
            ? `<span class="badge" style="background:#f0fdf4;color:#15803d;font-size:10px"><i class="fa-solid fa-building mr-1"></i>مورد</span>`
            : `<span class="badge" style="background:#eff6ff;color:#1d4ed8;font-size:10px"><i class="fa-solid fa-user mr-1"></i>مريض</span>`;
        const statusColor = due <= 0 ? 'text-green-600' : due === (parseFloat(inv.total)||0) ? 'text-red-500' : 'text-yellow-600';
        return `<tr class="border-b border-gray-50 hover:bg-slate-50">
            <td class="px-4 py-3 text-xs text-gray-400 font-mono">#${String(inv.id).padStart(4,'0')}</td>
            <td class="px-4 py-3 font-semibold text-gray-700">${name}</td>
            <td class="px-4 py-3 inv-hide-mobile">${typeBadge}</td>
            <td class="px-4 py-3 text-xs text-gray-400 inv-hide-mobile">${inv.date||''}</td>
            <td class="px-4 py-3 text-right font-bold">${(parseFloat(inv.total)||0).toLocaleString()} ${curr}</td>
            <td class="px-4 py-3 text-right text-green-600 font-semibold inv-hide-mobile">${(parseFloat(inv.paid)||0).toLocaleString()} ${curr}</td>
            <td class="px-4 py-3 text-right font-bold ${statusColor}">${due.toLocaleString()} ${curr}</td>
            <td class="px-4 py-3 text-center">
                <button onclick="printInvoice(${inv.id})" class="btn btn-outline text-xs px-2 py-1"><i class="fa-solid fa-print"></i></button>
                <button onclick="deleteInvoice(${inv.id})" class="btn btn-gray text-xs px-2 py-1 ml-1"><i class="fa-solid fa-trash"></i></button>
            </td>
        </tr>`;
    }).join('');
};

window.addInvoiceItem = function() {
    const container = document.getElementById('invoiceItemsContainer');
    const div = document.createElement('div');
    div.className = 'flex gap-2 items-center invoice-item';
    div.innerHTML = `
        <input type="text" placeholder="الوصف" class="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm inv-desc">
        <input type="number" placeholder="المبلغ" class="w-28 border border-gray-200 rounded-lg px-3 py-2 text-sm inv-amount" oninput="updateInvoiceTotal()">
        <button onclick="this.parentElement.remove();updateInvoiceTotal()" class="text-red-400 hover:text-red-600 w-6 h-6 flex items-center justify-center flex-shrink-0"><i class="fa-solid fa-xmark"></i></button>`;
    container.appendChild(div);
};

window.updateInvoiceTotal = function() {
    let subtotal = 0;
    document.querySelectorAll('.inv-amount').forEach(el => { subtotal += parseFloat(el.value)||0; });
    const discount = parseFloat(document.getElementById('invoiceDiscount')?.value)||0;
    const net = Math.max(0, subtotal - discount);
    const curr = getCurrency();
    const subEl = document.getElementById('invoiceSubtotalDisplay');
    const totEl = document.getElementById('invoiceTotalDisplay');
    if (subEl) subEl.textContent = subtotal.toLocaleString() + ' ' + curr;
    if (totEl) totEl.textContent = net.toLocaleString() + ' ' + curr;
};

window.saveInvoice = async function() {
    const type = document.getElementById('invoiceType')?.value || 'patient';
    const curr = getCurrency();
    let entityName = '', patientId = null;

    if (type === 'patient') {
        patientId = parseInt(document.getElementById('invoicePatientId').value);
        const pRows = await dbGetAll('patients');
        const patient = pRows.find(r => r.id == patientId);
        if (!patient) { showToast('اختر مريضاً', 'error'); return; }
        entityName = patient.name;
    } else {
        entityName = (document.getElementById('invoiceSupplierName')?.value || '').trim();
        if (!entityName) { showToast('ادخل اسم المورد', 'error'); return; }
    }

    const items = [];
    document.querySelectorAll('.invoice-item').forEach(row => {
        const desc   = row.querySelector('.inv-desc').value.trim();
        const amount = parseFloat(row.querySelector('.inv-amount').value) || 0;
        if (desc || amount) items.push({ desc, amount });
    });
    if (!items.length) { showToast('أضف بنداً واحداً على الأقل', 'error'); return; }

    const subtotal = items.reduce((s,i) => s + i.amount, 0);
    const discount = parseFloat(document.getElementById('invoiceDiscount')?.value) || 0;
    const total    = Math.max(0, subtotal - discount);
    const paid     = parseFloat(document.getElementById('invoicePaid').value) || 0;
    const notes    = document.getElementById('invoiceNotes').value.trim() || null;

    // ✅ snake_case يطابق الـ Supabase schema الفعلي
    const displayName = type === 'supplier' ? `🏢 ${entityName}` : entityName;

    await dbInsert('invoices', {
        patient_id:   patientId,
        patient_name: displayName,
        date:         document.getElementById('invoiceDate').value || today(),
        due_date:     document.getElementById('invoiceDueDate').value || null,
        items,
        total,
        paid,
        notes:  document.getElementById('invoiceNotes').value || null,
        status: paid >= total ? 'paid' : paid > 0 ? 'partial' : 'unpaid'
    });
    closeModal('createInvoiceModal');
    showToast('✅ تم حفظ الفاتورة', 'success');
    loadInvoices();
};

window.deleteInvoice = async function(id) {
    if (!confirm('Delete this invoice?')) return;
    await dbDelete('invoices', id);
    loadInvoices();
    showToast('Invoice deleted');
};

window.printInvoice = async function(id) {
    const invRows = await dbGetAll('invoices'); const inv = invRows.find(r=>r.id==id);
    const s = getSettings();
    const curr = getCurrency();
    const due = inv.total - inv.paid;
    const logoHtml = s.logo ? `<img src="${s.logo}" style="height:60px;object-fit:contain;margin-bottom:8px;">` : `<div style="font-size:32px;">🦷</div>`;
    const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Invoice #${String(inv.id).padStart(4,'0')}</title>
    <style>
        body{font-family:Arial,sans-serif;margin:0;padding:32px;color:#1e293b;max-width:700px;margin:0 auto;}
        .header{text-align:center;margin-bottom:28px;padding-bottom:20px;border-bottom:2px solid #e2e8f0;}
        .clinic-name{font-size:24px;font-weight:800;color:#2563eb;margin:4px 0;}
        .meta{display:flex;justify-content:space-between;margin-bottom:20px;font-size:13px;}
        table{width:100%;border-collapse:collapse;margin:16px 0;}
        th{background:#f1f5f9;padding:10px 12px;text-align:left;font-size:12px;color:#64748b;text-transform:uppercase;}
        td{padding:10px 12px;border-bottom:1px solid #f1f5f9;font-size:13px;}
        .totals{margin-top:12px;text-align:right;}
        .totals div{margin:4px 0;font-size:13px;}
        .due{font-size:18px;font-weight:800;color:${due>0?'#ef4444':'#16a34a'};}
        @media print{@page{margin:20mm}body{padding:0}}
    </style></head><body>
    <div class="header">
        ${logoHtml}
        <div class="clinic-name">${s.clinicName || 'DentalClinic'}</div>
        <div style="font-size:12px;color:#64748b;">${s.phone || ''} ${s.address ? '| '+s.address : ''}</div>
    </div>
    <div class="meta">
        <div><strong>Invoice #${String(inv.id).padStart(4,'0')}</strong><br><span style="color:#64748b">Patient: ${inv.patientName}</span></div>
        <div style="text-align:right"><span style="color:#64748b">Date: ${inv.date}</span>${inv.dueDate ? '<br><span style="color:#64748b">Due: '+inv.dueDate+'</span>' : ''}</div>
    </div>
    <table>
        <thead><tr><th>Description</th><th style="text-align:right">Amount</th></tr></thead>
        <tbody>${inv.items.map(item=>`<tr><td>${item.desc}</td><td style="text-align:right">${item.amount} ${curr}</td></tr>`).join('')}</tbody>
    </table>
    <div class="totals">
        <div>Total: <strong>${inv.total} ${curr}</strong></div>
        <div style="color:#16a34a">Paid: <strong>${inv.paid} ${curr}</strong></div>
        <div class="due">Due: ${due} ${curr}</div>
    </div>
    ${inv.notes ? '<p style="margin-top:20px;font-size:12px;color:#64748b;border-top:1px solid #e2e8f0;padding-top:12px">Notes: '+inv.notes+'</p>' : ''}
    <script>window.onload=()=>{window.print();}<\/script></body></html>`;
    const w = window.open('', '_blank', 'width=800,height=900');
    w.document.write(html); w.document.close();
};

// ── 26. REMINDERS ────────────────────────
window.checkReminders = async function() {
    const appts = await dbGetAll('appointments');
    const now = new Date();
    const todayStr = today();
    const tomorrowStr = new Date(now.getTime() + 86400000).toISOString().split('T')[0];

    const todayAppts    = appts.filter(a => a.date === todayStr && a.status !== 'Cancelled');
    const tomorrowAppts = appts.filter(a => a.date === tomorrowStr && a.status !== 'Cancelled');
    const overdueAppts  = appts.filter(a => a.date < todayStr && a.status === 'Waiting');

    const total = overdueAppts.length + tomorrowAppts.length;
    const badge = document.getElementById('notifBadge');
    if (badge) {
        badge.textContent = total;
        total > 0 ? badge.classList.remove('hidden') : badge.classList.add('hidden');
        badge.classList.toggle('flex', total > 0);
    }

    const renderList = (appts, emptyMsg) => {
        if (!appts.length) return `<p class="text-sm text-gray-400 py-2">${emptyMsg}</p>`;
        return appts.map(a => `
            <div class="flex items-center justify-between py-2.5 border-b border-gray-50 last:border-0">
                <div>
                    <p class="font-semibold text-gray-700 text-sm">${a.patient_name||a.patientName||''}</p>
                    <p class="text-xs text-gray-400">${a.time || '--:--'} ${a.complaint ? '· '+a.complaint : ''}</p>
                </div>
                <div class="flex items-center gap-2">
                    <span class="badge badge-${(a.status||'waiting').toLowerCase()}">${a.status||'Waiting'}</span>
                    <button onclick="openPatientProfile(${a.patient_id||a.patientId})" class="btn btn-outline text-xs px-2 py-1"><i class="fa-solid fa-user"></i></button>
                </div>
            </div>`).join('');
    };

    document.getElementById('remindersToday').innerHTML = renderList(todayAppts, 'No appointments today');
    document.getElementById('remindersTomorrow').innerHTML = renderList(tomorrowAppts, 'No appointments tomorrow');
    document.getElementById('remindersOverdue').innerHTML = renderList(overdueAppts, 'No missed appointments ✓');
};

// ── 27. EXCEL EXPORT ─────────────────────
window.exportExcel = async function() {
    if (typeof XLSX === 'undefined') { showToast('Excel library loading, try again', 'error'); return; }
    const curr = getCurrency();
    const patients     = await dbGetAll('patients');
    const treatments   = await dbGetAll('treatments');
    const appointments = await dbGetAll('appointments');
    const expenses     = await dbGetAll('expenses');
    const invoices     = await dbGetAll('invoices');

    const wb = XLSX.utils.book_new();

    const pData = [['ID','Name','Phone','Age','Gender','Pregnant','Breastfeeding','Medical History','Created At']];
    patients.forEach(p => pData.push([p.id, p.name, p.phone, p.age||'', p.gender||'',
        p.is_pregnant ? 'Yes' : 'No',
        p.is_breastfeeding ? 'Yes' : 'No',
        p.medical_history||'', p.created_at||'']));
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(pData), 'Patients');

    const tData = [['ID','Patient','Tooth','Procedure','Total','Paid','Remaining','Date']];
    treatments.forEach(tr => tData.push([tr.id, tr.patient_name||tr.patientName, tr.tooth_number||tr.toothNumber||'', tr.procedure||'',
        tr.total_cost||tr.totalCost||0, tr.paid||0, (parseFloat(tr.total_cost||tr.totalCost)||0)-(parseFloat(tr.paid)||0), tr.date||'']));
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(tData), 'Treatments');

    const aData = [['ID','Patient','Date','Time','Status','Complaint']];
    appointments.forEach(a => aData.push([a.id, a.patient_name||a.patientName, a.date, a.time||'', a.status||'', a.complaint||'']));
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(aData), 'Appointments');

    const eData = [['ID','Item','Category','Amount ('+curr+')','Date']];
    expenses.forEach(e => eData.push([e.id, e.item, e.category||'', e.amount||0, e.date||'']));
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(eData), 'Expenses');

    if (invoices.length) {
        const iData = [['#','Patient','Date','Total','Paid','Due','Status']];
        invoices.forEach(i => iData.push([i.id, i.patient_name||i.patientName, i.date, i.total, i.paid, i.total-i.paid, i.status||'']));
        XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(iData), 'Invoices');
    }

    try {
        const labOrders = await dbGetAll('lab_orders');
        if (labOrders.length) {
            const lData = [['#','Patient','Lab','Work Type','Status','Due Date','Cost','Paid','Owed','Notes']];
            labOrders.forEach(o => {
                const cost = parseFloat(o.cost)||0;
                const paid = parseFloat(o.paid_to_lab||o.paidToLab)||0;
                lData.push([o.id, o.patient_name||o.patientName||'', o.lab_name||o.labName||'',
                    o.work_type||o.workType||'', o.status||'', o.due_date||o.dueDate||'',
                    cost, paid, Math.max(0,cost-paid), o.notes||'']);
            });
            XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(lData), 'Lab Orders');
        }
    } catch(e) {}

    try {
        const inventory = await dbGetAll('inventory');
        if (inventory.length) {
            const invData = [['#','Item','Category','Qty','Min Qty','Unit','Unit Cost','Stock Value','Supplier','Expiry']];
            inventory.forEach(item => {
                const qty  = parseFloat(item.qty)||0;
                const cost = parseFloat(item.unit_cost||item.unitCost)||0;
                invData.push([item.id, item.name, item.category||'', qty,
                    item.min_qty||item.minQty||0, item.unit||'',
                    cost, (qty*cost).toFixed(2), item.supplier||'', item.expiry||'']);
            });
            XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(invData), 'Inventory');
        }
    } catch(e) {}

    const totalRevenue = treatments.reduce((s,tr) => s+(parseFloat(tr.total_cost||tr.totalCost)||0), 0);
    const totalPaid    = treatments.reduce((s,tr) => s+(parseFloat(tr.paid)||0), 0);
    const totalExp     = expenses.reduce((s,e) => s+(parseFloat(e.amount)||0), 0);
    const sumData = [
        ['Metric', 'Value ('+curr+')'],
        ['Total Revenue', totalRevenue],
        ['Total Collected', totalPaid],
        ['Outstanding Debt', totalRevenue - totalPaid],
        ['Total Expenses', totalExp],
        ['Net Profit', totalPaid - totalExp],
        ['Total Patients', patients.length],
        ['Total Appointments', appointments.length],
        ['Total Treatments', treatments.length],
    ];
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(sumData), 'Summary');

    XLSX.writeFile(wb, `DentalClinic_Report_${today()}.xlsx`);
    showToast('Excel exported!', 'success');
};

// ── 28. CHARTS ───────────────────────────
let revenueChartInstance = null;
let treatmentChartInstance = null;

async function renderCharts() {
    const treatments = await dbGetAll('treatments');

    const months = [];
    const revenueData = [];
    const paidData = [];
    for (let i = 5; i >= 0; i--) {
        const d = new Date();
        d.setMonth(d.getMonth() - i);
        const key = d.toISOString().slice(0, 7);
        const label = d.toLocaleString('default', { month: 'short', year: '2-digit' });
        months.push(label);
        const monthTreats = treatments.filter(tr => (tr.date||'').startsWith(key));
        revenueData.push(monthTreats.reduce((s,tr) => s+(parseFloat(tr.total_cost||tr.totalCost)||0), 0));
        paidData.push(monthTreats.reduce((s,tr) => s+(parseFloat(tr.paid)||0), 0));
    }

    const isDark = document.body.classList.contains('dark');
    const gridColor = isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.06)';
    const textColor = isDark ? '#94a3b8' : '#64748b';

    const rCanvas = document.getElementById('revenueChart');
    if (rCanvas) {
        if (revenueChartInstance) revenueChartInstance.destroy();
        revenueChartInstance = new Chart(rCanvas, {
            type: 'bar',
            data: {
                labels: months,
                datasets: [
                    { label: 'Billed', data: revenueData, backgroundColor: 'rgba(37,99,235,0.15)', borderColor: '#2563eb', borderWidth: 2, borderRadius: 6 },
                    { label: 'Collected', data: paidData, backgroundColor: 'rgba(34,197,94,0.15)', borderColor: '#22c55e', borderWidth: 2, borderRadius: 6 }
                ]
            },
            options: { responsive:true, plugins:{ legend:{labels:{color:textColor,font:{size:11}}} }, scales:{x:{grid:{color:gridColor},ticks:{color:textColor}},y:{grid:{color:gridColor},ticks:{color:textColor}}} }
        });
    }

    const procCount = {};
    treatments.forEach(tr => {
        const p = (tr.procedure || 'Other').split(' ')[0];
        procCount[p] = (procCount[p]||0) + 1;
    });
    const sorted = Object.entries(procCount).sort((a,b)=>b[1]-a[1]).slice(0,7);
    const tCanvas = document.getElementById('treatmentChart');
    if (tCanvas) {
        if (treatmentChartInstance) treatmentChartInstance.destroy();
        treatmentChartInstance = new Chart(tCanvas, {
            type: 'doughnut',
            data: {
                labels: sorted.map(e=>e[0]),
                datasets: [{
                    data: sorted.map(e=>e[1]),
                    backgroundColor: ['#2563eb','#22c55e','#f59e0b','#ef4444','#8b5cf6','#06b6d4','#ec4899'],
                    borderWidth: 2, borderColor: isDark ? '#1e293b' : '#ffffff'
                }]
            },
            options: { responsive:true, plugins:{ legend:{position:'right',labels:{color:textColor,font:{size:11},boxWidth:12}} } }
        });
    }
}

function renderReportKpis(treatments, expenses, patients, appointments) {
    const curr = getCurrency();
    const totalRevenue = treatments.reduce((s,tr)=>s+(parseFloat(tr.total_cost||tr.totalCost)||0),0);
    const totalPaid    = treatments.reduce((s,tr)=>s+(parseFloat(tr.paid)||0),0);
    const totalExp     = expenses.reduce((s,e)=>s+(parseFloat(e.amount)||0),0);
    const netProfit    = totalPaid - totalExp;
    const kpis = [
        { label:'Total Revenue', value:`${totalRevenue} ${curr}`, icon:'fa-coins', color:'blue' },
        { label:'Collected', value:`${totalPaid} ${curr}`, icon:'fa-circle-check', color:'green' },
        { label:'Total Expenses', value:`${totalExp} ${curr}`, icon:'fa-receipt', color:'orange' },
        { label:'Net Profit', value:`${netProfit} ${curr}`, icon:'fa-chart-line', color: netProfit>=0?'emerald':'red' },
    ];
    const colors = { blue:'bg-blue-50 text-blue-600', green:'bg-green-50 text-green-600', orange:'bg-orange-50 text-orange-500', emerald:'bg-emerald-50 text-emerald-600', red:'bg-red-50 text-red-600' };
    document.getElementById('reportKpis').innerHTML = kpis.map(k=>`
        <div class="bg-white rounded-xl border border-gray-100 p-4 flex items-center gap-3 stat-card">
            <div class="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${colors[k.color]}"><i class="fa-solid ${k.icon}"></i></div>
            <div><p class="text-xs text-gray-400 font-medium">${k.label}</p><p class="font-bold text-gray-800 text-base">${k.value}</p></div>
        </div>`).join('');
}

// ── 23. INIT ─────────────────────────────
window.onload = async function() {
    const savedLang = localStorage.getItem('clinicLang') || 'en';
    currentLang = savedLang;
    document.documentElement.lang = savedLang;
    document.documentElement.dir = savedLang === 'ar' ? 'rtl' : 'ltr';
    document.body.style.fontFamily = savedLang === 'ar' ? "'Cairo', 'DM Sans', sans-serif" : "'DM Sans', 'Cairo', sans-serif";

    applyRoleUI();

    document.querySelectorAll('[data-t]').forEach(el => {
        const key = el.getAttribute('data-t');
        const attr = el.getAttribute('data-t-attr');
        if (attr) { el.setAttribute(attr, t(key)); }
        else { el.innerHTML = t(key); }
    });

    const langBtn = document.getElementById('langToggleBtn');
    if (langBtn) langBtn.innerHTML = currentLang === 'ar' ? '🌐 EN' : '🌐 عربي';

    const apptDate = document.getElementById('appointmentDate');
    if (apptDate) apptDate.value = today();

    loadSettingsForm();

    if (localStorage.getItem('clinicDarkMode') === '1') {
        document.body.classList.add('dark');
        const btn = document.getElementById('darkModeBtn');
        if (btn) btn.innerHTML = '<i class="fa-solid fa-sun"></i>';
    }

    await loadPatientsDropdown();

    setTimeout(checkReminders, 500);

    if (window.upgradeToothActionModal) upgradeToothActionModal();
    if (window.upgradeChartLegend)      upgradeChartLegend();

    if (window.initSupabase) {
        const sbBadge = document.getElementById('syncBadge');
        if (sbBadge) sbBadge.classList.remove('hidden');
        initSupabase().then(ok => {
            if (ok) {
                checkInventoryAlerts();
                loadSettingsFromDB();
            }
        });
    }

    setTimeout(() => {
        if (window.checkInventoryAlerts) checkInventoryAlerts();
    }, 1000);

    updateDashboard();
};

// ══════════════════════════════════════════════════════════════════
//  modules.js  —  Inventory + Lab Accounting
// ══════════════════════════════════════════════════════════════════

window.loadInventory = async function() {
    const catFilter = document.getElementById('invCatFilter')?.value || '';
    let items = await dbGetAll('inventory');
    const curr = getCurrency();
    let filtered = catFilter ? items.filter(i => i.category === catFilter) : items;

    const low      = filtered.filter(i => (parseFloat(i.qty)||0) <= (parseFloat(i.min_qty||i.minQty)||0) && (parseFloat(i.qty)||0) > 0);
    const critical = filtered.filter(i => (parseFloat(i.qty)||0) === 0);
    const cats     = [...new Set(filtered.map(i => i.category||'other'))].length;
    const totalVal = filtered.reduce((s,i) => s + (parseFloat(i.qty)||0)*(parseFloat(i.unit_cost||i.unitCost)||0), 0);

    const set = (id, v) => { const el = document.getElementById(id); if(el) el.textContent = v; };
    set('invKpiTotal',    filtered.length);
    set('invKpiLow',      low.length + critical.length);
    set('invKpiCats',     cats);
    set('invKpiValue',    totalVal.toLocaleString() + ' ' + curr);

    const tbody = document.getElementById('inventoryBody');
    const empty = document.getElementById('inventoryEmpty');
    if (!tbody) return;

    if (!filtered.length) {
        tbody.innerHTML = '';
        empty?.classList.remove('hidden');
        return;
    }
    empty?.classList.add('hidden');

    const catIcons = { medicine:'💊', consumable:'🩺', equipment:'🔧', lab_material:'🔬', other:'📦' };

    filtered.sort((a,b) => {
        const scoreA = parseFloat(a.qty)===0 ? 0 : parseFloat(a.qty)<=(parseFloat(a.min_qty||a.minQty)||0) ? 1 : 2;
        const scoreB = parseFloat(b.qty)===0 ? 0 : parseFloat(b.qty)<=(parseFloat(b.min_qty||b.minQty)||0) ? 1 : 2;
        return scoreA - scoreB || (a.name||'').localeCompare(b.name||'');
    });

    tbody.innerHTML = filtered.map(item => {
        const qty     = parseFloat(item.qty) || 0;
        const minQty  = parseFloat(item.min_qty || item.minQty) || 0;
        const cost    = parseFloat(item.unit_cost || item.unitCost) || 0;
        const expiry  = item.expiry;
        const isCrit  = qty === 0;
        const isLow   = !isCrit && qty <= minQty;

        const rowCls  = isCrit ? 'bg-red-50 border-l-4 border-red-400' : isLow ? 'bg-amber-50 border-l-4 border-amber-400' : '';
        const qtyHtml = isCrit
            ? `<span class="inline-flex items-center gap-1 px-2 py-0.5 bg-red-100 text-red-700 rounded-full font-bold text-xs">0 <span class="text-[9px]">OUT</span></span>`
            : isLow
            ? `<span class="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full font-bold text-xs">${qty} ⚠️</span>`
            : `<span class="font-semibold text-green-700">${qty}</span>`;

        let expiryHtml = '—';
        if (expiry) {
            const days = Math.floor((new Date(expiry) - new Date()) / 86400000);
            const cls  = days < 30 ? 'text-red-600 font-bold' : days < 90 ? 'text-amber-600' : 'text-gray-400';
            expiryHtml = `<span class="${cls}">${expiry}${days < 30 ? ' ⚠️' : ''}</span>`;
        }

        return `<tr class="border-b border-gray-50 hover:bg-slate-50 transition ${rowCls}">
            <td class="px-4 py-3">
                <div class="font-semibold text-gray-800 text-sm">${item.name||''}</div>
                ${item.supplier ? `<div class="text-xs text-gray-400">${item.supplier}</div>` : ''}
                ${isCrit ? '<span class="text-[9px] bg-red-100 text-red-600 px-1.5 py-0.5 rounded-full font-bold">OUT OF STOCK</span>' : ''}
                ${isLow  ? '<span class="text-[9px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full font-bold">LOW STOCK</span>' : ''}
            </td>
            <td class="px-4 py-3 text-sm">${catIcons[item.category]||'📦'} <span class="text-gray-500">${item.category||''}</span></td>
            <td class="px-4 py-3 text-center">${qtyHtml}</td>
            <td class="px-4 py-3 text-center text-gray-400 text-sm">${minQty}</td>
            <td class="px-4 py-3 text-sm text-gray-500">${item.unit||'pcs'}</td>
            <td class="px-4 py-3 text-right text-sm text-gray-600">${cost ? cost.toLocaleString()+' '+curr : '—'}</td>
            <td class="px-4 py-3 text-sm">${expiryHtml}</td>
            <td class="px-4 py-3 text-center">
                <div class="flex gap-1 justify-center">
                    <button onclick="openRestockModal(${item.id},'${(item.name||'').replace(/'/g,'&#39;')}')"
                        class="btn btn-green text-xs px-2 py-1" title="Restock"><i class="fa-solid fa-plus"></i></button>
                    <button onclick="editInventoryItem(${item.id})"
                        class="btn btn-outline text-xs px-2 py-1" title="Edit"><i class="fa-solid fa-pen"></i></button>
                    <button onclick="deleteInventoryItem(${item.id})"
                        class="btn btn-gray text-xs px-2 py-1" title="Delete"><i class="fa-solid fa-trash"></i></button>
                </div>
            </td>
        </tr>`;
    }).join('');
};

window.saveInventoryItem = async function(editId = null) {
    const name = document.getElementById('invName').value.trim();
    const qty  = parseFloat(document.getElementById('invQty').value) || 0;
    if (!name) { showToast('Item name required', 'error'); return; }

    const data = {
        name,
        category:  document.getElementById('invCategory').value,
        unit:      document.getElementById('invUnit').value || 'pcs',
        qty,
        min_qty:   parseFloat(document.getElementById('invMin').value) || 0,
        unit_cost: parseFloat(document.getElementById('invUnitCost').value) || 0,
        supplier:  document.getElementById('invSupplier').value,
        expiry:    document.getElementById('invExpiry').value || null,
        last_restock: today(),
        notes:     document.getElementById('invNotes')?.value || '',
    };

    if (editId) {
        await dbUpdate('inventory', editId, data);
        showToast('Item updated ✓', 'success');
    } else {
        await dbInsert('inventory', data);
        showToast('Item added ✓', 'success');
        await dbInsert('inventory_log', {
            item_name: name, type: 'restock',
            qty_change: qty, cost: data.unit_cost * qty,
            note: 'Initial stock', date: today()
        }).catch(() => {});
    }
    closeModal('addInvModal');
    loadInventory();
    checkInventoryAlerts();
};

window.openRestockModal = function(id, name) {
    document.getElementById('restockItemId').value = id;
    document.getElementById('restockItemName').textContent = name;
    document.getElementById('restockQty').value = '';
    document.getElementById('restockCost').value = '';
    document.getElementById('restockExpiry').value = '';
    openModal('restockModal');
};

window.confirmRestock = async function() {
    const id  = parseInt(document.getElementById('restockItemId').value);
    const qty = parseFloat(document.getElementById('restockQty').value) || 0;
    if (!qty) { showToast('Enter quantity', 'error'); return; }

    const all = await dbGetAll('inventory');
    const current = all.find(i => i.id == id);
    if (!current) return;

    const newQty   = (parseFloat(current.qty)||0) + qty;
    const newCost  = document.getElementById('restockCost').value ? parseFloat(document.getElementById('restockCost').value) : undefined;
    const newExpiry= document.getElementById('restockExpiry').value || undefined;

    const updates = {
        qty: newQty,
        last_restock: today(),
        ...(newCost   ? { unit_cost: newCost }   : {}),
        ...(newExpiry ? { expiry: newExpiry }     : {}),
    };

    await dbUpdate('inventory', id, updates);
    await dbInsert('inventory_log', {
        item_id: id, item_name: current.name,
        type: 'restock', qty_change: qty,
        cost: (newCost||0) * qty,
        note: 'Manual restock', date: today()
    }).catch(() => {});

    closeModal('restockModal');
    showToast(`+${qty} ${current.unit||'pcs'} added ✓`, 'success');
    loadInventory();
    checkInventoryAlerts();
};

window.deleteInventoryItem = async function(id) {
    if (!confirm('Delete this item from inventory?')) return;
    await dbDelete('inventory', id);
    loadInventory();
    showToast('Item removed');
};

window.editInventoryItem = async function(id) {
    const all = await dbGetAll('inventory');
    const item = all.find(i => i.id == id);
    if (!item) return;

    document.getElementById('invName').value     = item.name || '';
    document.getElementById('invCategory').value = item.category || 'consumable';
    document.getElementById('invUnit').value     = item.unit || 'pcs';
    document.getElementById('invQty').value      = item.qty || 0;
    document.getElementById('invMin').value      = item.min_qty || item.minQty || 0;
    document.getElementById('invUnitCost').value = item.unit_cost || item.unitCost || 0;
    document.getElementById('invSupplier').value = item.supplier || '';
    document.getElementById('invExpiry').value   = item.expiry || '';
    if (document.getElementById('invNotes'))
        document.getElementById('invNotes').value = item.notes || '';

    const saveBtn = document.getElementById('invSaveBtn');
    if (saveBtn) {
        saveBtn.textContent = 'Update Item';
        saveBtn.onclick = async () => { await saveInventoryItem(id); saveBtn.textContent = 'Save Item'; saveBtn.onclick = () => saveInventoryItem(); };
    }
    openModal('addInvModal');
};

window.checkInventoryAlerts = async function() {
    const items = await dbGetAll('inventory');
    const lowItems = items.filter(i => (parseFloat(i.qty)||0) <= (parseFloat(i.min_qty||i.minQty)||0));
    const badge = document.getElementById('invAlertBadge');

    if (badge) {
        if (lowItems.length > 0) {
            badge.textContent = lowItems.length;
            badge.classList.remove('hidden');
        } else {
            badge.classList.add('hidden');
        }
    }

    const critical = lowItems.filter(i => parseFloat(i.qty) === 0);
    if (critical.length > 0 && !sessionStorage.getItem('invAlertShown')) {
        sessionStorage.setItem('invAlertShown', '1');
        showToast(`⚠️ ${critical.length} item(s) out of stock!`, 'warning');
    }

    return lowItems;
};

// ══════════════════════════════════════════════════════════════════
//  LAB ACCOUNTING
// ══════════════════════════════════════════════════════════════════
let labCurrentFilter = 'all';

window.setLabFilter = function(filter) {
    labCurrentFilter = filter;
    document.querySelectorAll('[id^="lf-"]').forEach(btn => {
        btn.className = btn.id === `lf-${filter}` ? 'btn btn-blue text-xs' : 'btn btn-gray text-xs';
    });
    loadLabOrders();
};

window.loadLabOrders = async function() {
    const orders = await dbGetAll('lab_orders');
    const curr = getCurrency();

    const pending    = orders.filter(o => o.status === 'pending').length;
    const inProgress = orders.filter(o => o.status === 'in_progress').length;
    const ready      = orders.filter(o => o.status === 'ready').length;
    const totalCost  = orders.reduce((s,o) => s + (parseFloat(o.cost)||0), 0);
    const totalPaid  = orders.reduce((s,o) => s + (parseFloat(o.paid_to_lab||o.paidToLab)||0), 0);
    const totalOwed  = totalCost - totalPaid;

    const set = (id, v) => { const el = document.getElementById(id); if(el) el.textContent = v; };
    set('labKpiPending',  pending);
    set('labKpiInProg',   inProgress);
    set('labKpiReady',    ready);
    set('labKpiCost',     totalCost.toLocaleString() + ' ' + curr);
    set('labKpiPaid',     totalPaid.toLocaleString() + ' ' + curr);
    set('labKpiOwed',     totalOwed.toLocaleString() + ' ' + curr);

    const filtered = labCurrentFilter === 'all' ? orders
        : orders.filter(o => o.status === labCurrentFilter);

    filtered.sort((a,b) => {
        const rank = { pending:0, in_progress:1, ready:2, delivered:3 };
        return (rank[a.status]||9) - (rank[b.status]||9) ||
               new Date(a.due_date||a.dueDate||0) - new Date(b.due_date||b.dueDate||0);
    });

    const grid  = document.getElementById('labOrdersGrid');
    const empty = document.getElementById('labOrdersEmpty');
    if (!grid) return;

    if (!filtered.length) {
        grid.innerHTML = '';
        empty?.classList.remove('hidden');
        return;
    }
    empty?.classList.add('hidden');

    const statusInfo = {
        pending:     { label:'Pending',     bg:'bg-orange-50', border:'border-orange-200', text:'text-orange-700', icon:'⏳' },
        in_progress: { label:'In Progress', bg:'bg-blue-50',   border:'border-blue-200',   text:'text-blue-700',   icon:'🔧' },
        ready:       { label:'Ready ✓',     bg:'bg-green-50',  border:'border-green-200',  text:'text-green-700',  icon:'✅' },
        delivered:   { label:'Delivered',   bg:'bg-gray-50',   border:'border-gray-200',   text:'text-gray-600',   icon:'📦' },
    };

    const workLabels = {
        crown:'👑 Crown (تاج)', bridge:'🌉 Bridge (جسر)', full_denture:'🦷 Full Denture',
        partial:'🔗 Partial (جزئي)', veneer:'✨ Veneer', implant_crown:'🔩 Implant Crown',
        night_guard:'🌙 Night Guard', retainer:'📎 Retainer', other:'📋 Other'
    };

    grid.innerHTML = filtered.map(order => {
        const si       = statusInfo[order.status] || statusInfo.pending;
        const dueDate  = order.due_date || order.dueDate;
        const cost     = parseFloat(order.cost) || 0;
        const paid     = parseFloat(order.paid_to_lab || order.paidToLab) || 0;
        const owed     = cost - paid;
        const isLate   = dueDate && new Date(dueDate) < new Date() && order.status !== 'delivered';
        const isUrgent = order.priority === 'urgent';

        return `<div class="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm hover:shadow-md transition-shadow">
            <div class="flex justify-between items-start mb-3">
                <div class="flex-1 min-w-0">
                    <div class="flex items-center gap-2 mb-1 flex-wrap">
                        ${isUrgent ? '<span class="text-[9px] bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-bold">🔴 URGENT</span>' : ''}
                        <span class="text-[10px] font-mono text-gray-300">#${String(order.id).padStart(4,'0')}</span>
                    </div>
                    <p class="font-bold text-gray-800 text-sm truncate">${order.patient_name||order.patientName||'—'}</p>
                    <p class="text-xs text-gray-500">${workLabels[order.work_type||order.workType]||order.work_type||''}</p>
                </div>
                <span class="text-[10px] font-semibold px-2 py-1 rounded-lg border ${si.bg} ${si.border} ${si.text} whitespace-nowrap">
                    ${si.icon} ${si.label}
                </span>
            </div>
            <div class="grid grid-cols-2 gap-x-3 gap-y-1 text-xs text-gray-500 mb-3 bg-slate-50 rounded-xl p-2.5">
                <div class="flex items-center gap-1"><span>🏛️</span><span class="font-medium text-gray-700">${order.lab_name||order.labName||'—'}</span></div>
                <div class="flex items-center gap-1"><span>📅</span>
                    <span class="${isLate?'text-red-600 font-bold':'text-gray-600'}">${dueDate||'—'}${isLate?' ⚠️':''}</span>
                </div>
                ${order.teeth ? `<div class="flex items-center gap-1"><span>🦷</span><span>${order.teeth}</span></div>` : ''}
                ${order.material ? `<div class="flex items-center gap-1"><span>🧱</span><span>${order.material}${(order.shade)?` / ${order.shade}`:''}</span></div>` : ''}
            </div>
            <div class="flex justify-between items-center bg-gradient-to-r from-slate-50 to-white rounded-xl p-2.5 border border-gray-100 mb-3">
                <div class="text-center">
                    <p class="text-[9px] text-gray-400 font-semibold uppercase">Cost</p>
                    <p class="text-sm font-bold text-gray-800">${cost.toLocaleString()}</p>
                </div>
                <div class="text-center">
                    <p class="text-[9px] text-gray-400 font-semibold uppercase">Paid</p>
                    <p class="text-sm font-bold text-green-600">${paid.toLocaleString()}</p>
                </div>
                <div class="text-center">
                    <p class="text-[9px] text-gray-400 font-semibold uppercase">Owed</p>
                    <p class="text-sm font-bold ${owed > 0 ? 'text-red-500' : 'text-green-600'}">${owed > 0 ? owed.toLocaleString() : '✓ Paid'}</p>
                </div>
                <div class="text-center">
                    <p class="text-[9px] text-gray-400 font-semibold uppercase">Currency</p>
                    <p class="text-xs font-semibold text-gray-500">${getCurrency()}</p>
                </div>
            </div>
            ${order.notes || order.status_note ? `
            <div class="text-xs text-gray-400 italic bg-yellow-50 rounded-lg px-2 py-1 mb-2 border border-yellow-100">
                💬 ${order.status_note || order.notes || ''}
            </div>` : ''}
            <div class="flex gap-2">
                <button onclick="openLabStatusModal(${order.id})"
                    class="flex-1 btn btn-outline text-xs justify-center py-2">
                    <i class="fa-solid fa-rotate mr-1"></i> Update Status
                </button>
                <button onclick="openLabPaymentModal(${order.id})"
                    class="flex-1 btn text-xs justify-center py-2" style="background:#f0fdf4;color:#15803d;border:1px solid #bbf7d0;">
                    <i class="fa-solid fa-coins mr-1"></i> Payment
                </button>
                <button onclick="deleteLabOrder(${order.id})"
                    class="btn btn-gray text-xs px-2.5 py-2">
                    <i class="fa-solid fa-trash"></i>
                </button>
            </div>
        </div>`;
    }).join('');
};

window.saveLabOrder = async function() {
    const patientSelect = document.getElementById('labPatient');
    const patientId     = parseInt(patientSelect?.value);
    const labName       = document.getElementById('labName').value.trim();
    const workType      = document.getElementById('labWorkType').value;

    if (!patientId || !labName || !workType) {
        showToast('Fill required fields', 'error'); return;
    }

    let patientName = patientSelect?.options[patientSelect.selectedIndex]?.text || '';

    const data = {
        patient_id:   patientId,
        patient_name: patientName,
        lab_name:     labName,
        work_type:    workType,
        teeth:        document.getElementById('labTeeth').value,
        material:     document.getElementById('labMaterial').value,
        shade:        document.getElementById('labShade').value,
        due_date:     document.getElementById('labDueDate').value || null,
        cost:         parseFloat(document.getElementById('labCost').value) || 0,
        paid_to_lab:  parseFloat(document.getElementById('labPaidToLab').value) || 0,
        priority:     document.getElementById('labPriority').value,
        notes:        document.getElementById('labNotes').value,
        status:       'pending',
        created_at:   today(),
    };

    await dbInsert('lab_orders', data);
    closeModal('addLabModal');
    showToast('Lab order created ✓', 'success');
    loadLabOrders();

    ['labName','labTeeth','labMaterial','labShade','labNotes','labCost','labPaidToLab'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = '';
    });
    document.getElementById('labDueDate').value = '';
    document.getElementById('labPriority').value = 'normal';
};

window.openLabStatusModal = async function(id) {
    const orders = await dbGetAll('lab_orders');
    const order = orders.find(o => o.id == id);
    if (!order) return;

    document.getElementById('labStatusOrderId').value = id;
    document.getElementById('labStatusPatient').textContent = `${order.patient_name||order.patientName||''} — ${order.lab_name||order.labName||''}`;
    document.getElementById('labStatusCurrent').textContent = order.status || 'pending';
    document.getElementById('labStatusNote').value = '';

    ['pending','in_progress','ready','delivered'].forEach(s => {
        const btn = document.getElementById(`labStatusBtn-${s}`);
        if (btn) btn.style.outline = order.status === s ? '2px solid #2563eb' : '';
    });

    openModal('labStatusModal');
};

window.quickLabStatus = async function(newStatus) {
    const id   = parseInt(document.getElementById('labStatusOrderId').value);
    const note = document.getElementById('labStatusNote').value;
    const updates = {
        status: newStatus,
        status_note: note || null,
        ...(newStatus === 'delivered' ? { delivered_at: today() } : {}),
    };
    await dbUpdate('lab_orders', id, updates);
    closeModal('labStatusModal');
    const labels = { pending:'Pending', in_progress:'In Progress', ready:'✅ Ready!', delivered:'Delivered' };
    showToast(`Status → ${labels[newStatus]||newStatus}`, newStatus === 'ready' ? 'success' : 'info');
    loadLabOrders();
};

window.openLabPaymentModal = async function(id) {
    const orders = await dbGetAll('lab_orders');
    const order = orders.find(o => o.id == id);
    if (!order) return;

    const curr = getCurrency();
    const cost = parseFloat(order.cost) || 0;
    const paid = parseFloat(order.paid_to_lab || order.paidToLab) || 0;
    const owed = cost - paid;

    document.getElementById('labPayOrderId').value   = id;
    document.getElementById('labPayAmount').value    = owed > 0 ? owed : '';
    document.getElementById('labPayNote').value      = '';
    document.getElementById('labPaySummary').innerHTML =
        `<div class="flex justify-between text-sm p-2 bg-slate-50 rounded-xl border">
            <span>Total Cost: <strong>${cost.toLocaleString()} ${curr}</strong></span>
            <span class="text-green-600">Paid: <strong>${paid.toLocaleString()}</strong></span>
            <span class="${owed>0?'text-red-600':'text-green-600'}">Owed: <strong>${owed > 0 ? owed.toLocaleString() : '✓'}</strong></span>
        </div>`;
    openModal('labPayModal');
};

window.submitLabPayment = async function() {
    const id     = parseInt(document.getElementById('labPayOrderId').value);
    const amount = parseFloat(document.getElementById('labPayAmount').value) || 0;
    if (!amount) { showToast('Enter payment amount', 'error'); return; }

    const orders = await dbGetAll('lab_orders');
    const order = orders.find(o => o.id == id);
    if (!order) return;

    const oldPaid = parseFloat(order.paid_to_lab || order.paidToLab) || 0;
    const newPaid = oldPaid + amount;
    const cost    = parseFloat(order.cost) || 0;

    await dbUpdate('lab_orders', id, {
        paid_to_lab: newPaid,
        status: newPaid >= cost ? 'delivered' : order.status,
    });

    await dbInsert('expenses', {
        item:     `Lab Payment — ${order.lab_name||order.labName||''} (${order.work_type||order.workType||''})`,
        category: 'lab',
        amount:   amount,
        date:     today(),
        notes:    document.getElementById('labPayNote').value || '',
    }).catch(()=>{});

    closeModal('labPayModal');
    showToast(`Payment of ${amount.toLocaleString()} ${getCurrency()} recorded ✓`, 'success');
    loadLabOrders();
};

window.deleteLabOrder = async function(id) {
    if (!confirm('Delete this lab order?')) return;
    await dbDelete('lab_orders', id);
    loadLabOrders();
    showToast('Lab order deleted');
};

// Pre-populate patient dropdown when opening lab modal
const _origOpenModal_modules = window.openModal;
window.openModal = function(modalId, extra) {
    if (modalId === 'addLabModal') {
        dbGetAll('patients').then(ps => {
            const sel = document.getElementById('labPatient');
            if (sel) sel.innerHTML = ps.map(p => `<option value="${p.id}">${p.name}</option>`).join('');
        }).catch(() => {});
    }
    if (modalId === 'addInvModal') {
        const saveBtn = document.getElementById('invSaveBtn');
        if (saveBtn) { saveBtn.textContent = 'Save Item'; saveBtn.onclick = () => saveInventoryItem(); }
    }
    if (_origOpenModal_modules) _origOpenModal_modules(modalId, extra);
    else {
        const m = document.getElementById(modalId);
        if (m) m.classList.add('open');
    }
};

window.loadLabReport = async function() {
    const el = document.getElementById('labReportSection');
    if (!el) return;

    const orders = await dbGetAll('lab_orders');
    const curr = getCurrency();
    const byLab = {};
    orders.forEach(o => {
        const lab = o.lab_name || o.labName || 'Unknown';
        if (!byLab[lab]) byLab[lab] = { count:0, cost:0, paid:0, pending:0 };
        byLab[lab].count++;
        byLab[lab].cost  += parseFloat(o.cost) || 0;
        byLab[lab].paid  += parseFloat(o.paid_to_lab || o.paidToLab) || 0;
        if (o.status !== 'delivered') byLab[lab].pending++;
    });

    el.innerHTML = `
        <h4 class="font-bold text-gray-700 mb-3 text-sm">By Lab Summary</h4>
        <div class="space-y-2">
            ${Object.entries(byLab).map(([lab, s]) => `
                <div class="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-gray-100">
                    <div>
                        <p class="font-semibold text-gray-800 text-sm">${lab}</p>
                        <p class="text-xs text-gray-400">${s.count} orders · ${s.pending} pending</p>
                    </div>
                    <div class="text-right">
                        <p class="text-sm font-bold text-gray-700">${s.cost.toLocaleString()} ${curr}</p>
                        <p class="text-xs ${s.cost-s.paid>0?'text-red-500':'text-green-500'}">
                            Owed: ${Math.max(0,s.cost-s.paid).toLocaleString()}
                        </p>
                    </div>
                </div>
            `).join('')}
        </div>
    `;
};

function toggleSidebar(){
    const sidebar = document.querySelector("aside");
    sidebar.classList.toggle("mobile-open");
}

document.querySelectorAll("table").forEach(table=>{
    const wrapper = document.createElement("div");
    wrapper.style.overflowX="auto";
    wrapper.style.width="100%";
    table.parentNode.insertBefore(wrapper, table);
    wrapper.appendChild(table);
});

// old offline_queue helper removed in favour of offline_first_patch queue
window.addEventListener('online', async () => {
    if (typeof window.syncOfflineQueue === 'function') {
        await window.syncOfflineQueue();
    } else if (typeof window.syncQueue === 'function') {
        await window.syncQueue();
    }
});

// deprecated fallback for legacy queue
async function syncOfflineData(){
    console.warn('syncOfflineData called - deprecated');
    try {
        const unsynced = await dbGetAll("offline_queue");
        for(const item of unsynced){
            await window._sb.from(item.table).insert(item.data);
            await dbDelete("offline_queue", item.id);
        }
    } catch(e){ console.warn('deprecated syncOfflineData failed', e); }
}