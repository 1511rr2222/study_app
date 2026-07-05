// Vercel Serverless Function
//
// 프론트엔드에서 아래 형식으로 요청을 보냅니다:
// POST /api/competency-coach
// body: { traitId, mode, ...역량별 추가 필드 }
//
// 지원하는 조합:
//   traitId: 'meta', mode: 'retry'      → 메타인지 단계별 재풀이 (기존과 동일)
//   traitId: 'deep', mode: 'summarize'  → 심층학습: 내 요약 vs AI 요약 비교
//   traitId: 'deep', mode: 'mindmap'    → 심층학습: 마인드맵 피드백
//   traitId: 'deep', mode: 'explain'    → 심층학습: 소리 내어 설명한 내용 피드백
//
// 이 함수는 상태를 저장하지 않습니다(stateless).

const MAX_RETRY_TURNS = 5;
const OPENAI_MODEL = 'gpt-4o-mini';

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'POST 요청만 허용됩니다.' });
    }

    const { traitId, mode } = req.body || {};

    try {
        if (traitId === 'meta' && mode === 'retry') {
            return await handleMetaRetry(req.body, res);
        }
        if (traitId === 'deep' && mode === 'summarize') {
            return await handleDeepSummarize(req.body, res);
        }
        if (traitId === 'deep' && mode === 'mindmap') {
            return await handleDeepMindmap(req.body, res);
        }
        if (traitId === 'deep' && mode === 'explain') {
            return await handleDeepExplain(req.body, res);
        }
        return res.status(400).json({ error: '지원하지 않는 traitId/mode 조합입니다.' });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ error: 'AI 응답 생성 중 오류가 발생했습니다.' });
    }
}

/* ==================== 공통: OpenAI 호출 + JSON 파싱 ==================== */

async function callOpenAiJson(messages, fallback) {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
        },
        body: JSON.stringify({
            model: OPENAI_MODEL,
            messages,
            temperature: 0.7,
            response_format: { type: 'json_object' }
        })
    });

    if (!response.ok) {
        const errText = await response.text();
        console.error('OpenAI API 에러:', response.status, errText);
        return fallback;
    }

    const data = await response.json();
    const rawText = data.choices?.[0]?.message?.content || '{}';
    
    if (!rawText) {
        console.error('OpenAI 응답에 content가 없음:', JSON.stringify(data));
        return fallback;
    }    
    
    const cleaned = rawText.replace(/```json|```/g, '').trim();

    try {
        return JSON.parse(cleaned);
    } catch (e) {
        console.error('JSON 파싱 실패:', rawText);
        return { ...fallback, stepMessage: rawText, feedback: rawText };
    }
}

/* ==================== 메타인지: 단계별 재풀이 (기존 로직 그대로) ==================== */

async function handleMetaRetry(body, res) {
    const { image, context, history = [], studentInput = null } = body;

    if (!image) {
        return res.status(400).json({ error: '이미지가 필요합니다.' });
    }

    const aiTurnsSoFar = history.filter(h => h.role === 'ai').length;
    const currentTurn = aiTurnsSoFar + 1;
    const shouldWrapUp = currentTurn >= MAX_RETRY_TURNS;

    const contextSummary = `
- 과목/단원: ${context?.subjectUnit || '(입력 없음)'}
- 틀린 이유: ${context?.mistakeType || '(입력 없음)'}
- 필요한 선행 지식(학생이 생각한 것): ${context?.priorKnowledge || '(입력 없음)'}
`.trim();

    const systemPrompt = `
당신은 중고등학생의 메타인지를 길러주는 학습 코치입니다.
학생이 틀린 문제 사진을 보냈고, 아래는 학생이 스스로 적은 사전 답변입니다.

${contextSummary}

절대로 문제의 최종 정답을 한 번에 알려주지 마세요.
대신 풀이 과정을 여러 단계로 잘게 쪼개서, 한 턴에 한 단계씩만 제시하세요.
각 단계는 다음 규칙을 따르세요:
1. 지금까지 학생이 맞게 짚은 부분이 있다면 짧게 인정해주고, 다음 단계로 자연스럽게 이어가세요.
2. 이번 단계의 풀이 과정 일부를 보여주되, 핵심이 되는 식이나 값 하나는 "____"(빈칸)으로 남겨서
   학생이 직접 채우도록 유도하세요.
3. 말투는 친근하고 다정한 한국어 존댓말로 작성하되, "학생님"처럼 딱딱하고 어색한 호칭은
   절대 쓰지 마세요. 호칭 없이 바로 설명을 시작하거나 "좋아요!", "잘 짚었어요" 같은
   자연스러운 감탄사/맞장구로 시작하세요. 마치 옆에서 함께 풀어주는 과외 선생님처럼 대화하듯 쓰세요.
4. 한 번에 여러 단계를 다 풀어주지 말고, 딱 한 단계만 제시하세요.
5. 가독성을 위해 문장을 한 줄에 몰아 쓰지 말고 줄바꿈(\n)으로 구분하세요. 특히 다음 세 부분은
   반드시 서로 다른 줄로 나누세요: (1) 앞 단계에 대한 짧은 반응/격려, (2) 이번 단계 설명,
   (3) 빈칸이 포함된 질문 문장. 문장 사이에는 빈 줄(\n\n)을 넣어 문단처럼 구분해도 좋습니다.

현재 턴: ${currentTurn} / 최대 ${MAX_RETRY_TURNS}턴
${shouldWrapUp
    ? '이번이 마지막 턴입니다. 지금까지의 대화를 바탕으로 전체 풀이 과정을 자연스럽게 정리하고, 최종 정답을 알려주면서 학생을 격려하는 마무리 메시지를 작성하세요. isFinal은 반드시 true로 설정하세요.'
    : '아직 마지막 턴이 아닙니다. 빈칸이 포함된 다음 한 단계만 제시하고 isFinal은 false로 설정하세요.'}

다른 설명 없이 아래 JSON 형식으로만 응답하세요. stepMessage 안의 줄바꿈은 반드시 \n으로
이스케이프해서 유효한 JSON 문자열로 작성하세요:
{"stepMessage": "...", "isFinal": true 또는 false}
`.trim();

    const historyMessages = history.map(item => ({
        role: item.role === 'ai' ? 'assistant' : 'user',
        content: item.text
    }));

    const messages = [
        { role: 'system', content: systemPrompt },
        {
            role: 'user',
            content: [
                { type: 'text', text: '이 문제 사진을 보고, 위 지침에 따라 첫 번째 단계를 알려주세요.' },
                { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${image}` } }
            ]
        },
        ...historyMessages
    ];

    if (studentInput !== null) {
        messages.push({ role: 'user', content: studentInput });
    }

    const parsed = await callOpenAiJson(messages, {
        stepMessage: 'AI 응답을 처리하는 중 문제가 발생했어요. 다시 시도해주세요.',
        isFinal: true
    });

    const stepMessage = parsed.stepMessage || '다음 단계를 불러오지 못했어요. 다시 시도해주세요.';
    const isFinal = Boolean(parsed.isFinal) || shouldWrapUp;

    return res.status(200).json({ stepMessage, isFinal });
}

/* ==================== 심층학습: 내 요약 vs AI 요약 ==================== */

async function handleDeepSummarize(body, res) {
    const { image, videoUrl, studentSummary } = body;

    if (!image && !videoUrl) {
        return res.status(400).json({ error: '이미지 또는 동영상 URL이 필요합니다.' });
    }
    if (!studentSummary) {
        return res.status(400).json({ error: '학생의 요약이 필요합니다.' });
    }

    const commonRules = `
말투는 친근하고 다정한 한국어 존댓말로 작성하되, "학생님"처럼 딱딱한 호칭은 쓰지 마세요.
가독성을 위해 문장을 한 줄에 몰아 쓰지 말고 줄바꿈(\n)으로 구분하세요.
다른 설명 없이 아래 JSON 형식으로만 응답하세요. 줄바꿈은 반드시 \n으로 이스케이프하세요:
{"aiSummary": "...", "feedback": "..."}
`.trim();

    let messages;
    let fallbackAiSummary;

    if (image) {
        // ✅ 사진: 실제로 내용을 보고 정확한 참고 요약을 만들 수 있음
        const systemPrompt = `
당신은 중고등학생의 요약 능력을 길러주는 학습 코치입니다.
학생이 공부한 자료(사진)와, 그것을 본인 언어로 요약한 내용을 보냅니다.

1. 사진 속 내용을 바탕으로 정확하고 간결한 참고 요약을 aiSummary에 작성하세요.
2. 학생의 요약(studentSummary)과 비교해서, 잘 짚은 부분을 먼저 인정해주고
   빠뜨리거나 부정확한 부분이 있다면 부드럽게 짚어주는 feedback을 작성하세요.
   정답을 그대로 알려주기보다는, 무엇을 더 채우면 좋을지 스스로 생각해보게 유도하세요.

${commonRules}
`.trim();

        messages = [
            { role: 'system', content: systemPrompt },
            {
                role: 'user',
                content: [
                    { type: 'text', text: `학생의 요약: "${studentSummary}"\n\n이 사진 속 내용을 바탕으로 위 지침대로 응답해주세요.` },
                    { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${image}` } }
                ]
            }
        ];
        fallbackAiSummary = '요약을 불러오지 못했어요. 다시 시도해주세요.';
    } else {
        // ⚠️ 동영상 URL: 실제 영상을 볼 수 없으므로, 내용의 사실 여부를 판단하지 않고
        // 학생 요약 자체의 구조/완성도만 봐주도록 제한 (허위 정보 생성 방지)
        const systemPrompt = `
당신은 중고등학생의 요약 능력을 길러주는 학습 코치입니다.
학생이 동영상(${videoUrl})을 보고 스스로 요약한 내용을 보냅니다.
당신은 이 동영상을 직접 볼 수 없으므로, 영상의 실제 내용이 맞는지는 절대 판단하거나
지어내지 마세요.

1. aiSummary에는 실제 요약 대신, "동영상 내용은 직접 확인할 수 없어 내용의 사실 여부는
   판단하지 않았어요"라는 취지의 짧은 안내 문장만 넣으세요.
2. feedback에는 학생의 요약(studentSummary)이 구조적으로 잘 되어 있는지
   (핵심어 위주로 정리했는지, 흐름이 논리적인지, 너무 짧거나 문장을 그대로 베낀 것 같지는 않은지)
   에 대해서만 다정하게 코멘트하고, 스스로 다시 확인해볼 만한 질문을 1개 던져주세요.

${commonRules}
`.trim();

        messages = [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: `학생의 요약: "${studentSummary}"\n\n위 지침대로 응답해주세요.` }
        ];
        fallbackAiSummary = '동영상 내용은 직접 확인할 수 없어요.';
    }

    const parsed = await callOpenAiJson(messages, {
        aiSummary: fallbackAiSummary,
        feedback: 'AI 응답을 처리하는 중 문제가 발생했어요. 다시 시도해주세요.'
    });

    return res.status(200).json({
        aiSummary: parsed.aiSummary || fallbackAiSummary,
        feedback: parsed.feedback || '피드백을 불러오지 못했어요. 다시 시도해주세요.'
    });
}

/* ==================== 심층학습: 마인드맵 피드백 ==================== */

async function handleDeepMindmap(body, res) {
    const { mindmap, context } = body;

    if (!mindmap?.topic) {
        return res.status(400).json({ error: '마인드맵 주제가 필요합니다.' });
    }

    const branchList = (mindmap.branches || [])
        .filter(b => b.title?.trim())
        .map(b => `- ${b.title}${b.detail ? `: ${b.detail}` : ''}`)
        .join('\n') || '(작성된 가지 없음)';

    const systemPrompt = `
당신은 중고등학생의 심층 학습(구조화 능력)을 길러주는 학습 코치입니다.
학생이 아래처럼 마인드맵을 정리했습니다.

중심 주제: ${mindmap.topic}
가지 목록:
${branchList}

참고로 학생이 이전에 작성한 요약: "${context?.studentSummary || '(없음)'}"

1. 가지들이 중심 주제와 논리적으로 잘 연결되어 있는지, 빠진 핵심 개념은 없는지 살펴보세요.
2. 잘한 부분을 먼저 인정하고, 보완하면 좋을 점을 다정한 존댓말로 1~2가지 제안하세요.
   "학생님" 같은 딱딱한 호칭은 쓰지 마세요.
3. 가독성을 위해 줄바꿈(\n)으로 문단을 구분하세요.

다른 설명 없이 아래 JSON 형식으로만 응답하세요. 줄바꿈은 \n으로 이스케이프하세요:
{"feedback": "..."}
`.trim();

    const parsed = await callOpenAiJson(
        [{ role: 'system', content: systemPrompt }, { role: 'user', content: '위 마인드맵에 대한 피드백을 작성해주세요.' }],
        { feedback: 'AI 응답을 처리하는 중 문제가 발생했어요. 다시 시도해주세요.' }
    );

    return res.status(200).json({ feedback: parsed.feedback || '피드백을 불러오지 못했어요. 다시 시도해주세요.' });
}

/* ==================== 심층학습: 소리 내어 설명한 내용 피드백 ==================== */

async function handleDeepExplain(body, res) {
    const { transcript, context } = body;

    if (!transcript?.trim()) {
        return res.status(400).json({ error: '설명 내용이 필요합니다.' });
    }

    const systemPrompt = `
당신은 중고등학생의 심층 학습(설명 능력)을 길러주는 학습 코치입니다.
학생이 마이크로 소리 내어 설명한 내용이 텍스트로 변환되어 아래에 주어집니다
(음성 인식 과정에서 오타나 부정확한 부분이 있을 수 있다는 점을 감안하세요).

학생의 설명: "${transcript}"
참고로 학생이 이전에 작성한 요약: "${context?.studentSummary || '(없음)'}"

1. 마치 친구가 설명을 들어준 것처럼, 이해하기 쉬웠는지, 논리적 순서가 있었는지,
   빠뜨린 핵심 내용은 없는지를 다정한 존댓말로 코멘트하세요. "학생님" 같은 딱딱한 호칭은 쓰지 마세요.
2. 잘한 부분을 먼저 인정한 뒤, 보완하면 좋을 점을 1~2가지 제안하세요.
3. 가독성을 위해 줄바꿈(\n)으로 문단을 구분하세요.

다른 설명 없이 아래 JSON 형식으로만 응답하세요. 줄바꿈은 \n으로 이스케이프하세요:
{"feedback": "..."}
`.trim();

    const parsed = await callOpenAiJson(
        [{ role: 'system', content: systemPrompt }, { role: 'user', content: '위 설명에 대한 피드백을 작성해주세요.' }],
        { feedback: 'AI 응답을 처리하는 중 문제가 발생했어요. 다시 시도해주세요.' }
    );

    return res.status(200).json({ feedback: parsed.feedback || '피드백을 불러오지 못했어요. 다시 시도해주세요.' });
}