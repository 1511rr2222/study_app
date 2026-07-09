import { supabase } from '../../supabaseClient.js';
import { escapeHtml, gradeOptionsHtml, subjectOptionsHtml, yearOptionsHtml, monthOptionsHtml } from './subjects.js';

// ---------- View ----------
export function MockTabView() {
    return `
        <div class="grades-tab-panel" data-panel="mock" style="display:none;">
            <div class="grades-card">
                <div class="grades-select-row grades-mock-new-row">
                    <select id="grades-mock-new-year" class="grades-select">${yearOptionsHtml(1)}</select>
                    <select id="grades-mock-new-month" class="grades-select">${monthOptionsHtml(3)}</select>
                    <input type="text" id="grades-mock-new-office" class="grades-input" placeholder="OO교육청 (선택)">
                    <button id="grades-mock-new-exam-btn" class="grades-secondary-btn">+ 추가</button>
                </div>

                <div class="grades-select-row">
                    <select id="grades-mock-exam-select" class="grades-select grades-select-wide"></select>
                </div>

                <div class="grades-table" id="grades-mock-table"></div>
                <div class="grades-actions-row">
                    <button id="grades-mock-add-row-btn" class="grades-secondary-btn">+ 과목 추가</button>
                    <button id="grades-mock-save-btn" class="grades-save-btn">저장</button>
                </div>
                <p id="grades-mock-status" class="grades-status"></p>
            </div>

            <h3 class="grades-mock-list-title">저장된 모의고사</h3>
            <div class="grades-mock-list" id="grades-mock-list"></div>
        </div>
    `;
}

// ---------- Init ----------
export async function initMockTab(user) {
    const newYearSelect = document.getElementById('grades-mock-new-year');
    const newMonthSelect = document.getElementById('grades-mock-new-month');
    const newOfficeInput = document.getElementById('grades-mock-new-office');
    const newExamBtn = document.getElementById('grades-mock-new-exam-btn');
    const mockExamSelect = document.getElementById('grades-mock-exam-select');
    const mockTableEl = document.getElementById('grades-mock-table');
    const mockStatusEl = document.getElementById('grades-mock-status');
    const mockListEl = document.getElementById('grades-mock-list');
    const DEFAULT_SUBJECTS = ['공통 국어', '공통수학', '한국사', '영어', '통합사회', '통합과학'];
    let mockRows = []; // 편집 중인(위쪽 카드) 과목/등급 행
    let examMap = new Map(); // exam_label -> [{ id, subject, grade }]  (전체 캐시)
    const expandedExamLabels = new Set();

    function buildExamLabel(year, month, office) {
        const base = `고${year} ${month}월`;
        const trimmedOffice = (office || '').trim();
        return trimmedOffice ? `${base} ${trimmedOffice}` : base;
    }

    // "고1 3월 ..." 형태에서 연도/월을 뽑아 정렬용 키로 사용. 형식이 다르면 맨 뒤로.
    function parseSortKey(label) {
        const m = label.match(/^고(\d+)\s+(\d+)월/);
        if (!m) return [-1, -1];
        return [Number(m[1]), Number(m[2])];
    }

    function sortedLabels() {
        return [...examMap.keys()].sort((a, b) => {
            const [ay, am] = parseSortKey(a);
            const [by, bm] = parseSortKey(b);
            if (ay !== by) return by - ay;   // 학년 내림차순 (최신 학년 먼저)
            return bm - am;                  // 월 내림차순 (최신 달 먼저)
        });
    }

    function renderMockExamOptions() {
        const labels = sortedLabels();
        mockExamSelect.innerHTML = labels.length
            ? labels.map(label => `<option value="${escapeHtml(label)}">${escapeHtml(label)}</option>`).join('')
            : '<option value="">추가된 모의고사가 없어요</option>';
    }

    // ---- 아래쪽: 저장된 모의고사 블록 리스트 (읽기 전용 + 수정 버튼) ----
    function renderMockList() {
        if (!mockListEl) return;
        const labels = sortedLabels();
        if (labels.length === 0) {
            mockListEl.innerHTML = '<p class="grades-empty">아직 저장된 모의고사가 없어요.</p>';
            return;
        }

        mockListEl.innerHTML = labels.map(label => {
    const rows = examMap.get(label) || [];
    const rowsHtml = rows.length
        ? rows.map(r => `
            <div class="grades-mock-block-row">
                <span class="grades-mock-block-subject">${escapeHtml(r.subject)}</span>
                <span class="grades-mock-block-grade">${r.grade != null ? `${r.grade}등급` : '-'}</span>
            </div>
        `).join('')
        : '<p class="grades-empty">입력된 과목이 없어요.</p>';
    const isOpen = expandedExamLabels.has(label);

    return `
        <div class="grades-mock-block ${isOpen ? 'grades-mock-block-expanded' : ''}" data-label="${escapeHtml(label)}">
            <div class="grades-mock-block-header">
                <span class="grades-mock-block-caret" aria-hidden="true">▾</span>
                <h4 class="grades-mock-block-title">${escapeHtml(label)}</h4>
                <button type="button" class="grades-mock-block-edit" data-label="${escapeHtml(label)}">수정</button>
                <button type="button" class="grades-mock-block-delete" data-label="${escapeHtml(label)}">삭제</button>
            </div>
            <div class="grades-mock-block-body">${rowsHtml}</div>
        </div>
    `;
}).join('');

mockListEl.querySelectorAll('.grades-mock-block-header').forEach(header => {
    header.addEventListener('click', (e) => {
        if (e.target.closest('.grades-mock-block-edit')) return; // 수정 버튼 클릭 시엔 펼침 토글 안 함
        const block = header.closest('.grades-mock-block');
        const label = block.dataset.label;
        expandedExamLabels.has(label) ? expandedExamLabels.delete(label) : expandedExamLabels.add(label);
        block.classList.toggle('grades-mock-block-expanded');
    });
});

mockListEl.querySelectorAll('.grades-mock-block-edit').forEach(btn => {
    btn.addEventListener('click', (e) => {
        e.stopPropagation(); // 헤더 펼침 토글이 같이 실행되지 않도록
        mockExamSelect.value = btn.dataset.label;
        loadEditorRows(btn.dataset.label);
        document.querySelector('.grades-card').scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
});
mockListEl.querySelectorAll('.grades-mock-block-delete').forEach(btn => {
    btn.addEventListener('click', async (e) => {
        e.stopPropagation(); // 헤더 펼침 토글이 같이 실행되지 않도록
        const label = btn.dataset.label;
        if (!confirm(`"${label}" 모의고사를 삭제할까요? 저장된 과목 성적도 모두 삭제돼요.`)) return;

        const { error } = await supabase
            .from('grades_mock')
            .delete()
            .eq('user_id', user.id)
            .eq('exam_label', label);

        if (error) {
            console.error('모의고사 삭제 실패:', error);
            alert('삭제 중 문제가 생겼어요.');
            return;
        }

        expandedExamLabels.delete(label);
        await refreshMockData();
        loadEditorRows(mockExamSelect.value); // 삭제로 선택값이 바뀌었을 수 있으니 편집 표도 같이 동기화
    });
});
    }

    // ---- 위쪽: 편집용 표 ----
    function renderMockTable() {
        if (!mockTableEl) return;
        if (mockRows.length === 0) {
            mockTableEl.innerHTML = '<p class="grades-empty">이 모의고사에 입력한 과목이 없어요.</p>';
            return;
        }
        mockTableEl.innerHTML = `
            <div class="grades-row grades-row-head grades-row-mock">    <span>과목</span><span>등급</span><span></span>
            </div>
            ${mockRows.map((row, idx) => `
                <div class="grades-row grades-row-mock" data-idx="${idx}">
                    <select class="grades-input grades-input-subject" data-field="subject">${subjectOptionsHtml(row.subject)}</select>
                    <select class="grades-input grades-select-grade" data-field="grade">${gradeOptionsHtml(row.grade)}</select>
                    <button type="button" class="grades-row-delete" title="삭제">✕</button>
                </div>
            `).join('')}
        `;

        mockTableEl.querySelectorAll('.grades-row[data-idx]').forEach(rowEl => {
            const idx = Number(rowEl.dataset.idx);
            rowEl.querySelectorAll('[data-field]').forEach(input => {
                input.addEventListener('change', () => {
                    const field = input.dataset.field;
                    mockRows[idx][field] = field === 'grade'
                        ? (input.value === '' ? null : Number(input.value))
                        : input.value;
                });
            });
            rowEl.querySelector('.grades-row-delete').addEventListener('click', async () => {
                const row = mockRows[idx];
                if (row.id) {
                    await supabase.from('grades_mock').delete().eq('id', row.id);
                    await refreshMockData();
                }
                mockRows.splice(idx, 1);
                renderMockTable();
            });
        });
    }

    // ---- 전체 데이터 새로고침 (편집 표 + 저장 목록이 같은 캐시를 공유) ----
    async function refreshMockData() {
        const { data, error } = await supabase
            .from('grades_mock')
            .select('id, exam_label, subject, grade')
            .eq('user_id', user.id)
            .order('id', { ascending: true });

        examMap = new Map();
        if (error) {
            console.error('모의고사 데이터 로드 실패:', error);
        } else {
            (data || []).forEach(row => {
                if (!examMap.has(row.exam_label)) examMap.set(row.exam_label, []);
                examMap.get(row.exam_label).push(row);
            });
        }
        renderMockExamOptions();
        renderMockList();
    }

    function loadEditorRows(label) {
        mockStatusEl.textContent = '';
        mockRows = label ? (examMap.get(label) || []).map(r => ({ ...r })) : [];
        renderMockTable();
    }

    function addMockRow() {
        mockRows.push({ subject: '', grade: null });
        renderMockTable();
    }

    async function saveMockRows() {
        const label = mockExamSelect.value;
        if (!label) {
            mockStatusEl.textContent = '먼저 모의고사를 추가해주세요.';
            return;
        }
        // 같은 과목이 여러 행에 있으면 마지막 입력만 저장 (upsert 충돌 방지)
        const dedupMap = new Map();
        mockRows
            .filter(r => r.subject && r.subject.trim())
            .forEach(r => dedupMap.set(r.subject, r));
        const validRows = [...dedupMap.values()];

        if (validRows.length === 0) {
            mockStatusEl.textContent = '저장할 과목을 선택해주세요.';
            return;
        }

        const payload = validRows.map(r => ({
            user_id: user.id,
            exam_label: label,
            subject: r.subject.trim(),
            grade: r.grade,
            updated_at: new Date().toISOString(),
        }));

        const { error } = await supabase
            .from('grades_mock')
            .upsert(payload, { onConflict: 'user_id,exam_label,subject' });

        if (error) {
            console.error('모의고사 성적 저장 실패:', error);
            mockStatusEl.textContent = '저장 중 문제가 생겼어요. 다시 시도해주세요.';
            return;
        }

        // DB에서 최신 상태를 다시 불러와 편집 표 + 저장 목록에 함께 반영
        await refreshMockData();
        loadEditorRows(label);
        mockStatusEl.textContent = '저장완료 ✨';
        setTimeout(() => { mockStatusEl.textContent = ''; }, 1500);
    }

    newExamBtn.addEventListener('click', () => {
        const label = buildExamLabel(newYearSelect.value, newMonthSelect.value, newOfficeInput.value);
        const isNew = !examMap.has(label);
        if (!examMap.has(label)) {
            examMap.set(label, []);
            renderMockExamOptions();
            renderMockList();
        }
        mockExamSelect.value = label;
        newOfficeInput.value = '';
        loadEditorRows(label);
        if (isNew) {
            mockRows = DEFAULT_SUBJECTS.map(subject => ({ subject, grade: null }));
            renderMockTable();
        }
    });
    document.getElementById('grades-mock-add-row-btn').addEventListener('click', addMockRow);
    document.getElementById('grades-mock-save-btn').addEventListener('click', saveMockRows);
    mockExamSelect.addEventListener('change', () => loadEditorRows(mockExamSelect.value));

    await refreshMockData();
    loadEditorRows(mockExamSelect.value);
}