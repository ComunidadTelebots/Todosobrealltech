const host=process.env.POCKETBASE_HOST;
for(let page=1;page<=100;page++){
 const p=new URLSearchParams({page:String(page),perPage:'500',fields:'id,slug,titulo',filter:'oculto=false',sort:'id'});
 try{const r=await fetch(host+'/api/collections/nw3_noticias/records?'+p,{signal:AbortSignal.timeout(8000)});const d=await r.json();if(!r.ok){console.log('failure',page,r.status,d.message);break;}if(page%10===0)console.log('page',page);if(page>=d.totalPages){console.log('complete',page);break;}}catch(e){console.log('failure',page,e.name);break;}
}
