//
// futex 版 worker hook（--post-js）：custom 消息 → 写入 wasm 堆 → 调导出 push_line
//
if (typeof ENVIRONMENT_IS_PTHREAD !== 'undefined' && ENVIRONMENT_IS_PTHREAD) {
  const __prevOnMessage = self.onmessage;
  self.onmessage = function (e) {
    if (e && e.data && e.data.cmd === 'custom') {
      const line = e.data.userData;
      if (typeof line === 'string' && Module['_malloc'] && Module['stringToUTF8']) {
        const bytes = Module['lengthBytesUTF8'](line) + 1;
        const ptr = Module['_malloc'](bytes);
        Module['stringToUTF8'](line, ptr, bytes);
        Module['_emscripten_utils_push_line'](ptr);
      }
      return;
    }
    if (__prevOnMessage) __prevOnMessage(e);
  };
}
