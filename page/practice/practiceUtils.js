// 모든 역량 연습 모듈이 공유하는 순수 유틸 함수

export function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}