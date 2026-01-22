const { app, BrowserWindow, ipcMain, screen } = require('electron')
const path = require('path')

// 【关键修复 1】禁用硬件加速
// OBS 的“窗口采集”通常无法捕获开启了 GPU 加速的透明窗口
// 必须在 app.whenReady() 之前调用
app.disableHardwareAcceleration()

let win = null

function createWindow() {
  const primaryDisplay = screen.getPrimaryDisplay()
  const { x, y, width, height } = primaryDisplay.bounds

  win = new BrowserWindow({
    x: x,
    y: y,
    width: width,
    height: height,
    transparent: true,
    frame: false,
    thickFrame: false,
    hasShadow: false,
    alwaysOnTop: true,
    resizable: false,
    // 【关键修复 2】移除 skipTaskbar: true
    // 如果设置为 true，OBS 的下拉列表里可能找不到这个窗口
    skipTaskbar: false,
    // 【关键修复 3】移除 type: 'toolbar'
    // 恢复为默认普通窗口类型，提高兼容性
    // type: 'toolbar',
    enableLargerThanScreen: true,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
  })

  // 保持置顶，但移除 "screen-saver" 参数，防止层级过高导致 OBS 无法钩取
  win.setAlwaysOnTop(true, "normal")

  // 强制全屏覆盖修正
  setTimeout(() => {
    win.setBounds({ x, y, width, height })
  }, 100)

  if (process.env.VITE_DEV_SERVER_URL) {
    win.loadURL(process.env.VITE_DEV_SERVER_URL)
  } else {
    win.loadFile(path.join(__dirname, '../dist/index.html'))
  }

  ipcMain.on('set-ignore-mouse', (event, ignore, options) => {
    const win = BrowserWindow.fromWebContents(event.sender)
    if (!win) return
    if (ignore) {
      win.setIgnoreMouseEvents(true, { forward: true })
    } else {
      win.setIgnoreMouseEvents(false)
    }
  })
}

// 忽略证书错误
app.commandLine.appendSwitch('ignore-certificate-errors')

app.whenReady().then(createWindow)

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})