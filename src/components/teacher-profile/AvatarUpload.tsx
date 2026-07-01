import { useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Camera, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";
import { useMutation, useQueryClient } from "@tanstack/react-query";

interface AvatarUploadProps {
  profileId: string;
  userId: string;
  avatarUrl: string | null;
  fullName: string;
  /** Size of the avatar circle */
  size?: "sm" | "md" | "lg";
  /** Show upload/change/remove controls */
  editable?: boolean;
}

const SIZE_MAP = {
  sm: "h-12 w-12",
  md: "h-20 w-20",
  lg: "h-24 w-24",
} as const;

const TEXT_SIZE_MAP = {
  sm: "text-xs",
  md: "text-xl",
  lg: "text-2xl",
} as const;

const AvatarUpload = ({
  profileId,
  userId,
  avatarUrl,
  fullName,
  size = "md",
  editable = false,
}: AvatarUploadProps) => {
  const fileRef = useRef<HTMLInputElement>(null);
  const qc = useQueryClient();
  const [uploading, setUploading] = useState(false);

  const initials = fullName
    ? fullName.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()
    : "??";

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      // Validate dimensions
      const img = await loadImage(file);
      if (img.width < 400 || img.height < 400) {
        throw new Error("Image must be at least 400×400 pixels.");
      }

      const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
      const path = `${userId}/avatar.${ext}`;

      // Remove old files in the folder first
      const { data: existing } = await supabase.storage
        .from("avatars")
        .list(userId);
      if (existing && existing.length > 0) {
        await supabase.storage
          .from("avatars")
          .remove(existing.map((f) => `${userId}/${f.name}`));
      }

      const { error: uploadErr } = await supabase.storage
        .from("avatars")
        .upload(path, file, { upsert: true, contentType: file.type });
      if (uploadErr) throw uploadErr;

      const { data: urlData } = supabase.storage
        .from("avatars")
        .getPublicUrl(path);

      const publicUrl = urlData.publicUrl + `?t=${Date.now()}`;

      const { error: updateErr } = await supabase
        .from("teacher_profiles")
        .update({ avatar_url: publicUrl })
        .eq("id", profileId);
      if (updateErr) throw updateErr;

      return publicUrl;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["teacher_profile"] });
      qc.invalidateQueries({ queryKey: ["my_teacher_profile"] });
      toast.success("Photo updated");
    },
    onError: (err: Error) => toast.error(err.message),
    onSettled: () => setUploading(false),
  });

  const removeMutation = useMutation({
    mutationFn: async () => {
      const { data: existing } = await supabase.storage
        .from("avatars")
        .list(userId);
      if (existing && existing.length > 0) {
        await supabase.storage
          .from("avatars")
          .remove(existing.map((f) => `${userId}/${f.name}`));
      }

      const { error } = await supabase
        .from("teacher_profiles")
        .update({ avatar_url: null })
        .eq("id", profileId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["teacher_profile"] });
      qc.invalidateQueries({ queryKey: ["my_teacher_profile"] });
      toast.success("Photo removed");
    },
    onError: () => toast.error("Failed to remove photo"),
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      toast.error("Please upload a JPG, PNG, or WebP image.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be under 5 MB.");
      return;
    }

    setUploading(true);
    uploadMutation.mutate(file);
    e.target.value = "";
  };

  const isLoading = uploading || uploadMutation.isPending || removeMutation.isPending;

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative group">
        <Avatar className={`${SIZE_MAP[size]} ring-2 ring-border shadow-md`}>
          {avatarUrl && <AvatarImage src={avatarUrl} alt={fullName} />}
          <AvatarFallback className={`bg-primary/10 text-primary ${TEXT_SIZE_MAP[size]} font-bold`}>
            {initials}
          </AvatarFallback>
        </Avatar>

        {editable && (
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={isLoading}
            className="absolute inset-0 flex items-center justify-center bg-black/40 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer disabled:cursor-wait"
          >
            <Camera className="h-5 w-5" />
          </button>
        )}
      </div>

      {editable && (
        <div className="flex gap-1.5">
          <Button
            variant="outline"
            size="sm"
            className="h-7 text-[11px] gap-1 px-2"
            onClick={() => fileRef.current?.click()}
            disabled={isLoading}
          >
            <Upload className="h-3 w-3" />
            {avatarUrl ? "Change Photo" : "Upload Photo"}
          </Button>
          {avatarUrl && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-[11px] gap-1 px-2 text-destructive hover:text-destructive"
              onClick={() => removeMutation.mutate()}
              disabled={isLoading}
            >
              <Trash2 className="h-3 w-3" />
              Remove
            </Button>
          )}
        </div>
      )}

      <input
        ref={fileRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={handleFileChange}
      />

      {editable && (
        <p className="text-[10px] text-muted-foreground text-center">
          Square photo recommended · Min 400×400 px · Max 5 MB
        </p>
      )}
    </div>
  );
};

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = URL.createObjectURL(file);
  });
}

export default AvatarUpload;
