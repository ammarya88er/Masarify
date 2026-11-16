// خانة المكان في قسط السلفة زي قسط الكارت
const {boot,seed,t,done}=require('./harness');
const NOW=Date.UTC(2026,10,16,9);
{ const {run,V}=boot(seed(),NOW);
  run("app.go('wallet');wtab='ins';showIns=true;render();app.insSrc('office');");
  t('خانة المكان موجودة في السلفة', V().indexOf("app.insSet('place'")>-1);
  run("app.insSet('name','تلاجة');app.insSet('place','العربي');app.insSet('total','6000');app.insSet('monthly','1000');app.insSet('months','6');app.insSet('paid','0');app.insSet('day','5');app.insAccount('cash');app.addIns();");
  const id=run("D.installments[0].id");
  t('المكان اتسجل على القسط', run("D.installments[0].place")==='العربي');
  run("app.startPay('"+id+"','front');app.confirmPay('"+id+"');");
  const pt=run("D.installments[0].payments[0].t");
  t('دفعة القسط بالمكان', run("D.txns.find(x=>x.id==='"+pt+"').place")==='العربي');
  run("app.startInsEdit('"+id+"');");t('«عدّل» فيها المكان', V().indexOf("app.iDraftSet('place'")>-1);
  const pre=run("JSON.stringify(dKey(JSON.stringify(D)))");
  run("app.saveInsEdit('"+id+"');");t('حفظ من غير تغيير: ولا حاجة اتغيرت', run("JSON.stringify(dKey(JSON.stringify(D)))")===pre);
  const amt=run("D.txns.find(x=>x.id==='"+pt+"').amount");
  run("app.startInsEdit('"+id+"');app.iDraftSet('place','بي تك');app.saveInsEdit('"+id+"');");
  t('تغيير المكان بيمشي في القسط ودفعاته، والمبلغ زي ما هو', run("D.installments[0].place")==='بي تك'&&run("D.txns.find(x=>x.id==='"+pt+"').place")==='بي تك'&&run("D.txns.find(x=>x.id==='"+pt+"').amount")===amt);
}
done();
