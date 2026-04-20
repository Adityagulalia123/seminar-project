(function(){
  // Simple localStorage-backed data models (simulated database)
  const db = {
    patients: 'hp_patients',
    appts: 'hp_appts',
    staff: 'hp_staff',
    stock: 'hp_stock',
    bills: 'hp_bills',
    users: 'hp_users',
    currentUser: 'hp_currentUser'
  };

  function load(key){return JSON.parse(localStorage.getItem(key)||'[]')}
  function save(key,arr){localStorage.setItem(key,JSON.stringify(arr))}
  function uid(){return Date.now().toString(36)+Math.random().toString(36).slice(2,6)}

  // Auth functions
  function signup(username, password, role){
    const users = load(db.users);
    if(users.find(u => u.username === username)) return false; // user exists
    users.push({id: uid(), username, password, role});
    save(db.users, users);
    return true;
  }

  function login(username, password){
    const users = load(db.users);
    const user = users.find(u => u.username === username && u.password === password);
    if(user){
      localStorage.setItem(db.currentUser, JSON.stringify(user));
      return user;
    }
    return null;
  }

  function logout(){
    localStorage.removeItem(db.currentUser);
    location.reload(); // simple reload to reset state
  }

  function getCurrentUser(){
    const user = localStorage.getItem(db.currentUser);
    return user ? JSON.parse(user) : null;
  }

  const rolePermissions = {
    dashboard: ['Admin','Front Desk','Doctor','Nurse','Pharmacist'],
    patients: ['Admin','Front Desk','Doctor','Nurse'],
    appointments: ['Admin','Front Desk','Doctor','Nurse'],
    staff: ['Admin'],
    pharmacy: ['Admin','Pharmacist'],
    billing: ['Admin','Front Desk']
  };

  function canAccessModule(moduleId){
    const user = getCurrentUser();
    return user && rolePermissions[moduleId] ? rolePermissions[moduleId].includes(user.role) : false;
  }

  function applyRoleAccess(){
    document.querySelectorAll('.nav-link').forEach(link => {
      const target = link.dataset.target;
      if(canAccessModule(target)) link.parentElement.classList.remove('d-none');
      else link.parentElement.classList.add('d-none');
    });

    document.querySelectorAll('main .module').forEach(module => {
      const id = module.id;
      if(id === 'dashboard' || canAccessModule(id)) module.classList.remove('d-none');
      else module.classList.add('d-none');
    });

    const activeLink = document.querySelector('.nav-link.active');
    if(activeLink && !canAccessModule(activeLink.dataset.target)){
      const firstVisible = document.querySelector('.nav-link:not(.d-none)');
      if(firstVisible){
        document.querySelectorAll('main .module').forEach(m=>m.classList.add('d-none'));
        document.getElementById(firstVisible.dataset.target).classList.remove('d-none');
        document.querySelectorAll('.nav-link').forEach(x=>x.classList.remove('active'));
        firstVisible.classList.add('active');
      }
    }
  }

  function checkAuth(){
    const user = getCurrentUser();
    if(user){
      document.getElementById('auth').classList.add('d-none');
      document.getElementById('app').classList.remove('d-none');
      document.getElementById('userName').textContent = user.username;
      document.getElementById('currentRole').textContent = user.role;
      renderDashboard(); renderPatients(); renderAppts(); renderStaff(); renderStock(); renderBills();
      applyRoleAccess();
    } else {
      document.getElementById('auth').classList.remove('d-none');
      document.getElementById('app').classList.add('d-none');
    }
  }

  // Navigation
  document.querySelectorAll('.nav-link').forEach(a=>a.addEventListener('click',e=>{
    e.preventDefault();
    const target = a.dataset.target;
    if(!canAccessModule(target)){
      alert('Access denied for your role.');
      return;
    }
    document.querySelectorAll('main .module').forEach(m=>m.classList.add('d-none'));
    document.getElementById(target).classList.remove('d-none');
    document.querySelectorAll('.nav-link').forEach(x=>x.classList.remove('active'));
    a.classList.add('active');
  }));

  // Auth event listeners
  document.getElementById('loginForm').addEventListener('submit', e => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const user = login(fd.get('username'), fd.get('password'));
    if(user){
      checkAuth();
    } else {
      alert('Invalid credentials');
    }
  });

  document.getElementById('signupForm').addEventListener('submit', e => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const success = signup(fd.get('username'), fd.get('password'), fd.get('role'));
    if(success){
      alert('Account created! Please login.');
      document.getElementById('signup').classList.add('d-none');
      document.getElementById('login').classList.remove('d-none');
    } else {
      alert('Username already exists');
    }
  });

  document.getElementById('showSignup').addEventListener('click', e => {
    e.preventDefault();
    document.getElementById('login').classList.add('d-none');
    document.getElementById('signup').classList.remove('d-none');
  });

  document.getElementById('showLogin').addEventListener('click', e => {
    e.preventDefault();
    document.getElementById('signup').classList.add('d-none');
    document.getElementById('login').classList.remove('d-none');
  });

  document.getElementById('logout').addEventListener('click', logout);

  // Patients
  const patientForm=document.getElementById('patientForm');
  const patientList=document.getElementById('patientList');
  function renderPatients(){
    const items=load(db.patients);
    patientList.innerHTML='';
    items.forEach(p=>{
      const el=document.createElement('div'); el.className='list-group-item';
      el.innerHTML=`<div class="d-flex w-100 justify-content-between"><strong>${p.name}</strong><small class="meta">Bed: ${p.bed||'-'}</small></div>
        <div class="meta">DOB: ${p.dob||'-'} | Emergency: ${p.emergency||'-'} | Notes: ${p.notes||'-'}</div>
        <div class="mt-2"><button data-id="${p.id}" class="btn btn-sm btn-outline-primary me-2 edit-patient">Edit</button>
        <button data-id="${p.id}" class="btn btn-sm btn-outline-danger del-patient">Delete</button></div>`;
      patientList.appendChild(el);
    });
  }
  patientForm.addEventListener('submit',e=>{
    e.preventDefault();
    if(!canAccessModule('patients')) return alert('Access denied for patient management.');
    const fd=new FormData(patientForm); const obj={id:uid(),name:fd.get('name'),dob:fd.get('dob'),emergency:fd.get('emergency'),notes:fd.get('notes'),bed:fd.get('bed')};
    const arr=load(db.patients); arr.push(obj); save(db.patients,arr); patientForm.reset(); renderPatients();
  });
  patientList.addEventListener('click',e=>{
    if(e.target.classList.contains('del-patient')){const id=e.target.dataset.id; save(db.patients, load(db.patients).filter(x=>x.id!==id)); renderPatients();}
    if(e.target.classList.contains('edit-patient')){const id=e.target.dataset.id; const p=load(db.patients).find(x=>x.id===id); if(!p) return; Object.entries(p).forEach(([k,v])=>{ if(patientForm[k]) patientForm[k].value=v });}
  });

  // Appointments
  const apptForm=document.getElementById('apptForm'); const apptList=document.getElementById('apptList');
  function renderAppts(){const items=load(db.appts); apptList.innerHTML=''; items.sort((a,b)=>a.time>b.time?1:-1).forEach(a=>{const el=document.createElement('div'); el.className='list-group-item'; el.innerHTML=`<div class="d-flex w-100 justify-content-between"><strong>${a.doctor}</strong><small class="meta">${new Date(a.time).toLocaleString()}</small></div><div class="meta">Patient: ${a.patientId||'-'} | Notes: ${a.notes||'-'}</div>
      <div class="mt-2"><button data-id="${a.id}" class="btn btn-sm btn-outline-danger del-appt">Cancel</button></div>`; apptList.appendChild(el);}); }
  apptForm.addEventListener('submit',e=>{
    e.preventDefault();
    if(!canAccessModule('appointments')) return alert('Access denied for appointments.');
    const fd=new FormData(apptForm); const obj={id:uid(),patientId:fd.get('patientId'),doctor:fd.get('doctor'),time:fd.get('time'),notes:fd.get('notes')}; const arr=load(db.appts); arr.push(obj); save(db.appts,arr); apptForm.reset(); renderAppts(); });
  apptList.addEventListener('click',e=>{ if(e.target.classList.contains('del-appt')){ save(db.appts, load(db.appts).filter(x=>x.id!==e.target.dataset.id)); renderAppts(); } });

  // Staff
  const staffForm=document.getElementById('staffForm'); const staffList=document.getElementById('staffList');
  function renderStaff(){const items=load(db.staff); staffList.innerHTML=''; items.forEach(s=>{const el=document.createElement('div'); el.className='list-group-item'; el.innerHTML=`<div class="d-flex w-100 justify-content-between"><strong>${s.name}</strong><small class="meta">${s.role}</small></div><div class="meta">Shift: ${s.shift||'-'}</div>`; staffList.appendChild(el);});}
  staffForm.addEventListener('submit',e=>{
    e.preventDefault();
    if(!canAccessModule('staff')) return alert('Access denied for staff management.');
    const fd=new FormData(staffForm); const obj={id:uid(),name:fd.get('name'),role:fd.get('role'),shift:fd.get('shift')}; const arr=load(db.staff); arr.push(obj); save(db.staff,arr); staffForm.reset(); renderStaff();});

  // Pharmacy / Inventory
  const stockForm=document.getElementById('stockForm'); const stockList=document.getElementById('stockList');
  function renderStock(){const items=load(db.stock); stockList.innerHTML=''; items.forEach(s=>{const el=document.createElement('div'); el.className='list-group-item'; const low = s.qty<=5; const exp = s.expiry && new Date(s.expiry) - Date.now() < 1000*60*60*24*30; if(low) el.classList.add('lowstock'); if(exp) el.classList.add('expiring'); el.innerHTML=`<div class="d-flex w-100 justify-content-between"><strong>${s.name}</strong><small class="meta">Qty: ${s.qty}</small></div><div class="meta">Expiry: ${s.expiry||'-'}</div>
      <div class="mt-2"><button data-id="${s.id}" class="btn btn-sm btn-outline-danger del-stock">Remove</button></div>`; stockList.appendChild(el);});}
  stockForm.addEventListener('submit',e=>{
    e.preventDefault();
    if(!canAccessModule('pharmacy')) return alert('Access denied for pharmacy inventory.');
    const fd=new FormData(stockForm); const name=fd.get('name'); const qty=Number(fd.get('qty')||0); const expiry=fd.get('expiry'); const arr=load(db.stock); const existing=arr.find(x=>x.name.toLowerCase()===name.toLowerCase()); if(existing){ existing.qty += qty; existing.expiry = expiry || existing.expiry; } else { arr.push({id:uid(),name,qty,expiry}); } save(db.stock,arr); stockForm.reset(); renderStock();});
  stockList.addEventListener('click',e=>{ if(e.target.classList.contains('del-stock')){ save(db.stock, load(db.stock).filter(x=>x.id!==e.target.dataset.id)); renderStock(); } });

  // Billing
  const billForm=document.getElementById('billForm'); const billList=document.getElementById('billList');
  function renderBills(){
    const items=load(db.bills);
    billList.innerHTML='';
    items.forEach(b=>{
      const el=document.createElement('div'); el.className='list-group-item';
      el.innerHTML=`<div class="d-flex w-100 justify-content-between"><strong>${b.desc}</strong><small class="meta">$${Number(b.amount).toFixed(2)}</small></div><div class="meta">Patient: ${b.patientId||'-'} | Status: ${b.status||'Open'}</div>
        <div class="mt-2"><button data-id="${b.id}" class="btn btn-sm btn-outline-danger del-bill">Delete</button></div>`;
      billList.appendChild(el);
    });
  }
  billForm.addEventListener('submit',e=>{
    e.preventDefault();
    if(!canAccessModule('billing')) return alert('Access denied for billing.');
    const fd=new FormData(billForm); const obj={id:uid(),patientId:fd.get('patientId'),desc:fd.get('desc'),amount:Number(fd.get('amount')||0),status:'Open'}; const arr=load(db.bills); arr.push(obj); save(db.bills,arr); billForm.reset(); renderBills(); });
  billList.addEventListener('click',e=>{ if(e.target.classList.contains('del-bill')){ save(db.bills, load(db.bills).filter(x=>x.id!==e.target.dataset.id)); renderBills(); } });

  // Dashboard
  function renderDashboard(){
    const patients = load(db.patients);
    const appts = load(db.appts);
    const staff = load(db.staff);
    const stock = load(db.stock);
    document.getElementById('patientCount').textContent = patients.length;
    document.getElementById('apptCount').textContent = appts.length;
    document.getElementById('staffCount').textContent = staff.length;
    document.getElementById('lowStockCount').textContent = stock.filter(s => s.qty <= 5).length;
  }

  // Sample-data helper
  function seed(){ if(localStorage.getItem('__seeded')) return; save(db.patients,[{id:'p1',name:'Alice Doe',dob:'1990-04-12',emergency:'Bob Doe',notes:'Peanut allergy',bed:'A12'}]); save(db.staff,[{id:'s1',name:'Dr. John',role:'Doctor',shift:'Mon-Fri 08:00-16:00'}]); save(db.stock,[{id:'d1',name:'Paracetamol',qty:12,expiry:'2026-12-31'},{id:'d2',name:'Amoxicillin',qty:3,expiry:'2026-03-10'}]); save(db.appts,[]); save(db.bills,[]); save(db.users, [{id:'u1', username:'admin', password:'admin', role:'Admin'}]); localStorage.setItem('__seeded','1'); }

  // Init
  seed(); checkAuth();

})();