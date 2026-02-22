'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { DndContext, DragEndEvent, useDraggable, useDroppable, DragOverlay, PointerSensor, useSensor, useSensors, DragStartEvent } from '@dnd-kit/core';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, startOfYear, endOfYear, eachMonthOfInterval, getYear, setYear, setMonth, addMinutes, setHours, setMinutes, isSameMonth } from 'date-fns';
import { Plus, Calendar, Lightbulb, Clock, DollarSign, Shuffle, X, Upload, Sparkles, Moon, Sun, ChevronLeft, ChevronRight, Trash2, Settings, Download, Users, Gamepad2, Volleyball, ShoppingBag, Drama, Dumbbell, BookOpen, Wine, TreePine, Landmark } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTheme, EMOJIS } from './providers';
import * as XLSX from 'xlsx';

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
  author: 'AY' | 'AK';
  startTime?: string;
  endTime?: string;
}

interface MonthlyBudget {
  year: number;
  month: number;
  budget: number;
}

const INITIAL_IDEAS: Idea[] = [
  { id: '1', title: '🌅 Desert Safari', description: 'Dune bashing and dinner under the stars', duration: '6 hours', category: 'adventure', budget: 300, imageUrl: null, scheduledAt: null, isScheduled: false, color: 'orange', author: 'AY' },
  { id: '2', title: '🏙️ Burj Khalifa', description: 'Sunset at the top together', duration: '3 hours', category: 'sightseeing', budget: 150, imageUrl: null, scheduledAt: null, isScheduled: false, color: 'blue', author: 'AK' },
  { id: '3', title: '🏖️ Beach Day', description: 'JBR Beach relaxation & swimming', duration: 'full day', category: 'chill', budget: 50, imageUrl: null, scheduledAt: null, isScheduled: false, color: 'cyan', author: 'AY' },
];

const CATEGORIES = [
  { id: 'all', emoji: '✨', label: 'all' },
  { id: 'food', emoji: '🍽️', label: 'food' },
  { id: 'adventure', emoji: '🎢', label: 'adventure' },
  { id: 'chill', emoji: '😌', label: 'chill' },
  { id: 'sightseeing', emoji: '📸', label: 'sightseeing' },
  { id: 'romantic', emoji: '💕', label: 'romantic' },
  { id: 'gaming', emoji: '🎮', label: 'gaming' },
  { id: 'sports', emoji: '🏐', label: 'sports' },
  { id: 'shopping', emoji: '🛍️', label: 'shopping' },
  { id: 'entertainment', emoji: '🎭', label: 'entertainment' },
  { id: 'fitness', emoji: '🏋️', label: 'fitness' },
  { id: 'learning', emoji: '📚', label: 'learning' },
  { id: 'nightlife', emoji: '🍷', label: 'nightlife' },
  { id: 'nature', emoji: '🌳', label: 'nature' },
  { id: 'culture', emoji: '🏛️', label: 'culture' },
];

const COLORS = ['rose', 'pink', 'purple', 'blue', 'cyan', 'teal', 'emerald', 'amber', 'orange', 'red'];
const AUTHOR_COLORS = { AY: 'bg-pink-500', AK: 'bg-purple-500' };
const AUTHOR_BG_COLORS = { AY: 'bg-pink-100', AK: 'bg-purple-100' };
const AUTHOR_TEXT_COLORS = { AY: 'text-pink-700', AK: 'text-purple-700' };
const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// Generate 30-minute time slots from 00:00 to 23:30
const TIME_SLOTS = Array.from({ length: 48 }, (_, i) => {
  const hour = Math.floor(i / 2);
  const minute = (i % 2) * 30;
  return `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
});

// Get time period for coloring
const getTimePeriod = (time: string): 'night' | 'morning' | 'afternoon' | 'evening' => {
  const hour = parseInt(time.split(':')[0]);
  if (hour < 6) return 'night';
  if (hour < 12) return 'morning';
  if (hour < 18) return 'afternoon';
  if (hour < 22) return 'evening';
  return 'night';
};

export default function CouplePlanner() {
  const { theme, toggleTheme, author, toggleAuthor } = useTheme();
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
  const [randomEmoji, setRandomEmoji] = useState('✨');
  const calendarRef = useRef<HTMLDivElement>(null);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

  // Custom sensor for better drag detection
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  useEffect(() => {
    setRandomEmoji(EMOJIS[Math.floor(Math.random() * EMOJIS.length)]);
  }, []);

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });
  
  const yearStart = startOfYear(currentDate);
  const yearEnd = endOfYear(currentDate);

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
  const totalBudget = currentMonthBudget?.budget || 0;
  const remainingBudget = totalBudget - spentThisMonth;
  const isOverBudget = remainingBudget < 0;

  // Track mouse position for accurate drag overlay
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePosition({ x: e.clientX, y: e.clientY });
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  const handleDragStart = (event: DragStartEvent) => {
    setActiveDragId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveDragId(null);
    
    if (!over) return;

    // Dropping on calendar day
    if (over.id.toString().startsWith('day-')) {
      const dayIndex = parseInt(over.id.toString().replace('day-', ''));
      const date = days[dayIndex];
      
      // If day modal is open, don't schedule to calendar, only to timeline
      if (showDayModal && isSameDay(date, showDayModal)) {
        return;
      }
      
      setIdeas(ideas.map(idea => 
        idea.id === active.id 
          ? { ...idea, scheduledAt: date, isScheduled: true, author }
          : idea
      ));
    }
    
    // Dropping on timeline time slot
    if (over.id.toString().startsWith('time-')) {
      const timeIndex = parseInt(over.id.toString().replace('time-', ''));
      const startTime = TIME_SLOTS[timeIndex];
      
      // Calculate end time based on duration
      const draggedIdea = ideas.find(i => i.id === active.id);
      let durationMinutes = 120; // default 2 hours
      
      if (draggedIdea?.duration) {
        if (draggedIdea.duration.includes('1-2 hours')) durationMinutes = 90;
        else if (draggedIdea.duration.includes('Half day')) durationMinutes = 240;
        else if (draggedIdea.duration.includes('Full day')) durationMinutes = 480;
        else if (draggedIdea.duration.includes('Evening')) durationMinutes = 180;
      }
      
      const [startHour, startMin] = startTime.split(':').map(Number);
      const endTotalMinutes = startHour * 60 + startMin + durationMinutes;
      const endHour = Math.floor(endTotalMinutes / 60) % 24;
      const endMin = endTotalMinutes % 60;
      const endTime = `${endHour.toString().padStart(2, '0')}:${endMin.toString().padStart(2, '0')}`;
      
      setIdeas(ideas.map(idea => {
        if (idea.id === active.id) {
          return { 
            ...idea, 
            scheduledAt: showDayModal, 
            isScheduled: true, 
            author,
            startTime,
            endTime
          };
        }
        return idea;
      }));
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
      author,
    };
    setIdeas([...ideas, idea]);
    setNewIdea({ title: '', description: '', duration: '', category: 'adventure', budget: '' });
    setPreviewImage(null);
    setShowAddModal(false);
  };

  // FIXED: Delete with stop propagation to prevent drag
  const deleteIdea = useCallback((id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    e?.preventDefault();
    setIdeas(prev => prev.filter(i => i.id !== id));
  }, []);

  const unscheduleIdea = useCallback((id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    e?.preventDefault();
    setIdeas(prev => prev.map(idea => 
      idea.id === id ? { ...idea, scheduledAt: null, isScheduled: false, startTime: undefined, endTime: undefined } : idea
    ));
  }, []);

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

  // Excel Export
  const exportToExcel = (type: 'month' | 'day') => {
    const exportData: any[] = [];
    
    if (type === 'month') {
      // Get all scheduled activities for current month
      const monthActivities = ideas
        .filter(i => i.isScheduled && i.scheduledAt && isSameMonth(i.scheduledAt, currentDate))
        .sort((a, b) => {
          if (!a.scheduledAt || !b.scheduledAt) return 0;
          const dateCompare = a.scheduledAt.getTime() - b.scheduledAt.getTime();
          if (dateCompare !== 0) return dateCompare;
          return (a.startTime || '00:00').localeCompare(b.startTime || '00:00');
        });

      monthActivities.forEach(idea => {
        exportData.push({
          'Date': idea.scheduledAt ? format(idea.scheduledAt, 'MMM dd, yyyy') : '',
          'Time': idea.startTime && idea.endTime ? `${idea.startTime} - ${idea.endTime}` : 'All day',
          'Activity': idea.title.replace(/^[^\w\s]/, '').trim(), // Remove emoji prefix for cleaner look
          'Category': CATEGORIES.find(c => c.id === idea.category)?.label || idea.category,
          'Budget (AED)': idea.budget || 0,
          'Planned By': idea.author,
          'Description': idea.description || ''
        });
      });

      // Add summary row
      exportData.push({
        'Date': '',
        'Time': '',
        'Activity': 'TOTAL',
        'Category': '',
        'Budget (AED)': monthActivities.reduce((sum, i) => sum + (i.budget || 0), 0),
        'Planned By': '',
        'Description': ''
      });

    } else if (showDayModal && type === 'day') {
      const dayActivities = ideas
        .filter(i => i.isScheduled && i.scheduledAt && isSameDay(i.scheduledAt, showDayModal))
        .sort((a, b) => (a.startTime || '00:00').localeCompare(b.startTime || '00:00'));

      dayActivities.forEach(idea => {
        exportData.push({
          'Time': idea.startTime && idea.endTime ? `${idea.startTime} - ${idea.endTime}` : 'All day',
          'Activity': idea.title.replace(/^[^\w\s]/, '').trim(),
          'Category': CATEGORIES.find(c => c.id === idea.category)?.label || idea.category,
          'Budget (AED)': idea.budget || 0,
          'Planned By': idea.author,
          'Description': idea.description || ''
        });
      });

      exportData.push({
        'Time': '',
        'Activity': 'TOTAL',
        'Category': '',
        'Budget (AED)': dayActivities.reduce((sum, i) => sum + (i.budget || 0), 0),
        'Planned By': '',
        'Description': ''
      });
    }

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Activities');
    
    const fileName = type === 'month' 
      ? `A-A-Adventure-${format(currentDate, 'MMMM-yyyy')}.xlsx`
      : `A-A-Adventure-${format(showDayModal!, 'MMMM-do-yyyy')}.xlsx`;
    
    XLSX.writeFile(wb, fileName);
  };

  const activeIdea = ideas.find(i => i.id === activeDragId);

  return (
    <div className="min-h-screen p-4 md:p-6">
      <div className="max-w-[1400px] mx-auto">
        {/* Header */}
        <header className="mb-6 text-center relative">
          <div className="absolute right-0 top-0 flex gap-2">
            <motion.button
              whileHover={{ scale: 1.1, rotate: 15 }}
              whileTap={{ scale: 0.9 }}
              onClick={toggleTheme}
              className="p-3 rounded-full bg-card-bg border-2 border-border-custom shadow-lg"
            >
              {theme === 'dark' ? <Sun className="w-6 h-6 text-yellow-400" /> : <Moon className="w-6 h-6 text-purple-600" />}
            </motion.button>
          </div>

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
            A + A Adventure {randomEmoji}
          </motion.h1>
          
          <motion.p 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-secondary text-lg mb-4 font-medium"
          >
            {format(currentDate, 'MMMM yyyy')}
          </motion.p>
          
          {/* Budget & Author Toggle */}
          <div className="flex justify-center gap-4 flex-wrap">
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
                  <span className="text-2xl font-bold text-primary">
                    ${totalBudget}
                  </span>
                  <span className="text-secondary text-sm">/</span>
                  <span className={`text-2xl font-bold ${isOverBudget ? 'text-red-500' : 'text-green-600 dark:text-green-400'}`}>
                    {isOverBudget ? <span className="flex items-center gap-1">🔻 ${Math.abs(remainingBudget)}</span> : `$${remainingBudget}`}
                  </span>
                </div>
              </div>
              <Settings className="w-4 h-4 text-secondary" />
            </motion.div>

            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={toggleAuthor}
              className="inline-flex items-center gap-3 bg-card-bg backdrop-blur-md px-6 py-3 rounded-2xl shadow-xl border-2 border-border-custom"
            >
              <Users className="w-5 h-5 text-purple-500" />
              <div className="text-left">
                <span className="text-secondary text-xs font-medium">Planning as</span>
                <div className="flex items-center gap-2">
                  <span className={`w-3 h-3 rounded-full ${AUTHOR_COLORS[author]}`} />
                  <span className="font-bold text-primary">{author}</span>
                </div>
              </div>
            </motion.button>
          </div>
        </header>

        <DndContext 
          sensors={sensors}
          onDragEnd={handleDragEnd}
          onDragStart={handleDragStart}
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

              <div className="flex flex-wrap gap-1.5 mb-4 max-h-[120px] overflow-y-auto">
                {CATEGORIES.map(cat => (
                  <motion.button
                    key={cat.id}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setSelectedCategory(cat.id)}
                    className={`px-2 py-1 rounded-full text-[10px] font-medium transition-all ${
                      selectedCategory === cat.id 
                        ? 'bg-gradient-to-r from-pink-400 to-purple-400 text-white shadow-md' 
                        : 'bg-pink-50 dark:bg-purple-900/30 text-pink-600 dark:text-pink-300 border border-border-custom'
                    }`}
                  >
                    {cat.emoji} {cat.label}
                  </motion.button>
                ))}
              </div>

              <div className="space-y-3 max-h-[350px] overflow-y-auto pr-1">
                <AnimatePresence>
                  {filteredIdeas.map(idea => (
                    <IdeaCard key={idea.id} idea={idea} onDelete={deleteIdea} />
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
              ref={calendarRef}
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
                <div className="flex gap-2">
                  <motion.button 
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => exportToExcel('month')}
                    className="flex items-center gap-2 px-3 py-1.5 bg-green-100 dark:bg-green-900 text-green-600 dark:text-green-300 rounded-full text-sm font-medium"
                  >
                    <Download className="w-4 h-4" />
                    Export Month
                  </motion.button>
                  <span className="text-xs text-secondary bg-card-bg px-3 py-1 rounded-full border border-border-custom flex items-center">
                    Click day to plan ⏰
                  </span>
                </div>
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
                    <CalendarDay 
                      key={day.toISOString()} 
                      day={day} 
                      index={idx}
                      ideas={dayIdeas}
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
                  <span className="text-pink-500">📊</span>
                  This Month
                </h3>
                <div className="space-y-2 text-xs text-secondary">
                  <div className="flex justify-between">
                    <span>Activities:</span>
                    <span className="font-bold text-primary">{scheduledThisMonth.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Planned by AY:</span>
                    <span className="font-bold text-pink-500">
                      {scheduledThisMonth.filter(i => i.author === 'AY').length}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Planned by AK:</span>
                    <span className="font-bold text-purple-500">
                      {scheduledThisMonth.filter(i => i.author === 'AK').length}
                    </span>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>

          {/* FIXED: Drag overlay that follows cursor accurately */}
          <DragOverlay dropAnimation={null}>
            {activeIdea ? (
              <div 
                className="p-4 bg-white dark:bg-purple-800 border-2 border-pink-400 rounded-2xl shadow-2xl opacity-90 pointer-events-none"
                style={{
                  position: 'fixed',
                  left: mousePosition.x - 60,
                  top: mousePosition.y - 40,
                  transform: 'translate(0, 0)',
                  zIndex: 9999,
                }}
              >
                <p className="font-bold text-primary text-sm">{activeIdea.title}</p>
                <p className="text-xs text-secondary">{activeIdea.duration}</p>
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>

        {/* Day Schedule Modal with Horizontal Timeline */}
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
                className="bg-card-bg rounded-3xl p-6 w-full max-w-5xl shadow-2xl border-4 border-border-custom max-h-[90vh] overflow-hidden flex flex-col"
                onClick={e => e.stopPropagation()}
              >
                <div className="flex justify-between items-center mb-4">
                  <div>
                    <h3 className="text-2xl font-bold bg-gradient-to-r from-pink-500 to-purple-500 bg-clip-text text-transparent">
                      {format(showDayModal, 'EEEE, MMMM do')}
                    </h3>
                    <p className="text-sm text-secondary">Drag ideas to timeline to schedule ⏰ (30-min snap)</p>
                  </div>
                  <div className="flex gap-2">
                    <motion.button 
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      onClick={() => exportToExcel('day')}
                      className="p-2 bg-green-100 dark:bg-green-900 text-green-600 rounded-full"
                    >
                      <Download className="w-5 h-5" />
                    </motion.button>
                    <motion.button 
                      whileHover={{ scale: 1.1, rotate: 90 }}
                      whileTap={{ scale: 0.9 }}
                      onClick={() => setShowDayModal(null)}
                      className="p-2 bg-pink-100 dark:bg-pink-900 text-pink-600 rounded-full"
                    >
                      <X className="w-5 h-5" />
                    </motion.button>
                  </div>
                </div>

                {/* Horizontal Timeline */}
                <DndContext 
                  sensors={sensors}
                  onDragEnd={handleDragEnd}
                  onDragStart={handleDragStart}
                >
                  <div className="flex-1 overflow-y-auto pr-2 space-y-2">
                    {/* Time period labels */}
                    <div className="flex gap-1 text-xs font-bold text-secondary mb-2">
                      <div className="w-20" /> {/* Spacer for time column */}
                      <div className="flex-1 flex">
                        <div className="flex-1 text-center bg-yellow-100 dark:bg-yellow-900/30 rounded-lg py-1 text-yellow-700 dark:text-yellow-300">🌙 Night (00-06)</div>
                        <div className="flex-1 text-center bg-orange-100 dark:bg-orange-900/30 rounded-lg py-1 text-orange-700 dark:text-orange-300">🌅 Morning (06-12)</div>
                        <div className="flex-1 text-center bg-blue-100 dark:bg-blue-900/30 rounded-lg py-1 text-blue-700 dark:text-blue-300">☀️ Afternoon (12-18)</div>
                        <div className="flex-1 text-center bg-purple-100 dark:bg-purple-900/30 rounded-lg py-1 text-purple-700 dark:text-purple-300">🌆 Evening (18-22)</div>
                        <div className="flex-1 text-center bg-indigo-100 dark:bg-indigo-900/30 rounded-lg py-1 text-indigo-700 dark:text-indigo-300">🌙 Night (22-24)</div>
                      </div>
                    </div>

                    {/* Timeline rows */}
                    {TIME_SLOTS.filter((_, i) => i % 2 === 0).map((time, idx) => {
                      const actualIndex = idx * 2;
                      const nextTime = TIME_SLOTS[actualIndex + 1];
                      const hour = parseInt(time.split(':')[0]);
                      
                      // Get activities for this hour slot
                      const slotIdeas = ideas.filter(i => 
                        i.scheduledAt && 
                        isSameDay(i.scheduledAt, showDayModal) && 
                        i.startTime &&
                        parseInt(i.startTime.split(':')[0]) === hour
                      );

                      const period = getTimePeriod(time);
                      const periodColors = {
                        night: 'bg-indigo-50 dark:bg-indigo-900/20 border-indigo-200 dark:border-indigo-800',
                        morning: 'bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800',
                        afternoon: 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800',
                        evening: 'bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800',
                      };

                      return (
                        <TimelineRow
                          key={time}
                          time={time}
                          nextTime={nextTime}
                          index={actualIndex}
                          ideas={slotIdeas}
                          periodClass={periodColors[period]}
                          onUnschedule={unscheduleIdea}
                        />
                      );
                    })}
                  </div>
                </DndContext>

                {/* Current activities summary */}
                <div className="mt-4 p-4 bg-pink-50 dark:bg-purple-900/20 rounded-2xl border border-border-custom">
                  <h4 className="font-bold text-primary mb-2">Today's Activities</h4>
                  <div className="flex flex-wrap gap-2">
                    {ideas
                      .filter(i => i.scheduledAt && isSameDay(i.scheduledAt, showDayModal))
                      .sort((a, b) => (a.startTime || '00:00').localeCompare(b.startTime || '00:00'))
                      .map(idea => (
                        <div key={idea.id} className={`px-3 py-1 rounded-full text-xs font-medium ${AUTHOR_BG_COLORS[idea.author]} ${AUTHOR_TEXT_COLORS[idea.author]}`}>
                          {idea.startTime} {idea.title.substring(0, 20)}{idea.title.length > 20 ? '...' : ''}
                        </div>
                      ))}
                    {ideas.filter(i => i.scheduledAt && isSameDay(i.scheduledAt, showDayModal)).length === 0 && (
                      <span className="text-secondary text-sm">No activities scheduled yet. Drag from &quot;Our Ideas&quot; to the timeline above! ✨</span>
                    )}
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

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
                      {CATEGORIES.filter(c => c.id !== 'all').map(c => (
                        <option key={c.id} value={c.id}>{c.emoji} {c.label}</option>
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
                  <div className={`inline-block px-3 py-1 rounded-full text-xs text-white mb-2 ${randomPick.author === 'AY' ? 'bg-pink-500' : 'bg-purple-500'}`}>
                    Added by {randomPick.author}
                  </div>
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
                  Yay! Let&apos;s do it! 🎉
                </motion.button>
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
                    Cancel
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
      </div>
    </div>
  );
}

// FIXED: Idea Card with proper delete button (doesn't trigger drag)
function IdeaCard({ idea, onDelete }: { idea: Idea; onDelete: (id: string, e?: React.MouseEvent) => void }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: idea.id,
  });

  const style = transform ? {
    transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
  } : undefined;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.8 }}
      className={`relative group ${isDragging ? 'opacity-30' : ''}`}
    >
      {/* Draggable area (everything except delete button) */}
      <div
        ref={setNodeRef}
        style={style}
        {...attributes}
        {...listeners}
        className={`p-3 bg-white dark:bg-purple-900/40 border-l-4 ${idea.author === 'AY' ? 'border-pink-400' : 'border-purple-400'} rounded-2xl cursor-move shadow-md hover:shadow-xl transition-all ${isDragging ? 'rotate-3 scale-105' : ''}`}
      >
        <div className="flex justify-between items-start">
          <div className="flex-1 pr-8"> {/* Padding for delete button space */}
            {idea.imageUrl && (
              <img src={idea.imageUrl} alt="" className="w-full h-16 object-cover rounded-lg mb-2" />
            )}
            <div className="flex items-center gap-2 mb-1">
              <span className={`text-[10px] px-2 py-0.5 rounded-full text-white ${idea.author === 'AY' ? 'bg-pink-500' : 'bg-purple-500'}`}>
                {idea.author}
              </span>
            </div>
            <h3 className="font-bold text-primary text-sm">{idea.title}</h3>
            <div className="flex items-center justify-between mt-1 text-xs text-secondary">
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {idea.duration || 'TBD'}
              </span>
              {idea.budget && <span className="text-pink-500 font-bold">${idea.budget}</span>}
            </div>
          </div>
        </div>
      </div>

      {/* FIXED: Delete button completely outside draggable area */}
      <motion.button
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        onClick={(e) => onDelete(idea.id, e)}
        onPointerDown={(e) => e.stopPropagation()} // Prevent drag start
        className="absolute top-2 right-2 p-2 text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-full bg-white dark:bg-purple-800 shadow-sm z-10"
        style={{ touchAction: 'none' }}
      >
        <Trash2 className="w-4 h-4" />
      </motion.button>
    </motion.div>
  );
}

// Calendar Day Component
function CalendarDay({ day, index, ideas, isWeekend, hasActivities, onClick }: { 
  day: Date; 
  index: number; 
  ideas: Idea[];
  isWeekend: boolean;
  hasActivities: boolean;
  onClick: () => void;
}) {
  const { isOver, setNodeRef } = useDroppable({
    id: `day-${index}`,
  });

  const ayCount = ideas.filter(i => i.author === 'AY').length;
  const akCount = ideas.filter(i => i.author === 'AK').length;

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
          <div key={idea.id} className={`text-[10px] p-1 rounded truncate ${idea.author === 'AY' ? 'bg-pink-100 text-pink-700' : 'bg-purple-100 text-purple-700'}`}>
            {idea.title.substring(0, 15)}{idea.title.length > 15 ? '...' : ''}
          </div>
        ))}
        {ideas.length > 2 && (
          <div className="text-[10px] text-center text-pink-500 font-bold">+{ideas.length - 2} more</div>
        )}
        {(ayCount > 0 || akCount > 0) && (
          <div className="flex gap-1 mt-1">
            {ayCount > 0 && <span className="text-[8px] bg-pink-400 text-white px-1 rounded">{ayCount}</span>}
            {akCount > 0 && <span className="text-[8px] bg-purple-400 text-white px-1 rounded">{akCount}</span>}
          </div>
        )}
      </div>
    </motion.div>
  );
}

// Horizontal Timeline Row Component
function TimelineRow({ time, nextTime, index, ideas, periodClass, onUnschedule }: {
  time: string;
  nextTime: string;
  index: number;
  ideas: Idea[];
  periodClass: string;
  onUnschedule: (id: string, e?: React.MouseEvent) => void;
}) {
  const { isOver, setNodeRef } = useDroppable({
    id: `time-${index}`,
  });

  const hour = parseInt(time.split(':')[0]);
  const isEvenHour = hour % 2 === 0;

  return (
    <div
      ref={setNodeRef}
      className={`flex items-stretch gap-2 p-2 rounded-xl border-2 transition-all min-h-[60px] ${periodClass} ${isOver ? 'border-pink-400 bg-pink-100 dark:bg-purple-800 scale-[1.02] shadow-lg' : 'border-transparent hover:border-pink-300'}`}
    >
      {/* Time label */}
      <div className="w-16 flex flex-col justify-center items-center text-xs font-bold text-secondary border-r border-border-custom pr-2">
        <span className={isEvenHour ? 'text-primary text-sm' : ''}>{time}</span>
        <span className="text-[10px] opacity-60">to</span>
        <span className="text-[10px] opacity-60">{nextTime}</span>
      </div>

      {/* Activity slots */}
      <div className="flex-1 flex gap-2 items-center">
        {ideas.length === 0 && isOver && (
          <div className="flex-1 h-12 rounded-lg border-2 border-dashed border-pink-400 flex items-center justify-center text-xs text-pink-500 font-medium animate-pulse">
            Drop here! ✨
          </div>
        )}
        
        {ideas.map(idea => (
          <motion.div
            key={idea.id}
            initial={{ scale: 0, x: -20 }}
            animate={{ scale: 1, x: 0 }}
            className={`flex-1 h-12 rounded-lg px-3 flex items-center justify-between shadow-sm ${idea.author === 'AY' ? 'bg-pink-200 border-pink-400' : 'bg-purple-200 border-purple-400'} border-2`}
          >
            <div className="flex items-center gap-2 overflow-hidden">
              <span className={`text-xs px-2 py-0.5 rounded-full text-white font-bold ${idea.author === 'AY' ? 'bg-pink-500' : 'bg-purple-500'}`}>
                {idea.author}
              </span>
              <span className="font-bold text-primary text-sm truncate">{idea.title}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-secondary whitespace-nowrap">{idea.startTime}-{idea.endTime}</span>
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={(e) => onUnschedule(idea.id, e)}
                className="p-1 text-red-500 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-full"
              >
                <Trash2 className="w-4 h-4" />
              </motion.button>
            </div>
          </motion.div>
        ))}

        {ideas.length === 0 && !isOver && (
          <div className="flex-1 h-8 rounded-lg border border-dashed border-border-custom flex items-center justify-center text-xs text-secondary opacity-40">
            Empty slot
          </div>
        )}
      </div>
    </div>
  );
}