export const STORAGE_KEY = 'yerin_competency_history';

// 이미지 속 KPI 표를 그대로 데이터로 옮긴 것.
// kpi 3개는 곧 설문 문항 3개로 사용됩니다.
export const TRAITS = [
    { id: 'meta', category: '인지적', name: '메타인지', def: '자신의 학습 과정을 점검하고 조절하는 고차원적 사고', kpi: [
        '학습 후 오답 원인을 분류한다', '왜 틀렸는지 그 이유를 기록한다', '틀린 문제를 다시 풀어보고 확인한다'
    ]},
    { id: 'deep', category: '인지적', name: '심층 학습 전략', def: '단순 암기를 넘어 개념 간 연결을 시도하는 사고', kpi: [
        '교과 내용을 자신만의 언어로 요약한다', '마인드맵 등으로 개념 간 연결을 시도한다', '배운 내용을 친구에게 설명해 본다'
    ]},
    { id: 'selfdirected', category: '인지적', name: '자기주도성', def: '스스로 학습 목표를 수립하고 이행하는 자율적 성향', kpi: [
        '주간 학습 계획표를 작성한다', '계획 대비 달성률을 매주 점검한다', '부족한 학습량을 스스로 보완한다'
    ]},
    { id: 'grit', category: '정서적', name: '그릿(Grit)', def: '장기적 목표를 향한 열정과 끈기', kpi: [
        '장기 학습 목표를 명확히 세운다', '공부가 힘들 때도 계획을 유지한다', '중도 포기 없이 과제를 끝까지 완수한다'
    ]},
    { id: 'selfefficacy', category: '정서적', name: '자기효능감', def: '과제를 성공적으로 수행할 수 있다는 믿음', kpi: [
        '어려운 과제를 해결 가능한 수준으로 나눈다', '자신의 과거 성공 경험을 상기한다', '과제 수행 전 성공 가능성을 높게 평가한다'
    ]},
    { id: 'resilience', category: '정서적', name: '학습탄력성', def: '실패 상황을 정서적으로 회복하고 개선하는 능력', kpi: [
        '성적 하락 시 감정 상태를 관리한다', '실패 원인을 객관적으로 분석한다', '다음 계획에 수정된 전략을 적용한다'
    ]},
    { id: 'interest', category: '정서적', name: '학습 흥미', def: '학습 내용 자체에서 가치와 즐거움을 느끼는 태도', kpi: [
        '교과 관련 심화 자료를 스스로 찾아본다', '수업 중 궁금한 점을 질문으로 메모한다', '학습 내용을 실생활에 적용해보려 한다'
    ]},
    { id: 'internalization', category: '정서적', name: '목표 내재화', def: '외부의 기대나 보상을 자신의 내적 목표로 일치시킴', kpi: [
        '외부의 기대를 진로와 연결해 해석한다', '학업의 목적을 스스로 정의한다', '외부의 압박 상황에서도 의지를 유지한다'
    ]},
    { id: 'timemanagement', category: '행동적', name: '시간 관리', def: '우선순위에 따라 시간을 전략적으로 배분하는 역량', kpi: [
        '중요도에 따라 과제 우선순위를 정한다', '시간 블록화(Time-blocking)를 실천한다', '학습 시간 준수 여부를 기록한다'
    ]},
    { id: 'helpseeking', category: '행동적', name: '도움 구하기', def: '적절한 자원(교사, 자료 등)을 적극적으로 활용하는 능력', kpi: [
        '스스로 고민 후 질문할 내용을 정리한다', '적절한 조언자를 찾아 적극 질문한다', '받은 피드백을 학습 과정에 즉시 반영한다'
    ]},
    { id: 'envcontrol', category: '행동적', name: '환경 통제', def: '집중을 방해하는 외부 환경을 물리적으로 제거함', kpi: [
        '스마트폰을 학습 중 물리적으로 분리한다', '최적의 학습 환경(책상 정돈 등)을 조성한다', '집중력을 깨뜨리는 요인을 사전 제거한다'
    ]}
];

export const CATEGORY_ORDER = ['인지적', '정서적', '행동적'];
export const CATEGORY_CLASS = { '인지적': 'cat-cognitive', '정서적': 'cat-emotional', '행동적': 'cat-behavioral' };

export const LIKERT_LABELS = ['전혀 아니다', '아니다', '보통이다', '그렇다', '매우 그렇다'];

// 전체 33문항 (11개 특성 x 3문항)
export const QUESTIONS = TRAITS.flatMap(trait =>
    trait.kpi.map((text, qIndex) => ({ traitId: trait.id, traitName: trait.name, qIndex, text }))
);

export function loadHistory() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        return raw ? JSON.parse(raw) : [];
    } catch (e) {
        return [];
    }
}

export function saveHistory(history) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
}

export function getRanked(latest) {
    const list = TRAITS.map(trait => ({
        ...trait,
        score: latest.scores[trait.id] ?? 0
    }));
    const sorted = list.slice().sort((a, b) => b.score - a.score);
    return {
        strongest: sorted.slice(0, 3),
        weakest: sorted.slice(-3).reverse()
    };
}