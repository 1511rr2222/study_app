// ---------- 공통 상수 ----------
export const SEMESTERS = [
    { year: 1, term: 1, label: '고1-1' },
    { year: 1, term: 2, label: '고1-2' },
    { year: 2, term: 1, label: '고2-1' },
    { year: 2, term: 2, label: '고2-2' },
    { year: 3, term: 1, label: '고3-1' },
    { year: 3, term: 2, label: '고3-2' },
];

export const MONTHS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

// 선택형 과목 목록 (교과군별)
export const SUBJECT_GROUPS = [
    { label: '국어', subjects: ['공통 국어', '화법과 작문', '언어와 매체'] },
    { label: '수학', subjects: ['공통수학', '확률과 통계', '미적분', '기하'] },
    { label: '영어', subjects: ['영어'] },
    { label: '한국사', subjects: ['한국사'] },
    {
        label: '사회탐구',
        subjects: [
            '통합사회', '생활과 윤리', '윤리와 사상', '한국지리', '세계지리',
            '동아시아사', '세계사', '경제', '정치와 법', '사회·문화',
        ],
    },
    {
        label: '과학탐구',
        subjects: [
            '통합과학', '물리학Ⅰ', '화학Ⅰ', '생명과학Ⅰ', '지구과학Ⅰ',
            '물리학Ⅱ', '화학Ⅱ', '생명과학Ⅱ', '지구과학Ⅱ',
        ],
    },
];

// ---------- 공통 유틸 ----------
export function escapeHtml(str) {
    return String(str ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

// 과목 선택 드롭다운 (교과군별 optgroup)
export function subjectOptionsHtml(selected) {
    let html = '<option value="">과목 선택</option>';
    for (const group of SUBJECT_GROUPS) {
        html += `<optgroup label="${escapeHtml(group.label)}">`;
        html += group.subjects
            .map(subj => `<option value="${escapeHtml(subj)}" ${selected === subj ? 'selected' : ''}>${escapeHtml(subj)}</option>`)
            .join('');
        html += '</optgroup>';
    }
    return html;
}

// 5등급제 등급 드롭다운
export function gradeOptionsHtml(selected) {
    let html = '<option value="">-</option>';
    for (let g = 1; g <= 5; g++) {
        html += `<option value="${g}" ${Number(selected) === g ? 'selected' : ''}>${g}등급</option>`;
    }
    return html;
}

export function yearOptionsHtml(selected) {
    let html = '';
    for (let y = 1; y <= 3; y++) {
        html += `<option value="${y}" ${Number(selected) === y ? 'selected' : ''}>고${y}</option>`;
    }
    return html;
}

export function monthOptionsHtml(selected) {
    let html = '';
    for (const m of MONTHS) {
        html += `<option value="${m}" ${Number(selected) === m ? 'selected' : ''}>${m}월</option>`;
    }
    return html;
}