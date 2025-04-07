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
import { formatCurrency } from '@/lib/utils';

const invoiceSchema = z.object({
  title: z.string().min(1, { message: 'Title is required' }),
  description: z.string().optional(),
  amount: z.string().min(1, { message: 'Amount is required' }).refine(val => !isNaN(parseFloat(val)) && parseFloat(val) > 0, {
    message: 'Amount must be a positive number',
  }),
  propertyId: z.string().min(1, { message: 'Property is required' }),
  issueDate: z.string().min(1, { message: 'Issue date is required' }),
  dueDate: z.string().min(1, { message: 'Due date is required' }),
  splitType: z.enum(['equal', 'custom']),
  isRecurring: z.boolean().default(false),
  recurringFrequency: z.enum(['monthly', 'quarterly', 'yearly']).optional(),
});

type InvoiceFormValues = z.infer<typeof invoiceSchema>;

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

export function InvoiceForm() {
  const { user } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [properties, setProperties] = useState<Property[]>([]);
  const [residents, setResidents] = useState<Resident[]>([]);
  const [selectedResidents, setSelectedResidents] = useState<string[]>([]);
  const [customSplits, setCustomSplits] = useState<Record<string, number>>({});
  const [loadingProperties, setLoadingProperties] = useState(true);
  const [loadingResidents, setLoadingResidents] = useState(false);

  const propertyIdParam = searchParams.get('propertyId');

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
    reset
  } = useForm<InvoiceFormValues>({
    resolver: zodResolver(invoiceSchema),
    defaultValues: {
      title: '',
      description: '',
      amount: '',
      propertyId: propertyIdParam || '',
      issueDate: new Date().toISOString().split('T')[0],
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      splitType: 'equal',
      isRecurring: false,
      recurringFrequency: 'monthly',
    },
  });

  const selectedPropertyId = watch('propertyId');
  const splitType = watch('splitType');
  const isRecurring = watch('isRecurring');
  const amount = watch('amount');

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
        
        // Select all residents by default
        const allResidentIds = (data || []).map(r => r.id);
        setSelectedResidents(allResidentIds);
        
        // Initialize custom splits with equal values
        if (data && data.length > 0) {
          const equalSplit = 100 / data.length;
          const splits: Record<string, number> = {};
          data.forEach(resident => {
            splits[resident.id] = equalSplit;
          });
          setCustomSplits(splits);
        }
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

  const updateCustomSplit = (residentId: string, value: string) => {
    const numValue = parseFloat(value);
    if (isNaN(numValue)) return;
    
    setCustomSplits(prev => ({
      ...prev,
      [residentId]: numValue
    }));
  };

  const getTotalSplitPercentage = () => {
    return Object.values(customSplits)
      .filter((_, index) => selectedResidents.includes(residents[index]?.id))
      .reduce((sum, value) => sum + value, 0);
  };

  const onSubmit = async (data: InvoiceFormValues) => {
    if (!user) return;
    
    setIsLoading(true);
    setError(null);

    try {
      // Validate custom splits if that option is selected
      if (data.splitType === 'custom' && Math.abs(getTotalSplitPercentage() - 100) > 0.01) {
        throw new Error('Custom split percentages must add up to 100%');
      }
      
      // Get user profile ID
      const { data: userProfile, error: profileError } = await supabase
        .from('user_profiles')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (profileError || !userProfile) {
        throw new Error('Could not find user profile');
      }

      // Create the invoice
      const { data: invoice, error: invoiceError } = await supabase
        .from('invoices')
        .insert({
          title: data.title,
          description: data.description || '',
          amount: parseFloat(data.amount),
          property_id: data.propertyId,
          issue_date: data.issueDate,
          due_date: data.dueDate,
          is_recurring: data.isRecurring,
          recurring_frequency: data.isRecurring ? data.recurringFrequency : null,
          is_paid: false,
          created_by: userProfile.id,
        })
        .select('id')
        .single();

      if (invoiceError) {
        throw new Error(invoiceError.message);
      }

      // Create invoice splits
      const splits = selectedResidents.map(residentId => {
        let splitAmount;
        
        if (data.splitType === 'equal') {
          splitAmount = parseFloat(data.amount) / selectedResidents.length;
        } else {
          // Custom split
          const percentage = customSplits[residentId] || 0;
          splitAmount = (parseFloat(data.amount) * percentage) / 100;
        }
        
        return {
          invoice_id: invoice.id,
          resident_id: residentId,
          amount: splitAmount,
          is_paid: false,
        };
      });
      
      const { error: splitsError } = await supabase
        .from('invoice_splits')
        .insert(splits);

      if (splitsError) {
        throw new Error(splitsError.message);
      }

      // Redirect to the invoices list
      router.push('/dashboard/invoices');
      router.refresh();
    } catch (err) {
      console.error('Error creating invoice:', err);
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="text-2xl">Create Invoice</CardTitle>
        <CardDescription>
          Create a new invoice and split it among residents
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Invoice Title</Label>
            <Input
              id="title"
              placeholder="Monthly Maintenance"
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
              placeholder="Details about the invoice..."
              {...register('description')}
            />
            {errors.description && (
              <p className="text-sm text-red-500">{errors.description.message}</p>
            )}
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="amount">Amount ($)</Label>
              <Input
                id="amount"
                placeholder="100.00"
                {...register('amount')}
              />
              {errors.amount && (
                <p className="text-sm text-red-500">{errors.amount.message}</p>
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
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="issueDate">Issue Date</Label>
              <Input
                id="issueDate"
                type="date"
                {...register('issueDate')}
              />
              {errors.issueDate && (
                <p className="text-sm text-red-500">{errors.issueDate.message}</p>
              )}
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="dueDate">Due Date</Label>
              <Input
                id="dueDate"
                type="date"
                {...register('dueDate')}
              />
              {errors.dueDate && (
                <p className="text-sm text-red-500">{errors.dueDate.message}</p>
              )}
            </div>
          </div>
          
          <div className="space-y-2">
            <Label>Split Type</Label>
            <div className="flex space-x-4">
              <div className="flex items-center space-x-2">
                <input
                  type="radio"
                  id="splitEqual"
                  value="equal"
                  checked={splitType === 'equal'}
                  onChange={() => setValue('splitType', 'equal')}
                />
                <Label htmlFor="splitEqual">Equal Split</Label>
              </div>
              <div className="flex items-center space-x-2">
                <input
                  type="radio"
                  id="splitCustom"
                  value="custom"
                  checked={splitType === 'custom'}
                  onChange={() => setValue('splitType', 'custom')}
                />
                <Label htmlFor="splitCustom">Custom Split</Label>
              </div>
            </div>
          </div>
          
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="isRecurring"
                checked={isRecurring}
                onCheckedChange={(checked) => setValue('isRecurring', checked === true)}
              />
              <Label htmlFor="isRecurring">Recurring Invoice</Label>
            </div>
            
            {isRecurring && (
              <div className="pl-6 pt-2">
                <Label htmlFor="recurringFrequency">Frequency</Label>
                <Select 
                  onValueChange={(value: 'monthly' | 'quarterly' | 'yearly') => setValue('recurringFrequency', value)}
                  defaultValue="monthly"
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select frequency" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="monthly">Monthly</SelectItem>
                    <SelectItem value="quarterly">Quarterly</SelectItem>
                    <SelectItem value="yearly">Yearly</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
          
          {selectedPropertyId && (
            <div className="space-y-2 border p-4 rounded-md">
              <Label>Select Residents to Bill</Label>
              {loadingResidents ? (
                <p className="text-sm text-muted-foreground">Loading residents...</p>
              ) : residents.length === 0 ? (
                <p className="text-sm text-muted-foreground">No residents found for this property</p>
              ) : (
                <div className="space-y-2 mt-2">
                  {residents.map((resident) => (
                    <div key={resident.id} className="flex items-center justify-between border-b pb-2">
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id={`resident-${resident.id}`}
                          checked={selectedResidents.includes(resident.id)}
                          onCheckedChange={() => toggleResident(resident.id)}
                        />
                        <Label htmlFor={`resident-${resident.id}`}>
                          {resident.user.first_name} {resident.user.last_name} (Unit {resident.unit_number})
                        </Label>
                      </div>
                      
                      {splitType === 'custom' && selectedResidents.includes(resident.id) && (
                        <div className="flex items-center space-x-2">
                          <Input
                            type="number"
                            min="0"
                            max="100"
                            step="0.01"
                            className="w-20"
                            value={customSplits[resident.id] || 0}
                            onChange={(e) => updateCustomSplit(resident.id, e.target.value)}
                          />
                          <span>%</span>
                        </div>
                      )}
                      
                      {splitType === 'equal' && selectedResidents.includes(resident.id) && (
                        <div className="text-sm text-muted-foreground">
                          {selectedResidents.length > 0 && amount ? 
                            formatCurrency(parseFloat(amount) / selectedResidents.length) : 
                            '$0.00'
                          }
                        </div>
                      )}
                    </div>
                  ))}
                  
                  {splitType === 'custom' && (
                    <div className="flex justify-between pt-2">
                      <span>Total:</span>
                      <span className={Math.abs(getTotalSplitPercentage() - 100) > 0.01 ? "text-red-500" : "text-green-500"}>
                        {getTotalSplitPercentage().toFixed(2)}%
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
          
          {error && (
            <div className="p-3 rounded-md bg-red-50 text-red-500 text-sm">
              {error}
            </div>
          )}
          
          <div className="pt-4 flex justify-end space-x-2">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => router.push('/dashboard/invoices')}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={isLoading || loadingProperties || (selectedResidents.length === 0 && selectedPropertyId)}
            >
              {isLoading ? 'Creating Invoice...' : 'Create Invoice'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
