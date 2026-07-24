import { supabase } from '../supabaseClient.js';
import { uploadPhoto, removePhotoFromStorage } from './homework/storage.js';
import { openLightbox } from './homework/lightbox.js';

/* -------------------- 대시보드 요약 카드 -------------------- */

export function HardQuestionSummaryView() {
    return `
        <div class="hq-summary-box">
            <div class="homework-header-row">
                <h2>🙋 어려운 문제</h2>
                <span class="grit-summary-badge" id="hq-summary-badge">0개 답변 대기중</span>
            </div>
            <div id="hq-summary-content"><p class="grit-loading">불러오는 중...</p></div>
        </div>
    `;
}

export async function initHardQuestionSummary(onOpenFull) {
    const container = document.getElementById('hq-summary-content');
    if (!container) return;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        container.innerHTML = `<p class="practice-soon">로그인이 필요해요.</p>`;
        return;
    }

    const { data, error } = await supabase
        .from('hard_questions')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

    if (error) {
        console.error('어려운 문제 요약 로드 실패:', error);
        container.innerHTML = `<p class="practice-soon">불러오지 못했어요.</p>`;
        return;
    }

    const list = data || [];
    const waiting = list.filter(q => !q.answer);

    const badge = document.getElementById('hq-summary-badge');
    if (badge) badge.textContent = `${waiting.length}개 답변 대기중`;

    const answered = list.filter(q => q.answer).slice(0, 2);
    const rowsHtml = answered.map(q => `
        <div class="hq-summary-row">
            <span class="hq-summary-dot done"></span>
            <span class="hq-summary-content-text">${escapeHtml(q.content || '(사진만 등록)')}</span>
        </div>
    `).join('');

    container.innerHTML = `
        ${list.length === 0
            ? `<p class="homework-empty">아직 등록한 어려운 문제가 없어요.</p>`
            : `<div class="hq-summary-list">${rowsHtml}</div>`}
        <button type="button" id="hq-summary-open-btn" class="homework-open-btn">어려운 문제 등록하기 →</button>
    `;

    document.getElementById('hq-summary-open-btn').addEventListener('click', onOpenFull);
}

/* -------------------- 전체 페이지: 등록 + 내 문제 목록 -------------------- */

export function HardQuestionPageView() {
    return `
        <div class="dashboard-container">
            <button type="button" id="hq-back-btn" class="homework-back-btn">← 대시보드로 돌아가기</button>
            <div class="hero-box">
                <h2>🙋 어려운 문제</h2>
                <p class="homework-notice">*풀다가 막힌 문제를 사진이나 글로 남겨두면, 도우미가 풀이를 달아줄게요!</p>

                <form id="hq-add-form" class="homework-add-form">
                    <textarea id="hq-content-input" class="grit-goal-textarea" placeholder="어떤 부분이 어려운지 적어보세요 (선택사항)" rows="3"></textarea>
                    <div class="hq-photo-section">
                        <div class="hq-photo-list" id="hq-photo-list"></div>
                        <label class="homework-photo-upload-btn">
                            📷 문제 사진 추가
                            <input type="file" accept="image/*" multiple class="homework-photo-input" id="hq-photo-input" hidden>
                        </label>
                    </div>
                    <button type="submit" class="pink-button homework-add-btn">등록하기</button>
                </form>

                <div id="hq-list"><p class="homework-empty">불러오는 중...</p></div>
            </div>
        </div>
    `;
}

export function initHardQuestionPage(onBack) {
    document.getElementById('hq-back-btn').addEventListener('click', onBack);

    let userId = null;
    async function getUserId() {
        if (userId) return userId;
        const { data: { user } } = await supabase.auth.getUser();
        userId = user?.id || null;
        return userId;
    }

    const form = document.getElementById('hq-add-form');
    const contentInput = document.getElementById('hq-content-input');
    const photoInput = document.getElementById('hq-photo-input');
    const photoListEl = document.getElementById('hq-photo-list');
    let pendingPhotos = [];

    function renderPendingPhotos() {
        photoListEl.innerHTML = pendingPhotos.map((src, idx) => `
            <div class="homework-photo-thumb">
                <img src="${src}" class="hq-pending-photo" data-src="${src}" alt="문제 사진 ${idx + 1}">
                <button type="button" class="homework-photo-remove" data-index="${idx}">×</button>
            </div>
        `).join('');

        photoListEl.querySelectorAll('.hq-pending-photo').forEach(img => {
            img.addEventListener('click', () => openLightbox(img.dataset.src));
        });

        photoListEl.querySelectorAll('.homework-photo-remove').forEach(btn => {
            btn.addEventListener('click', async () => {
                const idx = Number(btn.dataset.index);
                const [removed] = pendingPhotos.splice(idx, 1);
                if (removed) await removePhotoFromStorage(removed);
                renderPendingPhotos();
            });
        });
    }

    photoInput.addEventListener('change', async (e) => {
        const files = Array.from(e.target.files || []);
        if (files.length === 0) return;

        const uid = await getUserId();
        if (!uid) return;

        try {
            const urls = await Promise.all(
                files.map(file => uploadPhoto(file, uid, `hardq-${Date.now()}`))
            );
            pendingPhotos.push(...urls);
            renderPendingPhotos();
        } catch (err) {
            console.error('문제 사진 업로드 실패:', err);
            alert('사진을 업로드하는 중 문제가 생겼어요. 다시 시도해주세요.');
        } finally {
            photoInput.value = '';
        }
    });

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const uid = await getUserId();
        if (!uid) return;

        const content = contentInput.value.trim();
        if (!content && pendingPhotos.length === 0) {
            alert('문제 설명이나 사진 중 하나는 있어야 해요!');
            return;
        }

        const { error } = await supabase.from('hard_questions').insert({
            user_id: uid,
            content: content || null,
            photos: pendingPhotos,
        });

        if (error) {
            console.error('어려운 문제 등록 실패:', error);
            alert('등록 중 문제가 생겼어요. 다시 시도해주세요.');
            return;
        }

        contentInput.value = '';
        pendingPhotos = [];
        renderPendingPhotos();
        loadList();
    });

    async function loadList() {
        const listEl = document.getElementById('hq-list');
        const uid = await getUserId();
        if (!uid || !listEl) return;

        const { data, error } = await supabase
            .from('hard_questions')
            .select('*')
            .eq('user_id', uid)
            .order('created_at', { ascending: false });

        if (error) {
            console.error('내 문제 목록 로드 실패:', error);
            listEl.innerHTML = `<p class="homework-empty">불러오지 못했어요.</p>`;
            return;
        }

        if (!data || data.length === 0) {
            listEl.innerHTML = `<p class="homework-empty">아직 등록한 문제가 없어요.</p>`;
            return;
        }

        listEl.innerHTML = data.map(q => `
            <div class="hq-item ${q.answer ? 'answered' : ''}">
                <div class="hq-item-top">
                    <span class="homework-status-tag ${q.answer ? 'done' : 'pending'}">${q.answer ? '답변완료' : '답변대기'}</span>
                </div>
                ${q.content ? `<p class="hq-item-content">${escapeHtml(q.content)}</p>` : ''}
                ${(q.photos || []).length > 0 ? `
                    <div class="homework-photo-list">
                        ${q.photos.map(src => `<div class="homework-photo-thumb"><img src="${src}" class="hq-photo" data-src="${src}"></div>`).join('')}
                    </div>
                ` : ''}
                ${q.answer ? `
                    <div class="hq-answer-box">
                        <p class="hq-answer-label">💡 풀이</p>
                        <p class="hq-answer-text">${escapeHtml(q.answer)}</p>
                    </div>
                ` : ''}
            </div>
        `).join('');

        listEl.querySelectorAll('.hq-photo').forEach(img => {
            img.addEventListener('click', () => openLightbox(img.dataset.src));
        });
    }

    loadList();
}

function escapeHtml(str) {
    return String(str ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}