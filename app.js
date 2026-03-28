/* ============================================================
   CareConnect – Main Application Script
   ============================================================ */

'use strict';

// ── Constants ────────────────────────────────────────────────
const STORAGE_CONTACTS  = 'careconnect_contacts';
const STORAGE_FONTSIZE  = 'careconnect_fontsize';
const STORAGE_CONTRAST  = 'careconnect_contrast';

const FONT_CLASSES = ['', 'font-large', 'font-xl'];
const FONT_LABELS  = ['Normal', 'Large', 'Extra Large'];

const HEALTH_TIPS = [
  'Stay hydrated — aim for 6 to 8 glasses of water a day to keep your body and mind feeling their best.',
  'A short 10-minute walk each day can boost your mood, strengthen your heart, and improve balance.',
  'Eating a variety of colourful fruits and vegetables helps provide the vitamins your body needs.',
  'Getting 7 to 8 hours of sleep each night helps your body recover and keeps your memory sharp.',
  'Staying connected with friends and family is one of the best things you can do for your mental health.',
  'Check your medicine cabinet regularly — dispose of out-of-date medicines safely at your local pharmacy.',
  'A daily gentle stretch, even in your chair, can help reduce stiffness and improve flexibility.',
  'Protect your hearing — if the TV volume needs to be very high, consider asking your GP about a hearing check.',
  'Sunlight helps your body make vitamin D. Try to spend a little time outdoors each day when weather permits.',
  'Keep your home safe — remove loose rugs and ensure hallways are well lit to help prevent falls.',
  'Keep your mind active — puzzles, reading, and learning something new are great for brain health.',
  'If you are feeling low or anxious, please talk to someone. Your GP, a friend, or Samaritans (116 123) can help.',
  'Eat regular meals and try not to skip breakfast — it helps maintain your energy and concentration.',
  'Check your blood pressure regularly. Many pharmacies offer free checks without an appointment.'
];

// ── State ─────────────────────────────────────────────────────
let fontSizeIndex = 0;
let pendingDeleteId = null;
let editingContactId = null;
let lastFocusedElement = null;

// ── DOM References ────────────────────────────────────────────
const body            = document.body;
const fontToggleBtn   = document.getElementById('font-toggle');
const contrastBtn     = document.getElementById('contrast-toggle');
const searchForm      = document.getElementById('search-form');
const searchInput     = document.getElementById('search-input');
const contactsList    = document.getElementById('contacts-list');
const noContactsMsg   = document.getElementById('no-contacts-msg');
const openModalBtn    = document.getElementById('open-modal-btn');
const contactModal    = document.getElementById('contact-modal');
const modalTitle      = document.getElementById('modal-title');
const contactForm     = document.getElementById('contact-form');
const contactIdField  = document.getElementById('contact-id');
const contactName     = document.getElementById('contact-name');
const contactRelField = document.getElementById('contact-relationship');
const contactPhone    = document.getElementById('contact-phone');
const contactEmail    = document.getElementById('contact-email');
const saveContactBtn  = document.getElementById('save-contact-btn');
const closeModalBtn   = document.getElementById('close-modal-btn');
const dailyTipEl      = document.getElementById('daily-tip');
const deleteModal     = document.getElementById('delete-modal');
const confirmDeleteBtn = document.getElementById('confirm-delete-btn');
const cancelDeleteBtn  = document.getElementById('cancel-delete-btn');

// ── Initialise ────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  restorePreferences();
  renderContacts();
  renderDailyTip();
  bindEvents();
  initWordle();
});

// ── Preferences ───────────────────────────────────────────────
function restorePreferences() {
  const savedFont = localStorage.getItem(STORAGE_FONTSIZE);
  if (savedFont !== null) {
    fontSizeIndex = parseInt(savedFont, 10) || 0;
    applyFontSize();
  }

  const savedContrast = localStorage.getItem(STORAGE_CONTRAST);
  if (savedContrast === 'true') {
    body.classList.add('high-contrast');
    contrastBtn.setAttribute('aria-pressed', 'true');
  }
}

function applyFontSize() {
  FONT_CLASSES.forEach(cls => { if (cls) body.classList.remove(cls); });
  if (FONT_CLASSES[fontSizeIndex]) {
    body.classList.add(FONT_CLASSES[fontSizeIndex]);
  }
  fontToggleBtn.setAttribute(
    'aria-label',
    `Change text size (currently ${FONT_LABELS[fontSizeIndex]})`
  );
}

// ── Event Bindings ────────────────────────────────────────────
function bindEvents() {
  // Font size toggle
  fontToggleBtn.addEventListener('click', () => {
    fontSizeIndex = (fontSizeIndex + 1) % FONT_CLASSES.length;
    applyFontSize();
    localStorage.setItem(STORAGE_FONTSIZE, fontSizeIndex);
  });

  // High contrast toggle
  contrastBtn.addEventListener('click', () => {
    const isOn = body.classList.toggle('high-contrast');
    contrastBtn.setAttribute('aria-pressed', isOn ? 'true' : 'false');
    localStorage.setItem(STORAGE_CONTRAST, isOn);
  });

  // Search form
  searchForm.addEventListener('submit', handleSearch);

  // Open add-contact modal
  openModalBtn.addEventListener('click', () => openModal(null));

  // Close modal via cancel button
  closeModalBtn.addEventListener('click', closeModal);

  // Save contact form submit
  contactForm.addEventListener('submit', handleSaveContact);

  // Delete confirm buttons
  confirmDeleteBtn.addEventListener('click', () => {
    if (pendingDeleteId !== null) {
      deleteContact(pendingDeleteId);
    }
    closeDeleteModal();
  });
  cancelDeleteBtn.addEventListener('click', closeDeleteModal);

  // Close modals on overlay click
  contactModal.addEventListener('click', (e) => {
    if (e.target === contactModal) closeModal();
  });
  deleteModal.addEventListener('click', (e) => {
    if (e.target === deleteModal) closeDeleteModal();
  });

  // Keyboard: Escape closes any open modal
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      if (!contactModal.hidden) closeModal();
      if (!deleteModal.hidden) closeDeleteModal();
    }
  });
}

// ── Search ────────────────────────────────────────────────────
function handleSearch(e) {
  e.preventDefault();
  const query = searchInput.value.trim();
  if (!query) {
    searchInput.focus();
    return;
  }
  const url = 'https://www.google.com/search?q=' + encodeURIComponent(query);
  window.open(url, '_blank', 'noopener,noreferrer');
}

// ── Contacts: Storage ─────────────────────────────────────────
function getContacts() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_CONTACTS) || '[]');
  } catch {
    return [];
  }
}

function setContacts(contacts) {
  localStorage.setItem(STORAGE_CONTACTS, JSON.stringify(contacts));
}

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

// ── Contacts: Render ──────────────────────────────────────────
function renderContacts() {
  const contacts = getContacts();
  contactsList.innerHTML = '';

  if (contacts.length === 0) {
    noContactsMsg.classList.add('visible');
    return;
  }

  noContactsMsg.classList.remove('visible');

  contacts.forEach(contact => {
    const card = createContactCard(contact);
    contactsList.appendChild(card);
  });
}

function createContactCard(contact) {
  const card = document.createElement('div');
  card.className = 'contact-card';
  card.setAttribute('role', 'listitem');
  card.dataset.id = contact.id;

  const nameEl = document.createElement('div');
  nameEl.className = 'contact-name';
  nameEl.textContent = contact.name;
  card.appendChild(nameEl);

  if (contact.relationship) {
    const relEl = document.createElement('div');
    relEl.className = 'contact-relationship';
    relEl.textContent = contact.relationship;
    card.appendChild(relEl);
  }

  // Primary action buttons
  const actions = document.createElement('div');
  actions.className = 'contact-actions';

  if (contact.phone) {
    const callBtn = document.createElement('a');
    callBtn.href = 'tel:' + sanitisePhone(contact.phone);
    callBtn.className = 'btn btn-call';
    callBtn.setAttribute('aria-label', `Call ${contact.name}`);
    callBtn.textContent = '📞 Call';
    actions.appendChild(callBtn);

    const waBtn = document.createElement('a');
    waBtn.href = buildWhatsAppLink(contact.phone);
    waBtn.target = '_blank';
    waBtn.rel = 'noopener noreferrer';
    waBtn.className = 'btn btn-secondary';
    waBtn.setAttribute('aria-label', `WhatsApp ${contact.name} (opens in new tab)`);
    waBtn.textContent = '💬 WhatsApp';
    actions.appendChild(waBtn);
  }

  if (contact.email) {
    const emailBtn = document.createElement('a');
    emailBtn.href = 'mailto:' + contact.email;
    emailBtn.className = 'btn btn-secondary';
    emailBtn.setAttribute('aria-label', `Email ${contact.name}`);
    emailBtn.textContent = '✉ Email';
    actions.appendChild(emailBtn);
  }

  if (actions.children.length > 0) {
    card.appendChild(actions);
  }

  // Edit / Delete
  const metaActions = document.createElement('div');
  metaActions.className = 'contact-meta-actions';

  const editBtn = document.createElement('button');
  editBtn.className = 'btn-icon';
  editBtn.textContent = '✏ Edit';
  editBtn.setAttribute('aria-label', `Edit contact ${contact.name}`);
  editBtn.addEventListener('click', () => openModal(contact.id));
  metaActions.appendChild(editBtn);

  const deleteBtn = document.createElement('button');
  deleteBtn.className = 'btn-icon btn-icon-delete';
  deleteBtn.textContent = '✕ Remove';
  deleteBtn.setAttribute('aria-label', `Remove contact ${contact.name}`);
  deleteBtn.addEventListener('click', () => openDeleteModal(contact.id));
  metaActions.appendChild(deleteBtn);

  card.appendChild(metaActions);
  return card;
}

function sanitisePhone(phone) {
  // Remove spaces and non-digit chars except leading +
  return phone.replace(/\s+/g, '').replace(/[^\d+]/g, '');
}

function buildWhatsAppLink(phone) {
  let digits = phone.replace(/\s+/g, '').replace(/[^\d+]/g, '');
  // Convert UK 07... to 447...
  if (digits.startsWith('0')) {
    digits = '44' + digits.slice(1);
  } else if (digits.startsWith('+')) {
    digits = digits.slice(1);
  }
  return 'https://wa.me/' + digits;
}

// ── Contact Modal ─────────────────────────────────────────────
function openModal(contactId) {
  lastFocusedElement = document.activeElement;
  editingContactId = contactId;
  clearFormErrors();

  if (contactId) {
    const contacts = getContacts();
    const contact = contacts.find(c => c.id === contactId);
    if (!contact) return;
    modalTitle.textContent = 'Edit Contact';
    saveContactBtn.textContent = 'Save Changes';
    contactIdField.value = contact.id;
    contactName.value = contact.name;
    contactRelField.value = contact.relationship || '';
    contactPhone.value = contact.phone || '';
    contactEmail.value = contact.email || '';
  } else {
    modalTitle.textContent = 'Add Contact';
    saveContactBtn.textContent = 'Save Contact';
    contactForm.reset();
    contactIdField.value = '';
  }

  contactModal.hidden = false;
  trapFocus(contactModal);
  contactName.focus();
}

function closeModal() {
  contactModal.hidden = true;
  editingContactId = null;
  clearFormErrors();
  if (lastFocusedElement) lastFocusedElement.focus();
}

function handleSaveContact(e) {
  e.preventDefault();
  clearFormErrors();

  const name = contactName.value.trim();
  let valid = true;

  if (!name) {
    showFieldError(contactName, 'Please enter a name for this contact.');
    valid = false;
  }

  if (!valid) return;

  const contact = {
    id: contactIdField.value || generateId(),
    name,
    relationship: contactRelField.value.trim(),
    phone: contactPhone.value.trim(),
    email: contactEmail.value.trim()
  };

  const contacts = getContacts();
  const existingIndex = contacts.findIndex(c => c.id === contact.id);

  if (existingIndex >= 0) {
    contacts[existingIndex] = contact;
  } else {
    contacts.push(contact);
  }

  setContacts(contacts);
  renderContacts();
  closeModal();

  // Move focus to the new/updated contact card
  const card = contactsList.querySelector(`[data-id="${contact.id}"]`);
  if (card) {
    const firstBtn = card.querySelector('a, button');
    if (firstBtn) firstBtn.focus();
  }
}

// ── Delete Modal ──────────────────────────────────────────────
function openDeleteModal(contactId) {
  lastFocusedElement = document.activeElement;
  pendingDeleteId = contactId;
  deleteModal.hidden = false;
  trapFocus(deleteModal);
  confirmDeleteBtn.focus();
}

function closeDeleteModal() {
  deleteModal.hidden = true;
  pendingDeleteId = null;
  if (lastFocusedElement) lastFocusedElement.focus();
}

function deleteContact(contactId) {
  const contacts = getContacts().filter(c => c.id !== contactId);
  setContacts(contacts);
  renderContacts();
}

// ── Form Validation Helpers ───────────────────────────────────
function showFieldError(inputEl, message) {
  inputEl.classList.add('input-error');
  inputEl.setAttribute('aria-invalid', 'true');

  let errorEl = document.getElementById(inputEl.id + '-error');
  if (!errorEl) {
    errorEl = document.createElement('p');
    errorEl.id = inputEl.id + '-error';
    errorEl.className = 'field-error';
    errorEl.setAttribute('role', 'alert');
    inputEl.parentNode.appendChild(errorEl);
    inputEl.setAttribute('aria-describedby', errorEl.id);
  }

  errorEl.textContent = message;
  errorEl.classList.add('visible');
  inputEl.focus();
}

function clearFormErrors() {
  contactForm.querySelectorAll('.input-error').forEach(el => {
    el.classList.remove('input-error');
    el.removeAttribute('aria-invalid');
  });
  contactForm.querySelectorAll('.field-error').forEach(el => {
    el.classList.remove('visible');
    el.textContent = '';
  });
}

// ── Focus Trap ────────────────────────────────────────────────
function trapFocus(modalEl) {
  const focusable = modalEl.querySelectorAll(
    'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
  );
  const first = focusable[0];
  const last = focusable[focusable.length - 1];

  function handleTab(e) {
    if (e.key !== 'Tab') return;
    if (e.shiftKey) {
      if (document.activeElement === first) {
        e.preventDefault();
        last.focus();
      }
    } else {
      if (document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
  }

  // Remove old listener and add new one
  modalEl._trapHandler && modalEl.removeEventListener('keydown', modalEl._trapHandler);
  modalEl._trapHandler = handleTab;
  modalEl.addEventListener('keydown', handleTab);
}

// ── Daily Tip ─────────────────────────────────────────────────
function renderDailyTip() {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 0);
  const diff = now - start;
  const dayOfYear = Math.floor(diff / (1000 * 60 * 60 * 24));
  const tipIndex = dayOfYear % HEALTH_TIPS.length;
  dailyTipEl.textContent = HEALTH_TIPS[tipIndex];
}

// ============================================================
// Wordle Puzzle
// ============================================================

const WORDLE_STORAGE = 'careconnect_wordle';

const WORDLE_WORDS = [
  'ABOUT','ABOVE','ACORN','ACTOR','ACUTE','ADMIT','ADULT','AFTER','AGAIN',
  'AGENT','AGREE','AHEAD','ALARM','ALBUM','ALERT','ALIKE','ALIVE','ALLEY',
  'ALLOW','ALONE','ALONG','ANGEL','ANGER','ANKLE','APPLE','APPLY','ARENA',
  'ARGUE','ARISE','ASIDE','AVOID','AWAKE','AWARD','AWARE','BAKER','BASIC',
  'BEACH','BEGIN','BELOW','BIRTH','BLACK','BLADE','BLAME','BLAND','BLANK',
  'BLAST','BLAZE','BLEAK','BLEND','BLESS','BLIND','BLOCK','BLOOD','BLOOM',
  'BOARD','BONUS','BOOST','BRACE','BRAVE','BREAD','BREAK','BRIDE','BRIEF',
  'BRING','BROAD','BROOK','BROWN','BRUSH','BUILD','BUILT','BUNCH','BURST',
  'BUYER','CABIN','CARRY','CATCH','CAUSE','CHAIN','CHAIR','CHALK','CHARM',
  'CHASE','CHEAP','CHECK','CHEEK','CHEST','CHIEF','CHILD','CLEAN','CLEAR',
  'CLIMB','CLOCK','CLOUD','COACH','CORAL','COUNT','COURT','COVER','CRAFT',
  'CRANE','CRASH','CREAM','CREEK','CREST','CRIME','CRISP','CROSS','CROWD',
  'CROWN','CRUSH','CURVE','DAILY','DANCE','DEBUT','DELAY','DEPTH','DRAFT',
  'DRAIN','DRAMA','DREAM','DRESS','DRIFT','DRINK','DRIVE','EARTH','EIGHT',
  'ELECT','EMPTY','ENJOY','ENTER','EQUAL','EXACT','EXIST','EXTRA','FAINT',
  'FAIRY','FAITH','FANCY','FEAST','FIELD','FIGHT','FINAL','FIRST','FIXED',
  'FLAME','FLASH','FLEET','FLOAT','FLOOD','FLOOR','FLUSH','FOCUS','FORCE',
  'FORGE','FORTH','FORTY','FOUND','FRAME','FRANK','FRESH','FRONT','FROST',
  'FRUIT','GHOST','GLASS','GLEAM','GLORY','GLOVE','GRACE','GRADE','GRAIN',
  'GRAND','GRANT','GRASP','GRASS','GRAVE','GREAT','GREEN','GRIEF','GRIND',
  'GROAN','GROVE','GROWN','GUARD','GUEST','GUIDE','HAPPY','HARSH','HEART',
  'HEAVY','HEDGE','HENCE','HINGE','HOLLY','HONEY','HORSE','HOTEL','HOUSE',
  'HUMAN','HUMOR','HURRY','IMAGE','INNER','ISSUE','JEWEL','JOINT','JUDGE',
  'JUICE','KNIFE','KNOCK','KNOWN','LABEL','LARGE','LATER','LAUGH','LAYER',
  'LEARN','LEAST','LEAVE','LEGAL','LEMON','LEVEL','LIGHT','LIMIT','LINEN',
  'LOCAL','LODGE','LOGIC','LOOSE','LOWER','LUCKY','LUNCH','MAGIC','MAJOR',
  'MAKER','MAPLE','MARCH','MARRY','MATCH','MAYOR','MERCY','MERIT','METAL',
  'MIGHT','MINOR','MODEL','MONEY','MONTH','MORAL','MOUNT','MOUSE','MUSIC',
  'NERVE','NIGHT','NOBLE','NOISE','NORTH','NOVEL','NURSE','OFFER','OLIVE',
  'ORDER','OUTER','OWNER','PAINT','PANEL','PAPER','PARTY','PAUSE','PEACH',
  'PEARL','PENNY','PHASE','PHONE','PHOTO','PIANO','PIECE','PILOT','PITCH',
  'PLACE','PLAIN','PLANK','PLANT','PLATE','PLUCK','POINT','POLAR','POUND',
  'POWER','PRESS','PRICE','PRIDE','PRIME','PRINT','PRIZE','PROOF','PROUD',
  'PROVE','PULSE','PUPIL','PURSE','QUEEN','QUERY','QUEST','QUICK','QUIET',
  'QUITE','QUOTA','QUOTE','RAISE','RALLY','RANCH','RANGE','RAPID','REACH',
  'READY','REALM','REFER','REIGN','RELAX','RIDER','RIFLE','RIGHT','RIVAL',
  'RIVER','ROCKY','ROUGE','ROUGH','ROUND','ROUTE','ROYAL','RULER','RURAL',
  'SAINT','SALAD','SCALE','SCENE','SCORE','SENSE','SERVE','SEVEN','SHAKE',
  'SHALL','SHAME','SHAPE','SHARE','SHARP','SHELF','SHELL','SHIFT','SHINE',
  'SHIRT','SHOCK','SHORE','SHORT','SHOUT','SIGHT','SINCE','SKILL','SLIDE',
  'SLOPE','SMALL','SMILE','SMOKE','SNAKE','SOLAR','SOLID','SOLVE','SORRY',
  'SOUND','SOUTH','SPACE','SPARE','SPARK','SPEAK','SPEED','SPELL','SPEND',
  'SPICE','SPINE','SPITE','SPLIT','SPOON','SPORT','SPRAY','STACK','STAFF',
  'STAGE','STAIN','STAND','STARE','START','STATE','STEAM','STEEL','STEEP',
  'STEER','STERN','STICK','STILL','STOCK','STONE','STORE','STORM','STORY',
  'STRAP','STRAW','STRIP','STUDY','STYLE','SUGAR','SUNNY','SUPER','SURGE',
  'SWEAR','SWEEP','SWEET','SWIFT','SWORD','TABLE','TAKEN','TASTE','TEACH',
  'TEARS','TENSE','TERMS','THICK','THIEF','THING','THINK','THIRD','THORN',
  'THREE','THROW','TIGER','TIGHT','TIRED','TITLE','TOKEN','TOTAL','TOUCH',
  'TOUGH','TOWER','TRACE','TRACK','TRADE','TRAIN','TRAIT','TRASH','TREAD',
  'TREAT','TREND','TRIAL','TRICK','TROOP','TRUST','TRUTH','TWIST','ULTRA',
  'UNDER','UNION','UNITY','UNTIL','UPPER','UPSET','URBAN','VALID','VALUE',
  'VALVE','VERSE','VIRAL','VISIT','VITAL','VIVID','VOCAL','VOICE','VOTER',
  'WASTE','WATCH','WATER','WEIGH','WHALE','WHEAT','WHEEL','WHERE','WHICH',
  'WHILE','WHITE','WHOLE','WITCH','WOMAN','WORLD','WORRY','WORSE','WORTH',
  'WRITE','WRONG','YACHT','YEARN','YIELD','YOUNG','YOUTH'
];

// Valid guesses — any 5-letter sequence of A-Z is accepted, but only WORDLE_WORDS
// are used as answers. We accept any attempt so the player is never blocked.

const WORDLE_ROWS = 6;
const WORDLE_COLS = 5;

// ── Wordle state ──────────────────────────────────────────────
let wState = {
  target: '',
  guesses: [],      // array of scored guess objects { word, score[] }
  current: '',      // letters typed so far in the active row
  gameOver: false,
  won: false,
  dateKey: ''       // YYYY-MM-DD — used to detect a new day
};

// ── Wordle DOM refs ───────────────────────────────────────────
const wordleGrid     = document.getElementById('wordle-grid');
const wordleKeyboard = document.getElementById('wordle-keyboard');
const wordleMsg      = document.getElementById('wordle-message');

// ── Init ──────────────────────────────────────────────────────
function initWordle() {
  const today = getTodayKey();
  const saved = loadWordleState();

  if (saved && saved.dateKey === today) {
    wState = saved;
  } else {
    wState = {
      target: getDailyWord(today),
      guesses: [],
      current: '',
      gameOver: false,
      won: false,
      dateKey: today
    };
  }

  buildWordleGrid();
  buildWordleKeyboard();
  renderWordleGrid();
  renderWordleKeyboard();

  if (wState.gameOver) {
    showWordleEndMessage();
  }

  // Physical keyboard input — only active when no modal is open
  document.addEventListener('keydown', handlePhysicalKey);
}

function getTodayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function getDailyWord(dateKey) {
  // Simple stable hash of the date string → index into word list
  let hash = 0;
  for (let i = 0; i < dateKey.length; i++) {
    hash = (hash * 31 + dateKey.charCodeAt(i)) >>> 0;
  }
  return WORDLE_WORDS[hash % WORDLE_WORDS.length];
}

// ── Build grid DOM ────────────────────────────────────────────
function buildWordleGrid() {
  wordleGrid.innerHTML = '';
  for (let r = 0; r < WORDLE_ROWS; r++) {
    const row = document.createElement('div');
    row.className = 'wordle-row';
    row.id = `wrow-${r}`;
    for (let c = 0; c < WORDLE_COLS; c++) {
      const tile = document.createElement('div');
      tile.className = 'wordle-tile';
      tile.id = `wtile-${r}-${c}`;
      tile.setAttribute('aria-label', 'Empty');
      row.appendChild(tile);
    }
    wordleGrid.appendChild(row);
  }
}

// ── Build keyboard DOM ────────────────────────────────────────
function buildWordleKeyboard() {
  const rows = [
    ['Q','W','E','R','T','Y','U','I','O','P'],
    ['A','S','D','F','G','H','J','K','L'],
    ['ENTER','Z','X','C','V','B','N','M','⌫']
  ];

  wordleKeyboard.innerHTML = '';
  rows.forEach(keys => {
    const rowEl = document.createElement('div');
    rowEl.className = 'wordle-key-row';
    keys.forEach(key => {
      const btn = document.createElement('button');
      btn.textContent = key;
      btn.className = 'wordle-key' + (key.length > 1 ? ' key-wide' : '');
      btn.dataset.key = key;
      btn.setAttribute('aria-label', key === '⌫' ? 'Backspace' : key === 'ENTER' ? 'Enter guess' : key);
      btn.addEventListener('click', () => handleWordleKey(key));
      if (key === 'ENTER') btn.id = 'wkey-enter';
      rowEl.appendChild(btn);
    });
    wordleKeyboard.appendChild(rowEl);
  });
}

// ── Render current state onto DOM ────────────────────────────
function renderWordleGrid() {
  for (let r = 0; r < WORDLE_ROWS; r++) {
    for (let c = 0; c < WORDLE_COLS; c++) {
      const tile = document.getElementById(`wtile-${r}-${c}`);
      tile.className = 'wordle-tile';
      tile.textContent = '';
      tile.setAttribute('aria-label', 'Empty');

      if (r < wState.guesses.length) {
        // Submitted row
        const { word, score } = wState.guesses[r];
        const letter = word[c] || '';
        tile.textContent = letter;
        tile.classList.add(score[c]);
        tile.setAttribute('aria-label', `${letter} — ${score[c]}`);
      } else if (r === wState.guesses.length && !wState.gameOver) {
        // Active row
        const letter = wState.current[c] || '';
        tile.textContent = letter;
        if (letter) {
          tile.classList.add('filled');
          tile.setAttribute('aria-label', letter);
        }
      }
    }
  }
}

function renderWordleKeyboard() {
  // Build a map of best state per letter (correct > present > absent)
  const STATE_PRIORITY = { correct: 3, present: 2, absent: 1 };
  const letterState = {};

  wState.guesses.forEach(({ word, score }) => {
    word.split('').forEach((letter, i) => {
      const s = score[i];
      if (!letterState[letter] || STATE_PRIORITY[s] > STATE_PRIORITY[letterState[letter]]) {
        letterState[letter] = s;
      }
    });
  });

  wordleKeyboard.querySelectorAll('.wordle-key').forEach(btn => {
    const key = btn.dataset.key;
    btn.classList.remove('correct', 'present', 'absent');
    if (letterState[key]) {
      btn.classList.add(letterState[key]);
    }
  });
}

// ── Key handling ──────────────────────────────────────────────
function handlePhysicalKey(e) {
  // Don't intercept when a modal is open or user is typing in an input
  if (!contactModal.hidden || !deleteModal.hidden) return;
  if (['INPUT','TEXTAREA','SELECT'].includes(document.activeElement.tagName)) return;

  if (e.key === 'Enter') {
    handleWordleKey('ENTER');
  } else if (e.key === 'Backspace') {
    handleWordleKey('⌫');
  } else if (/^[a-zA-Z]$/.test(e.key)) {
    handleWordleKey(e.key.toUpperCase());
  }
}

function handleWordleKey(key) {
  if (wState.gameOver) return;

  if (key === '⌫') {
    wState.current = wState.current.slice(0, -1);
    renderWordleGrid();
  } else if (key === 'ENTER') {
    submitWordleGuess();
  } else if (/^[A-Z]$/.test(key) && wState.current.length < WORDLE_COLS) {
    wState.current += key;
    renderWordleGrid();
  }
}

// ── Submit guess ──────────────────────────────────────────────
function submitWordleGuess() {
  if (wState.current.length < WORDLE_COLS) {
    setWordleMessage('Not enough letters!');
    shakeRow(wState.guesses.length);
    return;
  }

  const word  = wState.current;
  const score = scoreWordleGuess(word, wState.target);

  wState.guesses.push({ word, score });
  wState.current = '';

  // Animate the submitted row, then update state
  animateRow(wState.guesses.length - 1, score, () => {
    renderWordleKeyboard();
    saveWordleState();

    if (score.every(s => s === 'correct')) {
      wState.won      = true;
      wState.gameOver = true;
      saveWordleState();
      animateBounce(wState.guesses.length - 1);
      showWordleEndMessage();
    } else if (wState.guesses.length === WORDLE_ROWS) {
      wState.gameOver = true;
      saveWordleState();
      showWordleEndMessage();
    } else {
      setWordleMessage('');
    }
  });
}

// ── Score a guess ─────────────────────────────────────────────
function scoreWordleGuess(guess, target) {
  const result       = Array(WORDLE_COLS).fill('absent');
  const targetLetters = target.split('');
  const guessLetters  = guess.split('');

  // Pass 1: correct positions
  for (let i = 0; i < WORDLE_COLS; i++) {
    if (guessLetters[i] === targetLetters[i]) {
      result[i]        = 'correct';
      targetLetters[i] = null;
      guessLetters[i]  = null;
    }
  }
  // Pass 2: present but wrong position
  for (let i = 0; i < WORDLE_COLS; i++) {
    if (guessLetters[i] === null) continue;
    const idx = targetLetters.indexOf(guessLetters[i]);
    if (idx !== -1) {
      result[i]        = 'present';
      targetLetters[idx] = null;
    }
  }
  return result;
}

// ── Animations ────────────────────────────────────────────────
function animateRow(rowIndex, score, callback) {
  const tiles = document.querySelectorAll(`#wrow-${rowIndex} .wordle-tile`);
  tiles.forEach((tile, i) => {
    setTimeout(() => {
      tile.classList.add(score[i]);
      tile.setAttribute('aria-label', `${tile.textContent} — ${score[i]}`);
    }, i * 100);
  });
  // Callback fires after all tiles have flipped
  setTimeout(callback, WORDLE_COLS * 100 + 300);
}

function animateBounce(rowIndex) {
  const tiles = document.querySelectorAll(`#wrow-${rowIndex} .wordle-tile`);
  tiles.forEach((tile, i) => {
    setTimeout(() => tile.classList.add('bounce'), i * 80);
  });
}

function shakeRow(rowIndex) {
  const row = document.getElementById(`wrow-${rowIndex}`);
  if (!row) return;
  row.classList.remove('shake');
  // Trigger reflow to restart animation
  void row.offsetWidth;
  row.classList.add('shake');
  row.addEventListener('animationend', () => row.classList.remove('shake'), { once: true });
}

// ── Messages ──────────────────────────────────────────────────
function setWordleMessage(msg) {
  wordleMsg.textContent = msg;
}

function showWordleEndMessage() {
  if (wState.won) {
    const tries = wState.guesses.length;
    const praise = ['Genius!', 'Magnificent!', 'Brilliant!', 'Great!', 'Well done!', 'Phew!'];
    setWordleMessage(`${praise[tries - 1] || 'Well done!'} You got it in ${tries}. Come back tomorrow for a new word!`);
  } else {
    setWordleMessage(`The word was ${wState.target}. Better luck tomorrow!`);
  }
}

// ── Persistence ───────────────────────────────────────────────
function saveWordleState() {
  localStorage.setItem(WORDLE_STORAGE, JSON.stringify(wState));
}

function loadWordleState() {
  try {
    return JSON.parse(localStorage.getItem(WORDLE_STORAGE));
  } catch {
    return null;
  }
}
