const STORAGE_KEY = 'yerin_planning_mission_state';

export const PLANNING_TIPS = [
    {
        tip: "'오늘 수학 공부해야지'처럼 막연한 계획은 지키기 어려워요. \n언제부터 언제까지, 뭘 할지 시간까지 딱 정해두면 훨씬 잘 지켜져요.",
        mission: '오늘 할 일 하나를 골라서 시작 시간과 끝나는 시간을 정해보세요 (예: 19:00~19:50 수학 3단원)',
    },
    {
        tip: "할 일이 많을수록 뭐부터 해야 할지 헷갈려요. \n'급하고 중요한 것'부터 순서를 매기면 흔들리지 않고 시작할 수 있어요.",
        mission: '오늘 할 일 중 가장 급하고 중요한 걸 딱 하나만 골라 1순위로 정해보세요',
    },
    {
        tip: "계획은 세우는 것보다 지키는 게 어려워요. \n하루 끝에 '오늘 계획대로 됐나?' 딱 한 줄만 확인해도 다음 계획이 훨씬 정확해져요.",
        mission: '자기 전에 오늘 계획한 걸 몇 % 지켰는지 스스로 점수를 매겨보세요',
    },
    {
        tip: '계획을 1분 단위로 빡빡하게 짜면 며칠 못 가 지쳐요. \n쉬는 시간, 밥 먹는 시간까지 넉넉하게 넣어야 진짜 지킬 수 있는 계획이 돼요.',
        mission: "내일 계획에 '쉬는 시간' 딱 한 칸을 미리 정해서 넣어보세요",
    },
    {
        tip: "밀린 일을 그날그날 억지로 끼워 넣으면 계획 전체가 무너져요. \n주말이나 저녁 시간에 '보충 시간'을 따로 비워두면 흔들려도 다시 회복할 수 있어요.",
        mission: "이번 주 계획에 30분짜리 '보충 시간'을 하나 미리 정해보세요",
    },
    {
        tip: '너무 큰 목표는 시작하기부터 막막해요. \n5분 안에 끝낼 수 있는 작은 단위로 쪼개면 훨씬 쉽게 시작할 수 있어요.',
        mission: '오늘 할 일 중 가장 부담스러운 걸 5분 만에 끝낼 수 있는 작은 단계로 쪼개보세요',
    },
    {
        tip: "계획을 세울 때 '왜 이걸 하는지'가 빠지면 금방 흐지부지돼요. \n그 계획이 나한테 왜 필요한지 한 문장만 떠올려도 실천력이 달라져요.",
        mission: '오늘 계획 중 하나를 고르고, 그걸 왜 하는지 한 문장으로 떠올려보세요',
    },
    {
        tip: "계획을 못 지켰을 때 자책만 하면 다음 계획도 흐트러져요. \n'왜 못 지켰는지' 원인 하나만 짚고 넘어가면 다음번엔 더 나아져요.",
        mission: '최근에 못 지킨 계획 하나를 떠올리고, 그 이유를 한 줄로 적어보세요',
    },
];

function todayKey() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

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
            <div class="planning-mission-box">
                <span class="planning-mission-text" id="planning-mission-text"></span>
                <div class="planning-mission-input-row">
                    <input type="text" id="planning-mission-input" class="planning-mission-input" placeholder="여기에 적어보세요">
                    <span id="planning-mission-save-badge" class="planning-mission-save-badge">저장완료 ✨</span>
                </div>
            </div>
        </div>
    `;
}

export function initPlanningTipCard() {
    const textEl = document.getElementById('planning-tip-text');
    const missionTextEl = document.getElementById('planning-mission-text');
    const missionInput = document.getElementById('planning-mission-input');
    const saveBadge = document.getElementById('planning-mission-save-badge');
    const nextBtn = document.getElementById('planning-tip-next-btn');
    if (!textEl || !missionInput || !nextBtn) return;

    let index = getTodayTipIndex();
    const state = loadMissionState();
    let saveTimer = null;

    function render() {
        const item = PLANNING_TIPS[index];
        textEl.textContent = item.tip;
        missionTextEl.textContent = item.mission;
        missionInput.value = state[`${todayKey()}-${index}`] || '';
    }

    missionInput.addEventListener('input', () => {
        clearTimeout(saveTimer);
        saveTimer = setTimeout(() => {
            state[`${todayKey()}-${index}`] = missionInput.value;
            saveMissionState(state);

            if (saveBadge) {
                saveBadge.classList.add('show');
                setTimeout(() => saveBadge.classList.remove('show'), 1200);
            }
        }, 500); // 입력 멈추고 0.5초 후 저장
    });

    nextBtn.addEventListener('click', () => {
        index = (index + 1) % PLANNING_TIPS.length;
        render();
    });

    render();
}