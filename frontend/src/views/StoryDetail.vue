<template>
  <div class="story-detail">
    <div class="container">
      <div class="back-bar">
        <router-link to="/" class="back-link">← 返回故事广场</router-link>
      </div>

      <div v-if="loading" class="loading card">正在加载故事...</div>

      <div v-else-if="!story" class="empty card">
        <div class="empty-icon">❓</div>
        <p>故事不存在或已被删除</p>
        <router-link to="/" class="btn-primary" style="margin-top: 16px; display: inline-block;">
          返回广场
        </router-link>
      </div>

      <template v-else>
        <header class="story-header card">
          <div class="header-top">
            <div class="title-wrap">
              <h1 class="story-title">{{ story.title }}</h1>
              <span
                :class="['tag', story.locked ? 'tag-success' : 'tag-warning']"
              >
                {{ story.locked ? '已完结' : '接龙中' }}
              </span>
            </div>
            <button class="btn-danger btn-sm" @click="openReportStory()">
              🚩 举报故事
            </button>
          </div>
          <div v-if="story.locked && story.lockedReason" class="lock-reason">
            🔒 {{ story.lockedReason }}
          </div>
          <div class="story-stats">
            <div class="stat">
              <span class="stat-label">参与人数</span>
              <span class="stat-value">
                <strong>{{ story.participantCount }}</strong>
                <span class="stat-max">/ {{ story.maxParticipants }}</span>
              </span>
            </div>
            <div class="stat">
              <span class="stat-label">接龙段数</span>
              <span class="stat-value">
                <strong>{{ story.entryCount }}</strong> 段
              </span>
            </div>
            <div class="stat">
              <span class="stat-label">总字数</span>
              <span class="stat-value">
                <strong>{{ story.totalChars }}</strong>
                <span class="stat-max">/ {{ story.maxChars }}</span>
              </span>
            </div>
          </div>
          <div class="progress-section">
            <div class="progress-label">
              <span>创作进度</span>
              <span>{{ progressPct }}%</span>
            </div>
            <div class="progress-wrap-lg">
              <div
                class="progress-bar-fill"
                :style="{ width: progressPct + '%' }"
              ></div>
            </div>
          </div>
        </header>

        <section class="chat-section card">
          <h2 class="section-title">💬 接龙对话</h2>
          <div class="chat-list">
            <div
              v-for="(entry, idx) in story.entries"
              :key="entry.id"
              :class="['bubble-row', idx % 2 === 0 ? 'left' : 'right']"
            >
              <div class="avatar" :style="{ background: avatarColor(entry.author) }">
                {{ entry.author.slice(0, 1) }}
              </div>
              <div class="bubble-wrapper">
                <div class="bubble-meta">
                  <span class="bubble-author">{{ entry.author }}</span>
                  <span class="bubble-order">第 {{ entry.order }} 棒</span>
                  <span class="bubble-time">{{ formatTime(entry.createdAt) }}</span>
                </div>
                <div
                  :class="['bubble', idx % 2 === 0 ? 'bubble-left' : 'bubble-right']"
                >
                  <p>{{ entry.content }}</p>
                  <div class="bubble-footer">
                    <span class="char-count">{{ entry.content.length }} 字</span>
                    <button
                      class="report-entry-btn"
                      @click.stop="openReportEntry(entry)"
                    >
                      🚩 举报
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section v-if="!story.locked" class="write-section card">
          <h2 class="section-title">✏️ 参与续写</h2>
          <div class="form-group">
            <label>你的笔名</label>
            <input
              v-model="form.author"
              placeholder="请输入你的笔名..."
              maxlength="20"
            />
            <div class="hint">同一笔名只计为一位参与者</div>
          </div>
          <div class="form-group">
            <label>续写内容</label>
            <textarea
              v-model="form.content"
              placeholder="继续这个故事，让它更精彩..."
              rows="5"
              :maxlength="maxAllowedChars"
            ></textarea>
            <div class="hint-row">
              <span>
                {{ form.content.length }} 字
                <span v-if="form.content.length > maxAllowedChars" class="error-text">
                  （超出上限）
                </span>
              </span>
              <span>剩余可容纳 {{ remainingChars }} 字</span>
            </div>
          </div>
          <div v-if="submitError" class="error-text">{{ submitError }}</div>
          <button
            class="btn-primary"
            :disabled="submitting || !canSubmit"
            @click="handleSubmit"
          >
            {{ submitting ? '提交中...' : '发布续写' }}
          </button>
        </section>

        <section v-else class="locked-section card">
          <div class="locked-content">
            <div class="locked-icon">🎉</div>
            <h3>恭喜！这篇故事已创作完成</h3>
            <p class="locked-reason-detail">{{ story.lockedReason }}</p>
            <p class="locked-tip">
              共 <strong>{{ story.participantCount }}</strong> 位作者参与，
              累计 <strong>{{ story.entryCount }}</strong> 段、
              <strong>{{ story.totalChars }}</strong> 字。
            </p>
            <button class="btn-secondary" @click="scrollToTop">
              ↑ 从头阅读
            </button>
          </div>
        </section>
      </template>
    </div>

    <div
      v-if="reportVisible"
      class="modal-mask"
      @click.self="reportVisible = false"
    >
      <div class="modal card report-modal">
        <div class="modal-header danger">
          <h3>🚩 {{ reportTargetType === 'story' ? '举报故事' : '举报接龙段落' }}</h3>
          <button class="close-btn" @click="reportVisible = false">×</button>
        </div>
        <div class="modal-body">
          <div class="report-target-info">
            <div v-if="reportTargetType === 'story'" class="target-line">
              <span class="target-label">举报故事：</span>
              <span class="target-name">{{ story?.title }}</span>
            </div>
            <div v-else class="target-line">
              <span class="target-label">举报段落：</span>
              <span class="target-name">第 {{ targetEntry?.order }} 棒 - {{ targetEntry?.author }}</span>
            </div>
          </div>
          <div class="form-group">
            <label>举报原因 <span class="required">*</span></label>
            <textarea
              v-model="reportForm.reason"
              placeholder="请简要描述举报原因（最多200字）..."
              rows="4"
              maxlength="200"
            ></textarea>
            <div class="hint-row">
              <span>{{ reportForm.reason.length }} / 200 字</span>
            </div>
          </div>
          <div class="form-group">
            <label>你的称呼（选填）</label>
            <input
              v-model="reportForm.reporter"
              placeholder="可留空，默认为匿名用户"
              maxlength="20"
            />
          </div>
          <div v-if="reportError" class="error-text">{{ reportError }}</div>
        </div>
        <div class="modal-footer">
          <button
            class="btn-secondary"
            :disabled="reportSubmitting"
            @click="reportVisible = false"
          >
            取消
          </button>
          <button
            class="btn-danger"
            :disabled="reportSubmitting || !reportForm.reason.trim()"
            @click="submitReport"
          >
            {{ reportSubmitting ? '提交中...' : '确认举报' }}
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
import { ref, computed, onMounted, watch, nextTick } from 'vue'
import { useRoute } from 'vue-router'
import api from '../api.js'
import { formatTime } from '../utils.js'

const props = defineProps({
  id: { type: String, required: true }
})

const route = useRoute()
const story = ref(null)
const loading = ref(false)
const submitting = ref(false)
const submitError = ref('')
const form = ref({ author: '', content: '' })
const chatListRef = ref(null)

const progressPct = computed(() => {
  if (!story.value) return 0
  const pct = Math.max(
    (story.value.participantCount / story.value.maxParticipants) * 100,
    (story.value.totalChars / story.value.maxChars) * 100
  )
  return Math.min(Math.round(pct), 100)
})

const remainingChars = computed(() => {
  if (!story.value) return 0
  return Math.max(0, story.value.maxChars - story.value.totalChars)
})

const maxAllowedChars = computed(() => Math.max(1, remainingChars.value))

const canSubmit = computed(() => {
  return (
    form.value.author.trim().length > 0 &&
    form.value.content.trim().length > 0 &&
    form.value.content.length <= maxAllowedChars.value
  )
})

const avatarColors = [
  '#6366f1', '#ec4899', '#10b981', '#f59e0b', '#3b82f6',
  '#8b5cf6', '#ef4444', '#14b8a6', '#f97316', '#06b6d4'
]

function avatarColor(name) {
  let hash = 0
  for (let i = 0; i < name.length; i++) {
    hash = (hash * 31 + name.charCodeAt(i)) >>> 0
  }
  return avatarColors[hash % avatarColors.length]
}

async function loadStory() {
  loading.value = true
  try {
    story.value = await api.getStory(props.id || route.params.id)
  } catch (e) {
    console.error(e)
    story.value = null
  } finally {
    loading.value = false
  }
}

async function handleSubmit() {
  submitError.value = ''
  if (!canSubmit.value) return
  submitting.value = true
  try {
    const updated = await api.addEntry(story.value.id, {
      author: form.value.author.trim(),
      content: form.value.content.trim()
    })
    story.value = updated
    form.value.content = ''
    await nextTick()
    scrollToBottom()
  } catch (e) {
    submitError.value = e.message
  } finally {
    submitting.value = false
  }
}

function scrollToBottom() {
  window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' })
}

function scrollToTop() {
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

const reportVisible = ref(false)
const reportTargetType = ref('story')
const targetEntry = ref(null)
const reportForm = ref({ reason: '', reporter: '' })
const reportSubmitting = ref(false)
const reportError = ref('')
const toast = ref({ show: false, message: '', type: 'success' })

function showToast(message, type = 'success') {
  toast.value = { show: true, message, type }
  setTimeout(() => (toast.value.show = false), 2800)
}

function openReportStory() {
  reportTargetType.value = 'story'
  targetEntry.value = null
  reportForm.value = { reason: '', reporter: '' }
  reportError.value = ''
  reportVisible.value = true
}

function openReportEntry(entry) {
  reportTargetType.value = 'entry'
  targetEntry.value = entry
  reportForm.value = { reason: '', reporter: '' }
  reportError.value = ''
  reportVisible.value = true
}

async function submitReport() {
  if (!reportForm.value.reason.trim()) return
  reportSubmitting.value = true
  reportError.value = ''
  try {
    await api.createReport({
      storyId: story.value.id,
      entryId: reportTargetType.value === 'entry' ? targetEntry.value?.id : undefined,
      reason: reportForm.value.reason.trim(),
      reporter: reportForm.value.reporter.trim()
    })
    reportVisible.value = false
    showToast('举报提交成功，我们会尽快处理')
  } catch (e) {
    reportError.value = e.message
  } finally {
    reportSubmitting.value = false
  }
}

watch(() => route.params.id, loadStory)
onMounted(loadStory)
</script>

<style scoped>
.back-bar {
  margin-bottom: 16px;
}

.back-link {
  font-size: 14px;
  color: var(--text-muted);
}

.back-link:hover {
  color: var(--primary);
}

.story-header {
  margin-bottom: 20px;
}

.header-top {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 12px;
}

.story-title {
  font-size: 24px;
  font-weight: 700;
  line-height: 1.3;
}

.lock-reason {
  background: rgba(16, 185, 129, 0.1);
  border: 1px solid rgba(16, 185, 129, 0.25);
  color: var(--success);
  padding: 10px 14px;
  border-radius: var(--radius-sm);
  margin-bottom: 16px;
  font-size: 14px;
}

.story-stats {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
  margin-bottom: 20px;
}

.stat {
  text-align: center;
  padding: 12px;
  background: var(--surface-alt);
  border-radius: var(--radius-sm);
}

.stat-label {
  display: block;
  font-size: 12px;
  color: var(--text-muted);
  margin-bottom: 4px;
}

.stat-value {
  font-size: 18px;
  font-weight: 600;
}

.stat-value strong {
  color: var(--primary);
  font-size: 22px;
}

.stat-max {
  color: var(--text-light);
  font-size: 14px;
  font-weight: 400;
}

.progress-section {
  margin-top: 8px;
}

.progress-label {
  display: flex;
  justify-content: space-between;
  font-size: 13px;
  color: var(--text-muted);
  margin-bottom: 8px;
}

.progress-wrap-lg {
  height: 10px;
  background: var(--surface-alt);
  border-radius: 5px;
  overflow: hidden;
}

.progress-bar-fill {
  height: 100%;
  background: linear-gradient(90deg, var(--primary), var(--accent));
  border-radius: 5px;
  transition: width 0.4s ease;
}

.section-title {
  font-size: 17px;
  margin-bottom: 20px;
  padding-bottom: 12px;
  border-bottom: 1px solid var(--border);
}

.chat-section {
  margin-bottom: 20px;
}

.chat-list {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.bubble-row {
  display: flex;
  gap: 12px;
  max-width: 100%;
}

.bubble-row.right {
  flex-direction: row-reverse;
}

.avatar {
  width: 42px;
  height: 42px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-weight: 600;
  font-size: 16px;
  flex-shrink: 0;
  box-shadow: var(--shadow-sm);
}

.bubble-wrapper {
  display: flex;
  flex-direction: column;
  max-width: calc(100% - 60px);
}

.bubble-row.right .bubble-wrapper {
  align-items: flex-end;
}

.bubble-meta {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 6px;
  font-size: 12px;
  color: var(--text-muted);
}

.bubble-author {
  font-weight: 600;
  color: var(--text);
}

.bubble-order {
  background: var(--surface-alt);
  padding: 1px 8px;
  border-radius: 999px;
  color: var(--text-muted);
  font-size: 11px;
}

.bubble {
  padding: 14px 18px;
  border-radius: 16px;
  line-height: 1.8;
  box-shadow: var(--shadow-sm);
  position: relative;
}

.bubble p {
  white-space: pre-wrap;
  word-break: break-word;
  font-size: 15px;
}

.bubble-left {
  background: var(--surface-alt);
  border-top-left-radius: 4px;
  color: var(--text);
}

.bubble-right {
  background: linear-gradient(135deg, var(--primary) 0%, var(--accent) 100%);
  color: white;
  border-top-right-radius: 4px;
}

.bubble-right .char-count {
  color: rgba(255, 255, 255, 0.7);
}

.bubble-footer {
  margin-top: 8px;
  padding-top: 8px;
  border-top: 1px dashed rgba(100, 116, 139, 0.2);
  display: flex;
  justify-content: flex-end;
}

.char-count {
  font-size: 11px;
  color: var(--text-light);
}

.write-section {
  margin-bottom: 20px;
}

.hint-row {
  display: flex;
  justify-content: space-between;
  font-size: 12px;
  color: var(--text-muted);
  margin-top: 4px;
}

.locked-section {
  background: linear-gradient(135deg, #f0fdf4 0%, #ecfeff 100%);
  border-color: #bbf7d0;
}

.locked-content {
  text-align: center;
  padding: 20px 10px;
}

.locked-icon {
  font-size: 48px;
  margin-bottom: 12px;
}

.locked-content h3 {
  font-size: 20px;
  margin-bottom: 8px;
  color: var(--success);
}

.locked-reason-detail {
  color: var(--text-muted);
  margin-bottom: 12px;
  font-size: 14px;
}

.locked-tip {
  margin-bottom: 20px;
  color: var(--text);
}

.locked-tip strong {
  color: var(--primary);
}

.title-wrap {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.report-entry-btn {
  background: none;
  border: none;
  color: inherit;
  font-size: 11px;
  opacity: 0.7;
  cursor: pointer;
  padding: 2px 6px;
  border-radius: 4px;
  transition: opacity 0.2s;
}

.report-entry-btn:hover {
  opacity: 1;
  background: rgba(0, 0, 0, 0.06);
}

.bubble-right .report-entry-btn:hover {
  background: rgba(255, 255, 255, 0.15);
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

.report-modal {
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

.modal-body {
  padding-bottom: 8px;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding-top: 16px;
  border-top: 1px solid var(--border);
  margin-top: 8px;
}

.report-target-info {
  background: var(--surface-alt);
  padding: 12px 14px;
  border-radius: var(--radius-sm);
  margin-bottom: 16px;
}

.target-line {
  font-size: 14px;
}

.target-label {
  color: var(--text-muted);
}

.target-name {
  font-weight: 600;
  color: var(--text);
}

.required {
  color: var(--error);
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

@media (max-width: 640px) {
  .story-stats {
    grid-template-columns: 1fr;
  }
  .bubble-row {
    gap: 8px;
  }
  .avatar {
    width: 36px;
    height: 36px;
    font-size: 14px;
  }
  .bubble-wrapper {
    max-width: calc(100% - 48px);
  }
  .header-top {
    flex-direction: column;
    align-items: stretch;
  }
}
</style>
