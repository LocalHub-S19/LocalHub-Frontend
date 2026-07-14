<script setup>
import { ref, onMounted, computed, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'

const BOARD_KEY = 'localhub_boards'
const route = useRoute()
const router = useRouter()
const id = computed(() => route.params.id)
const item = ref(null)

const pwModal = ref(false)
const actionType = ref('') // 'edit' or 'delete'
const inputPw = ref('')
const error = ref('')

const recentPosts = ref([])

function load() {
  const raw = localStorage.getItem(BOARD_KEY)
  if (!raw) { item.value = null; recentPosts.value = []; return }
  const arr = JSON.parse(raw)
  item.value = arr.find(x => String(x.id) === String(id.value)) || null

  // recent posts: newest first, exclude current, take up to 4
  recentPosts.value = arr.slice().reverse().filter(x => String(x.id) !== String(id.value)).slice(0, 4)
}

function askEdit() { actionType.value = 'edit'; inputPw.value=''; error.value=''; pwModal.value = true }
function askDelete() { actionType.value = 'delete'; inputPw.value=''; error.value=''; pwModal.value = true }

function confirmPw() {
  if (!item.value) return
  if ((item.value.password || '') === inputPw.value) {
    pwModal.value = false
    if (actionType.value === 'edit') router.push(`/board/edit/${id.value}`)
    if (actionType.value === 'delete') {
      const raw = localStorage.getItem(BOARD_KEY)
      if (!raw) return
      const arr = JSON.parse(raw).filter(x => String(x.id) !== String(id.value))
      localStorage.setItem(BOARD_KEY, JSON.stringify(arr))
      router.push('/board')
    }
  } else {
    error.value = '비밀번호가 일치하지 않습니다.'
  }
}

function openDetail(pid) {
  router.push(`/board/${pid}`)
}

function goList() {
  router.push('/board')
}

onMounted(load)
watch(id, load)
</script>

<template>
  <div class="detail-page">
    <div class="breadcrumb">홈 &gt; 게시판 &gt; 게시글 상세</div>

    <article class="post-card" v-if="item">
      <header class="post-header">
        <h1 class="post-title">{{ item.title }}</h1>
        <div class="post-meta">작성일: {{ item.createdAt }}</div>
      </header>

      <section class="post-body">
        <p v-if="item.content" class="post-text">{{ item.content }}</p>
        <p v-else class="post-text empty">본문이 없습니다.</p>
      </section>

      <footer class="post-actions">
        <div class="spacer"></div>
        <div class="right">
          <button class="btn btn-edit" @click="askEdit">수정</button>
          <button class="btn btn-delete" @click="askDelete">삭제</button>
        </div>
      </footer>
    </article>

    <!-- Recent posts under the article -->
    <section class="recent-block" v-if="recentPosts.length">
      <button class="recent-title link" @click="goList" aria-label="게시글 목록으로 이동">게시글 목록</button>
      <ul class="recent-grid">
        <li
          v-for="p in recentPosts"
          :key="p.id"
          class="recent-card"
          @click="openDetail(p.id)"
          @keydown.enter.prevent="openDetail(p.id)"
          tabindex="0"
          role="button"
          :aria-label="`게시글 ${p.title} 열기`"
        >
          <div class="recent-row-top">
            <span class="recent-name">{{ p.title }}</span>
            <span class="recent-date">{{ p.createdAt }}</span>
          </div>
          <p class="recent-excerpt">{{ (p.content || '').slice(0, 60) }}{{ (p.content||'').length > 60 ? '…' : '' }}</p>
        </li>
      </ul>
    </section>

    <div v-else class="recent-block">
      <h3 class="recent-title">게시글 목록</h3>
      <p class="no-recent">최근 게시글이 없습니다.</p>
    </div>

    <!-- Password modal -->
    <div v-if="pwModal" class="modal-backdrop" @click.self="pwModal=false">
      <div class="modal" role="dialog" aria-modal="true">
        <h3>비밀번호 확인</h3>
        <p>이 작업을 진행하려면 작성 시 설정한 비밀번호를 입력하세요.</p>
        <input v-model="inputPw" type="password" placeholder="비밀번호 입력" />
        <div class="err" v-if="error">{{ error }}</div>
        <div class="modal-actions">
          <button class="modal-btn modal-confirm" @click="confirmPw">확인</button>
          <button class="modal-btn modal-cancel" @click="pwModal=false">취소</button>
        </div>
      </div>
    </div>
  </div>
</template>

<style>
:root{
  --blue-700: #1f3fb8;
  --red-600: #dc2626;
  --muted: #6b7280;
  --blue-500: #2563eb;
}
</style>

<style scoped>
/* Layout */
.detail-page { max-width:980px; margin:0 auto; padding:18px; box-sizing:border-box; }
.breadcrumb { color:var(--muted); font-size:13px; margin-bottom:12px; }

/* Post card */
.post-card {
  background:#fff; padding:20px; border-radius:8px; box-shadow: 0 6px 24px rgba(2,6,23,0.04);
  display:flex; flex-direction:column; gap:18px;
}
.post-header { display:flex; flex-direction:column; gap:6px; }
.post-title { margin:0; font-size:20px; color:#0f172a; }
.post-meta { color:var(--muted); font-size:13px; }

.post-body { flex:1; }
.post-text { color:#374151; line-height:1.8; white-space:pre-wrap; }

/* Actions placed under content */
.post-actions {
  display:flex; justify-content:space-between; align-items:center; gap:12px;
  padding-top:6px; border-top:1px solid #f1f5f9;
}
.spacer { flex:1; }

/* ensure right group spacing */
.post-actions .right {
  display: flex;
  gap: 18px;
  align-items: center;
}

/* Buttons base */
.btn {
  padding:8px 14px;
  border-radius:6px;
  cursor:pointer;
  font-weight:700;
  background:transparent;
  transition: transform .12s ease, box-shadow .12s ease;
  display:inline-flex;
  align-items:center;
  justify-content:center;
  box-sizing:border-box;
  border: 2px solid transparent;
}

/* Strongly scoped styles to override globals */
.post-actions .right .btn-edit {
  border-color: var(--blue-700) !important;
  color: var(--blue-700) !important;
  background: transparent !important;
}
.post-actions .right .btn-delete {
  border-color: var(--red-600) !important;
  color: var(--red-600) !important;
  background: transparent !important;
}

/* Make sure border visible and no fill */
.post-actions .right .btn-edit,
.post-actions .right .btn-delete {
  border-style: solid !important;
  border-width: 2px !important;
  box-shadow: none !important;
}

/* Hover/focus */
.post-actions .right .btn-edit:hover,
.post-actions .right .btn-edit:focus {
  transform: translateY(-2px);
  box-shadow: 0 10px 24px rgba(31,63,184,0.08);
  outline: none;
}
.post-actions .right .btn-delete:hover,
.post-actions .right .btn-delete:focus {
  transform: translateY(-2px);
  box-shadow: 0 10px 24px rgba(220,38,38,0.08);
  outline: none;
}

/* Recent posts block */
.recent-block { margin-top:18px; background:#fff; padding:14px; border-radius:8px; box-shadow: 0 6px 20px rgba(2,6,23,0.04); }
.recent-title { margin:0 0 12px; font-size:16px; color:#0f172a; }

/* clickable title style */
.recent-title.link {
  background: none;
  border: none;
  padding: 0;
  font-weight: 700;
  color: var(--blue-700);
  cursor: pointer;
}

/* make recent cards keyboard-focusable */
.recent-grid { display:grid; grid-template-columns: repeat(4,1fr); gap:12px; list-style:none; padding:0; margin:0; }
.recent-card { border:1px solid #eef2f7; padding:12px; border-radius:8px; cursor:pointer; background: #fff; outline: none; }
.recent-card:focus { box-shadow: 0 6px 20px rgba(37,99,235,0.08); border-color: rgba(37,99,235,0.12); }

.recent-row-top { display:flex; justify-content:space-between; gap:10px; align-items:center; margin-bottom:8px; }
.recent-name { font-weight:600; color:#0f172a; font-size:14px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.recent-date { color:#9ca3af; font-size:12px; }
.recent-excerpt { margin:0; color:#374151; font-size:13px; line-height:1.4; height:36px; overflow:hidden; }
.no-recent { color:var(--muted); padding:12px 0; }

/* Modal - ensure topmost and visible */
.modal-backdrop { position: fixed; inset:0; display:flex; align-items:center; justify-content:center; background: rgba(2,6,23,0.5); z-index:9999; }
.modal { width:380px; background:#fff; padding:18px; border-radius:8px; box-shadow: 0 14px 60px rgba(2,6,23,0.28); z-index:10000; }
.modal h3 { margin:0 0 8px; text-align:center; color:#0f172a; font-weight:700; }
.modal input { width:100%; padding:8px 10px; border-radius:6px; border:1px solid #e6edf3; margin-top:8px; box-sizing:border-box; }

/* Modal buttons - visible and high specificity */
.modal-actions { display:flex; justify-content:flex-end; gap:8px; margin-top:12px; }
.modal .modal-btn { padding:10px 14px; border-radius:6px; font-weight:700; cursor:pointer; border:1px solid transparent; }
.modal .modal-confirm {
  background: var(--blue-500) !important;
  color: #fff !important;
  border-color: var(--blue-500) !important;
  box-shadow: 0 8px 28px rgba(37,99,235,0.14);
}
.modal .modal-cancel {
  background: #fff !important;
  color: #111827 !important;
  border-color: #e6edf3 !important;
}

/* error */
.err { color:#ef4444; margin-top:8px; font-size:13px; }

/* Responsive */
@media (max-width:980px) { .recent-grid { grid-template-columns: repeat(2, 1fr); } }
@media (max-width:640px) {
  .recent-grid { grid-template-columns: 1fr; }
  .post-card { padding:14px; }
  .btn { padding:8px 10px; }
}
</style>