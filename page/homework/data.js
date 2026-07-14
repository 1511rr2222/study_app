import { supabase } from '../../supabaseClient.js';

let cachedUser = null;

export async function getUser() {
    if (cachedUser) return cachedUser;
    const { data: { user } } = await supabase.auth.getUser();
    cachedUser = user;
    return user;
}

// DB row(snake_case) → 기존 렌더링 코드가 쓰던 형태(camelCase)로 변환
function mapRow(row) {
    return {
        id: row.id,
        content: row.content,
        lessonDate: row.lesson_date,
        dueDate: row.due_date,
        done: row.done,
        photos: row.photos || [],
        completedAt: row.completed_at // ✅ 완료 처리한 시점 (기한초과 완료 여부 판단용)
    };
}

export async function loadData() {
    const user = await getUser();
    if (!user) return [];

    const { data, error } = await supabase
        .from('homework')
        .select('*')
        .eq('user_id', user.id)
        .order('due_date', { ascending: true });

    if (error) {
        console.error('숙제 목록 로드 실패:', error);
        return [];
    }
    return (data || []).map(mapRow);
}

export async function insertItem({ lessonDate, dueDate, content }) {
    const user = await getUser();
    if (!user) return null;

    const { data, error } = await supabase
        .from('homework')
        .insert({
            user_id: user.id,
            content,
            lesson_date: lessonDate,
            due_date: dueDate,
            done: false,
            photos: []
        })
        .select()
        .single();

    if (error) {
        console.error('숙제 추가 실패:', error);
        alert('숙제를 추가하는 중 문제가 생겼어요. 다시 시도해주세요.');
        return null;
    }
    return mapRow(data);
}

export async function updateItem(id, patch) {
    const dbPatch = {};
    if ('done' in patch) {
        dbPatch.done = patch.done;
        // ✅ 완료 처리하는 순간의 시각을 기록해두고, 완료 취소하면 다시 비움
        //    (마감일과 비교해서 "기한 넘긴 뒤에 완료했는지" 판단하는 데 씀)
        dbPatch.completed_at = patch.done ? new Date().toISOString() : null;
    }
    if ('photos' in patch) dbPatch.photos = patch.photos;
    if ('content' in patch) dbPatch.content = patch.content;
    if ('lessonDate' in patch) dbPatch.lesson_date = patch.lessonDate;
    if ('dueDate' in patch) dbPatch.due_date = patch.dueDate;

    const { error } = await supabase.from('homework').update(dbPatch).eq('id', id);
    if (error) {
        console.error('숙제 수정 실패:', error);
        alert('저장 중 문제가 생겼어요. 다시 시도해주세요.');
        return false;
    }
    return true;
}

export async function deleteItemRow(id) {
    const { error } = await supabase.from('homework').delete().eq('id', id);
    if (error) {
        console.error('숙제 삭제 실패:', error);
        alert('삭제 중 문제가 생겼어요. 다시 시도해주세요.');
    }
}

// ✅ 나를 검사해주는(reviewer) 친구가 몇 명 연결되어 있는지 - 1명 이상이면 본인 셀프체크를 막음
export async function countReviewers(userId) {
    const { count, error } = await supabase
        .from('homework_reviewers')
        .select('*', { count: 'exact', head: true })
        .eq('student_id', userId);

    if (error) {
        console.error('연결된 친구 확인 실패:', error);
        return 0;
    }
    return count || 0;
}

// ✅ 친구(student_id = friendUserId)의 숙제 목록 (내가 그 친구의 reviewer로 연결되어 있어야 RLS상 조회 가능)
export async function loadFriendHomework(friendUserId) {
    const { data, error } = await supabase
        .from('homework')
        .select('*')
        .eq('user_id', friendUserId)
        .order('due_date', { ascending: true });

    if (error) {
        console.error('친구 숙제 로드 실패:', error);
        return [];
    }
    return (data || []).map(mapRow);
}

// ✅ 친구의 숙제를 인증(승인) - 실제 처리는 Supabase 함수(RPC)가 권한 확인까지 다 함
export async function approveItem(id) {
    const { error } = await supabase.rpc('approve_homework', { item_id: id });
    if (error) {
        console.error('인증 실패:', error);
        alert('인증하는 중 문제가 생겼어요. 다시 시도해주세요.');
        return false;
    }
    return true;
}
