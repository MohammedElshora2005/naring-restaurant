// =============================================
// مطعم نارنج - JavaScript كامل
// =============================================

// ===== تحديد رابط الـ API =====
const API_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? 'http://localhost:3000/api'
    : '/api';

console.log(`🔗 API URL: ${API_URL}`);

let currentUser = null;
let currentTheme = 'dark';
let currentLang = 'ar';

// ===== وظائف الاتصال بالـ API =====

async function loginUser(username, password) {
    try {
        const response = await fetch(`${API_URL}/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });
        const data = await response.json();
        console.log('🔐 Login response:', data);
        return data;
    } catch (error) {
        console.error('❌ Login error:', error);
        return { success: false, message: 'خطأ في الاتصال بالخادم' };
    }
}

async function registerUser(username, email, password, full_name, phone) {
    try {
        const response = await fetch(`${API_URL}/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, email, password, full_name, phone })
        });
        return await response.json();
    } catch (error) {
        console.error('❌ Register error:', error);
        return { success: false, message: 'خطأ في الاتصال بالخادم' };
    }
}

async function getReviews() {
    try {
        const response = await fetch(`${API_URL}/reviews`);
        return await response.json();
    } catch (error) {
        console.error('❌ Get reviews error:', error);
        return { success: false, reviews: [] };
    }
}

async function addReview(customer_id, customer_name, stars, review_text) {
    try {
        const response = await fetch(`${API_URL}/reviews`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ customer_id, customer_name, stars, review_text })
        });
        return await response.json();
    } catch (error) {
        console.error('❌ Add review error:', error);
        return { success: false, message: 'خطأ في الاتصال بالخادم' };
    }
}

async function deleteReview(review_id, admin_id) {
    try {
        const response = await fetch(`${API_URL}/reviews/${review_id}`, {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ admin_id })
        });
        return await response.json();
    } catch (error) {
        console.error('❌ Delete review error:', error);
        return { success: false, message: 'خطأ في الاتصال بالخادم' };
    }
}

async function addBooking(customer_id, customer_name, customer_phone, booking_date, booking_time, number_of_people, special_requests) {
    try {
        const response = await fetch(`${API_URL}/bookings`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                customer_id, 
                customer_name, 
                customer_phone, 
                booking_date, 
                booking_time, 
                number_of_people, 
                special_requests 
            })
        });
        return await response.json();
    } catch (error) {
        console.error('❌ Add booking error:', error);
        return { success: false, message: 'خطأ في الاتصال بالخادم' };
    }
}

// ===== التحكم في واجهة المستخدم =====

function showLogin() {
    document.getElementById('authButtons').style.display = 'none';
    document.getElementById('login-section').style.display = 'block';
    document.getElementById('register-section').style.display = 'none';
    document.getElementById('login-section').scrollIntoView({ behavior: 'smooth' });
}

function showRegister() {
    document.getElementById('authButtons').style.display = 'none';
    document.getElementById('login-section').style.display = 'none';
    document.getElementById('register-section').style.display = 'block';
    document.getElementById('register-section').scrollIntoView({ behavior: 'smooth' });
}

function showApp() {
    document.getElementById('menu').style.display = 'block';
    document.getElementById('booking').style.display = 'block';
    document.getElementById('reviews').style.display = 'block';
    
    const isAdmin = currentUser && currentUser.role === 'admin';
    
    let buttonsHTML = `
        <span style="color:var(--primary); font-size:1.1rem;">
            👋 ${currentLang === 'ar' ? 'مرحباً' : 'Welcome'} ${currentUser.full_name || currentUser.username}
        </span>
    `;
    
    // ===== زرار لوحة التحكم للأدمن فقط =====
    if (isAdmin) {
        buttonsHTML += `
            <a href="/admin.html" class="btn btn-primary" style="margin: 0 10px;">
                📊 ${currentLang === 'ar' ? 'لوحة التحكم' : 'Dashboard'}
            </a>
        `;
    }
    
    buttonsHTML += `
        <button class="btn btn-outline-light" onclick="logout()">
            ${currentLang === 'ar' ? 'تسجيل الخروج' : 'Logout'}
        </button>
    `;
    
    document.getElementById('authButtons').innerHTML = buttonsHTML;
    
    loadMenu();
    loadReviews();
}

function logout() {
    currentUser = null;
    document.getElementById('authButtons').innerHTML = `
        <button class="btn btn-primary" onclick="showLogin()">
            ${currentLang === 'ar' ? 'تسجيل الدخول' : 'Login'}
        </button>
        <button class="btn btn-outline" onclick="showRegister()">
            ${currentLang === 'ar' ? 'إنشاء حساب' : 'Sign Up'}
        </button>
    `;
    document.getElementById('menu').style.display = 'none';
    document.getElementById('booking').style.display = 'none';
    document.getElementById('reviews').style.display = 'none';
    document.getElementById('login-section').style.display = 'none';
    document.getElementById('register-section').style.display = 'none';
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ===== تبديل اللغة =====

function toggleLanguage() {
    const isArabic = currentLang === 'ar';
    currentLang = isArabic ? 'en' : 'ar';
    
    document.documentElement.lang = currentLang;
    document.documentElement.dir = currentLang === 'ar' ? 'rtl' : 'ltr';
    
    document.getElementById('langLabel').textContent = isArabic ? 'AR' : 'EN';
    
    updateLogo();
    
    document.querySelectorAll('[data-en][data-ar]').forEach(el => {
        el.textContent = isArabic ? el.getAttribute('data-en') : el.getAttribute('data-ar');
    });
    
    document.querySelectorAll('[data-en-placeholder][data-ar-placeholder]').forEach(el => {
        el.placeholder = isArabic ? el.getAttribute('data-en-placeholder') : el.getAttribute('data-ar-placeholder');
    });
    
    updateButtons();
    
    loadMenu();
    loadReviews();
}

function updateLogo() {
    const isArabic = currentLang === 'ar';
    
    document.querySelectorAll('.logo-ar, .logo-en').forEach(el => {
        el.style.display = 'none';
    });
    document.querySelectorAll(isArabic ? '.logo-ar' : '.logo-en').forEach(el => {
        el.style.display = 'inline';
    });
    
    document.querySelectorAll('.hero-ar, .hero-en').forEach(el => {
        el.style.display = 'none';
    });
    document.querySelectorAll(isArabic ? '.hero-ar' : '.hero-en').forEach(el => {
        el.style.display = 'inline';
    });
    
    document.querySelectorAll('.footer-ar, .footer-en').forEach(el => {
        el.style.display = 'none';
    });
    document.querySelectorAll(isArabic ? '.footer-ar' : '.footer-en').forEach(el => {
        el.style.display = 'inline';
    });
}

function updateButtons() {
    const btns = document.querySelectorAll('.btn-primary, .btn-outline, .btn-outline-light, .btn-nav');
    btns.forEach(btn => {
        const enText = btn.getAttribute('data-en');
        const arText = btn.getAttribute('data-ar');
        if (enText && arText) {
            btn.textContent = currentLang === 'ar' ? arText : enText;
        }
    });
}

// ===== تبديل الوضع =====

function toggleTheme() {
    currentTheme = currentTheme === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', currentTheme);
    document.getElementById('themeIcon').className = currentTheme === 'dark' ? 'fas fa-moon' : 'fas fa-sun';
    localStorage.setItem('theme', currentTheme);
}

// ===== القائمة الموبايل =====

function toggleMobileMenu() {
    document.getElementById('navLinks').classList.toggle('active');
}

// ===== أحداث النماذج =====

// تسجيل الدخول
document.getElementById('loginForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    const username = document.getElementById('loginUsername').value.trim();
    const password = document.getElementById('loginPassword').value.trim();
    const msg = document.getElementById('loginMessage');

    msg.innerHTML = '⏳ جاري التحقق...';
    msg.style.color = '#f39c12';

    const result = await loginUser(username, password);
    console.log('📩 Login result:', result);
    
    if (result.success) {
        currentUser = result.user;
        msg.innerHTML = '✅ ' + result.message;
        msg.style.color = '#8fbc8f';
        setTimeout(() => showApp(), 500);
    } else {
        msg.innerHTML = '❌ ' + (result.message || 'خطأ غير معروف');
        msg.style.color = '#e07b7b';
    }
});

// إنشاء حساب
document.getElementById('registerForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    const username = document.getElementById('regUsername').value.trim();
    const email = document.getElementById('regEmail').value.trim();
    const password = document.getElementById('regPassword').value.trim();
    const full_name = document.getElementById('regFullName').value.trim();
    const phone = document.getElementById('regPhone').value.trim();
    const msg = document.getElementById('registerMessage');

    if (username.length < 3) {
        msg.innerHTML = '❌ ' + (currentLang === 'ar' ? 'اسم المستخدم يجب أن يكون 3 أحرف على الأقل' : 'Username must be at least 3 characters');
        msg.style.color = '#e07b7b';
        return;
    }
    if (password.length < 3) {
        msg.innerHTML = '❌ ' + (currentLang === 'ar' ? 'كلمة المرور يجب أن تكون 3 أحرف على الأقل' : 'Password must be at least 3 characters');
        msg.style.color = '#e07b7b';
        return;
    }

    const result = await registerUser(username, email, password, full_name, phone);
    if (result.success) {
        msg.innerHTML = '✅ ' + result.message;
        msg.style.color = '#8fbc8f';
        setTimeout(() => {
            document.getElementById('register-section').style.display = 'none';
            document.getElementById('login-section').style.display = 'block';
            document.getElementById('loginUsername').value = username;
            document.getElementById('loginPassword').value = password;
            document.getElementById('registerMessage').innerHTML = '';
        }, 1000);
    } else {
        msg.innerHTML = '❌ ' + result.message;
        msg.style.color = '#e07b7b';
    }
});

// حجز طاولة
document.getElementById('bookingForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    if (!currentUser) {
        alert(currentLang === 'ar' ? 'يرجى تسجيل الدخول أولاً' : 'Please login first');
        return;
    }
    const name = document.getElementById('bookName').value.trim();
    const date = document.getElementById('bookDate').value;
    const time = document.getElementById('bookTime').value;
    const people = document.getElementById('peopleCount').value;
    const phone = document.getElementById('bookPhone').value.trim();
    const requests = document.getElementById('bookRequests').value.trim();
    const msg = document.getElementById('bookingMessage');

    if (!name || !date || !time || !people || !phone) {
        msg.innerHTML = '❌ ' + (currentLang === 'ar' ? 'يرجى ملء جميع الحقول' : 'Please fill all fields');
        msg.style.color = '#e07b7b';
        return;
    }

    const result = await addBooking(
        currentUser.id,
        name,
        phone,
        date,
        time,
        people,
        requests
    );
    
    if (result.success) {
        msg.innerHTML = '✅ ' + result.message;
        msg.style.color = '#8fbc8f';
        this.reset();
        document.getElementById('bookPhone').value = '01020063819';
    } else {
        msg.innerHTML = '❌ ' + result.message;
        msg.style.color = '#e07b7b';
    }
});

// إضافة تقييم
document.getElementById('reviewForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    if (!currentUser) {
        alert(currentLang === 'ar' ? 'يرجى تسجيل الدخول أولاً' : 'Please login first');
        return;
    }
    const stars = document.getElementById('reviewStars').value;
    const text = document.getElementById('reviewText').value.trim();
    const msg = document.getElementById('reviewMessage');

    if (!text || text.length < 3) {
        msg.innerHTML = '❌ ' + (currentLang === 'ar' ? 'الرجاء كتابة تقييم مناسب (3 أحرف على الأقل)' : 'Please write a proper review (at least 3 characters)');
        msg.style.color = '#e07b7b';
        return;
    }

    const result = await addReview(currentUser.id, currentUser.full_name || currentUser.username, stars, text);
    if (result.success) {
        msg.innerHTML = '✅ ' + result.message;
        msg.style.color = '#8fbc8f';
        document.getElementById('reviewText').value = '';
        loadReviews();
    } else {
        msg.innerHTML = '❌ ' + result.message;
        msg.style.color = '#e07b7b';
    }
});

// ===== حذف تقييم (للأدمن فقط) =====
async function handleDeleteReview(reviewId) {
    if (!currentUser || currentUser.role !== 'admin') {
        alert(currentLang === 'ar' ? 'غير مصرح به' : 'Unauthorized');
        return;
    }
    
    const confirmMsg = currentLang === 'ar' 
        ? 'هل أنت متأكد من حذف هذا التقييم؟' 
        : 'Are you sure you want to delete this review?';
    
    if (!confirm(confirmMsg)) return;
    
    const result = await deleteReview(reviewId, currentUser.id);
    if (result.success) {
        alert(result.message);
        loadReviews();
    } else {
        alert(result.message);
    }
}

// ===== تحميل البيانات =====

// القائمة مع الصور
function loadMenu() {
    const menuData = {
        'مشاوي اللحم / Meat Grills': [
            { name: 'لحم ضاني نارنج / Narang Lamb', price: 35, image: 'https://images.unsplash.com/photo-1603048297172-c92544798d5a?w=400&h=300&fit=crop', desc: 'بتتبيلة سرية ١٢ ساعة / 12-hour secret marinade' },
            { name: 'أضلاع مدخنة / Smoked Ribs', price: 45, image: 'https://images.unsplash.com/photo-1558030006-450675393462?w=400&h=300&fit=crop', desc: 'مدخن على خشب الجوز / Smoked over walnut wood' },
            { name: 'مشكل مشاوي / Mixed Grill', price: 55, image: 'https://images.unsplash.com/photo-1544025162-d76694265947?w=400&h=300&fit=crop', desc: 'تشكيلة من أشهى اللحوم / Selection of finest meats' },
        ],
        'الدواجن / Poultry': [
            { name: 'فراخ على الفحم / Charcoal Chicken', price: 25, image: 'https://images.unsplash.com/photo-1587593810167-a84920ea0781?w=400&h=300&fit=crop', desc: 'بتتبيلة الليمون والزعتر / Lemon & thyme marinade' },
            { name: 'أرنب محشي / Stuffed Rabbit', price: 38, image: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=400&h=300&fit=crop', desc: 'محشي بالأرز والمكسرات / Stuffed with rice & nuts' },
            { name: 'صدور دجاج مشوية / Grilled Chicken Breast', price: 22, image: 'https://images.unsplash.com/photo-1532550907401-a500c9a57435?w=400&h=300&fit=crop', desc: 'مع صوص الزبادي / With yogurt sauce' },
        ],
        'المأكولات البحرية / Seafood': [
            { name: 'سمك فيليه / Fish Fillet', price: 32, image: 'https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?w=400&h=300&fit=crop', desc: 'مع صلصة الأعشاب الطازجة / With fresh herb sauce' },
            { name: 'جمبري مشوي / Grilled Shrimp', price: 48, image: 'https://images.unsplash.com/photo-1559314809-0d155014e29e?w=400&h=300&fit=crop', desc: 'مشوي بالثوم والزبدة / Grilled with garlic & butter' },
            { name: 'كاليماري مقلي / Fried Calamari', price: 38, image: 'https://images.unsplash.com/photo-1599487488170-d11ec9c172f0?w=400&h=300&fit=crop', desc: 'مقرمش مع صوص التارتار / Crispy with tartar sauce' },
        ],
        'المقبلات والسلطات / Appetizers & Salads': [
            { name: 'سلطة نارنج / Narang Salad', price: 12, image: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=400&h=300&fit=crop', desc: 'خضراوات عضوية بخل الرمان / Organic veggies with pomegranate vinegar' },
            { name: 'حمص باللحم / Hummus with Meat', price: 16, image: 'https://images.unsplash.com/photo-1563805042-7684c019e1cb?w=400&h=300&fit=crop', desc: 'حمص مع قطع اللحم المفروم / Hummus with minced meat' },
            { name: 'متبل باذنجان / Eggplant Mutabbal', price: 10, image: 'https://images.unsplash.com/photo-1589302168068-964664d93dc0?w=400&h=300&fit=crop', desc: 'باذنجان مشوي مع الطحينة / Grilled eggplant with tahini' },
        ]
    };

    const container = document.getElementById('menuContainer');
    let html = '';
    for (const [category, items] of Object.entries(menuData)) {
        const categoryParts = category.split(' / ');
        const categoryAr = categoryParts[0];
        const categoryEn = categoryParts[1] || categoryParts[0];
        const displayCategory = currentLang === 'ar' ? categoryAr : categoryEn;
        
        html += `<div class="menu-category"><h3>${displayCategory}</h3><div class="menu-grid">`;
        items.forEach(item => {
            const nameParts = item.name.split(' / ');
            const nameAr = nameParts[0];
            const nameEn = nameParts[1] || nameParts[0];
            const displayName = currentLang === 'ar' ? nameAr : nameEn;
            
            const descParts = item.desc.split(' / ');
            const descAr = descParts[0];
            const descEn = descParts[1] || descParts[0];
            const displayDesc = currentLang === 'ar' ? descAr : descEn;
            
            html += `
                <div class="menu-card">
                    <img src="${item.image}" alt="${displayName}" loading="lazy" onerror="this.src='https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=400&h=300&fit=crop'">
                    <div class="card-content">
                        <i class="fas fa-utensils"></i>
                        <h4>${displayName}</h4>
                        <div class="price">$${item.price}</div>
                        <p>${displayDesc}</p>
                    </div>
                </div>
            `;
        });
        html += `</div></div>`;
    }
    container.innerHTML = html;
}

// ===== التقييمات =====
async function loadReviews() {
    const result = await getReviews();
    const container = document.getElementById('reviewsGrid');
    
    if (!result.success || result.reviews.length === 0) {
        container.innerHTML = `<p style="text-align:center; opacity:0.7; grid-column:1/-1;">
            ${currentLang === 'ar' ? 'لا توجد تقييمات حتى الآن، كن أول من يقيم!' : 'No reviews yet, be the first to review!'}
        </p>`;
        return;
    }

    const isAdmin = currentUser && currentUser.role === 'admin';

    container.innerHTML = result.reviews.map(r => {
        const starStr = '★'.repeat(r.stars) + '☆'.repeat(5 - r.stars);
        const date = new Date(r.created_at).toLocaleDateString(currentLang === 'ar' ? 'ar-EG' : 'en-US');
        const deleteBtn = isAdmin ? `
            <button onclick="handleDeleteReview(${r.id})" style="
                background: #e74c3c; 
                color: #fff; 
                border: none; 
                padding: 5px 12px; 
                border-radius: 50px; 
                cursor: pointer; 
                font-size: 0.75rem;
                margin-top: 8px;
                transition: all 0.3s;
            " onmouseover="this.style.background='#c0392b'" onmouseout="this.style.background='#e74c3c'">
                ${currentLang === 'ar' ? '🗑️ حذف' : '🗑️ Delete'}
            </button>
        ` : '';
        
        return `
            <div class="review-card">
                <div class="stars">${starStr}</div>
                <p>“${r.review_text}”</p>
                <h4>— ${r.full_name || r.customer_name}</h4>
                <div class="date">${date}</div>
                ${deleteBtn}
            </div>
        `;
    }).join('');
}

// ===== تهيئة الصفحة =====
document.addEventListener('DOMContentLoaded', function() {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme) {
        currentTheme = savedTheme;
        document.documentElement.setAttribute('data-theme', currentTheme);
        document.getElementById('themeIcon').className = currentTheme === 'dark' ? 'fas fa-moon' : 'fas fa-sun';
    }
    
    updateLogo();
    
    const revealElements = document.querySelectorAll('.reveal');
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
            }
        });
    }, { threshold: 0.15 });

    revealElements.forEach(el => observer.observe(el));

    setTimeout(() => {
        revealElements.forEach(el => {
            const rect = el.getBoundingClientRect();
            if (rect.top < window.innerHeight * 0.85) {
                el.classList.add('visible');
            }
        });
    }, 200);
    
    document.addEventListener('click', function(e) {
        const nav = document.getElementById('navLinks');
        const menuBtn = document.querySelector('.mobile-menu-btn');
        if (nav.classList.contains('active') && !nav.contains(e.target) && !menuBtn.contains(e.target)) {
            nav.classList.remove('active');
        }
    });
});
