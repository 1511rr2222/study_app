const STORAGE_KEY = 'yerin_homework_data';

function loadData() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        return raw ? JSON.parse(raw) : [];
    } catch (e) {
        return [];
    }
}

function saveData(data) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

function todayStr() {
    return new Date().toISOString().slice(0, 10);
}

// 마감일이 지났는데 아직 체크 안 된 경우 = 기한 초과 (미완료로 집계)
function isOverdue(item) {
    return !item.done && item.dueDate && item.dueDate < todayStr();
}

function getStatus(item) {
    if (item.done) return 'done';
    if (isOverdue(item)) return 'overdue';
    return 'pending';
}

// 대략적인 ISO 주차 계산 (연도-주차 형태의 키를 만들기 위한 용도)
function getWeekKey(dateStr) {
    const date = new Date(dateStr + 'T00:00:00');
    const day = (date.getDay() + 6) % 7; // 월요일을 0으로
    const monday = new Date(date);
    monday.setDate(date.getDate() - day);
    const startOfYear = new Date(monday.getFullYear(), 0, 1);
    const weekNum = Math.ceil(((monday - startOfYear) / 86400000 + startOfYear.getDay() + 1) / 7);
    return `${monday.getFullYear()}-W${weekNum}`;
}

function getWeeklyAverageRate(data) {
    const withDueDate = data.filter(item => item.dueDate);
    if (withDueDate.length === 0) return 0;

    const weeks = {};
    withDueDate.forEach(item => {
        const key = getWeekKey(item.dueDate);
        if (!weeks[key]) weeks[key] = { total: 0, done: 0 };
        weeks[key].total += 1;
        if (item.done) weeks[key].done += 1;
    });

    const weekKeys = Object.keys(weeks);
    const rateSum = weekKeys.reduce((sum, key) => {
        return sum + (weeks[key].done / weeks[key].total);
    }, 0);

    return Math.round((rateSum / weekKeys.length) * 100);
}

function statusLabel(status) {
    if (status === 'done') return '완료';
    if (status === 'overdue') return '기한 초과';
    return '미완료';
}

// 🆕 기한초과 → 미완료(마감 임박순) → 완료 순으로 정렬
function sortForDisplay(data) {
    const statusOrder = { overdue: 0, pending: 1, done: 2 };
    return data.slice().sort((a, b) => {
        const statusDiff = statusOrder[getStatus(a)] - statusOrder[getStatus(b)];
        if (statusDiff !== 0) return statusDiff;
        return (a.dueDate || '').localeCompare(b.dueDate || ''); // 같은 상태면 마감일 빠른 순
    });
}

let editingId = null;

function renderItem(item, options = {}) {
    const { editable = false } = options;
    const status = getStatus(item);

    if (editable && editingId === item.id) {
        return `
            <div class="homework-item editing">
                <form class="homework-edit-form" data-id="${item.id}">
                    <div class="homework-form-row">
                        <label class="homework-form-label">
                            수업일
                            <input type="date" name="lessonDate" value="${item.lessonDate || ''}" required>
                        </label>
                        <label class="homework-form-label">
                            마감일(숙제 기간)
                            <input type="date" name="dueDate" value="${item.dueDate || ''}" required>
                        </label>
                    </div>
                    <input type="text" name="content" value="${escapeHtml(item.content)}" required>
                    <div class="homework-edit-actions">
                        <button type="submit" class="pink-button homework-save-btn">저장</button>
                        <button type="button" class="homework-cancel-btn" data-id="${item.id}">취소</button>
                    </div>
                </form>
            </div>
        `;
    }

    return `
        <div class="homework-item ${status}">
            <label>
                <input type="checkbox" data-id="${item.id}" ${item.done ? 'checked' : ''}>
                <span class="homework-dates">
                    <span class="homework-date">수업일 ${item.lessonDate || '-'}</span>
                    <span class="homework-date">마감일 ${item.dueDate || '-'}</span>
                </span>
                <span class="homework-content">${escapeHtml(item.content)}</span>
                <span class="homework-status-tag ${status}">${statusLabel(status)}</span>
            </label>
            ${editable ? `
                <div class="homework-item-actions">
                    <button type="button" class="homework-edit-btn" data-id="${item.id}">수정</button>
                    <button type="button" class="homework-delete-btn" data-id="${item.id}">삭제</button>
                </div>
            ` : ''}
        </div>
    `;
}

function attachCheckboxEvents(container, onChange) {
    container.querySelectorAll('input[type="checkbox"]').forEach(checkbox => {
        checkbox.addEventListener('change', (e) => {
            const id = e.target.dataset.id;
            const newData = loadData().map(item =>
                item.id === id ? { ...item, done: e.target.checked } : item
            );
            saveData(newData);
            onChange();
        });
    });
}

function attachItemActionEvents(container, onChange) {
    container.querySelectorAll('.homework-edit-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            editingId = e.target.dataset.id;
            onChange();
        });
    });

    container.querySelectorAll('.homework-cancel-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            editingId = null;
            onChange();
        });
    });

    container.querySelectorAll('.homework-delete-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const id = e.target.dataset.id;
            if (!confirm('이 숙제를 삭제할까요?')) return;
            const newData = loadData().filter(item => item.id !== id);
            saveData(newData);
            onChange();
        });
    });

    container.querySelectorAll('.homework-edit-form').forEach(form => {
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            const id = form.dataset.id;
            const lessonDate = form.lessonDate.value;
            const dueDate = form.dueDate.value;
            const content = form.content.value.trim();
            if (!content || !lessonDate || !dueDate) return;

            // 🆕 마감일이 수업일보다 빠르면 안내
            if (dueDate < lessonDate) {
                alert('마감일은 수업일보다 빠를 수 없어요. 날짜를 다시 확인해주세요!');
                return;
            }

            const newData = loadData().map(item =>
                item.id === id ? { ...item, lessonDate, dueDate, content } : item
            );
            saveData(newData);
            editingId = null;
            onChange();
        });
    });
}

/* ---------------- 대시보드 요약 카드 ---------------- */

export function HomeworkSummaryView() {
    return `
        <div class="hero-box">
            <h2>오늘의 숙제 체크</h2>
            <div id="homework-summary"></div>
        </div>
    `;
}

// onOpenFull: "숙제 체크 페이지"로 이동할 때 실행할 콜백
export function initHomeworkSummary(onOpenFull) {
    renderSummary(onOpenFull);
}

function renderSummary(onOpenFull) {
    const container = document.getElementById('homework-summary');
    if (!container) return;

    const data = loadData();
    const total = data.length;
    const doneCount = data.filter(item => item.done).length;
    const rate = total === 0 ? 0 : Math.round((doneCount / total) * 100);

    const incomplete = sortForDisplay(data.filter(item => !item.done));

    const listHtml = incomplete.length === 0
        ? `<p class="homework-empty">미완료된 숙제가 없어요! 🎉</p>`
        : incomplete.map(item => renderItem(item)).join('');

    container.innerHTML = `
        <div class="homework-stats">
            <span>전체 달성률</span>
            <span class="homework-rate">${rate}%</span>
        </div>

        <div class="homework-list">
            ${listHtml}
        </div>

        <button type="button" id="homework-open-btn" class="homework-open-btn">
            숙제 확인하고 추가하기 →
        </button>
    `;

    attachCheckboxEvents(container, () => renderSummary(onOpenFull));

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
                <h2>숙제 체크</h2>
                <div id="homework-page"></div>
            </div>
        </div>
    `;
}

// onBack: 대시보드로 돌아갈 때 실행할 콜백
export function initHomeworkPage(onBack) {
    editingId = null;
    renderPage(onBack);
    document.getElementById('homework-back-btn').addEventListener('click', onBack);
}

function renderPage(onBack) {
    const container = document.getElementById('homework-page');
    if (!container) return;

    const data = loadData();
    const weeklyRate = getWeeklyAverageRate(data);

    const sorted = sortForDisplay(data);
    const listHtml = sorted.length === 0
        ? `<p class="homework-empty">아직 등록된 숙제가 없어요.</p>`
        : sorted.map(item => renderItem(item, { editable: true })).join('');

    container.innerHTML = `
        <div class="homework-stats">
            <span>주간 평균 달성률</span>
            <span class="homework-rate">${weeklyRate}%</span>
        </div>

        <form id="homework-add-form" class="homework-add-form">
            <input type="text" id="homework-input" placeholder="숙제 내용을 입력하세요" required>
            <div class="homework-form-row">
                <label class="homework-form-label">
                    수업일
                    <input type="date" id="homework-lesson-date" value="${todayStr()}" required>
                </label>
                <label class="homework-form-label">
                    마감일
                    <input type="date" id="homework-due-date" required>
                </label>
            </div>
            <button type="submit" class="pink-button">추가</button>
        </form>

        <div class="homework-list">
            ${listHtml}
        </div>
    `;

    const form = document.getElementById('homework-add-form');
    form.addEventListener('submit', (e) => {
        e.preventDefault();
        const contentInput = document.getElementById('homework-input');
        const lessonDateInput = document.getElementById('homework-lesson-date');
        const dueDateInput = document.getElementById('homework-due-date');

        const content = contentInput.value.trim();
        if (!content || !lessonDateInput.value || !dueDateInput.value) return;

        // 🆕 마감일이 수업일보다 빠르면 안내
        if (dueDateInput.value < lessonDateInput.value) {
            alert('마감일은 수업일보다 빠를 수 없어요. 날짜를 다시 확인해주세요!');
            return;
        }

        const newData = loadData();
        newData.push({
            id: Date.now().toString(),
            lessonDate: lessonDateInput.value,
            dueDate: dueDateInput.value,
            content,
            done: false
        });
        saveData(newData);
        contentInput.value = ''; // 🆕 등록 후 내용창만 비움 (날짜는 유지 - 연달아 등록할 때 편함)
        renderPage(onBack);
    });

    attachCheckboxEvents(container, () => renderPage(onBack));
    attachItemActionEvents(container, () => renderPage(onBack));
}