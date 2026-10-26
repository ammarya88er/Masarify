// عمولة السحب من المكنة، زرار «الصق رسالة بنك»، وربط الفاتورة بخصم رسالة البنك
const {boot,seed,t,done}=require('./harness');
const tick=()=>new Promise(r=>setImmediate(r));
const fees=run=>JSON.parse(run("JSON.stringify(D.txns.filter(x=>x.cat==='fees').map(x=>({a:x.amount,acc:x.account,n:x.note,b:x.book})))"));
const obank={id:'obank',name:'بنك المكتب',opening:0,openingOffice:8000,scope:'office',atype:'bank'};

{ // فلوسي: من بنك لكاش
  const {run,V}=boot(seed());
  run("app.go('add');app.setKind('transfer');app.shutRow('acct');app.setAccount('cib');app.setTo('cash');app.dset('amount','1000');render();");
  let v=V();
  t('بنك ← كاش: بيسأل «فيه عمولة سحب؟»', v.indexOf('فيه عمولة سحب؟')>-1);
  t('مفيش إجابة متختارة لوحدها', run("draft.svFee")===undefined&&v.indexOf('المبلغ اللي اتخصم')<0);
  run("app.setSvFee(true);");
  t('أيوه بتملى ٥', run("draft.svFeeAmt")==='5');
  v=V();t('بيقول هتتخصم منين', v.indexOf('هتتخصم من حساب CIB')>-1);
  const n0=run("D.txns.length");run("app.saveEntry();");
  const f=fees(run);
  t('العمولة اتسجلت مصروف على الحساب اللي سحبت منه', f.length===1&&f[0].a===5&&f[0].acc==='cib'&&f[0].n==='عمولة سحب — حساب CIB'&&f[0].b==='me', JSON.stringify(f));
  t('التحويل نفسه بالمبلغ كامل', run("D.txns.some(x=>x.kind==='transfer'&&x.amount===1000&&x.account==='cib'&&x.to==='cash')")&&run("D.txns.length")===n0+2);
}
{ // لأ = مفيش عمولة، ومبلغ متغير
  const {run}=boot(seed());
  run("app.go('add');app.setKind('transfer');app.shutRow('acct');app.setAccount('cib');app.setTo('cash');app.dset('amount','500');app.saveEntry();");
  t('من غير أيوه مفيش عمولة', fees(run).length===0);
  run("app.go('add');app.setKind('transfer');app.shutRow('acct');app.setAccount('cib');app.setTo('cash');app.dset('amount','500');app.setSvFee(true);app.dset('svFeeAmt','7');app.saveEntry();");
  t('تقدر تغيّر المبلغ', fees(run)[0].a===7);
}
{ // مش بيظهر في غير السحب، وتغيير الحساب بيمسح الإجابة
  const {run,V}=boot(seed());
  run("app.go('add');app.setKind('transfer');app.shutRow('acct');app.setAccount('cash');app.setTo('cib');render();");
  t('كاش ← بنك: مفيش سؤال', V().indexOf('فيه عمولة سحب؟')<0);
  run("app.setAccount('cib');app.setTo('cash');app.setSvFee(true);app.setTo('cib');");
  t('تغيير الحساب بيمسح العمولة', run("draft.svFee")===undefined&&run("draft.svFeeAmt")==='');
}
{ // دفتر المكتب: من الحساب المشترك لكاش العهدة
  const {run,V}=boot(seed({accounts:seed().accounts.concat([obank])}));
  run("app.setBook('office');app.go('add');app.oKind('xfer');app.oAccount('cib');app.oTo('ocash');app.oSet('amount','2000');render();");
  let v=V();
  t('المكتب: بيسأل «فيه عمولة سحب؟»', v.indexOf('فيه عمولة سحب؟')>-1&&!run("draftO.xFee"));
  run("app.oXFee(true);");t('المكتب: أيوه بتملى ٥', run("draftO.xFeeAmt")==='5');
  v=V();t('المكتب: بيقول بتتحسب عليك', v.indexOf('الرسوم بتتحسب عليك أنت')>-1);
  run("app.oSave();");
  let f=fees(run);
  t('المشترك: العمولة عليك من نفس الحساب', f.length===1&&f[0].b==='me'&&f[0].acc==='cib'&&f[0].a===5&&f[0].n.indexOf('عمولة سحب')===0, JSON.stringify(f));
  t('المشترك: بتتجمع في رسوم العهدة', run("D.ofees.length")===1&&run("ofeeBalance()")===5);
  t('المشترك: التحويل للعهدة كامل', run("D.txns.some(x=>x.book==='office'&&x.kind==='transfer'&&x.amount===2000)"));
  run("app.go('add');app.oKind('xfer');app.oAccount('obank');app.oTo('ocash');app.oSet('amount','1000');app.oXFee(true);app.oSave();");
  f=fees(run);
  t('حساب المكتب بس: العمولة بتتخصم منه', f.length===2&&f.some(x=>x.acc==='obank'&&x.a===5), JSON.stringify(f));
  run("app.go('add');app.oKind('xfer');app.oAccount('ocash');app.oTo('cib');render();");
  t('المكتب: كاش ← بنك مفيش سؤال', V().indexOf('فيه عمولة سحب؟')<0);
}
(async()=>{
  { // زرار «الصق رسالة بنك» بياخد من الحافظة
    const mk=(clip)=>{const x=boot(seed());x.run("localStorage.setItem(AKEY,'sk');globalThis.__sent=null;");
      x.run("navigator.clipboard="+clip+";fetch=async(u,o)=>{__sent=JSON.parse(o.body).messages[0].content[0].text;return {status:200,json:async()=>({stop_reason:'end_turn',content:[{type:'text',text:'{\"ops\":[{\"kind\":\"expense\",\"amount\":120,\"account\":\"card\",\"place\":\"CARREFOUR\",\"date\":\"2026-09-25\"}]}'}]})};};");return x;};
    let x=mk("{readText:async()=>'تم خصم 120 جنيه لدى CARREFOUR'}");
    x.run("app.go('scan');app.pasteSms();");for(let i=0;i<10;i++)await tick();
    t('بيقرا من الحافظة على طول', String(x.run("__sent")).indexOf('تم خصم 120 جنيه لدى CARREFOUR')>-1&&x.run("D.txns.some(t=>t.fromSms&&t.amount===120)"));
    const v=x.V();
    t('مفيش خانة ولا رسالة مثال', v.indexOf('smsbox')<0&&v.indexOf('524.40')<0&&v.indexOf('الصق رسالة بنك')>-1);
    x=mk("{readText:async()=>'  '}");x.run("app.go('scan');app.pasteSms();");for(let i=0;i<5;i++)await tick();
    t('الحافظة فاضية', x.run("sms.err")==='مفيش رسالة في الحافظة. انسخ رسالة البنك الأول.'&&x.run("__sent")===null);
    x=mk("{readText:async()=>{throw new Error('denied');}}");x.run("app.pasteSms();");for(let i=0;i<5;i++)await tick();
    t('الموبايل رفض', x.run("sms.err")==='مقدرتش أوصل للحافظة.');
    x=mk("undefined");x.run("app.pasteSms();");for(let i=0;i<5;i++)await tick();
    t('المتصفح مش بيسمح', x.run("sms.err")==='المتصفح ده مش بيسمح باللصق.');
    x=mk("{readText:async()=>'x'}");x.run("localStorage.removeItem(AKEY);app.pasteSms();");for(let i=0;i<5;i++)await tick();
    t('من غير مفتاح', x.run("sms.err")==='محتاج تحط مفتاح قراءة الفواتير من الإعدادات.'&&x.run("__sent")===null);
  }
  const needs={id:'n1',book:'me',kind:'expense',amount:61.4,cat:'other',account:'card',date:'2026-09-24',note:'TALABAT',place:'TALABAT',fromSms:true,needs:true};
  const read=x=>{x.run("localStorage.setItem(AKEY,'sk');shrink=async()=>'b64';fetch=async()=>({status:200,json:async()=>({stop_reason:'end_turn',content:[{type:'text',text:'{\"merchant\":\"talabat mart\",\"date\":\"25/09/2026\",\"items\":[{\"name\":\"كوكاكولا كوفي\",\"qty\":3,\"amount\":46.5,\"cat\":\"drinks\"},{\"name\":\"رسوم خدمة\",\"qty\":1,\"amount\":14.9,\"cat\":\"fees\"}]}'}]})});");};
  { // التنبيه: الاختيارات
    const x=boot(seed({txns:[needs]}));
    x.run("app.go('home');alertsOpen=true;app.startNeeds('n1');");let v=x.V();
    t('التنبيه: حاجة واحدة / اكتب فاتورة بإيدك / ارفع الفاتورة', v.indexOf('حاجة واحدة')>-1&&v.indexOf('اكتب فاتورة بإيدك')>-1&&v.indexOf('ارفع الفاتورة')>-1&&v.indexOf('>أصناف<')<0&&v.indexOf('افتح شاشة الفاتورة')<0);
    x.run("document.getElementById('picker3').click=function(){globalThis.__clk=this.dataset.for;};app.ndMode('bill');");
    t('ارفع الفاتورة بيفتح اختيار الصورة على طول', x.run("__clk")==='n1');
  }
  { // ارفع الفاتورة من التنبيه
    const x=boot(seed({txns:[needs]}));read(x);
    x.run("app.pickFile({files:[{}],value:''},'n1');");for(let i=0;i<10;i++)await tick();
    t('بتفتح المراجعة متربوطة بالخصم', x.run("tab")==='scan'&&x.run("scan.stage")==='review'&&x.run("needsTxn")==='n1'&&x.run("scan.account")==='card'&&x.run("scan.date")==='2026-09-24');
    const v=x.V();
    t('المراجعة بتقول هتتسجل على أنهي خصم، ومن غير سؤال الحساب', v.indexOf('هتتسجل على خصم')>-1&&v.indexOf('اتدفعت من إيه')<0&&v.indexOf('قسّم المبلغ')<0);
    const n0=x.run("D.txns.length");x.run("app.saveReceipt();");
    t('اتضافت على الخصم من غير مصروف جديد', x.run("D.txns.length")===n0&&!x.run("D.txns[0].needs")&&x.run("D.txns[0].items.length")===2&&!x.run("D.txns[0].needsDiff"));
  }
  { // اكتب فاتورة بإيدك من التنبيه
    const x=boot(seed({txns:[needs]}));
    x.run("app.go('home');app.startNeeds('n1');app.ndMode('manual');");
    t('بتفتح شاشة اكتب فاتورة بإيدك متربوطة', x.run("tab")==='scan'&&x.run("scan.manual")===true&&x.run("needsTxn")==='n1'&&x.run("scan.account")==='card'&&x.run("scan.date")==='2026-09-24');
    x.run("app.iset(0,'name','كوكاكولا');app.setItemCat(0,D.cats[0].id);app.iset(0,'amount','61.4');app.saveReceipt();");
    t('اتسجلت على الخصم', x.run("D.txns.length")===1&&!x.run("D.txns[0].needs")&&x.run("D.txns[0].items[0].name")==='كوكاكولا');
    x.run("app.go('home');app.startNeeds('n1');app.ndMode('manual');app.cancelScan();");
    t('إلغاء بيفك الربط', x.run("needsTxn")===null);
  }
  { // رفعت الفاتورة من تبويب الفاتورة: بيسأل عن الخصم
    const x=boot(seed({txns:[needs]}));read(x);
    x.run("app.go('scan');app.pickFile({files:[{}],value:''});");for(let i=0;i<10;i++)await tick();
    let v=x.V();
    t('بيسأل «دي فاتورة الخصم ده؟»', x.run("scan.match")==='n1'&&v.indexOf('دي فاتورة الخصم ده؟')>-1&&x.run("needsTxn")===null);
    x.run("app.scanMatchSet(true);");v=x.V();
    t('أيوه: متربوطة والحساب والتاريخ من الرسالة', x.run("needsTxn")==='n1'&&x.run("scan.account")==='card'&&v.indexOf('اتدفعت من إيه')<0&&v.indexOf('>التاريخ<')<0);
    x.run("app.saveReceipt();");
    t('أيوه: مفيش مصروف مكرر', x.run("D.txns.length")===1&&!x.run("D.txns[0].needs"));
  }
  { // لأ = مصروف جديد عادي
    const x=boot(seed({txns:[needs]}));read(x);
    x.run("app.pickFile({files:[{}],value:''});");for(let i=0;i<10;i++)await tick();
    x.run("app.scanMatchSet(true);app.scanMatchSet(false);app.scanAccount('cash');app.saveReceipt();");
    t('لأ: اتسجلت مصروف لوحدها والخصم لسه مستني', x.run("D.txns.length")===2&&x.run("D.txns.find(t=>t.id==='n1').needs")===true);
  }
  { // مش بيخمّن
    let x=boot(seed({txns:[needs,Object.assign({},needs,{id:'n2'})]}));read(x);
    x.run("app.pickFile({files:[{}],value:''});");for(let i=0;i<10;i++)await tick();
    t('خصمين بنفس المبلغ: مفيش سؤال', x.run("scan.match")==='');
    x=boot(seed({txns:[Object.assign({},needs,{amount:70})]}));read(x);
    x.run("app.pickFile({files:[{}],value:''});");for(let i=0;i<10;i++)await tick();
    t('مبلغ مختلف: مفيش سؤال', x.run("scan.match")==='');
    x=boot(seed({txns:[Object.assign({},needs,{date:'2026-09-15'})]}));read(x);
    x.run("app.pickFile({files:[{}],value:''});");for(let i=0;i<10;i++)await tick();
    t('أبعد من ٣ أيام: مفيش سؤال', x.run("scan.match")==='');
  }
  { // خصم من غير حساب: الحساب بيتسجل عليه
    const x=boot(seed({txns:[Object.assign({},needs,{account:''})]}));read(x);
    x.run("app.pickFile({files:[{}],value:''},'n1');");for(let i=0;i<10;i++)await tick();
    t('من غير حساب: بيسأل اتدفعت من إيه', x.V().indexOf('اتدفعت من إيه')>-1);
    x.run("app.scanAccount('cib');app.saveReceipt();");
    t('من غير حساب: الحساب اتسجل على الخصم', x.run("D.txns[0].account")==='cib'&&!x.run("D.txns[0].needs"));
  }
  const src=require('fs').readFileSync(process.env.MASAREEF_HTML||__dirname+'/../index.html','utf8');
  t('الكود القديم اتشال', !/ndGoBill|ndItem|ndKeep|ndSum|toggleSms|smsSet|smsbox|items0=>0/.test(src));
  done();
})();
