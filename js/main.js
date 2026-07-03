

// ==================== إعدادت المتجر ====================
const CONFIG = {
    storeName: 'متجر الأناقة للملابس',        
    storeType: 'clothing',
    whatsapp: '967770569067',                 
    googleMaps: 'https://maps.app.goo.gl/...',
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

// ==================== نظام سلة المشتريات ====================
let cart = JSON.parse(localStorage.getItem('elegance_store_cart')) || [];

function saveCart() {
    localStorage.setItem('elegance_store_cart', JSON.stringify(cart));
    updateCartUI();
}

function addToCart(id, name, price, imageUrl) {
    const existingItem = cart.find(item => item.id === id);
    if (existingItem) {
        existingItem.qty += 1;
    } else {
        cart.push({ id, name, price: parseFloat(price) || 0, imageUrl, qty: 1 });
    }
    saveCart();
    showToast(`تم إضافة ${name} إلى السلة بنجاح`);
}

// دالة مخصصة مريحة للإضافة من داخل مودال تفاصيل المنتج السريع لمنع الاختلاط
function addToCartFromModal(id, name, price, imageUrl) {
    addToCart(id, name, price, imageUrl);
    closeProductModal(); // يغلق النافذة اختيارياً بعد الإضافة لسهولة التجربة
}

function changeQty(id, delta) {
    const item = cart.find(item => item.id === id);
    if (item) {
        item.qty += delta;
        if (item.qty <= 0) {
            cart = cart.filter(i => i.id !== id);
        }
        saveCart();
    }
}

function removeFromCart(id) {
    cart = cart.filter(item => item.id !== id);
    saveCart();
}

function updateCartUI() {
    const totalQty = cart.reduce((sum, item) => sum + item.qty, 0);
    document.querySelectorAll('.cart-count-badge').forEach(badge => {
        badge.textContent = totalQty;
        badge.style.display = totalQty > 0 ? 'flex' : 'none';
    });

    const cartContainer = document.getElementById('cartItemsList');
    if (!cartContainer) return;

    if (cart.length === 0) {
        cartContainer.innerHTML = '<p style="text-align:center; color:#888; margin-top:30px;">السلة فارغة حالياً.</p>';
        document.getElementById('cartTotal').textContent = '0 ريال';
        return;
    }

    let totalPrice = 0;
    cartContainer.innerHTML = cart.map(item => {
        const itemTotal = item.price * item.qty;
        totalPrice += itemTotal;
        return `
            <div class="cart-item">
                <img src="${item.imageUrl}" alt="${item.name}">
                <div class="cart-item-details">
                    <h4>${item.name}</h4>
                    <p>${item.price} ريال</p>
                    <div class="cart-item-qty">
                        <button class="qty-btn" onclick="changeQty('${item.id}', -1)">-</button>
                        <span>${item.qty}</span>
                        <button class="qty-btn" onclick="changeQty('${item.id}', 1)">+</button>
                    </div>
                </div>
                <button class="cart-item-remove" onclick="removeFromCart('${item.id}')">✕</button>
            </div>
        `;
    }).join('');

    document.getElementById('cartTotal').textContent = totalPrice + ' ريال';
}

function toggleCart() {
    const sidebar = document.getElementById('cartSidebar');
    const overlay = document.getElementById('cartOverlay');
    if (sidebar && overlay) {
        sidebar.classList.toggle('open');
        overlay.classList.toggle('show');
    }
}

function checkoutCart() {
    if (cart.length === 0) {
        showToast('سلتك فارغة، يرجى إضافة منتجات أولاً');
        return;
    }

    let message = `*طلب شراء جديد من: ${CONFIG.storeName}*\n`;
    message += `------------------------------------\n\n`;
    
    let total = 0;
    cart.forEach((item, index) => {
        const itemSubtotal = item.price * item.qty;
        total += itemSubtotal;
        message += `*${index + 1}) ${item.name}*\n`;
        message += `   الكمية: ${item.qty}\n`;
        message += `   السعر: ${item.price} ريال\n`;
        message += `   المجموع: ${itemSubtotal} ريال\n\n`;
    });

    message += `------------------------------------\n`;
    message += `*المجموع الكلي للطلب:* ${total} ريال يمني\n\n`;
    message += `يرجى تأكيد الطلب وتجهيز المنتجات.`;

    const whatsappUrl = `https://wa.me/${CONFIG.whatsapp}?text=${encodeURIComponent(message)}`;
    
    cart = [];
    saveCart();
    toggleCart();
    window.open(whatsappUrl, '_blank');
}

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

// ==================== نظام تكبير وعرض كروت المنتجات السريع ====================
function openProductModal(id) {
    // البحث عن تفاصيل المنتج داخل الذاكرة المحلية المخزنة مسبقاً
    const product = localProductsCache.find(p => p.id === id);
    if (!product) return;

    const modalOverlay = document.getElementById('productQuickModal');
    if (!modalOverlay) return;

    // حقن وتحديث بيانات المنتج الكبير داخل النافذة
    modalOverlay.innerHTML = `
        <div class="product-modal-container" onclick="event.stopPropagation()">
            <button class="modal-close-trigger" onclick="closeProductModal()">✕</button>
            <div class="modal-image-panel">
                <img src="${product.image_url}" alt="${product.name}">
            </div>
            <div class="modal-details-panel">
                <span class="modal-category">${product.category}</span>
                <h2>${product.name}</h2>
                <div class="modal-price">${product.price ? product.price + ' ريال يمني' : 'حسب الطلب'}</div>
                <p class="modal-desc">${product.description || 'لا يوجد وصف إضافي متاح لهذا المنتج حالياً.'}</p>
                
                <div class="modal-action-buttons">
                    <button onclick="addToCartFromModal('${product.id}', '${product.name.replace(/'/g, "\\'")}', '${product.price}', '${product.image_url}')" class="btn-cart-add" style="padding:14px; font-size:1rem;">
                        إضافة إلى سلة المشتريات
                    </button>
                    <a href="https://wa.me/${product.whatsapp}?text=مرحباً، أود شراء منتج: ${encodeURIComponent(product.name)}" target="_blank" class="btn-whatsapp" style="border-radius:50px; padding:12px;">
                        طلب مباشر عبر واتساب سريع
                    </a>
                </div>
            </div>
        </div>
    `;

    // عرض المودال بتأثير أنيميشن ناعم
    modalOverlay.classList.add('show');
    document.body.style.overflow = 'hidden'; // قفل التمرير للخلفية لراحة العين
}

function closeProductModal() {
    const modalOverlay = document.getElementById('productQuickModal');
    if (modalOverlay) {
        modalOverlay.classList.remove('show');
        document.body.style.overflow = ''; // إعادة التمرير الطبيعي للـ body
    }
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
    
    if (document.getElementById('featuredProducts')) {
        renderProductsDOM(localProductsCache.slice(0, 8), 'featuredProducts');
    }
    if (document.getElementById('allProducts')) {
        let filtered = localProductsCache;
        if (currentActiveCategory !== 'all') {
            
            const targetCategory = categoryMap[currentActiveCategory] || currentActiveCategory;
            filtered = localProductsCache.filter(p => p.category === targetCategory);
        }
        renderProductsDOM(filtered, 'allProducts');
    }
}

function renderProductsDOM(products, containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    // إعداد كروت المنتجات لتفتح المودال عند النقر عليها بالكامل (بدون وميض عند التحديث)
    const newHTML = products.length === 0 
        ? '<p style="grid-column: 1/-1; text-align:center; padding: 40px; color:#666;">لا توجد منتجات حالياً في هذا القسم.</p>'
        : products.map(product => `
            <div class="product-card" onclick="openProductModal('${product.id}')">
                <div class="product-card-image-wrapper">
                    <img src="${product.image_url}" alt="${product.name}" loading="lazy">
                </div>
                <div class="product-info">
                    <span class="category">${product.category}</span>
                    <h3>${product.name}</h3>
                    <p class="description">${product.description}</p>
                    <p class="price">${product.price ? product.price + ' ريال' : 'حسب الطلب'}</p>
                    
                    <button onclick="event.stopPropagation(); addToCart('${product.id}', '${product.name.replace(/'/g, "\\'")}', '${product.price}', '${product.image_url}')" class="btn-cart-add">
                        إضافة إلى السلة
                    </button>
                    
                    <div class="product-actions" style="margin-top: 10px;" onclick="event.stopPropagation();">
                        <a href="https://wa.me/${product.whatsapp}?text=مرحباً، أستفسر عن منتج: ${encodeURIComponent(product.name)}" target="_blank" class="btn-whatsapp-sm">استفسار سريع</a>
                        <button onclick="shareProduct('${product.name.replace(/'/g, "\\'")}', '${product.description.replace(/'/g, "\\'")}', '${product.image_url}', '${window.location.origin}/products.html')" class="share-btn">مشاركة</button>
                    </div>
                </div>
            </div>
        `).join('');

    if (container.innerHTML !== newHTML) {
        container.innerHTML = newHTML;
    }
}

// ==================== مشاركة ورابط ====================
function shareProduct(title, description, imageUrl, productUrl) {
    if (navigator.share) {
        navigator.share({ title, text: description, url: productUrl }).catch(() => copyToClipboard(productUrl));
    } else {
        copyToClipboard(productUrl);
    }
}

function copyToClipboard(text) {
    navigator.clipboard.writeText(text).then(() => showToast('تم نسخ رابط المتجر للمشاركة'))
        .catch(() => prompt('انسخ الرابط:', text));
}

// ==================== بناء وحقن العناصر المشتركة ====================
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

    // 3. إنشاء وحقن هيكل السلة ونافذة تفاصيل كروت المنتجات التلقائية الفاخرة (تُحقن مرة واحدة في الـ body لكل الصفحات)
    if (!document.getElementById('cartSidebar')) {
        const structuralHTML = `
            <div class="product-modal-overlay" id="productQuickModal" onclick="closeProductModal()">
                </div>

            <div class="floating-cart-trigger" onclick="toggleCart()">
                <svg viewBox="0 0 24 24">
                    <path d="M7 18c-1.1 0-1.99.9-1.99 2S5.9 22 7 22s2-.9 2-2-.9-2-2-2zM1 2v2h2l3.6 7.59-1.35 2.45c-.16.28-.25.61-.25.96 0 1.1.9 2 2 2h12v-2H7.42c-.14 0-.25-.11-.25-.25l.03-.12.9-1.63h7.45c.75 0 1.41-.41 1.75-1.03l3.58-6.49c.08-.14.12-.31.12-.48 0-.55-.45-1-1-1H5.21l-.94-2H1zm16 16c-1.1 0-1.99.9-1.99 2s.89 2 1.99 2 2-.9 2-2-.9-2-2-2z"/>
                </svg>
                <div class="cart-count-badge" style="display: none;">0</div>
            </div>
            
            <div class="cart-overlay" id="cartOverlay" onclick="toggleCart()"></div>
            
            <div class="cart-sidebar" id="cartSidebar">
                <div class="cart-header">
                    <h3>سلة المشتريات</h3>
                    <button class="cart-close-btn" onclick="toggleCart()">✕</button>
                </div>
                <div class="cart-items-list" id="cartItemsList"></div>
                <div class="cart-footer">
                    <div class="cart-total-box">
                        <span>المجموع الكلي:</span>
                        <span id="cartTotal">0 ريال</span>
                    </div>
                    <button class="btn-checkout" onclick="checkoutCart()">إرسال الطلب عبر واتساب</button>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', structuralHTML);
    }

    updateCartUI();

    // 4. تحميل المنتجات فورياً
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
