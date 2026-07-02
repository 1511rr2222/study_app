import { HeaderView } from './page/header.js';
import { LoginView, initLogin } from './page/login.js';
import { DashboardView } from './page/dashboard.js';
import { initHomeworkSummary, HomeworkPageView, initHomeworkPage } from './page/homework.js';

const app = document.getElementById('app');

function navigate(page) {
    const header = HeaderView(); // 헤더는 항상 표시하고, 내용만 갈아끼우기

    if (page === 'login') {
        app.innerHTML = header + LoginView();
        initLogin(() => navigate('dashboard')); // 로그인 성공 시 대시보드로 이동
    } else if (page === 'dashboard') {
        app.innerHTML = header + DashboardView();
        initHomeworkSummary(() => navigate('homework')); // 요약 카드 클릭 시 체크 페이지로 이동
    } else if (page === 'homework') {
        app.innerHTML = header + HomeworkPageView();
        initHomeworkPage(() => navigate('dashboard')); // 뒤로가기 시 대시보드로 복귀
    }
}

// 처음 실행
navigate('login');