import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Plus, Search } from 'lucide-react';
import { getAllClients } from '../api/user';
import { Button, Input, Table, TableBody, TableCell, TableHead, TableHeader, TableRow, Badge, PageHeader, ErrorState, TableSkeleton, EmptyState, Skeleton } from '../components';
import { formatDate } from '../lib';

export default function ClientList() {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');

  const { data: clients, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['clients'],
    queryFn: getAllClients,
  });

  const filteredClients = clients?.filter((c) => {
    const term = searchTerm.toLowerCase();
    return (
      c.ownerName?.toLowerCase().includes(term) ||
      c.username?.toLowerCase().includes(term) ||
      c.email?.toLowerCase().includes(term) ||
      c.role?.toLowerCase().includes(term)
    );
  }) ?? [];

  return (
    <div>
      <PageHeader
        title="Clients"
        action={
          <Button onClick={() => navigate('/admin/clients/new')}>
            <Plus className="h-4 w-4 mr-2" />
            Add Client
          </Button>
        }
      />

      <div className="mb-6 max-w-md">
        <Input
          placeholder="Search by name, email, or role..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          leftIcon={<Search className="h-4 w-4" />}
        />
      </div>

      {isLoading ? (
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
          <TableSkeleton columns={7} rows={5} />
        </div>
      ) : isError ? (
        <ErrorState message={(error as any)?.message || 'Failed to load clients'} onRetry={() => refetch()} />
      ) : filteredClients.length === 0 ? (
        <EmptyState
          title="No clients found"
          description="Try adjusting your search or add a new client."
        />
      ) : (
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-x-auto">
          <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Public ID</TableHead>
              <TableHead>Name / Username</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Mobile</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Created At</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredClients.map((client) => (
              <TableRow key={client.publicId}>
                <TableCell className="font-mono text-xs text-gray-500">{client.publicId}</TableCell>
                <TableCell>
                  <div className="font-medium text-gray-900">{client.ownerName || client.username}</div>
                  {client.ownerName && <div className="text-xs text-gray-500">@{client.username}</div>}
                </TableCell>
                <TableCell>{client.email}</TableCell>
                <TableCell>{client.mobileNumber}</TableCell>
                <TableCell>
                  <Badge variant={client.role === 'ADMIN' ? 'danger' : 'info'}>
                    {client.role}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge variant={client.enabled ? 'success' : 'default'}>
                    {client.enabled ? 'Active' : 'Disabled'}
                  </Badge>
                </TableCell>
                <TableCell>{formatDate(client.createdAt)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        </div>
      )}
    </div>
  );
}
