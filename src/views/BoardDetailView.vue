<script setup>
import { ref, onMounted, computed, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'

const BOARD_KEY = 'localhub_boards'
const route = useRoute()
const router = useRouter()

// 💡 라우터 파라미터의 키를 백엔드 표준인 post_id 구조로 매핑해둡니다.
const postId = computed(() => route.params.id) 
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
  
  // 💡 기존의 x.id 비교를 x.post_id 비교로 전면 전환합니다.
  item.value = arr.find(x => String(x.post_id) === String(postId.value)) || null

  // 💡 최근 게시글 필터링에서도 post_id 규격을 사용하여 현재 글을 제외하고 가져옵니다.
  recentPosts.value = arr
    .slice()
    .reverse()
    .filter(x => String(x.post_id) !== String(postId.value))
    .slice(0, 4)
}

function askEdit() { actionType.value = 'edit'; inputPw.value=''; error.value=''; pwModal.value = true }
function askDelete() { actionType.value = 'delete'; inputPw.value=''; error.value=''; pwModal.value = true }

function confirmPw() {
  if (!item.value) return
  if ((item.value.password || '') === inputPw.value) {
    pwModal.value = false
    if (actionType.value === 'edit') router.push(`/board/edit/${postId.value}`)
    if (actionType.value === 'delete') {
      const raw = localStorage.getItem(BOARD_KEY)
      if (!raw) return
      
      // 💡 삭제 시에도 post_id 기준으로 데이터를 걸러냅니다.
      const arr = JSON.parse(raw).filter(x => String(x.post_id) !== String(postId.value))
      localStorage.setItem(BOARD_KEY, JSON.stringify(arr))
      router.push('/board')
    }
  } else {
    error.value = '비밀번호가 일치하지 않습니다.'
  }
}

// 💡 하단 추천 카드 클릭 시 해당 post_id로 연동 이동
function openDetail(pid) {
  router.push(`/board/${pid}`)
}

function goList() {
  router.push('/board')
}

onMounted(load)
watch(postId, load) // 다른 글로 넘어갈 때를 대비해 postId 감시 유지
</script>

<template>
  <div class="detail-page">
    <div class="breadcrumb">
      <span class="home-icon">🏠</span> 홈 <span class="arrow">&gt;</span> <span>커뮤니티 광장</span> <span class="arrow">&gt;</span> <span class="current">상세보기</span>
    </div>

    <article class="post-card" v-if="item">
      <header class="post-header">
        <div class="post-header-top">
          <span class="post-category-badge">{{ item.category || '자유주제' }}</span>
        </div>
        <h1 class="post-title">{{ item.title }}</h1>
        <div class="post-meta">
          <span class="meta-item writer">✍️ 익명 로컬러</span>
          <span class="meta-divider">|</span>
          <span class="meta-item date">📅 작성일: {{ item.created_at }}</span>
        </div>
      </header>

      <section class="post-body">
        <p v-if="item.content" class="post-text">{{ item.content }}</p>
        <div v-else class="empty-content">
          <span class="empty-emoji">💨</span>
          <p class="post-text empty">본문 내용이 작성되지 않았습니다.</p>
        </div>
      </section>

      <footer class="post-actions">
        <button class="btn btn-back" @click="goList">← 목록으로</button>
        <div class="right">
          <button class="btn btn-edit" @click="askEdit">수정</button>
          <button class="btn btn-delete" @click="askDelete">삭제</button>
        </div>
      </footer>
    </article>

    <section class="recent-block" v-if="recentPosts.length">
      <div class="recent-header">
        <h3 class="recent-title">새로운 이야기도 함께 읽어보세요</h3>
        <button class="recent-link" @click="goList" aria-label="게시글 목록으로 이동">전체보기 →</button>
      </div>
      
      <ul class="recent-grid">
        <li
          v-for="p in recentPosts"
          :key="p.post_id"
          class="recent-card"
          @click="openDetail(p.post_id)"
          @keydown.enter.prevent="openDetail(p.post_id)"
          tabindex="0"
          role="button"
          :aria-label="`게시글 ${p.title} 열기`"
        >
          <div class="recent-row-top">
            <span class="recent-badge">{{ p.category || '로컬소식' }}</span>
            <span class="recent-date">{{ p.created_at }}</span>
          </div>
          <span class="recent-name">{{ p.title }}</span>
          <p class="recent-excerpt">{{ (p.content || '').slice(0, 50) }}{{ (p.content||'').length > 50 ? '…' : '' }}</p>
        </li>
      </ul>
    </section>

    <div v-else class="recent-block empty-recent">
      <h3 class="recent-title">게시글 목록</h3>
      <p class="no-recent">함께 볼 다른 최근 게시글이 없습니다.</p>
    </div>

    <Transition name="fade">
      <div v-if="pwModal" class="modal-backdrop" @click.self="pwModal=false">
        <div class="modal" role="dialog" aria-modal="true">
          <div class="modal-icon">🔐</div>
          <h3>비밀번호 확인</h3>
          <p>이 작업을 진행하려면 작성 시 설정한 <br>비밀번호를 입력해 주세요.</p>
          <input 
            v-model="inputPw" 
            type="password" 
            placeholder="비밀번호 입력" 
            @keyup.enter="confirmPw"
          />
          <div class="err" v-if="error">{{ error }}</div>
          <div class="modal-actions">
            <button class="modal-btn modal-cancel" @click="pwModal=false">취소</button>
            <button class="modal-btn modal-confirm" @click="confirmPw">확인</button>
          </div>
        </div>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.detail-page {
  --primary-color: #2563eb;
  --primary-hover: #1d4ed8;
  --danger-color: #ef4444;
  --danger-hover: #dc2626;
  --bg-card: #ffffff;
  --border-light: #e2e8f0;
  --text-main: #0f172a;
  --text-sub: #64748b;
  
  max-width: 900px;
  width: 100%;
  margin: 0 auto;
  padding: 24px 16px;
  box-sizing: border-box;
  overflow-x: hidden;
}

/* Breadcrumb */
.breadcrumb {
  color: #94a3b8;
  font-size: 13px;
  margin-bottom: 20px;
  display: flex;
  align-items: center;
  gap: 6px;
}
.home-icon { font-size: 14px; }
.breadcrumb .arrow { color: #cbd5e1; font-weight: bold; }
.breadcrumb .current { color: #475569; font-weight: 600; }

/* Main Post Card */
.post-card {
  background: var(--bg-card);
  padding: 32px;
  border-radius: 16px;
  box-shadow: 0 10px 30px -10px rgba(2, 6, 23, 0.05), 0 0 0 1px var(--border-light);
  display: flex;
  flex-direction: column;
  gap: 24px;
  width: 100%;
  box-sizing: border-box;
}

/* Post Header */
.post-header {
  display: flex;
  flex-direction: column;
  gap: 12px;
  border-bottom: 1px solid #f1f5f9;
  padding-bottom: 20px;
}
.post-category-badge {
  display: inline-block;
  background: #eff6ff;
  color: var(--primary-color);
  font-size: 12px;
  font-weight: 700;
  padding: 4px 10px;
  border-radius: 6px;
}
.post-title {
  margin: 0;
  font-size: 26px;
  font-weight: 800;
  line-height: 1.35;
  color: var(--text-main);
  word-break: break-word;
  letter-spacing: -0.5px;
}
.post-meta {
  display: flex;
  align-items: center;
  gap: 10px;
  color: var(--text-sub);
  font-size: 13px;
}
.meta-divider {
  color: #cbd5e1;
}

/* Post Body */
.post-body {
  width: 100%;
  box-sizing: border-box;
  min-height: 200px;
}
.post-text {
  color: #334155;
  font-size: 16px;
  line-height: 1.8;
  white-space: pre-wrap;
  word-break: break-word;
  margin: 0;
}
.empty-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px 0;
  color: var(--text-sub);
}
.empty-emoji {
  font-size: 32px;
  margin-bottom: 8px;
}

/* Post Actions */
.post-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  padding-top: 18px;
  border-top: 1px solid #f1f5f9;
}
.post-actions .right {
  display: flex;
  gap: 10px;
}

/* Buttons */
.btn {
  padding: 10px 18px;
  border-radius: 10px;
  cursor: pointer;
  font-weight: 700;
  font-size: 14px;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 1px solid transparent;
}
.btn-back {
  background: #f1f5f9;
  color: #475569;
}
.btn-back:hover {
  background: #e2e8f0;
}
.btn-edit {
  background: var(--primary-color);
  color: #fff;
}
.btn-edit:hover {
  background: var(--primary-hover);
  transform: translateY(-1px);
}
.btn-delete {
  background: #fff;
  border-color: #fee2e2;
  color: var(--danger-color);
}
.btn-delete:hover {
  background: #fef2f2;
  border-color: #fca5a5;
  transform: translateY(-1px);
}

/* Recent Posts Block */
.recent-block {
  margin-top: 32px;
  background: var(--bg-card);
  padding: 24px;
  border-radius: 16px;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.02), 0 0 0 1px var(--border-light);
}
.recent-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}
.recent-title {
  margin: 0;
  font-size: 16px;
  font-weight: 800;
  color: var(--text-main);
}
.recent-link {
  background: none;
  border: none;
  padding: 0;
  color: var(--primary-color);
  font-weight: 700;
  font-size: 13px;
  cursor: pointer;
}

/* Recent Grid */
.recent-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
  list-style: none;
  padding: 0;
  margin: 0;
}
.recent-card {
  border: 1px solid #f1f5f9;
  padding: 16px;
  border-radius: 12px;
  cursor: pointer;
  background: #fff;
  transition: all 0.2s ease;
  display: flex;
  flex-direction: column;
}
.recent-card:hover, .recent-card:focus {
  border-color: #bfdbfe;
  box-shadow: 0 8px 24px -8px rgba(37,99,235,0.12);
  transform: translateY(-3px);
  outline: none;
}
.recent-row-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
}
.recent-badge {
  font-size: 10px;
  font-weight: 700;
  background: #f8fafc;
  color: #64748b;
  padding: 2px 6px;
  border-radius: 4px;
}
.recent-date {
  color: #94a3b8;
  font-size: 11px;
}
.recent-name {
  font-weight: 700;
  color: var(--text-main);
  font-size: 14px;
  line-height: 1.3;
  margin-bottom: 6px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.recent-card:hover .recent-name {
  color: var(--primary-color);
}
.recent-excerpt {
  margin: 0;
  color: var(--text-sub);
  font-size: 12px;
  line-height: 1.5;
  height: 36px;
  overflow: hidden;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}

/* Password Modal */
.modal-backdrop {
  position: fixed;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(15, 23, 42, 0.4);
  backdrop-filter: blur(4px);
  z-index: 9999;
}
.modal {
  width: 360px;
  max-width: calc(100% - 32px);
  background: #fff;
  padding: 28px 24px;
  border-radius: 16px;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
  text-align: center;
  border: 1px solid var(--border-light);
}
.modal-icon {
  font-size: 32px;
  margin-bottom: 12px;
}
.modal h3 {
  margin: 0 0 8px 0;
  font-size: 18px;
  font-weight: 800;
  color: var(--text-main);
}
.modal p {
  font-size: 13px;
  color: var(--text-sub);
  line-height: 1.5;
  margin: 0 0 16px 0;
}
.modal input {
  width: 100%;
  padding: 12px;
  border-radius: 8px;
  border: 1px solid #cbd5e1;
  font-size: 14px;
  box-sizing: border-box;
  outline: none;
  text-align: center;
  transition: border-color 0.15s ease;
}
.modal input:focus {
  border-color: var(--primary-color);
}
.modal-actions {
  display: flex;
  gap: 10px;
  margin-top: 20px;
}
.modal-btn {
  flex: 1;
  padding: 10px 0;
  border-radius: 8px;
  font-weight: 700;
  font-size: 14px;
  cursor: pointer;
  border: 1px solid transparent;
}
.modal-confirm {
  background: var(--primary-color);
  color: #fff;
}
.modal-confirm:hover {
  background: var(--primary-hover);
}
.modal-cancel {
  background: #fff;
  border-color: #cbd5e1;
  color: #475569;
}
.modal-cancel:hover {
  background: #f8fafc;
}

/* Error */
.err {
  color: var(--danger-color);
  margin-top: 8px;
  font-size: 12px;
  font-weight: 600;
}

/* Vue Transition */
.fade-enter-active, .fade-leave-active {
  transition: opacity 0.25s ease;
}
.fade-enter-from, .fade-leave-to {
  opacity: 0;
}

/* Responsive */
@media (max-width: 880px) {
  .recent-grid { grid-template-columns: repeat(2, 1fr); }
}
@media (max-width: 640px) {
  .recent-grid { grid-template-columns: 1fr; }
  .post-card { padding: 20px; }
  .post-title { font-size: 20px; }
  .post-actions { flex-direction: column-reverse; align-items: stretch; gap: 10px; }
  .post-actions .right { flex-direction: column; }
  .btn { width: 100%; }
}
</style>