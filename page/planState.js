import { supabase } from '../supabaseClient.js';

export const WEEKDAY_LABELS = ['월', '화', '수', '목', '금'];
export const GRID_START_MIN = 7 * 60;   // 07:00
export const GRID_END_MIN = 23 * 60;    // 23:00
export const HOUR_HEIGHT = 40;          // px / 1시간
export const GRID_HEIGHT = (GRID_END_MIN - GRID_START_MIN) / 60 * HOUR_HEIGHT;
export const SCORES = [1, 2, 3, 4, 5];

// ✅ 펼쳐둔 지난 기록 id를 기억 (다시 그려져도 접히지 않도록) - 여러 모듈에서 공유
export const expandedLogIds = new Set();

// ✅ 원시값(selectedScore)은 재할당하면 다른 모듈에 반영이 안 되므로
//    객체 프로퍼티로 감싸서 공유 (daily.js가 값을 쓰고 읽음)
export const planState = {
    selectedScore: null,
};

let cachedUserId = null;
export async function getUserId() {
    if (cachedUserId) return cachedUserId;
    const { data: { user } } = await supabase.auth.getUser();
    cachedUserId = user?.id || null;
    return cachedUserId;
}

export function todayStr() {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
}

export function escapeHtml(str) {
    return String(str ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

export function timeToMinutes(t) {
    if (!t) return null;
    const [h, m] = t.split(':').map(Number);
    return h * 60 + m;
}

export function minutesToTime(min) {
    const h = Math.floor(min / 60);
    const m = min % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

export function dayLabel(day) {
    return ['월요일', '화요일', '수요일', '목요일', '금요일', '토요일', '일요일'][day];
}