<script setup>
import { ref, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'

const BOARD_KEY = 'localhub_boards'
const router = useRouter()
const route = useRoute()
const editingId = route.params.id || null

const title = ref('')
const content = ref('')
const pw = ref('')       // for new posts: set password; for editing: enter existing password to confirm
const error = ref('')

function loadForEdit() {
  if (!editingId) return
  const raw = localStorage.getItem(BOARD_KEY)
  if (!raw) return
  const arr = JSON.parse(raw)
  const item = arr.find(x => String(x.id) === String(editingId))
  if (item) {
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
    const idx = arr.findIndex(x => String(x.id) === String(editingId))
    if (idx < 0) { error.value = '게시글을 찾을 수 없습니다.'; return }
    if ((arr[idx].password || '') !== pw.value) { error.value = '비밀번호가 일치하지 않습니다.'; return }
    arr[idx].title = title.value
    arr[idx].content = content.value
    localStorage.setItem(BOARD_KEY, JSON.stringify(arr))
    router.push(`/board/${editingId}`)
  } else {
    if (!pw.value || pw.value.trim() === '') { error.value = '수정용 비밀번호를 입력하세요.'; return }
    const newId = String(Date.now())
    arr.push({
      id: newId,
      title: title.value,
      content: content.value,
      createdAt,
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
    <div class="breadcrumb">홈 &gt; 게시판 &gt; {{ editingId ? '게시글 수정' : '게시글 작성' }}</div>

    <h1 class="page-title">{{ editingId ? '게시글 수정' : '게시글 작성' }}</h1>

    <div class="form-card">
      <label class="label">제목</label>
      <input v-model="title" class="input title-input" placeholder="제목을 입력하세요" />

      <label class="label">내용</label>
      <textarea v-model="content" class="input content-input" rows="12" placeholder="내용을 입력하세요"></textarea>

      <label class="label">수정용 비밀번호</label>
      <input v-model="pw" type="password" class="input pw-input" placeholder="※ 게시글 수정·삭제 시 확인용으로 사용됩니다 (평문 저장)" />

      <div class="hint">※ 게시글 수정·삭제 시 확인용으로 사용됩니다 (평문 저장)</div>
      <div class="err" v-if="error">{{ error }}</div>

      <div class="form-actions">
        <button class="btn cancel" @click="cancel">취소</button>
        <button class="btn submit" @click="save">{{ editingId ? '수정' : '등록' }}</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.write-page {
  width: 100%;
  max-width: none;
  margin: 0;         /* 가운데 고정 제거 */
  padding: 22px;
  box-sizing: border-box;
}

.breadcrumb {
  color: #6b7280;
  font-size: 13px;
  margin-bottom: 8px;
}

.page-title {
  margin: 6px 0 18px;
  font-size: 24px;
  color: #0f172a;
}

/* Card */
.form-card {
  background: #fff;
  padding: 22px;
  border-radius: 10px;
  box-shadow: 0 8px 30px rgba(2,6,23,0.04);
  display:flex;
  flex-direction:column;
  gap:12px;
}

/* Labels & inputs */
.label {
  font-weight: 600;
  color: #111827;
  margin-top: 8px;
  margin-bottom: 6px;
}

.input {
  width: 100%;
  padding: 12px 14px;
  border-radius: 6px;
  border: 1px solid #e6edf3;
  font-size: 14px;
  box-sizing: border-box;
  outline: none;
}

.title-input {
  height: 44px;
}

.content-input {
  min-height: 260px;
  resize: vertical;
}

/* password hint */
.hint {
  color: #9ca3af;
  font-size: 13px;
  margin-top: 6px;
}

/* error */
.err { color: #ef4444; margin-top: 6px; font-size: 13px; }

/* Actions */
.form-actions {
  display:flex;
  justify-content:flex-end;
  gap:12px;
  margin-top: 8px;
}

/* Buttons: cancel outline, submit filled blue */
.btn {
  padding: 10px 16px;
  border-radius: 8px;
  font-weight: 700;
  cursor: pointer;
  min-width: 96px;
  border: 2px solid transparent;
}

/* cancel: white with light border */
.btn.cancel {
  background: #fff;
  color: #111827;
  border-color: #e6edf3;
}

/* submit: filled blue */
.btn.submit {
  background: #2563eb;
  color: white;
  border-color: #2563eb;
  box-shadow: 0 10px 30px rgba(37,99,235,0.12);
}

/* responsive */
@media (max-width: 640px) {
  .form-actions { flex-direction:column-reverse; align-items:stretch; }
  .btn { width:100%; min-width: auto; }
  .content-input { min-height: 200px; }
}
</style>