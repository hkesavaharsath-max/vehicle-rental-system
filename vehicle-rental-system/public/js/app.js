const $ = (s) => document.querySelector(s);
const money = (n) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(Number(n) || 0);
const today = new Date();
const localDate = (d) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
const todayStr = localDate(today);
['#search-pickup','#pickup-date'].forEach(s => { $(s).min = todayStr; $(s).value = todayStr; });
const tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate()+1);
['#search-return','#return-date'].forEach(s => { $(s).min = localDate(tomorrow); $(s).value = localDate(tomorrow); });

let vehicles = [];
async function api(url, options={}) {
  const response = await fetch(url, { headers: { 'Content-Type':'application/json', ...(options.headers||{}) }, ...options });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || 'Something went wrong.');
  return data;
}
function setMessage(selector, message, isError=false) {
  const el=$(selector); el.textContent=message; el.classList.toggle('error',isError);
}
function escapeHtml(value='') {
  return String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}
function renderVehicles(list) {
  $('#vehicle-count').textContent = `${list.length} vehicle${list.length===1?'':'s'} found`;
  $('#vehicle-grid').innerHTML = list.length ? list.map(v => `
    <article class="vehicle-card">
      <img src="${escapeHtml(v.image_url || 'https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?auto=format&fit=crop&w=900&q=80')}" alt="${escapeHtml(v.name)}" loading="lazy" onerror="this.src='https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?auto=format&fit=crop&w=900&q=80'">
      <div class="vehicle-body"><div class="vehicle-top"><span class="category">${escapeHtml(v.category)}</span><span class="category">✓ Listed</span></div>
      <h3>${escapeHtml(v.name)}</h3><p>${escapeHtml(v.description || 'A reliable ride for your next journey.')}</p>
      <div class="vehicle-foot"><span class="price">${money(v.price_per_day)} <small>/ day</small></span><button class="small-button" data-book="${v.id}">Book this →</button></div></div>
    </article>`).join('') : '<div class="empty">No vehicles found for those dates. Try another date range.</div>';
  $('#vehicle-select').innerHTML = '<option value="">Choose a vehicle</option>' + list.map(v => `<option value="${v.id}" data-price="${v.price_per_day}">${escapeHtml(v.name)} — ${money(v.price_per_day)}/day</option>`).join('');
}
async function loadVehicles(pickup='', returnDate='') {
  $('#vehicle-grid').innerHTML = '<p class="muted">Loading vehicles…</p>';
  try {
    const query = pickup && returnDate ? `?pickup=${encodeURIComponent(pickup)}&returnDate=${encodeURIComponent(returnDate)}` : '';
    vehicles = await api('/api/vehicles'+query); renderVehicles(vehicles);
  } catch (e) { $('#vehicle-grid').innerHTML = `<p class="empty">${escapeHtml(e.message)} Start the server and check your database settings.</p>`; }
}
async function loadBookings() {
  try {
    const bookings = await api('/api/bookings');
    $('#booking-table').innerHTML = bookings.length ? bookings.map(b => `<tr>
      <td>#${b.id}</td><td>${escapeHtml(b.customer_name)}<br><span class="muted">${escapeHtml(b.customer_email)}</span></td>
      <td>${escapeHtml(b.vehicle_name)}</td><td>${escapeHtml(String(b.pickup_date).slice(0,10))} → ${escapeHtml(String(b.return_date).slice(0,10))}</td>
      <td><strong>${money(b.total_amount)}</strong></td><td><span class="status ${b.status==='Cancelled'?'cancelled':''}">${escapeHtml(b.status)}</span></td>
      <td>${b.status==='Booked'?`<button class="small-button" data-cancel="${b.id}">Cancel</button>`:'—'}</td></tr>`).join('') : '<tr><td colspan="7" class="empty">No bookings yet. Make your first reservation above.</td></tr>';
  } catch(e) { $('#booking-table').innerHTML = `<tr><td colspan="7">${escapeHtml(e.message)}</td></tr>`; }
}
function updateEstimate() {
  const opt = $('#vehicle-select').selectedOptions[0];
  const start = new Date(`${$('#pickup-date').value}T00:00:00`);
  const end = new Date(`${$('#return-date').value}T00:00:00`);
  const days = Math.ceil((end-start)/86400000);
  $('#estimate').textContent = money(days>0 && opt?.dataset.price ? days*Number(opt.dataset.price) : 0);
}
$('#search-btn').addEventListener('click', () => {
  const p=$('#search-pickup').value, r=$('#search-return').value;
  if (!p || !r || r<=p) return alert('Choose a return date after the pickup date.');
  $('#pickup-date').value=p; $('#return-date').value=r; updateEstimate(); loadVehicles(p,r);
});
$('#reset-search').addEventListener('click', () => loadVehicles());
$('#vehicle-grid').addEventListener('click', e => {
  const btn=e.target.closest('[data-book]'); if(!btn) return;
  $('#vehicle-select').value=btn.dataset.book; updateEstimate(); $('#booking').scrollIntoView({behavior:'smooth'});
});
['#pickup-date','#return-date','#vehicle-select'].forEach(s => $(s).addEventListener('change', updateEstimate));
$('#booking-form').addEventListener('submit', async e => {
  e.preventDefault(); setMessage('#booking-message','Submitting booking…');
  const body=Object.fromEntries(new FormData(e.target).entries());
  body.vehicle_id=Number(body.vehicle_id);
  try {
    const result=await api('/api/bookings',{method:'POST',body:JSON.stringify(body)});
    setMessage('#booking-message',`${result.message} Booking #${result.booking_id}. Total: ${money(result.total_amount)}.`);
    e.target.reset(); $('#pickup-date').value=todayStr; $('#return-date').value=localDate(tomorrow); updateEstimate();
    await Promise.all([loadBookings(),loadVehicles()]);
  } catch(err) { setMessage('#booking-message',err.message,true); }
});
$('#refresh-bookings').addEventListener('click',loadBookings);
$('#booking-table').addEventListener('click',async e=>{
  const btn=e.target.closest('[data-cancel]'); if(!btn)return;
  if(!confirm('Cancel this booking?'))return;
  try{await api(`/api/bookings/${btn.dataset.cancel}/cancel`,{method:'PATCH'});await loadBookings();await loadVehicles();}catch(err){alert(err.message);}
});
$('#vehicle-form').addEventListener('submit',async e=>{
  e.preventDefault();setMessage('#vehicle-message','Adding vehicle…');
  const body=Object.fromEntries(new FormData(e.target).entries());body.price_per_day=Number(body.price_per_day);
  try{await api('/api/vehicles',{method:'POST',body:JSON.stringify(body)});e.target.reset();setMessage('#vehicle-message','Vehicle added successfully.');await loadVehicles();}
  catch(err){setMessage('#vehicle-message',err.message,true);}
});
loadVehicles();loadBookings();updateEstimate();