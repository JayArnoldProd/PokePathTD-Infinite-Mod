// Runs the distributed/installed formatter with both its localized text and fallback labels.
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const root = path.resolve(process.argv[2] || path.join(__dirname, '../patches'));
const installed = fs.existsSync(path.join(root, 'src/js/game/UI.js'));
const source = fs.readFileSync(path.join(root, installed ? 'src/js/game/UI.js' : 'UI.modded.js'), 'utf8');
const textSource = fs.readFileSync(path.join(root, installed ? 'src/js/file/text.js' : 'text.modded.js'), 'utf8');
const start = source.indexOf('const UI_LOCALIZED_LABELS =');
const end = source.indexOf('export class UI');
assert.ok(start >= 0 && end > start, 'Formatter and labels must precede UI');
const localized = {ui:{}};
const units = ['billion','trillion','quadrillion','quintillion','sextillion','septillion','octillion','nonillion','decillion'];
for (const unit of units) {
    const match = textSource.match(new RegExp('^\\s*'+unit+': (\\[[^\\r\\n]+\\]),?$', 'm'));
    assert.ok(match, 'Missing localized text: '+unit);
    localized.ui[unit] = JSON.parse(match[1]);
    assert.equal(localized.ui[unit].length, 10);
}
const cases = [[-1,'$0'],[NaN,'$0'],[Infinity,'$0'],[null,'$0'],[999,'$999'],['1000000000000000000','$1.00 QUINTILLION'],[99999999999,'$100.00 BILLION'],[1.25e18,'$1.25 QUINTILLION'],[Number.MAX_SAFE_INTEGER,'$9.01 QUADRILLION']];
for (const text of [localized, {}]) {
    const context = vm.createContext({text});
    const {format, labels} = vm.runInContext(source.slice(start,end)+'\n({format:formatGoldWords,labels:UI_LOCALIZED_LABELS})',context);
    for (const [value, expected] of cases) assert.equal(format(value,0,String),expected);
    for (const [index, unit] of units.entries()) {
        assert.deepEqual(Array.from(labels[unit]),localized.ui[unit]);
        for (let lang=0;lang<10;lang++) {
            const value=10 ** (9+index*3);
            assert.equal(format(value,lang,String),'$1.00 '+localized.ui[unit][lang].toUpperCase());
            assert.equal(format(value*1.25,lang,String),'$1.25 '+localized.ui[unit][lang].toUpperCase());
        }
    }
    assert.equal(format(1e36,0,String),'$1,000.00 DECILLION');
    assert.ok(!/[0-9]e[+-][0-9]/i.test(format(Number.MAX_VALUE,0,String)));
}
console.log('PASS gold words: nine named scales, ten languages, fallback parity, invalid inputs and finite extremes');
