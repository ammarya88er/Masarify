// «فيه جزء من كاش العهدة؟» بيظهر بس لما يبقى ليه معنى
const {boot,seed,t,done}=require('./harness');
const q='فيه جزء من كاش العهدة؟';
{ const {run,V}=boot(seed());
  run("app.go('add');app.setKind('expense');app.setAccount('card');");
  t('بالكارت: مش ظاهر', V().indexOf(q)<0);
  run("app.setAccount('cib');");
  t('من البنك: مش ظاهر', V().indexOf(q)<0);
  run("app.setAccount('cash');");
  t('كاش وفيه فلوس في كاش العهدة: ظاهر', V().indexOf(q)>-1);
  run("app.setAccount('card');app.setCat('other');app.dset('amount','50');app.setOwed(false);draft.hasFee=false;draft.hasDisc=false;draft.svFee=false;draft.arr=false;render();app['saveEntry']();");
  t('السؤال المستخبي مابيعطلش الحفظ', run("D.txns.length")===1);
}
{ const S=seed();S.accounts.find(a=>a.id==='ocash').openingOffice=0;
  const {run,V}=boot(S);
  run("app.go('add');app.setKind('expense');app.setAccount('cash');");
  t('كاش العهدة صفر: مش ظاهر', V().indexOf(q)<0);
}
{ const {run,V}=boot(seed());
  run("app.go('add');app.setKind('expense');app.setAccount('cash');app.setFromFloat(true);app.setAccount('card');");
  t('لو قلت أيوه قبل كده يفضل ظاهر', V().indexOf(q)>-1);
}
done();
