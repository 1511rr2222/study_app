import { supabase } from '../supabaseClient.js';

let cachedName = null;

export function HeaderView() {
    const displayText = cachedName ? `${cachedName}'s Education App` : "Education App";
    return `
        <header class="main-header">
            <div class="header-inner">
                <div class="logo">
                    <img src="logo.png" alt="캐릭터 로고" class="header-mascot">
                    <span class="logo-text" id="header-user-name">${displayText}</span>
                </div>
                <nav>
                    <a href="#" id="nav-home-btn">홈</a>
                    <a href="#" id="nav-plan-btn">내 계획</a>
                    <a href="#" id="nav-buddy-btn">친구</a>
                    <a href="#" id="nav-help-btn">도움말</a>
                    <a href="#" id="nav-logout-btn">로그아웃</a>
                </nav>            </div>
        </header>
    `;
}

// HeaderView가 화면에 삽입된 "이후에" 호출하세요 (navigate() 안에서 매번 한 번씩).
export async function initHeaderName() {
    const el = document.getElementById('header-user-name');

    if (cachedName) {
        if (el) el.textContent = `${cachedName}'s Education App`;
        return;
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
        .from('profiles')
        .select('display_name')
        .eq('id', user.id)
        .maybeSingle();

    if (error) {
        console.error('프로필 이름 로드 실패:', error);
        return;
    }

    if (data?.display_name) {
        cachedName = data.display_name;
        const el2 = document.getElementById('header-user-name');
        if (el2) el2.textContent = `${cachedName}'s Education App`;
    }
}

// ✅ 로그아웃 시 캐시를 비워서, 다음에 다른 사람이 로그인해도 이름이 안 섞이게 함
export function clearHeaderNameCache() {
    cachedName = null;
}
