<script setup>
import { nextTick, ref } from 'vue'
import { useRouter } from 'vue-router'
import { API } from '@/api.js'

/**
 * 변경 사항
 * 1. 챗봇 답변의 제목·문단·목록·강조 표현을 보기 좋게 렌더링
 * 2. 응답 대기 중 로딩 말풍선과 중복 전송 방지 추가
 * 3. 백엔드 references를 장소/게시글 카드로 표시
 * 4. 프론트에서 사용하지 않는 latitude, longitude는 UI 상태에서 제외
 * 5. 게시글 참고자료는 상세 페이지로 이동 가능
 * 6. 모바일 화면에서 하단 시트 형태로 보이도록 반응형 개선
 */

const router = useRouter()

const open = ref(false)
const input = ref('')
const isSending = ref(false)
const messagesEl = ref(null)
const inputEl = ref(null)
const copiedReferenceId = ref(null)

const messages = ref([
  {
    id: 'welcome',
    from: 'bot',
    text: [
      '안녕하세요! LocalHub 챗봇입니다.',
      '',
      '서울 관광지, 축제·공연, 모범음식점, 커뮤니티 게시글과 현재 날씨를 물어보세요.',
    ].join('\n'),
    references: [],
    includeInHistory: false,
  },
])

function createMessageId(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

function toggle() {
  open.value = !open.value

  if (open.value) {
    nextTick(() => {
      scrollBottom()
      inputEl.value?.focus()
    })
  }
}

function close() {
  open.value = false
}

/**
 * 백엔드가 보낸 references 중 화면에 필요한 정보만 추립니다.
 * latitude, longitude는 현재 챗봇 카드에서 사용하지 않으므로 저장하지 않습니다.
 */
function normalizeReferences(references) {
  if (!Array.isArray(references)) {
    return []
  }

  const seen = new Set()

  return references
    .map((item) => ({
      type: item?.type === 'post' ? 'post' : 'location',
      id: String(item?.id ?? ''),
      title: String(item?.title ?? '').trim(),
      category: item?.category ? String(item.category).trim() : null,
      address: item?.address ? String(item.address).trim() : null,
      tel: item?.tel ? String(item.tel).trim() : null,
      snippet: item?.snippet ? String(item.snippet).trim() : null,
      tags: Array.isArray(item?.tags)
        ? item.tags.map((tag) => String(tag).trim()).filter(Boolean)
        : [],
      createdAt: item?.created_at ? String(item.created_at) : null,
    }))
    .filter((item) => {
      if (!item.id || !item.title) {
        return false
      }

      const key = `${item.type}:${item.id}`

      if (seen.has(key)) {
        return false
      }

      seen.add(key)
      return true
    })
}

function buildHistory() {
  return messages.value
    .filter((message) => (
      !message.isError
      && !message.isLoading
      && message.includeInHistory !== false
    ))
    .slice(-20)
    .map((message) => ({
      role: message.from === 'user' ? 'user' : 'assistant',
      content: message.text,
    }))
}

async function send() {
  const text = input.value.trim()

  if (!text || isSending.value) {
    return
  }

  const history = buildHistory()
  const userMessageId = createMessageId('user')
  const loadingMessageId = createMessageId('loading')

  messages.value.push({
    id: userMessageId,
    from: 'user',
    text,
    references: [],
  })

  messages.value.push({
    id: loadingMessageId,
    from: 'bot',
    text: '',
    references: [],
    isLoading: true,
    includeInHistory: false,
  })

  input.value = ''
  isSending.value = true
  await nextTick()
  scrollBottom()

  try {
    const response = await fetch(API.CHAT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        message: text,
        history,
      }),
    })

    let data = null

    try {
      data = await response.json()
    } catch {
      data = null
    }

    if (!response.ok) {
      const detail = typeof data?.detail === 'string'
        ? data.detail
        : `서버 응답 오류가 발생했습니다. (${response.status})`

      throw new Error(detail)
    }

    console.log('🤖 백엔드가 보낸 원본 데이터:', data)

    const botReply = (
      data?.answer
      || data?.message
      || data?.reply
      || data?.response
      || data?.content
      || '답변을 불러오지 못했습니다.'
    )

    const loadingIndex = messages.value.findIndex(
      (message) => message.id === loadingMessageId,
    )

    const botMessage = {
      id: createMessageId('bot'),
      from: 'bot',
      text: String(botReply).trim(),
      references: normalizeReferences(data?.references),
    }

    if (loadingIndex >= 0) {
      messages.value.splice(loadingIndex, 1, botMessage)
    } else {
      messages.value.push(botMessage)
    }
  } catch (error) {
    console.error('챗봇 통신 실패:', error)

    const loadingIndex = messages.value.findIndex(
      (message) => message.id === loadingMessageId,
    )

    const errorMessage = {
      id: createMessageId('error'),
      from: 'bot',
      text: error instanceof Error
        ? error.message
        : '죄송합니다. 서버와 연결할 수 없습니다.',
      references: [],
      isError: true,
      includeInHistory: false,
    }

    if (loadingIndex >= 0) {
      messages.value.splice(loadingIndex, 1, errorMessage)
    } else {
      messages.value.push(errorMessage)
    }
  } finally {
    isSending.value = false
    await nextTick()
    scrollBottom()
    inputEl.value?.focus()
  }
}

function scrollBottom() {
  const element = messagesEl.value

  if (element) {
    element.scrollTop = element.scrollHeight
  }
}

/**
 * 마크다운 라이브러리 없이도 자주 오는 답변 형태를 보기 좋게 표시합니다.
 * - # 제목
 * - 일반 문단
 * - -, *, • 글머리표 목록
 * - 1. 숫자 목록
 */
function parseMessageBlocks(text) {
  const lines = String(text ?? '')
    .replace(/\r\n/g, '\n')
    .split('\n')

  const blocks = []
  let paragraphLines = []

  function flushParagraph() {
    const value = paragraphLines.join('\n').trim()

    if (value) {
      blocks.push({
        type: 'paragraph',
        text: value,
      })
    }

    paragraphLines = []
  }

  function appendListItem(ordered, textValue) {
    const previous = blocks[blocks.length - 1]

    if (previous?.type === 'list' && previous.ordered === ordered) {
      previous.items.push(textValue)
      return
    }

    blocks.push({
      type: 'list',
      ordered,
      items: [textValue],
    })
  }

  for (const rawLine of lines) {
    const line = rawLine.trim()

    if (!line) {
      flushParagraph()
      continue
    }

    const headingMatch = line.match(/^(#{1,3})\s+(.+)$/)

    if (headingMatch) {
      flushParagraph()
      blocks.push({
        type: 'heading',
        level: headingMatch[1].length,
        text: headingMatch[2],
      })
      continue
    }

    const bulletMatch = line.match(/^[-*•]\s+(.+)$/)

    if (bulletMatch) {
      flushParagraph()
      appendListItem(false, bulletMatch[1])
      continue
    }

    const orderedMatch = line.match(/^\d+[.)]\s+(.+)$/)

    if (orderedMatch) {
      flushParagraph()
      appendListItem(true, orderedMatch[1])
      continue
    }

    paragraphLines.push(rawLine.trimEnd())
  }

  flushParagraph()

  return blocks.length > 0
    ? blocks
    : [{ type: 'paragraph', text: '' }]
}

/**
 * **강조**와 `코드` 정도만 안전한 Vue 텍스트 노드로 분리합니다.
 * v-html을 사용하지 않아 챗봇 응답의 HTML이 실행되지 않습니다.
 */
function parseInline(text) {
  const value = String(text ?? '')
  const pattern = /(\*\*.+?\*\*|`.+?`)/g
  const segments = []
  let lastIndex = 0
  let match

  while ((match = pattern.exec(value)) !== null) {
    if (match.index > lastIndex) {
      segments.push({
        type: 'text',
        text: value.slice(lastIndex, match.index),
      })
    }

    const token = match[0]

    if (token.startsWith('**')) {
      segments.push({
        type: 'strong',
        text: token.slice(2, -2),
      })
    } else {
      segments.push({
        type: 'code',
        text: token.slice(1, -1),
      })
    }

    lastIndex = pattern.lastIndex
  }

  if (lastIndex < value.length) {
    segments.push({
      type: 'text',
      text: value.slice(lastIndex),
    })
  }

  return segments.length > 0
    ? segments
    : [{ type: 'text', text: value }]
}

function formatDate(value) {
  if (!value) {
    return null
  }

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return value
  }

  return new Intl.DateTimeFormat('ko-KR', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(date)
}

function openReference(reference) {
  if (reference.type !== 'post') {
    return
  }

  close()
  router.push(`/board/${reference.id}`)
}

async function copyAddress(reference) {
  if (!reference.address) {
    return
  }

  try {
    await navigator.clipboard.writeText(reference.address)
    copiedReferenceId.value = `${reference.type}:${reference.id}`

    window.setTimeout(() => {
      copiedReferenceId.value = null
    }, 1600)
  } catch (error) {
    console.error('주소 복사 실패:', error)
  }
}

function isCopied(reference) {
  return copiedReferenceId.value === `${reference.type}:${reference.id}`
}
</script>

<template>
  <div>
    <button
      class="chat-fab"
      type="button"
      :aria-label="open ? '챗봇 닫기' : '챗봇 열기'"
      :aria-expanded="open"
      @click="toggle"
    >
      <span aria-hidden="true">{{ open ? '✕' : '💬' }}</span>
    </button>

    <section
      v-if="open"
      class="chat-overlay"
      aria-label="LocalHub 챗봇"
      @keydown.esc="close"
    >
      <div class="chat-panel" role="dialog" aria-modal="false">
        <header class="chat-header">
          <div class="chat-header__identity">
            <span class="chat-header__avatar" aria-hidden="true">L</span>
            <div>
              <strong>LocalHub 챗봇</strong>
              <p><span class="status-dot"></span>서울 여행 도우미</p>
            </div>
          </div>

          <button
            class="close-btn"
            type="button"
            aria-label="챗봇 닫기"
            @click="close"
          >
            ✕
          </button>
        </header>

        <div ref="messagesEl" class="chat-messages" aria-live="polite">
          <div
            v-for="message in messages"
            :key="message.id"
            :class="[
              'msg',
              message.from,
              { 'is-error': message.isError },
            ]"
          >
            <span
              v-if="message.from === 'bot'"
              class="message-avatar"
              aria-hidden="true"
            >
              L
            </span>

            <div class="message-content">
              <div class="bubble">
                <div v-if="message.isLoading" class="typing" aria-label="답변 작성 중">
                  <span></span>
                  <span></span>
                  <span></span>
                </div>

                <div v-else class="answer-body">
                  <template
                    v-for="(block, blockIndex) in parseMessageBlocks(message.text)"
                    :key="`${message.id}-block-${blockIndex}`"
                  >
                    <h3
                      v-if="block.type === 'heading' && block.level === 1"
                      class="answer-heading answer-heading--large"
                    >
                      <template
                        v-for="(segment, segmentIndex) in parseInline(block.text)"
                        :key="segmentIndex"
                      >
                        <strong v-if="segment.type === 'strong'">{{ segment.text }}</strong>
                        <code v-else-if="segment.type === 'code'">{{ segment.text }}</code>
                        <span v-else>{{ segment.text }}</span>
                      </template>
                    </h3>

                    <h4
                      v-else-if="block.type === 'heading'"
                      class="answer-heading"
                    >
                      <template
                        v-for="(segment, segmentIndex) in parseInline(block.text)"
                        :key="segmentIndex"
                      >
                        <strong v-if="segment.type === 'strong'">{{ segment.text }}</strong>
                        <code v-else-if="segment.type === 'code'">{{ segment.text }}</code>
                        <span v-else>{{ segment.text }}</span>
                      </template>
                    </h4>

                    <ol
                      v-else-if="block.type === 'list' && block.ordered"
                      class="answer-list answer-list--ordered"
                    >
                      <li
                        v-for="(item, itemIndex) in block.items"
                        :key="itemIndex"
                      >
                        <template
                          v-for="(segment, segmentIndex) in parseInline(item)"
                          :key="segmentIndex"
                        >
                          <strong v-if="segment.type === 'strong'">{{ segment.text }}</strong>
                          <code v-else-if="segment.type === 'code'">{{ segment.text }}</code>
                          <span v-else>{{ segment.text }}</span>
                        </template>
                      </li>
                    </ol>

                    <ul
                      v-else-if="block.type === 'list'"
                      class="answer-list"
                    >
                      <li
                        v-for="(item, itemIndex) in block.items"
                        :key="itemIndex"
                      >
                        <template
                          v-for="(segment, segmentIndex) in parseInline(item)"
                          :key="segmentIndex"
                        >
                          <strong v-if="segment.type === 'strong'">{{ segment.text }}</strong>
                          <code v-else-if="segment.type === 'code'">{{ segment.text }}</code>
                          <span v-else>{{ segment.text }}</span>
                        </template>
                      </li>
                    </ul>

                    <p v-else class="answer-paragraph">
                      <template
                        v-for="(segment, segmentIndex) in parseInline(block.text)"
                        :key="segmentIndex"
                      >
                        <strong v-if="segment.type === 'strong'">{{ segment.text }}</strong>
                        <code v-else-if="segment.type === 'code'">{{ segment.text }}</code>
                        <span v-else>{{ segment.text }}</span>
                      </template>
                    </p>
                  </template>
                </div>
              </div>

              <div
                v-if="message.references?.length"
                class="reference-section"
              >
                <div class="reference-section__title">
                  <span aria-hidden="true">🔎</span>
                  <span>답변에 참고한 정보</span>
                </div>

                <article
                  v-for="reference in message.references"
                  :key="`${reference.type}-${reference.id}`"
                  class="reference-card"
                >
                  <div class="reference-card__meta">
                    <span
                      :class="[
                        'reference-type',
                        `reference-type--${reference.type}`,
                      ]"
                    >
                      {{ reference.type === 'post' ? '커뮤니티' : '장소' }}
                    </span>
                    <span v-if="reference.category" class="reference-category">
                      {{ reference.category }}
                    </span>
                  </div>

                  <strong class="reference-card__title">
                    {{ reference.title }}
                  </strong>

                  <p v-if="reference.address" class="reference-info">
                    <span aria-hidden="true">📍</span>
                    <span>{{ reference.address }}</span>
                  </p>

                  <p v-if="reference.tel" class="reference-info">
                    <span aria-hidden="true">☎</span>
                    <span>{{ reference.tel }}</span>
                  </p>

                  <p v-if="reference.snippet" class="reference-snippet">
                    {{ reference.snippet }}
                  </p>

                  <div v-if="reference.tags.length" class="reference-tags">
                    <span
                      v-for="tag in reference.tags"
                      :key="tag"
                      class="reference-tag"
                    >
                      #{{ tag }}
                    </span>
                  </div>

                  <div class="reference-card__footer">
                    <time v-if="reference.createdAt">
                      {{ formatDate(reference.createdAt) }}
                    </time>

                    <button
                      v-if="reference.type === 'post'"
                      type="button"
                      class="reference-action"
                      @click="openReference(reference)"
                    >
                      게시글 보기
                    </button>

                    <button
                      v-else-if="reference.address"
                      type="button"
                      class="reference-action"
                      @click="copyAddress(reference)"
                    >
                      {{ isCopied(reference) ? '복사됨' : '주소 복사' }}
                    </button>
                  </div>
                </article>
              </div>
            </div>
          </div>
        </div>

        <form class="chat-input" @submit.prevent="send">
          <div class="input-wrap">
            <textarea
              ref="inputEl"
              v-model="input"
              rows="1"
              maxlength="1000"
              placeholder="서울 여행에 대해 물어보세요"
              autocomplete="off"
              :disabled="isSending"
              @keydown.enter.exact.prevent="send"
            ></textarea>
            <span class="input-count">{{ input.length }}/1000</span>
          </div>

          <button
            class="send-btn"
            type="submit"
            :disabled="!input.trim() || isSending"
            aria-label="메시지 전송"
          >
            <span aria-hidden="true">➤</span>
          </button>
        </form>

        <p class="chat-helper">Enter로 전송 · Shift+Enter로 줄바꿈</p>
      </div>
    </section>
  </div>
</template>

<style scoped>
.chat-fab {
  position: fixed;
  right: 22px;
  bottom: 22px;
  z-index: 1200;
  width: 58px;
  height: 58px;
  border: 0;
  border-radius: 50%;
  background: linear-gradient(135deg, #2563eb, #4f46e5);
  color: #fff;
  font-size: 22px;
  cursor: pointer;
  box-shadow: 0 14px 30px rgba(37, 99, 235, 0.3);
  transition: transform 0.18s ease, box-shadow 0.18s ease;
}

.chat-fab:hover {
  transform: translateY(-2px);
  box-shadow: 0 18px 34px rgba(37, 99, 235, 0.38);
}

.chat-fab:focus-visible,
.close-btn:focus-visible,
.send-btn:focus-visible,
.reference-action:focus-visible,
.chat-input textarea:focus-visible {
  outline: 3px solid rgba(59, 130, 246, 0.26);
  outline-offset: 2px;
}

.chat-overlay {
  position: fixed;
  right: 22px;
  bottom: 94px;
  z-index: 1199;
}

.chat-panel {
  width: min(410px, calc(100vw - 32px));
  height: min(650px, calc(100vh - 124px));
  min-height: 460px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  border: 1px solid rgba(226, 232, 240, 0.9);
  border-radius: 22px;
  background: #fff;
  box-shadow: 0 28px 70px rgba(15, 23, 42, 0.22);
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto,
    "Noto Sans KR", "Helvetica Neue", Arial, sans-serif;
}

.chat-header {
  flex: 0 0 auto;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 17px;
  color: #fff;
  background: linear-gradient(135deg, #1d4ed8, #4338ca);
}

.chat-header__identity {
  display: flex;
  align-items: center;
  gap: 11px;
}

.chat-header__identity strong {
  display: block;
  font-size: 16px;
  line-height: 1.3;
}

.chat-header__identity p {
  display: flex;
  align-items: center;
  gap: 6px;
  margin: 4px 0 0;
  color: rgba(255, 255, 255, 0.78);
  font-size: 12px;
}

.chat-header__avatar,
.message-avatar {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 auto;
  border-radius: 50%;
  font-weight: 800;
}

.chat-header__avatar {
  width: 38px;
  height: 38px;
  color: #1d4ed8;
  background: #fff;
  box-shadow: 0 5px 16px rgba(15, 23, 42, 0.18);
}

.status-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: #86efac;
  box-shadow: 0 0 0 3px rgba(134, 239, 172, 0.16);
}

.close-btn {
  width: 34px;
  height: 34px;
  border: 0;
  border-radius: 10px;
  color: #fff;
  background: rgba(255, 255, 255, 0.12);
  font-size: 15px;
  cursor: pointer;
}

.close-btn:hover {
  background: rgba(255, 255, 255, 0.2);
}

.chat-messages {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 18px 15px 12px;
  background:
    radial-gradient(circle at top right, rgba(219, 234, 254, 0.55), transparent 34%),
    #f8fafc;
  scroll-behavior: smooth;
}

.chat-messages::-webkit-scrollbar {
  width: 7px;
}

.chat-messages::-webkit-scrollbar-thumb {
  border-radius: 999px;
  background: #cbd5e1;
}

.msg {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  margin-bottom: 16px;
}

.msg.user {
  justify-content: flex-end;
}

.message-avatar {
  width: 28px;
  height: 28px;
  margin-top: 2px;
  color: #fff;
  background: linear-gradient(135deg, #2563eb, #4f46e5);
  font-size: 12px;
  box-shadow: 0 5px 14px rgba(37, 99, 235, 0.18);
}

.message-content {
  max-width: 84%;
  min-width: 0;
}

.bubble {
  padding: 11px 13px;
  border: 1px solid #e2e8f0;
  border-radius: 5px 17px 17px 17px;
  color: #1e293b;
  background: #fff;
  box-shadow: 0 5px 18px rgba(15, 23, 42, 0.06);
  font-size: 14px;
  line-height: 1.67;
  overflow-wrap: anywhere;
}

.msg.user .message-content {
  display: flex;
  justify-content: flex-end;
}

.msg.user .bubble {
  max-width: 100%;
  border-color: transparent;
  border-radius: 17px 5px 17px 17px;
  color: #fff;
  background: linear-gradient(135deg, #2563eb, #4f46e5);
  box-shadow: 0 8px 20px rgba(37, 99, 235, 0.18);
  white-space: pre-wrap;
}

.msg.is-error .bubble {
  border-color: #fecaca;
  color: #991b1b;
  background: #fff1f2;
}

.answer-body > :first-child {
  margin-top: 0;
}

.answer-body > :last-child {
  margin-bottom: 0;
}

.answer-heading {
  margin: 12px 0 6px;
  color: #172554;
  font-size: 14px;
  line-height: 1.45;
}

.answer-heading--large {
  font-size: 16px;
}

.answer-paragraph {
  margin: 0 0 9px;
  white-space: pre-line;
}

.answer-list {
  margin: 7px 0 10px;
  padding-left: 20px;
}

.answer-list li {
  margin: 5px 0;
  padding-left: 2px;
}

.answer-list li::marker {
  color: #4f46e5;
}

.answer-body strong {
  color: #172554;
  font-weight: 750;
}

.answer-body code {
  padding: 1px 5px;
  border-radius: 5px;
  color: #3730a3;
  background: #eef2ff;
  font-family: Consolas, Monaco, monospace;
  font-size: 0.9em;
}

.typing {
  display: flex;
  align-items: center;
  gap: 5px;
  min-height: 20px;
}

.typing span {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: #818cf8;
  animation: typing-bounce 1.1s infinite ease-in-out;
}

.typing span:nth-child(2) {
  animation-delay: 0.15s;
}

.typing span:nth-child(3) {
  animation-delay: 0.3s;
}

@keyframes typing-bounce {
  0%, 60%, 100% {
    transform: translateY(0);
    opacity: 0.45;
  }
  30% {
    transform: translateY(-4px);
    opacity: 1;
  }
}

.reference-section {
  margin-top: 9px;
}

.reference-section__title {
  display: flex;
  align-items: center;
  gap: 6px;
  margin: 0 0 8px 2px;
  color: #475569;
  font-size: 12px;
  font-weight: 700;
}

.reference-card {
  margin-top: 8px;
  padding: 12px;
  border: 1px solid #dbeafe;
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.96);
  box-shadow: 0 5px 16px rgba(15, 23, 42, 0.05);
}

.reference-card__meta {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 7px;
}

.reference-type,
.reference-category {
  display: inline-flex;
  align-items: center;
  min-height: 21px;
  padding: 2px 7px;
  border-radius: 999px;
  font-size: 10px;
  font-weight: 750;
}

.reference-type--location {
  color: #1d4ed8;
  background: #dbeafe;
}

.reference-type--post {
  color: #7c3aed;
  background: #ede9fe;
}

.reference-category {
  color: #475569;
  background: #f1f5f9;
}

.reference-card__title {
  display: block;
  margin-bottom: 7px;
  color: #0f172a;
  font-size: 14px;
  line-height: 1.45;
}

.reference-info {
  display: grid;
  grid-template-columns: 17px minmax(0, 1fr);
  gap: 3px;
  margin: 5px 0 0;
  color: #64748b;
  font-size: 12px;
  line-height: 1.5;
}

.reference-snippet {
  display: -webkit-box;
  margin: 8px 0 0;
  overflow: hidden;
  color: #475569;
  font-size: 12px;
  line-height: 1.55;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 3;
}

.reference-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
  margin-top: 8px;
}

.reference-tag {
  color: #4f46e5;
  font-size: 11px;
}

.reference-card__footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  min-height: 28px;
  margin-top: 10px;
}

.reference-card__footer time {
  color: #94a3b8;
  font-size: 10px;
}

.reference-action {
  margin-left: auto;
  padding: 6px 9px;
  border: 1px solid #c7d2fe;
  border-radius: 8px;
  color: #4338ca;
  background: #fff;
  font-size: 11px;
  font-weight: 700;
  cursor: pointer;
}

.reference-action:hover {
  background: #eef2ff;
}

.chat-input {
  flex: 0 0 auto;
  display: flex;
  align-items: flex-end;
  gap: 9px;
  padding: 12px 13px 7px;
  border-top: 1px solid #e2e8f0;
  background: #fff;
}

.input-wrap {
  position: relative;
  flex: 1;
}

.chat-input textarea {
  display: block;
  width: 100%;
  min-height: 44px;
  max-height: 110px;
  padding: 11px 54px 11px 12px;
  resize: none;
  box-sizing: border-box;
  border: 1px solid #cbd5e1;
  border-radius: 13px;
  color: #0f172a;
  background: #f8fafc;
  font: inherit;
  font-size: 13px;
  line-height: 1.5;
}

.chat-input textarea:focus {
  border-color: #818cf8;
  background: #fff;
}

.chat-input textarea::placeholder {
  color: #94a3b8;
}

.chat-input textarea:disabled {
  cursor: not-allowed;
  opacity: 0.7;
}

.input-count {
  position: absolute;
  right: 10px;
  bottom: 7px;
  color: #94a3b8;
  font-size: 9px;
}

.send-btn {
  flex: 0 0 auto;
  width: 44px;
  height: 44px;
  border: 0;
  border-radius: 13px;
  color: #fff;
  background: linear-gradient(135deg, #2563eb, #4f46e5);
  font-size: 16px;
  cursor: pointer;
  box-shadow: 0 7px 16px rgba(37, 99, 235, 0.2);
}

.send-btn:disabled {
  color: #94a3b8;
  background: #e2e8f0;
  cursor: not-allowed;
  box-shadow: none;
}

.chat-helper {
  flex: 0 0 auto;
  margin: 0;
  padding: 0 15px 10px;
  color: #94a3b8;
  background: #fff;
  font-size: 10px;
  text-align: left;
}

@media (max-width: 600px) {
  .chat-fab {
    right: 16px;
    bottom: 16px;
  }

  .chat-overlay {
    right: 0;
    bottom: 0;
    left: 0;
  }

  .chat-panel {
    width: 100%;
    height: min(78vh, 680px);
    min-height: 480px;
    border-right: 0;
    border-bottom: 0;
    border-left: 0;
    border-radius: 22px 22px 0 0;
  }

  .message-content {
    max-width: 88%;
  }
}

@media (prefers-reduced-motion: reduce) {
  .chat-fab,
  .typing span,
  .chat-messages {
    transition: none;
    animation: none;
    scroll-behavior: auto;
  }
}
</style>
