// Vercel Serverless Function
//
// 프론트엔드(page/competencyPractice.js)에서 아래 형식으로 요청을 보냅니다:
// POST /api/competency-coach
// body: {
//   traitId: 'meta',
//   mode: 'retry',
//   image: '<base64 문자열, data: 접두사 제외>',
//   context: { subjectUnit, mistakeType, priorKnowledge },  // 학생이 적은 고정 질문 3개 답변
//   history: [ { role: 'ai' | 'student', text: string }, ... ],  // 지금까지의 대화 기록
//   studentInput: string | null   // 이번 턴에 학생이 새로 입력한 내용 (첫 요청이면 null)
// }
//
// 이 함수는 상태를 저장하지 않습니다(stateless). 매 요청마다 프론트가
// 전체 대화 기록(history)을 함께 보내주면, 그 기록을 바탕으로 매번
// OpenAI 대화 메시지 배열을 새로 구성해서 다음 스텝을 생성합니다.
//
// 응답 형식: { stepMessage: string, isFinal: boolean }

const MAX_RETRY_TURNS = 5;

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'POST 요청만 허용됩니다.' });
    }

    const { traitId, mode, image, context, history = [], studentInput = null } = req.body || {};

    if (!image) {
        return res.status(400).json({ error: '이미지가 필요합니다.' });
    }

    if (mode !== 'retry') {
        return res.status(400).json({ error: '지원하지 않는 mode 입니다.' });
    }

    // 지금까지 AI가 진행한 스텝 수(=현재 요청으로 만들어질 턴 번호)
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
3. 말투는 친근하고 다정한 한국어 존댓말로, 중고등학생이 이해하기 쉽게 작성하세요.
4. 한 번에 여러 단계를 다 풀어주지 말고, 딱 한 단계만 제시하세요.

현재 턴: ${currentTurn} / 최대 ${MAX_RETRY_TURNS}턴
${shouldWrapUp
    ? '이번이 마지막 턴입니다. 지금까지의 대화를 바탕으로 전체 풀이 과정을 자연스럽게 정리하고, 최종 정답을 알려주면서 학생을 격려하는 마무리 메시지를 작성하세요. isFinal은 반드시 true로 설정하세요.'
    : '아직 마지막 턴이 아닙니다. 빈칸이 포함된 다음 한 단계만 제시하고 isFinal은 false로 설정하세요.'}

다른 설명 없이 아래 JSON 형식으로만 응답하세요:
{"stepMessage": "...", "isFinal": true 또는 false}
`.trim();

    // 대화 히스토리를 OpenAI 메시지 형식으로 변환
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

    try {
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
            },
            body: JSON.stringify({
                model: 'gpt-4o-mini',
                messages,
                temperature: 0.7
            })
        });

        const data = await response.json();
        const rawText = data.choices?.[0]?.message?.content || '{}';
        const cleaned = rawText.replace(/```json|```/g, '').trim();

        let parsed;
        try {
            parsed = JSON.parse(cleaned);
        } catch (e) {
            console.error('JSON 파싱 실패:', rawText);
            parsed = {
                stepMessage: 'AI 응답을 처리하는 중 문제가 발생했어요. 다시 시도해주세요.',
                isFinal: true
            };
        }

        const stepMessage = parsed.stepMessage || '다음 단계를 불러오지 못했어요. 다시 시도해주세요.';
        const isFinal = Boolean(parsed.isFinal) || shouldWrapUp;

        return res.status(200).json({ stepMessage, isFinal });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ error: 'AI 응답 생성 중 오류가 발생했습니다.' });
    }
}