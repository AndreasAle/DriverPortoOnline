/* ===== Helpers ===== */
function $(id){ return document.getElementById(id.replace('#','')); }
function $$(sel){ return Array.from(document.querySelectorAll(sel)); }
const esc = s => String(s||'').replace(/[&<>"']/g, m=>({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[m]));

/* ========= Router ========= */
const screens={welcome:$('#screen-welcome'),select:$('#screen-select'),ride:$('#screen-ride')};
function showScreen(k){
  Object.values(screens).forEach(s=>s.classList.remove('active'));
  screens[k].classList.add('active');
  if(k==='ride') setTimeout(()=>rideMap.invalidateSize(),200);
  window.scrollTo({top:0,behavior:'instant'});
}
$('#btnGetStarted').onclick=()=>showScreen('select');
$$('.mode.disabled').forEach(el=>el.onclick=()=>$('#modalWIP').style.display='flex');
$('#btnSelectInfo').onclick=()=>$('#modalWIP').style.display='flex';
$('#wip-ok').onclick=()=>$('#modalWIP').style.display='none';
$('#mode-motor').onclick=()=>$('#btnSelectContinue').click();
$('#btnSelectContinue').onclick=()=>{ $('#ride-to').value=$('#sel-to').value; showScreen('ride'); };

/* ========= Util ========= */
const FARE_PER_KM=10000, ADMIN_FEE=1000, SPEED_LIMIT=60; // km/h
const fmtIDR=n=>'Rp'+n.toLocaleString('id-ID');
const toLL=p=>`Lat ${p.lat.toFixed(5)}, Lng ${p.lng.toFixed(5)}`;
const hav=(a,b)=>{const R=6371000,dLat=(b.lat-a.lat)*Math.PI/180,dLng=(b.lng-a.lng)*Math.PI/180,s1=Math.sin(dLat/2),s2=Math.sin(dLng/2);const A=s1*s1+Math.cos(a.lat*Math.PI/180)*Math.cos(b.lat*Math.PI/180)*s2*s2;return 2*R*Math.atan2(Math.sqrt(A),Math.sqrt(1-A));};
const bearing=(a,b)=>{const toRad=x=>x*Math.PI/180,toDeg=x=>x*180/Math.PI;const y=Math.sin(toRad(b.lng-a.lng))*Math.cos(toRad(b.lat));const x=Math.cos(toRad(a.lat))*Math.sin(toRad(b.lat))-Math.sin(toRad(a.lat))*Math.cos(toRad(b.lat))*Math.cos(toRad(b.lng-a.lng));return (toDeg(Math.atan2(y,x))+360)%360;};
function toast(msg){const t=$('toast');t.textContent=msg||t.textContent;t.style.display='block'; setTimeout(()=>t.style.display='none',2600);}

/* ========= Map ========= */
const rideMap=L.map('ride-map').setView([-6.2,106.816],13);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{attribution:'© OpenStreetMap'}).addTo(rideMap);
// Tanpa L.Control.geocoder agar tidak ada request otomatis/400

/* ========= Suggestion pencarian (Photon -> fallback maps.co) ========= */
const suggestBox = $('#suggest');
let sugTimer=null, lastSug=[];
async function searchPhoton(q){
  const c=rideMap.getCenter();
  const url=`https://photon.komoot.io/api/?q=${encodeURIComponent(q)}&lang=id&limit=8&lat=${c.lat}&lon=${c.lng}`;
  const res=await fetch(url);
  if(!res.ok) throw new Error('photon-bad');
  const j=await res.json();
  return (j.features||[]).map(f=>{
    const p=f.properties||{};
    const name = p.name || p.street || p.osm_value || 'Tanpa nama';
    const parts=[p.street, p.city||p.county, p.state, p.country].filter(Boolean);
    const label = parts.join(', ');
    return { name, label, center:L.latLng(f.geometry.coordinates[1], f.geometry.coordinates[0]) };
  });
}
async function searchMapsCo(q){
  const url=`https://geocode.maps.co/search?q=${encodeURIComponent(q)}&limit=8`;
  const res=await fetch(url);
  if(!res.ok) throw new Error('mapsco-bad');
  const j=await res.json();
  return (j||[]).map(it=>{
    const name = (it.name || it.display_name || 'Tanpa nama');
    return { name, label: it.display_name || '', center:L.latLng(parseFloat(it.lat), parseFloat(it.lon)) };
  });
}
async function searchPlaces(q){
  try { const a=await searchPhoton(q); if(a.length) return a; } catch(_) {}
  try { const b=await searchMapsCo(q); if(b.length) return b; } catch(_) {}
  return [];
}
function renderSuggest(list){
  if(!list.length){ suggestBox.style.display='none'; suggestBox.innerHTML=''; return; }
  lastSug=list;
  suggestBox.innerHTML = `<div class="panel">` + list.map((it,i)=>
    `<div class="item" data-i="${i}"><b>${esc(it.name)}</b><small>${esc(it.label)}</small></div>`
  ).join('') + `</div>`;
  suggestBox.style.display='block';
  $$('#suggest .item').forEach(el=>{
    el.onclick=()=>{
      const it = lastSug[parseInt(el.dataset.i,10)];
      setDestination(it.center);
      rideMap.setView(it.center, 15);
      $('#ride-to').value = `${it.name} — ${it.label}`;
      suggestBox.style.display='none';
    };
  });
}
$('#ride-to').addEventListener('input', e=>{
  const q=e.target.value.trim();
  clearTimeout(sugTimer);
  if(q.length<2){ renderSuggest([]); return; }
  sugTimer=setTimeout(async ()=>{ renderSuggest(await searchPlaces(q)); }, 250);
});
document.addEventListener('click', (e)=>{ if(!suggestBox.contains(e.target) && e.target!==$('#ride-to')) renderSuggest([]); });
$('#ride-search').onclick=async ()=>{ const q=$('#ride-to').value.trim(); if(!q) return;
  const list=await searchPlaces(q);
  if(list.length){ setDestination(list[0].center); rideMap.setView(list[0].center, 15); $('#ride-to').value=`${list[0].name} — ${list[0].label}`; renderSuggest([]); }
  else alert('Tidak ditemukan.');
};

/* ========= State ========= */
let startLatLng=L.latLng(-6.2,106.816), endLatLng=null;
let startMarker,endMarker,gpsMarker,lastGps,lastTs,watchId=null,track=[],tStart=null,tEnd=null;
let routesData=[],routeLayers=[],selectedIndex=null;
const routeListEl=$('#routeList');
const driverIcon=L.divIcon({className:'driver',html:'<img id="driverDir" class="motor" src="https://cdn-icons-png.flaticon.com/512/741/741407.png"/>',iconSize:[32,32],iconAnchor:[16,16]});
function placeStart(){ if(startMarker) rideMap.removeLayer(startMarker); startMarker=L.marker(startLatLng).addTo(rideMap).bindPopup('Start'); }
function setDestination(c){ endLatLng=L.latLng(c.lat,c.lng); if(endMarker) rideMap.removeLayer(endMarker); endMarker=L.marker(endLatLng).addTo(rideMap).bindPopup('Tujuan'); $('#ride-to').value=toLL(endLatLng); $('#ride-summary').textContent='Tujuan dipilih. Klik RUTE.'; }
rideMap.on('click', e=>setDestination(e.latlng));
$('#ride-locate').onclick=()=>navigator.geolocation.getCurrentPosition(pos=>{startLatLng=L.latLng(pos.coords.latitude,pos.coords.longitude); rideMap.setView(startLatLng,15); placeStart(); $('#ride-from').value=toLL(startLatLng);}, _=>{placeStart(); $('#ride-from').value='Lokasi default (Jakpus)';},{enableHighAccuracy:true,timeout:8000,maximumAge:2000});

/* ========= Rute alternatif (OSRM, 3 opsi) ========= */
$('#ride-route').onclick=()=>{ if(!startLatLng||!endLatLng) return alert('Pilih start & tujuan dulu.'); fetchRoutes(); };
async function fetchRoutes(){
  routeLayers.forEach(l=>rideMap.removeLayer(l)); routeLayers=[]; routesData=[]; selectedIndex=null;
  routeListEl.style.display='none'; routeListEl.innerHTML='';
  const url=`https://router.project-osrm.org/route/v1/driving/${startLatLng.lng},${startLatLng.lat};${endLatLng.lng},${endLatLng.lat}?alternatives=3&continue_straight=true&overview=full&steps=false&geometries=geojson`;
  const r=await fetch(url); const j=await r.json(); if(j.code!=='Ok'||!j.routes?.length){alert('Gagal ambil rute.');return;}
  j.routes.forEach((rt,idx)=>{const coords=rt.geometry.coordinates.map(([lng,lat])=>[lat,lng]); routesData.push({coords,distance:rt.distance,duration:rt.duration});
    const layer=L.polyline(coords,{color:idx===0?'#1e63ff':'#8bb6ff',weight:idx===0?6:4,opacity:.95,lineCap:'round',lineJoin:'round'}).addTo(rideMap);
    layer.on('click',()=>selectRoute(idx)); routeLayers.push(layer);});
  const fastestIdx=routesData.map(r=>r.duration).reduce((best,cur,idx,arr)=>cur<arr[best]?idx:best,0);
  selectRoute(fastestIdx); renderRouteList(fastestIdx);
  const all=routesData.flatMap(r=>r.coords); rideMap.fitBounds(L.latLngBounds(all),{padding:[20,20]});
}
function renderRouteList(best){
  routeListEl.style.display='grid';
  routeListEl.innerHTML=routesData.map((r,i)=>{const km=(r.distance/1000).toFixed(1), m=Math.round(r.duration/60);
    const bestTag=i===best?'<span class="badge">Best</span>':''; return `<div class="route-item ${i===selectedIndex?'active':''}" data-i="${i}">
      <div class="left"><span class="dot"></span><b>${m} min</b> • ${km} km ${bestTag}</div>
      <div>${fmtIDR(Math.round(km*FARE_PER_KM)+ADMIN_FEE)}</div></div>`;}).join('');
  $$('#routeList .route-item').forEach(el=>el.onclick=()=>selectRoute(parseInt(el.dataset.i,10)));
}
function selectRoute(i){
  selectedIndex=i; routeLayers.forEach((l,idx)=>l.setStyle({color:idx===i?'#1e63ff':'#8bb6ff',weight:idx===i?6:4,opacity:idx===i?1:.7}));
  const km=(routesData[i].distance/1000).toFixed(1), m=Math.round(routesData[i].duration/60);
  $('#pillMins').textContent=`${m} min`; $('#ride-summary').innerHTML=`<b>Selected route:</b> ${m} min • ${km} km`;
  $('#ride-start').disabled=false; Array.from(routeListEl.children).forEach((c,idx)=>c.classList.toggle('active',idx===i));
}

/* ========= Reset ========= */
$('#ride-reset').onclick=()=>{ stopGPS();
  [startMarker,endMarker,gpsMarker].forEach(m=>m&&rideMap.removeLayer(m));
  routeLayers.forEach(l=>rideMap.removeLayer(l)); routeLayers=[]; routesData=[]; selectedIndex=null;
  startMarker=endMarker=gpsMarker=null; lastGps=lastTs=null; endLatLng=null; track=[]; tStart=tEnd=null;
  $('#ride-from').value=''; $('#ride-to').value=''; $('#ride-start').disabled=true; $('#ride-finish').disabled=true;
  $('#speedBanner').style.display='none'; $('#ride-summary').textContent='Pilih tujuan lalu klik RUTE.'; routeListEl.style.display='none'; routeListEl.innerHTML='';
  rideMap.setView([-6.2,106.816],13); $('#pillMins').textContent='—';
};

/* ========= Flow: Start → Finding → Driver → Cost ========= */
let findTimer=null, findTick=0;
$('#ride-start').onclick=()=>{ if(selectedIndex==null) return;
  $('#findingTick').textContent='0'; findTick=0; $('#modalFinding').style.display='flex';
  findTimer=setInterval(()=>{ findTick++; $('#findingTick').textContent=String(findTick); if(findTick>=5){ clearInterval(findTimer); $('#modalFinding').style.display='none'; $('#modalDriver').style.display='flex'; } },1000);
};
$('#d-cancel').onclick=()=>{ $('#modalDriver').style.display='none'; };
$('#d-continue').onclick=()=>{ $('#modalDriver').style.display='none';
  const km=(routesData[selectedIndex].distance/1000), ong=Math.round(km*FARE_PER_KM), tot=ong+ADMIN_FEE;
  $('#c-jarak').textContent=`${km.toFixed(1)} km`; $('#c-ongkos').textContent=fmtIDR(ong); $('#c-admin').textContent=fmtIDR(ADMIN_FEE); $('#c-total').textContent=fmtIDR(tot);
  $('#modalCost').style.display='flex';
};
$('#c-cancel').onclick=()=>$('#modalCost').style.display='none';
$('#c-ok').onclick=()=>{ $('#modalCost').style.display='none'; startGPS(); };

/* ========= GPS + Speed monitor ========= */
function startGPS(){
  $('#ride-start').disabled=true; $('#ride-finish').disabled=false;
  track=[]; tStart=Date.now(); lastGps=null; lastTs=null;
  const banner=$('#speedBanner'); banner.style.display='flex';
  watchId=navigator.geolocation.watchPosition(pos=>{
    const cur=L.latLng(pos.coords.latitude,pos.coords.longitude); const ts=Date.now();
    track.push(cur);
    if(!gpsMarker) gpsMarker=L.marker(cur,{icon:driverIcon}).addTo(rideMap); else gpsMarker.setLatLng(cur);
    if(lastGps && lastTs){
      const dt=(ts-lastTs)/1000; const d=hav(lastGps,cur); const v=(d/dt)*3.6; // km/h
      if(!startGPS.speeds) startGPS.speeds=[]; startGPS.speeds.push(v); if(startGPS.speeds.length>3) startGPS.speeds.shift();
      const vAvg = startGPS.speeds.reduce((a,b)=>a+b,0)/startGPS.speeds.length;

      const img=$('driverDir'); if(img) img.style.transform=`rotate(${bearing(lastGps,cur)}deg)`;
      const remain=endLatLng? (hav(cur,endLatLng)/1000).toFixed(2):'—';
      $('#ride-summary').innerHTML=`Sedang mengantar… sisa ≈ ${remain} km`;

      if(vAvg>SPEED_LIMIT){ banner.classList.remove('speed-ok'); banner.classList.add('speed-warn'); banner.textContent=`⚠️ Driver terlalu kencang (${vAvg.toFixed(0)} km/j) — tegur`; }
      else{ banner.classList.remove('speed-warn'); banner.classList.add('speed-ok'); banner.textContent=`✅ Kecepatan ideal (${vAvg.toFixed(0)} km/j)`; }
    }else{
      banner.classList.remove('speed-warn'); banner.classList.add('speed-ok'); banner.textContent='✅ Kecepatan ideal';
    }
    lastGps=cur; lastTs=ts; rideMap.panTo(cur,{animate:true});
  }, err=>{ alert('GPS error: '+err.message); }, {enableHighAccuracy:true, maximumAge:1000});
}
function stopGPS(){ if(watchId!==null){ navigator.geolocation.clearWatch(watchId); watchId=null; startGPS.speeds=[]; } }

/* ========= Finish + receipt ========= */
$('#f-pdf').onclick=downloadReceiptPDF; $('#f-html').onclick=downloadReceiptHTML; $('#f-save').onclick=()=>{ saveHistoryFromReceipt(); toast('Riwayat disimpan ✔'); };
$('#ride-finish').onclick=()=>{ stopGPS(); $('#ride-finish').disabled=true; tEnd=Date.now(); $('#speedBanner').style.display='none';
  let real=0; for(let i=1;i<track.length;i++) real+=hav(track[i-1],track[i]);
  const kmUsed=real>10? real/1000 : (routesData[selectedIndex]?.distance||0)/1000;
  const durMin=Math.max(1, Math.round((tEnd-tStart)/60000));
  const ong=Math.round(kmUsed*FARE_PER_KM), tot=ong+ADMIN_FEE;
  $('#f-waktu').textContent=new Date(tStart).toLocaleString('id-ID')+' - '+new Date(tEnd).toLocaleTimeString('id-ID');
  $('#f-durasi').textContent=durMin+' menit'; $('#f-jarak').textContent=`${kmUsed.toFixed(2)} km`; $('#f-ongkos').textContent=fmtIDR(ong); $('#f-admin').textContent=fmtIDR(ADMIN_FEE); $('#f-total').textContent=fmtIDR(tot);
  $('#modalFinish').style.display='flex';
  buildReceipt({start:toLL(startLatLng),end:toLL(endLatLng),km:kmUsed,dur:durMin,fare:ong,admin:ADMIN_FEE,total:tot,tstart:tStart});
  toast('Pengantaran selesai. Cek ringkasan & simpan struk.');
};

/* ========= Close modals on backdrop ========= */
['modalWIP','modalFinding','modalDriver','modalCost','modalFinish'].forEach(id=>{
  $('#'+id).addEventListener('click',e=>{ if(e.target.id===id) e.currentTarget.style.display='none'; });
});

/* ========= Receipt helpers ========= */
function buildReceipt(d){
  $('#r-meta').textContent=`Order time: ${new Date(d.tstart).toLocaleString('id-ID')}`;
  $('#r-from').textContent=d.start; $('#r-to').textContent=d.end;
  $('#r-jarak').textContent=`${d.km.toFixed(2)} km`; $('#r-durasi').textContent=`${d.dur} menit`;
  $('#r-ongkos').textContent=fmtIDR(d.fare); $('#r-total').textContent=fmtIDR(d.total);
}
function downloadReceiptPDF(){
  const opt={margin:10,filename:`struk_${Date.now()}.pdf`,image:{type:'jpeg',quality:0.98},html2canvas:{scale:2},jsPDF:{unit:'mm',format:'a4',orientation:'portrait'}};
  html2pdf().from($('#receipt')).set(opt).save();
}
function downloadReceiptHTML(){
  const html=`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Struk Perjalanan</title>
<style>body{font-family:Inter,Arial;padding:16px}table{width:100%;border-collapse:collapse}td{padding:6px 4px;border-bottom:1px solid #eee}.total{font-weight:800}</style>
</head><body>${$('#receipt').innerHTML}</body></html>`;
  const blob=new Blob([html],{type:'text/html'}); const url=URL.createObjectURL(blob); const a=document.createElement('a'); a.href=url; a.download=`struk_${Date.now()}.html`; a.click(); URL.revokeObjectURL(url);
}
function saveHistoryFromReceipt(){
  const rec={ts:Date.now(),from:$('#r-from').textContent,to:$('#r-to').textContent,jarak:$('#r-jarak').textContent,durasi:$('#r-durasi').textContent,ongkos:$('#r-ongkos').textContent,admin:'Rp1.000',total:$('#r-total').textContent};
  const key='rides_history'; const arr=JSON.parse(localStorage.getItem(key)||'[]'); arr.unshift(rec); localStorage.setItem(key,JSON.stringify(arr));
}

/* init */
placeStart();
$('#ride-from').value='Klik 📍 untuk ambil GPS (butuh HTTPS/localhost).';
