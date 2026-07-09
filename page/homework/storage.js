import { supabase } from '../../supabaseClient.js';

export const PHOTO_BUCKET = 'homework-photos';

export async function uploadPhoto(file, userId, itemId) {
    const ext = (file.name.split('.').pop() || 'jpg').toLowerCase();
    const path = `${userId}/${itemId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

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