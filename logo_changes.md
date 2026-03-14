# تعليمات تغيير اللوجو — BitDentra

## الملفات المطلوبة في نفس الفولدر:
- `logo.png` — صورة اللوجو الكاملة (الصورة الأولى المرفوعة)
- `icon.png` — أيقونة التطبيق (الصورة الثانية المربعة)

---

## 1. تعديل `login.html`

**استبدل** الجزء ده:
```html
<div class="logo-wrap">
    <div class="logo-icon"><i class="fa-solid fa-tooth"></i></div>
    <div class="logo-name">Bit<em>Dentra</em></div>
    <div class="logo-tag" id="logoTagline">Practice Management System</div>
</div>
```

**بـ:**
```html
<div class="logo-wrap">
    <div class="logo-img-wrap">
        <img src="logo.png" alt="BitDentra Logo" style="height:72px;width:auto;object-fit:contain;"
             onerror="this.style.display='none';">
    </div>
    <div class="logo-tag" id="logoTagline">Practice Management System</div>
</div>
```

**وفي `<head>`، استبدل:**
```html
<link rel="apple-touch-icon" href="https://cdn-icons-png.flaticon.com/512/2966/2966327.png">
```
**بـ:**
```html
<link rel="apple-touch-icon" href="icon.png">
<link rel="icon" type="image/png" href="icon.png">
```

---

## 2. تعديل `index.html`

**في `<head>`، استبدل:**
```html
<link rel="apple-touch-icon" href="https://cdn-icons-png.flaticon.com/512/2966/2966327.png">
```
**بـ:**
```html
<link rel="apple-touch-icon" href="icon.png">
<link rel="icon" type="image/png" href="icon.png">
```

**في الـ sidebar، استبدل:**
```html
<div class="h-16 flex items-center justify-center border-b border-gray-100">
    <span class="text-xl font-bold text-blue-900">Bit<span class="text-blue-500">Dentra</span> <i class="fa-solid fa-tooth text-blue-400 ml-1 text-base"></i></span>
</div>
```
**بـ:**
```html
<div class="h-16 flex items-center justify-center border-b border-gray-100 px-3">
    <img src="logo.png" alt="BitDentra" style="height:36px;width:auto;object-fit:contain;"
         onerror="this.style.display='none'; this.nextElementSibling.style.display='block';">
    <span class="text-xl font-bold text-blue-900" style="display:none;">Bit<span class="text-blue-500">Dentra</span></span>
</div>
```

---

## 3. تعديل `manifest.json`

**استبدل:**
```json
"icons": [
    {
      "src": "https://cdn-icons-png.flaticon.com/512/2966/2966327.png",
      "sizes": "512x512",
      "type": "image/png"
    },
    {
      "src": "https://cdn-icons-png.flaticon.com/512/2966/2966327.png",
      "sizes": "192x192",
      "type": "image/png"
    }
  ]
```
**بـ:**
```json
"icons": [
    {
      "src": "icon.png",
      "sizes": "512x512",
      "type": "image/png"
    },
    {
      "src": "icon.png",
      "sizes": "192x192",
      "type": "image/png"
    }
  ]
```
