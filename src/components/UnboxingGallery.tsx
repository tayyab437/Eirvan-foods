import React, { useState } from 'react';
import { useStore } from '../context/StoreContext';
import { UnboxingReview } from '../types';
import { Star, CheckCircle, PackageCheck, Camera, X } from 'lucide-react';

export const UnboxingGallery: React.FC = () => {
  const { unboxingReviews } = useStore();
  const [selectedPhoto, setSelectedPhoto] = useState<UnboxingReview | null>(null);

  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-10 pb-4 border-b border-[#E7DDCA] gap-4">
        <div>
          <div className="flex items-center space-x-2 mb-1.5">
            <span className="text-xs uppercase tracking-widest font-mono font-bold text-[#B69A62] bg-[#244C37] px-2.5 py-0.5 rounded-full flex items-center space-x-1">
              <Camera className="w-3 h-3 text-[#B69A62]" />
              <span>Real Customer Photos</span>
            </span>
            <span className="text-xs text-gray-500">• Verified Purchases</span>
          </div>
          <h2 className="font-serif text-3xl sm:text-4xl text-[#302A25]">
            Customer Unboxing &amp; Packaging Gallery
          </h2>
        </div>
        <p className="text-xs text-gray-500 max-w-sm">
          Authentic photos shared by buyers across Lahore, Karachi, Islamabad, and nationwide upon receiving their vacuum-sealed tins and Shahi chests.
        </p>
      </div>

      {/* Grid of Unboxing Photo Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {unboxingReviews.map((item) => (
          <div
            key={item.id}
            onClick={() => setSelectedPhoto(item)}
            className="bg-white rounded-3xl border border-[#E7DDCA] overflow-hidden shadow-xs hover:shadow-xl transition-all duration-300 flex flex-col justify-between cursor-pointer group"
          >
            <div>
              {/* Unboxing Photo Container */}
              <div className="aspect-4/3 relative overflow-hidden bg-[#F7F4EC]">
                <img
                  src={item.unboxingPhoto}
                  alt={item.productName}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />

                {/* Verified Buyer Badge Overlay */}
                <div className="absolute top-3 left-3 bg-emerald-800/90 text-white text-[10px] font-bold px-2.5 py-1 rounded-full backdrop-blur-md flex items-center space-x-1 shadow-xs">
                  <CheckCircle className="w-3 h-3 text-emerald-300" />
                  <span>Verified Buyer</span>
                </div>

                {item.boxStyle && (
                  <div className="absolute bottom-3 right-3 bg-black/60 text-[#F7F4EC] text-[10px] font-mono px-2 py-0.5 rounded-md backdrop-blur-xs">
                    {item.boxStyle}
                  </div>
                )}
              </div>

              {/* Review Content */}
              <div className="p-5 space-y-2">
                <div className="flex text-[#B69A62]">
                  {[...Array(item.rating)].map((_, i) => (
                    <Star key={i} className="w-3.5 h-3.5 fill-current" />
                  ))}
                </div>

                <h3 className="font-serif text-base font-bold text-[#302A25] line-clamp-1">
                  {item.productName}
                </h3>

                <p className="text-xs text-[#5E5750] line-clamp-3 leading-relaxed italic font-serif">
                  &quot;{item.comment}&quot;
                </p>
              </div>
            </div>

            {/* Author Footer */}
            <div className="p-5 pt-0 border-t border-[#E7DDCA]/50 mt-2 pt-3 flex items-center justify-between text-xs text-gray-500">
              <div>
                <span className="font-bold text-[#302A25] block truncate max-w-[140px]">
                  {item.customerName}
                </span>
                <span className="text-[10px] text-[#344B36] font-medium">{item.city}</span>
              </div>
              <span className="text-[10px] text-gray-400 font-mono">{item.date}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Lightbox Photo Modal */}
      {selectedPhoto && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-[#E7DDCA] overflow-hidden my-auto flex flex-col md:flex-row">
            <button
              onClick={() => setSelectedPhoto(null)}
              className="absolute top-4 right-4 z-20 p-2.5 rounded-full bg-black/60 text-white hover:bg-black transition-all cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Image Left */}
            <div className="w-full md:w-1/2 aspect-square md:aspect-auto bg-black relative">
              <img
                src={selectedPhoto.unboxingPhoto}
                alt=""
                className="w-full h-full object-cover"
              />
            </div>

            {/* Details Right */}
            <div className="w-full md:w-1/2 p-6 flex flex-col justify-between space-y-4">
              <div>
                <div className="flex items-center space-x-2 text-emerald-800 text-xs font-bold mb-2">
                  <PackageCheck className="w-4 h-4 text-emerald-600" />
                  <span>Verified Order Unboxing</span>
                </div>

                <h3 className="font-serif text-xl font-bold text-[#302A25] mb-1">
                  {selectedPhoto.productName}
                </h3>

                <div className="flex text-[#B69A62] mb-3">
                  {[...Array(selectedPhoto.rating)].map((_, i) => (
                    <Star key={i} className="w-4 h-4 fill-current" />
                  ))}
                </div>

                <p className="text-xs text-[#5E5750] leading-relaxed italic font-serif bg-[#F7F4EC] p-4 rounded-2xl border border-[#E7DDCA]">
                  &quot;{selectedPhoto.comment}&quot;
                </p>
              </div>

              <div className="pt-4 border-t border-[#E7DDCA] flex items-center justify-between text-xs">
                <div>
                  <span className="font-bold text-[#302A25] block">
                    {selectedPhoto.customerName}
                  </span>
                  <span className="text-gray-400">{selectedPhoto.city}</span>
                </div>
                <span className="text-[11px] font-mono text-gray-400">{selectedPhoto.date}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};
