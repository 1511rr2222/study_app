import { loadData, updateItem, deleteItemRow, getUser } from './data.js';
import { uploadPhoto, removePhotoFromStorage } from './storage.js';
import { setEditingId } from './editState.js';
import { openLightbox } from './lightbox.js';

export function attachCheckboxEvents(container, onChange) {
    container.querySelectorAll('.homework-item input[type="checkbox"]').forEach(checkbox => {
        checkbox.addEventListener('change', async (e) => {
            const id = e.target.dataset.id;
            const wasChecked = e.target.checked;

            e.target.disabled = true; // 저장 중 중복 클릭 방지

            const data = await loadData();
            const current = data.find(item => item.id === id);

            // 완료로 체크하려는데 인증사진이 없으면 막음 (disabled 속성의 이중 안전장치)
            if (wasChecked && (!current || !current.photos || current.photos.length === 0)) {
                alert('완료 처리하기 전에 인증사진을 1장 이상 올려주세요!');
                onChange();
                return;
            }

            const ok = await updateItem(id, { done: wasChecked });
            if (!ok) {
                onChange();
                return;
            }
            onChange();
        });
    });
}

export function attachPhotoEvents(container, onChange) {
    container.querySelectorAll('.homework-photo-input').forEach(input => {
        input.addEventListener('change', async (e) => {
            const id = e.target.dataset.id;
            const files = Array.from(e.target.files || []);
            if (files.length === 0) return;

            const label = e.target.closest('.homework-photo-upload-btn');
            if (label) label.style.opacity = '0.5';

            try {
                const user = await getUser();
                if (!user) throw new Error('로그인이 필요해요.');

                const uploadedUrls = await Promise.all(
                    files.map(file => uploadPhoto(file, user.id, id))
                );

                const data = await loadData();
                const current = data.find(item => item.id === id);
                const newPhotos = [...(current?.photos || []), ...uploadedUrls];

                await updateItem(id, { photos: newPhotos });
                onChange();
            } catch (err) {
                console.error('사진 업로드 실패:', err);
                alert('사진을 업로드하는 중 문제가 생겼어요. 다시 시도해주세요.');
                onChange();
            }
        });
    });

    // ✅ 썸네일 클릭 시 라이트박스로 크게 보기
    container.querySelectorAll('.homework-photo-img').forEach(img => {
        img.addEventListener('click', () => {
            openLightbox(img.dataset.src);
        });
    });

    container.querySelectorAll('.homework-photo-remove').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const id = e.target.dataset.id;
            const index = Number(e.target.dataset.index);

            const data = await loadData();
            const current = data.find(item => item.id === id);
            if (!current) return;

            const removedUrl = current.photos[index];
            const newPhotos = current.photos.filter((_, i) => i !== index);

            await updateItem(id, { photos: newPhotos });
            if (removedUrl) await removePhotoFromStorage(removedUrl);
            onChange();
        });
    });
}

export function attachItemActionEvents(container, onChange) {
    container.querySelectorAll('.homework-edit-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            setEditingId(e.target.dataset.id);
            onChange();
        });
    });

    container.querySelectorAll('.homework-cancel-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            setEditingId(null);
            onChange();
        });
    });

    container.querySelectorAll('.homework-delete-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const id = e.target.dataset.id;
            if (!confirm('이 숙제를 삭제할까요?')) return;

            const data = await loadData();
            const current = data.find(item => item.id === id);

            await deleteItemRow(id);
            if (current?.photos?.length) {
                await Promise.all(current.photos.map(url => removePhotoFromStorage(url)));
            }
            onChange();
        });
    });

    container.querySelectorAll('.homework-edit-form').forEach(form => {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const id = form.dataset.id;
            const lessonDate = form.lessonDate.value;
            const dueDate = form.dueDate.value;
            const content = form.content.value.trim();
            if (!content || !lessonDate || !dueDate) return;

            // 마감일이 수업일보다 빠르면 안내
            if (dueDate < lessonDate) {
                alert('마감일은 수업일보다 빠를 수 없어요. 날짜를 다시 확인해주세요!');
                return;
            }

            const ok = await updateItem(id, { lessonDate, dueDate, content });
            if (ok) setEditingId(null);
            onChange();
        });
    });
}