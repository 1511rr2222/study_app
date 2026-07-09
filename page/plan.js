import { getUserId } from './planState.js';
import { ScheduleGridHtml, WeekendSectionHtml, initSchedule } from './planSchedule.js';
import { ModalHtml, initModal } from './planModal.js';
import { DailyLogHtml, initDailyLog } from './planDaily.js';

export function PlanPageView() {
    return `
        <div class="dashboard-container">
            <button type="button" id="plan-back-btn" class="homework-back-btn">← 대시보드로 돌아가기</button>

            <div class="hero-box plan-box">
                <h2>🗓️ 주간 시간표</h2>
                <p class="plan-notice">빈 칸을 누르면 계획 추가, 블록을 누르면 수정·삭제할 수 있어요.</p>
                ${ScheduleGridHtml()}
                ${WeekendSectionHtml()}
            </div>

            ${DailyLogHtml()}
        </div>

        ${ModalHtml()}
    `;
}

export function initPlanPage(onBack) {
    document.getElementById('plan-back-btn').addEventListener('click', onBack);

    // 모달 먼저 초기화 → schedule.js가 openAddModal/openEditModal을 넘겨받아 씀
    const modal = initModal(getUserId, () => schedule.loadSchedule());
    const schedule = initSchedule(getUserId, modal);

    initDailyLog(getUserId);

    schedule.loadSchedule();
}