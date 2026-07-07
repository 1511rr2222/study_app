import { supabase } from '../../supabaseClient.js';
import { planPhotoBlockHtml, initPlanPhotoBlock } from './selfdirected/planPhotoBlock.js';
import { timeDiagnosisHtml, initTimeDiagnosis } from './selfdirected/timeDiagnosis.js';

const BLOCKS = [
    { id: 'monthly', emoji: '🗓️', label: '월간 학습계획표', desc: '한 달 계획표를 올려주세요!' },
    { id: 'weekly', emoji: '📅', label: '주간 학습계획표', desc: '한 주 계획표를 올려주세요!' },
    { id: 'daily', emoji: '📝', label: '일간 학습계획표', desc: '오늘의 계획표를 올려주세요!' },
    { id: 'timediag', emoji: '⏰', label: '시간 활용 진단', desc: '나의 시간 사용 습관을 점검해봐요' },
];

export async function initSelfdirectedPractice(contentEl) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        contentEl.innerHTML = '<p class="practice-soon">로그인이 필요해요.</p>';
        return;
    }

    renderMenu();

    function renderMenu() {
        contentEl.innerHTML = `
            <div class="selfdir-menu">
                ${BLOCKS.map(b => `
                    <button type="button" class="selfdir-menu-block" data-block="${b.id}">
                        <span class="selfdir-menu-emoji">${b.emoji}</span>
                        <span class="selfdir-menu-label">${b.label}</span>
                        <span class="selfdir-menu-desc">${b.desc}</span>
                    </button>
                `).join('')}
            </div>
        `;

        contentEl.querySelectorAll('.selfdir-menu-block').forEach(btn => {
            btn.addEventListener('click', () => openBlock(btn.dataset.block));
        });
    }

    function openBlock(blockId) {
        const block = BLOCKS.find(b => b.id === blockId);
        if (!block) return;

        if (blockId === 'timediag') {
            contentEl.innerHTML = `
                <button type="button" class="selfdir-sub-back-btn" id="selfdir-sub-back-btn">← 자기주도성 메뉴로</button>
                <h3 class="selfdir-sub-title">${block.emoji} ${block.label}</h3>
                ${timeDiagnosisHtml()}
            `;
            document.getElementById('selfdir-sub-back-btn').addEventListener('click', renderMenu);
            initTimeDiagnosis(contentEl, user);
        } else {
            const prefix = `selfdir-${blockId}`;
            contentEl.innerHTML = `
                <button type="button" class="selfdir-sub-back-btn" id="selfdir-sub-back-btn">← 자기주도성 메뉴로</button>
                <h3 class="selfdir-sub-title">${block.emoji} ${block.label}</h3>
                <p class="selfdir-sub-desc">${block.desc} 사진을 찍어서 올리면 여기에 차곡차곡 기록이 쌓여요.</p>
                ${planPhotoBlockHtml(prefix)}
            `;
            document.getElementById('selfdir-sub-back-btn').addEventListener('click', renderMenu);
            initPlanPhotoBlock(contentEl, prefix, blockId, user);
        }
    }
}