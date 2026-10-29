const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
function setup(overrides={}) {
    const elements={};const calls=[];
    const auth={
        signUp:async payload=>{calls.push(['signup',payload]);return {error:null}},
        signInWithPassword:async payload=>{calls.push(['login',payload]);return {data:{user:{id:'uuid-a'}},error:null}},
        resetPasswordForEmail:async(...args)=>{calls.push(['reset',...args]);return {error:null}},
        signOut:async()=>{calls.push(['logout']);return {error:null}}, ...overrides
    };
    const ctx={_supabase:{auth},document:{addEventListener(){},getElementById:id=>elements[id] ||= {textContent:''},querySelector:()=>({value:'aya@example.test',reportValidity:()=>true})},location:{origin:'https://souaci.vercel.app'},isLoggedIn:false,updateNavForLoggedInUser(){},renderGuestNav(){},closeAuthModal(){calls.push(['close'])},loadCloudProperties:async()=>{},showNotification(){},setTimeout(){},localStorage:{removeItem(){}}};
    vm.createContext(ctx);vm.runInContext(fs.readFileSync('auth.js','utf8'),ctx);
    return {ctx,calls,elements,run:s=>vm.runInContext(s,ctx)};
}
function formEvent(inputs) {
    const button={disabled:false};
    return {event:{preventDefault(){},target:{querySelectorAll:()=>inputs.map(value=>({value})),querySelector:s=>s==='[type="submit"]'?button:s==='[type="email"]'?{value:'aya@example.test'}:{value:'a-secure-password'}}},button};
}
test('signup uses Auth with private profile metadata, never legacy table',async()=>{
 const s=setup();const {event,button}=formEvent(['Aya','Koffi','aya@example.test','0700000000','Abidjan','long-password']);s.ctx.event=event;
 await s.run('handleRegister(event)');
 assert.equal(s.calls[0][0],'signup');assert.equal(s.calls[0][1].options.data.prenom,'Aya');
 assert.equal(s.calls[0][1].options.emailRedirectTo,'https://souaci.vercel.app/auth-callback.html');assert.equal(button.disabled,false);
});
test('login uses verified Auth result and closes the dialog',async()=>{
 const s=setup();s.ctx.event=formEvent([]).event;await s.run('handleLogin(event)');
 assert.equal(s.run('currentAuthUser.id'),'uuid-a');assert.equal(s.ctx.isLoggedIn,true);assert.ok(s.calls.some(c=>c[0]==='close'));
});
test('failed login does not authenticate browser',async()=>{
 const s=setup({signInWithPassword:async()=>({data:{},error:new Error()})});s.ctx.event=formEvent([]).event;await s.run('handleLogin(event)');
 assert.equal(s.ctx.isLoggedIn,false);assert.ok(s.elements['auth-error'].textContent.includes('Connexion impossible'));
});
test('password recovery uses dedicated callback',async()=>{
 const s=setup();await s.run('requestPasswordReset()');assert.equal(s.calls[0][2].redirectTo,'https://souaci.vercel.app/auth-callback.html?mode=recovery');
});
test('legacy password lookup is absent and ownership uses Auth UUID',()=>{
 const html=fs.readFileSync('index.html','utf8');assert.doesNotMatch(html,/hashPassword|eq\('mot_de_passe'|localStorage.getItem\('user_id'/);
 assert.match(html,/currentUserId === property.owner_auth_id/);assert.doesNotMatch(html,/utilisateurs \(telephone/);
});
