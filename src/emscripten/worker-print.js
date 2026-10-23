//
// worker-print.js（--post-js，pthread worker 侧）：out/err 在脚本求值期就绑定 console
// （那时 print listeners 还没注册），这里重绑为走 Module.print → 适配器 listener。
// 注意：必须在同一闭包内重赋值（minify_js=no 保证名字不被改）。
//
if (typeof ENVIRONMENT_IS_PTHREAD !== 'undefined' && ENVIRONMENT_IS_PTHREAD) {
  out = (text) => { if (Module['print']) Module['print'](String(text)); };
  err = (text) => { if (Module['printErr']) Module['printErr'](String(text)); };
}
