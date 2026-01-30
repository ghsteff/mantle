import { app, BrowserWindow } from "electron";
import path from "node:path";
import started from "electron-squirrel-startup";
import { getConfigManager, getProcessManager } from "./kanata";
import { registerIpcHandlers, setupProcessEventForwarding } from "./ipc";

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (started) {
  app.quit();
}

let mainWindow: BrowserWindow | null = null;

const createWindow = () => {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    titleBarStyle: "hiddenInset",
    trafficLightPosition: { x: 12, y: 15 },
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
    },
  });

  // Set up event forwarding from Kanata process to this window
  setupProcessEventForwarding(mainWindow);

  // and load the index.html of the app.
  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL);
  } else {
    mainWindow.loadFile(
      path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`)
    );
  }

  // Open DevTools only in development (not when packaged)
  if (!app.isPackaged) {
    mainWindow.webContents.openDevTools();
  }

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
};

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on("ready", () => {
  // Register IPC handlers before creating windows
  registerIpcHandlers();

  // Initialize the config manager and ensure default config exists
  const configManager = getConfigManager();
  configManager.loadOrCreateDefault();

  createWindow();
});

// On macOS, keep the app running when all windows are closed.
// User quits explicitly with Cmd + Q.
// eslint-disable-next-line @typescript-eslint/no-empty-function
app.on("window-all-closed", () => {});

app.on("activate", () => {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// Cleanup Kanata process before quitting
app.on("before-quit", async () => {
  const processManager = getProcessManager();
  await processManager.cleanup();
});
