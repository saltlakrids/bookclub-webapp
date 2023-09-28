import { createRouter, createWebHashHistory } from 'vue-router'
import HomeView from '../views/HomeView.vue'
import SearchBook from '@/components/SearchBook.vue'; 

const routes = [
  {
    path: '/pick',
    name: 'pick',
    component: HomeView
  },
  {
    path: '/add',
    name: 'add',
    component: function () {
      return import('../views/AddBookView.vue')
    }
  },
  {
    path: '/search',
    name: 'search', 
    component: SearchBook 
  }
]

const router = createRouter({
  history: createWebHashHistory(),
  routes
})

export default router
