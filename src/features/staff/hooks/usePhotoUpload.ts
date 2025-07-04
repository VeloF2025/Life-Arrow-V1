import { useState, useRef, useCallback } from 'react';

/**
 * Custom hook for handling photo uploads and camera functionality
 */
export function usePhotoUpload() {
  const [showCamera, setShowCamera] = useState<boolean>(false);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Open camera for photo capture
  const openCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setShowCamera(true);
      }
    } catch (err) {
      console.error('Error accessing camera:', err);
    }
  }, []);
  
  // Close camera and release resources
  const closeCamera = useCallback(() => {
    if (videoRef.current && videoRef.current.srcObject) {
      const tracks = (videoRef.current.srcObject as MediaStream).getTracks();
      tracks.forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
    setShowCamera(false);
  }, []);
  
  // Capture photo from camera
  const capturePhoto = useCallback(() => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      
      // Set canvas dimensions to match video
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      
      // Draw video frame to canvas
      const context = canvas.getContext('2d');
      if (context) {
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        
        // Convert canvas to blob
        canvas.toBlob(blob => {
          if (blob) {
            // Create file from blob
            const file = new File([blob], 'camera-capture.jpg', { type: 'image/jpeg' });
            setPhotoFile(file);
            
            // Create preview URL
            const previewUrl = URL.createObjectURL(blob);
            setPhotoPreview(previewUrl);
            
            // Close camera
            closeCamera();
          }
        }, 'image/jpeg');
      }
    }
  }, [closeCamera]);
  
  // Handle file selection
  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    setPhotoFile(file);
    
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  }, []);
  
  // Trigger file input click
  const triggerFileInput = useCallback(() => {
    fileInputRef.current?.click();
  }, []);
  
  // Clear photo selection
  const clearPhoto = useCallback(() => {
    setPhotoFile(null);
    setPhotoPreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, []);
  
  return {
    photoFile,
    photoPreview,
    showCamera,
    videoRef,
    canvasRef,
    fileInputRef,
    setPhotoPreview,
    openCamera,
    closeCamera,
    capturePhoto,
    handleFileSelect,
    triggerFileInput,
    clearPhoto
  };
}
