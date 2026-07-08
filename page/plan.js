import { supabase } from '../supabaseClient.js';

const SCORES = [1, 2, 3, 4, 5];

// ✅ 펼쳐둔 지난 기록 id를 기억 (다시 그려져도 접히지 않도록)
let expandedLogIds = new Set();
let selectedScore = null;

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

export function PlanPageView() {
    return `
        <div class="dashboard-container">
            <button type="button" id="plan-back-btn" class="homework-back-btn">← 대시보드로 돌아가기</button>

            <div class="hero-box plan-box">
                <h2>📌 고정 계획</h2>
                <p class="plan-notice">항상 지키고 싶은 계획을 등록해두세요.</p>
                <form id="plan-item-form" class="plan-item-form">
                    <input type="text" id="plan-item-input" placeholder="예: 매일 영단어 20개 외우기" required>
                    <button type="submit" class="pink-button plan-item-add-btn">추가</button>
                </form>
                <div id="plan-item-list" class="plan-item-list">
                    <p class="plan-empty">불러오는 중...</p>
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
    `;
}

export function initPlanPage(onBack) {
    document.getElementById('plan-back-btn').addEventListener('click', onBack);

    const itemForm = document.getElementById('plan-item-form');
    const itemInput = document.getElementById('plan-item-input');
    const scorePicker = document.getElementById('plan-score-picker');
    const memoInput = document.getElementById('plan-memo-input');
    const saveBtn = document.getElementById('plan-save-btn');
    const saveBadge = document.getElementById('plan-save-badge');

    // 매번 다시 불러오지 않도록 세션 동안만 캐시
    let userId = null;
    async function getUserId() {
        if (userId) return userId;
        const { data: { user } } = await supabase.auth.getUser();
        userId = user?.id || null;
        return userId;
    }

    /* ---------- 고정 계획 ---------- */
    async function loadItems() {
        const uid = await getUserId();
        const list = document.getElementById('plan-item-list');
        if (!uid || !list) return;

        const { data, error } = await supabase
            .from('plan_items')
            .select('*')
            .eq('user_id', uid)
            .order('created_at', { ascending: true });

        if (error) {
            console.error('고정 계획 로드 실패:', error);
            list.innerHTML = `<p class="plan-empty">불러오지 못했어요.</p>`;
            return;
        }

        if (!data || data.length === 0) {
            list.innerHTML = `<p class="plan-empty">아직 등록된 계획이 없어요.</p>`;
            return;
        }

        list.innerHTML = data.map(item => `
            <div class="plan-item-row">
                <span class="plan-item-content">${escapeHtml(item.content)}</span>
                <button type="button" class="plan-item-delete-btn" data-id="${item.id}">삭제</button>
            </div>
        `).join('');

        list.querySelectorAll('.plan-item-delete-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const id = e.target.dataset.id;
                if (!confirm('이 계획을 삭제할까요?')) return;

                const { error } = await supabase.from('plan_items').delete().eq('id', id);
                if (error) {
                    console.error('계획 삭제 실패:', error);
                    alert('삭제 중 문제가 생겼어요.');
                    return;
                }
                loadItems();
            });
        });
    }

    itemForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const content = itemInput.value.trim();
        if (!content) return;

        const uid = await getUserId();
        if (!uid) return;

        const { error } = await supabase
            .from('plan_items')
            .insert({ user_id: uid, content });

        if (error) {
            console.error('계획 추가 실패:', error);
            alert('계획을 추가하는 중 문제가 생겼어요.');
            return;
        }

        itemInput.value = '';
        loadItems();
    });

    /* ---------- 오늘의 기록(점수+메모) ---------- */
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
                { onConflict: 'user_id,log_date' } // ✅ 하루에 한 개만 (같은 날 다시 저장하면 덮어씀)
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

        loadLogs(); // 지난 기록 목록에도 오늘 기록이 바로 반영되도록
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

    loadItems();
    loadTodayLog();
    loadLogs();
}