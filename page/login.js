export function LoginView() {
    return `
        <div id="login-section">
            <h1>Login</h1>
            <input type="text" id="login-id" placeholder="아이디를 입력하세요">
            <input type="password" id="login-pw" placeholder="비밀번호를 입력하세요">
            <button class="pink-button" id="login-btn">로그인</button>
        </div>
    `;
}

// LoginView가 화면에 삽입된 "이후에" 호출해야 합니다.
// onLoginSuccess: 로그인 성공 시 실행할 콜백 (예: 대시보드로 이동)
export function initLogin(onLoginSuccess) {
    const loginBtn = document.getElementById('login-btn');

    loginBtn.addEventListener('click', () => {
        console.log("로그인 버튼이 눌렸습니다!");

        const idInput = document.getElementById('login-id');
        const pwInput = document.getElementById('login-pw');

        const id = idInput.value.trim();
        const pw = pwInput.value.trim();

        if (!id || !pw) {
            alert('아이디와 비밀번호를 입력해주세요.');
            return;
        }

        onLoginSuccess();
    });
}