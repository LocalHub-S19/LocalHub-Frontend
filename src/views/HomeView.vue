<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
// 💡 번역 사전(catToFront) 임포트 추가
import { API, catToFront } from '@/api.js'

const router = useRouter()
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

async function loadRecent() {
  try {
    const response = await fetch(API.POSTS)
    const data = await response.json()
    
    const posts = Array.isArray(data) ? data : (data.items || []) 
    
    // 💡 백엔드 데이터를 가져와서 카테고리를 프론트 화면용으로 번역 처리
    recent.value = posts.slice(0, 6).map(post => ({
      ...post,
      category: catToFront[post.category] || post.category || '자유'
    }))
  } catch (error) {
    console.error('최근 게시글 불러오기 실패:', error)
  }
}

onMounted(loadRecent)

// 💡 9가지 카테고리로 완벽 반영 (정사각형에 잘 어울리도록 조율)
const categories = [
  { id: '자유', name: '자유', emoji: '💬', bg: 'linear-gradient(135deg, #f1f5f9 0%, #cbd5e1 100%)' },
  { id: '관광', name: '관광', emoji: '🗺️', bg: 'linear-gradient(135deg, #e0f2fe 0%, #bae6fd 100%)' },
  { id: '여행', name: '여행', emoji: '🎒', bg: 'linear-gradient(135deg, #ecfdf5 0%, #a7f3d0 100%)' },
  { id: '숙박', name: '숙박', emoji: '🏨', bg: 'linear-gradient(135deg, #f0fdf4 0%, #bbf7d0 100%)' },
  { id: '맛집', name: '맛집', emoji: '🍕', bg: 'linear-gradient(135deg, #fff7ed 0%, #ffedd5 100%)' },
  { id: '쇼핑', name: '쇼핑', emoji: '🛍️', bg: 'linear-gradient(135deg, #fee2e2 0%, #fca5a5 100%)' },
  { id: '문화', name: '문화', emoji: '🎨', bg: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)' },
  { id: '행사', name: '행사', emoji: '🎉', bg: 'linear-gradient(135deg, #f3e8ff 0%, #e9d5ff 100%)' },
  { id: '레포츠', name: '레포츠', emoji: '🚴', bg: 'linear-gradient(135deg, #eff6ff 0%, #bfdbfe 100%)' }
]

function goBoard() { router.push('/board') }
function goWrite() { router.push('/board/write') }
function openDetail(postId) { router.push(`/board/${postId}`) }

function openCategory(categoryId) { 
  router.push(`/board?category=${categoryId}`) 
}
</script>

<template>
  <div class="home-page">

    <div class="hero-banner">
      <div class="hero-inner">
        <span class="hero-tag">Local Experience</span>
        <h2 class="hero-title">지역 정보 공유 커뮤니티 <span>LocalHub</span></h2>
        <p class="hero-sub">우리가 만드는 우리 동네 이야기 | 선정 권역 정보를 한눈에 만나보세요</p>
      </div>
    </div>

    <section class="categories">
      <h3 class="section-label">어떤 정보를 찾으시나요?</h3>
      <div class="cat-grid">
        <div v-for="c in categories" :key="c.id" class="cat-card" @click="openCategory(c.id)">
          <div class="thumb" :style="{ background: c.bg }">
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
        <button class="view-all-btn" @click="goBoard">전체보기 →</button>
      </div>
      
      <ul class="recent-list">
        <li v-for="p in recent" :key="p.id" class="recent-row" @click="openDetail(p.id)">
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
                  'cat-sports': p.category === '레포츠'
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
.hero-banner { background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%); border-radius: 16px; padding: 40px 24px; margin-bottom: 32px; display: flex; justify-content: center; align-items: center; border: 1px solid #dbeafe; }
.hero-inner { max-width: 600px; text-align: center; }
.hero-tag { display: inline-block; background: #2563eb; color: white; font-size: 11px; font-weight: 700; text-transform: uppercase; padding: 4px 10px; border-radius: 20px; margin-bottom: 12px; letter-spacing: 0.5px; }
.hero-title { color: #1e3a8a; font-weight: 800; margin: 0 0 10px; font-size: 24px; letter-spacing: -0.5px; }
.hero-title span { color: #2563eb; }
.hero-sub { margin: 0; color: #4b5563; font-size: 14px; line-height: 1.5; }

.categories { margin-bottom: 32px; }
.section-label { margin: 0 0 16px 0; color: #111827; font-weight: 700; font-size: 16px; letter-spacing: -0.3px; }

/* 💡 카테고리 9개를 예쁘게 나열하기 위한 그리드 레이아웃 */
.cat-grid {
  display: grid;
  grid-template-columns: repeat(9, 1fr);
  gap: 12px;
}
.cat-card {
  background: #fff;
  border: 1px solid #f1f5f9;
  border-radius: 14px;
  padding: 12px 8px;
  display: flex;
  flex-direction: column;
  align-items: center;
  cursor: pointer;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.02);
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}
.cat-card:hover { transform: translateY(-4px); box-shadow: 0 12px 20px -8px rgba(0, 0, 0, 0.1); border-color: #cbd5e1; }

/* 💡 정사각형 이미지 썸네일 설정 */
.thumb {
  width: 56px;
  height: 56px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 12px;
  margin-bottom: 8px;
}
.cat-emoji { font-size: 24px; }
.cat-name { color: #374151; font-weight: 700; font-size: 13px; text-align: center; }

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

/* 💡 각 카테고리별 테마 컬러 설정 */
.post-category { font-size: 11px; font-weight: 700; padding: 2px 8px; border-radius: 6px; white-space: nowrap; }
.post-category.cat-free { background: #f1f5f9; color: #475569; }
.post-category.cat-tour { background: #e0f2fe; color: #0369a1; }
.post-category.cat-trip { background: #ecfdf5; color: #047857; }
.post-category.cat-stay { background: #f0fdf4; color: #15803d; }
.post-category.cat-food { background: #fff7ed; color: #c2410c; }
.post-category.cat-shopping { background: #fee2e2; color: #b91c1c; }
.post-category.cat-culture { background: #fef3c7; color: #b45309; }
.post-category.cat-event { background: #f3e8ff; color: #6b21a8; }
.post-category.cat-sports { background: #eff6ff; color: #1d4ed8; }

.skeleton-title { color: #1e293b; font-size: 14px; font-weight: 500; line-height: 1.4; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.recent-row:hover .skeleton-title { color: #2563eb; }
.line-meta { display: flex; align-items: center; gap: 12px; font-size: 12px; color: #94a3b8; }
.line-right { white-space: nowrap; }
.empty-state { display: flex; flex-direction: column; align-items: center; gap: 8px; padding: 40px 0; width: 100%; }
.empty-icon { font-size: 28px; }
.empty-state p { margin: 0; color: #94a3b8; font-size: 14px; }

/* 반응형 레이아웃 대응 */
@media (max-width: 840px) {
  .cat-grid { grid-template-columns: repeat(5, 1fr); }
}
@media (max-width: 640px) {
  .hero-banner { padding: 24px 16px; margin-bottom: 24px; }
  .hero-title { font-size: 19px; }
  .cat-grid { grid-template-columns: repeat(3, 1fr); gap: 8px; }
  .cat-card { padding: 10px; }
  .thumb { width: 48px; height: 48px; margin-bottom: 4px; }
  .cat-emoji { font-size: 20px; }
  .recent-row { padding: 14px 12px; }
  .line-left { gap: 8px; }
  .post-category { display: none; }
}
</style>