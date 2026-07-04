import { supabase } from '../supabaseClient.js';

export function LoginView() {
    return `
        <div id="login-section">
            <h1>Login</h1>
            <input type="email" id="login-email" placeholder="이메일을 입력하세요">
            <input type="password" id="login-pw" placeholder="비밀번호를 입력하세요">
            <button class="pink-button" id="login-btn">로그인</button>
            <p id="login-error" class="login-error"></p>
        </div>
    `;
}

// LoginView가 화면에 삽입된 "이후에" 호출해야 합니다.
// onLoginSuccess: 로그인 성공 시 실행할 콜백 (예: 대시보드로 이동)
export function initLogin(onLoginSuccess) {
    const loginBtn = document.getElementById('login-btn');
    const emailInput = document.getElementById('login-email');
    const pwInput = document.getElementById('login-pw');
    const errorEl = document.getElementById('login-error');

    loginBtn.addEventListener('click', () => handleLogin());

    // 엔터키로도 로그인되게
    pwInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') handleLogin();
    });

    async function handleLogin() {
        const email = emailInput.value.trim();
        const password = pwInput.value.trim();

        if (!email || !password) {
            showError('이메일과 비밀번호를 입력해주세요.');
            return;
        }

        loginBtn.disabled = true;
        loginBtn.innerText = '로그인 중...';
        showError('');

        const { data, error } = await supabase.auth.signInWithPassword({ email, password });

        loginBtn.disabled = false;
        loginBtn.innerText = '로그인';

        if (error) {
            showError('이메일 또는 비밀번호가 올바르지 않아요.');
            return;
        }

        if (data.session) {
            onLoginSuccess();
        }
    }

    function showError(msg) {
        if (errorEl) errorEl.innerText = msg;
    }
}