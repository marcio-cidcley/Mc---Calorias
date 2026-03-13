/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { 
  Plus, 
  Search, 
  Camera, 
  History, 
  User, 
  ChevronRight, 
  Utensils, 
  Flame, 
  Target, 
  Settings,
  X,
  Loader2,
  Check,
  Trash2,
  ArrowLeft
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  PieChart, 
  Pie, 
  Cell, 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip 
} from 'recharts';
import { format, isSameDay, startOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn, calculateTDEE, getMacroGoals } from './utils';
import { FoodEntry, UserProfile, DailyGoal, AIAnalysisResult } from './types';
import { analyzeFood } from './services/geminiService';

// --- Components ---

const ProgressBar = ({ value, max, color, label }: { value: number, max: number, color: string, label: string }) => {
  const percentage = Math.min(Math.round((value / max) * 100), 100);
  return (
    <div className="flex flex-col gap-1">
      <div className="flex justify-between text-[11px] font-medium uppercase tracking-wider text-zinc-500">
        <span>{label}</span>
        <span>{value} / {max}g</span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-zinc-100">
        <motion.div 
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          className={cn("h-full rounded-full", color)}
        />
      </div>
    </div>
  );
};

// --- Main App ---

export default function App() {
  // State
  const [entries, setEntries] = useState<FoodEntry[]>(() => {
    const saved = localStorage.getItem('vitalis_entries');
    return saved ? JSON.parse(saved) : [];
  });

  const [profile, setProfile] = useState<UserProfile>(() => {
    const saved = localStorage.getItem('vitalis_profile');
    return saved ? JSON.parse(saved) : {
      name: 'Usuário',
      weight: 70,
      height: 175,
      age: 25,
      gender: 'male',
      activityLevel: 'moderado',
      goal: 'maintain'
    };
  });

  const [activeTab, setActiveTab] = useState<'dashboard' | 'history' | 'profile'>('dashboard');
  const [isAddingFood, setIsAddingFood] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [aiInput, setAiInput] = useState('');
  const [analysisResult, setAnalysisResult] = useState<AIAnalysisResult | null>(null);
  const [cameraActive, setCameraActive] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Persistence
  useEffect(() => {
    localStorage.setItem('vitalis_entries', JSON.stringify(entries));
  }, [entries]);

  useEffect(() => {
    localStorage.setItem('vitalis_profile', JSON.stringify(profile));
  }, [profile]);

  // Derived Data
  const todayEntries = entries.filter(e => isSameDay(e.timestamp, Date.now()));
  const totals = todayEntries.reduce((acc, curr) => ({
    calories: acc.calories + curr.calories,
    protein: acc.protein + curr.protein,
    carbs: acc.carbs + curr.carbs,
    fat: acc.fat + curr.fat
  }), { calories: 0, protein: 0, carbs: 0, fat: 0 });

  const tdee = calculateTDEE(profile);
  const goals = getMacroGoals(tdee, profile.goal);

  // Handlers
  const handleAddFood = async () => {
    if (!aiInput.trim()) return;
    setIsAnalyzing(true);
    try {
      const result = await analyzeFood(aiInput);
      setAnalysisResult(result);
    } catch (error) {
      alert("Erro ao analisar o alimento. Por favor, tente novamente.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const confirmEntry = () => {
    if (!analysisResult) return;
    const newEntry: FoodEntry = {
      id: Math.random().toString(36).substr(2, 9),
      ...analysisResult,
      timestamp: Date.now()
    };
    setEntries([newEntry, ...entries]);
    setIsAddingFood(false);
    setAnalysisResult(null);
    setAiInput('');
  };

  const deleteEntry = (id: string) => {
    setEntries(entries.filter(e => e.id !== id));
  };

  const startCamera = async () => {
    setCameraActive(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      console.error("Camera access denied", err);
      setCameraActive(false);
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const tracks = (videoRef.current.srcObject as MediaStream).getTracks();
      tracks.forEach(track => track.stop());
    }
    setCameraActive(false);
  };

  const takePhoto = async () => {
    if (videoRef.current && canvasRef.current) {
      const context = canvasRef.current.getContext('2d');
      if (context) {
        canvasRef.current.width = videoRef.current.videoWidth;
        canvasRef.current.height = videoRef.current.videoHeight;
        context.drawImage(videoRef.current, 0, 0);
        const dataUrl = canvasRef.current.toDataURL('image/jpeg');
        const base64 = dataUrl.split(',')[1];
        
        stopCamera();
        setIsAnalyzing(true);
        try {
          const result = await analyzeFood({ data: base64, mimeType: 'image/jpeg' });
          setAnalysisResult(result);
        } catch (error) {
          alert("Erro ao analisar a imagem.");
        } finally {
          setIsAnalyzing(false);
        }
      }
    }
  };

  // UI Parts
  const chartData = [
    { name: 'Proteína', value: totals.protein * 4, color: '#10b981' },
    { name: 'Carbos', value: totals.carbs * 4, color: '#3b82f6' },
    { name: 'Gordura', value: totals.fat * 9, color: '#f59e0b' },
  ];

  return (
    <div className="flex min-h-screen flex-col bg-[#F2F2F7] font-sans text-zinc-900 antialiased">
      {/* Header */}
      <header className="sticky top-0 z-10 border-b border-zinc-200 bg-white/80 px-6 py-4 backdrop-blur-md">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">MC - Calorias</h1>
            <p className="text-xs font-medium text-zinc-500 uppercase tracking-widest">
              {format(Date.now(), "EEEE, d 'de' MMM", { locale: ptBR })}
            </p>
          </div>
          <button 
            onClick={() => setIsAddingFood(true)}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-zinc-900 text-white shadow-lg transition-transform active:scale-95"
          >
            <Plus size={24} />
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto pb-24">
        <AnimatePresence mode="wait">
          {activeTab === 'dashboard' && (
            <motion.div 
              key="dashboard"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6 p-6"
            >
              {/* Summary Card */}
              <div className="rounded-3xl bg-white p-6 shadow-sm border border-zinc-100">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Calorias Restantes</span>
                    <div className="text-4xl font-bold tracking-tighter">
                      {Math.max(0, goals.calories - totals.calories)}
                    </div>
                  </div>
                  <div className="h-20 w-20">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={chartData}
                          innerRadius={25}
                          outerRadius={35}
                          paddingAngle={5}
                          dataKey="value"
                        >
                          {chartData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="space-y-4">
                  <ProgressBar 
                    label="Proteína" 
                    value={totals.protein} 
                    max={goals.protein} 
                    color="bg-emerald-500" 
                  />
                  <ProgressBar 
                    label="Carboidratos" 
                    value={totals.carbs} 
                    max={goals.carbs} 
                    color="bg-blue-500" 
                  />
                  <ProgressBar 
                    label="Gordura" 
                    value={totals.fat} 
                    max={goals.fat} 
                    color="bg-amber-500" 
                  />
                </div>
              </div>

              {/* Today's Log */}
              <section>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-bold">Registro de Hoje</h2>
                  <button onClick={() => setActiveTab('history')} className="text-sm font-medium text-blue-600">Ver tudo</button>
                </div>
                
                <div className="space-y-3">
                  {todayEntries.length === 0 ? (
                    <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-zinc-200 py-12 text-zinc-400">
                      <Utensils size={32} className="mb-2 opacity-20" />
                      <p className="text-sm">Nenhum alimento registrado hoje</p>
                    </div>
                  ) : (
                    todayEntries.map(entry => (
                      <div key={entry.id} className="flex items-center justify-between rounded-2xl bg-white p-4 shadow-sm border border-zinc-100">
                        <div className="flex items-center gap-4">
                          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-zinc-50 text-zinc-400">
                            <Utensils size={20} />
                          </div>
                          <div>
                            <h3 className="font-semibold">{entry.name}</h3>
                            <p className="text-xs text-zinc-500">{entry.servingSize} • {format(entry.timestamp, 'HH:mm')}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-bold">{entry.calories} <span className="text-[10px] font-medium text-zinc-400 uppercase">kcal</span></div>
                          <div className="text-[10px] font-medium text-zinc-400 uppercase">
                            P:{entry.protein} C:{entry.carbs} F:{entry.fat}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </section>
            </motion.div>
          )}

          {activeTab === 'history' && (
            <motion.div 
              key="history"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="p-6 space-y-6"
            >
              <h2 className="text-2xl font-bold">Histórico</h2>
              {entries.length === 0 ? (
                <div className="text-center py-20 text-zinc-400">Nenhum registro encontrado</div>
              ) : (
                <div className="space-y-6">
                  {/* Group entries by date */}
                  {Array.from(new Set(entries.map(e => startOfDay(e.timestamp).getTime()))).sort((a, b) => b - a).map(date => (
                    <div key={date} className="space-y-3">
                      <h3 className="text-sm font-bold text-zinc-400 uppercase tracking-widest">{format(date, "d 'de' MMMM, yyyy", { locale: ptBR })}</h3>
                      {entries.filter(e => startOfDay(e.timestamp).getTime() === date).map(entry => (
                        <div key={entry.id} className="group flex items-center justify-between rounded-2xl bg-white p-4 shadow-sm border border-zinc-100">
                          <div className="flex items-center gap-4">
                            <div>
                              <h3 className="font-semibold">{entry.name}</h3>
                              <p className="text-xs text-zinc-500">{entry.servingSize} • {format(entry.timestamp, 'HH:mm')}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-4">
                            <div className="text-right">
                              <div className="font-bold">{entry.calories} kcal</div>
                            </div>
                            <button 
                              onClick={() => deleteEntry(entry.id)}
                              className="opacity-0 group-hover:opacity-100 p-2 text-zinc-300 hover:text-red-500 transition-all"
                            >
                              <Trash2 size={18} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          )}

          {activeTab === 'profile' && (
            <motion.div 
              key="profile"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="p-6 space-y-8"
            >
              <div className="flex items-center gap-4">
                <div className="h-16 w-16 rounded-full bg-zinc-900 flex items-center justify-center text-white text-2xl font-bold">
                  {profile.name[0]}
                </div>
                <div>
                  <h2 className="text-2xl font-bold">{profile.name}</h2>
                  <p className="text-sm text-zinc-500">Membro desde {format(Date.now(), 'MMM yyyy', { locale: ptBR })}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="rounded-2xl bg-white p-4 shadow-sm border border-zinc-100">
                  <p className="text-xs font-medium text-zinc-400 uppercase tracking-wider mb-1">Peso</p>
                  <p className="text-xl font-bold">{profile.weight} kg</p>
                </div>
                <div className="rounded-2xl bg-white p-4 shadow-sm border border-zinc-100">
                  <p className="text-xs font-medium text-zinc-400 uppercase tracking-wider mb-1">Altura</p>
                  <p className="text-xl font-bold">{profile.height} cm</p>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-sm font-bold text-zinc-400 uppercase tracking-widest">Configurações</h3>
                <div className="rounded-2xl bg-white overflow-hidden shadow-sm border border-zinc-100">
                  <button className="w-full flex items-center justify-between p-4 hover:bg-zinc-50 border-b border-zinc-100">
                    <div className="flex items-center gap-3">
                      <Target size={20} className="text-zinc-400" />
                      <span className="font-medium">Minha Meta</span>
                    </div>
                    <div className="flex items-center gap-2 text-zinc-400">
                      <span className="text-sm capitalize">{profile.goal === 'lose' ? 'Perder' : profile.goal === 'gain' ? 'Ganhar' : 'Manter'} peso</span>
                      <ChevronRight size={16} />
                    </div>
                  </button>
                  <button className="w-full flex items-center justify-between p-4 hover:bg-zinc-50 border-b border-zinc-100">
                    <div className="flex items-center gap-3">
                      <Flame size={20} className="text-zinc-400" />
                      <span className="font-medium">Nível de Atividade</span>
                    </div>
                    <div className="flex items-center gap-2 text-zinc-400">
                      <span className="text-sm capitalize">{profile.activityLevel.replace('_', ' ')}</span>
                      <ChevronRight size={16} />
                    </div>
                  </button>
                  <button className="w-full flex items-center justify-between p-4 hover:bg-zinc-50">
                    <div className="flex items-center gap-3">
                      <Settings size={20} className="text-zinc-400" />
                      <span className="font-medium">Configurações da Conta</span>
                    </div>
                    <ChevronRight size={16} className="text-zinc-400" />
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Navigation Bar */}
      <nav className="fixed bottom-0 left-0 right-0 border-t border-zinc-200 bg-white/90 px-6 py-3 backdrop-blur-lg">
        <div className="flex items-center justify-around">
          <button 
            onClick={() => setActiveTab('dashboard')}
            className={cn("flex flex-col items-center gap-1 transition-colors", activeTab === 'dashboard' ? "text-zinc-900" : "text-zinc-400")}
          >
            <History size={24} />
            <span className="text-[10px] font-bold uppercase">Hoje</span>
          </button>
          <button 
            onClick={() => setActiveTab('history')}
            className={cn("flex flex-col items-center gap-1 transition-colors", activeTab === 'history' ? "text-zinc-900" : "text-zinc-400")}
          >
            <Search size={24} />
            <span className="text-[10px] font-bold uppercase">Log</span>
          </button>
          <button 
            onClick={() => setActiveTab('profile')}
            className={cn("flex flex-col items-center gap-1 transition-colors", activeTab === 'profile' ? "text-zinc-900" : "text-zinc-400")}
          >
            <User size={24} />
            <span className="text-[10px] font-bold uppercase">Perfil</span>
          </button>
        </div>
      </nav>

      {/* Add Food Modal */}
      <AnimatePresence>
        {isAddingFood && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 backdrop-blur-sm sm:items-center"
          >
            <motion.div 
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl"
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold">Adicionar Alimento</h2>
                <button onClick={() => { setIsAddingFood(false); setAnalysisResult(null); stopCamera(); }} className="rounded-full bg-zinc-100 p-2 text-zinc-500">
                  <X size={20} />
                </button>
              </div>

              {!analysisResult ? (
                <div className="space-y-6">
                  {cameraActive ? (
                    <div className="relative aspect-video overflow-hidden rounded-2xl bg-black">
                      <video ref={videoRef} autoPlay playsInline className="h-full w-full object-cover" />
                      <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-4">
                        <button onClick={takePhoto} className="h-14 w-14 rounded-full border-4 border-white bg-red-500 shadow-lg" />
                        <button onClick={stopCamera} className="h-14 w-14 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center text-white">
                          <X size={24} />
                        </button>
                      </div>
                      <canvas ref={canvasRef} className="hidden" />
                    </div>
                  ) : (
                    <>
                      <div className="relative">
                        <textarea 
                          value={aiInput}
                          onChange={(e) => setAiInput(e.target.value)}
                          placeholder="Descreva o que você comeu (ex: '2 fatias de pizza e uma coca')"
                          className="h-32 w-full rounded-2xl bg-zinc-50 p-4 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-200"
                        />
                        <button 
                          onClick={startCamera}
                          className="absolute bottom-4 right-4 rounded-full bg-white p-2 text-zinc-500 shadow-sm border border-zinc-100"
                        >
                          <Camera size={20} />
                        </button>
                      </div>

                      <button 
                        onClick={handleAddFood}
                        disabled={isAnalyzing || !aiInput.trim()}
                        className="flex w-full items-center justify-center gap-2 rounded-2xl bg-zinc-900 py-4 font-bold text-white transition-all active:scale-95 disabled:opacity-50"
                      >
                        {isAnalyzing ? <Loader2 className="animate-spin" /> : <Search size={20} />}
                        {isAnalyzing ? "Analisando..." : "Analisar com IA"}
                      </button>
                    </>
                  )}
                </div>
              ) : (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="space-y-6"
                >
                  <div className="rounded-2xl bg-zinc-50 p-6 text-center">
                    <div className="text-xs font-bold text-zinc-400 uppercase tracking-widest mb-1">Calorias Estimadas</div>
                    <div className="text-5xl font-black tracking-tighter text-zinc-900">{analysisResult.calories}</div>
                    <p className="mt-2 text-sm font-medium text-zinc-500">{analysisResult.name} • {analysisResult.servingSize}</p>
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div className="rounded-xl bg-emerald-50 p-3 text-center">
                      <div className="text-[10px] font-bold text-emerald-600 uppercase">Proteína</div>
                      <div className="text-lg font-bold text-emerald-900">{analysisResult.protein}g</div>
                    </div>
                    <div className="rounded-xl bg-blue-50 p-3 text-center">
                      <div className="text-[10px] font-bold text-blue-600 uppercase">Carbos</div>
                      <div className="text-lg font-bold text-blue-900">{analysisResult.carbs}g</div>
                    </div>
                    <div className="rounded-xl bg-amber-50 p-3 text-center">
                      <div className="text-[10px] font-bold text-amber-600 uppercase">Gordura</div>
                      <div className="text-lg font-bold text-amber-900">{analysisResult.fat}g</div>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <button 
                      onClick={() => setAnalysisResult(null)}
                      className="flex-1 rounded-2xl bg-zinc-100 py-4 font-bold text-zinc-600"
                    >
                      Editar
                    </button>
                    <button 
                      onClick={confirmEntry}
                      className="flex-[2] flex items-center justify-center gap-2 rounded-2xl bg-zinc-900 py-4 font-bold text-white shadow-lg"
                    >
                      <Check size={20} />
                      Registrar
                    </button>
                  </div>
                </motion.div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
