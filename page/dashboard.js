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