"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/card";
import { Label } from "@/components/label";
import { Badge } from "@/components/badge";
import { Calendar } from "@/components/calendar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/select";
import {
  CalendarIcon,
  Clock,
  Instagram,
  Video,
  Plus,
  ArrowLeft,
  Loader2,
  ImageIcon,
} from "lucide-react";
import Schedulerheader from "@/components/schedulerHeader";
import { useReminderMutation, useReminderStatusQuery } from "@/lib/redux/services/api";
import Toast from "@/components/Toast";
import { ToastState } from "@/types/library";
import { contentStorage, ContentData } from "@/lib/utils/contentStorage";

// ----- Types -----
interface EditorContent {
  id: string;
  imageUrl?: string;
  caption: string;
  hashtags: string[];
  contentType: "image" | "video";
  videoUrl?: string;
  storyboard?: any[];
  overlays?: any[];
  platform: string;
  title: string;
  createdAt: string;
  status?: string;
}

interface ReminderStatus {
  asset_id: string;
  platform: string;
  run_at: string;
  status: string;
}

// Helper function to convert ContentData to EditorContent with proper type checking
const convertToEditorContent = (content: ContentData): EditorContent => {
  // Ensure contentType is either "image" or "video"
  const validatedContentType = content.contentType === "video" ? "video" : "image";
  
  return {
    id: content.id,
    imageUrl: content.imageUrl,
    caption: content.caption,
    hashtags: content.hashtags,
    contentType: validatedContentType,
    videoUrl: content.videoUrl,
    storyboard: content.storyboard,
    overlays: content.overlays,
    platform: content.platform,
    title: content.title,
    createdAt: content.createdAt,
    status: content.status ,
  };
};

export default function SchedulerPage() {
  const router = useRouter();
  const params = useParams();
  const assetId = params.asset_id as string;

  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [selectedTime, setSelectedTime] = useState<string>("09:00");
  const [selectedPlatform, setSelectedPlatform] = useState<"instagram" | "tiktok">("instagram");
  const [editorContent, setEditorContent] = useState<EditorContent | null>(null);
  const [isScheduling, setIsScheduling] = useState(false);
  const [scheduledAssetId, setScheduledAssetId] = useState<string | null>(null);
  const [isLoadingContent, setIsLoadingContent] = useState(true);

  const [toast, setToast] = useState<ToastState>({
    show: false,
    message: "",
    type: "success",
  });

  const [reminder, { isLoading: isReminderLoading }] = useReminderMutation();
  const { data: reminderStatus, error: statusError } = useReminderStatusQuery(
    scheduledAssetId!,
    {
      skip: !scheduledAssetId,
      pollingInterval: 15000,
    }
  );

  const showToast = (message: string, type: "success" | "error") => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: "", type: "success" }), 3000);
  };

  // --- Load content ---
  useEffect(() => {
    const loadContent = async () => {
      if (!assetId) {
        showToast("No asset ID provided", "error");
        setIsLoadingContent(false);
        return;
      }

      try {
        // Use contentStorage to find the content by ID
        const content = contentStorage.findContentById(assetId);
        
        if (content) {
          // Convert ContentData to EditorContent with proper type validation
          const editorContent = convertToEditorContent(content);
          setEditorContent(editorContent);
          setSelectedPlatform(content.platform as "instagram" | "tiktok");
        } else {
          showToast("Content not found. Please generate content first.", "error");
          console.error("Content not found for ID:", assetId);
          // Debug: show all available content
          const allContent = contentStorage.getAllContent();
          console.log("Available content IDs:", allContent.map(item => item.id));
        }
      } catch (error) {
        console.error("Failed to load content:", error);
        showToast("Failed to load content", "error");
      } finally {
        setIsLoadingContent(false);
      }
    };

    loadContent();
  }, [assetId]);

  // --- Handle status updates ---
  useEffect(() => {
    if (reminderStatus) {
      console.log("Reminder status update:", reminderStatus);

      if (reminderStatus.status === "done") {
        showToast("Content has been published!", "success");
        
        // Update content status to "published" in library
        if (editorContent) {
          const updatedContent = { ...editorContent, status: "published" };
          contentStorage.updateInLibrary(assetId, updatedContent);
          setEditorContent(updatedContent);
        }
        
        setScheduledAssetId(null);
      }
    }
  }, [reminderStatus, assetId, editorContent]);

  useEffect(() => {
    if (statusError) {
      console.error("Status check error:", statusError);
      showToast("Failed to check scheduling status", "error");
    }
  }, [statusError]);

  const optimalTimes: Record<"instagram" | "tiktok", string[]> = {
    instagram: ["09:00", "12:00", "17:00", "20:00"],
    tiktok: ["06:00", "10:00", "19:00", "21:00"],
  };

  // --- Schedule handler ---
  const handleScheduleReminder = async () => {
    if (!selectedDate || !editorContent || !assetId) {
      showToast("Please select a date and ensure content is loaded", "error");
      return;
    }

    setIsScheduling(true);

    try {
      const scheduledDateTime = new Date(selectedDate);
      const [hours, minutes] = selectedTime.split(":").map(Number);
      scheduledDateTime.setHours(hours, minutes, 0, 0);

      const reminderRequest = {
        asset_id: assetId,
        platform: selectedPlatform,
        run_at: scheduledDateTime.toISOString(),
      };

      const response = await reminder(reminderRequest).unwrap();

      if (response.status === "scheduled" || response.status === "queued") {
        setScheduledAssetId(assetId);

        // Update content status to "scheduled" in library
        const updatedContent = { ...editorContent, status: "scheduled" };
        contentStorage.updateInLibrary(assetId, updatedContent);
        setEditorContent(updatedContent);

        showToast(
          `Content scheduled for ${new Date(response.scheduled_for).toLocaleString()}!`,
          "success"
        );

        // Redirect to library after 2 seconds
        setTimeout(() => {
          router.push("/library");
        }, 2000);
      } else {
        throw new Error("Failed to schedule reminder");
      }
    } catch (error: any) {
      console.error("Scheduling failed:", error);
      showToast(
        error.data?.detail?.[0]?.msg || "Failed to schedule reminder. Please try again.",
        "error"
      );
    } finally {
      setIsScheduling(false);
    }
  };

  const formatScheduledTime = (dateTime: string) => {
    return new Date(dateTime).toLocaleString();
  };

  // --- UI ---
  if (isLoadingContent) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p>Loading content...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Schedulerheader />
      <div className="container mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            {editorContent ? (
              <>
                {/* --- Content Preview --- */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      Content Preview
                    </CardTitle>
                    <CardDescription>
                      Content ready to be scheduled (Asset ID: {assetId})
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex gap-4 p-4 border rounded-lg bg-muted/50">
                      {editorContent.imageUrl && (
                        <div className="w-20 h-20 rounded-lg overflow-hidden flex-shrink-0">
                          <img
                            src={editorContent.imageUrl}
                            alt="Content preview"
                            className="w-full h-full object-cover"
                          />
                        </div>
                      )}
                      {editorContent.videoUrl && (
                        <div className="w-20 h-20 rounded-lg overflow-hidden flex-shrink-0 bg-black flex items-center justify-center">
                          <Video className="w-8 h-8 text-white" />
                        </div>
                      )}
                      {!editorContent.imageUrl && !editorContent.videoUrl && (
                        <div className="w-20 h-20 rounded-lg overflow-hidden flex-shrink-0 bg-muted flex items-center justify-center">
                          <ImageIcon className="w-8 h-8 text-muted-foreground" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold mb-1">{editorContent.title}</h4>
                        <p className="text-sm mb-2 line-clamp-2">
                          {editorContent.caption || "No caption"}
                        </p>
                        <div className="flex flex-wrap gap-1 mb-2">
                          {editorContent.hashtags?.slice(0, 3).map((hashtag, index) => (
                            <span key={index} className="text-xs text-blue-600">
                              #{hashtag}
                            </span>
                          ))}
                          {editorContent.hashtags && editorContent.hashtags.length > 3 && (
                            <span className="text-xs text-muted-foreground">
                              +{editorContent.hashtags.length - 3} more
                            </span>
                          )}
                        </div>
                        <div className="flex gap-2">
                          <Badge variant="secondary" className="text-xs">
                            {editorContent.contentType === "video" ? "Video" : "Image"}
                          </Badge>
                          <Badge variant="outline" className="text-xs">
                            {selectedPlatform}
                          </Badge>
                          <Badge variant={editorContent.status === "scheduled" ? "default" : "outline"} className="text-xs">
                            {editorContent.status || "draft"}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* --- Scheduler Form --- */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      Schedule Reminder
                    </CardTitle>
                    <CardDescription>
                      Set when you want to be reminded to post this content
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="grid md:grid-cols-2 gap-6">
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <Label>Platform</Label>
                          <Select
                            value={selectedPlatform}
                            onValueChange={(value) =>
                              setSelectedPlatform(value as "instagram" | "tiktok")
                            }
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="instagram">
                                <div className="flex items-center gap-2">
                                  <Instagram className="w-4 h-4" />
                                  Instagram
                                </div>
                              </SelectItem>
                              <SelectItem value="tiktok">
                                <div className="flex items-center gap-2">
                                  <Video className="w-4 h-4" />
                                  TikTok
                                </div>
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-2">
                          <Label>Time</Label>
                          <Select
                            value={selectedTime}
                            onValueChange={setSelectedTime}
                          >
                            <SelectTrigger>
                              <Clock className="w-4 h-4 mr-2" />
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {optimalTimes[selectedPlatform].map((time) => (
                                <SelectItem key={time} value={time}>
                                  {time}
                                </SelectItem>
                              ))}
                              {Array.from({ length: 24 }, (_, i) => {
                                const hour = i.toString().padStart(2, "0");
                                return `${hour}:00`;
                              }).filter(time => !optimalTimes[selectedPlatform].includes(time))
                                .map(time => (
                                  <SelectItem key={time} value={time}>
                                    {time}
                                  </SelectItem>
                                ))
                              }
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-2">
                          <Label>Optimal Times for {selectedPlatform}</Label>
                          <div className="flex flex-wrap gap-2">
                            {optimalTimes[selectedPlatform].map((time) => (
                              <Button
                                key={time}
                                variant={selectedTime === time ? "default" : "outline"}
                                size="sm"
                                onClick={() => setSelectedTime(time)}
                              >
                                {time}
                              </Button>
                            ))}
                          </div>
                        </div>
                      </div>

                      <div className="space-y-4">
                        <Label>Select Date</Label>
                        <Calendar
                          mode="single"
                          selected={selectedDate}
                          onSelect={(date) => setSelectedDate(date || undefined)}
                          className="rounded-md border"
                          disabled={(date) => date < new Date()}
                          required
                        />
                      </div>
                    </div>

                    <div className="flex gap-4 pt-4 border-t">
                      <Button
                        onClick={handleScheduleReminder}
                        disabled={isScheduling || !selectedDate || editorContent.status === "scheduled"}
                        className="flex-1"
                      >
                        {isScheduling ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Setting Reminder...
                          </>
                        ) : editorContent.status === "scheduled" ? (
                          "Already Scheduled"
                        ) : (
                          <>
                            <Clock className="w-4 h-4 mr-2" />
                            Set Reminder
                          </>
                        )}
                      </Button>
                      <Button 
                        variant="outline" 
                        onClick={() => router.push("/library")}
                      >
                        <ArrowLeft className="w-4 h-4 mr-2" />
                        Back to Library
                      </Button>
                    </div>

                    {reminderStatus && (
                      <div className="p-4 bg-muted rounded-lg">
                        <h4 className="font-semibold mb-2">Scheduling Status</h4>
                        <p className="text-sm">
                          Status: <Badge variant="outline">{reminderStatus.status}</Badge>
                        </p>
                        {reminderStatus.run_at && (
                          <p className="text-sm mt-1">
                            Scheduled for: {formatScheduledTime(reminderStatus.run_at)}
                          </p>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </>
            ) : (
              <Card>
                <CardHeader>
                  <CardTitle>Content Not Found</CardTitle>
                  <CardDescription>
                    The requested content could not be found. Please generate content first.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Button variant="outline" onClick={() => router.push("/dashboard")}>
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Back to Dashboard
                  </Button>
                  <Button variant="outline" onClick={() => router.push("/library")}>
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    View Library
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Best Posting Times</CardTitle>
                <CardDescription>
                  Based on your audience engagement
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Instagram className="w-4 h-4" />
                      <span className="text-sm">Instagram</span>
                    </div>
                    <Badge variant="outline">9 AM, 12 PM, 5 PM</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Video className="w-4 h-4" />
                      <span className="text-sm">TikTok</span>
                    </div>
                    <Badge variant="outline">6 AM, 10 AM, 7 PM</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => router.push("/library")}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  View Library
                </Button>
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => router.push("/dashboard")}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Create New Content
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Toast Notifications */}
      <Toast toast={toast} />
    </div>
  );
}