const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// =============================================
// قاعدة البيانات PostgreSQL (Neon)
// =============================================

// استخدام DATABASE_URL من متغيرات البيئة
const pool = new Pool({
    connectionString: process.env.DATABASE_URL || process.env.POSTGRES_URL,
    ssl: {
        rejectUnauthorized: false
    }
});

console.log('📊 جاري الاتصال بـ PostgreSQL (Neon)...');

pool.connect((err, client, release) => {
    if (err) {
        console.error('❌ خطأ في الاتصال:', err.message);
        console.log('⚠️ تأكد من إضافة DATABASE_URL في Environment Variables');
        return;
    }
    console.log('✅ تم الاتصال بقاعدة البيانات PostgreSQL (Neon)');
    release();
    createTables();
});

async function createTables() {
    try {
        // 1. جدول العملاء
        await pool.query(`
            CREATE TABLE IF NOT EXISTS customers (
                id SERIAL PRIMARY KEY,
                username TEXT UNIQUE NOT NULL,
                email TEXT UNIQUE NOT NULL,
                password TEXT NOT NULL,
                full_name TEXT,
                phone TEXT,
                address TEXT,
                role TEXT DEFAULT 'user',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                last_login TIMESTAMP
            )
        `);
        console.log('✅ جدول customers جاهز');

        // 2. جدول الحجوزات
        await pool.query(`
            CREATE TABLE IF NOT EXISTS bookings (
                id SERIAL PRIMARY KEY,
                customer_id INTEGER NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
                customer_name TEXT NOT NULL,
                customer_phone TEXT NOT NULL,
                booking_date TEXT NOT NULL,
                booking_time TEXT NOT NULL,
                number_of_people INTEGER NOT NULL,
                table_number INTEGER,
                special_requests TEXT,
                status TEXT DEFAULT 'pending',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        console.log('✅ جدول bookings جاهز');

        // 3. جدول التقييمات
        await pool.query(`
            CREATE TABLE IF NOT EXISTS reviews (
                id SERIAL PRIMARY KEY,
                customer_id INTEGER NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
                customer_name TEXT NOT NULL,
                stars INTEGER NOT NULL CHECK(stars >= 1 AND stars <= 5),
                review_text TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        console.log('✅ جدول reviews جاهز');

        // ===== إضافة الأدمن =====
        const adminCheck = await pool.query(
            `SELECT * FROM customers WHERE username = 'admin'`
        );

        if (adminCheck.rows.length === 0) {
            await pool.query(`
                INSERT INTO customers (username, email, password, full_name, phone, role)
                VALUES ('admin', 'admin@naring.com', 'admin123', 'مدير المطعم', '01020063819', 'admin')
            `);
            console.log('✅ تم إضافة حساب الأدمن: admin / admin123');
        } else {
            console.log('✅ حساب الأدمن موجود بالفعل');
        }

        // عرض المستخدمين
        const users = await pool.query(`SELECT id, username, role FROM customers`);
        console.log('\n📋 المستخدمين في قاعدة البيانات:');
        users.rows.forEach(r => console.log(`   ${r.id}. ${r.username} (${r.role})`));
        console.log('\n👑 استخدم: admin / admin123');
        console.log('💾 البيانات محفوظة في Neon PostgreSQL\n');

    } catch (err) {
        console.error('❌ خطأ في إنشاء الجداول:', err.message);
    }
}

// =============================================
// API Routes
// =============================================

// ===== تسجيل الدخول =====
app.post('/api/login', async (req, res) => {
    const { username, password } = req.body;
    console.log(`🔐 محاولة تسجيل دخول: ${username}`);

    try {
        const result = await pool.query(
            `SELECT * FROM customers WHERE username = $1 AND password = $2`,
            [username, password]
        );

        if (result.rows.length === 0) {
            console.log(`❌ فشل: ${username}`);
            return res.status(401).json({ success: false, message: 'اسم المستخدم أو كلمة المرور غير صحيحة' });
        }

        const customer = result.rows[0];
        console.log(`✅ نجاح: ${username} (${customer.role})`);

        await pool.query(
            `UPDATE customers SET last_login = CURRENT_TIMESTAMP WHERE id = $1`,
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
    } catch (err) {
        console.error('❌ خطأ:', err);
        res.status(500).json({ success: false, message: 'خطأ في الخادم' });
    }
});

// ===== إنشاء حساب =====
app.post('/api/register', async (req, res) => {
    const { username, email, password, full_name, phone } = req.body;

    try {
        const existing = await pool.query(
            `SELECT * FROM customers WHERE username = $1 OR email = $2`,
            [username, email]
        );

        if (existing.rows.length > 0) {
            const user = existing.rows[0];
            if (user.username === username) {
                return res.status(400).json({ success: false, message: 'اسم المستخدم موجود بالفعل' });
            }
            if (user.email === email) {
                return res.status(400).json({ success: false, message: 'البريد الإلكتروني مستخدم بالفعل' });
            }
        }

        const result = await pool.query(
            `INSERT INTO customers (username, email, password, full_name, phone, role) 
             VALUES ($1, $2, $3, $4, $5, 'user') RETURNING id, username, email, full_name, phone, role`,
            [username, email, password, full_name || username, phone || '']
        );

        res.json({
            success: true,
            message: 'تم إنشاء الحساب بنجاح',
            user: result.rows[0]
        });
    } catch (err) {
        console.error('❌ خطأ:', err);
        res.status(500).json({ success: false, message: 'خطأ في الخادم' });
    }
});

// ===== جلب التقييمات =====
app.get('/api/reviews', async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT r.*, c.full_name, c.username, c.role 
            FROM reviews r
            JOIN customers c ON r.customer_id = c.id
            ORDER BY r.created_at DESC
        `);
        res.json({ success: true, reviews: result.rows });
    } catch (err) {
        console.error('❌ خطأ:', err);
        res.status(500).json({ success: false, message: 'خطأ في جلب التقييمات', reviews: [] });
    }
});

// ===== إضافة تقييم =====
app.post('/api/reviews', async (req, res) => {
    const { customer_id, customer_name, stars, review_text } = req.body;

    try {
        const result = await pool.query(
            `INSERT INTO reviews (customer_id, customer_name, stars, review_text) 
             VALUES ($1, $2, $3, $4) RETURNING id, customer_name, stars, review_text`,
            [customer_id, customer_name, stars, review_text]
        );

        res.json({
            success: true,
            message: 'تم نشر التقييم بنجاح',
            review: result.rows[0]
        });
    } catch (err) {
        console.error('❌ خطأ:', err);
        res.status(500).json({ success: false, message: 'خطأ في إضافة التقييم' });
    }
});

// ===== حذف تقييم =====
app.delete('/api/reviews/:id', async (req, res) => {
    const { id } = req.params;
    const { admin_id } = req.body;

    try {
        const adminCheck = await pool.query(
            `SELECT role FROM customers WHERE id = $1`,
            [admin_id]
        );

        if (adminCheck.rows.length === 0 || adminCheck.rows[0].role !== 'admin') {
            return res.status(403).json({ success: false, message: 'غير مصرح به' });
        }

        const result = await pool.query(`DELETE FROM reviews WHERE id = $1 RETURNING id`, [id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'التقييم غير موجود' });
        }

        res.json({ success: true, message: 'تم حذف التقييم بنجاح' });
    } catch (err) {
        console.error('❌ خطأ:', err);
        res.status(500).json({ success: false, message: 'خطأ في حذف التقييم' });
    }
});

// ===== جلب الحجوزات =====
app.get('/api/bookings', async (req, res) => {
    const { customer_id } = req.query;

    try {
        let query = `
            SELECT b.*, c.username, c.full_name
            FROM bookings b
            JOIN customers c ON b.customer_id = c.id
        `;
        let params = [];

        if (customer_id) {
            query += ` WHERE b.customer_id = $1`;
            params.push(customer_id);
        }

        query += ` ORDER BY b.booking_date DESC, b.booking_time DESC`;

        const result = await pool.query(query, params);
        res.json({ success: true, bookings: result.rows });
    } catch (err) {
        console.error('❌ خطأ:', err);
        res.status(500).json({ success: false, message: 'خطأ في جلب الحجوزات', bookings: [] });
    }
});

// ===== حجز جديد =====
app.post('/api/bookings', async (req, res) => {
    const { customer_id, customer_name, customer_phone, booking_date, booking_time, number_of_people, special_requests } = req.body;

    try {
        await pool.query(
            `INSERT INTO bookings (customer_id, customer_name, customer_phone, booking_date, booking_time, number_of_people, special_requests)
             VALUES ($1, $2, $3, $4, $5, $6, $7)`,
            [customer_id, customer_name, customer_phone, booking_date, booking_time, number_of_people, special_requests || '']
        );

        res.json({ success: true, message: 'تم حجز الطاولة بنجاح' });
    } catch (err) {
        console.error('❌ خطأ:', err);
        res.status(500).json({ success: false, message: 'خطأ في إجراء الحجز' });
    }
});

// ===== التحقق من صلاحيات الأدمن =====
app.get('/api/check-admin/:id', async (req, res) => {
    const { id } = req.params;

    try {
        const result = await pool.query(`SELECT role FROM customers WHERE id = $1`, [id]);
        if (result.rows.length === 0) {
            return res.json({ isAdmin: false });
        }
        res.json({ isAdmin: result.rows[0].role === 'admin' });
    } catch (err) {
        res.json({ isAdmin: false });
    }
});

// ===== Admin APIs =====
app.get('/api/admin/customers', async (req, res) => {
    const { admin_id } = req.query;

    try {
        const adminCheck = await pool.query(`SELECT role FROM customers WHERE id = $1`, [admin_id]);
        if (adminCheck.rows.length === 0 || adminCheck.rows[0].role !== 'admin') {
            return res.status(403).json({ success: false, message: 'غير مصرح به' });
        }

        const result = await pool.query(`SELECT * FROM customers ORDER BY created_at DESC`);
        res.json(result.rows);
    } catch (err) {
        console.error('❌ خطأ:', err);
        res.status(500).json([]);
    }
});

app.get('/api/admin/bookings', async (req, res) => {
    const { admin_id } = req.query;

    try {
        const adminCheck = await pool.query(`SELECT role FROM customers WHERE id = $1`, [admin_id]);
        if (adminCheck.rows.length === 0 || adminCheck.rows[0].role !== 'admin') {
            return res.status(403).json({ success: false, message: 'غير مصرح به' });
        }

        const result = await pool.query(`SELECT * FROM bookings ORDER BY created_at DESC`);
        res.json(result.rows);
    } catch (err) {
        console.error('❌ خطأ:', err);
        res.status(500).json([]);
    }
});

app.get('/api/admin/reviews', async (req, res) => {
    const { admin_id } = req.query;

    try {
        const adminCheck = await pool.query(`SELECT role FROM customers WHERE id = $1`, [admin_id]);
        if (adminCheck.rows.length === 0 || adminCheck.rows[0].role !== 'admin') {
            return res.status(403).json({ success: false, message: 'غير مصرح به' });
        }

        const result = await pool.query(`SELECT * FROM reviews ORDER BY created_at DESC`);
        res.json(result.rows);
    } catch (err) {
        console.error('❌ خطأ:', err);
        res.status(500).json([]);
    }
});

app.get('/api/admin/stats', async (req, res) => {
    const { admin_id } = req.query;

    try {
        const adminCheck = await pool.query(`SELECT role FROM customers WHERE id = $1`, [admin_id]);
        if (adminCheck.rows.length === 0 || adminCheck.rows[0].role !== 'admin') {
            return res.status(403).json({ success: false, message: 'غير مصرح به' });
        }

        const customers = await pool.query(`SELECT COUNT(*) as count FROM customers`);
        const bookings = await pool.query(`SELECT COUNT(*) as count FROM bookings`);
        const reviews = await pool.query(`SELECT COUNT(*) as count FROM reviews`);
        const avgRating = await pool.query(`SELECT AVG(stars) as avg FROM reviews`);

        res.json({
            customers: parseInt(customers.rows[0].count),
            bookings: parseInt(bookings.rows[0].count),
            reviews: parseInt(reviews.rows[0].count),
            avg_rating: avgRating.rows[0].avg ? parseFloat(avgRating.rows[0].avg).toFixed(1) : '0'
        });
    } catch (err) {
        console.error('❌ خطأ:', err);
        res.status(500).json({ customers: 0, bookings: 0, reviews: 0, avg_rating: 0 });
    }
});

// ===== عرض الصفحات =====
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/admin.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

// ===== تشغيل الخادم =====
app.listen(PORT, () => {
    console.log(`\n🚀 الخادم يعمل على http://localhost:${PORT}`);
    console.log('📊 قاعدة البيانات: PostgreSQL (Neon)');
    console.log('👑 أدمن: admin / admin123');
    console.log('💾 البيانات محفوظة في Neon PostgreSQL\n');
});
