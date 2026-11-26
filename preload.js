const { contextBridge, ipcRenderer } = require('electron');

// the Jira API token lives only in main.js (encrypted on disk); the page can set it but never read it back
contextBridge.exposeInMainWorld('jira', {
  setToken: token => ipcRenderer.invoke('jira:setToken', token),
  hasToken: () => ipcRenderer.invoke('jira:hasToken'),
  search: (origin, email, jql) => ipcRenderer.invoke('jira:search', origin, email, jql),
});
