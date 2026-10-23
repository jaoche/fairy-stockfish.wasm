//
// worker-hook.js（--post-js）：必须在生成代码之后运行。
// emsdk>=3 的 pthread worker 复用主脚本，glue 自己的 onmessage 不认识 'custom' 命令；
// 这里包一层：custom → Module.onCustomMessage（preamble 已定义 queue），其余放行。
//
if (typeof ENVIRONMENT_IS_PTHREAD !== 'undefined' && ENVIRONMENT_IS_PTHREAD) {
  const __prevWorkerOnMessage = self.onmessage;
  self.onmessage = function (e) {
    if (e && e.data && e.data['cmd'] === 'custom') {
      if (typeof Module['onCustomMessage'] === 'function') Module['onCustomMessage'](e.data['userData']);
      return;
    }
    if (__prevWorkerOnMessage) __prevWorkerOnMessage(e);
  };
}
