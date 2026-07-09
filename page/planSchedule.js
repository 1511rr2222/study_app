import { supabase } from '../supabaseClient.js';
import {
    WEEKDAY_LABELS,
    GRID_START_MIN,
    GRID_END_MIN,
    HOUR_HEIGHT,
    GRID_HEIGHT,
    escapeHtml,
    timeToMinutes,
    minutesToTime,
} from './planState.js';

export function ScheduleGridHtml() {
    const hourMarks = [];
    for (let m = GRID_START_MIN; m <= GRID_END_MIN; m += 60) hourMarks.push(m);

    return `
        <div class="plan-grid-wrap">
            <div class="plan-grid">
                <div class="plan-grid-corner"></div>
                ${WEEKDAY_LABELS.map(label => `<div class="plan-grid-day-header">${label}</div>`).join('')}

                <div class="plan-grid-time-axis" style="height:${GRID_HEIGHT}px;">
                    ${hourMarks.map(m => `<span class="plan-grid-hour-label" style="top:${(m - GRID_START_MIN) / 60 * HOUR_HEIGHT}px;">${String(Math.floor(m / 60)).padStart(2, '0')}</span>`).join('')}
                </div>
                ${WEEKDAY_LABELS.map((_, day) => `
                    <div class="plan-grid-day-body" data-day="${day}" style="height:${GRID_HEIGHT}px;">
                        ${hourMarks.map(m => `<span class="plan-grid-hour-line" style="top:${(m - GRID_START_MIN) / 60 * HOUR_HEIGHT}px;"></span>`).join('')}
                    </div>
                `).join('')}
            </div>
        </div>
    `;
}

export function WeekendSectionHtml() {
    return `
        <div class="plan-weekend-section">
            ${[5, 6].map(day => `
                <div class="plan-weekend-day">
                    <div class="plan-weekend-header">
                        <span>${day === 5 ? '토요일' : '일요일'}</span>
                        <button type="button" class="plan-weekend-add-btn" data-day="${day}">+ 추가</button>
                    </div>
                    <div class="plan-weekend-list" id="plan-weekend-list-${day}">
                        <p class="plan-empty">불러오는 중...</p>
                    </div>
                </div>
            `).join('')}
        </div>
    `;
}

/**
 * @param {() => Promise<string|null>} getUserId
 * @param {{ openAddModal: Function, openEditModal: Function }} modal
 * @returns {{ loadSchedule: () => Promise<void> }}
 */
export function initSchedule(getUserId, { openAddModal, openEditModal }) {
    let scheduleCache = [];

    async function loadSchedule() {
        const uid = await getUserId();
        if (!uid) return;

        const { data, error } = await supabase
            .from('plan_schedule')
            .select('*')
            .eq('user_id', uid);

        if (error) {
            console.error('시간표 로드 실패:', error);
            return;
        }

        scheduleCache = data || [];
        renderGridBlocks();
        renderWeekendList(5);
        renderWeekendList(6);
    }

    function renderGridBlocks() {
        document.querySelectorAll('.plan-grid-block').forEach(el => el.remove());

        scheduleCache
            .filter(item => item.day_of_week >= 0 && item.day_of_week <= 4)
            .forEach(item => {
                const col = document.querySelector(`.plan-grid-day-body[data-day="${item.day_of_week}"]`);
                if (!col) return;

                const startMin = timeToMinutes(item.start_time);
                const endMin = timeToMinutes(item.end_time);
                if (startMin === null || endMin === null) return;

                const clampedStart = Math.max(startMin, GRID_START_MIN);
                const clampedEnd = Math.min(endMin, GRID_END_MIN);
                if (clampedEnd <= clampedStart) return;

                const top = (clampedStart - GRID_START_MIN) / 60 * HOUR_HEIGHT;
                const height = Math.max((clampedEnd - clampedStart) / 60 * HOUR_HEIGHT, 18);

                const block = document.createElement('div');
                block.className = 'plan-grid-block';
                block.style.top = `${top}px`;
                block.style.height = `${height}px`;
                block.dataset.id = item.id;
                block.innerHTML = `<span class="plan-grid-block-text">${escapeHtml(item.content)}</span>`;
                block.addEventListener('click', (e) => {
                    e.stopPropagation();
                    openEditModal(item);
                });
                col.appendChild(block);
            });
    }

    function renderWeekendList(day) {
        const list = document.getElementById(`plan-weekend-list-${day}`);
        if (!list) return;

        const items = scheduleCache.filter(item => item.day_of_week === day);
        if (items.length === 0) {
            list.innerHTML = `<p class="plan-empty">아직 등록된 계획이 없어요.</p>`;
            return;
        }

        list.innerHTML = items.map(item => {
            const timeLabel = (item.start_time && item.end_time)
                ? `<span class="plan-weekend-time">${item.start_time.slice(0, 5)}~${item.end_time.slice(0, 5)}</span>`
                : '';
            return `
                <div class="plan-weekend-item" data-id="${item.id}">
                    ${timeLabel}
                    <span class="plan-weekend-content">${escapeHtml(item.content)}</span>
                </div>
            `;
        }).join('');

        list.querySelectorAll('.plan-weekend-item').forEach(row => {
            row.addEventListener('click', () => {
                const item = scheduleCache.find(i => i.id === row.dataset.id);
                if (item) openEditModal(item);
            });
        });
    }

    // 평일 그리드: 빈 칸 클릭 → 누른 위치로 시작시간을 대략 추정해서 추가 모달 오픈
    document.querySelectorAll('.plan-grid-day-body').forEach(col => {
        col.addEventListener('click', (e) => {
            if (e.target.closest('.plan-grid-block')) return; // 블록 클릭은 각 블록의 리스너가 처리
            const day = Number(col.dataset.day);
            const rect = col.getBoundingClientRect();
            const offsetY = e.clientY - rect.top;
            let startMin = GRID_START_MIN + Math.round((offsetY / HOUR_HEIGHT) * 60 / 30) * 30;
            startMin = Math.min(Math.max(startMin, GRID_START_MIN), GRID_END_MIN - 30);
            const endMin = Math.min(startMin + 60, GRID_END_MIN);
            openAddModal(day, minutesToTime(startMin), minutesToTime(endMin));
        });
    });

    // 주말: '+ 추가' 버튼
    document.querySelectorAll('.plan-weekend-add-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            openAddModal(Number(btn.dataset.day), '', '');
        });
    });

    return { loadSchedule };
}