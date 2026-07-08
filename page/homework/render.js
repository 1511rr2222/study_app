import { escapeHtml, getStatus, statusLabel, getDDayLabel } from './utils.js';
import { getEditingId } from './editState.js';

export function renderPhotoSection(item) {
    const photos = item.photos || [];

    if (item.done && photos.length === 0) return '';

    const thumbs = photos.map((src, idx) => `
        <div class="homework-photo-thumb">
            <img src="${src}" alt="인증사진 ${idx + 1}">
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

    return `
        <div class="homework-item ${status}">
            <div class="homework-item-top">
                <label class="homework-item-main">
                    <input type="checkbox" data-id="${item.id}" ${item.done ? 'checked' : ''} ${(!item.done && !canComplete) ? 'disabled' : ''}>
                    <span class="homework-dates ${dateFormat === 'dday' ? 'homework-dates-dday' : ''}">
                        ${dateFormat === 'dday'
                            ? `<span class="homework-date homework-dday">${getDDayLabel(item.dueDate)}</span>`
                            : (item.lessonDate === item.dueDate
                                ? `<span class="homework-date">날짜 ${item.lessonDate || '-'}</span>`
                                : `<span class="homework-date">수업일 ${item.lessonDate || '-'}</span>
                            <span class="homework-date">마감일 ${item.dueDate || '-'}</span>`)}
                    </span>
                    <span class="homework-content">${escapeHtml(item.content)}</span>
                    <span class="homework-status-tag ${status}">${statusLabel(status)}</span>
                </label>
                ${editable ? `
                    <div class="homework-item-actions">
                        <button type="button" class="homework-edit-btn" data-id="${item.id}">수정</button>
                        <button type="button" class="homework-delete-btn" data-id="${item.id}">삭제</button>
                    </div>
                ` : ''}
            </div>
            ${showPhotos ? renderPhotoSection(item) : ''}
        </div>
    `;
}