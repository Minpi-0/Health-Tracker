import React, { useState, useMemo, useEffect } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, doc, setDoc, getDoc, collection, onSnapshot, deleteDoc, updateDoc } from 'firebase/firestore';
import { 
  Calendar, Clipboard, Heart, Dumbbell, ChevronRight, Plus, ArrowUpRight, 
  Edit3, Trash2, Sparkles, Activity, Check, Hash, ExternalLink, 
  CheckCircle2, ListChecks, X, Youtube, Trophy, Star, Target, 
  AlertCircle, Utensils, Droplets, Zap, Coffee, Sun, Moon, Cookie, Flag, Loader2,
  Settings, Pin, PinOff
} from 'lucide-react';

// --- Firebase 初始化 ---
// 在上傳 GitHub 前，建議將此處改為 import.meta.env 或手動填入您的配置
const firebaseConfig = typeof __firebase_config !== 'undefined' 
  ? JSON.parse(__firebase_config) 
  : {
    apiKey: "",
    authDomain: "",
    projectId: "",
    storageBucket: "",
    messagingSenderId: "",
    appId: ""
  };

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const appId = typeof __app_id !== 'undefined' ? __app_id : 'k-glow-tracker';

// --- 每日補強動作庫 ---
const DAILY_REINFORCEMENTS = [
  { name: '死蟲式 (Dead Bug）', desc: '針對脊椎側彎穩定核心。保持下背貼地。' },
  { name: '貓牛式 (Cat-Cow)', desc: '改善脊椎活動度，緩解背部緊繃。' },
  { name: '鳥狗式 (Bird-Dog)', desc: '強化對側平衡與深層核心穩定性。' },
  { name: '臀橋 (Glute Bridge)', desc: '啟動臀大肌，穩定骨盆與下腰椎。' },
  { name: '天鵝式 (Swan)', desc: '延展前側核心，強化上背與胸椎。' },
  { name: '側板式 (Side Plank)', desc: '強化側向核心，改善身體側對線。' },
  { name: '孩童式 (Child\'s Pose)', desc: '深度放鬆脊椎後側，平復身心。' }
];

// --- 預設常用飲食清單 ---
const DEFAULT_COMMON_FOODS = {
  breakfast: [
    { name: '無糖豆漿', pinned: true }, { name: '水煮蛋', pinned: true }, { name: '全麥土司', pinned: false },
    { name: '燕麥片', pinned: false }, { name: '雞肉沙拉', pinned: false }, { name: '希臘優格', pinned: false }
  ],
  lunch: [
    { name: '舒肥雞胸', pinned: true }, { name: '糙米飯', pinned: true }, { name: '健康餐盒', pinned: true },
    { name: '燙青菜', pinned: false }, { name: '嫩煎鮭魚', pinned: false }, { name: '地瓜', pinned: false }
  ],
  dinner: [
    { name: '清蒸魚', pinned: true }, { name: '炒青菜', pinned: true }, { name: '瘦肉沙拉', pinned: false },
    { name: '豆腐', pinned: false }, { name: '海鮮湯', pinned: false }, { name: '水煮肉片', pinned: false }
  ],
  snacks: [
    { name: '綜合堅果', pinned: true }, { name: '蘋果', pinned: false }, { name: '香蕉', pinned: false },
    { name: '蛋白棒', pinned: false }, { name: '黑咖啡', pinned: false }, { name: '藍莓', pinned: false }
  ]
};

// --- 皮拉提斯動作資料庫 ---
const EXERCISE_LIBRARY = {
  '核心床 (Reformer)': [
    { name: '足部練習 (Footwork)', desc: '基礎足部力量與對線' },
    { name: '大象式 (Elephant)', desc: '核心穩定與脊椎後側拉伸' },
    { name: '捲腹 (Crunches)', desc: '核心床輔助深層核心收縮' },
    { name: '胃部按摩 (Stomach Massage)', desc: '脊椎活動度與深層腹肌' }
  ],
  '凱迪拉克 (Cadillac)': [
    { name: '逐節捲動 (Roll Down)', desc: '脊椎逐節捲動，改善僵硬' },
    { name: '胸口擴展 (Chest Expansion)', desc: '改善圓肩，開展前胸' }
  ],
  '穩踏椅 (Chair)': [
    { name: '天鵝式 (Swan)', desc: '針對頭部前傾，強化上背' },
    { name: '推地式 (Push Down)', desc: '肩胛穩定與核心平衡控制' }
  ],
  '梯桶 (Barrel)': [
    { name: '短箱系列 (Short Box)', desc: '側向穩定與軀幹拉伸' },
    { name: '側向仰臥起坐 (Side Sit-ups)', desc: '側腹線條與骨盆中立訓練' }
  ],
  '墊上 (Mat)': [
    { name: '百次呼吸 (The Hundred)', desc: '皮拉提斯經典核心熱身' },
    { name: '死蟲式 (Dead Bug)', desc: '針對 14° 側彎的最佳修復動作' }
  ]
};

const BODY_PARTS = ['核心', '上半身', '下半身', '全身流動'];
const DIET_TAGS = ['蛋白質足夠', '低醣飲食', '輕食無負擔', '外食控制', '獎勵餐'];
const APPARATUS_TYPES = Object.keys(EXERCISE_LIBRARY);

const CelebrationOverlay = ({ show }) => {
  if (!show) return null;
  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center pointer-events-none p-4">
      <div className="bg-white/95 backdrop-blur-xl rounded-[24px] p-8 flex flex-col items-center animate-in zoom-in duration-500 shadow-2xl border border-[#5a6a7a]/10 text-center">
        <Trophy size={80} className="text-[#f9991a] animate-bounce mb-4" />
        <h2 className="text-[24px] font-semibold text-[#040316] mb-2">達成目標！</h2>
        <p className="text-[#5a6a7a] text-[14px]">數據已成功同步至雲端</p>
      </div>
    </div>
  );
};

const App = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState('home'); 
  const [showEntryModal, setShowEntryModal] = useState(false);
  const [showPlanModal, setShowPlanModal] = useState(false);
  const [entryType, setEntryType] = useState('workout'); 
  const [showCelebration, setShowCelebration] = useState(false);
  const [editingId, setEditingId] = useState(null);

  const [commonFoods, setCommonFoods] = useState(DEFAULT_COMMON_FOODS);
  const [managingMealType, setManagingMealType] = useState(null); 
  const [newFoodInput, setNewFoodInput] = useState('');
  
  const [plans, setPlans] = useState([]);
  const [activePlanId, setActivePlanId] = useState(null);

  const [w_note, setWNote] = useState('');
  const [w_parts, setWParts] = useState([]);
  const [w_apparatus, setWApparatus] = useState('核心床 (Reformer)');
  const [w_exercises, setWExercises] = useState([]);
  const [w_weight, setWWeight] = useState('57.1');
  const [w_date, setWDate] = useState(new Date().toISOString().split('T')[0]);

  const [d_breakfast, setDBreakfast] = useState('');
  const [d_lunch, setDLunch] = useState('');
  const [d_dinner, setDDinner] = useState('');
  const [d_snacks, setDSnacks] = useState('');
  const [d_water, setDWater] = useState(2000);
  const [d_tags, setDTags] = useState([]);
  const [d_date, setDDate] = useState(new Date().toISOString().split('T')[0]);

  const [newPlanTitle, setNewPlanTitle] = useState('');
  const [newPlanDate, setNewPlanDate] = useState('');
  const [newPlanTargetWeight, setNewPlanTargetWeight] = useState('');

  const todayReinforcement = useMemo(() => {
    const day = new Date().getDate();
    return DAILY_REINFORCEMENTS[day % DAILY_REINFORCEMENTS.length];
  }, []);

  const activePlan = useMemo(() => plans.find(p => p.id === activePlanId) || null, [plans, activePlanId]);

  const isDietValid = useMemo(() => {
    if (!activePlan) return false;
    const hasWater = Number(d_water) > 0;
    const hasMeal = (d_breakfast.trim() !== '' || d_lunch.trim() !== '' || d_dinner.trim() !== '' || d_snacks.trim() !== '');
    return hasWater && hasMeal;
  }, [d_water, d_breakfast, d_lunch, d_dinner, d_snacks, activePlan]);

  const isWorkoutValid = useMemo(() => {
    if (!activePlan) return false;
    return w_parts.length > 0 || w_exercises.length > 0;
  }, [w_parts, w_exercises, activePlan]);

  useEffect(() => {
    const initAuth = async () => {
      if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
        await signInWithCustomToken(auth, __initial_auth_token);
      } else {
        await signInAnonymously(auth);
      }
    };
    initAuth();
    const unsubscribe = onAuthStateChanged(auth, setUser);
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) return;
    const plansRef = collection(db, 'artifacts', appId, 'users', user.uid, 'plans');
    const unsubPlans = onSnapshot(plansRef, (snapshot) => {
      const plansList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      const sorted = plansList.sort((a, b) => new Date(b.targetDate) - new Date(a.targetDate));
      setPlans(sorted);
      if (sorted.length > 0 && !activePlanId) setActivePlanId(sorted[0].id);
      setLoading(false);
    });

    const foodsRef = doc(db, 'artifacts', appId, 'users', user.uid, 'settings', 'commonFoods');
    const unsubFoods = onSnapshot(foodsRef, (docSnap) => {
      if (docSnap.exists()) {
        setCommonFoods(docSnap.data());
      } else {
        setDoc(foodsRef, DEFAULT_COMMON_FOODS);
      }
    });

    return () => { unsubPlans(); unsubFoods(); };
  }, [user, activePlanId]);

  const daysLeft = activePlan ? Math.ceil((new Date(activePlan.targetDate) - new Date()) / (1000 * 60 * 60 * 24)) : 0;
  const latestWeight = activePlan?.workoutEntries?.[0]?.weight || activePlan?.baselineWeight || 57.1;

  const triggerCelebration = () => {
    setShowCelebration(true);
    setTimeout(() => setShowCelebration(false), 2200);
  };

  const syncPlanToCloud = async (updatedPlan) => {
    if (!user || !updatedPlan.id) return;
    const planDoc = doc(db, 'artifacts', appId, 'users', user.uid, 'plans', updatedPlan.id);
    await setDoc(planDoc, updatedPlan);
  };

  const handleUpdateCommonFoods = async (updatedFoods) => {
    if (!user) return;
    const foodsRef = doc(db, 'artifacts', appId, 'users', user.uid, 'settings', 'commonFoods');
    await setDoc(foodsRef, updatedFoods);
    setCommonFoods(updatedFoods);
  };

  const handleAddFood = (mealType) => {
    if (!newFoodInput.trim()) return;
    const newList = [...commonFoods[mealType], { name: newFoodInput.trim(), pinned: false }];
    handleUpdateCommonFoods({ ...commonFoods, [mealType]: newList });
    setNewFoodInput('');
  };

  const handleRemoveFood = (mealType, index) => {
    const newList = commonFoods[mealType].filter((_, i) => i !== index);
    handleUpdateCommonFoods({ ...commonFoods, [mealType]: newList });
  };

  const handleTogglePin = (mealType, index) => {
    const newList = commonFoods[mealType].map((item, i) => 
      i === index ? { ...item, pinned: !item.pinned } : item
    );
    handleUpdateCommonFoods({ ...commonFoods, [mealType]: newList });
  };

  const handleQuickAddFood = (mealSetter, currentVal, foodName) => {
    const separator = currentVal.trim() ? '、' : '';
    mealSetter(`${currentVal}${separator}${foodName}`);
  };

  const handleCompleteRecommendation = async () => {
    if (!activePlan) return;
    const today = new Date().toISOString().split('T')[0];
    const [y, m, d] = today.split('-');
    const newEntry = {
      id: Date.now(),
      date: today,
      displayDate: `${parseInt(m)}月${parseInt(d)}日`,
      note: `自動紀錄：完成本日補強動作「${todayReinforcement.name}」`,
      bodyParts: ['核心'],
      apparatus: ['墊上 (Mat)'],
      exercises: [{ name: todayReinforcement.name, sets: '15x3', category: '墊上 (Mat)' }],
      weight: parseFloat(latestWeight) || 0
    };
    await syncPlanToCloud({ ...activePlan, workoutEntries: [newEntry, ...activePlan.workoutEntries].sort((a,b) => new Date(b.date) - new Date(a.date)) });
    triggerCelebration();
  };

  const handleSaveWorkout = async () => {
    if (!activePlan || !isWorkoutValid) return;
    const [y, m, d] = w_date.split('-');
    const newEntry = {
      id: editingId || Date.now(),
      date: w_date,
      displayDate: `${parseInt(m)}月${parseInt(d)}日`,
      note: w_note,
      bodyParts: w_parts,
      apparatus: Array.from(new Set(w_exercises.map(ex => ex.category))),
      exercises: w_exercises,
      weight: parseFloat(w_weight) || 0
    };
    const updatedEntries = editingId ? activePlan.workoutEntries.map(e => e.id === editingId ? newEntry : e) : [newEntry, ...activePlan.workoutEntries];
    await syncPlanToCloud({ ...activePlan, workoutEntries: updatedEntries.sort((a,b) => new Date(b.date) - new Date(a.date)) });
    closeModal();
    if (!editingId) triggerCelebration();
  };

  const handleSaveDiet = async () => {
    if (!activePlan || !isDietValid) return;
    const [y, m, d] = d_date.split('-');
    const newEntry = {
      id: editingId || Date.now(),
      date: d_date,
      displayDate: `${parseInt(m)}月${parseInt(d)}日`,
      breakfast: d_breakfast, lunch: d_lunch, dinner: d_dinner, snacks: d_snacks, water: Number(d_water), tags: d_tags
    };
    const updatedEntries = editingId ? activePlan.dietEntries.map(e => e.id === editingId ? newEntry : e) : [newEntry, ...activePlan.dietEntries];
    await syncPlanToCloud({ ...activePlan, dietEntries: updatedEntries.sort((a,b) => new Date(b.date) - new Date(a.date)) });
    closeModal();
    if (!editingId) triggerCelebration();
  };

  const handleDelete = async () => {
    if (!activePlan) return;
    const key = entryType === 'workout' ? 'workoutEntries' : 'dietEntries';
    await syncPlanToCloud({ ...activePlan, [key]: activePlan[key].filter(e => e.id !== editingId) });
    closeModal();
  };

  const handleCreatePlan = async () => {
    if (!newPlanTitle || !newPlanDate) return;
    const newId = `p-${Date.now()}`;
    await syncPlanToCloud({ id: newId, title: newPlanTitle, targetDate: newPlanDate, targetWeight: parseFloat(newPlanTargetWeight) || 0, baselineWeight: parseFloat(latestWeight), workoutEntries: [], dietEntries: [] });
    setActivePlanId(newId);
    setShowPlanModal(false); setView('home');
  };

  const closeModal = () => {
    setShowEntryModal(false); setEditingId(null); setManagingMealType(null);
    setWNote(''); setWParts([]); setWExercises([]); setDBreakfast(''); setDLunch(''); setDDinner(''); setDSnacks(''); setDWater(2000); setDTags([]);
  };

  const handleEditWorkout = (entry) => {
    setEntryType('workout'); setEditingId(entry.id); setWNote(entry.note); setWParts(entry.bodyParts || []); setWExercises(entry.exercises || []); setWWeight(entry.weight?.toString() || '57.1'); setWDate(entry.date); setShowEntryModal(true);
  };

  const handleEditDiet = (entry) => {
    setEntryType('diet'); setEditingId(entry.id); setDBreakfast(entry.breakfast || ''); setDLunch(entry.lunch || ''); setDDinner(entry.dinner || ''); setDSnacks(entry.snacks || ''); setDWater(entry.water || 2000); setDTags(entry.tags || []); setDDate(entry.date); setShowEntryModal(true);
  };

  if (loading) return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-[#fbfbfe] text-[#5a6a7a] gap-4">
      <Loader2 className="animate-spin" size={32} />
      <p className="text-[12px] font-normal tracking-widest uppercase">系統初始化中...</p>
    </div>
  );

  return (
    <div className="flex justify-center bg-black min-h-screen font-sans tracking-tight text-[#040316]" style={{ fontFamily: 'PingFang TC, sans-serif' }}>
      <div className="w-full max-w-md bg-[#fbfbfe] min-h-screen relative flex flex-col shadow-2xl overflow-hidden">
        
        <CelebrationOverlay show={showCelebration} />

        {/* --- Header --- */}
        <header className="px-[16px] pb-[16px] pt-[24px] bg-[#fbfbfe]/70 backdrop-blur-[12px] sticky top-0 z-30 flex justify-between items-end border-b border-[#5a6a7a]/20 transition-all">
          <div onClick={() => setView('home')} className="cursor-pointer active:scale-[0.98] transition-transform origin-left">
            {view === 'home' ? (
              <>
                <p className="text-[#5a6a7a] text-[12px] font-normal uppercase tracking-[2px] mb-1">目標進展</p>
                <h1 className="text-[24px] font-semibold tracking-tight">{activePlan?.title || '請先建立計畫'}</h1>
              </>
            ) : (
              <div className="flex items-center gap-3">
                <div className="text-[#5a6a7a]">
                   {view === 'workout_history' ? <Dumbbell size={24}/> : view === 'diet_history' ? <Utensils size={24}/> : <Flag size={24}/>}
                </div>
                <h1 className="text-[18px] font-medium tracking-tight">
                  {view === 'workout_history' ? '訓練時間軸' : view === 'diet_history' ? '飲食生活誌' : '計畫管理'}
                </h1>
              </div>
            )}
          </div>
          {view === 'home' && activePlan && (
            <div className="bg-[#e9f1fb] px-3 py-1.5 rounded-xl border border-[#5a6a7a]/20">
              <span className="text-[#f9991a] font-semibold text-[14px]">倒數 {daysLeft} 天</span>
            </div>
          )}
        </header>

        <main className="flex-1 px-[16px] py-[16px] space-y-[16px] overflow-y-auto pb-32 no-scrollbar">
          {view === 'home' ? (
            <>
              {/* 今日焦點 */}
              <section className="bg-[#e9f1fb] rounded-[24px] p-[16px] border border-[#5a6a7a]/30 relative overflow-hidden active:scale-[0.98] transition-all group">
                <Sparkles className="absolute right-[-10px] top-[-10px] w-24 h-24 text-[#5a6a7a]/10 group-hover:rotate-12 transition-transform duration-700" />
                <div className="mb-6">
                  <div className="flex items-center gap-2 mb-2">
                    <Target size={14} className="text-[#f9991a]" />
                    <p className="text-[12px] font-medium uppercase tracking-widest text-[#040316]">今日補強</p>
                  </div>
                  <h2 className="text-[18px] font-medium mb-1">{todayReinforcement.name}</h2>
                  <p className="text-[#040316] text-[14px] font-normal leading-relaxed pr-6 opacity-85">{todayReinforcement.desc}</p>
                </div>
                <div className="flex gap-3">
                  <a href={`https://www.youtube.com/results?search_query=pilates+${todayReinforcement.name.split(' (')[0]}`} target="_blank" rel="noreferrer" 
                    className="flex-1 bg-[#fbfbfe] text-[#040316] rounded-2xl py-3 flex items-center justify-center gap-2 text-[14px] font-medium border border-[#5a6a7a]/30 active:scale-[0.98] transition-all shadow-sm">
                    <Youtube size={16} /> 教學影片
                  </a>
                  <button onClick={handleCompleteRecommendation} disabled={!activePlan} 
                    className="flex-1 bg-[#f9991a] text-white rounded-2xl py-3 flex items-center justify-center gap-2 text-[14px] font-semibold shadow-lg active:scale-[0.98] disabled:opacity-50 transition-all">
                    <CheckCircle2 size={16}/> 打卡完成
                  </button>
                </div>
              </section>

              {/* 體重進度 */}
              <section className="bg-[#e9f1fb] rounded-[24px] p-[16px] border border-[#5a6a7a]/30">
                <div className="flex justify-between items-end mb-4">
                  <div>
                    <p className="text-[#5a6a7a] text-[12px] font-normal uppercase tracking-widest mb-1">當前狀態</p>
                    <p className="text-[24px] font-semibold tracking-tighter text-[#040316]">{latestWeight} <span className="text-[12px] font-normal text-[#5a6a7a]">kg</span></p>
                  </div>
                  <div className="text-right">
                    <p className="text-[12px] font-normal text-[#5a6a7a] uppercase mb-1">距目標</p>
                    <p className="text-[14px] font-medium text-[#f9991a] tracking-tighter">還差 {(latestWeight - (activePlan?.targetWeight || 0)).toFixed(1)} kg</p>
                  </div>
                </div>
                <div className="w-full h-2 bg-[#fbfbfe] rounded-full overflow-hidden border border-[#5a6a7a]/10 shadow-inner">
                  <div className="h-full bg-[#f9991a] rounded-full transition-all duration-1000 ease-out" style={{ width: `${activePlan ? Math.max(10, Math.min(100, (1 - (latestWeight - activePlan.targetWeight) / (activePlan.baselineWeight - activePlan.targetWeight || 1)) * 100)) : 0}%` }} />
                </div>
              </section>

              <div className="grid grid-cols-2 gap-[16px]">
                <button onClick={() => setView('workout_history')} className="bg-[#e9f1fb] rounded-[24px] p-[16px] border border-[#5a6a7a]/30 flex flex-col items-center gap-4 active:scale-[0.98] transition-all group shadow-sm">
                  <div className="w-12 h-12 rounded-2xl bg-[#fbfbfe] flex items-center justify-center text-[#5a6a7a] shadow-inner border border-[#5a6a7a]/10"><Dumbbell size={24}/></div>
                  <div className="text-center space-y-1">
                    <p className="text-[12px] font-normal uppercase text-[#5a6a7a] tracking-widest">運動訓練</p>
                    <p className="text-[14px] font-medium">{activePlan?.workoutEntries?.length || 0} <span className="text-[12px] opacity-60">次</span></p>
                  </div>
                </button>
                <button onClick={() => setView('diet_history')} className="bg-[#e9f1fb] rounded-[24px] p-[16px] border border-[#5a6a7a]/30 flex flex-col items-center gap-4 active:scale-[0.98] transition-all group shadow-sm">
                  <div className="w-12 h-12 rounded-2xl bg-[#fbfbfe] flex items-center justify-center text-[#5a6a7a] shadow-inner border border-[#5a6a7a]/10"><Utensils size={24}/></div>
                  <div className="text-center space-y-1">
                    <p className="text-[12px] font-normal uppercase text-[#5a6a7a] tracking-widest">飲食紀錄</p>
                    <p className="text-[14px] font-medium">{activePlan?.dietEntries?.length || 0} <span className="text-[12px] opacity-60">次</span></p>
                  </div>
                </button>
              </div>
            </>
          ) : (
            <section className="space-y-[16px] pb-12">
              {view !== 'plan_manage' && (view === 'workout_history' ? activePlan?.workoutEntries : activePlan?.dietEntries)?.map((entry) => (
                <div key={entry.id} className="flex gap-[12px] relative">
                  <div className="w-12 pt-1 flex flex-col items-center shrink-0">
                    <p className="text-[24px] font-semibold text-[#040316] tracking-tighter mt-1">{entry.displayDate?.split('月')[1]?.replace('日','') || ''}</p>
                    <p className="text-[12px] font-normal text-[#5a6a7a] uppercase leading-none">{entry.displayDate?.split('月')[0]}月</p>
                    <div className="w-1.5 h-1.5 rounded-full mt-3 bg-[#5a6a7a]/40" />
                  </div>
                  <div className="flex-1 bg-[#e9f1fb] rounded-[24px] p-[16px] border border-[#5a6a7a]/30 active:scale-[0.98] transition-all cursor-pointer" onClick={() => view === 'workout_history' ? handleEditWorkout(entry) : handleEditDiet(entry)}>
                    {view === 'workout_history' ? (
                      <>
                        <p className="text-[12px] font-normal text-[#5a6a7a] uppercase tracking-[2px] mb-3">{entry.apparatus?.join(', ')}</p>
                        <div className="space-y-2 mb-3">
                          {entry.exercises?.map((ex, i) => (
                            <div key={i} className="flex justify-between items-center bg-[#fbfbfe]/50 p-2 rounded-xl border border-[#5a6a7a]/10">
                              <p className="text-[14px] font-normal">{ex.name}</p>
                              <span className="text-[12px] font-medium text-[#f9991a]">{ex.sets}</span>
                            </div>
                          ))}
                        </div>
                      </>
                    ) : (
                      <div className="space-y-3">
                        <div className="flex justify-between items-center"><div className="flex gap-1">{(entry.tags || []).map(t => <span key={t} className="text-[12px] font-normal text-[#5a6a7a]">#{t}</span>)}</div><div className="flex items-center gap-1 text-[#5a6a7a] font-normal text-[12px]"><Droplets size={12}/> {entry.water}cc</div></div>
                        <div className="space-y-1 text-[#040316]">
                          {entry.breakfast && <div className="text-[14px] flex items-center gap-2"><div className="w-1 h-1 rounded-full bg-[#f9991a]"/>{entry.breakfast}</div>}
                          {entry.lunch && <div className="text-[14px] flex items-center gap-2"><div className="w-1 h-1 rounded-full bg-[#f9991a]"/>{entry.lunch}</div>}
                          {entry.dinner && <div className="text-[14px] flex items-center gap-2"><div className="w-1 h-1 rounded-full bg-[#f9991a]"/>{entry.dinner}</div>}
                          {entry.snacks && <div className="text-[14px] flex items-center gap-2 opacity-60"><div className="w-1 h-1 rounded-full bg-[#5a6a7a]"/>{entry.snacks}</div>}
                        </div>
                      </div>
                    )}
                    {entry.note && <p className="text-[14px] text-[#040316] opacity-70 border-l-2 border-[#5a6a7a]/30 pl-3 mt-2">"{entry.note}"</p>}
                  </div>
                </div>
              ))}
              
              {view === 'plan_manage' && (
                <div className="space-y-[16px]">
                  <button onClick={() => setShowPlanModal(true)} className="w-full py-8 bg-[#e9f1fb] rounded-[24px] border border-[#5a6a7a]/30 text-[#040316] flex flex-col items-center gap-2 active:scale-[0.98] transition-all shadow-sm">
                    <Plus size={24} className="text-[#f9991a]"/>
                    <span className="font-medium text-[14px] uppercase tracking-widest">新增目標計畫</span>
                  </button>
                  {plans.map(plan => (
                    <div key={plan.id} className={`bg-[#e9f1fb] rounded-[24px] p-[16px] border transition-all ${activePlanId === plan.id ? 'border-[#f9991a] shadow-lg' : 'border-[#5a6a7a]/30'}`}>
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                             <h3 className="text-[18px] font-medium tracking-tight">{plan.title}</h3>
                             {activePlanId === plan.id && <span className="bg-[#f9991a] text-white text-[10px] font-semibold px-2 py-0.5 rounded-lg uppercase">執行中</span>}
                          </div>
                          <p className="text-[12px] font-normal text-[#5a6a7a]">{plan.targetDate} • 目標 {plan.targetWeight}kg</p>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4 mb-4 pt-2 border-t border-[#5a6a7a]/10">
                        <div className="flex items-center gap-2">
                           <Dumbbell size={14} className="text-[#5a6a7a]" />
                           <span className="text-[12px] text-[#040316]">{plan.workoutEntries?.length || 0} 筆訓練</span>
                        </div>
                        <div className="flex items-center gap-2">
                           <Utensils size={14} className="text-[#5a6a7a]" />
                           <span className="text-[12px] text-[#040316]">{plan.dietEntries?.length || 0} 筆飲食</span>
                        </div>
                      </div>

                      <div className="flex gap-2">
                        {activePlanId !== plan.id && <button onClick={() => {setActivePlanId(plan.id); setView('home');}} className="flex-1 py-2.5 bg-[#040316] text-white rounded-xl text-[12px] font-medium active:scale-[0.98] transition-all shadow-md">啟動計畫</button>}
                        <button onClick={async () => { await deleteDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'plans', plan.id)); }} className="p-2.5 bg-[#fbfbfe] text-[#5a6a7a] border border-[#5a6a7a]/30 rounded-xl active:scale-[0.98] transition-all"><Trash2 size={16}/></button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          )}
        </main>

        <nav className="absolute bottom-[16px] left-[16px] right-[16px] h-[72px] bg-[#fbfbfe]/70 backdrop-blur-[12px] rounded-[24px] shadow-xl border border-[#5a6a7a]/30 flex justify-around items-center px-4 z-40">
          <button onClick={() => setView('home')} className={`flex flex-col items-center gap-1 transition-all ${view === 'home' ? 'text-[#f9991a] scale-110' : 'text-[#5a6a7a] active:scale-[0.98]'}`}><Heart size={20} fill={view === 'home' ? 'currentColor' : 'none'} /><span className="text-[10px] font-normal uppercase tracking-widest">首頁</span></button>
          <button onClick={() => setView('workout_history')} className={`flex flex-col items-center gap-1 transition-all ${view === 'workout_history' ? 'text-[#f9991a] scale-110' : 'text-[#5a6a7a] active:scale-[0.98]'}`}><Dumbbell size={20} /><span className="text-[10px] font-normal uppercase tracking-widest">紀錄</span></button>
          <button onClick={() => { setEntryType('workout'); setEditingId(null); setShowEntryModal(true); }} className="bg-[#f9991a] w-12 h-12 rounded-[20px] flex items-center justify-center text-white shadow-lg active:scale-[0.98] transition-all border-2 border-[#fbfbfe] shadow-orange-200"><Plus size={24} strokeWidth={3} /></button>
          <button onClick={() => setView('diet_history')} className={`flex flex-col items-center gap-1 transition-all ${view === 'diet_history' ? 'text-[#f9991a] scale-110' : 'text-[#5a6a7a] active:scale-[0.98]'}`}><Utensils size={20} /><span className="text-[10px] font-normal uppercase tracking-widest">飲食</span></button>
          <button onClick={() => setView('plan_manage')} className={`flex flex-col items-center gap-1 transition-all ${view === 'plan_manage' ? 'text-[#f9991a] scale-110' : 'text-[#5a6a7a] active:scale-[0.98]'}`}><Clipboard size={20} /><span className="text-[10px] font-normal uppercase tracking-widest">計畫</span></button>
        </nav>

        {/* --- Modals --- */}
        {showEntryModal && (
          <div className="absolute inset-0 z-[100] flex items-end animate-in fade-in duration-300 text-[#040316]">
            <div className="absolute inset-0 bg-[#040316]/20 backdrop-blur-[4px]" onClick={closeModal} />
            <div className="w-full bg-[#fbfbfe] rounded-t-[24px] h-[92vh] z-10 flex flex-col animate-in slide-in-from-bottom-full duration-500 shadow-2xl border-t border-[#5a6a7a]/30 relative">
              
              <header className="p-[16px] border-b border-[#5a6a7a]/20 flex justify-between items-center bg-[#fbfbfe]/70 backdrop-blur-[12px] z-20">
                <div className="w-10"></div>
                <div className="flex bg-[#e9f1fb] p-1 rounded-xl border border-[#5a6a7a]/20">
                  <button onClick={() => setEntryType('workout')} className={`px-8 py-1.5 rounded-lg text-[12px] font-medium transition-all ${entryType === 'workout' ? 'bg-[#fbfbfe] text-[#040316] shadow-sm' : 'text-[#5a6a7a]'}`}>運動</button>
                  <button onClick={() => setEntryType('diet')} className={`px-8 py-1.5 rounded-lg text-[12px] font-medium transition-all ${entryType === 'diet' ? 'bg-[#fbfbfe] text-[#040316] shadow-sm' : 'text-[#5a6a7a]'}`}>飲食</button>
                </div>
                <button onClick={closeModal} className="text-[#5a6a7a] active:scale-[0.90] transition-transform p-2">
                  <X size={24} strokeWidth={2} />
                </button>
              </header>

              <div className="flex-1 overflow-y-auto p-[16px] space-y-[24px] pb-44 no-scrollbar">
                {entryType === 'workout' ? (
                  <>
                    <div className="grid grid-cols-2 gap-[12px]">
                      <div className="bg-[#e9f1fb] p-[16px] rounded-[16px] border border-[#5a6a7a]/30 text-center space-y-[12px]">
                        <p className="text-[16px] font-medium text-[#5a6a7a] uppercase tracking-widest mb-1">訓練日期</p>
                        <input type="date" value={w_date} onChange={(e) => setWDate(e.target.value)} className="w-full bg-transparent font-semibold text-[18px] border-none outline-none text-center text-[#f9991a]" />
                      </div>
                      <div className="bg-[#e9f1fb] p-[16px] rounded-[16px] border border-[#5a6a7a]/30 text-center space-y-[12px]">
                        <p className="text-[16px] font-medium text-[#5a6a7a] uppercase tracking-widest mb-1">當前體重</p>
                        <input type="number" step="0.1" value={w_weight} onChange={(e) => setWWeight(e.target.value)} className="w-full bg-transparent font-semibold text-[18px] border-none outline-none text-center text-[#f9991a]" />
                      </div>
                    </div>
                    
                    <div className="space-y-[12px]">
                      <p className="text-[16px] font-medium text-[#5a6a7a] uppercase tracking-widest ml-1">訓練部位</p>
                      <div className="flex gap-3 flex-wrap">
                        {BODY_PARTS.map(part => (
                          <button key={part} onClick={() => setWParts(prev => prev.includes(part) ? prev.filter(p => p !== part) : [...prev, part])} 
                            className={`px-5 py-3 rounded-xl text-[14px] font-medium transition-all border ${w_parts.includes(part) ? 'bg-[#040316] text-white border-[#040316] shadow-md' : 'bg-[#fbfbfe] text-[#5a6a7a] border-[#5a6a7a]/30'}`}
                          >
                            {part}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-[12px]">
                      <p className="text-[16px] font-medium text-[#5a6a7a] uppercase tracking-widest ml-1">器械與動作選擇</p>
                      <div className="bg-[#e9f1fb]/50 rounded-[24px] p-4 border border-[#5a6a7a]/20 space-y-5 shadow-inner">
                        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
                          {APPARATUS_TYPES.map(type => (
                            <button key={type} onClick={() => setWApparatus(type)} 
                              className={`px-4 py-2.5 rounded-xl text-[14px] font-medium whitespace-nowrap active:scale-[0.98] transition-all border ${w_apparatus === type ? 'bg-[#040316] text-white border-[#040316] shadow-md' : 'bg-[#fbfbfe] text-[#5a6a7a] border-[#5a6a7a]/20'}`}
                            >
                              {type}
                            </button>
                          ))}
                        </div>

                        <div className="grid grid-cols-1 gap-3">
                          {EXERCISE_LIBRARY[w_apparatus]?.map(ex => { 
                            const idx = w_exercises.findIndex(i => i.name === ex.name && i.category === w_apparatus); 
                            const active = idx !== -1; 
                            return (
                              <div key={ex.name} className={`flex flex-col rounded-[20px] border transition-all p-3 ${active ? 'border-[#f9991a] bg-[#fbfbfe] shadow-sm' : 'border-[#5a6a7a]/10 bg-[#fbfbfe]/70'}`}>
                                <div className="flex items-center gap-4 p-1 w-full">
                                  <button onClick={() => active ? setWExercises(w_exercises.filter((_, i) => i !== idx)) : setWExercises([...w_exercises, { name: ex.name, sets: '', category: w_apparatus }])} className="flex-1 flex items-center gap-3 text-left">
                                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${active ? 'bg-[#f9991a] text-white' : 'bg-[#e9f1fb] text-[#5a6a7a] shadow-inner'}`}>
                                      {active ? <Check size={18} /> : <Plus size={18} />}
                                    </div>
                                    <div><p className={`text-[14px] font-medium text-[#040316]`}>{ex.name}</p></div>
                                  </button>
                                  <a href={`https://www.youtube.com/results?search_query=pilates+${ex.name}`} target="_blank" rel="noreferrer" className="p-3 bg-[#e9f1fb] rounded-xl text-red-500 shadow-sm active:scale-90" onClick={(e) => e.stopPropagation()}><Youtube size={18} /></a>
                                </div>
                                {active && (
                                  <div className="px-1 pb-1 pt-2 animate-in slide-in-from-top-2">
                                    <div className="flex items-center gap-2 bg-[#e9f1fb] px-4 py-3 rounded-xl border border-[#5a6a7a]/20 shadow-inner">
                                      <Hash size={12} className="text-[#5a6a7a]" />
                                      <input type="text" placeholder="設定組數 (例如: 15x3)" value={w_exercises[idx].sets} onChange={(e) => setWExercises(w_exercises.map((item, i) => i === idx ? { ...item, sets: e.target.value } : item))} className="bg-transparent text-[14px] font-normal outline-none w-full text-[#040316]" />
                                    </div>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>

                    <div className="space-y-[12px]">
                      <p className="text-[16px] font-medium text-[#5a6a7a] uppercase tracking-widest ml-1">訓練筆記</p>
                      <textarea value={w_note} onChange={(e) => setWNote(e.target.value)} className="w-full h-32 bg-[#e9f1fb] rounded-[16px] p-[16px] text-[14px] font-normal border border-[#5a6a7a]/30 outline-none focus:border-[#5a6a7a] shadow-inner resize-none" placeholder="分享訓練感受..." />
                    </div>
                  </>
                ) : (
                  <>
                    <div className="bg-[#e9f1fb] p-[16px] rounded-[16px] border border-[#5a6a7a]/30 text-center space-y-[12px]">
                      <p className="text-[16px] font-medium text-[#5a6a7a] uppercase tracking-widest">飲食日期</p>
                      <input type="date" value={d_date} onChange={(e) => setDDate(e.target.value)} className="w-full bg-transparent font-semibold text-[18px] border-none outline-none text-center text-[#f9991a]" />
                    </div>

                    <div className="space-y-[12px]">
                      <div className="bg-[#e9f1fb] p-[16px] rounded-[24px] flex items-center justify-between border border-[#5a6a7a]/50 shadow-inner">
                        <div className="flex items-center gap-4">
                          <div className="text-[#f9991a]"><Droplets size={24} /></div>
                          <div className="flex items-center">
                            <input type="number" inputMode="numeric" pattern="[0-9]*" value={d_water} onChange={(e) => setDWater(e.target.value)} className="w-20 bg-transparent text-[28px] font-semibold text-[#040316] tracking-tighter outline-none focus:ring-0" />
                            <span className="text-[14px] font-normal text-[#5a6a7a] ml-1">cc</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <button onClick={() => setDWater(Math.max(0, Number(d_water) - 250))} className="w-12 h-12 bg-[#fbfbfe] rounded-full flex items-center justify-center border border-[#5a6a7a]/30 text-[#040316] active:scale-[0.90] shadow-sm text-xl">-</button>
                          <button onClick={() => setDWater(Number(d_water) + 250)} className="w-12 h-12 bg-[#f9991a] rounded-full flex items-center justify-center text-white active:scale-[0.90] shadow-md text-xl shadow-orange-200">+</button>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-[24px]">
                      {[
                        { label: '早餐', val: d_breakfast, set: setDBreakfast, icon: <Coffee size={18}/>, key: 'breakfast' },
                        { label: '午餐', val: d_lunch, set: setDLunch, icon: <Sun size={18}/>, key: 'lunch' },
                        { label: '晚餐', val: d_dinner, set: setDDinner, icon: <Moon size={18}/>, key: 'dinner' },
                        { label: '點心/其他', val: d_snacks, set: setDSnacks, icon: <Cookie size={18}/>, key: 'snacks' }
                      ].map(meal => {
                        const sortedFoods = [...(commonFoods[meal.key] || [])].sort((a, b) => b.pinned - a.pinned);
                        const isManaging = managingMealType === meal.key;

                        return (
                          <div key={meal.label} className="space-y-[12px]">
                            <div className="flex justify-between items-center px-1">
                              <div className="flex items-center gap-2">
                                <span className="text-[#5a6a7a]">{meal.icon}</span>
                                <p className="text-[16px] font-medium text-[#5a6a7a] uppercase tracking-widest">{meal.label}</p>
                              </div>
                              <button onClick={() => setManagingMealType(isManaging ? null : meal.key)} className={`p-2 rounded-lg transition-all shadow-sm ${isManaging ? 'bg-[#f9991a] text-white' : 'bg-[#e9f1fb] text-[#5a6a7a]'}`}><Settings size={18} /></button>
                            </div>

                            {isManaging ? (
                              <div className="bg-[#e9f1fb] rounded-[24px] p-4 border border-[#f9991a]/30 space-y-4 animate-in slide-in-from-top-2">
                                <div className="flex gap-2">
                                  <input value={newFoodInput} onChange={(e) => setNewFoodInput(e.target.value)} placeholder="輸入新食物名稱..." className="flex-1 bg-[#fbfbfe] rounded-xl px-4 py-2 text-[14px] outline-none border border-[#5a6a7a]/20" />
                                  <button onClick={() => handleAddFood(meal.key)} className="bg-[#f9991a] text-white p-2 rounded-xl active:scale-95 shadow-md"><Plus size={20} /></button>
                                </div>
                                <div className="space-y-2 max-h-[200px] overflow-y-auto no-scrollbar">
                                  {commonFoods[meal.key].map((food, idx) => (
                                    <div key={idx} className="flex items-center justify-between bg-[#fbfbfe] p-3 rounded-xl border border-[#5a6a7a]/10 shadow-sm">
                                      <p className="text-[14px] font-medium">{food.name}</p>
                                      <div className="flex items-center gap-2">
                                        <button onClick={() => handleTogglePin(meal.key, idx)} className={`p-1.5 rounded-lg shadow-sm ${food.pinned ? 'bg-[#f9991a]/10 text-[#f9991a]' : 'bg-gray-50 text-[#5a6a7a]'}`}>{food.pinned ? <Pin size={16} fill="currentColor" /> : <PinOff size={16} />}</button>
                                        <button onClick={() => handleRemoveFood(meal.key, idx)} className="p-1.5 text-red-400 bg-red-50 rounded-lg shadow-sm"><Trash2 size={16} /></button>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            ) : (
                              <div className="bg-[#fbfbfe] rounded-[24px] p-[16px] border border-[#5a6a7a]/30 flex flex-col gap-3 focus-within:border-[#5a6a7a] transition-all shadow-sm">
                                <textarea value={meal.val} onChange={(e) => meal.set(e.target.value)} placeholder="點擊下方常用或手寫紀錄..." className="w-full bg-transparent border-none outline-none text-[14px] font-normal resize-none min-h-[60px]" />
                                <div className="flex gap-2 overflow-x-auto no-scrollbar pt-2 border-t border-[#5a6a7a]/10">
                                  {sortedFoods.map((food, idx) => (
                                    <button key={idx} onClick={() => handleQuickAddFood(meal.set, meal.val, food.name)} className={`px-3 py-1.5 rounded-lg text-[12px] whitespace-nowrap active:scale-95 border flex items-center gap-1 shadow-sm ${food.pinned ? 'bg-[#f9991a]/10 text-[#f9991a] border-[#f9991a]/30' : 'bg-[#e9f1fb] text-[#5a6a7a] border-[#5a6a7a]/10'}`}>
                                      {food.pinned && <Pin size={10} fill="currentColor" />}
                                      {food.name}
                                    </button>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}

                      <div className="space-y-[12px]">
                        <p className="text-[16px] font-medium text-[#5a6a7a] uppercase tracking-widest ml-1">飲食標籤</p>
                        <div className="flex gap-3 flex-wrap">
                          {DIET_TAGS.map(tag => <button key={tag} onClick={() => setDTags(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag])} className={`px-4 py-3 rounded-xl text-[12px] font-medium transition-all border shadow-sm ${d_tags.includes(tag) ? 'bg-[#040316] text-white border-[#040316]' : 'bg-[#fbfbfe] text-[#5a6a7a] border-[#5a6a7a]/30'}`}>{tag}</button>)}
                        </div>
                      </div>
                    </div>
                  </>
                )}
                
                {editingId && (
                  <button onClick={handleDelete} className="w-full py-4 text-red-600 font-medium text-[14px] bg-[#fbfbfe] border border-red-100 rounded-xl active:scale-[0.98] transition-all mb-8 shadow-sm">刪除這筆紀錄</button>
                )}
              </div>

              <div className="absolute bottom-0 left-0 right-0 p-[16px] bg-[#fbfbfe]/70 backdrop-blur-[12px] border-t border-[#5a6a7a]/20 z-30 shadow-[0_-10px_30px_rgba(0,0,0,0.03)]">
                {!activePlan && <p className="text-center text-[#f9991a] text-[12px] mb-3 font-medium">請先在「計畫」頁面建立目標。</p>}
                <button 
                  onClick={entryType === 'workout' ? handleSaveWorkout : handleSaveDiet} 
                  disabled={!activePlan || (entryType === 'diet' ? !isDietValid : !isWorkoutValid)}
                  className={`w-full py-4 rounded-[16px] text-white font-semibold text-[16px] shadow-lg active:scale-[0.98] transition-all ${entryType === 'workout' ? 'bg-[#f9991a] shadow-orange-100' : 'bg-[#040316] shadow-gray-200'} disabled:opacity-30 disabled:active:scale-100`}
                >
                  {editingId ? '確認並修改' : `儲存${entryType === 'workout' ? '訓練' : '飲食'}紀錄`}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* --- Plan Modal --- */}
        {showPlanModal && (
          <div className="absolute inset-0 z-[110] flex items-center justify-center p-4 animate-in fade-in duration-300">
            <div className="absolute inset-0 bg-[#040316]/40 backdrop-blur-sm" onClick={() => setShowPlanModal(false)} />
            <div className="w-full max-w-sm bg-[#fbfbfe] rounded-[24px] p-6 z-10 shadow-2xl border border-[#5a6a7a]/20 text-[#040316]">
              <h3 className="text-[20px] font-medium mb-4">新增目標</h3>
              <div className="space-y-4">
                <div className="space-y-1"><p className="text-[16px] font-medium text-[#5a6a7a]">計畫名稱</p><input value={newPlanTitle} onChange={(e) => setNewPlanTitle(e.target.value)} className="w-full bg-[#e9f1fb] rounded-xl p-4 text-[14px] font-medium outline-none shadow-inner" placeholder="例如：韓國衝刺計畫" /></div>
                <div className="space-y-1"><p className="text-[16px] font-medium text-[#5a6a7a]">目標日期</p><input type="date" value={newPlanDate} onChange={(e) => setNewPlanDate(e.target.value)} className="w-full bg-[#e9f1fb] rounded-xl p-4 text-[14px] font-medium outline-none" /></div>
                <div className="space-y-1"><p className="text-[16px] font-medium text-[#5a6a7a]">目標體重 (kg)</p><input type="number" step="0.1" value={newPlanTargetWeight} onChange={(e) => setNewPlanTargetWeight(e.target.value)} className="w-full bg-[#e9f1fb] rounded-xl p-4 text-[14px] font-medium outline-none shadow-inner" placeholder="54.0" /></div>
              </div>
              <div className="flex gap-3 mt-6">
                <button onClick={() => setShowPlanModal(false)} className="flex-1 py-3 text-[#5a6a7a] font-normal text-[14px]">取消</button>
                <button onClick={handleCreatePlan} className="flex-1 py-3 bg-[#f9991a] text-white rounded-xl font-semibold text-[14px] shadow-lg active:scale-[0.98] transition-all">啟動計畫</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default App;


