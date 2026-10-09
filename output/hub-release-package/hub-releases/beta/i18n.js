/**
 * MoonBot universal i18n: cualquier locale ISO, detección Telegram/navegador,
 * traducción bajo demanda, caché local y actualización de contenido dinámico.
 */
const MOON_LANGUAGES=`aa ab ae af ak am an ar as av ay az ba be bg bh bi bm bn bo br bs ca ce ch co cr cs cu cv cy da de dv dz ee el en eo es et eu fa ff fi fj fo fr fy ga gd gl gn gu gv ha he hi ho hr ht hu hy hz ia id ie ig ii ik io is it iu ja jv ka kg ki kj kk kl km kn ko kr ks ku kv kw ky la lb lg li ln lo lt lu lv mg mh mi mk ml mn mr ms mt my na nb nd ne ng nl nn no nr nv ny oc oj om or os pa pi pl ps pt qu rm rn ro ru rw sa sc sd se sg si sk sl sm sn so sq sr ss st su sv sw ta te tg th ti tk tl tn to tr ts tt tw ty ug uk ur uz ve vi vo wa wo xh yi yo za zh zu`.split(" ");
let currentLang=localStorage.getItem("moon_lang")||window.Telegram?.WebApp?.initDataUnsafe?.user?.language_code||navigator.language||"es";
currentLang=String(currentLang).toLowerCase().replace("_","-");
const moonOriginal=new WeakMap(),moonTranslated=new WeakSet();
let moonI18nBusy=false;

function moonLanguageName(code){
  try{return new Intl.DisplayNames([currentLang],{type:"language"}).of(code)||code.toUpperCase();}
  catch(e){return code.toUpperCase();}
}
function populateLanguageSelectors(){
  document.querySelectorAll(".lang-select").forEach(select=>{
    const selected=currentLang,fragment=document.createDocumentFragment();
    MOON_LANGUAGES.forEach(code=>{const option=document.createElement("option");option.value=code;option.textContent=`${moonLanguageName(code)} (${code.toUpperCase()})`;fragment.appendChild(option);});
    select.replaceChildren(fragment);select.value=MOON_LANGUAGES.includes(selected)?selected:selected.split("-")[0];
  });
}
function moonTextNodes(root=document.body){
  const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT,{acceptNode(node){
    const parent=node.parentElement,text=node.nodeValue.trim();
    if(!parent||!text||moonTranslated.has(node)||parent.closest("script,style,code,pre,[data-i18n-skip]"))return NodeFilter.FILTER_REJECT;
    return NodeFilter.FILTER_ACCEPT;
  }});
  const nodes=[];while(walker.nextNode())nodes.push(walker.currentNode);return nodes;
}
async function moonTranslateValues(values){
  if(currentLang==="es"||currentLang.startsWith("es-"))return values;
  const key=`moon_i18n_${currentLang}`,cache=JSON.parse(localStorage.getItem(key)||"{}"),missing=[...new Set(values.filter(x=>cache[x]===undefined))];
  for(let i=0;i<missing.length;i+=120){
    const batch=missing.slice(i,i+120);
    try{
      const response=await fetch("/api/ia/i18n",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({language:currentLang,texts:batch})});
      const data=await response.json();
      if(data.ok)batch.forEach((text,index)=>cache[text]=data.translations[index]||text);
    }catch(e){batch.forEach(text=>cache[text]=text);}
  }
  try{localStorage.setItem(key,JSON.stringify(cache));}catch(e){}
  return values.map(value=>cache[value]||value);
}
async function applyTranslations(root=document.body){
  if(moonI18nBusy||!root)return;moonI18nBusy=true;
  try{
    const nodes=moonTextNodes(root),values=nodes.map(node=>{if(!moonOriginal.has(node))moonOriginal.set(node,node.nodeValue);return moonOriginal.get(node).trim();});
    const placeholders=[...root.querySelectorAll?.("input[placeholder],textarea[placeholder],[title],[aria-label]")||[]];
    const attrs=placeholders.map(el=>el.placeholder||el.title||el.getAttribute("aria-label")||"");
    const translated=await moonTranslateValues(values.concat(attrs));
    nodes.forEach((node,index)=>{const original=moonOriginal.get(node),trimmed=original.trim(),replacement=translated[index];node.nodeValue=original.replace(trimmed,replacement);moonTranslated.add(node);});
    placeholders.forEach((el,index)=>{const value=translated[values.length+index];if(el.placeholder)el.placeholder=value;else if(el.title)el.title=value;else el.setAttribute("aria-label",value);});
    document.documentElement.lang=currentLang;
  }finally{moonI18nBusy=false;}
}
async function setLanguage(language){
  currentLang=String(language||"es").toLowerCase().replace("_","-");localStorage.setItem("moon_lang",currentLang);
  moonTranslated.clear?.();document.querySelectorAll(".lang-select").forEach(x=>x.value=currentLang);
  location.reload();
}
function initI18n(){
  populateLanguageSelectors();applyTranslations();
  const observer=new MutationObserver(changes=>{for(const change of changes)for(const node of change.addedNodes)if(node.nodeType===1){applyTranslations(node);return;}});
  observer.observe(document.body,{childList:true,subtree:true});
}
window.setLanguage=setLanguage;window.applyTranslations=applyTranslations;
window.addEventListener("DOMContentLoaded",initI18n);
