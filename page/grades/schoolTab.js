import { supabase } from '../../supabaseClient.js';
import { QUICK_SUBJECTS, escapeHtml, gradeOptionsHtml } from './subjects.js';

// ---------- View ----------
export function SchoolTabView() {
    return `
        <div class="grades-tab-panel" data-panel="school">
            <div class="grades-card">
                <div class="grades-select-row">
                    <select id="grades-year-select" class="grades-select">
                        <option value="1">고1</option>
                        <option value="2">고2</option>
                        <option value="3">고3</option>
                    </select>
                    <select id="grades-term-select" class="grades-select">
                        <option value="1">1학기</option>
                        <option value="2">2학기</option>
                    </select>
                </div>

                <div class="grades-quickadd" id="grades-quickadd">
                    ${QUICK_SUBJECTS.map(s => `<button type="button" class="grades-chip" data-subject="${escapeHtml(s)}">${escapeHtml(s)}</button>`).join('')}
                </div>

                <div class="grades-table" id="grades-school-table"></div>
                <div class="grades-actions-row">
                    <button id="grades-school-add-row-btn" class="grades-secondary-btn">+ 과목 추가</button>
                    <button id="grades-school-save-btn" class="grades-save-btn">저장</button>
                </div>
                <p id="grades-school-status" class="grades-status"></p>
            </div>
        </div>
    `;
}

// ---------- Init ----------
export async function initSchoolTab(user) {
    const yearSelect = document.getElementById('grades-year-select');
    const termSelect = document.getElementById('grades-term-select');
    const schoolTableEl = document.getElementById('grades-school-table');
    const schoolStatusEl = document.getElementById('grades-school-status');

    let schoolRows = []; // { id?, subject, raw_score, grade }

    function renderSchoolTable() {
        if (!schoolTableEl) return;
        if (schoolRows.length === 0) {
            schoolTableEl.innerHTML = '<p class="grades-empty">아직 입력한 과목이 없어요. 아래 칩을 누르거나 "+ 과목 추가"를 눌러보세요.</p>';
            return;
        }
        schoolTableEl.innerHTML = `
            <div class="grades-row grades-row-head">
                <span>과목</span><span>원점수</span><span>등급</span><span></span>
            </div>
            ${schoolRows.map((row, idx) => `
                <div class="grades-row" data-idx="${idx}">
                    <input type="text" class="grades-input grades-input-subject" data-field="subject" value="${escapeHtml(row.subject)}" placeholder="과목명">
                    <input type="number" class="grades-input grades-input-score" data-field="raw_score" value="${row.raw_score ?? ''}" min="0" max="100" placeholder="점수">
                    <select class="grades-input grades-select-grade" data-field="grade">${gradeOptionsHtml(row.grade)}</select>
                    <button type="button" class="grades-row-delete" title="삭제">✕</button>
                </div>
            `).join('')}
        `;

        schoolTableEl.querySelectorAll('.grades-row[data-idx]').forEach(rowEl => {
            const idx = Number(rowEl.dataset.idx);
            rowEl.querySelectorAll('[data-field]').forEach(input => {
                input.addEventListener('input', () => {
                    const field = input.dataset.field;
                    schoolRows[idx][field] = field === 'raw_score' || field === 'grade'
                        ? (input.value === '' ? null : Number(input.value))
                        : input.value;
                });
            });
            rowEl.querySelector('.grades-row-delete').addEventListener('click', async () => {
                const row = schoolRows[idx];
                if (row.id) {
                    await supabase.from('grades_school').delete().eq('id', row.id);
                }
                schoolRows.splice(idx, 1);
                renderSchoolTable();
            });
        });
    }

    async function loadSchoolRows() {
        schoolStatusEl.textContent = '';
        const { data, error } = await supabase
            .from('grades_school')
            .select('id, subject, raw_score, grade')
            .eq('user_id', user.id)
            .eq('grade_year', Number(yearSelect.value))
            .eq('semester', Number(termSelect.value))
            .order('id', { ascending: true });

        if (error) {
            console.error('내신 성적 로드 실패:', error);
            schoolRows = [];
        } else {
            schoolRows = data || [];
        }
        renderSchoolTable();
    }

    function addSchoolRow(prefillSubject = '') {
        if (prefillSubject && schoolRows.some(r => r.subject === prefillSubject)) return; // 중복 방지
        schoolRows.push({ subject: prefillSubject, raw_score: null, grade: null });
        renderSchoolTable();
    }

    async function saveSchoolRows() {
        const validRows = schoolRows.filter(r => r.subject && r.subject.trim());
        if (validRows.length === 0) {
            schoolStatusEl.textContent = '저장할 과목을 입력해주세요.';
            return;
        }

        const payload = validRows.map(r => ({
            user_id: user.id,
            grade_year: Number(yearSelect.value),
            semester: Number(termSelect.value),
            subject: r.subject.trim(),
            raw_score: r.raw_score,
            grade: r.grade,
            updated_at: new Date().toISOString(),
        }));

        const { data, error } = await supabase
            .from('grades_school')
            .upsert(payload, { onConflict: 'user_id,grade_year,semester,subject' })
            .select('id, subject, raw_score, grade');

        if (error) {
            console.error('내신 성적 저장 실패:', error);
            schoolStatusEl.textContent = '저장 중 문제가 생겼어요. 다시 시도해주세요.';
            return;
        }

        schoolRows = data || [];
        renderSchoolTable();
        schoolStatusEl.textContent = '저장완료 ✨';
        setTimeout(() => { schoolStatusEl.textContent = ''; }, 1500);
    }

    document.getElementById('grades-quickadd').addEventListener('click', (e) => {
        const btn = e.target.closest('.grades-chip');
        if (!btn) return;
        addSchoolRow(btn.dataset.subject);
    });
    document.getElementById('grades-school-add-row-btn').addEventListener('click', () => addSchoolRow());
    document.getElementById('grades-school-save-btn').addEventListener('click', saveSchoolRows);
    yearSelect.addEventListener('change', loadSchoolRows);
    termSelect.addEventListener('change', loadSchoolRows);

    await loadSchoolRows();
}