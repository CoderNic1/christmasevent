// Shared singleton so modules can talk without circular imports. Filled by main.js.
export const ctx = { store: null, L: null, radio: null, boards: { build: [], gems: [] }, login: null, afterChange: null };
