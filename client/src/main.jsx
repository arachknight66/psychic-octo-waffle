import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Activity, ArrowDownRight, ArrowRight, ArrowUpRight, BookOpen, BrainCircuit, Check, CheckCircle2, ChevronDown, CircleHelp, Clock3, Compass, FileText, GraduationCap, LayoutDashboard, LibraryBig, Lightbulb, LoaderCircle, LogOut, Menu, Play, RotateCcw, Sparkles, Target, X } from 'lucide-react';
import './styles.css';

const API = import.meta.env.VITE_API_URL || 'http://localhost:4000';
const STORAGE_KEY = 'learnwell-session';
const navItems = [
  { id: 'home', label: 'Overview', icon: LayoutDashboard },
  { id: 'resources', label: 'Study library', icon: LibraryBig },
  { id: 'quiz', label: 'Quick quiz', icon: CircleHelp },
  { id: 'progress', label: 'My progress', icon: Activity }
];

async function request(path, token, options = {}) {
  const response = await fetch(`${API}/api${path}`, {
    ...options,
    headers: { ...(options.body ? { 'content-type': 'application/json' } : {}), ...(token ? { authorization: `Bearer ${token}` } : {}), ...options.headers }
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.message || 'Something went wrong. Please try again.');
  return data;
}
const pct = (value = 0) => `${Math.round(value)}%`;
const initials = (name = 'Student') => name.split(' ').map((word) => word[0]).slice(0, 2).join('').toUpperCase();

function App() {
  const [session, setSession] = useState(() => { try { return JSON.parse(localStorage.getItem(STORAGE_KEY)); } catch { return null; } });
  const [publicScreen, setPublicScreen] = useState('landing');
  const [activeTab, setActiveTab] = useState('home');
  const [mobileNav, setMobileNav] = useState(false);
  const [data, setData] = useState({ progress: null, recommendations: [], resources: [], recSource: 'python' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [resourceFilter, setResourceFilter] = useState('All topics');

  const loadData = useCallback(async (token = session?.token) => {
    if (!token) return;
    setLoading(true); setError('');
    try {
      const [progress, recs, library] = await Promise.all([
        request('/progress', token), request('/recommendations', token), request('/resources', token)
      ]);
      setData({ progress, recommendations: recs.recommendations, resources: library.resources, recSource: recs.source });
    } catch (loadError) {
      if (/session|sign in/i.test(loadError.message)) signOut();
      else setError(loadError.message);
    } finally { setLoading(false); }
  }, [session?.token]);

  useEffect(() => { if (session?.token) loadData(session.token); }, [session?.token, loadData]);
  const signOut = () => { localStorage.removeItem(STORAGE_KEY); setSession(null); setPublicScreen('landing'); setData({ progress: null, recommendations: [], resources: [], recSource: 'python' }); };
  const onSignIn = (next) => { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); setSession(next); setNotice('Welcome back. Your learning space is ready.'); };
  const onQuizComplete = async () => { await loadData(); setNotice('Quiz saved. Your topic progress and next steps are up to date.'); };
  const topicNames = useMemo(() => [...new Set(data.resources.map((item) => item.topic))], [data.resources]);

  if (!session?.token) return publicScreen === 'landing'
    ? <LandingPage onStart={setPublicScreen} />
    : <LoginScreen key={publicScreen} initialMode={publicScreen} onSignIn={onSignIn} onBack={() => setPublicScreen('landing')} />;
  const user = session.user || { name: 'Student', email: '' };
  const summary = data.progress?.summary || {};
  const topicRows = data.progress?.topics || [];
  const weakTopic = [...topicRows].filter((topic) => topic.attempts > 0).sort((a, b) => a.accuracy - b.accuracy)[0];

  return <div className="app-shell">
    <aside className={`sidebar ${mobileNav ? 'sidebar-open' : ''}`}>
      <div className="brand"><div className="brand-mark"><BrainCircuit size={22} strokeWidth={2.2} /></div><span>learnwell</span></div>
      <div className="course-label">Your learning space</div>
      <nav aria-label="Main navigation">
        {navItems.map(({ id, label, icon: Icon }) => <button key={id} className={`nav-link ${activeTab === id ? 'selected' : ''}`} onClick={() => { setActiveTab(id); setMobileNav(false); }}><Icon size={18} /><span>{label}</span>{id === 'quiz' && <span className="nav-dot" />}</button>)}
      </nav>
      <div className="sidebar-bottom">
        <div className="help-card"><div className="help-icon"><Lightbulb size={17} /></div><strong>Small steps add up.</strong><p>A little practice today makes tomorrow easier.</p></div>
        <button className="profile-button" onClick={signOut} aria-label="Sign out"><div className="avatar">{initials(user.name)}</div><div className="profile-copy"><strong>{user.name}</strong><span>Student account</span></div><LogOut size={17} className="logout-icon" /></button>
      </div>
    </aside>
    {mobileNav && <button className="nav-scrim" onClick={() => setMobileNav(false)} aria-label="Close navigation" />}
    <main className="main-area">
      <header className="topbar"><button className="mobile-menu icon-button" onClick={() => setMobileNav(true)} aria-label="Open navigation"><Menu size={20} /></button><div className="breadcrumb">My learning <span>/</span> {navItems.find((item) => item.id === activeTab)?.label}</div><div className="topbar-right"><span className="today-label">{summary.topicsTracked || 0} topics in your study map</span><div className="avatar small-avatar">{initials(user.name)}</div></div></header>
      <div className="page-content">
        {error && <div className="alert error-alert" role="alert"><span>{error}</span><button onClick={() => loadData()} className="text-button">Try again</button></div>}
        {notice && <div className="alert success-alert" role="status"><CheckCircle2 size={17} /><span>{notice}</span><button onClick={() => setNotice('')} aria-label="Dismiss message"><X size={16} /></button></div>}
        {loading && !data.progress ? <div className="loading-state"><LoaderCircle className="spin" size={26} /><span>Preparing your learning space…</span></div> : <>
          {activeTab === 'home' && <Dashboard user={user} summary={summary} topics={topicRows} weakTopic={weakTopic} recommendations={data.recommendations} recSource={data.recSource} onNavigate={setActiveTab} onOpenResource={(item) => { setResourceFilter(item.topic); setActiveTab('resources'); }} />}
          {activeTab === 'resources' && <ResourcesPage resources={data.resources} selectedTopic={resourceFilter} onSelectTopic={setResourceFilter} />}
          {activeTab === 'quiz' && <QuizPage token={session.token} topicNames={topicNames} onComplete={onQuizComplete} />}
          {activeTab === 'progress' && <ProgressPage topics={topicRows} summary={summary} attempts={data.progress?.recentAttempts || []} />}
        </>}
      </div>
      <footer className="page-footer"><span>Learnwell learning demo</span><span>Built for steady progress</span></footer>
    </main>
  </div>;
}

function LandingPage({ onStart }) {
  const sampleTopics = [
    { topic: 'Database design', accuracy: 62, attempts: 2 },
    { topic: 'Linear equations', accuracy: 78, attempts: 3 },
    { topic: 'Python basics', accuracy: 48, attempts: 2 }
  ];
  return <div className="landing-page">
    <header className="landing-header">
      <a className="brand landing-brand" href="#top" aria-label="Learnwell home"><span className="brand-mark"><BrainCircuit size={21} /></span><span>learnwell</span></a>
      <nav className="landing-nav" aria-label="Landing page navigation"><a href="#how-it-works">How it works</a><a href="#built-for-learning">Built for learning</a></nav>
      <div className="landing-actions"><button className="landing-signin" onClick={() => onStart('login')}>Sign in</button><button className="primary-button landing-create" onClick={() => onStart('register')}>Create account <ArrowRight size={15}/></button></div>
    </header>
    <main id="top">
      <section className="landing-hero">
        <div className="landing-copy"><div className="landing-kicker"><span /> A more personal way to study</div><h1>Your next step should fit <em>you.</em></h1><p>Learnwell helps you see what’s clicking, find a useful resource, and keep moving at your own pace.</p><div className="landing-ctas"><button className="primary-button" onClick={() => onStart('login')}>Explore the demo <ArrowRight size={16}/></button><button className="landing-secondary" onClick={() => onStart('register')}>Create a free account</button></div><div className="landing-proof"><span><Check size={14}/> Short topic quizzes</span><span><Check size={14}/> Clear next steps</span><span><Check size={14}/> Progress you can see</span></div></div>
        <div className="landing-map-wrap"><div className="sample-caption"><span>Sample learner map</span><span>3 topics</span></div><LearningMap topics={sampleTopics}/><div className="map-footnote"><span className="map-footnote-dot"/>Practice changes the route as you go</div></div>
      </section>
      <section className="landing-features" id="built-for-learning"><div className="landing-section-intro"><span>Made for the way learning happens</span><h2>One study session at a time.</h2></div><div className="feature-row"><article className="feature-item"><span className="feature-icon feature-blue"><Target size={18}/></span><h3>Find your focus</h3><p>Quick quizzes help highlight the topics you may want to revisit.</p></article><article className="feature-item"><span className="feature-icon feature-yellow"><BookOpen size={18}/></span><h3>Get a useful next step</h3><p>See study materials matched to your current topic progress.</p></article><article className="feature-item"><span className="feature-icon feature-green"><Activity size={18}/></span><h3>Notice your progress</h3><p>Keep track of recent attempts and how your confidence is building.</p></article></div></section>
      <section className="landing-steps" id="how-it-works"><div className="steps-heading"><span>A simple learning loop</span><h2>Check in. Find a path. Keep going.</h2></div><div className="steps-row"><article><span className="step-number">01</span><div><h3>Try a quick quiz</h3><p>Answer a few questions on a topic you’re learning.</p></div></article><article><span className="step-number">02</span><div><h3>See what to work on</h3><p>Your recent results shape a resource and a question level.</p></div></article><article><span className="step-number">03</span><div><h3>Come back with context</h3><p>Your progress updates as you practice and explore.</p></div></article></div></section>
      <section className="landing-endcap"><div><span>Start with one small step</span><h2>Make your next study session your own.</h2></div><button className="light-button" onClick={() => onStart('login')}>Open the demo <ArrowRight size={16}/></button><div className="endcap-mark" aria-hidden="true">✳</div></section>
    </main>
    <footer className="landing-footer"><a className="brand landing-brand" href="#top"><span className="brand-mark"><BrainCircuit size={18}/></span><span>learnwell</span></a><span>Personalized learning, one topic at a time.</span><button onClick={() => onStart('login')}>Sign in</button></footer>
  </div>;
}

function LoginScreen({ onSignIn, initialMode = 'login', onBack }) {
  const [mode, setMode] = useState(initialMode);
  const [form, setForm] = useState(() => initialMode === 'register' ? { name: '', email: '', password: '' } : { name: '', email: 'student@learnwell.demo', password: 'learnwell123' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [apiDown, setApiDown] = useState(false);
  const submit = async (event) => {
    event.preventDefault(); setBusy(true); setError(''); setApiDown(false);
    try {
      const result = await request(`/auth/${mode}`, null, { method: 'POST', body: JSON.stringify(form) });
      onSignIn(result);
    } catch (issue) { setError(issue.message); if (issue instanceof TypeError) setApiDown(true); }
    finally { setBusy(false); }
  };
  return <div className="login-layout">
    <section className="login-story"><div className="brand brand-light"><div className="brand-mark"><BrainCircuit size={22} /></div><span>learnwell</span></div><div className="story-copy"><div className="story-pill"><Sparkles size={14} /> Learning, at your pace</div><h1>Find your next<br />bright idea.</h1><p>Your learning space notices what’s clicking and helps you focus on what comes next.</p><div className="story-illustration"><div className="orbit orbit-one" /><div className="orbit orbit-two" /><div className="illustration-core"><BookOpen size={38} /></div><div className="float-note note-one"><Target size={15} /> Your pace</div><div className="float-note note-two"><Check size={16} /> One step at a time</div></div><div className="story-foot"><span>Curiosity looks good on you.</span><span>01 / 03</span></div></div></section>
    <section className="login-panel"><div className="login-form-wrap"><button className="auth-back" onClick={onBack}><ArrowRight size={14}/> Back to Learnwell</button><div className="form-heading"><div className="form-kicker">Welcome to your study space</div><h2>{mode === 'login' ? 'Good to see you.' : 'Let’s get started.'}</h2><p>{mode === 'login' ? 'Sign in to pick up where you left off.' : 'Create an account and start learning your way.'}</p></div>
      <form onSubmit={submit} className="login-form">{mode === 'register' && <label>Your name<input required minLength="2" maxLength="80" autoComplete="name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Alex Morgan" /></label>}<label>Email address<input required type="email" autoComplete="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="you@example.com" /></label><label>Password<input required minLength="8" type="password" autoComplete={mode === 'login' ? 'current-password' : 'new-password'} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="At least 8 characters" /></label>
        {error && <div className="form-error" role="alert">{error}{apiDown && <span> Start MongoDB and the API using the setup steps in README.md.</span>}</div>}
        <button className="primary-button login-submit" disabled={busy}>{busy ? <><LoaderCircle className="spin" size={17} /> Signing in…</> : mode === 'login' ? <>Sign in <ArrowRight size={17} /></> : <>Create account <ArrowRight size={17} /></>}</button>
      </form><div className="mode-switch">{mode === 'login' ? 'New to Learnwell?' : 'Already have an account?'} <button onClick={() => { const nextMode = mode === 'login' ? 'register' : 'login'; setMode(nextMode); setError(''); setForm(nextMode === 'register' ? { name: '', email: '', password: '' } : { name: '', email: 'student@learnwell.demo', password: 'learnwell123' }); }}>{mode === 'login' ? 'Create an account' : 'Sign in'}</button></div>
      <div className="demo-login"><div className="demo-icon"><GraduationCap size={17} /></div><div><strong>Just exploring?</strong><span>Demo: student@learnwell.demo · learnwell123</span></div><button onClick={() => setForm({ ...form, email: 'student@learnwell.demo', password: 'learnwell123' })} aria-label="Fill demo login"><ArrowRight size={17} /></button></div>
      <div className="login-note"><span className="privacy-dot" /> Your learning data stays in this local demo.</div></div></section>
  </div>;
}

function PageTitle({ eyebrow, title, description, action }) { return <div className="page-title-row"><div><div className="page-eyebrow">{eyebrow}</div><h1>{title}</h1><p>{description}</p></div>{action}</div>; }
function StatCard({ icon: Icon, label, value, foot, tone = 'blue' }) { return <div className={`stat-card stat-${tone}`}><div className="stat-top"><span className="stat-icon"><Icon size={18} /></span><span className="stat-label">{label}</span></div><div className="stat-value">{value}</div><div className="stat-foot">{foot}</div></div>; }
function Dashboard({ user, summary, topics, weakTopic, recommendations, recSource, onNavigate, onOpenResource }) {
  const firstName = user.name?.split(' ')[0] || 'there';
  const orderedTopics = [...topics].sort((a, b) => (a.attempts === 0 ? 1 : 0) - (b.attempts === 0 ? 1 : 0) || a.accuracy - b.accuracy);
  return <>
    <section className="welcome-banner"><div className="welcome-copy"><div className="welcome-date"><span className="sun-dot" /> Your study map</div><h1>The next step starts here, {firstName}.</h1><p>{weakTopic ? <>A short session in <strong>{weakTopic.topic}</strong> could help you keep building momentum.</> : 'Choose a topic and we’ll help you find a good place to begin.'}</p><button className="light-button" onClick={() => onNavigate('quiz')}>Take a quick quiz <ArrowRight size={16} /></button></div><LearningMap topics={topics} /><div className="banner-mark">Learnwell <span>·</span> Study map</div></section>
    <div className="section-heading"><div><h2>Your learning at a glance</h2><p>Progress builds one session at a time.</p></div><button className="quiet-link" onClick={() => onNavigate('progress')}>See progress <ArrowRight size={15} /></button></div>
    <section className="stats-grid"><StatCard icon={Target} label="Quizzes completed" value={summary.quizzesCompleted || 0} foot="Every attempt helps you grow" tone="blue"/><StatCard icon={Activity} label="Overall accuracy" value={pct(summary.overallAccuracy)} foot="Across your recent quizzes" tone="gold"/><StatCard icon={Compass} label="Topics in your orbit" value={summary.topicsTracked || 0} foot="Learning paths to explore" tone="mint"/></section>
    <div className="dashboard-columns"><section className="panel topic-panel"><div className="panel-heading"><div><h2>Topics in focus</h2><p>A snapshot of how things are going.</p></div><button className="icon-link" onClick={() => onNavigate('progress')} aria-label="View all progress"><ArrowRight size={18}/></button></div><div className="topic-list">{orderedTopics.slice(0, 3).map((topic) => <TopicRow key={topic.topic} topic={topic} />)}</div><button className="panel-footer-link" onClick={() => onNavigate('progress')}>View your progress <ArrowRight size={15}/></button></section>
      <section className="focus-panel"><div className="focus-icon"><Lightbulb size={20}/></div><div className="focus-label">A good next step</div><h2>{weakTopic ? `Build confidence in ${weakTopic.topic}` : 'Choose a topic to begin'}</h2><p>{weakTopic ? `Your recent quiz accuracy is ${weakTopic.accuracy}%. We’ve picked a resource that meets you where you are.` : 'Try a quick quiz or browse the study library to find a topic you like.'}</p><button onClick={() => onNavigate(weakTopic ? 'resources' : 'quiz')}>{weakTopic ? 'Open study library' : 'Choose a quiz'} <ArrowRight size={16}/></button><div className="focus-decoration">✳</div></section></div>
    <div className="section-heading recommendation-heading"><div><h2>Picked for your next session</h2><p>Suggestions that match your recent progress.</p></div><button className="quiet-link" onClick={() => onNavigate('resources')}>Browse library <ArrowRight size={15}/></button></div>
    {recSource === 'local-fallback' && <div className="inline-note"><span className="privacy-dot"/>Recommendations are using the built-in rules while the Python service is offline.</div>}
    <section className="recommendation-grid">{recommendations.slice(0, 3).map((item) => <RecommendationCard key={item._id || item.id || item.title} item={item} onClick={() => onOpenResource(item)} />)}{recommendations.length === 0 && <div className="empty-card"><BookOpen size={22}/><span>No suggestions yet. Browse your study library to get started.</span></div>}</section>
  </>;
}
function LearningMap({ topics }) {
  const practicedTopics = topics.filter((topic) => topic.attempts > 0);
  const mapProgress = practicedTopics.length ? Math.round(practicedTopics.reduce((sum, topic) => sum + topic.accuracy, 0) / practicedTopics.length) : 0;
  const positions = ['map-point-start', 'map-point-middle', 'map-point-end'];
  return <div className="learning-map" aria-label="Your topic learning map">
    <div className="map-heading"><span>Your learning route</span><span className="map-legend"><i /> recent accuracy</span></div>
    <svg className="map-route" viewBox="0 0 600 220" preserveAspectRatio="none" aria-hidden="true"><path d="M44 150 C135 150 151 73 278 80 S410 160 552 142"/><path className="map-route-glow" pathLength="100" style={{ strokeDasharray: `${mapProgress} 100` }} d="M44 150 C135 150 151 73 278 80 S410 160 552 142"/></svg>
    {topics.slice(0, 3).map((topic, index) => <div className={`map-point ${positions[index] || 'map-point-end'}`} key={topic.topic}>
      <span className={`map-node ${topic.accuracy >= 85 ? 'node-strong' : topic.attempts ? 'node-active' : ''}`}><span /></span>
      <span className="map-label"><strong>{topic.topic}</strong><small>{topic.attempts ? `${Math.round(topic.accuracy)}% recent accuracy` : 'Ready to begin'}</small></span>
    </div>)}
    <div className="map-compass" aria-hidden="true">N<span>↑</span></div>
  </div>;
}

function TopicRow({ topic }) {
  const status = topic.attempts === 0 ? 'Not started' : topic.accuracy >= 85 ? 'Strong progress' : topic.accuracy < 50 ? 'Needs practice' : 'On your way';
  return <div className="topic-row"><div className="topic-monogram">{topic.topic.split(' ').map((word) => word[0]).join('').slice(0, 2)}</div><div className="topic-main"><div className="topic-name-line"><strong>{topic.topic}</strong><span>{status}</span></div><div className="progress-track"><span style={{ width: `${topic.accuracy}%` }} className={topic.accuracy < 50 ? 'low-progress' : ''}/></div></div><div className="topic-percent">{topic.attempts ? pct(topic.accuracy) : '—'}</div></div>;
}
function RecommendationCard({ item, onClick }) {
  const Icon = item.kind === 'Video' ? Play : item.kind === 'Practice' ? Target : FileText;
  return <button className={`recommendation-card accent-${item.accent || 'blue'}`} onClick={onClick}><div className="recommend-top"><div className="recommend-icon"><Icon size={17}/></div><span className="level-chip">{item.level}</span></div><div className="recommend-topic">{item.subject} <span>/</span> {item.topic}</div><h3>{item.title}</h3><p>{item.reason || item.description}</p><div className="recommend-bottom"><span><Clock3 size={14}/>{item.duration}</span><span>Explore <ArrowRight size={14}/></span></div></button>;
}
function ResourcesPage({ resources, selectedTopic, onSelectTopic }) {
  const filter = selectedTopic;
  const [kind, setKind] = useState('All types');
  const topics = ['All topics', ...new Set(resources.map((resource) => resource.topic))];
  const filtered = resources.filter((resource) => (filter === 'All topics' || resource.topic === filter) && (kind === 'All types' || resource.kind === kind));
  return <><PageTitle eyebrow="Study library" title="Find a useful next step." description="Short guides and practice picked to fit the way you’re learning."/><div className="filters-row"><div className="filter-select"><BookOpen size={16}/><select value={filter} onChange={(e) => onSelectTopic(e.target.value)} aria-label="Filter by topic">{topics.map((topic) => <option key={topic}>{topic}</option>)}</select><ChevronDown size={15}/></div><div className="type-tabs" aria-label="Filter by resource type">{['All types', 'Guide', 'Video', 'Practice'].map((value) => <button key={value} onClick={() => setKind(value)} className={kind === value ? 'active' : ''}>{value}</button>)}</div></div><div className="resource-grid">{filtered.map((item) => <ResourceCard item={item} key={item._id}/>)}</div>{filtered.length === 0 && <div className="empty-card">No resources match these filters. Try another topic or type.</div>}</>;
}
function ResourceCard({ item }) {
  const [open, setOpen] = useState(false);
  const Icon = item.kind === 'Video' ? Play : item.kind === 'Practice' ? Target : FileText;
  return <article className={`resource-card resource-${item.accent || 'blue'}`}><div className="resource-cover"><div className="resource-cover-icon"><Icon size={21}/></div><span className="level-chip">{item.level}</span><div className="cover-lines"><span/><span/><span/></div><div className="cover-mark">{item.topic.split(' ').map((word) => word[0]).join('').slice(0, 2)}</div></div><div className="resource-body"><div className="resource-meta"><span>{item.subject}</span><span>{item.kind}</span></div><h3>{item.title}</h3><p>{item.description}</p>{open && <div className="resource-content"><strong>A quick note</strong><p>{item.content}</p></div>}<div className="resource-bottom"><span><Clock3 size={14}/>{item.duration}</span><button onClick={() => setOpen(!open)}>{open ? 'Close note' : 'Open resource'} <ArrowRight size={14}/></button></div></div></article>;
}
function QuizPage({ token, topicNames, onComplete }) {
  const [topic, setTopic] = useState(topicNames[0] || '');
  const [quiz, setQuiz] = useState(null);
  const [answers, setAnswers] = useState([]);
  const [result, setResult] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [phase, setPhase] = useState('intro');
  useEffect(() => { if (!topic && topicNames[0]) setTopic(topicNames[0]); }, [topic, topicNames]);
  const begin = async () => {
    setBusy(true); setError(''); setResult(null);
    try { const data = await request(`/quizzes?topic=${encodeURIComponent(topic)}`, token); setQuiz(data.quiz); setAnswers(Array(data.quiz.questions.length).fill(null)); setPhase('quiz'); }
    catch (issue) { setError(issue.message); }
    finally { setBusy(false); }
  };
  const submit = async () => {
    if (answers.some((answer) => answer === null)) { setError('Choose an answer for each question before you finish.'); return; }
    setBusy(true); setError('');
    try { const data = await request('/quizzes/submit', token, { method: 'POST', body: JSON.stringify({ quizId: quiz.id, answers }) }); setResult(data); setPhase('result'); await onComplete(); }
    catch (issue) { setError(issue.message); }
    finally { setBusy(false); }
  };
  const reset = () => { setPhase('intro'); setQuiz(null); setResult(null); setAnswers([]); setError(''); };
  return <><PageTitle eyebrow="Quick quiz" title="A small check-in." description="A few questions help us keep your learning path in tune."/>
    {phase === 'intro' && <section className="quiz-intro"><div className="quiz-visual"><div className="quiz-orbit orbit-a"/><div className="quiz-orbit orbit-b"/><div className="quiz-center"><CircleHelp size={38}/></div><div className="quiz-star star-a">✦</div><div className="quiz-star star-b">✳</div></div><div className="quiz-intro-copy"><div className="page-eyebrow">Ready when you are</div><h2>Practice makes<br/>patterns clearer.</h2><p>Your recent results help choose a question level. It’s just a check-in, not a grade.</p><label className="select-label">Choose a topic<div className="select-wrap"><select value={topic} onChange={(e) => setTopic(e.target.value)}>{topicNames.map((name) => <option key={name}>{name}</option>)}</select><ChevronDown size={16}/></div></label>{error && <div className="form-error">{error}</div>}<button className="primary-button" onClick={begin} disabled={busy || !topic}>{busy ? <LoaderCircle className="spin" size={17}/> : <>Start quick quiz <ArrowRight size={17}/></>}</button></div></section>}
    {phase === 'quiz' && quiz && <section className="quiz-run"><div className="quiz-run-top"><div><span className="level-chip">{quiz.difficulty} level</span><h2>{quiz.title}</h2><p>{quiz.subject} <span>/</span> {quiz.topic}</p></div><button className="quiet-link" onClick={reset}><X size={15}/> Leave quiz</button></div><div className="quiz-progress-label">{answers.filter((answer) => answer !== null).length} of {quiz.questions.length} answered</div><div className="quiz-questions">{quiz.questions.map((question, index) => <fieldset className="question-card" key={question.prompt}><legend><span className="question-number">{String(index + 1).padStart(2, '0')}</span>{question.prompt}</legend><div className="answer-options">{question.options.map((option, optionIndex) => <label key={option} className={`answer-option ${answers[index] === optionIndex ? 'chosen' : ''}`}><input type="radio" name={`question-${index}`} checked={answers[index] === optionIndex} onChange={() => setAnswers(answers.map((answer, i) => i === index ? optionIndex : answer))}/><span className="option-letter">{String.fromCharCode(65 + optionIndex)}</span><span>{option}</span></label>)}</div></fieldset>)}</div>{error && <div className="form-error">{error}</div>}<div className="quiz-submit-row"><span>Your answers are only used to update your learning progress.</span><button className="primary-button" onClick={submit} disabled={busy}>{busy ? <LoaderCircle className="spin" size={17}/> : <>Finish quiz <ArrowRight size={17}/></>}</button></div></section>}
    {phase === 'result' && result && <section className="result-panel"><div className="result-icon"><CheckCircle2 size={29}/></div><div className="page-eyebrow">Quiz complete</div><h2>{result.result.accuracy >= 85 ? 'You’ve got a strong handle on this.' : result.result.accuracy < 50 ? 'Good start. Keep building the basics.' : 'Nice work. You’re making progress.'}</h2><div className="result-score">{result.result.score}<span> / {result.result.total}</span><small>{result.result.accuracy}% accuracy</small></div><p>Your next quiz in {result.result.topic} will be set to <strong>{result.result.nextDifficulty}</strong> level based on your recent results.</p><div className="explanations">{result.explanations.map((item, index) => <div key={index} className={`explanation ${item.correct ? 'was-correct' : 'was-wrong'}`}><span>{item.correct ? <Check size={16}/> : <X size={16}/>}</span><div><strong>{item.correct ? 'That’s right' : `Answer: ${item.answer}`}</strong><p>{item.explanation}</p></div></div>)}</div><button className="primary-button" onClick={reset}>Try another topic <RotateCcw size={16}/></button></section>}
  </>;
}
function ProgressPage({ topics, summary, attempts }) {
  const sorted = [...topics].sort((a, b) => a.accuracy - b.accuracy);
  return <><PageTitle eyebrow="My progress" title="Notice how far you’ve come." description="A clear view of your recent practice, topic by topic."/><section className="progress-summary"><div className="summary-big"><div className="summary-donut" style={{ '--progress': `${summary.overallAccuracy || 0}%` }}><div><strong>{pct(summary.overallAccuracy)}</strong><span>accuracy</span></div></div><div><h2>Learning takes practice.</h2><p>This view uses your latest quiz attempts to show where you’re building confidence.</p></div></div><div className="summary-metrics"><div><span>Quizzes completed</span><strong>{summary.quizzesCompleted || 0}</strong></div><div><span>Topics started</span><strong>{topics.filter((topic) => topic.attempts).length} <small>/ {summary.topicsTracked || 0}</small></strong></div></div></section><div className="progress-columns"><section className="panel topic-panel"><div className="panel-heading"><div><h2>Topic progress</h2><p>Recent accuracy by learning area.</p></div></div><div className="progress-topic-list">{sorted.map((topic) => <div className="progress-topic" key={topic.topic}><div className="progress-topic-top"><div><strong>{topic.topic}</strong><span>{topic.attempts ? `${topic.attempts} recent ${topic.attempts === 1 ? 'attempt' : 'attempts'}` : 'Ready when you are'}</span></div><strong>{topic.attempts ? pct(topic.accuracy) : '—'}</strong></div><div className="progress-track"><span style={{ width: `${topic.accuracy}%` }} className={topic.accuracy < 50 ? 'low-progress' : ''}/></div></div>)}</div></section><section className="panel history-panel"><div className="panel-heading"><div><h2>Recent check-ins</h2><p>Your latest quiz attempts.</p></div></div>{attempts.length ? <div className="attempt-list">{attempts.slice(0, 6).map((attempt) => <div className="attempt-row" key={attempt._id}><div className="attempt-icon"><Check size={16}/></div><div className="attempt-copy"><strong>{attempt.topic}</strong><span>{new Date(attempt.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} · {attempt.difficulty}</span></div><div className="attempt-score">{attempt.score}/{attempt.total}<span>{pct(attempt.accuracy)}</span></div></div>)}</div> : <div className="empty-history"><BookOpen size={21}/><p>Your quiz attempts will show here as you practice.</p></div>}</section></div></>;
}

createRoot(document.getElementById('root')).render(<React.StrictMode><App/></React.StrictMode>);
