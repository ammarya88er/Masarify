// أسامي الأصناف اللي شبه بعض: مراجعة وتوحيد، واقتراح وانت بتسجل فاتورة
const {boot,seed,t,done}=require('./harness');
const rc=(id,date,items)=>({id:id,book:'me',kind:'expense',amount:items.reduce((a,i)=>a+i.amount,0),cat:items[0].cat,account:'cash',date:date,items:items});
const S=()=>seed({txns:[
  rc('a','2026-09-01',[{name:'مشروب طاقة مونستر',amount:60,cat:'stimulants'}]),
  rc('b','2026-09-02',[{name:'مشروب طاقة مونستر',amount:60,cat:'stimulants'},{name:'فلفل أخضر حار',amount:10,cat:'produce'}]),
  rc('c','2026-09-03',[{name:'مونستر',amount:60,cat:'stimulants'},{name:'غوريلا',amount:150,cat:'snacks'}]),
  rc('d','2026-09-04',[{name:'مشروب طاقة جوريلا',amount:40,cat:'stimulants'},{name:'فلفل حار اخضر',amount:10,cat:'produce'}]),
  rc('e','2026-09-05',[{name:'زبدة المراعي 100 جرام',amount:60,cat:'dairy'}]),
  rc('f','2026-09-06',[{name:'زبدة المراعي 200 جرام',amount:110,cat:'dairy'},{name:'شيبسي بيج شيبس 85 جرام',amount:20,cat:'snacks'},{name:'زبدة فول سوداني',amount:90,cat:'grocery'}]),
  rc('g','2026-09-07',[{name:'شيبسي بيج شيبس',amount:20,cat:'snacks'},{name:'زبدة',amount:50,cat:'dairy'}])]});
{ const {run,V}=boot(S());
  const P=JSON.parse(run("JSON.stringify(simPairs().map(p=>[p.from.name,p.to.name]))"));
  const has=(f,to)=>P.some(p=>p[0]===f&&p[1]===to);
  t('مونستر ← مشروب طاقة مونستر (الأكتر)', has('مونستر','مشروب طاقة مونستر'));
  t('ترتيب مختلف: فلفل', P.some(p=>p.indexOf('فلفل أخضر حار')>-1&&p.indexOf('فلفل حار اخضر')>-1));
  t('غوريلا الحلويات مش مع مشروب الطاقة', !P.some(p=>p.indexOf('غوريلا')>-1));
  t('حجمين مختلفين مايتوحدوش', !P.some(p=>p.indexOf('زبدة المراعي 100 جرام')>-1&&p.indexOf('زبدة المراعي 200 جرام')>-1));
  t('من غير حجم ← اللي فيه الحجم', has('شيبسي بيج شيبس','شيبسي بيج شيبس 85 جرام'));
  t('تصنيف مختلف: زبدة فول سوداني لأ', !P.some(p=>p.indexOf('زبدة فول سوداني')>-1));
  run("app.go('home');alertsOpen=true;render();");
  t('سطر في «محتاج انتباهك»', V().indexOf('أسامي أصناف شبه بعض')>-1&&V().indexOf('app.goNames()')>-1);
  run("app.goNames();");
  t('الإعدادات: الاقتراحات بأزرارها', V().indexOf('يتوحّدوا على:')>-1&&V().indexOf('>اسم تاني<')>-1&&V().indexOf('دول مختلفين')>-1);
  run("app.nameMerge('مونستر','مشروب طاقة مونستر');");
  t('اتغيّر في الفواتير القديمة', run("D.txns.find(x=>x.id==='c').items[0].name")==='مشروب طاقة مونستر'&&!run("simPairs().some(p=>p.from.name==='مونستر')"));
  run("app.nameNo('فلفل أخضر حار','فلفل حار اخضر');");
  t('«دول مختلفين» مايرجعش', !run("simPairs().some(p=>p.from.name.indexOf('فلفل')>-1)"));
}
{ // في الفاتورة
  const {run,V}=boot(S());
  run("app.go('scan');app.manualBill();scan.items=[{name:'مونستر',amount:60,cat:'stimulants'},{name:'جوريلا',amount:100,cat:'snacks'},{name:'زبدة المراعي 200 جرام',amount:110,cat:'dairy'}];render();");
  const v=V();
  t('«قصدك مشروب طاقة مونستر؟» تحت الصنف', v.indexOf('class="rl simh"')>-1&&v.indexOf('مشروب طاقة مونستر · مرتين')>-1);
  t('جوريلا في الحلويات: الاقتراح «غوريلا» مش مشروب الطاقة', v.indexOf('مشروب طاقة جوريلا')<0);
  t('اسم موجود بحجمه: مفيش اقتراح لحجم تاني', (v.match(/class="rl simh"/g)||[]).length===2, (v.match(/class="rl simh"/g)||[]).length);
  run("app.simUse(0,'مشروب طاقة مونستر');");
  t('الدوسة بتغيّر الاسم', run("scan.items[0].name")==='مشروب طاقة مونستر');
  run("app.simNo('جوريلا');");
  t('✕ بيخفي الاقتراح', V().indexOf('class="rl simh"')<0);
}
{ // الملخص: نفس الحاجة بحجم مختلف = حاجة واحدة
  const {run}=boot(S());
  const h=JSON.parse(run("JSON.stringify(periodSummary('2026-09-01','2026-09-30').high.map(i=>i.name+':'+i.n))"));
  t('زبدة المراعي 100 و200 اتحسبوا مع بعض', h.some(x=>x.indexOf('زبدة المراعي')===0&&/:2$/.test(x)), h.join());
}
{ // مراجعة: التوحيد في نفس التصنيف بس، والتراجع باسم العملية، والاسم اللي فيه سطر جديد
  const s=S();s.txns.push(rc('h','2026-09-08',[{name:'مونستر',amount:30,cat:'other'}]));
  const {run}=boot(s);
  run("app.nameMerge('مونستر','مشروب طاقة مونستر','stimulants');");
  t('مونستر في تصنيف تاني ماتغيّرش', run("D.txns.find(x=>x.id==='h').items[0].name")==='مونستر'&&run("D.txns.find(x=>x.id==='c').items[0].name")==='مشروب طاقة مونستر');
  t('شريط التراجع باسم التوحيد', /وحّدت/.test(run("lastUndo&&lastUndo.label")||''), run("lastUndo&&lastUndo.label"));
  t('اسم فيه سطر جديد مابيكسرش الزرار', run("jsArg('زبدة\\nالمراعي')").indexOf('\n')<0);
  t('الوحدات: 85g زي 85 جرام', run("nmInfo('شيبسي 85g').size")===run("nmInfo('شيبسي 85 جرام').size"));
}
{ // نفس الاسم بحروف مخفية أو رقم عربي: اسم واحد مش اقتراح
  const s=S();s.txns.push(rc('m1','2026-09-09',[{name:'لبن المراعي 1 لتر',amount:55,cat:'dairy'}]),rc('m2','2026-09-10',[{name:'لبن\u00A0المراعي ١ لتر\u200F',amount:56,cat:'dairy'}]));
  const {run,V}=boot(s);
  t('الاسمين اتنضّفوا لاسم واحد', run("D.txns.find(x=>x.id==='m2').items[0].name")==='لبن المراعي 1 لتر');
  t('مش طالعين اقتراح', !run("simPairs().some(p=>p.to.name.indexOf('لبن')>-1)"));
  run("app.goNames();");
  t('الاقتراحات فيها آخر سعر', V().indexOf('آخر سعر')>-1);
}
{ // كارت واحد لكل مجموعة، واسم جديد من عندك، و«مش زيهم»
  const s=seed({txns:[rc('a','2026-09-01',[{name:'مكرونة بيني إيتاليانو 1 كيلو',amount:61,cat:'grocery'}]),
    rc('b','2026-09-02',[{name:'مكرونة بيني إيتاليانو',amount:28,cat:'grocery'}]),rc('c','2026-09-03',[{name:'مكرونة إيتاليانو',amount:28,cat:'grocery'}])]});
  const {run,V}=boot(s);
  const G=JSON.parse(run("JSON.stringify(simGroups().map(g=>g.list.map(x=>x.name)))"));
  t('التلاتة في كارت واحد', G.length===1&&G[0].length===3, JSON.stringify(G));
  run("app.goNames();app.nameGroupPick(0,'__new__');");
  t('«اسم تاني» بيفتح خانة', V().indexOf('placeholder="اكتب الاسم"')>-1);
  run("app.nameGroupCustom(0,'مكرونة إيتاليانو بيني');app.nameGroupMerge(0);");
  t('التلاتة بقوا بالاسم الجديد', run("D.txns.every(x=>x.items[0].name==='مكرونة إيتاليانو بيني')"));
  run("app.undoLast();");
  t('التراجع رجّعهم', run("D.txns.find(x=>x.id==='a').items[0].name")==='مكرونة بيني إيتاليانو 1 كيلو');
  run("app.nameNoOne(0,0);");
  const G2=JSON.parse(run("JSON.stringify(simGroups().map(g=>g.list.map(x=>x.name)))"));
  t('«مش زيهم» شال الاسم ده بس', !G2.some(g=>g.indexOf('مكرونة بيني إيتاليانو 1 كيلو')>-1)&&G2.length===1, JSON.stringify(G2));
}
{ // مراجعة: «جبنة رومي» و«جبنة بيضا» مايتجمعوش عن طريق «جبنة»، والاسم المستبعد مايبقاش هو الهدف
  const s=seed({txns:[rc('a','2026-09-01',[{name:'جبنة',amount:20,cat:'dairy'}]),rc('a2','2026-09-01',[{name:'جبنة بيضا',amount:30,cat:'dairy'}]),rc('a3','2026-09-02',[{name:'جبنة بيضا',amount:30,cat:'dairy'}]),
    rc('b','2026-09-02',[{name:'جبنة رومي',amount:50,cat:'dairy'}])]});
  const {run}=boot(s);
  const G=JSON.parse(run("JSON.stringify(simGroups().map(g=>g.list.map(x=>x.name)))"));
  t('مفيش كارت فيه رومي وبيضا مع بعض', !G.some(g=>g.indexOf('جبنة رومي')>-1&&g.indexOf('جبنة بيضا')>-1), JSON.stringify(G));
}
done();
