// ---------- 공통 상수 ----------
export const QUICK_SUBJECTS = ['국어', '수학', '영어', '한국사', '사회탐구1', '사회탐구2', '과학탐구1', '과학탐구2'];

export const SEMESTERS = [
    { year: 1, term: 1, label: '고1-1' },
    { year: 1, term: 2, label: '고1-2' },
    { year: 2, term: 1, label: '고2-1' },
    { year: 2, term: 2, label: '고2-2' },
    { year: 3, term: 1, label: '고3-1' },
    { year: 3, term: 2, label: '고3-2' },
];

// ---------- 공통 유틸 ----------
export function escapeHtml(str) {
    return String(str ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

export function gradeOptionsHtml(selected) {
    let html = '<option value="">-</option>';
    for (let g = 1; g <= 9; g++) {
        html += `<option value="${g}" ${Number(selected) === g ? 'selected' : ''}>${g}등급</option>`;
    }
    return html;
}