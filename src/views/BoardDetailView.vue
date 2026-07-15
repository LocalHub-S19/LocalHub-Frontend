<script setup>
import { ref, onMounted, computed, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
// 💡 앞서 만들었던 번역 사전(catToFront)도 꼭 같이 임포트해야 합니다!
import { API, catToFront } from '@/api.js' 

const route = useRoute()
const router = useRouter()

const postId = computed(() => route.params.id) 
const item = ref(null)

const pwModal = ref(false)
const actionType = ref('') 
const inputPw = ref('')
const error = ref('')

const recentPosts = ref([])

// 💡 1. 날짜를 예쁘게 만들어주는 함수 (T나 Z가 붙은 못생긴 DB 날짜를 07.15 10:18 로 변환)
function formatDetailDate(dateString) {
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
    if (!postId.value || postId.value === 'undefined') {
      router.push('/board')
      return
    }

    // 현재 글 상세 조회
    const response = await fetch(API.POST_DETAIL(postId.value))
    if (!response.ok) {
      alert('존재하지 않는 게시글입니다.')
      router.push('/board')
      return
    }
    const data = await response.json()
    
    // 화면 변수에 넣기 전에 카테고리 번역 + 날짜 포맷팅 적용
    item.value = {
      ...data,
      category: catToFront[data.category] || data.category || '자유',
      created_at: formatDetailDate(data.created_at) // 💡 날짜 예쁘게!
    }

    // 💡 2. 하단 추천용 전체 글 목록 조회 및 필터링
    const allRes = await fetch(API.POSTS)
    const allData = await allRes.json()
    const list = Array.isArray(allData) ? allData : (allData.items || [])
    
    // 같은 카테고리의 다른 게시글 5개 필터링 로직
    recentPosts.value = list
      .map(p => ({
        ...p,
        category: catToFront[p.category] || p.category || '자유',
        created_at: formatDetailDate(p.created_at) // 추천 목록 날짜도 예쁘게!
      }))
      .filter(p => String(p.id) !== String(postId.value)) // 현재 보고 있는 글 제외
      .filter(p => p.category === item.value.category)    // 🔥 현재 글과 '같은 카테고리'만 남기기
      .slice(0, 5)                                        // 🔥 딱 5개까지만 자르기

  } catch (error) {
    console.error('상세 정보 불러오기 실패:', error)
  }
}

function askEdit() { actionType.value = 'edit'; inputPw.value=''; error.value=''; pwModal.value = true }
function askDelete() { actionType.value = 'delete'; inputPw.value=''; error.value=''; pwModal.value = true }

async function confirmPw() {
  if (!item.value) return

  if (actionType.value === 'edit') {
    pwModal.value = false
    router.push(`/board/edit/${postId.value}`)
    return
  }

  if (actionType.value === 'delete') {
    try {
      const response = await fetch(API.POST_DETAIL(postId.value), {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: inputPw.value })
      })

      if (response.ok) { 
        pwModal.value = false
        router.push('/board')
      } else {
        error.value = '비밀번호가 일치하지 않습니다.'
      }
    } catch (err) {
      error.value = '삭제 중 오류가 발생했습니다.'
    }
  }
}

function openDetail(pid) {
  router.push(`/board/${pid}`)
}

function goList() {
  router.push('/board')
}

onMounted(load)
watch(postId, load) 
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
          
          <span class="meta-divider">|</span>
          <span class="meta-item views">👀 조회수: {{ item.views ?? item.view_count ?? item.hits ?? item.read_count ?? 0 }}</span>
        </div>
      </header>

      <section class="post-body">
        <p v-if="item.content" class="post-text">{{ item.content }}</p>
        <div v-else class="empty-content">
          <span class="empty-emoji">💨</span>
          <p class="post-text empty">본문 내용이 작성되지 않았습니다.</p>
        </div>
      </section>

      <div class="hashtag-container" v-if="item.tags && item.tags.length > 0">
        <span v-for="tag in item.tags" :key="tag" class="hashtag-item">
          #{{ tag }}
        </span>
      </div>

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
      
      <ul class="recent-list">
        <li
          v-for="p in recentPosts"
          :key="p.id"
          class="recent-list-item"
          @click="openDetail(p.id)"
          @keydown.enter.prevent="openDetail(p.id)"
          tabindex="0"
          role="button"
        >
          <div class="item-left">
            <span class="recent-badge">{{ p.category || '로컬소식' }}</span>
            <span class="recent-name">{{ p.title }}</span>
          </div>
          <span class="recent-date">{{ p.created_at }}</span>
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
/* 💡 최상위 컨테이너를 1200px로 변경했습니다. */
.detail-page {
  --primary-color: #2563eb;
  --primary-hover: #1d4ed8;
  --danger-color: #ef4444;
  --danger-hover: #dc2626;
  --bg-card: #ffffff;
  --border-light: #e2e8f0;
  --text-main: #0f172a;
  --text-sub: #64748b;
  
  max-width: 1200px; /* 💡 900px -> 1200px 로 통일 */
  width: 100%;
  margin: 0 auto;
  padding: 24px 16px;
  box-sizing: border-box;
  overflow-x: hidden;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
}

.breadcrumb { color: #94a3b8; font-size: 13px; margin-bottom: 20px; display: flex; align-items: center; gap: 6px; }
.home-icon { font-size: 14px; }
.breadcrumb .arrow { color: #cbd5e1; font-weight: bold; }
.breadcrumb .current { color: #475569; font-weight: 600; }

/* 💡 본문 카드 영역도 100% 꽉 차게 고정 */
.post-card {
  background: var(--bg-card);
  padding: 32px;
  border-radius: 16px;
  box-shadow: 0 10px 30px -10px rgba(2, 6, 23, 0.05), 0 0 0 1px var(--border-light);
  display: flex;
  flex-direction: column;
  gap: 24px;
  width: 100%;           /* 💡 추가 */
  box-sizing: border-box;  /* 💡 추가 */
}

.post-header { display: flex; flex-direction: column; gap: 12px; border-bottom: 1px solid #f1f5f9; padding-bottom: 20px; }
.post-category-badge { display: inline-block; background: #eff6ff; color: var(--primary-color); font-size: 12px; font-weight: 700; padding: 4px 10px; border-radius: 6px; }
.post-title { margin: 0; font-size: 26px; font-weight: 800; line-height: 1.35; color: var(--text-main); word-break: break-word; letter-spacing: -0.5px; }
.post-meta { display: flex; align-items: center; gap: 10px; color: var(--text-sub); font-size: 13px; }
.meta-divider { color: #cbd5e1; }

.post-body { min-height: 200px; }
.post-text { color: #334155; font-size: 16px; line-height: 1.8; white-space: pre-wrap; word-break: break-word; margin: 0; }
.empty-content { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 40px 0; color: var(--text-sub); }
.empty-emoji { font-size: 32px; margin-bottom: 8px; }

/* 해시태그 디자인 */
.hashtag-container {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 10px;
  padding-bottom: 10px;
}
.hashtag-item {
  color: var(--primary-color);
  font-weight: 600;
  font-size: 14px;
  cursor: pointer;
}
.hashtag-item:hover { text-decoration: underline; }

.post-actions { display: flex; justify-content: space-between; align-items: center; gap: 12px; padding-top: 18px; border-top: 1px solid #f1f5f9; }
.post-actions .right { display: flex; gap: 10px; }

.btn { padding: 10px 18px; border-radius: 10px; cursor: pointer; font-weight: 700; font-size: 14px; transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1); border: 1px solid transparent; }
.btn-back { background: #f1f5f9; color: #475569; }
.btn-back:hover { background: #e2e8f0; }
.btn-edit { background: var(--primary-color); color: #fff; }
.btn-edit:hover { background: var(--primary-hover); transform: translateY(-1px); }
.btn-delete { background: #fff; border-color: #fee2e2; color: var(--danger-color); }
.btn-delete:hover { background: #fef2f2; border-color: #fca5a5; transform: translateY(-1px); }

/* 💡 하단 추천 게시글 블록도 넓어진 1200px에 꽉 차게 고정 */
.recent-block { 
  margin-top: 32px; 
  background: var(--bg-card); 
  padding: 24px; 
  border-radius: 16px; 
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.02), 0 0 0 1px var(--border-light); 
  width: 100%;           /* 💡 추가 */
  box-sizing: border-box;  /* 💡 추가 */
}
.recent-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
.recent-title { margin: 0; font-size: 16px; font-weight: 800; color: var(--text-main); }
.recent-link { background: none; border: none; padding: 0; color: var(--primary-color); font-weight: 700; font-size: 13px; cursor: pointer; }

/* 세로형 리스트 */
.recent-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  list-style: none;
  padding: 0;
  margin: 0;
}
.recent-list-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 14px 18px;
  border-radius: 10px;
  border: 1px solid #f1f5f9;
  background: #fff;
  cursor: pointer;
  transition: all 0.2s ease;
}
.recent-list-item:hover, .recent-list-item:focus {
  border-color: #bfdbfe;
  background-color: #f8fafc;
  transform: translateX(4px);
  outline: none;
}
.item-left {
  display: flex;
  align-items: center;
  gap: 12px;
  flex: 1;
  min-width: 0;
}
.recent-badge {
  font-size: 11px;
  font-weight: 700;
  background: #eff6ff;
  color: var(--primary-color);
  padding: 3px 8px;
  border-radius: 6px;
  white-space: nowrap;
}
.recent-name {
  font-weight: 600;
  color: var(--text-main);
  font-size: 14px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.recent-list-item:hover .recent-name {
  color: var(--primary-color);
}
.recent-date {
  color: var(--text-sub);
  font-size: 12px;
  white-space: nowrap;
  margin-left: 12px;
}

/* 모달 디자인 */
.modal-backdrop { position: fixed; inset: 0; display: flex; align-items: center; justify-content: center; background: rgba(15, 23, 42, 0.4); backdrop-filter: blur(4px); z-index: 9999; }
.modal { width: 360px; max-width: calc(100% - 32px); background: #fff; padding: 28px 24px; border-radius: 16px; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1); text-align: center; border: 1px solid var(--border-light); }
.modal-icon { font-size: 32px; margin-bottom: 12px; }
.modal h3 { margin: 0 0 8px 0; font-size: 18px; font-weight: 800; color: var(--text-main); }
.modal p { font-size: 13px; color: var(--text-sub); line-height: 1.5; margin: 0 0 16px 0; }
.modal input { width: 100%; padding: 12px; border-radius: 8px; border: 1px solid #cbd5e1; font-size: 14px; box-sizing: border-box; outline: none; text-align: center; transition: border-color 0.15s ease; }
.modal input:focus { border-color: var(--primary-color); }
.modal-actions { display: flex; gap: 10px; margin-top: 20px; }
.modal-btn { flex: 1; padding: 10px 0; border-radius: 8px; font-weight: 700; font-size: 14px; cursor: pointer; border: 1px solid transparent; }
.modal-confirm { background: var(--primary-color); color: #fff; }
.modal-confirm:hover { background: var(--primary-hover); }
.modal-cancel { background: #fff; border-color: #cbd5e1; color: #475569; }
.modal-cancel:hover { background: #f8fafc; }
.err { color: var(--danger-color); margin-top: 8px; font-size: 12px; font-weight: 600; }
.fade-enter-active, .fade-leave-active { transition: opacity 0.25s ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; }

/* 모바일 기기 반응형 처리 */
@media (max-width: 640px) {
  .recent-list-item {
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
  }
  .recent-date {
    margin-left: 0;
    align-self: flex-end;
  }
  .post-card { padding: 20px; }
  .post-title { font-size: 20px; }
  .post-actions { flex-direction: column-reverse; align-items: stretch; gap: 10px; }
  .post-actions .right { flex-direction: column; }
  .btn { width: 100%; }
}
</style>