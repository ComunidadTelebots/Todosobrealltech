import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import UserManagementTable from '@/components/UserManagementTable.jsx';

const UserManagementSection = ({ users, onUpdate, onDelete, onRoleChange }) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>User Management</CardTitle>
        <CardDescription>Manage user accounts, roles, and access status.</CardDescription>
      </CardHeader>
      <CardContent>
        <UserManagementTable 
          users={users} 
          onUpdate={onUpdate}
          onDelete={onDelete}
          onRoleChange={onRoleChange}
        />
      </CardContent>
    </Card>
  );
};

export default UserManagementSection;