import React, { useState } from 'react';
import { useStore } from '../context/StoreContext';
import { ShahiMixBox, ShahiMixIngredient, ShahiMixPortion } from '../types';
import {
  Gift,
  Check,
  Plus,
  Trash2,
  ShoppingBag,
  Sparkles,
  ArrowRight,
  Scale,
  Layers,
} from 'lucide-react';

const RIBBON_COLORS = [
  { name: 'Olive Forest', hex: '#344B36' },
  { name: 'Antique Brass', hex: '#B69A62' },
  { name: 'Warm Terracotta', hex: '#B96F50' },
  { name: 'Deep Espresso', hex: '#302A25' },
];

export interface SelectedFillingItem {
  ingredientId: string;
  name: string;
  portion: ShahiMixPortion;
  image: string;
}

export const GiftBoxBuilder: React.FC = () => {
  const { addToCart, setIsCartOpen, shahiMixBoxes, shahiMixIngredients } = useStore();

  const boxes = shahiMixBoxes && shahiMixBoxes.length > 0 ? shahiMixBoxes : [];
  const ingredients = shahiMixIngredients && shahiMixIngredients.length > 0 ? shahiMixIngredients : [];

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [selectedBox, setSelectedBox] = useState<ShahiMixBox>(boxes[0]);
  const [selectedFillings, setSelectedFillings] = useState<SelectedFillingItem[]>([]);

  // Default selection when component mounts
  React.useEffect(() => {
    if (boxes.length > 0 && !selectedBox) {
      setSelectedBox(boxes[0]);
    }
  }, [boxes, selectedBox]);

  const [ribbonColor, setRibbonColor] = useState(RIBBON_COLORS[0].name);
  const [giftOccasion, setGiftOccasion] = useState('Wedding / Shadi Mubarak');
  const [giftCardRecipient, setGiftCardRecipient] = useState('');
  const [giftCardMessage, setGiftCardMessage] = useState(
    'Wishing you and your family abundant health, barakah, and joyous celebrations with these mountain harvests.'
  );

  const fillingsPrice = selectedFillings.reduce((acc, f) => acc + f.portion.price, 0);
  const totalWeightGrams = selectedFillings.reduce((acc, f) => acc + f.portion.weightGrams, 0);
  const totalBoxPrice = (selectedBox?.basePrice || 0) + fillingsPrice;

  const handleSelectPortion = (ing: ShahiMixIngredient, portion: ShahiMixPortion) => {
    const existingIndex = selectedFillings.findIndex((f) => f.ingredientId === ing.id);
    if (existingIndex > -1) {
      // Update portion of existing ingredient
      const updated = [...selectedFillings];
      updated[existingIndex] = {
        ingredientId: ing.id,
        name: ing.name,
        portion,
        image: ing.image,
      };
      setSelectedFillings(updated);
    } else {
      if (selectedFillings.length >= selectedBox.capacity) {
        alert(
          `This box can hold a maximum of ${selectedBox.capacity} compartments. Please remove one item first.`
        );
        return;
      }
      setSelectedFillings([
        ...selectedFillings,
        {
          ingredientId: ing.id,
          name: ing.name,
          portion,
          image: ing.image,
        },
      ]);
    }
  };

  const removeFilling = (ingredientId: string) => {
    setSelectedFillings(selectedFillings.filter((f) => f.ingredientId !== ingredientId));
  };

  const handleAddBoxToCart = () => {
    if (selectedFillings.length < 2) {
      alert('Please select at least 2 dry fruit portion fillings for your Shahi Mix Box.');
      return;
    }

    const customProduct = {
      id: `custom-shahi-${Date.now()}`,
      name: `Custom Shahi Mix (${selectedBox.name})`,
      slug: `custom-shahi-mix-${Date.now()}`,
      category: 'gift-boxes',
      categoryLabel: 'Shahi Mix Curation',
      shortDescription: `Bespoke curation: ${selectedFillings.map((f) => `${f.name} (${f.portion.weight})`).join(', ')}.`,
      description: `Bespoke Shahi Mix Box (${totalWeightGrams}g total harvest) with ${ribbonColor} ribbon. Occasion: ${giftOccasion}. Note: "${giftCardMessage}"`,
      origin: 'Hand-packed in Lahore Hub',
      packaging: selectedBox.name,
      shelfLife: '12 Months',
      imageUrl: selectedBox.image,
      galleryImages: [selectedBox.image],
      variants: [
        {
          id: `var-shahi-${Date.now()}`,
          weight: `${totalWeightGrams}g Total (${selectedFillings.length} Fillings)`,
          sku: `SHAHI-MIX-${Math.floor(1000 + Math.random() * 9000)}`,
          price: totalBoxPrice,
          stock: 50,
        },
      ],
      featured: true,
      bestSeller: true,
      rating: 5.0,
      reviewCount: 1,
      nutritionFacts: {
        servingSize: `${totalWeightGrams}g Assorted Shahi Mix`,
        calories: Math.round(totalWeightGrams * 5.5),
        protein: `${Math.round(totalWeightGrams * 0.18)}g`,
        healthyFats: `${Math.round(totalWeightGrams * 0.45)}g`,
        carbs: `${Math.round(totalWeightGrams * 0.22)}g`,
        fiber: `${Math.round(totalWeightGrams * 0.08)}g`,
        minerals: 'Zinc, Potassium, Iron, Essential Fatty Acids',
      },
      healthBenefits: ['Artisanal custom portion mix tailored to your preference'],
      inStock: true,
    };

    addToCart(
      customProduct,
      customProduct.variants[0],
      1,
      `Occasion: ${giftOccasion} | To: ${giftCardRecipient || 'Beloved Family'} | Total Grams: ${totalWeightGrams}g | Note: ${giftCardMessage}`,
      selectedBox.name
    );

    setIsCartOpen(true);
  };

  if (!selectedBox) return null;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      {/* Header */}
      <div className="text-center max-w-2xl mx-auto mb-10">
        <span className="text-xs uppercase tracking-widest font-mono font-bold text-[#B69A62] bg-[#244C37] px-3 py-1 rounded-full inline-block mb-3">
          Custom Shahi Mix Builder
        </span>
        <h1 className="font-serif text-3xl sm:text-4xl text-[#344B36]">
          Build Your Own Shahi Dry Fruit Box
        </h1>
        <p className="text-xs sm:text-sm text-[#5E5750] mt-2 font-sans">
          Pick your outer luxury packaging, select exact portion weights in grams or kg (*100g, 250g, 500g, 1kg*), and compose a complimentary calligraphy card.
        </p>
      </div>

      {/* Stepper Header */}
      <div className="flex flex-wrap sm:flex-nowrap items-center justify-center gap-3 sm:gap-8 mb-10 border-b border-[#E7DDCA] pb-4">
        <button
          onClick={() => setStep(1)}
          className={`flex items-center space-x-2 text-xs uppercase tracking-wider font-bold pb-2 cursor-pointer transition-all ${
            step === 1
              ? 'text-[#344B36] border-b-2 border-[#344B36]'
              : 'text-gray-400 hover:text-gray-700'
          }`}
        >
          <span className="w-5 h-5 rounded-full bg-[#344B36] text-[#F7F4EC] text-[10px] flex items-center justify-center font-bold">
            1
          </span>
          <span>1. Outer Box Craft</span>
        </button>

        <button
          onClick={() => setStep(2)}
          className={`flex items-center space-x-2 text-xs uppercase tracking-wider font-bold pb-2 cursor-pointer transition-all ${
            step === 2
              ? 'text-[#344B36] border-b-2 border-[#344B36]'
              : 'text-gray-400 hover:text-gray-700'
          }`}
        >
          <span className="w-5 h-5 rounded-full bg-[#344B36] text-[#F7F4EC] text-[10px] flex items-center justify-center font-bold">
            2
          </span>
          <span>2. Select Grams &amp; Products ({selectedFillings.length}/{selectedBox.capacity})</span>
        </button>

        <button
          onClick={() => setStep(3)}
          className={`flex items-center space-x-2 text-xs uppercase tracking-wider font-bold pb-2 cursor-pointer transition-all ${
            step === 3
              ? 'text-[#344B36] border-b-2 border-[#344B36]'
              : 'text-gray-400 hover:text-gray-700'
          }`}
        >
          <span className="w-5 h-5 rounded-full bg-[#344B36] text-[#F7F4EC] text-[10px] flex items-center justify-center font-bold">
            3
          </span>
          <span>3. Ribbon &amp; Card Message</span>
        </button>
      </div>

      {/* Main Grid: Options on Left, Live Box Summary on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Step Content */}
        <div className="lg:col-span-2">
          {/* STEP 1: BOX SELECTION */}
          {step === 1 && (
            <div className="space-y-6">
              <h3 className="font-serif text-xl font-bold text-[#302A25]">
                Step 1: Choose Your Outer Luxury Packaging
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {boxes.map((box) => {
                  const isSel = selectedBox.id === box.id;
                  return (
                    <div
                      key={box.id}
                      onClick={() => {
                        setSelectedBox(box);
                        if (selectedFillings.length > box.capacity) {
                          setSelectedFillings(selectedFillings.slice(0, box.capacity));
                        }
                      }}
                      className={`p-4 rounded-3xl border transition-all cursor-pointer flex flex-col justify-between ${
                        isSel
                          ? 'border-[#344B36] bg-white shadow-md ring-2 ring-[#344B36]/15'
                          : 'border-[#E7DDCA] bg-[#F7F4EC] hover:bg-white'
                      }`}
                    >
                      <div>
                        <div className="aspect-4/3 rounded-2xl overflow-hidden mb-3 bg-gray-100">
                          <img
                            src={box.image}
                            alt={box.name}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <h4 className="font-serif text-base font-bold text-[#302A25] leading-snug mb-1">
                          {box.name}
                        </h4>
                        <p className="text-xs text-[#5E5750] mb-3 leading-relaxed">
                          {box.description}
                        </p>
                      </div>

                      <div className="pt-3 border-t border-[#E7DDCA] flex items-center justify-between">
                        <span className="text-xs font-bold text-[#344B36] tabular-nums">
                          Base: Rs. {box.basePrice.toLocaleString()}
                        </span>
                        <span className="text-[10px] uppercase tracking-wider bg-[#E7DDCA] px-2 py-0.5 rounded-md font-semibold text-[#302A25]">
                          {box.capacity} Slots
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="flex justify-end pt-4">
                <button
                  onClick={() => setStep(2)}
                  className="px-6 py-3 bg-[#344B36] text-[#F7F4EC] text-xs font-bold uppercase tracking-wider rounded-xl hover:bg-[#233425] flex items-center space-x-2 cursor-pointer shadow-md"
                >
                  <span>Select Grams &amp; Products</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 2: INGREDIENTS & GRAM WEIGHTS */}
          {step === 2 && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-serif text-xl font-bold text-[#302A25]">
                    Step 2: Pick Products &amp; Portion Weights in Grams/Kg
                  </h3>
                  <p className="text-xs text-[#5E5750]">
                    Selected: <strong className="text-[#344B36]">{selectedFillings.length} of {selectedBox.capacity}</strong> slots · Total Net Weight: <strong className="text-[#344B36] font-mono">{totalWeightGrams}g</strong> ({ (totalWeightGrams/1000).toFixed(2) } kg)
                  </p>
                </div>

                {selectedFillings.length === selectedBox.capacity && (
                  <span className="bg-emerald-50 text-emerald-800 text-[11px] font-semibold px-2.5 py-0.5 rounded-full flex items-center space-x-1 border border-emerald-200">
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Box Capacity Full</span>
                  </span>
                )}
              </div>

              <div className="grid grid-cols-1 gap-4">
                {ingredients.map((ing) => {
                  const currentSelected = selectedFillings.find((f) => f.ingredientId === ing.id);
                  return (
                    <div
                      key={ing.id}
                      className={`p-4 rounded-2xl border transition-all ${
                        currentSelected
                          ? 'border-[#344B36] bg-white shadow-sm ring-1 ring-[#344B36]/15'
                          : 'border-[#E7DDCA] bg-[#F7F4EC]'
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="flex items-center space-x-3.5">
                          <img
                            src={ing.image}
                            alt={ing.name}
                            className="w-16 h-16 rounded-2xl object-cover shrink-0"
                          />
                          <div>
                            <h4 className="text-sm font-bold text-[#302A25]">
                              {ing.name}
                            </h4>
                            <span className="text-[11px] text-gray-500 block font-mono">
                              {ing.inStock ? 'Available in 100g, 250g, 500g, 1kg' : 'Out of Stock'}
                            </span>
                          </div>
                        </div>

                        {/* Weight selector buttons */}
                        <div className="flex flex-wrap items-center gap-2">
                          {ing.portions.map((portion) => {
                            const isPortionSel = currentSelected?.portion.id === portion.id;
                            return (
                              <button
                                key={portion.id}
                                type="button"
                                onClick={() => handleSelectPortion(ing, portion)}
                                className={`px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex flex-col items-center min-w-[70px] ${
                                  isPortionSel
                                    ? 'bg-[#344B36] text-white shadow-sm scale-103'
                                    : 'bg-white border border-[#E7DDCA] text-gray-700 hover:border-[#344B36]'
                                }`}
                              >
                                <span className="font-mono">{portion.weight}</span>
                                <span
                                  className={`text-[10px] font-normal mt-0.5 ${
                                    isPortionSel ? 'text-[#B69A62]' : 'text-gray-500'
                                  }`}
                                >
                                  Rs. {portion.price.toLocaleString()}
                                </span>
                              </button>
                            );
                          })}

                          {currentSelected && (
                            <button
                              type="button"
                              onClick={() => removeFilling(ing.id)}
                              className="p-2 text-rose-600 hover:bg-rose-50 rounded-xl cursor-pointer"
                              title="Remove item"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="flex justify-between pt-4">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="px-5 py-2.5 border border-[#E7DDCA] text-xs font-bold uppercase tracking-wider rounded-xl text-gray-700 hover:bg-[#E7DDCA] cursor-pointer"
                >
                  Back to Outer Box
                </button>
                <button
                  type="button"
                  onClick={() => setStep(3)}
                  disabled={selectedFillings.length === 0}
                  className="px-6 py-3 bg-[#344B36] text-[#F7F4EC] text-xs font-bold uppercase tracking-wider rounded-xl hover:bg-[#233425] flex items-center space-x-2 cursor-pointer shadow-md disabled:opacity-50"
                >
                  <span>Ribbon &amp; Card Message</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: RIBBON & GREETING */}
          {step === 3 && (
            <div className="space-y-6">
              <h3 className="font-serif text-xl font-bold text-[#302A25]">
                Step 3: Satin Ribbon &amp; Calligraphy Card
              </h3>

              <div>
                <label className="text-xs font-bold text-[#302A25] block mb-2 uppercase tracking-wider">
                  Ribbon Color:
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {RIBBON_COLORS.map((rc) => {
                    const isSel = ribbonColor === rc.name;
                    return (
                      <button
                        key={rc.name}
                        type="button"
                        onClick={() => setRibbonColor(rc.name)}
                        className={`p-3 rounded-2xl border flex items-center space-x-2 text-xs font-semibold cursor-pointer transition-all ${
                          isSel
                            ? 'border-[#344B36] bg-white shadow-xs'
                            : 'border-[#E7DDCA] bg-[#F7F4EC]'
                        }`}
                      >
                        <span
                          className="w-3.5 h-3.5 rounded-full border border-black/20 shrink-0"
                          style={{ backgroundColor: rc.hex }}
                        />
                        <span className="truncate">{rc.name}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-[#302A25] block mb-1 uppercase tracking-wider">
                    Occasion / Event:
                  </label>
                  <select
                    value={giftOccasion}
                    onChange={(e) => setGiftOccasion(e.target.value)}
                    className="w-full text-xs p-3 rounded-xl border border-[#E7DDCA] bg-white"
                  >
                    <option>Wedding / Shadi Mubarak</option>
                    <option>Eid Mubarak Greetings</option>
                    <option>Corporate Appreciation &amp; VIP Delegate</option>
                    <option>Newborn Mubarakbaad</option>
                    <option>Hajj &amp; Umrah Welcome</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-[#302A25] block mb-1 uppercase tracking-wider">
                    Recipient Name / Family:
                  </label>
                  <input
                    type="text"
                    value={giftCardRecipient}
                    onChange={(e) => setGiftCardRecipient(e.target.value)}
                    placeholder="e.g. Mr. &amp; Mrs. Tariq Aziz"
                    className="w-full text-xs p-3 rounded-xl border border-[#E7DDCA] bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-[#302A25] block mb-1 uppercase tracking-wider">
                  Printed Calligraphy Card Message:
                </label>
                <textarea
                  rows={3}
                  value={giftCardMessage}
                  onChange={(e) => setGiftCardMessage(e.target.value)}
                  className="w-full text-xs p-3 rounded-xl border border-[#E7DDCA] bg-white leading-relaxed"
                />
              </div>

              <div className="flex justify-between pt-4">
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="px-5 py-2.5 border border-[#E7DDCA] text-xs font-bold uppercase tracking-wider rounded-xl text-gray-700 hover:bg-[#E7DDCA] cursor-pointer"
                >
                  Back to Ingredients
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Live Summary Sidebar */}
        <div className="bg-white rounded-3xl p-6 border border-[#E7DDCA] shadow-xl flex flex-col justify-between h-fit sticky top-24">
          <div>
            <div className="flex items-center space-x-2 text-[#A5AD91] mb-2">
              <Gift className="w-4 h-4 text-[#344B36]" />
              <span className="text-[10px] font-bold uppercase tracking-widest text-[#344B36]">
                Shahi Mix Summary
              </span>
            </div>

            <h3 className="font-serif text-xl font-bold text-[#302A25] mb-1">
              {selectedBox.name}
            </h3>
            <p className="text-xs text-[#5E5750] mb-4">
              Ribbon: <span className="font-semibold text-[#302A25]">{ribbonColor}</span> · {giftOccasion}
            </p>

            <div className="aspect-4/3 rounded-2xl overflow-hidden bg-[#F7F4EC] mb-4 border border-[#E7DDCA]">
              <img
                src={selectedBox.image}
                alt=""
                className="w-full h-full object-cover"
              />
            </div>

            {/* Selected items with portion weights */}
            <div className="space-y-2 mb-4">
              <div className="flex items-center justify-between text-xs font-bold text-gray-400 uppercase tracking-wider">
                <span>Selected Items ({selectedFillings.length}/{selectedBox.capacity}):</span>
                <span className="text-[#344B36] font-mono">{totalWeightGrams}g</span>
              </div>

              {selectedFillings.length === 0 ? (
                <p className="text-xs text-gray-400 italic py-2">
                  No dry fruit portions selected yet. Step 2 allows choosing portions in 100g, 250g, 500g, or 1kg.
                </p>
              ) : (
                selectedFillings.map((f) => (
                  <div
                    key={f.ingredientId}
                    className="flex items-center justify-between text-xs py-1.5 border-b border-gray-100"
                  >
                    <div>
                      <span className="font-bold text-gray-800 block truncate max-w-[150px]">
                        {f.name}
                      </span>
                      <span className="text-[10px] font-mono text-[#B69A62] bg-[#244C37] px-2 py-0.5 rounded-md text-white font-bold">
                        {f.portion.weight} ({f.portion.weightGrams}g)
                      </span>
                    </div>

                    <div className="flex items-center space-x-2">
                      <span className="font-semibold text-[#344B36] tabular-nums">
                        Rs. {f.portion.price.toLocaleString()}
                      </span>
                      <button
                        type="button"
                        onClick={() => removeFilling(f.ingredientId)}
                        className="text-gray-400 hover:text-red-600 cursor-pointer"
                        title="Remove"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Total weight & price Breakdown */}
            <div className="bg-[#F7F4EC] p-4 rounded-2xl border border-[#E7DDCA] space-y-2 text-xs text-[#5E5750] mb-6">
              <div className="flex justify-between items-center">
                <span className="flex items-center space-x-1">
                  <Scale className="w-3.5 h-3.5 text-[#344B36]" />
                  <span>Total Net Weight:</span>
                </span>
                <span className="font-mono font-bold text-[#344B36]">{totalWeightGrams}g ({ (totalWeightGrams/1000).toFixed(2) } kg)</span>
              </div>
              <div className="flex justify-between">
                <span>Box Craftsmanship:</span>
                <span className="tabular-nums">Rs. {selectedBox.basePrice.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span>Portion Fillings:</span>
                <span className="tabular-nums">Rs. {fillingsPrice.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span>Calligraphy Card:</span>
                <span className="text-[#344B36] font-semibold">Complimentary</span>
              </div>
              <div className="pt-2 border-t border-[#E7DDCA] flex justify-between font-bold text-sm text-[#344B36]">
                <span>Total Box Price:</span>
                <span className="font-serif text-lg tabular-nums">Rs. {totalBoxPrice.toLocaleString()}</span>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={handleAddBoxToCart}
            className="w-full py-4 bg-[#344B36] hover:bg-[#233425] text-[#F7F4EC] rounded-2xl font-sans text-xs font-bold uppercase tracking-widest flex items-center justify-center space-x-2 shadow-lg transition-all cursor-pointer"
          >
            <ShoppingBag className="w-4 h-4 text-[#B69A62]" />
            <span>Add Custom Shahi Mix to Cart</span>
          </button>
        </div>
      </div>
    </div>
  );
};
