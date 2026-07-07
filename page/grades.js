import { supabase } from '../supabaseClient.js';
import { SchoolTabView, initSchoolTab } from './grades/schoolTab.js';
import { MockTabView, initMockTab } from './grades/mockTab.js';
import { AnalysisTabView, initAnalysisTab } from './grades/analysisTab.js';

// ---------- View ----------
export function GradesView() {
    return `
        <div class="grades-container">
            <button id="grades-back-btn" class="grades-back-btn">← 대시보드로</button>
            <h2 class="grades-title">📊 성적 기록</h2>

            <div class="grades-tabs">
                <button class="grades-tab-btn active" data-tab="school">내신 입력</button>
                <button class="grades-tab-btn" data-tab="mock">모의고사 입력</button>
                <button class="grades-tab-btn" data-tab="analysis">성적 분석</button>
            </div>

            ${SchoolTabView()}
            ${MockTabView()}
            ${AnalysisTabView()}
        </div>
    `;
}

// ---------- Init ----------
export async function initGradesPage(onBack) {
    const backBtn = document.getElementById('grades-back-btn');
    if (backBtn) backBtn.addEventListener('click', onBack);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // ===== 탭 전환 =====
    const tabBtns = document.querySelectorAll('.grades-tab-btn');
    const panels = document.querySelectorAll('.grades-tab-panel');
    const renderAnalysis = initAnalysisTab(user);

    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            tabBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            const tab = btn.dataset.tab;
            panels.forEach(p => {
                p.style.display = p.dataset.panel === tab ? '' : 'none';
            });
            if (tab === 'analysis') renderAnalysis();
        });
    });

    // ===== 각 탭 초기화 =====
    await Promise.all([
        initSchoolTab(user),
        initMockTab(user),
    ]);
}