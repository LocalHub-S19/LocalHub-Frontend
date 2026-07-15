<script setup>
import { ref, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'

const BOARD_KEY = 'localhub_boards'
const router = useRouter()
const route = useRoute()
const editingId = route.params.id || null

const category = ref('자유') // 💡 기본값을 '자유'로 세팅
const title = ref('')
const content = ref('')
const pw = ref('')       
const error = ref('')

// 💡 아이콘을 제외하고 완전히 2글자로 맞춘 탭 배열
const categoryOptions = [
  { value: '자유', label: '자유' },
  { value: '관광', label: '관광' },
  { value: '행사', label: '행사' },
  { value: '문화', label: '문화' },
  { value: '쇼핑', label: '쇼핑' }
]

function loadForEdit() {
  if (!editingId) return
  const raw = localStorage.getItem(BOARD_KEY)
  if (!raw) return
  const arr = JSON.parse(raw)
  
  const item = arr.find(x => String(x.post_id) === String(editingId))
  if (item) {
    category.value = item.category || '자유'
    title.value = item.title
    content.value = item.content
  }
}

function save() {
  error.value = ''
  const now = new Date()
  const createdAt = `${String(now.getMonth()+1).padStart(2,'0')}.${String(now.getDate()).padStart(2,'0')}`
  const raw = localStorage.getItem(BOARD_KEY)
  const arr = raw ? JSON.parse(raw) : []

  if (editingId) {
    const idx = arr.findIndex(x => String(x.post_id) === String(editingId))
    if (idx < 0) { error.value = '게시글을 찾을 수 없습니다.'; return }
    if ((arr[idx].password || '') !== pw.value) { error.value = '비밀번호가 일치하지 않습니다.'; return }
    
    arr[idx].category = category.value
    arr[idx].title = title.value
    arr[idx].content = content.value
    
    localStorage.setItem(BOARD_KEY, JSON.stringify(arr))
    router.push(`/board/${editingId}`)
  } else {
    if (!pw.value || pw.value.trim() === '') { error.value = '수정용 비밀번호를 입력하세요.'; return }
    
    const newId = String(Date.now())
    arr.push({
      post_id: newId,
      category: category.value,
      title: title.value,
      content: content.value,
      created_at: createdAt,
      password: pw.value
    })
    localStorage.setItem(BOARD_KEY, JSON.stringify(arr))
    router.push(`/board/${newId}`)
  }
}

function cancel() {
  if (editingId) router.push(`/board/${editingId}`)
  else router.push('/board')
}

onMounted(loadForEdit)
</script>

<template>
  <div class="write-page">
    <!-- Breadcrumb -->
    <div class="breadcrumb">
      <span class="home-icon">🏠</span> 홈 <span class="arrow">&gt;</span> <span>커뮤니티 광장</span> <span class="arrow">&gt;</span> <span class="current">{{ editingId ? '게시글 수정' : '게시글 작성' }}</span>
    </div>

    <div class="page-header">
      <h1 class="page-title">{{ editingId ? '글 정보 수정하기' : '소중한 글 등록하기' }}</h1>
      <p class="page-desc">건전하고 따뜻한 정보 공유를 지향하며, 안전하게 내 글을 게시해보세요.</p>
    </div>

    <div class="form-card">
      <!-- 💡 드롭다운 대신 들어간 아이콘 없는 2글자 균등 배열 탭 영역 -->
      <div class="form-group">
        <label class="label">카테고리 선택</label>
        <div class="category-pill-group">
          <button 
            v-for="opt in categoryOptions" 
            :key="opt.value"
            type="button"
            :class="['pill-btn', { active: category === opt.value }]"
            @click="category = opt.value"
          >
            {{ opt.label }}
          </button>
        </div>
      </div>

      <div class="form-group">
        <label class="label">글 제목</label>
        <input v-model="title" class="input title-input" placeholder="이웃들이 한눈에 알아보기 쉽게 제목을 적어주세요" />
      </div>

      <div class="form-group">
        <label class="label">상세 본문 내용</label>
        <textarea v-model="content" class="input content-input" rows="12" placeholder="전달하고자 하는 정보를 상세하게 기입해 주세요."></textarea>
      </div>

      <div class="form-group pw-group">
        <div class="label-with-desc">
          <label class="label">수정용 비밀번호 설정</label>
          <span class="label-desc">추후 내 글을 수정하거나 삭제할 때 꼭 필요한 본인 확인용 장치입니다.</span>
        </div>
        <div class="pw-input-wrapper">
          <span class="lock-icon">🔒</span>
          <input v-model="pw" type="password" class="input pw-input" placeholder="네 자리 이상 비밀번호를 입력하세요" />
        </div>
      </div>

      <!-- 에러 메세지 -->
      <div class="err-box" v-if="error">
        <span class="err-icon">🚨</span>
        <span class="err-text">{{ error }}</span>
      </div>

      <div class="form-actions">
        <button class="btn cancel" @click="cancel">취소하기</button>
        <button class="btn submit" @click="save">{{ editingId ? '수정완료' : '게시하기' }}</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.write-page {
  --primary-color: #2563eb;
  --primary-hover: #1d4ed8;
  --bg-card: #ffffff;
  --border-light: #cbd5e1;
  --text-main: #0f172a;
  --text-sub: #64748b;

  width: 100%;
  max-width: 800px;
  margin: 0 auto;
  padding: 24px 16px;
  box-sizing: border-box;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
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

/* Page Header */
.page-header {
  margin-bottom: 24px;
}
.page-title {
  margin: 0 0 6px 0;
  font-size: 24px;
  font-weight: 800;
  color: var(--text-main);
  letter-spacing: -0.5px;
}
.page-desc {
  margin: 0;
  color: var(--text-sub);
  font-size: 14px;
}

/* Form Card */
.form-card {
  background: var(--bg-card);
  padding: 32px;
  border-radius: 16px;
  box-shadow: 0 10px 30px -10px rgba(2, 6, 23, 0.05), 0 0 0 1px #e2e8f0;
  display: flex;
  flex-direction: column;
  gap: 24px;
}

/* Form Group */
.form-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

/* Labels & inputs */
.label {
  font-weight: 700;
  color: var(--text-main);
  font-size: 14px;
}
.label-with-desc {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.label-desc {
  font-size: 12px;
  color: var(--text-sub);
}

/* 💡 작성하기 화면 전용 수평형 카테고리 탭 (완벽 균등 분배 구조) */
.category-pill-group {
  display: flex;
  gap: 8px;
  width: 100%;
}
.pill-btn {
  flex: 1; /* 💡 1/N 균등 너비 조절 */
  text-align: center;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  color: #475569;
  padding: 12px 0;
  border-radius: 10px;
  font-weight: 700;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.15s ease;
}
.pill-btn:hover {
  background: #f1f5f9;
  border-color: #cbd5e1;
}
.pill-btn.active {
  background: #eff6ff;
  color: var(--primary-color);
  border-color: #bfdbfe;
  box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.08);
}

.input {
  width: 100%;
  padding: 12px 16px;
  border-radius: 10px;
  border: 1px solid var(--border-light);
  font-size: 14px;
  box-sizing: border-box;
  outline: none;
  background: #fff;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}
.input:focus {
  border-color: var(--primary-color);
  box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
}

.title-input {
  font-weight: 600;
  color: var(--text-main);
}

.content-input {
  min-height: 280px;
  resize: vertical;
  line-height: 1.6;
}

/* Password Group Wrapper */
.pw-group {
  border-top: 1px solid #f1f5f9;
  padding-top: 18px;
}
.pw-input-wrapper {
  position: relative;
  display: flex;
  align-items: center;
}
.lock-icon {
  position: absolute;
  left: 14px;
  font-size: 13px;
  color: #94a3b8;
}
.pw-input {
  padding-left: 38px !important;
}

/* Error Box */
.err-box {
  display: flex;
  align-items: center;
  gap: 8px;
  background: #fef2f2;
  border: 1px solid #fee2e2;
  padding: 12px 16px;
  border-radius: 10px;
}
.err-icon { font-size: 16px; }
.err-text {
  color: #ef4444;
  font-size: 13px;
  font-weight: 600;
}

/* Actions */
.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 12px;
  border-top: 1px solid #f1f5f9;
  padding-top: 20px;
}

/* Buttons */
.btn {
  padding: 12px 24px;
  border-radius: 10px;
  font-weight: 700;
  font-size: 14px;
  cursor: pointer;
  min-width: 110px;
  border: 1px solid transparent;
  transition: all 0.15s ease;
}

.btn.cancel {
  background: #f1f5f9;
  color: #475569;
}
.btn.cancel:hover {
  background: #e2e8f0;
}

.btn.submit {
  background: var(--primary-color);
  color: white;
  box-shadow: 0 4px 12px rgba(37, 99, 235, 0.15);
}
.btn.submit:hover {
  background: var(--primary-hover);
  transform: translateY(-1px);
  box-shadow: 0 6px 16px rgba(37, 99, 235, 0.25);
}

/* Responsive */
@media (max-width: 640px) {
  .form-card { padding: 20px 16px; }
  .category-pill-group { 
    display: grid;
    grid-template-columns: repeat(3, 1fr); /* 모바일에서는 3열/2열 격자 배치로 공간 압축 */
    gap: 6px; 
  }
  .pill-btn {
    padding: 10px 0;
    font-size: 12px;
  }
  .form-actions { flex-direction: column-reverse; align-items: stretch; gap: 10px; }
  .btn { width: 100%; }
}
</style>