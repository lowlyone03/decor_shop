// banners.js - Casa Decor Admin Banner Management
let banners = [];
let filteredBanners = [];
let bodLockState = 'locked'; // 'locked', 'pending', 'unlocked'
let isLockedByDefault = false;
let lastUpdateDate = null;
let currentPage = 1;
let pageSize = 20;

// Helper to format Date
function formatDate(dateStr) {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return dateStr;
    return new Intl.DateTimeFormat('vi-VN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    }).format(date);
}

// Check BOD lock state on load
async function checkBODStatus() {
    try {
        const response = await fetch('/api/admin/banners/bod-status', {
            headers: {
                ...authHeaders()
            }
        });
        if (response.ok) {
            const data = await response.json();
            bodLockState = data.bodStatus;
            isLockedByDefault = data.isLockedByDefault;
            lastUpdateDate = data.lastUpdate;
            updateBODAlertUI();
        }
    } catch (error) {
        console.error('Error checking BOD status:', error);
    }
}

// Fetch banners from API
async function fetchBanners() {
    try {
        const queryParams = new URLSearchParams();
        const searchVal = document.getElementById('bannerSearch')?.value.trim();
        const posFilterVal = document.getElementById('bannerPositionFilter')?.value;
        const statusFilterVal = document.getElementById('bannerStatusFilter')?.value;

        if (searchVal) queryParams.append('q', searchVal);
        
        // Map position filter to DB values
        if (posFilterVal && posFilterVal !== 'all') {
            let dbPos = 'hero';
            if (posFilterVal === 'Mid page') dbPos = 'sale';
            else if (posFilterVal === 'Footer promo') dbPos = 'lookbook';
            queryParams.append('position', dbPos);
        }

        // Map status filter to DB values
        if (statusFilterVal && statusFilterVal !== 'all') {
            let dbStatus = 'active';
            if (statusFilterVal === 'draft' || statusFilterVal === 'expired') dbStatus = 'hidden';
            queryParams.append('status', dbStatus);
        }

        const response = await fetch(`/api/admin/banners?${queryParams.toString()}`, {
            headers: {
                ...authHeaders()
            }
        });

        if (response.ok) {
            const data = await response.json();
            banners = data.banners;
            filteredBanners = [...banners];
            bodLockState = data.bodStatus;
            
            // Update stats cards
            const elTotal = document.getElementById('statTotalBanners');
            if (elTotal) elTotal.textContent = data.stats.total || 0;
            const elActive = document.getElementById('statActiveBanners');
            if (elActive) elActive.textContent = data.stats.active || 0;
            const elHidden = document.getElementById('statHiddenBanners');
            if (elHidden) elHidden.textContent = data.stats.hidden || 0;
            const elLastUpdate = document.getElementById('statLastUpdate');
            if (elLastUpdate) elLastUpdate.textContent = formatDate(data.stats.lastUpdate);

            renderBannersTable();
        } else {
            const err = await response.json();
            showToast(err.message || 'Không thể lấy danh sách banner', 'warning');
        }
    } catch (error) {
        console.error('Error fetching banners:', error);
        showToast('Có lỗi xảy ra khi kết nối máy chủ!', 'warning');
    }
}

// Render banners table
function renderBannersTable() {
    const tbody = document.getElementById('bannerTableBody');
    if (!tbody) return;
    tbody.innerHTML = '';

    if (filteredBanners.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="10" style="text-align: center; padding: 30px; color: var(--admin-muted);">
                    <i class="fa-solid fa-image-portrait" style="font-size: 32px; margin-bottom: 10px; display: block; opacity: 0.5;"></i>
                    Không có banner nào được tìm thấy.
                </td>
            </tr>
        `;
        const paginationDiv = document.getElementById('bannerPagination');
        if (paginationDiv) paginationDiv.style.display = 'none';
        return;
    }

    const paginationDiv = document.getElementById('bannerPagination');
    if (paginationDiv) paginationDiv.style.display = 'flex';

    // Pagination calculations
    const totalItems = filteredBanners.length;
    const totalPages = Math.ceil(totalItems / pageSize);
    if (currentPage > totalPages) currentPage = Math.max(1, totalPages);

    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = Math.min(startIndex + pageSize, totalItems);
    const paginatedItems = filteredBanners.slice(startIndex, endIndex);

    // Update pagination text
    const textEl = document.getElementById('bannerPaginationText');
    if (textEl) {
        textEl.textContent = `Hiển thị ${totalItems > 0 ? startIndex + 1 : 0} - ${endIndex} trong tổng số ${totalItems} banner`;
    }

    // Render pagination buttons
    const btnContainer = document.getElementById('bannerPaginationButtons');
    if (btnContainer) {
        btnContainer.innerHTML = '';
        
        // Prev button
        const prevBtn = document.createElement('button');
        prevBtn.className = 'pagination-btn';
        prevBtn.innerHTML = '<i class="fa-solid fa-chevron-left"></i>';
        prevBtn.disabled = currentPage === 1;
        prevBtn.onclick = () => {
            if (currentPage > 1) {
                currentPage--;
                renderBannersTable();
            }
        };
        btnContainer.appendChild(prevBtn);

        // Page numbers
        for (let i = 1; i <= totalPages; i++) {
            const pageBtn = document.createElement('button');
            pageBtn.className = `pagination-btn ${i === currentPage ? 'active' : ''}`;
            pageBtn.textContent = i;
            pageBtn.onclick = () => {
                currentPage = i;
                renderBannersTable();
            };
            btnContainer.appendChild(pageBtn);
        }

        // Next button
        const nextBtn = document.createElement('button');
        nextBtn.className = 'pagination-btn';
        nextBtn.innerHTML = '<i class="fa-solid fa-chevron-right"></i>';
        nextBtn.disabled = currentPage === totalPages;
        nextBtn.onclick = () => {
            if (currentPage < totalPages) {
                currentPage++;
                renderBannersTable();
            }
        };
        btnContainer.appendChild(nextBtn);
    }

    paginatedItems.forEach(banner => {
        const tr = document.createElement('tr');
        tr.style.borderBottom = '1px solid var(--admin-line)';
        tr.style.height = '48px';

        // Position label mapping: DB values to UI text
        let posText = 'Hero homepage';
        if (banner.position === 'sale') posText = 'Mid page';
        else if (banner.position === 'lookbook') posText = 'Footer promo';

        // Status Badge rendering: DB values to UI text & classes
        let badgeClass = 'badge-draft';
        let badgeText = 'Bản nháp';
        if (banner.status === 'active') {
            badgeClass = 'badge-displaying';
            badgeText = 'Đang hiển thị';
        }

        // Stars rendering for priority
        let starsHtml = '';
        const priority = banner.displayOrder || 1;
        for (let i = 0; i < 3; i++) {
            if (i < priority) {
                starsHtml += '<i class="fa-solid fa-star" style="color: #fadb14; font-size: 11px; margin-right: 2px;"></i>';
            } else {
                starsHtml += '<i class="fa-regular fa-star" style="color: #d9d9d9; font-size: 11px; margin-right: 2px;"></i>';
            }
        }

        // Disable actions if locked by BOD rules
        const isLocked = (bodLockState !== 'unlocked');
        const disabledAttr = isLocked ? 'disabled' : '';
        const disabledClass = isLocked ? 'btn-disabled' : '';

        tr.innerHTML = `
            <td style="padding: 8px 10px;"><input type="checkbox" aria-label="Chọn banner ${banner.title || ''}"></td>
            <td style="padding: 8px 10px; display: flex; align-items: center; gap: 8px; min-width: 180px;">
                <img src="${banner.image || '/images/lohoa_decor/lohoa01.jpg'}" alt="${banner.title || 'Banner'}" style="width: 50px; height: 30px; object-fit: cover; border-radius: 4px; border: 1px solid var(--admin-line); flex-shrink: 0;">
                <div style="min-width: 0; flex: 1;">
                    <strong style="color: var(--admin-text); display: block; font-size: 13px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" title="${banner.title || 'Chưa có tiêu đề'}">${banner.title || 'Chưa có tiêu đề'}</strong>
                    <span style="color: var(--admin-muted); font-size: 10px; display: block; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">ID: ${banner._id}</span>
                </div>
            </td>
            <td style="padding: 8px 10px; color: var(--admin-text); font-size: 12px;">${posText}</td>
            <td style="padding: 8px 10px;"><span class="cta-tag" style="font-size: 10px; padding: 2px 6px;">${banner.buttonText || 'Khám phá'}</span></td>
            <td style="padding: 8px 10px; color: var(--admin-muted); font-size: 12px; font-family: monospace;">-</td>
            <td style="padding: 8px 10px; font-size: 12px;">
                <i class="fa-solid fa-desktop" style="color: var(--admin-muted); margin-right: 4px;" title="Desktop"></i>
                <i class="fa-solid fa-mobile-screen-button" style="color: var(--admin-muted);" title="Mobile"></i>
            </td>
            <td style="padding: 8px 10px;"><span class="badge-custom ${badgeClass}">${badgeText}</span></td>
            <td style="padding: 8px 10px;">${starsHtml}</td>
            <td style="padding: 8px 10px; color: var(--admin-muted); font-size: 12px;">${formatDate(banner.updatedAt)}</td>
            <td style="padding: 8px 10px;">
                <div class="product-actions" style="justify-content: center;">
                    <button class="row-action-btn ${disabledClass}" ${disabledAttr} data-edit-id="${banner._id}" title="Chỉnh sửa"><i class="fa-regular fa-pen-to-square"></i></button>
                    <button class="row-action-btn" data-preview-id="${banner._id}" title="Xem trước"><i class="fa-regular fa-eye"></i></button>
                    <button class="row-action-btn ${disabledClass}" ${disabledAttr} data-duplicate-id="${banner._id}" title="Nhân bản"><i class="fa-regular fa-copy"></i></button>
                    <button class="row-action-btn danger ${disabledClass}" ${disabledAttr} data-delete-id="${banner._id}" title="Xóa"><i class="fa-regular fa-trash-can"></i></button>
                </div>
            </td>
        `;

        // Action Handlers
        tr.querySelector(`[data-preview-id="${banner._id}"]`).onclick = () => previewBanner(banner._id);
        
        if (isLocked) {
            tr.querySelectorAll('.row-action-btn.' + disabledClass).forEach(btn => {
                btn.onclick = (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    showLockedAlert();
                };
            });
        } else {
            tr.querySelector(`[data-edit-id="${banner._id}"]`).onclick = () => editBanner(banner._id);
            tr.querySelector(`[data-duplicate-id="${banner._id}"]`).onclick = () => duplicateBanner(banner._id);
            tr.querySelector(`[data-delete-id="${banner._id}"]`).onclick = () => deleteBanner(banner._id);
        }

        tbody.appendChild(tr);
    });
}

// Toggle BOD Alert bar based on state
function updateBODAlertUI() {
    const alertBox = document.getElementById('bodAlert');
    const btnCreate = document.getElementById('btnCreateBanner');
    if (!alertBox) return;

    if (bodLockState === 'locked') {
        if (btnCreate) btnCreate.classList.add('btn-disabled');
        alertBox.className = "bod-alert-box";
        alertBox.style.border = "1px solid #ffd59a";
        alertBox.style.background = "#fffbe6";
        alertBox.style.padding = "8px 12px";
        alertBox.style.borderRadius = "6px";
        alertBox.style.display = "flex";
        alertBox.style.alignItems = "center";
        alertBox.style.justifyContent = "space-between";
        alertBox.style.marginBottom = "10px";
        alertBox.style.boxShadow = "0 2px 6px rgba(0,0,0,0.03)";
        alertBox.innerHTML = `
            <div style="display: flex; align-items: center; gap: 10px; color: #d46b08;">
                <i class="fa-solid fa-lock" style="font-size: 15px;"></i>
                <div>
                    <strong style="font-size: 12px; font-family: var(--admin-body);">HẠN CHẾ TÍNH NĂNG (CHẾ ĐỘ CHỈ ĐỌC)</strong>
                    <p style="margin: 2px 0 0 0; font-size: 11px; color: #595959; font-family: var(--admin-body);">
                        Banner trang chủ chỉ được cập nhật tối đa 6 tháng một lần. Lần cập nhật cuối là ngày <strong>${formatDate(lastUpdateDate)}</strong>.
                        Để chỉnh sửa, bạn cần gửi yêu cầu phê duyệt tới <strong>Hội đồng quản trị</strong>.
                    </p>
                </div>
            </div>
            <div>
                <button id="btnRequestBOD" onclick="openBODModal()" style="background: #fa8c16; color: white; border: none; padding: 4px 10px; border-radius: 6px; cursor: pointer; font-weight: 500; font-size: 11px; display: flex; align-items: center; gap: 6px; box-shadow: 0 2px 4px rgba(250,140,22,0.2); font-family: var(--admin-body);">
                    <i class="fa-regular fa-paper-plane"></i> Gửi yêu cầu phê duyệt
                </button>
            </div>
        `;
    } else if (bodLockState === 'pending') {
        if (btnCreate) btnCreate.classList.add('btn-disabled');
        alertBox.className = "bod-alert-box";
        alertBox.style.border = "1px solid #ffd59a";
        alertBox.style.background = "#fffbe6";
        alertBox.style.padding = "8px 12px";
        alertBox.style.borderRadius = "6px";
        alertBox.style.display = "flex";
        alertBox.style.alignItems = "center";
        alertBox.style.justifyContent = "space-between";
        alertBox.style.marginBottom = "10px";
        alertBox.style.boxShadow = "0 2px 6px rgba(0,0,0,0.03)";
        alertBox.innerHTML = `
            <div style="display: flex; align-items: center; gap: 10px; color: #d46b08;">
                <i class="fa-solid fa-hourglass-half" style="font-size: 15px; animation: spin 2s linear infinite;"></i>
                <div>
                    <strong style="font-size: 12px; font-family: var(--admin-body);">YÊU CẦU ĐANG CHỜ PHÊ DUYỆT</strong>
                    <p style="margin: 2px 0 0 0; font-size: 11px; color: #595959; font-family: var(--admin-body);">
                        Yêu cầu sửa đổi banner đã được gửi đi. <strong>Đang đợi Hội đồng quản trị duyệt...</strong>
                    </p>
                </div>
            </div>
            <div>
                <button onclick="simulateBODApprove()" style="background: #237804; color: white; border: none; padding: 4px 10px; border-radius: 6px; cursor: pointer; font-weight: 500; font-size: 11px; display: flex; align-items: center; gap: 6px; box-shadow: 0 2px 4px rgba(35,120,4,0.2); font-family: var(--admin-body);">
                    <i class="fa-solid fa-check"></i> Phê duyệt nhanh (Mô phỏng)
                </button>
            </div>
        `;
    } else if (bodLockState === 'unlocked') {
        if (btnCreate) btnCreate.classList.remove('btn-disabled');
        alertBox.className = "bod-alert-box";
        alertBox.style.border = "1px solid #b7eb8f";
        alertBox.style.background = "#f6ffed";
        alertBox.style.padding = "8px 12px";
        alertBox.style.borderRadius = "6px";
        alertBox.style.display = "flex";
        alertBox.style.alignItems = "center";
        alertBox.style.justifyContent = "space-between";
        alertBox.style.marginBottom = "10px";
        alertBox.style.boxShadow = "0 2px 6px rgba(0,0,0,0.03)";
        alertBox.innerHTML = `
            <div style="display: flex; align-items: center; gap: 10px; color: #389e0d;">
                <i class="fa-solid fa-circle-check" style="font-size: 15px;"></i>
                <div>
                    <strong style="font-size: 12px; font-family: var(--admin-body);">ĐÃ PHÊ DUYỆT THÀNH CÔNG</strong>
                    <p style="margin: 2px 0 0 0; font-size: 11px; color: #595959; font-family: var(--admin-body);">
                        Hội đồng quản trị đã phê duyệt yêu cầu của bạn. Tính năng thêm mới/chỉnh sửa banner đã được <strong>mở khóa</strong>.
                    </p>
                </div>
            </div>
            <div>
                <button onclick="lockBOD()" style="background: #bfbfbf; color: white; border: none; padding: 4px 10px; border-radius: 6px; cursor: pointer; font-weight: 500; font-size: 11px; display: flex; align-items: center; gap: 6px; font-family: var(--admin-body);">
                    <i class="fa-solid fa-lock"></i> Khóa lại
                </button>
            </div>
        `;
    }
}

// Request approval modal handlers
function openBODModal() {
    const modal = document.getElementById('bodRequestModal');
    if (modal) modal.style.display = 'flex';
}

function closeBODModal() {
    const modal = document.getElementById('bodRequestModal');
    if (modal) modal.style.display = 'none';
    const reason = document.getElementById('bodReason');
    if (reason) reason.value = '';
}

async function submitBODRequest() {
    const reasonEl = document.getElementById('bodReason');
    const reason = reasonEl ? reasonEl.value.trim() : '';
    if (!reason) {
        showToast("Vui lòng nhập lý do gửi phê duyệt!", "warning");
        return;
    }

    showToast("Đang gửi yêu cầu phê duyệt tới Hội đồng quản trị...", "info");
    try {
        const response = await fetch('/api/admin/banners/request-bod', {
            method: 'POST',
            headers: {
                ...authHeaders()
            }
        });
        if (response.ok) {
            const data = await response.json();
            bodLockState = data.status;
            closeBODModal();
            updateBODAlertUI();
            fetchBanners(); // Refresh state
            showToast("Đã gửi yêu cầu thành công!", "success");
        } else {
            showToast("Gửi yêu cầu thất bại!", "warning");
        }
    } catch (error) {
        console.error('Error requesting approval:', error);
        showToast("Có lỗi xảy ra!", "warning");
    }
}

async function simulateBODApprove() {
    showToast("Đang phê duyệt...", "info");
    try {
        const response = await fetch('/api/admin/banners/approve-bod', {
            method: 'POST',
            headers: {
                ...authHeaders()
            }
        });
        if (response.ok) {
            const data = await response.json();
            bodLockState = data.status;
            updateBODAlertUI();
            fetchBanners(); // Refresh list to update active state/actions
            showToast("Hội đồng quản trị đã thông qua! Tính năng chỉnh sửa đã được mở.", "success");
        } else {
            showToast("Phê duyệt thất bại!", "warning");
        }
    } catch (error) {
        console.error('Error simulating approval:', error);
        showToast("Có lỗi xảy ra!", "warning");
    }
}

async function lockBOD() {
    try {
        const response = await fetch('/api/admin/banners/lock-bod', {
            method: 'POST',
            headers: {
                ...authHeaders()
            }
        });
        if (response.ok) {
            const data = await response.json();
            bodLockState = data.status;
            updateBODAlertUI();
            fetchBanners();
            showToast("Đã khóa lại các tính năng chỉnh sửa.", "info");
        }
    } catch (error) {
        console.error('Error locking BOD:', error);
    }
}

function showLockedAlert() {
    const modal = document.getElementById('featureLockedModal');
    if (modal) modal.style.display = 'flex';
}

function closeLockedModal() {
    const modal = document.getElementById('featureLockedModal');
    if (modal) modal.style.display = 'none';
}

// Form visibility handlers
function openCreateBannerForm() {
    if (bodLockState !== 'unlocked') {
        showLockedAlert();
        return;
    }
    document.getElementById('editBannerId').value = '';
    document.getElementById('bannerForm').reset();
    document.getElementById('bannerFormTitle').textContent = 'Thêm banner mới';
    document.getElementById('bannerBreadcrumb').textContent = 'Thêm banner';
    document.getElementById('bannerImgPreview').style.display = 'none';
    document.getElementById('bannerUploadPlaceholder').style.display = 'block';
    document.getElementById('bannerImgUrl').value = '';

    document.getElementById('bannerManagerView').hidden = true;
    document.getElementById('bannerFormView').hidden = false;
}

function closeBannerForm() {
    document.getElementById('bannerFormView').hidden = true;
    document.getElementById('bannerManagerView').hidden = false;
}

// Preview uploaded image
function previewBannerImage(input) {
    if (input.files && input.files[0]) {
        const reader = new FileReader();
        reader.onload = function(e) {
            document.getElementById('bannerImgPreview').src = e.target.result;
            document.getElementById('bannerImgPreview').style.display = 'block';
            document.getElementById('bannerUploadPlaceholder').style.display = 'none';
            document.getElementById('bannerImgUrl').value = e.target.result;
        };
        reader.readAsDataURL(input.files[0]);
    }
}

// Edit banner
function editBanner(id) {
    if (bodLockState !== 'unlocked') {
        showLockedAlert();
        return;
    }
    const banner = banners.find(b => b._id === id);
    if (!banner) return;

    document.getElementById('editBannerId').value = banner._id;
    document.getElementById('bannerTitle').value = banner.title || '';
    document.getElementById('bannerSubtitle').value = banner.description || '';
    document.getElementById('bannerBtnText').value = banner.buttonText || '';
    document.getElementById('bannerLink').value = banner.link || '#';

    // Map DB position values back to form
    let uiPos = 'Hero homepage';
    if (banner.position === 'sale') uiPos = 'Mid page';
    else if (banner.position === 'lookbook') uiPos = 'Footer promo';
    document.getElementById('bannerPosition').value = uiPos;

    document.getElementById('bannerPriority').value = (banner.displayOrder || 1).toString();

    // Map DB status back to form
    let uiStatus = 'draft';
    if (banner.status === 'active') uiStatus = 'displaying';
    document.getElementById('bannerStatus').value = uiStatus;

    if (banner.image) {
        document.getElementById('bannerImgPreview').src = banner.image;
        document.getElementById('bannerImgPreview').style.display = 'block';
        document.getElementById('bannerUploadPlaceholder').style.display = 'none';
        document.getElementById('bannerImgUrl').value = banner.image;
    } else {
        document.getElementById('bannerImgPreview').style.display = 'none';
        document.getElementById('bannerUploadPlaceholder').style.display = 'block';
        document.getElementById('bannerImgUrl').value = '';
    }

    document.getElementById('bannerFormTitle').textContent = 'Chỉnh sửa banner ' + banner._id;
    document.getElementById('bannerBreadcrumb').textContent = 'Chỉnh sửa banner';

    document.getElementById('bannerManagerView').hidden = true;
    document.getElementById('bannerFormView').hidden = false;
}

// Save Banner (Create or Update)
async function saveBanner() {
    const id = document.getElementById('editBannerId').value;
    const title = document.getElementById('bannerTitle').value.trim();
    const description = document.getElementById('bannerSubtitle').value.trim();
    const buttonText = document.getElementById('bannerBtnText').value.trim();
    const link = document.getElementById('bannerLink').value.trim();
    
    // Map position UI to DB
    const positionVal = document.getElementById('bannerPosition').value;
    let position = 'hero';
    if (positionVal === 'Mid page') position = 'sale';
    else if (positionVal === 'Footer promo') position = 'lookbook';

    const displayOrder = parseInt(document.getElementById('bannerPriority').value) || 1;
    
    // Map status UI to DB
    const statusVal = document.getElementById('bannerStatus').value;
    let status = 'hidden';
    if (statusVal === 'displaying' || statusVal === 'scheduled') status = 'active';

    const image = document.getElementById('bannerImgUrl').value || '/images/lohoa_decor/lohoa01.jpg';

    if (!title) {
        showToast("Vui lòng điền tiêu đề chính!", "warning");
        return;
    }

    const payload = {
        title,
        description,
        buttonText,
        link,
        position,
        displayOrder,
        status,
        image
    };

    const isEdit = !!id;
    const url = isEdit ? `/api/admin/banners/${id}` : '/api/admin/banners';
    const method = isEdit ? 'PATCH' : 'POST';

    showToast("Đang lưu thông tin banner...", "info");
    try {
        const response = await fetch(url, {
            method,
            headers: {
                'Content-Type': 'application/json',
                ...authHeaders()
            },
            body: JSON.stringify(payload)
        });

        if (response.ok) {
            showToast(isEdit ? "Cập nhật banner thành công!" : "Thêm banner mới thành công!", "success");
            closeBannerForm();
            fetchBanners();
        } else {
            const err = await response.json();
            showToast(err.message || 'Lưu banner thất bại!', 'warning');
        }
    } catch (error) {
        console.error('Error saving banner:', error);
        showToast('Có lỗi xảy ra!', 'warning');
    }
}

// Duplicate Banner
async function duplicateBanner(id) {
    if (bodLockState !== 'unlocked') {
        showLockedAlert();
        return;
    }
    const banner = banners.find(b => b._id === id);
    if (!banner) return;

    const payload = {
        title: (banner.title || '') + ' (Bản sao)',
        description: banner.description || '',
        buttonText: banner.buttonText || '',
        link: banner.link || '#',
        position: banner.position,
        displayOrder: banner.displayOrder || 1,
        status: 'hidden', // Save duplicated as draft/hidden
        image: banner.image
    };

    showToast("Đang nhân bản banner...", "info");
    try {
        const response = await fetch('/api/admin/banners', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...authHeaders()
            },
            body: JSON.stringify(payload)
        });

        if (response.ok) {
            showToast("Đã nhân bản banner thành công!", "success");
            fetchBanners();
        } else {
            const err = await response.json();
            showToast(err.message || 'Nhân bản thất bại!', 'warning');
        }
    } catch (error) {
        console.error('Error duplicating banner:', error);
        showToast('Có lỗi xảy ra!', 'warning');
    }
}

// Delete Banner
async function deleteBanner(id) {
    if (bodLockState !== 'unlocked') {
        showLockedAlert();
        return;
    }
    if (!confirm("Bạn có chắc chắn muốn xóa banner này không?")) return;

    showToast("Đang xóa banner...", "info");
    try {
        const response = await fetch(`/api/admin/banners/${id}`, {
            method: 'DELETE',
            headers: {
                ...authHeaders()
            }
        });

        if (response.ok) {
            showToast("Đã xóa banner thành công!", "success");
            fetchBanners();
        } else {
            const err = await response.json();
            showToast(err.message || 'Xóa banner thất bại!', 'warning');
        }
    } catch (error) {
        console.error('Error deleting banner:', error);
        showToast('Có lỗi xảy ra!', 'warning');
    }
}

// Preview Banner
function previewBanner(id) {
    const banner = banners.find(b => b._id === id);
    if (!banner) return;
    alert(`[Xem trước Banner]\nTiêu đề: ${banner.title || ''}\nVị trí: ${banner.position}\nCTA: ${banner.buttonText || ''}\nĐường dẫn ảnh: ${banner.image}`);
}

// Filter functions
function filterBanners() {
    fetchBanners();
}

function resetBannerFilters() {
    const search = document.getElementById('bannerSearch');
    const pos = document.getElementById('bannerPositionFilter');
    const status = document.getElementById('bannerStatusFilter');
    
    if (search) search.value = '';
    if (pos) pos.value = 'all';
    if (status) status.value = 'all';
    
    fetchBanners();
}

// Global Toast function
function showToast(msg, type = 'info') {
    const toast = document.getElementById('toastAlert');
    const icon = document.getElementById('toastIcon');
    const message = document.getElementById('toastMessage');
    
    if (!toast || !message) return;
    message.textContent = msg;
    if (type === 'success') {
        icon.innerHTML = '<i class="fa-solid fa-circle-check" style="color: #52c41a;"></i>';
    } else if (type === 'warning') {
        icon.innerHTML = '<i class="fa-solid fa-triangle-exclamation" style="color: #faad14;"></i>';
    } else {
        icon.innerHTML = '<i class="fa-solid fa-circle-info" style="color: #1890ff;"></i>';
    }
    
    toast.style.display = 'flex';
    setTimeout(() => {
        toast.style.display = 'none';
    }, 3000);
}

// Helper to construct authorization headers (cookie or local token)
function authHeaders() {
    const current = JSON.parse(localStorage.getItem('casaSession') || sessionStorage.getItem('casaSession') || 'null');
    return current?.token ? { Authorization: `Bearer ${current.token}` } : {};
}

// Handle window loading
window.addEventListener('DOMContentLoaded', () => {
    checkBODStatus();
    fetchBanners();

    const pageSizeSelect = document.getElementById('bannerPageSizeSelect');
    if (pageSizeSelect) {
        pageSizeSelect.value = pageSize;
        pageSizeSelect.addEventListener('change', (e) => {
            pageSize = parseInt(e.target.value, 10);
            currentPage = 1;
            renderBannersTable();
        });
    }
});
