'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/supabase/client';
import { useAuth } from '@/lib/auth/auth-context';
import Link from 'next/link';
import { FileText, DollarSign, Check, Clock, RefreshCw } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { formatCurrency } from '@/lib/utils';

type Invoice = {
  id: string;
  title: string;
  amount: number;
  property: {
    name: string;
    id: string;
  };
  issue_date: string;
  due_date: string;
  is_paid: boolean;
  is_recurring: boolean;
  recurring_frequency: string | null;
  created_at: string;
};

export function InvoiceList() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchInvoices = async () => {
      if (!user) return;
      
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
          setInvoices([]);
          return;
        }
        
        const propertyIds = properties.map(p => p.id);
        
        // Get invoices for these properties
        const { data, error: invoicesError } = await supabase
          .from('invoices')
          .select(`
            id,
            title,
            amount,
            issue_date,
            due_date,
            is_paid,
            is_recurring,
            recurring_frequency,
            created_at,
            property:property_id(name, id)
          `)
          .in('property_id', propertyIds)
          .order('created_at', { ascending: false });
          
        if (invoicesError) {
          throw new Error(invoicesError.message);
        }
        
        setInvoices(data || []);
      } catch (err) {
        console.error('Error fetching invoices:', err);
        setError(err instanceof Error ? err.message : 'An unexpected error occurred');
      } finally {
        setLoading(false);
      }
    };
    
    fetchInvoices();
  }, [user]);

  const markAsPaid = async (invoiceId: string) => {
    try {
      const { error } = await supabase
        .from('invoices')
        .update({ is_paid: true })
        .eq('id', invoiceId);
        
      if (error) {
        throw new Error(error.message);
      }
      
      // Update local state
      setInvoices(invoices.map(invoice => 
        invoice.id === invoiceId ? { ...invoice, is_paid: true } : invoice
      ));
    } catch (err) {
      console.error('Error marking invoice as paid:', err);
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  };

  if (loading) {
    return <div className="flex justify-center p-8">Loading invoices...</div>;
  }

  if (error) {
    return (
      <div className="p-4 rounded-md bg-red-50 text-red-500">
        Error loading invoices: {error}
      </div>
    );
  }

  if (invoices.length === 0) {
    return (
      <div className="text-center p-8">
        <h3 className="text-lg font-medium mb-4">No invoices found</h3>
        <p className="text-muted-foreground mb-6">You haven't created any invoices yet.</p>
        <Link href="/dashboard/invoices/new">
          <Button>
            <FileText className="mr-2 h-4 w-4" /> Create Your First Invoice
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Invoices</h2>
        <Link href="/dashboard/invoices/new">
          <Button>
            <FileText className="mr-2 h-4 w-4" /> Create Invoice
          </Button>
        </Link>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>All Invoices</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Property</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Issue Date</TableHead>
                <TableHead>Due Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {invoices.map((invoice) => (
                <TableRow key={invoice.id}>
                  <TableCell className="font-medium">
                    {invoice.title}
                    {invoice.is_recurring && (
                      <Badge variant="outline" className="ml-2">
                        <RefreshCw className="h-3 w-3 mr-1" /> 
                        {invoice.recurring_frequency}
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <Link href={`/dashboard/properties/${invoice.property.id}`} className="hover:underline">
                      {invoice.property.name}
                    </Link>
                  </TableCell>
                  <TableCell>{formatCurrency(invoice.amount)}</TableCell>
                  <TableCell>{formatDate(invoice.issue_date)}</TableCell>
                  <TableCell>{formatDate(invoice.due_date)}</TableCell>
                  <TableCell>
                    {invoice.is_paid ? (
                      <Badge variant="success" className="flex items-center">
                        <Check className="h-3 w-3 mr-1" /> Paid
                      </Badge>
                    ) : new Date(invoice.due_date) < new Date() ? (
                      <Badge variant="destructive" className="flex items-center">
                        <Clock className="h-3 w-3 mr-1" /> Overdue
                      </Badge>
                    ) : (
                      <Badge variant="warning" className="flex items-center">
                        <Clock className="h-3 w-3 mr-1" /> Pending
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex space-x-2">
                      {!invoice.is_paid && (
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => markAsPaid(invoice.id)}
                        >
                          <DollarSign className="h-3 w-3 mr-1" /> Mark Paid
                        </Button>
                      )}
                      <Link href={`/dashboard/invoices/${invoice.id}`}>
                        <Button variant="outline" size="sm">View</Button>
                      </Link>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
