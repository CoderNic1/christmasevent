// ─────────────────────────────────────────────────────────────────────────────
// DISCORD LOGIN – PLACEHOLDER (for testing). Opens a fake "Authorize" dialog and
// returns a fake Discord profile. The rest of the app only relies on this shape:
//   { id: 'discord:<snowflake>', name: 'username', color: '#5865f2' }
// For production: Firebase mode uses CONFIG.discordAuthUrl + a Cloud Function
// (see README) and this file is no longer used. Nothing else has to change.
// ─────────────────────────────────────────────────────────────────────────────
const hash = s => [...s].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7);
export function discordLogin() {
  return new Promise(resolve => {
    const d = document.getElementById('dlg'), inp = d.querySelector('input');
    inp.value = ''; d.showModal(); inp.focus();
    d.onclose = () => {
      const name = inp.value.trim().slice(0, 24);
      if (d.returnValue !== 'ok' || !name) return resolve(null);
      const h = hash(name.toLowerCase());
      resolve({ id: 'discord:' + (100000000000000000n + BigInt(h)).toString(), name, color: `hsl(${h % 360} 60% 50%)` });
    };
  });
}
