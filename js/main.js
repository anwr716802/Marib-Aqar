// ==================== إعدادت المتجر ====================
const CONFIG = {
    storeName: ' عقارات الشعب مارب ',        
    storeType: 'clothing',
    whatsapp: '967770569067',                 
    googleMaps: 'https://maps.app.goo.gl/aa7o7pno7B1nFaKQ9',
    primaryColor: '#2c3e50',
    secondaryColor: '#c0392b',
    logo: 'assets/images/logo.png',
    defaultShareImage: 'assets/images/logo.png',
    developerUrl: 'https://sparkon-alsheb.netlify.app/' // رابط مؤسسة الشعب المقاولات العامة
};

// ==================== API Proxy ====================
const API_BASE = '/api/proxy';  

// متنبئ للاحتفاظ بالمنتجات في الذاكرة لتجنب الرمش أثناء التحديث الصامت
let localProductsCache = [];
let currentActiveCategory = 'all';

// متغيرات مخصصة للتحكم في السلايدر التلقائي داخل المودال الكبير
let currentSliderIndex = 0;
let sliderIntervalToken = null;

// ==================== وظائف القائمة والـ Toast ====================
function toggleMenu() {
    const navUl = document.querySelector('.main-nav ul');
    if (navUl) navUl.classList.toggle('show');
}

function showToast(message) {
    const toast = document.getElementById('toast');
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 3000);
}

// ==================== نظام تكبير وعرض كروت العقارات السريع (العالمي) ====================
function openProductModal(id) {
    // البحث عن تفاصيل المنتج داخل الذاكرة المحلية المخزنة مسبقاً
    const product = localProductsCache.find(p => p.id === id);
    if (!product) return;

    const modalOverlay = document.getElementById('productQuickModal');
    if (!modalOverlay) return;

    // استخراج مصفوفة الصور (الفصل بالفاصلة)
    let imagesArray = [];
    if (product.image_url) {
        imagesArray = product.image_url.split(',').map(img => img.trim()).filter(img => img !== "");
    }
    if (imagesArray.length === 0) {
        imagesArray.push(CONFIG.defaultShareImage);
    }

    currentSliderIndex = 0;

    // بناء الهيكل الفاخر مع السلايدر وأزرار التحكم اليدوي
    modalOverlay.innerHTML = `
        <div class="product-modal-container" onclick="event.stopPropagation()">
            <button class="modal-close-trigger" onclick="closeProductModal()">✕</button>
            <div class="modal-image-panel" style="position: relative; overflow: hidden; display: flex; align-items: center; justify-content: center; background: #f9f9f9; min-height: 300px;">
                <div class="modal-slides-container" style="display: flex; transition: transform 0.5s ease; width: 100%; height: 100%;">
                    ${imagesArray.map(img => `<img src="${img}" alt="${product.name}" style="width: 100%; object-fit: contain; flex-shrink: 0; max-height: 450px;">`).join('')}
                </div>
                
                ${imagesArray.length > 1 ? `
                    <button class="slider-nav-btn prev" onclick="changeModalSlide(-1)" style="position: absolute; right: 10px; top: 50%; transform: translateY(-50%); background: rgba(0,0,0,0.5); color: #fff; border: none; width: 35px; height: 35px; border-radius: 50%; cursor: pointer; font-size: 1.2rem; z-index: 10;">❯</button>
                    <button class="slider-nav-btn next" onclick="changeModalSlide(1)" style="position: absolute; left: 10px; top: 50%; transform: translateY(-50%); background: rgba(0,0,0,0.5); color: #fff; border: none; width: 35px; height: 35px; border-radius: 50%; cursor: pointer; font-size: 1.2rem; z-index: 10;">❮</button>
                    <div class="slider-dots" style="position: absolute; bottom: 10px; left: 50%; transform: translateX(-50%); display: flex; gap: 6px; z-index: 10;">
                        ${imagesArray.map((_, i) => `<span class="slider-dot ${i === 0 ? 'active' : ''}" onclick="setModalSlide(${i})" style="width: 8px; height: 8px; background: rgba(255,255,255,0.5); border-radius: 50%; cursor: pointer; display: inline-block;"></span>`).join('')}
                    </div>
                ` : ''}
            </div>
            <div class="modal-details-panel">
                <span class="modal-category">${product.category}</span>
                <h2>${product.name}</h2>
                <div class="modal-price">${product.price ? product.price + ' ريال يمني' : 'حسب الطلب'}</div>
                <p class="modal-desc">${product.description || 'لا يوجد وصف إضافي متاح لهذا العقار حالياً.'}</p>
                
                <div class="modal-action-buttons" style="display: flex; flex-direction: column; gap: 10px; margin-top: 20px;">
                    <a href="https://wa.me/${product.whatsapp}?text=${encodeURIComponent('مرحباً عقارات الشعب، أستفسر عن العرض: ' + product.name + '\n' + window.location.origin + window.location.pathname + '?id=' + product.id)}" target="_blank" class="btn-whatsapp" style="border-radius:50px; padding:14px; text-align: center; text-decoration: none; font-weight: bold; background-color: #25d366; color: white;">
                        💬 تواصل مباشر عبر واتساب
                    </a>
                    <button onclick="shareProduct('${product.id}', '${product.name.replace(/'/g, "\\'")}')" class="share-btn" style="padding:12px; border-radius:50px; font-weight:bold; background-color:#34495e; color:white; border:none; cursor:pointer;">
                        🔗 مشاركة هذا العقار للواتساب
                    </button>
                </div>
            </div>
        </div>
    `;

    // عرض المودال بتأثير أنيميشن ناعم
    modalOverlay.classList.add('show');
    document.body.style.overflow = 'hidden'; // قفل التمرير للخلفية لراحة العين

    // بدء تشغيل التدوير التلقائي لصور العقار كل 5 ثوانٍ
    startModalSlider(imagesArray.length);
}

function closeProductModal() {
    const modalOverlay = document.getElementById('productQuickModal');
    if (modalOverlay) {
        modalOverlay.classList.remove('show');
        document.body.style.overflow = ''; // إعادة التمرير الطبيعي للـ body
    }
    // إيقاف التدوير عند إغلاق النافذة لمنع استهلاك الذاكرة
    if (sliderIntervalToken) {
        clearInterval(sliderIntervalToken);
        sliderIntervalToken = null;
    }
}

// دالة تدوير السلايدر التلقائي واليدوي
function startModalSlider(totalImages) {
    if (sliderIntervalToken) clearInterval(sliderIntervalToken);
    if (totalImages <= 1) return;

    sliderIntervalToken = setInterval(() => {
        changeModalSlide(1, totalImages);
    }, 5000); // 5 ثوانٍ
}

function changeModalSlide(direction, totalImages) {
    const container = document.querySelector('.modal-slides-container');
    if (!container) return;
    
    const images = container.querySelectorAll('img');
    const total = totalImages || images.length;
    if (total <= 1) return;

    currentSliderIndex += direction;
    if (currentSliderIndex >= total) currentSliderIndex = 0;
    if (currentSliderIndex < 0) currentSliderIndex = total - 1;

    updateSliderDOM(container, total);
}

function setModalSlide(index) {
    const container = document.querySelector('.modal-slides-container');
    if (!container) return;
    const images = container.querySelectorAll('img');
    currentSliderIndex = index;
    updateSliderDOM(container, images.length);
}

function updateSliderDOM(container, total) {
    // إزاحة المعرض يميناً ويساراً بناءً على مؤشر الصورة الحالية
    container.style.transform = `translateX(${currentSliderIndex * 100}%)`;
    
    // تحديث النقاط النشطة السفلى (dots)
    const dots = document.querySelectorAll('.slider-dot');
    dots.forEach((dot, idx) => {
        if (idx === currentSliderIndex) {
            dot.style.backgroundColor = '#fff';
            dot.classList.add('active');
        } else {
            dot.style.backgroundColor = 'rgba(255,255,255,0.5)';
            dot.classList.remove('active');
        }
    });
}

// ==================== جلب وتحديث المنتجات صامتاً كل 30 ثانية ====================
async function fetchProductsFromSheet() {
    try {
        const params = new URLSearchParams({ action: 'getProducts' });
        const response = await fetch(`${API_BASE}?${params.toString()}`);
        const data = await response.json();
        if (data.error) return [];
        
        const rows = data.slice(1); 
        return rows.map(row => ({
            id: row[0],
            name: row[1],
            category: row[2],
            price: row[3],
            description: row[4],
            image_url: row[5],
            whatsapp: row[6] || CONFIG.whatsapp
        }));
    } catch (err) {
        console.error('فشل جلب المنتجات:', err);
        return [];
    }
}

async function smartRefreshProducts() {
    const freshProducts = await fetchProductsFromSheet();
    if (freshProducts.length === 0) return; 

    localProductsCache = freshProducts;
    
    // تشغيل فحص الرابط القادم لمشاركة واتساب فور انتهاء تحميل الكاش المباشر
    checkIncomingShare(localProductsCache);
    
    if (document.getElementById('featuredProducts')) {
        renderProductsDOM(localProductsCache.slice(0, 8), 'featuredProducts');
    }
    if (document.getElementById('allProducts')) {
        let filtered = localProductsCache;
        if (currentActiveCategory !== 'all') {
            const categoryMap = { men: 'رجالي', women: 'نسائي', kids: 'أطفال', offers: 'عروض' };
            const targetCategory = categoryMap[currentActiveCategory] || currentActiveCategory;
            filtered = localProductsCache.filter(p => p.category === targetCategory);
        }
        renderProductsDOM(filtered, 'allProducts');
    }
}

function renderProductsDOM(products, containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    const newHTML = products.length === 0 
        ? '<p style="grid-column: 1/-1; text-align:center; padding: 40px; color:#666;">لا توجد عروض عقارية حالياً في هذا القسم.</p>'
        : products.map(product => {
            // استخراج الصورة الأولى لعرضها كواجهة رئيسية للكرت الصغير
            let firstImg = CONFIG.defaultShareImage;
            if (product.image_url) {
                firstImg = product.image_url.includes(',') ? product.image_url.split(',')[0].trim() : product.image_url;
            }
            return `
            <div class="product-card" onclick="openProductModal('${product.id}')">
            
                <div class="product-card-image-wrapper">
                    <img src="${firstImg}" alt="${product.name}" loading="lazy">
                </div>
                <div class="product-info">
                    <span class="category">${product.category}</span>
                    <h3>${product.name}</h3>
                    <p class="description">${product.description}</p>
                    <p class="price">${product.price ? product.price + ' ريال' : 'حسب الطلب'}</p>
                    
                    <div class="product-actions" style="margin-top: 10px;" onclick="event.stopPropagation();">
                        <a href="https://wa.me/${product.whatsapp}?text=${encodeURIComponent('مرحباً، أستفسر عن عرض العقار: ' + product.name)}" target="_blank" class="btn-whatsapp-sm">استفسار سريع</a>
                        <button onclick="shareProduct('${product.id}', '${product.name.replace(/'/g, "\\'")}')" class="share-btn">مشاركة</button>
                    </div>
                </div>
            </div>
        `; }).join('');

    if (container.innerHTML !== newHTML) {
        container.innerHTML = newHTML;
    }
}

// ==================== الفحص والتحديث التلقائي لأوسمة مشاركة الواتساب الرابط الدقيق ====================
function checkIncomingShare(allProducts) {
    const urlParams = new URLSearchParams(window.location.search);
    const productId = urlParams.get('id');

    if (productId) {
        const product = allProducts.find(p => p.id.toString() === productId.toString());
        if (product) {
            const formattedTitle = `${product.name} | عقارات الشعب مأرب`;
            const formattedDesc = `السعر: ${product.price || 'حسب الطلب'} ريال | ${product.description}`;
            
            let firstImg = CONFIG.defaultShareImage;
            if (product.image_url) {
                firstImg = product.image_url.includes(',') ? product.image_url.split(',')[0].trim() : product.image_url;
            }

            // تحديث الأوسمة التي يقرأها خادم الواتساب فوراً عند الزيارة
            document.title = formattedTitle;
            if(document.getElementById('metaTitle')) document.getElementById('metaTitle').innerText = formattedTitle;
            if(document.getElementById('metaDescription')) document.getElementById('metaDescription').setAttribute('content', formattedDesc);
            
            if(document.getElementById('ogTitle')) document.getElementById('ogTitle').setAttribute('content', formattedTitle);
            if(document.getElementById('ogDescriptionDynamic')) document.getElementById('ogDescriptionDynamic').setAttribute('content', formattedDesc);
            if(document.getElementById('ogImage')) document.getElementById('ogImage').setAttribute('content', firstImg);

            // تفعيل تلقائي لفتح المودال المكبر للعقار المشارك لراحة العميل القادم من الرابط
            setTimeout(() => {
                openProductModal(product.id);
            }, 600);
        }
    }
}

// دالة مشاركة العقار وبناء الرابط الفريد ليرسله المستخدم للواتساب
function shareProduct(id, name) {
    const currentUrl = window.location.origin + window.location.pathname;
    const shareLink = `${currentUrl}?id=${id}`;

    if (navigator.share) {
        navigator.share({
            title: name,
            text: `شاهد تفاصيل هذا العرض العقاري المميز عبر منصة عقارات الشعب بمأرب`,
            url: shareLink
        }).catch(() => copyToClipboard(shareLink));
    } else {
        copyToClipboard(shareLink);
    }
}

function copyToClipboard(text) {
    navigator.clipboard.writeText(text).then(() => showToast('تم نسخ رابط العقار بنجاح! يمكنك الآن لصقه ومشاركته في الواتساب.'))
        .catch(() => prompt('انسخ رابط المشاركة:', text));
}

// ==================== بناء وحقن العناصر المشتركة المتبقية ====================
document.addEventListener('DOMContentLoaded', async () => {
    
    // 1. حقن شريط الحقوق الإخباري الدوار
    if (!document.querySelector('.ticker-wrapper')) {
        const tickerHTML = `
            <div class="ticker-wrapper">
                <a href="${CONFIG.developerUrl}" target="_blank" class="ticker-link" title="اضغط لزيارة موقع المؤسسة">
                    <div class="ticker-text">
                        🔥 تم إنشاء هذا التطبيق بواسطة الفريق التقني لدى مؤسسة الشعب للمقاولات العامة - اضغط هنا لزيارة موقعنا الإلكتروني الفاخر واكتشاف خدماتنا البرمجية والهندسية المتكاملة 🚀
                    </div>
                </a>
            </div>
        `;
        document.body.insertAdjacentHTML('afterbegin', tickerHTML);
    }

    // 2. التحقق من إضافة زر "الرئيسية"
    const navUl = document.querySelector('.main-nav ul');
    if (navUl && !navUl.querySelector('a[href="index.html"]')) {
        const homeLi = `<li><a href="index.html" class="${window.location.pathname.endsWith('index.html') || window.location.pathname === '/' ? 'active' : ''}">الرئيسية</a></li>`;
        navUl.insertAdjacentHTML('afterbegin', homeLi);
    }

    // 3. إنشاء وحقن هيكل المودال المطور لعرض وتكبير العقار (تمت إزالة السلة بالكامل هنا)
    if (!document.getElementById('productQuickModal')) {
        const structuralHTML = `
            <div class="product-modal-overlay" id="productQuickModal" onclick="closeProductModal()"></div>
        `;
        document.body.insertAdjacentHTML('beforeend', structuralHTML);
    }

    // 4. تحميل العقارات فورياً
    await smartRefreshProducts();

    // 5. فلاتر التبويبات النشطة
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            currentActiveCategory = this.dataset.category;
            
            let filtered = localProductsCache;
            if (currentActiveCategory !== 'all') {
                const categoryMap = { men: 'رجالي', women: 'نسائي', kids: 'أطفال', offers: 'عروض' };
                const targetCategory = categoryMap[currentActiveCategory] || currentActiveCategory;
                filtered = localProductsCache.filter(p => p.category === targetCategory);
            }
            renderProductsDOM(filtered, 'allProducts');
        });
    });

    let deferredPrompt;

    // PWA الاستماع لحدث المتصفح وتخزين طلب التثبيت تطبيق
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      deferredPrompt = e;
      const installBanner = document.getElementById('pwa-install-banner');
      if (installBanner) {
        installBanner.style.display = 'block';
      }
    });

    const installBtn = document.getElementById('install-pwa-btn');
    if (installBtn) {
      installBtn.addEventListener('click', async () => {
        if (deferredPrompt) {
          deferredPrompt.prompt();
          const { outcome } = await deferredPrompt.userChoice;
          if (outcome === 'accepted') {
            hideInstallBanner();
          }
          deferredPrompt = null;
        }
      });
    }

    function hideInstallBanner() {
      const installBanner = document.getElementById('pwa-install-banner');
      if (installBanner) installBanner.style.display = 'none';
    }

    window.addEventListener('appinstalled', () => {
      hideInstallBanner();
      deferredPrompt = null;
    });
    
    // 6. تشغيل مؤقت التحديث التلقائي الصامت كل 30 ثانية
    setInterval(async () => {
        await smartRefreshProducts();
    }, 30000);

    // إغلاق القائمة للهاتف
    document.addEventListener('click', (e) => {
        const nav = document.querySelector('.main-nav ul');
        if (nav && nav.classList.contains('show') && !e.target.closest('.main-nav')) {
            nav.classList.remove('show');
        }
    });
});
            
