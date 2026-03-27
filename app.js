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
