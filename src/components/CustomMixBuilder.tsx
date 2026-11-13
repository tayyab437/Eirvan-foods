import React, { useState } from 'react';
import { useStore } from '../context/StoreContext';
import { useNavigate } from 'react-router-dom';
import { ShahiMixIngredient, Product, ProductVariant } from '../types';
import {
  Plus,
  Minus,
  Trash2,
  ShoppingBag,
  CheckCircle2,
  Sparkles,
  Scale,
  Search,
  ArrowRight,
  Package,
  Info,
} from 'lucide-react';

export interface SelectedMixItem {
  ingredientId: string;
  name: string;
  image: string;
  weightLabel: string; // e.g., "100g", "250g", "500g", "1kg", "2kg", "5kg"
  weightGrams: number;
  price: number; // calculated price for this portion
}

export const CustomMixBuilder: React.FC = () => {
  const { shahiMixIngredients, addToCart, setIsCartOpen } = useStore();
  const navigate = useNavigate();

  // State
  const [mixTitle, setMixTitle] = useState('My Custom Pantry Super Mix');
  const [customInstructions, setCustomInstructions] = useState('');
  const [selectedItems, setSelectedItems] = useState<SelectedMixItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStockOnly, setFilterStockOnly] = useState(false);
  const [addedNotice, setAddedNotice] = useState<string | null>(null);

  // Per-ingredient selected weight selection state: map of ingredientId -> chosen weight string
  const [itemWeightSelection, setItemWeightSelection] = useState<Record<string, string>>({});

  const DEFAULT_WEIGHT = '100g';

  // Available weight options for user selection (10g, 50g, 100g, 250g)
  const WEIGHT_OPTIONS = [
    { label: '10g', grams: 10, isKg: false },
    { label: '50g', grams: 50, isKg: false },
    { label: '100g', grams: 100, isKg: false },
    { label: '250g', grams: 250, isKg: false },
  ];

  const isIngredientTracked = (ing: ShahiMixIngredient): boolean =>
    ing.inventoryPolicy === 'tracked' ||
    (ing.inventoryPolicy !== 'unlimited' && typeof ing.stockGrams === 'number');

  // Helper to get price for an ingredient based on chosen weight
  const getIngredientPriceForWeight = (ing: ShahiMixIngredient, weightLabel: string): number => {
    // Check if exact portion exists in ing.portions
    const exactPortion = ing.portions?.find((p) => p.weight === weightLabel);
    if (exactPortion) {
      return exactPortion.price;
    }

    const p1k = ing.portions?.find((p) => p.weight === '1kg')?.price;
    const p500 = ing.portions?.find((p) => p.weight === '500g')?.price;
    const p250 = ing.portions?.find((p) => p.weight === '250g')?.price;
    const p100 = ing.portions?.find((p) => p.weight === '100g')?.price;
    const p50 = ing.portions?.find((p) => p.weight === '50g')?.price;
    const p10 = ing.portions?.find((p) => p.weight === '10g')?.price;

    const base100g = p100 || (p250 ? Math.round(p250 / 2.5) : p500 ? Math.round(p500 / 5) : p1k ? Math.round(p1k / 10) : 150);
    const base1kg = p1k || (p500 ? p500 * 2 : p250 ? p250 * 4 : base100g * 10);

    if (weightLabel === '10g') return p10 || Math.max(15, Math.round(base100g / 10));
    if (weightLabel === '50g') return p50 || Math.max(50, Math.round(base100g / 2));
    if (weightLabel === '100g') return base100g;
    if (weightLabel === '250g') return p250 || Math.round(base100g * 2.375);
    if (weightLabel === '500g') return p500 || Math.round(base100g * 4.625);
    if (weightLabel === '1kg') return base1kg;
    if (weightLabel === '2kg') return Math.round(base1kg * 1.95);
    if (weightLabel === '5kg') return Math.round(base1kg * 4.75);

    return base100g;
  };

  // Add or update item in custom mix
  const handleAddIngredient = (ing: ShahiMixIngredient) => {
    const chosenWeightLabel = itemWeightSelection[ing.id] || DEFAULT_WEIGHT;
    const weightOpt = WEIGHT_OPTIONS.find((w) => w.label === chosenWeightLabel) || WEIGHT_OPTIONS[2];
    const itemPrice = getIngredientPriceForWeight(ing, chosenWeightLabel);

    const existingGramsForIng = selectedItems
      .filter((s) => s.ingredientId === ing.id)
      .reduce((acc, s) => acc + s.weightGrams, 0);

    if (isIngredientTracked(ing) && typeof ing.stockGrams === 'number') {
      if (existingGramsForIng + weightOpt.grams > ing.stockGrams) {
        setAddedNotice(`Only ${ing.stockGrams}g of ${ing.name} currently available in stock.`);
        setTimeout(() => setAddedNotice(null), 3500);
        return;
      }
    }

    const newItem: SelectedMixItem = {
      ingredientId: ing.id,
      name: ing.name,
      image: ing.image,
      weightLabel: chosenWeightLabel,
      weightGrams: weightOpt.grams,
      price: itemPrice,
    };

    setSelectedItems((prev) => {
      const existingIdx = prev.findIndex(
        (item) => item.ingredientId === ing.id && item.weightLabel === chosenWeightLabel
      );
      if (existingIdx > -1) {
        const updated = [...prev];
        updated[existingIdx] = {
          ...updated[existingIdx],
          price: updated[existingIdx].price + itemPrice,
          weightGrams: updated[existingIdx].weightGrams + weightOpt.grams,
        };
        return updated;
      }
      return [...prev, newItem];
    });

    setAddedNotice(`Added ${ing.name} (${chosenWeightLabel}) to your custom mix.`);
    setTimeout(() => setAddedNotice(null), 3000);
  };

  // Remove an item from the custom mix
  const handleRemoveItem = (index: number) => {
    setSelectedItems((prev) => prev.filter((_, i) => i !== index));
  };

  const [confirmClear, setConfirmClear] = useState(false);

  // Clear all items
  const handleClearMix = () => {
    if (!confirmClear) {
      setConfirmClear(true);
      setTimeout(() => setConfirmClear(false), 3000);
      return;
    }
    setSelectedItems([]);
    setConfirmClear(false);
  };

  // Total weight calculations
  const totalWeightGrams = selectedItems.reduce((sum, item) => sum + item.weightGrams, 0);
  const totalWeightKg = (totalWeightGrams / 1000).toFixed(2);
  const totalPrice = selectedItems.reduce((sum, item) => sum + item.price, 0);

  // Nutrition calculations
  const totalNutrition = selectedItems.reduce((acc, item) => {
    const ing = shahiMixIngredients.find(i => i.id === item.ingredientId);
    if (ing?.nutritionFacts) {
      const ratio = item.weightGrams / 100;
      acc.calories += ing.nutritionFacts.calories * ratio;
      acc.protein += ing.nutritionFacts.protein * ratio;
      acc.fat += ing.nutritionFacts.fat * ratio;
      acc.carbs += ing.nutritionFacts.carbs * ratio;
    }
    return acc;
  }, { calories: 0, protein: 0, fat: 0, carbs: 0 });

  // Filtered ingredients catalog (dynamically sourced from admin state)
  const filteredCatalog = shahiMixIngredients.filter((ing) => {
    const matchesSearch = ing.name.toLowerCase().includes(searchQuery.toLowerCase());
    const available = ing.inStock && (!isIngredientTracked(ing) || (ing.stockGrams ?? 0) > 0);
    const matchesStock = filterStockOnly ? available : true;
    return matchesSearch && matchesStock;
  });

  // Add Custom Mix to Shopping Cart
  const handleAddToCart = (directCheckout = false) => {
    if (selectedItems.length === 0) return;

    const formattedTitle = mixTitle.trim() || 'Bespoke Pantry Mix';
    const ingredientBreakdownText = selectedItems
      .map((item) => `${item.name} (${item.weightLabel})`)
      .join(' + ');

    const customProduct: Product = {
      id: `custom-mix-${Date.now()}`,
      name: formattedTitle,
      slug: `custom-mix-${Date.now()}`,
      category: 'mixed',
      categoryLabel: 'Custom Pantry Mix',
      shortDescription: `${totalWeightGrams}g custom mix containing: ${ingredientBreakdownText}`,
      description: `Bespoke pantry selection created by customer: ${ingredientBreakdownText}. Special instructions: ${
        customInstructions || 'Standard vacuum packaging.'
      }`,
      origin: 'Custom Farm Sourcing',
      packaging: 'Vacuum Sealed Airtight Pouch',
      shelfLife: '12 Months',
      imageUrl:
        selectedItems[0]?.image ||
        'https://images.unsplash.com/photo-1596040033229-a9821ebd058d?auto=format&fit=crop&w=480&q=65&fm=webp',
      galleryImages: [],
      variants: [],
      featured: false,
      bestSeller: false,
      rating: 5.0,
      reviewCount: 1,
      nutritionFacts: {
        servingSize: '100g',
        calories: Math.round(totalNutrition.calories / Math.max(0.1, totalWeightGrams / 100)),
        protein: `${Math.round(totalNutrition.protein / Math.max(0.1, totalWeightGrams / 100))}g`,
        healthyFats: `${Math.round(totalNutrition.fat / Math.max(0.1, totalWeightGrams / 100))}g`,
        carbs: `${Math.round(totalNutrition.carbs / Math.max(0.1, totalWeightGrams / 100))}g`,
        fiber: '3.5g',
        minerals: 'Potassium, Zinc, Magnesium, Iron',
      },
      healthBenefits: ['Freshly Portion-Packed', '100% Raw Single-Origin Harvests'],
      inStock: true,
    };

    const customVariant: ProductVariant = {
      id: `var-custom-${Date.now()}`,
      weight: totalWeightGrams >= 1000 ? `${totalWeightKg} kg (${totalWeightGrams}g)` : `${totalWeightGrams}g`,
      sku: `ZDS-CUSTOM-${Date.now().toString().slice(-5)}`,
      price: totalPrice,
      stock: 100,
    };

    const customBuild = {
      kind: 'custom-mix' as const,
      title: formattedTitle,
      items: selectedItems.map((item) => {
        const baseOpt = WEIGHT_OPTIONS.find((w) => w.label === item.weightLabel);
        const multiplier = baseOpt && baseOpt.grams > 0 ? Math.max(1, Math.round(item.weightGrams / baseOpt.grams)) : 1;
        return {
          ingredientId: item.ingredientId,
          weightLabel: item.weightLabel,
          multiplier,
        };
      }),
    };

    addToCart(customProduct, customVariant, 1, customInstructions, 'Custom Ingredients Pantry Bag', customBuild);

    if (directCheckout) {
      navigate('/checkout');
    } else {
      setIsCartOpen(true);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-10 w-full max-w-full overflow-x-hidden">
      {/* Page Header */}
      <div className="text-center max-w-3xl mx-auto space-y-3">
        <div className="inline-flex items-center space-x-2 px-3.5 py-1 bg-[#344B36] text-[#B69A62] rounded-full text-xs font-mono uppercase tracking-wider font-semibold">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Bespoke Pantry Crafting</span>
        </div>
        <h1 className="font-serif text-3xl sm:text-5xl text-[#302A25] leading-tight font-bold">
          Select Your Own Ingredients
        </h1>
        <p className="text-xs sm:text-sm text-[#302A25]/75 leading-relaxed font-light">
          Handpick your favorite single-origin mountain dry fruits, exotic nuts, and dates directly from our live pantry collection. Build your custom mix and see real-time nutritional values.
        </p>
      </div>

      {/* Added Notification Feedback Banner */}
      {addedNotice && (
        <div className="p-4 bg-[#344B36] text-[#F7F4EC] rounded-2xl text-xs font-semibold flex items-center justify-between shadow-md border border-[#B69A62]/30 animate-fade-in">
          <div className="flex items-center space-x-2.5">
            <CheckCircle2 className="w-4 h-4 text-[#B69A62]" />
            <span>{addedNotice}</span>
          </div>
          <button
            onClick={() => setAddedNotice(null)}
            className="text-[11px] underline text-[#B69A62] hover:text-white cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Main Grid: Catalog Left (2 Columns) & Live Mix Summary Right (1 Column) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        {/* LEFT AREA: Ingredients Catalog Menu */}
        <div className="lg:col-span-2 space-y-6">
          {/* Catalog Controls Header */}
          <div className="bg-white p-5 rounded-3xl border border-[#E7DDCA] shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-3" />
              <input
                type="text"
                placeholder="Search ingredients (e.g. Pine Nuts, Mamra, Ajwa)..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-[#F7F4EC] border border-[#E7DDCA] rounded-2xl text-xs focus:outline-hidden focus:border-[#344B36]"
              />
            </div>

            <div className="flex items-center space-x-3 shrink-0">
              <label className="flex items-center space-x-2 text-xs font-semibold text-[#302A25] cursor-pointer">
                <input
                  type="checkbox"
                  checked={filterStockOnly}
                  onChange={(e) => setFilterStockOnly(e.target.checked)}
                  className="rounded text-[#344B36] focus:ring-0"
                />
                <span>In Stock Only</span>
              </label>

              <span className="text-xs text-gray-400 font-mono">
                {filteredCatalog.length} {filteredCatalog.length === 1 ? 'Item' : 'Items'} Available
              </span>
            </div>
          </div>

          {/* Ingredients Menu Cards Grid */}
          {filteredCatalog.length === 0 ? (
            <div className="p-10 bg-white rounded-3xl border border-[#E7DDCA] text-center space-y-2">
              <p className="font-serif text-lg font-bold text-[#302A25]">
                {shahiMixIngredients.length === 0
                  ? 'Custom Mix Ingredients Are Being Replenished'
                  : 'No matching ingredients found'}
              </p>
              <p className="text-xs text-gray-500">
                {shahiMixIngredients.length === 0
                  ? 'Please browse our pre-packed harvests in the shop while our pantry ingredient pool refreshes.'
                  : 'Try clearing your search filter or unchecking In Stock Only.'}
              </p>
            </div>
          ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {filteredCatalog.map((ing) => {
              const currentWeightLabel = itemWeightSelection[ing.id] || DEFAULT_WEIGHT;
              const currentPrice = getIngredientPriceForWeight(ing, currentWeightLabel);
              const ingAvailable = ing.inStock && (!isIngredientTracked(ing) || (ing.stockGrams ?? 0) > 0);

              return (
                <div
                  key={ing.id}
                  className="bg-white rounded-3xl border border-[#E7DDCA] overflow-hidden shadow-xs hover:shadow-md transition-all flex flex-col justify-between group"
                >
                  <div className="p-5 space-y-4">
                    {/* Image & Badge */}
                    <div className="aspect-4/3 rounded-2xl overflow-hidden bg-[#F7F4EC] relative border border-[#E7DDCA]/60">
                      <img
                        src={ing.image}
                        alt={ing.name}
                        className="w-full h-full object-cover group-hover:scale-103 transition-transform duration-500"
                      />
                      <span
                        className={`absolute top-3 right-3 text-[10px] font-bold px-2.5 py-1 rounded-full ${
                          ingAvailable
                            ? 'bg-[#344B36]/90 text-white backdrop-blur-md'
                            : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {ingAvailable ? 'In Stock' : 'Out of Stock'}
                      </span>
                    </div>

                    {/* Ingredient Title & Details */}
                    <div>
                      <h3 className="font-serif text-lg font-bold text-[#302A25]">{ing.name}</h3>
                      <div className="flex flex-wrap gap-2 mt-1.5">
                        {ing.nutritionFacts && (
                          <>
                            <span className="text-[10px] bg-[#F7F4EC] text-[#244C37] px-2 py-0.5 rounded-full font-mono border border-[#E7DDCA]">
                              {ing.nutritionFacts.calories} kcal
                            </span>
                            <span className="text-[10px] bg-[#F7F4EC] text-[#244C37] px-2 py-0.5 rounded-full font-mono border border-[#E7DDCA]">
                              {ing.nutritionFacts.protein}g Protein
                            </span>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Weight Selection Buttons (Grams) */}
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-bold text-gray-600 block">
                        Select Portion Weight:
                      </label>
                      <div className="grid grid-cols-4 gap-1 bg-[#F7F4EC] p-1 rounded-xl border border-[#E7DDCA]">
                        {WEIGHT_OPTIONS.map((opt) => (
                          <button
                            key={opt.label}
                            type="button"
                            onClick={() =>
                              setItemWeightSelection((prev) => ({
                                ...prev,
                                [ing.id]: opt.label,
                              }))
                            }
                            className={`py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                              currentWeightLabel === opt.label
                                ? 'bg-[#344B36] text-white shadow-xs'
                                : 'text-gray-600 hover:text-[#344B36]'
                            }`}
                          >
                            {opt.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Card Action Footer */}
                  <div className="p-5 pt-3 border-t border-[#E7DDCA]/60 bg-[#F7F4EC]/50 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] text-gray-400 font-mono block uppercase">Portion Price</span>
                      <span className="font-serif text-lg font-bold text-[#344B36] tabular-nums">
                        Rs. {currentPrice.toLocaleString()}
                      </span>
                    </div>

                    <button
                      onClick={() => handleAddIngredient(ing)}
                      disabled={!ingAvailable}
                      className={`px-4 py-2.5 rounded-xl text-xs font-bold flex items-center space-x-1.5 transition-all cursor-pointer ${
                        ingAvailable
                          ? 'bg-[#344B36] hover:bg-[#2A3D2C] text-[#F7F4EC] shadow-sm'
                          : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                      }`}
                    >
                      <Plus className="w-4 h-4" />
                      <span>Add ({currentWeightLabel})</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
          )}
        </div>

        {/* RIGHT AREA: Custom Mix Recipe Tray & Subtotal Summary */}
        <div className="lg:sticky lg:top-24 space-y-6">
          <div className="bg-white rounded-3xl border border-[#E7DDCA] p-6 shadow-md space-y-6">
            {/* Tray Header */}
            <div className="flex items-center justify-between pb-4 border-b border-[#E7DDCA]">
              <div className="flex items-center space-x-2">
                <Package className="w-5 h-5 text-[#344B36]" />
                <h2 className="font-serif text-xl font-bold text-[#302A25]">Your Custom Mix</h2>
              </div>

              {selectedItems.length > 0 && (
                <button
                  onClick={handleClearMix}
                  className="text-xs text-rose-600 hover:underline flex items-center space-x-1 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>{confirmClear ? 'Click Again to Clear' : 'Clear All'}</span>
                </button>
              )}
            </div>

            {/* Custom Mix Title Input */}
            <div>
              <label className="text-xs font-bold text-gray-700 block mb-1">
                Name Your Custom Mix:
              </label>
              <input
                type="text"
                value={mixTitle}
                onChange={(e) => setMixTitle(e.target.value)}
                placeholder="e.g. Royal Winter Energy Blend"
                className="w-full px-3.5 py-2.5 bg-[#F7F4EC] border border-[#E7DDCA] rounded-xl text-xs font-serif font-bold text-[#302A25] focus:outline-hidden focus:bg-white"
              />
            </div>

            {/* Nutrition Calculator Live Dashboard */}
            {selectedItems.length > 0 && (
              <div className="bg-[#244C37] rounded-2xl p-4 border border-[#B69A62]/30">
                <div className="flex items-center gap-2 mb-3">
                  <Sparkles className="w-3.5 h-3.5 text-[#B69A62]" />
                  <span className="text-[10px] font-mono font-bold text-[#B69A62] uppercase tracking-widest">
                    Live Nutrition Tracker
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div className="text-center">
                    <div className="text-[10px] text-white/60 uppercase">Calories</div>
                    <div className="text-lg font-serif font-bold text-white leading-none">
                      {Math.round(totalNutrition.calories)}
                    </div>
                    <div className="text-[9px] text-[#B69A62]">kcal</div>
                  </div>
                  <div className="text-center border-x border-white/10 px-2">
                    <div className="text-[10px] text-white/60 uppercase">Protein</div>
                    <div className="text-lg font-serif font-bold text-white leading-none">
                      {totalNutrition.protein.toFixed(1)}
                    </div>
                    <div className="text-[9px] text-[#B69A62]">grams</div>
                  </div>
                  <div className="text-center">
                    <div className="text-[10px] text-white/60 uppercase">Healthy Fat</div>
                    <div className="text-lg font-serif font-bold text-white leading-none">
                      {totalNutrition.fat.toFixed(1)}
                    </div>
                    <div className="text-[9px] text-[#B69A62]">grams</div>
                  </div>
                </div>
                <div className="mt-3 pt-3 border-t border-white/10 flex justify-between items-center">
                   <span className="text-[10px] text-white/60">Total Carbs</span>
                   <span className="text-xs font-bold text-white">{totalNutrition.carbs.toFixed(1)}g</span>
                </div>
              </div>
            )}

            {/* Selected Ingredients List */}
            {selectedItems.length === 0 ? (
              <div className="py-10 text-center bg-[#F7F4EC]/60 rounded-2xl border border-dashed border-[#E7DDCA] p-6 space-y-3">
                <Scale className="w-8 h-8 text-gray-400 mx-auto" />
                <p className="text-xs text-gray-500 font-light">
                  Your custom mix tray is empty. Pick ingredients to see real-time nutrition and pricing.
                </p>
              </div>
            ) : (
              <div className="space-y-3 max-h-64 overflow-y-auto pr-1 custom-scrollbar">
                {selectedItems.map((item, idx) => (
                  <div
                    key={`${item.ingredientId}-${idx}`}
                    className="p-3.5 bg-[#F7F4EC] rounded-2xl border border-[#E7DDCA]/80 flex items-center justify-between gap-3 text-xs"
                  >
                    <div className="flex items-center space-x-3 min-w-0">
                      <img
                        src={item.image}
                        alt={item.name}
                        className="w-10 h-10 rounded-xl object-cover border border-[#E7DDCA]"
                      />
                      <div className="min-w-0">
                        <span className="font-bold text-[#302A25] block truncate">{item.name}</span>
                        <span className="text-[11px] text-[#B69A62] font-semibold">
                          {item.weightLabel} ({item.weightGrams}g)
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center space-x-3 shrink-0">
                      <span className="font-serif font-bold text-[#344B36] tabular-nums">
                        Rs. {item.price.toLocaleString()}
                      </span>
                      <button
                        onClick={() => handleRemoveItem(idx)}
                        className="text-gray-400 hover:text-rose-600 cursor-pointer p-1"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Weight & Price Calculations Box */}
            <div className="p-4 bg-[#344B36] text-[#F7F4EC] rounded-2xl space-y-3">
              <div className="flex items-center justify-between text-xs border-b border-[#F7F4EC]/20 pb-2">
                <span className="text-[#B69A62] font-mono uppercase text-[10px] tracking-wider">
                  Total Mix Weight
                </span>
                <span className="font-mono font-bold">
                  {totalWeightGrams} g ({totalWeightKg} kg)
                </span>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs text-white/80 block">Mix Subtotal</span>
                  <span className="text-[10px] text-[#B69A62]">Free Delivery over Rs. 3,500</span>
                </div>
                <span className="font-serif text-2xl font-bold text-[#B69A62] tabular-nums">
                  Rs. {totalPrice.toLocaleString()}
                </span>
              </div>
            </div>

            {/* Special Instructions */}
            <div>
              <label className="text-xs font-bold text-gray-700 block mb-1">
                Packaging Instructions (Optional):
              </label>
              <textarea
                rows={2}
                value={customInstructions}
                onChange={(e) => setCustomInstructions(e.target.value)}
                placeholder="e.g. Vacuum pack each ingredient separately..."
                className="w-full p-2.5 bg-[#F7F4EC] border border-[#E7DDCA] rounded-xl text-xs text-[#302A25] focus:outline-hidden"
              />
            </div>

            {/* Action Buttons */}
            <div className="space-y-2.5 pt-2">
              <button
                onClick={() => handleAddToCart(false)}
                disabled={selectedItems.length === 0}
                className={`w-full py-3.5 rounded-2xl font-bold text-xs uppercase tracking-wider flex items-center justify-center space-x-2 transition-all cursor-pointer ${
                  selectedItems.length > 0
                    ? 'bg-[#344B36] hover:bg-[#2A3D2C] text-[#F7F4EC] shadow-md'
                    : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                }`}
              >
                <ShoppingBag className="w-4 h-4 text-[#B69A62]" />
                <span>Add Custom Mix to Cart</span>
              </button>

              <button
                onClick={() => handleAddToCart(true)}
                disabled={selectedItems.length === 0}
                className={`w-full py-3 rounded-2xl font-bold text-xs uppercase tracking-wider flex items-center justify-center space-x-2 transition-all cursor-pointer border ${
                  selectedItems.length > 0
                    ? 'border-[#344B36] text-[#344B36] hover:bg-[#344B36] hover:text-white'
                    : 'border-gray-200 text-gray-400 cursor-not-allowed'
                }`}
              >
                <span>Instant Checkout</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Guarantee Box */}
          <div className="p-4 bg-white rounded-2xl border border-[#E7DDCA] text-xs text-gray-600 space-y-2">
            <div className="flex items-center space-x-2 text-[#344B36] font-semibold">
              <Info className="w-4 h-4 text-[#B69A62]" />
              <span>Freshness & Sourcing Promise</span>
            </div>
            <p className="text-[11px] leading-relaxed text-gray-500 font-light">
              Every custom ingredient order is hand-inspected, weigh-verified, and nitrogen-flushed for maximum oil preservation.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
