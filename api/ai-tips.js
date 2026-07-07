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
    const cleaned = rawText.replace(/```json|```/g, '').trim();

    let tips;   
    try {
    tips = JSON.parse(cleaned);
    } catch (e) {
    console.error('JSON 파싱 실패:', rawText);
    tips = ['AI 응답을 처리하는 중 문제가 발생했어요.'];
    }

    return res.status(200).json({ tips });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ error: 'AI 응답 생성 중 오류가 발생했습니다.' });
    }
}