// ✅ "계획성 UP" 대시보드 카드 — 타임박싱/우선순위 등 실전 방법 팁을 하루 하나씩 보여주고,
// 그 팁에 딸린 아주 작은 실천 미션 하나를 체크(check) 또는 한 줄 입력(text)으로 남길 수 있게 함.
// Supabase 없이 localStorage만 사용 (가볍게 유지하기 위함).

const STORAGE_KEY = 'yerin_planning_mission_state';

export const PLANNING_TIPS = [
    {
        tip: "'오늘 수학 공부해야지'처럼 막연한 계획은 지키기 어려워요. 언제부터 언제까지, 뭘 할지 시간까지 딱 정해두면 훨씬 잘 지켜져요.",
        mission: '오늘 할 일 하나를 골라서 시작 시간과 끝나는 시간을 적어보세요 (예: 19:00~19:50 수학 3단원)',
        type: 'text',
    },
    {
        tip: "할 일이 많을수록 뭐부터 해야 할지 헷갈려요. '급하고 중요한 것'부터 순서를 매기면 흔들리지 않고 시작할 수 있어요.",
        mission: '오늘 할 일 중 가장 급하고 중요한 걸 딱 하나만 골라 적어보세요',
        type: 'text',
    },
    {
        tip: "계획은 세우는 것보다 지키는 게 어려워요. 하루 끝에 '오늘 계획대로 됐나?' 딱 한 줄만 확인해도 다음 계획이 훨씬 정확해져요.",
        mission: '자기 전에 오늘 계획한 걸 몇 % 지켰는지 스스로 점수를 적어보세요',
        type: 'text',
    },
    {
        tip: '계획을 1분 단위로 빡빡하게 짜면 며칠 못 가 지쳐요. 쉬는 시간, 밥 먹는 시간까지 넉넉하게 넣어야 진짜 지킬 수 있는 계획이 돼요.',
        mission: "내일 계획에 '쉬는 시간' 딱 한 칸을 미리 정해서 넣어보세요",
        type: 'check',
    },
    {
        tip: "밀린 일을 그날그날 억지로 끼워 넣으면 계획 전체가 무너져요. 주말이나 저녁 시간에 '보충 시간'을 따로 비워두면 흔들려도 다시 회복할 수 있어요.",
        mission: "이번 주 계획에 30분짜리 '보충 시간'을 하나 미리 비워두세요",
        type: 'check',
    },
    {
        tip: '너무 큰 목표는 시작하기부터 막막해요. 5분 안에 끝낼 수 있는 작은 단위로 쪼개면 훨씬 쉽게 시작할 수 있어요.',
        mission: '오늘 할 일 중 가장 부담스러운 걸 작은 단계로 쪼개서 적어보세요',
        type: 'text',
    },
    {
        tip: "계획을 세울 때 '왜 이걸 하는지'가 빠지면 금방 흐지부지돼요. 그 계획이 나한테 왜 필요한지 한 문장만 떠올려도 실천력이 달라져요.",
        mission: '오늘 계획 중 하나를 고르고, 그걸 왜 하는지 한 문장으로 적어보세요',
        type: 'text',
    },
    {
        tip: "계획을 못 지켰을 때 자책만 하면 다음 계획도 흐트러져요. '왜 못 지켰는지' 원인 하나만 짚고 넘어가면 다음번엔 더 나아져요.",
        mission: '최근에 못 지킨 계획 하나를 떠올리고, 그 이유를 한 줄로 적어보세요',
        type: 'text',
    },
];

function todayKey() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// 날짜 기반으로 매일 자동으로 팁이 바뀌도록 (연중 몇 번째 날인지로 인덱스 계산)
function getTodayTipIndex() {
    const d = new Date();
    const dayOfYear = Math.floor((d - new Date(d.getFullYear(), 0, 0)) / 86400000);
    return dayOfYear % PLANNING_TIPS.length;
}

function loadMissionState() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        return raw ? JSON.parse(raw) : {};
    } catch (e) {
        return {};
    }
}

function saveMissionState(state) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function PlanningTipCardView() {
    return `
        <div class="planning-tip-box">
            <div class="homework-header-row">
                <h2>🗺️ 계획성 UP</h2>
                <button type="button" id="planning-tip-next-btn" class="planning-tip-next-btn" title="다른 팁 보기">🔄</button>
            </div>
            <p class="planning-tip-text" id="planning-tip-text"></p>
            <div class="planning-mission-box" id="planning-mission-box"></div>
        </div>
    `;
}

export function initPlanningTipCard() {
    const textEl = document.getElementById('planning-tip-text');
    const missionBox = document.getElementById('planning-mission-box');
    const nextBtn = document.getElementById('planning-tip-next-btn');
    if (!textEl || !missionBox || !nextBtn) return;

    let index = getTodayTipIndex();
    const state = loadMissionState();
    let saveTimer = null;

    function render() {
        const item = PLANNING_TIPS[index];
        textEl.textContent = item.tip;
        const key = `${todayKey()}-${index}`;

        if (item.type === 'check') {
            // ✅ 체크형: 그냥 실천했는지 여부만 확인하면 되는 미션
            const checked = !!state[key];
            missionBox.innerHTML = `
                <label class="planning-mission-check-row">
                    <input type="checkbox" id="planning-mission-check" ${checked ? 'checked' : ''}>
                    <span class="planning-mission-text">${item.mission}</span>
                </label>
            `;
            document.getElementById('planning-mission-check').addEventListener('change', (e) => {
                state[key] = e.target.checked;
                saveMissionState(state);
            });
        } else {
            // ✅ 입력형: 짧게 뭔가 적어야 하는 미션
            const savedValue = (state[key] || '').replace(/"/g, '&quot;');
            missionBox.innerHTML = `
                <span class="planning-mission-text">${item.mission}</span>
                <div class="planning-mission-input-row">
                    <input type="text" id="planning-mission-input" class="planning-mission-input" placeholder="여기에 적어보세요" value="${savedValue}">
                    <span id="planning-mission-save-badge" class="planning-mission-save-badge">저장완료 ✨</span>
                </div>
            `;
            const input = document.getElementById('planning-mission-input');
            const badge = document.getElementById('planning-mission-save-badge');
            input.addEventListener('input', () => {
                clearTimeout(saveTimer);
                saveTimer = setTimeout(() => {
                    state[key] = input.value;
                    saveMissionState(state);
                    if (badge) {
                        badge.classList.add('show');
                        setTimeout(() => badge.classList.remove('show'), 1200);
                    }
                }, 500); // 입력 멈추고 0.5초 후 저장
            });
        }
    }

    nextBtn.addEventListener('click', () => {
        index = (index + 1) % PLANNING_TIPS.length;
        render();
    });

    render();
}
