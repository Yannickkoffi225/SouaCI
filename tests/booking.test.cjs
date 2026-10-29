const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
function setup(ownerPhone) {
    const elements = new Map();
    function element(id) {
        if (!elements.has(id)) elements.set(id, {value:'', textContent:'', hidden:true, listeners:{}, classList:{add(){},remove(){}}, addEventListener(type, fn){this.listeners[type]=fn}, focus(){}, reset(){}, reportValidity(){return true}, querySelectorAll(){return []}});
        return elements.get(id);
    }
    const urls = [];
    const context = {Intl,Date,Number,String,encodeURIComponent, properties:[{id:42,title:'Villa & jardin',commune:'Cocody',city:'Abidjan',price:500000,type:'Villa',status:'À louer',surface:120,ownerPhone}],formatPrice:p=>`${p} FCFA`,document:{getElementById:element},location:{origin:'https://souaci.example',pathname:'/'},window:{open:url=>{urls.push(url);return {}}}};
    vm.runInNewContext(fs.readFileSync('booking.js','utf8'),context);
    context.window.openVisitModal({focus(){}},0);
    element('visit-name').value = 'Aya & Jean';
    element('visit-phone').value = '+225 07 00 00 00 00';
    element('visit-date').value = '2099-12-31';
    element('visit-time').value = '10:30';
    return {element,urls,submit:()=>element('visit-form').listeners.submit({preventDefault(){}})};
}
test('button is included in each rendered property card',()=>{
    assert.match(fs.readFileSync('index.html','utf8'), /onclick="openVisitModal\(this, \$\{properties.indexOf\(property\)\}\)"/);
});
test('owner receives encoded property and appointment details',()=>{
    const s=setup('07 89 94 89 25');s.submit();
    const url = new URL(s.urls[0]);
    assert.equal(url.pathname,'/2250789948925');
    const text=url.searchParams.get('text');
    for(const expected of ['Villa & jardin','Aya & Jean','31/12/2099','10:30','Cocody','500000 FCFA / mois','Référence : 42'])assert.ok(text.includes(expected));
});
test('missing or invalid owner phone falls back to administrator',()=>{
    for(const phone of [undefined,'invalide']){const s=setup(phone);s.submit();assert.equal(new URL(s.urls[0]).pathname,'/2250789948925');}
});
test('valid international owner phone is used',()=>{
    const s=setup('+33 6 12 34 56 78');s.submit();assert.equal(new URL(s.urls[0]).pathname,'/33612345678');
});
test('past appointments and invalid client data do not open WhatsApp',()=>{
    const s=setup();s.element('visit-date').value='2020-01-01';s.submit();assert.equal(s.urls.length,0);
    s.element('visit-date').value='2099-12-31';s.element('visit-phone').value='abc';s.submit();assert.equal(s.urls.length,0);
    s.element('visit-phone').value='0700000000';s.element('visit-name').value='  ';s.submit();assert.equal(s.urls.length,0);
});
test('close restores hidden state',()=>{
    const s=setup();assert.equal(s.element('visit-modal').hidden,false);s.element('visit-close').listeners.click();assert.equal(s.element('visit-modal').hidden,true);
});
