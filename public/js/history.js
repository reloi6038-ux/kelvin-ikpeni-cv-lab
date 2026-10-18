// Bounded undo/redo stack for resume state snapshots.
// Each snapshot is a plain JSON-serializable object. Only pushes a snapshot
// if it differs from the current top — so rapid keystrokes coalesce when they
// produce identical state, and the caller controls cadence via `push`.

const MAX_STACK = 50;

export function createHistory(initialState) {
  const stack = [clone(initialState)];
  let cursor = 0;

  function clone(v) {
    return v == null ? v : JSON.parse(JSON.stringify(v));
  }

  function equal(a, b) {
    return JSON.stringify(a) === JSON.stringify(b);
  }

  function push(next) {
    if (equal(stack[cursor], next)) return false;
    // Truncate redo history when a new branch is created.
    stack.length = cursor + 1;
    stack.push(clone(next));
    if (stack.length > MAX_STACK) stack.shift();
    cursor = stack.length - 1;
    return true;
  }

  function undo() {
    if (cursor === 0) return null;
    cursor -= 1;
    return clone(stack[cursor]);
  }

  function redo() {
    if (cursor >= stack.length - 1) return null;
    cursor += 1;
    return clone(stack[cursor]);
  }

  function canUndo() { return cursor > 0; }
  function canRedo() { return cursor < stack.length - 1; }
  function current() { return clone(stack[cursor]); }

  return { push, undo, redo, canUndo, canRedo, current };
}