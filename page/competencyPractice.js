import { TRAITS, CATEGORY_CLASS } from './competencyData.js';

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
    const trait = TRAITS.find(t => t.id === traitId);
    renderExampleCards(contentEl, trait);
}
// ✅ 원형 실루엣 캐릭터 SVG (이미지 파일 없이 코드로 직접 그림)
const CHAR_SVG_BEFORE = `
<svg viewBox="0 0 60 60" width="52" height="52">
    <path d="M30 6 C46 6 54 16 54 30 C54 46 44 54 30 54 C14 54 6 44 6 30 C6 16 14 6 30 6 Z" fill="#fdfcf8" stroke="#a89f8a" stroke-width="2.2"/>
    <circle cx="22" cy="27" r="1.8" fill="#a89f8a"/>
    <circle cx="38" cy="27" r="1.8" fill="#a89f8a"/>
    <path d="M21 38 Q30 36 39 38" stroke="#a89f8a" stroke-width="2" fill="none" stroke-linecap="round"/>
</svg>`;

const CHAR_SVG_AFTER = `
<svg viewBox="0 0 60 60" width="52" height="52">
    <path d="M30 6 C46 6 54 16 54 30 C54 46 44 54 30 54 C14 54 6 44 6 30 C6 16 14 6 30 6 Z" fill="#fff9fb" stroke="#d6336c" stroke-width="2.4"/>
    <circle cx="22" cy="27" r="1.8" fill="#d6336c"/>
    <circle cx="38" cy="27" r="1.8" fill="#d6336c"/>
    <path d="M21 36 Q30 45 39 36" stroke="#d6336c" stroke-width="2.2" fill="none" stroke-linecap="round"/>
    <path d="M46 10 L48 15 L53 16 L48 18 L46 23 L44 18 L39 16 L44 15 Z" fill="#ffd469"/>
</svg>`;

// ✅ KPI별 '문제(선택)' + '일반 학생 ↔ 학업 우수자' 만화 패널을 나란히 렌더링
function renderExampleCards(el, trait) {
    if (!trait || !trait.examples || trait.examples.length === 0) {
        el.innerHTML = `<p class="practice-soon">아직 예시가 준비되지 않았어요. 조금만 기다려주세요! 🌱</p>`;
        return;
    }

    const problemHtml = trait.problemImage ? `
        <div class="comic-problem-box">
            <span class="comic-problem-label">문제</span>
            <img src="${trait.problemImage.src}" class="comic-problem-img" alt="${escapeHtml(trait.problemImage.caption || '문제')}">
            <p class="comic-problem-caption">${escapeHtml(trait.problemImage.caption || '')}</p>
        </div>
    ` : '';

    el.innerHTML = `
        <p class="flip-card-section-label">학습 노트로 살펴보는 학습 특성 예시</p>
        ${problemHtml}
        <div class="comic-row-list">
            ${trait.kpi.map((kpiText, i) => {
                const ex = trait.examples[i] || { before: '', after: '' };
                return `
                    <div class="comic-row" data-index="${i}">
                        <button type="button" class="comic-kpi-toggle" data-index="${i}">
                            <span class="comic-kpi-caret" aria-hidden="true">▾</span>
                            <span class="comic-kpi-text">${escapeHtml(kpiText)}</span>
                        </button>
                        <div class="comic-panels-wrap">
                            <div class="comic-panels">
                                <div class="comic-panel comic-panel-before">
                                    <div class="comic-bubble">
                                        <p>${escapeHtml(ex.before)}</p>
                                    </div>
                                    <div class="comic-character">${CHAR_SVG_BEFORE}</div>
                                    <span class="comic-panel-label comic-panel-label-before">일반 학생</span>
                                </div>
                                <div class="comic-panel comic-panel-after">
                                    <span class="comic-stamp">참<br>잘했어요</span>
                                    <div class="comic-bubble comic-bubble-after">
                                        <p>${escapeHtml(ex.after)}</p>
                                        ${ex.afterImage ? `
                                            <img src="${ex.afterImage.src}" class="comic-after-img" alt="${escapeHtml(ex.afterImage.caption || '')}">
                                            ${ex.afterImage.caption ? `<span class="comic-after-img-caption">${escapeHtml(ex.afterImage.caption)}</span>` : ''}
                                        ` : ''}
                                    </div>
                                    <div class="comic-character">${CHAR_SVG_AFTER}</div>
                                    <span class="comic-panel-label comic-panel-label-after">학업 우수자</span>
                                </div>
                            </div>
                                                            ${ex.tip ? `
                                <div class="comic-tip-box">
                                    <span class="comic-tip-label">💡 이렇게 해보세요</span>
                                    <p class="comic-tip-text">${escapeHtml(ex.tip)}</p>
                                </div>
                                ` : ''}
                        </div>
                    </div>
                `;
            }).join('')}
        </div>
        ${trait.comicImage ? `
            <div class="comic-summary-image">
                <img src="${trait.comicImage}" alt="${escapeHtml(trait.name)} 만화" class="comic-summary-img">
            </div>
        ` : ''}
    `;

    // ✅ KPI 블록 클릭 → 그 아래 비교 패널 펼침/접힘 (평소엔 접힌 상태로 시작)
    el.querySelectorAll('.comic-kpi-toggle').forEach(btn => {
        btn.addEventListener('click', () => {
            btn.closest('.comic-row').classList.toggle('comic-row-open');
        });
    });
}

function escapeHtml(str) {
    return String(str ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}