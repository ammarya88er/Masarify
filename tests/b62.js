// الدفعة ٢: العملية الواحدة، التعديل الكامل، التراجع، المسح بكل اللي مربوط، فاصلة الكيبورد العربي، الأرقام الإنجليزي
const {boot,seed,t,done}=require('./harness');
const ex=(id,amount,o)=>Object.assign({id,book:'me',kind:'expense',amount,cat:'other',account:'cash',date:'2026-09-20'},o||{});
{ // التراجع بعد الحفظ بيرجّع الشاشة مليانة
  const {run,V}=boot(seed());
  run("app.go('add');app.setKind('expense');app.setAccount('cash');app.setCat('other');app.dset('amount','75');app.dset('note','غدا');app.saveEntry();");
  t('اتحفظ وفيه تراجع', run("D.txns.length")===1&&run("lastUndo?lastUndo.label:''")!=='');
  run("app.undoLast();");
  t('التراجع شال الحركة', run("D.txns.length")===0);
  t('ورجّع الشاشة بالخانات', run("tab")==='add'&&run("draft.amount")==='75'&&run("draft.note")==='غدا');
  run("app.go('log');");
  t('السجل مفيهوش تراجع بعد ما اتعمل', V().indexOf('آخر عملية')<0);
}
{ // التراجع عن المسح بيرجّع كل اللي مربوط
  const {run}=boot(seed());
  run("app.go('add');app.setKind('expense');app.setAccount('cash');app.setCat('other');app.dset('amount','300');app.setOwed(true);draft.owedKind='share';draft.owedPeople=[{name:'علي',amount:'100'}];app.saveEntry();");
  const id=run("D.txns[0].id");
  run("app.delTxn({stopPropagation(){}},'"+id+"')");
  t('المسح شال الحركة واللي على علي', run("D.txns.length")===0&&run("(D.owed||[]).length")===0);
  run("app.go('log');");
  t('فوق السجل: تراجع', run("lastUndo?1:0")===1);
  run("app.undoLast();");
  t('التراجع رجّعهم', run("D.txns.length")===1&&run("D.owed.length")===1&&run("D.owed[0].who")==='علي');
}
{ // التعديل بيفتح نفس الشاشة وبيقدر يغيّر مين اللي عليه
  const {run,B}=boot(seed({txns:[ex('e1',300,{note:'بيتزا'})]}));
  run("app.go('log');app.startTxnEdit({stopPropagation(){}},'e1');");
  t('حركة قديمة بتتفتح بخانات شاشة التسجيل جوه السجل', run("tab")==='log'&&run("editInline")==='e1'&&run("draft.amount")==='300'&&run("draft.note")==='بيتزا');
  run("app.setOwed(true);draft.owedKind='share';draft.owedPeople=[{name:'هاجر',amount:'100'}];app.saveEntry();");
  t('بقى جزء منه على هاجر ونفس الحركة', run("D.txns.length")===1&&run("D.txns[0].id")==='e1'&&run("D.owed.length")===1&&run("D.owed[0].srcTxn")==='e1');
  t('رجع للسجل', run("tab")==='log');
  // هاجر دفعت ٤٠، وبعدين قلّلت نصيبها لأقل من كده
  run("collectOwed([{src:'owed',ref:D.owed[0]}],40,'cash','هاجر');save();");
  run("app.startTxnEdit({stopPropagation(){}},'e1');draft.owedPeople=[{name:'هاجر',amount:'30'}];app.saveEntry();");
  t('مايتعدلش لأقل من اللي دفعته', run("D.owed[0].gotAmount")===40&&run("lastUndo?1:0")===1||run("D.owed.find(o=>o.who==='هاجر').gotAmount")===40);
  run("app.cancelEditOp();app.startTxnEdit({stopPropagation(){}},'e1');draft.owedPeople=[{name:'هاجر',amount:'150'}];app.saveEntry();");
  const o=JSON.parse(run("JSON.stringify(D.owed[0])"));
  t('نصيبها زاد والمدفوع محسوب', o.gotAmount===40&&o.amount===110&&!o.got, JSON.stringify(o));
  // مسح التحصيل يرجّع الفلوس عندها
  const g=run("D.txns.find(x=>/تحصيل/.test(x.note)).id");
  run("app.delTxn({stopPropagation(){}},'"+g+"')");
  const o2=JSON.parse(run("JSON.stringify(D.owed[0])"));
  t('مسح التحصيل رجّع ال ٤٠ عليها', o2.amount===150&&!o2.gotAmount&&!o2.got, JSON.stringify(o2));
}
{ // عملية المكتب: التعديل والمسح في الدفترين
  const {run}=boot(seed());
  run("app.setBook('office');app.go('add');app.oKind('expense');app.oAccount('cib');app.oSet('item','ورق');app.oCat(D.ocats[0].id);app.oSet('amount','500');app.oSet('onote','لمكتب الجمرك');app.oToMe(true);app.oTo('cash');app.oSave();");
  const ids=run("D.txns.map(x=>x.id).sort().join()");
  run("app.setBook('me');app.go('log');");
  t('ملاحظات المكتب ظاهرة في دفترك', run("logList()").indexOf('لمكتب الجمرك')>-1);
  const mine=run("D.txns.find(x=>x.book==='me').id");
  run("app.startTxnEdit({stopPropagation(){}},'"+mine+"');");
  t('تعديل حركتك بيفتح شاشة المكتب', run("book")==='office'&&run("draftO.item")==='ورق'&&run("draftO.onote")==='لمكتب الجمرك');
  run("app.oSet('item','حبر');app.oSet('amount','650');app.oSave();");
  t('الاتنين اتعدلوا بنفس الأرقام', run("D.txns.map(x=>x.id).sort().join()")===ids&&run("D.txns.every(x=>x.amount===650)")&&run("D.txns.find(x=>x.book==='office').item")==='حبر'&&run("D.txns.find(x=>x.book==='me').note")==='حبر');
  run("app.delTxn({stopPropagation(){}},'"+mine+"')");
  t('المسح من دفترك شال الاتنين', run("D.txns.length")===0&&run("Object.keys(D.ops||{}).length")===0);
}
{ // الحركات المربوطة القديمة: التعديل مابيمسحش حاجة
  const s=seed({txns:[{id:'o1',book:'office',kind:'expense',amount:525,account:'cib',date:'2026-09-26',item:'نت',ocat:'shared',note:'نت',link:'L1',real:524.4,ocard:'card'},
    {id:'m1',book:'me',kind:'income',amount:0.6,account:'cib',date:'2026-09-26',link:'L1',note:'باقي تقريب — نت'},
    {id:'s1',book:'office',kind:'transfer',amount:450,account:'cib',to:'ocash',date:'2026-10-06',link:'L2',swap:true,note:'تبديل مع العهدة'},
    {id:'s2',book:'me',kind:'transfer',amount:450,account:'cash',to:'cib',date:'2026-10-06',link:'L2',swap:true,note:'تبديل مع العهدة'}]});
  const {run}=boot(s);
  run("app.startTxnEdit({stopPropagation(){}},'o1');eTxn.note='انترنت';app.saveTxnEdit('o1');");
  t('اسم البند اتغير وفضل «باقي تقريب —»', run("D.txns.find(x=>x.id==='m1').note")==='باقي تقريب — انترنت');
  run("app.startTxnEdit({stopPropagation(){}},'s2');eTxn.date='2026-10-05';app.saveTxnEdit('s2');");
  t('تعديل التبديل مامسحش وصفه في المكتب', run("D.txns.find(x=>x.id==='s1').note")==='تبديل مع العهدة'&&run("D.txns.find(x=>x.id==='s1').date")==='2026-10-05');
}
{ // مسح مرتجع
  const {run}=boot(seed({txns:[ex('a',5,{refundDone:true}),ex('r',-5,{refundOf:'a',note:'مرتجع'})]}));
  run("app.delTxn({stopPropagation(){}},'r')");
  t('مسح المرتجع رجّع الحركة مستنية', run("D.txns.find(x=>x.id==='a').refundDone")===undefined);
}
{ // فاصلة كيبورد الأرقام العربي والأرقام الإنجليزي
  const {run,V}=boot(seed());
  t('«٫» نقطة عشرية', run("onlyNum('١٤٧٫٣٤')")==='147.34');
  t('الفاصلة وانت بتكتب = كسور', run("numFix({value:'147,5'},1)")==='147.5'&&run("numFix({value:'12،75'},1)")==='12.75');
  t('رسايل البنك: الفاصلة آلاف', run("onlyNum('1,250.00')")==='1250.00');
  run("app.go('settings');setsOpen={month:1};setSub='prices';render();");
  const h=V();
  t('مفيش أرقام عربي في الشاشات', !/[٠-٩]/.test(h.replace(/<[^>]+>/g,'')), (h.match(/.{20}[٠-٩].{20}/)||[''])[0]);
}
done();
