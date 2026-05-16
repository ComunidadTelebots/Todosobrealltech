import React, { useState, useMemo } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Search, User, Bot, Calendar } from 'lucide-react';

const SystemStatusModal = ({ isOpen, onClose, title, data = [], type = 'users' }) => {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredData = useMemo(() => {
    if (!searchQuery.trim()) return data;
    const query = searchQuery.toLowerCase();
    
    return data.filter(item => {
      if (type === 'users') {
        return (item.name?.toLowerCase().includes(query) || item.email?.toLowerCase().includes(query));
      } else {
        return (item.nombre?.toLowerCase().includes(query) || item.descripcion?.toLowerCase().includes(query));
      }
    });
  }, [data, searchQuery, type]);

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="w-full sm:max-w-md md:max-w-lg overflow-y-auto">
        <SheetHeader className="mb-6">
          <SheetTitle className="text-2xl">{title}</SheetTitle>
          <SheetDescription>
            Viewing detailed records for this metric. Total: {data.length}
          </SheetDescription>
        </SheetHeader>

        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder={`Search ${type}...`}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        <div className="space-y-4">
          {filteredData.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground border rounded-lg border-dashed">
              No results found matching your search.
            </div>
          ) : (
            filteredData.map((item) => (
              <div key={item.id} className="flex flex-col p-4 rounded-xl border bg-card hover:bg-accent/50 transition-colors">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      {type === 'users' ? (
                        <User className="w-5 h-5 text-primary" />
                      ) : (
                        <Bot className="w-5 h-5 text-primary" />
                      )}
                    </div>
                    <div>
                      <h4 className="font-medium text-sm">
                        {type === 'users' ? (item.name || 'Unnamed User') : item.nombre}
                      </h4>
                      <p className="text-xs text-muted-foreground">
                        {type === 'users' ? item.email : (item.descripcion || 'No description')}
                      </p>
                    </div>
                  </div>
                  {type === 'users' ? (
                    <Badge variant="outline" className="capitalize text-xs">
                      {item.role || 'user'}
                    </Badge>
                  ) : (
                    <Badge 
                      variant={item.estado ? "default" : "secondary"}
                      className={item.estado ? "bg-green-500/10 text-green-600 hover:bg-green-500/20 border-green-500/20" : "bg-muted text-muted-foreground"}
                    >
                      {item.estado ? 'Active' : 'Inactive'}
                    </Badge>
                  )}
                </div>
                <div className="flex items-center text-xs text-muted-foreground mt-2 pt-2 border-t">
                  <Calendar className="w-3 h-3 mr-1.5" />
                  Created: {formatDate(item.created)}
                </div>
              </div>
            ))
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default SystemStatusModal;