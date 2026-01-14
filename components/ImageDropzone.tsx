
import React, { useRef } from 'react';

interface ImageDropzoneProps {
  onImageSelected: (base64: string) => void;
  currentImage: string | null;
}

export const ImageDropzone: React.FC<ImageDropzoneProps> = ({ onImageSelected, currentImage }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        onImageSelected(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div 
      onClick={handleClick}
      className={`relative group cursor-pointer border-2 border-dashed rounded-2xl overflow-hidden transition-all duration-300 h-64 flex items-center justify-center 
        ${currentImage ? 'border-indigo-500' : 'border-slate-300 hover:border-indigo-400 bg-white'}`}
    >
      <input 
        type="file" 
        ref={fileInputRef} 
        className="hidden" 
        accept="image/*" 
        onChange={handleFileChange} 
      />
      
      {currentImage ? (
        <div className="w-full h-full relative">
          <img 
            src={currentImage} 
            alt="Preview" 
            className="w-full h-full object-contain"
          />
          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
            <span className="text-white font-medium">Change Image</span>
          </div>
        </div>
      ) : (
        <div className="text-center p-6">
          <div className="mx-auto w-12 h-12 bg-indigo-50 rounded-full flex items-center justify-center mb-4 group-hover:bg-indigo-100 transition-colors">
            <svg className="w-6 h-6 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
            </svg>
          </div>
          <p className="text-slate-600 font-medium">Click to upload an image</p>
          <p className="text-slate-400 text-sm mt-1">PNG, JPG up to 10MB</p>
        </div>
      )}
    </div>
  );
};
