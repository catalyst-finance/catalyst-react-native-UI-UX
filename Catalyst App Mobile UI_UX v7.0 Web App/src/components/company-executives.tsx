import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Briefcase, Users, Loader2, ChevronRight } from 'lucide-react';
import StockAPI from '../utils/supabase/stock-api';
import { CompanyExecutive as ExecutiveData } from '../utils/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { formatCompanyName } from '../utils/formatting';

interface CompanyExecutivesProps {
  ticker: string;
  companyName?: string; // Company name for modal header
}

export function CompanyExecutives({ ticker, companyName }: CompanyExecutivesProps) {
  const [executives, setExecutives] = useState<ExecutiveData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [dialogType, setDialogType] = useState<'executives' | 'board'>('executives');
  const [view, setView] = useState<'executives' | 'board'>('executives');

  useEffect(() => {
    const loadExecutives = async () => {
      try {
        setIsLoading(true);
        const data = await StockAPI.getCompanyExecutives(ticker, 100);
        setExecutives(data);
      } catch (err) {
        console.error(`Error loading executives for ${ticker}:`, err);
        setExecutives([]);
      } finally {
        setIsLoading(false);
      }
    };

    loadExecutives();
  }, [ticker]);

  // Helper to determine if someone is a board member
  const isBoardMember = (position: string | null): boolean => {
    if (!position) return false;
    const lowerPos = position.toLowerCase();
    return lowerPos.includes('director') || lowerPos.includes('chairman') || lowerPos.includes('vice chair');
  };

  // Helper to determine if someone is an executive (C-level, VP, etc.)
  const isExecutive = (position: string | null): boolean => {
    if (!position) return false;
    const lowerPos = position.toLowerCase();
    return (
      lowerPos.includes('chief') ||
      lowerPos.includes('president') ||
      lowerPos.includes('officer') ||
      lowerPos.includes('vice president') ||
      lowerPos.includes('vp') ||
      lowerPos.includes('ceo') ||
      lowerPos.includes('cfo') ||
      lowerPos.includes('coo') ||
      lowerPos.includes('cto')
    );
  };

  // Filter executives and board members (people can be in both)
  const executivesList = executives.filter(exec => isExecutive(exec.position));
  const boardMembers = executives.filter(exec => isBoardMember(exec.position));

  // Format name - remove title prefixes like Mr., Ms., Dr., Dame, etc.
  const formatName = (name: string): string => {
    return name.replace(/^(Mr\.|Ms\.|Mrs\.|Dr\.|Dame|Sir)\s+/i, '');
  };

  // Render executive/board member row
  const ExecutiveRow = ({ exec, isExpanded = false }: { exec: ExecutiveData; isExpanded?: boolean }) => {
    // Compact view (top 5)
    if (!isExpanded) {
      return (
        <div className="flex items-center justify-between py-3 px-1 hover:bg-muted/50 transition-colors rounded gap-3">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{formatName(exec.name)}</p>
            <p className="text-xs text-muted-foreground truncate">{exec.position || 'N/A'}</p>
          </div>
        </div>
      );
    }

    // Expanded view (show all details)
    return (
      <div className="flex items-start gap-3 py-[12px] px-4 hover:bg-muted/50 transition-colors rounded">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium break-words">{formatName(exec.name)}</p>
          <p className="text-xs text-muted-foreground mt-1">{exec.position || 'N/A'}</p>
          {exec.since && (
            <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
              <span>Since {exec.since}</span>
            </div>
          )}
        </div>
      </div>
    );
  };

  if (isLoading) {
    return (
      <Card className="border-0">
        <CardHeader className="pl-[10px] pt-[10px] pr-[24px] pb-[0px]">
          <div className="flex items-center gap-0.5 bg-muted/50 rounded-full p-0.5 w-fit">
            <button
              className="px-3 py-1 rounded-full text-sm transition-all flex items-center justify-center bg-foreground text-background font-medium w-[100px]"
            >
              Executives
            </button>
            <button
              className="px-3 py-1 rounded-full text-sm transition-all flex items-center justify-center text-muted-foreground w-[100px]"
            >
              Board
            </button>
          </div>
        </CardHeader>
        <CardContent className="pt-[0px] pr-[10px] pb-[24px] pl-[10px]">
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (executives.length === 0) {
    return null; // Don't show cards if no data
  }

  // Show top 5 executives
  const topExecutives = executivesList.slice(0, 5);
  // Show top 5 board members
  const topBoardMembers = boardMembers.slice(0, 5);

  // Determine which list to show based on view
  const currentList = view === 'executives' ? executivesList : boardMembers;
  const topList = currentList.slice(0, 5);
  const hasEitherData = executivesList.length > 0 || boardMembers.length > 0;

  if (!hasEitherData) {
    return null; // Don't show card if no data
  }

  return (
    <Card className="border-0">
      <CardHeader className="pl-[10px] pt-[10px] pr-[24px] pb-[0px]">
        <div className="flex items-center gap-0.5 bg-muted/50 rounded-full p-0.5 w-fit">
          <button
            onClick={() => setView('executives')}
            disabled={executivesList.length === 0}
            className={`px-3 py-1 rounded-full text-sm transition-all flex items-center justify-center w-[100px] ${
              view === 'executives' 
                ? 'bg-foreground text-background font-medium' 
                : 'text-muted-foreground hover:text-foreground'
            } ${executivesList.length === 0 ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            Executives
          </button>
          <button
            onClick={() => setView('board')}
            disabled={boardMembers.length === 0}
            className={`px-3 py-1 rounded-full text-sm transition-all flex items-center justify-center w-[100px] ${
              view === 'board' 
                ? 'bg-foreground text-background font-medium' 
                : 'text-muted-foreground hover:text-foreground'
            } ${boardMembers.length === 0 ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            Board
          </button>
        </div>
      </CardHeader>
      <CardContent className="pt-[0px] pr-[10px] pb-[24px] pl-[10px]">
        {currentList.length > 0 ? (
          <>
            <div className="space-y-1">
              {topList.map((exec) => (
                <ExecutiveRow key={exec.id} exec={exec} />
              ))}
            </div>

            {currentList.length > 5 && (
              <Dialog open={isDialogOpen && dialogType === view} onOpenChange={(open) => {
                setIsDialogOpen(open);
                if (open) setDialogType(view);
              }}>
                <DialogTrigger asChild>
                  <Button variant="ghost" className="w-full mt-4 text-ai-accent hover:text-ai-accent/80">
                    View All {currentList.length} {view === 'executives' ? 'Executives' : 'Board Members'}
                    <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                </DialogTrigger>
                <DialogContent className="w-[calc(100%-2rem)] max-w-2xl max-h-[80vh] p-0 overflow-hidden gap-0 flex flex-col">
                  <DialogHeader className="w-full flex-shrink-0">
                    <div className="flex items-center justify-between gap-2 px-4 sm:px-6 pt-[50px] pb-[16px] pr-[30px] pl-[30px]">
                      <DialogTitle className="flex flex-col gap-1 flex-1 min-w-0">
                        <Badge className="bg-ai-accent text-primary-foreground rounded flex-shrink-0 text-[14px] w-fit">
                          {ticker}
                        </Badge>
                        <span className="truncate text-[18px] text-left">{companyName || ticker}</span>
                        <span className="text-sm font-normal text-muted-foreground text-left">
                          All {view === 'executives' ? 'Executives' : 'Board Members'}
                        </span>
                      </DialogTitle>
                    </div>
                  </DialogHeader>
                  <div className="flex-1 min-h-0 overflow-y-auto">
                    <div className="w-full pb-6 space-y-1 px-4 sm:px-6">
                      {currentList.map((exec) => (
                        <ExecutiveRow key={exec.id} exec={exec} isExpanded={true} />
                      ))}
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            )}
          </>
        ) : (
          <div className="py-8 text-center text-sm text-muted-foreground">
            No {view === 'executives' ? 'executives' : 'board members'} data available
          </div>
        )}
      </CardContent>
    </Card>
  );
}