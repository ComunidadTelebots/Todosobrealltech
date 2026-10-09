/**
 * Ayuda contextual automática para la web clásica, Mini App y captcha.
 * Usa data-help cuando existe y genera una explicación segura para el resto.
 */
(()=>{
  const HELP={
    "usuarios y baneos":"Permite consultar usuarios, revisar su historial y aplicar o retirar sanciones.",
    "proxies":"Muestra los proxies MTProto, su disponibilidad y las acciones de administración.",
    "bots conectados":"Permite supervisar bots, chats asociados y el estado de cada instancia.",
    "bots administrados":"Permite crear bots desde Telegram, conectarlos sin copiar tokens, restringir su acceso, rotar credenciales y desconectarlos.",
    "moon ia":"Gestiona las fuentes, el aprendizaje, los modelos y el comportamiento de la inteligencia artificial.",
    "cola de tareas":"Muestra procesos pendientes y permite cambiar su prioridad o cancelarlos.",
    "seguridad":"Reúne análisis CAS, VirusTotal, archivos, enlaces y controles contra amenazas.",
    "informes":"Genera y exporta estadísticas de actividad, seguridad y rendimiento.",
    "actividad":"Muestra el registro auditable de acciones administrativas.",
    "comunidad y eventos":"Gestiona perfiles, encuestas, mentorías, retos, concursos y eventos.",
    "grupos avanzados":"Compara, sincroniza y restaura configuraciones de varios grupos.",
    "centro avanzado":"Centraliza automatización, IA, analítica, integraciones y operaciones.",
    "respuestas automáticas":"Configura respuestas que el bot enviará cuando detecte preguntas o palabras clave.",
    "comunicado":"Envía un aviso global a los chats seleccionados.",
    "crear backup":"Crea una copia de seguridad de los datos y configuraciones.",
    "mantenimiento":"Limita temporalmente funciones mientras se realizan tareas técnicas.",
    "encuestas y clima":"Recoge opiniones de la comunidad y muestra los resultados agregados.",
    "eventos y agenda":"Gestiona inscripciones, cupos, recordatorios, asistencia y calendario.",
    "retos y clasificación":"Registra el progreso de retos y ordena a los participantes.",
    "mentoría":"Conecta miembros que necesitan ayuda con mentores disponibles.",
    "buzón anónimo":"Envía comentarios sin mostrar tu identidad a los administradores.",
    "tema":"Cambia la apariencia visual sin modificar las funciones.",
    "notificaciones":"Decide qué avisos quieres recibir y con qué frecuencia.",
    "directorio verificado":"Muestra miembros cuya identidad o función fue validada.",
    "configuración":"Modifica el comportamiento de esta función o grupo.",
    "permisos":"Define qué acciones puede realizar una persona, bot o integración.",
    "webhook":"Envía automáticamente eventos de Moonbot a otra aplicación mediante una URL.",
    "token":"Credencial privada para acceder a la API. No debes compartirla.",
    "virus total":"Comprueba archivos, hashes, dominios y enlaces con motores antivirus externos.",
    "cas":"Consulta si un usuario aparece en la lista comunitaria contra abusos de Telegram.",
    "mensajes enviados como canal":"Distingue el canal vinculado, que se ignora, de otros canales externos usados para publicar. Puedes banear estos últimos por grupo.",
    "interacción con otros bots":"Autoriza bots concretos para que Moonbot aprenda de sus mensajes y les responda solo cuando lo mencionen, aplicando límites contra bucles.",
  };
  const normalize=value=>String(value||"").replace(/\s+/g," ").trim().toLowerCase();
  function description(element){
    if(element.dataset.help)return element.dataset.help;
    const text=normalize(element.textContent||element.getAttribute("aria-label")||element.title);
    const match=Object.entries(HELP).find(([key])=>text.includes(key));
    if(match)return match[1];
    if(element.matches("label"))return `Este ajuste controla “${element.textContent.trim()}”. Puedes modificarlo y guardar los cambios.`;
    if(element.matches("summary,.dhead"))return `Abre esta sección para consultar y administrar “${element.textContent.trim()}”.`;
    return `Esta sección contiene información y controles relacionados con “${element.textContent.trim()}”.`;
  }
  function openHelp(title,text){
    let modal=document.getElementById("moonContextHelp");
    if(!modal){
      modal=document.createElement("div");modal.id="moonContextHelp";modal.className="moon-help-overlay";
      modal.innerHTML='<div class="moon-help-dialog" role="dialog" aria-modal="true"><button class="moon-help-close" aria-label="Cerrar">×</button><b class="moon-help-title"></b><p class="moon-help-text"></p></div>';
      document.body.appendChild(modal);modal.querySelector(".moon-help-close").onclick=()=>modal.hidden=true;
      modal.onclick=event=>{if(event.target===modal)modal.hidden=true;};
    }
    modal.querySelector(".moon-help-title").textContent=title;modal.querySelector(".moon-help-text").textContent=text;modal.hidden=false;
  }
  function enhance(root=document){
    root.querySelectorAll?.("h2,h3,summary,.dhead,.settings-group-title,label[data-help],.master-action").forEach(element=>{
      if(element.dataset.helpReady||element.closest("#moonContextHelp"))return;element.dataset.helpReady="1";
      const button=document.createElement(element.matches("button")?"span":"button");if(button.tagName==="BUTTON")button.type="button";else{button.setAttribute("role","button");button.tabIndex=0;}button.className="moon-help-button";
      button.textContent="?";button.setAttribute("aria-label",`Ayuda: ${element.textContent.trim()}`);
      button.onclick=event=>{event.preventDefault();event.stopPropagation();openHelp(element.textContent.replace("?","").trim(),description(element));};
      button.onkeydown=event=>{if(event.key==="Enter"||event.key===" "){event.preventDefault();button.click();}};
      element.appendChild(button);
    });
  }
  const style=document.createElement("style");style.textContent=`
    .moon-help-button{display:inline-grid;place-items:center;width:19px;height:19px;margin-left:7px;padding:0;border:1px solid currentColor;border-radius:50%;background:transparent;color:var(--text-muted,#94a3b8);font:700 12px/1 sans-serif;cursor:pointer;vertical-align:middle;opacity:.72}
    .moon-help-button:hover,.moon-help-button:focus{opacity:1;color:var(--primary,#8b5cf6);outline:2px solid color-mix(in srgb,var(--primary,#8b5cf6) 30%,transparent)}
    .moon-help-overlay{position:fixed;inset:0;z-index:9999;display:grid;place-items:center;padding:20px;background:rgba(2,6,23,.68);backdrop-filter:blur(5px)}
    .moon-help-overlay[hidden]{display:none}.moon-help-dialog{position:relative;width:min(430px,100%);padding:24px;border:1px solid rgba(148,163,184,.28);border-radius:18px;background:var(--surface,#111827);color:var(--text,#f8fafc);box-shadow:0 24px 70px rgba(0,0,0,.4)}
    .moon-help-title{display:block;padding-right:28px;font-size:18px}.moon-help-text{margin:12px 0 0;color:var(--text-muted,#cbd5e1);line-height:1.55}.moon-help-close{position:absolute;right:12px;top:10px;border:0;background:transparent;color:inherit;font-size:24px;cursor:pointer}
  `;document.head.appendChild(style);
  window.addEventListener("DOMContentLoaded",()=>{enhance();new MutationObserver(changes=>changes.forEach(change=>change.addedNodes.forEach(node=>{if(node.nodeType===1)enhance(node);}))).observe(document.body,{childList:true,subtree:true});});
})();
