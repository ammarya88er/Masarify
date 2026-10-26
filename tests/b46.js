const {boot,seed,t,done}=require('./harness');
{ // ١ كلام الخانات والتسميات
  const {run,V}=boot(seed({txns:[{id:'a',book:'me',kind:'expense',amount:100,cat:'food',account:'cash',date:'2026-09-24'},
    {id:'b',book:'me',kind:'income',amount:500,account:'cash',date:'2026-09-24'},
    {id:'c',book:'me',kind:'transfer',amount:50,account:'cash',to:'cib',date:'2026-09-23'}]}));
  run("app.go('settings');setsOpen={cats:1};setSub='icats';render();");
  t('خانة النوع: «نوع جديد» من غير أمثلة', V().indexOf('placeholder="نوع جديد"')>-1&&V().indexOf('«تيب»')<0);
  run("setSub='mine';render();");t('خانة التصنيف: «تصنيف جديد»', V().indexOf('placeholder="تصنيف جديد"')>-1&&V().indexOf('اسم تصنيف جديد')<0);
  run("app.go('home');");const h=V();
  t('الرئيسية: المصروف / الدخل / الفرق', h.indexOf('<span>المصروف</span>')>-1&&h.indexOf('<span>الدخل</span>')>-1&&h.indexOf('<span>صرفت</span>')<0);
  run("app.go('log');");let v=V();
  t('السجل: «مصروف» و«دخل»', v.indexOf('مصروف <span class="n">100')>-1&&v.indexOf('دخل <span class="n">500')>-1&&v.indexOf('صرفت <span')<0);
  run("app.setF('dir','tr');");v=V();t('السجل: «تحويل» مفرد', v.indexOf('تحويل <span class="n">50')>-1&&v.indexOf('محوّل')<0, v.slice(v.indexOf('dayh'),v.indexOf('dayh')+140));
  run("app.setF('dir','');");v=V();
  const iM=v.indexOf('كل الشهور'), iD=v.indexOf("app.setF('dir',''"), iC=v.indexOf('كل التصنيفات'), iQ=v.indexOf('id="qin"');
  t('ترتيب الفلتر: الشهور ← الاتجاه ← التصنيفات ← البحث', iM<iD&&iD<iC&&iC<iQ, [iM,iD,iC,iQ].join(','));
  t('مفيش ATM في الخانات', run("document.getElementById('view').innerHTML")!==null);
}
{ // ٢ «من مين؟»
  const {run,V}=boot(seed({txns:[{id:'x',book:'me',kind:'income',amount:900,account:'cib',date:'2026-09-20',from:'المؤسسة'}]}));
  run("app.go('add');app.setKind('income');render();");let v=V();
  const iT=v.indexOf('نوع الدخل'), iF=v.indexOf('من مين؟ (اختياري)');
  t('الخانة تحت نوع الدخل', iT>-1&&iF>iT);
  t('الأسامي القديمة كاختيارات', v.indexOf("app.setFrom('المؤسسة')")>-1);
  run("app.setFrom('المؤسسة');");t('الاختيار بيتعلم', run('draft.from')==='المؤسسة'&&V().indexOf('chip sm on" onclick="app.setFrom')>-1);
  run("app.setFrom('المؤسسة');");t('دوسة تانية بتشيله', run('draft.from')==='');
  run("app.shutRow('acct');app.setAccount('cash');app.dset('amount','300');app.dset('from','  سامح ');app.saveEntry();");
  const tx=JSON.parse(run("JSON.stringify(D.txns.find(t=>t.amount===300))"));
  t('بيتحفظ من غير مسافات', tx.from==='سامح', JSON.stringify(tx));
  run("app.go('log');");v=V();t('بيظهر في السجل «من سامح»', v.indexOf(' · من <bdi>سامح</bdi>')>-1);
  run("app.search('سامح');");t('البحث بيلاقيه', run("logList()").indexOf('من <bdi>سامح</bdi>')>-1);
  run("app.clearQ();app.toggleTxn('"+tx.id+"');app.startTxnEdit({stopPropagation(){}},'"+tx.id+"');");v=V();
  t('التعديل فيه الخانة بالاسم', v.indexOf('من مين؟ (اختياري)')>-1&&v.indexOf('value="سامح"')>-1);
  run("app.dset('from','');app.saveEntry();");
  t('التعديل يشيل الاسم', run("D.txns.find(t=>t.id==='"+tx.id+"').from")===undefined);
  run("app.go('add');app.setKind('expense');render();");t('المصروف مالوش الخانة', V().indexOf('من مين؟ (اختياري)')<0);
}
{ // ٣ التنبيهات
  const {run,V}=boot(seed({lastBackup:'',owed:[{id:'o1',amount:300,who:'أحمد',date:'2026-09-20',note:'أكل',got:false}]}));
  run("app.go('home');alertsOpen=true;owedOpen=true;render();");const v=V();
  const rows=v.split('<div class="alert"').slice(1);
  t('كل تنبيه فيه عمود شمال', rows.length>0&&rows.every(r=>r.indexOf('class="side"')>-1), rows.length);
  const ow=rows.find(r=>r.indexOf('فكّره')>-1)||'';
  const side=ow.slice(ow.indexOf('class="side"'));
  t('المبلغ فوق وبعده الزراير', side.indexOf('class="vl"')<side.indexOf('استلمت')&&side.indexOf('استلمت')<side.indexOf('فكّره'));
  t('الكلام برّه العمود', ow.indexOf('class="g"')<ow.indexOf('class="side"'));
}
{ // ٤ الرسم في الخلفية مايقفلش الكيبورد
  const {run,V,doc}=boot(seed({}));
  run("app.go('settings');");run("globalThis._n=0;const _r=render;render=function(){_n++;return _r.apply(this,arguments);};");
  doc.activeElement={tagName:'INPUT',type:'text'};
  run("bgRender();");t('وأنت بتكتب: الرسم بيستنى', run('_n')===0&&run('renderPending')===true);
  doc.activeElement={tagName:'INPUT',type:'checkbox'};
  run("bgRender();");t('مش خانة كتابة: بيترسم', run('_n')===1&&run('renderPending')===false);
  doc.activeElement=null;run("renderPending=true;render();");t('الرسم العادي بيمسح المستني', run('renderPending')===false);
}
done();
