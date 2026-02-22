'use client';

import { useState, useEffect } from 'react';
import { DndContext, DragEndEvent, useDraggable, useDroppable, DragOverlay } from '@dnd-kit/core';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, startOfYear, endOfYear, eachMonthOfInterval, getYear, setYear, setMonth } from 'date-fns';
import { Plus, Calendar, Lightbulb, Clock, DollarSign, Shuffle, X, Upload, Heart, Sparkles, Moon, Sun, ChevronLeft, ChevronRight, Trash2, Settings } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTheme } from './providers';

interface Idea {
  id: string;
  title: string;
  description: string;
  duration: string;
  category: string;
  budget: number | null;
  imageUrl: string | null;
  scheduledAt: Date | null;
  isScheduled: boolean;
  color: string;
}

interface MonthlyBudget {
  year: number;
  month: number;
  budget: number;
}

const INITIAL_IDEAS: Idea[] = [
  { id: '1', title: '🌅 Desert Safari', description: 'Dune bashing and dinner under the stars', duration: '6 hours', category: 'adventure', budget: 300, imageUrl: null, scheduledAt: null, isScheduled: false, color: 'orange' },
  { id: '2', title: '🏙️ Burj Khalifa', description: 'Sunset at the top together', duration: '3 hours', category: 'sightseeing', budget: 150, imageUrl: null, scheduledAt: null, isScheduled: false, color: 'blue' },
  { id: '3', title: '🏖️ Beach Day', description: 'JBR Beach relaxation & swimming', duration: 'full day', category: 'chill', budget: 50, imageUrl: null, scheduledAt: null, isScheduled: false, color: 'cyan' },
];

const CATEGORIES = ['all', 'food', 'adventure', 'chill', 'sightseeing', 'romantic'];
const COLORS = ['rose', 'pink', 'purple', 'blue', 'cyan', 'teal', 'emerald', 'amber', 'orange', 'red'];

const CATEGORY_EMOJIS: { [key: string]: string } = {
  all: '✨', food: '🍽️', adventure: '🎢', chill: '😌', sightseeing: '📸', romantic: '💕'
};

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export default function CouplePlanner() {
  const { theme, toggleTheme } = useTheme();
  const [ideas, setIdeas] = useState<Idea[]>(INITIAL_IDEAS);
  const [currentDate, setCurrentDate] = useState(new Date(2026, 5, 1));
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showRandomModal, setShowRandomModal] = useState(false);
  const [showDayModal, setShowDayModal] = useState<Date | null>(null);
  const [showBudgetModal, setShowBudgetModal] = useState(false);
  const [randomPick, setRandomPick] = useState<Idea | null>(null);
  const [activeDragId, setActiveDragId] = useState<string | null>(null);
  const [monthlyBudgets, setMonthlyBudgets] = useState<MonthlyBudget[]>([]);
  const [newIdea, setNewIdea] = useState({ 
    title: '', description: '', duration: '', category: 'adventure', budget: ''
  });
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [tempBudget, setTempBudget] = useState('');

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });
  
  const yearStart = startOfYear(currentDate);
  const yearEnd = endOfYear(currentDate);
  const months = eachMonthOfInterval({ start: yearStart, end: yearEnd });

  const currentMonthBudget = monthlyBudgets.find(
    b => b.year === currentDate.getFullYear() && b.month === currentDate.getMonth()
  );

  const filteredIdeas = selectedCategory === 'all' 
    ? ideas.filter(i => !i.isScheduled)
    : ideas.filter(i => !i.isScheduled && i.category === selectedCategory);

  const scheduledThisMonth = ideas.filter(i => 
    i.isScheduled && i.scheduledAt && 
    i.scheduledAt.getMonth() === currentDate.getMonth() &&
    i.scheduledAt.getFullYear() === currentDate.getFullYear()
  );

  const spentThisMonth = scheduledThisMonth.reduce((sum, i) => sum + (i.budget || 0), 0);
  const remainingBudget = (currentMonthBudget?.budget || 0) - spentThisMonth;
  const isOverBudget = remainingBudget < 0;

  useEffect(() => {
    if (!currentMonthBudget && !showBudgetModal) {
      setShowBudgetModal(true);
    }
  }, [currentDate, currentMonthBudget]);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveDragId(null);
    
    if (over && over.id.toString().startsWith('day-')) {
      const dayIndex = parseInt(over.id.toString().replace('day-', ''));
      const date = days[dayIndex];
      setIdeas(ideas.map(idea => 
        idea.id === active.id 
          ? { ...idea, scheduledAt: date, isScheduled: true }
          : idea
      ));
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setPreviewImage(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const addIdea = () => {
    if (!newIdea.title) return;
    const idea: Idea = {
      id: Date.now().toString(),
      title: newIdea.title.startsWith('📍') || newIdea.title.startsWith('✨') ? newIdea.title : `✨ ${newIdea.title}`,
      description: newIdea.description,
      duration: newIdea.duration,
      category: newIdea.category,
      budget: newIdea.budget ? parseFloat(newIdea.budget) : null,
      imageUrl: previewImage,
      scheduledAt: null,
      isScheduled: false,
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
    };
    setIdeas([...ideas, idea]);
    setNewIdea({ title: '', description: '', duration: '', category: 'adventure', budget: '' });
    setPreviewImage(null);
    setShowAddModal(false);
  };

  const deleteIdea = (id: string) => {
    setIdeas(ideas.filter(i => i.id !== id));
  };

  const unscheduleIdea = (id: string) => {
    setIdeas(ideas.map(idea => 
      idea.id === id ? { ...idea, scheduledAt: null, isScheduled: false } : idea
    ));
  };

  const pickRandom = () => {
    const available = ideas.filter(i => !i.isScheduled);
    if (available.length > 0) {
      const random = available[Math.floor(Math.random() * available.length)];
      setRandomPick(random);
      setShowRandomModal(true);
    }
  };

  const setBudget = () => {
    const budget = parseFloat(tempBudget) || 0;
    const newBudgets = monthlyBudgets.filter(
      b => !(b.year === currentDate.getFullYear() && b.month === currentDate.getMonth())
    );
    newBudgets.push({
      year: currentDate.getFullYear(),
      month: currentDate.getMonth(),
      budget
    });
    setMonthlyBudgets(newBudgets);
    setShowBudgetModal(false);
    setTempBudget('');
  };

  const changeYear = (delta: number) => {
    setCurrentDate(setYear(currentDate, getYear(currentDate) + delta));
  };

  const selectMonth = (monthIndex: number) => {
    setCurrentDate(setMonth(currentDate, monthIndex));
  };

  const activeIdea = ideas.find(i => i.id === activeDragId);

  return (
    <div className="min-h-screen p-4 md:p-6">
      <div className="max-w-[1400px] mx-auto">
        {/* Header */}
        <header className="mb-6 text-center relative">
          <motion.button
            whileHover={{ scale: 1.1, rotate: 15 }}
            whileTap={{ scale: 0.9 }}
            onClick={toggleTheme}
            className="absolute right-0 top-0 p-3 rounded-full bg-card-bg border-2 border-border-custom shadow-lg"
          >
            {theme === 'dark' ? <Sun className="w-6 h-6 text-yellow-400" /> : <Moon className="w-6 h-6 text-purple-600" />}
          </motion.button>

          <motion.div 
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="inline-flex items-center gap-2 bg-card-bg backdrop-blur-md px-6 py-2 rounded-full shadow-lg mb-3 border-2 border-border-custom"
          >
            <Sparkles className="w-5 h-5 text-pink-500" />
            <span className="text-primary font-medium">Idea Calendar</span>
            <Sparkles className="w-5 h-5 text-pink-500" />
          </motion.div>
          
          <motion.h1 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-pink-500 via-purple-500 to-blue-500 bg-clip-text text-transparent mb-2"
          >
            A + A Adventure 💕
          </motion.h1>
          
          <motion.p 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-secondary text-lg mb-4 font-medium"
          >
            {format(currentDate, 'MMMM yyyy')}
          </motion.p>
          
          {/* Budget Card */}
          <motion.div 
            whileHover={{ scale: 1.02 }}
            className="inline-flex items-center gap-3 bg-card-bg backdrop-blur-md px-6 py-3 rounded-2xl shadow-xl border-2 border-border-custom cursor-pointer"
            onClick={() => setShowBudgetModal(true)}
          >
            <div className="bg-pink-100 dark:bg-pink-900 p-2 rounded-full">
              <DollarSign className="w-5 h-5 text-pink-600 dark:text-pink-300" />
            </div>
            <div className="text-left">
              <span className="text-secondary text-xs font-medium">Monthly Budget</span>
              <div className="flex items-baseline gap-2">
                <span className={`text-2xl font-bold ${isOverBudget ? 'text-red-500' : 'text-green-600 dark:text-green-400'}`}>
                  ${Math.abs(remainingBudget)}
                </span>
                <span className="text-secondary text-sm">/ ${currentMonthBudget?.budget || 0}</span>
                {isOverBudget && <span className="text-red-500 text-sm font-bold">OVER BUDGET!</span>}
              </div>
            </div>
            <Settings className="w-4 h-4 text-secondary ml-2" />
          </motion.div>
        </header>

        <DndContext 
          onDragEnd={handleDragEnd}
          onDragStart={(e) => setActiveDragId(e.active.id as string)}
        >
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
            
            {/* Section 1: Ideas */}
            <motion.div 
              initial={{ x: -50, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              className="bg-card-bg backdrop-blur-md rounded-3xl shadow-xl p-5 border-2 border-border-custom"
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-primary flex items-center gap-2">
                  <span className="bg-yellow-100 dark:bg-yellow-900 p-2 rounded-xl">💡</span>
                  <span className="bg-gradient-to-r from-pink-500 to-purple-500 bg-clip-text text-transparent">Our Ideas</span>
                </h2>
                <div className="flex gap-2">
                  <motion.button 
                    whileHover={{ scale: 1.1, rotate: 180 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={pickRandom}
                    className="bg-gradient-to-r from-purple-400 to-pink-400 text-white p-2 rounded-xl shadow-md"
                  >
                    <Shuffle className="w-4 h-4" />
                  </motion.button>
                  <motion.button 
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => setShowAddModal(true)}
                    className="bg-gradient-to-r from-pink-400 to-rose-400 text-white p-2 rounded-xl shadow-md"
                  >
                    <Plus className="w-4 h-4" />
                  </motion.button>
                </div>
              </div>

              <div className="flex flex-wrap gap-2 mb-4">
                {CATEGORIES.map(cat => (
                  <motion.button
                    key={cat}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                      selectedCategory === cat 
                        ? 'bg-gradient-to-r from-pink-400 to-purple-400 text-white shadow-md' 
                        : 'bg-pink-50 dark:bg-purple-900/30 text-pink-600 dark:text-pink-300 border border-border-custom'
                    }`}
                  >
                    {CATEGORY_EMOJIS[cat]} {cat}
                  </motion.button>
                ))}
              </div>

              <div className="space-y-3 max-h-[400px] overflow-y-auto pr-1">
                <AnimatePresence>
                  {filteredIdeas.map(idea => (
                    <DraggableIdea key={idea.id} idea={idea} onDelete={deleteIdea} />
                  ))}
                </AnimatePresence>
                {filteredIdeas.length === 0 && (
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-center py-6 bg-pink-50/50 dark:bg-purple-900/20 rounded-2xl border-2 border-dashed border-border-custom"
                  >
                    <span className="text-3xl mb-2 block">✨</span>
                    <p className="text-secondary text-sm">No ideas yet! Add some 💕</p>
                  </motion.div>
                )}
              </div>
            </motion.div>

            {/* Section 2: Calendar */}
            <motion.div 
              initial={{ y: 50, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              className="lg:col-span-2 bg-card-bg backdrop-blur-md rounded-3xl shadow-xl p-5 border-2 border-border-custom"
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-primary flex items-center gap-2">
                  <span className="bg-purple-100 dark:bg-purple-900 p-2 rounded-xl">📅</span>
                  <span className="bg-gradient-to-r from-purple-500 to-blue-500 bg-clip-text text-transparent">
                    {format(currentDate, 'MMMM yyyy')}
                  </span>
                </h2>
                <span className="text-xs text-secondary bg-card-bg px-3 py-1 rounded-full border border-border-custom">
                  Click day to view 💕
                </span>
              </div>

              <div className="grid grid-cols-7 gap-2">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                  <div key={day} className="text-center text-xs font-bold text-secondary py-2 bg-pink-50/50 dark:bg-purple-900/20 rounded-lg">
                    {day}
                  </div>
                ))}
                
                {days.map((day, idx) => {
                  const dayIdeas = ideas.filter(i => i.scheduledAt && isSameDay(i.scheduledAt, day));
                  const isWeekend = day.getDay() === 0 || day.getDay() === 6;
                  const hasActivities = dayIdeas.length > 0;
                  
                  return (
                    <DroppableDay 
                      key={day.toISOString()} 
                      day={day} 
                      index={idx}
                      ideas={dayIdeas}
                      onUnschedule={unscheduleIdea}
                      isWeekend={isWeekend}
                      hasActivities={hasActivities}
                      onClick={() => setShowDayModal(day)}
                    />
                  );
                })}
              </div>
            </motion.div>

            {/* Section 3: Year/Month Selector */}
            <motion.div 
              initial={{ x: 50, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              className="bg-card-bg backdrop-blur-md rounded-3xl shadow-xl p-5 border-2 border-border-custom"
            >
              <div className="flex items-center justify-between mb-4">
                <motion.button 
                  whileHover={{ scale: 1.2 }}
                  whileTap={{ scale: 0.8 }}
                  onClick={() => changeYear(-1)}
                  className="p-2 rounded-full bg-pink-100 dark:bg-purple-900 text-pink-600 dark:text-pink-300"
                >
                  <ChevronLeft className="w-5 h-5" />
                </motion.button>
                <h2 className="text-xl font-bold text-primary">{getYear(currentDate)}</h2>
                <motion.button 
                  whileHover={{ scale: 1.2 }}
                  whileTap={{ scale: 0.8 }}
                  onClick={() => changeYear(1)}
                  className="p-2 rounded-full bg-pink-100 dark:bg-purple-900 text-pink-600 dark:text-pink-300"
                >
                  <ChevronRight className="w-5 h-5" />
                </motion.button>
              </div>

              <div className="grid grid-cols-3 gap-2">
                {MONTH_NAMES.map((month, idx) => {
                  const isSelected = idx === currentDate.getMonth();
                  const monthDate = new Date(currentDate.getFullYear(), idx, 1);
                  const hasActivities = ideas.some(i => 
                    i.scheduledAt && 
                    i.scheduledAt.getMonth() === idx && 
                    i.scheduledAt.getFullYear() === currentDate.getFullYear()
                  );
                  
                  return (
                    <motion.button
                      key={month}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => selectMonth(idx)}
                      className={`p-3 rounded-xl text-sm font-medium transition-all relative ${
                        isSelected
                          ? 'bg-gradient-to-r from-pink-400 to-purple-400 text-white shadow-lg'
                          : 'bg-pink-50 dark:bg-purple-900/30 text-secondary hover:bg-pink-100 dark:hover:bg-purple-900/50'
                      }`}
                    >
                      {month}
                      {hasActivities && !isSelected && (
                        <span className="absolute top-1 right-1 w-2 h-2 bg-pink-500 rounded-full" />
                      )}
                    </motion.button>
                  );
                })}
              </div>

              <div className="mt-6 p-4 bg-pink-50 dark:bg-purple-900/20 rounded-2xl border border-border-custom">
                <h3 className="text-sm font-bold text-primary mb-2 flex items-center gap-2">
                  <Heart className="w-4 h-4 text-pink-500 fill-pink-500" />
                  This Month
                </h3>
                <div className="space-y-2 text-xs text-secondary">
                  <div className="flex justify-between">
                    <span>Activities:</span>
                    <span className="font-bold text-primary">{scheduledThisMonth.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Spent:</span>
                    <span className="font-bold text-primary">${spentThisMonth}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Remaining:</span>
                    <span className={`font-bold ${remainingBudget < 0 ? 'text-red-500' : 'text-green-600'}`}>
                      ${remainingBudget}
                    </span>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>

          <DragOverlay>
            {activeIdea ? (
              <motion.div 
                initial={{ scale: 1.1 }}
                className="p-4 bg-white dark:bg-purple-800 border-2 border-pink-400 rounded-2xl shadow-2xl opacity-90 rotate-3"
              >
                <p className="font-bold text-primary">{activeIdea.title}</p>
                <p className="text-xs text-secondary">{activeIdea.duration}</p>
              </motion.div>
            ) : null}
          </DragOverlay>
        </DndContext>

        {/* Add Idea Modal */}
        <AnimatePresence>
          {showAddModal && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50"
            >
              <motion.div 
                initial={{ scale: 0.8, y: 50 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.8, y: 50 }}
                className="bg-card-bg rounded-3xl p-6 w-full max-w-md shadow-2xl border-4 border-border-custom max-h-[90vh] overflow-y-auto"
              >
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-xl font-bold text-primary flex items-center gap-2">
                    <Sparkles className="w-6 h-6 text-pink-500" />
                    New Idea 💡
                  </h3>
                  <motion.button 
                    whileHover={{ scale: 1.1, rotate: 90 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => setShowAddModal(false)} 
                    className="text-secondary hover:text-pink-500 bg-pink-50 dark:bg-purple-900 p-2 rounded-full"
                  >
                    <X className="w-5 h-5" />
                  </motion.button>
                </div>
                
                <div className="space-y-4">
                  <motion.div 
                    whileHover={{ scale: 1.02 }}
                    className="border-3 border-dashed border-border-custom rounded-2xl p-6 text-center hover:border-pink-400 transition-all cursor-pointer group bg-pink-50/30 dark:bg-purple-900/20"
                  >
                    {previewImage ? (
                      <div className="relative">
                        <img src={previewImage} alt="Preview" className="w-full h-40 object-cover rounded-xl shadow-md" />
                        <motion.button 
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                          onClick={() => setPreviewImage(null)}
                          className="absolute top-2 right-2 bg-red-400 text-white p-2 rounded-full hover:bg-red-500 shadow-lg"
                        >
                          <X className="w-4 h-4" />
                        </motion.button>
                      </div>
                    ) : (
                      <label className="cursor-pointer block">
                        <motion.div 
                          whileHover={{ scale: 1.1 }}
                          className="bg-pink-100 dark:bg-purple-900 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-3"
                        >
                          <Upload className="w-8 h-8 text-pink-500" />
                        </motion.div>
                        <span className="text-pink-600 font-medium">Add a cute photo 📸</span>
                        <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                      </label>
                    )}
                  </motion.div>

                  <input
                    type="text"
                    placeholder="What should we do together? 💕"
                    className="w-full p-4 border-2 border-border-custom rounded-2xl focus:outline-none focus:border-pink-400 bg-transparent text-primary placeholder-secondary"
                    value={newIdea.title}
                    onChange={e => setNewIdea({...newIdea, title: e.target.value})}
                  />
                  <textarea
                    placeholder="Tell me more about it... ✨"
                    className="w-full p-4 border-2 border-border-custom rounded-2xl focus:outline-none focus:border-pink-400 h-24 resize-none bg-transparent text-primary placeholder-secondary"
                    value={newIdea.description}
                    onChange={e => setNewIdea({...newIdea, description: e.target.value})}
                  />
                  <div className="grid grid-cols-2 gap-3">
                    <select
                      className="p-4 border-2 border-border-custom rounded-2xl focus:outline-none focus:border-purple-400 bg-transparent text-primary"
                      value={newIdea.duration}
                      onChange={e => setNewIdea({...newIdea, duration: e.target.value})}
                    >
                      <option value="">⏰ Duration</option>
                      <option value="1-2 hours">✨ 1-2 hours</option>
                      <option value="Half day">🌅 Half day</option>
                      <option value="Full day">☀️ Full day</option>
                      <option value="Evening">🌙 Evening</option>
                    </select>
                    <select
                      className="p-4 border-2 border-border-custom rounded-2xl focus:outline-none focus:border-purple-400 bg-transparent text-primary"
                      value={newIdea.category}
                      onChange={e => setNewIdea({...newIdea, category: e.target.value})}
                    >
                      {CATEGORIES.filter(c => c !== 'all').map(c => (
                        <option key={c} value={c}>{CATEGORY_EMOJIS[c]} {c}</option>
                      ))}
                    </select>
                  </div>
                  <div className="relative">
                    <DollarSign className="absolute left-4 top-4 w-5 h-5 text-pink-400" />
                    <input
                      type="number"
                      placeholder="Budget (AED) 💰"
                      className="w-full p-4 pl-12 border-2 border-border-custom rounded-2xl focus:outline-none focus:border-pink-400 bg-transparent text-primary"
                      value={newIdea.budget}
                      onChange={e => setNewIdea({...newIdea, budget: e.target.value})}
                    />
                  </div>
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={addIdea}
                    className="w-full p-4 bg-gradient-to-r from-pink-400 via-purple-400 to-blue-400 text-white rounded-2xl font-bold text-lg shadow-lg"
                  >
                    Add to Our List 💕
                  </motion.button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Day View Modal */}
        <AnimatePresence>
          {showDayModal && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center p-4 z-50"
              onClick={() => setShowDayModal(null)}
            >
              <motion.div 
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.8, opacity: 0 }}
                className="bg-card-bg rounded-3xl p-6 w-full max-w-lg shadow-2xl border-4 border-border-custom max-h-[80vh] overflow-y-auto"
                onClick={e => e.stopPropagation()}
              >
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-2xl font-bold bg-gradient-to-r from-pink-500 to-purple-500 bg-clip-text text-transparent">
                    {format(showDayModal, 'EEEE, MMMM do')}
                  </h3>
                  <motion.button 
                    whileHover={{ scale: 1.1, rotate: 90 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => setShowDayModal(null)}
                    className="text-secondary hover:text-pink-500 bg-pink-50 dark:bg-purple-900 p-2 rounded-full"
                  >
                    <X className="w-5 h-5" />
                  </motion.button>
                </div>

                <div className="space-y-3">
                  {ideas.filter(i => i.scheduledAt && isSameDay(i.scheduledAt, showDayModal)).map(idea => (
                    <motion.div 
                      key={idea.id}
                      initial={{ x: -20, opacity: 0 }}
                      animate={{ x: 0, opacity: 1 }}
                      className="p-4 bg-pink-50 dark:bg-purple-900/30 rounded-2xl border-2 border-border-custom flex justify-between items-center"
                    >
                      <div>
                        <h4 className="font-bold text-primary">{idea.title}</h4>
                        <p className="text-sm text-secondary">{idea.description}</p>
                        <div className="flex gap-2 mt-2 text-xs text-secondary">
                          <span>⏰ {idea.duration}</span>
                          {idea.budget && <span>💰 ${idea.budget}</span>}
                        </div>
                      </div>
                      <motion.button
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={() => unscheduleIdea(idea.id)}
                        className="p-2 bg-red-100 dark:bg-red-900 text-red-500 rounded-full"
                      >
                        <Trash2 className="w-4 h-4" />
                      </motion.button>
                    </motion.div>
                  ))}
                  
                  {ideas.filter(i => i.scheduledAt && isSameDay(i.scheduledAt, showDayModal)).length === 0 && (
                    <div className="text-center py-8 text-secondary">
                      <span className="text-4xl mb-2 block">🌸</span>
                      <p>No plans yet! Drag ideas from the left 💕</p>
                    </div>
                  )}
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Budget Modal */}
        <AnimatePresence>
          {showBudgetModal && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center p-4 z-50"
            >
              <motion.div 
                initial={{ scale: 0.8, y: 50 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.8, y: 50 }}
                className="bg-card-bg rounded-3xl p-6 w-full max-w-md shadow-2xl border-4 border-border-custom text-center"
              >
                <div className="text-6xl mb-4">💰</div>
                <h3 className="text-2xl font-bold text-primary mb-2">Set Budget for {format(currentDate, 'MMMM yyyy')}</h3>
                <p className="text-secondary mb-4">How much are we planning to spend this month?</p>
                
                <input
                  type="number"
                  placeholder="Enter amount (AED)"
                  className="w-full p-4 border-2 border-border-custom rounded-2xl focus:outline-none focus:border-pink-400 text-center text-2xl font-bold bg-transparent text-primary mb-4"
                  value={tempBudget}
                  onChange={e => setTempBudget(e.target.value)}
                  autoFocus
                />
                
                <div className="flex gap-3">
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setShowBudgetModal(false)}
                    className="flex-1 p-3 border-2 border-border-custom rounded-2xl text-secondary font-medium"
                  >
                    Skip for now
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={setBudget}
                    className="flex-1 p-3 bg-gradient-to-r from-pink-400 to-purple-400 text-white rounded-2xl font-bold"
                  >
                    Set Budget 💕
                  </motion.button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Random Picker Modal */}
        <AnimatePresence>
          {showRandomModal && randomPick && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center p-4 z-50"
            >
              <motion.div 
                initial={{ scale: 0.5, rotate: -10 }}
                animate={{ scale: 1, rotate: 0 }}
                exit={{ scale: 0.5, rotate: 10 }}
                transition={{ type: "spring", stiffness: 200, damping: 15 }}
                className="bg-card-bg rounded-3xl p-8 w-full max-w-md shadow-2xl border-4 border-border-custom text-center"
              >
                <motion.div 
                  animate={{ rotate: [0, 10, -10, 0] }}
                  transition={{ repeat: Infinity, duration: 0.5 }}
                  className="text-6xl mb-4"
                >
                  🎲
                </motion.div>
                <h3 className="text-2xl font-bold text-purple-600 mb-2">The universe says...</h3>
                <motion.div 
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.3 }}
                  className="p-6 rounded-2xl bg-gradient-to-br from-pink-50 to-purple-50 dark:from-purple-900/30 dark:to-pink-900/30 border-2 border-border-custom mb-6"
                >
                  {randomPick.imageUrl && (
                    <img src={randomPick.imageUrl} alt="" className="w-full h-32 object-cover rounded-xl mb-4 shadow-md" />
                  )}
                  <h4 className="text-xl font-bold text-primary mb-2">{randomPick.title}</h4>
                  <p className="text-secondary mb-3">{randomPick.description}</p>
                  <div className="flex justify-center gap-4 text-sm text-secondary">
                    <span>⏰ {randomPick.duration}</span>
                    {randomPick.budget && <span>💰 ${randomPick.budget}</span>}
                  </div>
                </motion.div>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setShowRandomModal(false)}
                  className="px-8 py-3 bg-gradient-to-r from-pink-400 to-purple-400 text-white rounded-full font-bold shadow-lg"
                >
                  Yay! Let's do it! 🎉
                </motion.button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

function DraggableIdea({ idea, onDelete }: { idea: Idea; onDelete: (id: string) => void }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: idea.id,
  });

  const style = transform ? {
    transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
  } : undefined;

  return (
    <motion.div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.8 }}
      whileHover={{ scale: 1.02, y: -2 }}
      className={`p-3 bg-white dark:bg-purple-900/40 border-l-4 border-pink-400 rounded-2xl cursor-move shadow-md hover:shadow-xl transition-all ${isDragging ? 'opacity-50 rotate-3 scale-105' : ''}`}
    >
      <div className="flex justify-between items-start">
        <div className="flex-1">
          {idea.imageUrl && (
            <img src={idea.imageUrl} alt="" className="w-full h-16 object-cover rounded-lg mb-2" />
          )}
          <h3 className="font-bold text-primary text-sm">{idea.title}</h3>
          <div className="flex items-center justify-between mt-1 text-xs text-secondary">
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {idea.duration || 'TBD'}
            </span>
            {idea.budget && <span className="text-pink-500 font-bold">${idea.budget}</span>}
          </div>
        </div>
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={(e) => { e.stopPropagation(); onDelete(idea.id); }}
          className="ml-2 p-1 text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-full"
        >
          <Trash2 className="w-4 h-4" />
        </motion.button>
      </div>
    </motion.div>
  );
}

function DroppableDay({ day, index, ideas, onUnschedule, isWeekend, hasActivities, onClick }: { 
  day: Date; 
  index: number; 
  ideas: Idea[];
  onUnschedule: (id: string) => void;
  isWeekend: boolean;
  hasActivities: boolean;
  onClick: () => void;
}) {
  const { isOver, setNodeRef } = useDroppable({
    id: `day-${index}`,
  });

  return (
    <motion.div
      ref={setNodeRef}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      onClick={onClick}
      className={`min-h-[80px] p-2 rounded-xl border-2 cursor-pointer transition-all ${isWeekend ? 'bg-pink-50/30 dark:bg-purple-900/20' : 'bg-white/40 dark:bg-purple-900/10'} ${isOver ? 'border-pink-400 bg-pink-100 dark:bg-purple-800 scale-105 shadow-lg' : hasActivities ? 'border-pink-300 dark:border-purple-500' : 'border-border-custom hover:border-pink-300'}`}
    >
      <div className={`text-sm font-bold mb-1 ${isWeekend ? 'text-pink-500' : 'text-primary'}`}>{format(day, 'd')}</div>
      <div className="space-y-1">
        {ideas.slice(0, 2).map(idea => (
          <div key={idea.id} className="text-[10px] p-1 rounded bg-pink-100 dark:bg-purple-800 text-pink-700 dark:text-pink-200 truncate">
            {idea.title}
          </div>
        ))}
        {ideas.length > 2 && (
          <div className="text-[10px] text-center text-pink-500 font-bold">+{ideas.length - 2} more</div>
        )}
      </div>
    </motion.div>
  );
}