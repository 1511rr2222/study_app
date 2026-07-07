import { supabase } from '../../supabaseClient.js';

const PERIOD_OPTIONS = [1, 3, 5, 7];

export async function initGritPractice(contentEl) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        contentEl.innerHTML = '<p class="practice-soon">로그인이 필요해요.</p>';
        return;
    }

    await renderCurrentState(contentEl, user);
}

async function renderCurrentState(contentEl, user) {
    contentEl.innerHTML = `<p class="grit-loading">불러오는 중...</p>`;

    const { data: challenge, error: challengeErr } = await supabase
        .from('grit_challenges')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

    if (challengeErr) {
        console.error('챌린지 로드 실패:', challengeErr);
        contentEl.innerHTML = `<p class="practice-soon">데이터를 불러오지 못했어요. 다시 시도해주세요.</p>`;
        return;
    }

    if (!challenge) {
        renderSetup(contentEl, user);
        return;
    }

    const { data: logs, error: logsErr } = await supabase
        .from('grit_logs')
        .select('*')
        .eq('challenge_id', challenge.id)
        .order('day_index');

    if (logsErr) {
        console.error('회고 로드 실패:', logsErr);
        contentEl.innerHTML = `<p class="practice-soon">데이터를 불러오지 못했어요. 다시 시도해주세요.</p>`;
        return;
    }

    renderTracker(contentEl, user, challenge, logs || []);
}

/* -------------------- 설정 화면 -------------------- */

function renderSetup(contentEl, user) {
    contentEl.innerHTML = `
        <div class="grit-setup">
            <p class="grit-setup-lead">작은 약속을 정하고, 며칠이든 나와의 약속을 지켜보아요.</p>

            <p class="grit-field-label">기간을 선택해주세요</p>
            <div class="grit-period-select" id="grit-period-select">
                ${PERIOD_OPTIONS.map(p => `<button type="button" class="grit-period-btn" data-period="${p}">${p}일</button>`).join('')}
            </div>

            <p class="grit-field-label">챌린지 기간 동안 매일 지킬 단 하나의 목표</p>
            <input type="text" id="grit-goal-input" class="grit-goal-input" placeholder="예: 수학 문제집 5페이지 풀기">

            <button type="button" id="grit-start-btn" class="pink-button grit-start-btn" disabled>챌린지 시작하기 🔥</button>
        </div>
    `;

    const periodSelect = document.getElementById('grit-period-select');
    const goalInput = document.getElementById('grit-goal-input');
    const startBtn = document.getElementById('grit-start-btn');
    let selectedPeriod = null;

    function updateStartBtn() {
        startBtn.disabled = !(selectedPeriod && goalInput.value.trim().length > 0);
    }

    periodSelect.querySelectorAll('.grit-period-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            selectedPeriod = Number(btn.dataset.period);
            periodSelect.querySelectorAll('.grit-period-btn').forEach(b => b.classList.remove('selected'));
            btn.classList.add('selected');
            updateStartBtn();
        });
    });

    goalInput.addEventListener('input', updateStartBtn);

    startBtn.addEventListener('click', async () => {
        if (!selectedPeriod || !goalInput.value.trim()) return;
        startBtn.disabled = true;
        startBtn.innerText = '시작하는 중...';

        const { error } = await supabase.from('grit_challenges').insert({
            user_id: user.id,
            period: selectedPeriod,
            goal_text: goalInput.value.trim(),
            start_date: todayString(),
        });

        if (error) {
            console.error('챌린지 생성 실패:', error);
            alert('챌린지를 시작하지 못했어요. 다시 시도해주세요.');
            startBtn.disabled = false;
            startBtn.innerText = '챌린지 시작하기 🔥';
            return;
        }

        await renderCurrentState(contentEl, user);
    });
}

/* -------------------- 진행 화면 -------------------- */

function renderTracker(contentEl, user, challenge, logs) {
    const dayIndex = calcDayIndex(challenge.start_date);
    const doneSet = new Set(logs.map(l => l.day_index));
    const isFinished = dayIndex > challenge.period;
    const alreadyDoneToday = doneSet.has(dayIndex);

    const dots = Array.from({ length: challenge.period }, (_, i) => {
        const n = i + 1;
        const classes = ['grit-day-dot'];
        if (doneSet.has(n)) classes.push('done');
        if (n === dayIndex && !isFinished) classes.push('today');
        return `<div class="${classes.join(' ')}">${doneSet.has(n) ? '✓' : n}</div>`;
    }).join('');

    const historyHtml = logs.length
        ? `<ul class="grit-history-list">${logs
            .slice()
            .sort((a, b) => b.day_index - a.day_index)
            .map(l => `<li><span class="grit-history-day">Day ${l.day_index}</span>${l.reflection ? escapeHtml(l.reflection) : '(회고 없음)'}</li>`)
            .join('')}</ul>`
        : `<p class="grit-history-empty">아직 회고가 없어요. 오늘의 기록을 남겨보세요!</p>`;

    let actionHtml = '';
    if (isFinished) {
        actionHtml = `
            <div class="grit-today-box grit-finish-box">
                <p class="grit-today-lead">${challenge.period}일 챌린지를 마쳤어요! 정말 대단해요 🎉</p>
                <button type="button" id="grit-new-challenge-btn" class="pink-button grit-start-btn">새 챌린지 시작하기</button>
            </div>
        `;
    } else if (alreadyDoneToday) {
        actionHtml = `
            <div class="grit-today-box">
                <p class="grit-today-lead">오늘 목표는 이미 완료했어요. 내일 또 만나요 ✨</p>
            </div>
        `;
    } else {
        actionHtml = `
            <div class="grit-today-box">
                <p class="grit-today-lead">오늘 목표, 잘 해내셨나요?</p>
                <textarea id="grit-reflection-input" class="grit-reflection-input" placeholder="오늘 하루를 한 줄로 남겨보세요 (선택사항)"></textarea>
                <button type="button" id="grit-complete-btn" class="pink-button grit-start-btn">오늘 완료 도장 찍기 ✅</button>
            </div>
        `;
    }

    contentEl.innerHTML = `
        <div class="grit-tracker">
            <p class="grit-goal-display">오늘의 목표: <strong>${escapeHtml(challenge.goal_text)}</strong></p>

            <div class="grit-day-dots">${dots}</div>
            <p class="grit-progress-text">${doneSet.size}일 / ${challenge.period}일 성공! 스스로를 칭찬해주세요 👏</p>

            ${actionHtml}

            <div class="grit-history">
                <p class="grit-field-label">회고 기록</p>
                ${historyHtml}
            </div>
        </div>
    `;

    const newChallengeBtn = document.getElementById('grit-new-challenge-btn');
    if (newChallengeBtn) {
        newChallengeBtn.addEventListener('click', () => renderSetup(contentEl, user));
        return;
    }

    const completeBtn = document.getElementById('grit-complete-btn');
    if (completeBtn) {
        completeBtn.addEventListener('click', async () => {
            const reflectionInput = document.getElementById('grit-reflection-input');
            const reflection = reflectionInput ? reflectionInput.value.trim() : '';

            completeBtn.disabled = true;
            completeBtn.innerText = '저장하는 중...';

            const { error } = await supabase.from('grit_logs').insert({
                challenge_id: challenge.id,
                user_id: user.id,
                day_index: dayIndex,
                reflection: reflection || null,
            });

            if (error) {
                console.error('오늘 기록 저장 실패:', error);
                alert('저장 중 문제가 생겼어요. 다시 시도해주세요.');
                completeBtn.disabled = false;
                completeBtn.innerText = '오늘 완료 도장 찍기 ✅';
                return;
            }

            await renderCurrentState(contentEl, user);
        });
    }
}

/* -------------------- 유틸 -------------------- */

function todayString() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function toDateOnly(date) {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

// start_date('YYYY-MM-DD') 기준 오늘이 챌린지 몇 번째 날인지 (1부터 시작)
function calcDayIndex(startDateStr) {
    const [y, m, d] = startDateStr.split('-').map(Number);
    const start = new Date(y, m - 1, d);
    const today = toDateOnly(new Date());
    const diffDays = Math.round((today - start) / (1000 * 60 * 60 * 24));
    return diffDays + 1;
}

function escapeHtml(str) {
    const div = document.createElement('div');
    div.innerText = str;
    return div.innerHTML;
}