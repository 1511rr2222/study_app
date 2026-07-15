import { supabase } from '../supabaseClient.js';

// ⚠️ 이 공개키는 방금 생성한 VAPID_PUBLIC_KEY와 정확히 같아야 해요.
const VAPID_PUBLIC_KEY = 'BJfspict8MSPzLF-Qno1R8PDZ4ObM53KFK80Bxra5v53zL-rzkBMgl3JS59LzZcGKjoJFXD0-qIJDH2HmPUG_5A';

function urlBase64ToUint8Array(base64String) {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const rawData = atob(base64);
    return Uint8Array.from([...rawData].map(c => c.charCodeAt(0)));
}

// 지금 이 브라우저/기기가 이미 알림을 켜뒀는지 확인
export async function isPushSubscribed() {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return false;
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.getSubscription();
    return !!sub;
}

// 알림 켜기: 권한 요청 → 브라우저 구독 생성 → Supabase에 저장
export async function enablePushNotifications() {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
        alert('이 브라우저/환경에서는 알림 기능을 지원하지 않아요. (아이폰은 홈 화면에 추가한 뒤 그 앱에서 시도해주세요!)');
        return false;
    }

    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
        alert('알림 권한이 허용되지 않았어요. 브라우저 설정에서 알림을 허용해주세요.');
        return false;
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    const reg = await navigator.serviceWorker.ready;
    let sub = await reg.pushManager.getSubscription();

    if (!sub) {
        sub = await reg.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
        });
    }

    const json = sub.toJSON();
    const { error } = await supabase.from('push_subscriptions').upsert({
        user_id: user.id,
        endpoint: json.endpoint,
        p256dh: json.keys.p256dh,
        auth: json.keys.auth,
    }, { onConflict: 'endpoint' });

    if (error) {
        console.error('구독 정보 저장 실패:', error);
        alert('알림 설정 중 문제가 생겼어요. 다시 시도해주세요.');
        return false;
    }

    return true;
}

// 알림 끄기
export async function disablePushNotifications() {
    if (!('serviceWorker' in navigator)) return;

    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.getSubscription();
    if (!sub) return;

    const endpoint = sub.endpoint;
    await sub.unsubscribe();
    await supabase.from('push_subscriptions').delete().eq('endpoint', endpoint);
}