import { supabase } from '../../supabaseClient.js';
import { escapeHtml, gradeOptionsHtml } from './subjects.js';

// ---------- View ----------
export function MockTabView() {
    return `
        <div class="grades-tab-panel" data-panel="mock" style="display:none;">
            <div class="grades-card">
                <div class="grades-select-row">
                    <select id="grades-mock-exam-select" class="grades-select grades-select-wide"></select>
                    <button id="grades-mock-new-exam-btn" class="grades-secondary-btn">+ 새 모의고사</button>
                </div>

                <div class="grades-table" id="grades-mock-table"></div>
                <div class="grades-actions-row">
                    <button id="grades-mock-add-row-btn" class="grades-secondary-btn">+ 과목 추가</button>
                    <button id="grades-mock-save-btn" class="grades-save-btn">저장</button>
                </div>
                <p id="grades-mock-status" class="grades-status"></p>
            </div>
        </div>
    `;
}

// ---------- Init ----------
export async function initMockTab(user) {
    const mockExamSelect = document.getElementById('grades-mock-exam-select');
    const mockTableEl = document.getElementById('grades-mock-table');
    const mockStatusEl = document.getElementById('grades-mock-status');

    let mockRows = []; // { id?, subject, grade }
    let examLabels = [];

    function renderMockExamOptions() {
        mockExamSelect.innerHTML = examLabels.length
            ? examLabels.map(label => `<option value="${escapeHtml(label)}">${escapeHtml(label)}</option>`).join('')
            : '<option value="">모의고사를 추가해주세요</option>';
    }

    function renderMockTable() {
        if (!mockTableEl) return;
        if (mockRows.length === 0) {
            mockTableEl.innerHTML = '<p class="grades-empty">이 모의고사에 입력한 과목이 없어요.</p>';
            return;
        }
        mockTableEl.innerHTML = `
            <div class="grades-row grades-row-head grades-row-head-mock">
                <span>과목</span><span>등급</span><span></span>
            </div>
            ${mockRows.map((row, idx) => `
                <div class="grades-row grades-row-mock" data-idx="${idx}">
                    <input type="text" class="grades-input grades-input-subject" data-field="subject" value="${escapeHtml(row.subject)}" placeholder="과목명">
                    <select class="grades-input grades-select-grade" data-field="grade">${gradeOptionsHtml(row.grade)}</select>
                    <button type="button" class="grades-row-delete" title="삭제">✕</button>
                </div>
            `).join('')}
        `;

        mockTableEl.querySelectorAll('.grades-row[data-idx]').forEach(rowEl => {
            const idx = Number(rowEl.dataset.idx);
            rowEl.querySelectorAll('[data-field]').forEach(input => {
                input.addEventListener('input', () => {
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
                }
                mockRows.splice(idx, 1);
                renderMockTable();
            });
        });
    }

    async function loadMockExamLabels() {
        const { data, error } = await supabase
            .from('grades_mock')
            .select('exam_label')
            .eq('user_id', user.id);

        if (error) {
            console.error('모의고사 목록 로드 실패:', error);
            examLabels = [];
        } else {
            examLabels = [...new Set((data || []).map(r => r.exam_label))];
        }
        renderMockExamOptions();
    }

    async function loadMockRows() {
        mockStatusEl.textContent = '';
        const label = mockExamSelect.value;
        if (!label) {
            mockRows = [];
            renderMockTable();
            return;
        }
        const { data, error } = await supabase
            .from('grades_mock')
            .select('id, subject, grade')
            .eq('user_id', user.id)
            .eq('exam_label', label)
            .order('id', { ascending: true });

        if (error) {
            console.error('모의고사 성적 로드 실패:', error);
            mockRows = [];
        } else {
            mockRows = data || [];
        }
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
        const validRows = mockRows.filter(r => r.subject && r.subject.trim());
        if (validRows.length === 0) {
            mockStatusEl.textContent = '저장할 과목을 입력해주세요.';
            return;
        }

        const payload = validRows.map(r => ({
            user_id: user.id,
            exam_label: label,
            subject: r.subject.trim(),
            grade: r.grade,
            updated_at: new Date().toISOString(),
        }));

        const { data, error } = await supabase
            .from('grades_mock')
            .upsert(payload, { onConflict: 'user_id,exam_label,subject' })
            .select('id, subject, grade');

        if (error) {
            console.error('모의고사 성적 저장 실패:', error);
            mockStatusEl.textContent = '저장 중 문제가 생겼어요. 다시 시도해주세요.';
            return;
        }

        mockRows = data || [];
        renderMockTable();
        mockStatusEl.textContent = '저장완료 ✨';
        setTimeout(() => { mockStatusEl.textContent = ''; }, 1500);
    }

    document.getElementById('grades-mock-new-exam-btn').addEventListener('click', async () => {
        const label = prompt('새 모의고사 이름을 입력해주세요 (예: 고1 6월)');
        if (!label || !label.trim()) return;
        const trimmed = label.trim();
        if (!examLabels.includes(trimmed)) {
            examLabels.push(trimmed);
            renderMockExamOptions();
        }
        mockExamSelect.value = trimmed;
        await loadMockRows();
    });
    document.getElementById('grades-mock-add-row-btn').addEventListener('click', addMockRow);
    document.getElementById('grades-mock-save-btn').addEventListener('click', saveMockRows);
    mockExamSelect.addEventListener('change', loadMockRows);

    await loadMockExamLabels();
    await loadMockRows();
}