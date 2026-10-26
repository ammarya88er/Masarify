// قراءة الفواتير والرسايل: من غير temperature، ورسالة واضحة لكل غلط
const {boot,seed,t,done}=require('./harness');
const tick=()=>new Promise(r=>setImmediate(r));
function mk(resp,opts){
  const x=boot(seed());x.run("localStorage.setItem(AKEY,'sk-test');globalThis.__req=null;");
  x.run("shrink="+(opts&&opts.imgFail?"async()=>{throw new Error('img');}":"async()=>'b64'")+";");
  x.run("fetch="+(resp==='net'?"async(u,o)=>{__req=o;throw new TypeError('Failed to fetch');}"
    :resp==='html529'?"async(u,o)=>{__req=o;return {status:529,json:async()=>{throw new Error('x');}};}"
    :"async(u,o)=>{__req=o;return {status:200,json:async()=>("+JSON.stringify(resp)+")};}")+";");
  return x;
}
const ok=txt=>({stop_reason:'end_turn',content:[{type:'text',text:txt}]});
const good=ok('{"merchant":"talabat mart","date":"29/09/2026 15:14","items":[{"name":"كوكاكولا كوفي 240 مل","qty":3,"amount":46.5,"cat":"drinks"},{"name":"رسوم خدمة","qty":1,"amount":14.9,"cat":"other"}],"total":61.4}');
const err=(type,msg)=>({type:'error',error:{type,message:msg}});
async function scanWith(resp,opts){const x=mk(resp,opts);x.run("app.pickFile({files:[{}],value:''})");for(let i=0;i<10;i++)await tick();return x;}
async function smsWith(resp){const x=mk(resp);x.run("app.readSmsNow('خصم 100 جنيه من كارت 1234')");for(let i=0;i<10;i++)await tick();return x;}
(async()=>{
  let x=await scanWith(good);
  const body=JSON.parse(x.run('__req.body'));
  t('طلب الفاتورة من غير temperature', !('temperature' in body), JSON.stringify(Object.keys(body)));
  t('حد الرد في الفاتورة 4000', body.max_tokens===4000, body.max_tokens);
  t('الفاتورة اتقرت ودخلت المراجعة', x.run("scan.stage")==='review'&&x.run("scan.items.length")===2&&!x.run("scan.err"), x.run("scan.err"));
  x=await smsWith(ok('{"ops":[]}'));
  const sb=JSON.parse(x.run('__req.body'));
  t('طلب الرسايل من غير temperature وبحد 3000', !('temperature' in sb)&&sb.max_tokens===3000);
  t('الرسايل: مفيش عمليات بيطلع السبب', x.run("sms.err")==='مقدرتش أقراها: مالقتش عمليات في الرسالة.', x.run("sms.err"));
  const cases=[
    ['غلط غير معروف بيعرض السبب الحقيقي',err('invalid_request_error','temperature is deprecated for this model'),'مقدرتش أقرا الفاتورة: temperature is deprecated for this model','مقدرتش أقراها: temperature is deprecated for this model'],
    ['الرصيد',err('invalid_request_error','Your credit balance is too low'),'رصيد المفتاح خلص. اشحنه من منصة أنثروبيك.'],
    ['المفتاح',err('authentication_error','invalid x-api-key'),'المفتاح غلط أو ناقص. راجعه من الإعدادات.'],
    ['زحمة',err('overloaded_error','Overloaded'),'الخدمة زحمة دلوقتي. جرب كمان دقيقة.'],
    ['زحمة من غير JSON','html529','الخدمة زحمة دلوقتي. جرب كمان دقيقة.'],
    ['النت','net','الطلب ماوصلش. اتأكد من النت وجرب تاني.'],
    ['الرد اتقطع',{stop_reason:'max_tokens',content:[{type:'text',text:'{"items":[{"na'}]},'الرد اتقطع عشان طويل. قسّمه على مرتين.'],
    ['رد مش مفهوم',ok('مش قادر'),'الرد رجع بشكل مش مفهوم. جرب تاني.'],
    ['مفيش أصناف',ok('{"items":[]}'),'مالقتش أصناف في الصورة. جرب صورة أوضح وواقفة، أو سجّل المبلغ يدوي من تبويب الإضافة.',null],
  ];
  for(const [l,r,msg,smsMsg] of cases){
    x=await scanWith(r);t('فاتورة — '+l, x.run("scan.err")===msg&&x.run("scan.stage")==='idle', x.run("scan.err"));
    if(smsMsg!==null){x=await smsWith(r);t('رسالة — '+l, x.run("sms.err")===(smsMsg||msg), x.run("sms.err"));}
  }
  x=await scanWith(good,{imgFail:true});
  t('الصورة ماتفتحتش', x.run("scan.err")==='الصورة ماتفتحتش. خد لها سكرين شوت وارفعها.'&&x.run("__req")===null, x.run("scan.err"));
  const src=require('fs').readFileSync(process.env.MASAREEF_HTML||__dirname+'/../index.html','utf8');
  t('مفيش temperature في أي طلب', !/temperature\s*:/.test(src));
  t('طلب واحد للموديل في البرنامج كله', (src.match(/api\.anthropic\.com\/v1\/messages/g)||[]).length===1);
  t('الجملة القديمة للرصيد اتشالت', src.indexOf('الحساب مفيهوش رصيد كفاية')<0&&src.indexOf("'رصيد المفتاح خلص.'")<0);
  done();
})();
