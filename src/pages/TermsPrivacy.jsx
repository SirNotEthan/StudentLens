import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/InfoPage.css';

const TermsPrivacy = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('terms');

  return (
    <div className="info-page terms-privacy-page">
      <div className="info-header">
        <button onClick={() => navigate('/main')} className="back-button">
          ← Back to Main
        </button>
        <h1>Legal Information</h1>
      </div>

      <div className="tabs">
        <button
          className={`tab ${activeTab === 'terms' ? 'active' : ''}`}
          onClick={() => setActiveTab('terms')}
        >
          Terms of Service
        </button>
        <button
          className={`tab ${activeTab === 'privacy' ? 'active' : ''}`}
          onClick={() => setActiveTab('privacy')}
        >
          Privacy Policy
        </button>
      </div>

      <div className="info-content legal-content">
        {activeTab === 'terms' ? (
          <>
            <section className="info-section">
              <p className="last-updated">Last Updated: {new Date().toLocaleDateString()}</p>
              <h2>1. Acceptance of Terms</h2>
              <p>
                By accessing and using Student Lens, you accept and agree to be bound by the terms
                and provision of this agreement. If you do not agree to abide by the above, please
                do not use this service.
              </p>
            </section>

            <section className="info-section">
              <h2>2. Use License</h2>
              <p>
                Permission is granted to temporarily access Student Lens for personal,
                non-commercial use only. This is the grant of a license, not a transfer of title,
                and under this license you may not:
              </p>
              <ul>
                <li>Modify or copy the materials</li>
                <li>Use the materials for any commercial purpose or for any public display</li>
                <li>Attempt to reverse engineer any software contained on Student Lens</li>
                <li>Remove any copyright or other proprietary notations from the materials</li>
                <li>Transfer the materials to another person or "mirror" the materials on any other server</li>
              </ul>
            </section>

            <section className="info-section">
              <h2>3. User Content</h2>
              <p>
                By posting content on Student Lens, you grant us a non-exclusive, worldwide,
                royalty-free license to use, reproduce, modify, and display your content in
                connection with the service. You represent and warrant that:
              </p>
              <ul>
                <li>You own or have the necessary rights to post the content</li>
                <li>Your content does not violate any third-party rights</li>
                <li>Your content complies with our community guidelines</li>
              </ul>
            </section>

            <section className="info-section">
              <h2>4. User Conduct</h2>
              <p>You agree not to:</p>
              <ul>
                <li>Post content that is illegal, harmful, threatening, abusive, harassing, or offensive</li>
                <li>Impersonate any person or entity</li>
                <li>Interfere with or disrupt the service or servers</li>
                <li>Violate any applicable local, state, national, or international law</li>
                <li>Harass, abuse, or harm another person</li>
              </ul>
            </section>

            <section className="info-section">
              <h2>5. Account Termination</h2>
              <p>
                We reserve the right to terminate or suspend your account and access to the service
                immediately, without prior notice or liability, for any reason whatsoever, including
                without limitation if you breach the Terms.
              </p>
            </section>

            <section className="info-section">
              <h2>6. Disclaimer</h2>
              <p>
                The materials on Student Lens are provided on an 'as is' basis. Student Lens makes
                no warranties, expressed or implied, and hereby disclaims and negates all other
                warranties including, without limitation, implied warranties or conditions of
                merchantability, fitness for a particular purpose, or non-infringement of
                intellectual property or other violation of rights.
              </p>
            </section>

            <section className="info-section">
              <h2>7. Limitations</h2>
              <p>
                In no event shall Student Lens or its suppliers be liable for any damages (including,
                without limitation, damages for loss of data or profit, or due to business
                interruption) arising out of the use or inability to use Student Lens.
              </p>
            </section>

            <section className="info-section">
              <h2>8. Changes to Terms</h2>
              <p>
                We reserve the right to modify these terms at any time. We will notify users of any
                material changes. Your continued use of the service after such modifications
                constitutes your acceptance of the new terms.
              </p>
            </section>
          </>
        ) : (
          <>
            <section className="info-section">
              <p className="last-updated">Last Updated: {new Date().toLocaleDateString()}</p>
              <h2>1. Information We Collect</h2>
              <p>We collect information that you provide directly to us, including:</p>
              <ul>
                <li>Account information (name, email address, username)</li>
                <li>Profile information (bio, profile picture)</li>
                <li>Content you post (articles, comments, likes)</li>
                <li>Communications with us</li>
              </ul>
              <p>We also automatically collect certain information about your device when you use our service:</p>
              <ul>
                <li>Log information (IP address, browser type, pages viewed)</li>
                <li>Device information (device type, operating system)</li>
                <li>Usage information (features used, interactions with content)</li>
              </ul>
            </section>

            <section className="info-section">
              <h2>2. How We Use Your Information</h2>
              <p>We use the information we collect to:</p>
              <ul>
                <li>Provide, maintain, and improve our services</li>
                <li>Create and maintain your account</li>
                <li>Personalize your experience</li>
                <li>Communicate with you about the service</li>
                <li>Monitor and analyze trends and usage</li>
                <li>Detect, prevent, and address technical issues and abuse</li>
                <li>Comply with legal obligations</li>
              </ul>
            </section>

            <section className="info-section">
              <h2>3. Information Sharing</h2>
              <p>
                We do not sell your personal information. We may share your information in the
                following circumstances:
              </p>
              <ul>
                <li>With your consent</li>
                <li>With service providers who help us operate the platform</li>
                <li>To comply with legal obligations</li>
                <li>To protect our rights and prevent fraud</li>
                <li>In connection with a business transfer or merger</li>
              </ul>
              <p>
                Your posted content (articles, comments) is publicly visible to other users of the
                platform.
              </p>
            </section>

            <section className="info-section">
              <h2>4. Data Security</h2>
              <p>
                We implement appropriate technical and organizational measures to protect your
                personal information. However, no method of transmission over the Internet or
                electronic storage is 100% secure, and we cannot guarantee absolute security.
              </p>
            </section>

            <section className="info-section">
              <h2>5. Your Rights and Choices</h2>
              <p>You have the right to:</p>
              <ul>
                <li>Access and update your account information</li>
                <li>Delete your account</li>
                <li>Opt out of certain communications</li>
                <li>Request a copy of your data</li>
                <li>Request deletion of your personal information</li>
              </ul>
              <p>To exercise these rights, please contact us at privacy@studentlens.com</p>
            </section>

            <section className="info-section">
              <h2>6. Cookies and Tracking</h2>
              <p>
                We use cookies and similar tracking technologies to collect information about your
                browsing activities. You can control cookies through your browser settings.
              </p>
            </section>

            <section className="info-section">
              <h2>7. Children's Privacy</h2>
              <p>
                Student Lens is designed for students of all ages. If you are under 13, you must
                have parental consent to use the service. We do not knowingly collect personal
                information from children under 13 without parental consent.
              </p>
            </section>

            <section className="info-section">
              <h2>8. Changes to Privacy Policy</h2>
              <p>
                We may update this privacy policy from time to time. We will notify you of any
                material changes by posting the new policy on this page and updating the "Last
                Updated" date.
              </p>
            </section>

            <section className="info-section">
              <h2>9. Contact Us</h2>
              <p>
                If you have any questions about this Privacy Policy, please contact us at:
                <br />
                Email: privacy@studentlens.com
                <br />
                Location: DOC 21
              </p>
            </section>
          </>
        )}
      </div>
    </div>
  );
};

export default TermsPrivacy;
