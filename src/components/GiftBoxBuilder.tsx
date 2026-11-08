import React, { useState } from 'react';
import { useStore } from '../context/StoreContext';
import {
  Gift,
  Check,
  Plus,
  Trash2,
  ShoppingBag,
  Sparkles,
  ArrowRight,
} from 'lucide-react';

interface BoxOption {
  id: string;
  name: string;
  urduName: string;
  capacity: number; // 4 or 6 slots
  basePrice: number; // PKR
  image: string;
  description: string;
}

const BOX_OPTIONS: BoxOption[] = [
  {
    id: 'box-olive-luxe',
    name: 'Artisan Olive Keepsake Gift Box',
    urduName: 'آرٹیسن اولیو باکس',
    capacity: 4,
    basePrice: 1950,
    image: '/src/assets/images/luxury_olive_gift_box_1794054054136.jpg',
    description: 'Deep olive green rigid matte chest with warm cream typographic label and satin grosgrain ribbon.',
  },
  {
    id: 'box-pine',
    name: 'Chiniot Handcrafted Pinewood Chest',
    urduName: 'چنیوٹ شاہی ووڈن باکس',
    capacity: 4,
    basePrice: 1850,
    image: 'https://images.unsplash.com/photo-1513519245088-0e12902e5a38?auto=format&fit=crop&w=800&q=80',
    description: 'Natural seasoned pinewood with antique brass latch & fitted cradles.',
  },
  {
    id: 'box-velvet',
    name: 'Zamarrud Emerald Velvet 6-Partition Tray',
    urduName: 'زمرد ایمرلڈ ویلوٹ ٹرے',
    capacity: 6,
    basePrice: 2400,
    image: 'https://images.unsplash.com/photo-1549465220-1a8b9238cd48?auto=format&fit=crop&w=800&q=80',
    description: 'Deep forest green velvet with gold zari border and clear acrylic protective lid.',
  },
];

interface DryFruitFilling {
  id: string;
  name: string;
  weightGrams: number;
  price: number;
  image: string;
}

const FILLINGS: DryFruitFilling[] = [
  {
    id: 'fill-mamra',
    name: 'Kashmiri Mamra Almonds (AAA)',
    weightGrams: 200,
    price: 1750,
    image: 'https://images.unsplash.com/photo-1508746829417-e6f548d8d6ed?auto=format&fit=crop&w=400&q=80',
  },
  {
    id: 'fill-walnut',
    name: 'Gilgit Snow White Walnuts',
    weightGrams: 200,
    price: 1350,
    image: 'https://images.unsplash.com/photo-1563861826100-9cb868fdbe1c?auto=format&fit=crop&w=400&q=80',
  },
  {
    id: 'fill-cashew',
    name: 'Jumbo Roasted Cashews W180',
    weightGrams: 200,
    price: 1400,
    image: 'https://images.unsplash.com/photo-1536591375315-1b83681403bf?auto=format&fit=crop&w=400&q=80',
  },
  {
    id: 'fill-chilgoza',
    name: 'Balochistan Roasted Chilgoza',
    weightGrams: 150,
    price: 2600,
    image: 'https://images.unsplash.com/photo-1574545488652-2a97d6b6c387?auto=format&fit=crop&w=400&q=80',
  },
  {
    id: 'fill-ajwa',
    name: 'Ajwa Al-Madinah VIP Dates',
    weightGrams: 250,
    price: 1300,
    image: 'https://images.unsplash.com/photo-1598030304671-5aa1d6f21128?auto=format&fit=crop&w=400&q=80',
  },
  {
    id: 'fill-raisin',
    name: 'Kandahari Sundarkhani Raisins',
    weightGrams: 200,
    price: 650,
    image: 'https://images.unsplash.com/photo-1590483736622-39da86788790?auto=format&fit=crop&w=400&q=80',
  },
  {
    id: 'fill-panjiri',
    name: 'Shahi Royal Panjiri Jar',
    weightGrams: 200,
    price: 1450,
    image: '/src/assets/images/dry_fruit_powders_culinary_1794054053020.jpg',
  },
];

const RIBBON_COLORS = [
  { name: 'Olive Forest', hex: '#344B36' },
  { name: 'Antique Brass', hex: '#B69A62' },
  { name: 'Warm Terracotta', hex: '#B96F50' },
  { name: 'Deep Espresso', hex: '#302A25' },
];

export const GiftBoxBuilder: React.FC = () => {
  const { addToCart, setIsCartOpen } = useStore();

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [selectedBox, setSelectedBox] = useState<BoxOption>(BOX_OPTIONS[0]);
  const [selectedFillings, setSelectedFillings] = useState<DryFruitFilling[]>([
    FILLINGS[0],
    FILLINGS[1],
    FILLINGS[2],
    FILLINGS[4],
  ]);
  const [ribbonColor, setRibbonColor] = useState(RIBBON_COLORS[0].name);
  const [giftOccasion, setGiftOccasion] = useState('Wedding / Shadi Mubarak');
  const [giftCardRecipient, setGiftCardRecipient] = useState('');
  const [giftCardMessage, setGiftCardMessage] = useState(
    'Wishing you and your family abundant health, barakah, and joyous celebrations with these mountain harvests.'
  );

  const fillingsPrice = selectedFillings.reduce((acc, f) => acc + f.price, 0);
  const totalBoxPrice = selectedBox.basePrice + fillingsPrice;

  const toggleFilling = (item: DryFruitFilling) => {
    if (selectedFillings.some((f) => f.id === item.id)) {
      setSelectedFillings(selectedFillings.filter((f) => f.id !== item.id));
    } else {
      if (selectedFillings.length >= selectedBox.capacity) {
        alert(
          `This box can hold a maximum of ${selectedBox.capacity} compartments. Please remove one item first.`
        );
        return;
      }
      setSelectedFillings([...selectedFillings, item]);
    }
  };

  const handleAddBoxToCart = () => {
    if (selectedFillings.length < 2) {
      alert('Please select at least 2 dry fruit fillings for your custom gift box.');
      return;
    }

    const customProduct = {
      id: `custom-gift-${Date.now()}`,
      name: `Custom ${selectedBox.name}`,
      slug: `custom-gift-box-${Date.now()}`,
      category: 'gift-boxes' as const,
      categoryLabel: 'Luxury Gift Boxes',
      shortDescription: `Custom curation of ${selectedFillings.map((f) => f.name).join(', ')}.`,
      description: `Bespoke artisanal gift box with ${ribbonColor} ribbon. Greeting: "${giftCardMessage}"`,
      origin: 'Custom Hand-Packed in Lahore Hub',
      packaging: selectedBox.name,
      shelfLife: '9 Months',
      imageUrl: selectedBox.image,
      galleryImages: [selectedBox.image],
      variants: [
        {
          id: `var-${Date.now()}`,
          weight: `${selectedFillings.length} Jars Curation`,
          sku: `CUSTOM-GIFT-${Math.floor(1000 + Math.random() * 9000)}`,
          price: totalBoxPrice,
          stock: 50,
        },
      ],
      featured: false,
      bestSeller: false,
      rating: 5.0,
      reviewCount: 1,
      nutritionFacts: {
        servingSize: 'Assorted Gourmet Selection',
        calories: 168,
        protein: '5.0g',
        healthyFats: '14.0g',
        carbs: '9.0g',
        fiber: '2.5g',
        minerals: 'Assorted mountain minerals',
      },
      healthBenefits: ['Tailored selection of hand-picked single-origin harvests'],
      inStock: true,
    };

    addToCart(
      customProduct,
      customProduct.variants[0],
      1,
      `Occasion: ${giftOccasion} | To: ${giftCardRecipient || 'Beloved Family'} | Note: ${giftCardMessage}`,
      selectedBox.name
    );

    setIsCartOpen(true);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      {/* Header */}
      <div className="text-center max-w-2xl mx-auto mb-10">
        <span className="text-xs uppercase tracking-[0.25em] font-semibold text-[#A5AD91] block mb-1">
          Bespoke Presentation
        </span>
        <h1 className="font-serif text-3xl sm:text-4xl text-[#344B36]">
          Curate a Thoughtful Gift Hamper
        </h1>
        <p className="text-xs sm:text-sm text-[#5E5750] mt-2 font-sans">
          Select handcrafted packaging, pick pure single-origin mountain harvests, and compose a personalized calligraphy card.
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
          <span className="w-5 h-5 rounded-full bg-[#344B36] text-[#F7F4EC] text-[10px] flex items-center justify-center">
            1
          </span>
          <span>Box Style</span>
        </button>

        <button
          onClick={() => setStep(2)}
          className={`flex items-center space-x-2 text-xs uppercase tracking-wider font-bold pb-2 cursor-pointer transition-all ${
            step === 2
              ? 'text-[#344B36] border-b-2 border-[#344B36]'
              : 'text-gray-400 hover:text-gray-700'
          }`}
        >
          <span className="w-5 h-5 rounded-full bg-[#344B36] text-[#F7F4EC] text-[10px] flex items-center justify-center">
            2
          </span>
          <span>Fillings ({selectedFillings.length}/{selectedBox.capacity})</span>
        </button>

        <button
          onClick={() => setStep(3)}
          className={`flex items-center space-x-2 text-xs uppercase tracking-wider font-bold pb-2 cursor-pointer transition-all ${
            step === 3
              ? 'text-[#344B36] border-b-2 border-[#344B36]'
              : 'text-gray-400 hover:text-gray-700'
          }`}
        >
          <span className="w-5 h-5 rounded-full bg-[#344B36] text-[#F7F4EC] text-[10px] flex items-center justify-center">
            3
          </span>
          <span>Ribbon &amp; Note</span>
        </button>
      </div>

      {/* Main Grid: Options on Left, Live Box Preview on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Step Content */}
        <div className="lg:col-span-2">
          {/* STEP 1 */}
          {step === 1 && (
            <div className="space-y-6">
              <h3 className="font-serif text-xl font-bold text-[#302A25]">
                Step 1: Choose Your Outer Box Craftsmanship
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {BOX_OPTIONS.map((box) => {
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
                        <h4 className="font-serif text-base font-bold text-[#302A25] leading-snug">
                          {box.name}
                        </h4>
                        <p className="text-xs text-[#B69A62] font-serif mb-1">
                          {box.urduName}
                        </p>
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
                  <span>Select Dry Fruits</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 2 */}
          {step === 2 && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-serif text-xl font-bold text-[#302A25]">
                    Step 2: Choose Up To {selectedBox.capacity} Dry Fruits
                  </h3>
                  <p className="text-xs text-[#5E5750]">
                    Selected: {selectedFillings.length} of {selectedBox.capacity} portions
                  </p>
                </div>
                {selectedFillings.length === selectedBox.capacity && (
                  <span className="bg-emerald-50 text-emerald-800 text-[11px] font-semibold px-2.5 py-0.5 rounded-full flex items-center space-x-1">
                    <Check className="w-3.5 h-3.5" />
                    <span>Box Filled</span>
                  </span>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {FILLINGS.map((item) => {
                  const isChecked = selectedFillings.some((f) => f.id === item.id);
                  return (
                    <div
                      key={item.id}
                      onClick={() => toggleFilling(item)}
                      className={`p-3 rounded-2xl border flex items-center space-x-3 cursor-pointer transition-all ${
                        isChecked
                          ? 'border-[#344B36] bg-white shadow-2xs'
                          : 'border-[#E7DDCA] bg-[#F7F4EC] hover:bg-white'
                      }`}
                    >
                      <img
                        src={item.image}
                        alt={item.name}
                        className="w-14 h-14 rounded-xl object-cover"
                      />
                      <div className="flex-1 min-w-0">
                        <h4 className="text-xs font-bold text-[#302A25] truncate">
                          {item.name}
                        </h4>
                        <p className="text-[11px] text-gray-500">
                          {item.weightGrams}g Jar ·{' '}
                          <span className="text-[#344B36] font-semibold tabular-nums">
                            Rs. {item.price.toLocaleString()}
                          </span>
                        </p>
                      </div>
                      <div
                        className={`w-6 h-6 rounded-full flex items-center justify-center border transition-all ${
                          isChecked
                            ? 'bg-[#344B36] text-white border-[#344B36]'
                            : 'border-gray-300'
                        }`}
                      >
                        {isChecked ? <Check className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5 text-gray-400" />}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="flex justify-between pt-4">
                <button
                  onClick={() => setStep(1)}
                  className="px-5 py-2.5 border border-[#E7DDCA] text-xs font-bold uppercase tracking-wider rounded-xl text-gray-700 hover:bg-[#E7DDCA] cursor-pointer"
                >
                  Back to Box
                </button>
                <button
                  onClick={() => setStep(3)}
                  disabled={selectedFillings.length === 0}
                  className="px-6 py-3 bg-[#344B36] text-[#F7F4EC] text-xs font-bold uppercase tracking-wider rounded-xl hover:bg-[#233425] flex items-center space-x-2 cursor-pointer shadow-md disabled:opacity-50"
                >
                  <span>Ribbon &amp; Message</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 3 */}
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
                  onClick={() => setStep(2)}
                  className="px-5 py-2.5 border border-[#E7DDCA] text-xs font-bold uppercase tracking-wider rounded-xl text-gray-700 hover:bg-[#E7DDCA] cursor-pointer"
                >
                  Back to Fillings
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Live Summary */}
        <div className="bg-white rounded-3xl p-6 border border-[#E7DDCA] shadow-xl flex flex-col justify-between h-fit sticky top-24">
          <div>
            <div className="flex items-center space-x-2 text-[#A5AD91] mb-2">
              <Gift className="w-4 h-4 text-[#344B36]" />
              <span className="text-[10px] font-bold uppercase tracking-widest text-[#344B36]">
                Hamper Preview
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

            {/* Selected items */}
            <div className="space-y-1.5 mb-4">
              <div className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                Harvests ({selectedFillings.length}/{selectedBox.capacity}):
              </div>

              {selectedFillings.map((f) => (
                <div
                  key={f.id}
                  className="flex items-center justify-between text-xs py-1 border-b border-gray-100"
                >
                  <span className="truncate pr-2 text-gray-700">
                    {f.name} ({f.weightGrams}g)
                  </span>
                  <div className="flex items-center space-x-2">
                    <span className="font-semibold text-[#344B36] tabular-nums">
                      Rs. {f.price.toLocaleString()}
                    </span>
                    <button
                      onClick={() => toggleFilling(f)}
                      className="text-gray-400 hover:text-red-600"
                      title="Remove"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Breakdown */}
            <div className="bg-[#F7F4EC] p-3.5 rounded-2xl border border-[#E7DDCA] space-y-1.5 text-xs text-[#5E5750] mb-6">
              <div className="flex justify-between">
                <span>Box Craftsmanship:</span>
                <span className="tabular-nums">Rs. {selectedBox.basePrice.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span>Artisanal Fillings:</span>
                <span className="tabular-nums">Rs. {fillingsPrice.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span>Calligraphy Card:</span>
                <span className="text-[#344B36] font-semibold">Complimentary</span>
              </div>
              <div className="pt-2 border-t border-[#E7DDCA] flex justify-between font-bold text-sm text-[#344B36]">
                <span>Total Hamper:</span>
                <span className="font-serif text-lg tabular-nums">Rs. {totalBoxPrice.toLocaleString()}</span>
              </div>
            </div>
          </div>

          <button
            onClick={handleAddBoxToCart}
            className="w-full py-4 bg-[#344B36] hover:bg-[#233425] text-[#F7F4EC] rounded-2xl font-sans text-xs font-bold uppercase tracking-widest flex items-center justify-center space-x-2 shadow-lg transition-all cursor-pointer"
          >
            <ShoppingBag className="w-4 h-4 text-[#B69A62]" />
            <span>Add Hamper to Cart</span>
          </button>
        </div>
      </div>
    </div>
  );
};
