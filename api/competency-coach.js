// Vercel Serverless Function
// 프론트엔드(page/competencyPractice.js)에서 아래 형식으로 요청을 보냅니다:
// POST /api/competency-coach
// body: {
//   traitId: 'meta',
//   image: '<base64 문자열, data: 접두사 제외>'
// }
//
// 응답 형식: { questions: ["...", "...", "..."] }

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'POST 요청만 허용됩니다.' });
    }

    const { traitId, image } = req.body || {};

    if (!image) {
        return res.status(400).json({ error: '이미지가 필요합니다.' });
    }

    // traitId별로 다른 코칭 방향을 줄 수 있게 분리해둠 (지금은 meta만 사용)
    const systemPrompt = `
당신은 중등, 고등학생을 대상으로 메타인지를 길러주는 학습 코치입니다.
학생이 틀린 문제 사진을 보냈습니다. 절대로 정답이나 풀이 과정을 직접 알려주지 마세요.
대신 학생 스스로 자신의 사고 과정을 되짚어볼 수 있도록 유도하는 질문을 만들어야 합니다.

다음 기준으로 질문 3개를 한국어로 작성하세요:
1. 이 문제를 풀기 위해 필요한 핵심 개념이 무엇인지 스스로 떠올리게 하는 질문
2. 문제에서 중요한 조건이나 정보를 다시 확인하게 하는 질문
3. 어느 단계에서 막혔는지, 왜 그렇게 풀었는지 스스로 설명하게 하는 질문

다른 설명 없이 JSON 배열 형식으로만 응답하세요.
예: ["질문1", "질문2", "질문3"]
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
                messages: [
                    {
                        role: 'user',
                        content: [
                            { type: 'text', text: systemPrompt },
                            {
                                type: 'image_url',
                                image_url: { url: `data:image/jpeg;base64,${image}` }
                            }
                        ]
                    }
                ],
                temperature: 0.7
            })
        });

        const data = await response.json();
        const rawText = data.choices?.[0]?.message?.content || '[]';
        const cleaned = rawText.replace(/```json|```/g, '').trim();
        
        let questions;
        try {
        questions = JSON.parse(cleaned);
        } catch (e) {
        console.error('JSON 파싱 실패:', rawText);
        questions = ['AI 응답을 처리하는 중 문제가 발생했어요. 다시 시도해주세요.'];
        }

        return res.status(200).json({ questions });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ error: 'AI 응답 생성 중 오류가 발생했습니다.' });
    }
}