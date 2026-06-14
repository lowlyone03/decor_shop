const API = '/api';
const GOONG_API_KEY = '36IPdPUqkRq9tXCslOSG10BrX5SkI837O2GiQx60';
const GOONG_AUTOCOMPLETE_ENDPOINT = 'https://rsapi.goong.io/Place/AutoComplete';
const CASA_CONTACT_EMAIL = 'nguyentrithuc2703205@gmail.com';
const CASA_COUPON_KEY = 'casaCouponCode';
const CASA_PENDING_VNPAY_ORDER_KEY = 'casaPendingVnpayOrderId';

function session() {
    return JSON.parse(localStorage.getItem('casaSession') || sessionStorage.getItem('casaSession') || 'null');
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
    if (!response.ok) throw new Error(data.message || 'Có lỗi xảy ra.');
    return data;
}

function money(value) {
    return Number(value || 0).toLocaleString('vi-VN') + 'đ';
}

function discountMoney(value) {
    const amount = Math.max(Number(value || 0), 0);
    return amount > 0 ? `-${money(amount)}` : money(0);
}

function imageOf(product) {
    return product.images?.find((item) => item.isPrimary)?.url || product.images?.[0]?.url || product.images?.[0] || '/images/banner1png.png';
}

function imagePerfAttrs(loading = 'lazy') {
    return `loading="${loading}" decoding="async"`;
}

function debounce(fn, delay = 200) {
    let timer = null;
    return (...args) => {
        clearTimeout(timer);
        timer = setTimeout(() => fn(...args), delay);
    };
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

function normalizeSearch(value) {
    return String(value || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/đ/g, 'd')
        .replace(/Đ/g, 'D')
        .toLowerCase();
}

function setLoading(container, text = 'Dang tai du lieu...') {
    if (!container) return;
    container.innerHTML = `<div class="ui-state loading-state"><span></span><p>${escapeHtml(text)}</p></div>`;
}

function fileToDataUrl(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}


function setError(container, text = 'Khong the tai du lieu. Vui long thu lai.') {
    if (!container) return;
    container.innerHTML = `<div class="ui-state error-state"><i class="fa-regular fa-circle-xmark"></i><p>${escapeHtml(text)}</p></div>`;
}

function blogUrl(blog) {
    return `/customers/blog-detail.html?slug=${encodeURIComponent(blog.slug || blog._id || '')}`;
}

function fallbackBlogs() {
    return [
        { title: '5 xu huong decor am cung len ngoi nam 2025', slug: 'xu-huong-decor-am-cung-2025', summary: 'Nhung gam mau, chat lieu va phong cach tao nen khong gian song am ap.', thumbnail: '/images/banner1png.png', content: 'Uu tien vat lieu tu nhien, den anh sang am va diem nhan thu cong de can nha co cam giac gan gui hon.' },
        { title: 'Phong cach Japandi la gi?', slug: 'phong-cach-japandi-la-gi', summary: 'Vi sao Japandi duoc ua chuong trong nha pho hien dai.', thumbnail: '/images/den_decor/01-den-ban-gom-aurum-beige.jpg', content: 'Japandi ket hop su toi gian cua Nhat Ban voi tinh am ap Bac Au, phu hop voi khong gian nho va can nhieu anh sang.' },
        { title: 'Cach giu cho khong gian nho luon gon gang', slug: 'khong-gian-nho-gon-gang', summary: 'Nhung meo decor giup nha nho dep va thoang hon.', thumbnail: '/images/ketrangtri_decor/ketrangtri01.jpg', content: 'Hay chon ke mo, hop luu tru cung tong mau va nhung mon decor co cong nang ro rang.' },
        { title: 'Meo chon den decor cho tung khong gian', slug: 'chon-den-decor-phu-hop', summary: 'Chon anh sang dung de can phong co chieu sau hon.', thumbnail: '/images/den_decor/04-den-ban-may-tre-boho-aura.jpg', content: 'Phong khach can nhieu lop sang, phong ngu nen dung anh sang diu va goc lam viec can den tap trung.' },
        { title: 'Cach phoi tranh treo tuong hai hoa', slug: 'phoi-tranh-treo-tuong-hai-hoa', summary: 'Nguyen tac phoi tranh, kich thuoc va mau sac.', thumbnail: '/images/tranhtreotuong_decor/tranhcanvas1.jpg', content: 'Bat dau bang mot tranh lon lam diem neo, sau do them cac khung nho co cung bang mau de bo cuc de nhin.' }
    ];
}

function calculateCouponDiscount(subTotal, promotion) {
    const total = Math.max(Number(subTotal || 0), 0);
    if (!promotion || total < Number(promotion.minOrderValue || 0)) return 0;
    if (promotion.discountType === 'percentage') return Math.min(Math.round(total * (Number(promotion.discountValue || 0) / 100)), total);
    return Math.min(Math.round(Number(promotion.discountValue || 0)), total);
}

function goongSessionToken() {
    if (window.crypto?.randomUUID) return window.crypto.randomUUID();
    return `goong-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function firstText(...values) {
    return values.find((value) => String(value || '').trim()) || '';
}

function parseGoongAddress(prediction = {}) {
    const description = String(prediction.description || '').trim();
    const compound = prediction.compound || prediction.more_compound || {};
    const parts = description.split(',').map((part) => part.trim()).filter(Boolean);
    const fromEnd = (offset) => parts[parts.length - offset] || '';

    return {
        street: description,
        ward: firstText(compound.commune, compound.ward, compound.commune_name, compound.ward_name, fromEnd(3)),
        district: firstText(compound.district, compound.district_name, fromEnd(2)),
        city: firstText(compound.province, compound.city, compound.province_name, compound.city_name, fromEnd(1))
    };
}

function setupGoongAddressAutocomplete(scope = document) {
    const fieldSet = new Set();
    const addField = (field) => {
        if (field) fieldSet.add(field);
    };

    if (scope instanceof Element && scope.matches('.goong-address-field')) addField(scope);
    scope.querySelectorAll?.('.goong-address-field').forEach(addField);
    scope.querySelectorAll?.('input[name="street"], input[name="address"], input[autocomplete="street-address"]').forEach((input) => {
        const field = input.closest('.goong-address-field') || input.closest('label') || input.parentElement;
        if (!field) return;
        field.classList.add('goong-address-field');
        if (!field.querySelector('.goong-suggestions')) {
            const dropdown = document.createElement('div');
            dropdown.className = 'goong-suggestions';
            dropdown.setAttribute('role', 'listbox');
            input.insertAdjacentElement('afterend', dropdown);
        }
        addField(field);
    });

    const fields = Array.from(fieldSet);

    fields.forEach((field) => {
        const hiddenBox = field.closest('.new-address-box.hidden');
        const input = field.querySelector('input[name="street"], input[name="address"]');
        const dropdown = field.querySelector('.goong-suggestions');
        if (hiddenBox || !input || !dropdown || input.dataset.goongReady) return;

        input.dataset.goongReady = 'true';
        let debounceTimer = null;
        let activeRequest = 0;
        let controller = null;
        let predictions = [];
        let sessionToken = goongSessionToken();

        const form = input.closest('form');
        const wardInput = form?.querySelector('input[name="ward"]');
        const districtInput = form?.querySelector('input[name="district"]');
        const cityInput = form?.querySelector('input[name="city"]');

        const hideDropdown = () => {
            dropdown.classList.remove('show');
            dropdown.innerHTML = '';
        };

        const showMessage = (message) => {
            dropdown.innerHTML = `<div class="goong-suggestion-empty">${escapeHtml(message)}</div>`;
            dropdown.classList.add('show');
        };

        const renderPredictions = (items) => {
            predictions = items;
            if (!items.length) {
                showMessage('Không tìm thấy địa chỉ phù hợp');
                return;
            }
            dropdown.innerHTML = items.map((item, index) => {
                const main = item.structured_formatting?.main_text || item.description || 'Địa chỉ';
                const secondary = item.structured_formatting?.secondary_text || item.description || '';
                return `
                    <button class="goong-suggestion-item" data-goong-index="${index}" type="button">
                        <span>${escapeHtml(main)}</span>
                        <small>${escapeHtml(secondary)}</small>
                    </button>
                `;
            }).join('');
            dropdown.classList.add('show');
        };

        const fillAddress = (prediction) => {
            const address = parseGoongAddress(prediction);
            activeRequest += 1;
            controller?.abort();
            input.value = address.street;
            if (wardInput && address.ward) wardInput.value = address.ward;
            if (districtInput && address.district) districtInput.value = address.district;
            if (cityInput && address.city) cityInput.value = address.city;
            hideDropdown();
            sessionToken = goongSessionToken();
        };

        const search = async () => {
            const keyword = input.value.trim();
            if (keyword.length < 3) {
                controller?.abort();
                hideDropdown();
                return;
            }

            const requestId = ++activeRequest;
            controller?.abort();
            controller = new AbortController();
            showMessage('Đang tìm địa chỉ...');

            const params = new URLSearchParams({
                api_key: GOONG_API_KEY,
                input: keyword,
                limit: '5',
                more_compound: 'true',
                sessiontoken: sessionToken
            });

            try {
                const response = await fetch(`${GOONG_AUTOCOMPLETE_ENDPOINT}?${params}`, { signal: controller.signal });
                const data = await response.json();
                if (requestId !== activeRequest) return;
                if (!response.ok || data.status === 'REQUEST_DENIED') {
                    showMessage('Không thể tải gợi ý địa chỉ');
                    return;
                }
                renderPredictions(Array.isArray(data.predictions) ? data.predictions : []);
            } catch (error) {
                if (error.name === 'AbortError' || requestId !== activeRequest) return;
                showMessage('Không thể tải gợi ý địa chỉ');
            }
        };

        input.addEventListener('input', () => {
            clearTimeout(debounceTimer);
            if (input.value.trim().length < 3) {
                controller?.abort();
                hideDropdown();
                return;
            }
            debounceTimer = setTimeout(search, 300);
        });

        input.addEventListener('keydown', (event) => {
            if (event.key === 'Escape') hideDropdown();
        });

        dropdown.addEventListener('mousedown', (event) => {
            const item = event.target.closest('[data-goong-index]');
            if (!item) return;
            event.preventDefault();
            const selected = predictions[Number(item.dataset.goongIndex)];
            if (selected) fillAddress(selected);
        });
    });

    if (!document.body.dataset.goongAddressOutsideReady) {
        document.body.dataset.goongAddressOutsideReady = 'true';
        document.addEventListener('click', (event) => {
            if (event.target.closest('.goong-address-field')) return;
            document.querySelectorAll('.goong-suggestions.show').forEach((node) => {
                node.classList.remove('show');
                node.innerHTML = '';
            });
        });
    }
}

function orderStatusText(order) {
    const map = {
        pending: 'Chờ xác nhận',
        processing: 'Đang xử lý',
        shipping: 'Đang giao',
        completed: 'Đã giao',
        cancellation_requested: 'Yêu cầu hủy',
        cancelled: 'Đã hủy',
        return_requested: 'Yêu cầu trả hàng',
        refunding: 'Đang hoàn tiền',
        refunded: 'Đã hoàn tiền'
    };
    return map[order.orderStatus] || 'Đang xử lý';
}

function orderStatusClass(order) {
    const status = order.orderStatus;
    if (status === 'completed') return 'delivered';
    if (status === 'shipping') return 'shipping';
    if (status === 'processing') return 'packing';
    if (['cancellation_requested', 'cancelled'].includes(status)) return 'cancelled';
    if (['return_requested', 'refunding', 'refunded'].includes(status)) return 'returned';
    return 'pending';
}

function orderCodeView(order) {
    const raw = String(order?.orderCode || '');
    if (raw) return raw;
    const date = order?.createdAt ? new Date(order.createdAt) : new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `CSDC${year}${month}${day}`;
}

function dateCode(dateValue) {
    const date = dateValue ? new Date(dateValue) : new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}${month}${day}`;
}

function invoiceCodeView(order) {
    const seed = parseInt(String(order?._id || '').slice(-4), 16);
    const sequence = Number.isFinite(seed) ? (seed % 999) + 1 : 1;
    return `HD${dateCode(order?.createdAt)}-${String(sequence).padStart(3, '0')}`;
}

function paymentMethodText(order) {
    const methods = {
        cod: 'Thanh toán khi nhận hàng (COD)',
        bank_transfer: 'Chuyển khoản ngân hàng',
        vnpay: 'Thanh toán qua VNPay'
    };
    return methods[order?.paymentMethod] || 'Chuyển khoản ngân hàng';
}

function paymentShortText(order) {
    const methods = {
        cod: 'COD',
        bank_transfer: 'Chuyển khoản',
        vnpay: 'VNPay'
    };
    return methods[order?.paymentMethod] || 'Chuyển khoản';
}

function paymentInstructionText(order) {
    if (order?.paymentMethod === 'bank_transfer') {
        return '<p>Ngân hàng: Vietcombank</p><p>Số tài khoản: 0011004336881795</p><p>Chủ tài khoản: CT TNHH CASA DECOR</p>';
    }
    if (order?.paymentMethod === 'vnpay') {
        return '<p>Thanh toán qua cổng VNPay Sandbox. Hệ thống sẽ tự cập nhật trạng thái sau khi giao dịch thành công.</p>';
    }
    return '<p>Thanh toán bằng tiền mặt khi nhận hàng.</p>';
}

function paymentStatusText(order) {
    return order?.paymentStatus === 'paid' ? 'Đã thanh toán' : order?.paymentStatus === 'refunded' ? 'Đã hoàn tiền' : 'Chưa thanh toán';
}

function canPayVnpayAgain(order) {
    return order?.paymentMethod === 'vnpay'
        && order?.paymentStatus === 'unpaid'
        && !['cancelled', 'return_requested', 'refunding', 'refunded'].includes(order?.orderStatus);
}

async function payVnpayOrder(orderId, button) {
    try {
        if (button) button.disabled = true;
        const { paymentUrl } = await api(`/orders/${orderId}/vnpay-payment`, { method: 'POST' });
        if (!paymentUrl) throw new Error('Không thể tạo liên kết thanh toán VNPay.');
        sessionStorage.setItem(CASA_PENDING_VNPAY_ORDER_KEY, orderId);
        toast('Đang chuyển sang VNPay');
        location.href = paymentUrl;
    } catch (error) {
        if (button) button.disabled = false;
        toast(error.message || 'Không thể thanh toán lại VNPay.');
    }
}

function shippingAddressText(address = {}) {
    return [address.address, address.ward, address.district, address.city].filter(Boolean).join(', ');
}

function qs(name) {
    return new URLSearchParams(location.search).get(name);
}

function casaLogoSvg() {
    return `
        <svg viewBox="0 0 120 120" role="img" aria-label="Casa Decor">
            <path class="logo-line outer" d="M20 101V48c0-4 1-6 4-9L57 8c3-3 7-3 10 0l32 31c3 3 5 7 5 12"/>
            <path class="logo-line base" d="M20 101h86V70"/>
            <path class="logo-line inner" d="M44 91V64c0-8 3-14 9-20l16-15c7-7 17-7 24 0l16 15c6 6 9 12 9 20v12c0 14-11 25-25 25H54c-6 0-10-4-10-10Z"/>
            <path class="logo-line stem" d="M94 49c13-3 22-14 21-28"/>
            <path class="logo-fill leaf leaf-a" d="M102 45c-10 1-18-4-22-13 10-1 18 4 22 13Z"/>
            <path class="logo-fill leaf leaf-b" d="M111 57c-10 3-19-1-25-9 10-3 19 1 25 9Z"/>
            <path class="logo-fill leaf leaf-c" d="M114 30c-1 11-8 19-18 22 1-11 8-19 18-22Z"/>
        </svg>
    `;
}

function hydrateCasaLogos() {
    document.querySelectorAll('.logo-mark').forEach((mark) => {
        mark.innerHTML = casaLogoSvg();
    });
}

function toast(message) {
    let node = document.querySelector('.toast');
    if (!node) {
        node = document.createElement('div');
        node.className = 'toast';
        document.body.appendChild(node);
    }
    node.textContent = message;
    node.classList.add('show');
    setTimeout(() => node.classList.remove('show'), 1800);
}

function actionToast({ type = 'cart', title, message, href, label, icon }) {
    let node = document.querySelector('.action-toast');
    if (!node) {
        node = document.createElement('div');
        node.className = 'action-toast';
        document.body.appendChild(node);
    }
    clearTimeout(node.hideTimer);
    clearTimeout(node.redirectTimer);
    node.className = `action-toast ${type}`;
    node.innerHTML = `
        <button class="action-toast-close" type="button" aria-label="Đóng thông báo"><i class="fa-solid fa-xmark"></i></button>
        <div class="action-toast-icon"><i class="${icon || 'fa-solid fa-circle-check'}"></i></div>
        <div class="action-toast-body">
            <b>${title}</b>
            <span>${message}</span>
            <a href="${href}">${label}</a>
        </div>
        <div class="action-toast-progress"></div>
    `;
    node.classList.add('show');
    node.querySelector('.action-toast-close')?.addEventListener('click', () => {
        clearTimeout(node.hideTimer);
        clearTimeout(node.redirectTimer);
        node.classList.remove('show');
    }, { once: true });
    node.hideTimer = setTimeout(() => node.classList.remove('show'), 2600);
    node.redirectTimer = setTimeout(() => {
        if (!location.pathname.endsWith(href.split('/').pop())) {
            location.href = href;
        }
    }, 2600);
}

function cartToast(productName) {
    actionToast({
        type: 'cart',
        title: 'Đã thêm vào giỏ hàng',
        message: `${productName || 'Sản phẩm'} đã được thêm thành công.`,
        href: '/customers/cart.html',
        label: 'Xem giỏ hàng',
        icon: 'fa-solid fa-cart-shopping'
    });
}

function wishlistToast(productName) {
    actionToast({
        type: 'wishlist',
        title: 'Đã thêm vào yêu thích',
        message: `${productName || 'Sản phẩm'} đã được lưu vào danh sách yêu thích.`,
        href: '/customers/wishlist.html',
        label: 'Xem yêu thích',
        icon: 'fa-regular fa-heart'
    });
}

function requireLogin() {
    if (!session()) {
        location.href = '/customers/login.html';
        return false;
    }
    return true;
}

function productCard(product) {
    const hasSale = product.salePrice && product.salePrice < product.price;
    const discount = hasSale ? Math.round((1 - product.salePrice / product.price) * 100) : 0;
    return `
        <article class="pcard shop-card">
            <div class="pimg">
                <a href="/customers/product-detail.html?slug=${product.slug}" aria-label="${product.name}">
                    <img src="${imageOf(product)}" alt="${product.name}" ${imagePerfAttrs()}>
                </a>
                ${hasSale ? `<span class="sale-badge">-${discount}%</span>` : ''}
                <button class="hrt js-wish" data-id="${product._id}" data-name="${product.name}" type="button"><i class="fa-regular fa-heart"></i></button>
                <button class="quick-btn js-quick-view" data-slug="${product.slug}" type="button"><i class="fa-regular fa-eye"></i> Xem nhanh</button>
            </div>
            <div class="pbody">
                <h3 title="${product.name}">${product.name}</h3>
                <div class="prow"><strong>${money(product.salePrice || product.price)}</strong><span><i class="fa-solid fa-star"></i> 5.0 <em>(${product.numReviews || 0})</em></span></div>
                <button class="padd js-add-cart" data-id="${product._id}" data-name="${product.name}" type="button">Thêm vào giỏ <i class="fa-solid fa-cart-shopping"></i></button>
            </div>
        </article>
    `;
}

async function openQuickView(slug) {
    const previousFocus = document.activeElement;
    const { product } = await api(`/products/${slug}`);
    let modal = document.querySelector('#quickViewModal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'quickViewModal';
        modal.className = 'quick-view-modal';
        document.body.appendChild(modal);
    }
    modal.innerHTML = `
        <div class="quick-view-backdrop" data-close-quick></div>
        <article class="quick-view-card">
            <button class="quick-close" data-close-quick type="button"><i class="fa-solid fa-xmark"></i></button>
            <div class="quick-image"><img src="${imageOf(product)}" alt="${product.name}" decoding="async"></div>
            <div class="quick-info">
                <small>${product.category?.name || 'Casa Decor'}</small>
                <h2>${product.name}</h2>
                <div class="detail-rating"><i class="fa-solid fa-star"></i> 5.0 (${product.numReviews || 0} đánh giá)</div>
                <strong class="quick-price">${money(product.salePrice || product.price)}</strong>
                <p>${product.description || product.shortDescription || 'Sản phẩm decor được tuyển chọn cho không gian sống ấm áp, tinh tế và dễ phối với nhiều phong cách nội thất.'}</p>
                <dl>
                    <dt>Chất liệu</dt><dd>${product.material || '-'}</dd>
                    <dt>Kích thước</dt><dd>${product.dimensions || '-'}</dd>
                    <dt>Màu sắc</dt><dd>${product.color || '-'}</dd>
                    <dt>Phong cách</dt><dd>${product.style || '-'}</dd>
                    <dt>Tồn kho</dt><dd>${product.stock ?? '-'}</dd>
                </dl>
                <div class="quick-actions">
                    <button class="hbtn js-add-cart" data-id="${product._id}" data-name="${product.name}" type="button"><i class="fa-solid fa-cart-shopping"></i> Thêm vào giỏ</button>
                    <a class="padd" href="/customers/product-detail.html?slug=${product.slug}">Xem chi tiết</a>
                </div>
            </div>
        </article>
    `;
    modal.classList.add('show');
    modal.querySelector('.quick-close')?.focus();
    const onKeydown = (event) => {
        if (!modal.classList.contains('show')) {
            document.removeEventListener('keydown', onKeydown);
            return;
        }
        if (event.key === 'Escape') {
            modal.classList.remove('show');
            previousFocus?.focus?.();
            document.removeEventListener('keydown', onKeydown);
            return;
        }
        if (event.key !== 'Tab') return;
        const focusables = Array.from(modal.querySelectorAll('a, button, input, select, textarea, [tabindex]:not([tabindex="-1"])')).filter((node) => !node.disabled);
        if (!focusables.length) return;
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        if (event.shiftKey && document.activeElement === first) {
            event.preventDefault();
            last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
            event.preventDefault();
            first.focus();
        }
    };
    document.addEventListener('keydown', onKeydown);
}

function productPromoTile() {
    return `
        <aside class="shop-promo-tile">
            <div>
                <small>Ưu đãi đặc biệt</small>
                <strong>20%</strong>
                <span>cho bộ sưu tập đèn mới</span>
                <a href="/customers/promotions.html">Xem ngay</a>
            </div>
            <img src="/images/den_decor/01-den-ban-gom-aurum-beige.jpg" alt="">
        </aside>
    `;
}

async function loadShell() {
    hydrateCasaLogos();
    const userSlot = document.querySelector('[data-user-slot]');
    if (userSlot) {
        const current = session();
        const cartIcons = document.querySelector('.hd-icons');
        if (cartIcons) cartIcons.style.display = 'none'; // Hide the old static icons

        if (current) {
            userSlot.innerHTML = `
                <div class="user-nav">
                    <a href="/customers/cart.html" aria-label="Giỏ hàng">
                        <i class="fa-solid fa-cart-shopping"></i>
                        <span class="cbadge" data-cart-count>0</span>
                    </a>
                    <a href="/customers/wishlist.html" aria-label="Yêu thích">
                        <i class="fa-regular fa-heart"></i>
                        <span class="cbadge" data-wish-count>0</span>
                    </a>
                    <div class="notif-wrapper" style="position: relative;">
                        <a href="#" aria-label="Thông báo" id="btnToggleNotif">
                            <i class="fa-regular fa-bell"></i>
                            <span class="cbadge" data-notif-count>0</span>
                        </a>
                        <div id="notifDropdown" class="notif-dropdown" hidden>
                            <div class="notif-header">
                                <strong>Thông báo</strong>
                                <button type="button" id="btnReadAllNotif" style="background:none;border:none;color:var(--primary);cursor:pointer;font-size:0.85rem;">Đã đọc hết</button>
                            </div>
                            <div class="notif-list" id="notifList"></div>
                        </div>
                    </div>
                    <a href="/customers/profile.html" class="unav-user">
                        <img src="${current.user.avatar || 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=40&q=80'}" alt="${current.user.name}">
                        <span>${current.user.name}</span>
                    </a>
                    <button class="unav-logout" data-logout title="Đăng xuất" type="button">
                        <i class="fa-solid fa-right-from-bracket"></i>
                    </button>
                </div>
            `;
            if (current.user?.role === 'admin' || current.user?.role === 'staff') {
                const label = current.user?.role === 'staff' ? 'Nhân viên' : 'Admin';
                userSlot.querySelector('.user-nav')?.insertAdjacentHTML('afterbegin', `<a href="/management/index.html" class="unav-admin"><i class="fa-solid fa-gauge-high"></i><span>${label}</span></a>`);
            }
        } else {
            userSlot.innerHTML = `
                <div class="user-nav guest-nav">
                    <a href="/customers/cart.html" class="unav-cart" aria-label="Giỏ hàng">
                        <i class="fa-solid fa-cart-shopping"></i>
                        <span class="cbadge" data-cart-count>0</span>
                    </a>
                    <div class="auth-cta">
                        <a href="/customers/login.html" class="unav-login"><i class="fa-regular fa-user"></i><span>Đăng nhập</span></a>
                        <a href="/customers/register.html" class="unav-register">Đăng ký</a>
                    </div>
                </div>
            `;
        }
    }
    setupMobileNav();
    setupMiniCartShell();
    await updateHeaderCounts();
    document.addEventListener('click', async (event) => {
        const logout = event.target.closest('[data-logout]');
        if (logout) {
            localStorage.removeItem('casaSession');
            sessionStorage.removeItem('casaSession');
            location.href = '/customers/index.html';
        }
        const add = event.target.closest('.js-add-cart');
        if (add) {
            event.preventDefault();
            if (!requireLogin()) return;
            await api('/cart/items', { method: 'POST', body: JSON.stringify({ productId: add.dataset.id, quantity: 1 }) });
            const productName = add.dataset.name || add.closest('.pcard, .quick-view-card')?.querySelector('h3, h2')?.textContent?.trim();
            cartToast(productName);
            playCustomerTing();
            await updateHeaderCounts();
        }
        const wish = event.target.closest('.js-wish');
        if (wish) {
            event.preventDefault();
            if (!requireLogin()) return;
            await api(`/wishlist/${wish.dataset.id}`, { method: 'POST' });
            const productName = wish.dataset.name || wish.closest('.pcard, .quick-view-card, .detail-grid')?.querySelector('h3, h2, h1')?.textContent?.trim();
            wishlistToast(productName);
            playCustomerTing();
            await updateHeaderCounts();
        }
        const quick = event.target.closest('.js-quick-view');
        if (quick) {
            event.preventDefault();
            await openQuickView(quick.dataset.slug);
        }
        if (event.target.closest('[data-close-quick]')) {
            document.querySelector('#quickViewModal')?.classList.remove('show');
        }
        const couponButton = event.target.closest('.coupon-copy');
        if (couponButton) {
            const code = couponButton.dataset.code;
            if (code) sessionStorage.setItem(CASA_COUPON_KEY, code);
            toast(code ? `Da luu ma ${code}` : 'Uu dai tu dong');
            location.href = '/customers/cart.html?step=checkout';
        }
        
        // Handle Notification Click
        const toggleNotif = event.target.closest('#btnToggleNotif');
        if (toggleNotif) {
            event.preventDefault();
            const drop = document.getElementById('notifDropdown');
            if (drop) {
                drop.hidden = !drop.hidden;
                if (!drop.hidden) fetchNotifications();
            }
        } else if (!event.target.closest('#notifDropdown')) {
            const drop = document.getElementById('notifDropdown');
            if (drop) drop.hidden = true;
        }

        const readAll = event.target.closest('#btnReadAllNotif');
        if (readAll) {
            event.preventDefault();
            await api('/notifications/read-all', { method: 'PATCH' });
            fetchNotifications();
        }

        const notifItem = event.target.closest('.notif-item');
        if (notifItem) {
            event.preventDefault();
            await api(`/notifications/${notifItem.dataset.id}/read`, { method: 'PATCH' });
            if (notifItem.dataset.link) location.href = notifItem.dataset.link;
        }
    });

    // Inject Notif Styles
    if (!document.getElementById('notifStyles')) {
        const style = document.createElement('style');
        style.id = 'notifStyles';
        style.innerHTML = `
            .notif-dropdown { position: absolute; top: 120%; right: -50px; width: 320px; background: #fff; box-shadow: 0 10px 30px rgba(0,0,0,0.1); border-radius: 12px; z-index: 1000; border: 1px solid #eee; overflow: hidden; }
            .notif-header { display: flex; justify-content: space-between; align-items: center; padding: 12px 16px; border-bottom: 1px solid #eee; background: #fafafa; }
            .notif-list { max-height: 350px; overflow-y: auto; }
            .notif-item { display: block; padding: 12px 16px; border-bottom: 1px solid #eee; text-decoration: none; color: inherit; transition: background 0.2s; text-align: left; }
            .notif-item:hover { background: #f9f9f9; }
            .notif-item.unread { background: #f0f7ff; }
            .notif-item h5 { margin: 0 0 4px 0; font-size: 0.9rem; color: #222; }
            .notif-item p { margin: 0; font-size: 0.8rem; color: #666; line-height: 1.4; }
            .notif-item small { display: block; margin-top: 6px; font-size: 0.75rem; color: #999; }
        `;
        document.head.appendChild(style);
    }
    initCustomerSocket();
}

async function fetchNotifications() {
    try {
        const res = await api('/notifications');
        const countSpan = document.querySelector('[data-notif-count]');
        if (countSpan) countSpan.textContent = res.unreadCount;
        
        const list = document.getElementById('notifList');
        if (list) {
            if (!res.notifications.length) {
                list.innerHTML = '<div style="padding: 20px; text-align: center; color: #999; font-size: 0.9rem;">Bạn chưa có thông báo nào.</div>';
                return;
            }
            list.innerHTML = res.notifications.map(n => `
                <a href="${n.link || '#'}" class="notif-item ${n.isRead ? '' : 'unread'}" data-id="${n._id}" data-link="${n.link || ''}">
                    <h5>${escapeHtml(n.title)}</h5>
                    <p>${escapeHtml(n.message)}</p>
                    <small>${new Date(n.createdAt).toLocaleString('vi-VN')}</small>
                </a>
            `).join('');
        }
    } catch (e) {
        console.error(e);
        const list = document.getElementById('notifList');
        if (list) {
            list.innerHTML = '<div style="padding: 20px; text-align: center; color: #b45309; font-size: 0.9rem;">Không thể tải thông báo.</div>';
        }
    }
}

function initCustomerSocket() {
    const current = session();
    if (!current) return;
    const script = document.createElement('script');
    script.src = '/socket.io/socket.io.js';
    script.onload = () => {
        const socket = io();
        socket.emit('join_user_room', current.user._id);
        socket.on('customer_notification', (notif) => {
            playCustomerTing();
            toast(`🔔 ${notif.title}: ${notif.message}`);
            fetchNotifications(); // Auto refresh
        });
        socket.on('cart_updated', (cartCount) => {
            const cartBadges = document.querySelectorAll('[data-cart-count]');
            cartBadges.forEach((node) => node.textContent = cartCount);
            if (window.location.pathname.includes('/cart.html')) {
                if (typeof loadCart === 'function') loadCart();
            }
        });
        socket.on('product_unavailable', (data) => {
            // Check if product was in minicart or cart
            api('/cart').then(res => {
                const oldCartCount = parseInt(document.querySelector('[data-cart-count]')?.textContent || 0);
                const newCartCount = (res.cart?.items || []).reduce((sum, item) => sum + Number(item.quantity || 0), 0);
                if (oldCartCount !== newCartCount) {
                    playCustomerTing();
                    toast(`🔔 Sản phẩm "${data.productName}" đã ngừng kinh doanh và được tự động gỡ khỏi giỏ hàng.`);
                    updateHeaderCounts();
                    if (window.location.pathname.includes('/cart.html')) {
                        if (typeof loadCart === 'function') loadCart();
                    }
                }
            }).catch(console.error);
        });
        socket.on('customer_contact_reply', (payload) => {
            playCustomerTing();
            const title = payload?.notification?.title || 'Casa Decor da phan hoi';
            toast(title);
            fetchNotifications();
            if (document.getElementById('supportTicketList')) {
                loadSupportTickets().catch(console.error);
            }
        });
        socket.on('customer_contact_updated', () => {
            if (document.getElementById('supportTicketList')) {
                loadSupportTickets().catch(console.error);
            }
        });
    };
    document.head.appendChild(script);
}

let sharedAudioCtx;
function playCustomerTing() {
    try {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        if (!AudioContext) return;
        
        if (!sharedAudioCtx) {
            sharedAudioCtx = new AudioContext();
        }
        if (sharedAudioCtx.state === 'suspended') {
            sharedAudioCtx.resume();
        }

        const osc = sharedAudioCtx.createOscillator();
        const gain = sharedAudioCtx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(1046.50, sharedAudioCtx.currentTime); // C6 - nốt cao, nhẹ
        gain.gain.setValueAtTime(0, sharedAudioCtx.currentTime);
        gain.gain.linearRampToValueAtTime(0.3, sharedAudioCtx.currentTime + 0.05);
        gain.gain.exponentialRampToValueAtTime(0.01, sharedAudioCtx.currentTime + 0.8);
        osc.connect(gain);
        gain.connect(sharedAudioCtx.destination);
        osc.start();
        osc.stop(sharedAudioCtx.currentTime + 0.8);
    } catch (e) {
        console.error("Audio error:", e);
    }
}

function setupMobileNav() {
    document.querySelectorAll('.hd-inner, .page-header').forEach((header) => {
        const nav = header.querySelector('.nav');
        if (!nav || header.querySelector('.nav-toggle')) return;
        const button = document.createElement('button');
        button.className = 'nav-toggle';
        button.type = 'button';
        button.setAttribute('aria-label', 'Menu');
        button.innerHTML = '<i class="fa-solid fa-bars"></i>';
        nav.insertAdjacentElement('beforebegin', button);
        button.addEventListener('click', (event) => {
            event.stopPropagation();
            nav.classList.toggle('open');
            button.classList.toggle('open');
        });
    });
    document.addEventListener('click', (event) => {
        if (event.target.closest('.nav, .nav-toggle')) return;
        document.querySelectorAll('.nav.open').forEach((nav) => nav.classList.remove('open'));
        document.querySelectorAll('.nav-toggle.open').forEach((button) => button.classList.remove('open'));
    });
}

function setupMiniCartShell() {
    document.querySelectorAll('a[href="/customers/cart.html"]').forEach((link) => {
        if (!link.querySelector('.fa-cart-shopping') || link.dataset.miniCartReady) return;
        link.dataset.miniCartReady = 'true';
        link.classList.add('mini-cart-trigger');
        const panel = document.createElement('div');
        panel.className = 'mini-cart-panel';
        panel.setAttribute('role', 'status');
        panel.innerHTML = '<p class="empty-state">Dang tai gio hang...</p>';
        link.insertAdjacentElement('afterend', panel);
    });
}

function renderMiniCart(cart) {
    const items = cart?.items || [];
    const subtotal = Number(cart?.subTotal || 0);
    const markup = items.length ? `
        <div class="mini-cart-items">
            ${items.slice(0, 3).map((item) => `
                <a href="/customers/products.html">
                    <img src="${item.image || '/images/banner1png.png'}" alt="">
                    <span><b>${escapeHtml(item.name)}</b><small>${item.quantity} x ${money(item.priceAtAdding)}</small></span>
                </a>
            `).join('')}
        </div>
        ${items.length > 3 ? `<p class="mini-cart-more">+${items.length - 3} san pham khac</p>` : ''}
        <div class="mini-cart-total"><span>Tam tinh</span><b>${money(subtotal)}</b></div>
        <a class="mini-cart-checkout" href="/customers/cart.html?step=checkout">Thanh toan</a>
    ` : '<p class="empty-state">Gio hang dang trong.</p><a class="mini-cart-checkout" href="/customers/products.html">Mua sam</a>';
    document.querySelectorAll('.mini-cart-panel').forEach((panel) => {
        panel.innerHTML = markup;
    });
}

function setupCustomerSearch() {
    document.querySelectorAll('.srch').forEach((box) => {
        const input = box.querySelector('input');
        const icon = box.querySelector('i');
        if (!input || input.dataset.searchReady) return;
        input.dataset.searchReady = 'true';
        const isBlogSearch = document.body.classList.contains('blog-page') || /bai|blog/i.test(input.placeholder || '');
        const dropdown = document.createElement('div');
        dropdown.className = 'search-suggestions';
        dropdown.setAttribute('role', 'listbox');
        box.appendChild(dropdown);
        const useSuggestions = !(document.body.classList.contains('products-page') && input.id === 'headerSearch');
        let timer = null;
        let controller = null;
        const go = () => {
            const keyword = input.value.trim();
            location.href = isBlogSearch
                ? `/customers/blog.html${keyword ? `?q=${encodeURIComponent(keyword)}` : ''}`
                : `/customers/products.html${keyword ? `?q=${encodeURIComponent(keyword)}` : ''}`;
        };
        const hide = () => dropdown.classList.remove('show');
        const render = (items) => {
            if (!items.length) {
                dropdown.innerHTML = '<p>Khong co goi y phu hop.</p>';
                dropdown.classList.add('show');
                return;
            }
            dropdown.innerHTML = items.map((item) => `
                <a href="${isBlogSearch ? blogUrl(item) : `/customers/product-detail.html?slug=${encodeURIComponent(item.slug)}`}">
                    <img src="${item.thumbnail || imageOf(item)}" alt="">
                    <span><b>${escapeHtml(item.title || item.name)}</b><small>${escapeHtml(item.summary || item.shortDescription || '')}</small></span>
                </a>
            `).join('');
            dropdown.classList.add('show');
        };
        const suggest = () => {
            const keyword = input.value.trim();
            clearTimeout(timer);
            if (keyword.length < 2) {
                hide();
                return;
            }
            timer = setTimeout(async () => {
                try {
                    controller?.abort();
                    controller = new AbortController();
                    const data = isBlogSearch
                        ? await api('/blogs', { signal: controller.signal })
                        : await api(`/products?q=${encodeURIComponent(keyword)}&limit=5`, { signal: controller.signal });
                    const raw = isBlogSearch ? (data.blogs || []) : (data.products || []);
                    const lowered = keyword.toLowerCase();
                    const items = raw.filter((item) => `${item.title || item.name || ''} ${item.summary || item.shortDescription || ''}`.toLowerCase().includes(lowered)).slice(0, 5);
                    render(items);
                } catch (error) {
                    if (error.name !== 'AbortError') hide();
                }
            }, 180);
        };
        input.addEventListener('input', useSuggestions ? suggest : hide);
        input.addEventListener('keydown', (event) => {
            if (event.key === 'Enter') {
                event.preventDefault();
                go();
            }
            if (event.key === 'Escape') hide();
        });
        icon?.addEventListener('click', (event) => {
            event.preventDefault();
            go();
        });
        document.addEventListener('click', (event) => {
            if (!box.contains(event.target)) hide();
        });
    });
}

async function setupHeroSlideshow() {
    const hero = document.querySelector('.hero');
    if (!hero || hero.dataset.sliderReady) return;
    hero.dataset.sliderReady = 'true';
    const image = hero.querySelector('.hbg');
    const title = hero.querySelector('.hcontent h1');
    const desc = hero.querySelector('.hcontent p');
    const cta = hero.querySelector('.hcontent .hbtn');
    const dots = hero.querySelector('.hdots');
    const prev = hero.querySelector('.harr.hl');
    const next = hero.querySelector('.harr.hr');
    if (cta && (!cta.getAttribute('href') || cta.getAttribute('href') === '#')) cta.href = '/customers/products.html';
    let slides = [
        { image: image?.getAttribute('src') || '/images/banner1png.png', title: title?.innerHTML || '', description: desc?.textContent || '', link: '/customers/products.html', buttonText: cta?.textContent || 'Mua ngay' },
        { image: '/images/lohoa_decor/lohoa12.jpg', title: 'Lam moi<br><span>khong gian song</span>', description: 'Chon decor phu hop cho phong khach, phong ngu va goc lam viec.', link: '/customers/products.html', buttonText: 'Mua ngay' },
        { image: '/images/tranhtreotuong_decor/tranhcanvas1.jpg', title: 'Bo suu tap<br><span>tranh va den</span>', description: 'Nhung diem nhan nho giup can nha co chieu sau hon.', link: '/customers/promotions.html', buttonText: 'Xem uu dai' }
    ];
    try {
        const data = await api('/banners');
        const heroBanners = (data.banners || []).filter((banner) => banner.position === 'hero');
        if (heroBanners.length) slides = heroBanners.map((banner) => ({
            image: banner.image,
            title: escapeHtml(banner.title || 'Casa Decor'),
            description: banner.description || '',
            link: banner.link || '/customers/products.html',
            buttonText: banner.buttonText || 'Mua ngay'
        }));
    } catch {
        // Fallback slides stay usable when API is unavailable.
    }
    let index = 0;
    const renderDots = () => {
        if (!dots) return;
        dots.innerHTML = slides.map((_, dotIndex) => `<button class="d ${dotIndex === index ? 'on' : ''}" data-slide="${dotIndex}" type="button" aria-label="Slide ${dotIndex + 1}"></button>`).join('');
    };
    const show = (nextIndex) => {
        index = (nextIndex + slides.length) % slides.length;
        const slide = slides[index];
        if (image) image.src = slide.image || '/images/banner1png.png';
        if (title) title.innerHTML = slide.title || '';
        if (desc) desc.textContent = slide.description || '';
        if (cta) {
            cta.href = slide.link || '/customers/products.html';
            cta.textContent = slide.buttonText || 'Mua ngay';
        }
        renderDots();
    };
    prev?.addEventListener('click', () => show(index - 1));
    next?.addEventListener('click', () => show(index + 1));
    dots?.addEventListener('click', (event) => {
        const dot = event.target.closest('[data-slide]');
        if (dot) show(Number(dot.dataset.slide));
    });
    show(0);
    if (slides.length > 1) setInterval(() => show(index + 1), 6000);
}

function fileToDataUrl(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = () => reject(new Error('Không thể đọc file ảnh.'));
        reader.readAsDataURL(file);
    });
}

async function updateHeaderCounts() {
    const current = session();
    const cartBadges = document.querySelectorAll('[data-cart-count]');
    const wishBadges = document.querySelectorAll('[data-wish-count]');
    if (!current) {
        cartBadges.forEach((node) => node.textContent = '0');
        wishBadges.forEach((node) => node.textContent = '0');
        document.querySelectorAll('.mini-cart-panel').forEach((panel) => {
            panel.innerHTML = '<p class="empty-state">Dang nhap de xem gio hang.</p><a class="mini-cart-checkout" href="/customers/login.html">Dang nhap</a>';
        });
        return;
    }
    try {
        const [cartData, wishData] = await Promise.all([api('/cart'), api('/wishlist')]);
        const cartCount = (cartData.cart?.items || []).reduce((sum, item) => sum + Number(item.quantity || 0), 0);
        const wishCount = (wishData.products || []).length;
        cartBadges.forEach((node) => node.textContent = cartCount);
        wishBadges.forEach((node) => node.textContent = wishCount);
        renderMiniCart(cartData.cart);
        fetchNotifications();
    } catch {
        cartBadges.forEach((node) => node.textContent = '0');
        wishBadges.forEach((node) => node.textContent = '0');
        document.querySelectorAll('.mini-cart-panel').forEach((panel) => {
            panel.innerHTML = '<p class="empty-state">Khong the tai gio hang.</p>';
        });
    }
}

async function renderProducts() {
    const grid = document.querySelector('#productsGrid');
    if (!grid) return;
    const form = document.querySelector('#filtersForm');
    const pagination = document.querySelector('#productsPagination');
    const categoryHost = form.querySelector('[data-category-filter]');
    const headerSearch = document.querySelector('#headerSearch');
    const sortControl = document.querySelector('[form="filtersForm"][name="sort"]');
    const initialCategory = qs('category');
    const initialQuery = qs('q') || '';
    let productsController = null;
    const scheduleLoad = debounce(() => load(), 220);
    const resetPage = () => {
        if (form.elements.page) form.elements.page.value = '1';
    };
    const load = async () => {
        productsController?.abort();
        productsController = new AbortController();
        setLoading(grid, 'Dang tai san pham...');
        try {
        const params = new URLSearchParams();
        for (const [key, value] of new FormData(form).entries()) {
            if (String(value).trim()) params.set(key, value);
        }
        if (!categoryHost && initialCategory && !params.get('category')) params.set('category', initialCategory);
        const { products, total, page, pages } = await api(`/products?${params.toString()}`, { signal: productsController.signal });
        const pageSize = Number(params.get('limit') || 10);
        const start = total ? ((page - 1) * pageSize) + 1 : 0;
        const end = Math.min(page * pageSize, total);
        document.querySelector('#resultCount').textContent = total ? `Hiển thị ${start}-${end} trong tổng số ${total} sản phẩm` : 'Không tìm thấy sản phẩm phù hợp';
        const cards = products.map(productCard);
        if (cards.length > 7) cards.splice(7, 0, productPromoTile());
        grid.innerHTML = cards.join('') || '<p class="empty-state">Không tìm thấy sản phẩm phù hợp.</p>';
        if (pagination) {
            pagination.innerHTML = pages > 1
                ? Array.from({ length: pages }, (_, index) => `<button class="${page === index + 1 ? 'on' : ''}" data-page="${index + 1}" type="button">${index + 1}</button>`).join('')
                : '';
        }
        } catch (error) {
            if (error.name === 'AbortError') return;
            setError(grid, error.message || 'Khong the tai san pham.');
            if (pagination) pagination.innerHTML = '';
        }
    };
    const { categories } = await api('/categories');
    if (categoryHost) {
        categoryHost.innerHTML = `<label><input type="radio" name="category" value="" ${initialCategory ? '' : 'checked'}> Tất cả sản phẩm</label>` +
            categories.map((c) => `<label><input type="radio" name="category" value="${c.slug}" ${initialCategory === c.slug ? 'checked' : ''}> ${c.name}</label>`).join('');
    } else if (form.category?.tagName === 'SELECT') {
        form.category.innerHTML = '<option value="">Tất cả danh mục</option>' + categories.map((c) => `<option value="${c.slug}" ${initialCategory === c.slug ? 'selected' : ''}>${c.name}</option>`).join('');
    }
    if (headerSearch && form.q) {
        form.q.value = initialQuery;
        headerSearch.value = initialQuery;
        headerSearch.addEventListener('input', () => {
            form.q.value = headerSearch.value;
            resetPage();
            scheduleLoad();
        });
    }
    form.addEventListener('input', (event) => {
        if (!['number', 'search', 'text'].includes(event.target.type)) return;
        if (event.target.name !== 'page') resetPage();
        scheduleLoad();
    });
    form.addEventListener('change', (event) => {
        if (event.target.name !== 'page') resetPage();
        load();
    });
    sortControl?.addEventListener('change', () => {
        resetPage();
        load();
    });
    pagination?.addEventListener('click', (event) => {
        const button = event.target.closest('[data-page]');
        if (!button) return;
        form.elements.page.value = button.dataset.page;
        load();
        window.scrollTo({ top: document.querySelector('.shop-shell').offsetTop - 90, behavior: 'smooth' });
    });
    await load();
}

async function renderHomeProducts() {
    const grid = document.querySelector('body:not(.products-page) .products .pgrid');
    if (!grid) return;
    setLoading(grid, 'Dang tai san pham noi bat...');
    try {
        const { products } = await api('/products?featured=true&limit=6&sort=best_selling');
        let items = products || [];
        // Nếu chưa đủ 6 sản phẩm nổi bật, bổ sung từ sản phẩm bán chạy
        if (items.length < 6) {
            const existingIds = new Set(items.map(p => p._id));
            const { products: extra } = await api(`/products?limit=${6 - items.length}&sort=best_selling`);
            if (extra?.length) {
                for (const p of extra) {
                    if (!existingIds.has(p._id)) {
                        items.push(p);
                        existingIds.add(p._id);
                        if (items.length >= 6) break;
                    }
                }
            }
        }
        if (items.length) {
            grid.innerHTML = items.map(productCard).join('');
        } else {
            grid.innerHTML = '<p class="empty-state">Chua co san pham noi bat.</p>';
        }
    } catch (error) {
        setError(grid, error.message || 'Khong the tai san pham noi bat.');
    }
}

async function renderDetail() {
    const root = document.querySelector('#productDetail');
    if (!root) return;
    setLoading(root, 'Dang tai chi tiet san pham...');
    try {
    const { product, related, reviews } = await api(`/products/${qs('slug')}`);
    root.innerHTML = `
        <nav class="breadcrumb"><a href="/customers/index.html">Trang chu</a><span>/</span><a href="/customers/products.html">San pham</a><span>/</span><b>${escapeHtml(product.name)}</b></nav>
        <section class="detail-grid">
            <div class="detail-image"><img src="${imageOf(product)}" alt="${product.name}"></div>
            <div class="detail-info">
                <p class="crumb">${product.category.name}</p>
                <h1>${product.name}</h1>
                <div class="detail-rating"><i class="fa-solid fa-star"></i> 5.0 (${product.numReviews} đánh giá)</div>
                <p class="detail-price">${money(product.salePrice || product.price)}</p>
                <p>${product.description || product.shortDescription}</p>
                <dl><dt>Chất liệu</dt><dd>${product.material || '-'}</dd><dt>Kích thước</dt><dd>${product.dimensions || '-'}</dd><dt>Màu sắc</dt><dd>${product.color || '-'}</dd><dt>Phong cách</dt><dd>${product.style || '-'}</dd></dl>
                <button class="hbtn js-add-cart" data-id="${product._id}" data-name="${product.name}">Thêm vào giỏ</button>
                <button class="padd js-wish detail-wish" data-id="${product._id}" data-name="${product.name}">Yêu thích</button>
            </div>
        </section>
        <section><h2 class="page-subtitle">Sản phẩm liên quan</h2><div class="shop-grid">${related.map(productCard).join('')}</div></section>
        <section><h2 class="page-subtitle">Đánh giá</h2><div class="review-list">${reviews.map((r) => `
            <article class="tcard">
                <i class="fa-solid fa-quote-left qi"></i>
                <div class="tuser" style="margin-bottom: 12px; border-top: none; padding-top: 0; margin-top: 0;">
                    <div>
                        <b style="display: flex; align-items: center; gap: 8px;">
                            ${r.customer?.name || 'Khách hàng'} 
                            <span style="font-size: 0.75rem; background: #e8f5e9; color: #2e7d32; padding: 2px 8px; border-radius: 12px; font-weight: 600;"><i class="fa-solid fa-circle-check"></i> Đã mua hàng</span>
                        </b>
                        <small>${new Date(r.createdAt).toLocaleDateString('vi-VN')}</small>
                    </div>
                </div>
                <div class="tstars" style="margin-bottom: 8px;">${'★'.repeat(r.rating)}${'☆'.repeat(5 - r.rating)}</div>
                ${r.comment || ''}</p>
                ${(r.video && r.videoStatus !== 'hidden') ? `
                    <div class="review-video" style="margin-top: 12px;">
                        <video src="${r.video}" controls style="max-height: 200px; border-radius: 8px; border: 1px solid #eee;"></video>
                    </div>
                ` : ''}
                ${r.images && r.images.length ? `
                    <div class="review-images" style="display: flex; gap: 8px; margin-top: 12px; overflow-x: auto;">
                        ${r.images.map(img => `<img src="${img}" alt="Review image" style="width: 80px; height: 80px; object-fit: cover; border-radius: 8px; border: 1px solid #eee;">`).join('')}
                    </div>
                ` : ''}
            </article>`).join('') || '<p>Chưa có đánh giá.</p>'}</div></section>
    `;
    } catch (error) {
        setError(root, error.message || 'Khong the tai chi tiet san pham.');
    }
}

async function renderCart() {
    const root = document.querySelector('#cartRoot');
    if (!root || !requireLogin()) return;
    let step = qs('step') === 'checkout' ? 'checkout' : 'cart';
    let currentUser = null;
    let appliedCoupon = null;
    let pendingVnpayOrder = null;
    const localCheckoutTotals = (subTotal = 0) => {
        const safeSubTotal = Math.max(Number(subTotal || 0), 0);
        const shippingFee = safeSubTotal === 0 || safeSubTotal >= 1000000 ? 0 : 30000;
        const autoDiscount = safeSubTotal >= 1500000 ? 200000 : 0;
        const couponDiscount = calculateCouponDiscount(safeSubTotal, appliedCoupon);
        const discountAmount = Math.max(autoDiscount, couponDiscount);
        return {
            shippingFee,
            discountAmount,
            totalAmount: Math.max(safeSubTotal + shippingFee - discountAmount, 0)
        };
    };
    const validMoneyNumber = (value) => Number.isFinite(Number(value)) && Number(value) >= 0;
    const addressText = (address) => [address?.street, address?.ward, address?.district, address?.city].filter(Boolean).join(', ');
    const summarizeCart = (cart) => {
        const fallback = localCheckoutTotals(cart.subTotal);
        const shippingFee = validMoneyNumber(cart.shippingFee) ? Number(cart.shippingFee) : fallback.shippingFee;
        const discount = Math.max(validMoneyNumber(cart.discountAmount) ? Number(cart.discountAmount) : 0, fallback.discountAmount);
        const total = Math.max(Number(cart.subTotal || 0) + shippingFee - discount, 0);
        return {
            shippingFee,
            discount,
            total
        };
    };
    const stepMarkup = () => `
        <div class="checkout-steps">
            <span class="${step === 'cart' ? 'on' : ''}"><b>1</b><i class="fa-solid fa-cart-shopping"></i> Giỏ hàng</span>
            <span class="${step === 'checkout' ? 'on' : ''}"><b>2</b> Thanh toán</span>
            <span><b>3</b><i class="fa-regular fa-circle-check"></i> Hoàn tất</span>
        </div>
    `;
    const qtyControl = (item) => `
        <div class="qty-stepper">
            <button class="qty-btn" data-id="${item.product}" data-delta="-1" type="button">-</button>
            <input class="cart-qty" data-id="${item.product}" type="number" min="1" value="${item.quantity}">
            <button class="qty-btn" data-id="${item.product}" data-delta="1" type="button">+</button>
        </div>
    `;
    const summaryCard = (cart, submitLabel = 'Tiến hành thanh toán') => {
        const totals = summarizeCart(cart);
        return `
            <aside class="cart-summary">
                <h2>Tóm tắt đơn hàng</h2>
                <p class="sum-row"><span>Tạm tính</span><b>${money(cart.subTotal)}</b></p>
                <p class="sum-row"><span>Phí vận chuyển</span><b class="${totals.shippingFee ? '' : 'free'}">${totals.shippingFee ? money(totals.shippingFee) : 'Miễn phí'}</b></p>
                <p class="sum-row"><span>Giảm giá</span><b class="discount">${discountMoney(totals.discount)}</b></p>
                <div class="coupon-box">
                    <label>Ma giam gia</label>
                    <div>
                        <input name="couponCode" value="${appliedCoupon?.code || sessionStorage.getItem(CASA_COUPON_KEY) || ''}" placeholder="CASA10">
                        <button class="coupon-apply" type="button">Ap dung</button>
                    </div>
                    ${appliedCoupon ? `<small class="coupon-ok">Dang ap dung ${appliedCoupon.code}</small><button class="coupon-remove" type="button">Bo ma</button>` : '<small>Nhap ma tu trang khuyen mai neu co.</small>'}
                </div>
                <div class="sum-total"><span>Tổng tiền</span><strong>${money(totals.total)}</strong></div>
                ${step === 'cart'
                    ? `<button class="auth-submit checkout-next" ${cart.items?.length ? '' : 'disabled'} type="button">${submitLabel}</button>`
                    : `<button class="auth-submit order-submit" ${cart.items?.length ? '' : 'disabled'} type="submit"><i class="fa-solid fa-lock"></i> Đặt hàng</button>`}
                <div class="summary-trust"><span><i class="fa-solid fa-shield-heart"></i>Bảo mật</span><span><i class="fa-solid fa-truck-fast"></i>Freeship từ 1.000.000đ</span><span><i class="fa-solid fa-rotate-left"></i>Đổi trả 7 ngày</span></div>
            </aside>
        `;
    };
    const cartRows = (items) => items.map((item) => `
        <tr>
            <td><div class="cart-product"><img src="${item.image || '/images/banner1png.png'}" alt=""><div><b>${item.name}</b><small>Mã SP: ${String(item.product).slice(-6).toUpperCase()}</small></div></div></td>
            <td>${money(item.priceAtAdding)}</td>
            <td>${qtyControl(item)}</td>
            <td><strong>${money(item.itemTotal)}</strong></td>
            <td><button class="icon-danger cart-remove" data-id="${item.product}" type="button"><i class="fa-regular fa-trash-can"></i></button></td>
        </tr>
    `).join('');
    const compactItems = (items) => items.map((item) => `
        <article class="checkout-line-item">
            <img src="${item.image || '/images/banner1png.png'}" alt="">
            <div><b>${item.name}</b><small>${money(item.priceAtAdding)}</small></div>
            ${qtyControl(item)}
            <strong>${money(item.itemTotal)}</strong>
            <button class="icon-danger cart-remove" data-id="${item.product}" type="button"><i class="fa-regular fa-trash-can"></i></button>
        </article>
    `).join('');
    const pendingVnpayNotice = () => pendingVnpayOrder ? `
        <section class="order-success-banner payment-failed">
            <i class="fa-solid fa-wallet"></i>
            <div>
                <b>Đơn VNPay #${orderCodeView(pendingVnpayOrder)} chưa thanh toán</b>
                <p>Giỏ hàng đã được chuyển thành đơn để giữ sản phẩm. Nếu link VNPay cũ hết hạn, bạn có thể tạo link mới cho chính đơn này.</p>
                <button class="hbtn clay" data-vnpay-pay-again="${pendingVnpayOrder._id}" type="button"><i class="fa-solid fa-credit-card"></i> Thanh toán lại VNPay</button>
                <a class="hbtn outline" href="/customers/order-detail.html?id=${pendingVnpayOrder._id}">Xem chi tiết đơn</a>
            </div>
        </section>
    ` : '';
    const cartView = (cart) => `
        ${stepMarkup()}
        <section class="cart-title"><h1>Giỏ hàng của bạn</h1><p>Kiểm tra sản phẩm, tăng giảm số lượng rồi mới chuyển sang thanh toán.</p></section>
        ${pendingVnpayNotice()}
        <section class="cart-layout refined-cart">
            <div>
                <div class="cart-table-wrap">
                    <table class="cart-table">
                        <thead><tr><th>Sản phẩm</th><th>Đơn giá</th><th>Số lượng</th><th>Thành tiền</th><th></th></tr></thead>
                        <tbody>${cart.items?.length ? cartRows(cart.items) : `<tr><td colspan="5"><p class="empty-state">Giỏ hàng đang trống.</p></td></tr>`}</tbody>
                    </table>
                    <a class="continue-shopping" href="/customers/products.html"><i class="fa-solid fa-arrow-left"></i> Tiếp tục mua sắm</a>
                </div>
            </div>
            ${summaryCard(cart)}
        </section>
    `;
    const checkoutView = (cart) => {
        const addresses = currentUser?.addresses || [];
        const defaultIndex = Math.max(addresses.findIndex((item) => item.isDefault), 0);
        const hasAddress = addresses.length > 0;
        return `
            ${stepMarkup()}
            <form id="checkoutForm" class="checkout-panel">
                <section class="shipping-card">
                    <div class="section-head"><h2>Giỏ hàng</h2><button class="link-btn checkout-back" type="button"><i class="fa-solid fa-arrow-left"></i> Quay lại giỏ hàng</button></div>
                    <div class="checkout-edit-list">${cart.items?.length ? compactItems(cart.items) : '<p class="empty-state">Giỏ hàng đang trống.</p>'}</div>

                    <div class="section-head checkout-address-head"><h2>Thông tin giao hàng</h2>${hasAddress ? '<button class="link-btn add-new-address" type="button"><i class="fa-solid fa-plus"></i> Thêm địa chỉ mới</button>' : ''}</div>
                    ${hasAddress ? `<div class="saved-address-list">${addresses.map((address, index) => `
                        <label class="saved-address-card">
                            <input type="radio" name="addressMode" value="saved-${index}" ${index === defaultIndex ? 'checked' : ''}>
                            <span><b>${address.fullName || currentUser.name}</b><small>${address.phone || currentUser.phone || ''}</small><em>${addressText(address)}</em></span>
                        </label>
                    `).join('')}</div>` : '<p class="empty-state address-required-note">Bạn chưa có địa chỉ giao hàng. Vui lòng thêm địa chỉ mới để đặt hàng.</p>'}
                    <div class="new-address-box ${hasAddress ? 'hidden' : ''}">
                        <div class="checkout-fields">
                            <label>Họ và tên <em>*</em><input name="fullName" value="${currentUser?.name || ''}" placeholder="Nhập họ và tên" ${hasAddress ? '' : 'required'}></label>
                            <label>Số điện thoại <em>*</em><input name="phone" value="${currentUser?.phone || ''}" placeholder="Nhập số điện thoại" ${hasAddress ? '' : 'required'}></label>
                            <label class="full goong-address-field">Địa chỉ <em>*</em><input name="street" placeholder="Số nhà, tên đường" autocomplete="street-address" ${hasAddress ? '' : 'required'}><div class="goong-suggestions" role="listbox"></div></label>
                            <label>Phường / Xã <em>*</em><input name="ward" placeholder="Phường / Xã" ${hasAddress ? '' : 'required'}></label>
                            <label>Quận / Huyện <em>*</em><input name="district" placeholder="Quận / Huyện" ${hasAddress ? '' : 'required'}></label>
                            <label>Tỉnh / Thành phố <em>*</em><input name="city" placeholder="Tỉnh / Thành phố" ${hasAddress ? '' : 'required'}></label>
                        </div>
                    </div>
                    <label class="checkout-note">Ghi chú đơn hàng<textarea name="note" placeholder="Ví dụ: Giao hàng giờ hành chính, gọi trước khi giao..."></textarea></label>

                    <h2>Phương thức thanh toán</h2>
                    <div class="method-grid payment-grid">
                        <label class="method-card"><input type="radio" name="paymentMethod" value="cod" checked><i class="fa-regular fa-money-bill-1"></i><span><b>Thanh toán khi nhận hàng (COD)</b><small>Thanh toán bằng tiền mặt</small></span></label>
                        <label class="method-card"><input type="radio" name="paymentMethod" value="bank_transfer"><i class="fa-solid fa-building-columns"></i><span><b>Chuyển khoản ngân hàng</b><small>Quét mã QR hoặc chuyển khoản</small></span></label>
                        <label class="method-card"><input type="radio" name="paymentMethod" value="vnpay"><i class="fa-solid fa-wallet"></i><span><b>VNPay Sandbox</b><small>Thanh toán thử nghiệm qua cổng VNPay</small></span></label>
                    </div>
                </section>
                ${summaryCard(cart)}
            </form>
            <section class="checkout-trust trust"><div class="ti"><i class="fa-solid fa-truck-fast"></i><div><b>Miễn phí vận chuyển</b><small>Cho đơn hàng từ 1.000.000đ</small></div></div><div class="ti"><i class="fa-solid fa-rotate-left"></i><div><b>Đổi trả dễ dàng</b><small>Trong vòng 7 ngày</small></div></div><div class="ti"><i class="fa-solid fa-award"></i><div><b>Sản phẩm chất lượng</b><small>Cam kết chính hãng</small></div></div><div class="ti"><i class="fa-solid fa-headset"></i><div><b>Hỗ trợ 24/7</b><small>Hotline: 0336881795</small></div></div></section>
        `;
    };
    const load = async () => {
        setLoading(root);
        const [{ cart }, me] = await Promise.all([api('/cart'), api('/auth/me')]);
        currentUser = me.user;
        pendingVnpayOrder = null;
        const savedCoupon = sessionStorage.getItem(CASA_COUPON_KEY);
        appliedCoupon = null;
        if (savedCoupon && (cart.items || []).length) {
            try {
                const validated = await api('/promotions/validate', {
                    method: 'POST',
                    body: JSON.stringify({ code: savedCoupon, subTotal: cart.subTotal })
                });
                appliedCoupon = validated.promotion;
            } catch {
                sessionStorage.removeItem(CASA_COUPON_KEY);
            }
        }
        const pendingVnpayOrderId = sessionStorage.getItem(CASA_PENDING_VNPAY_ORDER_KEY);
        if (pendingVnpayOrderId && !(cart.items || []).length) {
            try {
                const { orders } = await api('/orders');
                const storedOrder = (orders || []).find((item) => item._id === pendingVnpayOrderId);
                if (canPayVnpayAgain(storedOrder)) {
                    pendingVnpayOrder = storedOrder;
                } else {
                    sessionStorage.removeItem(CASA_PENDING_VNPAY_ORDER_KEY);
                }
            } catch {
                pendingVnpayOrder = null;
            }
        }
        if (step === 'checkout' && !(cart.items || []).length) step = 'cart';
        root.innerHTML = step === 'checkout' ? checkoutView(cart) : cartView(cart);
        setupGoongAddressAutocomplete(root);
    };
    const syncVisibleCartQuantities = async () => {
        const inputs = Array.from(root.querySelectorAll('.cart-qty'));
        if (!inputs.length) return;
        await Promise.all(inputs.map((input) => api(`/cart/items/${input.dataset.id}`, {
            method: 'PATCH',
            body: JSON.stringify({ quantity: input.value })
        })));
    };
    root.addEventListener('change', async (e) => {
        if (e.target.matches('.cart-qty')) {
            await api(`/cart/items/${e.target.dataset.id}`, { method: 'PATCH', body: JSON.stringify({ quantity: e.target.value }) });
            load();
            updateHeaderCounts();
        }
        if (e.target.matches('[name="addressMode"]')) {
            const box = root.querySelector('.new-address-box');
            box?.classList.add('hidden');
            box?.querySelector('.goong-suggestions')?.classList.remove('show');
            box?.querySelectorAll('input').forEach((input) => {
                input.required = false;
            });
        }
    });
    root.addEventListener('click', async (e) => {
        const payAgainButton = e.target.closest('[data-vnpay-pay-again]');
        if (payAgainButton) {
            await payVnpayOrder(payAgainButton.dataset.vnpayPayAgain, payAgainButton);
            return;
        }
        const nextButton = e.target.closest('.checkout-next');
        if (nextButton) {
            step = 'checkout';
            history.replaceState(null, '', '/customers/cart.html?step=checkout');
            await load();
            window.scrollTo({ top: root.offsetTop - 90, behavior: 'smooth' });
            return;
        }
        const backButton = e.target.closest('.checkout-back');
        if (backButton) {
            step = 'cart';
            history.replaceState(null, '', '/customers/cart.html');
            await load();
            return;
        }
        const addAddress = e.target.closest('.add-new-address');
        if (addAddress) {
            const box = root.querySelector('.new-address-box');
            box?.classList.toggle('hidden');
            if (box?.classList.contains('hidden')) {
                box.querySelector('.goong-suggestions')?.classList.remove('show');
            }
            box?.querySelectorAll('input').forEach((input) => {
                input.required = !box.classList.contains('hidden');
            });
            root.querySelectorAll('[name="addressMode"]').forEach((input) => {
                input.checked = false;
            });
            setupGoongAddressAutocomplete(root);
            return;
        }
        const qtyButton = e.target.closest('.qty-btn');
        if (qtyButton) {
            const input = root.querySelector(`.cart-qty[data-id="${qtyButton.dataset.id}"]`);
            const next = Math.max(Number(input.value || 1) + Number(qtyButton.dataset.delta), 1);
            await api(`/cart/items/${qtyButton.dataset.id}`, { method: 'PATCH', body: JSON.stringify({ quantity: next }) });
            load();
            updateHeaderCounts();
            return;
        }
        const applyCoupon = e.target.closest('.coupon-apply');
        if (applyCoupon) {
            const input = applyCoupon.closest('.coupon-box')?.querySelector('[name="couponCode"]');
            const code = input?.value.trim().toUpperCase();
            if (!code) {
                toast('Vui long nhap ma giam gia');
                return;
            }
            try {
                const { cart } = await api('/cart');
                const validated = await api('/promotions/validate', {
                    method: 'POST',
                    body: JSON.stringify({ code, subTotal: cart.subTotal })
                });
                appliedCoupon = validated.promotion;
                sessionStorage.setItem(CASA_COUPON_KEY, appliedCoupon.code);
                toast('Da ap dung ma giam gia');
                await load();
            } catch (error) {
                toast(error.message || 'Ma giam gia khong hop le');
            }
            return;
        }
        const removeCoupon = e.target.closest('.coupon-remove');
        if (removeCoupon) {
            appliedCoupon = null;
            sessionStorage.removeItem(CASA_COUPON_KEY);
            await load();
            return;
        }
        const btn = e.target.closest('.cart-remove');
        if (btn) {
            if (!confirm('Xoa san pham nay khoi gio hang?')) return;
            await api(`/cart/items/${btn.dataset.id}`, { method: 'DELETE' });
            load();
            updateHeaderCounts();
        }
    });
    root.addEventListener('submit', async (e) => {
        if (e.target.id === 'checkoutForm') {
            e.preventDefault();
            const form = e.target;
            const submitButton = form.querySelector('.order-submit');
            if (submitButton?.disabled) return;
            if (submitButton) submitButton.disabled = true;
            const values = Object.fromEntries(new FormData(form));
            const addresses = currentUser?.addresses || [];
            const selected = values.addressMode?.startsWith('saved-')
                ? addresses[Number(values.addressMode.replace('saved-', ''))]
                : null;
            try {
                let shippingInfo;
                if (selected) {
                    shippingInfo = {
                        fullName: selected.fullName || currentUser.name,
                        phone: selected.phone || currentUser.phone,
                        address: selected.street,
                        ward: selected.ward,
                        district: selected.district,
                        city: selected.city
                    };
                } else {
                    shippingInfo = {
                        fullName: values.fullName,
                        phone: values.phone,
                        address: values.street,
                        ward: values.ward,
                        district: values.district,
                        city: values.city
                    };
                    const savedAddresses = [
                        ...addresses.map((address) => ({ ...address, isDefault: false })),
                        { fullName: values.fullName, phone: values.phone, street: values.street, ward: values.ward, district: values.district, city: values.city, isDefault: true }
                    ];
                    const profile = await api('/auth/profile', {
                        method: 'PATCH',
                        body: JSON.stringify({ name: currentUser.name, phone: currentUser.phone || values.phone, addresses: savedAddresses })
                    });
                    currentUser = profile.user;
                    const current = session();
                    if (current) {
                        current.user = profile.user;
                        const target = localStorage.getItem('casaSession') ? localStorage : sessionStorage;
                        target.setItem('casaSession', JSON.stringify(current));
                    }
                }
                await syncVisibleCartQuantities();
                const { order, paymentUrl } = await api('/orders', {
                    method: 'POST',
                    body: JSON.stringify({
                        shippingInfo,
                        paymentMethod: values.paymentMethod,
                        note: String(values.note || '').trim(),
                        promotionCode: appliedCoupon?.code || sessionStorage.getItem(CASA_COUPON_KEY) || ''
                    })
                });
                sessionStorage.removeItem(CASA_COUPON_KEY);
                if (paymentUrl) {
                    sessionStorage.setItem(CASA_PENDING_VNPAY_ORDER_KEY, order._id);
                    toast('Đang chuyển sang VNPay');
                    location.href = paymentUrl;
                    return;
                }
                toast('Đặt hàng thành công');
                location.href = `/customers/order-detail.html?id=${order._id}&placed=1`;
            } catch (error) {
                toast(error.message || 'Không thể đặt hàng');
                if (submitButton) submitButton.disabled = false;
                await load();
            }
        }
    });
    await load();
}

async function renderOrders() {
    const root = document.querySelector('#ordersRoot');
    if (!root || !requireLogin()) return;
    const { orders } = await api('/orders');
    const state = { orders: orders || [] };
    const orderPaging = { page: 1, pageSize: 5 };

    const orderRowPremium = (order) => {
        const ageInMs = Date.now() - new Date(order.createdAt).getTime();
        const ageInHours = ageInMs / (1000 * 60 * 60);
        const canCancel = order.orderStatus === 'pending' && ageInHours >= 24;

        const isDelivered = order.orderStatus === 'completed';
        const deliveredAt = order.deliveredAt ? new Date(order.deliveredAt).getTime() : new Date(order.updatedAt).getTime();
        const ageSinceDelivered = (Date.now() - deliveredAt) / (1000 * 60 * 60 * 24);
        const canReturn = isDelivered && ageSinceDelivered <= 3;
        const canRetryVnpay = canPayVnpayAgain(order);

        const items = order.items || [];
        const shipping = order.shippingInfo || {};
        const itemsText = items.map((i) => i.name).join(', ');
        const moreCount = Math.max(items.length - 3, 0);
        const visibleThumbs = moreCount > 0 ? items.slice(0, 3) : items.slice(0, 4);
        const displayCode = orderCodeView(order);
        const expectedDate = new Date(Date.now() + 86400000 * 2).toLocaleDateString('vi-VN');
        const statusNote = (() => {
            if (canRetryVnpay) return 'Đơn VNPay chưa thanh toán. Bạn có thể tạo lại link VNPay mà không cần đặt đơn mới.';
            if (order.orderStatus === 'pending') return 'Bạn có thể hủy đơn nếu sau 24 giờ Admin chưa xác nhận đơn.';
            if (order.orderStatus === 'shipping') return `Dự kiến giao: ${expectedDate}`;
            if (order.orderStatus === 'completed') return canReturn ? 'Bạn có thể yêu cầu hoàn trả trong vòng 3 ngày sau khi nhận hàng.' : 'Đơn hàng đã giao thành công.';
            if (order.orderStatus === 'cancelled') return `Đã hủy: ${new Date(order.updatedAt || order.createdAt).toLocaleDateString('vi-VN')}`;
            if (['return_requested', 'refunding'].includes(order.orderStatus)) return 'Yêu cầu hoàn trả đang được xử lý.';
            if (order.orderStatus === 'refunded') return 'Đơn hàng đã được hoàn tiền thành công.';
            return `Dự kiến giao: ${expectedDate}`;
        })();
        const statusNoteClass = order.orderStatus === 'completed' && canReturn ? 'good' : (order.orderStatus === 'cancelled' || order.orderStatus === 'refunded') ? 'bad' : '';

        return `
            <div class="order-card-premium">
                <div class="order-card-main">
                    <div class="order-thumb-grid">
                        ${visibleThumbs.map((i) => `<img src="${i.image || '/images/banner1png.png'}" alt="">`).join('')}
                        ${moreCount > 0 ? `<div class="order-thumb-more">+${moreCount}</div>` : ''}
                    </div>
                    <div class="order-card-info">
                        <h4>${displayCode}</h4>
                        <small>Đặt ngày: ${new Date(order.createdAt).toLocaleDateString('vi-VN')} ${new Date(order.createdAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}</small>
                        <p class="items-list">${items.length} sản phẩm: ${itemsText}</p>
                        <a class="see-all" href="/customers/order-detail.html?id=${order._id}">Xem tất cả</a>
                    </div>
                </div>
                <div class="order-card-total">
                    <span class="badge-vn ${orderStatusClass(order)}">${orderStatusText(order)}</span>
                    <span>Tổng tiền</span>
                    <strong>${money(order.totalAmount)}</strong>
                    <small>Thanh toán <b>${paymentShortText(order)}</b></small>
                </div>
                <div class="order-card-address">
                    <span>Giao hàng đến</span>
                    <p>${[shipping.address, shipping.ward, shipping.district, shipping.city].filter(Boolean).join(', ') || 'Chưa cập nhật địa chỉ giao hàng'}</p>
                    <small class="order-status-note ${statusNoteClass}">${statusNote}</small>
                </div>
                <div class="order-card-actions">
                    <div class="order-action-note">${statusNote}</div>
                    <div class="order-action-buttons">
                        <a class="hbtn outline" href="/customers/order-detail.html?id=${order._id}">Xem chi tiết</a>
                        ${canRetryVnpay ? `<button class="hbtn clay" data-vnpay-pay-again="${order._id}" type="button">Thanh toán lại VNPay</button>` : ''}
                        ${canCancel ? `<a href="/customers/cancel-order.html?id=${order._id}" class="hbtn danger">Hủy đơn</a>` : ''}
                        ${order.orderStatus === 'shipping' ? `<a class="hbtn outline" href="/customers/order-detail.html?id=${order._id}">Theo dõi đơn</a>` : ''}
                        ${isDelivered ? `<a href="/customers/review.html?id=${order._id}" class="hbtn outline">Đánh giá sản phẩm</a>` : ''}
                        ${canReturn ? `<a href="/customers/return-request.html?id=${order._id}" class="hbtn outline">Yêu cầu hoàn trả</a>` : ''}
                        ${isDelivered || order.orderStatus === 'cancelled' || order.orderStatus === 'refunded' ? `<button class="hbtn clay" type="button">Mua lại</button>` : ''}
                    </div>
                </div>
            </div>
        `;
    };

    const renderOrderTab = (filter = 'all') => {
        const keyword = root.querySelector('.order-search input')?.value.trim().toLowerCase() || '';
        const sortMode = root.querySelector('#orderSort')?.value || 'newest';
        let filtered = state.orders;
        if (filter === 'processing') filtered = filtered.filter((o) => o.orderStatus === 'processing');
        else if (filter === 'delivered') filtered = filtered.filter((o) => o.orderStatus === 'completed');
        else if (filter === 'returned') filtered = filtered.filter((o) => ['return_requested', 'refunding', 'refunded'].includes(o.orderStatus));
        else if (filter === 'cancelled') filtered = filtered.filter((o) => ['cancellation_requested', 'cancelled'].includes(o.orderStatus));
        else if (filter !== 'all') filtered = filtered.filter((o) => o.orderStatus === filter);
        if (keyword) {
            filtered = filtered.filter((o) => `${o.orderCode || ''} ${o.items?.map((i) => i.name).join(' ') || ''}`.toLowerCase().includes(keyword));
        }
        filtered = [...filtered].sort((a, b) => {
            if (sortMode === 'oldest') return new Date(a.createdAt) - new Date(b.createdAt);
            if (sortMode === 'amount-desc') return Number(b.totalAmount || 0) - Number(a.totalAmount || 0);
            if (sortMode === 'amount-asc') return Number(a.totalAmount || 0) - Number(b.totalAmount || 0);
            return new Date(b.createdAt) - new Date(a.createdAt);
        });
        
        const totalPages = Math.max(Math.ceil(filtered.length / orderPaging.pageSize), 1);
        orderPaging.page = Math.min(Math.max(orderPaging.page, 1), totalPages);
        const pageStart = (orderPaging.page - 1) * orderPaging.pageSize;
        const pageItems = filtered.slice(pageStart, pageStart + orderPaging.pageSize);
        const pageNumbers = Array.from({ length: totalPages }, (_, index) => index + 1).filter((page) => (
            page === 1 || page === totalPages || Math.abs(page - orderPaging.page) <= 1
        ));
        const pageButtons = pageNumbers.map((page, index) => `
            ${index && page - pageNumbers[index - 1] > 1 ? '<span>...</span>' : ''}
            <button class="${page === orderPaging.page ? 'active' : ''}" data-order-page="${page}" type="button">${page}</button>
        `).join('');
        const listContainer = document.querySelector('#orderListContainer');
        if (filtered.length === 0) {
            listContainer.innerHTML = `<div class="empty-state" style="padding: 60px 0;"><i class="fa-solid fa-box-open" style="font-size: 48px; color: #efe5de; margin-bottom: 20px;"></i><p>Bạn chưa có đơn hàng nào ở trạng thái này.</p></div>`;
        } else {
            listContainer.innerHTML = `
                <div class="order-list-premium">${pageItems.map(orderRowPremium).join('')}</div>
                <div class="order-pagination">
                    <button data-order-page="${orderPaging.page - 1}" ${orderPaging.page <= 1 ? 'disabled' : ''} type="button"><i class="fa-solid fa-angle-left"></i></button>
                    ${pageButtons}
                    <button data-order-page="${orderPaging.page + 1}" ${orderPaging.page >= totalPages ? 'disabled' : ''} type="button"><i class="fa-solid fa-angle-right"></i></button>
                    <label>Hiển thị <select data-order-page-size><option value="5" ${orderPaging.pageSize === 5 ? 'selected' : ''}>5</option><option value="10" ${orderPaging.pageSize === 10 ? 'selected' : ''}>10</option></select> đơn / trang</label>
                </div>
            `;
        }
    };

    const overview = () => {
        const stats = {
            total: state.orders.length,
            pending: state.orders.filter((o) => o.orderStatus === 'pending').length,
            processing: state.orders.filter((o) => o.orderStatus === 'processing').length,
            shipping: state.orders.filter((o) => o.orderStatus === 'shipping').length,
            delivered: state.orders.filter((o) => o.orderStatus === 'completed').length,
            cancelled: state.orders.filter((o) => ['cancellation_requested', 'cancelled'].includes(o.orderStatus)).length
        };

        return `
            <div class="order-stats">
                <div class="stat-card"><div class="stat-icon total"><i class="fa-solid fa-bag-shopping"></i></div><div class="stat-info"><b>${stats.total}</b><span>Tổng đơn hàng</span></div></div>
                <div class="stat-card"><div class="stat-icon pending"><i class="fa-regular fa-clock"></i></div><div class="stat-info"><b>${stats.pending}</b><span>Chờ xác nhận</span></div></div>
                <div class="stat-card"><div class="stat-icon shipping"><i class="fa-solid fa-truck-fast"></i></div><div class="stat-info"><b>${stats.shipping}</b><span>Đang giao</span></div></div>
                <div class="stat-card"><div class="stat-icon delivered"><i class="fa-regular fa-circle-check"></i></div><div class="stat-info"><b>${stats.delivered}</b><span>Đã giao</span></div></div>
                <div class="stat-card"><div class="stat-icon cancelled"><i class="fa-regular fa-circle-xmark"></i></div><div class="stat-info"><b>${stats.cancelled}</b><span>Đã hủy</span></div></div>
            </div>

            <div class="order-filter-row">
                <div class="order-search"><input type="text" placeholder="Tìm theo mã đơn hàng / tên sản phẩm..."><i class="fa-solid fa-magnifying-glass"></i></div>
                <div class="order-tabs">
                    <div class="order-tab active" data-filter="all">Tất cả</div>
                    <div class="order-tab" data-filter="pending">Chờ xác nhận</div>
                    <div class="order-tab" data-filter="processing">Đang xử lý</div>
                    <div class="order-tab" data-filter="shipping">Đang giao</div>
                    <div class="order-tab" data-filter="delivered">Đã giao</div>
                    <div class="order-tab" data-filter="returned">Hoàn trả</div>
                    <div class="order-tab" data-filter="cancelled">Đã hủy</div>
                </div>
                <div class="order-controls">
                    <select id="orderSort" class="order-sort">
                        <option value="newest">Sắp xếp: Mới nhất</option>
                        <option value="oldest">Sắp xếp: Cũ nhất</option>
                        <option value="amount-desc">Tổng tiền cao nhất</option>
                        <option value="amount-asc">Tổng tiền thấp nhất</option>
                    </select>
                </div>
            </div>

            <div id="orderListContainer"></div>
        `;
    };

    root.innerHTML = `
        <div class="order-dashboard-layout">
            <section class="profile-main">
                <div class="orders-title-row">
                    <div>
                        <h1>Lịch sử mua hàng</h1>
                        <p>Theo dõi trạng thái đơn hàng, hủy đơn đủ điều kiện, yêu cầu hoàn trả và đánh giá sản phẩm.</p>
                    </div>
                </div>
                ${overview()}
            </section>
            <aside class="order-sidebar">
                <div class="info-card order-policy-card">
                    <h4><i class="fa-solid fa-shield-halved"></i> Mẹo & Chính sách</h4>
                    <ul>
                        <li>
                            <i class="fa-regular fa-clock"></i>
                            <div><b>Hủy đơn dễ dàng</b><p>Bạn có thể hủy đơn trong vòng 24 giờ kể từ khi đặt nếu đơn chưa được xác nhận bởi Admin.</p></div>
                        </li>
                        <li>
                            <i class="fa-solid fa-rotate-left"></i>
                            <div><b>Hoàn trả linh hoạt</b><p>Yêu cầu hoàn trả trong vòng 3 ngày sau khi nhận hàng. Sản phẩm còn nguyên vẹn, chưa qua sử dụng.</p></div>
                        </li>
                        <li>
                            <i class="fa-regular fa-star"></i>
                            <div><b>Đánh giá sản phẩm</b><p>Đánh giá để chia sẻ trải nghiệm. Bạn có thể đính kèm hình ảnh và chấm sao.</p></div>
                        </li>
                    </ul>
                </div>
                <img class="order-policy-img" src="https://images.unsplash.com/photo-1556228453-efd6c1ff04f6?auto=format&fit=crop&w=300&q=80" alt="Decor">
            </aside>
        </div>
    `;

    renderOrderTab('all');

    root.querySelectorAll('.order-tab').forEach((tab) => {
        tab.addEventListener('click', () => {
            root.querySelectorAll('.order-tab').forEach((t) => t.classList.remove('active'));
            tab.classList.add('active');
            orderPaging.page = 1;
            renderOrderTab(tab.dataset.filter);
        });
    });
    root.querySelector('.order-search input')?.addEventListener('input', () => {
        orderPaging.page = 1;
        renderOrderTab(root.querySelector('.order-tab.active')?.dataset.filter || 'all');
    });
    root.querySelector('#orderSort')?.addEventListener('change', () => {
        orderPaging.page = 1;
        renderOrderTab(root.querySelector('.order-tab.active')?.dataset.filter || 'all');
    });
    root.addEventListener('click', async (event) => {
        const payAgainButton = event.target.closest('[data-vnpay-pay-again]');
        if (payAgainButton) {
            await payVnpayOrder(payAgainButton.dataset.vnpayPayAgain, payAgainButton);
            return;
        }
        const pageButton = event.target.closest('[data-order-page]');
        if (!pageButton || pageButton.disabled) return;
        orderPaging.page = Number(pageButton.dataset.orderPage) || 1;
        renderOrderTab(root.querySelector('.order-tab.active')?.dataset.filter || 'all');
    });
    root.addEventListener('change', (event) => {
        if (!event.target.matches('[data-order-page-size]')) return;
        orderPaging.pageSize = [5, 10].includes(Number(event.target.value)) ? Number(event.target.value) : 5;
        orderPaging.page = 1;
        renderOrderTab(root.querySelector('.order-tab.active')?.dataset.filter || 'all');
    });
}

async function renderWishlist() {
    const root = document.querySelector('#wishlistRoot');
    if (!root || !requireLogin()) return;
    const load = async () => {
        const { products } = await api('/wishlist');
        root.innerHTML = `<div class="shop-grid">${products.map((product) => `<div>${productCard(product)}<button class="padd remove-wish" data-id="${product._id}">Xóa khỏi yêu thích</button></div>`).join('') || '<p>Chưa có sản phẩm yêu thích.</p>'}</div>`;
    };
    root.addEventListener('click', async (event) => {
        const button = event.target.closest('.remove-wish');
        if (!button) return;
        if (!confirm('Xoa san pham nay khoi wishlist?')) return;
        await api(`/wishlist/${button.dataset.id}`, { method: 'DELETE' });
        toast('Đã xóa khỏi yêu thích');
        load();
        updateHeaderCounts();
    });
    await load();
}

async function renderSimpleLists() {
    const promo = document.querySelector('#promotionsRoot');
    if (promo) {
        setLoading(promo, 'Dang tai khuyen mai...');
        try {
        const { promotions } = await api('/promotions');
        const promoOrder = ['CASA10', 'CASA20', 'CASA30', 'NEW15', 'FREESHIP', 'MEMBER50'];
        const orderedPromotions = [...promotions].sort((a, b) => {
            const left = promoOrder.indexOf(a.code);
            const right = promoOrder.indexOf(b.code);
            if (left !== -1 || right !== -1) return (left === -1 ? 999 : left) - (right === -1 ? 999 : right);
            return Number(a.minOrderValue || 0) - Number(b.minOrderValue || 0);
        });
        const couponStrip = document.querySelector('.coupon-strip');
        if (couponStrip && orderedPromotions.length) {
            couponStrip.innerHTML = `
                <div><small>Mã giảm giá</small><span>Tiết kiệm hơn khi mua sắm</span></div>
                ${orderedPromotions.slice(0, 6).map((p) => `
                    <article>
                        <b>${p.code || 'TỰ ĐỘNG'}</b>
                        <span>${p.discountType === 'percentage' ? `Giảm ${p.discountValue}%` : `Giảm ${money(p.discountValue)}`}</span>
                        <small>Đơn từ ${money(p.minOrderValue)}</small>
                    </article>
                `).join('')}
            `;
        }
        promo.innerHTML = orderedPromotions.map((p) => `
            <article class="promo-card">
                <div class="promo-card-top">
                    <span>${p.discountType === 'percentage' ? `-${p.discountValue}%` : money(p.discountValue)}</span>
                    <i class="fa-solid fa-ticket"></i>
                </div>
                <h3>${p.name}</h3>
                <p>Áp dụng cho đơn hàng từ ${money(p.minOrderValue)}.</p>
                <div class="promo-code"><small>Mã ưu đãi</small><b>${p.code || 'TỰ ĐỘNG'}</b></div>
                <button class="hbtn coupon-copy" data-code="${p.code || ''}" type="button">Dung ma nay</button>
            </article>
        `).join('');
        } catch (error) {
            setError(promo, error.message || 'Khong the tai khuyen mai.');
        }
    }
    const blogs = document.querySelector('#blogsRoot');
    if (blogs) {
        setLoading(blogs, 'Dang tai blog...');
        try {
        const data = await api('/blogs');
        const posts = data.blogs.length ? data.blogs : [];
        const fallbacks = fallbackBlogs();
        const list = [...posts, ...fallbacks].slice(0, 6);
        const featured = list[0];
        blogs.innerHTML = `
            <div class="blog-tabs"><button class="on">Tất cả bài viết</button><button>Xu hướng decor</button><button>Phòng khách</button><button>Phòng ngủ</button><button>Mẹo decor</button><button>Phong cách sống</button></div>
            <div class="blog-content">
                <div class="blog-feed">
                    <article class="blog-featured"><img src="${featured.thumbnail || '/images/banner1png.png'}" alt="" ${imagePerfAttrs('eager')}><span>Nổi bật</span><div><small>Xu hướng decor</small><h2>${featured.title}</h2><p>${featured.summary || ''}</p><a href="${blogUrl(featured)}">Đọc ngay <i class="fa-solid fa-arrow-right"></i></a></div></article>
                    <div class="blog-card-grid">${list.slice(1, 6).map((b, index) => `<a class="blog-card" href="${blogUrl(b)}"><img src="${b.thumbnail || '/images/banner1png.png'}" alt="" ${imagePerfAttrs()}><small>${index % 2 ? 'Mẹo decor' : 'Phòng khách'}</small><h3>${b.title}</h3><p>${b.summary || ''}</p><span>${new Date(b.createdAt || Date.now()).toLocaleDateString('vi-VN')} · 4 phút đọc</span></a>`).join('')}</div>
                    <button class="load-more" type="button">Xem thêm bài viết <i class="fa-solid fa-chevron-down"></i></button>
                </div>
                <aside class="blog-aside"><label><input class="blog-inline-search" type="text" placeholder="Tìm kiếm bài viết..."><i class="fa-solid fa-magnifying-glass"></i></label><section><h3>Bài viết nổi bật</h3>${list.slice(0, 4).map((b) => `<a href="${blogUrl(b)}"><img src="${b.thumbnail || '/images/banner1png.png'}" alt="" ${imagePerfAttrs()}><span>${b.title}</span></a>`).join('')}</section><section><h3>Danh mục bài viết</h3><p>Xu hướng decor <b>(24)</b></p><p>Phòng khách <b>(18)</b></p><p>Phòng ngủ <b>(14)</b></p><p>Mẹo decor <b>(22)</b></p><p>Phong cách sống <b>(16)</b></p></section></aside>
            </div>
        `;
        setupBlogSearch(list);
        const initialBlogQuery = qs('q');
        const inlineBlogSearch = document.querySelector('.blog-inline-search');
        if (initialBlogQuery && inlineBlogSearch) {
            inlineBlogSearch.value = initialBlogQuery;
            inlineBlogSearch.dispatchEvent(new Event('input'));
        }
        } catch (error) {
            setError(blogs, error.message || 'Khong the tai blog.');
        }
    }
}

function setupBlogSearch(posts) {
    const input = document.querySelector('.blog-inline-search');
    const grid = document.querySelector('.blog-card-grid');
    if (!input || !grid) return;
    input.addEventListener('input', () => {
        const keyword = input.value.trim().toLowerCase();
        const filtered = posts.filter((post) => `${post.title || ''} ${post.summary || ''}`.toLowerCase().includes(keyword)).slice(0, 6);
        grid.innerHTML = filtered.slice(keyword ? 0 : 1, keyword ? 6 : 6).map((b, index) => `
            <a class="blog-card" href="${blogUrl(b)}">
                <img src="${b.thumbnail || '/images/banner1png.png'}" alt="" ${imagePerfAttrs()}>
                <small>${index % 2 ? 'Meo decor' : 'Phong khach'}</small>
                <h3>${escapeHtml(b.title)}</h3>
                <p>${escapeHtml(b.summary || '')}</p>
                <span>${new Date(b.createdAt || Date.now()).toLocaleDateString('vi-VN')} · 4 phut doc</span>
            </a>
        `).join('') || '<p class="empty-state">Khong tim thay bai viet phu hop.</p>';
    });
}

async function renderBlogDetail() {
    const root = document.querySelector('#blogDetailRoot');
    if (!root) return;
    setLoading(root, 'Dang tai bai viet...');
    try {
        let blog;
        let related = [];
        try {
            const data = await api(`/blogs/${qs('slug')}`);
            blog = data.blog;
            related = data.related || [];
        } catch (error) {
            const localFallbacks = fallbackBlogs();
            blog = localFallbacks.find((item) => item.slug === qs('slug'));
            related = localFallbacks.filter((item) => item.slug !== blog?.slug).slice(0, 4);
            if (!blog) throw error;
        }
        const content = String(blog.content || '').trim();
        document.title = `${blog.title} - Casa Decor`;
        root.innerHTML = `
            <nav class="breadcrumb"><a href="/customers/index.html">Trang chu</a><span>/</span><a href="/customers/blog.html">Blog</a><span>/</span><b>${escapeHtml(blog.title)}</b></nav>
            <article class="blog-detail">
                <img class="blog-detail-cover" src="${blog.thumbnail || '/images/banner1png.png'}" alt="">
                <div class="blog-detail-meta"><span>${new Date(blog.createdAt || Date.now()).toLocaleDateString('vi-VN')}</span><span>${escapeHtml(blog.author?.name || 'Casa Decor')}</span></div>
                <h1>${escapeHtml(blog.title)}</h1>
                <p class="blog-detail-summary">${escapeHtml(blog.summary || '')}</p>
                <div class="blog-detail-content">${content.includes('<') ? content : content.split(/\n+/).map((paragraph) => `<p>${escapeHtml(paragraph)}</p>`).join('')}</div>
            </article>
            <section class="related-blogs">
                <h2>Bai viet lien quan</h2>
                <div class="blog-card-grid">${(related || []).map((item) => `<a class="blog-card" href="${blogUrl(item)}"><img src="${item.thumbnail || '/images/banner1png.png'}" alt=""><h3>${escapeHtml(item.title)}</h3><p>${escapeHtml(item.summary || '')}</p></a>`).join('') || '<p class="empty-state">Chua co bai viet lien quan.</p>'}</div>
            </section>
        `;
    } catch (error) {
        setError(root, error.message || 'Khong the tai bai viet.');
    }
}

async function renderProfile() {
    const dashboard = document.querySelector('#profileDashboard');
    if (dashboard) {
        if (!requireLogin()) return;
        let state = {
            user: null,
            orders: [],
            wishlist: [],
            promotions: []
        };

        const addressText = (address) => [address?.street, address?.ward, address?.district, address?.city].filter(Boolean).join(', ');
        const syncStoredUser = (user) => {
            const current = session();
            if (!current) return;
            current.user = user;
            const target = localStorage.getItem('casaSession') ? localStorage : sessionStorage;
            target.setItem('casaSession', JSON.stringify(current));
        };

        const loadData = async () => {
            const [{ user }, { orders }, wishData, promoData] = await Promise.all([
                api('/auth/me'),
                api('/orders'),
                api('/wishlist').catch(() => ({ products: [] })),
                api('/promotions').catch(() => ({ promotions: [] }))
            ]);
            state = {
                user,
                orders: orders || [],
                wishlist: wishData.products || [],
                promotions: promoData.promotions || []
            };
        };

        const shell = () => `
            <section class="profile-shell">
                <aside class="profile-sidebar">
                    <div class="profile-avatar"><img src="${state.user.avatar || 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=240&q=80'}" alt=""><button data-profile-tab="account" type="button"><i class="fa-solid fa-camera"></i></button></div>
                    <h2>${state.user.name || 'Khách hàng Casa'}</h2><span><i class="fa-solid fa-medal"></i> Thành viên thân thiết</span>
                    <nav>
                        <a class="on" data-profile-tab="overview"><i class="fa-solid fa-house"></i> Tổng quan</a>
                        <a href="/customers/orders.html"><i class="fa-solid fa-bag-shopping"></i> Đơn hàng của tôi</a>
                        <a data-profile-tab="wishlist"><i class="fa-regular fa-heart"></i> Sản phẩm yêu thích</a>
                        <a data-profile-tab="addresses"><i class="fa-solid fa-location-dot"></i> Địa chỉ của tôi</a>
                        <a data-profile-tab="account"><i class="fa-regular fa-user"></i> Thông tin tài khoản</a>
                        <a data-profile-tab="password"><i class="fa-solid fa-lock"></i> Đổi mật khẩu</a>
                        <a data-profile-tab="notifications"><i class="fa-regular fa-bell"></i> Thông báo</a>
                        <a data-profile-tab="vouchers"><i class="fa-solid fa-ticket"></i> Voucher của tôi</a>
                        <a data-logout><i class="fa-solid fa-arrow-right-from-bracket"></i> Đăng xuất</a>
                    </nav>
                </aside>
                <div class="profile-main" id="profilePanel"></div>
            </section>
            <section class="profile-trust trust"><div class="ti"><i class="fa-solid fa-truck-fast"></i><div><b>Miễn phí vận chuyển</b><small>Cho đơn hàng từ 1.000.000đ</small></div></div><div class="ti"><i class="fa-solid fa-rotate-left"></i><div><b>Đổi trả dễ dàng</b><small>Trong vòng 7 ngày</small></div></div><div class="ti"><i class="fa-solid fa-award"></i><div><b>Sản phẩm chất lượng</b><small>Cam kết chính hãng</small></div></div><div class="ti"><i class="fa-solid fa-headset"></i><div><b>Hỗ trợ 24/7</b><small>Hotline: 0336881795</small></div></div></section>
        `;

        const orderRow = (order) => {
            const ageInMs = Date.now() - new Date(order.createdAt).getTime();
            const ageInHours = ageInMs / (1000 * 60 * 60);
            const canCancel = order.orderStatus === 'pending' && ageInHours >= 24;

            const isDelivered = order.orderStatus === 'completed';
            const deliveredAt = order.deliveredAt ? new Date(order.deliveredAt).getTime() : new Date(order.updatedAt).getTime();
            const ageSinceDelivered = (Date.now() - deliveredAt) / (1000 * 60 * 60 * 24);
            const canReturn = isDelivered && ageSinceDelivered <= 3;

            return `
                <div class="recent-order" data-order-detail="${order._id}" role="link" tabindex="0" aria-label="Xem chi tiết đơn hàng #${orderCodeView(order)}">
                    <img src="${order.items?.[0]?.image || '/images/banner1png.png'}" alt="">
                    <div>
                        <b>Đơn hàng #${orderCodeView(order)}</b>
                        <small>Đặt ngày: ${new Date(order.createdAt).toLocaleDateString('vi-VN')}</small>
                    </div>
                    <strong>${money(order.totalAmount)}</strong>
                    <small>Thanh toán ${paymentShortText(order)}</small>
                    <span class="${orderStatusClass(order)}">${orderStatusText(order)}</span>
                    <div class="order-actions-cell">
                        ${canCancel ? `<a href="/customers/cancel-order.html?id=${order._id}" class="link-btn profile-cancel-order">Hủy</a>` : ''}
                        ${canReturn ? `<a href="/customers/return-request.html?id=${order._id}" class="link-btn return-btn">Hoàn trả</a>` : ''}
                        ${isDelivered ? `<a href="/customers/review.html?id=${order._id}" class="link-btn review-btn">Đánh giá</a>` : ''}
                        <a href="/customers/order-detail.html?id=${order._id}" class="order-detail-link" aria-label="Chi tiết đơn hàng #${orderCodeView(order)}"><i class="fa-solid fa-angle-right"></i></a>
                    </div>
                </div>
            `;
        };

        const overview = () => {
            const delivered = state.orders.filter((order) => order.orderStatus === 'completed').length;
            const pending = state.orders.filter((order) => order.orderStatus === 'pending').length;
            const shipping = state.orders.filter((order) => ['processing', 'shipping'].includes(order.orderStatus)).length;
            const paidDeliveredOrders = state.orders.filter((order) => order.orderStatus === 'completed' && order.paymentStatus === 'paid');
            const paidDeliveredTotal = paidDeliveredOrders.reduce((sum, order) => sum + Number(order.totalAmount || 0), 0);
            const paidDeliveredAverage = paidDeliveredOrders.length ? Math.round(paidDeliveredTotal / paidDeliveredOrders.length) : 0;
            const monthBuckets = Array.from({ length: 6 }, (_, index) => {
                const date = new Date();
                date.setDate(1);
                date.setMonth(date.getMonth() - (5 - index));
                const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
                return {
                    key,
                    label: date.toLocaleDateString('vi-VN', { month: '2-digit', year: '2-digit' }),
                    amount: 0
                };
            });
            const bucketMap = new Map(monthBuckets.map((item) => [item.key, item]));
            paidDeliveredOrders.forEach((order) => {
                const date = new Date(order.deliveredAt || order.updatedAt || order.createdAt);
                const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
                if (bucketMap.has(key)) bucketMap.get(key).amount += Number(order.totalAmount || 0);
            });
            const maxSpend = Math.max(...monthBuckets.map((item) => item.amount), 1);
            const spendBars = monthBuckets.map((item) => {
                const height = item.amount ? Math.max(10, Math.round((item.amount / maxSpend) * 100)) : 0;
                return `<div class="spend-chart-col"><div class="spend-bar-track"><span style="--bar:${height}%"></span></div><b>${item.label}</b><small>${money(item.amount)}</small></div>`;
            }).join('');
            const defaultAddress = state.user.addresses?.find((item) => item.isDefault) || state.user.addresses?.[0];
            return `
                <section class="profile-hello"><div><h1>Xin chào, ${state.user.name || 'Khách hàng Casa'}!</h1><p>Cảm ơn bạn đã tin tưởng và đồng hành cùng Casa Decor.</p></div></section>
                <section class="profile-stats">
                    <article><span>Đơn hàng</span><strong>${state.orders.length}</strong><a href="/customers/orders.html">Xem tất cả đơn hàng <i class="fa-solid fa-arrow-right"></i></a><i class="fa-solid fa-bag-shopping"></i></article>
                    <article><span>Đơn hàng chờ xác nhận</span><strong>${pending}</strong><a href="/customers/orders.html">Xem chi tiết <i class="fa-solid fa-arrow-right"></i></a><i class="fa-regular fa-clock"></i></article>
                    <article><span>Đơn hàng đang giao</span><strong>${shipping}</strong><a href="/customers/orders.html">Xem chi tiết <i class="fa-solid fa-arrow-right"></i></a><i class="fa-solid fa-truck-fast"></i></article>
                    <article><span>Đã giao</span><strong>${delivered}</strong><a href="/customers/orders.html">Xem chi tiết <i class="fa-solid fa-arrow-right"></i></a><i class="fa-regular fa-circle-check"></i></article>
                </section>
                <section class="profile-spend-card">
                    <div class="spend-summary">
                        <span>Tổng chi tiêu đã ghi nhận</span>
                        <strong>${money(paidDeliveredTotal)}</strong>
                        <p>Chỉ tính đơn đã thanh toán và hệ thống ghi nhận đã giao.</p>
                    </div>
                    <div class="spend-metrics">
                        <div><b>${paidDeliveredOrders.length}</b><span>Đơn hợp lệ</span></div>
                        <div><b>${money(paidDeliveredAverage)}</b><span>Trung bình / đơn</span></div>
                    </div>
                    <div class="spend-chart" aria-label="Biểu đồ chi tiêu 6 tháng gần nhất">
                        ${spendBars}
                    </div>
                </section>
                <section class="profile-grid">
                    <article class="recent-orders"><div class="section-head"><h3>Đơn hàng gần đây</h3><a href="/customers/orders.html">Xem tất cả <i class="fa-solid fa-arrow-right"></i></a></div><div class="recent-orders-scroll">${state.orders.map(orderRow).join('') || '<p class="empty-state">Khách hàng chưa có đơn hàng gần đây.</p>'}</div></article>
                    <div class="profile-sidecards">
                        <article><div class="section-head"><h3>Thông tin tài khoản</h3><button class="link-btn" data-profile-tab="account" type="button"><i class="fa-solid fa-pen"></i> Chỉnh sửa</button></div><p>Họ và tên<br><b>${state.user.name || '-'}</b></p><p>Email<br><b>${state.user.email || '-'}</b></p><p>Số điện thoại<br><b>${state.user.phone || '-'}</b></p><i class="fa-regular fa-user"></i></article>
                        <article><div class="section-head"><h3>Địa chỉ của tôi</h3><button class="link-btn" data-profile-tab="addresses" type="button">Xem tất cả <i class="fa-solid fa-arrow-right"></i></button></div><p><i class="fa-solid fa-location-dot"></i> <b>Địa chỉ mặc định</b></p><p>${addressText(defaultAddress) || 'Khách hàng chưa cập nhật địa chỉ mặc định.'}</p><p><i class="fa-solid fa-phone"></i> ${defaultAddress?.phone || state.user.phone || '-'}</p><i class="fa-solid fa-angle-right profile-card-arrow"></i></article>
                    </div>
                </section>
            `;
        };

        const ordersView = () => `<section class="profile-panel"><div class="section-head"><h2>Đơn hàng của tôi</h2><span>${state.orders.length} đơn hàng</span></div><div class="profile-order-list">${state.orders.map(orderRow).join('') || '<p class="empty-state">Bạn chưa có đơn hàng.</p>'}</div></section>`;

        const wishlistView = () => `<section class="profile-panel"><div class="section-head"><h2>Sản phẩm yêu thích</h2><span>${state.wishlist.length} sản phẩm</span></div><div class="shop-grid profile-wishlist">${state.wishlist.map((product) => `<div>${productCard(product)}<button class="padd profile-remove-wish" data-id="${product._id}" type="button">Xóa khỏi yêu thích</button></div>`).join('') || '<p class="empty-state">Bạn chưa lưu sản phẩm yêu thích.</p>'}</div></section>`;

        const addressesView = () => {
            const current = state.user.addresses?.find((item) => item.isDefault) || state.user.addresses?.[0] || {};
            return `<section class="profile-panel"><div class="section-head"><h2>Địa chỉ của tôi</h2><span>${state.user.addresses?.length || 0} địa chỉ</span></div><form id="profileAddressForm" class="profile-form"><label>Họ tên người nhận<input name="fullName" value="${current.fullName || state.user.name || ''}" placeholder="Họ tên người nhận"></label><label>Số điện thoại<input name="phone" value="${current.phone || state.user.phone || ''}" placeholder="Số điện thoại"></label><label class="full goong-address-field">Địa chỉ<input name="street" value="${current.street || ''}" placeholder="Số nhà, tên đường" autocomplete="street-address"><div class="goong-suggestions" role="listbox"></div></label><label>Phường / Xã<input name="ward" value="${current.ward || ''}" placeholder="Phường / Xã"></label><label>Quận / Huyện<input name="district" value="${current.district || ''}" placeholder="Quận / Huyện"></label><label>Tỉnh / Thành phố<input name="city" value="${current.city || ''}" placeholder="Tỉnh / Thành phố"></label><button class="auth-submit" type="submit">Lưu địa chỉ mặc định</button></form><div class="address-list">${(state.user.addresses || []).map((item) => `<article><b>${item.isDefault ? 'Địa chỉ mặc định' : 'Địa chỉ'}</b><p>${addressText(item) || '-'}</p><span>${item.fullName || state.user.name || ''} - ${item.phone || state.user.phone || ''}</span></article>`).join('') || '<p class="empty-state">Bạn chưa có địa chỉ nào.</p>'}</div></section>`;
        };

        const accountView = () => `<section class="profile-panel"><div class="section-head"><h2>Thông tin tài khoản</h2></div><form id="profileAccountForm" class="profile-form"><label>Họ và tên<input name="name" value="${state.user.name || ''}" required></label><label>Email<input name="email" value="${state.user.email || ''}" readonly></label><label>Số điện thoại<input name="phone" value="${state.user.phone || ''}" placeholder="Số điện thoại"></label><div class="avatar-upload full"><img src="${state.user.avatar || 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=240&q=80'}" alt=""><div><b>Ảnh đại diện</b><span>Chọn ảnh JPG, PNG hoặc WEBP từ máy tính. Dung lượng tối đa 3MB.</span><label class="avatar-picker"><i class="fa-solid fa-camera"></i> Chọn ảnh<input id="profileAvatarFile" type="file" accept="image/png,image/jpeg,image/webp"></label></div></div><button class="auth-submit" type="submit">Cập nhật thông tin</button></form></section>`;

        const passwordView = () => `<section class="profile-panel"><div class="section-head"><h2>Đổi mật khẩu</h2></div><form id="profilePasswordForm" class="profile-form"><label>Mật khẩu hiện tại<input name="currentPassword" type="password" required></label><label>Mật khẩu mới<input name="newPassword" type="password" minlength="6" required></label><label>Xác nhận mật khẩu mới<input name="confirmPassword" type="password" minlength="6" required></label><button class="auth-submit" type="submit">Đổi mật khẩu</button></form></section>`;

        const notificationsView = () => `<section class="profile-panel"><div class="section-head"><h2>Thông báo</h2></div><p class="empty-state">Bạn chưa có thông báo mới.</p></section>`;

        const vouchersView = () => `<section class="profile-panel"><div class="section-head"><h2>Voucher của tôi</h2><span>${state.promotions.length} ưu đãi</span></div><div class="voucher-list">${state.promotions.map((promo) => `<article><i class="fa-solid fa-ticket"></i><div><b>${promo.name}</b><span>Mã: ${promo.code || 'TỰ ĐỘNG'} - Đơn từ ${money(promo.minOrderValue)}</span></div><strong>${promo.discountType === 'percentage' ? `${promo.discountValue}%` : money(promo.discountValue)}</strong></article>`).join('') || '<p class="empty-state">Hiện chưa có voucher khả dụng.</p>'}</div></section>`;

        const views = { overview, orders: ordersView, wishlist: wishlistView, addresses: addressesView, account: accountView, password: passwordView, notifications: notificationsView, vouchers: vouchersView };
        let activeProfileTab = null;
        let tabSwitchTimer = null;
        const paintProfileTab = (tab = 'overview') => {
            const panel = dashboard.querySelector('#profilePanel');
            if (!panel) return;
            dashboard.querySelectorAll('[data-profile-tab]').forEach((item) => item.classList.toggle('on', item.dataset.profileTab === tab));
            panel.innerHTML = (views[tab] || overview)();
            panel.querySelectorAll(':scope > *').forEach((item, index) => {
                item.style.setProperty('--profile-stagger', `${Math.min(index * 45, 180)}ms`);
            });
            panel.classList.remove('profile-tab-leave');
            panel.classList.add('profile-tab-enter');
            setupGoongAddressAutocomplete(panel);
            window.setTimeout(() => panel.classList.remove('profile-tab-enter'), 460);
            activeProfileTab = tab;
        };
        const setTab = (tab = 'overview') => {
            const panel = dashboard.querySelector('#profilePanel');
            if (!panel) return;
            window.clearTimeout(tabSwitchTimer);
            if (!panel.innerHTML || activeProfileTab === null) {
                paintProfileTab(tab);
                return;
            }
            if (tab === activeProfileTab) return;
            dashboard.querySelectorAll('[data-profile-tab]').forEach((item) => item.classList.toggle('on', item.dataset.profileTab === tab));
            panel.classList.remove('profile-tab-enter');
            panel.classList.add('profile-tab-leave');
            tabSwitchTimer = window.setTimeout(() => paintProfileTab(tab), 150);
        };

        setLoading(dashboard, 'Dang tai thong tin tai khoan...');
        try {
            await loadData();
        } catch (error) {
            setError(dashboard, error.message || 'Khong the tai thong tin tai khoan. Vui long dang nhap lai.');
            return;
        }
        dashboard.innerHTML = shell();
        if (qs('tab') === 'orders') {
            location.href = '/customers/orders.html';
            return;
        }
        setTab(qs('tab') || 'overview');

        dashboard.addEventListener('click', async (event) => {
            const tab = event.target.closest('[data-profile-tab]');
            if (tab) {
                event.preventDefault();
                setTab(tab.dataset.profileTab);
                return;
            }
            const orderDetail = event.target.closest('[data-order-detail]');
            if (orderDetail && !event.target.closest('a, button')) {
                location.href = `/customers/order-detail.html?id=${orderDetail.dataset.orderDetail}`;
                return;
            }
            const cancel = event.target.closest('.profile-cancel-order');
            if (cancel) {
                await api(`/orders/${cancel.dataset.id}/cancel`, { method: 'PATCH' });
                toast('Đã hủy đơn hàng');
                await loadData();
                setTab('orders');
                return;
            }
            const removeWish = event.target.closest('.profile-remove-wish');
            if (removeWish) {
                await api(`/wishlist/${removeWish.dataset.id}`, { method: 'DELETE' });
                toast('Đã xóa khỏi yêu thích');
                await updateHeaderCounts();
                await loadData();
                setTab('wishlist');
            }
        });

        dashboard.addEventListener('keydown', (event) => {
            if (!['Enter', ' '].includes(event.key)) return;
            const orderDetail = event.target.closest('[data-order-detail]');
            if (!orderDetail) return;
            event.preventDefault();
            location.href = `/customers/order-detail.html?id=${orderDetail.dataset.orderDetail}`;
        });

        dashboard.addEventListener('change', async (event) => {
            const avatarInput = event.target.closest('#profileAvatarFile');
            if (!avatarInput) return;
            const file = avatarInput.files?.[0];
            if (!file) return;
            if (!/^image\/(png|jpe?g|webp)$/i.test(file.type)) {
                toast('Vui lòng chọn ảnh PNG, JPG hoặc WEBP');
                avatarInput.value = '';
                return;
            }
            if (file.size > 3 * 1024 * 1024) {
                toast('Ảnh đại diện tối đa 3MB');
                avatarInput.value = '';
                return;
            }
            const avatar = await fileToDataUrl(file);
            const data = await api('/auth/avatar', { method: 'PATCH', body: JSON.stringify({ avatar }) });
            state.user = data.user;
            syncStoredUser(data.user);
            toast('Đã cập nhật ảnh đại diện');
            dashboard.innerHTML = shell();
            setTab('account');
        });

        dashboard.addEventListener('submit', async (event) => {
            const form = event.target;
            if (!['profileAccountForm', 'profileAddressForm', 'profilePasswordForm'].includes(form.id)) return;
            event.preventDefault();
            const values = Object.fromEntries(new FormData(form));
            if (form.id === 'profilePasswordForm') {
                if (values.newPassword !== values.confirmPassword) {
                    toast('Mật khẩu xác nhận không khớp');
                    return;
                }
                await api('/auth/password', { method: 'PATCH', body: JSON.stringify({ currentPassword: values.currentPassword, newPassword: values.newPassword }) });
                form.reset();
                toast('Đã đổi mật khẩu');
                return;
            }
            const addresses = form.id === 'profileAddressForm'
                ? [{ fullName: values.fullName, phone: values.phone, street: values.street, ward: values.ward, district: values.district, city: values.city, isDefault: true }]
                : state.user.addresses;
            const payload = form.id === 'profileAccountForm'
                ? { name: values.name, phone: values.phone, addresses }
                : { name: state.user.name, phone: values.phone || state.user.phone, addresses };
            const data = await api('/auth/profile', { method: 'PATCH', body: JSON.stringify(payload) });
            syncStoredUser(data.user);
            toast('Đã cập nhật thông tin');
            await loadData();
            dashboard.innerHTML = shell();
            setTab(form.id === 'profileAddressForm' ? 'addresses' : 'account');
            await updateHeaderCounts();
        });

        return;
    }
    const form = document.querySelector('#profileForm');
    if (!form || !requireLogin()) return;
    const { user } = await api('/auth/me');
    form.name.value = user.name || '';
    form.phone.value = user.phone || '';
    form.address.value = user.addresses?.[0]?.street || '';
    setupGoongAddressAutocomplete(form);
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const v = Object.fromEntries(new FormData(form));
        const current = session();
        const data = await api('/auth/profile', { method: 'PATCH', body: JSON.stringify({ name: v.name, phone: v.phone, addresses: [{ street: v.address, fullName: v.name, phone: v.phone, isDefault: true }] }) });
        current.user = data.user;
        localStorage.setItem('casaSession', JSON.stringify(current));
        if (v.currentPassword && v.newPassword) {
            await api('/auth/password', { method: 'PATCH', body: JSON.stringify({ currentPassword: v.currentPassword, newPassword: v.newPassword }) });
        }
        toast('Đã cập nhật thông tin');
    });
}
async function renderReviewPage() {
    const root = document.querySelector('#reviewContent');
    if (!root || !requireLogin()) return;
    const orderId = qs('id');
    const { orders } = await api('/orders');
    const order = orders.find((o) => o._id === orderId);
    
    if (!order || order.orderStatus !== 'completed') {
        root.innerHTML = '<p class="empty-state">Không tìm thấy đơn hàng hợp lệ để đánh giá.</p>';
        return;
    }

    const items = order.items || [];
    let currentPage = 1;
    const itemsPerPage = 3;
    const totalPages = Math.ceil(items.length / itemsPerPage);

    function renderPage(page) {
        const start = (page - 1) * itemsPerPage;
        const end = start + itemsPerPage;
        const pageItems = items.slice(start, end);

        root.innerHTML = `
            <div class="review-list-pro">
                ${pageItems.map((item) => `
                    <div class="product-review-item">
                        <div class="review-product-info">
                            <img src="${item.image || '/images/banner1png.png'}" alt="">
                            <div>
                                <h4>${item.name}</h4>
                                <p><i class="fa-solid fa-hashtag"></i> #${orderCodeView(order)} · <i class="fa-regular fa-calendar"></i> ${new Date(order.createdAt).toLocaleDateString('vi-VN')}</p>
                            </div>
                        </div>
                        <form class="review-form-pro" data-product-id="${item.product}">
                            <div class="field-group">
                                <label class="field-label-pro">Trải nghiệm của bạn về sản phẩm? *</label>
                                <div class="modern-star-rating" data-rating="5">
                                    <i class="fa-solid fa-star on" data-val="1"></i>
                                    <i class="fa-solid fa-star on" data-val="2"></i>
                                    <i class="fa-solid fa-star on" data-val="3"></i>
                                    <i class="fa-solid fa-star on" data-val="4"></i>
                                    <i class="fa-solid fa-star on" data-val="5"></i>
                                </div>
                            </div>
                            
                            <div class="field-group">
                                <label class="field-label-pro">Lời nhận xét tâm huyết *</label>
                                <textarea name="comment" class="review-textarea" placeholder="Hãy chia sẻ những điều bạn thích nhất về sản phẩm này nhé..." required></textarea>
                            </div>

                            <div class="field-group" style="margin-top: 32px;">
                                <label class="field-label-pro">Ảnh/Video thực tế từ bạn</label>
                                <div class="modern-upload-zone">
                                    <i class="fa-solid fa-camera-retro"></i>
                                    <p>Tải lên những khoảnh khắc tuyệt vời nhất</p>
                                    <input type="file" multiple class="hidden-file-input" accept="image/*,video/*" style="display:none">
                                </div>
                                <div class="image-preview-pro"></div>
                            </div>

                            <div class="field-group" style="margin-top: 32px;">
                                <label class="field-label-pro">Ấn tượng nổi bật</label>
                                <div class="tag-cloud-pro">
                                    <span class="tag-item-pro">Đúng như mô tả</span>
                                    <span class="tag-item-pro">Đóng gói nghệ thuật</span>
                                    <span class="tag-item-pro">Giao hàng thần tốc</span>
                                    <span class="tag-item-pro">Màu sắc tinh tế</span>
                                    <span class="tag-item-pro">Vượt xa kỳ vọng</span>
                                </div>
                            </div>

                            <div class="action-row" style="margin-top: 48px; display: flex; justify-content: flex-end;">
                                <button class="btn-primary-pro" type="submit">Gửi đánh giá ngay</button>
                            </div>
                        </form>
                    </div>
                `).join('')}
            </div>

            ${totalPages > 1 ? `
                <div class="pagination-pro">
                    <button class="btn-page" ${page === 1 ? 'disabled' : ''} id="prevReviewPage"><i class="fa-solid fa-arrow-left"></i> Trang trước</button>
                    <span class="page-indicator-pro" style="font-weight: 700; color: #523726; font-size: 1.1rem;">${page} <small style="color: #a08e82; font-weight: 500;">/ ${totalPages}</small></span>
                    <button class="btn-page" ${page === totalPages ? 'disabled' : ''} id="nextReviewPage">Trang sau <i class="fa-solid fa-arrow-right"></i></button>
                </div>
            ` : ''}
        `;

        setupReviewInteractions();
    }

    function setupReviewInteractions() {
        root.querySelectorAll('.modern-star-rating').forEach((sr) => {
            sr.addEventListener('click', (e) => {
                const star = e.target.closest('i');
                if (!star) return;
                const val = Number(star.dataset.val);
                sr.dataset.rating = val;
                sr.querySelectorAll('i').forEach((i) => i.classList.toggle('on', Number(i.dataset.val) <= val));
            });
        });

        root.querySelectorAll('.tag-item-pro').forEach((tag) => {
            tag.addEventListener('click', () => tag.classList.toggle('on'));
        });

        root.querySelectorAll('.modern-upload-zone').forEach((zone) => {
            const input = zone.querySelector('input');
            const preview = zone.nextElementSibling;
            zone.addEventListener('click', () => input.click());
            input.addEventListener('change', async () => {
                for (const file of input.files) {
                    if (file.size > 100 * 1024 * 1024) {
                        toast('File quá lớn! Vui lòng chọn file dưới 100MB.');
                        continue;
                    }
                    const url = await fileToDataUrl(file);
                    const item = document.createElement('div');
                    item.className = 'image-preview-item-pro';
                    
                    if (file.type.startsWith('video/')) {
                        item.innerHTML = `<video src="${url}" autoplay muted loop style="width:100%;height:100%;object-fit:cover;border-radius:8px;"></video><button type="button" onclick="this.parentElement.remove()"><i class="fa-solid fa-xmark"></i></button>`;
                        item.isVideo = true;
                    } else {
                        item.innerHTML = `<img src="${url}" alt=""><button type="button" onclick="this.parentElement.remove()"><i class="fa-solid fa-xmark"></i></button>`;
                        item.isVideo = false;
                    }
                    item.fileData = file;
                    preview.appendChild(item);
                }
                input.value = ''; 
            });
        });

        root.querySelector('#prevReviewPage')?.addEventListener('click', () => {
            currentPage--;
            renderPage(currentPage);
            window.scrollTo(0, 0);
        });
        root.querySelector('#nextReviewPage')?.addEventListener('click', () => {
            currentPage++;
            renderPage(currentPage);
            window.scrollTo(0, 0);
        });

        root.querySelectorAll('.review-form-pro').forEach((form) => {
            form.addEventListener('submit', async (e) => {
                e.preventDefault();
                const productId = form.dataset.productId;
                const rating = Number(form.querySelector('.modern-star-rating').dataset.rating);
                const comment = form.comment.value;
                const tags = Array.from(form.querySelectorAll('.tag-item-pro.on')).map((t) => t.textContent);
                
                const formData = new FormData();
                formData.append('product', productId);
                formData.append('order', orderId);
                formData.append('rating', rating);
                formData.append('comment', `${comment} [Đặc điểm: ${tags.join(', ')}]`);
                
                const imageItems = Array.from(form.querySelectorAll('.image-preview-item-pro'));
                let imageCount = 0;
                let hasVideo = false;
                imageItems.forEach(item => {
                    if (item.fileData) {
                        if (item.isVideo) {
                            if (!hasVideo) {
                                formData.append('video', item.fileData);
                                hasVideo = true;
                            }
                        } else {
                            if (imageCount < 5) {
                                formData.append('images', item.fileData);
                                imageCount++;
                            }
                        }
                    }
                });
                
                const submitBtn = form.querySelector('button[type="submit"]');
                const originalText = submitBtn.textContent;
                submitBtn.disabled = true;
                submitBtn.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i> Đang gửi...';

                try {
                    await fetch('/api/reviews', {
                        method: 'POST',
                        headers: {
                            'Authorization': `Bearer ${session().token}`
                        },
                        body: formData
                    }).then(res => {
                        if (!res.ok) throw new Error('Đã xảy ra lỗi khi gửi đánh giá');
                        return res.json();
                    });
                    toast('Cảm ơn bạn đã đánh giá sản phẩm!');
                    form.closest('.product-review-item').style.opacity = '0.5';
                    form.closest('.product-review-item').style.pointerEvents = 'none';
                    submitBtn.innerHTML = '<i class="fa-solid fa-check"></i> Đã gửi';
                } catch (err) {
                    toast(err.message);
                    submitBtn.disabled = false;
                    submitBtn.textContent = originalText;
                }
            });
        });
    }

    renderPage(1);
}


async function renderCancelPage() {
    const root = document.querySelector('#cancelOrderContent');
    if (!root || !requireLogin()) return;
    const orderId = qs('id');
    const { orders } = await api('/orders');
    const order = orders.find((o) => o._id === orderId);
    
    if (!order) {
        root.innerHTML = '<p class="empty-state">Không tìm thấy đơn hàng.</p>';
        return;
    }

    const ageInMs = Date.now() - new Date(order.createdAt).getTime();
    const ageInHours = ageInMs / (1000 * 60 * 60);
    const canCancel = order.orderStatus === 'pending' && ageInHours >= 24;

    root.innerHTML = `
        <div class="page-header-banner cancel-alert">
            <i class="fa-solid fa-circle-exclamation"></i>
            <div>
                <b>Đơn hàng #${orderCodeView(order)} chưa được xác nhận sau 24 giờ — bạn có thể hủy đơn</b>
                <p>Đơn hàng của bạn đã chờ ${Math.floor(ageInHours)} giờ kể từ khi đặt hàng. Vui lòng xác nhận thông tin và gửi yêu cầu hủy.</p>
            </div>
        </div>
        
        <div class="form-section cancel-order-card">
            <h3>Thông tin đơn hàng</h3>
            <table class="checkout-mini-table cancel-order-table">
                <thead><tr><th>Sản phẩm</th><th>Đơn giá</th><th>Số lượng</th><th>Thành tiền</th></tr></thead>
                <tbody>
                    ${order.items.map((i) => `
                        <tr>
                            <td><div class="prod-info"><img src="${i.image || '/images/banner1png.png'}" alt=""><div><b>${i.name}</b><small>Mã SP: ${String(i.product).slice(-6).toUpperCase()}</small></div></div></td>
                            <td>${money(i.purchasePrice)}</td>
                            <td>${i.quantity}</td>
                            <td>${money(i.itemTotal)}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
            <div class="sum-total"><span>Tổng tiền (${order.items.length} sản phẩm)</span><strong>${money(order.totalAmount)}</strong></div>
        </div>

        <div class="form-section cancel-request-card">
            <h3>Thông tin yêu cầu hủy đơn</h3>
            <form id="cancelOrderForm" class="cancel-form">
                <label>Lý do hủy đơn *</label>
                <div class="method-grid payment-grid cancel-reason-list">
                    <label class="method-card"><input type="radio" name="reason" value="Đặt nhầm sản phẩm" checked><span>Đặt nhầm sản phẩm</span></label>
                    <label class="method-card"><input type="radio" name="reason" value="Thay đổi ý định mua"><span>Thay đổi ý định mua</span></label>
                    <label class="method-card"><input type="radio" name="reason" value="Tìm được sản phẩm khác phù hợp hơn"><span>Tìm được sản phẩm khác phù hợp hơn</span></label>
                    <label class="method-card"><input type="radio" name="reason" value="Thời gian giao hàng không phù hợp"><span>Thời gian giao hàng không phù hợp</span></label>
                    <label class="method-card"><input type="radio" name="reason" value="Lý do khác"><span>Lý do khác</span></label>
                </div>
                <label>Ghi chú thêm (không bắt buộc)<textarea name="note" placeholder="Vui lòng chia sẻ thêm lý do để chúng tôi có thể phục vụ bạn tốt hơn..."></textarea></label>
                <div class="info-card cancel-info-card">
                    <h4><i class="fa-solid fa-triangle-exclamation"></i> Lưu ý quan trọng</h4>
                    <ul>
                        <li>Bạn chỉ có thể hủy đơn hàng chưa được admin xác nhận.</li>
                        <li>Sau khi đã được xác nhận hoặc đã bàn giao cho đơn vị vận chuyển, việc hủy đơn sẽ không còn khả dụng.</li>
                        <li>Tiền hoàn (nếu có) sẽ được xử lý theo chính sách hoàn tiền của Casa Decor.</li>
                    </ul>
                </div>
                <div class="action-row cancel-actions">
                    <button class="hbtn padd" type="submit" ${canCancel ? '' : 'disabled'} style="background: #be5545; color: #fff; border: 0;">Xác nhận hủy đơn</button>
                    <a href="/customers/orders.html" class="padd link-btn" style="text-align: center; border: 1px solid #efe5de; border-radius: 8px; display: flex; align-items: center; justify-content: center; height: 42px;">Quay lại</a>
                </div>
            </form>
        </div>
    `;

    root.querySelector('#cancelOrderForm')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        try {
            await api(`/orders/${orderId}/cancel`, { method: 'PATCH' });
            toast('Đã hủy đơn hàng thành công');
            location.href = '/customers/orders.html';
        } catch (err) {
            toast(err.message);
        }
    });
}

async function renderReturnPage() {
    const root = document.querySelector('#returnOrderContent');
    if (!root || !requireLogin()) return;
    const orderId = qs('id');
    const { orders } = await api('/orders');
    const order = orders.find((o) => o._id === orderId);

    if (!order || order.orderStatus !== 'completed') {
        root.innerHTML = '<p class="empty-state">Không tìm thấy đơn hàng hợp lệ để hoàn trả.</p>';
        return;
    }

    const deliveredAt = order.deliveredAt ? new Date(order.deliveredAt).getTime() : new Date(order.updatedAt).getTime();
    const ageSinceDelivered = (Date.now() - deliveredAt) / (1000 * 60 * 60 * 24);
    const daysLeft = Math.ceil(3 - ageSinceDelivered);

    root.innerHTML = `
        <div class="page-header-banner return-alert-banner">
            <i class="fa-solid fa-shield-heart"></i>
            <div>
                <b>Quyền lợi bảo vệ khách hàng</b>
                <p>Casa Decor cam kết hỗ trợ đổi trả miễn phí trong 3 ngày. Bạn còn <b>${daysLeft} ngày</b> để thực hiện yêu cầu này.</p>
            </div>
        </div>

        <div class="product-review-item">
            <h3 class="section-card-title"><i class="fa-solid fa-receipt"></i> Tóm tắt đơn hàng</h3>
            <div class="review-product-info">
                <img src="${order.items?.[0]?.image || '/images/banner1png.png'}" alt="">
                <div>
                    <h4>Đơn hàng #${orderCodeView(order)}</h4>
                    <p><i class="fa-regular fa-calendar-check"></i> Đã giao ngày: ${new Date(deliveredAt).toLocaleDateString('vi-VN')}</p>
                    <p style="margin-top: 8px;"><i class="fa-solid fa-wallet"></i> Giá trị hoàn trả tối đa: <b style="color: #a0522d; font-size: 1.1rem;">${money(order.totalAmount)}</b></p>
                </div>
            </div>
        </div>

        <div class="product-review-item" style="margin-top: 40px;">
            <h3 class="section-card-title"><i class="fa-solid fa-clipboard-question"></i> Thông tin chi tiết hoàn trả</h3>
            <form id="returnOrderForm">
                <div class="form-grid-pro" style="display: grid; grid-template-columns: 1fr 1fr; gap: 32px;">
                    <div class="field-group">
                        <label class="field-label-pro">Lý do bạn muốn hoàn trả? *</label>
                        <select name="reason" required class="modern-select" style="width: 100%; height: 56px; border-radius: 16px; border: 1px solid #efe5de; padding: 0 20px; outline: none; background: #fdfaf8;">
                            <option value="">-- Chọn lý do --</option>
                            <option value="Sản phẩm lỗi do nhà sản xuất">Lỗi từ nhà sản xuất</option>
                            <option value="Sản phẩm không đúng như mô tả">Không đúng như mô tả/ảnh</option>
                            <option value="Giao sai mẫu mã/màu sắc">Giao nhầm mẫu mã</option>
                            <option value="Bể vỡ trong quá trình vận chuyển">Hư hỏng do vận chuyển</option>
                            <option value="Khác">Lý do cá nhân khác</option>
                        </select>
                    </div>
                    <div class="field-group">
                        <label class="field-label-pro">Tình trạng kiện hàng hiện tại? *</label>
                        <select name="condition" required class="modern-select" style="width: 100%; height: 56px; border-radius: 16px; border: 1px solid #efe5de; padding: 0 20px; outline: none; background: #fdfaf8;">
                            <option value="">-- Chọn tình trạng --</option>
                            <option value="Nguyên seal/Tem mác">Nguyên seal/đầy đủ tem mác</option>
                            <option value="Đã mở hộp/Mất tem">Đã mở hộp nhưng chưa dùng</option>
                            <option value="Đã qua sử dụng">Đã qua sử dụng nhẹ</option>
                        </select>
                    </div>
                </div>

                <div class="field-group" style="margin-top: 32px;">
                    <label class="field-label-pro">Mô tả chi tiết tình huống *</label>
                    <textarea name="description" class="review-textarea" placeholder="Vui lòng cung cấp thêm thông tin để chúng tôi hỗ trợ bạn nhanh nhất có thể..." required></textarea>
                </div>
                
                <div class="field-group" style="margin-top: 32px;">
                    <label class="field-label-pro">Bằng chứng hình ảnh/video (Bắt buộc) *</label>
                    <div class="modern-upload-zone">
                        <i class="fa-solid fa-cloud-arrow-up"></i>
                        <p>Kéo thả hoặc nhấn để tải lên bằng chứng</p>
                        <input type="file" multiple class="hidden-file-input" accept="image/*,video/*" style="display:none" required>
                    </div>
                    <div class="image-preview-pro" style="display: flex; gap: 16px; flex-wrap: wrap; margin-top: 20px;"></div>
                </div>

                <div class="premium-refund-card">
                    <div class="refund-info">
                        <b>Số tiền dự kiến hoàn trả</b>
                        <p>Số tiền này sẽ được chuyển về ví/tài khoản ngân hàng của bạn sau khi xét duyệt.</p>
                    </div>
                    <div class="refund-amount">${money(order.totalAmount)}</div>
                </div>

                <div class="action-row" style="margin-top: 56px; display: flex; gap: 24px; justify-content: flex-end;">
                    <a href="/customers/profile.html?tab=orders" class="btn-outline-pro" style="height: 60px; padding: 0 40px; display: flex; align-items: center; border-radius: 40px; border: 1px solid #efe5de; font-weight: 700; color: #523726;">Hủy bỏ</a>
                    <button class="btn-primary-pro" type="submit">Gửi yêu cầu hoàn trả</button>
                </div>
            </form>
        </div>
    `;

    const zone = root.querySelector('.modern-upload-zone');
    const input = zone.querySelector('input');
    const preview = root.querySelector('.image-preview-pro');
    zone.addEventListener('click', () => input.click());
    input.addEventListener('change', async () => {
        for (const file of input.files) {
            const url = await fileToDataUrl(file);
            const item = document.createElement('div');
            item.className = 'image-preview-item-pro';
            item.innerHTML = `<img src="${url}" alt=""><button type="button" onclick="this.parentElement.remove()" style="position: absolute; top: -10px; right: -10px; width: 28px; height: 28px; background: #ff4d4f; color: #fff; border: none; border-radius: 50%; cursor: pointer; box-shadow: 0 4px 10px rgba(0,0,0,0.2);"><i class="fa-solid fa-xmark"></i></button>`;
            item.style.position = 'relative';
            item.dataset.base64 = url;
            preview.appendChild(item);
        }
    });

    root.querySelector('#returnOrderForm')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const images = Array.from(root.querySelectorAll('.image-preview-item-pro')).map((i) => i.dataset.base64);
        if (images.length === 0) return toast('Vui lòng cung cấp ít nhất 1 ảnh/video bằng chứng.');
        
        const submitBtn = e.target.querySelector('button[type="submit"]');
        const originalText = submitBtn.textContent;
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Đang xử lý...';

        try {
            const formData = Object.fromEntries(new FormData(e.target));
            await api(`/orders/${orderId}/return`, {
                method: 'PATCH',
                body: JSON.stringify({ 
                    reason: formData.reason,
                    condition: formData.condition,
                    description: formData.description,
                    images
                })
            });
            toast('Yêu cầu hoàn trả đã được ghi nhận. Casa Decor sẽ liên hệ bạn sớm nhất!');
            location.href = '/customers/profile.html?tab=orders';
        } catch (err) {
            toast(err.message);
            submitBtn.disabled = false;
            submitBtn.textContent = originalText;
        }
    });
}


async function renderInvoicePage() {
    const root = document.querySelector('#invoiceRoot');
    if (!root || !requireLogin()) return;

    const orderId = qs('id');
    const [{ orders }, me] = await Promise.all([api('/orders'), api('/auth/me')]);
    const order = orders.find((item) => item._id === orderId);
    const user = me.user || {};

    if (!order) {
        root.innerHTML = '<p class="empty-state">Không tìm thấy hóa đơn hợp lệ.</p>';
        return;
    }

    const code = orderCodeView(order);
    const invoiceNo = invoiceCodeView(order);
    const placedDate = new Date(order.createdAt);
    const address = order.shippingInfo || {};
    const buyerName = user.name || address.fullName || 'Khách hàng Casa Decor';
    const buyerEmail = user.email || CASA_CONTACT_EMAIL;
    const buyerPhone = user.phone || address.phone || '-';
    const fullAddress = shippingAddressText(address) || '-';
    const note = String(order.note || '').trim();
    const lookupCode = invoiceNo.replace('-', '');
    const statusText = paymentStatusText(order);
    const statusClass = order.paymentStatus === 'paid' ? 'paid' : 'unpaid';
    const invoiceDateText = placedDate.toLocaleString('vi-VN', {
        hour: '2-digit',
        minute: '2-digit',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    });
    const emailHref = `mailto:${encodeURIComponent(CASA_CONTACT_EMAIL)}?subject=${encodeURIComponent(`Hóa đơn ${invoiceNo} - Casa Decor`)}&body=${encodeURIComponent(`Casa Decor gửi hóa đơn ${invoiceNo} cho đơn hàng ${code}.`)}`;

    root.innerHTML = `
        <nav class="order-breadcrumb invoice-screen-only">
            <a href="/customers/index.html">Trang chủ</a><i class="fa-solid fa-angle-right"></i>
            <a href="/customers/orders.html">Đơn hàng</a><i class="fa-solid fa-angle-right"></i>
            <a href="/customers/order-detail.html?id=${order._id}">${code}</a><i class="fa-solid fa-angle-right"></i>
            <span>Hóa đơn</span>
        </nav>

        <section class="invoice-title invoice-screen-only">
            <div>
                <h1>Hóa đơn điện tử</h1>
                <p>Cảm ơn bạn đã mua sắm tại Casa Decor. Đây là hóa đơn điện tử cho đơn hàng của bạn.</p>
            </div>
            <span class="invoice-status ${statusClass}"><i class="fa-solid fa-circle-check"></i> ${statusText}</span>
        </section>

        <section class="invoice-layout">
            <div class="invoice-document" id="invoiceDocument">
                <div class="invoice-print-head">
                    <div class="invoice-brand-print">
                        <span class="invoice-logo">${casaLogoSvg()}</span>
                        <div>
                            <b>CÔNG TY TNHH CASA DECOR</b>
                            <span><i class="fa-solid fa-phone"></i> Hotline: 0336 881 795</span>
                            <span><i class="fa-solid fa-envelope"></i> Email: ${CASA_CONTACT_EMAIL}</span>
                            <span><i class="fa-solid fa-location-dot"></i> Địa chỉ: GS1 VinhomeSmart City Tây Mỗ, Nam Từ Liêm, Hà Nội</span>
                        </div>
                    </div>
                    <div class="invoice-print-title">
                        <h2>HÓA ĐƠN BÁN HÀNG</h2>
                        <p>(HÓA ĐƠN ĐIỆN TỬ)</p>
                    </div>
                </div>

                <div class="invoice-meta-grid">
                    <article><i class="fa-regular fa-file-lines"></i><span>Số hóa đơn</span><b>${invoiceNo}</b></article>
                    <article><i class="fa-regular fa-clipboard"></i><span>Mã đơn hàng</span><b>${code}</b></article>
                    <article><i class="fa-regular fa-calendar-days"></i><span>Ngày lập hóa đơn</span><b>${invoiceDateText}</b></article>
                    <article><i class="fa-regular fa-credit-card"></i><span>Phương thức thanh toán</span><b>${paymentMethodText(order)}</b></article>
                    <article><i class="fa-regular fa-circle-check"></i><span>Trạng thái thanh toán</span><b class="${statusClass}">${statusText}</b></article>
                </div>

                <div class="invoice-party-grid">
                    <article>
                        <h3><i class="fa-regular fa-user"></i> Thông tin người mua</h3>
                        <p><span>Họ và tên</span><b>${escapeHtml(buyerName)}</b></p>
                        <p><span>Email</span><b>${escapeHtml(buyerEmail)}</b></p>
                        <p><span>Số điện thoại</span><b>${escapeHtml(buyerPhone)}</b></p>
                        <p><span>Địa chỉ</span><b>${escapeHtml(fullAddress)}</b></p>
                    </article>
                    <article>
                        <h3><i class="fa-solid fa-truck"></i> Thông tin bên nhận hàng</h3>
                        <p><span>Họ tên</span><b>${escapeHtml(address.fullName || buyerName)}</b></p>
                        <p><span>Số điện thoại</span><b>${escapeHtml(address.phone || buyerPhone)}</b></p>
                        <p><span>Địa chỉ nhận hàng</span><b>${escapeHtml(fullAddress)}</b></p>
                    </article>
                </div>

                <table class="invoice-table">
                    <thead>
                        <tr>
                            <th>STT</th>
                            <th>Tên sản phẩm</th>
                            <th>Mã SKU</th>
                            <th>Số lượng</th>
                            <th>Đơn giá</th>
                            <th>Thành tiền</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${order.items.map((item, index) => `
                            <tr>
                                <td>${index + 1}</td>
                                <td><div class="invoice-product"><img src="${item.image || '/images/banner1png.png'}" alt=""><span>${escapeHtml(item.name)}</span></div></td>
                                <td>${code}-${String(index + 1).padStart(2, '0')}</td>
                                <td>${item.quantity}</td>
                                <td>${money(item.purchasePrice)}</td>
                                <td>${money(item.itemTotal)}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>

                <div class="invoice-bottom-grid">
                    <article class="invoice-payment-note">
                        <h3><i class="fa-regular fa-credit-card"></i> Phương thức thanh toán</h3>
                        <p>${paymentMethodText(order)}</p>
                        ${paymentInstructionText(order)}
                    </article>
                    <article class="invoice-payment-note">
                        <h3><i class="fa-regular fa-note-sticky"></i> Ghi chú</h3>
                        ${note ? `<p>${escapeHtml(note)}</p>` : '<p class="invoice-muted-note">Không có ghi chú từ khách hàng.</p>'}
                        <p>Hóa đơn được tạo tự động từ hệ thống và có giá trị sử dụng như hóa đơn giấy.</p>
                    </article>
                    <article class="invoice-total-box">
                        <p><span>Tạm tính</span><b>${money(order.itemsTotal)}</b></p>
                        <p><span>Phí vận chuyển</span><b>${money(order.shippingFee)}</b></p>
                        <p><span>Giảm giá</span><b>${discountMoney(order.discountAmount)}</b></p>
                        <strong><span>Tổng cộng thanh toán</span><b>${money(order.totalAmount)}</b></strong>
                    </article>
                </div>

                <div class="invoice-footer-box">
                    <div class="invoice-thanks"><b><i class="fa-solid fa-leaf"></i>Thank you!<i class="fa-solid fa-sparkles"></i></b><span>Cảm ơn Quý khách và hẹn gặp lại!</span></div>
                    <div class="invoice-sign"><b>XÁC NHẬN CỦA CỬA HÀNG</b><span>Casa Decor</span><em>Casa Decor</em></div>
                    <div class="invoice-qr"><span>QR</span><b>Mã tra cứu hóa đơn</b><strong>${lookupCode}</strong><small>Quét mã QR để tra cứu hóa đơn điện tử</small></div>
                    <div class="invoice-stamp">Casa Decor</div>
                </div>

                <div class="invoice-print-bar">
                    <span><i class="fa-solid fa-phone"></i> Hotline: 0336 881 795</span>
                    <span><i class="fa-solid fa-envelope"></i> Email: ${CASA_CONTACT_EMAIL}</span>
                    <span><i class="fa-solid fa-location-dot"></i> Địa chỉ: GS1 VinhomeSmart City Tây Mỗ, Nam Từ Liêm, Hà Nội</span>
                </div>
            </div>

            <aside class="invoice-actions invoice-screen-only">
                <article>
                    <h2><i class="fa-solid fa-rotate"></i> Thao tác</h2>
                    <button class="hbtn clay" data-invoice-print type="button"><i class="fa-solid fa-download"></i> Tải PDF</button>
                    <button class="hbtn outline" data-invoice-print type="button"><i class="fa-solid fa-print"></i> In hóa đơn</button>
                    <a class="hbtn outline" href="${emailHref}"><i class="fa-regular fa-envelope"></i> Gửi email</a>
                    <a class="hbtn outline" href="/customers/order-detail.html?id=${order._id}"><i class="fa-solid fa-arrow-left"></i> Quay lại chi tiết đơn hàng</a>
                </article>
                <article class="invoice-note-card">
                    <h3>Lưu ý về hóa đơn</h3>
                    <p>Hóa đơn điện tử có giá trị pháp lý như hóa đơn giấy.</p>
                    <p>Vui lòng kiểm tra thông tin trước khi sử dụng.</p>
                    <p>Nếu có sai sót, liên hệ hỗ trợ trong vòng 24h.</p>
                    <p>Casa Decor cảm ơn bạn đã tin tưởng và đồng hành.</p>
                </article>
            </aside>
        </section>
    `;

    root.querySelectorAll('[data-invoice-print]').forEach((button) => {
        button.addEventListener('click', () => window.print());
    });
}

async function renderOrderDetailPage() {
    const root = document.querySelector('#orderDetailContent');
    if (!root || !requireLogin()) return;
    const orderId = qs('id');
    const placed = qs('placed');
    const paymentResult = qs('payment');
    const { orders } = await api('/orders');
    const order = orders.find((item) => item._id === orderId);

    if (!order) {
        root.innerHTML = '<p class="empty-state">Không tìm thấy đơn hàng.</p>';
        return;
    }

    const code = orderCodeView(order);
    const placedDate = new Date(order.createdAt);
    const updatedDate = new Date(order.updatedAt || order.createdAt);
    const statusSteps = [
        ['pending', 'Đặt hàng', 'fa-solid fa-check'],
        ['processing', 'Đang xử lý', 'fa-solid fa-check'],
        ['shipping', 'Đang giao', 'fa-solid fa-truck-fast'],
        ['completed', 'Hoàn tất', 'fa-solid fa-check-double']
    ];
    const statusIndex = statusSteps.findIndex(([status]) => status === order.orderStatus);
    const isCancelled = order.orderStatus === 'cancelled';
    const isDelivered = order.orderStatus === 'completed';
    const deliveredAt = order.deliveredAt ? new Date(order.deliveredAt).getTime() : new Date(order.updatedAt).getTime();
    const canReturn = isDelivered && ((Date.now() - deliveredAt) / (1000 * 60 * 60 * 24)) <= 3;
    const canCancel = ['pending', 'confirmed'].includes(order.orderStatus);
    const canRetryVnpay = canPayVnpayAgain(order);
    if (sessionStorage.getItem(CASA_PENDING_VNPAY_ORDER_KEY) === order._id && !canRetryVnpay) {
        sessionStorage.removeItem(CASA_PENDING_VNPAY_ORDER_KEY);
    }
    const address = order.shippingInfo || {};
    const customerNote = String(order.note || '').trim();
    const activeStep = Math.max(statusIndex, 0);
    const trackingRows = [
        [updatedDate, orderStatusText(order), 'Đơn hàng đang được cập nhật bởi Casa Decor.'],
        [placedDate, 'Đặt hàng thành công', 'Casa Decor đã nhận được thông tin đơn hàng.'],
        [placedDate, 'Đang chuẩn bị', 'Đơn hàng đã được ghi nhận và đang chờ xử lý.']
    ];
    const paymentNotice = (() => {
        if (paymentResult === 'success') {
            return `<section class="order-success-banner"><i class="fa-solid fa-circle-check"></i><div><b>Thanh toán VNPay thành công</b><p>Giao dịch sandbox đã được xác nhận. Đơn #${code} hiện có trạng thái thanh toán: đã thanh toán.</p></div></section>`;
        }
        if (paymentResult === 'failed') {
            return `<section class="order-success-banner payment-failed"><i class="fa-solid fa-triangle-exclamation"></i><div><b>Thanh toán VNPay không thành công</b><p>Giao dịch sandbox bị hủy hoặc thất bại. Đơn #${code} vẫn được giữ ở trạng thái chưa thanh toán để bạn có thể thanh toán lại.</p></div></section>`;
        }
        if (paymentResult === 'invalid') {
            return `<section class="order-success-banner payment-failed"><i class="fa-solid fa-triangle-exclamation"></i><div><b>Không xác minh được giao dịch</b><p>VNPay trả về dữ liệu không hợp lệ hoặc sai chữ ký.</p></div></section>`;
        }
        return '';
    })();

    root.innerHTML = `
        ${paymentNotice}
        ${canRetryVnpay ? `<section class="order-success-banner payment-failed"><i class="fa-solid fa-wallet"></i><div><b>Đơn VNPay chưa thanh toán</b><p>Nếu bạn bấm quay lại, đóng trang VNPay, nhập sai thông tin thẻ hoặc link cũ hết hạn, đơn vẫn được giữ lại. Bạn có thể tạo liên kết VNPay mới cho chính đơn này.</p><button class="hbtn clay" data-vnpay-pay-again="${order._id}" type="button"><i class="fa-solid fa-credit-card"></i> Thanh toán lại VNPay</button></div></section>` : ''}
        ${placed ? `<section class="order-success-banner"><i class="fa-solid fa-circle-check"></i><div><b>Đặt hàng thành công</b><p>Casa Decor đã ghi nhận đơn #${code}. Bạn có thể theo dõi trạng thái đơn tại đây.</p></div></section>` : ''}
        <nav class="order-breadcrumb"><a href="/customers/index.html">Trang chủ</a><i class="fa-solid fa-angle-right"></i><a href="/customers/orders.html">Tài khoản</a><i class="fa-solid fa-angle-right"></i><a href="/customers/orders.html">Đơn hàng của tôi</a><i class="fa-solid fa-angle-right"></i><span>Chi tiết đơn hàng</span></nav>
        <section class="order-detail-title">
            <h1>Chi tiết đơn hàng</h1>
            <p>Đơn hàng #${code}</p>
        </section>

        <section class="order-detail-status-card">
            <div class="order-current-status ${order.orderStatus}">
                <i class="${isCancelled ? 'fa-regular fa-circle-xmark' : 'fa-solid fa-truck-fast'}"></i>
                <div>
                    <b>${orderStatusText(order)}</b>
                    <span>${isDelivered ? 'Đã giao hàng' : isCancelled ? 'Đơn đã hủy' : 'Dự kiến giao hàng'}</span>
                    <strong>${new Date(isDelivered ? deliveredAt : Date.now() + 86400000 * 2).toLocaleDateString('vi-VN')}</strong>
                </div>
            </div>
            <div class="order-progress-track ${isCancelled ? 'cancelled' : ''}">
                ${statusSteps.map(([status, label, icon], index) => `
                    <div class="${!isCancelled && index <= activeStep ? 'done' : ''} ${status === order.orderStatus ? 'current' : ''}">
                        <span><i class="${icon}"></i></span>
                        <b>${label}</b>
                        <small>${index <= activeStep ? placedDate.toLocaleDateString('vi-VN') : ''}</small>
                    </div>
                `).join('')}
            </div>
        </section>

        <section class="order-detail-layout">
            <div class="order-detail-maincol">
                <article class="order-detail-panel">
                    <h2>Sản phẩm trong đơn</h2>
                    <table class="order-products-table">
                        <thead><tr><th>Sản phẩm</th><th>Mã sản phẩm</th><th>Phân loại</th><th>Đơn giá</th><th>Số lượng</th><th>Thành tiền</th></tr></thead>
                        <tbody>
                            ${order.items.map((item, index) => `
                                <tr>
                                    <td><div class="od-product"><img src="${item.image || '/images/banner1png.png'}" alt=""><span>${item.name}</span></div></td>
                                    <td>${code}-${String(index + 1).padStart(2, '0')}</td>
                                    <td>Tiêu chuẩn</td>
                                    <td>${money(item.purchasePrice)}</td>
                                    <td>${item.quantity}</td>
                                    <td>${money(item.itemTotal)}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </article>

                <article class="order-detail-panel order-shipping-panel">
                    <div class="section-head"><h2>Thông tin giao hàng</h2><a href="/customers/profile.html?tab=addresses"><i class="fa-solid fa-pen"></i> Chỉnh sửa</a></div>
                    <div class="od-info-grid">
                        <div><span>Người nhận</span><b>${address.fullName || '-'}</b><span>Số điện thoại</span><b>${address.phone || '-'}</b></div>
                        <div><span>Địa chỉ giao hàng</span><b>${[address.address, address.ward, address.district, address.city].filter(Boolean).join(', ') || '-'}</b><span>Ghi chú giao hàng</span><b>${customerNote ? escapeHtml(customerNote) : '-'}</b></div>
                    </div>
                </article>

                <article class="order-detail-panel order-history-panel">
                    <h2>Lịch sử đơn hàng</h2>
                    <div class="od-history">
                        ${trackingRows.map(([date, title, desc], index) => `
                            <div class="${index === 0 ? 'active' : ''}">
                                <span>${date.toLocaleDateString('vi-VN')} ${date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}</span>
                                <b>${title}</b>
                                <p>${desc}</p>
                            </div>
                        `).join('')}
                    </div>
                </article>

                <article class="order-detail-panel order-note-panel">
                    <h2>Ghi chú đơn hàng</h2>
                    <p>${customerNote ? escapeHtml(customerNote) : 'Khách hàng không để lại ghi chú.'}</p>
                </article>
            </div>

            <aside class="order-detail-sidecol">
                <article class="order-detail-panel order-summary-card">
                    <h2><i class="fa-solid fa-receipt"></i> Tóm tắt thanh toán</h2>
                    <p><span>Tạm tính</span><b>${money(order.itemsTotal)}</b></p>
                    <p><span>Phí vận chuyển</span><b>${money(order.shippingFee)}</b></p>
                    <p class="discount"><span>Giảm giá</span><b>${discountMoney(order.discountAmount)}</b></p>
                    <strong><span>Tổng cộng</span><b>${money(order.totalAmount)}</b></strong>
                    <p><span>Phương thức thanh toán</span><b>${paymentShortText(order)}</b></p>
                    <p><span>Trạng thái thanh toán</span><em class="${order.paymentStatus === 'paid' ? 'paid' : 'unpaid'}">${order.paymentStatus === 'paid' ? 'Đã thanh toán' : 'Chưa thanh toán'}</em></p>
                </article>

                <article class="order-detail-panel order-info-card">
                    <h2><i class="fa-regular fa-rectangle-list"></i> Thông tin đơn hàng</h2>
                    <p><span>Ngày đặt hàng</span><b>${placedDate.toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric' })}</b></p>
                    <p><span>Mã đơn hàng</span><b>${code}</b></p>
                    <p><span>Đơn vị vận chuyển</span><b>Giao Hàng Nhanh</b></p>
                    <p><span>Mã vận đơn</span><b>GHN${String(order._id).slice(-8).toUpperCase()}</b></p>
                </article>

                <div class="order-detail-actions">
                    <a href="/customers/order-detail.html?id=${order._id}" class="hbtn clay"><i class="fa-solid fa-location-dot"></i> Theo dõi đơn</a>
                    <a href="/customers/contact.html" class="hbtn outline"><i class="fa-solid fa-headset"></i> Liên hệ hỗ trợ</a>
                    ${canRetryVnpay ? `<button class="hbtn clay" data-vnpay-pay-again="${order._id}" type="button"><i class="fa-solid fa-credit-card"></i> Thanh toán lại VNPay</button>` : ''}
                    <a href="/customers/invoice.html?id=${order._id}" class="hbtn outline"><i class="fa-regular fa-file-lines"></i> Tải hóa đơn</a>
                    ${canCancel ? `<a href="/customers/cancel-order.html?id=${order._id}" class="hbtn outline"><i class="fa-regular fa-circle-xmark"></i> Hủy đơn hàng</a>` : ''}
                    ${canReturn ? `<a href="/customers/return-request.html?id=${order._id}" class="hbtn outline">Hoàn trả</a>` : ''}
                    ${isDelivered ? `<a href="/customers/review.html?id=${order._id}" class="hbtn outline">Đánh giá</a>` : ''}
                </div>
            </aside>
        </section>
    `;

    root.querySelectorAll('[data-vnpay-pay-again]').forEach((button) => {
        button.addEventListener('click', () => payVnpayOrder(button.dataset.vnpayPayAgain, button));
    });
}

const supportState = {
    tickets: [],
    selectedId: null,
    filter: 'all',
    q: ''
};

const supportStatusMeta = {
    pending: { label: 'Chờ phản hồi', className: 'pending' },
    processing: { label: 'Đang xử lý', className: 'processing' },
    resolved: { label: 'Đã giải quyết', className: 'resolved' }
};

function supportTicketCode(contact) {
    return '#CS' + String(contact?._id || '000000000000').slice(-10).toUpperCase();
}

function supportDate(value) {
    if (!value) return '';
    return new Date(value).toLocaleString('vi-VN', {
        hour: '2-digit',
        minute: '2-digit',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    });
}

function supportIdentity() {
    const current = session();
    return {
        fullName: current?.user?.name || '',
        email: current?.user?.email || '',
        phone: current?.user?.phone || ''
    };
}
function prefillSupportForm(form) {
    if (!form) return;
    const identity = supportIdentity();
    if (identity.fullName && form.fullName) form.fullName.value = identity.fullName;
    if (identity.email && form.email) form.email.value = identity.email;
    if (identity.phone && form.phone) form.phone.value = identity.phone;
}

function filteredSupportTickets() {
    const needle = normalizeSearch(supportState.q);
    return supportState.tickets.filter((ticket) => {
        const matchesFilter = supportState.filter === 'all'
            || (supportState.filter === 'high' ? ticket.priority === 'high' : ticket.status === supportState.filter);
        const haystack = normalizeSearch([
            supportTicketCode(ticket),
            ticket.subject,
            ticket.message,
            ticket.relatedOrderCode
        ].join(' '));
        return matchesFilter && (!needle || haystack.includes(needle));
    });
}

function renderSupportStats(stats = {}) {
    const open = stats.open ?? supportState.tickets.filter((item) => item.status !== 'resolved').length;
    const replied = stats.replied ?? supportState.tickets.filter((item) => (item.replies || []).some((reply) => reply.sender === 'admin')).length;
    const avg = stats.avgFirstResponseMinutes || 15;
    const avgText = avg < 60 ? `${Math.round(avg)} phút` : `${(avg / 60).toFixed(1)} giờ`;
    const setText = (id, value) => {
        const node = document.getElementById(id);
        if (node) node.textContent = value;
    };
    setText('supportOpenCount', open);
    setText('supportRepliedCount', replied);
    setText('supportAvgTime', avgText);
}

function renderSupportTickets(stats = {}) {
    const list = document.getElementById('supportTicketList');
    const recent = document.getElementById('supportRecentRows');
    if (!list) return;

    renderSupportStats(stats);
    const tickets = filteredSupportTickets();
    if (!tickets.length) {
        list.innerHTML = `<div class="support-empty"><i class="fa-solid fa-inbox"></i><p>Chưa có yêu cầu phù hợp. Hãy tạo yêu cầu mới để Casa Decor hỗ trợ bạn.</p></div>`;
        if (recent) recent.innerHTML = '<p class="support-muted">Chưa có lịch sử yêu cầu.</p>';
        renderSupportDetail(null);
        return;
    }

    if (!supportState.selectedId || !tickets.some((item) => item._id === supportState.selectedId)) {
        supportState.selectedId = tickets[0]._id;
    }

    list.innerHTML = tickets.map((ticket) => {
        const meta = supportStatusMeta[ticket.status] || supportStatusMeta.pending;
        return `
            <button class="support-ticket ${supportState.selectedId === ticket._id ? 'on' : ''}" type="button" data-ticket-id="${escapeHtml(ticket._id)}">
                <span class="support-ticket-icon"><i class="fa-regular fa-message"></i></span>
                <span>
                    <b>${supportTicketCode(ticket)}</b>
                    <strong>${escapeHtml(ticket.subject || 'Yêu cầu hỗ trợ')}</strong>
                    <small>${escapeHtml(ticket.message || '').slice(0, 68)}</small>
                </span>
                <em class="${meta.className}">${meta.label}</em>
                <i class="fa-solid fa-chevron-right"></i>
            </button>
        `;
    }).join('');

    if (recent) {
        recent.innerHTML = tickets.slice(0, 4).map((ticket) => {
            const meta = supportStatusMeta[ticket.status] || supportStatusMeta.pending;
            return `
                <button type="button" data-ticket-id="${escapeHtml(ticket._id)}">
                    <span class="support-recent-code">${supportTicketCode(ticket)}</span>
                    <span class="support-recent-main">
                        <b>${escapeHtml(ticket.subject || 'Yêu cầu hỗ trợ')}</b>
                        <small>${supportDate(ticket.updatedAt || ticket.createdAt)}</small>
                    </span>
                    <em class="${meta.className}">${meta.label}</em>
                </button>
            `;
        }).join('');
    }

    renderSupportDetail(tickets.find((ticket) => ticket._id === supportState.selectedId));
}

function supportAvatarMarkup(src, name, isAdmin = false) {
    const safeSrc = String(src || '').trim();
    if (safeSrc) {
        return `<img src="${escapeHtml(safeSrc)}" alt="${escapeHtml(name || (isAdmin ? 'Casa Decor' : 'Khach hang'))}">`;
    }
    return isAdmin ? '<i class="fa-solid fa-house-chimney-window"></i>' : '<i class="fa-regular fa-user"></i>';
}

function renderSupportConversation(ticket) {
    const customerAvatar = ticket.customer?.avatar || ticket.customerAvatar || '';
    const messages = [{
        sender: 'customer',
        senderName: ticket.fullName || 'Khach hang',
        senderAvatar: customerAvatar,
        message: ticket.message,
        createdAt: ticket.createdAt
    }, ...(ticket.replies || [])];

    return messages.map((message, index) => {
        const isAdmin = message.sender === 'admin';
        const senderName = isAdmin ? (message.senderName || 'Casa Decor') : (message.senderName || ticket.fullName || 'Khách hàng');
        const avatar = supportAvatarMarkup(isAdmin ? message.senderAvatar : (message.senderAvatar || customerAvatar), senderName, isAdmin);
        const isFirstMessage = index === 0;
        const attachmentHtml = (isFirstMessage && ticket.relatedOrderCode) 
            ? `<div style="margin-top: 8px; padding: 6px 10px; background: #fff8f2; border: 1px solid #f2e6de; border-radius: 8px; display: inline-flex; align-items: center; gap: 8px; color: #a1887f; font-size: 0.85em;"><i class="fa-solid fa-box-open" style="color: #d68b6d;"></i><span>Đơn hàng đính kèm:</span><strong style="color: #6d4c41;">#${escapeHtml(ticket.relatedOrderCode)}</strong></div>`
            : '';
        
        return `
            <div class="support-message ${isAdmin ? 'admin' : 'customer'}">
                <div class="support-avatar">${avatar}</div>
                <div class="support-message-body">
                    <p><b>${escapeHtml(senderName)}</b><small>${supportDate(message.createdAt)}</small></p>
                    <div class="support-bubble">
                        ${escapeHtml(message.message)}
                        ${attachmentHtml}
                    </div>
                </div>
            </div>
        `;

    }).join('');
}

function renderSupportDetail(ticket) {
    const detail = document.getElementById('supportDetail');
    if (!detail) return;
    if (!ticket) {
        detail.innerHTML = `
            <div class="support-empty chat-empty">
                <i class="fa-regular fa-comments"></i>
                <h2>Tạo yêu cầu hỗ trợ mới</h2>
                <p>Gửi thông tin thật từ tài khoản hoặc email của bạn để Casa Decor theo dõi và phản hồi tại đây.</p>
                <form id="contactForm" class="support-inline-form">
                    <div class="form-pair"><input name="fullName" placeholder="Họ tên" required><input name="phone" placeholder="Số điện thoại"></div>
                    <input name="email" type="email" placeholder="Email" required>
                    <select name="category" aria-label="Loại yêu cầu">
                        <option value="consulting">Tư vấn mua hàng</option>
                        <option value="order">Hỗ trợ đơn hàng</option>
                        <option value="warranty">Bảo hành / đổi trả</option>
                        <option value="complaint">Khiếu nại</option>
                        <option value="feedback">Góp ý</option>
                    </select>
                    <div id="orderSelectContainer" class="order-select-container-rich" style="display: none;">
                        <label class="rich-label">Đơn hàng cần hỗ trợ</label>
                        <div id="customerOrderList" style="max-height: 180px; overflow-y: auto;"></div>
                        <div id="loginToSeeOrdersMsg">Vui lòng đăng nhập để có thể chọn nhanh đơn hàng của bạn.</div>
                        <input type="text" name="relatedOrderCode" class="order-manual-input" placeholder="Hoặc nhập tay mã đơn hàng (VD: CSDC...)">
                    </div>
                    <input name="subject" placeholder="Tiêu đề yêu cầu">
                    <textarea name="message" placeholder="Nội dung cần hỗ trợ" required></textarea>
                    <input type="hidden" name="source" value="website">
                    <button class="auth-submit" type="submit"><i class="fa-regular fa-paper-plane"></i> Gửi yêu cầu</button>
                </form>
            </div>
        `;
        const form = detail.querySelector('#contactForm');
        prefillSupportForm(form);
        bindSupportContactForm(form);
        return;
    }

    const meta = supportStatusMeta[ticket.status] || supportStatusMeta.pending;
    detail.innerHTML = `
        <div class="support-chat-head">
            <div>
                <small>Yêu cầu ${supportTicketCode(ticket)}</small>
                <h2>${escapeHtml(ticket.subject || 'Yêu cầu hỗ trợ')}</h2>
                <p><i class="fa-regular fa-user"></i> ${escapeHtml(ticket.fullName || '')} <span>·</span> <i class="fa-regular fa-envelope"></i> ${escapeHtml(ticket.email || '')}</p>
            </div>
            <button type="button" aria-label="Tùy chọn"><i class="fa-solid fa-ellipsis-vertical"></i></button>
        </div>
        <div class="support-order-line">
            <span>Trạng thái: <b class="${meta.className}">${meta.label}</b></span>
            ${ticket.relatedOrderCode ? `<span>Đơn hàng liên quan: <b>${escapeHtml(ticket.relatedOrderCode)}</b></span>` : ''}
            <span>Ngày tạo: <b>${supportDate(ticket.createdAt)}</b></span>
        </div>
        <div class="support-thread">${renderSupportConversation(ticket)}</div>
        <form id="supportReplyForm" class="support-reply-box" data-ticket-id="${escapeHtml(ticket._id)}">
            <textarea name="message" placeholder="Nhập nội dung phản hồi..." required></textarea>
            <div>
                <span><i class="fa-solid fa-paperclip"></i><i class="fa-regular fa-face-smile"></i></span>
                <button type="submit"><i class="fa-regular fa-paper-plane"></i> Gửi phản hồi</button>
            </div>
        </form>
        <div class="support-chat-actions">
            <button type="button" data-support-close><i class="fa-regular fa-circle-check"></i> Đóng yêu cầu</button>
            <button type="button" data-support-new><i class="fa-regular fa-square-plus"></i> Tạo yêu cầu mới</button>
        </div>
    `;
}

async function loadSupportTickets() {
    const root = document.querySelector('[data-support-root]');
    if (!root) return;
    const current = session();
    // Chỉ hiển thị yêu cầu hỗ trợ khi đã đăng nhập
    if (!current) {
        renderSupportStats({ open: 0, replied: 0 });
        supportState.tickets = [];
        renderSupportTickets();
        return;
    }
    const identity = supportIdentity();
    if (!identity.email) {
        renderSupportStats({ open: 0, replied: 0 });
        renderSupportTickets();
        return;
    }

    const params = new URLSearchParams({ email: identity.email });
    if (identity.phone) params.set('phone', identity.phone);
    const data = await api(`/contact/tickets?${params.toString()}`);
    supportState.tickets = data.contacts || [];
    renderSupportTickets(data.stats || {});
}

function setupSupportInteractions() {
    const root = document.querySelector('[data-support-root]');
    if (!root) return;

    root.addEventListener('click', async (event) => {
        const ticketBtn = event.target.closest('button[data-ticket-id]');
        if (ticketBtn) {
            supportState.selectedId = ticketBtn.dataset.ticketId;
            renderSupportTickets();
            return;
        }

        const tab = event.target.closest('[data-support-filter]');
        if (tab) {
            document.querySelectorAll('[data-support-filter]').forEach((item) => item.classList.toggle('on', item === tab));
            supportState.filter = tab.dataset.supportFilter;
            renderSupportTickets();
            return;
        }

        const template = event.target.closest('[data-support-template]');
        if (template) {
            const form = document.getElementById('contactForm');
            if (!form) {
                supportState.selectedId = null;
                renderSupportTickets();
            }
            const nextForm = document.getElementById('contactForm');
            if (!nextForm) return;
            const subjectMap = {
                consulting: 'Cần tư vấn sản phẩm decor',
                order: 'Hỗ trợ tra cứu đơn hàng',
                warranty: 'Yêu cầu bảo hành / đổi trả'
            };
            nextForm.category.value = template.dataset.supportTemplate;
            nextForm.subject.value = subjectMap[template.dataset.supportTemplate] || 'Yêu cầu hỗ trợ';
            nextForm.category.dispatchEvent(new Event('change'));
            nextForm.message.focus();
            return;
        }

        const newBtn = event.target.closest('[data-support-new]');
        if (newBtn) {
            supportState.selectedId = null;
            renderSupportDetail(null);
        }
    });

    const search = document.getElementById('supportSearch');
    if (search) {
        search.addEventListener('input', debounce(() => {
            supportState.q = search.value;
            renderSupportTickets();
        }, 180));
    }

    const reload = document.getElementById('supportReloadBtn');
    if (reload) {
        reload.addEventListener('click', () => loadSupportTickets().catch((error) => toast(error.message)));
    }

    root.addEventListener('submit', async (event) => {
        if (event.target.id !== 'supportReplyForm') return;
        event.preventDefault();
        const form = event.target;
        const identity = supportIdentity();
        const message = form.message.value.trim();
        if (!message) return;
        const data = await api(`/contact/${form.dataset.ticketId}/reply`, {
            method: 'POST',
            body: JSON.stringify({ message, email: identity.email, phone: identity.phone })
        });
        const index = supportState.tickets.findIndex((item) => item._id === data.contact._id);
        if (index >= 0) supportState.tickets[index] = data.contact;
        form.reset();
        renderSupportTickets();
        toast('Đã gửi phản hồi');
    });
}

function bindSupportContactForm(form) {
    if (!form || form.dataset.bound === 'true') return;
    form.dataset.bound = 'true';
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        try {
            const values = Object.fromEntries(new FormData(form));
            const data = await api('/contact', { method: 'POST', body: JSON.stringify(values) });
            supportState.selectedId = data.contact?._id || null;
            form.reset();
            prefillSupportForm(form);
            await loadSupportTickets();
            toast('Đã gửi yêu cầu hỗ trợ');
        } catch (error) {
            toast(error.message);
        }
    });

    const categorySelect = form.querySelector('[name="category"]');
    const orderSelectContainer = form.querySelector('#orderSelectContainer');
    const orderInput = form.querySelector('[name="relatedOrderCode"]');
    const customerOrderList = form.querySelector('#customerOrderList');
    const loginMsg = form.querySelector('#loginToSeeOrdersMsg');

    if (categorySelect && orderSelectContainer) {
        categorySelect.addEventListener('change', async () => {
            if (categorySelect.value === 'order' || categorySelect.value === 'warranty') {
                orderSelectContainer.style.display = 'block';
                const currentUser = session()?.user;
                if (currentUser) {
                    if (loginMsg) loginMsg.style.display = 'none';
                    if (customerOrderList && !customerOrderList.hasChildNodes()) {
                        try {
                            const { orders } = await api('/orders?limit=20');
                            if (orders && orders.length > 0) {
                                customerOrderList.innerHTML = orders.map(o => {
                                    const dateStr = new Date(o.createdAt).toLocaleDateString('vi-VN');
                                    return `
                                        <label class="cute-order-card">
                                            <input type="radio" name="orderSelectRadio" value="${o.orderCode}" onchange="this.closest('form').querySelector('[name=relatedOrderCode]').value=this.value">
                                            <div class="cute-order-content">
                                                <div class="cute-order-header">
                                                    <span class="cute-order-code">📦 ${o.orderCode}</span>
                                                    <span class="cute-order-date">${dateStr}</span>
                                                </div>
                                                <div class="cute-order-price">Tổng thanh toán: <b>${money(o.totalAmount)}</b></div>
                                            </div>
                                            <div class="cute-check-icon">
                                                <i class="fa-solid fa-circle-check"></i>
                                            </div>
                                        </label>
                                    `;
                                }).join('');
                            } else {
                                customerOrderList.innerHTML = '<div style="font-size: 0.85em; color: #a1887f; text-align: center; padding: 10px; font-style: italic;">Bạn chưa có đơn hàng nào.</div>';
                            }
                        } catch (e) { }
                    }
                } else {
                    if (loginMsg) loginMsg.style.display = 'block';
                    if (customerOrderList) customerOrderList.innerHTML = '';
                }
            } else {
                orderSelectContainer.style.display = 'none';
                if (orderInput) orderInput.value = '';
            }
        });
        categorySelect.dispatchEvent(new Event('change'));
    }
}

function setupContact() {
    const form = document.querySelector('#contactForm');
    if (!form) return;
    prefillSupportForm(form);
    setupSupportInteractions();
    loadSupportTickets().catch((error) => toast(error.message));
    bindSupportContactForm(form);
}

function setupFloatingZalo() {
    if (document.querySelector('.zalo-float')) return;
    const link = document.createElement('a');
    link.className = 'zalo-float';
    link.href = 'https://zalo.me/0336881795';
    link.target = '_blank';
    link.rel = 'noopener';
    link.setAttribute('aria-label', 'Kết nối Zalo Casa Decor');
    link.innerHTML = '<span class="zalo-float-core">Zalo</span>';
    document.body.appendChild(link);
}

loadShell();
setupCustomerSearch();
setupHeroSlideshow();
renderProducts();
renderHomeProducts();
renderDetail();
renderCart();
renderOrders();
renderWishlist();
renderSimpleLists();
renderBlogDetail();
renderProfile();
renderInvoicePage();
renderOrderDetailPage();
setupContact();
// setupFloatingZalo(); // Disabled - Using AI Chatbot instead
setupGoongAddressAutocomplete(document);

document.querySelectorAll('.nw-form').forEach((form) => {
    form.addEventListener('submit', async (event) => {
        event.preventDefault();
        const email = form.querySelector('input[type="email"]')?.value;
        await api('/newsletter', { method: 'POST', body: JSON.stringify({ email }) });
        form.reset();
        toast('Đã đăng ký nhận bản tin');
    });
});

