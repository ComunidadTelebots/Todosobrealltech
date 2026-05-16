import React, { useState, useEffect } from 'react';
import { useBotManagement } from '@/hooks/useBotManagement.js';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Bot, Plus, Search, Activity, PowerOff, Calendar } from 'lucide-react';
import StatCard from '@/components/StatCard.jsx';
import BotManagementTable from '@/components/BotManagementTable.jsx';
import BotFormModal from '@/components/BotFormModal.jsx';
import BotDetailsModal from '@/components/BotDetailsModal.jsx';
import BotStatisticsModal from '@/components/BotStatisticsModal.jsx';

const BotManagementSection = () => {
  const { bots, loading, fetchAllBots, createBot, updateBot, deleteBot } = useBotManagement();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [isStatsOpen, setIsStatsOpen] = useState(false);
  const [selectedBot, setSelectedBot] = useState(null);

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      fetchAllBots(searchTerm, statusFilter);
    }, 300);
    return () => clearTimeout(delayDebounceFn);
  }, [searchTerm, statusFilter, fetchAllBots]);

  const handleCreate = () => {
    setSelectedBot(null);
    setIsFormOpen(true);
  };

  const handleEdit = (bot) => {
    setSelectedBot(bot);
    setIsFormOpen(true);
  };

  const handleViewDetails = (bot) => {
    setSelectedBot(bot);
    setIsDetailsOpen(true);
  };

  const handleViewStats = (bot) => {
    setSelectedBot(bot);
    setIsStatsOpen(true);
  };

  const handleFormSubmit = async (data) => {
    if (selectedBot) {
      await updateBot(selectedBot.id, data);
    } else {
      await createBot(data);
    }
    fetchAllBots(searchTerm, statusFilter);
  };

  const handleToggleStatus = async (bot) => {
    await updateBot(bot.id, { estado: !bot.estado });
    fetchAllBots(searchTerm, statusFilter);
  };

  const handleDelete = async (id) => {
    await deleteBot(id);
    fetchAllBots(searchTerm, statusFilter);
  };

  // Calculate stats
  const totalBots = bots.length;
  const activeBots = bots.filter(b => b.estado).length;
  const inactiveBots = totalBots - activeBots;
  const recentBots = bots.filter(b => {
    const created = new Date(b.created);
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    return created >= sevenDaysAgo;
  }).length;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard icon={Bot} title="Total Bots" value={totalBots} status="default" />
        <StatCard icon={Activity} title="Active Bots" value={activeBots} status="success" />
        <StatCard icon={PowerOff} title="Inactive Bots" value={inactiveBots} status="warning" />
        <StatCard icon={Calendar} title="New (7d)" value={recentBots} status="default" />
      </div>

      <Card>
        <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <CardTitle>Bot Directory</CardTitle>
            <CardDescription>Manage and monitor all bots across the platform.</CardDescription>
          </div>
          <Button onClick={handleCreate}>
            <Plus className="w-4 h-4 mr-2" /> Create Bot
          </Button>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Search bots by name..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="active">Active Only</SelectItem>
                <SelectItem value="inactive">Inactive Only</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <BotManagementTable 
            bots={bots} 
            loading={loading}
            onEdit={handleEdit}
            onToggleStatus={handleToggleStatus}
            onDelete={handleDelete}
            onViewDetails={handleViewDetails}
            onViewStats={handleViewStats}
          />
        </CardContent>
      </Card>

      <BotFormModal 
        isOpen={isFormOpen} 
        onClose={() => setIsFormOpen(false)} 
        bot={selectedBot} 
        onSubmit={handleFormSubmit} 
      />
      
      <BotDetailsModal 
        isOpen={isDetailsOpen} 
        onClose={() => setIsDetailsOpen(false)} 
        bot={selectedBot} 
        onEdit={(b) => { setIsDetailsOpen(false); handleEdit(b); }}
      />
      
      <BotStatisticsModal 
        isOpen={isStatsOpen} 
        onClose={() => setIsStatsOpen(false)} 
        bot={selectedBot} 
      />
    </div>
  );
};

export default BotManagementSection;