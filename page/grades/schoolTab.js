import { supabase } from '../../supabaseClient.js';
import { gradeOptionsHtml, subjectOptionsHtml, yearOptionsHtml } from './subjects.js';

// ---------- View ----------
export function SchoolTabView() {
    return `
        <div class="grades-tab-panel" data-panel="school">
            <div class="grades-card">
                <div class="grades-select-row">
                    <select id="grades-year-select" class="grades-select">${yearOptionsHtml(1)}</select>
                    <select id="grades-term-select" class="grades-select">
                        <option value="1">1학기</option>
                        <option value="2">2학기</option>
                    </select>
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
            schoolTableEl.innerHTML = '<p class="grades-empty">아직 입력한 과목이 없어요. "+ 과목 추가"를 눌러보세요.</p>';
            return;
        }
        schoolTableEl.innerHTML = `
            <div class="grades-row grades-row-head">
                <span>과목</span><span>원점수</span><span>등급</span><span></span>
            </div>
            ${schoolRows.map((row, idx) => `
                <div class="grades-row" data-idx="${idx}">
                    <select class="grades-input grades-input-subject" data-field="subject">${subjectOptionsHtml(row.subject)}</select>
                    <input type="number" class="grades-input grades-input-score" data-field="raw_score" value="${row.raw_score ?? ''}" min="0" max="100" placeholder="점수">
                    <select class="grades-input grades-select-grade" data-field="grade">${gradeOptionsHtml(row.grade)}</select>
                    <button type="button" class="grades-row-delete" title="삭제">✕</button>
                </div>
            `).join('')}
        `;

        schoolTableEl.querySelectorAll('.grades-row[data-idx]').forEach(rowEl => {
            const idx = Number(rowEl.dataset.idx);
            rowEl.querySelectorAll('[data-field]').forEach(input => {
                const eventName = input.tagName === 'SELECT' ? 'change' : 'input';
                input.addEventListener(eventName, () => {
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

    function addSchoolRow() {
        schoolRows.push({ subject: '', raw_score: null, grade: null });
        renderSchoolTable();
    }

    async function saveSchoolRows() {
        // 같은 과목이 여러 행에 있으면 마지막 입력만 저장 (upsert 충돌 방지)
        const dedupMap = new Map();
        schoolRows
            .filter(r => r.subject && r.subject.trim())
            .forEach(r => dedupMap.set(r.subject, r));
        const validRows = [...dedupMap.values()];

        if (validRows.length === 0) {
            schoolStatusEl.textContent = '저장할 과목을 선택해주세요.';
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

        const { error } = await supabase
            .from('grades_school')
            .upsert(payload, { onConflict: 'user_id,grade_year,semester,subject' });

        if (error) {
            console.error('내신 성적 저장 실패:', error);
            schoolStatusEl.textContent = '저장 중 문제가 생겼어요. 다시 시도해주세요.';
            return;
        }

        // upsert 응답을 믿지 않고 DB에서 최신 상태를 다시 불러와 화면에 반영
        await loadSchoolRows();
        schoolStatusEl.textContent = '저장완료 ✨';
        setTimeout(() => { schoolStatusEl.textContent = ''; }, 1500);
    }

    document.getElementById('grades-school-add-row-btn').addEventListener('click', addSchoolRow);
    document.getElementById('grades-school-save-btn').addEventListener('click', saveSchoolRows);
    yearSelect.addEventListener('change', loadSchoolRows);
    termSelect.addEventListener('change', loadSchoolRows);

    await loadSchoolRows();
}