import { createRouter, createWebHistory } from 'vue-router'
import HomeView from '../views/HomeView.vue'
import BoardListView from '../views/BoardListView.vue'
import BoardDetailView from '../views/BoardDetailView.vue'
import BoardWriteView from '../views/BoardWriteView.vue'
import MapView from '../views/MapView.vue'

const routes = [
  { path: '/', name: 'Home', component: HomeView },
  { path: '/board', name: 'BoardList', component: BoardListView },
  { path: '/board/:id', name: 'BoardDetail', component: BoardDetailView, props: true },
  { path: '/board/write', name: 'BoardWrite', component: BoardWriteView },
  { path: '/board/edit/:id', name: 'BoardEdit', component: BoardWriteView, props: true },
  { path: '/map', name: 'Map', component: MapView,},
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

export default router