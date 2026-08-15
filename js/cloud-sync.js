// Cloud sync for dnd.html: Google sign-in + Firestore-backed characters,
// so a character stays in sync across devices instead of relying solely on
// the local file export/import (which remains untouched as a manual backup).
import { auth, db, googleProvider } from "./firebase-config.js";
import {
  signInWithPopup, signOut, onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.13.2/firebase-auth.js";
import {
  collection, doc, addDoc, setDoc, getDoc, getDocs, deleteDoc, query, orderBy, serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.13.2/firebase-firestore.js";

const AUTOSAVE_DEBOUNCE_MS = 2000;
const DEFAULT_ROWS = { rows_attacks: '2', rows_attunements: '3', rows_inventory: '2', rows_spells: '2' };

let currentUser = null;
let currentCharacterId = null;
let currentCharacterName = null;
let saveTimer = null;

const el = {
  status: document.getElementById('cloud-status'),
  signIn: document.getElementById('btn-google-signin'),
  signOut: document.getElementById('btn-signout'),
  select: document.getElementById('cloud-character-select'),
  newChar: document.getElementById('btn-new-character'),
  saveNow: document.getElementById('btn-save-cloud'),
  del: document.getElementById('btn-delete-cloud'),
};

function charactersCollection(uid) {
  return collection(db, 'users', uid, 'characters');
}

function setSignedOutUI() {
  el.status.textContent = 'Not signed in';
  el.signIn.style.display = '';
  el.signOut.style.display = 'none';
  el.select.style.display = 'none';
  el.newChar.style.display = 'none';
  el.saveNow.style.display = 'none';
  el.del.style.display = 'none';
  el.select.innerHTML = '';
  currentCharacterId = null;
  currentCharacterName = null;
}

function setSignedInUI() {
  el.status.textContent = 'Signed in as ' + (currentUser.displayName || currentUser.email);
  el.signIn.style.display = 'none';
  el.signOut.style.display = '';
  el.select.style.display = '';
  el.newChar.style.display = '';
  el.saveNow.style.display = '';
  el.del.style.display = '';
}

async function refreshCharacterList(selectId) {
  const q = query(charactersCollection(currentUser.uid), orderBy('name'));
  const snap = await getDocs(q);
  el.select.innerHTML = '<option value="">-- Select a character --</option>';
  snap.forEach((docSnap) => {
    const opt = document.createElement('option');
    opt.value = docSnap.id;
    opt.textContent = docSnap.data().name;
    el.select.appendChild(opt);
  });
  if (selectId) {
    el.select.value = selectId;
  }
}

async function loadCharacter(charId) {
  const snap = await getDoc(doc(db, 'users', currentUser.uid, 'characters', charId));
  if (!snap.exists()) {
    alert('That character no longer exists.');
    await refreshCharacterList();
    return;
  }
  const record = snap.data();
  window.applyCharacterData(record.data);
  currentCharacterId = charId;
  currentCharacterName = record.name;
}

function blankCharacterData() {
  const data = window.serializeCharacterForm();
  for (const key in data) {
    if (key in DEFAULT_ROWS) continue;
    data[key] = (data[key] === 'checked' || data[key] === 'unchecked') ? 'unchecked' : '';
  }
  Object.assign(data, DEFAULT_ROWS);
  return data;
}

async function saveCurrentCharacter() {
  if (!currentUser || !currentCharacterId) return;
  await setDoc(doc(db, 'users', currentUser.uid, 'characters', currentCharacterId), {
    name: currentCharacterName,
    data: window.serializeCharacterForm(),
    updatedAt: serverTimestamp(),
  });
}

function scheduleAutosave() {
  if (!currentUser || !currentCharacterId) return;
  clearTimeout(saveTimer);
  saveTimer = setTimeout(saveCurrentCharacter, AUTOSAVE_DEBOUNCE_MS);
}

el.signIn.addEventListener('click', async () => {
  try {
    await signInWithPopup(auth, googleProvider);
  } catch (err) {
    console.error(err);
    alert('Sign-in failed: ' + err.message);
  }
});

el.signOut.addEventListener('click', async () => {
  clearTimeout(saveTimer);
  await signOut(auth);
});

el.select.addEventListener('change', async () => {
  const charId = el.select.value;
  if (!charId) return;
  await loadCharacter(charId);
});

el.newChar.addEventListener('click', async () => {
  const name = prompt('Name this character:');
  if (!name) return;
  window.applyCharacterData(blankCharacterData());
  const docRef = await addDoc(charactersCollection(currentUser.uid), {
    name: name,
    data: window.serializeCharacterForm(),
    updatedAt: serverTimestamp(),
  });
  currentCharacterId = docRef.id;
  currentCharacterName = name;
  await refreshCharacterList(docRef.id);
});

el.saveNow.addEventListener('click', async () => {
  if (!currentCharacterId) {
    alert('Pick or create a character first.');
    return;
  }
  await saveCurrentCharacter();
});

el.del.addEventListener('click', async () => {
  if (!currentCharacterId) {
    alert('Pick a character first.');
    return;
  }
  if (!confirm('Delete "' + currentCharacterName + '" from the cloud? This cannot be undone.')) return;
  await deleteDoc(doc(db, 'users', currentUser.uid, 'characters', currentCharacterId));
  currentCharacterId = null;
  currentCharacterName = null;
  await refreshCharacterList();
});

document.getElementById('charsheet').addEventListener('input', scheduleAutosave);
document.getElementById('charsheet').addEventListener('change', scheduleAutosave);

onAuthStateChanged(auth, async (user) => {
  currentUser = user;
  if (user) {
    setSignedInUI();
    await refreshCharacterList();
  } else {
    setSignedOutUI();
  }
});
