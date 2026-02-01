import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Image,
} from "@react-pdf/renderer";
import type { ReactElement } from "react";

// Certificate styles
const styles = StyleSheet.create({
  page: {
    flexDirection: "column",
    backgroundColor: "#ffffff",
    padding: 40,
    fontFamily: "Helvetica",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 30,
    borderBottom: "2px solid #2563eb",
    paddingBottom: 20,
  },
  logo: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#2563eb",
  },
  certificateTitle: {
    fontSize: 28,
    fontWeight: "bold",
    textAlign: "center",
    color: "#1e293b",
    marginBottom: 10,
    textTransform: "uppercase",
    letterSpacing: 2,
  },
  subtitle: {
    fontSize: 14,
    textAlign: "center",
    color: "#64748b",
    marginBottom: 40,
  },
  content: {
    marginTop: 20,
  },
  row: {
    flexDirection: "row",
    marginBottom: 15,
    borderBottom: "1px solid #e2e8f0",
    paddingBottom: 10,
  },
  label: {
    width: "35%",
    fontSize: 11,
    fontWeight: "bold",
    color: "#475569",
    textTransform: "uppercase",
  },
  value: {
    width: "65%",
    fontSize: 12,
    color: "#1e293b",
  },
  section: {
    marginTop: 30,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#2563eb",
    marginBottom: 15,
    textTransform: "uppercase",
    borderBottom: "1px solid #2563eb",
    paddingBottom: 5,
  },
  summaryBox: {
    backgroundColor: "#f8fafc",
    padding: 20,
    borderRadius: 8,
    marginTop: 20,
    border: "1px solid #e2e8f0",
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  summaryLabel: {
    fontSize: 11,
    color: "#64748b",
  },
  summaryValue: {
    fontSize: 12,
    fontWeight: "bold",
    color: "#1e293b",
  },
  passText: {
    color: "#16a34a",
  },
  failText: {
    color: "#dc2626",
  },
  footer: {
    position: "absolute",
    bottom: 40,
    left: 40,
    right: 40,
  },
  footerContent: {
    borderTop: "2px solid #2563eb",
    paddingTop: 20,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  footerSection: {
    width: "45%",
  },
  footerLabel: {
    fontSize: 9,
    color: "#64748b",
    marginBottom: 5,
  },
  footerValue: {
    fontSize: 11,
    color: "#1e293b",
  },
  signatureImage: {
    width: 150,
    height: 60,
    marginTop: 10,
  },
  watermark: {
    position: "absolute",
    top: "50%",
    left: "50%",
    transform: "translate(-50%, -50%) rotate(-45deg)",
    fontSize: 80,
    color: "#f1f5f9",
    opacity: 0.3,
    fontWeight: "bold",
  },
  referenceBox: {
    position: "absolute",
    top: 40,
    right: 40,
    backgroundColor: "#2563eb",
    padding: "8 15",
    borderRadius: 4,
  },
  referenceText: {
    fontSize: 10,
    color: "#ffffff",
    fontWeight: "bold",
  },
});

export type CertificateData = {
  // Job details
  reference: string;
  serviceName: string;
  completedDate: string;
  completedTime: string;

  // Site details
  siteName: string;
  siteAddress: string;
  sitePostcode: string;

  // Customer details
  customerName: string;
  companyName?: string;

  // Engineer details
  engineerName: string;
  engineerQualifications?: string[];

  // Results summary
  totalItems: number;
  passedItems: number;
  failedItems: number;

  // Signature
  signedBy?: string;
  signatureUrl?: string;
  signedAt?: string;

  // Notes
  engineerNotes?: string;
};

/**
 * Create a completion certificate document element for rendering
 */
export function createCompletionCertificate(data: CertificateData) {
  const passRate = data.totalItems > 0
    ? Math.round((data.passedItems / data.totalItems) * 100)
    : 100;

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Reference badge */}
        <View style={styles.referenceBox}>
          <Text style={styles.referenceText}>REF: {data.reference}</Text>
        </View>

        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.logo}>ComplianceOD</Text>
          <View>
            <Text style={{ fontSize: 10, color: "#64748b" }}>
              Certificate Generated
            </Text>
            <Text style={{ fontSize: 11, color: "#1e293b" }}>
              {new Date().toLocaleDateString("en-GB")}
            </Text>
          </View>
        </View>

        {/* Title */}
        <Text style={styles.certificateTitle}>
          Certificate of Completion
        </Text>
        <Text style={styles.subtitle}>
          {data.serviceName}
        </Text>

        {/* Content */}
        <View style={styles.content}>
          {/* Job Details Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Job Details</Text>
            <View style={styles.row}>
              <Text style={styles.label}>Service</Text>
              <Text style={styles.value}>{data.serviceName}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Completed</Text>
              <Text style={styles.value}>
                {data.completedDate} at {data.completedTime}
              </Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Reference</Text>
              <Text style={styles.value}>{data.reference}</Text>
            </View>
          </View>

          {/* Site Details Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Site Information</Text>
            <View style={styles.row}>
              <Text style={styles.label}>Site Name</Text>
              <Text style={styles.value}>{data.siteName}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Address</Text>
              <Text style={styles.value}>
                {data.siteAddress}, {data.sitePostcode}
              </Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Customer</Text>
              <Text style={styles.value}>
                {data.customerName}
                {data.companyName ? ` - ${data.companyName}` : ""}
              </Text>
            </View>
          </View>

          {/* Results Summary */}
          <View style={styles.summaryBox}>
            <Text style={[styles.sectionTitle, { marginTop: 0 }]}>
              Results Summary
            </Text>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Total Items Tested</Text>
              <Text style={styles.summaryValue}>{data.totalItems}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Passed</Text>
              <Text style={[styles.summaryValue, styles.passText]}>
                {data.passedItems}
              </Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Failed</Text>
              <Text style={[styles.summaryValue, data.failedItems > 0 ? styles.failText : {}]}>
                {data.failedItems}
              </Text>
            </View>
            <View style={[styles.summaryRow, { borderTop: "1px solid #e2e8f0", paddingTop: 10, marginTop: 5 }]}>
              <Text style={styles.summaryLabel}>Pass Rate</Text>
              <Text style={[styles.summaryValue, passRate >= 80 ? styles.passText : styles.failText]}>
                {passRate}%
              </Text>
            </View>
          </View>

          {/* Engineer Notes */}
          {data.engineerNotes && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Engineer Notes</Text>
              <Text style={{ fontSize: 11, color: "#475569", lineHeight: 1.5 }}>
                {data.engineerNotes}
              </Text>
            </View>
          )}
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <View style={styles.footerContent}>
            <View style={styles.footerSection}>
              <Text style={styles.footerLabel}>ENGINEER</Text>
              <Text style={styles.footerValue}>{data.engineerName}</Text>
              {data.engineerQualifications && data.engineerQualifications.length > 0 && (
                <Text style={{ fontSize: 9, color: "#64748b", marginTop: 3 }}>
                  {data.engineerQualifications.join(", ")}
                </Text>
              )}
            </View>
            <View style={styles.footerSection}>
              <Text style={styles.footerLabel}>CUSTOMER ACKNOWLEDGEMENT</Text>
              {data.signedBy && (
                <Text style={styles.footerValue}>Signed by: {data.signedBy}</Text>
              )}
              {data.signedAt && (
                <Text style={{ fontSize: 9, color: "#64748b", marginTop: 3 }}>
                  {data.signedAt}
                </Text>
              )}
              {data.signatureUrl && (
                <Image style={styles.signatureImage} src={data.signatureUrl} />
              )}
            </View>
          </View>
        </View>
      </Page>
    </Document>
  );
}
