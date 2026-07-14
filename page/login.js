import { supabase } from '../supabaseClient.js';

const PENDING_NAME_KEY = 'yerin_pending_signup_name';

let mode = 'login'; // 'login' | 'signup'

export function LoginView() {
    return `
        <div id="login-section">
            <h1 id="login-title">Login</h1>

            <div id="signup-name-field" style="display:none;">
                <input type="text" id="signup-name" placeholder="이름을 입력하세요 (예: 예린)">
            </div>

            <input type="email" id="login-email" placeholder="이메일을 입력하세요">
            <input type="password" id="login-pw" placeholder="비밀번호를 입력하세요">
            <button class="pink-button" id="login-btn">로그인</button>
            <p id="login-error" class="login-error"></p>
            <button type="button" id="login-mode-toggle" class="login-mode-toggle">계정이 없으신가요? 회원가입</button>
        </div>
    `;
}

// LoginView가 화면에 삽입된 "이후에" 호출해야 합니다.
// onLoginSuccess: 로그인 성공 시 실행할 콜백 (예: 대시보드로 이동)
export function initLogin(onLoginSuccess) {
    mode = 'login';

    const loginBtn = document.getElementById('login-btn');
    const emailInput = document.getElementById('login-email');
    const pwInput = document.getElementById('login-pw');
    const errorEl = document.getElementById('login-error');
    const nameField = document.getElementById('signup-name-field');
    const nameInput = document.getElementById('signup-name');
    const titleEl = document.getElementById('login-title');
    const toggleBtn = document.getElementById('login-mode-toggle');

    function applyMode() {
        const isSignup = mode === 'signup';
        titleEl.textContent = isSignup ? '회원가입' : 'Login';
        nameField.style.display = isSignup ? '' : 'none';
        loginBtn.textContent = isSignup ? '회원가입' : '로그인';
        toggleBtn.textContent = isSignup ? '이미 계정이 있으신가요? 로그인' : '계정이 없으신가요? 회원가입';
        showError('');
    }

    toggleBtn.addEventListener('click', () => {
        mode = mode === 'login' ? 'signup' : 'login';
        applyMode();
    });

    loginBtn.addEventListener('click', () => handleSubmit());
    pwInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') handleSubmit();
    });

    async function handleSubmit() {
        const email = emailInput.value.trim();
        const password = pwInput.value.trim();

        if (!email || !password) {
            showError('이메일과 비밀번호를 입력해주세요.');
            return;
        }

        if (mode === 'signup') {
            await handleSignup(email, password);
        } else {
            await handleLogin(email, password);
        }
    }

    async function handleLogin(email, password) {
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
            // ✅ 이메일 인증 때문에 회원가입 직후엔 프로필을 못 만들었을 수도 있어서,
            //    로그인할 때마다 "혹시 프로필이 없으면" 만들어주는 안전장치
            await ensureProfile(data.session.user);
            onLoginSuccess();
        }
    }

    async function handleSignup(email, password) {
        const name = nameInput.value.trim();
        if (!name) {
            showError('이름을 입력해주세요.');
            return;
        }
        if (password.length < 6) {
            showError('비밀번호는 6자 이상이어야 해요.');
            return;
        }

        loginBtn.disabled = true;
        loginBtn.innerText = '가입하는 중...';
        showError('');

        // 이메일 인증 때문에 세션이 바로 안 생길 수 있어서, 이름을 잠깐 저장해두고
        // 나중에(첫 로그인 시점에) ensureProfile이 이 이름을 꺼내 쓰게 함
        localStorage.setItem(PENDING_NAME_KEY, name);

        const { data, error } = await supabase.auth.signUp({ email, password });

        loginBtn.disabled = false;
        loginBtn.innerText = '회원가입';

        if (error) {
            showError(
                error.message && error.message.toLowerCase().includes('already registered')
                    ? '이미 가입된 이메일이에요.'
                    : '회원가입 중 문제가 생겼어요.'
            );
            return;
        }

        if (data.session) {
            // ✅ 이메일 인증이 꺼져 있는 프로젝트: 가입 즉시 로그인됨
            await ensureProfile(data.session.user);
            onLoginSuccess();
        } else {
            // ✅ 이메일 인증이 켜져 있는 프로젝트: 메일 확인 후 로그인해야 함
            showError('가입 확인 메일을 보냈어요! 메일함을 확인한 뒤 로그인해주세요.');
            mode = 'login';
            applyMode();
        }
    }

    // 이 유저의 profiles row가 없으면 만들어줌 (회원가입 직후든, 이메일 인증 후 첫 로그인이든 언제든 안전하게)
    async function ensureProfile(user) {
        if (!user) return;

        const { data: existing, error: fetchError } = await supabase
            .from('profiles')
            .select('id')
            .eq('id', user.id)
            .maybeSingle();

        if (fetchError) {
            console.error('프로필 확인 실패:', fetchError);
            return;
        }
        if (existing) return; // 이미 있음

        const pendingName = localStorage.getItem(PENDING_NAME_KEY);
        const fallbackName = user.email ? user.email.split('@')[0] : '나';
        const name = pendingName || fallbackName;

        const { error: insertError } = await supabase
            .from('profiles')
            .insert({ id: user.id, display_name: name });

        if (insertError) {
            console.error('프로필 생성 실패:', insertError);
            return;
        }

        localStorage.removeItem(PENDING_NAME_KEY);
    }

    function showError(msg) {
        if (errorEl) errorEl.innerText = msg;
    }

    applyMode();
}
