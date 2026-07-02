import { fetchAiTips } from './aiTips.js';

const STORAGE_KEY = 'yerin_competency_history';

// 이미지 속 KPI 표를 그대로 데이터로 옮긴 것.
// kpi 3개는 곧 설문 문항 3개로 사용됩니다.
const TRAITS = [
    { id: 'meta', category: '인지적', name: '메타인지', def: '자신의 학습 과정을 점검하고 조절하는 고차원적 사고', kpi: [
        '학습 후 오답 원인을 분류한다', '왜 틀렸는지 그 이유를 기록한다', '틀린 문제를 다시 풀어보고 확인한다'
    ]},
    { id: 'deep', category: '인지적', name: '심층 학습 전략', def: '단순 암기를 넘어 개념 간 연결을 시도하는 사고', kpi: [
        '교과 내용을 자신만의 언어로 요약한다', '마인드맵 등으로 개념 간 연결을 시도한다', '배운 내용을 친구에게 설명해 본다'
    ]},
    { id: 'selfdirected', category: '인지적', name: '자기주도성', def: '스스로 학습 목표를 수립하고 이행하는 자율적 성향', kpi: [
        '주간 학습 계획표를 작성한다', '계획 대비 달성률을 매주 점검한다', '부족한 학습량을 스스로 보완한다'
    ]},
    { id: 'grit', category: '정서적', name: '그릿(Grit)', def: '장기적 목표를 향한 열정과 끈기', kpi: [
        '장기 학습 목표를 명확히 세운다', '공부가 힘들 때도 계획을 유지한다', '중도 포기 없이 과제를 끝까지 완수한다'
    ]},
    { id: 'selfefficacy', category: '정서적', name: '자기효능감', def: '과제를 성공적으로 수행할 수 있다는 믿음', kpi: [
        '어려운 과제를 해결 가능한 수준으로 나눈다', '자신의 과거 성공 경험을 상기한다', '과제 수행 전 성공 가능성을 높게 평가한다'
    ]},
    { id: 'resilience', category: '정서적', name: '학습탄력성', def: '실패 상황을 정서적으로 회복하고 개선하는 능력', kpi: [
        '성적 하락 시 감정 상태를 관리한다', '실패 원인을 객관적으로 분석한다', '다음 계획에 수정된 전략을 적용한다'
    ]},
    { id: 'interest', category: '정서적', name: '학습 흥미', def: '학습 내용 자체에서 가치와 즐거움을 느끼는 태도', kpi: [
        '교과 관련 심화 자료를 스스로 찾아본다', '수업 중 궁금한 점을 질문으로 메모한다', '학습 내용을 실생활에 적용해보려 한다'
    ]},
    { id: 'internalization', category: '정서적', name: '목표 내재화', def: '외부의 기대나 보상을 자신의 내적 목표로 일치시킴', kpi: [
        '외부의 기대를 진로와 연결해 해석한다', '학업의 목적을 스스로 정의한다', '외부의 압박 상황에서도 의지를 유지한다'
    ]},
    { id: 'timemanagement', category: '행동적', name: '시간 관리', def: '우선순위에 따라 시간을 전략적으로 배분하는 역량', kpi: [
        '중요도에 따라 과제 우선순위를 정한다', '시간 블록화(Time-blocking)를 실천한다', '학습 시간 준수 여부를 기록한다'
    ]},
    { id: 'helpseeking', category: '행동적', name: '도움 구하기', def: '적절한 자원(교사, 자료 등)을 적극적으로 활용하는 능력', kpi: [
        '스스로 고민 후 질문할 내용을 정리한다', '적절한 조언자를 찾아 적극 질문한다', '받은 피드백을 학습 과정에 즉시 반영한다'
    ]},
    { id: 'envcontrol', category: '행동적', name: '환경 통제', def: '집중을 방해하는 외부 환경을 물리적으로 제거함', kpi: [
        '스마트폰을 학습 중 물리적으로 분리한다', '최적의 학습 환경(책상 정돈 등)을 조성한다', '집중력을 깨뜨리는 요인을 사전 제거한다'
    ]}
];

const CATEGORY_ORDER = ['인지적', '정서적', '행동적'];
const CATEGORY_CLASS = { '인지적': 'cat-cognitive', '정서적': 'cat-emotional', '행동적': 'cat-behavioral' };

const LIKERT_LABELS = ['전혀 아니다', '아니다', '보통이다', '그렇다', '매우 그렇다'];

// 전체 33문항 (11개 특성 x 3문항)
const QUESTIONS = TRAITS.flatMap(trait =>
    trait.kpi.map((text, qIndex) => ({ traitId: trait.id, traitName: trait.name, qIndex, text }))
);

function loadHistory() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        return raw ? JSON.parse(raw) : [];
    } catch (e) {
        return [];
    }
}

function saveHistory(history) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
}

/* -------------------- 모듈 내부 상태 -------------------- */
let mode = 'overview'; // 'overview' | 'survey'
let currentQuestionIndex = 0;
let answers = {};

/* -------------------- 페이지 뼈대 -------------------- */

export function CompetencyPageView() {
    return `
        <div class="dashboard-container">
            <button type="button" id="competency-back-btn" class="homework-back-btn">← 대시보드로 돌아가기</button>
            <div id="competency-root"></div>
        </div>
    `;
}

export function initCompetencyPage(onBack) {
    mode = 'overview';
    currentQuestionIndex = 0;
    answers = {};
    renderRoot(onBack);
    document.getElementById('competency-back-btn').addEventListener('click', onBack);
}

function renderRoot(onBack) {
    if (mode === 'survey') {
        renderSurvey(onBack);
    } else {
        renderOverview(onBack);
    }
}

/* -------------------- 개요 화면 (비교 표 + 강점/약점 + AI 팁) -------------------- */

function renderOverview(onBack) {
    const root = document.getElementById('competency-root');
    if (!root) return;

    const history = loadHistory();
    const latest = history[history.length - 1] || null;

    root.innerHTML = `
        <div class="hero-box competency-hero">
            <h2>학습에 도움이 되는 학습 특성</h2>

            <img src="competency.png" alt="학습 역량 KPI 표" class="competency-ref-image">

            <h3 class="competency-section-title">특성별 설명</h3>
            ${renderTraitDescriptions()}

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
        mode = 'survey';
        currentQuestionIndex = 0;
        answers = {};
        renderRoot(onBack);
    });

    if (latest) {
        renderChart(latest);
        const ranked = getRanked(latest);
        loadAiTips(ranked.weakest, ranked.strongest);
    }
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

function renderTraitDescriptions() {
    const groups = CATEGORY_ORDER.map(category => {
        const catTraits = TRAITS.filter(t => t.category === category);
        const items = catTraits.map(t => `
            <li>
                <strong>${t.name}</strong>
                <span>${t.def}</span>
            </li>
        `).join('');

        return `
            <div class="competency-desc-group">
                <div class="competency-desc-header ${CATEGORY_CLASS[category]}">${category}</div>
                <ul class="competency-desc-list">${items}</ul>
            </div>
        `;
    }).join('');

    return `<div class="competency-desc-wrap">${groups}</div>`;
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

function getRanked(latest) {
    const list = TRAITS.map(trait => ({
        ...trait,
        score: latest.scores[trait.id] ?? 0
    }));
    const sorted = list.slice().sort((a, b) => b.score - a.score);
    return {
        strongest: sorted.slice(0, 3),
        weakest: sorted.slice(-3).reverse()
    };
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

/* -------------------- 설문(역량진단) 화면 -------------------- */

function renderSurvey(onBack) {
    const root = document.getElementById('competency-root');
    if (!root) return;

    const question = QUESTIONS[currentQuestionIndex];
    const progress = Math.round((currentQuestionIndex / QUESTIONS.length) * 100);

    root.innerHTML = `
        <div class="hero-box competency-hero competency-survey">
            <div class="competency-progress-bar">
                <div class="competency-progress-fill" style="width: ${progress}%;"></div>
            </div>
            <p class="competency-progress-label">${currentQuestionIndex + 1} / ${QUESTIONS.length}</p>

            <p class="competency-trait-tag">${question.traitName}</p>
            <h3 class="competency-question-text">${question.text}</h3>

            <div class="competency-likert">
                ${LIKERT_LABELS.map((label, i) => `
                    <button type="button" class="competency-likert-btn" data-value="${i + 1}">
                        ${label}
                    </button>
                `).join('')}
            </div>

            <div class="competency-survey-actions">
                ${currentQuestionIndex > 0 ? `<button type="button" id="survey-prev-btn" class="homework-cancel-btn">이전 문항</button>` : '<span></span>'}
                <button type="button" id="survey-cancel-btn" class="homework-cancel-btn">진단 취소</button>
            </div>
        </div>
    `;

    root.querySelectorAll('.competency-likert-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const value = Number(btn.dataset.value);
            const key = `${question.traitId}-${question.qIndex}`;
            answers[key] = value;

            if (currentQuestionIndex < QUESTIONS.length - 1) {
                currentQuestionIndex += 1;
                renderRoot(onBack);
            } else {
                finishSurvey(onBack);
            }
        });
    });

    const prevBtn = document.getElementById('survey-prev-btn');
    if (prevBtn) {
        prevBtn.addEventListener('click', () => {
            currentQuestionIndex -= 1;
            renderRoot(onBack);
        });
    }

    document.getElementById('survey-cancel-btn').addEventListener('click', () => {
        mode = 'overview';
        renderRoot(onBack);
    });
}

function finishSurvey(onBack) {
    const scores = {};
    TRAITS.forEach(trait => {
        const vals = trait.kpi.map((_, qIndex) => answers[`${trait.id}-${qIndex}`] || 0);
        const avg = vals.reduce((sum, v) => sum + v, 0) / vals.length;
        scores[trait.id] = Math.round(((avg - 1) / 4) * 100); // 1~5점 -> 0~100점 환산
    });

    const history = loadHistory();
    history.push({
        date: new Date().toISOString().slice(0, 10),
        scores
    });
    saveHistory(history);

    mode = 'overview';
    renderRoot(onBack);
}