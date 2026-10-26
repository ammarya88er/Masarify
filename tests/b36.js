const {boot,seed,t,done}=require('./harness');
{ // الجمعية — مشترك
  const {run,V,B}=boot(seed());
  run("app.go('wallet');app.setWtab('gam');");let v=V();
  t('تبويب الجمعيات موجود وفاضي', v.indexOf('ضيف جمعية')>-1&&v.indexOf('مفيش جمعيات')>-1);
  run("app.toggleGam();app.gamSet('name','جمعية الشغل');app.gamSet('amount','1000');app.gamSet('months','10');app.gamPick_start('2026-08');app.gamSet('turn','2');app.gamSet('day','5');app.gamPick_account('cash');render();");
  v=V();t('الفورم: مشترك قبل اللي بيلمها، ويوم ثابت قبل مع المرتب', v.indexOf('>مشترك<')<v.indexOf('أنا اللي بلمها')&&v.indexOf('يوم ثابت')<v.indexOf('مع المرتب'));
  run("app.saveGam();");const g=run("D.gams[0].id");
  t('اتسجلت', run("D.gams.length")===1&&run("D.gams[0].turn")===2);
  t('قسط أغسطس متأخر وسبتمبر (بعد يوم ٥) مستحق', run("gamDue(D.gams[0])")===true&&run("gamNext(D.gams[0])")===1&&run("gamIdx(D.gams[0])")===2);
  run("app.go('home');alertsOpen=true;render();");v=V();
  t('تنبيه القسط ودورك تقبض', (v.indexOf('قسط جمعية')>-1||v.indexOf('أقساط جمعية')>-1)&&v.indexOf('دورك تقبض الجمعية')>-1);
  const c0=B('me','cash'), spent0=run("monthStats().spent");
  run("app.gamStart('"+g+"','pay');app.gamDo();");
  t('القسط اتخصم من الكاش ومش محسوب صرف', B('me','cash')===c0-1000&&run("monthStats().spent")===spent0);
  run("app.gamStart('"+g+"','pay');app.gamDo();");
  t('قسطين', run("gamPaidKs(D.gams[0]).sort().join()")==='1,2'&&run("gamDue(D.gams[0])")===false);
  run("app.gamStart('"+g+"','get');gamAct.account='cib';app.gamDo();");
  const e0=run("monthStats().earned");
  t('القبض دخل CIB ومش محسوب دخل', run("gamGot(D.gams[0]).amount")===10000&&e0===run("0+monthStats().earned"));
  run("app.go('wallet');app.setWtab('gam');");v=V();
  t('قبضت قبل ما تخلص: عليك تكمّل 8,000', v.indexOf('عليك تكمّل <span class="n">8,000')>-1);
  t('في السجل تحويل ومكتوب جمعية', run("D.txns.filter(x=>x.gam).every(isXferLike)")&&(run("app.go('log');V=0")||1));
}
{ // اللي بيلمها
  const {run,V}=boot(seed({gams:[{id:'g',name:'ج',role:'org',amount:500,months:4,start:'2026-09',turn:1,payMode:'salary',members:[{name:'أحمد',turn:2},{name:'منى',turn:3}],col:{}}]}));
  run("app.go('wallet');app.setWtab('gam');");let v=V();
  t('اللي بيلم: الشهر ده بيقبض انت، وأسامي الناس', v.indexOf('بيقبض انت')>-1&&v.indexOf('>أحمد<')>-1&&v.indexOf('>منى<')>-1);
  run("app.gamCol('g','2026-09',0);");
  t('علّم أحمد دفع', run("D.gams[0].col['2026-09'].join()")==='أحمد');
  t('مع المرتب ومفيش مرتب خالص = مستحق من أول الشهر', run("gamDue(D.gams[0])")===true);
  run("app.startGamEdit('g');app.gamSet('name','جمعية البيت');app.saveGam();");
  t('التعديل', run("D.gams[0].name")==='جمعية البيت'&&run("D.gams[0].members.length")===2);
}
{ // التاريخ
  const {run}=boot(seed());// النهارده 25 سبتمبر 2026
  const f=r=>JSON.stringify(run("scanDateRead("+JSON.stringify(r)+")"));
  t('يوم/شهر/سنة', f('23/09/2026')==='{"date":"2026-09-23","sure":true}', f('23/09/2026'));
  t('شهر/يوم/سنة', f('09/23/2026')==='{"date":"2026-09-23","sure":true}');
  t('السنة الأول', f('2026-09-21')==='{"date":"2026-09-21","sure":true}');
  t('سنة برقمين', f('24/9/26')==='{"date":"2026-09-24","sure":true}');
  t('أرقام عربي', f('٢٢/٠٩/٢٠٢٦')==='{"date":"2026-09-22","sure":true}');
  t('مفيش تاريخ: النهارده ومش متأكد', f(null)==='{"date":"2026-09-25","sure":false}');
  t('تاريخ قديم: أقرب تاريخ صح ومش متأكد', f('01/01/2026')==='{"date":"2026-01-01","sure":false}');
  t('الساعة مش تاريخ', f('13:05 24/09/2026')==='{"date":"2026-09-24","sure":true}');
  t('اسم الشهر', f('Sep 23 2026')==='{"date":"2026-09-23","sure":true}');
  t('فاتورة من أسبوعين', f('15/09/2026')==='{"date":"2026-09-15","sure":false}');
}
{ // الأسعار والفاتورة
  const {run,V}=boot(seed({txns:[{id:'a',book:'me',kind:'expense',amount:80,account:'cash',date:'2026-09-10',place:'كارفور',items:[{name:'لبن المراعي 1 لتر',amount:40,cat:'dairy'},{name:'بيض 10 بيضات',amount:40,cat:'dairy'}]}]}));
  t('آخر سعر وزيادته', JSON.stringify(run("itemLast('لبن المراعي 1 لتر',44,1)"))==='{"date":"2026-09-10","price":40,"place":"كارفور","pct":10}');
  t('بسعر الوحدة', run("itemLast('بيض 10 بيضات',80,2).pct")===0);
  t('صنف جديد مالوش سهم', run("itemLast('حاجة',10)")===null);
  t('الأسامي القديمة بتتبعت مع الفاتورة', run("promptText()").indexOf('لبن المراعي 1 لتر')>-1&&run("promptText()").indexOf('الحجم')>-1);
  run("app.go('scan');scan={stage:'review',items:[{name:'لبن المراعي 1 لتر',amount:44,cat:'dairy'}],merchant:'كارفور',date:today(),account:'',dateWarn:true};render();");
  let v=V();
  t('سهم أحمر جنب السعر', v.indexOf('class="pa2 up"')>-1);
  run("app.priceFor(0)");v=V();t('بيقولك آخر مرة', v.indexOf('آخر مرة')>-1&&v.indexOf('في كارفور')>-1);
  t('خانة المحل ظاهرة وتحذير التاريخ', v.indexOf('اسم المحل (اختياري)')>-1&&v.indexOf('اتأكد من التاريخ')>-1);
  t('الجملة الجديدة بدل «اضغط م»', v.indexOf('اضغط <b')<0&&v.indexOf('دوس على «ليا»')>-1);
  run("app.scanDate(today())");t('اختيار التاريخ بيشيل التحذير', V().indexOf('اتأكد من التاريخ')<0);
  run("app.go('log');q='لبن';render();");v=V();
  t('البحث في السجل بيوري سعر الصنف', v.indexOf('لبن المراعي 1 لتر')>-1&&v.indexOf('−40')>-1);
}
{ // التصنيف والعدد والقبض
  const {run,V}=boot(seed({gams:[{id:'g',name:'ج',role:'member',amount:500,months:4,start:'2026-09',turn:3,payMode:'day',day:1,col:{}}]}));
  run("app.go('wallet');app.setWtab('gam');");t('«قبضت» مش ظاهر قبل دورك', V().indexOf('>قبضت<')<0);
  run("D.gams[0].turn=1;render();");t('«قبضت» ظاهر في دورك', V().indexOf('>قبضت<')>-1);
  run("app.go('scan');scan={stage:'review',manual:true,items:[{name:'صنف',amount:20,cat:'grocery'}],merchant:'',date:today(),account:''};render();");
  let v=V();t('التصنيف قايمة بالطول جوه الاسم', v.indexOf('class="ct"')>-1&&v.indexOf('app.setItemCat(0,this.value)')>-1&&v.indexOf('chip sm on" onclick="app.setItemCat')<0);
  t('×1 خانة صغيرة جنب الاسم ومفيش سطر تحت', v.indexOf('class="qx" dir="ltr">×<input aria-label="العدد"')>-1&&v.indexOf('color:#6B6558">العدد')<0);
  run("app.iset(0,'qty','3');app.setItemCat(0,'dairy');");v=V();
  t('اتغير التصنيف والعدد وظهر ×3', run("scan.items[0].cat")==='dairy'&&run("scan.items[0].qty")===3&&v.indexOf('value="3"')>-1&&v.indexOf('qx on')>-1);
  run("app.iset(0,'qty','1')");t('العدد ١ مش بيتحفظ', run("scan.items[0].qty")===undefined);
}
{ // المتأخر والدفع قبل كده
  const {run,V}=boot(seed({gams:[{id:'g',name:'ج',role:'member',amount:500,months:10,start:'2026-06',turn:9,payMode:'day',day:1,prePaid:2,col:{}}]}));
  t('دفعت ٢ قبل كده: الجاي تالت قسط', run("gamNext(D.gams[0])")===3&&run("gamPaid(D.gams[0])")===1000);
  run("app.go('home');alertsOpen=true;render();");t('التنبيه: عليك ٢ أقساط والجاي قسط', V().indexOf('عليك 2 أقساط جمعية · الجاي قسط')>-1);
}
done();
