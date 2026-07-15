import { supabase } from '../supabaseClient.js';
import { openLightbox } from './homework/lightbox.js';

export function FriendHardQuestionsPageView() {
    return `
        <div class="dashboard-container">
            <button type="button" id="fhq-back-btn" class="homework-back-btn">← 친구 목록으로</button>
            <div class="hero-box">
                <h2 id="fhq-title">어려운 문제 도와주기</h2>
                <p class="homework-notice">사진/설명을 보고 풀이를 적어서 저장해주세요!</p>
                <div id="fhq-list"><p class="homework-empty">불러오는 중...</p></div>
            </div>
        </div>
    `;
}

// friend: { id, name }
export async function initFriendHardQuestionsPage(friend, onBack) {
    document.getElementById('fhq-back-btn').addEventListener('click', onBack);

    const titleEl = document.getElementById('fhq-title');
    if (titleEl && friend?.name) titleEl.textContent = `${friend.name}의 어려운 문제`;

    await renderList();

    async function renderList() {
        const listEl = document.getElementById('fhq-list');
        if (!listEl) return;
        listEl.innerHTML = `<p class="homework-empty">불러오는 중...</p>`;

        const { data, error } = await supabase
            .from('hard_questions')
            .select('*')
            .eq('user_id', friend.id)
            .order('created_at', { ascending: false });

        if (error) {
            console.error('친구 어려운 문제 로드 실패:', error);
            listEl.innerHTML = `<p class="homework-empty">불러오지 못했어요.</p>`;
            return;
        }

        if (!data || data.length === 0) {
            listEl.innerHTML = `<p class="homework-empty">아직 등록된 문제가 없어요.</p>`;
            return;
        }

        listEl.innerHTML = data.map(q => `
            <div class="hq-item ${q.answer ? 'answered' : ''}" data-id="${q.id}">
                <div class="hq-item-top">
                    <span class="homework-status-tag ${q.answer ? 'done' : 'ready'}">${q.answer ? '답변완료' : '답변대기'}</span>
                </div>
                ${q.content ? `<p class="hq-item-content">${escapeHtml(q.content)}</p>` : ''}
                ${(q.photos || []).length > 0 ? `
                    <div class="homework-photo-list">
                        ${q.photos.map(src => `<div class="homework-photo-thumb"><img src="${src}" class="fhq-photo" data-src="${src}"></div>`).join('')}
                    </div>
                ` : ''}
                ${q.answer ? `
                    <div class="hq-answer-box">
                        <p class="hq-answer-label">💡 내 풀이</p>
                        <p class="hq-answer-text">${escapeHtml(q.answer)}</p>
                    </div>
                ` : `
                    <div class="fhq-answer-form">
                        <textarea class="fhq-answer-input" placeholder="풀이를 적어주세요"></textarea>
                        <button type="button" class="pink-button fhq-answer-save-btn">풀이 저장</button>
                    </div>
                `}
            </div>
        `).join('');

        listEl.querySelectorAll('.fhq-photo').forEach(img => {
            img.addEventListener('click', () => openLightbox(img.dataset.src));
        });

        listEl.querySelectorAll('.fhq-answer-save-btn').forEach(btn => {
            btn.addEventListener('click', async () => {
                const item = btn.closest('.hq-item');
                const questionId = item.dataset.id;
                const textarea = item.querySelector('.fhq-answer-input');
                const answerText = textarea.value.trim();

                if (!answerText) {
                    alert('풀이를 입력해주세요!');
                    return;
                }

                btn.disabled = true;
                const { error } = await supabase.rpc('answer_hard_question', {
                    question_id: questionId,
                    answer_text: answerText,
                });
                btn.disabled = false;

                if (error) {
                    console.error('풀이 저장 실패:', error);
                    alert('저장 중 문제가 생겼어요. 다시 시도해주세요.');
                    return;
                }

                renderList();
            });
        });
    }
}

function escapeHtml(str) {
    return String(str ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}