//
// Post custom message to all workers (including main worker)
//
Module["postCustomMessage"] = (data) => {
  // futex 移植：A 线程（模块 worker，事件循环空闲）直接调导出函数写入共享内存队列，
  // B（pthread main）的 js_getline 会被跨线程 futex 唤醒。不再广播 worker（B 阻塞中收不到）。
  const line = String(data);
  const bytes = Module['lengthBytesUTF8'](line) + 1;
  const ptr = Module['_malloc'](bytes);
  Module['stringToUTF8'](line, ptr, bytes);
  Module['_emscripten_utils_push_line'](ptr);
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

// PROXY_TO_PTHREAD 下 await Stockfish() 返回的是 pthread main（B）的 Module；
// stdout 代理在模块线程 A 执行，listener 必须注册在 A —— 这里把 A 暴露给宿主。
self.__emscriptenModuleRef = Module;
