<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'

const BOARD_KEY = 'localhub_boards'
const router = useRouter()

const all = ref([])
const query = ref('')
const page = ref(1)
const perPage = 7

function load() {
  const raw = localStorage.getItem(BOARD_KEY)
  if (!raw) {
    // seed a few items for demo
    const seed = []
    for (let i = 1; i <= 13; i++) {
      const d = new Date()
      d.setDate(d.getDate() - (13 - i))
      seed.push({
        id: String(Date.now() + i),
        title: `샘플 글 제목 ${i}`,
        content: `샘플 내용 ${i}`,
        createdAt: `${String(d.getMonth()+1).padStart(2,'0')}.${String(d.getDate()).padStart(2,'0')}`
      })
    }
    localStorage.setItem(BOARD_KEY, JSON.stringify(seed))
    all.value = seed
  } else {
    all.value = JSON.parse(raw)
  }
}

onMounted(load)

const filtered = computed(() => {
  const q = query.value.trim().toLowerCase()
  const list = all.value.slice().reverse()
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

function doSearch() {
  page.value = 1
}

function goWrite() {
  router.push('/board/write')
}

function openDetail(id) {
  router.push(`/board/${id}`)
}

function goPage(n) {
  if (n < 1) n = 1
  if (n > totalPages.value) n = totalPages.value
  page.value = n
}
</script>

<template>
  <div class="board-page">
    <div class="breadcrumb">홈 &gt; 게시판</div>

    <div class="list-controls">
      <div class="search-area">
        <input v-model="query" @keyup.enter="doSearch" placeholder="게시글 검색어를 입력하세요" />
        <button class="search-btn" @click="doSearch">검색</button>
      </div>
      <button class="write-btn" @click="goWrite">+ 글쓰기</button>
    </div>

    <div class="table-wrap">
      <table class="board-table">
        <thead>
          <tr>
            <th style="width:72px">번호</th>
            <th>제목</th>
            <th style="width:110px">작성일</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(b, idx) in pageItems" :key="b.id" class="row" @click="openDetail(b.id)">
            <td class="num">{{ (filtered.length - ((page-1)*perPage) ) - idx }}</td>
            <td class="title">
              <div class="skeleton">{{ b.title }}</div>
            </td>
            <td class="date">{{ b.createdAt }}</td>
          </tr>

          <tr v-if="pageItems.length === 0">
            <td colspan="3" class="empty">검색 결과가 없습니다.</td>
          </tr>
        </tbody>
      </table>
    </div>

    <div class="pagination">
      <button class="page-btn" :disabled="page<=1" @click="goPage(page-1)">◀</button>
      <button
        v-for="n in totalPages"
        :key="n"
        :class="['page-num', { active: page===n }]"
        @click="goPage(n)"
      >{{ n }}</button>
      <button class="page-btn" :disabled="page>=totalPages" @click="goPage(page+1)">▶</button>
    </div>
  </div>
</template>

<style scoped>
.board-page {
  max-width: 1100px;
  margin: 0 auto;
  padding: 18px;
  box-sizing: border-box;
}

/* breadcrumb */
.breadcrumb {
  color: #6b7280;
  font-size: 13px;
  margin-bottom: 10px;
}

/* controls */
.list-controls {
  display:flex;
  justify-content:space-between;
  gap:12px;
  align-items:center;
  margin-bottom:12px;
}
.search-area {
  display:flex;
  gap:8px;
  flex:1;
  align-items:center;
}
.search-area input {
  width:100%;
  padding:10px 12px;
  border-radius:6px;
  border:1px solid #e6edf3;
  outline:none;
  font-size:14px;
}
.search-btn {
  background:#111827;
  color:#fff;
  border:none;
  padding:10px 14px;
  border-radius:6px;
  cursor:pointer;
}
.write-btn {
  background:#2563eb;
  color:#fff;
  border:none;
  padding:10px 14px;
  border-radius:6px;
  cursor:pointer;
}

/* table */
.table-wrap {
  background:#fff;
  border-radius:8px;
  box-shadow: 0 4px 18px rgba(2,6,23,0.04);
  overflow:hidden;
}
.board-table { width:100%; border-collapse:collapse; }
.board-table thead { background:#f9fafb; }
.board-table th, .board-table td {
  padding:14px 16px;
  text-align:left;
  border-top:1px solid #f1f5f9;
  vertical-align:middle;
}
.board-table thead th {
  color:#374151;
  font-weight:600;
}
.row { cursor:pointer; }
.row:hover { background:#fbfdff; }

.num { color:#6b7280; width:72px; text-align:center; }

.title .skeleton {
  /* 실제 제목 텍스트가 보이도록 변경 */
  height: auto;
  background: none;
  border-radius: 0;
  width: auto;
  color: #111827;       /* 제목 색상 */
  font-size: 15px;
  line-height: 1.4;
  padding: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.date { color:#9ca3af; width:110px; white-space:nowrap; text-align:right; }

/* empty */
.empty { text-align:center; padding:24px; color:#6b7280; }

/* pagination */
.pagination { display:flex; justify-content:center; gap:8px; margin:18px 0; align-items:center; }
.page-btn {
  padding:6px 10px;
  border-radius:6px;
  border:1px solid #e6edf3;
  background:#fff;
  cursor:pointer;
}
.page-btn:disabled { opacity:0.5; cursor:not-allowed; }
.page-num {
  padding:6px 10px;
  border-radius:6px;
  border:1px solid #e6edf3;
  background:#fff;
  cursor:pointer;
}
.page-num.active {
  background:#f8fafc;
  border-color:#cfe0ff;
  color:#2563eb;
  font-weight:600;
}
</style>