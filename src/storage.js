// Adaptador local de demostración. Sustituir por un repositorio Firestore en el futuro.
const KEY = 'forja.demo.v1';
export function readDemo() { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch { return {}; } }
export function saveDemo(value) { try { localStorage.setItem(KEY, JSON.stringify(value)); return true; } catch { return false; } }
export function resetDemo() { try { localStorage.removeItem(KEY); return true; } catch { return false; } }
