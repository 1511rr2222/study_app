
const DISMISS_KEY = 'yerin_onboarding_dismissed';

const SLIDES = [
    { emoji: '📚', title: '숙제 체크', desc: '숙제를 등록하고, 완료하면 인증사진을 올려보세요. 날짜별로 모아서 볼 수 있고, 기한을 넘긴 숙제는 색으로 표시돼요.' },
    { emoji: '🗓️', title: '내 계획', desc: '요일별 시간표를 만들고, 오늘 하루를 몇 점으로 해냈는지 짧게 기록해보세요.' },
    { emoji: '🔥', title: '그릿 챌린지', desc: '작은 목표를 정해 며칠간 도전해보세요. 매일 인증사진을 올리면 성공 스트릭이 쌓여요.' },
    { emoji: '🤝', title: '친구 인증', desc: '친구를 초대 코드로 연결하면, 서로의 숙제를 확인하고 인증해줄 수 있어요.' },
    { emoji: '🧠', title: '역량 진단', desc: '나의 학습 습관을 진단해보고, 강점/보완점에 맞는 예시를 확인해보세요.' },
    { emoji: '🔤', title: '영단어 퀴즈', desc: 'Day별로 영단어를 연습하고, 맞춘 개수와 연습 횟수가 기록으로 남아요.' },
    { emoji: '📊', title: '성적 기록', desc: '내신·모의고사 성적을 입력하면 학기/회차별 등급 추이를 그래프로 볼 수 있고, 목표 등급도 설정할 수 있어요.' },
];

let currentSlide = 0;
let dismissChecked = false;

// 대시보드 열릴 때마다 호출 - "다시 보지 않기" 체크가 안 되어 있으면 보여줌
export function initOnboarding() {
    const dismissed = localStorage.getItem(DISMISS_KEY) === '1';
    if (!dismissed) {
        showOnboarding();
    }
}

// 헤더의 "도움말" 메뉴 등에서 강제로 다시 보고 싶을 때 호출
export function showOnboarding() {
    if (document.getElementById('onboarding-overlay')) return; // 이미 떠있으면 중복 생성 방지

    currentSlide = 0;
    dismissChecked = false;

    const overlay = document.createElement('div');
    overlay.id = 'onboarding-overlay';
    overlay.className = 'onboarding-overlay';
    document.body.appendChild(overlay);

    render();

    function render() {
        const slide = SLIDES[currentSlide];
        const isLast = currentSlide === SLIDES.length - 1;

        overlay.innerHTML = `
            <div class="onboarding-box">
                <div class="onboarding-emoji">${slide.emoji}</div>
                <h3 class="onboarding-title">${slide.title}</h3>
                <p class="onboarding-desc">${slide.desc}</p>

                <div class="onboarding-dots">
                    ${SLIDES.map((_, i) => `<span class="onboarding-dot ${i === currentSlide ? 'active' : ''}"></span>`).join('')}
                </div>

                <div class="onboarding-nav-row">
                    <button type="button" id="onboarding-prev-btn" class="onboarding-nav-btn" ${currentSlide === 0 ? 'disabled' : ''}>← 이전</button>
                    ${isLast
                        ? `<button type="button" id="onboarding-close-btn" class="pink-button onboarding-start-btn">시작하기 🎉</button>`
                        : `<button type="button" id="onboarding-next-btn" class="pink-button onboarding-start-btn">다음 →</button>`
                    }
                </div>

                <label class="onboarding-dismiss-row">
                    <input type="checkbox" id="onboarding-dismiss-check" ${dismissChecked ? 'checked' : ''}>
                    다시 보지 않기
                </label>
            </div>
        `;

        document.getElementById('onboarding-prev-btn').addEventListener('click', () => {
            if (currentSlide > 0) {
                currentSlide -= 1;
                render();
            }
        });

        const nextBtn = document.getElementById('onboarding-next-btn');
        if (nextBtn) {
            nextBtn.addEventListener('click', () => {
                currentSlide += 1;
                render();
            });
        }

        document.getElementById('onboarding-close-btn')?.addEventListener('click', close);

        document.getElementById('onboarding-dismiss-check').addEventListener('change', (e) => {
            dismissChecked = e.target.checked;
        });

        // 어두운 바깥 영역 클릭으로도 닫힘
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) close();
        });
    }

    function close() {
        if (dismissChecked) {
            localStorage.setItem(DISMISS_KEY, '1');
        }
        overlay.remove();
    }
}