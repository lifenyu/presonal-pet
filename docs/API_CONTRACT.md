# IPC 通信契约

## 通信模式

渲染进程通过 `window.electronAPI` 调用主进程方法。
所有 IPC 通道在 `src/shared/types.ts` 中定义常量。

## V0 通道

### `app:getVersion`
- **方向**: Renderer → Main
- **请求**: 无参数
- **响应**: `string` (应用版本号)

### `app:quit`
- **方向**: Renderer → Main
- **请求**: 无参数
- **响应**: `void`

### `window:toggleSettings`
- **方向**: Renderer → Main
- **请求**: `{ visible: boolean }`
- **响应**: `void`
- **说明**: 通知主进程设置页的显示状态变化（用于调整窗口大小等）

## 预留通道（V1+）

### `db:getUsageStats`
- **方向**: Renderer → Main
- **请求**: `{ date: string }`
- **响应**: `UsageRecord[]`

### `monitor:getCurrentApp`
- **方向**: Renderer → Main
- **请求**: 无参数
- **响应**: `{ appName: string, title: string, duration: number }`

### `ai:chat`
- **方向**: Renderer → Main
- **请求**: `{ message: string, history?: Message[] }`
- **响应**: `{ reply: string }`
