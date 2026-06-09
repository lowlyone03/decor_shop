require('dotenv').config({ quiet: true });
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
const compression = require('compression');
const http = require('http');
const os = require('os');
const connectDB = require('./config/db');
const initSocket = require('./config/socket');

const app = express();
const server = http.createServer(app);

// Initialize Socket.io
const io = initSocket(server, app);
app.set('io', io);

const PORT = process.env.PORT || 5000;

// ANSI Colors for beautiful logs
const ansi = {
    reset: '\x1b[0m',
    cyan: '\x1b[36m',
    green: '\x1b[32m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    white: '\x1b[37m',
    bold: '\x1b[1m',
    dim: '\x1b[2m'
};

function color(text, ...codes) {
    return `${codes.join('')}${text}${ansi.reset}`;
}

// Helper to get network IP address
function getNetworkIP() {
    const interfaces = os.networkInterfaces();
    for (const devName in interfaces) {
        const iface = interfaces[devName];
        for (let i = 0; i < iface.length; i++) {
            const alias = iface[i];
            if (alias.family === 'IPv4' && alias.address !== '127.0.0.1' && !alias.internal) {
                return alias.address;
            }
        }
    }
    return null;
}

function formatRequestUrl(req) {
    const originalUrl = req.originalUrl || req.url || '';
    try {
        const parsedUrl = new URL(originalUrl, 'http://localhost');
        const params = Array.from(parsedUrl.searchParams.entries())
            .filter(([key]) => key !== 'vnp_SecureHash')
            .map(([key, value]) => {
                if (key === 'vnp_OrderInfo') return `${key}=${String(value).slice(0, 36)}`;
                return `${key}=${String(value).slice(0, 18)}`;
            });

        if (!params.length) return parsedUrl.pathname;
        const query = params.slice(0, 4).join('&');
        const suffix = params.length > 4 ? `&...+${params.length - 4}` : '';
        return `${parsedUrl.pathname}?${query}${suffix}`;
    } catch {
        return originalUrl.length > 110 ? `${originalUrl.slice(0, 107)}...` : originalUrl;
    }
}

// Get all API routes
function getAppRoutes() {
    const routes = [
        { method: 'GET', path: '/api/health' }
    ];
    
    function parseRouter(router, prefix) {
        if (router && router.stack) {
            router.stack.forEach((layer) => {
                if (layer.route) {
                    const methods = Object.keys(layer.route.methods).map(m => m.toUpperCase());
                    methods.forEach((method) => {
                        const fullPath = `${prefix}${layer.route.path}`.replace(/\/+/g, '/');
                        routes.push({ method, path: fullPath });
                    });
                }
            });
        }
    }
    
    try {
        const authRoutes = require('./routes/authRoutes');
        const productRoutes = require('./routes/productRoutes');
        const cartRoutes = require('./routes/cartRoutes');
        const orderRoutes = require('./routes/orderRoutes');
        const paymentRoutes = require('./routes/paymentRoutes');
        const adminRoutes = require('./routes/adminRoutes');
        const otherRoutes = require('./routes/otherRoutes');
        const staffRoutes = require('./routes/staffRoutes');
        
        parseRouter(authRoutes, '/api/auth');
        parseRouter(productRoutes, '/api');
        parseRouter(cartRoutes, '/api/cart');
        parseRouter(orderRoutes, '/api/orders');
        parseRouter(paymentRoutes, '/api/payments');
        parseRouter(adminRoutes, '/api/admin');
        parseRouter(staffRoutes, '/api/staff');
        parseRouter(otherRoutes, '/api');
    } catch (e) {
        // Fallback silently if routes are not loaded yet
    }
    
    return routes;
}

// Print beautifully mapped routes
function logRoutesTable() {
    const routes = getAppRoutes();
    if (!routes.length) return;
    
    routes.sort((a, b) => {
        if (a.path !== b.path) return a.path.localeCompare(b.path);
        return a.method.localeCompare(b.method);
    });

    console.log(color('  Mapped API Endpoints:', ansi.bold, ansi.cyan));
    
    routes.forEach(({ method, path }) => {
        let methodColor = ansi.green;
        if (method === 'POST') methodColor = ansi.blue;
        if (method === 'PUT' || method === 'PATCH') methodColor = ansi.yellow;
        if (method === 'DELETE') methodColor = ansi.red;
        
        console.log(`    ${color(method.padEnd(6), methodColor, ansi.bold)} ${color(path, ansi.dim)}`);
    });
    console.log('');
}

// Print Server Info
function logServerReady(port, dbName) {
    const networkIP = getNetworkIP();
    
    console.log('');
    // Beautiful Vite-like green pill logo
    console.log(color('  CASA DECOR SERVER  ', ansi.bold, '\x1b[42m', '\x1b[30m') + color(` v1.0.0`, ansi.dim));
    console.log('');
    console.log(`  ${color('➜', ansi.green, ansi.bold)}  ${color('Local:', ansi.bold)}   ${color(`http://localhost:${port}/`, ansi.cyan)}`);
    if (networkIP) {
        console.log(`  ${color('➜', ansi.green, ansi.bold)}  ${color('Network:', ansi.bold)} ${color(`http://${networkIP}:${port}/`, ansi.cyan)}`);
    }
    console.log(`  ${color('➜', ansi.green, ansi.bold)}  ${color('Database:', ansi.bold)} Connected to MongoDB ${color(`(${dbName})`, ansi.green)}`);
    console.log(`  ${color('➜', ansi.green, ansi.bold)}  ${color('Socket:', ansi.bold)}   Listening for WebSocket events`);
    console.log('');
    
    logRoutesTable();
}

function logServerError(error) {
    if (error.code === 'EADDRINUSE') {
        console.error(color('\n🚨 PORT ALREADY IN USE:', ansi.red, ansi.bold));
        console.error(`  Port ${PORT} is being used by another process.`);
        console.error(`  You can kill it or run on a different port:`);
        console.error(`  $env:PORT=${Number(PORT) + 1}; npm start\n`);
        process.exit(1);
    }
    console.error(error);
    process.exit(1);
}

// Request logger middleware
app.use((req, res, next) => {
    if (req.originalUrl.startsWith('/images') || req.originalUrl.match(/\.(css|js|png|jpg|jpeg|gif|svg|ico|html)$/i)) {
        return next();
    }
    
    const start = Date.now();
    res.on('finish', () => {
        const duration = Date.now() - start;
        const status = res.statusCode;
        
        let statusColor = ansi.green;
        if (status >= 500) statusColor = ansi.red;
        else if (status >= 400) statusColor = ansi.yellow;
        else if (status >= 300) statusColor = ansi.cyan;
        
        let methodColor = ansi.green;
        if (req.method === 'POST') methodColor = ansi.blue;
        else if (req.method === 'PUT' || req.method === 'PATCH') methodColor = ansi.yellow;
        else if (req.method === 'DELETE') methodColor = ansi.red;
        
        const timestamp = new Date().toLocaleTimeString('vi-VN', { hour12: false });
        
        const displayUrl = formatRequestUrl(req);

        console.log(
            `${color(`[${timestamp}]`, ansi.dim)} ` +
            `${color(req.method.padEnd(6), methodColor, ansi.bold)} ` +
            `${displayUrl} ` +
            `- ${color(status, statusColor, ansi.bold)} ` +
            `- ${color(`${duration}ms`, ansi.cyan)}`
        );
    });
    next();
});

// Security: Helmet HTTP headers
app.use(helmet({
    contentSecurityPolicy: false,  // disabled: we use inline scripts in HTML files
    crossOriginEmbedderPolicy: false
}));
app.disable('x-powered-by');

// Security: CORS
const allowedOrigins = (process.env.ALLOWED_ORIGINS || 'http://localhost:5000').split(',').map(o => o.trim());
app.use(cors({
    origin: (origin, cb) => {
        if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
        cb(new Error('Not allowed by CORS'));
    },
    credentials: true
}));

const isProduction = process.env.NODE_ENV === 'production';

// Security: Rate limiting - keep production guarded, but allow local development refreshes.
const generalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: isProduction ? 600 : 5000,
    standardHeaders: true,
    legacyHeaders: false,
    message: { message: 'Quá nhiều yêu cầu, vui lòng thử lại sau.' }
});
app.use('/api', generalLimiter);

// Security: Strict rate limit for auth routes.
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: isProduction ? 15 : 150,
    standardHeaders: true,
    legacyHeaders: false,
    message: { message: 'Quá nhiều lần thử đăng nhập, vui lòng thử lại sau 15 phút.' }
});
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);

// Middleware
app.use(compression());
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true, limit: '2mb' }));

// Static Assets
const assetCache = (maxAge = 0) => ({
    etag: true,
    maxAge,
    setHeaders(res, filePath) {
        if (/\.html$/i.test(filePath)) {
            res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
            res.setHeader('Pragma', 'no-cache');
            res.setHeader('Expires', '0');
            return;
        }
        if (/\.(?:css|js)$/i.test(filePath)) {
            if (process.env.NODE_ENV !== 'production') {
                res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
                res.setHeader('Pragma', 'no-cache');
                res.setHeader('Expires', '0');
                return;
            }
            res.setHeader('Cache-Control', 'public, max-age=300');
            return;
        }
        if (/\.(?:avif|webp|png|jpe?g|gif|svg|ico)$/i.test(filePath)) {
            res.setHeader('Cache-Control', 'public, max-age=604800, immutable');
        }
    }
});

app.use('/images', express.static(path.join(__dirname, '..', 'public', 'images'), assetCache('7d')));
app.use('/backups', express.static(path.join(__dirname, '..', 'backups')));
app.use(express.static(path.join(__dirname, '..', 'public'), assetCache()));

// Routes
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', message: 'API is running' });
});

// Import route modules
const authRoutes = require('./routes/authRoutes');
const productRoutes = require('./routes/productRoutes');
const cartRoutes = require('./routes/cartRoutes');
const orderRoutes = require('./routes/orderRoutes');
const paymentRoutes = require('./routes/paymentRoutes');
const adminRoutes = require('./routes/adminRoutes');
const otherRoutes = require('./routes/otherRoutes');
const staffRoutes = require('./routes/staffRoutes');

// Mount routes
app.use('/api/auth', authRoutes);
app.use('/api', productRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/staff', staffRoutes);
app.use('/api', otherRoutes);

// Redirect root to customers
app.get('/', (req, res) => {
    res.redirect('/customers/index.html');
});

// Global Error Handler
app.use((err, req, res, next) => {
    console.error(color('🚨 LỖI HỆ THỐNG:', ansi.red, ansi.bold), err.stack);
    res.status(500).json({ message: 'Có lỗi hệ thống xảy ra.' });
});

// Start sequence: Connect DB first, then listen
async function bootstrap() {
    try {
        const conn = await connectDB();
        const dbName = conn.connection.name || 'decor_shop';
        
        server.on('error', logServerError);
        server.listen(PORT, () => {
            logServerReady(PORT, dbName);

            // Khởi chạy Cron Jobs cho NVBH
            const { startShiftCron } = require('./jobs/shiftCron');
            startShiftCron(io);
        });
    } catch (err) {
        console.error(color('🚨 FAILED TO BOOTSTRAP SERVER:', ansi.red, ansi.bold), err);
        process.exit(1);
    }
}

bootstrap();
