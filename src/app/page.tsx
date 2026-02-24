'use client';

import { useState, useEffect, useCallback } from 'react';
import { DndContext, DragEndEvent, useDraggable, useDroppable, DragOverlay } from '@dnd-kit/core';
import { 
  format, 
  startOfMonth, 
  endOfMonth, 
  eachDayOfInterval, 
  isSameDay, 
  getYear, 
  setYear, 
  setMonth, 
  isSameMonth,
  startOfWeek,
  endOfWeek
} from 'date-fns';
import { Plus, Calendar, Lightbulb, Clock, DollarSign, Shuffle, X, Upload, Sparkles, Moon, Sun, ChevronLeft, ChevronRight, Trash2, Settings, Download, Users, LogIn } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTheme, EMOJIS, COLOR_THEMES } from './providers';
import * as XLSX from 'xlsx';
import { db } from '@/lib/firebase';
import { 
  collection, 
  doc, 
  setDoc, 
  deleteDoc, 
  onSnapshot, 
  query,
  Timestamp,
  getDocs
} from 'firebase/firestore';
import { getAuth, signInWithPopup, GoogleAuthProvider, onAuthStateChanged, signOut, User } from 'firebase/auth';

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

type ColorTheme = 'romance' | 'ocean' | 'sunset' | 'forest' | 'royal';

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
const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const TIME_OPTIONS = [
  '06:00', '06:30', '07:00', '07:30', '08:00', '08:30', '09:00', '09:30',
  '10:00', '10:30', '11:00', '11:30', '12:00', '12:30', '13:00', '13:30',
  '14:00', '14:30', '15:00', '15:30', '16:00', '16:30', '17:00', '17:30',
  '18:00', '18:30', '19:00', '19:30', '20:00', '20:30', '21:00', '21:30',
  '22:00', '22:30', '23:00', '23:30'
];

// UTC helpers to fix timezone issues
function toUTCMidnight(date: Date): Date {
  return new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
}

function fromUTCMidnight(timestamp: Timestamp): Date {
  const date = timestamp.toDate();
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

// Helper to convert Idea to Firestore format
const ideaToFirestore = (idea: Idea) => ({
  ...idea,
  scheduledAt: idea.scheduledAt ? Timestamp.fromDate(toUTCMidnight(idea.scheduledAt)) : null,
});

// Helper to convert Firestore format to Idea
const ideaFromFirestore = (data: any): Idea => ({
  ...data,
  scheduledAt: data.scheduledAt ? fromUTCMidnight(data.scheduledAt) : null,
});

export default function CouplePlanner() {
  const { theme, toggleTheme, author, toggleAuthor, colorTheme, setColorTheme, colors } = useTheme();
  
  const [ideas, setIdeas] = useState<Idea[]>([]);
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
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const auth = getAuth();

  // Auth state listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setIsLoading(false);
    });
    return () => unsubscribe();
  }, [auth]);

  // Real-time Firestore listener
  useEffect(() => {
    if (!user) {
      setIdeas(INITIAL_IDEAS);
      return;
    }

    const ideasQuery = query(collection(db, 'ideas'));
    const budgetsQuery = query(collection(db, 'budgets'));

    const unsubIdeas = onSnapshot(ideasQuery, (snapshot) => {
      const ideasData = snapshot.docs.map(doc => ideaFromFirestore({ id: doc.id, ...doc.data() }));
      setIdeas(ideasData.length > 0 ? ideasData : INITIAL_IDEAS);
    });

    const unsubBudgets = onSnapshot(budgetsQuery, (snapshot) => {
      const budgetsData = snapshot.docs.map(doc => doc.data() as MonthlyBudget);
      setMonthlyBudgets(budgetsData);
    });

    return () => {
      unsubIdeas();
      unsubBudgets();
    };
  }, [user]);

  useEffect(() => {
    setRandomEmoji(EMOJIS[Math.floor(Math.random() * EMOJIS.length)]);
  }, []);

  const signInWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error('Sign in error:', error);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      setIdeas(INITIAL_IDEAS);
      setMonthlyBudgets([]);
    } catch (error) {
      console.error('Sign out error:', error);
    }
  };

  // Calculate days with Monday as first day of week
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
  const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

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

  // Firestore operations
  const saveIdea = async (idea: Idea) => {
    if (!user) return;
    await setDoc(doc(db, 'ideas', idea.id), ideaToFirestore(idea));
  };

  const deleteIdeaFromDb = async (id: string) => {
    if (!user) return;
    await deleteDoc(doc(db, 'ideas', id));
  };

  const saveBudget = async (budget: MonthlyBudget) => {
    if (!user) return;
    const id = `${budget.year}-${budget.month}`;
    await setDoc(doc(db, 'budgets', id), budget);
  };

  const handleDragStart = (id: string) => {
    setActiveDragId(id);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveDragId(null);
    
    if (!over) return;

    if (over.id.toString().startsWith('day-')) {
      const dayIndex = parseInt(over.id.toString().replace('day-', ''));
      const date = days[dayIndex];
      
      const updatedIdea = ideas.find(i => i.id === active.id);
      if (updatedIdea) {
        const newIdea = { 
          ...updatedIdea, 
          scheduledAt: date, 
          isScheduled: true, 
          author, 
          startTime: '09:00', 
          endTime: '11:00' 
        };
        saveIdea(newIdea);
      }
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

  const addIdea = async () => {
    if (!newIdea.title || !user) return;
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
    await saveIdea(idea);
    setNewIdea({ title: '', description: '', duration: '', category: 'adventure', budget: '' });
    setPreviewImage(null);
    setShowAddModal(false);
  };

  const deleteIdea = useCallback(async (id: string) => {
    await deleteIdeaFromDb(id);
  }, [user]);

  const unscheduleIdea = useCallback(async (id: string) => {
    if (!user) return;
    const idea = ideas.find(i => i.id === id);
    if (idea) {
      const updated: any = { 
        ...idea, 
        scheduledAt: null, 
        isScheduled: false
      };
      delete updated.startTime;
      delete updated.endTime;
      await saveIdea(updated);
    }
  }, [ideas, user]);

  const updateActivityTime = async (ideaId: string, field: 'startTime' | 'endTime', value: string) => {
    if (!user) return;
    const idea = ideas.find(i => i.id === ideaId);
    if (idea) {
      const updated = { ...idea, [field]: value };
      await saveIdea(updated);
    }
  };

  const pickRandom = () => {
    const available = ideas.filter(i => !i.isScheduled);
    if (available.length > 0) {
      const random = available[Math.floor(Math.random() * available.length)];
      setRandomPick(random);
      setShowRandomModal(true);
    }
  };

  const setBudget = async () => {
    if (!user) return;
    const budget = parseFloat(tempBudget) || 0;
    const newBudget: MonthlyBudget = {
      year: currentDate.getFullYear(),
      month: currentDate.getMonth(),
      budget
    };
    await saveBudget(newBudget);
    setShowBudgetModal(false);
    setTempBudget('');
  };

  const changeYear = (delta: number) => {
    setCurrentDate(setYear(currentDate, getYear(currentDate) + delta));
  };

  const selectMonth = (monthIndex: number) => {
    setCurrentDate(setMonth(currentDate, monthIndex));
  };

  const exportToExcel = (type: 'month' | 'day') => {
    const exportData: any[] = [];
    
    if (type === 'month') {
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
          'Activity': idea.title.replace(/^[^\w\s]/, '').trim(),
          'Category': CATEGORIES.find(c => c.id === idea.category)?.label || idea.category,
          'Budget (AED)': idea.budget || 0,
          'Planned By': idea.author,
          'Description': idea.description || ''
        });
      });

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

  // Theme selector component
  const renderThemeSelector = () => (
    <motion.div 
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex gap-2 mb-4 justify-center flex-wrap"
    >
      {(Object.keys(COLOR_THEMES) as ColorTheme[]).map((t) => (
        <motion.button
          key={t}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setColorTheme(t)}
          className={`px-3 py-2 rounded-xl text-sm font-medium transition-all ${
            colorTheme === t 
              ? 'ring-2 ring-offset-2 ring-offset-white dark:ring-offset-gray-900 scale-105' 
              : 'opacity-70 hover:opacity-100'
          }`}
          style={{
            backgroundColor: theme === 'dark' ? COLOR_THEMES[t].dark.card : COLOR_THEMES[t].light.card,
            color: theme === 'dark' ? COLOR_THEMES[t].dark.text : COLOR_THEMES[t].light.text,
            border: `2px solid ${theme === 'dark' ? COLOR_THEMES[t].dark.border : COLOR_THEMES[t].light.border}`,
            boxShadow: colorTheme === t ? `0 4px 14px ${theme === 'dark' ? COLOR_THEMES[t].dark.primary : COLOR_THEMES[t].light.primary}40` : 'none'
          }}
        >
          <span className="mr-1">{COLOR_THEMES[t].emoji}</span>
          {COLOR_THEMES[t].name}
        </motion.button>
      ))}
    </motion.div>
  );

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: `linear-gradient(to bottom right, ${colors.bg})` }}>
        <motion.div 
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="text-6xl"
        >
          💕
        </motion.div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen p-4 md:p-6 bg-gradient-to-br ${colors.bg} transition-all duration-500`}>
      {/* CSS Variables for theme colors */}
      <style jsx global>{`
        :root {
          --color-primary: ${colors.primary};
          --color-secondary: ${colors.secondary};
          --color-accent: ${colors.accent};
          --color-card: ${colors.card};
          --color-border: ${colors.border};
          --color-text: ${colors.text};
          --color-text-secondary: ${colors.textSecondary};
        }
        .text-primary { color: ${colors.text} !important; }
        .text-secondary { color: ${colors.textSecondary} !important; }
        .bg-card-bg { background-color: ${colors.card} !important; }
        .border-border-custom { border-color: ${colors.border} !important; }
      `}</style>
      
      <div className="max-w-[1400px] mx-auto">
        {/* Theme Selector */}
        {renderThemeSelector()}

        {/* Auth Header */}
        <div className="flex justify-end mb-4">
          {user ? (
            <div className="flex items-center gap-3 bg-card-bg backdrop-blur-md px-4 py-2 rounded-2xl shadow-lg border-2 border-border-custom">
              <img src={user.photoURL || ''} alt="" className="w-8 h-8 rounded-full" />
              <span className="text-sm text-primary font-medium">{user.displayName}</span>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleSignOut}
                className="text-xs text-red-500 hover:text-red-600 font-medium"
              >
                Sign Out
              </motion.button>
            </div>
          ) : (
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={signInWithGoogle}
              className="flex items-center gap-2 bg-card-bg backdrop-blur-md px-4 py-2 rounded-2xl shadow-lg border-2 border-border-custom text-primary font-medium"
            >
              <LogIn className="w-4 h-4" />
              Sign in with Google
            </motion.button>
          )}
        </div>

        {/* Main Header */}
        <header className="mb-6 text-center relative">
          <div className="absolute right-0 top-0 flex gap-2">
            <motion.button
              whileHover={{ scale: 1.1, rotate: 15 }}
              whileTap={{ scale: 0.9 }}
              onClick={toggleTheme}
              className="p-3 rounded-full bg-card-bg border-2 border-border-custom shadow-lg"
            >
              {theme === 'dark' ? <Sun className="w-6 h-6" style={{ color: colors.accent }} /> : <Moon className="w-6 h-6" style={{ color: colors.secondary }} />}
            </motion.button>
          </div>

          <motion.div 
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="inline-flex items-center gap-2 bg-card-bg backdrop-blur-md px-6 py-2 rounded-full shadow-lg mb-3 border-2 border-border-custom"
          >
            <Sparkles className="w-5 h-5" style={{ color: colors.primary }} />
            <span className="text-primary font-medium">Idea Calendar</span>
            <Sparkles className="w-5 h-5" style={{ color: colors.primary }} />
          </motion.div>
          
          <motion.h1 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="text-4xl md:text-5xl font-bold mb-2"
            style={{ 
              background: `linear-gradient(to right, ${colors.primary}, ${colors.secondary})`,
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent'
            }}
          >
            A + A Adventure {randomEmoji}
          </motion.h1>
          
          <motion.p 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-lg mb-4 font-medium text-secondary"
          >
            {format(currentDate, 'MMMM yyyy')}
          </motion.p>
          
          {!user && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-4 p-4 rounded-2xl text-sm"
              style={{ 
                backgroundColor: theme === 'dark' ? 'rgba(50, 40, 20, 0.8)' : 'rgba(254, 252, 232, 0.9)',
                border: `2px solid ${theme === 'dark' ? '#854d0e' : '#fde047'}`,
                color: theme === 'dark' ? '#fef08a' : '#854d0e'
              }}
            >
              <p className="font-medium">👋 Sign in with Google to save your plans and sync with your partner!</p>
              <p className="mt-1 opacity-80">Without signing in, changes will be lost when you refresh.</p>
            </motion.div>
          )}
          
          {/* Budget & Author Toggle */}
          <div className="flex justify-center gap-4 flex-wrap">
            <motion.div 
              whileHover={{ scale: 1.02 }}
              className="inline-flex items-center gap-3 bg-card-bg backdrop-blur-md px-6 py-3 rounded-2xl shadow-xl border-2 border-border-custom cursor-pointer"
              onClick={() => user && setShowBudgetModal(true)}
            >
              <div className="p-2 rounded-full" style={{ backgroundColor: `${colors.primary}20` }}>
                <DollarSign className="w-5 h-5" style={{ color: colors.primary }} />
              </div>
              <div className="text-left">
                <span className="text-xs font-medium text-secondary">Monthly Budget</span>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-bold text-primary">
                    ${totalBudget}
                  </span>
                  <span className="text-secondary text-sm">/</span>
                  <span className={`text-2xl font-bold ${isOverBudget ? 'text-red-500' : ''}`} style={{ color: isOverBudget ? '#ef4444' : '#22c55e' }}>
                    {isOverBudget ? <span className="flex items-center gap-1">🔻 ${Math.abs(remainingBudget)}</span> : `$${remainingBudget}`}
                  </span>
                </div>
              </div>
              {user && <Settings className="w-4 h-4 text-secondary" />}
            </motion.div>

            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={toggleAuthor}
              className="inline-flex items-center gap-3 bg-card-bg backdrop-blur-md px-6 py-3 rounded-2xl shadow-xl border-2 border-border-custom"
            >
              <Users className="w-5 h-5" style={{ color: colors.secondary }} />
              <div className="text-left">
                <span className="text-xs font-medium text-secondary">Planning as</span>
                <div className="flex items-center gap-2">
                  <span className={`w-3 h-3 rounded-full ${author === 'AY' ? colors.ideaAY.split(' ')[0] : colors.ideaAK.split(' ')[0]}`} />
                  <span className="font-bold text-primary">{author}</span>
                </div>
              </div>
            </motion.button>
          </div>
        </header>

        <DndContext onDragEnd={handleDragEnd}>
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
            
            {/* Section 1: Ideas */}
            <motion.div 
              initial={{ x: -50, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              className="bg-card-bg backdrop-blur-md rounded-3xl shadow-xl p-5 border-2 border-border-custom"
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-primary flex items-center gap-2">
                  <span className="p-2 rounded-xl" style={{ backgroundColor: `${colors.accent}20` }}>💡</span>
                  <span style={{ 
                    background: `linear-gradient(to right, ${colors.primary}, ${colors.secondary})`,
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent'
                  }}>Our Ideas</span>
                </h2>
                <div className="flex gap-2">
                  <motion.button 
                    whileHover={{ scale: 1.1, rotate: 180 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={pickRandom}
                    className="text-white p-2 rounded-xl shadow-md"
                    style={{ background: `linear-gradient(to right, ${colors.secondary}, ${colors.primary})` }}
                  >
                    <Shuffle className="w-4 h-4" />
                  </motion.button>
                  <motion.button 
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => user ? setShowAddModal(true) : signInWithGoogle()}
                    className="text-white p-2 rounded-xl shadow-md"
                    style={{ background: `linear-gradient(to right, ${colors.primary}, ${colors.accent})` }}
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
                        ? 'text-white shadow-md' 
                        : 'border border-border-custom'
                    }`}
                    style={selectedCategory === cat.id ? { 
                      background: `linear-gradient(to right, ${colors.primary}, ${colors.secondary})`,
                    } : {
                      backgroundColor: theme === 'dark' ? `${colors.primary}20` : `${colors.primary}10`,
                      color: colors.text
                    }}
                  >
                    {cat.emoji} {cat.label}
                  </motion.button>
                ))}
              </div>

              <div className="space-y-3 max-h-[350px] overflow-y-auto pr-1">
                <AnimatePresence>
                  {filteredIdeas.map(idea => (
                    <SimpleIdeaCard 
                      key={idea.id} 
                      idea={idea} 
                      onDelete={deleteIdea}
                      onDragStart={() => handleDragStart(idea.id)}
                      colors={colors}
                      theme={theme}
                    />
                  ))}
                </AnimatePresence>
                {filteredIdeas.length === 0 && (
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-center py-6 rounded-2xl border-2 border-dashed border-border-custom"
                    style={{ backgroundColor: theme === 'dark' ? `${colors.primary}10` : `${colors.primary}05` }}
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
                  <span className="p-2 rounded-xl" style={{ backgroundColor: `${colors.secondary}20` }}>📅</span>
                  <span style={{ 
                    background: `linear-gradient(to right, ${colors.secondary}, ${colors.accent})`,
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent'
                  }}>
                    {format(currentDate, 'MMMM yyyy')}
                  </span>
                </h2>
                <div className="flex gap-2">
                  <motion.button 
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => exportToExcel('month')}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium"
                    style={{ 
                      backgroundColor: theme === 'dark' ? 'rgba(34, 197, 94, 0.2)' : 'rgba(34, 197, 94, 0.1)',
                      color: '#22c55e'
                    }}
                  >
                    <Download className="w-4 h-4" />
                    Export Month
                  </motion.button>
                  <span className="text-xs text-secondary bg-card-bg px-3 py-1 rounded-full border border-border-custom flex items-center">
                    Drag ideas here ⏰
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-7 gap-2">
                {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => (
                  <div 
                    key={day} 
                    className="text-center text-xs font-bold py-2 rounded-lg"
                    style={{ 
                      backgroundColor: theme === 'dark' ? `${colors.primary}20` : `${colors.primary}10`,
                      color: colors.text
                    }}
                  >
                    {day}
                  </div>
                ))}
                
                {days.map((day, idx) => {
                  const isCurrentMonth = isSameMonth(day, currentDate);
                  const dayIdeas = ideas.filter(i => i.scheduledAt && isSameDay(i.scheduledAt, day));
                  const isWeekend = day.getDay() === 0 || day.getDay() === 6;
                  
                  if (!isCurrentMonth) {
                    return <div 
                      key={day.toISOString()} 
                      className="min-h-[80px] rounded-xl border border-border-custom opacity-50"
                      style={{ backgroundColor: theme === 'dark' ? 'rgba(0,0,0,0.2)' : 'rgba(0,0,0,0.05)' }}
                    />;
                  }
                  
                  return (
                    <SimpleCalendarDay 
                      key={day.toISOString()} 
                      day={day} 
                      index={idx}
                      ideas={dayIdeas}
                      isWeekend={isWeekend}
                      hasActivities={dayIdeas.length > 0}
                      onClick={() => setShowDayModal(day)}
                      colors={colors}
                      theme={theme}
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
                  className="p-2 rounded-full"
                  style={{ backgroundColor: `${colors.primary}20`, color: colors.primary }}
                >
                  <ChevronLeft className="w-5 h-5" />
                </motion.button>
                <h2 className="text-xl font-bold text-primary">{getYear(currentDate)}</h2>
                <motion.button 
                  whileHover={{ scale: 1.2 }}
                  whileTap={{ scale: 0.8 }}
                  onClick={() => changeYear(1)}
                  className="p-2 rounded-full"
                  style={{ backgroundColor: `${colors.primary}20`, color: colors.primary }}
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
                        isSelected ? 'text-white shadow-lg' : ''
                      }`}
                      style={isSelected ? {
                        background: `linear-gradient(to right, ${colors.primary}, ${colors.secondary})`,
                      } : {
                        backgroundColor: theme === 'dark' ? `${colors.primary}15` : `${colors.primary}08`,
                        color: colors.text
                      }}
                    >
                      {month}
                      {hasActivities && !isSelected && (
                        <span 
                          className="absolute top-1 right-1 w-2 h-2 rounded-full" 
                          style={{ backgroundColor: colors.primary }}
                        />
                      )}
                    </motion.button>
                  );
                })}
              </div>

              <div 
                className="mt-6 p-4 rounded-2xl border border-border-custom"
                style={{ backgroundColor: theme === 'dark' ? `${colors.primary}10` : `${colors.primary}05` }}
              >
                <h3 className="text-sm font-bold text-primary mb-2 flex items-center gap-2">
                  <span style={{ color: colors.primary }}>📊</span>
                  This Month
                </h3>
                <div className="space-y-2 text-xs text-secondary">
                  <div className="flex justify-between">
                    <span>Activities:</span>
                    <span className="font-bold text-primary">{scheduledThisMonth.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Planned by AY:</span>
                    <span className="font-bold" style={{ color: colors.primary }}>{scheduledThisMonth.filter(i => i.author === 'AY').length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Planned by AK:</span>
                    <span className="font-bold" style={{ color: colors.secondary }}>{scheduledThisMonth.filter(i => i.author === 'AK').length}</span>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>

          {/* Drag Overlay */}
          <DragOverlay>
            {activeIdea ? (
              <div 
                className="p-4 border-2 rounded-2xl shadow-2xl opacity-90 rotate-3 pointer-events-none"
                style={{ 
                  backgroundColor: colors.card,
                  borderColor: colors.primary
                }}
              >
                <p className="font-bold text-sm text-primary">{activeIdea.title}</p>
                <p className="text-xs text-secondary">{activeIdea.duration}</p>
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>

        {/* Day Schedule Modal */}
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
                className="rounded-3xl p-6 w-full max-w-2xl shadow-2xl border-4 max-h-[90vh] overflow-y-auto"
                style={{ 
                  backgroundColor: colors.card,
                  borderColor: colors.border
                }}
                onClick={e => e.stopPropagation()}
              >
                <div className="flex justify-between items-center mb-4">
                  <div>
                    <h3 
                      className="text-2xl font-bold mb-1"
                      style={{ 
                        background: `linear-gradient(to right, ${colors.primary}, ${colors.secondary})`,
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent'
                      }}
                    >
                      {format(showDayModal, 'EEEE, MMMM do')}
                    </h3>
                    <p className="text-sm text-secondary">Click time dropdowns to change schedule ⏰</p>
                  </div>
                  <div className="flex gap-2">
                    <motion.button 
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      onClick={() => exportToExcel('day')}
                      className="p-2 rounded-full"
                      style={{ backgroundColor: 'rgba(34, 197, 94, 0.2)', color: '#22c55e' }}
                    >
                      <Download className="w-5 h-5" />
                    </motion.button>
                    <motion.button 
                      whileHover={{ scale: 1.1, rotate: 90 }}
                      whileTap={{ scale: 0.9 }}
                      onClick={() => setShowDayModal(null)}
                      className="p-2 rounded-full"
                      style={{ backgroundColor: `${colors.primary}20`, color: colors.primary }}
                    >
                      <X className="w-5 h-5" />
                    </motion.button>
                  </div>
                </div>

                {/* Activities List */}
                <div className="space-y-3">
                  {ideas
                    .filter(i => i.scheduledAt && isSameDay(i.scheduledAt, showDayModal))
                    .sort((a, b) => (a.startTime || '00:00').localeCompare(b.startTime || '00:00'))
                    .map(idea => (
                    <motion.div 
                      key={idea.id}
                      initial={{ x: -20, opacity: 0 }}
                      animate={{ x: 0, opacity: 1 }}
                      className={`p-4 rounded-2xl border-2 flex flex-col sm:flex-row gap-3 items-start sm:items-center ${idea.author === 'AY' ? colors.ideaAY : colors.ideaAK}`}
                    >
                      {/* Time Pickers */}
                      <div className="flex items-center gap-2">
                        <select
                          value={idea.startTime || '09:00'}
                          onChange={(e) => updateActivityTime(idea.id, 'startTime', e.target.value)}
                          className="p-2 border-2 rounded-lg text-sm bg-transparent focus:outline-none"
                          style={{ 
                            borderColor: colors.border,
                            color: colors.text
                          }}
                        >
                          {TIME_OPTIONS.map(t => <option key={t} value={t}>{t}</option>)}
                        </select>
                        <span className="text-secondary">to</span>
                        <select
                          value={idea.endTime || '11:00'}
                          onChange={(e) => updateActivityTime(idea.id, 'endTime', e.target.value)}
                          className="p-2 border-2 rounded-lg text-sm bg-transparent focus:outline-none"
                          style={{ 
                            borderColor: colors.border,
                            color: colors.text
                          }}
                        >
                          {TIME_OPTIONS.map(t => <option key={t} value={t}>{t}</option>)}
                        </select>
                      </div>

                      {/* Activity Info */}
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span 
                            className="text-xs px-2 py-0.5 rounded-full text-white"
                            style={{ 
                              backgroundColor: idea.author === 'AY' ? colors.primary : colors.secondary 
                            }}
                          >
                            {idea.author}
                          </span>
                          <span className="text-xs text-secondary uppercase">{CATEGORIES.find(c => c.id === idea.category)?.label}</span>
                        </div>
                        <h4 className="font-bold" style={{ color: colors.text }}>{idea.title}</h4>
                        <p className="text-sm text-secondary">{idea.description}</p>
                      </div>

                      {/* Budget & Delete */}
                      <div className="flex items-center gap-3">
                        {idea.budget && (
                          <span className="font-bold" style={{ color: colors.primary }}>${idea.budget}</span>
                        )}
                        <motion.button
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                          onClick={(e) => {
                            e.stopPropagation();
                            e.preventDefault();
                            unscheduleIdea(idea.id);
                          }}
                          className="p-2 rounded-full"
                          style={{ backgroundColor: 'rgba(239, 68, 68, 0.2)', color: '#ef4444' }}
                        >
                          <Trash2 className="w-4 h-4" />
                        </motion.button>
                      </div>
                    </motion.div>
                  ))}
                  
                  {ideas.filter(i => i.scheduledAt && isSameDay(i.scheduledAt, showDayModal)).length === 0 && (
                    <div className="text-center py-8 text-secondary">
                      <span className="text-4xl mb-2 block">🌸</span>
                      <p>No plans yet! Drag ideas from the left to the calendar first 💕</p>
                    </div>
                  )}
                </div>

                {/* Quick Add */}
                <div className="mt-6 pt-6 border-t" style={{ borderColor: colors.border }}>
                  <h4 className="font-bold text-primary mb-3">Quick Add to This Day</h4>
                  <div className="flex flex-wrap gap-2">
                    {ideas.filter(i => !i.isScheduled).slice(0, 5).map(idea => (
                      <motion.button
                        key={idea.id}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => {
                          if (!user) {
                            signInWithGoogle();
                            return;
                          }
                          const updated = { 
                            ...idea, 
                            scheduledAt: showDayModal, 
                            isScheduled: true, 
                            startTime: '09:00', 
                            endTime: '11:00' 
                          };
                          saveIdea(updated);
                        }}
                        className="px-3 py-2 rounded-xl text-xs font-medium border border-border-custom"
                        style={{ 
                          backgroundColor: idea.author === 'AY' ? `${colors.primary}20` : `${colors.secondary}20`,
                          color: idea.author === 'AY' ? colors.primary : colors.secondary
                        }}
                      >
                        {idea.title.substring(0, 20)}{idea.title.length > 20 ? '...' : ''}
                      </motion.button>
                    ))}
                    {ideas.filter(i => !i.isScheduled).length === 0 && (
                      <span className="text-sm text-secondary">No unscheduled ideas left! ✨</span>
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
                className="rounded-3xl p-6 w-full max-w-md shadow-2xl border-4 max-h-[90vh] overflow-y-auto"
                style={{ 
                  backgroundColor: colors.card,
                  borderColor: colors.border
                }}
              >
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-xl font-bold text-primary flex items-center gap-2">
                    <Sparkles className="w-6 h-6" style={{ color: colors.primary }} />
                    New Idea 💡
                  </h3>
                  <motion.button 
                    whileHover={{ scale: 1.1, rotate: 90 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => setShowAddModal(false)} 
                    className="p-2 rounded-full"
                    style={{ backgroundColor: `${colors.primary}20`, color: colors.primary }}
                  >
                    <X className="w-5 h-5" />
                  </motion.button>
                </div>
                
                <div className="space-y-4">
                  <motion.div 
                    whileHover={{ scale: 1.02 }}
                    className="border-3 border-dashed rounded-2xl p-6 text-center transition-all cursor-pointer group"
                    style={{ 
                      borderColor: colors.border,
                      backgroundColor: theme === 'dark' ? `${colors.primary}10` : `${colors.primary}05`
                    }}
                  >
                    {previewImage ? (
                      <div className="relative">
                        <img src={previewImage} alt="Preview" className="w-full h-40 object-cover rounded-xl shadow-md" />
                        <motion.button 
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                          onClick={() => setPreviewImage(null)}
                          className="absolute top-2 right-2 text-white p-2 rounded-full hover:bg-red-500 shadow-lg"
                          style={{ backgroundColor: '#ef4444' }}
                        >
                          <X className="w-4 h-4" />
                        </motion.button>
                      </div>
                    ) : (
                      <label className="cursor-pointer block">
                        <motion.div 
                          whileHover={{ scale: 1.1 }}
                          className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-3"
                          style={{ backgroundColor: `${colors.primary}20` }}
                        >
                          <Upload className="w-8 h-8" style={{ color: colors.primary }} />
                        </motion.div>
                        <span className="font-medium" style={{ color: colors.primary }}>Add a cute photo 📸</span>
                        <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                      </label>
                    )}
                  </motion.div>

                  <input
                    type="text"
                    placeholder="What should we do together? 💕"
                    className="w-full p-4 border-2 rounded-2xl focus:outline-none bg-transparent placeholder-opacity-50"
                    style={{ 
                      borderColor: colors.border,
                      color: colors.text,
                      backgroundColor: theme === 'dark' ? 'rgba(0,0,0,0.2)' : 'rgba(255,255,255,0.5)'
                    }}
                    value={newIdea.title}
                    onChange={e => setNewIdea({...newIdea, title: e.target.value})}
                  />
                  <textarea
                    placeholder="Tell me more about it... ✨"
                    className="w-full p-4 border-2 rounded-2xl focus:outline-none h-24 resize-none bg-transparent placeholder-opacity-50"
                    style={{ 
                      borderColor: colors.border,
                      color: colors.text,
                      backgroundColor: theme === 'dark' ? 'rgba(0,0,0,0.2)' : 'rgba(255,255,255,0.5)'
                    }}
                    value={newIdea.description}
                    onChange={e => setNewIdea({...newIdea, description: e.target.value})}
                  />
                  <div className="grid grid-cols-2 gap-3">
                    <select
                      className="p-4 border-2 rounded-2xl focus:outline-none bg-transparent"
                      style={{ 
                        borderColor: colors.border,
                        color: colors.text,
                        backgroundColor: theme === 'dark' ? 'rgba(0,0,0,0.2)' : 'rgba(255,255,255,0.5)'
                      }}
                      value={newIdea.duration}
                      onChange={e => setNewIdea({...newIdea, duration: e.target.value})}
                    >
                      <option value="" style={{ backgroundColor: colors.card }}>⏰ Duration</option>
                      <option value="1-2 hours" style={{ backgroundColor: colors.card }}>✨ 1-2 hours</option>
                      <option value="Half day" style={{ backgroundColor: colors.card }}>🌅 Half day</option>
                      <option value="Full day" style={{ backgroundColor: colors.card }}>☀️ Full day</option>
                      <option value="Evening" style={{ backgroundColor: colors.card }}>🌙 Evening</option>
                    </select>
                    <select
                      className="p-4 border-2 rounded-2xl focus:outline-none bg-transparent"
                      style={{ 
                        borderColor: colors.border,
                        color: colors.text,
                        backgroundColor: theme === 'dark' ? 'rgba(0,0,0,0.2)' : 'rgba(255,255,255,0.5)'
                      }}
                      value={newIdea.category}
                      onChange={e => setNewIdea({...newIdea, category: e.target.value})}
                    >
                      {CATEGORIES.filter(c => c.id !== 'all').map(c => (
                        <option key={c.id} value={c.id} style={{ backgroundColor: colors.card }}>{c.emoji} {c.label}</option>
                      ))}
                    </select>
                  </div>
                  <div className="relative">
                    <DollarSign className="absolute left-4 top-4 w-5 h-5" style={{ color: colors.primary }} />
                    <input
                      type="number"
                      placeholder="Budget (AED) 💰"
                      className="w-full p-4 pl-12 border-2 rounded-2xl focus:outline-none bg-transparent"
                      style={{ 
                        borderColor: colors.border,
                        color: colors.text,
                        backgroundColor: theme === 'dark' ? 'rgba(0,0,0,0.2)' : 'rgba(255,255,255,0.5)'
                      }}
                      value={newIdea.budget}
                      onChange={e => setNewIdea({...newIdea, budget: e.target.value})}
                    />
                  </div>
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={addIdea}
                    className="w-full p-4 text-white rounded-2xl font-bold text-lg shadow-lg"
                    style={{ 
                      background: `linear-gradient(to right, ${colors.primary}, ${colors.secondary}, ${colors.accent})`
                    }}
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
                className="rounded-3xl p-8 w-full max-w-md shadow-2xl border-4 text-center"
                style={{ 
                  backgroundColor: colors.card,
                  borderColor: colors.border
                }}
              >
                <motion.div 
                  animate={{ rotate: [0, 10, -10, 0] }}
                  transition={{ repeat: Infinity, duration: 0.5 }}
                  className="text-6xl mb-4"
                >
                  🎲
                </motion.div>
                <h3 className="text-2xl font-bold mb-2" style={{ color: colors.secondary }}>The universe says...</h3>
                <motion.div 
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.3 }}
                  className="p-6 rounded-2xl border-2 mb-6"
                  style={{ 
                    background: `linear-gradient(to bottom right, ${colors.primary}20, ${colors.secondary}20)`,
                    borderColor: colors.border
                  }}
                >
                  {randomPick.imageUrl && (
                    <img src={randomPick.imageUrl} alt="" className="w-full h-32 object-cover rounded-xl mb-4 shadow-md" />
                  )}
                  <div 
                    className="inline-block px-3 py-1 rounded-full text-xs text-white mb-2"
                    style={{ 
                      backgroundColor: randomPick.author === 'AY' ? colors.primary : colors.secondary 
                    }}
                  >
                    Added by {randomPick.author}
                  </div>
                  <h4 className="text-xl font-bold mb-2" style={{ color: colors.text }}>{randomPick.title}</h4>
                  <p className="mb-3" style={{ color: colors.textSecondary }}>{randomPick.description}</p>
                  <div className="flex justify-center gap-4 text-sm" style={{ color: colors.textSecondary }}>
                    <span>⏰ {randomPick.duration}</span>
                    {randomPick.budget && <span>💰 ${randomPick.budget}</span>}
                  </div>
                </motion.div>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setShowRandomModal(false)}
                  className="px-8 py-3 text-white rounded-full font-bold shadow-lg"
                  style={{ 
                    background: `linear-gradient(to right, ${colors.primary}, ${colors.secondary})`
                  }}
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
                className="rounded-3xl p-6 w-full max-w-md shadow-2xl border-4 text-center"
                style={{ 
                  backgroundColor: colors.card,
                  borderColor: colors.border
                }}
              >
                <div className="text-6xl mb-4">💰</div>
                <h3 className="text-2xl font-bold mb-2" style={{ color: colors.text }}>Set Budget for {format(currentDate, 'MMMM yyyy')}</h3>
                <p className="mb-4" style={{ color: colors.textSecondary }}>How much are we planning to spend this month?</p>
                
                <input
                  type="number"
                  placeholder="Enter amount (AED)"
                  className="w-full p-4 border-2 rounded-2xl focus:outline-none text-center text-2xl font-bold mb-4 bg-transparent"
                  style={{ 
                    borderColor: colors.border,
                    color: colors.text,
                    backgroundColor: theme === 'dark' ? 'rgba(0,0,0,0.2)' : 'rgba(255,255,255,0.5)'
                  }}
                  value={tempBudget}
                  onChange={e => setTempBudget(e.target.value)}
                  autoFocus
                />
                
                <div className="flex gap-3">
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setShowBudgetModal(false)}
                    className="flex-1 p-3 border-2 rounded-2xl font-medium"
                    style={{ 
                      borderColor: colors.border,
                      color: colors.textSecondary
                    }}
                  >
                    Cancel
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={setBudget}
                    className="flex-1 p-3 text-white rounded-2xl font-bold"
                    style={{ 
                      background: `linear-gradient(to right, ${colors.primary}, ${colors.secondary})`
                    }}
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

// Simplified Idea Card with proper contrast
function SimpleIdeaCard({ idea, onDelete, onDragStart, colors, theme }: { 
  idea: Idea; 
  onDelete: (id: string) => void;
  onDragStart: () => void;
  colors: any;
  theme: string;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: idea.id,
  });

  const style = transform ? {
    transform: `translate3d(${transform.x}px, ${transform.y}px, 0) rotate(3deg)`,
    zIndex: 1000,
  } : undefined;

  useEffect(() => {
    if (isDragging) {
      onDragStart();
    }
  }, [isDragging, onDragStart]);

  // Determine text color based on background darkness
  const isDarkBg = (className: string) => className.includes('900');
  const ayTextColor = isDarkBg(colors.ideaAY) ? '#fce7f3' : '#831843';
  const akTextColor = isDarkBg(colors.ideaAK) ? '#ede9fe' : '#5b21b6';
  const textColor = idea.author === 'AY' ? ayTextColor : akTextColor;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.8 }}
      className={`relative ${isDragging ? 'opacity-50' : ''}`}
    >
      <div
        ref={setNodeRef}
        style={style}
        {...attributes}
        {...listeners}
        className={`p-3 rounded-2xl cursor-grab active:cursor-grabbing shadow-md hover:shadow-xl transition-all ${idea.author === 'AY' ? colors.ideaAY : colors.ideaAK}`}
      >
        <div className="flex justify-between items-start">
          <div className="flex-1 pr-8">
            {idea.imageUrl && (
              <img src={idea.imageUrl} alt="" className="w-full h-16 object-cover rounded-lg mb-2" />
            )}
            <div className="flex items-center gap-2 mb-1">
              <span 
                className="text-[10px] px-2 py-0.5 rounded-full text-white"
                style={{ 
                  backgroundColor: idea.author === 'AY' ? colors.primary : colors.secondary 
                }}
              >
                {idea.author}
              </span>
            </div>
            <h3 className="font-bold text-sm" style={{ color: textColor }}>{idea.title}</h3>
            <div className="flex items-center justify-between mt-1 text-xs" style={{ color: textColor, opacity: 0.8 }}>
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {idea.duration || 'TBD'}
              </span>
              {idea.budget && <span className="font-bold" style={{ color: colors.primary }}>${idea.budget}</span>}
            </div>
          </div>
        </div>
      </div>

      <button
        onClick={() => onDelete(idea.id)}
        className="absolute top-2 right-2 p-2 rounded-full shadow-sm z-10 transition-colors"
        style={{ 
          color: '#ef4444',
          backgroundColor: theme === 'dark' ? 'rgba(0,0,0,0.5)' : 'rgba(255,255,255,0.9)'
        }}
      >
        <Trash2 className="w-4 h-4" />
      </button>
    </motion.div>
  );
}

// Simplified Calendar Day with proper contrast
function SimpleCalendarDay({ day, index, ideas, isWeekend, hasActivities, onClick, colors, theme }: { 
  day: Date; 
  index: number; 
  ideas: Idea[];
  isWeekend: boolean;
  hasActivities: boolean;
  onClick: () => void;
  colors: any;
  theme: string;
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
      className={`min-h-[80px] p-2 rounded-xl border-2 cursor-pointer transition-all ${isWeekend ? colors.dayHover : ''}`}
      style={{
        backgroundColor: isOver ? `${colors.primary}40` : hasActivities ? `${colors.primary}15` : theme === 'dark' ? 'rgba(0,0,0,0.2)' : 'rgba(255,255,255,0.5)',
        borderColor: isOver ? colors.primary : hasActivities ? colors.primary : colors.border,
        boxShadow: isOver ? `0 0 0 2px ${colors.primary}` : 'none'
      }}
    >
      <div 
        className="text-sm font-bold mb-1" 
        style={{ color: isWeekend ? colors.primary : colors.text }}
      >
        {format(day, 'd')}
      </div>
      <div className="space-y-1">
        {ideas.slice(0, 2).map(idea => {
          const isDarkBg = (className: string) => className.includes('900');
          const ideaTextColor = isDarkBg(idea.author === 'AY' ? colors.ideaAY : colors.ideaAK) ? '#fff' : '#000';
          
          return (
            <div 
              key={idea.id} 
              className={`text-[10px] p-1 rounded truncate ${idea.author === 'AY' ? colors.ideaAY : colors.ideaAK}`}
              style={{ color: ideaTextColor }}
            >
              {idea.title.substring(0, 15)}{idea.title.length > 15 ? '...' : ''}
            </div>
          );
        })}
        {ideas.length > 2 && (
          <div className="text-[10px] text-center font-bold" style={{ color: colors.primary }}>+{ideas.length - 2}</div>
        )}
        {(ayCount > 0 || akCount > 0) && (
          <div className="flex gap-1 mt-1">
            {ayCount > 0 && <span className="text-[8px] text-white px-1 rounded" style={{ backgroundColor: colors.primary }}>{ayCount}</span>}
            {akCount > 0 && <span className="text-[8px] text-white px-1 rounded" style={{ backgroundColor: colors.secondary }}>{akCount}</span>}
          </div>
        )}
      </div>
    </motion.div>
  );
}