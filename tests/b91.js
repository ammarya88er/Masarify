// تنضيف إعدادات الكارت القديمة اللي على مستوى البرنامج، من غير ما الكروت تتأثر
const {boot,seed,t,done}=require('./harness');
{ const s=seed({stmtDay:12,graceDay:8,insureRate:1.1});
  s.accounts.push({id:'k0',name:'كارت قديم',opening:5000,limit:5000,credit:true,atype:'credit',scope:'me'});
  const {run}=boot(s);
  t('اتشالت من البيانات', run("D.stmtDay===undefined&&D.graceDay===undefined&&D.insureRate===undefined"));
  t('الكارت القديم خد القيم بتاعتها قبل ما تتشال', run("JSON.stringify(['stmtDay','graceDay','insureRate'].map(k=>D.accounts.find(a=>a.id==='k0')[k]))")==='[12,8,1.1]');
  t('الكارت اللي كان ليه قيمه ماتغيرش', run("D.accounts.find(a=>a.id==='card').stmtDay")===20);
  t('الإعدادات اللي لسه مستخدمة فاضلة', run("D.licExp!==undefined&&D.vchAcct!==undefined&&D.cardDigits!==undefined"));
  run("app.go('home');app.go('wallet');app.go('settings');");t('الشاشات شغالة', true);
}
done();
