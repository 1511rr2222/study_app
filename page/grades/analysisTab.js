import { supabase } from '../../supabaseClient.js';
import { SEMESTERS, SUBJECT_GROUPS } from './subjects.js';

// 과목명 -> 교과군 매핑
const SUBJECT_TO_GROUP = new Map();
SUBJECT_GROUPS.forEach(g => g.subjects.forEach(subj => SUBJECT_TO_GROUP.set(subj, g.label)));
const SUBJECT_GROUP_LABELS = SUBJECT_GROUPS.map(g => g.label); // ['국어','수학','영어','한국사','사회탐구','과학탐구']

function groupOf(subject) {
    return SUBJECT_TO_GROUP.get(subject) || subject;
}

const GROUP_COLORS = {
    '국어': '#ff6b9a',
    '수학': '#5B86E5',
    '영어': '#7ED9A8',
    '한국사': '#FFD469',
    '사회탐구': '#9B8CFF',
    '과학탐구': '#E0397A',
};

function parseExamKey(label) {
    const m = label.match(/^고(\d+)\s+(\d+)월/);
    if (!m) return [99, 99];
    return [Number(m[1]), Number(m[2])];
}

function avg(arr) {
    return arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : null;
}

// ✅ 각 데이터 포인트/막대 위에 값을 작은 숫자로 표시 (별도 플러그인 없이 캔버스에 직접 그림)
const valueLabelPlugin = {
    id: 'gradesValueLabel',
    afterDatasetsDraw(chart) {
        const { ctx } = chart;
        chart.data.datasets.forEach((dataset, i) => {
            const meta = chart.getDatasetMeta(i);
            if (meta.hidden) return;
            meta.data.forEach((point, index) => {
                const value = dataset.data[index];
                if (value == null) return;
                ctx.save();
                ctx.fillStyle = dataset.borderColor || dataset.backgroundColor || '#333';
                ctx.font = 'bold 10px "Noto Sans KR", sans-serif';
                ctx.textAlign = 'center';
                ctx.fillText(Number(value).toFixed(1), point.x, point.y - 8);
                ctx.restore();
            });
        });
    },
};

// ---------- View ----------
function ChartCardHtml(id, title, bodyHtml, openByDefault = false) {
    return `
        <div class="grades-chart-card ${openByDefault ? 'grades-chart-open' : ''}" data-chart-id="${id}">
            <button type="button" class="grades-chart-toggle">
                <span class="grades-chart-caret" aria-hidden="true">▾</span>
                <h4 class="grades-chart-title">${title}</h4>
            </button>
            <div class="grades-chart-body">
                ${bodyHtml}
            </div>
        </div>
    `;
}

export function AnalysisTabView() {
    return `
        <div class="grades-tab-panel" data-panel="analysis" style="display:none;">
            ${ChartCardHtml('goals', '🎯 목표 등급 & 현재 상태', `
                <div class="grades-goal-list" id="grades-goal-list"></div>
                <button type="button" id="grades-goal-save-btn" class="grades-save-btn grades-goal-save-btn">목표 저장</button>
                <p id="grades-goal-status" class="grades-status"></p>
            `, true)}

            <h3 class="grades-analysis-heading">📘 내신 성적 추이</h3>
            ${ChartCardHtml('school-year', '학년·학기별 평균 등급', `
                <canvas id="grades-school-year-chart" height="220"></canvas>
                <p class="grades-chart-note">위로 갈수록 좋은 등급이에요 (1등급이 최고)</p>
            `)}
            ${ChartCardHtml('school-subject', '과목별 등급 추이', `
                <canvas id="grades-school-subject-chart" height="260"></canvas>
                <p class="grades-chart-note">교과군별로 학기마다 등급이 어떻게 바뀌었는지 보여줘요</p>
            `)}

            <h3 class="grades-analysis-heading">📗 모의고사 성적 추이</h3>
            ${ChartCardHtml('mock-year', '회차별 평균 등급', `
                <canvas id="grades-mock-year-chart" height="220"></canvas>
                <p class="grades-chart-empty" id="grades-mock-year-empty" style="display:none;">아직 등록된 모의고사가 없어요.</p>
                <p class="grades-chart-note">위로 갈수록 좋은 등급이에요 (1등급이 최고)</p>
            `)}
            ${ChartCardHtml('mock-subject', '과목별 등급 추이', `
                <canvas id="grades-mock-subject-chart" height="260"></canvas>
                <p class="grades-chart-empty" id="grades-mock-subject-empty" style="display:none;">아직 등록된 모의고사가 없어요.</p>
                <p class="grades-chart-note">교과군별로 회차마다 등급이 어떻게 바뀌었는지 보여줘요</p>
            `)}

            <h3 class="grades-analysis-heading">⚖️ 내신 vs 모의고사</h3>
            ${ChartCardHtml('compare', '교과군별 비교', `
                <canvas id="grades-compare-chart" height="260"></canvas>
                <p class="grades-chart-note">같은 과목군인데 격차가 크면, 시험 유형에 따라 강약점이 다를 수 있어요</p>
            `)}
        </div>
    `;
}

// ---------- Init ----------
export function initAnalysisTab(user) {
    const charts = {}; // cardId -> Chart 인스턴스 (펼칠 때만 생성)
    let schoolData = [];
    let mockData = [];
    let goals = {}; // subjectGroupLabel -> target_grade

    /* ---------- 아코디언 펼침/접힘 (한 번만 연결) ---------- */
    document.querySelectorAll('.grades-chart-card').forEach(card => {
        const toggle = card.querySelector('.grades-chart-toggle');
        toggle.addEventListener('click', () => {
            const wasOpen = card.classList.contains('grades-chart-open');
            card.classList.toggle('grades-chart-open');
            if (!wasOpen) buildChartIfNeeded(card.dataset.chartId);
        });
    });

    function lineChart(canvas, labels, datasets) {
        return new Chart(canvas.getContext('2d'), {
            type: 'line',
            data: { labels, datasets },
            plugins: [valueLabelPlugin],
            options: {
                scales: { y: { reverse: true, min: 1, max: 5, ticks: { stepSize: 1 } } },
                plugins: { legend: { display: datasets.length > 1 } },
                layout: { padding: { top: 16 } }, // 값 라벨이 위에서 잘리지 않도록
            },
        });
    }

    function buildChartIfNeeded(cardId) {
        if (cardId === 'goals' || charts[cardId]) return;

        if (cardId === 'school-year') {
            const canvas = document.getElementById('grades-school-year-chart');
            if (!canvas) return;
            const labels = SEMESTERS.map(s => s.label);
            const data = SEMESTERS.map(s => avg(schoolData
                .filter(r => r.grade_year === s.year && r.semester === s.term && r.grade != null)
                .map(r => r.grade)));
            charts[cardId] = lineChart(canvas, labels, [{
                label: '평균 등급', data,
                borderColor: '#ff6b9a', backgroundColor: '#ff6b9a',
                pointBackgroundColor: '#ff6b9a', spanGaps: true, tension: 0.3, fill: false,
            }]);
        }

        if (cardId === 'school-subject') {
            const canvas = document.getElementById('grades-school-subject-chart');
            if (!canvas) return;
            const labels = SEMESTERS.map(s => s.label);
            const datasets = SUBJECT_GROUP_LABELS.map(g => ({
                label: g,
                data: SEMESTERS.map(s => avg(schoolData
                    .filter(r => r.grade_year === s.year && r.semester === s.term && r.grade != null && groupOf(r.subject) === g)
                    .map(r => r.grade))),
                borderColor: GROUP_COLORS[g], backgroundColor: GROUP_COLORS[g],
                spanGaps: true, tension: 0.3, pointRadius: 3, fill: false,
            }));
            charts[cardId] = lineChart(canvas, labels, datasets);
        }

        if (cardId === 'mock-year' || cardId === 'mock-subject') {
            const canvasId = cardId === 'mock-year' ? 'grades-mock-year-chart' : 'grades-mock-subject-chart';
            const emptyId = cardId === 'mock-year' ? 'grades-mock-year-empty' : 'grades-mock-subject-empty';
            const canvas = document.getElementById(canvasId);
            const emptyEl = document.getElementById(emptyId);
            if (!canvas) return;

            const labelsSorted = [...new Set(mockData.map(r => r.exam_label))].sort((a, b) => {
                const [ay, am] = parseExamKey(a);
                const [by, bm] = parseExamKey(b);
                return ay !== by ? ay - by : am - bm;
            });

            if (labelsSorted.length === 0) {
                canvas.style.display = 'none';
                if (emptyEl) emptyEl.style.display = '';
                return;
            }
            canvas.style.display = '';
            if (emptyEl) emptyEl.style.display = 'none';

            if (cardId === 'mock-year') {
                const data = labelsSorted.map(label => avg(mockData.filter(r => r.exam_label === label && r.grade != null).map(r => r.grade)));
                charts[cardId] = lineChart(canvas, labelsSorted, [{
                    label: '평균 등급', data,
                    borderColor: '#5B86E5', backgroundColor: '#5B86E5',
                    pointBackgroundColor: '#5B86E5', spanGaps: true, tension: 0.3, fill: false,
                }]);
            } else {
                const datasets = SUBJECT_GROUP_LABELS.map(g => ({
                    label: g,
                    data: labelsSorted.map(label => avg(mockData
                        .filter(r => r.exam_label === label && r.grade != null && groupOf(r.subject) === g)
                        .map(r => r.grade))),
                    borderColor: GROUP_COLORS[g], backgroundColor: GROUP_COLORS[g],
                    spanGaps: true, tension: 0.3, pointRadius: 3, fill: false,
                }));
                charts[cardId] = lineChart(canvas, labelsSorted, datasets);
            }
        }

        if (cardId === 'compare') {
            const canvas = document.getElementById('grades-compare-chart');
            if (!canvas) return;
            const schoolAvgByGroup = SUBJECT_GROUP_LABELS.map(g => avg(schoolData.filter(r => r.grade != null && groupOf(r.subject) === g).map(r => r.grade)));
            const mockAvgByGroup = SUBJECT_GROUP_LABELS.map(g => avg(mockData.filter(r => r.grade != null && groupOf(r.subject) === g).map(r => r.grade)));

            charts[cardId] = new Chart(canvas.getContext('2d'), {
                type: 'bar',
                data: {
                    labels: SUBJECT_GROUP_LABELS,
                    datasets: [
                        { label: '내신', data: schoolAvgByGroup, backgroundColor: '#ff6b9a', borderRadius: 6 },
                        { label: '모의고사', data: mockAvgByGroup, backgroundColor: '#5B86E5', borderRadius: 6 },
                    ],
                },
                plugins: [valueLabelPlugin],
                options: {
                    scales: { y: { reverse: true, min: 1, max: 5, ticks: { stepSize: 1 } } },
                    plugins: { legend: { display: true } },
                    layout: { padding: { top: 16 } },
                },
            });
        }
    }

    /* ---------- 목표 등급 설정 ---------- */
    function renderGoalList() {
        const list = document.getElementById('grades-goal-list');
        if (!list) return;

        list.innerHTML = SUBJECT_GROUP_LABELS.map(g => {
            const currentAvg = avg([...schoolData, ...mockData].filter(r => r.grade != null && groupOf(r.subject) === g).map(r => r.grade));
            const target = goals[g] ?? '';

            let statusHtml;
            if (currentAvg == null) {
                statusHtml = '<span class="grades-goal-status-text">기록 없음</span>';
            } else if (target && currentAvg <= Number(target)) {
                statusHtml = '<span class="grades-goal-status-text grades-goal-achieved">목표 달성 🎉</span>';
            } else if (target) {
                statusHtml = `<span class="grades-goal-status-text">현재 ${currentAvg.toFixed(1)}등급 · 목표까지 ${(currentAvg - Number(target)).toFixed(1)}</span>`;
            } else {
                statusHtml = `<span class="grades-goal-status-text">현재 ${currentAvg.toFixed(1)}등급</span>`;
            }

            return `
                <div class="grades-goal-row">
                    <span class="grades-goal-subject" style="color:${GROUP_COLORS[g]}">${g}</span>
                    <select class="grades-goal-select" data-group="${g}">
                        <option value="">목표 없음</option>
                        ${[1, 2, 3, 4, 5].map(n => `<option value="${n}" ${Number(target) === n ? 'selected' : ''}>${n}등급</option>`).join('')}
                    </select>
                    ${statusHtml}
                </div>
            `;
        }).join('');
    }

    async function loadGoals() {
        const { data, error } = await supabase.from('grades_goals').select('subject_group, target_grade').eq('user_id', user.id);
        if (error) {
            console.error('목표 등급 로드 실패:', error);
            return;
        }
        goals = {};
        (data || []).forEach(g => { goals[g.subject_group] = g.target_grade; });
    }

    const goalSaveBtn = document.getElementById('grades-goal-save-btn');
    if (goalSaveBtn) {
        goalSaveBtn.addEventListener('click', async () => {
            const statusEl = document.getElementById('grades-goal-status');
            const rows = [...document.querySelectorAll('.grades-goal-select')]
                .map(sel => ({ subject_group: sel.dataset.group, target_grade: sel.value === '' ? null : Number(sel.value) }));

            const toUpsert = rows.filter(r => r.target_grade != null).map(r => ({ ...r, user_id: user.id, updated_at: new Date().toISOString() }));
            const toDelete = rows.filter(r => r.target_grade == null).map(r => r.subject_group);

            if (toUpsert.length > 0) {
                const { error } = await supabase.from('grades_goals').upsert(toUpsert, { onConflict: 'user_id,subject_group' });
                if (error) {
                    console.error('목표 저장 실패:', error);
                    statusEl.textContent = '저장 중 문제가 생겼어요.';
                    return;
                }
            }
            if (toDelete.length > 0) {
                await supabase.from('grades_goals').delete().eq('user_id', user.id).in('subject_group', toDelete);
            }

            await loadGoals();
            renderGoalList();
            statusEl.textContent = '저장완료 ✨';
            setTimeout(() => { statusEl.textContent = ''; }, 1500);
        });
    }

    /* ---------- 전체 새로고침 (탭 열릴 때마다 호출) ---------- */
    async function renderAnalysis() {
        const [{ data: sData, error: sErr }, { data: mData, error: mErr }] = await Promise.all([
            supabase.from('grades_school').select('grade_year, semester, subject, grade').eq('user_id', user.id),
            supabase.from('grades_mock').select('exam_label, subject, grade').eq('user_id', user.id),
        ]);
        if (sErr) console.error('내신 분석 데이터 로드 실패:', sErr);
        if (mErr) console.error('모의고사 분석 데이터 로드 실패:', mErr);
        schoolData = sData || [];
        mockData = mData || [];

        await loadGoals();
        renderGoalList();

        Object.keys(charts).forEach(id => { charts[id].destroy(); delete charts[id]; });
        document.querySelectorAll('.grades-chart-card.grades-chart-open').forEach(card => buildChartIfNeeded(card.dataset.chartId));
    }

    return renderAnalysis;
}