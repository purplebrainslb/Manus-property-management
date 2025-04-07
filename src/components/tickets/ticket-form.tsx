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
import { FileUploader } from '../documents/file-uploader';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ACCEPTED_FILE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'video/mp4'];

const ticketSchema = z.object({
  title: z.string().min(1, { message: 'Title is required' }),
  description: z.string().min(1, { message: 'Description is required' }),
  propertyId: z.string().min(1, { message: 'Property is required' }),
  category: z.enum(['maintenance', 'complaint', 'request', 'other']),
  priority: z.enum(['low', 'medium', 'high', 'urgent']),
  unitNumber: z.string().optional(),
});

type TicketFormValues = z.infer<typeof ticketSchema>;

type Property = {
  id: string;
  name: string;
};

export function TicketForm() {
  const { user } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [properties, setProperties] = useState<Property[]>([]);
  const [loadingProperties, setLoadingProperties] = useState(true);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [fileError, setFileError] = useState<string | null>(null);

  const propertyIdParam = searchParams.get('propertyId');

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch
  } = useForm<TicketFormValues>({
    resolver: zodResolver(ticketSchema),
    defaultValues: {
      title: '',
      description: '',
      propertyId: propertyIdParam || '',
      category: 'maintenance',
      priority: 'medium',
      unitNumber: '',
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
    
    if (!file) return;
    
    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      setFileError(`File size exceeds the maximum limit of ${MAX_FILE_SIZE / (1024 * 1024)}MB`);
      return;
    }
    
    // Validate file type
    if (!ACCEPTED_FILE_TYPES.includes(file.type)) {
      setFileError('File type not supported. Please upload images or videos.');
      return;
    }
    
    setSelectedFiles(prev => [...prev, file]);
  };

  const removeFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const onSubmit = async (data: TicketFormValues) => {
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

      // Create ticket record in the database
      const { data: ticketData, error: ticketError } = await supabase
        .from('tickets')
        .insert({
          title: data.title,
          description: data.description,
          property_id: data.propertyId,
          category: data.category,
          priority: data.priority,
          unit_number: data.unitNumber || null,
          status: 'open',
          created_by: userProfile.id,
        })
        .select('id')
        .single();

      if (ticketError) {
        throw new Error(ticketError.message);
      }

      // Upload files to Supabase Storage if any are selected
      if (selectedFiles.length > 0) {
        for (const file of selectedFiles) {
          const fileExt = file.name.split('.').pop();
          const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 15)}.${fileExt}`;
          const filePath = `tickets/${ticketData.id}/${fileName}`;
          
          const { error: uploadError } = await supabase.storage
            .from('property-tickets')
            .upload(filePath, file);

          if (uploadError) {
            throw new Error(`Error uploading file: ${uploadError.message}`);
          }

          // Get the public URL for the uploaded file
          const { data: publicUrlData } = supabase.storage
            .from('property-tickets')
            .getPublicUrl(filePath);

          // Create ticket media record
          const { error: mediaError } = await supabase
            .from('ticket_media')
            .insert({
              ticket_id: ticketData.id,
              file_path: filePath,
              file_url: publicUrlData.publicUrl,
              file_name: file.name,
              file_type: file.type,
              file_size: file.size,
              uploaded_by: userProfile.id,
            });

          if (mediaError) {
            throw new Error(mediaError.message);
          }
        }
      }

      // Redirect to the tickets list
      router.push('/dashboard/tickets');
      router.refresh();
    } catch (err) {
      console.error('Error creating ticket:', err);
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="text-2xl">Create Ticket</CardTitle>
        <CardDescription>
          Create a new maintenance request or complaint
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Ticket Title</Label>
            <Input
              id="title"
              placeholder="Broken Faucet in Unit 101"
              {...register('title')}
            />
            {errors.title && (
              <p className="text-sm text-red-500">{errors.title.message}</p>
            )}
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              placeholder="Please provide details about the issue..."
              rows={4}
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
            <Label htmlFor="unitNumber">Unit Number (Optional)</Label>
            <Input
              id="unitNumber"
              placeholder="101"
              {...register('unitNumber')}
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="category">Category</Label>
              <Select 
                onValueChange={(value: 'maintenance' | 'complaint' | 'request' | 'other') => 
                  setValue('category', value)
                }
                defaultValue="maintenance"
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="maintenance">Maintenance</SelectItem>
                  <SelectItem value="complaint">Complaint</SelectItem>
                  <SelectItem value="request">Request</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
              {errors.category && (
                <p className="text-sm text-red-500">{errors.category.message}</p>
              )}
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="priority">Priority</Label>
              <Select 
                onValueChange={(value: 'low' | 'medium' | 'high' | 'urgent') => 
                  setValue('priority', value)
                }
                defaultValue="medium"
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select priority" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                </SelectContent>
              </Select>
              {errors.priority && (
                <p className="text-sm text-red-500">{errors.priority.message}</p>
              )}
            </div>
          </div>
          
          <div className="space-y-2">
            <Label>Media Attachments (Optional)</Label>
            <FileUploader 
              onFileSelect={handleFileChange}
              accept=".jpg,.jpeg,.png,.gif,.mp4"
            />
            {fileError && (
              <p className="text-sm text-red-500">{fileError}</p>
            )}
            {selectedFiles.length > 0 && (
              <div className="mt-2 space-y-2">
                <p className="text-sm font-medium">Selected files:</p>
                <div className="grid grid-cols-2 gap-2">
                  {selectedFiles.map((file, index) => (
                    <div key={index} className="flex items-center justify-between border rounded p-2">
                      <div className="truncate text-sm">
                        {file.name} ({(file.size / 1024).toFixed(2)} KB)
                      </div>
                      <Button 
                        type="button" 
                        variant="ghost" 
                        size="sm"
                        onClick={() => removeFile(index)}
                      >
                        ✕
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <p className="text-xs text-muted-foreground">
              Accepted file types: Images and videos. Maximum file size: 10MB.
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
              onClick={() => router.push('/dashboard/tickets')}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={isLoading || loadingProperties}
            >
              {isLoading ? 'Creating...' : 'Create Ticket'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
