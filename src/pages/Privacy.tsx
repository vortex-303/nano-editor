import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

const Privacy = () => {
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
          <h1 className="text-4xl font-bold mb-2">Privacy Policy</h1>
          <p className="text-muted-foreground mb-8">Last updated: {new Date().toLocaleDateString()}</p>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">1. Local-First by Design</h2>
            <p className="text-foreground/90 mb-4">
              Nano Editor runs entirely in your browser. There is no backend server, no account system, and no analytics. We do not collect, store, or transmit any personal information.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">2. Where Your Data Lives</h2>
            <ul className="list-disc pl-6 mb-4 text-foreground/90">
              <li>Projects, workflows and prompt snippets are stored in your browser's IndexedDB.</li>
              <li>API keys are stored in your browser's localStorage and sent only to the provider they belong to.</li>
              <li>Local AI models (background removal, upscaling, captioning) are downloaded once and cached by your browser; images processed by them never leave your device.</li>
              <li>Clearing your browser data removes everything. Use the ZIP export to keep backups.</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">3. Third-Party Services</h2>
            <p className="text-foreground/90 mb-4">
              Some features send data directly from your browser to third parties, only when you use them:
            </p>
            <ul className="list-disc pl-6 mb-4 text-foreground/90">
              <li>AI image generation, editing, upscaling and text features (fal.ai — using your own API key; prompts and input images are sent to fal.ai)</li>
              <li>Stock photo search (Unsplash — optional, using your own key)</li>
              <li>Webpage reading for the URL context feature (r.jina.ai receives the URL you enter)</li>
              <li>Local AI model downloads (huggingface.co CDN)</li>
            </ul>
            <p className="text-foreground/90 mb-4">
              These third parties have their own privacy policies addressing how they use your information.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">4. Your Rights</h2>
            <p className="text-foreground/90 mb-4">
              Since all data is on your device, you are always in full control: export it (ZIP), delete it (clear browser data), or move it to another browser at any time.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
};

export default Privacy;
