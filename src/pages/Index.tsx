import { useState } from "react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { Activity } from "lucide-react";
import DashboardHeader from "@/components/DashboardHeader";
import TopicSearch from "@/components/TopicSearch";
import TopicDetail from "@/components/TopicDetail";
import TopicSidebar from "@/components/TopicSidebar";
import AIInsightsPanel from "@/components/AIInsightsPanel";
import ScheduleAnalysisModal from "@/components/ScheduleAnalysisModal";
import type { TopicCard } from "@/lib/mockData";
import {
  useTopics,
  useAnalyzeTopic,
  useSaveSearchHistory,
} from "@/hooks/useRealtimeData";
import { toast } from "@/hooks/use-toast";

const Index = () => {
  const [selectedTopic, setSelectedTopic] = useState<TopicCard | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);

  const { data: dbTopics, isLoading, refetch: refetchTopics } = useTopics();
  const analyzeMutation = useAnalyzeTopic();
  const saveSearchMutation = useSaveSearchHistory();

  const topics = dbTopics || [];

  const filteredTopics = searchQuery
    ? topics.filter(
        (t) =>
          t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          t.hashtag.toLowerCase().includes(searchQuery.toLowerCase()),
      )
    : topics;

  const handleSearch = async (query: string) => {
    setSearchQuery(query);
    saveSearchMutation.mutate({ query });

    analyzeMutation.mutate(
      { query },
      {
        onSuccess: async (data) => {
          // data = { success, topic_id, twitter, youtube, analysis }
          const topicId: string | undefined = data?.topic_id;

          // Refetch topics list so the sidebar updates
          const result = await refetchTopics();
          const updatedTopics = result.data || [];

          // Try to find the analyzed topic by id
          let found: TopicCard | undefined;
          if (topicId) {
            found = updatedTopics.find((t) => t.id === topicId);
          }
          // Fallback: just pick the first (most recent) topic
          if (!found && updatedTopics.length > 0) {
            found = updatedTopics[0];
          }

          if (found) {
            setSelectedTopic(found);
            setSearchQuery(""); // clear filter so topic is visible in sidebar
            toast({
              title: "✅ Analysis Complete",
              description: `"${found.title}" has been analyzed. Showing results now.`,
            });
          } else {
            toast({
              title: "⚠️ Analysis Finished",
              description: `Analysis for "${query}" finished but no topic was returned. Try searching again.`,
            });
          }
        },
        onError: (error) => {
          const msg =
            error instanceof Error ? error.message : "Failed to analyze topic";
          console.error("Analysis error:", msg);
          toast({
            title: "❌ Analysis Error",
            description: msg,
            variant: "destructive",
          });
        },
      },
    );
  };

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <TopicSidebar
          topics={filteredTopics}
          selectedId={selectedTopic?.id || null}
          onSelect={setSelectedTopic}
          onTopicRemoved={(topicId) => {
            if (selectedTopic?.id === topicId) setSelectedTopic(null);
          }}
          isLoading={isLoading}
          searchQuery={searchQuery}
          onScheduleClick={() => setIsScheduleModalOpen(true)}
        />

        <div className="flex-1 flex flex-col min-w-0">
          <header className="flex items-center gap-3 border-b border-border px-4 py-3 lg:px-6 bg-card">
            <SidebarTrigger className="shrink-0" />
            <DashboardHeader />
          </header>

          <main className="flex-1 overflow-y-auto">
            <div className="mx-auto max-w-[1200px] px-4 py-5 lg:px-6 space-y-4">
              <TopicSearch
                onSearch={handleSearch}
                isAnalyzing={analyzeMutation.isPending}
              />

              {selectedTopic ? (
                <div className="space-y-4">
                  <TopicDetail
                    topic={selectedTopic}
                    onClose={() => setSelectedTopic(null)}
                  />
                  <AIInsightsPanel
                    topic={selectedTopic}
                    emotions={selectedTopic.emotions}
                  />
                </div>
              ) : analyzeMutation.isPending ? (
                <div className="flex flex-col items-center justify-center py-24 text-center">
                  <div className="bg-primary/10 p-4 rounded-full mb-4 text-primary animate-pulse">
                    <Activity className="h-8 w-8" />
                  </div>
                  <h2 className="text-xl font-semibold text-foreground mb-2">
                    Analyzing…
                  </h2>
                  <p className="text-muted-foreground max-w-md">
                    Fetching posts and running sentiment analysis. This usually
                    takes 5–15 seconds. Results will appear automatically when
                    done.
                  </p>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-24 text-center">
                  <div className="bg-primary/10 p-4 rounded-full mb-4 text-primary">
                    <Activity className="h-8 w-8" />
                  </div>
                  <h2 className="text-xl font-semibold text-foreground mb-2">
                    Welcome to Public Sentiment Radar
                  </h2>
                  <p className="text-muted-foreground max-w-md">
                    Search for a hashtag, brand, or event above, or select a
                    trending topic from the sidebar to analyze live sentiment,
                    emotion distribution, and crisis alerts.
                  </p>
                </div>
              )}
            </div>
          </main>
        </div>
      </div>
      <ScheduleAnalysisModal
        open={isScheduleModalOpen}
        onOpenChange={setIsScheduleModalOpen}
      />
    </SidebarProvider>
  );
};

export default Index;
