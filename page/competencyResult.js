// competencyResult.js
import { TRAITS, CATEGORY_ORDER, CATEGORY_CLASS, loadHistory, getRanked } from './competencyData.js';
import { fetchAiTips } from './aiTips.js';

let chartInstance = null; // 페이지 재진입 시 이전 차트 인스턴스를 없애기 위해 보관

export function CompetencyResultView() {
    return `
        <div class="dashboard-container">
            <button type="button" id="result-back-btn" class="homework-back-btn">← 역량 페이지로 돌아가기</button>
            <div id="competency-result-root"></div>
        </div>
    `;
}

export function initCompetencyResultPage(onBack, onOpenTrait) {
    document.getElementById('result-back-btn').addEventListener('click', onBack);

    const history = loadHistory();
    const latest = history[history.length - 1] || null;
    const root = document.getElementById('competency-result-root');
    if (!root || !latest) return;

    root.innerHTML = `
        <div class="hero-box competency-hero">
            <h3 class="competency-section-title">비교 표</h3>
            ${renderComparisonTable(history)}

            <div class="competency-divider"></div>
            <h3 class="competency-section-title">한눈에 보는 그래프</h3>
            <div class="competency-chart-wrap"><canvas id="competency-chart"></canvas></div>

            <div class="competency-divider"></div>
            <h3 class="competency-section-title">강점 &amp; 보완 포인트</h3>
             <p class="competency-section-hint">아래에 각각의 역량을 클릭해 어떤 행동 특성을 기르면 되는지 확인해보세요!</p>
            ${renderStrengthWeakness(latest)}
            <div id="ai-tip-content" class="ai-tip-box">
                <p class="ai-tip-loading">AI가 보완 tip을 생각하고 있어요...</p>
            </div>
        </div>
    `;
    root.querySelectorAll('.sw-card').forEach(card => {
        card.addEventListener('click', () => onOpenTrait(card.dataset.traitId));
    });

    renderChart(latest);
    const ranked = getRanked(latest);
    loadAiTips(ranked.weakest, ranked.strongest);
}
/* -------------------- 비교 표 -------------------- */

function renderComparisonTable(history) {
    const latest = history[history.length - 1];
    const prev = history.length > 1 ? history[history.length - 2] : null;

    const rows = CATEGORY_ORDER.map(category => {
        const traitsInCategory = TRAITS.filter(t => t.category === category);
        const traitRows = traitsInCategory.map(trait => {
            const curScore = latest.scores[trait.id] ?? 0;
            const prevScore = prev ? (prev.scores[trait.id] ?? 0) : null;
            const diff = prevScore !== null ? curScore - prevScore : null;

            let diffLabel = '-';
            let diffClass = '';
            if (diff !== null) {
                if (diff > 0) { diffLabel = `▲ ${diff}`; diffClass = 'diff-up'; }
                else if (diff < 0) { diffLabel = `▼ ${Math.abs(diff)}`; diffClass = 'diff-down'; }
                else { diffLabel = '- 0'; diffClass = 'diff-flat'; }
            }

            return `
                <tr>
                    <td class="table-trait-name">${trait.name}</td>
                    <td class="table-score">${curScore}점</td>
                    <td class="table-diff ${diffClass}">${diffLabel}</td>
                </tr>
            `;
        }).join('');

        return `
            <tbody>
                <tr class="table-category-row ${CATEGORY_CLASS[category]}">
                    <td colspan="3">${category}</td>
                </tr>
                ${traitRows}
            </tbody>
        `;
    }).join('');

    return `
        <table class="competency-compare-table">
            <thead>
                <tr>
                    <th>역량</th>
                    <th>이번 점수</th>
                    <th>${prev ? '직전 대비' : '변화'}</th>
                </tr>
            </thead>
            ${rows}
        </table>
    `;
}

/* -------------------- 강점 / 보완 포인트 -------------------- */

function renderStrengthWeakness(latest) {
    const { strongest, weakest } = getRanked(latest);

    const renderCards = (list) => list.map(trait => `
        <div class="sw-card" data-trait-id="${trait.id}">
            <span class="sw-card-name">${trait.name}</span>
            <span class="sw-card-score">${trait.score}점</span>
        </div>
    `).join('');

    return `
        <div class="competency-sw-wrap">
            <div class="sw-column">
                <div class="sw-title-container strong-title">
                <p class="sw-column-title">💪 가장 강한 특성 3</p>
                </div>
                <div class="sw-card-list">${renderCards(strongest)}</div>
            </div>

        <div class="sw-column">
            <div class="sw-title-container weak-title">
                <p class="sw-column-title">🌱 보완이 필요한 특성 3</p>
            </div>
            <div class="sw-card-list">${renderCards(weakest)}</div>
            </div>
        </div>
    `;
}

/* -------------------- 그래프 (Chart.js) -------------------- */

function renderChart(latest) {
    const canvas = document.getElementById('competency-chart');
    if (!canvas) return;

    if (chartInstance) {
        chartInstance.destroy();
        chartInstance = null;
    }

    const labels = TRAITS.map(t => t.name);
    const data = TRAITS.map(t => latest.scores[t.id] ?? 0);

    chartInstance = new Chart(canvas.getContext('2d'), {
        type: 'radar',
        data: {
            labels,
            datasets: [{
                label: '역량 점수',
                data,
                backgroundColor: 'rgba(255, 107, 154, 0.2)',
                borderColor: '#FF6B9A',
                borderWidth: 2,
                pointBackgroundColor: '#FF6B9A'
            }]
        },
        options: {
            responsive: true,
            scales: {
                r: {
                    min: 0,
                    max: 100,
                    ticks: { stepSize: 20 }
                }
            },
            plugins: {
                legend: { display: false }
            }
        }
    });
}

/* -------------------- AI 보완 tip -------------------- */

async function loadAiTips(weakest, strongest) {
    const container = document.getElementById('ai-tip-content');
    if (!container) return;

    try {
        const weakTraits = weakest.map(t => ({ name: t.name, score: t.score, def: t.def }));
        const strongTraits = strongest.map(t => ({ name: t.name, score: t.score, def: t.def }));

        const tips = await fetchAiTips({ weakTraits, strongTraits }); // fetchAiTips는 객체 1개를 받음

        container.innerHTML = `
            <ul class="ai-tip-list">
                ${tips.map(tip => `<li>${tip}</li>`).join('')}
            </ul>
        `;
    } catch (err) {
        console.error('AI tip 로드 실패:', err);
        container.innerHTML = `<p class="ai-tip-error">AI tip을 불러오는 중 문제가 발생했어요. 잠시 후 다시 시도해주세요.</p>`;
    }
}