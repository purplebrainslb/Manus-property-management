'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/lib/supabase/client';
import { useAuth } from '@/lib/auth/auth-context';
import { useRouter, useSearchParams } from 'next/navigation';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FileUploader } from './file-uploader';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ACCEPTED_FILE_TYPES = ['application/pdf', 'image/jpeg', 'image/png', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];

const documentSchema = z.object({
  title: z.string().min(1, { message: 'Title is required' }),
  description: z.string().optional(),
  propertyId: z.string().min(1, { message: 'Property is required' }),
  category: z.enum(['agreement', 'rules', 'financial', 'maintenance', 'other']),
  isPublic: z.boolean().default(true),
});

type DocumentFormValues = z.infer<typeof documentSchema>;

type Property = {
  id: string;
  name: string;
};

export function DocumentUploadForm() {
  const { user } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [properties, setProperties] = useState<Property[]>([]);
  const [loadingProperties, setLoadingProperties] = useState(true);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);

  const propertyIdParam = searchParams.get('propertyId');

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch
  } = useForm<DocumentFormValues>({
    resolver: zodResolver(documentSchema),
    defaultValues: {
      title: '',
      description: '',
      propertyId: propertyIdParam || '',
      category: 'agreement',
      isPublic: true,
    },
  });

  const selectedPropertyId = watch('propertyId');

  // Fetch properties for the dropdown
  useState(() => {
    const fetchProperties = async () => {
      if (!user) return;
      
      try {
        // Get user profile ID
        const { data: userProfile, error: profileError } = await supabase
          .from('user_profiles')
          .select('id')
          .eq('user_id', user.id)
          .single();
          
        if (profileError || !userProfile) {
          throw new Error('Could not find user profile');
        }
        
        // Get properties
        const { data, error: propertiesError } = await supabase
          .from('properties')
          .select('id, name')
          .eq('property_manager_id', userProfile.id)
          .order('name');
          
        if (propertiesError) {
          throw new Error(propertiesError.message);
        }
        
        setProperties(data || []);
        
        // If propertyId is provided in URL and exists in the list, select it
        if (propertyIdParam && data?.some(p => p.id === propertyIdParam)) {
          setValue('propertyId', propertyIdParam);
        }
      } catch (err) {
        console.error('Error fetching properties:', err);
        setError(err instanceof Error ? err.message : 'An unexpected error occurred');
      } finally {
        setLoadingProperties(false);
      }
    };
    
    fetchProperties();
  }, [user, propertyIdParam, setValue]);

  const handleFileChange = (file: File | null) => {
    setFileError(null);
    
    if (!file) {
      setSelectedFile(null);
      return;
    }
    
    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      setFileError(`File size exceeds the maximum limit of ${MAX_FILE_SIZE / (1024 * 1024)}MB`);
      setSelectedFile(null);
      return;
    }
    
    // Validate file type
    if (!ACCEPTED_FILE_TYPES.includes(file.type)) {
      setFileError('File type not supported. Please upload a PDF, Word document, or image file.');
      setSelectedFile(null);
      return;
    }
    
    setSelectedFile(file);
  };

  const onSubmit = async (data: DocumentFormValues) => {
    if (!user || !selectedFile) return;
    
    setIsLoading(true);
    setError(null);

    try {
      // Get user profile ID
      const { data: userProfile, error: profileError } = await supabase
        .from('user_profiles')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (profileError || !userProfile) {
        throw new Error('Could not find user profile');
      }

      // Upload file to Supabase Storage
      const fileExt = selectedFile.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 15)}.${fileExt}`;
      const filePath = `documents/${data.propertyId}/${fileName}`;
      
      const { error: uploadError } = await supabase.storage
        .from('property-documents')
        .upload(filePath, selectedFile);

      if (uploadError) {
        throw new Error(`Error uploading file: ${uploadError.message}`);
      }

      // Get the public URL for the uploaded file
      const { data: publicUrlData } = supabase.storage
        .from('property-documents')
        .getPublicUrl(filePath);

      // Create document record in the database
      const { error: documentError } = await supabase
        .from('documents')
        .insert({
          title: data.title,
          description: data.description || '',
          property_id: data.propertyId,
          category: data.category,
          file_path: filePath,
          file_url: publicUrlData.publicUrl,
          file_name: selectedFile.name,
          file_type: selectedFile.type,
          file_size: selectedFile.size,
          is_public: data.isPublic,
          uploaded_by: userProfile.id,
        });

      if (documentError) {
        throw new Error(documentError.message);
      }

      // Redirect to the documents list
      router.push('/dashboard/documents');
      router.refresh();
    } catch (err) {
      console.error('Error uploading document:', err);
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="text-2xl">Upload Document</CardTitle>
        <CardDescription>
          Upload a document to share with residents
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Document Title</Label>
            <Input
              id="title"
              placeholder="Building Rules"
              {...register('title')}
            />
            {errors.title && (
              <p className="text-sm text-red-500">{errors.title.message}</p>
            )}
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="description">Description (Optional)</Label>
            <Textarea
              id="description"
              placeholder="Details about the document..."
              {...register('description')}
            />
            {errors.description && (
              <p className="text-sm text-red-500">{errors.description.message}</p>
            )}
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="propertyId">Property</Label>
            {loadingProperties ? (
              <p className="text-sm text-muted-foreground">Loading properties...</p>
            ) : (
              <Select 
                onValueChange={(value) => setValue('propertyId', value)}
                defaultValue={selectedPropertyId}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a property" />
                </SelectTrigger>
                <SelectContent>
                  {properties.map((property) => (
                    <SelectItem key={property.id} value={property.id}>
                      {property.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            {errors.propertyId && (
              <p className="text-sm text-red-500">{errors.propertyId.message}</p>
            )}
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="category">Category</Label>
            <Select 
              onValueChange={(value: 'agreement' | 'rules' | 'financial' | 'maintenance' | 'other') => 
                setValue('category', value)
              }
              defaultValue="agreement"
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="agreement">Building Agreement</SelectItem>
                <SelectItem value="rules">Rules & Regulations</SelectItem>
                <SelectItem value="financial">Financial Document</SelectItem>
                <SelectItem value="maintenance">Maintenance</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
            {errors.category && (
              <p className="text-sm text-red-500">{errors.category.message}</p>
            )}
          </div>
          
          <div className="space-y-2">
            <Label>Visibility</Label>
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="isPublic"
                checked={watch('isPublic')}
                onChange={(e) => setValue('isPublic', e.target.checked)}
              />
              <Label htmlFor="isPublic">Visible to residents</Label>
            </div>
            <p className="text-xs text-muted-foreground">
              If checked, residents will be able to view this document. If unchecked, only property managers can view it.
            </p>
          </div>
          
          <div className="space-y-2">
            <Label>Upload File</Label>
            <FileUploader 
              onFileSelect={handleFileChange}
              accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
            />
            {fileError && (
              <p className="text-sm text-red-500">{fileError}</p>
            )}
            {selectedFile && (
              <div className="text-sm text-muted-foreground">
                Selected file: {selectedFile.name} ({(selectedFile.size / 1024).toFixed(2)} KB)
              </div>
            )}
            <p className="text-xs text-muted-foreground">
              Accepted file types: PDF, Word documents, and images. Maximum file size: 10MB.
            </p>
          </div>
          
          {error && (
            <div className="p-3 rounded-md bg-red-50 text-red-500 text-sm">
              {error}
            </div>
          )}
          
          <div className="pt-4 flex justify-end space-x-2">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => router.push('/dashboard/documents')}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={isLoading || loadingProperties || !selectedFile}
            >
              {isLoading ? 'Uploading...' : 'Upload Document'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
