import {
    TRAITS,
    CATEGORY_CLASS,
    QUESTIONS,
    loadHistory
} from './competencyData.js';

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

/* -------------------- 페이지 뼈대 -------------------- */

export function CompetencyMainView() {
    return `
        <div class="dashboard-container">
            <button type="button" id="competency-back-btn" class="homework-back-btn">← 대시보드로 돌아가기</button>
            <div id="competency-root"></div>
        </div>
    `;
}

// onBack: 대시보드로 돌아가기, onStartSurvey: 진단 페이지로 이동
export function initCompetencyMainPage(onBack, onStartSurvey, onOpenPractice) {
    renderOverview(onBack, onStartSurvey, onOpenPractice);
    document.getElementById('competency-back-btn').addEventListener('click', onBack);
}

function renderOverview(onBack, onStartSurvey, onOpenPractice) {
    const root = document.getElementById('competency-root');
    if (!root) return;

    const history = loadHistory();

    root.innerHTML = `
        <div class="hero-box competency-hero">
            <img src="instruction.png" alt="학습 요정 안내" class="competency-instruction-image">

            <div class="competency-fairy-message">
                <p>🧚‍♀️ 성적이 늘지 않아 지친 당신!
                <br> 학업에 도움이 되는 특성을 기른다면 도움을 받을 수 있을 거예요
                <br> 학습 요정과 함께 학습에 도움이 되는 특성을 알아볼까요? ✨</p>
            </div>

            ${renderTraitGrid()}

            <div class="competency-divider"></div>

            <h3 class="competency-section-title">역량별 정의</h3>
            ${renderTraitDefTable()}

            <img src="competency.png" alt="학습 역량 KPI 표" class="competency-ref-image">

            <p class="competency-intro">
                학습에 도움이 되는 특성과 내가 가진 학습 특성을 비교해볼 수 있어요.
                <br> 아래 버튼을 눌러 진단을 진행해보세요 (총 ${QUESTIONS.length}문항, 특성당 3문항).
            </p>
            <button type="button" id="start-diagnosis-btn" class="pink-button competency-start-btn">
                ${history.length === 0 ? '역량 진단하기' : '새로 진단하기'}
            </button>
        </div>
    `;

    document.getElementById('start-diagnosis-btn').addEventListener('click', () => {
        onStartSurvey();
    });

    root.querySelector('.competency-trait-grid').addEventListener('click', (e) => {
        const block = e.target.closest('.competency-trait-block');
        if (!block) return;
        onOpenPractice(block.dataset.traitId);
    });
}

function renderTraitGrid() {
    const items = TRAITS.map(t => `
        <div class="competency-trait-block ${CATEGORY_CLASS[t.category]}" data-trait-id="${t.id}" role="button" tabindex="0">
            <span class="competency-trait-emoji">${TRAIT_EMOJI[t.id] || '⭐'}</span>
            <span class="competency-trait-block-name">${t.name}</span>
        </div>
    `).join('');

    return `<div class="competency-trait-grid">${items}</div>`;
}

function renderTraitDefTable() {
    const items = TRAITS.map(t => `
        <div class="competency-def-card">
            <p class="competency-def-name">${t.name}</p>
            <p class="competency-def-text">${t.def}</p>
        </div>
    `).join('');

    return `<div class="competency-def-grid">${items}</div>`;
}