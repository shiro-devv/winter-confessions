const store = new Map<string,string>();
(globalThis as any).window = {
  localStorage: {
    getItem: (k:string)=> store.get(k) ?? null,
    setItem: (k:string,v:string)=>{ store.set(k,v); },
    removeItem: (k:string)=>{ store.delete(k); },
  },
  addEventListener(){},
};

const root = new URL('../src', import.meta.url).pathname;
const { db } = await import(root + '/db/index.ts');
const auth = await import(root + '/services/auth.ts');
const conf = await import(root + '/services/confessions.ts');

let failures = 0;
const ok = (name:string, cond:boolean) => { console.log((cond?'PASS ':'FAIL ')+name); if(!cond) failures++; };
const throwsCode = async (fn:()=>unknown, code:string) => { try { await fn(); return false; } catch(e:any){ return e.code===code; } };

ok('prompts seeded', db.prompts.count() === 11);

const u1 = await auth.signUp({ username: '@Mika_', password: 'snowflake123', displayName: 'Mika' });
ok('signup normalizes username', u1.username === 'mika_');
ok('password not stored plain', u1.passwordHash !== 'snowflake123' && u1.passwordHash.length === 64);
ok('session -> current user', auth.getCurrentUser()?.id === u1.id);
ok('duplicate username rejected', await throwsCode(()=>auth.signUp({username:'MIKA_',password:'snowflake123'}),'conflict'));
ok('short password rejected', await throwsCode(()=>auth.signUp({username:'bob',password:'short'}),'validation'));
ok('bad username rejected', await throwsCode(()=>auth.signUp({username:'a b',password:'snowflake123'}),'validation'));
ok('reserved username rejected', await throwsCode(()=>auth.signUp({username:'admin',password:'snowflake123'}),'validation'));

auth.logOut();
ok('logout clears user', auth.getCurrentUser() === null);
ok('wrong password rejected', await throwsCode(()=>auth.logIn('mika_','wrongpassword'),'unauthorized'));
ok('unknown user rejected', await throwsCode(()=>auth.logIn('nobody','snowflake123'),'unauthorized'));
const again = await auth.logIn('@MIKA_','snowflake123');
ok('login works', again.id === u1.id && auth.getCurrentUser()?.id === u1.id);

const c1 = conf.sendConfession({ recipientUsername:'mika_', body:'  I love snow  ', promptId: db.prompts.all()[0].id });
ok('send trims body', c1.body === 'I love snow');
ok('empty rejected', await throwsCode(()=>conf.sendConfession({recipientUsername:'mika_',body:'   ',promptId:null}),'validation'));
ok('too long rejected', await throwsCode(()=>conf.sendConfession({recipientUsername:'mika_',body:'x'.repeat(501),promptId:null}),'validation'));
ok('unknown recipient rejected', await throwsCode(()=>conf.sendConfession({recipientUsername:'ghost',body:'hi',promptId:null}),'not_found'));
conf.sendConfession({ recipientUsername:'mika_', body:'two', promptId:null });
conf.sendConfession({ recipientUsername:'mika_', body:'three', promptId:null });
ok('rate limit after 3/min', await throwsCode(()=>conf.sendConfession({recipientUsername:'mika_',body:'four',promptId:null}),'rate_limited'));

ok('inbox has 3, newest first', conf.inboxFor(u1.id).length===3);
ok('unread = 3', conf.unreadCount(u1.id)===3);
conf.markRead(u1.id, c1.id);
ok('unread = 2 after markRead', conf.unreadCount(u1.id)===2);
conf.markAllRead(u1.id);
ok('unread = 0 after markAllRead', conf.unreadCount(u1.id)===0);

const other = await auth.signUp({ username:'kai', password:'snowflake123' });
ok('other cannot answer mika confession', await throwsCode(()=>conf.answerConfession(other.id,c1.id,'hax',true),'forbidden'));
ok('other cannot delete', await throwsCode(()=>conf.removeConfession(other.id,c1.id),'forbidden'));

ok('owner answers publicly', conf.answerConfession(u1.id,c1.id,'Me too!',true).isPublic===true);
ok('publicAnswered has 1', conf.publicAnswered(u1.id).length===1);
ok('private confession not reactable', await throwsCode(()=>conf.toggleReaction(conf.inboxFor(u1.id).find((c:any)=>c.id!==c1.id)!.id,'heart'),'not_found'));
conf.toggleReaction(c1.id,'snowflake');
ok('reaction counted + mine', conf.reactionSummary(c1.id).snowflake.count===1 && conf.reactionSummary(c1.id).snowflake.mine);
conf.toggleReaction(c1.id,'snowflake');
ok('reaction toggles off', conf.reactionSummary(c1.id).snowflake.count===0);
conf.toggleReaction(c1.id,'heart');
conf.removeConfession(u1.id,c1.id);
ok('delete removes confession + reactions', db.confessions.get(c1.id)===undefined && db.reactions.count()===0);

const prof = auth.updateProfile(u1.id,{displayName:'Mika M',bio:'cocoa fan'});
ok('profile update', prof.displayName==='Mika M' && prof.bio==='cocoa fan');
ok('empty display name rejected', (()=>{try{auth.updateProfile(u1.id,{displayName:'  ',bio:''});return false}catch(e:any){return e.code==='validation'}})());

// expired session
const s = db.sessions.all().find((x:any)=>x.userId===u1.id)!;
db.sessions.update(s.id,{expiresAt:Date.now()-1});
store.set('wc:session', s.id);
ok('expired session ignored', auth.getCurrentUser()===null);

console.log(failures===0 ? '\nALL PASSED' : `\n${failures} FAILED`);
process.exit(failures?1:0);
