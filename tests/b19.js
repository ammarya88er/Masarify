const {boot,seed,t,done}=require('./harness');
{ const S=seed();S.officeOn=false;const {run,V}=boot(S);
  run("app.go('wallet');wtab='ins';render();app.toggleIns();");
  t('سلفة ظاهرة والدفتر مقفول', V().indexOf('>سلفة<')>-1);
  run("app.insSrc('office');");t('خانة من مين ظهرت', V().indexOf('من مين؟')>-1);
  run("app.insSet('name','موبايل');app.insSet('from','أحمد');app.insSet('total','3000');app.insSet('monthly','500');app.insSet('months','6');insDraft.account='cash';app.addIns();");
  t('اتسجل من أحمد', run("D.installments[0].from")==='أحمد' && run("insSrcLabel(D.installments[0])")==='سلفة من أحمد', run("JSON.stringify(D.installments)"));
  run("app.go('wallet');wtab='ins';render();");t('ظاهرة في الكارت', V().indexOf('سلفة من أحمد')>-1);
  t('مش محسوبة بيانات مكتب', run("D.accounts.forEach(a=>a.openingOffice=0);hasOfficeData()")===false);
  const id=run("D.installments[0].id");
  run("app.startInsEdit('"+id+"');app.iDraftSet('from','محمد');app.saveInsEdit('"+id+"');");
  t('التعديل غيّر الاسم', run("D.installments[0].from")==='محمد');
  run("app.startInsEdit('"+id+"');app.iDraftPick('src','card');app.saveInsEdit('"+id+"');");
  t('السلفة مابتتحولش لكارت في التعديل', run("D.installments[0].src")==='office'&&run("D.installments[0].from")==='محمد');
}
done();
