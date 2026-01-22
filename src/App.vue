<template>
  <div class="container" @mousemove="onGlobalDrag" @mouseup="stopDrag" @mouseleave="stopDrag">

    <div class="preload-container">
      <img v-for="img in images" :key="img.id" :src="img.url" />
    </div>

    <div
      v-if="isConfiguring"
      class="config-panel"
      :style="{ top: panelPos.y + 'px', left: panelPos.x + 'px', zIndex: 9999 }"
      @mouseenter="setInteract(true)"
      @mouseleave="setInteract(false)"
    >
      <div class="panel-header" @mousedown="(e) => startDrag(e, null, 'panel')">
        <span>⚙️ 插件配置</span>
        <button class="close-btn" @click="closeApp">×</button>
      </div>

      <div class="tab-header">
        <button :class="{ active: activeTab === 'image' }" @click="activeTab = 'image'">🖼️ 图片轮播</button>
        <button :class="{ active: activeTab === 'text' }" @click="activeTab = 'text'">📝 文字窗口</button>
      </div>

      <div class="panel-content">

        <div v-show="activeTab === 'image'">
          <div class="form-group">
            <label>轮播标题:</label>
            <input v-model="titleText" placeholder="输入直播标题..." />
          </div>
          <div class="form-group">
            <label>标题字号 ({{ fontSize }}px):</label>
            <input type="range" v-model.number="fontSize" min="20" max="200" class="range-input" />
          </div>
          <div class="form-group">
            <label>图片 (已选{{ images.length }}张):</label>
            <label class="custom-file-upload">
                <input
                  type="file"
                  multiple
                  accept=".png, .jpg, .jpeg, .gif, .bmp, .webp"
                  @change="handleFileUpload"
                />
                📂 选择图片文件...
            </label>
          </div>
          <div class="form-row">
            <div class="form-group col">
              <label>每组(张):</label>
              <input type="number" v-model.number="itemsPerPage" min="1" />
            </div>
            <div class="form-group col">
              <label>间隔(秒):</label>
              <input type="number" v-model.number="intervalSeconds" min="1" />
            </div>
          </div>
          <div class="form-group">
            <label>图片宽度 ({{ imgSize }}px):</label>
            <input type="range" v-model.number="imgSize" min="50" max="600" class="range-input" />
          </div>
        </div>

        <div v-show="activeTab === 'text'">
          <div class="text-manager-header">
            <label>选择窗口:</label>
            <div class="row-btn">
              <select v-model="editingTextId" class="text-selector">
                <option v-for="(win, idx) in textWindows" :key="win.id" :value="win.id">
                  窗口 #{{ idx + 1 }}
                </option>
              </select>
              <button class="add-btn" @click="addTextWindow">+</button>
              <button class="del-btn" @click="removeTextWindow" :disabled="!editingTextId">-</button>
            </div>
          </div>

          <div v-if="currentEditingText" class="text-editor-area">
            <div class="form-group">
              <label>文本内容:</label>
              <textarea v-model="currentEditingText.text" rows="3"></textarea>
            </div>
            <div class="form-row">
              <div class="form-group col">
                <label>字号:</label>
                <input type="range" v-model.number="currentEditingText.fontSize" min="12" max="100" class="range-input" />
              </div>
              <div class="form-group col">
                <label>对齐:</label>
                <div class="radio-group">
                  <label><input type="radio" value="left" v-model="currentEditingText.align"> 左</label>
                  <label><input type="radio" value="center" v-model="currentEditingText.align"> 中</label>
                </div>
              </div>
            </div>
            <div class="form-group">
              <label>宽度 ({{ currentEditingText.width }}px):</label>
              <input type="range" v-model.number="currentEditingText.width" min="100" max="1000" class="range-input" />
            </div>
          </div>
          <div v-else class="empty-tip">请添加文字窗口</div>
        </div>

        <div class="preview-control">
          <label class="checkbox-label">
            <input type="checkbox" v-model="showPreview" />
            👁️ 开启预览与位置调整
          </label>
        </div>
        <button class="start-btn" @click="startShow">🚀 锁定并开始</button>

      </div>
    </div>

    <div
      v-show="(!isConfiguring) || (isConfiguring && showPreview)"
      class="display-area-wrapper"
      :class="{ 'is-previewing': isConfiguring }"
      :style="{ top: containerPos.y + 'px', left: containerPos.x + 'px' }"
      @mousedown="(e) => isConfiguring && startDrag(e, null, 'image-container')"
      @mouseenter="isConfiguring && setInteract(true)"
      @mouseleave="isConfiguring && setInteract(false)"
    >
      <div v-if="isConfiguring" class="drag-hint">图片栏 (按住拖动)</div>
      <h1 v-if="titleText" class="live-title" :style="{ fontSize: fontSize + 'px' }">{{ titleText }}</h1>

      <transition-group name="fade" tag="div" class="image-grid">
        <div v-if="images.length === 0 && isConfiguring" class="placeholder-box" :style="{ width: imgSize + 'px', height: imgSize + 'px' }" key="placeholder">暂无图片</div>
        <div v-for="img in currentBatch" :key="img.uniqueKey" class="image-item">
          <img :src="img.url" :style="{ width: imgSize + 'px' }" />
        </div>
      </transition-group>
    </div>

    <div
      v-for="win in textWindows"
      :key="win.id"
      v-show="(!isConfiguring) || (isConfiguring && showPreview)"
      class="text-window-wrapper"
      :class="{
        'is-previewing': isConfiguring,
        'is-selected': isConfiguring && editingTextId === win.id
      }"
      :style="{
        top: win.y + 'px',
        left: win.x + 'px',
        width: win.width + 'px',
        textAlign: win.align,
        fontSize: win.fontSize + 'px'
      }"
      @mousedown="(e) => isConfiguring && startDrag(e, win, 'text-window')"
      @mouseenter="isConfiguring && setInteract(true)"
      @mouseleave="isConfiguring && setInteract(false)"
    >
      <div v-if="isConfiguring" class="drag-hint-text">
        {{ editingTextId === win.id ? '编辑中' : '文字' }}
      </div>
      <div class="text-content">{{ win.text }}</div>
    </div>

  </div>
</template>

<script setup>
import { ref, computed, onUnmounted, reactive, onMounted } from 'vue';
const { ipcRenderer } = require('electron');

const activeTab = ref('image');

// --- 状态 ---
const isConfiguring = ref(true);
const showPreview = ref(true);
const titleText = ref('');
const fontSize = ref(48);
const images = ref([]);
const itemsPerPage = ref(3);
const intervalSeconds = ref(5);
const imgSize = ref(200);

// 文字窗口数据
const textWindows = ref([
  { id: 1, text: "这里是独立的文字窗口\n支持换行", x: 50, y: 400, width: 300, fontSize: 24, align: 'left' }
]);
const editingTextId = ref(1);

const currentEditingText = computed(() => {
  return textWindows.value.find(w => w.id === editingTextId.value);
});

// --- 交互核心逻辑 (Mouse Penetration) ---
// true = 鼠标可以操作 UI（拦截鼠标）
// false = 鼠标穿透 UI（操作桌面）
const setInteract = (enable) => {
  // 如果正在配置模式，且并没有正在拖拽东西
  if (isConfiguring.value && !dragState.isDragging) {
    if (enable) {
      // 开启交互：告诉 Electron 别忽略鼠标
      ipcRenderer.send('set-ignore-mouse', false);
    } else {
      // 关闭交互：告诉 Electron 忽略鼠标，但 forward: true 让我们可以继续接收 mouseenter
      ipcRenderer.send('set-ignore-mouse', true, { forward: true });
    }
  }
};

// 初始化：默认开启穿透，等待鼠标移入
onMounted(() => {
  if (isConfiguring.value) {
    ipcRenderer.send('set-ignore-mouse', true, { forward: true });
  }
});

// --- 增删改查 ---
const addTextWindow = () => {
  const newId = Date.now();
  textWindows.value.push({
    id: newId, text: "新文字", x: 100, y: 150 + (textWindows.value.length * 30),
    width: 250, fontSize: 24, align: 'left'
  });
  editingTextId.value = newId;
};

const removeTextWindow = () => {
  if (!editingTextId.value) return;
  textWindows.value = textWindows.value.filter(w => w.id !== editingTextId.value);
  editingTextId.value = textWindows.value.length > 0 ? textWindows.value[0].id : null;
};

// --- 坐标与拖拽 ---
const panelPos = reactive({ x: 50, y: 50 });
const containerPos = reactive({ x: 400, y: 100 });

const dragState = reactive({
  isDragging: false,
  type: null,
  objRef: null,
  offsetX: 0, offsetY: 0
});

const startDrag = (event, dataPayload, type) => {
  if (event.button !== 0) return;

  // 【关键】开始拖拽时，强制开启交互，防止鼠标快速移动滑出元素导致穿透
  ipcRenderer.send('set-ignore-mouse', false);

  dragState.isDragging = true;
  dragState.type = type;

  let currentX = 0, currentY = 0;
  if (type === 'panel') { currentX = panelPos.x; currentY = panelPos.y; }
  else if (type === 'image-container') { currentX = containerPos.x; currentY = containerPos.y; }
  else if (type === 'text-window') {
    dragState.objRef = dataPayload;
    currentX = dataPayload.x; currentY = dataPayload.y;
    editingTextId.value = dataPayload.id;
    activeTab.value = 'text';
  }

  dragState.offsetX = event.clientX - currentX;
  dragState.offsetY = event.clientY - currentY;
};

const onGlobalDrag = (event) => {
  if (!dragState.isDragging) return;
  const newX = event.clientX - dragState.offsetX;
  const newY = event.clientY - dragState.offsetY;

  if (dragState.type === 'panel') { panelPos.x = newX; panelPos.y = newY; }
  else if (dragState.type === 'image-container') { containerPos.x = newX; containerPos.y = newY; }
  else if (dragState.type === 'text-window' && dragState.objRef) { dragState.objRef.x = newX; dragState.objRef.y = newY; }
};

const stopDrag = (event) => {
  if (!dragState.isDragging) return;
  dragState.isDragging = false;
  dragState.type = null;
  dragState.objRef = null;

  // 拖拽结束时，检测鼠标当前位置是否还在某个交互元素上
  // 这里做一个简化处理：拖拽结束后，如果鼠标不在元素上（依赖 mouseleave），会自动穿透
  // 但为了安全起见，这里可以不强制设置，交由 mousemove/leave 自动处理
  // 如果想更严谨，可以判断 event.target 是否是交互区
};

// --- Electron 交互 ---
const closeApp = () => window.close();

// --- 业务逻辑 ---
const handleFileUpload = (event) => {
  const files = event.target.files;
  if (!files) return;
  for (let i = 0; i < files.length; i++) {
    images.value.push({ id: Date.now() + i, url: URL.createObjectURL(files[i]) });
  }
  event.target.value = '';
};

const currentIndex = ref(0);
let timer = null;

const currentBatch = computed(() => {
  const total = images.value.length;
  if (total === 0) return [];
  const batch = [];
  const start = currentIndex.value;
  for (let i = 0; i < itemsPerPage.value; i++) {
    const index = (start + i) % total;
    const imgObj = images.value[index];
    batch.push({
      ...imgObj,
      uniqueKey: `img-${imgObj.id}-idx-${i}-cycle-${Math.floor(currentIndex.value / total)}`
    });
  }
  return batch;
});

const startShow = () => {
  if (images.value.length === 0 && textWindows.value.length === 0) {
     return alert("请至少添加一些内容！");
  }
  isConfiguring.value = false;
  // 正式开始后，完全开启穿透（不再转发移动事件以节省性能，或者保留以防未来扩展）
  // 保持 forward: true 是安全的，但为了性能通常直播时完全 ignore 更好
  ipcRenderer.send('set-ignore-mouse', true, { forward: true });
  startTimer();
};

const startTimer = () => {
  if (timer) clearInterval(timer);
  timer = setInterval(() => {
    currentIndex.value += itemsPerPage.value;
  }, intervalSeconds.value * 1000);
};

onUnmounted(() => {
  if (timer) clearInterval(timer);
  images.value.forEach(img => URL.revokeObjectURL(img.url));
});
</script>

<style>
/* 全局基础 */
html, body, #app {
  margin: 0; padding: 0; width: 100vw; height: 100vh;
  background: transparent !important;
  overflow: hidden; user-select: none;
  font-family: 'Segoe UI', sans-serif;
  max-width: 100vw; max-height: 100vh;
}
.container { width: 100%; height: 100%; position: relative; pointer-events: none; }
.preload-container { position: absolute; width: 1px; height: 1px; overflow: hidden; opacity: 0; pointer-events: none; z-index: -999; }

/* ============ 配置面板 ============ */
.config-panel {
  pointer-events: auto; /* 确保DOM层级接受事件 */
  position: absolute;
  width: 320px; background: white; border-radius: 8px;
  box-shadow: 0 10px 40px rgba(0,0,0,0.4);
  display: flex; flex-direction: column; overflow: hidden;
}
.panel-header {
  background: #f1f3f5; padding: 10px 15px; cursor: move;
  display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #e9ecef;
}
.panel-header span { font-weight: bold; color: #495057; }
.close-btn { border: none; background: none; font-size: 20px; cursor: pointer; color: #adb5bd; }
.close-btn:hover { color: #fa5252; }

.tab-header { display: flex; background: #f8f9fa; border-bottom: 1px solid #e9ecef; }
.tab-header button {
  flex: 1; border: none; background: transparent; padding: 10px; cursor: pointer;
  font-size: 14px; color: #6c757d; border-bottom: 2px solid transparent;
}
.tab-header button.active { color: #42b883; border-bottom-color: #42b883; font-weight: bold; background: white; }
.panel-content { padding: 15px; display: flex; flex-direction: column; gap: 12px; max-height: 70vh; overflow-y: auto; }

.form-group label { font-size: 13px; font-weight: 600; color: #495057; display: block; margin-bottom: 4px; }
input[type="text"], input[type="number"] { width: 100%; padding: 6px; border: 1px solid #dee2e6; border-radius: 4px; box-sizing: border-box; outline: none; }
textarea { width: 100%; padding: 6px; border: 1px solid #dee2e6; border-radius: 4px; resize: vertical; font-family: inherit; outline: none; }
input:focus, textarea:focus { border-color: #42b883; }

input[type="file"] { display: none; }
.custom-file-upload { border: 1px dashed #ced4da; padding: 6px; text-align: center; border-radius: 4px; cursor: pointer; font-size: 13px; color: #6c757d; display: block; }
.custom-file-upload:hover { border-color: #42b883; color: #42b883; }

.text-manager-header { background: #f8f9fa; padding: 8px; border-radius: 4px; margin-bottom: 10px; }
.row-btn { display: flex; gap: 5px; margin-top: 5px; }
.text-selector { flex: 1; padding: 4px; border: 1px solid #ced4da; border-radius: 4px; outline: none; }
.add-btn, .del-btn { width: 30px; height: 30px; border: none; border-radius: 4px; cursor: pointer; color: white; font-weight: bold; }
.add-btn { background: #42b883; }
.del-btn { background: #fa5252; }
.del-btn:disabled { background: #e9ecef; color: #adb5bd; cursor: not-allowed; }
.text-editor-area { border: 1px solid #e9ecef; padding: 10px; border-radius: 4px; background: #fff; }
.radio-group { display: flex; gap: 15px; margin-top: 5px; font-size: 13px; }
.empty-tip { text-align: center; color: #adb5bd; padding: 20px; font-size: 13px; }
.preview-control { background: #f8f9fa; padding: 8px; border-radius: 4px; border: 1px solid #e9ecef; margin-top: 10px; }
.checkbox-label { display: flex; align-items: center; gap: 6px; cursor: pointer; font-size: 14px; font-weight: bold; color: #333; }
.form-row { display: flex; gap: 10px; }
.form-group.col { flex: 1; }
.range-input { width: 100%; cursor: pointer; }
.start-btn { background: #42b883; color: white; border: none; padding: 10px; border-radius: 6px; font-weight: bold; cursor: pointer; transition: 0.2s; margin-top: 5px; }
.start-btn:hover { background: #38a172; }

/* ============ 图片展示区 ============ */
.display-area-wrapper {
  position: absolute; min-width: 100px; min-height: 100px;
  display: flex; flex-direction: column; align-items: center; pointer-events: none;
}
.display-area-wrapper.is-previewing {
  pointer-events: auto; border: 2px dashed #42b883; background: rgba(66, 184, 131, 0.1);
  cursor: move; padding: 10px; border-radius: 8px; z-index: 100;
}
.drag-hint { font-size: 12px; color: #42b883; font-weight: bold; margin-bottom: 5px; background: rgba(255,255,255,0.8); padding: 2px 6px; border-radius: 4px; }
.placeholder-box { background: #e9ecef; border: 2px solid #dee2e6; display: flex; align-items: center; justify-content: center; color: #adb5bd; font-size: 12px; border-radius: 8px; }
.live-title { color: white; font-weight: bold; margin-bottom: 10px; text-shadow: 2px 2px 0 #000, -1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 1px 1px 0 #000; }
.image-grid { display: flex; flex-direction: column; align-items: center; gap: 15px; position: relative; }
.image-item img { display: block; object-fit: contain; filter: drop-shadow(4px 4px 8px rgba(0,0,0,0.6)); will-change: opacity, transform; }
.image-item { transition: all 0.6s cubic-bezier(0.25, 0.8, 0.25, 1); }
.fade-enter-from { opacity: 0; transform: translateY(20px); }
.fade-enter-active { transition: all 0.6s ease; }
.fade-leave-active { position: absolute; opacity: 0; transform: translateY(-20px); }
.fade-move { transition: transform 0.6s ease; }

/* ============ 文字窗口展示区 ============ */
.text-window-wrapper {
  position: absolute; pointer-events: none;
  color: white; text-shadow: 2px 2px 0 #000, -1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 1px 1px 0 #000;
  font-weight: bold; line-height: 1.5; white-space: pre-wrap; word-break: break-all;
  display: flex; flex-direction: column;
}
.text-window-wrapper.is-previewing {
  pointer-events: auto; cursor: move; border: 2px dashed #4da6ff; background: rgba(77, 166, 255, 0.1);
  padding: 5px; border-radius: 4px; z-index: 101;
}
.text-window-wrapper.is-selected { border-color: #ffcc00; background: rgba(255, 204, 0, 0.15); z-index: 102; }
.drag-hint-text { font-size: 10px; color: #4da6ff; background: rgba(255,255,255,0.9); padding: 1px 4px; border-radius: 2px; margin-bottom: 2px; align-self: flex-start; }
.is-selected .drag-hint-text { color: #b38f00; }
</style>