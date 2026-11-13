/**
 * Copyright(c) 2026 The rainway-ai-gateway Authors.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http: //www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
/**
 * Copyright (c) 2021 The BFE Authors.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
import Vue from 'vue';

const NAV_KEY_BY_ROLE = {
  system_admin: 'admin',
  system_admin_readonly: 'admin_readonly',
  // entity_admin has its own nav subtree (Entity + API-Key only).
  entity_admin: 'entity_admin',
};

// Capability matrix used by the v-has directive. A capability is the set of
// roles allowed to use the element; the directive hides the element for every
// other role. Keep this as the single source of truth instead of comparing
// roles ad-hoc inside components.
const CAPABILITY_ROLES = {
  // Default capability of a bare `v-has`: "the role may write".
  write: ['system_admin', 'entity_admin'],
  // Entity / API-Key maintainers, bounded by the bound Entity subtree on the
  // server side.
  entityWrite: ['system_admin', 'entity_admin'],
  // Global "Entity type" maintenance is a platform resource.
  entityType: ['system_admin'],
  // Route-rule pages are outside the entity_admin nav tree, so the jump
  // buttons ("管理路由规则") must be hidden for that role.
  routeView: ['system_admin', 'system_admin_readonly'],
  // User management is platform-only.
  user: ['system_admin'],
};

export default {
  state: Vue.observable({
    user: null,
    meta: null,
    breadcrumbTitle: '',
    breadcrumbRouteName: '',
  }),
  getUser() {
    if (this.state.user) {
      return this.state.user;
    }
    let ls = localStorage.getItem('user');
    if (ls) {
      return JSON.parse(ls);
    }
    return null;
  },
  getLoginRoute() {
    return 'LoginPassword';
  },
  getMeta() {
    return this.state.meta;
  },
  getNav() {
    return this.state.meta ? this.state.meta.nav : null;
  },
  getNavRoot() {
    const nav = this.getNav();
    if (!nav) {
      return null;
    }
    const user = this.getUser();
    const navKey = NAV_KEY_BY_ROLE[(user && user.role)];
    // Fail closed for unknown roles: falling back to the admin tree would
    // expose the full management menu to an unrecognized role.
    if (!navKey) {
      return null;
    }
    return nav[navKey] || null;
  },
  findNav(routeName) {
    return findNav(this.getNavRoot(), routeName);
  },
  setMeta(newVal) {
    this.state.meta = newVal || {};
  },
  setUserData(newVal) {
    this.state.user = {
      name: newVal.user_name,
      sessionKey: newVal.session_key,
      role: newVal.role,
      // Bound Entity subtree root; only present for entity_admin.
      entityId: newVal.entity_id || '',
    };
    localStorage.setItem('user', JSON.stringify(this.state.user));
  },
  isReadonly() {
    const user = this.getUser();
    return !!(user && user.role === 'system_admin_readonly');
  },
  isEntityAdmin() {
    const user = this.getUser();
    return !!(user && user.role === 'entity_admin');
  },
  getEntityId() {
    const user = this.getUser();
    return (user && user.entityId) || '';
  },
  // Capability check backed by CAPABILITY_ROLES; used by the `v-has` directive.
  hasCapability(name) {
    const user = this.getUser();
    if (!user) {
      return false;
    }
    const key = name || 'write';
    const roles = CAPABILITY_ROLES[key];
    return !!roles && roles.indexOf(user.role) >= 0;
  },
  removeUserData() {
    this.state.user = null;
    localStorage.removeItem('user');
  },
  setBreadcrumbTitle(title, routeName) {
    this.state.breadcrumbTitle = title || '';
    this.state.breadcrumbRouteName = routeName || '';
  },
  getBreadcrumbTitle() {
    return this.state.breadcrumbTitle;
  },
  getBreadcrumbRouteName() {
    return this.state.breadcrumbRouteName;
  },
};

function findNav(root, id) {
  if (!root) {
    return null;
  }

  if (root.id === id) {
    return root;
  }

  let length = root.children ? root.children.length : 0;
  for (let index = 0; index < length; index++) {
    let node = findNav(root.children[index], id);
    if (node) {
      return node;
    }
  }
  return null;
}
