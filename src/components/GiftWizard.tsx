import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../context/StoreContext';
import { Gift, Heart, User, Sparkles, ArrowRight, ChevronLeft, CheckCircle2, ShoppingBag } from 'lucide-react';

const GiftWizard: React.FC = () => {
  const [step, setStep] = useState(1);
  const [selections, setSelections] = useState({
    occasion: '',
    recipient: '',
    budget: '',
  });
  const navigate = useNavigate();
  const { products } = useStore();

  const OCCASIONS = [
    { id: 'wedding', label: 'Wedding / Mehndi', icon: Heart },
    { id: 'corporate', label: 'Corporate Gifting', icon: Sparkles },
    { id: 'family', label: 'Family & Friends', icon: User },
    { id: 'wellness', label: 'Health & Wellness', icon: Gift },
  ];

  const RECIPIENTS = [
    { id: 'parents', label: 'Parents / Elders' },
    { id: 'friends', label: 'Friends' },
    { id: 'colleagues', label: 'Colleagues / Clients' },
    { id: 'someone-special', label: 'Someone Special' },
  ];

  const BUDGETS = [
    { id: 'under-3000', label: 'Under Rs. 3,000', max: 3000 },
    { id: '3000-6000', label: 'Rs. 3,000 - Rs. 6,000', max: 6000 },
    { id: 'above-6000', label: 'Premium (Above Rs. 6,000)', max: 50000 },
  ];

  const handleSelect = (field: keyof typeof selections, value: string) => {
    setSelections(prev => ({ ...prev, [field]: value }));
    if (step < 3) setStep(step + 1);
    else setStep(4); // Final step: Results
  };

  const getRecommendations = () => {
    const budgetMax = BUDGETS.find(b => b.id === selections.budget)?.max || 50000;
    
    return products.filter(p => {
      const price = p.variants[0].salePrice || p.variants[0].price;
      const matchesBudget = price <= budgetMax;
      
      // Basic logic for matching categories based on occasion
      if (selections.occasion === 'wedding' || selections.occasion === 'corporate') {
        return matchesBudget && (p.category === 'gift-boxes' || p.category === 'mixed');
      }
      if (selections.occasion === 'wellness') {
        return matchesBudget && (p.category === 'powders' || p.category === 'nuts');
      }
      
      return matchesBudget;
    }).slice(0, 3);
  };

  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <div className="space-y-6 animate-fade-in">
            <h2 className="text-2xl font-serif font-bold text-[#244C37] text-center">What is the occasion?</h2>
            <div className="grid grid-cols-2 gap-4">
              {OCCASIONS.map(item => (
                <button
                  key={item.id}
                  onClick={() => handleSelect('occasion', item.id)}
                  className="p-6 bg-white border border-[#B69A62]/20 rounded-2xl flex flex-col items-center gap-3 hover:border-[#B69A62] hover:bg-[#F7F4EC] transition-all group"
                >
                  <item.icon className="w-8 h-8 text-[#B69A62] group-hover:scale-110 transition-transform" />
                  <span className="text-sm font-bold text-[#244C37]">{item.label}</span>
                </button>
              ))}
            </div>
          </div>
        );
      case 2:
        return (
          <div className="space-y-6 animate-fade-in">
            <h2 className="text-2xl font-serif font-bold text-[#244C37] text-center">Who is it for?</h2>
            <div className="grid grid-cols-1 gap-3">
              {RECIPIENTS.map(item => (
                <button
                  key={item.id}
                  onClick={() => handleSelect('recipient', item.id)}
                  className="p-4 bg-white border border-[#B69A62]/20 rounded-xl text-left font-bold text-[#244C37] hover:border-[#B69A62] hover:bg-[#F7F4EC] transition-all flex justify-between items-center group"
                >
                  {item.label}
                  <ArrowRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-all translate-x--2 group-hover:translate-x-0" />
                </button>
              ))}
            </div>
          </div>
        );
      case 3:
        return (
          <div className="space-y-6 animate-fade-in">
            <h2 className="text-2xl font-serif font-bold text-[#244C37] text-center">Select your budget range</h2>
            <div className="grid grid-cols-1 gap-3">
              {BUDGETS.map(item => (
                <button
                  key={item.id}
                  onClick={() => handleSelect('budget', item.id)}
                  className="p-4 bg-white border border-[#B69A62]/20 rounded-xl text-left font-bold text-[#244C37] hover:border-[#B69A62] hover:bg-[#F7F4EC] transition-all flex justify-between items-center group"
                >
                  {item.label}
                  <div className="w-6 h-6 rounded-full border border-[#B69A62]/30 flex items-center justify-center group-hover:bg-[#B69A62] group-hover:border-[#B69A62] transition-colors">
                    <div className="w-2 h-2 rounded-full bg-white opacity-0 group-hover:opacity-100"></div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        );
      case 4:
        const recommendations = getRecommendations();
        return (
          <div className="space-y-6 animate-fade-in">
            <div className="text-center">
              <div className="w-12 h-12 bg-[#244C37]/10 rounded-full flex items-center justify-center mx-auto mb-3">
                <CheckCircle2 className="w-6 h-6 text-[#244C37]" />
              </div>
              <h2 className="text-2xl font-serif font-bold text-[#244C37]">Perfect! Here are our top picks:</h2>
              <p className="text-sm text-gray-500 mt-1">Based on your preferences for {OCCASIONS.find(o => o.id === selections.occasion)?.label}</p>
            </div>

            <div className="space-y-4">
              {recommendations.map(p => (
                <div key={p.id} className="p-4 bg-white border border-[#B69A62]/10 rounded-2xl flex items-center gap-4 shadow-sm hover:shadow-md transition-shadow">
                  <img src={p.imageUrl} alt={p.name} className="w-20 h-20 rounded-xl object-cover" />
                  <div className="flex-1 min-w-0">
                    <h3 className="font-serif font-bold text-[#244C37] truncate">{p.name}</h3>
                    <p className="text-xs text-gray-500 line-clamp-1">{p.shortDescription}</p>
                    <div className="mt-1 font-bold text-[#B69A62]">Rs. {(p.variants[0].salePrice || p.variants[0].price).toLocaleString()}</div>
                  </div>
                  <button 
                    onClick={() => navigate(`/product/${p.slug}`)}
                    className="p-3 bg-[#244C37] text-white rounded-xl hover:bg-[#1a3829] transition-colors"
                  >
                    <ShoppingBag className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>

            <button
              onClick={() => setStep(1)}
              className="w-full py-4 text-[#244C37] font-bold text-sm hover:underline"
            >
              Start Over
            </button>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="max-w-xl mx-auto bg-[#F7F4EC] rounded-3xl border border-[#B69A62]/20 overflow-hidden shadow-2xl">
      <div className="bg-[#244C37] p-6 text-center text-white relative">
        <div className="flex items-center justify-center gap-2 mb-2">
          <Gift className="w-5 h-5 text-[#B69A62]" />
          <span className="text-[10px] font-mono font-bold tracking-widest text-[#B69A62] uppercase">Gift Concierge</span>
        </div>
        <h1 className="text-2xl font-serif font-bold">Help Me Choose</h1>
        
        {step > 1 && step < 4 && (
          <button 
            onClick={() => setStep(step - 1)}
            className="absolute left-6 top-1/2 -translate-y-1/2 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-all"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
        )}
      </div>

      <div className="p-8 min-h-[400px]">
        {/* Progress Bar */}
        <div className="flex gap-2 mb-8 px-4">
          {[1, 2, 3].map(i => (
            <div 
              key={i} 
              className={`h-1 flex-1 rounded-full transition-all duration-500 ${
                step >= i ? 'bg-[#244C37]' : 'bg-[#244C37]/10'
              }`}
            />
          ))}
        </div>

        {renderStep()}
      </div>
    </div>
  );
};

export default GiftWizard;
