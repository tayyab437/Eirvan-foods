import React from 'react';
import { useStore } from '../context/StoreContext';
import { ArrowRight } from 'lucide-react';

export const CategoryGrid: React.FC = () => {
  const { setActiveView, setSelectedCategory } = useStore();

  const handleCategoryClick = (catId: string) => {
    setSelectedCategory(catId);
    setActiveView('shop');
    window.scrollTo({ top: 350, behavior: 'smooth' });
  };

  const collections = [
    {
      id: 'mixed',
      title: 'Mixed Dry Fruits',
      subtitle: 'Harmonious blends of mountain nuts, seeds, and sun-dried fruits',
      image: 'https://images.unsplash.com/photo-1546548970-71785318a17b?auto=format&fit=crop&w=1000&q=80',
      tag: 'Curated Blends',
      span: 'lg:col-span-7',
      aspect: 'aspect-16/10 sm:aspect-16/9',
    },
    {
      id: 'nuts',
      title: 'Premium Nuts',
      subtitle: 'Single-origin Kashmiri Mamra almonds, Gilgit walnuts, and King cashews',
      image: 'https://images.unsplash.com/photo-1508746829417-e6f548d8d6ed?auto=format&fit=crop&w=800&q=80',
      tag: 'Single-Origin',
      span: 'lg:col-span-5',
      aspect: 'aspect-4/3 lg:aspect-auto lg:h-full',
    },
    {
      id: 'powders',
      title: 'Dry Fruit Powders & Panjiri',
      subtitle: 'Nutrient-dense stone-ground preparations for milk, tea, and convalescence',
      image: '/src/assets/images/dry_fruit_powders_culinary_1794054053020.jpg',
      tag: 'Stone-Ground',
      span: 'lg:col-span-4',
      aspect: 'aspect-4/3',
    },
    {
      id: 'dates-raisins',
      title: 'Dates & Vine Raisins',
      subtitle: 'Sacred Madinah Ajwa dates and sun-dried Kandahari golden raisins',
      image: 'https://images.unsplash.com/photo-1598030304671-5aa1d6f21128?auto=format&fit=crop&w=800&q=80',
      tag: 'Sun-Cured',
      span: 'lg:col-span-4',
      aspect: 'aspect-4/3',
    },
    {
      id: 'gift-boxes',
      title: 'Gift Collections',
      subtitle: 'Handcrafted Chiniot pinewood chests and royal emerald velvet presentations',
      image: '/src/assets/images/luxury_olive_gift_box_1794054054136.jpg',
      tag: 'Artisanal Keepsakes',
      span: 'lg:col-span-4',
      aspect: 'aspect-4/3',
    },
  ];

  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-20">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-10 pb-4 border-b border-[#E7DDCA] gap-4">
        <div>
          <span className="text-xs uppercase tracking-[0.25em] font-semibold text-[#A5AD91] block mb-1">
            Curated Pantry
          </span>
          <h2 className="font-serif text-3xl sm:text-4xl text-[#302A25]">
            Shop by Collection
          </h2>
        </div>
        <button
          onClick={() => {
            setSelectedCategory('all');
            setActiveView('shop');
          }}
          className="text-xs uppercase tracking-widest font-bold text-[#344B36] hover:text-[#B69A62] flex items-center space-x-1.5 transition-colors cursor-pointer"
        >
          <span>View All Selections</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>

      {/* Varied Image-Led Editorial Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-6">
        {collections.map((item) => (
          <div
            key={item.id}
            onClick={() => handleCategoryClick(item.id)}
            className={`${item.span} group relative rounded-3xl overflow-hidden border border-[#E7DDCA] bg-white shadow-xs hover:shadow-xl transition-all duration-300 cursor-pointer flex flex-col justify-between`}
          >
            <div className={`${item.aspect} w-full overflow-hidden bg-[#F7F4EC] relative`}>
              <img
                src={item.image}
                alt={item.title}
                className="w-full h-full object-cover group-hover:scale-103 transition-transform duration-700"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-transparent" />

              <div className="absolute top-4 left-4">
                <span className="text-[10px] uppercase tracking-widest font-semibold px-2.5 py-1 rounded-md bg-white/90 text-[#302A25] backdrop-blur-xs">
                  {item.tag}
                </span>
              </div>

              <div className="absolute bottom-4 left-4 right-4 text-white">
                <h3 className="font-serif text-xl sm:text-2xl text-[#F7F4EC] leading-tight mb-1 group-hover:text-[#B69A62] transition-colors">
                  {item.title}
                </h3>
                <p className="text-xs text-[#E7DDCA]/90 line-clamp-2 max-w-md font-sans">
                  {item.subtitle}
                </p>
                <div className="mt-2.5 inline-flex items-center text-xs font-bold uppercase tracking-wider text-[#B69A62] group-hover:translate-x-1 transition-transform">
                  <span>Explore Collection</span>
                  <ArrowRight className="w-3.5 h-3.5 ml-1" />
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};
