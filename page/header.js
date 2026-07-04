export function HeaderView() {
    return `
        <header class="main-header">
            <div class="header-inner">
                <div class="logo">
                    <img src="logo.png" alt="캐릭터 로고" class="header-mascot">
                    <span class="logo-text">예린's Education App</span>
                </div>
                <nav>
                    <a href="#" id="nav-home-btn">홈</a>
                    <a href="#">내 수업</a>
                    <a href="#" id="nav-logout-btn">로그아웃</a>
                </nav>
            </div>
        </header>
    `;
}