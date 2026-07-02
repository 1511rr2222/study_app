import { HomeworkSummaryView } from './homework.js';

export function DashboardView() {
    return `
        <div class="dashboard-container">
            ${HomeworkSummaryView()}

            <div class="list-box" id="open-competency-btn">학습 역량 확인</div>
            <div class="list-box">영단어 퀴즈 페이지</div>
            <div class="list-box">성적 기록 페이지</div>
        </div>
    `;
}

export function initDashboardEvents() {
    const attendBtn = document.getElementById('attendance-btn');
    const attendText = document.getElementById('attendance-text');

    attendBtn.addEventListener('click', () => {
    attendBtn.disabled = true; // 버튼 비활성화
        attendBtn.innerText = "출석 완료!";
        attendText.innerText = "멋져요! 오늘도 화이팅!";
        document.getElementById('attendance-box').classList.add('checked');
    });        
    }
