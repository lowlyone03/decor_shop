const API = '/api';

const state = {
    data: null,
    chartMode: 'day',
    currentView: 'dashboard',
    profileEditing: false,
    activities: [],
    notificationPrefs: null,
    products: { page: 1, limit: 8, data: null },
    categories: { page: 1, limit: 10, filter: { q: '', status: 'all', type: 'all', slug: 'all' }, data: null },
    orders: { page: 1, limit: 10, filter: { q: '', status: 'all' }, data: null },
    customers: { page: 1, limit: 10, filter: { q: '', status: 'all' }, data: null },
    staff: { data: null, shifts: [], stats: {} },
    reviews: { page: 1, limit: 10, filter: { status: 'all' }, data: null },
    promotions: { page: 1, limit: 10, filter: { q: '', status: 'all' }, data: null },
    contacts: { page: 1, limit: 10, filter: { q: '', status: 'all' }, data: null }
};

const statusMeta = {
    pending: { label: 'Chờ xác nhận', icon: 'fa-regular fa-clock', color: '#dca941', tint: '#fff0d0' },
    processing: { label: 'Đang xử lý', icon: 'fa-solid fa-box-open', color: '#bd724b', tint: '#ffe3d8' },
    shipping: { label: 'Đang giao hàng', icon: 'fa-solid fa-truck-fast', color: '#3d82c4', tint: '#ddecfb' },
    completed: { label: 'Đã hoàn tất', icon: 'fa-solid fa-circle-check', color: '#16a34a', tint: '#e5f5dd' },
    cancellation_requested: { label: 'Yêu cầu hủy', icon: 'fa-solid fa-circle-exclamation', color: '#cf5148', tint: '#ffe3e1' },
    cancelled: { label: 'Đã hủy đơn', icon: 'fa-regular fa-circle-xmark', color: '#cf5148', tint: '#ffe3e1' },
    return_requested: { label: 'Yêu cầu trả hàng', icon: 'fa-solid fa-rotate-left', color: '#e67e22', tint: '#fff0d0' },
    refunding: { label: 'Đang hoàn tiền', icon: 'fa-solid fa-hand-holding-dollar', color: '#e67e22', tint: '#fff0d0' },
    refunded: { label: 'Đã hoàn tiền', icon: 'fa-solid fa-circle-dollar-to-slot', color: '#16a34a', tint: '#e5f5dd' }
};

const paymentMeta = {
    cod: 'COD',
    bank_transfer: 'Chuyển khoản',
    vnpay: 'VNPay',
    unpaid: 'Chưa thanh toán',
    paid: 'Đã thanh toán',
    refunded: 'Đã hoàn tiền'
};

const quickActions = [
    { label: 'Thêm sản phẩm', icon: 'fa-solid fa-cube', target: 'products' },
    { label: 'Tạo khuyến mãi', icon: 'fa-solid fa-tags', target: 'promotions' },
    { label: 'Thêm banner', icon: 'fa-regular fa-image', target: 'banners' },
    { label: 'Viết blog', icon: 'fa-regular fa-newspaper', target: 'blog' },
    { label: 'Phân công ca', icon: 'fa-regular fa-calendar-check', target: 'schedule' },
    { label: 'Xem báo cáo', icon: 'fa-solid fa-chart-column', target: 'reports' }
];

function pageFromPath() {
    const path = window.location.pathname.toLowerCase();
    if (path.endsWith('/products.html')) return 'products';
    if (path.endsWith('/categories.html')) return 'categories';
    if (path.endsWith('/orders.html')) return 'orders';
    if (path.endsWith('/customers.html')) return 'customers';
    if (path.endsWith('/staff.html')) return 'staff';
    if (path.endsWith('/reviews.html')) return 'reviews';
    if (path.endsWith('/promotions.html')) return 'promotions';
    if (path.endsWith('/banners.html')) return 'banners';
    if (path.endsWith('/blog.html')) return 'blog';
    if (path.endsWith('/contacts.html')) return 'contacts';
    if (path.endsWith('/profile.html')) return 'profile';
    if (path.endsWith('/inventory.html')) return 'inventory';
    if (path.endsWith('/schedule.html')) return 'schedule';
    return 'dashboard';
}

function viewUrl(view) {
    if (view === 'products') return '/admin/products.html';
    if (view === 'categories') return '/admin/categories.html';
    if (view === 'orders') return '/admin/orders.html';
    if (view === 'customers') return '/admin/customers.html';
    if (view === 'staff') return '/admin/staff.html';
    if (view === 'reviews') return '/admin/reviews.html';
    if (view === 'promotions') return '/admin/promotions.html';
    if (view === 'profile') return '/admin/profile.html';
    if (view === 'banners') return '/admin/banners.html';
    if (view === 'blog') return '/admin/blog.html';
    if (view === 'contacts') return '/admin/contacts.html';
    if (view === 'inventory') return '/admin/inventory.html';
    if (view === 'schedule') return '/admin/schedule.html';
    return '/admin/index.html';
}

function session() {
    return JSON.parse(localStorage.getItem('casaSession') || sessionStorage.getItem('casaSession') || 'null');
}

function saveSession(value) {
    localStorage.setItem('casaSession', JSON.stringify(value));
    sessionStorage.removeItem('casaSession');
}

function authHeaders() {
    const current = session();
    return current?.token ? { Authorization: `Bearer ${current.token}` } : {};
}

async function api(path, options = {}) {
    const response = await fetch(`${API}${path}`, {
        headers: { 'Content-Type': 'application/json', ...authHeaders(), ...(options.headers || {}) },
        ...options
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.message || 'Không thể tải dữ liệu.');
    return data;
}

async function ensureAdminSession() {
    const current = session();
    if (current?.token && ['admin', 'staff'].includes(current.user?.role)) return current;

    // No valid session — redirect to login page
    const loginUrl = '/customers/login.html?redirect=' + encodeURIComponent(window.location.pathname);
    window.location.href = loginUrl;
    throw new Error('Chưa đăng nhập.');
}

function money(value) {
    return Number(value || 0).toLocaleString('vi-VN') + 'đ';
}

function number(value) {
    return Number(value || 0).toLocaleString('vi-VN');
}

function dateText(value) {
    if (!value) return '';
    return new Date(value).toLocaleString('vi-VN', {
        hour: '2-digit',
        minute: '2-digit',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    });
}

function shortDate(value) {
    if (!value) return '';
    return new Date(value).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
}

function plainDate(value) {
    if (!value) return '';
    return new Date(value).toLocaleDateString('vi-VN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    });
}

function firstAddress(user) {
    const address = user?.addresses?.[0];
    if (!address) return '123 Đường Lê Lợi, Quận 1, TP. Hồ Chí Minh';
    if (address.street && address.street.includes(',')) return address.street;
    return [address.street, address.ward, address.district, address.city].filter(Boolean).join(', ');
}

function loadJson(key, fallback) {
    try {
        return JSON.parse(localStorage.getItem(key) || 'null') ?? fallback;
    } catch {
        return fallback;
    }
}

function saveJson(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
}

function loadNotificationPrefs() {
    if (!state.notificationPrefs) {
        state.notificationPrefs = loadJson('casaAdminNotifications', {
            email: true,
            orders: true,
            contacts: true,
            stock: true
        });
    }
    return state.notificationPrefs;
}

function recordActivity(title, note, icon = 'fa-regular fa-circle-check') {
    const item = {
        title,
        note,
        icon,
        time: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
    };
    state.activities = [item, ...state.activities].slice(0, 12);
    saveJson('casaAdminActivities', state.activities);
    if (state.data) renderAdminProfile(state.data);
}

function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, (char) => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
    })[char]);
}

function showToast(message) {
    const toast = document.querySelector('#toast');
    toast.textContent = message;
    toast.hidden = false;
    clearTimeout(showToast.timer);
    showToast.timer = setTimeout(() => {
        toast.hidden = true;
    }, 2400);
}

function dateInputValue(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

function setDefaultDates() {
    const today = new Date();
    const first = new Date(today.getFullYear(), today.getMonth(), 1);
    const dateFrom = document.querySelector('#dateFrom');
    const dateTo = document.querySelector('#dateTo');
    if (dateFrom) dateFrom.value = dateInputValue(first);
    if (dateTo) dateTo.value = dateInputValue(today);
}

function setAdminSessionControls(visible) {
    document.querySelectorAll('[data-admin-session]').forEach((item) => {
        item.hidden = !visible;
    });
}

function switchAdminView(view, updateHash = true) {
    state.currentView = ['profile', 'products', 'product-form', 'categories', 'orders', 'customers', 'staff', 'reviews', 'promotions', 'promotion-form', 'banners', 'blog', 'contacts', 'inventory', 'schedule'].includes(view) ? view : 'dashboard';
    const isProfile = state.currentView === 'profile';
    const isProducts = state.currentView === 'products';
    const isProductForm = state.currentView === 'product-form';
    const isCategories = state.currentView === 'categories';
    const isOrders = state.currentView === 'orders';
    const isCustomers = state.currentView === 'customers';
    const isStaff = state.currentView === 'staff';
    const isReviews = state.currentView === 'reviews';
    const isBanners = state.currentView === 'banners';
    const isBlog = state.currentView === 'blog';
    const isPromotions = state.currentView === 'promotions';
    const isContacts = state.currentView === 'contacts';
    const isInventory = state.currentView === 'inventory';
    const isSchedule = state.currentView === 'schedule';
    
    const dashboard = document.querySelector('#dashboardRoot');
    const profile = document.querySelector('#adminProfileView');
    const products = document.querySelector('#productManagerView');
    const productForm = document.querySelector('#productFormView');
    const categories = document.querySelector('#categoryManagerView');
    const ordersView = document.querySelector('#orderManagerView');
    const customersView = document.querySelector('#customerManagerView');
    const staffView = document.querySelector('#staffManagerView');
    const reviewsView = document.querySelector('#reviewManagerView');
    const bannersView = document.querySelector('#bannerManagerView');
    const blogView = document.querySelector('#blogManagerView');
    const contactsView = document.querySelector('#contactManagerView');

    if (dashboard) dashboard.hidden = isProfile || isProducts || isProductForm || isCategories || isOrders || isCustomers || isStaff || isReviews || isBanners || isBlog || isPromotions || isContacts || isInventory || isSchedule;
    if (profile) profile.hidden = !isProfile;
    if (products) products.hidden = !isProducts;
    if (productForm) productForm.hidden = !isProductForm;
    if (categories) categories.hidden = !isCategories;
    if (ordersView) ordersView.hidden = !isOrders;
    if (customersView) customersView.hidden = !isCustomers;
    if (staffView) staffView.hidden = !isStaff;
    if (reviewsView) reviewsView.hidden = !isReviews;
    if (bannersView) bannersView.hidden = !isBanners;
    if (blogView) blogView.hidden = !isBlog;
    if (contactsView) contactsView.hidden = !isContacts;

    document.querySelectorAll('[data-view]').forEach((item) => {
        const activeView = isProductForm ? 'products' : state.currentView;
        item.classList.toggle('active', item.dataset.view === activeView);
    });
    if (isProducts) loadProductManager();
    if (isCategories) loadCategoryManager();
    if (isOrders) loadOrderManager();
    if (isCustomers) loadCustomerManager();
    if (isStaff) loadStaffManager();
    if (isReviews) loadReviewManager();
    if (isContacts) loadContactManager();
    if (!isProfile && !isProducts && !isProductForm && !isCategories && !isOrders && !isCustomers && !isStaff && !isReviews && !isBanners && !isBlog && !isPromotions && !isContacts && state.data) requestAnimationFrame(drawRevenueChart);
    if (updateHash) requestAnimationFrame(() => window.scrollTo({ top: 0, left: 0 }));
}

function setProfileEditing(enabled) {
    state.profileEditing = enabled;
    const page = document.querySelector('#adminProfileView');
    page.classList.toggle('editing', enabled);
    ['#profileFullName', '#profileEmailInput', '#profilePhoneInput', '#profileBirthDateInput', '#profileAddressInput', '#profileCreatedAt'].forEach((selector) => {
        document.querySelector(selector).readOnly = !enabled;
    });
    document.querySelector('#profileRoleInput').disabled = !enabled;
    document.querySelector('[data-action="profile-cancel"]').hidden = !enabled;
    document.querySelector('#profileEditBtn').innerHTML = enabled
        ? '<i class="fa-solid fa-check"></i> Đang chỉnh sửa'
        : '<i class="fa-solid fa-pen"></i> Chỉnh sửa hồ sơ';
}

function kpiCard({ icon, title, value, note, change, target }) {
    const hasChange = change !== undefined;
    const direction = Number(change || 0) >= 0 ? 'up' : 'down';
    const clickAttr = target ? `style="cursor:pointer; transition: transform 0.2s;" onclick="window.location.href='/admin/${target}.html'" onmouseover="this.style.transform='translateY(-2px)'" onmouseout="this.style.transform='none'"` : '';
    return `
        <article class="kpi-card" ${clickAttr}>
            <span class="kpi-icon"><i class="${icon}"></i></span>
            <div>
                <h3>${escapeHtml(title)}</h3>
                <strong>${escapeHtml(value)}</strong>
                <small class="${hasChange ? direction : ''}">
                    ${hasChange ? `${direction === 'up' ? '↑' : '↓'} ${Math.abs(change)}% so với hôm qua` : escapeHtml(note || '')}
                </small>
            </div>
        </article>
    `;
}

function renderKpis(data) {
    const kpis = data.kpis;
    document.querySelector('#kpiGrid').innerHTML = [
        { icon: 'fa-solid fa-sack-dollar', title: 'Doanh thu hôm nay', value: money(kpis.revenueToday), change: kpis.revenueChange },
        { icon: 'fa-solid fa-cart-shopping', title: 'Đơn hàng mới', value: number(kpis.newOrders), change: kpis.newOrdersChange, target: 'orders' },
        { icon: 'fa-regular fa-clipboard', title: 'Đơn chờ xác nhận', value: number(kpis.pendingOrders), note: 'Cần xử lý sớm', target: 'orders' },
        { icon: 'fa-solid fa-box-open', title: 'Sản phẩm đang bán', value: number(kpis.activeProducts), note: 'Không đổi so với hôm qua', target: 'products' },
        { icon: 'fa-regular fa-user', title: 'Khách hàng mới', value: number(kpis.newCustomers), change: kpis.newCustomersChange, target: 'customers' },
        { icon: 'fa-solid fa-bullseye', title: 'Tỷ lệ hoàn thành đơn', value: `${kpis.completionRate || 0}%`, note: 'Trong khoảng đã chọn', target: 'orders' }
    ].map(kpiCard).join('');
}

function renderStatuses(data) {
    const root = document.querySelector('#orderStatuses');
    const statuses = data.orders.statuses || [];
    document.querySelector('#orderTotalText').textContent = '';
    root.innerHTML = statuses.map((item) => {
        const meta = statusMeta[item.status] || { label: item.status, color: '#9e6b50' };
        return `
            <div class="status-row" style="--status-color:${meta.color}; --status-bg:${meta.tint || '#f4ebe4'};">
                <i class="${escapeHtml(meta.icon || 'fa-regular fa-circle')}"></i>
                <span>${escapeHtml(meta.label)}</span>
                <b>${number(item.count)}</b>
            </div>
        `;
    }).join('');

    const rate = Number(data.kpis.completionRate || 0);
    const ring = document.querySelector('#completionRing');
    ring.style.setProperty('--value', `${rate * 3.6}deg`);
    ring.querySelector('span').textContent = `${rate}%`;
    document.querySelector('#completionText').textContent = rate ? '↑ Theo dữ liệu thực tế' : 'Chưa có đơn hoàn thành';
    document.querySelector('#orderTotalMetric').textContent = number(data.orders.total);
    document.querySelector('#statusInsights').innerHTML = [
        { value: number(data.kpis?.pendingOrders || 0), label: 'Đơn cần xử lý' },
        { value: `${rate}%`, label: 'Tỷ lệ hoàn thành' },
        { value: number(Math.max((data.orders?.total || 0) - (data.kpis?.pendingOrders || 0), 0)), label: 'Đơn đã phân luồng' }
    ].map((item) => `
        <div class="status-insight">
            <b>${escapeHtml(item.value)}</b>
            <span>${escapeHtml(item.label)}</span>
        </div>
    `).join('');
}

function setupChartCanvas(canvas) {
    const ratio = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    if (!canvas.dataset.chartHeight) {
        canvas.dataset.chartHeight = canvas.getAttribute('height') || 220;
    }
    const logicalHeight = Number(canvas.dataset.chartHeight);
    canvas.style.height = `${logicalHeight}px`;
    canvas.width = Math.max(320, Math.floor(rect.width * ratio));
    canvas.height = Math.floor(logicalHeight * ratio);
    return { ctx: canvas.getContext('2d'), ratio, width: canvas.width, height: canvas.height };
}

function drawRevenueChart() {
    const canvas = document.querySelector('#revenueChart');
    if (!canvas || !state.data?.revenue) return;
    if (canvas.closest('[hidden]')) return;
    const { ctx, width, height } = setupChartCanvas(canvas);
    const series = state.chartMode === 'month' ? state.data.revenue.byMonth : state.data.revenue.byDay;
    const ratio = window.devicePixelRatio || 1;
    const pad = { left: 46 * ratio, right: 16 * ratio, top: 18 * ratio, bottom: 34 * ratio };

    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);

    if (!series.length) {
        ctx.fillStyle = '#85766b';
        ctx.font = `${12 * ratio}px Be Vietnam Pro`;
        ctx.textAlign = 'center';
        ctx.fillText('Chưa có dữ liệu doanh thu trong khoảng này', width / 2, height / 2);
        return;
    }

    const maxRevenue = Math.max(...series.map((item) => item.revenue), 1);
    const chartWidth = width - pad.left - pad.right;
    const chartHeight = height - pad.top - pad.bottom;
    const yStep = maxRevenue / 4;

    ctx.strokeStyle = '#eadfd6';
    ctx.lineWidth = 1;
    ctx.fillStyle = '#85766b';
    ctx.font = `${10 * ratio}px Be Vietnam Pro`;
    ctx.textAlign = 'right';

    for (let i = 0; i <= 4; i += 1) {
        const y = pad.top + chartHeight - (chartHeight / 4) * i;
        ctx.beginPath();
        ctx.moveTo(pad.left, y);
        ctx.lineTo(width - pad.right, y);
        ctx.stroke();
        ctx.fillText(`${Math.round((yStep * i) / 1000000)}M`, pad.left - 7 * ratio, y + 4 * ratio);
    }

    const points = series.map((item, index) => {
        const x = pad.left + (series.length === 1 ? chartWidth / 2 : (chartWidth / (series.length - 1)) * index);
        const y = pad.top + chartHeight - (item.revenue / maxRevenue) * chartHeight;
        return { ...item, x, y };
    });

    const gradient = ctx.createLinearGradient(0, pad.top, 0, height - pad.bottom);
    gradient.addColorStop(0, 'rgba(189,118,84,.22)');
    gradient.addColorStop(1, 'rgba(189,118,84,0)');

    ctx.beginPath();
    points.forEach((point, index) => {
        if (index === 0) ctx.moveTo(point.x, point.y);
        else ctx.lineTo(point.x, point.y);
    });
    ctx.lineTo(points[points.length - 1].x, height - pad.bottom);
    ctx.lineTo(points[0].x, height - pad.bottom);
    ctx.closePath();
    ctx.fillStyle = gradient;
    ctx.fill();

    ctx.beginPath();
    points.forEach((point, index) => {
        if (index === 0) ctx.moveTo(point.x, point.y);
        else ctx.lineTo(point.x, point.y);
    });
    ctx.strokeStyle = '#bd7654';
    ctx.lineWidth = 2.4 * ratio;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.stroke();

    ctx.fillStyle = '#bd7654';
    points.forEach((point) => {
        ctx.beginPath();
        ctx.arc(point.x, point.y, 3.5 * ratio, 0, Math.PI * 2);
        ctx.fill();
    });

    ctx.fillStyle = '#85766b';
    ctx.textAlign = 'center';
    const labelStep = Math.max(Math.ceil(points.length / 6), 1);
    points.forEach((point, index) => {
        if (index !== 0 && index !== points.length - 1 && index % labelStep !== 0) return;
        const label = state.chartMode === 'month' ? point.label : shortDate(point.label);
        ctx.fillText(label, point.x, height - 11 * ratio);
    });
}

function renderRecentOrders(data) {
    const root = document.querySelector('#recentOrders');
    const rows = data.orders.recent || [];
    if (!rows.length) {
        root.innerHTML = '<tr><td colspan="7" class="empty-state">Chưa có đơn hàng trong hệ thống.</td></tr>';
        return;
    }
    root.innerHTML = rows.map((order) => {
        const status = statusMeta[order.orderStatus] || { label: order.orderStatus };
        return `
            <tr data-search="${escapeHtml(`${order.orderCode} ${order.customerName} ${status.label}`.toLowerCase())}">
                <td><b>${escapeHtml(order.orderCode)}</b></td>
                <td>${escapeHtml(order.customerName)}</td>
                <td>${money(order.totalAmount)}</td>
                <td><span class="badge ${escapeHtml(order.paymentStatus)}">${escapeHtml(paymentMeta[order.paymentStatus] || paymentMeta[order.paymentMethod] || order.paymentMethod)}</span></td>
                <td><span class="badge ${escapeHtml(order.orderStatus)}">${escapeHtml(status.label)}</span></td>
                <td>${dateText(order.createdAt)}</td>
                <td>
                    <div class="row-actions">
                        <button type="button" title="Xem chi tiết" data-action="view-order" data-id="${escapeHtml(order._id)}"><i class="fa-regular fa-eye"></i></button>
                        <button type="button" title="Chuyển trạng thái" data-action="next-order" data-id="${escapeHtml(order._id)}" data-status="${escapeHtml(order.orderStatus)}"><i class="fa-solid fa-arrow-right"></i></button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}

function renderInventory(data) {
    const root = document.querySelector('#inventoryList');
    const products = data.inventory || [];
    if (!products.length) {
        root.innerHTML = '<p class="empty-state">Chưa có sản phẩm tồn kho thấp.</p>';
        return;
    }
    root.innerHTML = products.map((product) => {
        const level = Number(product.stock || 0) <= 5 ? 'Rất thấp' : 'Thấp';
        return `
            <div class="item-row" data-search="${escapeHtml(`${product.name} ${product.sku}`.toLowerCase())}">
                <img src="${escapeHtml(product.image || '/images/banner1png.png')}" alt="${escapeHtml(product.name)}">
                <div><b>${escapeHtml(product.name)}</b><small>SKU: ${escapeHtml(product.sku)}</small></div>
                <div class="stock-number"><strong>${number(product.stock)}</strong><span>${level}</span></div>
            </div>
        `;
    }).join('');
}

function renderBestSellers(data) {
    const root = document.querySelector('#bestSellerList');
    const products = data.bestSellers || [];
    if (!products.length) {
        root.innerHTML = '<p class="empty-state">Chưa có dữ liệu bán chạy.</p>';
        return;
    }
    root.innerHTML = products.map((product, index) => `
        <div class="item-row" data-search="${escapeHtml(product.name.toLowerCase())}">
            <img src="${escapeHtml(product.image || '/images/banner1png.png')}" alt="${escapeHtml(product.name)}">
            <div><b>${index + 1}. ${escapeHtml(product.name)}</b><small>Đã bán: ${number(product.sold)}</small></div>
            <div class="stock-number"><strong>${money(product.salePrice || product.price)}</strong><span>${Number(product.rating || 0).toFixed(1)} sao</span></div>
        </div>
    `).join('');
}

function renderReviews(data) {
    const root = document.querySelector('#reviewList');
    const reviews = data.reviews || [];
    if (!reviews.length) {
        root.innerHTML = '<p class="empty-state">Chưa có đánh giá cần xử lý.</p>';
        return;
    }
    root.innerHTML = reviews.map((review) => `
        <div class="review-row" data-search="${escapeHtml(`${review.customerName} ${review.productName}`.toLowerCase())}">
            <div>
                <b>${escapeHtml(review.customerName)}</b>
                <span class="stars">${'★'.repeat(Number(review.rating || 0))}</span>
                <small>${escapeHtml(review.productName)} · ${escapeHtml(review.comment || 'Không có nội dung')}</small>
            </div>
            <div class="review-actions">
                <button class="approve" type="button" title="Duyệt" data-action="review-status" data-id="${escapeHtml(review._id)}" data-status="active"><i class="fa-solid fa-check"></i></button>
                <button class="hide" type="button" title="Ẩn" data-action="review-status" data-id="${escapeHtml(review._id)}" data-status="hidden"><i class="fa-solid fa-xmark"></i></button>
            </div>
        </div>
    `).join('');
}

function renderContacts(data) {
    const root = document.querySelector('#contactList');
    const contacts = data.contacts || [];
    if (!contacts.length) {
        root.innerHTML = '<p class="empty-state">Chưa có phản hồi khách hàng.</p>';
        return;
    }
    root.innerHTML = contacts.map((contact) => `
        <div class="contact-row" data-search="${escapeHtml(`${contact.fullName} ${contact.email} ${contact.message}`.toLowerCase())}">
            <div>
                <b>${escapeHtml(contact.fullName)}</b>
                <small>${dateText(contact.createdAt)} · ${escapeHtml(contact.message || '').slice(0, 84)}</small>
            </div>
            <button class="badge ${escapeHtml(contact.status)}" type="button" data-action="contact-status" data-id="${escapeHtml(contact._id)}" data-status="${escapeHtml(contact.status)}">
                ${contact.status === 'resolved' ? 'Đã phản hồi' : contact.status === 'processing' ? 'Đang xử lý' : 'Mới'}
            </button>
        </div>
    `).join('');
}

function renderPromotions(data) {
    const promo = data.promotions;
    document.querySelector('#promoSummary').innerHTML = `
        <div class="promo-dashboard">
            <div class="promo-focus">
                <span>Doanh thu từ KM</span>
                <b>${money(promo.revenue)}</b>
                <small>${promo.conversionRate}% chuyển đổi</small>
            </div>
            <div class="promo-bars">
                <p><span>Đơn hàng từ KM</span><b>${number(promo.orders)}</b></p>
                <p><span>Giá trị ưu đãi</span><b>${money(promo.discount)}</b></p>
                <p><span>Mã đang hoạt động</span><b>${number((promo.active || []).length)}</b></p>
            </div>
        </div>
    `;
}

function productStatusLabel(status, stock = 0) {
    if (status === 'hidden') return 'Đã ẩn';
    if (status === 'out_of_stock' || Number(stock) <= 0) return 'Đã hết';
    if (Number(stock) <= 10) return 'Sắp hết';
    return 'Đang bán';
}

function productStatusClass(status, stock = 0) {
    if (status === 'hidden') return 'hidden';
    if (status === 'out_of_stock' || Number(stock) <= 0) return 'cancelled';
    if (Number(stock) <= 10) return 'pending';
    return 'active';
}

async function loadCategoryManager(page = state.categories.page) {
    const categoryView = document.querySelector('#categoryManagerView');
    if (!categoryView || categoryView.hidden) return;

    const limit = state.categories.limit;
    const filter = state.categories.filter;
    const query = new URLSearchParams({
        page,
        limit,
        q: filter.q,
        status: filter.status,
        type: filter.type,
        slug: filter.slug || 'all'
    }).toString();

    try {
        const data = await api(`/admin/categories?${query}`);
        state.categories.data = data;
        state.categories.page = data.page;
        renderCategoryManager(data);
    } catch (error) {
        showToast(error.message);
    }
}

function renderCategoryManager(data) {
    document.getElementById('statTotalCategories').textContent = data.stats.total;
    document.getElementById('statActiveCategories').textContent = data.stats.active;
    document.getElementById('statFeaturedCategories').textContent = data.stats.featured;
    document.getElementById('statHiddenCategories').textContent = data.stats.hidden;

    document.getElementById('categoryActiveText').textContent = `${data.stats.active} danh mục đang hoạt động`;

    const rows = document.getElementById('categoryRows');
    if (!data.categories.length) {
        rows.innerHTML = '<tr><td colspan="7" class="empty-row"><i class="fa-regular fa-folder-open"></i><br>Không tìm thấy danh mục nào.</td></tr>';
    } else {
        rows.innerHTML = data.categories.map((category) => `
            <tr>
                <td><input type="checkbox" aria-label="Chọn"></td>
                <td>
                    <div class="product-cell category-cell">
                        <img src="${escapeHtml(category.image || '/images/default-product.png')}" alt="Ảnh">
                        <div><b>${escapeHtml(category.name)}</b></div>
                    </div>
                </td>
                <td style="color: #64748b;">${escapeHtml(category.slug)}</td>
                <td style="max-width: 250px; font-size: 0.9rem; color: #64748b;">${escapeHtml(category.description || '')}</td>
                <td style="text-align: center;"><b>${category.productCount || 0}</b></td>
                <td>
                    <span class="badge ${category.status === 'active' ? 'active' : 'hidden'}">${category.status === 'active' ? 'Đang hiển thị' : 'Đã ẩn'}</span>
                    ${category.isFeatured ? '<br><span class="badge" style="margin-top: 4px; border-color: transparent; color: #f39c12; background: #fff8eb;"><i class="fa-solid fa-star"></i> Nổi bật</span>' : ''}
                </td>
                <td style="color: #64748b; font-size: 0.9rem;">${dateText(category.updatedAt || category.createdAt)}</td>
                <td>
                    <div class="product-actions">
                        <button type="button" title="Sửa" data-action="category-edit" data-id="${escapeHtml(category._id)}"><i class="fa-regular fa-pen-to-square"></i></button>
                        <button type="button" title="Xem trên web" onclick="window.open('/${escapeHtml(category.slug)}', '_blank')"><i class="fa-regular fa-eye"></i></button>
                        <button type="button" title="Đánh dấu nổi bật" data-action="category-toggle-featured" data-id="${escapeHtml(category._id)}" data-featured="${category.isFeatured}"><i class="fa-solid fa-star" ${category.isFeatured ? 'style="color:#f39c12"' : ''}></i></button>
                        <button class="danger" type="button" title="Xóa" data-action="category-delete" data-id="${escapeHtml(category._id)}"><i class="fa-regular fa-trash-can"></i></button>
                    </div>
                </td>
            </tr>
        `).join('');
    }

    const start = (data.page - 1) * state.categories.limit + 1;
    const end = Math.min(data.page * state.categories.limit, data.total);
    document.getElementById('categoryPageText').textContent = data.total > 0 ? `${start} - ${end} của ${data.total} danh mục` : '0 danh mục';

    let pagerHtml = `<button type="button" ${data.page === 1 ? 'disabled' : ''} onclick="loadCategoryManager(${data.page - 1})"><i class="fa-solid fa-chevron-left"></i></button>`;
    for (let i = 1; i <= data.pages; i++) {
        pagerHtml += `<button type="button" class="${i === data.page ? 'active' : ''}" onclick="loadCategoryManager(${i})">${i}</button>`;
    }
    pagerHtml += `<button type="button" ${data.page === data.pages || data.pages === 0 ? 'disabled' : ''} onclick="loadCategoryManager(${data.page + 1})"><i class="fa-solid fa-chevron-right"></i></button>`;
    document.getElementById('categoryPager').innerHTML = pagerHtml;

    const featuredList = document.getElementById('featuredCategoryList');
    const featuredCats = data.categories.filter(c => c.isFeatured).slice(0, 6);
    if (!featuredCats.length) {
        featuredList.innerHTML = '<p style="text-align:center; padding: 20px; color:#9ca3af; font-size:0.9rem;">Chưa có danh mục nổi bật</p>';
    } else {
        featuredList.innerHTML = featuredCats.map(cat => `
            <div class="mini-item">
                <b>${escapeHtml(cat.name)}</b>
                <span>${escapeHtml(cat.slug)}</span>
            </div>
        `).join('');
    }

    const selectedSlug = state.categories.filter.slug || 'all';
    const allRadio = document.querySelector('input[name="quickFilterCat"][value="all"]');
    if (allRadio) allRadio.checked = (selectedSlug === 'all');

    const quickList = document.getElementById('quickFilterCategoryItems');
    if (quickList) {
        quickList.innerHTML = data.allCategories.map(cat => `
            <label class="radio-label">
                <input type="radio" name="quickFilterCat" value="${escapeHtml(cat.slug)}" ${cat.slug === selectedSlug ? 'checked' : ''}>
                <span>${escapeHtml(cat.name)}</span>
            </label>
        `).join('');
    }
}

async function loadOrderManager(page = state.orders.page) {
    const orderView = document.querySelector('#orderManagerView');
    if (!orderView || orderView.hidden) return;
    const params = new URLSearchParams({
        page: page,
        limit: state.orders.limit,
        q: state.orders.filter.q,
        status: state.orders.filter.status
    });
    try {
        const data = await api(`/admin/orders?${params.toString()}`);
        state.orders.page = data.page;
        state.orders.data = data;
        renderOrderManager(data);

        // Auto-open detail if ID is in URL
        const urlParams = new URLSearchParams(window.location.search);
        const orderId = urlParams.get('id');
        if (orderId && !state.orderDetailAutoOpened) {
            state.orderDetailAutoOpened = true;
            showOrderDetailView(orderId);
        }
    } catch (error) {
        showToast(error.message);
    }
}

function renderOrderManager(data) {
    document.getElementById('statTotalOrders').textContent = number(data.stats.total);
    document.getElementById('statPendingOrders').textContent = number(data.stats.pending);
    document.getElementById('statShippingOrders').textContent = number(data.stats.shipping);
    document.getElementById('statCompletedOrders').textContent = number(data.stats.completed);

    const tbody = document.getElementById('orderRows');
    if (!data.orders || !data.orders.length) {
        tbody.innerHTML = '<tr><td colspan="8" class="empty-state">Không có đơn hàng nào</td></tr>';
    } else {
        tbody.innerHTML = data.orders.map(order => `
            <tr>
                <td><input type="checkbox"></td>
                <td><b>${escapeHtml(order.orderCode)}</b></td>
                <td>
                    <div style="font-weight: 500; color: var(--admin-text);">${escapeHtml(order.shippingInfo?.fullName || order.customer?.name || 'Khách vãng lai')}</div>
                    <small style="color: var(--admin-muted);">${escapeHtml(order.shippingInfo?.phone || '')}</small>
                </td>
                <td style="color: var(--admin-muted); font-size: 0.9rem;">${dateText(order.createdAt)}</td>
                <td style="font-weight: 600; color: #a0522d;">${money(order.totalAmount)}</td>
                <td><span class="badge ${order.paymentStatus === 'paid' ? 'success' : (order.paymentStatus === 'refunded' ? 'danger' : 'warning')}">${order.paymentStatus === 'paid' ? 'Đã thanh toán' : (order.paymentStatus === 'refunded' ? 'Đã hoàn tiền' : 'Chưa thanh toán')}</span></td>
                <td><span class="badge ${order.orderStatus === 'completed' ? 'success' : (['shipping', 'processing'].includes(order.orderStatus) ? 'info' : (order.orderStatus === 'pending' ? 'warning' : 'danger'))}">${statusMeta[order.orderStatus]?.label || order.orderStatus}</span></td>
                <td>
                    <div class="product-actions">
                        <button type="button" title="Xem chi tiết" onclick="showOrderDetailView('${escapeHtml(order._id)}')"><i class="fa-regular fa-eye"></i></button>
                    </div>
                </td>
            </tr>
        `).join('');
    }

    const start = (data.page - 1) * state.orders.limit + 1;
    const end = Math.min(data.page * state.orders.limit, data.total);
    document.getElementById('orderPageText').textContent = data.total > 0 ? `${start} - ${end} của ${data.total} đơn hàng` : '0 đơn hàng';
}

function exportOrdersToCSV() {
    const orders = state.orders.data?.orders || [];
    if (!orders.length) {
        showToast('Không có dữ liệu để xuất.');
        return;
    }

    // CSV Headers (BOM for UTF-8 in Excel)
    let csv = '\uFEFF';
    csv += 'Mã đơn,Khách hàng,Số điện thoại,Ngày đặt,Tổng tiền,Thanh toán,Trạng thái\n';

    orders.forEach(order => {
        const name = order.shippingInfo?.fullName || order.customer?.name || 'Khách vãng lai';
        const phone = order.shippingInfo?.phone || '';
        const date = dateText(order.createdAt);
        const total = order.totalAmount;
        const pStatus = order.paymentStatus === 'paid' ? 'Đã thanh toán' : (order.paymentStatus === 'refunded' ? 'Đã hoàn tiền' : 'Chưa thanh toán');
        const oStatus = statusMeta[order.orderStatus]?.label || order.orderStatus;

        csv += `"${order.orderCode}","${name}","${phone}","${date}",${total},"${pStatus}","${oStatus}"\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.setAttribute('download', `Casa-Orders-${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('Đã xuất danh sách đơn hàng ra file CSV.');
}


async function showOrderDetail(orderId) {
    try {
        const order = await api(`/admin/orders/${orderId}`);

        document.getElementById('orderModalId').value = order._id;
        document.getElementById('orderModalTitle').textContent = `Đơn hàng #${order.orderCode}`;
        document.getElementById('orderModalStatusUpdate').value = order.orderStatus;

        document.getElementById('orderModalBody').innerHTML = `
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-bottom: 24px;">
                <div class="panel" style="padding: 16px; background: #fafafa;">
                    <h4 style="margin: 0 0 12px 0; font-size: 1rem; border-bottom: 1px solid #eaeaea; padding-bottom: 8px;">Thông tin khách hàng</h4>
                    <p style="margin: 4px 0;"><b>Tên:</b> ${escapeHtml(order.shippingInfo?.fullName || order.customer?.name || '')}</p>
                    <p style="margin: 4px 0;"><b>SĐT:</b> ${escapeHtml(order.shippingInfo?.phone || '')}</p>
                    <p style="margin: 4px 0;"><b>Địa chỉ:</b> ${escapeHtml(order.shippingInfo?.address || '')}, ${escapeHtml(order.shippingInfo?.ward || '')}, ${escapeHtml(order.shippingInfo?.district || '')}, ${escapeHtml(order.shippingInfo?.city || '')}</p>
                </div>
                <div class="panel" style="padding: 16px; background: #fafafa;">
                    <h4 style="margin: 0 0 12px 0; font-size: 1rem; border-bottom: 1px solid #eaeaea; padding-bottom: 8px;">Thanh toán</h4>
                    <p style="margin: 4px 0;"><b>Phương thức:</b> ${paymentMeta[order.paymentMethod] || order.paymentMethod}</p>
                    <p style="margin: 4px 0;"><b>Trạng thái:</b> <span class="badge ${order.paymentStatus === 'paid' ? 'success' : 'warning'}">${order.paymentStatus === 'paid' ? 'Đã thanh toán' : 'Chưa thanh toán'}</span></p>
                    <p style="margin: 4px 0;"><b>Ngày đặt:</b> ${dateText(order.createdAt)}</p>
                </div>
            </div>
            <table class="product-table" style="width: 100%;">
                <thead>
                    <tr>
                        <th style="text-align: left;">Sản phẩm</th>
                        <th>Đơn giá</th>
                        <th>Số lượng</th>
                        <th style="text-align: right;">Thành tiền</th>
                    </tr>
                </thead>
                <tbody>
                    ${order.items.map(item => `
                        <tr>
                            <td>
                                <div class="product-cell">
                                    <img src="${escapeHtml(item.image || '/images/default-product.png')}" alt="">
                                    <div><b>${escapeHtml(item.name)}</b></div>
                                </div>
                            </td>
                            <td style="text-align: center;">${money(item.purchasePrice)}</td>
                            <td style="text-align: center;">${item.quantity}</td>
                            <td style="text-align: right; font-weight: 600;">${money(item.itemTotal)}</td>
                        </tr>
                    `).join('')}
                </tbody>
                <tfoot>
                    <tr><td colspan="3" style="text-align: right; border-top: 1px solid #eee;">Tổng tiền hàng:</td><td style="text-align: right; border-top: 1px solid #eee;">${money(order.itemsTotal)}</td></tr>
                    <tr><td colspan="3" style="text-align: right;">Phí giao hàng:</td><td style="text-align: right;">${money(order.shippingFee)}</td></tr>
                    ${order.discountAmount ? `<tr><td colspan="3" style="text-align: right; color: #16a34a;">Giảm giá (${escapeHtml(order.promotionCode || '')}):</td><td style="text-align: right; color: #16a34a;">-${money(order.discountAmount)}</td></tr>` : ''}
                    <tr><td colspan="3" style="text-align: right; font-weight: bold; font-size: 1.1rem;">Tổng cộng:</td><td style="text-align: right; font-weight: bold; font-size: 1.1rem; color: #a0522d;">${money(order.totalAmount)}</td></tr>
                </tfoot>
            </table>
            ${order.note ? `<div style="margin-top: 16px; padding: 12px; background: #fff8f5; border-left: 3px solid #ff784b;"><b>Ghi chú:</b> ${escapeHtml(order.note)}</div>` : ''}
        `;

        document.getElementById('orderDetailModal').showModal();
    } catch (error) {
        showToast(error.message, 'error');
    }
}

async function submitOrderStatus() {
    const orderId = document.getElementById('orderModalId').value;
    const newStatus = document.getElementById('orderModalStatusUpdate').value;
    try {
        await api(`/admin/orders/${orderId}/status`, {
            method: 'PATCH',
            body: JSON.stringify({ status: newStatus })
        });
        showToast('Cập nhật trạng thái thành công', 'success');
        const modal = document.getElementById('orderDetailModal');
        if (modal && typeof modal.close === 'function') modal.close();
        loadOrderManager();
    } catch (error) {
        showToast(error.message);
    }
}

async function loadProductManager(page = state.products.page) {
    const productView = document.querySelector('#productManagerView');
    if (!productView || productView.hidden) return;
    const params = new URLSearchParams({
        page,
        limit: state.products.limit,
        q: document.querySelector('#productSearchInput')?.value || '',
        category: document.querySelector('#productCategoryFilter')?.value || '',
        status: document.querySelector('#productStatusFilter')?.value || 'all',
        stock: document.querySelector('#productStockFilter')?.value || ''
    });
    try {
        const data = await api(`/admin/products?${params.toString()}`);
        state.products = { ...state.products, page: data.page, data };
        renderProductManager(data);
    } catch (error) {
        showToast(error.message);
    }
}

function renderProductManager(data) {
    const categorySelect = document.querySelector('#productCategoryFilter');
    if (categorySelect && categorySelect.options.length <= 1) {
        categorySelect.insertAdjacentHTML('beforeend', data.categories.map((category) => `<option value="${escapeHtml(category._id)}">${escapeHtml(category.name)}</option>`).join(''));
    }
    document.querySelector('#productStatsGrid').innerHTML = [
        { icon: 'fa-solid fa-cube', label: 'Tổng sản phẩm', value: data.stats.total, note: 'Trong hệ thống', color: '#d46d4a', bg: '#fff0e8' },
        { icon: 'fa-regular fa-eye', label: 'Đang hiển thị', value: data.stats.active, note: 'Đang bán trên cửa hàng', color: '#43a56d', bg: '#e7f7ed' },
        { icon: 'fa-solid fa-triangle-exclamation', label: 'Sắp hết hàng', value: data.stats.lowStock, note: 'Cần nhập thêm', color: '#d99b32', bg: '#fff2d8' },
        { icon: 'fa-regular fa-eye-slash', label: 'Đang ẩn', value: data.stats.hidden, note: 'Không hiển thị', color: '#7b6ac5', bg: '#eeeafd' }
    ].map((item) => `
        <article class="product-stat-card" style="--stat-color:${item.color}; --stat-bg:${item.bg};">
            <i class="${item.icon}"></i><div><span>${escapeHtml(item.label)}</span><b>${number(item.value)}</b><small>${escapeHtml(item.note)}</small></div>
        </article>
    `).join('');

    document.querySelector('#productRows').innerHTML = data.products.length ? data.products.map((product) => `
        <tr>
            <td><input type="checkbox" aria-label="Chọn ${escapeHtml(product.name)}"></td>
            <td><div class="product-cell"><img src="${escapeHtml(product.image || '/images/banner1png.png')}" alt="${escapeHtml(product.name)}"><div><b>${escapeHtml(product.name)}</b><small>${escapeHtml(product.slug || '')}</small></div></div></td>
            <td>${escapeHtml(product.sku || product.slug || '')}</td>
            <td>${escapeHtml(product.category?.name || 'Chưa phân loại')}</td>
            <td>${money(product.salePrice || product.price)}</td>
            <td>${number(product.stock)}</td>
            <td><span class="badge ${productStatusClass(product.status, product.stock)}">${productStatusLabel(product.status, product.stock)}</span></td>
            <td>${dateText(product.updatedAt || product.createdAt)}</td>
            <td><div class="product-actions">
                <button type="button" title="Sửa" data-action="product-edit" data-id="${escapeHtml(product._id)}"><i class="fa-regular fa-pen-to-square"></i></button>
                <button type="button" title="Ẩn/hiện" data-action="product-toggle" data-id="${escapeHtml(product._id)}" data-status="${escapeHtml(product.status)}"><i class="fa-regular fa-eye"></i></button>
                <button type="button" title="Xem" data-action="product-view" data-slug="${escapeHtml(product.slug)}"><i class="fa-regular fa-image"></i></button>
                <button class="danger" type="button" title="Xóa mềm" data-action="product-delete" data-id="${escapeHtml(product._id)}"><i class="fa-regular fa-trash-can"></i></button>
            </div></td>
        </tr>
    `).join('') : '<tr><td colspan="9" class="empty-state">Không tìm thấy sản phẩm phù hợp.</td></tr>';

    document.querySelector('#productCategoryList').innerHTML = data.categories.slice(0, 6).map((category) => `
        <button type="button" data-action="product-category" data-id="${escapeHtml(category._id)}"><span><i class="fa-regular fa-folder"></i> ${escapeHtml(category.name)}</span><b>${escapeHtml(category.slug)}</b></button>
    `).join('');
    document.querySelector('#productLowList').innerHTML = data.lowStock.map((product) => `
        <div class="item-row"><img src="${escapeHtml(product.image || '/images/banner1png.png')}" alt="${escapeHtml(product.name)}"><div><b>${escapeHtml(product.name)}</b><small>Tồn kho: ${number(product.stock)}</small></div><div class="stock-number"><strong>${number(product.stock)}</strong><span>Thấp</span></div></div>
    `).join('') || '<p class="empty-state">Không có cảnh báo tồn kho.</p>';
    document.querySelector('#productWarningText').textContent = `${number(data.stats.outOfStock)} sản phẩm đã hết hàng`;
    const start = data.total ? ((data.page - 1) * state.products.limit) + 1 : 0;
    const end = Math.min(data.page * state.products.limit, data.total);
    document.querySelector('#productPageText').textContent = `${start} - ${end} của ${number(data.total)} sản phẩm`;
    document.querySelector('#productPager').innerHTML = Array.from({ length: Math.min(data.pages, 5) }, (_, index) => index + 1).map((page) => `
        <button class="${page === data.page ? 'active' : ''}" type="button" data-action="product-page" data-page="${page}">${page}</button>
    `).join('');
}

function renderStaff() {
    const root = document.querySelector('#staffStrip');
    if (root) root.innerHTML = '';
}

function renderQuickActions() {
    const html = quickActions.map((item) => `
        <button class="quick-action" type="button" data-action="quick" data-target="${item.target}">
            <i class="${item.icon}"></i><span>${escapeHtml(item.label)}</span>
        </button>
    `).join('');
    const quickActionsRoot = document.querySelector('#quickActions');
    if (quickActionsRoot) quickActionsRoot.innerHTML = html;
    const quickAddMenu = document.querySelector('#quickAddMenu');
    if (quickAddMenu) quickAddMenu.innerHTML = quickActions.map((item) => `
        <button type="button" data-action="quick" data-target="${item.target}">
            <i class="${item.icon}"></i><span>${escapeHtml(item.label)}</span>
        </button>
    `).join('');
    const data = state.data || {};
    const quickPanelExtra = document.querySelector('#quickPanelExtra');
    if (quickPanelExtra) quickPanelExtra.innerHTML = [
        { value: number(data.kpis?.pendingOrders || 0), label: 'Cần xác nhận' },
        { value: number((data.inventory || []).length), label: 'Sản phẩm tồn thấp' }
    ].map((item) => `
        <div class="quick-extra-card">
            <b>${escapeHtml(item.value)}</b>
            <span>${escapeHtml(item.label)}</span>
        </div>
    `).join('');
}

function renderAdmin(data) {
    document.querySelector('#adminName').textContent = data.admin?.name || 'Casa Decor Admin';
    document.querySelector('#adminRole').textContent = data.admin?.role === 'admin' ? 'Super Admin' : data.admin?.role || 'Admin';
    if (data.admin?.avatar) document.querySelector('#adminAvatar').src = data.admin.avatar;
    const pendingReviews = (data.reviews || []).filter((review) => review.status === 'pending').length;
    const pendingContacts = (data.contacts || []).filter((contact) => contact.status === 'pending').length;
    document.querySelector('[data-notify-count]').textContent = number((data.kpis?.pendingOrders || 0) + pendingReviews + pendingContacts);
}

function renderAdminProfile(data) {
    if (!document.querySelector('#profileAvatar')) return;
    const admin = data.admin || {};
    const name = admin.name || 'Casa Decor Admin';
    const role = admin.role === 'admin' ? 'Super Admin' : admin.role || 'Admin';
    const email = admin.email || '';
    const extras = loadJson('casaAdminProfileExtras', { birthDate: '1990-12-06', roleLabel: 'Super Admin', createdAt: '' });
    const phone = admin.phone && admin.phone !== '1900123456' ? admin.phone : '0336881795';
    const avatar = admin.avatar || '/images/logo/logo1.jpg';
    const adminCode = admin._id ? `ADM-${String(admin._id).slice(-8).toUpperCase()}` : 'ADM-2026-0001';
    const createdAt = extras.createdAt || (admin.createdAt ? dateText(admin.createdAt) : '15/06/2023 09:30 AM');
    const address = firstAddress(admin);

    document.querySelector('#profileAvatar').src = avatar;
    document.querySelector('#profileName').textContent = name;
    document.querySelector('#profileRole').textContent = extras.roleLabel || role;
    document.querySelector('#profileEmail').textContent = email;
    document.querySelector('#profilePhone').textContent = phone;
    document.querySelector('#profileCode').textContent = adminCode;
    document.querySelector('#profileFullName').value = name;
    document.querySelector('#profileEmailInput').value = email;
    document.querySelector('#profilePhoneInput').value = phone;
    document.querySelector('#profileBirthDateInput').value = extras.birthDate || '1990-12-06';
    document.querySelector('#profileAddressInput').value = address;
    document.querySelector('#profileRoleInput').value = extras.roleLabel || role;
    document.querySelector('#profileCreatedAt').value = createdAt;
    document.querySelector('#securityEmail').textContent = email;
    document.querySelector('#lastLoginText').textContent = `${plainDate(new Date())} 10:24 AM`;
    document.querySelector('#focusProducts').textContent = number(data.kpis?.activeProducts || 0);
    document.querySelector('#focusOrders').textContent = number(data.kpis?.pendingOrders || 0);
    const twoFactorEnabled = localStorage.getItem('casaAdmin2fa') !== 'off';
    const twoFactorStatus = document.querySelector('#twoFactorStatus');
    twoFactorStatus.textContent = twoFactorEnabled ? 'Đã bật' : 'Đã tắt';
    twoFactorStatus.className = twoFactorEnabled ? 'enabled' : 'disabled';
    const prefs = loadNotificationPrefs();
    document.querySelectorAll('[data-notify-key]').forEach((input) => {
        input.checked = Boolean(prefs[input.dataset.notifyKey]);
    });

    document.querySelector('#profileQuickStats').innerHTML = [
        { icon: 'fa-solid fa-bolt', value: data.orders?.total || 0, label: 'Tổng đơn hàng hôm nay', color: '#df8a45', bg: '#fff0e5' },
        { icon: 'fa-regular fa-user', value: data.kpis?.newCustomers || 0, label: 'Khách hàng mới', color: '#43a56d', bg: '#e8f8ee' },
        { icon: 'fa-regular fa-calendar-check', value: (data.employees || []).length || 0, label: 'Nhân viên đã phân ca', color: '#6f63c6', bg: '#eeeafe' },
        { icon: 'fa-regular fa-file-lines', value: data.reviews?.length || 0, label: 'Báo cáo đã xuất', color: '#d26a3f', bg: '#fff0e8' }
    ].map((item) => `
        <div class="quick-stat" style="--stat-color:${item.color}; --stat-bg:${item.bg};">
            <i class="${item.icon}"></i>
            <b>${number(item.value)}</b>
            <span>${escapeHtml(item.label)}</span>
        </div>
    `).join('');

    const recentOrders = data.orders?.recent || [];
    const bestSeller = data.bestSellers?.[0];
    const activities = [
        ...state.activities,
        { icon: 'fa-solid fa-pen', title: bestSeller ? `Cập nhật sản phẩm "${bestSeller.name}"` : 'Cập nhật sản phẩm trong hệ thống', note: 'Đã chỉnh sửa giá và thông tin sản phẩm', time: '10:24 AM' },
        { icon: 'fa-regular fa-calendar-check', title: recentOrders[0] ? `Duyệt đơn hàng #${recentOrders[0].orderCode}` : 'Duyệt đơn hàng mới', note: 'Trạng thái: Đã xử lý', time: '09:58 AM' },
        { icon: 'fa-solid fa-tags', title: 'Tạo chương trình khuyến mãi', note: 'Giảm 20% cho toàn bộ sản phẩm', time: '08:45 AM' },
        { icon: 'fa-regular fa-bell', title: 'Đăng nhập hệ thống', note: 'IP: 14.225.199.102 - Chrome trên Windows', time: '07:32 AM' }
    ].slice(0, 5);
    document.querySelector('#profileActivityList').innerHTML = activities.slice(0, 4).map((item) => `
        <div class="activity-item">
            <i class="${item.icon}"></i>
            <div><b>${escapeHtml(item.title)}</b><small>${escapeHtml(item.note)}</small></div>
            <time>${escapeHtml(item.time)}</time>
        </div>
    `).join('');
}

function renderDashboard(data) {
    state.data = data;
    renderAdmin(data);
    if (document.querySelector('#adminProfileView')) renderAdminProfile(data);
    if (document.querySelector('#kpiGrid')) renderKpis(data);
    if (document.querySelector('#orderStatuses')) renderStatuses(data);
    renderQuickActions();
    if (document.querySelector('#staffStrip')) renderStaff(data);
    if (document.querySelector('#recentOrders')) renderRecentOrders(data);
    if (document.querySelector('#inventoryList')) renderInventory(data);
    if (document.querySelector('#bestSellerList')) renderBestSellers(data);
    if (document.querySelector('#reviewList')) renderReviews(data);
    if (document.querySelector('#contactList')) renderContacts(data);
    if (document.querySelector('#promoSummary')) renderPromotions(data);
    if (document.querySelector('#revenueChart')) drawRevenueChart();
}

async function loadDashboard() {
    const from = document.querySelector('#dateFrom').value;
    const to = document.querySelector('#dateTo').value;
    try {
        await ensureAdminSession();
        const data = await api(`/admin/dashboard?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`);
        document.querySelector('#authGate').hidden = true;
        setAdminSessionControls(true);
        renderDashboard(data);
        const pageView = pageFromPath();
        switchAdminView(pageView, false);
        if (pageView === 'dashboard' && location.hash) {
            const target = document.querySelector(location.hash);
            if (target) setTimeout(() => target.scrollIntoView({ behavior: 'smooth', block: 'start' }), 80);
        }
    } catch {
        const dashboard = document.querySelector('#dashboardRoot');
        const profile = document.querySelector('#adminProfileView');
        if (dashboard) dashboard.hidden = false;
        if (profile) profile.hidden = true;
        document.querySelector('#authGate').hidden = true;
        setAdminSessionControls(false);
        showToast('Không thể tải dashboard admin. Kiểm tra MongoDB và tài khoản admin seed.');
    }
}

function nextStatus(current) {
    const flow = ['pending', 'processing', 'shipping', 'completed'];
    const index = flow.indexOf(current);
    return index >= 0 && index < flow.length - 1 ? flow[index + 1] : current;
}

function updateStoredUser(user) {
    const current = session();
    if (!current) return;
    const next = { ...current, user: { ...current.user, ...user } };
    saveSession(next);
}

async function saveAdminProfile() {
    const name = document.querySelector('#profileFullName').value.trim();
    const email = document.querySelector('#profileEmailInput').value.trim();
    const phone = document.querySelector('#profilePhoneInput').value.trim();
    const birthDate = document.querySelector('#profileBirthDateInput').value;
    const roleLabel = document.querySelector('#profileRoleInput').value;
    const createdAt = document.querySelector('#profileCreatedAt').value.trim();
    const address = document.querySelector('#profileAddressInput').value.trim();
    if (!/^0\d{9}$/.test(phone)) {
        throw new Error('Số điện thoại admin phải gồm 10 số và bắt đầu bằng 0.');
    }
    const phoneForApi = phone;
    const payload = {
        name,
        email,
        phone: phoneForApi,
        addresses: address ? [{
            fullName: name,
            phone: phoneForApi || '0987654321',
            street: address,
            ward: 'Phường Bến Nghé',
            district: 'Quận 1',
            city: 'TP. Hồ Chí Minh',
            isDefault: true
        }] : []
    };
    const data = await api('/auth/profile', { method: 'PATCH', body: JSON.stringify(payload) });
    saveJson('casaAdminProfileExtras', { birthDate, roleLabel, createdAt });
    updateStoredUser(data.user);
    state.data.admin = data.user;
    renderAdmin(state.data);
    renderAdminProfile(state.data);
    setProfileEditing(false);
    showToast('Đã lưu hồ sơ quản trị.');
}

async function changeAdminPassword() {
    const currentPassword = window.prompt('Nhập mật khẩu hiện tại');
    if (!currentPassword) return;
    const newPassword = window.prompt('Nhập mật khẩu mới');
    if (!newPassword) return;
    await api('/auth/password', {
        method: 'PATCH',
        body: JSON.stringify({ currentPassword, newPassword })
    });
    recordActivity('Đổi mật khẩu quản trị', 'Mật khẩu đăng nhập admin đã được cập nhật', 'fa-solid fa-lock');
    showToast('Đã đổi mật khẩu quản trị.');
}

function uploadAdminAvatar(file) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async () => {
        try {
            const data = await api('/auth/avatar', {
                method: 'PATCH',
                body: JSON.stringify({ avatar: reader.result })
            });
            updateStoredUser(data.user);
            state.data.admin = data.user;
            renderAdmin(state.data);
            renderAdminProfile(state.data);
            recordActivity('Cập nhật ảnh đại diện', 'Ảnh hồ sơ quản trị đã được thay đổi', 'fa-solid fa-camera');
            showToast('Đã cập nhật ảnh đại diện.');
        } catch (error) {
            showToast(error.message);
        }
    };
    reader.readAsDataURL(file);
}

function openAdminModal(title, bodyHtml) {
    document.querySelector('#adminModalTitle').textContent = title;
    document.querySelector('#adminModalBody').innerHTML = bodyHtml;
    document.querySelector('#adminModal').hidden = false;
}

function closeAdminModal() {
    document.querySelector('#adminModal').hidden = true;
    document.querySelector('#adminModalBody').innerHTML = '';
}

function openSecurityPanel(type) {
    const admin = state.data?.admin || {};
    const email = admin.email || '';
    const twoFactorEnabled = localStorage.getItem('casaAdmin2fa') !== 'off';

    if (type === '2fa') {
        openAdminModal('Xác thực 2 lớp', `
            <div class="modal-stack">
                <div class="modal-row">
                    <div><b>Trạng thái 2FA</b><span>${twoFactorEnabled ? 'Đang bật cho tài khoản quản trị' : 'Đang tắt cho tài khoản quản trị'}</span></div>
                    <button class="primary-action" type="button" data-action="toggle-2fa">${twoFactorEnabled ? 'Tắt 2FA' : 'Bật 2FA'}</button>
                </div>
                <div class="modal-row"><div><b>Thiết bị xác thực</b><span>Ứng dụng Authenticator hoặc email bảo mật</span></div><small>Đã cấu hình</small></div>
            </div>
        `);
        return;
    }

    if (type === 'email') {
        openAdminModal('Email đăng nhập', `
            <div class="modal-stack">
                <div class="modal-row"><div><b>Email hiện tại</b><span>${escapeHtml(email)}</span></div><small>Đang dùng</small></div>
                <div class="modal-row"><div><b>Xác minh email</b><span>Email quản trị đã được xác minh trong hệ thống.</span></div><small>Hợp lệ</small></div>
            </div>
        `);
        return;
    }

    if (type === 'session') {
        openAdminModal('Phiên đăng nhập gần đây', `
            <div class="modal-stack">
                <div class="modal-row"><div><b>Chrome trên Windows</b><span>IP: 14.225.199.102</span></div><small>${plainDate(new Date())} 10:24 AM</small></div>
                <div class="modal-row"><div><b>Phiên admin hiện tại</b><span>Token đang hoạt động trong trình duyệt này.</span></div><small>Online</small></div>
            </div>
            <div class="modal-actions"><button class="secondary-action" type="button" data-action="refresh-session">Làm mới phiên</button></div>
        `);
        return;
    }

    openAdminModal('Quản lý bảo mật', `
        <div class="modal-stack">
            <div class="modal-row"><div><b>Mật khẩu</b><span>Cập nhật mật khẩu định kỳ để bảo vệ tài khoản.</span></div><button class="secondary-action" type="button" data-action="change-password">Đổi mật khẩu</button></div>
            <div class="modal-row"><div><b>Xác thực 2 lớp</b><span>${twoFactorEnabled ? 'Đã bật' : 'Đã tắt'}</span></div><button class="secondary-action" type="button" data-action="toggle-2fa">${twoFactorEnabled ? 'Tắt' : 'Bật'}</button></div>
        </div>
    `);
}

function openAllActivities() {
    const stored = state.activities.length ? state.activities : loadJson('casaAdminActivities', []);
    const fallback = [
        { icon: 'fa-solid fa-pen', title: 'Cập nhật sản phẩm trong hệ thống', note: 'Đã chỉnh sửa giá và thông tin sản phẩm', time: '10:24 AM' },
        { icon: 'fa-regular fa-calendar-check', title: 'Duyệt đơn hàng mới', note: 'Trạng thái: Đã xử lý', time: '09:58 AM' },
        { icon: 'fa-solid fa-tags', title: 'Tạo chương trình khuyến mãi', note: 'Giảm 20% cho toàn bộ sản phẩm', time: '08:45 AM' }
    ];
    const rows = [...stored, ...fallback].slice(0, 10).map((item) => `
        <div class="activity-item">
            <i class="${item.icon}"></i>
            <div><b>${escapeHtml(item.title)}</b><small>${escapeHtml(item.note)}</small></div>
            <time>${escapeHtml(item.time)}</time>
        </div>
    `).join('');
    openAdminModal('Tất cả hoạt động', `<div class="activity-list">${rows}</div>`);
}

function productCategoryOptions(selectedId = '') {
    const categories = state.products.data?.categories || [];
    return categories.map((category) => `
        <option value="${escapeHtml(category._id)}" ${String(category._id) === String(selectedId) ? 'selected' : ''}>${escapeHtml(category.name)}</option>
    `).join('');
}

function openProductForm(product = null) {
    const categories = state.products.data?.categories || [];
    if (!categories.length) {
        showToast('Cần có danh mục trước khi thêm sản phẩm.');
        return;
    }

    switchAdminView('product-form');

    document.getElementById('formTitleBreadcrumb').textContent = product ? 'Chỉnh sửa sản phẩm' : 'Thêm sản phẩm';
    document.getElementById('formTitleText').textContent = product ? 'Chỉnh sửa sản phẩm' : 'Thêm sản phẩm';

    const form = document.getElementById('productMainForm');
    form.reset();
    document.getElementById('productId').value = product?._id || '';

    const categorySelect = document.getElementById('formCategorySelect');
    const categoryId = typeof product?.category === 'object' ? product.category?._id : product?.category;
    categorySelect.innerHTML = '<option value="">Chọn danh mục</option>' + categories.map((category) => `<option value="${escapeHtml(category._id)}" ${String(category._id) === String(categoryId) ? 'selected' : ''}>${escapeHtml(category.name)}</option>`).join('');

    if (product) {
        form.elements['name'].value = product.name || '';
        form.elements['sku'].value = product.slug || '';
        form.elements['brand'].value = product.style || '';
        form.elements['tags'].value = product.searchText || '';
        form.elements['status'].value = product.status !== 'hidden' && product.status !== 'out_of_stock' ? 'active' : (product.status === 'hidden' ? 'hidden' : 'active');
        form.elements['shortDescription'].value = product.shortDescription || '';
        form.elements['description'].value = product.description || '';
        form.elements['material'].value = product.material || '';
        form.elements['dimensions'].value = product.dimensions || '';
        form.elements['color'].value = product.color || '';
        form.elements['isFeatured'].checked = !!product.isFeatured;
        form.elements['isNewProduct'].checked = !!product.isNewProduct;
        form.elements['price'].value = product.price || '';
        form.elements['salePrice'].value = product.salePrice || '';
        form.elements['stock'].value = product.stock || 0;
        form.elements['inventoryStatus'].value = product.stock > 0 ? 'in_stock' : 'out_of_stock';

        const primaryImg = product.images?.find(img => img.isPrimary) || product.images?.[0];
        if (primaryImg) {
            document.getElementById('primaryImagePreview').src = primaryImg.url;
            document.getElementById('primaryImagePreview').hidden = false;
            document.getElementById('primaryImagePlaceholder').hidden = true;
            document.getElementById('replacePrimaryBtn').hidden = false;
            document.getElementById('primaryImageInput').value = primaryImg.url;
        } else if (product.image) {
            document.getElementById('primaryImagePreview').src = product.image;
            document.getElementById('primaryImagePreview').hidden = false;
            document.getElementById('primaryImagePlaceholder').hidden = true;
            document.getElementById('replacePrimaryBtn').hidden = false;
            document.getElementById('primaryImageInput').value = product.image;
        }
    } else {
        document.getElementById('primaryImagePreview').hidden = true;
        document.getElementById('primaryImagePlaceholder').hidden = false;
        document.getElementById('replacePrimaryBtn').hidden = true;
        document.getElementById('primaryImagePreview').src = '';
        document.getElementById('primaryImageInput').value = '';
    }
}

async function saveProductForm() {
    const form = document.getElementById('productMainForm');
    const id = document.getElementById('productId').value;

    if (!form.checkValidity()) {
        form.reportValidity();
        return;
    }

    const payload = {
        name: form.elements['name'].value.trim(),
        slug: form.elements['sku'].value.trim(),
        category: form.elements['category'].value,
        style: form.elements['brand'].value.trim(),
        searchText: form.elements['tags'].value.trim(),
        status: form.elements['status'].value,
        shortDescription: form.elements['shortDescription'].value.trim(),
        description: form.elements['description'].value.trim(),
        material: form.elements['material'].value,
        dimensions: form.elements['dimensions'].value.trim(),
        color: form.elements['color'].value.trim(),
        isFeatured: form.elements['isFeatured'].checked,
        isNewProduct: form.elements['isNewProduct'].checked,
        price: Number(form.elements['price'].value || 0),
        salePrice: form.elements['salePrice'].value ? Number(form.elements['salePrice'].value) : undefined,
        stock: Number(form.elements['stock'].value || 0),
        image: document.getElementById('primaryImageInput').value.trim()
    };

    if (form.elements['inventoryStatus'].value === 'out_of_stock') {
        payload.stock = 0;
    }

    if (!payload.name || !payload.category || payload.price < 0 || payload.stock < 0) {
        showToast('Kiểm tra lại thông tin bắt buộc của sản phẩm.');
        return;
    }

    const saveBtn = document.querySelector('[data-action="save-product"]');
    const btnText = document.getElementById('saveProductBtnText');
    const originalContent = btnText.textContent;
    btnText.textContent = 'Đang lưu...';
    saveBtn.disabled = true;

    try {
        await api(id ? `/admin/products/${id}` : '/admin/products', {
            method: id ? 'PATCH' : 'POST',
            body: JSON.stringify(payload)
        });

        recordActivity(id ? `Sửa sản phẩm "${payload.name}"` : `Thêm sản phẩm "${payload.name}"`, id ? 'Cập nhật thông tin chi tiết sản phẩm' : 'Tạo sản phẩm mới với đầy đủ thông tin', 'fa-solid fa-cube');
        await loadProductManager(id ? state.products.page : 1);
        await loadDashboard();
        switchAdminView('products');
        showToast(id ? 'Đã cập nhật sản phẩm thành công.' : 'Đã thêm sản phẩm mới thành công.');
    } catch (error) {
        showToast(error.message);
    } finally {
        btnText.textContent = originalContent;
        saveBtn.disabled = false;
    }
}

async function addProductPrompt() {
    openProductForm();
}

async function editProductPrompt(id) {
    const product = state.products.data?.products?.find((item) => String(item._id) === String(id));
    if (!product) return;
    openProductForm(product);
}

async function toggleProductStatus(id, currentStatus) {
    const nextStatus = currentStatus === 'hidden' ? 'active' : 'hidden';
    await api(`/admin/products/${id}`, { method: 'PATCH', body: JSON.stringify({ status: nextStatus }) });
    recordActivity(nextStatus === 'hidden' ? 'Ẩn sản phẩm' : 'Hiện sản phẩm', 'Cập nhật trạng thái hiển thị sản phẩm', 'fa-regular fa-eye');
    await loadProductManager();
    showToast(nextStatus === 'hidden' ? 'Đã ẩn sản phẩm.' : 'Đã hiển thị sản phẩm.');
}

async function handleClick(event) {
    const viewLink = event.target.closest('[data-view]');
    if (viewLink) {
        event.preventDefault();
        const href = viewLink.getAttribute('href');
        window.location.href = href && !href.startsWith('#') ? href : viewUrl(viewLink.dataset.view);
        return;
    }

    const notifBtn = event.target.closest('#adminNotifBtn');
    if (notifBtn) {
        event.preventDefault();
        const drop = document.getElementById('adminNotifDropdown');
        if (drop) {
            drop.hidden = !drop.hidden;
            if (!drop.hidden) fetchAdminNotifs();
        }
        return;
    } else if (!event.target.closest('#adminNotifDropdown')) {
        const drop = document.getElementById('adminNotifDropdown');
        if (drop) drop.hidden = true;
    }

    const button = event.target.closest('button, a[data-action]');
    if (!button) return;
    if (button.tagName === 'A') event.preventDefault();
    const action = button.dataset.action;

    if (action === 'modal-close') {
        closeAdminModal();
        return;
    }
    if (action === 'toggle-2fa') {
        const enabled = localStorage.getItem('casaAdmin2fa') === 'off';
        localStorage.setItem('casaAdmin2fa', enabled ? 'on' : 'off');
        recordActivity(enabled ? 'Bật xác thực 2 lớp' : 'Tắt xác thực 2 lớp', 'Cập nhật bảo mật tài khoản quản trị', 'fa-solid fa-shield-halved');
        renderAdminProfile(state.data);
        openSecurityPanel('2fa');
        showToast(enabled ? 'Đã bật 2FA.' : 'Đã tắt 2FA.');
        return;
    }
    if (action === 'refresh-session') {
        recordActivity('Làm mới phiên đăng nhập', 'Phiên admin hiện tại đã được làm mới trong trình duyệt', 'fa-regular fa-clock');
        closeAdminModal();
        showToast('Đã làm mới phiên đăng nhập hiện tại.');
        return;
    }
    if (action === 'permission-open') {
        if (pageFromPath() !== 'dashboard') {
            window.location.href = `/admin/index.html#${encodeURIComponent(button.dataset.target || '')}`;
            return;
        }
        switchAdminView('dashboard');
        const section = document.querySelector(`#${button.dataset.target}`);
        if (section) setTimeout(() => section.scrollIntoView({ behavior: 'smooth', block: 'start' }), 80);
        recordActivity(`Mở module ${button.textContent.trim()}`, 'Truy cập nhanh từ quyền hạn tài khoản', 'fa-solid fa-arrow-up-right-from-square');
        return;
    }
    if (action === 'focus-open') {
        if (pageFromPath() !== 'dashboard') {
            window.location.href = `/admin/index.html#${encodeURIComponent(button.dataset.target || '')}`;
            return;
        }
        switchAdminView('dashboard');
        const section = document.querySelector(`#${button.dataset.target}`);
        if (section) setTimeout(() => section.scrollIntoView({ behavior: 'smooth', block: 'start' }), 80);
        return;
    }
    if (action === 'category-add') {
        const form = document.getElementById('categoryMainForm');
        form.reset();
        document.getElementById('categoryId').value = '';
        document.getElementById('categoryFormTitle').textContent = 'Thêm danh mục mới';
        document.getElementById('categoryFormModal').hidden = false;
        return;
    }
    if (action === 'category-edit') {
        const category = state.categories.data?.categories?.find((item) => String(item._id) === String(button.dataset.id));
        if (!category) return;
        const form = document.getElementById('categoryMainForm');
        form.reset();
        document.getElementById('categoryId').value = category._id;
        form.elements['name'].value = category.name;
        form.elements['slug'].value = category.slug;
        form.elements['description'].value = category.description || '';
        form.elements['image'].value = category.image || '';
        form.elements['status'].value = category.status;
        form.elements['isFeatured'].checked = category.isFeatured;
        document.getElementById('categoryFormTitle').textContent = 'Sửa danh mục';
        document.getElementById('categoryFormModal').hidden = false;
        return;
    }
    if (action === 'close-category-form') {
        document.getElementById('categoryFormModal').hidden = true;
        return;
    }
    if (action === 'category-toggle-featured') {
        try {
            const id = button.dataset.id;
            const current = button.dataset.featured === 'true';
            await api(`/admin/categories/${id}`, { method: 'PATCH', body: JSON.stringify({ isFeatured: !current }) });
            showToast(current ? 'Đã bỏ đánh dấu nổi bật.' : 'Đã đánh dấu nổi bật danh mục.');
            await loadCategoryManager();
        } catch (error) { showToast(error.message); }
        return;
    }
    if (action === 'category-delete') {
        const category = state.categories.data?.categories?.find((item) => String(item._id) === String(button.dataset.id));
        if (!category) return;
        document.getElementById('delCatImage').src = category.image || '/images/default-product.png';
        document.getElementById('delCatName').textContent = category.name;
        document.getElementById('delCatSlug').textContent = category.slug;
        document.getElementById('delCatProducts').textContent = category.productCount || 0;
        const confirmBtn = document.getElementById('confirmDeleteCatBtn');
        confirmBtn.dataset.id = category._id;
        document.getElementById('deleteCategoryModal').hidden = false;
        return;
    }
    if (action === 'close-delete-cat-modal') {
        document.getElementById('deleteCategoryModal').hidden = true;
        return;
    }
    if (action === 'confirm-delete-category') {
        const id = button.dataset.id;
        const originalContent = button.innerHTML;
        button.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i> Đang xóa...';
        button.disabled = true;
        try {
            await api(`/admin/categories/${id}`, { method: 'DELETE' });
            recordActivity('Xóa danh mục', 'Xóa mềm danh mục trong quản trị', 'fa-regular fa-folder');
            await loadCategoryManager();
            document.getElementById('deleteCategoryModal').hidden = true;
            showToast('Đã xóa danh mục thành công.');
        } catch (error) {
            showToast(error.message);
        } finally {
            button.innerHTML = originalContent;
            button.disabled = false;
        }
        return;
    }
    if (action === 'category-load') {
        state.categories.filter.q = document.getElementById('categorySearchInput').value.trim();
        state.categories.filter.status = document.getElementById('categoryStatusFilter').value;
        state.categories.filter.type = document.getElementById('categoryTypeFilter').value;
        state.categories.page = 1;
        await loadCategoryManager();
        return;
    }
    if (action === 'category-reset') {
        document.getElementById('categorySearchInput').value = '';
        document.getElementById('categoryStatusFilter').value = 'all';
        document.getElementById('categoryTypeFilter').value = 'all';
        state.categories.filter = { q: '', status: 'all', type: 'all', slug: 'all' };
        state.categories.page = 1;
        const allRadio = document.querySelector('input[name="quickFilterCat"][value="all"]');
        if (allRadio) allRadio.checked = true;
        await loadCategoryManager();
        return;
    }
    if (action === 'product-add') {
        try { await addProductPrompt(); } catch (error) { showToast(error.message); }
        return;
    }
    if (action === 'product-load') {
        await loadProductManager(1);
        return;
    }
    if (action === 'product-reset') {
        document.querySelector('#productSearchInput').value = '';
        document.querySelector('#productCategoryFilter').value = '';
        document.querySelector('#productStatusFilter').value = 'all';
        document.querySelector('#productStockFilter').value = '';
        await loadProductManager(1);
        return;
    }
    if (action === 'product-page') {
        await loadProductManager(Number(button.dataset.page));
        return;
    }
    if (action === 'product-edit') {
        try { await editProductPrompt(button.dataset.id); } catch (error) { showToast(error.message); }
        return;
    }
    if (action === 'product-toggle') {
        try { await toggleProductStatus(button.dataset.id, button.dataset.status); } catch (error) { showToast(error.message); }
        return;
    }
    if (action === 'product-delete') {
        const product = state.products.data?.products?.find((item) => String(item._id) === String(button.dataset.id));
        if (!product) return;

        document.getElementById('delProdImage').src = product.image || '/images/default-product.png';
        document.getElementById('delProdName').textContent = product.name;
        document.getElementById('delProdSku').textContent = product.slug;
        document.getElementById('delProdCat').textContent = typeof product.category === 'object' ? product.category?.name : product.category;
        document.getElementById('delProdPrice').textContent = money(product.price);
        document.getElementById('delProdStock').textContent = product.stock;

        const confirmBtn = document.getElementById('confirmDeleteProdBtn');
        confirmBtn.dataset.id = product._id;

        document.getElementById('deleteProductModal').hidden = false;
        return;
    }
    if (action === 'close-delete-modal') {
        document.getElementById('deleteProductModal').hidden = true;
        return;
    }
    if (action === 'back-products') {
        switchAdminView('products');
        return;
    }
    if (action === 'back-dashboard') {
        switchAdminView('dashboard');
        return;
    }
    if (action === 'save-product') {
        saveProductForm();
        return;
    }
    if (action === 'confirm-delete-product') {
        const id = button.dataset.id;
        const originalContent = button.innerHTML;
        button.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i> Đang xóa...';
        button.disabled = true;
        try {
            await api(`/admin/products/${id}`, { method: 'DELETE' });
            recordActivity('Xóa sản phẩm', 'Xóa mềm sản phẩm trong quản trị', 'fa-regular fa-trash-can');
            await loadProductManager();
            document.getElementById('deleteProductModal').hidden = true;
            showToast('Đã xóa sản phẩm thành công.');
        } catch (error) {
            showToast(error.message);
        } finally {
            button.innerHTML = originalContent;
            button.disabled = false;
        }
        return;
    }
    if (action === 'product-view') {
        if (button.dataset.slug) window.open(`/customers/product-detail.html?slug=${encodeURIComponent(button.dataset.slug)}`, '_blank');
        return;
    }
    if (action === 'product-category') {
        document.querySelector('#productCategoryFilter').value = button.dataset.id;
        await loadProductManager(1);
        return;
    }
    if (action === 'product-low') {
        document.querySelector('#productStockFilter').value = 'low';
        await loadProductManager(1);
        return;
    }
    if (action === 'product-export') {
        const rows = state.products.data?.products || [];
        const csv = ['Tên,SKU,Danh mục,Giá,Tồn kho,Trạng thái', ...rows.map((p) => `"${p.name}","${p.sku || p.slug}","${p.category?.name || ''}",${p.salePrice || p.price},${p.stock},"${productStatusLabel(p.status, p.stock)}"`)].join('\n');
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = 'casa-products.csv';
        link.click();
        URL.revokeObjectURL(link.href);
        showToast('Đã xuất danh sách sản phẩm đang hiển thị.');
        return;
    }
    if (action === 'back-dashboard') {
        window.location.href = '/admin/index.html';
        return;
    }
    if (action === 'profile-edit') {
        setProfileEditing(true);
        document.querySelector('#profileFullName').focus();
        return;
    }
    if (action === 'profile-cancel') {
        renderAdminProfile(state.data);
        setProfileEditing(false);
        return;
    }
    if (action === 'profile-save') {
        if (!state.profileEditing) {
            setProfileEditing(true);
            document.querySelector('#profileFullName').focus();
            return;
        }
        try {
            await saveAdminProfile();
            recordActivity('Cập nhật hồ sơ quản trị', 'Đã lưu thông tin cá nhân của tài khoản admin', 'fa-solid fa-pen');
        } catch (error) {
            showToast(error.message);
        }
        return;
    }
    if (action === 'change-password') {
        try {
            await changeAdminPassword();
        } catch (error) {
            showToast(error.message);
        }
        return;
    }
    if (action === 'profile-security') {
        openSecurityPanel(button.dataset.security || 'settings');
        return;
    }
    if (action === 'all-activity') {
        openAllActivities();
        return;
    }
    if (action === 'profile-avatar') {
        document.querySelector('#profileAvatarInput').click();
        return;
    }

    if (button.id === 'reloadDashboard') {
        await loadDashboard();
        showToast('Đã tải lại dashboard.');
        return;
    }
    if (button.id === 'quickAddBtn') {
        const menu = document.querySelector('#quickAddMenu');
        menu.hidden = !menu.hidden;
        return;
    }
    if (action === 'quick') {
        const target = button.dataset.target;
        document.querySelector('#quickAddMenu').hidden = true;
        if (target === 'products') {
            window.location.href = '/admin/products.html';
            return;
        }
        if (pageFromPath() !== 'dashboard') {
            window.location.href = `/admin/index.html#${encodeURIComponent(target)}`;
            return;
        }
        const section = document.querySelector(`#${target}`);
        if (section) section.scrollIntoView({ behavior: 'smooth', block: 'start' });
        showToast('Đang mở nhanh module quản trị tương ứng.');
    }
    if (action === 'view-order') {
        window.location.href = `/admin/orders.html?id=${button.dataset.id}`;
        return;
    }
    if (action === 'orders') {
        window.location.href = '/admin/orders.html';
        return;
    }
    if (action === 'next-order') {
        const status = nextStatus(button.dataset.status);
        if (status === button.dataset.status) {
            showToast('Đơn hàng đã ở trạng thái cuối trong luồng xử lý nhanh.');
            return;
        }
        await api(`/admin/orders/${button.dataset.id}/status`, { method: 'PATCH', body: JSON.stringify({ status: status }) });
        showToast('Đã cập nhật trạng thái đơn hàng.');
        if (pageFromPath() === 'dashboard') await loadDashboard();
        else await loadOrderManager();
    }
    if (action === 'review-status') {
        await api(`/admin/reviews/${button.dataset.id}/status`, { method: 'PATCH', body: JSON.stringify({ status: button.dataset.status }) });
        showToast(button.dataset.status === 'active' ? 'Đã duyệt đánh giá.' : 'Đã ẩn đánh giá.');
        if (pageFromPath() === 'dashboard') await loadDashboard();
        else await loadReviewManager();
    }
    if (action === 'view-review') {
        await showReviewDetail(button.dataset.id);
        return;
    }
    if (action === 'save-product') {
        await saveProductForm();
        return;
    }
    if (action === 'contact-status') {
        const next = button.dataset.status === 'pending' ? 'processing' : button.dataset.status === 'processing' ? 'resolved' : 'pending';
        await api(`/admin/contacts/${button.dataset.id}/status`, { method: 'PATCH', body: JSON.stringify({ status: next }) });
        showToast('Đã cập nhật trạng thái phản hồi.');
        await loadDashboard();
    }
}

function handleSearch(event) {
    const keyword = event.target.value.trim().toLowerCase();
    document.querySelectorAll('[data-search]').forEach((item) => {
        item.style.display = item.dataset.search.includes(keyword) ? '' : 'none';
    });
}

function setupEvents() {
    document.addEventListener('click', handleClick);
    document.addEventListener('submit', async (event) => {
        if (event.target.id === 'categoryMainForm') {
            event.preventDefault();
            try {
                const form = event.target;
                const id = document.getElementById('categoryId').value;
                const payload = {
                    name: form.elements['name'].value,
                    slug: form.elements['slug'].value,
                    description: form.elements['description'].value,
                    image: form.elements['image'].value,
                    status: form.elements['status'].value,
                    isFeatured: form.elements['isFeatured'].checked
                };

                const method = id ? 'PATCH' : 'POST';
                const endpoint = id ? `/admin/categories/${id}` : '/admin/categories';

                const submitBtn = form.querySelector('button[type="submit"]');
                const originalHtml = submitBtn.innerHTML;
                submitBtn.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i> Đang lưu...';
                submitBtn.disabled = true;

                try {
                    const result = await api(endpoint, { method, body: JSON.stringify(payload) });
                    showToast(result.message || 'Đã lưu danh mục thành công');
                    document.getElementById('categoryFormModal').hidden = true;
                    recordActivity('Cập nhật danh mục', 'Thêm hoặc sửa thông tin danh mục', 'fa-regular fa-folder');
                    await loadCategoryManager();
                } finally {
                    submitBtn.innerHTML = originalHtml;
                    submitBtn.disabled = false;
                }
            } catch (error) {
                showToast(error.message);
            }
            return;
        }

        const form = event.target.closest('[data-product-form]');
        if (!form) return;
        event.preventDefault();
        try {
            await saveProductForm(form);
        } catch (error) {
            showToast(error.message);
        }
    });
    document.addEventListener('change', (event) => {
        if (event.target.matches('[data-action="notify-toggle"]')) {
            const prefs = loadNotificationPrefs();
            prefs[event.target.dataset.notifyKey] = event.target.checked;
            saveJson('casaAdminNotifications', prefs);
            recordActivity(
                event.target.checked ? 'Bật tùy chọn thông báo' : 'Tắt tùy chọn thông báo',
                event.target.closest('label')?.querySelector('b')?.textContent || 'Cập nhật tùy chọn thông báo',
                'fa-regular fa-bell'
            );
            showToast(event.target.checked ? 'Đã bật tùy chọn thông báo.' : 'Đã tắt tùy chọn thông báo.');
        } else if (event.target.name === 'quickFilterCat') {
            state.categories.filter.slug = event.target.value;
            state.categories.page = 1;
            loadCategoryManager();
        }
    });
    const adminSearch = document.querySelector('#adminSearch');
    if (adminSearch) adminSearch.addEventListener('input', handleSearch);
    const avatarInput = document.querySelector('#profileAvatarInput');
    if (avatarInput) avatarInput.addEventListener('change', (event) => {
        uploadAdminAvatar(event.target.files?.[0]);
        event.target.value = '';
    });
    document.querySelectorAll('[data-chart-mode]').forEach((button) => {
        button.addEventListener('click', () => {
            state.chartMode = button.dataset.chartMode;
            document.querySelectorAll('[data-chart-mode]').forEach((item) => item.classList.toggle('active', item === button));
            drawRevenueChart();
        });
    });
    window.addEventListener('resize', () => {
        if (state.data) drawRevenueChart();
    });
    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape' && !document.querySelector('#adminModal').hidden) closeAdminModal();
    });
}

async function loadCustomerManager(page = state.customers.page) {
    const customerView = document.querySelector('#customerManagerView');
    if (!customerView || customerView.hidden) return;
    const params = new URLSearchParams({
        page: page,
        limit: state.customers.limit,
        q: state.customers.filter.q,
        status: state.customers.filter.status
    });
    try {
        const data = await api(`/admin/customers?${params.toString()}`);
        state.customers.page = data.page;
        state.customers.data = data;
        renderCustomerManager(data);
    } catch (error) {
        showToast(error.message);
    }
}

function renderCustomerManager(data) {
    document.getElementById('statTotalCustomers').textContent = number(data.stats.total);
    document.getElementById('statActiveCustomers').textContent = number(data.stats.active);
    document.getElementById('statLockedCustomers').textContent = number(data.stats.locked);

    const tbody = document.getElementById('customerRows');
    if (!data.customers || !data.customers.length) {
        tbody.innerHTML = '<tr><td colspan="8" class="empty-state">Không có khách hàng nào</td></tr>';
    } else {
        tbody.innerHTML = data.customers.map(customer => `
            <tr>
                <td><input type="checkbox"></td>
                <td>
                    <div class="product-cell category-cell">
                        <img src="${escapeHtml(customer.avatar || '/images/avatar-placeholder.png')}" alt="Avatar">
                        <div><b>${escapeHtml(customer.name)}</b></div>
                    </div>
                </td>
                <td>
                    <div style="font-weight: 500; color: var(--admin-text);">${escapeHtml(customer.email)}</div>
                    <small style="color: var(--admin-muted);">${escapeHtml(customer.phone || 'Chưa cập nhật SĐT')}</small>
                </td>
                <td style="text-align: center; font-weight: 600;">${number(customer.orderCount)}</td>
                <td style="text-align: right; font-weight: 600; color: #a0522d;">${money(customer.totalSpent)}</td>
                <td style="color: var(--admin-muted); font-size: 0.9rem;">${dateText(customer.createdAt)}</td>
                <td><span class="badge ${customer.status === 'active' ? 'success' : 'danger'}">${customer.status === 'active' ? 'Đang hoạt động' : 'Bị khóa'}</span></td>
                <td>
                    <div class="product-actions">
                        <button type="button" title="Xem lịch sử" onclick="state.orders.filter.q='${escapeHtml(customer.email)}'; window.location.href='/admin/orders.html';"><i class="fa-solid fa-clock-rotate-left"></i></button>
                        <button class="${customer.status === 'active' ? 'danger' : ''}" type="button" title="${customer.status === 'active' ? 'Khóa tài khoản' : 'Mở khóa'}" onclick="toggleCustomerStatus('${escapeHtml(customer._id)}', '${customer.status === 'active' ? 'locked' : 'active'}')"><i class="fa-solid ${customer.status === 'active' ? 'fa-lock' : 'fa-lock-open'}"></i></button>
                    </div>
                </td>
            </tr>
        `).join('');
    }

    const start = (data.page - 1) * state.customers.limit + 1;
    const end = Math.min(data.page * state.customers.limit, data.total);
    const textNode = document.getElementById('customerPageText');
    if (textNode) textNode.textContent = data.total > 0 ? `${start} - ${end} của ${data.total} khách hàng` : '0 khách hàng';
}

async function toggleCustomerStatus(customerId, newStatus) {
    if (!confirm(`Bạn có chắc chắn muốn ${newStatus === 'locked' ? 'khóa' : 'mở khóa'} tài khoản này?`)) return;
    try {
        const result = await api(`/admin/customers/${customerId}/status`, {
            method: 'PATCH',
            body: JSON.stringify({ status: newStatus })
        });
        showToast(result.message, 'success');
        loadCustomerManager();
    } catch (error) {
        showToast(error.message);
    }
}

async function loadStaffManager() {
    const staffView = document.querySelector('#staffManagerView');
    if (!staffView || staffView.hidden) return;
    try {
        const data = await api('/admin/staff');
        state.staff.data = data.staff || [];
        // Generate mock data for the dashboard layout
        generateStaffMockData();
        renderStaffKpis();
        filterStaffTable();
        renderScheduleMatrix();
        renderTopStaff();
    } catch (error) {
        showToast(error.message);
    }
}

function generateStaffMockData() {
    state.staff.data.forEach(user => {
        user.mockShift = ['morning', 'afternoon', 'evening'][Math.floor(Math.random() * 3)];
        user.mockHours = Math.floor(Math.random() * 20) + 20;
        user.mockPerformance = Math.floor(Math.random() * 15) + 85;
        user.mockSchedule = Array.from({length: 7}, () => Math.random() > 0.4 ? ['Sáng', 'Chiều', 'Tối'][Math.floor(Math.random() * 3)] : null);
    });
}

function renderStaffManager(list) {
    const tbody = document.getElementById('staffRows');
    if (!tbody) return;
    if (!list || !list.length) {
        tbody.innerHTML = '<tr><td colspan="8" class="empty-state">Không tìm thấy nhân viên nào</td></tr>';
    } else {
        tbody.innerHTML = list.map(user => `
            <tr>
                <td>
                    <div style="display:flex; align-items:center; gap:10px;">
                        <img src="${escapeHtml(user.avatar || '/images/avatar-placeholder.png')}" style="width:32px;height:32px;border-radius:50%;object-fit:cover;">
                        <div><b>${escapeHtml(user.name)}</b><br><small style="color:#888;">NV${user._id.substring(user._id.length - 4)}</small></div>
                    </div>
                </td>
                <td><span style="background:#eee;padding:4px 8px;border-radius:4px;font-size:12px;">${user.role === 'admin' ? 'Quản lý' : 'Nhân viên'}</span></td>
                <td>
                    <div>${escapeHtml(user.email)}</div>
                    <small style="color:#888;">${escapeHtml(user.phone || 'Chưa cập nhật SĐT')}</small>
                </td>
                <td><span style="font-size:13px; color:#555;" class="${getShiftClass(user.mockShift)}">${user.mockShift === 'morning' ? 'Sáng' : user.mockShift === 'afternoon' ? 'Chiều' : 'Tối'}</span></td>
                <td><b>${user.mockHours}h</b></td>
                <td><span style="color:#16a34a; font-weight:bold;">${user.mockPerformance}%</span></td>
                <td><span style="color:${user.status === 'active' ? '#16a34a' : '#dc3545'}"><i class="fa-solid fa-circle" style="font-size:8px;margin-right:5px;"></i>${user.status === 'active' ? 'Đang làm việc' : 'Đã khóa'}</span></td>
                <td>
                    <div style="display:flex; gap:10px;">
                        <button class="icon-btn" type="button" title="Chỉnh sửa" onclick="openStaffModal('${escapeHtml(user._id)}')"><i class="fa-regular fa-pen-to-square"></i></button>
                        <button class="icon-btn" type="button" title="Xóa" style="color:#dc3545;" onclick="deleteStaff('${escapeHtml(user._id)}')"><i class="fa-regular fa-trash-can"></i></button>
                    </div>
                </td>
            </tr>
        `).join('');
    }
}

function renderStaffKpis() {
    const total = state.staff.data.length;
    const active = state.staff.data.filter(u => u.status === 'active').length;
    
    const setText = (id, value) => {
        const node = document.getElementById(id);
        if (node) node.textContent = value;
    };
    setText('kpiTotalStaff', total);
    setText('kpiActiveStaff', active);
    const percent = total > 0 ? Math.round((active/total)*100) : 0;
    const percentNode = document.getElementById('kpiActivePercent');
    if (percentNode) percentNode.textContent = `${percent}% tổng nhân viên`;
    setText('kpiTodayShifts', Math.floor(active * 0.7)); // mock
    setText('kpiMissingShifts', '3'); // static mock
}

function filterStaffTable() {
    const q = document.getElementById('staffSearchInput')?.value.toLowerCase() || '';
    const role = document.getElementById('staffRoleFilter')?.value || 'all';
    
    let filtered = state.staff.data || [];
    if (q) filtered = filtered.filter(u => (u.name && u.name.toLowerCase().includes(q)) || (u.email && u.email.toLowerCase().includes(q)) || (u.phone && u.phone.includes(q)));
    if (role !== 'all') filtered = filtered.filter(u => u.role === role);
    
    renderStaffManager(filtered);

}
function staffDateInput(date = new Date()) {
    const copy = new Date(date);
    copy.setMinutes(copy.getMinutes() - copy.getTimezoneOffset());
    return copy.toISOString().slice(0, 10);
}

function staffParseDate(value) {
    const [year, month, day] = String(value || staffDateInput()).split('-').map(Number);
    return new Date(year, (month || 1) - 1, day || 1);
}

function staffAddDays(value, days) {
    const date = value instanceof Date ? new Date(value) : staffParseDate(value);
    date.setDate(date.getDate() + days);
    return date;
}

function staffWeekStart(value = new Date()) {
    const date = value instanceof Date ? new Date(value) : staffParseDate(value);
    const day = date.getDay() || 7;
    date.setDate(date.getDate() - day + 1);
    return staffDateInput(date);
}

function staffWeekDays() {
    const start = staffParseDate(state.staff.weekStart || staffWeekStart());
    return Array.from({ length: 7 }, (_, index) => {
        const date = staffAddDays(start, index);
        return {
            date,
            value: staffDateInput(date),
            label: index === 6 ? 'CN' : `T${index + 2}`,
            shortDate: date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' }),
            longDate: date.toLocaleDateString('vi-VN', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' })
        };
    });
}

function staffWeekRangeText(startValue = state.staff.weekStart || staffWeekStart()) {
    const start = staffParseDate(startValue);
    const end = staffAddDays(start, 6);
    return `${start.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })} - ${end.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })}`;
}

function staffCode(user) {
    return `NV${String(user?._id || '').slice(-4).toUpperCase().padStart(4, '0')}`;
}

function normalizeText(value) {
    return String(value || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/đ/g, 'd')
        .replace(/Đ/g, 'D')
        .toLowerCase();
}

function getShiftType(shift) {
    const minute = Number(shift?.startMinute ?? 0);
    if (minute < 12 * 60) return 'morning';
    if (minute < 17 * 60) return 'afternoon';
    return 'evening';
}

function shiftTypeLabel(type) {
    return { morning: 'Sáng', afternoon: 'Chiều', evening: 'Tối', off: 'Nghỉ' }[type] || 'Ca';
}

function getShiftClass(type) {
    return `shift-${type || 'off'}`;
}

function staffShiftSort(a, b) {
    if ((a.shiftDate || '') !== (b.shiftDate || '')) return String(a.shiftDate || '').localeCompare(String(b.shiftDate || ''));
    return Number(a.startMinute || 0) - Number(b.startMinute || 0);
}

function staffShifts(user) {
    return (user?.shifts || []).filter((shift) => shift.status !== 'cancelled').sort(staffShiftSort);
}

function staffShiftsForDate(user, dateValue) {
    return staffShifts(user).filter((shift) => shift.shiftDate === dateValue);
}

function currentStaffShift(user) {
    if (user?.currentShift) return user.currentShift;
    const today = staffDateInput();
    const now = new Date();
    const minute = now.getHours() * 60 + now.getMinutes();
    return staffShiftsForDate(user, today).find((shift) => Number(shift.startMinute) <= minute && Number(shift.endMinute) > minute);
}

function nextStaffShift(user) {
    if (user?.nextShift) return user.nextShift;
    const today = staffDateInput();
    const now = new Date();
    const minute = now.getHours() * 60 + now.getMinutes();
    return staffShifts(user).find((shift) => shift.shiftDate > today || (shift.shiftDate === today && Number(shift.endMinute) > minute));
}

function staffWeeklyHours(user) {
    return staffShifts(user).reduce((sum, shift) => sum + Number(shift.durationHours || 0), 0);
}

function staffPerformance(user) {
    const shifts = staffShifts(user);
    if (!shifts.length) return user.status === 'active' ? 90 : 0;
    const completed = shifts.filter((shift) => shift.status === 'completed').length;
    const active = shifts.filter((shift) => shift.status === 'active').length;
    const scheduled = shifts.filter((shift) => shift.status === 'scheduled').length;
    const score = Math.round(((completed + active * 0.95 + scheduled * 0.88) / shifts.length) * 100);
    return Math.max(0, Math.min(100, score));
}

function staffStars(score) {
    const filled = Math.max(1, Math.min(5, Math.round(Number(score || 0) / 20)));
    return Array.from({ length: 5 }, (_, index) => `<i class="fa-solid fa-star ${index < filled ? 'on' : ''}"></i>`).join('');
}

function bindStaffControls() {
    if (state.staff.controlsBound) return;
    state.staff.controlsBound = true;
    document.getElementById('staffPrevWeek')?.addEventListener('click', () => {
        state.staff.weekStart = staffDateInput(staffAddDays(state.staff.weekStart || staffWeekStart(), -7));
        loadStaffManager();
    });
    document.getElementById('staffThisWeek')?.addEventListener('click', () => {
        state.staff.weekStart = staffWeekStart();
        loadStaffManager();
    });
    document.getElementById('staffWeekSelect')?.addEventListener('change', (event) => {
        state.staff.weekStart = event.target.value || staffWeekStart();
        loadStaffManager();
    });
    document.getElementById('exportStaffSchedule')?.addEventListener('click', () => window.print());
}

function renderStaffWeekOptions() {
    const select = document.getElementById('staffWeekSelect');
    if (!select) return;
    const current = state.staff.weekStart || staffWeekStart();
    const starts = [-14, -7, 0, 7, 14].map((offset) => staffDateInput(staffAddDays(staffWeekStart(), offset)));
    if (!starts.includes(current)) starts.push(current);
    select.innerHTML = starts.sort().map((start) => `<option value="${start}" ${start === current ? 'selected' : ''}>${staffWeekRangeText(start)}</option>`).join('');
}

function getOpenShiftSlots() {
    const slots = [
        { type: 'morning', label: 'Sáng', startTime: '08:00', endTime: '12:00', startMinute: 480 },
        { type: 'afternoon', label: 'Chiều', startTime: '13:00', endTime: '17:00', startMinute: 780 },
        { type: 'evening', label: 'Tối', startTime: '17:30', endTime: '21:30', startMinute: 1050 }
    ];
    const shifts = (state.staff.shifts || []).filter((shift) => shift.status !== 'cancelled');
    const missing = [];
    staffWeekDays().forEach((day) => {
        slots.forEach((slot) => {
            const covered = shifts.some((shift) => shift.shiftDate === day.value && Math.abs(Number(shift.startMinute || 0) - slot.startMinute) <= 45);
            if (!covered) missing.push({ ...slot, date: day.value, dateText: day.longDate });
        });
    });
    return missing;
}

async function loadStaffManager() {
    const staffView = document.querySelector('#staffManagerView');
    if (!staffView || staffView.hidden) return;
    try {
        state.staff.weekStart = state.staff.weekStart || staffWeekStart();
        bindStaffControls();
        renderStaffWeekOptions();
        const days = staffWeekDays();
        const data = await api(`/admin/staff?from=${days[0].value}&to=${days[6].value}`);
        state.staff.data = data.staff || [];
        state.staff.shifts = data.shifts || [];
        state.staff.stats = data.stats || {};
        renderStaffKpis();
        filterStaffTable();
        renderScheduleMatrix();
        renderTopStaff();
        renderOpenShifts();
        renderStaffPerformance();
    } catch (error) {
        const staffRows = document.getElementById('staffRows');
        const scheduleRows = document.getElementById('scheduleRows');
        const message = escapeHtml(error.message || 'Không tải được dữ liệu nhân viên.');
        if (staffRows) staffRows.innerHTML = `<tr><td colspan="9" class="empty-state">${message}</td></tr>`;
        if (scheduleRows) scheduleRows.innerHTML = `<tr><td colspan="9" class="empty-state">${message}</td></tr>`;
        showToast(error.message);
    }
}

function renderStaffManager(list) {
    const tbody = document.getElementById('staffRows');
    if (!tbody) return;
    if (!list || !list.length) {
        tbody.innerHTML = '<tr><td colspan="9" class="empty-state">Không tìm thấy nhân viên nào</td></tr>';
        return;
    }
    tbody.innerHTML = list.map(user => {
        const currentShift = currentStaffShift(user) || nextStaffShift(user);
        const shiftType = currentShift ? getShiftType(currentShift) : 'off';
        const score = staffPerformance(user);
        const roleLabel = user.role === 'admin' ? 'Quản lý ca' : 'Tư vấn bán hàng';
        return `
            <tr>
                <td>
                    <div class="staff-person">
                        <img src="${escapeHtml(user.avatar || '/images/avatar-placeholder.png')}" alt="${escapeHtml(user.name || 'Nhân viên')}">
                        <div><b>${escapeHtml(user.name || 'Nhân viên')}</b><small>${escapeHtml(user.email || '')}</small></div>
                    </div>
                </td>
                <td><b class="staff-code">${staffCode(user)}</b></td>
                <td><span class="staff-role ${user.role === 'admin' ? 'admin' : 'staff'}">${roleLabel}</span></td>
                <td><span>${escapeHtml(user.phone || 'Chưa cập nhật')}</span></td>
                <td>${currentShift ? `<span class="shift-inline ${getShiftClass(shiftType)}"><i class="fa-solid fa-circle"></i>${shiftTypeLabel(shiftType)}<small>${currentShift.startTime} - ${currentShift.endTime}</small></span>` : '<span class="shift-inline shift-off">Nghỉ</span>'}</td>
                <td><b>${staffWeeklyHours(user)}h</b></td>
                <td><div class="staff-score"><b>${score}%</b><span>${staffStars(score)}</span></div></td>
                <td><span class="staff-status ${user.status === 'active' ? 'active' : 'locked'}">${user.status === 'active' ? 'Đang làm việc' : 'Nghỉ phép'}</span></td>
                <td>
                    <div class="product-actions staff-actions">
                        <button type="button" title="Chỉnh sửa" onclick="openStaffModal('${escapeHtml(user._id)}')"><i class="fa-regular fa-pen-to-square"></i></button>
                        <button type="button" title="Thêm ca" onclick="openShiftModal('${escapeHtml(user._id)}')"><i class="fa-solid fa-plus"></i></button>
                        <button class="danger" type="button" title="Xóa" onclick="deleteStaff('${escapeHtml(user._id)}')"><i class="fa-regular fa-trash-can"></i></button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}

function renderStaffKpis() {
    const total = state.staff.stats.total ?? (state.staff.data || []).length;
    const active = state.staff.stats.active ?? (state.staff.data || []).filter(u => u.status === 'active').length;
    const todayShifts = state.staff.stats.scheduledToday ?? 0;
    const missing = getOpenShiftSlots().length;
    const setText = (id, value) => {
        const node = document.getElementById(id);
        if (node) node.textContent = value;
    };
    setText('kpiTotalStaff', total);
    setText('kpiActiveStaff', active);
    setText('kpiTodayShifts', todayShifts);
    setText('kpiMissingShifts', missing);
    const percentNode = document.getElementById('kpiActivePercent');
    if (percentNode) percentNode.textContent = `${total ? Math.round((active / total) * 100) : 0}% tổng nhân viên`;
}

function filterStaffTable() {
    const q = normalizeText(document.getElementById('staffSearchInput')?.value || '');
    const role = document.getElementById('staffRoleFilter')?.value || 'all';
    const shift = document.getElementById('staffShiftFilter')?.value || 'all';
    const status = document.getElementById('staffStatusFilter')?.value || 'all';
    let filtered = state.staff.data || [];
    if (q) filtered = filtered.filter((user) => normalizeText(`${user.name || ''} ${user.email || ''} ${user.phone || ''} ${staffCode(user)}`).includes(q));
    if (role !== 'all') filtered = filtered.filter((user) => user.role === role);
    if (status !== 'all') filtered = filtered.filter((user) => user.status === status);
    if (shift !== 'all') {
        filtered = filtered.filter((user) => {
            const activeShift = currentStaffShift(user);
            const nextShift = nextStaffShift(user);
            const type = activeShift ? getShiftType(activeShift) : (nextShift ? getShiftType(nextShift) : 'off');
            return type === shift;
        });
    }
    renderStaffManager(filtered);
}

function renderScheduleMatrix() {
    const tbody = document.getElementById('scheduleRows');
    const table = tbody?.closest('table');
    if (!tbody || !table) return;
    const days = staffWeekDays();
    const header = table.querySelector('thead tr');
    if (header) {
        header.innerHTML = `<th>Nhân viên</th>${days.map((day) => `<th>${day.label}<br><small>${day.shortDate}</small></th>`).join('')}<th></th>`;
    }
    const staff = state.staff.data || [];
    if (!staff.length) {
        tbody.innerHTML = `<tr><td colspan="${days.length + 2}" class="empty-state">Chưa có nhân viên trong hệ thống.</td></tr>`;
        return;
    }
    tbody.innerHTML = staff.map((user) => `
        <tr>
            <td><div class="staff-person compact"><img src="${escapeHtml(user.avatar || '/images/avatar-placeholder.png')}" alt=""><b>${escapeHtml(user.name || 'Nhân viên')}</b></div></td>
            ${days.map((day) => {
                const shifts = staffShiftsForDate(user, day.value);
                if (!shifts.length) return '<td><span class="shift-empty">Nghỉ</span></td>';
                return `<td>${shifts.map((shift) => {
                    const type = getShiftType(shift);
                    return `<button class="shift-block ${getShiftClass(type)}" type="button" onclick="openShiftModal('${escapeHtml(user._id)}','${escapeHtml(shift._id)}')"><b>${shiftTypeLabel(type)}</b><small>${shift.startTime} - ${shift.endTime}</small></button>`;
                }).join('')}</td>`;
            }).join('')}
            <td><button class="icon-btn staff-add-shift" type="button" title="Thêm ca" onclick="openShiftModal('${escapeHtml(user._id)}')"><i class="fa-solid fa-plus"></i></button></td>
        </tr>
    `).join('');
}

function renderTopStaff() {
    const root = document.getElementById('topStaffList');
    if (!root) return;
    const top = [...(state.staff.data || [])]
        .map((user) => ({ ...user, score: staffPerformance(user) }))
        .sort((a, b) => b.score - a.score)
        .slice(0, 5);
    root.innerHTML = top.length ? top.map((user, index) => `
        <div class="top-staff-item">
            <img src="${escapeHtml(user.avatar || '/images/avatar-placeholder.png')}" alt="${escapeHtml(user.name || '')}">
            <div><b>${escapeHtml(user.name || 'Nhân viên')}</b><small>${user.role === 'admin' ? 'Quản lý ca' : 'Tư vấn bán hàng'}</small></div>
            <span class="top-staff-score">${user.score}% <i class="fa-solid ${index === 0 ? 'fa-trophy' : 'fa-star'}"></i></span>
        </div>
    `).join('') : '<p class="empty-state">Chưa có dữ liệu nhân viên.</p>';
}

function renderOpenShifts() {
    const root = document.getElementById('openShiftList');
    if (!root) return;
    const missing = getOpenShiftSlots().slice(0, 5);
    root.innerHTML = missing.length ? missing.map((slot) => `
        <div class="open-shift-item">
            <div class="shift-dot ${slot.type}"></div>
            <div class="shift-info">
                <b>${slot.label} <span>${slot.startTime} - ${slot.endTime}</span></b>
                <small>${slot.dateText}</small>
            </div>
            <button class="btn-apply secondary-action" type="button" onclick="openShiftModal('', '', '${slot.date}', '${slot.startTime}')">Phân ca</button>
        </div>
    `).join('') : '<p class="empty-state">Lịch tuần này đã đủ ca chuẩn.</p>';
}

function renderStaffPerformance() {
    const staff = state.staff.data || [];
    const scores = staff.map(staffPerformance).filter((score) => Number.isFinite(score));
    const avg = scores.length ? Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length) : 0;
    const lateSmall = Math.max(0, Math.min(100, Math.round((100 - avg) * 0.7)));
    const lateLarge = Math.max(0, 100 - avg - lateSmall);
    const set = (id, value) => {
        const node = document.getElementById(id);
        if (node) node.textContent = value;
    };
    set('staffPerfOnTime', `${avg}%`);
    set('staffPerfOnTimeDetail', `${avg}%`);
    set('staffPerfLateSmall', `${lateSmall}%`);
    set('staffPerfLateLarge', `${lateLarge}%`);
    const trend = document.getElementById('staffPerfTrend');
    if (trend) trend.innerHTML = `<i class="fa-solid fa-arrow-trend-up"></i> Tính từ ${staff.length} nhân viên và ${state.staff.shifts?.length || 0} ca trong tuần`;
}

function populateShiftStaffOptions(selectedId = '') {
    const select = document.getElementById('shiftStaff');
    if (!select) return;
    const staff = (state.staff.data || []).filter((user) => ['staff', 'admin'].includes(user.role) && user.status === 'active');
    select.innerHTML = staff.map((user) => `<option value="${escapeHtml(user._id)}" ${String(user._id) === String(selectedId) ? 'selected' : ''}>${escapeHtml(user.name || user.email)} - ${staffCode(user)}</option>`).join('');
    if (selectedId) select.value = selectedId;
}

function openStaffModal(id = null) {
    const modal = document.getElementById('staffFormModal');
    const form = modal.querySelector('form');
    form.reset();
    document.getElementById('staffId').value = id || '';

    if (id) {
        const user = state.staff.data.find(u => u._id === id);
        if (user) {
            document.getElementById('staffModalTitle').textContent = 'Chỉnh sửa nhân viên';
            document.getElementById('staffName').value = user.name;
            document.getElementById('staffEmail').value = user.email;
            document.getElementById('staffEmail').disabled = true;
            document.getElementById('staffPhone').value = user.phone || '';
            document.getElementById('staffRole').value = user.role;
            document.getElementById('staffStatus').value = user.status;
            document.getElementById('staffStatusGroup').style.display = 'block';
            document.getElementById('staffPassword').required = false;
            document.getElementById('staffPasswordRequired').style.display = 'none';
            document.getElementById('staffPasswordHint').style.display = 'block';
        }
    } else {
        document.getElementById('staffModalTitle').textContent = 'Thêm nhân viên mới';
        document.getElementById('staffEmail').disabled = false;
        document.getElementById('staffStatusGroup').style.display = 'none';
        document.getElementById('staffPassword').required = true;
        document.getElementById('staffPasswordRequired').style.display = 'inline';
        document.getElementById('staffPasswordHint').style.display = 'none';
    }

    modal.showModal();
}

async function submitStaffForm() {
    const id = document.getElementById('staffId').value;
    const isEdit = !!id;

    const payload = {
        name: document.getElementById('staffName').value,
        phone: document.getElementById('staffPhone').value,
        role: document.getElementById('staffRole').value
    };

    if (!isEdit) {
        payload.email = document.getElementById('staffEmail').value;
    } else {
        payload.status = document.getElementById('staffStatus').value;
    }

    const pw = document.getElementById('staffPassword').value;
    if (pw) payload.password = pw;

    try {
        const endpoint = isEdit ? `/admin/staff/${id}` : '/admin/staff';
        await api(endpoint, {
            method: isEdit ? 'PATCH' : 'POST',
            body: JSON.stringify(payload)
        });
        showToast(isEdit ? 'Cập nhật thành công' : 'Thêm nhân viên thành công', 'success');
        const modal = document.getElementById('staffFormModal');
        if (modal && typeof modal.close === 'function') modal.close();
        loadStaffManager();
    } catch (error) {
        showToast(error.message);
    }
}

async function deleteStaff(id) {
    if (!confirm('Bạn có chắc chắn muốn xóa nhân viên này? Hành động này không thể hoàn tác.')) return;
    try {
        await api(`/admin/staff/${id}`, { method: 'DELETE' });
        showToast('Đã xóa nhân viên', 'success');
        loadStaffManager();
    } catch (error) {
        showToast(error.message);
    }
}

function todayInputValue() {
    const now = new Date();
    const offset = now.getTimezoneOffset();
    return new Date(now.getTime() - offset * 60000).toISOString().slice(0, 10);
}

function openShiftModal(staffId = '', shiftId = '', shiftDate = '', startTime = '') {
    const modal = document.getElementById('shiftFormModal');
    if (!modal) return;
    document.getElementById('shiftId').value = shiftId || '';
    populateShiftStaffOptions(staffId);
    document.getElementById('shiftDate').value = shiftDate || todayInputValue();
    document.getElementById('shiftStartTime').value = startTime || '08:00';
    document.getElementById('shiftDuration').value = '4';
    document.getElementById('shiftNote').value = '';

    if (shiftId) {
        const shift = (state.staff.shifts || []).find((item) => item._id === shiftId);
        if (shift) {
            populateShiftStaffOptions(shift.staff?._id || shift.staff);
            document.getElementById('shiftDate').value = shift.shiftDate;
            document.getElementById('shiftStartTime').value = shift.startTime;
            document.getElementById('shiftDuration').value = String(shift.durationHours || 4);
            document.getElementById('shiftNote').value = shift.note || '';
        }
    }
    modal.showModal();
}

async function submitShiftForm() {
    const id = document.getElementById('shiftId').value;
    const payload = {
        staff: document.getElementById('shiftStaff').value,
        shiftDate: document.getElementById('shiftDate').value,
        startTime: document.getElementById('shiftStartTime').value,
        durationHours: Number(document.getElementById('shiftDuration').value),
        note: document.getElementById('shiftNote').value
    };
    try {
        await api(id ? `/admin/staff-shifts/${id}` : '/admin/staff-shifts', {
            method: id ? 'PATCH' : 'POST',
            body: JSON.stringify(payload)
        });
        showToast(id ? 'Đã cập nhật ca trực' : 'Đã tạo ca trực', 'success');
        document.getElementById('shiftFormModal').close();
        loadStaffManager();
    } catch (error) {
        showToast(error.message);
    }
}

async function deleteShift(id) {
    if (!confirm('Xóa ca trực này?')) return;
    try {
        await api(`/admin/staff-shifts/${id}`, { method: 'DELETE' });
        showToast('Đã xóa ca trực', 'success');
        loadStaffManager();
    } catch (error) {
        showToast(error.message);
    }
}

async function loadReviewManager(page = state.reviews.page) {
    const reviewView = document.querySelector('#reviewManagerView');
    if (!reviewView || reviewView.hidden) return;
    const params = new URLSearchParams({
        page: page,
        limit: state.reviews.limit,
        status: state.reviews.filter.status
    });
    try {
        const data = await api(`/admin/reviews?${params.toString()}`);
        state.reviews.page = data.page;
        state.reviews.data = data;
        renderReviewManager(data);
    } catch (error) {
        showToast(error.message);
    }
}

function renderReviewManager(data) {
    document.getElementById('statTotalReviews').textContent = number(data.stats.total);
    document.getElementById('statAvgRating').textContent = data.stats.avgRating;
    document.getElementById('statPendingReviews').textContent = number(data.stats.pending);
    document.getElementById('statHiddenReviews').textContent = number(data.stats.hidden);

    const tbody = document.getElementById('reviewRows');
    if (!data.reviews || !data.reviews.length) {
        tbody.innerHTML = '<tr><td colspan="7" class="empty-state">Không có đánh giá nào</td></tr>';
    } else {
        tbody.innerHTML = data.reviews.map(review => {
            let starsHtml = '';
            for (let i = 1; i <= 5; i++) {
                starsHtml += `<i class="fa-solid fa-star" style="color: ${i <= review.rating ? '#f39c12' : '#e2e8f0'}; font-size: 0.8rem;"></i>`;
            }

            return `
            <tr>
                <td><input type="checkbox"></td>
                <td>
                    <div class="product-cell category-cell" style="max-width: 200px;">
                        <img src="${escapeHtml(review.product?.image || '/images/default-product.png')}" alt="">
                        <div style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" title="${escapeHtml(review.product?.name || '')}">
                            <b>${escapeHtml(review.product?.name || 'Sản phẩm đã xóa')}</b>
                        </div>
                    </div>
                </td>
                <td>
                    <div style="font-weight: 500; color: var(--admin-text);">${escapeHtml(review.customer?.name || 'Khách hàng ẩn')}</div>
                    <small style="color: var(--admin-muted);">${escapeHtml(review.customer?.email || '')}</small>
                </td>
                <td>
                    <div style="margin-bottom: 4px;">${starsHtml}</div>
                    <div style="font-size: 0.9rem; color: var(--admin-text); display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;">${escapeHtml(review.comment || 'Không có bình luận')}</div>
                    ${review.images && review.images.length ? `<div style="margin-top: 4px; color: var(--admin-muted); font-size: 0.8rem;"><i class="fa-regular fa-image"></i> Đính kèm ${review.images.length} ảnh</div>` : ''}
                </td>
                <td style="color: var(--admin-muted); font-size: 0.9rem;">${dateText(review.createdAt)}</td>
                <td><span class="badge ${review.status === 'active' ? 'success' : (review.status === 'hidden' ? 'danger' : 'warning')}">${review.status === 'active' ? 'Hiển thị' : (review.status === 'hidden' ? 'Đã ẩn' : 'Chờ duyệt')}</span></td>
                <td>
                    <div class="product-actions">
                        <button type="button" title="Xem chi tiết" onclick="showReviewDetail('${escapeHtml(review._id)}')"><i class="fa-regular fa-eye"></i></button>
                    </div>
                </td>
            </tr>
            `;
        }).join('');
    }

    const start = (data.page - 1) * state.reviews.limit + 1;
    const end = Math.min(data.page * state.reviews.limit, data.total);
    document.getElementById('reviewPageText').textContent = data.total > 0 ? `${start} - ${end} của ${data.total} đánh giá` : '0 đánh giá';
}

function showReviewDetail(reviewId) {
    const review = state.reviews.data.reviews.find(r => r._id === reviewId);
    if (!review) return;

    document.getElementById('reviewModalId').value = review._id;
    document.getElementById('reviewModalStatusUpdate').value = review.status;

    let starsHtml = '';
    for (let i = 1; i <= 5; i++) {
        starsHtml += `<i class="fa-solid fa-star" style="color: ${i <= review.rating ? '#f39c12' : '#e2e8f0'};"></i>`;
    }

    let imagesHtml = '';
    if (review.images && review.images.length > 0) {
        imagesHtml = `
            <div style="margin-top: 16px;">
                <b style="display: block; margin-bottom: 8px;">Ảnh đính kèm:</b>
                <div style="display: flex; gap: 8px; flex-wrap: wrap;">
                    ${review.images.map(img => `<img src="${escapeHtml(img)}" alt="Review image" style="width: 80px; height: 80px; object-fit: cover; border-radius: 4px; border: 1px solid #eee;">`).join('')}
                </div>
            </div>
        `;
    }

    document.getElementById('reviewModalBody').innerHTML = `
        <div style="display: flex; align-items: flex-start; gap: 16px; margin-bottom: 20px; padding-bottom: 16px; border-bottom: 1px solid #eee;">
            <img src="${escapeHtml(review.product?.image || '/images/default-product.png')}" style="width: 64px; height: 64px; object-fit: cover; border-radius: 4px; border: 1px solid #eee;">
            <div>
                <b style="display: block; font-size: 1.1rem;">${escapeHtml(review.product?.name || 'Sản phẩm đã xóa')}</b>
                <div style="color: var(--admin-muted); font-size: 0.9rem;">Khách hàng: ${escapeHtml(review.customer?.name || 'Ẩn')} - ${escapeHtml(review.customer?.email || '')}</div>
                <div style="color: var(--admin-muted); font-size: 0.9rem;">Thời gian: ${dateText(review.createdAt, true)}</div>
            </div>
        </div>
        <div style="margin-bottom: 12px;">
            <span style="font-size: 1.2rem; margin-right: 8px;">${starsHtml}</span>
            <b>${review.rating}/5 Sao</b>
        </div>
        <div style="padding: 16px; background: #fafafa; border-radius: 4px; color: var(--admin-text); line-height: 1.5;">
            ${escapeHtml(review.comment || 'Khách hàng không để lại bình luận.')}
        </div>
        ${imagesHtml}
    `;

    document.getElementById('reviewDetailModal').showModal();
}

async function submitReviewStatus() {
    const id = document.getElementById('reviewModalId').value;
    const status = document.getElementById('reviewModalStatusUpdate').value;

    try {
        await api(`/admin/reviews/${id}/status`, {
            method: 'PATCH',
            body: JSON.stringify({ status })
        });
        showToast('Đã cập nhật trạng thái đánh giá', 'success');
        const modal = document.getElementById('reviewDetailModal');
        if (modal && typeof modal.close === 'function') modal.close();
        loadReviewManager();
    } catch (error) {
        showToast(error.message);
    }
}

async function showOrderDetailView(orderId) {
    const orderView = document.querySelector('#orderManagerView');
    const detailView = document.querySelector('#orderDetailView');
    if (!orderView || !detailView) return;

    try {
        const order = await api(`/admin/orders/${orderId}`);
        document.getElementById('detailOrderCode').textContent = `Đơn hàng #${order.orderCode}`;

        const timelineHtml = (order.statusHistory || []).reverse().map((h, index) => `
            <div class="timeline-step ${index === 0 ? 'active' : ''}">
                <div class="timeline-marker-pro"></div>
                <div class="timeline-info">
                    <b>${statusMeta[h.status]?.label || h.status}</b>
                    <small><i class="fa-regular fa-clock"></i> ${dateText(h.time, true)}</small>
                    ${h.note ? `<p><i class="fa-solid fa-comment-dots"></i> ${escapeHtml(h.note)}</p>` : ''}
                </div>
            </div>
        `).join('');

        // Banner hoàn tiền thành công
        const refundBannerHtml = order.orderStatus === 'refunded' ? `
            <div class="refund-success-banner">
                <div class="refund-success-icon"><i class="fa-solid fa-circle-check"></i></div>
                <div class="refund-success-content">
                    <h3>Đã hoàn tiền thành công cho quý khách hàng!</h3>
                    <p>Đơn hàng <b>${escapeHtml(order.orderCode)}</b> đã được hoàn tiền đầy đủ. Khách hàng sẽ nhận tiền trong 1-3 ngày làm việc.</p>
                </div>
            </div>
        ` : '';

        document.getElementById('orderDetailContent').innerHTML = `
            ${refundBannerHtml}
            <div class="detail-grid">
                <div class="detail-main">
                    <!-- Sản phẩm đã đặt -->
                    <article class="premium-card">
                        <h2 class="section-title"><i class="fa-solid fa-box-open"></i> Sản phẩm đã đặt</h2>
                        <table class="order-table">
                            <thead>
                                <tr>
                                    <th>Sản phẩm</th>
                                    <th>Đơn giá</th>
                                    <th style="text-align: center;">Số lượng</th>
                                    <th style="text-align: right;">Thành tiền</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${order.items.map(item => `
                                    <tr class="order-row">
                                        <td>
                                            <div class="product-cell">
                                                <img src="${escapeHtml(item.image || item.product?.images?.[0]?.url || item.product?.image || '/images/banner1png.png')}" class="product-img-pro" alt="">
                                                <div style="margin-left: 12px;">
                                                    <b style="font-size: 1rem; color: var(--admin-text);">${escapeHtml(item.name)}</b>
                                                    <small style="display: block; color: var(--admin-muted);">ID: ${item.product?._id?.substring(0, 8) || 'N/A'}</small>
                                                </div>
                                            </div>
                                        </td>
                                        <td style="font-weight: 500;">${money(item.purchasePrice)}</td>
                                        <td style="text-align: center; font-weight: 600;">${item.quantity}</td>
                                        <td style="text-align: right; font-weight: 700; color: var(--admin-brown-dark);">${money(item.itemTotal)}</td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>

                        <div class="totals-panel">
                            <div class="total-line">
                                <span>Tiền hàng:</span>
                                <b>${money(order.itemsTotal)}</b>
                            </div>
                            <div class="total-line">
                                <span>Phí vận chuyển:</span>
                                <b>${money(order.shippingFee)}</b>
                            </div>
                            ${order.discountAmount ? `
                            <div class="total-line">
                                <span style="color: var(--admin-green);">Giảm giá:</span>
                                <b style="color: var(--admin-green);">-${money(order.discountAmount)}</b>
                            </div>` : ''}
                            <div class="total-line grand">
                                <span>TỔNG CỘNG:</span>
                                <strong>${money(order.totalAmount)}</strong>
                            </div>
                        </div>
                    </article>
                    
                    <!-- Lịch sử xử lý -->
                    <article class="premium-card" style="margin-top: 24px;">
                        <h2 class="section-title"><i class="fa-solid fa-clock-rotate-left"></i> Lịch sử xử lý đơn hàng</h2>
                        <div class="timeline-pro">
                            ${timelineHtml || '<p class="empty-state">Chưa có lịch sử trạng thái.</p>'}
                        </div>
                    </article>
                </div>

                <div class="detail-aside">
                    <!-- Xử lý đơn hàng (MỚI) -->
                    <article class="premium-card processing-card" style="border: 1px solid var(--admin-clay); background: linear-gradient(to bottom right, #fff, #fff9f5);">
                        <h2 class="section-title" style="font-size: 1.2rem; color: var(--admin-clay);"><i class="fa-solid fa-sliders"></i> Xử lý đơn hàng</h2>
                        <input type="hidden" id="currentDetailOrderId" value="${order._id}">
                        
                        <div class="action-grid-pro">
                            <button type="button" class="btn-pro confirm" onclick="confirmOrderQuick()">
                                <i class="fa-solid fa-check"></i> Xác nhận đơn
                            </button>
                            <button type="button" class="btn-pro cancel" onclick="cancelOrderQuick()">
                                <i class="fa-solid fa-xmark"></i> Hủy đơn
                            </button>
                        </div>

                        <div class="status-update-box">
                            <label><i class="fa-solid fa-rotate"></i> Cập nhật trạng thái mới</label>
                            <div class="select-wrapper-pro">
                                <select id="detailStatusUpdate">
                                    <option value="">-- Chọn trạng thái --</option>
                                    <optgroup label="Xử lý cơ bản">
                                        <option value="pending">⏳ Chờ xác nhận</option>
                                        <option value="processing">📦 Đang xử lý</option>
                                    </optgroup>
                                    <optgroup label="Vận chuyển">
                                        <option value="shipping">🚚 Đang giao hàng</option>
                                        <option value="completed">✨ Đã hoàn tất (Đã giao & thanh toán)</option>
                                    </optgroup>
                                    <optgroup label="Sự cố & Trả hàng">
                                        <option value="cancellation_requested">⚠️ Yêu cầu hủy</option>
                                        <option value="cancelled">❌ Đã hủy đơn</option>
                                        <option value="return_requested">🔄 Yêu cầu trả hàng</option>
                                        <option value="refunding">💸 Đang hoàn tiền</option>
                                        <option value="refunded">💰 Đã hoàn tiền</option>
                                    </optgroup>
                                </select>
                            </div>
                            <button type="button" class="btn-update-pro" onclick="submitOrderDetailStatus()">
                                Cập nhật ngay
                            </button>
                        </div>
                    </article>

                    <!-- Thông tin khách hàng -->
                    <article class="premium-card" style="margin-top: 24px;">
                        <h2 class="section-title" style="font-size: 1.2rem;"><i class="fa-solid fa-user-tag"></i> Khách hàng</h2>
                        <div class="info-group">
                            <div class="info-item">
                                <i class="fa-solid fa-user"></i>
                                <div class="info-content">
                                    <label>Họ tên</label>
                                    <span>${escapeHtml(order.shippingInfo?.fullName || order.customer?.name || 'N/A')}</span>
                                </div>
                            </div>
                            <div class="info-item">
                                <i class="fa-solid fa-phone"></i>
                                <div class="info-content">
                                    <label>Số điện thoại</label>
                                    <span>${escapeHtml(order.shippingInfo?.phone || 'N/A')}</span>
                                </div>
                            </div>
                            <div class="info-item">
                                <i class="fa-solid fa-envelope"></i>
                                <div class="info-content">
                                    <label>Email</label>
                                    <span>${escapeHtml(order.customer?.email || 'N/A')}</span>
                                </div>
                            </div>
                            <div class="info-item">
                                <i class="fa-solid fa-location-dot"></i>
                                <div class="info-content">
                                    <label>Địa chỉ giao hàng</label>
                                    <span>${escapeHtml(order.shippingInfo?.address || '')}, ${escapeHtml(order.shippingInfo?.ward || '')}, ${escapeHtml(order.shippingInfo?.district || '')}, ${escapeHtml(order.shippingInfo?.city || '')}</span>
                                </div>
                            </div>
                            ${order.note ? `
                            <div class="info-item">
                                <i class="fa-solid fa-pen-fancy"></i>
                                <div class="info-content">
                                    <label>Ghi chú của khách</label>
                                    <span style="color: var(--admin-clay); font-style: italic;">"${escapeHtml(order.note)}"</span>
                                </div>
                            </div>` : ''}
                        </div>
                    </article>

                    <!-- Thanh toán -->
                    <article class="premium-card" style="margin-top: 24px;">
                        <h2 class="section-title" style="font-size: 1.2rem;"><i class="fa-solid fa-credit-card"></i> Thanh toán</h2>
                        <div class="info-group">
                            <div class="info-item">
                                <i class="fa-solid fa-money-bill-transfer"></i>
                                <div class="info-content">
                                    <label>Phương thức</label>
                                    <span>${paymentMeta[order.paymentMethod] || order.paymentMethod}</span>
                                </div>
                            </div>
                            <div class="info-item">
                                <i class="fa-solid fa-shield-check"></i>
                                <div class="info-content">
                                    <label>Trạng thái</label>
                                    <span class="badge ${order.paymentStatus}" style="font-size: 0.8rem;">${paymentMeta[order.paymentStatus] || order.paymentStatus}</span>
                                </div>
                            </div>
                            <div class="info-item">
                                <i class="fa-solid fa-hashtag"></i>
                                <div class="info-content">
                                    <label>Mã giao dịch</label>
                                    <span style="font-family: monospace; font-size: 0.85rem;">${escapeHtml(order.paymentId || 'N/A')}</span>
                                </div>
                            </div>
                        </div>
                    </article>
                </div>
            </div>
        `;

        orderView.hidden = true;
        detailView.hidden = false;

        // Cập nhật giá trị sau khi đã inject HTML
        document.getElementById('currentDetailOrderId').value = order._id;
        document.getElementById('detailStatusUpdate').value = order.orderStatus;

        window.scrollTo(0, 0);
    } catch (error) {
        showToast(error.message);
    }
}

function closeOrderDetailView() {
    document.querySelector('#orderManagerView').hidden = false;
    document.querySelector('#orderDetailView').hidden = true;
}

async function submitOrderDetailStatus() {
    const id = document.getElementById('currentDetailOrderId').value;
    const status = document.getElementById('detailStatusUpdate').value;
    if (!status) return;
    try {
        await api(`/admin/orders/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) });
        showToast('Đã cập nhật trạng thái đơn hàng.');
        await showOrderDetailView(id);
        loadOrderManager();
    } catch (error) {
        showToast(error.message);
    }
}

async function confirmOrderQuick() {
    const id = document.getElementById('currentDetailOrderId').value;
    try {
        await api(`/admin/orders/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status: 'processing' }) });
        showToast('Đã xác nhận đơn hàng.');
        await showOrderDetailView(id);
        loadOrderManager();
    } catch (error) {
        showToast(error.message);
    }
}

async function cancelOrderQuick() {
    if (!confirm('Bạn có chắc chắn muốn hủy đơn hàng này?')) return;
    const id = document.getElementById('currentDetailOrderId').value;
    try {
        await api(`/admin/orders/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status: 'cancelled' }) });
        showToast('Đã hủy đơn hàng.');
        await showOrderDetailView(id);
        loadOrderManager();
    } catch (error) {
        showToast(error.message);
    }
}

function initAdminSocket() {
    const script = document.createElement('script');
    script.src = '/socket.io/socket.io.js';
    script.onload = () => {
        const socket = io();
        
        // Listen for new orders
        socket.on('new_order', (order) => {
            playTingTing();
            showToast(`🚀 Đơn hàng mới: ${order.orderCode} từ ${escapeHtml(order.customerName)} - ${money(order.totalAmount)}`);

            // Mới có đơn hàng, tải lại danh sách thông báo từ API
            fetchAdminNotifs();

            if (state.currentView === 'dashboard') {
                loadDashboard();
            } else if (state.currentView === 'orders') {
                loadOrderManager(1);
            }
        });

        // Listen for return requests from customers
        socket.on('return_requested', (data) => {
            playTingTing();
            showToast(`🔄 Yêu cầu trả hàng: ${data.orderCode} từ ${escapeHtml(data.customerName)} - Lý do: ${escapeHtml(data.reason)}`);

            fetchAdminNotifs();

            if (state.currentView === 'dashboard') {
                loadDashboard();
            } else if (state.currentView === 'orders') {
                loadOrderManager(1);
            }
        });

        const refreshContacts = () => {
            fetchAdminNotifs();
            if (state.currentView === 'contacts' && typeof window.loadContactManager === 'function') {
                window.loadContactManager(state.contacts?.page || 1);
            }
        };

        socket.on('contact_created', (payload) => {
            playTingTing();
            showToast(`Yeu cau lien he moi: ${escapeHtml(payload?.contact?.fullName || 'Khach hang')}`);
            refreshContacts();
        });

        socket.on('contact_customer_reply', (payload) => {
            playTingTing();
            showToast(`Khach hang vua phan hoi: ${escapeHtml(payload?.contact?.fullName || 'Khach hang')}`);
            refreshContacts();
        });

        socket.on('contact_updated', () => {
            if (state.currentView === 'contacts' && typeof window.loadContactManager === 'function') {
                window.loadContactManager(state.contacts?.page || 1);
            }
        });
    };
    document.head.appendChild(script);
}

function playTingTing() {
    try {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        if (!AudioContext) return;
        const ctx = new AudioContext();

        const playTone = (freq, startTime, duration) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, ctx.currentTime + startTime);
            gain.gain.setValueAtTime(0, ctx.currentTime + startTime);
            gain.gain.linearRampToValueAtTime(0.5, ctx.currentTime + startTime + 0.05);
            gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + startTime + duration);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(ctx.currentTime + startTime);
            osc.stop(ctx.currentTime + startTime + duration);
        };

        playTone(880, 0, 0.3);       // A5
        playTone(1108.73, 0.15, 0.5); // C#6
    } catch (e) {
        console.error('AudioContext not supported');
    }
}

function fetchAdminNotifs() {
    api('/notifications').then(res => {
        const list = document.getElementById('adminNotifList');
        const countSpan = document.querySelector('[data-notify-count]');
        if (!list) return;

        const unreadCount = res.unreadCount || 0;
        if (countSpan) {
            countSpan.textContent = unreadCount;
            if (unreadCount > 0) {
                countSpan.style.display = 'flex';
            } else {
                countSpan.style.display = 'none';
            }
        }

        if (!res.notifications || !res.notifications.length) {
            list.innerHTML = '<div style="padding:15px;text-align:center;color:#666;">Chưa có thông báo nào</div>';
            return;
        }

        list.innerHTML = res.notifications.map(n => `
            <a href="#" class="notif-item ${n.isRead ? '' : 'unread'}" onclick="event.preventDefault(); handleNotifClick('${n._id}', '${n.link || ''}')" style="display:block; padding:12px; border-bottom:1px solid #eee; text-decoration:none; color:inherit; ${n.isRead ? 'opacity: 0.7;' : 'background: #fdf5f0;'}">
                <h5 style="margin:0 0 5px 0; font-size:0.9rem; color:#222;">${n.type === 'order' ? '🚀 ' : ''}${escapeHtml(n.title)}</h5>
                <p style="margin:0; font-size:0.8rem; color:#666;">${escapeHtml(n.message)}</p>
                <small style="color:#999; font-size:0.75rem; margin-top:5px; display:block;">${new Date(n.createdAt).toLocaleString('vi-VN')}</small>
            </a>
        `).join('');
    }).catch(e => {
        console.error('Lỗi khi tải thông báo:', e);
        const list = document.getElementById('adminNotifList');
        const countSpan = document.querySelector('[data-notify-count]');
        if (countSpan) countSpan.style.display = 'none';
        if (list) {
            list.innerHTML = '<div style="padding:15px;text-align:center;color:#b45309;">Không thể tải thông báo.</div>';
        }
    });
}

async function handleNotifClick(notifId, link) {
    try {
        await api(`/notifications/${notifId}/read`, { method: 'PATCH' });
        fetchAdminNotifs();
        if (link) {
            // Redirect to the link. For example link = "/admin/orders.html?id=xxx"
            window.location.href = link;
        }
    } catch (e) {
        showToast(e.message);
    }
}

async function markAllNotifsRead() {
    try {
        await api('/notifications/read-all', { method: 'PATCH' });
        fetchAdminNotifs();
        showToast('Đã đánh dấu tất cả là đã đọc.');
    } catch (e) {
        showToast(e.message);
    }
}

// Promotion Management Functions
async function loadPromotionManager(page = state.promotions.page) {
    const promotionView = document.querySelector('#promotionManagerView');
    if (!promotionView || promotionView.hidden) return;

    const limit = state.promotions.limit;
    const filter = state.promotions.filter;
    const query = new URLSearchParams({ page, limit, q: filter.q, status: filter.status }).toString();

    try {
        const data = await api(`/admin/promotions?${query}`);
        state.promotions.data = data;
        state.promotions.page = data.page;
        renderPromotionManager(data);
    } catch (error) {
        showToast(error.message);
    }
}

function renderPromotionManager(data) {
    // Render KPI Cards
    document.getElementById('kpiTotalCampaigns').textContent = data.stats?.total || 0;
    document.getElementById('kpiActiveCampaigns').textContent = data.stats?.active || 0;
    document.getElementById('kpiUpcomingCampaigns').textContent = data.stats?.upcoming || 0;
    document.getElementById('kpiEndedCampaigns').textContent = data.stats?.expired || 0;
    document.getElementById('kpiActiveVouchers').textContent = data.stats?.active || 0;

    // Render Table
    const tbody = document.getElementById('promotionRows');
    if (!data.promotions || !data.promotions.length) {
        tbody.innerHTML = '<tr><td colspan="8" class="promo-empty-state"><i class="fa-solid fa-tags"></i><h3>Chưa có chiến dịch nào</h3><p>Tạo chiến dịch khuyến mãi đầu tiên để thu hút khách hàng</p></td></tr>';
    } else {
        tbody.innerHTML = data.promotions.map(promo => {
            const now = new Date();
            const start = new Date(promo.startDate);
            const end = new Date(promo.endDate);
            const isActive = promo.status === 'active' && now >= start && now <= end;
            const isUpcoming = now < start;
            const isExpired = now > end;

            let statusBadge = '';
            if (isActive) {
                statusBadge = '<span class="promo-status-badge active"><i class="fa-solid fa-circle"></i> Đang diễn ra</span>';
            } else if (isUpcoming) {
                statusBadge = '<span class="promo-status-badge upcoming"><i class="fa-solid fa-circle"></i> Sắp bắt đầu</span>';
            } else {
                statusBadge = '<span class="promo-status-badge ended"><i class="fa-solid fa-circle"></i> Đã kết thúc</span>';
            }

            const badgeType = promo.discountType === 'percentage' ? 'sale' : 'voucher';
            const badgeText = promo.discountType === 'percentage'
                ? `SALE ${promo.discountValue}%`
                : `${money(promo.discountValue)}`;

            return `
                <tr>
                    <td><input type="checkbox"></td>
                    <td>
                        <div class="promo-campaign-cell">
                            <div class="promo-campaign-thumb">
                                <img src="${promo.thumbnail || '/images/banner1png.png'}" alt="">
                                <span class="promo-badge ${badgeType}">${badgeText}</span>
                            </div>
                            <div class="promo-campaign-info">
                                <div class="promo-campaign-name">
                                    <strong>${escapeHtml(promo.name)}</strong>
                                </div>
                                <div class="promo-campaign-id">ID: ${promo._id.substring(0, 8)}</div>
                            </div>
                        </div>
                    </td>
                    <td><span class="promo-type-badge">${promo.discountType === 'percentage' ? 'Giảm %' : 'Cố định'}</span></td>
                    <td>${promo.code ? `<span class="promo-code">${escapeHtml(promo.code)}</span>` : '<span style="color: var(--admin-muted); font-size: 11px;">Tự động</span>'}</td>
                    <td>
                        <div class="promo-value">${promo.discountType === 'percentage' ? promo.discountValue + '%' : money(promo.discountValue)}</div>
                        <small class="promo-value-detail">Đơn từ ${money(promo.minOrderValue || 0)}</small>
                    </td>
                    <td>
                        <div class="promo-time">
                            <span class="promo-time-start">${plainDate(promo.startDate)}</span>
                            <span class="promo-time-end">→ ${plainDate(promo.endDate)}</span>
                        </div>
                    </td>
                    <td>${statusBadge}</td>
                    <td>
                        <div class="promo-actions">
                            <button type="button" title="Sửa" data-action="promotion-edit" data-id="${escapeHtml(promo._id)}"><i class="fa-regular fa-pen-to-square"></i></button>
                            <button type="button" class="danger" title="Xóa" data-action="promotion-delete" data-id="${escapeHtml(promo._id)}"><i class="fa-regular fa-trash-can"></i></button>
                        </div>
                    </td>
                </tr>
            `;
        }).join('');
    }

    // Render Pagination
    const start = (data.page - 1) * state.promotions.limit + 1;
    const end = Math.min(data.page * state.promotions.limit, data.total);
    document.getElementById('promotionPageText').textContent = data.total > 0 ? `Hiển thị ${start} - ${end} trong số ${data.total} chiến dịch` : 'Hiển thị 0 chiến dịch';

    // Generate modern pagination buttons
    let pagerHtml = '';

    // Previous button
    pagerHtml += `<button type="button" class="pagination-btn" ${data.page === 1 ? 'disabled' : ''} onclick="loadPromotionManager(${data.page - 1})">
        <i class="fa-solid fa-chevron-left"></i>
    </button>`;

    // Page numbers with ellipsis logic
    const totalPages = data.pages || 1;
    const currentPage = data.page;

    if (totalPages <= 7) {
        // Show all pages if 7 or less
        for (let i = 1; i <= totalPages; i++) {
            pagerHtml += `<button type="button" class="pagination-btn ${i === currentPage ? 'active' : ''}" onclick="loadPromotionManager(${i})">${i}</button>`;
        }
    } else {
        // Show first page
        pagerHtml += `<button type="button" class="pagination-btn ${1 === currentPage ? 'active' : ''}" onclick="loadPromotionManager(1)">1</button>`;

        // Show ellipsis or pages around current
        if (currentPage > 3) {
            pagerHtml += `<span class="pagination-ellipsis">...</span>`;
        }

        // Show pages around current page
        const startPage = Math.max(2, currentPage - 1);
        const endPage = Math.min(totalPages - 1, currentPage + 1);

        for (let i = startPage; i <= endPage; i++) {
            pagerHtml += `<button type="button" class="pagination-btn ${i === currentPage ? 'active' : ''}" onclick="loadPromotionManager(${i})">${i}</button>`;
        }

        // Show ellipsis or last page
        if (currentPage < totalPages - 2) {
            pagerHtml += `<span class="pagination-ellipsis">...</span>`;
        }

        // Show last page
        pagerHtml += `<button type="button" class="pagination-btn ${totalPages === currentPage ? 'active' : ''}" onclick="loadPromotionManager(${totalPages})">${totalPages}</button>`;
    }

    // Next button
    pagerHtml += `<button type="button" class="pagination-btn" ${data.page === data.pages || data.pages === 0 ? 'disabled' : ''} onclick="loadPromotionManager(${data.page + 1})">
        <i class="fa-solid fa-chevron-right"></i>
    </button>`;

    document.getElementById('promotionPager').innerHTML = pagerHtml;


    // Render Sidebar - Featured Campaigns
    const featuredHtml = (data.promotions || []).slice(0, 3).map(promo => `
        <div class="promo-featured-card">
            <div class="promo-featured-thumb">
                <img src="${promo.thumbnail || '/images/banner1png.png'}" alt="">
            </div>
            <div class="promo-featured-info">
                <h4>${escapeHtml(promo.name)}</h4>
                <div class="promo-featured-meta">
                    <span><i class="fa-solid fa-ticket"></i> ${promo.discountType === 'percentage' ? promo.discountValue + '%' : money(promo.discountValue)}</span>
                    <span><i class="fa-solid fa-users"></i> ${promo.usedCount || 0}</span>
                </div>
            </div>
        </div>
    `).join('') || '<p style="text-align: center; color: var(--admin-muted); padding: 20px;">Chưa có chiến dịch nổi bật</p>';
    document.getElementById('featuredCampaigns').innerHTML = featuredHtml;

    // Render Today's Schedule
    const todayPromos = (data.promotions || []).filter(p => {
        const now = new Date();
        const start = new Date(p.startDate);
        const end = new Date(p.endDate);
        return now >= start && now <= end;
    }).slice(0, 3);

    const scheduleHtml = todayPromos.map(promo => {
        const endDate = new Date(promo.endDate);
        return `
        <div class="promo-schedule-item">
            <div class="promo-schedule-time">
                <strong>${endDate.getDate()}</strong>
                <span>Th${endDate.getMonth() + 1}</span>
            </div>
            <div class="promo-schedule-info">
                <h5>${escapeHtml(promo.name)}</h5>
                <p>Kết thúc ${dateText(promo.endDate)}</p>
            </div>
        </div>
    `}).join('') || '<p style="text-align: center; color: var(--admin-muted); padding: 20px;">Không có chiến dịch nào đang chạy</p>';
    document.getElementById('todaySchedule').innerHTML = scheduleHtml;
}


// Initialize Promotion Filters
function initPromotionFilters() {
    const searchInput = document.getElementById('promotionSearchInput');
    const typeFilter = document.getElementById('promotionTypeFilter');
    const statusFilter = document.getElementById('promotionStatusFilter');
    const channelFilter = document.getElementById('promotionChannelFilter');
    const timeFilter = document.getElementById('promotionTimeFilter');

    // Search input with debounce
    let searchTimeout;
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => {
                state.promotions.filter.q = e.target.value.trim();
                state.promotions.page = 1;
                loadPromotionManager(1);
            }, 500);
        });
    }

    // Filter dropdowns - update on change
    if (typeFilter) {
        typeFilter.addEventListener('change', (e) => {
            state.promotions.filter.type = e.target.value;
        });
    }

    if (statusFilter) {
        statusFilter.addEventListener('change', (e) => {
            state.promotions.filter.status = e.target.value;
        });
    }

    if (channelFilter) {
        channelFilter.addEventListener('change', (e) => {
            state.promotions.filter.channel = e.target.value;
        });
    }

    if (timeFilter) {
        timeFilter.addEventListener('change', (e) => {
            state.promotions.filter.time = e.target.value;
        });
    }
}

// Apply Promotion Filters
function applyPromotionFilters() {
    state.promotions.page = 1;
    loadPromotionManager(1);
    showToast('Đã áp dụng bộ lọc', 'success');
}

// Reset Promotion Filters
function resetPromotionFilters() {
    // Reset filter state
    state.promotions.filter = { q: '', status: 'all', type: 'all', channel: 'all', time: 'all' };
    state.promotions.page = 1;

    // Reset UI
    const searchInput = document.getElementById('promotionSearchInput');
    const typeFilter = document.getElementById('promotionTypeFilter');
    const statusFilter = document.getElementById('promotionStatusFilter');
    const channelFilter = document.getElementById('promotionChannelFilter');
    const timeFilter = document.getElementById('promotionTimeFilter');

    if (searchInput) searchInput.value = '';
    if (typeFilter) typeFilter.value = 'all';
    if (statusFilter) statusFilter.value = 'all';
    if (channelFilter) channelFilter.value = 'all';
    if (timeFilter) timeFilter.value = 'all';

    // Reload data
    loadPromotionManager(1);
    showToast('Đã đặt lại bộ lọc', 'success');
}

function showPromotionForm(promotionId = null) {
    const managerView = document.querySelector('#promotionManagerView');
    const formView = document.querySelector('#promotionFormView');
    if (!managerView || !formView) return;

    managerView.hidden = true;
    formView.hidden = false;

    const form = document.getElementById('promotionMainForm');
    form.reset();
    document.getElementById('promotionId').value = '';

    if (promotionId) {
        document.getElementById('formTitleBreadcrumb').textContent = 'Sửa khuyến mãi';
        document.getElementById('formTitleText').textContent = 'Sửa khuyến mãi';
        document.getElementById('savePromotionBtnText').textContent = 'Cập nhật';
        loadPromotionDetail(promotionId);
    } else {
        document.getElementById('formTitleBreadcrumb').textContent = 'Tạo khuyến mãi';
        document.getElementById('formTitleText').textContent = 'Tạo khuyến mãi mới';
        document.getElementById('savePromotionBtnText').textContent = 'Lưu khuyến mãi';
    }
}

async function loadPromotionDetail(id) {
    try {
        const promo = await api(`/admin/promotions/${id}`);
        document.getElementById('promotionId').value = promo._id;
        document.querySelector('[name="name"]').value = promo.name || '';
        document.querySelector('[name="code"]').value = promo.code || '';
        document.querySelector('[name="discountType"]').value = promo.discountType || 'percentage';
        document.querySelector('[name="discountValue"]').value = promo.discountValue || '';
        document.querySelector('[name="minOrderValue"]').value = promo.minOrderValue || 0;
        document.querySelector('[name="maxUsage"]').value = promo.maxUsage || '';
        document.querySelector('[name="status"]').value = promo.status || 'active';

        if (promo.startDate) {
            const start = new Date(promo.startDate);
            document.querySelector('[name="startDate"]').value = start.toISOString().slice(0, 16);
        }
        if (promo.endDate) {
            const end = new Date(promo.endDate);
            document.querySelector('[name="endDate"]').value = end.toISOString().slice(0, 16);
        }
    } catch (error) {
        showToast(error.message);
    }
}

async function savePromotion() {
    const form = document.getElementById('promotionMainForm');
    if (!form.checkValidity()) {
        form.reportValidity();
        return;
    }

    const id = document.getElementById('promotionId').value;
    const data = {
        name: form.name.value.trim(),
        code: form.code.value.trim() || undefined,
        discountType: form.discountType.value,
        discountValue: Number(form.discountValue.value),
        startDate: form.startDate.value,
        endDate: form.endDate.value,
        minOrderValue: Number(form.minOrderValue.value) || 0,
        maxUsage: form.maxUsage.value ? Number(form.maxUsage.value) : undefined,
        status: form.status.value
    };

    try {
        if (id) {
            await api(`/admin/promotions/${id}`, { method: 'PUT', body: JSON.stringify(data) });
            showToast('Đã cập nhật khuyến mãi thành công.');
        } else {
            await api('/admin/promotions', { method: 'POST', body: JSON.stringify(data) });
            showToast('Đã tạo khuyến mãi thành công.');
        }
        backToPromotions();
        loadPromotionManager();
    } catch (error) {
        showToast(error.message);
    }
}

function backToPromotions() {
    const managerView = document.querySelector('#promotionManagerView');
    const formView = document.querySelector('#promotionFormView');
    if (managerView && formView) {
        managerView.hidden = false;
        formView.hidden = true;
    }
}

function showDeletePromotionModal(id) {
    const promo = state.promotions.data?.promotions?.find(p => p._id === id);
    if (!promo) return;

    document.getElementById('delPromoName').textContent = promo.name;
    document.getElementById('delPromoCode').textContent = promo.code || 'Không có';
    document.getElementById('delPromoValue').textContent = promo.discountType === 'percentage' ? promo.discountValue + '%' : money(promo.discountValue);
    document.getElementById('delPromoUsed').textContent = (promo.usedCount || 0) + ' lần';
    document.getElementById('confirmDeletePromoBtn').dataset.id = id;
    document.getElementById('deletePromotionModal').hidden = false;
}

async function deletePromotion(id) {
    try {
        await api(`/admin/promotions/${id}`, { method: 'DELETE' });
        showToast('Đã xóa khuyến mãi thành công.');
        document.getElementById('deletePromotionModal').hidden = true;
        loadPromotionManager();
    } catch (error) {
        showToast(error.message);
    }
}

// Promotion Event Handlers
document.addEventListener('click', (event) => {
    const target = event.target.closest('[data-action]');
    if (!target) return;

    const action = target.dataset.action;
    const id = target.dataset.id;

    // Promotion actions
    if (action === 'promotion-add') {
        event.preventDefault();
        showPromotionForm();
    } else if (action === 'promotion-edit') {
        event.preventDefault();
        showPromotionForm(id);
    } else if (action === 'promotion-delete') {
        event.preventDefault();
        showDeletePromotionModal(id);
    } else if (action === 'promotion-filter' || action === 'promotion-load') {
        event.preventDefault();
        applyPromotionFilters();
    } else if (action === 'promotion-reset') {
        event.preventDefault();
        resetPromotionFilters();
    } else if (action === 'save-promotion') {
        event.preventDefault();
        savePromotion();
    } else if (action === 'back-promotions') {
        event.preventDefault();
        backToPromotions();
    } else if (action === 'close-delete-modal') {
        event.preventDefault();
        document.getElementById('deletePromotionModal').hidden = true;
    } else if (action === 'confirm-delete-promotion') {
        event.preventDefault();
        const deleteId = target.dataset.id;
        if (deleteId) deletePromotion(deleteId);
    }
});

// Discount type change handler
const discountTypeSelect = document.getElementById('discountTypeSelect');
if (discountTypeSelect) {
    discountTypeSelect.addEventListener('change', (event) => {
        const hint = document.getElementById('discountValueHint');
        if (hint) {
            hint.textContent = event.target.value === 'percentage' 
                ? 'Nhập % giảm giá (VD: 10 = giảm 10%)'
                : 'Nhập số tiền giảm (VD: 50000 = giảm 50,000đ)';
        }
    });
}

// Load promotion manager on page load
if (pageFromPath() === 'promotions') {
    const authGate = document.getElementById('authGate');
    const promotionView = document.getElementById('promotionManagerView');
    
    ensureAdminSession().then(() => {
        if (authGate) authGate.hidden = true;
        if (promotionView) promotionView.hidden = false;
        setAdminSessionControls(true);
        loadPromotionManager();
        initPromotionFilters();
    }).catch(() => {
        if (authGate) authGate.hidden = false;
        if (promotionView) promotionView.hidden = true;
        setAdminSessionControls(false);
    });
}

// ============================================================================
// REVIEW MANAGEMENT
// ============================================================================

async function loadReviewManager(page = state.reviews.page) {
    const reviewView = document.querySelector('#reviewManagerView');
    if (!reviewView || reviewView.hidden) return;

    const limit = state.reviews.limit;
    const filter = state.reviews.filter;
    const query = new URLSearchParams({ page, limit, status: filter.status }).toString();

    try {
        const data = await api(`/admin/reviews?${query}`);
        state.reviews.data = data;
        state.reviews.page = data.page;
        renderReviewManager(data);
    } catch (error) {
        showToast(error.message);
    }
}

function renderReviewManager(data) {
    // Update stats
    document.getElementById('statTotalReviews').textContent = number(data.stats.total);
    document.getElementById('statAvgRating').textContent = data.stats.avgRating;
    document.getElementById('statPendingReviews').textContent = number(data.stats.pending);
    document.getElementById('statHiddenReviews').textContent = number(data.stats.hidden);

    // Render review rows - simple version matching HTML structure
    const tbody = document.getElementById('reviewRows');
    if (!data.reviews || !data.reviews.length) {
        tbody.innerHTML = '<tr><td colspan="7" class="empty-state">Không có đánh giá nào</td></tr>';
    } else {
        tbody.innerHTML = data.reviews.map(review => {
            const productImage = review.product?.image || (review.product?.images?.[0]?.url) || '/images/banner1png.png';
            const productName = review.product?.name || 'Sản phẩm đã xóa';
            const customerName = review.customer?.name || 'Khách hàng';
            const customerEmail = review.customer?.email || '';
            const stars = '★'.repeat(review.rating) + '☆'.repeat(5 - review.rating);
            const statusBadge = review.status === 'active' ? 'success' : (review.status === 'pending' ? 'warning' : 'danger');
            const statusLabel = review.status === 'active' ? 'Hiển thị' : (review.status === 'pending' ? 'Chờ duyệt' : 'Đã ẩn');
            
            return `
                <tr>
                    <td><input type="checkbox"></td>
                    <td>
                        <div class="product-cell">
                            <img src="${escapeHtml(productImage)}" alt="${escapeHtml(productName)}" style="width: 64px; height: 64px; object-fit: cover; border-radius: 8px;">
                            <div>
                                <b>${escapeHtml(productName)}</b>
                                <div style="color: #f59e0b; font-size: 14px; margin-top: 4px;">${stars} <small style="color: var(--admin-muted);">${review.rating}/5</small></div>
                            </div>
                        </div>
                    </td>
                    <td>
                        <div style="font-weight: 500; color: var(--admin-text);">${escapeHtml(customerName)}</div>
                        <small style="color: var(--admin-muted);">${escapeHtml(customerEmail)}</small>
                    </td>
                    <td style="max-width: 300px;">
                        <div style="overflow: hidden; text-overflow: ellipsis; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; margin-bottom: 4px;">
                            ${escapeHtml(review.comment || 'Không có nội dung')}
                        </div>
                        ${review.images && review.images.length > 0 ? `
                        <div style="display: flex; gap: 4px; margin-top: 6px;">
                            ${review.images.slice(0, 3).map(img => `<img src="${escapeHtml(img)}" style="width: 36px; height: 36px; object-fit: cover; border-radius: 4px; border: 1px solid #eee; cursor: pointer;" onclick="window.open('${escapeHtml(img)}', '_blank')" alt="Ảnh đánh giá">`).join('')}
                            ${review.images.length > 3 ? `<div style="width: 36px; height: 36px; border-radius: 4px; background: #f0f0f0; display: flex; align-items: center; justify-content: center; font-size: 11px; color: #666; border: 1px solid #eee;">+${review.images.length - 3}</div>` : ''}
                        </div>` : ''}
                    </td>
                    <td style="color: var(--admin-muted); font-size: 0.9rem;">${dateText(review.createdAt)}</td>
                    <td><span class="badge ${statusBadge}">${statusLabel}</span></td>
                    <td>
                        <div class="product-actions">
                            <button type="button" title="Xem chi tiết" data-action="view-review" data-id="${escapeHtml(review._id)}"><i class="fa-regular fa-eye"></i></button>
                        </div>
                    </td>
                </tr>
            `;
        }).join('');
    }

    // Pagination
    const start = (data.page - 1) * state.reviews.limit + 1;
    const end = Math.min(data.page * state.reviews.limit, data.total);
    document.getElementById('reviewPageText').textContent = data.total > 0 ? `${start} - ${end} của ${data.total} đánh giá` : '0 đánh giá';
    
    let pagerHtml = `<button type="button" ${data.page === 1 ? 'disabled' : ''} onclick="loadReviewManager(${data.page - 1})"><i class="fa-solid fa-chevron-left"></i></button>`;
    for (let i = 1; i <= data.pages; i++) {
        pagerHtml += `<button type="button" class="${i === data.page ? 'active' : ''}" onclick="loadReviewManager(${i})">${i}</button>`;
    }
    pagerHtml += `<button type="button" ${data.page === data.pages || data.pages === 0 ? 'disabled' : ''} onclick="loadReviewManager(${data.page + 1})"><i class="fa-solid fa-chevron-right"></i></button>`;
    document.getElementById('reviewPager').innerHTML = pagerHtml;
}

async function showReviewDetail(reviewId) {
    try {
        // Find review in current data
        const review = state.reviews.data?.reviews?.find(r => r._id === reviewId);
        if (!review) {
            showToast('Không tìm thấy đánh giá');
            return;
        }

        const productImage = review.product?.images?.[0]?.url || review.product?.image || '/images/banner1png.png';
        const productName = review.product?.name || 'Sản phẩm đã xóa';
        const customerName = review.customer?.name || 'Khách hàng';
        const customerEmail = review.customer?.email || '';
        const customerAvatar = review.customer?.avatar || '/images/avatar-placeholder.png';
        const rating = review.rating || 0;
        const stars = '★'.repeat(rating) + '☆'.repeat(5 - rating);
        
        document.getElementById('reviewModalId').value = review._id;
        document.getElementById('reviewModalStatusUpdate').value = review.status;
        
        document.getElementById('reviewModalBody').innerHTML = `
            <div style="display: flex; gap: 24px; margin-bottom: 24px;">
                <div style="flex-shrink: 0;">
                    <img src="${escapeHtml(productImage)}" alt="${escapeHtml(productName)}" 
                         style="width: 160px; height: 160px; object-fit: cover; border-radius: 12px; box-shadow: 0 4px 15px rgba(0,0,0,0.08); border: 1px solid #f0f0f0;">
                </div>
                <div style="flex: 1; display: flex; flex-direction: column; justify-content: center;">
                    <h3 style="margin: 0 0 12px 0; font-size: 1.25rem; font-family: 'Playfair Display', serif; color: var(--admin-brown-dark);">${escapeHtml(productName)}</h3>
                    <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 12px;">
                        <div style="color: #f59e0b; font-size: 1.2rem; letter-spacing: 2px;">${stars}</div>
                        <div style="font-size: 1rem; color: var(--admin-text); background: #fdf5f0; padding: 2px 10px; border-radius: 20px; font-weight: 500;">${rating}.0 / 5.0</div>
                    </div>
                    <div style="color: var(--admin-muted); font-size: 0.9rem;">
                        <i class="fa-regular fa-calendar" style="margin-right: 6px;"></i> ${dateText(review.createdAt)}
                    </div>
                </div>
            </div>
            
            <div style="margin-bottom: 24px; padding: 20px; background: #fafafa; border-radius: 12px; border: 1px solid #eee;">
                <h4 style="margin: 0 0 16px 0; font-size: 0.9rem; text-transform: uppercase; letter-spacing: 1px; color: var(--admin-muted);">Khách hàng</h4>
                <div style="display: flex; align-items: center; gap: 16px;">
                    <img src="${escapeHtml(customerAvatar)}" alt="${escapeHtml(customerName)}" 
                         style="width: 56px; height: 56px; border-radius: 50%; object-fit: cover; border: 2px solid #fff; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
                    <div>
                        <div style="font-weight: 600; font-size: 1.1rem; color: var(--admin-text); margin-bottom: 4px;">${escapeHtml(customerName)}</div>
                        <div style="font-size: 0.9rem; color: var(--admin-muted);"><i class="fa-regular fa-envelope" style="margin-right: 4px;"></i> ${escapeHtml(customerEmail)}</div>
                    </div>
                </div>
            </div>
            
            <div style="margin-bottom: 24px;">
                <h4 style="margin: 0 0 12px 0; font-size: 0.9rem; text-transform: uppercase; letter-spacing: 1px; color: var(--admin-muted);">Nội dung đánh giá</h4>
                <div style="padding: 20px; background: #fafafa; border-radius: 12px; border: 1px solid #eee; font-size: 1.05rem; line-height: 1.6; color: var(--admin-text); box-shadow: inset 0 2px 4px rgba(0,0,0,0.01);">
                    ${escapeHtml(review.comment || 'Khách hàng không để lại nội dung đánh giá.')}
                </div>
            </div>
            
            ${review.images && review.images.length > 0 ? `
                <div>
                    <h4 style="margin: 0 0 12px 0; font-size: 0.9rem; text-transform: uppercase; letter-spacing: 1px; color: var(--admin-muted);">Ảnh đính kèm từ khách hàng (${review.images.length})</h4>
                    <div style="display: flex; flex-wrap: wrap; gap: 12px;">
                        ${review.images.map(img => `
                            <img src="${escapeHtml(img)}" alt="Review image" 
                                 style="width: 120px; height: 120px; object-fit: cover; border-radius: 8px; border: 1px solid #eee; cursor: pointer; transition: transform 0.2s;"
                                 onmouseover="this.style.transform='scale(1.05)'" onmouseout="this.style.transform='scale(1)'"
                                 onclick="window.open('${escapeHtml(img)}', '_blank')">
                        `).join('')}
                    </div>
                </div>
            ` : ''}
        `;
        
        document.getElementById('reviewDetailModal').showModal();
    } catch (error) {
        showToast(error.message);
    }
}

async function submitReviewStatus() {
    const reviewId = document.getElementById('reviewModalId').value;
    const newStatus = document.getElementById('reviewModalStatusUpdate').value;
    
    if (!reviewId || !newStatus) {
        showToast('Dữ liệu không hợp lệ');
        return;
    }
    
    try {
        await api(`/admin/reviews/${reviewId}/status`, {
            method: 'PATCH',
            body: JSON.stringify({ status: newStatus })
        });
        
        showToast('Đã cập nhật trạng thái đánh giá');
        document.getElementById('reviewDetailModal').close();
        loadReviewManager();
    } catch (error) {
        showToast(error.message);
    }
}

// ============================================================================
// PRODUCT IMAGE UPLOAD
// ============================================================================

function fileToBase64(file) {
    return new Promise((resolve, reject) => {
        if (!file) {
            reject(new Error('No file provided'));
            return;
        }
        
        // Validate file type
        if (!file.type.match(/^image\/(png|jpe?g|webp)$/i)) {
            reject(new Error('Chỉ hỗ trợ file ảnh PNG, JPG, JPEG, WEBP'));
            return;
        }
        
        // Validate file size (5MB max)
        if (file.size > 5 * 1024 * 1024) {
            reject(new Error('Kích thước ảnh tối đa 5MB'));
            return;
        }
        
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = () => reject(new Error('Không thể đọc file'));
        reader.readAsDataURL(file);
    });
}

async function handlePrimaryImageUpload(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    const preview = document.getElementById('primaryImagePreview');
    const placeholder = document.getElementById('primaryImagePlaceholder');
    const replaceBtn = document.getElementById('replacePrimaryBtn');
    const input = document.getElementById('primaryImageInput');

    try {
        const base64 = await fileToBase64(file);

        // Show local preview immediately
        if (preview && placeholder && replaceBtn) {
            preview.src = base64;
            preview.hidden = false;
            placeholder.hidden = true;
            replaceBtn.hidden = false;
        }

        showToast('Đang tải ảnh lên...');

        // Upload to server, get back a URL
        const result = await api('/admin/upload/product-image', {
            method: 'POST',
            body: JSON.stringify({ image: base64 })
        });

        if (input) input.value = result.url;
        showToast('Đã tải ảnh đại diện thành công.');
    } catch (error) {
        showToast(error.message || 'Lỗi khi tải ảnh lên.');
        // Reset on failure
        if (preview) { preview.hidden = true; preview.src = ''; }
        if (placeholder) placeholder.hidden = false;
        if (replaceBtn) replaceBtn.hidden = true;
        if (input) input.value = '';
    }

    // Reset file input
    event.target.value = '';
}


async function handleGalleryImageUpload(event) {
    const files = Array.from(event.target.files || []);
    if (!files.length) return;
    
    try {
        const galleryGrid = document.getElementById('galleryGrid');
        const galleryInput = document.getElementById('galleryImagesInput');
        const galleryCount = document.getElementById('galleryCount');
        
        if (!galleryGrid || !galleryInput) return;
        
        // Get existing images
        let existingImages = [];
        try {
            existingImages = JSON.parse(galleryInput.value || '[]');
        } catch (e) {
            existingImages = [];
        }
        
        // Check limit
        if (existingImages.length + files.length > 10) {
            showToast('Tối đa 10 ảnh trong thư viện');
            return;
        }
        
        // Convert all files to base64
        for (const file of files) {
            const base64 = await fileToBase64(file);
            existingImages.push(base64);
        }
        
        // Update hidden input
        galleryInput.value = JSON.stringify(existingImages);
        
        // Re-render gallery
        renderGalleryImages();
        
        showToast(`Đã thêm ${files.length} ảnh vào thư viện`);
    } catch (error) {
        showToast(error.message);
    }
    
    // Reset file input
    event.target.value = '';
}

function renderGalleryImages() {
    const galleryGrid = document.getElementById('galleryGrid');
    const galleryInput = document.getElementById('galleryImagesInput');
    const galleryCount = document.getElementById('galleryCount');
    
    if (!galleryGrid || !galleryInput) return;
    
    let images = [];
    try {
        images = JSON.parse(galleryInput.value || '[]');
    } catch (e) {
        images = [];
    }
    
    // Update count
    if (galleryCount) {
        galleryCount.textContent = `(${images.length}/10)`;
    }
    
    // Render images
    const imagesHtml = images.map((img, index) => `
        <div class="gallery-item" style="position: relative;">
            <img src="${img}" alt="Gallery ${index + 1}" style="width: 100%; height: 100px; object-fit: cover; border-radius: 8px;">
            <button type="button" class="gallery-remove-btn" onclick="removeGalleryImage(${index})" style="position: absolute; top: 4px; right: 4px; width: 24px; height: 24px; border-radius: 50%; background: rgba(239, 68, 68, 0.9); color: white; border: none; cursor: pointer; display: flex; align-items: center; justify-content: center; font-size: 14px;">
                <i class="fa-solid fa-xmark"></i>
            </button>
        </div>
    `).join('');
    
    galleryGrid.innerHTML = imagesHtml + `
        <div class="gallery-upload-btn" onclick="document.getElementById('galleryImageFile').click()">
            <i class="fa-solid fa-upload"></i><br>Tải lên ảnh<br><small>Hỗ trợ JPG, PNG. Tối đa 5MB</small>
        </div>
    `;
}

function removeGalleryImage(index) {
    const galleryInput = document.getElementById('galleryImagesInput');
    if (!galleryInput) return;
    
    let images = [];
    try {
        images = JSON.parse(galleryInput.value || '[]');
    } catch (e) {
        images = [];
    }
    
    images.splice(index, 1);
    galleryInput.value = JSON.stringify(images);
    renderGalleryImages();
    showToast('Đã xóa ảnh');
}

// ============================================================================
// PRODUCT FORM SAVE
// ============================================================================

async function saveProductForm() {
    const form = document.getElementById('productMainForm');
    if (!form) return;
    
    const productId = document.getElementById('productId')?.value;
    const saveBtn = document.querySelector('[data-action="save-product"]');
    const saveBtnText = document.getElementById('saveProductBtnText');
    
    try {
        // Validate required fields
        const name = form.name.value.trim();
        const sku = form.sku.value.trim();
        const category = form.category.value;
        const price = parseFloat(form.price.value);
        const stock = parseInt(form.stock.value);
        const shortDescription = form.shortDescription.value.trim();
        
        if (!name || !sku || !category || !price || !shortDescription) {
            showToast('Vui lòng điền đầy đủ các trường bắt buộc');
            return;
        }
        
        // Disable button
        if (saveBtn) saveBtn.disabled = true;
        if (saveBtnText) saveBtnText.textContent = 'Đang lưu...';
        
        // Collect form data
        const formData = {
            name,
            sku,
            category,
            price,
            salePrice: form.salePrice.value ? parseFloat(form.salePrice.value) : undefined,
            stock,
            status: form.status.value,
            shortDescription,
            description: form.description.value.trim(),
            material: form.material.value,
            dimensions: form.dimensions.value,
            color: form.color.value,
            brand: form.brand?.value || '',
            isFeatured: form.isFeatured?.checked || false,
            isNewProduct: form.isNewProduct?.checked || false
        };
        
        // Add primary image
        const primaryImage = document.getElementById('primaryImageInput')?.value;
        if (primaryImage) {
            formData.image = primaryImage;
        }
        
        // Add gallery images (for future enhancement)
        const galleryImages = document.getElementById('galleryImagesInput')?.value;
        if (galleryImages) {
            try {
                formData.galleryImages = JSON.parse(galleryImages);
            } catch (e) {
                // Ignore parse errors
            }
        }
        
        // Call API
        const endpoint = productId ? `/admin/products/${productId}` : '/admin/products';
        const method = productId ? 'PATCH' : 'POST';
        
        const result = await api(endpoint, {
            method,
            body: JSON.stringify(formData)
        });
        
        showToast(productId ? 'Đã cập nhật sản phẩm' : 'Đã thêm sản phẩm mới');
        recordActivity(
            productId ? 'Cập nhật sản phẩm' : 'Thêm sản phẩm mới',
            `Sản phẩm: ${name}`,
            'fa-solid fa-cube'
        );
        
        // Navigate back to product list
        setTimeout(() => {
            window.location.href = '/admin/products.html';
        }, 500);
        
    } catch (error) {
        showToast(error.message);
    } finally {
        if (saveBtn) saveBtn.disabled = false;
        if (saveBtnText) saveBtnText.textContent = productId ? 'Cập nhật sản phẩm' : 'Lưu sản phẩm';
    }
}

async function loadProductForm(productId) {
    if (!productId) return;
    
    try {
        const product = await api(`/admin/products/${productId}`);
        
        // Update form title
        const formTitle = document.getElementById('formTitleText');
        const formBreadcrumb = document.getElementById('formTitleBreadcrumb');
        if (formTitle) formTitle.textContent = 'Chỉnh sửa sản phẩm';
        if (formBreadcrumb) formBreadcrumb.textContent = 'Chỉnh sửa sản phẩm';
        
        // Populate form fields
        const form = document.getElementById('productMainForm');
        if (!form) return;
        
        document.getElementById('productId').value = product._id;
        form.name.value = product.name || '';
        form.sku.value = product.sku || '';
        form.category.value = product.category?._id || product.category || '';
        form.price.value = product.price || 0;
        form.salePrice.value = product.salePrice || '';
        form.stock.value = product.stock || 0;
        form.status.value = product.status || 'active';
        form.shortDescription.value = product.shortDescription || '';
        form.description.value = product.description || '';
        form.material.value = product.material || '';
        form.dimensions.value = product.dimensions || '';
        form.color.value = product.color || '';
        if (form.brand) form.brand.value = product.brand || '';
        if (form.isFeatured) form.isFeatured.checked = product.isFeatured || false;
        if (form.isNewProduct) form.isNewProduct.checked = product.isNewProduct || false;
        
        // Load primary image
        if (product.images && product.images.length > 0) {
            const primaryImg = product.images.find(img => img.isPrimary) || product.images[0];
            if (primaryImg) {
                const preview = document.getElementById('primaryImagePreview');
                const placeholder = document.getElementById('primaryImagePlaceholder');
                const replaceBtn = document.getElementById('replacePrimaryBtn');
                const input = document.getElementById('primaryImageInput');
                
                if (preview && placeholder && replaceBtn && input) {
                    preview.src = primaryImg.url;
                    preview.hidden = false;
                    placeholder.hidden = true;
                    replaceBtn.hidden = false;
                    input.value = primaryImg.url;
                }
            }
        }
        
    } catch (error) {
        showToast(error.message);
    }
}

// ============================================================================
// INITIALIZATION
// ============================================================================

// Initialize reviews page
if (pageFromPath() === 'reviews') {
    const authGate = document.getElementById('authGate');
    const reviewView = document.getElementById('reviewManagerView');
    
    ensureAdminSession().then(() => {
        if (authGate) authGate.hidden = true;
        if (reviewView) reviewView.hidden = false;
        setAdminSessionControls(true);
        loadReviewManager();
    }).catch(() => {
        if (authGate) authGate.hidden = false;
        if (reviewView) reviewView.hidden = true;
        setAdminSessionControls(false);
    });
}

// Initialize product form page
if (pageFromPath() === 'products') {
    // Setup image upload handlers
    const primaryImageFile = document.getElementById('primaryImageFile');
    if (primaryImageFile) {
        primaryImageFile.addEventListener('change', handlePrimaryImageUpload);
    }
    
    const galleryImageFile = document.getElementById('galleryImageFile');
    if (galleryImageFile) {
        galleryImageFile.addEventListener('change', handleGalleryImageUpload);
    }
    
    // Check if editing existing product
    const urlParams = new URLSearchParams(window.location.search);
    const editProductId = urlParams.get('edit');
    if (editProductId) {
        setTimeout(() => loadProductForm(editProductId), 500);
    }
}


// ===== CONTACT MANAGER =====

const contactStatusMeta = {
    pending: { label: 'Mới', icon: 'fa-solid fa-inbox', color: '#e67e22', tint: '#fff0d0' },
    processing: { label: 'Đang xử lý', icon: 'fa-solid fa-spinner', color: '#3d82c4', tint: '#ddecfb' },
    resolved: { label: 'Đã phản hồi', icon: 'fa-solid fa-circle-check', color: '#16a34a', tint: '#e5f5dd' }
};

async function loadContactManager(page = state.contacts.page) {
    const contactView = document.querySelector('#contactManagerView');
    if (!contactView || contactView.hidden) return;
    const params = new URLSearchParams({
        page: page,
        limit: state.contacts.limit,
        q: state.contacts.filter.q,
        status: state.contacts.filter.status
    });
    try {
        const data = await api(`/admin/contacts?${params.toString()}`);
        state.contacts.page = data.page;
        state.contacts.data = data;
        renderContactManager(data);
    } catch (error) {
        showToast(error.message);
    }
}

function renderContactManager(data) {
    // KPI cards
    const stats = data.stats || {};
    const el = (id) => document.getElementById(id);
    if (el('statTotalContacts')) el('statTotalContacts').textContent = number(stats.total || 0);
    if (el('statPendingContacts')) el('statPendingContacts').textContent = number(stats.pending || 0);
    if (el('statProcessingContacts')) el('statProcessingContacts').textContent = number(stats.processing || 0);
    if (el('statResolvedContacts')) el('statResolvedContacts').textContent = number(stats.resolved || 0);

    // Table rows
    const tbody = document.getElementById('contactRows');
    if (!tbody) return;

    if (!data.contacts || !data.contacts.length) {
        tbody.innerHTML = '<tr><td colspan="8" class="empty-state">Chưa có liên hệ nào.</td></tr>';
    } else {
        tbody.innerHTML = data.contacts.map((c) => {
            const meta = contactStatusMeta[c.status] || contactStatusMeta.pending;
            return `
                <tr>
                    <td><input type="checkbox"></td>
                    <td>
                        <div class="product-cell">
                            <div class="contact-avatar-small"><i class="fa-solid fa-user"></i></div>
                            <div>
                                <b>${escapeHtml(c.fullName)}</b>
                                <small style="display:block;color:var(--admin-muted);">${escapeHtml(c.email)}</small>
                            </div>
                        </div>
                    </td>
                    <td>${escapeHtml(c.phone || '—')}</td>
                    <td><b>${escapeHtml(c.subject || 'Không có')}</b></td>
                    <td style="max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${escapeHtml((c.message || '').substring(0, 80))}</td>
                    <td><span class="badge ${c.status}" style="background:${meta.tint};color:${meta.color};">${meta.label}</span></td>
                    <td>${shortDate(c.createdAt)}</td>
                    <td>
                        <button class="btn-icon" type="button" title="Xem chi tiết" onclick="showContactDetail('${c._id}')"><i class="fa-solid fa-eye"></i></button>
                    </td>
                </tr>
            `;
        }).join('');
    }

    // Pagination
    const pageText = document.getElementById('contactPageText');
    const pager = document.getElementById('contactPager');
    if (pageText) pageText.textContent = `${number(data.total)} liên hệ`;
    if (pager) {
        const totalPages = data.totalPages || 1;
        let html = '';
        if (data.page > 1) html += `<button type="button" class="secondary-action" onclick="loadContactManager(${data.page - 1})"><i class="fa-solid fa-chevron-left"></i></button>`;
        for (let i = 1; i <= totalPages; i++) {
            html += `<button type="button" class="${i === data.page ? 'primary-action' : 'secondary-action'}" onclick="loadContactManager(${i})">${i}</button>`;
        }
        if (data.page < totalPages) html += `<button type="button" class="secondary-action" onclick="loadContactManager(${data.page + 1})"><i class="fa-solid fa-chevron-right"></i></button>`;
        pager.innerHTML = html;
    }
}

function showContactDetail(contactId) {
    const data = state.contacts.data;
    if (!data || !data.contacts) return;
    const contact = data.contacts.find((c) => c._id === contactId);
    if (!contact) return;

    const meta = contactStatusMeta[contact.status] || contactStatusMeta.pending;

    const bodyHtml = `
        <div class="contact-detail-view">
            <div class="contact-detail-header">
                <div class="contact-detail-avatar">
                    <i class="fa-solid fa-user"></i>
                </div>
                <div>
                    <h3>${escapeHtml(contact.fullName)}</h3>
                    <span class="badge ${contact.status}" style="background:${meta.tint};color:${meta.color};">${meta.label}</span>
                </div>
            </div>

            <div class="contact-detail-info-grid">
                <div class="contact-detail-info-item">
                    <i class="fa-solid fa-envelope"></i>
                    <div>
                        <label>Email</label>
                        <span>${escapeHtml(contact.email)}</span>
                    </div>
                </div>
                <div class="contact-detail-info-item">
                    <i class="fa-solid fa-phone"></i>
                    <div>
                        <label>Số điện thoại</label>
                        <span>${escapeHtml(contact.phone || 'Chưa cung cấp')}</span>
                    </div>
                </div>
                <div class="contact-detail-info-item">
                    <i class="fa-solid fa-calendar"></i>
                    <div>
                        <label>Ngày gửi</label>
                        <span>${dateText(contact.createdAt)}</span>
                    </div>
                </div>
                <div class="contact-detail-info-item">
                    <i class="fa-solid fa-tag"></i>
                    <div>
                        <label>Chủ đề</label>
                        <span>${escapeHtml(contact.subject || 'Không có chủ đề')}</span>
                    </div>
                </div>
            </div>

            <div class="contact-detail-message">
                <label><i class="fa-solid fa-comment-dots"></i> Nội dung tin nhắn</label>
                <div class="message-content">${escapeHtml(contact.message)}</div>
            </div>

            <div class="contact-detail-actions">
                <label><i class="fa-solid fa-sliders"></i> Cập nhật trạng thái</label>
                <div class="contact-status-update">
                    <select id="contactDetailStatus">
                        <option value="pending" ${contact.status === 'pending' ? 'selected' : ''}>📥 Mới</option>
                        <option value="processing" ${contact.status === 'processing' ? 'selected' : ''}>⏳ Đang xử lý</option>
                        <option value="resolved" ${contact.status === 'resolved' ? 'selected' : ''}>✅ Đã phản hồi</option>
                    </select>
                    <button type="button" class="primary-action" onclick="submitContactStatus('${contact._id}')">
                        <i class="fa-solid fa-check"></i> Cập nhật
                    </button>
                </div>
            </div>
        </div>
    `;

    openAdminModal(`Chi tiết liên hệ - ${escapeHtml(contact.fullName)}`, bodyHtml);
}

async function submitContactStatus(contactId) {
    const status = document.getElementById('contactDetailStatus').value;
    try {
        await api(`/admin/contacts/${contactId}/status`, { method: 'PATCH', body: JSON.stringify({ status }) });
        showToast('Đã cập nhật trạng thái liên hệ.');
        closeAdminModal();
        loadContactManager();
    } catch (error) {
        showToast(error.message);
    }
}

// ===== END CONTACT MANAGER =====

function runWhenIdle(task) {
    if ('requestIdleCallback' in window) {
        requestIdleCallback(task, { timeout: 1500 });
        return;
    }
    setTimeout(task, 250);
}

async function bootAdmin() {
    state.currentView = pageFromPath();
    state.activities = loadJson('casaAdminActivities', []);
    loadNotificationPrefs();
    setDefaultDates();
    setupEvents();

    if (state.currentView === 'dashboard') {
        await loadDashboard();
    } else {
        try {
            await ensureAdminSession();
            document.querySelector('#authGate').hidden = true;
            setAdminSessionControls(true);
            switchAdminView(state.currentView, false);
        } catch {
            document.querySelector('#authGate').hidden = true;
            setAdminSessionControls(false);
            showToast('Không thể tạo phiên admin.');
        }
    }

    runWhenIdle(() => {
        initAdminSocket();
        fetchAdminNotifs();
    });
}

bootAdmin();
