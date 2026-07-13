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
            <h2 className="text-2xl font-semibold mb-4">1. Introduction</h2>
            <p className="text-foreground/90 mb-4">
              Welcome to our image editing and workflow platform. We are committed to protecting your privacy and ensuring the security of your personal information. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our service.
            </p>
            <p className="text-sm text-muted-foreground italic">
              Note: This is a generic privacy policy template. Please consult with a legal professional to ensure compliance with applicable laws in your jurisdiction.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">2. Information We Collect</h2>
            
            <h3 className="text-xl font-semibold mb-3">2.1 Account Information</h3>
            <p className="text-foreground/90 mb-4">
              When you create an account, we collect:
            </p>
            <ul className="list-disc pl-6 mb-4 text-foreground/90">
              <li>Email address</li>
              <li>Password (encrypted)</li>
              <li>Account creation date</li>
              <li>User role and subscription tier</li>
            </ul>

            <h3 className="text-xl font-semibold mb-3">2.2 Usage Data</h3>
            <p className="text-foreground/90 mb-4">
              We automatically collect certain information about your device and how you interact with our service:
            </p>
            <ul className="list-disc pl-6 mb-4 text-foreground/90">
              <li>IP address and browser type</li>
              <li>Pages visited and features used</li>
              <li>Credits usage and subscription information</li>
              <li>Date and time of access</li>
            </ul>

            <h3 className="text-xl font-semibold mb-3">2.3 User Content</h3>
            <p className="text-foreground/90 mb-4">
              We store the images and files you upload to our platform, along with:
            </p>
            <ul className="list-disc pl-6 mb-4 text-foreground/90">
              <li>Image metadata and processing history</li>
              <li>Workflow configurations and node data</li>
              <li>Project files and settings</li>
              <li>Image editing parameters and prompts</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">3. How We Use Your Information</h2>
            <p className="text-foreground/90 mb-4">We use the collected information to:</p>
            <ul className="list-disc pl-6 mb-4 text-foreground/90">
              <li>Provide, operate, and maintain our service</li>
              <li>Process your image editing requests and workflows</li>
              <li>Manage your account and subscription tier</li>
              <li>Track and manage your credits usage</li>
              <li>Send password reset emails and account notifications</li>
              <li>Improve our service and develop new features</li>
              <li>Detect and prevent fraud and abuse</li>
              <li>Comply with legal obligations</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">4. Data Storage and Security</h2>
            <p className="text-foreground/90 mb-4">
              Your data is stored securely using Supabase infrastructure with industry-standard encryption. We implement appropriate technical and organizational measures to protect your personal information against unauthorized access, alteration, disclosure, or destruction.
            </p>
            <p className="text-foreground/90 mb-4">
              However, no method of transmission over the Internet or electronic storage is 100% secure. While we strive to use commercially acceptable means to protect your information, we cannot guarantee its absolute security.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">5. Third-Party Services</h2>
            <p className="text-foreground/90 mb-4">
              Our service uses third-party services for:
            </p>
            <ul className="list-disc pl-6 mb-4 text-foreground/90">
              <li>Authentication and user management (Supabase Auth)</li>
              <li>Database and file storage (Supabase)</li>
              <li>Image processing and AI features</li>
              <li>Payment processing (for subscription tiers)</li>
            </ul>
            <p className="text-foreground/90 mb-4">
              These third parties have their own privacy policies addressing how they use your information.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">6. Your Rights</h2>
            <p className="text-foreground/90 mb-4">You have the right to:</p>
            <ul className="list-disc pl-6 mb-4 text-foreground/90">
              <li>Access the personal information we hold about you</li>
              <li>Request correction of inaccurate information</li>
              <li>Request deletion of your account and associated data</li>
              <li>Export your data in a portable format</li>
              <li>Opt-out of marketing communications</li>
              <li>Object to processing of your personal information</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">7. Data Retention</h2>
            <p className="text-foreground/90 mb-4">
              We retain your personal information for as long as your account is active or as needed to provide you services. If you wish to delete your account, we will delete or anonymize your personal information unless we are required to retain it for legal purposes.
            </p>
            <p className="text-foreground/90 mb-4">
              Uploaded images and project data are retained based on your subscription tier and storage limits.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">8. Cookies and Tracking</h2>
            <p className="text-foreground/90 mb-4">
              We use cookies and similar tracking technologies to track activity on our service and store certain information. You can instruct your browser to refuse all cookies or to indicate when a cookie is being sent.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">9. Children's Privacy</h2>
            <p className="text-foreground/90 mb-4">
              Our service is not intended for children under 13 years of age. We do not knowingly collect personal information from children under 13. If you become aware that a child has provided us with personal information, please contact us.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">10. Changes to This Privacy Policy</h2>
            <p className="text-foreground/90 mb-4">
              We may update our Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy on this page and updating the "Last updated" date.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">11. Contact Us</h2>
            <p className="text-foreground/90 mb-4">
              If you have any questions about this Privacy Policy, please contact us through our support channels.
            </p>
          </section>

          <div className="mt-12 pt-6 border-t border-border text-center">
            <Link to="/terms" className="text-primary hover:underline">
              View Terms of Service
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Privacy;
