<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { API, catToFront, catToBack } from '@/api.js'

const router = useRouter()
const route = useRoute()

const all = ref([])
const selectedCategory = ref('전체')
const searchQuery = ref('')
const searchInput = ref('')

const page = ref(1)
// 💡 1. 전체 페이지 수를 프론트엔드가 계산하지 않고, 서버가 주는 값을 담을 수 있게 변경
const totalPages = ref(1) 

const categories = ['전체', '자유', '관광', '여행', '숙박', '맛집', '쇼핑', '문화', '행사', '레포츠']

function formatRelativeTime(dateString) {
  if (!dateString) return ''
  const d = new Date(dateString)
  if (isNaN(d.getTime())) return dateString

  const MM = String(d.getMonth() + 1).padStart(2, '0')
  const DD = String(d.getDate()).padStart(2, '0')
  const HH = String(d.getHours()).padStart(2, '0')
  const mm = String(d.getMinutes()).padStart(2, '0')
  return `${MM}.${DD} ${HH}:${mm}`
}

async function load() {
  try {
    // 💡 1. 현재 선택된 카테고리를 서버용 이름으로 변환 (전체는 빈 문자열로 처리)
    const categoryQuery = selectedCategory.value === '전체' 
      ? '' 
      : `&category=${catToBack[selectedCategory.value] || selectedCategory.value}`

    // 💡 2. URL에 page와 category를 둘 다 합쳐서 요청
    const url = `${API.POSTS}?page=${page.value}${categoryQuery}`
    const response = await fetch(url)
    const data = await response.json()

    // 💡 3. 서버가 주는 전체 페이지 수 업데이트
    totalPages.value = data.total_pages || 1
    
    // 💡 4. 데이터 저장 (백엔드 구조에 맞춰 items 사용)
    const posts = data.items || []

    all.value = posts.map(post => ({
      ...post,
      category: catToFront[post.category] || post.category || '자유'
    })).sort((a, b) => (b.id || 0) - (a.id || 0))
    
  } catch (error) {
    console.error('글 목록 불러오기 실패:', error)
  }
}

// 화면 필터링 기능 (카테고리 및 검색)
const filtered = computed(() => {
  return all.value.filter(b => {
    const matchCat = selectedCategory.value === '전체' || b.category === selectedCategory.value
    const keyword = searchQuery.value.trim().toLowerCase()
    const matchSearch = !keyword || 
      (b.title && b.title.toLowerCase().includes(keyword)) || 
      (b.content && b.content.toLowerCase().includes(keyword))
    return matchCat && matchSearch
  })
})

// 💡 4. 이미 서버가 20개씩 잘라서 주므로, 프론트에서 또 자를(slice) 필요 없이 그대로 노출!
const pageItems = computed(() => {
  return filtered.value
})

function doSearch() {
  searchQuery.value = searchInput.value
  page.value = 1
}

function setCategory(c) {
  selectedCategory.value = c
  page.value = 1 // 카테고리가 바뀌면 무조건 1페이지로!
  load()         // 새로 불러오기!
  router.push({ query: { ...route.query, category: c === '전체' ? undefined : c } })
}

function openDetail(id) {
  router.push(`/board/${id}`)
}

function goWrite() {
  router.push('/board/write')
}

onMounted(load)

watch(() => route.query.category, (newCat) => {
  if (newCat && categories.includes(newCat)) {
    selectedCategory.value = newCat
  } else if (!newCat) {
    selectedCategory.value = '전체'
  }
  page.value = 1
})

// 💡 5. 사용자가 2번, 3번 페이지 버튼을 누를 때마다 서버에서 새 데이터를 불러오도록 감시
watch(page, () => {
  load()
  window.scrollTo({ top: 0, behavior: 'smooth' })
})
</script>

<template>
  <div class="board-page">
    <div class="breadcrumb">
      <span class="home-icon">🏠</span> 홈 <span class="arrow">&gt;</span> <span class="current">커뮤니티 광장</span>
    </div>

    <div class="page-header">
      <h1 class="page-title">실시간 지역 게시판</h1>
      <p class="page-desc">다양한 사람들과 유용한 소식을 자유롭게 공유해보세요.</p>
    </div>

    <div class="category-tabs-container">
      <div class="category-tabs">
        <button 
          v-for="c in categories" 
          :key="c"
          :class="['tab-btn', { active: selectedCategory === c }]"
          @click="setCategory(c)"
        >
          {{ c }}
        </button>
      </div>
    </div>

    <div class="list-controls">
      <div class="search-area">
        <div class="search-input-wrapper">
          <span class="search-icon">🔍</span>
          <input 
            v-model="searchInput" 
            placeholder="제목이나 내용으로 검색해보세요" 
            @keyup.enter="doSearch"
          />
        </div>
        <button class="search-btn" @click="doSearch">검색</button>
      </div>
      <button class="write-btn" @click="goWrite">
        <span class="plus-icon">+</span> 새 글 쓰기
      </button>
    </div>

    <div class="table-wrap">
      <table class="board-table" v-if="filtered.length > 0">
        <thead>
          <tr>
            <th class="col-num">번호</th>
            <th class="col-title">글 제목</th>
            <th class="col-views">조회수</th>
            <th class="col-date">작성일</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="b in pageItems" :key="b.id || b.post_id" class="row" @click="openDetail(b.id || b.post_id)">
            <td class="num">{{ b.id || b.post_id }}</td>
            <td class="title-content">
              <span 
                class="badge-cat" 
                :class="{
                  'cat-free': !b.category || b.category === '자유',
                  'cat-tour': b.category === '관광', 
                  'cat-trip': b.category === '여행',
                  'cat-stay': b.category === '숙박',
                  'cat-food': b.category === '맛집',
                  'cat-shopping': b.category === '쇼핑',
                  'cat-culture': b.category === '문화',
                  'cat-event': b.category === '행사',
                  'cat-sports': b.category === '레포츠'
                }"
              >
                {{ b.category || '자유' }}
              </span>
              <span class="title-text">{{ b.title }}</span>
            </td>
            <td class="views">{{ b.views ?? b.view_count ?? b.hits ?? b.read_count ?? 0 }}</td>
            <td class="date">{{ formatRelativeTime(b.created_at) }}</td>
          </tr>
        </tbody>
      </table>

      <div class="empty-state" v-else>
        <div class="empty-icon">📭</div>
        <p class="empty-text">아직 작성된 게시글이 없어요.</p>
        <p class="empty-sub">첫 번째 글의 주인공이 되어보세요!</p>
      </div>
    </div>

    <div class="pagination" v-if="totalPages > 0">
      <button class="page-btn" :disabled="page === 1" @click="page--">‹ 이전</button>
      <div class="page-nums">
        <button 
          v-for="p in totalPages" 
          :key="p"
          :class="['page-num', { active: page === p }]"
          @click="page = p"
        >
          {{ p }}
        </button>
      </div>
      <button class="page-btn" :disabled="page === totalPages" @click="page++">다음 ›</button>
    </div>
  </div>
</template>

<style scoped>
/* 💡 1200px 확장 및 비율 고정 코드 */
.board-page { 
  width: 100%;       
  max-width: 1200px;
  margin: 0 auto; 
  padding: 24px 16px; 
  box-sizing: border-box; 
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; 
}

.breadcrumb { color: #94a3b8; font-size: 13px; margin-bottom: 16px; display: flex; align-items: center; gap: 6px; }
.home-icon { font-size: 14px; }
.breadcrumb .arrow { color: #cbd5e1; font-weight: bold; }
.breadcrumb .current { color: #64748b; font-weight: 500; }
.page-header { margin-bottom: 20px; }
.page-title { margin: 0 0 6px 0; font-size: 22px; font-weight: 800; color: #0f172a; letter-spacing: -0.5px; }
.page-desc { margin: 0; color: #64748b; font-size: 14px; }

.category-tabs-container { border-bottom: 2px solid #e2e8f0; margin-bottom: 24px; }
.category-tabs { display: flex; width: 100%; }
.tab-btn { flex: 1; text-align: center; background: none; border: none; border-bottom: 2px solid transparent; padding: 12px 0; margin-bottom: -2px; font-size: 14px; font-weight: 700; color: #64748b; cursor: pointer; transition: all 0.15s ease-in-out; }
.tab-btn:hover { color: #1e293b; }
.tab-btn.active { color: #2563eb; border-bottom-color: #2563eb; }

.list-controls { display: flex; justify-content: space-between; gap: 12px; align-items: center; margin-bottom: 16px; }
.search-area { display: flex; gap: 8px; flex: 1; max-width: 500px; align-items: center; }
.search-input-wrapper { position: relative; width: 100%; display: flex; align-items: center; }
.search-icon { position: absolute; left: 12px; color: #94a3b8; font-size: 14px; }
.search-input-wrapper input { width: 100%; padding: 10px 12px 10px 36px; border-radius: 10px; border: 1px solid #cbd5e1; outline: none; font-size: 14px; background: #ffffff; transition: all 0.2s ease; }
.search-input-wrapper input:focus { border-color: #2563eb; box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1); }
.search-btn { background: #0f172a; color: #fff; border: none; padding: 10px 18px; border-radius: 10px; font-size: 14px; font-weight: 600; cursor: pointer; transition: background-color 0.15s ease; white-space: nowrap; }
.search-btn:hover { background: #1e293b; }
.write-btn { background: #2563eb; color: #fff; border: none; padding: 10px 18px; border-radius: 10px; font-size: 14px; font-weight: 700; cursor: pointer; box-shadow: 0 4px 12px rgba(37, 99, 235, 0.15); transition: all 0.2s ease; display: flex; align-items: center; gap: 6px; white-space: nowrap; }
.write-btn:hover { background: #1d4ed8; transform: translateY(-1px); box-shadow: 0 6px 16px rgba(37, 99, 235, 0.25); }
.plus-icon { font-size: 16px; font-weight: bold; }

/* 💡 테이블을 감싸는 박스와 고정 레이아웃 */
.table-wrap { 
  width: 100%; 
  box-sizing: border-box; 
  background: #fff; 
  border-radius: 14px; 
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.02), 0 2px 4px -1px rgba(0, 0, 0, 0.01), 0 0 0 1px #e2e8f0; 
  overflow: hidden; 
}

.board-table { 
  width: 100%; 
  border-collapse: collapse; 
  table-layout: fixed; 
}
.board-table thead { background: #f8fafc; }

.board-table th, .board-table td { padding: 16px 12px; border-bottom: 1px solid #f1f5f9; vertical-align: middle; }
.board-table tr:last-child td { border-bottom: none; }
.board-table thead th { color: #475569; font-weight: 700; font-size: 13px; letter-spacing: 0.5px; text-transform: uppercase; }

.col-num { width: 80px; text-align: center !important; }
.col-title { width: auto; text-align: left !important; }
.col-views { width: 100px; text-align: center !important; }
.col-date { width: 150px; text-align: center !important; }

.row { cursor: pointer; transition: background-color 0.15s ease; }
.row:hover { background: #f8fafc; }

.num { color: #64748b; font-size: 13px; font-weight: 500; text-align: center; }
.views { color: #64748b; font-size: 13px; text-align: center; }
.date { color: #94a3b8; font-size: 13px; text-align: center; } 

.title-content { display: flex; align-items: center; gap: 10px; max-width: 100%; text-align: left; overflow: hidden; }
.title-text { color: #0f172a; font-size: 15px; font-weight: 600; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; flex: 1; }
.row:hover .title-text { color: #2563eb; }

.badge-cat { font-size: 11px; font-weight: 700; padding: 2px 8px; border-radius: 6px; white-space: nowrap; background: #f1f5f9; color: #475569; flex-shrink: 0; }
.badge-cat.cat-free { background: #f1f5f9; color: #475569; }
.badge-cat.cat-tour { background: #e0f2fe; color: #0369a1; }
.badge-cat.cat-trip { background: #ecfdf5; color: #047857; }
.badge-cat.cat-stay { background: #f0fdf4; color: #15803d; }
.badge-cat.cat-food { background: #fff7ed; color: #c2410c; }
.badge-cat.cat-shopping { background: #fee2e2; color: #b91c1c; }
.badge-cat.cat-culture { background: #fef3c7; color: #b45309; }
.badge-cat.cat-event { background: #f3e8ff; color: #6b21a8; }
.badge-cat.cat-sports { background: #eff6ff; color: #1d4ed8; }

.empty-state { display: flex; flex-direction: column; align-items: center; gap: 4px; padding: 48px 0; text-align: center; }
.empty-icon { font-size: 32px; margin-bottom: 8px; }
.empty-text { font-size: 15px; font-weight: 600; color: #64748b; margin: 0; }
.empty-sub { font-size: 13px; color: #94a3b8; margin: 0; }

.pagination { display: flex; justify-content: space-between; align-items: center; margin: 24px 0; }
.page-btn { display: flex; align-items: center; gap: 6px; padding: 8px 14px; border-radius: 8px; border: 1px solid #cbd5e1; background: #fff; font-size: 13px; font-weight: 600; color: #334155; cursor: pointer; transition: all 0.15s ease; }
.page-btn:hover:not(:disabled) { background: #f8fafc; border-color: #94a3b8; }
.page-btn:disabled { opacity: 0.4; cursor: not-allowed; }
.page-nums { display: flex; gap: 6px; }
.page-num { padding: 8px 12px; border-radius: 8px; border: 1px solid transparent; background: transparent; font-size: 14px; font-weight: 500; color: #64748b; cursor: pointer; transition: all 0.15s ease; }
.page-num:hover { background: #f1f5f9; color: #334155; }
.page-num.active { background: #eff6ff; border-color: #bfdbfe; color: #2563eb; font-weight: 700; }

@media (max-width: 640px) {
  .list-controls { flex-direction: column-reverse; align-items: stretch; }
  .search-area { max-width: 100%; }
  .write-btn { justify-content: center; }
  .col-num, .col-views, .num, .views { display: none; }
  .col-date { width: 80px; }
  .badge-cat { display: none; }
  .tab-btn { font-size: 12px; padding: 8px 0; }
}
</style>