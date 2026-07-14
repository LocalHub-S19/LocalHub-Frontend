<script setup></script>

<template>
  <header class="common-header">
    <div class="container">
      <router-link to="/" class="logo">LocalHub</router-link>
      <nav class="nav">
        <router-link to="/board" class="board-link">게시판 바로가기</router-link>
      </nav>
    </div>
  </header>
</template>

<style scoped>
.common-header {
  width: 100%;
  background: #ffffff;
  border-bottom: 1px solid #eef2f6;
  box-shadow: 0 2px 8px rgba(2,6,23,0.03);
  position: sticky;
  top: 0;
  z-index: 900;
}

.container {
  max-width: 980px;
  margin: 0 auto;
  padding: 12px 18px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  box-sizing: border-box;
}

.logo {
  font-weight: 700;
  font-size: 18px;
  color: #111827;
  text-decoration: none;
}

.nav .board-link {
  background: #2563eb;
  color: #fff;
  padding: 8px 12px;
  border-radius: 8px;
  text-decoration: none;
  font-size: 14px;
}
</style>