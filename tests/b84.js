// الدفعة ٤ (٢): الحاجات اللي عايز أقللها — درجات على تصنيف أو صنف
const {boot,seed,t,done}=require('./harness');
const NOW=Date.UTC(2026,9,26,9);
const sal=(d)=>({id:'s'+d,book:'me',kind:'income',amount:10000,account:'cib',date:d,salary:true});
const bill=(id,date,items)=>({id,book:'me',kind:'expense',amount:items.reduce((a,i)=>a+i.amount,0),cat:items[0].cat,account:'cash',date,merchant:'م',items});
const S=seed({txns:[sal('2026-07-25'),sal('2026-08-25'),sal('2026-09-25'),sal('2026-10-25'),
  bill('a','2026-10-25',[{name:'شيبسي',amount:20,cat:'snacks'},{name:'لبن',amount:50,cat:'dairy'}]),
  bill('b','2026-10-22',[{name:'شيبسي',amount:30,cat:'snacks'}]),
  bill('c','2026-09-01',[{name:'بسكويت',amount:90,cat:'snacks'}]),
  bill('d','2026-08-10',[{name:'شيبسي',amount:60,cat:'snacks'}]),
  {id:'e',book:'me',kind:'expense',amount:100,cat:'eatout',account:'cash',date:'2026-10-25',note:'بيتزا'}],monthMode:''});
const {run,V}=boot(S,NOW);
t('من غير درجات: مفيش حاجة في الرئيسية', (run("app.go('home');"),V().indexOf('الحاجات اللي عايز أقللها')<0));
t('الدرجات الافتراضية', run("lvList().map(l=>l.label).join()")==='مضر,مش مفيد,رفاهية');
// على تصنيف كامل
run("app.lvSetCat('snacks','useless');");
let st=JSON.parse(run("JSON.stringify(lvStats(lvNow().from,lvNow().to))"));
t('الشهر ده: صرفت كام وكام مرة', st.useless.amount===20&&st.useless.n===1, JSON.stringify(st.useless));
run("app.go('home');");
t('الرئيسية: الدرجة وبقالك قد إيه', V().indexOf('الحاجات اللي عايز أقللها')>-1&&V().indexOf('مش مفيد')>-1&&V().indexOf('آخر مرة إمبارح')>-1);
// درجة الصنف تكسب
run("app.lvSetItem('شيبسي','harm');");
st=JSON.parse(run("JSON.stringify(lvStats(lvNow().from,lvNow().to))"));
t('الصنف بدرجته هو مش درجة تصنيفه', st.harm.amount===20&&st.useless.amount===0);
run("app.lvSetItem('شيبسي','');");
t('«من غير» على صنف تصنيفه ليه درجة: بيتحفظ «none»', run("D.cutItem[lvKey('شيبسي')]")==='none'&&run("lvOf('snacks','شيبسي')")===null);
run("app.lvSetItem('شيبسي','harm');");
// حركة عادية من غير أصناف: بالملاحظة
run("app.lvSetItem('بيتزا','lux');");
st=JSON.parse(run("JSON.stringify(lvStats(lvNow().from,lvNow().to))"));
t('حركة عادية بالملاحظة', st.lux.amount===100&&st.lux.n===1);
// ملخص الشهر: قصاد متوسط اللي قبله
const P={from:'2026-09-25',to:'2026-10-24'};
const h=run("lvSumHtml({from:'2026-09-25',to:'2026-10-24'})");
t('ملخص الشهر: الدرجة ومتوسط الشهور اللي قبلها', h.indexOf('مضر')>-1&&h.indexOf('متوسط آخر شهرين')>-1, h.replace(/<[^>]+>/g,' ').replace(/\s+/g,' '));
// شاشة التسجيل: زرار «حدد درجة» جنب التصنيف وسطر المجموع
run("app.go('add');app.setKind('expense');app.setCat('snacks');");
t('التسجيل: «غيّر الدرجة» جنب التصنيف (التصنيف ليه درجة)', V().indexOf('غيّر الدرجة')>-1&&V().indexOf('الشهر ده لحد دلوقتي')>-1);
run("app.setCat('dairy');");t('تصنيف من غير درجة: «حدد درجة»', V().indexOf('حدد درجة')>-1);
run("app.lvEntryToggle();app.lvEntrySet('lux');");
t('اتحددت للتصنيف كله', run("D.cutCat.dairy")==='lux');
run("app.dset('note','زبادي');app.lvEntryToggle();app.lvScope('item');app.lvEntrySet('harm');");
t('ولصنف لوحده بالملاحظة', run("D.cutItem[lvKey('زبادي')]")==='harm');
// الفاتورة: نقطة صغيرة جنب التصنيف
run("app.go('scan');app.manualBill();scan.items=[{name:'شيبسي',amount:10,cat:'snacks'}];render();");
t('الفاتورة: نقطة جنب التصنيف من غير زرار جديد', /class="cdot" title="مضر"/.test(V())&&V().indexOf('حدد درجة')<0);
t('الفاتورة: سطر المجموع', V().indexOf('مضر الشهر ده لحد دلوقتي')>-1);
// السجل: دوسة على الصنف
run("app.cancelScan();app.go('log');openTxn='a';app.lvItemFor('a',1);");
t('السجل: دوسة على الصنف بتفتح الدرجات', V().indexOf('«لبن» بس')>-1);
run("app.lvSetItem('لبن','useless');");t('اتحفظت من السجل', run("lvOf('dairy','لبن').id")==='useless');
// الإعدادات: تعديل اسم ومسح درجة
run("app.lvRename('lux','كماليات');");t('اسم الدرجة اتغير', run("lvById('lux').label")==='كماليات');
run("app.lvDel('harm');");
t('مسح درجة: اللي عليها بقى من غير، والحركات زي ما هي', !run("Object.values(D.cutItem).includes('harm')")&&run("D.txns.length")===S.txns.length);
// نسخة قديمة من غير الخانات دي بتفتح عادي
const r=boot(seed(),NOW);r.run("app.go('home');app.go('settings');setsOpen={cutlv:true};render();");
t('الإعدادات بتفتح على نسخة قديمة', r.V().indexOf('الدرجات')>-1);
done();
