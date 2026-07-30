import React,{useEffect,useMemo,useState}from'react';
import{Button}from'@/components/ui/button';import{Input}from'@/components/ui/input';
const iso=()=>new Date().toISOString();
const forms=[
[/(_incidents|_incident_correlation)$/,['Incidencia','Ámbito','Ventana'],['incident-1','group-1','15'],v=>({args:[[{id:v[0],community_id:v[1],at:iso()}],+v[2]],kwargs:{}})],
[/_workflow$/,['Flujo','Paso','Acción'],['Revisión','step-1','review'],v=>({args:[{name:v[0],steps:[{id:v[1],action:v[2]}]}],kwargs:{}})],
[/_delegation$/,['Delegado','Rol','Horas'],['user-1','community_moderator','24'],v=>({args:[{delegate_id:v[0],role:v[1],starts_at:iso(),expires_at:new Date(Date.now()+Number(v[2])*3600000).toISOString()},iso()],kwargs:{}})],
[/_coordinated_abuse$/,['Actor','Objetivo','Señal'],['user-1','target-1','spam'],v=>({args:[[{actor_id:v[0],target_id:v[1],kind:v[2]}]],kwargs:{}})],
[/_copilot$/,['Pregunta','Hecho','Acción'],['¿Qué ocurrió?','Revisión pendiente','explain'],v=>({args:[{facts:[v[1]],allowed_actions:[v[2]]},v[0]],kwargs:{}})],
[/(_capacity|_capacity_forecast)$/,['Histórico','Meses','Operadores'],['10,12,14','3','2'],v=>({args:[v[0].split(',').map(Number),+v[1],+v[2]],kwargs:{}})],
[/_batch_plan$/,['IDs','Acción','Simular'],['item-1,item-2','tag','true'],v=>({args:[v[0].split(',').map(x=>x.trim()).filter(Boolean),v[1],v[2]!=='false'],kwargs:{}})],
[/_workspace$/,['Nombre','Miembro','Objetivos'],['Equipo','user-1','item-1'],v=>({args:[v[0],[{account_id:v[1],role:'viewer'}],v[2].split(',')],kwargs:{}})],
[/(_media|_library)$/,['Archivo','MIME','Bytes'],['media-1','image/png','1024'],v=>({args:[[{id:v[0],mime:v[1],size:+v[2],sha256:'a'.repeat(64)}]],kwargs:{}})],
[/_narrative_report$/,['Frecuencia','Formato','Eventos'],['weekly','json','0'],v=>({args:[{frequency:v[0],format:v[1]},Array.from({length:+v[2]},(_,i)=>({id:`event-${i}`}))],kwargs:{}})],
[/_alert_escalation$/,['Alerta','Severidad','Minutos'],['alert-1','high','30'],v=>({args:[[{id:v[0],severity:v[1],age_minutes:+v[2]}],[{severity:v[1],after_minutes:+v[2],to:'admin'}]],kwargs:{}})],
[/_offline_continuity$/,['Versión','Acción','Registro'],['1','comment','action-1'],v=>({args:[{version:+v[0]},[{id:v[2],action:v[1]}]],kwargs:{}})],
[/_adaptive_trust$/,['MFA','Riesgo','Dispositivo'],['true','0.1','trusted'],v=>({args:[{mfa:v[0]==='true',risk:+v[1],device:v[2]}],kwargs:{}})],
[/(_campaign|_campaign_plan)$/,['Nombre','Audiencia','Frecuencia'],['Campaña','10','1'],v=>({args:[{name:v[0],audience:+v[1],frequency_per_week:+v[2]}],kwargs:{}})],
[/_intent$/,['Mensaje','Idioma','Contexto'],['leer reglas','es','group'],v=>({args:[v[0]],kwargs:{locale:v[1],context:v[2]}})],
[/_integration$/,['URL HTTPS','Método','Tipo'],['https://example.com/hook','GET','events'],v=>({args:[{url:v[0],methods:[v[1]],kind:v[2]}],kwargs:{}})],
[/_vault$/,['Registro','Sobre cifrado','Nonce'],['vault-1','a'.repeat(32),'b'.repeat(16)],v=>({args:[{id:v[0],encrypted_envelope:v[1],nonce:v[2]}],kwargs:{}})],
[/_easy_read$/,['Nombre','Regla','Idioma'],['Ayuda','Respeto','es'],v=>({args:[{name:v[0],rules:[v[1]],locale:v[2]}],kwargs:{}})],
[/_sessions$/,['Sesión','Dispositivo','Moderador'],['session-1','web','true'],v=>({args:[[{id:v[0],device:v[1],last_seen:iso(),moderator:v[2]==='true'}],v[1]],kwargs:{}})],
[/_editorial$/,['Elemento','Tema','Valor'],['item-1','ai','1'],v=>({args:[[{id:v[0],topics:[v[1]],community_value:+v[2]},{topics:[v[1]]}]],kwargs:{}})],
];
export const additionalFeatureFamilyCount=forms.length;export const supportsAdditionalFeature=api=>forms.some(([p])=>p.test(api||''));
export default function MoonbotAdditionalFeatureForm({feature,onPrepare}){const d=useMemo(()=>forms.find(([p])=>p.test(feature?.api||'')),[feature]);const[v,setV]=useState([]);useEffect(()=>setV(d?.[2]||[]),[feature?.id,d]);if(!d)return null;return <section className="space-y-3 rounded-xl border border-teal-500/20 bg-teal-500/5 p-4"><b>Contrato específico verificado</b><div className="grid gap-2 sm:grid-cols-3">{d[1].map((label,i)=><label key={label} className="text-xs">{label}<Input className="mt-1" value={v[i]||''} onChange={e=>setV(old=>old.map((x,p)=>p===i?e.target.value:x))}/></label>)}</div><Button size="sm" variant="secondary" onClick={()=>onPrepare(JSON.stringify(d[3](v),null,2))}>Preparar solicitud</Button><p className="text-xs text-muted-foreground">Revisa el JSON antes de ejecutar.</p></section>}
