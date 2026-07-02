export function HeaderView() {
    return `
        <header class="main-header">
            <div class="logo">
                <img src="logo.png" alt="캐릭터 로고" class="header-mascot">
                예린's Education App
            </div>
            <nav>
                <a href="#" id="nav-home-btn">홈</a>
                <a href="#">내 수업</a>
                <a href="#">로그아웃</a>
            </nav>
        </header>
    `;
}