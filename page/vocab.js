import { supabase } from '../supabaseClient.js';

// ---------- 유틸 ----------
function shuffle(arr) {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
}

function normalize(str) {
    return String(str ?? '').trim().toLowerCase();
}

// 한글 뜻이 "작물,수확" 처럼 콤마로 여러 개 있을 수 있음 -> 개별 항목으로 분리
function meaningVariants(str) {
    return String(str ?? '')
        .split(',')
        .map(s => s.trim())
        .filter(Boolean);
}

// day 값이 'DAY17' 처럼 텍스트라도 숫자 순서대로 정렬되도록 함
function naturalDayCompare(a, b) {
    const numA = parseInt(String(a).replace(/\D/g, ''), 10);
    const numB = parseInt(String(b).replace(/\D/g, ''), 10);
    if (!isNaN(numA) && !isNaN(numB) && numA !== numB) return numA - numB;
    return String(a).localeCompare(String(b));
}

function escapeHtml(str) {
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

// ---------- 1. Day 목록 화면 ----------
export function VocabMainView() {
    return `
        <div class="vocab-container">
            <button id="vocab-back-btn" class="vocab-back-btn">← 대시보드로</button>
            <h2 class="vocab-title">🔤 영단어 퀴즈</h2>
            <p class="vocab-intro"><영단어장: Word Master 수능 2000>
            <br>연습을 시작해볼까요? 연습을 완료하면 연습 횟수가 표시돼요 </p>
            <div id="vocab-day-list" class="vocab-day-list">
                <p class="vocab-loading">Day 목록을 불러오는 중...</p>
            </div>
        </div>
    `;
}

export async function initVocabMainPage(onBack, onSelectDay) {
    const backBtn = document.getElementById('vocab-back-btn');
    if (backBtn) backBtn.addEventListener('click', onBack);

    const listEl = document.getElementById('vocab-day-list');

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        if (listEl) listEl.innerHTML = '<p class="vocab-loading">로그인이 필요해요.</p>';
        return;
    }

    // Day 목록 (전체 단어를 select하면 Supabase 기본 1000행 제한에 걸려
    // 일부 day가 누락될 수 있어서, distinct day만 반환하는 RPC를 사용함)
    const { data: dayRows, error: wordsError } = await supabase.rpc('get_vocab_days');

    if (wordsError) {
        console.error('단어 목록 로드 실패:', wordsError);
        if (listEl) listEl.innerHTML = '<p class="vocab-loading">단어 목록을 불러오지 못했어요.</p>';
        return;
    }

    const days = [...new Set(dayRows || [])].sort(naturalDayCompare);

    // 사용자별 진행 현황 (연습 횟수 / clear 여부)
    const { data: progressRows, error: progressError } = await supabase
        .from('vocab_progress')
        .select('day, attempts, cleared')
        .eq('user_id', user.id);

    if (progressError) {
        console.error('진행 현황 로드 실패:', progressError);
    }
    const progressMap = new Map((progressRows || []).map(p => [p.day, p]));

    if (!listEl) return;

    if (days.length === 0) {
        listEl.innerHTML = '<p class="vocab-loading">등록된 단어가 없어요. 선생님께 문의해주세요!</p>';
        return;
    }

    listEl.innerHTML = days.map(day => {
        const progress = progressMap.get(day);
        const attempts = progress?.attempts || 0;
        const cleared = !!progress?.cleared;
        return `
            <button class="vocab-day-btn ${cleared ? 'cleared' : ''}" data-day="${escapeHtml(day)}">
                <span class="vocab-day-label">${escapeHtml(day)}</span>
                <span class="vocab-day-meta">
                    ${attempts > 0 ? `${attempts}회 연습` : '연습 전'}
                    ${cleared ? ' · Clear! 🎉' : ''}
                </span>
            </button>
        `;
    }).join('');

    listEl.querySelectorAll('.vocab-day-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            onSelectDay(btn.dataset.day); // day는 'DAY17' 같은 문자열 그대로 전달
        });
    });
}

// ---------- 2. Day별 퀴즈 화면 ----------
export function VocabPracticeView(day) {
    return `
        <div class="vocab-container">
            <button id="vocab-practice-back-btn" class="vocab-back-btn">← Day 목록으로</button>
            <h2 class="vocab-title">${escapeHtml(day)} 연습</h2>
            <div id="vocab-progress-bar" class="vocab-progress-bar">
                <div id="vocab-progress-fill" class="vocab-progress-fill"></div>
            </div>
            <div id="vocab-quiz-area" class="vocab-quiz-area">
                <p class="vocab-loading">문제를 준비하는 중...</p>
            </div>
        </div>
    `;
}

export async function initVocabPracticePage(day, onBack) {
    const backBtn = document.getElementById('vocab-practice-back-btn');
    if (backBtn) backBtn.addEventListener('click', onBack);

    const quizArea = document.getElementById('vocab-quiz-area');
    const progressFill = document.getElementById('vocab-progress-fill');

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        if (quizArea) quizArea.innerHTML = '<p class="vocab-loading">로그인이 필요해요.</p>';
        return;
    }

    const { data: words, error } = await supabase
        .from('vocab_words')
        .select('id, word, meaning')
        .eq('day', day);

    if (error || !words || words.length === 0) {
        console.error('단어 로드 실패:', error);
        if (quizArea) quizArea.innerHTML = '<p class="vocab-loading">이 Day의 단어를 불러오지 못했어요.</p>';
        return;
    }

    let quiz = buildQuiz(words);
    let index = 0;
    let wrongCount = 0;
    let correctCount = 0;
    let awaitingNext = false;

    function updateProgressBar() {
        if (progressFill) {
            progressFill.style.width = `${Math.round((index / quiz.length) * 100)}%`;
        }
    }

    function renderQuestion() {
        awaitingNext = false;
        updateProgressBar();
        const q = quiz[index];
        const directionLabel = q.direction === 'e2k' ? '이 단어의 뜻은?' : '이 뜻에 맞는 영단어는?';

        let bodyHtml = '';
        if (q.type === 'choice') {
            bodyHtml = `
                <div class="vocab-options">
                    ${q.options.map(opt => `<button class="vocab-option-btn" data-value="${escapeHtml(opt)}">${escapeHtml(opt)}</button>`).join('')}
                </div>
            `;
        } else {
            bodyHtml = `
                <div class="vocab-text-answer">
                    <input type="text" id="vocab-text-input" class="vocab-text-input" placeholder="정답을 입력하세요" autocomplete="off">
                    <button id="vocab-submit-btn" class="vocab-submit-btn">확인</button>
                </div>
            `;
        }

        quizArea.innerHTML = `
            <p class="vocab-progress-label">${index + 1} / ${quiz.length}</p>
            <p class="vocab-direction-label">${directionLabel}</p>
            <p class="vocab-prompt">${escapeHtml(q.prompt)}</p>
            ${bodyHtml}
            <p id="vocab-feedback" class="vocab-feedback"></p>
        `;

        if (q.type === 'choice') {
            quizArea.querySelectorAll('.vocab-option-btn').forEach(btn => {
                btn.addEventListener('click', () => handleAnswer(btn.dataset.value, btn));
            });
        } else {
            const input = document.getElementById('vocab-text-input');
            const submitBtn = document.getElementById('vocab-submit-btn');
            const submit = () => handleAnswer(input.value, null);
            submitBtn.addEventListener('click', submit);
            input.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') submit();
            });
            input.focus();
        }
    }

    function handleAnswer(value, clickedBtn) {
        if (awaitingNext) return;
        awaitingNext = true;

        const q = quiz[index];
        // 객관식은 선택한 보기가 정답 보기와 일치하는지만 확인
        // 주관식은 뜻이 여러 개(콤마 구분)일 수 있으므로 그 중 하나만 맞아도 정답 처리
        const isCorrect = q.type === 'choice'
            ? normalize(value) === normalize(q.answer)
            : meaningVariants(q.answer).map(normalize).includes(normalize(value));
        const feedback = document.getElementById('vocab-feedback');

        if (isCorrect) {
            correctCount++;
            if (clickedBtn) clickedBtn.classList.add('correct');
            if (feedback) { feedback.textContent = '정답이에요! 🙆'; feedback.className = 'vocab-feedback correct'; }
        } else {
            wrongCount++;
            if (clickedBtn) clickedBtn.classList.add('wrong');
            if (feedback) {
                feedback.textContent = `아쉬워요! 정답은 "${q.answer}" 예요.`;
                feedback.className = 'vocab-feedback wrong';
            }
        }

        if (q.type === 'choice') {
            quizArea.querySelectorAll('.vocab-option-btn').forEach(b => b.disabled = true);
        } else {
            document.getElementById('vocab-text-input').disabled = true;
            document.getElementById('vocab-submit-btn').disabled = true;
        }

        setTimeout(() => {
            index++;
            if (index < quiz.length) {
                renderQuestion();
            } else {
                finishQuiz();
            }
        }, 900);
    }

    async function finishQuiz() {
        updateProgressBar();
        const passed = wrongCount <= 2;
        const { attempts, cleared } = await saveProgress(user.id, day, passed);

        quizArea.innerHTML = `
            <div class="vocab-result">
                <p class="vocab-result-score">정답 ${correctCount} / ${quiz.length} (오답 ${wrongCount}개)</p>
                ${passed
                    ? `<p class="vocab-result-clear">🎉 Clear!</p>`
                    : `<p class="vocab-result-fail">오답이 3개 이상이에요. 다시 도전해볼까요?</p>`}
                <p class="vocab-result-meta">이 Day 누적 연습 ${attempts}회${cleared ? ' · Clear 달성 ✅' : ''}</p>
                <div class="vocab-result-actions">
                    <button id="vocab-retry-btn" class="vocab-retry-btn">다시 풀기</button>
                    <button id="vocab-list-btn" class="vocab-list-btn">Day 목록으로</button>
                </div>
            </div>
        `;

        document.getElementById('vocab-retry-btn').addEventListener('click', () => {
            quiz = buildQuiz(words);
            index = 0; wrongCount = 0; correctCount = 0;
            renderQuestion();
        });
        document.getElementById('vocab-list-btn').addEventListener('click', onBack);
    }

    renderQuestion();
}

// ---------- 진행 현황 저장 (연습 횟수 증가 + clear 여부는 한번 달성하면 유지) ----------
async function saveProgress(userId, day, passed) {
    const { data: existing } = await supabase
        .from('vocab_progress')
        .select('attempts, cleared')
        .eq('user_id', userId)
        .eq('day', day)
        .maybeSingle();

    const attempts = (existing?.attempts || 0) + 1;
    const cleared = !!existing?.cleared || passed;

    const { error } = await supabase
        .from('vocab_progress')
        .upsert(
            { user_id: userId, day, attempts, cleared, updated_at: new Date().toISOString() },
            { onConflict: 'user_id,day' }
        );

    if (error) console.error('진행 현황 저장 실패:', error);

    return { attempts, cleared };
}

// ---------- 퀴즈 생성: 영어→한글 / 한글→영어 5:5, 객관식/주관식 랜덤 혼합 ----------
function buildQuiz(words) {
    const shuffled = shuffle(words);
    const half = Math.ceil(shuffled.length / 2);

    const quiz = shuffled.map((w, idx) => {
        const direction = idx < half ? 'e2k' : 'k2e'; // e2k: 영단어 보여주고 뜻 맞추기, k2e: 반대
        const canMultipleChoice = words.length >= 4; // 오답 보기 3개를 만들 수 있어야 객관식 가능
        const isMultipleChoice = canMultipleChoice && Math.random() < 0.5;

        const prompt = direction === 'e2k' ? w.word : w.meaning;
        const answer = direction === 'e2k' ? w.meaning : w.word;

        let options = null;
        if (isMultipleChoice) {
            const pool = words
                .filter(x => x.id !== w.id)
                .map(x => direction === 'e2k' ? x.meaning : x.word);
            const distractors = shuffle(pool).slice(0, 3);
            options = shuffle([answer, ...distractors]);
        }

        return {
            id: w.id,
            prompt,
            answer,
            direction,
            type: isMultipleChoice ? 'choice' : 'text',
            options
        };
    });

    return shuffle(quiz);
}