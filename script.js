import { HeaderView } from './page/header.js';
import { LoginView, initLogin } from './page/login.js';
import { initHomeworkSummary, HomeworkPageView, initHomeworkPage } from './page/homework.js';
import { CompetencyMainView, initCompetencyMainPage } from './page/competencyMain.js';
import { CompetencySurveyView, initCompetencySurveyPage } from './page/competencySurvey.js';
import { DashboardView, initDashboardEvents } from './page/dashboard.js';
import { CompetencyPracticeView, initCompetencyPracticePage } from './page/competencyPractice.js';
import { CompetencyResultView, initCompetencyResultPage } from './page/competencyResult.js';
import { VocabMainView, initVocabMainPage, VocabPracticeView, initVocabPracticePage } from './page/vocab.js';
import { supabase } from './supabaseClient.js';

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
        document.getElementById('open-vocab-btn').addEventListener('click', () => navigate('vocab'));
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
            () => navigate('competency-result'), 
            () => navigate('competency')  
        );
    } else if (page === 'competency-practice') {
        app.innerHTML = header + CompetencyPracticeView(param);
        initCompetencyPracticePage(param, () => navigate('competency'));
    } else if (page === 'competency-result') {
        app.innerHTML = header + CompetencyResultView();
        initCompetencyResultPage(() => navigate('competency'));
    } else if (page === 'vocab') {
        app.innerHTML = header + VocabMainView();
        initVocabMainPage(
            () => navigate('dashboard'),                          // 뒤로가기 시 대시보드로 복귀
            (day) => navigate('vocab-practice', day)               // day 선택 시 퀴즈 화면으로 이동
        );
    } else if (page === 'vocab-practice') {
        app.innerHTML = header + VocabPracticeView(param);
        initVocabPracticePage(param, () => navigate('vocab'));      // 뒤로가기/완료 시 Day 목록으로 복귀
    }

    const homeBtn = document.getElementById('nav-home-btn');
    if (homeBtn) {
        homeBtn.addEventListener('click', (e) => {
            e.preventDefault();
            navigate('dashboard');
        });
    }

    // 로그아웃 버튼이 헤더에 있다면 연결 (없으면 무시됨)
    const logoutBtn = document.getElementById('nav-logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', async (e) => {
            e.preventDefault();
            await supabase.auth.signOut();
            navigate('login');
        });
    }
}

// 처음 실행: 이미 로그인된 세션이 있으면 대시보드로, 없으면 로그인 화면으로
async function init() {
    const { data: { session } } = await supabase.auth.getSession();
    navigate(session ? 'dashboard' : 'login');
}

// 로그인/로그아웃 등 인증 상태가 바뀔 때도 반응 (예: 토큰 만료로 자동 로그아웃된 경우)
supabase.auth.onAuthStateChange((event) => {
    if (event === 'SIGNED_OUT') {
        navigate('login');
    }
});

init();