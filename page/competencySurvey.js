import { TRAITS, QUESTIONS, LIKERT_LABELS, loadHistory, saveHistory } from './competencyData.js';

/* -------------------- 모듈 내부 상태 -------------------- */
let currentQuestionIndex = 0;
let answers = {};

/* -------------------- 페이지 뼈대 -------------------- */

export function CompetencySurveyView() {
    return `
        <div class="dashboard-container">
            <div id="competency-survey-root"></div>
        </div>
    `;
}

// onFinish: 설문 완료 후 이동할 콜백(보통 메인 페이지로), onCancel: 취소 시 이동할 콜백
export function initCompetencySurveyPage(onFinish, onCancel) {
    currentQuestionIndex = 0;
    answers = {};
    renderSurvey(onFinish, onCancel);
}

/* -------------------- 설문(역량진단) 화면 -------------------- */

function renderSurvey(onFinish, onCancel) {
    const root = document.getElementById('competency-survey-root');
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
                renderSurvey(onFinish, onCancel);
            } else {
                finishSurvey(onFinish);
            }
        });
    });

    const prevBtn = document.getElementById('survey-prev-btn');
    if (prevBtn) {
        prevBtn.addEventListener('click', () => {
            currentQuestionIndex -= 1;
            renderSurvey(onFinish, onCancel);
        });
    }

    document.getElementById('survey-cancel-btn').addEventListener('click', () => {
        onCancel();
    });
}

function finishSurvey(onFinish) {
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

    onFinish();
}