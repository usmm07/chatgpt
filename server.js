const fs = require('fs');
const path = require('path');
const express = require('express');

const app = express();
const PORT = process.env.PORT || 3000;

const DATA_PATH = path.join(__dirname, 'data', 'contacts.json');
const DATA_DIR = path.dirname(DATA_PATH);

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

if (!fs.existsSync(DATA_PATH)) {
  fs.writeFileSync(DATA_PATH, '[]', 'utf8');
}

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

function loadContacts() {
  try {
    const raw = fs.readFileSync(DATA_PATH, 'utf8');
    return JSON.parse(raw || '[]');
  } catch (error) {
    return [];
  }
}

function saveContacts(entries) {
  fs.writeFileSync(DATA_PATH, JSON.stringify(entries, null, 2));
}

app.post('/api/contact', (req, res) => {
  const { name, email, phone, message } = req.body || {};

  const trimmedName = typeof name === 'string' ? name.trim() : '';
  const trimmedEmail = typeof email === 'string' ? email.trim() : '';
  const trimmedPhone = typeof phone === 'string' ? phone.trim() : '';
  const trimmedMessage = typeof message === 'string' ? message.trim() : '';

  const errors = [];
  if (!trimmedName) errors.push('Name is required');
  if (!trimmedEmail) {
    errors.push('Email is required');
  } else {
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailPattern.test(trimmedEmail)) {
      errors.push('A valid email is required');
    }
  }

  if (errors.length) {
    return res.status(400).json({ message: errors.join('. ') });
  }

  const newEntry = {
    name: trimmedName,
    email: trimmedEmail,
    phone: trimmedPhone,
    message: trimmedMessage,
    timestamp: new Date().toISOString(),
  };

  try {
    const entries = loadContacts();
    entries.push(newEntry);
    saveContacts(entries);
  } catch (error) {
    console.error('Failed to save contact entry', error);
    return res.status(500).json({ message: 'Unable to save your request right now. Please try again later.' });
  }

  res.status(201).json({ message: 'Thanks for reaching out! We will respond soon.' });
});

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', service: 'diio-site' });
});

app.use((req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

app.listen(PORT, () => {
  console.log(`Diio site running at http://localhost:${PORT}`);
});
