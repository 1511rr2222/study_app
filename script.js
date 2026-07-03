import { HeaderView } from './page/header.js';
import { LoginView, initLogin } from './page/login.js';
import { initHomeworkSummary, HomeworkPageView, initHomeworkPage } from './page/homework.js';
import { CompetencyMainView, initCompetencyMainPage } from './page/competencyMain.js';
import { CompetencySurveyView, initCompetencySurveyPage } from './page/competencySurvey.js';
import { DashboardView, initDashboardEvents } from './page/dashboard.js';
import { CompetencyPracticeView, initCompetencyPracticePage } from './page/competencyPractice.js';

const app = document.getElementById('app');

function navigate(page, param) {
    const header = HeaderView(); // 헤더는 항상 표시하고, 내용만 갈아끼우기

    if (page === 'login') {
        app.innerHTML = header + LoginView();
        initLogin(() => navigate('dashboard')); // 로그인 성공 시 대시보드로 이동
    } else if (page === 'dashboard') {
        app.innerHTML = header + DashboardView();
        initDashboardEvents();
        initHomeworkSummary(() => navigate('homework')); // 요약 카드 클릭 시 체크 페이지로 이동
        document.getElementById('open-competency-btn').addEventListener('click', () => navigate('competency'));
    } else if (page === 'homework') {
        app.innerHTML = header + HomeworkPageView();
        initHomeworkPage(() => navigate('dashboard')); // 뒤로가기 시 대시보드로 복귀
    } else if (page === 'competency') {
        app.innerHTML = header + CompetencyMainView();
        initCompetencyMainPage(
            () => navigate('dashboard'),       // 뒤로가기 시 대시보드로 복귀
            () => navigate('competency-survey'),
            (traitId) => navigate('competency-practice' , traitId) 
        );
    } else if (page === 'competency-survey') {
        app.innerHTML = header + CompetencySurveyView();
        initCompetencySurveyPage(
            () => navigate('competency'), // 설문 완료 시 메인 페이지로 (결과 반영됨)
            () => navigate('competency')  // 진단 취소 시 메인 페이지로
        );
    } else if (page === 'competency-practice') {
        app.innerHTML = header + CompetencyPracticeView(param);
        initCompetencyPracticePage(param, () => navigate('competency'));
    }

    // 헤더는 항상 렌더링되므로, '홈' 링크도 매번 새로 이벤트를 걸어줌
    const homeBtn = document.getElementById('nav-home-btn');
    if (homeBtn) {
        homeBtn.addEventListener('click', (e) => {
            e.preventDefault();
            navigate('dashboard');
        });
    }
}

// 처음 실행
navigate('login');