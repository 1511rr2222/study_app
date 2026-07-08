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
        photos: row.photos || []
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
    if ('done' in patch) dbPatch.done = patch.done;
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