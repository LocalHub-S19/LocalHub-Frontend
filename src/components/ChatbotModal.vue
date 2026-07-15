<script setup>
import { ref, nextTick } from 'vue'
import { API } from '@/api.js' // 💡 백엔드 API 주소를 가져옵니다!

const open = ref(false)
const input = ref('')
const messages = ref([
  { id: 1, from: 'bot', text: '안녕하세요! 무엇을 도와드릴까요?' }
])

function toggle() {
  open.value = !open.value
  if (open.value) scrollBottom()
}

// 💡 백엔드 AI 챗봇 실제 연동 비동기 처리
async function send() {
  const text = input.value && input.value.trim()
  if (!text) return

  // 💡 1. 백엔드 명세서에 맞춰 기존 대화 내역(history)을 조립합니다.
  // 백엔드는 봇의 역할을 보통 'assistant' 또는 'bot'으로 인식합니다.
  const historyData = messages.value.map(m => ({
    role: m.from === 'user' ? 'user' : 'assistant', 
    content: m.text
  }))

  const id = Date.now()
  messages.value.push({ id, from: 'user', text }) // 화면에 내 메시지 띄우기
  input.value = ''
  
  nextTick(scrollBottom)

  try {
    // 💡 2. 명세서대로 message와 history를 같이 묶어서 보냅니다.
    const payload = {
      message: text,
      history: historyData
    }

    const response = await fetch(API.CHAT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload) 
    })

    if (!response.ok) throw new Error('서버 응답 오류')

    const data = await response.json()
    
    // 💡 3. 키보드 F12(개발자 도구) 콘솔창에 백엔드 응답을 찍어봅니다! (가장 중요)
    console.log("🤖 백엔드가 보낸 원본 데이터:", data)

    // 백엔드가 어떤 이름표로 답을 줄지 몰라서 가장 많이 쓰는 이름표들을 다 넣어두었습니다.
    const botReply = data.answer || data.message || data.reply || data.response || data.content || '답변을 불러오지 못했습니다.'

    messages.value.push({
      id: `${id}-r`,
      from: 'bot',
      text: botReply
    })
    
  } catch (error) {
    console.error('챗봇 통신 실패:', error)
    messages.value.push({
      id: `${id}-e`,
      from: 'bot',
      text: '죄송합니다. 서버와 연결할 수 없습니다.'
    })
  } finally {
    nextTick(scrollBottom)
  }
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