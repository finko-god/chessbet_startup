'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function TermsPage() {
  return (
    <div className="container mx-auto p-4">
      <div className="max-w-3xl mx-auto space-y-6">
        <Card className="bg-card">
          <CardHeader>
            <CardTitle className="text-2xl font-bold text-foreground">Terms and Conditions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <section>
              <h2 className="text-xl font-semibold mb-4">1. Account Registration and Verification</h2>
              <div className="space-y-4">
                <p>By creating an account on ChessBet, you agree to:</p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>Provide accurate and complete information during registration</li>
                  <li>Complete the KYC (Know Your Customer) verification process</li>
                  <li>Maintain the security of your account credentials</li>
                  <li>Notify us immediately of any unauthorized access to your account</li>
                </ul>
              </div>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-4">2. Fair Play and Anti-Cheating</h2>
              <div className="space-y-4">
                <p>ChessBet maintains a strict policy against cheating and unfair play:</p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>Use of chess engines or external assistance is strictly prohibited</li>
                  <li>Collusion between players is not allowed</li>
                  <li>Any form of cheating will result in immediate account suspension</li>
                  <li>We reserve the right to investigate suspicious activity</li>
                </ul>
              </div>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-4">3. Financial Terms</h2>
              <div className="space-y-4">
                <p>Our financial policies include:</p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>A fixed commission fee of 2 EUR is charged on all payouts</li>
                  <li>Payouts are processed by the platform within 24 hours</li>
                  <li>Funds may take a few days to reach your bank account</li>
                  <li>New accounts must wait 7 days after their first game before making payouts</li>
                  <li>All transactions are subject to verification and anti-fraud checks</li>
                </ul>
              </div>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-4">4. User Conduct</h2>
              <div className="space-y-4">
                <p>Users must maintain appropriate conduct:</p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>Respect other players and maintain sportsmanship</li>
                  <li>No harassment, abuse, or inappropriate behavior</li>
                  <li>No spamming or disruptive behavior in chat</li>
                  <li>No attempts to manipulate the platform or other users</li>
                </ul>
              </div>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-4">5. Privacy and Data Protection</h2>
              <div className="space-y-4">
                <p>We take your privacy seriously:</p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>Your personal information is protected and never shared with third parties</li>
                  <li>KYC information is stored securely and used only for verification</li>
                  <li>We comply with all applicable data protection laws</li>
                  <li>You can request your data or account deletion at any time</li>
                </ul>
              </div>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-4">6. Platform Rules</h2>
              <div className="space-y-4">
                <p>General platform rules:</p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>One account per person is allowed</li>
                  <li>Accounts must be verified with valid identification</li>
                  <li>We reserve the right to modify these terms at any time</li>
                  <li>Users will be notified of any significant changes</li>
                </ul>
              </div>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-4">7. Contact Information</h2>
              <div className="space-y-4">
                <p>For any questions or concerns regarding these terms, please contact our support team.</p>
              </div>
            </section>
          </CardContent>
        </Card>
      </div>
    </div>
  );
} 