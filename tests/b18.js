const {boot,seed,t,done}=require('./harness');
const H=s=>s.replace(/&#39;/g,"'").replace(/&quot;/g,'"');
// بيدوس على زرار في صف معين بالاسم الظاهر، وبيرجّع الشاشة بعدها
function tap(run,V,key,label){
  const v=V();const re=new RegExp('onclick="(app\\.shutRow\\(\''+key+'\'\\);[^"]*)">'+label+'<');
  const m=v.match(re);if(!m)return null;run(H(m[1]));return V();
}
const shut=(v,key)=>v.indexOf("app.openRow('"+key+"')")>-1;
function check(name,run,V,key,label,stateExpr,want){
  const v=tap(run,V,key,label);
  const st=v?run(stateExpr):undefined;
  t('٥١ '+name, v&&shut(v,key)&&st===want, v?('state='+st+' shut='+shut(v,key)):'مالقيتش الزرار');
}
{ const S=seed({subs:[{id:'s1',name:'نتفليكس',amount:100,cur:'EGP',next:'2026-10-01',account:'card',cycle:'monthly',payments:[],dues:[]},
    {id:'s2',name:'تجربة',amount:0,cur:'EGP',next:'2026-10-01',account:'card',cycle:'trial',payments:[],dues:[]}],
    installments:[{id:'i1',name:'موبايل',monthly:500,months:10,paid:1,account:'cib',src:'card',start:'2026-08-01',payments:[]}],
    certs:[{id:'c1',name:'ش',type:'cert',amount:1000,monthly:10,start:'2026-01-01',end:'',account:'cib',bank:'cib',covered:'2026-09',payments:[]}]});
  const {run,V}=boot(S);
  run("app.go('wallet');wtab='subs';render();app.toggleSub();");
  check('اشتراك جديد: النوع',run,V,'subcycle','تجربة مجانية',"subDraft.cycle",'trial');
  check('اشتراك جديد: هتجدد',run,V,'subren','أيوه',"subDraft.willRenew",true);
  check('اشتراك جديد: العملة',run,V,'subcur2','بالدولار',"subDraft.cur",'USD');
  check('اشتراك جديد: بعد التجربة',run,V,'subaft','سنوي',"subDraft.afterCycle",'yearly');
  run("app.subPick('cycle','monthly');");
  check('اشتراك جديد: متقسم',run,V,'subsplit','أيوه',"subDraft.split",true);
  run("app.startSubEdit('s1');");
  check('تعديل اشتراك: الدورة',run,V,'sdcycles1','سنوي',"sDraft.cycle",'yearly');
  check('تعديل اشتراك: العملة',run,V,'sdcurs1','بالدولار',"sDraft.cur",'USD');
  check('تعديل اشتراك: متقسم',run,V,'sdsplits1','أيوه',"sDraft.split",true);
  run("app.go('wallet');wtab='subs';app.startConv('s2');");
  check('تحويل التجربة: هتجدد',run,V,'subren2','أيوه',"subDraft.willRenew",true);
  run("app.go('wallet');wtab='ins';render();app.toggleIns();");
  check('قسط جديد: مقسط على',run,V,'inssrc','سلفة',"insDraft.src",'office');
  run("app.startInsEdit('i1');");
  t('تعديل قسط على كارت: مفيش اختيار «سلفة»', V().indexOf("iDraftPick('src',v))('office')")<0);
  run("app.go('wallet');wtab='accounts';showAddAcc=true;render();");
  check('حساب جديد: النوع',run,V,'acctype','كارت ائتماني',"accDraft.atype",'credit');
  check('حساب جديد: الضمان',run,V,'accsec','أيوه',"accDraft.sec",true);
  check('حساب جديد: التأمين',run,V,'accins','أيوه',"accDraft.insure",true);
  run("app.accType('save');");
  check('وعاء جديد: العايد',run,V,'svfreqnew','شهري',"accDraft.saveFreq",'month');
  run("app.go('wallet');wtab='certs';showCert=true;render();");
  check('شهادة: النوع',run,V,'certtype','وديعة',"certDraft.type",'deposit');
  run("app.go('wallet');wtab='veh';render();app.toggleVeh&&app.toggleVeh();");
  check('مركبة: النوع',run,V,'vehkind','عربية',"vehDraft.kind",'عربية');
  run("app.go('settings');setsOpen.accs=true;setsOpen.month=true;setsOpen.daftar=true;render();");
  run("app.openAccCfg('cib');");
  check('إعدادات: نطاق الحساب',run,V,'scopecib','الاتنين',"D.accounts.find(a=>a.id==='cib').scope",'both');
  run("app.openAccCfg('card');");
  check('إعدادات: التأمين',run,V,'insurecard','لأ',"D.accounts.find(a=>a.id==='card').insure",false);
  run("setsOpen={month:true};render();");
  check('إعدادات: الشهر',run,V,'monthmode','من المرتب',"D.monthMode",'salary');
  run("setsOpen={accs:true};app.openAccCfg('cash');");
  check('إعدادات: نوع الحساب',run,V,'cfgtypecash','محفظة موبايل',"accCfg.cash.atype",'wallet');
}
{ const {run,V}=boot(null);
  check('البداية: العهدة',run,V,'weloff','أيوه',"wel.office",true);
  check('البداية: الشهر',run,V,'welmm','من أول الشهر',"wel.monthMode",'cal');
}
{ const {run,V}=boot(seed());
  run("app.setBook('office');app.go('add');app.oKind('xfer');render();");
  const v=V();t('٥١ تحويل العهدة: الحساب صف بيتقفل', v.indexOf("app.shutRow('oxfrom')")>-1);
  run("app.go('wallet');wtab='close';render();");
  check('التقفيل',run,V,'closemode','الباقي ينتقل',"closeMode",'carry');
}
done();
