import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

const Terms = () => {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-6 py-8 max-w-4xl">
        <Link to="/">
          <Button variant="ghost" className="mb-6">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Home
          </Button>
        </Link>

        <div className="prose prose-slate dark:prose-invert max-w-none">
          <h1 className="text-4xl font-bold mb-2">Terms of Service</h1>
          <p className="text-muted-foreground mb-8">Last updated: {new Date().toLocaleDateString()}</p>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">1. Agreement to Terms</h2>
            <p className="text-foreground/90 mb-4">
              By using Nano Editor, you agree to these Terms of Service and all applicable laws and regulations. If you do not agree with any of these terms, do not use this tool.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">2. Service Description</h2>
            <p className="text-foreground/90 mb-4">
              Nano Editor is a client-side, node-based image workflow editor. It provides:
            </p>
            <ul className="list-disc pl-6 mb-4 text-foreground/90">
              <li>Image editing and manipulation tools that run in your browser</li>
              <li>Node-based workflow creation and management</li>
              <li>AI features powered by fal.ai using your own API key (bring-your-own-key)</li>
              <li>Free local AI features (background removal, upscaling, captioning, segmentation) running on your device</li>
              <li>Project saving in your browser and ZIP export/import</li>
            </ul>
            <p className="text-foreground/90 mb-4">
              There are no accounts, subscriptions or credits. Usage of third-party AI providers is billed directly by those providers under their own terms.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">3. Your Responsibilities</h2>
            <ul className="list-disc pl-6 mb-4 text-foreground/90">
              <li>You are responsible for the API keys you use and for the charges they incur with the respective providers.</li>
              <li>You are responsible for the content you create and for ensuring it complies with applicable laws and the acceptable-use policies of the AI providers you use.</li>
              <li>You are responsible for backing up your data (e.g. via ZIP export) — clearing your browser storage permanently deletes local projects.</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">4. Intellectual Property</h2>
            <p className="text-foreground/90 mb-4">
              You retain all rights to the content you create with Nano Editor, subject to the terms of the AI providers used to generate it.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">5. Disclaimer</h2>
            <p className="text-foreground/90 mb-4">
              This tool is provided "as is", without warranty of any kind. In no event shall the authors be liable for any claim, damages or other liability arising from the use of the tool, including charges incurred with third-party AI providers or loss of locally stored data.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
};

export default Terms;
