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
import { Checkbox } from '@/components/ui/checkbox';
import { FileUploader } from '../documents/file-uploader';

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ACCEPTED_FILE_TYPES = ['application/pdf', 'image/jpeg', 'image/png'];

const announcementSchema = z.object({
  title: z.string().min(1, { message: 'Title is required' }),
  content: z.string().min(1, { message: 'Content is required' }),
  propertyId: z.string().min(1, { message: 'Property is required' }),
  isPinned: z.boolean().default(false),
  isScheduled: z.boolean().default(false),
  scheduledDate: z.string().optional(),
  scheduledTime: z.string().optional(),
});

type AnnouncementFormValues = z.infer<typeof announcementSchema>;

type Property = {
  id: string;
  name: string;
};

export function AnnouncementForm() {
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
  } = useForm<AnnouncementFormValues>({
    resolver: zodResolver(announcementSchema),
    defaultValues: {
      title: '',
      content: '',
      propertyId: propertyIdParam || '',
      isPinned: false,
      isScheduled: false,
      scheduledDate: new Date().toISOString().split('T')[0],
      scheduledTime: '12:00',
    },
  });

  const selectedPropertyId = watch('propertyId');
  const isScheduled = watch('isScheduled');

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
      setFileError('File type not supported. Please upload a PDF or image file.');
      setSelectedFile(null);
      return;
    }
    
    setSelectedFile(file);
  };

  const onSubmit = async (data: AnnouncementFormValues) => {
    if (!user) return;
    
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

      let attachmentUrl = null;

      // Upload file to Supabase Storage if one is selected
      if (selectedFile) {
        const fileExt = selectedFile.name.split('.').pop();
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 15)}.${fileExt}`;
        const filePath = `announcements/${data.propertyId}/${fileName}`;
        
        const { error: uploadError } = await supabase.storage
          .from('property-announcements')
          .upload(filePath, selectedFile);

        if (uploadError) {
          throw new Error(`Error uploading file: ${uploadError.message}`);
        }

        // Get the public URL for the uploaded file
        const { data: publicUrlData } = supabase.storage
          .from('property-announcements')
          .getPublicUrl(filePath);

        attachmentUrl = publicUrlData.publicUrl;
      }

      // Determine publish date
      let publishDate = new Date().toISOString();
      
      if (data.isScheduled && data.scheduledDate && data.scheduledTime) {
        publishDate = new Date(`${data.scheduledDate}T${data.scheduledTime}:00`).toISOString();
      }

      // Create announcement record in the database
      const { error: announcementError } = await supabase
        .from('announcements')
        .insert({
          title: data.title,
          content: data.content,
          property_id: data.propertyId,
          is_pinned: data.isPinned,
          is_published: !data.isScheduled,
          publish_date: publishDate,
          attachment_url: attachmentUrl,
          attachment_name: selectedFile?.name || null,
          created_by: userProfile.id,
        });

      if (announcementError) {
        throw new Error(announcementError.message);
      }

      // Redirect to the announcements list
      router.push('/dashboard/announcements');
      router.refresh();
    } catch (err) {
      console.error('Error creating announcement:', err);
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="text-2xl">Create Announcement</CardTitle>
        <CardDescription>
          Create a new announcement to share with residents
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Announcement Title</Label>
            <Input
              id="title"
              placeholder="Important Notice"
              {...register('title')}
            />
            {errors.title && (
              <p className="text-sm text-red-500">{errors.title.message}</p>
            )}
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="content">Content</Label>
            <Textarea
              id="content"
              placeholder="Details about the announcement..."
              rows={6}
              {...register('content')}
            />
            {errors.content && (
              <p className="text-sm text-red-500">{errors.content.message}</p>
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
            <div className="flex items-center space-x-2">
              <Checkbox
                id="isPinned"
                checked={watch('isPinned')}
                onCheckedChange={(checked) => setValue('isPinned', checked === true)}
              />
              <Label htmlFor="isPinned">Pin this announcement</Label>
            </div>
            <p className="text-xs text-muted-foreground pl-6">
              Pinned announcements will appear at the top of the list
            </p>
          </div>
          
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="isScheduled"
                checked={watch('isScheduled')}
                onCheckedChange={(checked) => setValue('isScheduled', checked === true)}
              />
              <Label htmlFor="isScheduled">Schedule for later</Label>
            </div>
            
            {isScheduled && (
              <div className="pl-6 pt-2 grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="scheduledDate">Date</Label>
                  <Input
                    id="scheduledDate"
                    type="date"
                    {...register('scheduledDate')}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="scheduledTime">Time</Label>
                  <Input
                    id="scheduledTime"
                    type="time"
                    {...register('scheduledTime')}
                  />
                </div>
              </div>
            )}
          </div>
          
          <div className="space-y-2">
            <Label>Attachment (Optional)</Label>
            <FileUploader 
              onFileSelect={handleFileChange}
              accept=".pdf,.jpg,.jpeg,.png"
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
              Accepted file types: PDF and images. Maximum file size: 5MB.
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
              onClick={() => router.push('/dashboard/announcements')}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={isLoading || loadingProperties}
            >
              {isLoading ? 'Creating...' : isScheduled ? 'Schedule Announcement' : 'Publish Announcement'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
