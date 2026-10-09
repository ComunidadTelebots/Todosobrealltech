
  let hubMasterLoading = false;
  async function hubMasterRequest(path, options = {}) {
    if (!master || !hubMasterToken) throw new Error("Cierra y abre el Hub desde Telegram para validar tu sesión master.");
    const response = await fetch(path, {...options, headers: {"Content-Type":"application/json", Authorization:`Bearer ${hubMasterToken}`}, signal:AbortSignal.timeout(12000), cache:"no-store"});
    if (response.status === 401 || response.status === 403) {
      hubMasterToken = "";
      throw new Error("La sesión master ha caducado. Vuelve a abrir el Hub desde Telegram.");
    }
    if (!response.ok) throw new Error("Esta función no está disponible temporalmente.");
    const data = await response.json();
    if (!data.ok) throw new Error("No se pudo consultar Moonbot.");
    return data;
  }
  function hubMasterEscape(value) {
    const el=document.createElement("span"); el.textContent=String(value ?? "—"); return el.innerHTML;
  }
  async function loadIntegratedMaster() {
    const el=document.getElementById("v-master");
    if (!master) { el.textContent="Solo disponible para el master verificado por Telegram."; return; }
    if (hubMasterLoading) return;
    hubMasterLoading=true;
    el.innerHTML=`<div class="vtitle">Centro de control master</div><div class="vsub">Administra Moonbot sin salir de Telegram.</div>
      <div class="card"><h3>Sesión master verificada</h3><p>Panel integrado · versión estable</p></div>
      <div id="hubMasterStatus" aria-live="polite">Consultando estado…</div>
      <button class="btn ghost" id="hubMasterRefresh" disabled>Actualizar estado</button>
      <div class="sec">Administración</div>
      <button class="btn teal" id="hubMasterGroups">Grupos y canales</button>
      <button class="btn ghost" id="hubMasterSettings">Configuración y mantenimiento</button>
      <button class="btn ghost" id="hubMasterAudit">Auditoría administrativa</button>
      <div id="hubMasterDetail" style="margin-top:16px" aria-live="polite"></div>`;
    document.getElementById("hubMasterGroups").onclick=()=>showView("admin");
    document.getElementById("hubMasterSettings").onclick=loadIntegratedMasterSettings;
    document.getElementById("hubMasterAudit").onclick=loadIntegratedMasterAudit;
    document.getElementById("hubMasterRefresh").onclick=loadIntegratedMaster;
    try {
      const d=await hubMasterRequest("/api/status"), esc=hubMasterEscape;
      const metrics=[["CPU",d.cpu==null?null:d.cpu+" %"],["RAM",d.ram==null?null:d.ram+" %"],["Disco",d.disk==null?null:d.disk+" %"],["Tiempo activo",d.uptime]];
      document.getElementById("hubMasterStatus").innerHTML=`<div class="hub-master-metrics">${metrics.map(([k,v])=>`<div class="card"><p>${esc(k)}</p><b>${esc(v)}</b></div>`).join("")}</div><p class="muted">Versión ${esc(d.version)} · Lectura ${esc(new Date().toLocaleTimeString())}</p>`;
    } catch(e) { document.getElementById("hubMasterStatus").textContent=e.message; }
    finally { hubMasterLoading=false; document.getElementById("hubMasterRefresh").disabled=false; }
  }
  async function loadIntegratedMasterSettings() {
    const box=document.getElementById("hubMasterDetail");box.textContent="Cargando configuración…";
    try {
      const d=await hubMasterRequest("/api/settings");
      box.innerHTML=`<div class="card"><h3>Configuración</h3><label>Mensaje de bienvenida<textarea id="hubMasterWelcome" rows="3"></textarea></label><label style="display:block;margin:14px 0"><input type="checkbox" id="hubMasterMaintenance"> Modo mantenimiento</label><button class="btn teal" id="hubMasterSave">Guardar cambios</button><p id="hubMasterSaveResult" role="status"></p></div>`;
      document.getElementById("hubMasterWelcome").value=d.welcome_msg||"";
      document.getElementById("hubMasterMaintenance").checked=d.maintenance_mode===true;
      document.getElementById("hubMasterSave").onclick=async()=>{
        const button=document.getElementById("hubMasterSave"),result=document.getElementById("hubMasterSaveResult");
        if (!window.confirm("¿Guardar la configuración global de Moonbot? El mantenimiento afecta a todos los bots.")) return;
        button.disabled=true;
        try {
          await hubMasterRequest("/api/settings",{method:"POST",body:JSON.stringify({welcome_msg:document.getElementById("hubMasterWelcome").value,maintenance_mode:document.getElementById("hubMasterMaintenance").checked})});
          result.textContent="Configuración guardada.";
        } catch(e) { result.textContent=e.message; }
        finally { button.disabled=false; }
      };
    } catch(e) { box.textContent=e.message; }
  }
  async function loadIntegratedMasterAudit() {
    const box=document.getElementById("hubMasterDetail");box.textContent="Cargando auditoría…";
    try {
      const d=await hubMasterRequest("/api/audit");
      box.innerHTML='<div class="card"><h3>Auditoría administrativa</h3><pre style="white-space:pre-wrap;overflow-wrap:anywhere;font-size:12px"></pre></div>';
      box.querySelector("pre").textContent=JSON.stringify((Array.isArray(d.logs)?d.logs:[]).slice(-30),null,2);
    } catch(e) { box.textContent=e.message; }
  }
