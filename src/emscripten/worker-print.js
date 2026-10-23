//
// worker-print.js（--post-js，模块线程 A 侧）：
// emsdk 3.1.74 的 out/err 在求值期绑死 defaultPrint（console），且 fd_write 从 B 代理到 A 执行——
// 所以只需在 A 把 out/err 重绑为「惰性分发到 Module.print/printErr」：
// 适配器的 addMessageListener 在 await 之后才注册，惰性分发保证时序正确。
//
if (typeof ENVIRONMENT_IS_PTHREAD === 'undefined' || !ENVIRONMENT_IS_PTHREAD) {
  out = (text) => { if (Module['print']) Module['print'](String(text)); };
  err = (text) => { if (Module['printErr']) Module['printErr'](String(text)); };
}
