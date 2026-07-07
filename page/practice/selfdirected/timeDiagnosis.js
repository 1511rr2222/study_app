import { supabase } from '../../../supabaseClient.js';
import { TIME_CATEGORIES } from './timeQuestions.js';

export function timeDiagnosisHtml() {
    return `
        <div class="selfdir-timediag">
            <div class="selfdir-timediag-tabs">
                ${TIME_CATEGORIES.map((cat, idx) => `
                    <button type="button" class="selfdir-timediag-tab ${idx === 0 ? 'active' : ''}" data-category="${cat.id}">
                        ${cat.label} <span class="selfdir-timediag-tab-progress" data-progress="${cat.id}"></span>
                    </button>
                `).join('')}
            </div>
            <div class="selfdir-timediag-panel" id="selfdir-timediag-panel"></div>
        </div>
    `;
}

export async function initTimeDiagnosis(container, user) {
    const tabs = container.querySelectorAll('.selfdir-timediag-tab');
    const panel = container.querySelector('#selfdir-timediag-panel');

    const { data, error } = await supabase
        .from('time_diagnosis_answers')
        .select('category, question_index, answer')
        .eq('user_id', user.id);

    if (error) console.error('시간 활용 진단 답변 로드 실패:', error);

    const answerMap = new Map(); // key: `${category}-${question_index}` -> answer
    (data || []).forEach(r => answerMap.set(`${r.category}-${r.question_index}`, r.answer));

    function updateTabProgress() {
        TIME_CATEGORIES.forEach(cat => {
            const answered = cat.questions.filter((_, i) => (answerMap.get(`${cat.id}-${i}`) || '').trim() !== '').length;
            const badge = container.querySelector(`[data-progress="${cat.id}"]`);
            if (badge) badge.textContent = `${answered}/${cat.questions.length}`;
        });
    }

    function renderCategory(categoryId) {
        const cat = TIME_CATEGORIES.find(c => c.id === categoryId);
        if (!cat) return;

        panel.innerHTML = `
            ${cat.questions.map((q, i) => `
                <div class="selfdir-timediag-q">
                    <label class="selfdir-timediag-qtext">${i + 1}. ${q}</label>
                    <textarea class="selfdir-timediag-qinput" data-idx="${i}" rows="2" placeholder="자유롭게 적어보세요">${answerMap.get(`${cat.id}-${i}`) || ''}</textarea>
                </div>
            `).join('')}
            <button type="button" class="selfdir-save-btn" id="selfdir-timediag-save-btn">저장</button>
            <p class="selfdir-status" id="selfdir-timediag-status"></p>
        `;

        panel.querySelector('#selfdir-timediag-save-btn').addEventListener('click', async () => {
            const inputs = panel.querySelectorAll('.selfdir-timediag-qinput');
            const statusEl = panel.querySelector('#selfdir-timediag-status');

            const payload = [...inputs]
                .map(input => ({
                    user_id: user.id,
                    category: cat.id,
                    question_index: Number(input.dataset.idx),
                    answer: input.value,
                    updated_at: new Date().toISOString(),
                }))
                .filter(r => r.answer.trim() !== '');

            if (payload.length === 0) {
                statusEl.textContent = '답변을 입력해주세요.';
                return;
            }

            const { error: saveError } = await supabase
                .from('time_diagnosis_answers')
                .upsert(payload, { onConflict: 'user_id,category,question_index' });

            if (saveError) {
                console.error('시간 활용 진단 저장 실패:', saveError);
                statusEl.textContent = '저장 중 문제가 생겼어요. 다시 시도해주세요.';
                return;
            }

            payload.forEach(r => answerMap.set(`${r.category}-${r.question_index}`, r.answer));
            updateTabProgress();
            statusEl.textContent = '저장완료 ✨';
            setTimeout(() => { statusEl.textContent = ''; }, 1500);
        });
    }

    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            tabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            renderCategory(tab.dataset.category);
        });
    });

    updateTabProgress();
    renderCategory(TIME_CATEGORIES[0].id);
}