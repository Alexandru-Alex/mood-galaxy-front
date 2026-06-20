import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Linking, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { SpaceBackground } from '@/components/space-background';
import { styles } from '@/styles/privacy-policy.styles';

export default function PrivacyPolicyScreen() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <SpaceBackground />

      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <Pressable style={styles.backButton} onPress={() => router.back()}>
            <Text style={styles.backText}>← Back</Text>
          </Pressable>
          <Text style={styles.headerTitle}>Privacy Policy</Text>
        </View>

        <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
          <Text style={styles.pageTitle}>Mood Galaxy</Text>
          <Text style={styles.pageTitle}>Privacy Policy</Text>
          <Text style={styles.lastUpdated}>Last Updated: 20 June 2026</Text>

          {/* 1 */}
          <Text style={styles.sectionTitle}>1. Introduction</Text>
          <Text style={styles.body}>
            Welcome to Mood Galaxy! We are committed to protecting your personal information and your right to privacy. This Privacy Policy explains what information we collect, how we use it, and what rights you have in relation to it when you use our mobile application (iOS and Android) and any related web platform (collectively, the "Services").
          </Text>
          <Text style={styles.body}>
            Mood Galaxy is a mood journal that lets you record how you feel over time and visualizes your entries as constellations in a personal galaxy. Because of this, some of the information you choose to record may relate to your emotional or mental state. We treat this information with particular care — see Section 3.2 and Section 4 below.
          </Text>
          <Text style={styles.body}>
            Please read this policy carefully. If you disagree with its terms, please discontinue use of our Services.
          </Text>

          {/* 2 */}
          <Text style={styles.sectionTitle}>2. Contact Us</Text>
          <Text style={styles.body}>
            If you have questions or concerns about this policy, you may contact us at:
          </Text>
          <Text style={styles.bullet}>
            {'• '}
            <Text style={styles.body}>Email: </Text>
            <Text
              style={styles.emailLink}
              onPress={() => Linking.openURL('mailto:help@getmoneygarden.com')}>
              help@getmoneygarden.com
            </Text>
          </Text>
          <Text style={styles.bullet}>
            {'• '}
            <Text style={styles.body}>Website: </Text>
            <Text
              style={styles.emailLink}
              onPress={() => Linking.openURL('https://www.getmoneygarden.com')}>
              https://www.getmoneygarden.com
            </Text>
          </Text>

          {/* 3 */}
          <Text style={styles.sectionTitle}>3. Information We Collect</Text>

          <Text style={styles.subSectionTitle}>3.1 Account Information You Provide to Us</Text>
          <Text style={styles.bullet}>{'• Name – used to personalize your account experience.'}</Text>
          <Text style={styles.bullet}>{'• Email address – used for account registration, login, support communication, and (with your consent) updates or promotional messages.'}</Text>

          <Text style={styles.subSectionTitle}>3.2 Mood and Journal Content You Provide</Text>
          <Text style={styles.body}>When you use the core features of the app, you may choose to provide:</Text>
          <Text style={styles.bullet}>{'• Mood entries – the moods, ratings, or emotions you log.'}</Text>
          <Text style={styles.bullet}>{'• Journal text and notes – any free-text content you add to an entry.'}</Text>
          <Text style={styles.bullet}>{'• Tags, dates, and timestamps associated with each entry.'}</Text>
          <Text style={styles.bullet}>{'• Use of in-app features such as the Void meditation feature (e.g. that a session took place and its duration).'}</Text>
          <Text style={styles.body}>
            This content is provided entirely at your discretion. Some of it may reveal information about your emotional or mental well-being. Where such content qualifies as data concerning health or another special category of personal data under Article 9 of the GDPR, we process it only on the basis of your explicit consent, which you give by choosing to create and store entries. You can withdraw this consent at any time by deleting your entries or your account (see Sections 9 and 11).
          </Text>

          <Text style={styles.subSectionTitle}>3.3 Information Collected Automatically</Text>
          <Text style={styles.body}>When you use our Services, we automatically collect certain technical data, including:</Text>
          <Text style={styles.bullet}>{'• Usage data – features accessed, screens visited, time spent in the app.'}</Text>
          <Text style={styles.bullet}>{'• Device information – device type, operating system, app version, unique device identifiers.'}</Text>
          <Text style={styles.bullet}>{'• Log data – IP address, browser type (for any web platform), timestamps, and crash reports.'}</Text>

          <Text style={styles.subSectionTitle}>3.4 Information We Do NOT Collect</Text>
          <Text style={styles.body}>
            We do not collect financial or banking information, precise geolocation data, biometric data, contacts, photos, or microphone/camera input. We do not derive clinical or medical diagnoses from your entries, and Mood Galaxy is not a medical device or a substitute for professional mental-health care.
          </Text>

          {/* 4 */}
          <Text style={styles.sectionTitle}>4. How We Use Your Information</Text>
          <Text style={styles.body}>
            We use your personal data only for the purposes described below, each tied to a lawful basis under the GDPR:
          </Text>

          <View style={styles.tableContainer}>
            <View style={styles.tableHeader}>
              <Text style={styles.tableHeaderCell}>Purpose</Text>
              <Text style={styles.tableHeaderCell}>Legal Basis</Text>
            </View>
            {[
              ['Creating and managing your account', 'Performance of a contract'],
              ['Authentication and account security', 'Performance of a contract / Legitimate interest'],
              ['Storing, displaying, and syncing your mood entries and journal content', 'Explicit consent (where the content is special-category data) / Performance of a contract'],
              ['Generating your personal galaxy visualization and statistics from your entries', 'Explicit consent / Performance of a contract'],
              ['Sending transactional emails and in-app notifications', 'Performance of a contract'],
              ['Sending marketing emails and promotional push notifications', 'Consent'],
              ['Improving our Services through aggregated, non-identifying analytics', 'Legitimate interest'],
              ['Customer support', 'Performance of a contract'],
              ['Complying with legal obligations', 'Legal obligation'],
            ].map(([purpose, basis], i, arr) => (
              <View key={i} style={i === arr.length - 1 ? styles.tableRowLast : styles.tableRow}>
                <Text style={styles.tableCell}>{purpose}</Text>
                <Text style={styles.tableCell}>{basis}</Text>
              </View>
            ))}
          </View>

          <Text style={styles.body}>
            We do not use your mood entries or journal content for advertising, profiling for marketing, or training third-party AI models. You may withdraw any consent at any time (see Sections 9 and 10).
          </Text>

          {/* 5 */}
          <Text style={styles.sectionTitle}>5. How We Share Your Information</Text>
          <Text style={styles.body}>
            We do not sell, rent, or share your personal data with advertisers, data brokers, or other third parties for their own purposes.
          </Text>
          <Text style={styles.body}>
            Your data may be processed by service providers acting strictly on our behalf and under contract (for example, cloud hosting and crash-reporting providers) solely to deliver the Services. Beyond that, your data may only be disclosed in the following limited circumstances:
          </Text>
          <Text style={styles.bullet}>{'• Legal requirements – if we are required by law, court order, or governmental authority to disclose your information.'}</Text>
          <Text style={styles.bullet}>{'• Protection of rights – to protect the safety, rights, or property of Mood Galaxy, our users, or the public.'}</Text>

          {/* 6 */}
          <Text style={styles.sectionTitle}>6. Data Retention</Text>
          <Text style={styles.body}>
            We retain your personal data, including your mood entries and journal content, for as long as your account is active or as needed to provide you with the Services. If you delete an entry, it is removed from active systems. If you delete your account, we will delete or anonymize your personal data within 30 days, unless we are required to retain certain data longer by law.
          </Text>

          {/* 7 */}
          <Text style={styles.sectionTitle}>7. Data Security</Text>
          <Text style={styles.body}>
            We implement appropriate technical and organizational measures to protect your personal data against unauthorized access, alteration, disclosure, or destruction. These measures include encrypted data storage, secure HTTPS connections, and access controls. Given the sensitive nature of mood and journal content, access to this data is restricted to what is strictly necessary to operate the Services.
          </Text>
          <Text style={styles.body}>
            However, no method of transmission over the internet or electronic storage is 100% secure. We encourage you to use a strong, unique password for your account.
          </Text>

          {/* 8 */}
          <Text style={styles.sectionTitle}>8. Children's Privacy</Text>
          <Text style={styles.body}>
            Our Services are not directed to individuals under the age of 16. We do not knowingly collect personal data from children. If you believe a child has provided us with personal data, please contact us and we will promptly delete it.
          </Text>

          {/* 9 */}
          <Text style={styles.sectionTitle}>9. Your Rights</Text>

          <Text style={styles.subSectionTitle}>9.1 Rights Under GDPR (European Users)</Text>
          <Text style={styles.body}>
            If you are located in the European Economic Area (EEA), United Kingdom, or Switzerland, you have the following rights:
          </Text>
          <Text style={styles.bullet}>{'• Right of access – request a copy of the personal data we hold about you.'}</Text>
          <Text style={styles.bullet}>{'• Right to rectification – request correction of inaccurate or incomplete data.'}</Text>
          <Text style={styles.bullet}>{'• Right to erasure – request deletion of your personal data ("right to be forgotten").'}</Text>
          <Text style={styles.bullet}>{'• Right to restriction – request that we limit the processing of your data.'}</Text>
          <Text style={styles.bullet}>{'• Right to data portability – receive your data, including your entries, in a structured, machine-readable format.'}</Text>
          <Text style={styles.bullet}>{'• Right to object – object to processing based on legitimate interest or for direct marketing.'}</Text>
          <Text style={styles.bullet}>{'• Right to withdraw consent – withdraw consent at any time for any processing based on consent, including the storage of mood/journal content and marketing emails.'}</Text>
          <Text style={styles.body}>
            To exercise any of these rights, contact us at{' '}
            <Text
              style={styles.emailLink}
              onPress={() => Linking.openURL('mailto:help@getmoneygarden.com')}>
              help@getmoneygarden.com
            </Text>
            . We will respond within 30 days. You also have the right to lodge a complaint with your local data protection authority (in Romania, the ANSPDCP).
          </Text>

          <Text style={styles.subSectionTitle}>9.2 Rights Under CCPA/CPRA (California Users)</Text>
          <Text style={styles.body}>
            If you are a California resident, you have the following rights under the California Consumer Privacy Act, as amended by the California Privacy Rights Act:
          </Text>
          <Text style={styles.bullet}>{'• Right to know – request disclosure of the categories and specific pieces of personal information we have collected about you.'}</Text>
          <Text style={styles.bullet}>{'• Right to delete – request deletion of your personal information, subject to certain exceptions.'}</Text>
          <Text style={styles.bullet}>{'• Right to correct – request correction of inaccurate personal information.'}</Text>
          <Text style={styles.bullet}>{'• Right to opt-out of sale or sharing – we do not sell or share your personal information, so this right does not apply.'}</Text>
          <Text style={styles.bullet}>{'• Right to limit use of sensitive personal information – your mood and journal content may constitute "sensitive personal information"; we use it only to provide the Services you request and not for other purposes.'}</Text>
          <Text style={styles.bullet}>{'• Right to non-discrimination – we will not discriminate against you for exercising any of your rights.'}</Text>
          <Text style={styles.body}>
            To submit a request, contact us at{' '}
            <Text
              style={styles.emailLink}
              onPress={() => Linking.openURL('mailto:help@getmoneygarden.com')}>
              help@getmoneygarden.com
            </Text>
            {' '}or use the account deletion feature in the app.
          </Text>

          {/* 10 */}
          <Text style={styles.sectionTitle}>10. Marketing Communications & Notifications</Text>
          <Text style={styles.body}>We may send you:</Text>
          <Text style={styles.bullet}>{'• Transactional emails – account confirmations, security alerts, and service updates. These cannot be opted out of while your account is active.'}</Text>
          <Text style={styles.bullet}>{'• Marketing emails – tips, offers, and product news. You can unsubscribe at any time by clicking the "Unsubscribe" link in any email.'}</Text>
          <Text style={styles.bullet}>{'• Push notifications – app updates and personalized reminders (e.g. a nudge to log your mood). You can disable these at any time through your device settings (iOS: Settings → Notifications; Android: Settings → Apps → Mood Galaxy → Notifications).'}</Text>

          {/* 11 */}
          <Text style={styles.sectionTitle}>11. Account Deletion</Text>
          <Text style={styles.body}>
            You can delete your account at any time directly from the app settings under Account → Delete Account. Upon deletion:
          </Text>
          <Text style={styles.bullet}>{'• Your name, email address, mood entries, and journal content will be permanently removed from our systems within 30 days.'}</Text>
          <Text style={styles.bullet}>{'• Automatically collected technical data will be anonymized.'}</Text>
          <Text style={styles.bullet}>{'• You will no longer receive any communications from us.'}</Text>

          {/* 12 */}
          <Text style={styles.sectionTitle}>12. International Data Transfers</Text>
          <Text style={styles.body}>
            If you are located in the EEA or UK, please note that your data may be transferred to and processed in countries outside the EEA. In such cases, we ensure that appropriate safeguards are in place (such as Standard Contractual Clauses approved by the European Commission) to protect your data.
          </Text>

          {/* 13 */}
          <Text style={styles.sectionTitle}>13. Changes to This Policy</Text>
          <Text style={styles.body}>
            We may update this Privacy Policy from time to time. When we do, we will revise the "Last Updated" date at the top of this page and notify you via email or an in-app notification if the changes are material.
          </Text>
          <Text style={styles.body}>
            We encourage you to review this policy periodically to stay informed about how we protect your information.
          </Text>

          {/* 14 */}
          <Text style={styles.sectionTitle}>14. Governing Law</Text>
          <Text style={styles.body}>
            This Privacy Policy is governed by applicable data protection laws, including the General Data Protection Regulation (GDPR) (EU) 2016/679 and the California Consumer Privacy Act (CCPA), Cal. Civ. Code § 1798.100 et seq., as amended by the CPRA.
          </Text>

          <View style={styles.divider} />
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}
