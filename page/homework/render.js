import { escapeHtml, getStatus, statusLabel, getDDayLabel, formatDateLabel, sortForDisplay, todayStr, isExcludedFromRate } from './utils.js';
import { getEditingId } from './editState.js';
import { isExpanded } from './expandState.js';
import { isDateGroupExpanded } from './dateGroupState.js';

export function renderPhotoSection(item) {
    const photos = item.photos || [];

    if (item.done && photos.length === 0) return '';

    const thumbs = photos.map((src, idx) => `
        <div class="homework-photo-thumb">
            <img src="${src}" alt="인증사진 ${idx + 1}" class="homework-photo-img" data-src="${src}">
            ${!item.done ? `<button type="button" class="homework-photo-remove" data-id="${item.id}" data-index="${idx}">×</button>` : ''}
        </div>
    `).join('');

    const uploadBtn = !item.done ? `
        <label class="homework-photo-upload-btn">
            📷 인증사진 추가
            <input type="file" accept="image/*" multiple class="homework-photo-input" data-id="${item.id}" hidden>
        </label>
    ` : '';

    return `
        <div class="homework-photo-section">
            ${photos.length > 0 ? `<div class="homework-photo-list">${thumbs}</div>` : ''}
            ${uploadBtn}
        </div>
    `;
}

function renderDatesHtml(item, dateFormat) {
    if (dateFormat === 'dday') {
        return `<span class="homework-date homework-dday">${getDDayLabel(item.dueDate)}</span>`;
    }
    return item.lessonDate === item.dueDate
        ? `<span class="homework-date">기한 ${item.lessonDate || '-'}</span>`
        : `<span class="homework-date">수업일 ${item.lessonDate || '-'}</span>
           <span class="homework-date">마감일 ${item.dueDate || '-'}</span>`;
}

// ✅ 전체 페이지(editable) 펼침 영역 전용
function renderExpandedDatesHtml(item) {
    return item.lessonDate === item.dueDate
        ? `<span class="homework-date">기한 ${item.lessonDate || '-'}</span>`
        : `<span class="homework-date">시작일 ${item.lessonDate || '-'}</span>
           <span class="homework-date">마감일 ${item.dueDate || '-'}</span>`;
}

export function renderItem(item, options = {}) {
    const { editable = false, showPhotos = true, dateFormat = 'full', selfLocked = false } = options;
    const status = getStatus(item);
    const photos = item.photos || [];
    const canComplete = photos.length > 0;

    if (editable && getEditingId() === item.id) {
        return `
            <div class="homework-item editing">
                <form class="homework-edit-form" data-id="${item.id}">
                    <div class="homework-form-row">
                        <label class="homework-form-label">
                            기한
                            <input type="date" name="dueDate" value="${item.dueDate || ''}" required>
                        </label>
                    </div>
                    <input type="text" name="content" value="${escapeHtml(item.content)}" required>
                    <div class="homework-edit-actions">
                        <button type="submit" class="pink-button homework-save-btn">저장</button>
                        <button type="button" class="homework-cancel-btn" data-id="${item.id}">취소</button>
                    </div>
                </form>
            </div>
        `;
    }


    const datesHtml = renderDatesHtml(item, dateFormat);
    const isAbandoned = status === 'abandoned';
    // ✅ selfLocked: 연결된 친구가 있으면 본인이 직접 체크 못하게 막고, 친구의 인증만 받도록 함
    const isAwaitingFriend = !isAbandoned && selfLocked && !item.done && canComplete;
    const checkboxHtml = `<input type="checkbox" data-id="${item.id}" ${item.done ? 'checked' : ''} ${(!item.done && !canComplete) || isAwaitingFriend || isAbandoned ? 'disabled' : ''}>`;

    // ✅ 대시보드 요약 카드 (editable:false): 한 줄 컴팩트 레이아웃 그대로 유지
    // (체크박스 + D-day + 내용 + 상태태그가 한 줄에 붙는 기존 디자인)
    if (!editable) {
        return `
            <div class="homework-item ${status}">
                <div class="homework-item-top">
                    <label class="homework-item-main">
                        ${checkboxHtml}
                        <span class="homework-dates ${dateFormat === 'dday' ? 'homework-dates-dday' : ''}">
                            ${datesHtml}
                        </span>
                        <span class="homework-content">${escapeHtml(item.content)}</span>
                        <span class="homework-status-tag ${status}">${statusLabel(status)}</span>
                    </label>
                </div>
                ${showPhotos ? renderPhotoSection(item) : ''}
            </div>
        `;
    }

    // ✅ 숙제 체크 전체 페이지 (editable:true): 접힘/펼침 카드
    // - 접힘(기본): 체크박스 + 내용 + D-day + 완료상태, 딱 "한 줄"
    // - 펼침(행 클릭 시): 시작일/마감일 + 수정/삭제 버튼 + 인증사진
    const open = isExpanded(item.id);
    const statusTagClass = isAwaitingFriend ? 'awaiting' : status;
    const statusTagText = isAwaitingFriend ? '친구 인증 대기중' : statusLabel(status);

    return `
        <div class="homework-item ${status} ${open ? 'homework-item-expanded' : ''}" data-item-id="${item.id}">
            <div class="homework-item-row" data-id="${item.id}">
                ${checkboxHtml}
                <span class="homework-item-content">${escapeHtml(item.content)}</span>
                <span class="homework-dday">${getDDayLabel(item.dueDate)}</span>
                <span class="homework-status-tag ${statusTagClass}">${statusTagText}</span>
                <span class="homework-item-caret" aria-hidden="true">▾</span>
            </div>
            <div class="homework-item-detail">
                <div class="homework-dates">${renderExpandedDatesHtml(item)}</div>
                <div class="homework-item-actions">
                    <button type="button" class="homework-edit-btn" data-id="${item.id}">수정</button>
                    ${status === 'overdue' ? `<button type="button" class="homework-abandon-btn" data-id="${item.id}">미완료 처리</button>` : ''}
                    <button type="button" class="homework-delete-btn" data-id="${item.id}">삭제</button>
                </div>
                ${showPhotos ? renderPhotoSection(item) : ''}
            </div>
        </div>
    `;
}

// ✅ 숙제 체크 전체 페이지 전용: 마감일(dueDate) 기준으로 묶어서 날짜별 그룹으로 렌더링.
// 각 그룹은 평소엔 접혀있고(한 줄: 날짜 + 완료/전체 개수 + 그날의 달성률), 누르면 그 날짜의 숙제들이 펼쳐짐.
export function renderDateGroupsHtml(items, options = {}) {
    const { selfLocked = false } = options;
    if (items.length === 0) {
        return `<p class="homework-empty">아직 등록된 숙제가 없어요.</p>`;
    }

    const groups = {};
    items.forEach(item => {
        const key = item.dueDate || '';
        if (!groups[key]) groups[key] = [];
        groups[key].push(item);
    });

    // 마감일 빠른 순으로 그룹 정렬 (날짜 미정('')은 맨 뒤로)
    const dateKeys = Object.keys(groups).sort((a, b) => {
        if (a === '') return 1;
        if (b === '') return -1;
        return a.localeCompare(b);
    });

    const today = todayStr();

    return dateKeys.map(dateKey => {
        const groupItems = sortForDisplay(groups[dateKey]);
        const countedItems = groupItems.filter(i => !isExcludedFromRate(i));
        const total = countedItems.length;
        const doneCount = countedItems.filter(i => i.done).length;
        const rate = total === 0 ? 0 : Math.round((doneCount / total) * 100);
        const isOpen = isDateGroupExpanded(dateKey);
        const isPast = dateKey !== '' && dateKey < today;
        const isToday = dateKey === today;

        const labelClasses = ['homework-date-group-label'];
        if (isPast) labelClasses.push('overdue');
        if (isToday) labelClasses.push('today');

        return `
            <div class="homework-date-group ${isOpen ? 'homework-date-group-open' : ''}" data-date-key="${dateKey}">
                <button type="button" class="homework-date-group-toggle">
                    <span class="homework-date-group-caret" aria-hidden="true">▾</span>
                    <span class="${labelClasses.join(' ')}">${escapeHtml(formatDateLabel(dateKey))}${isToday ? ' · 오늘' : ''}</span>
                    <span class="homework-date-group-count">${doneCount}/${total}</span>
                    <span class="homework-date-group-rate">${rate}%</span>
                </button>
                <div class="homework-date-group-body">
                    <div class="homework-date-group-items">
                        ${groupItems.map(item => renderItem(item, { editable: true, selfLocked })).join('')}
                    </div>
                </div>
            </div>
        `;
    }).join('');
}