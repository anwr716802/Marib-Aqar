// ==================== الإعدادات 
// ==================== الإعدادات ====================
const API_BASE = '/api/proxy';
const API_KEY ='mySecretKey123XYZ';   // نفس المفتاح في Code.gs
const CLOUD_NAME = 'dxjzks7xl';   // استبدل
const UPLOAD_PRESET = 'myupload';

if (!sessionStorage.getItem('adminAuth')) {
    window.location.href = 'login.html';
}

// ==================== Debug ====================
const debugMessages = [];
function addDebug(msg, type = 'info') {
    debugMessages.push({ msg, type, time: new Date() });
    if (debugMessages.length > 5) debugMessages.shift();
    console.log(`[${type.toUpperCase()}] ${msg}`);
    renderDebug();
}
function renderDebug() {
    const area = document.getElementById('debugArea');
    if (!area) return;
    area.innerHTML = debugMessages.map(e =>
        `<div class="debug-entry debug-${e.type}">[${e.time.toLocaleTimeString()}] ${e.msg}</div>`
    ).join('');
}
function toggleDebug() {
    const area = document.getElementById('debugArea');
    area.style.display = area.style.display === 'block' ? 'none' : 'block';
    document.getElementById('debugToggle').textContent =
        area.style.display === 'block' ? 'إخفاء السجل' : 'إظهار السجل';
}
addDebug('تم تحميل لوحة التحكم', 'info');

// ==================== التنقل ====================
function showTab(name) {
    document.querySelectorAll('.tab-content').forEach(el => el.style.display = 'none');
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    const tab = document.getElementById('tab-' + name);
    if (tab) tab.style.display = 'block';
    const btn = Array.from(document.querySelectorAll('.tab-btn')).find(b => b.textContent.includes(name));
    if (btn) btn.classList.add('active');
    if (name === 'products') loadProducts();
    else if (name === 'services') loadServices();
    else if (name === 'categories') loadCategories();
    else if (name === 'settings') loadSettings();
    else if (name === 'gallery') loadGallery();
    else if (name === 'pages') loadPages();
}

// ==================== apiCall ====================
async function apiCall(action, params = {}) {
    const secured = ['addProduct','updateProduct','deleteProduct',
                     'addService','updateService','deleteService',
                     'addCategory','updateCategory','deleteCategory',
                     'updateSetting','addGalleryImage','deleteGalleryImage',
                     'updatePage'];
    if (secured.includes(action)) params.apiKey = API_KEY;
    const query = new URLSearchParams({ action, ...params });
    const url = `${API_BASE}?${query.toString()}`;
    addDebug(`إرسال: ${action}`, 'info');
    try {
        const resp = await fetch(url);
        const text = await resp.text();
        addDebug(`استجابة (${resp.status}): ${text}`, 'info');
        let data;
        try { data = JSON.parse(text); } catch (e) { return { error: 'Invalid JSON' }; }
        if (data.error) { addDebug(`خطأ: ${data.error}`, 'error'); return data; }
        addDebug(`نجاح`, 'success');
        return data;
    } catch (err) {
        addDebug(`فشل: ${err.message}`, 'error');
        return { error: err.message };
    }
}

function uploadImage(file, folder) {
    return new Promise((resolve, reject) => {
        const fd = new FormData();
        fd.append('file', file);
        fd.append('upload_preset', UPLOAD_PRESET);
        if (folder) fd.append('folder', folder);
        const xhr = new XMLHttpRequest();
        xhr.open('POST', `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`);
        xhr.upload.onprogress = (e) => {
            if (e.lengthComputable) {
                const prog = document.getElementById('prodUploadProgress');
                if (prog) { prog.style.display = 'block'; prog.value = Math.round((e.loaded/e.total)*100); }
            }
        };
        xhr.onload = () => {
            if (xhr.status === 200) {
                const data = JSON.parse(xhr.responseText);
                resolve(data.secure_url);
            } else reject('HTTP ' + xhr.status);
        };
        xhr.onerror = () => reject('Network error');
        xhr.send(fd);
    });
}

// ==================== المنتجات (موجودة) ====================
async function loadProducts() {
    const data = await apiCall('getProducts');
    const list = document.getElementById('productsList');
    if (!list || data.error || !Array.isArray(data)) { list.innerHTML = '<p>لا توجد منتجات</p>'; return; }
    const rows = data.slice(1);
    list.innerHTML = rows.map(r => `
        <div class="card">
            <img src="${r[5]}" alt="${r[1]}">
            <div class="card-info"><strong>${r[1]}</strong><br>${r[2]} - ${r[3]} ريال</div>
            <div class="card-actions">
                <button onclick="editProduct('${r[0]}','${r[1]}','${r[2]}','${r[3]}','${r[4]}','${r[5]}','${r[6]}')">✏️</button>
                <button onclick="deleteProduct('${r[0]}')">🗑️</button>
            </div>
        </div>
    `).join('');
}
// ... دوال product موجودة مسبقا (نفس الكود السابق، لم تتغير)

// ==================== الخدمات ====================
async function loadServices() {
    const data = await apiCall('getServices');
    const list = document.getElementById('servicesList');
    if (!list || data.error || !Array.isArray(data)) { list.innerHTML = '<p>لا توجد خدمات</p>'; return; }
    const rows = data.slice(1);
    list.innerHTML = rows.map(r => `
        <div class="card"><div class="card-info"><strong>${r[1]}</strong> - ${r[2]}</div>
        <div class="card-actions"><button>✏️</button><button>🗑️</button></div></div>`).join('');
}
// يمكنك إكمال دوال الخدمات بنفس نمط المنتجات (addService, edit, delete)

// ==================== الأقسام (التصنيفات) ====================
async function loadCategories() {
    const data = await apiCall('getCategories');
    const list = document.getElementById('categoriesList');
    if (!list) return;
    if (data.error || !Array.isArray(data)) { list.innerHTML = '<p>لا توجد أقسام</p>'; return; }
    const rows = data.slice(1);
    list.innerHTML = rows.map(r => `
        <div class="card">
            <div class="card-info"><strong>${r[1]}</strong> (slug: ${r[2]}, ترتيب: ${r[4]})</div>
            <div class="card-actions">
                <button onclick="editCategory('${r[0]}','${r[1]}','${r[2]}','${r[4]}')">✏️</button>
                <button onclick="deleteCategory('${r[0]}')">🗑️</button>
            </div>
        </div>
    `).join('');
}

function openCategoryForm() {
    document.getElementById('categoryFormModal').style.display = 'flex';
    document.getElementById('catFormTitle').textContent = 'إضافة قسم جديد';
    document.getElementById('categoryForm').reset();
    document.getElementById('catId').value = '';
}
function closeCategoryForm() { document.getElementById('categoryFormModal').style.display = 'none'; }
function editCategory(id, name, slug, order) {
    openCategoryForm();
    document.getElementById('catId').value = id;
    document.getElementById('catName').value = name;
    document.getElementById('catSlug').value = slug;
    document.getElementById('catOrder').value = order;
    document.getElementById('catFormTitle').textContent = 'تعديل القسم';
}
async function deleteCategory(id) {
    if (!confirm('حذف القسم؟')) return;
    const res = await apiCall('deleteCategory', { id });
    if (!res.error) loadCategories();
}
document.getElementById('categoryForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    const id = document.getElementById('catId').value;
    const cat = {
        name: document.getElementById('catName').value.trim(),
        slug: document.getElementById('catSlug').value.trim(),
        order: document.getElementById('catOrder').value || 0
    };
    if (!cat.name) return alert('الاسم مطلوب');
    if (id) {
        cat.id = id;
        await apiCall('updateCategory', cat);
    } else {
        await apiCall('addCategory', cat);
    }
    closeCategoryForm();
    loadCategories();
});

// ==================== الإعدادات ====================
async function loadSettings() {
    const data = await apiCall('getSettings');
    const container = document.getElementById('settingsFields');
    if (!container || data.error) return;
    let html = '';
    for (const [key, val] of Object.entries(data)) {
        html += `<label>${key}</label><input type="text" name="${key}" value="${val}">`;
    }
    container.innerHTML = html;
}
document.getElementById('settingsForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    const fd = new FormData(this);
    for (const [key, val] of fd.entries()) {
        await apiCall('updateSetting', { key, value: val });
    }
    alert('تم الحفظ');
});

// ==================== المعرض ====================
async function loadGallery() {
    const data = await apiCall('getGallery');
    const list = document.getElementById('galleryList');
    if (!list || data.error || !Array.isArray(data)) { list.innerHTML = '<p>لا توجد صور</p>'; return; }
    const rows = data.slice(1);
    list.innerHTML = rows.map(r => `
        <div class="card"><img src="${r[2]}" alt="${r[1]}"><div>${r[1]}</div>
        <button onclick="deleteGalleryImage('${r[0]}')">🗑️</button></div>`).join('');
}
async function deleteGalleryImage(id) {
    if (!confirm('حذف؟')) return;
    await apiCall('deleteGalleryImage', { id });
    loadGallery();
}
// ... دوال galleryForm

// ==================== الصفحات ====================
async function loadPages() {
    const data = await apiCall('getPages');
    const list = document.getElementById('pagesList');
    if (!list || data.error || !Array.isArray(data)) { list.innerHTML = '<p>لا توجد صفحات</p>'; return; }
    const rows = data.slice(1);
    list.innerHTML = rows.map(r => `
        <div class="card"><div class="card-info"><strong>${r[1]}</strong></div>
        <button onclick="editPage('${r[0]}','${r[1]}','${r[4]}','${r[5]||''}')">تعديل</button></div>`).join('');
}
function editPage(id, title, content, meta) {
    document.getElementById('pageEditModal').style.display = 'flex';
    document.getElementById('pageId').value = id;
    document.getElementById('pageTitle').value = title;
    document.getElementById('pageContent').value = content;
    document.getElementById('pageMeta').value = meta || '';
}
function closePageForm() { document.getElementById('pageEditModal').style.display = 'none'; }
document.getElementById('pageForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    const page = {
        id: document.getElementById('pageId').value,
        title: document.getElementById('pageTitle').value,
        content: document.getElementById('pageContent').value,
        meta_desc: document.getElementById('pageMeta').value
    };
    await apiCall('updatePage', page);
    closePageForm();
    loadPages();
});
// ==================== دوال المنتجات الكاملة ====================

// فتح نموذج إضافة منتج
function openProductForm() {
    document.getElementById('productFormModal').style.display = 'flex';
    document.getElementById('productFormTitle').textContent = 'إضافة منتج جديد';
    document.getElementById('productForm').reset();
    document.getElementById('prodId').value = '';
    document.getElementById('prodImageUrl').value = '';
    document.getElementById('prodImagePreview').style.display = 'none';
    document.getElementById('prodUploadProgress').style.display = 'none';
    loadCategoriesForSelect('prodCategory');
    addDebug('تم فتح نموذج إضافة منتج', 'info');
}

// إغلاق نموذج المنتج
function closeProductForm() {
    document.getElementById('productFormModal').style.display = 'none';
}

// تعديل منتج
function editProduct(id, name, cat, price, desc, img, wa) {
    openProductForm();
    document.getElementById('prodId').value = id;
    document.getElementById('prodName').value = name;
    document.getElementById('prodCategory').value = cat;
    document.getElementById('prodPrice').value = price;
    document.getElementById('prodDesc').value = desc;
    document.getElementById('prodWhatsapp').value = wa;
    document.getElementById('prodImageUrl').value = img;
    if (img) {
        document.getElementById('prodImagePreview').src = img;
        document.getElementById('prodImagePreview').style.display = 'block';
    }
    document.getElementById('productFormTitle').textContent = 'تعديل المنتج';
    addDebug('تعديل المنتج: ' + name, 'info');
}

// حذف منتج
async function deleteProduct(id) {
    if (!confirm('هل أنت متأكد من حذف هذا المنتج؟')) return;
    const res = await apiCall('deleteProduct', { id });
    if (!res.error) {
        addDebug('تم حذف المنتج', 'success');
        loadProducts();
    }
}

// تحميل التصنيفات في قائمة المنتج المنسدلة
async function loadCategoriesForSelect(selectId) {
    const select = document.getElementById(selectId);
    if (!select) {
        addDebug('عنصر select غير موجود: ' + selectId, 'error');
        return;
    }
    
    const defaultCategories = [
        { name: 'رجالي', slug: 'men' },
        { name: 'نسائي', slug: 'women' },
        { name: 'أطفال', slug: 'kids' },
        { name: 'عروض', slug: 'offers' }
    ];

    try {
        const data = await apiCall('getCategories');
        if (data && !data.error && Array.isArray(data) && data.length > 1) {
            const rows = data.slice(1);
            const categories = rows.map(row => ({ name: row[1], slug: row[2] }));
            populateSelect(select, categories);
            addDebug('تم تحميل التصنيفات من Google Sheets', 'success');
            return;
        }
    } catch (err) {
        addDebug('فشل جلب التصنيفات: ' + err.message, 'error');
    }
    
    populateSelect(select, defaultCategories);
    addDebug('تم استخدام التصنيفات الافتراضية', 'info');
}

// ملء قائمة منسدلة
function populateSelect(select, categories) {
    select.innerHTML = categories.map(cat => 
        `<option value="${cat.name}">${cat.name}</option>`
    ).join('');
}

// رفع صورة المنتج (بالنقر على زر الرفع)
document.addEventListener('click', function(e) {
    if (e.target && e.target.id === 'uploadProdImageBtn') {
        e.preventDefault();
        const fileInput = document.getElementById('prodImageFile');
        const files = fileInput.files;
        addDebug(`عدد الملفات المختارة: ${files.length}`, 'info');
        if (files.length === 0) {
            alert('اختر صورة أولاً');
            return;
        }
        const file = files[0];
        const category = document.getElementById('prodCategory').value;
        let folder = 'marib-store/products/other';
        if (category === 'رجالي') folder = 'marib-store/products/men';
        else if (category === 'نسائي') folder = 'marib-store/products/women';
        else if (category === 'أطفال') folder = 'marib-store/products/kids';
        else if (category === 'عروض') folder = 'marib-store/products/offers';
        
        addDebug(`المجلد المستهدف: ${folder}`, 'info');
        addDebug(`بدء رفع: ${file.name} (${file.size} bytes)`, 'info');
        
        uploadImage(file, folder).then(url => {
            document.getElementById('prodImageUrl').value = url;
            document.getElementById('prodImagePreview').src = url;
            document.getElementById('prodImagePreview').style.display = 'block';
            addDebug(`تم تعيين رابط الصورة: ${url}`, 'success');
        }).catch(err => {
            addDebug(`فشل الرفع: ${err}`, 'error');
            alert('خطأ في رفع الصورة: ' + err);
        });
    }
});

// حفظ المنتج
document.getElementById('productForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    const product = {
        name: document.getElementById('prodName').value.trim(),
        category: document.getElementById('prodCategory').value,
        price: document.getElementById('prodPrice').value.trim(),
        description: document.getElementById('prodDesc').value.trim(),
        image_url: document.getElementById('prodImageUrl').value.trim(),
        whatsapp: document.getElementById('prodWhatsapp').value.trim()
    };
    const id = document.getElementById('prodId').value;
    if (id) product.id = id;

    addDebug(`Payload: ${JSON.stringify(product)}`, 'info');
    
    if (!product.name) {
        addDebug('اسم المنتج فارغ', 'error');
        alert('الرجاء إدخال اسم المنتج');
        return;
    }
    if (!product.image_url) {
        addDebug('رابط الصورة فارغ', 'error');
        alert('الرجاء رفع صورة المنتج أولاً');
        return;
    }
    if (!product.category) {
        addDebug('التصنيف غير محدد', 'error');
        alert('الرجاء اختيار تصنيف');
        return;
    }

    const action = id ? 'updateProduct' : 'addProduct';
    const res = await apiCall(action, product);
    if (!res.error) {
        addDebug('تم الحفظ بنجاح', 'success');
        closeProductForm();
        loadProducts();
    }
});
// ==================== عام ====================
function logout() { sessionStorage.removeItem('adminAuth'); window.location.href = 'login.html'; }
showTab('products');
