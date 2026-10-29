const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const source = fs.readFileSync('index.html','utf8');
const search = source.slice(source.indexOf('        function performSearch()'),source.indexOf('        function updateFilterTags()'));
function run(values) {
    let result;
    const properties = [
        {id:1,status:'À louer',city:'Abidjan',type:'Studio',price:30000,rooms:1,surface:25},
        {id:2,status:'À vendre',city:'Abidjan',type:'Villa',price:50000000,rooms:4,surface:200},
        {id:3,status:'À louer',city:'Bouaké',type:'Maison',price:80000,rooms:3,surface:100}
    ];
    const elements = {};
    const get = id => elements[id] ||= {value: values[id] || '',scrollIntoView(){}};
    const context = {properties,document:{getElementById:get},displayProperties:r=>{result=r},updateFilterTags(){}};
    vm.runInNewContext(search+';performSearch();',context);
    return result.map(p=>p.id).join(',');
}
test('filters combine price, rooms and surface',()=>assert.equal(run({'search-status':'À louer','filter-rooms':'2','filter-surface':'80'}),'3'));
test('price ordering does not mutate source order',()=>assert.equal(run({'filter-sort':'price-desc'}),'2,3,1'));
test('budget and property type combine',()=>assert.equal(run({'search-type':'Studio','search-price':'50000'}),'1'));
test('empty results remain empty',()=>assert.equal(run({'filter-surface':'500'}),''));
