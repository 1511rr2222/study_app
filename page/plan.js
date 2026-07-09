import { supabase } from '../supabaseClient.js';

const WEEKDAY_LABELS = ['월', '화', '수', '목', '금'];
const GRID_START_MIN = 7 * 60;   // 07:00
const GRID_END_MIN = 23 * 60;    // 23:00
const HOUR_HEIGHT = 40;          // px / 1시간
const GRID_HEIGHT = (GRID_END_MIN - GRID_START_MIN) / 60 * HOUR_HEIGHT;

const SCORES = [1, 2, 3, 4, 5];

// ✅ 펼쳐둔 지난 기록 id를 기억 (다시 그려져도 접히지 않도록)
let expandedLogIds = new Set();
let selectedScore = null;

// 시간표 모달 상태
let modalMode = 'add'; // 'add' | 'edit'
let modalDay = 0;
let modalEditId = null;

function todayStr() {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
}

function escapeHtml(str) {
    return String(str ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function timeToMinutes(t) {
    if (!t) return null;
    const [h, m] = t.split(':').map(Number);
    return h * 60 + m;
}

function minutesToTime(min) {
    const h = Math.floor(min / 60);
    const m = min % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

function dayLabel(day) {
    return ['월요일', '화요일', '수요일', '목요일', '금요일', '토요일', '일요일'][day];
}

export function PlanPageView() {
    const hourMarks = [];
    for (let m = GRID_START_MIN; m <= GRID_END_MIN; m += 60) hourMarks.push(m);

    return `
        <div class="dashboard-container">
            <button type="button" id="plan-back-btn" class="homework-back-btn">← 대시보드로 돌아가기</button>

            <div class="hero-box plan-box">
                <h2>🗓️ 주간 시간표</h2>
                <p class="plan-notice">빈 칸을 누르면 계획 추가, 블록을 누르면 수정·삭제할 수 있어요.</p>

                <div class="plan-grid-wrap">
                    <div class="plan-grid">
                        <div class="plan-grid-corner"></div>
                        ${WEEKDAY_LABELS.map(label => `<div class="plan-grid-day-header">${label}</div>`).join('')}

                        <div class="plan-grid-time-axis" style="height:${GRID_HEIGHT}px;">
                            ${hourMarks.map(m => `<span class="plan-grid-hour-label" style="top:${(m - GRID_START_MIN) / 60 * HOUR_HEIGHT}px;">${String(Math.floor(m / 60)).padStart(2, '0')}</span>`).join('')}
                        </div>
                        ${WEEKDAY_LABELS.map((_, day) => `
                            <div class="plan-grid-day-body" data-day="${day}" style="height:${GRID_HEIGHT}px;">
                                ${hourMarks.map(m => `<span class="plan-grid-hour-line" style="top:${(m - GRID_START_MIN) / 60 * HOUR_HEIGHT}px;"></span>`).join('')}
                            </div>
                        `).join('')}
                    </div>
                </div>

                <div class="plan-weekend-section">
                    ${[5, 6].map(day => `
                        <div class="plan-weekend-day">
                            <div class="plan-weekend-header">
                                <span>${day === 5 ? '토요일' : '일요일'}</span>
                                <button type="button" class="plan-weekend-add-btn" data-day="${day}">+ 추가</button>
                            </div>
                            <div class="plan-weekend-list" id="plan-weekend-list-${day}">
                                <p class="plan-empty">불러오는 중...</p>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>

            <div class="hero-box plan-box">
                <h2>📝 오늘의 기록</h2>
                <div class="plan-score-row">
                    <span class="plan-score-label">오늘 하루 점수</span>
                    <div id="plan-score-picker" class="plan-score-picker">
                        ${SCORES.map(n => `<button type="button" class="plan-score-btn" data-score="${n}">${n}</button>`).join('')}
                    </div>
                </div>
                <textarea id="plan-memo-input" class="plan-memo-input" placeholder="오늘 하루를 짧게 기록해보세요" rows="3"></textarea>
                <div class="plan-save-row">
                    <button type="button" id="plan-save-btn" class="pink-button plan-save-btn">오늘 기록 저장</button>
                    <span id="plan-save-badge" class="plan-save-badge">저장완료 ✨</span>
                </div>
            </div>

            <div class="hero-box plan-box">
                <h2>📖 지난 기록</h2>
                <div id="plan-log-list" class="plan-log-list">
                    <p class="plan-empty">불러오는 중...</p>
                </div>
            </div>
        </div>

        <div class="plan-modal-overlay" id="plan-modal-overlay">
            <div class="plan-modal-box">
                <h3 id="plan-modal-title">계획 추가</h3>
                <div class="plan-modal-day-label" id="plan-modal-day-label"></div>
                <div class="plan-modal-time-row">
                    <label class="plan-modal-time-label">시작
                        <input type="time" id="plan-modal-start">
                    </label>
                    <label class="plan-modal-time-label">종료
                        <input type="time" id="plan-modal-end">
                    </label>
                </div>
                <textarea id="plan-modal-content" class="plan-modal-content-input" placeholder="계획 내용을 입력하세요" rows="3"></textarea>
                <div class="plan-modal-actions">
                    <button type="button" id="plan-modal-delete-btn" class="plan-modal-delete-btn">삭제</button>
                    <button type="button" id="plan-modal-cancel-btn" class="plan-modal-cancel-btn">취소</button>
                    <button type="button" id="plan-modal-save-btn" class="pink-button plan-modal-save-btn">저장</button>
                </div>
            </div>
        </div>
    `;
}

export function initPlanPage(onBack) {
    document.getElementById('plan-back-btn').addEventListener('click', onBack);

    let userId = null;
    async function getUserId() {
        if (userId) return userId;
        const { data: { user } } = await supabase.auth.getUser();
        userId = user?.id || null;
        return userId;
    }

    let scheduleCache = [];

    /* ---------- 주간 시간표 로드 + 렌더 ---------- */
    async function loadSchedule() {
        const uid = await getUserId();
        if (!uid) return;

        const { data, error } = await supabase
            .from('plan_schedule')
            .select('*')
            .eq('user_id', uid);

        if (error) {
            console.error('시간표 로드 실패:', error);
            return;
        }

        scheduleCache = data || [];
        renderGridBlocks();
        renderWeekendList(5);
        renderWeekendList(6);
    }

    function renderGridBlocks() {
        document.querySelectorAll('.plan-grid-block').forEach(el => el.remove());

        scheduleCache
            .filter(item => item.day_of_week >= 0 && item.day_of_week <= 4)
            .forEach(item => {
                const col = document.querySelector(`.plan-grid-day-body[data-day="${item.day_of_week}"]`);
                if (!col) return;

                const startMin = timeToMinutes(item.start_time);
                const endMin = timeToMinutes(item.end_time);
                if (startMin === null || endMin === null) return;

                const clampedStart = Math.max(startMin, GRID_START_MIN);
                const clampedEnd = Math.min(endMin, GRID_END_MIN);
                if (clampedEnd <= clampedStart) return;

                const top = (clampedStart - GRID_START_MIN) / 60 * HOUR_HEIGHT;
                const height = Math.max((clampedEnd - clampedStart) / 60 * HOUR_HEIGHT, 18);

                const block = document.createElement('div');
                block.className = 'plan-grid-block';
                block.style.top = `${top}px`;
                block.style.height = `${height}px`;
                block.dataset.id = item.id;
                block.innerHTML = `<span class="plan-grid-block-text">${escapeHtml(item.content)}</span>`;
                block.addEventListener('click', (e) => {
                    e.stopPropagation();
                    openEditModal(item);
                });
                col.appendChild(block);
            });
    }

    function renderWeekendList(day) {
        const list = document.getElementById(`plan-weekend-list-${day}`);
        if (!list) return;

        const items = scheduleCache.filter(item => item.day_of_week === day);
        if (items.length === 0) {
            list.innerHTML = `<p class="plan-empty">아직 등록된 계획이 없어요.</p>`;
            return;
        }

        list.innerHTML = items.map(item => {
            const timeLabel = (item.start_time && item.end_time)
                ? `<span class="plan-weekend-time">${item.start_time.slice(0, 5)}~${item.end_time.slice(0, 5)}</span>`
                : '';
            return `
                <div class="plan-weekend-item" data-id="${item.id}">
                    ${timeLabel}
                    <span class="plan-weekend-content">${escapeHtml(item.content)}</span>
                </div>
            `;
        }).join('');

        list.querySelectorAll('.plan-weekend-item').forEach(row => {
            row.addEventListener('click', () => {
                const item = scheduleCache.find(i => i.id === row.dataset.id);
                if (item) openEditModal(item);
            });
        });
    }

    // 평일 그리드: 빈 칸 클릭 → 누른 위치로 시작시간을 대략 추정해서 추가 모달 오픈
    document.querySelectorAll('.plan-grid-day-body').forEach(col => {
        col.addEventListener('click', (e) => {
            if (e.target.closest('.plan-grid-block')) return; // 블록 클릭은 별도 처리(stopPropagation)
            const day = Number(col.dataset.day);
            const rect = col.getBoundingClientRect();
            const offsetY = e.clientY - rect.top;
            let startMin = GRID_START_MIN + Math.round((offsetY / HOUR_HEIGHT) * 60 / 30) * 30;
            startMin = Math.min(Math.max(startMin, GRID_START_MIN), GRID_END_MIN - 30);
            const endMin = Math.min(startMin + 60, GRID_END_MIN);
            openAddModal(day, minutesToTime(startMin), minutesToTime(endMin));
        });
    });

    // 주말: '+ 추가' 버튼
    document.querySelectorAll('.plan-weekend-add-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            openAddModal(Number(btn.dataset.day), '', '');
        });
    });

    /* ---------- 모달 (추가/수정 공용) ---------- */
    const overlay = document.getElementById('plan-modal-overlay');
    const titleEl = document.getElementById('plan-modal-title');
    const dayLabelEl = document.getElementById('plan-modal-day-label');
    const startInput = document.getElementById('plan-modal-start');
    const endInput = document.getElementById('plan-modal-end');
    const contentInput = document.getElementById('plan-modal-content');
    const deleteBtn = document.getElementById('plan-modal-delete-btn');
    const cancelBtn = document.getElementById('plan-modal-cancel-btn');
    const saveModalBtn = document.getElementById('plan-modal-save-btn');

    function openAddModal(day, startVal, endVal) {
        modalMode = 'add';
        modalDay = day;
        modalEditId = null;
        titleEl.textContent = '계획 추가';
        dayLabelEl.textContent = dayLabel(day);
        startInput.value = startVal || '';
        endInput.value = endVal || '';
        contentInput.value = '';
        deleteBtn.style.display = 'none';
        overlay.classList.add('show');
        setTimeout(() => contentInput.focus(), 0);
    }

    function openEditModal(item) {
        modalMode = 'edit';
        modalDay = item.day_of_week;
        modalEditId = item.id;
        titleEl.textContent = '계획 수정';
        dayLabelEl.textContent = dayLabel(item.day_of_week);
        startInput.value = item.start_time ? item.start_time.slice(0, 5) : '';
        endInput.value = item.end_time ? item.end_time.slice(0, 5) : '';
        contentInput.value = item.content;
        deleteBtn.style.display = '';
        overlay.classList.add('show');
    }

    function closeModal() {
        overlay.classList.remove('show');
    }

    cancelBtn.addEventListener('click', closeModal);
    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) closeModal(); // 바깥(어두운 영역) 클릭 시 닫기
    });

    saveModalBtn.addEventListener('click', async () => {
        const content = contentInput.value.trim();
        if (!content) {
            alert('계획 내용을 입력해주세요!');
            return;
        }

        const isWeekday = modalDay >= 0 && modalDay <= 4;
        const start = startInput.value;
        const end = endInput.value;

        if (isWeekday && (!start || !end)) {
            alert('평일 시간표는 시작·종료 시간이 모두 필요해요!');
            return;
        }
        if (start && end && end <= start) {
            alert('종료 시간은 시작 시간보다 늦어야 해요!');
            return;
        }

        const uid = await getUserId();
        if (!uid) return;

        const payload = {
            user_id: uid,
            day_of_week: modalDay,
            start_time: start || null,
            end_time: end || null,
            content,
        };

        const { error } = modalMode === 'edit'
            ? await supabase.from('plan_schedule').update(payload).eq('id', modalEditId)
            : await supabase.from('plan_schedule').insert(payload);

        if (error) {
            console.error('시간표 저장 실패:', error);
            alert('저장하는 중 문제가 생겼어요.');
            return;
        }

        closeModal();
        loadSchedule();
    });

    deleteBtn.addEventListener('click', async () => {
        if (!modalEditId) return;
        if (!confirm('이 계획을 삭제할까요?')) return;

        const { error } = await supabase.from('plan_schedule').delete().eq('id', modalEditId);
        if (error) {
            console.error('삭제 실패:', error);
            alert('삭제 중 문제가 생겼어요.');
            return;
        }

        closeModal();
        loadSchedule();
    });

    /* ---------- 오늘의 기록(점수+메모) ---------- */
    const scorePicker = document.getElementById('plan-score-picker');
    const memoInput = document.getElementById('plan-memo-input');
    const saveBtn = document.getElementById('plan-save-btn');
    const saveBadge = document.getElementById('plan-save-badge');

    scorePicker.addEventListener('click', (e) => {
        const btn = e.target.closest('.plan-score-btn');
        if (!btn) return;

        selectedScore = Number(btn.dataset.score);
        scorePicker.querySelectorAll('.plan-score-btn').forEach(b => {
            b.classList.toggle('selected', b === btn);
        });
    });

    async function loadTodayLog() {
        const uid = await getUserId();
        if (!uid) return;

        const { data, error } = await supabase
            .from('plan_logs')
            .select('*')
            .eq('user_id', uid)
            .eq('log_date', todayStr())
            .maybeSingle();

        if (error) {
            console.error('오늘 기록 로드 실패:', error);
            return;
        }

        if (data) {
            selectedScore = data.score;
            memoInput.value = data.memo || '';
            scorePicker.querySelectorAll('.plan-score-btn').forEach(b => {
                b.classList.toggle('selected', Number(b.dataset.score) === data.score);
            });
        }
    }

    saveBtn.addEventListener('click', async () => {
        if (!selectedScore) {
            alert('오늘 하루 점수를 먼저 선택해주세요!');
            return;
        }

        const uid = await getUserId();
        if (!uid) return;

        saveBtn.disabled = true;
        const { error } = await supabase
            .from('plan_logs')
            .upsert(
                {
                    user_id: uid,
                    log_date: todayStr(),
                    score: selectedScore,
                    memo: memoInput.value.trim(),
                    updated_at: new Date().toISOString(),
                },
                { onConflict: 'user_id,log_date' }
            );
        saveBtn.disabled = false;

        if (error) {
            console.error('기록 저장 실패:', error);
            alert('기록을 저장하는 중 문제가 생겼어요.');
            return;
        }

        if (saveBadge) {
            saveBadge.classList.add('show');
            setTimeout(() => saveBadge.classList.remove('show'), 1200);
        }

        loadLogs();
    });

    /* ---------- 지난 기록 (접힘 한 줄 ↔ 클릭 시 펼침) ---------- */
    async function loadLogs() {
        const uid = await getUserId();
        const list = document.getElementById('plan-log-list');
        if (!uid || !list) return;

        const { data, error } = await supabase
            .from('plan_logs')
            .select('*')
            .eq('user_id', uid)
            .order('log_date', { ascending: false });

        if (error) {
            console.error('지난 기록 로드 실패:', error);
            list.innerHTML = `<p class="plan-empty">불러오지 못했어요.</p>`;
            return;
        }

        if (!data || data.length === 0) {
            list.innerHTML = `<p class="plan-empty">아직 기록이 없어요.</p>`;
            return;
        }

        list.innerHTML = data.map(log => {
            const open = expandedLogIds.has(log.id);
            const memoText = log.memo && log.memo.trim() ? escapeHtml(log.memo) : '(작성된 기록이 없어요)';
            return `
                <div class="plan-log-item ${open ? 'plan-log-expanded' : ''}">
                    <div class="plan-log-row" data-id="${log.id}">
                        <span class="plan-log-date">${log.log_date}</span>
                        <span class="plan-log-score">⭐ ${log.score}점</span>
                        <span class="plan-log-caret" aria-hidden="true">▾</span>
                    </div>
                    <div class="plan-log-detail">
                        <p class="plan-log-memo">${memoText}</p>
                    </div>
                </div>
            `;
        }).join('');

        list.querySelectorAll('.plan-log-row').forEach(row => {
            row.addEventListener('click', () => {
                const id = row.dataset.id;
                if (expandedLogIds.has(id)) {
                    expandedLogIds.delete(id);
                } else {
                    expandedLogIds.add(id);
                }
                row.closest('.plan-log-item').classList.toggle('plan-log-expanded');
            });
        });
    }

    loadSchedule();
    loadTodayLog();
    loadLogs();
}