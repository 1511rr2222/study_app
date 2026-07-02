const AI_ENDPOINT = '/api/ai-tips';

/**
 * Vercel에 배포할 서버(/api/ai-tips)를 호출합니다.
 * 요청 형식: { weakTraits: [{ name, score, def }], strongTraits: [{ name, score, def }] }
 * 기대하는 응답 형식: { tips: ["...", "...", "..."] }  (특성당 1개씩, 보통 3개)
 *
 * 서버가 아직 배포되지 않았다면 404/네트워크 에러가 발생하는데,
 * 이 경우 호출한 쪽(competency.js)에서 안내 메시지를 보여줍니다.
 */
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