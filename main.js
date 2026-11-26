const { app, BrowserWindow, shell, ipcMain, safeStorage } = require('electron');
const fs = require('fs');
const path = require('path');

const tokenFile = () => path.join(app.getPath('userData'), 'jira-token.bin');
ipcMain.handle('jira:setToken', (_, token) => fs.writeFileSync(tokenFile(), safeStorage.encryptString(token)));
ipcMain.handle('jira:hasToken', () => fs.existsSync(tokenFile()));
// Jira is called from here, not the page: the page would hit CORS and would have to hold the token
ipcMain.handle('jira:search', async (_, origin, email, jql) => {
  if (!/^https:\/\/[^/]+$/.test(origin)) throw new Error(`Μη έγκυρο Jira origin: ${origin}`);
  const token = safeStorage.decryptString(fs.readFileSync(tokenFile()));
  // ponytail: first page only (100 issues); follow nextPageToken if the JQL ever matches more
  const res = await fetch(origin + '/rest/api/3/search/jql', {
    method: 'POST',
    headers: {
      Authorization: 'Basic ' + Buffer.from(`${email}:${token}`).toString('base64'),
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({ jql, fields: ['summary'], maxResults: 100 }),
  });
  if (!res.ok) throw new Error(`Jira ${res.status}: ${(await res.text()).slice(0, 200)}`);
  return (await res.json()).issues.map(i => ({ key: i.key, summary: i.fields.summary }));
});

app.whenReady().then(() => {
  const win = new BrowserWindow({ width: 1400, height: 900, autoHideMenuBar: true, webPreferences: { preload: path.join(__dirname, 'preload.js') } });
  // links (e.g. Jira) open in the system browser instead of a new Electron window
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('https://')) shell.openExternal(url);
    return { action: 'deny' };
  });
  win.loadFile('index.html');
});
app.on('window-all-closed', () => app.quit());
