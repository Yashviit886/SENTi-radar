import { useState } from 'react';
import { Search, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';

interface TopicSearchProps {
  onSearch: (query: string) => void;
  isAnalyzing?: boolean;
}

const suggestions = ['AI regulation', 'Climate change', 'iPhone', 'Food prices', 'Bitcoin'];

const TopicSearch = ({ onSearch, isAnalyzing }: TopicSearchProps) => {
  const [query, setQuery] = useState('');
  const [focused, setFocused] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim() && !isAnalyzing) onSearch(query.trim());
  };

  const handleSuggestionClick = (s: string) => {
    setQuery(s);
    if (!isAnalyzing) onSearch(s);
  };

  return (
    <div className="space-y-2">
      <motion.form
        onSubmit={handleSubmit}
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className={`relative flex items-center gap-3 rounded-lg border px-4 py-3 transition-all duration-200 ${
          focused ? 'border-primary bg-card shadow-sm' : 'border-border bg-card'
        }`}
      >
        <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
        <input
          type="text"
          placeholder="Search topic, hashtag, brand, or event..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none"
          disabled={isAnalyzing}
        />
        <button
          type="submit"
          disabled={isAnalyzing || !query.trim()}
          className="flex items-center gap-1.5 rounded bg-primary px-4 py-2 text-xs font-medium text-primary-foreground transition-colors hover:bg-primary/90 active:scale-[0.98] disabled:opacity-50"
        >
          {isAnalyzing ? (
            <>
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Analyzing
            </>
          ) : (
            'Analyze'
          )}
        </button>
      </motion.form>

      <div className="flex flex-wrap gap-1.5">
        {suggestions.map((s) => (
          <button
            key={s}
            onClick={() => handleSuggestionClick(s)}
            disabled={isAnalyzing}
            className="rounded border border-border bg-card px-2.5 py-1 text-[11px] text-muted-foreground transition-colors hover:bg-accent hover:text-foreground disabled:opacity-50"
          >
            {s}
          </button>
        ))}
      </div>
    </div>
  );
};

export default TopicSearch;
