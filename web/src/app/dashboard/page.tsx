"use client";
import { useEffect, useState } from "react";
import { Button } from "@/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/card";
import { Textarea } from "@/components/textarea";
import { Badge } from "@/components/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/select";
import { Progress } from "@/components/progress";
import { useRouter } from "next/navigation";
import Header from "@/components/commonheader";
import {
  Sparkles,
  Instagram,
  Video,
  ImageIcon,
  Palette,
  Zap,
  Coffee,
  ShoppingBag,
  Scissors,
  Camera,
  Hash,
  Type,
  Play,
  AlertCircle,
  Globe,
} from "lucide-react";

import {
  useGenerateCaptionMutation,
  useGenerateImageMutation,
  useRenderVideoMutation,
  useGenerateStoryboardMutation,
  useGetTaskQuery,
  useRenderImageMutation,
  useGetImageStatusQuery,
  useReminderMutation,
  useReminderStatusQuery
} from "@/lib/redux/services/api";
import { Alert, AlertDescription } from "@/components/alert";
import type { Brand } from "../types/common";
import { StoryboardShot } from "@/lib/types/api";
import ActionButton from "./ActionButton";

interface GetTaskResponse {
  status: "queued" | "ready" | "failed";
  video_url?: string;
}

export default function Dashboard() {
  const router = useRouter();
  const [language, setLanguage] = useState("en");
  const [currentStep, setCurrentStep] = useState("idea");
  const [idea, setIdea] = useState("");
  const [platform, setPlatform] = useState("instagram");
  const [contentType, setContentType] = useState("image");
  const [tone, setTone] = useState("playful");
  const [businessType, setBusinessType] = useState("cafe");
  const [isGenerating, setIsGenerating] = useState(false);
  const [brand, setBrand] = useState<Brand | null>(null);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  type GeneratedContent = {
    caption: string;
    hashtags: string[];
    imageUrl?: string;
    videoUrl?: string;
    taskId: string;
    imageId: string;
    storyboard?: StoryboardShot[];
    overlays?: { text: string; position?: string }[];
  };

  const [
    generateCaption,
    { isLoading: isCaptionLoading, error: captionError },
  ] = useGenerateCaptionMutation();
  const [generateImage, { isLoading: isImageLoading, error: imageError }] =
    useGenerateImageMutation();
  const [
    generateStoryboard,
    { isLoading: isStoryboardLoading, error: storyboardError },
  ] = useGenerateStoryboardMutation();
  const [renderVideo, { isLoading: isVideoLoading, error: videoError }] =
    useRenderVideoMutation();

  const [renderImage, { error: imageRenderError }] = useRenderImageMutation();

  const isLoading =
    isCaptionLoading || isImageLoading || isStoryboardLoading || isVideoLoading;

  const [generatedContent, setGeneratedContent] = useState<GeneratedContent>({
    caption: "",
    hashtags: [],
    imageUrl: "",
    videoUrl: "",
    imageId: "",
    taskId: "",
  });

  useEffect(() => {
    const storedBrand = localStorage.getItem("brandSetting");
    if (!storedBrand) return;
    try {
      const parsed = JSON.parse(storedBrand) as Brand;
      setBrand(parsed);
    } catch (e) {
      console.error("Failed to parse brand data:", e);
    }
  }, []);

  const { data: taskStatus, error: taskError } = useGetTaskQuery(
    generatedContent.taskId,
    {
      skip: !generatedContent.taskId,
      pollingInterval: 2000,
    }
  );

  const { data: imageStatus, error: imageStatusError } = useGetImageStatusQuery(
    generatedContent.imageId,
    {
      skip: !generatedContent.imageId,
      pollingInterval: 2000,
    }
  );

  useEffect(() => {
    if (taskStatus) {
      console.log("Task status:", taskStatus);

      if (taskStatus.status === "ready" && taskStatus.video_url) {
        setGeneratedContent((prev) => ({
          ...prev,
          videoUrl: taskStatus.video_url,
        }));
        setProgress(100);
        setCurrentStep("preview");
      } else if (taskStatus.status === "failed") {
        setError("Video rendering failed. Please try again.");
        setIsGenerating(false);
      }
    }
  }, [taskStatus]);

  useEffect(() => {
    if (imageStatusError) {
      console.error("Image status error:", imageStatusError);
      setError("Failed to check image status");
      setIsGenerating(false);
    }
  }, [imageStatusError]);

  useEffect(() => {
    if (taskError) {
      console.error("Task status error:", taskError);
      setError("Failed to check video status");
      setIsGenerating(false);
    }
  }, [taskError]);

useEffect(() => {
  if (imageStatus) {
    console.log("FULL Image status:", imageStatus);

    const jobStatus = imageStatus.status?.toLowerCase();
    const assetStatus = imageStatus.video_url?.status?.toLowerCase();
    const imageUrl = imageStatus.video_url?.image_url;

    console.log("Job Status:", jobStatus);
    console.log("Asset Status:", assetStatus);
    console.log("Image URL:", imageUrl);

    if ((assetStatus === "ready" || assetStatus === "completed") && imageUrl) {
      setGeneratedContent((prev) => ({
        ...prev,
        imageUrl,
      }));
      setProgress(100);
      setCurrentStep("preview");
      setIsGenerating(false); // Make sure to set generating to false
    } else if (assetStatus === "failed" || jobStatus === "failed") {
      setError("Image generation failed. Please try again.");
      setIsGenerating(false);
    }
    // Handle queued/processing states
    else if (assetStatus === "queued" || assetStatus === "processing") {
      // You might want to update progress or show a different message
      setProgress(80); // Keep progress at 80% while processing
    }
  }
}, [imageStatus]);

  useEffect(() => {
    const error =
      captionError ||
      imageError ||
      storyboardError ||
      videoError ||
      imageRenderError;
    if (error) {
      setError("Failed to generate content. Please try again.");
      setIsGenerating(false);
    }
  }, [captionError, imageError, storyboardError, videoError, imageRenderError]);

  const translations = {
    en: {
      title: "SocialSpark",
      subtitle: "AI-Powered Content Creation for Ethiopian SMEs",
      ideaPlaceholder:
        'Describe your content idea... e.g., "Fun TikTok for my café\'s new latte"',
      generate: "Generate Content",
      regenerate: "Regenerate",
      export: "Export",
      post: "Post",
      schedule: "Reminder",
      share: "Share Now",
      caption: "Caption",
      hashtags: "Hashtags",
      preview: "Preview",
      brandPresets: "Brand Presets",
      contentLibrary: "Add to Library",
      edit: "Edit",

      examples: "Try these examples:",
      exampleCafe:
        "Create a fun TikTok for my café's new caramel macadamia latte",
      exampleSale: "Instagram post for clothing sale, 20% off tees, today only",
      exampleBeauty: "Beauty tip video for natural skincare routine",
    },
    am: {
      edit: "አቀናባሪ",
      post: "ላክ",
      title: "ሶሻል ስፓርክ",
      subtitle: "ለኢትዮጵያ አነስተኛ ንግዶች AI የይዘት ፈጠራ መሳሪያ",
      ideaPlaceholder: 'የይዘት ሀሳብዎን ይግለጹ... ለምሳሌ "ለካፌዬ አዲስ ላቴ አዝናኝ ቲክቶክ"',
      generate: "ይዘት ፍጠር",
      regenerate: "እንደገና ፍጠር",
      export: "ወደ ውጭ አውጣ",
      schedule: "ጊዜ ይያዙ",
      share: "አሁን አጋራ",
      caption: "መግለጫ",
      hashtags: "ሃሽታግ",
      preview: "ቅድመ እይታ",
      brandPresets: "የብራንድ ቅንብሮች",
      contentLibrary: "የይዘት ቤተ-መጽሐፍት",
      examples: "እነዚህን ምሳሌዎች ይሞክሩ:",
      exampleCafe: "ለካፌዬ አዲስ ካራሜል ማካዳሚያ ላቴ አዝናኝ ቲክቶክ ፍጠር",
      exampleSale: "ለልብስ ሽያጭ ኢንስታግራም ፖስት፣ 20% ቅናሽ ቲሸርቶች፣ ዛሬ ብቻ",
      exampleBeauty: "ለተፈጥሮ የቆዳ እንክብካቤ ሩቲን የውበት ምክር ቪዲዮ",
    },
  };

  const t = translations[language as keyof typeof translations];

  const handleGenerate = async () => {
    if (!idea.trim()) return;

    setIsGenerating(true);
    setProgress(0);
    setCurrentStep("generating");
    setError(null);
    setGeneratedContent({
      caption: "",
      hashtags: [],
      imageUrl: "",
      videoUrl: "",
      imageId: "",
      taskId: "",
    });

    try {
      if (!brand) {
        setError("Please set up your brand first!");
        setIsGenerating(false);
        return;
      }

      setProgress(20);
      const captionResponse = await generateCaption({
        idea,
        platform,
        language,
        hashtags_count: 6,
        brand_presets: {
          name: brand.businessName || "",
          tone: tone,
          colors: [
            brand.primaryColor || "#000000",
            brand.secondaryColor || "#FFFFFF",
          ],
          default_hashtags: brand.defaultHashtags || [],
          footer_text: `© ${brand.businessName} ${new Date().getFullYear()}`,
        },
      }).unwrap();

      setGeneratedContent((prev) => ({
        ...prev,
        caption: captionResponse.caption,
        hashtags: captionResponse.hashtags,
      }));

      setProgress(40);
      if (contentType === "image") {
        setProgress(60);

        try {
          const promptResponse = await generateImage({
            prompt: idea,
            style: "realistic",
            aspect_ratio: platform === "instagram" ? "1:1" : "9:16",
            platform,
            brand_presets: {
              name: brand.businessName || "",
              tone: tone,
              colors: [
                brand.primaryColor || "#000000",
                brand.secondaryColor || "#FFFFFF",
              ],
              default_hashtags: brand.defaultHashtags || [],
              footer_text: `© ${
                brand.businessName
              } ${new Date().getFullYear()}`,
            },
          }).unwrap();

          const renderResponse = await renderImage({
            prompt_used: promptResponse.prompt_used,
            style: promptResponse.style,
            aspect_ratio: promptResponse.aspect_ratio,
            platform: promptResponse.platform,
          }).unwrap();

          if (!renderResponse?.task_id) {
            throw new Error("Failed to get image task ID");
          }

          setGeneratedContent((prev) => ({
            ...prev,
            imageId: renderResponse.task_id,
          }));

          setProgress(80);
          setCurrentStep("preview");
        } catch (error) {
          console.error("Image generation failed:", error);
          setError("Failed to generate image");
          setIsGenerating(false);
        }
      }
      if (contentType === "video") {
        setProgress(50);
        const storyboardResponse = await generateStoryboard({
          idea,
          platform,
          language,
          number_of_shots: 3,
          cta: "Visit us today!",
          brand_presets: {
            name: brand.businessName || "",
            tone: tone,
            colors: [
              brand.primaryColor || "#000000",
              brand.secondaryColor || "#FFFFFF",
            ],
            default_hashtags: brand.defaultHashtags || [],
            footer_text: `© ${brand.businessName} ${new Date().getFullYear()}`,
          },
        }).unwrap();

        if (
          !storyboardResponse?.shots ||
          storyboardResponse.shots.length === 0
        ) {
          throw new Error(
            "Failed to generate storyboard: No shots were created"
          );
        }

        setGeneratedContent((prev) => ({
          ...prev,
          storyboard: storyboardResponse.shots,
          overlays: storyboardResponse.shots.map((shot) => ({
            text: shot.text,
            position: "center",
          })),
        }));

        setProgress(70);

        const videoResponse = await renderVideo({
          shots: storyboardResponse.shots.map((shot) => ({
            duration: shot.duration,
            text: shot.text,
          })),
          music: storyboardResponse.music || "upbeat",
        }).unwrap();

        if (!videoResponse?.task_id) {
          throw new Error("Failed to queue video rendering task");
        }

        setGeneratedContent((prev) => ({
          ...prev,
          taskId: videoResponse.task_id,
        }));

        setProgress(80);
        setCurrentStep("preview");
      }
    } catch (err) {
      console.error("Generation failed:", err);
      setError(
        err instanceof Error ? err.message : "Failed to generate content"
      );
    } finally {
      setIsGenerating(false);
    }
  };

  const getVideoStatusMessage = () => {
    if (!generatedContent.taskId) return "Video Preview";

    switch (taskStatus?.status) {
      case "queued":
        return "Video in queue...";
      case "ready":
        return "Video ready!";
      case "failed":
        return "Video failed - try again";
      default:
        return "Processing video...";
    }
  };
  const getImageStatusMessage = () => {
    if (!generatedContent.imageId) return "Image Preview";
    const status = imageStatus?.video_url?.status?.toLowerCase();

    switch (status) {
      case "queued":
        return "Image in queue...";
      case "processing":
        return "Image is being generated...";
      case "ready":
      case "completed":
        return "Image ready!";
      case "failed":
        return "Image failed - try again";
      default:
        return "Processing image...";
    }
  };
  const businessTypes = [
    { icon: Coffee, label: "Café", value: "cafe" },
    { icon: ShoppingBag, label: "Retail", value: "retail" },
    { icon: Scissors, label: "Salon", value: "salon" },
    { icon: Camera, label: "Photography", value: "photography" },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            {/* Idea Input Card */}
            <Card className="border-2 border-primary/20  bg-[#D9D9D9]/[0.72]">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 font-montserrat">
                  <Zap className="w-5 h-5 text-secondary" />
                  Content Idea
                </CardTitle>
                <CardDescription>{t.examples}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Textarea
                  placeholder={t.ideaPlaceholder}
                  value={idea}
                  onChange={(e) => setIdea(e.target.value)}
                  className="min-h-[100px] text-base"
                  dir={language === "am" ? "ltr" : "ltr"}
                />

                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIdea(t.exampleCafe)}
                    className="text-xs"
                  >
                    {t.exampleCafe.substring(0, 30)}...
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIdea(t.exampleSale)}
                    className="text-xs"
                  >
                    {t.exampleSale.substring(0, 30)}...
                  </Button>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  {/* Language Selector */}
                  <div>
                    <label className="text-sm font-medium mb-2 block">
                      Language
                    </label>
                    <Select
                      value={language}
                      onValueChange={(value) => setLanguage(value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="en">
                          <div className="flex items-center gap-2">
                            <Globe className="w-4 h-4" />
                            English
                          </div>
                        </SelectItem>
                        <SelectItem value="am">
                          <div className="flex items-center gap-2">
                            <Globe className="w-4 h-4" />
                            Amharic
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Platform Selector */}
                  <div>
                    <label className="text-sm font-medium mb-2 block">
                      Platform
                    </label>
                    <Select value={platform} onValueChange={setPlatform}>
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

                  {/* Content Type Selector */}
                  <div>
                    <label className="text-sm font-medium mb-2 block">
                      Content Type
                    </label>
                    <Select value={contentType} onValueChange={setContentType}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="image">
                          <div className="flex items-center gap-2">
                            <ImageIcon className="w-4 h-4" />
                            Image Post
                          </div>
                        </SelectItem>
                        <SelectItem value="video">
                          <div className="flex items-center gap-2">
                            <Video className="w-4 h-4" />
                            Short Video
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">Tone</label>
                  <div className="flex flex-wrap gap-2">
                    {["playful", "professional", "casual", "elegant"].map(
                      (toneOption) => (
                        <Button
                          key={toneOption}
                          variant={tone === toneOption ? "default" : "outline"}
                          size="sm"
                          onClick={() => setTone(toneOption)}
                          className="capitalize"
                        >
                          {toneOption}
                        </Button>
                      )
                    )}
                  </div>
                </div>

                <Button
                  onClick={handleGenerate}
                  disabled={!idea.trim() || isGenerating}
                  className="w-full h-12 text-base font-semibold"
                  size="lg"
                >
                  {isGenerating ? (
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                      Generating...
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-5 h-5" />
                      {t.generate}
                    </div>
                  )}
                </Button>

                {/* Progress Bar */}
                {isGenerating && (
                  <div className="space-y-2">
                    <Progress value={progress} className="w-full" />
                    <p className="text-sm text-muted-foreground text-center">
                      {progress < 20
                        ? "Analyzing your idea..."
                        : progress < 40
                        ? "Generating caption..."
                        : progress < 60
                        ? "Creating hashtags..."
                        : progress < 70
                        ? "Generating image prompt..."
                        : progress < 80
                        ? contentType === "image"
                          ? imageStatus?.status === "PROCESSING"
                            ? "Image is being generated..."
                            : "Rendering image..."
                          : "Generating storyboard..."
                        : progress < 95
                        ? contentType === "image"
                          ? "Finalizing image..."
                          : "Rendering video..."
                        : "Finalizing content..."}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error.toString()}</AlertDescription>
              </Alert>
            )}

            {currentStep === "preview" && generatedContent.caption && (
              <Card className="bg-gray-100 shadow-lg">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 font-montserrat">
                    <Camera className="w-5 h-5 text-secondary" />
                    Generated Content
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid md:grid-cols-2 gap-6">
                    {/* Caption and Hashtags */}
                    <div className="space-y-4">
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <Type className="w-4 h-4" />
                          <label>{t.caption}</label>
                        </div>
                        <Textarea
                          value={generatedContent.caption}
                          onChange={(e) =>
                            setGeneratedContent({
                              ...generatedContent,
                              caption: e.target.value,
                            })
                          }
                          className="min-h-[120px]  text-gray-500 text-sm tracking-wide"
                          dir={language === "am" ? "ltr" : "ltr"}
                        />
                      </div>

                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <Hash className="w-4 h-4" />
                          <label className="font-medium">{t.hashtags}</label>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {generatedContent.hashtags.map((hashtag, index) => (
                            <Badge
                              key={index}
                              variant="secondary"
                              className="text-xs"
                            >
                              {hashtag}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Visual Preview */}
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <ImageIcon className="w-4 h-4" />
                        <label className="font-medium">{t.preview}</label>
                      </div>

                      <div className="aspect-square bg-muted rounded-xl overflow-hidden border shadow-sm">
                        {contentType === "image" ? (
                          generatedContent.imageUrl ? (
                            <img
                              src={generatedContent.imageUrl}
                              alt="Generated content"
                              className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                            />
                          ) : (
                            <div className="w-full h-full bg-muted flex items-center justify-center">
                              {generatedContent.imageId ? (
                                <div className="relative text-center space-y-4">
                                  {getImageStatusMessage() ===
                                    "Image failed - try again" || error ? (
                                    <>
                                      <div className="w-20 h-20 mx-auto bg-red-100 rounded-full flex items-center justify-center">
                                        <ImageIcon className="w-10 h-10 text-red-500" />
                                      </div>
                                      <p className="text-sm font-medium text-red-500">
                                        Image failed - try again
                                      </p>
                                    </>
                                  ) : (
                                    <>
                                      <div className="relative w-24 h-24 mx-auto">
                                        <div className="absolute inset-0 border-4 border-primary/20 rounded-full animate-spin">
                                          <div className="absolute top-0 left-1/2 w-2 h-2 bg-primary rounded-full transform -translate-x-1/2 -translate-y-1"></div>
                                        </div>

                                        <div className="absolute inset-2 bg-primary/10 rounded-full animate-pulse flex items-center justify-center">
                                          <ImageIcon className="w-8 h-8 text-primary animate-bounce" />
                                        </div>

                                        <div className="absolute -bottom-6 left-1/2 transform -translate-x-1/2 flex space-x-1">
                                          <div className="w-2 h-2 bg-primary rounded-full animate-pulse"></div>
                                          <div
                                            className="w-2 h-2 bg-primary/60 rounded-full animate-pulse"
                                            style={{ animationDelay: "0.2s" }}
                                          ></div>
                                          <div
                                            className="w-2 h-2 bg-primary/30 rounded-full animate-pulse"
                                            style={{ animationDelay: "0.4s" }}
                                          ></div>
                                        </div>
                                      </div>

                                      <div className="mt-8">
                                        <p className="text-sm font-medium text-primary">
                                          {getImageStatusMessage()}
                                        </p>
                                        <div className="flex justify-center mt-2">
                                          <div className="flex space-x-1">
                                            <div className="w-1 h-1 bg-muted-foreground rounded-full animate-bounce"></div>
                                            <div
                                              className="w-1 h-1 bg-muted-foreground rounded-full animate-bounce"
                                              style={{ animationDelay: "0.1s" }}
                                            ></div>
                                            <div
                                              className="w-1 h-1 bg-muted-foreground rounded-full animate-bounce"
                                              style={{ animationDelay: "0.2s" }}
                                            ></div>
                                          </div>
                                        </div>
                                      </div>
                                    </>
                                  )}
                                </div>
                              ) : (
                                <div className="relative text-center">
                                  <div className="w-20 h-20 mx-auto bg-muted-foreground/10 rounded-full flex items-center justify-center mb-4">
                                    <ImageIcon className="w-10 h-10 text-muted-foreground/60" />
                                  </div>
                                  <p className="text-sm text-muted-foreground">
                                    Image Preview
                                  </p>
                                </div>
                              )}
                            </div>
                          )
                        ) : (
                          <div className="w-full h-full bg-muted flex items-center justify-center">
                            {generatedContent.videoUrl ? (
                              <video
                                src={generatedContent.videoUrl}
                                controls
                                className="w-full h-full object-cover rounded-lg hover:scale-105 transition-transform duration-300"
                              />
                            ) : (
                              <div className="text-center space-y-4">
                                {generatedContent.taskId ? (
                                  getVideoStatusMessage() ===
                                  "Video failed - try again" ? (
                                    <>
                                      <div className="w-20 h-20 mx-auto bg-red-100 rounded-full flex items-center justify-center">
                                        <Video className="w-10 h-10 text-red-500" />
                                      </div>
                                      <p className="text-sm font-medium text-red-500">
                                        Video failed - try again
                                      </p>
                                    </>
                                  ) : (
                                    <>
                                      <div className="relative w-24 h-24 mx-auto">
                                        <div className="absolute inset-0 border-4 border-primary/20 rounded-full animate-spin">
                                          <div className="absolute top-0 left-1/2 w-2 h-2 bg-primary rounded-full transform -translate-x-1/2 -translate-y-1"></div>
                                        </div>

                                        <div className="absolute inset-2 bg-primary/10 rounded-full animate-pulse flex items-center justify-center">
                                          <Video className="w-8 h-8 text-primary animate-bounce" />
                                        </div>

                                        <div className="absolute -bottom-6 left-1/2 transform -translate-x-1/2 flex space-x-1">
                                          <div className="w-2 h-2 bg-primary rounded-full animate-pulse"></div>
                                          <div
                                            className="w-2 h-2 bg-primary/60 rounded-full animate-pulse"
                                            style={{ animationDelay: "0.2s" }}
                                          ></div>
                                          <div
                                            className="w-2 h-2 bg-primary/30 rounded-full animate-pulse"
                                            style={{ animationDelay: "0.4s" }}
                                          ></div>
                                        </div>
                                      </div>

                                      <div className="mt-8">
                                        <p className="text-sm font-medium text-primary">
                                          {getVideoStatusMessage()}
                                        </p>
                                        <div className="flex justify-center mt-2">
                                          <div className="flex space-x-1">
                                            <div className="w-1 h-1 bg-muted-foreground rounded-full animate-bounce"></div>
                                            <div
                                              className="w-1 h-1 bg-muted-foreground rounded-full animate-bounce"
                                              style={{ animationDelay: "0.1s" }}
                                            ></div>
                                            <div
                                              className="w-1 h-1 bg-muted-foreground rounded-full animate-bounce"
                                              style={{ animationDelay: "0.2s" }}
                                            ></div>
                                          </div>
                                        </div>
                                      </div>
                                    </>
                                  )
                                ) : (
                                  <div className="relative">
                                    <div className="w-20 h-20 mx-auto bg-muted-foreground/10 rounded-full flex items-center justify-center mb-4">
                                      <Play className="w-10 h-10 text-muted-foreground/60" />
                                    </div>
                                    <p className="text-sm text-muted-foreground">
                                      Video Preview
                                    </p>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <ActionButton
                    generatedContent={generatedContent}
                    platform={platform}
                    contentType={contentType}
                    t={t}
                    onRegenerate={handleGenerate}
                  />
                </CardContent>
              </Card>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6 ">
            {/* Business Type Quick Setup */}

            <Card className="bg-[#D9D9D9]/[0.72] ">
              <CardHeader>
                <CardTitle className="text-lg font-montserrat ">
                  Business Type
                </CardTitle>
                <CardDescription>Quick setup for your business</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-3 ">
                  {businessTypes.map(({ icon: Icon, label, value }) => (
                    <Button
                      key={value}
                      variant="outline"
                      className="h-20 flex-col gap-2 bg-transparent"
                    >
                      <Icon className="w-6 h-6" />
                      <span className="text-xs">{label}</span>
                    </Button>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Brand Presets */}
            <Card className="bg-[#D9D9D9]/[0.72] ">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg font-montserrat">
                  <Palette className="w-5 h-5" />
                  {t.brandPresets}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Brand Colors</label>
                  <div className="flex gap-2">
                    <div
                      className="w-8 h-8 bg-primary rounded-full border-2 border-background shadow-sm"
                      style={{ backgroundColor: brand?.primaryColor }}
                    ></div>
                    <div
                      className="w-8 h-8 bg-secondary rounded-full border-2 border-background shadow-sm"
                      style={{ backgroundColor: brand?.secondaryColor }}
                    ></div>
                    <div
                      className="w-8 h-8 bg-accent rounded-full border-2 border-background shadow-sm"
                      style={{ backgroundColor: brand?.accentColor }}
                    ></div>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    Default Hashtags
                  </label>
                  <div className="flex flex-wrap gap-1">
                    {brand?.defaultHashtags.map((hashtag, i) => (
                      <Badge key={i} variant="outline" className="text-xs">
                        #{hashtag}
                      </Badge>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}