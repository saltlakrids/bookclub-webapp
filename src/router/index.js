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
  },
  {
    path: '/progress',
    name: 'progress',
    component: function () {
      return import('../views/ProgressView.vue')
    }
  },
  {
    path: '/me',
    name: 'me',
    component: function () {
      return import('../views/MyBooksView.vue')
    }
  },
  {
    path: '/meetups',
    name: 'meetups',
    component: function () {
      return import('../views/MeetupsView.vue')
    }
  }
]

const router = createRouter({
  history: createWebHashHistory(),
  routes
})

export default router
