'use client';

import { useState, useEffect } from 'react';
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

const meetingSchema = z.object({
  title: z.string().min(1, { message: 'Title is required' }),
  description: z.string().optional(),
  propertyId: z.string().min(1, { message: 'Property is required' }),
  date: z.string().min(1, { message: 'Date is required' }),
  time: z.string().min(1, { message: 'Time is required' }),
  location: z.string().min(1, { message: 'Location is required' }),
});

type MeetingFormValues = z.infer<typeof meetingSchema>;

type Property = {
  id: string;
  name: string;
};

type Resident = {
  id: string;
  user: {
    first_name: string;
    last_name: string;
  };
  unit_number: string;
};

export function MeetingForm() {
  const { user } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [properties, setProperties] = useState<Property[]>([]);
  const [residents, setResidents] = useState<Resident[]>([]);
  const [selectedResidents, setSelectedResidents] = useState<string[]>([]);
  const [loadingProperties, setLoadingProperties] = useState(true);
  const [loadingResidents, setLoadingResidents] = useState(false);
  const [meetingItems, setMeetingItems] = useState<Array<{
    type: 'complaint' | 'decision' | 'note';
    content: string;
  }>>([]);
  const [newItemType, setNewItemType] = useState<'complaint' | 'decision' | 'note'>('note');
  const [newItemContent, setNewItemContent] = useState('');

  const propertyIdParam = searchParams.get('propertyId');

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
    reset
  } = useForm<MeetingFormValues>({
    resolver: zodResolver(meetingSchema),
    defaultValues: {
      title: '',
      description: '',
      propertyId: propertyIdParam || '',
      date: new Date().toISOString().split('T')[0],
      time: '18:00',
      location: '',
    },
  });

  const selectedPropertyId = watch('propertyId');

  // Fetch properties for the dropdown
  useEffect(() => {
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

  // Fetch residents when property is selected
  useEffect(() => {
    const fetchResidents = async () => {
      if (!selectedPropertyId) {
        setResidents([]);
        setSelectedResidents([]);
        return;
      }
      
      setLoadingResidents(true);
      
      try {
        // Get residents for the selected property
        const { data, error: residentsError } = await supabase
          .from('residents')
          .select(`
            id,
            unit_number,
            user:user_id(first_name, last_name)
          `)
          .eq('property_id', selectedPropertyId)
          .eq('is_active', true)
          .order('unit_number');
          
        if (residentsError) {
          throw new Error(residentsError.message);
        }
        
        setResidents(data || []);
      } catch (err) {
        console.error('Error fetching residents:', err);
        setError(err instanceof Error ? err.message : 'An unexpected error occurred');
      } finally {
        setLoadingResidents(false);
      }
    };
    
    fetchResidents();
  }, [selectedPropertyId]);

  const toggleResident = (residentId: string) => {
    setSelectedResidents(prev => {
      if (prev.includes(residentId)) {
        return prev.filter(id => id !== residentId);
      } else {
        return [...prev, residentId];
      }
    });
  };

  const addMeetingItem = () => {
    if (!newItemContent.trim()) return;
    
    setMeetingItems([
      ...meetingItems,
      {
        type: newItemType,
        content: newItemContent.trim()
      }
    ]);
    
    setNewItemContent('');
  };

  const removeMeetingItem = (index: number) => {
    setMeetingItems(meetingItems.filter((_, i) => i !== index));
  };

  const onSubmit = async (data: MeetingFormValues) => {
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

      // Create the meeting
      const { data: meeting, error: meetingError } = await supabase
        .from('meetings')
        .insert({
          title: data.title,
          description: data.description || '',
          property_id: data.propertyId,
          meeting_date: `${data.date}T${data.time}:00`,
          location: data.location,
          created_by: userProfile.id,
        })
        .select('id')
        .single();

      if (meetingError) {
        throw new Error(meetingError.message);
      }

      // Add meeting attendees
      if (selectedResidents.length > 0) {
        const attendees = selectedResidents.map(residentId => ({
          meeting_id: meeting.id,
          resident_id: residentId,
        }));
        
        const { error: attendeesError } = await supabase
          .from('meeting_attendees')
          .insert(attendees);

        if (attendeesError) {
          throw new Error(attendeesError.message);
        }
      }

      // Add meeting items
      if (meetingItems.length > 0) {
        const items = meetingItems.map(item => ({
          meeting_id: meeting.id,
          type: item.type,
          content: item.content,
        }));
        
        const { error: itemsError } = await supabase
          .from('meeting_items')
          .insert(items);

        if (itemsError) {
          throw new Error(itemsError.message);
        }
      }

      // Redirect to the meetings list
      router.push('/dashboard/meetings');
      router.refresh();
    } catch (err) {
      console.error('Error creating meeting:', err);
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="text-2xl">Schedule Meeting</CardTitle>
        <CardDescription>
          Create a new meeting and invite residents
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Meeting Title</Label>
            <Input
              id="title"
              placeholder="Board Meeting"
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
              placeholder="Details about the meeting..."
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
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="date">Date</Label>
              <Input
                id="date"
                type="date"
                {...register('date')}
              />
              {errors.date && (
                <p className="text-sm text-red-500">{errors.date.message}</p>
              )}
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="time">Time</Label>
              <Input
                id="time"
                type="time"
                {...register('time')}
              />
              {errors.time && (
                <p className="text-sm text-red-500">{errors.time.message}</p>
              )}
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="location">Location</Label>
            <Input
              id="location"
              placeholder="Building lobby"
              {...register('location')}
            />
            {errors.location && (
              <p className="text-sm text-red-500">{errors.location.message}</p>
            )}
          </div>
          
          {selectedPropertyId && (
            <div className="space-y-2 border p-4 rounded-md">
              <Label>Select Attendees</Label>
              {loadingResidents ? (
                <p className="text-sm text-muted-foreground">Loading residents...</p>
              ) : residents.length === 0 ? (
                <p className="text-sm text-muted-foreground">No residents found for this property</p>
              ) : (
                <div className="space-y-2 mt-2">
                  {residents.map((resident) => (
                    <div key={resident.id} className="flex items-center space-x-2 border-b pb-2">
                      <Checkbox
                        id={`resident-${resident.id}`}
                        checked={selectedResidents.includes(resident.id)}
                        onCheckedChange={() => toggleResident(resident.id)}
                      />
                      <Label htmlFor={`resident-${resident.id}`}>
                        {resident.user.first_name} {resident.user.last_name} (Unit {resident.unit_number})
                      </Label>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
          
          <div className="space-y-2 border p-4 rounded-md">
            <Label>Meeting Items</Label>
            <div className="space-y-4">
              {meetingItems.map((item, index) => (
                <div key={index} className="flex items-start space-x-2 border-b pb-2">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2">
                      <Badge variant={
                        item.type === 'complaint' ? 'destructive' : 
                        item.type === 'decision' ? 'default' : 
                        'outline'
                      }>
                        {item.type.charAt(0).toUpperCase() + item.type.slice(1)}
                      </Badge>
                      <p>{item.content}</p>
                    </div>
                  </div>
                  <Button 
                    type="button" 
                    variant="ghost" 
                    size="sm"
                    onClick={() => removeMeetingItem(index)}
                  >
                    Remove
                  </Button>
                </div>
              ))}
              
              <div className="flex flex-col space-y-2">
                <div className="flex space-x-2">
                  <Select 
                    value={newItemType}
                    onValueChange={(value: 'complaint' | 'decision' | 'note') => setNewItemType(value)}
                  >
                    <SelectTrigger className="w-[150px]">
                      <SelectValue placeholder="Item type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="complaint">Complaint</SelectItem>
                      <SelectItem value="decision">Decision</SelectItem>
                      <SelectItem value="note">Note</SelectItem>
                    </SelectContent>
                  </Select>
                  <Input
                    placeholder="Enter meeting item..."
                    value={newItemContent}
                    onChange={(e) => setNewItemContent(e.target.value)}
                  />
                </div>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={addMeetingItem}
                  disabled={!newItemContent.trim()}
                >
                  Add Item
                </Button>
              </div>
            </div>
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
              onClick={() => router.push('/dashboard/meetings')}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={isLoading || loadingProperties}
            >
              {isLoading ? 'Scheduling Meeting...' : 'Schedule Meeting'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
