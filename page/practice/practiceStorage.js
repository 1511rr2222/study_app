import { supabase } from '../../supabaseClient.js';

/**
 * 연습을 시작하는 시점에 practice_records에 row 하나를 생성.
 * 역량마다 답변 구조가 다르므로 answers는 자유 형태의 객체(jsonb)로 받는다.
 *
 * @param {string} traitId - 'meta' | 'deep' | 'grit' ...
 * @param {object} answers - 역량별 고정 질문 답변 (예: { subjectUnit, mistakeType, priorKnowledge })
 * @returns {Promise<string|null>} 생성된 record의 id, 실패하거나 비로그인 상태면 null
 */
export async function createPracticeRecord(traitId, answers) {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return null; // 로그인 안 된 상태면 저장은 건너뜀 (연습 자체는 계속 진행)

        const { data, error } = await supabase
            .from('practice_records')
            .insert({
                user_id: user.id,
                trait_id: traitId,
                answers,
                messages: []
            })
            .select()
            .single();

        if (error) {
            console.error('연습 기록 생성 실패:', error);
            return null;
        }
        return data.id;
    } catch (err) {
        console.error('연습 기록 생성 중 오류:', err);
        return null;
    }
}

/**
 * practice_records row를 부분 업데이트.
 * answers/messages/isDone 중 전달된 필드만 갱신한다.
 * (deep처럼 여러 단계에 걸쳐 answers가 계속 늘어나는 역량에서 사용)
 *
 * @param {string|null} recordId
 * @param {{ answers?: object, messages?: Array, isDone?: boolean }} updates
 */
export async function updatePracticeRecord(recordId, updates = {}) {
    if (!recordId) return;
    const { answers, messages, isDone } = updates;

    const payload = { updated_at: new Date().toISOString() };
    if (answers !== undefined) payload.answers = answers;
    if (messages !== undefined) payload.messages = messages;
    if (isDone !== undefined) payload.is_done = isDone;

    try {
        const { error } = await supabase
            .from('practice_records')
            .update(payload)
            .eq('id', recordId);

        if (error) console.error('연습 기록 업데이트 실패:', error);
    } catch (err) {
        console.error('연습 기록 업데이트 중 오류:', err);
    }
}

/**
 * 매 턴마다 대화 기록(및 완료 여부)만 업데이트하는 축약형.
 * (메타인지처럼 answers가 한 번만 저장되고 이후엔 messages만 갱신되는 경우)
 *
 * @param {string|null} recordId
 * @param {{ messages: Array, isDone: boolean }} progress
 */
export async function savePracticeProgress(recordId, { messages, isDone }) {
    return updatePracticeRecord(recordId, { messages, isDone });
}