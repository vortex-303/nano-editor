import { Link } from "react-router-dom";
import { ArrowLeft, Layers, Wand2, ImageIcon, Sparkles, Download, Grid3x3, Palette, Crop, Upload, FileImage, Zap, Box, Code, Share2, Settings2, Maximize2, ShapesIcon, Camera, Target } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useEffect } from "react";

const About = () => {
  useEffect(() => {
    // Add structured data for SEO
    const structuredData = {
      "@context": "https://schema.org",
      "@type": "SoftwareApplication",
      "name": "Nano Editor",
      "applicationCategory": "DesignApplication",
      "operatingSystem": "Web Browser",
      "offers": {
        "@type": "AggregateOffer",
        "lowPrice": "0",
        "priceCurrency": "USD",
        "offerCount": "3"
      },
      "description": "Visual node-based image processing platform with 22+ specialized nodes for AI editing, batch processing, vectorization, and more",
      "featureList": [
        "22+ Visual Processing Nodes",
        "AI-Powered Image Editing",
        "Batch Image Processing",
        "Vectorization & Pixel Art",
        "Cloud Project Storage",
        "Non-destructive Timeline"
      ]
    };

    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.text = JSON.stringify(structuredData);
    document.head.appendChild(script);

    return () => {
      document.head.removeChild(script);
    };
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="container mx-auto px-6 py-4">
          <Link to="/">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Editor
            </Button>
          </Link>
        </div>
      </header>

      <main className="container mx-auto px-6 py-12 max-w-5xl">
        {/* Hero Section */}
        <section className="text-center mb-16">
          <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
            About Nano Editor: Visual Node-Based Image Workflows
          </h1>
          <p className="text-xl text-muted-foreground mb-8 max-w-3xl mx-auto">
            Transform your image processing with an intuitive drag-and-drop node system powered by AI. No code required, infinite possibilities.
          </p>
          <Link to="/">
            <Button size="lg" className="gap-2">
              <Sparkles className="h-5 w-5" />
              Start Creating
            </Button>
          </Link>
        </section>

        {/* What is Nano Editor */}
        <section className="mb-16">
          <h2 className="text-3xl font-bold mb-6">What is Nano Editor?</h2>
          <div className="prose prose-slate dark:prose-invert max-w-none">
            <p className="text-lg text-muted-foreground leading-relaxed">
              Nano Editor is a revolutionary visual node-based platform for image processing where you connect nodes to create custom workflows. See your workflow in real-time as you build, combine AI-powered processing with traditional editing, and save your projects to the cloud. With 22+ specialized nodes, non-destructive timeline editing, and batch processing capabilities, Nano Editor makes complex image workflows accessible to everyone.
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8">
            <Card className="text-center">
              <CardContent className="pt-6">
                <Layers className="h-8 w-8 mx-auto mb-2 text-primary" />
                <p className="font-semibold">22+ Nodes</p>
              </CardContent>
            </Card>
            <Card className="text-center">
              <CardContent className="pt-6">
                <Sparkles className="h-8 w-8 mx-auto mb-2 text-primary" />
                <p className="font-semibold">AI-Powered</p>
              </CardContent>
            </Card>
            <Card className="text-center">
              <CardContent className="pt-6">
                <Zap className="h-8 w-8 mx-auto mb-2 text-primary" />
                <p className="font-semibold">Non-Destructive</p>
              </CardContent>
            </Card>
            <Card className="text-center">
              <CardContent className="pt-6">
                <Upload className="h-8 w-8 mx-auto mb-2 text-primary" />
                <p className="font-semibold">Cloud Saving</p>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Node Categories */}
        <section className="mb-16">
          <h2 className="text-3xl font-bold mb-8">22+ Specialized Nodes</h2>
          
          {/* Input Nodes */}
          <div className="mb-10">
            <div className="flex items-center gap-3 mb-4">
              <Upload className="h-6 w-6 text-primary" />
              <h3 className="text-2xl font-semibold">Input Nodes (7)</h3>
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <FileImage className="h-5 w-5" />
                    Image Input Node
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription>Upload images via file, URL, or clipboard paste</CardDescription>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Grid3x3 className="h-5 w-5" />
                    Batch Image Input Node
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription>Process multiple images simultaneously in one workflow</CardDescription>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Palette className="h-5 w-5" />
                    Draw Node
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription>Create custom drawings and sketches from scratch</CardDescription>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Grid3x3 className="h-5 w-5" />
                    Pixel Art Node
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription>Generate pixel art with customizable grid sizes and palettes</CardDescription>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Sparkles className="h-5 w-5" />
                    Prompt Node
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription>Text-based AI image generation from natural language</CardDescription>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <FileImage className="h-5 w-5" />
                    Context Node
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription>Add contextual information from text or URL content</CardDescription>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Settings2 className="h-5 w-5" />
                    Image Props Node
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription>Manage and display image properties and metadata</CardDescription>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Processing Nodes */}
          <div className="mb-10">
            <div className="flex items-center gap-3 mb-4">
              <Wand2 className="h-6 w-6 text-primary" />
              <h3 className="text-2xl font-semibold">Processing Nodes (13)</h3>
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Sparkles className="h-5 w-5" />
                    AI Edit Node
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription>AI-powered image editing with natural language prompts</CardDescription>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Crop className="h-5 w-5" />
                    Crop Node
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription>Precise image cropping with visual editor and presets</CardDescription>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Target className="h-5 w-5" />
                    Edit/Mark Node
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription>Annotate and mark images with drawings and text</CardDescription>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Palette className="h-5 w-5" />
                    Effects Node
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription>Apply visual effects, filters, and color adjustments</CardDescription>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Grid3x3 className="h-5 w-5" />
                    Halftone Effect Node
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription>Create halftone and dot pattern effects for vintage looks</CardDescription>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Grid3x3 className="h-5 w-5" />
                    Pixelate Node
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription>Apply customizable pixelation effects to images</CardDescription>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <ShapesIcon className="h-5 w-5" />
                    Vectorize Node
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription>Convert raster images to scalable SVG vectors</CardDescription>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Maximize2 className="h-5 w-5" />
                    Upscale Node
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription>AI-powered image upscaling for enhanced resolution</CardDescription>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Sparkles className="h-5 w-5" />
                    Variation Node
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription>Generate AI-powered variations and alternatives</CardDescription>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Box className="h-5 w-5" />
                    3D Model Node
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription>Position and integrate 3D models into your workflow</CardDescription>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Code className="h-5 w-5" />
                    HTML Frame Node
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription>Generate HTML/CSS components from design mockups</CardDescription>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Share2 className="h-5 w-5" />
                    Social Media Post Node
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription>Format and optimize images for social media platforms</CardDescription>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Settings2 className="h-5 w-5" />
                    Utility Node
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription>Additional processing utilities and helper functions</CardDescription>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Output Nodes */}
          <div>
            <div className="flex items-center gap-3 mb-4">
              <Download className="h-6 w-6 text-primary" />
              <h3 className="text-2xl font-semibold">Output Nodes (2)</h3>
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <ImageIcon className="h-5 w-5" />
                    Image Output Node
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription>Export and download processed images in multiple formats</CardDescription>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Grid3x3 className="h-5 w-5" />
                    Variants Output Node
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription>Display and manage multiple image variants and batch export</CardDescription>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* How It Works */}
        <section className="mb-16">
          <h2 className="text-3xl font-bold mb-6">How It Works</h2>
          <div className="grid md:grid-cols-4 gap-6">
            <Card>
              <CardHeader>
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-2">
                  <Upload className="h-6 w-6 text-primary" />
                </div>
                <CardTitle>1. Add Input Nodes</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>Start with your source material - upload images, draw, or generate with AI</CardDescription>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-2">
                  <Layers className="h-6 w-6 text-primary" />
                </div>
                <CardTitle>2. Connect Processing</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>Chain multiple effects, transformations, and AI operations</CardDescription>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-2">
                  <Sparkles className="h-6 w-6 text-primary" />
                </div>
                <CardTitle>3. Enhance with AI</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>Add AI editing, prompts, and contextual data to your workflow</CardDescription>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-2">
                  <Download className="h-6 w-6 text-primary" />
                </div>
                <CardTitle>4. Export Results</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>Download final images or multiple variants in your preferred format</CardDescription>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* AI-Powered Features */}
        <section className="mb-16">
          <h2 className="text-3xl font-bold mb-6">AI-Powered Features</h2>
          <div className="grid md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-primary" />
                  Natural Language Editing
                </CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>Describe changes in plain English - "make the sky more dramatic" or "add a sunset glow"</CardDescription>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Maximize2 className="h-5 w-5 text-primary" />
                  Image Upscaling
                </CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>Real-ESRGAN powered enhancement for superior image quality and resolution</CardDescription>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Camera className="h-5 w-5 text-primary" />
                  AI Variations
                </CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>Generate creative alternatives and explore different artistic directions</CardDescription>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Code className="h-5 w-5 text-primary" />
                  HTML Component Generation
                </CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>Convert designs and mockups to production-ready HTML/CSS code</CardDescription>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Use Cases */}
        <section className="mb-16">
          <h2 className="text-3xl font-bold mb-6">Who Benefits from Nano Editor?</h2>
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Content Creators</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>Batch process social media images, create consistent branding, and automate repetitive editing tasks</CardDescription>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Designers</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>Build complex visual workflows with pixel art, vectorization, effects, and non-destructive editing</CardDescription>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Developers</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>Generate HTML/CSS components from mockups and automate design-to-code workflows</CardDescription>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Digital Artists</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>Experiment with AI-powered variations, transformations, and creative effects</CardDescription>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Marketing Teams</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>Standardize image processing pipelines and maintain brand consistency at scale</CardDescription>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Key Features */}
        <section className="mb-16">
          <h2 className="text-3xl font-bold mb-6">Key Features</h2>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="flex items-start gap-3">
              <div className="mt-1 text-primary">✓</div>
              <div>
                <p className="font-semibold">Visual Node Canvas</p>
                <p className="text-sm text-muted-foreground">Drag-and-drop interface with real-time connections</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="mt-1 text-primary">✓</div>
              <div>
                <p className="font-semibold">22+ Specialized Nodes</p>
                <p className="text-sm text-muted-foreground">Comprehensive toolkit for any image task</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="mt-1 text-primary">✓</div>
              <div>
                <p className="font-semibold">Bring Your Own Key</p>
                <p className="text-sm text-muted-foreground">Pay fal.ai directly — no accounts, no markup, plus free local AI</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="mt-1 text-primary">✓</div>
              <div>
                <p className="font-semibold">Local Projects</p>
                <p className="text-sm text-muted-foreground">Everything saved in your browser, with ZIP export/import</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="mt-1 text-primary">✓</div>
              <div>
                <p className="font-semibold">Timeline & History</p>
                <p className="text-sm text-muted-foreground">Non-destructive editing with full undo/redo</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="mt-1 text-primary">✓</div>
              <div>
                <p className="font-semibold">Batch Processing</p>
                <p className="text-sm text-muted-foreground">Handle multiple images in one workflow</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="mt-1 text-primary">✓</div>
              <div>
                <p className="font-semibold">Multiple Export Formats</p>
                <p className="text-sm text-muted-foreground">PNG, JPG, SVG, and more</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="mt-1 text-primary">✓</div>
              <div>
                <p className="font-semibold">Real-Time Preview</p>
                <p className="text-sm text-muted-foreground">See results instantly as you build</p>
              </div>
            </div>
          </div>
        </section>

        {/* Get Started */}
        <section className="text-center py-12 bg-muted/30 rounded-lg">
          <h2 className="text-3xl font-bold mb-4">Ready to Transform Your Image Workflow?</h2>
          <p className="text-muted-foreground mb-8 max-w-2xl mx-auto">
            Join thousands of creators, designers, and developers who are building powerful image workflows with Nano Editor's visual node system.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/">
              <Button size="lg" className="gap-2">
                <Layers className="h-5 w-5" />
                Open Node Editor
              </Button>
            </Link>
            <Link to="/terms">
              <Button variant="outline" size="lg">
                View Terms of Service
              </Button>
            </Link>
          </div>
        </section>

        {/* Footer Links */}
        <footer className="mt-12 pt-8 border-t text-center text-sm text-muted-foreground">
          <div className="flex items-center justify-center gap-4">
            <Link to="/privacy" className="hover:text-foreground transition-colors">
              Privacy Policy
            </Link>
            <span>•</span>
            <Link to="/terms" className="hover:text-foreground transition-colors">
              Terms of Service
            </Link>
          </div>
        </footer>
      </main>
    </div>
  );
};

export default About;
