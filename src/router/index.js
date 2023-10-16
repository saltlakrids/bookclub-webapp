import { createRouter, createWebHashHistory } from 'vue-router';
import HomeView from '../views/HomeView.vue';
import SearchBook from '@/components/SearchBook.vue'; 
import LandingView from '../views/LandingView.vue';
import RateBook from '../views/RateBookView.vue';

const routes = [
  {
    path: '/',
    name: 'landing',
    component: LandingView
  },
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
  },
  {
    path: '/rate',
    name: 'rate', 
    component: RateBook 
  }
]

const router = createRouter({
  history: createWebHashHistory(),
  routes
})

export default router
