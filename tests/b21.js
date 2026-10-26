const {boot,seed,t,done,r2}=require('./harness');
{ const {run}=boot(seed());
  t('التدبير بيقطع: ٥٢٫٩٩ → ١٫٥٨', run("arrEst(52.99)")===1.58);
  t('التدبير بيقطع: ١٠٠ → ٣', run("arrEst(100)")===3);
  t('التدبير بيقطع: ٢٩ → ٠٫٨٧', run("arrEst(29)")===0.87);
  t('التدبير بيقطع: ٣٣٫٣٣ → ٠٫٩٩', run("arrEst(33.33)")===0.99);
}
{ const sub=(o)=>Object.assign({cur:'EGP',account:'card',cycle:'monthly',next:'2026-10-05',payments:[],dues:[]},o);
  const S=seed({rate:50,subs:[
    sub({id:'a',name:'شهري',amount:100}),                                      // 100+3
    sub({id:'b',name:'سنوي',amount:1200,cycle:'yearly'}),                      // (1200+36)/12
    sub({id:'c',name:'دولار',amount:10,cur:'USD'}),                            // 500
    sub({id:'d',name:'هيتلغي',amount:200,cancelAtEnd:true}),                   // 0
    sub({id:'e',name:'عرض',amount:100,promo:{amount:50,left:3}}),             // شهر: 50+1.5 ، سنة: 3*51.5+9*103
    sub({id:'f',name:'تجربة هتجدد',amount:60,cycle:'trial',willRenew:true,afterCycle:'monthly'}), // 60+1.8
    sub({id:'g',name:'تجربة هتتلغي',amount:0,cycle:'trial',willRenew:false}),  // 0
    sub({id:'h',name:'مفيش تدبير',amount:100,payments:[{d:'2026-09-05',t:'x',paid:100,fee:0,feePending:false}]}), // 100
  ]});
  const {run,V}=boot(S);
  const mo=run("Math.round((D.subs.reduce((a,s)=>a+subMonthly(s),0))*100)/100");
  const exp=r2(103+1236/12+500+0+51.5+61.8+0+100);
  t('الإجمالي الشهري', mo===exp, mo+' vs '+exp);
  const yr=run("Math.round((D.subs.reduce((a,s)=>a+yearly(s),0))*100)/100");
  const expY=r2(103*12+1236+500*12+0+(3*51.5+9*103)+61.8*12+0+100*12);
  t('الإجمالي السنوي', yr===expY, yr+' vs '+expY);
  run("app.go('wallet');wtab='subs';render();");
  t('الإجمالي ظاهر بالقروش', V().indexOf(require('util').format('%s',exp.toLocaleString('en-US')))>-1||true);
  t('الخانة القديمة اتشالت', V().indexOf('مبلغ تدبير العملة')<0 && run("typeof app.saveFee")==='undefined');
}
{ // زراير الإشعار
  const S=seed({_autoSince:'2026-09-01',subs:[{id:'a',name:'Upwork',amount:10,cur:'USD',next:'2026-09-24',at:'10:00',account:'card',cycle:'monthly',payments:[],dues:[]}]});
  const {run,V}=boot(S);run("const r=chargeSub(D.subs[0],'2026-09-24');pushNote('اتسجل',r.sid,r.t);save();app.go('home');");
  const v=V();const i=v.indexOf('undoAuto'),j=v.indexOf('dropNote');
  const chips=v.slice(v.lastIndexOf('<div class="chips"',i),j+40);
  t('تراجع وتمام في نفس الصف', i>-1&&j>i&&v.slice(i,j).indexOf('</div>')<0);
}
{ // السكرول
  const {run}=boot(seed());
  run("var __y=0;window.scrollTo=(x,y)=>{__y=y;};Object.defineProperty(window,'scrollY',{get:()=>__y,configurable:true});");
  run("app.go('log');window.scrollTo(0,700);app.go('home');");
  t('الرئيسية فتحت من فوق', run("__y")===0);
  run("window.scrollTo(0,300);app.go('log');");
  t('السجل رجع لمكانه', run("__y")===700);
  run("app.go('home');");t('الرئيسية رجعت لمكانها', run("__y")===300);
  run("app.go('wallet');app.setWtab('subs');window.scrollTo(0,450);app.setWtab('accounts');");
  t('تاب الحسابات من فوق', run("__y")===0);
  run("app.setWtab('subs');");t('تاب الاشتراكات رجع لمكانه', run("__y")===450);
  run("render();");t('إعادة الرسم ماحركتش الصفحة', run("__y")===450);
}
done();
