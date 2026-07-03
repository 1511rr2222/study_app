import { HomeworkSummaryView } from './homework.js';

const FAIRY_REASON_KEY = 'yerin_fairy_reason';

export function DashboardView() {
    return `
        <div class="dashboard-container">
            <div class="dashboard-card">
                <div class="fairy-question-box">
                    <img src="fairy.png" alt="공부 요정" class="fairy-question-img">
                    <div class="fairy-question-content">
                        <label for="fairy-answer-input" class="fairy-question-text">공부를 통해 무엇을 이루고 싶나요?</label>
                        <div class="fairy-input-row">
                            <input type="text" id="fairy-answer-input" class="fairy-answer-input" placeholder="자유롭게 적어보세요!">
                            <span id="fairy-save-badge" class="fairy-save-badge">저장완료 ✨</span>
                        </div>
                    </div>
                </div>

                <div class="top-section">
                    <div class="card-attendance">
                        <div class="card-header-row">
                            <h3 id="calendar-title">📅 0월 출석 현황</h3>
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

                <div class="bottom-section">
                    <div class="list-box list-competency" id="open-competency-btn">
                        <span class="list-box-emoji">🧠</span>
                        <span class="list-box-label">학습 역량 확인</span>
                    </div>
                    <div class="list-box list-vocab">
                        <span class="list-box-emoji">🔤</span>
                        <span class="list-box-label">영단어 퀴즈</span>
                    </div>
                    <div class="list-box list-grades">
                        <span class="list-box-emoji">📊</span>
                        <span class="list-box-label">성적 기록</span>
                    </div>
                </div>
            </div>
        </div>
    `;
}

export function initDashboardEvents() {
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
    const month = now.getMonth();
    const today = now.getDate();
    const storageKey = `attendance_${year}_${month}`;

    if (title) title.innerText = `📅 ${month + 1}월 출석 현황`;

    const daysInMonth = new Date(year, month + 1, 0).getDate();

    if (grid) grid.innerHTML = '';

    for (let i = 1; i <= daysInMonth; i++) {
        const day = document.createElement('div');
        day.className = 'day';
        if (i === today) day.classList.add('today');
        day.innerText = i;
        grid.appendChild(day);
    }

    if (attendBtn) {
        attendBtn.addEventListener('click', () => {
            const todayEl = document.querySelector(`.day:nth-child(${today})`);
            if (todayEl) {
                todayEl.classList.add('checked');
                saveAttendance();
                updateRate();
            }
        });
    }

    function saveAttendance() {
        const checkedDays = Array.from(document.querySelectorAll('.day.checked'))
                                 .map(d => d.innerText);
        localStorage.setItem(storageKey, JSON.stringify(checkedDays));
    }

    function loadAttendance() {
        const saved = JSON.parse(localStorage.getItem(storageKey) || '[]');
        saved.forEach(dayNum => {
            const dayEl = document.querySelector(`.day:nth-child(${dayNum})`);
            if (dayEl) dayEl.classList.add('checked');
        });
    }

    // 오늘 기준 역방향으로 연속 출석일을 센다 (스트릭)
    function calcStreak() {
        const checkedSet = new Set(
            Array.from(document.querySelectorAll('.day.checked')).map(d => Number(d.innerText))
        );
        let streak = 0;
        let day = today;
        while (checkedSet.has(day)) {
            streak += 1;
            day -= 1;
        }
        return streak;
    }

    function updateRate() {
        const checkedCount = document.querySelectorAll('.day.checked').length;
        const rate = Math.round((checkedCount / daysInMonth) * 100);
        if (rateText) rateText.innerText = `출석률 ${rate}%`;
        if (rateFill) rateFill.style.width = `${rate}%`;

        const streak = calcStreak();
        if (streakBadge) {
            streakBadge.innerText = streak > 0 ? `🔥 ${streak}일 연속` : '오늘부터 시작해봐요!';
        }
    }

    // 요정 질문 답변: 페이지를 이동해도 유지되도록 localStorage에서 불러오고, 입력할 때마다 저장 + 저장 뱃지 반응
    if (fairyInput) {
        fairyInput.value = localStorage.getItem(FAIRY_REASON_KEY) || '';
        let saveTimer = null;
        fairyInput.addEventListener('input', () => {
            localStorage.setItem(FAIRY_REASON_KEY, fairyInput.value);
            if (fairySaveBadge) {
                fairySaveBadge.classList.add('show');
                clearTimeout(saveTimer);
                saveTimer = setTimeout(() => fairySaveBadge.classList.remove('show'), 1200);
            }
        });
    }

    loadAttendance();
    updateRate();
}