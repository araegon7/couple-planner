'use client';

import { useState, useEffect } from 'react';
import { DndContext, DragEndEvent, useDraggable, useDroppable } from '@dnd-kit/core';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay } from 'date-fns';
import { Plus, Calendar, Lightbulb, Clock, DollarSign, Shuffle, X, Upload } from 'lucide-react';

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
  { id: '1', title: 'Desert Safari', description: 'Dune bashing and dinner', duration: '6 hours', category: 'adventure', budget: 300, imageUrl: null, scheduledAt: null, isScheduled: false, color: 'orange' },
  { id: '2', title: 'Burj Khalifa', description: 'Sunset at the top', duration: '3 hours', category: 'sightseeing', budget: 150, imageUrl: null, scheduledAt: null, isScheduled: false, color: 'blue' },
  { id: '3', title: 'Beach Day', description: 'JBR Beach relaxation', duration: 'full day', category: 'chill', budget: 50, imageUrl: null, scheduledAt: null, isScheduled: false, color: 'cyan' },
];

const CATEGORIES = ['all', 'food', 'adventure', 'chill', 'sightseeing', 'romantic'];
const COLORS = ['red', 'orange', 'amber', 'green', 'emerald', 'teal', 'blue', 'indigo', 'purple', 'pink'];

export default function CouplePlanner() {
  const [ideas, setIdeas] = useState<Idea[]>(INITIAL_IDEAS);
  const [currentMonth, setCurrentMonth] = useState(new Date(2024, 5, 1));
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
      title: newIdea.title,
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
    <div className="min-h-screen bg-gradient-to-br from-rose-50 via-purple-50 to-indigo-50 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        <header className="mb-8 text-center">
          <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-rose-400 to-purple-600 bg-clip-text text-transparent mb-2">
            Our Dubai Adventure 💕
          </h1>
          <p className="text-gray-600 mb-4">June 2024 • 3 weeks of memories waiting to happen</p>
          
          <div className="inline-flex items-center gap-2 bg-white/80 backdrop-blur-sm px-6 py-3 rounded-full shadow-lg border border-white/50">
            <DollarSign className="w-5 h-5 text-green-500" />
            <span className="font-semibold text-gray-700">Total Budget:</span>
            <span className="text-2xl font-bold text-green-600">${totalBudget}</span>
            <span className="text-gray-400 text-sm">/ ${ideas.reduce((sum, i) => sum + (i.budget || 0), 0)} planned</span>
          </div>
        </header>

        <DndContext onDragEnd={handleDragEnd}>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            <div className="lg:col-span-1 space-y-4">
              <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl p-6 border border-white/50">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                    <Lightbulb className="w-6 h-6 text-yellow-500" />
                    Ideas
                  </h2>
                  <div className="flex gap-2">
                    <button 
                      onClick={pickRandom}
                      className="bg-gradient-to-r from-purple-400 to-pink-500 text-white p-2 rounded-full hover:shadow-lg transition-all hover:scale-105"
                      title="Surprise me!"
                    >
                      <Shuffle className="w-5 h-5" />
                    </button>
                    <button 
                      onClick={() => setShowAddModal(true)}
                      className="bg-gradient-to-r from-rose-400 to-purple-500 text-white p-2 rounded-full hover:shadow-lg transition-all hover:scale-105"
                    >
                      <Plus className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 mb-4">
                  {CATEGORIES.map(cat => (
                    <button
                      key={cat}
                      onClick={() => setSelectedCategory(cat)}
                      className={`px-3 py-1 rounded-full text-sm capitalize transition-all ${
                        selectedCategory === cat 
                          ? 'bg-purple-500 text-white' 
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>

                <div className="space-y-3 max-h-[600px] overflow-y-auto">
                  {filteredIdeas.map(idea => (
                    <DraggableIdea key={idea.id} idea={idea} />
                  ))}
                  {filteredIdeas.length === 0 && (
                    <p className="text-gray-400 text-center py-8">No ideas yet! Add some ✨</p>
                  )}
                </div>
              </div>
            </div>

            <div className="lg:col-span-2">
              <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl p-6 border border-white/50">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                    <Calendar className="w-6 h-6 text-purple-500" />
                    June 2024
                  </h2>
                </div>

                <div className="grid grid-cols-7 gap-2">
                  {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                    <div key={day} className="text-center text-sm font-semibold text-gray-500 py-2">
                      {day}
                    </div>
                  ))}
                  
                  {days.map((day, idx) => {
                    const dayIdeas = ideas.filter(i => i.scheduledAt && isSameDay(i.scheduledAt, day));
                    return (
                      <DroppableDay 
                        key={day.toISOString()} 
                        day={day} 
                        index={idx}
                        ideas={dayIdeas}
                        onUnschedule={unscheduleIdea}
                      />
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </DndContext>

        {showAddModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-bold">New Idea 💡</h3>
                <button onClick={() => setShowAddModal(false)} className="text-gray-400 hover:text-gray-600">
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <div className="space-y-4">
                <div className="border-2 border-dashed border-gray-300 rounded-xl p-4 text-center hover:border-purple-400 transition-colors">
                  {previewImage ? (
                    <div className="relative">
                      <img src={previewImage} alt="Preview" className="w-full h-32 object-cover rounded-lg" />
                      <button 
                        onClick={() => setPreviewImage(null)}
                        className="absolute top-1 right-1 bg-red-500 text-white p-1 rounded-full"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ) : (
                    <label className="cursor-pointer block">
                      <Upload className="w-8 h-8 mx-auto text-gray-400 mb-2" />
                      <span className="text-sm text-gray-500">Click to upload photo</span>
                      <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                    </label>
                  )}
                </div>

                <input
                  type="text"
                  placeholder="What do you want to do?"
                  className="w-full p-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500"
                  value={newIdea.title}
                  onChange={e => setNewIdea({...newIdea, title: e.target.value})}
                />
                <textarea
                  placeholder="Details..."
                  className="w-full p-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 h-24 resize-none"
                  value={newIdea.description}
                  onChange={e => setNewIdea({...newIdea, description: e.target.value})}
                />
                <div className="grid grid-cols-2 gap-3">
                  <select
                    className="p-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500"
                    value={newIdea.duration}
                    onChange={e => setNewIdea({...newIdea, duration: e.target.value})}
                  >
                    <option value="">Duration</option>
                    <option value="1-2 hours">1-2 hours</option>
                    <option value="Half day">Half day</option>
                    <option value="Full day">Full day</option>
                    <option value="Evening">Evening</option>
                  </select>
                  <select
                    className="p-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500"
                    value={newIdea.category}
                    onChange={e => setNewIdea({...newIdea, category: e.target.value})}
                  >
                    {CATEGORIES.filter(c => c !== 'all').map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                  <input
                    type="number"
                    placeholder="Budget (AED)"
                    className="w-full p-3 pl-10 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500"
                    value={newIdea.budget}
                    onChange={e => setNewIdea({...newIdea, budget: e.target.value})}
                  />
                </div>
                <button
                  onClick={addIdea}
                  className="w-full p-3 bg-gradient-to-r from-rose-400 to-purple-500 text-white rounded-xl hover:shadow-lg transition-all font-semibold"
                >
                  Add Idea
                </button>
              </div>
            </div>
          </div>
        )}

        {showRandomModal && randomPick && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl p-8 w-full max-w-md shadow-2xl text-center">
              <div className="text-4xl mb-4">🎲</div>
              <h3 className="text-2xl font-bold mb-2">We should do...</h3>
              <div className={`p-6 rounded-xl bg-${randomPick.color}-50 border-2 border-${randomPick.color}-200 mb-4`}>
                {randomPick.imageUrl && (
                  <img src={randomPick.imageUrl} alt="" className="w-full h-32 object-cover rounded-lg mb-3" />
                )}
                <h4 className="text-xl font-bold text-gray-800">{randomPick.title}</h4>
                <p className="text-gray-600 mt-1">{randomPick.description}</p>
                <div className="flex justify-center gap-4 mt-3 text-sm text-gray-500">
                  <span>{randomPick.duration}</span>
                  {randomPick.budget && <span>${randomPick.budget}</span>}
                </div>
              </div>
              <button
                onClick={() => setShowRandomModal(false)}
                className="px-6 py-2 bg-gray-100 text-gray-700 rounded-full hover:bg-gray-200 transition-colors"
              >
                Cool!
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

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={`p-3 bg-white border-l-4 border-${idea.color}-400 rounded-xl cursor-move hover:shadow-md transition-all ${
        isDragging ? 'opacity-50 rotate-3 scale-105' : ''
      }`}
    >
      {idea.imageUrl && (
        <img src={idea.imageUrl} alt="" className="w-full h-20 object-cover rounded-lg mb-2" />
      )}
      <h3 className="font-semibold text-gray-800 text-sm">{idea.title}</h3>
      <div className="flex items-center justify-between mt-1 text-xs text-gray-500">
        <span className="flex items-center gap-1">
          <Clock className="w-3 h-3" />
          {idea.duration || 'TBD'}
        </span>
        {idea.budget && <span className="text-green-600 font-medium">${idea.budget}</span>}
      </div>
    </div>
  );
}

function DroppableDay({ day, index, ideas, onUnschedule }: { 
  day: Date; 
  index: number; 
  ideas: Idea[];
  onUnschedule: (id: string) => void;
}) {
  const { isOver, setNodeRef } = useDroppable({
    id: `day-${index}`,
  });

  return (
    <div
      ref={setNodeRef}
      className={`min-h-[100px] p-2 rounded-xl border-2 transition-all ${
        isOver ? 'border-purple-400 bg-purple-50' : 'border-gray-100 bg-gray-50/50'
      }`}
    >
      <div className="text-sm font-medium text-gray-700 mb-1">{format(day, 'd')}</div>
      <div className="space-y-1">
        {ideas.map(idea => (
          <div 
            key={idea.id}
            onClick={() => onUnschedule(idea.id)}
            className="text-xs p-2 rounded-lg bg-white border border-gray-200 shadow-sm cursor-pointer hover:shadow-md transition-all"
          >
            <div className="font-medium truncate">{idea.title}</div>
            {idea.budget && <div className="text-green-600">${idea.budget}</div>}
          </div>
        ))}
      </div>
    </div>
  );
}