'use client';

import { useState } from 'react';
import { DndContext, DragEndEvent, useDraggable, useDroppable } from '@dnd-kit/core';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay } from 'date-fns';
import { Plus, Calendar, Lightbulb, Clock, DollarSign, Shuffle, X, Upload, Heart, Sparkles } from 'lucide-react';

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

const INITIAL_IDEAS: Idea[] = [
  { id: '1', title: '🌅 Desert Safari', description: 'Dune bashing and dinner under the stars', duration: '6 hours', category: 'adventure', budget: 300, imageUrl: null, scheduledAt: null, isScheduled: false, color: 'orange' },
  { id: '2', title: '🏙️ Burj Khalifa', description: 'Sunset at the top together', duration: '3 hours', category: 'sightseeing', budget: 150, imageUrl: null, scheduledAt: null, isScheduled: false, color: 'blue' },
  { id: '3', title: '🏖️ Beach Day', description: 'JBR Beach relaxation & swimming', duration: 'full day', category: 'chill', budget: 50, imageUrl: null, scheduledAt: null, isScheduled: false, color: 'cyan' },
];

const CATEGORIES = ['all', 'food', 'adventure', 'chill', 'sightseeing', 'romantic'];
const COLORS = ['rose', 'pink', 'purple', 'blue', 'cyan', 'teal', 'emerald', 'amber', 'orange', 'red'];

const CATEGORY_EMOJIS: { [key: string]: string } = {
  all: '✨',
  food: '🍽️',
  adventure: '🎢',
  chill: '😌',
  sightseeing: '📸',
  romantic: '💕'
};

export default function CouplePlanner() {
  const [ideas, setIdeas] = useState<Idea[]>(INITIAL_IDEAS);
  const [currentMonth] = useState(new Date(2024, 5, 1));
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showRandomModal, setShowRandomModal] = useState(false);
  const [randomPick, setRandomPick] = useState<Idea | null>(null);
  const [newIdea, setNewIdea] = useState({ 
    title: '', 
    description: '', 
    duration: '', 
    category: 'adventure',
    budget: ''
  });
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });

  const filteredIdeas = selectedCategory === 'all' 
    ? ideas.filter(i => !i.isScheduled)
    : ideas.filter(i => !i.isScheduled && i.category === selectedCategory);

  const totalBudget = ideas
    .filter(i => i.isScheduled && i.budget)
    .reduce((sum, i) => sum + (i.budget || 0), 0);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
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
      reader.onloadend = () => {
        setPreviewImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const addIdea = () => {
    if (!newIdea.title) return;
    const idea: Idea = {
      id: Date.now().toString(),
      title: newIdea.title.startsWith('📍') || newIdea.title.startsWith('✨') || newIdea.title.startsWith('🎉') ? newIdea.title : `✨ ${newIdea.title}`,
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-100 via-purple-100 to-blue-100 p-4 md:p-8 font-sans">
      <div className="max-w-7xl mx-auto">
        {/* Cute Header */}
        <header className="mb-8 text-center">
          <div className="inline-flex items-center gap-2 bg-white/70 backdrop-blur-md px-6 py-2 rounded-full shadow-lg mb-4 border border-pink-200">
            <Sparkles className="w-5 h-5 text-pink-500" />
            <span className="text-pink-600 font-medium">Our Special Trip</span>
            <Sparkles className="w-5 h-5 text-pink-500" />
          </div>
          <h1 className="text-5xl md:text-6xl font-bold bg-gradient-to-r from-pink-500 via-purple-500 to-blue-500 bg-clip-text text-transparent mb-3 drop-shadow-sm">
            Dubai Adventure 💕
          </h1>
          <p className="text-purple-600 text-lg mb-4 font-medium">June 2024 • Making memories together</p>
          
          {/* Cute Budget Card */}
          <div className="inline-flex items-center gap-3 bg-white/80 backdrop-blur-md px-8 py-4 rounded-2xl shadow-xl border-2 border-pink-200">
            <div className="bg-pink-100 p-2 rounded-full">
              <DollarSign className="w-6 h-6 text-pink-600" />
            </div>
            <div className="text-left">
              <span className="text-gray-500 text-sm font-medium">Our Budget</span>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-bold text-pink-600">${totalBudget}</span>
                <span className="text-gray-400 text-sm">/ ${ideas.reduce((sum, i) => sum + (i.budget || 0), 0)} planned</span>
              </div>
            </div>
            <Heart className="w-6 h-6 text-pink-400 ml-2 fill-pink-200" />
          </div>
        </header>

        <DndContext onDragEnd={handleDragEnd}>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Ideas Section */}
            <div className="lg:col-span-1 space-y-4">
              <div className="bg-white/80 backdrop-blur-md rounded-3xl shadow-xl p-6 border border-pink-100">
                <div className="flex items-center justify-between mb-5">
                  <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                    <span className="bg-yellow-100 p-2 rounded-xl">💡</span>
                    <span className="bg-gradient-to-r from-pink-500 to-purple-500 bg-clip-text text-transparent">Our Ideas</span>
                  </h2>
                  <div className="flex gap-2">
                    <button 
                      onClick={pickRandom}
                      className="bg-gradient-to-r from-purple-400 to-pink-400 text-white p-3 rounded-2xl hover:shadow-lg transition-all hover:scale-110 shadow-md"
                      title="Surprise me!"
                    >
                      <Shuffle className="w-5 h-5" />
                    </button>
                    <button 
                      onClick={() => setShowAddModal(true)}
                      className="bg-gradient-to-r from-pink-400 to-rose-400 text-white p-3 rounded-2xl hover:shadow-lg transition-all hover:scale-110 shadow-md"
                    >
                      <Plus className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                {/* Category Pills */}
                <div className="flex flex-wrap gap-2 mb-5">
                  {CATEGORIES.map(cat => (
                    <button
                      key={cat}
                      onClick={() => setSelectedCategory(cat)}
                      className={`px-4 py-2 rounded-full text-sm font-medium transition-all transform hover:scale-105 ${
                        selectedCategory === cat 
                          ? 'bg-gradient-to-r from-pink-400 to-purple-400 text-white shadow-md' 
                          : 'bg-pink-50 text-pink-600 hover:bg-pink-100 border border-pink-200'
                      }`}
                    >
                      {CATEGORY_EMOJIS[cat]} {cat}
                    </button>
                  ))}
                </div>

                {/* Ideas List */}
                <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2">
                  {filteredIdeas.map(idea => (
                    <DraggableIdea key={idea.id} idea={idea} />
                  ))}
                  {filteredIdeas.length === 0 && (
                    <div className="text-center py-8 bg-pink-50/50 rounded-2xl border-2 border-dashed border-pink-200">
                      <span className="text-4xl mb-2 block">✨</span>
                      <p className="text-pink-400 font-medium">No ideas yet! Add some cute ones 💕</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Calendar Section */}
            <div className="lg:col-span-2">
              <div className="bg-white/80 backdrop-blur-md rounded-3xl shadow-xl p-6 border border-purple-100">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                    <span className="bg-purple-100 p-2 rounded-xl">📅</span>
                    <span className="bg-gradient-to-r from-purple-500 to-blue-500 bg-clip-text text-transparent">June 2024</span>
                  </h2>
                  <span className="text-sm text-purple-400 font-medium bg-purple-50 px-4 py-2 rounded-full">Drag ideas here 💕</span>
                </div>

                <div className="grid grid-cols-7 gap-2">
                  {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                    <div key={day} className="text-center text-sm font-bold text-purple-400 py-3 bg-purple-50/50 rounded-xl">
                      {day}
                    </div>
                  ))}
                  
                  {days.map((day, idx) => {
                    const dayIdeas = ideas.filter(i => i.scheduledAt && isSameDay(i.scheduledAt, day));
                    const isWeekend = day.getDay() === 0 || day.getDay() === 6;
                    return (
                      <DroppableDay 
                        key={day.toISOString()} 
                        day={day} 
                        index={idx}
                        ideas={dayIdeas}
                        onUnschedule={unscheduleIdea}
                        isWeekend={isWeekend}
                      />
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </DndContext>

        {/* Add Idea Modal */}
        {showAddModal && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl border-4 border-pink-200 max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-5">
                <h3 className="text-2xl font-bold bg-gradient-to-r from-pink-500 to-purple-500 bg-clip-text text-transparent flex items-center gap-2">
                  <Sparkles className="w-6 h-6 text-pink-500" />
                  New Idea 💡
                </h3>
                <button onClick={() => setShowAddModal(false)} className="text-gray-400 hover:text-pink-500 transition-colors bg-gray-100 p-2 rounded-full hover:bg-pink-100">
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <div className="space-y-4">
                {/* Image Upload */}
                <div className="border-3 border-dashed border-pink-300 rounded-2xl p-6 text-center hover:border-pink-500 hover:bg-pink-50/50 transition-all cursor-pointer group">
                  {previewImage ? (
                    <div className="relative">
                      <img src={previewImage} alt="Preview" className="w-full h-40 object-cover rounded-xl shadow-md" />
                      <button 
                        onClick={() => setPreviewImage(null)}
                        className="absolute top-2 right-2 bg-red-400 text-white p-2 rounded-full hover:bg-red-500 shadow-lg"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <label className="cursor-pointer block group-hover:scale-105 transition-transform">
                      <div className="bg-pink-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-3 group-hover:bg-pink-200 transition-colors">
                        <Upload className="w-8 h-8 text-pink-500" />
                      </div>
                      <span className="text-pink-600 font-medium">Add a cute photo 📸</span>
                      <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                    </label>
                  )}
                </div>

                <input
                  type="text"
                  placeholder="What should we do together? 💕"
                  className="w-full p-4 border-2 border-pink-200 rounded-2xl focus:outline-none focus:border-pink-400 focus:ring-4 focus:ring-pink-100 transition-all text-gray-700 placeholder-gray-400"
                  value={newIdea.title}
                  onChange={e => setNewIdea({...newIdea, title: e.target.value})}
                />
                <textarea
                  placeholder="Tell me more about it... ✨"
                  className="w-full p-4 border-2 border-pink-200 rounded-2xl focus:outline-none focus:border-pink-400 focus:ring-4 focus:ring-pink-100 transition-all h-28 resize-none text-gray-700 placeholder-gray-400"
                  value={newIdea.description}
                  onChange={e => setNewIdea({...newIdea, description: e.target.value})}
                />
                <div className="grid grid-cols-2 gap-3">
                  <select
                    className="p-4 border-2 border-purple-200 rounded-2xl focus:outline-none focus:border-purple-400 focus:ring-4 focus:ring-purple-100 transition-all bg-white text-gray-700"
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
                    className="p-4 border-2 border-purple-200 rounded-2xl focus:outline-none focus:border-purple-400 focus:ring-4 focus:ring-purple-100 transition-all bg-white text-gray-700"
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
                    className="w-full p-4 pl-12 border-2 border-pink-200 rounded-2xl focus:outline-none focus:border-pink-400 focus:ring-4 focus:ring-pink-100 transition-all text-gray-700"
                    value={newIdea.budget}
                    onChange={e => setNewIdea({...newIdea, budget: e.target.value})}
                  />
                </div>
                <button
                  onClick={addIdea}
                  className="w-full p-4 bg-gradient-to-r from-pink-400 via-purple-400 to-blue-400 text-white rounded-2xl hover:shadow-xl transition-all font-bold text-lg transform hover:scale-[1.02] shadow-lg"
                >
                  Add to Our List 💕
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Random Picker Modal */}
        {showRandomModal && randomPick && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-3xl p-8 w-full max-w-md shadow-2xl border-4 border-purple-200 text-center transform animate-bounce-in">
              <div className="text-6xl mb-4 animate-pulse">🎲</div>
              <h3 className="text-2xl font-bold mb-2 text-purple-600">The universe says...</h3>
              <div className={`p-6 rounded-2xl bg-gradient-to-br from-${randomPick.color}-50 to-${randomPick.color}-100 border-2 border-${randomPick.color}-200 mb-6 shadow-inner`}>
                {randomPick.imageUrl && (
                  <img src={randomPick.imageUrl} alt="" className="w-full h-32 object-cover rounded-xl mb-4 shadow-md" />
                )}
                <h4 className="text-xl font-bold text-gray-800 mb-2">{randomPick.title}</h4>
                <p className="text-gray-600 mb-3">{randomPick.description}</p>
                <div className="flex justify-center gap-4 text-sm text-gray-500 bg-white/50 py-2 rounded-full">
                  <span>⏰ {randomPick.duration}</span>
                  {randomPick.budget && <span>💰 ${randomPick.budget}</span>}
                </div>
              </div>
              <button
                onClick={() => setShowRandomModal(false)}
                className="px-8 py-3 bg-gradient-to-r from-pink-400 to-purple-400 text-white rounded-full hover:shadow-lg transition-all font-bold"
              >
                Yay! Let's do it! 🎉
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function DraggableIdea({ idea }: { idea: Idea }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: idea.id,
  });

  const style = transform ? {
    transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
  } : undefined;

  const colorClasses: { [key: string]: string } = {
    rose: 'border-rose-300 bg-rose-50 hover:bg-rose-100',
    pink: 'border-pink-300 bg-pink-50 hover:bg-pink-100',
    purple: 'border-purple-300 bg-purple-50 hover:bg-purple-100',
    blue: 'border-blue-300 bg-blue-50 hover:bg-blue-100',
    cyan: 'border-cyan-300 bg-cyan-50 hover:bg-cyan-100',
    teal: 'border-teal-300 bg-teal-50 hover:bg-teal-100',
    emerald: 'border-emerald-300 bg-emerald-50 hover:bg-emerald-100',
    amber: 'border-amber-300 bg-amber-50 hover:bg-amber-100',
    orange: 'border-orange-300 bg-orange-50 hover:bg-orange-100',
    red: 'border-red-300 bg-red-50 hover:bg-red-100',
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={`p-4 bg-white border-l-4 ${colorClasses[idea.color] || colorClasses.pink} rounded-2xl cursor-move hover:shadow-lg transition-all transform hover:scale-[1.02] ${isDragging ? 'opacity-60 rotate-3 scale-105 shadow-2xl' : 'shadow-md'}`}
    >
      {idea.imageUrl && (
        <img src={idea.imageUrl} alt="" className="w-full h-24 object-cover rounded-xl mb-3 shadow-sm" />
      )}
      <h3 className="font-bold text-gray-800 text-sm mb-1">{idea.title}</h3>
      <div className="flex items-center justify-between mt-2 text-xs text-gray-500">
        <span className="flex items-center gap-1 bg-white/70 px-2 py-1 rounded-full">
          <Clock className="w-3 h-3" />
          {idea.duration || 'TBD'}
        </span>
        {idea.budget && <span className="text-pink-600 font-bold bg-pink-100 px-2 py-1 rounded-full">${idea.budget}</span>}
      </div>
    </div>
  );
}

function DroppableDay({ day, index, ideas, onUnschedule, isWeekend }: { 
  day: Date; 
  index: number; 
  ideas: Idea[];
  onUnschedule: (id: string) => void;
  isWeekend: boolean;
}) {
  const { isOver, setNodeRef } = useDroppable({
    id: `day-${index}`,
  });

  return (
    <div
      ref={setNodeRef}
      className={`min-h-[100px] p-2 rounded-2xl border-2 transition-all ${isWeekend ? 'bg-pink-50/30' : 'bg-white/40'} ${isOver ? 'border-pink-400 bg-pink-100 shadow-inner scale-[1.02]' : 'border-pink-100 hover:border-pink-200'}`}
    >
      <div className={`text-sm font-bold mb-1 ${isWeekend ? 'text-pink-500' : 'text-gray-600'}`}>{format(day, 'd')}</div>
      <div className="space-y-1">
        {ideas.map(idea => (
          <div 
            key={idea.id}
            onClick={() => onUnschedule(idea.id)}
            className="text-xs p-2 rounded-xl bg-white border border-pink-200 shadow-sm cursor-pointer hover:shadow-md hover:border-pink-300 transition-all transform hover:scale-105"
          >
            <div className="font-bold text-gray-700 truncate">{idea.title}</div>
            {idea.budget && <div className="text-pink-500 font-bold text-[10px]">${idea.budget}</div>}
          </div>
        ))}
      </div>
    </div>
  );
}