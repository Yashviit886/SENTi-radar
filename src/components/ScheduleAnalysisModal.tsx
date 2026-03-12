import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { Slider } from '@/components/ui/slider';
import { toast } from '@/hooks/use-toast';
import {
    Pin,
    Clock,
    BarChart,
    Mail,
    MessageSquare,
    Webhook,
    AlertTriangle,
    TrendingDown,
    Flame,
    Angry,
    TrendingUp,
    Save,
    Play,
    History,
    Plus
} from 'lucide-react';

interface Props {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

const ScheduleAnalysisModal = ({ open, onOpenChange }: Props) => {
    const [isSaving, setIsSaving] = useState(false);

    const handleSave = () => {
        setIsSaving(true);
        setTimeout(() => {
            setIsSaving(false);
            onOpenChange(false);
            toast({
                title: 'Schedule Saved',
                description: 'Your analysis schedule has been configured successfully.',
            });
        }, 800);
    };

    const handleTest = () => {
        toast({
            title: 'Testing Integration',
            description: 'A test ping has been sent to your configured endpoints.',
        });
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[650px] bg-background border-border overflow-hidden">
                <DialogHeader className="px-6 py-4 border-b border-border bg-sidebar">
                    <DialogTitle className="text-lg font-semibold tracking-tight">Scheduled Analysis Configuration</DialogTitle>
                    <DialogDescription className="text-xs">
                        Automatically monitor topics at set intervals and deliver insights without manual intervention.
                    </DialogDescription>
                </DialogHeader>

                <div className="px-6 py-4 space-y-6 max-h-[70vh] overflow-y-auto">

                    {/* Topic to Monitor */}
                    <div className="space-y-3">
                        <h4 className="text-sm font-semibold flex items-center gap-2">
                            <Pin className="h-4 w-4 text-primary" /> Topic to Monitor
                        </h4>
                        <div className="flex gap-2">
                            <Input defaultValue="AI Regulation" className="flex-1" />
                            <Button variant="outline" size="icon"><Plus className="h-4 w-4" /></Button>
                        </div>
                    </div>

                    {/* Frequency */}
                    <div className="space-y-3">
                        <h4 className="text-sm font-semibold flex items-center gap-2">
                            <Clock className="h-4 w-4 text-primary" /> Frequency
                        </h4>
                        <RadioGroup defaultValue="6h" className="flex flex-wrap gap-4">
                            <div className="flex items-center space-x-2">
                                <RadioGroupItem value="1h" id="r1" />
                                <Label htmlFor="r1" className="text-sm font-normal">Every hour</Label>
                            </div>
                            <div className="flex items-center space-x-2">
                                <RadioGroupItem value="6h" id="r2" />
                                <Label htmlFor="r2" className="text-sm font-normal">Every 6 hours</Label>
                            </div>
                            <div className="flex items-center space-x-2">
                                <RadioGroupItem value="24h" id="r3" />
                                <Label htmlFor="r3" className="text-sm font-normal">Daily</Label>
                            </div>
                            <div className="flex items-center space-x-2">
                                <RadioGroupItem value="7d" id="r4" />
                                <Label htmlFor="r4" className="text-sm font-normal">Weekly</Label>
                            </div>
                            <div className="flex items-center space-x-2">
                                <RadioGroupItem value="custom" id="r5" />
                                <Label htmlFor="r5" className="text-sm font-normal">Custom (cron)</Label>
                            </div>
                        </RadioGroup>
                    </div>

                    {/* Report Type */}
                    <div className="space-y-3">
                        <h4 className="text-sm font-semibold flex items-center gap-2">
                            <BarChart className="h-4 w-4 text-primary" /> Report Type
                        </h4>
                        <div className="grid grid-cols-2 gap-3">
                            <div className="flex items-center space-x-2">
                                <Checkbox id="c1" defaultChecked />
                                <Label htmlFor="c1" className="text-sm font-normal">Executive Summary</Label>
                            </div>
                            <div className="flex items-center space-x-2">
                                <Checkbox id="c2" defaultChecked />
                                <Label htmlFor="c2" className="text-sm font-normal">Full Analysis</Label>
                            </div>
                            <div className="flex items-center space-x-2">
                                <Checkbox id="c3" defaultChecked />
                                <Label htmlFor="c3" className="text-sm font-normal">Crisis Alerts Only</Label>
                            </div>
                            <div className="flex items-center space-x-2">
                                <Checkbox id="c4" defaultChecked />
                                <Label htmlFor="c4" className="text-sm font-normal">Trend Comparison</Label>
                            </div>
                        </div>
                    </div>

                    {/* Delivery */}
                    <div className="space-y-3">
                        <h4 className="text-sm font-semibold flex items-center gap-2">
                            <Mail className="h-4 w-4 text-primary" /> Delivery
                        </h4>
                        <div className="space-y-3">
                            <div className="flex items-center gap-3">
                                <Mail className="h-4 w-4 text-muted-foreground w-6" />
                                <Input defaultValue="user@company.com" placeholder="Email addresses" className="flex-1 h-8 text-sm" />
                            </div>
                            <div className="flex items-center gap-3">
                                <MessageSquare className="h-4 w-4 text-muted-foreground w-6" />
                                <Input defaultValue="#sentiment-alerts" placeholder="Slack channel" className="flex-1 h-8 text-sm" />
                            </div>
                            <div className="flex items-center gap-3">
                                <Webhook className="h-4 w-4 text-muted-foreground w-6" />
                                <Input defaultValue="https://api.company.com/webhook" placeholder="Webhook URL" className="flex-1 h-8 text-sm" />
                            </div>
                        </div>
                    </div>

                    {/* Alert Conditions */}
                    <div className="space-y-3 p-4 bg-sidebar rounded-lg border border-border">
                        <h4 className="text-sm font-semibold flex items-center gap-2 mb-4 text-destructive">
                            <AlertTriangle className="h-4 w-4" /> Threshold & Alert Conditions
                        </h4>

                        <div className="space-y-5">
                            <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                    <Label className="text-xs flex items-center gap-2 font-medium">
                                        <TrendingDown className="h-4 w-4 text-destructive" /> Sentiment drops below
                                    </Label>
                                    <span className="text-xs font-mono text-muted-foreground">30%</span>
                                </div>
                                <Slider defaultValue={[30]} max={100} step={1} className="w-full" />
                            </div>

                            <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                    <Label className="text-xs flex items-center gap-2 font-medium">
                                        <Flame className="h-4 w-4 text-warning" /> Volume spikes above (vs avg)
                                    </Label>
                                    <span className="text-xs font-mono text-muted-foreground">150%</span>
                                </div>
                                <Slider defaultValue={[150]} max={500} step={10} className="w-full" />
                            </div>

                            <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                    <Label className="text-xs flex items-center gap-2 font-medium">
                                        <Angry className="h-4 w-4 text-destructive" /> Anger emotion exceeds
                                    </Label>
                                    <span className="text-xs font-mono text-muted-foreground">40%</span>
                                </div>
                                <Slider defaultValue={[40]} max={100} step={1} className="w-full" />
                            </div>

                            <div className="flex items-center space-x-2 pt-2 border-t border-border">
                                <Checkbox id="c5" defaultChecked />
                                <Label htmlFor="c5" className="text-sm font-medium flex items-center gap-2">
                                    <TrendingUp className="h-4 w-4 text-primary" /> Notify if viral momentum detected
                                </Label>
                            </div>
                        </div>
                    </div>

                </div>

                <DialogFooter className="px-6 py-4 border-t border-border bg-sidebar/50 flex flex-col sm:flex-row gap-2 justify-between items-center sm:justify-between">
                    <Button variant="outline" size="sm" className="w-full sm:w-auto gap-2">
                        <History className="h-4 w-4" /> View History
                    </Button>
                    <div className="flex gap-2 w-full sm:w-auto">
                        <Button variant="secondary" size="sm" onClick={handleTest} className="w-full sm:w-auto gap-2">
                            <Play className="h-4 w-4" /> Test Now
                        </Button>
                        <Button onClick={handleSave} disabled={isSaving} size="sm" className="w-full sm:w-auto gap-2">
                            <Save className="h-4 w-4" /> {isSaving ? 'Saving...' : 'Save Schedule'}
                        </Button>
                    </div>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

export default ScheduleAnalysisModal;
