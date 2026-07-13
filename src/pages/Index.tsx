import { Header } from "@/components/Header";
import { NodeEditor } from "@/components/NodeEditor";

const Index = () => {
  return (
    <div className="min-h-screen bg-cover bg-center bg-no-repeat" style={{ backgroundImage: 'url(/lovable-uploads/0b69fbd7-2be5-47fa-b650-2f26bfe40d27.png)' }}>
      <Header />
      <main className="container mx-auto px-6 py-8">
        <div className="max-w-6xl mx-auto">
          <NodeEditor />
        </div>
      </main>
      
      <footer className="container mx-auto px-6 pb-4">
        <div className="max-w-6xl mx-auto text-center space-y-2">
          <div className="flex items-center justify-center gap-4 text-sm text-muted-foreground">
            <a 
              href="/about"
              className="hover:text-foreground transition-colors"
            >
              About Nano Editor
            </a>
            <span>•</span>
            <a 
              href="/privacy"
              className="hover:text-foreground transition-colors"
            >
              Privacy Policy
            </a>
            <span>•</span>
            <a 
              href="/terms"
              className="hover:text-foreground transition-colors"
            >
              Terms of Service
            </a>
          </div>
          <a 
            href="https://nodetools.org/" 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-sm text-muted-foreground hover:text-foreground transition-colors inline-block"
          >
            Made by Nodetools.org
          </a>
        </div>
      </footer>
    </div>
  );
};

export default Index;
