// 인증사진 클릭 시 크게 보여주는 라이트박스.
// 오버레이 엘리먼트는 페이지에 딱 1개만 만들어서 재사용함 (매번 새로 만들지 않음).

let overlay = null;

function ensureOverlay() {
    if (overlay) return overlay;

    overlay = document.createElement('div');
    overlay.className = 'homework-lightbox-overlay';
    overlay.innerHTML = `
        <button type="button" class="homework-lightbox-close" aria-label="닫기">×</button>
        <img class="homework-lightbox-img" alt="인증사진 크게보기">
    `;
    document.body.appendChild(overlay);

    // 배경(어두운 영역) 또는 닫기 버튼 클릭 시 닫기
    overlay.addEventListener('click', (e) => {
        if (e.target === overlay || e.target.classList.contains('homework-lightbox-close')) {
            closeLightbox();
        }
    });

    // ESC 키로도 닫기
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') closeLightbox();
    });

    return overlay;
}

export function openLightbox(src) {
    if (!src) return;
    const el = ensureOverlay();
    const img = el.querySelector('.homework-lightbox-img');
    img.src = src;
    el.classList.add('show');
}

export function closeLightbox() {
    if (overlay) overlay.classList.remove('show');
}