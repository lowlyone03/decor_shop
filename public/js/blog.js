// blog.js - Casa Decor Admin Blog Management
let blogs = [];
let filteredBlogs = [];
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
        const response = await fetch('/api/admin/blogs/bod-status', {
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

// Fetch blogs from API
async function fetchBlogs() {
    try {
        const queryParams = new URLSearchParams();
        const searchVal = document.getElementById('blogSearch')?.value.trim();
        const statusFilterVal = document.getElementById('blogStatusFilter')?.value;

        if (searchVal) queryParams.append('q', searchVal);

        // Map status filter to DB values
        if (statusFilterVal && statusFilterVal !== 'all') {
            let dbStatus = 'active';
            if (statusFilterVal === 'draft') dbStatus = 'hidden';
            queryParams.append('status', dbStatus);
        }

        const response = await fetch(`/api/admin/blogs?${queryParams.toString()}`, {
            headers: {
                ...authHeaders()
            }
        });

        if (response.ok) {
            const data = await response.json();
            blogs = data.blogs;
            filteredBlogs = [...blogs];
            bodLockState = data.bodStatus;

            // Update stats cards
            const elTotal = document.getElementById('statTotalBlogs');
            if (elTotal) elTotal.textContent = data.stats.total || 0;
            const elPublished = document.getElementById('statPublishedBlogs');
            if (elPublished) elPublished.textContent = data.stats.published || 0;
            const elDraft = document.getElementById('statDraftBlogs');
            if (elDraft) elDraft.textContent = data.stats.draft || 0;
            const elLastUpdate = document.getElementById('statLastUpdate');
            if (elLastUpdate) elLastUpdate.textContent = formatDate(data.stats.lastUpdate);

            renderBlogsTable();
        } else {
            const err = await response.json();
            showToast(err.message || 'Không thể lấy danh sách bài viết', 'warning');
        }
    } catch (error) {
        console.error('Error fetching blogs:', error);
        showToast('Có lỗi xảy ra khi kết nối máy chủ!', 'warning');
    }
}

// Render blogs table
function renderBlogsTable() {
    const tbody = document.getElementById('blogTableBody');
    if (!tbody) return;
    tbody.innerHTML = '';

    if (filteredBlogs.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="10" style="text-align: center; padding: 30px; color: var(--admin-muted);">
                    <i class="fa-solid fa-file-invoice" style="font-size: 32px; margin-bottom: 10px; display: block; opacity: 0.5;"></i>
                    Không có bài viết nào được tìm thấy.
                </td>
            </tr>
        `;
        const paginationDiv = document.getElementById('blogPagination');
        if (paginationDiv) paginationDiv.style.display = 'none';
        return;
    }

    const paginationDiv = document.getElementById('blogPagination');
    if (paginationDiv) paginationDiv.style.display = 'flex';

    // Pagination calculations
    const totalItems = filteredBlogs.length;
    const totalPages = Math.ceil(totalItems / pageSize);
    if (currentPage > totalPages) currentPage = Math.max(1, totalPages);

    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = Math.min(startIndex + pageSize, totalItems);
    const paginatedItems = filteredBlogs.slice(startIndex, endIndex);

    // Update pagination text
    const textEl = document.getElementById('blogPaginationText');
    if (textEl) {
        textEl.textContent = `Hiển thị ${totalItems > 0 ? startIndex + 1 : 0} - ${endIndex} trong tổng số ${totalItems} bài viết`;
    }

    // Render pagination buttons
    const btnContainer = document.getElementById('blogPaginationButtons');
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
                renderBlogsTable();
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
                renderBlogsTable();
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
                renderBlogsTable();
            }
        };
        btnContainer.appendChild(nextBtn);
    }

    paginatedItems.forEach(blog => {
        const tr = document.createElement('tr');
        tr.style.borderBottom = '1px solid var(--admin-line)';
        tr.style.height = '48px';

        // Status Badge rendering: DB values to UI text & classes
        let badgeClass = 'badge-draft';
        let badgeText = 'Bản nháp';
        if (blog.status === 'active') {
            badgeClass = 'badge-published';
            badgeText = 'Đã xuất bản';
        }

        // Disable actions if locked by BOD rules
        const isLocked = (bodLockState !== 'unlocked');
        const disabledAttr = isLocked ? 'disabled' : '';
        const disabledClass = isLocked ? 'btn-disabled' : '';

        // Author name
        const authorName = (blog.author && blog.author.name) ? blog.author.name : 'Nguyễn Thảo';

        tr.innerHTML = `
            <td style="padding: 8px 10px;"><input type="checkbox" aria-label="Chọn bài viết ${blog.title || ''}"></td>
            <td style="padding: 8px 10px; display: flex; align-items: center; gap: 8px; min-width: 200px;">
                <img src="${blog.thumbnail || '/images/lohoa_decor/lohoa01.jpg'}" alt="${blog.title || 'Blog'}" style="width: 50px; height: 30px; object-fit: cover; border-radius: 4px; border: 1px solid var(--admin-line); flex-shrink: 0;">
                <div style="min-width: 0; flex: 1;">
                    <strong style="color: var(--admin-text); display: block; font-size: 13px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" title="${blog.title || 'Chưa có tiêu đề'}">${blog.title || 'Chưa có tiêu đề'}</strong>
                    <span style="color: var(--admin-muted); font-size: 10px; display: block; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">Slug: ${blog.slug || ''}</span>
                </div>
            </td>
            <td style="padding: 8px 10px; color: var(--admin-text); font-size: 12px;">${blog.category || 'Xu hướng'}</td>
            <td style="padding: 8px 10px; color: var(--admin-text); font-size: 12px;">${authorName}</td>
            <td style="padding: 8px 10px; color: var(--admin-muted); font-size: 12px;">${formatDate(blog.createdAt || blog.updatedAt)}</td>
            <td style="padding: 8px 10px;"><span class="badge-custom ${badgeClass}">${badgeText}</span></td>
            <td style="padding: 8px 10px;"><span class="seo-badge seo-good" style="font-size: 10px; padding: 2px 6px;">Tốt</span></td>
            <td style="padding: 8px 10px; color: var(--admin-text); font-size: 12px;">${blog.views || 0}</td>
            <td style="padding: 8px 10px; text-align: center;">
                <button class="row-action-btn ${blog.featured === 'yes' ? 'featured-active' : ''}" data-feature-id="${blog._id}" title="Nổi bật" style="background: none; border: none; cursor: pointer; color: ${blog.featured === 'yes' ? '#fa8c16' : '#d9d9d9'}; font-size: 14px;">
                    <i class="fa-solid fa-star"></i>
                </button>
            </td>
            <td style="padding: 8px 10px; color: var(--admin-muted); font-size: 12px;">${formatDate(blog.updatedAt)}</td>
            <td style="padding: 8px 10px;">
                <div class="product-actions" style="justify-content: center;">
                    <button class="row-action-btn ${disabledClass}" ${disabledAttr} data-edit-id="${blog._id}" title="Chỉnh sửa"><i class="fa-regular fa-pen-to-square"></i></button>
                    <button class="row-action-btn" data-preview-id="${blog._id}" title="Xem trước"><i class="fa-regular fa-eye"></i></button>
                    <button class="row-action-btn ${disabledClass}" ${disabledAttr} data-duplicate-id="${blog._id}" title="Nhân bản"><i class="fa-regular fa-copy"></i></button>
                    <button class="row-action-btn danger ${disabledClass}" ${disabledAttr} data-delete-id="${blog._id}" title="Xóa"><i class="fa-regular fa-trash-can"></i></button>
                </div>
            </td>
        `;

        // Action Handlers
        tr.querySelector(`[data-preview-id="${blog._id}"]`).onclick = () => previewBlog(blog._id);

        if (isLocked) {
            tr.querySelectorAll('.row-action-btn.' + disabledClass).forEach(btn => {
                btn.onclick = (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    showLockedAlert();
                };
            });
            tr.querySelector(`[data-feature-id="${blog._id}"]`).onclick = (e) => {
                e.preventDefault();
                e.stopPropagation();
                showLockedAlert();
            };
        } else {
            tr.querySelector(`[data-edit-id="${blog._id}"]`).onclick = () => editBlog(blog._id);
            tr.querySelector(`[data-duplicate-id="${blog._id}"]`).onclick = () => duplicateBlog(blog._id);
            tr.querySelector(`[data-delete-id="${blog._id}"]`).onclick = () => deleteBlog(blog._id);
            tr.querySelector(`[data-feature-id="${blog._id}"]`).onclick = () => toggleFeatured(blog._id);
        }

        tbody.appendChild(tr);
    });
}

// Toggle BOD Alert bar based on state
function updateBODAlertUI() {
    const alertBox = document.getElementById('bodAlert');
    const btnCreate = document.getElementById('btnCreateBlog');
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
                        Blog/Bài viết chỉ được cập nhật tối đa 6 tháng một lần. Lần cập nhật cuối là ngày <strong>${formatDate(lastUpdateDate)}</strong>.
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
                        Yêu cầu sửa đổi hoặc viết bài mới đã được gửi đi. <strong>Đang đợi Hội đồng quản trị duyệt...</strong>
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
                        Hội đồng quản trị đã phê duyệt yêu cầu của bạn. Tính năng viết bài/chỉnh sửa đã được <strong>mở khóa</strong>.
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
        const response = await fetch('/api/admin/blogs/request-bod', {
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
            fetchBlogs(); // Refresh state
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
        const response = await fetch('/api/admin/blogs/approve-bod', {
            method: 'POST',
            headers: {
                ...authHeaders()
            }
        });
        if (response.ok) {
            const data = await response.json();
            bodLockState = data.status;
            updateBODAlertUI();
            fetchBlogs(); // Refresh list to update active state/actions
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
        const response = await fetch('/api/admin/blogs/lock-bod', {
            method: 'POST',
            headers: {
                ...authHeaders()
            }
        });
        if (response.ok) {
            const data = await response.json();
            bodLockState = data.status;
            updateBODAlertUI();
            fetchBlogs();
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
function openCreateBlogForm() {
    if (bodLockState !== 'unlocked') {
        showLockedAlert();
        return;
    }
    document.getElementById('editBlogId').value = '';
    document.getElementById('blogForm').reset();
    document.getElementById('blogFormTitle').textContent = 'Viết bài mới';
    document.getElementById('blogBreadcrumb').textContent = 'Viết bài';
    document.getElementById('blogImgPreview').style.display = 'none';
    document.getElementById('blogUploadPlaceholder').style.display = 'block';
    document.getElementById('blogImgUrl').value = '';

    document.getElementById('blogManagerView').hidden = true;
    document.getElementById('blogFormView').hidden = false;
}

function closeBlogForm() {
    document.getElementById('blogFormView').hidden = true;
    document.getElementById('blogManagerView').hidden = false;
}

// Preview uploaded image
function previewBlogImage(input) {
    if (input.files && input.files[0]) {
        const reader = new FileReader();
        reader.onload = function(e) {
            document.getElementById('blogImgPreview').src = e.target.result;
            document.getElementById('blogImgPreview').style.display = 'block';
            document.getElementById('blogUploadPlaceholder').style.display = 'none';
            document.getElementById('blogImgUrl').value = e.target.result;
        };
        reader.readAsDataURL(input.files[0]);
    }
}

// Edit blog
function editBlog(id) {
    if (bodLockState !== 'unlocked') {
        showLockedAlert();
        return;
    }
    const blog = blogs.find(b => b._id === id);
    if (!blog) return;

    document.getElementById('editBlogId').value = blog._id;
    document.getElementById('blogTitle').value = blog.title || '';
    document.getElementById('blogExcerpt').value = blog.summary || '';
    document.getElementById('blogContent').value = blog.content || '';

    // Map DB status back to form
    let uiStatus = 'draft';
    if (blog.status === 'active') uiStatus = 'published';
    document.getElementById('blogStatus').value = uiStatus;

    if (blog.thumbnail) {
        document.getElementById('blogImgPreview').src = blog.thumbnail;
        document.getElementById('blogImgPreview').style.display = 'block';
        document.getElementById('blogUploadPlaceholder').style.display = 'none';
        document.getElementById('blogImgUrl').value = blog.thumbnail;
    } else {
        document.getElementById('blogImgPreview').style.display = 'none';
        document.getElementById('blogUploadPlaceholder').style.display = 'block';
        document.getElementById('blogImgUrl').value = '';
    }

    document.getElementById('blogFormTitle').textContent = 'Chỉnh sửa bài viết ' + blog._id;
    document.getElementById('blogBreadcrumb').textContent = 'Chỉnh sửa bài viết';

    document.getElementById('blogManagerView').hidden = true;
    document.getElementById('blogFormView').hidden = false;
}

// Save Blog (Create or Update)
async function saveBlog() {
    const id = document.getElementById('editBlogId').value;
    const title = document.getElementById('blogTitle').value.trim();
    const summary = document.getElementById('blogExcerpt').value.trim();
    const content = document.getElementById('blogContent').value.trim();
    
    // Map status UI to DB
    const statusVal = document.getElementById('blogStatus').value;
    let status = 'hidden';
    if (statusVal === 'published' || statusVal === 'scheduled') status = 'active';

    const thumbnail = document.getElementById('blogImgUrl').value || '/images/lohoa_decor/lohoa01.jpg';

    if (!title || !content) {
        showToast("Vui lòng điền tiêu đề và nội dung bài viết!", "warning");
        return;
    }

    const payload = {
        title,
        summary,
        content,
        status,
        thumbnail
    };

    const isEdit = !!id;
    const url = isEdit ? `/api/admin/blogs/${id}` : '/api/admin/blogs';
    const method = isEdit ? 'PATCH' : 'POST';

    showToast("Đang lưu thông tin bài viết...", "info");
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
            showToast(isEdit ? "Cập nhật bài viết thành công!" : "Viết bài mới thành công!", "success");
            closeBlogForm();
            fetchBlogs();
        } else {
            const err = await response.json();
            showToast(err.message || 'Lưu bài viết thất bại!', 'warning');
        }
    } catch (error) {
        console.error('Error saving blog:', error);
        showToast('Có lỗi xảy ra!', 'warning');
    }
}

// Duplicate Blog
async function duplicateBlog(id) {
    if (bodLockState !== 'unlocked') {
        showLockedAlert();
        return;
    }
    const blog = blogs.find(b => b._id === id);
    if (!blog) return;

    const payload = {
        title: (blog.title || '') + ' (Bản sao)',
        summary: blog.summary || '',
        content: blog.content || '',
        status: 'hidden', // Save duplicated as draft/hidden
        thumbnail: blog.thumbnail
    };

    showToast("Đang nhân bản bài viết...", "info");
    try {
        const response = await fetch('/api/admin/blogs', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...authHeaders()
            },
            body: JSON.stringify(payload)
        });

        if (response.ok) {
            showToast("Đã nhân bản bài viết thành công!", "success");
            fetchBlogs();
        } else {
            const err = await response.json();
            showToast(err.message || 'Nhân bản thất bại!', 'warning');
        }
    } catch (error) {
        console.error('Error duplicating blog:', error);
        showToast('Có lỗi xảy ra!', 'warning');
    }
}

// Delete Blog
async function deleteBlog(id) {
    if (bodLockState !== 'unlocked') {
        showLockedAlert();
        return;
    }
    if (!confirm("Bạn có chắc chắn muốn xóa bài viết này không?")) return;

    showToast("Đang xóa bài viết...", "info");
    try {
        const response = await fetch(`/api/admin/blogs/${id}`, {
            method: 'DELETE',
            headers: {
                ...authHeaders()
            }
        });

        if (response.ok) {
            showToast("Đã xóa bài viết thành công!", "success");
            fetchBlogs();
        } else {
            const err = await response.json();
            showToast(err.message || 'Xóa bài viết thất bại!', 'warning');
        }
    } catch (error) {
        console.error('Error deleting blog:', error);
        showToast('Có lỗi xảy ra!', 'warning');
    }
}

// Preview Blog
function previewBlog(id) {
    const blog = blogs.find(b => b._id === id);
    if (!blog) return;
    alert(`[Xem trước Bài viết]\nTiêu đề: ${blog.title || ''}\nDanh mục: Xu hướng\nTrạng thái: ${blog.status === 'active' ? 'Đã xuất bản' : 'Bản nháp'}`);
}

// Toggle Featured
async function toggleFeatured(id) {
    if (bodLockState !== 'unlocked') {
        showLockedAlert();
        return;
    }
    const blog = blogs.find(b => b._id === id);
    if (!blog) return;

    const newFeatured = blog.featured === 'yes' ? 'no' : 'yes';

    showToast("Đang cập nhật trạng thái nổi bật...", "info");
    try {
        const response = await fetch(`/api/admin/blogs/${id}`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                ...authHeaders()
            },
            body: JSON.stringify({ featured: newFeatured }) // We can handle custom patch in future if needed
        });

        if (response.ok) {
            showToast("Đã cập nhật trạng thái nổi bật bài viết!", "success");
            fetchBlogs();
        } else {
            // Just simulate locally if DB doesn't have it explicitly or fail gracefully
            blog.featured = newFeatured;
            renderBlogsTable();
            showToast("Đã cập nhật trạng thái nổi bật (mô phỏng)!", "success");
        }
    } catch (error) {
        console.error('Error toggling featured:', error);
        showToast('Có lỗi xảy ra!', 'warning');
    }
}

// Filter functions
function filterBlogs() {
    fetchBlogs();
}

function resetBlogFilters() {
    const search = document.getElementById('blogSearch');
    const status = document.getElementById('blogStatusFilter');
    
    if (search) search.value = '';
    if (status) status.value = 'all';
    
    fetchBlogs();
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
    fetchBlogs();

    const pageSizeSelect = document.getElementById('blogPageSizeSelect');
    if (pageSizeSelect) {
        pageSizeSelect.value = pageSize;
        pageSizeSelect.addEventListener('change', (e) => {
            pageSize = parseInt(e.target.value, 10);
            currentPage = 1;
            renderBlogsTable();
        });
    }
});
