<script setup>
import CommonHeader from './components/CommonHeader.vue'
import ChatbotModal from './components/ChatbotModal.vue'
</script>

<template>
  <div id="app">
    <CommonHeader />
    <main class="page-container">
      <router-view />
    </main>
    <ChatbotModal />
  </div>
</template>

<style scoped>
#app {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.page-container {
  flex: 1;
  padding: 24px;
  width: 100%;            /* 💡 공간을 꽉 채우도록 허락해줍니다 */
  max-width: 1200px;      /* 💡 980px 범인을 1200px로 검거 완료! */
  margin: 0 auto;
  box-sizing: border-box;
}
</style>