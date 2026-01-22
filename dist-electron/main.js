"use strict";
const { app, BrowserWindow, ipcMain, screen } = require("electron");
const path = require("path");
app.disableHardwareAcceleration();
let win = null;
function createWindow() {
  const primaryDisplay = screen.getPrimaryDisplay();
  const { x, y, width, height } = primaryDisplay.bounds;
  win = new BrowserWindow({
    x,
    y,
    width,
    height,
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
      contextIsolation: false
    }
  });
  win.setAlwaysOnTop(true, "normal");
  setTimeout(() => {
    win.setBounds({ x, y, width, height });
  }, 100);
  if (process.env.VITE_DEV_SERVER_URL) {
    win.loadURL(process.env.VITE_DEV_SERVER_URL);
  } else {
    win.loadFile(path.join(__dirname, "../dist/index.html"));
  }
  ipcMain.on("set-ignore-mouse", (event, ignore, options) => {
    const win2 = BrowserWindow.fromWebContents(event.sender);
    if (!win2) return;
    if (ignore) {
      win2.setIgnoreMouseEvents(true, { forward: true });
    } else {
      win2.setIgnoreMouseEvents(false);
    }
  });
}
app.commandLine.appendSwitch("ignore-certificate-errors");
app.whenReady().then(createWindow);
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
