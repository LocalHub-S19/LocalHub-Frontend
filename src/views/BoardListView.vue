<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { API } from '@/api.js'

const BOARD_KEY = 'localhub_boards'
const router = useRouter()
const route = useRoute()

const all = ref([])
const query = ref('')
const selectedCategory = ref('전체')
const page = ref(1)
const perPage = 7

const categories = ['전체', '자유', '관광', '행사', '문화', '쇼핑']

// 💡 24시간 기준 정밀 시간 표기 포맷터 (쌍점 ':' 기호 적용 버전)
function formatListDate(dateString) {
  if (!dateString) return '';
  
  let d;
  if (dateString.includes('-') || dateString.includes('T') || dateString.includes('/')) {
    d = new Date(dateString.replace(/-/g, '/').replace('T', ' ')); 
  } else if (dateString.includes('.')) {
    const parts = dateString.split('.');
    if (parts.length >= 2) {
      const now = new Date();
      d = new Date(
        now.getFullYear(), 
        parseInt(parts[0]) - 1, 
        parseInt(parts[1]), 
        parts[2] ? parseInt(parts[2]) : 0, 
        parts[3] ? parseInt(parts[3]) : 0
      );
    } else {
      return dateString;
    }
  } else {
    d = new Date(dateString);
  }

  if (isNaN(d.getTime())) return dateString;

  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffHours = diffMs / (1000 * 60 * 60);

  const MM = String(d.getMonth() + 1).padStart(2, '0');
  const DD = String(d.getDate()).padStart(2, '0');
  const HH = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');

  // 💡 24시간 미만인 글: HH:MM 양식
  if (diffHours < 24) {
    return `${HH}:${mm}`;
  }
  // 💡 24시간이 지난 글: MM.DD HH:MM 양식
  return `${MM}.${DD} ${HH}:${mm}`;
}

async function load() {
  try {
    const response = await fetch(API.POSTS)
    const data = await response.json()
    
    // 💡 data.items를 넣어주어야 배열로 인식해서 화면에 정상 출력됩니다.
    all.value = data.items || [] 
  } catch (error) {
    console.error('글 목록 불러오기 실패:', error)
  }

  // 탭 연동 로직
  const queryCategory = route.query.category
  if (queryCategory && categories.includes(queryCategory)) {
    selectedCategory.value = queryCategory
  }
}

onMounted(load)

const filtered = computed(() => {
  const q = query.value.trim().toLowerCase()
  let list = all.value.slice().reverse()

  if (selectedCategory.value !== '전체') {
    list = list.filter(item => (item.category || '자유') === selectedCategory.value)
  }

  if (!q) return list
  return list.filter(item =>
    (item.title || '').toLowerCase().includes(q) ||
    (item.content || '').toLowerCase().includes(q)
  )
})

const totalPages = computed(() => Math.max(1, Math.ceil(filtered.value.length / perPage)))
const pageItems = computed(() => {
  const start = (page.value - 1) * perPage
  return filtered.value.slice(start, start + perPage)
})

function setCategory(cat) { selectedCategory.value = cat; page.value = 1 }
function doSearch() { page.value = 1 }
function goWrite() { router.push('/board/write') }
function openDetail(postId) { router.push(`/board/${postId}`) }
function goPage(n) {
  if (n < 1) n = 1
  if (n > totalPages.value) n = totalPages.value
  page.value = n
}
</script>

<template>
  <div class="board-page">
    <div class="breadcrumb">
      <span class="home-icon">🏠</span> 홈 <span class="arrow">&gt;</span> <span class="current">커뮤니티 광장</span>
    </div>

    <div class="page-header">
      <h2 class="page-title">실시간 지역 게시판</h2>
      <p class="page-desc">다양한 사람들과 유용한 소식을 자유롭게 공유해보세요.</p>
    </div>

    <div class="category-tabs-container">
      <div class="category-tabs">
        <button 
          v-for="cat in categories" 
          :key="cat"
          :class="['tab-btn', { active: selectedCategory === cat }]"
          @click="setCategory(cat)"
        >
          {{ cat }}
        </button>
      </div>
    </div>

    <div class="list-controls">
      <div class="search-area">
        <div class="search-input-wrapper">
          <span class="search-icon">🔍</span>
          <input v-model="query" @keyup.enter="doSearch" placeholder="제목이나 내용으로 검색해보세요" />
        </div>
        <button class="search-btn" @click="doSearch">검색</button>
      </div>
      <button class="write-btn" @click="goWrite">
        <span class="plus-icon">+</span> 새 글 쓰기
      </button>
    </div>

    <div class="table-wrap">
      <table class="board-table">
        <thead>
          <tr>
            <th class="col-num">번호</th>
            <th class="col-title">글 제목</th>
            <th class="col-views">조회수</th>
            <th class="col-date">작성일</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(b, idx) in pageItems" :key="b.id" class="row" @click="openDetail(b.id)">
            <td class="num">{{ (filtered.length - ((page-1)*perPage) ) - idx }}</td>
            <td class="title">
              <div class="title-content">
                <span 
                  v-if="selectedCategory === '전체'" 
                  class="badge-cat" 
                  :class="{
                    'cat-free': !b.category || b.category === '자유',
                    'cat-tour': b.category === '관광', 
                    'cat-event': b.category === '행사',
                    'cat-culture': b.category === '문화',
                    'cat-shopping': b.category === '쇼핑'
                  }"
                >
                  {{ b.category || '자유' }}
                </span>
                <span class="title-text">{{ b.title }}</span>
              </div>
            </td>
            <td class="views">{{ b.views || 0 }}</td>
            <td class="date">{{ formatListDate(b.created_at) }}</td>
          </tr>

          <tr v-if="pageItems.length === 0">
            <td colspan="4" class="empty">
              <div class="empty-state">
                <span class="empty-icon">📭</span>
                <p class="empty-text">선택된 카테고리의 글이 존재하지 않습니다.</p>
                <p class="empty-sub">첫 번째 이야기를 작성해보세요!</p>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <div class="pagination">
      <button class="page-btn" :disabled="page<=1" @click="goPage(page-1)">
        <span>&lsaquo;</span> 이전
      </button>
      <div class="page-nums">
        <button
          v-for="n in totalPages"
          :key="n"
          :class="['page-num', { active: page===n }]"
          @click="goPage(n)"
        >{{ n }}</button>
      </div>
      <button class="page-btn" :disabled="page>=totalPages" @click="goPage(page+1)">
        다음 <span>&rsaquo;</span>
      </button>
    </div>
  </div>
</template>

<style scoped>
.board-page { max-width: 1000px; margin: 0 auto; padding: 24px 16px; box-sizing: border-box; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
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

.table-wrap { background: #fff; border-radius: 14px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.02), 0 2px 4px -1px rgba(0, 0, 0, 0.01), 0 0 0 1px #e2e8f0; overflow: hidden; }
.board-table { width: 100%; border-collapse: collapse; }
.board-table thead { background: #f8fafc; }

.board-table th, .board-table td { padding: 16px 12px; border-bottom: 1px solid #f1f5f9; vertical-align: middle; }
.board-table tr:last-child td { border-bottom: none; }
.board-table thead th { color: #475569; font-weight: 700; font-size: 13px; letter-spacing: 0.5px; text-transform: uppercase; }

/* 💡 컬럼 가로 너비 최소 최적화 세팅 */
.col-num { width: 60px; text-align: center !important; }
.col-title { width: auto; text-align: left !important; }
.col-views { width: 70px; text-align: center !important; }
.col-date { width: 130px; text-align: center !important; } /* 날짜 자수 증가에 맞춰 가독 범위 가변 조절 */

.row { cursor: pointer; transition: background-color 0.15s ease; }
.row:hover { background: #f8fafc; }

/* 💡 데이터 행(Row) 셀 중앙 정렬 속성 마감 */
.num { color: #64748b; font-size: 13px; font-weight: 500; text-align: center; }
.views { color: #64748b; font-size: 13px; text-align: center; }
.date { color: #94a3b8; font-size: 13px; text-align: center; } 

.title-content { display: flex; align-items: center; gap: 10px; max-width: 100%; text-align: left; }
.title-text { color: #0f172a; font-size: 15px; font-weight: 600; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.row:hover .title-text { color: #2563eb; }

.badge-cat { font-size: 11px; font-weight: 700; padding: 2px 8px; border-radius: 6px; white-space: nowrap; background: #f1f5f9; color: #475569; }
.badge-cat.cat-free { background: #f1f5f9; color: #475569; }
.badge-cat.cat-tour { background: #e0f2fe; color: #0369a1; }
.badge-cat.cat-event { background: #f3e8ff; color: #6b21a8; }
.badge-cat.cat-culture { background: #fef3c7; color: #b45309; }
.badge-cat.cat-shopping { background: #fee2e2; color: #b91c1c; }

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