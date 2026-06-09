const API_BASE = '/api';

const storage = {
    set(session, remember) {
        const target = remember ? localStorage : sessionStorage;
        target.setItem('casaSession', JSON.stringify(session));
        if (remember) sessionStorage.removeItem('casaSession');
        else localStorage.removeItem('casaSession');
    }
};

function formData(form) {
    return Object.fromEntries(new FormData(form).entries());
}

async function request(path, options = {}) {
    const response = await fetch(`${API_BASE}${path}`, {
        headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
        ...options
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.message || 'Có lỗi xảy ra.');
    return data;
}

function setupPasswordToggle() {
    document.querySelectorAll('.toggle-pass').forEach((button) => {
        button.addEventListener('click', () => {
            const input = button.parentElement.querySelector('input');
            input.type = input.type === 'password' ? 'text' : 'password';
            button.querySelector('i').classList.toggle('fa-eye-slash');
        });
    });
}

function setMessage(text, ok = false) {
    const message = document.querySelector('#authMessage');
    if (!message) return;
    message.textContent = text;
    message.classList.toggle('ok', ok);
}

function redirectAfterAuth(session) {
    const requested = new URLSearchParams(location.search).get('redirect') || '';
    const safeRequested = requested.startsWith('/') && !requested.startsWith('//') ? requested : '';
    if (['admin', 'staff'].includes(session?.user?.role)) {
        window.location.href = safeRequested || '/management/index.html';
        return;
    }
    window.location.href = safeRequested.startsWith('/customers/') ? safeRequested : '/customers/index.html';
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

setupPasswordToggle();
hydrateCasaLogos();
// setupFloatingZalo(); // Disabled - Using AI Chatbot instead

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
    document.querySelectorAll('.auth-logo-mark').forEach((mark) => {
        mark.innerHTML = casaLogoSvg();
    });
}

const loginForm = document.querySelector('#loginForm');
if (loginForm) {
    loginForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        const values = formData(loginForm);
        try {
            const session = await request('/auth/login', {
                method: 'POST',
                body: JSON.stringify({ email: values.email, password: values.password })
            });
            storage.set(session, Boolean(values.remember));
            setMessage('Đăng nhập thành công. Đang chuyển trang...', true);
            setTimeout(() => redirectAfterAuth(session), 450);
        } catch (error) {
            setMessage(error.message);
        }
    });
}

const registerForm = document.querySelector('#registerForm');
if (registerForm) {
    registerForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        const values = formData(registerForm);
        try {
            const session = await request('/auth/register', {
                method: 'POST',
                body: JSON.stringify(values)
            });
            storage.set(session, true);
            setMessage('Đăng ký thành công. Đang chuyển trang...', true);
            setTimeout(() => redirectAfterAuth(session), 450);
        } catch (error) {
            setMessage(error.message);
        }
    });
}

const forgotForm = document.querySelector('#forgotForm');
if (forgotForm) {
    forgotForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        const values = formData(forgotForm);
        try {
            const data = await request('/auth/forgot-password', {
                method: 'POST',
                body: JSON.stringify({ email: values.email })
            });
            setMessage(data.message, true);
        } catch (error) {
            setMessage(error.message);
        }
    });
}

const resetForm = document.querySelector('#resetForm');
if (resetForm) {
    const params = new URLSearchParams(location.search);
    resetForm.elements.email.value = params.get('email') || '';
    resetForm.elements.token.value = params.get('token') || '';
    resetForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        const values = formData(resetForm);
        if (values.password !== values.confirmPassword) {
            setMessage('Mat khau xac nhan khong khop.');
            return;
        }
        try {
            await request('/auth/reset-password', {
                method: 'POST',
                body: JSON.stringify({ email: values.email, token: values.token, password: values.password })
            });
            setMessage('Dat lai mat khau thanh cong. Dang chuyen trang...', true);
            setTimeout(() => window.location.href = '/customers/login.html', 700);
        } catch (error) {
            setMessage(error.message);
        }
    });
}

