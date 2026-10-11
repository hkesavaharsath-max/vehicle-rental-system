require('dotenv').config();
const express = require('express');
const mysql = require('mysql2/promise');
const path = require('path');

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'vehicle_rental_db',
  waitForConnections: true,
  connectionLimit: 10,
  dateStrings: true
});

app.get('/api/health', async (_req, res) => {
  try { await pool.query('SELECT 1'); res.json({ ok: true, database: 'connected' }); }
  catch (e) { res.status(500).json({ ok: false, error: 'Database connection failed. Check your .env settings.' }); }
});

app.get('/api/vehicles', async (req, res) => {
  try {
    const { pickup, returnDate } = req.query;
    let sql = 'SELECT v.* FROM vehicles v';
    const params = [];
    if (pickup && returnDate) {
      sql += ` WHERE NOT EXISTS (
        SELECT 1 FROM bookings b WHERE b.vehicle_id = v.id AND b.status = 'Booked'
        AND b.pickup_date < ? AND b.return_date > ?
      )`;
      params.push(returnDate, pickup);
    }
    sql += ' ORDER BY v.id DESC';
    const [rows] = await pool.query(sql, params);
    res.json(rows);
  } catch (e) { res.status(500).json({ error: 'Could not load vehicles.' }); }
});

app.get('/api/bookings', async (_req, res) => {
  try {
    const [rows] = await pool.query(`SELECT b.*, v.name AS vehicle_name, v.category
      FROM bookings b JOIN vehicles v ON v.id=b.vehicle_id ORDER BY b.created_at DESC`);
    res.json(rows);
  } catch (e) { res.status(500).json({ error: 'Could not load bookings.' }); }
});

app.post('/api/bookings', async (req, res) => {
  const { customer_name, customer_email, vehicle_id, pickup_date, return_date } = req.body;
  if (!customer_name?.trim() || !customer_email?.trim() || !vehicle_id || !pickup_date || !return_date)
    return res.status(400).json({ error: 'Please fill in all booking fields.' });
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customer_email))
    return res.status(400).json({ error: 'Enter a valid email address.' });
  if (return_date <= pickup_date)
    return res.status(400).json({ error: 'Return date must be after pickup date.' });

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [vehicles] = await conn.query('SELECT * FROM vehicles WHERE id=? FOR UPDATE', [vehicle_id]);
    if (!vehicles.length) { await conn.rollback(); return res.status(404).json({ error: 'Vehicle not found.' }); }
    const [conflicts] = await conn.query(`SELECT id FROM bookings WHERE vehicle_id=? AND status='Booked'
      AND pickup_date < ? AND return_date > ? FOR UPDATE`, [vehicle_id, return_date, pickup_date]);
    if (conflicts.length) { await conn.rollback(); return res.status(409).json({ error: 'This vehicle is already booked for those dates.' }); }
    const start = new Date(`${pickup_date}T00:00:00Z`);
    const end = new Date(`${return_date}T00:00:00Z`);
    const days = Math.ceil((end - start) / 86400000);
    if (!Number.isFinite(days) || days < 1 || days > 365) {
      await conn.rollback(); return res.status(400).json({ error: 'Choose a rental period from 1 to 365 days.' });
    }
    const total = Number(vehicles[0].price_per_day) * days;
    const [result] = await conn.query(`INSERT INTO bookings
      (customer_name, customer_email, vehicle_id, pickup_date, return_date, total_amount)
      VALUES (?, ?, ?, ?, ?, ?)`,
      [customer_name.trim(), customer_email.trim(), vehicle_id, pickup_date, return_date, total]);
    await conn.commit();
    res.status(201).json({ message: 'Booking created successfully!', booking_id: result.insertId, total_amount: total });
  } catch (e) {
    await conn.rollback();
    res.status(500).json({ error: 'Booking failed. Check your database setup and try again.' });
  } finally { conn.release(); }
});

app.patch('/api/bookings/:id/cancel', async (req, res) => {
  try {
    const [result] = await pool.query(`UPDATE bookings SET status='Cancelled' WHERE id=? AND status='Booked'`, [req.params.id]);
    if (!result.affectedRows) return res.status(404).json({ error: 'Active booking not found.' });
    res.json({ message: 'Booking cancelled.' });
  } catch (e) { res.status(500).json({ error: 'Could not cancel booking.' }); }
});

app.post('/api/vehicles', async (req, res) => {
  const { name, category, registration_no, price_per_day, image_url, description } = req.body;
  if (!name?.trim() || !category?.trim() || !registration_no?.trim() || !(Number(price_per_day) > 0))
    return res.status(400).json({ error: 'Name, category, registration number and a positive daily price are required.' });
  try {
    const [r] = await pool.query(`INSERT INTO vehicles (name, category, registration_no, price_per_day, image_url, description)
      VALUES (?, ?, ?, ?, ?, ?)`, [name.trim(), category.trim(), registration_no.trim(), price_per_day, image_url || '', description || '']);
    res.status(201).json({ id: r.insertId, message: 'Vehicle added.' });
  } catch (e) {
    if (e.code === 'ER_DUP_ENTRY') return res.status(409).json({ error: 'That registration number already exists.' });
    res.status(500).json({ error: 'Could not add vehicle.' });
  }
});

app.delete('/api/vehicles/:id', async (req, res) => {
  try {
    const [r] = await pool.query('DELETE FROM vehicles WHERE id=?', [req.params.id]);
    if (!r.affectedRows) return res.status(404).json({ error: 'Vehicle not found.' });
    res.json({ message: 'Vehicle deleted.' });
  } catch (e) { res.status(409).json({ error: 'This vehicle may have booking records and cannot be deleted.' }); }
});

const port = Number(process.env.PORT) || 3000;
app.listen(port, () => console.log(`Vehicle Rental System running at http://localhost:${port}`));