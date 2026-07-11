import { HomeworkSummaryView } from './homework.js';
import { GritSummaryView } from './practice/gritPractice.js';
import { supabase } from '../supabaseClient.js';

export function DashboardView() {
    return `
        <div class="dashboard-container">
            <div class="dashboard-card">
                <div class="fairy-question-box">
                    <img src="fairy.png" alt="공부 요정" class="fairy-question-img">
                    <div class="fairy-question-content">
                        <label for="fairy-answer-input" class="fairy-question-text">
                            <span class="fairy-question-text-full">나만의 공부 목표?</span>
                            <span class="fairy-question-text-short">나만의 공부 목표 :</span>
                        </label>
                        <div class="fairy-input-row">
                            <input type="text" id="fairy-answer-input" class="fairy-answer-input" placeholder="자유롭게 적어보세요!">
                            <span id="fairy-save-badge" class="fairy-save-badge">저장완료 ✨</span>
                        </div>
                    </div>
                </div>

                <div class="top-section">
                    <div class="card-attendance">
                        <div class="card-header-row">
                            <h3 id="calendar-title">📅 0월 출석 </h3>
                            <span id="streak-badge" class="streak-badge">🔥 0일 연속</span>
                        </div>
                        <div id="calendar-grid" class="calendar-grid"></div>
                        <button id="today-attend-btn">오늘 출석 도장 찍기 🐾</button>
                        <div class="attendance-rate-row">
                            <div class="rate-bar-track"><div id="rate-bar-fill" class="rate-bar-fill"></div></div>
                            <p id="attendance-rate">출석률 0%</p>
                        </div>
                    </div>
                    <div class="card-homework">${HomeworkSummaryView()}</div>
                </div>

                <div class="card-grit">${GritSummaryView()}</div>

                <div class="bottom-section">
                    <div class="list-box list-competency" id="open-competency-btn">
                        <span class="list-box-emoji">🧠</span>
                        <span class="list-box-label">학습 역량 확인</span>
                    </div>
                    <div class="list-box list-vocab" id="open-vocab-btn">
                        <span class="list-box-emoji">🔤</span>
                        <span class="list-box-label">영단어 퀴즈</span>
                    </div>
                    <div class="list-box list-grades" id="open-grades-btn">
                        <span class="list-box-emoji">📊</span>
                        <span class="list-box-label">성적 기록</span>
                    </div>
                </div>
            </div>
        </div>
    `;
}

export async function initDashboardEvents() {
    const grid = document.getElementById('calendar-grid');
    const rateText = document.getElementById('attendance-rate');
    const rateFill = document.getElementById('rate-bar-fill');
    const streakBadge = document.getElementById('streak-badge');
    const title = document.getElementById('calendar-title');
    const attendBtn = document.getElementById('today-attend-btn');
    const fairyInput = document.getElementById('fairy-answer-input');
    const fairySaveBadge = document.getElementById('fairy-save-badge');

    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth(); // 0~11
    const today = now.getDate();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    if (title) title.innerText = `📅 ${month + 1}월 출석`;

    // 현재 로그인된 사용자 확인
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        // 세션이 없으면(만료 등) 더 진행하지 않음 - 라우팅 쪽에서 로그인 화면으로 보내는 걸 권장
        console.warn('로그인된 사용자가 없어 대시보드 데이터를 불러올 수 없습니다.');
        return;
    }

    let checkedDays = new Set();

    // ---------- 출석 데이터 불러오기 ----------
    async function loadAttendance() {
        const { data, error } = await supabase
            .from('attendance')
            .select('day')
            .eq('user_id', user.id)
            .eq('year', year)
            .eq('month', month);

        if (error) {
            console.error('출석 데이터 로드 실패:', error);
            return;
        }
        checkedDays = new Set((data || []).map(row => row.day));
    }

    function renderCalendar() {
        if (!grid) return;
        grid.innerHTML = '';
        for (let i = 1; i <= daysInMonth; i++) {
            const day = document.createElement('div');
            day.className = 'day';
            if (i === today) day.classList.add('today');
            if (checkedDays.has(i)) day.classList.add('checked');
            day.innerText = i;
            grid.appendChild(day);
        }
    }

    function calcStreak() {
        let streak = 0;
        let day = today;
        while (checkedDays.has(day)) {
            streak += 1;
            day -= 1;
        }
        return streak;
    }

    function updateRate() {
        const checkedCount = checkedDays.size;
        const rate = Math.round((checkedCount / daysInMonth) * 100);
        if (rateText) rateText.innerText = `출석률 ${rate}%`;
        if (rateFill) rateFill.style.width = `${rate}%`;

        const streak = calcStreak();
        if (streakBadge) {
            streakBadge.innerText = streak > 0 ? `🔥 ${streak}일 연속` : '오늘부터 시작해봐요!';
        }
    }

    if (attendBtn) {
        attendBtn.addEventListener('click', async () => {
            if (checkedDays.has(today)) return; // 이미 오늘 출석함

            attendBtn.disabled = true;
            const { error } = await supabase
                .from('attendance')
                .upsert(
                    { user_id: user.id, year, month, day: today },
                    { onConflict: 'user_id,year,month,day' }
                );
            attendBtn.disabled = false;

            if (error) {
                console.error('출석 저장 실패:', error);
                alert('출석 저장 중 문제가 생겼어요. 다시 시도해주세요.');
                return;
            }

            checkedDays.add(today);
            renderCalendar();
            updateRate();
        });
    }

    // ---------- 공부 요정 답변 ----------
    async function loadFairyAnswer() {
        const { data, error } = await supabase
            .from('fairy_answers')
            .select('answer')
            .eq('user_id', user.id)
            .maybeSingle();

        if (error) {
            console.error('요정 답변 로드 실패:', error);
            return;
        }
        if (fairyInput) fairyInput.value = data?.answer || '';
    }

    if (fairyInput) {
        let saveTimer = null;
        fairyInput.addEventListener('input', () => {
            clearTimeout(saveTimer);
            saveTimer = setTimeout(async () => {
                const { error } = await supabase
                    .from('fairy_answers')
                    .upsert(
                        { user_id: user.id, answer: fairyInput.value, updated_at: new Date().toISOString() },
                        { onConflict: 'user_id' }
                    );

                if (error) {
                    console.error('요정 답변 저장 실패:', error);
                    return;
                }

                if (fairySaveBadge) {
                    fairySaveBadge.classList.add('show');
                    setTimeout(() => fairySaveBadge.classList.remove('show'), 1200);
                }
            }, 600); // 입력이 멈추고 0.6초 후 저장 (매 타이핑마다 DB 호출하지 않도록)
        });
    }

    await Promise.all([loadAttendance(), loadFairyAnswer()]);
    renderCalendar();
    updateRate();
}