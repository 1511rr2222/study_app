import { supabase } from '../../../supabaseClient.js';

const BUCKET = 'study-plans';

function formatDate(iso) {
    const d = new Date(iso);
    return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
}

export function planPhotoBlockHtml(prefix) {
    return `
        <div class="selfdir-photo-upload">
            <input type="file" accept="image/*" id="${prefix}-file-input" class="selfdir-file-input">
            <input type="text" id="${prefix}-label-input" class="selfdir-label-input" placeholder="예: 2026년 7월 / 7월 3주차 / 7월 15일 (선택)">
            <button type="button" id="${prefix}-upload-btn" class="selfdir-save-btn">업로드</button>
        </div>
        <p id="${prefix}-status" class="selfdir-status"></p>
        <div class="selfdir-photo-gallery" id="${prefix}-gallery"></div>
    `;
}

export async function initPlanPhotoBlock(container, prefix, planType, user) {
    const fileInput = container.querySelector(`#${prefix}-file-input`);
    const labelInput = container.querySelector(`#${prefix}-label-input`);
    const uploadBtn = container.querySelector(`#${prefix}-upload-btn`);
    const statusEl = container.querySelector(`#${prefix}-status`);
    const galleryEl = container.querySelector(`#${prefix}-gallery`);

    async function loadGallery() {
        const { data, error } = await supabase
            .from('study_plan_photos')
            .select('id, storage_path, period_label, created_at')
            .eq('user_id', user.id)
            .eq('plan_type', planType)
            .order('created_at', { ascending: false });

        if (error) {
            console.error('학습계획표 목록 로드 실패:', error);
            galleryEl.innerHTML = '<p class="selfdir-empty">목록을 불러오지 못했어요.</p>';
            return;
        }

        if (!data || data.length === 0) {
            galleryEl.innerHTML = '<p class="selfdir-empty">아직 올린 계획표가 없어요.</p>';
            return;
        }

        const withUrls = await Promise.all(data.map(async row => {
            const { data: signed } = await supabase.storage.from(BUCKET).createSignedUrl(row.storage_path, 3600);
            return { ...row, url: signed?.signedUrl || '' };
        }));

        galleryEl.innerHTML = withUrls.map(row => `
            <div class="selfdir-photo-card" data-id="${row.id}">
                ${row.url ? `<img src="${row.url}" alt="학습계획표" class="selfdir-photo-thumb">` : '<div class="selfdir-photo-thumb selfdir-photo-thumb-empty">🖼️</div>'}
                <p class="selfdir-photo-meta">${row.period_label ? row.period_label + ' · ' : ''}${formatDate(row.created_at)}</p>
                <button type="button" class="selfdir-photo-delete" data-id="${row.id}" data-path="${row.storage_path}">삭제</button>
            </div>
        `).join('');

        galleryEl.querySelectorAll('.selfdir-photo-delete').forEach(btn => {
            btn.addEventListener('click', async () => {
                const id = btn.dataset.id;
                const path = btn.dataset.path;
                await supabase.storage.from(BUCKET).remove([path]);
                await supabase.from('study_plan_photos').delete().eq('id', id);
                loadGallery();
            });
        });
    }

    uploadBtn.addEventListener('click', async () => {
        const file = fileInput.files[0];
        if (!file) {
            statusEl.textContent = '사진을 선택해주세요.';
            return;
        }

        statusEl.textContent = '업로드 중...';
        uploadBtn.disabled = true;

        const ext = file.name.split('.').pop();
        const path = `${user.id}/${planType}/${Date.now()}.${ext}`;

        const { error: uploadError } = await supabase.storage.from(BUCKET).upload(path, file);
        if (uploadError) {
            console.error('사진 업로드 실패:', uploadError);
            statusEl.textContent = '업로드 중 문제가 생겼어요.';
            uploadBtn.disabled = false;
            return;
        }

        const { error: insertError } = await supabase.from('study_plan_photos').insert({
            user_id: user.id,
            plan_type: planType,
            storage_path: path,
            period_label: labelInput.value.trim() || null,
        });

        uploadBtn.disabled = false;

        if (insertError) {
            console.error('학습계획표 기록 저장 실패:', insertError);
            statusEl.textContent = '저장 중 문제가 생겼어요.';
            return;
        }

        fileInput.value = '';
        labelInput.value = '';
        statusEl.textContent = '업로드완료 ✨';
        setTimeout(() => { statusEl.textContent = ''; }, 1500);
        loadGallery();
    });

    await loadGallery();
}