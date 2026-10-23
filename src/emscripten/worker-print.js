//
// worker-print.js（--post-js，仅 pthread worker 侧）：
// emsdk>=3 的 pthread stdout 在 B 自身 print（listeners 空 → console fallback），
// 这里改为 postMessage 回模块线程 A，由 fs-engine-worker 转发给适配器 listener。
//
if (typeof ENVIRONMENT_IS_PTHREAD !== 'undefined' && ENVIRONMENT_IS_PTHREAD) {
  Module['print'] = (line) => self.postMessage({ cmd: '__print', line: String(line) });
}
