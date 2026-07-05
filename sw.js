// 최소한의 서비스워커입니다.
// 목적: PWA 설치(installable) 조건 중 하나인 "fetch 이벤트를 처리하는 서비스워커"를
// 충족시키기 위함이며, 개발 중인 앱이라 공격적인 캐싱은 넣지 않았습니다.
// (캐싱을 세게 걸면 코드를 수정해도 예린이 폰에 옛날 버전이 남아있는 문제가 생길 수 있어요.)

self.addEventListener('install', (event) => {
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    event.waitUntil(self.clients.claim());
});

// 네트워크를 그대로 통과시킴 (오프라인 캐싱 없음 - 최신 버전을 항상 받아오도록)
self.addEventListener('fetch', (event) => {
    // 확장 프로그램 요청 등 http/https가 아닌 요청은 건드리지 않음
    if (!event.request.url.startsWith('http')) {
        return;
    }

    event.respondWith(
        fetch(event.request).catch((err) => {
            console.log('Fetch failed (아마 페이지 이동/취소):', event.request.url);
            return new Response('', { status: 408, statusText: 'Network error' });
        })
    );
});