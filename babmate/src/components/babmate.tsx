'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { ArrowDown, ArrowLeft, ArrowRight, Bell, Check, CheckCheck, ChevronDown, Clock3, Coffee, Heart, MapPin, MessageCircle, Plus, Search, Send, ShieldCheck, SlidersHorizontal, Sparkles, Sprout, Users, Utensils, X, Flag, Ban, LogOut, CalendarDays, LoaderCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { canCheckIn, canConfirm, demoProfile, foodImages, isSnuEmail, locations, mealTime, seedMeals, type Meal, type Message, type Profile } from '@/lib/data';
import { supabase } from '@/lib/supabase';

type View = 'discover' | 'mine' | 'profile' | 'about';
type Dialog = 'create' | 'auth' | 'filters' | null;
const storeKey = 'babmate-demo-v1';
const avatarColors = ['#e9c9ae', '#d9dfb8', '#d4ddec', '#e9c9cb'];
function Avatar({ person, index = 0, small = false }: { person: Profile; index?: number; small?: boolean }) { return <span className={`avatar ${small ? 'avatar-small' : ''}`} style={{ background: avatarColors[index % 4] }} title={`${person.name} · ${person.major}`}>{person.name.slice(0,1)}</span>; }
function Logo() { return <span className="brand"><span className="brand-icon"><Utensils size={20}/></span>밥메이트<span className="brand-dot">.</span></span>; }

export default function Babmate() {
 const [view, setView] = useState<View>('discover');
 const [meals, setMeals] = useState<Meal[]>([]);
 const [profile, setProfile] = useState<Profile>(demoProfile);
 const [messages, setMessages] = useState<Message[]>([]);
 const [blocked, setBlocked] = useState<string[]>([]);
 const [selected, setSelected] = useState<string | null>(null);
 const [dialog, setDialog] = useState<Dialog>(null);
 const [editing, setEditing] = useState<string | null>(null);
 const [chat, setChat] = useState(false);
 const [filter, setFilter] = useState('전체');
 const [location, setLocation] = useState(locations[0]);
 const [size, setSize] = useState('all');
 const [query, setQuery] = useState('');
 const [toast, setToast] = useState('');
 const [error, setError] = useState('');
 const [loading, setLoading] = useState(true);
 const [busy, setBusy] = useState(false);
 const [signedIn, setSignedIn] = useState(false);
 const [mineTab, setMineTab] = useState('upcoming');
 const [now, setNow] = useState(Date.now());
 const demo = !supabase;
 const notify = (message: string) => setToast(message);
 const reload = useCallback(async () => {
   if (!supabase) return;
   const { data, error: fetchError } = await supabase.rpc('get_meals');
   if (fetchError) throw fetchError;
   setMeals(data || []);
 }, []);
 useEffect(() => {
   const timer = setInterval(() => setNow(Date.now()), 30000);
   async function init() {
     try {
       if (supabase) {
         const { data: { session } } = await supabase.auth.getSession();
         setSignedIn(!!session);
         if (session) {
           const { data, error } = await supabase.from('profiles').select('*').eq('id',session.user.id).single();
           if (error) throw error;
           setProfile({ ...data, verified: true });
           const { data: blockData } = await supabase.from('blocks').select('blocked_id');
           setBlocked((blockData || []).map(b => b.blocked_id));
         }
         await reload();
       } else {
         const saved = localStorage.getItem(storeKey);
         if (saved) { const state = JSON.parse(saved); setMeals(state.meals); setProfile(state.profile); setMessages(state.messages || []); setBlocked(state.blocked || []); }
         else setMeals(seedMeals());
       }
     } catch (e) { setError(e instanceof Error ? e.message : '불러오지 못했어요. 다시 시도해 주세요.'); }
     finally { setLoading(false); }
   }
   void init();
   const subscription = supabase?.auth.onAuthStateChange((event) => { if (event === 'SIGNED_IN' || event === 'SIGNED_OUT') window.location.reload(); });
   return () => { clearInterval(timer); subscription?.data.subscription.unsubscribe(); };
 }, [reload]);
 useEffect(() => { if (!loading && demo) localStorage.setItem(storeKey, JSON.stringify({ meals, profile, messages, blocked })); }, [meals, profile, messages, blocked, loading, demo]);
 useEffect(() => { if (!toast) return; const timeout = setTimeout(() => setToast(''),4500); return () => clearTimeout(timeout); },[toast]);
 const active = meals.find(m => m.id === selected);
 const joined = !!active?.participants.some(p => p.id === profile.id);
 useEffect(() => {
   if (!supabase || !selected || !joined) return;
   const client = supabase;
   let alive = true;
   const loadMessages = async () => {
     const { data, error } = await client.from('messages').select('*, profiles(name)').eq('meal_id', selected).order('created_at').limit(200);
     if (!alive) return;
     if (error) { setError(error.message); return; }
     setMessages((data || []).map(m => ({ id: m.id, mealId: m.meal_id, userId: m.user_id, body: m.body, name: m.profiles?.name || '밥메이트', createdAt: m.created_at })));
   };
   void loadMessages();
   const channel = client.channel(`meal-${selected}`).on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `meal_id=eq.${selected}` }, () => void loadMessages()).subscribe();
   const poll = setInterval(() => { void loadMessages(); void reload().catch(() => {}); }, 10000);
   return () => { alive = false; clearInterval(poll); void client.removeChannel(channel); };
 },[selected, joined, reload]);
 useEffect(() => {
   if (!dialog && !selected) return;
   const previous = document.activeElement as HTMLElement;
   const onKey = (event: KeyboardEvent) => {
     if (event.key === 'Escape') { setDialog(null); setSelected(null); setChat(false); }
     if (event.key === 'Tab') {
       const elements = Array.from(document.querySelectorAll<HTMLElement>('[role="dialog"] button:not(:disabled), [role="dialog"] input, [role="dialog"] select, [role="dialog"] textarea, [role="dialog"] a[href]'));
       const first = elements[0], last = elements[elements.length - 1];
       if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
       else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
     }
   };
   document.body.style.overflow = 'hidden';
   const focus = setTimeout(() => document.querySelector<HTMLElement>('[role="dialog"] button')?.focus(), 20);
   document.addEventListener('keydown',onKey);
   return () => { clearTimeout(focus); document.body.style.overflow = ''; document.removeEventListener('keydown',onKey); previous?.focus(); };
 },[dialog,selected]);
 async function run(action: () => Promise<void>) { setBusy(true); setError(''); try { await action(); } catch(e) { setError(e instanceof Error ? e.message : '문제가 생겼어요. 잠시 후 다시 시도해 주세요.'); } finally { setBusy(false); } }
 async function rpc(name: string, args: Record<string, unknown>) { if (!supabase) return; const { error } = await supabase.rpc(name,args); if (error) throw error; await reload(); }
 function requireAuth() { if (!demo && !signedIn) { setSelected(null); setDialog('auth'); return false; } return true; }
 async function joinMeal(meal: Meal) {
   if (!requireAuth()) return;
   await run(async () => {
     if (demo) { if (meal.cancelled || meal.participants.length >= meal.capacity) throw new Error('아쉽지만 자리가 모두 찼어요.'); if (meal.participants.some(p => p.id === profile.id)) return; setMeals(current => current.map(m => m.id === meal.id ? { ...m, participants: [...m.participants,profile] } : m)); }
     else await rpc('join_meal', { p_meal_id: meal.id });
     notify('밥 약속이 생겼어요! 채팅에서 인사해 보세요.');
   });
 }
 async function mealAction(action: 'leave'|'cancel'|'confirm'|'checkin', meal: Meal) {
   await run(async () => {
     if (demo) setMeals(current => current.map(m => m.id !== meal.id ? m : action === 'leave' ? { ...m, participants: m.participants.filter(p => p.id !== profile.id), confirmed: m.confirmed.filter(id => id !== profile.id), checkedIn: m.checkedIn.filter(id => id !== profile.id) } : action === 'cancel' ? { ...m, cancelled: true } : action === 'confirm' ? { ...m, confirmed: [...new Set([...m.confirmed,profile.id])] } : { ...m, checkedIn: [...new Set([...m.checkedIn,profile.id])] }));
     else await rpc(`${action}_meal`, { p_meal_id: meal.id });
     if (action === 'leave') setChat(false);
     notify({ leave: '참여를 취소했어요. 다음에 함께해요!', cancel: '밥 약속을 취소했어요.', confirm: '참석을 확인했어요. 조금 뒤에 만나요!', checkin: '도착했어요! 맛있는 시간 보내세요.' }[action]);
   });
 }
 async function createMeal(event: React.FormEvent<HTMLFormElement>) {
   event.preventDefault(); const values = new FormData(event.currentTarget);
   const startsAt = `${values.get('date')}T${values.get('time')}:00+09:00`;
   await run(async () => {
     if (new Date(startsAt).getTime() <= Date.now()) throw new Error('앞으로 만날 시간을 골라 주세요.');
     const details = { title: String(values.get('title')).trim(), location: String(values.get('location')), meetingPoint: String(values.get('meetingPoint')).trim(), startsAt, capacity: Number(values.get('capacity')), description: String(values.get('description')).trim(), price: String(values.get('price')).trim() || '각자 계산', tag: '가볍게 한 끼' };
     if (demo) {
       if (editing) setMeals(current => current.map(m => m.id === editing ? { ...m, ...details } : m));
       else setMeals(current => [{ ...details, id: crypto.randomUUID(), image: foodImages[0], hostId: profile.id, participants: [profile], cancelled: false, confirmed: [], checkedIn: [] }, ...current]);
     } else await rpc(editing ? 'edit_meal' : 'create_meal', { ...(editing ? { p_meal_id: editing } : {}), p_details: details });
     setDialog(null); setEditing(null); setView('mine'); notify('밥 약속을 저장했어요.');
   });
 }
 async function sendMessage(event: React.FormEvent<HTMLFormElement>) {
   event.preventDefault(); const form = event.currentTarget; const body = String(new FormData(form).get('message')).trim();
   if (!body || !active || !joined) return;
   await run(async () => {
     if (demo) setMessages(current => [...current,{ id: crypto.randomUUID(), mealId: active.id, userId: profile.id, name: profile.name, body, createdAt: new Date().toISOString() }]);
     else { const { error } = await supabase!.from('messages').insert({ meal_id: active.id, user_id: profile.id, body }); if (error) throw error; }
     form.reset();
   });
 }
 async function safetyAction(type: 'report'|'block', person: Profile) {
   await run(async () => {
     if (type === 'report') {
       const reason = window.prompt('신고 사유를 알려 주세요. (최소 5자)'); if (!reason) return;
       if (reason.trim().length < 5) throw new Error('신고 사유를 5자 이상 적어 주세요.');
       if (demo) { const reports = JSON.parse(localStorage.getItem('babmate-demo-reports') || '[]'); localStorage.setItem('babmate-demo-reports',JSON.stringify([...reports,{ reported_id: person.id, reason, meal_id: active?.id }])); notify('데모 신고를 이 기기에 저장했어요. 운영자에게 전송되지는 않아요.'); }
       else { const { error } = await supabase!.from('reports').insert({ reporter_id: profile.id, reported_id: person.id, meal_id: active?.id, reason }); if(error) throw error; notify('신고를 접수했어요.'); }
     } else {
       if (supabase) { const { error } = await supabase.from('blocks').insert({ blocker_id: profile.id, blocked_id: person.id }); if(error) throw error; }
       setBlocked(current => [...current,person.id]); setSelected(null); notify('차단했어요. 이 학생이 있는 약속을 숨겼어요.');
     }
   });
 }
 const visibleMeals = useMemo(() => meals.filter(m => !m.cancelled && !m.participants.some(p => blocked.includes(p.id)) && (location === locations[0] || m.location === location) && (size === 'all' || (size === '2' ? m.capacity === 2 : m.capacity >= 3)) && (filter !== '점심' || Number(mealTime(m.startsAt).slice(0,2)) < 15) && (filter !== '저녁' || Number(mealTime(m.startsAt).slice(0,2)) >= 15) && (filter !== '딱 둘이' || m.capacity === 2) && (filter !== '여럿이 함께' || m.capacity >= 3) && `${m.title} ${m.location}`.includes(query)), [meals,blocked,location,size,filter,query]);
 const myMeals = meals.filter(m => m.participants.some(p => p.id === profile.id) && (mineTab === 'upcoming' ? !m.cancelled && new Date(m.startsAt).getTime() >= now - 3600000 : m.cancelled || new Date(m.startsAt).getTime() < now - 3600000));
 const close = () => { setDialog(null); setSelected(null); setChat(false); setEditing(null); setError(''); };
 const openCreate = () => { if (requireAuth()) { setEditing(null); setSelected(null); setDialog('create'); } };
 const today = new Intl.DateTimeFormat('sv-SE', { timeZone:'Asia/Seoul' }).format(new Date());

 function MealCard({ meal }: { meal: Meal }) { return <button className="meal-card" onClick={() => { setSelected(meal.id); setChat(false); }}>
   <div className="card-photo"><img src={meal.image} alt={`${meal.location}에서 함께하는 식사`} loading="lazy"/><span className="photo-label"><span className="live-dot"/> {meal.cancelled ? '취소된 약속' : `${mealTime(meal.startsAt)} · ${new Date(meal.startsAt).toLocaleDateString('ko-KR',{timeZone:'Asia/Seoul',month:'numeric',day:'numeric'})}`}</span><span className="photo-arrow"><ArrowRight size={18}/></span></div>
   <div className="card-body"><span className="card-tag">{meal.tag}</span><h3>{meal.title}</h3><p className="card-location"><MapPin size={14}/>{meal.location}<span>·</span>{meal.price}</p><div className="card-bottom"><div className="avatar-stack">{meal.participants.slice(0,3).map((p,i) => <Avatar key={p.id} person={p} index={i} small/>)}</div><span><strong>{meal.participants.length}</strong>/{meal.capacity}명 <span className="spots">{meal.participants.length >= meal.capacity ? '모집 완료' : `${meal.capacity - meal.participants.length}자리 남음`}</span></span></div></div>
 </button>; }

 return <>
 <header className="site-header"><div className="header-inner"><a href="#" aria-label="밥메이트 홈" onClick={e => { e.preventDefault(); setView('discover'); }}><Logo/></a><nav aria-label="주 메뉴"><button className={view === 'discover' ? 'nav-active' : ''} onClick={() => setView('discover')}>밥친구 찾기</button><button className={view === 'mine' ? 'nav-active' : ''} onClick={() => setView('mine')}>내 밥 약속</button><button className={view === 'about' ? 'nav-active' : ''} onClick={() => setView('about')}>밥메이트 이야기</button></nav><div className="header-actions"><span className="campus-label"><span/> 서울대학교</span><button className="profile-button" aria-label="내 프로필" onClick={() => setView('profile')}><Avatar person={profile} small/></button><Button size="sm" onClick={openCreate}><Plus size={16}/>밥 약속 만들기</Button></div></div></header>
 <main>
 {demo && <div className="demo-notice"><Sprout size={13}/> 지금은 체험 모드예요. 약속과 대화는 이 기기에만 저장돼요.<button onClick={() => setDialog('auth')}>학생 인증 안내 <ArrowRight size={12}/></button></div>}
 {view === 'discover' && <>
 <section className="hero content"><div className="hero-copy"><div className="eyebrow"><span/> 혼자보다 맛있는 캠퍼스 라이프</div><h1>오늘,<br/>같이 <span className="hero-word">먹을래요?<svg viewBox="0 0 240 12" aria-hidden="true"><path d="M3 9 Q110 -4 235 6"/></svg></span></h1><p>밥 먹을 사람 찾는 일, 어렵지 않게.<br/>서울대 안에서 가볍게 만나, 든든하게 함께해요.</p><div className="hero-buttons"><Button onClick={() => document.getElementById('discover')?.scrollIntoView({ behavior: 'smooth' })}>내 밥메이트 찾기 <ArrowRight size={18}/></Button><button className="text-button" onClick={() => setView('about')}>어떻게 만나나요? <ArrowDown size={14}/></button></div><div className="hero-proof"><div className="avatar-stack">{seedMeals()[0].participants.concat(seedMeals()[1].participants).map((p,i) => <Avatar key={p.id} person={p} index={i} small/>)}</div><span><ShieldCheck size={14}/><strong>SNU 학생 인증</strong>으로 더 편안하게</span></div></div>
 <div className="hero-visual"><img className="hero-image" src="/images/hero.jpg" alt="여럿이 둘러앉아 나누는 따뜻한 식탁" fetchPriority="high"/><span className="photo-caption">GOOD FOOD. BETTER COMPANY.</span><div className="hero-note"><span className="note-icon">🍚</span><div><strong>한 끼에서 시작되는 사이</strong><span>전공은 달라도, 밥심은 같으니까.</span></div><span className="note-heart"><Heart size={20}/></span></div><div className="round-stamp">LET’S EAT<br/><Utensils size={25}/><br/>TOGETHER!</div></div></section>
 <div className="values-strip content"><span><ShieldCheck/>서울대 학생끼리</span><span><Coffee/>부담 없이, 밥 한 끼</span><span><Users/>둘이서도, 여럿이서도</span><span><Heart/>소개팅 말고, 밥친구</span></div>
 <section className="discover content" id="discover"><div className="section-heading"><div><span className="eyebrow small-eyebrow">A SEAT FOR YOU</span><h2>어떤 한 끼가 당기세요?<span className="small-spark">✳</span></h2><p>시간과 장소가 맞으면, 새로운 밥친구를 만나요.</p></div><button className="text-button desktop-only" onClick={openCreate}>내가 먼저 초대하기 <Plus size={16}/></button></div>
 <div className="filter-bar"><div className="filter-tabs">{['전체','점심','저녁','딱 둘이','여럿이 함께'].map((tab,i) => <button key={tab} className={filter === tab ? 'selected' : ''} onClick={() => setFilter(tab)}>{[<Utensils key="a" size={15}/>,<span key="b">☀</span>,<span key="c">☾</span>,<Users key="d" size={15}/>,<Users key="e" size={15}/>][i]}{tab}</button>)}</div><div className="filter-controls"><label className="location-select"><MapPin size={15}/><select aria-label="장소 필터" value={location} onChange={e => setLocation(e.target.value)}>{locations.map(l => <option key={l}>{l}</option>)}</select><ChevronDown size={13}/></label><button className={`filter-button ${size !== 'all' ? 'filter-applied' : ''}`} onClick={() => setDialog('filters')}><SlidersHorizontal size={16}/><span>필터</span></button></div></div>
 <div className="results-line"><span><span className="live-dot"/> {demo ? '이렇게 만날 수 있어요' : '함께할 밥친구를 찾고 있어요'} <strong>{visibleMeals.length}</strong></span><span>각자의 식비는 각자, 이야기는 함께.</span></div>
 {loading ? <div className="meal-grid">{[1,2,3,4].map(i => <div className="skeleton" key={i}/>)}</div> : error && !meals.length ? <div className="empty-state"><p>{error}</p><Button onClick={() => void run(reload)}>다시 불러오기</Button></div> : visibleMeals.length ? <div className="meal-grid">{visibleMeals.map(meal => <MealCard key={meal.id} meal={meal}/>)}</div> : <div className="empty-state"><Search size={32}/><h3>아직 딱 맞는 약속이 없어요</h3><p>필터를 바꾸거나, 먼저 한 끼를 제안해 볼까요?</p><Button onClick={openCreate}>밥 약속 만들기</Button></div>}
 </section>
 <section className="promise content"><div className="promise-illustration"><span>🍊</span><span>🥢</span></div><div><span className="eyebrow small-eyebrow">A LITTLE PROMISE, A BETTER MEAL</span><h2>가벼운 만남에도, 약속은 소중하니까.</h2><p>식사 30분 전 참석 확인. 못 오게 됐다면 미리 알려주기.<br className="desktop-only"/>작은 배려가 기분 좋은 한 끼를 만들어요.</p></div><button className="text-button" onClick={() => setView('about')}>우리의 약속 <ArrowUpRightIcon/></button></section>
 </>}
 {view === 'mine' && <section className="content inner-page"><span className="eyebrow">YOUR NEXT GOOD MEAL</span><h1>내 밥 약속<span className="coral">.</span></h1><p className="muted">다음 한 끼가 조금 더 기다려지는 이유.</p><div className="page-tabs"><button className={mineTab === 'upcoming' ? 'active' : ''} onClick={() => setMineTab('upcoming')}>다가오는 약속</button><button className={mineTab === 'past' ? 'active' : ''} onClick={() => setMineTab('past')}>지난 약속 · 취소</button></div>{myMeals.length ? <div className="meal-grid">{myMeals.map(meal => <MealCard key={meal.id} meal={meal}/>)}</div> : <div className="empty-state"><CalendarDays size={36}/><h3>{mineTab === 'upcoming' ? '아직 밥 약속이 없어요' : '지난 약속이 없어요'}</h3><p>혼자 먹기 싫은 날, 여기서 시작해요.</p><Button onClick={() => setView('discover')}>밥친구 찾으러 가기 <ArrowRight size={16}/></Button></div>}</section>}
 {view === 'about' && <section className="content inner-page about-page"><span className="eyebrow">MEET OVER A MEAL</span><h1>대단한 계기 없이,<br/>밥 한 끼면 충분해요<span className="coral">.</span></h1><p className="about-intro">혼자 먹는 게 편한 날도 있지만, 누군가와 함께하고 싶은 날도 있으니까.<br/>밥메이트는 서울대 학생들이 부담 없이 식탁을 나누는 공간이에요.</p><div className="steps">{[{icon:<ShieldCheck/>,title:'같은 캠퍼스, 안심하고',text:'snu.ac.kr 이메일로 인증한 학생끼리 만나요. 소개팅도, 스펙을 비교하는 자리도 아니에요.'},{icon:<Utensils/>,title:'시간과 장소만 고르면',text:'원하는 밥 약속에 참여하거나 직접 만들어요. 채팅으로 만나기 전 가볍게 인사해요.'},{icon:<CheckCheck/>,title:'작은 약속을 지켜요',text:'식사 30분 전부터 참석을 확인해요. 못 가게 됐다면 참여 취소로 자리를 비워 주세요. 도착하면 체크인!'}].map((step,i) => <article key={step.title}><span className="step-icon">{step.icon}</span><small>0{i+1}</small><h3>{step.title}</h3><p>{step.text}</p></article>)}</div><div className="community-note"><Sprout/><div><h3>편안한 한 끼를 위한 우리들의 약속</h3><p>서로의 경계를 존중해요. 연락처나 개인 정보를 강요하지 않아요. 불편한 행동은 참가자 목록에서 신고·차단할 수 있어요. 참석 확인과 체크인은 본인 확인 방식이며 실제 현장 도착을 보증하지 않아요.</p></div></div><Button onClick={() => setView('discover')}>오늘의 밥친구 만나기 <ArrowRight size={16}/></Button></section>}
 {view === 'profile' && <section className="content inner-page profile-page"><span className="eyebrow">NICE TO MEET YOU</span><h1>나의 밥메이트 프로필<span className="coral">.</span></h1><div className="profile-panel"><Avatar person={profile}/><div><h2>{profile.name}</h2><span className="verified"><ShieldCheck size={15}/>{demo ? '체험 프로필 · 미인증' : signedIn ? '서울대학교 인증 완료' : '학생 인증이 필요해요'}</span></div></div><form className="form-stack" onSubmit={e => { e.preventDefault(); if (!requireAuth()) return; const data = new FormData(e.currentTarget); const update = {...profile,name:String(data.get('name')).trim(),major:String(data.get('major')).trim(),year:String(data.get('year')).trim(),interests:String(data.get('interests')).split(',').map(s => s.trim()).filter(Boolean)}; void run(async () => { if(supabase) { const {error} = await supabase.from('profiles').update({name:update.name,major:update.major,year:update.year,interests:update.interests}).eq('id',profile.id); if(error) throw error; } setProfile(update); setMeals(current => current.map(m => ({...m,participants:m.participants.map(p => p.id === profile.id ? update : p)}))); notify('프로필을 저장했어요.'); }); }}><label>이름<input name="name" defaultValue={profile.name} required maxLength={30}/></label><div className="form-row"><label>전공<input name="major" defaultValue={profile.major} required maxLength={60}/></label><label>학번<input name="year" defaultValue={profile.year} required maxLength={20}/></label></div><label>관심사 <span className="muted">쉼표로 구분해 주세요</span><input name="interests" defaultValue={profile.interests.join(', ')} maxLength={200}/></label><Button disabled={busy}>프로필 저장하기</Button></form><div className="profile-extras">{!signedIn && <Button variant="outline" onClick={() => setDialog('auth')}><ShieldCheck size={16}/>SNU 이메일로 인증하기</Button>}{signedIn && <Button variant="ghost" onClick={() => void supabase?.auth.signOut()}><LogOut size={16}/>로그아웃</Button>}{blocked.length > 0 && <><h3>차단한 학생 {blocked.length}명</h3><Button variant="outline" onClick={() => void run(async () => { if(supabase) { const {error} = await supabase.from('blocks').delete().eq('blocker_id',profile.id); if(error) throw error; } setBlocked([]); notify('모든 차단을 해제했어요.'); })}>모든 차단 해제</Button></>}</div></section>}
 </main>
 <footer className="content footer"><Logo/><p>한 끼의 우연, 캠퍼스의 인연.</p><span>Made for SNU, with 밥심.<br/><small>서울대학교 공식 서비스가 아닙니다.</small></span></footer>
 <nav className="mobile-nav" aria-label="모바일 메뉴"><button className={view==='discover'?'active':''} onClick={() => setView('discover')}><Search size={21}/>밥친구 찾기</button><button className={view==='mine'?'active':''} onClick={() => setView('mine')}><CalendarDays size={21}/>내 밥 약속</button><button onClick={openCreate}><Plus size={23}/>약속 만들기</button><button className={view==='profile'?'active':''} onClick={() => setView('profile')}><Users size={21}/>내 프로필</button></nav>
 {(dialog || active) && <div className="modal-backdrop" onMouseDown={e => { if(e.target === e.currentTarget) close(); }}><section className={`modal ${active && !dialog ? 'meal-modal' : ''}`} role="dialog" aria-modal="true" aria-labelledby="dialog-title"><button className="close-button" onClick={close} aria-label="닫기"><X size={21}/></button>
 {dialog === 'auth' && <><span className="modal-symbol"><ShieldCheck size={30}/></span><h2 id="dialog-title">같은 캠퍼스니까, 더 편안하게.</h2><p className="muted">서울대학교 이메일로 인증하고 밥친구를 만나세요.</p>{demo ? <div className="info-box">현재는 체험 모드예요. Supabase 연결 후 이메일 인증을 이용할 수 있어요. 체험 프로필은 실제 학생 인증을 의미하지 않아요.</div> : <form className="form-stack" onSubmit={e => { e.preventDefault(); const email = String(new FormData(e.currentTarget).get('email')).trim(); void run(async () => { if(!isSnuEmail(email)) throw new Error('snu.ac.kr 이메일을 입력해 주세요.'); const {error} = await supabase!.auth.signInWithOtp({email,options:{emailRedirectTo:window.location.origin}}); if(error) throw error; notify('인증 링크를 보냈어요. 학교 이메일을 확인해 주세요.'); }); }}><label>서울대학교 이메일<input type="email" name="email" placeholder="yourname@snu.ac.kr" required/></label><Button disabled={busy}>인증 링크 받기 <ArrowRight size={16}/></Button></form>}<p className="fine-print">이메일은 공개되지 않아요. 학생 인증에만 사용해요.</p></>}
 {dialog === 'filters' && <><h2 id="dialog-title">나에게 맞는 한 끼</h2><div className="form-stack"><label>검색<input value={query} onChange={e => setQuery(e.target.value)} placeholder="약속 이름 또는 장소"/></label><label>함께 먹을 인원<select value={size} onChange={e => setSize(e.target.value)}><option value="all">인원 상관없어요</option><option value="2">딱 둘이</option><option value="3">3명 이상 함께</option></select></label><Button onClick={() => setDialog(null)}>약속 보기</Button><Button variant="ghost" onClick={() => { setQuery(''); setSize('all'); setLocation(locations[0]); setFilter('전체'); }}>필터 초기화</Button></div></>}
 {dialog === 'create' && (() => { const meal = meals.find(m => m.id === editing); return <><span className="eyebrow">PULL UP A CHAIR</span><h2 id="dialog-title">{editing ? '밥 약속 수정하기' : '밥 한 끼, 같이해요.'}</h2><p className="muted">시간과 장소만 정하면, 밥친구를 만날 준비 끝.</p><form className="form-stack" onSubmit={createMeal}><label>어떤 한 끼인가요?<input name="title" defaultValue={meal?.title} placeholder="수업 끝나고 같이 점심 먹어요 🍚" required maxLength={80}/></label><div className="form-row"><label>날짜<input type="date" name="date" defaultValue={meal?.startsAt.slice(0,10) || today} min={today} required/></label><label>시간 <span className="muted">한국 시간</span><input type="time" name="time" defaultValue={meal ? mealTime(meal.startsAt) : '12:00'} required/></label></div><div className="form-row"><label>장소<select name="location" defaultValue={meal?.location || locations[1]}>{locations.slice(1).map(l => <option key={l}>{l}</option>)}</select></label><label>총인원 (나 포함)<select name="capacity" defaultValue={meal?.capacity || 4}>{[2,3,4,5,6].filter(n => !meal || n >= meal.participants.length).map(n => <option key={n} value={n}>{n}명</option>)}</select></label></div><label>만나는 곳<input name="meetingPoint" defaultValue={meal?.meetingPoint} placeholder="식당 입구 메뉴판 앞에서 만나요" required maxLength={150}/></label><label>예상 식비<input name="price" defaultValue={meal?.price} placeholder="예: ₩6,000–8,000 · 각자 계산" maxLength={40}/></label><label>밥친구에게 한마디<textarea name="description" defaultValue={meal?.description} placeholder="조용히 먹어도, 수다 떨어도 좋아요." maxLength={1000} rows={3}/></label><div className="info-box"><Heart size={16}/>못 가게 된다면 미리 취소해 주세요. 누군가는 당신과의 점심을 기다리고 있어요.</div><Button type="submit" disabled={busy}>{busy ? <LoaderCircle className="spin" size={17}/> : <Plus size={17}/>}{editing ? '변경사항 저장' : '밥 약속 만들기'}</Button></form></>; })()}
 {active && !dialog && <>{!chat ? <><div className="detail-photo"><img src={active.image} alt="함께 나누는 한 끼"/></div><div className="detail-body"><span className="card-tag">{active.tag}</span><h2 id="dialog-title">{active.title}</h2><div className="detail-meta"><span><CalendarDays size={17}/>{new Date(active.startsAt).toLocaleDateString('ko-KR',{timeZone:'Asia/Seoul',month:'long',day:'numeric',weekday:'short'})} · {mealTime(active.startsAt)}</span><span><MapPin size={17}/>{active.location}</span><span><Utensils size={17}/>{active.price} · 각자 계산</span></div><p className="meal-description">{active.description}</p><div className="meeting-point"><MapPin size={19}/><div><strong>여기서 만나요</strong><p>{active.meetingPoint}</p></div></div><h3 className="participant-title">함께 먹는 밥친구 <span>{active.participants.length}/{active.capacity}</span></h3><div className="participants">{active.participants.map((person,i) => <div className="participant" key={person.id}><Avatar person={person} index={i}/><div><strong>{person.name} {person.id === active.hostId && <small>호스트</small>}</strong><span>{person.major} · {person.year}</span></div>{active.checkedIn.includes(person.id) ? <span className="attendance">도착</span> : active.confirmed.includes(person.id) ? <span className="attendance">참석 확인</span> : null}{person.id !== profile.id && joined && <div className="safety-buttons"><button title="신고" aria-label={`${person.name} 신고`} onClick={() => void safetyAction('report',person)}><Flag size={14}/></button><button title="차단" aria-label={`${person.name} 차단`} onClick={() => void safetyAction('block',person)}><Ban size={14}/></button></div>}</div>)}</div><div className="info-box"><Bell size={17}/><span>식사 30분 전부터 참석 확인, 15분 전부터 도착 체크인을 할 수 있어요.</span></div>{active.cancelled ? <div className="cancelled-banner">취소된 밥 약속이에요.</div> : joined ? <div className="joined-actions"><Button disabled={busy} onClick={() => setChat(true)}><MessageCircle size={18}/>밥친구와 대화하기</Button><div className="form-row"><Button variant="outline" disabled={busy || !canConfirm(active.startsAt,now) || active.confirmed.includes(profile.id)} onClick={() => void mealAction('confirm',active)}><Check size={16}/>{active.confirmed.includes(profile.id) ? '참석 확인 완료' : '참석 확인'}</Button><Button variant="outline" disabled={busy || !canCheckIn(active.startsAt,now) || active.checkedIn.includes(profile.id)} onClick={() => void mealAction('checkin',active)}><MapPin size={16}/>{active.checkedIn.includes(profile.id) ? '도착 완료' : '도착했어요'}</Button></div>{profile.id === active.hostId ? <div className="host-actions"><button onClick={() => { setEditing(active.id); setSelected(null); setDialog('create'); }}>약속 수정</button><button onClick={() => { if(window.confirm('이 밥 약속을 취소할까요?')) void mealAction('cancel',active); }}>약속 취소</button></div> : <button className="leave-button" disabled={busy} onClick={() => { if(window.confirm('참여를 취소할까요? 다른 밥친구에게 자리를 내어줘요.')) void mealAction('leave',active); }}>참여 취소하기</button>}</div> : <Button className="full-width" disabled={busy || active.participants.length >= active.capacity || (!demo && new Date(active.startsAt).getTime() <= now)} onClick={() => void joinMeal(active)}>{active.participants.length >= active.capacity ? '모집이 완료됐어요' : !demo && new Date(active.startsAt).getTime() <= now ? '이미 시작된 약속이에요' : '이 한 끼, 함께할래요'}<ArrowRight size={17}/></Button>}</div></> : <div className="chat-panel"><button className="text-button" onClick={() => setChat(false)}><ArrowLeft size={16}/>약속으로 돌아가기</button><h2 id="dialog-title">밥 먹기 전, 가벼운 인사</h2><p className="muted">{active.title}</p><div className="chat-info"><ShieldCheck size={15}/>이 약속에 참여한 밥친구만 볼 수 있어요.</div><div className="chat-messages" aria-live="polite">{messages.filter(m => m.mealId === active.id && !blocked.includes(m.userId)).length === 0 ? <div className="chat-empty"><MessageCircle size={32}/><p>“안녕하세요! 조금 뒤에 만나요 👋”<br/>먼저 반갑게 인사해 보세요.</p></div> : messages.filter(m => m.mealId === active.id && !blocked.includes(m.userId)).map(m => <div key={m.id} className={`chat-message ${m.userId === profile.id ? 'own' : ''}`}><small>{m.name} · {mealTime(m.createdAt)}</small><p>{m.body}</p></div>)}</div>{joined && !active.cancelled ? <form className="chat-input" onSubmit={sendMessage}><input aria-label="메시지" name="message" placeholder="밥친구에게 인사해 보세요" autoComplete="off" required maxLength={2000}/><Button disabled={busy} aria-label="메시지 보내기"><Send size={18}/></Button></form> : <p className="info-box">현재 참여 중인 약속에서만 대화할 수 있어요.</p>}</div>}</>}
 {error && <div className="error-message" role="alert">{error}</div>}
 </section></div>}
 {error && !dialog && !active && meals.length > 0 && <div className="global-error" role="alert">{error}<button onClick={() => setError('')} aria-label="오류 닫기"><X size={15}/></button></div>}
 {toast && <div className="toast" role="status"><Check size={18}/>{toast}</div>}
 </>;
}
function ArrowUpRightIcon() { return <ArrowRight size={17} style={{transform:'rotate(-35deg)'}}/>; }

