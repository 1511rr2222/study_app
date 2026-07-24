import { supabase } from '../../supabaseClient.js';

export const PHOTO_BUCKET = 'homework-photos';

export async function uploadPhoto(file, userId, itemId) {
     if (!file || file.size === 0) {
        throw new Error('사진을 제대로 불러오지 못했어요. 와이파이 연결 상태에서 다시 시도해주세요.');
    }

    const ext = (file.name.split('.').pop() || 'jpg').toLowerCase();
    const path = `${userId}/${itemId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
    const arrayBuffer = await file.arrayBuffer();

    const { error } = await supabase.storage.from(PHOTO_BUCKET).upload(path, arrayBuffer, {
        contentType: file.type || 'image/jpeg',
        upsert: false,
    });

    if (error) {
        const msg = (error.message || '').toLowerCase();
        if (msg.includes('jwt') || msg.includes('row-level security') || msg.includes('unauthorized')) {
            throw new Error('로그인 세션에 문제가 있어요. 로그아웃 후 다시 로그인해주세요.');
        }
        throw error;
    }

    const { data } = supabase.storage.from(PHOTO_BUCKET).getPublicUrl(path);
    return data.publicUrl;
}

function pathFromPublicUrl(url) {
    const marker = `/${PHOTO_BUCKET}/`;
    const idx = url.indexOf(marker);
    return idx === -1 ? null : url.slice(idx + marker.length);
}

export async function removePhotoFromStorage(url) {
    const path = pathFromPublicUrl(url);
    if (!path) return;
    const { error } = await supabase.storage.from(PHOTO_BUCKET).remove([path]);
    if (error) console.error('사진 삭제 실패(스토리지):', error);
}