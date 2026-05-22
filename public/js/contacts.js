/* ====================================================================
   CONTACTS MANAGER - 3-Column Layout (contacts.js)
   Casa Decor Admin - Quản lý liên hệ khách hàng
   ==================================================================== */

(function () {
    'use strict';

    // ─── State ───
    const cmState = {
        contacts: [],
        selectedId: null,
        selectedContact: null,
        page: 1,
        limit: 20,
        totalPages: 1,
        total: 0,
        stats: {},
        filter: { status: 'all', q: '', priority: 'all', category: 'all' },
        replyMode: 'reply' // 'reply' or 'note'
    };

    const sourceMeta = {
        website: { label: 'Website', icon: 'fa-solid fa-globe', color: '#1890ff' },
        facebook: { label: 'Facebook', icon: 'fa-brands fa-facebook', color: '#1877F2' },
        zalo: { label: 'Zalo', icon: 'fa-solid fa-comment-dots', color: '#0068FF' },
        email: { label: 'Email', icon: 'fa-regular fa-envelope', color: '#d46b08' },
        phone: { label: 'Điện thoại', icon: 'fa-solid fa-phone', color: '#52c41a' }
    };

    const statusMeta = {
        pending: { label: 'Chưa phản hồi', color: '#d46b08', bg: '#fff7e6' },
        processing: { label: 'Đang xử lý', color: '#1890ff', bg: '#e6f7ff' },
        resolved: { label: 'Đã đóng', color: '#52c41a', bg: '#f6ffed' }
    };

    const categoryMeta = {
        general: 'Chung',
        order: 'Đơn hàng',
        consulting: 'Tư vấn mua hàng',
        complaint: 'Khiếu nại',
        warranty: 'Bảo hành',
        feedback: 'Góp ý'
    };

    // ─── Helpers ───
    function escHtml(str) {
        if (!str) return '';
        const d = document.createElement('div');
        d.textContent = str;
        return d.innerHTML;
    }

    function timeAgo(dateStr) {
        if (!dateStr) return '';
        const d = new Date(dateStr);
        const now = Date.now();
        const diff = now - d.getTime();
        const mins = Math.floor(diff / 60000);
        if (mins < 1) return 'Vừa xong';
        if (mins < 60) return `${mins} phút trước`;
        const hours = Math.floor(mins / 60);
        if (hours < 24) return `${hours} giờ trước`;
        const days = Math.floor(hours / 24);
        if (days < 7) return `${days} ngày trước`;
        return d.toLocaleDateString('vi-VN');
    }

    function formatTime(dateStr) {
        if (!dateStr) return '';
        const d = new Date(dateStr);
        return d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
    }

    function formatDate(dateStr) {
        if (!dateStr) return '';
        const d = new Date(dateStr);
        return d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
    }

    function formatNumber(value) {
        return Number(value || 0).toLocaleString('vi-VN');
    }

    function initials(name) {
        if (!name) return '??';
        const parts = name.trim().split(' ');
        if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
        return name.substring(0, 2).toUpperCase();
    }

    function customerAvatar(contact) {
        return contact?.customer?.avatar || contact?.customerAvatar || '';
    }

    function avatarMarkup(name, src) {
        const safeSrc = String(src || '').trim();
        if (safeSrc) return `<img src="${escHtml(safeSrc)}" alt="${escHtml(name || 'Avatar')}">`;
        return initials(name);
    }

    function getTicketId(contact) {
        if (!contact || !contact._id) return '#LH0000';
        return '#LH' + contact._id.slice(-4).toUpperCase();
    }

    function notify(message) {
        if (typeof window.showToast === 'function') {
            window.showToast(message);
        }
    }

    function readCasaSession() {
        try {
            return JSON.parse(localStorage.getItem('casaSession') || sessionStorage.getItem('casaSession') || 'null');
        } catch {
            return null;
        }
    }

    function showListError(message) {
        const container = document.getElementById('cmContactList');
        if (!container) return;
        container.innerHTML = `<div class="cm-list-empty"><i class="fa-regular fa-circle-xmark"></i><p>${escHtml(message)}</p></div>`;
    }

    function clearDetail() {
        cmState.selectedId = null;
        cmState.selectedContact = null;
        const empty = document.getElementById('cmDetailEmpty');
        const content = document.getElementById('cmDetailContent');
        if (empty) empty.style.display = 'flex';
        if (content) content.style.display = 'none';
    }

    // ─── API ───
    async function cmApi(url, opts = {}) {
        if (typeof window.api === 'function') {
            return window.api(url, opts);
        }

        const current = readCasaSession();
        const token = current?.token;
        const headers = { 'Content-Type': 'application/json' };
        if (token) headers['Authorization'] = `Bearer ${token}`;
        const res = await fetch('/api' + url, { ...opts, headers: { ...headers, ...(opts.headers || {}) } });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.message || 'Lỗi server');
        return data;
    }

    // ─── Load Data ───
    async function loadContacts(page = 1) {
        cmState.page = page;
        const params = new URLSearchParams({
            page,
            limit: cmState.limit,
            q: cmState.filter.q,
            status: cmState.filter.status,
            priority: cmState.filter.priority,
            category: cmState.filter.category
        });

        try {
            const data = await cmApi(`/admin/contacts?${params}`);
            cmState.contacts = data.contacts || [];
            cmState.total = data.total || 0;
            cmState.totalPages = data.totalPages || 1;
            cmState.stats = data.stats || {};
            renderKPIs();
            renderContactList();
            renderPagination();
            renderRightPanel();
            if (cmState.contacts.length) {
                const nextSelection = cmState.selectedId && cmState.contacts.some((c) => c._id === cmState.selectedId)
                    ? cmState.selectedId
                    : cmState.contacts[0]._id;
                selectContact(nextSelection);
            } else {
                clearDetail();
            }
        } catch (err) {
            console.error('loadContacts error:', err);
            showListError(err.message || 'Không thể tải dữ liệu liên hệ.');
            notify(err.message || 'Không thể tải dữ liệu liên hệ.');
        }
    }

    // ─── Render KPIs ───
    function renderKPIs() {
        const s = cmState.stats;
        const el = id => document.getElementById(id);
        if (el('cmStatTotal')) el('cmStatTotal').textContent = formatNumber(s.total);
        if (el('cmStatPending')) el('cmStatPending').textContent = formatNumber(s.pending);
        if (el('cmStatProcessing')) el('cmStatProcessing').textContent = formatNumber(s.processing);
        if (el('cmStatResolvedToday')) el('cmStatResolvedToday').textContent = formatNumber(s.resolvedToday);
        if (el('cmStatSla')) el('cmStatSla').textContent = (s.slaRate || 0) + '%';

        // Tabs counts
        if (el('cmTabAll')) el('cmTabAll').textContent = formatNumber(s.total);
        if (el('cmTabPending')) el('cmTabPending').textContent = formatNumber(s.pending);
        if (el('cmTabProcessing')) el('cmTabProcessing').textContent = formatNumber(s.processing);
        if (el('cmTabResolved')) el('cmTabResolved').textContent = formatNumber(s.resolved);
        if (el('cmTabHigh')) el('cmTabHigh').textContent = formatNumber(s.highPriorityPending);
    }

    // ─── Render Contact List ───
    function renderContactList() {
        const container = document.getElementById('cmContactList');
        if (!container) return;

        if (!cmState.contacts.length) {
            container.innerHTML = `<div class="cm-list-empty"><i class="fa-solid fa-inbox"></i><p>Không tìm thấy liên hệ nào.</p></div>`;
            return;
        }

        container.innerHTML = cmState.contacts.map(c => {
            const st = statusMeta[c.status] || statusMeta.pending;
            const src = sourceMeta[c.source] || sourceMeta.website;
            const isSelected = cmState.selectedId === c._id;
            const isHigh = c.priority === 'high';

            return `
                <div class="cm-contact-item ${isSelected ? 'active' : ''} ${isHigh ? 'high-priority' : ''}" data-contact-id="${escHtml(c._id)}" onclick="cmSelectContact('${c._id}')">
                    <div class="cm-ci-avatar" style="${isHigh && !customerAvatar(c) ? 'background:linear-gradient(135deg,#ff7a45,#d4380d);color:#fff;' : ''}">${avatarMarkup(c.fullName, customerAvatar(c))}</div>
                    <div class="cm-ci-body">
                        <div class="cm-ci-top">
                            <b class="cm-ci-name">${escHtml(c.fullName)}</b>
                            <span class="cm-ci-ticket">${getTicketId(c)}</span>
                        </div>
                        <p class="cm-ci-subject">${escHtml(c.subject || c.message?.substring(0, 60) || 'Không có chủ đề')}</p>
                        <div class="cm-ci-bottom">
                            <span class="cm-ci-source"><i class="${src.icon}" style="color:${src.color}"></i> ${src.label}</span>
                            <span class="cm-ci-time">${formatTime(c.createdAt)}</span>
                        </div>
                        <div class="cm-ci-badges">
                            <span class="cm-ci-status" style="background:${st.bg};color:${st.color};">${st.label}</span>
                            ${isHigh ? '<span class="cm-ci-priority-tag">Ưu tiên cao</span>' : ''}
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    }

    // ─── Render Pagination ───
    function renderPagination() {
        const pager = document.getElementById('cmPager');
        if (!pager) return;
        const tp = cmState.totalPages;
        const cp = cmState.page;
        let html = '';

        // Prev
        html += `<button class="cm-page-btn" ${cp <= 1 ? 'disabled' : ''} onclick="cmGoPage(${cp - 1})"><i class="fa-solid fa-chevron-left"></i></button>`;

        // Page numbers
        const maxShow = 5;
        let start = Math.max(1, cp - Math.floor(maxShow / 2));
        let end = Math.min(tp, start + maxShow - 1);
        if (end - start < maxShow - 1) start = Math.max(1, end - maxShow + 1);

        for (let i = start; i <= end; i++) {
            html += `<button class="cm-page-btn ${i === cp ? 'active' : ''}" onclick="cmGoPage(${i})">${i}</button>`;
        }
        if (end < tp) {
            html += `<span class="cm-page-dots">…</span>`;
            html += `<button class="cm-page-btn" onclick="cmGoPage(${tp})">${tp}</button>`;
        }

        // Next
        html += `<button class="cm-page-btn" ${cp >= tp ? 'disabled' : ''} onclick="cmGoPage(${cp + 1})"><i class="fa-solid fa-chevron-right"></i></button>`;

        pager.innerHTML = html;
    }

    // ─── Render Right Panel ───
    function renderRightPanel() {
        const s = cmState.stats;
        const el = id => document.getElementById(id);

        // Today items
        const cats = s.categories || {};
        if (el('cmTodayPending')) el('cmTodayPending').textContent = formatNumber(s.pending);
        if (el('cmTodayHighPriority')) el('cmTodayHighPriority').textContent = formatNumber(s.highPriorityPending);
        if (el('cmTodayProcessing')) el('cmTodayProcessing').textContent = formatNumber(cats.order);

        // Quick filter counts
        if (el('cmQfAll')) el('cmQfAll').textContent = formatNumber(s.total);
        if (el('cmQfPending')) el('cmQfPending').textContent = formatNumber(s.pending);
        if (el('cmQfConsulting')) el('cmQfConsulting').textContent = formatNumber(cats.consulting);
        if (el('cmQfComplaint')) el('cmQfComplaint').textContent = formatNumber(cats.complaint);
        if (el('cmQfWarranty')) el('cmQfWarranty').textContent = formatNumber(cats.warranty);
        if (el('cmQfFeedback')) el('cmQfFeedback').textContent = formatNumber(cats.feedback);

        // Draw mini chart
        drawMiniChart();

        if (el('cmAvgTime')) {
            const minutes = Number(s.avgFirstResponseMinutes || 0);
            if (!minutes) {
                el('cmAvgTime').textContent = 'Chưa có';
            } else if (minutes < 60) {
                el('cmAvgTime').textContent = `${Math.round(minutes)} phút`;
            } else {
                el('cmAvgTime').textContent = `${(minutes / 60).toFixed(1)} giờ`;
            }
        }
    }

    // ─── Select Contact ───
    async function selectContact(id) {
        cmState.selectedId = id;

        // Highlight in list
        document.querySelectorAll('.cm-contact-item').forEach(el => {
            el.classList.toggle('active', el.dataset.contactId === id);
        });

        // Show detail panel
        const empty = document.getElementById('cmDetailEmpty');
        const content = document.getElementById('cmDetailContent');
        if (empty) empty.style.display = 'none';
        if (content) content.style.display = 'flex';

        // Fetch full contact
        try {
            const data = await cmApi(`/admin/contacts/${id}`);
            cmState.selectedContact = data.contact;
            renderDetail(data.contact);
        } catch (err) {
            console.error(err);
            notify(err.message || 'Không thể mở chi tiết liên hệ.');
        }
    }

    // ─── Render Detail ───
    function renderDetail(c) {
        if (!c) return;
        const el = id => document.getElementById(id);
        const st = statusMeta[c.status] || statusMeta.pending;
        const src = sourceMeta[c.source] || sourceMeta.website;
        const isHigh = c.priority === 'high';

        // Header
        if (el('cmDetailSubject')) el('cmDetailSubject').textContent = c.subject || 'Liên hệ ' + getTicketId(c);
        if (el('cmDetailTicket')) el('cmDetailTicket').textContent = getTicketId(c);
        if (el('cmDetailName')) el('cmDetailName').textContent = c.fullName;
        if (el('cmDetailEmail')) el('cmDetailEmail').textContent = c.email;
        if (el('cmDetailPhone')) el('cmDetailPhone').textContent = c.phone || 'Chưa cung cấp';
        if (el('cmDetailAvatar')) el('cmDetailAvatar').innerHTML = avatarMarkup(c.fullName, customerAvatar(c));

        // Source tag
        const srcTag = el('cmDetailSource');
        if (srcTag) srcTag.innerHTML = `<i class="${src.icon}" style="color:${src.color}"></i> ${src.label}`;

        // Priority
        const prioTag = el('cmDetailPriorityTag');
        if (prioTag) {
            prioTag.textContent = isHigh ? 'Ưu tiên cao' : 'Bình thường';
            prioTag.className = `cm-info-value ${isHigh ? 'dot-red' : 'dot-green'}`;
        }
        const prioBadge = el('cmDetailPriority');
        if (prioBadge) {
            prioBadge.textContent = isHigh ? '● Ưu tiên cao' : '● Bình thường';
            prioBadge.className = `cm-priority-badge ${isHigh ? 'high' : 'normal'}`;
        }

        // Status tag
        const stTag = el('cmDetailStatusTag');
        if (stTag) {
            stTag.textContent = st.label;
            const dotClass = c.status === 'pending' ? 'dot-orange' : c.status === 'processing' ? 'dot-blue' : 'dot-green';
            stTag.className = `cm-info-value ${dotClass}`;
        }

        // Related order
        const relInfo = el('cmRelatedInfo');
        const relOrder = el('cmRelatedOrder');
        if (c.relatedOrderCode && relInfo && relOrder) {
            relInfo.style.display = 'flex';
            relOrder.textContent = c.relatedOrderCode;
        } else if (relInfo) {
            relInfo.style.display = 'none';
        }

        // Conversation thread
        renderConversation(c);

        const textarea = el('cmReplyText');
        if (textarea) textarea.value = '';
    }

    // ─── Render Conversation ───
    function renderConversation(c) {
        const conv = document.getElementById('cmConversation');
        if (!conv) return;
        let html = '';

        // Original message as customer message
        html += `
            <div class="cm-msg customer">
                <div class="cm-msg-header">
                    <b>Khách hàng</b>
                    <span class="cm-msg-time">${formatTime(c.createdAt)}  ${formatDate(c.createdAt)}</span>
                </div>
                <div class="cm-msg-row customer">
                    <div class="cm-msg-avatar customer-av">${avatarMarkup(c.fullName, customerAvatar(c))}</div>
                    <div class="cm-msg-stack">
                        <div class="cm-msg-bubble customer">
                            <p>${escHtml(c.message)}</p>
                        </div>
                        ${c.relatedOrderCode ? `<div class="cm-msg-related">Đơn hàng liên quan: <b>${escHtml(c.relatedOrderCode)}</b> · ${formatDate(c.createdAt)}</div>` : ''}
                    </div>
                </div>
            </div>
        `;

        // Replies
        if (c.replies && c.replies.length) {
            c.replies.forEach(r => {
                const isAdmin = r.sender === 'admin';
                const senderLabel = isAdmin ? (escHtml(r.senderName) || 'Admin') : 'Khách hàng';
                html += `
                    <div class="cm-msg ${isAdmin ? 'admin' : 'customer'}">
                        <div class="cm-msg-header">
                            <b>${senderLabel}</b>
                            <span class="cm-msg-time">${formatTime(r.createdAt)}  ${formatDate(r.createdAt)}</span>
                        </div>
                        <div class="cm-msg-row ${isAdmin ? 'admin' : 'customer'}">
                            <div class="cm-msg-avatar ${isAdmin ? 'admin-av' : 'customer-av'}">${avatarMarkup(isAdmin ? (r.senderName || 'Admin') : c.fullName, isAdmin ? r.senderAvatar : (r.senderAvatar || customerAvatar(c)))}</div>
                            <div class="cm-msg-stack">
                                <div class="cm-msg-bubble ${isAdmin ? 'admin' : 'customer'}">
                                    <p>${escHtml(r.message)}</p>
                                </div>
                                ${isAdmin ? `<div class="cm-msg-sent"><i class="fa-solid fa-check-double"></i> Đã gửi ${formatTime(r.createdAt)} ✓</div>` : ''}
                            </div>
                        </div>
                    </div>
                `;
            });
        }

        if (c.internalNote) {
            html += `
                <div class="cm-internal-note">
                    <b><i class="fa-regular fa-note-sticky"></i> Ghi chú nội bộ</b>
                    <p>${escHtml(c.internalNote)}</p>
                </div>
            `;
        }

        conv.innerHTML = html;
        conv.scrollTop = conv.scrollHeight;
    }

    // ─── Send Reply ───
    async function sendReply() {
        const text = document.getElementById('cmReplyText');
        if (!text || !text.value.trim()) return;
        if (!cmState.selectedId) return;

        const msg = text.value.trim();
        text.value = '';

        if (cmState.replyMode === 'note') {
            // Save internal note
            try {
                await cmApi(`/admin/contacts/${cmState.selectedId}/status`, {
                    method: 'PATCH',
                    body: JSON.stringify({ status: cmState.selectedContact?.status || 'processing', internalNote: msg })
                });
                notify('Đã lưu ghi chú nội bộ.');
                const data = await cmApi(`/admin/contacts/${cmState.selectedId}`);
                cmState.selectedContact = data.contact;
                renderDetail(data.contact);
            } catch (err) {
                console.error(err);
                notify(err.message || 'Không thể lưu ghi chú.');
            }
        } else {
            // Send reply
            try {
                const data = await cmApi(`/admin/contacts/${cmState.selectedId}/reply`, {
                    method: 'POST',
                    body: JSON.stringify({ message: msg })
                });
                cmState.selectedContact = data.contact;
                renderDetail(data.contact);
                loadContacts(cmState.page);
                notify('Đã gửi phản hồi cho khách hàng.');
            } catch (err) {
                console.error(err);
                notify(err.message || 'Không thể gửi phản hồi.');
            }
        }
    }

    // ─── Close Contact ───
    async function closeContact() {
        if (!cmState.selectedId) return;
        if (!confirm('Bạn có chắc muốn đóng yêu cầu liên hệ này?')) return;
        try {
            await cmApi(`/admin/contacts/${cmState.selectedId}/status`, {
                method: 'PATCH',
                body: JSON.stringify({ status: 'resolved' })
            });
            notify('Đã đóng yêu cầu liên hệ.');
            loadContacts(cmState.page);
            clearDetail();
        } catch (err) {
            console.error(err);
            notify(err.message || 'Không thể đóng yêu cầu.');
        }
    }

    // ─── Transfer Contact ───
    async function transferContact() {
        if (!cmState.selectedId) return;
        const assignedTo = prompt('Chuyển yêu cầu cho bộ phận nào?', cmState.selectedContact?.assignedTo || 'Chăm sóc khách hàng');
        if (!assignedTo) return;
        try {
            const note = `Chuyển bộ phận: ${assignedTo}`;
            const data = await cmApi(`/admin/contacts/${cmState.selectedId}/status`, {
                method: 'PATCH',
                body: JSON.stringify({
                    status: 'processing',
                    assignedTo,
                    internalNote: cmState.selectedContact?.internalNote
                        ? `${cmState.selectedContact.internalNote}\n${note}`
                        : note
                })
            });
            cmState.selectedContact = data.contact;
            renderDetail(data.contact);
            loadContacts(cmState.page);
            notify('Đã chuyển yêu cầu sang bộ phận phụ trách.');
        } catch (err) {
            console.error(err);
            notify(err.message || 'Không thể chuyển bộ phận.');
        }
    }

    // ─── Tab Filters ───
    function filterTab(btn) {
        document.querySelectorAll('.cm-tab').forEach(t => t.classList.remove('active'));
        btn.classList.add('active');
        const filter = btn.getAttribute('data-filter');

        if (filter === 'high') {
            cmState.filter.status = 'all';
            cmState.filter.priority = 'high';
        } else {
            cmState.filter.status = filter;
            cmState.filter.priority = 'all';
        }
        cmState.filter.category = 'all';
        document.querySelectorAll('.cm-qf-item').forEach((item) => item.classList.toggle('active', item.dataset.cat === 'all'));
        loadContacts(1);
    }

    // ─── Quick Filter ───
    function quickFilter(btn) {
        document.querySelectorAll('.cm-qf-item').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const cat = btn.getAttribute('data-cat');

        if (cat === 'all') {
            cmState.filter.category = 'all';
            cmState.filter.status = 'all';
        } else if (cat === 'pending') {
            cmState.filter.status = 'pending';
            cmState.filter.category = 'all';
        } else {
            cmState.filter.category = cat;
            cmState.filter.status = 'all';
        }
        cmState.filter.priority = 'all';
        document.querySelectorAll('.cm-tab').forEach((item) => item.classList.toggle('active', item.dataset.filter === 'all'));
        loadContacts(1);
    }

    // ─── Search ───
    let searchTimer;
    function setupSearch() {
        const input = document.getElementById('cmSearchInput');
        if (input) {
            input.addEventListener('input', () => {
                clearTimeout(searchTimer);
                searchTimer = setTimeout(() => {
                    cmState.filter.q = input.value.trim();
                    loadContacts(1);
                }, 400);
            });
        }

        const filterBtn = document.querySelector('.cm-filter-btn');
        const rightPanel = document.querySelector('.cm-col-right');
        if (filterBtn && rightPanel) {
            filterBtn.addEventListener('click', () => {
                rightPanel.classList.add('is-focused');
                setTimeout(() => rightPanel.classList.remove('is-focused'), 900);
            });
        }
    }

    // ─── Page Nav ───
    function goPage(p) {
        if (p < 1 || p > cmState.totalPages) return;
        loadContacts(p);
    }

    function changePageSize(val) {
        cmState.limit = parseInt(val, 10) || 20;
        loadContacts(1);
    }

    // ─── Reply Tab Switch ───
    function switchReplyTab(btn, mode) {
        document.querySelectorAll('.cm-reply-tab').forEach(t => t.classList.remove('active'));
        btn.classList.add('active');
        cmState.replyMode = mode;
        const textarea = document.getElementById('cmReplyText');
        if (textarea) {
            textarea.placeholder = mode === 'note'
                ? 'Nhập ghi chú nội bộ (không gửi cho khách hàng)...'
                : 'Nhập phản hồi cho khách hàng...';
        }
    }

    // ─── Mini Chart ───
    function drawMiniChart() {
        const canvas = document.getElementById('cmChartCanvas');
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        const w = canvas.width;
        const h = canvas.height;

        ctx.clearRect(0, 0, w, h);

        const data = Array.isArray(cmState.stats.hourlyContacts) && cmState.stats.hourlyContacts.length
            ? cmState.stats.hourlyContacts
            : Array.from({ length: 24 }, () => 0);
        const max = Math.max(...data);
        if (!max) {
            ctx.fillStyle = '#8c8c8c';
            ctx.font = '11px Be Vietnam Pro, sans-serif';
            ctx.fillText('Chưa có liên hệ hôm nay', 54, 42);
            return;
        }
        const step = w / (data.length - 1);

        // Time labels
        ctx.fillStyle = '#bfbfbf';
        ctx.font = '9px Be Vietnam Pro, sans-serif';
        ['00:00', '04:00', '08:00', '12:00', '16:00', '20:00', '24:00'].forEach((label, i) => {
            ctx.fillText(label, (i / 6) * (w - 30), h - 2);
        });

        // Line chart
        ctx.beginPath();
        ctx.strokeStyle = '#d4380d';
        ctx.lineWidth = 2;
        ctx.lineJoin = 'round';

        data.forEach((v, i) => {
            const x = i * step;
            const y = (h - 15) - ((v / max) * (h - 25));
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        });
        ctx.stroke();

        // Gradient fill
        const gradient = ctx.createLinearGradient(0, 0, 0, h);
        gradient.addColorStop(0, 'rgba(212, 56, 13, 0.15)');
        gradient.addColorStop(1, 'rgba(212, 56, 13, 0)');

        ctx.lineTo(w - step, h - 15);
        ctx.lineTo(0, h - 15);
        ctx.closePath();
        ctx.fillStyle = gradient;
        ctx.fill();
    }

    // ─── Global Functions ───
    function appendReplyText(text) {
        const textarea = document.getElementById('cmReplyText');
        if (!textarea) return;
        const prefix = textarea.value.trim() ? '\n' : '';
        textarea.value = `${textarea.value}${prefix}${text}`;
        textarea.focus();
    }

    function triggerAttachment() {
        document.getElementById('cmAttachmentInput')?.click();
    }

    function handleAttachment(input) {
        const file = input?.files?.[0];
        if (!file) return;
        appendReplyText(`[File dinh kem: ${file.name}]`);
        notify(`Da chon file ${file.name}.`);
        input.value = '';
    }

    function insertEmoji() {
        appendReplyText(':)');
    }

    function insertReplyTemplate() {
        appendReplyText('Casa Decor da tiep nhan thong tin cua minh. Ben em se kiem tra va phan hoi chi tiet som nhat a.');
    }

    window.cmSelectContact = selectContact;
    window.cmFilterTab = filterTab;
    window.cmQuickFilter = quickFilter;
    window.cmGoPage = goPage;
    window.cmChangePageSize = changePageSize;
    window.cmSendReply = sendReply;
    window.cmCloseContact = closeContact;
    window.cmTransferContact = transferContact;
    window.cmSwitchReplyTab = switchReplyTab;
    window.cmTriggerAttachment = triggerAttachment;
    window.cmHandleAttachment = handleAttachment;
    window.cmInsertEmoji = insertEmoji;
    window.cmInsertReplyTemplate = insertReplyTemplate;
    window.loadContactManager = loadContacts;

    // ─── Init ───
    async function init() {
        const view = document.getElementById('contactManagerView');
        if (!view) return;

        setupSearch();
        if (typeof window.ensureAdminSession === 'function') {
            try {
                await window.ensureAdminSession();
            } catch {
                // admin.js will show the auth gate when the admin session is unavailable.
            }
        }
        loadContacts(1);
    }

    // Wait for admin.js to load first
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => setTimeout(init, 300));
    } else {
        setTimeout(init, 300);
    }
})();
