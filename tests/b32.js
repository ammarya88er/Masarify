const {boot,seed,t,done}=require('./harness');
{ // «تقدر تصرف كام» اتشال، وملخص الشهر فاضل
  const {run,V}=boot(seed());
  run("app.go('home');");const v=V();
  t('«تقدر تصرف كام» اتشال', v.indexOf('تقدر تصرف كام')<0&&run("typeof dailyBudget")==='undefined');
  t('زرار صورة الملخص اتشال، ومكانه «ملخص الشهر»', v.indexOf('ابعت ملخص الشهر كصورة')<0&&v.indexOf("app.sumToggle()")>-1);
}
done();
