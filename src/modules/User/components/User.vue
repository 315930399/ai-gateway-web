/**
* Copyright(c) 2026 The Rainway AI Gateway (壬远AI网关) Authors.
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
<template>
    <div>
        <Button v-has class="add-button" type="primary" size="small" @click="onAdd">{{
            $t('com.createX', { obj: $t('user.name') })
        }}</Button>
        <Drawer
            v-model="isHiden"
            :title="
                handleType === 'create'
                    ? $t('com.createX', { obj: $t('user.name') })
                    : $t('user.changePassword')
            "
            width="30"
            :mask-closable="false"
        >
            <CreateUser v-if="isHiden && handleType === 'create'" @submit="submitData" />
            <UpdatePassword
                v-if="isHiden && handleType === 'updatePassword'"
                :currentData="currentData"
                @submit="submitPassword"
                @cancel="isHiden = false"
            />
        </Drawer>
        <Drawer
            v-model="roleDrawerVisible"
            :title="$t('user.changeRole')"
            width="30"
            :mask-closable="false"
        >
            <Form ref="roleForm" :model="roleForm" label-position="top">
                <FormItem :label="$t('com.userName')">
                    <Input v-model="roleForm.user_name" disabled />
                </FormItem>
                <FormItem :label="$t('user.role')">
                    <div v-if="isBuiltinAdmin">{{ $t('user.tipRoleFixedBuiltin') }}</div>
                    <RadioGroup v-else v-model="roleForm.role">
                        <Radio label="system_admin">{{ $t('com.sysAdmin') }}</Radio>
                        <Radio label="system_admin_readonly">{{
                            $t('com.sysAdminReadonly')
                        }}</Radio>
                        <Radio label="entity_admin">{{ $t('com.entityAdmin') }}</Radio>
                    </RadioGroup>
                </FormItem>
                <FormItem
                    v-if="!isBuiltinAdmin && roleForm.role === 'entity_admin'"
                    :label="$t('user.entityScope')"
                >
                    <Select
                        v-model="roleForm.entity_id"
                        filterable
                        :placeholder="$t('user.tipSelectEntity')"
                    >
                        <Option v-for="item in entityList" :key="item.id" :value="item.id">
                            {{ item.name }} ({{ item.id }})
                        </Option>
                    </Select>
                </FormItem>
            </Form>
            <div class="drawer-footer">
                <Button size="small" type="primary" @click="submitRole">{{
                    $t('com.submit')
                }}</Button>
                <Button size="small" @click="roleDrawerVisible = false">{{
                    $t('com.cancel')
                }}</Button>
            </div>
        </Drawer>
        <Drawer
            v-model="rebindDrawerVisible"
            :title="$t('user.rebindEntity')"
            width="30"
            :mask-closable="false"
        >
            <Form ref="rebindForm" :model="rebindForm" label-position="top">
                <FormItem :label="$t('com.userName')">
                    <Input v-model="rebindForm.user_name" disabled />
                </FormItem>
                <FormItem :label="$t('user.entityScope')">
                    <Select
                        v-model="rebindForm.entity_id"
                        filterable
                        :placeholder="$t('user.tipSelectEntity')"
                    >
                        <Option v-for="item in entityList" :key="item.id" :value="item.id">
                            {{ item.name }} ({{ item.id }})
                        </Option>
                    </Select>
                    <p class="form-tip">{{ $t('user.rebindEntityTip') }}</p>
                </FormItem>
            </Form>
            <div class="drawer-footer">
                <Button size="small" type="primary" @click="submitRebind">{{
                    $t('com.submit')
                }}</Button>
                <Button size="small" @click="rebindDrawerVisible = false">{{
                    $t('com.cancel')
                }}</Button>
            </div>
        </Drawer>
        <pageTable ref="pageTable" :tableData="tableData" :columns="columns" :loading="loading" />
    </div>
</template>

<script>
import pageTable from '@/components/table/pageTable';
import CreateUser from './CreateUser.vue';
import UpdatePassword from './UpdatePassword.vue';
export default {
    components: {
        pageTable,
        CreateUser,
        UpdatePassword
    },
    mounted() {
        this.getUserList();
        this.loadEntities();
    },
    data() {
        const that = this;
        return {
            loading: false,
            isHiden: false,
            handleType: '',
            currentData: {},
            roleDrawerVisible: false,
            rebindDrawerVisible: false,
            entityList: [],
            roleForm: {
                user_name: '',
                role: 'system_admin',
                entity_id: ''
            },
            rebindForm: {
                user_name: '',
                entity_id: ''
            },
            tableData: [],
            associatedUseList: [],
            columns: [
                {
                    key: 'user_name',
                    title: this.$t('user.name'),
                    searchable: true,
                    sortable: 'custom'
                },
                {
                    key: 'role',
                    title: this.$t('user.role'),
                    searchable: true,
                    searchType: 'select',
                    searchFilters: [
                        { label: this.$t('com.sysAdmin'), value: 'system_admin' },
                        { label: this.$t('com.sysAdminReadonly'), value: 'system_admin_readonly' },
                        { label: this.$t('com.entityAdmin'), value: 'entity_admin' }
                    ],
                    render(h, params) {
                        return h('span', that.roleLabel(params.row.role));
                    }
                },
                {
                    key: 'entity_id',
                    title: that.$t('user.entityScope'),
                    minWidth: 140,
                    render(h, params) {
                        if (params.row.role !== 'entity_admin' || !params.row.entity_id) {
                            return h('span', '-');
                        }
                        return h('span', that.entityName(params.row.entity_id));
                    }
                },
                {
                    key: 'action',
                    title: that.$t('com.operation'),
                    render(h, params) {
                        const buttons = [
                            h(
                                'Button',
                                {
                                    props: {
                                        type: 'primary',
                                        size: 'small'
                                    },
                                    directives: [{ name: 'has' }],
                                    style: {
                                        marginRight: '10px'
                                    },
                                    on: {
                                        click: () => {
                                            that.onChangeRole(params);
                                        }
                                    }
                                },
                                that.$t('user.changeRole')
                            )
                        ];
                        // Rebinding is only meaningful for entity_admin rows.
                        if (params.row.role === 'entity_admin') {
                            buttons.push(
                                h(
                                    'Button',
                                    {
                                        props: {
                                            type: 'primary',
                                            size: 'small'
                                        },
                                        directives: [{ name: 'has' }],
                                        style: {
                                            marginRight: '10px'
                                        },
                                        on: {
                                            click: () => {
                                                that.onRebindEntity(params);
                                            }
                                        }
                                    },
                                    that.$t('user.rebindEntity')
                                )
                            );
                        }
                        buttons.push(
                            h(
                                'Button',
                                {
                                    props: {
                                        type: 'primary',
                                        size: 'small'
                                    },
                                    directives: [{ name: 'has' }],
                                    style: {
                                        marginRight: '10px'
                                    },
                                    on: {
                                        click: () => {
                                            that.onUpdatePassword(params);
                                        }
                                    }
                                },
                                that.$t('user.changePassword')
                            )
                        );
                        buttons.push(
                            h(
                                'Button',
                                {
                                    props: {
                                        type: 'error',
                                        size: 'small'
                                    },
                                    directives: [{ name: 'has' }],
                                    on: {
                                        click: () => {
                                            that.onDel(params);
                                        }
                                    }
                                },
                                that.$t('com.del')
                            )
                        );
                        return h('div', buttons);
                    }
                }
            ]
        };
    },
    computed: {
        isBuiltinAdmin() {
            return String((this.roleForm && this.roleForm.user_name) || '').toLowerCase() === 'admin';
        }
    },
    methods: {
        roleLabel(role) {
            if (role === 'system_admin_readonly') {
                return this.$t('com.sysAdminReadonly');
            }
            if (role === 'system_admin') {
                return this.$t('com.sysAdmin');
            }
            if (role === 'entity_admin') {
                return this.$t('com.entityAdmin');
            }
            return this.$t('com.ordinaryUser');
        },
        loadEntities() {
            this.$request({
                url: 'entities',
                method: 'get',
                openapi: true,
                params: {
                    page: 1,
                    page_size: 100
                }
            })
                .then(res => {
                    if (res && res.status === 200) {
                        const data = res.data.Data || {};
                        this.entityList = Array.isArray(data.list) ? data.list : [];
                    }
                })
                .catch(() => {});
        },
        entityName(entityId) {
            const entity = this.entityList.find(item => item && item.id === entityId);
            return entity ? `${entity.name} (${entity.id})` : entityId;
        },
        onRebindEntity(params) {
            this.rebindForm = {
                user_name: params.row.user_name,
                entity_id: params.row.entity_id || ''
            };
            if (this.entityList.length === 0) {
                this.loadEntities();
            }
            this.rebindDrawerVisible = true;
        },
        submitRebind() {
            if (!this.rebindForm.entity_id) {
                this.$Message.error({ content: this.$t('user.tipSelectEntity') });
                return;
            }
            this.$request({
                url: this.$urlFormat('auth/users/{user_name}/entity', {
                    user_name: this.rebindForm.user_name
                }),
                method: 'patch',
                data: { entity_id: this.rebindForm.entity_id }
            }).then(data => {
                if (data.status === 200) {
                    this.$Message.success({
                        content: this.$t('com.tipEditSuccX', { obj: this.$t('user.entityScope') })
                    });
                    this.rebindDrawerVisible = false;
                    this.getUserList();
                }
            });
        },
        onChangeRole(params) {
            this.roleForm = {
                user_name: params.row.user_name,
                role: params.row.role || 'system_admin',
                entity_id: params.row.entity_id || ''
            };
            if (this.entityList.length === 0) {
                this.loadEntities();
            }
            this.roleDrawerVisible = true;
        },
        submitRole() {
            if (this.isBuiltinAdmin) {
                this.$Message.error({ content: this.$t('user.tipRoleFixedBuiltin') });
                return;
            }
            if (!this.roleForm.role) {
                this.$Message.error({ content: this.$t('user.tipSelectRole') });
                return;
            }
            const payload = { role: this.roleForm.role };
            if (this.roleForm.role === 'entity_admin') {
                // A binding is mandatory for entity_admin; sending the field
                // also covers "rebind" (same role + new entity_id is idempotent).
                if (!this.roleForm.entity_id) {
                    this.$Message.error({ content: this.$t('user.tipSelectEntity') });
                    return;
                }
                payload.entity_id = this.roleForm.entity_id;
            }
            this.$request({
                url: this.$urlFormat('auth/users/{user_name}/role', {
                    user_name: this.roleForm.user_name
                }),
                method: 'patch',
                data: payload
            }).then(data => {
                if (data.status === 200) {
                    this.$Message.success({ content: this.$t('com.tipEditSuccX', { obj: this.$t('user.role') }) });
                    this.roleDrawerVisible = false;
                    this.getUserList();
                }
            });
        },
        submitPassword(data, self) {
            this.upsertPassWord(data, self);
        },
        upsertPassWord(data, self) {
            let tmpData = {};
            if (self) {
                tmpData = {
                    old_password: data.old_password,
                    password: data.new_password
                };
            } else {
                tmpData = {
                    password: data.new_password
                };
            }
            this.$request({
                url: this.$urlFormat('auth/users/{user_name}/passwd', {
                    user_name: data.user_name
                }),
                method: 'patch',
                data: tmpData
            }).then(data => {
                if (data.status === 200) {
                    this.$Message.success({
                        content: this.$t('com.tipEditSuccX', { obj: this.$t('com.password') })
                    });
                    this.isHiden = false;
                    if (self) {
                        this.$Modal.warning({
                            title: this.$t('com.tips'),
                            content: this.$t('user.tipPasswordModified'),
                            onOk: () => {
                                location.href = `${window.location.protocol}//${window.location.host}/login`;
                            }
                        });
                    }
                }
            });
        },
        onDel(params) {
            this.$Modal.confirm({
                title: this.$t('com.informationTips'),
                content:
                    this.$t('com.confirmDelX', { obj: this.$t('user.name') }) +
                    params.row.user_name +
                    '?',
                onOk: () => {
                    this.onDelAdminUser(params.row.user_name);
                }
            });
        },
        onDelAdminUser(name) {
            let user = this.$store.getUser();
            this.$request({
                url: this.$urlFormat('auth/users/{user_name}', {
                    user_name: name
                }),
                method: 'delete'
            }).then(data => {
                if (data.status === 200) {
                    if (user.name === name) {
                        this.$Modal.error({
                            loading: true,
                            title: this.$t('com.informationTips'),
                            content: this.$t('user.tipUserDel'),
                            onOk: () => {
                                this.$Modal.remove();
                                location.href = `${window.location.protocol}//${window.location.host}/login`;
                            }
                        });
                    } else {
                        this.getUserList();
                    }
                }
            });
        },
        submitData(data) {
            if (data) {
                this.onAddAdminUser(data);
            }
        },
        onAddAdminUser(data) {
            this.$request({
                url: 'auth/users',
                method: 'post',
                data: data
            }).then(data => {
                if (data.status === 200) {
                    this.$Message.success({ content: this.$t('com.tipAddSucc') });
                    this.isHiden = false;
                    this.getUserList();
                }
            });
        },
        getUserList() {
            this.loading = true;
            this.$request({
                url: 'auth/users',
                method: 'get'
            })
                .then(data => {
                    if (data.status === 200) {
                        this.tableData = data.data.Data;
                    }
                })
                .finally(() => {
                    this.loading = false;
                });
        },
        onAdd() {
            this.isHiden = true;
            this.handleType = 'create';
        },
        onUpdatePassword(params) {
            this.isHiden = true;
            this.handleType = 'updatePassword';
            this.currentData = params.row;
        }
    }
};
</script>

<style lang="less" scoped></style>
