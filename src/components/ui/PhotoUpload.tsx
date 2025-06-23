import React, { useState } from 'react';
import { 
  CameraIcon, 
  PhotoIcon, 
  UserIcon, 
  XMarkIcon,
  ArrowPathIcon 
} from '@heroicons/react/24/outline';
import { Button } from './Button';

interface PhotoUploadProps {
  currentPhotoUrl?: string;
  onPhotoSelect: (file: File) => void;
  onPhotoRemove: () => void;
  uploading?: boolean;
  className?: string;
}

export function PhotoUpload({ 
  currentPhotoUrl, 
  onPhotoSelect, 
  onPhotoRemove, 
  uploading = false,
  className = '' 
}: PhotoUploadProps) {
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);

  const handlePhotoSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        alert('Photo size must be less than 5MB');
        return;
      }
      
      if (!file.type.startsWith('image/')) {
        alert('Please select a valid image file');
        return;
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        setPhotoPreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
      onPhotoSelect(file);
    }
  };

  const handleCameraCapture = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      // For now, just trigger file input
      // In a real implementation, you'd show a camera modal
      stream.getTracks().forEach(track => track.stop());
      document.getElementById('photo-input')?.click();
    } catch (error) {
      console.error('Camera access denied:', error);
      alert('Camera access denied. Please use file upload instead.');
      document.getElementById('photo-input')?.click();
    }
  };

  const handleRemovePhoto = () => {
    setPhotoPreview(null);
    onPhotoRemove();
    // Reset file input
    const input = document.getElementById('photo-input') as HTMLInputElement;
    if (input) input.value = '';
  };

  const displayPhoto = photoPreview || currentPhotoUrl;

  return (
    <div className={`space-y-4 ${className}`}>
      <h3 className="text-lg font-medium text-gray-900">Profile Photo</h3>
      
      <div className="flex items-center space-x-4">
        {/* Photo Preview */}
        <div className="relative">
          {displayPhoto ? (
            <div className="relative">
              <img
                src={displayPhoto}
                alt="Profile preview"
                className="w-24 h-24 rounded-full object-cover border-2 border-gray-300"
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleRemovePhoto}
                className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-red-500 hover:bg-red-600 text-white p-0"
                disabled={uploading}
              >
                <XMarkIcon className="w-4 h-4" />
              </Button>
            </div>
          ) : (
            <div className="w-24 h-24 rounded-full bg-gray-200 border-2 border-dashed border-gray-300 flex items-center justify-center">
              <UserIcon className="w-8 h-8 text-gray-400" />
            </div>
          )}
        </div>

        {/* Upload Buttons */}
        <div className="flex flex-col space-y-2">
          <input
            id="photo-input"
            type="file"
            accept="image/*"
            onChange={handlePhotoSelect}
            className="hidden"
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => document.getElementById('photo-input')?.click()}
            disabled={uploading}
          >
            <PhotoIcon className="w-4 h-4 mr-2" />
            Upload Photo
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleCameraCapture}
            disabled={uploading}
          >
            <CameraIcon className="w-4 h-4 mr-2" />
            Take Photo
          </Button>
          {uploading && (
            <div className="flex items-center text-sm text-gray-600">
              <ArrowPathIcon className="w-4 h-4 mr-2 animate-spin" />
              Uploading...
            </div>
          )}
        </div>
      </div>
      
      <p className="text-xs text-gray-500">
        Maximum file size: 5MB. Supported formats: JPG, PNG, GIF
      </p>
    </div>
  );
} 