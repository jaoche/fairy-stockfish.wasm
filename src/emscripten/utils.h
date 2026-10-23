#include <emscripten.h>
#include <emscripten/threading.h>
#include <atomic>
#include <cstdlib>
#include <deque>
#include <mutex>
#include <string>

// 2026-10-23 去 Asyncify 改造：UCI 命令经 custom 消息 → JS 调导出 push_line 写入堆 →
// C++ 队列 + futex 原生阻塞（pthread worker 内 Atomics.wait 合法），替代 Asyncify 挂起。
extern "C" {

static std::deque<char*> futexLineQ;
static std::mutex futexLineMtx;
static std::atomic<uint32_t> futexLineFlag(0);

EMSCRIPTEN_KEEPALIVE void emscripten_utils_push_line(char* ptr) {
  {
    std::lock_guard<std::mutex> g(futexLineMtx);
    futexLineQ.push_back(ptr);
  }
  futexLineFlag.store(1);
  emscripten_futex_wake((void*)&futexLineFlag, 1000000);
}

}

static const char* emscripten_utils_getline_impl() {
  static std::string cur;
  for (;;) {
    char* out = nullptr;
    {
      std::lock_guard<std::mutex> g(futexLineMtx);
      if (!futexLineQ.empty()) { out = futexLineQ.front(); futexLineQ.pop_front(); }
    }
    if (out) { cur = out; std::free((void*)out); return cur.c_str(); }
    futexLineFlag.store(0);
    {
      std::lock_guard<std::mutex> g(futexLineMtx);
      if (!futexLineQ.empty()) continue; // 双检防唤醒竞态
    }
    emscripten_futex_wait((void*)&futexLineFlag, 0, -1); // 无限期阻塞，唤醒靠 push
  }
}

void emscripten_utils_getline(std::string& result) {
  const char* ptr = emscripten_utils_getline_impl();
  result = ptr;
}
