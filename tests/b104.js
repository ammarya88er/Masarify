// الدفعة ٢ — حاجات صغيرة: الباقات (أسامي الزراير، الترتيب، 70%، الرصيد المتوقع بعد التجديد)، سؤال الرسوم مع المحفظة،
// «إلغاء» تحت «احفظ»، أكتر من فاوتشر في «إضافة»، وميعاد عائد الشهادة (جمعة/سبت ← الخميس)
const {boot,seed,t,done}=require('./harness');
const txt=h=>h.replace(/<[^>]+>/g,' ').replace(/\s+/g,' ');
const SAL={id:'s1',book:'me',kind:'income',amount:9000,account:'cib',date:'2026-11-01',salary:true};
const WAL={id:'vc',name:'فودافون كاش',atype:'wallet',opening:1000,openingOffice:500,scope:'both'};
const S=o=>{const s=seed(o);s.accounts.push(WAL);return s;};

// --- ٥) الباقات
{const lines=[{id:'n',name:'باقة النت',price:520,period:30,next:'2026-11-28',since:'2026-10-01',log:[{t:'set',bal:19.15,d:'2026-10-27'},{t:'charge',bal:523.17,d:'2026-10-27',tx:'c1'},{t:'renew',bal:2.5,d:'2026-10-29',was:'2026-10-29'}]},
   {id:'p',name:'باقة فليكس',price:115,period:30,next:'2026-11-20',since:'2026-10-01',log:[{t:'set',bal:13.04,d:'2026-10-03'},{t:'charge',bal:125.04,d:'2026-10-03',tx:'c2'},{t:'renew',bal:4.37,d:'2026-10-20',was:'2026-10-20'}]}];
  const tx=[SAL,{id:'c1',book:'me',kind:'expense',amount:720,cat:'bills',account:'cib',date:'2026-10-27',line:'n'},{id:'c2',book:'me',kind:'expense',amount:160,cat:'bills',account:'cib',date:'2026-10-03',line:'p'}];
  const {run,V}=boot(S({txns:tx,lines,lineRate:143}),Date.UTC(2026,10,5,9));
  t('متوسط الزيادة: فليكس 5.67 والنت 0.67', run("lineExtra(D.lines[1])")===5.67&&run("lineExtra(D.lines[0])")===0.67);
  t('الإعداد القديم اتشال والنسبة 70%', run("D.lineRate")===undefined&&run("linePct()")===70);
  run("app.go('home');alertsOpen=true;render();");const v=V(),k=v.indexOf('>اشحن رصيد<'),a=txt(v.slice(k,k+900));
  t('«اشحن رصيد»: «شحنت فليكس» و«شحنت النت» من غير «باقة»', a.indexOf('شحنت فليكس')>-1&&a.indexOf('شحنت النت')>-1&&a.indexOf('شحنت باقة')<0,a);
  t('مفيش «فكّرني قبلها»', v.indexOf('فكّرني قبلها')<0);
  t('مترتبين بميعاد التجديد (فليكس الأقرب فوق)', a.indexOf('فليكس تقريبًا')<a.indexOf('النت تقريبًا')&&a.indexOf('شحنت فليكس')<a.indexOf('شحنت النت'));
  // الشحن: 70% بالظبط
  run("app.lineGo('p','charge');app.lineSet('paid','160');app.lineAcct('cib');app.lineCharge('p');");
  t('شحنت 160: الرصيد زاد 112 بالظبط', Math.abs(run("lineBal(D.lines[1])")-(4.37+112))<0.001);
  run("app.lineGo('p','charge');app.lineSet('paid','40');app.lineAcct('cib');app.lineCharge('p');");
  run("app.lineGo('n','charge');app.lineSet('paid','720');app.lineAcct('cib');app.lineCharge('n');");
  t('شحنت 720: زاد 504', Math.abs(run("lineBal(D.lines[0])")-(2.5+504))<0.001);
  // محتاج تشحن كام: على أساس النسبة وسعر الباقة ومتوسط الزيادة
  t('محتاج تشحن: (السعر + الزيادة − الرصيد) ÷ 70% متقرّب', run("lineNeed({id:'z',price:115,period:30,next:'2026-11-20',log:[{t:'set',bal:0}]},'2026-11-20').pay")===170);
  // التجديد: الرصيد المتوقع ومكتوب جنبه «تقريبًا»
  run("app.lineGo('p','renew');");const r=txt(V());
  t('التجديد: الرصيد − الباقة − متوسط الزيادة (تقريبًا)', r.indexOf('ومتوسط الدمغة والرسوم ( 5.67 ): 23.70 تقريبًا')>-1,r.slice(r.indexOf('سيبها'),r.indexOf('سيبها')+120));
  run("app.lineRenew('p');");t('سيبتها فاضية: اتخصم المتوقع', Math.abs(run("lineBal(D.lines[1])")-23.7)<0.001);
  // كتبت الرصيد الحقيقي: المتوسط بيتظبط
  run("app.lineOpen('p','set');app.lineSet('bal','23.3');app.lineSetBal('p');");
  t('كتبت رصيدك الحقيقي بعد التجديد: المتوسط اتظبط', run("lineExtra(D.lines[1])")===Math.round((5.67+6.07)/2*100)/100,run("lineExtra(D.lines[1])"));
  t('الإعداد: «بياخد كام % من اللي بتدفعه؟»', (run("app.go('settings');setsOpen.lines=1;render();"),V().indexOf('بياخد كام % من اللي بتدفعه؟')>-1));
}

// --- ٦) سؤال الرسوم مع المحفظة
{const {run,V}=boot(S({}),Date.UTC(2026,10,5,9));
  run("app.go('add');app.setKind('expense');app.shutRow('acct');app.setAccount('vc');app.setCat('other');app.dset('amount','100');render();");
  t('إضافة من المحفظة: بيسأل «فيها عمولات ورسوم؟»', V().indexOf('فيها عمولات ورسوم؟')>-1);
  run("app.setAccount('cash');render();");t('من الكاش: مابيسألش', V().indexOf('فيها عمولات ورسوم؟')<0);
  run("app.setAccount('card');render();");t('من الكارت: مابيسألش', V().indexOf('فيها عمولات ورسوم؟')<0);
  run("app.setAccount('vc');app.setHasFee(true);render();");t('المحفظة: الرسوم مابتتملاش برسوم البنك', run("draft.feeAmt")==='');
  run("app.dset('feeAmt','1');app.saveEntry();");t('الرسوم اتسجلت من المحفظة', run("D.txns.some(x=>x.cat==='fees'&&x.account==='vc'&&x.amount===1)"));
  // دفتر المكتب
  run("app.setBook('office');app.go('add');draftO.kind='expense';draftO.account='vc';draftO.item='ورق';draftO.amount='50';render();");
  t('دفتر المكتب من المحفظة: بيسأل', V().indexOf('فيها عمولات ورسوم؟')>-1);
  // اديت عهدة لحد
  run("app.go('home');app.hdOpen('new','give');app.hdSet('who','كريم');app.hdAcc('vc');app.hdSet('amt','100');render();");
  t('«اديت عهدة لحد» من المحفظة: بيسأل', V().indexOf('فيها عمولات ورسوم؟')>-1&&V().indexOf('hdsave" disabled')>-1);
  run("app.hdAcc('ocash');render();");t('ومن الكاش لأ', V().indexOf('فيها عمولات ورسوم؟')<0);
  // الفاتورة
  t('الفاتورة: نفس القاعدة', run("feeAcc('vc')")===true&&run("feeAcc('cib')")===true&&run("feeAcc('cash')")===false&&run("feeAcc('card')")===false);
}

// --- ٧) «إلغاء» تحت «احفظ»
{const {run,V}=boot(S({}),Date.UTC(2026,10,5,9));
  const F=[['ins','ضيف قسط','toggleIns','insCancel',"insDraft.name='x'","insDraft.name"],['subs','ضيف اشتراك','toggleSub','subCancel',"subDraft.name='x'","subDraft.name"],
    ['certs','ضيف شهادة أو وديعة','toggleCert','certCancel',"certDraft.amount='5'","certDraft.amount"],['vouchers','ضيف فاوتشر','toggleVch','vchCancel',"vchDraft.code='x'","vchDraft.code"],
    ['gam','ضيف جمعية','toggleGam','gamFormCancel',"gamDraft.name='x'","(gamDraft||{name:''}).name"]];
  F.forEach(([w,lbl,tg,cn,set,get])=>{
    run("app.go('wallet');wtab='"+w+"';render();");const has0=V().indexOf('>'+lbl+'</button>')>-1;
    run("app."+tg+"();"+set+";render();");const v=V();
    t('«'+lbl+'»: الزرار اللي فوق اختفى و«إلغاء» تحت «احفظ»', has0&&v.indexOf('>'+lbl+'</button>')<0&&v.indexOf("app."+cn+"()")>v.indexOf('احفظ'),w);
    run("app."+cn+"();");t('«'+lbl+'»: «إلغاء» قفلها ومسح اللي اتكتب', V().indexOf('>'+lbl+'</button>')>-1&&run(get)==='');
  });
}

// --- ٨) أكتر من فاوتشر في «إضافة»
{const V3=[{id:'v1',code:'AAA1',amount:100,expiry:'2027-01-01',used:false},{id:'v2',code:'BBB2',amount:50,expiry:'2027-01-01',used:false},{id:'v3',code:'CCC3',amount:500,expiry:'2027-01-01',used:false}];
  const {run,V,B}=boot(S({vouchers:V3}),Date.UTC(2026,10,5,9));
  run("app.go('add');app.setKind('expense');app.shutRow('acct');app.setAccount('cash');app.setCat('other');app.dset('amount','200');render();");
  t('الفاوتشر اللي أكبر من المبلغ مش ظاهر', V().indexOf('CCC3')<0&&V().indexOf('AAA1')>-1);
  run("app.setVch('v1');app.setVch('v2');");t('اختار اتنين: مجموعهم 150 بيتخصم', V().indexOf('غطت <span class="n">150</span>')>-1);
  run("app.dset('amount','120');");t('نزّلت المبلغ: الحفظ اتقفل والرسالة ظهرت', run("entryOk()")===false&&run("document.getElementById('vchbox').innerHTML").indexOf('الفاوتشرات أكبر من المبلغ — شيل واحد')>-1);
  run("app.setVch('v2');");t('شلت واحد: اتفتح', run("dVchSum()")===100);
  run("app.setVch('v2');app.dset('amount','200');app.saveEntry();");
  const x=JSON.parse(run("JSON.stringify(D.txns.find(t=>t.kind==='expense'))"));
  t('اتسجل 50 من الحساب والاتنين اتعلّموا مستخدمين', x.amount===50&&x.vouchers&&x.vouchers.length===2&&run("D.vouchers.filter(v=>v.used).length")===2&&B('me','cash')===4950);
  t('مش داخلين في المصروف', run("monthStats().spent")===50);
  // واحد بس: بيتسجل زي الأول
  run("app.go('add');app.setKind('expense');app.shutRow('acct');app.setAccount('cash');app.setCat('other');app.dset('amount','600');app.setVch('v3');app.saveEntry();");
  t('فاوتشر واحد: بيتسجل زي الأول (voucher)', run("D.txns.some(t=>t.voucher&&t.voucher.id==='v3'&&!t.vouchers&&t.amount===100)"));
  // مسح بيرجّع الفاوتشرات
  run("app.go('log');openTxn='"+x.id+"';render();app.delTxn({stopPropagation(){}},'"+x.id+"');");
  t('المسح بيرجّع الاتنين', run("D.vouchers.filter(v=>!v.used).length")===2);
}

// --- ٩) ميعاد عائد الشهادة
{const cert={id:'c1',name:'شهادة 1',amount:10000,monthly:162.5,start:'2026-08-10',day:10,account:'cib',bank:'cib',end:'2029-08-10',covered:'2026-09',payments:[{d:'2026-09-10',t:'x'}]};
  const {run,V}=boot(S({certs:[cert],_certp1:1}),Date.UTC(2026,9,9,9));
  t('10 أكتوبر 2026 سبت: الميعاد الخميس 8 أكتوبر', run("certPayDay(D.certs[0])")==='2026-10-08'&&run("certNext(D.certs[0])")==='2026-10-10');
  t('ومستني العائد من الخميس', run("certWaiting(D.certs[0])")===true);
  run("app.go('wallet');app.setWtab('certs');app.certPayOpen('c1');");t('التاريخ الأولاني الخميس والمبلغ 162.50', V().indexOf('value="2026-10-08"')>-1&&V().indexOf('162.50')>-1);
  t('يوم عادي بيفضل زي ما هو (10 نوفمبر تلات)', run("bankDay('2026-11-10')")==='2026-11-10'&&run("bankDay('2026-11-13')")==='2026-11-12'&&run("bankDay('2026-11-14')")==='2026-11-12');
}
done();
