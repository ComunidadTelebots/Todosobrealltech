import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Download, FileText, FileSpreadsheet, Mail, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

const ExportDataSection = () => {
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [isExportingCsv, setIsExportingCsv] = useState(false);
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [email, setEmail] = useState('');

  const handleExportPdf = async () => {
    setIsExportingPdf(true);
    try {
      // Simulate PDF generation delay
      await new Promise(resolve => setTimeout(resolve, 1500));
      toast.success('PDF Report generated successfully');
      // In a real app, we would use jsPDF here
    } catch (error) {
      toast.error('Failed to generate PDF');
    } finally {
      setIsExportingPdf(false);
    }
  };

  const handleExportCsv = async () => {
    setIsExportingCsv(true);
    try {
      // Simulate CSV generation delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      toast.success('CSV Data exported successfully');
      // In a real app, we would use papaparse here
    } catch (error) {
      toast.error('Failed to export CSV');
    } finally {
      setIsExportingCsv(false);
    }
  };

  const handleSendEmail = async (e) => {
    e.preventDefault();
    if (!email) return;
    
    setIsSendingEmail(true);
    try {
      // Simulate email sending delay
      await new Promise(resolve => setTimeout(resolve, 1500));
      toast.success(`Report sent to ${email}`);
      setEmail('');
    } catch (error) {
      toast.error('Failed to send email report');
    } finally {
      setIsSendingEmail(false);
    }
  };

  return (
    <Card className="border-border/50 shadow-sm">
      <CardHeader>
        <CardTitle className="text-lg font-medium flex items-center gap-2">
          <Download className="w-5 h-5 text-primary" />
          Export & Reports
        </CardTitle>
        <CardDescription>Download analytics data or send reports via email</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row gap-3">
            <Button 
              variant="outline" 
              className="flex-1" 
              onClick={handleExportPdf}
              disabled={isExportingPdf}
            >
              {isExportingPdf ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <FileText className="w-4 h-4 mr-2" />}
              Download PDF Report
            </Button>
            <Button 
              variant="outline" 
              className="flex-1" 
              onClick={handleExportCsv}
              disabled={isExportingCsv}
            >
              {isExportingCsv ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <FileSpreadsheet className="w-4 h-4 mr-2" />}
              Export Raw CSV
            </Button>
          </div>

          <div className="pt-4 border-t border-border/50">
            <form onSubmit={handleSendEmail} className="flex gap-2">
              <div className="relative flex-1">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input 
                  type="email" 
                  placeholder="Email address for report..." 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-9"
                  required
                />
              </div>
              <Button type="submit" disabled={isSendingEmail || !email}>
                {isSendingEmail ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : 'Send'}
              </Button>
            </form>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default ExportDataSection;