<script setup>
import { ref, nextTick } from 'vue'

const open = ref(false)
const input = ref('')
const messages = ref([
  { id: 1, from: 'bot', text: '안녕하세요! 무엇을 도와드릴까요?' }
])

function toggle() {
  open.value = !open.value
  if (open.value) scrollBottom()
}

function send() {
  const text = input.value && input.value.trim()
  if (!text) return
  const id = Date.now()
  messages.value.push({ id, from: 'user', text })
  input.value = ''
  // simple mock reply
  setTimeout(() => {
    messages.value.push({ id: `${id}-r`, from: 'bot', text: `예시 응답: "${text}"` })
    scrollBottom()
  }, 400)
  nextTick(scrollBottom)
}

function scrollBottom() {
  const el = document.querySelector('.chat-messages')
  if (el) el.scrollTop = el.scrollHeight
}
</script>

<template>
  <div>
    <button class="chat-fab" @click="toggle" aria-label="챗봇 열기">💬</button>

    <div v-if="open" class="chat-overlay" @keydown.esc="open = false">
      <div class="chat-panel" role="dialog" aria-modal="true">
        <header class="chat-header">
          <strong>LocalHub 챗봇</strong>
          <button class="close-btn" @click="open = false" aria-label="닫기">✕</button>
        </header>

        <div class="chat-messages">
          <div v-for="m in messages" :key="m.id" :class="['msg', m.from]">
            <div class="bubble">{{ m.text }}</div>
          </div>
        </div>

        <form class="chat-input" @submit.prevent="send">
          <input v-model="input" placeholder="메시지를 입력하세요" autocomplete="off" />
          <button type="submit">전송</button>
        </form>
      </div>
    </div>
  </div>
</template>

<style scoped>
.chat-fab {
  position: fixed;
  right: 20px;
  bottom: 20px;
  width: 56px;
  height: 56px;
  border-radius: 50%;
  background: #2563eb;
  color: white;
  border: none;
  font-size: 22px;
  cursor: pointer;
  box-shadow: 0 6px 18px rgba(37,99,235,0.24);
  z-index: 1200;
}

.chat-overlay {
  position: fixed;
  right: 20px;
  bottom: 92px;
  z-index: 1199;
}

.chat-panel {
  width: 320px;
  max-height: 420px;
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 10px 30px rgba(2,6,23,0.12);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Noto Sans KR", "Helvetica Neue", Arial;
}

.chat-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 12px;
  border-bottom: 1px solid #eef2f7;
  background: linear-gradient(90deg,#f8fafc,#ffffff);
}

.close-btn {
  border: none;
  background: transparent;
  cursor: pointer;
  font-size: 14px;
}

.chat-messages {
  padding: 12px;
  flex: 1;
  overflow-y: auto;
  background: #f7fafc;
}

.msg {
  margin-bottom: 8px;
  display: flex;
}

.msg.user {
  justify-content: flex-end;
}

.bubble {
  max-width: 78%;
  padding: 8px 12px;
  border-radius: 12px;
  background: #fff;
  color: #111827;
  box-shadow: 0 1px 4px rgba(2,6,23,0.04);
  font-size: 14px;
}

.msg.bot .bubble {
  background: #eef2ff;
}

.chat-input {
  display: flex;
  padding: 8px;
  gap: 8px;
  border-top: 1px solid #eef2f7;
  background: #fff;
}

.chat-input input {
  flex: 1;
  padding: 8px 10px;
  border-radius: 8px;
  border: 1px solid #e6edf3;
  outline: none;
}

.chat-input button {
  background: #2563eb;
  color: white;
  border: none;
  padding: 8px 12px;
  border-radius: 8px;
  cursor: pointer;
}
</style>