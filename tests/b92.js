// دفعة اشتراك حركتها مش في السجل بتتشال من الاشتراك من غير ما أي رقم يتغير
const {boot,seed,t,done}=require('./harness');
const fs=require('fs');
{ const S=()=>seed({txns:[{id:'f1',book:'me',kind:'expense',amount:30,cat:'fees',account:'card',date:'2026-08-26',note:'تدبير'},
    {id:'p2',book:'me',kind:'expense',amount:500,cat:'subs',account:'card',date:'2026-09-01',note:'X'}],
    subs:[{id:'s1',name:'X',amount:500,cur:'EGP',cycle:'monthly',next:'2026-10-01',account:'card',day:1,people:[],dues:[],
      payments:[{d:'2026-08-01',t:'gone',fee:30,feeTxn:'f1'},{d:'2026-09-01',t:'p2',paid:500},{d:'2026-07-01',type:'skip'}]}]});
  const {run,B}=boot(S());
  t('الدفعة اللي حركتها مش موجودة اتشالت، والباقي زي ما هو', run("JSON.stringify(D.subs[0].payments.map(p=>p.d))")==='["2026-09-01","2026-07-01"]');
  t('حركة التدبير فاضلة', run("D.txns.some(x=>x.id==='f1')"));
  t('رصيد الكارت ماتغيرش', B('me','card')===42000-530);
}
if(fs.existsSync(__dirname+'/backup.json')){ // على بياناتك: ولا رقم بيتغير
  const R=JSON.parse(fs.readFileSync(__dirname+'/backup.json','utf8'));
  const {run}=boot(R,Date.UTC(2026,10,16,9));
  const cl=run("JSON.stringify((D.subs.find(s=>/claude/i.test(s.name))||{payments:[]}).payments.map(p=>p.d))");
  t('اشتراك Claude: دفعة 25 أغسطس اتشالت', cl.indexOf('2026-08-25')<0&&cl.indexOf('2026-09-25')>-1, cl);
  const bal=run("JSON.stringify([balances('me'),balances('office')])");
  const ids=new Set(R.txns.map(x=>x.id));let sum=0;R.txns.forEach(x=>sum+=Number(x.amount)||0);
  t('مفيش حركة اتشالت أو اتغيرت', run("D.txns.length")>=R.txns.length&&R.txns.every(x=>run("D.txns.some(y=>y.id==='"+x.id+"')")));
  // نفس الأرصدة لو الدفعة كانت لسه موجودة
  const R2=JSON.parse(JSON.stringify(R));(R2.subs.find(s=>/claude/i.test(s.name))||{}).payments=(R2.subs.find(s=>/claude/i.test(s.name))||{payments:[]}).payments.filter(p=>p.d!=='2026-08-25');
  const b2=boot(R2,Date.UTC(2026,10,16,9));
  t('الأرصدة نفسها بالظبط', bal===b2.run("JSON.stringify([balances('me'),balances('office')])"));
}
done();
