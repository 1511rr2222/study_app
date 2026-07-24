import { loadData, updateItem, deleteItemRow, getUser, abandonItem } from './data.js';
import { uploadPhoto, removePhotoFromStorage } from './storage.js';
import { setEditingId } from './editState.js';
import { toggleExpanded } from './expandState.js';
import { toggleDateGroup } from './dateGroupState.js';
import { openLightbox } from './lightbox.js';

export function attachCheckboxEvents(container, onChange) {
    container.querySelectorAll('.homework-item input[type="checkbox"]').forEach(checkbox => {
        checkbox.addEventListener('change', async (e) => {
            const id = e.target.dataset.id;
            const wasChecked = e.target.checked;

            e.target.disabled = true; 

            const data = await loadData();
            const current = data.find(item => item.id === id);

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
                alert('사진 업로드 실패' + err.message );
                onChange();
            }
        });
    });

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

    // ✅ 미완료 처리 - 되돌릴 수 없음을 확인 문구에 명시
    container.querySelectorAll('.homework-abandon-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const id = e.target.dataset.id;
            if (!confirm('이 숙제를 미완료로 처리할까요? 되돌릴 수 없어요.')) return;

            const ok = await abandonItem(id);
            if (ok) onChange();
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
            const dueDate = form.dueDate.value;
            const content = form.content.value.trim();
            if (!content || !dueDate) return;

            const ok = await updateItem(id, { lessonDate: dueDate, dueDate, content });
            if (ok) setEditingId(null);
            onChange();
        });
    });
}

// ✅ 접힘 한 줄 ↔ 펼침 상세 토글.
// 체크박스를 클릭한 경우는 제외(체크박스는 자기 자신의 change 이벤트로만 동작해야 함).
// 화면을 다시 그리지 않고 클래스만 토글해서 즉각적으로 반응하게 하고,
// expandState 모듈에도 기록해서 다른 항목 체크/사진추가로 목록이 다시 그려져도
// 펼쳐둔 카드가 그대로 펼쳐진 채로 남아있게 한다.
export function attachItemExpandEvents(container) {
    container.querySelectorAll('.homework-item-row').forEach(row => {
        row.addEventListener('click', (e) => {
            if (e.target.closest('input[type="checkbox"]')) return;

            const id = row.dataset.id;
            toggleExpanded(id);

            const item = row.closest('.homework-item');
            if (item) item.classList.toggle('homework-item-expanded');
        });
    });
}

// ✅ 날짜별 그룹 헤더 클릭 시 펼침/접힘 토글 (개별 숙제 항목 펼침과는 완전히 별개)
export function attachDateGroupEvents(container) {
    container.querySelectorAll('.homework-date-group-toggle').forEach(btn => {
        btn.addEventListener('click', () => {
            const group = btn.closest('.homework-date-group');
            const dateKey = group.dataset.dateKey;
            toggleDateGroup(dateKey);
            group.classList.toggle('homework-date-group-open');
        });
    });
}