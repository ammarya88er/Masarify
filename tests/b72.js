// صف الفاتورة في سطر واحد، وملخص الشهر مع المرتب
const {boot,seed,t,done}=require('./harness');
{ // صف الفاتورة
  const {run,V}=boot(seed({txns:[{id:'p',book:'me',kind:'expense',amount:10,cat:'drinks',account:'cash',date:'2026-09-01',items:[{name:'شاي',amount:10,cat:'drinks'}]}]}));
  run("app.go('scan');app.manualBill();scan.items=[{name:'شاي',amount:30,cat:'drinks',qty:2}];render();");
  const v=V();
  t('سطر واحد من غير فاصل', v.indexOf('class="rl r1"')>-1&&v.indexOf('class="br"')<0);
  t('العدد جنب الاسم', /class="nml"><span class="qx on"/.test(v));
  t('التصنيف تحت الاسم بسهم صغير', v.indexOf('class="sub"')>-1&&v.indexOf('مشروبات ▾')>-1);
  t('تغيّر السعر كلمة «أغلى» مش سهم لوحده', v.indexOf('↑ أغلى')>-1&&v.indexOf('class="pa ')<0);
  run("app.priceFor(0);");
  t('الدوسة بتوري آخر سعر', V().indexOf('آخر مرة')>-1);
}
const tx=(id,date,amt,o)=>Object.assign({id:id,book:'me',kind:'expense',amount:amt,cat:'other',account:'cash',date:date},o||{});
const sal=(id,date)=>({id:id,book:'me',kind:'income',amount:10000,account:'cash',date:date,salary:true,note:'مرتب'});
const S=()=>seed({monthMode:'salary',txns:[sal('s1','2026-08-25'),
  tx('a','2026-09-01',100,{cat:'snacks',items:[{name:'شيبسي',amount:30,cat:'snacks',qty:3},{name:'بسبوسة',amount:70,cat:'snacks'}]}),
  tx('b','2026-09-05',40,{cat:'snacks',items:[{name:'شيبسي',amount:10,cat:'snacks'},{name:'كيكة',amount:30,cat:'snacks'}]}),
  tx('b2','2026-09-05',20,{cat:'snacks',items:[{name:'شيبسي',amount:20,cat:'snacks'}]}),
  tx('c','2026-09-06',900,{cat:'bills',note:'نت'}),tx('d','2026-09-07',50,{cat:'bills',note:'رصيد'}),tx('d2','2026-09-08',60,{cat:'bills',note:'رصيد'}),tx('d3','2026-09-09',70,{cat:'bills',note:'رصيد'}),
  tx('e','2026-09-10',500,{cat:'transport',note:'أوبر'}),
  tx('f','2026-09-12',200,{cat:'produce',items:[{name:'موز',amount:100,cat:'produce'},{name:'خيار',amount:100,cat:'produce',who:'علي'}]})]});
{ // حاجة اتشرت مرتين وأكتر من ربع تصنيفها: فيها؛ والبنزين لأ
  const s=seed({monthMode:'salary',txns:[sal('s1','2026-08-25'),sal('s2','2026-09-25'),
    tx('m1','2026-09-01',60,{cat:'stimulants',items:[{name:'مونستر',amount:60,cat:'stimulants'}]}),
    tx('m2','2026-09-03',60,{cat:'stimulants',items:[{name:'مونستر',amount:60,cat:'stimulants'}]}),
    tx('m3','2026-09-04',100,{cat:'stimulants',note:'قهوة'}),
    tx('f1','2026-09-02',300,{cat:'fuel',note:'بنزين'}),tx('f2','2026-09-09',300,{cat:'fuel',note:'بنزين'}),tx('f3','2026-09-16',300,{cat:'fuel',note:'بنزين'})]});
  const {run}=boot(s,Date.UTC(2026,8,26,9));
  const h=JSON.parse(run("JSON.stringify(periodSummary('2026-08-25','2026-09-24').high.map(i=>i.name))"));
  t('مونستر (مرتين، 54%) فيها، والبنزين لأ', h.indexOf('مونستر')>-1&&h.indexOf('بنزين')<0, h.join());
}
{ // قبل المرتب التاني: مفيش ملخص
  const {run,V}=boot(S(),Date.UTC(2026,8,20,9));run("app.go('home');");
  t('مفيش شهر خلص لسه', V().indexOf('ملخص الشهر من')<0);
}
{ const s=S();s.txns.push(sal('s2','2026-09-25'));
  const {run,V}=boot(s,Date.UTC(2026,8,26,9));run("app.go('home');");
  t('في الرئيسية سطر صغير بس، والملخص مقفول', V().indexOf('ملخص الشهر اللي فات جاهز')>-1&&V().indexOf('ممكن تقلل من')<0);
  run("app.sumNewToggle();");
  const v=V();
  t('«افتحه» بيوري ملخص الشهر اللي خلص', v.indexOf('الشهر من 25 أغسطس لـ 24 سبتمبر')>-1);
  t('فيه صرفت ودخلك وفاضل', v.indexOf('>صرفت<')>-1&&v.indexOf('>دخلك<')>-1&&v.indexOf('>فاضل<')>-1);
  t('كل التصنيفات ظاهرة', ['سناكس وحلويات','فواتير','مواصلات','خضار وفاكهة'].every(x=>v.indexOf(x)>-1));
  const h0=v.indexOf('ممكن تقلل من'), hi=v.slice(h0,v.indexOf('<div class="sec"',h0));
  t('الشيبسي (3 مرات شرا) في «ممكن تقلل من»', hi.indexOf('شيبسي')>-1&&hi.indexOf('3 مرات')>-1, hi.slice(0,600));
  t('البسبوسة (مرة واحدة) مش فيها حتى لو أكتر من ربع التصنيف', hi.indexOf('بسبوسة')<0);
  t('الفواتير مش فيها حتى لو اتكررت', hi.indexOf('رصيد')<0&&hi.indexOf('>نت<')<0);
  t('تصنيف بحاجة واحدة بس مايتحسبش عالي لوحده (أوبر)', hi.indexOf('أوبر')<0);
  t('نصيب حد تاني مش محسوب (الخيار)', hi.indexOf('خيار')<0);
  t('مفيش زرار صورة', v.indexOf('كصورة')<0);
  run("app.sumHide(lastDonePeriod().key);");
  t('✕ بيشيله ومايرجعش', V().indexOf('ملخص الشهر اللي فات جاهز')<0);
  run("app.sumToggle();");
  t('«ملخص الشهر» في حركة الشهر بيفتح ملخص الفترة المختارة', V().indexOf('ممكن تقلل من')>-1);
}
done();
