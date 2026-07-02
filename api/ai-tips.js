// Vercel Serverless Function 예제입니다.
// 실제 프로젝트에서는 이 파일을 프로젝트 루트의 `api/ai-tips.js` 경로에 넣으면
// 자동으로 https://[프로젝트].vercel.app/api/ai-tips 로 배포됩니다.
//
// 사용 전 준비물:
// 1. OpenAI API 키 발급 (https://platform.openai.com/api-keys)
// 2. Vercel 프로젝트 설정 > Environment Variables 에 OPENAI_API_KEY 등록
//
// 프론트엔드(page/aiTips.js)에서 아래와 같은 형식으로 요청을 보냅니다:
// POST /api/ai-tips
// body: {
//   weakTraits: [{ name, score, def }, ...],   // 보완이 필요한 특성 3개
//   strongTraits: [{ name, score, def }, ...]  // 강한 특성 3개
// }
//
// 응답 형식: { tips: ["...", "...", "..."] }

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'POST 요청만 허용됩니다.' });
    }

    const { weakTraits = [], strongTraits = [] } = req.body || {};

    const weakList = weakTraits
        .map(t => `- ${t.name} (${t.score}점, 우수자 기준 100점): ${t.def}`)
        .join('\n');

    const strongList = strongTraits
        .map(t => `- ${t.name} (${t.score}점): ${t.def}`)
        .join('\n');

    const prompt = `
당신은 학생의 학습 역량을 코칭하는 교육 전문가입니다.
아래는 한 학생의 학습 역량 진단 결과입니다 (학습 우수자 기준을 100점으로 봅니다).

[강한 특성]
${strongList}

[보완이 필요한 특성]
${weakList}

보완이 필요한 특성 3개 각각에 대해, 학생이 실제로 실천할 수 있는 구체적이고 다정한 보완 tip을 한 문장씩,
총 3개를 한국어로 작성해주세요. 다른 설명 없이 JSON 배열 형식으로만 응답하세요.
예: ["tip1", "tip2", "tip3"]
`.trim();

    try {
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
            },
            body: JSON.stringify({
                model: 'gpt-4o-mini',
                messages: [{ role: 'user', content: prompt }],
                temperature: 0.7
            })
        });

        const data = await response.json();
        const rawText = data.choices?.[0]?.message?.content || '[]';

        let tips;
        try {
            tips = JSON.parse(rawText);
        } catch (e) {
            // 모델이 JSON이 아닌 텍스트로 응답한 경우를 대비한 안전장치
            tips = [rawText];
        }

        return res.status(200).json({ tips });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ error: 'AI 응답 생성 중 오류가 발생했습니다.' });
    }
}