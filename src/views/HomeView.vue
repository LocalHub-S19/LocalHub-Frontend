<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { API, catToFront } from '@/api.js'
import { useRoute } from 'vue-router'

const router = useRouter()
const recent = ref([])

// 시간 포맷터 함수
function formatRelativeTime(dateString) {
  if (!dateString) return ''

  let targetDate

  if (dateString.includes('-') || dateString.includes('/')) {
    targetDate = new Date(dateString.replace(/-/g, '/').replace('T', ' '))
  } else if (dateString.includes('.')) {
    const parts = dateString.split('.')
    const now = new Date()

    targetDate = new Date(
      now.getFullYear(),
      parseInt(parts[0]) - 1,
      parseInt(parts[1]),
      parts[2] ? parseInt(parts[2]) : 0,
      parts[3] ? parseInt(parts[3]) : 0,
    )
  } else {
    targetDate = new Date(dateString)
  }

  if (Number.isNaN(targetDate.getTime())) return dateString

  const now = new Date()
  const diffMs = now - targetDate
  const diffMins = Math.floor(diffMs / 60000)

  if (diffMins < 1) return '방금 전'
  if (diffMins < 60) return `${diffMins}분 전`

  const diffHours = Math.floor(diffMins / 60)

  if (diffHours < 24) return `${diffHours}시간 전`

  return `${String(targetDate.getMonth() + 1).padStart(2, '0')}.${String(
    targetDate.getDate(),
  ).padStart(2, '0')}`
}

async function loadRecent() {
  try {
    const response = await fetch(API.POSTS)
    const data = await response.json()

    const posts = Array.isArray(data) ? data : data.items || []

    recent.value = posts.slice(0, 6).map((post) => ({
      ...post,
      category: catToFront[post.category] || post.category || '자유',
    }))
  } catch (error) {
    console.error('최근 게시글 불러오기 실패:', error)
  }
}

onMounted(loadRecent)

const categories = [
  {
    id: '자유',
    name: '자유',
    emoji: '💬',
    bg: 'linear-gradient(135deg, #f1f5f9 0%, #cbd5e1 100%)',
  },
  {
    id: '관광',
    name: '관광',
    emoji: '🗺️',
    bg: 'linear-gradient(135deg, #e0f2fe 0%, #bae6fd 100%)',
  },
  {
    id: '여행',
    name: '여행',
    emoji: '🎒',
    bg: 'linear-gradient(135deg, #ecfdf5 0%, #a7f3d0 100%)',
  },
  {
    id: '숙박',
    name: '숙박',
    emoji: '🏨',
    bg: 'linear-gradient(135deg, #f0fdf4 0%, #bbf7d0 100%)',
  },
  {
    id: '맛집',
    name: '맛집',
    emoji: '🍕',
    bg: 'linear-gradient(135deg, #fff7ed 0%, #ffedd5 100%)',
  },
  {
    id: '쇼핑',
    name: '쇼핑',
    emoji: '🛍️',
    bg: 'linear-gradient(135deg, #fee2e2 0%, #fca5a5 100%)',
  },
  {
    id: '문화',
    name: '문화',
    emoji: '🎨',
    bg: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)',
  },
  {
    id: '행사',
    name: '행사',
    emoji: '🎉',
    bg: 'linear-gradient(135deg, #f3e8ff 0%, #e9d5ff 100%)',
  },
  {
    id: '레포츠',
    name: '레포츠',
    emoji: '🚴',
    bg: 'linear-gradient(135deg, #eff6ff 0%, #bfdbfe 100%)',
  },
]

function goBoard() {
  router.push('/board')
}

function goExplore(tab = 'list') {
  router.push({
    path: '/explore',
    query: { tab },
  })
}

function openDetail(postId) {
  router.push(`/board/${postId}`)
}

function openCategory(categoryId) {
  router.push({
    path: '/board',
    query: { category: categoryId },
  })
}
</script>

<template>
  <div class="home-page">
    <!-- [수정] 데스크톱 2:1 비율, 모바일 세로 배치의 히어로 영역 -->
    <section class="hero-banner">
      <div class="hero-content">
        <span class="hero-tag">Local Experience</span>

        <h2 class="hero-title">
          지역 정보 공유 커뮤니티
          <span>LocalHub</span>
        </h2>

        <p class="hero-sub">
          우리가 만드는 우리 동네 이야기<br class="hero-break" />
          선정 권역 정보를 한눈에 만나보세요
        </p>

        <div class="hero-actions">
          <button
            type="button"
            class="hero-primary-btn"
            @click="goExplore('list')"
          >
            <span>서울 여행지 둘러보기</span>
            <span aria-hidden="true">→</span>
          </button>

          <button
            type="button"
            class="hero-secondary-btn"
            @click="goBoard"
          >
            커뮤니티 보기
          </button>
        </div>
      </div>

      <!-- [추가] 탐색 페이지 이동을 유도하는 우측 미리보기 카드 -->
      <button
        type="button"
        class="hero-explore-card"
        aria-label="지도에서 경로 찾기 페이지로 이동"
        @click="goExplore('map')"
      >
        <div class="explore-card-top">
          <span class="explore-card-label">Explore Seoul</span>
          <span class="explore-card-arrow" aria-hidden="true">↗</span>
        </div>

        <div class="explore-visual" aria-hidden="true">
          <span class="visual-pin pin-tour">🗺️</span>
          <span class="visual-pin pin-food">🍽️</span>
          <span class="visual-pin pin-event">🎉</span>
          <span class="visual-route"></span>
          <span class="visual-point point-a">A</span>
          <span class="visual-point point-b">B</span>
        </div>

        <div class="explore-card-copy">
          <strong>지도에서 경로 찾기</strong>
<span>출발지와 도착지를 선택하고 대중교통 이동 경로를 확인하세요.</span>
        </div>
      </button>
    </section>

    <section class="categories">
      <h3 class="section-label">어떤 정보를 찾으시나요?</h3>

      <div class="cat-grid">
        <div
          v-for="c in categories"
          :key="c.id"
          class="cat-card"
          role="button"
          tabindex="0"
          @click="openCategory(c.id)"
          @keydown.enter="openCategory(c.id)"
          @keydown.space.prevent="openCategory(c.id)"
        >
          <div
            class="thumb"
            :style="{ background: c.bg }"
          >
            <span class="cat-emoji">{{ c.emoji }}</span>
          </div>

          <div class="cat-name">{{ c.name }}</div>
        </div>
      </div>
    </section>

    <section class="recent">
      <div class="section-header">
        <div class="header-left">
          <h3 class="section-label">실시간 최근 게시글</h3>
          <span class="live-indicator">● LIVE</span>
        </div>

        <button
          type="button"
          class="view-all-btn"
          @click="goBoard"
        >
          전체보기 →
        </button>
      </div>

      <ul class="recent-list">
        <li
          v-for="p in recent"
          :key="p.id"
          class="recent-row"
          @click="openDetail(p.id)"
        >
          <div class="line">
            <div class="line-left">
              <span
                class="post-category"
                :class="{
                  'cat-free': !p.category || p.category === '자유',
                  'cat-tour': p.category === '관광',
                  'cat-trip': p.category === '여행',
                  'cat-stay': p.category === '숙박',
                  'cat-food': p.category === '맛집',
                  'cat-shopping': p.category === '쇼핑',
                  'cat-culture': p.category === '문화',
                  'cat-event': p.category === '행사',
                  'cat-sports': p.category === '레포츠',
                }"
              >
                {{ p.category || '자유' }}
              </span>

              <div class="skeleton-title">{{ p.title }}</div>
            </div>

            <div class="line-meta">
              <span
                v-if="p.views !== undefined"
                class="meta-item"
              >
                👀 {{ p.views }}
              </span>

              <span class="line-right">
                {{ formatRelativeTime(p.created_at) }}
              </span>
            </div>
          </div>
        </li>

        <li
          v-if="recent.length === 0"
          class="recent-row empty"
        >
          <div class="empty-state">
            <span class="empty-icon">✍️</span>
            <p>첫 번째 게시글의 주인공이 되어보세요!</p>
          </div>
        </li>
      </ul>
    </section>

    <!-- [추가] 홈 하단 데이터 출처·라이선스·GitHub 표시 -->
    <footer class="home-footer">
      <div class="footer-brand">
        <strong>LocalHub</strong>
        <span>서울 지역정보와 커뮤니티를 연결합니다.</span>
      </div>

      <div class="footer-source">
        <p>
          이 서비스는 한국관광공사
          <strong>TourAPI 4.0</strong>의 관광정보를 활용하였습니다.
        </p>

        <div class="footer-links">
          <a
            href="https://www.data.go.kr/data/15101578/openapi.do"
            target="_blank"
            rel="noopener noreferrer"
          >
            데이터 출처
          </a>

          <span aria-hidden="true">·</span>

          <a
            href="https://www.kogl.or.kr/info/licenseTypeView.do?licenseType=3"
            target="_blank"
            rel="noopener noreferrer"
          >
            공공누리 제3유형
          </a>

          <span aria-hidden="true">·</span>

          <a
            href="https://github.com/LocalHub-S19"
            target="_blank"
            rel="noopener noreferrer"
          >
            GitHub
          </a>
        </div>
      </div>

      <p class="footer-copyright">
        © 2026 LocalHub. Tourism data provided by Korea Tourism Organization.
      </p>
    </footer>
  </div>
</template>

<style scoped>
.home-page {
  width: 100%;
}

/* 히어로: 데스크톱에서 약 2:1 비율 */
.hero-banner {
  display: grid;
  grid-template-columns: minmax(0, 2fr) minmax(260px, 1fr);
  gap: 20px;
  margin-bottom: 32px;
  padding: 24px;
  overflow: hidden;
  border: 1px solid #dbeafe;
  border-radius: 20px;
  background:
    radial-gradient(
      circle at 16% 18%,
      rgba(255, 255, 255, 0.92),
      transparent 34%
    ),
    linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%);
}

.hero-content {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  justify-content: center;
  min-height: 240px;
  padding: 20px 24px;
}

.hero-tag {
  display: inline-flex;
  align-items: center;
  margin-bottom: 14px;
  padding: 5px 11px;
  border-radius: 999px;
  background: #2563eb;
  color: #ffffff;
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.6px;
  text-transform: uppercase;
}

.hero-title {
  max-width: 620px;
  margin: 0 0 12px;
  color: #1e3a8a;
  font-size: clamp(25px, 3.2vw, 38px);
  font-weight: 900;
  letter-spacing: -1.2px;
  line-height: 1.22;
}

.hero-title span {
  display: block;
  color: #2563eb;
}

.hero-sub {
  margin: 0;
  color: #475569;
  font-size: 15px;
  line-height: 1.7;
}

.hero-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 24px;
}

.hero-primary-btn,
.hero-secondary-btn {
  min-height: 44px;
  border-radius: 12px;
  font-size: 14px;
  font-weight: 800;
  cursor: pointer;
  transition:
    transform 0.18s ease,
    box-shadow 0.18s ease,
    background-color 0.18s ease;
}

.hero-primary-btn {
  display: inline-flex;
  gap: 12px;
  align-items: center;
  justify-content: center;
  padding: 0 18px;
  border: 1px solid #2563eb;
  background: #2563eb;
  color: #ffffff;
  box-shadow: 0 10px 22px rgba(37, 99, 235, 0.22);
}

.hero-secondary-btn {
  padding: 0 16px;
  border: 1px solid #bfdbfe;
  background: rgba(255, 255, 255, 0.68);
  color: #1d4ed8;
}

.hero-primary-btn:hover,
.hero-secondary-btn:hover {
  transform: translateY(-2px);
}

.hero-primary-btn:hover {
  background: #1d4ed8;
  box-shadow: 0 14px 26px rgba(37, 99, 235, 0.28);
}

.hero-secondary-btn:hover {
  background: #ffffff;
}

/* 우측 탐색 미리보기 */
.hero-explore-card {
  position: relative;
  display: flex;
  flex-direction: column;
  min-height: 240px;
  padding: 20px;
  overflow: hidden;
  border: 1px solid rgba(147, 197, 253, 0.8);
  border-radius: 18px;
  background:
    linear-gradient(
      155deg,
      rgba(255, 255, 255, 0.94),
      rgba(239, 246, 255, 0.88)
    );
  color: inherit;
  text-align: left;
  cursor: pointer;
  box-shadow: 0 16px 34px rgba(30, 64, 175, 0.12);
  transition:
    transform 0.2s ease,
    box-shadow 0.2s ease;
}

.hero-explore-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 20px 38px rgba(30, 64, 175, 0.18);
}

.explore-card-top {
  z-index: 2;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.explore-card-label {
  color: #2563eb;
  font-size: 12px;
  font-weight: 900;
  letter-spacing: 0.5px;
  text-transform: uppercase;
}

.explore-card-arrow {
  display: grid;
  width: 32px;
  height: 32px;
  place-items: center;
  border-radius: 50%;
  background: #dbeafe;
  color: #1d4ed8;
  font-size: 17px;
  font-weight: 900;
}

.explore-visual {
  position: relative;
  flex: 1;
  min-height: 116px;
  margin: 8px 0 12px;
  border-radius: 16px;
  background:
    linear-gradient(
      90deg,
      transparent 49%,
      rgba(148, 163, 184, 0.18) 50%,
      transparent 51%
    ),
    linear-gradient(
      transparent 49%,
      rgba(148, 163, 184, 0.18) 50%,
      transparent 51%
    );
  background-size: 28px 28px;
}

.visual-route {
  position: absolute;
  top: 51%;
  left: 18%;
  width: 64%;
  height: 38px;
  border-top: 3px dashed #60a5fa;
  border-radius: 50%;
  transform: rotate(-8deg);
}

.visual-pin,
.visual-point {
  position: absolute;
  z-index: 2;
  display: grid;
  place-items: center;
  box-shadow: 0 7px 14px rgba(15, 23, 42, 0.13);
}

.visual-pin {
  width: 38px;
  height: 38px;
  border: 2px solid #ffffff;
  border-radius: 12px;
  background: #ffffff;
  font-size: 18px;
}

.pin-tour {
  top: 12%;
  left: 14%;
}

.pin-food {
  top: 48%;
  right: 12%;
}

.pin-event {
  right: 35%;
  bottom: 2%;
}

.visual-point {
  width: 25px;
  height: 25px;
  border-radius: 50%;
  color: #ffffff;
  font-size: 11px;
  font-weight: 900;
}

.point-a {
  bottom: 12%;
  left: 10%;
  background: #2563eb;
}

.point-b {
  top: 8%;
  right: 8%;
  background: #7c3aed;
}

.explore-card-copy {
  z-index: 2;
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.explore-card-copy strong {
  color: #1e3a8a;
  font-size: 16px;
  font-weight: 900;
}

.explore-card-copy span {
  color: #64748b;
  font-size: 12px;
  line-height: 1.5;
}

.categories {
  margin-bottom: 32px;
}

.section-label {
  margin: 0 0 16px;
  color: #111827;
  font-size: 16px;
  font-weight: 700;
  letter-spacing: -0.3px;
}

.cat-grid {
  display: grid;
  grid-template-columns: repeat(9, 1fr);
  gap: 12px;
}

.cat-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 12px 8px;
  border: 1px solid #f1f5f9;
  border-radius: 14px;
  background: #ffffff;
  cursor: pointer;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.02);
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}

.cat-card:hover,
.cat-card:focus-visible {
  border-color: #cbd5e1;
  outline: none;
  transform: translateY(-4px);
  box-shadow: 0 12px 20px -8px rgba(0, 0, 0, 0.1);
}

.thumb {
  display: flex;
  width: 56px;
  height: 56px;
  align-items: center;
  justify-content: center;
  margin-bottom: 8px;
  border-radius: 12px;
}

.cat-emoji {
  font-size: 24px;
}

.cat-name {
  color: #374151;
  font-size: 13px;
  font-weight: 700;
  text-align: center;
}

.recent {
  margin-top: 24px;
}

.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 8px;
}

.header-left .section-label {
  margin-bottom: 0;
}

.live-indicator {
  color: #ef4444;
  font-size: 10px;
  font-weight: 800;
  animation: pulse 1.5s infinite;
}

@keyframes pulse {
  0% {
    opacity: 0.4;
  }

  50% {
    opacity: 1;
  }

  100% {
    opacity: 0.4;
  }
}

.view-all-btn {
  padding: 4px 8px;
  border: none;
  border-radius: 6px;
  background: none;
  color: #2563eb;
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
  transition: background-color 0.15s ease;
}

.view-all-btn:hover {
  background-color: #eff6ff;
}

.recent-list {
  overflow: hidden;
  border: 1px solid #e2e8f0;
  border-radius: 14px;
  background: #ffffff;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
}

.recent-row {
  display: flex;
  align-items: center;
  padding: 16px 20px;
  border-bottom: 1px solid #f1f5f9;
  cursor: pointer;
  transition: background-color 0.15s ease;
}

.recent-row:last-child {
  border-bottom: none;
}

.recent-row:hover {
  background: #f8fafc;
}

.line {
  display: flex;
  width: 100%;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.line-left {
  display: flex;
  flex: 1;
  min-width: 0;
  align-items: center;
  gap: 12px;
}

.post-category {
  padding: 2px 8px;
  border-radius: 6px;
  font-size: 11px;
  font-weight: 700;
  white-space: nowrap;
}

.post-category.cat-free {
  background: #f1f5f9;
  color: #475569;
}

.post-category.cat-tour {
  background: #e0f2fe;
  color: #0369a1;
}

.post-category.cat-trip {
  background: #ecfdf5;
  color: #047857;
}

.post-category.cat-stay {
  background: #f0fdf4;
  color: #15803d;
}

.post-category.cat-food {
  background: #fff7ed;
  color: #c2410c;
}

.post-category.cat-shopping {
  background: #fee2e2;
  color: #b91c1c;
}

.post-category.cat-culture {
  background: #fef3c7;
  color: #b45309;
}

.post-category.cat-event {
  background: #f3e8ff;
  color: #6b21a8;
}

.post-category.cat-sports {
  background: #eff6ff;
  color: #1d4ed8;
}

.skeleton-title {
  overflow: hidden;
  color: #1e293b;
  font-size: 14px;
  font-weight: 500;
  line-height: 1.4;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.recent-row:hover .skeleton-title {
  color: #2563eb;
}

.line-meta {
  display: flex;
  align-items: center;
  gap: 12px;
  color: #94a3b8;
  font-size: 12px;
}

.line-right {
  white-space: nowrap;
}

.empty-state {
  display: flex;
  width: 100%;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 40px 0;
}

.empty-icon {
  font-size: 28px;
}

.empty-state p {
  margin: 0;
  color: #94a3b8;
  font-size: 14px;
}

/* 홈 하단 출처 표기 */
.home-footer {
  display: grid;
  grid-template-columns: minmax(160px, 0.8fr) minmax(280px, 1.6fr);
  gap: 22px 40px;
  margin-top: 48px;
  padding: 28px 6px 12px;
  border-top: 1px solid #e2e8f0;
  color: #64748b;
}

.footer-brand {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.footer-brand strong {
  color: #1e3a8a;
  font-size: 18px;
  font-weight: 900;
}

.footer-brand span,
.footer-source p,
.footer-copyright {
  margin: 0;
  font-size: 12px;
  line-height: 1.65;
}

.footer-source strong {
  color: #334155;
}

.footer-links {
  display: flex;
  flex-wrap: wrap;
  gap: 7px;
  margin-top: 8px;
  font-size: 12px;
}

.footer-links a {
  color: #2563eb;
  font-weight: 700;
  text-decoration: none;
}

.footer-links a:hover {
  text-decoration: underline;
}

.footer-copyright {
  grid-column: 1 / -1;
  padding-top: 2px;
  color: #94a3b8;
}

/* 태블릿 */
@media (max-width: 900px) {
  .hero-banner {
    grid-template-columns: minmax(0, 1.65fr) minmax(230px, 1fr);
    padding: 18px;
  }

  .hero-content {
    padding: 18px;
  }

  .cat-grid {
    grid-template-columns: repeat(5, 1fr);
  }
}

/* 모바일 */
@media (max-width: 640px) {
  .hero-banner {
    grid-template-columns: 1fr;
    gap: 14px;
    margin-bottom: 24px;
    padding: 14px;
    border-radius: 17px;
  }

  .hero-content {
    min-height: auto;
    padding: 18px 12px 10px;
    text-align: left;
  }

  .hero-title {
    font-size: 24px;
    letter-spacing: -0.8px;
  }

  .hero-title span {
    display: inline;
    margin-left: 4px;
  }

  .hero-sub {
    font-size: 13px;
  }

  .hero-break {
    display: none;
  }

  .hero-actions {
    width: 100%;
    margin-top: 20px;
  }

  .hero-primary-btn {
    flex: 1;
  }

  .hero-secondary-btn {
    flex: 0 0 auto;
  }

  .hero-explore-card {
    min-height: 210px;
    padding: 17px;
  }

  .explore-visual {
    min-height: 100px;
  }

  .cat-grid {
    grid-template-columns: repeat(3, 1fr);
    gap: 8px;
  }

  .cat-card {
    padding: 10px;
  }

  .thumb {
    width: 48px;
    height: 48px;
    margin-bottom: 4px;
  }

  .cat-emoji {
    font-size: 20px;
  }

  .recent-row {
    padding: 14px 12px;
  }

  .line-left {
    gap: 8px;
  }

  .post-category {
    display: none;
  }

  .line-meta {
    gap: 8px;
  }

  .meta-item {
    display: none;
  }

  .home-footer {
    grid-template-columns: 1fr;
    gap: 18px;
    margin-top: 36px;
    padding-top: 24px;
  }

  .footer-copyright {
    grid-column: auto;
  }
}

@media (max-width: 420px) {
  .hero-actions {
    flex-direction: column;
  }

  .hero-primary-btn,
  .hero-secondary-btn {
    width: 100%;
  }

  .section-header {
    align-items: flex-start;
  }

  .line {
    gap: 8px;
  }
}
</style>
