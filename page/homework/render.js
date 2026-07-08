import { escapeHtml, getStatus, statusLabel, getDDayLabel } from './utils.js';
import { getEditingId } from './editState.js';
import { isExpanded } from './expandState.js';

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
        ? `<span class="homework-date">날짜 ${item.lessonDate || '-'}</span>`
        : `<span class="homework-date">수업일 ${item.lessonDate || '-'}</span>
           <span class="homework-date">마감일 ${item.dueDate || '-'}</span>`;
}

// ✅ 전체 페이지(editable) 펼침 영역 전용: "수업일" 대신 "시작일" 표현을 씀
function renderExpandedDatesHtml(item) {
    return item.lessonDate === item.dueDate
        ? `<span class="homework-date">날짜 ${item.lessonDate || '-'}</span>`
        : `<span class="homework-date">시작일 ${item.lessonDate || '-'}</span>
           <span class="homework-date">마감일 ${item.dueDate || '-'}</span>`;
}

export function renderItem(item, options = {}) {
    const { editable = false, showPhotos = true, dateFormat = 'full' } = options;
    const status = getStatus(item);
    const photos = item.photos || [];
    const canComplete = photos.length > 0;

    if (editable && getEditingId() === item.id) {
        return `
            <div class="homework-item editing">
                <form class="homework-edit-form" data-id="${item.id}">
                    <div class="homework-form-row">
                        <label class="homework-form-label">
                            수업일
                            <input type="date" name="lessonDate" value="${item.lessonDate || ''}" required>
                        </label>
                        <label class="homework-form-label">
                            마감일(숙제 기간)
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
    const checkboxHtml = `<input type="checkbox" data-id="${item.id}" ${item.done ? 'checked' : ''} ${(!item.done && !canComplete) ? 'disabled' : ''}>`;

    // ✅ 대시보드 요약 카드 (editable:false): 한 줄 컴팩트 레이아웃 그대로 유지
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
    const open = isExpanded(item.id);

    return `
        <div class="homework-item ${status} ${open ? 'homework-item-expanded' : ''}" data-item-id="${item.id}">
            <div class="homework-item-row" data-id="${item.id}">
                ${checkboxHtml}
                <span class="homework-item-content">${escapeHtml(item.content)}</span>
                <span class="homework-dday">${getDDayLabel(item.dueDate)}</span>
                <span class="homework-status-tag ${status}">${statusLabel(status)}</span>
                <span class="homework-item-caret" aria-hidden="true">▾</span>
            </div>
            <div class="homework-item-detail">
                <div class="homework-dates">${renderExpandedDatesHtml(item)}</div>
                <div class="homework-item-actions">
                    <button type="button" class="homework-edit-btn" data-id="${item.id}">수정</button>
                    <button type="button" class="homework-delete-btn" data-id="${item.id}">삭제</button>
                </div>
                ${showPhotos ? renderPhotoSection(item) : ''}
            </div>
        </div>
    `;
}