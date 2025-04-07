'use client';

import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Upload, X } from 'lucide-react';

interface FileUploaderProps {
  onFileSelect: (file: File | null) => void;
  accept?: string;
}

export function FileUploader({ onFileSelect, accept = '*' }: FileUploaderProps) {
  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDrag = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      setSelectedFile(file);
      onFileSelect(file);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      onFileSelect(file);
    }
  };

  const handleButtonClick = () => {
    if (inputRef.current) {
      inputRef.current.click();
    }
  };

  const removeFile = () => {
    setSelectedFile(null);
    onFileSelect(null);
    if (inputRef.current) {
      inputRef.current.value = '';
    }
  };

  return (
    <div className="w-full">
      <div
        className={`border-2 border-dashed rounded-md p-6 flex flex-col items-center justify-center cursor-pointer ${
          dragActive ? 'border-primary bg-primary/5' : 'border-gray-300'
        }`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={handleButtonClick}
      >
        <input
          ref={inputRef}
          type="file"
          className="hidden"
          onChange={handleChange}
          accept={accept}
        />
        
        {selectedFile ? (
          <div className="flex flex-col items-center">
            <p className="text-sm font-medium mb-1">{selectedFile.name}</p>
            <p className="text-xs text-muted-foreground mb-2">
              {(selectedFile.size / 1024).toFixed(2)} KB
            </p>
            <Button 
              type="button" 
              variant="outline" 
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                removeFile();
              }}
            >
              <X className="h-4 w-4 mr-1" /> Remove
            </Button>
          </div>
        ) : (
          <>
            <Upload className="h-10 w-10 text-muted-foreground mb-2" />
            <p className="text-sm font-medium">Drag and drop a file here, or click to select</p>
            <p className="text-xs text-muted-foreground mt-1">
              {accept !== '*' ? `Accepted formats: ${accept.replace(/\./g, '').toUpperCase()}` : 'All file types accepted'}
            </p>
          </>
        )}
      </div>
    </div>
  );
}
