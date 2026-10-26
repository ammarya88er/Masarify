// مفتاح Gemini: البرنامج يعرف نوع المفتاح ويبعت لجوجل بنفس الطريقة
const {boot,seed,t,done}=require('./harness');
const tick=()=>new Promise(r=>setImmediate(r));
const GK='AIzaSyTEST123';
function mk(resp,status){
  const x=boot(seed());x.run("localStorage.setItem(AKEY,'"+GK+"');globalThis.__u=null;globalThis.__o=null;shrink=async()=>'b64';");
  x.run("fetch="+(resp==='net'?"async(u,o)=>{__u=u;__o=o;throw new TypeError('Failed to fetch');}"
    :"async(u,o)=>{__u=u;__o=o;return {status:"+(status||200)+",json:async()=>("+JSON.stringify(resp)+")};}")+";");
  return x;
}
const ok=txt=>({candidates:[{finishReason:'STOP',content:{parts:[{text:'بفكر...',thought:true},{text:txt}]}}]});
const good=ok('{"merchant":"talabat mart","date":"29/09/2026","items":[{"name":"كوكاكولا كوفي","qty":3,"amount":46.5,"cat":"drinks"}]}');
const gerr=(code,status,message)=>({error:{code,status,message}});
async function scan(x){x.run("app.pickFile({files:[{}],value:''})");for(let i=0;i<10;i++)await tick();return x;}
(async()=>{
  t('نوع المفتاح من أوله', boot(seed()).run("keyProv('AIzaXX')==='gemini'&&keyProv('sk-ant-xx')==='anthropic'&&keyProv('')==='anthropic'"));
  let x=await scan(mk(good));
  const u=x.run('__u'), o=x.run('__o'), b=JSON.parse(o.body);
  t('بيروح لجوجل بالموديل والمفتاح في الهيدر', u==='https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent'&&o.headers['x-goog-api-key']===GK&&!o.headers['x-api-key'], u);
  t('الصورة والكلام بشكل جوجل', b.contents[0].parts[0].inline_data.mime_type==='image/jpeg'&&b.contents[0].parts[0].inline_data.data==='b64'&&typeof b.contents[0].parts[1].text==='string');
  t('رد JSON، تفكير قليل، ومن غير temperature', b.generationConfig.responseMimeType==='application/json'&&b.generationConfig.thinkingConfig.thinkingLevel==='low'&&b.generationConfig.maxOutputTokens===8000&&!('temperature' in b.generationConfig));
  t('الفاتورة اتقرت والتفكير اتشال', x.run("scan.stage")==='review'&&x.run("scan.items.length")===1&&x.run("scan.items[0].name")==='كوكاكولا كوفي');
  x=mk(ok('{"ops":[{"kind":"expense","amount":120,"account":"card","place":"CARREFOUR","date":"2026-09-25"}]}'));
  x.run("app.readSmsNow('تم خصم 120 جنيه')");for(let i=0;i<10;i++)await tick();
  t('رسايل البنك بـGemini', x.run("D.txns.some(t=>t.fromSms&&t.amount===120)")&&x.run("__u").indexOf('generativelanguage')>-1);
  const cases=[
    ['مفتاح غلط',gerr(400,'INVALID_ARGUMENT','API key not valid. Please pass a valid API key.'),400,'المفتاح غلط أو ناقص. راجعه من الإعدادات.'],
    ['ممنوع',gerr(403,'PERMISSION_DENIED','denied'),403,'المفتاح غلط أو ناقص. راجعه من الإعدادات.'],
    ['حد الاستخدام',gerr(429,'RESOURCE_EXHAUSTED','quota'),429,'المفتاح وصل لحد الاستخدام المسموح دلوقتي. جرب بعد شوية، أو فعّل الدفع من Google AI Studio.'],
    ['الرصيد',gerr(402,'FAILED_PRECONDITION','Depleted Prepay credits'),402,'رصيد المفتاح خلص. اشحنه من Google AI Studio.'],
    ['زحمة',gerr(503,'UNAVAILABLE','The model is overloaded.'),503,'الخدمة زحمة دلوقتي. جرب كمان دقيقة.'],
    ['غلط تاني بيظهر زي ما هو',gerr(400,'FAILED_PRECONDITION','User location is not supported'),400,'مقدرتش أقرا الفاتورة: User location is not supported'],
    ['الرد اتقطع',{candidates:[{finishReason:'MAX_TOKENS',content:{parts:[{text:'{"items":['}]}}]},200,'الرد اتقطع عشان طويل. قسّمه على مرتين.'],
    ['مفيش رد',{promptFeedback:{blockReason:'OTHER'}},200,'الرد رجع بشكل مش مفهوم. جرب تاني.'],
  ];
  for(const [l,r,st,msg] of cases){x=await scan(mk(r,st));t('Gemini — '+l, x.run("scan.err")===msg, x.run("scan.err"));}
  x=await scan(mk('net'));t('Gemini — النت', x.run("scan.err")==='الطلب ماوصلش. اتأكد من النت وجرب تاني.');
  // مفتاح Anthropic لسه زي ما هو
  x=boot(seed());x.run("localStorage.setItem(AKEY,'sk-ant-1');globalThis.__u='';shrink=async()=>'b64';fetch=async(u,o)=>{__u=u;return {status:200,json:async()=>({type:'error',error:{type:'billing_error',message:'credit balance too low'}})};};");
  await scan(x);
  t('Anthropic لسه شغال ورسالة الرصيد باسم منصته', x.run("__u")==='https://api.anthropic.com/v1/messages'&&x.run("scan.err")==='رصيد المفتاح خلص. اشحنه من منصة أنثروبيك.');
  // الكلام في الإعدادات وشاشة الفاتورة
  x=boot(seed());x.run("app.go('settings');setsOpen={app:true};render();");let v=x.V();
  t('الإعدادات: بتقول ينفع الاتنين وفيها تنبيه الخصوصية', v.indexOf('تجيبه منين؟')>-1&&v.indexOf('aistudio.google.com/apikey')>-1&&v.indexOf('platform.claude.com')>-1&&v.indexOf('بيخلي البرنامج يقرا صور الفواتير')>-1&&v.indexOf('جوجل ممكن تستخدم الصور')>-1&&v.indexOf('AIza...')>-1);
  x.run("localStorage.setItem(AKEY,'"+GK+"');render();");
  t('الإعدادات: بتقول نوع المفتاح المتسجل', x.V().indexOf('مفتاح Gemini متسجل')>-1);
  x=boot(seed());x.run("app.go('scan');");v=x.V();
  t('شاشة الفاتورة من غير مفتاح: بتذكر الاتنين', v.indexOf('Anthropic أو Gemini')>-1);
  done();
})();
