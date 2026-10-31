/**
 * OPD Queue — shared live demo server (zero npm deps beyond what we install).
 * REST + Server-Sent Events for multi-device sync.
 */
const http = require('http');
const fs = require('fs');
const path = require('path');
const { URL } = require('url');
const store = require('./store');

const PORT = process.env.PORT || 3847;
const PUBLIC = path.join(__dirname, '..', 'public');

function send(res, status, body, extraHeaders) {
  const json = typeof body === 'string' ? body : JSON.stringify(body);
  const headers = Object.assign({
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,POST,PUT,PATCH,DELETE,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-Actor, X-Role'
  }, extraHeaders || {});
  res.writeHead(status, headers);
  res.end(json);
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', c => chunks.push(c));
    req.on('end', () => {
      const raw = Buffer.concat(chunks).toString('utf8');
      if (!raw) return resolve({});
      try { resolve(JSON.parse(raw)); }
      catch (e) { reject(new Error('Invalid JSON')); }
    });
    req.on('error', reject);
  });
}

function actorOf(req, body) {
  return (req.headers['x-actor'] || (body && body.actor) || 'Staff').toString().slice(0, 80);
}

function contentType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const map = {
    '.html': 'text/html; charset=utf-8',
    '.js': 'application/javascript; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.json': 'application/json',
    '.png': 'image/png',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon',
    '.webmanifest': 'application/manifest+json'
  };
  return map[ext] || 'application/octet-stream';
}

function serveStatic(req, res, urlPath) {
  let rel = urlPath === '/' ? '/index.html' : urlPath;
  rel = decodeURIComponent(rel).replace(/\?.*$/, '');
  if (rel.includes('..')) {
    res.writeHead(403); res.end('Forbidden'); return;
  }
  const filePath = path.join(PUBLIC, rel);
  if (!filePath.startsWith(PUBLIC)) {
    res.writeHead(403); res.end('Forbidden'); return;
  }
  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('Not found');
      return;
    }
    res.writeHead(200, {
      'Content-Type': contentType(filePath),
      'Cache-Control': rel === '/index.html' ? 'no-cache' : 'public, max-age=60'
    });
    res.end(data);
  });
}

async function handleApi(req, res, pathname) {
  const method = req.method;

  if (method === 'OPTIONS') {
    send(res, 204, '');
    return;
  }

  // Live snapshot
  if (method === 'GET' && pathname === '/api/state') {
    send(res, 200, store.snapshot());
    return;
  }

  if (method === 'GET' && pathname === '/api/version') {
    send(res, 200, { version: store.getVersion() });
    return;
  }

  // SSE live stream
  if (method === 'GET' && pathname === '/api/events') {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
      'Access-Control-Allow-Origin': '*'
    });
    store.addSseClient(res);
    req.on('close', () => store.removeSseClient(res));
    return;
  }

  let body = {};
  if (method === 'POST' || method === 'PUT' || method === 'PATCH') {
    try { body = await readBody(req); }
    catch (e) { send(res, 400, { error: e.message }); return; }
  }
  const actor = actorOf(req, body);

  if (method === 'POST' && pathname === '/api/register') {
    const p = store.registerPatient(body, actor);
    send(res, 201, { ok: true, patient: p, version: store.getVersion() });
    return;
  }

  if (method === 'POST' && pathname === '/api/call-next') {
    const n = store.callNext(body.dept, body.doctorId, actor);
    if (!n) { send(res, 400, { error: 'No patients waiting or invalid doctor' }); return; }
    send(res, 200, { ok: true, patient: n, version: store.getVersion() });
    return;
  }

  if (method === 'POST' && pathname === '/api/start-consult') {
    const p = store.startConsult(body.patientId, actor);
    if (!p) { send(res, 400, { error: 'Cannot start' }); return; }
    send(res, 200, { ok: true, patient: p, version: store.getVersion() });
    return;
  }

  if (method === 'POST' && pathname === '/api/no-show') {
    const p = store.noShow(body.patientId, actor);
    if (!p) { send(res, 400, { error: 'Cannot mark no-show' }); return; }
    send(res, 200, { ok: true, patient: p, version: store.getVersion() });
    return;
  }

  if (method === 'POST' && pathname === '/api/complete') {
    const p = store.completeConsult(body.patientId, body.fields || body, actor);
    if (!p) { send(res, 400, { error: 'Cannot complete' }); return; }
    send(res, 200, { ok: true, patient: p, version: store.getVersion() });
    return;
  }

  if (method === 'POST' && pathname === '/api/cancel') {
    const p = store.cancelPatient(body.patientId, body.reason, actor);
    if (!p) { send(res, 400, { error: 'Cannot cancel' }); return; }
    send(res, 200, { ok: true, patient: p, version: store.getVersion() });
    return;
  }

  if (method === 'POST' && pathname === '/api/transfer') {
    const r = store.transferPatient(body.patientId, body.newDept, body.reason, actor);
    if (!r.ok) { send(res, 400, r); return; }
    send(res, 200, { ok: true, patient: r.patient, version: store.getVersion() });
    return;
  }

  if (method === 'POST' && pathname === '/api/priority') {
    const r = store.adjustPriority(body.patientId, body.flag, body.reason, actor);
    if (!r.ok) { send(res, 400, r); return; }
    send(res, 200, { ok: true, patient: r.patient, version: store.getVersion() });
    return;
  }

  if (method === 'POST' && pathname === '/api/checkin') {
    const p = store.checkIn(body.patientId);
    if (!p) { send(res, 404, { error: 'Patient not found' }); return; }
    send(res, 200, { ok: true, patient: p, version: store.getVersion() });
    return;
  }

  if (method === 'POST' && pathname === '/api/lab-order') {
    const o = store.createLabOrder(body.patientId, body.tests, actor);
    if (!o) { send(res, 404, { error: 'Patient not found' }); return; }
    send(res, 201, { ok: true, order: o, version: store.getVersion() });
    return;
  }

  if (method === 'POST' && pathname === '/api/lab-update') {
    const o = store.updateLabOrder(body.orderId, body.patch || body, actor);
    if (!o) { send(res, 404, { error: 'Order not found' }); return; }
    send(res, 200, { ok: true, order: o, version: store.getVersion() });
    return;
  }

  if (method === 'POST' && pathname === '/api/pharmacy-order') {
    const o = store.createPharmacyOrder(body.patientId, body.items, body.amount, body.notes, actor);
    if (!o) { send(res, 404, { error: 'Patient not found' }); return; }
    send(res, 201, { ok: true, order: o, version: store.getVersion() });
    return;
  }

  if (method === 'POST' && pathname === '/api/pharmacy-pay') {
    const o = store.markPharmacyPaid(body.orderId, body.method, actor);
    if (!o) { send(res, 404, { error: 'Order not found' }); return; }
    send(res, 200, { ok: true, order: o, version: store.getVersion() });
    return;
  }

  if (method === 'POST' && pathname === '/api/pharmacy-dispense') {
    const o = store.dispensePharmacy(body.orderId, actor);
    if (!o || o.error) { send(res, 400, o || { error: 'Failed' }); return; }
    send(res, 200, { ok: true, order: o, version: store.getVersion() });
    return;
  }

  if (method === 'POST' && pathname === '/api/payment-verify') {
    const r = store.verifyPayment(body.paymentId, actor);
    if (!r.ok) { send(res, 400, r); return; }
    send(res, 200, Object.assign({ version: store.getVersion() }, r));
    return;
  }

  if (method === 'POST' && pathname === '/api/payment-reject') {
    const r = store.rejectPayment(body.paymentId, actor);
    if (!r.ok) { send(res, 400, r); return; }
    send(res, 200, Object.assign({ version: store.getVersion() }, r));
    return;
  }

  if (method === 'POST' && pathname === '/api/doctor-availability') {
    const d = store.setDoctorAvailability(body.doctorId, body.availability);
    if (!d) { send(res, 404, { error: 'Doctor not found' }); return; }
    send(res, 200, { ok: true, doctor: d, version: store.getVersion() });
    return;
  }

  if (method === 'POST' && pathname === '/api/reset') {
    const snap = store.resetDemo();
    send(res, 200, { ok: true, message: 'Demo data reset', version: snap.version });
    return;
  }

  // Generic patch for patient fields (notes draft, etc.)
  if (method === 'POST' && pathname === '/api/patient-patch') {
    const p = store.findPatient(body.patientId);
    if (!p) { send(res, 404, { error: 'Not found' }); return; }
    const allowed = ['notes', 'diagnosis', 'prescription', 'followUp', 'rxSent', 'rxSendMethod', 'finalFeePaid', 'finalFeeAmount', 'finalFeeMethod', 'finalFeeTs'];
    allowed.forEach(k => {
      if (body[k] !== undefined) p[k] = body[k];
    });
    store.bump('patient-patch');
    send(res, 200, { ok: true, patient: p, version: store.getVersion() });
    return;
  }

  if (method === 'POST' && pathname === '/api/appointment') {
    const a = {
      id: 'a' + Date.now(),
      patientName: body.patientName || 'Walk-in',
      dept: body.dept,
      doctorId: body.doctorId || '',
      date: body.date,
      slot: body.slot,
      status: 'booked',
      visitType: 'Appointment'
    };
    store.FEATURE.appointments.unshift(a);
    store.bump('appointment');
    send(res, 201, { ok: true, appointment: a, version: store.getVersion() });
    return;
  }

  if (method === 'POST' && pathname === '/api/feedback') {
    store.FEATURE.feedback.unshift({ rating: body.rating, comment: body.comment, ts: Date.now() });
    store.bump('feedback');
    send(res, 201, { ok: true, version: store.getVersion() });
    return;
  }

  send(res, 404, { error: 'Unknown API route', path: pathname });
}

const server = http.createServer(async (req, res) => {
  try {
    const u = new URL(req.url || '/', 'http://localhost');
    const pathname = u.pathname;
    if (pathname.startsWith('/api/')) {
      await handleApi(req, res, pathname);
      return;
    }
    serveStatic(req, res, pathname);
  } catch (e) {
    console.error(e);
    send(res, 500, { error: 'Server error', detail: String(e.message || e) });
  }
});

server.listen(PORT, '0.0.0.0', () => {
  console.log('OPD shared live demo listening on http://0.0.0.0:' + PORT);
  console.log('Open http://localhost:' + PORT + '/ in multiple browsers to share the queue');
  console.log('API: GET /api/state  ·  SSE /api/events  ·  POST /api/* mutations');
});
