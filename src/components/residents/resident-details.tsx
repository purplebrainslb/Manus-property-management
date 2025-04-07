'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import { useAuth } from '@/lib/auth/auth-context';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { formatCurrency } from '@/lib/utils';
import { Users, Mail, Check, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

type Resident = {
  id: string;
  user: {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
    user_id: string | null;
  };
  property: {
    name: string;
    id: string;
  };
  unit_number: string;
  is_active: boolean;
  balance: number;
  created_at: string;
};

export function ResidentDetails() {
  const { id } = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [resident, setResident] = useState<Resident | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchResidentDetails = async () => {
      if (!user || !id) return;
      
      setLoading(true);
      
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
        
        // Get properties managed by this user
        const { data: properties, error: propertiesError } = await supabase
          .from('properties')
          .select('id')
          .eq('property_manager_id', userProfile.id);
          
        if (propertiesError) {
          throw new Error(propertiesError.message);
        }
        
        if (!properties || properties.length === 0) {
          throw new Error('No properties found');
        }
        
        const propertyIds = properties.map(p => p.id);
        
        // Get resident details
        const { data, error: residentError } = await supabase
          .from('residents')
          .select(`
            id,
            unit_number,
            is_active,
            balance,
            created_at,
            user:user_id(id, first_name, last_name, email, user_id),
            property:property_id(name, id)
          `)
          .eq('id', id)
          .in('property_id', propertyIds)
          .single();
          
        if (residentError) {
          throw new Error(residentError.message);
        }
        
        if (!data) {
          throw new Error('Resident not found');
        }
        
        setResident(data);
      } catch (err) {
        console.error('Error fetching resident details:', err);
        setError(err instanceof Error ? err.message : 'An unexpected error occurred');
      } finally {
        setLoading(false);
      }
    };
    
    fetchResidentDetails();
  }, [user, id]);

  const resendInvitation = async () => {
    if (!resident) return;
    
    // In a real implementation, this would send a new invitation email
    alert(`Invitation would be resent to ${resident.user.email}`);
  };

  const toggleResidentStatus = async () => {
    if (!resident) return;
    
    try {
      const { error } = await supabase
        .from('residents')
        .update({ is_active: !resident.is_active })
        .eq('id', resident.id);
        
      if (error) {
        throw new Error(error.message);
      }
      
      // Update local state
      setResident({
        ...resident,
        is_active: !resident.is_active
      });
    } catch (err) {
      console.error('Error updating resident status:', err);
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
    }
  };

  if (loading) {
    return <div className="flex justify-center p-8">Loading resident details...</div>;
  }

  if (error) {
    return (
      <div className="p-4 rounded-md bg-red-50 text-red-500">
        Error loading resident details: {error}
      </div>
    );
  }

  if (!resident) {
    return (
      <div className="text-center p-8">
        <h3 className="text-lg font-medium mb-4">Resident not found</h3>
        <p className="text-muted-foreground mb-6">The resident you're looking for doesn't exist or you don't have access to it.</p>
        <Link href="/dashboard/residents">
          <Button>
            <Users className="mr-2 h-4 w-4" /> Back to Residents
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold">{resident.user.first_name} {resident.user.last_name}</h2>
          <p className="text-muted-foreground">{resident.user.email}</p>
        </div>
        <div className="flex gap-2">
          {!resident.user.user_id && (
            <Button 
              variant="outline"
              onClick={resendInvitation}
            >
              <Mail className="mr-2 h-4 w-4" /> Resend Invitation
            </Button>
          )}
          <Button 
            variant={resident.is_active ? "destructive" : "default"}
            onClick={toggleResidentStatus}
          >
            {resident.is_active ? (
              <>
                <X className="mr-2 h-4 w-4" /> Deactivate
              </>
            ) : (
              <>
                <Check className="mr-2 h-4 w-4" /> Activate
              </>
            )}
          </Button>
        </div>
      </div>
      
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Property</CardTitle>
          </CardHeader>
          <CardContent>
            <Link href={`/dashboard/properties/${resident.property.id}`} className="text-lg font-medium hover:underline">
              {resident.property.name}
            </Link>
            <p className="text-sm text-muted-foreground">Unit {resident.unit_number}</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-2">
              {resident.user.user_id ? (
                <Badge variant="success" className="flex items-center">
                  <Check className="h-3 w-3 mr-1" /> Registered
                </Badge>
              ) : (
                <Badge variant="warning" className="flex items-center">
                  <Mail className="h-3 w-3 mr-1" /> Invited
                </Badge>
              )}
              
              {resident.is_active ? (
                <Badge variant="outline" className="flex items-center">
                  Active
                </Badge>
              ) : (
                <Badge variant="destructive" className="flex items-center">
                  Inactive
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Balance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-lg font-medium ${resident.balance > 0 ? "text-red-500" : "text-green-500"}`}>
              {formatCurrency(resident.balance)}
            </div>
          </CardContent>
        </Card>
      </div>
      
      <Tabs defaultValue="invoices" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="invoices">Invoices</TabsTrigger>
          <TabsTrigger value="payments">Payments</TabsTrigger>
          <TabsTrigger value="tickets">Tickets</TabsTrigger>
        </TabsList>
        
        <TabsContent value="invoices" className="p-4 border rounded-md mt-2">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-medium">Invoices</h3>
            <Link href={`/dashboard/invoices/new?residentId=${resident.id}`}>
              <Button size="sm">Create Invoice</Button>
            </Link>
          </div>
          <p className="text-muted-foreground">Invoice list will be displayed here.</p>
        </TabsContent>
        
        <TabsContent value="payments" className="p-4 border rounded-md mt-2">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-medium">Payment History</h3>
          </div>
          <p className="text-muted-foreground">Payment history will be displayed here.</p>
        </TabsContent>
        
        <TabsContent value="tickets" className="p-4 border rounded-md mt-2">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-medium">Tickets</h3>
          </div>
          <p className="text-muted-foreground">Ticket list will be displayed here.</p>
        </TabsContent>
      </Tabs>
    </div>
  );
}
