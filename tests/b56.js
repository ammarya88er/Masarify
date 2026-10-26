// شرح مفتاح الفواتير، تدبير الاشتراكات، ترتيب وألوان التنبيهات، وألوان الحسابات
const {boot,seed,t,done}=require('./harness');
const SEP=Date.UTC(2026,8,25,12,0,0);
{ // شرح المفتاح
  const {run,V}=boot(seed());run("app.go('settings');setsOpen={app:true};render();");const v=V();
  t('المفتاح: بيعمل إيه وتجيبه منين وزرارين', v.indexOf('بيخلي البرنامج يقرا صور الفواتير')>-1&&v.indexOf('Create API key')>-1&&v.indexOf("openLink('https://aistudio.google.com/apikey')")>-1&&v.indexOf("openLink('https://platform.claude.com')")>-1);
  run("localStorage.setItem(AKEY,'AIzaX');render();");
  t('لما المفتاح متسجل: الخطوات مستخبية', V().indexOf('Create API key')<0);
}
const sub=(o)=>Object.assign({id:'s1',name:'Netflix',amount:110,cur:'EGP',cycle:'monthly',next:'2026-09-25',at:'',account:'card',cat:'subs',payments:[],dues:[]},o||{});
const pay=(run)=>{run("app.paySub('s1');app.confirmPaySub('s1');");return JSON.parse(run("JSON.stringify(D.subs[0].payments.slice(-1)[0])"));};
{ // لأ: مفيش تقدير ولا تنبيه
  const {run}=boot(seed({subs:[sub({arr:false})]}),SEP);const p=pay(run);
  t('لأ: الدفعة من غير تدبير', !p.feePending&&!p.fee);
  t('لأ: التكلفة من غير تدبير', run("subFeeAt(D.subs[0],110)")===0);
}
{ // أيوه: تقدير
  const {run}=boot(seed({subs:[sub({arr:true})]}),SEP);const p=pay(run);
  t('أيوه: تقدير ٣٪ مستني تأكيد', p.feePending===true&&p.fee===3.3, JSON.stringify(p));
}
{ // مش معروف: بيتحدد من التنبيه
  let x=boot(seed({subs:[sub()]}),SEP);let p=pay(x.run);
  t('فاضي: زي أيوه', p.feePending===true&&x.run("D.subs[0].arr")===undefined);
  x.run("feeFor='s1|"+p.t+"';app.noFee('s1|"+p.t+"');");
  t('«مفيش تدبير» من التنبيه: بقت لأ', x.run("D.subs[0].arr")===false);
  x=boot(seed({subs:[sub()]}),SEP);p=pay(x.run);
  x.run("document.getElementById('feein').value='3.5';app.confirmFee('s1|"+p.t+"');");
  t('كتبت مبلغ: بقت أيوه', x.run("D.subs[0].arr")===true);
}
{ // الاشتراكات القديمة بتتحدد من آخر دفعة متأكدة
  const {run}=boot(seed({subs:[sub({id:'a',payments:[{d:'2026-08-25',t:'x',paid:110,fee:0}]}),sub({id:'b',payments:[{d:'2026-08-25',t:'y',paid:110,fee:3.3}]}),sub({id:'c',payments:[{d:'2026-08-25',t:'z',paid:110,fee:3.3,feePending:true}]}),sub({id:'d',cur:'USD'})]}),SEP);
  t('من الدفعات: لأ / أيوه / فاضي / دولار فاضي', run("JSON.stringify(D.subs.map(s=>s.arr===undefined?'u':s.arr))")===JSON.stringify([false,true,'u','u']));
}
{ // الفورم والكارت
  const {run,V}=boot(seed({subs:[sub({next:'2026-10-10'})]}),SEP);
  run("tab='wallet';wtab='subs';showSub=true;render();");let v=V();
  t('إضافة: السؤال بـ«لأ / أيوه» من غير اختيار', v.indexOf('ليه مصاريف تدبير؟ (اختياري)')>-1&&/subarr[^]*?>لأ<\/button>[^]*?>أيوه<\/button>/.test(v)&&!/class="chip sm on"[^>]*app.shutRow\('subarr'\)/.test(v)&&v.indexOf('لو مش عارف سيبها')>-1);
  t('الكارت: «التدبير هيتحدد من أول دفعة»', v.indexOf('التدبير هيتحدد من أول دفعة')>-1);
  run("subDraft.name='X';subDraft.amount='50';app.subPick('arr',false);app.subPick('owner','me');app.subPick('promo',false);app.subPick('split',false);app.addSub();");
  t('إضافة: الإجابة اتحفظت', run("D.subs.find(s=>s.name==='X').arr")===false);
  run("subDraft.cur='USD';showSub=true;render();");
  t('بالدولار: مفيش سؤال', V().indexOf('ليه مصاريف تدبير؟')<0);
  run("app.startSubEdit('s1');app.sdPick('arr',true);app.saveSubEdit('s1');");
  t('تعديل: الإجابة اتحفظت', run("D.subs.find(s=>s.id==='s1').arr")===true);
}
{ // ترتيب وألوان التنبيهات
  const s=seed({subs:[sub({next:'2026-09-25'})],txns:[{id:'n1',book:'me',kind:'expense',amount:50,cat:'other',account:'card',date:'2026-09-20',fromSms:true,needs:true}],
    owed:[{id:'o1',amount:100,who:'كريم',date:'2026-09-01',note:'x',cat:'lentcat',got:false,lent:true}],lastBackup:'2026-09-25'});
  s.accounts.find(a=>a.id==='cash').opening=-20;
  const {run,V}=boot(s,SEP);run("app.go('home');alertsOpen=true;render();");const v=V();
  const at=x=>v.indexOf(x);
  const iNeg=at('كاش بالسالب'), iSub=at('>Netflix<'), iSms=at('خصم محتاج تفاصيل'), iOwed=at('<bdi>كريم</bdi> عليه');
  t('الترتيب: مطلوب النهارده ← محتاج تأكيد ← معلومات', iNeg>-1&&iSub>-1&&iSms>-1&&iOwed>-1&&Math.max(iNeg,iSub)<iSms&&iSms<iOwed, [iNeg,iSub,iSms,iOwed].join());
  const col=i=>{const m=/background:([^"]*)"/.exec(v.slice(v.lastIndexOf('class="rail"',i)));return m&&m[1];};
  t('الألوان على حسب المجموعة', col(iNeg)==='var(--clay)'&&col(iSub)==='var(--clay)'&&col(iSms)==='#E8A03C'&&col(iOwed)==='#9AA3AE', [col(iNeg),col(iSub),col(iSms),col(iOwed)].join());
}
{ // ألوان الحسابات
  const s=seed();s.accounts.forEach(a=>delete a.color);s.accounts[1].id='bank';s.accounts[1].name='بنك';
  const {run,V}=boot(s);
  t('الألوان القديمة اتحفظت مع الحسابات', run("D.accounts.find(a=>a.id==='bank').color")==='#0A4C8A'&&run("D.accounts.find(a=>a.id==='cash').color")==='#2FA96B');
  run("app.go('settings');setsOpen={accs:true};app.openAccCfg('cash');");
  t('الإعدادات: صف الألوان', V().indexOf('>اللون<')>-1&&(V().match(/app.accCfgColor\('cash'/g)||[]).length===11);
  run("app.accCfgColor('cash','#8C7BF0');app.saveAccount('cash');");
  t('اللون اتغير واتحفظ', run("aColor('cash')")==='#8C7BF0');
  run("D.accounts=D.accounts.filter(a=>a.id!=='card');");
  t('مسح حساب مش بيغير ألوان الباقي', run("aColor('cash')")==='#8C7BF0'&&run("aColor('bank')")==='#0A4C8A');
  run("accDraft.name='جديد';app.addAccount();");
  const nc=run("D.accounts[D.accounts.length-1].color");
  t('حساب جديد: لون مش مستخدم', nc&&run("D.accounts.filter(a=>a.color==='"+nc+"').length")===1);
}
done();
