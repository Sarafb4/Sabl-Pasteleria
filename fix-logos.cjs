const fs = require('fs');
let css = fs.readFileSync('src/styles/global.css', 'utf8');
css = css.replace(/\.logo\{--m:url\(data:image\/png;base64,[^)]+\)\}/g, '.logo{--m:url(/logo.png)}');
css = css.replace(/\.lg\{--m:url\(data:image\/png;base64,[^)]+\)\}/g, '.lg{--m:url(/lg.png)}');
fs.writeFileSync('src/styles/global.css', css);
