'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import { useAuth } from '@/lib/auth/auth-context';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { formatCurrency } from '@/lib/utils';
import { Building, Users, DollarSign, FileText, Bell, Ticket } from 'lucide-react';
import Link from 'next/link';

type Property = {
  id: string;
  name: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  total_units: number;
  occupied_units: number;
  wallet_balance: number;
};

export function PropertyDetails() {
  const { id } = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [property, setProperty] = useState<Property | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState({
    residents: 0,
    pendingInvoices: 0,
    openTickets: 0
  });

  useEffect(() => {
    const fetchPropertyDetails = async () => {
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
        
        // Get property details
        const { data: propertyData, error: propertyError } = await supabase
          .from('properties')
          .select('*')
          .eq('id', id)
          .eq('property_manager_id', userProfile.id)
          .single();
          
        if (propertyError) {
          throw new Error(propertyError.message);
        }
        
        if (!propertyData) {
          throw new Error('Property not found');
        }
        
        setProperty(propertyData);
        
        // Get residents count
        const { count: residentsCount } = await supabase
          .from('residents')
          .select('*', { count: 'exact', head: true })
          .eq('property_id', id)
          .eq('is_active', true);
          
        // Get pending invoices count
        const { count: pendingInvoicesCount } = await supabase
          .from('invoices')
          .select('*', { count: 'exact', head: true })
          .eq('property_id', id)
          .eq('is_paid', false);
          
        // Get open tickets count
        const { count: openTicketsCount } = await supabase
          .from('tickets')
          .select('*', { count: 'exact', head: true })
          .eq('property_id', id)
          .eq('status', 'open');
          
        setStats({
          residents: residentsCount || 0,
          pendingInvoices: pendingInvoicesCount || 0,
          openTickets: openTicketsCount || 0
        });
      } catch (err) {
        console.error('Error fetching property details:', err);
        setError(err instanceof Error ? err.message : 'An unexpected error occurred');
      } finally {
        setLoading(false);
      }
    };
    
    fetchPropertyDetails();
  }, [user, id]);

  if (loading) {
    return <div className="flex justify-center p-8">Loading property details...</div>;
  }

  if (error) {
    return (
      <div className="p-4 rounded-md bg-red-50 text-red-500">
        Error loading property details: {error}
      </div>
    );
  }

  if (!property) {
    return (
      <div className="text-center p-8">
        <h3 className="text-lg font-medium mb-4">Property not found</h3>
        <p className="text-muted-foreground mb-6">The property you're looking for doesn't exist or you don't have access to it.</p>
        <Link href="/dashboard/properties">
          <Button>
            <Building className="mr-2 h-4 w-4" /> Back to Properties
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold">{property.name}</h2>
          <p className="text-muted-foreground">
            {property.address}, {property.city}, {property.state} {property.zip}
          </p>
        </div>
        <div className="flex gap-2">
          <Link href={`/dashboard/properties/${id}/edit`}>
            <Button variant="outline">Edit Property</Button>
          </Link>
          <Link href={`/dashboard/residents/invite?propertyId=${id}`}>
            <Button>
              <Users className="mr-2 h-4 w-4" /> Invite Resident
            </Button>
          </Link>
        </div>
      </div>
      
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Wallet Balance</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(property.wallet_balance)}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Residents</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.residents} / {property.total_units}</div>
            <p className="text-xs text-muted-foreground">
              {Math.round((property.occupied_units / property.total_units) * 100)}% occupied
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Invoices</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.pendingInvoices}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Open Tickets</CardTitle>
            <Ticket className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.openTickets}</div>
          </CardContent>
        </Card>
      </div>
      
      <Tabs defaultValue="residents" className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="residents">
            <Users className="mr-2 h-4 w-4" /> Residents
          </TabsTrigger>
          <TabsTrigger value="invoices">
            <DollarSign className="mr-2 h-4 w-4" /> Invoices
          </TabsTrigger>
          <TabsTrigger value="meetings">
            <Users className="mr-2 h-4 w-4" /> Meetings
          </TabsTrigger>
          <TabsTrigger value="announcements">
            <Bell className="mr-2 h-4 w-4" /> Announcements
          </TabsTrigger>
          <TabsTrigger value="tickets">
            <Ticket className="mr-2 h-4 w-4" /> Tickets
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="residents" className="p-4 border rounded-md mt-2">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-medium">Residents</h3>
            <Link href={`/dashboard/residents/invite?propertyId=${id}`}>
              <Button size="sm">
                <Users className="mr-2 h-4 w-4" /> Invite Resident
              </Button>
            </Link>
          </div>
          <p className="text-muted-foreground">Resident list will be displayed here.</p>
        </TabsContent>
        
        <TabsContent value="invoices" className="p-4 border rounded-md mt-2">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-medium">Invoices</h3>
            <Link href={`/dashboard/invoices/new?propertyId=${id}`}>
              <Button size="sm">
                <DollarSign className="mr-2 h-4 w-4" /> Create Invoice
              </Button>
            </Link>
          </div>
          <p className="text-muted-foreground">Invoice list will be displayed here.</p>
        </TabsContent>
        
        <TabsContent value="meetings" className="p-4 border rounded-md mt-2">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-medium">Meetings</h3>
            <Link href={`/dashboard/meetings/schedule?propertyId=${id}`}>
              <Button size="sm">
                <Users className="mr-2 h-4 w-4" /> Schedule Meeting
              </Button>
            </Link>
          </div>
          <p className="text-muted-foreground">Meeting list will be displayed here.</p>
        </TabsContent>
        
        <TabsContent value="announcements" className="p-4 border rounded-md mt-2">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-medium">Announcements</h3>
            <Link href={`/dashboard/announcements/new?propertyId=${id}`}>
              <Button size="sm">
                <Bell className="mr-2 h-4 w-4" /> Create Announcement
              </Button>
            </Link>
          </div>
          <p className="text-muted-foreground">Announcement list will be displayed here.</p>
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
