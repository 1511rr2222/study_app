// ✅ 숙제 항목의 "펼침(클릭해서 상세 보기)" 상태를 기억하는 모듈.
// editState.js(수정 중인 항목 id)와 같은 패턴이며, 여러 항목을 동시에 펼쳐둘 수 있도록
// id 하나가 아니라 Set으로 관리한다.
// (체크박스 토글, 사진 업로드 등으로 목록이 다시 그려져도 펼쳐둔 카드가 다시 접히지 않도록
//  이 모듈이 진짜 상태를 갖고, render.js는 매번 여기서 읽어서 화면에 반영한다.)

let expandedIds = new Set();

export function isExpanded(id) {
    return expandedIds.has(id);
}

export function toggleExpanded(id) {
    if (expandedIds.has(id)) {
        expandedIds.delete(id);
    } else {
        expandedIds.add(id);
    }
}

export function clearExpanded() {
    expandedIds = new Set();
}