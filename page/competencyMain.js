import { fetchAiTips } from './aiTips.js';
import {
    TRAITS,
    CATEGORY_ORDER,
    CATEGORY_CLASS,
    QUESTIONS,
    loadHistory,
    getRanked
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
// ✅ 이렇게 수정
export function initCompetencyMainPage(onBack, onStartSurvey, onOpenPractice) {
    renderOverview(onBack, onStartSurvey, onOpenPractice);
    document.getElementById('competency-back-btn').addEventListener('click', onBack);
}

function renderOverview(onBack, onStartSurvey, onOpenPractice) {
    const root = document.getElementById('competency-root');
    if (!root) return;

    const history = loadHistory();
    const latest = history[history.length - 1] || null;

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

            ${history.length === 0 ? '' : `
                <div class="competency-divider"></div>
                <h3 class="competency-section-title">비교 표</h3>
                ${renderComparisonTable(history)}

                <div class="competency-divider"></div>
                <h3 class="competency-section-title">한눈에 보는 그래프</h3>
                <div class="competency-chart-wrap">
                    <canvas id="competency-chart"></canvas>
                </div>

                <div class="competency-divider"></div>
                <h3 class="competency-section-title">강점 &amp; 보완 포인트</h3>
                ${renderStrengthWeakness(latest)}
                <div id="ai-tip-content" class="ai-tip-box">
                    <p class="ai-tip-loading">AI가 보완 tip을 생각하고 있어요...</p>
                </div>
            `}
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

    if (latest) {
        renderChart(latest);
        const ranked = getRanked(latest);
        loadAiTips(ranked.weakest, ranked.strongest);
    }
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

let chartInstance = null;

function renderChart(latest) {
    const canvas = document.getElementById('competency-chart');
    if (!canvas || typeof Chart === 'undefined') return;

    if (chartInstance) {
        chartInstance.destroy();
    }

    chartInstance = new Chart(canvas, {
        type: 'radar',
        data: {
            labels: TRAITS.map(t => t.name),
            datasets: [
                {
                    label: '학습 우수자',
                    data: TRAITS.map(() => 100),
                    backgroundColor: 'rgba(200, 200, 200, 0.2)',
                    borderColor: 'rgba(150, 150, 150, 0.8)',
                    borderWidth: 1,
                    pointRadius: 0
                },
                {
                    label: '예린이',
                    data: TRAITS.map(t => latest.scores[t.id] ?? 0),
                    backgroundColor: 'rgba(255, 107, 154, 0.25)',
                    borderColor: '#ff6b9a',
                    borderWidth: 2,
                    pointBackgroundColor: '#ff6b9a'
                }
            ]
        },
        options: {
            responsive: true,
            scales: {
                r: {
                    min: 0,
                    max: 100,
                    ticks: { stepSize: 20 },
                    pointLabels: { font: { size: 11 } }
                }
            },
            plugins: {
                legend: { position: 'bottom' }
            }
        }
    });
}

function renderTraitDefTable() {
    const rows = [];
    for (let i = 0; i < TRAITS.length; i += 2) {
        const left = TRAITS[i];
        const right = TRAITS[i + 1];
        rows.push(`
            <tr>
                <td class="competency-def-name">${left.name}</td>
                <td class="competency-def-text">${left.def}</td>
                <td class="competency-def-name">${right ? right.name : ''}</td>
                <td class="competency-def-text">${right ? right.def : ''}</td>
            </tr>
        `);
    }

    return `
        <div class="competency-def-table-wrap">
            <table class="competency-def-table">
                <tbody>
                    ${rows.join('')}
                </tbody>
            </table>
        </div>
    `;
}

function renderComparisonTable(history) {
    // 표가 너무 넓어지지 않도록 최근 5회까지만 표시
    const shown = history.slice(-5);

    const headerCols = shown.map(entry => `<th>${entry.date}</th>`).join('');

    const rows = CATEGORY_ORDER.map(category => {
        const catTraits = TRAITS.filter(t => t.category === category);
        const catHeaderRow = `
            <tr class="competency-cat-row ${CATEGORY_CLASS[category]}">
                <td colspan="${2 + shown.length}">${category}</td>
            </tr>
        `;
        const traitRows = catTraits.map(trait => {
            const cells = shown.map(entry => {
                const score = entry.scores[trait.id];
                return `<td>${score === undefined ? '-' : score}</td>`;
            }).join('');
            return `
                <tr>
                    <td class="competency-trait-name">${trait.name}</td>
                    <td class="competency-benchmark">100</td>
                    ${cells}
                </tr>
            `;
        }).join('');
        return catHeaderRow + traitRows;
    }).join('');

    return `
        <div class="competency-table-wrap">
            <table class="competency-table">
                <thead>
                    <tr>
                        <th>특성</th>
                        <th>학습 우수자</th>
                        ${headerCols}
                    </tr>
                </thead>
                <tbody>
                    ${rows}
                </tbody>
            </table>
        </div>
    `;
}

function renderStrengthWeakness(latest) {
    const { strongest, weakest } = getRanked(latest);

    const strongHtml = strongest.map(t => `
        <li><strong>${t.name}</strong> <span class="competency-score-badge strong">${t.score}점</span></li>
    `).join('');

    const weakHtml = weakest.map(t => `
        <li><strong>${t.name}</strong> <span class="competency-score-badge weak">${t.score}점</span></li>
    `).join('');

    return `
        <div class="competency-sw-grid">
            <div>
                <h3 class="competency-sw-title strong">💪 가장 강한 특성 3</h3>
                <ul class="competency-sw-list">${strongHtml}</ul>
            </div>
            <div>
                <h3 class="competency-sw-title weak">🌱 보완이 필요한 특성 3</h3>
                <ul class="competency-sw-list">${weakHtml}</ul>
            </div>
        </div>
    `;
}

async function loadAiTips(weakest, strongest) {
    const container = document.getElementById('ai-tip-content');
    if (!container) return;

    try {
        const tips = await fetchAiTips({
            weakTraits: weakest.map(t => ({ name: t.name, score: t.score, def: t.def })),
            strongTraits: strongest.map(t => ({ name: t.name, score: t.score, def: t.def }))
        });

        container.innerHTML = `
            <ul class="ai-tip-list">
                ${tips.map(tip => `<li>${tip}</li>`).join('')}
            </ul>
        `;
    } catch (err) {
        container.innerHTML = `
            <p class="ai-tip-error">
                AI 서버가 아직 연결되지 않았어요.<br>
                Vercel에 <code>/api/ai-tips</code>를 배포하시면 자동으로 여기에 AI 보완 tip이 표시됩니다.
            </p>
            <button type="button" id="ai-tip-retry-btn" class="homework-cancel-btn">다시 시도</button>
        `;
        const retryBtn = document.getElementById('ai-tip-retry-btn');
        if (retryBtn) {
            retryBtn.addEventListener('click', () => loadAiTips(weakest, strongest));
        }
    }
}