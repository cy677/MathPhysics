/* Local completion checkpoints shared by hosted and standalone classrooms. MIT. */
(() => {
  'use strict';
  const prefix = 'mathphysics.progress.v1.';
  const object = value => value && typeof value === 'object' && !Array.isArray(value);
  const copy = value => JSON.parse(JSON.stringify(value));

  function create(activityId, levelIds, status) {
    const allowed = new Set(levelIds);
    const key = prefix + activityId;
    const storage = window.MathPhysicsSync?.createStorage() || window.localStorage;
    let current = null, failed = false;
    function normalize(input) {
      const result = {schemaVersion: 1, completed: {}, checkpoint: null};
      if (!object(input) || input.schemaVersion !== 1) return result;
      if (object(input.completed)) {
        for (const id of allowed) {
          const time = input.completed[id];
          if (Number.isFinite(time) && time > 0) result.completed[id] = time;
        }
      }
      if (object(input.checkpoint) && allowed.has(input.checkpoint.levelId)) {
        result.checkpoint = copy(input.checkpoint);
      }
      return result;
    }
    function read() {
      try { return normalize(JSON.parse(storage.getItem(key))); }
      catch { return normalize(null); }
    }
    let state = read();
    function show(levelId = current) {
      current = levelId;
      if (status) {
        status.dataset.saved = String(!failed);
        status.textContent = `已完成 ${Object.keys(state.completed).length} / ${allowed.size}` +
          (state.completed[current] ? ' · 本关已完成' : '') +
          (failed ? ' · 浏览器未能保存，进度仅在本页有效' : state.checkpoint ? ' · 演示练习已存档（0分）' : ' · 演示完成后存档（0分）');
      }
    }
    function write() {
      try { storage.setItem(key, JSON.stringify(state)); failed = false; }
      catch { failed = true; }
      show();
      return !failed;
    }
    const api = {
      has: id => Object.hasOwn(state.completed, id),
      resume: () => state.checkpoint ? copy(state.checkpoint) : null,
      snapshot: () => copy(state),
      show,
      complete(id, details = {}) {
        if (!allowed.has(id)) return false;
        // Merge another tab's completions before saving this checkpoint.
        const disk = read();
        state.completed = {...disk.completed, ...state.completed};
        if (!api.has(id)) state.completed[id] = Date.now();
        state.checkpoint = {...copy(details), levelId: id};
        current = id;
        return write();
      },
      importCompleted(ids) {
        const disk = read();
        state.completed = {...disk.completed, ...state.completed};
        let changed = false;
        for (const id of ids) {
          if (allowed.has(id) && !api.has(id)) { state.completed[id] = Date.now(); changed = true; }
        }
        if (changed) write();
      }
    };
    window.addEventListener('storage', event => {
      if (event.key !== key) return;
      const disk = read();
      state.completed = {...state.completed, ...disk.completed};
      show();
    });
    show();
    return api;
  }
  window.MathPhysicsProgress = {create};
})();
