<script setup>
import { useRouter } from 'vue-router'

const router = useRouter()

function goHome() {
  router.push('/')
}

// 💡 새 글 쓰기 페이지로 이동하는 함수 추가!
function goWrite() {
  router.push('/board/write')
}
</script>

<template>
  <header class="common-header">
    <div class="header-inner">
      <div class="logo-area" @click="goHome" role="button" tabindex="0">
        <span class="logo-emoji">🏡</span>
        <span class="logo-text">LocalHub</span>
      </div>
      
      <button class="write-btn" @click="goWrite">
        <span class="plus-icon">+</span> 새 글 쓰기
      </button>
    </div>
  </header>
</template>

<style scoped>
.common-header {
  width: 100%;
  background: #ffffff;
  border-bottom: 1px solid #e2e8f0;
}

.header-inner {
  max-width: 1200px;
  margin: 0 auto;
  padding: 16px 24px;
  display: flex;
  align-items: center;
  justify-content: space-between; /* 💡 로고는 왼쪽, 버튼은 오른쪽으로 쫙 밀어줍니다 */
  box-sizing: border-box;
}

.logo-area { 
  display: flex; 
  align-items: center; 
  gap: 8px; 
  cursor: pointer; 
  transition: opacity 0.2s ease;
}
.logo-area:hover { opacity: 0.8; }
.logo-emoji { font-size: 24px; }
.logo-text { 
  font-size: 20px; 
  font-weight: 800; 
  color: #0f172a; 
  letter-spacing: -0.5px; 
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
}

/* 💡 이식된 새 글 쓰기 버튼 디자인 */
.write-btn { 
  background: #2563eb; 
  color: #fff; 
  border: none; 
  padding: 8px 16px; 
  border-radius: 8px; 
  font-size: 13px; 
  font-weight: 700; 
  cursor: pointer; 
  box-shadow: 0 4px 10px rgba(37, 99, 235, 0.15); 
  transition: all 0.2s ease; 
  display: flex; 
  align-items: center; 
  gap: 5px; 
}
.write-btn:hover { 
  background: #1d4ed8; 
  transform: translateY(-1px); 
  box-shadow: 0 6px 14px rgba(37, 99, 235, 0.25); 
}
.plus-icon { font-size: 14px; font-weight: bold; }
</style>