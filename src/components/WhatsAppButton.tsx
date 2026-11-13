import React, { useState } from 'react';
import { useStore } from '../context/StoreContext';
import { MessageCircle, X, ChevronRight } from 'lucide-react';

export const WhatsAppButton: React.FC = () => {
  const { settings } = useStore();
  const [isOpen, setIsOpen] = useState(false);

  const cleanNumber = settings.whatsappNumber.replace(/[^0-9]/g, '');

  const quickMessages = [
    {
      title: 'Order Status & Courier Dispatch',
      text: 'Salam! I would like to check the delivery time and status of an order at Eirvan Foods.',
    },
    {
      title: 'Bespoke Gift Boxes & Corporate Orders',
      text: 'Salam! I am looking for custom dry fruit gift collections for an upcoming wedding / corporate event at Eirvan Foods.',
    },
    {
      title: 'Kashmiri Mamra & Harvest Origin Details',
      text: 'Salam! Please share details about the oil content and freshness of your Kashmiri Mamra almonds at Eirvan Foods.',
    },
    {
      title: 'Direct Chat with Sourcing Concierge',
      text: 'Salam! I have a question about dry fruits and health powders at Eirvan Foods.',
    },
  ];

  const handleOpenWhatsApp = (message: string) => {
    const encoded = encodeURIComponent(message);
    window.open(`https://wa.me/${cleanNumber}?text=${encoded}`, '_blank');
    setIsOpen(false);
  };

  return (
    <div className="fixed bottom-6 right-6 z-40">
      {/* Popover Menu */}
      {isOpen && (
        <div className="mb-3 w-80 bg-white border border-[#0A3D62]/15 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-200">
          <div className="p-4 bg-[#0A3D62] text-[#FBF9F4] flex items-center justify-between border-b border-[#072B47]">
            <div className="flex items-center space-x-2.5">
              <div className="w-8 h-8 rounded-full bg-[#25D366] text-white flex items-center justify-center font-bold">
                <MessageCircle className="w-4 h-4 fill-current" />
              </div>
              <div>
                <h4 className="font-serif text-sm font-semibold tracking-wide text-white">Eirvan Concierge</h4>
                <p className="text-[10px] text-[#EEF5FA]/80 font-mono">Direct WhatsApp • Mon–Sat 9AM–10PM</p>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="text-[#FBF9F4]/70 hover:text-white p-1 cursor-pointer transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="p-3 space-y-1.5 max-h-60 overflow-y-auto bg-white">
            <p className="text-[10px] font-mono uppercase tracking-wider text-[#15222E]/50 px-1 mb-1">
              Select inquiry topic:
            </p>
            {quickMessages.map((item, idx) => (
              <button
                key={idx}
                onClick={() => handleOpenWhatsApp(item.text)}
                className="w-full text-left p-2.5 hover:bg-[#EEF5FA] rounded-xl text-xs text-[#15222E] transition-colors flex items-center justify-between group border border-transparent hover:border-[#0A3D62]/20 cursor-pointer"
              >
                <span className="truncate pr-2 font-medium">{item.title}</span>
                <ChevronRight className="w-3.5 h-3.5 text-[#15222E]/40 group-hover:text-[#4E9B36] shrink-0" />
              </button>
            ))}
          </div>

          <div className="p-2.5 bg-[#FBF9F4] border-t border-[#0A3D62]/10 text-center">
            <span className="text-[10px] text-[#15222E]/70 font-mono">
              Helpline:{' '}
              <a
                href={`https://wa.me/${cleanNumber}`}
                target="_blank"
                rel="noreferrer"
                className="text-[#4E9B36] hover:underline font-semibold"
              >
                {settings.whatsappNumber}
              </a>
              {' '}(Eirvan Foods)
            </span>
          </div>
        </div>
      )}

      {/* Main floating button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-13 h-13 rounded-full bg-[#25D366] hover:bg-[#20ba59] text-white flex items-center justify-center shadow-xl hover:scale-105 transition-all cursor-pointer ring-4 ring-white"
        title="WhatsApp Support"
        aria-label="WhatsApp Support"
      >
        <MessageCircle className="w-6 h-6 fill-current" />
      </button>
    </div>
  );
};
