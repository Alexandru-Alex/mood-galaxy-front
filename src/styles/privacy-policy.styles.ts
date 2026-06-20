import { StyleSheet } from 'react-native';
import { Palette } from '@/constants/theme';

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0c1e',
  },
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(171,129,205,0.15)',
  },
  backButton: {
    padding: 8,
    marginRight: 8,
  },
  backText: {
    color: Palette.brightLavender,
    fontSize: 16,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#f3eefb',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 48,
  },
  pageTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#f3eefb',
    marginBottom: 4,
  },
  lastUpdated: {
    fontSize: 13,
    color: Palette.brightLavender,
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: Palette.mauve,
    marginTop: 28,
    marginBottom: 10,
  },
  subSectionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: Palette.brightLavender,
    marginTop: 18,
    marginBottom: 8,
  },
  body: {
    fontSize: 15,
    lineHeight: 24,
    color: '#c5bde8',
    marginBottom: 8,
  },
  bullet: {
    fontSize: 15,
    lineHeight: 24,
    color: '#c5bde8',
    marginBottom: 4,
    paddingLeft: 8,
  },
  tableContainer: {
    borderWidth: 1,
    borderColor: 'rgba(171,129,205,0.25)',
    borderRadius: 10,
    overflow: 'hidden',
    marginTop: 12,
    marginBottom: 8,
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(171,129,205,0.15)',
  },
  tableRowLast: {
    flexDirection: 'row',
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: 'rgba(87,74,226,0.25)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(171,129,205,0.3)',
  },
  tableHeaderCell: {
    flex: 1,
    padding: 10,
    fontSize: 13,
    fontWeight: '700',
    color: Palette.mauve,
  },
  tableCell: {
    flex: 1,
    padding: 10,
    fontSize: 13,
    lineHeight: 20,
    color: '#c5bde8',
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(171,129,205,0.12)',
    marginTop: 28,
    marginBottom: 4,
  },
  emailLink: {
    color: Palette.brightLavender,
    textDecorationLine: 'underline',
  },
});
