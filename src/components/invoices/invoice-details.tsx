'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import { useAuth } from '@/lib/auth/auth-context';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { formatCurrency } from '@/lib/utils';
import { FileText, DollarSign, Check, Clock, RefreshCw, Users } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';

type Invoice = {
  id: string;
  title: string;
  description: string;
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

type InvoiceSplit = {
  id: string;
  amount: number;
  is_paid: boolean;
  resident: {
    id: string;
    unit_number: string;
    user: {
      first_name: string;
      last_name: string;
      email: string;
    };
  };
};

export function InvoiceDetails() {
  const { id } = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [splits, setSplits] = useState<InvoiceSplit[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchInvoiceDetails = async () => {
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
        
        // Get invoice details
        const { data: invoiceData, error: invoiceError } = await supabase
          .from('invoices')
          .select(`
            id,
            title,
            description,
            amount,
            issue_date,
            due_date,
            is_paid,
            is_recurring,
            recurring_frequency,
            created_at,
            property:property_id(name, id)
          `)
          .eq('id', id)
          .in('property_id', propertyIds)
          .single();
          
        if (invoiceError) {
          throw new Error(invoiceError.message);
        }
        
        if (!invoiceData) {
          throw new Error('Invoice not found');
        }
        
        setInvoice(invoiceData);
        
        // Get invoice splits
        const { data: splitsData, error: splitsError } = await supabase
          .from('invoice_splits')
          .select(`
            id,
            amount,
            is_paid,
            resident:resident_id(
              id,
              unit_number,
              user:user_id(
                first_name,
                last_name,
                email
              )
            )
          `)
          .eq('invoice_id', id);
          
        if (splitsError) {
          throw new Error(splitsError.message);
        }
        
        setSplits(splitsData || []);
      } catch (err) {
        console.error('Error fetching invoice details:', err);
        setError(err instanceof Error ? err.message : 'An unexpected error occurred');
      } finally {
        setLoading(false);
      }
    };
    
    fetchInvoiceDetails();
  }, [user, id]);

  const markAsPaid = async () => {
    if (!invoice) return;
    
    try {
      const { error } = await supabase
        .from('invoices')
        .update({ is_paid: true })
        .eq('id', invoice.id);
        
      if (error) {
        throw new Error(error.message);
      }
      
      // Update local state
      setInvoice({
        ...invoice,
        is_paid: true
      });
      
      // Also mark all splits as paid
      const { error: splitsError } = await supabase
        .from('invoice_splits')
        .update({ is_paid: true })
        .eq('invoice_id', invoice.id);
        
      if (splitsError) {
        throw new Error(splitsError.message);
      }
      
      // Update local state for splits
      setSplits(splits.map(split => ({
        ...split,
        is_paid: true
      })));
    } catch (err) {
      console.error('Error marking invoice as paid:', err);
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
    }
  };

  const markSplitAsPaid = async (splitId: string) => {
    try {
      const { error } = await supabase
        .from('invoice_splits')
        .update({ is_paid: true })
        .eq('id', splitId);
        
      if (error) {
        throw new Error(error.message);
      }
      
      // Update local state
      setSplits(splits.map(split => 
        split.id === splitId ? { ...split, is_paid: true } : split
      ));
      
      // Check if all splits are paid, and if so, mark the invoice as paid
      const updatedSplits = splits.map(split => 
        split.id === splitId ? { ...split, is_paid: true } : split
      );
      
      if (updatedSplits.every(split => split.is_paid) && invoice) {
        const { error: invoiceError } = await supabase
          .from('invoices')
          .update({ is_paid: true })
          .eq('id', invoice.id);
          
        if (invoiceError) {
          throw new Error(invoiceError.message);
        }
        
        // Update local state
        setInvoice({
          ...invoice,
          is_paid: true
        });
      }
    } catch (err) {
      console.error('Error marking split as paid:', err);
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  };

  if (loading) {
    return <div className="flex justify-center p-8">Loading invoice details...</div>;
  }

  if (error) {
    return (
      <div className="p-4 rounded-md bg-red-50 text-red-500">
        Error loading invoice details: {error}
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="text-center p-8">
        <h3 className="text-lg font-medium mb-4">Invoice not found</h3>
        <p className="text-muted-foreground mb-6">The invoice you're looking for doesn't exist or you don't have access to it.</p>
        <Link href="/dashboard/invoices">
          <Button>
            <FileText className="mr-2 h-4 w-4" /> Back to Invoices
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold">{invoice.title}</h2>
          <p className="text-muted-foreground">
            {invoice.property.name} - {formatDate(invoice.issue_date)}
          </p>
        </div>
        <div className="flex gap-2">
          {!invoice.is_paid && (
            <Button 
              onClick={markAsPaid}
            >
              <DollarSign className="mr-2 h-4 w-4" /> Mark as Paid
            </Button>
          )}
          <Link href={`/dashboard/invoices/edit/${invoice.id}`}>
            <Button variant="outline">Edit Invoice</Button>
          </Link>
        </div>
      </div>
      
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Amount</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(invoice.amount)}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Status</CardTitle>
          </CardHeader>
          <CardContent>
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
            {invoice.is_recurring && (
              <Badge variant="outline" className="ml-2">
                <RefreshCw className="h-3 w-3 mr-1" /> 
                {invoice.recurring_frequency}
              </Badge>
            )}
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Due Date</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-lg font-medium">
              {formatDate(invoice.due_date)}
            </div>
          </CardContent>
        </Card>
      </div>
      
      {invoice.description && (
        <Card>
          <CardHeader>
            <CardTitle>Description</CardTitle>
          </CardHeader>
          <CardContent>
            <p>{invoice.description}</p>
          </CardContent>
        </Card>
      )}
      
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Invoice Splits</CardTitle>
          <Users className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          {splits.length === 0 ? (
            <p className="text-muted-foreground">No splits found for this invoice.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Resident</TableHead>
                  <TableHead>Unit</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {splits.map((split) => (
                  <TableRow key={split.id}>
                    <TableCell>
                      {split.resident.user.first_name} {split.resident.user.last_name}
                    </TableCell>
                    <TableCell>{split.resident.unit_number}</TableCell>
                    <TableCell>{formatCurrency(split.amount)}</TableCell>
                    <TableCell>
                      {split.is_paid ? (
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
                      {!split.is_paid && (
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => markSplitAsPaid(split.id)}
                        >
                          <DollarSign className="h-3 w-3 mr-1" /> Mark Paid
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
