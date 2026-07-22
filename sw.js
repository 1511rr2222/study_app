self.addEventListener('install', (event) => {
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
self.addEventListener('fetch', (event) => {
    if (!event.request.url.startsWith('http')) {
        return;
    }

    // ✅ 사진 업로드 같은 POST/PUT 요청은 서비스워커가 손대지 않고 브라우저가 그대로 처리하게 둠
    //    (서비스워커를 거치면서 파일 업로드가 깨지는 경우가 있어서, GET 요청에만 이 로직을 적용)
    if (event.request.method !== 'GET') {
        return;
    }

    event.respondWith(
        fetch(event.request).catch((err) => {
            console.log('Fetch failed (아마 페이지 이동/취소):', event.request.url);
            return new Response('', { status: 408, statusText: 'Network error' });
        })
    );
});

// ✅ 푸시 알림을 받으면 화면에 알림을 띄움
self.addEventListener('push', (event) => {
    let data = {};
    try {
        data = event.data ? event.data.json() : {};
    } catch (e) {
        data = { title: '알림', body: event.data ? event.data.text() : '' };
    }

    const title = data.title || '예린 학습 대시보드';
    const options = {
        body: data.body || '',
        icon: '/icon-192.png',
        badge: '/icon-192.png',
        data: { url: data.url || '/' },
    };

    event.waitUntil(self.registration.showNotification(title, options));
});

// ✅ 알림을 눌렀을 때 앱을 열거나 이미 열려있으면 그 창으로 포커스 이동
self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    const targetUrl = event.notification.data?.url || '/';

    event.waitUntil(
        self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
            for (const client of clientList) {
                if ('focus' in client) {
                    client.navigate(targetUrl);
                    return client.focus();
                }
            }
            if (self.clients.openWindow) {
                return self.clients.openWindow(targetUrl);
            }
        })
    );
});
