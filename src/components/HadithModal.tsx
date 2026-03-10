import React, { useState } from 'react';
import { X, Book, ChevronRight, ChevronLeft, Search, Sparkles } from 'lucide-react';
import { HADITH_COLLECTIONS, type Hadith } from '../data/hadiths';

interface HadithModalProps {
  isOpen: boolean;
  onClose: () => void;
  darkMode: boolean;
}

export const HadithModal: React.FC<HadithModalProps> = ({ isOpen, onClose, darkMode }) => {
  const [selectedCollection, setSelectedCollection] = useState<string | null>(null);
  const [selectedBook, setSelectedBook] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const collections = HADITH_COLLECTIONS;
  const currentCollection = collections.find(c => c.id === selectedCollection);
  
  const books = currentCollection 
    ? Array.from(new Set(currentCollection.hadiths.map(h => h.book)))
    : [];

  const filteredHadiths = currentCollection
    ? currentCollection.hadiths.filter(h => {
        const matchesBook = !selectedBook || h.book === selectedBook;
        const matchesSearch = h.text.toLowerCase().includes(searchQuery.toLowerCase()) || 
                             h.narrator.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesBook && matchesSearch;
      })
    : [];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        onClick={onClose}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
      />
      
      <div
        className={`relative w-full max-w-4xl max-h-[90vh] overflow-hidden rounded-[40px] shadow-2xl flex flex-col ${
          darkMode ? 'bg-deenly-dark-surface border border-white/10' : 'bg-deenly-cream border border-deenly-gold/20'
        }`}
      >
        {/* Header */}
        <div className="p-6 border-b border-deenly-gold/10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-deenly-gold/10 text-deenly-gold flex items-center justify-center">
              <Book size={20} />
            </div>
            <div>
              <h2 className="text-xl font-bold tracking-tight">Biblioteca de Hadices</h2>
              <p className="text-[10px] uppercase tracking-[0.2em] font-bold text-deenly-gold/60">Sabiduría del Profeta (SAW)</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-deenly-gold/10 rounded-xl transition-colors text-deenly-gold"
          >
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden flex flex-col sm:flex-row">
          {/* Sidebar / Selectors */}
          <div className={`w-full sm:w-72 border-r border-deenly-gold/10 overflow-y-auto p-4 space-y-6 ${
            darkMode ? 'bg-black/20' : 'bg-white/20'
          }`}>
            {/* Collections */}
            <div>
              <h3 className="text-[10px] uppercase tracking-widest font-bold text-deenly-gold mb-3 px-2">Colecciones</h3>
              <div className="space-y-1">
                {collections.map(c => (
                  <button
                    key={c.id}
                    onClick={() => {
                      setSelectedCollection(c.id);
                      setSelectedBook(null);
                    }}
                    className={`w-full text-left px-4 py-3 rounded-xl text-xs font-bold transition-colors flex items-center justify-between ${
                      selectedCollection === c.id 
                        ? 'bg-deenly-gold text-white shadow-lg shadow-deenly-gold/20' 
                        : 'hover:bg-deenly-gold/5 opacity-70 hover:opacity-100'
                    }`}
                  >
                    {c.name}
                    {selectedCollection === c.id && <ChevronRight size={14} />}
                  </button>
                ))}
              </div>
            </div>

            {/* Books */}
            {selectedCollection && (
              <div>
                <h3 className="text-[10px] uppercase tracking-widest font-bold text-deenly-gold mb-3 px-2">Libros</h3>
                <div className="space-y-1">
                  <button
                    onClick={() => setSelectedBook(null)}
                    className={`w-full text-left px-4 py-2 rounded-xl text-[10px] font-bold transition-colors ${
                      selectedBook === null 
                        ? 'bg-deenly-gold/20 text-deenly-gold' 
                        : 'hover:bg-deenly-gold/5 opacity-70 hover:opacity-100'
                    }`}
                  >
                    Todos los libros
                  </button>
                  {books.map(book => (
                    <button
                      key={book}
                      onClick={() => setSelectedBook(book)}
                      className={`w-full text-left px-4 py-2 rounded-xl text-[10px] font-bold transition-colors ${
                        selectedBook === book 
                          ? 'bg-deenly-gold/20 text-deenly-gold' 
                          : 'hover:bg-deenly-gold/5 opacity-70 hover:opacity-100'
                      }`}
                    >
                      {book}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Hadith List */}
          <div className="flex-1 flex flex-col overflow-hidden">
            {selectedCollection ? (
              <>
                <div className="p-4 border-b border-deenly-gold/10">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-deenly-gold/40" size={16} />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Buscar en esta colección..."
                      className={`w-full pl-10 pr-4 py-2 rounded-xl text-sm border focus:outline-none focus:ring-2 focus:ring-deenly-gold/30 ${
                        darkMode ? 'bg-deenly-dark-bg border-deenly-gold/20 text-white' : 'bg-white border-deenly-gold/10 text-deenly-green'
                      }`}
                    />
                  </div>
                </div>
                <div className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-hide">
                  {filteredHadiths.length > 0 ? (
                    filteredHadiths.map((hadith) => (
                      <div
                        key={hadith.id}
                        className={`p-6 rounded-3xl border ${
                          darkMode ? 'bg-deenly-dark-bg/40 border-deenly-gold/10' : 'bg-white border-deenly-gold/10'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center gap-2">
                            <Sparkles size={14} className="text-deenly-gold" />
                            <span className="text-[10px] font-bold uppercase tracking-widest text-deenly-gold">Hadiz {hadith.number}</span>
                          </div>
                          <span className="text-[10px] opacity-40 font-bold uppercase tracking-tighter">{hadith.reference}</span>
                        </div>
                        <p className="text-sm leading-relaxed italic mb-4">"{hadith.text}"</p>
                        <div className="flex items-center justify-between pt-4 border-t border-deenly-gold/5">
                          <span className="text-[10px] font-bold text-deenly-gold uppercase tracking-widest">Narrado por: {hadith.narrator}</span>
                          <span className="text-[10px] opacity-40 uppercase font-bold">{hadith.book}</span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="flex flex-col items-center justify-center h-full opacity-30 text-center p-8">
                      <Book size={48} className="mb-4" />
                      <p className="text-sm font-bold uppercase tracking-widest">No se encontraron hadices</p>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center p-12 text-center opacity-40">
                <Book size={64} className="mb-6 text-deenly-gold" />
                <h3 className="text-xl font-bold mb-2">Selecciona una colección</h3>
                <p className="text-sm max-w-xs">Explora las enseñanzas del Profeta Muhammad (SAW) a través de las colecciones más auténticas.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
