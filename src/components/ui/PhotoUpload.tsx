import React, { useState, useRef } from 'react';
import { 
  CameraIcon, 
  PhotoIcon, 
  UserIcon, 
  XMarkIcon,
  ArrowPathIcon 
} from '@heroicons/react/24/outline';
import { Button } from './Button';
import { validatePhoto, uploadPhoto } from '../../lib/storage';

interface PhotoUploadProps {
  currentPhotoUrl?: string;
  onPhotoSelect: (file: File) => void;
  onPhotoRemove: () => void;
  uploading?: boolean;
  className?: string;
  userId?: string;
  userRole?: 'admin' | 'staff' | 'client' | 'practitioner';
}

export function PhotoUpload({ 
  currentPhotoUrl, 
  onPhotoSelect, 
  onPhotoRemove, 
  uploading = false,
  className = '',
  userId,
  userRole = 'client'
}: PhotoUploadProps) {
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [showCameraModal, setShowCameraModal] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);

  const handlePhotoSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && userId) {
      const validation = validatePhoto(file);
      if (!validation.isValid) {
        alert(validation.error);
        return;
      }

      try {
        const storagePath = getStoragePath(userRole, userId);
        await uploadPhoto(file, storagePath);
        
        const reader = new FileReader();
        reader.onload = (e) => {
          setPhotoPreview(e.target?.result as string);
        };
        reader.readAsDataURL(file);
        onPhotoSelect(file);
      } catch (error) {
        console.error('Error uploading photo:', error);
        alert('Failed to upload photo. Please try again.');
      }
    }
  };

  const getStoragePath = (role: string, id: string) => {
    switch (role) {
      case 'staff':
        return `staff/${id}`;
      case 'practitioner':
        return `practitioners/${id}`;
      case 'client':
        return `clients/${id}`;
      case 'admin':
      default:
        return `users/${id}/avatar`;
    }
  };

  const handleCameraCapture = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          facingMode: 'environment',
          width: { ideal: 1280 },
          height: { ideal: 720 }
        } 
      });
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
      setShowCameraModal(true);
    } catch (error) {
      console.error('Camera access denied:', error);
      alert('Camera access denied. Please use file upload instead.');
      document.getElementById('photo-input')?.click();
    }
  };

  const handleCapture = () => {
    if (!videoRef.current || !userId) return;

    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    
    const context = canvas.getContext('2d');
    if (!context) return;

    context.drawImage(videoRef.current, 0, 0);
    
    canvas.toBlob(async (blob) => {
      if (blob) {
        const file = new File([blob], `photo_${Date.now()}.jpg`, { type: 'image/jpeg' });
        const validation = validatePhoto(file);
        if (!validation.isValid) {
          alert(validation.error);
          return;
        }

        try {
          const storagePath = getStoragePath(userRole, userId);
          await uploadPhoto(file, storagePath);
          setPhotoPreview(URL.createObjectURL(blob));
          onPhotoSelect(file);
          handleCloseCameraModal();
        } catch (error) {
          console.error('Error uploading photo:', error);
          alert('Failed to upload photo. Please try again.');
        }
      }
    }, 'image/jpeg', 0.8);
  };

  const handleCloseCameraModal = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    setShowCameraModal(false);
  };

  return (
    <div className={`relative ${className}`}>
      <div className="flex flex-col items-center">
        {/* Photo preview or placeholder */}
        <div className="relative h-24 w-24 rounded-full overflow-hidden bg-gray-100 flex items-center justify-center border border-gray-200 mb-4">
          {(photoPreview || currentPhotoUrl) ? (
            <div className="relative group">
              <img
                src={photoPreview || currentPhotoUrl}
                alt="Profile"
                className="h-24 w-24 object-cover"
              />
              <button
                onClick={() => {
                  setPhotoPreview(null);
                  onPhotoRemove();
                  const input = document.getElementById('photo-input') as HTMLInputElement;
                  if (input) input.value = '';
                }}
                className="absolute -top-1 -right-1 bg-red-500 hover:bg-red-600 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity shadow-sm"
                disabled={uploading}
              >
                <XMarkIcon className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <UserIcon className="w-12 h-12 text-gray-400" />
          )}
        </div>

        {/* Upload buttons */}
        <div className="flex space-x-2 mb-3">
          <input
            type="file"
            id="photo-input"
            accept="image/*"
            onChange={handlePhotoSelect}
            className="hidden"
            disabled={uploading}
          />
          
          <Button
            variant="outline"
            size="xs"
            onClick={() => document.getElementById('photo-input')?.click()}
            disabled={uploading}
          >
            <PhotoIcon className="w-3.5 h-3.5 mr-1.5" />
            Upload
          </Button>
          
          <Button
            variant="outline"
            size="xs"
            onClick={handleCameraCapture}
            disabled={uploading}
          >
            <CameraIcon className="w-3.5 h-3.5 mr-1.5" />
            Camera
          </Button>
        </div>

        {uploading && (
          <div className="flex items-center justify-center text-xs text-gray-600 mb-2">
            <ArrowPathIcon className="w-3.5 h-3.5 mr-1.5 animate-spin" />
            Uploading...
          </div>
        )}
        
        <p className="text-xs text-gray-500 text-center">
          Maximum size: 5MB<br />Formats: JPG, PNG, GIF
        </p>
      </div>

      {/* Camera Modal */}
      {showCameraModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
          <div className="bg-white p-4 rounded-lg max-w-2xl w-full mx-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium">Take Photo</h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleCloseCameraModal}
              >
                <XMarkIcon className="w-5 h-5" />
              </Button>
            </div>
            
            <div className="relative aspect-video bg-gray-900 rounded-lg overflow-hidden mb-4">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                className="w-full h-full object-cover"
              />
            </div>
            
            <div className="flex justify-end space-x-2">
              <Button
                variant="outline"
                onClick={handleCloseCameraModal}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={handleCapture}
              >
                <CameraIcon className="w-5 h-5 mr-2" />
                Capture
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}