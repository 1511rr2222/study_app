export function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

export function todayStr() {
    return new Date().toISOString().slice(0, 10);
}

// 마감일이 지났는데 아직 체크 안 된 경우 = 기한 초과 (미완료로 집계)
export function isOverdue(item) {
    return !item.done && item.dueDate && item.dueDate < todayStr();
}

export function getStatus(item) {
    if (item.done) return 'done';
    if (isOverdue(item)) return 'overdue';
    return 'pending';
}

// 대략적인 ISO 주차 계산 (연도-주차 형태의 키를 만들기 위한 용도)
export function getWeekKey(dateStr) {
    const date = new Date(dateStr + 'T00:00:00');
    const day = (date.getDay() + 6) % 7; // 월요일을 0으로
    const monday = new Date(date);
    monday.setDate(date.getDate() - day);
    const startOfYear = new Date(monday.getFullYear(), 0, 1);
    const weekNum = Math.ceil(((monday - startOfYear) / 86400000 + startOfYear.getDay() + 1) / 7);
    return `${monday.getFullYear()}-W${weekNum}`;
}

export function getWeeklyAverageRate(data) {
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

export function statusLabel(status) {
    if (status === 'done') return '완료';
    if (status === 'overdue') return '기한 초과';
    return '미완료';
}

// 마감일까지 남은/지난 일수를 D-day 형태로 변환 (예: D-3, D-DAY, D+2)
export function getDDayLabel(dueDate) {
    if (!dueDate) return '-';
    const due = new Date(dueDate + 'T00:00:00');
    const today = new Date(todayStr() + 'T00:00:00');
    const diff = Math.round((due - today) / 86400000);

    if (diff === 0) return 'D-DAY';
    return diff > 0 ? `D-${diff}` : `D+${Math.abs(diff)}`;
}

// 기한초과 → 미완료(마감 임박순) → 완료 순으로 정렬
export function sortForDisplay(data) {
    const statusOrder = { overdue: 0, pending: 1, done: 2 };
    return data.slice().sort((a, b) => {
        const statusDiff = statusOrder[getStatus(a)] - statusOrder[getStatus(b)];
        if (statusDiff !== 0) return statusDiff;
        return (a.dueDate || '').localeCompare(b.dueDate || ''); // 같은 상태면 마감일 빠른 순
    });
}