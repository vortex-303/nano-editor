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
              By accessing and using our image editing and workflow platform, you agree to be bound by these Terms of Service and all applicable laws and regulations. If you do not agree with any of these terms, you are prohibited from using this service.
            </p>
            <p className="text-sm text-muted-foreground italic">
              Note: This is a generic terms of service template. Please consult with a legal professional to ensure compliance with applicable laws in your jurisdiction.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">2. Service Description</h2>
            <p className="text-foreground/90 mb-4">
              Our platform provides:
            </p>
            <ul className="list-disc pl-6 mb-4 text-foreground/90">
              <li>Image editing and manipulation tools</li>
              <li>Node-based workflow creation and management</li>
              <li>AI-powered image processing capabilities</li>
              <li>Project saving and loading functionality</li>
              <li>Credit-based usage system</li>
              <li>Multiple subscription tiers (Free, Pro, Enterprise)</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">3. User Accounts</h2>
            
            <h3 className="text-xl font-semibold mb-3">3.1 Account Creation</h3>
            <p className="text-foreground/90 mb-4">
              To use our service, you must create an account with a valid email address and password. You are responsible for maintaining the confidentiality of your account credentials and for all activities that occur under your account.
            </p>

            <h3 className="text-xl font-semibold mb-3">3.2 Account Responsibilities</h3>
            <p className="text-foreground/90 mb-4">You agree to:</p>
            <ul className="list-disc pl-6 mb-4 text-foreground/90">
              <li>Provide accurate and complete information</li>
              <li>Maintain the security of your password</li>
              <li>Notify us immediately of any unauthorized use</li>
              <li>Be responsible for all activities under your account</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">4. Credits and Subscription Tiers</h2>
            
            <h3 className="text-xl font-semibold mb-3">4.1 Credit System</h3>
            <p className="text-foreground/90 mb-4">
              Our service operates on a credit-based system. Different subscription tiers provide different monthly credit limits:
            </p>
            <ul className="list-disc pl-6 mb-4 text-foreground/90">
              <li><strong>Free Tier:</strong> 20 credits per month</li>
              <li><strong>Pro Tier:</strong> 100 credits per month</li>
              <li><strong>Enterprise Tier:</strong> 1000 credits per month</li>
            </ul>

            <h3 className="text-xl font-semibold mb-3">4.2 Credit Usage</h3>
            <p className="text-foreground/90 mb-4">
              Credits are consumed when you use AI-powered features, image processing operations, and other resource-intensive operations. Credits reset monthly based on your subscription tier.
            </p>

            <h3 className="text-xl font-semibold mb-3">4.3 Subscription Changes</h3>
            <p className="text-foreground/90 mb-4">
              Subscription tier changes can only be made by administrators. Changes to your subscription tier will take effect immediately and your credit limit will be updated accordingly.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">5. Acceptable Use Policy</h2>
            <p className="text-foreground/90 mb-4">You agree NOT to use the service to:</p>
            <ul className="list-disc pl-6 mb-4 text-foreground/90">
              <li>Upload or process illegal, harmful, or offensive content</li>
              <li>Violate any intellectual property rights</li>
              <li>Harass, abuse, or harm others</li>
              <li>Distribute malware or engage in hacking activities</li>
              <li>Interfere with or disrupt the service</li>
              <li>Attempt to circumvent usage limits or security measures</li>
              <li>Use the service for any automated or bulk processing without authorization</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">6. Intellectual Property Rights</h2>
            
            <h3 className="text-xl font-semibold mb-3">6.1 Your Content</h3>
            <p className="text-foreground/90 mb-4">
              You retain all ownership rights to the images and content you upload to our service. By uploading content, you grant us a limited license to store, process, and display your content solely for the purpose of providing our service to you.
            </p>

            <h3 className="text-xl font-semibold mb-3">6.2 Platform Rights</h3>
            <p className="text-foreground/90 mb-4">
              The service itself, including all software, designs, text, graphics, and other materials, is owned by us or our licensors and is protected by copyright, trademark, and other intellectual property laws.
            </p>

            <h3 className="text-xl font-semibold mb-3">6.3 AI-Generated Content</h3>
            <p className="text-foreground/90 mb-4">
              For content generated using our AI features, you are granted ownership rights subject to applicable AI model licenses. You are responsible for ensuring your use of AI-generated content complies with applicable laws and regulations.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">7. Service Availability</h2>
            <p className="text-foreground/90 mb-4">
              We strive to maintain high service availability, but we do not guarantee uninterrupted access. The service may be subject to:
            </p>
            <ul className="list-disc pl-6 mb-4 text-foreground/90">
              <li>Scheduled maintenance and updates</li>
              <li>Emergency maintenance and repairs</li>
              <li>Service disruptions beyond our control</li>
              <li>Rate limiting and resource constraints</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">8. Limitation of Liability</h2>
            <p className="text-foreground/90 mb-4">
              TO THE MAXIMUM EXTENT PERMITTED BY LAW, WE SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, OR ANY LOSS OF PROFITS OR REVENUES, WHETHER INCURRED DIRECTLY OR INDIRECTLY, OR ANY LOSS OF DATA, USE, GOODWILL, OR OTHER INTANGIBLE LOSSES.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">9. Disclaimers</h2>
            <p className="text-foreground/90 mb-4">
              THE SERVICE IS PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTIES OF ANY KIND, EITHER EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, OR NON-INFRINGEMENT.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">10. Termination</h2>
            
            <h3 className="text-xl font-semibold mb-3">10.1 By You</h3>
            <p className="text-foreground/90 mb-4">
              You may terminate your account at any time by contacting us or using the account deletion feature. Upon termination, your right to use the service will immediately cease.
            </p>

            <h3 className="text-xl font-semibold mb-3">10.2 By Us</h3>
            <p className="text-foreground/90 mb-4">
              We may terminate or suspend your account immediately, without prior notice, if you breach these Terms or engage in conduct that we deem inappropriate or harmful to the service or other users.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">11. Data Export and Deletion</h2>
            <p className="text-foreground/90 mb-4">
              You may request an export of your data or deletion of your account at any time. Upon account deletion, we will remove your personal information and uploaded content according to our data retention policies, except where retention is required by law.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">12. Changes to Terms</h2>
            <p className="text-foreground/90 mb-4">
              We reserve the right to modify these Terms at any time. We will notify users of any material changes by posting the new Terms on this page and updating the "Last updated" date. Your continued use of the service after such changes constitutes acceptance of the new Terms.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">13. Governing Law</h2>
            <p className="text-foreground/90 mb-4">
              These Terms shall be governed by and construed in accordance with applicable laws, without regard to conflict of law provisions.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">14. Contact Information</h2>
            <p className="text-foreground/90 mb-4">
              If you have any questions about these Terms, please contact us through our support channels.
            </p>
          </section>

          <div className="mt-12 pt-6 border-t border-border text-center">
            <Link to="/privacy" className="text-primary hover:underline">
              View Privacy Policy
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Terms;
