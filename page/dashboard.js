import { HomeworkSummaryView } from './homework.js';

export function DashboardView() {
    return `
        <div class="dashboard-container">
            <!-- 출석 달력 구역 -->
            <div id="attendance-calendar" class="attendance-calendar">
                <h3>📅 7월 출석 현황</h3>
                <div id="calendar-grid" class="calendar-grid"></div>
                <p id="attendance-rate">출석률: 0%</p>
            </div>

        ${HomeworkSummaryView()}

            <div class="list-box" id="open-competency-btn">학습 역량 확인</div>
            <div class="list-box">영단어 퀴즈 페이지</div>
            <div class="list-box">성적 기록 페이지</div>
        </div>
    `;
}

export function initDashboardEvents() {
    const grid = document.getElementById('calendar-grid');
    const rateText = document.getElementById('attendance-rate');
    if (grid) grid.innerHTML = '';

    const daysInMonth = 31; // 7월은 31일까지
    for (let i = 1; i <= daysInMonth; i++) {
        const day = document.createElement('div');
        day.className = 'day';
        day.innerText = i;
        day.addEventListener('click', () => {
            day.classList.toggle('checked');
            const checkedDays = Array.from(document.querySelectorAll('.day.checked'))
                             .map(d => d.innerText);
    
            localStorage.setItem('myAttendance', JSON.stringify(checkedDays));
            updateRate();
        });
        grid.appendChild(day);
    }
    
    function loadAttendance() {
        const saved = JSON.parse(localStorage.getItem('myAttendance') || '[]');
        saved.forEach(dayNum => {
            const dayEl = document.querySelector(`.day:nth-child(${dayNum})`);
            if (dayEl) dayEl.classList.add('checked');
    });
}
    function updateRate() {
        const checkedCount = document.querySelectorAll('.day.checked').length;
        const rate = Math.round((checkedCount / daysInMonth) * 100);
        rateText.innerText = `출석률: ${rate}%`;
    }

loadAttendance();
updateRate();
}
