'use strict';

const body = document.body;
const textarea = document.getElementById('textAreaUser');
const mainBtn = document.getElementById('mainBtn');
const mainBtnText = document.getElementById('mainBtnText');
const switchBtn = document.getElementById('switchBtn');
const copyBtn = document.getElementById('copyBtn');
const copyBtnText = document.getElementById('copyBtnText');
const copyHint = document.getElementById('copyHint');
const output = document.getElementById('outputMessage');
const emptyState = document.getElementById('emptyState');
const resultState = document.getElementById('resultState');
const counter = document.getElementById('counter');
const toast = document.getElementById('toast');

// Cipher keys. An uppercase vowel becomes a capitalised key ("Olá" -> "Oberlá"),
// or a fully uppercase key inside all-caps words ("OLÁ" -> "OBERLÁ").
// Everything else (accents, digits, symbols, emoji) passes through untouched.
const KEYS = { a: 'ai', e: 'enter', i: 'imes', o: 'ober', u: 'ufat' };

const DECRYPT_MAP = {};
for (const [vowel, key] of Object.entries(KEYS)) {
  const upper = vowel.toUpperCase();
  DECRYPT_MAP[key] = vowel;
  DECRYPT_MAP[key[0].toUpperCase() + key.slice(1)] = upper;
  DECRYPT_MAP[key.toUpperCase()] = upper;
}

// Single left-to-right pass, so keys that contain other vowels
// ("enter", "ober", "ufat") are never decoded twice.
const DECRYPT_RE = new RegExp(Object.keys(DECRYPT_MAP).join('|'), 'g');

const isUpperLetter = (c) => !!c && c !== c.toLowerCase();
const isLetter = (c) => !!c && c.toLowerCase() !== c.toUpperCase();

function encrypt(text) {
  return text.replace(/[aeiouAEIOU]/g, (v, i, str) => {
    const key = KEYS[v.toLowerCase()];
    if (v === v.toLowerCase()) return key;
    const prev = str[i - 1];
    const next = str[i + 1];
    const allCaps = isUpperLetter(next) || (!isLetter(next) && isUpperLetter(prev));
    return allCaps ? key.toUpperCase() : key[0].toUpperCase() + key.slice(1);
  });
}

function decrypt(text) {
  return text.replace(DECRYPT_RE, (k) => DECRYPT_MAP[k]);
}

// Mode handling: only one action button is visible at a time

let mode = 'encrypt';
let result = '';

function setMode(next) {
  mode = next;
  body.dataset.mode = next;
  const isEncrypt = next === 'encrypt';
  mainBtnText.textContent = isEncrypt ? 'Encrypt it' : 'Decrypt it';
  textarea.placeholder = isEncrypt ? 'Type your message here…' : 'Paste the encrypted message here…';
  switchBtn.innerHTML = isEncrypt
    ? 'Have an encrypted message? <u>Decrypt instead</u>'
    : 'Want to write a new message? <u>Encrypt instead</u>';
}

function updateCounter() {
  const n = textarea.value.length;
  counter.textContent = `${n} char${n === 1 ? '' : 's'}`;
  mainBtn.disabled = n === 0;
}

// Scramble the output for a short moment before revealing the real text

const GLYPHS = 'aeiouAEIOU#%&*+=?@$<>/\\';
let scrambleTimer = null;

function reveal(text) {
  clearInterval(scrambleTimer);
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduced || text.length > 600) {
    output.textContent = text;
    return;
  }
  const total = 18;
  let frame = 0;
  scrambleTimer = setInterval(() => {
    frame++;
    const settled = Math.floor((frame / total) * text.length);
    let shown = text.slice(0, settled);
    for (let i = settled; i < text.length; i++) {
      const c = text[i];
      shown += /\s/.test(c) ? c : GLYPHS[(Math.random() * GLYPHS.length) | 0];
    }
    output.textContent = shown;
    if (frame >= total) {
      clearInterval(scrambleTimer);
      output.textContent = text;
    }
  }, 28);
}

function showResult(text) {
  result = text;
  emptyState.hidden = true;
  emptyState.style.display = 'none';
  resultState.hidden = false;
  copyBtn.classList.remove('done');
  copyBtnText.textContent = 'Copy';
  copyHint.textContent =
    mode === 'encrypt'
      ? 'Copying also puts it back in the box, ready to decrypt.'
      : 'Copying also puts it back in the box, ready to encrypt again.';
  reveal(text);
}

function run() {
  const text = textarea.value;
  if (!text) return;
  showResult(mode === 'encrypt' ? encrypt(text) : decrypt(text));
}

let toastTimer = null;
function showToast(msg) {
  toast.textContent = msg;
  toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('show'), 2400);
}

async function copyResult() {
  if (!result) return;
  try {
    await navigator.clipboard.writeText(result);
  } catch (err) {
    // Clipboard API can fail on insecure origins; fall back to execCommand
    const tmp = document.createElement('textarea');
    tmp.value = result;
    document.body.appendChild(tmp);
    tmp.select();
    document.execCommand('copy');
    tmp.remove();
  }

  // Put the copied text back into the input and flip the mode
  const wasEncrypt = mode === 'encrypt';
  textarea.value = result;
  setMode(wasEncrypt ? 'decrypt' : 'encrypt');
  updateCounter();
  textarea.classList.remove('flash');
  void textarea.offsetWidth;
  textarea.classList.add('flash');

  copyBtn.classList.add('done');
  copyBtnText.textContent = 'Copied';
  showToast(wasEncrypt ? 'Copied. It is back in the box, ready to decrypt.' : 'Copied to clipboard.');
}

// Events

mainBtn.addEventListener('click', run);
copyBtn.addEventListener('click', copyResult);
switchBtn.addEventListener('click', () => {
  setMode(mode === 'encrypt' ? 'decrypt' : 'encrypt');
  textarea.focus();
});
textarea.addEventListener('input', updateCounter);
textarea.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
    e.preventDefault();
    run();
  }
});

// Title word scrambles once on load
const titleWord = document.querySelector('.scramble');
if (titleWord && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
  const finalWord = titleWord.dataset.final;
  let f = 0;
  const t = setInterval(() => {
    f++;
    const settled = Math.floor((f / 22) * finalWord.length);
    titleWord.textContent =
      finalWord.slice(0, settled) +
      Array.from(finalWord.slice(settled), () => GLYPHS[(Math.random() * GLYPHS.length) | 0]).join('');
    if (f >= 22) {
      clearInterval(t);
      titleWord.textContent = finalWord;
    }
  }, 45);
}

// Show Ctrl instead of ⌘ outside macOS
if (!/Mac|iPhone|iPad/.test(navigator.platform)) {
  document.querySelector('.btn-main kbd').textContent = 'Ctrl ↵';
}

setMode('encrypt');
updateCounter();
