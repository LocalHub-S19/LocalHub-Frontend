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
  max-width: 980px;
  margin: 0 auto;
  box-sizing: border-box;
}
</style>