// قاعدة المسافات: أي حاجة جاية بعد زرار كبير على طول ماتلزقش فيه
const {t,done}=require('./harness');
const fs=require('fs');
const h=fs.readFileSync(process.env.MASAREEF_HTML||__dirname+'/../index.html','utf8');
t('القاعدة موجودة في الشكل', /\.btn\+:not\(\.btn\):not\(button\):not\(\.hint\):not\(input\):not\(label\)\{margin-top:22px;\}/.test(h));
t('وقاعدة صفوف الاختيارات لسه موجودة', h.indexOf(':where(.chips,.drow){margin-top:12px;}')>-1);
done();
