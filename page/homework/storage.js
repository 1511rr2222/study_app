import { supabase } from '../../supabaseClient.js';

export const PHOTO_BUCKET = 'homework-photos';

export async function uploadPhoto(file, userId, itemId) {
    if (!file || file.size === 0) {
        throw new Error('사진을 제대로 불러오지 못했어요. (iCloud에서 사진이 아직 다운로드 중일 수 있어요) 와이파이 연결 상태에서 다시 시도해주세요.');
    }

    const ext = (file.name.split('.').pop() || 'jpg').toLowerCase();    const path = `${userId}/${itemId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

    const { error } = await supabase.storage.from(PHOTO_BUCKET).upload(path, file);
    if (error) throw error;

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