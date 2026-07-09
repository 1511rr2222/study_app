import { supabase } from '../supabaseClient.js';
import { dayLabel } from './planState.js';

let modalMode = 'add'; // 'add' | 'edit'
let modalDay = 0;
let modalEditId = null;

export function ModalHtml() {
    return `
        <div class="plan-modal-overlay" id="plan-modal-overlay">
            <div class="plan-modal-box">
                <h3 id="plan-modal-title">계획 추가</h3>
                <div class="plan-modal-day-label" id="plan-modal-day-label"></div>
                <div class="plan-modal-time-row">
                    <label class="plan-modal-time-label">시작
                        <input type="time" id="plan-modal-start">
                    </label>
                    <label class="plan-modal-time-label">종료
                        <input type="time" id="plan-modal-end">
                    </label>
                </div>
                <textarea id="plan-modal-content" class="plan-modal-content-input" placeholder="계획 내용을 입력하세요" rows="3"></textarea>
                <div class="plan-modal-actions">
                    <button type="button" id="plan-modal-delete-btn" class="plan-modal-delete-btn">삭제</button>
                    <button type="button" id="plan-modal-cancel-btn" class="plan-modal-cancel-btn">취소</button>
                    <button type="button" id="plan-modal-save-btn" class="pink-button plan-modal-save-btn">저장</button>
                </div>
            </div>
        </div>
    `;
}

/**
 * @param {() => Promise<string|null>} getUserId
 * @param {() => void} onSaved - 저장/삭제 성공 후 목록을 새로고침하기 위한 콜백 (schedule.js의 loadSchedule)
 * @returns {{ openAddModal: Function, openEditModal: Function }}
 */
export function initModal(getUserId, onSaved) {
    const overlay = document.getElementById('plan-modal-overlay');
    const titleEl = document.getElementById('plan-modal-title');
    const dayLabelEl = document.getElementById('plan-modal-day-label');
    const startInput = document.getElementById('plan-modal-start');
    const endInput = document.getElementById('plan-modal-end');
    const contentInput = document.getElementById('plan-modal-content');
    const deleteBtn = document.getElementById('plan-modal-delete-btn');
    const cancelBtn = document.getElementById('plan-modal-cancel-btn');
    const saveModalBtn = document.getElementById('plan-modal-save-btn');

    function openAddModal(day, startVal, endVal) {
        modalMode = 'add';
        modalDay = day;
        modalEditId = null;
        titleEl.textContent = '계획 추가';
        dayLabelEl.textContent = dayLabel(day);
        startInput.value = startVal || '';
        endInput.value = endVal || '';
        contentInput.value = '';
        deleteBtn.style.display = 'none';
        overlay.classList.add('show');
        setTimeout(() => contentInput.focus(), 0);
    }

    function openEditModal(item) {
        modalMode = 'edit';
        modalDay = item.day_of_week;
        modalEditId = item.id;
        titleEl.textContent = '계획 수정';
        dayLabelEl.textContent = dayLabel(item.day_of_week);
        startInput.value = item.start_time ? item.start_time.slice(0, 5) : '';
        endInput.value = item.end_time ? item.end_time.slice(0, 5) : '';
        contentInput.value = item.content;
        deleteBtn.style.display = '';
        overlay.classList.add('show');
    }

    function closeModal() {
        overlay.classList.remove('show');
    }

    cancelBtn.addEventListener('click', closeModal);
    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) closeModal(); // 바깥(어두운 영역) 클릭 시 닫기
    });

    saveModalBtn.addEventListener('click', async () => {
        const content = contentInput.value.trim();
        if (!content) {
            alert('계획 내용을 입력해주세요!');
            return;
        }

        const isWeekday = modalDay >= 0 && modalDay <= 4;
        const start = startInput.value;
        const end = endInput.value;

        if (isWeekday && (!start || !end)) {
            alert('평일 시간표는 시작·종료 시간이 모두 필요해요!');
            return;
        }
        if (start && end && end <= start) {
            alert('종료 시간은 시작 시간보다 늦어야 해요!');
            return;
        }

        const uid = await getUserId();
        if (!uid) return;

        const payload = {
            user_id: uid,
            day_of_week: modalDay,
            start_time: start || null,
            end_time: end || null,
            content,
        };

        const { error } = modalMode === 'edit'
            ? await supabase.from('plan_schedule').update(payload).eq('id', modalEditId)
            : await supabase.from('plan_schedule').insert(payload);

        if (error) {
            console.error('시간표 저장 실패:', error);
            alert('저장하는 중 문제가 생겼어요.');
            return;
        }

        closeModal();
        onSaved();
    });

    deleteBtn.addEventListener('click', async () => {
        if (!modalEditId) return;
        if (!confirm('이 계획을 삭제할까요?')) return;

        const { error } = await supabase.from('plan_schedule').delete().eq('id', modalEditId);
        if (error) {
            console.error('삭제 실패:', error);
            alert('삭제 중 문제가 생겼어요.');
            return;
        }

        closeModal();
        onSaved();
    });

    return { openAddModal, openEditModal };
}