import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electron', {
  ipcRenderer: {
    invoke: (channel: string, ...args: any[]) => ipcRenderer.invoke(channel, ...args),
    send: (channel: string, ...args: any[]) => ipcRenderer.send(channel, ...args),
    on: (channel: string, func: any) => ipcRenderer.on(channel, (event, ...args) => func(...args)),
    once: (channel: string, func: any) => ipcRenderer.once(channel, (event, ...args) => func(...args)),
  },
});

export {};
