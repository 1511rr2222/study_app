const AI_ENDPOINT = '/api/ai-tips';

export async function fetchAiTips(payload) {
    const response = await fetch(AI_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    });

    if (!response.ok) {
        throw new Error(`AI 서버 응답 오류 (status: ${response.status})`);
    }

    const data = await response.json();
    return data.tips;
}