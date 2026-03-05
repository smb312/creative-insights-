"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { useToast } from "@/components/ui/toast";
import { createClientAction, uploadLogo } from "./actions";
import type {
  ClientStatus,
  PlatformName,
  PlatformAccessStatus,
} from "@/lib/types";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Upload,
  Loader2,
  Send,
  SkipForward,
} from "lucide-react";

const PLATFORMS: { name: PlatformName; label: string; color: string }[] = [
  { name: "meta", label: "Meta", color: "bg-blue-500" },
  { name: "google", label: "Google", color: "bg-red-500" },
  { name: "shopify", label: "Shopify", color: "bg-green-500" },
  { name: "klaviyo", label: "Klaviyo", color: "bg-purple-500" },
  { name: "ga4", label: "GA4", color: "bg-orange-500" },
  { name: "tiktok", label: "TikTok", color: "bg-gray-900" },
];

const STEPS = ["Client Info", "Platform Access", "Invite Client"];

interface PlatformState {
  platform: PlatformName;
  status: PlatformAccessStatus;
  notes: string;
  instructions_url: string;
}

export default function NewClientPage() {
  const router = useRouter();
  const { addToast } = useToast();
  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  // Step 1
  const [name, setName] = useState("");
  const [contactName, setContactName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [status, setStatus] = useState<ClientStatus>("onboarding");
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [logoUploading, setLogoUploading] = useState(false);

  // Step 2
  const [platforms, setPlatforms] = useState<PlatformState[]>(
    PLATFORMS.map((p) => ({
      platform: p.name,
      status: "not_started" as PlatformAccessStatus,
      notes: "",
      instructions_url: "",
    }))
  );

  // Step 3
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteName, setInviteName] = useState("");

  const canProceedStep1 = name.trim() && contactName.trim() && contactEmail.trim();

  function updatePlatform(
    index: number,
    field: keyof PlatformState,
    value: string
  ) {
    setPlatforms((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  }

  async function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setLogoUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const result = await uploadLogo(formData);
      if (result.error) {
        addToast({ title: "Logo upload failed", description: result.error, variant: "error" });
      } else {
        setLogoUrl(result.url);
        addToast({ title: "Logo uploaded", variant: "success" });
      }
    } catch {
      addToast({ title: "Logo upload failed", variant: "error" });
    } finally {
      setLogoUploading(false);
    }
  }

  async function handleSubmit(skipInvite: boolean) {
    setSubmitting(true);
    try {
      const result = await createClientAction({
        name: name.trim(),
        primary_contact_name: contactName.trim(),
        primary_contact_email: contactEmail.trim(),
        status,
        logo_url: logoUrl,
        platforms,
        invite_email: skipInvite ? null : inviteEmail.trim() || null,
        invite_name: skipInvite ? null : inviteName.trim() || null,
      });

      if (result.error) {
        addToast({
          title: "Failed to create client",
          description: result.error,
          variant: "error",
        });
        setSubmitting(false);
        return;
      }

      if (result.warning) {
        addToast({
          title: "Client created with warning",
          description: result.warning,
          variant: "default",
        });
      } else {
        addToast({
          title: "Client created successfully",
          variant: "success",
        });
      }

      router.push(`/clients/${result.clientId}/onboarding`);
    } catch {
      addToast({
        title: "Something went wrong",
        variant: "error",
      });
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-8 text-2xl font-bold text-gray-900">Add New Client</h1>

      {/* Step indicator */}
      <div className="mb-8 flex items-center gap-2">
        {STEPS.map((label, i) => (
          <div key={label} className="flex items-center gap-2">
            <div className="flex items-center gap-2">
              <div
                className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium ${
                  i < step
                    ? "bg-green-500 text-white"
                    : i === step
                    ? "bg-[#0066FF] text-white"
                    : "bg-gray-100 text-gray-500"
                }`}
              >
                {i < step ? <Check className="h-4 w-4" /> : i + 1}
              </div>
              <span
                className={`text-sm ${
                  i === step ? "font-medium text-gray-900" : "text-gray-500"
                }`}
              >
                {label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div className="mx-2 h-px w-8 bg-gray-200" />
            )}
          </div>
        ))}
      </div>

      {/* Step 1: Client Info */}
      {step === 0 && (
        <div className="space-y-5">
          <div>
            <Label htmlFor="name">Company Name *</Label>
            <Input
              id="name"
              className="mt-1.5"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Acme Corp"
            />
          </div>

          <div>
            <Label htmlFor="contactName">Primary Contact Name *</Label>
            <Input
              id="contactName"
              className="mt-1.5"
              value={contactName}
              onChange={(e) => setContactName(e.target.value)}
              placeholder="Jane Doe"
            />
          </div>

          <div>
            <Label htmlFor="contactEmail">Primary Contact Email *</Label>
            <Input
              id="contactEmail"
              className="mt-1.5"
              type="email"
              value={contactEmail}
              onChange={(e) => setContactEmail(e.target.value)}
              placeholder="jane@acme.com"
            />
          </div>

          <div>
            <Label htmlFor="status">Status</Label>
            <Select
              id="status"
              className="mt-1.5"
              value={status}
              onChange={(e) => setStatus(e.target.value as ClientStatus)}
            >
              <option value="onboarding">Onboarding</option>
              <option value="active">Active</option>
            </Select>
          </div>

          <div>
            <Label>Logo (optional)</Label>
            <div className="mt-1.5 flex items-center gap-3">
              {logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={logoUrl} alt="Logo" className="h-12 w-12 rounded-full object-cover" />
              ) : (
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gray-100 text-gray-400">
                  <Upload className="h-5 w-5" />
                </div>
              )}
              <label className="cursor-pointer">
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleLogoUpload}
                  disabled={logoUploading}
                />
                <span className="text-sm font-medium text-[#0066FF] hover:underline">
                  {logoUploading
                    ? "Uploading..."
                    : logoUrl
                    ? "Change logo"
                    : "Upload logo"}
                </span>
              </label>
            </div>
          </div>

          <div className="flex justify-end pt-4">
            <Button onClick={() => setStep(1)} disabled={!canProceedStep1}>
              Next
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Step 2: Platform Access */}
      {step === 1 && (
        <div className="space-y-4">
          <p className="text-sm text-gray-500">
            Configure platform access status for each integration.
          </p>

          <div className="space-y-3">
            {platforms.map((p, i) => {
              const meta = PLATFORMS[i];
              return (
                <div
                  key={p.platform}
                  className="rounded-lg border border-gray-200 p-4"
                >
                  <div className="mb-3 flex items-center gap-2">
                    <div
                      className={`h-2.5 w-2.5 rounded-full ${meta.color}`}
                    />
                    <span className="text-sm font-medium text-gray-900">
                      {meta.label}
                    </span>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-3">
                    <div>
                      <Label className="text-xs text-gray-500">Status</Label>
                      <Select
                        className="mt-1"
                        value={p.status}
                        onChange={(e) =>
                          updatePlatform(i, "status", e.target.value)
                        }
                      >
                        <option value="not_started">Not Started</option>
                        <option value="pending">Pending</option>
                        <option value="received">Received</option>
                        <option value="verified">Verified</option>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-xs text-gray-500">Notes</Label>
                      <Input
                        className="mt-1"
                        value={p.notes}
                        onChange={(e) =>
                          updatePlatform(i, "notes", e.target.value)
                        }
                        placeholder="Optional notes"
                      />
                    </div>
                    <div>
                      <Label className="text-xs text-gray-500">
                        Instructions URL
                      </Label>
                      <Input
                        className="mt-1"
                        value={p.instructions_url}
                        onChange={(e) =>
                          updatePlatform(i, "instructions_url", e.target.value)
                        }
                        placeholder="https://..."
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex justify-between pt-4">
            <Button variant="outline" onClick={() => setStep(0)}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
            <Button onClick={() => setStep(2)}>
              Next
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Step 3: Invite Client */}
      {step === 2 && (
        <div className="space-y-5">
          <p className="text-sm text-gray-500">
            Optionally invite the client to access their portal. You can skip
            this and invite them later.
          </p>

          <div>
            <Label htmlFor="inviteName">Full Name</Label>
            <Input
              id="inviteName"
              className="mt-1.5"
              value={inviteName}
              onChange={(e) => setInviteName(e.target.value)}
              placeholder="Jane Doe"
            />
          </div>

          <div>
            <Label htmlFor="inviteEmail">Email Address</Label>
            <Input
              id="inviteEmail"
              className="mt-1.5"
              type="email"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              placeholder="jane@acme.com"
            />
          </div>

          <p className="text-xs text-gray-400">
            We&apos;ll send them a login link to access their portal.
          </p>

          <div className="flex items-center justify-between pt-4">
            <Button variant="outline" onClick={() => setStep(1)}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
            <div className="flex gap-2">
              <Button
                variant="ghost"
                onClick={() => handleSubmit(true)}
                disabled={submitting}
              >
                {submitting ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <SkipForward className="mr-2 h-4 w-4" />
                )}
                Skip for now
              </Button>
              <Button
                onClick={() => handleSubmit(false)}
                disabled={
                  submitting || !inviteEmail.trim() || !inviteName.trim()
                }
              >
                {submitting ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Send className="mr-2 h-4 w-4" />
                )}
                Send Invite
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
