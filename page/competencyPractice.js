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

const state = {
    stage: 'UPLOAD',       // 'UPLOAD' | 'ANALYSIS' | 'RETRY'
    imageBase64: null,
    imagePreview: null,
    aiQuestions: [],
    studentAnswers: {}
};

function resetState() {
    state.stage = 'UPLOAD';
    state.imageBase64 = null;
    state.imagePreview = null;
    state.aiQuestions = [];
    state.studentAnswers = {};
}

export function CompetencyPracticeView(traitId) {
    const trait = TRAITS.find(t => t.id === traitId);
    const emoji = trait ? (TRAIT_EMOJI[trait.id] || '⭐') : '⭐';
    const catClass = trait ? CATEGORY_CLASS[trait.category] : '';

    return `
        <div class="dashboard-container">
            <button type="button" id="practice-back-btn" class="homework-back-btn">← 역량 페이지로 돌아가기</button>
            <div class="practice-hero ${catClass}">
                <span class="practice-hero-emoji">${emoji}</span>
                <div class="practice-hero-text">
                    <span class="practice-hero-badge">지금 연습 중인 역량</span>
                    <h2 class="practice-title">${trait ? trait.name : ''}</h2>
                    <p class="practice-def">${trait ? trait.def : ''}</p>
                </div>
            </div>
            <div id="practice-content"></div>
        </div>
    `;
}
export function initCompetencyPracticePage(traitId, onBack) {
    resetState();
    document.getElementById('practice-back-btn').addEventListener('click', onBack);

    if (traitId === 'meta') {
        renderMetaPractice();
    } else {
        renderComingSoon();
    }
}

function renderComingSoon() {
    const el = document.getElementById('practice-content');
    el.innerHTML = `<p class="practice-soon">이 역량의 연습 콘텐츠는 준비 중이에요. 조금만 기다려주세요! 🌱</p>`;
}

/* ==================== 메타인지 전용 흐름 ==================== */

function renderMetaPractice() {
    const el = document.getElementById('practice-content');
    if (!el) return;

    if (state.stage === 'UPLOAD') {
        // ✅ 수정
    el.innerHTML = `
    <div class="practice-upload-box">
        <p class="practice-upload-emoji">📷</p>
        <h3>틀린 문제를 사진 찍어주세요</h3>
        <p class="practice-upload-desc">아래 버튼을 눌러 사진을 선택하면 AI 코치가 질문을 만들어 드려요.</p>
        <label for="practice-image-input" class="practice-upload-label">
            <span class="practice-upload-icon">📷</span>
            사진 선택하고 시작하기
        </label>
        <input type="file" accept="image/*" id="practice-image-input" class="practice-file-input">
    </div>
    `;
        document.getElementById('practice-image-input').addEventListener('change', handleImageUpload);
    } else if (state.stage === 'ANALYSIS') {
        renderAnalysisStage(el);
    } else if (state.stage === 'RETRY') {
        renderRetryStage(el);
    }
}

function handleImageUpload(e) {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = async () => {
        state.imagePreview = reader.result;
        state.imageBase64 = reader.result.split(',')[1]; // "data:image/...;base64," 이후 부분만

        state.stage = 'ANALYSIS';
        state.aiQuestions = [];
        renderMetaPractice(); // 로딩 화면 먼저 표시

        try {
            state.aiQuestions = await fetchAiQuestions(state.imageBase64);
        } catch (err) {
            state.aiQuestions = ['AI 서버 연결에 실패했어요. 다시 시도해주세요.'];
        }
        renderMetaPractice(); // 질문 화면으로 다시 렌더
    };
    reader.readAsDataURL(file);
}

async function fetchAiQuestions(imageBase64) {
    const res = await fetch('/api/competency-coach', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ traitId: 'meta', image: imageBase64 })
    });
    if (!res.ok) throw new Error('API error');
    const data = await res.json();
    return data.questions;
}

function renderAnalysisStage(el) {
    if (state.aiQuestions.length === 0) {
        el.innerHTML = `<div class="practice-loading"><p>AI 코치가 문제를 분석하고 질문을 만들고 있어요...</p></div>`;
        return;
    }

    el.innerHTML = `
        <div class="practice-analysis">
            <div class="practice-analysis-header">
                ${state.imagePreview ? `<img src="${state.imagePreview}" class="practice-image-preview" alt="문제 사진">` : ''}
                <div>
                    <h3>AI 코치의 생각 노트</h3>
                    <p>정답을 적는 곳이 아니에요. 스스로에게 질문을 던져보세요.</p>
                </div>
            </div>
            ${state.aiQuestions.map((q, i) => `
                <div class="practice-question-box">
                    <p class="practice-question-text">Q${i + 1}. ${q}</p>
                    <textarea class="practice-answer-input" data-index="${i}" rows="3"
                        placeholder="나의 생각이나 풀이 과정을 적어보세요...">${state.studentAnswers[i] || ''}</textarea>
                </div>
            `).join('')}
            <button type="button" id="practice-retry-btn" class="pink-button practice-submit-btn">
                고민한 내용을 바탕으로 다시 풀어보기
            </button>
        </div>
    `;

    el.querySelectorAll('.practice-answer-input').forEach(textarea => {
        textarea.addEventListener('input', (e) => {
            state.studentAnswers[e.target.dataset.index] = e.target.value;
        });
    });

    document.getElementById('practice-retry-btn').addEventListener('click', () => {
        state.stage = 'RETRY';
        renderMetaPractice();
    });
}

function renderRetryStage(el) {
    el.innerHTML = `
        <div class="practice-retry">
            <div class="practice-retry-notice">
                <p><strong>💡 잠깐, 최종 제출 전에 다시 확인하세요!</strong></p>
                <p>방금 위에서 고민했던 내용을 바탕으로 아래에 정답을 다시 적어보세요.</p>
            </div>
            <div class="practice-final-answer-box">
                <h4>최종 풀이 및 답안 작성 공간</h4>
                <textarea id="practice-final-answer" rows="6" placeholder="여기에 최종 답안을 작성하세요..."></textarea>
            </div>
            <div class="practice-retry-actions">
                <button type="button" id="practice-review-btn" class="homework-cancel-btn">질문 다시 보기</button>
                <button type="button" id="practice-submit-final-btn" class="pink-button">최종 정답 확인하기</button>
            </div>
        </div>
    `;

    document.getElementById('practice-review-btn').addEventListener('click', () => {
        state.stage = 'ANALYSIS';
        renderMetaPractice();
    });

    document.getElementById('practice-submit-final-btn').addEventListener('click', () => {
        // TODO: 다음 단계에서 채점/기록 저장 로직 추가
        alert('수고했어요! 오늘 메타인지 연습을 완료했어요 🎉');
    });
}