<template>
  <div class="admin-panel">
    <div class="container">
      <header class="admin-header card">
        <div class="admin-header-inner">
          <div>
            <h1>🛠️ 故事管理中心</h1>
            <p class="admin-subtitle">管理所有社区微小说，支持重置故事内容和处理用户举报</p>
          </div>
          <button class="btn-secondary" @click="refreshCurrent">
            🔄 刷新
          </button>
        </div>
      </header>

      <div class="tabs card">
        <button
          :class="['tab-btn', activeTab === 'stories' ? 'active' : '']"
          @click="switchTab('stories')"
        >
          📚 故事管理
        </button>
        <button
          :class="['tab-btn', activeTab === 'reports' ? 'active' : '']"
          @click="switchTab('reports')"
        >
          🚩 举报列表
          <span v-if="pendingReportCount > 0" class="tab-badge">{{ pendingReportCount }}</span>
        </button>
      </div>

      <section v-if="activeTab === 'stories'" class="admin-content card">
        <div v-if="loading" class="loading">正在加载...</div>

        <div v-else-if="stories.length === 0" class="empty">
          <div class="empty-icon">📭</div>
          <p>暂无故事数据</p>
        </div>

        <template v-else>
          <div class="table-wrap">
            <table class="admin-table">
              <thead>
                <tr>
                  <th>故事标题</th>
                  <th class="num-col">参与人数</th>
                  <th class="num-col">段数</th>
                  <th class="num-col">字数</th>
                  <th class="status-col">状态</th>
                  <th class="time-col">最后更新</th>
                  <th class="action-col">操作</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="s in stories" :key="s.id">
                  <td class="title-cell">
                    <router-link :to="`/story/${s.id}`" class="story-link">
                      <span class="story-name">{{ s.title }}</span>
                    </router-link>
                    <span class="story-id">#{{ s.id.slice(0, 8) }}</span>
                  </td>
                  <td class="num-col">
                    <span
                      :class="['num-val', s.participantCount >= 10 ? 'num-warn' : '']"
                    >
                      {{ s.participantCount }}/10
                    </span>
                  </td>
                  <td class="num-col">{{ s.entryCount }}</td>
                  <td class="num-col">
                    <span
                      :class="['num-val', s.totalChars >= 5000 ? 'num-warn' : '']"
                    >
                      {{ s.totalChars }}/5000
                    </span>
                  </td>
                  <td class="status-col">
                    <span
                      :class="['tag', s.locked ? 'tag-success' : 'tag-warning']"
                    >
                      {{ s.locked ? '已完结' : '进行中' }}
                    </span>
                  </td>
                  <td class="time-col">
                    <span class="time">{{ formatTime(s.updatedAt) }}</span>
                  </td>
                  <td class="action-col">
                    <div class="actions">
                      <button
                        class="btn-secondary btn-sm"
                        @click="viewStory(s.id)"
                      >查看</button>
                      <button
                        class="btn-danger btn-sm"
                        :disabled="resetting === s.id || s.entryCount <= 1"
                        @click="askReset(s)"
                      >
                        {{ resetting === s.id ? '重置中...' : '重置' }}
                      </button>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <div class="table-footer">
            共 <strong>{{ stories.length }}</strong> 篇故事
          </div>
        </template>
      </section>

      <section v-if="activeTab === 'reports'" class="admin-content card">
        <div v-if="loadingReports" class="loading">正在加载...</div>

        <div v-else-if="reports.length === 0" class="empty">
          <div class="empty-icon">✅</div>
          <p>暂无举报记录</p>
        </div>

        <template v-else>
          <div class="filter-bar">
            <label class="filter-item">
              <input type="checkbox" v-model="filterHandled" />
              显示已处理
            </label>
            <span class="filter-tip">
              待处理 <strong>{{ pendingReportCount }}</strong> 条 / 共 <strong>{{ reports.length }}</strong> 条
            </span>
          </div>
          <div class="report-list">
            <div
              v-for="r in filteredReports"
              :key="r.id"
              :class="['report-item', r.handled ? 'handled' : 'pending']"
            >
              <div class="report-header">
                <div class="report-type">
                  <span v-if="r.entryId" class="type-tag type-entry">段落举报</span>
                  <span v-else class="type-tag type-story">故事举报</span>
                  <span :class="['status-tag', r.handled ? 'tag-success' : 'tag-warning']">
                    {{ r.handled ? '已处理' : '待处理' }}
                  </span>
                </div>
                <span class="report-time">{{ formatTime(r.createdAt) }}</span>
              </div>
              <div class="report-body">
                <div class="report-target">
                  <router-link :to="`/story/${r.storyId}`" class="story-link">
                    📖 {{ r.storyTitle }}
                  </router-link>
                  <span v-if="r.entryOrder" class="entry-info">· 第 {{ r.entryOrder }} 棒</span>
                </div>
                <div class="report-reason">
                  <span class="reason-label">举报原因：</span>
                  <span class="reason-text">{{ r.reason }}</span>
                </div>
                <div class="report-meta">
                  <span>举报人：{{ r.reporter }}</span>
                  <span v-if="r.handledAt">处理时间：{{ formatTime(r.handledAt) }}</span>
                </div>
              </div>
              <div v-if="!r.handled" class="report-actions">
                <button
                  class="btn-primary btn-sm"
                  :disabled="handling === r.id"
                  @click="handleReport(r.id)"
                >
                  {{ handling === r.id ? '处理中...' : '标记已处理' }}
                </button>
              </div>
            </div>
          </div>
        </template>
      </section>
    </div>

    <div
      v-if="confirmVisible"
      class="modal-mask"
      @click.self="confirmVisible = false"
    >
      <div class="modal card confirm-modal">
        <div class="modal-header danger">
          <h3>⚠️ 确认重置</h3>
          <button class="close-btn" @click="confirmVisible = false">×</button>
        </div>
        <div class="modal-body">
          <div class="confirm-content">
            <div class="confirm-icon">💥</div>
            <p class="confirm-text">
              确定要重置故事 <strong>{{ targetStory?.title }}</strong> 吗？
            </p>
            <ul class="confirm-info">
              <li>当前 <strong>{{ targetStory?.entryCount }}</strong> 段接龙将被清除</li>
              <li>只保留开篇第一段内容</li>
              <li>重置后状态将变为「进行中」</li>
              <li>此操作不可撤销</li>
            </ul>
          </div>
          <div v-if="resetError" class="error-text">{{ resetError }}</div>
        </div>
        <div class="modal-footer">
          <button
            class="btn-secondary"
            :disabled="resetting === targetStory?.id"
            @click="confirmVisible = false"
          >
            取消
          </button>
          <button
            class="btn-danger"
            :disabled="resetting === targetStory?.id"
            @click="doReset"
          >
            {{ resetting === targetStory?.id ? '正在重置...' : '确认重置' }}
          </button>
        </div>
      </div>
    </div>

    <div v-if="toast.show" :class="['toast', toast.type]">
      {{ toast.message }}
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import api from '../api.js'
import { formatTime } from '../utils.js'

const router = useRouter()
const activeTab = ref('stories')
const stories = ref([])
const loading = ref(false)
const resetting = ref(null)
const resetError = ref('')
const confirmVisible = ref(false)
const targetStory = ref(null)

const reports = ref([])
const loadingReports = ref(false)
const handling = ref(null)
const filterHandled = ref(false)

const toast = ref({ show: false, message: '', type: 'success' })

const pendingReportCount = computed(() =>
  reports.value.filter(r => !r.handled).length
)

const filteredReports = computed(() =>
  filterHandled.value
    ? reports.value
    : reports.value.filter(r => !r.handled)
)

function showToast(message, type = 'success') {
  toast.value = { show: true, message, type }
  setTimeout(() => (toast.value.show = false), 2800)
}

async function loadStories() {
  loading.value = true
  try {
    stories.value = await api.getStories()
  } catch (e) {
    showToast('加载失败：' + e.message, 'error')
  } finally {
    loading.value = false
  }
}

async function loadReports() {
  loadingReports.value = true
  try {
    reports.value = await api.getReports()
  } catch (e) {
    showToast('加载举报列表失败：' + e.message, 'error')
  } finally {
    loadingReports.value = false
  }
}

function switchTab(tab) {
  activeTab.value = tab
  if (tab === 'reports') {
    loadReports()
  }
}

function refreshCurrent() {
  if (activeTab.value === 'stories') {
    loadStories()
  } else {
    loadReports()
  }
}

function viewStory(id) {
  router.push(`/story/${id}`)
}

function askReset(story) {
  targetStory.value = story
  resetError.value = ''
  confirmVisible.value = true
}

async function doReset() {
  if (!targetStory.value) return
  resetError.value = ''
  resetting.value = targetStory.value.id
  try {
    await api.resetStory(targetStory.value.id)
    confirmVisible.value = false
    showToast('故事已重置成功')
    await loadStories()
  } catch (e) {
    resetError.value = e.message
  } finally {
    resetting.value = null
  }
}

async function handleReport(reportId) {
  handling.value = reportId
  try {
    await api.handleReport(reportId)
    showToast('已标记为已处理')
    await loadReports()
  } catch (e) {
    showToast('处理失败：' + e.message, 'error')
  } finally {
    handling.value = null
  }
}

onMounted(async () => {
  await loadStories()
  await loadReports()
})
</script>

<style scoped>
.admin-header {
  margin-bottom: 20px;
  background: linear-gradient(135deg, #fef3c7 0%, #fee2e2 100%);
  border-color: #fed7aa;
}

.admin-header-inner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
}

.admin-header h1 {
  font-size: 22px;
  margin-bottom: 4px;
}

.admin-subtitle {
  color: var(--text-muted);
  font-size: 14px;
}

.table-wrap {
  overflow-x: auto;
}

.admin-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 14px;
}

.admin-table thead th {
  text-align: left;
  padding: 12px 14px;
  background: var(--surface-alt);
  color: var(--text-muted);
  font-weight: 600;
  font-size: 13px;
  border-bottom: 1px solid var(--border);
  white-space: nowrap;
}

.admin-table tbody td {
  padding: 14px;
  border-bottom: 1px solid var(--border);
  vertical-align: middle;
}

.admin-table tbody tr:hover {
  background: var(--surface-alt);
}

.admin-table tbody tr:last-child td {
  border-bottom: none;
}

.num-col {
  text-align: center;
  white-space: nowrap;
}

.status-col,
.time-col,
.action-col {
  text-align: center;
  white-space: nowrap;
}

.title-cell {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.story-link {
  display: inline;
}

.story-name {
  font-weight: 500;
  color: var(--text);
}

.story-link:hover .story-name {
  color: var(--primary);
}

.story-id {
  font-size: 11px;
  color: var(--text-light);
  font-family: monospace;
}

.num-val {
  font-variant-numeric: tabular-nums;
}

.num-warn {
  color: var(--error);
  font-weight: 600;
}

.time {
  font-size: 13px;
  color: var(--text-muted);
}

.actions {
  display: flex;
  gap: 8px;
  justify-content: center;
}

.table-footer {
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid var(--border);
  text-align: right;
  color: var(--text-muted);
  font-size: 13px;
}

.table-footer strong {
  color: var(--primary);
  font-size: 16px;
  margin: 0 4px;
}

.modal-mask {
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 20px;
}

.modal {
  width: 100%;
  max-width: 460px;
}

.confirm-modal {
  animation: zoomIn 0.2s ease;
}

@keyframes zoomIn {
  from {
    opacity: 0;
    transform: scale(0.95);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-bottom: 16px;
  border-bottom: 1px solid var(--border);
  margin-bottom: 20px;
}

.modal-header.danger h3 {
  color: var(--error);
}

.modal-header h3 {
  font-size: 18px;
}

.close-btn {
  background: none;
  font-size: 28px;
  color: var(--text-muted);
  width: 32px;
  height: 32px;
  padding: 0;
  line-height: 1;
  border-radius: 50%;
}

.close-btn:hover {
  background: var(--surface-alt);
  color: var(--text);
}

.confirm-content {
  text-align: center;
  margin-bottom: 16px;
}

.confirm-icon {
  font-size: 48px;
  margin-bottom: 12px;
}

.confirm-text {
  font-size: 16px;
  margin-bottom: 14px;
}

.confirm-text strong {
  color: var(--primary);
}

.confirm-info {
  text-align: left;
  list-style: none;
  background: var(--surface-alt);
  padding: 14px 18px;
  border-radius: var(--radius-sm);
}

.confirm-info li {
  padding: 4px 0;
  color: var(--text-muted);
  font-size: 13px;
}

.confirm-info li::before {
  content: '• ';
  color: var(--error);
  font-weight: bold;
}

.confirm-info strong {
  color: var(--error);
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding-top: 16px;
  border-top: 1px solid var(--border);
  margin-top: 8px;
}

.toast {
  position: fixed;
  top: 24px;
  left: 50%;
  transform: translateX(-50%);
  padding: 12px 24px;
  border-radius: var(--radius-sm);
  color: white;
  font-size: 14px;
  font-weight: 500;
  z-index: 2000;
  box-shadow: var(--shadow-lg);
  animation: slideDown 0.3s ease;
}

@keyframes slideDown {
  from {
    opacity: 0;
    transform: translate(-50%, -20px);
  }
  to {
    opacity: 1;
    transform: translate(-50%, 0);
  }
}

.toast.success {
  background: var(--success);
}

.toast.error {
  background: var(--error);
}

.tabs {
  margin-bottom: 20px;
  padding: 6px;
  display: flex;
  gap: 6px;
}

.tab-btn {
  flex: 1;
  padding: 10px 16px;
  border: none;
  background: transparent;
  border-radius: var(--radius-sm);
  font-size: 14px;
  font-weight: 500;
  color: var(--text-muted);
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
}

.tab-btn:hover {
  background: var(--surface-alt);
  color: var(--text);
}

.tab-btn.active {
  background: var(--primary);
  color: white;
}

.tab-badge {
  background: var(--error);
  color: white;
  font-size: 11px;
  padding: 1px 8px;
  border-radius: 999px;
  min-width: 20px;
  text-align: center;
}

.filter-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-bottom: 16px;
  margin-bottom: 16px;
  border-bottom: 1px solid var(--border);
}

.filter-item {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: var(--text-muted);
  cursor: pointer;
}

.filter-tip {
  font-size: 13px;
  color: var(--text-muted);
}

.filter-tip strong {
  color: var(--primary);
  margin: 0 2px;
}

.report-list {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.report-item {
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  overflow: hidden;
  transition: all 0.2s;
}

.report-item.pending {
  border-left: 3px solid var(--warning);
}

.report-item.handled {
  border-left: 3px solid var(--success);
  opacity: 0.75;
}

.report-item:hover {
  box-shadow: var(--shadow-sm);
}

.report-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 14px;
  background: var(--surface-alt);
}

.report-type {
  display: flex;
  align-items: center;
  gap: 8px;
}

.type-tag {
  font-size: 11px;
  padding: 2px 8px;
  border-radius: 999px;
  font-weight: 500;
}

.type-story {
  background: rgba(99, 102, 241, 0.15);
  color: #6366f1;
}

.type-entry {
  background: rgba(236, 72, 153, 0.15);
  color: #ec4899;
}

.status-tag {
  font-size: 11px;
  padding: 2px 8px;
  border-radius: 999px;
}

.report-time {
  font-size: 12px;
  color: var(--text-muted);
}

.report-body {
  padding: 14px;
}

.report-target {
  margin-bottom: 10px;
  font-size: 14px;
}

.entry-info {
  color: var(--text-muted);
  margin-left: 6px;
  font-size: 13px;
}

.report-reason {
  margin-bottom: 10px;
  font-size: 14px;
  line-height: 1.6;
}

.reason-label {
  color: var(--text-muted);
  font-size: 13px;
}

.reason-text {
  color: var(--text);
}

.report-meta {
  display: flex;
  gap: 16px;
  font-size: 12px;
  color: var(--text-muted);
}

.report-actions {
  padding: 10px 14px;
  border-top: 1px solid var(--border);
  display: flex;
  justify-content: flex-end;
}

@media (max-width: 640px) {
  .admin-header-inner {
    flex-direction: column;
    align-items: flex-start;
  }
  .confirm-info {
    padding: 12px 14px;
  }
  .tabs {
    flex-direction: column;
  }
  .filter-bar {
    flex-direction: column;
    align-items: flex-start;
    gap: 10px;
  }
  .report-meta {
    flex-direction: column;
    gap: 4px;
  }
}
</style>
