import { supabase } from '../supabaseClient.js';

const QUICK_SUBJECTS = ['국어', '수학', '영어', '한국사', '사회탐구1', '사회탐구2', '과학탐구1', '과학탐구2'];
const SEMESTERS = [
    { year: 1, term: 1, label: '고1-1' },
    { year: 1, term: 2, label: '고1-2' },
    { year: 2, term: 1, label: '고2-1' },
    { year: 2, term: 2, label: '고2-2' },
    { year: 3, term: 1, label: '고3-1' },
    { year: 3, term: 2, label: '고3-2' },
];

function escapeHtml(str) {
    return String(str ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

function gradeOptionsHtml(selected) {
    let html = '<option value="">-</option>';
    for (let g = 1; g <= 9; g++) {
        html += `<option value="${g}" ${Number(selected) === g ? 'selected' : ''}>${g}등급</option>`;
    }
    return html;
}

// ---------- View ----------
export function GradesView() {
    return `
        <div class="grades-container">
            <button id="grades-back-btn" class="grades-back-btn">← 대시보드로</button>
            <h2 class="grades-title">📊 성적 기록</h2>

            <div class="grades-tabs">
                <button class="grades-tab-btn active" data-tab="school">내신 입력</button>
                <button class="grades-tab-btn" data-tab="mock">모의고사 입력</button>
                <button class="grades-tab-btn" data-tab="analysis">성적 분석</button>
            </div>

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

            <div class="grades-tab-panel" data-panel="analysis" style="display:none;">
                <div class="grades-chart-card">
                    <h3 class="grades-chart-title">학기별 평균 등급 추이</h3>
                    <canvas id="grades-trend-chart" height="220"></canvas>
                    <p class="grades-chart-note">위로 갈수록 좋은 등급이에요 (1등급이 최고)</p>
                </div>
                <div class="grades-chart-card">
                    <h3 class="grades-chart-title">과목별 강약점 비교</h3>
                    <canvas id="grades-subject-chart" height="260"></canvas>
                    <p class="grades-chart-note">막대가 짧을수록(등급 숫자가 낮을수록) 강한 과목이에요</p>
                </div>
            </div>
        </div>
    `;
}

// ---------- Init ----------
export async function initGradesPage(onBack) {
    const backBtn = document.getElementById('grades-back-btn');
    if (backBtn) backBtn.addEventListener('click', onBack);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // ===== 탭 전환 =====
    const tabBtns = document.querySelectorAll('.grades-tab-btn');
    const panels = document.querySelectorAll('.grades-tab-panel');
    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            tabBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            const tab = btn.dataset.tab;
            panels.forEach(p => {
                p.style.display = p.dataset.panel === tab ? '' : 'none';
            });
            if (tab === 'analysis') renderAnalysis();
        });
    });

    // ===================================================
    // 내신 입력
    // ===================================================
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

    // ===================================================
    // 모의고사 입력
    // ===================================================
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

    // ===================================================
    // 성적 분석
    // ===================================================
    let trendChart = null;
    let subjectChart = null;

    async function renderAnalysis() {
        const trendCanvas = document.getElementById('grades-trend-chart');
        const subjectCanvas = document.getElementById('grades-subject-chart');
        if (!trendCanvas || !subjectCanvas) return;

        if (typeof Chart === 'undefined') {
            trendCanvas.replaceWith(document.createTextNode('그래프 라이브러리를 불러오지 못했어요.'));
            return;
        }

        const [{ data: schoolData, error: schoolError }, { data: mockData, error: mockError }] = await Promise.all([
            supabase.from('grades_school').select('grade_year, semester, subject, grade').eq('user_id', user.id),
            supabase.from('grades_mock').select('subject, grade').eq('user_id', user.id),
        ]);

        if (schoolError) console.error('내신 분석 데이터 로드 실패:', schoolError);
        if (mockError) console.error('모의고사 분석 데이터 로드 실패:', mockError);

        const school = schoolData || [];
        const mock = mockData || [];

        // ---- 학기별 평균 등급 추이 ----
        const trendData = SEMESTERS.map(s => {
            const grades = school
                .filter(r => r.grade_year === s.year && r.semester === s.term && r.grade != null)
                .map(r => r.grade);
            if (grades.length === 0) return null;
            return grades.reduce((a, b) => a + b, 0) / grades.length;
        });

        if (trendChart) trendChart.destroy();
        trendChart = new Chart(trendCanvas.getContext('2d'), {
            type: 'line',
            data: {
                labels: SEMESTERS.map(s => s.label),
                datasets: [{
                    label: '평균 등급',
                    data: trendData,
                    borderColor: '#ff6b9a',
                    backgroundColor: 'rgba(255,107,154,0.15)',
                    pointBackgroundColor: '#ff6b9a',
                    spanGaps: true,
                    tension: 0.3,
                    fill: true,
                }],
            },
            options: {
                scales: {
                    y: { reverse: true, min: 1, max: 9, ticks: { stepSize: 1 } },
                },
                plugins: { legend: { display: false } },
            },
        });

        // ---- 과목별 강약점 비교 ----
        const subjectMap = new Map(); // subject -> array of grades
        [...school, ...mock].forEach(r => {
            if (r.grade == null) return;
            if (!subjectMap.has(r.subject)) subjectMap.set(r.subject, []);
            subjectMap.get(r.subject).push(r.grade);
        });

        const subjectStats = [...subjectMap.entries()]
            .map(([subject, grades]) => ({
                subject,
                avg: grades.reduce((a, b) => a + b, 0) / grades.length,
            }))
            .sort((a, b) => a.avg - b.avg); // 낮은(좋은) 등급이 먼저

        if (subjectChart) subjectChart.destroy();

        if (subjectStats.length === 0) {
            subjectCanvas.replaceWith(document.createTextNode('아직 분석할 성적 데이터가 없어요.'));
        } else {
            subjectChart = new Chart(subjectCanvas.getContext('2d'), {
                type: 'bar',
                data: {
                    labels: subjectStats.map(s => s.subject),
                    datasets: [{
                        label: '평균 등급',
                        data: subjectStats.map(s => Number(s.avg.toFixed(2))),
                        backgroundColor: subjectStats.map(s => s.avg <= 3 ? '#ff6b9a' : s.avg >= 6 ? '#e57373' : '#dddddd'),
                        borderRadius: 6,
                    }],
                },
                options: {
                    indexAxis: 'y',
                    scales: {
                        x: { min: 1, max: 9, ticks: { stepSize: 1 } },
                    },
                    plugins: {
                        legend: { display: false },
                        tooltip: {
                            callbacks: {
                                label: (ctx) => `평균 ${ctx.parsed.x}등급`,
                            },
                        },
                    },
                },
            });
        }
    }

    // ===== 초기 로드 =====
    await Promise.all([loadSchoolRows(), loadMockExamLabels()]);
    await loadMockRows();
}