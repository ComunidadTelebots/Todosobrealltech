import React, { useState } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { MoreHorizontal, Edit2, Trash2, Snowflake, Flame, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import apiServerClient from '@/lib/apiServerClient.js';
import pb from '@/lib/pocketbaseClient.js';

const UserManagementTable = ({ users, onUpdate, onDelete, onRoleChange }) => {
  const [isFreezeModalOpen, setIsFreezeModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleOpenFreezeModal = (user) => {
    setSelectedUser(user);
    setIsFreezeModalOpen(true);
  };

  const handleToggleFreeze = async () => {
    if (!selectedUser) return;
    
    setIsProcessing(true);
    const action = selectedUser.is_frozen ? 'unfreeze' : 'freeze';
    
    try {
      const response = await apiServerClient.fetch('/freeze-account', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${pb.authStore.token}`
        },
        body: JSON.stringify({
          userId: selectedUser.id,
          action: action
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update account status');
      }

      const data = await response.json();
      toast.success(data.message);
      
      if (onUpdate) {
        onUpdate();
      }
      
      setIsFreezeModalOpen(false);
    } catch (error) {
      console.error('Error toggling freeze status:', error);
      toast.error(error.message || 'Failed to update account status');
    } finally {
      setIsProcessing(false);
    }
  };

  const getRoleBadgeColor = (role) => {
    switch (role) {
      case 'admin': return 'bg-destructive/10 text-destructive hover:bg-destructive/20 border-destructive/20';
      case 'creator': return 'bg-yellow-500/10 text-yellow-600 hover:bg-yellow-500/20 border-yellow-500/20';
      case 'moderator': return 'bg-blue-500/10 text-blue-600 hover:bg-blue-500/20 border-blue-500/20';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  return (
    <>
      <div className="rounded-md border overflow-hidden">
        <Table>
          <TableHeader className="bg-muted/50">
            <TableRow>
              <TableHead>User</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Joined</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((user) => (
              <TableRow key={user.id}>
                <TableCell>
                  <div className="flex flex-col">
                    <span className="font-medium">{user.name || 'Unnamed User'}</span>
                    <span className="text-sm text-muted-foreground">{user.email}</span>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className={`capitalize ${getRoleBadgeColor(user.role)}`}>
                    {user.role || 'user'}
                  </Badge>
                </TableCell>
                <TableCell>
                  {user.is_frozen ? (
                    <Badge variant="outline" className="bg-blue-500/10 text-blue-600 border-blue-500/20">
                      <Snowflake className="w-3 h-3 mr-1" /> Congelado
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20">
                      Activo
                    </Badge>
                  )}
                </TableCell>
                <TableCell className="text-muted-foreground text-sm">
                  {new Date(user.created).toLocaleDateString()}
                </TableCell>
                <TableCell className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" className="h-8 w-8 p-0">
                        <span className="sr-only">Open menu</span>
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {onRoleChange && (
                        <DropdownMenuItem onClick={() => onRoleChange(user)}>
                          <Edit2 className="mr-2 h-4 w-4" />
                          Change Role
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuItem onClick={() => handleOpenFreezeModal(user)}>
                        {user.is_frozen ? (
                          <>
                            <Flame className="mr-2 h-4 w-4 text-orange-500" />
                            Descongelar
                          </>
                        ) : (
                          <>
                            <Snowflake className="mr-2 h-4 w-4 text-blue-500" />
                            Congelar
                          </>
                        )}
                      </DropdownMenuItem>
                      {onDelete && (
                        <DropdownMenuItem 
                          className="text-destructive focus:text-destructive"
                          onClick={() => onDelete(user)}
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete User
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
            {users.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-6 text-muted-foreground">
                  No users found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={isFreezeModalOpen} onOpenChange={setIsFreezeModalOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>
              {selectedUser?.is_frozen ? 'Descongelar Cuenta' : 'Congelar Cuenta'}
            </DialogTitle>
            <DialogDescription>
              {selectedUser?.is_frozen 
                ? `¿Estás seguro de que deseas descongelar la cuenta de ${selectedUser?.email}? El usuario podrá volver a iniciar sesión.`
                : `¿Estás seguro de que deseas congelar la cuenta de ${selectedUser?.email}? El usuario no podrá iniciar sesión hasta que sea descongelada.`}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setIsFreezeModalOpen(false)} disabled={isProcessing}>
              Cancelar
            </Button>
            <Button 
              variant={selectedUser?.is_frozen ? "default" : "destructive"} 
              onClick={handleToggleFreeze} 
              disabled={isProcessing}
            >
              {isProcessing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {selectedUser?.is_frozen ? 'Descongelar' : 'Congelar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default UserManagementTable;