import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer'

const styles = StyleSheet.create({
  page: {
    padding: 54,
    paddingTop: 60,
    fontFamily: 'Helvetica',
    fontSize: 10.5,
    lineHeight: 1.5,
    color: '#222',
  },
  header: {
    marginBottom: 40,
  },
  name: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  contact: {
    fontSize: 9,
    color: '#555',
    marginBottom: 2,
  },
  date: {
    fontSize: 9.5,
    color: '#444',
    marginBottom: 16,
  },
  salutation: {
    fontSize: 10.5,
    marginBottom: 10,
  },
  paragraph: {
    fontSize: 10.5,
    lineHeight: 1.55,
    marginBottom: 10,
    textAlign: 'justified',
  },
  closing: {
    marginTop: 20,
    fontSize: 10.5,
  },
  signOff: {
    fontSize: 10.5,
    marginTop: 24,
  },
})

const CoverLetterPDF = ({ content, userName, userEmail, userPhone }) => {
  const today = new Date().toLocaleDateString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric',
  })

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.name}>{userName || 'Your Name'}</Text>
          {userEmail && <Text style={styles.contact}>{userEmail}</Text>}
          {userPhone && <Text style={styles.contact}>{userPhone}</Text>}
        </View>

        <Text style={styles.date}>{today}</Text>

        {content?.salutation && (
          <Text style={styles.salutation}>{content.salutation}</Text>
        )}

        {content?.opening_paragraph && (
          <Text style={styles.paragraph}>{content.opening_paragraph}</Text>
        )}

        {content?.body_paragraphs?.map((p, i) => (
          <Text key={i} style={styles.paragraph}>{p}</Text>
        ))}

        {content?.closing_paragraph && (
          <Text style={styles.paragraph}>{content.closing_paragraph}</Text>
        )}

        <Text style={styles.signOff}>Sincerely,</Text>
        <Text style={{ ...styles.signOff, fontWeight: 'bold', marginTop: 2 }}>{userName || 'Your Name'}</Text>
      </Page>
    </Document>
  )
}

export default CoverLetterPDF
