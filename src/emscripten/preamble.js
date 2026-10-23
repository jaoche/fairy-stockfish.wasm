//
// Post custom message to all workers (including main worker)
//
Module["postCustomMessage"] = (data) => {
  // futex 移植：模块线程 A（事件循环空闲）直调导出函数写共享内存队列，
  // pthread main 的 getline 跨线程 futex 唤醒。广播给阻塞线程 = 自死锁，不可用。
  const line = String(data);
  const bytes = Module['lengthBytesUTF8'](line) + 1;
  const ptr = Module['_malloc'](bytes);
  Module['stringToUTF8'](line, ptr, bytes);
  Module['_emscripten_utils_push_line'](ptr);
};
  post();
};

//
// Simple queue with async get (assume single consumer)
//
class Queue {
  constructor() {
    this.getter = null;
    this.list = [];
  }
  async get() {
    if (this.list.length > 0) {
      return this.list.shift();
    }
    return await new Promise((resolve) => (this.getter = resolve));
  }
  put(x) {
    if (this.getter) {
      this.getter(x);
      this.getter = null;
      return;
    }
    this.list.push(x);
  }
}

//
// TODO: This is used only by main worker
//
Module["queue"] = new Queue();

Module["onCustomMessage"] = (data) => {
  Module["queue"].put(data);
};

//
// API
//

// Align to the same API as niklasf's stockfish
Module["postMessage"] = Module["postCustomMessage"];

const listeners = [];

Module["addMessageListener"] = (listener) => {
  listeners.push(listener);
};

Module["removeMessageListener"] = (listener) => {
  const i = listeners.indexOf(listener);
  if (i >= 0) {
    listeners.splice(i, 1);
  }
};

Module["print"] = Module["printErr"] = (data) => {
  if (listeners.length === 0) {
    console.log(data);
    return;
  }
  for (let listener of listeners) {
    listener(data);
  }
};

Module["terminate"] = () => {
  PThread.terminateAllThreads();
};

//
// WORKER_CUSTOM_HOOK（emsdk>=3 不再产出独立 stockfish.worker.js）：
// 在 pthread worker 侧接管 custom 消息（原来由 worker-postamble.js 注入）
//
if (typeof ENVIRONMENT_IS_PTHREAD !== 'undefined' && ENVIRONMENT_IS_PTHREAD) {
  const __prevOnMessage = self.onmessage;
  self.onmessage = function (e) {
    if (e && e.data && e.data.cmd === 'custom') {
      if (typeof Module['onCustomMessage'] === 'function') Module['onCustomMessage'](e.data.userData);
      return;
    }
    if (__prevOnMessage) __prevOnMessage(e);
  };
}
