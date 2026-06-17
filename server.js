const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// =============================================
// قاعدة البيانات - In-Memory لـ Vercel
// =============================================

const DB_PATH = ':memory:';

console.log(`📊 استخدام قاعدة بيانات In-Memory (لـ Vercel)`);

const db = new sqlite3.Database(DB_PATH, (err) => {
    if (err) {
        console.error('❌ خطأ في فتح قاعدة البيانات:', err.message);
        process.exit(1);
    }
    console.log('✅ تم الاتصال بقاعدة البيانات (In-Memory)');
    createTables();
});

function createTables() {
    // 1. جدول العملاء (مع عمود role)
    db.run(`
        CREATE TABLE IF NOT EXISTS customers (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            email TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL,
            full_name TEXT,
            phone TEXT,
            address TEXT,
            role TEXT DEFAULT 'user',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            last_login DATETIME
        )
    `, (err) => {
        if (err) console.error('❌ خطأ في جدول customers:', err.message);
        else console.log('✅ جدول customers جاهز');
    });

    // 2. جدول الحجوزات
    db.run(`
        CREATE TABLE IF NOT EXISTS bookings (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            customer_id INTEGER NOT NULL,
            customer_name TEXT NOT NULL,
            customer_phone TEXT NOT NULL,
            booking_date TEXT NOT NULL,
            booking_time TEXT NOT NULL,
            number_of_people INTEGER NOT NULL,
            table_number INTEGER,
            special_requests TEXT,
            status TEXT DEFAULT 'pending',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (customer_id) REFERENCES customers(id)
        )
    `, (err) => {
        if (err) console.error('❌ خطأ في جدول bookings:', err.message);
        else console.log('✅ جدول bookings جاهز');
    });

    // 3. جدول التقييمات
    db.run(`
        CREATE TABLE IF NOT EXISTS reviews (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            customer_id INTEGER NOT NULL,
            customer_name TEXT NOT NULL,
            stars INTEGER NOT NULL CHECK(stars >= 1 AND stars <= 5),
            review_text TEXT NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (customer_id) REFERENCES customers(id)
        )
    `, (err) => {
        if (err) console.error('❌ خطأ في جدول reviews:', err.message);
        else console.log('✅ جدول reviews جاهز');
    });

    // ===== إضافة الأدمن بشكل آمن =====
    setTimeout(() => {
        // حذف أي مستخدمين موجودين (للتأكد من عدم وجود تعارض)
        db.run(`DELETE FROM customers`, (err) => {
            if (err) {
                console.error('❌ خطأ في حذف المستخدمين:', err.message);
                return;
            }
            console.log('🗑️ تم حذف جميع المستخدمين السابقين');

            // إضافة الأدمن
            db.run(`
                INSERT INTO customers (username, email, password, full_name, phone, role)
                VALUES ('admin', 'admin@naring.com', 'admin123', 'مدير المطعم', '01020063819', 'admin')
            `, function(err) {
                if (err) {
                    console.error('❌ خطأ في إضافة الأدمن:', err.message);
                } else {
                    console.log('✅ تم إضافة حساب الأدمن: admin / admin123');
                }

                // عرض جميع المستخدمين
                db.all(`SELECT id, username, role FROM customers`, (err, rows) => {
                    if (err) {
                        console.error('❌ خطأ في عرض المستخدمين:', err.message);
                        return;
                    }
                    console.log('\n📋 المستخدمين في قاعدة البيانات:');
                    if (rows.length === 0) {
                        console.log('   ❌ لا يوجد مستخدمين!');
                    } else {
                        rows.forEach(r => console.log(`   ${r.id}. ${r.username} (${r.role})`));
                    }
                    console.log('\n👑 استخدم: admin / admin123');
                    console.log('⚠️  ملاحظة: البيانات في الذاكرة فقط (تختفي عند إعادة التشغيل)\n');
                });
            });
        });
    }, 200);
}

// =============================================
// API Routes
// =============================================

// ===== تسجيل الدخول (مع إرجاع الدور) =====
app.post('/api/login', (req, res) => {
    const { username, password } = req.body;
    console.log(`🔐 محاولة تسجيل دخول: ${username}`);
    
    db.get(
        `SELECT * FROM customers WHERE username = ? AND password = ?`,
        [username, password],
        (err, customer) => {
            if (err) {
                console.error('❌ خطأ في الاستعلام:', err);
                return res.status(500).json({ success: false, message: 'خطأ في الخادم' });
            }
            if (!customer) {
                console.log(`❌ فشل: ${username} - غير موجود أو كلمة مرور خاطئة`);
                return res.status(401).json({ success: false, message: 'اسم المستخدم أو كلمة المرور غير صحيحة' });
            }
            
            console.log(`✅ نجاح: ${username} (${customer.role})`);
            
            db.run(
                `UPDATE customers SET last_login = CURRENT_TIMESTAMP WHERE id = ?`,
                [customer.id]
            );
            
            res.json({ 
                success: true, 
                message: 'تم تسجيل الدخول بنجاح',
                user: {
                    id: customer.id,
                    username: customer.username,
                    email: customer.email,
                    full_name: customer.full_name,
                    phone: customer.phone,
                    role: customer.role || 'user'
                }
            });
        }
    );
});

// ===== إنشاء حساب (دائماً user) =====
app.post('/api/register', (req, res) => {
    const { username, email, password, full_name, phone } = req.body;
    
    db.get(
        `SELECT * FROM customers WHERE username = ? OR email = ?`,
        [username, email],
        (err, existing) => {
            if (err) {
                return res.status(500).json({ success: false, message: 'خطأ في الخادم' });
            }
            if (existing) {
                if (existing.username === username) {
                    return res.status(400).json({ success: false, message: 'اسم المستخدم موجود بالفعل' });
                }
                if (existing.email === email) {
                    return res.status(400).json({ success: false, message: 'البريد الإلكتروني مستخدم بالفعل' });
                }
            }
            
            db.run(
                `INSERT INTO customers (username, email, password, full_name, phone, role) 
                 VALUES (?, ?, ?, ?, ?, 'user')`,
                [username, email, password, full_name || username, phone || ''],
                function(err) {
                    if (err) {
                        return res.status(500).json({ success: false, message: 'خطأ في إنشاء الحساب' });
                    }
                    res.json({ 
                        success: true, 
                        message: 'تم إنشاء الحساب بنجاح',
                        user: { 
                            id: this.lastID, 
                            username, 
                            email, 
                            full_name: full_name || username,
                            phone: phone || '',
                            role: 'user'
                        }
                    });
                }
            );
        }
    );
});

// ===== جلب التقييمات (مع إظهار اسم المستخدم) =====
app.get('/api/reviews', (req, res) => {
    db.all(
        `SELECT r.*, c.full_name, c.username, c.role 
         FROM reviews r
         JOIN customers c ON r.customer_id = c.id
         ORDER BY r.created_at DESC`,
        (err, reviews) => {
            if (err) {
                return res.status(500).json({ success: false, message: 'خطأ في جلب التقييمات', reviews: [] });
            }
            res.json({ success: true, reviews: reviews || [] });
        }
    );
});

// ===== إضافة تقييم =====
app.post('/api/reviews', (req, res) => {
    const { customer_id, customer_name, stars, review_text } = req.body;
    
    db.run(
        `INSERT INTO reviews (customer_id, customer_name, stars, review_text) 
         VALUES (?, ?, ?, ?)`,
        [customer_id, customer_name, stars, review_text],
        function(err) {
            if (err) {
                return res.status(500).json({ success: false, message: 'خطأ في إضافة التقييم' });
            }
            res.json({ 
                success: true, 
                message: 'تم نشر التقييم بنجاح',
                review: { id: this.lastID, customer_name, stars, review_text }
            });
        }
    );
});

// ===== حذف تقييم (للأدمن فقط) =====
app.delete('/api/reviews/:id', (req, res) => {
    const { id } = req.params;
    const { admin_id } = req.body;
    
    // التحقق من أن المستخدم أدمن
    db.get(`SELECT role FROM customers WHERE id = ?`, [admin_id], (err, user) => {
        if (err || !user) {
            return res.status(401).json({ success: false, message: 'غير مصرح به' });
        }
        if (user.role !== 'admin') {
            return res.status(403).json({ success: false, message: 'صلاحيات غير كافية' });
        }
        
        // حذف التقييم
        db.run(`DELETE FROM reviews WHERE id = ?`, [id], function(err) {
            if (err) {
                return res.status(500).json({ success: false, message: 'خطأ في حذف التقييم' });
            }
            if (this.changes === 0) {
                return res.status(404).json({ success: false, message: 'التقييم غير موجود' });
            }
            res.json({ success: true, message: 'تم حذف التقييم بنجاح' });
        });
    });
});

// ===== جلب الحجوزات (للصفحة الرئيسية) =====
app.get('/api/bookings', (req, res) => {
    const { customer_id } = req.query;
    let query = `
        SELECT b.*, c.username, c.full_name
        FROM bookings b
        JOIN customers c ON b.customer_id = c.id
    `;
    let params = [];
    
    if (customer_id) {
        query += ` WHERE b.customer_id = ?`;
        params.push(customer_id);
    }
    
    query += ` ORDER BY b.booking_date DESC, b.booking_time DESC`;
    
    db.all(query, params, (err, bookings) => {
        if (err) {
            return res.status(500).json({ success: false, message: 'خطأ في جلب الحجوزات', bookings: [] });
        }
        res.json({ success: true, bookings: bookings || [] });
    });
});

// ===== حجز جديد =====
app.post('/api/bookings', (req, res) => {
    const { customer_id, customer_name, customer_phone, booking_date, booking_time, number_of_people, special_requests } = req.body;
    
    db.run(
        `INSERT INTO bookings (customer_id, customer_name, customer_phone, booking_date, booking_time, number_of_people, special_requests)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [customer_id, customer_name, customer_phone, booking_date, booking_time, number_of_people, special_requests || ''],
        function(err) {
            if (err) {
                return res.status(500).json({ success: false, message: 'خطأ في إجراء الحجز' });
            }
            res.json({ 
                success: true, 
                message: 'تم حجز الطاولة بنجاح'
            });
        }
    );
});

// =============================================
// API للتحقق من صلاحيات الأدمن
// =============================================

// ===== التحقق من صلاحيات المستخدم =====
app.get('/api/check-admin/:id', (req, res) => {
    const { id } = req.params;
    
    db.get(`SELECT role FROM customers WHERE id = ?`, [id], (err, user) => {
        if (err || !user) {
            return res.json({ isAdmin: false });
        }
        res.json({ isAdmin: user.role === 'admin' });
    });
});

// =============================================
// Admin APIs (للأدمن فقط)
// =============================================

// ===== عرض كل العملاء =====
app.get('/api/admin/customers', (req, res) => {
    const { admin_id } = req.query;
    
    db.get(`SELECT role FROM customers WHERE id = ?`, [admin_id], (err, user) => {
        if (err || !user || user.role !== 'admin') {
            return res.status(403).json({ success: false, message: 'غير مصرح به' });
        }
        
        db.all(`SELECT * FROM customers ORDER BY created_at DESC`, (err, rows) => {
            if (err) {
                return res.status(500).json([]);
            }
            res.json(rows || []);
        });
    });
});

// ===== عرض كل الحجوزات =====
app.get('/api/admin/bookings', (req, res) => {
    const { admin_id } = req.query;
    
    db.get(`SELECT role FROM customers WHERE id = ?`, [admin_id], (err, user) => {
        if (err || !user || user.role !== 'admin') {
            return res.status(403).json({ success: false, message: 'غير مصرح به' });
        }
        
        db.all(`SELECT * FROM bookings ORDER BY created_at DESC`, (err, rows) => {
            if (err) {
                return res.status(500).json([]);
            }
            res.json(rows || []);
        });
    });
});

// ===== عرض كل التقييمات =====
app.get('/api/admin/reviews', (req, res) => {
    const { admin_id } = req.query;
    
    db.get(`SELECT role FROM customers WHERE id = ?`, [admin_id], (err, user) => {
        if (err || !user || user.role !== 'admin') {
            return res.status(403).json({ success: false, message: 'غير مصرح به' });
        }
        
        db.all(`SELECT * FROM reviews ORDER BY created_at DESC`, (err, rows) => {
            if (err) {
                return res.status(500).json([]);
            }
            res.json(rows || []);
        });
    });
});

// ===== الإحصائيات (للأدمن فقط) =====
app.get('/api/admin/stats', (req, res) => {
    const { admin_id } = req.query;
    
    db.get(`SELECT role FROM customers WHERE id = ?`, [admin_id], (err, user) => {
        if (err || !user || user.role !== 'admin') {
            return res.status(403).json({ success: false, message: 'غير مصرح به' });
        }
        
        const stats = { customers: 0, bookings: 0, reviews: 0, avg_rating: 0 };
        let completed = 0;
        let hasError = false;
        
        const checkComplete = () => {
            if (completed === 4 && !hasError) {
                res.json(stats);
            } else if (hasError) {
                res.status(500).json(stats);
            }
        };
        
        db.get(`SELECT COUNT(*) as count FROM customers`, (err, row) => {
            if (!err && row) stats.customers = row.count;
            else hasError = true;
            completed++;
            checkComplete();
        });
        
        db.get(`SELECT COUNT(*) as count FROM bookings`, (err, row) => {
            if (!err && row) stats.bookings = row.count;
            else hasError = true;
            completed++;
            checkComplete();
        });
        
        db.get(`SELECT COUNT(*) as count FROM reviews`, (err, row) => {
            if (!err && row) stats.reviews = row.count;
            else hasError = true;
            completed++;
            checkComplete();
        });
        
        db.get(`SELECT AVG(stars) as avg FROM reviews`, (err, row) => {
            if (!err && row && row.avg) {
                stats.avg_rating = parseFloat(row.avg).toFixed(1);
            }
            completed++;
            checkComplete();
        });
    });
});

// =============================================
// عرض الصفحات
// =============================================

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/admin.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

// =============================================
// تشغيل الخادم
// =============================================
app.listen(PORT, () => {
    console.log(`\n🚀 الخادم يعمل على http://localhost:${PORT}`);
    console.log('📊 قاعدة البيانات: In-Memory (لـ Vercel)');
    console.log('📁 المسار:', __dirname);
    console.log('📋 صفحة admin: http://localhost:3000/admin.html');
    console.log('\n⚠️  ملاحظة: البيانات في الذاكرة فقط (تختفي عند إعادة التشغيل)');
    console.log('👑 أدمن: admin / admin123');
    console.log('💡 جرب تدخل بـ admin / admin123\n');
});
