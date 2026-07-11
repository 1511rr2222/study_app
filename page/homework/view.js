import { loadData, insertItem } from './data.js';
import { renderItem, renderDateGroupsHtml } from './render.js';
import { attachCheckboxEvents, attachPhotoEvents, attachItemActionEvents, attachItemExpandEvents, attachDateGroupEvents } from './events.js';
import { setEditingId } from './editState.js';
import { clearExpanded } from './expandState.js';
import { clearDateGroups } from './dateGroupState.js';
import { todayStr, sortForDisplay, getWeeklyAverageRate } from './utils.js';

/* ---------------- 대시보드 요약 카드 ---------------- */

export function HomeworkSummaryView() {
    // 대시보드 안에서는 .card-homework가 이미 카드 테두리 역할을 하므로
    // 여기서는 테두리 없는 가벼운 래퍼(.homework-summary-box)만 사용해서 이중 테두리를 방지
    return `
        <div class="homework-summary-box">
            <div class="homework-header-row">
                <h2>숙제 체크</h2>
                <div class="homework-rate-inline">
                    <span class="homework-rate-label">달성률</span>
                    <span class="homework-rate" id="homework-summary-rate">0%</span>
                </div>
            </div>
            <div id="homework-summary"></div>
        </div>
    `;
}

export function initHomeworkSummary(onOpenFull) {
    renderSummary(onOpenFull);
}

async function renderSummary(onOpenFull) {
    const container = document.getElementById('homework-summary');
    if (!container) return;

    container.innerHTML = `<p class="homework-empty">불러오는 중...</p>`;

    const data = await loadData();
    const total = data.length;
    const doneCount = data.filter(item => item.done).length;
    const rate = total === 0 ? 0 : Math.round((doneCount / total) * 100);
    const rateEl = document.getElementById('homework-summary-rate');
    if (rateEl) rateEl.textContent = `${rate}%`;

    const incomplete = sortForDisplay(data.filter(item => !item.done));
    const listHtml = incomplete.length === 0
        ? `<p class="homework-empty">미완료된 숙제가 없어요! 🎉</p>`
        : incomplete.map(item => renderItem(item, { showPhotos: false, dateFormat: 'dday' })).join('');

    container.innerHTML = `
        <div class="homework-list">
            ${listHtml}
        </div>

        <button type="button" id="homework-open-btn" class="homework-open-btn">
            완료 인증 및 숙제 추가 →
        </button>
    `;

    attachCheckboxEvents(container, () => renderSummary(onOpenFull));
    attachPhotoEvents(container, () => renderSummary(onOpenFull));

    document.getElementById('homework-open-btn').addEventListener('click', () => {
        onOpenFull();
    });
}

/* ---------------- 숙제 체크 전체 페이지 ---------------- */

export function HomeworkPageView() {
    return `
        <div class="dashboard-container">
            <button type="button" id="homework-back-btn" class="homework-back-btn">← 대시보드로 돌아가기</button>
            <div class="hero-box">
                <div class="homework-header-row">
                    <h2>숙제 체크</h2>
                    <div class="homework-rate-inline">
                        <span class="homework-rate-label">평균 달성률</span>
                        <span class="homework-rate" id="homework-weekly-rate">0%</span>
                    </div>
                </div>
                <p class="homework-notice">*인증사진을 1장 이상 올려야 완료 체크가 가능해요</p>
                <div id="homework-page"></div>
            </div>
        </div>
    `;
}

// onBack: 대시보드로 돌아갈 때 실행할 콜백
export function initHomeworkPage(onBack) {
    setEditingId(null);
    clearExpanded();    // ✅ 전체 페이지에 새로 들어올 때는 항목 펼침 상태 모두 초기화
    clearDateGroups();  // ✅ 날짜 그룹 펼침 상태도 모두 초기화 (전부 접힌 채로 시작)
    renderPage(onBack);
    document.getElementById('homework-back-btn').addEventListener('click', onBack);
}

async function renderPage(onBack) {
    const container = document.getElementById('homework-page');
    if (!container) return;

    container.innerHTML = `<p class="homework-empty">불러오는 중...</p>`;

    const data = await loadData();
    const weeklyRate = getWeeklyAverageRate(data);
    const weeklyRateEl = document.getElementById('homework-weekly-rate');
    if (weeklyRateEl) weeklyRateEl.textContent = `${weeklyRate}%`;

    const sorted = sortForDisplay(data);
    // ✅ 날짜별로 묶어서 접힘/펼침 가능한 그룹 형태로 렌더링 (그룹 헤더에 그 날짜의 달성률도 같이 표시됨)
    const groupsHtml = renderDateGroupsHtml(sorted);

    container.innerHTML = `
        <form id="homework-add-form" class="homework-add-form">
            <input type="text" id="homework-input" placeholder="숙제 내용을 입력하세요" required>
            <label class="homework-single-day-toggle">
                <input type="checkbox" id="homework-single-day-toggle">
                당일 계획
            </label>
            <div class="homework-form-row">
                <label class="homework-form-label">
                    <span id="homework-lesson-date-label">시작일</span>
                    <input type="date" id="homework-lesson-date" value="${todayStr()}" required>
                </label>
                <label class="homework-form-label" id="homework-due-date-field">
                    <span>마감일</span>
                    <input type="date" id="homework-due-date" required>
                </label>
                <button type="submit" class="pink-button homework-add-btn">추가</button>
            </div>
        </form>

        <div class="homework-date-groups">
            ${groupsHtml}
        </div>
    `;

    const form = document.getElementById('homework-add-form');
    const singleDayToggle = document.getElementById('homework-single-day-toggle');
    const lessonDateInput = document.getElementById('homework-lesson-date');
    const dueDateInput = document.getElementById('homework-due-date');
    const dueDateField = document.getElementById('homework-due-date-field');
    const lessonDateLabel = document.getElementById('homework-lesson-date-label');

    function applySingleDayMode() {
        const isSingle = singleDayToggle.checked;
        dueDateField.style.display = isSingle ? 'none' : '';
        dueDateInput.required = !isSingle;
        lessonDateLabel.textContent = isSingle ? '날짜' : '시작일';
        if (isSingle) dueDateInput.value = lessonDateInput.value;
    }

    singleDayToggle.addEventListener('change', applySingleDayMode);
    lessonDateInput.addEventListener('change', () => {
        if (singleDayToggle.checked) dueDateInput.value = lessonDateInput.value;
    });

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const contentInput = document.getElementById('homework-input');

        const content = contentInput.value.trim();
        const dueDateValue = singleDayToggle.checked ? lessonDateInput.value : dueDateInput.value;
        if (!content || !lessonDateInput.value || !dueDateValue) return;

        if (dueDateValue < lessonDateInput.value) {
            alert('마감일은 시작일보다 빠를 수 없어요. 날짜를 다시 확인해주세요!');
            return;
        }

        await insertItem({ lessonDate: lessonDateInput.value, dueDate: dueDateValue, content });
        renderPage(onBack); // 등록 후 새로고침
    });

    attachCheckboxEvents(container, () => renderPage(onBack));
    attachPhotoEvents(container, () => renderPage(onBack));
    attachItemActionEvents(container, () => renderPage(onBack));
    attachItemExpandEvents(container); // ✅ 항목 행 클릭 시 펼침/접힘 토글
    attachDateGroupEvents(container);  // ✅ 날짜 그룹 헤더 클릭 시 펼침/접힘 토글
}