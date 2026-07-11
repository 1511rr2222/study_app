// ✅ "숙제 체크" 전체 페이지에서 날짜별로 묶은 그룹의 펼침 상태를 기억.
// 항목 하나하나의 펼침 상태(expandState.js)와는 완전히 별개로 관리해서 서로 안 헷갈리게 함.

const expandedDateGroups = new Set();

export function isDateGroupExpanded(dateKey) {
    return expandedDateGroups.has(dateKey);
}

export function toggleDateGroup(dateKey) {
    if (expandedDateGroups.has(dateKey)) {
        expandedDateGroups.delete(dateKey);
    } else {
        expandedDateGroups.add(dateKey);
    }
}

export function clearDateGroups() {
    expandedDateGroups.clear();
}