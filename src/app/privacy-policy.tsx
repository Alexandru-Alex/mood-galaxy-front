import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { SpaceBackground } from '@/components/space-background';
import { Starfield } from '@/components/starfield';
import { Palette, Spacing } from '@/constants/theme';

type SectionCardProps = {
  num: number;
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  children: React.ReactNode;
};

function SectionCard({ num, icon, title, children }: SectionCardProps) {
  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.iconBadge}>
          <Ionicons name={icon} size={16} color={Palette.brightLavender} />
        </View>
        <View style={styles.cardTitleRow}>
          <Text style={styles.cardNum}>{num < 10 ? `0${num}` : `${num}`}</Text>
          <Text style={styles.cardTitle}>{title}</Text>
        </View>
      </View>
      <View style={styles.cardDivider} />
      <View style={styles.cardBody}>{children}</View>
    </View>
  );
}

function Body({ children }: { children: string }) {
  return <Text style={styles.body}>{children}</Text>;
}

function Bullet({ icon, children }: { icon?: keyof typeof Ionicons.glyphMap; children: string }) {
  return (
    <View style={styles.bulletRow}>
      <Ionicons
        name={icon ?? 'ellipse'}
        size={icon ? 14 : 6}
        color={Palette.brightLavender}
        style={styles.bulletIcon}
      />
      <Text style={styles.bulletText}>{children}</Text>
    </View>
  );
}

function LinkRow({ icon, label, href }: { icon: keyof typeof Ionicons.glyphMap; label: string; href: string }) {
  return (
    <Pressable
      style={({ pressed }) => [styles.linkRow, pressed && styles.linkRowPressed]}
      onPress={() => Linking.openURL(href)}
    >
      <Ionicons name={icon} size={18} color={Palette.majorelleBlue} />
      <Text style={styles.linkRowLabel}>{label}</Text>
      <Ionicons name="open-outline" size={14} color="rgba(171,129,205,0.5)" />
    </Pressable>
  );
}

function RightRow({ children }: { children: string }) {
  return (
    <View style={styles.rightRow}>
      <Ionicons name="checkmark-circle" size={16} color={Palette.majorelleBlue} />
      <Text style={styles.rightText}>{children}</Text>
    </View>
  );
}

function TableRow({ purpose, basis, last }: { purpose: string; basis: string; last?: boolean }) {
  return (
    <View style={[styles.tableRow, last && styles.tableRowLast]}>
      <Text style={styles.tablePurpose}>{purpose}</Text>
      <View style={styles.tableBasisBadge}>
        <Text style={styles.tableBasis}>{basis}</Text>
      </View>
    </View>
  );
}

function SubTitle({ children }: { children: string }) {
  return <Text style={styles.subTitle}>{children}</Text>;
}

export default function PrivacyPolicyScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.root}>
      <StatusBar style="light" />
      <SpaceBackground />
      <Starfield />

      {/* Top bar */}
      <View style={[styles.topBar, { paddingTop: insets.top + 8 }]}>
        <Pressable
          style={({ pressed }) => [styles.backBtn, pressed && { opacity: 0.6 }]}
          onPress={() => router.back()}
        >
          <Ionicons name="chevron-back" size={20} color={Palette.brightLavender} />
          <Text style={styles.backLabel}>Back</Text>
        </Pressable>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: insets.top + 56, paddingBottom: insets.bottom + 40 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero */}
        <View style={styles.hero}>
          <View style={styles.heroNebula} pointerEvents="none" />
          <View style={styles.heroIconRing}>
            <Ionicons name="shield-checkmark" size={32} color={Palette.brightLavender} />
          </View>
          <Text style={styles.heroTitle}>Privacy Policy</Text>
          <Text style={styles.heroApp}>Mood Galaxy</Text>
          <View style={styles.heroBadge}>
            <Ionicons name="calendar-outline" size={12} color={Palette.mauve} />
            <Text style={styles.heroBadgeText}>Last updated: 20 June 2026</Text>
          </View>
          <Text style={styles.heroSubtitle}>
            We are committed to protecting your personal information and your right to privacy.
          </Text>
        </View>

        {/* 1 — Introduction */}
        <SectionCard num={1} icon="information-circle-outline" title="Introduction">
          <Body>
            Mood Galaxy is a mood journal that lets you record how you feel over time and visualizes your entries as constellations in a personal galaxy. Because of this, some of the information you record may relate to your emotional or mental state — we treat this with particular care.
          </Body>
          <Body>
            Please read this policy carefully. If you disagree with its terms, please discontinue use of our Services.
          </Body>
        </SectionCard>

        {/* 2 — Contact */}
        <SectionCard num={2} icon="mail-outline" title="Contact Us">
          <Body>If you have questions or concerns about this policy, reach us at:</Body>
          <View style={styles.linkGroup}>
            <LinkRow icon="mail" label="help@getmoneygarden.com" href="mailto:help@getmoneygarden.com" />
            <View style={styles.linkDivider} />
            <LinkRow icon="globe-outline" label="www.getmoneygarden.com" href="https://www.getmoneygarden.com" />
          </View>
        </SectionCard>

        {/* 3 — Data We Collect */}
        <SectionCard num={3} icon="eye-outline" title="Information We Collect">
          <SubTitle>3.1 Account Information</SubTitle>
          <Bullet icon="person-outline">Name – used to personalize your account experience.</Bullet>
          <Bullet icon="at-outline">Email address – used for registration, login, support, and (with your consent) updates.</Bullet>

          <SubTitle>3.2 Mood & Journal Content</SubTitle>
          <Body>When you use the app's core features, you may choose to provide:</Body>
          <Bullet icon="happy-outline">Mood entries – the moods, ratings, or emotions you log.</Bullet>
          <Bullet icon="document-text-outline">Journal text and notes – any free-text content you add to an entry.</Bullet>
          <Bullet icon="pricetag-outline">Tags, dates, and timestamps associated with each entry.</Bullet>
          <Bullet icon="moon-outline">Void meditation sessions – that a session took place and its duration.</Bullet>
          <View style={styles.noticeBox}>
            <Ionicons name="shield-outline" size={15} color={Palette.mauve} style={{ marginTop: 1 }} />
            <Text style={styles.noticeText}>
              Where this content qualifies as special-category data under GDPR Art. 9, we process it only on the basis of your explicit consent, given when you create and store entries. You may withdraw consent at any time by deleting your entries or account.
            </Text>
          </View>

          <SubTitle>3.3 Automatic Technical Data</SubTitle>
          <Bullet icon="bar-chart-outline">Usage data – features accessed, screens visited, time spent.</Bullet>
          <Bullet icon="phone-portrait-outline">Device information – device type, OS, app version, identifiers.</Bullet>
          <Bullet icon="terminal-outline">Log data – IP address, timestamps, and crash reports.</Bullet>

          <SubTitle>3.4 What We Do NOT Collect</SubTitle>
          <View style={styles.noticeBox}>
            <Ionicons name="close-circle-outline" size={15} color="#e74c3c" style={{ marginTop: 1 }} />
            <Text style={styles.noticeText}>
              We do not collect financial data, precise geolocation, biometric data, contacts, photos, or microphone/camera input. Mood Galaxy is not a medical device and does not derive clinical diagnoses from your entries.
            </Text>
          </View>
        </SectionCard>

        {/* 4 — How We Use */}
        <SectionCard num={4} icon="construct-outline" title="How We Use Your Information">
          <Body>Each purpose is tied to a lawful basis under GDPR:</Body>
          <View style={styles.table}>
            <TableRow purpose="Creating and managing your account" basis="Contract" />
            <TableRow purpose="Authentication and account security" basis="Contract / Legitimate interest" />
            <TableRow purpose="Storing and syncing mood entries and journal content" basis="Explicit consent / Contract" />
            <TableRow purpose="Generating your galaxy visualization and statistics" basis="Explicit consent / Contract" />
            <TableRow purpose="Transactional emails and in-app notifications" basis="Contract" />
            <TableRow purpose="Marketing emails and promotional notifications" basis="Consent" />
            <TableRow purpose="Improving our Services via aggregated analytics" basis="Legitimate interest" />
            <TableRow purpose="Customer support" basis="Contract" />
            <TableRow purpose="Complying with legal obligations" basis="Legal obligation" last />
          </View>
          <View style={styles.noticeBox}>
            <Ionicons name="ban-outline" size={15} color={Palette.mauve} style={{ marginTop: 1 }} />
            <Text style={styles.noticeText}>
              We do not use your mood entries or journal content for advertising, marketing profiling, or training third-party AI models.
            </Text>
          </View>
        </SectionCard>

        {/* 5 — Sharing */}
        <SectionCard num={5} icon="share-social-outline" title="How We Share Your Information">
          <Body>
            We do not sell, rent, or share your personal data with advertisers, data brokers, or other third parties for their own purposes.
          </Body>
          <Body>Your data may only be disclosed in these limited circumstances:</Body>
          <Bullet icon="business-outline">Service providers acting on our behalf under contract (cloud hosting, crash reporting) solely to deliver the Services.</Bullet>
          <Bullet icon="scale-outline">Legal requirements – court order or governmental authority.</Bullet>
          <Bullet icon="shield-outline">Protection of rights – safety, rights, or property of Mood Galaxy, users, or the public.</Bullet>
        </SectionCard>

        {/* 6 — Retention */}
        <SectionCard num={6} icon="time-outline" title="Data Retention">
          <Body>
            We retain your personal data for as long as your account is active or as needed to provide the Services. If you delete an entry, it is removed from active systems. If you delete your account, your personal data will be deleted or anonymized within 30 days, unless retained longer by law.
          </Body>
        </SectionCard>

        {/* 7 — Security */}
        <SectionCard num={7} icon="lock-closed-outline" title="Data Security">
          <Body>
            We implement appropriate technical and organizational measures to protect your personal data against unauthorized access, alteration, disclosure, or destruction.
          </Body>
          <Bullet icon="lock-closed-outline">Encrypted data storage</Bullet>
          <Bullet icon="globe-outline">Secure HTTPS connections</Bullet>
          <Bullet icon="people-outline">Strict access controls limited to operational necessity</Bullet>
          <View style={styles.noticeBox}>
            <Ionicons name="warning-outline" size={15} color="#EF9F27" style={{ marginTop: 1 }} />
            <Text style={styles.noticeText}>
              No method of transmission over the internet is 100% secure. We encourage you to use a strong, unique password for your account.
            </Text>
          </View>
        </SectionCard>

        {/* 8 — Children */}
        <SectionCard num={8} icon="people-outline" title="Children's Privacy">
          <Body>
            Our Services are not directed to individuals under the age of 16. We do not knowingly collect personal data from children. If you believe a child has provided us with personal data, please contact us and we will promptly delete it.
          </Body>
        </SectionCard>

        {/* 9 — Your Rights */}
        <SectionCard num={9} icon="ribbon-outline" title="Your Rights">
          <SubTitle>9.1 GDPR Rights (EEA, UK, Switzerland)</SubTitle>
          <RightRow>Right of access – request a copy of your personal data.</RightRow>
          <RightRow>Right to rectification – correct inaccurate or incomplete data.</RightRow>
          <RightRow>Right to erasure – request deletion ("right to be forgotten").</RightRow>
          <RightRow>Right to restriction – limit how we process your data.</RightRow>
          <RightRow>Right to data portability – receive your data in machine-readable format.</RightRow>
          <RightRow>Right to object – object to processing based on legitimate interest or direct marketing.</RightRow>
          <RightRow>Right to withdraw consent – at any time, for any consent-based processing.</RightRow>
          <Body>
            Contact us at help@getmoneygarden.com to exercise any right. We respond within 30 days. You may also lodge a complaint with your local data protection authority (in Romania: ANSPDCP).
          </Body>

          <SubTitle>9.2 CCPA / CPRA Rights (California Residents)</SubTitle>
          <RightRow>Right to know – categories and specific pieces of personal info collected.</RightRow>
          <RightRow>Right to delete – subject to certain exceptions.</RightRow>
          <RightRow>Right to correct – inaccurate personal information.</RightRow>
          <RightRow>Right to opt-out of sale or sharing – we do not sell or share your data.</RightRow>
          <RightRow>Right to limit use of sensitive personal information.</RightRow>
          <RightRow>Right to non-discrimination for exercising your rights.</RightRow>
        </SectionCard>

        {/* 10 — Marketing */}
        <SectionCard num={10} icon="notifications-outline" title="Marketing & Notifications">
          <Bullet icon="mail-outline">Transactional emails – account confirmations, security alerts, service updates. Cannot be opted out while account is active.</Bullet>
          <Bullet icon="megaphone-outline">Marketing emails – tips, offers, product news. Unsubscribe any time via the link in any email.</Bullet>
          <Bullet icon="phone-portrait-outline">Push notifications – app updates and mood reminders. Disable any time in device settings (iOS: Settings → Notifications; Android: Settings → Apps → Mood Galaxy).</Bullet>
        </SectionCard>

        {/* 11 — Account Deletion */}
        <SectionCard num={11} icon="trash-outline" title="Account Deletion">
          <Body>Delete your account at any time from app settings under Account → Delete Account. Upon deletion:</Body>
          <Bullet icon="person-remove-outline">Name, email, mood entries, and journal content permanently removed within 30 days.</Bullet>
          <Bullet icon="stats-chart-outline">Automatically collected technical data will be anonymized.</Bullet>
          <Bullet icon="notifications-off-outline">You will no longer receive any communications from us.</Bullet>
        </SectionCard>

        {/* 12 — International Transfers */}
        <SectionCard num={12} icon="globe-outline" title="International Data Transfers">
          <Body>
            If you are located in the EEA or UK, your data may be transferred to and processed in countries outside the EEA. We ensure appropriate safeguards are in place — such as Standard Contractual Clauses approved by the European Commission — to protect your data.
          </Body>
        </SectionCard>

        {/* 13 — Changes */}
        <SectionCard num={13} icon="document-text-outline" title="Changes to This Policy">
          <Body>
            We may update this Privacy Policy from time to time. When we do, we will revise the "Last Updated" date at the top and notify you via email or in-app notification if the changes are material.
          </Body>
          <Body>We encourage you to review this policy periodically.</Body>
        </SectionCard>

        {/* 14 — Governing Law */}
        <SectionCard num={14} icon="scale-outline" title="Governing Law">
          <Body>
            This Privacy Policy is governed by applicable data protection laws, including the General Data Protection Regulation (GDPR) (EU) 2016/679 and the California Consumer Privacy Act (CCPA), Cal. Civ. Code § 1798.100 et seq., as amended by the CPRA.
          </Body>
        </SectionCard>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#050410' },

  topBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    paddingHorizontal: Spacing.three,
    paddingBottom: 8,
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 4,
    paddingVertical: 6,
    paddingRight: 10,
  },
  backLabel: {
    fontSize: 15,
    fontWeight: '500',
    color: Palette.brightLavender,
  },

  scroll: { flex: 1 },
  scrollContent: {
    paddingHorizontal: Spacing.three,
    maxWidth: 520,
    width: '100%',
    alignSelf: 'center',
    gap: Spacing.two,
  },

  // Hero
  hero: {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(171,129,205,0.2)',
    backgroundColor: '#08061c',
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.four,
    paddingBottom: Spacing.four,
    alignItems: 'center',
    overflow: 'hidden',
    marginBottom: 4,
  },
  heroNebula: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 100,
    backgroundColor: 'rgba(87,74,226,0.14)',
  },
  heroIconRing: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: 'rgba(87,74,226,0.2)',
    borderWidth: 1.5,
    borderColor: 'rgba(171,129,205,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  heroTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: '#ffffff',
    letterSpacing: 0.2,
  },
  heroApp: {
    fontSize: 13,
    fontWeight: '600',
    color: Palette.brightLavender,
    marginTop: 2,
    marginBottom: 10,
  },
  heroBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(226,173,242,0.1)',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: 'rgba(226,173,242,0.2)',
    marginBottom: 14,
  },
  heroBadgeText: {
    fontSize: 12,
    color: Palette.mauve,
    fontWeight: '500',
  },
  heroSubtitle: {
    fontSize: 13,
    lineHeight: 20,
    color: 'rgba(171,129,205,0.7)',
    textAlign: 'center',
    maxWidth: 320,
  },

  // Cards
  card: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(171,129,205,0.15)',
    backgroundColor: '#08061c',
    overflow: 'hidden',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.three,
    paddingVertical: 14,
    gap: 12,
  },
  iconBadge: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: 'rgba(87,74,226,0.18)',
    borderWidth: 1,
    borderColor: 'rgba(171,129,205,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  cardNum: {
    fontSize: 11,
    fontWeight: '700',
    color: Palette.dustyGrape,
    letterSpacing: 0.5,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#ffffff',
  },
  cardDivider: {
    height: 1,
    backgroundColor: 'rgba(171,129,205,0.1)',
  },
  cardBody: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.three,
    gap: 8,
  },

  subTitle: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    color: Palette.brightLavender,
    marginTop: 8,
    marginBottom: 2,
  },
  body: {
    fontSize: 14,
    lineHeight: 22,
    color: 'rgba(195,185,230,0.85)',
  },

  // Bullets
  bulletRow: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'flex-start',
  },
  bulletIcon: {
    marginTop: 3,
  },
  bulletText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 21,
    color: 'rgba(195,185,230,0.85)',
  },

  // Right check rows
  rightRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  rightText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 21,
    color: 'rgba(195,185,230,0.85)',
  },

  // Notice box
  noticeBox: {
    flexDirection: 'row',
    gap: 10,
    backgroundColor: 'rgba(87,74,226,0.1)',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(171,129,205,0.18)',
    alignItems: 'flex-start',
  },
  noticeText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 20,
    color: 'rgba(195,185,230,0.8)',
  },

  // Link rows
  linkGroup: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(171,129,205,0.2)',
    overflow: 'hidden',
    backgroundColor: 'rgba(87,74,226,0.07)',
  },
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  linkRowPressed: { backgroundColor: 'rgba(87,74,226,0.15)' },
  linkRowLabel: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
    color: Palette.brightLavender,
  },
  linkDivider: {
    height: 1,
    backgroundColor: 'rgba(171,129,205,0.12)',
  },

  // Table
  table: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(171,129,205,0.2)',
    overflow: 'hidden',
    backgroundColor: 'rgba(87,74,226,0.05)',
  },
  tableRow: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(171,129,205,0.1)',
    gap: 8,
  },
  tableRowLast: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 8,
  },
  tablePurpose: {
    fontSize: 13,
    lineHeight: 19,
    color: 'rgba(195,185,230,0.9)',
    fontWeight: '500',
  },
  tableBasisBadge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(87,74,226,0.2)',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: 'rgba(171,129,205,0.2)',
  },
  tableBasis: {
    fontSize: 11,
    fontWeight: '600',
    color: Palette.mauve,
  },
});
