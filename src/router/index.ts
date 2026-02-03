// Copyright (C) 2026 ntskwk
//
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU Affero General Public License as
// published by the Free Software Foundation, either version 3 of the
// License, or (at your option) any later version.
//
// This program is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU Affero General Public License for more details.
//
// You should have received a copy of the GNU Affero General Public License
// along with this program.  If not, see <https://www.gnu.org/licenses/>.

import { createRouter, createWebHistory } from 'vue-router'

interface RouteComponentProps {
  componentName: "Home" | "RasterOffset" | "VectorOffset"
}

const router = createRouter({
  history: createWebHistory(),
  routes: [{
    path: '/',
    name: 'Home',
    component: () => import('../views/Home.vue'),
    props: <RouteComponentProps>{
      componentName: "Home"
    }
  }, {
    path: '/raster-offset',
    name: 'RasterOffset',
    component: () => import('../views/Home.vue'),
    props: <RouteComponentProps>{
      componentName: "RasterOffset"
    }
  }, {
    path: '/vector-offset',
    name: 'VectorOffset',
    component: () => import('../views/Home.vue'),
    props: <RouteComponentProps>{
      componentName: "VectorOffset"
    }
  }]
})

export default router
