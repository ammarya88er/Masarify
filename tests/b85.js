// «تقدر تصرف» سطر واحد، الاشتراكات المتوقفة تحت ورجوع التجديد، الأقساط والشهادات اللي خلصت، السكوتر، تذكير التبرع
const {boot,seed,t,done}=require('./harness');
const NOW=Date.UTC(2026,9,27,9);
const sal={id:'s',book:'me',kind:'income',amount:10000,account:'cib',date:'2026-10-25',salary:true};
const sub=o=>Object.assign({id:'a',name:'خدمة',amount:100,cur:'EGP',cycle:'monthly',next:'2026-11-05',account:'card',cat:'subs',arr:false,payments:[],dues:[]},o||{});

{ // ١ سطر واحد: اشتراكات الكارت + اللي على الكارت + فلوس عليك
  const S=seed({txns:[sal,{id:'c',book:'me',kind:'expense',amount:200,cat:'eatout',account:'card',date:'2026-10-26'}],subs:[sub()],
    owed:[{id:'o',who:'علي',amount:50,date:'2026-10-01'}]});
  const {run,V}=boot(S,NOW);run("app.go('home');");
  const c=JSON.parse(run("JSON.stringify(spendCalc())"));
  t('«بعد كل اللي عليك» فيه الاشتراك واللي على الكارت', Math.abs(c.y-(c.x-100-200))<0.01, c.y);
  t('«ولو رجعلك» عليه', Math.abs(c.z-(c.y+50))<0.01);
  t('مفيش «بعد اشتراكات الكارت»', V().indexOf('بعد اشتراكات الكارت')<0&&V().indexOf('بعد كل اللي عليك')>-1);
  run("app.spendToggle();");
  t('التفاصيل: عنوان واحد ومتظبط بمسافة', (V().match(/class="sph">في «بعد كل اللي عليك»/g)||[]).length===1&&V().indexOf('اللي عليك لكارت المشتريات')>-1);
  t('ليك عند الناس سطر زي الباقي', /<span class="nm">ليك عند الناس<\/span>/.test(V()));
}
{ // ٢ الاشتراكات المتوقفة
  const S=seed({txns:[sal],subs:[sub({id:'z',name:'متوقف',next:'2026-10-20',cancelAtEnd:true}),sub({id:'y',name:'هيقف',next:'2026-11-01',cancelAtEnd:true}),sub({id:'a',name:'شغال',next:'2026-11-20'})]});
  const {run,V}=boot(S,NOW);run("app.go('wallet');wtab='subs';render();");
  const v=V(), i1=v.indexOf('id="sub-a"'), i2=v.indexOf('id="sub-y"'), i3=v.indexOf('id="sub-z"');
  t('المتوقفة تحت (حتى اللي لسه مدته ماخلصتش)', i1>-1&&i1<i2&&i1<i3, [i1,i2,i3].join());
  t('باهتة', /id="sub-y" style="[^"]*opacity:\.5/.test(v)&&/id="sub-z" style="[^"]*opacity:\.5/.test(v));
  t('مكتوب «هيقف» و«اتوقف»', v.indexOf('هيقف يوم 1 نوفمبر 2026')>-1&&v.indexOf('اتوقف يوم 20 أكتوبر 2026')>-1);
  t('العدد للشغالين بس', /<b>1<\/b><span>اشتراك/.test(v));
  const blk=v.slice(i2,i3);
  t('المتوقف: «رجّع التجديد» و«امسح» بس', blk.indexOf('رجّع التجديد')>-1&&blk.indexOf('سجّل الدفع')<0&&blk.indexOf('⋯')<0);
  run("app.resOpen('z');");
  t('«رجّع التجديد» بيسأل: الميعاد النهارده والمبلغ والدورة', run("resDraft.next")===run("today()")&&run("resDraft.amount")==='100'&&V().indexOf('الخصم الجاي إمتى؟')>-1&&V().indexOf('الدورة')>-1);
  run("app.resSet('next','2026-11-15');app.resSet('amount','150');app.resSet('cycle','yearly');app.resDo('z');");
  const z=JSON.parse(run("JSON.stringify(D.subs.find(s=>s.id==='z'))"));
  t('رجع بالبيانات الجديدة', !z.cancelAtEnd&&z.next==='2026-11-15'&&z.amount===150&&z.cycle==='yearly'&&z.day===15);
  run("render();");t('ورجع مكانه وشكله', !/id="sub-z" style="[^"]*opacity/.test(V()));
  run("app.resOpen('y');app.resSet('next','2026-10-01');");
  t('ميعاد قبل النهارده مايتقبلش', run("resOk()")===false);
  run("app.resSet('next',today());app.resDo('y');");
  t('النهارده: «مستني الخصم»', run("subSoon(D.subs.find(s=>s.id==='y'))")===true&&!run("D.subs.find(s=>s.id==='y').cancelAtEnd"));
}
{ // ٣ الأقساط اللي خلصت والشهادات اللي اتصرفت
  const S=seed({txns:[sal],installments:[{id:'d',name:'خلص',monthly:100,months:2,paid:2,account:'cib',src:'card',start:'2026-01-01',payments:[]},
      {id:'n',name:'شغال',monthly:100,months:5,paid:1,account:'cib',src:'card',start:'2026-09-01',payments:[]}],
    certs:[{id:'r',name:'اتصرفت',type:'cert',amount:1000,monthly:10,start:'2026-03-01',account:'cib',bank:'cib',redeemed:true,redeemedOn:'2026-09-01',payments:[]},
      {id:'k',name:'شغالة',type:'cert',amount:1000,monthly:10,start:'2026-01-01',account:'cib',bank:'cib',payments:[]}]});
  const {run,V}=boot(S,NOW);run("app.go('wallet');wtab='ins';render();");
  t('القسط اللي خلص تحت وباهت', V().indexOf('id="pay-n"')<V().indexOf('id="pay-d"')&&/id="pay-d" style="[^"]*opacity:\.5/.test(V()));
  run("wtab='certs';render();");
  t('الشهادة اللي اتصرفت تحت وباهتة', V().indexOf('شغالة')<V().indexOf('اتصرفت<')&&/opacity:\.5/.test(V()));
}
{ // ٤ السكوتر: سطر واحد لكل حاجة، والتسجيلات جوه «عدّل»
  const S=seed({txns:[sal],vehicles:[{id:'v1',name:'سكوتر',maint:{oil:800,gear:3000,filter:'oil',warn:100},
    maintLog:[{id:'m1',part:'filter',date:'',odo:5000,act:'change'},{id:'m2',part:'filter',date:'2026-09-01',odo:5800,act:'clean'},{id:'m3',part:'oil',date:'2026-09-01',odo:5800}]}]});
  const {run,V}=boot(S,NOW);run("app.go('wallet');wtab='veh';render();");
  t('مفيش «سجلتها بإيدك» في الشاشة', V().indexOf('سجلتها بإيدك')<0&&V().indexOf('سجّل آخر مرة<')<0);
  t('الزرار «عدّل»', (V().match(/>عدّل<\/button>/g)||[]).length>=3);
  t('فلتر الهوا: آخر مرة بس', V().indexOf('آخر تنضيف عند')>-1);
  run("app.mLogOpen('v1','filter');");
  const v=V();
  t('جوه «عدّل»: التسجيلتين، الأحدث فوق، وكل واحدة «امسح»', v.indexOf('اللي سجلته بإيدك')>-1&&v.indexOf('تنضيف عند')<v.indexOf('تغيير عند')&&(v.match(/app\.mLogDel\('v1'/g)||[]).length===2);
  t('وتحتها «سجّل مرة جديدة»', v.indexOf('سجّل مرة جديدة')>v.indexOf('اللي سجلته بإيدك')&&v.indexOf('العداد كان كام؟')>-1);
  t('الزرار وهو مفتوح «إخفاء»', v.indexOf('>إخفاء</button>')>-1);
  run("app.mLogDel('v1','m2');");
  t('بعد المسح: آخر مرة بقت اللي قبلها', run("vehMaint('v1').rows[2].last.odo")===5000);
  run("app.undoLast();");t('والتراجع بيرجعها', run("vehMaint('v1').rows[2].last.odo")===5800);
  run("app.mLogOpen('v1','gear');");t('مفيش تسجيلات بإيدك: الخانات بس', V().indexOf('اللي سجلته بإيدك')<0&&V().indexOf('العداد كان كام؟')>-1);
}
{ // ٥ تذكير التبرع
  const {run,V}=boot(seed({txns:[sal,{id:'old',book:'me',kind:'expense',amount:500,cat:'donation',account:'cib',date:'2026-10-03'}]}),NOW);
  run("app.go('home');alertsOpen=true;render();");
  t('بعد المرتب: التنبيه ظاهر', V().indexOf('>التبرع<')>-1&&V().indexOf('>اتبرعت<')>-1&&V().indexOf('>فوّت<')>-1);
  t('برّه «تقدر تصرف»', JSON.stringify(JSON.parse(run("JSON.stringify(spendCalc())")).X).indexOf('تبرع')<0);
  run("app.donGo();");
  t('«اتبرعت»: تسجيل على «تبرعات» والمبلغ والحساب فاضيين', run("tab")==='add'&&run("draft.cat")==='donation'&&run("draft.amount")===''&&run("draft.account")==='');
  run("app.setAccount('cash');app.dset('amount','300');app.saveEntry();app.go('home');alertsOpen=true;render();");
  t('بعد ما سجلته التنبيه راح', V().indexOf('>التبرع<')<0);
  const r=boot(seed({txns:[sal]}),NOW);r.run("app.donSkip();app.go('home');alertsOpen=true;render();");
  t('«فوّت»: التنبيه راح', r.V().indexOf('>التبرع<')<0&&r.run("D.donSkip")==='2026-10-25');
  r.run("D.txns.push({id:'s2',book:'me',kind:'income',amount:10000,account:'cib',date:'2026-11-25',salary:true});");
  t('المرتب الجاي: التنبيه بيرجع', r.run("donDue()")===true);
  const n=boot(seed(),NOW);t('من غير مرتب: مفيش تنبيه', n.run("donDue()")===false);
}
done();
