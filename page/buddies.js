import { supabase } from '../supabaseClient.js';

const CODE_LENGTH = 6;
const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // 헷갈리는 글자(0/O, 1/I) 제외

function generateCode() {
    let code = '';
    for (let i = 0; i < CODE_LENGTH; i++) {
        code += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)];
    }
    return code;
}

export function BuddyPageView() {
    return `
        <div class="dashboard-container">
            <button type="button" id="buddy-back-btn" class="homework-back-btn">← 대시보드로 돌아가기</button>
            <div class="hero-box">
                <h2>🤝 친구 연결</h2>
                <p class="homework-notice">친구랑 서로 숙제를 검사해줄 수 있어요!</p>

                <div class="buddy-section">
                    <p class="grit-field-label">내 초대 코드</p>
                    <div class="buddy-code-row">
                        <span class="buddy-code" id="buddy-my-code">------</span>
                        <button type="button" id="buddy-generate-btn" class="pink-button buddy-action-btn">코드 만들기</button>
                    </div>
                    <p class="buddy-note" id="buddy-code-note"></p>
                </div>

                <div class="buddy-section">
                    <p class="grit-field-label">친구 코드 입력하기</p>
                    <div class="buddy-code-row">
                        <input type="text" id="buddy-redeem-input" class="buddy-redeem-input" placeholder="6자리 코드 입력" maxlength="6">
                        <button type="button" id="buddy-redeem-btn" class="pink-button buddy-action-btn">연결하기</button>
                    </div>
                    <p class="buddy-note" id="buddy-redeem-status"></p>
                </div>

                <div class="buddy-section">
                    <p class="grit-field-label">연결된 친구</p>
                    <div id="buddy-friend-list"><p class="homework-empty">불러오는 중...</p></div>
                </div>
            </div>
        </div>
    `;
}

export function initBuddyPage(onBack, onOpenFriend) {
    document.getElementById('buddy-back-btn').addEventListener('click', onBack);

    let userId = null;
    async function getUserId() {
        if (userId) return userId;
        const { data: { user } } = await supabase.auth.getUser();
        userId = user?.id || null;
        return userId;
    }

    const myCodeEl = document.getElementById('buddy-my-code');
    const generateBtn = document.getElementById('buddy-generate-btn');
    const codeNoteEl = document.getElementById('buddy-code-note');
    const redeemInput = document.getElementById('buddy-redeem-input');
    const redeemBtn = document.getElementById('buddy-redeem-btn');
    const redeemStatusEl = document.getElementById('buddy-redeem-status');
    const friendListEl = document.getElementById('buddy-friend-list');

    generateBtn.addEventListener('click', async () => {
        const uid = await getUserId();
        if (!uid) return;

        generateBtn.disabled = true;
        const code = generateCode();

        const { error } = await supabase.from('homework_buddy_invites').insert({
            code,
            inviter_id: uid,
        });

        generateBtn.disabled = false;

        if (error) {
            console.error('초대 코드 생성 실패:', error);
            codeNoteEl.textContent = '코드를 만드는 중 문제가 생겼어요.';
            return;
        }

        myCodeEl.textContent = code;
        codeNoteEl.textContent = '이 코드를 친구에게 알려주세요! (10분간 유효, 1회용)';
    });

    redeemBtn.addEventListener('click', async () => {
        const uid = await getUserId();
        if (!uid) return;

        const code = redeemInput.value.trim().toUpperCase();
        if (!code) {
            redeemStatusEl.textContent = '코드를 입력해주세요.';
            return;
        }

        redeemBtn.disabled = true;
        redeemStatusEl.textContent = '';

        const { data: invite, error: fetchError } = await supabase
            .from('homework_buddy_invites')
            .select('*')
            .eq('code', code)
            .maybeSingle();

        if (fetchError || !invite) {
            redeemBtn.disabled = false;
            redeemStatusEl.textContent = '존재하지 않는 코드예요.';
            return;
        }

        if (invite.used) {
            redeemBtn.disabled = false;
            redeemStatusEl.textContent = '이미 사용된 코드예요.';
            return;
        }

        if (new Date(invite.expires_at) < new Date()) {
            redeemBtn.disabled = false;
            redeemStatusEl.textContent = '만료된 코드예요. 친구에게 새 코드를 요청해주세요.';
            return;
        }

        if (invite.inviter_id === uid) {
            redeemBtn.disabled = false;
            redeemStatusEl.textContent = '본인의 코드는 사용할 수 없어요.';
            return;
        }

        // 양방향으로 저장해서 서로 검사할 수 있게 함
        const { error: linkError } = await supabase.from('homework_reviewers').insert([
            { student_id: invite.inviter_id, reviewer_id: uid },
            { student_id: uid, reviewer_id: invite.inviter_id },
        ]);

        if (linkError) {
            console.error('친구 연결 실패:', linkError);
            redeemBtn.disabled = false;
            redeemStatusEl.textContent = '이미 연결된 친구이거나 문제가 생겼어요.';
            return;
        }

        await supabase.from('homework_buddy_invites').update({ used: true }).eq('code', code);

        redeemBtn.disabled = false;
        redeemInput.value = '';
        redeemStatusEl.textContent = '연결됐어요! 🎉';
        loadFriends();
    });

    async function loadFriends() {
        const uid = await getUserId();
        if (!uid) return;

        const { data, error } = await supabase
            .from('homework_reviewers')
            .select('student_id, profiles:student_id(display_name)')
            .eq('reviewer_id', uid);

        if (error) {
            console.error('친구 목록 로드 실패:', error);
            friendListEl.innerHTML = '<p class="homework-empty">불러오지 못했어요.</p>';
            return;
        }

        if (!data || data.length === 0) {
            friendListEl.innerHTML = '<p class="homework-empty">아직 연결된 친구가 없어요.</p>';
            return;
        }

        friendListEl.innerHTML = data.map(row => `
            <button type="button" class="buddy-friend-row" data-id="${row.student_id}" data-name="${row.profiles?.display_name || '이름 없음'}">
                <span class="buddy-friend-name">${row.profiles?.display_name || '이름 없음'}</span>
                <span class="buddy-friend-arrow" aria-hidden="true">→</span>
            </button>
        `).join('');

        friendListEl.querySelectorAll('.buddy-friend-row').forEach(btn => {
            btn.addEventListener('click', () => {
                onOpenFriend({ id: btn.dataset.id, name: btn.dataset.name });
            });
        });
    }

    loadFriends();
}
