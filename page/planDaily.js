import { supabase } from '../supabaseClient.js';
import { SCORES, expandedLogIds, planState, todayStr, escapeHtml } from './planState.js';

export function DailyLogHtml() {
    return `
        <div class="hero-box plan-box">
            <h2>📝 오늘의 기록</h2>
            <div class="plan-score-row">
                <span class="plan-score-label">오늘 하루 점수</span>
                <div id="plan-score-picker" class="plan-score-picker">
                    ${SCORES.map(n => `<button type="button" class="plan-score-btn" data-score="${n}">${n}</button>`).join('')}
                </div>
            </div>
            <textarea id="plan-memo-input" class="plan-memo-input" placeholder="오늘 계획 실천에서 잘한점, 못한점을 짧게 기록해주세요" rows="3"></textarea>
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
    `;
}

/**
 * @param {() => Promise<string|null>} getUserId
 */
export function initDailyLog(getUserId) {
    const scorePicker = document.getElementById('plan-score-picker');
    const memoInput = document.getElementById('plan-memo-input');
    const saveBtn = document.getElementById('plan-save-btn');
    const saveBadge = document.getElementById('plan-save-badge');

    scorePicker.addEventListener('click', (e) => {
        const btn = e.target.closest('.plan-score-btn');
        if (!btn) return;

        planState.selectedScore = Number(btn.dataset.score);
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
            planState.selectedScore = data.score;
            memoInput.value = data.memo || '';
            scorePicker.querySelectorAll('.plan-score-btn').forEach(b => {
                b.classList.toggle('selected', Number(b.dataset.score) === data.score);
            });
        }
    }

    saveBtn.addEventListener('click', async () => {
        if (!planState.selectedScore) {
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
                    score: planState.selectedScore,
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

    loadTodayLog();
    loadLogs();
}