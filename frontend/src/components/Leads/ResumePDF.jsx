import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer'

const styles = StyleSheet.create({
  page: {
    padding: 36,
    fontFamily: 'Helvetica',
    fontSize: 9.5,
    lineHeight: 1.35,
    color: '#222',
  },
  name: {
    fontSize: 22,
    fontWeight: 'bold',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  contactLine: {
    fontSize: 8.5,
    color: '#555',
    marginBottom: 14,
    flexDirection: 'row',
    gap: 8,
  },
  divider: {
    height: 2,
    backgroundColor: '#222',
    marginBottom: 10,
  },
  sectionHeader: {
    fontSize: 10.5,
    fontWeight: 'bold',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginBottom: 5,
    marginTop: 8,
    paddingBottom: 2,
    borderBottom: '1 solid #999',
  },
  summary: {
    fontSize: 9.5,
    lineHeight: 1.45,
    marginBottom: 6,
    color: '#333',
  },
  skillsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 3,
    marginBottom: 6,
  },
  skillBadge: {
    fontSize: 8,
    backgroundColor: '#eee',
    paddingHorizontal: 5,
    paddingVertical: 2,
    color: '#222',
  },
  experienceBlock: {
    marginBottom: 8,
  },
  experienceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  jobTitle: {
    fontSize: 10,
    fontWeight: 'bold',
  },
  company: {
    fontSize: 9.5,
    fontStyle: 'italic',
    color: '#555',
  },
  dates: {
    fontSize: 8.5,
    color: '#777',
    textAlign: 'right',
  },
  bulletList: {
    marginLeft: 12,
    marginTop: 1,
  },
  bullet: {
    fontSize: 9,
    lineHeight: 1.45,
    marginBottom: 1.5,
  },
  projectBlock: {
    marginBottom: 6,
  },
  projectHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  projectTitle: {
    fontSize: 9.5,
    fontWeight: 'bold',
  },
  projectTech: {
    fontSize: 8,
    color: '#666',
  },
  projectDesc: {
    fontSize: 8.5,
    lineHeight: 1.4,
    color: '#444',
    marginTop: 1,
  },
  education: {
    fontSize: 9.5,
    marginBottom: 4,
  },
  certItem: {
    fontSize: 9,
    marginBottom: 1.5,
    marginLeft: 8,
  },
})

const ResumePDF = ({ content, userName, userEmail, userPhone, userLocation, userPortfolio }) => (
  <Document>
    <Page size="A4" style={styles.page}>
      <Text style={styles.name}>{userName || 'Your Name'}</Text>
      <View style={styles.contactLine}>
        {userEmail && <Text>{userEmail}</Text>}
        {userPhone && <Text>{userPhone}</Text>}
        {userLocation && <Text>{userLocation}</Text>}
        {userPortfolio && <Text>{userPortfolio}</Text>}
      </View>
      <View style={styles.divider} />

      {content?.professional_summary ? (
        <>
          <Text style={styles.sectionHeader}>Professional Summary</Text>
          <Text style={styles.summary}>{content.professional_summary}</Text>
        </>
      ) : null}

      {content?.skills?.length > 0 && (
        <>
          <Text style={styles.sectionHeader}>Skills</Text>
          <View style={styles.skillsRow}>
            {content.skills.map((s, i) => (
              <Text key={i} style={styles.skillBadge}>{s}</Text>
            ))}
          </View>
        </>
      )}

      {content?.professional_experience?.length > 0 && (
        <>
          <Text style={styles.sectionHeader}>Experience</Text>
          {content.professional_experience.map((exp, i) => (
            <View key={i} style={styles.experienceBlock} wrap={false}>
              <View style={styles.experienceHeader}>
                <Text style={styles.jobTitle}>{exp.job_title}</Text>
                <Text style={styles.dates}>{exp.dates || ''}</Text>
              </View>
              {exp.company && <Text style={styles.company}>{exp.company}</Text>}
              {exp.bullets?.length > 0 && (
                <View style={styles.bulletList}>
                  {exp.bullets.map((b, j) => (
                    <Text key={j} style={styles.bullet}>- {b}</Text>
                  ))}
                </View>
              )}
            </View>
          ))}
        </>
      )}

      {content?.projects?.length > 0 && (
        <>
          <Text style={styles.sectionHeader}>Projects</Text>
          {content.projects.map((proj, i) => (
            <View key={i} style={styles.projectBlock} wrap={false}>
              <View style={styles.projectHeader}>
                <Text style={styles.projectTitle}>{proj.name}</Text>
                {proj.technologies?.length > 0 && (
                  <Text style={styles.projectTech}>{proj.technologies.join(', ')}</Text>
                )}
              </View>
              {proj.description && (
                <Text style={styles.projectDesc}>{proj.description}</Text>
              )}
            </View>
          ))}
        </>
      )}

      {content?.education ? (
        <>
          <Text style={styles.sectionHeader}>Education</Text>
          <Text style={styles.education}>{content.education}</Text>
        </>
      ) : null}

      {content?.certifications?.length > 0 && (
        <>
          <Text style={styles.sectionHeader}>Certifications</Text>
          {content.certifications.map((cert, i) => (
            <Text key={i} style={styles.certItem}>- {cert}</Text>
          ))}
        </>
      )}
    </Page>
  </Document>
)

export default ResumePDF
