import { loadFriendHomework, approveItem } from './homework/data.js';
import { getDDayLabel, sortForDisplay, escapeHtml } from './homework/utils.js';

export function FriendHomeworkPageView() {
    return `
        <div class="dashboard-container">
            <button type="button" id="friend-hw-back-btn" class="homework-back-btn">← 친구 목록으로</button>
            <div class="hero-box">
                <h2 id="friend-hw-title">숙제 인증하기</h2>
                <p class="homework-notice">사진을 확인하고, 완료된 숙제는 체크해서 인증해주세요!</p>
                <div id="friend-hw-list"><p class="homework-empty">불러오는 중...</p></div>
            </div>
        </div>
    `;
}

// friend: { id, name } — buddies.js에서 친구 목록 클릭 시 넘겨줌
export async function initFriendHomeworkPage(friend, onBack) {
    document.getElementById('friend-hw-back-btn').addEventListener('click', onBack);

    const titleEl = document.getElementById('friend-hw-title');
    if (titleEl && friend?.name) titleEl.textContent = `${friend.name}의 숙제 인증하기`;

    await renderList();

    async function renderList() {
        const listEl = document.getElementById('friend-hw-list');
        if (!listEl) return;
        listEl.innerHTML = `<p class="homework-empty">불러오는 중...</p>`;

        const data = await loadFriendHomework(friend.id);
        const sorted = sortForDisplay(data);

        if (sorted.length === 0) {
            listEl.innerHTML = `<p class="homework-empty">아직 등록된 숙제가 없어요.</p>`;
            return;
        }

        listEl.innerHTML = `
            <div class="homework-list">
                ${sorted.map(item => renderFriendItem(item)).join('')}
            </div>
        `;

        listEl.querySelectorAll('.friend-hw-checkbox').forEach(cb => {
            cb.addEventListener('change', async (e) => {
                const id = e.target.dataset.id;
                e.target.disabled = true;
                const ok = await approveItem(id);
                if (!ok) e.target.disabled = false;
                renderList();
            });
        });

        // 사진은 일단 새 탭에서 원본 크게 보기 (간단하게 처리)
        listEl.querySelectorAll('.friend-hw-photo').forEach(img => {
            img.addEventListener('click', () => {
                window.open(img.dataset.src, '_blank');
            });
        });
    }
}

function renderFriendItem(item) {
    const photos = item.photos || [];
    const canApprove = photos.length > 0 && !item.done;
    const statusClass = item.done ? 'done' : (photos.length > 0 ? 'ready' : 'waiting');
    const statusText = item.done ? '인증완료' : (photos.length > 0 ? '인증 대기중' : '사진 없음');

    return `
        <div class="homework-item ${item.done ? 'done' : ''}">
            <div class="homework-item-row">
                <input
                    type="checkbox"
                    class="friend-hw-checkbox"
                    data-id="${item.id}"
                    ${item.done ? 'checked disabled' : ''}
                    ${!canApprove && !item.done ? 'disabled' : ''}
                >
                <span class="homework-item-content">${escapeHtml(item.content)}</span>
                <span class="homework-dday">${getDDayLabel(item.dueDate)}</span>
                <span class="homework-status-tag ${statusClass}">${statusText}</span>
            </div>
            ${photos.length > 0 ? `
                <div class="homework-photo-list">
                    ${photos.map(src => `
                        <div class="homework-photo-thumb">
                            <img src="${src}" class="friend-hw-photo" data-src="${src}" alt="인증사진">
                        </div>
                    `).join('')}
                </div>
            ` : ''}
        </div>
    `;
}
