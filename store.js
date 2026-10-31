/**
 * Shared in-memory store with JSON file persistence.
 * All hospital roles read/write the same STATE + FEATURE.
 */
const fs = require('fs');
const path = require('path');
const { randomUUID } = require('crypto');

const DATA_DIR = path.join(__dirname, 'data');
const STATE_FILE = path.join(DATA_DIR, 'state.json');
const FEATURE_FILE = path.join(DATA_DIR, 'feature.json');

const DEPTS = ['General Medicine', 'Pediatrics', 'Dermatology', 'Orthopedics', 'Operation Theatre'];
const DEPT_PREFIX = {
  'General Medicine': 'GM', Pediatrics: 'PD', Dermatology: 'DR',
  Orthopedics: 'OR', 'Operation Theatre': 'OT'
};
const CONSULT_FEE = 300;
const AVG_CONSULT_MIN = 8;

function uid(prefix) {
  return (prefix || 'id') + randomUUID().replace(/-/g, '').slice(0, 8);
}

function todayKey() {
  const d = new Date();
  return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate();
}

function now() {
  return Date.now();
}

function seedDoctors() {
  return [
    { id: 'doc1', name: 'Dr. Mehta', dept: 'General Medicine', counter: 1, availability: 'Available', empCode: 'DOC001', degree: 'MBBS, MD (Medicine)', regNo: 'MCI-12345', active: true },
    { id: 'doc2', name: 'Dr. Iyer', dept: 'General Medicine', counter: 2, availability: 'Available', empCode: 'DOC002', degree: 'MBBS, DNB', regNo: 'MCI-23456', active: true },
    { id: 'doc3', name: 'Dr. Kaur', dept: 'Pediatrics', counter: 3, availability: 'Available', empCode: 'DOC003', degree: 'MBBS, MD (Pediatrics)', regNo: 'MCI-34567', active: true },
    { id: 'doc4', name: 'Dr. Rao', dept: 'Dermatology', counter: 4, availability: 'Available', empCode: 'DOC004', degree: 'MBBS, MD (Dermatology)', regNo: 'MCI-45678', active: true },
    { id: 'doc5', name: 'Dr. Sharma', dept: 'Orthopedics', counter: 5, availability: 'Available', empCode: 'DOC005', degree: 'MBBS, MS (Ortho)', regNo: 'MCI-56789', active: true }
  ];
}

function seedReceptionists() {
  return [
    { id: 'rec1', name: 'Priya (Front Desk)', empCode: 'REC001', phone: '9876511111', active: true },
    { id: 'rec2', name: 'Amit Sharma', empCode: 'REC002', phone: '9876522222', active: true },
    { id: 'rec3', name: 'Sunita Devi', empCode: 'REC003', phone: '9876533333', active: true }
  ];
}

function seedLabTechs() {
  return [
    { id: 'lab1', name: 'Anita Labs', empCode: 'LAB001', phone: '9876544444', active: true },
    { id: 'lab2', name: 'Rahul Path', empCode: 'LAB002', phone: '9876555555', active: true },
    { id: 'lab3', name: 'Meera Diagnostics', empCode: 'LAB003', phone: '9876566666', active: true }
  ];
}

function seedPharmacyStaff() {
  return [
    { id: 'ph1', name: 'Kiran Pharmacy', empCode: 'PHR001', phone: '9876577777', active: true },
    { id: 'ph2', name: 'Suresh Chemist', empCode: 'PHR002', phone: '9876588888', active: true },
    { id: 'ph3', name: 'Neha Medicals', empCode: 'PHR003', phone: '9876599999', active: true }
  ];
}

function seedPatients() {
  const mk = (o) => Object.assign({
    id: uid('p'), age: 30, gender: 'Female', phone: '9800000000', symptoms: '', emergency: false,
    visitType: 'Walk-in', status: 'waiting', registeredAt: now(), calledAt: null, startedAt: null,
    completedAt: null, doctorId: null, counter: null, notes: '', diagnosis: '', prescription: '',
    followUp: '', referralDept: null, priorityFlag: 'routine', arrived: false, cancelReason: null,
    history: [], lastAction: null, branch: 'main',
    consultFeePaid: true, consultFeeMethod: 'Cash', consultFeeAmount: CONSULT_FEE,
    finalFeePaid: false, finalFeeMethod: null, finalFeeAmount: 0, finalFeeTs: null,
    rxSent: false, rxSendMethod: null, rxPhoto: null, smsFlags: {}
  }, o);
  const list = [
    mk({ name: 'Ramesh Gupta', age: 68, gender: 'Male', dept: 'General Medicine', symptoms: 'mild fever and body ache', registeredAt: now() - 22 * 60000, priorityFlag: 'routine', history: [{ status: 'registered', ts: now() - 22 * 60000 }] }),
    mk({ name: 'Neha Sharma', age: 29, gender: 'Female', dept: 'Orthopedics', symptoms: 'knee pain after a fall', registeredAt: now() - 14 * 60000, priorityFlag: 'moderate', history: [{ status: 'registered', ts: now() - 14 * 60000 }] }),
    mk({ name: 'Farah Khan', age: 41, gender: 'Female', dept: 'General Medicine', symptoms: 'severe chest pain — staff flagged', emergency: true, priorityFlag: 'emergency', registeredAt: now() - 3 * 60000, history: [{ status: 'registered', ts: now() - 3 * 60000 }, { status: 'emergency-flagged', ts: now() - 3 * 60000, note: 'Staff escalation' }] }),
    mk({ name: 'Ila Bose', age: 33, gender: 'Female', dept: 'Dermatology', symptoms: 'mild rash on arm', registeredAt: now() - 30 * 60000, status: 'called', calledAt: now() - 2 * 60000, doctorId: 'doc4', counter: 4, history: [{ status: 'registered', ts: now() - 30 * 60000 }, { status: 'called', ts: now() - 2 * 60000 }] }),
    mk({ name: 'Vikram Rao', age: 8, gender: 'Male', dept: 'Pediatrics', symptoms: 'follow-up visit', visitType: 'Appointment', registeredAt: now() - 50 * 60000, status: 'completed', calledAt: now() - 20 * 60000, startedAt: now() - 18 * 60000, completedAt: now() - 5 * 60000, doctorId: 'doc3', counter: 3, diagnosis: 'Seasonal cold', prescription: 'Rest, fluids', history: [{ status: 'registered', ts: now() - 50 * 60000 }, { status: 'completed', ts: now() - 5 * 60000 }] }),
    mk({ name: 'Suresh Menon', age: 72, gender: 'Male', dept: 'General Medicine', symptoms: 'routine checkup', registeredAt: now() - 60 * 60000, status: 'no-show', calledAt: now() - 40 * 60000, history: [{ status: 'registered', ts: now() - 60 * 60000 }, { status: 'no-show', ts: now() - 40 * 60000 }] })
  ];
  list.forEach((p, i) => {
    const prefix = DEPT_PREFIX[p.dept] || 'OP';
    p.token = prefix + '-' + String(i + 1).padStart(3, '0');
  });
  return list;
}

function seedFeatures() {
  const today = new Date();
  const y = today.getFullYear(), m = today.getMonth(), d = today.getDate();
  const ds = y + '-' + String(m + 1).padStart(2, '0') + '-' + String(d).padStart(2, '0');
  return {
    appointments: [
      { id: 'a1', patientName: 'Demo Patient', dept: 'General Medicine', doctorId: 'doc1', date: ds, slot: '10:00', status: 'booked', visitType: 'Appointment' },
      { id: 'a2', patientName: 'Neha Sharma', dept: 'Orthopedics', doctorId: 'doc5', date: ds, slot: '11:20', status: 'booked', visitType: 'Appointment' }
    ],
    labOrders: [], pharmacyOrders: [], payments: [], feedback: [], tickets: [], grievances: [],
    consents: { abha: false, whatsapp: false, research: false },
    emergencyLog: [], smsLog: [],
    wallet: { balance: 0, ledger: [] },
    branches: [{ id: 'main', name: 'Main Campus' }, { id: 'east', name: 'East Wing' }, { id: 'annex', name: 'OPD Annex' }],
    rooms: [
      { name: 'OPD Counter 1', floor: 'G' }, { name: 'OPD Counter 2', floor: 'G' },
      { name: 'Lab Sample', floor: '1' }, { name: 'Pharmacy', floor: 'G' },
      { name: 'Billing', floor: 'G' }, { name: 'Emergency', floor: 'G' }
    ]
  };
}

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
}

function loadOrSeed() {
  ensureDataDir();
  let STATE, FEATURE;
  try {
    if (fs.existsSync(STATE_FILE)) {
      STATE = JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
    }
  } catch (e) { STATE = null; }
  try {
    if (fs.existsSync(FEATURE_FILE)) {
      FEATURE = JSON.parse(fs.readFileSync(FEATURE_FILE, 'utf8'));
    }
  } catch (e) { FEATURE = null; }

  if (!STATE || !Array.isArray(STATE.patients)) {
    STATE = {
      patients: seedPatients(),
      doctors: seedDoctors(),
      receptionists: seedReceptionists(),
      labTechs: seedLabTechs(),
      pharmacyStaff: seedPharmacyStaff(),
      tokenSeq: { GM: 3, PD: 1, DR: 1, OR: 1, OT: 0 },
      auditLog: [{ ts: now(), actor: 'System', action: 'Seeded shared demo data', detail: '' }],
      dayKey: todayKey()
    };
  }
  if (!FEATURE) FEATURE = seedFeatures();
  if (!FEATURE.wallet) FEATURE.wallet = { balance: 0, ledger: [] };
  if (!Array.isArray(FEATURE.payments)) FEATURE.payments = [];
  if (!Array.isArray(FEATURE.smsLog)) FEATURE.smsLog = [];
  if (STATE.dayKey !== todayKey()) {
    STATE.tokenSeq = {};
    STATE.dayKey = todayKey();
  }
  return { STATE, FEATURE };
}

let { STATE, FEATURE } = loadOrSeed();
let version = 1;
const sseClients = new Set();

function persist() {
  ensureDataDir();
  try {
    fs.writeFileSync(STATE_FILE, JSON.stringify(STATE, null, 0));
    fs.writeFileSync(FEATURE_FILE, JSON.stringify(FEATURE, null, 0));
  } catch (e) {
    console.error('persist failed', e.message);
  }
}

function bump(event) {
  version += 1;
  persist();
  const payload = JSON.stringify({ version, event: event || 'update', ts: now() });
  for (const res of sseClients) {
    try {
      res.write('data: ' + payload + '\n\n');
    } catch (e) {
      sseClients.delete(res);
    }
  }
}

function snapshot() {
  return { version, STATE, FEATURE, meta: { CONSULT_FEE, AVG_CONSULT_MIN, DEPTS, DEPT_PREFIX } };
}

function priorityRank(p) {
  if (p.emergency || p.priorityFlag === 'emergency') return 3;
  if (p.priorityFlag === 'high' || p.priorityFlag === 'moderate') return 2;
  if (p.visitType === 'Appointment') return 1.5;
  return 1;
}

function waitingQueue(dept) {
  return STATE.patients
    .filter(p => p.dept === dept && p.status === 'waiting')
    .sort((a, b) => priorityRank(b) - priorityRank(a) || a.registeredAt - b.registeredAt);
}

function nextToken(dept) {
  const prefix = DEPT_PREFIX[dept] || 'OP';
  STATE.tokenSeq[prefix] = (STATE.tokenSeq[prefix] || 0) + 1;
  return prefix + '-' + String(STATE.tokenSeq[prefix]).padStart(3, '0');
}

function audit(actor, action, detail) {
  STATE.auditLog.unshift({ ts: now(), actor: actor || 'System', action, detail: detail || '' });
  STATE.auditLog = STATE.auditLog.slice(0, 80);
}

function pushHistory(p, status, note) {
  if (!p.history) p.history = [];
  p.history.push({ status, ts: now(), note: note || null });
}

function findPatient(id) {
  return STATE.patients.find(p => p.id === id);
}

function sendDemoSms(phone, message, kind) {
  const entry = {
    id: 'SMS' + now(),
    phone: String(phone || '').replace(/\D/g, '').slice(-10),
    message,
    kind: kind || 'queue',
    ts: now(),
    channel: 'SMS (demo)'
  };
  FEATURE.smsLog.unshift(entry);
  FEATURE.smsLog = FEATURE.smsLog.slice(0, 50);
  return entry;
}

/* ===== Mutations ===== */

function registerPatient(data, actor) {
  const token = nextToken(data.dept);
  const p = {
    id: uid('p'), token,
    name: data.name, age: data.age, gender: data.gender, phone: data.phone,
    dept: data.dept, visitType: data.visitType || 'Walk-in', symptoms: (data.symptoms || '').slice(0, 200),
    emergency: !!data.emergency, priorityFlag: data.priorityFlag || (data.emergency ? 'emergency' : 'routine'),
    status: 'waiting', registeredAt: now(), calledAt: null, startedAt: null, completedAt: null,
    doctorId: null, counter: null, notes: '', diagnosis: '', prescription: '', followUp: '',
    referralDept: null, arrived: false, cancelReason: null, lastAction: null, branch: 'main',
    consultFeePaid: data.consultFeePaid !== false, consultFeeMethod: data.consultFeeMethod || 'Cash',
    consultFeeAmount: data.consultFeeAmount || CONSULT_FEE,
    finalFeePaid: false, finalFeeMethod: null, finalFeeAmount: 0, finalFeeTs: null,
    rxSent: false, rxSendMethod: null, rxPhoto: null, smsFlags: {},
    paymentStatus: data.paymentStatus || (data.consultFeeMethod === 'Cash' ? 'pending counter' : 'pending verify'),
    history: [
      { status: 'registered', ts: now() },
      { status: 'fee-selected', ts: now(), note: (data.consultFeeMethod || 'Cash') + ' ₹' + (data.consultFeeAmount || CONSULT_FEE) }
    ]
  };
  if (p.emergency) pushHistory(p, 'emergency-flagged', 'Flagged at registration');
  STATE.patients.push(p);

  const payId = 'P' + now() + Math.random().toString(36).slice(2, 6);
  FEATURE.payments.unshift({
    id: payId, amount: CONSULT_FEE, method: p.consultFeeMethod,
    status: p.consultFeeMethod === 'Cash' ? 'pending counter' : 'pending',
    type: 'consultation', token: p.token, patientId: p.id, ts: now(),
    verified: false, verifiedBy: null, verifiedAt: null, ledgered: false
  });

  audit(actor, 'Registered patient', p.token + ' — ' + p.name);
  bump('register');
  return p;
}

function callNext(dept, doctorId, actor) {
  const next = waitingQueue(dept)[0];
  if (!next) return null;
  const doc = STATE.doctors.find(d => d.id === doctorId);
  if (!doc || doc.dept !== dept) return null;
  next.lastAction = { prevStatus: next.status, ts: now() };
  next.status = 'called';
  next.calledAt = now();
  next.doctorId = doc.id;
  next.counter = doc.counter;
  pushHistory(next, 'called', 'by ' + doc.name);
  audit(actor, 'Called next patient', next.token + ' → ' + doc.name);
  if (!next.smsFlags) next.smsFlags = {};
  if (!next.smsFlags.called) {
    next.smsFlags.called = true;
    sendDemoSms(next.phone, 'OPD FINAL ALERT: Token ' + next.token + ' is NOW CALLED. Proceed to Counter ' + doc.counter + ' (' + (next.dept || '') + ').', 'called');
  }
  checkQueueSmsAlerts(dept);
  bump('call');
  return next;
}

function startConsult(patientId, actor) {
  const p = findPatient(patientId);
  if (!p || p.status !== 'called') return null;
  p.lastAction = { prevStatus: p.status, ts: now() };
  p.status = 'in-consultation';
  p.startedAt = now();
  pushHistory(p, 'in-consultation');
  audit(actor, 'Started consultation', p.token);
  bump('consult-start');
  return p;
}

function noShow(patientId, actor) {
  const p = findPatient(patientId);
  if (!p || p.status !== 'called') return null;
  p.lastAction = { prevStatus: p.status, ts: now() };
  p.status = 'no-show';
  pushHistory(p, 'no-show');
  audit(actor, 'Marked no-show', p.token);
  if (p.dept) checkQueueSmsAlerts(p.dept);
  bump('no-show');
  return p;
}

function completeConsult(patientId, fields, actor) {
  const p = findPatient(patientId);
  if (!p || !p.doctorId) return null;
  p.lastAction = { prevStatus: p.status, ts: now() };
  p.notes = fields.notes || p.notes || '';
  p.diagnosis = fields.diagnosis || p.diagnosis || '';
  p.prescription = fields.prescription || p.prescription || '';
  p.followUp = fields.followUp || p.followUp || '';
  if (fields.refer && fields.referralDept) {
    const target = fields.referralDept;
    if (target === 'Operation Theatre') {
      p.status = 'referred-ot';
      p.referralDept = target;
      p.completedAt = now();
      pushHistory(p, 'referred-ot', 'Referred to Operation Theatre');
      audit(actor, 'Referred to OT', p.token);
    } else {
      p.status = 'waiting';
      p.dept = target;
      p.referralDept = target;
      p.registeredAt = now();
      p.doctorId = null;
      p.counter = null;
      p.token = nextToken(p.dept);
      pushHistory(p, 'referred', 'to ' + target);
      audit(actor, 'Referred patient', p.token + ' to ' + target);
    }
  } else {
    p.status = 'completed';
    p.completedAt = now();
    pushHistory(p, 'completed');
    audit(actor, 'Completed consultation', p.token);
  }
  if (p.dept) checkQueueSmsAlerts(p.dept);
  bump('complete');
  return p;
}

function cancelPatient(patientId, reason, actor) {
  const p = findPatient(patientId);
  if (!p || ['completed', 'cancelled'].includes(p.status)) return null;
  p.lastAction = { prevStatus: p.status, ts: now() };
  p.status = 'cancelled';
  p.cancelReason = reason || 'Not specified';
  pushHistory(p, 'cancelled', reason);
  audit(actor, 'Cancelled visit', p.token + ' — ' + (reason || ''));
  bump('cancel');
  return p;
}

function transferPatient(patientId, newDept, reason, actor) {
  const p = findPatient(patientId);
  if (!p || !reason || !String(reason).trim()) return { ok: false, error: 'Reason required' };
  p.lastAction = { prevStatus: p.status, ts: now() };
  const old = p.dept;
  p.dept = newDept;
  if (p.status !== 'waiting') {
    p.status = 'waiting';
    p.doctorId = null;
    p.counter = null;
  }
  p.token = nextToken(newDept);
  pushHistory(p, 'transferred', old + ' → ' + newDept + ': ' + reason);
  audit(actor, 'Transferred patient', p.token + ' to ' + newDept + ' — ' + reason);
  bump('transfer');
  return { ok: true, patient: p };
}

function adjustPriority(patientId, flag, reason, actor) {
  const p = findPatient(patientId);
  if (!p || !reason || !String(reason).trim()) return { ok: false, error: 'Reason required' };
  p.priorityFlag = flag;
  p.priorityNote = reason;
  if (flag === 'emergency') p.emergency = true;
  pushHistory(p, 'priority-adjusted', flag + ': ' + reason);
  audit(actor, 'Priority adjusted', p.token + ' → ' + flag + ' — ' + reason);
  bump('priority');
  return { ok: true, patient: p };
}

function checkIn(patientId) {
  const p = findPatient(patientId);
  if (!p) return null;
  p.arrived = true;
  pushHistory(p, 'checked-in');
  bump('checkin');
  return p;
}

function createLabOrder(patientId, tests, orderedBy) {
  const p = findPatient(patientId);
  if (!p) return null;
  const testsArr = Array.isArray(tests) ? tests : [tests];
  const order = {
    id: 'LAB' + now(),
    patientId: p.id,
    patientName: p.name,
    token: p.token,
    phone: p.phone,
    tests: testsArr,
    testsLabel: testsArr.join(', '),
    status: 'Ordered',
    orderedBy: orderedBy || 'OPD Physician',
    orderedAt: now(),
    collectedAt: null,
    completedAt: null,
    techId: null,
    techName: null,
    resultValues: null,
    resultText: null
  };
  FEATURE.labOrders.unshift(order);
  audit(orderedBy, 'Lab order created', order.id + ' · ' + p.token);
  bump('lab-order');
  return order;
}

function updateLabOrder(orderId, patch, actor) {
  const o = FEATURE.labOrders.find(x => x.id === orderId);
  if (!o) return null;
  Object.assign(o, patch);
  if (patch.status === 'Report ready') {
    o.completedAt = now();
    sendDemoSms(o.phone, 'OPD Lab: Report ready for token ' + o.token + '. Open Lab reports in the app to view/download PDF.', 'lab-report');
  }
  audit(actor, 'Lab order updated', orderId + ' · ' + (patch.status || ''));
  bump('lab-update');
  return o;
}

function createPharmacyOrder(patientId, items, amount, notes, actor) {
  const p = findPatient(patientId);
  if (!p) return null;
  const order = {
    id: 'PH' + now(),
    billNo: 'BILL-' + String(FEATURE.pharmacyOrders.length + 1001),
    patientId: p.id,
    patientName: p.name,
    token: p.token,
    items: items || p.prescription || '',
    prescription: p.prescription || '',
    amount: Number(amount) || 0,
    notes: notes || '',
    status: 'Preparing',
    paid: false,
    paymentStatus: 'unpaid',
    paymentMethod: null,
    paidAt: null,
    verifiedBy: null,
    dispensed: false,
    dispensedAt: null,
    ts: now()
  };
  FEATURE.pharmacyOrders.unshift(order);
  audit(actor, 'Pharmacy order created', order.billNo);
  bump('pharmacy-order');
  return order;
}

function verifyPayment(payId, actor) {
  const pay = FEATURE.payments.find(x => x.id === payId);
  if (!pay) return { ok: false, error: 'Not found' };
  if (pay.ledgered || pay.verified) return { ok: false, error: 'Already verified' };
  const amt = Number(pay.amount) || 0;
  pay.status = pay.method === 'Cash' ? 'collected' : 'verified';
  pay.verified = true;
  pay.verifiedBy = actor || 'Reception';
  pay.verifiedAt = now();
  pay.ledgered = true;
  FEATURE.wallet.balance = (FEATURE.wallet.balance || 0) + amt;
  FEATURE.wallet.ledger.unshift({
    ts: now(), delta: amt, balance: FEATURE.wallet.balance,
    note: 'Verified ' + pay.id + ' · ' + (pay.token || '') + ' · ' + pay.method,
    by: actor
  });
  if (pay.patientId) {
    const pt = findPatient(pay.patientId);
    if (pt) { pt.consultFeePaid = true; pt.paymentStatus = 'verified'; }
  }
  audit(actor, 'Payment verified', pay.id + ' ₹' + amt);
  bump('payment');
  return { ok: true, payment: pay, wallet: FEATURE.wallet };
}

function rejectPayment(payId, actor) {
  const pay = FEATURE.payments.find(x => x.id === payId);
  if (!pay) return { ok: false, error: 'Not found' };
  if (pay.ledgered) return { ok: false, error: 'Already ledgered' };
  pay.status = 'rejected';
  pay.verified = false;
  audit(actor, 'Payment rejected', pay.id);
  bump('payment');
  return { ok: true, payment: pay };
}

function markPharmacyPaid(orderId, method, actor) {
  const o = FEATURE.pharmacyOrders.find(x => x.id === orderId);
  if (!o) return null;
  o.paid = true;
  o.paymentMethod = method || 'Cash';
  o.paymentStatus = method === 'Cash' ? 'collected cash' : 'paid (demo verified)';
  o.paidAt = now();
  o.verifiedBy = actor || 'Staff';
  const amt = Number(o.amount) || 0;
  FEATURE.wallet.balance = (FEATURE.wallet.balance || 0) + amt;
  FEATURE.wallet.ledger.unshift({
    ts: now(), delta: amt, balance: FEATURE.wallet.balance,
    note: 'Pharmacy ' + (o.billNo || o.id), by: actor
  });
  FEATURE.payments.unshift({
    id: 'P' + now(), amount: amt, method: o.paymentMethod, status: 'verified',
    type: 'pharmacy', token: o.token, ts: now(), verified: true, ledgered: true
  });
  audit(actor, 'Pharmacy payment', (o.billNo || o.id) + ' ₹' + amt);
  bump('pharmacy-pay');
  return o;
}

function dispensePharmacy(orderId, actor) {
  const o = FEATURE.pharmacyOrders.find(x => x.id === orderId);
  if (!o) return null;
  if (!o.paid) return { error: 'Collect payment before dispensing' };
  o.dispensed = true;
  o.dispensedAt = now();
  o.status = 'Dispensed';
  audit(actor, 'Medicines dispensed', o.billNo || o.id);
  bump('dispense');
  return o;
}

function checkQueueSmsAlerts(dept) {
  const queue = waitingQueue(dept);
  queue.forEach((p, idx) => {
    if (!p.smsFlags) p.smsFlags = {};
    const ahead = idx;
    if (ahead === 2 && !p.smsFlags.twoAhead) {
      p.smsFlags.twoAhead = true;
      sendDemoSms(p.phone, 'OPD Alert: Token ' + p.token + ' — 2 patients ahead in ' + p.dept + '. Please stay nearby.', 'two-ahead');
    }
    if (ahead === 1 && !p.smsFlags.oneAhead) {
      p.smsFlags.oneAhead = true;
      sendDemoSms(p.phone, 'OPD Alert: Token ' + p.token + ' — only 1 patient ahead in ' + p.dept + '. Please be ready.', 'one-ahead');
    }
  });
}

function setDoctorAvailability(doctorId, availability) {
  const d = STATE.doctors.find(x => x.id === doctorId);
  if (!d) return null;
  d.availability = availability;
  bump('doctor-status');
  return d;
}

function resetDemo() {
  STATE = {
    patients: seedPatients(),
    doctors: seedDoctors(),
    receptionists: seedReceptionists(),
    labTechs: seedLabTechs(),
    pharmacyStaff: seedPharmacyStaff(),
    tokenSeq: { GM: 3, PD: 1, DR: 1, OR: 1, OT: 0 },
    auditLog: [{ ts: now(), actor: 'System', action: 'Reset shared demo data', detail: '' }],
    dayKey: todayKey()
  };
  FEATURE = seedFeatures();
  bump('reset');
  return snapshot();
}

function addSseClient(res) {
  sseClients.add(res);
  res.write('data: ' + JSON.stringify({ version, event: 'connected', ts: now() }) + '\n\n');
}

function removeSseClient(res) {
  sseClients.delete(res);
}

module.exports = {
  snapshot, bump, addSseClient, removeSseClient, getVersion: () => version,
  registerPatient, callNext, startConsult, noShow, completeConsult, cancelPatient,
  transferPatient, adjustPriority, checkIn, createLabOrder, updateLabOrder,
  createPharmacyOrder, verifyPayment, rejectPayment, markPharmacyPaid, dispensePharmacy,
  setDoctorAvailability, resetDemo, findPatient, waitingQueue,
  STATE, FEATURE, // live refs for read endpoints
  CONSULT_FEE, DEPTS
};
