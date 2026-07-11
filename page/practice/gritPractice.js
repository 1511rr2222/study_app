import { supabase } from '../../supabaseClient.js';
import { escapeHtml } from './practiceUtils.js';
import { uploadPhoto, removePhotoFromStorage } from '../homework/storage.js';
import { openLightbox } from '../homework/lightbox.js';

const PERIOD_OPTIONS = [1, 3, 5, 7];
const justCompletedMap = new Map();
const expandedChallengeIds = new Set();

/* -------------------- 대시보드 요약 카드 -------------------- */

export function GritSummaryView() {
    return `
        <div class="grit-summary-box">
            <div class="homework-header-row">
                <h2>🔥 그릿 챌린지</h2>
                <span class="grit-summary-badge" id="grit-summary-badge">0개 진행중</span>
            </div>
            <div id="grit-summary-content"><p class="grit-loading">불러오는 중...</p></div>
        </div>
    `;
}

export async function initGritSummary(onOpenFull) {
    const container = document.getElementById('grit-summary-content');
    if (!container) return;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        container.innerHTML = `<p class="practice-soon">로그인이 필요해요.</p>`;
        return;
    }

    const { data: challenges, error } = await supabase
        .from('grit_challenges')
        .select('*')
        .eq('user_id', user.id);

    if (error) {
        console.error('그릿 요약 로드 실패:', error);
        container.innerHTML = `<p class="practice-soon">불러오지 못했어요.</p>`;
        return;
    }

    const list = challenges || [];
    const active = list.filter(c => calcDayIndex(c.start_date) <= c.period);

    const badge = document.getElementById('grit-summary-badge');
    if (badge) badge.textContent = `${active.length}개 진행중`;

    if (active.length === 0) {
        container.innerHTML = `
            <p class="homework-empty">진행 중인 챌린지가 없어요. 새 챌린지를 시작해보세요!</p>
            <button type="button" id="grit-summary-open-btn" class="homework-open-btn">챌린지 보러가기 →</button>
        `;
    } else {
        const { data: logs } = await supabase
            .from('grit_logs')
            .select('challenge_id, day_index')
            .in('challenge_id', active.map(c => c.id));

        const doneSet = new Set((logs || []).map(l => `${l.challenge_id}-${l.day_index}`));

        const rowsHtml = active.map(c => {
            const dayIndex = calcDayIndex(c.start_date);
            const doneToday = doneSet.has(`${c.id}-${dayIndex}`);
            return `
                <div class="grit-summary-row">
                    <span class="grit-summary-dot ${doneToday ? 'done' : ''}"></span>
                    <span class="grit-summary-goal">${escapeHtml(c.goal_text)}</span>
                    <span class="grit-summary-day">Day ${dayIndex}/${c.period}</span>
                </div>
            `;
        }).join('');

        container.innerHTML = `
            <div class="grit-summary-list">${rowsHtml}</div>
            <button type="button" id="grit-summary-open-btn" class="homework-open-btn">챌린지 전체 보기 →</button>
        `;
    }

    document.getElementById('grit-summary-open-btn').addEventListener('click', onOpenFull);
}

/* -------------------- 그릿 전용 전체 페이지 (헤더 없이 챌린지 화면만) -------------------- */

export function GritPageView() {
    return `
        <div class="dashboard-container">
            <button type="button" id="grit-back-btn" class="homework-back-btn">← 대시보드로 돌아가기</button>
            <div class="hero-box">
                <h2>🔥 그릿 챌린지</h2>
                <div id="grit-page-content"></div>
            </div>
        </div>
    `;
}

export function initGritPage(onBack) {
    document.getElementById('grit-back-btn').addEventListener('click', onBack);
    initGritPractice(document.getElementById('grit-page-content'));
}

export async function initGritPractice(contentEl) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        contentEl.innerHTML = '<p class="practice-soon">로그인이 필요해요.</p>';
        return;
    }

    await renderAll(contentEl, user);
}

/* -------------------- 전체 화면: 새 챌린지 추가 + 챌린지 카드 목록 -------------------- */

async function renderAll(contentEl, user) {
    contentEl.innerHTML = `<p class="grit-loading">불러오는 중...</p>`;

    const { data: challenges, error: challengeErr } = await supabase
        .from('grit_challenges')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

    if (challengeErr) {
        console.error('챌린지 로드 실패:', challengeErr);
        contentEl.innerHTML = `<p class="practice-soon">데이터를 불러오지 못했어요. 다시 시도해주세요.</p>`;
        return;
    }

    const list = challenges || [];
    let logsByChallenge = {};

    if (list.length > 0) {
        const { data: logs, error: logsErr } = await supabase
            .from('grit_logs')
            .select('*')
            .in('challenge_id', list.map(c => c.id))
            .order('day_index');

        if (logsErr) {
            console.error('회고 로드 실패:', logsErr);
            contentEl.innerHTML = `<p class="practice-soon">데이터를 불러오지 못했어요. 다시 시도해주세요.</p>`;
            return;
        }

        (logs || []).forEach(l => {
            if (!logsByChallenge[l.challenge_id]) logsByChallenge[l.challenge_id] = [];
            logsByChallenge[l.challenge_id].push(l);
        });
    }

    // 진행 중 / 완료된 챌린지를 나눠서 각각 접이식 그룹으로 보여줌
    const active = list.filter(c => calcDayIndex(c.start_date) <= c.period);
    const finished = list.filter(c => calcDayIndex(c.start_date) > c.period);

    contentEl.innerHTML = `
        <div class="grit-page">
            <div class="grit-add-section">
                <button type="button" id="grit-add-toggle-btn" class="grit-add-toggle-btn">+ 새 챌린지 시작하기</button>
                <div class="grit-setup" id="grit-setup-form" style="display:none;">
                    <p class="grit-setup-lead">작은 약속을 정하고, 며칠이든 나와의 약속을 지켜보아요.</p>

                    <p class="grit-field-label">기간을 선택해주세요</p>
                    <div class="grit-period-select" id="grit-period-select">
                        ${PERIOD_OPTIONS.map(p => `<button type="button" class="grit-period-btn" data-period="${p}">${p}일</button>`).join('')}
                    </div>

                    <p class="grit-field-label">챌린지 기간 동안 매일 지킬 단 하나의 목표</p>
                    <input type="text" id="grit-goal-input" class="grit-goal-input" placeholder="예: 수학 문제집 5페이지 풀기">

                    <button type="button" id="grit-start-btn" class="pink-button grit-start-btn" disabled>챌린지 시작하기 🔥</button>
                </div>
            </div>

            ${GroupSectionHtml('active', '진행중인 챌린지 보기', active, logsByChallenge)}
            ${GroupSectionHtml('finished', '완료된 챌린지 보기', finished, logsByChallenge)}
        </div>
    `;

    initAddSection(contentEl, user);

    contentEl.querySelectorAll('.grit-group-toggle').forEach(btn => {
        btn.addEventListener('click', () => {
            const key = btn.dataset.group;
            groupOpenState[key] = !groupOpenState[key];
            const listEl = contentEl.querySelector(`.grit-group-list[data-group-list="${key}"]`);
            if (listEl) listEl.classList.toggle('show', groupOpenState[key]);
            btn.classList.toggle('open', groupOpenState[key]);
        });
    });

    const allChallenges = [...active, ...finished];
    contentEl.querySelectorAll('.grit-challenge-card').forEach(card => {
        const challenge = allChallenges.find(c => c.id === card.dataset.challengeId);
        const logs = logsByChallenge[challenge.id] || [];
        initChallengeCard(card, user, challenge, logs, () => renderAll(contentEl, user));
    });
}

// ✅ 그룹(진행중/완료) 펼침 상태 기억 - 진행중은 기본으로 펼쳐두고, 완료는 접어둠
const groupOpenState = { active: true, finished: false };

function GroupSectionHtml(key, label, challengeList, logsByChallenge) {
    if (key === 'finished' && challengeList.length === 0) return ''; // 완료된 챌린지가 없으면 섹션 자체를 숨김

    const isOpen = groupOpenState[key];
    const bodyHtml = challengeList.length === 0
        ? `<p class="grit-history-empty grit-no-challenge">아직 진행 중인 챌린지가 없어요. 위에서 새 챌린지를 시작해보세요!</p>`
        : challengeList.map(c => ChallengeCardHtml(c, logsByChallenge[c.id] || [])).join('');

    return `
        <div class="grit-group">
            <button type="button" class="grit-group-toggle ${isOpen ? 'open' : ''}" data-group="${key}">
                <span class="grit-group-caret" aria-hidden="true">▾</span>
                <span class="grit-group-label">${label}</span>
                <span class="grit-group-count">${challengeList.length}</span>
            </button>
            <div class="grit-group-list ${isOpen ? 'show' : ''}" data-group-list="${key}">
                ${bodyHtml}
            </div>
        </div>
    `;
}

/* -------------------- 새 챌린지 추가 폼 -------------------- */

function initAddSection(contentEl, user) {
    const toggleBtn = document.getElementById('grit-add-toggle-btn');
    const form = document.getElementById('grit-setup-form');
    const periodSelect = document.getElementById('grit-period-select');
    const goalInput = document.getElementById('grit-goal-input');
    const startBtn = document.getElementById('grit-start-btn');
    let selectedPeriod = null;

    toggleBtn.addEventListener('click', () => {
        const isOpen = form.style.display !== 'none';
        form.style.display = isOpen ? 'none' : '';
        toggleBtn.textContent = isOpen ? '+ 새 챌린지 시작하기' : '취소';
    });

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

        await renderAll(contentEl, user);
    });
}

/* -------------------- 챌린지 카드 (마크업) -------------------- */

function ChallengeCardHtml(challenge, logs) {
    const dayIndex = calcDayIndex(challenge.start_date);
    const doneSet = new Set(logs.map(l => l.day_index));
    const isFinished = dayIndex > challenge.period;
    const alreadyDoneToday = doneSet.has(dayIndex);
    const isOpen = expandedChallengeIds.has(challenge.id);
    const percent = Math.round((doneSet.size / challenge.period) * 100);
    const streak = calcStreak(doneSet, dayIndex, alreadyDoneToday);

    const justPopDay = justCompletedMap.get(challenge.id);
    const dots = Array.from({ length: challenge.period }, (_, i) => {
        const n = i + 1;
        const classes = ['grit-day-dot'];
        if (doneSet.has(n)) classes.push('done');
        if (n === dayIndex && !isFinished) classes.push('today');
        if (n === justPopDay) classes.push('grit-day-pop');
        return `<div class="${classes.join(' ')}">${doneSet.has(n) ? '✓' : n}</div>`;
    }).join('');
    justCompletedMap.delete(challenge.id); // 한 번 쓰고 초기화 (다음 렌더부터는 재생 안 됨)

    const historyHtml = logs.length
        ? `<ul class="grit-history-list">${logs
            .slice()
            .sort((a, b) => b.day_index - a.day_index)
            .map(l => {
                const photos = l.photos || [];
                const photosHtml = photos.length
                    ? `<div class="grit-history-photos">${photos.map(src => `<img src="${src}" class="grit-history-photo" data-src="${src}" alt="Day ${l.day_index} 인증사진">`).join('')}</div>`
                    : '';
                return `
                    <li>
                        <div class="grit-history-top">
                            <span class="grit-history-day">Day ${l.day_index}</span>
                            <span class="grit-history-text">${l.reflection ? escapeHtml(l.reflection) : '(회고 없음)'}</span>
                        </div>
                        ${photosHtml}
                    </li>
                `;
            })
            .join('')}</ul>`
        : `<p class="grit-history-empty">아직 회고가 없어요. 오늘의 기록을 남겨보세요!</p>`;

    let actionHtml = '';
    if (isFinished) {
        actionHtml = `
            <div class="grit-today-box grit-finish-box">
                <div class="grit-trophy">✨ 🏆 ✨</div>
                <p class="grit-today-lead">${challenge.period}일 챌린지 완주!</p>
                <p class="grit-finish-sub">스스로 한 약속을 끝까지 지켰어요. 정말 대단해요!</p>
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

                <div class="grit-photo-section">
                    <div class="grit-photo-list"></div>
                    <label class="grit-photo-upload-btn">
                        📷 인증사진 추가
                        <input type="file" accept="image/*" multiple class="grit-photo-input" hidden>
                    </label>
                    <p class="grit-photo-notice">*인증사진을 1장 이상 올려야 완료 도장을 찍을 수 있어요</p>
                </div>

                <textarea class="grit-reflection-input" placeholder="오늘 하루를 한 줄로 남겨보세요 (선택사항)"></textarea>
                <button type="button" class="pink-button grit-start-btn grit-complete-btn" disabled>오늘 완료 도장 찍기 ✅</button>
            </div>
        `;
    }

    return `
        <div class="grit-challenge-card ${isFinished ? 'grit-challenge-finished' : ''} ${isOpen ? 'grit-challenge-expanded' : ''}" data-challenge-id="${challenge.id}">
            <div class="grit-challenge-summary-row" data-id="${challenge.id}">
                <span class="grit-challenge-status-dot ${isFinished ? 'finished' : 'active'}"></span>
                <span class="grit-challenge-summary-goal">${escapeHtml(challenge.goal_text)}</span>
                <span class="grit-challenge-summary-date">${formatDateRange(challenge.start_date, challenge.period)}</span>
                <span class="grit-challenge-summary-day">${isFinished ? '완료' : `Day ${dayIndex}/${challenge.period}`}</span>
                <button type="button" class="grit-icon-btn grit-challenge-edit-btn" title="수정">✏️</button>
                <button type="button" class="grit-icon-btn grit-challenge-delete-btn" title="삭제">🗑️</button>
                <span class="grit-challenge-caret" aria-hidden="true">▾</span>
            </div>

            <div class="grit-challenge-edit-row" style="display:none;">
                <select class="grit-challenge-edit-period">
                    ${PERIOD_OPTIONS.map(p => `<option value="${p}" ${p === challenge.period ? 'selected' : ''}>${p}일</option>`).join('')}
                </select>
                <input type="text" class="grit-challenge-edit-input" value="${escapeHtml(challenge.goal_text)}">
                <button type="button" class="grit-icon-btn grit-challenge-save-btn" title="저장">✓</button>
                <button type="button" class="grit-icon-btn grit-challenge-cancel-btn" title="취소">✕</button>
            </div>

            <div class="grit-challenge-detail">
                <div class="grit-day-dots">${dots}</div>

                <div class="grit-progress-bar-track">
                    <div class="grit-progress-bar-fill" style="width:${percent}%"></div>
                </div>
                <div class="grit-progress-row">
                    <p class="grit-progress-text">${doneSet.size}일 / ${challenge.period}일 (${percent}%)</p>
                    ${streak >= 2 ? `<span class="grit-streak-badge">🔥 ${streak}일 연속</span>` : ''}
                </div>
                ${!isFinished ? `<p class="grit-motivation-text">${motivationText(percent)}</p>` : ''}

                ${actionHtml}

                <div class="grit-history">
                    <p class="grit-field-label">회고 기록</p>
                    ${historyHtml}
                </div>
            </div>
        </div>
    `;
}

// 완료한 날짜(doneSet) 기준 오늘(또는 어제)까지 이어진 연속 성공일수
function calcStreak(doneSet, dayIndex, alreadyDoneToday) {
    let streak = 0;
    let day = alreadyDoneToday ? dayIndex : dayIndex - 1;
    while (day >= 1 && doneSet.has(day)) {
        streak += 1;
        day -= 1;
    }
    return streak;
}

// 진행률 구간별 동기부여 문구
function motivationText(percent) {
    if (percent === 0) return '첫 도장을 찍어볼까요? 시작이 반이에요 💪';
    if (percent < 50) return '좋은 흐름이에요, 이대로 계속 가봐요! 🌱';
    if (percent < 75) return '벌써 절반 넘었어요! 🎯';
    if (percent < 100) return '거의 다 왔어요, 조금만 더! 🔥';
    return '마지막 하루예요! 완주가 코앞이에요 🏁';
}

/* -------------------- 챌린지 카드 (이벤트) -------------------- */

function initChallengeCard(card, user, challenge, logs, onChanged) {
    const dayIndex = calcDayIndex(challenge.start_date);

    // 요약 행 클릭 → 펼침/접힘 토글 (화면 다시 그리지 않고 즉시 반응 + 상태도 기억)
    const summaryRow = card.querySelector('.grit-challenge-summary-row');
    summaryRow.addEventListener('click', () => {
        const id = summaryRow.dataset.id;
        if (expandedChallengeIds.has(id)) {
            expandedChallengeIds.delete(id);
        } else {
            expandedChallengeIds.add(id);
        }
        card.classList.toggle('grit-challenge-expanded');
    });

    /* ---------- 수정 / 삭제 (요약 행 안의 작은 아이콘 버튼) ---------- */
    const editRow = card.querySelector('.grit-challenge-edit-row');
    const editBtn = card.querySelector('.grit-challenge-edit-btn');
    const deleteBtn = card.querySelector('.grit-challenge-delete-btn');
    const cancelEditBtn = card.querySelector('.grit-challenge-cancel-btn');
    const saveEditBtn = card.querySelector('.grit-challenge-save-btn');
    const editInput = card.querySelector('.grit-challenge-edit-input');
    const editPeriodSelect = card.querySelector('.grit-challenge-edit-period');

    editBtn.addEventListener('click', (e) => {
        e.stopPropagation(); // 요약 행 펼침 토글이 같이 실행되지 않도록
        summaryRow.style.display = 'none';
        editRow.style.display = 'flex';
        editInput.focus();
        editInput.select();
    });

    cancelEditBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        editRow.style.display = 'none';
        summaryRow.style.display = 'flex';
    });

    saveEditBtn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const newGoal = editInput.value.trim();
        const newPeriod = Number(editPeriodSelect.value);

        if (!newGoal) {
            alert('목표 내용을 입력해주세요!');
            return;
        }

        saveEditBtn.disabled = true;
        const { error } = await supabase
            .from('grit_challenges')
            .update({ goal_text: newGoal, period: newPeriod })
            .eq('id', challenge.id);

        if (error) {
            console.error('챌린지 수정 실패:', error);
            alert('수정 중 문제가 생겼어요.');
            saveEditBtn.disabled = false;
            return;
        }

        await onChanged();
    });

    deleteBtn.addEventListener('click', async (e) => {
        e.stopPropagation();
        if (!confirm('이 챌린지를 삭제할까요? 그동안의 회고 기록도 함께 삭제돼요.')) return;

        deleteBtn.disabled = true;
        const { error } = await supabase.from('grit_challenges').delete().eq('id', challenge.id);

        if (error) {
            console.error('챌린지 삭제 실패:', error);
            alert('삭제 중 문제가 생겼어요.');
            deleteBtn.disabled = false;
            return;
        }

        expandedChallengeIds.delete(challenge.id);
        await onChanged();
    });

    // 히스토리 사진 - 클릭하면 크게 보기
    card.querySelectorAll('.grit-history-photo').forEach(img => {
        img.addEventListener('click', () => openLightbox(img.dataset.src));
    });

    const completeBtn = card.querySelector('.grit-complete-btn');
    if (!completeBtn) return; // 이미 완료했거나 챌린지가 끝난 카드는 사진/완료 로직 불필요

    /* ---------- 오늘의 인증사진 업로드 (완료 도장 찍기 전, 이 카드 안에서만 임시로 들고 있음) ---------- */
    const photoList = card.querySelector('.grit-photo-list');
    const photoInput = card.querySelector('.grit-photo-input');
    let todayPhotos = []; // 완료 도장 찍을 때 grit_logs에 같이 저장됨

    function renderPhotoThumbs() {
        photoList.innerHTML = todayPhotos.map((src, idx) => `
            <div class="grit-photo-thumb grit-photo-thumb-new">
                <img src="${src}" alt="인증사진 ${idx + 1}" class="grit-photo-img" data-src="${src}">
                <button type="button" class="grit-photo-remove" data-index="${idx}">×</button>
            </div>
        `).join('');

        photoList.querySelectorAll('.grit-photo-img').forEach(img => {
            img.addEventListener('click', () => openLightbox(img.dataset.src));
        });

        photoList.querySelectorAll('.grit-photo-remove').forEach(btn => {
            btn.addEventListener('click', async () => {
                const idx = Number(btn.dataset.index);
                const [removedUrl] = todayPhotos.splice(idx, 1);
                if (removedUrl) await removePhotoFromStorage(removedUrl);
                renderPhotoThumbs();
                completeBtn.disabled = todayPhotos.length === 0;
            });
        });

        completeBtn.disabled = todayPhotos.length === 0;
    }

    photoInput.addEventListener('change', async (e) => {
        const files = Array.from(e.target.files || []);
        if (files.length === 0) return;

        const label = photoInput.closest('.grit-photo-upload-btn');
        if (label) label.style.opacity = '0.5';

        try {
            const itemId = `challenge-${challenge.id}-day${dayIndex}`;
            const uploadedUrls = await Promise.all(
                files.map(file => uploadPhoto(file, user.id, itemId))
            );
            todayPhotos.push(...uploadedUrls);
            renderPhotoThumbs();
        } catch (err) {
            console.error('사진 업로드 실패:', err);
            alert('사진을 업로드하는 중 문제가 생겼어요. 다시 시도해주세요.');
        } finally {
            if (label) label.style.opacity = '';
            photoInput.value = '';
        }
    });

    /* ---------- 완료 도장 찍기 ---------- */
    completeBtn.addEventListener('click', async () => {
        if (todayPhotos.length === 0) {
            alert('완료 도장을 찍기 전에 인증사진을 1장 이상 올려주세요!');
            return;
        }

        const reflectionInput = card.querySelector('.grit-reflection-input');
        const reflection = reflectionInput ? reflectionInput.value.trim() : '';

        completeBtn.disabled = true;
        completeBtn.innerText = '저장하는 중...';

        const { error } = await supabase.from('grit_logs').insert({
            challenge_id: challenge.id,
            user_id: user.id,
            day_index: dayIndex,
            reflection: reflection || null,
            photos: todayPhotos,
        });

        if (error) {
            console.error('오늘 기록 저장 실패:', error);
            alert('저장 중 문제가 생겼어요. 다시 시도해주세요.');
            completeBtn.disabled = false;
            completeBtn.innerText = '오늘 완료 도장 찍기 ✅';
            return;
        }

        justCompletedMap.set(challenge.id, dayIndex); // 다음 렌더에서 이 챌린지의 이 날짜만 pop 애니메이션
        await onChanged();
    });
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

// 요약 행에 보여줄 'MM.DD~MM.DD' 날짜 범위 (시작일 ~ 시작일+기간-1일)
function formatDateRange(startDateStr, period) {
    const [y, m, d] = startDateStr.split('-').map(Number);
    const start = new Date(y, m - 1, d);
    const end = new Date(y, m - 1, d + period - 1);
    const fmt = (date) => `${String(date.getMonth() + 1).padStart(2, '0')}.${String(date.getDate()).padStart(2, '0')}`;
    return `${fmt(start)}~${fmt(end)}`;
}