'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/lib/supabase/client';
import { useAuth } from '@/lib/auth/auth-context';
import { useRouter, useSearchParams } from 'next/navigation';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const inviteSchema = z.object({
  email: z.string().email({ message: 'Please enter a valid email address' }),
  firstName: z.string().min(1, { message: 'First name is required' }),
  lastName: z.string().min(1, { message: 'Last name is required' }),
  propertyId: z.string().min(1, { message: 'Property is required' }),
  unitNumber: z.string().min(1, { message: 'Unit number is required' }),
});

type InviteFormValues = z.infer<typeof inviteSchema>;

type Property = {
  id: string;
  name: string;
};

export function ResidentInviteForm() {
  const { user } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [properties, setProperties] = useState<Property[]>([]);
  const [loadingProperties, setLoadingProperties] = useState(true);

  const propertyIdParam = searchParams.get('propertyId');

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch
  } = useForm<InviteFormValues>({
    resolver: zodResolver(inviteSchema),
    defaultValues: {
      email: '',
      firstName: '',
      lastName: '',
      propertyId: propertyIdParam || '',
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

  const onSubmit = async (data: InviteFormValues) => {
    if (!user) return;
    
    setIsLoading(true);
    setError(null);
    setSuccess(false);

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

      // Check if the email is already registered
      const { data: existingUser, error: userError } = await supabase
        .from('user_profiles')
        .select('id')
        .eq('email', data.email)
        .maybeSingle();

      let residentUserId;

      if (!existingUser) {
        // Create a new user profile
        const { data: newUser, error: createUserError } = await supabase
          .from('user_profiles')
          .insert({
            user_id: null, // Will be updated when the user registers
            first_name: data.firstName,
            last_name: data.lastName,
            email: data.email,
            role: 'resident',
          })
          .select('id')
          .single();

        if (createUserError) {
          throw new Error(createUserError.message);
        }

        residentUserId = newUser.id;
      } else {
        residentUserId = existingUser.id;
      }

      // Check if the resident is already associated with this property and unit
      const { data: existingResident, error: residentError } = await supabase
        .from('residents')
        .select('id')
        .eq('property_id', data.propertyId)
        .eq('user_id', residentUserId)
        .eq('unit_number', data.unitNumber)
        .maybeSingle();

      if (existingResident) {
        throw new Error('This resident is already associated with this property and unit');
      }

      // Create the resident record
      const { error: createResidentError } = await supabase
        .from('residents')
        .insert({
          user_id: residentUserId,
          property_id: data.propertyId,
          unit_number: data.unitNumber,
          is_active: true,
          balance: 0,
        });

      if (createResidentError) {
        throw new Error(createResidentError.message);
      }

      // TODO: Send invitation email via Resend
      // This will be implemented in the email notifications step

      setSuccess(true);
    } catch (err) {
      console.error('Error inviting resident:', err);
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="text-2xl">Invite Resident</CardTitle>
        <CardDescription>
          Send an invitation to a resident to join the property
        </CardDescription>
      </CardHeader>
      <CardContent>
        {success ? (
          <div className="p-4 rounded-md bg-green-50 text-green-700 mb-4">
            <p className="font-medium">Invitation sent successfully!</p>
            <p className="mt-2">The resident will receive an email with instructions to join the platform.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="resident@example.com"
                {...register('email')}
              />
              {errors.email && (
                <p className="text-sm text-red-500">{errors.email.message}</p>
              )}
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName">First Name</Label>
                <Input
                  id="firstName"
                  placeholder="John"
                  {...register('firstName')}
                />
                {errors.firstName && (
                  <p className="text-sm text-red-500">{errors.firstName.message}</p>
                )}
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="lastName">Last Name</Label>
                <Input
                  id="lastName"
                  placeholder="Doe"
                  {...register('lastName')}
                />
                {errors.lastName && (
                  <p className="text-sm text-red-500">{errors.lastName.message}</p>
                )}
              </div>
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
              <Label htmlFor="unitNumber">Unit Number</Label>
              <Input
                id="unitNumber"
                placeholder="101"
                {...register('unitNumber')}
              />
              {errors.unitNumber && (
                <p className="text-sm text-red-500">{errors.unitNumber.message}</p>
              )}
            </div>
            
            {error && (
              <div className="p-3 rounded-md bg-red-50 text-red-500 text-sm">
                {error}
              </div>
            )}
            
            <Button type="submit" className="w-full" disabled={isLoading || loadingProperties}>
              {isLoading ? 'Sending Invitation...' : 'Send Invitation'}
            </Button>
          </form>
        )}
      </CardContent>
      {success && (
        <CardFooter>
          <div className="flex space-x-2 w-full">
            <Button 
              variant="outline" 
              className="flex-1"
              onClick={() => {
                setSuccess(false);
                setError(null);
              }}
            >
              Invite Another Resident
            </Button>
            <Button 
              className="flex-1"
              onClick={() => router.push('/dashboard/residents')}
            >
              View Residents
            </Button>
          </div>
        </CardFooter>
      )}
    </Card>
  );
}
