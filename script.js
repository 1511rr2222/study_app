import { HeaderView } from './page/header.js';
import { LoginView, initLogin } from './page/login.js';
import { initHomeworkSummary, HomeworkPageView, initHomeworkPage } from './page/homework.js';
import { CompetencyMainView, initCompetencyMainPage } from './page/competencyMain.js';
import { CompetencySurveyView, initCompetencySurveyPage } from './page/competencySurvey.js';
import { DashboardView, initDashboardEvents } from './page/dashboard.js';
import { CompetencyPracticeView, initCompetencyPracticePage } from './page/competencyPractice.js';
import { CompetencyResultView, initCompetencyResultPage } from './page/competencyResult.js';
import { VocabMainView, initVocabMainPage, VocabPracticeView, initVocabPracticePage } from './page/vocab.js';
import { GradesView, initGradesPage } from './page/grades.js';
import { PlanPageView, initPlanPage } from './page/plan.js';
import { supabase } from './supabaseClient.js';

const app = document.getElementById('app');

function navigate(page, param, opts = {}) {
    const { fromPopState = false } = opts;
    const header = HeaderView(); 

    if (page === 'login') {
        app.innerHTML = header + LoginView();
        initLogin(() => navigate('dashboard')); // 로그인 성공 시 대시보드로 이동
    } else if (page === 'dashboard') {
        app.innerHTML = header + DashboardView();
        initDashboardEvents();
        initHomeworkSummary(() => navigate('homework')); // 요약 카드 클릭 시 체크 페이지로 이동
        document.getElementById('open-competency-btn').addEventListener('click', () => navigate('competency'));
        document.getElementById('open-vocab-btn').addEventListener('click', () => navigate('vocab'));
        document.getElementById('open-grades-btn').addEventListener('click', () => navigate('grades'));
    } else if (page === 'homework') {
        app.innerHTML = header + HomeworkPageView();
        initHomeworkPage(() => navigate('dashboard')); // 뒤로가기 시 대시보드로 복귀
    } else if (page === 'plan') {
        app.innerHTML = header + PlanPageView();
        initPlanPage(() => navigate('dashboard')); // 뒤로가기 시 대시보드로 복귀
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
        initCompetencyResultPage(
            () => navigate('competency'),
            (traitId) => navigate('competency-practice', traitId) // ✅ 카드 클릭 시 해당 역량 설명 페이지로
        );
    } else if (page === 'vocab') {
        app.innerHTML = header + VocabMainView();
        initVocabMainPage(
            () => navigate('dashboard'),                          // 뒤로가기 시 대시보드로 복귀
            (day) => navigate('vocab-practice', day)               // day 선택 시 퀴즈 화면으로 이동
        );
    } else if (page === 'vocab-practice') {
        app.innerHTML = header + VocabPracticeView(param);
        initVocabPracticePage(param, () => navigate('vocab'));      // 뒤로가기/완료 시 Day 목록으로 복귀
    } else if (page === 'grades') {
        app.innerHTML = header + GradesView();
        initGradesPage(() => navigate('dashboard'));
    }

    const homeBtn = document.getElementById('nav-home-btn');
    if (homeBtn) {
        homeBtn.addEventListener('click', (e) => {
            e.preventDefault();
            navigate('dashboard');
        });
    }

    const planBtn = document.getElementById('nav-plan-btn');
    if (planBtn) {
        planBtn.addEventListener('click', (e) => {
            e.preventDefault();
            navigate('plan');
        });
    }
    if (!fromPopState) {
        history.pushState({ page, param }, '', `#${page}`);
    }

    const logoutBtn = document.getElementById('nav-logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', async (e) => {
            e.preventDefault();
            await supabase.auth.signOut();
            navigate('login');
        });
    }
}

async function init() {
    const { data: { session } } = await supabase.auth.getSession();
    const initialPage = session ? 'dashboard' : 'login';
    history.replaceState({ page: initialPage }, '', `#${initialPage}`);
    navigate(initialPage, undefined, { fromPopState: true });
}

supabase.auth.onAuthStateChange((event) => {
    if (event === 'SIGNED_OUT') {
        navigate('login');
    }
});
// ✅ 안드로이드 뒤로가기(또는 브라우저 뒤로가기)를 눌렀을 때 앱 안에서 이전 화면으로 이동
window.addEventListener('popstate', (e) => {
    const state = e.state;
    if (state && state.page) {
        navigate(state.page, state.param, { fromPopState: true });
    } else {
        navigate('dashboard', undefined, { fromPopState: true });
    }
});

init();