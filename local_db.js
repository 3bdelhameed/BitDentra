// local_db.js — الدور الوحيد هو الانتظار لحين يُنشئ app.js الـ instance

(function waitForDb() {
    // app.js هو المسؤول الوحيد عن إنشاء الـ schema
    // local_db.js بس بيضمن إن window.db يتعرف بعد ما app.js يشتغل
    
    if (window.db) {
        console.log("✅ Dexie DB جاهزة من app.js");
        return;
    }

    // لو app.js اتحمل الأول، window.db موجود — لو لأ، ننتظر
    let attempts = 0;
    const interval = setInterval(() => {
        attempts++;
        if (window.db) {
            clearInterval(interval);
            console.log("✅ تم تجهيز قاعدة البيانات المحلية Dexie بنجاح!");
        }
        if (attempts > 50) {
            clearInterval(interval);
            console.error("❌ فشل تحميل Dexie DB من app.js");
        }
    }, 100);
})();

// getDexTable مساعدة للملفات الأخرى
window.getDexTable = function(tableName) {
    if (!window.db) return null;
    return window.db[tableName] || null;
};