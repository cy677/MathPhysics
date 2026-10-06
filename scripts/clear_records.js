/* Run in the browser at the MathPhysics site, not in a terminal. MIT. */
const isRecordKey = key => key === 'mathphysics.state.v1' ||
  key === 'mathphysics.spaceflight.v1' || key === 'mathphysics.question-bank.v1' ||
  key.startsWith('mathphysics.progress.v1.') ||
  key.startsWith('mathphysics.minesweeper.') || key.startsWith('mathphysics.sudoku.') ||
  key.startsWith('mathphysics.spatial.v1.');

export function recordKeys(storage = globalThis.localStorage) {
  const keys = [];
  for (let index = 0; index < storage.length; index++) {
    const key = storage.key(index);
    if (typeof key === 'string' && isRecordKey(key)) keys.push(key);
  }
  return keys;
}

export function clearRecords(storage = globalThis.localStorage) {
  // Snapshot the keys before removal so adjacent records cannot be skipped.
  const keys = recordKeys(storage);
  for (const key of keys) storage.removeItem(key);
  return keys.length;
}

const button = globalThis.document?.getElementById('clear-records');
if (button) {
  const status = document.getElementById('clear-status');
  document.getElementById('clear-site').textContent = location.origin === 'null' ? '本地文件' : location.origin;
  const show = (message, state) => {status.textContent = message;status.dataset.state = state;};
  if (!['http:', 'https:'].includes(location.protocol)) {
    show('请先启动网站，再从网站地址打开此页面。直接打开文件无法清除网站的记录。', 'error');
  } else {
    try {
      const count = recordKeys(window.localStorage).length;
      show(count ? `发现 ${count} 组记录数据。点击按钮后清除。` : '当前站点没有学习记录。', count ? 'ready' : 'empty');
      button.disabled = count === 0;
    } catch {
      show('浏览器不允许读取存储，请检查存储权限后重新打开此页面。', 'error');
    }
  }
  button.onclick = () => {
    try {
      const count = clearRecords(window.localStorage);
      show(count ? `已清除 ${count} 组记录数据。返回科学小岛即可重新开始。` : '当前站点没有学习记录。', 'success');
      button.disabled = true;
    } catch {
      show('未能完全清除记录，请检查浏览器的存储权限后重试。', 'error');
    }
  };
}
