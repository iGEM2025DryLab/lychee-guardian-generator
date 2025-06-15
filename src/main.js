const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      enableRemoteModule: true,
      // 允许访问媒体设备
      webSecurity: false
    },
    titleBarStyle: 'hiddenInset',
    show: false
  });

  // 处理媒体权限请求
  mainWindow.webContents.session.setPermissionRequestHandler((webContents, permission, callback) => {
    if (permission === 'media') {
      // 自动授予媒体权限（摄像头和麦克风）
      callback(true);
    } else {
      callback(false);
    }
  });

  mainWindow.loadFile('src/index.html');

  // 开发模式下打开开发者工具
  if (process.argv.includes('--dev')) {
    mainWindow.webContents.openDevTools();
  }

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// IPC处理程序
ipcMain.handle('select-image', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile'],
    filters: [
      {
        name: '图片文件',
        extensions: ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp']
      }
    ]
  });

  if (!result.canceled && result.filePaths.length > 0) {
    const filePath = result.filePaths[0];
    const imageData = fs.readFileSync(filePath);
    return {
      path: filePath,
      data: imageData.toString('base64'),
      name: path.basename(filePath)
    };
  }
  return null;
});

ipcMain.handle('save-image', async (event, imageData, suggestedName) => {
  const result = await dialog.showSaveDialog(mainWindow, {
    defaultPath: suggestedName || 'lychee-avatar.png',
    filters: [
      {
        name: '图片文件',
        extensions: ['png', 'jpg', 'jpeg']
      }
    ]
  });

  if (!result.canceled) {
    try {
      // 移除data URL前缀
      const base64Data = imageData.replace(/^data:image\/[a-z]+;base64,/, '');
      fs.writeFileSync(result.filePath, base64Data, 'base64');
      return { success: true, path: result.filePath };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
  return { success: false, error: '用户取消保存' };
});
