import {
    TRAITS,
    CATEGORY_ORDER,    
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

        <h3 class="competency-help-title">✨ 학습 도움 역량 보기</h3>
        <p class="competency-why-text">
    공부를 잘하는 친구들에게는 공통적으로 나타나는 학습 습관과 태도가 있어요.
    아래 11가지 역량을 하나씩 길러가면, 막연히 오래 앉아있는 공부가 아니라
    <strong>스스로 점검하고 계획하며 끝까지 해내는 힘</strong>을 기를 수 있을 거예요.
</p>
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

    <div id="fairy-toast" class="fairy-toast">
        <p>🧚‍♀️ 성적이 늘지 않아 지친 당신!<br>학습 요정과 함께 도움이 되는 특성을 알아볼까요? ✨</p>
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
    showFairyToast();
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
    const groups = CATEGORY_ORDER.map(category => {
        const traitsInCat = TRAITS.filter(t => t.category === category);
        const cards = traitsInCat.map(t => `
            <div class="competency-def-card ${CATEGORY_CLASS[category]}">
                <div class="competency-def-card-head">
                    <span class="competency-def-emoji">${TRAIT_EMOJI[t.id] || '⭐'}</span>
                    <p class="competency-def-name">${t.name}</p>
                </div>
                <p class="competency-def-text">${t.def}</p>
            </div>
        `).join('');

        return `
            <div class="competency-def-category">
                <h4 class="competency-def-cat-title ${CATEGORY_CLASS[category]}">${category} 역량</h4>
                <div class="competency-def-grid">${cards}</div>
            </div>
        `;
    }).join('');

    return groups;
}
function showFairyToast() {
    const toast = document.getElementById('fairy-toast');
    if (!toast) return;

    // 뾰로롱 나타나기
    requestAnimationFrame(() => {
        toast.classList.add('show');
    });

    // 3.5초 후 사라지기
    setTimeout(() => {
        toast.classList.remove('show');
        toast.classList.add('hide');
    }, 3500);
}