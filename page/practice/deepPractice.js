import { escapeHtml } from './practiceUtils.js';
import { createPracticeRecord, updatePracticeRecord } from './practiceStorage.js';

const TRAIT_ID = 'deep';
const MAX_MINDMAP_BRANCHES = 6;

const state = {
    container: null,

    // 'UPLOAD' | 'SUMMARIZE' | 'COMPARE' | 'CHOOSE' | 'MINDMAP' | 'EXPLAIN' | 'DONE'
    stage: 'UPLOAD',

    source: 'image',        // 'image' | 'video'
    imageBase64: null,
    imagePreview: null,
    videoUrl: '',

    studentSummary: '',
    aiSummary: '',
    compareFeedback: '',

    mode: null,              // 'mindmap' | 'explain' (2단계에서 고른 연습 방식)

    mindmap: {
        topic: '',
        branches: [{ title: '', detail: '' }]
    },
    mindmapFeedback: '',

    isRecording: false,
    explainTranscript: '',
    explainFeedback: '',

    loading: false,
    error: null,

    recordId: null
};

let recognitionInstance = null;

function resetState(container) {
    state.container = container;
    state.stage = 'UPLOAD';
    state.source = 'image';
    state.imageBase64 = null;
    state.imagePreview = null;
    state.videoUrl = '';
    state.studentSummary = '';
    state.aiSummary = '';
    state.compareFeedback = '';
    state.mode = null;
    state.mindmap = { topic: '', branches: [{ title: '', detail: '' }] };
    state.mindmapFeedback = '';
    state.isRecording = false;
    state.explainTranscript = '';
    state.explainFeedback = '';
    state.loading = false;
    state.error = null;
    state.recordId = null;
    recognitionInstance = null;
}

/**
 * 라우터(competencyPractice.js)가 호출하는 진입점.
 * @param {HTMLElement} container
 */
export function initDeepPractice(container) {
    resetState(container);
    render();
}

function render() {
    const el = state.container;
    if (!el) return;

    if (state.stage === 'UPLOAD') renderUploadStage(el);
    else if (state.stage === 'SUMMARIZE') renderSummarizeStage(el);
    else if (state.stage === 'COMPARE') renderCompareStage(el);
    else if (state.stage === 'CHOOSE') renderChooseStage(el);
    else if (state.stage === 'MINDMAP') renderMindmapStage(el);
    else if (state.stage === 'EXPLAIN') renderExplainStage(el);
    else if (state.stage === 'DONE') renderDoneStage(el);
}

/* ==================== 공통: AI 코치 API 호출 ==================== */

async function callCoachApi(payload) {
    const res = await fetch('/api/competency-coach', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ traitId: TRAIT_ID, ...payload })
    });
    if (!res.ok) throw new Error('API error');
    return res.json();
}

/* ==================== UPLOAD: 사진 또는 동영상 URL ==================== */

function renderUploadStage(el) {
    const canProceed =
        (state.source === 'image' && state.imageBase64) ||
        (state.source === 'video' && state.videoUrl.trim().startsWith('http'));

    el.innerHTML = `
    <div class="practice-upload-box">
        <p class="practice-upload-emoji">🔗</p>
        <h3>공부한 내용을 가져와볼까요?</h3>
        <p class="practice-upload-desc">사진(필기, 교재)이나 강의 동영상 링크를 올리면 요약 연습이 시작돼요.</p>

        <div class="practice-source-tabs">
            <button type="button" class="practice-source-tab ${state.source === 'image' ? 'selected' : ''}" data-source="image">📷 사진</button>
            <button type="button" class="practice-source-tab ${state.source === 'video' ? 'selected' : ''}" data-source="video">🎬 동영상 URL</button>
        </div>

        ${state.source === 'image' ? `
            <label for="practice-image-input" class="practice-upload-label">
                <span class="practice-upload-icon">📷</span>
                ${state.imagePreview ? '다른 사진으로 바꾸기' : '사진 선택하기'}
            </label>
            <input type="file" accept="image/*" id="practice-image-input" class="practice-file-input">
            ${state.imagePreview ? `<img src="${state.imagePreview}" class="practice-image-preview" alt="선택한 사진" style="margin-top:14px;">` : ''}
        ` : `
            <div class="practice-video-url-box">
                <input type="text" id="practice-video-input" class="practice-video-url-input"
                    placeholder="예: https://youtube.com/watch?v=..." value="${escapeHtml(state.videoUrl)}">
            </div>
        `}

        <button type="button" id="practice-upload-next-btn" class="pink-button practice-submit-btn" ${canProceed ? '' : 'disabled'}>
            다음: 내 말로 요약하기
        </button>
    </div>
    `;

    el.querySelectorAll('.practice-source-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            state.source = tab.dataset.source;
            render();
        });
    });

    const imageInput = document.getElementById('practice-image-input');
    if (imageInput) imageInput.addEventListener('change', handleImageUpload);

    const videoInput = document.getElementById('practice-video-input');
    if (videoInput) {
        videoInput.addEventListener('input', (e) => {
            state.videoUrl = e.target.value;
            const btn = document.getElementById('practice-upload-next-btn');
            if (btn) btn.disabled = !state.videoUrl.trim().startsWith('http');
        });
    }

    const nextBtn = document.getElementById('practice-upload-next-btn');
    nextBtn.addEventListener('click', () => {
        if (nextBtn.disabled) return;
        state.stage = 'SUMMARIZE';
        render();
    });
}

function handleImageUpload(e) {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
        state.imagePreview = reader.result;
        state.imageBase64 = reader.result.split(',')[1];
        render();
    };
    reader.readAsDataURL(file);
}

/* ==================== SUMMARIZE: 내 말로 요약하기 ==================== */

function renderMaterialPreviewHtml() {
    if (state.source === 'image' && state.imagePreview) {
        return `<img src="${state.imagePreview}" class="practice-image-preview" alt="자료 사진">`;
    }
    if (state.source === 'video' && state.videoUrl) {
        return `<a href="${escapeHtml(state.videoUrl)}" target="_blank" rel="noopener" class="practice-material-preview-link">🎬 동영상 링크 열기</a>`;
    }
    return '';
}

function renderSummarizeStage(el) {
    el.innerHTML = `
    <div class="practice-analysis">
        <div class="practice-analysis-header">
            ${renderMaterialPreviewHtml()}
            <div>
                <span class="practice-note-badge">✏️ 내 말로 요약하기</span>
                <h3>이 내용을 나만의 언어로 요약해볼까요?</h3>
                <p>교재나 영상의 문장을 그대로 베끼지 말고, 이해한 대로 편하게 적어보세요.</p>
            </div>
        </div>

        <div class="practice-question-box">
            <p class="practice-question-text">📝 요약</p>
            <textarea id="practice-summary-input" class="practice-answer-input" rows="5"
                placeholder="예: 이차함수는 최고차항의 계수 부호에 따라 최댓값 또는 최솟값을 가지는데...">${escapeHtml(state.studentSummary)}</textarea>
        </div>

        ${state.error ? `<p class="practice-retry-error">${state.error}</p>` : ''}

        <button type="button" id="practice-summary-submit-btn" class="pink-button practice-submit-btn"
            ${state.studentSummary.trim() && !state.loading ? '' : 'disabled'}>
            ${state.loading ? 'AI가 비교하고 있어요...' : 'AI와 비교하기'}
        </button>
    </div>
    `;

    document.getElementById('practice-summary-input').addEventListener('input', (e) => {
        state.studentSummary = e.target.value;
        const btn = document.getElementById('practice-summary-submit-btn');
        if (btn) btn.disabled = !state.studentSummary.trim();
    });

    document.getElementById('practice-summary-submit-btn').addEventListener('click', requestSummaryCompare);
}

async function requestSummaryCompare() {
    state.loading = true;
    state.error = null;
    render();

    try {
        const data = await callCoachApi({
            mode: 'summarize',
            image: state.source === 'image' ? state.imageBase64 : null,
            videoUrl: state.source === 'video' ? state.videoUrl : null,
            studentSummary: state.studentSummary
        });

        state.aiSummary = data.aiSummary;
        state.compareFeedback = data.feedback;
        state.stage = 'COMPARE';

        if (!state.recordId) {
            state.recordId = await createPracticeRecord(TRAIT_ID, {
                source: state.source,
                videoUrl: state.videoUrl,
                studentSummary: state.studentSummary,
                aiSummary: state.aiSummary
            });
        }

        await updatePracticeRecord(state.recordId, {
            answers: {
                source: state.source,
                videoUrl: state.videoUrl,
                studentSummary: state.studentSummary,
                aiSummary: state.aiSummary
            },
            messages: [
                { role: 'ai', text: `[AI 요약]\n${state.aiSummary}` },
                { role: 'ai', text: `[비교 피드백]\n${state.compareFeedback}` }
            ],
            isDone: false
        });
    } catch (err) {
        state.error = 'AI와 비교하는 데 문제가 생겼어요. 다시 시도해주세요.';
    } finally {
        state.loading = false;
        render();
    }
}

/* ==================== COMPARE: 내 요약 vs AI 요약 ==================== */

function renderCompareStage(el) {
    el.innerHTML = `
    <div class="practice-compare">
        <div class="practice-retry-notice">
            <p><strong>💡 내 요약과 AI의 요약을 비교해봐요</strong></p>
            <p>${escapeHtml(state.compareFeedback)}</p>
        </div>

        <div class="practice-compare-grid">
            <div class="practice-compare-col mine">
                <span class="practice-compare-label">내 요약</span>
                <p class="practice-compare-text">${escapeHtml(state.studentSummary)}</p>
            </div>
            <div class="practice-compare-col ai">
                <span class="practice-compare-label">AI의 요약</span>
                <p class="practice-compare-text">${escapeHtml(state.aiSummary)}</p>
            </div>
        </div>

        <button type="button" id="practice-compare-next-btn" class="pink-button practice-submit-btn">
            다음 단계로
        </button>
    </div>
    `;

    document.getElementById('practice-compare-next-btn').addEventListener('click', () => {
        state.stage = 'CHOOSE';
        render();
    });
}

/* ==================== CHOOSE: 마인드맵 or 설명하기 ==================== */

function renderChooseStage(el) {
    el.innerHTML = `
    <div class="practice-choose-grid">
        <div class="practice-choose-card" id="practice-choose-mindmap">
            <p class="practice-choose-emoji">🧩</p>
            <p class="practice-choose-title">마인드맵 그리기</p>
            <p class="practice-choose-desc">중심 주제에서 가지를 뻗어가며 내용을 구조화해봐요.</p>
        </div>
        <div class="practice-choose-card" id="practice-choose-explain">
            <p class="practice-choose-emoji">🗣️</p>
            <p class="practice-choose-title">친구에게 설명하기</p>
            <p class="practice-choose-desc">마이크에 대고 소리 내어 설명하면 AI가 들어줘요.</p>
        </div>
    </div>
    `;

    document.getElementById('practice-choose-mindmap').addEventListener('click', () => {
        state.mode = 'mindmap';
        state.stage = 'MINDMAP';
        render();
    });

    document.getElementById('practice-choose-explain').addEventListener('click', () => {
        state.mode = 'explain';
        state.stage = 'EXPLAIN';
        render();
    });
}

/* ==================== MINDMAP: 중심 주제 + 가지 ==================== */

function renderMindmapStage(el) {
    el.innerHTML = `
    <div class="practice-mindmap">
        <div class="practice-retry-notice">
            <p><strong>🧩 마인드맵으로 정리해봐요</strong></p>
            <p>중심 주제를 적고, 관련된 개념들을 가지로 뻗어나가며 정리해보세요.</p>
        </div>

        <div class="practice-question-box">
            <p class="practice-question-text">중심 주제</p>
            <textarea id="practice-mindmap-topic" class="practice-answer-input" rows="1"
                placeholder="예: 이차함수">${escapeHtml(state.mindmap.topic)}</textarea>
        </div>

        <div id="practice-mindmap-branches"></div>

        <button type="button" id="practice-mindmap-add-btn" class="homework-cancel-btn practice-mindmap-add-btn">+ 가지 추가하기</button>

        ${state.error ? `<p class="practice-retry-error">${state.error}</p>` : ''}

        <button type="button" id="practice-mindmap-submit-btn" class="pink-button practice-submit-btn" ${state.loading ? 'disabled' : ''}>
            ${state.loading ? 'AI가 확인하고 있어요...' : '마인드맵 제출하기'}
        </button>
    </div>
    `;

    renderMindmapBranches();

    document.getElementById('practice-mindmap-topic').addEventListener('input', (e) => {
        state.mindmap.topic = e.target.value;
    });

    document.getElementById('practice-mindmap-add-btn').addEventListener('click', () => {
        if (state.mindmap.branches.length >= MAX_MINDMAP_BRANCHES) return;
        state.mindmap.branches.push({ title: '', detail: '' });
        renderMindmapBranches();
    });

    document.getElementById('practice-mindmap-submit-btn').addEventListener('click', submitMindmap);
}

function renderMindmapBranches() {
    const wrap = document.getElementById('practice-mindmap-branches');
    if (!wrap) return;

    wrap.innerHTML = state.mindmap.branches.map((branch, i) => `
        <div class="practice-question-box practice-mindmap-branch">
            <div class="practice-mindmap-branch-header">
                <p class="practice-question-text">가지 ${i + 1}</p>
                ${state.mindmap.branches.length > 1 ? `<button type="button" class="practice-mindmap-remove-btn" data-index="${i}">삭제</button>` : ''}
            </div>
            <textarea class="practice-answer-input practice-mindmap-branch-title" data-index="${i}" rows="1"
                placeholder="가지 제목 (예: 그래프의 특징)">${escapeHtml(branch.title)}</textarea>
            <textarea class="practice-answer-input practice-mindmap-branch-detail" data-index="${i}" rows="2"
                placeholder="세부 내용을 적어보세요">${escapeHtml(branch.detail)}</textarea>
        </div>
    `).join('');

    wrap.querySelectorAll('.practice-mindmap-branch-title').forEach(input => {
        input.addEventListener('input', (e) => {
            state.mindmap.branches[Number(e.target.dataset.index)].title = e.target.value;
        });
    });
    wrap.querySelectorAll('.practice-mindmap-branch-detail').forEach(input => {
        input.addEventListener('input', (e) => {
            state.mindmap.branches[Number(e.target.dataset.index)].detail = e.target.value;
        });
    });
    wrap.querySelectorAll('.practice-mindmap-remove-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const idx = Number(e.target.dataset.index);
            state.mindmap.branches.splice(idx, 1);
            renderMindmapBranches();
        });
    });
}

async function submitMindmap() {
    if (!state.mindmap.topic.trim()) {
        state.error = '중심 주제를 먼저 적어주세요.';
        render();
        return;
    }

    state.loading = true;
    state.error = null;
    render();

    try {
        const data = await callCoachApi({
            mode: 'mindmap',
            mindmap: state.mindmap,
            context: { studentSummary: state.studentSummary, aiSummary: state.aiSummary }
        });

        state.mindmapFeedback = data.feedback;
        state.stage = 'DONE';

        await updatePracticeRecord(state.recordId, {
            answers: {
                source: state.source,
                videoUrl: state.videoUrl,
                studentSummary: state.studentSummary,
                aiSummary: state.aiSummary,
                mode: 'mindmap',
                mindmap: state.mindmap
            },
            messages: [
                { role: 'ai', text: `[AI 요약]\n${state.aiSummary}` },
                { role: 'ai', text: `[비교 피드백]\n${state.compareFeedback}` },
                { role: 'student', text: `[마인드맵] 주제: ${state.mindmap.topic}` },
                { role: 'ai', text: `[마인드맵 피드백]\n${state.mindmapFeedback}` }
            ],
            isDone: true
        });
    } catch (err) {
        state.error = 'AI가 마인드맵을 확인하는 데 문제가 생겼어요. 다시 시도해주세요.';
    } finally {
        state.loading = false;
        render();
    }
}

/* ==================== EXPLAIN: 마이크로 설명하기 ==================== */

function isSpeechRecognitionSupported() {
    return Boolean(window.SpeechRecognition || window.webkitSpeechRecognition);
}

function renderExplainStage(el) {
    const supported = isSpeechRecognitionSupported();

    el.innerHTML = `
    <div class="practice-explain">
        <div class="practice-retry-notice">
            <p><strong>🗣️ 친구에게 설명하듯 소리 내어 말해봐요</strong></p>
            <p>${supported ? '마이크 버튼을 누르고 자유롭게 설명해보세요. 텍스트로 자동 변환돼요.' : '이 브라우저는 음성 인식을 지원하지 않아요. 아래 칸에 직접 입력해주세요.'}</p>
        </div>

        ${supported ? `
            <div class="practice-record-box">
                <button type="button" id="practice-record-btn" class="practice-record-btn ${state.isRecording ? 'recording' : ''}">
                    ${state.isRecording ? '⏹' : '🎙️'}
                </button>
                <p class="practice-record-label">${state.isRecording ? '녹음 중... 다시 누르면 멈춰요' : '눌러서 설명 시작하기'}</p>
            </div>
        ` : ''}

        <textarea id="practice-explain-transcript" class="practice-explain-transcript" rows="6"
            placeholder="말한 내용이 여기 텍스트로 나타나요. 직접 수정하거나 입력할 수도 있어요.">${escapeHtml(state.explainTranscript)}</textarea>

        ${state.error ? `<p class="practice-retry-error">${state.error}</p>` : ''}

        <button type="button" id="practice-explain-submit-btn" class="pink-button practice-submit-btn"
            ${state.explainTranscript.trim() && !state.loading ? '' : 'disabled'}>
            ${state.loading ? 'AI가 듣고 있어요...' : '설명 제출하기'}
        </button>
    </div>
    `;

    const recordBtn = document.getElementById('practice-record-btn');
    if (recordBtn) {
        recordBtn.addEventListener('click', () => {
            if (state.isRecording) stopRecording();
            else startRecording();
        });
    }

    document.getElementById('practice-explain-transcript').addEventListener('input', (e) => {
        state.explainTranscript = e.target.value;
        const btn = document.getElementById('practice-explain-submit-btn');
        if (btn) btn.disabled = !state.explainTranscript.trim();
    });

    document.getElementById('practice-explain-submit-btn').addEventListener('click', submitExplain);
}

function startRecording() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    recognitionInstance = new SpeechRecognition();
    recognitionInstance.lang = 'ko-KR';
    recognitionInstance.continuous = true;
    recognitionInstance.interimResults = true;

    let finalTranscript = state.explainTranscript ? state.explainTranscript.trim() + ' ' : '';

    recognitionInstance.onresult = (e) => {
        let interim = '';
        for (let i = e.resultIndex; i < e.results.length; i++) {
            const chunk = e.results[i][0].transcript;
            if (e.results[i].isFinal) {
                finalTranscript += chunk + ' ';
            } else {
                interim += chunk;
            }
        }
        state.explainTranscript = (finalTranscript + interim).trim();
        const box = document.getElementById('practice-explain-transcript');
        if (box) box.value = state.explainTranscript;
        const btn = document.getElementById('practice-explain-submit-btn');
        if (btn) btn.disabled = !state.explainTranscript.trim();
    };

    recognitionInstance.onerror = (e) => {
        console.error('음성 인식 오류:', e.error);
    };

    recognitionInstance.onend = () => {
        // 사용자가 아직 멈추지 않았는데 인식이 끊기면 자동으로 이어서 듣기
        if (state.isRecording && recognitionInstance) {
            try { recognitionInstance.start(); } catch (err) { /* 이미 시작된 경우 무시 */ }
        }
    };

    state.isRecording = true;
    state.error = null;
    render();
    recognitionInstance.start();
}

function stopRecording() {
    state.isRecording = false;
    if (recognitionInstance) {
        recognitionInstance.onend = null; // 자동 재시작 방지 후 정지
        recognitionInstance.stop();
    }
    render();
}

async function submitExplain() {
    if (state.isRecording) stopRecording();

    state.loading = true;
    state.error = null;
    render();

    try {
        const data = await callCoachApi({
            mode: 'explain',
            transcript: state.explainTranscript,
            context: { studentSummary: state.studentSummary, aiSummary: state.aiSummary }
        });

        state.explainFeedback = data.feedback;
        state.stage = 'DONE';

        await updatePracticeRecord(state.recordId, {
            answers: {
                source: state.source,
                videoUrl: state.videoUrl,
                studentSummary: state.studentSummary,
                aiSummary: state.aiSummary,
                mode: 'explain',
                explainTranscript: state.explainTranscript
            },
            messages: [
                { role: 'ai', text: `[AI 요약]\n${state.aiSummary}` },
                { role: 'ai', text: `[비교 피드백]\n${state.compareFeedback}` },
                { role: 'student', text: `[설명] ${state.explainTranscript}` },
                { role: 'ai', text: `[설명 피드백]\n${state.explainFeedback}` }
            ],
            isDone: true
        });
    } catch (err) {
        state.error = 'AI가 설명을 확인하는 데 문제가 생겼어요. 다시 시도해주세요.';
    } finally {
        state.loading = false;
        render();
    }
}

/* ==================== DONE ==================== */

function renderDoneStage(el) {
    const feedback = state.mode === 'mindmap' ? state.mindmapFeedback : state.explainFeedback;

    el.innerHTML = `
        <div class="practice-chat-log">
            <div class="practice-chat-bubble ai">
                <span class="practice-chat-avatar">🔗</span>
                <div class="practice-chat-text">${escapeHtml(feedback).replace(/\n/g, '<br>')}</div>
            </div>
        </div>
        <div class="practice-retry-complete">
            <p>🎉 오늘 심층 학습전략 연습을 완료했어요! 스스로 정리하고 설명해본 경험, 정말 잘 해냈어요.</p>
            <button type="button" id="practice-finish-btn" class="pink-button">연습 마치기</button>
        </div>
    `;

    document.getElementById('practice-finish-btn').addEventListener('click', () => {
        alert('수고했어요! 오늘 심층 학습전략 연습을 완료했어요 🎉');
    });
}