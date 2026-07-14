<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()
const BOARD_KEY = 'localhub_boards'
const recent = ref([])

function loadRecent() {
  const raw = localStorage.getItem(BOARD_KEY)
  if (!raw) { recent.value = []; return }
  const arr = JSON.parse(raw)
  recent.value = arr.slice(-6).reverse()
}

onMounted(loadRecent)

const categories = [
  { id: 'cat1', name: '관광지' },
  { id: 'cat2', name: '맛집' },
  { id: 'cat3', name: '축제 · 행사' }
]

function goBoard() { router.push('/board') }
function openDetail(id) { router.push(`/board/${id}`) }
function openCategory(id) { router.push('/board') }
</script>

<template>
  <div class="home-page">
    <!-- hero banner -->
    <div class="hero-banner">
      <div class="hero-inner">
        <h2 class="hero-title">지역 정보 공유 커뮤니티 LocalHub</h2>
        <p class="hero-sub">선정 권역 (OO/OO) | 지역 정보를 한눈에 만나보세요</p>
      </div>
    </div>

    <!-- category quick links -->
    <section class="categories">
      <h3 class="section-label">카테고리 바로가기</h3>
      <div class="cat-row">
        <div v-for="c in categories" :key="c.id" class="cat-card" @click="openCategory(c.id)">
          <div class="thumb">
            <svg viewBox="0 0 100 60" preserveAspectRatio="xMidYMid meet" class="placeholder">
              <rect x="1" y="1" width="98" height="58" rx="4" ry="4" fill="#fff"></rect>
              <path d="M6 46 L94 46" stroke="#e6edf3" stroke-width="3" stroke-linecap="round"/>
            </svg>
          </div>
          <div class="cat-name">{{ c.name }}</div>
        </div>
      </div>
    </section>

    <!-- recent posts list -->
    <section class="recent">
      <h3 class="section-label">최근 게시글</h3>
      <ul class="recent-list">
        <li v-for="p in recent" :key="p.id" class="recent-row" @click="openDetail(p.id)">
          <div class="line">
            <div class="line-left">
              <div class="skeleton-title">{{ p.title }}</div>
            </div>
            <div class="line-right">{{ p.createdAt }}</div>
          </div>
        </li>

        <li v-if="recent.length === 0" class="recent-row empty">최근 게시글이 없습니다.</li>
      </ul>

      <div class="board-cta">
        <button class="btn" @click="goBoard">게시판 바로가기</button>
      </div>
    </section>
  </div>
</template>

<style scoped>
.home-page {
  max-width: 1100px;
  margin: 0 auto;
  padding: 18px;
  box-sizing: border-box;
}

/* Hero banner */
.hero-banner {
  background: #eef6ff;
  border-radius: 6px;
  padding: 18px;
  margin-bottom: 18px;
  display:flex;
  justify-content:center;
  align-items:center;
}
.hero-inner {
  max-width: 860px;
  text-align:center;
  padding: 12px 18px;
}
.hero-title {
  color: #2563eb;
  font-weight:700;
  margin: 0 0 6px;
  font-size: 18px;
}
.hero-sub {
  margin: 0;
  color: #6b7280;
  font-size: 13px;
}

/* categories */
.categories { margin-top: 8px; }
.section-label { margin: 8px 0; color:#111827; font-weight:600; font-size:14px; }
.cat-row {
  display:flex;
  gap:12px;
  align-items:stretch;
}
.cat-card {
  flex:1;
  background:#fff;
  border:1px solid #e6edf3;
  border-radius:6px;
  padding:10px;
  display:flex;
  flex-direction:column;
  align-items:center;
  cursor:pointer;
  transition:transform .12s ease, box-shadow .12s ease;
}
.cat-card:hover { transform: translateY(-6px); box-shadow: 0 8px 20px rgba(2,6,23,0.06); }
.thumb { width:100%; height:86px; display:flex; align-items:center; justify-content:center; background:#fafafa; border-radius:4px; margin-bottom:8px; }
.placeholder { width:90%; height:70px; fill:none; stroke:#d1d5db; opacity:0.9; }
.cat-name { color:#111827; font-weight:600; font-size:14px; }

/* recent list */
.recent { margin-top: 18px; }
.recent-list { list-style:none; padding:0; margin:0; }
.recent-row {
  padding: 12px 10px;
  display:flex;
  align-items:center;
  border-bottom: 1px solid #f1f5f9;
  cursor:pointer;
}
.recent-row:hover { background:#fbfdff; }
.line { display:flex; width:100%; align-items:center; justify-content:space-between; gap:12px; }
.skeleton-title {
  /* 기존 스켈레톤(투명 텍스트) 대신 실제 제목이 보이도록 수정 */
  height: auto;
  background: none;
  border-radius: 6px;
  width: 100%;
  padding: 0;
  color: #111827;        /* 가독성 좋은 텍스트 색 */
  font-size: 14px;
  line-height: 1.3;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.line-right { color:#9ca3af; font-size:13px; white-space:nowrap; }

/* empty */
.empty { padding:24px; color:#6b7280; text-align:center; }

/* CTA */
.board-cta { display:flex; justify-content:flex-end; margin-top:10px; }
.btn {
  background:#2563eb;
  color:#fff;
  border:none;
  padding:8px 12px;
  border-radius:8px;
  cursor:pointer;
  font-weight:600;
}

/* responsive */
@media (max-width: 880px) {
  .cat-row { flex-direction:row; }
  .hero-inner { padding:12px; }
}
@media (max-width: 640px) {
  .cat-row { flex-direction:column; }
  .cat-card { width:100%; }
  .recent-row { padding:10px 6px; }
}
</style>