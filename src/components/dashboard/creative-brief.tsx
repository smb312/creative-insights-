"use client";

import { useState } from "react";
import { Copy, Download, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface CreativeBriefProps {
  brief: string;
  brandName: string;
}

export function CreativeBrief({ brief, brandName }: CreativeBriefProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(brief);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([brief], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `creative-brief-${brandName.toLowerCase().replace(/\s+/g, "-")}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <Card className="border-blue-200">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">
            AI Creative Brief
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleCopy}>
              {copied ? (
                <Check className="mr-1.5 h-3.5 w-3.5 text-green-600" />
              ) : (
                <Copy className="mr-1.5 h-3.5 w-3.5" />
              )}
              {copied ? "Copied" : "Copy"}
            </Button>
            <Button variant="outline" size="sm" onClick={handleDownload}>
              <Download className="mr-1.5 h-3.5 w-3.5" />
              Download
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="prose prose-sm max-w-none">
          {brief.split("\n").map((line, i) => {
            // Bold headers (lines starting with **)
            if (line.startsWith("**") && line.endsWith("**")) {
              return (
                <h3
                  key={i}
                  className="text-sm font-bold text-gray-900 mt-4 mb-2 first:mt-0"
                >
                  {line.replace(/\*\*/g, "")}
                </h3>
              );
            }
            // Bullet points
            if (line.startsWith("- ") || line.startsWith("• ")) {
              return (
                <p key={i} className="text-sm text-gray-700 ml-4 mb-1">
                  &bull; {line.slice(2)}
                </p>
              );
            }
            // Empty lines
            if (line.trim() === "") {
              return <div key={i} className="h-2" />;
            }
            // Regular text
            return (
              <p key={i} className="text-sm text-gray-700 mb-1">
                {line}
              </p>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
