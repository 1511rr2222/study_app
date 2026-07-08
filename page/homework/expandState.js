
let expandedIds = new Set();

export function isExpanded(id) {
    return expandedIds.has(id);
}

export function toggleExpanded(id) {
    if (expandedIds.has(id)) {
        expandedIds.delete(id);
    } else {
        expandedIds.add(id);
    }
}

export function clearExpanded() {
    expandedIds = new Set();
}