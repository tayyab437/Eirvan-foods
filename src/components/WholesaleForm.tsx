import React, { useState } from 'react';
import { useStore } from '../context/StoreContext';
import { Building2, Mail, Phone, User, Calendar, MessageSquare, Send, CheckCircle } from 'lucide-react';

const WholesaleForm: React.FC = () => {
  const { submitWholesaleInquiry } = useStore();
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const initialFormState = {
    companyName: '',
    contactName: '',
    phone: '',
    email: '',
    inquiryType: 'Corporate Gifting' as 'Corporate Gifting' | 'Wholesale Purchase' | 'Wedding Favors' | 'Other',
    estimatedQuantity: '',
    eventDate: '',
    message: '',
  };
  const [formData, setFormData] = useState(initialFormState);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setSubmitError(null);
    try {
      const sanitizedPayload = {
        companyName: formData.companyName.trim().slice(0, 100),
        contactName: formData.contactName.trim().slice(0, 100),
        phone: formData.phone.trim().slice(0, 30),
        email: formData.email.trim().slice(0, 100),
        inquiryType: formData.inquiryType,
        estimatedQuantity: formData.estimatedQuantity.trim().slice(0, 100),
        ...(formData.eventDate ? { eventDate: formData.eventDate.slice(0, 32) } : {}),
        message: formData.message.trim().slice(0, 2000),
      };
      await submitWholesaleInquiry(sanitizedPayload);
      setIsSubmitted(true);
      setFormData(initialFormState);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (error) {
      console.error('Submission error:', error);
      setSubmitError('Unable to submit inquiry right now. Please verify your details and try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  if (isSubmitted) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center bg-[#F7F4EC] px-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center border border-[#B69A62]/20">
          <div className="w-20 h-20 bg-[#244C37]/10 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-12 h-12 text-[#244C37]" />
          </div>
          <h2 className="text-3xl font-serif font-bold text-[#244C37] mb-4">Inquiry Received!</h2>
          <p className="text-[#244C37]/70 mb-8">
            Thank you for reaching out. Our corporate sales team will review your inquiry and contact you within 24-48 hours.
          </p>
          <button
            onClick={() => setIsSubmitted(false)}
            className="w-full py-4 bg-[#244C37] text-white rounded-xl font-bold hover:bg-[#1a3829] transition-all cursor-pointer"
          >
            Send Another Inquiry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#F7F4EC] py-16 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">
          {/* Left Side: Content */}
          <div className="space-y-8">
            <div>
              <h1 className="text-4xl sm:text-5xl font-serif font-bold text-[#244C37] mb-6 leading-tight">
                Premium Solutions for <span className="text-[#B69A62]">Wholesale & Gifting</span>
              </h1>
              <p className="text-lg text-[#244C37]/80 leading-relaxed max-w-xl">
                Elevate your corporate gifting, wedding favors, or retail collection with our artisanal premium dry fruits and custom mixes. We offer competitive wholesale pricing and personalized branding options.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {[
                { title: 'Corporate Gifting', desc: 'Impress clients and employees with luxury hampers.' },
                { title: 'Wholesale Orders', desc: 'Premium quality stock for your retail business.' },
                { title: 'Wedding Favors', desc: 'Elegant custom packaging for your special day.' },
                { title: 'Custom Branding', desc: 'Add your logo and personalized messages.' },
              ].map((item, i) => (
                <div key={i} className="p-6 bg-white rounded-xl border border-[#B69A62]/10 shadow-sm">
                  <h3 className="font-bold text-[#244C37] mb-2">{item.title}</h3>
                  <p className="text-sm text-[#244C37]/60">{item.desc}</p>
                </div>
              ))}
            </div>

            <div className="p-8 bg-[#244C37] rounded-2xl text-white">
              <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                <Phone className="w-5 h-5 text-[#B69A62]" /> Direct Support
              </h3>
              <p className="text-white/80 mb-6">Need immediate assistance with a large order?</p>
              <a 
                href="tel:+923176369458"
                className="text-2xl font-bold text-[#B69A62] hover:text-[#D4AF37] transition-colors"
              >
                +92 317 6369458
              </a>
            </div>
          </div>

          {/* Right Side: Form */}
          <div className="bg-white rounded-2xl shadow-2xl p-8 border border-[#B69A62]/20 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-[#B69A62]/5 rounded-bl-full -mr-16 -mt-16"></div>
            
            <form onSubmit={handleSubmit} className="space-y-6 relative z-10">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-[#244C37] mb-2 flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-[#B69A62]" /> Company Name
                  </label>
                  <input
                    required
                    type="text"
                    name="companyName"
                    maxLength={100}
                    value={formData.companyName}
                    onChange={handleChange}
                    placeholder="Enter company or event name"
                    className="w-full px-4 py-3 rounded-xl border border-[#244C37]/10 focus:ring-2 focus:ring-[#B69A62] focus:border-transparent outline-none transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#244C37] mb-2 flex items-center gap-2">
                    <User className="w-4 h-4 text-[#B69A62]" /> Contact Person
                  </label>
                  <input
                    required
                    type="text"
                    name="contactName"
                    maxLength={100}
                    value={formData.contactName}
                    onChange={handleChange}
                    placeholder="Your full name"
                    className="w-full px-4 py-3 rounded-xl border border-[#244C37]/10 focus:ring-2 focus:ring-[#B69A62] focus:border-transparent outline-none transition-all"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-[#244C37] mb-2 flex items-center gap-2">
                    <Phone className="w-4 h-4 text-[#B69A62]" /> Phone Number
                  </label>
                  <input
                    required
                    type="tel"
                    name="phone"
                    minLength={3}
                    maxLength={30}
                    value={formData.phone}
                    onChange={handleChange}
                    placeholder="e.g. 0300 1234567"
                    className="w-full px-4 py-3 rounded-xl border border-[#244C37]/10 focus:ring-2 focus:ring-[#B69A62] focus:border-transparent outline-none transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#244C37] mb-2 flex items-center gap-2">
                    <Mail className="w-4 h-4 text-[#B69A62]" /> Email Address
                  </label>
                  <input
                    required
                    type="email"
                    name="email"
                    minLength={3}
                    maxLength={100}
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="your@email.com"
                    className="w-full px-4 py-3 rounded-xl border border-[#244C37]/10 focus:ring-2 focus:ring-[#B69A62] focus:border-transparent outline-none transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-[#244C37] mb-2">Inquiry Type</label>
                <select
                  name="inquiryType"
                  value={formData.inquiryType}
                  onChange={handleChange}
                  className="w-full px-4 py-3 rounded-xl border border-[#244C37]/10 focus:ring-2 focus:ring-[#B69A62] focus:border-transparent outline-none transition-all bg-white"
                >
                  <option value="Corporate Gifting">Corporate Gifting</option>
                  <option value="Wholesale Purchase">Wholesale Purchase</option>
                  <option value="Wedding Favors">Wedding Favors</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-[#244C37] mb-2">Estimated Quantity</label>
                  <input
                    required
                    type="text"
                    name="estimatedQuantity"
                    maxLength={100}
                    value={formData.estimatedQuantity}
                    onChange={handleChange}
                    placeholder="e.g. 50 boxes / 100 kg"
                    className="w-full px-4 py-3 rounded-xl border border-[#244C37]/10 focus:ring-2 focus:ring-[#B69A62] focus:border-transparent outline-none transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#244C37] mb-2 flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-[#B69A62]" /> Preferred Date
                  </label>
                  <input
                    type="date"
                    name="eventDate"
                    value={formData.eventDate}
                    onChange={handleChange}
                    className="w-full px-4 py-3 rounded-xl border border-[#244C37]/10 focus:ring-2 focus:ring-[#B69A62] focus:border-transparent outline-none transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-[#244C37] mb-2 flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-[#B69A62]" /> Message / Requirements
                </label>
                <textarea
                  name="message"
                  maxLength={2000}
                  value={formData.message}
                  onChange={handleChange}
                  rows={4}
                  placeholder="Tell us about your specific needs..."
                  className="w-full px-4 py-3 rounded-xl border border-[#244C37]/10 focus:ring-2 focus:ring-[#B69A62] focus:border-transparent outline-none transition-all resize-none"
                ></textarea>
              </div>

              {submitError && (
                <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-xs font-medium text-red-700">
                  {submitError}
                </div>
              )}

              <button
                disabled={isLoading}
                type="submit"
                className="w-full py-4 bg-[#244C37] text-white rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-[#1a3829] transition-all shadow-lg hover:shadow-[#244C37]/20 disabled:opacity-50 cursor-pointer"
              >
                {isLoading ? (
                  <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <>
                    <Send className="w-5 h-5" /> Submit Inquiry
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WholesaleForm;
