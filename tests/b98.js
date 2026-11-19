// الفاوتشرات: أكتر من فاوتشر في الفاتورة، نصيب صاحبك بعد الفاوتشرات، موبايل وبطاقة صاحب الفاوتشر، والأرقام إنجليزي
const {boot,seed,t,done}=require('./harness');
const NOW=Date.UTC(2026,10,19,9);
const V=(id,amt,o)=>Object.assign({id,code:'C'+id,amount:amt,expiry:'2027-02-16',used:false,usedOn:'',added:'2026-11-01'},o||{});
const S=()=>seed({vouchers:[V('v1',500),V('v2',300,{owner:'عصام',phone:'01000000000',card:'123456'}),V('v3',900)],cardDigits:'654321',phone:'01999999999',vchAcct:'cib'});
const rec="scan={stage:'review',items:[{name:'شاي',amount:400,cat:'grocery'},{name:'جاكت',amount:600,cat:'other',who:'كريم'}],merchant:'محل',date:today(),account:'cash',err:'',voucherId:'',voucherAmt:'',oitem:'',ocat:'',disc:'',split:false,people:[{name:'',amount:''}]};render();";
{ const {run,V:v,B}=boot(S(),NOW);
  run("app.go('scan');"+rec);
  t('الفاوتشرات بتظهر كلها اللي أصغر من الفاتورة', v().indexOf("app.scanVch('v1')")>-1&&v().indexOf("app.scanVch('v2')")>-1&&v().indexOf("app.scanVch('v3')")>-1);
  run("app.scanVch('v1');app.scanVch('v2');");
  t('اختار اتنين', run("JSON.stringify(scanVchs())")==='["v1","v2"]');
  t('الفاوتشر اللي مايكفيهوش الباقي مش ظاهر', v().indexOf("app.scanVch('v3')")<0);
  const w=JSON.parse(run("JSON.stringify(scanWho())"));
  t('غطت حاجتك الأول (400) والباقي (400) من حاجة كريم: عليه 200', w.length===1&&w[0].cover===400&&w[0].def===200);
  t('«كريم هيرجعلك كام؟» ظاهرة', v().indexOf('هيرجعلك كام؟')>-1);
  run("app.scanOwe('كريم','700');");t('أكتر من نصيبه: الحفظ مقفول', run("scanSaveOk()")===false);
  run("app.scanOwe('كريم','');");
  const c0=B('me','cash');run("app.saveReceipt();");
  const m=JSON.parse(run("JSON.stringify(D.txns.find(x=>x.items))"));
  t('الحركة فيها الفاوتشرين، ومن الكاش 200 بس', (m.vouchers||[]).length===2&&B('me','cash')===c0-200&&m.amount===200);
  t('الفاوتشرين اتعلّموا مستخدمين', run("D.vouchers.filter(x=>x.used).length")===2);
  t('على كريم 200 بس', run("D.owed.filter(o=>o.who==='كريم').map(o=>o.amount).join()")==='200');
  // تعديل من غير تغيير
  run("app.go('log');app.toggleTxn('"+m.id+"');app.startTxnEdit({stopPropagation(){}},'"+m.id+"');app.saveReceipt();");
  t('تعديل من غير تغيير: نفس الأرقام', B('me','cash')===c0-200&&run("D.owed.filter(o=>o.who==='كريم').map(o=>o.amount).join()")==='200'&&run("D.vouchers.filter(x=>x.used).length")===2);
  // مسح وتراجع
  const pre=run("JSON.stringify(dCmp(JSON.stringify(D)))");
  const id=run("D.txns.find(x=>x.items).id");run("app.delTxn({stopPropagation(){}},'"+id+"');");
  t('مسح الفاتورة بيرجّع الفاوتشرين', run("D.vouchers.filter(x=>x.used).length")===0&&B('me','cash')===c0);
  run("app.undoLast();");t('التراجع بيرجّع كل حاجة', run("JSON.stringify(dCmp(JSON.stringify(D)))")===pre);
}
{ // رقم تكتبه بنفسك
  const {run}=boot(S(),NOW);run("app.go('scan');"+rec+"app.scanVch('v1');app.scanOwe('كريم','550');app.saveReceipt();");
  t('المبلغ اللي كتبته هو اللي اتسجل', run("D.owed.filter(o=>o.who==='كريم').map(o=>o.amount).join()")==='550');
}
{ // فاتورة قديمة بفاوتشر واحد: حسبتها زي ما هي
  const {run,B}=boot(S(),NOW);run("app.go('scan');"+rec+"scan.voucherId='v1';app.saveReceipt();");
  t('الطريقة القديمة: الفاوتشر مابيغطيش حاجة حد', run("D.owed.filter(o=>o.who==='كريم').map(o=>o.amount).join()")==='600');
}
{ // كارت الفاوتشر
  const {run,V:v}=boot(S(),NOW);run("app.goVouchers();");
  t('فاوتشر بتاع حد: موبايله وبطاقته ظاهرين', v().indexOf('01000000000')>-1&&v().indexOf('123456')>-1);
  t('بتاعك: أرقامك مش ظاهرة في الكارت', v().indexOf('654321')<0);
}
{ // الأرقام إنجليزي وانت بتكتب
  const {run}=boot(S(),NOW);const el='({value:"٠١٢٣٤٥٦٧٨٩"})';
  run("const e="+el+";app.vchSet('ophone',e.value,e);globalThis.__e=e;");
  t('موبايل صاحب الفاوتشر: الخانة بقت إنجليزي', run("__e.value")==='0123456789'&&run("vchDraft.ophone")==='0123456789');
  run("const e2="+el+";app.vchSet('ocard',e2.value,e2);globalThis.__e2=e2;");t('أرقام البطاقة كمان', run("__e2.value")==='0123456789');
  const h=require('fs').readFileSync(process.env.MASAREEF_HTML||__dirname+'/../index.html','utf8');
  t('إعدادات الفاوتشرات: الخانتين بيتحولوا وانت بتكتب', (h.match(/value="\$\{esc\(D\.(cardDigits|phone)\|\|''\)\}" oninput="this\.value=onlyDigits\(this\.value\)"/g)||[]).length===2);
}
done();
