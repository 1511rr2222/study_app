// competencyResult.js
import { TRAITS, CATEGORY_ORDER, CATEGORY_CLASS, loadHistory, getRanked } from './competencyData.js';
import { fetchAiTips } from './aiTips.js';

export function CompetencyResultView() {
    return `
        <div class="dashboard-container">
            <button type="button" id="result-back-btn" class="homework-back-btn">← 역량 페이지로 돌아가기</button>
            <div id="competency-result-root"></div>
        </div>
    `;
}

export function initCompetencyResultPage(onBack) {
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
            ${renderStrengthWeakness(latest)}
            <div id="ai-tip-content" class="ai-tip-box">
                <p class="ai-tip-loading">AI가 보완 tip을 생각하고 있어요...</p>
            </div>
        </div>
    `;

    renderChart(latest);
    const ranked = getRanked(latest);
    loadAiTips(ranked.weakest, ranked.strongest);
}

// renderComparisonTable, renderStrengthWeakness, renderChart, loadAiTips
// 함수 본문은 competencyMain.js에서 그대로 잘라서 여기 붙여넣기