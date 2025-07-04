import React from 'react';
import { Button } from '@/components/ui/Button';
import { Dialog } from '@/components/ui/Dialog';

interface PhotoUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCapture: () => void;
  showCamera: boolean;
  videoRef: React.RefObject<HTMLVideoElement>;
  canvasRef: React.RefObject<HTMLCanvasElement>;
  fileInputRef: React.RefObject<HTMLInputElement>;
  onFileSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onTriggerFileInput: () => void;
}

export function PhotoUploadModal({
  isOpen,
  onClose,
  onCapture,
  showCamera,
  videoRef,
  canvasRef,
  fileInputRef,
  onFileSelect,
  onTriggerFileInput
}: PhotoUploadModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <div className="fixed inset-0 bg-black bg-opacity-50 z-40 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg max-w-lg w-full p-6 z-50">
          <h2 className="text-lg font-medium mb-4">Upload Photo</h2>
          
          {showCamera ? (
            <div className="space-y-4">
              <div className="relative bg-black rounded overflow-hidden">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  className="w-full h-auto"
                />
                <canvas ref={canvasRef} className="hidden" />
              </div>
              
              <div className="flex justify-center space-x-3">
                <Button onClick={onCapture} variant="default">
                  Capture
                </Button>
                <Button onClick={onClose} variant="ghost">
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex flex-col items-center justify-center border-2 border-dashed border-gray-300 rounded-lg p-6">
                <p className="text-gray-500 mb-4">Upload a photo or take one with your camera</p>
                
                <div className="flex space-x-3">
                  <Button onClick={onTriggerFileInput} variant="default">
                    Choose File
                  </Button>
                  <Button onClick={() => onClose()} variant="ghost">
                    Cancel
                  </Button>
                </div>
                
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={onFileSelect}
                  accept="image/*"
                  className="hidden"
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </Dialog>
  );
}
