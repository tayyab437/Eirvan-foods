import React, { useState } from 'react';
import { useStore } from '../context/StoreContext';
import { BlogPost } from '../types';
import {
  Calendar,
  Clock,
  ArrowRight,
  X,
  Share2,
  Check,
  Feather,
} from 'lucide-react';

export const BlogView: React.FC = () => {
  const { blogs } = useStore();
  const [activeArticle, setActiveArticle] = useState<BlogPost | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
      {/* Header */}
      <div className="text-center max-w-2xl mx-auto mb-16">
        <div className="inline-flex items-center space-x-2 text-[11px] font-mono tracking-widest uppercase text-[#B69A62] mb-3">
          <Feather className="w-3.5 h-3.5" />
          <span>The Mediterranean Pantry Journal</span>
        </div>
        <h1 className="font-serif text-3xl sm:text-5xl text-[#302A25] leading-tight">
          Botanical Lore, Nutritional Science & Pantry Rituals
        </h1>
        <p className="text-sm text-[#302A25]/70 mt-4 leading-relaxed font-light">
          Field notes on ancient Unani healing formulations, cold stone-grinding practices, and seasonal harvests from the high orchards of northern Pakistan.
        </p>
      </div>

      {/* Blog Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 lg:gap-10">
        {blogs.map((post) => (
          <article
            key={post.id}
            onClick={() => setActiveArticle(post)}
            className="group bg-[#FFFFFF] border border-[#E7DDCA] overflow-hidden hover:border-[#344B36]/50 transition-all duration-300 flex flex-col cursor-pointer"
          >
            <div className="aspect-16/10 w-full overflow-hidden bg-[#F7F4EC] relative">
              <img
                src={post.imageUrl}
                alt={post.title}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
              />
              <span className="absolute top-3 left-3 bg-[#344B36] text-[#F7F4EC] text-[10px] uppercase font-mono tracking-wider px-2.5 py-1">
                {post.category}
              </span>
            </div>

            <div className="p-7 flex-1 flex flex-col justify-between">
              <div>
                <div className="flex items-center space-x-3 text-[11px] font-mono text-[#302A25]/50 mb-3">
                  <span className="flex items-center space-x-1">
                    <Calendar className="w-3 h-3 text-[#B69A62]" />
                    <span>{post.date}</span>
                  </span>
                  <span>•</span>
                  <span className="flex items-center space-x-1">
                    <Clock className="w-3 h-3 text-[#B69A62]" />
                    <span>{post.readTime}</span>
                  </span>
                </div>

                <h3 className="font-serif text-xl text-[#302A25] group-hover:text-[#344B36] transition-colors leading-snug mb-3">
                  {post.title}
                </h3>

                <p className="text-xs text-[#302A25]/70 line-clamp-3 leading-relaxed mb-6 font-light">
                  {post.excerpt}
                </p>
              </div>

              <div className="pt-4 border-t border-[#E7DDCA]/70 flex items-center justify-between text-xs">
                <span className="text-[11px] text-[#302A25]/60 font-mono">By {post.author}</span>
                <span className="inline-flex items-center space-x-1.5 text-[#344B36] font-medium group-hover:text-[#B96F50] transition-colors">
                  <span>Read Article</span>
                  <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                </span>
              </div>
            </div>
          </article>
        ))}
      </div>

      {/* Reader Modal */}
      {activeArticle && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-[#302A25]/60 backdrop-blur-xs flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-200">
          <div className="relative w-full max-w-3xl bg-[#FFFFFF] border border-[#E7DDCA] shadow-2xl overflow-hidden my-auto max-h-[90vh] flex flex-col">
            {/* Modal Header */}
            <div className="px-6 py-4 bg-[#F7F4EC] border-b border-[#E7DDCA] flex items-center justify-between">
              <span className="text-xs font-mono uppercase tracking-widest text-[#B69A62]">
                {activeArticle.category}
              </span>
              <div className="flex items-center space-x-2">
                <button
                  onClick={handleShare}
                  className="p-2 border border-[#E7DDCA] hover:bg-white text-[#302A25] transition-colors cursor-pointer"
                  title="Share link"
                >
                  {copiedLink ? (
                    <Check className="w-4 h-4 text-[#344B36]" />
                  ) : (
                    <Share2 className="w-4 h-4" />
                  )}
                </button>
                <button
                  onClick={() => setActiveArticle(null)}
                  className="p-2 border border-[#E7DDCA] hover:bg-white text-[#302A25] transition-colors cursor-pointer"
                  aria-label="Close"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="overflow-y-auto flex-1 p-6 sm:p-10 space-y-6">
              <div className="aspect-16/9 overflow-hidden bg-[#F7F4EC] border border-[#E7DDCA]">
                <img
                  src={activeArticle.imageUrl}
                  alt=""
                  className="w-full h-full object-cover"
                />
              </div>

              <div>
                <h2 className="font-serif text-2xl sm:text-4xl text-[#302A25] leading-tight">
                  {activeArticle.title}
                </h2>
                <div className="flex items-center space-x-3 text-xs font-mono text-[#302A25]/50 mt-3">
                  <span>Author: {activeArticle.author}</span>
                  <span>•</span>
                  <span>{activeArticle.date}</span>
                  <span>•</span>
                  <span>{activeArticle.readTime}</span>
                </div>
              </div>

              {/* Formatted Content */}
              <div className="text-sm text-[#302A25]/85 leading-relaxed whitespace-pre-line space-y-4 border-t border-[#E7DDCA] pt-6 font-light">
                {activeArticle.content}
              </div>

              {/* Tags */}
              <div className="pt-4 border-t border-[#E7DDCA] flex flex-wrap gap-2">
                {activeArticle.tags.map((tag) => (
                  <span
                    key={tag}
                    className="text-[11px] font-mono px-3 py-1 bg-[#F7F4EC] text-[#302A25]/70 border border-[#E7DDCA]"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

