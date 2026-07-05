import { TRAITS, CATEGORY_CLASS } from './competencyData.js';
import { initMetaPractice } from './practice/metaPractice.js';
import { initDeepPractice } from './practice/deepPractice.js';
// 새 역량 추가 시: 아래처럼 import 한 줄 추가
// import { initGritPractice } from './practice/gritPractice.js';

const TRAIT_EMOJI = {
    meta: '🧠',
    deep: '🔗',
    selfdirected: '🧭',
    grit: '🔥',
    selfefficacy: '💪',
    resilience: '🌈',
    interest: '✨',
    internalization: '🎯',
    timemanagement: '⏰',
    helpseeking: '🙋',
    envcontrol: '🛡️'
};

// ✅ 새 역량 추가 시: 여기에 한 줄만 등록하면 끝
const PRACTICE_MODULES = {
    meta: initMetaPractice,
    deep: initDeepPractice
    // grit: initGritPractice,
};

export function CompetencyPracticeView(traitId) {
    const trait = TRAITS.find(t => t.id === traitId);
    const emoji = trait ? (TRAIT_EMOJI[trait.id] || '⭐') : '⭐';
    const catClass = trait ? CATEGORY_CLASS[trait.category] : '';

    const kpiListHtml = trait && trait.kpi ? `
    <p class="practice-kpi-label">특성과 관련된 행동</p>
    <ul class="practice-kpi-list">
            ${trait.kpi.map(kpi => `<li class="practice-kpi-item">${kpi}</li>`).join('')}
        </ul>
    ` : '';

    return `
        <div class="dashboard-container">
            <button type="button" id="practice-back-btn" class="homework-back-btn">← 역량 페이지로 돌아가기</button>
            <div class="practice-hero ${catClass}">
                <span class="practice-hero-emoji">${emoji}</span>
                <div class="practice-hero-text">
                    <span class="practice-hero-badge">지금 연습 중인 역량</span>
                    <h2 class="practice-title">${trait ? trait.name : ''}</h2>
                    <p class="practice-def">${trait ? trait.def : ''}</p>
                    ${kpiListHtml}
                </div>
            </div>
            <div id="practice-content"></div>
        </div>
    `;
}

export function initCompetencyPracticePage(traitId, onBack) {
    document.getElementById('practice-back-btn').addEventListener('click', onBack);

    const contentEl = document.getElementById('practice-content');
    const initModule = PRACTICE_MODULES[traitId];

    if (initModule) {
        initModule(contentEl);
    } else {
        renderComingSoon(contentEl);
    }
}

function renderComingSoon(el) {
    el.innerHTML = `<p class="practice-soon">이 역량의 연습 콘텐츠는 준비 중이에요. 조금만 기다려주세요! 🌱</p>`;
}