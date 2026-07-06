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
addDebug('تم تحميل لوحة التحكم لمنصة العقارات', 'info');

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

// ==================== العقارات / العروض (موجودة) ====================
async function loadProducts() {
    const data = await apiCall('getProducts');
    const list = document.getElementById('productsList');
    if (!list || data.error || !Array.isArray(data)) { list.innerHTML = '<p>لا توجد عقارات</p>'; return; }
    const rows = data.slice(1);
    list.innerHTML = rows.map(r => {
        // إذا كان هناك عدة صور مفصولة بفاصلة، نأخذ الصورة الأولى للعرض في لوحة التحكم فقط
        const firstImg = r[5] ? r[5].split(',')[0] : '';
        return `
            <div class="card">
                <img src="${firstImg}" alt="${r[1]}">
                <div class="card-info"><strong>${r[1]}</strong><br>${r[2]} - ${r[3]} ريال</div>
                <div class="card-actions">
                    <button onclick="editProduct('${r[0]}','${r[1]}','${r[2]}','${r[3]}','${r[4]}','${r[5]}','${r[6]}')">✏️</button>
                    <button onclick="deleteProduct('${r[0]}')">🗑️</button>
                </div>
            </div>
        `;
    }).join('');
}

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

// ==================== دوال العقارات الكاملة ودعم رفع عدة صور ====================

// فتح نموذج إضافة عقار
function openProductForm() {
    document.getElementById('productFormModal').style.display = 'flex';
    document.getElementById('productFormTitle').textContent = 'إضافة عقار جديد';
    document.getElementById('productForm').reset();
    document.getElementById('prodId').value = '';
    document.getElementById('prodImageUrl').value = '';
    
    // تفريغ حاوية المعاينة المتعددة
    const previewContainer = document.getElementById('prodImagePreviewContainer') || document.getElementById('prodImagePreview');
    if (previewContainer) {
        previewContainer.innerHTML = '';
        previewContainer.style.display = 'none';
    }
    
    document.getElementById('prodUploadProgress').style.display = 'none';
    loadCategoriesForSelect('prodCategory');
    addDebug('تم فتح نموذج إضافة عقار', 'info');
}

// إغلاق نموذج العقار
function closeProductForm() {
    document.getElementById('productFormModal').style.display = 'none';
}

// تعديل عقار
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
        const previewContainer = document.getElementById('prodImagePreviewContainer') || document.getElementById('prodImagePreview');
        if (previewContainer) {
            previewContainer.innerHTML = ''; // تصفير الحاوية أولاً
            // فصل الروابط إذا كانت متعددة وعرضها جميعاً
            const urls = img.split(',');
            urls.forEach(url => {
                if(url.trim()) {
                    const imgTag = document.createElement('img');
                    imgTag.src = url.trim();
                    imgTag.style.width = '80px';
                    imgTag.style.height = '80px';
                    imgTag.style.objectFit = 'cover';
                    imgTag.style.borderRadius = '6px';
                    imgTag.style.margin = '5px';
                    previewContainer.appendChild(imgTag);
                }
            });
            previewContainer.style.display = 'flex';
            previewContainer.style.flexWrap = 'wrap';
        }
    }
    document.getElementById('productFormTitle').textContent = 'تعديل العقار';
    addDebug('تعديل العقار: ' + name, 'info');
}

// حذف عقار
async function deleteProduct(id) {
    if (!confirm('هل أنت متأكد من حذف هذا العقار؟')) return;
    const res = await apiCall('deleteProduct', { id });
    if (!res.error) {
        addDebug('تم حذف العقار', 'success');
        loadProducts();
    }
}

// تحميل التصنيفات في قائمة العقار المنسدلة
async function loadCategoriesForSelect(selectId) {
    const select = document.getElementById(selectId);
    if (!select) {
        addDebug('عنصر select غير موجود: ' + selectId, 'error');
        return;
    }
    
    const defaultCategories = [
        { name: 'أراضي', slug: 'lands' },
        { name: 'شقق', slug: 'apartments' },
        { name: 'فلل وبيوت', slug: 'villas' },
        { name: 'عروض حصرية', slug: 'offers' }
    ];

    try {
        const data = await apiCall('getCategories');
        if (data && !data.error && Array.isArray(data) && data.length > 1) {
            const rows = data.slice(1);
            const categories = rows.map(row => ({ name: row[1], slug: row[2] }));
            populateSelect(select, categories);
            addDebug('تم تحميل التصنيفات العقارية بنجاح', 'success');
            return;
        }
    } catch (err) {
        addDebug('فشل جلب التصنيفات: ' + err.message, 'error');
    }
    
    populateSelect(select, defaultCategories);
    addDebug('تم استخدام التصنيفات الافتراضية للعقارات', 'info');
}

// ملء قائمة منسدلة
function populateSelect(select, categories) {
    select.innerHTML = categories.map(cat => 
        `<option value="${cat.name}">${cat.name}</option>`
    ).join('');
}

// رفع صور العقار (تدعم رفع وتحديث أكثر من صورة في نفس الوقت)
document.addEventListener('click', async function(e) {
    if (e.target && e.target.id === 'uploadProdImageBtn') {
        e.preventDefault();
        const fileInput = document.getElementById('prodImageFile');
        const files = fileInput.files;
        addDebug(`عدد الملفات المختارة: ${files.length}`, 'info');
        if (files.length === 0) {
            alert('اختر صورة واحدة أو أكثر أولاً');
            return;
        }
        
        const category = document.getElementById('prodCategory').value;
        let folder = 'marib-store/products/other';
        if (category === 'أراضي' || category === 'رجالي') folder = 'marib-store/products/lands';
        else if (category === 'شقق' || category === 'نسائي') folder = 'marib-store/products/apartments';
        else if (category === 'فلل وبيوت' || category === 'أطفال') folder = 'marib-store/products/villas';
        else if (category === 'عروض حصرية' || category === 'عروض') folder = 'marib-store/products/offers';
        
        addDebug(`المجلد المستهدف: ${folder}`, 'info');
        
        const uploadedUrls = [];
        const previewContainer = document.getElementById('prodImagePreviewContainer') || document.getElementById('prodImagePreview');
        if (previewContainer) {
            previewContainer.innerHTML = ''; 
            previewContainer.style.display = 'flex';
            previewContainer.style.flexWrap = 'wrap';
        }

        // الحلقات التكرارية لرفع كل ملف على حدة وإضافته للمصفوفة
        for(let i = 0; i < files.length; i++) {
            const file = files[i];
            addDebug(`بدء رفع الملف ${i+1}: ${file.name} (${file.size} bytes)`, 'info');
            try {
                const url = await uploadImage(file, folder);
                uploadedUrls.push(url);
                
                // إضافة معاينة لكل صورة يتم رفعها بنجاح فوراً
                if (previewContainer) {
                    const imgTag = document.createElement('img');
                    imgTag.src = url;
                    imgTag.style.width = '80px';
                    imgTag.style.height = '80px';
                    imgTag.style.objectFit = 'cover';
                    imgTag.style.borderRadius = '6px';
                    imgTag.style.margin = '5px';
                    previewContainer.appendChild(imgTag);
                }
                addDebug(`نجح رفع الملف ${i+1}: ${url}`, 'success');
            } catch (err) {
                addDebug(`فشل رفع الملف ${i+1} (${file.name}): ${err}`, 'error');
            }
        }

        if (uploadedUrls.length > 0) {
            // دمج كل الروابط الناتجة وفصلها بفاصلة لتخزينها في خلية واحدة بالسيرفر
            document.getElementById('prodImageUrl').value = uploadedUrls.join(',');
            alert(`تم رفع (${uploadedUrls.length}) من الصور بنجاح!`);
        } else {
            alert('فشل رفع الصور، يرجى المحاولة مجدداً');
        }
    }
});

// حفظ العقار
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
        addDebug('اسم العقار فارغ', 'error');
        alert('الرجاء إدخال اسم العقار المعروض');
        return;
    }
    if (!product.image_url) {
        addDebug('رابط الصورة فارغ', 'error');
        alert('الرجاء رفع صورة أو مخططات العقار أولاً');
        return;
    }
    if (!product.category) {
        addDebug('القسم غير محدد', 'error');
        alert('الرجاء اختيار قسم عقاري');
        return;
    }

    const action = id ? 'updateProduct' : 'addProduct';
    const res = await apiCall(action, product);
    if (!res.error) {
        addDebug('تم حفظ العقار بنجاح', 'success');
        closeProductForm();
        loadProducts();
    }
});

// ==================== عام ====================
function logout() { sessionStorage.removeItem('adminAuth'); window.location.href = 'login.html'; }
showTab('products');


// ==================== تفعيل دوال الخدمات بالكامل ====================

// فتح نموذج إضافة/تعديل خدمة
function openServiceForm() {
    const modal = document.getElementById('serviceFormModal');
    if (modal) {
        modal.style.display = 'flex';
        document.getElementById('serviceForm').reset();
        document.getElementById('servId').value = '';
        document.getElementById('servImageUrl').value = '';
        if(document.getElementById('servPreview')) document.getElementById('servPreview').style.display = 'none';
        addDebug('تم فتح نموذج الخدمات', 'info');
    }
}

// إغلاق نموذج الخدمة
function closeServiceForm() {
    const modal = document.getElementById('serviceFormModal');
    if (modal) modal.style.display = 'none';
}

// دالة رفع صورة الخدمة
async function uploadServiceImage() {
    const fileInput = document.getElementById('servImageFile');
    if (!fileInput || fileInput.files.length === 0) {
        alert('الرجاء اختيار صورة للخدمة أولاً');
        return;
    }
    addDebug('بدء رفع صورة الخدمة...', 'info');
    try {
        const url = await uploadImage(fileInput.files[0], 'marib-store/services');
        document.getElementById('servImageUrl').value = url;
        const preview = document.getElementById('servPreview');
        if (preview) {
            preview.src = url;
            preview.style.display = 'block';
        }
        addDebug('تم رفع صورة الخدمة بنجاح', 'success');
        alert('تم رفع الصورة بنجاح');
    } catch (err) {
        addDebug('فشل رفع صورة الخدمة: ' + err, 'error');
        alert('خطأ في الرفع: ' + err);
    }
}

// مستمع الحدث لحفظ نموذج الخدمة عند الإرسال
if (document.getElementById('serviceForm')) {
    document.getElementById('serviceForm').addEventListener('submit', async function(e) {
        e.preventDefault();
        const service = {
            name: document.getElementById('servName').value.trim(),
            category: document.getElementById('servCategory').value,
            price: document.getElementById('servPrice').value.trim(),
            description: document.getElementById('servDesc').value.trim(),
            image_url: document.getElementById('servImageUrl').value.trim()
        };
        const id = document.getElementById('servId').value;
        if (id) service.id = id;

        if (!service.name) return alert('الرجاء إدخال اسم الخدمة');

        const action = id ? 'updateService' : 'addService';
        const res = await apiCall(action, service);
        if (!res.error) {
            addDebug('تم حفظ الخدمة بنجاح', 'success');
            closeServiceForm();
            loadServices();
        }
    });
}


// ==================== تفعيل دوال معرض الصور بالكامل ====================

// فتح نموذج إضافة صورة للمعرض
function openGalleryForm() {
    const modal = document.getElementById('galleryFormModal');
    if (modal) {
        modal.style.display = 'flex';
        document.getElementById('galleryForm').reset();
        document.getElementById('galId').value = '';
        document.getElementById('galImageUrl').value = '';
        if(document.getElementById('galPreview')) document.getElementById('galPreview').style.display = 'none';
        addDebug('تم فتح نموذج المعرض', 'info');
    }
}

// إغلاق نموذج المعرض
function closeGalleryForm() {
    const modal = document.getElementById('galleryFormModal');
    if (modal) modal.style.display = 'none';
}

// دالة رفع صورة المعرض
async function uploadGalleryImage() {
    const fileInput = document.getElementById('galImageFile');
    if (!fileInput || fileInput.files.length === 0) {
        alert('الرجاء اختيار صورة لرفعها للمعرض أولاً');
        return;
    }
    addDebug('بدء رفع صورة المعرض...', 'info');
    try {
        const url = await uploadImage(fileInput.files[0], 'marib-store/gallery');
        document.getElementById('galImageUrl').value = url;
        const preview = document.getElementById('galPreview');
        if (preview) {
            preview.src = url;
            preview.style.display = 'block';
        }
        addDebug('تم رفع صورة المعرض بنجاح', 'success');
        alert('تم رفع الصورة بنجاح');
    } catch (err) {
        addDebug('فشل رفع صورة المعرض: ' + err, 'error');
        alert('خطأ في الرفع: ' + err);
    }
}

// مستمع الحدث لحفظ صورة المعرض عند الإرسال
if (document.getElementById('galleryForm')) {
    document.getElementById('galleryForm').addEventListener('submit', async function(e) {
        e.preventDefault();
        const galleryData = {
            title: document.getElementById('galTitle').value.trim(),
            category: document.getElementById('galCategory').value.trim(),
            image_url: document.getElementById('galImageUrl').value.trim()
        };
        
        if (!galleryData.title) return alert('الرجاء إدخال عنوان الصورة');
        if (!galleryData.image_url) return alert('الرجاء رفع الصورة أولاً');

        const res = await apiCall('addGalleryImage', galleryData);
        if (!res.error) {
            addDebug('تم إضافة الصورة للمعرض بنجاح', 'success');
            closeGalleryForm();
            loadGallery();
        }
    });
}

        
