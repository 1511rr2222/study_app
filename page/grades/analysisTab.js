import { supabase } from '../../supabaseClient.js';
import { SEMESTERS } from './subjects.js';

// ---------- View ----------
export function AnalysisTabView() {
    return `
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
    `;
}

// ---------- Init ----------
// user를 받아 렌더링 함수를 반환합니다. 이 함수는 "성적 분석" 탭이 활성화될 때 호출하면 됩니다.
export function initAnalysisTab(user) {
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
                    y: { reverse: true, min: 1, max: 5, ticks: { stepSize: 1 } },
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
                        backgroundColor: subjectStats.map(s => s.avg <= 2 ? '#ff6b9a' : s.avg >= 4 ? '#e57373' : '#dddddd'),
                        borderRadius: 6,
                    }],
                },
                options: {
                    indexAxis: 'y',
                    scales: {
                        x: { min: 1, max: 5, ticks: { stepSize: 1 } },
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

    return renderAnalysis;
}