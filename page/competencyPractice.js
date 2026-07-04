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

// ✅ Q2 선택형 실수유형 5가지 (고정)
const MISTAKE_TYPES = ['개념 오해', '계산 실수', '문제 오독', '시간 부족', '기타'];

// ✅ 재풀이 진행 턴 상한 (AI가 이 턴 수 근처에서 마무리하도록 유도)
const MAX_RETRY_TURNS = 5;

const state = {
    stage: 'UPLOAD',       // 'UPLOAD' | 'ANALYSIS' | 'RETRY'
    imageBase64: null,
    imagePreview: null,

    // ✅ 고정 질문 3개에 대한 답변
    fixedAnswers: {
        subjectUnit: '',
        mistakeType: '',
        priorKnowledge: ''
    },

    // ✅ AI와의 단계별 재풀이 대화 기록
    retryHistory: [],      // [{ role: 'ai' | 'student', text: string }]
    retryTurn: 0,          // 현재까지 진행된 AI 스텝 수
    retryDone: false,      // 최종 정리(마지막 턴) 도달 여부
    retryLoading: false,
    retryError: null
};

function resetState() {
    state.stage = 'UPLOAD';
    state.imageBase64 = null;
    state.imagePreview = null;
    state.fixedAnswers = { subjectUnit: '', mistakeType: '', priorKnowledge: '' };
    state.retryHistory = [];
    state.retryTurn = 0;
    state.retryDone = false;
    state.retryLoading = false;
    state.retryError = null;
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
        el.innerHTML = `
        <div class="practice-upload-box">
            <p class="practice-upload-emoji">📷</p>
            <h3>틀린 문제를 사진 찍어주세요</h3>
            <p class="practice-upload-desc">아래 버튼을 눌러 사진을 선택하면 스스로 문제를 되짚어보는 연습이 시작돼요.</p>
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
    reader.onloadend = () => {
        state.imagePreview = reader.result;
        state.imageBase64 = reader.result.split(',')[1]; // "data:image/...;base64," 이후 부분만
        state.stage = 'ANALYSIS';
        renderMetaPractice();
    };
    reader.readAsDataURL(file);
}

/* ---------- ANALYSIS: 고정 질문 3개 ---------- */

function renderAnalysisStage(el) {
    const { subjectUnit, mistakeType, priorKnowledge } = state.fixedAnswers;
    const canSubmit = subjectUnit.trim() && mistakeType && priorKnowledge.trim();

    el.innerHTML = `
    <div class="practice-analysis">
        <div class="practice-analysis-header">
            ${state.imagePreview ? `<img src="${state.imagePreview}" class="practice-image-preview" alt="문제 사진">` : ''}
            <div>
                <span class="practice-note-badge">✏️ 생각 정리 노트</span>
                <h3>편하게 문제에 대한 생각을 적어볼까요?</h3>
                <p>틀린 답은 없습니다! 떠오르는 대로 편하게 적어보세요.</p>
            </div>
        </div>

        <div class="practice-question-box">
            <p class="practice-question-text">Q1. 어떤 과목의, 무슨 단원 개념 문제인가요?</p>
            <textarea id="practice-q-subject" class="practice-answer-input" rows="2"
                placeholder="예: 수학 - 이차함수의 최댓값과 최솟값">${subjectUnit}</textarea>
        </div>

        <div class="practice-question-box">
            <p class="practice-question-text">Q2. 틀린 이유는 무엇인가요?</p>
            <div class="practice-mistake-options">
                ${MISTAKE_TYPES.map(type => `
                    <button type="button" class="practice-mistake-chip ${mistakeType === type ? 'selected' : ''}" data-type="${type}">
                        ${type}
                    </button>
                `).join('')}
            </div>
        </div>

        <div class="practice-question-box">
            <p class="practice-question-text">Q3. 이 문제를 풀려면 어떤 지식이 있어야 하나요?</p>
            <textarea id="practice-q-knowledge" class="practice-answer-input" rows="2"
                placeholder="예: 완전제곱식으로 바꾸는 방법을 알아야 해요">${priorKnowledge}</textarea>
        </div>

        <button type="button" id="practice-retry-btn" class="pink-button practice-submit-btn" ${canSubmit ? '' : 'disabled'}>
            이 내용을 바탕으로 AI와 함께 다시 풀어보기
        </button>
    </div>
    `;

    document.getElementById('practice-q-subject').addEventListener('input', (e) => {
        state.fixedAnswers.subjectUnit = e.target.value;
        updateSubmitButtonState();
    });

    document.getElementById('practice-q-knowledge').addEventListener('input', (e) => {
        state.fixedAnswers.priorKnowledge = e.target.value;
        updateSubmitButtonState();
    });

    el.querySelectorAll('.practice-mistake-chip').forEach(chip => {
        chip.addEventListener('click', () => {
            state.fixedAnswers.mistakeType = chip.dataset.type;
            el.querySelectorAll('.practice-mistake-chip').forEach(c => c.classList.remove('selected'));
            chip.classList.add('selected');
            updateSubmitButtonState();
        });
    });

    const retryBtn = document.getElementById('practice-retry-btn');
    retryBtn.addEventListener('click', () => {
        if (retryBtn.disabled) return;
        startRetryChat();
    });
}

function updateSubmitButtonState() {
    const { subjectUnit, mistakeType, priorKnowledge } = state.fixedAnswers;
    const canSubmit = subjectUnit.trim() && mistakeType && priorKnowledge.trim();
    const btn = document.getElementById('practice-retry-btn');
    if (btn) btn.disabled = !canSubmit;
}

/* ---------- RETRY: AI와 4~5턴 단계별 재풀이 ---------- */

function startRetryChat() {
    state.stage = 'RETRY';
    state.retryHistory = [];
    state.retryTurn = 0;
    state.retryDone = false;
    state.retryError = null;
    state.retryLoading = true;
    renderMetaPractice();

    fetchNextRetryStep(null);
}

async function fetchNextRetryStep(studentInput) {
    try {
        const res = await fetch('/api/competency-coach', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                traitId: 'meta',
                mode: 'retry',
                image: state.imageBase64,
                context: state.fixedAnswers,
                history: state.retryHistory,
                studentInput
            })
        });

        if (!res.ok) throw new Error('API error');
        const data = await res.json();

        if (studentInput !== null) {
            state.retryHistory.push({ role: 'student', text: studentInput });
        }
        state.retryHistory.push({ role: 'ai', text: data.stepMessage });
        state.retryTurn += 1;
        state.retryDone = Boolean(data.isFinal) || state.retryTurn >= MAX_RETRY_TURNS;
        state.retryError = null;
    } catch (err) {
        state.retryError = 'AI 코치와 연결하는 데 문제가 생겼어요. 다시 시도해주세요.';
    } finally {
        state.retryLoading = false;
        renderMetaPractice();
    }
}

function renderRetryStage(el) {
    const bubbles = state.retryHistory.map(item => `
        <div class="practice-chat-bubble ${item.role === 'ai' ? 'ai' : 'student'}">
            ${item.role === 'ai' ? '<span class="practice-chat-avatar">🧠</span>' : ''}
            <div class="practice-chat-text">${escapeHtml(item.text).replace(/\n/g, '<br>')}</div>
        </div>
    `).join('');

    el.innerHTML = `
        <div class="practice-retry">
            <div class="practice-retry-notice">
                <p><strong>💡 AI 코치와 함께 한 단계씩 다시 풀어봐요</strong></p>
                <p>정답을 바로 알려주지 않아요. 빈칸을 채우면서 스스로 풀이를 완성해보세요.</p>
            </div>

            <div class="practice-chat-log" id="practice-chat-log">
                ${bubbles}
                ${state.retryLoading ? `<div class="practice-chat-bubble ai loading"><span class="practice-chat-avatar">🧠</span><div class="practice-chat-text">생각 중이에요...</div></div>` : ''}
            </div>

            ${state.retryError ? `<p class="practice-retry-error">${state.retryError}</p>` : ''}

            ${!state.retryDone ? `
                <div class="practice-chat-input-row">
                    <textarea id="practice-chat-input" rows="2" placeholder="빈칸에 들어갈 내용이나 다음 단계를 적어보세요..."></textarea>
                    <button type="button" id="practice-chat-send-btn" class="pink-button" ${state.retryLoading ? 'disabled' : ''}>
                        다음 단계로
                    </button>
                </div>
            ` : `
                <div class="practice-retry-complete">
                    <p>🎉 오늘 메타인지 연습을 완료했어요! 스스로 되짚어본 풀이 과정, 정말 잘 해냈어요.</p>
                    <button type="button" id="practice-finish-btn" class="pink-button">연습 마치기</button>
                </div>
            `}
        </div>
    `;

    const log = document.getElementById('practice-chat-log');
    if (log) log.scrollTop = log.scrollHeight;

    const sendBtn = document.getElementById('practice-chat-send-btn');
    if (sendBtn) {
        sendBtn.addEventListener('click', () => {
            const input = document.getElementById('practice-chat-input');
            const text = input.value.trim();
            if (!text || state.retryLoading) return;

            state.retryLoading = true;
            state.retryError = null;
            renderMetaPractice();
            fetchNextRetryStep(text);
        });
    }

    const finishBtn = document.getElementById('practice-finish-btn');
    if (finishBtn) {
        finishBtn.addEventListener('click', () => {
            alert('수고했어요! 오늘 메타인지 연습을 완료했어요 🎉');
        });
    }
}

function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}