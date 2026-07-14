import { loadData, insertItem, getUser, countReviewers } from './data.js';
import { renderItem, renderDateGroupsHtml } from './render.js';
import { attachCheckboxEvents, attachPhotoEvents, attachItemActionEvents, attachItemExpandEvents, attachDateGroupEvents } from './events.js';
import { setEditingId } from './editState.js';
import { clearExpanded } from './expandState.js';
import { clearDateGroups } from './dateGroupState.js';
import { todayStr, sortForDisplay, getWeeklyAverageRate, isExcludedFromRate } from './utils.js';

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
    const countedItems = data.filter(item => !isExcludedFromRate(item));
    const total = countedItems.length;
    const doneCount = countedItems.filter(item => item.done).length;
    const rate = total === 0 ? 0 : Math.round((doneCount / total) * 100);
    const rateEl = document.getElementById('homework-summary-rate');
    if (rateEl) rateEl.textContent = `${rate}%`;

    const incomplete = sortForDisplay(data.filter(item => !item.done && !item.abandoned));
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
                <p class="homework-notice" id="homework-notice">*인증사진을 1장 이상 올려야 완료 체크가 가능해요</p>
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

    // ✅ 나를 검사해주는 친구가 1명이라도 있으면, 본인 셀프체크를 막고 친구 인증만 받도록 함
    const user = await getUser();
    const reviewerCount = user ? await countReviewers(user.id) : 0;
    const selfLocked = reviewerCount > 0;

    const noticeEl = document.getElementById('homework-notice');
    if (noticeEl) {
        noticeEl.textContent = selfLocked
            ? '*인증사진을 올리면, 연결된 친구가 확인 후 완료 처리해줘요'
            : '*인증사진을 1장 이상 올려야 완료 체크가 가능해요';
    }

    // ✅ 날짜별로 묶어서 접힘/펼침 가능한 그룹 형태로 렌더링 (그룹 헤더에 그 날짜의 달성률도 같이 표시됨)
    const groupsHtml = renderDateGroupsHtml(sorted, { selfLocked });

    container.innerHTML = `
        <form id="homework-add-form" class="homework-add-form">
            <input type="text" id="homework-input" placeholder="숙제 내용을 입력하세요" required>
            <div class="homework-form-row">
                <label class="homework-form-label">
                    <span>기한</span>
                    <input type="date" id="homework-due-date" value="${todayStr()}" min="${todayStr()}" required>
                </label>
                <button type="submit" class="pink-button homework-add-btn">추가</button>
            </div>
        </form>

        <div class="homework-date-groups">
            ${groupsHtml}
        </div>
    `;

    const form = document.getElementById('homework-add-form');
    const dueDateInput = document.getElementById('homework-due-date');

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const contentInput = document.getElementById('homework-input');

        const content = contentInput.value.trim();
        const dueDateValue = dueDateInput.value;
        if (!content || !dueDateValue) return;

        // ✅ 시작일 개념을 없애서, DB 스키마는 안 건드리고 lessonDate/dueDate를 같은 값으로 저장
        await insertItem({ lessonDate: dueDateValue, dueDate: dueDateValue, content });
        renderPage(onBack); // 등록 후 새로고침
    });

    attachCheckboxEvents(container, () => renderPage(onBack));
    attachPhotoEvents(container, () => renderPage(onBack));
    attachItemActionEvents(container, () => renderPage(onBack));
    attachItemExpandEvents(container); // ✅ 항목 행 클릭 시 펼침/접힘 토글
    attachDateGroupEvents(container);  // ✅ 날짜 그룹 헤더 클릭 시 펼침/접힘 토글
}