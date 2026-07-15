<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()
const BOARD_KEY = 'localhub_boards'
const recent = ref([])

// 시간 포맷터 함수
function formatRelativeTime(dateString) {
  if (!dateString) return ''
  
  let targetDate;
  if (dateString.includes('-') || dateString.includes('/')) {
    targetDate = new Date(dateString.replace(/-/g, '/').replace('T', ' '));
  } else if (dateString.includes('.')) {
    const parts = dateString.split('.')
    const now = new Date()
    targetDate = new Date(
      now.getFullYear(), 
      parseInt(parts[0]) - 1, 
      parseInt(parts[1]), 
      parts[2] ? parseInt(parts[2]) : 0, 
      parts[3] ? parseInt(parts[3]) : 0
    )
  } else {
    targetDate = new Date(dateString)
  }

  if (isNaN(targetDate.getTime())) return dateString

  const now = new Date()
  const diffMs = now - targetDate
  const diffMins = Math.floor(diffMs / 60000)
  
  if (diffMins < 1) return '방금 전'
  if (diffMins < 60) return `${diffMins}분 전`
  
  const diffHours = Math.floor(diffMins / 60)
  if (diffHours < 24) return `${diffHours}시간 전`
  
  return `${String(targetDate.getMonth() + 1).padStart(2, '0')}.${String(targetDate.getDate()).padStart(2, '0')}`
}

function loadRecent() {
  const raw = localStorage.getItem(BOARD_KEY)
  if (!raw) {
    const now = new Date()
    const yesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 18, 30, 0)
    
    const seed = [
      {
        post_id: "1",
        category: "자유",
        title: "동대문 야시장 먹거리 투어 다녀왔어요!",
        content: "주말이라 그런지 사람이 정말 많았는데 꼬치가 맛있었습니다.",
        created_at: yesterday.toISOString(),
        views: 124
      },
      {
        post_id: "2",
        category: "관광",
        title: "한강 피크닉 명당 자리 추천해 드립니다 🌳",
        content: "여의도보다는 뚝섬 유원지 인근 언덕이 노을 보기에 한적하고 좋아요.",
        created_at: now.toISOString(),
        views: 89
      }
    ]
    localStorage.setItem(BOARD_KEY, JSON.stringify(seed))
    recent.value = seed.slice(-6).reverse()
    return
  }
  
  const arr = JSON.parse(raw)
  recent.value = arr.slice(-6).reverse()
}

onMounted(loadRecent)

const categories = [
  { id: '자유', name: '자유', emoji: '💬', bg: 'linear-gradient(135deg, #f1f5f9 0%, #cbd5e1 100%)' },
  { id: '관광', name: '관광', emoji: '🗺️', bg: 'linear-gradient(135deg, #e0f2fe 0%, #bae6fd 100%)' },
  { id: '행사', name: '행사', emoji: '🎉', bg: 'linear-gradient(135deg, #f3e8ff 0%, #e9d5ff 100%)' },
  { id: '문화', name: '문화', emoji: '🎨', bg: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)' },
  { id: '쇼핑', name: '쇼핑', emoji: '🛍️', bg: 'linear-gradient(135deg, #fee2e2 0%, #fca5a5 100%)' }
]

function goBoard() { router.push('/board') }
function goWrite() { router.push('/board/write') }
function openDetail(postId) { router.push(`/board/${postId}`) }

// 💡 2글자 명칭 그대로 쿼리 스트링 파라미터로 넘겨 연동합니다.
function openCategory(categoryId) { 
  router.push(`/board?category=${categoryId}`) 
}
</script>

<template>
  <div class="home-page">
    <header class="home-header">
      <div class="logo-area">
        <span class="logo-emoji">🏡</span>
        <span class="logo-text">LocalHub</span>
      </div>
      <button class="write-btn" @click="goWrite">
        <span class="plus-icon">+</span> 새 글 쓰기
      </button>
    </header>

    <div class="hero-banner">
      <div class="hero-inner">
        <span class="hero-tag">Local Experience</span>
        <h2 class="hero-title">지역 정보 공유 커뮤니티 <span>LocalHub</span></h2>
        <p class="hero-sub">우리가 만드는 우리 동네 이야기 | 선정 권역 정보를 한눈에 만나보세요</p>
      </div>
    </div>

    <section class="categories">
      <h3 class="section-label">어떤 정보를 찾으시나요?</h3>
      <div class="cat-row">
        <div v-for="c in categories" :key="c.id" class="cat-card" @click="openCategory(c.id)">
          <div class="thumb" :style="{ background: c.bg }"><span class="cat-emoji">{{ c.emoji }}</span></div>
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
        <button class="view-all-btn" @click="goBoard">전체보기 →</button>
      </div>
      
      <ul class="recent-list">
        <li v-for="p in recent" :key="p.post_id" class="recent-row" @click="openDetail(p.post_id)">
          <div class="line">
            <div class="line-left">
              <span 
                class="post-category" 
                :class="{
                  'cat-free': !p.category || p.category === '자유',
                  'cat-tour': p.category === '관광', 
                  'cat-event': p.category === '행사',
                  'cat-culture': p.category === '문화',
                  'cat-shopping': p.category === '쇼핑'
                }"
              >
                {{ p.category || '자유' }}
              </span>
              <div class="skeleton-title">{{ p.title }}</div>
            </div>
            <div class="line-meta">
              <span class="meta-item" v-if="p.views !== undefined">👀 {{ p.views }}</span>
              <span class="line-right">{{ formatRelativeTime(p.created_at) }}</span>
            </div>
          </div>
        </li>
        <li v-if="recent.length === 0" class="recent-row empty">
          <div class="empty-state">
            <span class="empty-icon">✍️</span><p>첫 번째 게시글의 주인공이 되어보세요!</p>
          </div>
        </li>
      </ul>
    </section>
  </div>
</template>

<style scoped>
.home-page { max-width: 1000px; margin: 0 auto; padding: 16px 16px 40px; box-sizing: border-box; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
.home-header { display: flex; justify-content: space-between; align-items: center; padding: 8px 0 20px 0; border-bottom: 1px solid #f1f5f9; margin-bottom: 24px; }
.logo-area { display: flex; align-items: center; gap: 8px; }
.logo-emoji { font-size: 22px; }
.logo-text { font-size: 18px; font-weight: 800; color: #0f172a; letter-spacing: -0.3px; }
.write-btn { background: #2563eb; color: #fff; border: none; padding: 8px 16px; border-radius: 8px; font-size: 13px; font-weight: 700; cursor: pointer; box-shadow: 0 4px 10px rgba(37, 99, 235, 0.15); transition: all 0.2s ease; display: flex; align-items: center; gap: 5px; }
.write-btn:hover { background: #1d4ed8; transform: translateY(-1px); box-shadow: 0 6px 14px rgba(37, 99, 235, 0.25); }
.plus-icon { font-size: 14px; font-weight: bold; }
.hero-banner { background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%); border-radius: 16px; padding: 40px 24px; margin-bottom: 32px; display: flex; justify-content: center; align-items: center; border: 1px solid #dbeafe; }
.hero-inner { max-width: 600px; text-align: center; }
.hero-tag { display: inline-block; background: #2563eb; color: white; font-size: 11px; font-weight: 700; text-transform: uppercase; padding: 4px 10px; border-radius: 20px; margin-bottom: 12px; letter-spacing: 0.5px; }
.hero-title { color: #1e3a8a; font-weight: 800; margin: 0 0 10px; font-size: 24px; letter-spacing: -0.5px; }
.hero-title span { color: #2563eb; }
.hero-sub { margin: 0; color: #4b5563; font-size: 14px; line-height: 1.5; }
.categories { margin-bottom: 32px; }
.section-label { margin: 0 0 12px 0; color: #111827; font-weight: 700; font-size: 16px; letter-spacing: -0.3px; }
.cat-row { display: flex; gap: 12px; align-items: stretch; }
.cat-card { flex: 1; background: #fff; border: 1px solid #f1f5f9; border-radius: 14px; padding: 12px; display: flex; flex-direction: column; align-items: center; cursor: pointer; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.02), 0 2px 4px -1px rgba(0, 0, 0, 0.01); transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1); }
.cat-card:hover { transform: translateY(-4px); box-shadow: 0 12px 20px -8px rgba(0, 0, 0, 0.1); border-color: #cbd5e1; }
.thumb { width: 100%; height: 80px; display: flex; align-items: center; justify-content: center; border-radius: 10px; margin-bottom: 8px; }
.cat-emoji { font-size: 28px; }
.cat-name { color: #374151; font-weight: 700; font-size: 13px; }
.recent { margin-top: 24px; }
.section-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; }
.header-left { display: flex; align-items: center; gap: 8px; }
.live-indicator { font-size: 10px; color: #ef4444; font-weight: 800; animation: pulse 1.5s infinite; }
@keyframes pulse { 0% { opacity: 0.4; } 50% { opacity: 1; } 100% { opacity: 0.4; } }
.view-all-btn { background: none; border: none; color: #2563eb; font-size: 13px; font-weight: 700; cursor: pointer; padding: 4px 8px; border-radius: 6px; transition: background-color 0.15s ease; }
.view-all-btn:hover { background-color: #eff6ff; }
.recent-list { background: #ffffff; border: 1px solid #e2e8f0; border-radius: 14px; overflow: hidden; box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.05); }
.recent-row { padding: 16px 20px; display: flex; align-items: center; border-bottom: 1px solid #f1f5f9; cursor: pointer; transition: background-color 0.15s ease; }
.recent-row:last-child { border-bottom: none; }
.recent-row:hover { background: #f8fafc; }
.line { display: flex; width: 100%; align-items: center; justify-content: space-between; gap: 16px; }
.line-left { display: flex; align-items: center; gap: 12px; flex: 1; min-width: 0; }

.post-category { font-size: 11px; font-weight: 700; padding: 2px 8px; border-radius: 6px; white-space: nowrap; background: #f1f5f9; color: #475569; }
.post-category.cat-free { background: #f1f5f9; color: #475569; }
.post-category.cat-tour { background: #e0f2fe; color: #0369a1; }
.post-category.cat-event { background: #f3e8ff; color: #6b21a8; }
.post-category.cat-culture { background: #fef3c7; color: #b45309; }
.post-category.cat-shopping { background: #fee2e2; color: #b91c1c; }

.skeleton-title { color: #1e293b; font-size: 14px; font-weight: 500; line-height: 1.4; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.recent-row:hover .skeleton-title { color: #2563eb; }
.line-meta { display: flex; align-items: center; gap: 12px; font-size: 12px; color: #94a3b8; }
.line-right { white-space: nowrap; }
.empty-state { display: flex; flex-direction: column; align-items: center; gap: 8px; padding: 40px 0; width: 100%; }
.empty-icon { font-size: 28px; }
.empty-state p { margin: 0; color: #94a3b8; font-size: 14px; }

@media (max-width: 640px) {
  .hero-banner { padding: 24px 16px; margin-bottom: 24px; }
  .hero-title { font-size: 19px; }
  .cat-row { display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px; }
  .cat-card { padding: 10px; }
  .thumb { height: 60px; margin-bottom: 4px; }
  .cat-emoji { font-size: 22px; }
  .recent-row { padding: 14px 12px; }
  .line-left { gap: 8px; }
  .post-category { display: none; }
}
</style>