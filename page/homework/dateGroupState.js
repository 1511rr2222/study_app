// 날짜별로 묶은 그룹.

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